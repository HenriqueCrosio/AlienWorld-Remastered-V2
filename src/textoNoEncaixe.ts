import type { Caixa } from './molduraCarta';

/**
 * O TEXTO NO ENCAIXE — medir, quebrar e centrar pela TINTA (spec 2026-09-30-mesa-compacta-arte-design.md §3).
 *
 * A caixa de um objeto de texto inclui o espaço de acento e de descendente: centrar pela caixa joga a palavra em
 * maiúsculas para fora do meio (o defeito que ele apontou na folha de 30/09). Aqui tudo é pela tinta — o retângulo
 * dos pixels acesos que o navegador mede (`measureText().actualBoundingBox*`).
 *
 * As funções de layout são PURAS (recebem a medida como função) — `scripts/test-texto-encaixe.mjs` as cobra em node.
 * Só `medidorDaFonte` toca o navegador.
 */

/** A tinta de UMA linha, relativa ao ponto de alinhamento (x) e à linha de base (y), em unidades da cena. */
export interface Tinta {
  x0: number;
  x1: number;
  asc: number;
  desc: number;
}

export type Medir = (texto: string, px: number) => Tinta;

/** Mede numa escala grande e divide: a medida não depende da janela, e o layout da carta sai IGUAL em todas. */
const ESCALA_MEDIDA = 8;
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, Tinta>();

/** A medida da tinta numa família CSS (a mesma string que o Phaser põe no `font` do texto). */
export function medidorDaFonte(familia: string): Medir {
  return (texto, px) => {
    const chave = `${familia}|${px}|${texto}`;
    const tem = cache.get(chave);
    if (tem) return tem;
    if (!ctx) ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${px * ESCALA_MEDIDA}px ${familia}`;
    const m = ctx.measureText(texto);
    const t: Tinta = {
      x0: -m.actualBoundingBoxLeft / ESCALA_MEDIDA,
      x1: m.actualBoundingBoxRight / ESCALA_MEDIDA,
      asc: m.actualBoundingBoxAscent / ESCALA_MEDIDA,
      desc: m.actualBoundingBoxDescent / ESCALA_MEDIDA,
    };
    cache.set(chave, t);
    return t;
  };
}

export const largura = (t: Tinta): number => t.x1 - t.x0;

/**
 * Uma ou duas linhas, quebradas em PALAVRA inteira (nunca no meio). Entre as quebras possíveis, a de linha mais
 * longa mais curta — as duas linhas ficam equilibradas; no empate, a 1ª linha mais longa ("EXPLODE AO / ACERTAR").
 * `null` se não couber em `maxLinhas`.
 */
export function quebrar(texto: string, px: number, medir: Medir, larguraMax: number, maxLinhas: 1 | 2): string[] | null {
  const larg = (t: string) => largura(medir(t, px));
  if (larg(texto) <= larguraMax) return [texto];
  if (maxLinhas === 1) return null;
  const palavras = texto.split(' ');
  let melhor: string[] | null = null;
  let menorMaior = Infinity;
  for (let i = 1; i < palavras.length; i++) {
    const linhas = [palavras.slice(0, i).join(' '), palavras.slice(i).join(' ')];
    const maior = Math.max(...linhas.map(larg));
    if (maior > larguraMax) continue;
    if (maior <= menorMaior) {
      menorMaior = maior;
      melhor = linhas;
    }
  }
  return melhor;
}

/** A distância entre as linhas de base de duas linhas seguidas (inteira: a linha cai no pixel). */
export const passoDaLinha = (px: number): number => Math.ceil(px * 1.25);

/** A altura da TINTA de um bloco de linhas: do topo da 1ª ao pé da última. */
export function alturaDoBloco(linhas: string[], px: number, medir: Medir): number {
  const primeira = medir(linhas[0], px);
  const ultima = medir(linhas[linhas.length - 1], px);
  return primeira.asc + (linhas.length - 1) * passoDaLinha(px) + ultima.desc;
}

/**
 * O MAIOR tamanho (de `maxPx` para baixo, de ¼ em ¼) em que TODOS os textos cabem na caixa com a folga — um tamanho
 * só para todas as cartas (spec §3.2, regras 4 e 5). Lança erro se nada ≥5 couber: melhor quebrar a mesa no teste
 * que deixar texto vazar (o remédio é reescrever o `curto` da carta, não encolher a letra dela).
 */
export function tamanhoUnico(
  textos: string[],
  caixa: { w: number; h: number },
  maxLinhas: 1 | 2,
  medir: Medir,
  maxPx: number,
  folga: number,
): number {
  for (let px = maxPx; px >= 5; px -= 0.25) {
    const cabe = textos.every((t) => {
      const linhas = quebrar(t, px, medir, caixa.w - 2 * folga, maxLinhas);
      return linhas !== null && alturaDoBloco(linhas, px, medir) <= caixa.h - 2 * folga;
    });
    if (cabe) return px;
  }
  throw new Error(`[textoNoEncaixe] nenhum tamanho ≥5 cabe em ${caixa.w}×${caixa.h}: ${textos.join(' | ')}`);
}

/**
 * Onde pôr cada linha para a TINTA do bloco ficar no lugar: o ponto de alinhamento (`x`) e a linha de base (`base`)
 * de cada linha, em unidades INTEIRAS. Na horizontal, cada linha centrada pela tinta. Na vertical: `'centro'` centra
 * o bloco; `'topo'` e `'pe'` encostam a tinta a `folga` da borda — arredondando PARA DENTRO, para a folga nunca
 * encolher no arredondamento.
 */
export function posicionar(
  linhas: string[],
  px: number,
  medir: Medir,
  caixa: Caixa,
  vertical: 'centro' | 'topo' | 'pe',
  folga: number,
): { x: number; base: number }[] {
  const altura = alturaDoBloco(linhas, px, medir);
  const topoTinta =
    vertical === 'centro' ? caixa.y + (caixa.h - altura) / 2
    : vertical === 'topo' ? caixa.y + folga
    : caixa.y + caixa.h - folga - altura;
  const arred = vertical === 'topo' ? Math.ceil : vertical === 'pe' ? Math.floor : Math.round;
  const base0 = arred(topoTinta + medir(linhas[0], px).asc);
  return linhas.map((l, i) => {
    const t = medir(l, px);
    return { x: Math.round(caixa.x + (caixa.w - largura(t)) / 2 - t.x0), base: base0 + i * passoDaLinha(px) };
  });
}
