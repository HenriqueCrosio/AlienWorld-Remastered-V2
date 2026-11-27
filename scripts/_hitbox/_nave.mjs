// THE SHIP'S HITBOX AGAINST ITS ART (27/11, the rebalance, step 2). For every ship model of today: the HULL = pixels
// opaque and identical in every frame (the human ships animate only the engine fire); the FIRE = what changes. The
// hitbox is the fixed 21×9 centred on the frame (`GameScene.HITBOX_NAVE`, `setSize(..., true)`). Measures the hull
// outside the box (touches and takes no damage) and the box with no hull under it (takes damage without touching), and
// draws each ship ×10 with the box. Usage: node scripts/_hitbox/_nave.mjs <out-dir>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] ?? '.';
const BOX = { w: 21, h: 9 };
const Z = 10;
const NAVES = [
  { nome: 'Terminus · CLÁSSICA', chave: 'a-laranja', pre: 'public/sprites/naves/humana-anim', n: 8 },
  { nome: 'Terminus · UNGOLIANT', chave: 'a-preta', pre: 'public/sprites/naves/humana-preta-anim', n: 8 },
  { nome: 'X-Aelo · CLÁSSICA', chave: 'jato-laranja', pre: 'public/sprites/ship-jato-anim', n: 9 },
  { nome: 'X-Aelo · REBELS', chave: 'jato-osso', pre: 'public/sprites/naves/jato-osso-anim', n: 9 },
  { nome: 'Charybdis (a manta)', chave: 'alien', pre: 'public/sprites/naves/alien-t2-anim', n: 10, nada: true },
];

const ler = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

const resumo = [];
for (const nave of NAVES) {
  const quadros = [];
  for (let i = 0; i < nave.n; i++) quadros.push(await ler(`${nave.pre}-${i}.png`));
  const { w, h } = quadros[0];
  if (quadros.some((q) => q.w !== w || q.h !== h)) throw new Error(`${nave.nome}: frames of different size`);
  // the box, centred on the frame like Arcade's setSize(w, h, true): offset = (frame - box) / 2
  const bx = (w - BOX.w) / 2, by = (h - BOX.h) / 2;
  const naCaixa = (x, y) => x + 0.5 > bx && x + 0.5 < bx + BOX.w && y + 0.5 > by && y + 0.5 < by + BOX.h;
  const casco = new Uint8Array(w * h); // 1 = hull (opaque + identical in every frame; the manta: opaque in EVERY frame)
  const algum = new Uint8Array(w * h); // opaque in some frame (hull + fire / fins)
  for (let p = 0; p < w * h; p++) {
    const a0 = quadros[0].data[p * 4 + 3];
    let todos = a0 > 0, igual = true, qualquer = false;
    for (const q of quadros) {
      const a = q.data[p * 4 + 3];
      if (a > 0) qualquer = true; else todos = false;
      for (let c = 0; c < 4; c++) if (q.data[p * 4 + c] !== quadros[0].data[p * 4 + c]) igual = false;
    }
    casco[p] = todos && (nave.nada || igual) ? 1 : 0;
    algum[p] = qualquer ? 1 : 0;
  }
  // measures
  let cascoFora = 0, cascoTotal = 0, caixaVazia = 0, caixaFogo = 0;
  const ext = { x0: w, x1: -1, y0: h, y1: -1 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (casco[p]) {
      cascoTotal++;
      if (!naCaixa(x, y)) cascoFora++;
      ext.x0 = Math.min(ext.x0, x); ext.x1 = Math.max(ext.x1, x); ext.y0 = Math.min(ext.y0, y); ext.y1 = Math.max(ext.y1, y);
    }
    if (naCaixa(x, y) && !casco[p]) { caixaVazia++; if (algum[p]) caixaFogo++; }
  }
  const casco_ = { w: ext.x1 - ext.x0 + 1, h: ext.y1 - ext.y0 + 1 };
  // how far the hull goes past the box on each side (+ = beyond the box, − = the box goes past the hull)
  const lados = {
    frente: ext.x1 + 1 - (bx + BOX.w), tras: bx - ext.x0, cima: by - ext.y0, baixo: ext.y1 + 1 - (by + BOX.h),
  };
  const r = {
    nave: nave.nome, quadro: `${w}×${h}`, casco: `${casco_.w}×${casco_.h}`, caixa: `${BOX.w}×${BOX.h} em (${bx},${by})`,
    cascoForaPct: Math.round((100 * cascoFora) / cascoTotal), caixaVaziaPct: Math.round((100 * caixaVazia) / (BOX.w * BOX.h)),
    caixaSoFogoPx: caixaFogo, lados,
  };
  resumo.push(r);

  // the drawing ×Z: frame 0 as is, the hull outside the box tinted amber, the empty box magenta, the box outline red
  const W = w * Z, H = h * Z, img = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / Z), sy = Math.floor(y / Z), p = sy * w + sx, o = (y * W + x) * 4;
    const q = quadros[0].data;
    let [R, G, B, A] = [q[p * 4], q[p * 4 + 1], q[p * 4 + 2], q[p * 4 + 3]];
    if (!A) [R, G, B, A] = (sx + sy) % 2 ? [22, 24, 30, 255] : [28, 30, 38, 255];
    if (casco[p] && !naCaixa(sx, sy)) [R, G, B] = [Math.min(255, R * 0.4 + 255 * 0.6), Math.min(255, G * 0.4 + 190 * 0.6), B * 0.4];
    if (naCaixa(sx, sy) && !casco[p]) [R, G, B] = [200, 40, 200];
    const borda = (Math.abs(x - bx * Z) < 2 || Math.abs(x - (bx + BOX.w) * Z) < 2) && y >= by * Z && y <= (by + BOX.h) * Z
      || (Math.abs(y - by * Z) < 2 || Math.abs(y - (by + BOX.h) * Z) < 2) && x >= bx * Z && x <= (bx + BOX.w) * Z;
    if (borda) [R, G, B] = [255, 40, 40];
    img[o] = R; img[o + 1] = G; img[o + 2] = B; img[o + 3] = A;
  }
  await sharp(img, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `nave-${nave.chave}.png`));
}
fs.writeFileSync(path.join(OUT, 'nave.json'), JSON.stringify(resumo, null, 2));
console.log(JSON.stringify(resumo, null, 1));
