// THE TENTACLE, v3 (08/10, 2nd round) — his concept sheet VOID SERPENT (`folhas/2026-10-08/elites/ref/`):
//   1. the BODY as he wants it: overlapping scale plates, long curved spines sprouting backward, red neural tissue
//      glowing between the plates, and the TAIL as a FAN of long curved spines — by hand, and the Pro's columns;
//   2. the NEW SKILL he asked (*"ela voltar de trás do casco e lançar os espinhos que ela tem no corpo em direção ao
//      jogador … implemente um novo estilo"*) → A SERPENTE DE ESPINHOS: she rises from behind the hull arching her
//      spined back, bristles (the tell), and the spines leave her back ONE BY ONE and fly as a SNAKE — the lead spine
//      swims to where the ship was on a sine wave, the others follow its exact path. An offline prototype.
//   node scripts/_elites/_tentaculo-v3.mjs [--gif <body.png|mao>] [pro-body.png ...]   → folhas/2026-10-08/elites/
import fs from 'node:fs';
import sharp from 'sharp';
import { ler } from './_pixel-lib.mjs';
import { ampliar } from './_pixel-lib.mjs';
import {
  BOCA, CRISTA, NUCA, P, cabeca, colar, colarCentro, corrente, folha, girar, mapa, nave, novo, painel, px, recorte,
} from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-08/elites';
const MAO = `${D}/mao`;
fs.mkdirSync(MAO, { recursive: true });
const args = process.argv.slice(2);
const gi = args.indexOf('--gif');
const CORPO_GIF = gi >= 0 ? args.splice(gi, 2)[1] : 'mao';
// The Pro tail fan (it comes out pointing RIGHT: turned to point down, the root up), appended to every Pro body.
const ci = args.indexOf('--cauda');
const CAUDA_PRO = ci >= 0 ? args.splice(ci, 2)[1] : null;
const PRO = args;

// ── 1. THE BODY BY HAND: a scaled segment (axis vertical, head up) ──
/**
 * Overlapping SCALES (each one's lower rim catches the light, a shadow under it — they overlap toward the tail), a red
 * seam of tissue between them, and two long CURVED SPINES sprouting from the sides, sweeping down and out.
 */
function escama(rx, ry, espinho) {
  const W = Math.ceil(2 * rx) + 2 * espinho + 4, H = Math.ceil(2 * ry) + espinho + 4;
  const cx = W / 2, cy = ry + 1.5;
  const img = novo(W, H);
  const dentro = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!dentro(x, y)) continue;
      const borda = !dentro(x + 1, y) || !dentro(x - 1, y) || !dentro(x, y + 1) || !dentro(x, y - 1);
      const n = -((x + 0.5 - cx) / rx) * 0.5 - ((y + 0.5 - cy) / ry) * 0.8;
      px(img, x, y, borda ? P.O : n > 0.6 ? P.M : n > 0.1 ? P.m : n > -0.4 ? P.D : P.d, 1);
    }
  // The scales: 2 rows, staggered; each one a lit lower rim with a shadow below.
  const escamas = [[-rx * 0.45, -ry * 0.35], [rx * 0.4, -ry * 0.35], [0, ry * 0.3], [-rx * 0.75, ry * 0.3], [rx * 0.75, ry * 0.3]];
  for (const [ex, ey] of escamas) {
    const r = Math.max(2, rx * 0.42);
    for (let a = 0.25; a <= Math.PI - 0.25; a += 0.12) {
      const x = Math.round(cx + ex + Math.cos(a) * r), y = Math.round(cy + ey + Math.sin(a) * r * 0.6);
      if (!dentro(x, y) || !dentro(x, y + 1)) continue;
      px(img, x, y, y < cy ? P.H : P.h, 1);
      px(img, x, y + 1, P.O, 1);
    }
  }
  // The tissue between the plates: NOT a band — two dim organ points in the gaps, one lit (his "órgãos luminosos").
  px(img, Math.round(cx - rx * 0.4), Math.round(cy + 1), P.r, 1);
  px(img, Math.round(cx + rx * 0.25), Math.round(cy - 1), P.R, 1);
  // The two spines: they grow from the plates' upper edge and sweep BACK along the body (toward the tail), close to
  // it, curving out only at the tip — like the concept, not legs.
  for (const lado of [-1, 1]) {
    // Along the rim, nearly parallel to the body, past its lower edge like a shingle; only the tip bends out 1–2px.
    for (let t = 0; t <= espinho; t++) {
      const x = Math.round(cx + lado * (rx * 0.8 + (t / espinho) ** 3 * 2)), y = Math.round(cy - ry * 0.5 + t);
      px(img, x, y, t > espinho - 2 ? P.h : t < 2 ? P.l : P.M, 1);
      px(img, x + lado, y, P.O, 1);
    }
  }
  return img;
}

/** The TAIL FAN: a small last scale opening into 5 long curved spines, spreading down (his "detalhe da cauda"). */
function leque() {
  const W = 25, H = 20, cx = 12.5, cy = 3.5;
  const img = novo(W, H);
  // A NARROW fan, the spines nearly parallel at the root and curving apart toward the tips (the claws of his tail).
  const spines = [[-0.32, 12], [-0.16, 15], [0, 16], [0.16, 15], [0.32, 12]];
  for (const [a, L] of spines) {
    for (let t = 0; t <= L; t++) {
      const ang = Math.PI / 2 + a * (0.4 + (t / L) ** 2 * 1.2);
      const x = Math.round(cx + Math.cos(ang) * t), y = Math.round(cy + Math.sin(ang) * t);
      px(img, x, y, t < L * 0.3 ? P.l : t < L - 2 ? P.M : P.h, 1);
      px(img, x + (a < 0 ? 1 : -1), y, P.O, 1);
    }
  }
  // The last scale (the root of the fan), with its red seam.
  const base = escama(3.5, 3, 0);
  colarCentro(img, base, cx, cy + 1);
  return img;
}

const ESCAMA = escama(6, 4.8, 8);
const CORPO_MAO = [
  ESCAMA, ESCAMA, ESCAMA, ESCAMA, ESCAMA,
  escama(5.2, 4.3, 7),
  escama(4.4, 3.7, 6),
  escama(3.6, 3, 5),
  leque(),
];
const ESPACOS_MAO = [0, 7, 7, 7, 7, 7, 6, 6, 5, 7];
for (const [nome, img] of [['escama', ESCAMA], ['cauda-leque', CORPO_MAO[8]]]) {
  await sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toFile(`${MAO}/tentaculo-${nome}.png`);
}

/** The Pro column, sliced into ~7px bands (top = neck); the last band keeps the tail end. */
async function fatiar(arq) {
  const col = await ler(arq, { trim: true });
  const pecas = [];
  for (let y = 0; y < col.h; y += 7) {
    const h = col.h - y < 14 ? col.h - y : 7;
    const p = novo(col.w, h);
    for (let yy = 0; yy < h; yy++) col.d.copy(p.d, yy * col.w * 4, ((y + yy) * col.w) * 4, ((y + yy) * col.w + col.w) * 4);
    pecas.push(p);
    if (h > 7) break;
  }
  const esp = [0, ...pecas.slice(1).map(() => 7)];
  if (CAUDA_PRO) {
    pecas.push(girar(await ler(CAUDA_PRO, { trim: true }), Math.PI / 2));
    esp.push(12);
  }
  return [pecas, esp];
}

// ── the BODY sheet: four poses per body ──
const J = { x: 100, y: 30, w: 200, h: 150 };
const cJ = CRISTA - J.y;
const POSES = [
  ['TORRE', (img, pecas, esp) => {
    const n = cabeca(img, 130, cJ - 52, 0);
    corrente(img, (u) => ({ x: n.x, y: n.y + u * 140 }), pecas, esp, cJ);
    cabeca(img, 130, cJ - 52, 0);
  }],
  ['BOTE (no ar, a CAUDA à mostra)', (img, pecas, esp) => {
    const rot = Math.atan2(-1, -0.6) + Math.PI / 2;
    const n = cabeca(img, 100, 34, rot);
    corrente(img, (u) => ({ x: n.x + u * 80, y: n.y + 100 * u * u + 6 * u }), pecas, esp);
    cabeca(img, 100, 34, rot);
  }],
  ['MERGULHO (por trás das placas)', (img, pecas, esp) => {
    const rot = Math.atan2(1, -0.7) + Math.PI / 2;
    const n = cabeca(img, 92, cJ - 6, rot, cJ);
    corrente(img, (u) => ({ x: n.x + 80 * u, y: n.y - 100 * u * (1 - 0.6 * u) }), pecas, esp, null);
    const base = recorte(J);
    for (let y = cJ; y < J.h; y++) base.d.copy(img.d, y * J.w * 4, y * J.w * 4, (y + 1) * J.w * 4);
    cabeca(img, 92, cJ - 6, rot, cJ);
  }],
  ['RETORNO (arqueia o dorso atrás do casco)', (img, pecas, esp) => {
    const n = cabeca(img, 120, cJ - 46, -0.5);
    corrente(img, arco(n, cJ), pecas, esp, cJ);
    cabeca(img, 120, cJ - 46, -0.5);
  }],
];
/**
 * The arch of the RETURN: the head stands IN FRONT (toward the ship), and from its neck the spined back arches up and
 * away to the right, then down into the hull — the back on show, the spines out.
 */
function arco(n, crista) {
  // Compact: the body (~90px) must plunge back INTO the hull before it ends — the tail stays inside.
  // The back rises first (the hump over the first half), and only then plunges.
  return (u) => {
    const queda = Math.max(0, (u - 0.4) / 0.6);
    return { x: n.x + 60 * Math.min(1, u * 1.3), y: n.y - 30 * Math.sin(Math.PI * Math.min(1, u * 1.6)) + (crista + 50 - n.y) * queda * queda };
  };
}

const paineis = [];
const corpos = [['MÃO', CORPO_MAO, ESPACOS_MAO]];
for (const arq of PRO) corpos.push([`PRO ${arq.split('/').pop().replace('tentaculoCorpoSerpente-', '').replace('.png', '')}`, ...(await fatiar(arq))]);
for (const [nome, pecas, esp] of corpos)
  for (const [pose, f] of POSES) {
    const img = recorte(J);
    colar(img, nave, 6, Math.round(J.h * 0.38 - nave.h / 2));
    f(img, pecas, esp);
    paineis.push(await painel(img, `${nome} · ${pose}`, 3));
  }
await folha(paineis, 4, `${D}/folha-serpente-corpo.png`);

// ── 2. A SERPENTE DE ESPINHOS — the prototype ──
// The spines (≤10px: by hand). They point RIGHT (the shot turns to its heading). The LEAD is bigger and its base
// glows (the organ it tore out of); the followers are plain thorns, slightly curved up.
// They must READ on the dark nebula: the base still glowing (torn out of the lit tissue), a pale bone tip.
const LIDER = mapa(['........OO', '..OOOOOsO.', 'OFFRhslO..', '..OOOOO...']);
const ESPINHO = mapa(['.....OO', 'OFRhsO.', '.OOOO..']);
await sharp(LIDER.d, { raw: { width: LIDER.w, height: LIDER.h, channels: 4 } }).png().toFile(`${MAO}/tiro-espinho-lider.png`);
await sharp(ESPINHO.d, { raw: { width: ESPINHO.w, height: ESPINHO.h, channels: 4 } }).png().toFile(`${MAO}/tiro-espinho.png`);

const [PECAS_GIF, ESP_GIF] = CORPO_GIF === 'mao' ? [CORPO_MAO, ESPACOS_MAO] : await fatiar(CORPO_GIF);
/** The lit version of a piece (the tell): its red tissue flares. */
const acesa = (p) => {
  const q = { d: Buffer.from(p.d), w: p.w, h: p.h };
  for (let k = 0; k < q.d.length; k += 4) if (q.d[k + 3] && q.d[k] > q.d[k + 1] + 40) [q.d[k], q.d[k + 1], q.d[k + 2]] = P.F;
  return q;
};
const PECAS_ACESAS = PECAS_GIF.map(acesa);

const JG = { x: 92, y: 30, w: 260, h: 150 };
const cG = CRISTA - JG.y;
const FPS = 20, DUR = 4.2;
const N = 8, ESPACO_S = 0.1, VEL = 95, GIRO = 3.2, ONDA_AMP = 9, ONDA_HZ = 1.5;
const T_SOBE = [0.3, 0.9], T_ERICA = [0.9, 1.5], T_LANCA = 1.5, T_AFUNDA = [2.4, 3.0];
const naveEm = (t) => ({ x: 34, y: t < 2.0 ? 64 : Math.min(96, 64 + (t - 2.0) * 90) });
const HX = 168;
/** How far the head rises (from 30px inside the hull): low enough that the body (~100px) ends back INSIDE it. */
const SOBE_PX = 70;

// The LEAD's path, simulated once: it leaves the top of the arch going UP-left, turns toward where the ship was at the
// launch (for 0.7s), then flies straight; a sine wave swings it sideways (the snake). Followers replay the same path.
const alvo0 = naveEm(T_LANCA);
const caminho = [];
{
  // From the TOP of the arched back (the arch at full height, 40% along from the neck).
  const topo = arco({ x: HX + NUCA.x, y: cG + 30 - SOBE_PX + NUCA.y }, cG)(0.4);
  let x = topo.x, y = topo.y - 4, h = (-115 * Math.PI) / 180;
  const dt = 1 / 240;
  for (let t = 0; t < 4; t += dt) {
    if (t < 0.7) {
      const quer = Math.atan2(alvo0.y + nave.h / 2 - y, alvo0.x + nave.w / 2 - x);
      const d = Math.atan2(Math.sin(quer - h), Math.cos(quer - h));
      h += Math.max(-GIRO * dt, Math.min(GIRO * dt, d));
    }
    x += Math.cos(h) * VEL * dt;
    y += Math.sin(h) * VEL * dt;
    const lat = Math.sin(t * ONDA_HZ * 2 * Math.PI) * ONDA_AMP * Math.min(1, t / 0.4);
    caminho.push({ x: x - Math.sin(h) * lat, y: y + Math.cos(h) * lat });
  }
}
const noCaminho = (t) => caminho[Math.max(0, Math.min(caminho.length - 1, Math.round(t * 240)))];

const quadros = [];
for (let i = 0; i < Math.round(DUR * FPS); i++) {
  const t = i / FPS;
  const img = recorte(JG);
  const nv = naveEm(t);
  colar(img, nave, nv.x, nv.y);
  // How high she is: rises from behind the hull, holds, sinks back.
  const sobe = t < T_SOBE[0] ? 0 : t < T_SOBE[1] ? (t - T_SOBE[0]) / (T_SOBE[1] - T_SOBE[0]) : t < T_AFUNDA[0] ? 1 : t < T_AFUNDA[1] ? 1 - (t - T_AFUNDA[0]) / (T_AFUNDA[1] - T_AFUNDA[0]) : 0;
  const s = 1 - (1 - sobe) ** 2;
  if (s > 0) {
    const tremor = t >= T_ERICA[0] && t < T_ERICA[1] ? (i % 2 ? 1 : -1) : 0;
    const hy = cG + 30 - SOBE_PX * s;
    const pulso = t >= T_ERICA[0] && t < T_LANCA + 0.3 && Math.floor(t * (6 + (t - T_ERICA[0]) * 14)) % 2 === 0;
    const n = cabeca(img, HX + tremor, hy, 0, cG);
    corrente(img, arco(n, cG), pulso ? PECAS_ACESAS : PECAS_GIF, ESP_GIF, cG);
    cabeca(img, HX + tremor, hy, 0, cG);
  }
  // The spines: each leaves the top of the back at T_LANCA + k·ESPACO_S and replays the lead's path from there.
  for (let k = N - 1; k >= 0; k--) {
    const tk = t - T_LANCA - k * ESPACO_S;
    if (tk < 0) continue;
    const a = noCaminho(tk), b = noCaminho(tk + 0.02);
    if (a.x < -12 || a.y < -12 || a.y > JG.h + 12) continue;
    const spr = k === 0 ? LIDER : ESPINHO;
    // A short ember trail behind each spine (2 points back along its own path), so the snake reads as one line.
    for (const [dtr, al] of [[0.05, 0.55], [0.1, 0.3]]) {
      const r = noCaminho(Math.max(0, tk - dtr));
      px(img, Math.round(r.x), Math.round(r.y), P.R, al);
    }
    colarCentro(img, girar(spr, Math.atan2(b.y - a.y, b.x - a.x)), a.x, a.y);
  }
  quadros.push(await ampliar(img, 3));
}
const out = `${D}/tentaculo-serpente-de-espinhos-prototipo.gif`;
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0 }).toFile(out);
console.log(out, quadros.length, 'quadros');
void BOCA;
