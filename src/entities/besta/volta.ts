/**
 * THE RETURN (25/11, the Beast's step 6 — spec 2026-11-24 §4.2), the pure route: HALF a loop, IN FRONT of the ship. Up
 * onto the ceiling → hand over hand to the right → the top-right corner → down the right wall → off the wall, landing
 * at a gallop → the rip in the middle. Halfway down the right wall she pushes out THE SLOW WALL (step 11, 25/11 — the two
 * corner strikes hit the air and went); her core is exposed the whole way. (25/11, his call: the first version went round the LEFT wall too, behind the ship and
 * untouchable — "acho injusto a besta subir na parede da esquerda, pois a nave não vira o nariz para trás".)
 *
 * The route is a list of legs; each one is a clip played from one sprite position to another. The joints are where the
 * art meets itself, measured in the pixels (25/11):
 *   - the WALL POSE (QW, the last frame of `quina-chao-parede`, the first of `canto`) is the crawl turned 90° clockwise
 *     and shifted (4, 56) px; its claws touch x=4 of the frame;
 *   - the first frame of `quina-parede-teto` is the QW 66 px higher; its last is `teto1`, the claw at y=3;
 *   - `teto1`'s holding claw is at x 69–97 of the frame (mirrored, 158–186);
 *   - the first frame of `parede-descola` is the QW mirrored (claws at x=251).
 * No Phaser here (tested in Node: `scripts/test-besta-volta.mjs`).
 */

export type Borda = 'chao' | 'paredeE' | 'teto' | 'paredeD';
export type Canto = 'CD' | 'BD';
/** How the sprite travels in a leg: `linear` from `de` to `ate`; `inicio` jumps to `ate` first (a swap to the right,
 *  played backwards), `fim` stays at `de` and jumps at the end; `queda` falls (eased in) from `de` to `ate`. */
export type Movimento = 'linear' | 'inicio' | 'fim' | 'queda';

export interface Ponto {
  x: number;
  y: number;
}

export interface Trecho {
  nome: string;
  /** The sheet (`besta:<clipe>`), or a still pose when `parado`. */
  clipe: string;
  ms: number;
  de: Ponto;
  ate: Ponto;
  mov: Movimento;
  espelho: boolean;
  reverso: boolean;
  /** Sheet frames to play (in order); absent = all. */
  quadros?: number[];
  /** A still pose (one frame), not a clip. */
  parado?: boolean;
  borda: Borda;
  /** The core can be shot (always, since the return keeps in front of the ship). */
  exposta: boolean;
  /** A corner strike: hold the first frame `segura` ms, then the clip. */
  canto?: Canto;
  segura?: number;
  /** 25/11, step 11: the strike at the MIDDLE of the right wall that pushes out the slow wall (`besta/parede.ts`). */
  parede?: boolean;
  /** Hold the last frame this long after the clip (ms) — on the wall while the slab crosses the room. */
  espera?: number;
  /** Hanging: the hand she holds by at the end of the leg. */
  mao?: 1 | 2;
}

/** The arena and the art, given by the Predador (the numbers live there). */
export interface Arena {
  escala: number;
  largura: number;
  /** The drawn floor line; the side pose stands with its feet 124 frame px under the centre. */
  chaoApoio: number;
  /** Hanging, the claw tips at this y (inside the ceiling's metal). */
  garraCrava: number;
  /** The hanging claw in frame px from the centre (y=3 of the hanging poses). */
  garraTetoY: number;
  rasgoX: number;
  galopeVel: number;
  /** Today's grab of the ceiling (side → hanging), ms. */
  agarraMs: number;
  /** The frame px each ceiling swap carries the body: teto-anda-a (T1→T2) and teto-anda-b (T2→T1). */
  passoA: number;
  passoB: number;
}

export const VOLTA = {
  CANTO_SEGURA_MS: 250,
  CANTO_MS: 650,
  /** Half a crawl cycle (frames 0–16 start and end on the wall pose). */
  ESCALADA_MS: 560,
  ESCALADA_QUADROS: Array.from({ length: 17 }, (_, i) => i),
  QUINA_TETO_MS: 600,
  /** A ceiling swap in the return — faster than the idle walk (480 ms). */
  TROCA_MS: 340,
  /** Swaps across the ceiling: even, so she arrives on hand 1 (the pose the right corner starts from). */
  TROCAS: 2,
  /** Where the ceiling walk ends (hand 1): the ceiling anchor by the right corner. */
  TETO_FIM_X: 322,
  DESCOLA_MS: 300,
  VOO_MS: 380,
  /** Where the leap off the right wall lands. */
  POUSO_X: 250,
  /** The joints of the art (frame px). */
  QW_GARRA_X: 4,
  QW_ALTO_DY: 66,
  ESCALADA_DX: 4,
  ESCALADA_DY: 56,
  TETO1_GARRA_X: 83,
  DESCOLA_GARRA_X: 251,
  VOO_BASE_Y: 159,
} as const;

/**
 * The route from a floor position `x0` (she stands on the floor) to the rip. `tetoFimX` = where the ceiling walk ends
 * on hand 1 (default the corner anchor); a start already hanging walks there and joins the route at the corner.
 */
export function rotaDaVolta(x0: number, a: Arena, tetoFimX: number = VOLTA.TETO_FIM_X, esperaParede = 0): Trecho[] {
  const e = a.escala;
  const V = VOLTA;
  const yChao = a.chaoApoio - 124 * e;
  const yTeto = a.garraCrava - a.garraTetoY * e;
  const xD = a.largura - (V.DESCOLA_GARRA_X - 128) * e;
  const yAlto = yTeto - V.QW_ALTO_DY * e;
  const esc = { dx: V.ESCALADA_DX * e, dy: V.ESCALADA_DY * e };
  const p = (x: number, y: number): Ponto => ({ x, y });
  const r: Trecho[] = [];

  // the ceiling walk ends on hand 1 at the corner anchor; she grabs the ceiling that many swaps before it
  const passos: number[] = [];
  for (let i = 0, mao = 1; i < V.TROCAS; i++, mao = mao === 1 ? 2 : 1) passos.push((mao === 1 ? a.passoB : a.passoA) * e);
  const xFim = tetoFimX;
  let x = xFim - passos.reduce((s, d) => s + d, 0);

  // 1. up onto the ceiling (today's grab: side pose → hanging by hand 1)
  r.push({ nome: 'agarra', clipe: 'agarra', ms: a.agarraMs, de: p(x0, yChao), ate: p(x, yTeto), mov: 'linear', espelho: false, reverso: false, borda: 'teto', exposta: true, mao: 1 });
  // 2. the ceiling, hand over hand to the right (the clip that ENDS on the hand she holds, backwards)
  let mao: 1 | 2 = 1;
  for (let i = 0; i < V.TROCAS; i++) {
    const clipe = mao === 1 ? 'teto-anda-b' : 'teto-anda-a';
    mao = mao === 1 ? 2 : 1;
    r.push({ nome: `troca ${i + 1}`, clipe, ms: V.TROCA_MS, de: p(x, yTeto), ate: p(x + passos[i], yTeto), mov: 'inicio', espelho: false, reverso: true, borda: 'teto', exposta: true, mao });
    x += passos[i];
  }
  // 3. the top-right corner: she turns on the ceiling (the hanging pose mirrored, the claw kept where it holds), comes
  //    down onto the right wall (quina-parede-teto mirrored and backwards; the engine carries the rest to the wall), and
  //    strikes into the room
  const garra = x + (V.TETO1_GARRA_X - 128) * e;
  const xVira = garra - (255 - V.TETO1_GARRA_X - 128) * e;
  r.push({ nome: 'quina CD', clipe: 'quina-parede-teto', ms: V.QUINA_TETO_MS, de: p(xVira, yTeto), ate: p(xD, yTeto), mov: 'linear', espelho: true, reverso: true, borda: 'paredeD', exposta: true });
  // 4. down the right wall to its MIDDLE (the climb mirrored, backwards: head up), THE SLOW WALL (step 11: the strike
  //    into the room that pushes out the slab; she holds there, core lit, while it crosses), then down the rest.
  //    (25/11, his call: the two corner strikes hit the air — the ship lives at the far left — and went.)
  const yMeio = (yAlto + yChao) / 2;
  r.push({ nome: 'descida', clipe: 'escalada', ms: V.ESCALADA_MS, de: p(xD - esc.dx, yAlto + esc.dy), ate: p(xD - esc.dx, yMeio + esc.dy), mov: 'linear', espelho: true, reverso: true, quadros: [...V.ESCALADA_QUADROS], borda: 'paredeD', exposta: true });
  r.push({ nome: 'parede', clipe: 'canto', ms: V.CANTO_MS, de: p(xD, yMeio), ate: p(xD, yMeio), mov: 'linear', espelho: true, reverso: false, borda: 'paredeD', exposta: true, parede: true, segura: V.CANTO_SEGURA_MS, espera: esperaParede });
  r.push({ nome: 'descida 2', clipe: 'escalada', ms: V.ESCALADA_MS, de: p(xD - esc.dx, yMeio + esc.dy), ate: p(xD - esc.dx, yChao + esc.dy), mov: 'linear', espelho: true, reverso: true, quadros: [...V.ESCALADA_QUADROS], borda: 'paredeD', exposta: true });
  // 5. off the wall (drawn from the mirrored wall pose to the leap, facing left), the leap down to the floor, the gallop
  r.push({ nome: 'descola', clipe: 'parede-descola', ms: V.DESCOLA_MS, de: p(xD, yChao), ate: p(xD, yChao), mov: 'linear', espelho: false, reverso: false, borda: 'paredeD', exposta: true });
  r.push({ nome: 'voo', clipe: 'voo', ms: V.VOO_MS, de: p(xD, yChao), ate: p(V.POUSO_X, a.chaoApoio - (V.VOO_BASE_Y - 128) * e), mov: 'queda', espelho: false, reverso: false, parado: true, borda: 'chao', exposta: true });
  r.push({ nome: 'pouso', clipe: 'galope', ms: (Math.abs(V.POUSO_X - a.rasgoX) / a.galopeVel) * 1000, de: p(V.POUSO_X, yChao), ate: p(a.rasgoX, yChao), mov: 'linear', espelho: false, reverso: false, borda: 'chao', exposta: true });
  return r;
}

/**
 * Hanging at `x` by `mao`, where to walk to the right to end on hand 1 nearest the corner anchor: whole swaps only
 * (b +passoB from hand 1, a +passoA from hand 2), never past `limite`.
 */
export function fimDoTeto(x: number, mao: 1 | 2, a: Arena, limite = VOLTA.TETO_FIM_X + 10): number {
  const ciclo = (a.passoA + a.passoB) * a.escala;
  let alvo = mao === 1 ? x : x + a.passoA * a.escala;
  let melhor = alvo;
  for (; alvo <= limite; alvo += ciclo) if (Math.abs(alvo - VOLTA.TETO_FIM_X) < Math.abs(melhor - VOLTA.TETO_FIM_X)) melhor = alvo;
  return melhor;
}

/** The whole run, ms (the rip that follows not included). */
export function duracao(rota: readonly Trecho[]): number {
  return rota.reduce((s, t) => s + t.ms + (t.segura ?? 0) + (t.espera ?? 0), 0);
}
