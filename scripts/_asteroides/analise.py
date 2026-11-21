# The asteroids as the game draws them: each variant at its native size and at the max scale (1.9), at a few spin
# angles — nearest sampling of a scaled, rotated sprite (Phaser's pixelArt) — on the F2's background tone; plus the
# miner's rock at its 1.0. Everything ×4 for the eye.
import sys
from pathlib import Path
from PIL import Image, ImageDraw

proj = Path(sys.argv[1])
out = Path(sys.argv[2])
SP = proj / 'public' / 'sprites'
Z = 4
FUNDO = (18, 22, 34, 255)

def desenhar(im, escala, graus):
    """nearest-sample the sprite scaled and rotated, like the GPU does with pixelArt"""
    w, h = round(im.width * escala), round(im.height * escala)
    g = im.resize((w, h), Image.NEAREST).rotate(graus, resample=Image.NEAREST, expand=True)
    return g

linhas = []
for nome in ['asteroid', 'asteroid-2', 'asteroid-3']:
    im = Image.open(SP / f'{nome}.png').convert('RGBA')
    cel = [(f'{nome} ×1', desenhar(im, 1, 0))]
    for g in (0, 25, 50):
        cel.append((f'×1,9 · {g}°', desenhar(im, 1.9, g)))
    linhas.append(cel)
rocha = Image.open(SP / 'elite-rocha.png').convert('RGBA')
linhas.append([('elite-rocha (o minerador) ×1', rocha)])

CW = 90 * Z
CH = 90 * Z
folha = Image.new('RGBA', (4 * (CW + 12) + 12, len(linhas) * (CH + 30) + 12), (10, 12, 18, 255))
d = ImageDraw.Draw(folha)
for j, cel in enumerate(linhas):
    for i, (rot, im) in enumerate(cel):
        x0, y0 = 12 + i * (CW + 12), 12 + j * (CH + 30)
        caixa = Image.new('RGBA', (CW, CH), FUNDO)
        g = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
        caixa.alpha_composite(g, ((CW - g.width) // 2, (CH - g.height) // 2))
        folha.alpha_composite(caixa, (x0, y0 + 18))
        d.text((x0, y0), rot, fill=(210, 214, 224, 255))
folha.save(out)
print(folha.size)
