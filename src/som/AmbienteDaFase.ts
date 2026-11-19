import Phaser from 'phaser';
import { ENGUIA } from '../f3/enguiaCilindro';
import { GOLFINHOS } from '../f4/golfinhosFundo';
import type { Parallax } from '../Parallax';
import { Som, type Laco } from './Som';
import { CamadasDoCinturao, QUASE, REVEZAMENTO, RevezamentoDoInterior, cruzou, passouRaspando, sorteadorSemRepetir } from './regrasAmbiente';

/**
 * THE AMBIENCE OF A STAGE (block SOUND, sheet 8, 18/11 — spec §10.10): the bed of each place, the swap when the screen
 * changes place (the cave, the turn of the F3's acts, the F4's flooded chamber) and the effects tied to what the screen
 * already shows. `GameScene` owns one and feeds it every frame; every rule lives in `regrasAmbiente.ts`, every depth in
 * `distancia.ts`.
 */
const ENTRA_MS = 1500;

/** A bed of a scene: rises from silence. (A scene change takes it away with every other voice.) */
export function tocarFundo(nome: string, ms = ENTRA_MS): Laco | null {
  const l = Som.laco(nome, 0);
  l?.volume(1, ms);
  return l;
}

export type EstadoAgua = 'seco' | 'enchendo' | 'assentando' | 'submerso' | 'esvaziando';

export interface QuadroDoAmbiente {
  /** the stage's clock (s) */
  t: number;
  /** a boss on screen: the far layers hold back */
  chefe: boolean;
  caverna: boolean;
  agua: EstadoAgua;
  /** the clock of the dolphin's duel (s), `null` with the chamber dry */
  duelo: number | null;
  nave: { x: number; y: number };
  perigos: Phaser.GameObjects.GameObject[];
}

export class AmbienteDaFase {
  private fundo: Laco | null = null;
  private fundoB: Laco | null = null;
  private tensao: Laco | null = null;
  private ligado = false;
  private tAntes = 0;
  private dueloAntes: number | null = null;
  private cavernaAntes = false;
  private aguaAntes: EstadoAgua = 'seco';
  private submersa = false;
  private readonly cinturao = new CamadasDoCinturao(Math.random);
  private readonly revezamento = new RevezamentoDoInterior(Math.random);
  private readonly rangido = sorteadorSemRepetir(['fx.f2.rangido', 'fx.f2.rangido2'], Math.random);
  private readonly faisca = sorteadorSemRepetir(['fx.f3.faiscas', 'fx.f3.faiscas2'], Math.random);
  private readonly quadros = new WeakMap<object, number>();
  private readonly xAntes = new WeakMap<object, number>();
  /** when each repeating effect may sound again (the stage's clock) */
  private readonly livreEm = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fase: number,
    private readonly parallax: Parallax,
    /** the F3 practice starts on the hull, past the turn of the acts */
    private noCasco: boolean,
  ) {
    parallax.aoEventoDoCenario = (tipo, x) => this.doCenario(tipo, x);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      parallax.aoEventoDoCenario = null;
      this.calar(250);
    });
  }

  private nomeDoFundo(): string {
    if (this.fase === 1) return 'amb.f1.fora';
    if (this.fase === 2) return 'amb.f2';
    if (this.fase === 3) return this.noCasco ? 'amb.f3.casco' : 'amb.f3.nebulosa';
    return 'amb.f4.interior';
  }

  /** The bed comes in (the F1's waits for the sonic boom: `GameScene` calls this when the engine enters). */
  ligar(ms = ENTRA_MS): void {
    if (this.ligado) return;
    this.ligado = true;
    this.fundo = tocarFundo(this.nomeDoFundo(), ms);
    // the F4's second breath runs silent under the first, ready to be crossed into
    if (this.fase === 4) this.fundoB = Som.laco('amb.f4.interior2', 0);
    // the tension under the two space stages (his file, 18/11), over whatever bed the place has
    if (this.fase === 2 || this.fase === 3) this.tensao = tocarFundo('amb.espaco.tensao', ms);
  }

  private calar(ms: number): void {
    this.fundo?.parar(ms);
    this.fundoB?.parar(ms);
    this.tensao?.parar(ms);
    this.fundo = null;
    this.fundoB = null;
    this.tensao = null;
  }

  private trocarFundo(nome: string, ms: number): void {
    this.fundo?.parar(ms);
    this.fundo = tocarFundo(nome, ms);
  }

  /** The F1's climb: the wind thins out with the air. */
  saidaDaAtmosfera(ms: number): void {
    this.calar(ms);
  }

  /** The F3's turn, in the full black: the nebula gives way to the hull. */
  paraOCasco(): void {
    if (this.noCasco) return;
    this.noCasco = true;
    this.trocarFundo('amb.f3.casco', 1500);
  }

  /** The Leviathan's tail, the moment of the F3. */
  rabo(): void {
    Som.tocar('fx.f3.rabo');
  }

  private podeTocar(chave: string, agora: number, folga: number): boolean {
    if (agora < (this.livreEm.get(chave) ?? -Infinity)) return false;
    this.livreEm.set(chave, agora + folga);
    return true;
  }

  private doCenario(tipo: 'vapor' | 'faisca' | 'clarao', x: number): void {
    const agora = this.tAntes;
    if (tipo === 'vapor' && this.podeTocar('vapor', agora, 1.8)) Som.tocar('fx.f3.vapor', { x });
    else if (tipo === 'faisca' && this.podeTocar('faisca', agora, 2.5)) Som.tocar(this.faisca(), { x });
    // (the flash first, the thump after it: the battle is far beyond the hull)
    else if (tipo === 'clarao') this.scene.time.delayedCall(600, () => Som.tocar('fx.f3.baque', { x }));
  }

  /** Every frame, from `GameScene.update`. */
  quadro(dt: number, q: QuadroDoAmbiente): void {
    const t0 = this.tAntes;
    this.tAntes = q.t;
    if (this.fase === 1) this.quadroF1(q);
    else if (this.fase === 2) this.quadroF2(dt, q);
    else if (this.fase === 3) this.quadroF3(t0, q);
    else this.quadroF4(dt, q);
    if (this.fase === 2 || this.fase === 3) this.rochasPassando(q);
  }

  private quadroF1(q: QuadroDoAmbiente): void {
    if (q.caverna === this.cavernaAntes) return;
    this.cavernaAntes = q.caverna;
    Som.lugar(q.caverna ? 'caverna' : 'atmosfera', 900);
    if (this.ligado) this.trocarFundo(q.caverna ? 'amb.f1.caverna' : 'amb.f1.fora', 1200);
  }

  private quadroF2(dt: number, q: QuadroDoAmbiente): void {
    const camada = this.cinturao.passo(dt, !q.chefe);
    if (camada) Som.tocar(camada, { x: 60 + Math.random() * 264 });
    // a dead capital ship drifting into view: the cabin answers it
    for (const s of this.parallax.pecasDaCamada('derelict')) {
      const antes = this.xAntes.get(s);
      this.xAntes.set(s, s.x);
      if (antes !== undefined && antes >= 330 && s.x < 330 && this.podeTocar('rangido', q.t, QUASE.folgaDestroco)) Som.tocar(this.rangido(), { x: s.x });
    }
  }

  private quadroF3(t0: number, q: QuadroDoAmbiente): void {
    // the eel crossing the gas, from the bottom left to the top right (only in the first act, like her silhouette)
    const c = ENGUIA.caminho;
    if (!this.noCasco && !q.chefe && cruzou(t0, q.t, c.t0 - 0.4)) Som.tocar('fx.f3.enguia', { x: c.de[0], xFim: c.ate[0] });
  }

  private quadroF4(dt: number, q: QuadroDoAmbiente): void {
    this.aguaDaCamara(q);
    if (!this.submersa && this.ligado && this.revezamento.passo(dt)) {
      const b = this.revezamento.naB;
      this.fundo?.volume(b ? 0 : 1, REVEZAMENTO.trocaMs);
      this.fundoB?.volume(b ? 1 : 0, REVEZAMENTO.trocaMs);
    }
    // the living scenery keeps its own time: the sound follows the frame of the piece on screen
    this.batida('orgao', 'fx.f4.coracao', q.t, 1);
    this.batida('maquinario', 'fx.f4.fornalha', q.t, 2.5);
    // the others of its kind, crossing far behind the duel
    const d0 = this.dueloAntes;
    this.dueloAntes = q.duelo;
    if (d0 !== null && q.duelo !== null) {
      for (const p of GOLFINHOS.passagens) {
        if (p.largura === 1 && cruzou(d0, q.duelo, p.t0)) Som.tocar('fx.f4.golfinho', { x: p.de[0], xFim: p.ate[0] });
      }
    }
  }

  /** The frame 1 → 2 of an animated piece on screen is the start of its beat (going up only: the animation is a yoyo). */
  private batida(camada: string, som: string, t: number, folga: number): void {
    for (const s of this.parallax.pecasDaCamada(camada) as Phaser.GameObjects.Sprite[]) {
      const i = s.anims?.currentFrame?.index;
      if (i === undefined) continue;
      const antes = this.quadros.get(s);
      this.quadros.set(s, i);
      if (antes !== 1 || i !== 2 || !s.visible || s.alpha < 0.3 || s.x < -40 || s.x > 424) continue;
      if (this.podeTocar(camada, t, folga)) Som.tocar(som, { x: s.x });
    }
  }

  private aguaDaCamara(q: QuadroDoAmbiente): void {
    if (q.agua === this.aguaAntes) return;
    const antes = this.aguaAntes;
    this.aguaAntes = q.agua;
    if (q.agua === 'enchendo') {
      Som.tocar('fx.f4.agua.sobe');
      Som.lugar('agua', 1800);
      this.submersa = true;
      this.fundoB?.volume(0, 800);
      this.trocarFundo('amb.f4.agua', 2000);
    } else if (q.agua === 'esvaziando' || (q.agua === 'seco' && antes !== 'esvaziando')) {
      if (q.agua === 'esvaziando') Som.tocar('fx.f4.agua.desce');
      Som.lugar('interior', 1500);
      this.submersa = false;
      this.trocarFundo('amb.f4.interior', 2000);
    }
  }

  /** A rock that crosses the ship's nose without touching it: felt through the hull (hitting one has its own sound). */
  private rochasPassando(q: QuadroDoAmbiente): void {
    for (const o of q.perigos) {
      const h = o as Phaser.Physics.Arcade.Sprite;
      if (!h.active || h.getData('passouSom')) continue;
      const kind = h.getData('kind') as string;
      if (kind !== 'asteroid' && kind !== 'destroco') continue;
      if (h.x > q.nave.x) continue;
      h.setData('passouSom', true);
      if (h.x < q.nave.x - QUASE.atras || !passouRaspando(h.y - q.nave.y, h.displayWidth / 2, !!h.getData('bateu'))) continue;
      if (kind === 'asteroid') {
        if (this.podeTocar('passa', q.t, QUASE.folgaRocha)) Som.tocar('fx.f2.passa', { x: h.x });
      } else if (this.podeTocar('rangido', q.t, QUASE.folgaDestroco)) Som.tocar(this.rangido(), { x: h.x });
    }
  }
}
