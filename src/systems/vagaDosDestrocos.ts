/**
 * THE ROOM AT BIRTH (21/11, his report: "um asteroide nascia em cima do outro" — a small or medium one born together
 * with the miner's rock). Every hazard is born at the same column (`GAME_WIDTH + 40`; the drone's rock lands there
 * too, `e.x + 24` from `GAME_WIDTH + 16`) and every one scrolls left at the SAME speed, so the x distance between two
 * hazards never changes: two pieces meet only if they share a column, and then their meeting is decided by their
 * heights and their vertical drifts alone. So the check is exact and cheap: a straight line in y, over the newborn's
 * whole crossing. Pure (no Phaser) — `scripts/test-destrocos-vaga.mjs`.
 */

/** A hazard as the check sees it: centre, vertical drift (px/s) and a radius (the visible half of its art). */
export interface Trilho {
  x: number;
  y: number;
  vy: number;
  r: number;
}

/** Pixels of clear space kept between two pieces of rock. */
export const FOLGA = 3;

/** The visible radius of a sprite of this display size: the art has a transparent margin, and it spins. */
export const raioDe = (larguraTela: number, alturaTela: number): number => 0.45 * Math.max(larguraTela, alturaTela);

/** Do `a` and `b` ever overlap within `t` seconds? (both scroll at the same speed: only y moves between them) */
export function seEncontram(a: Trilho, b: Trilho, t: number): boolean {
  const lim = a.r + b.r + FOLGA;
  if (Math.abs(a.x - b.x) >= lim) return false;
  // same column: the vertical gap is linear in time, so it is enough to look at both ends of the window
  const d0 = a.y - b.y;
  const d1 = d0 + (a.vy - b.vy) * t;
  if (Math.abs(d0) < lim || Math.abs(d1) < lim) return true;
  // the gap changed sign in between: they crossed each other
  return Math.sign(d0) !== Math.sign(d1);
}

/** Is `novo` clear of all `outros` for `t` seconds? */
export const livre = (novo: Trilho, outros: readonly Trilho[], t: number): boolean =>
  outros.every((o) => !seEncontram(novo, o, t));

/**
 * A random height for the newborn (the hazard mix): `tentativas` draws in `faixa`, the first that is clear. `null` when
 * the column is full — the caller skips that birth rather than stacking two rocks.
 */
export function alturaSorteada(
  rnd: () => number,
  faixa: readonly [number, number],
  novo: Omit<Trilho, 'y'>,
  outros: readonly Trilho[],
  t: number,
  tentativas = 8,
): number | null {
  for (let i = 0; i < tentativas; i++) {
    const y = Math.round(faixa[0] + rnd() * (faixa[1] - faixa[0]));
    if (livre({ ...novo, y }, outros, t)) return y;
  }
  return null;
}

/**
 * The height nearest to `y` that is clear (the miner's rock: its height comes from the stage script, so it only steps
 * aside as little as it must). Searches outward in `passo` px steps inside `faixa`; `null` if nothing is clear.
 */
export function alturaMaisPerto(
  y: number,
  faixa: readonly [number, number],
  novo: Omit<Trilho, 'y'>,
  outros: readonly Trilho[],
  t: number,
  passo = 2,
): number | null {
  const alcance = faixa[1] - faixa[0];
  for (let d = 0; d <= alcance; d += passo) {
    for (const yy of d === 0 ? [y] : [y - d, y + d]) {
      if (yy < faixa[0] || yy > faixa[1]) continue;
      if (livre({ ...novo, y: yy }, outros, t)) return yy;
    }
  }
  return null;
}
