/**
 * A CORDA (spec 2026-11-22-guardiao-coleira-design.md §9): uma corrente de nós (Verlet) com as duas pontas presas — a
 * âncora no teto e a raiz no casco. O comprimento é FIXO: com a distância a→b menor que ele, a corda cede à gravidade
 * (frouxa); igual, ela fica reta (esticada) — e é esse limite que faz o TRANCO da coleira. Puro: sem Phaser.
 */
export interface Ponto {
  x: number;
  y: number;
}

export class Corda {
  private comp: number;
  readonly nos: number;
  private seg: number;

  get comprimento(): number {
    return this.comp;
  }

  /**
   * O comprimento muda: a coleira é RETRÁTIL — o teto recolhe e solta cabo (o hospedeiro puxa), até o máximo dela.
   * Sem isso, a corda com o comprimento do alcance ficaria pendurada em laço na estação.
   */
  set comprimento(L: number) {
    this.comp = L;
    this.seg = L / (this.nos - 1);
  }
  private readonly p: Float32Array;
  private readonly q: Float32Array;

  constructor(a: Ponto, b: Ponto, comprimento: number, nos = 14) {
    this.nos = nos;
    this.comp = comprimento;
    this.seg = comprimento / (nos - 1);
    this.p = new Float32Array(nos * 2);
    for (let i = 0; i < nos; i++) {
      const k = i / (nos - 1);
      this.p[i * 2] = a.x + (b.x - a.x) * k;
      this.p[i * 2 + 1] = a.y + (b.y - a.y) * k;
    }
    this.q = Float32Array.from(this.p);
  }

  /** um passo: inércia amortecida + gravidade, depois as restrições de segmento com as pontas presas */
  passo(dt: number, a: Ponto, b: Ponto, gravidade: number, amortece = 0.96, iter = 12): void {
    const { p, q, nos } = this;
    const g = gravidade * dt * dt;
    for (let i = 1; i < nos - 1; i++) {
      const x = p[i * 2], y = p[i * 2 + 1];
      p[i * 2] += (x - q[i * 2]) * amortece;
      p[i * 2 + 1] += (y - q[i * 2 + 1]) * amortece + g;
      q[i * 2] = x;
      q[i * 2 + 1] = y;
    }
    // a SAÍDA: o penúltimo nó preso logo acima da raiz — o cabo embutido sai do toco pelo eixo dele, nunca deitado
    const s = this.saida ? { x: b.x + this.saida.x, y: b.y + this.saida.y } : null;
    const preso = (i: number): boolean => i === 0 || i === nos - 1 || (s !== null && i === nos - 2);
    for (let k = 0; k < iter; k++) {
      p[0] = a.x;
      p[1] = a.y;
      p[(nos - 1) * 2] = b.x;
      p[(nos - 1) * 2 + 1] = b.y;
      if (s) {
        p[(nos - 2) * 2] = s.x;
        p[(nos - 2) * 2 + 1] = s.y;
      }
      for (let i = 0; i < nos - 1; i++) {
        const dx = p[i * 2 + 2] - p[i * 2], dy = p[i * 2 + 3] - p[i * 2 + 1];
        const d = Math.hypot(dx, dy) || 1e-6;
        // só PUXA (a corda não empurra): segmento mais curto que o passo fica como está
        if (d <= this.seg) continue;
        const pi = preso(i), pj = preso(i + 1);
        if (pi && pj) continue;
        const f = (d - this.seg) / d;
        const pa = pi ? 0 : pj ? 1 : 0.5;
        const pb = 1 - pa;
        p[i * 2] += dx * f * pa;
        p[i * 2 + 1] += dy * f * pa;
        p[i * 2 + 2] -= dx * f * pb;
        p[i * 2 + 3] -= dy * f * pb;
      }
    }
    p[0] = q[0] = a.x;
    p[1] = q[1] = a.y;
    p[(nos - 1) * 2] = q[(nos - 1) * 2] = b.x;
    p[(nos - 1) * 2 + 1] = q[(nos - 1) * 2 + 1] = b.y;
    if (s) {
      p[(nos - 2) * 2] = q[(nos - 2) * 2] = s.x;
      p[(nos - 2) * 2 + 1] = q[(nos - 2) * 2 + 1] = s.y;
    }

    // ESTICADA, a corda é a RETA + a vibração do tranco (uma onda que se apaga). A corrente de nós não chega a reta com
    // gravidade e iterações finitas (medido: 7 px de barriga em L), e a corda esticada que barriga não dá o tranco.
    this.relogio += dt;
    if (this.esticada(a, b)) {
      const fim = s ?? b;
      const ult = s ? nos - 2 : nos - 1;
      const dx = fim.x - a.x, dy = fim.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const onda = this.vib * Math.cos(this.relogio * Corda.VIB_W);
      for (let i = 1; i < ult; i++) {
        const k = i / ult;
        const desvio = onda * Math.sin(k * Math.PI);
        p[i * 2] = q[i * 2] = a.x + dx * k + nx * desvio;
        p[i * 2 + 1] = q[i * 2 + 1] = a.y + dy * k + ny * desvio;
      }
    }
    this.vib *= Math.pow(Corda.VIB_AMORTECE, dt * 60);
  }

  /** o penúltimo nó, relativo à raiz (null = solto): por onde o cabo sai do toco */
  saida: Ponto | null = null;

  /** a vibração da corda esticada (px no meio), o relógio dela, a frequência (rad/s) e o quanto apaga por quadro */
  private vib = 0;
  private relogio = 0;
  private static readonly VIB_W = 70;
  private static readonly VIB_AMORTECE = 0.88;

  /** a distância reta a→b chegou ao comprimento: a corda está reta */
  esticada(a: Ponto, b: Ponto): boolean {
    return Math.hypot(b.x - a.x, b.y - a.y) >= this.comprimento - 0.5;
  }

  /** um chute TRANSVERSAL nos nós do meio (a onda do tranco), maior no centro, alternando de lado */
  golpe(forca: number): void {
    this.vib = forca;
    this.relogio = 0;
    const { p, q, nos } = this;
    const dx = p[(nos - 1) * 2] - p[0], dy = p[(nos - 1) * 2 + 1] - p[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    for (let i = 1; i < nos - 1; i++) {
      const k = Math.sin((i / (nos - 1)) * Math.PI) * (i % 2 ? 1 : -0.6) * forca;
      q[i * 2] -= nx * k;
      q[i * 2 + 1] -= ny * k;
    }
  }

  /** os nós, da âncora à raiz */
  pontos(): Ponto[] {
    const out: Ponto[] = [];
    for (let i = 0; i < this.nos; i++) out.push({ x: this.p[i * 2], y: this.p[i * 2 + 1] });
    return out;
  }

  /** o passo da corda ARREBENTADA: só a raiz presa, o resto cai e chicoteia */
  passoSolta(dt: number, b: Ponto, gravidade: number): void {
    const { p, q, nos } = this;
    const g = gravidade * dt * dt;
    for (let i = 0; i < nos - 1; i++) {
      const x = p[i * 2], y = p[i * 2 + 1];
      p[i * 2] += (x - q[i * 2]) * 0.97;
      p[i * 2 + 1] += (y - q[i * 2 + 1]) * 0.97 + g;
      q[i * 2] = x;
      q[i * 2 + 1] = y;
    }
    for (let k = 0; k < 8; k++) {
      p[(nos - 1) * 2] = b.x;
      p[(nos - 1) * 2 + 1] = b.y;
      for (let i = 0; i < nos - 1; i++) {
        const dx = p[i * 2 + 2] - p[i * 2], dy = p[i * 2 + 3] - p[i * 2 + 1];
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d <= this.seg) continue;
        const f = (d - this.seg) / d;
        const pa = i + 1 === nos - 1 ? 1 : 0.5;
        p[i * 2] += dx * f * pa;
        p[i * 2 + 1] += dy * f * pa;
        p[i * 2 + 2] -= dx * f * (1 - pa);
        p[i * 2 + 3] -= dy * f * (1 - pa);
      }
    }
  }
}
