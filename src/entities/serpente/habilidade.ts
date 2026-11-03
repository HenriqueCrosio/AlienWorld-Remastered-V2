/**
 * WHAT A SKILL MAY ASK OF HER, and what she asks of a skill (spec §5.2). The skills are ported from the mock line by line;
 * the mock's globals (her mouths, the ship, the screen's kick, the player's shots) come through this facade, so a skill
 * can run in Node against a fake one (the oracles, `scripts/_serpente/_oraculo.mjs`). Every point is on SCREEN.
 */
import type Phaser from 'phaser';
import type { EnemySystem } from '../../systems/EnemySystem';
import type { ChaveConjunto } from './gestosHab';
import type { Tocador } from './tocador';
import type { Cor, FormaHab, NomeHab, Ponto, Put } from './tipos';

export interface CorpoSerpente {
  readonly scene: Phaser.Scene;
  readonly enemies: EnemySystem;
  readonly forma: FormaHab;
  /** the living heads */
  readonly cores: readonly Cor[];
  readonly tocador: Tocador;
  /** a mouth now: of the set frame shown, of the erguer, or of the idle frame */
  boca(cor: Cor): Ponto;
  /** where the green's breath leaves: the front of her open jaws (the mock's `labios`) */
  labios(): Ponto;
  /** a point of a set's frame ('boca' of the vulnerable head, or 'olho'); null when that frame has none */
  ponto(chave: ChaveConjunto, i: number, tipo: 'boca' | 'olho'): Ponto | null;
  /** the ship's hitbox centre */
  nave(): Ponto;
  /** her left edge on a screen row */
  bordaEsq(y: number): number;
  /** the screen kick this frame (integer px) */
  treme(x: number, y: number): void;
  /** the player's active shots */
  balas(): readonly Phaser.Physics.Arcade.Sprite[];
  /** INCENDIÁRIO in hand */
  incendiario(): boolean;
  /** the gas counter's hit (`HAB.contra` of the form) */
  contra(): void;
  /** the erguer gesture (the B and the C): the action when the jaws open, 0.25 s in (today's `comGesto`) */
  gesto(acao: () => void): void;
  /** her lights and the hot flash, this frame */
  luz(niveis: Partial<Record<Cor, number>>, tinta?: number): void;
}

export interface Habilidade {
  readonly nome: NomeHab;
  /** running (the cycle waits for it; no common shots meanwhile) */
  readonly viva: boolean;
  /** ended, but something of it is still on screen and fading (the beam's scorch cooling on the hull): the boss keeps
   * stepping and drawing it, without the cycle waiting */
  readonly restos?: boolean;
  comecar(): void;
  update(dt: number): void;
  desenhar(put: Put): void;
  /** what it hurts by measurement (the beam, the burning jelly) — the scene's `StageBoss.morde` */
  morde?(esq: number, dir: number, topo: number, base: number): boolean;
  /** her head died: it dissolves over `HAB.aborta` s and does not hurt meanwhile */
  abortar(): void;
}
