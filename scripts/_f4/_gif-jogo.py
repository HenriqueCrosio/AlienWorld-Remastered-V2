"""25/11: a GIF of a filmed scene (`_ver-besta-nova.mjs`) at its REAL timing (each frame lasts until the next one was
taken). usage: python scripts/_f4/_gif-jogo.py <scene dir> <out.gif> [scale]"""
import json, os, sys
from PIL import Image
d, out = sys.argv[1:3]
S = float(sys.argv[3]) if len(sys.argv) > 3 else 0.75
T = json.load(open(os.path.join(d, 'tempos.json')))
fr, du = [], []
for i, t in enumerate(T):
    im = Image.open(os.path.join(d, f'{i}.png')).convert('RGB')
    fr.append(im.resize((int(im.width * S), int(im.height * S)), Image.LANCZOS))
    du.append((T[i + 1]['t'] - t['t']) if i + 1 < len(T) else 600)
fr[0].save(out, save_all=True, append_images=fr[1:], duration=du, loop=0, optimize=True)
print(out, len(fr), os.path.getsize(out) // 1024, 'KB')
