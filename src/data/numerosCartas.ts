// Com a extensão: o `test-numeros-cartas` importa este módulo em node, que não resolve import sem ela.
import { FATOR_EXPLOSAO_MAIOR } from '../cartasRegras.ts';

/**
 * OS NÚMEROS DAS CARTAS (spec 2026-10-04-arquivo-de-cartas §4.2) — UM endereço para os números PROVISÓRIOS que o
 * jogador sente (dano, raio, chance, recarga, duração). Os sistemas de `systems/cartas/` leem daqui, e a ficha do
 * ARQUIVO também: mexer num número na calibragem (frente C) muda o jogo e a wiki juntos.
 *
 * Módulo PURO (sem Phaser): o `test-numeros-cartas` roda em node. Os números de VOO (aceleração do míssil, queda,
 * mola do drone…) ficam em quem voa — não são o que a ficha mostra.
 */
export const NUMEROS = {
  cadencia: { fator: 1.15 },
  /**
   * O dano do Perfurante a cada inimigo atravessado (04/10, ele): o 1º cheio, depois 90% / 60% / 30% — e no último o
   * tiro acaba. Antes atravessava todos com o dano cheio.
   */
  perfurante: { queda: [1, 0.9, 0.6, 0.3] },
  pesado: { dano: 2, velocidade: 0.7, escala: 1.3 },
  /** O tranco do Tiro Pesado: px por acerto, no máx. um a cada `cadaMs` por inimigo; a aranha recua `aranha` dele. */
  tranco: { px: 8, cadaMs: 250, aranha: 0.5 },
  /** A recarga por número de cartas (×1, ×2). */
  missil: { recargaMs: [8000, 5000], dano: 2 },
  drone: { esperaS: 1.2, alcance: 160, dano: 1 },
  explosao: {
    explosivo: { raio: 18, dano: 1 },
    combustao: { raio: 26, dano: 2 },
    reativo: { raio: 40, dano: 3 },
    missil: { raio: 20, dano: 1 },
    flare: { raio: 22, dano: 2 },
  },
  explosaoMaior: { fator: FATOR_EXPLOSAO_MAIOR },
  estilhacos: { n: 5, alcance: 36, dano: 1 },
  /** 1 de dano a cada `cadaS` enquanto queima (`queimaMs`). */
  incendiario: { chance: 0.25, queimaMs: 2000, cadaS: 0.4, dano: 1 },
  flare: { esperaMs: 8000, dano: 1 },
  eletrico: { chance: 0.2, travaMs: 400 },
  arco: { saltos: 3, raio: 50, dano: 1 },
  sobrecarga: { raio: 30, dano: 2 },
  /** Segundos até o Casco voltar: sem Recarga · com Recarga. */
  casco: { recargaS: [8, 5.5] },
  propulsores: { porCopia: 0.12 },
  dash: { distancia: 40, intocavelMs: 200, esperaMs: 8000 },
};

/** 0,4 / 8 / 5,5 — vírgula decimal, sem zero à toa. */
const n = (v: number): string => String(Math.round(v * 100) / 100).replace('.', ',');
const s = (ms: number): string => `${n(ms / 1000)}s`;
const pct = (f: number): string => `${Math.round(f * 100)}%`;

/** A LINHA DE NÚMEROS da ficha do Arquivo (`''` = a carta não tem número para mostrar). */
export function numerosDaCarta(id: string): string {
  const N = NUMEROS;
  const linhas: Record<string, string[]> = {
    WPN_004: [`+${pct(N.cadencia.fator - 1)} por cópia`],
    WPN_007: [`dano ${N.perfurante.queda.map(pct).join(' → ')}`],
    WPN_008: [`dano ×${n(N.pesado.dano)}`, `tiro ${pct(1 - N.pesado.velocidade)} mais lento`, `tranco ${N.tranco.px}px`],
    WPN_009: [
      `recarga ${s(N.missil.recargaMs[0])} (×2: ${s(N.missil.recargaMs[1])})`,
      `dano ${N.missil.dano}`,
      `explosão raio ${N.explosao.missil.raio}`,
    ],
    WPN_010: [`dano ${N.drone.dano}`, `1 tiro a cada ${n(N.drone.esperaS)}s`, `alcance ${N.drone.alcance}`],
    EFF_001: [`dano ${N.explosao.explosivo.dano}`, `raio ${N.explosao.explosivo.raio}`],
    EFF_002: [`raio ×${n(N.explosaoMaior.fator)}`],
    EFF_003: [`${N.estilhacos.n} estilhaços`, `dano ${N.estilhacos.dano}`, `alcance ${N.estilhacos.alcance}`],
    EFF_004: [
      `${pct(N.incendiario.chance)} por acerto`,
      `${N.incendiario.dano} de dano a cada ${n(N.incendiario.cadaS)}s por ${s(N.incendiario.queimaMs)}`,
    ],
    EFF_006: [`dano ${N.explosao.combustao.dano}`, `raio ${N.explosao.combustao.raio}`],
    EFF_010: [`recarga ${s(N.flare.esperaMs)}`, `explosão dano ${N.explosao.flare.dano}`, `raio ${N.explosao.flare.raio}`],
    EFF_011: [`${pct(N.eletrico.chance)} por acerto`, `trava ${s(N.eletrico.travaMs)}`],
    EFF_012: [`até ${N.arco.saltos} saltos`, `alcance ${N.arco.raio}`, `dano ${N.arco.dano}`],
    EFF_013: [`dano ${N.sobrecarga.dano}`, `raio ${N.sobrecarga.raio}`],
    DEF_001: [`volta em ${n(N.casco.recargaS[0])}s`],
    DEF_002: [`o casco volta em ${n(N.casco.recargaS[1])}s`],
    DEF_004: [`dano ${N.explosao.reativo.dano}`, `raio ${N.explosao.reativo.raio}`],
    MOV_001: [`+${pct(N.propulsores.porCopia)} por cópia`],
    MOV_003: [`recarga ${s(N.dash.esperaMs)}`, `${N.dash.distancia}px`, `intocável ${s(N.dash.intocavelMs)}`],
  };
  return (linhas[id] ?? []).join(' · ');
}
