/**
 * THE COCOON RAIN (spec §3.2; the mock's `misseis` — the 3rd round's zero-g rain with the 14th round's cocoon — lines
 * 1964–2007 and 2117–2128, ported with the plan's R1–R7).
 *
 * Each living head spits a salvo of nine cocoons up and out, engines off (vacuum: nothing bends them). Above the screen
 * they flip and burn, and come back nose-first FROM REST, one wave per head in its own colour, pushed down by the engine
 * at 160 px/s² — slow at the top (the warning), fast near the hull — and burst on the hull. Ten slots of 22 px, all in
 * front of her; a gap of 3 slots that walks one slot per wave. The A plays its own clip (`chuvaA`, the salvo at its strike
 * frame); the B the erguer (the salvo when the jaws open).
 *
 * ⚠️ THE POOL'S BULLET IS ONLY THE COLLISION BODY: invisible, `bolt2`, a centred box along the flight (9×9 rising on the
 * diagonal, 7×11 falling). The skill owns the motion — the mock's order each frame (the speed, the engine's gas, the
 * place, the burst) — and parks the body on the drawn cocoon, which the pixel layer draws. The game draws the gap's first
 * slot and its way (the mock always started at slot 3 and walked right: the plan's correction 4).
 */
import Phaser from 'phaser';
import { CONJUNTOS } from './gestosHab';
import type { CorpoSerpente, Habilidade } from './habilidade';
import { FPS_MAQUETE, HAB, cruza, gerador, inicioDoVao, vagasDosCasulos } from './numerosHab';
import { Particulas } from './particulas';
import { caudaDe, chamaCor, desenharSprite } from './projetil';
import { CASULOS } from './projeteisHab';
import type { Cor, Put } from './tipos';

interface Casulo {
  /** the collision body; null once let go (her head died: the drawing flies on, dissolving) */
  b: Phaser.Physics.Arcade.Sprite | null;
  token: number;
  cor: Cor;
  desce: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  morto: boolean;
}

/** the A's clip */
const CLIPE_A = 'chuvaA';
/** the clip's speed (the mock's 12 fps gestures) */
const FPS_CLIPE = 12;
/** if the gesture never reaches its strike (another gesture took her), the salvo leaves anyway */
const SEM_GESTO = 3;

export class Chuva implements Habilidade {
  readonly nome = 'chuva' as const;
  private t = 0;
  private n = 0;
  /** the skill's time at the salvo (null until the gesture strikes) */
  private tAcao: number | null = null;
  private abortado = false;
  private tAborto = 0;
  private cores: Cor[] = [];
  private casulos: Casulo[] = [];
  private p = new Particulas(Math.random);
  private acaso: () => number = Math.random;
  /** the waves that came in so far (the probes read it) */
  ondas = 0;
  /** each wave's slots (x) and its gap's centre (x), drawn at the start (the probes read them) */
  vagas: number[][] = [];
  vaos: number[] = [];

  constructor(private readonly corpo: CorpoSerpente) {}

  get viva(): boolean {
    if (this.abortado) return this.tAborto < HAB.aborta;
    return this.tAcao === null || this.ondas < this.cores.length || this.casulos.length > 0 || !this.p.vazio;
  }

  comecar(): void {
    // (the tokens run on across rounds: a body from an older round can never pass for a new cocoon)
    this.t = 0;
    this.tAcao = null;
    this.abortado = false;
    this.tAborto = 0;
    this.casulos = [];
    this.acaso = gerador(Math.floor(Math.random() * 2 ** 31));
    this.p = new Particulas(this.acaso);
    this.ondas = 0;
    // one wave per living head, in the form's order (A: cyan, green, orange; B: green, orange)
    this.cores = [...this.corpo.cores];
    const O = HAB.chuva.ondas, v = inicioDoVao(this.acaso, this.cores.length);
    this.vagas = this.cores.map((_, j) => vagasDosCasulos(v.inicio + v.passo * j));
    this.vaos = this.cores.map((_, j) => O.de + (v.inicio + v.passo * j + (O.vao - 1) / 2) * O.passo);
    if (this.corpo.forma === 'A') {
      const acao = CONJUNTOS[CLIPE_A].acao ?? HAB.chuva.acaoA;
      this.corpo.tocador.clipe(CLIPE_A, FPS_CLIPE, (i) => {
        if (i === acao) this.lancar();
      });
    } else this.corpo.gesto(() => this.lancar());
  }

  /** the strike: the salvo and the waves are timed from here */
  private lancar(): void {
    if (this.tAcao !== null || this.abortado) return;
    this.tAcao = this.t;
  }

  update(dt: number): void {
    this.passo(this.t, dt);
    this.t += dt;
  }

  /** the mock 1964–2007, at the skill's time `t` (R1) */
  private passo(t: number, dt: number): void {
    if (this.abortado) this.tAborto += dt;
    else {
      if (this.tAcao === null && t >= SEM_GESTO) this.lancar();
      const tA = this.tAcao;
      if (tA !== null) {
        const C = HAB.chuva;
        this.cores.forEach((cor, j) => {
          for (let i = 0; i < C.salva.n; i++) if (cruza(t - dt, t, tA + i * C.salva.entre)) this.subir(cor, i);
          if (cruza(t - dt, t, tA + C.ondas.depois + j * C.ondas.entre)) this.onda(cor, j);
        });
      }
    }
    for (const c of this.casulos) this.mover(c, dt);
    this.casulos = this.casulos.filter((c) => !c.morto);
    this.p.passo(dt);
  }

  /** a cocoon of the salvo: from the mouth where it is now, up and out (35° to the left, ±16°, a hair of luck) */
  private subir(cor: Cor, i: number): void {
    const S = HAB.chuva.salva, b = this.corpo.boca(cor);
    const ang = ((S.inclina + (i - (S.n - 1) / 2) * S.abre + (this.acaso() - 0.5) * S.sorte) * Math.PI) / 180;
    this.nascer(cor, b.x, b.y, -Math.sin(ang) * S.vel, -Math.cos(ang) * S.vel, false);
  }

  /** a wave: from rest above the screen, every slot but the gap's */
  private onda(cor: Cor, j: number): void {
    for (const x of this.vagas[j]) this.nascer(cor, x, -6, 0, 0, true);
    this.ondas++;
  }

  private nascer(cor: Cor, x: number, y: number, vx: number, vy: number, desce: boolean): void {
    const c: Casulo = { b: null, token: ++this.n, cor, desce, x, y, vx, vy, morto: false };
    const b = this.corpo.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (b) {
      b.setActive(true).setVisible(false);
      b.body!.enable = true;
      // (the reused slot's body keeps the old place: `reset` resyncs it — `BossSerpente.tiro`'s 29/10 note)
      const bd = b.body as Phaser.Physics.Arcade.Body;
      bd.reset(x, y);
      b.anims.stop();
      b.setTexture('bolt2').setScale(1).setRotation(0).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
      const cx = desce ? HAB.chuva.caixa.desce : HAB.chuva.caixa.sobe;
      bd.setSize(cx.w, cx.h, true);
      b.setVelocity(0, 0);
      b.setData('flak', false);
      // (the slot may have been a common shot's: the shots read their own token, and must not read it as theirs)
      b.setData('serpTiro', null);
      b.setData('serpCasulo', c.token);
      b.setData('serpDesce', desce);
      c.b = b;
    }
    this.casulos.push(c);
  }

  /** one cocoon's frame, in the mock's order: the speed, the engine's gas at its tail, the place, the burst */
  private mover(c: Casulo, dt: number): void {
    // the ship took it (the scene let the body go), or the pool did (it rose out of the top)
    if (c.b && (!c.b.active || c.b.getData('serpCasulo') !== c.token)) {
      c.b = null;
      c.morto = true;
      return;
    }
    const C = HAB.chuva;
    if (c.desce) {
      c.vy += C.acel * dt;
      // the engine at the tail (up): gas up, push down — at the drawn cocoon's own tail, in its head's colour
      const cauda = caudaDe(CASULOS[c.cor].quadros[0], c.x, c.y);
      this.p.jato(cauda.x, cauda.y - 1, 0, -1, 1.3, c.vx, c.vy, dt, 200, c.cor);
    }
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (!c.desce && c.y < -12) c.morto = true;
    if (c.desce && c.y + 3 >= HAB.crista) {
      c.morto = true;
      this.p.clarao(c.x, HAB.crista - 2, c.cor);
      this.p.faiscas(c.x, HAB.crista - 1, 6, HAB.cores.COR[c.cor]);
    }
    if (!c.b) return;
    if (c.morto) {
      this.corpo.enemies.release(c.b);
      c.b = null;
    } else c.b.setPosition(c.x, c.y);
  }

  /** the mock 2117–2128: the gas and the bursts, then each cocoon (the flame only on the way down: engines off going up) */
  desenhar(put0: Put): void {
    const alfa = this.abortado ? Math.max(0, 1 - this.tAborto / HAB.aborta) : 1;
    if (alfa <= 0) return;
    const put: Put = alfa >= 1 ? put0 : (x, y, c, a = 1) => put0(x, y, c, a * alfa);
    this.p.desenhar(put);
    const k = Math.floor(this.t * FPS_MAQUETE);
    for (const c of this.casulos) {
      const S = CASULOS[c.cor], L = S.quadros.length, q = Math.floor((this.t + c.x * 0.013) * S.fps);
      const s = S.quadros[((q % L) + L) % L];
      if (c.desce) { // the flame grows out of the row right above the turned sprite's tail, on its middle column
        const t0 = caudaDe(s, c.x, c.y);
        chamaCor(put, t0.x, t0.y, 0, -1, 1.3, k, c.cor);
        desenharSprite(put, s, c.x, c.y, 0, 1);
      } else {
        const v = Math.hypot(c.vx, c.vy) || 1;
        desenharSprite(put, s, c.x, c.y, c.vx / v, c.vy / v);
      }
    }
  }

  /** her head died: the cocoons stop hurting at once (the bodies go), the drawings fly on and fade in `HAB.aborta` s */
  abortar(): void {
    this.abortado = true;
    this.tAborto = 0;
    for (const c of this.casulos) {
      if (c.b && c.b.active && c.b.getData('serpCasulo') === c.token) this.corpo.enemies.release(c.b);
      c.b = null;
    }
  }
}
