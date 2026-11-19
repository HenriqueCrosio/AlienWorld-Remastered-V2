import { travessia } from './ritmos';
import type { ContextoCenario, Peca } from './cenario';

/** §3.1 O Leviatã ao longe: nada pela janela de céu, atrás da cidade e na frente do planeta — uma travessia só. */
export function montarLeviata(ctx: ContextoCenario): Peca {
  const { k } = ctx;
  const o = ctx.scene.add.sprite(0, 0, ctx.chave('leviata'), 0).setScale(1 / k).setDepth(1);
  // 22/10 e 19/11, ele: "cai pequenos degraus na sua trajetória". Com `roundPixels`, o Phaser 3.90 arredonda a
  // posição (floor, em px de jogo) E o canto do quadro final (em px de TELA): numa diagonal de 12 px em minutos, ele
  // andava reto e descia 1 px de tela de vez em quando — a escada. A origem fracionária de 22/10 tirou o primeiro
  // degrau, não o segundo. Ele é o único que anda tão devagar e em textura LINEAR (a pintura da camada HD): só ele
  // desenha SEM o arredondamento da câmera, e o filtro linear o leva entre os pixels, contínuo.
  type Camara = { roundPixels: boolean; renderRoundPixels: boolean };
  type Desenho = (r: unknown, s: unknown, camera: Camara, pai: unknown) => void;
  const alvo = o as unknown as { renderWebGL: Desenho };
  const desenhar = alvo.renderWebGL.bind(o);
  alvo.renderWebGL = (r, s, camera, pai) => {
    // (as duas: `roundPixels` arredonda a posição; `renderRoundPixels`, que a câmera tira dele a cada quadro, o canto)
    const { roundPixels, renderRoundPixels } = camera;
    camera.roundPixels = camera.renderRoundPixels = false;
    try {
      desenhar(r, s, camera, pai);
    } finally {
      camera.roundPixels = roundPixels;
      camera.renderRoundPixels = renderRoundPixels;
    }
  };
  return {
    atualizar(t: number): void {
      const p = travessia(t);
      o.setVisible(p.visivel);
      if (!p.visivel) return;
      o.setFrame(p.quadro);
      o.setPosition(p.x, p.y);
    },
  };
}
