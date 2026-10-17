import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { Moldura } from './Moldura';

/** Um plano de distância da deriva. */
interface Plano {
  /** O sufixo dos quadros do atlas que moram neste plano (`-meia`, `-terco`). */
  sufixo: string;
  /** Quantas vezes a velocidade do mundo. Mais lento = mais longe. */
  fator: number;
  depth: number;
  tint: number;
  /** O vão entre duas peças, em px do caminho DELA. */
  vao: [number, number];
}

interface Viva {
  img: Phaser.GameObjects.Image;
  plano: Plano;
  /** O x em ponto flutuante; o sprite recebe o arredondado (nada de meio pixel). */
  x: number;
  y: number;
  vy: number;
  giro: number;
}

/**
 * A DERIVA DA FASE 4: ossos e coágulos boiando nas camadas de TRÁS (17/10, item 8 do polimento).
 *
 * Saíram da mesma rodada do destroço da F4 (`docs/superpowers/folhas/2026-10-17/destroco-f4/`): o casco engolido virou
 * o obstáculo, e os outros dois conceitos ficaram para o fundo, pedido dele: *"os ossos e coágulos ficaram muito bons
 * também, podem ser usados mais sombreados para flutuar nos layers de trás"*.
 *
 * ⚠️ CENÁRIO, NÃO JOGO, E TEM DE LER ASSIM. É a mesma arte do conceito de obstáculo, então o que a separa do destroço
 * jogável é o que a perspectiva aérea faz com as costelas desta fase (ver o `Parallax`): MENOR, ESCURA, LENTA e ATRÁS
 * DA BORDA. Sem corpo, sem colisão, fora de todo grupo. E nada aqui sorteia do fluxo do jogo (`Math.random`, não
 * `Phaser.Math`) — a lei do `PrimeiroPlanoF4`.
 *
 * ⚠️ O TAMANHO DIZ A DISTÂNCIA, regra dele (17/10): *"para aumentar a percepção de profundidade, os assets que vão
 * para os layers de trás precisam diminuir de tamanho, para parecerem distantes"*. Por isso NENHUMA peça inteira entra
 * aqui (as inteiras têm o tamanho do destroço jogável): só as reduzidas por 2 e por 3, assadas em pixel
 * (`_instalar-frente-f4.mjs`). E são DOIS planos que contam a mesma distância com as três pistas juntas: a de 1/3 é
 * menor, mais lenta, mais escura e mais funda que a de 1/2. Os dois ficam entre as costelas distante (0,4, −85) e
 * próxima (0,9, −74).
 *
 * ⚠️ A LEI DE 12/09 (`Parallax`, o órgão): *"peça pequena SOLTA no meio da tela lê como asset jogado na cena"*. Esta
 * camada flutua por pedido dele, então ela se defende do jeito que a costela distante se defende: escura e lenta, e
 * girando devagar — à deriva num líquido, não colada na tela. Se o GIF mostrar o contrário, é aqui que se mexe.
 *
 * A arena do chefão é só pintura e borda: no `soFundo` ela para de nascer e apaga (`limpa`).
 */
export class DerivaF4 {
  static readonly TEXTURA = 'f4Deriva';
  static readonly PLANOS: readonly Plano[] = [
    { sufixo: '-meia', fator: 0.55, depth: -80, tint: 0x9a8494, vao: [160, 320] },
    { sufixo: '-terco', fator: 0.42, depth: -84, tint: 0x6e5c6a, vao: [110, 230] },
  ];
  /**
   * ⚠️ O CENTRO NASCE DENTRO DO CORREDOR, a esta folga das duas superfícies da borda. Na 1ª versão ele nascia em
   * qualquer altura da tela e caía quase sempre atrás das mesas e da faixa, que estão à frente dela: a camada existia e
   * não aparecia. As pontas ainda podem passar atrás da borda, que as esconde.
   */
  static readonly FOLGA = 8;
  /** Deriva vertical (px/s) e giro (graus/s), no máximo. */
  static readonly DERIVA = 3;
  static readonly GIRO = 6;

  /** Os quadros de cada plano, na ordem de `PLANOS`. */
  private readonly frames: string[][] = DerivaF4.PLANOS.map(() => []);
  private readonly vivas: Viva[] = [];
  /** Por plano: quantos px de vão a próxima peça ainda espera. */
  private readonly vao = DerivaF4.PLANOS.map(() => 0);
  private ativo: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly moldura: Moldura,
    desenha: boolean,
  ) {
    this.ativo = desenha && scene.textures.exists(DerivaF4.TEXTURA);
    if (!this.ativo) return;
    for (const frame of scene.textures.get(DerivaF4.TEXTURA).getFrameNames()) {
      const i = DerivaF4.PLANOS.findIndex((p) => frame.endsWith(p.sufixo));
      if (i >= 0) this.frames[i].push(frame);
    }
  }

  atualiza(dt: number, speed: number): void {
    if (!this.ativo && this.vivas.length === 0) return;
    for (let i = this.vivas.length - 1; i >= 0; i--) {
      const v = this.vivas[i];
      v.x -= speed * v.plano.fator * dt;
      v.y += v.vy * dt;
      v.img.setPosition(Math.round(v.x), Math.round(v.y));
      v.img.angle += v.giro * dt;
      if (v.x + v.img.width < 0) {
        v.img.destroy();
        this.vivas.splice(i, 1);
      }
    }
    if (!this.ativo) return;
    DerivaF4.PLANOS.forEach((plano, i) => {
      this.vao[i] -= speed * plano.fator * dt;
      if (this.vao[i] > 0 || !this.frames[i].length) return;
      this.vao[i] = Phaser.Math.Linear(plano.vao[0], plano.vao[1], Math.random());
      this.nasce(plano, this.frames[i]);
    });
  }

  /** A ARENA DO CHEFÃO é só pintura e borda: para de nascer e o que está na tela apaga (`Parallax.limpaCenario`). */
  limpa(durationMs: number): void {
    this.ativo = false;
    const alvo = this.vivas.map((v) => v.img);
    if (!alvo.length) return;
    if (durationMs <= 0) alvo.forEach((o) => o.setAlpha(0));
    else this.scene.tweens.add({ targets: alvo, alpha: 0, duration: durationMs, ease: 'Quad.easeOut' });
  }

  private nasce(plano: Plano, frames: string[]): void {
    const frame = frames[Math.floor(Math.random() * frames.length)];
    const img = this.scene.add.image(0, 0, DerivaF4.TEXTURA, frame).setDepth(plano.depth).setTint(plano.tint);
    const x = GAME_WIDTH + img.width / 2 + 4;
    const teto = this.moldura.superficieTetoEm(GAME_WIDTH - 1) + DerivaF4.FOLGA;
    const chao = this.moldura.superficieChaoEm(GAME_WIDTH - 1) - DerivaF4.FOLGA;
    const y = Phaser.Math.Linear(teto, Math.max(teto, chao), Math.random());
    img
      .setPosition(Math.round(x), Math.round(y))
      .setAngle(Math.random() * 360)
      .setFlipX(Math.random() < 0.5);
    this.vivas.push({
      img,
      plano,
      x,
      y,
      vy: (Math.random() * 2 - 1) * DerivaF4.DERIVA,
      giro: (Math.random() * 2 - 1) * DerivaF4.GIRO,
    });
  }
}
