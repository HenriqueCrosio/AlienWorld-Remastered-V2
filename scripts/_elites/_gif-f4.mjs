// THE F4 FINALISTS IN MOTION (spec fatia F4 §2.1 and §3): a STAGED gif, composed on the real backdrops at real speed
// (20 fps), one panel per candidate. The gestures are the PixMiniMax clips (`anim/<name>-<gesture>/N.png`, 80×80);
// the frame comes from the state's clock, as the squid's does in game. No game code runs here: the hatching and
// the scrolling wall are NOT in it, and the hole, the pupa and the ring shot are hand-drawn DRAFTS.
//   node scripts/_elites/_gif-f4.mjs larva|tubo      (`larva buraco` = only the hole's strip)
import fs from 'node:fs';
import sharp from 'sharp';
import { pupa, tiroAnel, buraco, BW, BH } from './_mao-f4.mjs';

const D = 'docs/superpowers/folhas/2026-10-13/elites/f4';
const QUAL = process.argv[2];
const FPS = 20, Z = 3, LH = 22;
const NAVE = await sharp('public/sprites/ship-jato.png').png().toBuffer();

const clipe = async (nome, op = {}) => {
  const dir = `${D}/anim/${nome}`;
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  const q = [];
  for (let i = 0; i < n; i++) q.push(await (op.flip ? sharp(`${dir}/${i}.png`).flip() : sharp(`${dir}/${i}.png`)).png().toBuffer());
  return q;
};
/** The frame of a clip at `u` (0..1) of its state. */
const em = (q, u) => q[Math.min(q.length - 1, Math.max(0, Math.floor(u * q.length)))];
const rotulo = (txt, w) =>
  sharp(Buffer.from(`<svg width="${w}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas, monospace" font-size="14" fill="#ffb040">${txt}</text></svg>`))
    .png()
    .toBuffer();

/** One panel frame: the pieces on the full 384×216 photo, then the window, magnified. */
async function quadro(fundo, J, pecas) {
  const comp = pecas.map((p) => ({ input: p.buf, left: Math.round(p.x), top: Math.round(p.y) }));
  const cena = await sharp(fundo).composite(comp).png().toBuffer();
  return sharp(cena).extract({ left: J.x, top: J.y, width: J.w, height: J.h }).resize(J.w * Z, J.h * Z, { kernel: 'nearest' }).png().toBuffer();
}

async function gif(paineis, J, total, arq) {
  const PW = J.w * Z, PH = J.h * Z + LH;
  const rots = await Promise.all(paineis.map((p) => rotulo(p.titulo, PW)));
  const paginas = [];
  for (let i = 0; i < total; i++) {
    const comp = [];
    for (const [k, p] of paineis.entries()) {
      comp.push({ input: rots[k], left: 0, top: k * PH });
      comp.push({ input: await quadro(p.fundo, J, p.pecas(i / FPS)), left: 0, top: k * PH + LH });
    }
    paginas.push(await sharp({ create: { width: PW, height: paineis.length * PH, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
  }
  await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(total).fill(1000 / FPS), loop: 0 }).toFile(arq);
  console.log(arq, total, 'quadros');
}

if (QUAL === 'larva') {
  // The duct. Three posts in the right half, each far from the height of the one before (the zigzag).
  const fundo = `${D}/ref/fundo-duto.png`;
  const J = { x: 120, y: 84, w: 264, h: 112 };
  const NAVE_XY = { x: 150, y: 127 };
  const POSTOS = [{ x: 338, y: 126 }, { x: 262, y: 164 }, { x: 318, y: 122 }];
  // The whole cycle, with the spec's times (§2.1).
  const T = { abre: 0.5, sai: 0.4, poe: 0.9, tranco: 0.35, perfura: 0.5, mergulha: 0.4, depois: 1.5, fecha: 0.25, cicatriz: 1.0 };
  const ESTADOS = [
    ['abre', T.abre, 0, 0], ['sai', T.sai, 0, 0], ['poe', T.poe, 0, 0], ['tranco', T.tranco, 0, 1], ['poe', T.poe, 1, 1],
    ['tranco', T.tranco, 1, 2], ['poe', T.poe, 2, 2], ['perfura', T.perfura, 2, 2], ['mergulha', T.mergulha, 2, 2],
    ['depois', T.depois, 2, 2],
  ];
  const inicio = (k) => ESTADOS.slice(0, k).reduce((s, e) => s + e[1], 0);
  const total = Math.round(inicio(ESTADOS.length) * FPS);
  const PUPA = await pupa();

  // ── THE HOLE (a DRAFT, drawn in pixel): a torn mouth in the painting — the palette is sampled from the duct's own
  // red wall (the neighbour), the steps joined by a 2×2 Bayer dither. `s` = how open (0..1); `resto` = how much of
  // the scar is left (1..0), which goes away by losing pixels, not by fading.
  const { abre: ABRE, cicatriz: CICATRIZ } = await buraco(fundo);
  if (process.argv[3] === 'buraco') {
    // The hole's own strip, magnified — to look at the draft alone.
    const tira = [...ABRE, ...CICATRIZ];
    const comp = await Promise.all(tira.map(async (b, k) => ({ input: await sharp(b).resize(BW * 6, BH * 6, { kernel: 'nearest' }).png().toBuffer(), left: k * (BW * 6 + 6), top: 0 })));
    await sharp({ create: { width: tira.length * (BW * 6 + 6), height: BH * 6, channels: 4, background: '#1a1420' } }).composite(comp).png().toFile(`${D}/rascunho-buraco.png`);
    console.log(`${D}/rascunho-buraco.png`);
    process.exit(0);
  }
  /** The hole of a post: it opens at `tAbre`, shuts at `tFecha`, and the scar goes away after it. */
  const buracoEm = (t, tAbre, tFecha) => {
    if (t < tAbre) return null;
    if (t < tFecha) return ABRE[Math.min(4, Math.floor(((t - tAbre) / T.abre) * 5))];
    if (t < tFecha + T.fecha) return ABRE[2 - Math.min(2, Math.floor(((t - tFecha) / T.fecha) * 3))];
    const u = (t - tFecha - T.fecha) / T.cicatriz;
    return u < 1 ? CICATRIZ[Math.floor(u * 4)] : null;
  };
  const BURACOS = [
    { posto: 0, tAbre: 0, tFecha: inicio(2) + 0.1 },
    { posto: 2, tAbre: inicio(7), tFecha: inicio(9) },
  ];

  // The takes I picked (the others are in `anim/`, and `gif-larva-clipes.gif` shows them all).
  const TAKES = { A: { sai: 1, perfura: 2, mergulha: 1 }, D: { sai: 2, perfura: 1, mergulha: 2 } };
  const paineis = [];
  for (const [letra, nome] of [['A', 'do conceito'], ['D', 'a broca']]) {
    const C = {};
    for (const g of ['idle', 'poe', 'tranco']) C[g] = await clipe(`larva-${letra}-${g}`);
    for (const g of ['sai', 'perfura', 'mergulha']) C[g] = await clipe(`larva-${letra}-${g}-${TAKES[letra][g]}`);
    // SAI = the dive played backwards (the dot grows into the ball) and then the ball bursting open.
    const quadroDe = (est, u) => {
      if (est === 'sai') return u < 0.45 ? em([...C.mergulha].reverse(), u / 0.45) : em(C.sai.slice(0, 9), (u - 0.45) / 0.55);
      return C[est] ? em(C[est], u) : null;
    };
    paineis.push({
      fundo,
      titulo: `LARVA ${letra} — ${nome} · buraco → sai → (põe → tranco) ×3 → perfura → mergulha · buraco e pupa = rascunho`,
      pecas: (t) => {
        const pecas = [{ buf: NAVE, x: NAVE_XY.x, y: NAVE_XY.y }];
        for (const b of BURACOS) {
          const buf = buracoEm(t, b.tAbre, b.tFecha);
          if (buf) pecas.push({ buf, x: POSTOS[b.posto].x - BW / 2, y: POSTOS[b.posto].y - BH / 2 });
        }
        let t0 = 0, corpo;
        for (const [est, dur, de, para] of ESTADOS) {
          const u = (t - t0) / dur;
          // The pupae of this stop: born at 55% of PÕE, a short fan towards the ship, 50px, then they stop and pulse.
          if (est === 'poe' && t >= t0 + dur * 0.55) {
            const idade = t - (t0 + dur * 0.55);
            if (idade < 2.0) {
              const p = POSTOS[de], base = Math.atan2(NAVE_XY.y + 13 - p.y, NAVE_XY.x + 22 - p.x);
              const k = Math.min(1, idade / 0.4), dist = 50 * (1 - (1 - k) ** 2);
              const bate = idade < 1 ? 0.5 : idade < 1.6 ? 0.25 : 0.1;
              for (const leque of [-0.3, 0.3])
                pecas.push({ buf: PUPA[Math.floor(idade / bate) % 2], x: p.x + Math.cos(base + leque) * dist - 3, y: p.y + Math.sin(base + leque) * dist - 4 });
            }
          }
          if (u >= 0 && u < 1) {
            const a = POSTOS[de], b = POSTOS[para], m = u * u * (3 - 2 * u), buf = quadroDe(est, u);
            if (buf) corpo = { buf, x: a.x + (b.x - a.x) * m - 40, y: a.y + (b.y - a.y) * m - 40 };
          }
          t0 += dur;
        }
        if (corpo) pecas.push(corpo);
        return pecas;
      },
    });
  }
  await gif(paineis, J, total, `${D}/gif-larva-ciclo.gif`);
}

if (QUAL === 'tubo') {
  // Chamber B, floor and ceiling. The wall does not scroll here: each Tube stays put and pulses ONCE, one after the
  // other, so each half-ring reads alone — the floor one with 7 shots, the ceiling one half a step off (spec §3).
  const fundo = `${D}/ref/fundo-camara-b.png`;
  const B = JSON.parse(fs.readFileSync(`${D}/ref/fundo-camara-b.json`, 'utf8'));
  const J = { x: 130, y: 26, w: 254, h: 170 };
  const XC = 205, XT = 270, PE = 60, AFUNDA = 2; // PE: the row of the base inside the 80×80 frame (`_base-f4.mjs`)
  const TIRO = await tiroAnel();
  const T = { incha: 0.6, estala: 0.3, vel: 70, alcance: 150 };
  const PULSOS = { chao: { t: 0.4, fase: 0 }, teto: { t: 2.0, fase: 0.5 } };
  const total = Math.round(4.8 * FPS);
  const paineis = [];
  for (const [letra, nome] of [['C', 'coroa de dentes'], ['D', 'craca dupla']]) {
    const chao = await clipe(`tubo-${letra}-pulso`), teto = await clipe(`tubo-${letra}-pulso`, { flip: true });
    // The clip: frames 0..10 swell (INCHA), 10..16 snap open and settle (PULSA). The shots leave at the snap.
    const qual = (t, q, p) => {
      if (t >= p.t && t < p.t + T.incha) return q[Math.floor(((t - p.t) / T.incha) * 10)];
      if (t >= p.t + T.incha && t < p.t + T.incha + T.estala) return q[10 + Math.min(6, Math.floor(((t - p.t - T.incha) / T.estala) * 7))];
      return q[0];
    };
    paineis.push({
      fundo,
      titulo: `TUBO ${letra} — ${nome} · incha 0,6s → pulsa (70px/s) · encenado: parede parada; tiro = rascunho`,
      pecas: (t) => {
        const yc = B.chao[XC] + AFUNDA, yt = B.teto[XT] - AFUNDA;
        const pecas = [
          { buf: NAVE, x: 142, y: 98 },
          { buf: qual(t, chao, PULSOS.chao), x: XC - 40, y: yc - PE },
          { buf: qual(t, teto, PULSOS.teto), x: XT - 40, y: yt - (80 - PE) },
        ];
        for (const [p, x0, y0, sy] of [[PULSOS.chao, XC, yc - 14, -1], [PULSOS.teto, XT, yt + 14, 1]]) {
          const r = 10 + (t - (p.t + T.incha)) * T.vel;
          if (r < 10 || r > T.alcance) continue;
          for (let i = 0; i < (p.fase ? 6 : 7); i++) {
            const ang = ((i + p.fase) * Math.PI) / 6;
            pecas.push({ buf: TIRO, x: x0 + Math.cos(ang) * r - 2, y: y0 + sy * Math.sin(ang) * r - 2 });
          }
        }
        return pecas.filter((q) => q.x > -4 && q.y > -4 && q.x < 380 && q.y < 212);
      },
    });
  }
  await gif(paineis, J, total, `${D}/gif-tubo-C-D.gif`);
}
