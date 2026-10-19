/**
 * O LETREIRO DE NEON, pixel a pixel (spec `2026-10-19-menu-refeito-design.md` §6.5) — a base B da rodada 7, escolhida
 * por ele (*"a neon que acende, da forma que usou no gif"*). Nasce das letras EXATAS da Silkscreen do jogo (a grafia
 * certa, o W da cabeça do alien): cada pixel da fonte vira P×P pixels do letreiro, e cada pixel do letreiro ocupa
 * 2 px de tela (P = s: nítido em qualquer tela). Tubos de vidro correm pelo contorno de cada letra — borda ciano,
 * núcleo branco —, os ocos grandes (a cara do W) ficam escuros com um brilho por dentro, e aceso o brilho vaza no ar.
 *
 * Módulo puro: `scripts/test-menu-letreiro.mjs` confere que P = 4 reproduz os três estados aprovados, pixel a pixel.
 */

export interface Glifos {
  w: number;
  h: number;
  /** Uma string por linha: `#` aceso, `.` apagado. */
  linhas: readonly string[];
  /** A faixa de colunas de tinta de cada letra (sem os espaços). */
  letras: readonly { ch: string; x0: number; x1: number }[];
}

export type EstadoLetreiro = 'apagado' | 'aceso' | 'olhos';

export interface ImagemLetreiro {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
}

/** A folga em volta das letras (o brilho e o contorno), em pixels do letreiro. */
export const PAD = 6;

type Cor = readonly [number, number, number] | readonly [number, number, number, number];

const BORDA_ACESA: Cor = [40, 200, 232];
const NUCLEO_ACESO: Cor = [214, 252, 255];
const BORDA_APAGADA: Cor = [62, 72, 88];
const NUCLEO_APAGADO: Cor = [100, 114, 134];
const OLHO: Cor = [255, 58, 42];
const OLHO_QUENTE: Cor = [255, 200, 180];

export function pintarLetreiro(g: Glifos, P: number, estado: EstadoLetreiro): ImagemLetreiro {
  const W = g.w * P + 2 * PAD;
  const H = g.h * P + 2 * PAD;
  const aceso = estado !== 'apagado';
  const comOlhos = estado === 'olhos';
  const fonte = (fx: number, fy: number): boolean => fy >= 0 && fy < g.h && fx >= 0 && fx < g.w && g.linhas[fy][fx] === '#';
  const dentro = (x: number, y: number): boolean => x >= PAD && y >= PAD && fonte(Math.floor((x - PAD) / P), Math.floor((y - PAD) / P));

  // A distância de Chebyshev até o outro lado da borda da letra (1 = encostado nela), até 5; 6 = mais longe.
  const D = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lado = dentro(x, y);
      let d = 6;
      busca: for (let r = 1; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && dentro(x + dx, y + dy) !== lado) {
              d = r;
              break busca;
            }
          }
        }
      }
      D[y * W + x] = d;
    }
  }

  // Os OCOS: dentro da letra, além do tubo de 2 px. Só um oco GRANDE fica escuro (a cara do W); os pequenos (os
  // degraus do N) liam como furos, e o tubo os preenche.
  const OCO = new Uint8Array(W * H);
  const visto = new Uint8Array(W * H);
  const limiar = 40 * (P / 4) * (P / 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i0 = y * W + x;
      if (visto[i0] || !dentro(x, y) || D[i0] < 3) continue;
      const fila = [i0];
      const comp: number[] = [];
      visto[i0] = 1;
      while (fila.length) {
        const i = fila.pop()!;
        comp.push(i);
        const cx = i % W;
        const cy = (i - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (visto[n] || !dentro(nx, ny) || D[n] < 3) continue;
          visto[n] = 1;
          fila.push(n);
        }
      }
      if (comp.length >= limiar) for (const i of comp) OCO[i] = 1;
    }
  }

  // Os OLHOS: no rosto do W (a linha 3, as colunas 2 e 4 da letra), meio pixel de fonte cada, um pixel quente.
  const LW = g.letras.find((l) => l.ch === 'W');
  const lado = Math.max(1, Math.round(P / 2));
  const desloc = Math.round(P / 4);
  const olhos = LW ? [LW.x0 + 1, LW.x0 + 3].map((fx) => [PAD + fx * P + desloc, PAD + 2 * P + desloc]) : [];
  const ehOlho = (x: number, y: number): boolean => olhos.some(([ox, oy]) => x >= ox && x < ox + lado && y >= oy && y < oy + lado);
  const pertoOlho = (x: number, y: number): boolean =>
    olhos.some(([ox, oy]) => x >= ox - 1 && x < ox + lado + 1 && y >= oy - 1 && y < oy + lado + 1);
  const olhoQuente = (x: number, y: number): boolean => olhos.some(([ox, oy]) => x === ox && y === oy);

  const cor = (x: number, y: number): Cor | null => {
    const d = D[y * W + x];
    if (comOlhos && ehOlho(x, y)) return olhoQuente(x, y) ? OLHO_QUENTE : OLHO;
    if (dentro(x, y)) {
      if (d === 1) return aceso ? BORDA_ACESA : BORDA_APAGADA;
      if (d === 2 || !OCO[y * W + x]) return aceso ? NUCLEO_ACESO : NUCLEO_APAGADO;
      if (aceso && comOlhos && pertoOlho(x, y)) return [255, 58, 42, 45];
      return aceso ? [20, 110, 130, d === 3 ? 110 : 60] : [10, 12, 18, 150];
    }
    if (aceso) return d === 1 ? [40, 200, 232, 120] : d === 2 ? [40, 200, 232, 64] : d === 3 ? [40, 200, 232, 28] : null;
    return d === 1 ? [6, 8, 12, 210] : null;
  };

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = cor(x, y);
      if (!c) continue;
      const i = (y * W + x) * 4;
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = c.length === 4 ? c[3] : 255;
    }
  }
  return { w: W, h: H, rgba };
}

/** A faixa de colunas de cada letra no letreiro (a divisa no meio do vão: o brilho vai junto com a sua letra). */
export function faixasDasLetras(g: Glifos, P: number): { ch: string; ini: number; fim: number }[] {
  const W = g.w * P + 2 * PAD;
  return g.letras.map((l, i, a) => ({
    ch: l.ch,
    ini: i === 0 ? 0 : Math.round(PAD + ((a[i - 1].x1 + 1 + l.x0) / 2) * P),
    fim: i === a.length - 1 ? W : Math.round(PAD + ((l.x1 + 1 + a[i + 1].x0) / 2) * P),
  }));
}
