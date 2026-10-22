import { travessia } from './ritmos';
import type { ContextoCenario, Peca } from './cenario';

/** §3.1 O Leviatã ao longe: nada pela janela de céu, atrás da cidade e na frente do planeta, em loop. */
export function montarLeviata(ctx: ContextoCenario): Peca {
  const { k } = ctx;
  const o = ctx.scene.add.sprite(0, 0, ctx.chave('leviata'), 0).setScale(1 / k).setDepth(1);
  const meioX = o.frame.realWidth / 2;
  const meioY = o.frame.realHeight / 2;
  return {
    atualizar(t: number): void {
      const p = travessia(t);
      // 22/10, ele: "vai caindo degraus". Com `roundPixels`, o Phaser 3.90 arredonda (floor) a POSIÇÃO de um sprite em
      // unidades do mundo — px de jogo, que na camada HD são `s` px de tela (5 em 1920): ele andava aos saltos de 5 px
      // e descia um degrau a cada ~4 s. A posição fica inteira e a fração vai pela origem de desenho (que não é
      // arredondada); o quadro final se arredonda por px de TELA. Medido: o maior salto caiu de 5 px para 1 px.
      const gx = Math.floor(p.x);
      const gy = Math.floor(p.y);
      o.setFrame(p.quadro);
      o.setPosition(gx, gy).setDisplayOrigin(meioX - (p.x - gx) * k, meioY - (p.y - gy) * k);
    },
  };
}
