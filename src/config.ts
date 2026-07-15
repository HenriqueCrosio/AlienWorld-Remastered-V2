/** Resolução base. Escala sempre por inteiro (×5 = 1920×1080 exato). */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

/** Paleta "Deep Void" — ver docs/ASSETS.md. */
export const COLORS = {
  bgDeep: 0x05060d,
  bgDark: 0x0b0f1e,
  bgMid: 0x131a33,
  bgFar: 0x1e2a4a,
  starDim: 0x3d5280,
  starMid: 0x55709c,
  starBright: 0xb5f7ff,

  metalDark: 0x2e2e38,
  metalMid: 0x6b6b7a,
  metalLight: 0xd0d0dc,

  playerDark: 0x0e6b7a,
  player: 0x17a6bd,
  playerBright: 0x3ee0f0,
  playerGlow: 0xb5f7ff,

  enemyDark: 0x5c0e2e,
  enemy: 0xa11347,
  enemyBright: 0xe8306b,

  hot: 0xff8c1a,
  hotBright: 0xffd447,
} as const;

/**
 * Velocidade de rolagem do mundo (px/s). Tudo no cenário se move para a esquerda nela.
 * Subiu de 60 para 84 no playtest: a 60 o jogo era "um passeio no parque".
 */
export const SCROLL_SPEED = 84;
