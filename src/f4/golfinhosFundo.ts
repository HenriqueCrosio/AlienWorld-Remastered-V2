/**
 * OS GOLFINHOS AO FUNDO DA CÂMARA B (09/11, bloco H, rodada 2). A escolha dele, depois da 1ª folha: *"vai ser o B (dois)
 * só que eles vão chegar da extrema direita e cruzar a tela em diagonal até a parte de baixo, como eles estarão no layer
 * mais atrás, eles vão sumir atrás dos assets do cenario, borda etc. mas quero a silhueta deles nadando iguais a um
 * golfinho e mais rápido do que está, faça pequenas bolhas de rastro quando passarem"*.
 *
 * Só cenário (sem corpo, sem dano, fora de todo grupo). Pura (testável no node); a casca é `camadaGolfinhos.ts`.
 * - **O relógio é o do DUELO** (s desde que o golfinho nasceu): a câmara só tem água com ele vivo — ela drena na morte —
 *   e a fase fica presa em 49,5 enquanto ele vive. A 1ª passagem aos 7 s (depois do aviso e do X), a 2ª aos 22 s.
 * - **O nado de golfinho:** o caminho ONDULA para cima e para baixo em volta da diagonal (o mergulho), o nariz segue a
 *   curva (a vista girada mais próxima, assada em 5° — `scripts/_h/_golfinhos-fundo.mjs`), e o rabo bate rápido (o nado
 *   aprovado a 14 quadros/s). A dupla nada fora de fase, o menor um pouco atrás.
 * - **As bolhas:** saem do rabo, sobem devagar (aqui é ÁGUA: a bolha sobe), balançam e somem em ~1,3 s.
 */
export interface FolhaGolfinhos {
  chave: string;
  bolhas: string;
  larguras: readonly number[];
  angulos: readonly number[];
  quadros: number;
  celula: number;
}

/** Espelha `scripts/_h/_golfinhos-fundo.mjs`. */
export const FOLHA_GOLFINHOS: FolhaGolfinhos = {
  chave: 'golfinhoFundo',
  bolhas: 'bolhaAgua',
  larguras: [15, 20],
  angulos: Array.from({ length: 19 }, (_, k) => -75 + 5 * k),
  quadros: 9,
  celula: 26,
};

export interface Nadador {
  /** quando entra (s do duelo) e quanto leva da borda direita à de baixo */
  t0: number;
  dur: number;
  /** o centro do corpo: de (fora da tela, à direita), o ponto de controle da curva e até (fora da tela, embaixo) */
  de: readonly [number, number];
  meio: readonly [number, number];
  ate: readonly [number, number];
  /** a linha da folha (0 = 15 px, 1 = 20 px) */
  largura: number;
  /** o mergulho: amplitude (px, perpendicular à diagonal), comprimento de onda (px) e a fase */
  onda: readonly [number, number, number];
}

export const GOLFINHOS = {
  depth: -95,
  /** o rabo bate a 14 quadros/s (era 6: *"mais rápido do que está"*) */
  fps: 14,
  /**
   * as duas passagens da dupla: o grande na frente, o menor 0,35 s atrás e um pouco abaixo, fora de fase.
   * ⚠️ UMA DIAGONAL CURVA, E NÃO RETA (o 1º filme da rodada 2): a metade direita da câmara é escura no jogo (luminância
   * 23–41, medida com a água e a Atmosfera) e o claro fica em x 70–250, y 25–130. Reta, a dupla cruzava quase só o
   * escuro e as peças de baixo — sumia sem chegar a ler. Entrando alto pela direita, quase reto, e descendo pelo claro
   * do túnel até a borda de baixo, eles passam o meio do caminho onde se veem.
   */
  passagens: [7, 22].flatMap((t0): Nadador[] => [
    { t0, dur: 3.8, de: [414, 18], meio: [200, 40], ate: [100, 250], largura: 1, onda: [7, 118, 0] },
    { t0: t0 + 0.35, dur: 3.8, de: [424, 34], meio: [212, 58], ate: [116, 266], largura: 0, onda: [6, 104, 1.7] },
  ]),
  bolhas: {
    /** uma a cada `cada` s por golfinho, que vive `vida` s, sobe `sobe` px/s e deriva com a água */
    cada: 0.075,
    vida: [1.0, 1.6] as const,
    sobe: [9, 15] as const,
    deriva: -4,
    /** a fração de anéis (o resto é o ponto de 1 px) */
    aneis: 0.25,
  },
} as const;

export interface PoseGolfinho {
  /** o canto da célula, px inteiros */
  x: number;
  y: number;
  quadro: number;
  /** o centro (para o rabo e o teste) */
  cx: number;
  cy: number;
  /** o rumo (graus, + = horário), o da vista escolhida */
  graus: number;
}

/** O ângulo da vista assada mais próxima de um rumo (graus). */
export function anguloAssado(f: FolhaGolfinhos, graus: number): number {
  let m = 0;
  for (let i = 1; i < f.angulos.length; i++) if (Math.abs(f.angulos[i] - graus) < Math.abs(f.angulos[m] - graus)) m = i;
  return m;
}

/** Onde o nadador `n` está em `t` (s do duelo), ou `null` fora da passagem. */
export function poseGolfinho(n: Nadador, t: number, f = FOLHA_GOLFINHOS, fps: number = GOLFINHOS.fps): PoseGolfinho | null {
  const s = t - n.t0;
  if (s < 0 || s > n.dur) return null;
  // the curve (quadratic Bézier), its length (for the porpoise's wavelength) and its tangent here
  const k0 = s / n.dur, j = 1 - k0;
  const bx = j * j * n.de[0] + 2 * j * k0 * n.meio[0] + k0 * k0 * n.ate[0];
  const by = j * j * n.de[1] + 2 * j * k0 * n.meio[1] + k0 * k0 * n.ate[1];
  const dx = 2 * j * (n.meio[0] - n.de[0]) + 2 * k0 * (n.ate[0] - n.meio[0]);
  const dy = 2 * j * (n.meio[1] - n.de[1]) + 2 * k0 * (n.ate[1] - n.meio[1]);
  const D = Math.hypot(dx, dy) || 1;
  const ux = dx / D, uy = dy / D;
  // the left normal of the travel (pointing up-right for a dive down-left): the porpoise rises and dips along it
  const nx = uy, ny = -ux;
  const comp = Math.hypot(n.meio[0] - n.de[0], n.meio[1] - n.de[1]) + Math.hypot(n.ate[0] - n.meio[0], n.ate[1] - n.meio[1]);
  const ao = k0 * comp;
  const [A, L, ph] = n.onda;
  const k = (2 * Math.PI) / L;
  const off = A * Math.sin(k * ao + ph);
  const cx = bx + nx * off, cy = by + ny * off;
  // the heading = the tangent of the wavy path; the art faces left (180°), so the rotation is heading − 180
  const tx = ux + nx * A * k * Math.cos(k * ao + ph), ty = uy + ny * A * k * Math.cos(k * ao + ph);
  let graus = (Math.atan2(ty, tx) * 180) / Math.PI - 180;
  if (graus < -180) graus += 360;
  const ai = anguloAssado(f, graus);
  const nado = Math.floor(s * fps) % f.quadros;
  return {
    x: Math.round(cx - f.celula / 2),
    y: Math.round(cy - f.celula / 2),
    quadro: ((n.largura * f.angulos.length) + ai) * f.quadros + nado,
    cx, cy, graus: f.angulos[ai],
  };
}

/** Onde fica o rabo (o ponto de onde sai a bolha): atrás do centro, no sentido oposto ao do nariz. */
export function raboDe(p: PoseGolfinho, n: Nadador, f = FOLHA_GOLFINHOS): [number, number] {
  const meia = (f.larguras[n.largura] / 2) * 0.85;
  const a = (p.graus * Math.PI) / 180;
  // the art's tail is +x (it faces −x); rotated by a
  return [p.cx + Math.cos(a) * meia, p.cy + Math.sin(a) * meia];
}

export interface Bolha {
  x: number;
  y: number;
  idade: number;
  vida: number;
  sobe: number;
  fase: number;
  anel: boolean;
}

/** A dupla e o rastro: a cada passo diz onde está cada golfinho e cada bolha. Sorteio próprio (não mexe no do jogo). */
export class CardumeFundo {
  readonly bolhas: Bolha[] = [];
  private semente: number;
  private acumulado: number[] = GOLFINHOS.passagens.map(() => 0);

  constructor(semente = 20261109) {
    this.semente = semente >>> 0;
  }

  private sorte(): number {
    let t = (this.semente = (this.semente + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** `t` = o relógio do duelo (`null` = sem água: nada nasce, as bolhas que existem seguem até sumir). */
  passo(t: number | null, dt: number): PoseGolfinho[] {
    const poses: PoseGolfinho[] = [];
    const B = GOLFINHOS.bolhas;
    GOLFINHOS.passagens.forEach((n, i) => {
      const p = t === null ? null : poseGolfinho(n, t);
      if (!p) { this.acumulado[i] = 0; return; }
      poses.push(p);
      this.acumulado[i] += dt;
      while (this.acumulado[i] >= B.cada) {
        this.acumulado[i] -= B.cada;
        const [rx, ry] = raboDe(p, n);
        this.bolhas.push({
          x: rx + (this.sorte() - 0.5) * 2,
          y: ry + (this.sorte() - 0.5) * 2,
          idade: 0,
          vida: B.vida[0] + this.sorte() * (B.vida[1] - B.vida[0]),
          sobe: B.sobe[0] + this.sorte() * (B.sobe[1] - B.sobe[0]),
          fase: this.sorte() * Math.PI * 2,
          anel: this.sorte() < B.aneis,
        });
      }
    });
    for (let i = this.bolhas.length - 1; i >= 0; i--) {
      const b = this.bolhas[i];
      b.idade += dt;
      if (b.idade >= b.vida) { this.bolhas.splice(i, 1); continue; }
      b.y -= b.sobe * dt;
      b.x += B.deriva * dt + Math.sin(b.idade * 6 + b.fase) * 0.4 * dt * 6;
    }
    return poses;
  }

  /** O alpha de uma bolha: acende rápido e apaga devagar. */
  static alpha(b: Bolha): number {
    const k = b.idade / b.vida;
    return Math.min(1, k * 8) * (1 - k) * 0.85;
  }
}
