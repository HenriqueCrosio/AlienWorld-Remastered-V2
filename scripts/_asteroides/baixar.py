# Downloads every candidate of the four jobs and lays each group out as a numbered contact sheet (×Z, dark background).
import io, sys, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

here = Path(__file__).parent
JOBS = {
    'peq': ('785f4600-858d-44fd-b9fa-3e2d2a3ecba1', 64, 4),
    'med': ('0fb77003-7010-44cb-bb35-2f381080c001', 36, 4),
    'gra': ('d697e8b6-7a98-4a54-b237-81a5effd79d2', 25, 3),
    'min': ('08bea00f-ed1f-4e51-9da0-3fac08a4debe', 16, 3),
}
for nome, (job, n, Z) in JOBS.items():
    pasta = here / nome
    pasta.mkdir(exist_ok=True)
    ims = []
    for i in range(n):
        f = pasta / f'{i:02d}.png'
        if not f.exists():
            url = f'https://api.pixellab.ai/mcp/images/{job}/download?index={i}'
            with urllib.request.urlopen(url) as r:
                f.write_bytes(r.read())
        ims.append(Image.open(f).convert('RGBA'))
    w, h = ims[0].size
    cols = 8 if n > 25 else 5 if n > 16 else 4
    rows = (n + cols - 1) // cols
    CW, CH = w * Z + 8, h * Z + 20
    sheet = Image.new('RGBA', (cols * CW, rows * CH), (14, 17, 26, 255))
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * CW, (i // cols) * CH
        bg = Image.new('RGBA', im.size, (22, 27, 40, 255)); bg.alpha_composite(im)
        sheet.alpha_composite(bg.resize((w * Z, h * Z), Image.NEAREST), (x + 4, y + 16))
        d.text((x + 6, y + 2), str(i), fill=(230, 230, 230, 255))
    sheet.save(here / f'contato-{nome}.png')
    print(nome, n, (w, h), sheet.size)
