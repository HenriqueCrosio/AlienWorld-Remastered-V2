import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BOMBA, lancamento, passo, type EstadoBomba, type ZonaBomba } from '../bombaRegras';
import { GROUND_Y } from './TerrainSystem';

type Corpo = Phaser.Physics.Arcade.Sprite;

/** O que as bombas pedem à cena — a mesma ideia do `HostCartas`: o sistema não conhece a `GameScene`. */
export interface HostBombas {
  readonly scene: Phaser.Scene;
  nave(): { x: number; y: number; vx: number; vy: number };
  zona(): ZonaBomba;
  inimigos(): Corpo[];
  /** As construções SÓLIDAS (a rocha entra: a bomba explode nela, e ela não se fere). */
  construcoes(): Corpo[];
  /** Os alvos do chefão vivo (`targets` ou o `sprite`); vazio sem chefão. */
  alvosDoChefe(): Corpo[];
  ferirInimigo(e: Corpo, dano: number): void;
  ferirConstrucao(p: Corpo, dano: number): void;
  ferirChefe(dano: number): void;
  ferirGolfinho(x: number, y: number, raio: number, dano: number): void;
  explosao(x: number, y: number): void;
}

interface NoAr {
  img: Phaser.GameObjects.Image;
  e: EstadoBomba;
  explodeEm: number;
}

const TEXTURA = 'bomba';
/** A folga do contato (px): a bomba tem 8×4 e é desenhada pelo centro. */
const FOLGA_X = 3;
const FOLGA_Y = 2;

/**
 * AS BOMBAS NO AR (spec `2026-10-03-bomba-de-queda-design.md`): a física é a do `bombaRegras` (parábola na atmosfera,
 * reta no vácuo); aqui ficam o sprite, o SOLO, o PAVIO, o CONTATO e a explosão em raio.
 *
 * ⚠️ O RAIO MEDE ATÉ O CORPO, NÃO ATÉ O CENTRO. As construções são altas e ancoradas no PÉ (o `y` delas é o chão), e
 * o chefão é grande: medido até o centro, a bomba que explode no telhado de uma base "erraria" a base.
 */
export class Bombas {
  private readonly noAr: NoAr[] = [];

  constructor(private readonly h: HostBombas) {
    criarTextura(h.scene);
  }

  /** Quantas bombas estão no ar (a sonda lê). */
  get quantas(): number {
    return this.noAr.length;
  }

  /** Onde estão (a sonda lê). */
  get posicoes(): { x: number; y: number }[] {
    return this.noAr.map((b) => ({ x: b.e.x, y: b.e.y }));
  }

  lancar(agora: number): void {
    const n = this.h.nave();
    const l = lancamento(this.h.zona(), n.x, n.y, n.vx, n.vy);
    const img = this.h.scene.add.image(l.x, l.y, TEXTURA).setDepth(49);
    img.setRotation(Math.atan2(l.vy, l.vx));
    this.noAr.push({ img, e: l, explodeEm: l.pavioMs === null ? Infinity : agora + l.pavioMs });
  }

  tick(dt: number, agora: number): void {
    const atmosfera = this.h.zona() === 'atmosfera';
    for (let i = this.noAr.length - 1; i >= 0; i--) {
      const b = this.noAr[i];
      b.e = passo(b.e, dt);
      b.img.setPosition(b.e.x, b.e.y);
      // Na queda o NARIZ SEGUE A VELOCIDADE (vira de bico para o chão); no vácuo ela RODA.
      if (b.e.giro) b.img.rotation += Phaser.Math.DegToRad(b.e.giro) * dt;
      else b.img.setRotation(Math.atan2(b.e.vy, b.e.vx));

      if (b.e.x < -16 || b.e.x > GAME_WIDTH + 16 || b.e.y < -16 || b.e.y > GAME_HEIGHT + 16) {
        this.tirar(i);
        continue;
      }
      const noSolo = atmosfera && b.e.y >= GROUND_Y;
      if (noSolo || agora >= b.explodeEm || this.tocou(b.e.x, b.e.y)) {
        this.explodir(b.e.x, noSolo ? GROUND_Y : b.e.y);
        this.tirar(i);
      }
    }
  }

  private tirar(i: number): void {
    this.noAr[i].img.destroy();
    this.noAr.splice(i, 1);
  }

  /** O ponto da bomba dentro do corpo de alguém (com a folga do tamanho dela). */
  private tocou(x: number, y: number): boolean {
    const dentro = (o: Corpo): boolean => {
      const c = o.body as Phaser.Physics.Arcade.Body | null;
      if (!o.active || !c) return false;
      return x >= c.left - FOLGA_X && x <= c.right + FOLGA_X && y >= c.top - FOLGA_Y && y <= c.bottom + FOLGA_Y;
    };
    return this.h.inimigos().some(dentro) || this.h.construcoes().some(dentro) || this.h.alvosDoChefe().some(dentro);
  }

  private explodir(x: number, y: number): void {
    const raio = BOMBA.raio;
    // Até o ponto MAIS PERTO do corpo (o retângulo), não até o centro — ver o cabeçalho.
    const noRaio = (o: Corpo): boolean => {
      if (!o.active) return false;
      const c = o.body as Phaser.Physics.Arcade.Body | null;
      if (!c) return (o.x - x) ** 2 + (o.y - y) ** 2 <= raio * raio;
      const px = Phaser.Math.Clamp(x, c.left, c.right);
      const py = Phaser.Math.Clamp(y, c.top, c.bottom);
      return (px - x) ** 2 + (py - y) ** 2 <= raio * raio;
    };
    // Snapshot: ferir MATA, e matar tira do grupo no meio do laço.
    for (const e of [...this.h.inimigos()]) if (noRaio(e)) this.h.ferirInimigo(e, BOMBA.dano);
    for (const p of [...this.h.construcoes()]) if (noRaio(p)) this.h.ferirConstrucao(p, BOMBA.dano);
    // O chefão leva UMA vez por explosão, mesmo com várias partes no raio.
    if (this.h.alvosDoChefe().some(noRaio)) this.h.ferirChefe(BOMBA.dano);
    this.h.ferirGolfinho(x, y, raio, BOMBA.dano);
    this.h.explosao(x, y);
  }
}

/**
 * A bomba PROVISÓRIA (8×4, nariz para a direita): casco escuro, uma faixa quente perto do nariz e as aletas atrás —
 * dark sci-fi (luz só onde há energia). Só nasce se o `sprites/bomba.png` (a arte final de 03/10, 18×7, carregada pelo
 * `BootScene`) faltar.
 */
function criarTextura(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURA)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x15171c).fillRect(0, 0, 1, 1).fillRect(0, 3, 1, 1); // as aletas
  g.fillStyle(0x262a33).fillRect(0, 1, 8, 2).fillRect(1, 0, 5, 4); // o casco
  g.fillStyle(0x3b414d).fillRect(1, 0, 5, 1); // o brilho de cima
  g.fillStyle(0xff9a3c).fillRect(5, 1, 1, 2); // a faixa quente
  g.fillStyle(0x15171c).fillRect(7, 1, 1, 2); // o nariz
  g.generateTexture(TEXTURA, 8, 4);
  g.destroy();
}
