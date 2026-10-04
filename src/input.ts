import Phaser from 'phaser';
import type { InputState } from './flight/FlightController';
import { ACOES, mapaAtivo, type Acao, type Mapa } from './controles';

/**
 * Lê o teclado PELO MAPA DE TECLAS (`src/controles.ts`) e devolve um InputState neutro.
 * As conduções e as cartas recebem intenção ("subir", "dash"), nunca teclas — é o que permite plugar o gamepad
 * (etapa 1.6) somando no MESMO estado, sem tocar em quem consome.
 *
 * ⚠️ AS BORDAS VÊM DO EVENTO, NÃO DO `JustDown`. O `JustDown` do Phaser é CONSUMIDO por quem lê primeiro (o flap
 * gastava o da tecla de cima — por isso o Dash escutava o evento por fora até 02/10) e é APAGADO quando a tecla sobe:
 * um toque que desce e sobe dentro do mesmo quadro sumia (a `probe-teclas` provou, 03/10). Aqui cada tecla avisa
 * quando DESCE (o evento `down` do Phaser, que ignora a repetição do sistema) e a borda espera o próximo `read`.
 *
 * O mouse não entra mais no jogo (03/10): ele atirava e fazia flap — entrada duplicada.
 */
export class InputReader {
  private readonly mapa: Mapa;
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();
  /** As teclas que DESCERAM desde o último `read`. */
  private readonly desceram = new Set<string>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.mapa = mapaAtivo();
    for (const a of ACOES) {
      for (const nome of this.mapa[a]) {
        if (this.keys.has(nome)) continue;
        const k = kb.addKey(nome);
        k.on(Phaser.Input.Keyboard.Events.DOWN, () => this.desceram.add(nome));
        this.keys.set(nome, k);
      }
    }
  }

  read(): InputState {
    const desceu = new Set(this.desceram);
    this.desceram.clear();
    const segura = (a: Acao): boolean => this.mapa[a].some((n) => this.keys.get(n)!.isDown);
    const apertou = (a: Acao): boolean => this.mapa[a].some((n) => desceu.has(n));

    return {
      up: segura('cima'),
      down: segura('baixo'),
      left: segura('esquerda'),
      right: segura('direita'),
      // O flap dispara na BORDA da tecla, não enquanto segurada — senão vira voo contínuo.
      flapPressed: apertou('flap'),
      firing: segura('tiro'),
      // A bomba é BORDA: segurar não pode gastar o estoque inteiro.
      bombPressed: apertou('bomba'),
      dashPressed: apertou('dash'),
      flarePressed: apertou('flare'),
      missilPressed: apertou('missil'),
    };
  }
}
