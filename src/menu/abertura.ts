import { ABERTURA, ACENDE, JATOS, LISTA, REPOUSO, SUBTITULO, TITULO } from './numerosMenu.ts';
import { hash4, suave } from './acaso.ts';

/**
 * A ABERTURA DO MENU como funções puras do relógio (spec `2026-10-19-menu-refeito-design.md` §6): o mesmo instante
 * sempre dá o mesmo quadro — a sonda para o relógio em qualquer ponto e confere (`MenuScene.irPara`).
 *
 * O letreiro é uma NAVE: entra pelo alto já freando, os retrofoguetes queimam o caminho todo (3,8 s, forte e constante,
 * aliviando só no fim), ele passa um pouco do ponto e uma mola o firma; de lado, chega deslocado e outra mola o corrige.
 * Cada bocal dos jatos dispara quando essa aceleração pede o empurrão dele — a física comanda os jatos.
 */

/** Uma mola subamortecida: o deslocamento `s` segundos depois, saindo de `o0` com velocidade `v0`. */
export function amortecida(o0: number, v0: number, periodo: number, z: number): (s: number) => number {
  const w = (2 * Math.PI) / periodo;
  const wd = w * Math.sqrt(1 - z * z);
  const b = (v0 + z * w * o0) / wd;
  return (s) => Math.exp(-z * w * s) * (o0 * Math.cos(wd * s) + b * Math.sin(wd * s));
}

const L = ABERTURA.letreiro;
/** A distância da queima: do alto até 2,5 px além do ponto. */
const DQ = ABERTURA.layout.titulo + L.sobra - L.yIni;
/** A velocidade com que ele entra (a da queima no instante 0). */
const V0 = (L.forma * DQ) / L.queima;
const MOLA_Y = amortecida(L.sobra, 0, L.molaY.periodo, L.molaY.amortecimento);
const MOLA_X = amortecida(L.deriva, 0, L.molaX.periodo, L.molaX.amortecimento);

function yLetreiro(tau: number): number {
  if (tau < 0) return L.yIni + V0 * tau; // antes de entrar: em linha reta, na velocidade da queima (sem salto)
  if (tau < L.queima) return L.yIni + DQ * (1 - Math.pow(1 - tau / L.queima, L.forma));
  return ABERTURA.layout.titulo + MOLA_Y(tau - L.queima);
}

function xLetreiro(tau: number): number {
  return ABERTURA.layout.x + (tau < 0 ? L.deriva : MOLA_X(tau));
}

/** O CENTRO do letreiro em px de jogo, `tau` segundos depois de ele entrar (τ < 0: ainda acima da tela). */
export function posicaoLetreiro(tau: number): { x: number; y: number } {
  return { x: xLetreiro(tau), y: yLetreiro(tau) };
}

const H = 0.004;

export function velocidadeLetreiro(tau: number): { vx: number; vy: number } {
  return {
    vx: (xLetreiro(tau + H) - xLetreiro(tau - H)) / (2 * H),
    vy: (yLetreiro(tau + H) - yLetreiro(tau - H)) / (2 * H),
  };
}

/** A aceleração (px/s²). Antes de entrar é zero: ele ainda não ligou os jatos. */
export function aceleracaoLetreiro(tau: number): { ax: number; ay: number } {
  if (tau < 0) return { ax: 0, ay: 0 };
  return {
    ax: (xLetreiro(tau + H) - 2 * xLetreiro(tau) + xLetreiro(tau - H)) / (H * H),
    ay: (yLetreiro(tau + H) - 2 * yLetreiro(tau) + yLetreiro(tau - H)) / (H * H),
  };
}

export interface Particula {
  x: number;
  y: number;
  /** O lado do quadradinho, em px de jogo. */
  tam: number;
  cor: number;
  alfa: number;
}

/**
 * O gás dos jatos no instante `t` (relógio da abertura). A emissão mora numa grade fixa de 60 Hz e o acaso sai de um
 * hash de (instante, bocal, partícula): é uma função PURA do tempo. Cada partícula sai quente (branca), vira chama
 * (âmbar) e depois vapor frio que cresce, freia no ar, herda parte da velocidade do letreiro e deriva com o vento.
 */
export function particulasDosJatos(t: number): Particula[] {
  const out: Particula[] = [];
  const fim = L.t0 + L.queima + L.fimJatos;
  const refQueima = JATOS.aRef * Math.pow(JATOS.queimaAprovada / L.queima, 2);
  for (let j = Math.max(0, Math.floor((t - JATOS.vida[1]) * 60)); j <= Math.floor(t * 60); j++) {
    const te = j / 60;
    const tau = te - L.t0;
    if (tau < 0 || te > fim) continue;
    const { ax, ay } = aceleracaoLetreiro(tau);
    const { x: cx, y: cy } = posicaoLetreiro(tau);
    const { vx, vy } = velocidadeLetreiro(tau);
    JATOS.bicos.forEach(([dx, dy, ux, uy, peso], b) => {
      // A queima longa e suave mantém a pluma aprovada (rodada 7): a referência vertical escala com ela.
      const ref = uy !== 0 && tau < L.queima ? refQueima : JATOS.aRef;
      const forca = Math.min(JATOS.teto, Math.max(0, -(ax * ux + ay * uy)) / ref);
      const qtd = Math.floor((forca * JATOS.taxa * peso) / 60 + hash4(j, b, 0, 1));
      for (let k = 0; k < qtd && out.length < JATOS.max; k++) {
        const r = (c: number): number => hash4(j, b, k + 1, c);
        const vida = JATOS.vida[0] + r(1) * (JATOS.vida[1] - JATOS.vida[0]);
        const idade = t - te;
        if (idade < 0 || idade >= vida) continue;
        const ang = Math.atan2(uy, ux) + (r(2) - 0.5) * JATOS.abre;
        const v = JATOS.vel[0] + r(3) * (JATOS.vel[1] - JATOS.vel[0]);
        const d = JATOS.arrasto * (1 - Math.exp(-idade / JATOS.arrasto)); // quanto uma velocidade unitária andou, com o arrasto do ar
        const f = idade / vida;
        out.push({
          x: cx + dx + (r(4) - 0.5) * JATOS.espalho[0] + (Math.cos(ang) * v + vx * JATOS.herda) * d + JATOS.deriva[0] * idade,
          y: cy + dy + (r(5) - 0.5) * JATOS.espalho[1] + (Math.sin(ang) * v + vy * JATOS.herda) * d + JATOS.deriva[1] * idade,
          tam: idade < JATOS.quente ? 0.75 : idade < JATOS.chama ? 1 : 1 + f,
          cor: idade < JATOS.quente ? JATOS.cores.quente : idade < JATOS.chama ? JATOS.cores.chama : JATOS.cores.vapor,
          alfa: idade < JATOS.chama ? 1 : 0.6 * Math.pow(1 - f, 1.5),
        });
      }
    });
  }
  return out;
}

const MOLA_LISTA = amortecida(-LISTA.queda, 0, LISTA.periodo, LISTA.amortecimento);

/** A linha `i` da lista: quanto falta descer (px) e o quanto já apareceu. Em formação, 0,08 s uma da outra. */
export function quedaLista(i: number, t: number): { dy: number; alfa: number } {
  const tau = t - (LISTA.t0 + i * LISTA.passo);
  return { dy: tau <= 0 ? -LISTA.queda : MOLA_LISTA(tau), alfa: suave(0, LISTA.fade, tau) };
}

/** A lista inteira pousou: o menu aceita teclas. */
export const T_LISTA_POUSA = LISTA.t0 + 2 * LISTA.passo + LISTA.assenta;

/** No repouso: o item do cursor pisca (1 → 0,4), os outros ficam a 0,7. */
export function alfaItem(selecionado: boolean, t: number, tCursor: number, pousado: boolean): number {
  if (!selecionado) return REPOUSO.outros;
  if (!pousado) return 1;
  return 1 - ((1 - REPOUSO.piscaMin) / 2) * (1 - Math.cos((2 * Math.PI * (t - tCursor)) / REPOUSO.piscaPeriodo));
}

/** Uma luz que acende com a falha das janelas: acesa, apagada, e acesa de vez. */
export function acesa(ti: number, t: number): boolean {
  const d = t - ti;
  return d >= ACENDE.apagadaAte || (d >= 0 && d < ACENDE.acesaAte);
}

const letras = (s: string): number => [...s].filter((c) => c !== ' ').length;
export const T_SUB = ACENDE.t0 + letras(TITULO) * ACENDE.porLetra + ACENDE.subDepois;
export const T_ACESO = T_SUB + letras(SUBTITULO) * ACENDE.subPorLetra + ACENDE.subDepois;
export const T_OLHOS = T_ACESO + ACENDE.olhos;
/** A abertura acabou: pular leva o relógio para cá. */
export const T_FIM = T_OLHOS + ACENDE.apagadaAte + 0.1;

export const letraAcesa = (i: number, t: number): boolean => acesa(ACENDE.t0 + i * ACENDE.porLetra, t);
export const subAcesa = (i: number, t: number): boolean => acesa(T_SUB + i * ACENDE.subPorLetra, t);
export const olhosAcesos = (t: number): boolean => acesa(T_OLHOS, t);

/** Aceso inteiro, o letreiro respira (1 → 0,82). */
export function respiracao(t: number): number {
  if (t <= T_ACESO) return 1;
  return 1 - ((1 - REPOUSO.respiraMin) / 2) * (1 - Math.cos((2 * Math.PI * (t - T_ACESO)) / REPOUSO.respira));
}

/** O véu preto que revela o cenário. */
export const alfaVeu = (t: number): number => 1 - suave(0, ABERTURA.veu, t);

/** A janela sem relâmpago: da entrada do letreiro até os olhos acenderem (a menos que a abertura tenha sido pulada). */
export const quieto = (t: number, pulou: boolean): boolean => !pulou && t >= L.t0 && t <= T_OLHOS + 0.1;
