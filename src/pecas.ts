import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from './config';
import type { Fx } from './systems/Fx';

/**
 * AS PEÇAS — PROTÓTIPO (feat/cartas-preview, 28/09). As "moedas-estrela" do jogo, decisão do Henrique:
 *
 * - **3 por fase**, nas F1, F2 e F3. Em pontos fixos da fase (~25/50/75% do caminho até o chefão) um inimigo na tela
 *   vira PORTADOR (faíscas douradas em volta). Destruído, ele solta a PEÇA, que flutua e precisa ser TOCADA. Portador
 *   que sai vivo, ou peça que sai da tela, é peça perdida — como a moeda-estrela que passou.
 * - Sem inimigo disponível no ponto (um trecho só de rocha), a peça aparece flutuando sozinha alguns segundos depois:
 *   as 3 chances existem em toda fase.
 * - **Coleção completa** = a nave EVOLUI um tier na conquista + **1-UP só na fase seguinte** (não acumula; o retry
 *   daquela fase mantém). Coleção incompleta = a nave fica no tier; a carta da conquista vem sempre.
 * - As cápsulas de HMG/Shotgun deixam de cair: a peça é o drop do jogo agora.
 * - A F4 não tem peças (não há tier depois dela) — em aberto com ele.
 *
 * O TIER mora no registry (`tierNave`): humana começa no 0; a manta entra no 1 ao ser escolhida na Doca.
 */

const CHAVE_TIER = 'tierNave';
const CHAVE_UMUP = 'umUpNaFase';
const TIER_MAX: Record<string, number> = { humana: 3, alienigena: 2 };
export const FASES_COM_PECAS = new Set([1, 2, 3]);
export const PECAS_POR_FASE = 3;

/** Jogada nova (entrada na F1): tier 0 e sem 1-UP pendente. */
export function reiniciarLinhagem(reg: Phaser.Data.DataManager): void {
  reg.set(CHAVE_TIER, 0);
  reg.set(CHAVE_UMUP, 0);
}

export function tierDaNave(reg: Phaser.Data.DataManager): number {
  return (reg.get(CHAVE_TIER) as number | undefined) ?? 0;
}

/** A manta escolhida na Doca: ela já vem no tier 1. */
export function entrarNaManta(reg: Phaser.Data.DataManager): void {
  reg.set(CHAVE_TIER, 1);
}

/** Coleção completa no fim da fase: evolui (sem passar do teto da linhagem) e marca o 1-UP da fase seguinte. */
export function colecaoCompleta(reg: Phaser.Data.DataManager, nave: string, proximaFase: number | null): boolean {
  const antes = tierDaNave(reg);
  reg.set(CHAVE_TIER, Math.min(antes + 1, TIER_MAX[nave] ?? antes));
  if (proximaFase !== null) reg.set(CHAVE_UMUP, proximaFase);
  return tierDaNave(reg) > antes;
}

/** A fase ganha o 1-UP da coleção da fase anterior? (vale também no retry dela) */
export function temUmUp(reg: Phaser.Data.DataManager, fase: number): boolean {
  return reg.get(CHAVE_UMUP) === fase;
}

// ─── EM JOGO ─────────────────────────────────────────────────────────────────────────────────────

export interface HostPecas {
  scene: Phaser.Scene;
  fx: Fx;
  fase: number;
  bossTime: number;
  nave: () => Phaser.Physics.Arcade.Sprite;
  inimigos: () => Phaser.Physics.Arcade.Sprite[];
  aviso: (texto: string) => void;
}

const MARCAS = [0.25, 0.5, 0.75];
/** Segundos esperando um inimigo na tela antes de a peça aparecer flutuando sozinha. */
const ESPERA_MAX = 8;
const COR = COLORS.hotBright;

export class PecasEmJogo {
  pegas = 0;
  private proxima = 0;
  private readonly ativa: boolean;
  private readonly soltas: Phaser.Physics.Arcade.Group;
  private readonly brilhos = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Particles.ParticleEmitter>();

  constructor(private readonly h: HostPecas) {
    this.ativa = FASES_COM_PECAS.has(h.fase);
    PecasEmJogo.textura(h.scene);
    this.soltas = h.scene.physics.add.group({ allowGravity: false });
    h.scene.physics.add.overlap(h.nave(), this.soltas, (_n, p) => this.pegar(p as Phaser.Physics.Arcade.Sprite));
  }

  get total(): number {
    return this.ativa ? PECAS_POR_FASE : 0;
  }

  /** A peça, desenhada no código (PROVISÓRIA): um losango dourado de 9px com contorno escuro. */
  private static textura(scene: Phaser.Scene): void {
    if (scene.textures.exists('peca')) return;
    const g = scene.make.graphics({}, false);
    const px = (x: number, y: number, c: number) => g.fillStyle(c, 1).fillRect(x, y, 1, 1);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const d = Math.abs(x - 4) + Math.abs(y - 4);
      if (d === 4) px(x, y, 0x1a1208);
      else if (d < 4) px(x, y, d <= 1 ? 0xfff2b0 : d === 2 ? COR : 0xc98a1c);
    }
    g.generateTexture('peca', 9, 9);
    g.destroy();
  }

  tick(elapsed: number): void {
    if (!this.ativa) return;
    // Marca o próximo portador quando o relógio passa da marca.
    if (this.proxima < MARCAS.length) {
      const t = MARCAS[this.proxima] * this.h.bossTime;
      if (elapsed >= t) {
        const alvo = this.h.inimigos().find((e) => e.active && !e.getData('portador') && e.x > GAME_WIDTH * 0.55);
        if (alvo) {
          this.marcar(alvo);
          this.proxima++;
        } else if (elapsed >= t + ESPERA_MAX) {
          this.soltar(GAME_WIDTH + 6, Phaser.Math.Between(40, GAME_HEIGHT - 40));
          this.proxima++;
        }
      }
    }
    // A peça solta flutua e balança; saiu da tela, perdeu.
    for (const p of this.soltas.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      p.y += Math.sin(this.h.scene.time.now / 200 + p.x) * 0.15;
      if (p.x < -10) p.destroy();
    }
    // O brilho do portador segue ele; portador que sumiu leva o brilho junto.
    for (const [e, em] of this.brilhos) {
      if (!e.active) {
        em.stop();
        this.h.scene.time.delayedCall(400, () => em.destroy());
        this.brilhos.delete(e);
      }
    }
  }

  private marcar(e: Phaser.Physics.Arcade.Sprite): void {
    e.setData('portador', true);
    const em = this.h.scene.add
      .particles(0, 0, 'spark', {
        lifespan: 420,
        speed: { min: 4, max: 14 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [COR, 0xfff2b0],
        blendMode: 'ADD',
        frequency: 60,
        emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 9), quantity: 12 },
      })
      .setDepth(22);
    em.startFollow(e);
    this.brilhos.set(e, em);
  }

  /** Um inimigo morreu: se era portador, a peça cai onde ele estava. */
  aoMorrer(e: Phaser.Physics.Arcade.Sprite): void {
    if (e.getData('portador')) this.soltar(e.x, e.y);
  }

  private soltar(x: number, y: number): void {
    const p = this.soltas.create(x, y, 'peca') as Phaser.Physics.Arcade.Sprite;
    p.setDepth(23).setVelocityX(-SCROLL_SPEED * 0.55);
    this.h.scene.tweens.add({ targets: p, scale: { from: 1.25, to: 1 }, duration: 300, yoyo: true, repeat: -1 });
  }

  private pegar(p: Phaser.Physics.Arcade.Sprite): void {
    if (!p.active) return;
    this.h.fx.hit(p.x, p.y);
    p.destroy();
    this.pegas++;
    this.h.aviso(this.pegas >= PECAS_POR_FASE ? 'COLEÇÃO COMPLETA · A NAVE VAI EVOLUIR' : `PEÇA ${this.pegas}/${PECAS_POR_FASE}`);
  }
}
