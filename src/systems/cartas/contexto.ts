import type Phaser from 'phaser';
import type { Fx } from '../Fx';
import type { WeaponSystem } from '../WeaponSystem';

export type Inimigo = Phaser.Physics.Arcade.Sprite;
/** A linhagem da nave: o tiro do drone (e, depois, a arte das peças) segue ela (spec §4.3). */
export type Linhagem = 'humana' | 'alien';

/** O que a `GameScene` entrega às cartas. As cartas nunca tocam a cena por outro caminho. */
export interface HostCartas {
  scene: Phaser.Scene;
  fx: Fx;
  weapons: WeaponSystem;
  inimigos: () => Inimigo[];
  /** Os tiros inimigos em voo — o drone desvia deles. */
  tirosInimigos: () => Phaser.Physics.Arcade.Sprite[];
  /** Os alvos que um míssil pode perseguir: inimigos vivos, o chefão (as cabeças, na serpente) e o golfinho. */
  alvos: () => Phaser.Physics.Arcade.Sprite[];
  nave: () => Phaser.Physics.Arcade.Sprite;
  matar: (e: Inimigo) => void;
  /** Congela o inimigo por `ms` (`EnemySystem.travar`). */
  travar: (e: Inimigo, ms: number) => void;
  baseDaNave: string;
  fase: number;
  linhagem: Linhagem;
  ganharVida: () => void;
  ganharBomba: () => void;
}

/** O que cada subsistema de `systems/cartas/` recebe de `CartasEmJogo`. */
export interface Contexto {
  h: HostCartas;
  tem: (id: string) => boolean;
  quantas: (id: string) => number;
  /** Tira vida; zerou, mata pelo caminho único da cena (`matarInimigo`). */
  ferir: (e: Inimigo, dano: number) => void;
  incendiar: (e: Inimigo) => void;
  /** Os inimigos VIVOS a até `raio` px de (x, y) — uma cópia, pode matar no meio do laço. */
  noRaio: (x: number, y: number, raio: number) => Inimigo[];
  /**
   * Adia para o próximo quadro. ⚠️ Morte acontece DENTRO do laço de colisão, e matar vizinhos ali mexe no grupo que o
   * Arcade ainda está percorrendo — todo dano em área passa por aqui.
   */
  depois: (fn: () => void) => void;
}
