// 03/11 — his answer at the 3rd pause: the generator's painted spit in the A's rain clip (`cru2/chuvaM2`) goes, as the
// shots' went in round 14 ("pode limpar"). The clip carries what the generator PAINTED out of the three mouths at the
// strike: frame 10, three big jets (cyan, green, orange) blown to the left over the neighbour heads; frame 11, the loose
// streaks after them. This takes out only that — the open, lit mouths are the gesture and stay (inside the line between
// each mouth's jaw tips, `corte`, nothing is touched) — in boxes set by hand on the zoomed frames, by colour; each hole is
// filled from the clean neighbour frame (and shift, ±3 px) that best matches the ring of pixels around it (round 14's
// `hab14-cuspe.mjs`, the same filling). The other frames are copied untouched. The salvo itself is the cocoons.
//   node cuspe-chuva.mjs <chuvaM2-dir> <out-dir> [mascara=<png>]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));

// each jet's colour, its pale core included
const ciano = (r, g, b) => (b >= 150 && b - r >= 60) || (b >= 190 && g >= 170 && b - r >= 25);
const verde = (r, g, b) => (g >= 100 && g - r >= 40 && g - b >= 20) || (g >= 200 && g - b >= 25 && g - r >= 15);
const laranja = (r, g, b) => (r >= 150 && r - b >= 60 && r >= g) || (r >= 110 && r - g >= 40 && r - b >= 60) || (r >= 220 && g >= 150 && r - b >= 40);
// the soft edge still tinted toward the jet (half the test's margins)
const tinto = { ciano: (r, g, b) => b - r >= 30 && b >= g - 10, verde: (r, g, b) => g - r >= 22 && g - b >= 10, laranja: (r, g, b) => r - b >= 35 && r >= g };
const TESTE = { ciano, verde, laranja };
// frame → boxes [x0, y0, x1, y1) in the 256² canvas, each with its jet's colour; `corte(y)` (optional): the line
// between the mouth's jaw tips (the opening faces left) — at or right of it is kept. Frame 10's jets START inside the
// mouths (their pale core runs across the lit throat: cut at the jaw line it stayed as a flat bar), so there the box
// takes the whole open mouth and the throat comes back from the neighbour frames' open mouths (9 and 11, no jet there).
// `soltas`: the jets' loose grey and mauve specks the colour tests miss, cleared one by one — each checked to exist in
// this frame ONLY (not in 9 nor in 12): an automatic "small loose bit" sweep also took the art's own tooth tips and
// outline bits, which are just as small
const LIMPA = {
  10: {
    caixas: [
      { b: [0, 20, 50, 86], cor: 'ciano' },
      { b: [50, 10, 128, 72], cor: 'verde' },
      { b: [124, 22, 200, 92], cor: 'laranja' },
    ],
    soltas: [[75, 25], [76, 25], [74, 29], [75, 29], [97, 44], [90, 46], [91, 46], [6, 58], [7, 58], [10, 60]],
    refs: [9, 11],
  },
  11: {
    caixas: [
      { b: [0, 30, 26, 70], cor: 'ciano' },
      { b: [0, 70, 31, 92], cor: 'ciano' },
      { b: [40, 10, 100, 70], cor: 'verde' },
      { b: [20, 60, 40, 80], cor: 'verde' },
      { b: [104, 20, 170, 88], cor: 'laranja' },
      { b: [166, 66, 173, 76], cor: 'laranja' },
    ],
    soltas: [[10, 60], [78, 17], [57, 23]],
    refs: [9, 12],
  },
};

const ler = async (f, dir = IN) => (await sharp(path.join(dir, `${f}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const masc = [];
// the untouched frames first; then 11 before 10 — the references are read from the OUTPUT, so frame 10's throat comes
// from frame 11 already without its streaks
for (let f = 0; f < n; f++) if (!LIMPA[f]) fs.copyFileSync(path.join(IN, `${f}.png`), path.join(OUT, `${f}.png`));
for (const f of [11, 10]) {
  const L = LIMPA[f];
  const { data, info } = await ler(f);
  const W = info.width, H = info.height;
  const buraco = new Uint8Array(W * H);
  const fora = (cx, x, y) => !cx.corte || x < cx.corte(y);
  const dentro = (x, y) => L.caixas.find(({ b: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1);
  for (const cx of L.caixas) {
    const [x0, y0, x1, y1] = cx.b, teste = TESTE[cx.cor];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] >= 64 && teste(data[i], data[i + 1], data[i + 2]) && fora(cx, x, y)) buraco[y * W + x] = 1;
    }
  }
  // the jet's soft edge: a hole's 8-neighbour (in a box, outside the mouth) still tinted toward it goes too
  const borda = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (buraco[y * W + x]) continue;
    const cx = dentro(x, y);
    if (!cx || !fora(cx, x, y)) continue;
    let viz = false;
    for (let dy = -1; dy <= 1 && !viz; dy++) for (let dx = -1; dx <= 1; dx++) if (buraco[(y + dy) * W + x + dx]) { viz = true; break; }
    if (!viz) continue;
    const i = (y * W + x) * 4;
    if (data[i + 3] >= 64 && tinto[cx.cor](data[i], data[i + 1], data[i + 2])) borda.push(y * W + x);
  }
  for (const j of borda) buraco[j] = 1;
  const refs = await Promise.all(L.refs.map((r) => ler(r, OUT)));
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
    refs.forEach((R) => {
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
  for (const [x, y] of L.soltas ?? []) {
    data[(y * W + x) * 4 + 3] = 0;
    buraco[y * W + x] = 1;
  }
  masc.push({ f, buraco, W, H });
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
  console.log(`quadro ${f}: ${cheio} px preenchidos, ${L.soltas?.length ?? 0} pintas soltas tiradas`);
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
