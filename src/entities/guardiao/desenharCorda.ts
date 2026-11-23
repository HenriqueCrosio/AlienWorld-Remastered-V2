/**
 * O RASTERIZADOR DA CORDA (spec 2026-11-22-guardiao-coleira-design.md §9): a corda é desenhada na resolução da tela,
 * pixel a pixel, com a TEXTURA do cabo pintado — uma faixa amostrada da arte (`src/data/cordaGuardiao.ts`): o
 * comprimento ao longo da corda escolhe a LINHA da faixa, o deslocamento atravessado escolhe a COLUNA. Nada vetorial,
 * nada esticado: só pixels com as cores do desenho. Puro (escreve num `Uint32Array` no formato do `ImageData`).
 */
import type { Ponto } from './corda';

export interface FaixaCabo {
  largura: number;
  linhas: number[][];
}

/** 0xRRGGBB → o pixel do `ImageData` (ABGR, little-endian), opaco */
const abgr = (c: number): number => (0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)) >>> 0;
const cacheAbgr = new WeakMap<number[][], Uint32Array[]>();

/**
 * Desenha a polilinha `pts` com a faixa, na escala `escala` da arte (0,7 = a do Guardião). `s0` desloca a textura ao
 * longo da corda (a corda que corre pela borda, nas serpentes). `afina` (0–1) estreita a ponta do primeiro ponto (a
 * âncora da coleira, a cabeça da serpente): ao longo da corda inteira, ou só nos primeiros `pontaPx` px.
 */
export function desenharCorda(
  buf: Uint32Array,
  W: number,
  H: number,
  pts: readonly Ponto[],
  faixa: FaixaCabo,
  escala: number,
  s0 = 0,
  afina = 0,
  pontaPx = 0,
): void {
  let linhas = cacheAbgr.get(faixa.linhas);
  if (!linhas) {
    linhas = faixa.linhas.map((l) => Uint32Array.from(l, abgr));
    cacheAbgr.set(faixa.linhas, linhas);
  }
  const larg = Math.max(2, Math.round(faixa.largura * escala));
  const passo = 0.35;
  // o comprimento total, para afinar
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  // DUAS PASSADAS: o CONTORNO primeiro (a largura inteira na cor da borda da linha), depois o MIOLO por cima. Numa
  // passada só, em diagonal, o miolo de uma amostra comia a borda da vizinha e o contorno saía picotado.
  for (const miolo of [false, true]) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) continue;
      const nx = -dy / d, ny = dx / d;
      for (let t = 0; t < d; t += passo) {
        const x = a.x + (dx * t) / d, y = a.y + (dy * t) / d;
        const sAqui = s + t;
        const linha = linhas[Math.floor((sAqui + s0) / escala) % linhas.length];
        // a ponta (s = 0) afina até `1 − afina` da largura: ao longo da corda inteira, ou só nos primeiros `pontaPx`
        const fator = afina > 0 && total > 0 ? 1 - afina * (1 - Math.min(1, sAqui / (pontaPx > 0 ? pontaPx : total))) : 1;
        const w = Math.max(2, Math.round(larg * fator));
        const o0 = miolo ? 2 : 0, o1 = miolo ? w * 2 - 2 : w * 2;
        for (let o = o0; o < o1; o++) {
          const off = (o + 0.5) / 2 - w / 2;
          const X = Math.round(x + nx * off), Y = Math.round(y + ny * off);
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const k = Math.min(linha.length - 1, Math.floor(((o >> 1) + 0.5) * (linha.length / w)));
          buf[Y * W + X] = miolo ? linha[Math.max(1, Math.min(linha.length - 2, k))] : linha[o < w ? 0 : linha.length - 1];
        }
      }
      s += d;
    }
  }
}

/** a faixa num tom mais escuro (k < 1): o corpo da serpente encostado na borda, que não fere (como o cabo da serra) */
export function escurecerFaixa(f: FaixaCabo, k: number): FaixaCabo {
  const e = (c: number): number =>
    (Math.round(((c >> 16) & 0xff) * k) << 16) | (Math.round(((c >> 8) & 0xff) * k) << 8) | Math.round((c & 0xff) * k);
  return { largura: f.largura, linhas: f.linhas.map((l) => l.map(e)) };
}
