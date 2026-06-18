// builds the inventory and achievement grid cells from the catalogue sizes, so
// the grids always match the constants instead of relying on hand-written HTML
// that could silently drift (a missing cell would make updateInventory /
// updateAchievements throw). one empty <div> per catalogue id, keyed by that id.

import { shop } from "../constants/shop.js?v=2";
import { achievements } from "../constants/success.js?v=3";

function buildGrid(containerId, prefix, items) {
  const container = document.getElementById(containerId);
  if (!container) return; // container missing: skip safely
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const cell = document.createElement('div');
    cell.id = `${prefix}-${item.id}`;
    fragment.appendChild(cell);
  });
  container.appendChild(fragment);
}

buildGrid('inventaire-grille', 'inventaire', shop);
buildGrid('succes-grille', 'succes', achievements);
