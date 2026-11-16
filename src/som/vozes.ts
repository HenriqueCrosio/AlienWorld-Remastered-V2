/**
 * THE VOICE RULES (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.1). Pure: the engine asks,
 * this answers.
 *
 * - the same sound twice inside `INTERVALO_MIN` (one frame) plays once — a chain explosion does not stack;
 * - each sound has its own cap; at the cap the OLDEST copy of it is cut for the new one (the newest shot matters);
 * - over the global cap, the new voice only enters by pushing out a voice of equal or lower weight (the oldest of the
 *   lowest weight); the interface is never pushed out.
 */
export type Prioridade = 'interface' | 'jogador' | 'chefe' | 'cena' | 'inimigo';
export const PESO: Record<Prioridade, number> = { interface: 4, jogador: 3, chefe: 3, cena: 2, inimigo: 1 };

export const TETO_GERAL = 24;
/** Seconds: one frame at 60 fps, a little less. */
export const INTERVALO_MIN = 0.012;

export interface VozAtiva {
  id: number;
  nome: string;
  peso: number;
  /** `AudioContext.currentTime` when it started. */
  inicio: number;
}

export type Decisao = { tipo: 'tocar' } | { tipo: 'recusar' } | { tipo: 'trocar'; id: number };

const maisVelha = (vs: readonly VozAtiva[]): VozAtiva => vs.reduce((a, b) => (b.inicio < a.inicio ? b : a));

export function decidir(
  ativas: readonly VozAtiva[],
  nome: string,
  peso: number,
  tetoDoSom: number,
  agora: number,
  ultimo: number | undefined,
  tetoGeral = TETO_GERAL,
): Decisao {
  if (ultimo !== undefined && agora - ultimo < INTERVALO_MIN) return { tipo: 'recusar' };
  const mesmas = ativas.filter((v) => v.nome === nome);
  if (mesmas.length >= tetoDoSom) return { tipo: 'trocar', id: maisVelha(mesmas).id };
  if (ativas.length < tetoGeral) return { tipo: 'tocar' };
  const fracas = ativas.filter((v) => v.peso <= peso && v.peso < PESO.interface);
  if (!fracas.length) return { tipo: 'recusar' };
  const menor = Math.min(...fracas.map((v) => v.peso));
  return { tipo: 'trocar', id: maisVelha(fracas.filter((v) => v.peso === menor)).id };
}

/** The per-shot variation: `taxa` is the playback rate (pitch), `ganho` multiplies the volume. */
export function sortearVariacao(rnd: () => number, tom: number, vol: number): { taxa: number; ganho: number } {
  return { taxa: 1 + (rnd() * 2 - 1) * tom, ganho: 1 + (rnd() * 2 - 1) * vol };
}
