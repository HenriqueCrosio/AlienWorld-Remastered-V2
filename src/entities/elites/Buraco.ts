import type Phaser from 'phaser';
import { buracoQuadro } from '../../elitesRegras';
import type { Ancora } from './tipos';

export interface Buraco {
  /** Fecha (uma vez só): a boca volta, fica a cicatriz, e ela some sozinha. */
  fechar(): void;
}

const PREFIXO = 'eliteBuracoAnim';
/**
 * NA FRENTE DA SUPERFÍCIE onde ele abre — a borda (−0,6) ou a mesa (−0,5) —, atrás dos inimigos (spec F4 §9.5).
 * ⚠️ Até 13/10 ele abria na PINTURA do fundo e andava com ela; ele cortou (14/10): *"deixar que ele saia na imagem de
 * fundo é fazer a animação no layer do jogador, mas tendo como base o fundo que é o último layer"*.
 */
const DEPTH = -0.45;

/**
 * O BURACO da Larva (spec F4 §2.1 e §9.5): quadros assados em pixel (`scripts/_elites/_mao-f4.mjs`), o quadro saindo
 * do relógio dele (`buracoQuadro`). Abre numa SUPERFÍCIE (a borda ou uma mesa) e a segue pela `ancora` enquanto
 * existe; sumiu a superfície (a mesa saiu da tela), ele fica onde estava. Tem VIDA PRÓPRIA — a cicatriz some ~1s
 * depois de ela mergulhar, ou morrer. Não fere, não bloqueia.
 */
export function abrirBuraco(cena: Phaser.Scene, ancora: Ancora): Buraco {
  const p0 = ancora() ?? { x: -999, y: -999 };
  const img = cena.add.image(Math.round(p0.x), Math.round(p0.y), `${PREFIXO}0`).setDepth(DEPTH);
  img.setData('buraco', 'abre');
  let fase: 'abre' | 'fecha' = 'abre';
  let t = 0;
  const passo = (_agora: number, dms: number): void => {
    t += dms / 1000;
    const p = ancora();
    if (p) img.setPosition(Math.round(p.x), Math.round(p.y));
    const q = buracoQuadro(fase, t);
    if (q === null) {
      soltar();
      img.destroy();
      return;
    }
    img.setTexture(`${PREFIXO}${q}`);
  };
  const soltar = (): void => {
    cena.events.off('update', passo);
    cena.events.off('shutdown', soltar);
  };
  cena.events.on('update', passo);
  cena.events.once('shutdown', soltar);
  return {
    fechar() {
      if (fase === 'fecha') return;
      fase = 'fecha';
      t = 0;
      img.setData('buraco', 'fecha');
    },
  };
}
