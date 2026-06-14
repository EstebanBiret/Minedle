// save file format: integrity checksum (FNV-1a) and structural validation.
// the import/export/reset orchestration stays in index.js (it drives game resets).

import { shop } from "../constants/shop.js?v=2";
import { achievements } from "../constants/success.js?v=2";
import { MAX_LEVEL } from "./state.js?v=3";

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

// structural + integrity validation of an imported save file
export function isValidSaveData(fileContent) {
  if (!fileContent || typeof fileContent !== 'object') return false;
  if (fileContent.app !== SAVE_FILE_APP) return false;
  if (typeof fileContent.checksum !== 'string') return false;
  if (!fileContent.payload || typeof fileContent.payload !== 'object') return false;
  if (fnv1aHash(JSON.stringify(fileContent.payload)) !== fileContent.checksum) return false;

  const d = fileContent.payload.data;
  if (!d || typeof d !== 'object') return false;

  const numericFields = ['blocsDepuisToujours', 'blocsActuels', 'bpc', 'coefficientClic', 'blocsMinesAvecClics', 'pommes_or'];
  for (const field of numericFields) {
    if (typeof d[field] !== 'number' || !isFinite(d[field]) || d[field] < 0) return false;
  }
  if (typeof d.delai_pommes_or_ms !== 'number' || d.delai_pommes_or_ms < 1000) return false;
  if (!Number.isInteger(d.niveau) || d.niveau < 0 || d.niveau > MAX_LEVEL) return false;
  if ('derniere_visite' in d && (typeof d.derniere_visite !== 'number' || !isFinite(d.derniere_visite) || d.derniere_visite < 0)) return false; // optional field (older saves)
  if ('temps_de_jeu_ms' in d && (typeof d.temps_de_jeu_ms !== 'number' || !isFinite(d.temps_de_jeu_ms) || d.temps_de_jeu_ms < 0)) return false; // optional field (older saves)

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
