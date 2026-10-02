import { angulosDoLeque, raioDaExplosao } from '../../cartasRegras';
import type { Contexto, Inimigo } from './contexto';

export type FonteExplosao = 'explosivo' | 'combustao' | 'reativo' | 'missil' | 'flare';

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
  constructor(private readonly c: Contexto) {}

  /**
   * `angulo` (graus) é o rumo do tiro que causou a explosão: os estilhaços saem em leque para a frente dele. `null` =
   * sem rumo (morte, casco, flare, míssil), e o leque fecha o círculo. `exceto` é quem já levou o dano do projétil.
   */
  explodir(fonte: FonteExplosao, x: number, y: number, angulo: number | null, exceto: Inimigo | null): void {
    const base = EXPLOSAO[fonte];
    const maior = this.c.tem('EFF_002');
    const raio = raioDaExplosao(base.raio, maior);
    this.c.h.fx.explode(x, y, base.visual * (maior ? VISUAL_MAIOR : 1));
    this.c.depois(() => {
      for (const e of this.c.noRaio(x, y, raio)) {
        // EM CADEIA incendeia TODO mundo no raio — inclusive quem levou o tiro.
        if (this.c.tem('EFF_007')) this.c.incendiar(e);
        if (e !== exceto) this.c.ferir(e, base.dano);
      }
      if (this.c.tem('EFF_003')) this.estilhacos(x, y, angulo);
    });
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
