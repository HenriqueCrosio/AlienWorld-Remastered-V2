import { ESPACO, LARGURA } from './numerosMenu';
import type { ContextoCenario, Peca } from './cenario';

/**
 * §3.5b O ESPAÇO na janela (22/10): um véu frio de bruma entre o Leviatã com o planeta (atrás) e a cidade (na frente)
 * — só aparece onde a colônia é transparente, e diz que ele nada no espaço, longe. A textura é a bruma das fases
 * (`menu-fog`, na densidade `k`); a diferença de velocidade das duas faixas vende o volume.
 */
export function montarEspaco(ctx: ContextoCenario): Peca {
  const { scene, k } = ctx;
  const faixas = ESPACO.map((b) => {
    const ts = scene.add.tileSprite(0, b.y, LARGURA, b.h, `menu-fog-${k}`).setOrigin(0).setDepth(b.depth).setTint(b.tint).setAlpha(b.pico);
    ts.setTileScale(1 / k, b.h / 64 / k);
    return { ts, vel: b.vel };
  });
  return {
    atualizar(t: number): void {
      for (const f of faixas) f.ts.tilePositionX = t * f.vel * k;
    },
  };
}
