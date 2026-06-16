# Tests

279 tests automatisés répartis en 19 suites :

- **save** — export/import/validation des sauvegardes (checksum, schéma, `isValidGameData`)
- **state-load** — validation au chargement et clonage (jamais d'alias de `DEFAULT_DATA`, repli si corrompu)
- **number-format** — formatage des nombres (espaces, virgules, abréviations)
- **game-loops** — boucles de jeu et raccourcis clavier
- **music** — musique d'ambiance (lecture, volume, barre de progression)
- **background** — fond vidéo dynamique et repli
- **golden-apple** — apparition et cycle de vie des pommes d'or
- **bonus** — bonus des pommes d'or (activation, expiration, anti-clobber du timer instantGain)
- **offline-gains** — gains de production hors-ligne
- **robustness** — localStorage corrompu, garde multi-onglets
- **tooltips-touch** — tooltips au survol et appui long tactile
- **stats** — page de statistiques et temps de jeu
- **levels** — passage des paliers de minerai (seuils, succès associés)
- **achievements** — conditions de déblocage des succès (par catégorie)
- **shop** — achats (améliorations, entités), effets, et dirty-check du DOM
- **clear-grid** — réinitialisation des grilles inventaire/succès (sans cloneNode, bornes = .length)
- **entities-shape** — constante des entités (pas de référence DOM morte, champs statiques conservés)
- **html-structure** — hygiène HTML (rien après la fermeture du body, script dans le body, pas d'id dupliqué)
- **listeners** — enregistrement correct des écouteurs (keydown au top level, tooltips câblés une seule fois)

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
