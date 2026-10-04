import Phaser from 'phaser';
import { angulosDoLeque, raioDaExplosao } from '../../cartasRegras';
import type { Contexto, Inimigo } from './contexto';

export type FonteExplosao = 'explosivo' | 'combustao' | 'reativo' | 'missil' | 'flare';

/**
 * COMO a explosão é desenhada — em avaliação com ele (02/10, *"o que podemos fazer para não ficarem tão iguais?"*):
 * - `jogo`: a de sempre (`Fx.explode`, a `explosion-small` em escala) — toda carta estoura igual;
 * - `variada` (A): a de sempre, VARIANDO — espelho/giro de 90° ao acaso, ritmo ±15%, e as grandes em 3 estouros;
 * - `aprovada` (A + B): a ARTE APROVADA de cada carta (§5.1c), com a mesma variação por cima.
 */
export type ArteDaExplosao = 'jogo' | 'variada' | 'aprovada';

interface AnimDaCarta {
  chave: string;
  sheet: string;
  quadros: number;
  fps: number;
  /** O leque aponta para a DIREITA na arte: gira com o rumo do tiro (em passos de 90°: pixel não gira em ângulo torto). */
  direcional: boolean;
  /** Onde o tiro bate, na largura do quadro: o estouro nasce ali e o leque abre para a frente. */
  origemX: number;
}

const ANIM: Record<'humPeq' | 'humGrande' | 'alien' | 'missil' | 'missilAlien' | 'fogo', AnimDaCarta> = {
  humPeq: { chave: 'carta-exp-hum-peq', sheet: 'expHumPeqSheet', quadros: 8, fps: 20, direcional: true, origemX: 0.35 },
  humGrande: { chave: 'carta-exp-hum-grande', sheet: 'expHumGrandeSheet', quadros: 8, fps: 18, direcional: true, origemX: 0.35 },
  alien: { chave: 'carta-exp-alien', sheet: 'expAlienSheet', quadros: 8, fps: 20, direcional: true, origemX: 0.3 },
  missil: { chave: 'carta-exp-missil', sheet: 'expMissilSheet', quadros: 4, fps: 14, direcional: false, origemX: 0.5 },
  // A MESMA redonda, repintada na manta (§5.1c; `scripts/instalar-explosoes-cartas.mjs`).
  missilAlien: { chave: 'carta-exp-missil-alien', sheet: 'expMissilAlienSheet', quadros: 4, fps: 14, direcional: false, origemX: 0.5 },
  fogo: { chave: 'carta-exp-fogo', sheet: 'expFogoSheet', quadros: 9, fps: 16, direcional: false, origemX: 0.5 },
};

/** As explosões GRANDES viram 3 estouros defasados (A), não uma bola só. */
const EM_ESTOUROS: FonteExplosao[] = ['combustao', 'reativo'];
const PROFUNDIDADE = 50;

/** Raio (px do mundo), dano e o tamanho do `Fx.explode` de cada fonte — PROVISÓRIOS (calibragem). */
const EXPLOSAO: Record<FonteExplosao, { raio: number; dano: number; visual: number }> = {
  explosivo: { raio: 18, dano: 1, visual: 0.45 },
  combustao: { raio: 26, dano: 2, visual: 0.9 },
  reativo: { raio: 40, dano: 3, visual: 1.2 },
  missil: { raio: 20, dano: 1, visual: 0.6 },
  flare: { raio: 22, dano: 2, visual: 0.6 },
};
const VISUAL_MAIOR = 1.3;
const ESTILHACOS = { n: 5, velocidade: 150, alcance: 36, dano: 1 };

/**
 * A EXPLOSÃO DO JOGADOR É UM SISTEMA (§4.1). Explosivo, Combustão, Casco Reativo, Flare e Míssil chamam a MESMA
 * função, e nela se penduram as cartas de explosão — assim as cadeias se cruzam (o Míssil com Fragmentado, o Flare com
 * Em Cadeia) sem carta nova:
 * - EXPLOSÃO MAIOR → multiplica o raio;
 * - FRAGMENTADO → solta os estilhaços (projéteis comuns: NÃO explodem de novo);
 * - EM CADEIA → incendeia quem está no raio (incendeia, não explode: quem explode é a Combustão, quando o queimado
 *   morre).
 */
export class ExplosaoDoJogador {
  /** Ver `ArteDaExplosao`. Trocável no console para comparar (`cartas.explosao.arte = 'jogo'`). */
  arte: ArteDaExplosao = 'aprovada';

  constructor(private readonly c: Contexto) {}

  /**
   * `angulo` (graus) é o rumo do tiro que causou a explosão: os estilhaços saem em leque para a frente dele. `null` =
   * sem rumo (morte, casco, flare, míssil), e o leque fecha o círculo. `exceto` é quem já levou o dano do projétil.
   */
  explodir(fonte: FonteExplosao, x: number, y: number, angulo: number | null, exceto: Inimigo | null): void {
    const base = EXPLOSAO[fonte];
    const maior = this.c.tem('EFF_002');
    const raio = raioDaExplosao(base.raio, maior);
    this.desenhar(fonte, x, y, angulo, maior, base.visual * (maior ? VISUAL_MAIOR : 1), raio);
    this.c.depois(() => {
      for (const e of this.c.noRaio(x, y, raio)) {
        // EM CADEIA incendeia TODO mundo no raio — inclusive quem levou o tiro.
        if (this.c.tem('EFF_007')) this.c.incendiar(e);
        if (e !== exceto) this.c.ferir(e, base.dano, `explosão (${fonte})`);
      }
      if (this.c.tem('EFF_003')) this.estilhacos(x, y, angulo);
    });
  }

  // ─── O DESENHO ────────────────────────────────────────────────────────────────────────────────

  private desenhar(
    fonte: FonteExplosao,
    x: number,
    y: number,
    angulo: number | null,
    maior: boolean,
    visual: number,
    raio: number,
  ): void {
    const fx = this.c.h.fx;
    if (this.arte === 'jogo') {
      fx.explode(x, y, visual);
      return;
    }
    const anim = this.arte === 'aprovada' ? this.animDaCarta(fonte, maior) : null;
    const estouro = (ex: number, ey: number, escala: number): void => {
      if (anim && this.c.h.scene.textures.exists(anim.sheet)) {
        this.variar(this.animar(anim, ex, ey, angulo), anim.direcional);
        return;
      }
      const s = fx.sheetSprite('explosion-small', 'explosionSmallSheet', ex, ey, 1.1 * escala, PROFUNDIDADE);
      if (s) this.variar(s, false);
    };

    fx.abalo(x, y, visual);
    estouro(x, y, visual);
    if (!EM_ESTOUROS.includes(fonte)) return;
    // A GRANDE em 3 estouros: dois a mais, deslocados dentro do raio e defasados — massa explodindo, não um balão.
    for (const atraso of [70, 140]) {
      const ex = x + Phaser.Math.FloatBetween(-0.4, 0.4) * raio;
      const ey = y + Phaser.Math.FloatBetween(-0.4, 0.4) * raio;
      this.c.h.scene.time.delayedCall(atraso, () => estouro(ex, ey, visual * 0.7));
    }
  }

  /** B: a arte aprovada de cada carta (§5.1c). O alien estoura em ENERGIA; o humano, em fogo e fumaça. */
  private animDaCarta(fonte: FonteExplosao, maior: boolean): AnimDaCarta {
    if (fonte === 'combustao') return ANIM.fogo;
    if (fonte === 'explosivo') {
      if (this.c.h.linhagem === 'alien') return ANIM.alien;
      return maior ? ANIM.humGrande : ANIM.humPeq;
    }
    // Míssil, flare e casco: a redonda #53 — chegam de qualquer ângulo, e a redonda dispensa as direções. O míssil da
    // manta estoura na redonda repintada (o flare e o casco não têm versão por linhagem na spec).
    if (fonte === 'missil' && this.c.h.linhagem === 'alien' && this.c.h.scene.textures.exists(ANIM.missilAlien.sheet)) {
      return ANIM.missilAlien;
    }
    return ANIM.missil;
  }

  private animar(anim: AnimDaCarta, x: number, y: number, angulo: number | null): Phaser.GameObjects.Sprite {
    const s = this.c.h.scene;
    if (!s.anims.exists(anim.chave)) {
      s.anims.create({
        key: anim.chave,
        frames: s.anims.generateFrameNumbers(anim.sheet, { start: 0, end: anim.quadros - 1 }),
        frameRate: anim.fps,
        repeat: 0,
      });
    }
    const sp = s.add.sprite(x, y, anim.sheet, 0).setDepth(PROFUNDIDADE);
    if (anim.direcional) {
      sp.setOrigin(anim.origemX, 0.5);
      sp.setAngle(Math.round((angulo ?? 0) / 90) * 90);
    }
    sp.play(anim.chave);
    sp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sp.destroy());
    return sp;
  }

  /**
   * A: a MESMA explosão nunca sai igual. Só espelho e giro em 90° — pixel girado em ângulo torto ou esticado deforma.
   * A direcional só espelha no eixo do tiro (o leque continua para a frente); a redonda espelha e gira à vontade.
   */
  private variar(sp: Phaser.GameObjects.Sprite, direcional: boolean): void {
    sp.setFlipY(Math.random() < 0.5);
    if (!direcional) {
      sp.setFlipX(Math.random() < 0.5);
      sp.setAngle(Phaser.Math.RND.pick([0, 90, 180, 270]));
    }
    sp.anims.timeScale = Phaser.Math.FloatBetween(0.85, 1.15);
  }

  private estilhacos(x: number, y: number, angulo: number | null): void {
    for (const a of angulosDoLeque(ESTILHACOS.n, angulo)) {
      this.c.h.weapons.disparar({
        x,
        y,
        angulo: a,
        textura: 'carta-estilhaco',
        velocidade: ESTILHACOS.velocidade,
        dano: ESTILHACOS.dano,
        alcance: ESTILHACOS.alcance,
        origem: 'estilhaco',
      });
    }
  }
}
