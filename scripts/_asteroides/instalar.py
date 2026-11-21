# Installs his choices (20/11): the six asteroids and the two miner rocks, each cropped to its content (the hitbox is
# derived from the frame, and the PixelLab canvas padding would inflate it); the old ones backed up in assets/raw.
# Prints the drone's set-in offset (its centre from the rock's centre, the mining frame facing left) for each rock.
import shutil, sys
from pathlib import Path
from PIL import Image

here = Path(__file__).parent
proj = Path(sys.argv[1])
SP = proj / 'public' / 'sprites'
BK = proj / 'assets' / 'raw' / 'asteroides-antigos'
BK.mkdir(parents=True, exist_ok=True)
for n in ('asteroid', 'asteroid-2', 'asteroid-3', 'elite-rocha'):
    if not (BK / f'{n}.png').exists():
        shutil.copy(SP / f'{n}.png', BK / f'{n}.png')

def recortar(src, dst):
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getbbox())
    im.save(dst)
    return im

ASTEROIDES = [('peq/28.png', 'asteroid'), ('peq/49.png', 'asteroid-2'), ('peq/61.png', 'asteroid-3'),
              ('med/04.png', 'asteroid-4'), ('med/17.png', 'asteroid-5'), ('gra/05-tom.png', 'asteroid-6')]
for src, dst in ASTEROIDES:
    im = recortar(here / src, SP / f'{dst}.png')
    print(dst, im.size)

drone = Image.open(SP / 'elite-drone-minerar-0.png')
dw, dh = drone.size
Q = proj / 'docs/superpowers/folhas/2026-11-20/asteroides/q'
for src, dst in (('mg-r2-0.png', 'elite-rocha'), ('mg-g1-0.png', 'elite-rocha-2')):
    im = Image.open(Q / src).convert('RGBA')
    im = im.crop(im.getbbox())
    im.save(SP / f'{dst}.png')
    px = im.load()
    pts = [(x, y) for y in range(im.height) for x in range(im.width) if px[x, y][3] and px[x, y][0] > px[x, y][2] + 60]
    ax = sum(p[0] for p in pts) / len(pts)
    ay = sum(p[1] for p in pts) / len(pts)
    # the mock's placement: drone top-left at (ax - 0.35 dw, ay - 0.85 dh) from the rock's top-left
    cx = ax - 0.35 * dw + dw / 2 - im.width / 2
    cy = ay - 0.85 * dh + dh / 2 - im.height / 2
    print(dst, im.size, 'amber', round(ax, 1), round(ay, 1), 'ENCAIXE', round(cx), round(cy))
