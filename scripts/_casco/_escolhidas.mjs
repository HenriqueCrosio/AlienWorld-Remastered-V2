// F3 HULL PROPS (10/11) — the triage: the candidates picked from `cru/`, trimmed to their own box (the game plants a
// prop by its foot and takes the hitbox from the texture's width), saved as `escolhidas/<concept>-<a|b|c>.png`, plus one
// enlarged strip per concept for the sheet (today's pieces first, at the same zoom).
//   node scripts/_casco/_escolhidas.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-10/casco-pecas';
const SEED = 11, Z = 5;
export const ESCOLHIDAS = {
  torreCraca: [1, 6, 13],
  torreCostela: [0, 2, 11],
  torreEspinho: [0, 4, 9],
  torreTubos: [4, 5, 11],
  ventEspiraculo: [2, 5, 12],
  ventVertebras: [2, 5, 10],
  ventCracas: [5, 6, 12],
  ventBranquias: [0, 3, 11],
};
const HOJE = {
  torre: ['lanca-misseis', 'lanca-misseis2'],
  vent: ['respiradouro', 'respiradouro2', 'respiradouro3'],
};
const FUNDO = { r: 24, g: 20, b: 40, alpha: 1 };

async function tira(bufs, arq) {
  const metas = await Promise.all(bufs.map((b) => sharp(b).metadata()));
  const h = Math.max(...metas.map((m) => m.height)) * Z + 16;
  let x = 8;
  const comps = [];
  for (let i = 0; i < bufs.length; i++) {
    const m = metas[i];
    const big = await sharp(bufs[i]).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer();
    comps.push({ input: big, left: x, top: h - 8 - m.height * Z }); // feet on one line
    x += m.width * Z + 16;
  }
  await sharp({ create: { width: x, height: h, channels: 4, background: FUNDO } }).composite(comps).png().toFile(arq);
}

fs.mkdirSync(path.join(DIR, 'escolhidas'), { recursive: true });
for (const [nome, idx] of Object.entries(ESCOLHIDAS)) {
  const bufs = [];
  for (let k = 0; k < idx.length; k++) {
    const buf = await sharp(path.join(DIR, 'cru', `${nome}-${SEED}-${idx[k]}.png`)).trim({ threshold: 0 }).png().toBuffer();
    const m = await sharp(buf).metadata();
    fs.writeFileSync(path.join(DIR, 'escolhidas', `${nome}-${'abc'[k]}.png`), buf);
    console.log(`${nome}-${'abc'[k]}: ${m.width}x${m.height}`);
    bufs.push(buf);
  }
  await tira(bufs, path.join(DIR, `tira-${nome}.png`));
}
for (const [nome, arqs] of Object.entries(HOJE)) {
  await tira(arqs.map((a) => fs.readFileSync(`public/sprites/${a}.png`)), path.join(DIR, `tira-hoje-${nome}.png`));
}
