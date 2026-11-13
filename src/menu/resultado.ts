import { ABERTURA, RESULTADO } from './numerosMenu.ts';
import { suave } from './acaso.ts';

/**
 * O RESULTADO DO FIM DA CAMPANHA — o 1º tempo do menu do amanhecer (spec `2026-11-13-bloco-i-tela-final-amanhecer-design.md`
 * §4), como funções puras do relógio dele: o amanhecer abre sozinho, e entram o título, os pontos com a medalha, o
 * recorde, o crédito e por último a tecla. A tecla só vale quando tudo entrou.
 */
export type ParteResultado = keyof typeof RESULTADO.entra;

export const PARTES_RESULTADO = Object.keys(RESULTADO.entra) as ParteResultado[];

/**
 * O quanto a `parte` aparece no instante `t` do 1º tempo. `tSai` é quando o jogador apertou a tecla (< 0: ainda não):
 * dali o resultado inteiro some em `RESULTADO.sai` s. `posto` (o movimento reduzido): tudo já entra no lugar.
 */
export function alfaResultado(parte: ParteResultado, t: number, tSai: number, posto = false): number {
  const entrou = posto ? 1 : suave(RESULTADO.entra[parte], RESULTADO.entra[parte] + RESULTADO.fade, t);
  return tSai < 0 ? entrou : entrou * (1 - suave(0, RESULTADO.sai, t - tSai));
}

/**
 * Os pontos que o placar MOSTRA no instante `t`: contam de 0 ao valor em `RESULTADO.conta` s a partir da entrada deles,
 * freando no fim (a contagem dos placares de fim de fase). Sempre inteiro, nunca passa do valor.
 */
export function pontosMostrados(score: number, t: number): number {
  const u = Math.min(1, Math.max(0, (t - RESULTADO.entra.pontos) / RESULTADO.conta));
  return Math.round(score * (1 - Math.pow(1 - u, 3)));
}

/** Tudo entrou: a tecla vale. */
export const resultadoPronto = (t: number, posto = false): boolean => posto || t >= RESULTADO.pronto;

/** O resultado saiu inteiro: os textos podem ser destruídos. */
export const resultadoSaiu = (t: number, tSai: number): boolean => tSai >= 0 && t - tSai >= RESULTADO.sai;

/**
 * O relógio da ABERTURA no começo do 2º tempo: um instante antes de o letreiro entrar (os segundos de cenário sozinho
 * já foram vistos no 1º tempo).
 */
export const T0_SEGUNDO_TEMPO = ABERTURA.letreiro.t0 - RESULTADO.antesDoLetreiro;
