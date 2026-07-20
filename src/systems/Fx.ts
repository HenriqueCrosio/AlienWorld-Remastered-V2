import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * Explosões e impactos: SPRITE ANIMADO (sheet do PixelLab) + fagulhas em partícula.
 *
 * ─── A SHEET SOZINHA NÃO BASTA, A PARTÍCULA SOZINHA NÃO BASTAVA ───
 *
 * A era anterior era só partícula aditiva: em movimento lia como clarão, mas parada (num
 * screenshot, num set-piece de cutscene) era fraquinha — uma explosão sem CORPO. A sheet
 * (`explosion`, 13f: núcleo branco-quente → chamas → fumaça escura) dá o corpo; as fagulhas
 * voando dão a energia que nenhum sheet tem (matéria arremessada). A combinação é o AAA.
 *
 * Os sprites são ONE-SHOT: `play` + `once('animationcomplete', destroy)` — sem pool, porque
 * a vida deles é a própria animação. Sem a sheet em disco, cai nas partículas de sempre
 * (arte entra asset por asset; a guarda é `anims.exists`).
 */
export class Fx {
  private readonly burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly hitSpark: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.burst = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 180, max: 420 },
        speed: { min: 30, max: 130 },
        scale: { start: 1.5, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot, COLORS.enemyBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.hitSpark = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 140,
        speed: { min: 20, max: 70 },
        scale: { start: 1, end: 0 },
        tint: [COLORS.playerGlow, COLORS.playerBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.registerAnims();
  }

  /**
   * As animações das sheets (carregadas no BootScene). Registradas UMA vez — o Fx é criado
   * por cena, e `anims.create` com chave repetida gritaria; a guarda `anims.exists` resolve.
   *
   * - `explosion` (13f @18fps ≈ 720ms): a explosão-MESTRA. Rápida o bastante para ler como
   *   ESTOURO, lenta o bastante para a fumaça escura aparecer — a saída em fumaça é o que a
   *   separa de um clarão de partícula.
   * - `explosion-big` (13f @13fps ≈ 1s): a detonação de set-piece. Mais lenta: massa grande
   *   explode devagar (é o que vende a ESCALA — uma explosão de 128px a 18fps lê como pequena
   *   ampliada).
   * - `implosion-big`: os MESMOS quadros ao contrário. Fumaça → chama → núcleo branco: matéria
   *   sendo SUGADA para dentro. É a morte da Aurora (Interlude 1).
   * - `leviathan-dying` (9f, pingpong): fissuras pulsando na espinha — toca o beat INTEIRO da
   *   cutscene final sem congelar no último quadro (o yoyo é o que impede o "adesivo parado").
   */
  private registerAnims(): void {
    const anims = this.scene.anims;
    const tex = this.scene.textures;

    if (tex.exists('explosionSheet') && !anims.exists('explosion')) {
      anims.create({
        key: 'explosion',
        frames: anims.generateFrameNumbers('explosionSheet', { start: 0, end: 12 }),
        frameRate: 18,
        repeat: 0,
      });
    }

    if (tex.exists('explosionBigSheet')) {
      if (!anims.exists('explosion-big')) {
        anims.create({
          key: 'explosion-big',
          frames: anims.generateFrameNumbers('explosionBigSheet', { start: 0, end: 12 }),
          frameRate: 13,
          repeat: 0,
        });
      }
      if (!anims.exists('implosion-big')) {
        anims.create({
          key: 'implosion-big',
          frames: anims.generateFrameNumbers('explosionBigSheet', { start: 12, end: 0 }),
          frameRate: 13,
          repeat: 0,
        });
      }
    }

    if (tex.exists('leviathanDyingSheet') && !anims.exists('leviathan-dying')) {
      anims.create({
        key: 'leviathan-dying',
        frames: anims.generateFrameNumbers('leviathanDyingSheet', { start: 0, end: 8 }),
        frameRate: 8,
        repeat: -1,
        yoyo: true,
      });
    }
  }

  /**
   * Um sprite one-shot: toca a animação UMA vez e se destrói. Devolve o sprite para a cena
   * poder ajustar profundidade/escala (as cutscenes precisam dele NA FRENTE dos cenários —
   * os emissores de partícula vivem no depth 50, atrás de doca/Leviatã).
   */
  private sheetSprite(
    anim: string,
    texKey: string,
    x: number,
    y: number,
    escala: number,
    depth: number,
  ): Phaser.GameObjects.Sprite | null {
    if (!this.scene.anims.exists(anim)) return null;

    const s = this.scene.add.sprite(x, y, texKey, 0).setScale(escala).setDepth(depth);
    s.play(anim);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    return s;
  }

  /**
   * A explosão de combate: sheet + fagulhas + shake.
   *
   * `size` é o parâmetro histórico (1 = inimigo comum, 1.5 = prop/torre, 2+ = mina/capital).
   * A escala da sheet sai dele (0.6×): inimigo comum ≈ 0.6 (38px de bola de fogo — cobre o
   * cadáver sem tapar a tela), capital ≈ 1.2. `depth` expõe a frente de cena das cutscenes.
   */
  explode(x: number, y: number, size = 1, depth = 50): Phaser.GameObjects.Sprite | null {
    this.burst.explode(Math.floor(10 * size), x, y);
    this.scene.cameras.main.shake(90 * size, 0.004 * size);
    return this.sheetSprite('explosion', 'explosionSheet', x, y, 0.6 * size, depth);
  }

  /**
   * A DETONAÇÃO GRANDE (a `explosion-big`, 128px): morte de chefão, a bomba, os clímaxes das
   * cutscenes. Shake mais longo + um flash curto — o peso do impacto.
   */
  explodeBig(x: number, y: number, escala = 1, depth = 50): Phaser.GameObjects.Sprite | null {
    this.burst.explode(Math.floor(16 * escala), x, y);
    this.scene.cameras.main.shake(320 * escala, 0.006 * escala);
    this.scene.cameras.main.flash(120, 255, 190, 110);
    return this.sheetSprite('explosion-big', 'explosionBigSheet', x, y, escala, depth);
  }

  /**
   * A IMPLOSÃO: a `explosion-big` INVERTIDA — a fumaça vira chama, a chama vira núcleo branco,
   * e tudo some PARA DENTRO. É a morte da Aurora: matéria sugada, não arremessada.
   * Sem flash: implodir é a tela PERDER luz, não ganhar.
   */
  implodeBig(x: number, y: number, escala = 1, depth = 50): Phaser.GameObjects.Sprite | null {
    this.scene.cameras.main.shake(340 * escala, 0.005 * escala);
    return this.sheetSprite('implosion-big', 'explosionBigSheet', x, y, escala, depth);
  }

  /**
   * O sprite da sheet PURO, sem shake nem flash: para impactos em SILÊNCIO (a chuva de
   * meteoros da cutscene final — lá o silêncio é o preço, e o `explode` sacode a tela a cada
   * estouro). As fagulhas ficam a cargo da cena.
   */
  sheetExplosion(
    x: number,
    y: number,
    escala: number,
    depth = 50,
  ): Phaser.GameObjects.Sprite | null {
    return this.sheetSprite('explosion', 'explosionSheet', x, y, escala, depth);
  }

  hit(x: number, y: number): void {
    this.hitSpark.explode(3, x, y);
  }
}
