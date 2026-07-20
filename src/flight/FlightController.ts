import type Phaser from 'phaser';

export type ConduçãoId = 'flap' | 'free';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** true apenas no frame em que a tecla desceu — o flap depende disso. */
  flapPressed: boolean;
  /** Gatilho segurado. Ignorado por conduções com autoFire. */
  firing: boolean;
  /** BOMBA (K): true apenas no frame em que a tecla desceu. A cena decide se gasta. */
  bombPressed: boolean;
}

/**
 * A abstração central do jogo (ver docs/TECH.md).
 *
 * Inimigos, armas e waves NÃO sabem qual condução está ativa. Só o balanceamento
 * consulta `id`. Trocar de condução não pode exigir mudar mais nada.
 */
export interface FlightController {
  readonly id: ConduçãoId;
  readonly label: string;

  /**
   * Configura o corpo físico (gravidade, drag, limites).
   *
   * CONTRATO: recebe sempre um corpo NEUTRO (ver `resetBody`). Não presuma nada sobre o
   * estado anterior, e configure tudo o que importa — inclusive o que você quer em zero.
   * Foi confiar no estado herdado que quebrou a volta Livre → Flap: o dragY de 1200 do
   * Livre sobrevivia e engolia o impulso do flap.
   */
  setup(body: Phaser.Physics.Arcade.Body): void;

  /** Chamado todo frame. Só escreve em `body` — nunca na posição direta do sprite. */
  update(body: Phaser.Physics.Arcade.Body, input: InputState): void;

  /** Multiplicador de score (o flap é mais difícil, logo paga mais). */
  readonly scoreMultiplier: number;

  /**
   * A nave atira sozinha nesta condução?
   *
   * No Flap a mão está 100% ocupada com a altitude — exigir o gatilho ali torna o
   * run'n'gun impraticável (constatado no playtest do M1). O tiro automático devolve
   * o gênero: o sabor Metal Slug vem da variedade de armas e do volume de inimigos,
   * não de segurar o botão.
   */
  readonly autoFire: boolean;
}

/**
 * Devolve o corpo a um estado neutro. Chamar SEMPRE antes de `setup()`.
 *
 * Sem isto, trocar de condução herda drag/gravidade/limites da anterior, e a nave
 * fica num estado que nenhuma das duas conduções descreve.
 *
 * `keepVelocity`: nas transições EM JOGO (romper a atmosfera, entrar na gravidade
 * artificial do Leviatã) a nave não pode parar no ar — a física muda, o momento não.
 * Zerar a velocidade ali daria um solavanco que denuncia a troca de controller.
 */
export function resetBody(body: Phaser.Physics.Arcade.Body, keepVelocity = false): void {
  if (!keepVelocity) body.setVelocity(0, 0);
  body.setAcceleration(0, 0);
  body.setDrag(0, 0);
  body.setGravity(0, 0);
  body.setAllowGravity(false);
  body.setMaxVelocity(10_000, 10_000);
  body.setAngularVelocity(0);
}
