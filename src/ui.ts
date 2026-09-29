import Phaser from 'phaser';
import { COLORS } from './config';
import { BMF, FAMILIA, NATIVO_PIXEL, fontesOk, registrarFonte } from './fonte';
import { ehHD, escalaHD, irmaDe, jogoHD, pixelFino, registrarTextoHD, vozDaCena, type Voz } from './uiHD';

export interface TextOpts {
  size?: number;
  color?: number;
  align?: 'center' | 'left';
  /** Peso do contorno. 0 desliga. */
  stroke?: number;
  /** A voz deste texto, quando não for a da cena (o painel da Doca fala como piloto dentro de uma cutscene). */
  voz?: Voz;
}

type Alinhamento = 'center' | 'left';

/**
 * Todo texto do jogo passa por aqui — e fala com uma das TRÊS VOZES (`uiHD.ts`), na CAMADA HD por cima do mundo.
 *
 * - Numa cena do mundo, o texto nasce na IRMÃ dela, na camada HD; o objeto devolvido é o próprio texto de lá, e o
 *   código da cena usa `setText`/`setAlpha`/`setColor`/tweens como sempre.
 * - Sem a camada (o navegador recusou o 2º canvas), o texto fica no mundo, na Silkscreen assada. Sem a Silkscreen,
 *   na fonte do sistema — o texto de antes de 29/09.
 *
 * O tamanho continua pedido em PIXEL DO MUNDO. O que torna texto legível sobre um fundo movimentado não é só a
 * fonte — é o CONTORNO (e a sombra na voz da nave); ele continua em todas as vozes.
 *
 * ⚠️ O tamanho vai no tamanho da FONTE, nunca na escala do objeto: o menu anima a escala do título (o baque
 * 1,14 → 1) e o aviso da fase chama `setScale(1)`.
 */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  const { size = 8, color = COLORS.metalLight, align = 'center', stroke = 3 } = opts;
  const pedida = opts.voz ?? vozDaCena(scene);
  const ok = fontesOk();

  const destino = ehHD(scene) ? scene : jogoHD() ? irmaDe(scene) : null;
  if (!destino) {
    // SEM A CAMADA: o texto fica no mundo.
    if (!ok.jogo) return textoSistema(scene, x, y, value, size, color, align, stroke);
    return bitmap(scene, x, y, value, NATIVO_PIXEL * (size >= 13 ? 2 : 1), color, align, stroke > 0);
  }

  // A voz que perdeu a fonte cai para a Silkscreen; sem a Silkscreen, para a fonte do sistema.
  const voz: Voz | null = ok[pedida] ? pedida : ok.jogo ? 'jogo' : null;
  if (!voz) return textoSistema(destino, x, y, value, size, color, align, stroke);

  if (voz === 'jogo') {
    const b = bitmap(destino, x, y, value, tamanhoJogo(size, escalaHD()), color, align, stroke > 0);
    registrarTextoHD(b, (s) => (b as unknown as Phaser.GameObjects.BitmapText).setFontSize(tamanhoJogo(size, s)));
    return b;
  }

  const t = destino.add
    .text(x, y, value, {
      fontFamily: voz === 'nave' ? FAMILIA.nave : FAMILIA.piloto,
      fontSize: `${voz === 'piloto' && size < 9 ? size * 0.9 : size}px`,
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      align,
    })
    .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
    .setResolution(escalaHD());
  if (stroke > 0) {
    // A NAVE mantém o contorno grosso e a sombra de sempre (o aviso grande já era bom assim); o PILOTO, contorno fino.
    if (voz === 'nave') t.setStroke('#05060d', stroke).setShadow(0, 1, '#05060d', 2, true, true);
    else t.setStroke('#05060d', 1.4);
  }
  registrarTextoHD(t, (s) => t.setResolution(s));
  return t;
}

/**
 * A voz do JOGO em unidades do mundo: o pixel da fonte é sempre um número INTEIRO de pixels de tela —
 * ≥ 13 → 2× o pixel do mundo (títulos) · 8–12 → 1× (corpo do menu) · ≤ 7 → o pixel fino (os atalhos de dev).
 */
function tamanhoJogo(size: number, s: number): number {
  const k = size >= 13 ? 2 * s : size >= 8 ? s : pixelFino();
  return (NATIVO_PIXEL * k) / s;
}

/** A fonte pixel assada (`src/fonte.ts`), com a ponte para as chamadas de Text que o jogo faz. */
function bitmap(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  tam: number,
  color: number,
  align: Alinhamento,
  contorno: boolean,
): Phaser.GameObjects.Text {
  registrarFonte(scene);
  const b = scene.add
    .bitmapText(x, y, contorno ? BMF.contorno : BMF.limpa, value, tam, align === 'center' ? 1 : 0)
    .setOrigin(align === 'center' ? 0.5 : 0, 0.5)
    .setTint(color);
  const ponte = b as unknown as Record<string, unknown>;
  ponte.setColor = (css: string) => b.setTint(Phaser.Display.Color.ValueToColor(css).color);
  ponte.setAlign = (a: string) => (a === 'center' ? b.setCenterAlign() : b.setLeftAlign());
  ponte.setResolution = () => b;
  ponte.setStroke = () => b;
  ponte.setShadow = () => b;
  return b as unknown as Phaser.GameObjects.Text;
}

/** O ÚLTIMO recurso (nenhuma fonte carregou): a monospace do sistema, como era antes de 29/09. */
function textoSistema(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color: number,
  align: Alinhamento,
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
    .setResolution(ehHD(scene) ? escalaHD() : 3);
  if (stroke > 0) {
    t.setStroke('#05060d', stroke);
    t.setShadow(0, 1, '#05060d', 2, true, true);
  }
  return t;
}
