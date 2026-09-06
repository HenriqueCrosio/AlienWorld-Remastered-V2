// Acha as LÂMPADAS já PINTADAS na arte do hangar.
//
// As luzes vermelhas da Cutscene 3 não são objetos do jogo — elas estão pintadas dentro do
// `paint-bg-cut3.png`. Fazer elas piscarem não é arte nova: é medir onde estão e pôr brilho
// aditivo em cima, cada um tingido com a COR PRÓPRIA daquela lâmpada.
//
// Um pixel é "quente" quando o vermelho domina e o brilho passa do fundo da parede (a pintura
// tem luminância média 13,1 — qualquer coisa acima de 38 já é energia, não parede).
//
//   node scripts/_cut3/_medir-lampadas.mjs
//
// Medido em 2026-09-03: 17 aglomerados, 186 pixels no total. A pintura é espelhada, então eles
// saem em pares (L1↔L3, L2↔L4, L5↔L6, L7↔L12, L8↔L13, L9↔L10, L11↔L14).

import sharp from 'sharp';

const ARTE = 'public/sprites/paint-bg-cut3.png';
const MIN_PIXELS = 6; // abaixo disso é respingo da pintura, não lâmpada

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const { data, info } = await sharp(ARTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const quente = (x, y) => {
  const i = (y * W + x) * C;
  if (data[i + 3] < 200) return false;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return r > 90 && r - b > 45 && r - g > 25 && lum(r, g, b) > 38;
};

const visto = new Uint8Array(W * H);
const lampadas = [];

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (visto[i] || !quente(x, y)) continue;

    const pilha = [i];
    let minx = x, maxx = x, miny = y, maxy = y, n = 0, sr = 0, sg = 0, sb = 0;
    visto[i] = 1;

    while (pilha.length) {
      const p = pilha.pop();
      const py = (p / W) | 0, px = p % W;
      const q = (py * W + px) * C;
      n++; sr += data[q]; sg += data[q + 1]; sb += data[q + 2];
      if (px < minx) minx = px;
      if (px > maxx) maxx = px;
      if (py < miny) miny = py;
      if (py > maxy) maxy = py;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const k = qy * W + qx;
        if (visto[k] || !quente(qx, qy)) continue;
        visto[k] = 1;
        pilha.push(k);
      }
    }

    if (n < MIN_PIXELS) continue;

    const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
    lampadas.push({
      x: Math.round((minx + maxx) / 2),
      y: Math.round((miny + maxy) / 2),
      w: maxx - minx + 1,
      h: maxy - miny + 1,
      n,
      cor: `0x${hex(sr)}${hex(sg)}${hex(sb)}`,
    });
  }
}

// Ordena pelo tamanho: as maiores primeiro, que são as que mais pesam na tela.
lampadas.sort((a, b) => b.n - a.n);

console.log(`LÂMPADAS: ${lampadas.length}   (${lampadas.reduce((s, l) => s + l.n, 0)} pixels no total)\n`);
lampadas.forEach((l, i) => {
  const id = `L${i + 1}`.padStart(3);
  console.log(`${id}  x ${String(l.x).padStart(3)}  y ${String(l.y).padStart(3)}   ${l.w}x${l.h}   ${String(l.n).padStart(3)}px   ${l.cor}`);
});

// Pronto para colar no Interlude3Scene.
console.log('\n// [x, y, w, h, cor] — medido por _medir-lampadas.mjs');
console.log('private static readonly LAMPADAS: Array<[number, number, number, number, number]> = [');
lampadas.forEach((l) => console.log(`  [${l.x}, ${l.y}, ${l.w}, ${l.h}, ${l.cor}],`));
console.log('];');
