/**
 * THE HEAD'S ANIMATIONS (stage 3; the mock's `gestos.mjs`, ported line by line): the PixMiniMax frames of each gesture,
 * drawn in place of the approved E3 while the gesture plays — the same skull, the mouth varying. Every gesture falls on
 * the profile (φ = 0), so the frames never meet the roll's views — except the dives' shut mouth (the Echo's frames
 * 1–6), which has its own turn-over views. Frames are 96×96 with the E3 at y 16; their normals come from one strip.
 * The timing functions below are the mock's, verbatim (see its comments for each gesture's rounds).
 */
import { Ampliado } from './ampliado.ts';
import { vistasCabeca, type DorsoCabeca, type Vistas } from './arte.ts';
import { GESTOS_N, PASTAS_GESTO, chaveGesto, chaveNormaisGesto, type PastaGesto } from './arquivos.ts';
import type { Canos } from './canos.ts';
import type { Rodada } from './eco.ts';
import type { Leitor } from './fonte.ts';
import type { Ponto, Trecho } from './tipos.ts';

const OY = 16; // the E3's place in the 96×96 frame

export interface QuadroGesto {
  k: number;
  data: Uint8Array | Uint8ClampedArray;
  w: number;
  h: number;
  oy: number;
  n: Float32Array;
  readonly m8: Ampliado;
  boca: Ponto | null;
  vistas?: Vistas;
}
export type Gestos = Record<PastaGesto, QuadroGesto[]>;

function carregaQuadros(ler: Leitor, pasta: PastaGesto): QuadroGesto[] {
  const nrm = ler(chaveNormaisGesto(pasta));
  const out: QuadroGesto[] = [];
  for (let k = 0; k < GESTOS_N[pasta]; k++) {
    const img = ler(chaveGesto(pasta, k));
    const data = img.data, w = img.w, h = img.h, nv = new Float32Array(w * h * 3);
    let bx = 0, by = 0, bn = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = y * w + x, j = (y * nrm.w + k * w + x) * 4;
        if (nrm.data[j + 3] >= 128) { nv[p * 3] = nrm.data[j] / 127.5 - 1; nv[p * 3 + 1] = nrm.data[j + 1] / 127.5 - 1; nv[p * 3 + 2] = nrm.data[j + 2] / 127.5 - 1; }
        const r = data[p * 4], b = data[p * 4 + 2];
        if (data[p * 4 + 3] > 128 && x < 40 && r > 180 && r > b + 80) { bx += x; by += y; bn++; } // the mouth's ember
      }
    const lz = Ampliado.preguicoso(data, w, h);
    out.push({ k, data, w, h, oy: OY, n: nv, get m8() { return lz.m8; }, boca: bn > 3 ? { x: bx / bn, y: by / bn - OY } : null });
  }
  return out;
}

export function carregaGestos(ler: Leitor, dz: DorsoCabeca | null): Gestos {
  const G = {} as Gestos;
  for (const p of PASTAS_GESTO) G[p] = carregaQuadros(ler, p);
  // (the dive from the post rolls her over mid-dive: the closing mouth (the Echo's 1–6) gets its own turn-over views,
  // by the same method, from each frame cut to the E3's 96×64)
  for (const f of G.eco.slice(1, 7)) {
    const W = 96, H = 64, d = new Uint8Array(W * H * 4), n = new Float32Array(W * H * 3);
    for (let y = 0; y < H; y++) {
      d.set(f.data.subarray((y + OY) * W * 4, ((y + OY) * W + W) * 4), y * W * 4);
      n.set(f.n.subarray((y + OY) * W * 3, ((y + OY) * W + W) * 3), y * W * 3);
    }
    f.vistas = vistasCabeca(d, W, H, n, dz);
  }
  return G;
}

// a sequence of frame indices played over [t0, t1)
const toca = (seq: number[], t: number, t0: number, t1: number): number => seq[Math.min(seq.length - 1, Math.floor(((t - t0) / (t1 - t0)) * seq.length))];

// THE ECHO. Frames: 0 = the E3, 1–6 = closing (6 shut), 7–11 = gaping (11 widest).
export const ECO = { fecha: 0.5, estalo: 0.17, aberta: 0.55, volta: 0.6 };
export function quadroEco(t: number, rodadas: readonly Rodada[]): number | null {
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

// THE PIPES. Frames: 0 = the E3, 1–8 = the charge, 9–10 = the slam, 11–16 = closing (16 shut).
export const CANOS = { bate: 0.1, volta: 0.4, chute: 0.12, chuteDur: 0.3 };
const REABRE = [16, 14, 12, 0], CARGA = [1, 2, 3, 4, 5, 6, 7, 8], BATE = [8, 9, 10, 16];
export function quadroCanos(t: number, C: Canos | undefined): number | null {
  const q = C?.estado(t);
  if (!C || !q) return null;
  const rel = t - C.t0, ult = C.salvas[2];
  if (q.fase === 'aviso') return toca(q.i === 0 ? [0, ...CARGA] : [...REABRE, ...CARGA], q.k, 0, 1);
  if (q.fase === 'fogo') {
    const s = C.salvas[q.i as number], d = rel - s.tFogo;
    return d < CANOS.bate ? toca(BATE, d, 0, CANOS.bate) : 16;
  }
  if (q.fase === 'entre') return 16;
  if (q.fase === 'brasa') {
    const d = rel - ult.tFim - (C.N.canos.brasa - CANOS.volta);
    return d < 0 ? 16 : toca(REABRE, d, 0, CANOS.volta);
  }
  if (q.fase === 'apaga') {
    const d = rel - (C.corte as number);
    return d < 0.28 ? toca(REABRE, d, 0, 0.28) : null;
  }
  return null;
}
// THE DRAW-BACK (the hiss). Frames: 0 = the E3, 1–8 = the hiss (8 darkest).
export const PREPARA = { sobe: 0.45, volta: 0.35 };
export function quadroPrepara(t: number, trechos: readonly Trecho[]): number | null {
  for (const p of trechos) {
    if (!p.prepara || t < p.t0 || t >= p.t1 + PREPARA.volta) continue;
    if (t < p.t1) return toca([0, 1, 2, 3, 4, 5, 6, 7, 8], t, p.t0, p.t0 + PREPARA.sobe) ?? 8;
    return toca([8, 6, 4, 2, 0], t, p.t1, p.t1 + PREPARA.volta);
  }
  return null;
}

// THE SWIM (a slow breath out of the E3 and back, only when it fits).
export const NADAR = { dur: 2.4, min: 0.8, n: 12, pausa: 0.4 };
export interface EstadoNadar { t0?: number | null; dur?: number; prox?: number }
export function quadroNadar(t: number, st: EstadoNadar, janela: (t: number) => number): number | null {
  if (st.t0 != null) {
    const k = Math.floor(((t - st.t0) / (st.dur as number)) * NADAR.n);
    if (k < NADAR.n) return k;
    st.t0 = null;
    st.prox = t + NADAR.pausa;
  }
  if (t >= (st.prox ?? 0)) {
    const d = janela(t);
    if (d >= NADAR.min) {
      st.t0 = t;
      st.dur = d;
      return 0;
    }
  }
  return null;
}

// THE DIVES toward the breach: the hiss lets go, then the Echo's closing in the middle of the descent. [set, frame]
export const MERGULHOS = ['mergulho', 'afunda', 'afunda-morte'];
export const MERGULHO = { meio: 0.45, fecha: 0.4 };
export function quadroMergulho(t: number, tr: Trecho, trechos: readonly Trecho[], vista: number): [PastaGesto, number] | null {
  if (!MERGULHOS.includes(tr.nome)) return null;
  const antes = trechos[trechos.indexOf(tr) - 1], d = t - tr.t0;
  if (antes?.prepara && d < PREPARA.volta) return ['prepara', toca([8, 6, 4, 2, 0], d, 0, PREPARA.volta)];
  const f0 = Math.max(antes?.prepara ? PREPARA.volta : 0, vista * MERGULHO.meio);
  if (d < f0) return ['eco', 0];
  if (d < f0 + MERGULHO.fecha) return ['eco', toca([0, 1, 2, 3, 4, 5, 6], d, f0, f0 + MERGULHO.fecha)];
  return ['eco', 6];
}

// THE BITE IN THE SKULL (5%): a SHRIEK. [set, frame]
export const MORDIDA = { grita: 0.1, segura: 0.45, volta: 0.65, fim: 0.9, chute: 0.25, chuteDur: 0.5 };
export function quadroMordida(t: number, tCranio: number): [PastaGesto, number] | null {
  const d = t - tCranio, M = MORDIDA;
  if (d < 0 || d >= M.fim) return null;
  if (d < M.grita) return ['dor', toca([1, 2, 3], d, 0, M.grita)];
  if (d < M.segura) return ['dor', 3];
  if (d < M.volta) return ['eco', toca([10, 9, 8, 7, 0], d, M.segura, M.volta)];
  return ['prepara', toca([1, 2, 3, 4, 5, 6, 7, 8], d, M.volta, M.fim)];
}
export const chuteMordida = (t: number, tCranio: number): number => {
  const d = t - tCranio;
  return d >= 0 && d < MORDIDA.chuteDur ? MORDIDA.chute * (1 - d / MORDIDA.chuteDur) : 0;
};

// STUCK IN THE BREACH (the death). Frames: 0 = shut, 8 = slack and dark.
export const PRESA = { cai: 0.7 };
export function quadroPresa(t: number, tr: Trecho): number | null {
  if (tr.hab !== 'presa') return null;
  return toca([0, 1, 2, 3, 4, 5, 6, 7, 8], t, tr.t0, tr.t0 + PRESA.cai) ?? 8;
}

/** the head's kick back as each salvo fires (rad; 0 when none) */
export function chuteCanos(t: number, C: Canos | undefined): number {
  if (!C) return 0;
  const rel = t - C.t0;
  for (const s of C.salvas) {
    const d = rel - s.tFogo;
    if (s.livre != null && d >= 0 && d < CANOS.chuteDur) return CANOS.chute * (1 - d / CANOS.chuteDur);
  }
  return 0;
}
