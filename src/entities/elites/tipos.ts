import type Phaser from 'phaser';
import type { PadroesDeTiro } from '../../systems/PadroesDeTiro';

export type Sprite = Phaser.Physics.Arcade.Sprite;

/** O que a cena entrega aos elites — as únicas portas para fora do `EnemySystem`. */
export interface GanchosElite {
  /** Cria o asteroide minerável em (x, y) (`DebrisSystem.spawnEm('mineravel', …)`). */
  criarRocha: (x: number, y: number) => Sprite | null;
  /** A explosão INIMIGA em raio: o estouro e, se a nave estiver a `raio` px, o dano nela. */
  explodir: (x: number, y: number, raio: number) => void;
}

export interface CtxElite {
  scene: Phaser.Scene;
  /** A nave. */
  alvo: Sprite;
  tiros: PadroesDeTiro;
  ganchos: GanchosElite;
}

/**
 * UM ELITE (spec frente B §2.1): a máquina de estados de um inimigo do `EnemySystem`. O estado mora no próprio
 * sprite (`setData('elite', …)`). O `atualizar` NÃO é chamado com o inimigo travado (o elétrico), e o tranco já foi
 * aplicado antes dele.
 */
export interface ComportamentoElite {
  iniciar(e: Sprite, ctx: CtxElite): void;
  atualizar(e: Sprite, dt: number, ctx: CtxElite): void;
  /** O golpe de `dano` que veio de (deX, deY) é bloqueado? (Um escudo com vida o absorve aqui.) */
  bloqueia?(e: Sprite, deX: number, deY: number, dano: number): boolean;
}

/**
 * Troca a textura E refaz a hitbox (o corpo do Arcade não acompanha a troca sozinho). `corpo` = um tamanho FIXO, para
 * arte cujo quadro inclui chama ou clarão (a hitbox não cresce com eles).
 */
export function vestir(e: Sprite, chave: string, corpo?: { w: number; h: number }): void {
  if (e.texture.key !== chave) e.setTexture(chave);
  const b = e.body as Phaser.Physics.Arcade.Body;
  if (corpo) b.setSize(corpo.w, corpo.h);
  else b.setSize(e.width * 0.6, e.height * 0.55);
}
