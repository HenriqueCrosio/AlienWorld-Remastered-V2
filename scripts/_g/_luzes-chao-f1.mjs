// BLOCO G · round 5 — the EMBERS of the ground strips (the menu's light rules, `scripts/_cenario/luzes.mjs`): the warm
// lights of `chao-vale.png` and `chao-paisagem.png` are found, LIFTED out by diffusion (the rock behind them), and the
// lifted pixels are split into 3 overlays per strip (`chao-<nome>-brasa-<0..2>.png`, same size as the strip, transparent
// but for those pixels). In the game each overlay sits over its strip and its alpha is how DIM that third of the embers
// is right now: the embers flicker by thirds, never in unison. The Valle's biggest fires (by the towers) are also listed
// in `chao.json` → `<nome>.fogos`: the smoke columns rise from them.
//   node scripts/_g/_luzes-chao-f1.mjs [dir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { detectarLuzes, marcarMuda, apagarPorDifusao, gruposDeLuz } from '../_cenario/luzes.mjs';

const [DIR = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5'] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(path.join(DIR, 'chao.json'), 'utf8'));
const GRUPOS = 3;
// A fire big enough to smoke: at least this many px of light, and in the upper half of the strip (by the towers).
const FOGO_MIN = 5;

for (const nome of ['vale', 'paisagem']) {
  const d = dados[nome];
  const { data: tile, info } = await sharp(path.join(DIR, `chao-${nome}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const tipo = detectarLuzes(tile, W, H, 1);
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) tipo[s] = 1; // no beacons on the ground: every light is an ember
  const muda = marcarMuda(tile, W, H, 1, tipo);
  const apagadas = apagarPorDifusao(tile, W, H, muda);
  // Label each light pixel with its cluster, and each cluster with a third (by its order along x: neighbours differ).
  const rotulo = new Int32Array(W * H).fill(-1);
  const grupos = [];
  for (let s = 0; s < W * H; s++) {
    if (!tipo[s] || rotulo[s] >= 0) continue;
    const id = grupos.length, fila = [s];
    rotulo[s] = id;
    let n = 0, sx = 0, sy = 0, y0 = H;
    while (fila.length) {
      const c = fila.pop(); n++;
      const cx = c % W, cy = (c / W) | 0;
      sx += cx; sy += cy; y0 = Math.min(y0, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = (cx + dx + W) % W, ny = cy + dy; // the strip wraps: a cluster across the seam is one cluster
        if (ny < 0 || ny >= H) continue;
        const q = ny * W + nx;
        if (tipo[q] && rotulo[q] < 0) { rotulo[q] = id; fila.push(q); }
      }
    }
    grupos.push({ n, x: sx / n, y: sy / n, topo: y0 });
  }
  const ordem = grupos.map((g, i) => i).sort((a, b) => grupos[a].x - grupos[b].x);
  const terco = new Int32Array(grupos.length);
  ordem.forEach((g, k) => { terco[g] = k % GRUPOS; });
  // A fringe pixel (muda = 2) goes with the light it touches.
  const dono = (s) => {
    if (rotulo[s] >= 0) return terco[rotulo[s]];
    const x = s % W, y = (s / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = (x + dx + W) % W, ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      const q = ny * W + nx;
      if (rotulo[q] >= 0) return terco[rotulo[q]];
    }
    return 0;
  };
  const camadas = Array.from({ length: GRUPOS }, () => Buffer.alloc(W * H * 4));
  let pixels = 0;
  for (let s = 0; s < W * H; s++) {
    if (!muda[s] || apagadas[s * 4 + 3] === 0) continue;
    apagadas.copy(camadas[dono(s)], s * 4, s * 4, s * 4 + 4);
    pixels++;
  }
  for (let g = 0; g < GRUPOS; g++) await sharp(camadas[g], { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, `chao-${nome}-brasa-${g}.png`));
  d.brasas = GRUPOS;
  // The fires that smoke (the Valle only: its towers burn; the Paisagem's embers are a lava glow, no columns).
  d.fogos = nome === 'vale'
    ? grupos.filter((g) => g.n >= FOGO_MIN && g.y < H * 0.5).map((g) => ({ x: Math.round(g.x), y: g.topo + d.y }))
    : [];
  console.log(nome, `${grupos.length} embers (${pixels} px lifted), ${d.fogos.length} smoking fires`, JSON.stringify(d.fogos));
}
fs.writeFileSync(path.join(DIR, 'chao.json'), JSON.stringify(dados));

// The sheet: each strip lit, and with every ember dimmed (all three overlays on), ×3.
for (const nome of ['vale', 'paisagem']) {
  const d = dados[nome];
  const aceso = await sharp(path.join(DIR, `chao-${nome}.png`)).png().toBuffer();
  const apagado = await sharp(aceso).composite([0, 1, 2].map((g) => ({ input: path.join(DIR, `chao-${nome}-brasa-${g}.png`) }))).png().toBuffer();
  const par = await sharp({ create: { width: d.w, height: d.h * 2 + 2, channels: 4, background: { r: 13, g: 15, b: 21, alpha: 1 } } })
    .composite([{ input: aceso, left: 0, top: 0 }, { input: apagado, left: 0, top: d.h + 2 }]).png().toBuffer();
  await sharp(par).resize(d.w * 3, (d.h * 2 + 2) * 3, { kernel: 'nearest' }).toFile(path.join(FOLHA, `brasas-${nome}.png`));
}
