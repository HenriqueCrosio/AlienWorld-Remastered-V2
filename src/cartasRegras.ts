/**
 * AS REGRAS PURAS das cartas novas (spec `2026-10-01-catalogo-cartas-design.md` §4) — sem Phaser, testadas em node
 * (`scripts/test-cartas-regras.mjs`). Quem desenha e mexe no mundo é `systems/cartas/*`; aqui mora só a conta.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** EXPLOSÃO MAIOR multiplica o raio de TODA explosão do jogador (§4.1). */
export const FATOR_EXPLOSAO_MAIOR = 1.5;

export function raioDaExplosao(base: number, maior: boolean): number {
  return maior ? Math.round(base * FATOR_EXPLOSAO_MAIOR) : base;
}

/**
 * Os rumos (graus) dos estilhaços do FRAGMENTADO. Com `centro` (o rumo do tiro), um leque de `abertura` graus para a
 * frente — o impacto é direcional (§5.1c, a física dele). Sem rumo (morte, casco, flare, míssil), `n` rumos iguais
 * fechando o círculo.
 */
export function angulosDoLeque(n: number, centro: number | null, abertura = 120): number[] {
  if (centro === null) return Array.from({ length: n }, (_, i) => (i * 360) / n);
  if (n === 1) return [centro];
  return Array.from({ length: n }, (_, i) => centro - abertura / 2 + (i * abertura) / (n - 1));
}

/**
 * ARCO EM CADEIA (§4.1b): de onde o choque nasceu, salta para o mais próximo AINDA NÃO ATINGIDO dentro do `raio` — e
 * dali para o próximo, até `max` saltos. Devolve os ids na ordem dos saltos. Ninguém leva duas vezes (nem a origem).
 */
export function saltosDoArco(
  origem: Ponto & { id: number },
  candidatos: (Ponto & { id: number })[],
  max: number,
  raio: number,
): number[] {
  const usados = new Set<number>([origem.id]);
  const saltos: number[] = [];
  let de: Ponto = origem;
  while (saltos.length < max) {
    let melhor: (Ponto & { id: number }) | null = null;
    let menor = raio * raio;
    for (const c of candidatos) {
      if (usados.has(c.id)) continue;
      const d2 = (c.x - de.x) ** 2 + (c.y - de.y) ** 2;
      if (d2 > menor || (melhor && d2 === menor)) continue;
      menor = d2;
      melhor = c;
    }
    if (!melhor) break;
    usados.add(melhor.id);
    saltos.push(melhor.id);
    de = melhor;
  }
  return saltos;
}

/**
 * O RAIO do Arco em Cadeia, em PIXEL (§4.1b): zigue-zague entre `a` e `b` — um nó a cada ~`passo` px, cada nó do meio
 * deslocado até `desvio` px na perpendicular, e Bresenham entre os nós. Pontos inteiros e vizinhos (8-conexos): é
 * desenho na resolução do jogo, não linha vetorial (memória `efeito-de-cena-assado-em-pixel`) nem sprite esticada.
 * `aleatorio` devolve [0,1); 0,5 = sem desvio.
 */
export function pixelsDoRaio(a: Ponto, b: Ponto, aleatorio: () => number, passo = 6, desvio = 2): Ponto[] {
  const x0 = Math.round(a.x);
  const y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(dist / passo));
  // A perpendicular unitária: o desvio é para os LADOS do raio, nunca para a frente.
  const px = dist ? -(y1 - y0) / dist : 0;
  const py = dist ? (x1 - x0) / dist : 0;
  const nos: Ponto[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const d = i === 0 || i === n ? 0 : (aleatorio() * 2 - 1) * desvio;
    nos.push({ x: Math.round(x0 + (x1 - x0) * t + px * d), y: Math.round(y0 + (y1 - y0) * t + py * d) });
  }
  const pts: Ponto[] = [];
  for (let i = 0; i < nos.length - 1; i++) {
    for (const p of bresenham(nos[i], nos[i + 1])) {
      const u = pts[pts.length - 1];
      if (!u || u.x !== p.x || u.y !== p.y) pts.push(p);
    }
  }
  if (!pts.length) pts.push({ x: x0, y: y0 });
  return pts;
}

function bresenham(a: Ponto, b: Ponto): Ponto[] {
  const pts: Ponto[] = [];
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push({ x, y });
    if (x === b.x && y === b.y) return pts;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * A AURA DO CASCO (§4.3b): o contorno de 1px por FORA da silhueta. Recebe o alfa (`w×h`, um valor por pixel) e
 * devolve uma máscara `(w+2)×(h+2)` — a moldura de 1px a mais é onde cabe o contorno de quem encosta na borda do
 * quadro. Contorno = pixel transparente com um vizinho opaco em cima, embaixo ou do lado (4-vizinhança: o canto não
 * engrossa a linha).
 */
export function contornoDoAlfa(alfa: ArrayLike<number>, w: number, h: number): Uint8Array {
  const W = w + 2;
  const H = h + 2;
  const opaco = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && alfa[y * w + x] > 0;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = x - 1;
      const sy = y - 1;
      if (opaco(sx, sy)) continue;
      if (opaco(sx - 1, sy) || opaco(sx + 1, sy) || opaco(sx, sy - 1) || opaco(sx, sy + 1)) out[y * W + x] = 1;
    }
  }
  return out;
}

/**
 * O RUMO do Dash (03/10, o mapa de teclas): a direção SEGURADA no movimento, em 8 direções e normalizada (a diagonal
 * anda a mesma distância); parado — ou com esquerda e direita juntas —, para a FRENTE. O duplo toque saiu: disparava
 * sem querer em quem corrige a posição rápido, e no analógico nem existe.
 */
export function rumoDoDash(cima: boolean, baixo: boolean, esquerda: boolean, direita: boolean): [number, number] {
  const x = (direita ? 1 : 0) - (esquerda ? 1 : 0);
  const y = (baixo ? 1 : 0) - (cima ? 1 : 0);
  if (!x && !y) return [1, 0];
  const n = Math.hypot(x, y);
  return [x / n, y / n];
}
