/**
 * THE EEL'S LIFE RULES (spec §6.2–6.4; plan `2026-11-08-enguia-instalacao.md`, decision 8): the bites at 22 / 13 / 5 %
 * of HER life (each once, in order — one hit can cross two), the floor of 1 everywhere but the Echo's pause of the final
 * stretch, and the death at 0 there. Pure: the boss feeds the hits, the fight says where she stands.
 */
export type Limiar = 22 | 13 | 5;
export const LIMIARES: readonly Limiar[] = [22, 13, 5];

export class VidaEnguia {
  readonly max: number;
  hp: number;
  private proximo = 0;
  constructor(max: number, inicio = 1) {
    this.max = max;
    this.hp = max * inicio;
    // (a fight started low — the dev shortcut `vida=` — has already crossed the thresholds above it: they still bite)
  }
  /** a hit; returns the bites it crossed and whether she died */
  fere(dano: number, ondeEsta: { podeMorrer: boolean; imune: boolean }): { mordidas: Limiar[]; morreu: boolean } {
    if (ondeEsta.imune || dano <= 0 || this.hp <= 0) return { mordidas: [], morreu: false };
    const piso = ondeEsta.podeMorrer ? 0 : 1;
    this.hp = Math.max(piso, this.hp - dano);
    const mordidas: Limiar[] = [];
    while (this.proximo < LIMIARES.length && (this.hp / this.max) * 100 <= LIMIARES[this.proximo]) mordidas.push(LIMIARES[this.proximo++]);
    return { mordidas, morreu: this.hp <= 0 };
  }
  get fracao(): number {
    return Math.max(0, this.hp / this.max);
  }
  /** the final stretch is on (the skull was bitten) */
  get retaFinal(): boolean {
    return this.proximo >= LIMIARES.length;
  }
}
