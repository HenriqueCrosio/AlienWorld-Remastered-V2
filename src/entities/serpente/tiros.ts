/**
 * THE COMMON SHOTS (spec §3.1; the 14th round's look, his pick: B, "one weapon per head" — the cyan's needle, the
 * green's venom drop, the orange's ember — with the generator's spit cleaned off the clips and a discreet flash).
 *
 * Between two skills the A and the B fire two common shots, the VARIATION in turn (his: *"quero variações de tiros
 * comuns. Eles necessitam de serem lidos também"*):
 *   mirado  one head in turn, one shot at the ship ±0.35 rad, 140 px/s          (leave where you are)
 *   leque   the green, three drops over 30°, 105 px/s                           (stay in the gap)
 *   cerco   a PAIR in turn (his: *"elas se revezam na dupla"*), one shot each, 22 px above and below the ship (stay in
 *           the middle)
 * The A plays each shot's own clip (the shooter's `tiroA/C/B`, the venom fan the green's, the encirclement its pair's)
 * and the shot leaves at the clip's action frame, from that frame's mouth; the B plays the erguer. The C keeps today's
 * aimed burst and fan, with the ember.
 *
 * ⚠️ THE POOL'S BULLET IS ONLY THE COLLISION BODY: today's texture and scale (`GOTA`, 0.9 — the `bolt2` box, ≈12×8, by
 * construction), INVISIBLE. The shot itself is drawn in the pixel layer as the mock drew it, turned to its flight, its
 * frames running from its birth — so it shows over her body as it leaves the mouth (a pool bullet sits at depth 1,
 * under her). The trails (the venom drips, the ember smokes and sheds sparks) and the flash are looks only (the `visual`
 * die).
 */
import Phaser from 'phaser';
import { CONJUNTOS, type ChaveConjunto } from './gestosHab';
import type { CorpoSerpente } from './habilidade';
import { HAB, alvosDoCerco, angulosDoLeque, chance, gerador, rodizio } from './numerosHab';
import { desenharSprite } from './projetil';
import { TIROS } from './projeteisHab';
import type { Cor, Put, Variacao } from './tipos';

/** the drop of each head (`BootScene.makeShotsChefes`): the pool bullet's texture (and so its box) */
export const GOTA: Record<Cor, string> = { ciano: 'shotVenenoAzul', verde: 'shotVeneno', laranja: 'shotVenenoAmbar' };

const GESTO_MIRADO: Record<Cor, ChaveConjunto> = { ciano: 'tiroA', laranja: 'tiroC', verde: 'tiroB' };
const GESTO_CERCO: Record<string, ChaveConjunto> = { 'ciano,verde': 'cercoCV', 'verde,laranja': 'cercoVL', 'ciano,laranja': 'cercoCL' };

interface Vivo {
  b: Phaser.Physics.Arcade.Sprite;
  token: number;
  cor: Cor;
  t0: number;
}
interface Rastro {
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  vida: number;
  cor?: Cor;
  gota?: boolean;
  fumo?: boolean;
  faisca?: boolean;
}

export class Tiros {
  private t = 0;
  private n = 0;
  private k = 0;
  private kMirado = 0;
  private kCerco = 0;
  private readonly vivos: Vivo[] = [];
  private readonly rastros: Rastro[] = [];
  private readonly claroes: { x: number; y: number; cor: Cor; t0: number }[] = [];
  /** the C's burst: shots waiting for their time (each re-aims) */
  private readonly agenda: { t: number; fn: () => void }[] = [];
  private readonly visual: () => number;
  /** what was fired (the probes read it): the variation, the heads, the mouths, the angles, the time */
  readonly registro: { variacao: Variacao | 'rajadaC' | 'lequeC'; cores: Cor[]; bocas: { x: number; y: number }[]; angulos: number[]; t: number }[] = [];

  constructor(private readonly corpo: CorpoSerpente) {
    this.visual = gerador(Math.floor(Math.random() * 2 ** 31));
  }

  /** one common shot of the pause (A and B): the variation in turn, its gesture, the shot(s) at the action frame */
  comum(): void {
    const F = this.corpo.forma;
    if (F !== 'A' && F !== 'B') return;
    const vivas = this.corpo.cores;
    const v = rodizio(HAB.tiros.variacoes[F], this.k++);
    if (v === 'mirado') {
      const cor = rodizio(HAB.tiros.mirado.ordem[F].filter((c) => vivas.includes(c)), this.kMirado++);
      this.gesto(F === 'A' ? GESTO_MIRADO[cor] : null, () => this.mirado(cor));
    } else if (v === 'leque') {
      this.gesto(F === 'A' ? 'tiroB' : null, () => this.leque());
    } else {
      const par = rodizio(HAB.tiros.cerco.pares[F], this.kCerco++);
      this.gesto(F === 'A' ? GESTO_CERCO[par.join()] : null, () => this.cerco(par));
    }
  }

  /** the C: an aimed burst (each shot re-aims, from the mouth where it is then) */
  rajadaC(): void {
    const R = HAB.tiros.C.rajada;
    for (let i = 0; i < R.n; i++)
      this.agenda.push({
        t: this.t + i * R.entre,
        fn: () => {
          const b = this.corpo.boca('laranja'), nv = this.corpo.nave(), a = Math.atan2(nv.y - b.y, nv.x - b.x);
          this.varAtual = 'rajadaC';
          this.disparar('laranja', b.x, b.y, a, R.vel, i === 0);
          this.anotar('rajadaC', ['laranja'], [b], [a]);
        },
      });
  }

  /** the C: a fan of four */
  lequeC(): void {
    const L = HAB.tiros.C.leque, b = this.corpo.boca('laranja'), nv = this.corpo.nave();
    const angs = angulosDoLeque(Math.atan2(nv.y - b.y, nv.x - b.x), L.n, L.abertura);
    this.varAtual = 'lequeC';
    angs.forEach((a, i) => this.disparar('laranja', b.x, b.y, a, L.vel, i === 0));
    this.anotar('lequeC', ['laranja'], [b], angs);
  }

  /** the A plays the shot's own clip (the shot at its action frame); the B, the erguer */
  private gesto(chave: ChaveConjunto | null, acao: () => void): void {
    if (!chave) {
      this.corpo.gesto(acao);
      return;
    }
    const acaoQ = CONJUNTOS[chave].acao ?? HAB.tiros.acao;
    this.corpo.tocador.clipe(chave, HAB.tiros.fpsGesto, (i) => {
      if (i === acaoQ) acao();
    });
  }

  private mirado(cor: Cor): void {
    const b = this.corpo.boca(cor), nv = this.corpo.nave(), d = HAB.tiros.mirado.desvio;
    const a = Math.atan2(nv.y - b.y, nv.x - b.x) + Phaser.Math.FloatBetween(-d, d);
    this.varAtual = 'mirado';
    this.disparar(cor, b.x, b.y, a, HAB.tiros.mirado.vel, true);
    this.anotar('mirado', [cor], [b], [a]);
  }

  private leque(): void {
    const L = HAB.tiros.leque, b = this.corpo.boca('verde'), nv = this.corpo.nave();
    const angs = angulosDoLeque(Math.atan2(nv.y - b.y, nv.x - b.x), L.n, L.abertura);
    this.varAtual = 'leque';
    angs.forEach((a, i) => this.disparar('verde', b.x, b.y, a, L.vel, i === 0));
    this.anotar('leque', ['verde'], [b], angs);
  }

  /** each head of the pair aims at its point: the higher mouth at the one above the ship */
  private cerco(par: [Cor, Cor]): void {
    const [cima, baixo] = alvosDoCerco(this.corpo.nave());
    const bocas = par.map((c) => ({ c, p: this.corpo.boca(c) })).sort((u, v) => u.p.y - v.p.y);
    this.varAtual = 'cerco';
    const angs = bocas.map(({ c, p }, i) => {
      const alvo = i === 0 ? cima : baixo, a = Math.atan2(alvo.y - p.y, alvo.x - p.x);
      this.disparar(c, p.x, p.y, a, HAB.tiros.cerco.vel, true);
      return a;
    });
    this.anotar('cerco', bocas.map((b) => b.c), bocas.map((b) => b.p), angs);
  }

  /** the variation being fired now (each bullet carries it: `serpVar`, for the probes) */
  private varAtual: Tiros['registro'][number]['variacao'] = 'mirado';

  private anotar(variacao: Tiros['registro'][number]['variacao'], cores: Cor[], bocas: { x: number; y: number }[], angulos: number[]): void {
    this.registro.push({ variacao, cores, bocas: bocas.map((b) => ({ x: b.x, y: b.y })), angulos, t: this.t });
    if (this.registro.length > 200) this.registro.shift();
  }

  /** the pool bullet with today's look (the box by construction), invisible: the layer draws the shot */
  private disparar(cor: Cor, x: number, y: number, ang: number, vel: number, clarao: boolean): void {
    const b = this.corpo.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(false);
    b.body!.enable = true;
    // (the reused slot's body keeps the old place: `reset` resyncs it — `BossSerpente.tiro`'s 29/10 note)
    (b.body as Phaser.Physics.Arcade.Body).reset(x, y);
    b.anims.stop();
    b.setTexture(GOTA[cor]).setScale(0.9).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('flak', false);
    const token = ++this.n;
    // (the slot may have been a cocoon's: the rain reads its own token, and must not read it as its)
    b.setData('serpCasulo', null);
    b.setData('serpTiro', token);
    b.setData('serpVar', this.varAtual);
    b.setVelocity(Math.cos(ang) * vel, Math.sin(ang) * vel);
    b.setRotation(ang);
    this.vivos.push({ b, token, cor, t0: this.t });
    if (clarao && cor !== 'ciano') this.claroDaBoca(cor, x, y, Math.cos(ang), Math.sin(ang));
  }

  /**
   * THE DISCREET FLASH (the 14th round, his note: the generator's spit was *"muito forte e grande"* — it was cleaned off
   * the clips; the mock 2027–2041): a few-pixel flash at the mouth, and the weapon's own bits — the ember two sparks and
   * a wisp of smoke, the venom three small drops. The cyan keeps its clip as it was.
   */
  private claroDaBoca(cor: Cor, x: number, y: number, ux: number, uy: number): void {
    const v = this.visual;
    this.claroes.push({ x: x + ux * 2, y: y + uy * 2, cor, t0: this.t });
    for (let q = 0; q < (cor === 'laranja' ? 2 : 3); q++) {
      const a = Math.atan2(uy, ux) + (v() - 0.5) * 1.1, vv = cor === 'laranja' ? 45 + v() * 35 : 22 + v() * 22;
      this.rastros.push(cor === 'laranja'
        ? { x: x + ux * 3, y: y + uy * 3, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.1 + v() * 0.1, faisca: true }
        : { x: x + ux * 3, y: y + uy * 3, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.35 + v() * 0.25, cor: 'verde', gota: true });
    }
    if (cor === 'laranja') for (let q = 0; q < 3; q++)
      this.rastros.push({ x: x + ux * (2 + q), y: y + uy * (2 + q) + (v() - 0.5) * 2, vx: ux * (6 + v() * 6), vy: uy * (6 + v() * 6), idade: 0, vida: 0.4 + v() * 0.3, fumo: true });
  }

  update(dt: number): void {
    this.t += dt;
    for (let i = this.agenda.length - 1; i >= 0; i--) if (this.t >= this.agenda[i].t) this.agenda.splice(i, 1)[0].fn();
    for (let i = this.vivos.length - 1; i >= 0; i--) {
      const { b, token } = this.vivos[i];
      if (!b.active || b.getData('serpTiro') !== token) this.vivos.splice(i, 1);
    }
    // the trails (the mock 2044–2053): the venom drips a drop now and then, the ember smokes and sheds a spark
    const v = this.visual;
    for (const { b, cor } of this.vivos) {
      const modo = TIROS[cor].rastro, bd = b.body as Phaser.Physics.Arcade.Body, vx = bd.velocity.x, vy = bd.velocity.y;
      const vel = Math.hypot(vx, vy) || 1, ux = vx / vel, uy = vy / vel, L = TIROS[cor].quadros[0].w / 2;
      if (modo === 'pinga' && v() < chance(0.22, dt))
        this.rastros.push({ x: b.x - ux * (L - 1), y: b.y - uy * (L - 1) + (v() - 0.5) * 2, vx: vx * 0.12 + (v() - 0.5) * 6, vy: vy * 0.12 + (v() - 0.5) * 6, idade: 0, vida: 0.45 + v() * 0.3, cor, gota: true });
      if (modo === 'fumaca') {
        if (v() < chance(0.7, dt))
          this.rastros.push({ x: b.x - ux * L + (v() - 0.5) * 2, y: b.y - uy * L + (v() - 0.5) * 2, vx: vx * 0.08 + (v() - 0.5) * 8, vy: vy * 0.08 + (v() - 0.5) * 8, idade: 0, vida: 0.35 + v() * 0.35, fumo: true });
        if (v() < chance(0.12, dt)) {
          const a = Math.atan2(-uy, -ux) + (v() - 0.5) * 1.6, vv = 30 + v() * 40;
          this.rastros.push({ x: b.x - ux * (L - 2), y: b.y - uy * (L - 2), vx: vx * 0.5 + Math.cos(a) * vv, vy: vy * 0.5 + Math.sin(a) * vv, idade: 0, vida: 0.1 + v() * 0.12, faisca: true });
        }
      }
    }
    for (const r of this.rastros) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.idade += dt;
    }
    for (let i = this.rastros.length - 1; i >= 0; i--) if (this.rastros[i].idade > this.rastros[i].vida) this.rastros.splice(i, 1);
    for (let i = this.claroes.length - 1; i >= 0; i--) if (this.t - this.claroes[i].t0 > 0.1) this.claroes.splice(i, 1);
  }

  /** the mock 2104–2116 (the flashes, the trails, under the shots) and 2138–2142 (the shot) */
  desenhar(put: Put): void {
    const { COR, NUCLEO } = HAB.cores;
    for (const c of this.claroes) { // 0.03 s a 3×3 hot core, then 0.07 s a 1 px glow
      const f = this.t - c.t0;
      if (f < 0.034) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(c.x + dx, c.y + dy, dx || dy ? COR[c.cor] : [255, 255, 255], dx && dy ? 0.5 : 1);
      } else put(c.x, c.y, NUCLEO[c.cor], 1 - (f - 0.034) / 0.07);
    }
    for (const r of this.rastros) {
      const f = r.idade / r.vida;
      if (r.gota) put(r.x, r.y, f < 0.3 ? COR[r.cor ?? 'verde'] : [47, 122, 82], 1 - f * 0.8);
      else if (r.fumo) put(r.x, r.y, f < 0.25 ? [150, 120, 100] : [96, 90, 92], 0.55 * Math.pow(1 - f, 1.2));
      else if (r.faisca) put(r.x, r.y, f < 0.4 ? [255, 244, 208] : [255, 138, 44], 1 - f * 0.5);
    }
    for (const { b, cor, t0 } of this.vivos) {
      const bd = b.body as Phaser.Physics.Arcade.Body, vel = Math.hypot(bd.velocity.x, bd.velocity.y) || 1, Q = TIROS[cor].quadros;
      desenharSprite(put, Q[Math.floor((this.t - t0) * TIROS[cor].fps) % Q.length], b.x, b.y, bd.velocity.x / vel, bd.velocity.y / vel);
    }
  }

  /** her death, the fusion: the shots in the air vanish with their bodies */
  limpar(): void {
    for (const { b, token } of this.vivos) if (b.active && b.getData('serpTiro') === token) this.corpo.enemies.release(b);
    this.vivos.length = 0;
    this.rastros.length = 0;
    this.claroes.length = 0;
    this.agenda.length = 0;
  }
}
