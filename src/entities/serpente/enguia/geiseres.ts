/**
 * THE GEYSERS (spec §5; the mock's `geiseres.mjs` ported line by line): she runs under the hull, the bump of the living
 * hull rides over her head; a geyser every ~55 px of the way — a fast warning, the column (~16 px wide, from the crack
 * to y ~70, THROUGH the crest), the steam. The way back's geysers fall BETWEEN the way out's.
 * For the live choreography, `geiseresDoTrecho` gives one `sob` stretch's (the mock's `geiseres` walks them all).
 */
import type { Numeros } from './numeros.ts';
import type { Geiser, Roteiro, Trecho } from './tipos.ts';

// the living hull's crack path: the same seeded walk as `cascoVivo.ts` (the panel's row 168 ±5, little branches every
// 13 columns) — shared by the drawing and the touch
let trilhaMemo: { trilha: Int16Array; ramos: { x: number; y: number }[] } | null = null;
export function trilhaFissura(N: Numeros): { trilha: Int16Array; ramos: { x: number; y: number }[] } {
  if (trilhaMemo) return trilhaMemo;
  const W = N.tela.W, trilha = new Int16Array(W), ramos: { x: number; y: number }[] = [];
  let semente = 20261029;
  const rnd = (): number => {
    semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
    return semente / 4294967296;
  };
  let y = N.geiser.yLombada, passo = 0;
  for (let x = W - 1; x >= 0; x--) {
    if (--passo <= 0) {
      y = Math.max(N.geiser.yLombada - 5, Math.min(N.geiser.yLombada + 5, y + (rnd() < 0.5 ? -1 : 1)));
      passo = 2 + Math.floor(rnd() * 3);
    }
    trilha[x] = y;
    if (x % 13 === 0) {
      const sobe = rnd() < 0.5 ? -1 : 1, n = 2 + Math.floor(rnd() * 3);
      for (let q = 1; q <= n; q++) ramos.push({ x: x - Math.round(q * 0.7), y: y + sobe * q });
    }
  }
  trilhaMemo = { trilha, ramos };
  return trilhaMemo;
}

/** the x of each geyser: the way out from `inicio` every `passo` while ≥ fim + passo/3; the way back on the midpoints */
export function pontosGeiser(G: Numeros['geiser']): { ida: number[]; volta: number[] } {
  const ida: number[] = [];
  for (let x = G.inicio; x >= G.fim + G.passo / 3; x -= G.passo) ida.push(x);
  const volta: number[] = [];
  for (let i = ida.length - 1; i > 0; i--) volta.push((ida[i] + ida[i - 1]) / 2);
  return { ida, volta };
}

/** one `sob` stretch's geysers: when the snout (under the hull) crosses each x */
export function geiseresDoTrecho(R: Roteiro, N: Numeros, tr: Trecho): Geiser[] {
  const G = N.geiser, { ida, volta } = pontosGeiser(G), out: Geiser[] = [];
  if (!tr.sob) return out;
  const xs = tr.sob === 'ida' ? ida : volta;
  const feitos = new Set<number>();
  let antes = R.caminho.ponto(R.estado(tr.t0).s).x;
  for (let t = tr.t0; t <= tr.t1; t += 1 / 240) {
    const x = R.caminho.ponto(R.estado(t).s).x;
    for (const g of xs)
      if (!feitos.has(g) && (antes - g) * (x - g) <= 0 && antes !== x) {
        feitos.add(g);
        out.push({ x: g, ciclo: tr.ciclo, via: tr.sob, tAviso: t, tColuna: t + G.aviso, tFim: t + G.aviso + G.coluna, tVapor: t + G.aviso + G.coluna + G.vapor });
      }
    antes = x;
  }
  return out;
}

/** every geyser of the fight (the mock's `geiseres`) */
export function geiseres(R: Roteiro, N: Numeros): Geiser[] {
  const out: Geiser[] = [];
  for (const tr of R.trechos.filter((t) => t.sob)) out.push(...geiseresDoTrecho(R, N, tr));
  return out;
}

/** the crack behind her (the living hull's R3), as the mock draws it — [{de, ate, cura (0–1)}] */
export function fissuras(R: Roteiro, N: Numeros, t: number): { de: number; ate: number; cura: number }[] {
  const out: { de: number; ate: number; cura: number }[] = [], ate = N.rombo.x0 + 5;
  const idas = R.trechos.filter((tr) => tr.sob === 'ida');
  for (const ida of idas) {
    const volta = R.trechos.find((tr) => tr.sob === 'volta' && tr.ciclo === ida.ciclo);
    if (!volta) continue; // (the live choreography builds the way back with the way out: never missing in a fight)
    if (t < ida.t0 || t > volta.t1 + N.geiser.cura) continue;
    const de = t < ida.t1 ? R.caminho.ponto(R.estado(t).s).x : N.geiser.fim;
    if (de >= ate) continue;
    out.push({ de, ate, cura: t > volta.t1 ? Math.min(1, (t - volta.t1) / N.geiser.cura) : 0 });
  }
  return out;
}

/** the bump's x while she is under the hull (null when she is not) */
export function lombada(R: Roteiro, N: Numeros, t: number): number | null {
  const e = R.estado(t);
  if (!e.trecho.sob) return null;
  const p = R.caminho.ponto(e.s);
  return p.x <= N.rombo.x0 + 10 ? p.x : null;
}
