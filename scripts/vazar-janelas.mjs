// Vaza as JANELAS do hangar (cutscene 3): remove o "espaço" pintado atrás do vidro
// para o parallax real do jogo aparecer através delas (pedido do Henrique, 2026-07-19).
//
// A regra é por COR, não por retângulo: dentro da faixa vertical das janelas,
// pixel da família TEAL (g e b acima de r — o espaço pintado) ou ESTRELA
// (muito claro / azul brilhante) vira alpha 0. O metal das colunas e molduras
// é marrom/cinza (r >= g), então sobrevive.
//
// Uso: node scripts/vazar-janelas.mjs <entrada.png> <saida.png>
import sharp from 'sharp';

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error('uso: node scripts/vazar-janelas.mjs <entrada.png> <saida.png>');
  process.exit(1);
}

// Faixa das janelas, MEDIDA no PNG 160x160 do lote 1 (lição 7: medir, não chutar).
const Y0 = 38, Y1 = 92, X0 = 38;

const img = sharp(entrada);
const { width, height } = await img.metadata();
const raw = await img.ensureAlpha().raw().toBuffer();

let limpos = 0;
for (let y = Y0; y <= Math.min(Y1, height - 1); y++) {
  for (let x = X0; x < width; x++) {
    const i = (y * width + x) * 4;
    const [r, g, b, a] = [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
    if (a === 0) continue;
    const teal = g >= r + 6 && b >= r + 2;           // o verde-espaço da janela
    const estrela = Math.min(r, g, b) > 170;          // pontos brancos
    const estrelaAzul = b > 140 && b > r + 30;        // pontos azuis
    if (teal || estrela || estrelaAzul) {
      raw[i + 3] = 0;
      limpos++;
    }
  }
}

// Despeckle: dentro da faixa, ilhas opacas minúsculas que não tocam a borda da
// faixa são resto do espaço pintado (marinho escuro que a regra de cor não pega).
// As molduras atravessam a faixa inteira, então sempre tocam a borda — sobrevivem.
const MAX_ILHA = 25;
const visto = new Uint8Array(width * height);
let ilhasRemovidas = 0;
for (let y = Y0; y <= Y1; y++) {
  for (let x = X0; x < width; x++) {
    const idx = y * width + x;
    if (visto[idx] || raw[idx * 4 + 3] === 0) continue;
    // flood fill do componente dentro da faixa
    const pilha = [idx];
    const comp = [];
    let tocaBorda = false;
    visto[idx] = 1;
    while (pilha.length) {
      const p = pilha.pop();
      comp.push(p);
      const px = p % width, py = (p / width) | 0;
      if (px === X0 || px === width - 1 || py === Y0 || py === Y1) tocaBorda = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < X0 || nx >= width || ny < Y0 || ny > Y1) continue;
        const n = ny * width + nx;
        if (!visto[n] && raw[n * 4 + 3] !== 0) { visto[n] = 1; pilha.push(n); }
      }
    }
    if (!tocaBorda && comp.length <= MAX_ILHA) {
      for (const p of comp) raw[p * 4 + 3] = 0;
      limpos += comp.length;
      ilhasRemovidas++;
    }
  }
}

await sharp(raw, { raw: { width, height, channels: 4 } }).png().toFile(saida);
console.log(`janelas vazadas: ${limpos} pixels limpos (${ilhasRemovidas} ilhas) na faixa y=${Y0}..${Y1}, x>=${X0}`);
