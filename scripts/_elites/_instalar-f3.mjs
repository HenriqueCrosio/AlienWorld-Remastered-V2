// INSTALLS THE F3 ELITES' ART (plan 2026-10-07-frente-b-fatia-f3.md, Task 2) into public/sprites:
//   (a) the SQUID — his pick, Pro nº 15 at 85% (`_tratar.mjs reduzir`), with the bright stray pixel between the
//       tentacles replaced by the median of its neighbours (he: "dá para apagar manualmente");
//   (b) her CAMOUFLAGE — the ordered-dither dissolve, 6 frames out (`some`) and the same 6 back in (`surge`);
//   (c) the INK, baked at native res from `_tinta-lib.mjs` with the times of `ELITES.tinta` (SOPRO and CORTINA);
//   (d) the tentacle's PROVISIONAL hand art of 06/10 (the round of 07/10 is waiting for his pick) and the two shots.
//   node scripts/_elites/_instalar-f3.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { ELITES } from '../../src/data/numerosElites.ts';
import { BLOBS, bayer, raio, tintaMao } from './_tinta-lib.mjs';

const CAND = 'docs/superpowers/folhas/2026-10-07/elites/cand';
const MAO = 'docs/superpowers/folhas/2026-10-06/elites/mao';
const OUT = 'public/sprites';

const ler = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: Buffer.from(data), w: info.width, h: info.height };
};
const gravar = (img, arq) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toFile(arq);

// ── (a) the squid ──
const lula = await ler(`${CAND}/cacadorLula-21-15-085.png`);
const claro = [];
for (let y = 0; y < lula.h; y++)
  for (let x = 0; x < lula.w; x++) {
    const k = (y * lula.w + x) * 4;
    if (lula.d[k + 3] && Math.min(lula.d[k], lula.d[k + 1], lula.d[k + 2]) > 150) claro.push([x, y]);
  }
for (const [x, y] of claro) {
  const viz = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([vx, vy]) => vx >= 0 && vy >= 0 && vx < lula.w && vy < lula.h)
    .map(([vx, vy]) => (vy * lula.w + vx) * 4)
    .filter((k) => lula.d[k + 3] && Math.min(lula.d[k], lula.d[k + 1], lula.d[k + 2]) <= 150);
  const lum = (k) => lula.d[k] + lula.d[k + 1] + lula.d[k + 2];
  viz.sort((a, b) => lum(a) - lum(b));
  const m = viz[Math.floor(viz.length / 2)];
  const k = (y * lula.w + x) * 4;
  if (m !== undefined) for (let c = 0; c < 4; c++) lula.d[k + c] = lula.d[m + c];
}
// The Pro left specks in the canvas margin (little clusters at the left and top-right edges, off the body): only what
// is CONNECTED to the body (the largest 8-connected blob) stays.
const opaco = (x, y) => x >= 0 && y >= 0 && x < lula.w && y < lula.h && lula.d[(y * lula.w + x) * 4 + 3] > 0;
const rotulo = new Int32Array(lula.w * lula.h).fill(-1);
const blobs = [];
for (let y0 = 0; y0 < lula.h; y0++)
  for (let x0 = 0; x0 < lula.w; x0++) {
    if (!opaco(x0, y0) || rotulo[y0 * lula.w + x0] >= 0) continue;
    const pilha = [[x0, y0]], membros = [];
    rotulo[y0 * lula.w + x0] = blobs.length;
    while (pilha.length) {
      const [x, y] = pilha.pop();
      membros.push([x, y]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (opaco(nx, ny) && rotulo[ny * lula.w + nx] < 0) {
          rotulo[ny * lula.w + nx] = blobs.length;
          pilha.push([nx, ny]);
        }
      }
    }
    blobs.push(membros);
  }
const corpo = blobs.reduce((a, b) => (b.length > a.length ? b : a));
const soltos = blobs.filter((b) => b !== corpo).flat();
for (const [x, y] of soltos) lula.d[(y * lula.w + x) * 4 + 3] = 0;
// (07/10: the 85% downscale had already dropped the bright pixel of the 100% art — (42,27) = #b9bab9 — so `claro` is
// empty; the guard stays for a re-pick.)
console.log(`lula 15 a 85%: ${lula.w}×${lula.h}, claro(s): ${JSON.stringify(claro)}, solto(s): ${JSON.stringify(soltos)}`);
await gravar(lula, `${OUT}/elite-cacador.png`);

// ── (b) the camouflage: 6 dither steps ──
const PASSOS = 6;
for (let i = 0; i < PASSOS; i++) {
  for (const [nome, keep] of [['some', 1 - (i + 1) / PASSOS], ['surge', (i + 1) / PASSOS]]) {
    const q = { d: Buffer.from(lula.d), w: lula.w, h: lula.h };
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (bayer(x, y) >= keep) q.d[(y * q.w + x) * 4 + 3] = 0;
    await gravar(q, `${OUT}/elite-cacador-${nome}-${i}.png`);
  }
}
console.log(`camuflagem: ${PASSOS} quadros de some e de surge`);

// ── (c) the ink, baked ──
for (const tipo of ['sopro', 'cortina']) {
  const T = ELITES.tinta[tipo];
  const R = Math.ceil(raio(BLOBS[tipo]));
  const lado = 2 * R + 2;
  const n = Math.ceil(T.someS * ELITES.tinta.qps);
  for (let i = 0; i < n; i++) {
    const q = { d: Buffer.alloc(lado * lado * 4), w: lado, h: lado };
    tintaMao(q, T, BLOBS[tipo], lado / 2, lado / 2, i / ELITES.tinta.qps);
    await gravar(q, `${OUT}/elite-tinta-${tipo}-${i}.png`);
  }
  console.log(`tinta ${tipo}: ${n} quadros de ${lado}×${lado}`);
}

// ── (d) the squid's shot (the tentacle's provisional hand art left on 11/10: `_instalar-sentinela.mjs` took the slot) ──
fs.mkdirSync(`${OUT}/tiros`, { recursive: true });
fs.copyFileSync(`${MAO}/tiro-cacador-agulha.png`, `${OUT}/tiros/elite-agulha.png`);
console.log('a agulha da lula');
