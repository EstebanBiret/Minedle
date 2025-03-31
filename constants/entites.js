import { defaultEntitiesValues } from "./defaultValues.js";

function creerEntites() {
  const entitesContainer = document.getElementById('entites-container')
  const template = document.getElementById('entite-template').textContent

  defaultEntitiesValues.forEach((obj) => {
    let html = template;

    Object.keys(obj).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, obj[key])
    });

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html.trim();
    const entiteElement = tempDiv.firstChild;

    entiteElement.querySelectorAll("*").forEach((child) => {
      child.classList.add("tooltip-element");
      child.setAttribute("data-tooltip-title", obj.nom);
      child.setAttribute("data-tooltip-content", obj.description);
    });

    entitesContainer.appendChild(entiteElement);
  });
}

creerEntites()

export const entites = [
  {
    nom: 'Pioche',
    cout_initial: 15,
    cout_actuel: 15,
    quantite: document.getElementById("Pioche-quantite"),
    rendement_initial: 0.1, 
    rendement_actuel: 0,
    seuil_affichage: 0,
    coefficient: 1
  },
  {
    nom: 'Villageois',
    cout_initial: 100,
    cout_actuel: 100,
    quantite: document.getElementById("Villageois-quantite"),
    rendement_initial: 1,
    rendement_actuel: 0,
    seuil_affichage: 0,
    coefficient: 1
  },
  {
    nom: 'Poulet',
    cout_initial: 700,
    cout_actuel: 700,
    quantite: document.getElementById("Poulet-quantite"),
    rendement_initial: 8,
    rendement_actuel: 0,
    seuil_affichage: 15,
    coefficient: 1
  },
  {
    nom: 'Zombie',
    cout_initial: 5000,
    cout_actuel: 5000,
    quantite: document.getElementById("Zombie-quantite"),
    rendement_initial: 47,
    rendement_actuel: 0,
    seuil_affichage: 700,
    coefficient: 1
  },
  {
    nom: 'Mineshaft',
    cout_initial: 30000,
    cout_actuel: 30000,
    quantite: document.getElementById("Mineshaft-quantite"),
    rendement_initial: 260,
    rendement_actuel: 0,
    seuil_affichage: 5000,
    coefficient: 1
  },
  {
    nom: 'Champimeuh',
    cout_initial: 200000,
    cout_actuel: 200000,
    quantite: document.getElementById("Champimeuh-quantite"),
    rendement_initial: 1400,
    rendement_actuel: 0,
    seuil_affichage: 30000,
    coefficient: 1
  },
  {
    nom: 'Araignée',
    cout_initial: 1200000,
    cout_actuel: 1200000,
    quantite: document.getElementById("Araignée-quantite"),
    rendement_initial: 7800,
    rendement_actuel: 0,
    seuil_affichage: 200000,
    coefficient: 1
  },
  {
    nom: 'Golem de neige',
    cout_initial: 8000000,
    cout_actuel: 8000000,
    quantite: document.getElementById("Golem de neige-quantite"),
    rendement_initial: 44000,
    rendement_actuel: 0,
    seuil_affichage: 1200000,
    coefficient: 1
  },
  {
    nom: 'Wither',
    cout_initial: 60000000,
    cout_actuel: 60000000,
    quantite: document.getElementById("Wither-quantite"),
    rendement_initial: 260000,
    rendement_actuel: 0,
    seuil_affichage: 8000000,
    coefficient: 1
  },
  {
    nom: 'Portail de l’End',
    cout_initial: 500000000,
    cout_actuel: 500000000,
    quantite: document.getElementById("Portail de l’End-quantite"),
    rendement_initial: 1600000,
    rendement_actuel: 0,
    seuil_affichage: 60000000,
    coefficient: 1
  }
];

const RATIO_ENTITE_AUGMENTATION_PRIX = 1.2;

//calculer le rendement total d'une entité
export function calculerRendement(rendement_initial, quantite) {
  return parseFloat((rendement_initial * Math.pow(1.1, quantite)).toFixed(2));
}

//calculer le coût d'achat d'une entité en fonction de la quantité possédée
export function calculerCout(cout_initial, quantite) {
    return Math.floor(cout_initial * Math.pow(RATIO_ENTITE_AUGMENTATION_PRIX, quantite));
}