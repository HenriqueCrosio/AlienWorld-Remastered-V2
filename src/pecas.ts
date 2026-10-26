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
 * - **Coleção completa** = **1-UP só na fase seguinte** (não acumula; o retry daquela fase mantém). A carta da conquista
 *   vem sempre.
 * - As cápsulas de HMG/Shotgun deixam de cair: a peça é o drop do jogo agora.
 * - A F4 não tem peças (não há fase seguinte para o 1-UP).
 * - **25/10: a nave não evolui mais** (os tiers saíram, `src/ships.ts`). Ele: *"As estrelas ou peças podem ficar
 *   dropando, para o player conseguir a vida extra"* — e a regra de 23/10 ("só há peças se a nave ainda pode evoluir")
 *   saiu junto: toda F1, F2 e F3 tem as 3. O HUD mostra as 3 estrelas no canto superior direito, vazias, e cada peça
 *   pega preenche uma (a ideia dele).
 */

const CHAVE_UMUP = 'umUpNaFase';
export const FASES_COM_PECAS = new Set([1, 2, 3]);
export const PECAS_POR_FASE = 3;

/** Jogada nova (entrada na F1): sem 1-UP pendente. */
export function reiniciarJogada(reg: Phaser.Data.DataManager): void {
  reg.set(CHAVE_UMUP, 0);
}

/** Coleção completa no fim da fase: marca o 1-UP da fase seguinte. */
export function colecaoCompleta(reg: Phaser.Data.DataManager, proximaFase: number | null): void {
  if (proximaFase !== null) reg.set(CHAVE_UMUP, proximaFase);
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

/**
 * A ESTRELA (25/10): a peça virou estrela — no HUD e no ar —, para o jogador ligar a que ele pega à que preenche no canto.
 * Desenhada em pixel (peça ≲8px se desenha à mão): 9×9, a ponta de cima com o brilho.
 */
const ESTRELA = [
  '....#....',
  '...###...',
  '...###...',
  '#########',
  '.#######.',
  '..#####..',
  '..#####..',
  '.###.###.',
  '.##...##.',
];
const EM_ESTRELA = (x: number, y: number) => ESTRELA[y]?.[x] === '#';
/** Pixel da estrela na borda dela (algum vizinho de fora). */
const BORDA = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !EM_ESTRELA(x + dx, y + dy));
/** O canto do HUD: as 3 estrelas encostadas na direita da faixa do topo, dentro dela (a faixa tem 14px). */
const HUD_X = GAME_WIDTH - 4, HUD_Y = 2, HUD_PASSO = 11;

export class PecasEmJogo {
  pegas = 0;
  private proxima = 0;
  private readonly ativa: boolean;
  private readonly soltas: Phaser.Physics.Arcade.Group;
  private readonly brilhos = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Particles.ParticleEmitter>();
  /** As 3 estrelas do HUD, da esquerda para a direita; a i-ésima preenche com a i-ésima peça pega. */
  private readonly hud: Phaser.GameObjects.Image[] = [];

  constructor(private readonly h: HostPecas) {
    this.ativa = FASES_COM_PECAS.has(h.fase);
    PecasEmJogo.texturas(h.scene);
    this.soltas = h.scene.physics.add.group({ allowGravity: false });
    h.scene.physics.add.overlap(h.nave(), this.soltas, (_n, p) => this.pegar(p as Phaser.Physics.Arcade.Sprite));
    if (this.ativa) {
      // Origem no centro (o estalo cresce a partir do meio da estrela); 9px de lado → o centro em x.5 cai no pixel inteiro.
      for (let i = 0; i < PECAS_POR_FASE; i++) {
        const x = HUD_X - (PECAS_POR_FASE - 1 - i) * HUD_PASSO - 4.5;
        this.hud.push(h.scene.add.image(x, HUD_Y + 4.5, 'estrela-vazia').setDepth(100));
      }
    }
  }

  get total(): number {
    return this.ativa ? PECAS_POR_FASE : 0;
  }

  /** A margem esquerda das estrelas do HUD (o medidor da mini-gun encosta nela), ou null sem peças na fase. */
  get hudEsquerda(): number | null {
    return this.ativa ? HUD_X - (PECAS_POR_FASE - 1) * HUD_PASSO - ESTRELA[0].length : null;
  }

  /**
   * As texturas, desenhadas no código: `peca` (a estrela no ar, com contorno escuro — 11×11, ela voa sobre qualquer
   * fundo), `estrela-cheia` e `estrela-vazia` (o HUD, 9×9, sobre a faixa escura do topo: a vazia é só a borda, apagada).
   */
  private static texturas(scene: Phaser.Scene): void {
    if (scene.textures.exists('peca')) return;
    const desenhar = (chave: string, lado: number, m: number, cor: (x: number, y: number) => number | null) => {
      const g = scene.make.graphics({}, false);
      for (let y = -m; y < 9 + m; y++) for (let x = -m; x < 9 + m; x++) {
        const c = cor(x, y);
        if (c !== null) g.fillStyle(c, 1).fillRect(x + m, y + m, 1, 1);
      }
      g.generateTexture(chave, lado, lado);
      g.destroy();
    };
    const cheia = (x: number, y: number) => {
      if (!EM_ESTRELA(x, y)) return null;
      if (BORDA(x, y)) return 0xc98a1c;
      return y <= 3 && Math.abs(x - 4) <= 1 ? 0xfff2b0 : COR;
    };
    const contorno = (x: number, y: number) =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => EM_ESTRELA(x + dx, y + dy)) ? 0x1a1208 : null;
    desenhar('peca', 11, 1, (x, y) => cheia(x, y) ?? contorno(x, y));
    desenhar('estrela-cheia', 9, 0, cheia);
    desenhar('estrela-vazia', 9, 0, (x, y) => (EM_ESTRELA(x, y) && BORDA(x, y) ? 0x6e5a32 : null));
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
    // A estrela do HUD preenche com um estalo curto (a escala volta ao 1 — o canto não fica pulsando).
    const slot = this.hud[this.pegas - 1];
    if (slot) {
      slot.setTexture('estrela-cheia');
      this.h.scene.tweens.add({ targets: slot, scale: { from: 1.6, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    }
    // A estrela do canto já conta 1 e 2; o aviso no meio da tela fica só para a coleção completa.
    if (this.pegas >= PECAS_POR_FASE) this.h.aviso('3 ESTRELAS · +1 VIDA NA PRÓXIMA FASE');
  }
}
