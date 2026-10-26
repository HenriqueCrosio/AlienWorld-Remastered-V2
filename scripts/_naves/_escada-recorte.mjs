// 25/10 — cut the T0/T1 options out of the orange "a" by the recipes in `escada-receitas.mjs`, then shrink each with
// `_encolher.mjs` (seams of repeated pixels; no pixel changes colour). Writes <outDir>/cru/<id>.png (cut, not shrunk)
// and <outDir>/<id>.png (final, 48x32 frame, bbox centre kept).
//   node scripts/_naves/_escada-recorte.mjs <outDir> [id...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BASE, RECEITAS } from './escada-receitas.mjs';

const [OUT, ...IDS] = process.argv.slice(2);
const lista = IDS.length ? RECEITAS.filter((r) => IDS.includes(r.id)) : RECEITAS;
if (!lista.length) throw new Error(`no recipe for: ${IDS.join(' ')}`);

const { data: base, info } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const at = (buf, x, y) => (y * W + x) * 4;
const opaco = (buf, x, y) => x >= 0 && y >= 0 && x < W && y < H && buf[at(buf, x, y) + 3] > 40;
const luz = (buf, x, y) => { const i = at(buf, x, y); return 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2]; };
const contorno = (buf, x, y) => luz(buf, x, y) < 22;
const COR_CONTORNO = [...base.subarray(at(base, 9, 5), at(base, 9, 5) + 4)];

fs.mkdirSync(path.join(OUT, 'cru'), { recursive: true });
for (const r of lista) {
  const img = Buffer.from(base);
  const apagado = new Set();
  for (const [x0, y0, x1, y1] of r.apagar) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (opaco(img, x, y)) apagado.add(`${x},${y}`);
      img.fill(0, at(img, x, y), at(img, x, y) + 4);
    }
  }
  // Touch-ups first, so the outline closing sees them (a row repainted as outline closes nothing below it).
  for (const [x, y, [sx, sy]] of r.pixels) {
    if (sx < 0) img.fill(0, at(img, x, y), at(img, x, y) + 4);
    else img.set(base.subarray(at(base, sx, sy), at(base, sx, sy) + 4), at(img, x, y));
  }
  // semFechar: erased rects that must NOT get an outline (the flame has none).
  const livre = (x, y) => (r.semFechar ?? []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  if (r.fechar) {
    const novos = [];
    for (const k of apagado) {
      const [x, y] = k.split(',').map(Number);
      if (livre(x, y) || opaco(img, x, y)) continue;
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => opaco(img, x + dx, y + dy) && !contorno(img, x + dx, y + dy));
      if (viz) novos.push([x, y]);
    }
    for (const [x, y] of novos) img.set(COR_CONTORNO, at(img, x, y));
  }
  // tirarColunas: whole columns of the "a" taken out (the rest closes in toward the nose, which stays put) — how the
  // turbine gets shorter without a seam wandering into it.
  const fora = new Set(r.tirarColunas ?? []);
  const final = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    let nx = W - 1;
    for (let x = W - 1; x >= 0; x--) {
      if (fora.has(x)) continue;
      img.copy(final, at(final, nx, y), at(img, x, y), at(img, x, y) + 4);
      nx--;
    }
  }
  const cru = path.join(OUT, 'cru', `${r.id}.png`);
  await sharp(final, { raw: { width: W, height: H, channels: 4 } }).png().toFile(cru);
  if (r.alvo) {
    const prot = r.proteger ? [`--proteger=${r.proteger}`] : [];
    const out = execFileSync('node', ['scripts/_naves/_encolher.mjs', OUT, r.alvo, cru, ...prot], { encoding: 'utf8' });
    process.stdout.write(out);
  } else {
    fs.copyFileSync(cru, path.join(OUT, `${r.id}.png`));
    console.log(`${r.id}.png: no shrink`);
  }
}
