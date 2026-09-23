// MEDE a arte do predador antes de instalar (a arte manda na hitbox — nada de offset a olho).
// Para cada PNG: a caixa do alfa, e o MIOLO ACESO (o alvo) — o ponto de MAIOR DENSIDADE de pixels
// quentes (laranja: R alto, G médio, B baixo) numa janela de 25px, e a caixa dos pixels quentes a até
// 30px dele. Pixels quentes soltos (brilho de garra, olho) não puxam a medida: só a densidade conta.
//
//   node scripts/_f4/_medir-predador.mjs <png> [png ...]
import sharp from 'sharp';

for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const quente = new Uint8Array(W * H);
  let ax0 = W, ay0 = H, ax1 = -1, ay1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[i + 3] < 128) continue;
    ax0 = Math.min(ax0, x); ay0 = Math.min(ay0, y); ax1 = Math.max(ax1, x); ay1 = Math.max(ay1, y);
    if (r > 180 && g > 60 && g < 200 && b < 80 && r - g > 60) quente[y * W + x] = 1;
  }
  const R = 12;
  let melhor = -1, mx = 0, my = 0;
  for (let y = R; y < H - R; y += 2) for (let x = R; x < W - R; x += 2) {
    let s = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) s += quente[(y + dy) * W + x + dx];
    if (s > melhor) { melhor = s; mx = x; my = y; }
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0, sx = 0, sy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!quente[y * W + x] || Math.hypot(x - mx, y - my) > 30) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); n++; sx += x; sy += y;
  }
  const cx = Math.round(sx / n), cy = Math.round(sy / n);
  console.log(f);
  console.log(`  alfa  x=${ax0}..${ax1} y=${ay0}..${ay1} (${ax1 - ax0 + 1}×${ay1 - ay0 + 1})`);
  console.log(`  miolo x=${x0}..${x1} y=${y0}..${y1} (${x1 - x0 + 1}×${y1 - y0 + 1}) n=${n} centro=${cx},${cy} off=${cx - W / 2},${cy - H / 2}`);
}
