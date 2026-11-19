import Phaser from 'phaser';
import { ALTURA, CHUVA, LARGURA } from './numerosMenu';
import { lcg } from './acaso';
import { arcoDaTempestade } from './tempoDaTempestade';
import { lerPixels } from './texturas';
import type { ContextoCenario, EstadoMenu, Peca } from './cenario';

/**
 * A CHUVA FINA DO MENU DA NOITE (spec `2026-11-19-menu-neblina-chuva-design.md` §4): traços de um pixel da camada, em
 * dois planos, que só aparecem quando a chuva da faixa chega (`CHUVA.arco`). Cada pingo é função do relógio (um sorteio
 * fixo: coluna, velocidade, fase), inclinado no vento da neblina. À noite a chuva só se vê onde há luz: o brilho de cada
 * pingo lê o mapa de luz da neblina (perto de uma janela ele pega o âmbar) e o clarão dos relâmpagos.
 */

interface Pingo {
  img: Phaser.GameObjects.Image;
  x0: number;
  vel: number;
  fase: number;
  /** O limiar do arco a partir do qual este pingo cai (a quantidade cresce com a chuva). */
  limiar: number;
}

export function montarChuva(ctx: ContextoCenario, estado: EstadoMenu, clarao: () => number): Peca | null {
  if (new URLSearchParams(location.search).get('chuva') === 'nenhuma') return null;
  const { scene, k } = ctx;
  const C = CHUVA;
  if (!scene.textures.exists('menu-pingo')) {
    const tx = scene.textures.createCanvas('menu-pingo', 1, 16)!;
    const c = tx.getContext();
    for (let y = 0; y < 16; y++) {
      c.fillStyle = `rgba(255,255,255,${((y + 1) / 16) ** 1.6})`;
      c.fillRect(0, y, 1, 1);
    }
    tx.refresh();
  }
  const luz = scene.textures.exists('menu-neblina-luz') ? lerPixels(scene, 'menu-neblina-luz') : null;
  const luzW = luz ? scene.textures.get('menu-neblina-luz').getSourceImage().width : 0;
  const luzK = luzW / LARGURA;
  const luzEm = (x: number, y: number): number => {
    if (!luz) return 0;
    const X = Math.max(0, Math.min(luzW - 1, Math.round(x * luzK)));
    const Y = Math.max(0, Math.min(ALTURA * luzK - 1, Math.round(y * luzK)));
    return luz[(Y * luzW + X) * 4] / 255;
  };

  const planos = C.planos.map((p) => {
    const r = lcg(p.semente);
    const pingos: Pingo[] = [];
    for (let i = 0; i < p.quantidade; i++) {
      const img = scene.add
        .image(0, 0, 'menu-pingo')
        .setOrigin(0.5, 1)
        .setDepth(p.profundidade)
        .setScale(Math.max(1, k * p.largura) / k, p.comprimento / 16)
        .setRotation(-Math.atan(C.vento))
        .setAlpha(0);
      pingos.push({ img, x0: r() * (LARGURA + ALTURA * C.vento) - ALTURA * C.vento, vel: p.vel * (0.85 + 0.3 * r()), fase: r(), limiar: r() });
    }
    return { p, pingos };
  });
  const cFria = Phaser.Display.Color.IntegerToColor(C.corFria);
  const cLuz = Phaser.Display.Color.IntegerToColor(C.corLuz);
  const tint = (l: number): number =>
    Phaser.Display.Color.GetColor(
      Math.round(cFria.red + (cLuz.red - cFria.red) * l),
      Math.round(cFria.green + (cLuz.green - cFria.green) * l),
      Math.round(cFria.blue + (cLuz.blue - cFria.blue) * l),
    );

  return {
    atualizar(t: number): void {
      const arco = estado.reduzido ? 0 : arcoDaTempestade(C.arco, t);
      const fl = clarao();
      for (const { p, pingos } of planos) {
        const vao = ALTURA + p.comprimento + 4;
        for (const g of pingos) {
          // Fades in around its own threshold: the drops come in one by one, never all at once.
          const vis = Math.min(1, Math.max(0, (arco - g.limiar * 0.98) / 0.04));
          if (vis <= 0) {
            if (g.img.alpha !== 0) g.img.setAlpha(0);
            continue;
          }
          const y = ((t * g.vel + g.fase * vao) % vao) - 2;
          const x = g.x0 + y * C.vento;
          const l = luzEm(x, y);
          g.img.setPosition(x, y);
          g.img.setTint(tint(Math.min(1, l * 1.3)));
          g.img.setAlpha(vis * Math.min(1, p.alfa + p.alfaLuz * l + p.alfaClarao * fl));
        }
      }
    },
  };
}
