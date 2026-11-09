import { BAYER, pintor, type RGB } from './pixel.ts';

/**
 * A ENGUIA EM CILINDRO (09/11, bloco H, rodada 2). A 1ª tentativa — a arte da enguia reduzida e dobrada — ele reprovou:
 * *"A enguia que tomou como base está muito engessada e feia, sem movimento. Quero que crie um cilindro que 'nada' igual
 * uma serpente.... ela vai passar rápido mesmo, da borda de baixo até diagonalmente sair no canto superior direito."*
 * (e, se não der, *"vamos descartá-la"*).
 *
 * Só cenário, no Ato 1 da F3. Pura: desenha num RGBA de tela (a casca é `camadaEnguia.ts`).
 * - **O nado de serpente:** a cabeça corre uma reta da borda de baixo ao canto de cima à direita, e o corpo é uma ONDA
 *   lateral que cresce da cabeça para a cauda e anda para trás pelo corpo um pouco mais rápido que ela avança (o
 *   "escorregar" de quem nada: na água/no vazio a onda não fica parada no mundo como a de uma cobra no chão).
 * - **O cilindro:** cada fatia do corpo é sombreada como um tubo (a luz vem de cima, à esquerda), em poucos tons
 *   pontilhados — o pontilhado e os anéis são do CORPO (u, v), então andam com ela em vez de ferver na tela. Um fio de
 *   aro frio no topo, a cabeça um pouco mais grossa com o olho ciano, a goela laranja, a cauda afinando até a barbatana
 *   ciano (as luzes dela, a 62% como na 1ª rodada).
 */
export interface FormaEnguia {
  /** comprimento (px ao longo do corpo) e o raio do tronco */
  comprimento: number;
  raio: number;
  /** os anéis (as costuras escuras a cada `aneis` px) e o fio laranja entre eles na barriga */
  aneis: number | null;
  brasa: boolean;
}

export interface CaminhoEnguia {
  t0: number;
  dur: number;
  /** a entrada da cabeça (logo abaixo da borda de baixo) e o rumo (o canto de cima à direita, fora da tela) */
  de: readonly [number, number];
  ate: readonly [number, number];
  /** a amplitude da onda na cauda (px), o comprimento de onda (px), e o escorregar (a onda anda para trás pelo corpo a
   *  `1 / escorrega` da velocidade dela) */
  amp: number;
  lambda: number;
  escorrega: number;
}

export interface ConceitoEnguia {
  forma: FormaEnguia;
  caminho: CaminhoEnguia;
  depth: number;
}

// a paleta (dark sci-fi: o casco escuro dela, luz só onde há energia), já afundada no tom da nuvem do Ato 1.
// ⚠️ 09/11 (rodada 3), ele: *"mais escura"* — toda a rampa ~0,7× da rodada 2 (os tons, o aro e as luzes juntos, para o
// equilíbrio entre eles ficar o mesmo), e afundada para uma noite mais escura que a nuvem (a de antes erguia os pretos).
const NOITE: RGB = [10, 13, 26];
const TONS: RGB[] = [[4, 5, 9], [9, 11, 17], [18, 21, 30], [30, 35, 47], [46, 52, 67]];
const ARO: RGB = [66, 78, 100];
const COSTURA: RGB = [2, 3, 6];
const BRASA: RGB = [92, 40, 18];
const CIANO: RGB = [30, 100, 112];
const OLHO: RGB = [50, 132, 142];
const GOELA: RGB = [116, 60, 22];
const afunda = (c: RGB, k = 0.3): RGB => [0, 1, 2].map((i) => Math.round(c[i] * (1 - k) + NOITE[i] * k)) as unknown as RGB;

/**
 * A ENGUIA ESCOLHIDA (09/11, rodada 3): a B da rodada 2 — o tubo com os ANÉIS dela (as costuras a cada 7 px e o fio
 * laranja na barriga), 210 × 12 px. Ele: *"A enguia com a opção B, mas quero ela mais escura e passando mais rápido"*.
 * Sai da borda de baixo (x 70) aos 19 s e some no canto de cima à direita em 2,6 s (era 3,6: ~240 px/s, era ~175).
 * Depois da 1ª lula, com os kamikazes de 20 por perto e fora antes dos batedores de 24 (a 1ª rodada achou a briga com
 * eles na mesma faixa). A e C (o tubo liso, a maior) saíram com a escolha.
 */
export const ENGUIA: ConceitoEnguia = {
  forma: { comprimento: 210, raio: 6, aneis: 7, brasa: true },
  caminho: { t0: 19, dur: 2.6, de: [70, 228], ate: [410, -20], amp: 11, lambda: 128, escorrega: 0.72 },
  depth: -88,
};

/** O raio do corpo a `u` px da ponta do focinho: o focinho arredondado, o crânio, o pescoço, o tronco e a cauda. */
export function raioEm(f: FormaEnguia, u: number): number {
  const L = f.comprimento, R = f.raio;
  if (u < 0 || u > L) return 0;
  const sm = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const cab = R * 1.9; // the head is ~2 radii long … scaled with the body
  if (u < cab) return R * (0.45 + 0.8 * sm(0, cab * 0.7, u));      // snout → skull (1.25 R)
  if (u < cab * 1.8) return R * (1.25 - 0.35 * sm(cab, cab * 1.8, u)); // skull → neck (0.9 R)
  const k = u / L;
  if (k < 0.55) return R * (0.9 + 0.1 * sm(cab * 1.8 / L, 0.3, k));
  return R * Math.max(0.12, 1 - 0.88 * sm(0.55, 1, k));             // the tail thins to a point
}

/** A espinha: o ponto e a direção do corpo a `u` px da cabeça, em `t`. `null` antes/depois da passagem. */
export function espinha(c: ConceitoEnguia, t: number, u: number): { x: number; y: number; tx: number; ty: number } | null {
  const p = c.caminho, s = t - p.t0;
  if (s < 0 || s > p.dur) return null;
  const dx = p.ate[0] - p.de[0], dy = p.ate[1] - p.de[1], D = Math.hypot(dx, dy);
  const ux = dx / D, uy = dy / D, nx = -uy, ny = ux;
  // the head runs the whole line PLUS the body length, so the tail also leaves the screen
  const total = D + c.forma.comprimento;
  const v = total / p.dur;
  const cabeca = s * v;
  const ao = (q: number) => {
    const a = cabeca - q; // along-line position of body point q
    const amp = p.amp * (0.3 + 0.7 * (q / c.forma.comprimento));
    // the wave travels back along the body at v / escorrega; in the world it drifts back at v (1/e − 1)
    const fase = (2 * Math.PI) / p.lambda * (a + v * (1 / p.escorrega - 1) * s);
    return [p.de[0] + ux * a + nx * amp * Math.sin(fase), p.de[1] + uy * a + ny * amp * Math.sin(fase)];
  };
  const [x, y] = ao(u), [x2, y2] = ao(u + 0.5);
  const tl = Math.hypot(x - x2, y - y2) || 1;
  return { x, y, tx: (x - x2) / tl, ty: (y - y2) / tl };
}

/** A luz (vem de cima, à esquerda, e um pouco da frente): o tom 0–4 de um ponto da seção do tubo. */
const LUZ = (() => { const l = [-0.4, -0.75, 0.55]; const n = Math.hypot(...l); return l.map((v) => v / n); })();

/**
 * Desenha a enguia em `t` num RGBA `w × h` de tela (topo em y0). Devolve se desenhou algo (para a casca não subir uma
 * textura vazia). Pinta a cauda primeiro e a cabeça por último (o crânio por cima do pescoço).
 */
export function desenharEnguia(out: Uint8ClampedArray, w: number, h: number, y0: number, c: ConceitoEnguia, t: number): boolean {
  const f = c.forma, put = pintor(out, w, h, y0);
  if (!espinha(c, t, 0)) return false;
  // a coverage mask for the rim pass (screen pixels this frame), and the bbox
  const ocupado = new Uint8Array(w * h);
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1, algum = false;
  const marca = (x: number, y: number, cor: RGB, luz = false) => {
    const X = Math.round(x), Y = Math.round(y) - y0;
    if (X < 0 || Y < 0 || X >= w || Y >= h) return;
    put(x, y, cor);
    ocupado[Y * w + X] = luz ? 2 : 1;
    algum = true;
    if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Y < by0) by0 = Y; if (Y > by1) by1 = Y;
  };
  const L = f.comprimento, cab = f.raio * 1.9;
  for (let u = L; u >= 0; u -= 0.5) {
    const e = espinha(c, t, u)!;
    const r = raioEm(f, u);
    if (r <= 0) continue;
    // the left normal of the body (with her heading up-right it points up-left: the lit side)
    const nx = -e.ty, ny = e.tx;
    const ladoLuz = nx * LUZ[0] + ny * LUZ[1] >= 0 ? 1 : -1;
    for (let v = -r; v <= r; v += 0.5) {
      const q = v / r;
      // the tube's surface normal at this slice (in the screen plane + toward the viewer)
      const z = Math.sqrt(Math.max(0, 1 - q * q));
      // (the PHYSICAL normal: the +n side is +q; `ladoLuz` only tells which of the two is the lit one)
      const sx = nx * q, sy = ny * q;
      const luz = Math.max(0, sx * LUZ[0] + sy * LUZ[1] + z * LUZ[2]);
      // body-space dither: the pattern travels with her
      const lim = BAYER[((Math.floor(u) & 3) << 2) | (Math.floor(v + r) & 3)];
      const tom = Math.min(TONS.length - 1, Math.floor(luz * (TONS.length - 0.6) + lim * 0.9));
      let cor: RGB = TONS[Math.max(0, tom)];
      let acesa = false;
      const barriga = q * ladoLuz < -0.45;
      if (f.aneis && u > cab * 1.4 && u < L * 0.86) {
        const m = u % f.aneis;
        if (m < 1) cor = COSTURA;
        else if (f.brasa && barriga && m > f.aneis * 0.35 && m < f.aneis * 0.65 && lim > 0.35) cor = BRASA;
      }
      if (u > L * 0.86 && lim < 0.55) { cor = CIANO; acesa = true; }               // the cyan fin
      if (u < cab && u > cab * 0.15 && Math.abs(q * ladoLuz - 0.32) < 0.2 && Math.abs(u - cab * 0.32) < 0.9) { cor = OLHO; acesa = true; }
      if (u < cab * 0.55 && Math.abs(q * ladoLuz + 0.12) < 0.12) cor = COSTURA;  // the mouth line
      if (Math.abs(u - cab * 0.62) < 0.8 && Math.abs(q * ladoLuz + 0.3) < 0.18) { cor = GOELA; acesa = true; }
      marca(e.x + nx * v, e.y + ny * v, afunda(cor), acesa);
    }
  }
  if (!algum) return false;
  // the cold rim: every body pixel with nothing right above it (the top edge on screen), only on the lit half
  for (let Y = Math.max(0, by0); Y <= by1; Y++) for (let X = Math.max(0, bx0); X <= bx1; X++) {
    // keep the lights (fin, eye, throat): the rim only over the hull tones
    if (ocupado[Y * w + X] !== 1 || (Y > 0 && ocupado[(Y - 1) * w + X])) continue;
    const i = (Y * w + X) * 4;
    out[i] = ARO[0]; out[i + 1] = ARO[1]; out[i + 2] = ARO[2]; out[i + 3] = 255;
  }
  return true;
}
