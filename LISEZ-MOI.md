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

## Éditeur de collage : garder les calques

**editeur.html** place chaque membre (position, taille, ordre) phase par phase. **Exporter les positions (JSON)** produit `saut-positions.json` sans fusionner les calques. Pour chaque phase et chaque membre, le fichier indique l’image à utiliser (dans `assets/jump/poses`), le coin haut-gauche `x, y`, la taille affichée `largeur, hauteur`, l’`echelle` et l’ordre `z` (0 = derrière). Les coordonnées sont celles d’un canevas commun de 1600 × 1700, identique pour toutes les phases. `brasDevant` décrit la copie du torse limitée aux bras, dessinée tout devant pendant la chute. **Importer…** relit ce fichier. L’export PNG aplati reste disponible dans un menu replié.

**Image de référence** : affiche un sprite fini en transparence, derrière ou devant les membres, pour les placer contre lui. On choisit le personnage original ou n’importe quelle image ; **Caler sur le personnage** l’ajuste à la hauteur et aux pieds du personnage. Elle peut être la même pour toutes les phases ou différente pour chacune. Elle n’est jamais exportée.

## Retoucher un calque (Pixelorama ou autre)

**Avec le bouton** : double-cliquer une fois sur **installer-pixelorama.bat** (il trouve Pixelorama ou demande où il est). Ensuite, dans l’éditeur, **✏️ Modifier dans Pixelorama** ouvre le dessin du membre choisi. Chaque fois que le PNG est réenregistré au même endroit, les images sont mises à jour ; en revenant dans l’éditeur, il les recharge seul. Le lien n’ouvre que les PNG de `assets/jump/poses`. Pour le retirer : `powershell -ExecutionPolicy Bypass -File toolspixeloramainstaller.ps1 -Remove`.

**À la main** :

1. Ouvrir le PNG du membre dans `assets/jump/poses/<membre>/<phase>.png`, le retoucher, l’enregistrer au même endroit, en PNG.
2. Double-cliquer sur **mettre-a-jour-images.bat**, puis recharger l’éditeur avec **Ctrl + F5**.

Les pages lisent les images dans `assets/jump/bundle.js`, pas directement dans les PNG : sans l’étape 2, la retouche n’apparaît pas. Si la toile a été agrandie vers la gauche ou le haut, recaler le membre dans l’éditeur. `tools/build-jump.cjs` régénère toutes les poses depuis les planches et efface les retouches : il refuse de le faire sans `--force`.
