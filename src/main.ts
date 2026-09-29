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
import { CartasScene } from './scenes/CartasScene';
import { carregarFonte } from './fonte';
import { criarCamadaHD } from './uiHD';
import { EspelhoHDScene } from './scenes/EspelhoHDScene';

// PROTÓTIPO (29/09): `?fonte=tiny5|pixelify|silkscreen` assa a fonte pixel antes do jogo nascer. Sem ela, nada muda.
await carregarFonte();

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

  scene: [BootScene, MenuScene, GameScene, InterludeScene, Interlude2Scene, Interlude3Scene, Interlude4Scene, GameOverScene, CartasScene],
});

// PROTÓTIPO (29/09): `?ui3x=pixel|lisa` liga a camada de interface em alta por cima do mundo (resolução mista).
void criarCamadaHD(game, [CartasScene, EspelhoHDScene]);

// Em dev, expõe o jogo para inspeção externa (probe headless, console do navegador).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
