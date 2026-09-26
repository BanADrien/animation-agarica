"""Builds assets/<dossier>/manifest.json and bundle.js for an animation drawn as separate layer PNGs.

    python tools/build-poses.py            (idle and attack)
    python tools/build-poses.py idle

Reads assets/<dossier>/poses/<calque>/<prefix>-01.png ... Each drawing is placed on the 1600 x 1700 canvas of the
jump (same ground point), using PLACEMENT below: an alignment point and a size per layer, chosen against the original
character (image.png). assets/<dossier>/collage-data.js holds the editor settings: it is created only when missing,
so rebuilding after retouching a PNG keeps what was set in editeur.html.
Needs Pillow (pip install pillow).
"""
import base64, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['cape', 'lower', 'torso', 'head', 'eyes', 'hair']
WIDTH, HEIGHT = 1600, 1700
# Where each layer goes: 'align' is the point of the drawing put on 'at' (canvas pixels), 'scale' its size.
# top / bottom = middle of that edge, centre = middle of the drawing. The anchor is where another animation attaches.
PLACEMENT = {
    'idle': {
        'cape':  {'align': 'top',    'at': (600, 880),  'scale': 0.95},
        'lower': {'align': 'bottom', 'at': (885, 1462), 'scale': 1.14},
        'torso': {'align': 'top',    'at': (895, 780),  'scale': 0.80},
        'head':  {'align': 'centre', 'at': (905, 630),  'scale': 0.92},
        'eyes':  {'align': 'centre', 'at': (905, 668),  'scale': 0.74},
        'hair':  {'align': 'top',    'at': (850, 405),  'scale': 1.22},
    },
    'attack': {
        'cape':  {'align': 'top',    'at': (600, 880),  'scale': 0.95},
        'lower': {'align': 'bottom', 'at': (885, 1462), 'scale': 1.14},
        'torso': {'align': 'top',    'at': (895, 780),  'scale': 0.80},
        'head':  {'align': 'centre', 'at': (905, 630),  'scale': 0.84},
        'eyes':  {'align': 'centre', 'at': (905, 668),  'scale': 0.86},
        'hair':  {'align': 'top',    'at': (850, 405),  'scale': 1.22},
    },
}
ANIMATIONS = {
    'idle':   {'id': 'idle',    'label': 'Idle',    'prefix': 'idle',   'labels': ['Image 1', 'Image 2', 'Image 3', 'Image 4'],
               'timing': [[0, .30], [1, .30], [2, .30], [3, .30]], 'loop': True},
    'attack': {'id': 'attaque', 'label': 'Attaque', 'prefix': 'attack', 'labels': ['Préparation', 'Frappe', 'Suite', 'Retour'],
               'timing': [[0, .16], [1, .10], [2, .18], [3, .20]], 'loop': False},
}
ANCHOR = {'cape': 'top', 'lower': 'top', 'torso': 'top', 'head': 'bottom', 'eyes': 'centre', 'hair': 'top'}


def point(kind, x, y, w, h):
    return (x + w / 2, y if kind == 'top' else y + h if kind == 'bottom' else y + h / 2)


def build(folder):
    a, place = ANIMATIONS[folder], PLACEMENT[folder]
    base = f'assets/{folder}'
    frames, images, collage_layers = {}, {}, {}
    for n in ORDER:
        p, frames[n] = place[n], []
        for i in range(len(a['labels'])):
            file = f"{base}/poses/{n}/{a['prefix']}-{i + 1:02d}.png"
            w, h = Image.open(os.path.join(ROOT, file)).size
            s = p['scale']
            # Box at size 1 with the same centre as the placed drawing: the editor scales around the centre.
            ax, ay = point(p['align'], 0, 0, w * s, h * s)
            cx, cy = p['at'][0] - ax + w * s / 2, p['at'][1] - ay + h * s / 2
            x, y = cx - w / 2, cy - h / 2
            kx, ky = point(ANCHOR[n], x, y, w, h)
            frames[n].append({'file': file, 'x': round(x, 2), 'y': round(y, 2), 'w': w, 'h': h,
                              'anchor': [round(kx, 2), round(ky, 2)]})
            with open(os.path.join(ROOT, file), 'rb') as f:
                images[file] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode()
    manifest = {'version': 1, 'animation': a['id'], 'label': a['label'], 'width': WIDTH, 'height': HEIGHT,
                'sourceOffset': [160, 320], 'order': ORDER,
                'phases': [{'id': f"{a['prefix']}-{i + 1:02d}", 'label': l} for i, l in enumerate(a['labels'])],
                'timing': a['timing'], 'loop': a['loop'], 'frames': frames, 'frontArmRegions': [],
                'notes': 'Built by tools/build-poses.py from the separate layer PNGs; placement in PLACEMENT.'}
    with open(os.path.join(ROOT, base, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, base, 'bundle.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.ANIM_ASSETS=window.ANIM_ASSETS||{};window.ANIM_ASSETS[' + json.dumps(a['id']) + ']='
                + json.dumps({'manifest': manifest, 'images': images}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    data = os.path.join(ROOT, base, 'collage-data.js')
    if not os.path.exists(data):
        collage = {'version': 2, 'linkScale': {n: True for n in ORDER},
                   'phases': [{'order': ORDER, 'frontArms': False,
                               'layers': {n: {'src': i, 'dx': 0, 'dy': 0, 'scale': place[n]['scale'], 'visible': True} for n in ORDER}}
                              for i in range(len(a['labels']))]}
        with open(data, 'w', encoding='utf-8', newline='\n') as f:
            f.write(f"// Collage de l'animation « {a['label']} », créé avec editeur.html.\n"
                    f"window.COLLAGES=window.COLLAGES||{{}};window.COLLAGES[{json.dumps(a['id'])}]="
                    + json.dumps(collage, ensure_ascii=False, indent=1) + ';\n')
    print(f"{base}: {len(images)} images")


for folder in sys.argv[1:] or list(ANIMATIONS):
    build(folder)
