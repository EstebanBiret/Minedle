// central game state: the saved data object lives here so that any module can
// read it via the live import binding, and reassign it through setData().

import { entities } from "../constants/entities.js?v=2";
import { shop } from "../constants/shop.js?v=2";

// safe localStorage read: a corrupted entry must never brick the game
export function readStorageJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    console.error(`Stored data for "${key}" is corrupted, falling back to defaults.`, error);
    return fallback;
  }
}

// safe localStorage write: storage may be full or unavailable (quota exceeded,
// private browsing). returns true on success, false otherwise — callers decide
// how to surface the failure (e.g. a one-shot notice). never throws.
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Minedle : écriture impossible pour "${key}" (stockage plein ou indisponible).`, error);
    return false;
  }
}

// shape of a brand-new game
// highest mining tier (stone -> ... -> diamond)
export const MAX_LEVEL = 7;

export const DEFAULT_DATA = {
  derniere_visite: 0,
  temps_de_jeu_ms: 0,
  blocsDepuisToujours: 0,
  blocsActuels: 0,
  bpc: 1,
  coefficientClic: 1,
  entites: entities.map(u => ({
    nom: u.nom,
    quantite: 0,
    cout_initial: u.cout_initial,
    cout_actuel: u.cout_initial,
    rendement_initial: u.rendement_initial,
    rendement_actuel: 0,
    coefficient: u.coefficient
  })),
  niveau: 0,
  blocsMinesAvecClics: 0,
  boutique: shop.map(u => ({
    id: u.id,
    nom: u.nom,
    cout: u.cout,
    categorie: u.categorie
  })),
  inventaire: [],
  succes: [],
  pommes_or: 0,
  delai_pommes_or_ms: 300000 // 5min
};

// the live game state, loaded from storage (or a fresh game).
// importers read `data` directly; ES live bindings mean they always see the
// latest object, including after setData() reassigns it.
// a brand-new game (or a corrupted/unreadable entry) gets a DEEP CLONE of
// DEFAULT_DATA, never the template itself — otherwise gameplay mutations would
// pollute DEFAULT_DATA and a later reset would no longer be pristine.
// structural validation of a parseable-but-malformed entry happens in index.js.
export let data = readStorageJSON('minedle-data', null) ?? structuredClone(DEFAULT_DATA);

// active golden-apple bonus (read across the game loops; written via the setters)
export let activeBonus = null;
export let bonusEndTime = 0;
export function setActiveBonus(value) { activeBonus = value; }
export function setBonusEndTime(value) { bonusEndTime = value; }

// the only supported way to swap the whole state (import / reset)
export function setData(newData) {
  data = newData;
}
