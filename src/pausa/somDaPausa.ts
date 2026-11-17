import type { Contexto, Efeito, Estado, Tecla } from './numerosPausa';

/**
 * THE PAUSE'S SOUND (block SOUND, sheet 6, 17/11) — pure: which interface sound one key makes, from the state before,
 * the state after and the effect of `passo`. Tested in Node (`scripts/test-som.mjs`). The remap's own ending (the key
 * taken, the swap announced, the key refused) is the scene's — it happens outside `passo`.
 *   moving the cursor / the SIM-NÃO      ui.mover     ·  the tab                          ui.aba
 *   a value ←→                           ui.ajustar   ·  going deeper (config, confirm)  ui.confirmar
 *   going back (ESC, NÃO)                ui.voltar    ·  closing the pause               ui.pausa.fechar
 *   an action (restart, quit, skip)      ui.confirmar ·  waiting for the key             ui.captura
 *   OK that does nothing (the controller cell with no controller)                       ui.negar
 * (closing the SETTINGS window of the main menu is a "back", not the pause closing)
 */
export function somDaPausa(antes: Estado, depois: Estado, efeito: Efeito, t: Tecla, ctx: Contexto): string | null {
  if (efeito.tipo === 'fechar') return ctx.tipo === 'menu' ? 'ui.voltar' : 'ui.pausa.fechar';
  if (efeito.tipo === 'acao' || efeito.tipo === 'restaurar') return 'ui.confirmar';
  if (efeito.tipo === 'mudar') return 'ui.ajustar';
  if (depois.tela === 'captura' && antes.tela !== 'captura') return 'ui.captura';
  if (antes.tela !== depois.tela) {
    const recua = t === 'esc' || (antes.tela === 'confirma' && t === 'ok' && !antes.sim) || antes.tela === 'captura';
    return recua ? 'ui.voltar' : 'ui.confirmar';
  }
  if (antes.tela === 'lista' && depois.tela === 'lista') return antes.cursor !== depois.cursor ? 'ui.mover' : null;
  if (antes.tela === 'confirma' && depois.tela === 'confirma') return antes.sim !== depois.sim ? 'ui.mover' : null;
  if (antes.tela === 'config' && depois.tela === 'config') {
    if (antes.aba !== depois.aba) return 'ui.aba';
    if (antes.linha !== depois.linha || antes.coluna !== depois.coluna) return 'ui.mover';
    return t === 'ok' ? 'ui.negar' : null;
  }
  return null;
}
