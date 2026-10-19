// BLOCO D — the MENU SWIM of the new Leviathan, from his pick (18/10: "Gerada 91·0 + luz"). A shark swims by sweeping
// its vertical crescent tail SIDEWAYS — seen in profile that is foreshortening (the lobes narrow and widen) plus a
// travelling S-wave through the body, never a rotation (`nadadeira-define-movimento`). Two takes, judged by GIF:
//   gera  — PixMiniMax from the UNLIT art (centred with room in a 176×80 frame), the gesture held in place;
//   onda  — the art itself deformed: a vertical travelling wave growing toward the tail, and the tail columns squeezed
//           horizontally by |cos| of the beat (the foreshortening). The loop closes by construction; identity is exact.
// `montar` then, per frame: snap to the base palette, drop specks, bake the moonlight (`_luz-lua.mjs`), and write the
// frames + a ×3 GIF + a GIF at menu size (×0.6, menu tint) on the menu's night.
//   node scripts/_leviata/_menu-nado.mjs gera <outDir> <seed> [<seed> ...]
//   node scripts/_leviata/_menu-nado.mjs onda <outDir> [quadros=16] [amp=2.2]
//   node scripts/_leviata/_menu-nado.mjs montar <quadrosDir> <outDir> [fps=10]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';
import { iluminar, semIlhas } from './_luz-lua.mjs';

const [modo, ...args] = process.argv.slice(2);
const ARTE = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/menu2/cru/base-gera-91-0.png';
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
const QW = 176, QH = 80;

async function quadroComFolga() {
  const m = await sharp(ARTE).metadata();
  const left = Math.round((QW - m.width) / 2), top = Math.round((QH - m.height) / 2);
  const buf = await sharp({ create: { width: QW, height: QH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: ARTE, left, top }]).png().toBuffer();
  return { buf, left, top, w: m.width, h: m.height };
}

if (modo === 'gera') {
  const [outDir, ...seeds] = args;
  const { buf } = await quadroComFolga();
  for (const seed of seeds.map(Number)) {
    const imgs = await gerar('/animate-pixminimax', {
      first_frame: b64(buf),
      description: 'Swimming in place like a shark: the tall crescent tail sweeps from side to side, the rear half of ' +
        'the body flexes in a gentle S-wave that travels toward the tail, the pectoral fins glide slightly. The head ' +
        'stays steady. It does not turn, does not move forward, does not change size.',
      subject_description: 'a colossal armored space leviathan shaped like a shark, with a tall dorsal fin and a crescent tail',
      initial_pose: 'swimming level, facing right, side view',
      view: 'side',
      direction: 'east',
      frame_count: 16,
      no_background: true,
      seed,
    });
    const dir = path.join(outDir, `gera-${seed}`);
    fs.mkdirSync(dir, { recursive: true });
    imgs.forEach((b, i) => fs.writeFileSync(path.join(dir, `${i}.png`), b));
    console.log(dir, imgs.length);
  }
} else if (modo === 'onda') {
  const [outDir, N_S = '16', AMP_S = '2.2'] = args;
  const N = Number(N_S), AMP = Number(AMP_S);
  const { buf, left, w } = await quadroComFolga();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const dir = path.join(outDir, 'onda');
  fs.mkdirSync(dir, { recursive: true });
  // Art columns: the tail is on the LEFT (u = 1 at the tail tip, 0 at the snout). The tail fin is the last 18%.
  const uDe = (x) => Math.min(1, Math.max(0, 1 - (x - left) / w));
  const PEDUNCULO = left + Math.round(w * 0.18);
  for (let f = 0; f < N; f++) {
    const fase = (2 * Math.PI * f) / N;
    const out = Buffer.alloc(QW * QH * 4, 0);
    // Foreshortening of the tail fin: its columns are squeezed toward the peduncle by 0.55..1.
    const aperto = 0.55 + 0.45 * Math.abs(Math.cos(fase));
    for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
      let sx = x;
      if (x < PEDUNCULO) sx = Math.round(PEDUNCULO - (PEDUNCULO - x) / aperto);
      const u = uDe(sx);
      const dy = AMP * u * u * Math.sin(fase - u * Math.PI * 1.1);
      const sy = Math.round(y - dy);
      if (sx < 0 || sy < 0 || sx >= QW || sy >= QH) continue;
      const i = (sy * QW + sx) * 4, o = (y * QW + x) * 4;
      if (data[i + 3] < 128) continue;
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = 255;
    }
    await sharp(out, { raw: { width: QW, height: QH, channels: 4 } }).png().toFile(path.join(dir, `${f}.png`));
  }
  console.log(dir, N);
} else if (modo === 'montar') {
  const [qDir, outDir, FPS_S = '10'] = args;
  const FPS = Number(FPS_S);
  fs.mkdirSync(path.join(outDir, 'quadros'), { recursive: true });
  const { data: bd, info: bi } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const PAL = [...new Set(Array.from({ length: bi.width * bi.height }, (_, p) => p * 4).filter((i) => bd[i + 3] > 200)
    .map((i) => (bd[i] << 16) | (bd[i + 1] << 8) | bd[i + 2]))].map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
  const cache = new Map();
  const snap = (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    if (cache.has(k)) return cache.get(k);
    let m = PAL[0], d0 = Infinity;
    for (const c of PAL) { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < d0) { d0 = d; m = c; } }
    cache.set(k, m);
    return m;
  };
  const nomes = fs.readdirSync(qDir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  const grandes = [], menu = [];
  for (const [k, n] of nomes.entries()) {
    const { data, info } = await sharp(path.join(qDir, n)).resize(QW, QH, { kernel: 'nearest' }).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = data[i + 3] >= 128 ? 255 : 0;
      if (data[i + 3]) [data[i], data[i + 1], data[i + 2]] = snap(data[i], data[i + 1], data[i + 2]);
    }
    semIlhas(data, QW, QH);
    const luz = iluminar(data, QW, QH);
    const png = await sharp(luz, { raw: info }).png().toBuffer();
    fs.writeFileSync(path.join(outDir, 'quadros', `${k}.png`), png);
    grandes.push(await sharp(png).resize(QW * 3, QH * 3, { kernel: 'nearest' })
      .flatten({ background: '#0e1220' }).png().toBuffer());
    // Menu size: ×0.6 nearest (what Phaser does at LEVI_SCALE 0.6), the menu tint multiplied, on the menu night, ×3.
    const { data: md, info: mi } = await sharp(png).resize(Math.round(QW * 0.6), Math.round(QH * 0.6), { kernel: 'nearest' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const T = [0x8c / 255, 0x9b / 255, 0xb6 / 255];
    for (let i = 0; i < md.length; i += 4) for (let c = 0; c < 3; c++) md[i + c] = Math.round(md[i + c] * T[c]);
    menu.push(await sharp(md, { raw: mi }).flatten({ background: '#0b0e1d' })
      .resize(mi.width * 3, mi.height * 3, { kernel: 'nearest' }).png().toBuffer());
  }
  const gif = (qs, out) => sharp(qs, { join: { animated: true } })
    .gif({ delay: Array(qs.length).fill(Math.round(1000 / FPS)), loop: 0 }).toFile(out);
  await gif(grandes, path.join(outDir, 'nado-x3.gif'));
  await gif(menu, path.join(outDir, 'nado-menu.gif'));
  console.log(outDir, nomes.length, 'quadros');
} else throw new Error('modo? gera | onda | montar');
