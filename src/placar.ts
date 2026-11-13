/**
 * O PLACAR de uma partida: a medalha e o recorde. Módulo PURO (sem Phaser): a `GameOverScene` (a derrota e as vitórias
 * de fase) e o resultado do fim da campanha (`MenuScene`, o 1º tempo do amanhecer) leem daqui, e o teste
 * `scripts/test-menu-amanhecer.mjs` também.
 */

/** O que o placar precisa do `localStorage` (o teste passa um de mentira). */
export type Guarda = Pick<Storage, 'getItem' | 'setItem'>;

export type Medalha = 'ouro' | 'prata' | 'bronze';

/** Faixas de medalha — herdadas do v2 (InterfaceGameOver.cs). */
export const MEDALHAS: readonly { min: number; medal: Medalha; color: number }[] = [
  { min: 3000, medal: 'ouro', color: 0xffd447 },
  { min: 1500, medal: 'prata', color: 0xd0d0dc },
  { min: 600, medal: 'bronze', color: 0xff8c1a },
];

/** A medalha de uma pontuação, ou `null` abaixo do bronze. */
export function medalhaDe(score: number): { medal: Medalha; color: number } | null {
  return MEDALHAS.find((m) => score >= m.min) ?? null;
}

/**
 * O recorde por modificador — herdeiro do PlayerPrefs do v2. Grava se a partida bateu o anterior.
 * O TREINO não grava recorde: ele pula 68 s de fase, o score não é comparável.
 */
export function registrarRecorde(g: Guarda, handling: string, score: number, practice: boolean): { anterior: number; recorde: number; novo: boolean } {
  const chave = `alienworld:record:${handling}`;
  const anterior = Number(g.getItem(chave) ?? 0);
  const novo = !practice && score > anterior;
  if (novo) g.setItem(chave, String(score));
  return { anterior, recorde: Math.max(score, anterior), novo };
}
