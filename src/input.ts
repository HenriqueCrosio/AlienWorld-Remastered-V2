import Phaser from 'phaser';
import type { InputState } from './flight/FlightController';
import { mapaDoControle } from './aplicarPreferencias';
import { ACOES, EVENTO_TECLAS, mapaAtivo, type Acao, type Mapa } from './controles';
import { aoQuadro, botoesQueDesceram, direcao, seguraBotao } from './entrada/controle';
import type { AcaoRemap } from './entrada/mapas';

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
  private mapa: Mapa;
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();
  /** As teclas que DESCERAM desde o último `read`. */
  private readonly desceram = new Set<string>();
  /**
   * THE CONTROLLER (14/11, block M2): the buttons that went down since the last `read`, and whether the direction
   * went UP (the flap of stage 1). Accumulated frame by frame for the same reason as the keys: the scene does not read
   * in every frame (a hitstop returns early), and a press must not be lost.
   */
  private readonly botoesDesceram = new Set<number>();
  private subiu = false;
  private cimaAntes = false;

  constructor(scene: Phaser.Scene) {
    this.mapa = mapaAtivo();
    this.ligar(scene);
    // The SETTINGS changed the key profile (14/11, M1): this reader re-reads the map without the scene restarting.
    const reler = (): void => {
      const kb = scene.input.keyboard!;
      for (const nome of this.keys.keys()) kb.removeKey(nome, true);
      this.keys.clear();
      this.desceram.clear();
      this.mapa = mapaAtivo();
      this.ligar(scene);
    };
    scene.game.events.on(EVENTO_TECLAS, reler);
    const soltar = aoQuadro(() => {
      for (const b of botoesQueDesceram()) this.botoesDesceram.add(b);
      const cima = direcao().cima;
      if (cima && !this.cimaAntes) this.subiu = true;
      this.cimaAntes = cima;
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.events.off(EVENTO_TECLAS, reler);
      soltar();
    });
  }

  private ligar(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
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

    // The controller adds to the SAME state (keyboard and controller are both live, always).
    const botoes = new Set(this.botoesDesceram);
    this.botoesDesceram.clear();
    const subiu = this.subiu;
    this.subiu = false;
    const d = direcao();
    const mc = mapaDoControle();
    const seguraC = (a: AcaoRemap): boolean => seguraBotao(mc[a]);
    const apertouC = (a: AcaoRemap): boolean => botoes.has(mc[a]);

    return {
      up: segura('cima') || d.cima,
      down: segura('baixo') || d.baixo,
      left: segura('esquerda') || d.esquerda,
      right: segura('direita') || d.direita,
      // O flap dispara na BORDA da tecla, não enquanto segurada — senão vira voo contínuo.
      // ON THE CONTROLLER THE FLAP IS THE DASH BUTTON (14/11, his feedback: with fire on the same button the ship
      // *"atira e pula"*). Flicking the stick up for every impulse tires, so the flap needs a button — and the dash is
      // the one action that can share it: the flap only exists in the flap flight of stage 1, the dash only in free
      // flight (`Dash.tick` asks for `livre`). No button ever does two things at once.
      flapPressed: apertou('flap') || subiu || apertouC('dash'),
      firing: segura('tiro') || seguraC('tiro'),
      // A bomba é BORDA: segurar não pode gastar o estoque inteiro.
      bombPressed: apertou('bomba') || apertouC('bomba'),
      dashPressed: apertou('dash') || apertouC('dash'),
      flarePressed: apertou('flare') || apertouC('flare'),
      missilPressed: apertou('missil') || apertouC('missil'),
    };
  }
}
