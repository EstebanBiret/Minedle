// save file format: integrity checksum (FNV-1a) and structural validation.
// the import/export/reset orchestration stays in index.js (it drives game resets).

import { shop } from "../constants/shop.js?v=2";
import { achievements } from "../constants/success.js?v=3";
import { entities } from "../constants/entities.js?v=3";
import { MAX_LEVEL, DEFAULT_DATA } from "./state.js?v=4";

export const SAVE_FILE_APP = 'minedle';
export const SAVE_FILE_VERSION = 1;

// FNV-1a 32-bit hash, used as an integrity checksum for save files
export function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// structural validation of the bare game-state object (the `data` payload, with
// NO file wrapper). shared by the import path (isValidSaveData below) and the
// localStorage load path (index.js), so a corrupted in-memory save is rejected
// with the same rigor as a bad imported file.
export function isValidGameData(d) {
  if (!d || typeof d !== 'object') return false;

  const numericFields = ['blocsDepuisToujours', 'blocsActuels', 'bpc', 'coefficientClic', 'blocsMinesAvecClics', 'pommes_or'];
  for (const field of numericFields) {
    if (typeof d[field] !== 'number' || !isFinite(d[field]) || d[field] < 0) return false;
  }
  if (typeof d.delai_pommes_or_ms !== 'number' || d.delai_pommes_or_ms < 1000) return false;
  if (!Number.isInteger(d.niveau) || d.niveau < 0 || d.niveau > MAX_LEVEL) return false;
  if ('derniere_visite' in d && (typeof d.derniere_visite !== 'number' || !isFinite(d.derniere_visite) || d.derniere_visite < 0)) return false; // optional field (older saves)
  if ('temps_de_jeu_ms' in d && (typeof d.temps_de_jeu_ms !== 'number' || !isFinite(d.temps_de_jeu_ms) || d.temps_de_jeu_ms < 0)) return false; // optional field (older saves)
  if ('etoiles_nether' in d && (!Number.isInteger(d.etoiles_nether) || d.etoiles_nether < 0)) return false; // optional field (prestige)
  if ('ascensions' in d && (!Number.isInteger(d.ascensions) || d.ascensions < 0)) return false; // optional field (prestige)

  if (![d.entites, d.boutique, d.inventaire, d.succes].every(Array.isArray)) return false;

  for (const e of d.entites) {
    if (!e || typeof e !== 'object' || typeof e.nom !== 'string') return false;
    const numbers = [e.quantite, e.cout_initial, e.cout_actuel, e.rendement_initial, e.rendement_actuel, e.coefficient];
    if (!numbers.every(n => typeof n === 'number' && isFinite(n))) return false;
    if (e.quantite < 0) return false;
  }

  const shopIds = new Set(shop.map(u => u.id));
  for (const u of [...d.boutique, ...d.inventaire]) {
    if (!u || typeof u !== 'object' || !shopIds.has(u.id)) return false;
  }

  const achievementIds = new Set(achievements.map(s => s.id));
  for (const s of d.succes) {
    if (!s || typeof s !== 'object' || !achievementIds.has(s.id)) return false;
  }

  return true;
}

// structural + integrity validation of an imported save FILE (with wrapper):
// checks the envelope and checksum, then delegates the state shape to isValidGameData.
export function isValidSaveData(fileContent) {
  if (!fileContent || typeof fileContent !== 'object') return false;
  if (fileContent.app !== SAVE_FILE_APP) return false;
  if (typeof fileContent.checksum !== 'string') return false;
  if (!fileContent.payload || typeof fileContent.payload !== 'object') return false;
  if (fnv1aHash(JSON.stringify(fileContent.payload)) !== fileContent.checksum) return false;

  return isValidGameData(fileContent.payload.data);
}

// reconcile a loaded/imported save with the CURRENT catalogue so a content update
// (new or removed entities, upgrades, achievements) never freezes or wipes progress:
// existing progress is kept, brand-new content is added, removed ids are dropped.
// returns a fresh, fully-shaped state object (validated afterwards by the caller).
export function migrateData(saved) {
  const base = structuredClone(DEFAULT_DATA);
  if (!saved || typeof saved !== 'object') return base;
  const migrated = { ...base, ...saved }; // saved scalars win; any new default field is filled in

  // entities: keep each saved entity (matched by name, missing fields backfilled from the
  // catalogue), add brand-new entities at quantite 0, and drop entities no longer in the game.
  const savedEntities = new Map(
    (Array.isArray(saved.entites) ? saved.entites : [])
      .filter(e => e && typeof e === 'object' && typeof e.nom === 'string')
      .map(e => [e.nom, e])
  );
  migrated.entites = entities.map(def => {
    const fresh = {
      nom: def.nom, quantite: 0,
      cout_initial: def.cout_initial, cout_actuel: def.cout_initial,
      rendement_initial: def.rendement_initial, rendement_actuel: 0,
      coefficient: def.coefficient,
    };
    const prev = savedEntities.get(def.nom);
    return prev ? { ...fresh, ...prev, nom: def.nom } : fresh;
  });

  // upgrades: an id is either bought (inventaire) or available (boutique). drop unknown ids,
  // and put every catalogue id the player hasn't bought back into the shop (new ones included).
  const toItem = u => ({ id: u.id, nom: u.nom, cout: u.cout, categorie: u.categorie });
  const boughtIds = new Set(
    (Array.isArray(saved.inventaire) ? saved.inventaire : [])
      .filter(u => u && typeof u === 'object')
      .map(u => u.id)
  );
  migrated.inventaire = shop.filter(u => boughtIds.has(u.id)).map(toItem);
  migrated.boutique = shop.filter(u => !boughtIds.has(u.id)).map(toItem);

  // achievements: keep only the unlocked ones that still exist (drop removed ids)
  const achievementIds = new Set(achievements.map(s => s.id));
  migrated.succes = (Array.isArray(saved.succes) ? saved.succes : [])
    .filter(s => s && typeof s === 'object' && achievementIds.has(s.id))
    .map(s => ({ id: s.id }));

  // prestige fields, defaulted here (not in state.js, which is imported almost everywhere):
  // this is what adds them to every existing save and to a brand-new game on load.
  migrated.etoiles_nether = (typeof saved.etoiles_nether === 'number' && saved.etoiles_nether >= 0) ? Math.floor(saved.etoiles_nether) : 0;
  migrated.ascensions = (typeof saved.ascensions === 'number' && saved.ascensions >= 0) ? Math.floor(saved.ascensions) : 0;

  return migrated;
}
