"""25/11, the Beast's step 4 (the new art, E-7-1, in the engine): builds one sprite sheet per CHOSEN clip (his picks in
docs/superpowers/folhas/2026-11-24/besta-bio/passo3b.html) and MEASURES every frame, so the engine reads the body from
the art instead of fixed rectangles (spec 2026-11-24 §6):
  - `core`: the centre of the glowing core (the largest orange blob; frames where the whole body lights up are
    interpolated from their neighbours);
  - `massa`: the torso + head box (the opaque mask eroded by 5 px, its largest piece, grown back) — it holds bullets;
  - `inteiro`: the whole opaque box (claws included) — the body that wounds when she attacks;
  - `garras`: up to 2 boxes of the thin bone-coloured parts (the claws), the hazards of the attack frames.
Boxes are in frame px (256²). Writes public/sprites/besta/<name>.png and src/entities/besta/quadros.ts.

usage (repo root): python scripts/_f4/besta_folhas.py"""
import json, os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

BIO = 'docs/superpowers/folhas/2026-11-24/besta-bio/cru'
OUT = 'public/sprites/besta'
TS = 'src/entities/besta/quadros.ts'


def d(p): return os.path.join(BIO, p)


# name: (source dir, frames | None = all, extra). extra.solta = the index (in the SHEET) of the first frame after the
# painted ball left the claws: the engine throws its own ball there. Dropped frames are the painted ball/stream.
# extra.boca = where that ball is born (frame px): the FRONT claws in the release frame, marked by eye (25/11) — the
# painted stream is the arm's trail and runs back through her body, so it cannot be measured from the colour.
CLIPES = {
    'urro': (d('p3/urro2-b'), [i for i in range(17) if i not in (10, 11, 12, 13)], {}),   # 12 = a starburst, 13 = loose dots
    'pulo': (d('p3/pulo-b'), None, {}),
    'vira': (d('poses/frente-v3'), list(range(8, -1, -1)), {}),          # front -> side (frente-v3 played backwards)
    'andar': (d('p3/andar5-a'), list(range(1, 15)), {}),
    'quatro': (d('poses/quatro-2'), None, {}),                           # side -> all fours
    'galope': (d('p3/galope-a'), list(range(3, 13)), {}),
    'golpe': (d('p3/golpe-a'), None, {}),
    'lava': (d('p3/lava2-a'), [i for i in range(17) if i not in (11, 12)], {'solta': 11, 'boca': [40, 140]}),
    'rasgo': (d('p3/rasgoD-a'), None, {}),
    'salto-tras': (d('p3/salto-tras-a'), None, {}),
    'morte': (d('p3/morte-b'), None, {}),
    'agarra': (d('poses/teto-1'), None, {}),                             # side -> hanging by hand 1
    'teto-anda-a': (d('teto/troca-12-b'), None, {'passo': -48}),         # T1 -> T2, 48 px to the left
    'teto-anda-b': (d('teto/troca-21-b'), None, {'passo': -64}),         # T2 -> T1, 64 px to the left
    'teto-lava-1': (d('teto/lava-1-c'), [i for i in range(17) if i not in (12, 13, 14)], {'solta': 12, 'boca': [55, 158]}),
    'teto-lava-2': (d('teto/lava-2-b'), [i for i in range(17) if i not in (11, 12)], {'solta': 11, 'boca': [50, 145]}),
    # the signatures of the later steps (5–8): built now, used when their mechanics arrive
    'sede-abre': (d('p3/sede-abre3-a'), None, {}),
    'sede-devolve': (d('p3/sede-devolve-b'), None, {}),
    'coracao': (d('p3/coracao-a'), [i for i in range(17) if i != 13], {}),
    'rastejar': (d('p3/rastejar2L-a'), None, {}),
    'quina-chao-parede': (d('p3/quina-chao-parede-b'), None, {}),
    'quina-parede-teto': (d('p3/quina-parede-teto-b'), None, {}),
    'canto': (d('p3/canto-b'), None, {}),
    'parede-descola': (d('p3/sp-descola-a'), None, {}),
    'parede-agarra': (d('p3/sp-agarra-a'), None, {}),
    # 25/11, step 6 (the return along the walls): the CLIMB is the crawl turned 90° clockwise — head up, claws on the
    # left wall (the wall pose of the corners is exactly this, shifted (4, 56) px). The right wall is its mirror.
    'escalada': (d('p3/rastejar2L-a'), None, {'girar': 'cw'}),
}
# Where the TAIL is, so the wounding box can leave it out (it is visual only): to the right (she faces left, the default);
# on the walls it hangs DOWN. 'auto' = down where the frame is taller than wide (the wall poses), right elsewhere.
RABO = {'escalada': 'baixo', 'canto': 'baixo', 'quina-chao-parede': 'auto', 'quina-parede-teto': 'auto',
        'parede-descola': 'auto', 'parede-agarra': 'auto'}
# the still poses (one frame each)
POSES = {
    'lado': d('p3/E.png'),
    'frente': d('p3/F.png'),
    'quatro-pose': d('p3/Q.png'),
    'teto1': d('poses/teto-1/16.png'),
    'teto2': d('poses/teto-2/16.png'),
    'voo': d('p3/SP-voo.png'),
}


# 25/11, step 9 — THE RECOLOUR (his pick on `besta-bio/passo9.html`): 'A' = the art as generated (today); 'B' = bone and
# red darker; 'C' = B + the core/lava a little hotter, the graphite a touch darker. Applied to EVERY frame at build time
# (the same map as `besta_recolor.py`, where the candidates are judged).
COR = 'B'


def recolorir(im, modo=COR):
    if modo == 'A':
        return im
    a = np.asarray(im).astype(float)
    R, G, B, A = [a[..., k] for k in range(4)]
    op = A > 0
    quente = op & (R > 200) & (G > 80) & (B < 90)
    perto = np.asarray(Image.fromarray((quente * 255).astype('uint8')).filter(ImageFilter.MaxFilter(11))) > 0
    quente = quente | (op & perto & (R > 170))
    osso = op & ~quente & (R > 140) & (G > 120) & (B > 80) & (np.abs(R - G) < 70)
    vermelho = op & ~quente & ~osso & (R > G + 35) & (R > 80)
    rgb = a[..., :3]
    rgb[osso] *= 0.72
    rgb[vermelho] *= 0.68
    if modo == 'C':
        resto = op & ~quente & ~osso & ~vermelho
        rgb[resto] *= 0.9
        rgb[quente] = np.clip(rgb[quente] * 1.12 + 10, 0, 255)
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def quadros(src, sel):
    n = len([f for f in os.listdir(src) if f.endswith('.png') and f[:-4].isdigit()])
    sel = list(range(n)) if sel is None else sel
    return [Image.open(os.path.join(src, f'{i}.png')).convert('RGBA') for i in sel]


def caixa(m):
    ys, xs = np.nonzero(m)
    if not len(xs): return None
    return [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]


def maior(m):
    """The largest 4-connected piece of a boolean mask (flood fill, no scipy)."""
    h, w = m.shape
    vis = np.zeros_like(m)
    best, best_n = None, 0
    for y0, x0 in zip(*np.nonzero(m)):
        if vis[y0, x0]: continue
        pilha, pts = [(y0, x0)], []
        vis[y0, x0] = True
        while pilha:
            y, x = pilha.pop()
            pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not vis[yy, xx]:
                    vis[yy, xx] = True
                    pilha.append((yy, xx))
        if len(pts) > best_n:
            best_n, best = len(pts), pts
    out = np.zeros_like(m)
    if best:
        ys, xs = zip(*best)
        out[list(ys), list(xs)] = True
    return out, best_n


def pedacos(m, minimo):
    h, w = m.shape
    vis = np.zeros_like(m)
    out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if vis[y0, x0]: continue
        pilha, xs, ys = [(y0, x0)], [], []
        vis[y0, x0] = True
        while pilha:
            y, x = pilha.pop()
            xs.append(x); ys.append(y)
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not vis[yy, xx]:
                    vis[yy, xx] = True
                    pilha.append((yy, xx))
        if len(xs) >= minimo:
            out.append((len(xs), [int(min(xs)), int(min(ys)), int(max(xs) - min(xs) + 1), int(max(ys) - min(ys) + 1)]))
    out.sort(key=lambda p: -p[0])
    return [b for _, b in out]


def blobs(m, minimo):
    """[(area, cx, cy)] of the 4-connected pieces of a mask."""
    h, w = m.shape
    vis = np.zeros_like(m)
    out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if vis[y0, x0]: continue
        pilha, xs, ys = [(y0, x0)], [], []
        vis[y0, x0] = True
        while pilha:
            y, x = pilha.pop()
            xs.append(x); ys.append(y)
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not vis[yy, xx]:
                    vis[yy, xx] = True
                    pilha.append((yy, xx))
        if len(xs) >= minimo:
            out.append((len(xs), float(np.mean(xs)), float(np.mean(ys))))
    return out


def medir(im, rabo='direita'):
    a = np.asarray(im).astype(int)
    R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    op = A > 0
    quente = op & (R > 200) & (G > 80) & (B < 90)
    mask = Image.fromarray((op * 255).astype('uint8'))
    er = np.asarray(mask.filter(ImageFilter.MinFilter(11))) > 0
    tronco, _ = maior(er)
    tronco = np.asarray(Image.fromarray((tronco * 255).astype('uint8')).filter(ImageFilter.MaxFilter(11))) > 0
    massa = caixa(tronco & op) or caixa(op)
    osso = op & ~tronco & (R > 140) & (G > 120) & (B > 80) & (np.abs(R - G) < 70)
    garras = pedacos(osso, 14)[:2]
    # the tail is VISUAL ONLY (his call, until he decides): the wounding box stops a little right of the torso, where
    # the tail starts (she always faces left)
    corte = op.copy()
    if rabo == 'auto':
        bb = caixa(op)
        rabo = 'baixo' if bb and bb[3] > bb[2] else 'direita'
    if rabo == 'baixo':
        corte[min(255, massa[1] + massa[3] + 4):, :] = False
    else:
        corte[:, min(255, massa[0] + massa[2] + 4):] = False
    return dict(quentes=blobs(quente, 4), massa=massa, inteiro=caixa(corte) or caixa(op), garras=garras, op=op)


# 25/11, step 5: where the tracking jumps off the core (the thirst's frames turn the body and the torso box with it),
# a hint by eye; the nearest hot blob within 15 px of it is the core.
CORE_PERTO = {('sede-abre', 15): (125, 163), ('sede-devolve', 11): (125, 170), ('sede-devolve', 12): (122, 170)}


# 25/11, step 5: facing the ship with the arms spread wide (the thirst), the eroded torso swallows the arms and its box
# held the bullets far in front of the ring. Spec §6: arms and legs are hollow — there the body that holds bullets is
# the COLUMN of the torso and the head: ±24 px around the core, from the crown down to 45 px under the core.
TRONCO_COLUNA = {'sede-abre', 'sede-devolve'}


def coluna_do_tronco(m):
    cx, cy = int(round(m['core'][0])), int(round(m['core'][1]))
    faixa = m['op'][:, max(0, cx - 10):cx + 10].any(1)
    topo = int(np.argmax(faixa))
    m['massa'] = [cx - 24, topo, 48, cy + 45 - topo]


def escolher_core(ms, nome=''):
    """The core is TRACKED: frame 0 takes the biggest hot blob inside the torso box; each next frame PREDICTS the core
    by moving the last one with the torso box (the body travels inside the frame in the jump, the walk on the ceiling),
    then takes the hot blob nearest that prediction (a glob in the claws, the mouth or a lit body do not steal it).
    No blob within 30 px of the prediction = the prediction."""
    prev, prevc = None, None
    for i, m in enumerate(ms):
        bs = m.pop('quentes')
        x, y, w, h = m['massa']
        c = (x + w / 2, y + h / 2)
        if prev is None:
            dentro = [b for b in bs if x <= b[1] <= x + w and y <= b[2] <= y + h] or bs
            b = max(dentro, key=lambda b: b[0]) if dentro else None
            alvo = [b[1], b[2]] if b else [c[0], c[1]]
        else:
            alvo = [prev[0] + c[0] - prevc[0], prev[1] + c[1] - prevc[1]]
            perto = [b for b in bs if np.hypot(b[1] - alvo[0], b[2] - alvo[1]) < 30 and b[0] < 900]
            b = min(perto, key=lambda b: np.hypot(b[1] - alvo[0], b[2] - alvo[1])) if perto else None
        if (nome, i) in CORE_PERTO:
            alvo = list(CORE_PERTO[(nome, i)])
            perto = [b for b in bs if np.hypot(b[1] - alvo[0], b[2] - alvo[1]) < 15]
            b = min(perto, key=lambda b: np.hypot(b[1] - alvo[0], b[2] - alvo[1])) if perto else None
        prev = [round(b[1], 1), round(b[2], 1)] if b else [round(alvo[0], 1), round(alvo[1], 1)]
        prevc = c
        m['core'] = prev


os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(TS), exist_ok=True)
tabela = {}
for nome, (src, sel, extra) in CLIPES.items():
    extra = dict(extra)
    fr = quadros(src, sel)
    if extra.pop('girar', None) == 'cw':
        fr = [q.transpose(Image.Transpose.ROTATE_270) for q in fr]
    folha = Image.new('RGBA', (256 * len(fr), 256))
    # the sheet is painted (`COR`); the measures below read the frame AS GENERATED, so the table never moves with the colour
    for i, q in enumerate(fr):
        folha.paste(recolorir(q), (i * 256, 0))
    folha.save(os.path.join(OUT, f'{nome}.png'), optimize=True)
    ms = [medir(q, RABO.get(nome, 'direita')) for q in fr]
    escolher_core(ms, nome)
    if nome in TRONCO_COLUNA:
        for m in ms:
            coluna_do_tronco(m)
    for m in ms:
        m.pop('op')
    e = dict(n=len(fr), core=[m['core'] for m in ms], massa=[m['massa'] for m in ms], inteiro=[m['inteiro'] for m in ms],
             garras=[m['garras'] for m in ms], **extra)
    tabela[nome] = e
    print(f'{nome:20s} {len(fr):2d} quadros', 'boca' if 'boca' in e else '')
for nome, p in POSES.items():
    im = Image.open(p).convert('RGBA')
    recolorir(im).save(os.path.join(OUT, f'{nome}.png'), optimize=True)
    m = medir(im)
    escolher_core([m])
    m.pop('op')
    tabela[nome] = dict(n=1, core=[m['core']], massa=[m['massa']], inteiro=[m['inteiro']], garras=[m['garras']])
    print(f'{nome:20s} pose')

cab = ('/**\n * GENERATED by `scripts/_f4/besta_folhas.py` (25/11, the Beast step 4) — do not edit by hand, run the script.\n'
       ' * Per frame, in px of the 256² frame: the core centre, the torso+head box (`massa`, holds bullets), the whole\n'
       ' * opaque box (`inteiro`, wounds in attacks), the claw boxes (`garras`, the hazards). `solta` = the sheet frame\n'
       ' * where the engine throws the ball (the painted one was cut), `boca` = where it is born; `passo` = how far the\n'
       ' * body travels inside a ceiling-walk clip (px, negative = left).\n */\n')
corpo = 'export type Caixa = [number, number, number, number];\n' \
        'export type QuadrosClipe = { n: number; core: ([number, number] | null)[]; massa: Caixa[]; inteiro: Caixa[]; ' \
        'garras: Caixa[][]; solta?: number; boca?: [number, number]; passo?: number };\n\n' \
        'export const QUADROS_BESTA: Record<string, QuadrosClipe> = ' + json.dumps(tabela, separators=(',', ':')) + ';\n'
with open(TS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(cab + corpo)
print('->', TS, os.path.getsize(TS), 'bytes')
