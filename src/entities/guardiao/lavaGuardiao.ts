/**
 * A LAVA DO MIOLO (spec 2026-11-22-guardiao-coleira-design.md §5): no tranco da coleira, a inércia arranca do miolo um
 * LEQUE de gotas de lava em arco, com um vão. A arte é a bola do Predador (o mesmo gradiente) menor, com a luz e as
 * brasas dela; a gravidade é a da lava da F4 (`Predador.LAVA_G`). Na borda, só respingo: o padrão fica limpo.
 */
import Phaser from 'phaser';
import type { EnemySystem } from '../../systems/EnemySystem';
import { Som } from '../../som/Som';
import { garantirLuzRadial } from '../Predador';
import { lequeLava, type LequeLava, type Ponto } from './padroes';

interface Gota {
  b: Phaser.Physics.Arcade.Sprite;
  luz: Phaser.GameObjects.Image;
}

export class LavaGuardiao {
  static readonly XALVO = 40;
  static readonly T = 1.0;
  static readonly PASSO = 18;
  static readonly G = 260;
  /** o raio que FERE (a textura tem 12 px; a borda do gradiente é só brilho) */
  static readonly RAIO = 5;
  private static readonly LADO = 12;

  private gotas: Gota[] = [];
  private readonly brasas: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly topo: number,
    private readonly base: number,
  ) {
    // a luz da gota é a do Predador, que só nasce na troca
    garantirLuzRadial(scene);
    if (!scene.textures.exists('lavaGuardiao')) {
      const lado = LavaGuardiao.LADO;
      const tex = scene.textures.createCanvas('lavaGuardiao', lado, lado);
      if (tex) {
        const ctx = tex.getContext();
        const r = lado / 2;
        const g = ctx.createRadialGradient(r - 1, r - 1, 0, r, r, r);
        g.addColorStop(0, '#fff8d0');
        g.addColorStop(0.28, '#ffd23a');
        g.addColorStop(0.58, '#ff7a10');
        g.addColorStop(0.85, '#c01e08');
        g.addColorStop(1, 'rgba(90,8,2,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }
    this.brasas = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 220, max: 420 },
        speed: { min: 6, max: 30 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff0a0, 0xffb030, 0xff6a10, 0xd02a08],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(40);
  }

  /** O LEQUE do tranco: `n` gotas da `boca`, centrado na altura `centroY` (a nave), um vão sorteado. */
  leque(n: number, boca: Ponto, centroY: number): LequeLava {
    const L = lequeLava({
      n,
      boca,
      xAlvo: LavaGuardiao.XALVO,
      T: LavaGuardiao.T,
      g: LavaGuardiao.G,
      passo: LavaGuardiao.PASSO,
      centroY,
      topo: this.topo,
      base: this.base,
      rnd: Math.random,
    });
    for (const v of L.vel) this.lancar(boca, v);
    this.brasas.explode(12, boca.x, boca.y);
    Som.tocar('predador.lava.arremesso', { x: boca.x });
    return L;
  }

  private lancar(p: Ponto, v: Ponto): void {
    const b = this.enemies.enemyBullets.get(p.x, p.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture('lavaGuardiao');
    b.clearTint();
    b.setScale(1);
    b.setFlipX(false);
    b.setDepth(41);
    const body = b.body as Phaser.Physics.Arcade.Body;
    const off = LavaGuardiao.LADO / 2 - LavaGuardiao.RAIO;
    body.setCircle(LavaGuardiao.RAIO, off, off);
    b.setData('ox', p.x);
    b.setData('oy', p.y);
    b.setData('lavaGuardiao', true);
    b.setVelocity(v.x, v.y);
    b.setRotation(Math.atan2(v.y, v.x));
    const luz = this.scene.add
      .image(p.x, p.y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff6a18)
      .setScale(0.5)
      .setDepth(40);
    this.gotas.push({ b, luz });
  }

  /** A gravidade é DAQUI (o pool é da fase inteira). Na borda da arena: respingo e some. Todo quadro, até depois da morte. */
  atualizar(dt: number): void {
    this.gotas = this.gotas.filter((g) => {
      if (g.b.active && g.b.getData('lavaGuardiao') === true) return true;
      g.luz.destroy();
      return false;
    });
    for (const { b, luz } of this.gotas) {
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.velocity.y += LavaGuardiao.G * dt;
      b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      luz.setPosition(b.x, b.y).setAlpha(0.6 + Math.random() * 0.4);
      if (Math.random() < 0.7) this.brasas.emitParticleAt(b.x, b.y);
      const chao = b.y >= this.base - 2 && body.velocity.y > 0;
      const teto = b.y <= this.topo + 2 && body.velocity.y < 0;
      if (!chao && !teto) continue;
      const x = b.x, y = b.y;
      b.setData('lavaGuardiao', false);
      this.enemies.release(b);
      this.brasas.explode(10, x, y);
      Som.tocar('predador.lava.impacto', { x, forca: 0.6 });
    }
  }

  destroy(): void {
    for (const g of this.gotas) {
      g.luz.destroy();
      if (g.b.active) {
        g.b.setData('lavaGuardiao', false);
        this.enemies.release(g.b);
      }
    }
    this.gotas = [];
    this.brasas.destroy();
  }
}
