import { BUSCA, FAROIS, FEIXE, JANELAS, NAVE, TEMPESTADE, TRAFEGO, TRAVESSIA } from './numerosMenu.ts';

/**
 * O TEMPO DO CENÁRIO DO MENU (spec `2026-10-19-menu-refeito-design.md` §3–4), em funções puras do relógio `t` (s):
 * quando cada luz apaga, onde anda cada luz do tráfego, para onde aponta cada holofote, quanto brilha um relâmpago. As
 * peças (`vida.ts`, `perigo.ts`, `leviata.ts`) só leem daqui e pintam.
 */

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RitmoJanela {
  ciclo: number;
  fora: number;
  fase: number;
  /** Pisca antes de apagar (a falha). */
  falha: boolean;
}

/** A janela está apagada em `t`? Apaga `fora` s a cada `ciclo`; as com falha piscam a 12 Hz no começo. */
export function janelaApagada(l: RitmoJanela, t: number): boolean {
  const c = (t + l.fase) % l.ciclo;
  if (l.falha && c < JANELAS.falhaDur) return Math.floor(c * JANELAS.falhaHz) % 2 === 0;
  return c < l.fora;
}

/** O farol está apagado em `t`? 1,4 s aceso a cada 2,3 s. */
export function farolApagado(fase: number, t: number): boolean {
  return (t + fase) % FAROIS.ciclo > FAROIS.acesoAte;
}

/**
 * As TORRES: os faróis a ≤ 3 px de lado e ≤ 14 px de altura uns dos outros são a mesma torre e piscam juntos (19/10,
 * ele: o de cima e o de baixo da torre alta estavam em descompasso). Devolve, para cada farol, o índice da torre.
 */
export function torres(caixas: readonly Caixa[]): number[] {
  const pai = caixas.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const cx = (c: Caixa): number => c.x + c.w / 2;
  const cy = (c: Caixa): number => c.y + c.h / 2;
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      if (Math.abs(cx(caixas[i]) - cx(caixas[j])) <= FAROIS.torreDx && Math.abs(cy(caixas[i]) - cy(caixas[j])) <= FAROIS.torreDy) {
        pai[raiz(j)] = raiz(i);
      }
    }
  }
  return caixas.map((_, i) => raiz(i));
}

/**
 * O Leviatã: a travessia de `seg` s em loop, com `pausa` s de céu vazio entre uma e outra, adiantada para estar no
 * mesmo lugar quando o título acende; em cima da reta, uma ondulação lenta que zera nas duas pontas (22/10).
 * Devolve a posição EXATA (fracionária): quem desenha cuida do arredondamento.
 */
export function travessia(t: number): { x: number; y: number; quadro: number } {
  const T = TRAVESSIA;
  const adiantar = T.noTitulo.u * T.seg - T.noTitulo.t;
  const ciclo = T.seg + T.pausa;
  const u = Math.min(1, ((((t + adiantar) % ciclo) + ciclo) % ciclo) / T.seg);
  const onda = T.onda.amp * Math.sin(Math.PI * T.onda.meias * u);
  return { x: T.x0 + (T.x1 - T.x0) * u, y: T.y0 + (T.y1 - T.y0) * u + onda, quadro: Math.floor(t * T.nadoFps) % T.quadros };
}

/**
 * Uma luz do tráfego numa ponte `[x0, y0, x1, y1]` (o trecho VISÍVEL do deque): onde está (no centro do pixel) e
 * quanto brilha — tremendo no ar e sumindo nos últimos `pontaFade` px de cada ponta, como quem entra num portão.
 */
export function pontoTrafego(ponte: readonly number[], p: number, v: number, fl: number, t: number): { x: number; y: number; alfa: number } {
  const [x0, y0, x1, y1] = ponte;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const s = ((((p * len + v * t) % len) + len) % len) / len;
  const ponta = Math.min(1, (s * len) / TRAFEGO.pontaFade, ((1 - s) * len) / TRAFEGO.pontaFade);
  const tremor = 0.6 + 0.25 * Math.sin(t * 5.3 + fl) + 0.1 * Math.sin(t * 13.1 + fl * 2);
  return { x: x0 + (x1 - x0) * s + 0.5, y: y0 + (y1 - y0) * s + 0.5, alfa: tremor * ponta * ponta };
}

/** As luzes da nave: a fileira da barriga corre, as de baixo respiram, o farol do topo pisca. */
export function luzesDaNave(t: number): { fileira: number[]; baixo: number[]; topo: boolean } {
  const vez = Math.floor(t * NAVE.corridaHz) % (NAVE.fileira.length + 2);
  return {
    fileira: NAVE.fileira.map((_, i) => (i === vez ? 1 : NAVE.apagada)),
    baixo: NAVE.baixo.map((_, i) => 0.45 + 0.35 * Math.sin(t * 2.2 + i)),
    topo: t % NAVE.topoPeriodo < NAVE.topoAceso,
  };
}

/** Um holofote antiaéreo procurando: a varredura e uma vagueada mais lenta, cada um no seu relógio. */
export function anguloHolofote(h: { base: number; amp: number; per: number; fase: number }, t: number): number {
  return (
    h.base +
    h.amp * Math.sin((2 * Math.PI * t) / h.per + h.fase) +
    FEIXE.vaguear * h.amp * Math.sin((2 * Math.PI * t) / (h.per * FEIXE.vaguearPer) + 2 * h.fase)
  );
}

/** O holofote da nave varrendo o vale. */
export function anguloBusca(t: number): number {
  return BUSCA.base + BUSCA.amp * Math.sin((2 * Math.PI * t) / BUSCA.per) + BUSCA.ampFina * Math.sin((2 * Math.PI * t) / BUSCA.perFina + 1);
}

/** O tremor de um propulsor (0,5–1). */
export function forcaPropulsor(i: number, t: number): number {
  return 0.75 + 0.15 * Math.sin(t * 31 + i * 2) + 0.1 * Math.sin(t * 57 + i * 5);
}

/** O cintilar de uma estrela (0,35–1). */
export function alfaEstrela(f: number, p: number, t: number): number {
  return 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * f * 2 + p));
}

/**
 * Um relâmpago, `dt` s depois de começar: `v` é o clarão (cada golpe aceso pela duração dele e decaindo depois) e
 * `raio` a força do golpe aceso agora (o raio só aparece enquanto um golpe está aceso; entre eles, some).
 */
export function brilhoRelampago(dt: number): { v: number; raio: number } {
  if (dt < 0 || dt > TEMPESTADE.duracao) return { v: 0, raio: 0 };
  let v = 0;
  let raio = 0;
  for (const [inicio, forca, dur] of TEMPESTADE.golpes) {
    const u = dt - inicio;
    if (u < 0) continue;
    v = Math.max(v, u <= dur ? forca : forca * Math.exp(-(u - dur) / TEMPESTADE.decai));
    if (u <= dur) raio = Math.max(raio, forca);
  }
  return { v, raio };
}
