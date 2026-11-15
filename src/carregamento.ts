/**
 * THE LOADING SCREEN, the game side (15/11, block M4 — spec `2026-11-15-bloco-m4-carregamento-design.md`).
 *
 * The screen itself lives in `index.html` (his painting of the hangar in the storm, the CSS that moves it, the bar):
 * it is up before this code arrives. Here the game only reports how far it is and says when it is done.
 *
 * Two loaders run side by side: the WORLD game (`BootScene`: the sprites, the sheets, the music) and the HD layer
 * (`BootHDScene`: the paintings of the menu and of the hangar, the cards). The bar is the weighted sum of the two,
 * after a first step for the code and the fonts having arrived.
 *
 * DEV: `?carregamento=8` holds the screen for 8 s (a local load takes under a second: nothing to look at).
 */
export type ParteDaCarga = 'mundo' | 'hd';

interface Tela {
  progresso(p: number): void;
  sair(): Promise<void>;
  remover(): void;
}
const tela = (): Tela | null => (window as unknown as { __carga?: Tela }).__carga ?? null;

/** The share of the bar of each step: the code and the fonts, then the two loaders. */
export const PESO = { codigo: 0.06, mundo: 0.62, hd: 0.32 } as const;

const partes: Record<ParteDaCarga, number> = { mundo: 0, hd: 0 };
let nasceu = 0;
let devagar = 0;
let relogio = 0;

/** The bar for a state of the loaders (pure: tested without a browser). */
export function barra(p: Record<ParteDaCarga, number>): number {
  const c = (v: number): number => Math.min(1, Math.max(0, v));
  return PESO.codigo + PESO.mundo * c(p.mundo) + PESO.hd * c(p.hd);
}

function mostrar(): void {
  let p = barra(partes);
  if (devagar > 0) p = Math.min(p, (performance.now() - nasceu) / devagar);
  tela()?.progresso(p);
}

/** The code and the fonts have arrived; `semHD`: there is no HD layer to wait for (its share counts as done). */
export function carregamentoComecou(semHD: boolean): void {
  nasceu = performance.now();
  if (semHD) partes.hd = 1;
  if (import.meta.env.DEV) {
    const s = Number(new URLSearchParams(location.search).get('carregamento'));
    if (s > 0) {
      devagar = s * 1000;
      relogio = window.setInterval(mostrar, 100);
    }
  }
  mostrar();
}

/** A loader moved (0–1). */
export function carregou(parte: ParteDaCarga, p: number): void {
  partes[parte] = Math.max(partes[parte], p);
  mostrar();
}

/**
 * The world is ready: the bar completes, the ship leaves, the screen goes dark — and only then the menu starts (it
 * resolves at once when the page has no loading screen). The caller starts the menu and calls `tirarCarregamento`.
 */
export async function carregamentoAcabou(): Promise<void> {
  if (devagar > 0) {
    const falta = devagar - (performance.now() - nasceu);
    if (falta > 0) await new Promise((ok) => setTimeout(ok, falta));
    window.clearInterval(relogio);
    devagar = 0;
  }
  partes.mundo = 1;
  partes.hd = 1;
  await tela()?.sair();
}

/** Takes the screen off the page (the menu is drawing underneath). */
export function tirarCarregamento(): void {
  tela()?.remover();
}
