// INSTALLS THE SQUID'S GESTURES (12/10) into public/sprites, from the PixMiniMax clips generated out of the approved
// sprite (`_lula-base.mjs`: the 41×41 squid centred in an 80×80 frame; frame 0 of every clip IS the approved art):
//   idle   — she hovers: the mantle breathes, the tentacles drift            → elite-cacador-idle-N.png
//   ataque — the tentacles flare into a star, then snap shut                 → elite-cacador-ataque-N.png
//   foge   — she squeezes thin and darts away (played backwards, she arrives) → elite-cacador-foge-N.png
//   escapa — the LAST exit: she coils her tentacles into a ball (the impulse)
//            and stretches into a dart                                        → elite-cacador-escapa-N.png
// Every frame of a clip is cropped to ONE box centred on the squid's centre (so the game only swaps textures), snapped
// to the approved sprite's palette (the generator drifts and paints bright strays), and cleaned of loose specks. The
// tail of `foge` gets the ordered dither of the old camouflage, so she still dissolves instead of popping; `escapa`
// gets 3 extra frames, its last pose dissolving.
//   node scripts/_elites/_instalar-lula-anims.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { bayer } from './_tinta-lib.mjs';

const FOLHA = 'docs/superpowers/folhas/2026-10-12/elites/lula';
const OUT = 'public/sprites';
/** The take of each gesture (the folders `<gesture>-<take>` in FOLHA). */
const CLIPES = { idle: 'idle-1', ataque: 'ataque-2', foge: 'some-1', escapa: 'escapa-1' };
/** The centre of the squid in the 80×80 base (the 41×41 sprite sits at 20,20). */
const CENTRO = 40;
/** `foge`: from this frame on she dissolves — the share of pixels KEPT in each of the last frames. */
const DISSOLVE = { 6: 0.8, 7: 0.55, 8: 0.3 };
/** `escapa`: the last pose again, dissolving — appended after the clip's own frames. */
const ESCAPA_FIM = [0.75, 0.5, 0.25];

const ler = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: Buffer.from(data), w: info.width, h: info.height };
};
const gravar = (img, arq) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toFile(arq);

// The approved palette.
const base = await ler(`${OUT}/elite-cacador.png`);
const paleta = [];
for (let k = 0; k < base.d.length; k += 4) {
  if (base.d[k + 3] < 128) continue;
  if (!paleta.some((c) => c[0] === base.d[k] && c[1] === base.d[k + 1] && c[2] === base.d[k + 2])) paleta.push([base.d[k], base.d[k + 1], base.d[k + 2]]);
}

/** Hard alpha, every colour to the nearest of the approved palette; returns the worst distance found. */
function tratar(img) {
  let pior = 0;
  for (let k = 0; k < img.d.length; k += 4) {
    if (img.d[k + 3] < 128) {
      img.d[k + 3] = 0;
      continue;
    }
    img.d[k + 3] = 255;
    let melhor = paleta[0], dist = Infinity;
    for (const c of paleta) {
      const d = (c[0] - img.d[k]) ** 2 + (c[1] - img.d[k + 1]) ** 2 + (c[2] - img.d[k + 2]) ** 2;
      if (d < dist) [melhor, dist] = [c, d];
    }
    pior = Math.max(pior, Math.sqrt(dist));
    [img.d[k], img.d[k + 1], img.d[k + 2]] = melhor;
  }
  return pior;
}

/** Erases the specks: every blob of opaque pixels (8-neighbours) smaller than `min`. Returns how many pixels went. */
function semSoltos(img, min = 4) {
  const rotulo = new Int32Array(img.w * img.h).fill(-1);
  let apagados = 0;
  for (let i0 = 0; i0 < rotulo.length; i0++) {
    if (!img.d[i0 * 4 + 3] || rotulo[i0] >= 0) continue;
    const blob = [i0];
    rotulo[i0] = i0;
    for (let p = 0; p < blob.length; p++) {
      const x = blob[p] % img.w, y = Math.floor(blob[p] / img.w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h) continue;
          const n = ny * img.w + nx;
          if (img.d[n * 4 + 3] && rotulo[n] < 0) {
            rotulo[n] = i0;
            blob.push(n);
          }
        }
    }
    if (blob.length < min) {
      for (const i of blob) img.d[i * 4 + 3] = 0;
      apagados += blob.length;
    }
  }
  return apagados;
}

// Read and treat every frame; measure, per clip, the box that holds all its frames.
const clipes = {};
const meio = {};
for (const [nome, dir] of Object.entries(CLIPES)) {
  const n = fs.readdirSync(`${FOLHA}/${dir}`).filter((f) => /^\d+\.png$/.test(f)).length;
  clipes[nome] = [];
  let pior = 0, soltos = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const q = await ler(`${FOLHA}/${dir}/${i}.png`);
    pior = Math.max(pior, tratar(q));
    soltos += semSoltos(q);
    for (let y = 0; y < q.h; y++)
      for (let x = 0; x < q.w; x++) if (q.d[(y * q.w + x) * 4 + 3]) k = Math.max(k, Math.abs(x - CENTRO), Math.abs(y - CENTRO));
    clipes[nome].push(q);
  }
  meio[nome] = k;
  console.log(`${nome} (${dir}): ${n} quadros, caixa ${2 * k + 1}×${2 * k + 1}, cor mais longe da paleta ${pior.toFixed(0)}, ${soltos} px soltos apagados`);
}

for (const [nome, quadros] of Object.entries(clipes)) {
  const k = meio[nome], LADO = 2 * k + 1;
  const fila = quadros.map((q, i) => [q, nome === 'foge' ? DISSOLVE[i] : undefined]);
  if (nome === 'escapa') for (const keep of ESCAPA_FIM) fila.push([quadros.at(-1), keep]);
  for (const [i, [q, keep]] of fila.entries()) {
    const c = { d: Buffer.alloc(LADO * LADO * 4), w: LADO, h: LADO };
    for (let y = 0; y < LADO; y++)
      for (let x = 0; x < LADO; x++) {
        const sx = x + CENTRO - k, sy = y + CENTRO - k;
        if (sx < 0 || sy < 0 || sx >= q.w || sy >= q.h) continue;
        q.d.copy(c.d, (y * LADO + x) * 4, (sy * q.w + sx) * 4, (sy * q.w + sx) * 4 + 4);
      }
    if (keep !== undefined) for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) if (bayer(x, y) >= keep) c.d[(y * LADO + x) * 4 + 3] = 0;
    await gravar(c, `${OUT}/elite-cacador-${nome}-${i}.png`);
  }
}
console.log(`o centro da lula no centro de cada caixa; paleta aprovada: ${paleta.length} cores`);
console.log(`BootScene FRAMES: ${Object.entries(clipes).map(([n, q]) => `${n} ${q.length + (n === 'escapa' ? ESCAPA_FIM.length : 0)}`).join(', ')}`);
