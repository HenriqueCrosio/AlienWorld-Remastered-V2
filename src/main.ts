import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { InterludeScene } from './scenes/InterludeScene';
import { Interlude2Scene } from './scenes/Interlude2Scene';
import { Interlude3Scene } from './scenes/Interlude3Scene';
import { Interlude4Scene } from './scenes/Interlude4Scene';
import { GameOverScene } from './scenes/GameOverScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bgDeep,

  // Sem estas duas, a pixel art vira borrão.
  pixelArt: true,
  roundPixels: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },

  scene: [BootScene, MenuScene, GameScene, InterludeScene, Interlude2Scene, Interlude3Scene, Interlude4Scene, GameOverScene],
});

// Em dev, expõe o jogo para inspeção externa (probe headless, console do navegador).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
