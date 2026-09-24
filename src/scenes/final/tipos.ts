import type Phaser from 'phaser';
import type { Fx } from '../../systems/Fx';

/** O que a sonda lê da cena (`scene.estado`). Cada capítulo escreve o seu pedaço. */
export interface EstadoFinal {
  /** 1..7 — o capítulo na tela. */
  capitulo: number;
  /** A textura do fundo do capítulo 1: a fotografia da luta ou, pelo menu, a pintura da câmara D. */
  fundo: string | null;
  /** O quadro corrente da folha de rachaduras (capítulo 1), −1 antes de ela aparecer. */
  rachadura: number;
  /** O quadro corrente da folha do rasgo (capítulo 2), −1 antes. */
  rasgo: number;
  /** true a partir do instante em que a música é cortada. */
  musicaCortada: boolean;
  /** A escala da lua a cada quadro do capítulo 4 (a sonda cobra que é UMA só). */
  escalasLua: number[];
  /** x da carcaça no sobrevoo, amostrado — a sonda cobra que o mundo anda para a DIREITA. */
  carcacaX: number | null;
  /** O alfa da camada de lava da carcaça (capítulo 7): 1 acesa, 0 apagada. */
  lavaCarcaca: number | null;
  /** true quando a nave terminou de ser sugada pela fenda (capítulo 3) — ela SOME, não fica derivando. */
  naveSumiu: boolean;
  /** true quando o corpo bateu na colônia, à vista (capítulo 5). */
  impacto: boolean;
}

/** O que todo capítulo recebe da regente. */
export interface CenaFinal {
  scene: Phaser.Scene;
  fx: Fx;
  /** A nave que ELE escolheu — uma só, que atravessa os capítulos. */
  nave: Phaser.GameObjects.Sprite;
  estado: EstadoFinal;
}

/** Um capítulo montado. `limpar` destrói tudo o que ele pôs na tela: é o corte do próximo. */
export interface Capitulo {
  update?(dt: number): void;
  limpar(): void;
}

/** Profundidades da cena, comuns aos capítulos. */
export const DEPTH = {
  FUNDO: 0,
  CENARIO: 10,
  EFEITO: 40,
  NAVE: 80,
  FRENTE: 90,
  TEXTO: 100,
} as const;
