import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';

type Medal = 'ouro' | 'prata' | 'bronze' | null;

/** Faixas de medalha — herdadas do v2 (InterfaceGameOver.cs). */
const MEDALS: { min: number; medal: Exclude<Medal, null>; color: number }[] = [
  { min: 3000, medal: 'ouro', color: 0xffd447 },
  { min: 1500, medal: 'prata', color: 0xd0d0dc },
  { min: 600, medal: 'bronze', color: 0xff8c1a },
];

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: {
    score: number;
    handling: HandlingMode;
    victory?: boolean;
    practice?: boolean;
  }): void {
    const { score, handling, victory = false, practice = false } = data;

    // Recorde por modificador — herdeiro do PlayerPrefs do v2.
    // O TREINO não grava recorde: ele pula 68s de fase, o score não é comparável.
    const key = `alienworld:record:${handling}`;
    const previous = Number(localStorage.getItem(key) ?? 0);
    const isRecord = !practice && score > previous;
    if (isRecord) localStorage.setItem(key, String(score));

    // Volta à faixa da fase: a música do chefão não deve sobreviver ao chefão.
    Music.play(this, 'stage1', 1200);

    const medal = MEDALS.find((m) => score >= m.min);

    if (victory) {
      this.text(GAME_WIDTH / 2, 38, 'FASE 1 COMPLETA', 13, COLORS.playerBright);
      this.text(GAME_WIDTH / 2, 56, 'rumo ao Leviatã', 7, COLORS.player);
    } else {
      this.text(GAME_WIDTH / 2, 44, 'NAVE PERDIDA', 14, COLORS.enemyBright);
    }

    this.text(GAME_WIDTH / 2, 84, `SCORE  ${score}`, 10, COLORS.metalLight);
    this.text(
      GAME_WIDTH / 2,
      100,
      `RECORDE  ${Math.max(score, previous)}`,
      7,
      isRecord ? COLORS.hotBright : COLORS.metalMid,
    );

    if (medal) {
      this.text(GAME_WIDTH / 2, 128, `MEDALHA DE ${medal.medal.toUpperCase()}`, 10, medal.color);
    } else {
      this.text(GAME_WIDTH / 2, 128, 'SEM MEDALHA', 8, COLORS.metalMid);
    }

    if (isRecord) this.text(GAME_WIDTH / 2, 146, '★ NOVO RECORDE ★', 8, COLORS.hotBright);

    this.text(
      GAME_WIDTH / 2,
      180,
      practice ? 'ESPAÇO repete o CHEFÃO · ESC menu' : 'ESPAÇO reinicia · ESC menu',
      6,
      COLORS.metalMid,
    );

    const kb = this.input.keyboard!;
    // No treino, ESPAÇO volta direto para a luta — sem os 68s de fase.
    kb.once('keydown-SPACE', () => this.scene.start('Game', { handling, practice }));
    kb.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  private text(x: number, y: number, value: string, size: number, color: number): void {
    pixelText(this, x, y, value, { size, color });
  }
}
