// BLOCO I, etapa 3 (13/11) — the DAWN menu painting (the Leviathan fallen in the valley), reduced from HIS original at
// a density k (1 = the game's 384×216; 4 = 1536×864, the HD layer). ONE layer: nothing passes behind this painting.
// The SAME crop as the night menu (`_camadas.mjs`): 16:9 at full height, the 186 px come off the left, so the citadel
// lands on the same pixels in both menus. Reduced from the original once (lanczos3).
// Plus the `luz` mask (part B): the painting's own brightness — 0 on the black silhouettes (the foreground, the
// spires), 1 on the sky and the painted mist — so the living mist and the sun rays never cover a silhouette. Baked at
// half the layer's resolution (it is soft), white with the mask in the alpha.
//   node scripts/_menu/_camadas-amanhecer.mjs            (bakes k4 and k1 into public/sprites/menu-amanhecer/)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CAIXA_LAVA, brumaNaCarcaca, ehFogo, ehLava, mascaraLuz, mascaraNevoa, naCarcaca } from '../../src/menu/amanhecer/numerosAmanhecer.ts';

const ORIG = 'assets/raw/Fortaleza em ruínas sob tempestade.png';
const CORTE = { left: 186, top: 0, width: 1582, height: 890 };
const m = await sharp(ORIG).metadata();
if (m.width !== 1768 || m.height !== 890) throw new Error(`the original changed size: ${m.width}×${m.height} (expected 1768×890)`);

for (const k of [4, 1]) {
  const dir = `public/sprites/menu-amanhecer/k${k}`;
  fs.mkdirSync(dir, { recursive: true });
  const arq = path.join(dir, 'pintura.png');
  await sharp(ORIG).extract(CORTE).resize(384 * k, 216 * k, { kernel: 'lanczos3' }).removeAlpha().png({ compressionLevel: 9 }).toFile(arq);
  console.log(`k${k}: ${384 * k}×${216 * k} → ${arq} (${(fs.statSync(arq).size / 1024).toFixed(0)} KB)`);

  // the mask: the brightness of the painting, softened (a 1.2-px blur at the mask's resolution), at k/2 (k1: at 1)
  const mk = Math.max(1, k / 2), w = 384 * mk, h = 216 * mk;
  const cinza = await sharp(ORIG).extract(CORTE).resize(w, h, { kernel: 'lanczos3' }).removeAlpha().greyscale().blur(1.2).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = Math.round(255 * mascaraLuz(cinza[i]));
  const arqLuz = path.join(dir, 'luz.png');
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(arqLuz);
  console.log(`k${k}: a máscara ${w}×${h} → ${arqLuz} (${(fs.statSync(arqLuz).size / 1024).toFixed(0)} KB)`);

  // the `nevoa` mask: the PAINTED mist (grey, mid brightness) — the living mist only drifts over it; softened after
  const cor = await sharp(ORIG).extract(CORTE).resize(w, h, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
  const cru = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) cru[i] = Math.round(255 * mascaraNevoa(cor[i * 3], cor[i * 3 + 1], cor[i * 3 + 2]));
  // (sharp hands a 1-channel blur back as 3 channels: take the first, or every row lands on the wrong pixels)
  const macio = await sharp(cru, { raw: { width: w, height: h, channels: 1 } }).blur(2 * mk).extractChannel(0).raw().toBuffer();
  if (macio.length !== w * h) throw new Error(`the mist mask came out with ${macio.length} bytes, expected ${w * h}`);
  const nev = Buffer.alloc(w * h * 4, 255);
  // … and the carcass keeps almost clear of it (the ellipse of `CARCACA`, in game px)
  for (let i = 0; i < w * h; i++) nev[i * 4 + 3] = Math.round(macio[i] * brumaNaCarcaca(((i % w) + 0.5) / mk, (Math.floor(i / w) + 0.5) / mk));
  const arqNev = path.join(dir, 'nevoa.png');
  await sharp(nev, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(arqNev);
  console.log(`k${k}: a máscara da névoa → ${arqNev} (${(fs.statSync(arqNev).size / 1024).toFixed(0)} KB)`);

  // ── THE FIRES AND THE LAVA (part B, round 2) ────────────────────────────────────────────────────────────────────
  // Measured at the game's resolution (384×216), the same list for both densities: every group of fire-coloured
  // pixels (`ehFogo`), with its box and area in game px; the ones inside the carcass's ellipse are LAVA.
  if (k === 4) {
    const g = await sharp(ORIG).extract(CORTE).resize(384, 216, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
    const quente = new Uint8Array(384 * 216);
    for (let i = 0; i < 384 * 216; i++) quente[i] = ehFogo(g[i * 3], g[i * 3 + 1], g[i * 3 + 2]) ? 1 : 0;
    const visto = new Uint8Array(384 * 216), grupos = [];
    for (let i0 = 0; i0 < 384 * 216; i0++) {
      if (!quente[i0] || visto[i0]) continue;
      const pilha = [i0];
      visto[i0] = 1;
      let x0 = 384, y0 = 216, x1 = 0, y1 = 0, n = 0;
      while (pilha.length) {
        const i = pilha.pop(), x = i % 384, y = Math.floor(i / 384);
        n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= 384 || yy >= 216) continue;
          const j = yy * 384 + xx;
          if (quente[j] && !visto[j]) { visto[j] = 1; pilha.push(j); }
        }
      }
      grupos.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
    }
    const centro = (q) => [q.x + q.w / 2, q.y + q.h / 2];
    const lava = grupos.filter((q) => naCarcaca(...centro(q))).sort((a, b) => b.n - a.n);
    const fogos = grupos.filter((q) => !naCarcaca(...centro(q))).sort((a, b) => b.n - a.n);
    globalThis.__dados = { fogos, lava };
    console.log(`os focos: ${fogos.length} de fogo (o maior ${fogos[0]?.n} px²), ${lava.length} de lava (${lava.reduce((s, q) => s + q.n, 0)} px²)`);
  }

  // The LAVA PUT OUT: inside the carcass's box, every lava pixel (and its warm fringe) replaced by what is around it
  // (diffusion from the neighbours that do not change: behind the crack there is hull). The piece carries only those
  // pixels, soft at the edge; at run time it sits over the painting and BREATHES (the lava shows through it).
  const C = CAIXA_LAVA, bx = C.x * k, by = C.y * k, bw = C.w * k, bh = C.h * k;
  const cx = await sharp(ORIG).extract(CORTE).resize(384 * k, 216 * k, { kernel: 'lanczos3' }).removeAlpha().extract({ left: bx, top: by, width: bw, height: bh }).raw().toBuffer();
  const N = bw * bh;
  let falta = new Uint8Array(N);
  // only INSIDE the carcass's ellipse: the fires of the bridges and of the ruins around it are fire, and stay lit
  for (let i = 0; i < N; i++) {
    const gx = C.x + ((i % bw) + 0.5) / k, gy = C.y + (Math.floor(i / bw) + 0.5) / k;
    falta[i] = naCarcaca(gx, gy) && ehLava(cx[i * 3], cx[i * 3 + 1], cx[i * 3 + 2]) ? 1 : 0;
  }
  // the fringe: the crack's glow on the hull around it (k px at the layer's density)
  for (let p = 0; p < Math.max(1, Math.round(k * 0.75)); p++) {
    const d = falta.slice();
    for (let i = 0; i < N; i++) {
      if (falta[i]) continue;
      const x = i % bw, y = Math.floor(i / bw);
      if ((x > 0 && falta[i - 1]) || (x < bw - 1 && falta[i + 1]) || (y > 0 && falta[i - bw]) || (y < bh - 1 && falta[i + bw])) d[i] = 1;
    }
    falta = d;
  }
  const mascara = falta.slice();
  const cor2 = Float32Array.from(cx);
  for (let passe = 0; passe < 400 && falta.some((v) => v); passe++) {
    const prox = falta.slice();
    for (let i = 0; i < N; i++) {
      if (!falta[i]) continue;
      const x = i % bw, y = Math.floor(i / bw);
      let r = 0, gg = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
        const j = yy * bw + xx;
        if (falta[j]) continue;
        r += cor2[j * 3]; gg += cor2[j * 3 + 1]; b += cor2[j * 3 + 2]; n++;
      }
      if (!n) continue;
      cor2[i * 3] = r / n; cor2[i * 3 + 1] = gg / n; cor2[i * 3 + 2] = b / n;
      prox[i] = 0;
    }
    falta = prox;
  }
  const alfa = await sharp(Buffer.from(mascara.map((v) => v * 255)), { raw: { width: bw, height: bh, channels: 1 } }).blur(Math.max(0.5, k * 0.35)).extractChannel(0).raw().toBuffer();
  const peca = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    peca[i * 4] = Math.round(cor2[i * 3]); peca[i * 4 + 1] = Math.round(cor2[i * 3 + 1]); peca[i * 4 + 2] = Math.round(cor2[i * 3 + 2]);
    peca[i * 4 + 3] = alfa[i];
    // nothing but the piece: the invisible pixels carry no colour (the PNG is a fifth of the size)
    if (!alfa[i]) peca[i * 4] = peca[i * 4 + 1] = peca[i * 4 + 2] = 0;
  }
  const arqLava = path.join(dir, 'lava-apagada.png');
  await sharp(peca, { raw: { width: bw, height: bh, channels: 4 } }).png({ compressionLevel: 9 }).toFile(arqLava);
  console.log(`k${k}: a lava apagada ${bw}×${bh} → ${arqLava} (${(fs.statSync(arqLava).size / 1024).toFixed(0)} KB)`);
  fs.writeFileSync(path.join(dir, 'dados.json'), JSON.stringify(globalThis.__dados));
}
