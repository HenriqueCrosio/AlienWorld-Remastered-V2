// ESFUMA as bordas CORTADAS da doca, para elas se dissolverem no espaço em vez de mostrarem o
// corte reto do PNG (docs/HANDOFF.md: "sprite com BORDA RETA é veneno").
//
// A arte nova (2de00dd3) é DENSA: a rocha vai até as bordas do quadro (esquerda x=0, direita
// x=159) e tem um TOPO plano no lençol de rocha à direita (a partir de y~37, onde acima é
// transparente). Numa FASE isso não apareceria (o parallax cobre), mas numa CUTSCENE a doca fica
// parada contra o vazio e cada corte reto lê como "caixa de PNG flutuando".
//
// Esfuma SÓ a ROCHA nas bordas — nunca as estruturas (mastros, prédios), que ficam no miolo
// (x~15..72) e longe das bordas do quadro. Roda DEPOIS do install-sprite (ele reescreve o PNG).
import sharp from 'sharp';

const FADE = 6; // largura da rampa de alpha, em px
const arq = 'public/sprites/doca.png';

const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const idx = (x, y) => (y * W + x) * 4 + 3;
const A = (x, y) => data[idx(x, y)];
const rampa = (d) => Math.min(1, Math.max(0, (d + 1) / (FADE + 1)));

let tocados = 0;
const escala = (x, y, k) => {
  if (k >= 1) return;
  const i = idx(x, y);
  const novo = Math.round(data[i] * k);
  if (novo < data[i]) { data[i] = novo; tocados++; }
};

// 1. TOPO do lençol de rocha à direita (x>=72): o corte plano em y~37. Para cada coluna, acha o
//    primeiro pixel opaco e rampa os FADE de cima. Só rocha — as estruturas estão em x<72.
for (let x = 72; x < W; x++) {
  let y0 = -1;
  for (let y = 0; y < H; y++) if (A(x, y) > 20) { y0 = y; break; }
  if (y0 < 0) continue;
  for (let d = 0; d < FADE; d++) escala(x, y0 + d, rampa(d));
}

// 2. BORDA DIREITA: onde a rocha toca a moldura (x>=W-2), rampa as FADE colunas da direita.
for (let y = 0; y < H; y++) {
  let x1 = -1;
  for (let x = W - 1; x >= 0; x--) if (A(x, y) > 20) { x1 = x; break; }
  if (x1 < W - 2) continue; // só se o conteúdo foi CORTADO pela moldura
  for (let d = 0; d < FADE; d++) escala(x1 - d, y, rampa(d));
}

// 3. BORDA ESQUERDA: a rocha também encosta em x=0. As estruturas começam em x~15, então rampar
//    as ~5 colunas da esquerda pega só o paredão de rocha da esquerda.
for (let y = 0; y < H; y++) {
  let x0 = -1;
  for (let x = 0; x < W; x++) if (A(x, y) > 20) { x0 = x; break; }
  if (x0 > 1) continue;
  for (let d = 0; d < FADE; d++) escala(x0 + d, y, rampa(d));
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
console.log(`doca.png: bordas esfumadas (${tocados}px suavizados, rampa ${FADE}px)`);
