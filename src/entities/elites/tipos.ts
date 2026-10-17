import type Phaser from 'phaser';
import type { LugarDeBuraco, PlantioMesas, SoltaEsporo, Vao } from '../../elitesRegras';
import type { EnemyKind } from '../../systems/EnemySystem';
import type { PadroesDeTiro } from '../../systems/PadroesDeTiro';

export type Sprite = Phaser.Physics.Arcade.Sprite;

/** A PAREDE da F4 (a `Moldura`), para o que vive preso a ela — o Tubo (spec F4 §3). */
export interface ParedeElite {
  /** A coordenada de MUNDO da coluna `xTela` (o mundo rola para a esquerda)… */
  mundoDe: (xTela: number) => number;
  /** …e a volta: onde a coordenada de mundo está na tela, na MESMA grade de pixel das placas da borda. */
  telaDe: (xMundo: number) => number;
  /** A linha da superfície na coluna `xTela`: a de cima do chão, ou a de baixo do teto. ⚠️ Só para `xTela >= -128`. */
  superficie: (xTela: number, teto: boolean) => number;
  /** A chave da borda da placa em `xTela` (`f4FaixaA`, `f4FaixaB`…): o pé do Tubo veste a cor dela (spec F4 §9.4). */
  faixa: (xTela: number, teto: boolean) => string;
  /** O plantio das mesas do corredor agora (`tuboCabe`). */
  mesas: () => PlantioMesas;
}

/** Onde algo preso a uma superfície está AGORA (y de tela); `null` = a superfície sumiu (a mesa saiu da tela). */
export type Ancora = () => { x: number; y: number } | null;

/** Um lugar de buraco da Larva (spec F4 §9.5) com a superfície dele: a borda ou uma mesa, que rolam com o mundo. */
export interface LugarElite extends LugarDeBuraco {
  ancora: Ancora;
}

/** O que a cena entrega aos elites — as únicas portas para fora do `EnemySystem`. */
export interface GanchosElite {
  /** Cria o asteroide minerável em (x, y) (`DebrisSystem.spawnEm('mineravel', …)`). */
  criarRocha: (x: number, y: number) => Sprite | null;
  /** A explosão INIMIGA em raio: o estouro e, se a nave estiver a `raio` px, o dano nela. */
  explodir: (x: number, y: number, raio: number) => void;
  /** As bordas do VÃO na coluna x: o corredor da F4 (entre as mesas); sem corredor, as superfícies da borda. */
  vao: (x: number) => Vao;
  parede: ParedeElite;
  /**
   * Onde o buraco da Larva pode abrir AGORA (spec F4 §9.5): a face da borda (chão e teto) e a de cada mesa, na metade
   * direita. Nunca a pintura do fundo. Vazio fora da F4.
   */
  lugaresDeBuraco: () => LugarElite[];
  /** Solta um ESPORO em (x, y) (o Tubo, spec F4 §9.3; `esporosDoPulso`). Ele não é tiro nem inimigo: vive nos `Esporos`. */
  soltarEsporo: (x: number, y: number, solta: SoltaEsporo) => void;
}

export interface CtxElite {
  scene: Phaser.Scene;
  /** A nave. */
  alvo: Sprite;
  tiros: PadroesDeTiro;
  ganchos: GanchosElite;
  /** Faz NASCER outro inimigo em (x, y) — a pupa da Larva, a mosca da pupa. Ele entra no grupo dos inimigos. */
  nascer: (kind: EnemyKind, x: number, y: number) => Sprite;
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
  /**
   * INTOCÁVEL agora? (a lula escondida): nada a fere — nem a bomba, nem a queima.
   * O tiro já atravessa porque o corpo do Arcade está desligado; isto cobre quem fere sem colisão.
   */
  intocavel?(e: Sprite): boolean;
  /** O RABO do Leviatã chegou (F3, t=45 desde 17/10; era 38): o ato 1 exige o quadro vazio (spec F3 §2.2). */
  aoRabo?(e: Sprite, ctx: CtxElite): void;
  /**
   * O que ANDA COM A PAREDE (o Tubo da F4), chamado SEMPRE — inclusive com o elite travado pelo elétrico: a parede não
   * para, e um Tubo parado sobre uma parede correndo descola dela.
   */
  noChao?(e: Sprite, dt: number, ctx: CtxElite): void;
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
