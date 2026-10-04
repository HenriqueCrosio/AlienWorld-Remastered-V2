// A EXAUSTÃO DO JATO (T1 humano, `ship-jato`) — 04/10, ele: *"até o suposto jato propulsor pisca com as luzes da asa,
// ou seja, ele nunca teve exaustão"*, com a chama desenhada em vermelho na traseira, no meio. Desenhada À MÃO sobre
// os 9 quadros aprovados (as luzes das asas continuam piscando): a chama sai do bocal (x 8, linhas 11–12) para trás,
// na linguagem da chama do T0 — vermelho por fora, núcleo amarelo-claro junto ao bocal — e TREMULA (comprimento e
// ponta mudam a cada quadro).
//
// Uso, da raiz:
//   node scripts/_exaustao-jato.mjs folha     → a folha em cena (3 tamanhos, animada) em folhas/2026-10-04/exaustao/
//   node scripts/_exaustao-jato.mjs <A|B|C>   → instala o tamanho escolhido nos quadros do jogo (o original fica na pasta)
import fs from 'fs';
import sharp from 'sharp';

const [MODO = 'folha'] = process.argv.slice(2);
const PASTA = 'docs/superpowers/folhas/2026-10-04/exaustao';
const ORIGINAL = `${PASTA}/original`; // os quadros aprovados, intocados (copiados na 1ª vez)
const JOGO = 'public/sprites';
const N = 9;
fs.mkdirSync(ORIGINAL, { recursive: true });
for (let i = 0; i < N; i++) {
  const o = `${ORIGINAL}/ship-jato-anim-${i}.png`;
  if (!fs.existsSync(o)) fs.copyFileSync(`${JOGO}/ship-jato-anim-${i}.png`, o);
}

const COR = { branco: 'fffe0b', claro: 'ffd60a', amarelo: 'ffac0c', vermelho: 'fe0101', brasa: 'b2321e' };
const BOCAL = 8; // a última coluna da chama (encostada no bocal)

/**
 * Os TRÊS TAMANHOS: `L` é o comprimento do núcleo (linhas 11–12) em cada quadro — tremula; `borda` quantos pixels a
 * chama tem nas linhas de fora (10 e 13), junto ao bocal.
 */
const TAMANHOS = {
  A: { nome: 'A · CURTA (~5px, 2 linhas)', L: [5, 4, 5, 6, 5, 4, 5, 6, 4], borda: 0 },
  B: { nome: 'B · MÉDIA (~7px, 4 linhas) — o desenho dele', L: [7, 6, 8, 7, 6, 7, 8, 6, 7], borda: 3 },
  C: { nome: 'C · LONGA (~9px, 4 linhas)', L: [9, 8, 10, 9, 8, 9, 10, 8, 9], borda: 4 },
};

/** A chama de um quadro: { "x,y": hex }. Núcleo nas linhas 11–12; a ponta fica numa linha só (alterna). */
function chama(t, i) {
  const px = {};
  const L = t.L[i % t.L.length];
  for (const y of [11, 12]) {
    // A ponta alterna de linha a cada quadro: a chama "lambe" em vez de ser um retângulo.
    const comp = y === (i % 2 ? 11 : 12) ? L : L - 1;
    for (let d = 0; d < comp; d++) {
      const x = BOCAL - d;
      if (x < 0) continue;
      px[`${x},${y}`] = d <= 0 ? COR.branco : d <= 1 ? COR.claro : d <= 3 ? COR.amarelo : d < comp - 1 ? COR.vermelho : COR.brasa;
    }
  }
  for (const y of [10, 13])
    for (let d = 0; d < t.borda; d++) {
      const x = BOCAL - d;
      px[`${x},${y}`] = d === t.borda - 1 ? COR.brasa : COR.vermelho;
    }
  return px;
}

/** Pinta a chama sobre um quadro: só onde está VAZIO ou onde a "luz" do meio piscava (o falso jato). */
async function quadroComChama(i, t) {
  const { data, info } = await sharp(`${ORIGINAL}/ship-jato-anim-${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [k, hex] of Object.entries(chama(t, i))) {
    const [x, y] = k.split(',').map(Number);
    const p = (y * info.width + x) * 4;
    const [r, g, b, a] = data.slice(p, p + 4);
    const luz = a && Math.max(r, g, b) >= 235 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) >= 0.6;
    if (a && !luz) continue;
    data[p] = parseInt(hex.slice(0, 2), 16);
    data[p + 1] = parseInt(hex.slice(2, 4), 16);
    data[p + 2] = parseInt(hex.slice(4, 6), 16);
    data[p + 3] = 255;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

if (MODO === 'folha') {
  // EM CENA: o fundo real da F2 (o GIF da bomba, sem a nave nesta faixa), o jato animado a 12 qps, ampliado 5×.
  const Z = 5;
  const fundo = await sharp('docs/superpowers/folhas/2026-10-03/bomba/bomba-de-queda.gif', { page: 2 })
    .extract({ left: 0, top: 22 + 432 + 22, width: 768, height: 432 })
    .resize(384, 216, { kernel: 'nearest' })
    .extract({ left: 40, top: 30, width: 64, height: 34 })
    .png()
    .toBuffer();
  const linhas = [['HOJE — sem exaustão (o meio pisca com as asas)', null], ...Object.entries(TAMANHOS).map(([, t]) => [t.nome, t])];
  const ROT = 22;
  const W = 64 * Z;
  const quadros = [];
  for (let q = 0; q < N * 2; q++) {
    const comp = [];
    let topo = 0;
    for (const [nome, t] of linhas) {
      const nave = t ? await quadroComChama(q % N, t) : await sharp(`${ORIGINAL}/ship-jato-anim-${q % N}.png`).png().toBuffer();
      const cena = await sharp(fundo).composite([{ input: nave, left: 12, top: 4 }]).png().toBuffer();
      const rot = await sharp(Buffer.from(`<svg width="${W}" height="${ROT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas, monospace" font-size="13" fill="${t ? '#ffb040' : '#8a93a6'}">${nome}</text></svg>`)).png().toBuffer();
      comp.push({ input: rot, left: 0, top: topo }, { input: await sharp(cena).resize(W, 34 * Z, { kernel: 'nearest' }).png().toBuffer(), left: 0, top: topo + ROT });
      topo += ROT + 34 * Z + 6;
    }
    quadros.push(await sharp({ create: { width: W, height: topo, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
  }
  // 12 qps = a `ship-jato-thrust` do jogo (BootScene).
  await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(83), loop: 0 }).toFile(`${PASTA}/exaustao-jato.gif`);
  console.log(`${PASTA}/exaustao-jato.gif`);
} else {
  const t = TAMANHOS[MODO];
  if (!t) throw new Error(`tamanho desconhecido: ${MODO}`);
  for (let i = 0; i < N; i++) fs.writeFileSync(`${JOGO}/ship-jato-anim-${i}.png`, await quadroComChama(i, t));
  console.log(`${JOGO}/ship-jato-anim-*.png`, N, 'quadros com a exaustão', MODO);
}
