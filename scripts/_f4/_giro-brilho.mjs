// O GIRO do predador (animação v3 a partir da S) CLAREIA quadro a quadro: lum média 46 → 61 no quadro 8.
// Corrige cada quadro para a lum média do quadro 0 com uma curva GAMA (não um fator linear): o gama > 1
// escurece os meios-tons e quase não toca os altos — o core aceso continua aceso.
//
//   node scripts/_f4/_giro-brilho.mjs <dir-dos-quadros> <dir-saida>
import fs from 'node:fs';
import sharp from 'sharp';

const [dir, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });

const ler = async (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const lum = (d, g = 1) => {
  let n = 0, L = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    n++;
    const c = (v) => 255 * Math.pow(v / 255, g);
    L += 0.2126 * c(d[i]) + 0.7152 * c(d[i + 1]) + 0.0722 * c(d[i + 2]);
  }
  return L / n;
};

const quadros = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const alvo = lum((await ler(`${dir}/${quadros[0]}`)).data);

for (const f of quadros) {
  const { data, info } = await ler(`${dir}/${f}`);
  let lo = 0.5, hi = 3;
  for (let k = 0; k < 30; k++) {
    const g = (lo + hi) / 2;
    if (lum(data, g) > alvo) lo = g; else hi = g;
  }
  const g = (lo + hi) / 2;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(255 * Math.pow(out[i + c] / 255, g));
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(`${saida}/${f}`);
  console.log(f, 'gama', g.toFixed(3), 'lum', lum(data).toFixed(1), '→', lum(out).toFixed(1));
}
