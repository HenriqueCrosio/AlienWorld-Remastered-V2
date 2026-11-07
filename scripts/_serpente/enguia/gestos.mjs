// 07/11 — stage 3, the head's ANIMATIONS (START `plans/2026-11-07-enguia-animacoes-START.md`): the PixMiniMax frames of
// each gesture, drawn in place of the approved E3 while the gesture plays — same skull, the mouth varying (his ask:
// "o mais variado possível"). Every gesture falls on the profile (φ = 0, measured by `_enguia-gestos-medir.mjs`), so the
// frames never meet the roll's views. Frames are 96×96 with the E3 at y 16 (the room the jaw needs to drop); their
// normals come from ONE `create_normal_map` strip (the E3's own map comes back identical, so no light pops).
import sharp from 'sharp';
import { amplia8, vistasCabeca } from './arte.mjs';

const DIR = 'docs/superpowers/folhas/2026-11-07/enguia-gestos/';
const OY = 16; // the E3's place in the 96×96 frame

async function carregaQuadros(pasta, n) {
  const nrm = await sharp(`${DIR}${pasta}/normais.png`).ensureAlpha().toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  const out = [];
  for (let k = 0; k < n; k++) {
    const { data, info } = await sharp(`${DIR}${pasta}/q${String(k).padStart(2, '0')}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, nv = new Float32Array(w * h * 3);
    let bx = 0, by = 0, bn = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, j = (y * nrm.info.width + k * w + x) * 4;
      if (nrm.data[j + 3] >= 128) nv.set([nrm.data[j] / 127.5 - 1, nrm.data[j + 1] / 127.5 - 1, nrm.data[j + 2] / 127.5 - 1], p * 3);
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      if (data[p * 4 + 3] > 128 && x < 40 && r > 180 && r > b + 80) { bx += x; by += y; bn++; } // the mouth's ember
    }
    // (the mouth: where the ember glows in this frame, in the E3's coordinates; a shut mouth hides it → null)
    out.push({ k, data, w, h, oy: OY, n: nv, m8: amplia8(data, w, h), boca: bn > 3 ? { x: bx / bn, y: by / bn - OY } : null });
  }
  return out;
}

export async function carregaGestos() {
  const G = { eco: await carregaQuadros('eco', 12), canos: await carregaQuadros('canos', 17), prepara: await carregaQuadros('prepara', 9), nadar: await carregaQuadros('nadar', 12), dor: await carregaQuadros('dor', 4), agonia: await carregaQuadros('agonia', 9) };
  // (the dive from the post rolls her over mid-dive, and the roll's views were made from the E3 — the mouth would open
  // for the turn: the closing mouth (the Echo's frames 1–6) gets its own turn-over views, by the same method, from each
  // frame cut to the E3's 96×64 — so she can shut it in the middle of the dive, even while rolling)
  for (const f of G.eco.slice(1, 7)) {
    const W = 96, H = 64, d = new Uint8Array(W * H * 4), n = new Float32Array(W * H * 3);
    for (let y = 0; y < H; y++) { d.set(f.data.subarray(((y + OY) * W) * 4, ((y + OY) * W + W) * 4), y * W * 4); n.set(f.n.subarray(((y + OY) * W) * 3, ((y + OY) * W + W) * 3), y * W * 3); }
    f.vistas = await vistasCabeca(d, W, H, n);
  }
  return G;
}

// a sequence of frame indices played over [t0, t1)
const toca = (seq, t, t0, t1) => seq[Math.min(seq.length - 1, Math.floor(((t - t0) / (t1 - t0)) * seq.length))];

// THE ECHO (each round: the reading, the spit, the settling). The E3's half-open mouth shuts as she starts reading the
// ship (her eye lit, the head following it by code) and stays shut, teeth set; it SNAPS wide open just as she spits
// (through the real in-betweens: the closing played back to the E3, then the gaping), holds wide through the kick, and
// eases back to the E3. Frames: 0 = the E3, 1–6 = closing (6 shut), 7–11 = gaping (11 widest).
export const ECO = { fecha: 0.5, estalo: 0.17, aberta: 0.55, volta: 0.6 };
export function quadroEco(t, rodadas) {
  for (const r of rodadas) {
    const fechada = r.ini + ECO.fecha, estalo = r.cospe - ECO.estalo, volta = r.cospe + ECO.aberta, fim = volta + ECO.volta;
    if (t < r.ini || t >= fim) continue;
    if (t < fechada) return toca([0, 1, 2, 3, 4, 5, 6], t, r.ini, fechada);
    if (t < estalo) return 6;
    if (t < r.cospe) return toca([6, 4, 2, 0, 9, 11], t, estalo, r.cospe);
    if (t < volta) return 11;
    return toca([11, 10, 9, 8, 7, 0], t, volta, fim);
  }
  return null;
}

// THE PIPES (each salvo: the warning, the fire) — the Echo's rhythm turned inside out: through the warning the jaws part
// slowly, the throat glowing brighter, like pressure building (the code's tremor stays); as the lanes fire the jaws SLAM
// shut (0.1 s) and the head kicks back (`chuteCanos`), held shut through the fire and the pause; the next warning reopens
// from shut; after the last salvo she eases back to the E3. Frames: 0 = the E3, 1–8 = the charge (8 widest, brightest),
// 9–10 = the slam, 11–16 = closing (16 shut, the Echo's own shut mouth).
export const CANOS = { bate: 0.1, volta: 0.4, chute: 0.12, chuteDur: 0.3 };
const REABRE = [16, 14, 12, 0], CARGA = [1, 2, 3, 4, 5, 6, 7, 8], BATE = [8, 9, 10, 16];
export function quadroCanos(t, C) {
  const q = C?.estado(t);
  if (!q) return null;
  const rel = t - C.t0, ult = C.salvas[2];
  if (q.fase === 'aviso') return toca(q.i === 0 ? [0, ...CARGA] : [...REABRE, ...CARGA], q.k, 0, 1);
  if (q.fase === 'fogo') { const s = C.salvas[q.i], d = rel - s.tFogo; return d < CANOS.bate ? toca(BATE, d, 0, CANOS.bate) : 16; }
  if (q.fase === 'entre') return 16;
  // (the way back to the E3 plays in the last embers: the pause ends with them, and the draw-back starts from the E3)
  if (q.fase === 'brasa') { const d = rel - ult.tFim - (C.N.canos.brasa - CANOS.volta); return d < 0 ? 16 : toca(REABRE, d, 0, CANOS.volta); }
  if (q.fase === 'apaga') { const d = rel - C.corte; return d < 0.28 ? toca(REABRE, d, 0, 0.28) : null; }
  return null;
}
// THE DRAW-BACK before she leaves rest (`tr.prepara`, 0.6 s; the code's tilt up stays): she hisses like a snake about
// to strike — the jaws tense and only half apart, every tooth bared, the throat's ember dying out to dark (the one
// mouth no other gesture has: half open and unlit) — then, as she sets off, it eases back to the E3.
// Frames: 0 = the E3, 1–8 = the hiss (8 darkest).
export const PREPARA = { sobe: 0.45, volta: 0.35 };
export function quadroPrepara(t, trechos) {
  for (const p of trechos) {
    if (!p.prepara || t < p.t0 || t >= p.t1 + PREPARA.volta) continue;
    if (t < p.t1) return toca([0, 1, 2, 3, 4, 5, 6, 7, 8], t, p.t0, p.t0 + PREPARA.sobe) ?? 8;
    return toca([8, 6, 4, 2, 0], t, p.t1, p.t1 + PREPARA.volta);
  }
  return null;
}

// THE SWIM (the idle — every stretch she swims in sight between the skills): a slow BREATH, the lower jaw dropping a
// little and rising, the head steady. One breath is a whole cycle out of the E3 and back (frames 0–11; the clip's 12th
// is the E3 again), so it only starts when it fits before anything else needs the E3 — a turn-over (the roll's views are
// made from the E3), a skill, the draw-back; between breaths, a short rest. Her swims in sight on the profile are short
// (the longest 2.3 s), so a breath takes what fits (`janela(t)`: the seconds free ahead, up to `dur`), never under `min`.
export const NADAR = { dur: 2.4, min: 0.8, n: 12, pausa: 0.4 };
export function quadroNadar(t, st, janela) {
  if (st.t0 != null) {
    const k = Math.floor(((t - st.t0) / st.dur) * NADAR.n);
    if (k < NADAR.n) return k;
    st.t0 = null; st.prox = t + NADAR.pausa;
  }
  if (t >= (st.prox ?? 0)) { const d = janela(t); if (d >= NADAR.min) { st.t0 = t; st.dur = d; return 0; } }
  return null;
}

// THE DIVES toward the breach (his ask, on the swim: "nos mergulhos, em direção ao rombo, a serpente feche a boca", and
// "a boca pode fechar no meio das descidas") — the dive from the post, the sink before the trip under the hull, the sink
// to her death. The draw-back's hiss (when one came before) lets go back to the E3 as approved (0.35 s); then, in the
// middle of the descent (45% of the time her head is in sight, `vista`), the Echo's own closing (0.4 s), held shut —
// through the roll too (the closing frames have their own turn-over views). Returns [set, frame].
export const MERGULHOS = ['mergulho', 'afunda', 'afunda-morte'];
export const MERGULHO = { meio: 0.45, fecha: 0.4 };
export function quadroMergulho(t, tr, trechos, vista) {
  if (!MERGULHOS.includes(tr.nome)) return null;
  const antes = trechos[trechos.indexOf(tr) - 1], d = t - tr.t0;
  if (antes?.prepara && d < PREPARA.volta) return ['prepara', toca([8, 6, 4, 2, 0], d, 0, PREPARA.volta)];
  const f0 = Math.max(antes?.prepara ? PREPARA.volta : 0, vista * MERGULHO.meio);
  if (d < f0) return ['eco', 0];
  if (d < f0 + MERGULHO.fecha) return ['eco', toca([0, 1, 2, 3, 4, 5, 6], d, f0, f0 + MERGULHO.fecha)];
  return ['eco', 6];
}

// THE BITE IN THE SKULL (5%): a SHRIEK — the jaws burst wide open at once (the clip's first frame, a painted wound
// streak, left out), held through the code's kick and tremble, then back through the Echo's own gaping to the E3, and
// the draw-back's hiss, quicker, so the dive that follows starts from it as always. Window: the canos' cut (0.3 s) and
// the draw-back (0.6 s). Returns [set, frame].
export const MORDIDA = { grita: 0.1, segura: 0.45, volta: 0.65, fim: 0.9, chute: 0.25, chuteDur: 0.5 };
export function quadroMordida(t, tCranio) {
  const d = t - tCranio, M = MORDIDA;
  if (d < 0 || d >= M.fim) return null;
  if (d < M.grita) return ['dor', toca([1, 2, 3], d, 0, M.grita)];
  if (d < M.segura) return ['dor', 3];
  if (d < M.volta) return ['eco', toca([10, 9, 8, 7, 0], d, M.segura, M.volta)];
  return ['prepara', toca([1, 2, 3, 4, 5, 6, 7, 8], d, M.volta, M.fim)];
}
export const chuteMordida = (t, tCranio) => { const d = t - tCranio; return d >= 0 && d < MORDIDA.chuteDur ? MORDIDA.chute * (1 - d / MORDIDA.chuteDur) : 0; };

// STUCK IN THE BREACH (the death): she comes in with her mouth shut (the dive) and, stuck, her jaws fall open and hang
// slack, the ember in the throat dying to dark — then the head blows apart. Frames: 0 = shut, 8 = slack and dark.
export const PRESA = { cai: 0.7 };
export function quadroPresa(t, tr) {
  if (tr.hab !== 'presa') return null;
  return toca([0, 1, 2, 3, 4, 5, 6, 7, 8], t, tr.t0, tr.t0 + PRESA.cai) ?? 8;
}

// the head's kick back as each salvo fires (rad, toward the snout's up; 0 when none)
export function chuteCanos(t, C) {
  if (!C) return 0;
  const rel = t - C.t0;
  for (const s of C.salvas) { const d = rel - s.tFogo; if (s.livre != null && d >= 0 && d < CANOS.chuteDur) return CANOS.chute * (1 - d / CANOS.chuteDur); }
  return 0;
}
