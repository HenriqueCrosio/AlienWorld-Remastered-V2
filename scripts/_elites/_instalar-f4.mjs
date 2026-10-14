// INSTALLS THE F4 ELITES' ART (13/10) into public/sprites: the PixMiniMax gestures of the FOUR approved variations
// (Larva A and D, Tube C and D — he kept both of each) and the hand-drawn pieces (`_mao-f4.mjs`).
// The clips are 80×80 frames generated from `anim/base-*.png` (the creature centred at 40,40; the Tube's foot on row 60).
// They go in RAW, only cropped: these are the frames he approved in the staged GIFs, and the swell of the Tube and
// the ember of the drill light colours the still art does not have (no palette snap, unlike the squid's).
//   LARVA — every clip in ONE square box centred on the creature's centre (the game only swaps textures).
//   TUBE  — every frame of a variation in ONE box: the middle column in the middle, the FOOT on the last row.
//   node scripts/_elites/_instalar-f4.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { mosca, buraco } from './_mao-f4.mjs';

const FOLHA = 'docs/superpowers/folhas/2026-10-13/elites/f4';
const OUT = 'public/sprites';
const CENTRO = 40, PE = 60;
/** The take of each gesture (folders in FOLHA/anim) — the ones staged in `gif-larva-ciclo.gif`. */
const LARVA = {
  a: { poe: 'larva-A-poe', tranco: 'larva-A-tranco', sai: 'larva-A-sai-1', perfura: 'larva-A-perfura-2', mergulha: 'larva-A-mergulha-1' },
  d: { poe: 'larva-D-poe', tranco: 'larva-D-tranco', sai: 'larva-D-sai-2', perfura: 'larva-D-perfura-1', mergulha: 'larva-D-mergulha-2' },
};
const TUBO = { c: 'tubo-C-pulso', d: 'tubo-D-pulso' };

const ler = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: Buffer.from(data), w: info.width, h: info.height };
};
const lerClipe = async (dir) => {
  const n = fs.readdirSync(`${FOLHA}/anim/${dir}`).filter((f) => /^\d+\.png$/.test(f)).length;
  const q = [];
  for (let i = 0; i < n; i++) q.push(await ler(`${FOLHA}/anim/${dir}/${i}.png`));
  return q;
};
/** Crops the box [x0, x0+w) × [y0, y0+h) out of a frame and writes it. */
const recortar = (q, x0, y0, w, h, arq) => sharp(q.d, { raw: { width: q.w, height: q.h, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).png().toFile(arq);
/** The opaque pixels of a list of frames: how far they reach from the centre column/row, and their top row. */
function medir(quadros) {
  let kx = 0, ky = 0, topo = Infinity, base = -1;
  for (const q of quadros)
    for (let y = 0; y < q.h; y++)
      for (let x = 0; x < q.w; x++) {
        if (q.d[(y * q.w + x) * 4 + 3] < 128) continue;
        kx = Math.max(kx, Math.abs(x - CENTRO));
        ky = Math.max(ky, Math.abs(y - CENTRO));
        topo = Math.min(topo, y);
        base = Math.max(base, y);
      }
  return { kx, ky, topo, base };
}

const frames = [];
for (const [v, gestos] of Object.entries(LARVA))
  for (const [gesto, dir] of Object.entries(gestos)) {
    const q = await lerClipe(dir);
    const { kx, ky } = medir(q);
    const k = Math.max(kx, ky), lado = 2 * k + 1;
    for (const [i, f] of q.entries()) await recortar(f, CENTRO - k, CENTRO - k, lado, lado, `${OUT}/elite-larva-${v}-${gesto}-${i}.png`);
    console.log(`larva ${v.toUpperCase()} ${gesto} (${dir}): ${q.length} quadros, caixa ${lado}×${lado}`);
    frames.push(`eliteLarva${v.toUpperCase()}${gesto[0].toUpperCase()}${gesto.slice(1)}Anim: ${q.length}`);
  }
for (const [v, dir] of Object.entries(TUBO)) {
  const q = await lerClipe(dir);
  const { kx, topo, base } = medir(q);
  if (base >= PE) throw new Error(`tubo ${v}: pixels abaixo do pé (linha ${base}) — a base saiu do lugar`);
  const w = 2 * kx + 1, h = PE - topo;
  for (const [i, f] of q.entries()) await recortar(f, CENTRO - kx, topo, w, h, `${OUT}/elite-tubo-${v}-pulso-${i}.png`);
  console.log(`tubo ${v.toUpperCase()} pulso (${dir}): ${q.length} quadros, caixa ${w}×${h}, o pé na última linha`);
  frames.push(`eliteTubo${v.toUpperCase()}PulsoAnim: ${q.length}`);
}

// The hand-drawn pieces (drafts until he approves them).
const escrever = async (bufs, nome) => { for (const [i, b] of bufs.entries()) await sharp(b).toFile(`${OUT}/${nome}-${i}.png`); };
await escrever(await mosca(), 'elite-mosca');
const b = await buraco(`${FOLHA}/ref/fundo-duto.png`);
await escrever([...b.abre, ...b.cicatriz], 'elite-buraco');
console.log('peças à mão: elite-mosca-0..1, elite-buraco-0..8 (0–4 abre, 5–8 cicatriz) — a pupa e o esporo são do _instalar-f4b.mjs (14/10)');
console.log(`BootScene FRAMES: ${frames.join(', ')}, eliteBuracoAnim: 9, elitePupaAnim: 2, eliteMoscaAnim: 2`);
