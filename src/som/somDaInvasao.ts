import Phaser from 'phaser';
import { Som } from './Som';
import { HORIZONTE, sorteadorSemRepetir, trovoes } from './regrasAmbiente';

/**
 * THE INVASION HEARD FROM AFAR (block SOUND, sheet 8, 18/11): the colony falls kilometres away, so each thing on the
 * horizon is SEEN first and heard a moment later. Only the Game scene sounds (the horizon is scenery elsewhere too).
 */
export class SomDaInvasao {
  private readonly flyby = sorteadorSemRepetir(['fx.f1.flyby', 'fx.f1.flyby2', 'fx.f1.flyby3'], Math.random);
  private readonly flak = sorteadorSemRepetir(['fx.f1.flak', 'fx.f1.flak2'], Math.random);
  private readonly explosao = sorteadorSemRepetir(['fx.f1.explosao', 'fx.f1.explosao2'], Math.random);
  private rajadaEm = -Infinity;

  constructor(private readonly scene: Phaser.Scene) {}

  private depois(ms: number, f: () => void): void {
    this.scene.time.delayedCall(ms, f);
  }

  /** A ship coming down out of the clouds toward the colony: its sound crosses the sky with it. */
  nave(xDe: number, xAte: number): void {
    Som.tocar(this.flyby(), { x: xDe, xFim: xAte });
  }

  rajada(x: number, t: number): void {
    if (t - this.rajadaEm < HORIZONTE.folgaRajada) return;
    this.rajadaEm = t;
    this.depois(HORIZONTE.atrasoRajada, () => Som.tocar('fx.f1.artilharia', { x }));
  }

  estouroFlak(x: number): void {
    this.depois(HORIZONTE.atrasoFlak, () => Som.tocar(this.flak(), { x }));
  }

  explodiu(x: number): void {
    this.depois(HORIZONTE.atrasoExplosao, () => Som.tocar(this.explosao(), { x }));
  }
}

/** The thunder of one lightning on the night menu. */
export function somDoRelampago(scene: Phaser.Scene, comRaio: boolean): void {
  for (const t of trovoes(comRaio, Math.random)) scene.time.delayedCall(t.atrasoMs, () => Som.tocar(t.nome));
}
