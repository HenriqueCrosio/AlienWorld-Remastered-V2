// ONDE A BOLA DEIXA A GARRA, quadro a quadro — o centroide do miolo QUENTE à esquerda do tronco.
// O offset da mão em `Predador.arremessar` sai daqui. ⚠️ `f` é o fator do clipe (`Predador.QUADRO`):
// virtual = (clipe − 128) / f em x, e (clipe − (1 − f/2)·256) / f em y.
//
//   node scripts/_f4/_medir-mao.mjs <dir-clipe> <f> [xmax=75] [quadros...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [dir, f0, xmax0, ...quadros] = process.argv.slice(2);
const f = Number(f0), xmax = parseInt(xmax0 ?? '75');
const cy0 = (1 - f / 2) * 256;
const lista = quadros.length
  ? quadros.map((q) => `${q}.png`)
  : fs.readdirSync(dir).filter((x) => /^\d+\.png$/.test(x)).sort((a, b) => parseInt(a) - parseInt(b));
for (const nome of lista) {
  const arq = path.join(dir, nome);
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < xmax; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] < 200) continue;
    if (data[i] > 210 && data[i + 1] > 110 && data[i + 2] < 140) { sx += x; sy += y; n++; }
  }
  if (n < 12) { console.log(nome.padEnd(7), 'sem bola solta'); continue; }
  const cx = sx / n, cy = sy / n;
  console.log(nome.padEnd(7), `n=${String(n).padStart(4)} clipe=(${cx.toFixed(0)},${cy.toFixed(0)}) → virtual=(${((cx - 128) / f).toFixed(0)},${((cy - cy0) / f).toFixed(0)})`);
}
