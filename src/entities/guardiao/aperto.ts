/**
 * O APERTO (23/11, o passo 4 — spec 2026-11-22 §7): o próprio Leviatã, operado pela coleira. Puro: o perfil da onda, as
 * fases e o empurrão, testados em Node (`scripts/test-guardiao-aperto.mjs`); quem desenha é `camadaAperto.ts`.
 *
 * - O AVISO: um puxão forte — os cabos esticam para cima, o corpo se firma, a borda inteira ESTREMECE (~0,6 s).
 * - A ONDA: uma CONSTRIÇÃO corre da direita para a esquerda — as bordas de cima e de baixo incham para dentro NO MESMO
 *   PONTO, fechando o corredor até um VÃO de 50 px (nunca menos), que passa pela tela em ~2,5 s. A nave atravessa o anel
 *   pelo vão.
 * - A TÉCNICA: cada COLUNA de pixels da faixa pintada desloca um número INTEIRO de pixels — nada estica, nada se
 *   redesenha.
 * - O contato EMPURRA — e, decisão dele na rodada 1 (23/11), TAMBÉM COBRA 1 VIDA: *"normalmente a borda não cobra, essa
 *   mecânica é a borda retorcida"*; o aperto é uma ação própria do rodízio, não acompanha outra skill. E a resposta veio
 *   junto: *"caso coloque uma linha em torno da borda inchada, essa linha do contorno pode ser o hitbox que a borda
 *   convencional não tem"* — o FIO aceso só onde a borda está torcida (a lei do duto: a parede nunca morde sem a linha
 *   acesa, e a linha nunca acende numa parede que não morde).
 *
 * As respostas dele (23/11): o vão ALTERNA alto/baixo a cada aperto (*"gostei da alternância"*); o anel incha no lugar à
 * direita antes de correr (*"é preciso uma primeira leitura justa, depois é reflexo do jogador"*). O empurrão é pela
 * NORMAL da parede (no flanco da frente ele também leva a nave para a esquerda) — é ele que tira a nave de dentro dela
 * depois do toque, e os i-frames do `damageShip` separam os toques.
 */

import type { DeformaBorda } from './deformaBorda';

export interface Ponto {
  x: number;
  y: number;
}

export type FaseAperto = 'aviso' | 'cresce' | 'corre' | 'fim';

export const APERTO = {
  /** s: o puxão e a borda estremecendo */
  AVISO: 0.6,
  /** s: o anel incha no lugar, à direita, antes de correr (é aqui que o vão se lê) */
  CRESCE: 0.45,
  /** s: o anel atravessa a tela */
  TRAVESSIA: 2.5,
  /**
   * px: meia largura do anel (um cosseno levantado: suave, sem quina). Com 46 a parede de 80 px subia em tenda, íngreme
   * (medido no 1º filme): 64 é a borda INCHANDO.
   */
  MEIA: 64,
  /** px: o vão no centro do anel — NUNCA menos */
  VAO: 50,
  /** px: onde o centro do anel nasce (à direita, atrás dele) e onde some (fora pela esquerda) */
  X0: 372,
  X1: -66,
  /** px: o estremecer da borda no aviso (inteiro) */
  TREME: 1,
  /** s: de quanto em quanto o estremecer muda */
  TREME_S: 0.05,
  /** px: as colunas estremecem em blocos (a parede é uma peça, não ruído de pixel) */
  TREME_BLOCO: 6,
} as const;

/** O centro do vão de cada aperto, alternando (y de tela): A alto, B baixo. O corredor da arena vai de ~30 a ~185. */
export const VAOS_Y = [80, 138] as const;

/** o perfil do anel em x (0..1): um cosseno levantado de meia largura `MEIA` em torno de `xc` */
export function anel(x: number, xc: number): number {
  const u = (x - xc) / APERTO.MEIA;
  if (u <= -1 || u >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * u));
}

/**
 * Quanto cada borda desce (teto) e sobe (chão) na coluna `x`, em px INTEIROS. `yTeto`/`yChao` são as superfícies da
 * faixa nessa coluna (as de agora, da moldura). No pico as bordas chegam exatamente às linhas do vão (`vaoY ± VAO/2`) — e
 * o `floor` garante que o arredondamento nunca fecha o vão abaixo de `VAO`.
 */
export function deslocamentos(
  x: number,
  yTeto: number,
  yChao: number,
  xc: number,
  amp: number,
  vaoY: number,
): { teto: number; chao: number } {
  const b = anel(x, xc) * amp;
  if (b <= 0) return { teto: 0, chao: 0 };
  const cima = vaoY - APERTO.VAO / 2;
  const baixo = vaoY + APERTO.VAO / 2;
  return {
    teto: Math.max(0, Math.floor(b * (cima - yTeto))),
    chao: Math.max(0, Math.floor(b * (yChao - baixo))),
  };
}

export class Aperto implements DeformaBorda {
  fase: FaseAperto = 'aviso';
  /** o centro do anel (x de tela) */
  xc: number = APERTO.X0;
  /** 0..1: o quanto o anel está inchado */
  amp = 0;
  private t = 0;

  constructor(readonly vaoY: number) {}

  get acabou(): boolean {
    return this.fase === 'fim';
  }

  /** o aviso: a borda inteira estremece */
  get treme(): boolean {
    return this.fase === 'aviso';
  }

  deslocar(x: number, yTeto: number, yChao: number): { teto: number; chao: number } {
    return deslocamentos(x, yTeto, yChao, this.xc, this.amp, this.vaoY);
  }

  /** o relógio da fase (o estremecer do aviso o usa) */
  get relogio(): number {
    return this.t;
  }

  /** px/s do anel correndo (para o empurrão no flanco da frente) */
  static get velocidade(): number {
    return (APERTO.X0 - APERTO.X1) / APERTO.TRAVESSIA;
  }

  passo(dt: number): void {
    const A = APERTO;
    this.t += dt;
    switch (this.fase) {
      case 'aviso':
        if (this.t >= A.AVISO) this.troca('cresce');
        break;
      case 'cresce': {
        const k = Math.min(1, this.t / A.CRESCE);
        this.amp = k * k * (3 - 2 * k);
        if (k >= 1) this.troca('corre');
        break;
      }
      case 'corre': {
        const k = Math.min(1, this.t / A.TRAVESSIA);
        this.xc = A.X0 + (A.X1 - A.X0) * k;
        if (k >= 1) {
          this.amp = 0;
          this.troca('fim');
        }
        break;
      }
      case 'fim':
        break;
    }
  }

  private troca(f: FaseAperto): void {
    this.fase = f;
    this.t = 0;
  }
}

/**
 * O EMPURRÃO: a nave (centro `nave`, caixa `w`×`h`) dentro de uma parede sai pela NORMAL dela, nunca com dano. `teto(x)` e
 * `chao(x)` são as superfícies DEFORMADAS na coluna x. Devolve a posição nova (igual à de entrada se não encostou).
 * A normal de y = f(x) é (−f′, 1) no teto e (f′, −1) no chão: no flanco da frente do anel (a parede subindo à direita)
 * ela aponta para a ESQUERDA — o anel leva a nave junto, em vez de só espremê-la para o vão.
 */
export function empurrar(
  nave: Ponto,
  w: number,
  h: number,
  teto: (x: number) => number,
  chao: (x: number) => number,
): Ponto {
  const x0 = Math.round(nave.x - w / 2), x1 = Math.round(nave.x + w / 2);
  let fundoT = -Infinity, xT = nave.x, topoC = Infinity, xC = nave.x;
  for (let x = x0; x <= x1; x++) {
    const t = teto(x), c = chao(x);
    if (t > fundoT) { fundoT = t; xT = x; }
    if (c < topoC) { topoC = c; xC = x; }
  }
  let { x, y } = nave;
  const penT = fundoT - (y - h / 2);
  if (penT > 0) {
    const d = (teto(xT + 1) - teto(xT - 1)) / 2;
    const n = Math.hypot(d, 1);
    // a vertical resolve a penetração inteira; a horizontal é a parte da normal (o flanco leva a nave)
    y += penT;
    x += (-d / n) * penT;
  }
  const penC = y + h / 2 - topoC;
  if (penC > 0) {
    const d = (chao(xC + 1) - chao(xC - 1)) / 2;
    const n = Math.hypot(d, 1);
    y -= penC;
    x += (d / n) * penC;
  }
  return { x, y };
}
