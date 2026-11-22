/**
 * A COLEIRA (spec 2026-11-22-guardiao-coleira-design.md §4): até onde a investida vai, o tranco e a volta. Puro.
 *
 * O alcance é o COMPRIMENTO DOS CABOS: um círculo em volta da âncora no teto. Ele investe na altura mirada e para onde a
 * raiz do cabo-mestre chega a L da âncora — mais alto ou mais baixo que a âncora, o círculo encurta o alcance.
 */
import type { Ponto } from './corda';

/** o x do CORPO em que a raiz (deslocada `raiz` do centro) fica a `L` da âncora, do lado esquerdo, na altura `yCorpo` */
export function xDaParada(ancora: Ponto, raiz: Ponto, L: number, yCorpo: number): number {
  const dy = yCorpo + raiz.y - ancora.y;
  const r2 = L * L - dy * dy;
  if (r2 <= 0) return ancora.x - raiz.x;
  return ancora.x - raiz.x - Math.sqrt(r2);
}

/**
 * Um TRANCO: o corpo passa `passa` px da parada (a inércia) e é puxado de volta em `volta` s; `vibra` é o chute nos
 * cabos, `tremor` a câmera, `molas` quantas vezes ele quica (0 = seco).
 */
export interface Tranco {
  passa: number;
  volta: number;
  vibra: number;
  tremor: number;
  molas: number;
}

/** A seco · B elástico · C vibrante — as três variações mostradas a ele (§10, passo 1) */
export const TRANCOS: Record<'A' | 'B' | 'C', Tranco> = {
  A: { passa: 3, volta: 0.12, vibra: 6, tremor: 0.004, molas: 0 },
  B: { passa: 8, volta: 0.45, vibra: 4, tremor: 0.003, molas: 2 },
  C: { passa: 4, volta: 0.15, vibra: 14, tremor: 0.007, molas: 0 },
};

/** px além da parada (para a esquerda), `t` s depois do tranco */
export function deslocTranco(t: number, tr: Tranco): number {
  if (t <= 0 || t >= tr.volta) return 0;
  const k = t / tr.volta;
  if (tr.molas <= 0) {
    // sobe em ¼ do tempo e volta no resto
    return k < 0.25 ? tr.passa * Math.sin((k / 0.25) * (Math.PI / 2)) : tr.passa * Math.cos(((k - 0.25) / 0.75) * (Math.PI / 2));
  }
  // um seno amortecido: `molas` ciclos dentro do tempo, o 1º pico em `passa`
  const amort = Math.pow(1 - k, 2);
  return tr.passa * amort * Math.sin(k * tr.molas * 2 * Math.PI) * pico(tr.molas);
}

/** a normalização do 1º pico do seno amortecido (medida uma vez por número de molas) */
const picos = new Map<number, number>();
function pico(molas: number): number {
  let p = picos.get(molas);
  if (p === undefined) {
    let m = 0;
    for (let i = 1; i < 400; i++) {
      const k = i / 400;
      m = Math.max(m, Math.pow(1 - k, 2) * Math.sin(k * molas * 2 * Math.PI));
    }
    p = 1 / m;
    picos.set(molas, p);
  }
  return p;
}

/** a volta puxada pelos cabos: rápida no começo, assentando no fim (0 → 1) */
export function voltaElastica(k: number): number {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return 1 - Math.pow(1 - k, 3);
}
