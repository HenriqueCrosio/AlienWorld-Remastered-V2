// A RÉGUA DO GUARDIÃO: onde está a criatura e onde está a MASSA VERMELHA (o alvo) em cada arte.
// O critério do vermelho é o mesmo do `find-pad` (a<=60 fora, r>90, r−g>40, r−b>40), e a massa é o
// maior aglomerado dele — os pingos de sangue e as luzes soltas do casco ficam de fora.
//
//   node scripts/_f4/_medir-guardiao.mjs
import sharp from 'sharp';

const RAW = 'assets/raw/anim-guardiao-novo';

async function medir(src, extract) {
  let img = sharp(src).ensureAlpha();
  if (extract) img = img.extract(extract);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const alfa = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
  const verm = new Uint8Array(W * H);
  let aceso = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 60) {
        alfa.x0 = Math.min(alfa.x0, x); alfa.x1 = Math.max(alfa.x1, x);
        alfa.y0 = Math.min(alfa.y0, y); alfa.y1 = Math.max(alfa.y1, y);
      }
      if (a > 60 && r > 90 && r - g > 40 && r - b > 40) verm[y * W + x] = 1;
      // "aceso": o miolo QUENTE — vermelho claro, laranja ou amarelo. É o alvo que o jogador lê.
      if (a > 60 && r > 170 && r - b > 60) aceso++;
    }
  }
  // O maior aglomerado (8-vizinhos) do vermelho.
  const seen = new Uint8Array(W * H);
  let best = null;
  for (let p = 0; p < W * H; p++) {
    if (!verm[p] || seen[p]) continue;
    const pilha = [p]; seen[p] = 1;
    const c = { n: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, sx: 0, sy: 0 };
    while (pilha.length) {
      const q = pilha.pop();
      const x = q % W, y = (q / W) | 0;
      c.n++; c.sx += x; c.sy += y;
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (verm[k] && !seen[k]) { seen[k] = 1; pilha.push(k); }
      }
    }
    if (!best || c.n > best.n) best = c;
  }
  const cx = W / 2, cy = H / 2;
  return {
    tam: `${W}x${H}`,
    alfa: `x=${alfa.x0}..${alfa.x1} y=${alfa.y0}..${alfa.y1}`,
    centroAlfa: [((alfa.x0 + alfa.x1) / 2).toFixed(1), ((alfa.y0 + alfa.y1) / 2).toFixed(1)],
    massa: best && `x=${best.x0}..${best.x1} y=${best.y0}..${best.y1} (${best.n}px)`,
    centroideMassa: best && [(best.sx / best.n).toFixed(1), (best.sy / best.n).toFixed(1)],
    offDoCentro: best && [(best.sx / best.n - cx).toFixed(1), (best.sy / best.n - cy).toFixed(1)],
    aceso,
  };
}

console.log('ANTIGO estático', await medir('public/sprites/guardiao.png'));
console.log('ANTIGO sheet q0', await medir('public/sprites/guardiao-idle-sheet.png', { left: 0, top: 0, width: 256, height: 256 }));
console.log('NOVO estático  ', await medir(`${RAW}/estatico.png`));
console.log('NOVO destruído ', await medir(`${RAW}/destruido.png`));
for (const lote of ['idle', 'morte', 'explode']) {
  for (let i = 0; i < 9; i++) {
    const m = await medir(`${RAW}/${lote}-${i}.png`);
    console.log(`${lote}-${i}`.padEnd(10), m.alfa.padEnd(24), 'massa', String(m.massa).padEnd(34), 'off', m.offDoCentro, 'aceso', m.aceso);
  }
}
