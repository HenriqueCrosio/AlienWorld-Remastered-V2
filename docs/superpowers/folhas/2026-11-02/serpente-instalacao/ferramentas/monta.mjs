// 02/11 — joins clip pieces into one numbered clip: each `dir:a-b` adds frames a..b of that dir in order; `--fim <png>`
// appends an exact copy of a frame (the approved one: the gesture ends ON it, never on the generator's last frame).
//   node monta.mjs <out-dir> <dir:a-b> [<dir:a-b> ...] [--fim <png>]
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2);
const OUT = args[0];
const fim = args.includes('--fim') ? args[args.indexOf('--fim') + 1] : null;
const partes = args.slice(1).filter((a, i, l) => a !== '--fim' && l[i - 1] !== '--fim');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const p of partes) {
  const [d, faixa] = p.split(':');
  const [a, b] = faixa.split('-').map(Number);
  for (let i = a; i <= b; i++) fs.copyFileSync(path.join(d, `${i}.png`), path.join(OUT, `${n++}.png`));
}
if (fim) fs.copyFileSync(fim, path.join(OUT, `${n++}.png`));
console.log(OUT, n, 'quadros');
