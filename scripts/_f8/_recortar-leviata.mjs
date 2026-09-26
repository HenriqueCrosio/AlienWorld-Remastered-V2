// P4 · O LEVIATÃ FERIDO, VISTO DE FORA (capítulo 4) — RECORTADO do conceito que ele aprovou
// (`conceito-4-ferida-11-limpo.png`, sem a nave colada), em vez de gerado de novo: a geração nova sai fora do
// modelo (dentes de tubarão nas rodadas de 23/09), e este já é o biomecânico certo, com a ferida no lugar.
//
//   1. o CORPO: tudo o que não é o espaço. O espaço = o preto ligado à borda do quadro (inundação a partir das
//      bordas por pixel escuro); as estrelas soltas e a lua pequena do canto saem por serem ilhas pequenas;
//   2. a LAVA: os pixels quentes do corpo, numa camada à parte — na cena ela pulsa fraca (ele ainda morrendo).
//
//   node scripts/_f8/_recortar-leviata.mjs → public/sprites/f8-leviata.png + f8-leviata-lava.png (+ a caixa)
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'docs/superpowers/folhas/2026-09-23/conceito-4-ferida-11-limpo.png';
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const lum = (i) => 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];

// 1 · o espaço: inundação a partir das bordas pelos DOIS tons do espaço — (6,7,12) e (5,9,18), lum < 9. O casco
//     mais escuro é (10,17,26), lum 16: o corte fica em 11 (com 22, a inundação entrava no corpo)
const espaco = new Uint8Array(W * H);
const fila = [];
for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
for (const p of fila) espaco[p] = 1;
for (let k = 0; k < fila.length; k++) {
  const p = fila[k], x = p % W, y = (p / W) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const xx = x + dx, yy = y + dy, q = yy * W + xx;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q]) continue;
    if (lum(q * 4) < 11) { espaco[q] = 1; fila.push(q); }
  }
}
// 2 · o corpo = a MAIOR região que não é espaço (estrelas e a lua do canto são ilhas)
const rot = new Int32Array(W * H).fill(-1);
let maior = -1, tam = 0, n = 0;
for (let p0 = 0; p0 < W * H; p0++) {
  if (espaco[p0] || rot[p0] !== -1) continue;
  const f = [p0]; rot[p0] = n;
  for (let k = 0; k < f.length; k++) {
    const p = f[k], x = p % W, y = (p / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q] || rot[q] !== -1) continue;
      rot[q] = n; f.push(q);
    }
  }
  if (f.length > tam) { tam = f.length; maior = n; }
  n++;
}
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let p = 0; p < W * H; p++) if (rot[p] === maior) {
  const x = p % W, y = (p / W) | 0;
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
const corpo = Buffer.alloc(cw * ch * 4, 0), lava = Buffer.alloc(cw * ch * 4, 0);
let quentes = 0;
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  const p = (y + y0) * W + x + x0, i = p * 4, o = (y * cw + x) * 4;
  if (rot[p] !== maior) continue;
  data.copy(corpo, o, i, i + 4); corpo[o + 3] = 255;
  const quente = data[i] > 150 && data[i] > data[i + 2] * 2 && data[i + 1] > 40;
  if (quente) { data.copy(lava, o, i, i + 4); lava[o + 3] = 255; quentes++; }
}
await sharp(corpo, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile('public/sprites/f8-leviata.png');
await sharp(lava, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile('public/sprites/f8-leviata-lava.png');
fs.writeFileSync('scripts/_f8/_leviata-caixa.json', JSON.stringify({ left: x0, top: y0, width: cw, height: ch }));
console.log(`f8-leviata.png ${cw}×${ch} em (${x0},${y0}) · ${n} regiões, corpo ${tam}px · lava ${quentes}px`);

// 3 · o corpo FRIO (a lava apagada para a crosta): quem acende é a camada de lava por cima, pulsando — sem isto
//     o pulso não teria de onde escurecer (a lava acesa ficaria no corpo, por baixo)
const frio = Buffer.from(corpo);
for (let p = 0; p < cw * ch; p++) if (lava[p * 4 + 3]) { frio[p * 4] = 26; frio[p * 4 + 1] = 22; frio[p * 4 + 2] = 29; }
await sharp(frio, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile('public/sprites/f8-leviata.png');

console.log('corpo frio');

// 5 · A NUVEM SE DESFAZ (24/09, arranjo D sobre o zero-G espelhado): a massa escura à direita da ferida foi
//     pintada sobre o preto do espaço, e sobre um fundo mais claro lia como MANCHA. Ela se desfaz num pontilhado
//     ordenado entre DESFAZ_DE e DESFAZ_ATE (no corpo e na lava) — detrito se espalhando; as partículas da cena
//     continuam o vazamento dali para fora.
const DESFAZ_DE = 225, DESFAZ_ATE = 300;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
for (const arq of ['public/sprites/f8-leviata.png', 'public/sprites/f8-leviata-lava.png']) {
  const { data: d, info: inf } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < inf.height; y++) for (let x = DESFAZ_DE; x < inf.width; x++) {
    const k = Math.min(1, (x - DESFAZ_DE) / (DESFAZ_ATE - DESFAZ_DE)); // 0 → some nada, 1 → some tudo
    if (k * 16 > BAYER[y % 4][x % 4]) d[(y * inf.width + x) * 4 + 3] = 0;
  }
  await sharp(d, { raw: inf }).png().toFile(arq + '.tmp');
  fs.renameSync(arq + '.tmp', arq);
}
console.log(`a nuvem se desfaz de x=${DESFAZ_DE} a ${DESFAZ_ATE}`);

// 6 · O FUNDO DA FERIDA (arranjo D com a lua do B, escolha dele em 24/09): o céu do zero-G ESPELHADO — reaproveita
//     a pintura da decolagem, mas não repete o começo (*"reutilizaria o fundo, mas nao igual ao começo"*).
//     Recorte 384×216 em escala 1 (x=96, y=54 da pintura de 480×270) e espelhado.
await sharp('public/sprites/paint-bg-zerog.png').extract({ left: 96, top: 54, width: 384, height: 216 }).flop().png().toFile('public/sprites/f8-fundo-ferida.png');
console.log('f8-fundo-ferida.png (zero-G espelhado)');
