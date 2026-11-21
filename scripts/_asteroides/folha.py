# The shortlist sheet: each finalist on a crop of the real F2 background, at the game's size ×3 (the screen) — the
# way it will be seen — and the three of today for comparison. Numbers are the candidates' indexes.
import sys
from pathlib import Path
from PIL import Image, ImageDraw

here = Path(__file__).parent
proj = Path(sys.argv[1])
fundo = Image.open(proj / 'docs/superpowers/folhas/2026-11-20/sonda/fundo-f2.jpg').convert('RGBA')  # 1152x648 = ×3
K = 3
LINHAS = [
    ('hoje (26 px, ampliados até ×1,9 no jogo)', [('asteroid', proj / 'public/sprites/asteroid.png'), ('asteroid-2', proj / 'public/sprites/asteroid-2.png'), ('asteroid-3', proj / 'public/sprites/asteroid-3.png'), ('hoje ×1,9', 'x19')]),
    ('PEQUENOS · 26 px', [(f'peq {i}', here / 'peq' / f'{i:02d}.png') for i in (28, 46, 49, 61, 22, 52)]),
    ('MÉDIOS · 38 px', [(f'med {i}', here / 'med' / f'{i:02d}.png') for i in (4, 15, 17, 11, 14, 1)]),
    ('GRANDES · 48 px (a variação maior)', [(f'gra {i}', here / 'gra' / f'{i:02d}.png') for i in (0, 1, 5, 14, 22, 24)]),
    ('MINERADOR · 52 px (a rachadura no topo)', [(f'min {i}', here / 'min' / f'{i:02d}.png') for i in (4, 11, 13, 15, 12, 8)]),
]
CEL = 180
folha = Image.new('RGBA', (6 * (CEL + 8) + 8, len(LINHAS) * (CEL + 40) + 8), (10, 12, 18, 255))
d = ImageDraw.Draw(folha)
for j, (titulo, itens) in enumerate(LINHAS):
    y0 = 8 + j * (CEL + 40)
    d.text((8, y0), titulo, fill=(255, 170, 90, 255))
    for i, (rot, f) in enumerate(itens):
        x0 = 8 + i * (CEL + 8)
        cel = fundo.crop((200 + i * 140, 120 + j * 60, 200 + i * 140 + CEL, 120 + j * 60 + CEL)).copy()
        if f == 'x19':
            im = Image.open(proj / 'public/sprites/asteroid-2.png').convert('RGBA')
            im = im.resize((round(26 * 1.9), round(26 * 1.9)), Image.NEAREST)
        else:
            im = Image.open(f).convert('RGBA')
        g = im.resize((im.width * K, im.height * K), Image.NEAREST)
        cel.alpha_composite(g, ((CEL - g.width) // 2, (CEL - g.height) // 2))
        folha.alpha_composite(cel, (x0, y0 + 16))
        d.text((x0 + 4, y0 + 18), rot, fill=(235, 235, 240, 255))
folha.save(here / 'finalistas.png')
print(folha.size)
