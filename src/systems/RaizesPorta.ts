import Phaser from 'phaser';
import { SCROLL_SPEED } from '../config';
import type { Moldura } from './Moldura';

/**
 * AS RAÍZES DAS PORTAS DO DUTO (17/10, item 2b do polimento, bloco C): o tecido do bicho crescido sobre a base e o topo
 * de cada porta, no chão e no teto.
 *
 * ⚠️ O PEDIDO É DELE, e veio de uma falta de acabamento que ele pegou: *"você colocou raízes nos tubos que entraram na
 * leva dos elites, enraizou o esfíncter final antes do chefão... mas as portas dos dutos ainda estão sem acabamento"*.
 * A porta nasce atrás da faixa e a linha onde ela some na parede era um corte seco. Ele escolheu a variante D da folha
 * (`docs/superpowers/folhas/2026-10-17/porta-raizes/`), a de veias acesas: *"ela preenche bem a base e a parte de cima
 * da porta, além de ficar interessante quando estoura"*.
 *
 * ⚠️ AS RAÍZES FICAM COM A LASCA. O `matarPorta` só troca a textura, e a lasca segue rolando no duto (a memória do que
 * o jogador abriu); os cotos dela continuam presos à parede, então as raízes também. Elas foram desenhadas para não
 * entrar na fresta de 38px (`_raizes-porta.mjs`).
 *
 * ⚠️ SÃO DA PORTA, MAS ELA NÃO AS CONHECE: a porta é um prop do `TerrainSystem` como qualquer outro, e enfiar decoração
 * na tabela de props seria mexer no grupo que a física e os três overlaps leem. Este sistema só OLHA o grupo, prende um
 * par em cada porta que aparece e relê as duas superfícies da borda no x dela a cada quadro (o `posicionarRaizes` do
 * esfíncter). Decoração pura: sem corpo, fora de todo grupo, nada sorteado.
 *
 * ⚠️ NO `POST_UPDATE`, DEPOIS DA FÍSICA, e não no `update` da cena. A porta anda por velocidade, e o Arcade só escreve o
 * x novo no sprite no fim do quadro: lido no `update`, ele é o do quadro anterior, e as raízes andariam 1,4px atrás da
 * porta, tremendo contra ela.
 *
 * Depth −0,52, o mesmo das raízes do esfíncter: à frente da borda (−0,6), que é onde o corpo da porta some, e atrás dos
 * props (−0,5).
 */
export class RaizesPorta {
  /**
   * A LINHA DA SUPERFÍCIE NA ARTE (`_raizes-porta.mjs`: SUP 10 na peça de chão, de 40px; a de teto é a mesma peça
   * virada, então lá é 40 − 1 − 10). A coluna 50 de 100 é o centro da porta.
   */
  static readonly SUP = 10;
  static readonly ALTURA = 40;
  static readonly LARGURA = 100;
  static readonly EIXO = 50;
  static readonly CHAVE_CHAO = 'f4PortaRaizChao';
  static readonly CHAVE_TETO = 'f4PortaRaizTeto';

  private readonly presas = new Map<Phaser.GameObjects.GameObject, Presa>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly moldura: Moldura,
    private readonly props: Phaser.Physics.Arcade.Group,
    desenha: boolean,
  ) {
    if (!desenha || !scene.textures.exists(RaizesPorta.CHAVE_CHAO) || !scene.textures.exists(RaizesPorta.CHAVE_TETO)) return;
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.atualiza, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.atualiza, this);
      this.presas.clear();
    });
  }

  private atualiza(_time: number, delta: number): void {
    for (const p of this.props.getChildren() as Phaser.GameObjects.Sprite[]) {
      if (!p.active || p.getData('kind') !== 'porta' || this.presas.has(p)) continue;
      this.presas.set(p, { chao: this.raiz(false), teto: this.raiz(true), x: p.x });
    }
    for (const [p, r] of this.presas) {
      // ⚠️ A PORTA SAI ANTES DAS RAÍZES. O `TerrainSystem` recolhe o prop em x < −40, com a peça de 64px já fora da
      // tela, mas a raiz tem 100: ela ainda mostraria 10px na borda esquerda e sumiria de estalo. Sem a porta, ela
      // segue rolando com o mundo até sair inteira.
      const sprite = p as Phaser.GameObjects.Sprite;
      r.x = sprite.active ? sprite.x : r.x - (SCROLL_SPEED * delta) / 1000;
      if (!sprite.active && r.x < -RaizesPorta.LARGURA) {
        r.chao.destroy();
        r.teto.destroy();
        this.presas.delete(p);
        continue;
      }
      const x = Math.round(r.x);
      r.chao.setPosition(x, Math.round(this.moldura.superficieChaoEm(x)));
      r.teto.setPosition(x, Math.round(this.moldura.superficieTetoEm(x)));
    }
  }

  private raiz(teto: boolean): Phaser.GameObjects.Image {
    const { SUP, ALTURA, LARGURA, EIXO } = RaizesPorta;
    return this.scene.add
      .image(-LARGURA, 0, teto ? RaizesPorta.CHAVE_TETO : RaizesPorta.CHAVE_CHAO)
      .setOrigin(EIXO / LARGURA, teto ? (ALTURA - 1 - SUP) / ALTURA : SUP / ALTURA)
      .setDepth(-0.52)
      .setName('f4PortaRaiz');
  }
}

interface Presa {
  chao: Phaser.GameObjects.Image;
  teto: Phaser.GameObjects.Image;
  /** O x da porta; depois que ela sai, o das raízes, rolando sozinhas. */
  x: number;
}
