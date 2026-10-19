import { travessia } from './ritmos';
import type { ContextoCenario, Peca } from './cenario';

/** §3.1 O Leviatã ao longe: nada pela janela de céu, atrás da cidade e na frente do planeta, em loop. */
export function montarLeviata(ctx: ContextoCenario): Peca {
  const o = ctx.scene.add.sprite(0, 0, ctx.chave('leviata'), 0).setScale(1 / ctx.k).setDepth(1);
  return {
    atualizar(t: number): void {
      const p = travessia(t);
      o.setPosition(p.x, p.y).setFrame(p.quadro);
    },
  };
}
