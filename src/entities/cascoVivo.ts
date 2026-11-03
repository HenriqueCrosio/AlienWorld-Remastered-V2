import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { LUTA } from './numerosSerpente';

/**
 * THE LIVING HULL OF THE SERPENT'S ARENA (29/10, S1b — spec `2026-10-29-serpente-luta-s1b-design.md` §1, §3, §5; him:
 * *"fazer com que ela 'rasgue o casco' até o jogador, mesmo que o efeito do rasgo se regenere depois"*; his pick on the
 * concept sheet: the R3 crack, the plates lifting over her and a dark crack behind).
 *
 * The world has stopped, so the band is still: a COPY of it (the hull pieces' own pixels, composited as the band lays
 * them) lives in a canvas right above the band (`depth −74.5`), and everything the hull does is painted there pixel by
 * pixel at the native resolution, with the band's own palette (the rule of [[efeito-de-cena-assado-em-pixel]]):
 *   - the BUMP: the band's columns pushed up over her as she runs underneath (the crest the most, the pipes not at all);
 *   - the CRACK: a dark two-row split along the panel behind her, with its little branches, healing from the breach's end;
 *   - the LOCK: the crack's tip white and pulsing (the S1's lock colour);
 *   - the TEAR where she bursts out: the breach's own inside (the cavity, at the same place relative to the hole's
 *     centre), the torn rim darker, the crest's plates bent up at both ends; it HEALS from the rim inwards, noisy, a
 *     darker rim of new tissue settling — the hull is the Leviathan's, and it regenerates;
 *   - the breach WIDENED (the fusion bursting out): a permanent ring of cavity.
 *
 * And THE CUT IN FRONT OF HER (his red line: the coils never leave the hull): the boss crops her sprite at
 * `crista + escuro`; the strip of rows between the crest and that line is painted IN FRONT of her (`depth 35`) over her
 * width — the band's own pixels where the hull is whole, and inside a hole a fade to the cavity's dark (her necks go down
 * into it). A strip, not a full-band cover: the ship (depth 1) flies over the band in front of it and must never hide
 * behind a copy of it.
 *
 * The bursts' pixels (the band inside a tear, the whole strip's hole at the arrival, the breach's rim widening) leave as
 * a temporary sprite, for the destruction engine to break in its own pixels (`estourar`).
 */
export interface Rasgo {
  cx: number;
  meia: number;
  fundo: number;
  /** opening: 0 → 1 (fast); then null */
  abre: number | null;
  /** healing: 0 → 1 (closed); null = open */
  cura: number | null;
  /** the breach widened (never heals) */
  permanente?: boolean;
  /** the burst's white tear along the crest: seconds left (the concept's flash, 0.15 s) */
  clarao?: number;
}

export interface Fissura {
  /** the span the crack has opened (it runs either way: from the breach to the left, or from a tear to either side) */
  de: number;
  ate: number;
  /** where it started: it heals from there towards the tip */
  origem: number;
  cura: number | null;
}

const TOPO = LUTA.crista - 16;
const W = GAME_WIDTH;
const H = GAME_HEIGHT - TOPO;
/** the panel's middle row, where the crack runs (measured on the arena's photo: the panel is rows 159–177) */
const PAINEL = 168;
/** the darkest of the cavity, for the fade */
const ESCURO: [number, number, number] = [9, 10, 14];
const BRANCO: [number, number, number] = [255, 246, 228];
/** the rombo strip: its size and the top-left of it relative to its origin (0.5, 1) */
const FAIXA = { w: 318, h: 100 };
/** a tear and a crack close over this long (s). 02/11: the charge that opened them is gone (spec of the skills §2.5) —
 * the hull can still paint them (nothing opens one today); the arrival's bump and the fusion's widening stay in use */
const CURA = 2.5;

export class CascoVivo {
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly frenteTex: Phaser.Textures.CanvasTexture;
  private readonly frenteImg: Phaser.GameObjects.Image;
  private readonly frenteH = LUTA.escuro + 1;
  /** the band's copy (RGBA, W × H from TOPO) */
  private base = new Uint8ClampedArray(W * H * 4);
  /** the breach's own inside (`serpenteRombo`), for the tears and the fade */
  private cavidade: Uint8ClampedArray | null = null;
  /** the crack's path: its row at each x (a random walk through the panel) and its little branches */
  private readonly trilha = new Int16Array(W);
  private readonly ramos: { x: number; y: number; de: number }[] = [];
  private readonly ruido = new Float32Array(W * H);
  private readonly jag = new Int8Array(W);
  private t = 0;

  /** the bump: where, how high, how wide (the arrival's tremble is wide; her run underneath, narrow) */
  lombada: { x: number; amp: number; larg?: number } | null = null;
  readonly fissuras: Fissura[] = [];
  ponta: { x: number; travada: boolean } | null = null;
  readonly rasgos: Rasgo[] = [];
  /** the columns of the breach's hole (where the fade replaces the band in front of her) */
  private buracoRombo: [number, number] | null = null;
  /** the breach's rim blown away by the fusion (world px, painted as the cavity) */
  private anel: Uint8Array | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    /** the hull band's images (the layer's pieces and the breach strip), in their drawing order */
    private readonly pecas: () => Phaser.GameObjects.Image[],
    /** the breach strip (its x moves only until the world stops) */
    private readonly rombo: () => Phaser.GameObjects.Image | null,
  ) {
    const k = (s: string): string => {
      let n = 0;
      while (scene.textures.exists(`${s}${n}`)) n++;
      return `${s}${n}`;
    };
    this.tex = scene.textures.createCanvas(k('cascoVivo'), W, H)!;
    this.img = scene.add.image(0, TOPO, this.tex).setOrigin(0, 0).setDepth(-74.5);
    this.frenteTex = scene.textures.createCanvas(k('cascoFrenteDela'), W, this.frenteH)!;
    this.frenteImg = scene.add.image(0, LUTA.crista, this.frenteTex).setOrigin(0, 0).setDepth(35);

    // the crack's path and branches, and the noise of the heal: fixed per fight (a seeded walk)
    let semente = 20261029;
    const rnd = (): number => {
      semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
      return semente / 4294967296;
    };
    let y = PAINEL, passo = 0;
    for (let x = W - 1; x >= 0; x--) {
      if (--passo <= 0) {
        y = Math.max(PAINEL - 5, Math.min(PAINEL + 5, y + (rnd() < 0.5 ? -1 : 1)));
        passo = 2 + Math.floor(rnd() * 3);
      }
      this.trilha[x] = y;
      if (x % 13 === 0) {
        const sobe = rnd() < 0.5 ? -1 : 1, n = 2 + Math.floor(rnd() * 3);
        for (let q = 1; q <= n; q++) this.ramos.push({ x: x - Math.round(q * 0.7), y: y + sobe * q, de: x });
      }
    }
    for (let i = 0; i < this.ruido.length; i++) this.ruido[i] = rnd();
    for (let i = 0; i < W; i++) this.jag[i] = Math.round((rnd() - 0.5) * 5);

    const fonte = scene.textures.exists('serpenteRombo') ? (scene.textures.get('serpenteRombo').getSourceImage() as HTMLImageElement) : null;
    if (fonte) this.cavidade = this.pixelsDe(fonte, FAIXA.w, FAIXA.h);
  }

  // ─── the copy ────────────────────────────────────────────────────────────────────────────────────────────────────

  /** Re-read the band from its pieces (once the world has stopped, and after the breach strip changes texture). */
  copiar(): void {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    for (const p of this.pecas()) {
      if (!p.active || !p.visible) continue;
      const f = p.frame;
      const src = f.source.image as HTMLImageElement | HTMLCanvasElement;
      const w = f.cutWidth * Math.abs(p.scaleX), h = f.cutHeight * Math.abs(p.scaleY);
      const x0 = p.x - p.displayOriginX * Math.abs(p.scaleX), y0 = p.y - p.displayOriginY * Math.abs(p.scaleY) - TOPO;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.flipX) {
        ctx.translate(Math.round(x0 + w), Math.round(y0));
        ctx.scale(-1, 1);
        ctx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, w, h);
      } else ctx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, Math.round(x0), Math.round(y0), w, h);
      ctx.restore();
    }
    this.base = ctx.getImageData(0, 0, W, H).data;
    // the breach's hole columns: the strip's cavity (dark) a few rows under the crest, around its centre
    const r = this.rombo();
    this.buracoRombo = null;
    if (r && r.texture.key === 'serpenteRombo' && this.cavidade) {
      const sy = LUTA.crista + 4 - (GAME_HEIGHT - FAIXA.h);
      let a = -1, b = -1;
      for (let sx = LUTA.faixa.buraco; sx >= 0; sx--) { if (this.lum(this.cavidade, sx, sy, FAIXA.w) >= 34) break; a = sx; }
      for (let sx = LUTA.faixa.buraco; sx < FAIXA.w; sx++) { if (this.lum(this.cavidade, sx, sy, FAIXA.w) >= 34) break; b = sx; }
      if (a >= 0 && b >= 0) this.buracoRombo = [Math.round(r.x - FAIXA.w / 2 + a), Math.round(r.x - FAIXA.w / 2 + b)];
    }
  }

  // ─── the bursts' pixels ─────────────────────────────────────────────────────────────────────────────────────────

  /**
   * A temporary sprite of the band's pixels where `dentro(x, y)` (world px) — what a burst throws out, for the
   * destruction engine. The caller breaks it and destroys it.
   */
  pixelsQueSaem(dentro: (x: number, y: number) => boolean, x0: number, x1: number): Phaser.GameObjects.Sprite | null {
    const a = Math.max(0, Math.floor(x0)), b = Math.min(W - 1, Math.ceil(x1));
    if (b <= a) return null;
    const w = b - a + 1;
    const key = this.chaveNova('cascoSai');
    const t = this.scene.textures.createCanvas(key, w, H)!;
    const id = t.context.createImageData(w, H);
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = a; x <= b; x++) {
      if (!dentro(x, y + TOPO)) continue;
      const i = (y * W + x) * 4, j = (y * w + (x - a)) * 4;
      if (this.base[i + 3] < 128) continue;
      id.data[j] = this.base[i]; id.data[j + 1] = this.base[i + 1]; id.data[j + 2] = this.base[i + 2]; id.data[j + 3] = 255;
      n++;
    }
    if (n < 3) {
      this.scene.textures.remove(key);
      return null;
    }
    t.context.putImageData(id, 0, 0);
    t.refresh();
    return this.scene.add.sprite(a, TOPO, key).setOrigin(0, 0).setVisible(false);
  }

  /** The texture of a temporary sprite goes with it. */
  descartar(s: Phaser.GameObjects.Sprite): void {
    const key = s.texture.key;
    s.destroy();
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
  }

  /** The pixels of an image's texture where `dentro(sx, sy)` (its own px), as a temporary sprite at the same place. */
  pixelsDaImagem(img: Phaser.GameObjects.Image, key: string, dentro: (sx: number, sy: number, lum: number) => boolean): Phaser.GameObjects.Sprite | null {
    if (!this.scene.textures.exists(key)) return null;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const w = src.width, h = src.height;
    const px = this.pixelsDe(src, w, h);
    const nova = this.chaveNova('cascoSai');
    const t = this.scene.textures.createCanvas(nova, w, h)!;
    const id = t.context.createImageData(w, h);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 128 || !dentro(x, y, this.lum(px, x, y, w))) continue;
      id.data[i] = px[i]; id.data[i + 1] = px[i + 1]; id.data[i + 2] = px[i + 2]; id.data[i + 3] = 255;
      n++;
    }
    if (n < 3) {
      this.scene.textures.remove(nova);
      return null;
    }
    t.context.putImageData(id, 0, 0);
    t.refresh();
    return this.scene.add.sprite(img.x, img.y, nova).setOrigin(img.originX, img.originY).setVisible(false);
  }

  // ─── the tears ──────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * THE ARRIVAL'S BURST: the whole strip's pixels where the breach's hole will be (the breach art's cavity), as a
   * temporary sprite at the strip's place — the hull blowing open from inside.
   */
  estouroDoRombo(img: Phaser.GameObjects.Image): Phaser.GameObjects.Sprite | null {
    const cav = this.cavidade;
    if (!cav) return null;
    return this.pixelsDaImagem(img, 'serpenteRomboInteiro', (sx, sy) => sy >= 30 && Math.abs(sx - LUTA.faixa.buraco) <= 84 && this.lum(cav, sx, sy, FAIXA.w) < 34);
  }

  /**
   * THE BREACH WIDENS (the fusion bursting out): the lip's pixels within `anel` px of its hole leave (a temporary
   * sprite, for the destruction engine), the lip takes a copy of itself without them, and the band behind shows the
   * cavity there from now on.
   */
  alargar(lip: Phaser.GameObjects.Image, anel: number): Phaser.GameObjects.Sprite | null {
    const key = lip.texture.key;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = src.width, h = src.height;
    const px = this.pixelsDe(src, w, h);
    const furo = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] < 128 && Math.abs(x - LUTA.faixa.buraco) <= 80 && y >= 52;
    const sai = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 128) continue;
      let perto = false;
      for (let dy = -anel; dy <= anel && !perto; dy++) for (let dx = -anel; dx <= anel; dx++) if (furo(x + dx, y + dy)) { perto = true; break; }
      if (perto) sai[y * w + x] = 1;
    }
    const nova = this.chaveNova('cascoLabio');
    const t = this.scene.textures.createCanvas(nova, w, h)!;
    const fica = t.context.createImageData(w, h);
    const saiTex = this.chaveNova('cascoSai');
    const ts = this.scene.textures.createCanvas(saiTex, w, h)!;
    const vai = ts.context.createImageData(w, h);
    if (!this.anel) this.anel = new Uint8Array(W * H);
    const x0 = lip.x - lip.displayOriginX, y0 = lip.y - lip.displayOriginY;
    let n = 0;
    for (let i = 0; i < w * h; i++) {
      const alvo = sai[i] ? vai.data : fica.data;
      for (let q = 0; q < 4; q++) alvo[i * 4 + q] = px[i * 4 + q];
      if (sai[i]) {
        n++;
        const wx = Math.round(x0 + (i % w)), wy = Math.round(y0 + Math.floor(i / w)) - TOPO;
        if (wx >= 0 && wx < W && wy >= 0 && wy < H) this.anel[wy * W + wx] = 1;
      }
    }
    t.context.putImageData(fica, 0, 0);
    t.refresh();
    ts.context.putImageData(vai, 0, 0);
    ts.refresh();
    lip.setTexture(nova);
    if (this.buracoRombo) this.buracoRombo = [this.buracoRombo[0] - anel, this.buracoRombo[1] + anel];
    if (n < 3) {
      this.scene.textures.remove(saiTex);
      return null;
    }
    return this.scene.add.sprite(lip.x, lip.y, saiTex).setOrigin(lip.originX, lip.originY).setVisible(false);
  }

  /**
   * THE BURST'S GRAVEL (the burst under the ship): `n` of the band's own pixels from the tear's top rows (the plates that
   * break off), with their colour — the boss throws them up and out, behind her. (The destruction engine draws above
   * her: its pieces covered her necks for a second, a cracked slab, then a cloud.)
   */
  cascalhoDoRasgo(r: Rasgo, n: number): { x: number; y: number; cor: number }[] {
    const out: { x: number; y: number; cor: number }[] = [];
    for (let k = 0, tentativas = 0; k < n && tentativas < n * 20; tentativas++) {
      // (mostly the crest's rail, the band's light row: dark panel pixels vanish against the dark sky)
      const x = Math.round(r.cx + (Math.random() * 2 - 1) * r.meia), y = Math.round(LUTA.crista + (Math.random() < 0.65 ? Math.random() * 5 : 5 + Math.random() * 9));
      if (x < 0 || x >= W || !this.dentroDoRasgo(r, x, y)) continue;
      const i = ((y - TOPO) * W + x) * 4;
      if (this.base[i + 3] < 128) continue;
      out.push({ x, y, cor: (this.base[i] << 16) | (this.base[i + 1] << 8) | this.base[i + 2] });
      k++;
    }
    return out;
  }

  /** Inside a tear of this size (fully open), world px. */
  dentroDoRasgo(r: Rasgo, x: number, y: number, k = 1): boolean {
    if (k <= 0) return false;
    const meia = r.meia * k, u = (x - r.cx) / meia;
    if (Math.abs(u) > 1) return false;
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    const fundoY = LUTA.crista - 1 + r.fundo * k * Math.sqrt(1 - u * u) + this.jag[xi] * k;
    return y >= LUTA.crista - 4 + Math.abs(this.jag[(xi * 7) % W]) * 0.6 && y <= fundoY;
  }

  /** How deep in the full tear (0 rim … 1 deep), noisy: the heal closes from the rim inwards. */
  private fundura(r: Rasgo, x: number, y: number): number {
    if (!this.dentroDoRasgo(r, x, y)) return -1;
    const u = (x - r.cx) / r.meia, fundoY = LUTA.crista - 1 + r.fundo * Math.sqrt(1 - u * u) + this.jag[x];
    const d = Math.min((1 - Math.abs(u)) * r.meia, fundoY - y, y - LUTA.crista + 10) / 22;
    return Math.min(1, Math.max(0, d)) * 0.75 + this.ruido[(y - TOPO) * W + x] * 0.25;
  }

  private aberto(r: Rasgo, x: number, y: number): boolean {
    if (r.abre != null) return this.dentroDoRasgo(r, x, y, r.abre);
    if (r.cura == null || r.permanente) return this.dentroDoRasgo(r, x, y);
    const f = this.fundura(r, x, y);
    return f >= 0 && f > r.cura * 1.02;
  }

  /** The columns where a hole is open now (the breach and the open tears) — for the fade in front of her. */
  private noBuraco(x: number): boolean {
    if (this.buracoRombo && x >= this.buracoRombo[0] && x <= this.buracoRombo[1]) return true;
    for (const r of this.rasgos) {
      const k = r.abre ?? (r.cura == null || r.permanente ? 1 : 1 - r.cura);
      if (Math.abs(x - r.cx) <= r.meia * k) return true;
    }
    return false;
  }

  // ─── the clock and the paint ────────────────────────────────────────────────────────────────────────────────────

  update(dt: number): void {
    this.t += dt;
    for (const r of this.rasgos) {
      if (r.clarao) r.clarao = Math.max(0, r.clarao - dt);
      if (r.abre != null) {
        r.abre = Math.min(1, r.abre + dt / 0.1);
        if (r.abre >= 1) r.abre = null;
      } else if (r.cura != null && !r.permanente && r.cura < 1) r.cura = Math.min(1, r.cura + dt / CURA);
    }
    for (const f of this.fissuras) if (f.cura != null && f.cura < 1) f.cura = Math.min(1, f.cura + dt / CURA);
    for (let i = this.rasgos.length - 1; i >= 0; i--) if (this.rasgos[i].cura === 1) this.rasgos.splice(i, 1);
    for (let i = this.fissuras.length - 1; i >= 0; i--) if (this.fissuras[i].cura === 1) this.fissuras.splice(i, 1);
    this.pintar();
  }

  /** The bump's lift at column x (0 off the bump). */
  private desloca(x: number): number {
    const l = this.lombada;
    if (!l) return 0;
    return Math.round(l.amp * Math.exp(-(((x - l.x) / (l.larg ?? 9)) ** 2)));
  }

  private pintar(): void {
    const ctx = this.tex.context;
    const id = ctx.createImageData(W, H);
    const out = id.data, base = this.base;
    const put = (x: number, y: number, c: ArrayLike<number>, a = 1): void => {
      x = Math.round(x);
      y = Math.round(y) - TOPO;
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      const i = (y * W + x) * 4;
      // (under the overlay is the band itself: mix with what is painted, or with the band where nothing is yet)
      const r = out[i + 3] ? out[i] : base[i], g = out[i + 3] ? out[i + 1] : base[i + 1], b = out[i + 3] ? out[i + 2] : base[i + 2];
      out[i] = a >= 1 ? c[0] : r + (c[0] - r) * a;
      out[i + 1] = a >= 1 ? c[1] : g + (c[1] - g) * a;
      out[i + 2] = a >= 1 ? c[2] : b + (c[2] - b) * a;
      out[i + 3] = 255;
    };
    const daBase = (x: number, y: number): [number, number, number] => {
      const i = ((Math.min(H - 1, Math.max(0, Math.round(y) - TOPO))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))) * 4;
      return [base[i], base[i + 1], base[i + 2]];
    };

    // 1) the bump: the band's columns pushed up (fading with depth: the crest the most, the pipes not at all)
    if (this.lombada) {
      const l = this.lombada;
      const alcance = 2.7 * (l.larg ?? 9);
      for (let x = Math.max(0, Math.floor(l.x - alcance)); x <= Math.min(W - 1, Math.ceil(l.x + alcance)); x++) {
        const d = this.desloca(x);
        if (!d) continue;
        for (let y = TOPO; y < 200; y++) {
          const dy = d * Math.max(0, 1 - Math.max(0, y - LUTA.crista + 1) / 46);
          const sy = Math.min(GAME_HEIGHT - 1, Math.round(y + dy)) - TOPO;
          const i = (sy * W + x) * 4;
          if (base[i + 3] < 8 && out[((y - TOPO) * W + x) * 4 + 3] === 0) continue;
          put(x, y, [base[i], base[i + 1], base[i + 2]], base[i + 3] / 255);
        }
      }
    }

    // 2) the cracks (R3: a dark two-row core, the upper lip in shadow, the lower lip catching the light), healing from
    //    the breach's end towards the tip, a darker rim of new tissue behind the healed edge
    for (const f of this.fissuras) {
      // healed: from the origin towards the tip (the origin is the breach's end or the tear's)
      const lenCura = (f.ate - f.de + 6) * (f.cura ?? 0);
      const daDireita = f.origem >= (f.de + f.ate) / 2;
      const fechado = (x: number): boolean => f.cura != null && (daDireita ? x > f.ate - lenCura : x < f.de + lenCura);
      const curaAte = daDireita ? f.ate - lenCura : f.de + lenCura;
      for (let x = Math.ceil(f.de); x <= f.ate; x++) {
        if (x < 0 || x >= W || fechado(x)) continue;
        const y = this.trilha[x] - this.desloca(x);
        put(x, y - 1, [10, 11, 15]);
        put(x, y, [16, 17, 22]);
        put(x, y - 2, [0, 0, 0], 0.45);
        put(x, y + 1, [255, 255, 255], 0.28);
      }
      for (const r of this.ramos) if (r.de >= f.de && r.de <= f.ate && r.x >= f.de && r.x <= f.ate && !fechado(r.x)) put(r.x, r.y - this.desloca(r.x), [14, 15, 20]);
      if (f.cura != null) {
        // the new tissue right behind the healed edge, a little darker, settling
        for (let q = 0; q <= 10; q++) {
          const x = Math.round(daDireita ? curaAte + q : curaAte - q);
          if (x < Math.ceil(f.de) || x > f.ate || x < 0 || x >= W) continue;
          const y = this.trilha[x];
          for (const dy of [-2, -1, 0, 1]) put(x, y + dy, [6, 6, 10], 0.35 * (1 - q / 10));
        }
      }
    }

    // 3) the lock: the tip white, pulsing; on the crest over the bump too
    if (this.ponta?.travada) {
      const p = 0.6 + 0.4 * Math.sin(this.t * Math.PI * 2 * 4);
      const px = Math.round(this.ponta.x);
      // (larga: ±6 px — na 1ª revisão a ponta branca era minúscula na resolução do jogo)
      for (let x = px - 6; x <= px + 6; x++) {
        if (x < 0 || x >= W) continue;
        const y = this.trilha[x] - this.desloca(x);
        put(x, y - 1, BRANCO, p);
        put(x, y - 2, BRANCO, p * 0.4);
        put(x, y, BRANCO, p * 0.4);
        const yc = LUTA.crista - this.desloca(x);
        const k = 1 - Math.abs(x - px) / 7;
        put(x, yc, BRANCO, p * k);
        put(x, yc + 1, BRANCO, p * 0.6 * k);
        put(x, yc + 2, BRANCO, p * 0.3 * k);
      }
      const y0 = this.trilha[Math.max(0, Math.min(W - 1, px))] - this.desloca(px) - 1;
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3], [0, 3]]) put(px + dx, y0 + dy, BRANCO, p * 0.7);
    }

    // 4) the tears: the breach's own inside, the rim darker, the lower lip lit, the crest's plates bent up at the ends;
    //    while healing, the just-closed pixels darker (new tissue)
    for (const r of this.rasgos) {
      const k = r.abre ?? 1;
      const dobra = r.permanente ? 0 : 3 * (r.abre != null ? k : r.cura == null ? 1 : Math.max(0, 1 - r.cura * 2));
      if (dobra > 0) {
        for (const lado of [-1, 1]) for (let j = 0; j < 7; j++) {
          const x = Math.round(r.cx + lado * (r.meia * k + j - 2)), d = Math.round(dobra * (1 - j / 7));
          if (d <= 0 || x < 0 || x >= W) continue;
          for (let y = LUTA.crista - 8; y < LUTA.crista + 7; y++) put(x, y, daBase(x, y + d));
        }
      }
      const x0 = Math.max(0, Math.floor(r.cx - r.meia - 2)), x1 = Math.min(W - 1, Math.ceil(r.cx + r.meia + 2));
      for (let y = LUTA.crista - 6; y < Math.min(GAME_HEIGHT, LUTA.crista + r.fundo + 6); y++) for (let x = x0; x <= x1; x++) {
        if (this.aberto(r, x, y)) put(x, y, this.daCavidade(x - r.cx, y));
        else if (this.aberto(r, x, y - 1) || this.aberto(r, x + 1, y) || this.aberto(r, x - 1, y)) put(x, y, [0, 0, 0], 0.55);
        else if (this.aberto(r, x, y + 1)) put(x, y, [0, 0, 0], 0.4);
        else if (r.cura != null && !r.permanente) {
          const f = this.fundura(r, x, y);
          if (f >= 0 && f > r.cura - 0.18) put(x, y, [6, 4, 8], 0.45 * (1 - (r.cura - f) / 0.18));
        }
      }
    }

    // 4b) the burst: a white tear along the crest over the tear's span, fading (the concept's flash)
    for (const r of this.rasgos) {
      if (!r.clarao) continue;
      const a = r.clarao / 0.15;
      for (let x = Math.round(r.cx - r.meia - 4); x <= Math.round(r.cx + r.meia + 4); x++) {
        const k = 1 - Math.abs(x - r.cx) / (r.meia + 5);
        for (const dy of [0, 1, 2]) put(x, LUTA.crista + dy, BRANCO, a * k * (1 - dy * 0.3));
      }
    }

    // 5) the breach's rim blown away by the fusion: the cavity where it was
    if (this.anel) {
      const r = this.rombo();
      const cx = r ? r.x : LUTA.rombo.x;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.anel[y * W + x]) put(x, y + TOPO, this.daCavidade(x - cx, y + TOPO));
    }

    ctx.putImageData(id, 0, 0);
    this.tex.refresh();
  }

  /** The breach's inside, at this offset from a hole's centre (the cavity drawn in the breach art), a little darker. */
  private daCavidade(dx: number, y: number): [number, number, number] {
    if (!this.cavidade) return ESCURO;
    const sx = Math.round(LUTA.faixa.buraco + dx), sy = Math.round(y - (GAME_HEIGHT - FAIXA.h));
    if (sx < 0 || sx >= FAIXA.w || sy < 0 || sy >= FAIXA.h) return ESCURO;
    const i = (sy * FAIXA.w + sx) * 4;
    if (this.cavidade[i + 3] < 128) return ESCURO;
    return [this.cavidade[i] * 0.8, this.cavidade[i + 1] * 0.8, this.cavidade[i + 2] * 0.85];
  }

  /**
   * THE STRIP IN FRONT OF HER, over her width `x0..x1` (world px): from the crest down to her crop line, the band's own
   * pixels where the hull is whole, and a fade to the dark inside a hole (her necks go down into it). Empty when she is
   * gone (x0 > x1).
   */
  frente(x0: number, x1: number): void {
    const ctx = this.frenteTex.context;
    const id = ctx.createImageData(W, this.frenteH);
    const d = id.data;
    const a = Math.max(0, Math.floor(x0)), b = Math.min(W - 1, Math.ceil(x1));
    for (let x = a; x <= b; x++) {
      const buraco = this.noBuraco(x);
      for (let y = 0; y < this.frenteH; y++) {
        const j = (y * W + x) * 4;
        if (buraco) {
          d[j] = ESCURO[0]; d[j + 1] = ESCURO[1]; d[j + 2] = ESCURO[2];
          d[j + 3] = Math.round(255 * Math.min(1, (y + 1) / this.frenteH));
        } else {
          const i = ((LUTA.crista + y - TOPO) * W + x) * 4;
          d[j] = this.base[i]; d[j + 1] = this.base[i + 1]; d[j + 2] = this.base[i + 2]; d[j + 3] = this.base[i + 3];
        }
      }
    }
    ctx.putImageData(id, 0, 0);
    this.frenteTex.refresh();
  }

  /** Where the crack runs at column x (its row, with the bump), for the dust and the gravel. */
  linhaDaRachadura(x: number): number {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    return this.trilha[xi] - this.desloca(xi);
  }

  destroy(): void {
    this.img.destroy();
    this.frenteImg.destroy();
    for (const t of [this.tex, this.frenteTex]) if (this.scene.textures.exists(t.key)) this.scene.textures.remove(t.key);
  }

  // ─── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────

  private pixelsDe(src: HTMLImageElement | HTMLCanvasElement, w: number, h: number): Uint8ClampedArray {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  }

  private lum(px: Uint8ClampedArray, x: number, y: number, w: number): number {
    const i = (y * w + x) * 4;
    return px[i + 3] < 128 ? 255 : 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
  }

  /**
   * A texture key NEVER used before. ⚠️ Not "the first free one": the destruction engine caches a sprite's pixels by its
   * texture key (`Destrocos.visto`), and a burst whose temporary texture took the name of an earlier, removed one broke
   * into the EARLIER one's pixels (the 1st probe: the tear's burst threw the arrival's hole again, red, over the breach).
   */
  private chaveNova(s: string): string {
    let k: string;
    do k = `${s}${CascoVivo.serie++}`;
    while (this.scene.textures.exists(k));
    return k;
  }

  private static serie = 0;
}
