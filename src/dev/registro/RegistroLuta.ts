import type Phaser from 'phaser';
import type { StageBoss } from '../../entities/Boss.ts';
import type { Medidas } from '../../systems/Medidas.ts';
import { areaNegada, resumirTrecho, type Caixa, type Golpe, type ResumoTrecho, type Trecho } from './contas.ts';
import type { GanchoRegistro } from './tipos.ts';

/**
 * THE FIGHT RECORDER (spec 2026-11-26-medicao-das-lutas §3), DEV only (`?registro`, see `ligar.ts`): the boss fight cut
 * into its phases (`StageBoss.devFaseAtual`), each with its time, the damage on the boss and the hits (the scene's
 * `Medidas`, the effective damage per source: the '(chefão)' sources), the player's shots, the ship's blows with their
 * cause, and the threats sampled every 100 ms (how many on screen, the denied area, the breathing room).
 * `window.__registro.resumo()` is the robots' output and, when he plays, his.
 */

/** The scene as the recorder reads it (the fields are private in GameScene: a structural view). */
export interface CenaVista {
  time: { now: number };
  boss: (StageBoss & { entering?: boolean; devAtaque?: string }) | null;
  ship: Phaser.Physics.Arcade.Sprite;
  weapons: { bullets: Phaser.Physics.Arcade.Group; disparos: number };
  enemies: { enemies: Phaser.Physics.Arcade.Group; enemyBullets: Phaser.Physics.Arcade.Group };
  medidas: Medidas | null;
  stage: { id: number };
}

export interface ResumoLuta {
  estagio: number;
  mao: string[];
  /** the fight started (the boss out of its entrance) */
  comecou: boolean;
  /** the boss died */
  terminou: boolean;
  s: number;
  fases: ResumoTrecho[];
  total: ResumoTrecho;
}

const AMOSTRA_MS = 100;
/** The damage sources that are the ship's pool projectiles (the scene's `${origem ?? 'tiro'} (chefão)`). */
const PROJETEIS = /^(tiro|missil|flare|drone|estilhaco) \(chefão\)$/;
const LARGURA = 384;
const ALTURA = 216;

/** What a threat is: the bullet flags first (the Capitânia's ruler), then its kind, then its texture. */
export function rotuloDe(o: Phaser.GameObjects.GameObject | undefined): string {
  if (!o) return '';
  const d = (k: string): unknown => o.getData?.(k);
  if (d('tracer') === true) return 'tracer';
  if (d('flak') === true) return 'flak';
  if (d('estilhaco')) return 'estilhaco';
  if (d('lava') === true) return 'lava';
  const k = d('kind');
  if (typeof k === 'string' && k) return k;
  const t = (o as Phaser.GameObjects.Sprite).texture?.key;
  return t ?? o.type;
}

export class RegistroLuta implements GanchoRegistro {
  private trechos: Trecho[] = [];
  private atual: Trecho | null = null;
  private comecou = false;
  private terminou = false;
  private proximaAmostra = 0;
  /** the weapon's shot count at the last frame */
  private disparosAntes = 0;
  /** what was active last frame (pooled sprites come back: "new" = active now, not before) */
  private ameacasAntes = new Set<object>();

  constructor(
    private readonly sc: CenaVista,
    private readonly mao: string[],
  ) {
    const m = sc.medidas;
    if (m) {
      const dano = m.dano.bind(m);
      m.dano = (fonte: string, d: number): void => {
        if (this.atual && !this.terminou && fonte.endsWith('(chefão)')) {
          // a hit = a PROJECTILE of the ship's pool on the boss (the shots counted in `disparos`); the cards' blasts,
          // burns and arcs add damage but are not shots
          if (PROJETEIS.test(fonte)) this.atual.acertos++;
          this.atual.dano += Math.max(0, d);
        }
        dano(fonte, d);
      };
    }
  }

  private abrir(fase: string, t: number): void {
    if (this.atual) this.atual.t1 = t;
    this.atual = { fase, t0: t, t1: t, dano: 0, disparos: 0, acertos: 0, golpes: [], amostras: [], novas: [] };
    this.trechos.push(this.atual);
  }

  private ataque(): string {
    const b = this.sc.boss;
    return b?.devAtaque ?? b?.devFaseAtual ?? 'luta';
  }

  golpe(causa: string, absorvido: boolean, quem?: Phaser.GameObjects.GameObject): void {
    if (!this.atual || this.terminou) return;
    const g: Golpe = {
      t: this.sc.time.now,
      causa,
      ataque: this.ataque(),
      quem: rotuloDe(quem),
      x: Math.round(this.sc.ship.x),
      y: Math.round(this.sc.ship.y),
      absorvido,
    };
    this.atual.golpes.push(g);
  }

  /** Every frame (the scene's postupdate). */
  quadro = (): void => {
    const sc = this.sc;
    const b = sc.boss;
    const t = sc.time.now;
    if (this.terminou) return;
    // the boss gone from the scene after the fight began = it is over (the eel's death removes the Serpent before a
    // frame shows her `isDead`)
    if (!b) {
      if (this.comecou) {
        if (this.atual) this.atual.t1 = t;
        this.terminou = true;
      }
      return;
    }
    if (!this.comecou) {
      if (b.entering) return;
      this.comecou = true;
      this.proximaAmostra = t;
      this.disparosAntes = sc.weapons.disparos;
    }
    if (b.isDead) {
      if (this.atual) this.atual.t1 = t;
      this.terminou = true;
      return;
    }
    const fase = b.devFaseAtual ?? 'luta';
    if (!this.atual || this.atual.fase !== fase) this.abrir(fase, t);
    const tr = this.atual!;
    tr.t1 = t;
    // the player's shots: the weapon's own count (a pooled shot that hits and comes back in the same frame would hide
    // from a "came alive" count — the Tower, at point blank, showed 1267 %)
    tr.disparos += sc.weapons.disparos - this.disparosAntes;
    this.disparosAntes = sc.weapons.disparos;
    if (t < this.proximaAmostra) return;
    this.proximaAmostra = t + AMOSTRA_MS;
    // the threats: the enemy shots, the boss's hazards, the live enemies
    const grupos = [sc.enemies.enemyBullets, sc.enemies.enemies, b.perigos].filter(Boolean) as Phaser.Physics.Arcade.Group[];
    const caixas: Caixa[] = [];
    const ameacas = new Set<object>();
    for (const g of grupos)
      for (const o of g.getChildren()) {
        if (!o.active) continue;
        const corpo = o.body as Phaser.Physics.Arcade.Body | null;
        if (!corpo || !corpo.enable) continue;
        if (corpo.right < 0 || corpo.left > LARGURA || corpo.bottom < 0 || corpo.top > ALTURA) continue;
        ameacas.add(o);
        caixas.push({ l: corpo.left, r: corpo.right, t: corpo.top, b: corpo.bottom });
        if (!this.ameacasAntes.has(o)) tr.novas.push(t);
      }
    this.ameacasAntes = ameacas;
    tr.amostras.push({ n: caixas.length, area: areaNegada(caixas, LARGURA, ALTURA) });
  };

  resumo(): ResumoLuta {
    const fases = this.trechos.map(resumirTrecho);
    const tudo: Trecho = {
      fase: 'luta',
      t0: this.trechos[0]?.t0 ?? 0,
      t1: this.trechos[this.trechos.length - 1]?.t1 ?? 0,
      dano: 0,
      disparos: 0,
      acertos: 0,
      golpes: [],
      amostras: [],
      novas: [],
    };
    for (const tr of this.trechos) {
      tudo.dano += tr.dano;
      tudo.disparos += tr.disparos;
      tudo.acertos += tr.acertos;
      tudo.golpes.push(...tr.golpes);
      tudo.amostras.push(...tr.amostras);
      tudo.novas.push(...tr.novas);
    }
    const total = resumirTrecho(tudo);
    return { estagio: this.sc.stage.id, mao: [...this.mao], comecou: this.comecou, terminou: this.terminou, s: total.s, fases, total };
  }

  /** The blows with their moments (for the photos and the sheet). */
  golpes(): Golpe[] {
    return this.trechos.flatMap((tr) => tr.golpes);
  }
}
