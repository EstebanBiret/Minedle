# Tests

426 tests automatisés répartis en 29 suites (lancés via `npm test` ; lint via `npm run lint`) :

- **save** — export/import/validation des sauvegardes (checksum, schéma, `isValidGameData`)
- **save-migration** — réconciliation d'une sauvegarde avec le catalogue courant (ajout de contenu neuf, conservation de la progression, suppression des ids disparus)
- **prestige** — ascension / Étoiles du Nether : multiplicateur permanent (+5 %/étoile), calcul des étoiles gagnées, progression vers la prochaine étoile (blocs restants + fraction du palier), remise à zéro conservant étoiles / succès / temps de jeu
- **state-load** — validation au chargement et clonage (jamais d'alias de `DEFAULT_DATA`, repli si corrompu)
- **number-format** — formatage des nombres (espaces, virgules, abréviations, notation scientifique au-delà des quadrilliards, garde valeur non finie)
- **game-loops** — boucles de jeu (production en temps réel) et raccourcis clavier
- **save-throttle** — coalescence des sauvegardes au clic (~1/s : écriture immédiate puis une écriture de rattrapage)
- **music** — musique d'ambiance (lecture, volume, barre de progression)
- **background** — fond vidéo dynamique et repli
- **golden-apple** — apparition et cycle de vie des pommes d'or (animée, ou statique sous reduced-motion)
- **particles** — éclat de particules de la pomme d'or conditionné par prefers-reduced-motion
- **bonus** — bonus des pommes d'or (activation, expiration, anti-clobber du timer instantGain)
- **offline-gains** — gains de production hors-ligne
- **robustness** — localStorage corrompu, garde multi-onglets
- **tooltips-touch** — tooltips au survol et appui long tactile
- **stats** — page de statistiques et temps de jeu
- **onboarding** — bulle de premier lancement (une seule fois, nouveau joueur uniquement ; progression des étapes + flag de persistance)
- **levels** — passage des paliers de minerai (seuils, succès associés)
- **achievements** — conditions de déblocage des succès (par catégorie)
- **shop** — achats (améliorations, entités), effets, et dirty-check du DOM
- **clear-grid** — réinitialisation des grilles inventaire/succès (sans cloneNode, bornes = .length)
- **entities-shape** — constante des entités (pas de référence DOM morte, champs statiques conservés)
- **html-structure** — hygiène HTML (rien après la fermeture du body, script dans le body, pas d'id dupliqué, ids de coût namespacés, JSON-LD VideoGame valide)
- **grids** — génération des grilles inventaire/succès depuis le catalogue (une case par id, conteneur absent toléré)
- **listeners** — enregistrement correct des écouteurs (keydown au top level, tooltips câblés une seule fois)
- **notification-queue** — file d'attente des notifications de succès (un affichage à la fois, enchaînement à la fin, annonce SR via aria-live)
- **hygiene** — garde-fous source : aucun `innerHTML` ni `innerText`, fins de ligne LF, `prefers-reduced-motion` couvre float/bounce/fade-up, aucun `onclick` inline, CSP présente, globals `window.*` supprimés
- **focus-trap** — piège de focus des modales : focus initial, cycle `Tab`/`Shift+Tab`, restauration du focus à la fermeture
- **click-actions** — écouteur de clic délégué : routage de chaque `data-action` vers la bonne fonction + fermeture des modales au clic sur le fond

## Lancer en local

```
node tests/run-all.mjs
```

(Node 18 ou plus, aucune dépendance. `run-all.mjs` exécute automatiquement tous les fichiers `*.test.mjs` du dossier.)

## Comment ça marche

Les tests valident toujours le **vrai code**, jamais une copie. Deux conventions selon l'organisation du code :

1. **Code dans `index.js`** — la suite extrait le bloc voulu en se repérant sur des commentaires-marqueurs (par exemple `// ambient music`, `// offline gains`, `function spawnGoldenApple`), puis l'exécute dans un environnement simulé (DOM, localStorage, Audio, timers, BroadcastChannel...).

2. **Code dans un module `modules/*.js`** — la suite lit le fichier du module, retire les lignes `import` et le mot-clé `export`, puis exécute le corps dans un `new Function(...)` en **injectant les dépendances** (les imports deviennent des paramètres ; les helpers injectés via `init*()` sont câblés en appelant cette fonction). C'est ainsi que sont testés `shop.js`, `achievements.js` et `levels.js`.

Conséquence : si un commentaire-marqueur est renommé/supprimé, ou si du code est déplacé vers un module, la suite correspondante échoue avec un message clair — il suffit alors d'ajuster le marqueur ou de repointer l'extraction vers le module.
