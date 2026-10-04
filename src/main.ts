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
import { ArquivoScene } from './scenes/ArquivoScene';
import { BootHDScene } from './scenes/BootHDScene';
import { carregarFontes } from './fonte';
import { criarCamadaHD } from './uiHD';

// As fontes das três vozes carregam (e a Silkscreen é assada) ANTES do jogo nascer: o 1º texto já sai nítido.
await carregarFontes();

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

  scene: [BootScene, MenuScene, GameScene, InterludeScene, Interlude2Scene, Interlude3Scene, Interlude4Scene, GameOverScene, CartasScene, ArquivoScene],
});

// Em dev, expõe o jogo para inspeção externa (probe headless, console do navegador).
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
  // O SANDBOX (só em dev): `?sandbox` na URL, ou X no menu. Import dinâmico — fora do build do jogador.
  void import('./sandbox/iniciar.ts').then((m) => m.ligarSandbox(game));
}

// A CAMADA HD por cima do mundo (`uiHD.ts`): o texto das três vozes e a mesa. O mundo carrega os assets enquanto
// ela nasce (ela fica pronta bem antes do menu, que é o 1º a escrever); se falhar, o texto fica no mundo.
void criarCamadaHD(game, [BootHDScene, CartasScene]);
