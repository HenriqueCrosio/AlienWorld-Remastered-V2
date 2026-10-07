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

export type EstadoCacador = 'escondido' | 'surge' | 'mira' | 'trava' | 'rajada' | 'some' | 'foi';

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
      return t >= C.rajadaS ? 'some' : estado;
    case 'some':
      if (t < C.someS) return estado;
      return sumicos >= C.ressurgimentos ? 'foi' : 'escondido';
    default:
      return 'foi';
  }
}

/** Escondida ela some DE VERDADE (decisão dele, A): nem visível, nem atingível. No SOME ainda fere, até sumir. */
export const cacadorTangivel = (estado: EstadoCacador): boolean => estado !== 'escondido' && estado !== 'foi';

/** A tinta do `n`-ésimo sumiço (1-based): o SOPRO, e a CORTINA no último — a saída de vez (§2.3, decisão dele: A). */
export const tintaDoSumico = (n: number): 'sopro' | 'cortina' => (n >= ELITES.cacador.ressurgimentos ? 'cortina' : 'sopro');

// ── O TENTÁCULO DO CASCO (spec F3 §3 + a regra do casco §3.3) ──

export type EstadoTentaculo = 'aviso1' | 'bote' | 'mergulho' | 'pausa' | 'aviso2' | 'ergue' | 'meiaLua' | 'segura' | 'afunda' | 'foi';

const CICLO_TENTACULO: EstadoTentaculo[] = ['aviso1', 'bote', 'mergulho', 'pausa', 'aviso2', 'ergue', 'meiaLua', 'segura', 'afunda', 'foi'];

/** Um ciclo por aparição (decisão dele: A), na ordem fixa; cada estado dura o seu tempo. */
export function tentaculoAvanca(estado: EstadoTentaculo, t: number): EstadoTentaculo {
  if (estado === 'foi') return 'foi';
  const T = ELITES.tentaculo;
  const dur: Record<Exclude<EstadoTentaculo, 'foi'>, number> = {
    aviso1: T.aviso1S,
    bote: T.boteS,
    mergulho: T.mergulhoS,
    pausa: T.pausaS,
    aviso2: T.aviso2S,
    ergue: T.ergueS,
    meiaLua: T.meiaLuaS,
    segura: T.seguraS,
    afunda: T.afundaS,
  };
  return t < dur[estado] ? estado : CICLO_TENTACULO[CICLO_TENTACULO.indexOf(estado) + 1];
}

/**
 * A RACHADURA 1 (§3.3): nasce À FRENTE da nave, na distância que o chão leva para trazê-la até debaixo dela no fim do
 * aviso — o casco anda a `velChao` e a rachadura é do casco.
 */
export const rachadura1X = (naveX: number, velChao: number): number => naveX + velChao * ELITES.tentaculo.aviso1S;

/** A RACHADURA 2: perto da borda direita, nunca a menos de `rachadura2DistMin` à frente da nave, nunca fora da tela. */
export function rachadura2X(naveX: number): number {
  const T = ELITES.tentaculo;
  return Math.min(T.rachadura2XMax, Math.max(T.rachadura2X, naveX + T.rachadura2DistMin));
}

/**
 * Preso ao casco (anda com o chão): a rachadura dos avisos e a torre de pé. O bote, o mergulho e a pausa são livres na
 * tela — a passagem dos gomos pelo buraco no bote é tratada na corrente, ponto a ponto.
 */
export const tentaculoEnraizado = (estado: EstadoTentaculo): boolean =>
  estado === 'aviso1' || estado === 'aviso2' || estado === 'ergue' || estado === 'meiaLua' || estado === 'segura' || estado === 'afunda';
