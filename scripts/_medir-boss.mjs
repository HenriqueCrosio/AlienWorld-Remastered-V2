// Remede a fortaleza da Fase 1 depois de trocar a arte: caixa de conteúdo de cada forma e a
// BOCA DO CANHÃO (o clarão do disparo), em px a partir do centro do quadro — que é a origem que
// o Phaser usa e a unidade em que Boss.MUZZLE_X/Y e Boss.BASE_Y_* são escritos.
//
// uso: node scripts/_medir-boss.mjs
import sharp from 'sharp';

const SCALE = 0.75;

async function raw(f) {
  const { data, info } = await sharp(`public/sprites/${f}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/** Caixa do conteúdo opaco. */
function caixa({ data, W, H }) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

for (const f of ['boss.png', 'boss-air.png']) {
  const q = await raw(f);
  const c = caixa(q);
  const cx = q.W / 2;
  const cy = q.H / 2;
  console.log(
    `${f} ${q.W}x${q.H} · conteúdo [${c.x0}..${c.x1}]x[${c.y0}..${c.y1}]\n` +
      `   do centro (${cx},${cy}): esq ${(c.x0 - cx).toFixed(1)} dir ${(c.x1 - cx).toFixed(1)} ` +
      `topo ${(c.y0 - cy).toFixed(1)} base ${(c.y1 - cy).toFixed(1)}\n` +
      `   JÁ ESCALADO (${SCALE}): meia-largura dir ${((c.x1 - cx) * SCALE).toFixed(1)} · ` +
      `base ${((c.y1 - cy) * SCALE).toFixed(1)} · altura ${((c.y1 - c.y0 + 1) * SCALE).toFixed(1)}`,
  );
}

// A BOCA: o clarão do disparo é o que o quadro de fogo tem e o de repouso não. Diferença por
// pixel, centroide ponderado pelo ganho de luz — o mesmo método do cometa (medir, não chutar).
for (const [fogo, calmo] of [
  ['boss-fire-anim-1.png', 'boss.png'],
  ['boss-air-fire-anim-0.png', 'boss-air.png'],
]) {
  const a = await raw(fogo);
  const b = await raw(calmo);
  let soma = 0, sx = 0, sy = 0;
  for (let p = 0; p < a.W * a.H; p++) {
    const lumA = (a.data[p * 4] + a.data[p * 4 + 1] + a.data[p * 4 + 2]) * (a.data[p * 4 + 3] / 255);
    const lumB = (b.data[p * 4] + b.data[p * 4 + 1] + b.data[p * 4 + 2]) * (b.data[p * 4 + 3] / 255);
    const g = lumA - lumB;
    if (g < 200) continue; // só o clarão branco, não o brilho fraco do olho
    const x = p % a.W;
    const y = Math.floor(p / a.W);
    soma += g;
    sx += x * g;
    sy += y * g;
  }
  const cx = a.W / 2;
  const cy = a.H / 2;
  console.log(
    `\n${fogo}: clarão em (${(sx / soma).toFixed(1)},${(sy / soma).toFixed(1)}) · ` +
      `do centro (${(sx / soma - cx).toFixed(1)},${(sy / soma - cy).toFixed(1)}) · ` +
      `MUZZLE escalado (${((sx / soma - cx) * SCALE).toFixed(1)},${((sy / soma - cy) * SCALE).toFixed(1)})`,
  );
}
