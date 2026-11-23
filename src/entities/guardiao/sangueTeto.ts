import Phaser from 'phaser';
import { GAME_HEIGHT } from '../../config';
import { garantirLuzRadial } from '../Predador';
import { TETO, type Pendurada } from './tetoSangra';

/**
 * AS GOTAS DO TETO QUE SANGRA (23/11, o passo 5): o sangue quente do hospedeiro — vermelho mais ESCURO e viscoso que a lava
 * do miolo (que é laranja, com luz). A gota é desenhada em pixel (peça ≲ 8 px: [[pecas-minusculas-em-pixel]]), estica
 * pendurada no ponto inchado antes de soltar, cai RETA com a gravidade da F4 e, na borda de baixo, RESPINGA e segue (a
 * parede não protege: a lei da lava). Fere pelo grupo `perigos` (as balas do jogador passam por ela), dano 1.
 */
const LARGURA = 7;
const ALTURA = 11;
/** o centro do bulbo (onde o círculo que fere fica), a partir do canto */
const BULBO = { x: 3.5, y: 7 };

/**
 * a gota em pixel: `#` contorno, `o` corpo, `m` meio-tom, `h` brilho (um ponto só, molhado), `.` vazio. Ponta para CIMA
 * (por onde ela solta do teto), bulbo embaixo.
 */
const DESENHO = [
  '...#...',
  '..#o#..',
  '..#o#..',
  '.#ooo#.',
  '.#oom#.',
  '#ohoom#',
  '#ohoom#',
  '#ooomm#',
  '#ooomm#',
  '.#omm#.',
  '..###..',
];
/** amostrado para ser mais escuro que a brasa do miolo (#e4270f) e da lava: sangue, não fogo */
const CORES: Record<string, string> = { '#': '#2a0507', o: '#6c0c10', m: '#4a080b', h: '#b2322a' };

function garantirTextura(scene: Phaser.Scene): void {
  if (scene.textures.exists('gotaSangue')) return;
  const tex = scene.textures.createCanvas('gotaSangue', LARGURA, ALTURA);
  if (!tex) return;
  const ctx = tex.getContext();
  DESENHO.forEach((linha, y) =>
    [...linha].forEach((c, x) => {
      if (c === '.') return;
      ctx.fillStyle = CORES[c];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  tex.refresh();
}

interface Gota {
  s: Phaser.Physics.Arcade.Sprite;
  /**
   * o BRILHO do sangue quente (23/11, medido no 1º filme: a gota escura sumia no vermelho do fundo, no meio da tela). Um
   * halo CARMIM fraco — a lava tem o laranja forte (`0xff6a18`, 0,6–1): este é outra luz, e a gota continua escura.
   */
  luz: Phaser.GameObjects.Image;
  respingou: boolean;
}

export class SangueTeto {
  private static readonly HALO = 0xb01818;
  private static readonly HALO_ALPHA = 0.55;
  private gotas: Gota[] = [];
  private readonly penduradas = new Map<number, Phaser.GameObjects.Image>();
  private readonly respingo: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly perigos: Phaser.Physics.Arcade.Group,
  ) {
    garantirTextura(scene);
    garantirLuzRadial(scene);
    this.respingo = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 180, max: 340 },
        speedX: { min: -40, max: 40 },
        speedY: { min: -70, max: -20 },
        accelerationY: TETO.G,
        scale: { start: 1, end: 0.4 },
        alpha: { start: 1, end: 0 },
        tint: [0x6c0c10, 0x4a080b, 0x8a1612],
        emitting: false,
      })
      .setDepth(41);
  }

  /** gotas no ar (lidas pelos testes e pelo filme) */
  get lista(): readonly Phaser.Physics.Arcade.Sprite[] {
    return this.gotas.map((g) => g.s);
  }

  get vazio(): boolean {
    return this.gotas.length === 0;
  }

  /** uma gota solta em (x, y): a ponta no teto, o bulbo para baixo */
  soltar(x: number, y: number): void {
    const s = this.perigos.create(x, y + ALTURA / 2, 'gotaSangue') as Phaser.Physics.Arcade.Sprite;
    s.setDepth(41).setData('sangueTeto', true);
    const b = s.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false);
    b.setCircle(TETO.RAIO, BULBO.x - TETO.RAIO, BULBO.y - TETO.RAIO);
    b.setVelocity(0, 0);
    b.setAccelerationY(TETO.G);
    const luz = this.scene.add
      .image(x, y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(SangueTeto.HALO)
      .setScale(0.32)
      .setAlpha(SangueTeto.HALO_ALPHA)
      .setDepth(40);
    this.gotas.push({ s, luz, respingou: false });
    this.penduradas.get(x)?.setVisible(false);
  }

  /** as penduradas esticando nos pontos (a ponta presa no teto inchado em `tetoEm(x)`) */
  pendurar(lista: readonly Pendurada[], tetoEm: (x: number) => number): void {
    const vivas = new Set(lista.map((p) => p.x));
    for (const [x, img] of this.penduradas) if (!vivas.has(x)) img.setVisible(false);
    for (const p of lista) {
      let img = this.penduradas.get(p.x);
      if (!img) {
        img = this.scene.add.image(p.x, 0, 'gotaSangue').setOrigin(0.5, 0).setDepth(41);
        this.penduradas.set(p.x, img);
      }
      // viscosa: engorda pendurada e AFINA o pescoço no fim, antes de soltar
      img
        .setVisible(true)
        .setPosition(p.x, tetoEm(p.x) - 1)
        .setScale(1 - 0.15 * p.k, 0.35 + 0.85 * p.k);
    }
  }

  /** a queda, o respingo na borda de baixo (`chaoEm`) e o fim fora da tela */
  atualizar(chaoEm: (x: number) => number): void {
    this.gotas = this.gotas.filter((g) => {
      if (!g.s.active) {
        g.luz.destroy();
        return false;
      }
      if (g.s.y > GAME_HEIGHT + 16) {
        g.s.destroy();
        g.luz.destroy();
        return false;
      }
      return true;
    });
    for (const g of this.gotas) {
      const v = (g.s.body as Phaser.Physics.Arcade.Body).velocity.y;
      // a gota caindo estica com a velocidade (viscosa: nunca vira um traço)
      g.s.setScale(1, 1 + Math.min(0.35, v / 900));
      g.luz.setPosition(g.s.x, g.s.y + 1);
      if (!g.respingou && g.s.y + BULBO.y - ALTURA / 2 >= chaoEm(g.s.x)) {
        g.respingou = true;
        this.respingo.explode(7, g.s.x, chaoEm(g.s.x));
      }
    }
  }

  /** a morte dele: as gotas no ar terminam de cair; as penduradas somem */
  soltarTudo(): void {
    for (const img of this.penduradas.values()) img.setVisible(false);
  }

  destroy(): void {
    for (const g of this.gotas) {
      if (g.s.active) g.s.destroy();
      g.luz.destroy();
    }
    this.gotas = [];
    for (const img of this.penduradas.values()) img.destroy();
    this.penduradas.clear();
    this.respingo.destroy();
  }
}
