import type { Escolha } from '../ships.ts';
import { LADO, LADOS, TEMPO, type Lado } from './numerosHangar.ts';

/**
 * A ESCOLHA NO HANGAR, em funções puras do relógio da cena (como o menu: o mesmo instante dá sempre o mesmo quadro, a
 * sonda para em qualquer `t`). A cena do mundo (`HangarScene`) muda o estado com as teclas; o cenário (na camada HD ou
 * no mundo) só lê.
 */
export interface EstadoHangar {
  /** O relógio da cena (s). */
  t: number;
  lado: Lado;
  /** O índice da pintura de cada lado (em `LADO[lado].pinturas`). */
  pinturas: Record<Lado, number>;
  /** Para a seta deslizar: de onde ela veio e quando. */
  ladoAntes: Lado;
  tLado: number;
  /** Para a pintura nova varrer a nave: qual lado, a pintura de antes e quando. */
  ladoPintura: Lado;
  pinturaAntes: number;
  tPintura: number;
  /** Quando o jogador confirmou (null = escolhendo). */
  tConfirmou: number | null;
  /** O cenário montou. */
  pronto: boolean;
}

const LONGE = -1e6;

/** O estado de quem entra no hangar: a seta já na nave que ele tem (a do registry), na pintura dela. */
export function novoEstado(e: Escolha): EstadoHangar {
  const lado = LADOS.find((l) => LADO[l].modelo === e.modelo) ?? 'esq';
  const pinturas = { esq: 0, dir: 0 } as Record<Lado, number>;
  pinturas[lado] = Math.max(0, LADO[lado].pinturas.indexOf(e.pintura));
  return { t: 0, lado, pinturas, ladoAntes: lado, tLado: LONGE, ladoPintura: lado, pinturaAntes: pinturas[lado], tPintura: LONGE, tConfirmou: null, pronto: false };
}

/** A escolha que o estado representa. */
export function escolhaDoEstado(e: EstadoHangar): Escolha {
  const L = LADO[e.lado];
  return { modelo: L.modelo, pintura: L.pinturas[e.pinturas[e.lado]] };
}

/** ←/→: a seta vai para o outro lado (são dois; qualquer direção troca, mas não passa da ponta). */
export function mudarLado(e: EstadoHangar, d: -1 | 1): boolean {
  if (e.tConfirmou !== null) return false;
  const novo: Lado = d < 0 ? 'esq' : 'dir';
  if (novo === e.lado) return false;
  e.ladoAntes = e.lado;
  e.lado = novo;
  e.tLado = e.t;
  return true;
}

/** ↑/↓: a próxima pintura da nave escolhida (dá a volta). */
export function mudarPintura(e: EstadoHangar, d: -1 | 1): boolean {
  if (e.tConfirmou !== null) return false;
  const n = LADO[e.lado].pinturas.length;
  e.ladoPintura = e.lado;
  e.pinturaAntes = e.pinturas[e.lado];
  e.pinturas[e.lado] = (e.pinturas[e.lado] + d + n) % n;
  e.tPintura = e.t;
  return true;
}

export function confirmar(e: EstadoHangar): boolean {
  if (e.tConfirmou !== null) return false;
  e.tConfirmou = e.t;
  return true;
}

const facil = (u: number): number => 1 - (1 - u) * (1 - u) * (1 - u); // ease-out cubic
const prender = (u: number): number => Math.min(1, Math.max(0, u));

/** O quanto a seta já foi do lado de antes para o de agora (0–1). */
export function andamentoSeta(e: EstadoHangar): number {
  return facil(prender((e.t - e.tLado) / TEMPO.seta));
}

/** O quanto a pintura nova já varreu a nave (0–1; 1 = toda nova). */
export function andamentoPintura(e: EstadoHangar): number {
  return prender((e.t - e.tPintura) / TEMPO.pintura);
}

/** O véu: abre na entrada, fecha depois de confirmar. */
export function alfaVeu(e: EstadoHangar): number {
  const abre = 1 - prender(e.t / TEMPO.entrada);
  const fecha = e.tConfirmou === null ? 0 : prender((e.t - e.tConfirmou - TEMPO.veuFecha) / (TEMPO.fim - 0.1 - TEMPO.veuFecha));
  return Math.max(abre, fecha);
}

/** O motor da nave escolhida depois de confirmar (0–1). */
export function forcaMotor(e: EstadoHangar): number {
  return e.tConfirmou === null ? 0 : facil(prender((e.t - e.tConfirmou) / TEMPO.motor));
}

/** A cena acabou (a fase pode começar). */
export function acabou(e: EstadoHangar): boolean {
  return e.tConfirmou !== null && e.t - e.tConfirmou >= TEMPO.fim;
}
