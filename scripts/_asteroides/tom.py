# TONE MATCH: each candidate's pixels moved down the current asteroids' palette (sorted by luminance) so its mean tone
# matches today's asteroids — the colours stay those of the family, the shape untouched; the darkest (the outline)
# never moves. Writes <grupo>/<i>-tom.png and the comparison sheet (before / after on the F2 background).
import sys
from pathlib import Path
from PIL import Image, ImageDraw

here = Path(__file__).parent
proj = Path(sys.argv[1])
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
ref = [Image.open(proj / f'public/sprites/{n}.png').convert('RGBA') for n in ('asteroid', 'asteroid-2', 'asteroid-3')]
pal = sorted({p[:3] for im in ref for p in im.getdata() if p[3] > 0}, key=lum)
rank = {c: i for i, c in enumerate(pal)}
media = lambda ims: sum(rank.get(p[:3], 0) for im in ims for p in im.getdata() if p[3] > 0) / max(1, sum(1 for im in ims for p in im.getdata() if p[3] > 0))
alvo = media(ref)

def ajustar(im):
    pts = [p for p in im.getdata() if p[3] > 0]
    m = sum(rank.get(p[:3], 0) for p in pts) / len(pts)
    delta = round(alvo - m)
    out = im.copy()
    px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] == 0 or p[:3] not in rank:
                continue
            r = rank[p[:3]]
            if r <= 2:  # the outline stays
                continue
            nr = min(len(pal) - 1, max(3, r + delta))
            px[x, y] = pal[nr] + (p[3],)
    return out, delta

ITENS = [('gra', i) for i in (0, 1, 5, 14, 22, 24)] + [('min', i) for i in (4, 11, 13, 15, 12, 8)]
fundo = Image.open(proj / 'docs/superpowers/folhas/2026-11-20/sonda/fundo-f2.jpg').convert('RGBA')
K, CEL = 3, 180
folha = Image.new('RGBA', (6 * (CEL + 8) + 8, 4 * (CEL + 24) + 8), (10, 12, 18, 255))
d = ImageDraw.Draw(folha)
for n, (g, i) in enumerate(ITENS):
    im = Image.open(here / g / f'{i:02d}.png').convert('RGBA')
    aj, delta = ajustar(im)
    aj.save(here / g / f'{i:02d}-tom.png')
    for k, (v, rot) in enumerate([(im, f'{g} {i}'), (aj, f'{g} {i} · tom ({delta:+d})')]):
        linha = (n // 6) * 2 + k
        x0, y0 = 8 + (n % 6) * (CEL + 8), 8 + linha * (CEL + 24)
        cel = fundo.crop((240 + (n % 6) * 130, 140 + linha * 40, 240 + (n % 6) * 130 + CEL, 140 + linha * 40 + CEL)).copy()
        gg = v.resize((v.width * K, v.height * K), Image.NEAREST)
        cel.alpha_composite(gg, ((CEL - gg.width) // 2, (CEL - gg.height) // 2))
        folha.alpha_composite(cel, (x0, y0 + 16))
        d.text((x0 + 2, y0), rot, fill=(255, 170, 90, 255) if k else (220, 220, 230, 255))
folha.save(here / 'tom.png')
print('alvo', round(alvo, 1), folha.size)
