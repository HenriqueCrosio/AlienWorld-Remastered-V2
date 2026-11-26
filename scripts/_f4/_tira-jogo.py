"""25/11: a strip of N evenly spaced frames of a filmed scene (`_ver-besta-nova.mjs`), labelled with the state and the
clip frame. usage: python scripts/_f4/_tira-jogo.py <scene dir> <out.png> [N] [scale]"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1:3]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 10
S = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
F = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
T = json.load(open(os.path.join(d, 'tempos.json')))
idx = [round(i * (len(T) - 1) / (N - 1)) for i in range(N)]
ims = [Image.open(os.path.join(d, f'{i}.png')).convert('RGB') for i in idx]
w, h = int(ims[0].width * S), int(ims[0].height * S)
cols = 5
g = Image.new('RGB', (w * cols, (h + 16) * ((N + cols - 1) // cols)), (20, 20, 24))
dr = ImageDraw.Draw(g)
for k, (i, im) in enumerate(zip(idx, ims)):
    x, y = (k % cols) * w, (k // cols) * (h + 16)
    g.paste(im.resize((w, h)), (x, y + 16))
    t = T[i]
    dr.text((x + 3, y), f"{t['t']}ms {t.get('e')} {str(t.get('k')).replace('besta-','')}:{t.get('q')}", fill=(255, 230, 120), font=F)
g.save(out)
