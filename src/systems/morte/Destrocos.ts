import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import type { Fx } from '../Fx';
import { Tela } from './MorteDaNave';
import {
  type Bitmap,
  type Pedaco,
  type Ponto,
  sorte,
  ruido,
  partir,
  sementesEspalhadas,
  sementesNoEixo,
  sementesAoLongo,
  temposDeQueima,
  lasca,
  soltarLasca,
  componentes,
  extrair,
  reduzir,
  RAMPA_FOGO,
  RAMPA_MEDUSA,
  RAMPA_CARNE,
  RAMPA_ROCHA,
  clarear,
  corDaRampa,
  queimar,
  bayer,
  canais,
  rgba,
} from './pedacos';
import { DESTROCOS, type Classe, type Estilo, type Material, type VarianteRocha } from './numerosDestrocos';

/**
 * THE ENEMIES' DEBRIS (26/10, his ask: *"aplicarmos efeitos de dano, explosões, derrotas decentes iguais ao das
 * naves"*). The ship's technique (`docs/DESTROCOS.md`: the sprite's own pixels, cut and drawn pixel by pixel at the
 * native 384×216), made for MANY deaths at once: ONE engine per scene, three shared pixel canvases, every body, ember,
 * droplet and puff in shared pools — a drone wave cleared by a chain card is a dozen deaths in the same frame.
 *
 *   - `morrer(sprite, …)`: the death, in one of the shapes (`Estilo`), painted by the material (`Material`);
 *   - `ferir(sprite, hp…)`: the hull loss — crossing an HP threshold bites the body on the side the shot came from, the
 *     bitten piece flies, and the bite STAYS on the live sprite (drawn over it every frame) with a wound that smokes,
 *     sparks, drips or glows until it dies;
 *   - `vigiar(sprite, fração, …)`: the same for a boss or the dolphin, by polling its life (it takes damage by many
 *     roads); `esquecer` drops the scars of an art that became another, `acima` raises the layers over a boss drawn high.
 *
 * The scene drives it: `update(dt)` with the dt already scaled (slow motion, hitstop), and the drawing happens in the
 * scene's PRE_RENDER — the physics moves the sprites after the update, and a scar drawn in it would trail by a frame.
 */

const W = GAME_WIDTH;
const H = GAME_HEIGHT;
const RAMPAS = [RAMPA_FOGO, RAMPA_MEDUSA, RAMPA_CARNE, RAMPA_ROCHA];
const RAMPA_DO: Record<Material, number> = { metal: 0, luz: 1, carne: 2, biomec: 2, rocha: 3 };
/**
 * the smoke's two tones (the core, the rim) per material: a grey-blue a step lighter than the ship's (the ship's
 * vanished on the F2's dark sky), a deep blue, a dark flesh mist; the rock's DUST (27/10), the asteroids' own blue-grey
 */
const FUMO: [number, number][] = [
  [rgba(0x62, 0x6a, 0x7e), rgba(0x44, 0x4b, 0x5e)],
  [rgba(0x2a, 0x30, 0x6a), rgba(0x1c, 0x20, 0x4a)],
  [rgba(0x4a, 0x22, 0x2a), rgba(0x30, 0x14, 0x1c)],
  [rgba(0x46, 0x34, 0x3c), rgba(0x2e, 0x22, 0x2a)],
  [rgba(0x6a, 0x7a, 0x86), rgba(0x46, 0x54, 0x60)],
];
const FUMO_DO: Record<Material, number> = { metal: 0, luz: 1, carne: 2, biomec: 3, rocha: 4 };

export interface OpcoesMorteInimigo {
  estilo: Estilo;
  material: Material;
  classe: Classe;
  /** where the killing shot came from (world): the side that blows out */
  de?: Ponto;
  /** the big moment (the break-up, the wreck's pop): the scene's slow motion, for the minis and the bosses */
  aoClimax?: () => void;
  /** the rock's way of breaking (`estilo: 'rocha'`): R1 the fracture, R2 the crumble, R3 split in two */
  rocha?: VarianteRocha;
}

/** A rigid piece in the world. */
interface Corpo {
  bmp: Bitmap;
  corte: Uint8Array;
  ox: number;
  oy: number;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  w: number;
  n: number;
  /** when it starts going away (absolute engine time), and over how long — pixel by pixel */
  some: number;
  someEm: number;
  /** when its cut opened, and how long it stays hot */
  t0: number;
  calor: number;
  /** white until this time (the shatter's flash) */
  branco: number;
  /** how much the inside chars (0 = none), over 1.6 s */
  carvao: number;
  bordas: number[];
  /** it trails smoke until this time */
  fumacaAte: number;
  mat: Material;
  /** an extra pull down (the wreck that lost control, even in the vacuum) */
  cair: number;
  /** the wreck: it chars from `queimaDe` to `queimaAte` */
  queimaDe: number;
  queimaAte: number;
  /** the break-up: the pops' burn marks, in the bitmap */
  manchas: { u: number; v: number; t0: number }[];
  /**
   * A flesh boss's break-up (27/10, him on the serpent's fusion: the big pieces *"deixam marcas cor avermelhadas
   * fixadas"*): the pops' marks stay small and are not baked red into the pieces, and the red of the torn edge fades
   * into the body's own colour, darkened. (The commons' and elites' flesh keep the wet red they were approved with.)
   */
  limpa?: boolean;
  /** the jellyfish: when each pixel burns away (absolute), and the pixels in that order */
  tempos: Float32Array | null;
  ordem: number[];
  proximo: number;
}

/**
 * One blow on a live sprite, kept to be replayed on every frame of its animation (27/10: the art moves inside its frame
 * — the guardian bobs 3 px, its tubes sway — and a hole fixed to the frame's pixels slid off the body). Each frame takes
 * the same blows on ITS OWN art, so the scar sits on the edge whatever the pose. Places are in the first frame's
 * pixels (`Desgaste.dx/dy` is how far each frame's art sits from it).
 *   - a MARK (`marcar`, his rule: *"cada tiro tira 1 px da borda do asset"*): the first live pixel along one lane of the
 *     frame (a row for a shot from a side, a column from above or below), from the side the shot came;
 *   - a BITE (`morder`): `alvo` pixels grown from the edge nearest `perto`, by the same bent distance and luck (`semente`).
 */
type Golpe =
  | { tipo: 'marca'; lado: number; faixa: number; t: number; zona?: { x: number; y: number; r: number } }
  | { tipo: 'mordida'; alvo: number; perto?: Ponto; torto: (x: number, y: number) => number; semente: number; t: number };
// (`lado`: 0 from the left — along +x —, 1 from the right, 2 from above — along +y —, 3 from below)

/**
 * The blows on one drawn frame: what is gone (1 a mark, 2 a part a cut left hanging, which fell, 3 a bite), the rim
 * left around it (when it was made, −1 = none; and whose: 1 a bite's, 3 a mark's), and how many blows it has taken.
 */
interface Desgaste {
  bmp: Bitmap;
  comido: Uint8Array;
  aro: Float32Array;
  aroDe: Uint8Array;
  feitos: number;
  /** how many of its pixels are gone */
  fora: number;
  dx: number;
  dy: number;
  vivos: number;
}

/** The scars of a live sprite: its blows, and the frames they were played on. */
interface Cicatriz {
  id: number;
  w: number;
  h: number;
  golpes: Golpe[];
  /** px taken per lane (`lado:faixa`, in the first frame's place): how deep the notch is, for the next hit */
  fundo: Map<string, number>;
  /** the first frame seen (the place every blow is kept in) */
  ref: Bitmap | null;
  /** per drawn frame (`texture:frame:flip`) */
  desgastes: Map<string, Desgaste>;
  /** the hardness's leftover: a hard body loses a pixel every second hit (`marcar`'s `dureza`) */
  sobra: number;
  feridas: Ponto[];
  mat: Material;
  classe: Classe;
  relogio: number;
  /**
   * THE REAL HOLES: the sprite shows a copy of each of its frames with the gone pixels transparent (the background
   * shows through — a dark patch painted over a grey leg read as a stain, not as a missing piece). Per drawn frame
   * the holed copy's key, and back; a frame takes the blows since it last showed when it shows again, punched into
   * its copy in place (`emDia`), and the copies touched are sent to the GPU once per drawing (`sujas`).
   */
  furados: Map<string, string>;
  origem: Map<string, { key: string; frame: string | number }>;
  /** how each holed copy was made (its source size and mirror): a new blow is punched into it in place */
  copias: Map<string, { fw: number; fh: number; fx: boolean; fy: boolean }>;
}

let serieFuro = 0;
let serieCopia = 0;

/** A colour a step darker, keeping its hue (not the charring's pull to red-brown). */
function escurecer(c: number): number {
  const [r, g, b, a] = canais(c);
  return rgba(Math.round(r * 0.72), Math.round(g * 0.72), Math.round(b * 0.72), a);
}
const OITO = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/**
 * How far a frame's art sits from the first frame's (a body that bobs inside its frame): per axis, the whole-pixel
 * shift (up to `R` px) that best lays its profile — opaque pixels per column, per row — over the first's. (The 2-D
 * search of every shift over the whole frame cost up to 10 ms the first time a boss's frame showed.)
 */
function registro(ref: Bitmap, b: Bitmap, R: number): [number, number] {
  if (ref === b || ref.w !== b.w || ref.h !== b.h) return [0, 0];
  const perfis = (m: Bitmap): [Int32Array, Int32Array] => {
    const col = new Int32Array(m.w), lin = new Int32Array(m.h);
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (m.cor[y * m.w + x] >>> 24 < 128) continue;
        col[x]++;
        lin[y]++;
      }
    }
    return [col, lin];
  };
  const melhor = (p: Int32Array, q: Int32Array): number => {
    let m = 0, menor = Infinity;
    for (let d = -R; d <= R; d++) {
      let s = 0;
      for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - (q[i + d] ?? 0));
      if (s < menor || (s === menor && Math.abs(d) < Math.abs(m))) {
        menor = s;
        m = d;
      }
    }
    return m;
  };
  const [c0, l0] = perfis(ref), [c1, l1] = perfis(b);
  return [melhor(c0, c1), melhor(l0, l1)];
}

/**
 * What a cut left hanging (his report: the tower's bite left pixels floating): from the pixels just taken, the live
 * pixels no longer joined (8-way) to the body. A part of up to `limite` px that does not touch the frame's border falls
 * (the art that touches the border goes on past it: the guardian's tubes up to the ceiling).
 */
function soltos(w: number, h: number, vivo: (k: number) => boolean, cortados: number[], limite: number): number[] {
  const dono = new Int32Array(w * h);
  const preso: boolean[] = [false];
  const caem: number[] = [];
  const pilha: number[] = [];
  for (const k of cortados) {
    const x = k % w, y = (k - x) / w;
    for (const [dx, dy] of OITO) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const v = yy * w + xx;
      if (dono[v] || !vivo(v)) continue;
      // one part, flooded until it is known to hold (big, on the border, or touching a part that holds)
      const f = preso.length;
      preso.push(false);
      const parte: number[] = [];
      dono[v] = f;
      pilha.push(v);
      while (pilha.length) {
        const j = pilha.pop()!;
        parte.push(j);
        const jx = j % w, jy = (j - jx) / w;
        if (jx === 0 || jy === 0 || jx === w - 1 || jy === h - 1 || parte.length > limite) {
          preso[f] = true;
          break;
        }
        for (const [ex, ey] of OITO) {
          const ux = jx + ex, uy = jy + ey;
          if (ux < 0 || uy < 0 || ux >= w || uy >= h) continue;
          const u = uy * w + ux;
          if (dono[u] === f || !vivo(u)) continue;
          if (dono[u]) {
            // (a part flooded before that stopped at its limit: this one is it)
            if (preso[dono[u]]) {
              preso[f] = true;
              break;
            }
            continue;
          }
          dono[u] = f;
          pilha.push(u);
        }
        if (preso[f]) break;
      }
      pilha.length = 0;
      if (!preso[f]) caem.push(...parte);
    }
  }
  return caem;
}
const VIZINHOS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Any texture frame's pixels (the original of a holed copy). */
function lerFrame(f: Phaser.Textures.Frame): Bitmap {
  const cv = document.createElement('canvas');
  cv.width = f.cutWidth;
  cv.height = f.cutHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const d = ctx.getImageData(0, 0, cv.width, cv.height);
  return { w: cv.width, h: cv.height, cor: new Uint32Array(d.data.buffer.slice(0)) };
}

/** A small deterministic hash in [0, 1): the wound's embers flicker the same way in every film. */
const hash = (a: number, b: number): number => ((((a * 2654435761) ^ (b * 40503)) >>> 0) % 1000) / 1000;

/** The embers, ash, chips and droplets: flat arrays, swapped out when they die. */
class Particulas {
  n = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly idade: Float32Array;
  readonly vida: Float32Array;
  readonly h0: Float32Array;
  readonly limiar: Float32Array;
  readonly peso: Float32Array;
  readonly cor: Uint32Array;
  /** 0 = ember (cools through its ramp), 1 = chip/ash (the hull's colour, charred, lingers), 2 = droplet (flesh) */
  readonly tipo: Uint8Array;
  readonly rampa: Uint8Array;

  constructor(readonly cap: number) {
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.idade = new Float32Array(cap);
    this.vida = new Float32Array(cap);
    this.h0 = new Float32Array(cap);
    this.limiar = new Float32Array(cap);
    this.peso = new Float32Array(cap);
    this.cor = new Uint32Array(cap);
    this.tipo = new Uint8Array(cap);
    this.rampa = new Uint8Array(cap);
  }

  add(x: number, y: number, vx: number, vy: number, vida: number, h0: number, cor: number, tipo: number, rampa: number, limiar: number, peso = 0.35): void {
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
    this.rampa[i] = rampa;
    this.limiar[i] = limiar;
    this.peso[i] = peso;
  }

  passo(dt: number, ax: number, g: number, arrasto: number): void {
    const freio = Math.max(0, 1 - arrasto * dt);
    for (let i = 0; i < this.n; i++) {
      this.idade[i] += dt;
      if (this.idade[i] >= this.vida[i]) {
        const u = --this.n;
        for (const a of [this.x, this.y, this.vx, this.vy, this.idade, this.vida, this.h0, this.limiar, this.peso]) a[i] = a[u];
        this.cor[i] = this.cor[u];
        this.tipo[i] = this.tipo[u];
        this.rampa[i] = this.rampa[u];
        i--;
        continue;
      }
      this.vx[i] = this.vx[i] * freio + ax * dt;
      this.vy[i] = this.vy[i] * freio + g * this.peso[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }
}

/** The smoke puffs (pixel discs), each with its material's tones. */
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
  readonly tom: Uint8Array;

  constructor(readonly cap: number) {
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.idade = new Float32Array(cap);
    this.vida = new Float32Array(cap);
    this.r0 = new Float32Array(cap);
    this.r1 = new Float32Array(cap);
    this.tom = new Uint8Array(cap);
  }

  add(x: number, y: number, vx: number, vy: number, vida: number, r0: number, r1: number, tom: number): void {
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
    this.tom[i] = tom;
  }

  passo(dt: number, ax: number, ay: number, arrasto: number): void {
    const freio = Math.max(0, 1 - arrasto * dt);
    for (let i = 0; i < this.n; i++) {
      this.idade[i] += dt;
      if (this.idade[i] >= this.vida[i]) {
        const u = --this.n;
        for (const a of [this.x, this.y, this.vx, this.vy, this.idade, this.vida, this.r0, this.r1]) a[i] = a[u];
        this.tom[i] = this.tom[u];
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

export class Destrocos {
  private t = 0;
  private readonly rnd: () => number;
  private readonly fumo: Tela;
  private readonly tela: Tela;
  private readonly brilho: Tela;
  private corpos: Corpo[] = [];
  private readonly brasas = new Particulas(3200);
  private readonly fumos = new Fumos(700);
  private pendentes: { em: number; f: () => void }[] = [];
  private readonly cicatrizes = new Map<Phaser.GameObjects.Sprite, Cicatriz>();
  /** the boss's life the last time we looked (for its thresholds) */
  private readonly vidaVista = new Map<Phaser.GameObjects.Sprite, number>();
  /** each drawn frame, read once (texture:frame:scale:flip:tint) */
  private readonly quadros = new Map<string, Bitmap>();
  /** our holed copies → the original frame they copy (they are never read back: see `visto`) */
  private readonly furoParaOriginal = new Map<string, { key: string; frame: string | number }>();
  private sujo = false;
  private acabou = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
    /** the world under the debris: the F1's air and ground, or the vacuum (read every frame: the F1 breaks it) */
    private readonly ambiente: () => { atmosfera: boolean; chao?: number },
    semente?: number,
    private readonly depth = 1.02,
  ) {
    this.rnd = sorte(semente ?? Math.floor(Math.random() * 1e9));
    const k = serie++;
    this.fumo = new Tela(scene, `destrocos-fumo-${k}`, depth - 0.06, false);
    this.tela = new Tela(scene, `destrocos-tela-${k}`, depth, false);
    this.brilho = new Tela(scene, `destrocos-brilho-${k}`, depth + 0.01, true);
    // the first upload of a full-screen texture is the expensive one: done here, at the phase's load, not at its first death
    this.fumo.enviar();
    this.tela.enviar();
    this.brilho.enviar();
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.desenhar, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // ─── the death ────────────────────────────────────────────────────────────────────────────────────────────────────

  /** The enemy dies in its own pixels. Call BEFORE destroying the sprite (its frame and scars are read now). */
  morrer(s: Phaser.GameObjects.Sprite, o: OpcoesMorteInimigo): void {
    const c = this.corpoDoSprite(s, o.material);
    if (!c || c.n < 3) return;
    const estilo: Estilo = o.material === 'luz' ? 'desintegra' : o.estilo;
    if (estilo === 'lascas') this.lascas(c, o);
    else if (estilo === 'meio') this.meio(c, o);
    else if (estilo === 'carcaca') this.carcaca(c, o);
    else if (estilo === 'ruptura') this.ruptura(c, o);
    else if (estilo === 'estilhacos') this.estilhacos(c, o);
    else if (estilo === 'rocha') this.rocha(c, o);
    else this.desintegra(c, o);
  }

  /**
   * ROCHA — a rock breaking in the vacuum (27/10, him: *"o estilhaçar dela precisa ser algo mais parecido como
   * estilhaçar uma rocha no espaço. Para não ter um estilhaço igual ao dos inimigos"*). No fireball of its own (the
   * PixelLab explosion goes over it, `killHazard`), no glowing cut, no smoke:
   *   - angular blocks (the cut barely bends) that drift and turn slowly, kept by the vacuum;
   *   - the fresh faces flash pale a moment and stay a little lighter (`corDoCorpo`);
   *   - gravel off the cuts, in the rock's own colours;
   *   - a ring of dust that hangs and thins out.
   * R1 the fracture (4–7 blocks), R2 the crumble (many small pieces in a cloud), R3 split in two or three.
   */
  private rocha(c: Corpo, o: OpcoesMorteInimigo): void {
    const K = DESTROCOS.rocha;
    // (his choice: the big rocks crumble, the small ones split — unless a film or dev asks for one)
    const v: Exclude<VarianteRocha, 'hoje'> = o.rocha && o.rocha !== 'hoje' ? o.rocha : c.n >= K.pxGrande ? 'R2' : 'R3';
    const R = K[v];
    const nP = Math.min(R.pecas[1], Math.max(R.pecas[0], Math.round(c.n / R.pxPorPeca)));
    const sem = v === 'R3'
      ? sementesAoLongo(c.bmp, nP, this.rnd)
      : sementesEspalhadas(c.bmp, nP, Math.max(2, Math.sqrt(c.n / nP) * 0.7), this.rnd);
    const pedacos = partir(c.bmp, sem, ruido(c.bmp.w, c.bmp.h, 5, this.rnd), K.torto);
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    const [sx, sy] = this.rumoDoTiro(cx, cy, o.de);
    for (const p of pedacos) {
      const r = this.pecaDe(c, p, this.t);
      if (!r) continue;
      const dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy) || 1;
      const vel = this.entre(R.vel) * (1 + 1.5 / Math.sqrt(p.n));
      r.vx = c.vx + (dx / d) * vel + sx * 8;
      r.vy = c.vy + (dy / d) * vel + sy * 8;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(R.giro) * Math.min(1.5, 4 / Math.sqrt(p.n));
      r.some = this.t + this.entre(R.somem);
      r.someEm = R.someEm;
      // (on a rock, `calor` is how long the fresh face flashes pale)
      r.calor = K.clarao;
      r.fumacaAte = 0;
      // gravel off the cut, in its own colour
      for (let k = 0; k < r.bmp.cor.length; k++) {
        if (r.corte[k] !== 2 || this.rnd() > R.cascalho) continue;
        const [wx, wy] = this.noMundo(r, k % r.bmp.w, Math.floor(k / r.bmp.w));
        const a = Math.atan2(wy - cy, wx - cx) + (this.rnd() - 0.5) * 1.4, vv = 18 + this.rnd() * 40;
        this.brasas.add(wx, wy, c.vx + Math.cos(a) * vv, c.vy + Math.sin(a) * vv, this.entre(K.vidaCascalho), 0.5, r.bmp.cor[k], 1, RAMPA_DO.rocha, this.rnd());
        r.bmp.cor[k] = 0;
      }
      this.cairJa(r, c.vy);
      this.corpos.push(r);
    }
    // the dust: a ring out of the rock, slow, hanging a while (not the smoke's drift: nothing burns)
    const raio = Math.sqrt(c.n) * 0.35;
    for (let i = 0; i < R.poeira; i++) {
      const a = (i / R.poeira) * Math.PI * 2 + this.rnd() * 0.6;
      const vv = 6 + this.rnd() * 14;
      this.fumos.add(cx + Math.cos(a) * raio, cy + Math.sin(a) * raio, c.vx * 0.6 + Math.cos(a) * vv, c.vy * 0.6 + Math.sin(a) * vv, this.entre(K.vidaPoeira), 1, 3 + this.rnd() * 2.5, FUMO_DO.rocha);
    }
  }

  /** A1 — a few pieces of the enemy itself out of a small fireball. */
  private lascas(c: Corpo, o: OpcoesMorteInimigo): void {
    const L = DESTROCOS.lascas;
    const porte = DESTROCOS.porte(c.n);
    const nP = Math.min(L.pecas[1], Math.max(L.pecas[0], Math.round(c.n / L.pxPorPeca)));
    const torto = ruido(c.bmp.w, c.bmp.h, 4, this.rnd);
    const pedacos = partir(c.bmp, sementesEspalhadas(c.bmp, nP, Math.max(3, Math.sqrt(c.n / nP) * 0.7), this.rnd), torto, L.torto);
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    const [sx, sy] = this.rumoDoTiro(cx, cy, o.de);
    for (const p of pedacos) {
      const r = this.pecaDe(c, p, this.t);
      if (!r) continue;
      const dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(L.vel) * (1 + 2 / Math.sqrt(p.n));
      r.vx = c.vx + (dx / d) * v + sx * 16 + (this.rnd() - 0.5) * 12;
      r.vy = c.vy + (dy / d) * v + sy * 16 + (this.rnd() - 0.5) * 12;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(L.giro) * Math.min(1.5, 3 / Math.sqrt(p.n));
      r.some = this.t + this.entre(L.somem);
      r.someEm = L.someEm;
      r.calor = L.calor;
      r.fumacaAte = p.n >= L.fumacaMin ? this.t + 0.4 : 0;
      this.cairJa(r, c.vy);
      this.corpos.push(r);
    }
    this.estouro(o.material, cx, cy, L.bola * porte, false);
    this.faiscas(o.material, cx, cy, c.vx, c.vy, Math.round(5 * porte), 1);
    this.spray(c, o.material, 1);
  }

  /** A2 — cut in two along a ragged line: the halves part, spinning opposite ways, the cut glowing and smoking. */
  private meio(c: Corpo, o: OpcoesMorteInimigo): void {
    const M = DESTROCOS.meio;
    const porte = DESTROCOS.porte(c.n);
    const sem = sementesAoLongo(c.bmp, 2, this.rnd);
    if (sem.length < 2) return this.lascas(c, o);
    const pedacos = partir(c.bmp, sem, ruido(c.bmp.w, c.bmp.h, 4, this.rnd), M.torto);
    // the cut's middle: between the two seeds
    const [mx, my] = this.noMundo(c, (sem[0].x + sem[1].x) / 2 - 0.5, (sem[0].y + sem[1].y) / 2 - 0.5);
    const lado = this.rnd() < 0.5 ? -1 : 1;
    for (const p of pedacos) {
      const r = this.pecaDe(c, p, this.t);
      if (!r) continue;
      const dx = r.x - mx, dy = r.y - my, d = Math.hypot(dx, dy) || 1;
      const frente = dx > 0 ? 1 : -1;
      const v = this.entre(M.separa);
      // the halves part along the body and a little apart across it (one up, one down)
      r.vx = c.vx + (dx / d) * v;
      r.vy = c.vy + (dy / d) * v * 0.5 + lado * frente * v * 0.6;
      r.w = lado * frente * this.entre(M.giro);
      r.some = this.t + this.entre(M.somem);
      r.someEm = M.someEm;
      r.calor = M.calor;
      r.fumacaAte = p.n >= 10 ? this.t + 0.6 : 0;
      this.cairJa(r, c.vy);
      this.corpos.push(r);
    }
    this.estouro(o.material, mx, my, M.bola * porte, true);
    this.faiscas(o.material, mx, my, c.vx, c.vy, Math.round(7 * porte), 1);
    this.spray(c, o.material, 0.7);
  }

  /** A3/C2 — the wreck: it chars, tumbles off course trailing smoke, and only then pops into pieces. */
  private carcaca(c: Corpo, o: OpcoesMorteInimigo): void {
    const K = DESTROCOS.carcaca;
    const porte = DESTROCOS.porte(c.n);
    const estoura = K.estoura * Math.min(1.6, 0.8 + porte * 0.25);
    c.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(K.giro) / Math.max(1, porte * 0.8);
    c.cair = K.queda;
    c.vy += 12;
    c.vx *= 0.8;
    c.queimaDe = this.t;
    c.queimaAte = this.t + estoura;
    c.fumacaAte = this.t + estoura;
    c.some = Infinity;
    // a first small hit where the shot landed
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    this.estouro(o.material, cx, cy, 0.3 * porte, true);
    this.faiscas(o.material, cx, cy, c.vx, c.vy, Math.round(4 * porte), 1);
    this.corpos.push(c);
    this.pendentes.push({
      em: this.t + estoura,
      f: () => {
        this.corpos = this.corpos.filter((x) => x !== c);
        // what pops is the charred wreck, where it is now
        const k = 0.6;
        const bmp: Bitmap = { w: c.bmp.w, h: c.bmp.h, cor: c.bmp.cor.map((cor) => (cor ? this.carbonizar(cor, c.mat, k) : 0)) };
        const r: Corpo = { ...c, bmp, corte: new Uint8Array(bmp.w * bmp.h), cair: 0, queimaDe: 0, queimaAte: 0 };
        const L = DESTROCOS.lascas;
        const nP = Math.min(L.pecas[1] + 1, Math.max(L.pecas[0] + 1, Math.round(c.n / L.pxPorPeca)));
        const pedacos = partir(bmp, sementesEspalhadas(bmp, nP, Math.max(3, Math.sqrt(c.n / nP) * 0.7), this.rnd), ruido(bmp.w, bmp.h, 4, this.rnd), L.torto);
        const [x, y] = this.noMundo(r, r.ox - 0.5, r.oy - 0.5);
        for (const p of pedacos) {
          const q = this.pecaDe(r, p, this.t);
          if (!q) continue;
          const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1;
          const v = this.entre(L.vel) * (1 + 2 / Math.sqrt(p.n));
          q.vx = r.vx + (dx / d) * v;
          q.vy = r.vy + (dy / d) * v;
          q.w = r.w * 0.5 + (this.rnd() - 0.5) * 2 * this.entre(L.giro);
          q.some = this.t + this.entre(L.somem) + 0.1;
          q.someEm = L.someEm;
          q.calor = L.calor;
          q.fumacaAte = p.n >= L.fumacaMin ? this.t + 0.5 : 0;
          this.cairJa(q, r.vy);
          this.corpos.push(q);
        }
        this.estouro(o.material, x, y, K.bola * porte, false);
        this.faiscas(o.material, x, y, r.vx, r.vy, Math.round(8 * porte), 1);
        this.spray(r, o.material, 1);
        o.aoClimax?.();
      },
    });
  }

  /** B1/C1/D1 — pops along the body while it tumbles, then the break-up in sections, chips flying off the cut. */
  private ruptura(c: Corpo, o: OpcoesMorteInimigo): void {
    const R = DESTROCOS.ruptura;
    const porte = DESTROCOS.porte(c.n);
    // (a flesh boss — the serpent — keeps no red marks on its pieces: see `Corpo.limpa`)
    c.limpa = o.classe === 'chefe' && (o.material === 'carne' || o.material === 'biomec');
    c.w = (this.rnd() < 0.5 ? -1 : 1) * 0.6 / Math.max(1, porte);
    c.some = Infinity;
    c.fumacaAte = this.t + R.partirEm;
    this.corpos.push(c);
    for (const em of R.estalos) {
      this.pendentes.push({
        em: this.t + em,
        f: () => {
          if (!this.corpos.includes(c)) return;
          const p = this.pixelAoAcaso(c);
          if (!p) return;
          c.manchas.push({ u: p.x, v: p.y, t0: this.t });
          const [wx, wy] = this.noMundo(c, p.x, p.y);
          this.estouro(o.material, wx, wy, R.estalo * porte, true);
          // (flesh has no fireball: the pop is a gush of droplets)
          this.faiscas(o.material, wx, wy, c.vx, c.vy, Math.round((o.material === 'carne' ? 12 : 5) * porte), 1);
          c.w *= 1.8;
        },
      });
    }
    this.pendentes.push({
      em: this.t + R.partirEm,
      f: () => {
        this.corpos = this.corpos.filter((x) => x !== c);
        // the pops' burns are baked into what breaks
        const bmp: Bitmap = { w: c.bmp.w, h: c.bmp.h, cor: c.bmp.cor.map((cor, k) => (cor ? this.corComManchas(c, k, cor, true).cor : 0)) };
        const nAx = Math.min(5, Math.max(2, Math.round(Math.sqrt(c.n) / 9)));
        const sem = c.n < 500 ? sementesNoEixo(bmp, this.rnd) : [...sementesAoLongo(bmp, nAx, this.rnd), ...sementesEspalhadas(bmp, Math.max(1, nAx - 2), Math.sqrt(c.n) * 0.4, this.rnd)];
        const pedacos = partir(bmp, sem, ruido(bmp.w, bmp.h, 4, this.rnd), R.torto);
        const r: Corpo = { ...c, bmp, corte: new Uint8Array(bmp.w * bmp.h), manchas: [] };
        const [x, y] = this.noMundo(r, r.ox - 0.5, r.oy - 0.5);
        for (const p of pedacos) {
          const q = this.pecaDe(r, p, this.t);
          if (!q) continue;
          const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1;
          const v = this.entre(R.vel) * Math.min(1.6, 0.8 + 6 / Math.sqrt(p.n));
          q.vx = r.vx + (dx / d) * v + (this.rnd() - 0.5) * 10;
          q.vy = r.vy + (dy / d) * v + (this.rnd() - 0.5) * 10;
          q.w = r.w * 0.5 + (this.rnd() - 0.5) * 2 * this.entre(R.giro) / Math.max(1, Math.sqrt(p.n) / 8);
          q.some = this.t + this.entre(R.somem) * Math.min(1.6, 0.85 + porte * 0.2);
          q.someEm = R.someEm;
          q.calor = R.calor;
          q.carvao = 0.4;
          q.fumacaAte = p.n >= 14 ? this.t + 0.9 : 0;
          // chips off the cut
          for (let k = 0; k < q.bmp.cor.length; k++) {
            if (q.corte[k] !== 2 || this.rnd() > R.lascas) continue;
            const [wx, wy] = this.noMundo(q, k % q.bmp.w, Math.floor(k / q.bmp.w));
            const a = Math.atan2(wy - y, wx - x) + (this.rnd() - 0.5) * 1.2, vv = 40 + this.rnd() * 55;
            this.brasas.add(wx, wy, r.vx + Math.cos(a) * vv, r.vy + Math.sin(a) * vv, 0.45 + this.rnd() * 0.6, 0.85, q.bmp.cor[k], 1, RAMPA_DO[o.material], this.rnd());
            q.bmp.cor[k] = 0;
          }
          this.cairJa(q, r.vy);
          this.corpos.push(q);
        }
        // a boss's break-up gets the big blast (behind the pieces: they read over it)
        this.estouro(o.material, x, y, R.bola * porte * (o.classe === 'chefe' ? R.chefe : 1), false);
        this.faiscas(o.material, x, y, r.vx, r.vy, Math.round(10 * porte), 1);
        this.spray(r, o.material, 1);
        o.aoClimax?.();
      },
    });
  }

  /** B2 — the body goes white and shatters at once (the scene freezes a moment). */
  private estilhacos(c: Corpo, o: OpcoesMorteInimigo): void {
    const E = DESTROCOS.estilhacos;
    const porte = DESTROCOS.porte(c.n);
    const nP = Math.min(9, Math.max(5, Math.round(c.n / 70)));
    const pedacos = partir(c.bmp, sementesEspalhadas(c.bmp, nP, Math.max(E.distMin, Math.sqrt(c.n / nP) * 0.75), this.rnd), ruido(c.bmp.w, c.bmp.h, 4, this.rnd), E.torto);
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    const [sx, sy] = this.rumoDoTiro(cx, cy, o.de);
    // flesh does not flash white (in the 1st film it was a pink blob): it bursts at once, with a bigger spray
    const brilha = o.material === 'metal' || o.material === 'luz';
    for (const p of pedacos) {
      const r = this.pecaDe(c, p, this.t + (brilha ? E.clarao : 0));
      if (!r) continue;
      r.branco = brilha ? this.t + E.clarao : 0;
      const dx = r.x - cx, dy = r.y - cy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(E.vel) * (1 + 2.5 / Math.sqrt(p.n));
      r.vx = c.vx + (dx / d) * v + sx * 12;
      r.vy = c.vy + (dy / d) * v + sy * 12;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(E.giro) * Math.min(1.6, 3 / Math.sqrt(p.n));
      r.some = this.t + this.entre(E.somem);
      r.someEm = E.someEm;
      r.calor = E.calor;
      r.carvao = 0.5;
      r.fumacaAte = p.n >= 18 ? this.t + 0.7 : 0;
      this.cairJa(r, c.vy);
      this.corpos.push(r);
    }
    this.estouro(o.material, cx, cy, E.bola * porte, false);
    this.faiscas(o.material, cx, cy, c.vx, c.vy, Math.round(8 * porte), 1);
    this.spray(c, o.material, brilha ? 1 : 1.6);
    o.aoClimax?.();
  }

  /** LUZ — a front crosses the body from the shot's side; each pixel lets go as an ember of its own glow. */
  private desintegra(c: Corpo, o: OpcoesMorteInimigo): void {
    const D = DESTROCOS.desintegra;
    const porte = DESTROCOS.porte(c.n);
    const dur = D.queima[0] + (D.queima[1] - D.queima[0]) * Math.min(1, (porte - 0.55) / 1.2);
    const origem = o.de ? this.ladoNoBitmap(c, o.de) : { x: c.ox, y: c.oy };
    const rel = temposDeQueima(c.bmp, origem, dur, ruido(c.bmp.w, c.bmp.h, 4, this.rnd), 3);
    c.tempos = rel.map((v) => (Number.isFinite(v) ? v + this.t : Infinity));
    c.ordem = [...c.tempos.keys()].filter((i) => Number.isFinite(c.tempos![i])).sort((a, b) => c.tempos![a] - c.tempos![b]);
    c.proximo = 0;
    c.some = Infinity;
    c.w = (this.rnd() - 0.5) * 0.6;
    this.corpos.push(c);
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    this.estouro(o.material, cx, cy, 0.5 * porte, false);
  }

  /**
   * IN THE AIR THE PIECES FALL AT ONCE (27/10, him: *"o movimento é jogar os estilhaços para cima um pouco e depois eles
   * começam a cair … estilhaços já quebram e caem direto"*): the burst still spreads them sideways, but none is thrown
   * up — only its downward share stays (halved), with the body's own fall. The sparks and embers are light: they may
   * rise. In the vacuum nothing pulls, and the pieces drift as they went.
   */
  private cairJa(r: Corpo, vyCorpo: number): void {
    if (!this.ambiente().atmosfera) return;
    r.vy = Math.max(0, vyCorpo) + Math.max(0, r.vy - vyCorpo) * 0.5;
  }

  // ─── the hull loss ────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * A hit that did not kill: if it crossed an HP threshold of the class, the body loses a bite on the side the shot
   * came from (`perto` overrides where: the spider's legs).
   */
  ferir(
    s: Phaser.GameObjects.Sprite,
    hpAntes: number,
    hpDepois: number,
    hpMax: number,
    classe: Classe,
    material: Material,
    de?: Ponto,
    perto?: (bmp: Bitmap) => Ponto,
  ): void {
    if (hpDepois <= 0 || hpMax <= 0) return;
    const L = DESTROCOS.lasca[classe];
    const a = hpAntes / hpMax, b = hpDepois / hpMax;
    const cruzou = L.limiares(hpMax).filter((f) => a > f && b <= f).length;
    for (let i = 0; i < cruzou; i++) this.morder(s, classe, material, de, perto);
  }

  /**
   * A body that takes damage by many roads (a boss: shot, bomb, cards; the dolphin): its life (0–1) is watched every
   * frame instead. `mira` (world) = where the bites land (the serpent's live head; a list = in turn, one per bite: the
   * tower), else the side facing `de`; `furo: false` = pieces torn off without a hole (see `CHEFOES`).
   */
  vigiar(
    s: Phaser.GameObjects.Sprite,
    fracao: number,
    classe: Classe,
    material: Material,
    de?: Ponto,
    o: { mira?: Ponto | Ponto[]; furo?: boolean } = {},
  ): void {
    const antes = this.vidaVista.get(s) ?? 1;
    this.vidaVista.set(s, fracao);
    if (fracao >= antes || fracao <= 0) return;
    const cruzou = DESTROCOS.lasca[classe].limiares(Infinity).filter((f) => antes > f && fracao <= f).length;
    const miras = Array.isArray(o.mira) ? o.mira : o.mira ? [o.mira] : [];
    for (let i = 0; i < cruzou; i++) {
      const m = miras.length ? miras[(this.vezes.get(s) ?? 0) % miras.length] : undefined;
      this.vezes.set(s, (this.vezes.get(s) ?? 0) + 1);
      this.morder(s, classe, material, de, m ? (bmp: Bitmap) => this.noBitmap(s, bmp, m) : undefined, o.furo ?? true);
    }
  }

  /** How many bites a watched body has taken (the turn of its `mira` list). */
  private readonly vezes = new WeakMap<Phaser.GameObjects.Sprite, number>();

  /**
   * The scars of a body that became another art (the serpent's head died and the art changed; the guardian became the
   * predator, on the same sprite): the holes, the rim and the wounds go with the old art. The life watched stays.
   */
  esquecer(s: Phaser.GameObjects.Sprite): void {
    const cic = this.cicatrizes.get(s);
    if (!cic) return;
    this.desfurar(s, cic);
    this.cicatrizes.delete(s);
  }

  /** The layers go over a boss drawn higher than them (the serpent, at 30): its rim and pieces must show over it. */
  acima(depth: number): void {
    const d = Math.max(this.depth, depth + 0.02);
    if (d === this.depthAgora) return;
    this.depthAgora = d;
    this.fumo.depth = d === this.depth ? d - 0.06 : d - 0.01;
    this.tela.depth = d;
    this.brilho.depth = d + 0.01;
  }

  private depthAgora = 0;

  /**
   * One bite now (the boss's death pops bite too). `furo: false` = the piece flies off, but the body keeps its pixels
   * (no scar): for a body whose poses would carry a hole to the wrong place.
   */
  morder(s: Phaser.GameObjects.Sprite, classe: Classe, material: Material, de?: Ponto, perto?: (bmp: Bitmap) => Ponto, furo = true): void {
    const vis = this.visto(s);
    const cic = furo ? this.cicatrizDe(s, vis, material, classe) : undefined;
    const d = cic ? this.emDia(s, cic) : null;
    const atual: Bitmap = d ? { w: vis.w, h: vis.h, cor: vis.cor.map((c, k) => (d.comido[k] ? 0 : c)) } : vis;
    let n = 0;
    for (const c of atual.cor) if (c >>> 24 >= 128) n++;
    const L = DESTROCOS.lasca[classe];
    const alvo = Math.min(L.max, Math.max(L.min, Math.round(n * L.fracao)));
    if (n < alvo * 2) return;
    const base = this.corpoDoSprite(s, material, false);
    if (!base) return;
    const alvoPonto = perto ? perto(atual) : de ? this.ladoNoBitmap(base, de) : undefined;
    const torto = ruido(vis.w, vis.h, 3, this.rnd);
    // (its own luck: every frame of the animation replays this bite the same way — `aplicar`)
    const semente = Math.floor(this.rnd() * 1e9);
    const l = lasca(atual, [0, 1], alvo, torto, DESTROCOS.lasca.torto, sorte(semente), alvoPonto);
    if (!l) return;
    // what the bite left hanging goes with it (his report: the tower's first bite left pixels floating)
    const cortados: number[] = [];
    l.mascara.forEach((m, k) => m === 2 && cortados.push(k));
    const vivo = (k: number): boolean => atual.cor[k] >>> 24 >= 128 && l.mascara[k] !== 2;
    for (const k of soltos(vis.w, vis.h, vivo, cortados, this.ilhaMax(d?.vivos ?? n))) l.mascara[k] = 2;
    if (cic && d) {
      cic.golpes.push({ tipo: 'mordida', alvo, perto: alvoPonto && { x: alvoPonto.x - d.dx, y: alvoPonto.y - d.dy }, torto, semente, t: this.t });
      cic.feridas.push({ x: l.centro.x - 0.5 - d.dx, y: l.centro.y - 0.5 - d.dy });
    }
    // the bitten piece flies off, out of the body through the bite (without a hole: torn off a body that stays whole —
    // a flesh creature's chunk in its spray)
    const soBite: Bitmap = { w: atual.w, h: atual.h, cor: atual.cor.map((c, k) => (l.mascara[k] === 2 ? c : 0)) };
    const partes = classe === 'chefe' ? 3 : classe === 'mini' ? 2 : 1;
    const [wx, wy] = this.noMundo(base, l.centro.x - 0.5, l.centro.y - 0.5);
    const [px, py] = this.noMundo(base, base.ox - 0.5, base.oy - 0.5);
    const dd = Math.hypot(wx - px, wy - py) || 1;
    const ux = (wx - px) / dd, uy = (wy - py) / dd;
    // (a flesh boss's bitten piece keeps no red line either — the serpent's fusion threw them pink-rimmed: `Corpo.limpa`)
    const limpa = classe === 'chefe' && (material === 'carne' || material === 'biomec');
    for (const p of soltarLasca(atual, l.mascara, sementesEspalhadas(soBite, partes, 2, this.rnd), torto, 1.5)) {
      const r = this.pecaDe(base, p, this.t);
      if (!r) continue;
      const v = this.entre(DESTROCOS.lasca.vel), a = (this.rnd() - 0.5) * 1.1;
      r.vx = base.vx + (ux * Math.cos(a) - uy * Math.sin(a)) * v;
      r.vy = base.vy + (ux * Math.sin(a) + uy * Math.cos(a)) * v;
      r.w = (this.rnd() < 0.5 ? -1 : 1) * this.entre(DESTROCOS.lasca.giro);
      r.some = this.t + 0.5 + this.rnd() * 0.35;
      r.someEm = 0.25;
      r.calor = 0.35;
      r.limpa = limpa;
      r.fumacaAte = p.n >= 12 ? this.t + 0.4 : 0;
      this.corpos.push(r);
    }
    const porte = DESTROCOS.porte(alvo * 6);
    this.faiscas(material, wx, wy, base.vx + ux * 30, base.vy + uy * 30, Math.round(5 * porte), 0.8);
    if (material === 'metal' || material === 'biomec') this.estouro(material, wx, wy, DESTROCOS.lasca.estouro[classe], false);
    if (material === 'carne' || material === 'biomec') this.gotas(wx, wy, base.vx + ux * 25, base.vy + uy * 25, 6 + alvo / 3);
  }

  /**
   * A HIT'S MARK (27/10, his rule: *"pense nos inimigos … como um asset, cada tiro tira 1 px da borda do asset, para
   * começar a deformá-lo"*): the hit eats the first pixel of the body on its own line, from the side it came — the
   * edge, never the inside (the 1st version took the body pixel nearest to where the bullet met the hitbox, and a boss's
   * hitbox sits inside its art: the guardian's marks dug one column into the middle of its shell, a stain). A run of
   * hits on one place digs a narrow V (`DESTROCOS.marca.sulco`); an explosion's pixels a small round bite. What the cut
   * left hanging falls. The pixels fly off in their own colour.
   *   - `furo: false` (the predator, the dolphin): the pixel flies, and the body keeps it;
   *   - `zona` (world, the serpent's live head): only pixels inside it — the coils in front of it are not what was hit;
   *   - `rumo`: the shot's flight (unit), else from `de` to the sprite;
   *   - `dureza`: a hard body (a wreck's metal, 2) loses a pixel every that many px.
   * Returns where it hit (world): the spark goes there, on the edge, not where the bullet met the hitbox.
   */
  marcar(
    s: Phaser.GameObjects.Sprite,
    px: number,
    de: Ponto,
    classe: Classe,
    material: Material,
    furo = true,
    o: { zona?: Ponto & { r: number }; rumo?: Ponto; dureza?: number } = {},
  ): Ponto | null {
    if (!s.active || px <= 0) return null;
    const vis = this.visto(s);
    const cic = furo ? this.cicatrizDe(s, vis, material, classe) : undefined;
    const d = cic ? this.emDia(s, cic) : null;
    const vivo = (k: number): boolean => vis.cor[k] >>> 24 >= 128 && !d?.comido[k];
    // the side the hit came from, in the drawn frame
    const rx = o.rumo?.x ?? s.x - de.x, ry = o.rumo?.y ?? s.y - de.y;
    const rn = Math.hypot(rx, ry) || 1;
    const cr = Math.cos(-s.rotation), sr = Math.sin(-s.rotation);
    const lx = cr * rx - sr * ry, ly = sr * rx + cr * ry;
    const lado = Math.abs(lx) >= Math.abs(ly) ? (lx > 0 ? 0 : 1) : ly > 0 ? 2 : 3;
    const horiz = lado < 2;
    const p = this.noBitmap(s, vis, de);
    const alvo = Math.floor(horiz ? p.y : p.x);
    const zona = o.zona ? { ...this.noBitmap(s, vis, o.zona), r: o.zona.r } : undefined;
    const off = d ? (horiz ? d.dy : d.dx) : 0;
    const M = DESTROCOS.marca;
    // a shot goes down its own line (a narrow V); an explosion's pixels spread into a small round bite
    const sulco = px > 1 ? 1 : M.sulco;
    const escolher = (): { q: number; k: number } | null => {
      let melhor: { q: number; k: number } | null = null, custo = Infinity;
      for (let q = alvo - M.alcance; q <= alvo + M.alcance; q++) {
        const k = this.primeiroDaFaixa(vis, lado, q, zona, vivo);
        if (k < 0) continue;
        const c = (cic?.fundo.get(`${lado}:${q - off}`) ?? 0) + Math.abs(q - alvo) * sulco + this.rnd() * 0.9;
        if (c < custo) {
          custo = c;
          melhor = { q, k };
        }
      }
      if (melhor) return melhor;
      // the hit's lanes miss the body (a bomb from above it): the nearest lane that has it
      const fim = horiz ? vis.h : vis.w;
      for (let r = M.alcance + 1; r < fim + Math.abs(alvo); r++) {
        for (const q of [alvo - r, alvo + r]) {
          const k = this.primeiroDaFaixa(vis, lado, q, zona, vivo);
          if (k >= 0) return { q, k };
        }
      }
      return null;
    };
    let n = px;
    if (cic) {
      const total = px / Math.max(1, o.dureza ?? 1) + cic.sobra;
      n = Math.floor(total + 1e-6);
      cic.sobra = total - n;
    }
    const tirados: number[] = [], caem: number[] = [];
    let primeiro = -1;
    if (!cic || !d || n === 0) {
      // no hole: a body that changes pose keeps its pixels (but the hit's pixel flies), a hard one only sparks
      const e = escolher();
      if (!e) return null;
      primeiro = e.k;
      if (!cic) tirados.push(e.k);
    } else {
      for (let i = 0; i < n; i++) {
        const e = escolher();
        if (!e) break;
        if (primeiro < 0) primeiro = e.k;
        const faixa = e.q - off;
        cic.golpes.push({ tipo: 'marca', lado, faixa, t: this.t, zona: zona && { x: zona.x - d.dx, y: zona.y - d.dy, r: zona.r } });
        cic.fundo.set(`${lado}:${faixa}`, (cic.fundo.get(`${lado}:${faixa}`) ?? 0) + 1);
        const r = this.aplicar(cic, d);
        tirados.push(...r.tirados);
        caem.push(...r.caem);
      }
      // this frame's copy, then the other frames
      const chave = cic.furados.get(this.idDoQuadro(s));
      if (chave && tirados.length + caem.length) this.furarNaCopia(cic, chave, [...tirados, ...caem]);
      else if (chave === '') cic.furados.delete(this.idDoQuadro(s));
    }
    if (primeiro < 0) return null;
    const base = { ox: s.originX * vis.w, oy: s.originY * vis.h, x: s.x, y: s.y, ang: s.rotation };
    const corpo = (s.body as Phaser.Physics.Arcade.Body | null) ?? null;
    const herda = DESTROCOS.mundo.herda;
    const bvx = (corpo?.velocity.x ?? 0) * herda, bvy = (corpo?.velocity.y ?? 0) * herda;
    // the pixels fly off, back out of the face they were hit on, in their own colour
    for (const k of tirados) {
      const x = k % vis.w, y = (k - x) / vis.w;
      const [wx, wy] = this.noMundo(base, x, y);
      const a = Math.atan2(-ry / rn, -rx / rn) + (this.rnd() - 0.5) * 1.6, v = this.entre(M.vel);
      this.brasas.add(wx, wy, bvx + Math.cos(a) * v, bvy + Math.sin(a) * v, this.entre(M.vida), 0.9, vis.cor[k], 1, RAMPA_DO[material], this.rnd());
    }
    // a part the cut left hanging falls off, in one piece
    if (caem.length) {
      const rot = new Int32Array(vis.w * vis.h).fill(-1);
      for (const k of caem) rot[k] = 0;
      const c = componentes(rot, vis.w, vis.h);
      const solto = this.corpoDoSprite(s, material, false);
      if (solto) {
        for (const pd of extrair(vis, c.rot, c.n)) {
          const r = this.pecaDe(solto, pd, this.t);
          if (!r) continue;
          r.vx = solto.vx + (rx / rn) * 14 + (this.rnd() - 0.5) * 12;
          r.vy = solto.vy + this.rnd() * 10;
          r.w = (this.rnd() - 0.5) * 3;
          r.some = this.t + 0.9 + this.rnd() * 0.5;
          r.someEm = 0.35;
          r.calor = 0.25;
          r.fumacaAte = 0;
          this.corpos.push(r);
        }
      }
    }
    const x0 = primeiro % vis.w, y0 = (primeiro - x0) / vis.w;
    const [wx, wy] = this.noMundo(base, x0, y0);
    if (material === 'metal') this.brasas.add(wx, wy, (this.rnd() - 0.5) * 60, -20 - this.rnd() * 40, 0.15 + this.rnd() * 0.15, 1, 0, 0, 0, 0);
    if ((material === 'carne' || material === 'biomec') && px >= 3) this.gotas(wx, wy, 0, 0, px);
    // rock: a puff of dust off the face it was hit on (no spark: stone does not spark)
    if (material === 'rocha') this.fumos.add(wx, wy, bvx - (rx / rn) * 10, bvy - (ry / rn) * 10, 0.4 + this.rnd() * 0.3, 0.5, 1.6 + Math.min(2, px * 0.5), FUMO_DO.rocha);
    return { x: wx, y: wy };
  }

  /**
   * The first live pixel along lane `q` of a drawn frame, from side `lado`; −1 = none. With a `zona`, the first one
   * inside it that is on an EDGE (the pixel before it on the lane is not body): where the neck runs into the zone, its
   * circle is no edge (27/10: the marks drew the circle's arc across the serpent's neck).
   */
  private primeiroDaFaixa(b: Bitmap, lado: number, q: number, zona: { x: number; y: number; r: number } | undefined, vivo: (k: number) => boolean): number {
    const horiz = lado < 2;
    if (q < 0 || q >= (horiz ? b.h : b.w)) return -1;
    const len = horiz ? b.w : b.h;
    let antes = false;
    for (let i = 0; i < len; i++) {
      const u = lado === 0 || lado === 2 ? i : len - 1 - i;
      const x = horiz ? u : q, y = horiz ? q : u;
      const k = y * b.w + x;
      const v = vivo(k);
      if (v && !antes && (!zona || (x + 0.5 - zona.x) ** 2 + (y + 0.5 - zona.y) ** 2 <= zona.r * zona.r)) return k;
      antes = v;
    }
    return -1;
  }

  /** The biggest part a cut may leave hanging that still falls off (a bigger one is the body). */
  private ilhaMax(vivos: number): number {
    return Math.max(24, Math.round(vivos * DESTROCOS.marca.ilha));
  }

  /** The drawn frame's key (a holed copy counts as the frame it copies). */
  private idDoQuadro(s: Phaser.GameObjects.Sprite): string {
    const o = this.furoParaOriginal.get(s.frame.texture.key);
    return `${o?.key ?? s.frame.texture.key}:${o?.frame ?? s.frame.name}:${+s.flipX}${+s.flipY}`;
  }

  /**
   * The frame the sprite shows now, with every blow played on it (and punched into its holed copy, if it has one).
   * null = drawn at another size than its scar (a scale tween: no scar while it lasts).
   */
  private emDia(s: Phaser.GameObjects.Sprite, cic: Cicatriz): Desgaste | null {
    const vis = this.visto(s);
    if (vis.w !== cic.w || vis.h !== cic.h) return null;
    const id = this.idDoQuadro(s);
    let d = cic.desgastes.get(id);
    if (!d) {
      if (!cic.ref) cic.ref = vis;
      const [dx, dy] = registro(cic.ref, vis, DESTROCOS.marca.registro);
      let vivos = 0;
      for (const c of vis.cor) if (c >>> 24 >= 128) vivos++;
      const n = vis.w * vis.h;
      d = { bmp: vis, comido: new Uint8Array(n), aro: new Float32Array(n).fill(-1), aroDe: new Uint8Array(n), feitos: 0, fora: 0, dx, dy, vivos };
      cic.desgastes.set(id, d);
    }
    if (d.feitos < cic.golpes.length) {
      const r = this.aplicar(cic, d);
      const chave = cic.furados.get(id);
      if (r.tirados.length + r.caem.length) {
        if (chave) this.furarNaCopia(cic, chave, [...r.tirados, ...r.caem]);
        else if (chave === '') cic.furados.delete(id);
      }
    }
    return d;
  }

  /** The blows a frame has not taken yet, played on it: what each took (`tirados`), and what fell with it (`caem`). */
  private aplicar(cic: Cicatriz, d: Desgaste): { tirados: number[]; caem: number[] } {
    const { w, h } = d.bmp;
    const vivo = (k: number): boolean => d.bmp.cor[k] >>> 24 >= 128 && !d.comido[k];
    const tirados: number[] = [], caem: number[] = [];
    for (; d.feitos < cic.golpes.length; d.feitos++) {
      const g = cic.golpes[d.feitos];
      const novos: number[] = [];
      if (g.tipo === 'marca') {
        const zona = g.zona && { x: g.zona.x + d.dx, y: g.zona.y + d.dy, r: g.zona.r };
        const k = this.primeiroDaFaixa(d.bmp, g.lado, g.faixa + (g.lado < 2 ? d.dy : d.dx), zona, vivo);
        if (k >= 0) novos.push(k);
      } else {
        const img: Bitmap = { w, h, cor: d.bmp.cor.map((c, k) => (d.comido[k] ? 0 : c)) };
        const l = lasca(img, [0, 1], g.alvo, g.torto, DESTROCOS.lasca.torto, sorte(g.semente), g.perto && { x: g.perto.x + d.dx, y: g.perto.y + d.dy });
        if (l) l.mascara.forEach((m, k) => m === 2 && novos.push(k));
      }
      if (!novos.length) continue;
      const tipo = g.tipo === 'marca' ? 1 : 3;
      for (const k of novos) d.comido[k] = tipo;
      d.fora += novos.length;
      // (a mark's single pixel splits nothing when its live neighbours still hold together around it)
      const solto = novos.length === 1 && this.anelUnido(d.bmp, novos[0], vivo) ? [] : soltos(w, h, vivo, novos, this.ilhaMax(d.vivos));
      for (const k of solto) d.comido[k] = 2;
      d.fora += solto.length;
      // the rim: the body left touching what went
      for (const k of [...novos, ...solto]) {
        const x = k % w, y = (k - x) / w;
        for (const [dx, dy] of VIZINHOS) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const v = yy * w + xx;
          if (!vivo(v)) continue;
          d.aro[v] = g.t;
          d.aroDe[v] = tipo === 1 ? 3 : 1;
        }
      }
      tirados.push(...novos);
      caem.push(...solto);
    }
    return { tirados, caem };
  }

  /** Do the live pixels around `k` still hold together (8-way) within its ring? Then taking it splits nothing. */
  private anelUnido(b: Bitmap, k: number, vivo: (k: number) => boolean): boolean {
    const x = k % b.w, y = (k - x) / b.w;
    const anel: [number, number][] = [];
    for (const [dx, dy] of OITO) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= b.w || yy >= b.h) continue;
      if (vivo(yy * b.w + xx)) anel.push([dx, dy]);
    }
    if (anel.length <= 1) return true;
    const grupo = anel.map((_, i) => i);
    const raiz = (i: number): number => (grupo[i] === i ? i : (grupo[i] = raiz(grupo[i])));
    for (let i = 0; i < anel.length; i++) {
      for (let j = i + 1; j < anel.length; j++) {
        if (Math.abs(anel[i][0] - anel[j][0]) <= 1 && Math.abs(anel[i][1] - anel[j][1]) <= 1) grupo[raiz(i)] = raiz(j);
      }
    }
    const r0 = raiz(0);
    return anel.every((_, i) => raiz(i) === r0);
  }

  /** The scar of a live sprite, made the first time it is hit (and anew when it is drawn at another size). */
  private cicatrizDe(s: Phaser.GameObjects.Sprite, vis: Bitmap, material: Material, classe: Classe): Cicatriz {
    const cic = this.cicatrizes.get(s);
    if (cic && cic.w === vis.w && cic.h === vis.h) return cic;
    if (cic) this.desfurar(s, cic);
    const nova: Cicatriz = {
      id: serieFuro++,
      w: vis.w,
      h: vis.h,
      golpes: [],
      fundo: new Map(),
      ref: null,
      desgastes: new Map(),
      sobra: 0,
      feridas: [],
      mat: material,
      classe,
      relogio: 0,
      furados: new Map(),
      origem: new Map(),
      copias: new Map(),
    };
    this.cicatrizes.set(s, nova);
    s.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.removerFurados(nova);
      if (this.cicatrizes.get(s) === nova) this.cicatrizes.delete(s);
      this.vidaVista.delete(s);
    });
    return nova;
  }

  /** New holes (drawn-frame pixels) punched straight into one holed copy (no new texture per shot: a boss takes a hundred). */
  private furarNaCopia(cic: Cicatriz, chave: string, novos: number[]): void {
    const c = cic.copias.get(chave);
    const tex = this.scene.textures.exists(chave) ? (this.scene.textures.get(chave) as Phaser.Textures.CanvasTexture) : null;
    if (!c || !tex) return;
    const w = cic.w, h = cic.h;
    for (const k of novos) {
      let dx = k % w, dy = (k - dx) / w;
      if (c.fx) dx = w - 1 - dx;
      if (c.fy) dy = h - 1 - dy;
      // the source pixels whose centre falls in this drawn pixel (the same rule `furar` used)
      for (let sy = Math.max(0, Math.floor((dy * c.fh) / h) - 1); sy <= Math.min(c.fh - 1, Math.ceil(((dy + 1) * c.fh) / h)); sy++) {
        if (Math.min(h - 1, Math.floor(((sy + 0.5) * h) / c.fh)) !== dy) continue;
        for (let sx = Math.max(0, Math.floor((dx * c.fw) / w) - 1); sx <= Math.min(c.fw - 1, Math.ceil(((dx + 1) * c.fw) / w)); sx++) {
          if (Math.min(w - 1, Math.floor(((sx + 0.5) * w) / c.fw)) !== dx) continue;
          tex.context.clearRect(sx, sy, 1, 1);
        }
      }
    }
    // (sent to the GPU once, when this drawing ends: a shotgun's five pellets are one upload)
    this.sujas.add(tex);
  }

  /** The holed copies punched since the last drawing. */
  private readonly sujas = new Set<Phaser.Textures.CanvasTexture>();

  // ─── the clock ────────────────────────────────────────────────────────────────────────────────────────────────────

  update(dt: number): void {
    if (this.acabou) return;
    this.t += dt;
    if (this.pendentes.length) {
      const agora = this.pendentes.filter((p) => p.em <= this.t);
      if (agora.length) {
        this.pendentes = this.pendentes.filter((p) => p.em > this.t);
        for (const p of agora) p.f();
      }
    }
    const M = DESTROCOS.mundo;
    const amb = this.ambiente();
    const g = amb.atmosfera ? M.gravidade : 0;
    const arr = amb.atmosfera ? M.arrasto.atmosfera : M.arrasto.vacuo;
    const ax = (amb.atmosfera ? M.deriva.atmosfera : M.deriva.vacuo) * 0.4;
    const freio = Math.max(0, 1 - arr * dt);
    this.relogioFumaca -= dt;
    const fumacaAgora = this.relogioFumaca <= 0;
    if (fumacaAgora) this.relogioFumaca = DESTROCOS.fumaca.cada;
    for (const c of this.corpos) {
      c.vx = c.vx * freio + ax * dt;
      c.vy = c.vy * freio + (g + c.cair) * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ang += c.w * dt;
      if (c.tempos) this.queimarAte(c);
      if (fumacaAgora && this.t < c.fumacaAte) this.soltarFumo(c.mat, c.x, c.y, c.vx, c.vy, c.queimaAte > 0 ? 1.3 : 1);
      // the hot cut sheds embers; flesh drips
      const calor = Math.max(0, 1 - (this.t - c.t0) / Math.max(0.05, c.calor));
      if (c.bordas.length && this.t < c.some) {
        const taxa = (c.mat === 'carne' || c.mat === 'biomec' ? 10 : 14 * calor) * Math.min(1, c.n / 30);
        if (this.rnd() < taxa * dt) {
          const k = c.bordas[Math.floor(this.rnd() * c.bordas.length)];
          const [wx, wy] = this.noMundo(c, k % c.bmp.w, Math.floor(k / c.bmp.w));
          if (c.mat === 'carne') this.gotas(wx, wy, c.vx * 0.6, c.vy * 0.6, 1);
          else this.brasas.add(wx, wy, c.vx * 0.6 + (this.rnd() - 0.5) * 24, c.vy * 0.6 + (this.rnd() - 0.5) * 24, 0.25 + this.rnd() * 0.4, 0.95, 0, 0, RAMPA_DO[c.mat], this.rnd());
        }
      }
      // the burning wreck sparks from anywhere on it
      if (c.queimaAte > this.t && this.rnd() < 18 * dt) {
        const p = this.pixelAoAcaso(c);
        if (p) {
          const [wx, wy] = this.noMundo(c, p.x, p.y);
          this.brasas.add(wx, wy, c.vx - 20 - this.rnd() * 30, c.vy + (this.rnd() - 0.5) * 30, 0.2 + this.rnd() * 0.3, 1, 0, 0, RAMPA_DO[c.mat], 0);
        }
      }
    }
    this.corpos = this.corpos.filter((c) => this.t < c.some + c.someEm && c.x > -80 && c.x < W + 80 && c.y < H + 80 && c.y > -80);
    this.brasas.passo(dt, ax * 0.5, g, arr * 1.6);
    this.fumos.passo(dt, ax * 0.8, amb.atmosfera ? -18 : 0, 1.2);
    this.feridas(dt);
  }

  private relogioFumaca = 0;

  /** The wounds of the live sprites: smoke and sparks (metal), droplets (flesh), embers (light). */
  private feridas(dt: number): void {
    for (const [s, cic] of this.cicatrizes) {
      if (!s.active || !cic.feridas.length) continue;
      cic.relogio -= dt;
      if (cic.relogio > 0) continue;
      cic.relogio = DESTROCOS.lasca[cic.classe].ferida * (0.7 + this.rnd() * 0.6);
      const f = cic.feridas[Math.floor(this.rnd() * cic.feridas.length)];
      // where the sprite is and how it moves (not `corpoDoSprite`: a copy of the whole frame per puff of smoke)
      const M = DESTROCOS.mundo;
      const corpo = (s.body as Phaser.Physics.Arcade.Body | null) ?? null;
      const base = {
        ox: s.originX * cic.w,
        oy: s.originY * cic.h,
        x: s.x,
        y: s.y,
        ang: s.rotation,
        vx: (corpo?.velocity.x ?? 0) * M.herda + (this.ambiente().atmosfera ? M.deriva.atmosfera : M.deriva.vacuo),
        vy: (corpo?.velocity.y ?? 0) * M.herda,
      };
      // (kept in the first frame's place: where it sits in this frame)
      const d = cic.desgastes.get(this.idDoQuadro(s));
      const [wx, wy] = this.noMundo(base, f.x + (d?.dx ?? 0), f.y + (d?.dy ?? 0));
      if (cic.mat === 'metal' || cic.mat === 'biomec') this.soltarFumo(cic.mat, wx, wy, base.vx, base.vy, cic.classe === 'comum' ? 0.6 : 0.9);
      if (cic.mat === 'metal' && this.rnd() < 0.45) {
        const a = -Math.PI / 2 + (this.rnd() - 0.5) * 2.4, v = 20 + this.rnd() * 40;
        this.brasas.add(wx, wy, base.vx + Math.cos(a) * v, base.vy + Math.sin(a) * v, 0.15 + this.rnd() * 0.25, 1, 0, 0, 0, 0);
      }
      if (cic.mat === 'carne' || (cic.mat === 'biomec' && this.rnd() < 0.5)) this.gotas(wx, wy, base.vx, base.vy + 10, 1);
      if (cic.mat === 'luz') this.brasas.add(wx, wy, base.vx + (this.rnd() - 0.5) * 16, base.vy + (this.rnd() - 0.5) * 16, 0.3 + this.rnd() * 0.4, 0.8, 0, 0, 1, 0);
    }
  }

  // ─── drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────

  private desenhar(): void {
    if (this.acabou) return;
    const ativo = this.corpos.length > 0 || this.brasas.n > 0 || this.fumos.n > 0 || this.cicatrizes.size > 0;
    if (!ativo && !this.sujo) return;
    this.tela.px.fill(0);
    this.brilho.px.fill(0);
    this.fumo.px.fill(0);
    this.desenharFumos();
    for (const [s, cic] of this.cicatrizes) {
      if (s.active) this.furar(s, cic);
      this.desenharCicatriz(s, cic);
    }
    for (const tex of this.sujas) if (tex.source?.length) tex.refresh();
    this.sujas.clear();
    for (const c of this.corpos) this.desenharCorpo(c, (k, cor, X, Y, i, j) => this.corDoCorpo(c, k, cor, X, Y, i, j));
    this.desenharBrasas();
    this.fumo.enviar();
    this.tela.enviar();
    this.brilho.enviar();
    this.sujo = ativo;
  }

  private desenharCorpo(c: Pick<Corpo, 'bmp' | 'ox' | 'oy' | 'x' | 'y' | 'ang'>, tingir: (k: number, cor: number, X: number, Y: number, i: number, j: number) => number): void {
    const cos = Math.cos(-c.ang), sin = Math.sin(-c.ang);
    const r = Math.ceil(Math.hypot(Math.max(c.ox, c.bmp.w - c.ox), Math.max(c.oy, c.bmp.h - c.oy))) + 1;
    const chao = this.ambiente().chao;
    const X0 = Math.floor(c.x) - r, Y0 = Math.floor(c.y) - r;
    for (let Y = Math.max(0, Y0); Y <= Math.min(H - 1, Y0 + 2 * r); Y++) {
      if (chao !== undefined && Y >= chao) continue;
      for (let X = Math.max(0, X0); X <= Math.min(W - 1, X0 + 2 * r); X++) {
        const dx = X + 0.5 - c.x, dy = Y + 0.5 - c.y;
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

  /** A piece's pixel: white in the flash, the cut hot (metal), glowing (light) or wet (flesh), the wreck charring. */
  private corDoCorpo(c: Corpo, k: number, cor: number, X: number, Y: number, i: number, j: number): number {
    if (this.t > c.some && bayer(i, j) < (this.t - c.some) / c.someEm) return 0;
    const rampa = RAMPAS[RAMPA_DO[c.mat]];
    if (this.t < c.branco) {
      const b = c.mat === 'carne' || c.mat === 'biomec' ? RAMPA_CARNE[RAMPA_CARNE.length - 1] : rampa[rampa.length - 1];
      this.luz(X, Y, b, 0.45);
      return b;
    }
    // the jellyfish: before its time the pixel glows as the front nears, then it is gone (it became an ember)
    if (c.tempos) {
      const d = c.tempos[k] - this.t;
      if (d <= 0) return 0;
      const B = DESTROCOS.desintegra.borda;
      if (d < B) {
        const h = 0.45 + 0.55 * (1 - d / B);
        const cc = corDaRampa(rampa, h);
        this.luz(X, Y, cc, h * 0.8);
        return cc;
      }
      return cor;
    }
    // the wreck chars as it falls
    if (c.queimaAte > 0) {
      const k2 = Math.min(1, (this.t - c.queimaDe) / Math.max(0.05, c.queimaAte - c.queimaDe));
      return this.carbonizar(cor, c.mat, 0.6 * k2);
    }
    if (c.manchas.length) {
      const m = this.corComManchas(c, k, cor);
      if (m.calor >= 0.3) {
        const cc = corDaRampa(rampa, Math.min(1, m.calor));
        this.luz(X, Y, cc, Math.min(1, m.calor) * 0.8);
        return cc;
      }
      return m.cor;
    }
    const idade = this.t - c.t0;
    const corte = c.corte[k];
    // rock: the fresh face flashes pale a moment, then stays a little lighter than the weathered one — no heat
    if (c.mat === 'rocha') {
      if (corte === 2) return idade < c.calor ? corDaRampa(rampa, 0.9) : clarear(cor, 0.5);
      return corte === 1 ? clarear(cor, 0.3) : cor;
    }
    if (c.mat === 'carne' || c.mat === 'biomec') {
      // a flesh boss's pieces: the torn edge is wet a moment, then its own colour darkened (no red line kept on them —
      // and the death's slow motion stretches the moment: 0.7 s here stayed pink for 1.5 s of the film)
      if (c.limpa && idade > 0.25) return corte === 2 ? escurecer(cor) : cor;
      // flesh does not burn: the torn edge is wet red, darkening
      if (corte === 2) return corDaRampa(RAMPA_CARNE, Math.max(0.4, 0.78 - 0.25 * Math.min(1, idade / 1.2)));
      if (corte === 1 && idade < 0.5) return corDaRampa(RAMPA_CARNE, 0.5);
      return cor;
    }
    const calor = corte === 2 ? 0.95 * (1 - idade / c.calor) : corte === 1 ? 0.5 * (1 - idade / (c.calor * 0.4)) : 0;
    if (calor >= 0.3) {
      const cc = corDaRampa(rampa, calor);
      if (calor >= 0.55) this.luz(X, Y, cc, (calor - 0.35) * 0.8);
      return cc;
    }
    if (c.mat === 'luz') return corte === 2 ? corDaRampa(rampa, 0.35) : cor;
    const carvao = corte === 2 ? 0.7 : c.carvao ? Math.min(c.carvao, idade / 1.6) : 0;
    return queimar(cor, carvao);
  }

  /**
   * The holes made real: the sprite shows a copy of its current frame with the bitten pixels transparent. The
   * animation sets the original frame back when it advances; this puts the copy back (each made once per version).
   */
  private furar(s: Phaser.GameObjects.Sprite, cic: Cicatriz): void {
    const key = s.texture.key;
    // showing its holed copy already: the blows since go into it (a frame takes them when it shows — 27/10: punching
    // every blow into all nine of the guardian's copies cost 2 ms a shot, with 20 ms peaks)
    if (cic.origem.has(key)) {
      this.emDia(s, cic);
      return;
    }
    const orig = { key, frame: s.frame.name };
    // (the mirror is in the id: the holes are mapped to the source through it)
    const id = `${orig.key}:${orig.frame}:${+s.flipX}${+s.flipY}`;
    let nova = cic.furados.get(id);
    // drawn at another size now (a scale tween: the serpent's fusion squeezes it) — no hole while it lasts, nor cached
    const w = cic.w, h = cic.h;
    if (Math.max(1, Math.round(s.frame.cutWidth * Math.abs(s.scaleX))) !== w || Math.max(1, Math.round(s.frame.cutHeight * Math.abs(s.scaleY))) !== h) return;
    if (nova === '') {
      // nothing of this frame was gone: a blow since may have changed that
      const d = this.emDia(s, cic);
      if (!d?.fora) return;
      cic.furados.delete(id);
      nova = undefined;
    }
    if (nova) this.emDia(s, cic);
    if (nova === undefined) {
      // this frame with every blow played on it ('' = nothing of it gone — not read again until the next blow)
      const d = this.emDia(s, cic);
      if (!d) return;
      cic.furados.set(id, '');
      const fonte = lerFrame(s.frame);
      // the frame drawn is the source scaled and mirrored: is this source pixel's drawn pixel gone?
      let algum = false;
      for (let sy = 0; sy < fonte.h; sy++) {
        let dy = Math.min(h - 1, Math.floor(((sy + 0.5) * h) / fonte.h));
        if (s.flipY) dy = h - 1 - dy;
        for (let sx = 0; sx < fonte.w; sx++) {
          let dx = Math.min(w - 1, Math.floor(((sx + 0.5) * w) / fonte.w));
          if (s.flipX) dx = w - 1 - dx;
          if (d.comido[dy * w + dx]) {
            fonte.cor[sy * fonte.w + sx] = 0;
            algum = true;
          }
        }
      }
      if (!algum) return;
      nova = `destrocos-furo-${cic.id}-${serieCopia++}`;
      const tex = this.scene.textures.createCanvas(nova, fonte.w, fonte.h);
      if (!tex) return;
      const img = tex.context.createImageData(fonte.w, fonte.h);
      new Uint32Array(img.data.buffer).set(fonte.cor);
      tex.context.putImageData(img, 0, 0);
      tex.refresh();
      cic.furados.set(id, nova);
      cic.origem.set(nova, orig);
      cic.copias.set(nova, { fw: fonte.w, fh: fonte.h, fx: s.flipX, fy: s.flipY });
      this.furoParaOriginal.set(nova, orig);
    }
    s.setTexture(nova);
  }

  /** Back to the original frame (a new bite makes the copies again). */
  private desfurar(s: Phaser.GameObjects.Sprite, cic: Cicatriz): void {
    const o = cic.origem.get(s.texture.key);
    if (o && s.active) s.setTexture(o.key, o.frame);
    this.removerFurados(cic);
  }

  private removerFurados(cic: Cicatriz): void {
    for (const k of cic.furados.values()) {
      if (!k) continue;
      this.furoParaOriginal.delete(k);
      if (this.scene.textures?.exists(k)) this.scene.textures.remove(k);
    }
    cic.furados.clear();
    cic.origem.clear();
    cic.copias.clear();
  }

  /**
   * The scar over a live sprite: the hole is real (`furar`); over it, the RIM — hot a moment, then charred with
   * embers that keep flickering (metal: it is still burning), the open wound's red (flesh), its own glow (light).
   */
  private desenharCicatriz(s: Phaser.GameObjects.Sprite, cic: Cicatriz): void {
    if (!s.active || !s.visible || s.alpha < 0.05) return;
    const d = this.emDia(s, cic);
    if (!d) return;
    const vis = d.bmp;
    const corpo = { bmp: vis, ox: s.originX * vis.w, oy: s.originY * vis.h, x: s.x, y: s.y, ang: s.rotation };
    const rampa = RAMPAS[RAMPA_DO[cic.mat]];
    const carne = cic.mat === 'carne' || cic.mat === 'biomec';
    const quadro = Math.floor(this.t * 10);
    this.desenharCorpo(corpo, (k, cor, X, Y) => {
      if (d.comido[k] || d.aro[k] < 0) return 0;
      const m = d.aroDe[k];
      const calor = 0.9 * (1 - (this.t - d.aro[k]) / (m === 3 ? DESTROCOS.marca.calor : DESTROCOS.lasca.calor));
      // rock: a pale flash of dust, then the fresh face — never a glow
      if (cic.mat === 'rocha') return calor >= 0.3 ? corDaRampa(rampa, 0.75) : clarear(cor, 0.5);
      if (calor >= 0.3) {
        if (carne) return corDaRampa(RAMPA_CARNE, 0.55 + 0.3 * calor);
        const h = corDaRampa(rampa, calor);
        if (calor >= 0.5) this.luz(X, Y, h, (calor - 0.3) * 0.8);
        return h;
      }
      // a mark's rim: charred (metal), the wound's red (flesh), its own colour darkened (biomec — 27/10: the flesh red on
      // the guardian's brown shell drew a pink line along the edge, his "mancha"), its own glow (light) — no embers
      if (m === 3) {
        if (cic.mat === 'carne') return corDaRampa(RAMPA_CARNE, 0.62);
        return cic.mat === 'luz' ? corDaRampa(rampa, 0.5) : queimar(cor, cic.mat === 'biomec' ? 0.6 : 0.75);
      }
      const brasa = hash(k, quadro) < (cic.mat === 'metal' ? 0.22 : cic.mat === 'biomec' ? 0.1 : 0);
      if (brasa) {
        const h = corDaRampa(RAMPA_FOGO, 0.5 + 0.3 * hash(k + 7, quadro));
        this.luz(X, Y, h, 0.3);
        return h;
      }
      // (a flesh BOSS's bite: its own colour darkened, not the wound's pink — on the serpent's fusion and the guardian's
      // tubes the pink rim drew long fixed lines, his *"marcas cor avermelhadas fixadas"*; the commons keep the red)
      if (carne) return cic.classe === 'chefe' ? escurecer(cor) : corDaRampa(RAMPA_CARNE, 0.68);
      if (cic.mat === 'luz') {
        const h = corDaRampa(rampa, 0.55 + 0.15 * Math.sin(this.t * 6 + k));
        this.luz(X, Y, h, 0.25);
        return h;
      }
      return queimar(cor, 1);
    });
  }

  private desenharFumos(): void {
    const f = this.fumos;
    const D = DESTROCOS.fumaca.densidade;
    const chao = this.ambiente().chao;
    for (let n = 0; n < f.n; n++) {
      const [nucleo, borda] = FUMO[f.tom[n]];
      const k = f.idade[n] / f.vida[n];
      const r = f.r0[n] + (f.r1[n] - f.r0[n]) * Math.sqrt(k);
      const dens = D * (1 - k) * Math.min(1, k * 8 + 0.4);
      const cx = f.x[n], cy = f.y[n];
      const R = Math.ceil(r);
      for (let Y = Math.floor(cy) - R; Y <= Math.floor(cy) + R; Y++) {
        if (Y < 0 || Y >= H || (chao !== undefined && Y >= chao)) continue;
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

  private desenharBrasas(): void {
    const b = this.brasas;
    const chao = this.ambiente().chao;
    for (let n = 0; n < b.n; n++) {
      const X = Math.floor(b.x[n]), Y = Math.floor(b.y[n]);
      if (X < 0 || Y < 0 || X >= W || Y >= H || (chao !== undefined && Y >= chao)) continue;
      const rampa = RAMPAS[b.rampa[n]];
      const k = b.idade[n] / b.vida[n];
      if (b.tipo[n] === 2) {
        // a droplet: dark red, darkening; gone in dither at its end
        if (k > 0.7 && (k - 0.7) / 0.3 > b.limiar[n]) continue;
        this.tela.px[Y * W + X] = corDaRampa(RAMPA_CARNE, b.h0[n] * (1 - k * 0.5));
        continue;
      }
      const h = b.h0[n] * (1 - k * (b.tipo[n] === 1 ? 1.6 : 1));
      if (h >= 0.3) {
        const c = corDaRampa(rampa, h);
        this.tela.px[Y * W + X] = c;
        if (h >= 0.5) this.luz(X, Y, c, (h - 0.3) * 0.9);
        continue;
      }
      if (b.tipo[n] === 0) {
        if (h < 0.14) continue;
        this.tela.px[Y * W + X] = corDaRampa(rampa, h);
        continue;
      }
      if (k > 0.55 && (k - 0.55) / 0.45 > b.limiar[n]) continue;
      // (a chip keeps its own colour, charred — but gravel is stone: it stays as it was)
      this.tela.px[Y * W + X] = b.cor[n] ? (b.rampa[n] === RAMPA_DO.rocha ? b.cor[n] : queimar(b.cor[n], 1)) : rampa[0];
    }
  }

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

  // ─── the pieces of the effects ───────────────────────────────────────────────────────────────────────────────────

  /** The blast under the debris: the PixelLab sheet (metal, biomec), the jellyfish's discharge (light), none (flesh). */
  private estouro(mat: Material, x: number, y: number, tamanho: number, frente: boolean): void {
    // (a rock has no fire of its own: its blast is the PixelLab explosion the scene puts over it)
    if (tamanho <= 0 || mat === 'rocha') return;
    if (mat === 'luz') {
      this.fx.choque(x, y, tamanho * 0.6);
      return;
    }
    if (mat === 'carne') {
      this.scene.cameras.main.shake(60 * tamanho, 0.0025 * tamanho);
      return;
    }
    const depth = this.depth + (frente ? 0.03 : -0.03);
    const escala = mat === 'biomec' ? tamanho * 0.7 : tamanho;
    // the same sizes as `Fx.explode`: the small sheet, the 64 px one, the big one (a boss)
    if (escala <= 1.25) this.fx.sheetSprite('explosion-small', 'explosionSmallSheet', x, y, 1.1 * escala, depth);
    else if (escala <= 2) this.fx.sheetSprite('explosion', 'explosionSheet', x, y, 0.6 * escala, depth);
    else this.fx.sheetSprite('explosion-big', 'explosionBigSheet', x, y, 0.5 * escala, depth) ?? this.fx.sheetSprite('explosion', 'explosionSheet', x, y, 0.6 * escala, depth);
    this.scene.cameras.main.shake(70 * Math.min(2, escala), 0.003 * Math.min(2, escala));
  }

  /** Sparks (metal), cold embers (light), droplets (flesh) out of a point. */
  private faiscas(mat: Material, x: number, y: number, vx: number, vy: number, n: number, h0: number): void {
    if (mat === 'carne') return this.gotas(x, y, vx, vy, n * 1.5);
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2, v = 25 + this.rnd() * 55;
      this.brasas.add(x, y, vx + Math.cos(a) * v, vy + Math.sin(a) * v, 0.2 + this.rnd() * 0.35, h0, 0, 0, RAMPA_DO[mat === 'biomec' ? 'metal' : mat], this.rnd());
    }
    if (mat === 'biomec') this.gotas(x, y, vx, vy, n);
  }

  /** Flesh droplets out of a point. */
  private gotas(x: number, y: number, vx: number, vy: number, n: number): void {
    const C = DESTROCOS.carne;
    const conta = Math.round(n);
    for (let i = 0; i < conta; i++) {
      const a = this.rnd() * Math.PI * 2, v = this.entre(C.velGota);
      this.brasas.add(x + (this.rnd() - 0.5) * 2, y + (this.rnd() - 0.5) * 2, vx + Math.cos(a) * v, vy + Math.sin(a) * v, this.entre(C.vidaGota), 0.55 + this.rnd() * 0.3, 0, 2, 2, this.rnd(), C.gravidadeGota);
    }
  }

  /** The flesh's spray: droplets out of the whole body (per its pixels). */
  private spray(c: Corpo, mat: Material, k: number): void {
    if (mat !== 'carne' && mat !== 'biomec') return;
    const C = DESTROCOS.carne;
    const n = Math.round(c.n * C.gotasPorPx * k * (mat === 'biomec' ? 0.5 : 1));
    const [cx, cy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    for (let i = 0; i < n; i++) {
      const p = this.pixelAoAcaso(c);
      if (!p) return;
      const [wx, wy] = this.noMundo(c, p.x, p.y);
      const dx = wx - cx, dy = wy - cy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(C.velGota);
      this.brasas.add(wx, wy, c.vx + (dx / d) * v + (this.rnd() - 0.5) * 20, c.vy + (dy / d) * v + (this.rnd() - 0.5) * 20, this.entre(C.vidaGota), 0.55 + this.rnd() * 0.3, 0, 2, 2, this.rnd(), C.gravidadeGota);
    }
  }

  private soltarFumo(mat: Material, x: number, y: number, vx: number, vy: number, tamanho = 1): void {
    const F = DESTROCOS.fumaca;
    const atm = this.ambiente().atmosfera;
    this.fumos.add(
      x + (this.rnd() - 0.5) * 2,
      y + (this.rnd() - 0.5) * 2,
      vx * 0.3 - 6 - this.rnd() * 14,
      vy * 0.3 + (atm ? -6 - this.rnd() * 14 : (this.rnd() - 0.5) * 12),
      this.entre(F.vida),
      F.raio[0] * tamanho,
      F.raio[1] * tamanho * (0.8 + this.rnd() * 0.4),
      FUMO_DO[mat],
    );
  }

  /** The jellyfish: every pixel whose time came lets go as an ember of its glow. */
  private queimarAte(c: Corpo): void {
    const D = DESTROCOS.desintegra;
    const [ox, oy] = this.noMundo(c, c.ox - 0.5, c.oy - 0.5);
    while (c.proximo < c.ordem.length && c.tempos![c.ordem[c.proximo]] <= this.t) {
      const k = c.ordem[c.proximo++];
      const [wx, wy] = this.noMundo(c, k % c.bmp.w, Math.floor(k / c.bmp.w));
      const dx = wx - ox, dy = wy - oy, d = Math.hypot(dx, dy) || 1;
      const v = this.entre(D.vel);
      this.brasas.add(wx, wy, c.vx + (dx / d) * v + (this.rnd() - 0.5) * 10, c.vy + (dy / d) * v + (this.rnd() - 0.5) * 10, this.entre(D.vida), 0.85, 0, 0, RAMPA_DO[c.mat], this.rnd());
    }
    if (c.proximo >= c.ordem.length) c.some = this.t;
  }

  // ─── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * The frame the sprite shows, as the game draws it (scale, flip, its resting tint), read once per frame of its
   * animation. ⚠️ A sprite showing one of our HOLED copies is read through its ORIGINAL frame (the mask already knows
   * the holes): reading a canvas texture back is a GPU readback — 20 to 135 ms a frame in the first cost probe.
   */
  private visto(s: Phaser.GameObjects.Sprite): Bitmap {
    let f = s.frame;
    const o = this.furoParaOriginal.get(f.texture.key);
    if (o) f = this.scene.textures.getFrame(o.key, o.frame);
    const tint = (s.getData?.('tint') as number | undefined) ?? 0xffffff;
    const chave = `${f.texture.key}:${f.name}:${s.scaleX.toFixed(3)}:${s.scaleY.toFixed(3)}:${+s.flipX}:${+s.flipY}:${tint}`;
    let b = this.quadros.get(chave);
    if (!b) {
      if (this.quadros.size > 600) this.quadros.clear();
      b = reduzir(lerFrame(f), s.scaleX, s.scaleY, s.flipX, s.flipY, tint);
      this.quadros.set(chave, b);
    }
    return b;
  }

  /** The sprite as a body: its drawn frame with the scars already in it (the bites gone, the rims charred), where it is and how it moves. */
  private corpoDoSprite(s: Phaser.GameObjects.Sprite, mat: Material, comCicatriz = true): Corpo | null {
    const vis = this.visto(s);
    let cor = vis.cor;
    const cic = comCicatriz ? this.cicatrizes.get(s) : undefined;
    const d = cic ? this.emDia(s, cic) : null;
    if (d) cor = vis.cor.map((c, k) => (d.comido[k] ? 0 : d.aro[k] >= 0 && c ? this.carbonizar(c, mat, 1) : c));
    else cor = vis.cor.slice();
    let n = 0;
    for (const c of cor) if (c >>> 24 >= 128) n++;
    const M = DESTROCOS.mundo;
    const atm = this.ambiente().atmosfera;
    const corpo = (s.body as Phaser.Physics.Arcade.Body | null) ?? null;
    return {
      bmp: { w: vis.w, h: vis.h, cor },
      corte: new Uint8Array(vis.w * vis.h),
      ox: s.originX * vis.w,
      oy: s.originY * vis.h,
      x: s.x,
      y: s.y,
      ang: s.rotation,
      vx: (corpo?.velocity.x ?? 0) * M.herda + (atm ? M.deriva.atmosfera : M.deriva.vacuo),
      vy: (corpo?.velocity.y ?? 0) * M.herda,
      w: 0,
      n,
      some: Infinity,
      someEm: 1,
      t0: this.t,
      calor: 0.5,
      branco: 0,
      carvao: 0,
      bordas: [],
      fumacaAte: 0,
      mat,
      cair: 0,
      queimaDe: 0,
      queimaAte: 0,
      manchas: [],
      tempos: null,
      ordem: [],
      proximo: 0,
    };
  }

  /** A piece of a body as a body in the world (where the body holds it now); tiny bits become chips instead. */
  private pecaDe(c: Corpo, p: Pedaco, t0: number): Corpo | null {
    if (p.n < 4) {
      for (let k = 0; k < p.bmp.cor.length; k++) {
        if (!p.bmp.cor[k]) continue;
        const [wx, wy] = this.noMundo(c, p.x0 + (k % p.bmp.w), p.y0 + Math.floor(k / p.bmp.w));
        const a = this.rnd() * Math.PI * 2, v = 35 + this.rnd() * 45;
        if (c.mat === 'carne') this.gotas(wx, wy, c.vx, c.vy, 1);
        else this.brasas.add(wx, wy, c.vx + Math.cos(a) * v, c.vy + Math.sin(a) * v, 0.4 + this.rnd() * 0.5, 0.8, p.bmp.cor[k], 1, RAMPA_DO[c.mat], this.rnd());
      }
      return null;
    }
    const [x, y] = this.noMundo(c, p.cx - 0.5, p.cy - 0.5);
    const bordas: number[] = [];
    p.corte.forEach((v, k) => v === 2 && bordas.push(k));
    return {
      ...c,
      bmp: p.bmp,
      corte: p.corte,
      ox: p.cx - p.x0,
      oy: p.cy - p.y0,
      x,
      y,
      w: 0,
      n: p.n,
      t0,
      bordas,
      cair: 0,
      queimaDe: 0,
      queimaAte: 0,
      manchas: [],
      tempos: null,
      ordem: [],
      proximo: 0,
    };
  }

  /** The charred (metal), darkened (flesh) or dimmed (light) colour, `k` 0..1. */
  private carbonizar(cor: number, mat: Material, k: number): number {
    if (mat === 'luz') return queimar(cor, k * 0.6);
    // (rock does not char: its scar is the fresh, lighter face)
    if (mat === 'rocha') return clarear(cor, k * 0.5);
    return queimar(cor, k);
  }

  private corComManchas(c: Corpo, k: number, cor: number, assar = false): { cor: number; calor: number } {
    const i = k % c.bmp.w, j = Math.floor(k / c.bmp.w);
    let calor = 0, carvao = 0, molhado = 0;
    // (a flesh boss: a small mark — the radius grows with the body, and on the serpent's fusion it passed 20 px)
    const raio = c.limpa ? Math.min(5, Math.max(3.4, Math.sqrt(c.n) * 0.18)) : Math.max(3.4, Math.sqrt(c.n) * 0.18);
    for (const m of c.manchas) {
      const d = Math.hypot(i - m.u, j - m.v);
      if (d < raio) {
        carvao = 1;
        calor = Math.max(calor, (1 - (this.t - m.t0) / 0.55) * (1 - d / raio) * 1.3);
        molhado = Math.max(molhado, 1 - (this.t - m.t0) / 0.55);
      } else if (d < raio * 1.5) carvao = Math.max(carvao, 0.4);
    }
    // a flesh boss: the pop's wet splash a moment, then its own colour a little darker — never a red disc, and nothing
    // red baked into the pieces when it breaks (`assar`)
    if (c.limpa) return { cor: carvao >= 1 ? (!assar && molhado > 0.3 ? corDaRampa(RAMPA_CARNE, 0.5) : escurecer(cor)) : cor, calor: 0 };
    const carne = c.mat === 'carne' || c.mat === 'biomec';
    return { cor: carne ? (carvao ? corDaRampa(RAMPA_CARNE, carvao >= 1 ? 0.3 : 0.5) : cor) : queimar(cor, carvao), calor: carne ? 0 : calor };
  }

  /** A random opaque pixel of a body (bitmap coords). */
  private pixelAoAcaso(c: Corpo): Ponto | null {
    for (let tent = 0; tent < 40; tent++) {
      const k = Math.floor(this.rnd() * c.bmp.cor.length);
      if (c.bmp.cor[k] >>> 24 >= 128) return { x: k % c.bmp.w, y: Math.floor(k / c.bmp.w) };
    }
    return null;
  }

  /** A point far out on the side of the body that faces `de` (world), in the body's bitmap: the bite's/front's side. */
  private ladoNoBitmap(c: Pick<Corpo, 'bmp' | 'ox' | 'oy' | 'x' | 'y' | 'ang'>, de: Ponto): Ponto {
    const dx = de.x - c.x, dy = de.y - c.y, d = Math.hypot(dx, dy) || 1;
    const cos = Math.cos(-c.ang), sin = Math.sin(-c.ang);
    const lx = (cos * dx - sin * dy) / d, ly = (sin * dx + cos * dy) / d;
    const R = Math.max(c.bmp.w, c.bmp.h);
    return { x: c.ox + lx * R, y: c.oy + ly * R };
  }

  /** A world point in the sprite's drawn frame (its bitmap `bmp`): where a bite should land (the serpent's live head). */
  private noBitmap(s: Phaser.GameObjects.Sprite, bmp: Bitmap, p: Ponto): Ponto {
    const dx = p.x - s.x, dy = p.y - s.y;
    const cos = Math.cos(-s.rotation), sin = Math.sin(-s.rotation);
    return { x: s.originX * bmp.w + cos * dx - sin * dy, y: s.originY * bmp.h + sin * dx + cos * dy };
  }

  /** The shot's direction (unit) from `de` through the point: the side that blows out. */
  private rumoDoTiro(x: number, y: number, de?: Ponto): [number, number] {
    if (!de) return [1, 0];
    const dx = x - de.x, dy = y - de.y, d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  private noMundo(c: Pick<Corpo, 'ox' | 'oy' | 'x' | 'y' | 'ang'>, i: number, j: number): [number, number] {
    const lx = i + 0.5 - c.ox, ly = j + 0.5 - c.oy;
    const cos = Math.cos(c.ang), sin = Math.sin(c.ang);
    return [c.x + cos * lx - sin * ly, c.y + sin * lx + cos * ly];
  }

  private entre([a, b]: readonly number[]): number {
    return a + (b - a) * this.rnd();
  }

  /** Anything on screen (the films and tests wait for it to clear). */
  get ativo(): boolean {
    return this.corpos.length > 0 || this.brasas.n > 0 || this.fumos.n > 0 || this.pendentes.length > 0;
  }

  /** How many bites a live sprite carries (tests). */
  mordidas(s: Phaser.GameObjects.Sprite): number {
    return this.cicatrizes.get(s)?.feridas.length ?? 0;
  }

  /**
   * THE HOLE IS REAL FOR A BULLET (27/10, step 3 — him: *"eu acharia interessante que o buraco mudasse o jogo e
   * visual"*): does a bullet at (`x`, `y`), flying `rumo`, fly on into what the shots took off this sprite? Along its
   * lane, from the side it came: before the first live pixel some pixel was TAKEN, and the bullet has not reached that
   * live pixel yet — it flies on, and eats that pixel when it gets there; no live pixel left on the lane = a tunnel, and
   * it goes through. A lane with nothing taken before its first live pixel hits where it always did (the hitbox wider
   * than the art included: the balance does not change). The ship is not asked: it keeps hitting the whole shape.
   * (1st version: it only looked up to the bullet — and a wreck's hitbox starts before its art, so the bullet was caught
   * in that margin before it ever reached the tunnel.)
   */
  atravessa(s: Phaser.GameObjects.Sprite, x: number, y: number, rumo: Ponto): boolean {
    const cic = this.cicatrizes.get(s);
    if (!cic || !s.active) return false;
    const d = this.emDia(s, cic);
    if (!d || !d.fora) return false;
    const vis = d.bmp;
    const cr = Math.cos(-s.rotation), sr = Math.sin(-s.rotation);
    const lx = cr * rumo.x - sr * rumo.y, ly = sr * rumo.x + cr * rumo.y;
    const lado = Math.abs(lx) >= Math.abs(ly) ? (lx > 0 ? 0 : 1) : ly > 0 ? 2 : 3;
    const horiz = lado < 2;
    const p = this.noBitmap(s, vis, { x, y });
    const q = Math.floor(horiz ? p.y : p.x);
    if (q < 0 || q >= (horiz ? vis.h : vis.w)) return false;
    const len = horiz ? vis.w : vis.h;
    const ate = Math.floor(horiz ? p.x : p.y);
    const avante = lado === 0 || lado === 2;
    let tirado = false;
    for (let i = 0; i < len; i++) {
      const u = avante ? i : len - 1 - i;
      const k = horiz ? q * vis.w + u : u * vis.w + q;
      if (d.comido[k]) tirado = true;
      // the first live pixel: it flies on only if something was taken before it and it has not got there yet
      else if (vis.cor[k] >>> 24 >= 128) return tirado && (avante ? ate < u : ate > u);
    }
    return tirado;
  }

  /** How many of a live sprite's pixels are gone in the frame it shows now — bites, marks, what fell (tests). */
  furosDe(s: Phaser.GameObjects.Sprite): number {
    const cic = this.cicatrizes.get(s);
    const d = cic ? this.emDia(s, cic) : null;
    let n = 0;
    if (d) for (const v of d.comido) if (v) n++;
    return n;
  }

  destroy(): void {
    if (this.acabou) return;
    this.acabou = true;
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.desenhar, this);
    this.tela.destroy();
    this.brilho.destroy();
    this.fumo.destroy();
    this.cicatrizes.clear();
    this.quadros.clear();
  }
}
