/**
 * OS CLARÕES (13/11, bloco I, etapa 2 — spec `specs/2026-11-13-bloco-i-flashes-design.md`). No lugar dos flashes de tela
 * cheia da câmera, quatro formas, uma por família: o IMPACTO e o SINAL acendem um disco de luz em volta da fonte, o
 * GOLPE NA NAVE acende só as bordas da tela (a vinheta), a LARGADA clareia a tela inteira de leve. E um TETO: 3 clarões
 * por segundo, somando tudo; do 4º em diante saem atenuados (fotossensibilidade).
 *
 * Este arquivo é PURO (sem Phaser): os números aprovados na folha `folhas/2026-11-13/flashes/flashes.html` e as contas.
 * O teste `scripts/test-claroes.mjs` o importa direto.
 */
export const CLARAO = {
  /** multiplica todo pico: o gancho da opção "reduzir clarões" do menu de OPÇÕES (a etapa 1.55) */
  forca: 1,
  /** a queda de luz é quantizada nestes níveis pelo Bayer 4×4 … */
  niveis: 4,
  /** … e a luz morre em tantos quadros (ela encolhe pelos níveis; não é um alpha contínuo) */
  quadros: 6,
  teto: { porSegundo: 3, janelaMs: 1000, atenuado: 0.35 },
  impacto: { raioPorEscala: 56, raioMin: 40, raioMax: 120, pico: 0.6, msMin: 220, msFator: 1.5 },
  /** os clímaxes das cutscenes (os flashes de 400 ms ou mais): um disco grande, pelos ms de sempre */
  climax: { raio: 150, pico: 0.6 },
  sinal: { pico: 0.7, ms: 300, raioNave: 56, raioChefe: 100 },
  /** a vinheta começa a `inicio` do raio da elipse da tela e enche em `faixa` */
  golpe: { inicio: 0.7, faixa: 0.5, pico: 0.75, msMin: 180, msFator: 2 },
  largada: { pico: 0.28, msFator: 0.75 },
  /** abaixo da HUD (99+), que fica limpa */
  depth: { local: 90, tela: 98 },
  tela: { w: 384, h: 216 },
} as const;

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** A luz `v` (0–1) do pixel (x, y) num dos `CLARAO.niveis` níveis, pontilhada pelo Bayer. */
export function nivel(v: number, x: number, y: number): number {
  if (v <= 0) return 0;
  return Math.min(CLARAO.niveis, Math.floor(v * CLARAO.niveis + BAYER4[(y & 3) * 4 + (x & 3)] / 16));
}

/** A luz do disco de raio `raio` no pixel (px, py) do quadrado de lado 2·raio: cheia no centro, zero na borda. */
export function forcaDisco(px: number, py: number, raio: number): number {
  const d = Math.hypot(px - raio + 0.5, py - raio + 0.5) / raio;
  return d >= 1 ? 0 : (1 - d) * (1 - d);
}

/** A luz da vinheta no pixel (px, py) da tela: zero no meio, cheia nos cantos. */
export function forcaVinheta(px: number, py: number): number {
  const { w, h } = CLARAO.tela;
  const e = Math.hypot((px - (w - 1) / 2) / (w / 2), (py - (h - 1) / 2) / (h / 2));
  return Math.max(0, Math.min(1, (e - CLARAO.golpe.inicio) / CLARAO.golpe.faixa));
}

/** O raio do clarão de uma explosão grande pela `escala` do `explodeBig` (em múltiplos de 4: poucas texturas). */
export function raioDoImpacto(escala: number): number {
  const I = CLARAO.impacto;
  return Math.max(I.raioMin, Math.min(I.raioMax, Math.round((I.raioPorEscala * escala) / 4) * 4));
}

/**
 * O TETO: registra um clarão em `agora` (ms) na `janela` e devolve o fator do pico dele — 1 para os 3 primeiros do
 * último segundo, `atenuado` daí em diante. (Um relógio que voltou — o jogo reiniciado — esvazia a janela.)
 */
export function teto(janela: number[], agora: number): number {
  while (janela.length && (janela[0] < agora - CLARAO.teto.janelaMs || janela[0] > agora)) janela.shift();
  const fator = janela.length < CLARAO.teto.porSegundo ? 1 : CLARAO.teto.atenuado;
  janela.push(agora);
  return fator;
}
