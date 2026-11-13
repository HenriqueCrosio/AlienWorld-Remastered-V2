import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';
import { mapaAtivo, rotuloDaTecla } from '../controles';

import { medalhaDe, registrarRecorde } from '../placar';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: {
    score: number;
    handling: HandlingMode;
    victory?: boolean;
    practice?: boolean;
    /** A fase COMPLETADA (na vitória) ou ONDE o jogador caiu (na derrota). Sem ela o título
     *  era fixo — "FASE 1 COMPLETA" — e mentia em todo fim de campanha desde que a Fase 2 nasceu. */
    stage?: number;
    /** A nave da run — o retry da fase devolve a MESMA nave, não o jato padrão. */
    ship?: string;
    /** O placar na ENTRADA da fase (checkpoint). O retry recomeça DAQUI, não do zero:
     *  morrer reinicia a fase, não a campanha (GDD §8). */
    baseScore?: number;
  }): void {
    const {
      score,
      handling,
      victory = false,
      practice = false,
      stage = 1,
      ship,
      baseScore = 0,
    } = data;

    // O recorde por modificador e a medalha: `src/placar.ts` (o resultado do fim da campanha usa o mesmo).
    const { anterior: previous, novo: isRecord } = registrarRecorde(localStorage, handling, score, practice);

    // Volta à faixa da fase: a música do chefão não deve sobreviver ao chefão.
    Music.play(this, 'stage1', 1200);

    const medal = medalhaDe(score);

    if (victory) {
      // O subtítulo é o GANCHO para o que vem depois — por fase, porque a campanha é uma
      // aproximação e cada fim aponta para um lugar diferente dela.
      const gancho: Record<number, string> = {
        1: 'rumo ao Leviatã',
        2: 'o casco à vista',
        3: 'engolido · O INTERIOR aguarda',
        4: 'o Leviatã caiu',
      };
      this.text(GAME_WIDTH / 2, 38, `FASE ${stage} COMPLETA`, 13, COLORS.playerBright);
      this.text(GAME_WIDTH / 2, 56, gancho[stage] ?? 'fim da campanha', 7, COLORS.player);
    } else {
      this.text(GAME_WIDTH / 2, 44, 'NAVE PERDIDA', 14, COLORS.enemyBright);
      this.text(GAME_WIDTH / 2, 60, `a fase ${stage} continua esperando`, 7, COLORS.metalMid);
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

    // O CRÉDITO: só na vitória da FASE 4 (o fim da campanha), discreto na parte baixa.
    // Nas telas de derrota e nas vitórias parciais ele não aparece — crédito é de fim de jogo.
    if (victory && stage === 4) {
      this.text(GAME_WIDTH / 2, 202, 'UM JOGO DE HENRIQUE CROSIO', 7, COLORS.metalMid);
    }

    // A tecla de TIRO do perfil repete (Espaço no padrão, Z no clássico).
    const tiro = mapaAtivo().tiro[0];
    const tecla = rotuloDaTecla(tiro);
    this.text(
      GAME_WIDTH / 2,
      180,
      practice
        ? `${tecla} repete o CHEFÃO · ESC menu`
        : victory
          ? `${tecla} joga de novo · ESC menu`
          : `${tecla} tenta a FASE ${stage} de novo · ESC menu`,
      6,
      COLORS.metalMid,
    );

    const kb = this.input.keyboard!;
    // No treino, o TIRO volta direto para a luta — sem a fase antes dela. Fora do treino,
    // o retry é da FASE em que o jogador caiu (com a mesma nave e o placar do checkpoint):
    // morrer reinicia a fase, não a campanha (GDD §8).
    // ⚠️ SÓ TOQUE NOVO: quem morre segurando o tiro manda a repetição do sistema — e a fase recomeçaria sozinha.
    let saiu = false;
    kb.on(`keydown-${tiro}`, (ev: KeyboardEvent) => {
      if (ev.repeat || saiu) return;
      saiu = true;
      this.scene.start('Game', { stage, handling, practice, ship, score: baseScore });
    });
    kb.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  private text(x: number, y: number, value: string, size: number, color: number): void {
    pixelText(this, x, y, value, { size, color });
  }
}
