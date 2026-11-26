/**
 * THE HEART STOPS (25/11, the Beast's step 8 — spec 2026-11-24 §4.4, the climax), the pure rules. Planted on the floor
 * she throws a FIELD of shards in arcs (the F4 gravity) — a fixed figure: 30 shards in 5 rows (step 12; was 15 in 3 arcs),
 * over the room from right to left (no fan with a gap: the challenge is the frozen map, not the breach). Then she drives
 * her claws into her own core and the heart STOPS: everything that flies freezes in the air, hers and the player's. Only
 * the ship moves; the player's shots fired in the freeze stop in front of it and pile up. After ~1.5 s the heart beats
 * again and everything resumes together: her field goes on along its arcs, the player's pile leaves at once.
 *
 * Here: the figure (where each shard is at the instant of the freeze) and the throw that gets it there. No Phaser
 * (`scripts/test-besta-coracao.mjs`).
 */

export const CORACAO = {
  /** How long the heart stays stopped, s. (25/11, his call: 1.5 → 2.0 — at 110 px/s the ship could not reach the
   *  pocket by her from the far left. Then step 12, the put-out route: crossing the field along it is ~2.3–2.6 s from
   *  the far left — 3.0.) */
  PARADO_S: 4.5,
  /**
   * 26/11, him playing: *"o vão já aparece, mas até entender que você precisa passar por eles, o jogador já tomou o dano...
   * muitas vezes não dá tempo de passar"* — 3.0 → 4.5 s, and the heart counts its way back: three beats with body at
   * these moments before the resume (s before it), louder each time, the lit shards flaring with them.
   */
  VOLTA_BATIDAS: [1.5, 0.9, 0.4],
  /** The route goes out as a SWEEP from the left wall to the pocket, one cell per this (ms): the eye follows the path. */
  APAGA_PASSO_MS: 75,
  /** At the freeze a lit shard this close to the ship's hull (px) goes out too: the field never forms ON the ship. */
  POUPA_NAVE: 8,
  /** The coracao-a clip, split: the claws close on the core (0–3), the heart held stopped (3–12, over PARADO_S), the
   *  release with the burst (13–15) — the burst IS the heart starting again. */
  APERTA_MS: 260,
  SOLTA_MS: 320,
  /** The columns' x at the freeze, LEFT to right, 32 px apart (step 12: 6 columns × 5 rows = 30 shards). The odd rows'
   *  first shard sits at x 34: a ship hugging the left wall (its hull box 0–21) moves up and down past it with 8 px to spare. */
  COLUNAS: [46, 78, 110, 142, 174, 206],
  /** The five rows: their base height, how much they arch up in the middle (px), and the odd rows shifted 12 px
   *  left so the columns never line up. */
  LINHAS: [
    { y: 38, arco: 8, dx: 0 },
    { y: 70, arco: 7, dx: -12 },
    { y: 102, arco: 6, dx: 0 },
    { y: 134, arco: 5, dx: -12 },
    { y: 166, arco: 4, dx: 0 },
  ],
  /**
   * 25/11 — STEP 12, THE PUT-OUT ROUTE (his: *"nessa salva de lava, alguns vão se apagar, assim o jogador consegue passar
   * nos que tiverem apagados sem tomar dano, fugindo da situação"*; "pode até ser sorteado"). At the squeeze the shards of
   * ONE route go out (dark metal, no wound, no light): a chain of cells [row, column] from the field's left edge to the
   * pocket by her, in L steps (a horizontal run, then a step of one row in the same column — a diagonal step would pass
   * 1–2 px from the lit neighbours). Four fixed routes, one drawn per heart.
   */
  ROTAS: [
    { nome: 'desce', celulas: [[1, 0], [1, 1], [2, 1], [2, 2], [2, 3], [3, 3], [3, 4], [3, 5]] },
    { nome: 'sobe', celulas: [[3, 0], [3, 1], [2, 1], [2, 2], [2, 3], [1, 3], [1, 4], [1, 5]] },
    { nome: 'alto', celulas: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [1, 5]] },
    { nome: 'baixo', celulas: [[4, 0], [4, 1], [4, 2], [3, 2], [3, 3], [3, 4], [3, 5]] },
  ] as readonly { nome: string; celulas: readonly (readonly [number, number])[] }[],
  /** A field shard wounds by its lit core (px), not the pool's generic 13×9 enemy-shot box. */
  CAIXA: [9, 6],
  /** The pile of the player's shots in the freeze: this far in front of the ship (px), spread a little. */
  PILHA_X: 12,
} as const;

export interface Estilhaco {
  /** Where it is at the freeze, and its cell. */
  x: number;
  y: number;
  linha: number;
  coluna: number;
  /** The throw: the velocity it leaves her with (px/s), launched all at once from the same point. */
  vx: number;
  vy: number;
}

/** The figure at the freeze: 5 rows × 6 columns (`linha`, `coluna` = its cell). */
export function figuraDoCampo(): { x: number; y: number; linha: number; coluna: number }[] {
  const xs = CORACAO.COLUNAS;
  const x0 = xs[0] - 16;
  const x1 = xs[xs.length - 1];
  return CORACAO.LINHAS.flatMap((a, linha) =>
    xs.map((x, coluna) => {
      const xa = x + a.dx;
      return { x: xa, y: a.y - a.arco * Math.sin((Math.PI * (xa - x0)) / (x1 - x0)), linha, coluna };
    }),
  );
}

/** The n-th heart's route (drawn by the caller among the fixed ones), as the set of its cells' keys "row,column". */
export function apagadas(rota: number): Set<string> {
  const r = CORACAO.ROTAS[((rota % CORACAO.ROTAS.length) + CORACAO.ROTAS.length) % CORACAO.ROTAS.length];
  return new Set(r.celulas.map(([l, c]) => `${l},${c}`));
}

/**
 * The throw: from (x0, y0), under gravity `g`, each shard reaches its place of the figure exactly `tf` s later (the
 * instant the heart stops).
 */
export function campo(x0: number, y0: number, tf: number, g: number): Estilhaco[] {
  return figuraDoCampo().map((p) => ({
    ...p,
    vx: (p.x - x0) / tf,
    vy: (p.y - y0 - 0.5 * g * tf * tf) / tf,
  }));
}

/** Where a shard of the throw is at time t (s since the throw). */
export function ondeEsta(e: Estilhaco, x0: number, y0: number, t: number, g: number): { x: number; y: number } {
  return { x: x0 + e.vx * t, y: y0 + e.vy * t + 0.5 * g * t * t };
}
