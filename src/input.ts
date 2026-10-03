import Phaser from 'phaser';
import type { InputState } from './flight/FlightController';
import { ACOES, mapaAtivo, type Acao, type Mapa } from './controles';

/**
 * Lê o teclado PELO MAPA DE TECLAS (`src/controles.ts`) e devolve um InputState neutro.
 * As conduções e as cartas recebem intenção ("subir", "dash"), nunca teclas — é o que permite plugar o gamepad
 * (etapa 1.6) somando no MESMO estado, sem tocar em quem consome.
 *
 * ⚠️ UM LEITOR SÓ, UMA LEITURA POR QUADRO: o `JustDown` do Phaser é CONSUMIDO por quem lê primeiro. Até 02/10 o Dash
 * escutava o evento por fora porque o flap já gastava o `JustDown` da tecla de cima. Aqui cada tecla é lida uma vez e
 * as bordas das ações saem dessa leitura — um toque que desce e sobe dentro do mesmo quadro continua contando (o
 * `_justDown` nasce no evento, não no `isDown`).
 *
 * O mouse não entra mais no jogo (03/10): ele atirava e fazia flap — entrada duplicada.
 */
export class InputReader {
  private readonly mapa: Mapa;
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.mapa = mapaAtivo();
    for (const a of ACOES) {
      for (const nome of this.mapa[a]) if (!this.keys.has(nome)) this.keys.set(nome, kb.addKey(nome));
    }
  }

  read(): InputState {
    const desceu = new Set<string>();
    for (const [nome, k] of this.keys) if (Phaser.Input.Keyboard.JustDown(k)) desceu.add(nome);
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
    };
  }
}
