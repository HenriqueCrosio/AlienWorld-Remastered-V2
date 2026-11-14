/**
 * THE MAPS OF KEYS AND BUTTONS (14/11, block M2 — spec `2026-11-14-bloco-m2-controles-design.md` §4.1).
 *
 * PURE module (the tests import it in node). The player remaps ACTIONS — fire, bomb, dash, flare, missile — one key
 * (or one button) each. The MOVEMENT is fixed (his words: *"quero que seja fixo o movimento"*) and so are the menu
 * keys (*"sempre serão ESC para teclado e controles usam os padrões da fábrica"*).
 *
 * Keyboard keys are NAMES of `Phaser.Input.Keyboard.KeyCodes`; controller buttons are indexes of the browser's
 * "standard" gamepad mapping, the same for Xbox and PlayStation.
 */
export type AcaoRemap = 'tiro' | 'bomba' | 'dash' | 'flare' | 'missil';
export const ACOES_REMAP: readonly AcaoRemap[] = ['tiro', 'bomba', 'dash', 'flare', 'missil'];
export const NOME_DA_ACAO: Record<AcaoRemap, string> = { tiro: 'TIRO', bomba: 'BOMBA', dash: 'DASH', flare: 'FLARE', missil: 'MÍSSIL' };

export type MapaTeclado = Record<AcaoRemap, string>;
export type MapaControle = Record<AcaoRemap, number>;

export type PerfilTeclado = 'padrao' | 'classico';
export type PerfilControle = 'moderno' | 'arcade';

/** The two keyboard profiles of 03/10 (`src/controles.ts` builds its full maps from these). */
export const TECLADO_FABRICA: Record<PerfilTeclado, MapaTeclado> = {
  padrao: { tiro: 'SPACE', bomba: 'SHIFT', dash: 'E', flare: 'F', missil: 'Q' },
  classico: { tiro: 'Z', bomba: 'X', dash: 'C', flare: 'F', missil: 'V' },
};

/** The standard mapping. The names are the Xbox ones; PlayStation has the same buttons in the same places. */
export const BOTAO = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, CIMA: 12, BAIXO: 13, ESQUERDA: 14, DIREITA: 15, GUIA: 16,
} as const;

/** MODERNO: fire on the trigger (the modern shooter). ARCADE: fire on the face button (the classic shmup). */
export const CONTROLE_FABRICA: Record<PerfilControle, MapaControle> = {
  moderno: { tiro: BOTAO.RT, missil: BOTAO.LT, dash: BOTAO.A, bomba: BOTAO.X, flare: BOTAO.B },
  arcade: { tiro: BOTAO.A, missil: BOTAO.RB, dash: BOTAO.B, bomba: BOTAO.X, flare: BOTAO.Y },
};

/** Keys the game keeps for itself: the movement and the menu. */
export const PROIBIDAS_TECLADO: readonly string[] = ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'ESC', 'ENTER'];
/** Buttons the game keeps: START (the pause), BACK and the guide button, the stick clicks, the d-pad (the movement). */
export const PROIBIDOS_CONTROLE: readonly number[] = [BOTAO.BACK, BOTAO.START, BOTAO.L3, BOTAO.R3, BOTAO.CIMA, BOTAO.BAIXO, BOTAO.ESQUERDA, BOTAO.DIREITA, BOTAO.GUIA];

const PONTUACAO = ['COMMA', 'PERIOD', 'SEMICOLON', 'QUOTES', 'FORWARD_SLASH', 'BACK_SLASH', 'OPEN_BRACKET', 'CLOSED_BRACKET', 'MINUS', 'PLUS', 'BACKTICK'];
const DIGITOS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

/**
 * Can this key be given to an action? Letters, digits, SPACE, SHIFT and punctuation — minus the game's own keys.
 * ⚠️ Never CTRL (Ctrl+W closes the tab and no page can block it), ALT, the Windows key, TAB or the F keys (the
 * browser's own).
 */
export function teclaPermitida(nome: string): boolean {
  if (PROIBIDAS_TECLADO.includes(nome)) return false;
  return /^[A-Z]$/.test(nome) || DIGITOS.includes(nome) || PONTUACAO.includes(nome) || nome === 'SPACE' || nome === 'SHIFT';
}

export const botaoPermitido = (i: number): boolean => Number.isInteger(i) && i >= 0 && i <= 7 && !PROIBIDOS_CONTROLE.includes(i);

/**
 * Gives `nova` to `acao`. If another action had it, the two SWAP — no action is ever left without a key, and no key
 * ever does two things.
 */
export function trocar<V extends string | number>(mapa: Record<AcaoRemap, V>, acao: AcaoRemap, nova: V): Record<AcaoRemap, V> {
  const novo = { ...mapa };
  const dona = ACOES_REMAP.find((a) => a !== acao && mapa[a] === nova);
  if (dona) novo[dona] = mapa[acao];
  novo[acao] = nova;
  return novo;
}

const igual = <V>(a: Record<AcaoRemap, V>, b: Record<AcaoRemap, V>): boolean => ACOES_REMAP.every((k) => a[k] === b[k]);

/** The factory profile this map is equal to, or `'personalizado'`. */
export function perfilDe<P extends string, V>(mapa: Record<AcaoRemap, V>, fabrica: Record<P, Record<AcaoRemap, V>>): P | 'personalizado' {
  for (const p of Object.keys(fabrica) as P[]) if (igual(mapa, fabrica[p])) return p;
  return 'personalizado';
}

export function mapaTecladoValido(m: unknown): m is MapaTeclado {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  const vs = ACOES_REMAP.map((a) => o[a]);
  return vs.every((v) => typeof v === 'string' && teclaPermitida(v)) && new Set(vs).size === vs.length;
}

export function mapaControleValido(m: unknown): m is MapaControle {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  const vs = ACOES_REMAP.map((a) => o[a]);
  return vs.every((v) => typeof v === 'number' && botaoPermitido(v)) && new Set(vs).size === vs.length;
}

// ─── what the screen calls each one ───

const ROTULO_TECLA: Record<string, string> = {
  SPACE: 'ESPAÇO', SHIFT: 'SHIFT', ESC: 'ESC', ENTER: 'ENTER', UP: 'CIMA', DOWN: 'BAIXO', LEFT: 'ESQUERDA', RIGHT: 'DIREITA',
  ZERO: '0', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9',
  COMMA: ',', PERIOD: '.', SEMICOLON: ';', QUOTES: "'", FORWARD_SLASH: '/', BACK_SLASH: '\\', OPEN_BRACKET: '[', CLOSED_BRACKET: ']',
  MINUS: '-', PLUS: '=', BACKTICK: '`',
};
/** The name of a key on screen ("ESPAÇO repete…"). */
export const rotuloDaTecla = (nome: string): string => ROTULO_TECLA[nome] ?? nome;

export type Familia = 'xbox' | 'ps';

/** Xbox or PlayStation, from the name the browser gives the device (Sony's USB vendor id is 054c). Unknown → Xbox. */
export function familiaDe(id: string): Familia {
  return /playstation|dualshock|dualsense|054c|sony|ps[345]/i.test(id) ? 'ps' : 'xbox';
}

// The fonts of the game have no ✕ ○ ▢ △: the PlayStation face buttons go by the names players say out loud.
const ROTULO_BOTAO: Record<Familia, readonly string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'START', 'L3', 'R3', 'CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'XBOX'],
  ps: ['X', 'BOLA', 'QUADRADO', 'TRIÂNGULO', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', 'CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'PS'],
};
export const rotuloDoBotao = (i: number, familia: Familia): string => ROTULO_BOTAO[familia][i] ?? `B${i}`;
