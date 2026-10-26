import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import type { Fx } from '../Fx';
import {
  type Bitmap,
  type Pedaco,
  type Ponto,
  lasca,
  soltarLasca,
  sorte,
  ruido,
  ehChama,
  sementesEspalhadas,
  sementesNoEixo,
  partir,
  temposDeQueima,
  RAMPA_FOGO,
  RAMPA_BIO,
  corDaRampa,
  queimar,
  bayer,
  canais,
  rgba,
} from './pedacos';
import { MORTE, type EstiloMorte } from './numerosMorte';

/**
 * THE SHIP'S DEATH (26/10). Until now the ship died in the PixelLab fireball and vanished. His ask: *"quero que ela se
 * desintegre ... algo mais dramático quando morre"*. So the ship's own pixels are the debris: the frame on screen is read
 * back from its texture and cut (`pedacos.ts`), and every piece, ember and crack is drawn PIXEL BY PIXEL into a canvas
 * at the native 384×216 — no vector strokes, no smooth gradients (`efeito-de-cena-assado-em-pixel`). The fire steps
 * through the PixelLab explosion's own palette; the manta goes out in its bioluminescence.
 *
 * Three styles (`numerosMorte.ts`): A shatters, B burns away into embers, C tumbles and breaks in big parts. Each ship
 * has its own (`estiloDaNave`).
 *
 * THE HULL LOSS (`golpe`): a life lost that is not the last. One bite off the hull's edge flies off in the same style,
 * small, and the ship flies on; the hull body stays, following the ship, as the anchor of the scar drawn over the sprite.
 *
 * The scene drives it: `update(dt, escala)` with the dt already scaled by the slow motion, and `aoClimax` tells the
 * scene when to start that slow motion. Everything is a function of the accumulated `t`, so the stepped clock of the
 * films sees exactly what the player sees (no tweens).
 */

export interface OpcoesMorte {
  estilo: EstiloMorte;
  material: 'metal' | 'bio';
  /** the F1: gravity and air */
  atmosfera: boolean;
  /** nothing is drawn below this y (the F1 ground hides what falls behind it) */
  chao?: number;
  fx: Fx;
  semente?: number;
  /** the big moment (the shatter, the first burn, the break-up): the scene starts its slow motion here */
  aoClimax?: () => void;
  /** a life lost, not the death: one bite of the hull flies off and the ship goes on (`MORTE.golpe`) */
  golpe?: boolean;
}

/** A rigid piece in the world: its bitmap, the pivot inside it, where it is and how it moves. */
interface Corpo {
  bmp: Bitmap;
  corte: Uint8Array;
  /** the pivot (centroid) in the bitmap's coordinates */
  ox: number;
  oy: number;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  w: number;
  n: number;
  /** when it starts going away, and over how long (dithered, pixel by pixel) */
  some: number;
  someEm: number;
  /** when its cut opened (the heat counts from here) */
  t0: number;
  /** pixels on the cut, for the embers it sheds */
  bordas: number[];
  fumaca: boolean;
  motor: boolean;
}

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

/** A full-screen pixel canvas: the debris layer, or the glow layer on top of it (additive). */
class Tela {
  readonly px: Uint32Array;
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly dados: ImageData;
  private readonly img: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, readonly chave: string, depth: number, aditiva: boolean) {
    this.tex = scene.textures.createCanvas(chave, W, H)!;
    this.dados = this.tex.context.createImageData(W, H);
    this.px = new Uint32Array(this.dados.data.buffer);
    this.img = scene.add.image(0, 0, chave).setOrigin(0, 0).setDepth(depth);
    if (aditiva) this.img.setBlendMode(Phaser.BlendModes.ADD);
  }

  enviar(): void {
    this.tex.context.putImageData(this.dados, 0, 0);
    this.tex.refresh();
  }

  destroy(): void {
    this.img.destroy();
    this.scene.textures.remove(this.chave);
  }
}

/** The embers, ash and chips: flat arrays (a death throws over a thousand of them). */
class Brasas {
  n = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly idade: Float32Array;
  readonly vida: Float32Array;
  readonly h0: Float32Array;
  readonly limiar: Float32Array;
  readonly cor: Uint32Array;
  /** 0 = ember (cools through the ramp and is gone), 1 = ash (cools to the charred hull colour and lingers) */
  readonly tipo: Uint8Array;

  constructor(readonly cap: number) {
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.idade = new Float32Array(cap);
    this.vida = new Float32Array(cap);
    this.h0 = new Float32Array(cap);
    this.limiar = new Float32Array(cap);
    this.cor = new Uint32Array(cap);
    this.tipo = new Uint8Array(cap);
  }

  add(x: number, y: number, vx: number, vy: number, vida: number, h0: number, cor: number, tipo: number, limiar: number): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.idade[i] = 0;
    this.vida[i] = vida;
    this.h0[i] = h0;
    this.cor[i] = cor;
    this.tipo[i] = tipo;
    this.limiar[i] = limiar;
  }

  passo(dt: number, ax: number, ay: number, arrasto: number): void {
    const freio = Math.max(0, 1 - arrasto * dt);
    for (let i = 0; i < this.n; i++) {
      this.idade[i] += dt;
      if (this.idade[i] >= this.vida[i]) {
        this.tirar(i);
        i--;
        continue;
      }
      this.vx[i] = this.vx[i] * freio + ax * dt;
      this.vy[i] = this.vy[i] * freio + ay * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }

  private tirar(i: number): void {
    const u = --this.n;
    if (i === u) return;
    this.x[i] = this.x[u];
    this.y[i] = this.y[u];
    this.vx[i] = this.vx[u];
    this.vy[i] = this.vy[u];
    this.idade[i] = this.idade[u];
    this.vida[i] = this.vida[u];
    this.h0[i] = this.h0[u];
    this.cor[i] = this.cor[u];
    this.tipo[i] = this.tipo[u];
    this.limiar[i] = this.limiar[u];
  }
}

/** The smoke puffs, drawn as pixel discs (see `desenharFumos`). */
class Fumos {
  n = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly idade: Float32Array;
  readonly vida: Float32Array;
  readonly r0: Float32Array;
  readonly r1: Float32Array;

  constructor(readonly cap: number) {
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.idade = new Float32Array(cap);
    this.vida = new Float32Array(cap);
    this.r0 = new Float32Array(cap);
    this.r1 = new Float32Array(cap);
  }

  add(x: number, y: number, vx: number, vy: number, vida: number, r0: number, r1: number): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.idade[i] = 0;
    this.vida[i] = vida;
    this.r0[i] = r0;
    this.r1[i] = r1;
  }

  passo(dt: number, ax: number, ay: number, arrasto: number): void {
    const freio = Math.max(0, 1 - arrasto * dt);
    for (let i = 0; i < this.n; i++) {
      this.idade[i] += dt;
      if (this.idade[i] >= this.vida[i]) {
        const u = --this.n;
        for (const a of [this.x, this.y, this.vx, this.vy, this.idade, this.vida, this.r0, this.r1]) a[i] = a[u];
        i--;
        continue;
      }
      this.vx[i] = this.vx[i] * freio + ax * dt;
      this.vy[i] = this.vy[i] * freio + ay * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }
}

let serie = 0;

/** The frame the ship shows right now, read back from its texture. */
function lerQuadro(nave: Phaser.GameObjects.Sprite): Bitmap {
  const f = nave.frame;
  const cv = document.createElement('canvas');
  cv.width = f.cutWidth;
  cv.height = f.cutHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const d = ctx.getImageData(0, 0, cv.width, cv.height);
  return { w: cv.width, h: cv.height, cor: new Uint32Array(d.data.buffer.slice(0)) };
}

export class MorteDaNave {
  /** game seconds until the GAME OVER can come */
  readonly duracao: number;
  private t = 0;
  private readonly rnd: () => number;
  private readonly rampa: number[];
  private readonly tela: Tela;
  private readonly brilho: Tela;
  /** the smoke, under the fireball and the debris */
  private readonly fumo: Tela;
  private readonly fumos = new Fumos(400);
  /** the smoke's two tones: the core and the rim */
  private readonly corFumo: [number, number];
  private readonly brasas = new Brasas(2600);
  private readonly depth: number;
  private corpos: Corpo[] = [];
  /** the whole hull, while it is still whole (B, and C before the break) */
  private casco: Corpo | null = null;
  /** the exhaust flame's pixels, in the hull's bitmap (C keeps it coughing until the break) */
  private chama: { i: number; j: number; cor: number }[] = [];
  /** B: when each hull pixel burns, and the pixels in that order */
  private tempos: Float32Array | null = null;
  private ordem: number[] = [];
  private proximo = 0;
  /** C: the burn marks of the pops, in the hull's bitmap */
  private manchas: { u: number; v: number; t0: number }[] = [];
  private estalos: number[] = [];
  private partiu = false;
  private relogioFumaca = 0;
  private acabou = false;
  private readonly ax: number;
  private readonly g: number;
  private readonly arrasto: number;
  /** golpe: the bite (2) and its rim (1), per hull pixel, and where it was bitten */
  private cicatriz: Uint8Array | null = null;
  private mordida: Ponto | null = null;
  /** golpe: the ship's frames, read once each (the scar is drawn on the frame on screen: the manta's fins move) */
  private readonly quadros = new Map<string, Bitmap>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly nave: Phaser.GameObjects.Sprite,
    private readonly o: OpcoesMorte,
  ) {
    this.rnd = sorte(o.semente ?? Math.floor(Math.random() * 1e9));
    this.rampa = o.material === 'bio' ? RAMPA_BIO : RAMPA_FOGO;
    this.depth = nave.depth + 0.02;
    const k = serie++;
    this.fumo = new Tela(scene, `morte-fumo-${k}`, this.depth - 0.06, false);
    this.tela = new Tela(scene, `morte-tela-${k}`, this.depth, false);
    this.brilho = new Tela(scene, `morte-brilho-${k}`, this.depth + 0.01, true);
    // the last life's smoke tones (`GameScene.fumaca`); the manta's are her dark teal
    this.corFumo = o.material === 'bio' ? [rgba(0x26, 0x4a, 0x4c), rgba(0x18, 0x30, 0x32)] : [rgba(0x4a, 0x52, 0x66), rgba(0x33, 0x3a, 0x4d)];
    const M = MORTE.mundo;
    this.ax = o.atmosfera ? M.deriva.atmosfera * 0.6 : M.deriva.vacuo * 0.4;
    this.g = o.atmosfera ? M.gravidade : 0;
    this.arrasto = o.atmosfera ? M.arrasto.atmosfera : M.arrasto.vacuo;

    const quadro = lerQuadro(nave);
    const corpo = (nave.body as Phaser.Physics.Arcade.Body | null) ?? null;
    const vx = (corpo?.velocity.x ?? 0) * M.herda + (o.atmosfera ? M.deriva.atmosfera : M.deriva.vacuo);
    const vy = (corpo?.velocity.y ?? 0) * M.herda;

    // The flame is not hull: out of the bitmap, into a list.
    const casco: Bitmap = { w: quadro.w, h: quadro.h, cor: quadro.cor.slice() };
    for (let j = 0; j < quadro.h; j++) {
      for (let i = 0; i < quadro.w; i++) {
        const c = quadro.cor[j * quadro.w + i];
        if (!ehChama(c, i)) continue;
        this.chama.push({ i, j, cor: c });
        casco.cor[j * quadro.w + i] = 0;
      }
    }
    // A hull of the whole ship (pivot at the sprite's origin), to start from.
    this.casco = {
      bmp: casco,
      corte: new Uint8Array(casco.w * casco.h),
      ox: nave.originX * casco.w,
      oy: nave.originY * casco.h,
      x: nave.x,
      y: nave.y,
      ang: nave.rotation,
      vx,
      vy,
      w: 0,
      n: casco.cor.filter((c) => c >>> 24 >= 128).length,
      some: Infinity,
      someEm: 1,
      t0: 0,
      bordas: [],
      fumaca: true,
      motor: false,
    };

    this.duracao = o.golpe ? MORTE.golpe.duracao : MORTE[o.estilo].duracao + MORTE.folga;
    if (o.golpe) this.iniciarGolpe();
    else if (o.estilo === 'estilhacos') this.iniciarEstilhacos();
    else if (o.estilo === 'desintegra') this.iniciarDesintegra();
    else this.iniciarRuptura();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    // golpe: the scar is drawn right before the render — the physics moves the ship AFTER the scene's update, and a scar
    // drawn in the update would trail it by a frame (3 px at full flap speed).
    if (o.golpe) scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.antesDoQuadro, this);
  }

  private antesDoQuadro(): void {
    if (this.acabou) return;
    this.seguirNave();
    this.desenhar();
  }

  // ─── the three styles ─────────────────────────────────────────────────────────────────────────────────────────────

  /** A: the hull flashes white and shatters at once, out of a small fireball. */
  private iniciarEstilhacos(): void {
    const E = MORTE.estilhacos;
    const c = this.casco!;
    this.soltarChama(c, 1);
    const torto = ruido(c.bmp.w, c.bmp.h, 4, this.rnd);
    const pedacos = partir(c.bmp, sementesEspalhadas(c.bmp, E.pedacos, E.distMin, this.rnd), torto, E.torto);
    // the blast's centre: a little behind the middle (the engine goes first)
    const cx = c.x - Math.cos(c.ang) * 4, cy = c.y - Math.sin(c.ang) * 4;
    for (const p of pedacos) {
      const r = this.corpoDe(c, p, E.clarao);
      if (!r) continue;
      const dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(E.vel) * (1 + 2.5 / Math.sqrt(p.n));
      r.vx = c.vx + (dx / d) * v + (this.rnd() - 0.5) * 18;
      r.vy = c.vy + (dy / d) * v + (this.rnd() - 0.5) * 18;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(E.giro) * Math.min(1.6, 3 / Math.sqrt(p.n));
      r.some = this.entre(E.somem);
      r.someEm = E.someEm;
      r.fumaca = p.n >= E.fumacaMin;
      this.corpos.push(r);
    }
    this.casco = null;
    this.estouro('explosion', cx, cy, E.bola, E.abalo, false);
    this.clarao();
    this.o.aoClimax?.();
  }

  /**
   * A blast: the PixelLab sheet (behind the debris, or in front for the small pops) and its sparks and shake. THE MANTA
   * DOES NOT BURN: a fireball would put orange fire around her cyan debris, so she DISCHARGES — the electric death the
   * game already gives the jellyfish (`Fx.choque`: arcs, a shock ring, cold sparks), with the same shake.
   */
  private estouro(folha: 'explosion' | 'explosion-small', x: number, y: number, escala: number, abalo: number, frente: boolean): void {
    if (this.o.material === 'bio') {
      this.o.fx.choque(x, y, escala * (folha === 'explosion' ? 1.6 : 0.7));
      this.scene.cameras.main.shake(90 * abalo, 0.004 * abalo);
      return;
    }
    const tex = folha === 'explosion' ? 'explosionSheet' : 'explosionSmallSheet';
    this.o.fx.sheetSprite(folha, tex, x, y, escala, this.depth + (frente ? 0.03 : -0.03));
    this.o.fx.abalo(x, y, abalo);
  }

  /** The one camera flash of the death (`MORTE.clarao`). */
  private clarao(): void {
    const { ms, cor } = MORTE.clarao;
    this.scene.cameras.main.flash(ms, cor[0], cor[1], cor[2]);
  }

  /** B: a small hit at the engine, and the burning front starts eating the hull. */
  private iniciarDesintegra(): void {
    const E = MORTE.desintegra;
    const c = this.casco!;
    c.w = (this.rnd() - 0.5) * 0.5;
    this.soltarChama(c, 1);
    const torto = ruido(c.bmp.w, c.bmp.h, 4, this.rnd);
    // The front leaves the ENGINE: the leftmost quarter of the hull, at its mean height.
    const origem = this.pontoDoCasco(c, 0.22);
    this.tempos = temposDeQueima(c.bmp, origem, E.queima, torto, E.torto);
    this.ordem = [...this.tempos.keys()].filter((i) => Number.isFinite(this.tempos![i])).sort((a, b) => this.tempos![a] - this.tempos![b]);
    const [wx, wy] = this.noMundo(c, origem.x - 0.5, origem.y - 0.5);
    this.estouro('explosion-small', wx, wy, 0.7, E.abalo, true);
    this.clarao();
    this.o.aoClimax?.();
  }

  /** C: the first pop is the hit; the hull tumbles, pops twice more, and breaks at `partirEm`. */
  private iniciarRuptura(): void {
    this.estalos = [...MORTE.ruptura.estalos];
  }

  /**
   * A LIFE LOST: one bite off the hull's edge (`lasca`), the same size on every hit, in the ship's death style — C pops
   * and the chunk tumbles off, A flashes white and pops into shards, B burns the bite away into embers. The hull body
   * stays (never drawn whole: the sprite is still there) and follows the ship; the scar is drawn over it.
   */
  private iniciarGolpe(): void {
    const G = MORTE.golpe;
    const c = this.casco!;
    this.seguirNave();
    const torto = ruido(c.bmp.w, c.bmp.h, 3, this.rnd);
    const l = lasca(c.bmp, G.faixa, G.pixels, torto, G.torto, this.rnd);
    if (!l) return;
    this.cicatriz = l.mascara;
    this.mordida = l.centro;
    const [wx, wy] = this.noMundo(c, l.centro.x - 0.5, l.centro.y - 0.5);
    // out of the hull: from the ship's pivot through the bite
    const [px, py] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    const d = Math.hypot(wx - px, wy - py) || 1;
    const sx = (wx - px) / d, sy = (wy - py) / d;

    if (this.o.estilo === 'desintegra') {
      const E = G.desintegra;
      const soBite: Bitmap = { w: c.bmp.w, h: c.bmp.h, cor: c.bmp.cor.map((cor, k) => (l.mascara[k] === 2 ? cor : 0)) };
      this.tempos = temposDeQueima(soBite, l.centro, E.queima, torto, 1.5);
      this.ordem = [...this.tempos.keys()].filter((i) => Number.isFinite(this.tempos![i])).sort((a, b) => this.tempos![a] - this.tempos![b]);
      this.estouro('explosion-small', wx, wy, E.estouro, E.abalo, true);
      return;
    }

    const ruptura = this.o.estilo === 'ruptura';
    const E = ruptura ? G.ruptura : G.estilhacos;
    const soBite: Bitmap = { w: c.bmp.w, h: c.bmp.h, cor: c.bmp.cor.map((cor, k) => (l.mascara[k] === 2 ? cor : 0)) };
    const sementes = sementesEspalhadas(soBite, E.partes, 2, this.rnd);
    // A: the pieces hold still (white) for the flash, then fly
    const t0 = ruptura ? 0 : G.estilhacos.clarao;
    for (const p of soltarLasca(c.bmp, l.mascara, sementes, torto, 1.5)) {
      const r = this.corpoDe(c, p, t0);
      if (!r) continue;
      const v = this.entre(G.vel) * (ruptura ? 1 : 1.25);
      const a = (this.rnd() - 0.5) * (ruptura ? 0.7 : 1.3);
      const ux = sx * Math.cos(a) - sy * Math.sin(a), uy = sx * Math.sin(a) + sy * Math.cos(a);
      r.vx = c.vx + ux * v;
      r.vy = c.vy + uy * v;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(G.giro);
      r.some = this.entre(G.somem);
      r.someEm = G.someEm;
      r.fumaca = ruptura && p.n >= 8;
      if (ruptura) {
        // chips off the torn edge, as in the break-up
        for (let k = 0; k < r.bmp.cor.length; k++) {
          if (r.corte[k] !== 2 || this.rnd() > G.ruptura.lascas) continue;
          const [cx, cy] = this.noMundo(r, k % r.bmp.w, Math.floor(k / r.bmp.w));
          const b = Math.atan2(uy, ux) + (this.rnd() - 0.5) * 1.4, vv = 40 + this.rnd() * 40;
          this.brasas.add(cx, cy, c.vx + Math.cos(b) * vv, c.vy + Math.sin(b) * vv, 0.4 + this.rnd() * 0.4, 0.85, r.bmp.cor[k], 1, this.rnd());
          r.bmp.cor[k] = 0;
        }
      }
      this.corpos.push(r);
    }
    // sparks out of the wound
    for (let n = 0; n < 8; n++) {
      const b = Math.atan2(sy, sx) + (this.rnd() - 0.5) * 2, vv = 30 + this.rnd() * 50;
      this.brasas.add(wx, wy, c.vx + Math.cos(b) * vv, c.vy + Math.sin(b) * vv, 0.2 + this.rnd() * 0.3, 1, 0, 0, this.rnd());
    }
    // behind the ship: the bite and the piece read in front of the flash
    this.estouro('explosion-small', wx, wy, E.estouro, E.abalo, false);
  }

  /** golpe: the hull body rides on the ship (where it is, how it tilts, how fast it goes). */
  private seguirNave(): void {
    const c = this.casco;
    if (!c) return;
    const M = MORTE.mundo;
    const corpo = this.nave.body as Phaser.Physics.Arcade.Body | null;
    c.x = this.nave.x;
    c.y = this.nave.y;
    c.ang = this.nave.rotation;
    c.vx = (corpo?.velocity.x ?? 0) * M.herda + (this.o.atmosfera ? M.deriva.atmosfera : M.deriva.vacuo);
    c.vy = (corpo?.velocity.y ?? 0) * M.herda;
  }

  private estalar(k: number): void {
    const c = this.casco!;
    // tail, middle, nose: a random hull pixel in that third
    const terco = [0.12, 0.45, 0.78][Math.min(2, k)];
    const p = this.pixelDoCasco(c, terco, terco + 0.22);
    if (!p) return;
    this.manchas.push({ u: p.x, v: p.y, t0: this.t });
    const [wx, wy] = this.noMundo(c, p.x, p.y);
    this.estouro('explosion-small', wx, wy, 0.62, k === 0 ? 1.1 : 0.7, true);
    for (let n = 0; n < 10; n++) {
      const a = this.rnd() * Math.PI * 2, v = 20 + this.rnd() * 45;
      this.brasas.add(wx, wy, c.vx + Math.cos(a) * v, c.vy + Math.sin(a) * v, 0.25 + this.rnd() * 0.4, 1, 0, 0, this.rnd());
    }
  }

  private partir(): void {
    const E = MORTE.ruptura;
    const c = this.casco!;
    this.partiu = true;
    // The pops' burns are baked into the pieces: what breaks is the damaged hull.
    const bmp: Bitmap = { w: c.bmp.w, h: c.bmp.h, cor: c.bmp.cor.map((cor, k) => (cor ? this.corDoCascoRuptura(k, cor).cor : 0)) };
    const torto = ruido(bmp.w, bmp.h, 4, this.rnd);
    const pedacos = partir(bmp, sementesNoEixo(bmp, this.rnd), torto, E.torto);
    // the piece that kept the engine: the one whose centroid sits furthest back
    let motor: Corpo | null = null, motorCx = Infinity;
    for (const p of pedacos) {
      const r = this.corpoDe(c, p, this.t);
      if (!r) continue;
      const dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(E.vel);
      r.vx = c.vx + (dx / d) * v + (this.rnd() - 0.5) * 10;
      r.vy = c.vy + (dy / d) * v + (this.rnd() - 0.5) * 10;
      r.w = c.w * 0.5 + (this.rnd() - 0.5) * 2 * this.entre(E.giro);
      r.some = this.entre(E.somem);
      r.someEm = E.someEm;
      r.fumaca = p.n >= 14;
      if (p.cx < motorCx) {
        motor = r;
        motorCx = p.cx;
      }
      // chips: some pixels on the cut fly off on their own
      for (let k = 0; k < r.bmp.cor.length; k++) {
        if (r.corte[k] !== 2 || this.rnd() > E.lascas) continue;
        const [wx, wy] = this.noMundo(r, k % r.bmp.w, Math.floor(k / r.bmp.w));
        const a = Math.atan2(wy - c.y, wx - c.x) + (this.rnd() - 0.5) * 1.2, vv = 45 + this.rnd() * 55;
        this.brasas.add(wx, wy, c.vx + Math.cos(a) * vv, c.vy + Math.sin(a) * vv, 0.5 + this.rnd() * 0.7, 0.85, r.bmp.cor[k], 1, this.rnd());
        r.bmp.cor[k] = 0;
      }
      this.corpos.push(r);
    }
    if (motor) motor.motor = true;
    this.soltarChama(c, 1);
    this.chama = [];
    this.casco = null;
    this.estouro('explosion', c.x, c.y, E.bola, E.abalo, false);
    this.clarao();
    this.o.aoClimax?.();
  }

  // ─── the clock ────────────────────────────────────────────────────────────────────────────────────────────────────

  /** `dt` in game seconds, already slowed by the slow motion (everything here runs on it, the smoke included). */
  update(dt: number): void {
    if (this.acabou) return;
    this.t += dt;
    const ay = this.g;
    const freio = Math.max(0, 1 - this.arrasto * dt);
    const mover = (c: Corpo): void => {
      c.vx = c.vx * freio + this.ax * dt;
      c.vy = c.vy * freio + ay * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ang += c.w * dt;
    };

    if (this.o.golpe) this.seguirNave();
    if (this.o.estilo === 'desintegra') this.queimarAte();
    if (!this.o.golpe && this.o.estilo === 'ruptura' && !this.partiu) {
      const E = MORTE.ruptura;
      while (this.estalos.length && this.estalos[0] <= this.t) {
        this.estalar(E.estalos.length - this.estalos.length);
        this.estalos.shift();
      }
      const c = this.casco!;
      // the tumble speeds up towards the break, nose down
      const u = Math.min(1, this.t / E.partirEm);
      c.w = E.giroMax * u * u * (3 - 2 * u);
      if (this.t >= E.partirEm) this.partir();
    }
    if (this.casco && !this.o.golpe) mover(this.casco);
    for (const c of this.corpos) mover(c);
    this.brasas.passo(dt, this.ax * 0.5, this.g * MORTE.mundo.gravidadeBrasa + (this.o.atmosfera ? -30 : 0), this.arrasto * 1.6);
    // smoke is lighter still: it rises in the air, and lags behind in both
    this.fumos.passo(dt, this.ax * 0.8, this.o.atmosfera ? -18 : 0, 1.2);

    this.soltarBrasasEFumaca(dt);
    if (!this.o.golpe) this.desenhar();
  }

  /** B: every pixel whose time came lets go as an ember (or as ash). */
  private queimarAte(): void {
    const E = MORTE.desintegra;
    const c = this.casco;
    if (!c || !this.tempos) return;
    const [ox, oy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    while (this.proximo < this.ordem.length && this.tempos[this.ordem[this.proximo]] <= this.t) {
      const k = this.ordem[this.proximo++];
      const i = k % c.bmp.w, j = Math.floor(k / c.bmp.w);
      const [wx, wy] = this.noMundo(c, i, j);
      const dx = wx - ox, dy = wy - oy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(E.vel);
      const cinza = this.rnd() < E.cinza;
      this.brasas.add(
        wx,
        wy,
        c.vx + (dx / d) * v - E.recuo + (this.rnd() - 0.5) * 10,
        c.vy + (dy / d) * v + (this.rnd() - 0.5) * 10,
        cinza ? this.entre(E.vidaCinza) : this.entre(E.vida),
        cinza ? 0.55 : E.calorBrasa,
        c.bmp.cor[k],
        cinza ? 1 : 0,
        this.rnd(),
      );
    }
    // (the golpe keeps its hull: it is the ship's, and the scar rides on it)
    if (this.proximo >= this.ordem.length && !this.o.golpe) this.casco = null;
  }

  private soltarBrasasEFumaca(dt: number): void {
    this.relogioFumaca -= dt;
    const fumacaAgora = this.relogioFumaca <= 0;
    if (fumacaAgora) this.relogioFumaca = MORTE.fumaca.cada;

    // The hull while whole: smoke from the burns (C) or from the front (B).
    const c = this.casco;
    if (c && fumacaAgora && this.o.golpe) {
      // C: the bite smokes a moment (the ship's engine is fine — no coughing here)
      if (this.o.estilo === 'ruptura' && this.mordida && this.t < MORTE.golpe.ruptura.fumaca) {
        const [wx, wy] = this.noMundo(c, this.mordida.x - 0.5, this.mordida.y - 0.5);
        this.soltarFumo(wx, wy, c.vx, c.vy);
      }
    } else if (c && fumacaAgora) {
      if (this.o.estilo === 'ruptura') {
        for (const m of this.manchas) {
          const [wx, wy] = this.noMundo(c, m.u, m.v);
          this.soltarFumo(wx, wy, c.vx, c.vy);
        }
        // the engine coughs (sparks out of the nozzle), as in the damaged-ship smoke of the last life
        if (this.rnd() < 0.5) {
          const p = this.pixelDoCasco(c, 0, 0.12);
          if (p) {
            const [wx, wy] = this.noMundo(c, p.x, p.y);
            this.brasas.add(wx, wy, c.vx - 30 - this.rnd() * 30, c.vy + (this.rnd() - 0.5) * 20, 0.2 + this.rnd() * 0.25, 1, 0, 0, 0);
          }
        }
      } else if (this.o.estilo === 'desintegra' && this.tempos) {
        // a pixel on the front right now
        for (let n = 0; n < 2; n++) {
          const k = this.ordem[Math.min(this.ordem.length - 1, this.proximo + Math.floor(this.rnd() * 12))];
          if (k === undefined) break;
          const [wx, wy] = this.noMundo(c, k % c.bmp.w, Math.floor(k / c.bmp.w));
          this.soltarFumo(wx, wy, c.vx, c.vy);
        }
      }
    }

    // The pieces: smoke trails while hot, embers shed from the cracks, the engine piece sputtering.
    for (const p of this.corpos) {
      const idade = this.t - p.t0;
      const calor = Math.max(0, 1 - idade / (this.o.estilo === 'ruptura' ? MORTE.ruptura.calor : MORTE.estilhacos.calor));
      if (this.t > p.some) continue;
      if (fumacaAgora && p.fumaca && idade < 1.3) this.soltarFumo(p.x, p.y, p.vx, p.vy);
      const taxa = (p.motor ? 26 : 14) * (p.motor ? Math.max(0.4, calor) : calor) * Math.min(1, p.n / 30);
      if (p.bordas.length && this.rnd() < taxa * dt) {
        const k = p.bordas[Math.floor(this.rnd() * p.bordas.length)];
        const [wx, wy] = this.noMundo(p, k % p.bmp.w, Math.floor(k / p.bmp.w));
        this.brasas.add(wx, wy, p.vx * 0.6 + (this.rnd() - 0.5) * 24, p.vy * 0.6 + (this.rnd() - 0.5) * 24, 0.25 + this.rnd() * 0.45, 0.95, 0, 0, this.rnd());
      }
      if (p.motor && fumacaAgora && idade < 1.6) this.soltarFumo(p.x, p.y, p.vx, p.vy);
    }
  }

  /** A smoke puff where a body is, keeping a little of its speed. */
  private soltarFumo(x: number, y: number, vx: number, vy: number): void {
    const F = MORTE.fumaca;
    this.fumos.add(
      x + (this.rnd() - 0.5) * 2,
      y + (this.rnd() - 0.5) * 2,
      vx * 0.3 - 6 - this.rnd() * 14,
      vy * 0.3 + (this.o.atmosfera ? -6 - this.rnd() * 14 : (this.rnd() - 0.5) * 12),
      this.entre(F.vida),
      F.raio[0],
      F.raio[1] * (0.8 + this.rnd() * 0.4),
    );
  }

  /**
   * The smoke: each puff a pixel disc that grows and thins. Three steps of opacity, not a gradient, and the core a
   * shade lighter than the rim; where puffs overlap the denser wins (no doubling into a black blob).
   */
  private desenharFumos(): void {
    const f = this.fumos;
    const [nucleo, borda] = this.corFumo;
    const D = MORTE.fumaca.densidade;
    for (let n = 0; n < f.n; n++) {
      const k = f.idade[n] / f.vida[n];
      const r = f.r0[n] + (f.r1[n] - f.r0[n]) * Math.sqrt(k);
      const dens = D * (1 - k) * Math.min(1, k * 8 + 0.4);
      const cx = f.x[n], cy = f.y[n];
      const R = Math.ceil(r);
      for (let Y = Math.floor(cy) - R; Y <= Math.floor(cy) + R; Y++) {
        if (Y < 0 || Y >= H || (this.o.chao !== undefined && Y >= this.o.chao)) continue;
        for (let X = Math.floor(cx) - R; X <= Math.floor(cx) + R; X++) {
          if (X < 0 || X >= W) continue;
          const q = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy) / r;
          if (q > 1) continue;
          const a = dens * (1 - q * q * 0.7);
          const passo = a > 0.42 ? 0.62 : a > 0.24 ? 0.42 : a > 0.1 ? 0.22 : 0;
          if (!passo) continue;
          const i = Y * W + X;
          const alfa = Math.round(passo * 255);
          if (this.fumo.px[i] >>> 24 >= alfa) continue;
          this.fumo.px[i] = ((q < 0.5 ? nucleo : borda) & 0xffffff) | (alfa << 24);
        }
      }
    }
  }

  // ─── drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────

  private desenhar(): void {
    this.tela.px.fill(0);
    this.brilho.px.fill(0);
    this.fumo.px.fill(0);
    this.desenharFumos();
    this.fumo.enviar();
    const c = this.casco;
    if (this.o.golpe) this.desenharCicatriz();
    else if (c) {
      // the dying hull trembles (B, C): one pixel, every frame
      const tx = Math.round((this.rnd() - 0.5) * 2), ty = Math.round((this.rnd() - 0.5) * 2);
      if (this.o.estilo === 'desintegra') this.desenharCorpo(c, (k, cor, X, Y) => this.corDesintegra(k, cor, X, Y), tx, ty);
      else this.desenharCorpo(c, (k, cor, X, Y) => this.corRuptura(k, cor, X, Y), tx, ty);
      if (this.o.estilo === 'ruptura') this.desenharChama(c, tx, ty);
    }
    for (const p of this.corpos) this.desenharCorpo(p, (k, cor, X, Y, i, j) => this.corPedaco(p, k, cor, X, Y, i, j));
    this.desenharBrasas();
    this.tela.enviar();
    this.brilho.enviar();
  }

  private desenharCorpo(
    c: Corpo,
    tingir: (k: number, cor: number, X: number, Y: number, i: number, j: number) => number,
    tx = 0,
    ty = 0,
  ): void {
    const cos = Math.cos(-c.ang), sin = Math.sin(-c.ang);
    const r = Math.ceil(Math.hypot(Math.max(c.ox, c.bmp.w - c.ox), Math.max(c.oy, c.bmp.h - c.oy))) + 1;
    const x = c.x + tx, y = c.y + ty;
    const X0 = Math.floor(x) - r, Y0 = Math.floor(y) - r;
    for (let Y = Y0; Y <= Y0 + 2 * r; Y++) {
      if (Y < 0 || Y >= H || (this.o.chao !== undefined && Y >= this.o.chao)) continue;
      for (let X = X0; X <= X0 + 2 * r; X++) {
        if (X < 0 || X >= W) continue;
        const dx = X + 0.5 - x, dy = Y + 0.5 - y;
        const i = Math.floor(cos * dx - sin * dy + c.ox), j = Math.floor(sin * dx + cos * dy + c.oy);
        if (i < 0 || j < 0 || i >= c.bmp.w || j >= c.bmp.h) continue;
        const k = j * c.bmp.w + i;
        const cor0 = c.bmp.cor[k];
        if (cor0 >>> 24 < 128) continue;
        const cor = tingir(k, cor0, X, Y, i, j);
        if (cor) this.tela.px[Y * W + X] = cor;
      }
    }
  }

  /** A piece's pixel: white in the flash, hot along the crack, charring inside, going away in dither. */
  private corPedaco(p: Corpo, k: number, cor: number, X: number, Y: number, i: number, j: number): number {
    if (this.t > p.some && bayer(i, j) < (this.t - p.some) / p.someEm) return 0;
    if (this.t < p.t0) {
      // A: the white-hot flash, the whole hull
      this.luz(X, Y, this.rampa[this.rampa.length - 1], 0.5);
      return this.rampa[this.rampa.length - 1];
    }
    const idade = this.t - p.t0;
    const dur = this.o.estilo === 'ruptura' ? MORTE.ruptura.calor : MORTE.estilhacos.calor;
    const corte = p.corte[k];
    // The crack itself (1 px) is the hot line; the pixel behind it only glows for a moment. The rest is HULL — the 1st
    // film heated both rows and the shards read as lit outlines, not as pieces of the ship.
    const calor = corte === 2 ? 0.95 * (1 - idade / dur) : corte === 1 ? 0.5 * (1 - idade / (dur * 0.4)) : 0;
    if (calor >= 0.3) {
      const c = corDaRampa(this.rampa, calor);
      if (calor >= 0.55) this.luz(X, Y, c, (calor - 0.35) * 0.8);
      return c;
    }
    const carvao = corte === 2 ? 0.7 : this.o.estilo === 'estilhacos' ? Math.min(0.5, idade / MORTE.estilhacos.carvao) : 0;
    return queimar(cor, carvao);
  }

  /** B: the hull pixel before its time — scorched as the front nears, glowing on the front. */
  private corDesintegra(k: number, cor: number, X: number, Y: number): number {
    const E = MORTE.desintegra;
    const d = this.tempos![k] - this.t;
    if (d <= 0) return 0;
    if (d < E.borda) {
      const calor = 0.4 + 0.6 * (1 - d / E.borda);
      const c = corDaRampa(this.rampa, calor);
      this.luz(X, Y, c, calor * 0.8);
      return c;
    }
    if (d < E.borda * 2.4) return queimar(cor, 0.45);
    return cor;
  }

  private corDoCascoRuptura(k: number, cor: number): { cor: number; calor: number } {
    const c = this.casco!;
    const i = k % c.bmp.w, j = Math.floor(k / c.bmp.w);
    let calor = 0, carvao = 0;
    for (const m of this.manchas) {
      const d = Math.hypot(i + 0.5 - m.u - 0.5, j + 0.5 - m.v - 0.5);
      if (d < 3.4) {
        carvao = 1;
        calor = Math.max(calor, (1 - (this.t - m.t0) / 0.55) * (1 - d / 3.4) * 1.3);
      } else if (d < 5.2) carvao = Math.max(carvao, 0.4);
    }
    return { cor: queimar(cor, carvao), calor };
  }

  /** C: the whole hull before the break — the pops' burns glowing and charring. */
  private corRuptura(k: number, cor: number, X: number, Y: number): number {
    const r = this.corDoCascoRuptura(k, cor);
    if (r.calor >= 0.3) {
      const c = corDaRampa(this.rampa, Math.min(1, r.calor));
      this.luz(X, Y, c, Math.min(1, r.calor) * 0.8);
      return c;
    }
    return r.cor;
  }

  /**
   * golpe: THE SCAR, over the ship — the bite a dark hole, its rim glowing a moment and then charred — while the
   * i-frames last, then gone pixel by pixel. Drawn on the frame on screen and only when the ship is (it blinks).
   */
  private desenharCicatriz(): void {
    const c = this.casco, G = MORTE.golpe;
    if (!c || !this.cicatriz || !this.nave.visible || this.t > G.cicatriz + G.cicatrizSome) return;
    const q = this.quadroAtual();
    if (q.w !== c.bmp.w || q.h !== c.bmp.h) return;
    this.desenharCorpo({ ...c, bmp: q }, (k, cor, X, Y, i, j) => this.corCicatriz(k, cor, X, Y, i, j));
  }

  private corCicatriz(k: number, cor: number, X: number, Y: number, i: number, j: number): number {
    const s = this.cicatriz![k];
    if (!s || ehChama(cor, i)) return 0;
    const G = MORTE.golpe;
    if (this.t > G.cicatriz && bayer(i, j) < (this.t - G.cicatriz) / G.cicatrizSome) return 0;
    const bio = this.o.material === 'bio';
    if (s === 2) {
      // A: the bite goes white before it pops
      if (this.o.estilo === 'estilhacos' && this.t < G.estilhacos.clarao) {
        const branco = this.rampa[this.rampa.length - 1];
        this.luz(X, Y, branco, 0.5);
        return branco;
      }
      // B: before its time the pixel is still hull (the sprite shows it); on the front it glows
      if (this.tempos) {
        const d = this.tempos[k] - this.t;
        if (d > G.desintegra.borda) return 0;
        if (d > 0) {
          const calor = 0.5 + 0.5 * (1 - d / G.desintegra.borda);
          const h = corDaRampa(this.rampa, calor);
          this.luz(X, Y, h, calor * 0.8);
          return h;
        }
      }
      // the hole: the inside of the hull, almost black (the manta's, the darkest of her glow)
      return bio ? this.rampa[0] : queimar(queimar(cor, 1), 1);
    }
    // the rim: hot for a moment, then charred
    const t0 = this.o.estilo === 'estilhacos' ? G.estilhacos.clarao : 0;
    const calor = 0.9 * (1 - Math.max(0, this.t - t0) / G.calor);
    if (this.t >= t0 && calor >= 0.3) {
      const h = corDaRampa(this.rampa, calor);
      if (calor >= 0.5) this.luz(X, Y, h, (calor - 0.3) * 0.8);
      return h;
    }
    // the manta's wound keeps a dim cyan rim (her own glow); the metal's is charred
    return bio ? this.rampa[4] : queimar(cor, 1);
  }

  /** The frame the ship shows now, as a bitmap (read once per frame of its animation). */
  private quadroAtual(): Bitmap {
    const f = this.nave.frame;
    const chave = `${f.texture.key}:${f.name}`;
    let b = this.quadros.get(chave);
    if (!b) {
      b = lerQuadro(this.nave);
      this.quadros.set(chave, b);
    }
    return b;
  }

  /** C: the exhaust flame keeps coughing until the break — on and off, at random, like the last life's engine. */
  private desenharChama(c: Corpo, tx: number, ty: number): void {
    if (this.rnd() < 0.45) return;
    const cos = Math.cos(c.ang), sin = Math.sin(c.ang);
    for (const f of this.chama) {
      if (this.rnd() < 0.3) continue;
      const lx = f.i + 0.5 - c.ox, ly = f.j + 0.5 - c.oy;
      const X = Math.floor(c.x + tx + cos * lx - sin * ly), Y = Math.floor(c.y + ty + sin * lx + cos * ly);
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      this.tela.px[Y * W + X] = f.cor;
      this.luz(X, Y, f.cor, 0.5);
    }
  }

  private desenharBrasas(): void {
    const b = this.brasas;
    const cinzaFria = this.rampa[0];
    for (let n = 0; n < b.n; n++) {
      const X = Math.floor(b.x[n]), Y = Math.floor(b.y[n]);
      if (X < 0 || Y < 0 || X >= W || Y >= H || (this.o.chao !== undefined && Y >= this.o.chao)) continue;
      const k = b.idade[n] / b.vida[n];
      const h = b.h0[n] * (1 - k * (b.tipo[n] === 1 ? 1.6 : 1));
      if (h >= 0.3) {
        const c = corDaRampa(this.rampa, h);
        this.tela.px[Y * W + X] = c;
        if (h >= 0.5) this.luz(X, Y, c, (h - 0.3) * 0.9);
        continue;
      }
      if (b.tipo[n] === 0) {
        if (h < 0.14) continue;
        this.tela.px[Y * W + X] = corDaRampa(this.rampa, h);
        continue;
      }
      // ash: the charred hull colour, going away in dither near its end
      if (k > 0.55 && (k - 0.55) / 0.45 > b.limiar[n]) continue;
      this.tela.px[Y * W + X] = b.cor[n] ? queimar(b.cor[n], 1) : cinzaFria;
    }
  }

  /** Additive light at a pixel (and a softer cross around it): the glow layer keeps the brightest per channel. */
  private luz(X: number, Y: number, cor: number, k: number): void {
    const [r, g, b] = canais(cor);
    const pinta = (x: number, y: number, f: number): void => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x, o = this.brilho.px[i];
      this.brilho.px[i] = rgba(Math.max(o & 255, r * f), Math.max((o >>> 8) & 255, g * f), Math.max((o >>> 16) & 255, b * f), 255);
    };
    pinta(X, Y, k);
    const kk = k * 0.38;
    pinta(X + 1, Y, kk);
    pinta(X - 1, Y, kk);
    pinta(X, Y + 1, kk);
    pinta(X, Y - 1, kk);
  }

  // ─── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────

  private entre([a, b]: number[]): number {
    return a + (b - a) * this.rnd();
  }

  /** The centre of the bitmap pixel (i, j) of a body, in the world. */
  private noMundo(c: Corpo, i: number, j: number): [number, number] {
    const lx = i + 0.5 - c.ox, ly = j + 0.5 - c.oy;
    const cos = Math.cos(c.ang), sin = Math.sin(c.ang);
    return [c.x + cos * lx - sin * ly, c.y + sin * lx + cos * ly];
  }

  /** A point in the hull at `k` of its width (0 = tail, 1 = nose), at the mean height of that column. */
  private pontoDoCasco(c: Corpo, k: number): { x: number; y: number } {
    const p = this.pixelDoCasco(c, k, k + 0.04) ?? { x: c.ox, y: c.oy };
    return { x: p.x + 0.5, y: p.y + 0.5 };
  }

  /** A random hull pixel between `a` and `b` of the hull's width. */
  private pixelDoCasco(c: Corpo, a: number, b: number): { x: number; y: number } | null {
    let x0 = c.bmp.w, x1 = -1;
    for (let k = 0; k < c.bmp.cor.length; k++) {
      if (c.bmp.cor[k] >>> 24 < 128) continue;
      const x = k % c.bmp.w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
    const lo = x0 + (x1 - x0) * a, hi = x0 + (x1 - x0) * b;
    const lista: number[] = [];
    for (let k = 0; k < c.bmp.cor.length; k++) {
      const x = k % c.bmp.w;
      if (c.bmp.cor[k] >>> 24 >= 128 && x >= lo && x <= hi) lista.push(k);
    }
    if (!lista.length) return null;
    const k = lista[Math.floor(this.rnd() * lista.length)];
    return { x: k % c.bmp.w, y: Math.floor(k / c.bmp.w) };
  }

  /** A piece of the hull as a body in the world (where the hull holds it now); tiny bits turn into embers instead. */
  private corpoDe(c: Corpo, p: Pedaco, t0: number): Corpo | null {
    if (p.n < 5) {
      for (let k = 0; k < p.bmp.cor.length; k++) {
        if (!p.bmp.cor[k]) continue;
        const [wx, wy] = this.noMundo(c, p.x0 + (k % p.bmp.w), p.y0 + Math.floor(k / p.bmp.w));
        const a = this.rnd() * Math.PI * 2, v = 40 + this.rnd() * 50;
        this.brasas.add(wx, wy, c.vx + Math.cos(a) * v, c.vy + Math.sin(a) * v, 0.5 + this.rnd() * 0.6, 0.8, p.bmp.cor[k], 1, this.rnd());
      }
      return null;
    }
    const [x, y] = this.noMundo(c, p.cx - 0.5, p.cy - 0.5);
    const bordas: number[] = [];
    p.corte.forEach((v, k) => v === 2 && bordas.push(k));
    return {
      bmp: p.bmp,
      corte: p.corte,
      ox: p.cx - p.x0,
      oy: p.cy - p.y0,
      x,
      y,
      ang: c.ang,
      vx: c.vx,
      vy: c.vy,
      w: 0,
      n: p.n,
      some: Infinity,
      someEm: 1,
      t0,
      bordas,
      fumaca: false,
      motor: false,
    };
  }

  /** The exhaust flame bursts into fire: every flame pixel is an ember flung backwards. */
  private soltarChama(c: Corpo, h0: number): void {
    for (const f of this.chama) {
      const [wx, wy] = this.noMundo(c, f.i, f.j);
      const a = c.ang + Math.PI + (this.rnd() - 0.5) * 1.4, v = 25 + this.rnd() * 45;
      this.brasas.add(wx, wy, c.vx + Math.cos(a) * v, c.vy + Math.sin(a) * v, 0.2 + this.rnd() * 0.35, h0, 0, 0, this.rnd());
    }
  }

  get terminou(): boolean {
    return this.t >= this.duracao;
  }

  destroy(): void {
    if (this.acabou) return;
    this.acabou = true;
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.antesDoQuadro, this);
    this.tela.destroy();
    this.brilho.destroy();
    this.fumo.destroy();
  }
}
