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

export type EstadoSentinela = 'rolando' | 'abrir' | 'fogo' | 'fechar' | 'saindo';
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
  if (estado === 'fogo') return t >= S.fogoS ? 'fechar' : 'fogo';
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
export function sentinelaBloqueia(estado: EstadoSentinela, ex: number, ey: number, deX: number, deY: number): boolean {
  if (estado !== 'abrir' && estado !== 'fogo') return false;
  const ang = Math.atan2(deY - ey, deX - ex);
  const desvio = Math.abs(Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)));
  return desvio <= ((ELITES.sentinela.escudoArcoGraus / 2) * Math.PI) / 180;
}

/** O próximo posto: na metade direita, e pelo menos `postoDistY` longe da altura do anterior (até 8 sorteios). */
export function escolherPosto(sorte: () => number, yAnterior: number | null): { x: number; y: number } {
  const S = ELITES.sentinela;
  const x = S.postoX[0] + sorte() * (S.postoX[1] - S.postoX[0]);
  let y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  for (let i = 0; i < 8 && yAnterior !== null && Math.abs(y - yAnterior) < S.postoDistY; i++) {
    y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  }
  return { x, y };
}
