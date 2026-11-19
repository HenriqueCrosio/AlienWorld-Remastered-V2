/**
 * O RELÓGIO DA TEMPESTADE DO MENU (spec `2026-11-19-menu-neblina-chuva-design.md` §2): a faixa `amb.menu.tempestade`
 * (6min16, em laço) começa junto com o menu; a neblina e a chuva leem o arco dela neste relógio. Puro: o Node testa.
 */

/** A duração da faixa (s), medida no arquivo. */
export const DURACAO_TEMPESTADE = 376.13;

/** Um ponto-chave do arco: [segundo da faixa, valor 0–1]. */
export type PontoArco = readonly [number, number];

/** O valor do arco no instante `t` do menu (a faixa em laço), suave entre os pontos (smoothstep). */
export function arcoDaTempestade(pontos: readonly PontoArco[], t: number): number {
  const u = ((t % DURACAO_TEMPESTADE) + DURACAO_TEMPESTADE) % DURACAO_TEMPESTADE;
  for (let i = 0; i + 1 < pontos.length; i++) {
    const [t0, v0] = pontos[i];
    const [t1, v1] = pontos[i + 1];
    if (u >= t0 && u <= t1) {
      const s = t1 > t0 ? (u - t0) / (t1 - t0) : 1;
      return v0 + (v1 - v0) * s * s * (3 - 2 * s);
    }
  }
  return pontos.length ? pontos[pontos.length - 1][1] : 0;
}
