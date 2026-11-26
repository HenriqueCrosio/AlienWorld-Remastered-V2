"""25/11, the Beast's step 9 (spec 2026-11-24 §5 (3)-(4), §6 "Clara / garras pontilhadas"): the RECOLOUR candidates and the
CLAW test, judged at GAME SIZE on the real arena (memory `veredito-lado-a-lado-com-o-jogo`).

  colour  A = today's art · B = bone and red darker (the spec's map: lit only the core, the lava, the mouth)
          C = B + the core / lava a little hotter, the graphite a touch darker
  scale   N = how the game draws her today: 0.70 by NEAREST (pixelArt) — whole rows/columns of the frame are dropped,
              so a thin claw can break into dots
          R = baked down beforehand: area average to 0.70, alpha cut at 50 %, every pixel snapped back to the frame's
              own palette (stays pixel art, keeps the thin lines)

usage (repo root): python scripts/_f4/besta_recolor.py <arena dir (besta1.png, besta3.png)> <out dir>"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

FUNDO, OUT = sys.argv[1:3]
os.makedirs(OUT, exist_ok=True)
E = 0.7
SHEET = 'public/sprites/besta'
POSES = [('lado', 0), ('quatro-pose', 0), ('golpe', 9), ('teto1', 0), ('canto', 6), ('frente', 0)]
# where each pose sits in the arena (sprite centre, as the engine puts it)
ONDE = {'lado': (300, 103), 'quatro-pose': (300, 103), 'golpe': (150, 80), 'teto1': (322, 106), 'canto': (298, 103), 'frente': (300, 103)}


def quadro(nome, i):
    im = Image.open(os.path.join(SHEET, f'{nome}.png')).convert('RGBA')
    return im.crop((i * 256, 0, i * 256 + 256, 256))


def classes(a):
    R, G, B, A = [a[..., k].astype(int) for k in range(4)]
    op = A > 0
    quente = op & (R > 200) & (G > 80) & (B < 90)
    # the core's white-hot centre and the lava's highlights are light too: everything bright within 5 px of a hot pixel
    # belongs to the glow, not to the bone (it turned grey-blue when darkened as bone)
    perto = np.asarray(Image.fromarray((quente * 255).astype('uint8')).filter(ImageFilter.MaxFilter(11))) > 0
    quente = quente | (op & perto & (R > 170))
    osso = op & ~quente & (R > 140) & (G > 120) & (B > 80) & (np.abs(R - G) < 70)
    vermelho = op & ~quente & ~osso & (R > G + 35) & (R > 80)
    return quente, osso, vermelho


def recolorir(im, modo):
    if modo == 'A':
        return im
    a = np.asarray(im).astype(float)
    quente, osso, vermelho = classes(a.astype(int))
    rgb = a[..., :3]
    rgb[osso] *= 0.72
    rgb[vermelho] *= 0.68
    if modo == 'C':
        resto = (a[..., 3] > 0) & ~quente & ~osso & ~vermelho
        rgb[resto] *= 0.9
        h = rgb[quente]
        rgb[quente] = np.clip(h * 1.12 + 10, 0, 255)
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def reduzir(im, modo):
    w = round(256 * E)
    if modo == 'N':
        # the game: nearest, sampling the source at the centre of each output pixel
        src = np.asarray(im)
        idx = np.minimum(((np.arange(w) + 0.5) / E).astype(int), 255)
        return Image.fromarray(src[idx][:, idx], 'RGBA')
    # R: area average with premultiplied alpha, cut at 50 %, snapped to the frame's own palette
    a = np.asarray(im).astype(float) / 255
    pre = a.copy()
    pre[..., :3] *= pre[..., 3:4]
    peq = np.asarray(Image.fromarray((pre * 255).astype('uint8'), 'RGBA').resize((w, w), Image.BOX)).astype(float) / 255
    alfa = peq[..., 3]
    rgb = np.where(alfa[..., None] > 0, peq[..., :3] / np.maximum(alfa[..., None], 1e-6), 0)
    pal = np.unique(np.asarray(im)[np.asarray(im)[..., 3] > 0][:, :3], axis=0).astype(float) / 255
    flat = rgb.reshape(-1, 3)
    out = np.zeros((w * w, 4))
    vis = (alfa.reshape(-1) >= 0.5)
    if len(pal):
        for k in np.nonzero(vis)[0]:
            d = ((pal - flat[k]) ** 2).sum(1)
            out[k, :3] = pal[d.argmin()]
            out[k, 3] = 1
    return Image.fromarray((out.reshape(w, w, 4) * 255).astype('uint8'), 'RGBA')


def na_arena(fundo, spr, centro):
    f = fundo.copy().convert('RGBA')
    x = round(centro[0] - spr.width / 2)
    y = round(centro[1] - spr.height / 2)
    f.alpha_composite(spr, (x, y))
    return f.convert('RGB')


fundo = Image.open(os.path.join(FUNDO, 'besta1.png')).convert('RGBA').resize((384, 216))
cache = {}
for nome, i in POSES:
    for c in 'ABC':
        for m in 'NR':
            cache[(nome, c, m)] = reduzir(recolorir(quadro(nome, i), c), m)

# 1. each pose, the 6 candidates on the arena, cropped around her and zoomed ×3 (nearest, like the screen)
Z = 3
for nome, _ in POSES:
    cx, cy = ONDE[nome]
    caixa = (max(0, cx - 75), max(0, cy - 90), min(384, cx + 75), min(216, cy + 90))
    cw, ch = caixa[2] - caixa[0], caixa[3] - caixa[1]
    W = Image.new('RGB', (6 * cw * Z + 5 * 6, ch * Z), (14, 16, 21))
    for k, (c, m) in enumerate([(c, m) for c in 'ABC' for m in 'NR']):
        img = na_arena(fundo, cache[(nome, c, m)], ONDE[nome]).crop(caixa).resize((cw * Z, ch * Z), Image.NEAREST)
        W.paste(img, (k * (cw * Z + 6), 0))
    W.save(os.path.join(OUT, f'pose-{nome}.png'))

# 2. the claws close up: the right claw region of a few poses, ×6, N vs R (colour A) — does the line hold?
# boxes in the REDUCED frame (179 px): the front claws of each pose
garras = [('lado', (5, 118, 75, 179)), ('quatro-pose', (5, 112, 75, 179)), ('teto1', (40, 0, 110, 45))]
linhas = []
for nome, box in garras:
    par = [cache[(nome, 'A', 'N')].crop(box), cache[(nome, 'A', 'R')].crop(box)]
    bg = Image.new('RGBA', par[0].size, (40, 44, 56, 255))
    linhas.append([Image.alpha_composite(bg, p).convert('RGB').resize((p.width * 6, p.height * 6), Image.NEAREST) for p in par])
W = Image.new('RGB', (max(a.width + b.width + 12 for a, b in linhas), sum(a.height + 8 for a, _ in linhas)), (14, 16, 21))
y = 0
for a, b in linhas:
    W.paste(a, (0, y))
    W.paste(b, (a.width + 12, y))
    y += a.height + 8
W.save(os.path.join(OUT, 'garras.png'))

# 3. the whole arena at 1× (true size): A, B and C as the game draws them (N), two poses
for nome in ['lado', 'teto1', 'quatro-pose']:
    W = Image.new('RGB', (384 * 3 + 12, 216), (14, 16, 21))
    for k, (c, m) in enumerate([('A', 'N'), ('B', 'N'), ('C', 'N')]):
        W.paste(na_arena(fundo, cache[(nome, c, m)], ONDE[nome]), (k * (384 + 6), 0))
    W.save(os.path.join(OUT, f'arena-{nome}.png'))
print('ok')
