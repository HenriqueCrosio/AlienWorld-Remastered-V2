# The bigger miner rocks: tone-matched to today's asteroids (only the stone; the amber is not in that palette and stays),
# then a mock at the game's size: on the real F2 background, alone and with the mining drone set into its crack or
# crater (the drone's mining frame, facing left as in the game). Writes the PNGs into the sheet's folder.
import sys
from pathlib import Path
from PIL import Image

here = Path(__file__).parent
proj = Path(sys.argv[1])
out = proj / 'docs/superpowers/folhas/2026-11-20/asteroides/q'
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
ref = [Image.open(proj / f'public/sprites/{n}.png').convert('RGBA') for n in ('asteroid', 'asteroid-2', 'asteroid-3')]
pal = sorted({p[:3] for im in ref for p in im.getdata() if p[3] > 0}, key=lum)
rank = {c: i for i, c in enumerate(pal)}
alvo = sum(rank[p[:3]] for im in ref for p in im.getdata() if p[3] > 0) / sum(1 for im in ref for p in im.getdata() if p[3] > 0)

def tom(im):
    pts = [rank[p[:3]] for p in im.getdata() if p[3] > 0 and p[:3] in rank]
    delta = round(alvo - sum(pts) / len(pts))
    o = im.copy(); px = o.load()
    for y in range(o.height):
        for x in range(o.width):
            p = px[x, y]
            if p[3] and p[:3] in rank and rank[p[:3]] > 2:
                px[x, y] = pal[min(len(pal) - 1, max(3, rank[p[:3]] + delta))] + (p[3],)
    return o

def ambar(im):
    """the centre of the amber (its warm pixels): where the drone works"""
    px = im.load()
    pts = [(x, y) for y in range(im.height) for x in range(im.width) if px[x, y][3] and px[x, y][0] > px[x, y][2] + 60]
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)

fundo = Image.open(proj / 'docs/superpowers/folhas/2026-11-20/sonda/fundo-f2.jpg').convert('RGBA').resize((384, 216), Image.NEAREST)
drone = Image.open(proj / 'public/sprites/elite-drone-minerar-0.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
ESCOLHIDOS = ['r2-0', 'r2-5', 'r4-0', 'r4-2', 'r4-3', 'r4-7', 'g1-0', 'g1-2', 'g1-4', 'g1-7']
for nome in ESCOLHIDOS:
    im = tom(Image.open(here / f'{nome}.png').convert('RGBA'))
    b = im.getbbox()
    im = im.crop(b)
    im.save(out / f'mg-{nome}.png')
    ax, ay = ambar(im)
    for comDrone in (False, True):
        cel = fundo.crop((96, 60, 192, 156)).copy()
        ox, oy = (96 - im.width) // 2, (96 - im.height) // 2 + 6
        cel.alpha_composite(im, (ox, oy))
        if comDrone:
            # the drone's drill tip over the amber: the drone sits just above it, a little to the right (it faces left)
            cel.alpha_composite(drone, (round(ox + ax - drone.width * 0.35), round(oy + ay - drone.height * 0.85)))
        cel.save(out / f'mg-{nome}-{"drone" if comDrone else "so"}.png')
    print(nome, im.size)
