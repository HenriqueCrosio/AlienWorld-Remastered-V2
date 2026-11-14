import { BOTAO, familiaDe, type Familia } from './mapas';

/**
 * THE CONTROLLER READER (14/11, block M2 — spec `2026-11-14-bloco-m2-controles-design.md` §4.3).
 *
 * ONE reader for the page, on the browser's Gamepad API (Xbox and PlayStation come with the "standard" mapping, no
 * driver). It is read once per frame of the WORLD game (`lerControle`, hooked in `main.ts`); everything else — the
 * ship, the menus, the pause, the card table in the HD layer — listens to `aoQuadro`, so an edge ("the button went
 * down") is seen exactly once by everyone, whatever game or scene they live in.
 *
 * It also knows which device was used LAST (keyboard or controller): the hints on screen follow it.
 */
export type Aparelho = 'teclado' | 'controle';

/** The stick counts as a direction beyond this (fixed; an adjustable dead zone is for later). */
export const ZONA_MORTA = 0.3;
/** In menus the stick has to be pushed further (a resting thumb must not walk the cursor). */
const ZONA_MENU = 0.55;
/** A trigger counts as pressed beyond this. */
const GATILHO = 0.35;

const N = 17;
let conectado = false;
let id = '';
let familia: Familia = 'xbox';
let botoes: boolean[] = new Array(N).fill(false);
let desceram = new Set<number>();
let eixoX = 0;
let eixoY = 0;
let ativo: Aparelho = 'teclado';
let quadro = 0;

const ouvintesQuadro = new Set<() => void>();
const ouvintesAparelho = new Set<(a: Aparelho) => void>();
const ouvintesConexao = new Set<(ligou: boolean) => void>();

const assinar = <T>(conjunto: Set<T>, f: T): (() => void) => {
  conjunto.add(f);
  return () => void conjunto.delete(f);
};
/** Called after every read (once per frame of the world game). Returns the unsubscribe. */
export const aoQuadro = (f: () => void): (() => void) => assinar(ouvintesQuadro, f);
/** Called when the last device used changes. */
export const aoMudarAparelho = (f: (a: Aparelho) => void): (() => void) => assinar(ouvintesAparelho, f);
/** Called when the controller connects (true) or disconnects (false). */
export const aoConectar = (f: (ligou: boolean) => void): (() => void) => assinar(ouvintesConexao, f);

export const aparelhoAtivo = (): Aparelho => ativo;
export const controleConectado = (): boolean => conectado;
export const familiaDoControle = (): Familia => familia;
/** The frame counter of the reader: who was born in this frame ignores its edges (they were for someone else). */
export const quadroDoControle = (): number => quadro;
export const seguraBotao = (i: number): boolean => botoes[i] === true;
/** The button went down in THIS frame. */
export const desceuBotao = (i: number): boolean => desceram.has(i);
/** Every button that went down in this frame (the remap capture takes the first). */
export const botoesQueDesceram = (): readonly number[] => [...desceram];

/** The direction held: the d-pad, or the left stick beyond `zona`. */
export function direcao(zona = ZONA_MORTA): { cima: boolean; baixo: boolean; esquerda: boolean; direita: boolean } {
  return {
    cima: botoes[BOTAO.CIMA] || eixoY < -zona,
    baixo: botoes[BOTAO.BAIXO] || eixoY > zona,
    esquerda: botoes[BOTAO.ESQUERDA] || eixoX < -zona,
    direita: botoes[BOTAO.DIREITA] || eixoX > zona,
  };
}
export const direcaoDeMenu = (): ReturnType<typeof direcao> => direcao(ZONA_MENU);

function usar(a: Aparelho): void {
  if (ativo === a) return;
  ativo = a;
  for (const f of [...ouvintesAparelho]) f(a);
}

/** The first connected controller with the standard mapping (or, without one, the first connected). */
function escolher(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  let qualquer: Gamepad | null = null;
  for (const g of navigator.getGamepads()) {
    if (!g || !g.connected) continue;
    if (g.mapping === 'standard') return g;
    qualquer ??= g;
  }
  return qualquer;
}

/** One read. `main.ts` calls it at the start of every frame of the world game. */
export function lerControle(): void {
  quadro++;
  const g = escolher();
  const antes = botoes;
  desceram = new Set();
  if (!g) {
    botoes = new Array(N).fill(false);
    eixoX = 0;
    eixoY = 0;
    if (conectado) {
      conectado = false;
      for (const f of [...ouvintesConexao]) f(false);
      usar('teclado');
    }
  } else {
    const agora: boolean[] = new Array(N).fill(false);
    for (let i = 0; i < N && i < g.buttons.length; i++) {
      const b = g.buttons[i];
      agora[i] = i === BOTAO.LT || i === BOTAO.RT ? b.value > GATILHO || (b.pressed && b.value === 0) : b.pressed;
      if (agora[i] && !antes[i]) desceram.add(i);
    }
    botoes = agora;
    eixoX = g.axes[0] ?? 0;
    eixoY = g.axes[1] ?? 0;
    if (!conectado || g.id !== id) {
      const ligou = !conectado;
      conectado = true;
      id = g.id;
      familia = familiaDe(g.id);
      // the buttons held at the moment it connects are not presses
      desceram = new Set();
      // a new controller (or another one in its place: the family, the names and the symbols may have changed)
      void ligou;
      for (const f of [...ouvintesConexao]) f(true);
    }
    if (desceram.size > 0 || Math.abs(eixoX) > ZONA_MENU || Math.abs(eixoY) > ZONA_MENU) usar('controle');
  }
  for (const f of [...ouvintesQuadro]) f();
}

// any key press makes the keyboard the active device
if (typeof window !== 'undefined') window.addEventListener('keydown', () => usar('teclado'), true);

// ─── the vibration (spec §3.4) ───

const EFEITOS = {
  golpe: { duration: 180, weakMagnitude: 0.6, strongMagnitude: 0.8 },
  bomba: { duration: 260, weakMagnitude: 0.5, strongMagnitude: 1 },
  chefao: { duration: 600, weakMagnitude: 0.8, strongMagnitude: 1 },
} as const;
export type Vibracao = keyof typeof EFEITOS;

type Atuador = { playEffect?: (tipo: string, p: object) => Promise<unknown>; reset?: () => Promise<unknown>; pulse?: (forca: number, ms: number) => Promise<unknown> };
type ComVibracao = { vibrationActuator?: Atuador | null; hapticActuators?: Atuador[] };
/** Chrome, Edge and Opera: `vibrationActuator.playEffect`. Firefox (some versions): `hapticActuators[0].pulse`. */
function atuador(): Atuador | null {
  const g = escolher() as unknown as ComVibracao | null;
  if (!g) return null;
  if (g.vibrationActuator && typeof g.vibrationActuator.playEffect === 'function') return g.vibrationActuator;
  const h = g.hapticActuators?.[0];
  return h && typeof h.pulse === 'function' ? h : null;
}
/** Does this browser offer vibration for the connected controller? (The settings say so when it does not.) */
export const vibracaoDisponivel = (): boolean => atuador() !== null;

function tocar(tipo: Vibracao): void {
  const a = atuador();
  if (!a) return;
  const e = EFEITOS[tipo];
  if (a.playEffect) void a.playEffect('dual-rumble', { startDelay: 0, ...e })?.catch(() => {});
  else void a.pulse?.(e.strongMagnitude, e.duration)?.catch(() => {});
}
/** The settings line was turned ON: one pulse, so the player FEELS that it works (whatever the device in use). */
export const vibrarTeste = (): void => tocar('bomba');

let vibracaoLigada: () => boolean = () => true;
/** `aplicarPreferencias.ts` plugs the player's choice in. */
export function definirVibracao(f: () => boolean): void {
  vibracaoLigada = f;
}

/** Only when the controller is the device in use, the player left it on, and the browser has it (Chrome, Edge, Opera). */
export function vibrar(tipo: Vibracao): void {
  if (ativo !== 'controle' || !vibracaoLigada()) return;
  tocar(tipo);
}

/** The pause opened: whatever was shaking stops. */
export function pararVibracao(): void {
  void atuador()?.reset?.()?.catch(() => {});
}
