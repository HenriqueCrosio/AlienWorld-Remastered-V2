import Phaser from 'phaser';
import { COLORS } from './config';

export interface TextOpts {
  size?: number;
  color?: number;
  align?: 'center' | 'left';
  /** Peso do contorno. 0 desliga. */
  stroke?: number;
}

/**
 * Todo texto do jogo passa por aqui.
 *
 * O que torna texto legível em pixel art sobre um fundo movimentado NÃO é fonte maior — é
 * CONTORNO. Um traço preto de 2-3px em volta separa a letra de qualquer coisa atrás dela,
 * e a sombra dá o descolamento final. Sem isso, 6px sobre parallax vira ruído.
 *
 * Tamanho mínimo 7px: abaixo disso a fonte perde as hastes e nenhum contorno salva.
 */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  const { size = 8, color = COLORS.metalLight, align = 'center', stroke = 3 } = opts;

  const t = scene.add
    .text(x, y, value, {
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fontSize: `${Math.max(7, size)}px`,
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    })
    .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
    // Resolução alta: o texto é desenhado nítido e só depois escalado com o canvas.
    .setResolution(3);

  if (stroke > 0) {
    t.setStroke('#05060d', stroke);
    t.setShadow(0, 1, '#05060d', 2, true, true);
  }

  return t;
}
