/**
 * FULLSCREEN (14/11, block M1).
 *
 * ⚠️ THE BROWSER OWNS THE ESC IN FULLSCREEN: by default the first ESC leaves fullscreen and never reaches the game —
 * he saw it at once (*"ao acionar o ESC para sair do menu, primeiro sai da tela cheia e depois volta ao menu"*). The
 * Keyboard Lock API hands the ESC to the page while in fullscreen (the browser then leaves fullscreen on a LONG press
 * of ESC, and the settings line still turns it off). It exists in Chrome, Edge and Opera; where it does not (Firefox,
 * Safari) nothing can be done from the page and the ESC keeps leaving fullscreen first.
 */
type TecladoComTrava = { lock?: (teclas: string[]) => Promise<void>; unlock?: () => void };
const teclado = (): TecladoComTrava | undefined => (navigator as unknown as { keyboard?: TecladoComTrava }).keyboard;

export const emTelaCheia = (): boolean => typeof document !== 'undefined' && !!document.fullscreenElement;

/** Does this browser let the game keep the ESC in fullscreen? */
export const escFicaNoJogo = (): boolean => typeof navigator !== 'undefined' && typeof teclado()?.lock === 'function';

function travarEsc(): void {
  if (emTelaCheia()) void teclado()?.lock?.(['Escape']).catch(() => {});
  else teclado()?.unlock?.();
}

/** The settings line: turns fullscreen on or off. The browser only grants it on a gesture (a key press is one). */
export function alternarTelaCheia(): void {
  const pedido = emTelaCheia() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  void pedido.then(travarEsc).catch(() => {});
}

// however fullscreen came or went (the settings line, the long ESC), the lock follows it
if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', travarEsc);
