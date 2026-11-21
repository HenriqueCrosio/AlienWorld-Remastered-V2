# The amber crystal shortlist: each finalist on a crop of the real F3 background at the game's size x3 (the screen),
# and the same at x6 underneath to judge the pixels; two of today's asteroids for scale.
import sys
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
S, proj = sys.argv[1], sys.argv[2]
fundo = Image.open(f'{S}/fundo-f3.png').convert('RGBA')
PEQ = [2, 12, 17, 19, 31, 38, 45, 47]
MED = [2, 5, 9, 10, 13, 15, 17, 18]
LINHAS = [
    ('HOJE (para a escala): asteroid 24 px · asteroid-4 26 px · asteroid-6 32 px', [(n, f'{proj}/public/sprites/{n}.png') for n in ('asteroid', 'asteroid-4', 'asteroid-6')]),
    ('PEQUENOS (~22 px)', [(f'P{i}', f'{S}/peq2/{i}.png') for i in PEQ]),
    ('MÉDIOS (~28 px)', [(f'M{i}', f'{S}/med/{i}.png') for i in MED]),
]
CEL, K = 132, 3
folha = Image.new('RGBA', (8 * (CEL + 6) + 8, 8 + len(LINHAS) * (CEL * 2 + 44)), (10, 12, 18, 255))
d = ImageDraw.Draw(folha)
for j, (tit, itens) in enumerate(LINHAS):
    y0 = 8 + j * (CEL * 2 + 44)
    d.text((8, y0), tit, fill=(255, 170, 90, 255), font=F)
    for i, (rot, f) in enumerate(itens):
        x0 = 8 + i * (CEL + 6)
        im = Image.open(f).convert('RGBA')
        im = im.crop(im.getbbox())
        cel = fundo.crop((300 + i * 90, 300 + j * 40, 300 + i * 90 + CEL, 300 + j * 40 + CEL)).copy()
        g = im.resize((im.width * K, im.height * K), Image.NEAREST)
        cel.alpha_composite(g, ((CEL - g.width) // 2, (CEL - g.height) // 2))
        folha.alpha_composite(cel, (x0, y0 + 16))
        z = Image.new('RGBA', (CEL, CEL), (16, 18, 28, 255))
        g6 = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
        z.alpha_composite(g6, ((CEL - g6.width) // 2, (CEL - g6.height) // 2))
        folha.alpha_composite(z, (x0, y0 + 20 + CEL))
        d.text((x0 + 4, y0 + 18), f'{rot}  {im.width}x{im.height}', fill=(235, 235, 240, 255), font=F)
folha.save(f'{S}/folha-ambar.png')
print(folha.size)
