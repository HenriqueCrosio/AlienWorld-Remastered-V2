import sys
from PIL import Image, ImageDraw
S, tag, n, cols, z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
ims = [Image.open(f'{S}/{tag}/{i}.png').convert('RGBA') for i in range(n)]
w, h = ims[0].size
cw, ch = (w + 4) * z, (h + 4) * z + 12
rows = (n + cols - 1) // cols
c = Image.new('RGBA', (cols * cw, rows * ch), (12, 14, 22, 255))
d = ImageDraw.Draw(c)
for i, im in enumerate(ims):
    x, y = (i % cols) * cw, (i // cols) * ch
    bb = im.getbbox()
    c.alpha_composite(im.resize((w * z, h * z), Image.NEAREST), (x + 2 * z, y + 12 + 2 * z))
    d.text((x + 3, y + 1), f'{i} {bb[2]-bb[0]}x{bb[3]-bb[1]}' if bb else f'{i} -', fill=(200, 200, 200, 255))
c.save(f'{S}/prancha-{tag}.png')
