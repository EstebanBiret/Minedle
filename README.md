# 🪨 Minedle

![Tests](https://github.com/EstebanBiret/Minedle/actions/workflows/tests.yml/badge.svg)

Un *idle game* dans l'univers de Minecraft, inspiré de Cookie Clicker. Mine des blocs à la main, recrute des entités qui minent pour toi, gravis les paliers de minerai, débloque des succès et attrape des pommes d'or pour des bonus temporaires.

🔗 **[Jouer](https://minedle.biret-toscano.fr)**

## ✨ Fonctionnalités

- ⛏️ **Minage manuel et production automatique** — clique pour miner, puis laisse 10 catégories d'entités (Villageois, Poulet, Zombie, Wither…) produire à ta place
- 📈 **Progression par paliers** — le bloc évolue de la pierre au diamant au fil de tes blocs minés
- 🛒 **Boutique d'améliorations** — multiplie ta production, tes clics et la fréquence des pommes d'or
- 🍎 **Pommes d'or** — apparitions aléatoires offrant des bonus temporaires (méga-clic, multiplicateur global)
- 🏆 **30 succès** à débloquer
- 📊 **Statistiques détaillées** — blocs totaux, part minée à la main, temps de jeu, pommes attrapées…
- 💤 **Gains hors-ligne** — tes entités continuent de miner pendant ton absence
- 🎵 **Musique d'ambiance** avec contrôle du volume et barre de progression
- 💾 **Sauvegarde locale automatique** + import/export de fichier (avec somme de contrôle)
- 📱 **Interface responsive** et accessible au clavier, avec tooltips tactiles sur mobile

## 🛠️ Technologies

HTML, CSS et JavaScript *vanilla* (modules ES, sans framework ni dépendance d'exécution).

## 🧪 Tests

Une suite de tests automatisés (lancée à chaque push par GitHub Actions) couvre la sauvegarde, le formatage des nombres, les boucles de jeu, les gains hors-ligne, les pommes d'or et la robustesse. Voir [`tests/`](tests/).

```
node tests/run-all.mjs
```

## 🙏 Crédits

- Gameplay inspiré de **Cookie Clicker**
- Direction artistique dans l'esprit de **Minecraft** (textures, police)
- Développé par [EstebanBiret](https://github.com/EstebanBiret)
