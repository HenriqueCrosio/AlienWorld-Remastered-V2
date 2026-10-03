/**
 * A BOMBA DE QUEDA (spec `2026-10-03-bomba-de-queda-design.md`) — os números e a física, sem Phaser (testável em node).
 *
 * Na ATMOSFERA ela se SOLTA da barriga e cai em parábola, herdando a velocidade da nave; o ar freia o `vx` e ela fica
 * para trás aos poucos, como a de avião. No VÁCUO é ARREMESSADA para a frente e segue reta até o pavio (*"explode no
 * sentido que for jogada"*). Quem decide é a ZONA, não a condução: no LEGACY a F2 é vácuo.
 */
export type ZonaBomba = 'atmosfera' | 'vacuo';
export type ModoBomba = 'queda' | 'panico';

export const BOMBA = {
  /**
   * 'panico' DEVOLVE A BOMBA ANTIGA (limpa os tiros, fere todo mundo, 1s invulnerável) — guardada a pedido dele, 03/10:
   * *"guarde o que temos... se ficar ruim a nova mecânica, voltamos à antiga"*. Com as cartas, ela limpava onda fácil.
   */
  modo: 'queda' as ModoBomba,
  raio: 36,
  dano: 12,
  /** A mesma do flap (`FlapController.GRAVITY`): a bomba cai no mesmo mundo que a nave. */
  gravidade: 420,
  /** O ar leva o `vx` (px/s, na tela) até aqui: a bomba vai ficando para trás da nave enquanto cai. */
  freioAlvo: -30,
  /** Fração por segundo que o `vx` anda até o `freioAlvo`. */
  freio: 1.5,
  /** No vácuo, o empurrão para a frente (px/s), somado à velocidade da nave. */
  arremesso: 120,
  pavioMs: 1500,
};

export interface EstadoBomba {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravidade: number;
  freia: boolean;
}

/** Onde e como a bomba nasce: da barriga na atmosfera (sem pavio — explode no solo); à frente no vácuo (com pavio). */
export function lancamento(
  zona: ZonaBomba,
  x: number,
  y: number,
  vx: number,
  vy: number,
): EstadoBomba & { pavioMs: number | null } {
  if (zona === 'atmosfera') return { x, y: y + 6, vx, vy, gravidade: BOMBA.gravidade, freia: true, pavioMs: null };
  return { x: x + 10, y, vx: vx + BOMBA.arremesso, vy, gravidade: 0, freia: false, pavioMs: BOMBA.pavioMs };
}

/** Um passo da física (Euler semi-implícito: a velocidade primeiro, a posição com a velocidade nova). */
export function passo(b: EstadoBomba, dt: number): EstadoBomba {
  const vy = b.vy + b.gravidade * dt;
  const vx = b.freia ? b.vx + (BOMBA.freioAlvo - b.vx) * Math.min(1, BOMBA.freio * dt) : b.vx;
  return { ...b, x: b.x + vx * dt, y: b.y + vy * dt, vx, vy };
}
