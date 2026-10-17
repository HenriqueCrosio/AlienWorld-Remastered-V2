import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Moldura } from './Moldura';

/** As quatro famílias do primeiro plano, na ordem da folha de 17/10. */
type Familia = 'tendoes' | 'ossos' | 'polipos' | 'membrana';

interface Peca {
  frame: string;
  familia: Familia;
  w: number;
  h: number;
}

interface Viva {
  img: Phaser.GameObjects.Image;
  /** O x em ponto flutuante; o sprite recebe o arredondado (nada de meio pixel). */
  x: number;
  teto: boolean;
}

/**
 * O PRIMEIRO PLANO PRÓPRIO DA FASE 4 (polimento, bloco C — aprovado por ele em 17/10).
 *
 * No bloco A (15/10) saíram as silhuetas `derelict`: a faixa de primeiro plano delas, em escala 1,6–1,9, passava POR
 * CIMA da borda e mordia o corredor, e a fase perdeu profundidade. Esta camada repõe a profundidade sem repetir o
 * defeito: silhuetas orgânicas QUASE PRETAS que moram SÓ na faixa da borda, entre a beira da tela e a linha da
 * superfície, e NUNCA cruzam essa linha. Elas andam 1,3× mais rápido que a borda — é o paralaxe que diz "isto está
 * perto da lente". Folha: `docs/superpowers/folhas/2026-10-17/f4-frente/`.
 *
 * ⚠️ CENÁRIO, NÃO JOGO. Sem corpo, sem colisão, fora de todo grupo. E nada aqui sorteia do fluxo do jogo
 * (`Math.random`, não `Phaser.Math`): decoração não pode adiantar o dado da fase — a mesma lei do
 * `Parallax.familiaDoCasco`.
 *
 * ⚠️ AS FAMÍLIAS POR CÂMARA, pela regra dele: *"ossos e tendões na borda, os pólipos podem aparecer na câmara do
 * golfinho também, membrana em todos"*. Ossos e tendões vão em toda a borda; os pólipos, que leram como cracas no duto,
 * entram no duto e na câmara azul do golfinho; a membrana, em todas. A câmara sai da BORDA da placa em que a peça
 * nasce (`Moldura.faixaEm`), então a troca de família rola com o mundo, como a própria borda.
 *
 * ⚠️ DEPTH 60, DEBAIXO DA NÉVOA. Testado em 99 (a câmera limpa, sem névoa nem grão) e ele escolheu a névoa: *"fica
 * mais sombrio e com mais aspecto de layer de imersão"*.
 */
export class PrimeiroPlanoF4 {
  static readonly TEXTURA = 'f4Frente';
  /** Quantas vezes a velocidade da borda. Mais rápido = mais perto da lente. */
  static readonly FATOR = 1.3;
  static readonly DEPTH = 60;
  /** A folga até a superfície: a ponta mais alta para 3px antes da linha da borda. */
  static readonly FOLGA = 3;
  /**
   * ⚠️ A PEÇA TEM DE ENCHER A FAIXA. A faixa é escura justo na beira da tela e só clareia perto da superfície (a linha
   * de lava, os arcos das costelas); uma silhueta quase preta e baixa fica sobre a parte escura e some. Medido na folha
   * de 17/10: abaixo de ~55% do espaço ela não lê.
   */
  static readonly ENCHE = 0.55;
  /** O vão entre duas peças do mesmo lado, em px. */
  static readonly VAO: [number, number] = [40, 110];
  /** Sem peça que caiba (a abertura tem só 14–19px de faixa), tenta de novo depois disto. */
  static readonly ESPERA = 0.25;

  static readonly POR_BORDA: Record<string, Familia[]> = {
    f4FaixaA: ['tendoes', 'ossos', 'membrana'],
    f4FaixaB: ['tendoes', 'ossos', 'polipos', 'membrana'],
    f4FaixaC: ['tendoes', 'ossos', 'polipos', 'membrana'],
    f4FaixaD: ['tendoes', 'ossos', 'membrana'],
  };

  private readonly pecas: Peca[] = [];
  private readonly vivas: Viva[] = [];
  /** Por lado (0 = chão, 1 = teto): quantos px de vão a próxima peça ainda espera, e a espera sem peça. */
  private readonly vao = [0, 0];
  private readonly espera = [0, 0];
  private ativo: boolean;
  private alphaElite = 1;
  private alphaArena = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly moldura: Moldura,
    desenha: boolean,
  ) {
    this.ativo = desenha && scene.textures.exists(PrimeiroPlanoF4.TEXTURA);
    if (!this.ativo) return;
    const tex = scene.textures.get(PrimeiroPlanoF4.TEXTURA);
    for (const frame of tex.getFrameNames()) {
      const familia = frame.split('-')[0] as Familia;
      const f = tex.get(frame);
      this.pecas.push({ frame, familia, w: f.width, h: f.height });
    }
  }

  atualiza(dt: number, speed: number): void {
    if (!this.ativo && this.vivas.length === 0) return;
    const dx = speed * PrimeiroPlanoF4.FATOR * dt;
    for (const v of this.vivas) {
      v.x -= dx;
      v.img.x = Math.round(v.x);
    }
    for (let i = this.vivas.length - 1; i >= 0; i--) {
      const v = this.vivas[i];
      if (v.x + v.img.width < 0) {
        v.img.destroy();
        this.vivas.splice(i, 1);
      }
    }
    if (!this.ativo) return;
    for (const lado of [0, 1]) {
      this.vao[lado] -= dx;
      this.espera[lado] -= dt;
      if (this.vao[lado] > 0 || this.espera[lado] > 0) continue;
      if (this.nasce(lado === 1)) this.vao[lado] = Phaser.Math.Linear(PrimeiroPlanoF4.VAO[0], PrimeiroPlanoF4.VAO[1], Math.random());
      else this.espera[lado] = PrimeiroPlanoF4.ESPERA;
    }
  }

  /** Com ELITE em cena o primeiro plano atenua, como o do `Parallax` (`setForegroundElite`): ele tapava o elite. */
  setElite(atenuado: boolean, durationMs = 600): void {
    this.alphaElite = atenuado ? 0.25 : 1;
    this.tweenAlpha(durationMs);
  }

  /** A ARENA DO CHEFÃO é só pintura e borda: para de nascer e o que está na tela apaga (`Parallax.limpaCenario`). */
  limpa(durationMs: number): void {
    this.ativo = false;
    this.alphaArena = 0;
    this.tweenAlpha(durationMs);
  }

  private get alpha(): number {
    return this.alphaElite * this.alphaArena;
  }

  private tweenAlpha(durationMs: number): void {
    const alvo = this.vivas.map((v) => v.img);
    if (!alvo.length) return;
    if (durationMs <= 0) alvo.forEach((o) => o.setAlpha(this.alpha));
    else this.scene.tweens.add({ targets: alvo, alpha: this.alpha, duration: durationMs, ease: 'Quad.easeOut' });
  }

  /**
   * Uma peça nova na borda direita, se alguma couber. Devolve se nasceu.
   *
   * ⚠️ O QUE "CABER" QUER DIZER, já que a peça anda mais rápido que a faixa. Em relação à faixa ela ESCORREGA para a
   * esquerda: atravessar a tela (384 + w px a 1,3×) leva a faixa a andar só `1/1,3` disso, então a peça passa sobre
   * `(384 + w) × 0,3/1,3` px de faixa À ESQUERDA de onde nasceu. Toda essa faixa já existe — ela está na tela —, e a
   * altura de cada placa é fixa desde que ela nasceu. Então o mínimo da espessura nesse trecho vale para a vida inteira
   * da peça: ela nunca cruza a superfície. À direita, só se pergunta até `Moldura.alcance()` (ver lá o porquê).
   */
  private nasce(teto: boolean): boolean {
    const x0 = GAME_WIDTH;
    const familias = PrimeiroPlanoF4.POR_BORDA[this.moldura.faixaEm(x0, teto)];
    if (!familias) return false;
    const alcance = Math.floor(this.moldura.alcance()) - 1;
    const recuo = (PrimeiroPlanoF4.FATOR - 1) / PrimeiroPlanoF4.FATOR;
    const espessura = (x: number): number =>
      teto ? this.moldura.superficieTetoEm(x) : GAME_HEIGHT - this.moldura.superficieChaoEm(x);
    const faixaMin = (de: number, ate: number): number => {
      let m = Infinity;
      for (let x = Math.max(0, Math.floor(de)); x <= ate; x += 2) m = Math.min(m, espessura(x));
      return Math.min(m, espessura(ate));
    };
    const cabem = this.pecas.filter((p) => {
      if (!familias.includes(p.familia) || x0 + p.w > alcance) return false;
      const livre = faixaMin(x0 - (GAME_WIDTH + p.w) * recuo - 2, x0 + p.w) - PrimeiroPlanoF4.FOLGA;
      return p.h <= livre && p.h >= PrimeiroPlanoF4.ENCHE * livre;
    });
    if (!cabem.length) return false;
    // A FAMÍLIA PRIMEIRO, depois a peça: sorteando a peça direto, a família com mais peças que cabem (os ossos têm 14)
    // dominaria a câmara.
    const naFaixa = familias.filter((f) => cabem.some((p) => p.familia === f));
    const familia = naFaixa[Math.floor(Math.random() * naFaixa.length)];
    const daFamilia = cabem.filter((p) => p.familia === familia);
    const p = daFamilia[Math.floor(Math.random() * daFamilia.length)];
    const img = this.scene.add
      .image(x0, teto ? 0 : GAME_HEIGHT, PrimeiroPlanoF4.TEXTURA, p.frame)
      .setOrigin(0, teto ? 0 : 1)
      .setFlipY(teto)
      .setFlipX(Math.random() < 0.5)
      .setDepth(PrimeiroPlanoF4.DEPTH)
      .setAlpha(this.alpha);
    this.vivas.push({ img, x: x0, teto });
    return true;
  }
}
