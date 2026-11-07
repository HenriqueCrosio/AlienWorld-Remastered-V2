// 07/11 — stage 3: a generated head clip against the approved E3, frame by frame:
//  - `luz`: the mean brightness of the hull (non-glowing pixels) vs frame 0 (a clip that darkens is thrown out);
//  - `junta`: the neck's silhouette at the skull's joint (x 66–95: top/bottom rows) moved how far from frame 0 — the
//    animated skull is glued to the skin there, so the neck must stay put (or the frame gets re-glued by it);
//  - `cranio`: the skull's silhouette shift (its centroid, x < 66) — how much the gesture moves the head itself;
//  - `boca`: the orange glow's pixel count (how open the mouth reads) and `muda`: % of pixels changed from the previous
//    frame (a jump above ~30% reads as a pop).
//   node scripts/_serpente/_enguia-gesto-medir-clipe.mjs <dir-do-clipe> [<dir>...]
import fs from 'node:fs';
import sharp from 'sharp';

const brilha = (r, g, b) => Math.max(r, g, b) > 105 && Math.max(r, g, b) - Math.min(r, g, b) > 55;
const laranja = (r, g, b) => r > 150 && r > b + 80 && g < r - 30;
async function le(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}
function mede(img) {
  const { d, w, h } = img;
  let soma = 0, n = 0, cx = 0, cy = 0, nc = 0, boca = 0;
  const topo = [], base = [];
  for (let x = 66; x < Math.min(w, 96); x++) {
    let a = -1, b = -1;
    for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 128) { if (a < 0) a = y; b = y; }
    topo.push(a); base.push(b);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) continue;
    const r = d[i], g = d[i + 1], bl = d[i + 2];
    if (laranja(r, g, bl)) boca++;
    if (!brilha(r, g, bl)) { soma += (r + g + bl) / 3; n++; }
    if (x < 66) { cx += x; cy += y; nc++; }
  }
  return { luz: soma / n, topo, base, cx: cx / nc, cy: cy / nc, boca };
}
const muda = (A, B) => {
  let m = 0, t = 0;
  for (let i = 0; i < A.d.length; i += 4) {
    const a = A.d[i + 3] > 128, b = B.d[i + 3] > 128;
    if (!a && !b) continue;
    t++;
    if (a !== b || Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]) > 60) m++;
  }
  return (100 * m) / t;
};

for (const dir of process.argv.slice(2)) {
  const fs_ = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  const imgs = await Promise.all(fs_.map((f) => le(`${dir}/${f}`)));
  const M = imgs.map(mede), m0 = M[0];
  console.log(`\n${dir}`);
  M.forEach((m, i) => {
    const dj = m.topo.map((v, k) => (v < 0 || m0.topo[k] < 0 ? 0 : v - m0.topo[k]));
    const djb = m.base.map((v, k) => (v < 0 || m0.base[k] < 0 ? 0 : v - m0.base[k]));
    const med = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1);
    console.log(`  q${String(i).padStart(2)}  luz ${((100 * m.luz) / m0.luz).toFixed(0)}%  junta topo ${med(dj)} base ${med(djb)}  crânio dx ${(m.cx - m0.cx).toFixed(1)} dy ${(m.cy - m0.cy).toFixed(1)}  boca ${String(m.boca).padStart(3)}  muda ${i ? muda(imgs[i - 1], imgs[i]).toFixed(0) : '-'}%`);
  });
}
