# Tests

123 tests automatisés répartis en 9 suites : sauvegarde (export/import/validation), musique d'ambiance, boucles de jeu, formatage des nombres, fond dynamique, pommes d'or, robustesse (localStorage corrompu, multi-onglets), gains hors-ligne et tooltips tactiles.

## Lancer en local

```
node tests/run-all.mjs
```

(Node 18 ou plus, aucune dépendance.)

## Comment ça marche

Chaque suite extrait le **vrai code** de `index.js` en se repérant sur des commentaires-marqueurs (par exemple `// ambient music`, `// offline gains`, `function spawnGoldenApple`), puis l'exécute dans un environnement simulé (DOM, localStorage, Audio, timers, BroadcastChannel...). Aucune copie de code dans les tests : ils valident toujours le fichier réel.

Conséquence : si un commentaire-marqueur est renommé ou supprimé dans `index.js`, la suite correspondante échouera avec un message clair — il suffit alors d'ajuster le marqueur dans le test.
