/**
 * HER SETS PLAYED ON HER SPRITE (02/11, spec §5.2). A skill shows frame i of a set (its own clock decides which, as in
 * the mock), or plays a clip at N fps; back to the idle, the idle restarts on its frame 0 (every set ends on the approved
 * frame, which is the idle's frame 0). ⚠️ The idle anim is STOPPED before the texture changes (trap 26: without the stop
 * Phaser puts the old anim's frame back). ⚠️ The debris engine may swap her texture for a holed copy: the tocador
 * remembers what IT showed and never reads the key back from the sprite.
 */
import Phaser from 'phaser';
import { CONJUNTOS, type ChaveConjunto } from './gestosHab';

export class Tocador {
  private agora: { chave: ChaveConjunto; i: number } | null = null;
  private toca: { chave: ChaveConjunto; fps: number; t: number; aoQuadro?: (i: number) => void; aoFim?: () => void } | null = null;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly idleAnim: () => string,
  ) {}

  /** the set frame shown, or null in the idle (or in another gesture, the erguer) */
  get atual(): { chave: ChaveConjunto; i: number } | null {
    return this.agora;
  }

  /** a clip is playing */
  get tocando(): boolean {
    return this.toca !== null;
  }

  mostrar(chave: ChaveConjunto, i: number): void {
    const c = CONJUNTOS[chave];
    i = Math.max(0, Math.min(c.quadros - 1, Math.round(i)));
    if (this.agora?.chave === chave && this.agora.i === i) return;
    if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
    this.sprite.setTexture(`serpenteHab_${chave}`, i);
    this.sprite.setOrigin(c.origem.x, c.origem.y);
    this.agora = { chave, i };
  }

  /** plays a set at `fps`; `aoQuadro(i)` as each frame shows, `aoFim()` once it is back to the idle */
  clipe(chave: ChaveConjunto, fps: number, aoQuadro?: (i: number) => void, aoFim?: () => void): void {
    this.toca = { chave, fps, t: 0, aoQuadro, aoFim };
    this.agora = null;
    this.mostrar(chave, 0);
    aoQuadro?.(0);
  }

  update(dt: number): void {
    const p = this.toca;
    if (!p) return;
    const antes = Math.floor(p.t * p.fps);
    p.t += dt;
    const n = CONJUNTOS[p.chave].quadros, agora = Math.floor(p.t * p.fps);
    for (let i = antes + 1; i <= Math.min(agora, n - 1); i++) {
      this.mostrar(p.chave, i);
      p.aoQuadro?.(i);
    }
    if (agora >= n) {
      this.idle();
      p.aoFim?.();
    }
  }

  /** back to the idle anim, from its frame 0 (origin 0.5) */
  idle(): void {
    this.toca = null;
    this.agora = null;
    this.sprite.setOrigin(0.5, 0.5);
    const a = this.idleAnim();
    if (this.sprite.scene.anims.exists(a)) this.sprite.play(a);
  }

  /** forget the set without touching the sprite (another gesture took it: the erguer, a form change) */
  soltar(): void {
    this.toca = null;
    this.agora = null;
  }
}
