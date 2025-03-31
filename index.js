import { calculerCout, calculerRendement, entites } from "./constants/entites.js";
import { boutique } from "./constants/boutique.js";
import { succes } from "./constants/succes.js";

window.achatEntite = achatEntite 
window.achatBoutique = achatBoutique 
window.fermerModalParametres = fermerModalParametres 

window.importerProgression = importerProgression 
window.exporterProgression = exporterProgression 
window.supprimerProgression = supprimerProgression 

console.log('Bienvenue jeune explorateur !');

//fonction pour supprimer les divs après un certain temps (animations de clic)
const timeout = (div) => {
  setTimeout(() => {
    div.remove()
  }, 400)
}

//sons
const sonAchatEntite = new Audio('/assets/audio/entite.mp3');
const sonAchatBoutique = new Audio('/assets/audio/boutique.mp3');
const sonSuccesDebloque = new Audio('/assets/audio/succes.mp3');
const sonPommeOr = new Audio('/assets/audio/pomme_or.mp3');
sonAchatEntite.volume = 0.5;
sonAchatBoutique.volume = 0.5;
sonSuccesDebloque.volume = 0.5;
sonPommeOr.volume = 0.5;

//niveaux
let niveaux = ['pierre', 'charbon', 'fer', 'or', 'redstone', 'lapis', 'emeraude', 'diamant'];
let niveauIndex = 0;
const NIVEAU_MAX = 7;

//blocs minés et infos cps
let texteBlocsActuels = document.getElementById("blocs-actuels");
let texteBlocsParSeconde = document.getElementById("bps-label");
let texteBlocsParClic = document.getElementById("bpc-label");

let blocImgContainer = document.getElementById('bloc-img-container')
let blocImg = document.getElementById('bloc-img')

blocImg.addEventListener('click', mineBloc);

//succes
let succesManquants = succes;

//bonus
let activeBonus = null;
let bonusEndTime = 0;

//récupérer les données du local storage
const NOUVELLES_DONNEES = {
  blocsDepuisToujours: 0,
  blocsActuels: 0,
  bpc: 1,
  coefficientClic: 1,
  entites: entites.map(u => ({
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
  boutique: boutique.map(u => ({
    id: u.id,
    nom: u.nom,
    cout: u.cout,
    categorie: u.categorie
  })),
  inventaire: [],
  succes: [],
  pommes_or: 0,
  delai_pommes_or_ms: 300000 //5mn 
};
let data = JSON.parse(localStorage.getItem('minedle-data')) || NOUVELLES_DONNEES; //on récupère les données sauvegardées, sinon on recommence le jeu
if(data == NOUVELLES_DONNEES) localStorage.setItem('minedle-data', JSON.stringify(data)); //première sauvegarde

let timerPomme;

//le saint appel
init();

function init() {
  //pommes d'or
  timerPomme = setTimeout(apparitionPommeOr, data.delai_pommes_or_ms);

  sauvegarderAffichageBlocs();
  majNiveau();
  majEntites();
  majBoutique();
  majInventaire();
  majSucces();
  majImagePiocheEntite();
}

/* PARTIE NIVEAU */

//voir si on passe au niveau suivant
function checkMajNiveau() {
  if(niveauIndex == NIVEAU_MAX) return;
  const niveauActuel = niveaux[niveauIndex];
  switch (niveauActuel) {
    case 'pierre':
      if (data.blocsDepuisToujours >= 1000) {
        augmenterNiveau();
        debloquerSucces(1);
      }
      break;
    case 'charbon':
      if (data.blocsDepuisToujours >= 10000) {
        augmenterNiveau();
        debloquerSucces(2);
      }
      break;
    case 'fer':
      if (data.blocsDepuisToujours >= 100000) {
        augmenterNiveau();
        debloquerSucces(3);
      }
      break;
    case 'or':
      if (data.blocsDepuisToujours >= 1000000) {
        augmenterNiveau();
        debloquerSucces(4);
      }
      break;
    case 'redstone':
      if (data.blocsDepuisToujours >= 10000000) {
        augmenterNiveau();
        debloquerSucces(5);
      }
      break;
    case 'lapis':
      if (data.blocsDepuisToujours >= 100000000) {
        augmenterNiveau();
        debloquerSucces(6);
      }
      break;
    case 'emeraude':
      if (data.blocsDepuisToujours >= 2000000000) {
        augmenterNiveau();
        debloquerSucces(7);
      }
      break;
  }
}

function augmenterNiveau() {
  niveauIndex++;
  let nouveauBloc = niveaux[niveauIndex];
  document.getElementById('bloc-img').src = `assets/blocs/${nouveauBloc}.webp`;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = `assets/blocs/${nouveauBloc}.webp`);
  data.niveau = niveauIndex;
  sauvegarderProgression();
}

//quand on revient sur le jeu, avoir le niveau actuel
function majNiveau() {
  niveauIndex = data.niveau;
  let nouveauBloc = niveaux[niveauIndex];
  document.getElementById('bloc-img').src = `assets/blocs/${nouveauBloc}.webp`;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = `assets/blocs/${nouveauBloc}.webp`);
}

/* PARTIE AFFICHAGES, SAUVEGARDES & CALCULS */

//maj les données du jeu dans le localStorage
function sauvegarderProgression() {
  localStorage.setItem('minedle-data', JSON.stringify(data));
}

//maj l'affichage des blocs minés et les infos cps
function sauvegarderAffichageBlocs() {
  let bps = calculerRendementGlobalParSeconde();
  let bpc = data.bpc * data.coefficientClic;

  // Si FullMultiplier est actif, on multiplie le BPS
  if (activeBonus === "fullMultiplier") {
    bps *= 7;
    texteBlocsParSeconde.style.color = "#6f6";
    texteBlocsParSeconde.style.textShadow = "0px 1px 4px black";
    texteBlocsParSeconde.style.fontWeight = "bold";
  } else {
    texteBlocsParSeconde.style.color = "";
    texteBlocsParSeconde.style.textShadow = "none";
    texteBlocsParSeconde.style.fontWeight = "normal";
  }

  // Si MegaClick est actif, on multiplie le BPC
  if (activeBonus === "megaClick") {
    bpc *= 777;
    texteBlocsParClic.style.color = "#6f6";
    texteBlocsParClic.style.textShadow = "0px 1px 4px black";
    texteBlocsParClic.style.fontWeight = "bold";
  } else if (activeBonus === "fullMultiplier") {
    bpc *= 7;
    texteBlocsParClic.style.color = "#6f6";
    texteBlocsParClic.style.textShadow = "0px 1px 4px black";
    texteBlocsParClic.style.fontWeight = "bold";
  } else {
    texteBlocsParClic.style.color = "";
    texteBlocsParClic.style.textShadow = "none";
    texteBlocsParClic.style.fontWeight = "normal";
  }

  // Mettre à jour l'affichage des valeurs
  texteBlocsActuels.innerHTML = formatNombre(formatNombreSansZeros(data.blocsActuels));
  texteBlocsParSeconde.innerHTML = 'par seconde : ' + formatNombre(formatNombreSansZeros(bps));
  texteBlocsParClic.innerHTML = 'par clic : ' + formatNombre(formatNombreSansZeros(bpc));
}

//formate le nombre de blocs pour une meilleure lisibilité
function formatNombre(n) {
  if (n < 1000) return n;

  const suffixes = ["", "millions", "milliards", "billions", "billiards", "trillions", "trilliards", "quadrillions", "quadrilliards"]; //nombres de 30 chiffres au maximum
  let index = -1;

  if (n < 1_000_000) {
      return n.toLocaleString("fr-FR");
  }

  while (n >= 1_000 && index < suffixes.length - 1) {
      n /= 1_000;
      index++;
  }

  let valeur = n.toFixed(2);
  valeur = valeur.replace(/\.?0+$/, "").replace(".", ",");
  return valeur + " " + suffixes[index];
}

function formatNombreSansZeros(decimal) {
  // Si les deux derniers chiffres après la virgule sont 00, on les supprime
  let formatted = parseFloat(decimal).toFixed(2);
  if (formatted.endsWith(".00")) {
    return parseInt(formatted).toString(); // Si c'est 00, on affiche uniquement la partie entière
  }
  return formatted; // Sinon on garde le format avec deux décimales
}

//calcul le montant des blocs minés par seconde grâce aux entités
function calculerRendementGlobalParSeconde() {
  let bps = 0;
  data.entites.forEach(e => {
    bps += e.rendement_actuel * e.quantite * e.coefficient;
  });
  return parseFloat(bps.toFixed(2));
}

/* PARTIE BOUTIQUE */

function achatBoutique(nomAmelioration) {
  let index = data.boutique.findIndex(a => a.nom === nomAmelioration);
  const amelioration = data.boutique.find(a => a.nom === nomAmelioration);
  if (!amelioration || data.blocsActuels < amelioration.cout) return;
  sonAchatBoutique.play();
  //retirer de la boutique  
  let ameliorationAchetee = data.boutique.splice(index, 1)[0];

  //ajouter à l'inventaire & maj des blocs actuels
  data.inventaire.push(ameliorationAchetee);
  data.blocsActuels -= amelioration.cout;
 
  //on cache l'amélioration achetée
  document.getElementById(`${ameliorationAchetee.nom}-amelioration`).classList.add('bloque');
  
  //on applique les modifs de l'amélioration
  if (amelioration.categorie === 'clic') {
    //double l'efficacité des clics
    data.bpc *= 2;
  }
  //pommes d'or
  else if(amelioration.categorie === 'pomme_or') {
    data.delai_pommes_or_ms *= 0.75; //délai réduit de 25%
  }
  //amélioration d'entité
  else {
    const entiteCorrespondante = data.entites.find(ent => ent.nom === amelioration.categorie);
    if (entiteCorrespondante) {
      //double l'efficacité de l'entité
      entiteCorrespondante.coefficient *= 2;
    } 
  }

  //enfin, on sauvegarde tout ça
  sauvegarderAffichageBlocs();
  sauvegarderProgression();
  majEntites();
  majBoutique();
  majInventaire();
  majImagePiocheEntite();
  refreshTooltips();
}

function majBoutique() {
  //cacher les améliorations déjà achetées
  data.inventaire.forEach(a => {
    const amelioration = boutique.find(ame => ame.id === a.id);
    if (amelioration) {
      const ameliorationElement = document.getElementById(`${amelioration.nom}-amelioration`);
      ameliorationElement.classList.add('bloque');
    }
  });

  //maj les améliorations restantes
  data.boutique.forEach(a => {
    const amelioration = boutique.find(ame => ame.id === a.id);
    if (amelioration) {
      const ameliorationElement = document.getElementById(`${amelioration.nom}-amelioration`);

      //clic
      if (amelioration.categorie === 'clic') {
        if (data.blocsMinesAvecClics < amelioration.condition) {
          ameliorationElement.classList.add('bloque');
        } else {
          ameliorationElement.classList.remove('bloque');
        }
      }
      //pommes d'or
      else if(amelioration.categorie === 'pomme_or') {
        if (data.pommes_or < amelioration.condition) {
          ameliorationElement.classList.add('bloque');
        } else {
          ameliorationElement.classList.remove('bloque');
        }
      }
      //amélioration d'entité
      else {
        const entiteCorrespondante = data.entites.find(ent => ent.nom === amelioration.categorie);
        if (entiteCorrespondante && entiteCorrespondante.quantite < amelioration.condition) {
          ameliorationElement.classList.add('bloque');
        } else {
          ameliorationElement.classList.remove('bloque');
        }
      }
      
      //ensuite, si l'entité est affichée, on regarde si on peut l'acheter ou non
      if (data.blocsActuels >= a.cout) {
        ameliorationElement.classList.remove('disabled');
        ameliorationElement.querySelectorAll('*').forEach(child => {
          child.classList.remove('disabled');
        });

        document.getElementById(`${amelioration.nom}-cout`).classList.remove('disabled-cost');
        document.getElementById(`${amelioration.nom}-cout`).classList.add('enabled-cost');
      } else {
        ameliorationElement.classList.add('disabled');
        ameliorationElement.querySelectorAll('*').forEach(child => {
          child.classList.add('disabled');
        });

        document.getElementById(`${amelioration.nom}-cout`).classList.remove('enabled-cost');
        document.getElementById(`${amelioration.nom}-cout`).classList.add('disabled-cost');
      }
      document.getElementById(`${amelioration.nom}-cout`).innerHTML = formatNombre(Math.round(amelioration.cout));
    }
  });
}

/* PARTIE ENTITE */

//maj l'image de la pioche dans l'entité si on a acheté des améliorations de pioche
function majImagePiocheEntite() {
  const piocheEntiteElement = document.getElementById('Pioche-entite');
  const piocheImage = piocheEntiteElement.querySelector('img');

  const piocheDiamant = data.inventaire.find(i => i.id === 7);
  if (piocheDiamant) {
    piocheImage.src = boutique.find(i => i.id === 7).image;
    return;
  }
  const piocheOr = data.inventaire.find(i => i.id === 6);
  if (piocheOr) {
    piocheImage.src = boutique.find(i => i.id === 6).image;
    return;
  }
  const piocheFer = data.inventaire.find(i => i.id === 5);
  if (piocheFer) {
    piocheImage.src = boutique.find(i => i.id === 5).image;
    return;
  }
  const piochePierre = data.inventaire.find(i => i.id === 4);
  if (piochePierre) {
    piocheImage.src = boutique.find(i => i.id === 4).image;
  }
}

function achatEntite(nomEntite) {
  const entite = data.entites.find(e => e.nom === nomEntite);

  if (!entite || data.blocsActuels < entite.cout_actuel) return;
  sonAchatEntite.play();
  data.blocsActuels -= entite.cout_actuel;

  //maj le rendement actuel de l'entité, son coût et sa quantité
  entite.quantite++;
  entite.cout_actuel = calculerCout(entite.cout_initial, entite.quantite);
  entite.rendement_actuel = calculerRendement(entite.rendement_initial, entite.quantite);

  //chaque entité acheté augmente de 2% l'efficacité des clics
  data.coefficientClic *= 1.02;

  sauvegarderAffichageBlocs();
  sauvegarderProgression();
  majEntites();
  majBoutique();
  checkSuccesDivers();
  checkSuccesEntites();
}

function majEntites() {
  data.entites.forEach(e => {
    const entite = entites.find(ent => ent.nom === e.nom);
    if (entite) {
      const entiteElement = document.getElementById(`${entite.nom}-entite`);
      
      //on regarde si on peut afficher ou non l'entité, en fonction de son seuil et de notre nombre de blocs minés depuis toujours
      if (data.blocsDepuisToujours < entite.seuil_affichage) {
        entiteElement.classList.add('bloque');
        return;
      } else {
        entiteElement.classList.remove('bloque');
      }

      //ensuite, si l'entité est affichée, on regarde si on peut l'acheter ou non
      if (data.blocsActuels >= e.cout_actuel) {
        entiteElement.classList.remove('disabled');
        entiteElement.querySelectorAll('*').forEach(child => {
          child.classList.remove('disabled');
        });

        document.getElementById(`${entite.nom}-cout`).classList.remove('disabled-cost');
        document.getElementById(`${entite.nom}-cout`).classList.add('enabled-cost');
      } else {
        entiteElement.classList.add('disabled');
        entiteElement.querySelectorAll('*').forEach(child => {
          child.classList.add('disabled');
        });

        document.getElementById(`${entite.nom}-cout`).classList.remove('enabled-cost');
        document.getElementById(`${entite.nom}-cout`).classList.add('disabled-cost');
      }

      document.getElementById(`${entite.nom}-quantite`).innerHTML = formatNombre(e.quantite);
      document.getElementById(`${entite.nom}-cout`).innerHTML = formatNombre(Math.round(e.cout_actuel));

      if(e.quantite > 0) {
        const pourcentage = ((e.rendement_actuel * e.quantite * e.coefficient / calculerRendementGlobalParSeconde()) * 100).toFixed(2);
        entiteElement.dataset.tooltipRendementRatio = `${pourcentage}% du rendement total`;
        entiteElement.querySelectorAll("*").forEach((child) => {
          child.dataset.tooltipRendementRatio = `${pourcentage}% du rendement total`;
        });
      } else {
        entiteElement.dataset.tooltipRendementRatio = '';
      } 
    }
  });
}

/* PARTIE INVENTAIRE */

function majInventaire() {
  //on maj le label de l'inventaire
  let nbItems = data.inventaire.length;
  document.getElementById('inventaire-label').innerHTML = `Inventaire (${nbItems}/${boutique.length})`;

  //et on maj les items de l'inventaire
  data.inventaire.forEach(a => {
    const inventaireItem = boutique.find(item => item.id === a.id);
    const td = document.getElementById(`inventaire-${a.id}`);
    td.innerHTML = '';
    td.appendChild(document.createElement('img')).src = inventaireItem.image;

    //modifier la taille de cette image
    td.querySelector('img').style.width = '70%';

    //mettre les tooltips sur les items de l'inventaire
    td.classList.add("tooltip-element");
    td.setAttribute("data-tooltip-title", inventaireItem.nom);
    td.setAttribute("data-tooltip-content-deux", inventaireItem.description);
    td.setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNombre(inventaireItem.cout) + ")");

    //et sur leur image
    td.querySelector('img').classList.add("tooltip-element");
    td.querySelector('img').setAttribute("data-tooltip-title", inventaireItem.nom);
    td.querySelector('img').setAttribute("data-tooltip-content-deux", inventaireItem.description);
    td.querySelector('img').setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNombre(inventaireItem.cout) + ")");
  });
}

//supprimer tous les éléments de l'inventaire dans le DOM
function nettoyerInventaire() {
  for (let i = 1; i <= 36; i++) {
    let caseInventaire = document.getElementById(`inventaire-${i}`);
    if (caseInventaire) {
      caseInventaire.innerHTML = '';
      caseInventaire.removeAttribute('data-tooltip-title');
      caseInventaire.removeAttribute('data-tooltip-content-deux');
      caseInventaire.removeAttribute('data-tooltip-rendement-ratio');
      caseInventaire.classList.remove('tooltip-element');

      let newElement = caseInventaire.cloneNode(true); //clone en retirant l'évent de tooltip attaché
      caseInventaire.parentNode.replaceChild(newElement, caseInventaire);
    }
  }
}

/* PARTIE SUCCES */ 

//supprimer tous les éléments des succès dans le DOM et les tooltips liés
function nettoyerSuccès() {
  for (let i = 1; i <= 30; i++) {
    let caseSucces = document.getElementById(`succes-${i}`);
    if (caseSucces) {
      caseSucces.innerHTML = '';
      caseSucces.removeAttribute('data-tooltip-title');
      caseSucces.removeAttribute('data-tooltip-content-deux');
      caseSucces.classList.remove('tooltip-element');

      let newElement = caseSucces.cloneNode(true); //clone en retirant l'évent de tooltip attaché
      caseSucces.parentNode.replaceChild(newElement, caseSucces);
    }
  }
}

//checker si on débloque un nouveau succès de type pommes d'or
function checkSuccesPommesOr() {
  //on regarde d'abord si on a fait tous les succès
  if(succesManquants.length === 0) return;

  //on récupère tous les succès manquants de type pommes or
  const succesPommesOr = succesManquants.filter(s => s.categorie === 'pomme_or');

  //tous les succès sont débloqués pour ce type
  if(succesPommesOr.length === 0) return;

  //on parcourt les succès de type pommes or manquants
  succesPommesOr.forEach(s => {
    if(data.pommes_or >= s.seuil) {
      debloquerSucces(s.id);
    }
  });
}

//checker si on débloque un nouveau succès de type clics
function checkSuccesClics() {
  //on regarde d'abord si on a fait tous les succès
  if(succesManquants.length === 0) return;

  //on récupère tous les succès manquants de type clics
  const succesClics = succesManquants.filter(s => s.categorie === 'clics');

  //tous les succès sont débloqués pour ce type
  if(succesClics.length === 0) return;

  //on parcourt les succès de type clics manquants
  succesClics.forEach(s => {
    if(data.blocsMinesAvecClics >= s.seuil) debloquerSucces(s.id);
  });
}

//checker si on débloque un nouveau succès de type blocs
function checkSuccesBlocs() {
  //on regarde d'abord si on a fait tous les succès
  if(succesManquants.length === 0) return;

  //on récupère tous les succès manquants de type blocs
  const succesBlocs = succesManquants.filter(s => s.categorie === 'bps' || s.categorie === 'blocs_totaux');

  //tous les succès sont débloqués pour ce type
  if(succesBlocs.length === 0) return;

  //on parcourt les succès de type blocs manquants
  succesBlocs.forEach(s => {
    if(s.categorie === 'bps') {
      //on ne prend pas en compte le bonus pour le succès
      if(calculerRendementGlobalParSeconde() >= s.seuil) debloquerSucces(s.id);
    }
    else { //blocs totaux depuis le début de l'aventure
      if(data.blocsDepuisToujours >= s.seuil) debloquerSucces(s.id);
    }
  });
}

//checker si on débloque un nouveau succès de type entite
function checkSuccesEntites() {
  //on regarde d'abord si on a fait tous les succès
  if(succesManquants.length === 0) return;

  //on récupère tous les succès manquants de type entite
  const succesEntite = succesManquants.filter(s => s.categorie === 'Pioche' || s.categorie === 'Villageois' || s.categorie === 'Poulet' || s.categorie === 'Zombie' || s.categorie === 'Mineshaft' || s.categorie === 'Champimeuh' || s.categorie === 'Araignée' || s.categorie === 'Golem de neige' || s.categorie === 'Wither' || s.categorie === 'Portail de l’End');

  //tous les succès sont débloqués pour ce type
  if(succesEntite.length === 0) return;

  //on parcourt les succès de type entite manquants
  succesEntite.forEach(s => {
    const entiteCorrespondante = data.entites.find(ent => ent.nom === s.categorie);
    if(entiteCorrespondante && entiteCorrespondante.quantite >= s.seuil) debloquerSucces(s.id);
  });
}

//checker si on débloque un nouveau succès de type divers (25 entités de chaque)
function checkSuccesDivers() {
  //on regarde d'abord si on a fait tous les succès
  if(succesManquants.length === 0) return;

  //on récupère tous les succès manquants de type divers
  const succesDivers = succesManquants.filter(s => s.categorie === 'divers');

  //tous les succès sont débloqués pour ce type
  if(succesDivers.length === 0) return;

  //on regarde si on a au moins 25 exemplaires de chaque entité
  let dixDeChaque = true;
  data.entites.forEach(e => {
    if(e.quantite < 25) dixDeChaque = false;
  });
  if(dixDeChaque) debloquerSucces(27);  
}

function majSucces() {
  //d'abord, on maj l'objet courant succesManquant en fonction de ce qu'on a déjà débloqué et de la constante succes importée
  succesManquants = succes.filter(s => !data.succes.some(succesDebloque => succesDebloque.id === s.id));

  //on maj le label des succès
  let nbSucces = data.succes.length;
  document.getElementById('succes-label').innerHTML = `Succès (${nbSucces}/${succes.length})`;

  //et on maj les items des succès
  data.succes.forEach(a => {
    const succesItem = succes.find(item => item.id === a.id);
    const td = document.getElementById(`succes-${a.id}`);
    td.innerHTML = '';
    td.appendChild(document.createElement('img')).src = succesItem.image;

    //modifier la taille de cette image
    td.querySelector('img').style.width = '70%';

    //mettre les tooltips sur les items de l'inventaire
    td.classList.add("tooltip-element");
    td.setAttribute("data-tooltip-title", succesItem.nom);
    td.setAttribute("data-tooltip-content-deux", succesItem.description);

    //et sur leur image
    td.querySelector('img').classList.add("tooltip-element");
    td.querySelector('img').setAttribute("data-tooltip-title", succesItem.nom);
    td.querySelector('img').setAttribute("data-tooltip-content-deux", succesItem.description);
  });
}

function debloquerSucces(id) {
  //on retrouve le sucès dans la liste des succès manquants
  const succesADebloquer = succesManquants.find(s => s.id === id);
  if (!succesADebloquer) return; //succès déjà débloqué ou inexistant
  data.succes.push(succesADebloquer);
  majSucces();
  refreshTooltips();
  notificationSucces(id);
}

function notificationSucces(id) {
  //on retrouve le succès dans la liste
  const succesCible = succes.find(s => s.id === id);
  if (!succesCible) return;

  sonSuccesDebloque.play();
  
  const div = document.createElement('div');
  div.classList.add('notification-succes');
  document.body.appendChild(div);
  div.style.bottom = "-100px"; 

  const img = document.createElement('img');
  img.src = succesCible.image;
  img.classList.add('img-notification-succes');
  img.style.width = '15%';
  div.appendChild(img);

  const div2 = document.createElement('div');
  div2.classList.add('txt-notification-succes');

  const titre = document.createElement('div');
  titre.innerHTML = "Succès obtenu !";
  titre.classList.add('titre-notification-succes');
  div2.appendChild(titre);

  const nomSuccess = document.createElement('div');
  nomSuccess.innerHTML = succesCible.nom;
  nomSuccess.classList.add('nom-notification-succes');
  div2.appendChild(nomSuccess);

  div.appendChild(div2);
  
  setTimeout(() => {
    div.style.bottom = "20px";
  }, 10);
  setTimeout(() => {
    div.style.bottom = "-" + div.clientHeight + "px";
  }, 4500); 
  setTimeout(() => {
    div.remove();
  }, 5000); 
}

//clic sur le bloc
function mineBloc(event) {

  //animation de clic
  const x = event.offsetX
  const y = event.offsetY
  const div = document.createElement('div')

  //vérifier si un bonus est actif
  let multiplicateur = 1;
  if (activeBonus === "megaClick") {
      multiplicateur = 777;
  } else if (activeBonus === "fullMultiplier") {
      multiplicateur = 7;
  }

  div.innerHTML = `+${formatNombre(formatNombreSansZeros(data.bpc * data.coefficientClic * multiplicateur))}`  
  div.style.cssText = `
  color: white; 
  position: absolute; 
  top: ${y}px; 
  left: ${x}px; 
  font-size: 20px; 
  pointer-events: none; 
  white-space: nowrap;`;  
  blocImgContainer.appendChild(div)
  div.classList.add('fade-up')
  timeout(div)

  //maj dans le localStorage

  //si bonus de multiplication de clics activés 
  const gainBase = data.bpc * data.coefficientClic;

  // Calcul du gain total
  let gainTotal = gainBase * multiplicateur;

  data.blocsDepuisToujours += gainTotal;
  data.blocsActuels += gainTotal;
  data.blocsMinesAvecClics += gainTotal;

  checkMajNiveau();
  checkSuccesClics();
  majEntites();
  majBoutique();
  sauvegarderAffichageBlocs();
  sauvegarderProgression();
}

//tooltips
function refreshTooltips() {
  const tooltip = document.getElementById("tooltip");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipContent = document.getElementById("tooltip-content");
  const tooltipContentDeux = document.getElementById("tooltip-content-deux");
  const tooltipRendementRatio = document.getElementById("tooltip-rendement-ratio");
  const padding = 10;

  document.querySelectorAll(".tooltip-element").forEach(element => {
    element.addEventListener("mouseover", event => {
      const { tooltipTitle: title, tooltipContent: content, tooltipContentDeux: contentDeux, tooltipRendementRatio: rendementRatio } = event.target.dataset;

      tooltipTitle.innerHTML = title || "";
      tooltipContent.innerHTML = content || "";
      tooltipContentDeux.innerHTML = contentDeux || "";
      tooltipRendementRatio.innerHTML = rendementRatio || "";

      tooltip.classList.add("visible");
      document.addEventListener("mousemove", majTooltipPosition);
    });

    element.addEventListener("mouseout", () => {
      tooltip.classList.remove("visible");
      tooltip.classList.add("transparent");
      document.removeEventListener("mousemove", majTooltipPosition);
    });
  });

  function majTooltipPosition(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    let newX = event.pageX + padding;
    let newY = event.pageY + padding;

    if (newX + tooltipRect.width > window.innerWidth) {
      newX = event.pageX - tooltipRect.width - padding;
    }
    if (newY + tooltipRect.height > window.innerHeight) {
      newY = event.pageY - tooltipRect.height - padding;
    }

    tooltip.style.left = `${newX}px`;
    tooltip.style.top = `${newY}px`;
    tooltip.classList.remove("transparent");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refreshTooltips();
});

document.getElementById('surtom').addEventListener('click', () => {
  debloquerSucces(28);
  window.open('https://surtom.yvelin.net/', '_blank');  
});

document.getElementById('cookie').addEventListener('click', () => {
  window.open('https://orteil.dashnet.org/cookieclicker/', '_blank');  
});

/* PARAMETRES */ 

const ENCRYPTION_KEY = new TextEncoder().encode("ouijesaiscestpassecurisemaisosef");

function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
    let binaryString = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function getCryptoKey() {
    return await window.crypto.subtle.importKey(
        "raw",
        ENCRYPTION_KEY,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

async function exporterProgression() {
    let data = localStorage.getItem("minedle-data");
    if (!data) {
        alert("Aucune progression trouvée.");
        return;
    }

    let key = await getCryptoKey();
    let iv = window.crypto.getRandomValues(new Uint8Array(12));
    let encodedData = new TextEncoder().encode(data);

    let encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData
    );

    let exportObject = {
        iv: arrayBufferToBase64(iv),
        data: arrayBufferToBase64(encryptedData)
    };

    let blob = new Blob([JSON.stringify(exportObject)], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    let date = new Date();
    let dateStr = date.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
    a.download = `minedle_progression_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    fermerModalParametres();
}

async function importerProgression() {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async function (event) {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = async function () {
            try {
                let importObject = JSON.parse(reader.result);
                let iv = base64ToArrayBuffer(importObject.iv);
                let encryptedData = base64ToArrayBuffer(importObject.data);

                let key = await getCryptoKey();
                let decryptedData = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv },
                    key,
                    encryptedData
                );

                let decodedData = new TextDecoder().decode(decryptedData);
                data = JSON.parse(decodedData);
                alert("Progression importée avec succès !");
                nettoyerInventaire();
                nettoyerSuccès();
                init();
                fermerModalParametres();
            } catch (error) {
                alert("Erreur lors de l'importation : le fichier est corrompu !");
                console.error(error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function supprimerProgression(){
  nettoyerInventaire();
  nettoyerSuccès();
  fermerModalParametres();

  //on remet la pioche de bois en image d'entité pioche
  document.getElementById('Pioche-entite').querySelector('img').src = 'assets/entites/pioche_bois.webp';

  localStorage.removeItem('minedle-data');
  data = JSON.parse(JSON.stringify(NOUVELLES_DONNEES));
  sauvegarderProgression();
  init();
}

function ouvrirModalParametres() {
  sonAchatEntite.play();
  document.getElementById('parametres-modal').style.display = 'block';
}

function fermerModalParametres() {
  sonAchatEntite.play();
  document.getElementById('parametres-modal').style.display = 'none';
}

document.getElementById('parametres').addEventListener('click', () => {
  ouvrirModalParametres();
});

document.onkeydown = function(evt) {
  if (evt.key === "Escape") fermerModalParametres();
}

window.onclick = function(event) {
  if (event.target === document.getElementById('parametres-modal')) fermerModalParametres();
}

/* POMMES D'OR */ 
const bonus = {
    instantGain: {
        duration: 0,
        message: "Gain immédiat de 30% des blocs actuels",
        effect: (x, y) => {
            afficherBonus("Gain immédiat de 30% des blocs actuels");
            gainBlocs(0.3, x, y);
            setTimeout(supprimerBonus, 3000);
        }
    },
    megaClick: {
        duration: 10,
        message: "Clics x777 pendant 10s",
        effect: () => {
            afficherBonus("Clics x777 pendant 10s");
            /*setTimeout(() => {
                supprimerBonus();
            }, 10000);*/
        }
    },
    fullMultiplier: {
        duration: 45,
        message: "Clics et production x7 pendant 45s",
        effect: () => {
            afficherBonus("Clics et production x7 pendant 45s");
            /*setTimeout(() => {
                supprimerBonus();
            }, 45000);*/
        }
    }
};

function afficherBonus(texte) {
  const display = document.getElementById("bonusDisplay");
  display.innerText = texte;
  display.style.display = "block";
}

function supprimerBonus() {
  activeBonus = null;
  bonusEndTime = 0;
  document.getElementById("bonusDisplay").style.display = "none";
}

function majAffichageBonus() {
  if (!activeBonus) return;
  
  if(activeBonus != "instantGain") {

    let tempsRestant = Math.ceil((bonusEndTime - Date.now()) / 1000); //arrondi au dessus pour éviter un affichage "0s" trop tôt
    if (tempsRestant <= 0) {
      supprimerBonus();
      return;
    }
    document.getElementById("bonusDisplay").innerText = `${bonus[activeBonus].message} (${tempsRestant}s)`;
  }
}

function gainBlocs(pourcentage, x, y) {
  let gain = Math.floor(data.blocsActuels * pourcentage);
  const div = document.createElement('div')
  div.innerHTML = `+${formatNombre(formatNombreSansZeros(gain))}`  
  div.style.cssText = `
  color: white; 
  position: absolute; 
  top: ${y}px; 
  left: ${x}px; 
  font-size: 20px; 
  pointer-events: none; 
  white-space: nowrap;`;  
  document.body.appendChild(div)
  div.classList.add('fade-up')
  timeout(div)

  data.blocsActuels += gain;
  data.blocsDepuisToujours += gain;
  sauvegarderAffichageBlocs();
  sauvegarderProgression();
}

function activateBonus(type, x, y) {
  if (activeBonus) supprimerBonus();

  const b0nus = bonus[type];
  if (!b0nus) return;

  activeBonus = type;
  bonusEndTime = Date.now() + b0nus.duration * 1000;

  b0nus.effect(x, y);
  majAffichageBonus();
}

//clic sur une pomme d'or, apporte un bonus tiré au hasard
function pommeOrClic(pomme) {

  const rect = pomme.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  pop(pomme);
  pomme.remove();
  sonPommeOr.play();
  data.pommes_or++;
  checkSuccesPommesOr();

  let choix = Math.floor(Math.random() * 3) + 1;
  let bonusType = choix === 1 ? "instantGain" : choix === 2 ? "megaClick" : "fullMultiplier";

  activateBonus(bonusType, x, y);
}

function apparitionPommeOr() {
  const pomme = document.createElement("div");
  pomme.classList.add("pomme-or");

  //on réinitialise le timer pour la prochaine apparition
  clearTimeout(timerPomme);
  timerPomme = setTimeout(apparitionPommeOr, data.delai_pommes_or_ms);

  //position aléatoire sur l'écran
  const maxX = window.innerWidth - 100;
  const maxY = window.innerHeight - 100;
  pomme.style.left = `${Math.random() * maxX}px`;
  pomme.style.top = `${Math.random() * maxY}px`;

  document.body.appendChild(pomme);

  let vieTotale = 55 * 60;
  let debutVie = 20 * 60;
  let vieAuPrime = 15 * 60;
  let finVie = 20 * 60;
  let vie = vieTotale;

  let taille = 1.6;
  let angleRotation = Math.random() * 360;

  function majPomme() {
      if (vie > 0) {
          let courbe;
          if (vie > vieAuPrime + finVie) {
              let progres = 1 - (vie - (vieAuPrime + finVie)) / debutVie;
              courbe = Math.pow(progres, 2);
              pomme.style.opacity = progres;
          } else if (vie > finVie) {
            courbe = 1;
              pomme.style.opacity = 1;
          } else {
              let progres = vie / finVie;
              courbe = Math.pow(progres, 2);
              pomme.style.opacity = progres;
          }

          angleRotation += .5;
          let rotation = angleRotation;
          let echelle = taille * courbe;
          pomme.style.transform = `rotate(${rotation}deg) scale(${echelle})`;
          vie--;
          requestAnimationFrame(majPomme);
      } else {
        pomme.remove();
      }
  }

  //pour pouvoir cliquer sur la pomme de manière audacieuse, fluviale et assertive
  pomme.addEventListener("click", () => pommeOrClic(pomme));
  majPomme();
}

function createParticle(x, y) {
  const particle = document.createElement('particle');
  document.body.appendChild(particle);

  let size = Math.floor(Math.random() * 15 + 10);
  let destinationX = (Math.random() - 0.5) * 150;
  let destinationY = (Math.random() - 0.5) * 150;
  let rotation = Math.random() * 520;
  let delay = Math.random() * 100;

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundImage = 'url("assets/boutique/pomme_or/pomme_or_1.webp")';

  const animation = particle.animate(
    [
      {
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(0deg)`,
        opacity: 1
      },
      {
        transform: `translate(-50%, -50%) translate(${x + destinationX}px, ${y + destinationY}px) rotate(${rotation}deg)`,
        opacity: 0
      }
    ],
    {
      duration: Math.random() * 800 + 500,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay: delay
    }
  );

  animation.onfinish = () => particle.remove();
}

function pop(pomme) {
  let amount = 30;
  let x, y;

  const rect = pomme.getBoundingClientRect();
  x = rect.left + rect.width / 2;
  y = rect.top + rect.height / 2;

  if (x === 0 && y === 0) {
    for (let i = 0; i < 30; i++) {
      createParticle(x, y, "pomme");
    }
  } else {
    for (let i = 0; i < amount; i++) {
      createParticle(x, y + window.scrollY, "pomme");
    }
  }
}

//logique du jeu, rafraichit toutes les centièmes de secondes
setInterval(() => {
  let productionActuelle = calculerRendementGlobalParSeconde() / 100;

  //vérifier si le bonus FullMultiplier est actif
  if (activeBonus === "fullMultiplier") productionActuelle *= 7;

  data.blocsActuels += productionActuelle;
  data.blocsDepuisToujours += productionActuelle;

  majEntites();
  majBoutique();
  checkMajNiveau();

  if(succesManquants.length > 0) checkSuccesBlocs(); //on check les succès liés au blocs si il en reste à débloquer toutes catégories confondues

  sauvegarderAffichageBlocs();
  sauvegarderProgression();
}, 10);

//on rafraichit les bonus toutes les secondes
setInterval(() => {
  if (activeBonus && activeBonus != "instantGain") majAffichageBonus();
}, 1000);