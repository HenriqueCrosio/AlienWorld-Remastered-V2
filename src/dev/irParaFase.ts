/** What a boss shows the dev jump (the optional part of `StageBoss`). */
export interface ComFases {
  readonly devFaseAtual?: string;
  devProximaFase?(): string | null;
}

/**
 * THE JUMP TO A PHASE (`?fase=`, and key 8 restarting at the same phase — spec 2026-11-24-besta-refeita §7): every
 * frame, while the boss is not in the target phase, ask it for the next one. A boss that can't jump now (entering, a
 * head dying, the Beast surging) answers null and is asked again next frame. Before the boss exists it just waits. It
 * gives up after `limiteS` of play (a target this boss never reaches — or one behind it).
 */
export class IrParaFase {
  private t = 0;

  constructor(
    readonly alvo: string,
    private readonly limiteS = 60,
  ) {}

  /** @returns true when done: reached, or gave up */
  passo(chefe: ComFases | null, dt: number): boolean {
    this.t += dt;
    if (chefe?.devFaseAtual === this.alvo) return true;
    if (this.t > this.limiteS) {
      console.warn(`[dev] a fase ${this.alvo} não chegou em ${this.limiteS} s (está em ${chefe?.devFaseAtual ?? 'nenhum chefão'})`);
      return true;
    }
    chefe?.devProximaFase?.();
    return false;
  }
}
