import { ACOES_REMAP, NOME_DA_ACAO, type AcaoRemap } from '../entrada/mapas.ts';
import type { Campo } from '../preferencias.ts';

/**
 * THE PAUSE AND THE SETTINGS — numbers and rules (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md`;
 * the CONTROLS tab of block M2 — spec `2026-11-14-bloco-m2-controles-design.md` §3.3).
 *
 * PURE module: which lines each kind of scene offers, the two window sizes, the tabs, and the whole navigation as a
 * function `(state, key) → (state, effect)`. `scenes/PausaScene.ts` only draws the state and carries out the effect.
 */

/** Where the pause opened. `menu` = the SETTINGS opened from the main menu (no pause list, straight to the big window). */
/** `derrota` = the SHIP LOST window (15/11, block M3): the scoreboard of a death over the frozen stage, no way back. */
export type TipoPausa = 'fase' | 'cutscene' | 'escolha' | 'menu' | 'derrota';
export type Acao = 'continuar' | 'reiniciar' | 'pular' | 'config' | 'sair';

/** Restarting a cutscene makes no sense (it gets SKIP); the card table and the hangar are choices (neither). */
export const LINHAS: Record<Exclude<TipoPausa, 'menu'>, readonly Acao[]> = {
  fase: ['continuar', 'reiniciar', 'config', 'sair'],
  cutscene: ['continuar', 'pular', 'config', 'sair'],
  escolha: ['continuar', 'config', 'sair'],
  derrota: ['reiniciar', 'config', 'sair'],
};

export const ROTULO: Record<Acao, string> = {
  continuar: 'CONTINUAR',
  reiniciar: 'REINICIAR A FASE',
  pular: 'PULAR A CENA',
  config: 'CONFIGURAÇÕES',
  sair: 'SAIR PARA O MENU',
};
/** The label of a line where it is shown: after a death, RESTART reads TRY AGAIN. */
export const rotuloDaAcao = (tipo: TipoPausa, a: Acao): string => (tipo === 'derrota' && a === 'reiniciar' ? 'TENTAR DE NOVO' : ROTULO[a]);

export type Aba = 'audio' | 'controles' | 'video' | 'jogo';
export const ROTULO_ABA: Record<Aba, string> = { audio: 'ÁUDIO', controles: 'CONTROLES', video: 'VÍDEO', jogo: 'JOGO' };
/** The GAME tab holds only the night/dawn menu choice, which exists only after the first victory. */
export const abasDe = (zerou: boolean): readonly Aba[] => (zerou ? ['audio', 'controles', 'video', 'jogo'] : ['audio', 'controles', 'video']);

/**
 * A settings line: a preference field; the fullscreen switch (a state of the browser, not a recorded preference); one
 * of the five ACTIONS of the remap table (two cells: keyboard, controller); or RESTORE THE DEFAULT.
 */
export type LinhaAcao = `acao:${AcaoRemap}`;
export type Linha = Campo | 'telaCheia' | LinhaAcao | 'restaurar';
export const LINHAS_DA_ABA: Record<Aba, readonly Linha[]> = {
  audio: ['volume.geral', 'volume.musica', 'volume.efeitos'],
  controles: ['teclas', 'controle', ...ACOES_REMAP.map((a): LinhaAcao => `acao:${a}`), 'vibracao', 'restaurar'],
  video: ['telaCheia', 'reduzirClaroes'],
  jogo: ['menu'],
};
/** The action of a remap line, or `null` for any other line. */
export const acaoDaLinha = (l: Linha): AcaoRemap | null => (l.startsWith('acao:') ? (l.slice(5) as AcaoRemap) : null);

const ROTULO_LINHA: Record<Exclude<Linha, LinhaAcao>, string> = {
  'volume.geral': 'VOLUME GERAL',
  'volume.musica': 'MÚSICA',
  'volume.efeitos': 'EFEITOS',
  teclas: 'TECLADO',
  controle: 'CONTROLE',
  vibracao: 'VIBRAÇÃO',
  telaCheia: 'TELA CHEIA',
  reduzirClaroes: 'REDUZIR CLARÕES',
  menu: 'MENU',
  restaurar: 'RESTAURAR O PADRÃO',
};
export function rotuloDaLinha(l: Linha): string {
  const a = acaoDaLinha(l);
  return a ? NOME_DA_ACAO[a] : ROTULO_LINHA[l as Exclude<Linha, LinhaAcao>];
}

/** Game px. The small window is centred and as tall as its lines; the big one almost fills the 384×216 screen. */
export const JANELA = {
  pequena: { w: 136, hLinha: 13, margem: 15 },
  confirma: { w: 136, h: 58 },
  grande: { x: 28, y: 18, w: 328, h: 186 },
  /** the veil over the frozen game; over the main menu (the painting keeps moving) a lighter one */
  veu: 0.55,
  veuMenu: 0.45,
  /** ms of the small ↔ big change (a dry swap with reduced motion) */
  cresce: 140,
  /** the music while the pause is open, as a share of its level */
  abafo: 0.4,
} as const;

export const alturaPequena = (linhas: number): number => JANELA.pequena.margem * 2 + linhas * JANELA.pequena.hLinha;

/**
 * THE SHIP LOST WINDOW (block M3): the title, the score rows (the medal row only when there is a medal), a rule, and
 * the three lines. Every `y` counts from the top of the window, in game px.
 */
export const DERROTA = {
  /** (the subtitle in the fallback font, without the HD layer, is 148 px wide) */
  w: 172,
  /** ms after it opens in which it takes no input: whoever is still hammering the fire key sees the score first */
  guarda: 350,
  /** ms of the veil and of the window coming in (none with reduced motion) */
  entra: 180,
} as const;
export function layoutDerrota(temMedalha: boolean): { h: number; titulo: number; sub: number; regua1: number; pontos: number; recorde: number; medalha: number | null; regua2: number; linhas: number[] } {
  const recorde = 53;
  const ultima = temMedalha ? recorde + 13 : recorde;
  const regua2 = ultima + 9;
  const linhas = LINHAS.derrota.map((_, i) => regua2 + 11 + i * JANELA.pequena.hLinha);
  return { h: linhas[linhas.length - 1] + 12, titulo: 13, sub: 24, regua1: 31, pontos: 41, recorde, medalha: temMedalha ? ultima : null, regua2, linhas };
}

export type Estado =
  | { tela: 'lista'; cursor: number }
  /** `de`: the settings line the confirmation came from (RESTORE); without it, the pause list */
  | { tela: 'confirma'; acao: 'reiniciar' | 'sair' | 'restaurar'; sim: boolean; de?: { aba: number; linha: number } }
  /** `linha` −1 = the cursor is on the tab strip; `coluna` 0 = keyboard, 1 = controller (the remap table) */
  | { tela: 'config'; aba: number; linha: number; coluna: 0 | 1 }
  /** waiting for the new key (or button) of a remap cell: the scene reads it raw, `passo` only cancels */
  | { tela: 'captura'; aba: number; linha: number; coluna: 0 | 1 };

export type Tecla = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'ok' | 'esc' | 'abaAnt' | 'abaProx';

export type Efeito =
  | { tipo: 'nada' }
  /** close the window and resume what was underneath */
  | { tipo: 'fechar' }
  | { tipo: 'acao'; acao: 'reiniciar' | 'pular' | 'sair' }
  | { tipo: 'mudar'; linha: Campo | 'telaCheia'; d: -1 | 1 }
  /** both devices back to the factory profile */
  | { tipo: 'restaurar' };

export interface Contexto {
  tipo: TipoPausa;
  zerou: boolean;
  /** a controller is connected: its column of the remap table can be captured */
  temControle?: boolean;
}

const NADA: Efeito = { tipo: 'nada' };
const roda = (i: number, n: number): number => ((i % n) + n) % n;

export function inicial(tipo: TipoPausa): Estado {
  return tipo === 'menu' ? { tela: 'config', aba: 0, linha: 0, coluna: 0 } : { tela: 'lista', cursor: 0 };
}

/** The capture ended (a key was taken, or it was cancelled): back to the cell it came from. */
export function fimDaCaptura(e: Estado): Estado {
  return e.tela === 'captura' ? { tela: 'config', aba: e.aba, linha: e.linha, coluna: e.coluna } : e;
}

/** One key on one state. Never mutates `e`. */
export function passo(e: Estado, t: Tecla, ctx: Contexto): { estado: Estado; efeito: Efeito } {
  if (e.tela === 'lista') {
    if (ctx.tipo === 'menu') return { estado: e, efeito: { tipo: 'fechar' } };
    const linhas = LINHAS[ctx.tipo];
    if (t === 'cima' || t === 'baixo') return { estado: { tela: 'lista', cursor: roda(e.cursor + (t === 'cima' ? -1 : 1), linhas.length) }, efeito: NADA };
    // after a death there is nothing to go back to: ESC leaves for the menu
    if (t === 'esc') return { estado: e, efeito: ctx.tipo === 'derrota' ? { tipo: 'acao', acao: 'sair' } : { tipo: 'fechar' } };
    if (t !== 'ok') return { estado: e, efeito: NADA };
    const acao = linhas[e.cursor];
    if (acao === 'continuar') return { estado: e, efeito: { tipo: 'fechar' } };
    if (acao === 'config') return { estado: { tela: 'config', aba: 0, linha: 0, coluna: 0 }, efeito: NADA };
    if (acao === 'pular') return { estado: e, efeito: { tipo: 'acao', acao: 'pular' } };
    // ... and no run to throw away: TRY AGAIN and QUIT do not ask
    if (ctx.tipo === 'derrota') return { estado: e, efeito: { tipo: 'acao', acao } };
    // restart and quit throw the run away: they ask first, the cursor on NO
    return { estado: { tela: 'confirma', acao, sim: false }, efeito: NADA };
  }

  if (e.tela === 'confirma') {
    const volta: Estado = e.de
      ? { tela: 'config', aba: e.de.aba, linha: e.de.linha, coluna: 0 }
      : { tela: 'lista', cursor: ctx.tipo === 'menu' || e.acao === 'restaurar' ? 0 : Math.max(0, LINHAS[ctx.tipo].indexOf(e.acao)) };
    if (t === 'esc') return { estado: volta, efeito: NADA };
    if (t === 'ok') {
      if (!e.sim) return { estado: volta, efeito: NADA };
      return e.acao === 'restaurar' ? { estado: volta, efeito: { tipo: 'restaurar' } } : { estado: e, efeito: { tipo: 'acao', acao: e.acao } };
    }
    if (t === 'esquerda' || t === 'direita' || t === 'cima' || t === 'baixo') return { estado: { ...e, sim: !e.sim }, efeito: NADA };
    return { estado: e, efeito: NADA };
  }

  if (e.tela === 'captura') return t === 'esc' ? { estado: fimDaCaptura(e), efeito: NADA } : { estado: e, efeito: NADA };

  const abas = abasDe(ctx.zerou);
  const aba = Math.min(e.aba, abas.length - 1);
  const linhas = LINHAS_DA_ABA[abas[aba]];
  const aqui = (linha: number, coluna: 0 | 1 = e.coluna): Estado => ({ tela: 'config', aba, linha, coluna });
  const trocaAba = (d: number): { estado: Estado; efeito: Efeito } => ({
    estado: { tela: 'config', aba: roda(aba + d, abas.length), linha: e.linha === -1 ? -1 : 0, coluna: 0 },
    efeito: NADA,
  });
  if (t === 'abaAnt') return trocaAba(-1);
  if (t === 'abaProx') return trocaAba(1);
  if (t === 'esc') {
    if (ctx.tipo === 'menu') return { estado: e, efeito: { tipo: 'fechar' } };
    return { estado: { tela: 'lista', cursor: LINHAS[ctx.tipo].indexOf('config') }, efeito: NADA };
  }
  if (t === 'cima') return { estado: aqui(Math.max(-1, e.linha - 1)), efeito: NADA };
  if (t === 'baixo') return { estado: aqui(Math.min(linhas.length - 1, e.linha + 1)), efeito: NADA };
  if (e.linha === -1) {
    if (t === 'esquerda') return trocaAba(-1);
    if (t === 'direita') return trocaAba(1);
    // OK on the tab strip goes down into the tab
    return { estado: aqui(0), efeito: NADA };
  }
  const i = Math.min(e.linha, linhas.length - 1);
  const linha = linhas[i];
  if (acaoDaLinha(linha)) {
    // the remap table: ←→ choose the cell, OK waits for the new key (the controller cell only with one connected)
    if (t === 'esquerda' || t === 'direita') return { estado: aqui(i, e.coluna === 0 ? 1 : 0), efeito: NADA };
    if (e.coluna === 1 && !ctx.temControle) return { estado: aqui(i), efeito: NADA };
    return { estado: { tela: 'captura', aba, linha: i, coluna: e.coluna }, efeito: NADA };
  }
  if (linha === 'restaurar') {
    if (t !== 'ok') return { estado: aqui(i), efeito: NADA };
    return { estado: { tela: 'confirma', acao: 'restaurar', sim: false, de: { aba, linha: i } }, efeito: NADA };
  }
  return { estado: aqui(i), efeito: { tipo: 'mudar', linha: linha as Campo | 'telaCheia', d: t === 'esquerda' ? -1 : 1 } };
}
