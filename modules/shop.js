// shop upgrades, entities and inventory: buying logic and DOM rendering.
// achievement checks are imported one-directionally; index.js helpers (sounds,
// saveProgress, updateBlocksDisplay, refreshTooltips, computeGlobalYieldPerSecond)
// are injected via initShop() to avoid importing the entry point.

import { computeCost, computeYield, entities } from "../constants/entities.js?v=2";
import { shop } from "../constants/shop.js?v=2";
import { data } from "./state.js?v=3";
import { formatNumber } from "./format.js?v=1";
import { checkEntityAchievements, checkMiscAchievements } from "./achievements.js?v=2";

// injected from index.js
let saveProgress, updateBlocksDisplay, refreshTooltips, computeGlobalYieldPerSecond, buyUpgradeSound, buyEntitySound;

export function initShop(deps) {
  ({ saveProgress, updateBlocksDisplay, refreshTooltips, computeGlobalYieldPerSecond, buyUpgradeSound, buyEntitySound } = deps);
}

// dirty-check helpers: the display loop runs ~20x/s, but most of what it writes
// (cost, quantity, yield ratio, visibility) only changes when the player buys
// something. these only touch the DOM when a value actually changes, and only
// re-walk children (the costly querySelectorAll) when affordability/ratio flips.
const _text = new WeakMap();     // element -> last innerHTML written
const _afford = new WeakMap();   // element -> last affordability (bool)
const _bloque = new WeakMap();   // element -> last hidden state (bool)
const _ratio = new WeakMap();    // element -> last yield-ratio string

function setText(el, value) {
  if (_text.get(el) !== value) {
    el.innerHTML = value;
    _text.set(el, value);
  }
}

function setBloque(el, hidden) {
  if (_bloque.get(el) === hidden) return;
  _bloque.set(el, hidden);
  el.classList.toggle('bloque', hidden);
}

// grey out an element + its children + its cost label, only when affordability flips
function setAffordable(el, coutEl, affordable) {
  if (_afford.get(el) === affordable) return;
  _afford.set(el, affordable);
  el.classList.toggle('disabled', !affordable);
  el.querySelectorAll('*').forEach(child => child.classList.toggle('disabled', !affordable));
  coutEl.classList.toggle('disabled-cost', !affordable);
  coutEl.classList.toggle('enabled-cost', affordable);
}

function setRatio(el, ratio) {
  if (_ratio.get(el) === ratio) return;
  _ratio.set(el, ratio);
  el.dataset.tooltipYieldRatio = ratio;
  el.querySelectorAll('*').forEach(child => { child.dataset.tooltipYieldRatio = ratio; });
}

export function buyUpgrade(upgradeName) {
  let index = data.boutique.findIndex(a => a.nom === upgradeName);
  const upgrade = data.boutique.find(a => a.nom === upgradeName);
  if (!upgrade || data.blocsActuels < upgrade.cout) return;
  buyUpgradeSound.play();
  // remove from the shop
  let boughtUpgrade = data.boutique.splice(index, 1)[0];

  // add to inventory & update current blocks
  data.inventaire.push(boughtUpgrade);
  data.blocsActuels -= upgrade.cout;
 
  // hide the purchased upgrade
  document.getElementById(`${boughtUpgrade.nom}-amelioration`).classList.add('bloque');
  
  // apply the upgrade's effects
  if (upgrade.categorie === 'clic') {
    // double click efficiency
    data.bpc *= 2;
  }
  // golden apples
  else if(upgrade.categorie === 'pomme_or') {
    data.delai_pommes_or_ms *= 0.75; // delay reduced by 25%
  }
  // entity upgrade
  else {
    const matchingEntity = data.entites.find(ent => ent.nom === upgrade.categorie);
    if (matchingEntity) {
      // double the entity's efficiency
      matchingEntity.coefficient *= 2;
    } 
  }

  // finally, save everything
  updateBlocksDisplay();
  saveProgress();
  updateEntities();
  updateShop();
  updateInventory();
  updatePickaxeEntityImage();
  refreshTooltips();
}

export function updateShop() {
  // hide already-purchased upgrades
  data.inventaire.forEach(a => {
    const upgrade = shop.find(ame => ame.id === a.id);
    if (upgrade) setBloque(document.getElementById(`${upgrade.nom}-amelioration`), true);
  });

  // update remaining upgrades
  data.boutique.forEach(a => {
    const upgrade = shop.find(ame => ame.id === a.id);
    if (!upgrade) return;
    const upgradeElement = document.getElementById(`${upgrade.nom}-amelioration`);

    // visibility: each category unlocks at its own condition
    let locked;
    if (upgrade.categorie === 'clic') {
      locked = data.blocsMinesAvecClics < upgrade.condition;
    } else if (upgrade.categorie === 'pomme_or') {
      locked = data.pommes_or < upgrade.condition;
    } else {
      const matchingEntity = data.entites.find(ent => ent.nom === upgrade.categorie);
      locked = !!(matchingEntity && matchingEntity.quantite < upgrade.condition);
    }
    setBloque(upgradeElement, locked);

    // then check whether it can be bought
    const coutElement = document.getElementById(`${upgrade.nom}-cout`);
    setAffordable(upgradeElement, coutElement, data.blocsActuels >= a.cout);
    setText(coutElement, formatNumber(Math.round(upgrade.cout)));
  });

  // show a message if no upgrade is available to buy
  const emptyMessage = document.getElementById('boutique-vide');
  if (emptyMessage) {
    const visibleUpgrades = document.querySelectorAll('#boutique-container .boutique:not(.bloque)').length;
    emptyMessage.style.display = visibleUpgrades === 0 ? 'block' : 'none';
  }
}

/* ENTITY SECTION */

// update the pickaxe image in the entity if pickaxe upgrades were bought
export function updatePickaxeEntityImage() {
  const pickaxeEntityElement = document.getElementById('Pioche-entite');
  if (!pickaxeEntityElement) return; // entity DOM not built yet: skip safely (loop must never throw)
  const pickaxeImage = pickaxeEntityElement.querySelector('img');
  if (!pickaxeImage) return;

  const diamondPickaxe = data.inventaire.find(i => i.id === 7);
  if (diamondPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 7).image;
    return;
  }
  const goldPickaxe = data.inventaire.find(i => i.id === 6);
  if (goldPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 6).image;
    return;
  }
  const ironPickaxe = data.inventaire.find(i => i.id === 5);
  if (ironPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 5).image;
    return;
  }
  const stonePickaxe = data.inventaire.find(i => i.id === 4);
  if (stonePickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 4).image;
  }
}

export function buyEntity(entityName) {
  const entity = data.entites.find(e => e.nom === entityName);

  if (!entity || data.blocsActuels < entity.cout_actuel) return;
  buyEntitySound.play();
  data.blocsActuels -= entity.cout_actuel;

  // update the entity's current yield, cost and quantity
  entity.quantite++;
  entity.cout_actuel = computeCost(entity.cout_initial, entity.quantite);
  entity.rendement_actuel = computeYield(entity.rendement_initial, entity.quantite);

  // each entity bought increases click efficiency by 2%
  data.coefficientClic *= 1.02;

  updateBlocksDisplay();
  saveProgress();
  updateEntities();
  updateShop();
  checkMiscAchievements();
  checkEntityAchievements();
}

export function updateEntities() {
  const totalYield = computeGlobalYieldPerSecond(); // hoisted out of the loop (was recomputed per entity = O(n²))

  data.entites.forEach(e => {
    const entity = entities.find(ent => ent.nom === e.nom);
    if (!entity) return;
    const entityElement = document.getElementById(`${entity.nom}-entite`);

    // decide whether to show the entity, based on its threshold and total blocks ever mined
    if (data.blocsDepuisToujours < entity.seuil_affichage) {
      setBloque(entityElement, true);
      return;
    }
    setBloque(entityElement, false);

    // then, if the entity is shown, check whether it can be bought
    const coutElement = document.getElementById(`${entity.nom}-cout`);
    setAffordable(entityElement, coutElement, data.blocsActuels >= e.cout_actuel);

    setText(document.getElementById(`${entity.nom}-quantite`), formatNumber(e.quantite));
    setText(coutElement, formatNumber(Math.round(e.cout_actuel)));

    const ratio = e.quantite > 0
      ? `${((e.rendement_actuel * e.quantite * e.coefficient / totalYield) * 100).toFixed(2)}% du rendement total`
      : '';
    setRatio(entityElement, ratio);
  });

  // keep the pickaxe entity icon in sync with bought pickaxe upgrades.
  // done here (and not only at init) so any startup timing race can't leave it on wood.
  updatePickaxeEntityImage();
}

/* INVENTORY SECTION */

export function updateInventory() {
  // update the inventory label
  let itemCount = data.inventaire.length;
  document.getElementById('inventaire-label').innerHTML = `Inventaire (${itemCount}/${shop.length})`;

  // and update the inventory items
  data.inventaire.forEach(a => {
    const inventoryItem = shop.find(item => item.id === a.id);
    const td = document.getElementById(`inventaire-${a.id}`);
    td.innerHTML = '';
    td.appendChild(document.createElement('img')).src = inventoryItem.image;

    // adjust this image's size
    td.querySelector('img').style.width = '70%';

    // add tooltips to the inventory items
    td.classList.add("tooltip-element");
    td.setAttribute("data-tooltip-title", inventoryItem.nom);
    td.setAttribute("data-tooltip-content-deux", inventoryItem.description);
    td.setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNumber(inventoryItem.cout) + ")");

    // and on their image
    td.querySelector('img').classList.add("tooltip-element");
    td.querySelector('img').setAttribute("data-tooltip-title", inventoryItem.nom);
    td.querySelector('img').setAttribute("data-tooltip-content-deux", inventoryItem.description);
    td.querySelector('img').setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNumber(inventoryItem.cout) + ")");
  });
}

// remove all inventory elements from the DOM
export function clearInventory() {
  for (let i = 1; i <= 36; i++) {
    let inventoryCell = document.getElementById(`inventaire-${i}`);
    if (inventoryCell) {
      inventoryCell.innerHTML = '';
      inventoryCell.removeAttribute('data-tooltip-title');
      inventoryCell.removeAttribute('data-tooltip-content-deux');
      inventoryCell.removeAttribute('data-tooltip-rendement-ratio');
      inventoryCell.classList.remove('tooltip-element');

      let newElement = inventoryCell.cloneNode(true); // clone to remove the attached tooltip event
      inventoryCell.parentNode.replaceChild(newElement, inventoryCell);
    }
  }
}
