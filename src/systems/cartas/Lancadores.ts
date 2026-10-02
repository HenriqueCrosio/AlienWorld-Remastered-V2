import type Phaser from 'phaser';
import type { Contexto } from './contexto';
import type { ExplosaoDoJogador } from './ExplosaoDoJogador';

/** PROVISÓRIOS (calibragem). O míssil é forte e raro; o tiro leve e constante é do drone (spec §4.3). */
const MISSIL = { esperaMs: 3000, velocidade: 140, dano: 2, homing: { turn: 200, range: 260 } };
/** O flare sai para trás a 60px/s e FREIA (×0,1 por segundo) até parar: fica na rota de quem persegue. */
const FLARE = { esperaMs: 4000, velocidade: 60, freio: 0.1, vidaMs: 3000, dano: 1 };

/**
 * MÍSSIL GUIADO e FLARE — os lançadores que não são o gatilho da nave. Os dois soltam projéteis pelo pool da nave
 * (`WeaponSystem.disparar`) e EXPLODEM pela explosão única: o míssil ao acertar, o flare ao tocar alguém ou, se ninguém
 * tocar, sozinho depois de ~3s (armadilha para quem persegue, bomba de retaguarda para quem escapou).
 */
export class Lancadores {
  private proximoMissil = 0;
  private proximoFlare = 0;
  private serie = 0;
  private readonly flares: { b: Phaser.Physics.Arcade.Sprite; id: number; explodeEm: number }[] = [];

  constructor(
    private readonly c: Contexto,
    private readonly explosao: ExplosaoDoJogador,
  ) {}

  tick(dt: number): void {
    const agora = this.c.h.scene.time.now;
    const n = this.c.h.nave();

    const misseis = this.c.quantas('WPN_009');
    if (misseis) {
      if (!this.proximoMissil) this.proximoMissil = agora + MISSIL.esperaMs;
      else if (agora >= this.proximoMissil) {
        this.proximoMissil = agora + MISSIL.esperaMs;
        // MÁX. 2: a 2ª cópia é um 2º míssil na MESMA salva, um pouco abaixo.
        for (let i = 0; i < misseis; i++) {
          this.c.h.weapons.disparar({
            x: n.x + 6,
            y: n.y + (i === 0 ? -4 : 4),
            angulo: 0,
            textura: 'carta-missil',
            velocidade: MISSIL.velocidade,
            dano: MISSIL.dano,
            origem: 'missil',
            homing: MISSIL.homing,
          });
        }
      }
    }

    if (this.c.tem('EFF_010')) {
      if (!this.proximoFlare) this.proximoFlare = agora + FLARE.esperaMs;
      else if (agora >= this.proximoFlare) {
        this.proximoFlare = agora + FLARE.esperaMs;
        this.soltarFlare(n.x - 12, n.y, agora);
      }
    }
    this.tickFlares(dt, agora);
  }

  private soltarFlare(x: number, y: number, agora: number): void {
    const b = this.c.h.weapons.disparar({
      x,
      y,
      angulo: 180,
      textura: 'carta-flare',
      velocidade: FLARE.velocidade,
      dano: FLARE.dano,
      origem: 'flare',
    });
    if (!b) return;
    const id = ++this.serie;
    b.setData('flare', id);
    this.flares.push({ b, id, explodeEm: agora + FLARE.vidaMs });
  }

  private tickFlares(dt: number, agora: number): void {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      // O slot pode ter sido reciclado (o flare tocou alguém e voltou ao pool): o id confere que ainda é ESTE flare.
      const vivo = f.b.active && f.b.getData('origem') === 'flare' && f.b.getData('flare') === f.id;
      if (!vivo) {
        this.flares.splice(i, 1);
        continue;
      }
      const body = f.b.body as Phaser.Physics.Arcade.Body;
      body.velocity.x *= Math.pow(FLARE.freio, dt);
      if (agora < f.explodeEm) continue;
      this.flares.splice(i, 1);
      const { x, y } = f.b;
      this.c.h.weapons.release(f.b);
      this.explosao.explodir('flare', x, y, null, null);
    }
  }
}
