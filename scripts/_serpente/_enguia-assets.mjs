// 08/11 — the eel's installation, Task 1 (plan `plans/2026-11-08-enguia-instalacao.md`): the approved PNGs copied from
// the sheets into `public/sprites/enguia/` (the game loads them), each copy checked byte for byte (md5). Only the
// re-glued gesture frames (`qNN.png`) and their `normais.png` — never the `original/` folders.
//   node scripts/_serpente/_enguia-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const F = 'docs/superpowers/folhas/';
const D = 'public/sprites/enguia/';
const pares = [
  ['2026-11-04/enguia-corpo/aprovada/enguia-f1.png', 'enguia-f1.png'],
  ['2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png', 'cabeca-e3-pescoco.png'],
  ['2026-11-07/enguia-aneis/faixa-a-normal.png', 'faixa-a-normal.png'],
  ['2026-11-07/enguia-aneis/faixa-b-normal.png', 'faixa-b-normal.png'],
  ['2026-11-07/enguia-aneis/cabeca-normal.png', 'cabeca-normal.png'],
  ['2026-11-07/enguia-dorso/dorso-corpo.png', 'dorso-corpo.png'],
  ['2026-11-07/enguia-dorso/dorso-cabeca.png', 'dorso-cabeca.png'],
];
for (const p of ['eco', 'canos', 'prepara', 'nadar', 'dor', 'agonia'])
  for (const f of fs.readdirSync(`${F}2026-11-07/enguia-gestos/${p}`)) if (/^(q\d\d|normais)\.png$/.test(f)) pares.push([`2026-11-07/enguia-gestos/${p}/${f}`, `gestos/${p}/${f}`]);

const md5 = (a) => createHash('md5').update(fs.readFileSync(a)).digest('hex');
let n = 0, iguais = 0;
for (const [de, para] of pares) {
  fs.mkdirSync(path.dirname(D + para), { recursive: true });
  fs.copyFileSync(F + de, D + para);
  n++;
  if (md5(F + de) === md5(D + para)) iguais++;
  else console.log('DIFERENTE', para);
}
console.log(`copiados ${n}, md5 iguais ${iguais}`);
