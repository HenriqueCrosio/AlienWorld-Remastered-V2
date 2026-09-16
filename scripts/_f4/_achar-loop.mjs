// ACHA O LOOP dentro de um clipe que não fecha sozinho (o PixMiniMax gera progressão, não ciclo — e fixar o
// último quadro igual ao primeiro TRAVA o movimento, medido em 16/09). Para cada par (i, j) com j − i ≥ mín,
// mede a diferença média de RGBA entre o quadro i e o j; o melhor par dá o ciclo i..j−1 (o j "é" o i).
// Também informa o MOVIMENTO médio entre vizinhos do trecho — um loop perfeito e parado não serve.
//
//   node scripts/_f4/_achar-loop.mjs <dir-do-clipe> [minimo=6] [ignorar-primeiros=1]
import fs from 'node:fs';
import sharp from 'sharp';

const [dir, minArg = '6', pularArg = '1'] = process.argv.slice(2);
const MIN = Number(minArg);
const PULAR = Number(pularArg);
const arquivos = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const Q = await Promise.all(arquivos.map((f) => sharp(`${dir}/${f}`).ensureAlpha().resize(96, 96).raw().toBuffer()));
const dif = (a, b) => {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += Math.abs(a[k] - b[k]);
  return s / a.length;
};
const viz = [];
for (let i = 0; i + 1 < Q.length; i++) viz.push(dif(Q[i], Q[i + 1]));
const media = (a, b) => viz.slice(a, b).reduce((x, y) => x + y, 0) / Math.max(1, b - a);

const pares = [];
for (let i = PULAR; i < Q.length; i++) {
  for (let j = i + MIN; j < Q.length; j++) {
    const fecho = dif(Q[i], Q[j]);
    const mov = media(i, j);
    // O custo: o salto do fecho comparado ao passo normal do trecho (fecho ≈ passo = costura invisível).
    pares.push({ i, j, fecho: +fecho.toFixed(2), mov: +mov.toFixed(2), razao: +(fecho / Math.max(mov, 0.01)).toFixed(2) });
  }
}
pares.sort((a, b) => a.razao - b.razao);
console.log(dir, `${Q.length} quadros · passo médio ${media(0, viz.length).toFixed(2)}`);
for (const p of pares.slice(0, 5)) console.log(`  quadros ${p.i}..${p.j - 1} (fecha em ${p.j}) · fecho ${p.fecho} · passo ${p.mov} · razão ${p.razao}`);
