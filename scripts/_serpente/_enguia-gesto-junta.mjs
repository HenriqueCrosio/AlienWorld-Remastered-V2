// 07/11 — stage 3, his note on the Echo (the mouth shut while reading): a step on top of the head where the skull meets
// the neck. The cause: the gesture NODS the head — shutting, the snout drops 4.5 px and the nape 2.6 px; gaping, they
// rise 3.9 and 2.7 — while the neck skin stays at the E3's height. Stretching only the nape to the E3 (the 1st try)
// turned the step into a hump. The fix re-glues each frame by its NAPE: the whole frame moves rigidly (pixels and
// normals, whole px) so its top edge over the nape (x 56–66) sits where the E3's does. The nod stays (the snout still
// dips or rises against the nape), the joint meets the skin.
//   node scripts/_serpente/_enguia-gesto-junta.mjs <pasta-do-gesto> <n-quadros>
// (the generated originals are kept once in <pasta>/original/ and always read from there)
import fs from 'node:fs';
import sharp from 'sharp';

const [PASTA, NQ] = process.argv.slice(2);
const n = Number(NQ), W = 96, H = 96, NUCA = [56, 66];
const orig = `${PASTA}/original`;
if (!fs.existsSync(orig)) {
  fs.mkdirSync(orig);
  for (let k = 0; k < n; k++) fs.copyFileSync(`${PASTA}/q${String(k).padStart(2, '0')}.png`, `${orig}/q${String(k).padStart(2, '0')}.png`);
  fs.copyFileSync(`${PASTA}/normais.png`, `${orig}/normais.png`);
}
const le = async (f) => (await sharp(f).ensureAlpha().toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true }));
const borda = (d, w, x, ox = 0, deBaixo = false) => {
  for (let i = 0; i < H; i++) { const y = deBaixo ? H - 1 - i : i; if (d[(y * w + ox + x) * 4 + 3] > 128) return y; }
  return -1;
};
const smooth = (t) => t * t * (3 - 2 * t);
const media = (f) => { let s = 0, c = 0; for (let x = NUCA[0]; x <= NUCA[1]; x++) { const v = f(x); if (v >= 0) { s += v; c++; } } return s / c; };
// (the reference is always the approved E3, padded like the frames — a gesture may start from another mouth, the agony
// from the shut one; every frame is re-glued, the E3 itself comes out as it is)
const e3 = await le('docs/superpowers/folhas/2026-11-07/enguia-gestos/cru/e3-96.png');
const nrm = await le(`${orig}/normais.png`), NW = nrm.info.width, nOut = Buffer.alloc(nrm.data.length);
const topoE = media((x) => borda(e3.data, W, x)), baseE = media((x) => borda(e3.data, W, x, 0, true));

for (let k = 0; k < n; k++) {
  const nome = `q${String(k).padStart(2, '0')}.png`, Q = await le(`${orig}/${nome}`), out = Buffer.alloc(Q.data.length);
  const d = Math.round(media((x) => borda(Q.data, W, x)) - topoE); // (+: the frame's nape sits lower → move it up)
  for (let y = 0; y < H; y++) {
    const ys = y + d;
    if (ys < 0 || ys >= H) continue;
    Q.data.copy(out, y * W * 4, ys * W * 4, (ys + 1) * W * 4);
    nrm.data.copy(nOut, (y * NW + k * W) * 4, (ys * NW + k * W) * 4, (ys * NW + k * W + W) * 4);
  }
  // the THROAT (the pipes' charge, his first look at it): asked to "swell", the generator dropped the whole underside —
  // 9–10 px below the E3 from x 30 to the joint — and the skull is drawn only to the joint, so the jaw's back ended in a
  // straight cut where the higher neck skin couldn't reach. Where the frame hangs more than 1.5 px below the E3 at the
  // nape, each column from x 30 to the joint gets its lower band (row 40 down to its bottom) squeezed so the bottom meets
  // the E3's at the joint, the weight growing toward it: the jaw now hangs from its hinge. Frames that don't hang are
  // left as they are (the Echo's).
  const B0 = 30, ANC = 40;
  if (media((x) => borda(out, W, x, 0, true)) - baseE > 1.5) {
    const src = Buffer.from(out), nSrc = Buffer.from(nOut);
    for (let x = B0; x < W; x++) {
      const bF = borda(src, W, x, 0, true), bE = borda(e3.data, W, x, 0, true);
      if (bF < 0 || bE < 0 || bF <= bE) continue;
      const w = x >= NUCA[1] ? 1 : smooth((x - B0) / (NUCA[1] - B0));
      const alvo = Math.round(bF - w * (bF - bE));
      if (alvo >= bF) continue;
      for (let y = ANC; y < H; y++) {
        const i = (y * W + x) * 4, j = (y * NW + k * W + x) * 4;
        if (y > alvo) { out[i + 3] = 0; nOut[j + 3] = 0; continue; }
        const ys = Math.round(ANC + ((y - ANC) * (bF - ANC)) / (alvo - ANC));
        const s = (ys * W + x) * 4, sn = (ys * NW + k * W + x) * 4;
        for (let c = 0; c < 4; c++) { out[i + c] = src[s + c]; nOut[j + c] = nSrc[sn + c]; }
      }
    }
  }
  // (nothing may fall off the frame)
  let perdidos = 0;
  for (let y = 0; y < H; y++) if (y - d < 0 || y - d >= H) for (let x = 0; x < W; x++) if (Q.data[(y * W + x) * 4 + 3] > 128) perdidos++;
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${PASTA}/${nome}`);
  const topo = media((x) => borda(out, W, x)) - topoE, base = media((x) => borda(out, W, x, 0, true)) - baseE;
  console.log(`${nome}: subiu ${d} px · nuca topo ${topo.toFixed(1)} · nuca base ${base.toFixed(1)} · ${perdidos} px perdidos`);
}
await sharp(nOut, { raw: { width: NW, height: H, channels: 4 } }).png().toFile(`${PASTA}/normais.png`);
