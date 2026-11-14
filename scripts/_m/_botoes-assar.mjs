// BLOCK M2 (14/11) — the BUTTON ICONS of the controller hints, baked from Kenney's "Input Prompts Pixel" (CC0, public
// domain — `assets/raw/kenney-input-prompts-pixel/License.txt`): one strip of 16×16 frames, in the order of
// `src/entrada/icones.ts`. The four PlayStation face buttons are drawn here on the pack's blank button (the pack has
// them split in two tiles), in the pack's own colours.
//   node scripts/_m/_botoes-assar.mjs            → public/sprites/botoes.png  (+ a 6× preview beside the source)
import fs from 'node:fs';
import sharp from 'sharp';

const FONTE = 'assets/raw/kenney-input-prompts-pixel/tilemap_packed.png';
const SAIDA = 'public/sprites/botoes.png';
const T = 16;
const { data, info } = await sharp(FONTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tile = (lin, col) => {
  const b = Buffer.alloc(T * T * 4);
  for (let y = 0; y < T; y++) data.copy(b, y * T * 4, ((lin * T + y) * info.width + col * T) * 4, ((lin * T + y) * info.width + col * T + T) * 4);
  return b;
};
/** the most saturated colour of a tile (the symbol's) */
const corDe = (lin, col) => {
  const b = tile(lin, col);
  let melhor = [0, 0, 0], sat = -1;
  for (let i = 0; i < b.length; i += 4) {
    if (b[i + 3] < 200) continue;
    const mx = Math.max(b[i], b[i + 1], b[i + 2]), mn = Math.min(b[i], b[i + 1], b[i + 2]);
    if (mx - mn > sat) { sat = mx - mn; melhor = [b[i], b[i + 1], b[i + 2]]; }
  }
  return melhor;
};
const SIMBOLO = {
  cruz: ['X....X', '.X..X.', '..XX..', '..XX..', '.X..X.', 'X....X'],
  bola: ['.XXXX.', 'X....X', 'X....X', 'X....X', 'X....X', '.XXXX.'],
  quadrado: ['XXXXXX', 'X....X', 'X....X', 'X....X', 'X....X', 'XXXXXX'],
  triangulo: ['..XX..', '..XX..', '.X..X.', '.X..X.', 'X....X', 'XXXXXX'],
};
/** a PlayStation face button: the pack's blank button with the symbol on it */
const face = (simbolo, cor) => {
  const b = tile(0, 12);
  SIMBOLO[simbolo].forEach((linha, y) => [...linha].forEach((c, x) => {
    if (c !== 'X') return;
    const i = ((y + 3) * T + (x + 5)) * 4;
    b[i] = cor[0]; b[i + 1] = cor[1]; b[i + 2] = cor[2]; b[i + 3] = 255;
  }));
  return b;
};
/**
 * The pack has ONE controller silhouette, with a mark in the middle. The PlayStation one is the same body without the
 * mark and with the two sticks low and side by side (two dark dots), which is how the two families differ at a glance.
 */
function semMarca(b) {
  // the body colour: the most frequent opaque colour of the tile
  const conta = new Map();
  for (let i = 0; i < b.length; i += 4) if (b[i + 3] > 200) { const k = `${b[i]},${b[i + 1]},${b[i + 2]}`; conta.set(k, (conta.get(k) ?? 0) + 1); }
  const soma = (c) => c[0] + c[1] + c[2];
  const cores = [...conta.entries()].map(([k, n]) => ({ c: k.split(',').map(Number), n }));
  // the body: the brightest colour that covers a real area (the outline around it is the darkest and the most frequent)
  const corpo = cores.filter((e) => e.n >= 8).sort((a, c) => soma(c.c) - soma(a.c))[0].c;
  const contorno = cores.sort((a, c) => soma(a.c) - soma(c.c))[0].c;
  const ehContorno = (i) => b[i] === contorno[0] && b[i + 1] === contorno[1] && b[i + 2] === contorno[2];
  const por = (x, y, cor) => { const i = (y * T + x) * 4; if (b[i + 3] > 200 && !ehContorno(i)) { b[i] = cor[0]; b[i + 1] = cor[1]; b[i + 2] = cor[2]; } };
  // only the mark in the middle of the body (the body's own shading below it stays)
  for (let y = 4; y <= 7; y++) for (let x = 5; x <= 10; x++) por(x, y, corpo);
  por(6, 7, contorno); por(9, 7, contorno);
  return b;
}

// THE ORDER IS THE CONTRACT with `src/entrada/icones.ts`
const quadros = [
  tile(0, 4), tile(0, 5), tile(0, 6), tile(0, 7),           // 0–3   Xbox A B X Y
  tile(16, 9), tile(16, 10), tile(16, 7), tile(16, 8),      // 4–7   LB RB LT RT
  tile(18, 5),                                              // 8     START / OPTIONS (the three lines)
  face('cruz', corDe(16, 23)), face('bola', corDe(16, 19)), face('quadrado', corDe(16, 21)), face('triangulo', corDe(16, 17)), // 9–12
  tile(18, 19), tile(18, 20), tile(18, 17), tile(18, 18),   // 13–16 L1 R1 L2 R2
  tile(1, 0), tile(6, 8),                                   // 17–18 the d-pad, the left stick
  // 19–24 THE DEVICE INDICATORS (lit, dim): the Xbox controller, the keyboard, the PlayStation controller
  tile(18, 2), tile(19, 2), tile(20, 22), tile(21, 22), semMarca(tile(18, 2)), semMarca(tile(19, 2)),
];
const tira = Buffer.alloc(quadros.length * T * T * 4);
quadros.forEach((q, n) => { for (let y = 0; y < T; y++) q.copy(tira, (y * quadros.length * T + n * T) * 4, y * T * 4, (y + 1) * T * 4); });
fs.mkdirSync('public/sprites', { recursive: true });
await sharp(tira, { raw: { width: quadros.length * T, height: T, channels: 4 } }).png().toFile(SAIDA);
await sharp(tira, { raw: { width: quadros.length * T, height: T, channels: 4 } }).resize(quadros.length * T * 6, T * 6, { kernel: 'nearest' }).flatten({ background: '#3a3f55' }).png().toFile('assets/raw/kenney-input-prompts-pixel/botoes-previa.png');
console.log(`${quadros.length} frames → ${SAIDA}`);
