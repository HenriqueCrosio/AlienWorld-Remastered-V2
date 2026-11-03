// 29/10 — THE CHARGE UNDER THE HULL, MOCKED (S1b, spec `2026-10-29-serpente-luta-s1b-design.md` §3): composited at the
// native 384×216 from the arena without the ship (`_arena-foto.mjs`), one crack look's full frames
// (`_rachadura-conceitos.mjs … 70 0`) and a strike clip (PixMiniMax, 17 frames of 256², the approved frame 0 at (18,10)).
// Not the engine — a concept: the crack runs to the ship and locks; the ship dodges LEFT; the hull bursts and she rises
// FITTED in the tear (the band in front of her coils), the strike playing; the window, the ship shooting her head; she
// sinks; the tear and the crack close. Output: a webm ×3.
//   node scripts/_serpente/_bote-maquete.mjs <casco-dir> <look-frames-dir> <clip-dir> <out.webm>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [CASCO, LOOK, CLIP, OUT] = process.argv.slice(2);
const W = 384, H = 216, FPS = 30;
const raw = async (arq) => (await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const comNave = await raw(path.join(CASCO, 'arena.png'));
const semNave = await raw(path.join(CASCO, 'arena-semnave.png'));

// the ship's patch (the two photos' difference), centred on (70, 100)
const nave = [];
for (let y = 86; y < 114; y++) for (let x = 44; x < 94; x++) {
  const i = (y * W + x) * 4;
  if (Math.abs(comNave[i] - semNave[i]) + Math.abs(comNave[i + 1] - semNave[i + 1]) + Math.abs(comNave[i + 2] - semNave[i + 2]) > 8)
    nave.push({ dx: x - 70, dy: y - 100, c: [comNave[i], comNave[i + 1], comNave[i + 2]] });
}

// the look's frames, back to native (they were saved ×3 from row 0)
const looks = fs.readdirSync(LOOK).filter((f) => f.endsWith('.png')).sort();
const fundo = async (k) => (await sharp(path.join(LOOK, looks[Math.min(k, looks.length - 1)])).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());

// her clip at the game's scale (0.55, nearest), with the art's centre in the 256² canvas
const ESC = 0.55, LADO = Math.round(256 * ESC), CENTRO = { x: (18 + 119) * ESC, y: (10 + 123) * ESC };
const clip = [];
for (let i = 0; fs.existsSync(path.join(CLIP, `${i}.png`)); i++)
  clip.push(await sharp(path.join(CLIP, `${i}.png`)).resize(LADO, LADO, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());

// the place: the lock under the ship (70); her live head (A) there, so the sprite's centre 34.7 px to the right
// (29/10, him on the 1st mock: *"o melhor é sair apenas a parte de cima … quando sai todo o corpo, encontramos o mesmo
// problema … o corpo ainda está imóvel na parte de baixo"*: only the necks and heads come out — his red line, CORTE px
// below the sprite's centre, sits on the crest; the coils never leave the hull)
const CORTE = Number(process.env.CORTE ?? 11), NAVE_Y = Number(process.env.NAVE_Y ?? 112);
const TRAVA = 70, CX = Math.round(TRAVA + 63.1 * ESC), CY_ALTO = 151 - CORTE, CY_FUNDO = 240;
// the crest, per column: the band's first lit row (the 1st mock cut her at a fixed 147, and the 4 rows of sky above the
// crest showed through her as a dark line)
const crista = Array.from({ length: W }, (_, x) => {
  for (let y = 140; y < 165; y++) { const i = (y * W + x) * 4; if (0.3 * semNave[i] + 0.59 * semNave[i + 1] + 0.11 * semNave[i + 2] > 20) return y; }
  return 151;
});
// the tear: a bowl in the band around her coils, jagged
let semente = 99;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
const jag = Array.from({ length: W }, () => Math.round((rnd() - 0.5) * 5));
const ruido = Array.from({ length: W * H }, () => rnd());
/** the full tear's shape (k scales it while it OPENS, fast) */
const dentroAbrindo = (x, y, k) => {
  if (k <= 0) return false;
  const meia = 54 * k, u = (x - CX) / meia;
  if (Math.abs(u) > 1) return false;
  const fundoY = 150 + 40 * k * Math.sqrt(1 - u * u) + jag[x] * k;
  return y >= 147 + Math.abs(jag[(x * 7) % W]) * 0.6 && y <= fundoY;
};
/** how deep inside the full tear a pixel is (0 at the rim … 1 deep), noisy: the HEAL closes from the rim inwards */
const fundura = (x, y) => {
  if (!dentroAbrindo(x, y, 1)) return -1;
  const u = (x - CX) / 54, fundoY = 150 + 40 * Math.sqrt(1 - u * u) + jag[x];
  const d = Math.min((1 - Math.abs(u)) * 54, fundoY - y, y - 147 + 6) / 22;
  return Math.min(1, Math.max(0, d)) * 0.75 + ruido[y * W + x] * 0.25;
};
/** open? `rasgo` = {abre: 0..1} while it opens, {cura: 0..1} while it heals */
const noRasgo = (x, y, rasgo) => {
  if (!rasgo) return false;
  if (rasgo.abre != null) return dentroAbrindo(x, y, rasgo.abre);
  const f = fundura(x, y);
  return f >= 0 && f > rasgo.cura * 1.02;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bote-'));
let n = 0;
async function quadro(k, { ela, cy, anim, rasgo, naveX, tiros }) {
  const bg = await fundo(k);
  const out = Buffer.from(bg);
  const put = (x, y, c, a = 1) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    for (let q = 0; q < 3; q++) out[i + q] = Math.round(a >= 1 ? c[q] : out[i + q] + (c[q] - out[i + q]) * a);
  };
  // the tear: its inside is the breach's own (the cavity at the same place relative to the breach's centre, x 300); the
  // crest's plates at both ends bent up; the rim darker; while it heals, the pixels just closed are darker (new tissue)
  if (rasgo) {
    const k = rasgo.abre ?? 1;
    if (rasgo.abre != null || rasgo.cura < 0.5) {
      const dobra = 3 * (rasgo.abre != null ? k : 1 - rasgo.cura * 2);
      for (const lado of [-1, 1]) for (let j = 0; j < 7; j++) {
        const x = Math.round(CX + lado * (54 * k + j - 2)), d = Math.round(dobra * (1 - j / 7));
        if (d <= 0) continue;
        for (let y = 143; y < 158; y++) { const i = ((y + d) * W + x) * 4; put(x, y, [bg[i], bg[i + 1], bg[i + 2]]); }
      }
    }
    for (let y = 140; y < H; y++) for (let x = 0; x < W; x++) {
      if (noRasgo(x, y, rasgo)) {
        const i = (y * W + (x - CX + 300)) * 4;
        put(x, y, [semNave[i] * 0.8, semNave[i + 1] * 0.8, semNave[i + 2] * 0.85]);
      } else if (noRasgo(x, y - 1, rasgo) || noRasgo(x + 1, y, rasgo) || noRasgo(x - 1, y, rasgo)) put(x, y, [0, 0, 0], 0.55);
      else if (noRasgo(x, y + 1, rasgo)) put(x, y, [0, 0, 0], 0.4);
      else if (rasgo.cura != null) {
        const f = fundura(x, y);
        if (f >= 0 && f > rasgo.cura - 0.18) put(x, y, [6, 4, 8], 0.45 * (1 - (rasgo.cura - f) / 0.18));
      }
    }
  }
  // her, where she is not behind the band: above the crest, or inside the tear
  if (ela) {
    const f = clip[Math.min(anim, clip.length - 1)];
    const L = Math.round(CX - CENTRO.x), T = Math.round(cy - CENTRO.y);
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4;
      if (f[i + 3] < 128) continue;
      const X = L + x, Y = T + y;
      if (X < 0 || X >= W) continue;
      const c = [f[i] * 0.91, f[i + 1] * 0.99, f[i + 2]];
      if (Y < crista[X]) put(X, Y, c);
      // in the tear, below the crest, her body goes down into the dark (never the still coils)
      else if (noRasgo(X, Y, rasgo)) put(X, Y, c.map((v, q) => v + ([8, 9, 13][q] - v) * Math.min(1, (Y - crista[X] + 1) / 7)));
    }
  }
  // the ship and its shots
  for (const p of nave) put(Math.round(naveX + p.dx), NAVE_Y + p.dy, p.c);
  for (const t of tiros) for (let d = 0; d < 4; d++) put(Math.round(t) + d, NAVE_Y, [255, 236, 190]);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(W * 3, H * 3, { kernel: 'nearest' }).png()
    .toFile(path.join(tmp, `${String(n++).padStart(3, '0')}.png`));
}

// the timeline (the look's sequence: trip 0–16, follow 17–28, lock 29–45, burst 46–55, heal 56–131, hold 132–149)
const naveEm = (m) => (m < 34 ? 70 : Math.max(34, 70 - ((m - 34) * 110) / FPS));
for (let m = 0; m < 46; m++) await quadro(m, { ela: false, rasgo: 0, naveX: naveEm(m), tiros: [] });
let tiros = [], cada = 0;
const animDe = (m) => Math.floor(((m - 46) / FPS) * 12);
const atira = (m) => {
  tiros = tiros.map((x) => x + 8).filter((x) => x < TRAVA - 14);
  if (++cada % 4 === 0) tiros.push(46);
};
for (let m = 46; m < 56; m++) {
  atira(m);
  await quadro(m, { ela: true, cy: Math.max(CY_ALTO, CY_FUNDO - (m - 45) * 23.3), anim: animDe(m), rasgo: { abre: Math.min(1, (m - 45) / 3) }, naveX: naveEm(m), tiros });
}
for (let i = 0; i < 33; i++) { const m = 56 + i; atira(m); await quadro(56, { ela: true, cy: CY_ALTO, anim: animDe(m), rasgo: { abre: 1 }, naveX: 34, tiros }); }
for (let i = 0; i < 9; i++) { const m = 89 + i; await quadro(56, { ela: true, cy: CY_ALTO + (i + 1) * 12.9, anim: animDe(m), rasgo: { abre: 1 }, naveX: 34, tiros: [] }); }
for (let k = 56; k < 150; k++) await quadro(k, { ela: false, rasgo: { cura: Math.min(1, (k - 56) / 75) }, naveX: 34, tiros: [] });

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%03d.png'),
  '-c:v', 'libvpx-vp9', '-crf', '12', '-b:v', '0', '-pix_fmt', 'yuv420p', OUT]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(n, 'quadros →', OUT);
