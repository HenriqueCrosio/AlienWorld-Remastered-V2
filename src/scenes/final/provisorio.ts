import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { pixelText } from '../../ui';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * UM CAPÍTULO QUE AINDA NÃO EXISTE — tela preta com o nome dele. Existe para a cena ANDAR pela linha do tempo
 * real enquanto é construída: sem ele, o capítulo 3 ficava na tela até o fim (38s de sucção em loop — ele
 * assistiu isso em 24/09 e com razão achou que a cena travava). Cada tarefa do plano troca o seu marcador pelo
 * capítulo de verdade; quando o último sair, este arquivo sai junto.
 */
export function montarProvisorio(c: CenaFinal, capitulo: number, nome: string): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = capitulo;
  nave.setVisible(false);
  scene.cameras.main.resetFX();
  const texto = pixelText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, `${capitulo} · ${nome} — EM CONSTRUÇÃO`, {
    size: 8,
    color: COLORS.metalMid,
  }).setDepth(DEPTH.TEXTO);
  return {
    limpar() {
      texto.destroy();
    },
  };
}
