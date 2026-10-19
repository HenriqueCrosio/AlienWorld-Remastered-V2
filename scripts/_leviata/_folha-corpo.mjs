// BLOCO D — previews for the body concept sheet, step 1 of 2: each raw concept trimmed and shown big (×2), plus
// the reductions the game will draw, UNTINTED (the game applies its own tint): 70px wide for the menu and 133px
// for the distant silhouette (its largest on screen, F2 at boss time = 116 × 1.15). Step 2 is
// `_capturar-corpo.mjs`, which swaps these into the running game and photographs it.
//   node scripts/_leviata/_folha-corpo.mjs <cruDir> <imgDir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [cruDir, imgDir] = process.argv.slice(2);
fs.mkdirSync(path.join(imgDir, 'red'), { recursive: true });

// Reduce, then snap alpha so the edge stays a pixel edge instead of a soft halo.
async function reduzir(buf, largura) {
  const { data, info } = await sharp(buf).trim().resize({ width: largura, kernel: 'mitchell' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 110 ? 255 : 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

const ampliar = async (buf, k) => {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer();
};

for (const arq of fs.readdirSync(cruDir).filter((f) => f.endsWith('.png')).sort()) {
  const nome = arq.replace(/\.png$/, '');
  const cru = fs.readFileSync(path.join(cruDir, arq));
  fs.writeFileSync(path.join(imgDir, `${nome}-grande.png`), await ampliar(await sharp(cru).trim().png().toBuffer(), 2));
  fs.writeFileSync(path.join(imgDir, 'red', `${nome}-70.png`), await reduzir(cru, 70));
  fs.writeFileSync(path.join(imgDir, 'red', `${nome}-133.png`), await reduzir(cru, 133));
  console.log(nome);
}
