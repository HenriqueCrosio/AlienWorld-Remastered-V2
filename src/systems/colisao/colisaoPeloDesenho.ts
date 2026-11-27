/**
 * THE SHIP TOUCHES WHERE IT IS DRAWN (27/11, the rebalance, step 2 — plan `plans/2026-11-27-hitbox-pelo-desenho.md`).
 * Him: *"às vezes relam e não tomam dano ou não relam e tomam dano"* → the collision by the DRAWING, with 1 px of
 * forgiveness on the ship (his choice).
 *
 * ⚠️ The broad phase is the DRAWING's rectangle on screen, not the Arcade body: an enemy's body is 60% × 55% of its
 * frame, so art touching the ship outside that body would never reach the pixel test. The Arcade body stays only as
 * the fallback for what has no readable drawing (an invisible physics sprite whose look is another object — the
 * hunter, the larva, the tube — or a texture that cannot be read): there the box of today, never worse than today.
 */
import Phaser from 'phaser';
import { desenhado, erodir, intersecao, montarMascaraPx, paraQuadro, tocam, type MascaraPx, type Pose } from './mascaraPixel';

/**
 * The forgiveness, in px eroded from the ship's hull. 27/11 he chose 1 px, measured it (against a drone the area that
 * wounds was ×2.0 of today's box; ×1.5–1.7 at 2 px; ×1.1–1.5 at 3 — the sheet `folhas/2026-11-27/hitbox/`), played
 * `?perdao=2` and kept it: *"Achei justo, está bem mais preciso"*. In dev, `?perdao=N` (0–4) still tries another value.
 */
const PERDAO_PADRAO = 2;
export const PERDAO_NAVE_PX = ((): number => {
  if (!import.meta.env.DEV || typeof location === 'undefined') return PERDAO_PADRAO;
  const q = new URLSearchParams(location.search);
  const n = Number(q.get('perdao'));
  return q.has('perdao') && Number.isInteger(n) && n >= 0 && n <= 4 ? n : PERDAO_PADRAO;
})();
/**
 * The ship animations whose frames are the BODY moving (the manta swims): their mask is the frame on screen. Every
 * other ship animation only moves the engine fire, so the hull is what all frames share.
 */
const ANIM_CORPO_INTEIRO = new Set(['nave-alien-t2-nado', 'nave-alien-t1-nado']);

const cacheQuadro = new Map<string, MascaraPx | null>();
const cacheNave = new Map<string, MascaraPx | null>();

/** The mask of one frame of a loaded texture (read once, cached). `null` = it cannot be read. */
export function mascaraDoQuadro(scene: Phaser.Scene, chave: string, quadro: string | number, aditivo = false): MascaraPx | null {
  // ⚠️ A HOLED COPY (`Destrocos`, the shots eat the piece) is a canvas punched IN PLACE by every new shot, under the same
  // key: cached, the ship would hit rock that is gone. Read it fresh (only while it touches the ship's bounds).
  const volatil = chave.startsWith('destrocos-furo-');
  const k = `${chave}#${quadro}#${aditivo ? 'add' : ''}`;
  if (!volatil && cacheQuadro.has(k)) return cacheQuadro.get(k) ?? null;
  let m: MascaraPx | null = null;
  try {
    const f = scene.textures.getFrame(chave, quadro);
    const img = f?.source?.image as CanvasImageSource | undefined;
    if (f && img && chave !== '__MISSING') {
      const w = f.cutWidth;
      const h = f.cutHeight;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, f.cutX, f.cutY, w, h, 0, 0, w, h);
        m = montarMascaraPx(ctx.getImageData(0, 0, w, h).data, w, h, aditivo);
      }
    }
  } catch {
    m = null;
  }
  if (!volatil) cacheQuadro.set(k, m);
  return m;
}

/** The ship's hull: the pixels all frames of its animation share (the fire off), or the frame itself (the manta), eroded. */
export function mascaraDaNave(nave: Phaser.GameObjects.Sprite): MascaraPx | null {
  const anim = nave.anims?.currentAnim;
  const porQuadro = !anim || ANIM_CORPO_INTEIRO.has(anim.key);
  const k = porQuadro ? `q#${nave.texture.key}#${nave.frame.name}` : `a#${anim.key}`;
  if (cacheNave.has(k)) return cacheNave.get(k) ?? null;
  let m: MascaraPx | null = null;
  if (porQuadro) {
    const q = mascaraDoQuadro(nave.scene, nave.texture.key, nave.frame.name);
    m = q ? erodir(q, PERDAO_NAVE_PX) : null;
  } else {
    const qs = anim.frames.map((f) => mascaraDoQuadro(nave.scene, f.textureKey, f.textureFrame));
    const ok = qs.every((q): q is MascaraPx => !!q && q.w === qs[0]?.w && q.h === qs[0]?.h);
    m = ok && qs.length ? erodir(intersecao(qs as MascaraPx[]), PERDAO_NAVE_PX) : null;
  }
  cacheNave.set(k, m);
  return m;
}

/** How a sprite sits in the world (Phaser's convention). */
export function poseDe(s: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Pose {
  return {
    x: s.x,
    y: s.y,
    rotacao: s.rotation,
    escalaX: s.scaleX,
    escalaY: s.scaleY,
    origemX: s.displayOriginX,
    origemY: s.displayOriginY,
    espelhoX: s.flipX,
    espelhoY: s.flipY,
  };
}

/**
 * Is `o` a piece we can read the drawing of (visible, with a texture, NOT masked — a masked sprite shows only part of
 * its texture, e.g. the Serpent sunk in the hull: the whole texture would hit what is hidden)?
 */
function legivel(o: Phaser.GameObjects.GameObject): o is Phaser.GameObjects.Sprite {
  const s = o as Phaser.GameObjects.Sprite;
  return !!s.texture && !!s.frame && s.visible && s.alpha > 0 && !s.mask;
}

/** A world strip of the ship's hull: [x0,x1) × [y0,y1), one world px tall. */
export type Faixa = { x0: number; x1: number; y0: number; y1: number };

let ultimaFaixas: { chave: string; faixas: Faixa[]; caixa: Faixa | null } | null = null;

/**
 * THE SHIP'S HULL AS WORLD STRIPS (the borders, the cave, what a boss bites, the Beast's body: those already measure THEIR
 * side by the drawing and take a box query — the ship answers with its hull, one row run at a time, instead of the 21×9).
 * With the ship's pose (it tilts in the flap) and the forgiveness. Memoised on the pose: called several times a frame.
 */
export function faixasDaNave(nave: Phaser.Physics.Arcade.Sprite): { faixas: Faixa[]; caixa: Faixa | null } {
  const chave = `${nave.x}|${nave.y}|${nave.rotation}|${nave.texture.key}|${nave.frame.name}|${nave.anims?.currentAnim?.key}`;
  if (ultimaFaixas?.chave === chave) return ultimaFaixas;
  const m = mascaraDaNave(nave);
  const faixas: Faixa[] = [];
  let caixa: Faixa | null = null;
  if (m) {
    nave.getBounds(RA);
    const pose = poseDe(nave);
    for (let wy = Math.floor(RA.top); wy < RA.bottom; wy++) {
      let ini: number | null = null;
      for (let wx = Math.floor(RA.left); wx <= Math.ceil(RA.right); wx++) {
        const q = wx < RA.right ? paraQuadro(pose, m, wx + 0.5, wy + 0.5) : null;
        const ok = !!q && desenhado(m, q.x, q.y);
        if (ok && ini === null) ini = wx;
        if (!ok && ini !== null) {
          faixas.push({ x0: ini, x1: wx, y0: wy, y1: wy + 1 });
          caixa = caixa
            ? { x0: Math.min(caixa.x0, ini), x1: Math.max(caixa.x1, wx), y0: Math.min(caixa.y0, wy), y1: Math.max(caixa.y1, wy + 1) }
            : { x0: ini, x1: wx, y0: wy, y1: wy + 1 };
          ini = null;
        }
      }
    }
  }
  ultimaFaixas = { chave, faixas, caixa };
  return ultimaFaixas;
}

/**
 * Does a box query (`morde(left, right, top, bottom)`: the F4 wall, the F1 cave, a boss's bite) hit the ship's HULL?
 * Strip by strip, stopping at the first that bites. No hull readable → the Arcade body, today's rule.
 *
 * ⚠️ NO pre-check with the hull's whole bounding box: a query is not always a pure function of the box — the
 * guardian's squeeze answers a LATCH that the first read clears (`BossNucleo.morde`), and the cave picks its visible
 * span by the box's middle line. A first call with the big box ate the latch and the strips found nothing (caught by
 * `test-guardiao-aperto-jogo`, 27/11).
 */
export function cascoMorde(nave: Phaser.Physics.Arcade.Sprite, morde: (esq: number, dir: number, topo: number, base: number) => boolean): boolean {
  const { faixas, caixa } = faixasDaNave(nave);
  if (!caixa) {
    const b = nave.body as Phaser.Physics.Arcade.Body;
    return morde(b.left, b.right, b.top, b.bottom);
  }
  return faixas.some((f) => morde(f.x0, f.x1, f.y0, f.y1));
}

/** Does the ship's HULL (its world strips) reach into an Arcade body — a circle or a box? */
function cascoNoCorpo(nave: Phaser.Physics.Arcade.Sprite, c: Phaser.Physics.Arcade.Body): boolean {
  const { faixas } = faixasDaNave(nave);
  if (!faixas.length) return corposSeTocam(nave.body as Phaser.Physics.Arcade.Body, c);
  if (c.isCircle) {
    // ⚠️ NOT `halfWidth`/`center`: Arcade FLOORS the half size (a 9.9 px circle reads 4, its centre 0.95 px off in x and y
    // — measured 27/11 on the Tower's comet). The exact circle: the position plus half the real width.
    const r = c.width / 2;
    const cx = c.x + c.width / 2;
    const cy = c.y + c.height / 2;
    // a strip [x0,x1)×[y0,y0+1): its pixel centres against the circle
    return faixas.some((f) => {
      const py = f.y0 + 0.5;
      if (Math.abs(py - cy) >= r) return false;
      const meia = Math.sqrt(r * r - (py - cy) ** 2);
      return f.x0 + 0.5 < cx + meia && f.x1 - 0.5 > cx - meia;
    });
  }
  return faixas.some((f) => f.x1 > c.left && f.x0 < c.right && f.y1 > c.top && f.y0 < c.bottom);
}

/** The two Arcade bodies overlap (the fallback, today's rule)? */
function corposSeTocam(a: Phaser.Physics.Arcade.Body, b: Phaser.Physics.Arcade.Body): boolean {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

const RA = new Phaser.Geom.Rectangle();
const RB = new Phaser.Geom.Rectangle();

/**
 * Does `outro` touch the ship? By the drawing when both can be read; by today's boxes when not. `outro` must be an
 * active piece with an enabled body (the caller filters, the way Arcade's overlap does).
 *
 * `soNoCorpo`: only inside `outro`'s Arcade body (the BOSSES: their body is a touch zone the fight designed — the
 * Serpent's runs from the visible neck to the foot, and the parts of her drawing under the hull's front rim are hidden by
 * art drawn over her, not by a mask; the same rule the Beast has had since 25/11, "inside the body box of the mode").
 */
export function tocaNave(nave: Phaser.Physics.Arcade.Sprite, outro: Phaser.Physics.Arcade.Sprite, soNoCorpo = false): boolean {
  const cn = nave.body as Phaser.Physics.Arcade.Body;
  const co = outro.body as Phaser.Physics.Arcade.Body | null;
  // a piece that wounds by its BODY, not its drawing (the Tower's comet: the ball's circle, never the tail): the hull
  // against that body
  if (co && outro.getData?.('feresoCorpo') === true && nave.texture && nave.frame) return cascoNoCorpo(nave, co);
  // (the ship only needs a texture: it BLINKS during its i-frames — invisible on some frames — and is the same hull)
  if (!legivel(outro) || !nave.texture || !nave.frame) return !!co && corposSeTocam(cn, co);
  const mn = mascaraDaNave(nave);
  const mo = mascaraDoQuadro(outro.scene, outro.texture.key, outro.frame.name, outro.blendMode === Phaser.BlendModes.ADD);
  if (!mn || !mo) return !!co && corposSeTocam(cn, co);
  nave.getBounds(RA);
  outro.getBounds(RB);
  let x0 = Math.max(RA.left, RB.left);
  let x1 = Math.min(RA.right, RB.right);
  let y0 = Math.max(RA.top, RB.top);
  let y1 = Math.min(RA.bottom, RB.bottom);
  if (soNoCorpo && co) {
    x0 = Math.max(x0, co.left);
    x1 = Math.min(x1, co.right);
    y0 = Math.max(y0, co.top);
    y1 = Math.min(y1, co.bottom);
  }
  if (x0 >= x1 || y0 >= y1) return false;
  return tocam(poseDe(nave), mn, poseDe(outro), mo, x0, y0, x1, y1);
}

/**
 * Every active piece of `grupo` that touches the ship this frame (the per-frame pass that replaces the Arcade overlap
 * for the pieces that can be read; the caller hands each one to its handler, as the overlap callback did).
 */
export function quemTocaNave(
  nave: Phaser.Physics.Arcade.Sprite,
  grupo: Phaser.GameObjects.Group,
  /** the processCallback the Arcade overlap had (e.g. `TerrainSystem.solido`: the table still sliding in does not hit) */
  vale?: (o: Phaser.Physics.Arcade.Sprite) => boolean,
): Phaser.Physics.Arcade.Sprite[] {
  const cn = nave.body as Phaser.Physics.Arcade.Body | null;
  if (!cn?.enable || !nave.active) return [];
  const out: Phaser.Physics.Arcade.Sprite[] = [];
  for (const o of grupo.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
    const c = o.body as Phaser.Physics.Arcade.Body | null;
    if (!o.active || !c?.enable || c.checkCollision.none) continue;
    if (vale && !vale(o)) continue;
    if (tocaNave(nave, o)) out.push(o);
  }
  return out;
}
