// 08/11 — THE ARENA SKY (spec 2026-11-08-cenario-casco-arena §2): his Act 1 painting, kept for the casco and the arena,
// darker and flatter ("farther" by light, never by size), at 384×216; and the drifting clouds cut from the same
// painting by brightness (the rocks are dark, so they drop out). He chose the darkness on the sheet (08/11, round 1:
// levels 1, 2 and 3 shown — "nivel 2"): only that one is baked now, as `ceu.png`, `nuvem-longe.png`, `nuvem-perto.png`.
// The clouds are 384 wide and wrap without a seam (a half-width crossfade toward the edges, see below).
//   node scripts/_cenario/_f3-ceu-assar.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/sprites/paint-bg-f3.png';
const OUT = 'public/sprites/f3casco';
const W = 384, H = 216;
// brightness × and contrast (toward the mean). The ones shown and not chosen: 1 = { 0.78, 0.9 }, 3 = { 0.48, 0.7 }.
const NIVEIS = { 2: { brilho: 0.62, contraste: 0.8 } };
// the two cloud layers: which transform of the painting, the brightness key, the max alpha
const NUVENS = {
// (the painting's luminance, measured: median 0.108, 75% 0.170, 90% 0.251 — the key spans median → 90%)
// (`desce` wraps rows around: it leaves a hard horizontal seam where the wrap falls — keep it 0; the mirrors suffice)
  longe: { espelhaH: true, espelhaV: false, desce: 0, lum0: 0.09, lum1: 0.25, aMax: 0.45 },
// (no vertical flip for the near one: flipped, its gas sat in the lower half, behind the casco; it starts 211 px off and
// drifts, so it never sits on the painting for long)
  perto: { espelhaH: false, espelhaV: false, desce: 0, lum0: 0.12, lum1: 0.3, aMax: 0.3 },
};

fs.mkdirSync(OUT, { recursive: true });
const { data: src, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== W || info.height !== H) throw new Error(`painting is ${info.width}×${info.height}, expected ${W}×${H}`);
const media = [0, 1, 2].map((c) => { let s = 0; for (let i = c; i < src.length; i += 3) s += src[i]; return s / (W * H); });
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

for (const [n, { brilho, contraste }] of Object.entries(NIVEIS)) {
  const ceu = Buffer.alloc(W * H * 3);
  for (let i = 0; i < ceu.length; i++) {
    const c = i % 3;
    ceu[i] = Math.max(0, Math.min(255, Math.round((media[c] + (src[i] - media[c]) * contraste) * brilho)));
  }
  await sharp(ceu, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUT}/ceu.png`);

  for (const [nome, k] of Object.entries(NUVENS)) {
    const meia = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = k.espelhaH ? W - 1 - x : x;
        const sy0 = (y + k.desce) % H;
        const sy = k.espelhaV ? H - 1 - sy0 : sy0;
        const j = (sy * W + sx) * 3, o = (y * W + x) * 4;
        // the key reads the ORIGINAL painting's light (the darkened sky would key almost nothing)
        const l = lum(src[j], src[j + 1], src[j + 2]);
        const a = Math.max(0, Math.min(1, (l - k.lum0) / (k.lum1 - k.lum0))) * k.aMax;
        // the colour halfway between the painting and this level's sky: gas lit a little nearer than the sky behind
        const m = (1 + brilho) / 2;
        meia[o] = Math.round(src[j] * m); meia[o + 1] = Math.round(src[j + 1] * m); meia[o + 2] = Math.round(src[j + 2] * m);
        meia[o + 3] = Math.round(a * 255);
      }
    }
    // THE WRAP WITHOUT A MIRROR (a mirrored pair reads as a Rorschach blot once it drifts): toward both edges the cut
    // crossfades into itself shifted by half a width. At x = 0 the tile shows column W/2, at x = W−1 column W/2−1 —
    // neighbours, so the TileSprite wraps seamlessly. Only a BAND at each edge blends (a full-width blend showed the
    // bright core twice per tile: a pattern every 192 px); the rest keeps the cut as it is.
    const BANDA = 72;
    const suave = (t) => t * t * (3 - 2 * t);
    const tile = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const w = suave(Math.min(1, (x + 0.5) / BANDA, (W - x - 0.5) / BANDA));
        const a = (y * W + x) * 4, b = (y * W + ((x + W / 2) % W)) * 4;
        const aa = meia[a + 3] * w, ab = meia[b + 3] * (1 - w), at = aa + ab;
        for (let c = 0; c < 3; c++) tile[a + c] = at > 0 ? Math.round((meia[a + c] * aa + meia[b + c] * ab) / at) : 0;
        tile[a + 3] = Math.round(at);
      }
    }
    await sharp(tile, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/nuvem-${nome}.png`);
  }

  // the Atmosfera colours, the cutscenes' recipe: fog = mean of the mid-dark tones ×1.5 + a cool touch; halo = mean of
  // what is warm and lit
  const nev = [0, 0, 0], hal = [0, 0, 0];
  let nn = 0, nh = 0;
  for (let i = 0; i < ceu.length; i += 3) {
    const r = ceu[i], g = ceu[i + 1], b = ceu[i + 2], l = lum(r, g, b);
    if (l >= 0.08 && l <= 0.3) { nev[0] += r; nev[1] += g; nev[2] += b; nn++; }
    if (src[i] >= 150 && src[i] > src[i + 2]) { hal[0] += src[i]; hal[1] += src[i + 1]; hal[2] += src[i + 2]; nh++; }
  }
  const nevoa = nev.map((v, c) => Math.min(255, Math.round((v / Math.max(1, nn)) * 1.5 + [0, 4, 12][c])));
  const halo = hal.map((v) => Math.round(v / Math.max(1, nh)));
  console.log(`nivel ${n}: nevoa [${nevoa}] halo [${halo}] (${nn} px médios, ${nh} px quentes)`);
}
