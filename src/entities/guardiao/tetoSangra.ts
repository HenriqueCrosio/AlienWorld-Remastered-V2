/**
 * O TETO QUE SANGRA (23/11, o passo 5 — spec 2026-11-22 §7): o próprio Leviatã, operado pela coleira. Puro: a linha do
 * tempo, os pontos, o inchaço da borda e a agenda das gotas, testados em Node (`scripts/test-guardiao-teto.mjs`). Quem
 * desenha a borda é `camadaBorda.ts` (esta classe é uma `DeformaBorda`); quem desenha e solta as gotas é
 * `sangueTeto.ts`; o pulso nos cabos é `CamadaCabos.pulso`.
 *
 * - O AVISO: ele BOMBEIA pelos cabos — um pulso aceso sobe até o teto (`SOBE`) e se espalha pela borda (`ESPALHA`), da
 *   direita para a esquerda; os pontos da borda de cima (sobre os 2/3 da esquerda) INCHAM e acendem ~0,8 s.
 * - A QUEDA: cada ponto solta uma COLUNA RETA de gotas grossas (gravidade, sem arco — nada empurra para o lado). DUAS
 *   ONDAS ALTERNADAS: a 2ª, 0,7 s depois, cai nos VÃOS da 1ª. Na borda de baixo, respingo (e a gota segue: a parede não
 *   protege, a lei da lava).
 * - O material: o sangue quente do hospedeiro — vermelho mais escuro e viscoso que a lava do miolo; a gota ESTICA antes de
 *   soltar. Dano 1.
 * - A lei da borda viva: o ponto inchado leva o FIO aceso e MORDE (quem se esconde na faixa do teto, em cima dele, não
 *   fica fora); o pulso que corre a borda é OUTRA luz (vermelha) e não morde.
 *
 * ⚠️ DECISÕES MINHAS (perguntadas na folha): 4 pontos por onda, a cada 64 px (A em 32…224, B em 64…256: a figura fixa);
 * 3 gotas por ponto, a 0,1 s uma da outra; a gravidade da lava (260); a 2ª onda acende quando a 1ª solta (cada onda tem
 * o seu aviso).
 */
import type { DeformaBorda } from './deformaBorda';

export const TETO = {
  /** s: o pulso sobe pelos cabos até o teto */
  SOBE: 0.3,
  /** s: o pulso corre a borda de cima, da direita para a esquerda */
  ESPALHA: 0.3,
  /** s: a 1ª onda incha e acende antes de soltar */
  INCHA_A: 0.8,
  /** s: a 2ª onda incha enquanto a 1ª cai — e solta 0,7 s depois dela */
  INCHA_B: 0.7,
  /** s: a gota pendurada estica no fim do inchaço */
  ESTICA: 0.25,
  /**
   * gotas por ponto (a coluna) e o intervalo entre elas. Com 0,14 s a coluna durava tanto que, entre a última gota da 1ª
   * onda passar e a 1ª da 2ª chegar, sobravam 0,07 s para a nave andar os 32 px até a coluna velha (medido no teste da
   * troca): 0,1 s dá ≥ 0,35 s de y 60 para baixo.
   */
  GOTAS: 3,
  ENTRE: 0.1,
  /** s: o ponto murcha depois da última gota */
  MURCHA: 0.3,
  /** px: meia largura do inchaço e a altura dele (inteiro, a lei da borda viva) */
  MEIA: 8,
  ALTURA: 6,
  /** px/s²: a gravidade da F4 (a da lava, `CamadaCabos`) */
  G: 260,
  /** px: o raio que fere da gota */
  RAIO: 3.5,
  /** x de onde o pulso começa a correr a borda (onde os cabos chegam ao teto) */
  X_ORIGEM: 320,
  /** ABGR: o pulso que corre a borda — o vermelho do sangue, aceso, mas não é o fio; a FRENTE dele mais clara */
  LUZ_PULSO: 0xff2a3ad8,
  LUZ_FRENTE: 0xff5a78ff,
} as const;

/** os pontos de cada onda (x de tela): B no meio de cada vão de A, os dois sobre os 2/3 da esquerda */
export const PONTOS_A = [32, 96, 160, 224] as const;
export const PONTOS_B = [64, 128, 192, 256] as const;

export type FaseTeto = 'sobe' | 'espalha' | 'sangra' | 'fim';

/** uma gota que soltou neste passo */
export interface Queda {
  x: number;
  onda: 0 | 1;
}

/** uma gota pendurada esticando (k 0..1) num ponto */
export interface Pendurada {
  x: number;
  k: number;
}

const suave = (k: number): number => {
  const u = Math.max(0, Math.min(1, k));
  return u * u * (3 - 2 * u);
};

export class TetoQueSangra implements DeformaBorda {
  readonly treme = false;
  fase: FaseTeto = 'sobe';
  /** o relógio desde o começo */
  t = 0;
  /** as gotas que soltaram no último `passo` (o Phaser as cria) */
  quedas: Queda[] = [];
  private soltas = [0, 0];

  /** quando cada onda começa a inchar e quando solta a 1ª gota */
  static inicio(onda: 0 | 1): number {
    const T = TETO;
    return onda === 0 ? T.SOBE + T.ESPALHA : T.SOBE + T.ESPALHA + T.INCHA_A;
  }

  static solta(onda: 0 | 1): number {
    return TetoQueSangra.inicio(onda) + (onda === 0 ? TETO.INCHA_A : TETO.INCHA_B);
  }

  /** quando a última gota da onda solta */
  static ultima(onda: 0 | 1): number {
    return TetoQueSangra.solta(onda) + (TETO.GOTAS - 1) * TETO.ENTRE;
  }

  /** quando a borda volta inteira (a última onda murchou) */
  static get fim(): number {
    return TetoQueSangra.ultima(1) + TETO.MURCHA;
  }

  /** quando a gota solta em y0 passa pela altura y (s depois de soltar): a queda livre */
  static queda(y0: number, y: number): number {
    return Math.sqrt((2 * Math.max(0, y - y0)) / TETO.G);
  }

  get acabou(): boolean {
    return this.fase === 'fim';
  }

  /** o pulso nos cabos: 0..1 subindo (do corpo à âncora), ou null */
  get pulsoCabos(): number | null {
    return this.fase === 'sobe' ? Math.min(1, this.t / TETO.SOBE) : null;
  }

  /** a frente do pulso que corre a borda (x de tela), ou null */
  get frente(): number | null {
    if (this.t < TETO.SOBE) return null;
    const k = (this.t - TETO.SOBE) / TETO.ESPALHA;
    return k > 1 ? null : TETO.X_ORIGEM * (1 - k);
  }

  passo(dt: number): void {
    const T = TETO;
    this.t += dt;
    this.quedas = [];
    for (const onda of [0, 1] as const) {
      const pontos = onda === 0 ? PONTOS_A : PONTOS_B;
      while (this.soltas[onda] < T.GOTAS && this.t >= TetoQueSangra.solta(onda) + this.soltas[onda] * T.ENTRE) {
        for (const x of pontos) this.quedas.push({ x, onda });
        this.soltas[onda]++;
      }
    }
    if (this.t >= TetoQueSangra.fim) this.fase = 'fim';
    else if (this.t >= T.SOBE + T.ESPALHA) this.fase = 'sangra';
    else if (this.t >= T.SOBE) this.fase = 'espalha';
  }

  /** o inchaço da onda (0..1): sobe no aviso, fica até a última gota, murcha */
  inchaco(onda: 0 | 1): number {
    const T = TETO;
    const i = TetoQueSangra.inicio(onda), s = TetoQueSangra.solta(onda), u = TetoQueSangra.ultima(onda);
    if (this.t < i) return 0;
    if (this.t < s) return suave((this.t - i) / Math.max(0.01, s - i - T.ESTICA));
    if (this.t < u) return 1;
    return 1 - suave((this.t - u) / T.MURCHA);
  }

  /** as gotas penduradas esticando agora (a 1ª de cada ponto, no fim do inchaço) */
  penduradas(): Pendurada[] {
    const out: Pendurada[] = [];
    for (const onda of [0, 1] as const) {
      const s = TetoQueSangra.solta(onda);
      if (this.t < s - TETO.ESTICA || this.t >= s) continue;
      const k = (this.t - (s - TETO.ESTICA)) / TETO.ESTICA;
      for (const x of onda === 0 ? PONTOS_A : PONTOS_B) out.push({ x, k });
    }
    return out;
  }

  deslocar(x: number, _yTeto: number, _yChao: number): { teto: number; chao: number } {
    let d = 0;
    for (const onda of [0, 1] as const) {
      const a = this.inchaco(onda);
      if (a <= 0) continue;
      for (const px of onda === 0 ? PONTOS_A : PONTOS_B) {
        const u = (x - px) / TETO.MEIA;
        if (u <= -1 || u >= 1) continue;
        d = Math.max(d, a * TETO.ALTURA * 0.5 * (1 + Math.cos(Math.PI * u)));
      }
    }
    return { teto: Math.floor(d), chao: 0 };
  }

  /** o pulso correndo a borda: aceso da frente até a origem, apagando atrás dela */
  luzTeto(x: number): number {
    const f = this.frente;
    if (f === null || x < f || x > TETO.X_ORIGEM) return 0;
    // um rastro de 40 px atrás da frente: o pulso é uma onda, não um traço que fica
    if (x - f <= 6) return TETO.LUZ_FRENTE;
    return x - f <= 40 ? TETO.LUZ_PULSO : 0;
  }
}
