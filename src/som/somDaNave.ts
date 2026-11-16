/**
 * WHICH SHIP IS SOUNDING (block SOUND, 15/11). Pure. His decision: the three ships sound different — the X-AELO (the
 * human `jato`), the TERMINUS (the human "a") and the CHARYBDIS (the alien manta), each with its own shot, engine,
 * hit, life lost and death; the two humans share the weapon's NUMBERS, never the timbre.
 */
export type NaveSom = 'xaelo' | 'terminus' | 'charybdis';

export function naveDoSom(shipId: string, modelo: 'a' | 'jato'): NaveSom {
  if (shipId === 'alienigena') return 'charybdis';
  return modelo === 'jato' ? 'xaelo' : 'terminus';
}

/**
 * THE A1 ARRIVAL GROWS WITH THE BURST (16/11, him: *"a forma do A1 se comportar depois de soltar o gatilho é proporcional
 * a quantidade de tiro dado. Mas impor um limite, pq várias vezes o jogador vai cravar o dedo no gatilho"*): a tap gives
 * a small, short arrival; each shot more makes it bigger, up to `cheioEm` shots (~2.7 s at 4.5/s); past that, the same.
 */
export const CHEGADA_DA_RAJADA = { cheioEm: 12, forcaMin: 0.4, duracaoMin: 0.45 };

/** For `disparos` shots in the burst: the arrival's level (0–1) and the fraction of its length that plays (0–1). */
export function chegadaDaRajada(disparos: number): { forca: number; fracao: number } {
  const k = Math.min(1, Math.max(0, disparos) / CHEGADA_DA_RAJADA.cheioEm);
  return {
    forca: CHEGADA_DA_RAJADA.forcaMin + (1 - CHEGADA_DA_RAJADA.forcaMin) * k,
    fracao: CHEGADA_DA_RAJADA.duracaoMin + (1 - CHEGADA_DA_RAJADA.duracaoMin) * k,
  };
}

/** How low the music sits under the F1 sonic boom (the hangar dips it, the stage brings it back). */
export const ESTRONDO_MUSICA_ABAFADA = 0.3;

/** `nave.<ship>.<what>`: the name of one of the ship's own sounds in the catalogue. */
export const somDaNave = (n: NaveSom, o: 'tiro' | 'motor' | 'atingida' | 'vida' | 'morte'): string => `nave.${n}.${o}`;
