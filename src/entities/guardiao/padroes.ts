/**
 * OS PADRÕES DO GUARDIÃO (spec 2026-11-22-guardiao-coleira-design.md §5): a salva MIRADA e os PULSOS ALTERNADOS de lava.
 * Puro: sem Phaser.
 */
export interface Ponto {
  x: number;
  y: number;
}

/** O centro da salva, em graus (y para baixo): a direção da boca à nave, presa em 180 ± `limite` (nunca atira para trás). */
export function miraSalva(boca: Ponto, alvo: Ponto, limite = 60): number {
  let a = (Math.atan2(alvo.y - boca.y, alvo.x - boca.x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return Math.min(180 + limite, Math.max(180 - limite, a));
}

/**
 * Os ângulos (radianos) de uma salva de `n` com abertura `abre` (graus) centrada em `centro`. Com `n` PAR o meio é um
 * vão, e o vão cairia em cima da nave: o centro anda meio passo para um lado sorteado e um glóbulo vai nela.
 */
export function angulosSalva(n: number, abre: number, centro: number, rnd: () => number): number[] {
  if (n <= 1) return [(centro * Math.PI) / 180];
  const passo = abre / (n - 1);
  const c = n % 2 === 0 ? centro + (rnd() < 0.5 ? -1 : 1) * (passo / 2) : centro;
  return Array.from({ length: n }, (_, i) => ((c - abre / 2 + i * passo) * Math.PI) / 180);
}

/**
 * OS PULSOS ALTERNADOS (22/11, ele: *"eu priorizo muito a perspectiva de bullet hell, ou seja, são formatos mais
 * geométricos que induzem o jogador a ler o ataque, cobra quem demora ou não percebe o padrão"*): raios RETOS em
 * ângulos FIXOS a partir do miolo. O pulso A (k par) tem `n` raios; o B (k ímpar) tem `n + 1`, deslocado meio passo — cai
 * nos vãos do A. O eixo da figura aponta para `alvo` (o meio da borda esquerda da arena): de qualquer altura, ela
 * preenche a metade esquerda (com o eixo horizontal e o miolo baixo, sobrava o alto inteiro, parado e seguro). Radianos.
 */
export type AcaoGuardiao = 'serra' | 'investida' | 'serpentes' | 'aperto' | 'teto';

/**
 * O RODÍZIO por degrau (spec §8): uma camada nova por degrau (decisão dele, quebra a regra de 19/09). 100–66% a serra e a
 * investida alternando (como sempre); 66–33% entram as serpentes; 33–0% elas vêm logo depois da investida, e o APERTO
 * (23/11, o passo 4) logo depois delas, e o TETO QUE SANGRA (o passo 5) depois da serra — a ordem da spec §8.
 */
export const RODIZIO: readonly (readonly AcaoGuardiao[])[] = [
  ['serra', 'investida'],
  ['investida', 'serra', 'serpentes'],
  ['investida', 'serpentes', 'aperto', 'serra', 'teto'],
];

/** A ação depois de `atual` no degrau `degrau`; fora da lista do degrau (a vida caiu de degrau), recomeça por ela. */
export function proximaAcao(degrau: number, atual: AcaoGuardiao): AcaoGuardiao {
  const lista = RODIZIO[Math.max(0, Math.min(RODIZIO.length - 1, degrau))];
  return lista[(lista.indexOf(atual) + 1) % lista.length];
}

export function angulosPulso(k: number, n: number, passoDeg: number, boca: Ponto, alvo: Ponto): number[] {
  const m = k % 2 === 0 ? n : n + 1;
  const eixo = Math.atan2(alvo.y - boca.y, alvo.x - boca.x);
  const passo = (passoDeg * Math.PI) / 180;
  return Array.from({ length: m }, (_, i) => eixo + (i - (m - 1) / 2) * passo);
}
