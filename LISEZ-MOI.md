# Personnage — animations par poses, version 3

Double-cliquer sur **index.html**. Si une ancienne version est ouverte, faire **Ctrl + F5**. Aucune installation ni serveur nécessaire. Les images embarquées dans `assets/bundle.js` permettent aussi l’export depuis une page locale.

## Ce qui est livré

- **Six couches PNG originales** dans `assets/base` : cape, bas du corps, torse avec bras, tête, yeux, cheveux. Elles ont toutes un canevas de 1278 × 1231 et la même origine. Les superposer à (0, 0), dans l’ordre du manifeste, restitue l’image originale. Les zones cachées de ces découpes ne contiennent pas encore de dessin.
- **Six planches de quatre poses générées** dans `assets/*-sheet.png`, soit 24 dessins : marche et saut, anticipation/frappe/retour, cheveux, cape, tête et expressions.
- **24 PNG recalés** dans `assets/poses` sur le même canevas que l’original, avec transparence. Les halos semi-transparents des générations sont exclus lors de l’extraction. Le torse est recoupé à la taille pour éviter de doubler la ceinture du bas du corps.
- `assets/manifest.json` indique l’ordre, les chemins, dimensions et limites visibles des pièces.
- `assets/generation-prompts.json` conserve les consignes exactes données à l’outil intégré **imagegen**, ainsi que la tentative de correction du halo qui a échoué.

## Utilisation

**Repos** utilise les pièces originales. **Idle** joue les variantes de cheveux et de cape. **Marche** joue le cycle du bas du corps et les variantes de cape/cheveux. **Saut** utilise la pose jambes repliées pendant le déplacement vertical du personnage entier. **Attaque** joue une séquence indépendante sur le torse et les bras. La frappe ne remet pas à zéro la marche. Les yeux ont leur propre séquence de clignotement et leurs expressions.

Les menus des couches permettent d’afficher individuellement chaque pose. Les variantes de tête sont accessibles manuellement : la lecture automatique conserve principalement le visage original pour limiter les changements d’identité. Un morceau du dessin de tête généré complète le front quand une nouvelle frange dévoile une zone absente de la découpe.

**Pause** et **Image suivante** servent à examiner les transitions. **Vue éclatée** montre les pièces séparées. **Comparer à l’original** affiche les six couches originales, même pendant la lecture. **Réinitialiser** rétablit la pose originale et les six couches. **Exporter cette pose** produit un PNG transparent de l’assemblage actuel.

## Limites à connaître

Il s’agit d’un prototype de sprites superposés, avec des poses dessinées, sans rotations des pièces ni déformation de maillage. Le passage entre poses est discret, adapté au pixel art, sans fondu transparent. Il n’y a pas encore de fichiers d’animation spécifiques à Godot/Unity/Spine.

La fidélité exacte est vérifiée pour la pose originale. Les dessins générés présentent des différences de contour, de proportions et de détails ; les raccords de la taille, du cou, des cheveux et des expressions peuvent encore demander une retouche artistique. Les pas sont une courte boucle de quatre images et le saut une pose dédiée, pas une animation exhaustive. Une seule vue trois-quarts est fournie.

## Vérifications et reconstruction

`node tools/build-assets.cjs` réextrait et recale les pièces à partir de `image.png` et des planches. `node tools/check-demo.cjs` ouvre Chrome sans fenêtre, contrôle la fidélité du repos et l’indépendance marche/attaque, puis produit les captures dans `previews`. Il nécessite Chrome à son emplacement Windows standard.

Le contrôle compare les pixels après décodage dans le navigateur : **0 canal différent** entre l’image source et les six couches recomposées. Résultats : `previews/verification.json`.

L’ancien `personnage-atlas.png` est conservé mais n’est plus utilisé par la démo.
