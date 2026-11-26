"""25/11: draws the per-frame measures of src/entities/besta/quadros.ts over the sheets (core = cyan cross, massa =
green, inteiro = grey, garras = red) so they can be checked by eye. usage: python scripts/_f4/besta_conferir.py <out.png> name:frame..."""
import json, re, sys
from PIL import Image, ImageDraw
txt = open('src/entities/besta/quadros.ts', encoding='utf-8').read()
T = json.loads(re.search(r'QUADROS_BESTA: Record<string, QuadrosClipe> = (\{.*\});', txt, re.S).group(1))
pares = [a.split(':') for a in sys.argv[2:]]
g = Image.new('RGBA', (256 * len(pares), 256), (60, 64, 76, 255))
for k, (n, i) in enumerate(pares):
    i = int(i)
    fol = Image.open(f'public/sprites/besta/{n}.png').convert('RGBA')
    g.alpha_composite(fol.crop((i * 256, 0, i * 256 + 256, 256)), (k * 256, 0))
    d = ImageDraw.Draw(g)
    e = T[n]
    ox = k * 256
    r = lambda b, c: d.rectangle((ox + b[0], b[1], ox + b[0] + b[2] - 1, b[1] + b[3] - 1), outline=c)
    r(e['inteiro'][i], (150, 150, 150, 255))
    r(e['massa'][i], (60, 230, 90, 255))
    for b in e['garras'][i]: r(b, (255, 60, 60, 255))
    c = e['core'][i]
    if c: d.line((ox + c[0] - 6, c[1], ox + c[0] + 6, c[1]), fill=(0, 255, 255, 255)); d.line((ox + c[0], c[1] - 6, ox + c[0], c[1] + 6), fill=(0, 255, 255, 255))
    if 'boca' in e and i == e['solta'] - 1: d.ellipse((ox + e['boca'][0] - 4, e['boca'][1] - 4, ox + e['boca'][0] + 4, e['boca'][1] + 4), outline=(255, 255, 0, 255))
    d.text((ox + 3, 3), f'{n} {i}', fill=(255, 255, 120, 255))
g.convert('RGB').save(sys.argv[1])
