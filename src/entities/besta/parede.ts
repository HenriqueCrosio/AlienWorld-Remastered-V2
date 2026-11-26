/**
 * THE SLOW WALL (25/11, the Beast's step 11 — his idea): in the return (phase 2) she stops at the MIDDLE of the right
 * wall, slows her own heart and pushes out a SLAB of lava, column after column, that crosses the room slowly, with a
 * winding corridor through it. *"Ele vai lançar uma parede de algo e, nessa parede, vai ter um caminho que o jogador vai
 * precisar fazer para desviar. Assim dá tempo de desviar, o jogador que não fizer toma dano."* It replaces the two corner
 * strikes, which hit the air (his: *"precisamos tirar um dos ataques no ar, não faz sentido ter... ou faça a besta
 * atacar o meio"*).
 *
 * The slab: `COLUNAS` columns `ESPACO` px apart, each a stack of shards from the ceiling to the floor with ONE gap. The
 * gaps of neighbouring columns OVERLAP by more than the ship's height (with room each side): the corridor is a tube the
 * ship drifts along — between two columns there are only ~6 px of free x for a 21 px ship, so it never has to jump from
 * one gap to another. Three fixed corridors, drawn by lot (never piece by piece). The slowness has a visible cause: every
 * shard pulses with her slowed heartbeat (`PULSO_S`). No Phaser here (`scripts/test-besta-parede.mjs`).
 */

export const PAREDE = {
  COLUNAS: 5,
  /** Between columns (px): dense enough to read as one slab. */
  ESPACO: 36,
  /** The slab's speed to the left (px/s) — the ship flies at 110. */
  VEL: 55,
  /** The corridor in each column (px), and how much it moves between neighbours at most (overlap ≥ ship + margins). */
  VAO: 48,
  TROCA_MAX: 30,
  /** The shards' spacing in a column (px): with their 6 px box the cracks are 6 px — the 9 px ship never fits. */
  PASSO_Y: 12,
  /** The room's height for the slab (px): the first shard under the ceiling, the last over the floor. */
  TOPO: 16,
  FUNDO: 186,
  /** Where each column is born: in front of her body on the wall (its left edge at ~285 px). */
  X0: 270,
  /** Her slowed heartbeat (the shards pulse with it), s. */
  PULSO_S: 1.6,
  /** The shard's wounding box (the heart's field shards: 9×6). */
  CAIXA: [9, 6] as const,
  /** The corridors (gap centres, first column → last). The first column is the first to reach the ship. */
  FIGURAS: [
    { nome: 'desce', vaos: [56, 84, 112, 140, 150] },
    { nome: 'sobe', vaos: [150, 128, 100, 72, 50] },
    { nome: 'S', vaos: [100, 72, 100, 128, 100] },
  ] as readonly { nome: string; vaos: readonly number[] }[],
  /** She holds on the wall until the LAST column has crossed this x (the ship's side), then goes on with the return. */
  SOLTA_X: 40,
} as const;

/** The n-th wall's corridor (the figures turn; the caller draws n). */
export function figuraDaParede(n: number): { nome: string; vaos: readonly number[] } {
  const k = PAREDE.FIGURAS.length;
  return PAREDE.FIGURAS[((n % k) + k) % k];
}

/** The shards' heights of one column with its gap centred at `vao`. */
export function pecasDaColuna(vao: number): number[] {
  const ys: number[] = [];
  const livre = PAREDE.VAO / 2 + PAREDE.CAIXA[1] / 2;
  for (let y = PAREDE.TOPO; y <= PAREDE.FUNDO; y += PAREDE.PASSO_Y) if (Math.abs(y - vao) >= livre) ys.push(y);
  return ys;
}

/** When column i is born (s after the first), at X0: one column per ESPACO of travel — the slab comes out of her. */
export function nascimento(i: number): number {
  return (i * PAREDE.ESPACO) / PAREDE.VEL;
}

/** How long she holds on the wall: until the last column has crossed SOLTA_X (s after the first column is born). */
export function segura(): number {
  return nascimento(PAREDE.COLUNAS - 1) + (PAREDE.X0 - PAREDE.SOLTA_X) / PAREDE.VEL;
}

/**
 * Can a ship (`naveH` tall, at `vNave` px/s) fly the corridor? For each pair of neighbouring columns the gaps must
 * overlap by the ship's height plus `margem` on each side, and drifting from one centre to the next must fit in the time
 * between them. Returns the smallest overlap margin and the largest drift speed needed.
 */
export function percorrivel(vaos: readonly number[], naveH = 9, vNave = 110, margem = 3): { ok: boolean; folga: number; vNecessaria: number } {
  let folga = Infinity;
  let vNecessaria = 0;
  const dt = PAREDE.ESPACO / PAREDE.VEL;
  for (let i = 1; i < vaos.length; i++) {
    const d = Math.abs(vaos[i] - vaos[i - 1]);
    folga = Math.min(folga, (PAREDE.VAO - d - naveH) / 2);
    vNecessaria = Math.max(vNecessaria, d / dt);
  }
  // the gap itself must hold the ship with the margin (the cracks next to it are shards)
  folga = Math.min(folga, (PAREDE.VAO - naveH) / 2);
  return { ok: folga >= margem && vNecessaria <= vNave * 0.6, folga, vNecessaria };
}
