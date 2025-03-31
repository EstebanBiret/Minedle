import { defaultBoutiqueValues } from "./defaultValues.js";

function creerBoutique() {
  const boutiqueContainer = document.getElementById('boutique-container')
  const template = document.getElementById('boutique-template').textContent

  defaultBoutiqueValues.forEach((obj) => {
    let html = template;

    Object.keys(obj).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, obj[key])
    });

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html.trim();
    const boutiqueElement = tempDiv.firstChild;

    boutiqueElement.querySelectorAll("*").forEach((child) => {
      child.classList.add("tooltip-element");
      child.setAttribute("data-tooltip-title", obj.nom);
      child.setAttribute("data-tooltip-content-deux", obj.description);
    });

    boutiqueContainer.appendChild(boutiqueElement);
  });
}

creerBoutique()

export const boutique = [
	{
    id: 1,
    nom: 'Doigt de Notch',
    image: './assets/boutique/clic/clic_1.webp',
    description: 'Les clics sont deux fois plus efficaces.',
    cout: 200,
    categorie: 'clic',
    condition: 100
  },
  {
    id: 2,
    nom: 'Mineur frénétique',	
    image: './assets/boutique/clic/clic_2.webp',
    description: 'Les clics sont deux fois plus efficaces.',
    cout: 1200,
    categorie: 'clic',
    condition: 600
  },
  {
    id: 3,
    nom: 'Efficacité maximale',	
    image: './assets/boutique/clic/clic_3.webp',
    description: 'Les clics sont deux fois plus efficaces.',
    cout: 3600,
    categorie: 'clic',
    condition: 1800
  },
  {
    id: 4,
    nom: 'Pioche en pierre',	
    image: './assets/boutique/pioche/pioche_pierre.webp',
    description: 'Les pioches sont deux fois plus efficaces.',
    cout: 100,
    categorie: 'Pioche',
    condition: 1
  },
  {
    id: 5,
    nom: 'Pioche en fer',	
    image: './assets/boutique/pioche/pioche_fer.webp',
    description: 'Les pioches sont deux fois plus efficaces.',
    cout: 500,
    categorie: 'Pioche',
    condition: 10
  },
  {
    id: 6,
    nom: 'Pioche en or',	
    image: './assets/boutique/pioche/pioche_or.webp',
    description: 'Les pioches sont deux fois plus efficaces.',
    cout: 5000,
    categorie: 'Pioche',
    condition: 25
  },
  {
    id: 7,
    nom: 'Pioche en diamant',	
    image: './assets/boutique/pioche/pioche_diamant.webp',
    description: 'Les pioches sont deux fois plus efficaces.',
    cout: 500000,
    categorie: 'Pioche',
    condition: 50
  },
  {
    id: 8,
    nom: 'Protection du village',	
    image: './assets/boutique/villageois/villageois_1.webp',
    description: 'Les villageois sont deux fois plus efficaces.',
    cout: 2000,
    categorie: 'Villageois',
    condition: 1
  },
  {
    id: 9,
    nom: 'Des émeraudes ou rien',	
    image: './assets/boutique/villageois/villageois_2.webp',
    description: 'Les villageois sont deux fois plus efficaces.',
    cout: 10000,
    categorie: 'Villageois',
    condition: 10
  },
  {
    id: 10,
    nom: 'Marchand douteux',
    image: './assets/boutique/villageois/villageois_3.webp',	
    description: 'Les villageois sont deux fois plus efficaces.',
    cout: 75000,
    categorie: 'Villageois',
    condition: 25
  },
  {
    id: 11,
    nom: 'Volaille ardente',	
    image: './assets/boutique/poulet/poulet_1.webp',
    description: 'Les poulets sont deux fois plus efficaces.',
    cout: 10000,
    categorie: 'Poulet',
    condition: 1
  },
  {
    id: 12,
    nom: 'Basse-cour agitée',
    image: './assets/boutique/poulet/poulet_2.webp',	
    description: 'Les poulets sont deux fois plus efficaces.',
    cout: 50000,
    categorie: 'Poulet',
    condition: 10
  },
  {
    id: 13,
    nom: 'Escadron à plumes',	
    image: './assets/boutique/poulet/poulet_3.webp',
    description: 'Les poulets sont deux fois plus efficaces.',
    cout: 250000,
    categorie: 'Poulet',
    condition: 25
  },
  {
    id: 14,
    nom: 'Braaaiiins...',	
    image: './assets/boutique/zombie/zombie_1.webp',
    description: 'Les zombies sont deux fois plus efficaces.',
    cout: 50000,
    categorie: 'Zombie',
    condition: 1
  },
  {
    id: 15,
    nom: 'Zombieland',	
    image: './assets/boutique/zombie/zombie_2.webp',
    description: 'Les zombies sont deux fois plus efficaces.',
    cout: 250000,
    categorie: 'Zombie',
    condition: 10
  },
  {
    id: 16,
    nom: 'Horde inarrêtable',	
    image: './assets/boutique/zombie/zombie_3.webp',
    description: 'Les zombies sont deux fois plus efficaces.',
    cout: 1250000,
    categorie: 'Zombie',
    condition: 25
  },
  {
    id: 17,
    nom: 'Galeries bien rodées',	
    image: './assets/boutique/mineshaft/mineshaft_1.webp',
    description: 'Les mineshafts sont deux fois plus efficaces.',
    cout: 250000,
    categorie: 'Mineshaft',
    condition: 1
  },
  {
    id: 18,
    nom: 'Vers les profondeurs',	
    image: './assets/boutique/mineshaft/mineshaft_2.webp',
    description: 'Les mineshafts sont deux fois plus efficaces.',
    cout: 1250000,
    categorie: 'Mineshaft',
    condition: 10
  },
  {
    id: 19,
    nom: 'Mines de la Moria',
    image: './assets/boutique/mineshaft/mineshaft_3.webp',	
    description: 'Les mineshafts sont deux fois plus efficaces.',
    cout: 6000000,
    categorie: 'Mineshaft',
    condition: 25
  },
  {
    id: 20,
    nom: 'Hallucinations champêtres',	
    image: './assets/boutique/champimeuh/champimeuh_1.webp',
    description: 'Les champimeuh sont deux fois plus efficaces.',
    cout: 1250000,
    categorie: 'Champimeuh',
    condition: 1
  },
  {
    id: 21,
    nom: 'Expansion fongique',	
    image: './assets/boutique/champimeuh/champimeuh_2.webp',
    description: 'Les champimeuh sont deux fois plus efficaces.',
    cout: 6000000,
    categorie: 'Champimeuh',
    condition: 10
  },
  {
    id: 22,
    nom: 'Domination mycélienne',
    image: './assets/boutique/champimeuh/champimeuh_3.webp',	
    description: 'Les champimeuh sont deux fois plus efficaces.',
    cout: 30000000,
    categorie: 'Champimeuh',
    condition: 25
  },
  {
    id: 23,
    nom: 'Nuée rampante',	
    image: './assets/boutique/araignee/araignee_1.webp',
    description: 'Les araignées sont deux fois plus efficaces.',
    cout: 6000000,
    categorie: 'Araignée',
    condition: 1
  },
  {
    id: 24,
    nom: 'Toiles perfides',	
    image: './assets/boutique/araignee/araignee_2.webp',
    description: 'Les araignées sont deux fois plus efficaces.',
    cout: 30000000,
    categorie: 'Araignée',
    condition: 10
  },
  {
    id: 25,
    nom: 'Terreur souterraine',	
    image: './assets/boutique/araignee/araignee_3.webp',
    description: 'Les araignées sont deux fois plus efficaces.',
    cout: 150000000,
    categorie: 'Araignée',
    condition: 25
  },
  {
    id: 26,
    nom: 'Neige qui cogne',	
    image: './assets/boutique/golem_neige/golem_neige_1.webp',
    cout: 30000000,
    categorie: 'Golem de neige',
    description: 'Les golems de neige sont deux fois plus efficaces.',
    condition: 1
  },
  {
    id: 27,
    nom: 'Blizzard ambulant',	
    image: './assets/boutique/golem_neige/golem_neige_2.webp',
    description: 'Les golems de neige sont deux fois plus efficaces.',
    cout: 150000000,
    categorie: 'Golem de neige',
    condition: 10
  },
  {
    id: 28,
    nom: 'Hiver nucléaire',	
    image: './assets/boutique/golem_neige/golem_neige_3.webp',
    description: 'Les golems de neige sont deux fois plus efficaces.',
    cout: 750000000,
    categorie: 'Golem de neige',
    condition: 25
  },
  {
    id: 29,
    nom: 'Ombre menaçante',	
    image: './assets/boutique/wither/wither_1.webp',
    description: 'Les withers sont deux fois plus efficaces.',
    cout: 150000000,
    categorie: 'Wither',
    condition: 1
  },
  {
    id: 30,
    nom: 'Triple menace',	
    image: './assets/boutique/wither/wither_2.webp',
    description: 'Les withers sont deux fois plus efficaces.',
    cout: 750000000,
    categorie: 'Wither',
    condition: 10
  },
  {
    id: 31,
    nom: 'Ultime destruction',	
    image: './assets/boutique/wither/wither_3.webp',
    description: 'Les withers sont deux fois plus efficaces.',
    cout: 3500000000,
    categorie: 'Wither',
    condition: 25
  },
  {
    id: 32,
    nom: 'Entre deux dimensions',	
    image: './assets/boutique/portail_end/portail_end_1.webp',
    description: 'Les portails de l’End sont deux fois plus efficaces.',
    cout: 1000000000,
    categorie: 'Portail de l’End',
    condition: 1
  },
  {
    id: 33,
    nom: 'Voyage sans retour',	
    image: './assets/boutique/portail_end/portail_end_2.webp',
    description: 'Les portails de l’End sont deux fois plus efficaces.',
    cout: 5000000000,
    categorie: 'Portail de l’End',
    condition: 10
  },
  {
    id: 34,
    nom: 'La Fin ?',
    image: './assets/boutique/portail_end/portail_end_3.webp',	
    description: 'Les portails de l’End sont deux fois plus efficaces.',
    cout: 25000000000,
    categorie: 'Portail de l’End',
    condition: 25
  },
  {
    id: 35,
    nom: 'Verger interdit',	
    image: './assets/boutique/pomme_or/pomme_or_1.webp',
    description: 'Les pommes dorées apparaissent plus souvent.',
    cout: 77777,
    categorie: 'pomme_or',
    condition: 1
  },
  {
    id: 36,
    nom: 'Le festin de Notch',	
    image: './assets/boutique/pomme_or/pomme_or_2.webp',
    description: 'Les pommes dorées apparaissent plus souvent.',
    cout: 777777,
    categorie: 'pomme_or',
    condition: 3
  }
]