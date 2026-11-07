// The E3 head's extra views (the turn-over): the inputs for the PixelLab paths.
//   node scripts/_serpente/_enguia-cabeca-8dir.mjs prepara
// Writes into folhas/2026-11-07/enguia-cabeca-8dir/cru/:
//   deitada-96.png — the approved head padded to 96×96 (snout left, as drawn)
//   de-pe-96.png   — the same head stood up (snout UP, dorsal to the right), padded to 96×96: turning it about the
//                    vertical axis (the 8-direction tool) is rolling the skull about its own long axis
import fs from 'node:fs';
import sharp from 'sharp';

const BASE = 'docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png';
const DIR = 'docs/superpowers/folhas/2026-11-07/enguia-cabeca-8dir';
const CRU = `${DIR}/cru`;

const pad96 = async (buf) => {
  const m = await sharp(buf).metadata();
  return sharp(buf).extend({
    top: Math.floor((96 - m.height) / 2), bottom: Math.ceil((96 - m.height) / 2),
    left: Math.floor((96 - m.width) / 2), right: Math.ceil((96 - m.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
};

const [cmd] = process.argv.slice(2);
if (cmd === 'prepara') {
  fs.mkdirSync(CRU, { recursive: true });
  const base = await sharp(BASE).ensureAlpha().png().toBuffer();
  fs.writeFileSync(`${CRU}/deitada-96.png`, await pad96(base));
  // (sharp's rotate(90) is clockwise: the snout, pointing left, ends pointing up; the dorsal ends on the right)
  const dePe = await sharp(base).rotate(90).png().toBuffer();
  fs.writeFileSync(`${CRU}/de-pe-96.png`, await pad96(dePe));
  for (const f of ['deitada-96', 'de-pe-96']) {
    const b = fs.readFileSync(`${CRU}/${f}.png`);
    console.log(f, b.length, 'bytes');
  }
} else if (cmd === 'rola') {
  // Path D: the approved art itself rolled about its chord (the neck joint x 66 → the snout), like the body's cylinder.
  // Every opaque run of a column (the upper jaw, the lower jaw, a tooth) is its own elliptic section around its centre;
  // the hidden side is the drawn side mirrored (she is symmetric). A z-buffer keeps the nearest surface.
  const K = Number(process.argv[4] ?? 0.9); // section depth / height
  const { data, info } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, CX = 66;
  const op = (x, y) => data[(y * W + x) * 4 + 3] > 128;
  const meio = (x) => { let a = -1, b = -1; for (let y = 0; y < H; y++) if (op(x, y)) { if (a < 0) a = y; b = y; } return a < 0 ? null : (a + b + 1) / 2; };
  let x0 = 0; while (meio(x0) == null) x0++;
  const p0 = { x: x0, y: meio(x0) }, p1 = { x: CX, y: meio(CX) };
  const eixo = (x) => p0.y + ((p1.y - p0.y) * (x - p0.x)) / (p1.x - p0.x);
  const graus = (process.argv[3] ?? '0,30,60,90,120,150,180').split(',').map(Number);
  fs.mkdirSync(`${CRU}/d-rola`, { recursive: true });
  for (const g of graus) {
    const fi = (g * Math.PI) / 180, cf = Math.cos(fi), sf = Math.sin(fi);
    const out = Buffer.alloc(W * H * 4), zb = new Float32Array(W * H).fill(-1e9);
    for (let x = 0; x < W; x++) {
      const p = x < CX ? eixo(x) : null;
      for (let y = 0; y < H; ) {
        if (!op(x, y)) { y++; continue; }
        let t = y; while (y < H && op(x, y)) y++;
        const b = y - 1;
        if (p == null) { // the neck (x ≥ 66) is the skin's: copied as drawn, behind everything
          for (let r = t; r <= b; r++) { const i = (r * W + x) * 4; if (zb[r * W + x] < -1e8) { data.copy(out, i, i, i + 4); zb[r * W + x] = -1e8 + 1; } }
          continue;
        }
        const a = (b - t + 1) / 2, c = (t + b + 1) / 2, U0 = p - c, w = K * a;
        for (let k = -400; k <= 400; k++) {
          const th = (k / 400) * Math.PI;
          const U = U0 + a * Math.cos(th), Z = w * Math.sin(th);
          const Ur = U * cf - Z * sf, Zr = Z * cf + U * sf;
          const Y = Math.floor(p - Ur);
          if (Y < 0 || Y >= H) continue;
          // (read by ARC LENGTH round the section, as the body mid-roll: the plain projection smeared the few dorsal rows
          // into a flat band across the top view)
          // (eased by sin²φ like the body: at 0 and 180 it is the projection, the art exactly as drawn)
          const rP = c - a * Math.cos(Math.abs(th)), rA = t + (Math.abs(th) / Math.PI) * (b - t + 1), wA = sf * sf;
          const row = Math.min(b, Math.max(t, Math.floor(rP * (1 - wA) + rA * wA)));
          const j = Y * W + x;
          if (Zr <= zb[j]) continue;
          zb[j] = Zr;
          const s = (row * W + x) * 4;
          data.copy(out, j * 4, s, s + 4);
        }
      }
    }
    const nome = `${CRU}/d-rola/${String(g).padStart(3, '0')}.png`;
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(nome);
  }
  console.log('d-rola:', graus.join(' '), 'K', K, 'eixo', p0, p1);
} else if (cmd === 'previa') {
  // The sheet's motion preview: each path's views swapped by φ while the head swings a U-turn about its neck joint
  // (heading left → down → right), turned by the maquete's RotSprite (`amplia8`). Real speed (the turn in 0.64 s, as the
  // maquete's arrival today), then 4× slower. One panel per path, side by side → `previa.mp4`.
  const { amplia8, fonte8 } = await import('./enguia/arte.mjs');
  const { execFileSync } = await import('node:child_process');
  const lerV = async (f, flop = false) => {
    let im = sharp(`${CRU}/${f}`).ensureAlpha();
    const m = await sharp(`${CRU}/${f}`).metadata();
    im = im.extract({ left: 0, top: 0, width: Math.min(96, m.width), height: Math.min(96, m.height) });
    if (flop) im = sharp(await im.png().toBuffer()).flop();
    const { data, info } = await im.raw().toBuffer({ resolveWithObject: true });
    return { data, w: info.width, h: info.height, m8: amplia8(data, info.width, info.height) };
  };
  const PIV = { x: 66, y: 39.5 }, FOC = { x: 10, y: 47 }; // the skull's chord in the 96×96 frame (neck joint, snout)
  const u = (() => { const dx = FOC.x - PIV.x, dy = FOC.y - PIV.y, m = Math.hypot(dx, dy); return { x: dx / m, y: dy / m }; })();
  const dPad = async (g) => { // path D's 96×64 views → the 96×96 frame
    const b = await sharp(`${CRU}/d-rola/${String(g).padStart(3, '0')}.png`).extend({ top: 16, bottom: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    fs.writeFileSync(`${CRU}/d-rola/${String(g).padStart(3, '0')}-96.png`, b);
    return `d-rola/${String(g).padStart(3, '0')}-96.png`;
  };
  const O = 'deitada-96.png';
  const CAMINHOS = {
    A: [[0, O], [45, 'a-deitada/north-west.png'], [90, 'a-deitada/north.png'], [135, 'a-deitada/north-west.png', 'eixo'], [180, O, 'eixo']],
    AC: [[0, O], [22, 'c3-ponte-a/2.png'], [34, 'c3-ponte-a/3.png'], [52, 'c3-ponte-a/4.png'], [90, 'a-deitada/north.png'],
      [128, 'c3-ponte-a/4.png', 'eixo'], [146, 'c3-ponte-a/3.png', 'eixo'], [158, 'c3-ponte-a/2.png', 'eixo'], [180, O, 'eixo']],
    B: [[0, O], [45, 'b-deitada/south-west.png'], [90, 'b-deitada/south.png'], [135, 'b-deitada/south-west.png', 'h'], [180, O, 'h']],
    D: [[0, O], [30, await dPad(30)], [60, await dPad(60)], [90, await dPad(90)], [120, await dPad(120)], [150, await dPad(150)], [180, O, 'eixo']],
  };
  const ordem = ['A', 'AC', 'B', 'D'];
  const vistas = {};
  for (const k of ordem) vistas[k] = await Promise.all(CAMINHOS[k].map(async ([fi, f, esp]) => ({ fi, esp, ...(await lerV(f, esp === 'h')) })));
  const PW = 150, PH = 140, SC = 3, FPS = 30, P0 = { x: 75, y: 50 };
  const quadro = (k, fi) => {
    const vs = vistas[k];
    const v = vs.reduce((a, b) => (Math.abs(b.fi - fi) < Math.abs(a.fi - fi) ? b : a));
    const out = Buffer.alloc(PW * PH * 4);
    for (let i = 0; i < PW * PH; i++) out.set([11, 15, 24, 255], i * 4);
    const rad = (fi * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
    for (let Y = 0; Y < PH; Y++) for (let X = 0; X < PW; X++) {
      let ax, ay;
      if (k === 'B') { // (yaw: the views stay upright; the neck point slides from the right to behind the face to the left)
        const px = 49 + 17 * c;
        ax = X + 0.5 - P0.x + px; ay = Y + 0.5 - P0.y + PIV.y;
      } else { // (roll: the head frame turned by −φ about the neck joint; mirrored across its chord past 90°)
        const qx = X + 0.5 - P0.x, qy = Y + 0.5 - P0.y;
        let vx = qx * c - qy * s, vy = qx * s + qy * c;
        if (v.esp === 'eixo') { const d = vx * u.x + vy * u.y; vx = 2 * d * u.x - vx; vy = 2 * d * u.y - vy; }
        ax = PIV.x + vx; ay = PIV.y + vy;
        if (ax >= 72) continue; // (only the skull swings; the neck is the skin's in the fight)
      }
      const src = fonte8(v.m8, ax, ay);
      if (src < 0) continue;
      out.set([v.data[src * 4], v.data[src * 4 + 1], v.data[src * 4 + 2], 255], (Y * PW + X) * 4);
    }
    return out;
  };
  const tl = []; // φ per frame: hold, turn, hold, turn back — at 1× and then at ¼×
  for (const lento of [1, 4]) {
    const turn = Math.round(0.64 * FPS * lento), hold = Math.round(0.4 * FPS);
    for (let r = 0; r < (lento === 1 ? 2 : 1); r++) {
      for (let i = 0; i < hold; i++) tl.push(0);
      for (let i = 0; i <= turn; i++) tl.push((180 * (1 - Math.cos((Math.PI * i) / turn))) / 2);
      for (let i = 0; i < hold; i++) tl.push(180);
      for (let i = 0; i <= turn; i++) tl.push(180 - (180 * (1 - Math.cos((Math.PI * i) / turn))) / 2);
    }
  }
  const QD = `${CRU}/previa-quadros`;
  fs.rmSync(QD, { recursive: true, force: true }); fs.mkdirSync(QD, { recursive: true });
  const GAP = 4, TW = ordem.length * PW + (ordem.length - 1) * GAP;
  for (const [n, fi] of tl.entries()) {
    const comps = ordem.map((k, j) => ({ input: quadro(k, fi), raw: { width: PW, height: PH, channels: 4 }, left: j * (PW + GAP), top: 0 }));
    const b = await sharp({ create: { width: TW, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite(comps).png().toBuffer();
    await sharp(b).resize(TW * SC, PH * SC, { kernel: 'nearest' }).toFile(`${QD}/${String(n).padStart(4, '0')}.png`);
  }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${QD}/%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', `${CRU}/previa.mp4`]); // (videos stay out of git: cru/)
  // the stills strip of each path (its views in order, ×4) for the sheet
  for (const k of ordem) {
    const fs8 = CAMINHOS[k].filter(([fi]) => fi <= 90 || (k === 'D' && fi < 180)).map(([, f]) => `${CRU}/${f}`);
    execFileSync('node', ['scripts/_serpente/_tira.cjs', `${DIR}/vistas-${k}.png`, ...fs8]);
  }
  console.log('previa:', tl.length, 'quadros →', `${CRU}/previa.mp4`);
} else {
  console.error('uso: prepara | rola [graus] [K] | previa');
  process.exit(1);
}
