import type { Campo } from '../preferencias.ts';

/**
 * THE PAUSE AND THE SETTINGS — numbers and rules (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md`).
 *
 * PURE module: which lines each kind of scene offers, the two window sizes, the tabs, and the whole navigation as a
 * function `(state, key) → (state, effect)`. `scenes/PausaScene.ts` only draws the state and carries out the effect.
 */

/** Where the pause opened. `menu` = the SETTINGS opened from the main menu (no pause list, straight to the big window). */
export type TipoPausa = 'fase' | 'cutscene' | 'escolha' | 'menu';
export type Acao = 'continuar' | 'reiniciar' | 'pular' | 'config' | 'sair';

/** Restarting a cutscene makes no sense (it gets SKIP); the card table and the hangar are choices (neither). */
export const LINHAS: Record<Exclude<TipoPausa, 'menu'>, readonly Acao[]> = {
  fase: ['continuar', 'reiniciar', 'config', 'sair'],
  cutscene: ['continuar', 'pular', 'config', 'sair'],
  escolha: ['continuar', 'config', 'sair'],
};

export const ROTULO: Record<Acao, string> = {
  continuar: 'CONTINUAR',
  reiniciar: 'REINICIAR A FASE',
  pular: 'PULAR A CENA',
  config: 'CONFIGURAÇÕES',
  sair: 'SAIR PARA O MENU',
};

export type Aba = 'audio' | 'controles' | 'video' | 'jogo';
export const ROTULO_ABA: Record<Aba, string> = { audio: 'ÁUDIO', controles: 'CONTROLES', video: 'VÍDEO', jogo: 'JOGO' };
/** The GAME tab holds only the night/dawn menu choice, which exists only after the first victory. */
export const abasDe = (zerou: boolean): readonly Aba[] => (zerou ? ['audio', 'controles', 'video', 'jogo'] : ['audio', 'controles', 'video']);

/** A settings line: a preference field, or the fullscreen switch (a state of the browser, not a recorded preference). */
export type Linha = Campo | 'telaCheia';
export const LINHAS_DA_ABA: Record<Aba, readonly Linha[]> = {
  audio: ['volume.geral', 'volume.musica', 'volume.efeitos'],
  controles: ['teclas'],
  video: ['telaCheia', 'reduzirClaroes'],
  jogo: ['menu'],
};
export const ROTULO_LINHA: Record<Linha, string> = {
  'volume.geral': 'VOLUME GERAL',
  'volume.musica': 'MÚSICA',
  'volume.efeitos': 'EFEITOS',
  teclas: 'TECLAS',
  telaCheia: 'TELA CHEIA',
  reduzirClaroes: 'REDUZIR CLARÕES',
  menu: 'MENU',
};

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

export type Estado =
  | { tela: 'lista'; cursor: number }
  | { tela: 'confirma'; acao: 'reiniciar' | 'sair'; sim: boolean }
  /** `linha` −1 = the cursor is on the tab strip */
  | { tela: 'config'; aba: number; linha: number };

export type Tecla = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'ok' | 'esc' | 'abaAnt' | 'abaProx';

export type Efeito =
  | { tipo: 'nada' }
  /** close the window and resume what was underneath */
  | { tipo: 'fechar' }
  | { tipo: 'acao'; acao: 'reiniciar' | 'pular' | 'sair' }
  | { tipo: 'mudar'; linha: Linha; d: -1 | 1 };

export interface Contexto {
  tipo: TipoPausa;
  zerou: boolean;
}

const NADA: Efeito = { tipo: 'nada' };
const roda = (i: number, n: number): number => ((i % n) + n) % n;

export function inicial(tipo: TipoPausa): Estado {
  return tipo === 'menu' ? { tela: 'config', aba: 0, linha: 0 } : { tela: 'lista', cursor: 0 };
}

/** One key on one state. Never mutates `e`. */
export function passo(e: Estado, t: Tecla, ctx: Contexto): { estado: Estado; efeito: Efeito } {
  if (e.tela === 'lista') {
    if (ctx.tipo === 'menu') return { estado: e, efeito: { tipo: 'fechar' } };
    const linhas = LINHAS[ctx.tipo];
    if (t === 'cima' || t === 'baixo') return { estado: { tela: 'lista', cursor: roda(e.cursor + (t === 'cima' ? -1 : 1), linhas.length) }, efeito: NADA };
    if (t === 'esc') return { estado: e, efeito: { tipo: 'fechar' } };
    if (t !== 'ok') return { estado: e, efeito: NADA };
    const acao = linhas[e.cursor];
    if (acao === 'continuar') return { estado: e, efeito: { tipo: 'fechar' } };
    if (acao === 'config') return { estado: { tela: 'config', aba: 0, linha: 0 }, efeito: NADA };
    if (acao === 'pular') return { estado: e, efeito: { tipo: 'acao', acao: 'pular' } };
    // restart and quit throw the run away: they ask first, the cursor on NO
    return { estado: { tela: 'confirma', acao, sim: false }, efeito: NADA };
  }

  if (e.tela === 'confirma') {
    const volta: Estado = { tela: 'lista', cursor: ctx.tipo === 'menu' ? 0 : Math.max(0, LINHAS[ctx.tipo].indexOf(e.acao)) };
    if (t === 'esc') return { estado: volta, efeito: NADA };
    if (t === 'ok') return e.sim ? { estado: e, efeito: { tipo: 'acao', acao: e.acao } } : { estado: volta, efeito: NADA };
    if (t === 'esquerda' || t === 'direita' || t === 'cima' || t === 'baixo') return { estado: { ...e, sim: !e.sim }, efeito: NADA };
    return { estado: e, efeito: NADA };
  }

  const abas = abasDe(ctx.zerou);
  const aba = Math.min(e.aba, abas.length - 1);
  const linhas = LINHAS_DA_ABA[abas[aba]];
  const trocaAba = (d: number): { estado: Estado; efeito: Efeito } => ({
    estado: { tela: 'config', aba: roda(aba + d, abas.length), linha: e.linha === -1 ? -1 : 0 },
    efeito: NADA,
  });
  if (t === 'abaAnt') return trocaAba(-1);
  if (t === 'abaProx') return trocaAba(1);
  if (t === 'esc') {
    if (ctx.tipo === 'menu') return { estado: e, efeito: { tipo: 'fechar' } };
    return { estado: { tela: 'lista', cursor: LINHAS[ctx.tipo].indexOf('config') }, efeito: NADA };
  }
  if (t === 'cima') return { estado: { tela: 'config', aba, linha: Math.max(-1, e.linha - 1) }, efeito: NADA };
  if (t === 'baixo') return { estado: { tela: 'config', aba, linha: Math.min(linhas.length - 1, e.linha + 1) }, efeito: NADA };
  if (e.linha === -1) {
    if (t === 'esquerda') return trocaAba(-1);
    if (t === 'direita') return trocaAba(1);
    // OK on the tab strip goes down into the tab
    return { estado: { tela: 'config', aba, linha: 0 }, efeito: NADA };
  }
  const linha = linhas[Math.min(e.linha, linhas.length - 1)];
  return { estado: { tela: 'config', aba, linha: e.linha }, efeito: { tipo: 'mudar', linha, d: t === 'esquerda' ? -1 : 1 } };
}
