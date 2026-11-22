/**
 * A LAVA DO MIOLO (spec 2026-11-22-guardiao-coleira-design.md §5): no tranco da coleira, a inércia arranca do miolo os
 * PULSOS ALTERNADOS — gotas em raios RETOS (sem gravidade: a figura geométrica tem de ler; a regra em `angulosPulso`). A
 * arte é a bola do Predador (o mesmo gradiente) menor, com a luz dela e a brasa no vermelho do miolo. Na borda, só
 * respingo: o padrão fica limpo.
 */
import Phaser from 'phaser';
import type { EnemySystem } from '../../systems/EnemySystem';
import { Som } from '../../som/Som';
import { garantirLuzRadial } from '../Predador';
import type { Ponto } from './padroes';

interface Gota {
  b: Phaser.Physics.Arcade.Sprite;
  luz: Phaser.GameObjects.Image;
  /** já respingou na borda da arena (e seguiu) */
  cruzou: boolean;
}

/** um pulso disparado (lido pelo teste e pelo filme) */
export interface PulsoDisparado {
  ox: number;
  oy: number;
  angulos: number[];
  vel: number;
  /** o relógio da cena no disparo (ms) */
  t: number;
}

/**
 * A BRASA no vermelho do MIOLO (22/11, ele: *"a brasa pode ser mais avermelhada, como o core dele"*): amostrada da arte
 * (`guardiao-coleira.png`, a massa em volta do miolo): o realce, o dominante #e4270f e os dois escuros.
 */
const BRASA_DO_MIOLO = [0xf85732, 0xe4270f, 0xce1c0b, 0x8f150e];

export class LavaGuardiao {
  /** o raio que FERE (a textura tem 12 px; a borda do gradiente é só brilho) */
  static readonly RAIO = 5;
  private static readonly LADO = 12;

  private gotas: Gota[] = [];
  /** o último pulso (lido pelo teste e pelo filme) */
  ultimoPulso: PulsoDisparado | null = null;
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
        tint: BRASA_DO_MIOLO,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(40);
  }

  /** UM PULSO: uma gota reta por ângulo, todas à mesma velocidade — a figura viaja inteira, sem deformar. */
  pulso(boca: Ponto, angulos: number[], vel: number): void {
    for (const a of angulos) this.lancar(boca, { x: Math.cos(a) * vel, y: Math.sin(a) * vel });
    this.brasas.explode(8, boca.x, boca.y);
    Som.tocar('predador.lava.arremesso', { x: boca.x });
    this.ultimoPulso = { ox: boca.x, oy: boca.y, angulos, vel, t: this.scene.time.now };
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
    this.gotas.push({ b, luz, cruzou: false });
  }

  /**
   * A luz e a brasa seguem a gota. Na borda da arena ela RESPINGA e SEGUE (22/11, ele: *"a nave pode ir até na linha da
   * tela, ou seja, as lavas precisam passar a parede para punir quem tenta ficar embaixo ou em cima. Só que deixe efeitos
   * que a lava bateu"*): quem se esconde na faixa da parede não fica fora da figura — a regra do casco da F3. Quem a
   * recolhe é o `EnemySystem`, fora da tela. Todo quadro, até depois da morte.
   */
  atualizar(_dt: number): void {
    this.gotas = this.gotas.filter((g) => {
      if (g.b.active && g.b.getData('lavaGuardiao') === true) return true;
      g.luz.destroy();
      return false;
    });
    for (const g of this.gotas) {
      const { b, luz } = g;
      const body = b.body as Phaser.Physics.Arcade.Body;
      luz.setPosition(b.x, b.y).setAlpha(0.6 + Math.random() * 0.4);
      // metade da brasa da lava da Besta: o rastro não pode borrar a figura
      if (Math.random() < 0.35) this.brasas.emitParticleAt(b.x, b.y);
      if (g.cruzou) continue;
      const chao = b.y >= this.base - 2 && body.velocity.y > 0;
      const teto = b.y <= this.topo + 2 && body.velocity.y < 0;
      if (!chao && !teto) continue;
      g.cruzou = true;
      const y = chao ? this.base - 2 : this.topo + 2;
      this.brasas.explode(10, b.x, y);
      Som.tocar('predador.lava.impacto', { x: b.x, forca: 0.6 });
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
