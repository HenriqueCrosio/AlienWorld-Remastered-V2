/**
 * THE THIRST (25/11, the Beast's step 5 — spec 2026-11-24 §4.1), the pure rules. Planted on the floor, she opens her
 * chest and the core lights a RING: every player shot that enters it is drunk (no damage) and remembers the line it came
 * along. At the jolt she gives each one back ALONG THE SAME LINE, REVERSED, in the order they came in, squeezed into
 * ~0.6 s. The player draws the figure: who fired standing still gets a wall at that height; a spread comes back as a fan.
 *
 * The cap: at most 24 come back. Returns on the same line (same heading, < 4 px aside) that would leave < 4 px apart
 * merge into one — so a stationary HMG still returns a train (a wall), not a single shot. Above 24, an even subset
 * that keeps the first and the last of every line. No Phaser here (tested in Node: `scripts/test-besta-sede.mjs`).
 */

export const SEDE = {
  /** How long the ring stays open, s. */
  ABERTA_S: 2.0,
  /** The return is squeezed into this, s (the first one leaves at 0, the last at this). */
  DEVOLVE_S: 0.6,
  /** At most this many come back. */
  TETO: 24,
  /** Returns closer than this (px) on the same line merge; lines closer than this aside are the same line. */
  JUNTA_PX: 4,
  /** Heading tolerance for "the same line", degrees. */
  RUMO_GRAUS: 2,
  /** The speed of every returned shot, px/s (the player's own speed — up to 500 — would leave no time to dodge). */
  V: 240,
  /** The ring's radius around the core, px. */
  RAIO: 18,
} as const;

/** A drunk shot: where it entered the ring, its unit heading, when (s since the ring opened), its colour. */
export interface Bebido {
  x: number;
  y: number;
  dx: number;
  dy: number;
  t: number;
  cor: number;
  /** The shot's shape (1 single, 2 Duplo, 3 Triplo): only the look of its return. */
  forma?: number;
}

/** A returned shot: where it leaves, its velocity (px/s), when (s since the jolt), its colour. */
export interface Devolvido {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  cor: number;
  /** One, two or three beads (the shape of the shot it was) — visual only. */
  forma: number;
}

interface Linha {
  x: number;
  y: number;
  dx: number;
  dy: number;
  itens: Devolvido[];
}

/** `n` indices spread evenly over 0..total−1, always the first and the last. */
function espalhar(total: number, n: number): number[] {
  if (n >= total) return Array.from({ length: total }, (_, i) => i);
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => Math.round((i * (total - 1)) / (n - 1)));
}

export function devolucao(bebidos: readonly Bebido[]): Devolvido[] {
  if (!bebidos.length) return [];
  const ordem = [...bebidos].sort((a, b) => a.t - b.t);
  const t0 = ordem[0].t;
  const vao = ordem[ordem.length - 1].t - t0;
  const cosRumo = Math.cos((SEDE.RUMO_GRAUS * Math.PI) / 180);

  // 1. each one on its line (same heading, < JUNTA_PX aside), reversed, on the squeezed clock
  const linhas: Linha[] = [];
  for (const b of ordem) {
    const n = Math.hypot(b.dx, b.dy) || 1;
    const dx = b.dx / n;
    const dy = b.dy / n;
    const d: Devolvido = { x: b.x, y: b.y, vx: -dx * SEDE.V, vy: -dy * SEDE.V, t: vao > 0 ? (SEDE.DEVOLVE_S * (b.t - t0)) / vao : 0, cor: b.cor, forma: b.forma ?? 1 };
    // (a Duplo shot is two parallel lines 4 px apart that come back as ONE line of paired beads — so its lines join wider)
    const junta = SEDE.JUNTA_PX * ((b.forma ?? 1) >= 2 ? 2 : 1);
    const linha = linhas.find((l) => l.dx * dx + l.dy * dy >= cosRumo && Math.abs((b.x - l.x) * -l.dy + (b.y - l.y) * l.dx) < junta);
    if (linha) linha.itens.push(d);
    else linhas.push({ x: b.x, y: b.y, dx, dy, itens: [d] });
  }

  // 2. on a line, a return that would leave < JUNTA_PX behind the previous one merges into it
  for (const l of linhas) {
    const juntos: Devolvido[] = [];
    for (const d of l.itens) {
      const ant = juntos[juntos.length - 1];
      if (!ant || (d.t - ant.t) * SEDE.V >= SEDE.JUNTA_PX) juntos.push(d);
    }
    l.itens = juntos;
  }

  // 3. the cap: more lines than the cap → an even subset of lines (one shot each, the first); otherwise share the cap
  //    by size, every line keeping its first and last
  let total = linhas.reduce((s, l) => s + l.itens.length, 0);
  let saida: Devolvido[];
  if (total <= SEDE.TETO) saida = linhas.flatMap((l) => l.itens);
  else if (linhas.length >= SEDE.TETO) saida = espalhar(linhas.length, SEDE.TETO).map((i) => linhas[i].itens[0]);
  else {
    const cota = linhas.map((l) => Math.min(l.itens.length, Math.max(Math.min(2, l.itens.length), Math.floor((SEDE.TETO * l.itens.length) / total))));
    total = cota.reduce((s, c) => s + c, 0);
    // trim the biggest shares (never under 2) until it fits, then hand the leftover to the biggest lines
    while (total > SEDE.TETO) {
      const i = cota.indexOf(Math.max(...cota));
      if (cota[i] <= 2) break;
      cota[i]--;
      total--;
    }
    // still over (many short lines at 2 each): lines drop to their first shot, the last lines first
    for (let i = cota.length - 1; total > SEDE.TETO && i >= 0; i--) {
      if (cota[i] > 1) {
        total -= cota[i] - 1;
        cota[i] = 1;
      }
    }
    for (let i = 0; total < SEDE.TETO; i = (i + 1) % cota.length) {
      if (cota[i] < linhas[i].itens.length) {
        cota[i]++;
        total++;
      } else if (cota.every((c, k) => c >= linhas[k].itens.length)) break;
    }
    saida = linhas.flatMap((l, i) => espalhar(l.itens.length, cota[i]).map((k) => l.itens[k]));
  }
  return saida.sort((a, b) => a.t - b.t);
}
