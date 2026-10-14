// Com a extensão: o `test-elites-regras` importa este módulo em node, que não resolve import sem ela.
import { ELITES } from './data/numerosElites.ts';

/**
 * AS REGRAS DOS ELITES (spec 2026-10-05-frente-b-elites-design.md §2.4) — quando cada um muda de estado e se o
 * escudo segura o golpe. PURAS: quem anda, atira e desenha é a classe do elite; aqui só se decide. `t` é o tempo
 * (s) no estado atual, contado pelo `update` — e o `update` NÃO roda com o inimigo travado (elétrico), então a
 * trava pausa estes relógios de graça (§2.7).
 */

export type EstadoDrone = 'minerando' | 'alerta' | 'ataque' | 'pisca';
export interface SinaisDrone {
  /** Distância até a nave. */
  dist: number;
  /** Já levou dano (hp < máximo). */
  ferido: boolean;
  rochaViva: boolean;
  rochaX: number;
}

export function droneAvanca(estado: EstadoDrone, t: number, s: SinaisDrone): EstadoDrone {
  const D = ELITES.drone;
  if (estado === 'minerando') {
    const acorda = s.ferido || !s.rochaViva || s.dist <= D.raioAlerta || s.rochaX <= D.acordaAteX;
    return acorda ? 'alerta' : 'minerando';
  }
  if (estado === 'alerta') return t >= D.alertaS ? 'ataque' : 'alerta';
  if (estado === 'ataque') return s.dist <= D.raioPisca || t >= D.ataqueMaxS ? 'pisca' : 'ataque';
  return 'pisca';
}

/**
 * A autodestruição acontece quando o pisca TERMINA — e só assim. ⚠️ Morto antes (inclusive NO pisca), ele morre pelo
 * caminho comum e não explode: matar tem de ser melhor do que deixar (a regra da mina sensora, GDD §6).
 */
export const droneExplode = (estado: EstadoDrone, t: number): boolean => estado === 'pisca' && t >= ELITES.drone.piscaS;

export type EstadoSentinela = 'rolando' | 'abrir' | 'fogo' | 'sobrecarga' | 'fechar' | 'saindo';
export interface SinaisSentinela {
  /** Chegou ao posto (só conta rolando). */
  chegou: boolean;
  /** Quantos FOGOS já terminaram. */
  ciclos: number;
}

export function sentinelaAvanca(estado: EstadoSentinela, t: number, s: SinaisSentinela): EstadoSentinela {
  const S = ELITES.sentinela;
  if (estado === 'rolando') return s.chegou ? 'abrir' : 'rolando';
  if (estado === 'abrir') return t >= S.abrirS ? 'fogo' : 'abrir';
  if (estado === 'fogo') return t >= S.fogoS ? 'sobrecarga' : 'fogo';
  // A SOBRECARGA: o escudo caiu, ela cospe a espiral — a 2ª janela de dano antes de fechar.
  if (estado === 'sobrecarga') return t >= S.sobrecargaS ? 'fechar' : 'sobrecarga';
  if (estado === 'fechar') {
    if (t < S.fecharS) return 'fechar';
    return s.ciclos >= S.ciclos ? 'saindo' : 'rolando';
  }
  return 'saindo';
}

/**
 * O ESCUDO: aberta (abrindo ou atirando), ela segura o que vem de FRENTE — o arco de `escudoArcoGraus` centrado na
 * esquerda, o lado da nave. `(deX, deY)` é de onde o golpe veio. Por cima, por baixo ou por trás, passa.
 */
export function sentinelaBloqueia(
  estado: EstadoSentinela,
  ex: number,
  ey: number,
  deX: number,
  deY: number,
  escudoHp: number = ELITES.sentinela.escudoHp,
): boolean {
  if (estado !== 'abrir' && estado !== 'fogo') return false;
  if (escudoHp <= 0) return false;
  const ang = Math.atan2(deY - ey, deX - ex);
  const desvio = Math.abs(Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)));
  return desvio <= ((ELITES.sentinela.escudoArcoGraus / 2) * Math.PI) / 180;
}

/**
 * A VIDA DO ESCUDO (06/10, ele: *"faça o shield ter vida até quebrar se levar muito tiro — isso deixa segundos de
 * invulnerabilidade, mas se acertar muito no shield, quebra ele"*): cada golpe bloqueado gasta o seu dano do escudo.
 * Zerado, ele QUEBRA (o golpe que quebra ainda é segurado) e a sentinela fica exposta até o próximo ABRIR.
 */
export function escudoAbsorve(hp: number, dano: number): { hp: number; quebrou: boolean } {
  const resta = Math.max(0, hp - dano);
  return { hp: resta, quebrou: hp > 0 && resta === 0 };
}

/** A faixa de postos de um elite (a sentinela e o caçador têm a sua). */
export interface FaixaDePostos {
  postoX: readonly [number, number];
  postoY: readonly [number, number];
  postoDistY: number;
}

/** O próximo posto: na metade direita, e pelo menos `postoDistY` longe da altura do anterior (até 8 sorteios). */
export function escolherPosto(sorte: () => number, yAnterior: number | null, S: FaixaDePostos = ELITES.sentinela): { x: number; y: number } {
  const x = S.postoX[0] + sorte() * (S.postoX[1] - S.postoX[0]);
  let y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  for (let i = 0; i < 8 && yAnterior !== null && Math.abs(y - yAnterior) < S.postoDistY; i++) {
    y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  }
  return { x, y };
}

// ── O CAÇADOR DE VÁCUO, a lula (spec F3 §2 + emenda de 07/10) ──

export type EstadoCacador = 'escondido' | 'surge' | 'mira' | 'trava' | 'rajada' | 'some' | 'fuga' | 'foi';

/**
 * O ciclo da lula. `sumicos` = quantos SOME já COMEÇARAM, contando o atual: o SOME do último ressurgimento termina em
 * `foi` (vai embora, sem voltar). Morta na MIRA ou na TRAVA ela não chega à RAJADA — não atira (§2.1).
 */
export function cacadorAvanca(estado: EstadoCacador, t: number, sumicos: number): EstadoCacador {
  const C = ELITES.cacador;
  switch (estado) {
    case 'escondido':
      return t >= C.escondidoS ? 'surge' : estado;
    case 'surge':
      return t >= C.surgeS ? 'mira' : estado;
    case 'mira':
      return t >= C.miraS ? 'trava' : estado;
    case 'trava':
      return t >= C.travaS ? 'rajada' : estado;
    case 'rajada':
      if (t < C.rajadaS) return estado;
      // A última saída não é um SOME: é a FUGA (12/10).
      return sumicos + 1 >= C.ressurgimentos ? 'fuga' : 'some';
    case 'fuga':
      return t >= C.fugaS ? 'foi' : estado;
    case 'some':
      if (t < C.someS) return estado;
      return sumicos >= C.ressurgimentos ? 'foi' : 'escondido';
    default:
      return 'foi';
  }
}

/** Escondida ela some DE VERDADE (decisão dele, A): nem visível, nem atingível. No SOME ainda fere, até sumir. */
export const cacadorTangivel = (estado: EstadoCacador): boolean => estado !== 'escondido' && estado !== 'foi';

/** Na FUGA, aos `t` segundos: já DISPAROU? (Antes, o impulso: parada e atingível. Depois: voando, e já não fere nem é ferida.) */
export const cacadorFugaLancada = (t: number): boolean => t >= ELITES.cacador.fugaImpulsoS;

export type ClipeCacador = 'idle' | 'ataque' | 'foge' | 'escapa';
type PoseCacador = readonly [clipe: ClipeCacador, quadro: number];

/**
 * Os GESTOS da lula (12/10): a fila de quadros de cada estado, ESTICADA pela duração dele — mudou o tempo nos números,
 * o gesto acompanha. Os quadros são os dos clipes assados por `scripts/_elites/_instalar-lula-anims.mjs`; o quadro 0 de
 * todo clipe é a arte parada, e cada fila começa onde a anterior acabou (não há salto de pose entre estados).
 * SURGE: o `foge` de trás para a frente. MIRA: paira, vai e volta. TRAVA: os tentáculos ABREM em estrela (o aviso).
 * RAJADA: fecham de golpe, uma agulha por batida. SOME: recolhe e dispara para longe, desfazendo-se.
 * A FUGA (a última saída) tem duas filas: o IMPULSO (enrola os tentáculos numa bola) e o VOO (esticada como um dardo,
 * desfazendo-se no fim).
 */
const GESTOS: Partial<Record<EstadoCacador, readonly PoseCacador[]>> = {
  surge: [['foge', 8], ['foge', 7], ['foge', 6], ['foge', 5], ['foge', 3], ['foge', 0]],
  mira: [['idle', 0], ['idle', 1], ['idle', 2], ['idle', 3], ['idle', 2], ['idle', 1]],
  trava: [['ataque', 1], ['ataque', 2], ['ataque', 3], ['ataque', 4], ['ataque', 5], ['ataque', 6]],
  rajada: [['ataque', 7], ['ataque', 8], ['ataque', 9], ['ataque', 10], ['ataque', 12]],
  some: [['ataque', 13], ['ataque', 14], ['ataque', 15], ['ataque', 16], ['foge', 5], ['foge', 6], ['foge', 7], ['foge', 8]],
};
const FUGA_IMPULSO: readonly PoseCacador[] = [['ataque', 13], ['escapa', 3], ['escapa', 4], ['escapa', 5], ['escapa', 6], ['escapa', 7], ['escapa', 8]];
const FUGA_VOO: readonly PoseCacador[] = [['escapa', 12], ['escapa', 13], ['escapa', 14], ['escapa', 15], ['escapa', 16], ['escapa', 16], ['escapa', 17], ['escapa', 18], ['escapa', 19]];
const DURACAO: Partial<Record<EstadoCacador, 'surgeS' | 'miraS' | 'travaS' | 'rajadaS' | 'someS'>> = {
  surge: 'surgeS',
  mira: 'miraS',
  trava: 'travaS',
  rajada: 'rajadaS',
  some: 'someS',
};

/** O quadro da lula aos `t` segundos do estado; `null` = não se desenha (escondida, foi). */
export function cacadorQuadro(estado: EstadoCacador, t: number): { clipe: ClipeCacador; quadro: number } | null {
  const C = ELITES.cacador;
  const naFila = (fila: readonly PoseCacador[], f: number) => {
    const k = Math.min(fila.length - 1, Math.max(0, Math.floor(f * fila.length)));
    return { clipe: fila[k][0], quadro: fila[k][1] };
  };
  if (estado === 'fuga') {
    return cacadorFugaLancada(t) ? naFila(FUGA_VOO, (t - C.fugaImpulsoS) / (C.fugaS - C.fugaImpulsoS)) : naFila(FUGA_IMPULSO, t / C.fugaImpulsoS);
  }
  const fila = GESTOS[estado];
  const dur = DURACAO[estado];
  if (!fila || !dur) return null;
  return naFila(fila, t / C[dur]);
}

/** A tinta do `n`-ésimo sumiço (1-based): o SOPRO, e a CORTINA no último — a saída de vez (§2.3, decisão dele: A). */
export const tintaDoSumico = (n: number): 'sopro' | 'cortina' => (n >= ELITES.cacador.ressurgimentos ? 'cortina' : 'sopro');

// ── A FATIA F4 (spec 2026-10-12-frente-b-fatia-f4-design.md): a Larva Mecânica e o Tubo Pulsante ──

/** As VARIAÇÕES (13/10: a Larva A e D e o Tubo C e D ficam as duas): alternam pela ordem de nascimento na fase. */
export const varianteDe = <T>(ordem: number, lista: readonly T[]): T => lista[ordem % lista.length];

export type EstadoLarva = 'abre' | 'sai' | 'poe' | 'tranco' | 'perfura' | 'mergulha' | 'foi';

/**
 * O ciclo da Larva (§2.1 e §9.5). `paradas` = quantos PÕE já COMEÇARAM, contando o atual. Ela sai do buraco e dá um
 * TRANCO até o 1º posto; entre as paradas, um tranco; depois da última, um tranco até a SUPERFÍCIE onde vai perfurar.
 * No `abre` só o buraco existe (o aviso); `foi` = mergulhou, sem pontos.
 */
export function larvaAvanca(estado: EstadoLarva, t: number, paradas: number): EstadoLarva {
  const L = ELITES.larva;
  switch (estado) {
    case 'abre':
      return t >= ELITES.buraco.abreS ? 'sai' : estado;
    case 'sai':
      return t >= L.saiS ? 'tranco' : estado;
    case 'poe':
      return t >= L.poeS ? 'tranco' : estado;
    case 'tranco':
      if (t < L.trancoS) return estado;
      return paradas >= L.paradas ? 'perfura' : 'poe';
    case 'perfura':
      return t >= L.perfuraS ? 'mergulha' : estado;
    case 'mergulha':
      return t >= L.mergulhaS ? 'foi' : estado;
    default:
      return 'foi';
  }
}

/** Ela tem CORPO? Não enquanto é um ponto dentro do buraco: o começo do SAI e o fim do MERGULHA. */
export function larvaTangivel(estado: EstadoLarva, t: number): boolean {
  const L = ELITES.larva;
  if (estado === 'abre' || estado === 'foi') return false;
  if (estado === 'sai') return t >= L.miudaS;
  if (estado === 'mergulha') return t < L.mergulhaS - L.miudaS;
  return true;
}

export type ClipeLarva = 'poe' | 'tranco' | 'sai' | 'perfura' | 'mergulha';
type PoseLarva = readonly [clipe: ClipeLarva, quadro: number];
type EstadoLarvaVisivel = Exclude<EstadoLarva, 'abre' | 'foi'>;
const filaLarva = (clipe: ClipeLarva, de: number, ate: number): PoseLarva[] =>
  Array.from({ length: Math.abs(ate - de) + 1 }, (_, k): PoseLarva => [clipe, de + Math.sign(ate - de) * k]);

/**
 * Os GESTOS da Larva (13/10, os dos GIFs que ele aprovou): a fila de quadros de cada estado, ESTICADA pela duração
 * dele. Os quadros são os dos clipes instalados por `scripts/_elites/_instalar-f4.mjs` (iguais nas duas variações).
 * SAI: o mergulho de trás para a frente (o ponto cresce até virar a bola) e a bola estourando aberta.
 */
const GESTOS_LARVA: Record<EstadoLarvaVisivel, readonly PoseLarva[]> = {
  sai: [...filaLarva('mergulha', 8, 0), ...filaLarva('sai', 0, 8)],
  poe: filaLarva('poe', 0, 16),
  tranco: filaLarva('tranco', 0, 16),
  perfura: filaLarva('perfura', 0, 16),
  mergulha: filaLarva('mergulha', 0, 8),
};
const DURACAO_LARVA = { sai: 'saiS', poe: 'poeS', tranco: 'trancoS', perfura: 'perfuraS', mergulha: 'mergulhaS' } as const;

/** O quadro da Larva aos `t` segundos do estado; `null` = não se desenha (só o buraco existe, ou ela já foi). */
export function larvaQuadro(estado: EstadoLarva, t: number): { clipe: ClipeLarva; quadro: number } | null {
  if (estado === 'abre' || estado === 'foi') return null;
  const fila = GESTOS_LARVA[estado];
  const k = Math.min(fila.length - 1, Math.max(0, Math.floor((t / ELITES.larva[DURACAO_LARVA[estado]]) * fila.length)));
  return { clipe: fila[k][0], quadro: fila[k][1] };
}

/** As bordas do vão numa coluna da tela (y de tela). */
export interface Vao {
  teto: number;
  chao: number;
}

/**
 * O próximo POSTO da Larva: x na metade direita, y DENTRO do vão daquele x (com margem), e longe da altura do anterior
 * — o ziguezague. Sem sorte em 8 sorteios (ou com o vão curto), vai à ponta da faixa mais longe do anterior.
 */
export function larvaPosto(sorte: () => number, yAnterior: number | null, vaoEm: (x: number) => Vao): { x: number; y: number } {
  const L = ELITES.larva;
  const x = Math.round(L.postoX[0] + sorte() * (L.postoX[1] - L.postoX[0]));
  const v = vaoEm(x);
  const lo = v.teto + L.postoMargem;
  const hi = Math.max(lo, v.chao - L.postoMargem);
  let y = lo + sorte() * (hi - lo);
  for (let i = 0; i < 8 && yAnterior !== null && Math.abs(y - yAnterior) < L.postoDistY; i++) y = lo + sorte() * (hi - lo);
  if (yAnterior !== null && Math.abs(y - yAnterior) < L.postoDistY) y = Math.abs(lo - yAnterior) > Math.abs(hi - yAnterior) ? lo : hi;
  return { x, y: Math.round(y) };
}

/** Os rumos das `n` pupas de uma parada: um leque curto em volta de `base` (a direção da nave). */
export function pupaAngulos(base: number, n: number = ELITES.larva.pupasPorParada): number[] {
  const leque = (ELITES.larva.pupaLequeGraus * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => (n === 1 ? base : base - leque + (2 * leque * i) / (n - 1)));
}

/** Quanto a pupa já voou (px) aos `t` segundos: rápida no começo, assentando — e PARA. */
export function pupaVoo(t: number): number {
  const P = ELITES.pupa;
  const k = Math.min(1, Math.max(0, t / P.vooS));
  return P.vooPx * (1 - (1 - k) ** 2);
}

/** O quadro da pupa (0 apagada, 1 acesa): pulsa cada vez mais rápido até eclodir — o relógio que o jogador lê. */
export function pupaQuadro(t: number): 0 | 1 {
  const P = ELITES.pupa;
  const bate = t < P.eclodeS * 0.5 ? 0.5 : t < P.eclodeS * 0.8 ? 0.25 : 0.1;
  return (Math.floor(Math.max(0, t) / bate) % 2) as 0 | 1;
}

export const pupaEclode = (t: number): boolean => t >= ELITES.pupa.eclodeS;

/** A mosca persegue enquanto a nave está à frente dela; passou, segue reto e sai da tela (§2.2). */
export const moscaPersegue = (x: number, alvoX: number): boolean => x > alvoX;

/** O TREMOR da pupa (§9.2): 0 até faltarem `tremeS` para eclodir; depois ±1px, alternando cada vez mais rápido. */
export function pupaTremor(t: number): -1 | 0 | 1 {
  const P = ELITES.pupa;
  const desde = t - (P.eclodeS - P.tremeS);
  if (desde < 0 || t >= P.eclodeS) return 0;
  const passo = P.tremePassoS[0] + (P.tremePassoS[1] - P.tremePassoS[0]) * (desde / P.tremeS);
  return Math.floor(desde / passo) % 2 ? 1 : -1;
}

/** O TREMOR da mosca (§9.6): a aceleração LATERAL (px/s², perpendicular ao rumo) aos `t` s, com a fase e o ritmo dela. */
export const moscaTremor = (t: number, fase: number, hz: number): number =>
  ELITES.mosca.tremorAcel * Math.sin(2 * Math.PI * hz * t + fase);

/**
 * O quadro assado do BURACO aos `t` segundos da fase: `abre` = os quadros 0–4, e fica no 4; `fecha` = a boca volta
 * (2, 1, 0), depois a cicatriz (5–8) perdendo pixels; `null` = sumiu.
 */
export function buracoQuadro(fase: 'abre' | 'fecha', t: number): number | null {
  const B = ELITES.buraco;
  if (fase === 'abre') return Math.min(4, Math.max(0, Math.floor((t / B.abreS) * 5)));
  if (t < B.fechaS) return 2 - Math.min(2, Math.max(0, Math.floor((t / B.fechaS) * 3)));
  const u = (t - B.fechaS) / B.cicatrizS;
  return u < 1 ? 5 + Math.floor(u * 4) : null;
}

export type EstadoTubo = 'aguarda' | 'rola' | 'incha' | 'pulsa';

/** A distância (px) da coordenada de mundo `xMundo` à emenda de placas mais próxima — a parede tem degrau ali. */
export function distEmenda(xMundo: number): number {
  const placa = ELITES.tubo.placa;
  const m = ((xMundo % placa) + placa) % placa;
  return Math.min(m, placa - m);
}

/** O plantio das mesas do corredor: falta `timer` s para a próxima, nasce uma a cada `rate` s (0 = nenhuma), a `vel` px/s. */
export interface PlantioMesas {
  timer: number;
  rate: number;
  vel: number;
}

/**
 * O Tubo CABE na parede agora, na coluna de mundo `xMundo`? Longe da emenda de duas placas e ENTRE duas mesas: a
 * anterior já andou `(rate − timer) × vel` desde que nasceu em `mesaX`, e a seguinte nasce lá daqui a `timer` s.
 */
export function tuboCabe(xMundo: number, mesas: PlantioMesas): boolean {
  const T = ELITES.tubo;
  if (distEmenda(xMundo) < T.largura / 2 + T.folgaEmenda) return false;
  if (mesas.rate <= 0) return true;
  const folga = T.larguraMesa / 2 + T.largura / 2 + T.folgaMesa;
  const d = T.nasceX - T.mesaX;
  return (mesas.rate - mesas.timer) * mesas.vel + d >= folga && mesas.timer * mesas.vel - d >= folga;
}

/** O ciclo do Tubo plantado (§3): rola com a parede; ao chegar ao ponto do pulso, INCHA e PULSA. `pulsos` = os já dados. */
export function tuboAvanca(estado: EstadoTubo, t: number, x: number, pulsos: number): EstadoTubo {
  const T = ELITES.tubo;
  if (estado === 'rola') return pulsos < T.pulsos && x <= T.pulsoX[pulsos] ? 'incha' : estado;
  if (estado === 'incha') return t >= T.inchaS ? 'pulsa' : estado;
  if (estado === 'pulsa') return t >= T.pulsaS ? 'rola' : estado;
  return estado;
}

/** O quadro do clipe `pulso` (17 quadros): 0 = fechado; 0–9 incha; 10–16 estala e assenta. */
export function tuboQuadro(estado: EstadoTubo, t: number): number {
  const T = ELITES.tubo;
  if (estado === 'incha') return Math.min(9, Math.max(0, Math.floor((t / T.inchaS) * 10)));
  if (estado === 'pulsa') return 10 + Math.min(6, Math.max(0, Math.floor((t / T.pulsaS) * 7)));
  return 0;
}

// ── A RODADA DE 14/10 (spec F4 §9) ──

/** Um esporo do pulso: o rumo (rad; na tela o y cresce para baixo), a velocidade de saída, a freada e o atraso no sopro. */
export interface SoltaEsporo {
  ang: number;
  vel: number;
  freiaS: number;
  atrasoS: number;
}

/**
 * A NUVEM de um pulso (calibragem de 14/10, o desenho dele): `esporosN` esporos para dentro do corredor — no chão
 * sobem, no teto descem — num cone de ±`coneGraus`. Cada um cai numa FATIA do cone, numa posição sorteada dentro dela
 * (espalhados sem bolo nem arco), com a velocidade, a freada e o atraso dele sorteados: param em alturas diferentes e
 * não saem no mesmo quadro.
 */
export function esporosDoPulso(teto: boolean, sorte: () => number): SoltaEsporo[] {
  const E = ELITES.esporo, N = ELITES.tubo.esporosN;
  const base = teto ? Math.PI / 2 : -Math.PI / 2;
  const cone = (E.coneGraus * Math.PI) / 180;
  const faixa = (f: readonly [number, number]): number => f[0] + (f[1] - f[0]) * sorte();
  return Array.from({ length: N }, (_, i) => ({
    ang: base + (((i + sorte()) / N) * 2 - 1) * cone,
    vel: faixa(E.vel),
    freiaS: faixa(E.freiaS),
    atrasoS: sorte() * E.soproS,
  }));
}

/** Quanto o ESPORO já andou no rumo dele (px) aos `t` s: sai a `vel` e FREIA até parar em `freiaS`. */
export function esporoAvanco(t: number, vel: number, freiaS: number): number {
  const k = Math.min(1, Math.max(0, t / freiaS));
  return ((vel * freiaS) / 2) * (1 - (1 - k) ** 2);
}

/** O BALANÇO do esporo (§9.2): um laço lento de até `balancoPx` em x e em y. `fase` e `periodo` são de cada esporo. */
export function esporoBalanco(t: number, fase: number, periodo: number): { dx: number; dy: number } {
  const A = ELITES.esporo.balancoPx;
  const w = (2 * Math.PI) / periodo;
  return { dx: A * Math.sin(w * t + fase), dy: A * Math.cos(w * 0.77 * t + fase) };
}

/** A opacidade do esporo: inteiro até os últimos `someS`, e some ao longo deles. */
export const esporoAlfa = (t: number): number => {
  const E = ELITES.esporo;
  return Math.max(0, Math.min(1, (E.vidaS - t) / E.someS));
};

export const esporoVivo = (t: number): boolean => t < ELITES.esporo.vidaS;

/** A LENTIDÃO (§9.3): um toque em `agora` (ms) faz ela durar até `agora + duracaoS`. RENOVA, nunca soma. */
export const lentidaoAte = (agora: number, ateAtual: number): number =>
  Math.max(ateAtual, agora + ELITES.lentidao.duracaoS * 1000);

/** O fator na velocidade máxima da nave: `lentidao.velocidade` enquanto lenta, 1 fora disso. */
export const fatorDeVelocidade = (agora: number, lentaAte: number): number =>
  agora < lentaAte ? ELITES.lentidao.velocidade : 1;

/** Um lugar onde o buraco da Larva pode abrir: um ponto na face da borda ou de uma mesa (y de tela). */
export interface LugarDeBuraco {
  x: number;
  y: number;
}

/**
 * Onde o buraco abre (§9.5): só num dos `lugares` (a borda ou uma mesa, já filtrados por quem chama). Na CHEGADA,
 * sorteado; na SAÍDA, o mais perto de `perto` (onde ela está). Nenhum lugar: `null`.
 */
export function escolherLugar<T extends LugarDeBuraco>(lugares: readonly T[], sorte: () => number, perto?: { x: number; y: number }): T | null {
  if (!lugares.length) return null;
  if (!perto) return lugares[Math.min(lugares.length - 1, Math.floor(sorte() * lugares.length))];
  const d = (l: T): number => Math.hypot(l.x - perto.x, l.y - perto.y);
  return lugares.reduce((a, b) => (d(b) < d(a) ? b : a));
}
