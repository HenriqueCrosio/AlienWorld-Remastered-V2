import Phaser from 'phaser';
import { COLORS } from './config';
import { BMF, fonteAtiva, registrarFonte } from './fonte';
import { ehHD, escalaHD, estiloHD, familiaMono, pixelFino, vozDaCena, type Voz } from './uiHD';

export interface TextOpts {
  size?: number;
  color?: number;
  align?: 'center' | 'left';
  /** Peso do contorno. 0 desliga. */
  stroke?: number;
  /** PROTÓTIPO (29/09): a voz deste texto, quando não for a da cena (`uiHD.ts`). */
  voz?: Voz;
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

  const voz = opts.voz ?? vozDaCena(scene);

  const fonte = fonteAtiva();
  let t: Phaser.GameObjects.Text;
  if (ehHD(scene)) t = textoHD(scene, x, y, value, size, color, align, stroke, voz);
  else if (fonte) t = bitmapText(scene, x, y, value, fonte.nativo * (size >= 13 ? 2 : 1), color, align, stroke > 0);
  else t = textoSistema(scene, x, y, value, size, color, align, stroke);
  // PROTÓTIPO (29/09): as opções ficam no objeto, para o ESPELHO das folhas redesenhar o texto na camada HD.
  (t as unknown as { __px: unknown }).__px = { size, color, align, stroke, voz };
  return t;
}

function textoSistema(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: number,
  align: 'center' | 'left',
  stroke: number,
): Phaser.GameObjects.Text {
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

/**
 * PROTÓTIPO (29/09): o mesmo texto na fonte pixel assada (`src/fonte.ts`). O tamanho só anda em múltiplo INTEIRO do
 * nativo — fora disso a grade da fonte racha. A ponte `setColor`/`setAlign` cobre as chamadas de Text que o jogo faz.
 */
function bitmapText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  tam: number,
  color: number,
  align: 'center' | 'left',
  contorno: boolean,
): Phaser.GameObjects.Text {
  registrarFonte(scene);
  const b = scene.add
    .bitmapText(x, y, contorno ? BMF.contorno : BMF.limpa, value, tam, align === 'center' ? 1 : 0)
    .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
    .setTint(color);
  return ponte(b);
}

/**
 * PROTÓTIPO (29/09): o texto na CAMADA HD (`src/uiHD.ts`). A cena escreve em coordenadas do mundo; o texto é criado
 * na resolução da TELA e encolhido por `1/s`, então cada pixel da fonte vira um número INTEIRO de pixels de tela:
 * - `pixel`: corpo com o pixel fino (~⅔ do pixel do mundo), títulos (9+) com o pixel do mundo, os grandes (13+) 2×;
 * - `lisa`: a fonte vetorial desenhada na resolução da tela (suavizada, sem grade).
 */
function textoHD(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: number,
  align: 'center' | 'left',
  stroke: number,
  voz: Voz,
): Phaser.GameObjects.Text {
  const s = escalaHD();
  const fonte = fonteAtiva();
  const contorno = stroke > 0;
  const estilo = estiloHD();
  const fala: Voz = estilo === 'pixel' ? 'jogo' : estilo === 'lisa' ? 'piloto' : voz;

  if (fala === 'jogo' && fonte) {
    // Nas vozes, o corpo do menu sobe um degrau (8+ no pixel do mundo): no pixel fino ele ficava miúdo.
    const k = size >= 13 ? 2 * s : size >= (estilo === 'vozes' ? 8 : 9) ? s : pixelFino();
    return bitmapText(scene, x, y, value, fonte.nativo * k, color, align, contorno).setScale(1 / s);
  }
  if (fala === 'nave') {
    // A voz da nave é a de HOJE (monospace, contorno grosso e sombra) — só que num arquivo nosso e na resolução
    // da tela: o aviso grande já era bom; o que borrava era a HUD pequena.
    const t = scene.add
      .text(x, y, value, {
        fontFamily: familiaMono(),
        fontStyle: familiaMono() === 'Consolas' ? 'bold' : 'normal',
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        align,
      })
      .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
      .setResolution(s);
    if (contorno) t.setStroke('#05060d', stroke).setShadow(0, 1, '#05060d', 2, true, true);
    return t;
  }
  const t = scene.add
    .text(x, y, value, {
      fontFamily: 'fonte-lisa',
      fontSize: `${size >= 9 ? size : size * 0.9}px`,
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      align,
    })
    .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
    .setResolution(s);
  if (contorno) t.setStroke('#05060d', 1.4);
  return t;
}

function ponte(b: Phaser.GameObjects.BitmapText): Phaser.GameObjects.Text {
  const ponte = b as unknown as Record<string, unknown>;
  ponte.setColor = (css: string) => {
    const cor = Phaser.Display.Color.ValueToColor(css).color;
    const px = (b as unknown as { __px?: { color: number } }).__px;
    if (px) px.color = cor;
    return b.setTint(cor);
  };
  ponte.setAlign = (a: string) => (a === 'center' ? b.setCenterAlign() : b.setLeftAlign());
  ponte.setResolution = () => b;
  ponte.setStroke = () => b;
  ponte.setShadow = () => b;
  return b as unknown as Phaser.GameObjects.Text;
}
