// 29/10 — THE CRACK CONCEPTS (S1b, spec `2026-10-29-serpente-luta-s1b-design.md` §3 and §5): baked in pixel on the
// arena's own photo (`_arena-foto.mjs`), at the native 384×216, with the hull's own pixels and palette. The charge's
// trip under the hull, in four looks:
//   R1 lombada         — the plates lifted over her as she passes (columns of the band pushed up), dust off the crest
//   R2 fissura acesa   — a crack along the panel, hot (the hull's lamp orange) at the front and cooling behind, sparks
//   R3 lombada+fissura — the bump at the front and a dark crack behind (no light), gravel
//   R4 carne           — the bump and a crack that opens onto the Leviathan's dark flesh, wet glints
// Each: the front runs from the breach to under the ship (300 px/s), follows it (0.4 s), LOCKS (the tip goes white,
// 0.55 s), bursts (she would come up here), and the crack HEALS (2.5 s: the hull's pixels come back from the breach's
// end towards the burst, a darker rim settling). Output in <out>: R<n>.gif (the band ×3), R<n>-trava.png (the lock ×3).
//   node scripts/_serpente/_rachadura-conceitos.mjs <arena.png> <out> [naveX] [topo]
// (`topo`: the first row of the saved frames, 84 by default — the band and the ship; 0 = the whole screen, for the
// mock that puts her on top, `_bote-maquete.mjs`)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [ARENA, OUT, NX = '70', TOPO_FOTO = '84'] = process.argv.slice(2);
const T0 = Number(TOPO_FOTO);
fs.mkdirSync(OUT, { recursive: true });
const W = 384, H = 216, FPS = 30;
const { data: BASE } = await sharp(ARENA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// the band's rows (measured on the photo): the crest rail 151–155, the panel 159–177, the orange seam 178
const TOPO = 146, PAINEL = 168, ROMBO = 232, ALVO = Number(NX);

let semente = 20261029;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };

// the crack's path: a random walk through the panel, from the breach's left edge to the screen's
const trilha = new Map();
const ramos = [];
{
  let y = PAINEL, passo = 0;
  for (let x = ROMBO; x >= 0; x--) {
    if (--passo <= 0) { y = Math.max(PAINEL - 5, Math.min(PAINEL + 5, y + (rnd() < 0.5 ? -1 : 1))); passo = 2 + Math.floor(rnd() * 3); }
    trilha.set(x, y);
    if (x % 13 === 0 && x < ROMBO - 4) {
      const sobe = rnd() < 0.5 ? -1 : 1, n = 2 + Math.floor(rnd() * 3);
      for (let k = 1; k <= n; k++) ramos.push({ x: x - Math.round(k * 0.7), y: y + sobe * k, de: x });
    }
  }
}

const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
const mistura = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const LARANJA = [255, 152, 64], BRASA = [150, 62, 30], BRANCO = [255, 246, 228];
const CARNE = [[64, 14, 22], [104, 26, 32], [150, 44, 46]], BRILHO = [214, 120, 116];

function quadro(estado) {
  const { look, ponta, travaT, curaT, poeira, faiscas, flash } = estado;
  const out = Buffer.from(BASE);
  const get = (b, x, y) => { const i = (y * W + x) * 4; return [b[i], b[i + 1], b[i + 2]]; };
  const put = (x, y, c, a = 1) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    const v = a >= 1 ? c : mistura([out[i], out[i + 1], out[i + 2]], c, a);
    out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2];
  };
  const comLombada = look !== 'R2';
  const temFissura = look !== 'R1';
  // where the front is (null once she has burst out)
  const amp = travaT != null ? 4 : 3;
  const desloca = (x) => (ponta == null || !comLombada ? 0 : Math.round(amp * Math.exp(-(((x - ponta) / 9) ** 2))));

  // 1) the bump: the band's columns pushed up
  if (comLombada && ponta != null) {
    for (let x = Math.max(0, Math.floor(ponta - 24)); x <= Math.min(W - 1, Math.ceil(ponta + 24)); x++) {
      const d = desloca(x);
      if (!d) continue;
      // the push fades with depth: the crest lifts the most, the panel less, the pipes not at all (a whole-column
      // shift read as a glitch streak down the pipes)
      for (let y = TOPO - 4; y < 200; y++) {
        const dy = d * Math.max(0, 1 - Math.max(0, y - 150) / 46);
        const c = get(BASE, x, Math.min(H - 1, Math.round(y + dy)));
        put(x, y, c);
      }
    }
  }

  // 2) the crack behind the front (from the breach to the front), healing from the breach's end
  if (temFissura) {
    const fim = ponta ?? ALVO;
    const curaAte = curaT == null ? ROMBO + 1 : ROMBO - (ROMBO - fim + 6) * Math.min(1, curaT);
    const pinta = (x, y, idade, larg) => {
      const sx = get(BASE, x, y);
      if (look === 'R2') {
        // hot at the front, cooling behind; the core lamp-orange, the edges dithered
        const quente = Math.max(0, 1 - idade / 70);
        const nucleo = mistura(BRASA, LARANJA, quente);
        put(x, y, nucleo);
        if ((x + y) % 2 === 0) put(x, y - 1, nucleo, 0.35 * quente + 0.1);
        put(x, y + 1, mistura(sx, nucleo, 0.25 + 0.3 * quente));
      } else if (look === 'R4') {
        // the flesh: two rows, dark red dithered, a wet glint now and then
        put(x, y - 1, mistura(sx, [8, 8, 12], 0.6));
        put(x, y, CARNE[(x + y) % 2]);
        put(x, y + 1, CARNE[1 + ((x + y) % 2)]);
        if (x % 9 === 0) put(x, y, BRILHO);
        put(x, y + 2, mistura(sx, [255, 255, 255], 0.18));
      } else {
        // dark: a two-row near-black core, the upper lip in shadow, the lower lip catching the light
        put(x, y - 1, [10, 11, 15]);
        put(x, y, [16, 17, 22]);
        put(x, y - 2, mistura(get(BASE, x, y - 2), [0, 0, 0], 0.45));
        put(x, y + 1, mistura(sx, [255, 255, 255], 0.28));
      }
    };
    for (let x = Math.ceil(fim); x <= ROMBO; x++) {
      if (x > curaAte) continue;
      const y = trilha.get(x) - desloca(x);
      pinta(x, y, x - fim, 1);
    }
    for (const r of ramos) {
      if (r.de < fim || r.x > curaAte || r.x < fim) continue;
      const y = r.y - desloca(r.x);
      if (look === 'R2') put(r.x, y, mistura(BRASA, LARANJA, Math.max(0, 1 - (r.de - fim) / 70)), 0.8);
      else if (look === 'R4') put(r.x, y, CARNE[0]);
      else put(r.x, y, [14, 15, 20]);
    }
    // the healing rim: right behind the healed edge, the hull a little darker (new tissue), settling
    if (curaT != null) {
      for (let x = Math.max(Math.ceil(fim), Math.floor(curaAte)); x <= Math.min(ROMBO, curaAte + 10); x++) {
        const y = trilha.get(x);
        if (y == null) continue;
        const t = (x - curaAte) / 10;
        for (const dy of [-1, 0, 1]) put(x, y + dy, mistura(get(out, x, y + dy), [6, 6, 10], 0.35 * (1 - t)));
      }
    }
  }

  // 3) the lock: the tip white, pulsing (and the bump's crest on R1, which has no crack)
  if (travaT != null && ponta != null) {
    const p = 0.6 + 0.4 * Math.sin(travaT * Math.PI * 2 * 4);
    for (let x = Math.round(ponta) - 3; x <= Math.round(ponta) + 3; x++) {
      if (temFissura) {
        const y = trilha.get(Math.min(ROMBO, Math.max(0, x))) - desloca(x);
        put(x, y, BRANCO, p);
        put(x, y - 1, BRANCO, p * 0.4);
        put(x, y + 1, BRANCO, p * 0.4);
      }
      if (comLombada) {
        const yc = 151 - desloca(x);
        put(x, yc, BRANCO, p * 0.8);
        put(x, yc + 1, BRANCO, p * 0.4);
      }
    }
    if (temFissura) {
      const y0 = trilha.get(Math.round(ponta)) - desloca(Math.round(ponta));
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3], [0, 3]]) put(Math.round(ponta) + dx, y0 + dy, BRANCO, p * 0.7);
    }
  }

  // 4) dust, sparks and the burst's flash (particles carry their own colour)
  for (const q of poeira) put(Math.round(q.x), Math.round(q.y), q.c, q.a);
  for (const q of faiscas) put(Math.round(q.x), Math.round(q.y), q.c, q.a);
  if (flash) {
    // the burst on the crest: a short white tear along the rail, widening (no round flash: it read as a grey puff)
    const { x: fx, r, a } = flash;
    for (let dx = -r; dx <= r; dx++) for (const dy of [0, 1, 2]) put(fx + dx, 151 + dy, BRANCO, a * (1 - Math.abs(dx) / (r + 1)) * (1 - dy * 0.3));
  }
  return out;
}

const LOOKS = ['R1', 'R2', 'R3', 'R4'];
for (const look of LOOKS) {
  semente = 777;
  const dir = path.join(OUT, `${look}-quadros`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  const poeira = [], faiscas = [];
  let n = 0;
  const salva = async (estado) => {
    const buf = quadro({ look, poeira, faiscas, ...estado });
    // the band and the ship, ×3
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: T0, width: W, height: H - T0 })
      .resize(W * 3, (H - T0) * 3, { kernel: 'nearest' }).png().toFile(path.join(dir, `${String(n++).padStart(3, '0')}.png`));
    return buf;
  };
  const passa = (ponta) => {
    for (const q of [...poeira, ...faiscas]) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.a -= q.da; }
    for (const arr of [poeira, faiscas]) for (let i = arr.length - 1; i >= 0; i--) if (arr[i].a <= 0) arr.splice(i, 1);
    if (ponta == null) return;
    if (look !== 'R2') for (let k = 0; k < 2; k++) poeira.push({ x: ponta + (rnd() - 0.5) * 10, y: 150 - rnd() * 2, vx: (rnd() - 0.5) * 0.5, vy: -0.3 - rnd() * 0.5, g: 0.01, a: 0.8, da: 0.05, c: [112, 122, 140] });
    if (look === 'R2' && rnd() < 0.6) faiscas.push({ x: ponta, y: trilha.get(Math.round(Math.min(ROMBO, ponta))), vx: (rnd() - 0.2) * 1.4, vy: -1 - rnd() * 1.2, g: 0.12, a: 1, da: 0.09, c: LARANJA });
    if (look === 'R3' && rnd() < 0.4) faiscas.push({ x: ponta, y: 150, vx: (rnd() - 0.5) * 1.2, vy: -0.8 - rnd(), g: 0.1, a: 1, da: 0.06, c: [70, 74, 84] });
    if (look === 'R4' && rnd() < 0.3) faiscas.push({ x: ponta, y: 151, vx: (rnd() - 0.5) * 1, vy: -0.6 - rnd() * 0.6, g: 0.1, a: 1, da: 0.07, c: CARNE[2] });
  };
  // the trip: from the breach to under the ship
  let ponta = ROMBO;
  while (ponta > ALVO) { ponta = Math.max(ALVO, ponta - 300 / FPS); passa(ponta); await salva({ ponta }); }
  // it follows the ship (still here): a small wobble
  for (let i = 0; i < 0.4 * FPS; i++) { passa(ALVO + Math.sin(i) * 0.6); await salva({ ponta: ALVO + Math.sin(i) * 0.6 }); }
  // the LOCK
  let trava;
  for (let i = 0; i < 0.55 * FPS; i++) { passa(ALVO); const b = await salva({ ponta: ALVO, travaT: i / FPS }); if (i === 2) trava = b; }
  await sharp(trava, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: 120, width: 260, height: 96 })
    .resize(260 * 3, 96 * 3, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${look}-trava.png`));
  // the burst: a flash and the hull's own pixels thrown up (she comes up here)
  for (let k = 0; k < 40; k++) {
    const sx = Math.round(ALVO + (rnd() - 0.5) * 30), sy = 151 + Math.floor(rnd() * 20);
    const i = (sy * W + sx) * 4;
    faiscas.push({ x: sx, y: sy, vx: (rnd() - 0.5) * 3, vy: -2 - rnd() * 3, g: 0.18, a: 1, da: 0.03, c: [BASE[i], BASE[i + 1], BASE[i + 2]] });
  }
  for (let i = 0; i < 10; i++) { passa(null); await salva({ ponta: null, flash: i < 4 ? { x: ALVO, r: 6 + i * 5, a: 1 - i * 0.24 } : null }); }
  // (she stands here in the game; the concept skips to her gone) — the crack HEALS
  for (let i = 0; i <= 2.5 * FPS; i++) { passa(null); await salva({ ponta: null, curaT: i / (2.5 * FPS) }); }
  for (let i = 0; i < 0.6 * FPS; i++) await salva({ ponta: null, curaT: 1 });
  // the gif (ffmpeg, a palette of its own)
  const gif = path.join(OUT, `${look}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%03d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=255:stats_mode=full[p];[b][p]paletteuse=dither=none', '-loop', '0', gif]);
  console.log(look, n, 'quadros →', gif);
}
