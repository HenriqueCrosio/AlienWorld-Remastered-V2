import { lcg } from '../menu/acaso.ts';
import { BRASAS_F1, CAVERNA_F1, INVASAO, PINTURA } from './numerosF1.ts';

/**
 * O TEMPO DO CENÁRIO DA F1, em funções puras do relógio da fase `t` (s): o mesmo instante dá sempre o mesmo quadro —
 * para filmar, sondar e testar no Node. Quem entra direto no chefão (o treino) cai no estado certo de graça. As
 * coordenadas são da PINTURA (429×216); o horizonte soma a deriva.
 */

/** Uma caixa em px de jogo (um grupo de luz da pintura). */
export interface CaixaF1 {
  x: number;
  y: number;
  w: number;
  h: number;
  n?: number;
}

/** A deriva da pintura (px, INTEIRO) em `t`: 45 px em 110 s, depois parada. Inteiro: a grade da pintura casa com a da tela. */
export function derivaPintura(t: number): number {
  const u = Math.min(1, Math.max(0, t / PINTURA.derivaSeg));
  return Math.round(u * PINTURA.derivaMax);
}

/**
 * Quanto o terço `grupo` (0–2) das brasas do chão está APAGADO em `t` (0 = aceso, nunca acima de `BRASAS_F1.max`): três
 * senos de frequências que não se casam, cada terço com a sua fase — tremulam, e nunca em uníssono.
 */
export function brasaApagada(t: number, grupo: number): number {
  const B = BRASAS_F1;
  const [a, b, c] = B.freq;
  const s = 0.5 * Math.sin(t * a + grupo * 2.1) + 0.3 * Math.sin(t * b + grupo * 4.3) + 0.2 * Math.sin(t * c + grupo * 1.3);
  return Math.min(B.max, Math.max(0, B.base + B.amp * s));
}

// ─── A CAVERNA (21/10) ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * Onde estão as duas faixas de rocha (x de tela da borda ESQUERDA de cada imagem de `largura` px). A faixa: a boca de fora
 * à esquerda (aberta até `fundo`), a borda de dentro à direita (o espelho: aberta a partir de `largura − 1 − fundo`); a
 * rocha da linha y vai de `fundo + 1` a `largura − 2 − fundo` — o contorno é simétrico, o MEIO é o mesmo em toda linha.
 */
export interface PosicoesCaverna {
  /** A faixa da ENTRADA: o lado de fora pela boca à esquerda, o salão depois da borda de dentro "(". */
  entrada: number;
  /** A faixa da SAÍDA, ESPELHADA: o salão à esquerda da borda de dentro ")", o lado de fora depois dela. */
  saida: number;
}

/** As faixas `d` px de MUNDO depois do evento: elas andam `paralaxe` vezes mais rápido (`fundoMeio`, `largura`: do json). */
export function posicoesCaverna(d: number, fundoMeio: number, largura: number): PosicoesCaverna {
  const C = CAVERNA_F1;
  const k = C.paralaxe;
  const entrada = C.x0 - k * d;
  // o salão VISÍVEL dura `salao` px de mundo na linha do meio: da borda de dentro da entrada (largura − 1 − fundoMeio)
  // à da saída espelhada (fundoMeio), as duas andando k vezes o mundo
  const saida = entrada + k * C.salao + (largura - 1 - fundoMeio) - fundoMeio;
  return { entrada, saida };
}

/** A TROCA de cena: o salão vai do MEIO da rocha da entrada ao meio da rocha da saída — retas, escondidas atrás dela. */
export function regiaoCaverna(p: PosicoesCaverna, largura: number): [number, number] {
  const meio = (largura - 1) / 2;
  return [p.entrada + meio, p.saida + meio];
}

/** O salão VISÍVEL na linha cujo fundo de boca é `fundoY` (onde o teto e o chão mordem): de borda de dentro a borda de dentro. */
export function salaoVisivel(p: PosicoesCaverna, fundoY: number, largura: number): [number, number] {
  return [p.entrada + largura - 1 - fundoY, p.saida + fundoY];
}

/** A deriva do fundo da caverna (px inteiros): de 0 a −`deriva` enquanto a caverna passa (`percurso` px de mundo). */
export function derivaCaverna(d: number, percurso: number): number {
  const C = CAVERNA_F1;
  return -Math.round(Math.min(1, Math.max(0, d / percurso)) * C.deriva);
}

// ─── AS LUZES QUE MORREM ────────────────────────────────────────────────────────────────────────────────────────

/** Quando cada luz apaga de vez (s): as de fora primeiro, a cidadela por último, um pouco embaralhadas. */
export function agendaDasLuzes(caixas: readonly CaixaF1[], semente: number = INVASAO.janelas.semente): number[] {
  const J = INVASAO.janelas;
  const C = INVASAO.centro;
  const d = caixas.map((g) => Math.hypot(g.x + g.w / 2 - C.x, g.y + g.h / 2 - C.y));
  const max = Math.max(1, ...d);
  const r = lcg(semente);
  return d.map((v) => Math.min(J.fim, Math.max(J.ini, J.ini + (1 - v / max) * (J.fim - J.ini) + (r() * 2 - 1) * J.sorte)));
}

/** A luz está apagada em `t`? Antes de morrer, a falha (pisca a 12 Hz por 0,4 s); depois, apagada de vez. */
export function luzMorta(tMorte: number, t: number): boolean {
  const J = INVASAO.janelas;
  if (t >= tMorte) return true;
  const u = t - (tMorte - J.falhaDur);
  if (u < 0) return false;
  return Math.floor(u * J.falhaHz) % 2 === 1;
}

/** O magenta que acende onde o âmbar morreu: 0 antes de `t0`, entra em `entra` s, depois pulsa devagar. */
export function alfaMagenta(t0: number, per: number, fase: number, t: number): number {
  const M = INVASAO.magenta;
  if (t < t0) return 0;
  const entra = Math.min(1, (t - t0) / M.entra);
  const pulso = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / per + fase);
  return entra * (M.alfaMin + (M.alfaMax - M.alfaMin) * pulso);
}

// ─── A DEFESA ───────────────────────────────────────────────────────────────────────────────────────────────────

/** O holofote ainda está aceso em `t`? Na última `falha` s ele pisca (a 12 Hz) e apaga de vez no `fim`. */
export function holofoteAceso(fim: number, t: number): boolean {
  if (t >= fim) return false;
  const u = t - (fim - INVASAO.feixe.falha);
  if (u < 0) return true;
  return Math.floor(u * INVASAO.janelas.falhaHz) % 2 === 0;
}

/** O ângulo (graus) de um holofote da defesa: a varredura e uma vagueada mais lenta, como os do menu. */
export function anguloDefesa(h: { base: number; amp: number; per: number; fase: number }, t: number): number {
  return h.base + h.amp * Math.sin((2 * Math.PI * t) / h.per + h.fase) + 0.25 * h.amp * Math.sin((2 * Math.PI * t) / (h.per * 0.37) + 2 * h.fase);
}

/** Uma rajada da artilharia: quando começa, quantos tiros, o desvio de cada um e se acaba num estouro de flak. */
export interface Rajada {
  t: number;
  tiros: number;
  abre: number[];
  flak: boolean;
}

/** As rajadas de uma arma, do começo da fase até o `fim` dela (determinísticas: a semente da arma). */
export function rajadasDaArma(arma: { fim: number; semente: number }): Rajada[] {
  const R = INVASAO.rajada;
  const r = lcg(arma.semente);
  const out: Rajada[] = [];
  let t = 1 + r() * R.intervaloVar;
  while (t < arma.fim) {
    const tiros = R.tirosMin + Math.floor(r() * (R.tirosVar + 1));
    out.push({ t, tiros, abre: Array.from({ length: tiros }, () => (r() * 2 - 1) * R.abre), flak: r() < R.chanceFlak });
    t += R.intervaloMin + r() * R.intervaloVar;
  }
  return out;
}

/** Os traçantes no ar em `t` (na pintura): posição da cabeça, ângulo e alfa (somem no fim da vida). */
export function tracantesEm(
  arma: { x: number; y: number; angulo: number },
  rajadas: readonly Rajada[],
  t: number,
): { x: number; y: number; ang: number; alfa: number }[] {
  const R = INVASAO.rajada;
  const out: { x: number; y: number; ang: number; alfa: number }[] = [];
  for (const b of rajadas) {
    if (t < b.t || t > b.t + b.tiros * R.cadencia + R.vida) continue;
    for (let k = 0; k < b.tiros; k++) {
      const u = t - (b.t + k * R.cadencia);
      if (u < 0 || u > R.vida) continue;
      const ang = arma.angulo + b.abre[k];
      const rad = (ang * Math.PI) / 180;
      out.push({ x: arma.x + Math.cos(rad) * R.vel * u, y: arma.y + Math.sin(rad) * R.vel * u, ang, alfa: 1 - (u / R.vida) ** 2 });
    }
  }
  return out;
}

/** O estouro de flak de uma rajada em `t`: no fim do último traçante dela; posição e quadro, ou null. */
export function flakEm(
  arma: { x: number; y: number; angulo: number },
  rajadas: readonly Rajada[],
  t: number,
  quadros: number,
): { x: number; y: number; quadro: number } | null {
  const R = INVASAO.rajada;
  for (const b of rajadas) {
    if (!b.flak) continue;
    const u = R.vida * 0.85;
    const te = b.t + (b.tiros - 1) * R.cadencia + u;
    const q = Math.floor((t - te) * R.flakFps);
    if (q < 0 || q >= quadros) continue;
    const rad = ((arma.angulo + b.abre[b.tiros - 1]) * Math.PI) / 180;
    return { x: arma.x + Math.cos(rad) * R.vel * u, y: arma.y + Math.sin(rad) * R.vel * u, quadro: q };
  }
  return null;
}

// ─── AS NAVES INVASORAS ─────────────────────────────────────────────────────────────────────────────────────────

/** Uma nave descendo em `t`: posição (freando no fim, como quem pousa), balanço e alfa; null fora da descida. */
export function posNave(
  n: { t: number; de: readonly number[]; para: readonly number[]; dur: number },
  t: number,
): { x: number; y: number; alfa: number } | null {
  const N = INVASAO.nave;
  const u = (t - n.t) / n.dur;
  if (u < 0 || u >= 1) return null;
  const e = 1 - (1 - u) * (1 - u);
  const entra = Math.min(1, u / N.entra);
  const some = Math.min(1, (1 - u) / N.some);
  return {
    x: n.de[0] + (n.para[0] - n.de[0]) * e + Math.sin(t * 1.7 + n.t) * N.balanco,
    y: n.de[1] + (n.para[1] - n.de[1]) * e,
    alfa: N.alfa * entra * some,
  };
}

// ─── AS EXPLOSÕES E O QUE ELAS DEIXAM ──────────────────────────────────────────────────────────────────────────

/** Onde cada explosão acontece: a janela grande (n ≥ 2) que morre mais perto da hora dela, sem repetir. */
export function lugaresDasExplosoes(janelas: readonly CaixaF1[], agenda: readonly number[]): { t: number; x: number; y: number }[] {
  const usadas = new Set<number>();
  const grandes = janelas.map((_, i) => i).filter((i) => (janelas[i].n ?? 0) >= 2);
  const candidatas = grandes.length >= INVASAO.explosoes.length ? grandes : janelas.map((_, i) => i);
  return INVASAO.explosoes.map((te) => {
    let melhor = -1;
    for (const i of candidatas) {
      if (usadas.has(i)) continue;
      if (melhor < 0 || Math.abs(agenda[i] - te) < Math.abs(agenda[melhor] - te)) melhor = i;
    }
    usadas.add(melhor);
    const g = janelas[melhor];
    return { t: te, x: Math.round(g.x + g.w / 2), y: Math.round(g.y + g.h) };
  });
}

/** A explosão em `t`: o quadro (null antes e depois) e a força do clarão nas nuvens. */
export function explosaoEm(te: number, t: number, quadros: number): { quadro: number | null; clarao: number } {
  const E = INVASAO.explosao;
  const u = t - te;
  if (u < 0) return { quadro: null, clarao: 0 };
  const q = Math.floor(u * E.fps);
  return { quadro: q < quadros ? q : null, clarao: E.alfaClarao * Math.exp(-u / E.decaiClarao) };
}

/** O que a explosão deixa em `t`: o fogo (aceso ou não) e o alfa da coluna de fumaça (entrando devagar). */
export function rastroEm(te: number, t: number): { fogo: boolean; fumaca: number } {
  const R = INVASAO.rastro;
  const uf = t - te - R.fumaca;
  return { fogo: t >= te + R.fogo, fumaca: uf <= 0 ? 0 : R.alfaFumaca * Math.min(1, uf / R.entraFumaca) };
}
