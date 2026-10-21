// BLOCO G · round 5 — the FOREGROUND rocks of the F1 (the silhouettes that pass IN FRONT of the ship, depth 60), cut from
// his Paisagem: the old ones were the ice spire tinted blue, and against the new ground they read as blue blots.
// Each rock is a window of the Paisagem strip around one of its peaks, MIRRORED (it must not echo the layer behind),
// shaped into a free-standing rock by an envelope that falls from the peak to the window's sides (with a ragged random
// walk, never a straight slope), and pushed to near-black (the nearest plane is the darkest), with a 1-px rim of the
// rock's lit edge on top. Out: public/sprites/f1-rocha-frente.png, -2, -3, -4 (the variants of one layer key).
//   node scripts/_g/_frente-rochas-f1.mjs [outDir=public/sprites] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT = 'public/sprites', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5'] = process.argv.slice(2);
const { data: tile, info } = await sharp('public/sprites/f1/chao-paisagem.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const P = info.width, H = info.height;
let semente = 5151;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

// the skyline (row of the first opaque pixel per column)
const ceu = Array.from({ length: P }, (_, x) => { let y = 0; while (y < H && tile[(y * P + x) * 4 + 3] === 0) y++; return y; });
// the peaks: local minima of the skyline over ±18 px, the 4 highest, kept ≥ 60 px apart
const picos = [];
for (let x = 0; x < P; x++) {
  let min = true;
  for (let d = -18; d <= 18 && min; d++) if (ceu[(x + d + P) % P] < ceu[x]) min = false;
  if (min && !picos.some((p) => Math.min(Math.abs(p - x), P - Math.abs(p - x)) < 60)) picos.push(x);
}
picos.sort((a, b) => ceu[a] - ceu[b]);
const ESCOLHIDOS = picos.slice(0, 4);
const ROCHA = { escurece: 0.32, aro: [30, 36, 48], larguras: [84, 66, 96, 58] };

const folha = [];
for (let k = 0; k < ESCOLHIDOS.length; k++) {
  const cx = ESCOLHIDOS[k], w = ROCHA.larguras[k], meia = w / 2;
  const topo = ceu[cx];
  const h = H - topo;
  // the envelope: allowed top per column = peak + (|dx| / half)^1.4 of the way down, plus a ragged walk (±2 px)
  let passeio = 0;
  const env = Array.from({ length: w }, (_, i) => {
    passeio = Math.max(-5, Math.min(5, passeio + (rnd() - 0.5) * 3.2));
    const u = Math.abs(i + 0.5 - meia) / meia;
    return topo + Math.pow(u, 3.2) * h + passeio * Math.min(1, u * 2.5);
  });
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w; i++) {
    // mirrored: column i of the rock takes column (cx + meia − i) of the strip
    const sx = Math.round(cx + meia - 1 - i + P) % P;
    const t = Math.max(Math.ceil(env[i]), ceu[sx]);
    for (let y = t; y < H; y++) {
      const s = (y * P + sx) * 4, o = ((y - topo) * w + i) * 4;
      const aro = y === t;
      for (let c = 0; c < 3; c++) buf[o + c] = aro ? ROCHA.aro[c] : Math.round(tile[s + c] * ROCHA.escurece);
      buf[o + 3] = 255;
    }
  }
  const nome = k === 0 ? 'f1-rocha-frente.png' : `f1-rocha-frente-${k + 1}.png`;
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, nome));
  folha.push({ input: await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(w * 3, h * 3, { kernel: 'nearest' }).png().toBuffer(), w: w * 3, h: h * 3 });
  console.log(nome, `${w}×${h} (peak at x ${cx}, top ${topo + 135})`);
}
fs.mkdirSync(FOLHA, { recursive: true });
const larg = folha.reduce((s, f) => s + f.w + 18, 18), alt = Math.max(...folha.map((f) => f.h)) + 36;
let x = 18;
await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: 52, g: 60, b: 80, alpha: 1 } } })
  .composite(folha.map((f) => { const c = { input: f.input, left: x, top: alt - 18 - f.h }; x += f.w + 18; return c; }))
  .png().toFile(path.join(FOLHA, 'rochas-frente.png'));
