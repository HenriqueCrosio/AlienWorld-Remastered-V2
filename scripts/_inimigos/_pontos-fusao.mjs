// 28/10 — THE FUSION'S THREE BITES ON THE ART, for the sheet: frames of `serpente-fusao-anim` at the size the game draws
// them (×0.63), zoomed; on each, the three points (`MORDIDAS_FUSAO`, a white cross) and the three bites in turn, each
// taken from the body the one before left (the organic bend, `DESTROCOS.organica.torto`), each in its colour:
// 1 neck, 2 chin, 3 skull.
//   node scripts/_inimigos/_pontos-fusao.mjs <out.png> [quadros=0,4,7] [zoom=3]
import sharp from 'sharp';
import { sorte, ruido, lasca, reduzir } from '../../src/systems/morte/pedacos.ts';
import { DESTROCOS } from '../../src/systems/morte/numerosDestrocos.ts';
import { MORDIDAS_FUSAO } from '../../src/entities/serpenteFusao.ts';

const [OUT, QUADROS = '0,4,7', Z = '3'] = process.argv.slice(2);
const ZOOM = Number(Z);
const ESC = 0.63;
const CORES = [[0x4f, 0xd1, 0xff], [0xff, 0x5a, 0xd1], [0xff, 0xe1, 0x4f]];
const L = DESTROCOS.lasca.chefe;

async function bitmap(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, cor: new Uint32Array(data.buffer, data.byteOffset, info.width * info.height).slice() };
}

const painéis = [];
for (const f of QUADROS.split(',').map(Number)) {
  const img = reduzir(await bitmap(`public/sprites/serpente-fusao-anim-${f}.png`), ESC, ESC, false, false);
  const { w, h } = img;
  const tirado = new Uint8Array(w * h);
  let atual = img;
  MORDIDAS_FUSAO.forEach((p, i) => {
    const cheios = atual.cor.filter((c) => c >>> 24 >= 128).length;
    const alvo = Math.min(L.max, Math.max(L.min, Math.round(cheios * L.fracao)));
    const r = sorte(1000 + 10 * f + i);
    const l = lasca(atual, [0, 1], alvo, ruido(w, h, 3, r), DESTROCOS.organica.torto, r, { x: w / 2 + p.x * ESC, y: h / 2 + p.y * ESC });
    if (!l) return;
    l.mascara.forEach((m, k) => m === 2 && (tirado[k] = i + 1));
    atual = { w, h, cor: atual.cor.map((c, k) => (l.mascara[k] === 2 ? 0 : c)) };
  });
  // the frame zoomed, on the F3's dark, the bites tinted over the art
  const W = w * ZOOM, H = h * ZOOM;
  const px = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = Math.floor(y / ZOOM) * w + Math.floor(x / ZOOM);
    const c = img.cor[k];
    let r = 0x0b, g = 0x0d, b = 0x14;
    if (c >>> 24 >= 128) [r, g, b] = [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
    if (tirado[k]) {
      const [cr, cg, cb] = CORES[tirado[k] - 1];
      [r, g, b] = [Math.round(r * 0.35 + cr * 0.65), Math.round(g * 0.35 + cg * 0.65), Math.round(b * 0.35 + cb * 0.65)];
    }
    const o = (y * W + x) * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
  }
  // the points: a white cross of 2 game px
  for (const p of MORDIDAS_FUSAO) {
    const cx = Math.round((w / 2 + p.x * ESC) * ZOOM), cy = Math.round((h / 2 + p.y * ESC) * ZOOM);
    for (let d = -2 * ZOOM; d <= 2 * ZOOM; d++) for (const [x, y] of [[cx + d, cy], [cx, cy + d]]) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const o = (y * W + x) * 4;
      px[o] = px[o + 1] = px[o + 2] = 255;
    }
  }
  painéis.push({ input: await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(), w: W, h: H, f });
}
const GAP = 6;
const total = painéis.reduce((s, p) => s + p.w, 0) + GAP * (painéis.length - 1);
let x = 0;
const comp = painéis.map((p) => {
  const c = { input: p.input, left: x, top: 0 };
  x += p.w + GAP;
  return c;
});
await sharp({ create: { width: total, height: painéis[0].h, channels: 4, background: '#05060a' } }).composite(comp).png().toFile(OUT);
console.log(OUT, `${total}x${painéis[0].h}`, 'quadros', QUADROS);
