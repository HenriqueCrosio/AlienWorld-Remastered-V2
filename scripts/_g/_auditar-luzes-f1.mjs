// BLOCO G · every light of the F1 horizon, lit vs off EXACTLY as the rig crops it (the box + the margin of
// `src/f1/horizonte.ts`), ×8 — beacons first, then up to 48 windows. Also the whole painting lit and with every light off.
//   node scripts/_g/_auditar-luzes-f1.mjs [layersDir=public/sprites/f1] [outDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [S = 'public/sprites/f1', OUT = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const D = JSON.parse(fs.readFileSync(path.join(S, 'dados.json'), 'utf8'));
const pintura = path.join(S, 'pintura.png');
const apagadas = path.join(S, 'apagadas.png');
const M = 6, L = 2 * M + 1, Z = 8;

// The painting with only this box of the off layer laid over it.
async function comCaixa(bx, by, bw, bh) {
  const pedaco = await sharp(apagadas).extract({ left: bx, top: by, width: bw, height: bh }).png().toBuffer();
  return sharp(pintura).composite([{ input: pedaco, left: bx, top: by }]).png().toBuffer();
}
const lista = [
  ...D.grupos.filter((g) => g.tipo === 'farol').map((g) => [g, 3]),
  ...D.grupos.filter((g) => g.tipo === 'janela').slice(0, 48).map((g) => [g, 1]),
];
const tiles = [];
for (const [g, margem] of lista) {
  const bx = Math.max(0, Math.floor(g.x - margem)), by = Math.max(0, Math.floor(g.y - margem));
  const bw = Math.min(D.w - bx, Math.ceil(g.w + 2 * margem)), bh = Math.min(D.h - by, Math.ceil(g.h + 2 * margem));
  const cx = Math.round(g.x + g.w / 2), cy = Math.round(g.y + g.h / 2);
  const left = Math.min(Math.max(0, cx - M), D.w - L), top = Math.min(Math.max(0, cy - M), D.h - L);
  const off = await comCaixa(bx, by, bw, bh);
  for (const src of [pintura, off]) {
    const t = await sharp(src).extract({ left, top, width: L, height: L }).png().toBuffer();
    tiles.push(await sharp(t).resize(L * Z, L * Z, { kernel: 'nearest' }).png().toBuffer());
  }
}
const T = L * Z, COL = 8;
const linhas = Math.max(1, Math.ceil(tiles.length / COL));
await sharp({ create: { width: COL * (T + 6), height: linhas * (T + 6), channels: 4, background: '#401010' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % COL) * (T + 6) + (i % 2 ? 0 : 6), top: Math.floor(i / COL) * (T + 6) })))
  .png().toFile(path.join(OUT, 'luzes.png'));
// The colony with EVERY light off (the end state of round 2), and lit, ×3.
const todas = await sharp(pintura).composite([{ input: apagadas }]).png().toBuffer();
await sharp(todas).resize(D.w * 3, D.h * 3, { kernel: 'nearest' }).toFile(path.join(OUT, 'apagada-inteira.png'));
await sharp(pintura).resize(D.w * 3, D.h * 3, { kernel: 'nearest' }).toFile(path.join(OUT, 'acesa-inteira.png'));
console.log('faróis', D.grupos.filter((g) => g.tipo === 'farol').length, 'janelas na folha', Math.min(48, D.grupos.filter((g) => g.tipo === 'janela').length), 'tiles', tiles.length);
