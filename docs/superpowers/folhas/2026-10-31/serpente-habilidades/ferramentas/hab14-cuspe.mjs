// 02/11 (round 14) — his note on the shots: "no movimento de atirar, a cabeça verde e a cabeça laranja soltam um efeito
// muito forte e grande, quero algo mais discreto, mantendo o movimento das cabeças". The normal shots' clip (`tirosK`)
// carries what the generator PAINTED out of those two mouths: the orange's flame blast, burst rings and specks (frames
// 8–11), the green's jets (15–17). This takes out only that (the open, lit mouths are the gesture and stay), in boxes
// set by hand on the zoomed frames, by colour; each hole is filled from the clean neighbour frame (and shift, ±3 px)
// that best matches the ring of pixels around it — the body under the flame is the body of the frame next to it. The
// cyan's frames and every other frame are copied untouched. The discreet replacement is drawn by the mock.
//   node hab14-cuspe.mjs <tirosK-dir> <out-dir> [mascara=<png>]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));

const laranja = (r, g, b) => (r >= 150 && r - b >= 60 && r >= g) || (r >= 110 && r - g >= 40 && r - b >= 60);
const escuro = (r, g, b) => laranja(r, g, b) || (r >= 70 && r - g >= 30 && r - b >= 30); // the blast's dark-red edges
const verde = (r, g, b) => g >= 100 && g - r >= 40 && g - b >= 20;
// frame → the effect's boxes [x0, y0, x1, y1) in the 256² canvas, each with its colour test, and the clean neighbours
// (same clip) that fill the holes. `corte(y)`: inside the open mouth (x ≥ the line between the jaws' tips) the flame is
// not taken out but turned into the mouth's own lit inside, the orange of frames 9–11. `pinta`: loose specks (< 8 px,
// surrounded by nothing) left in the box go too — the boxes with it lie over empty space or her blue-grey coils.
const LIMPA = {
  8: { caixas: [{ b: [88, 70, 162, 110], teste: laranja, corte: (y) => 129 + ((y - 80) * 3) / 23, menos: 2, todos: true }], refs: [12, 13] },
  9: { caixas: [{ b: [0, 74, 132, 152], teste: laranja, corte: (y) => 96 + ((y - 82) * 7) / 24, menos: 0 }], refs: [12, 13] },
  10: { caixas: [{ b: [0, 84, 80, 152], teste: escuro, pinta: true }], refs: [12, 13] },
  11: { caixas: [{ b: [0, 78, 62, 152], teste: escuro, pinta: true }], refs: [12, 13] },
  15: { caixas: [{ b: [40, 62, 76, 104], teste: verde, pinta: true }], refs: [14, 18] },
  16: { caixas: [{ b: [0, 84, 48, 142], teste: verde, pinta: true }], refs: [14, 18] },
  17: { caixas: [{ b: [0, 112, 12, 152], teste: verde, pinta: true }], refs: [14, 18] },
};
// the mouth's lit inside (frames 9–11), from the dark throat up: by the flame pixel's brightness
const BRASA = [[70, 26, 22], [150, 52, 26], [206, 84, 36], [236, 118, 48], [250, 150, 74]];
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const brasa = (r, g, b, menos) => {
  const l = lum(r, g, b), k = l > 205 ? 4 : l > 160 ? 3 : l > 115 ? 2 : 1;
  return BRASA[Math.max(0, k - menos)];
};

const ler = async (f) => (await sharp(path.join(IN, `${f}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const masc = [];
for (let f = 0; f < n; f++) {
  const L = LIMPA[f];
  if (!L) { fs.copyFileSync(path.join(IN, `${f}.png`), path.join(OUT, `${f}.png`)); continue; }
  const { data, info } = await ler(f);
  const W = info.width, H = info.height;
  const buraco = new Uint8Array(W * H);
  const dentro = (x, y) => L.caixas.find(({ b: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1);
  for (const { b: [x0, y0, x1, y1], teste, corte, menos = 0, todos = false } of L.caixas) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] < 64 || !teste(data[i], data[i + 1], data[i + 2])) continue;
    if (corte && x >= corte(y)) { // inside the mouth: only the flame's pale core is toned down to the lit inside (the
      // mouth's own oranges and the head's lights stay), a step darker by the opening; `menos` darkens it all.
      // `todos` (frame 8, the mouth only starting to open, all flame): every flame pixel, down to a dark throat
      if (todos || lum(data[i], data[i + 1], data[i + 2]) > 150) {
        const c = brasa(data[i], data[i + 1], data[i + 2], menos + (x < corte(y) + 3 ? 1 : 0));
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
      }
      continue;
    }
    buraco[y * W + x] = 1;
  }
  // the effect's soft edge: a hole's 8-neighbour that is still tinted toward it (half the test's margins) goes too
  const borda = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (buraco[y * W + x]) continue;
    const cx = dentro(x, y);
    if (!cx || (cx.corte && x >= cx.corte(y))) continue;
    let viz = false;
    for (let dy = -1; dy <= 1 && !viz; dy++) for (let dx = -1; dx <= 1; dx++) if (buraco[(y + dy) * W + x + dx]) { viz = true; break; }
    if (!viz) continue;
    const i = (y * W + x) * 4, [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (cx.teste === verde ? g - r >= 22 && g - b >= 10 : r - b >= 35 && r >= g) borda.push(y * W + x);
  }
  for (const j of borda) buraco[j] = 1;
  const refs = await Promise.all(L.refs.map(ler));
  // each hole region (4-connected) is filled from the reference + shift that best matches its 3 px ring
  const visto = new Uint8Array(W * H);
  let cheio = 0;
  for (let s = 0; s < W * H; s++) {
    if (!buraco[s] || visto[s]) continue;
    const reg = [s]; visto[s] = 1;
    for (let q = 0; q < reg.length; q++) {
      const x = reg[q] % W, y = (reg[q] / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (buraco[j] && !visto[j]) { visto[j] = 1; reg.push(j); }
      }
    }
    const anel = new Set();
    for (const j of reg) {
      const x = j % W, y = (j / W) | 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = yy * W + xx;
        if (!buraco[k]) anel.add(k);
      }
    }
    let melhor = null;
    refs.forEach((R, ri) => {
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        let sad = 0;
        for (const k of anel) {
          const x = k % W, y = (k / W) | 0, xs = x - ox, ys = y - oy;
          if (xs < 0 || ys < 0 || xs >= W || ys >= H) { sad += 400; continue; }
          const a = k * 4, b = (ys * W + xs) * 4;
          for (let c = 0; c < 4; c++) sad += Math.abs(data[a + c] - R.data[b + c]);
        }
        const m = sad / Math.max(1, anel.size) + (Math.abs(ox) + Math.abs(oy)) * 0.5; // a hair toward no shift
        if (!melhor || m < melhor.m) melhor = { m, R, ox, oy };
      }
    });
    for (const j of reg) {
      const x = j % W, y = (j / W) | 0, xs = Math.min(W - 1, Math.max(0, x - melhor.ox)), ys = Math.min(H - 1, Math.max(0, y - melhor.oy));
      const a = j * 4, b = (ys * W + xs) * 4;
      for (let c = 0; c < 4; c++) data[a + c] = melhor.R.data[b + c];
      cheio++;
    }
  }
  // loose specks left in a `pinta` box: opaque 8-connected bits under 8 px with nothing opaque around them
  const marca = new Uint8Array(W * H);
  let pintas = 0;
  for (const { b: [x0, y0, x1, y1], pinta } of L.caixas) {
    if (!pinta) continue;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const s0 = y * W + x;
      if (marca[s0] || data[s0 * 4 + 3] < 64) continue;
      const reg = [s0]; marca[s0] = 1;
      for (let q = 0; q < reg.length && reg.length < 8; q++) {
        const xx0 = reg[q] % W, yy0 = (reg[q] / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = xx0 + dx, yy = yy0 + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (!marca[j] && data[j * 4 + 3] >= 64) { marca[j] = 1; reg.push(j); }
        }
      }
      if (reg.length < 8) for (const j of reg) { data[j * 4 + 3] = 0; buraco[j] = 1; pintas++; }
    }
  }
  if (pintas) console.log(`frame ${f}: ${pintas} px of loose specks cleared`);
  masc.push({ f, buraco, W, H });
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
  console.log(`frame ${f}: ${cheio} px refilled`);
}
// the masks, for checking (red = taken out), frame by frame side by side
if (opc.mascara) {
  const comp = [];
  for (let i = 0; i < masc.length; i++) {
    const { f, buraco, W, H } = masc[i];
    const { data } = await ler(f);
    const buf = Buffer.from(data);
    for (let j = 0; j < W * H; j++) if (buraco[j]) { buf[j * 4] = 255; buf[j * 4 + 1] = 0; buf[j * 4 + 2] = 60; buf[j * 4 + 3] = 255; }
    comp.push({ input: await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).resize(W * 2, H * 2, { kernel: 'nearest' }).png().toBuffer(), left: i * (W * 2 + 4), top: 0 });
  }
  await sharp({ create: { width: masc.length * (512 + 4), height: 512, channels: 4, background: '#1a1d26' } }).composite(comp).png().toFile(opc.mascara);
}
