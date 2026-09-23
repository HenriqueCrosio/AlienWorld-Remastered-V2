// A FOLHA DE CONTATO DE UMA ANIMAÇÃO DE CENÁRIO, e a régua junto.
//
// ⚠️ ELA MEDE O QUE O PROMPT PEDIU: que só a LUZ respire e o casco fique parado. Uma animação de
// cenário que mexe a silhueta lê como a peça inteira tremendo no fundo — e a peça é ancorada na
// borda, então tremer denuncia a âncora. A coluna "mexeu" é a % de pixels que mudaram de valor
// entre o quadro e o quadro 0; "silhueta" é a % que mudou de OPACO para VAZIO (ou o contrário).
//
//   node scripts/_f4/_folha-anim.mjs <pasta> <saida.png>
import sharp from 'sharp';
import { readdirSync } from 'fs';

const [pasta, saida] = process.argv.slice(2);
const arqs = readdirSync(pasta).filter((f) => f.endsWith('.png'))
  .sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `${pasta}/${f}`);

const cru = async (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const base = await cru(arqs[0]);
const { width: W, height: H } = base.info;

console.log(`${arqs.length} quadros de ${W}x${H}`);
for (let i = 0; i < arqs.length; i++) {
  const q = await cru(arqs[i]);
  let mexeu = 0, silhueta = 0, vivos = 0;
  for (let p = 0; p < base.data.length; p += 4) {
    const aA = base.data[p + 3] > 8, aB = q.data[p + 3] > 8;
    if (aA || aB) vivos++;
    if (aA !== aB) { silhueta++; continue; }
    if (!aA) continue;
    const d = Math.abs(base.data[p] - q.data[p]) + Math.abs(base.data[p + 1] - q.data[p + 1])
            + Math.abs(base.data[p + 2] - q.data[p + 2]);
    if (d > 24) mexeu++;
  }
  console.log(`  q${i}  mexeu ${(100 * mexeu / vivos).toFixed(1)}%   silhueta ${(100 * silhueta / vivos).toFixed(1)}%`);
}

// A folha: os quadros em fila, ampliados 3x, sobre o cinza-médio do editor.
const Z = 3, PAD = 6;
const larg = arqs.length * (W * Z + PAD) + PAD;
const comps = [];
for (let i = 0; i < arqs.length; i++) {
  comps.push({
    input: await sharp(arqs[i]).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer(),
    left: PAD + i * (W * Z + PAD), top: PAD,
  });
}
await sharp({ create: { width: larg, height: H * Z + PAD * 2, channels: 4,
  background: { r: 40, g: 40, b: 46, alpha: 1 } } }).composite(comps).png().toFile(saida);
console.log(`\n${saida}`);
