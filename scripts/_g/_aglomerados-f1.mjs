// BLOCO G · round 6 — the CLUSTERS (his idea, 21/10: "pode criar novos tipos de edifícios ou aglomerados"): stretches of
// the colony perimeter in one piece (domes with gothic spires, a tank, pipes, the invader's growth), as DECORATION on a
// plane BETWEEN the Paisagem and the structures — so the colony reads as a place, and gameplay does not change. The
// rule of the plane behind (memory: camada de trás diminui): SMALLER (60%), DARKER (the Paisagem's tone, the cadence he
// asked for: 11/24 — the energy lights left lit), SLOWER (0.72 of the world).
// Every candidate in rodada6/cru/aglomerado (minus `FORA`) → public/sprites/f1-aglomerado.png, -2, -3… (layer key
// `f1Aglomerado`, its variants `f1Aglomerado2`…), and a ×3 sheet.
//   node scripts/_g/_aglomerados-f1.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { tonalizar } from './_tonalizar-pecas.mjs';

const CRU = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada6/cru/aglomerado';
const FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada6';
const FORA = ['aglomerado-37-0.png']; // a white blank patch in the middle (21/10)
const ESCALA = 0.6;
const lista = fs.readdirSync(CRU).filter((f) => f.endsWith('.png') && !FORA.includes(f)).sort();
const saidas = [];
for (const [k, f] of lista.entries()) {
  const tom = await tonalizar(path.join(CRU, f), { p50: 11, p90: 24 });
  const t = await sharp(tom).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  const w = Math.round(t.info.width * ESCALA), h = Math.round(t.info.height * ESCALA);
  const raw = await sharp(t.data).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < raw.length; i += 4) raw[i] = raw[i] >= 128 ? 255 : 0;
  const nome = k === 0 ? 'f1-aglomerado.png' : `f1-aglomerado-${k + 1}.png`;
  await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join('public/sprites', nome));
  saidas.push({ nome, w, h });
  console.log(nome, `${w}×${h} (de ${f})`);
}
const Z = 3, larg = saidas.reduce((s, o) => s + o.w * Z + 12, 12), alt = Math.max(...saidas.map((o) => o.h)) * Z + 24;
let x = 12;
const comp = [];
for (const o of saidas) {
  comp.push({ input: await sharp(path.join('public/sprites', o.nome)).resize(o.w * Z, o.h * Z, { kernel: 'nearest' }).png().toBuffer(), left: x, top: alt - 12 - o.h * Z });
  x += o.w * Z + 12;
}
await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: 20, g: 26, b: 38, alpha: 1 } } }).composite(comp).png().toFile(path.join(FOLHA, 'aglomerados.png'));
