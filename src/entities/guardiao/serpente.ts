/**
 * OS CABOS-SERPENTE (spec 2026-11-22-guardiao-coleira-design.md §6, de 66% em diante). ⚠️ O DESENHO DELE (23/11, sobre o
 * GIF da 1ª rodada, que corria pela borda até a nave — recusado: *"eu pensei em algo mais parecido com o que desenhei, as
 * serpentes saem do próprio guardião"*): o cabo sai do CORPO dele num ARCO LARGO — o de cima sobe quase até o teto e
 * desce, o de baixo desce quase até o chão e sobe — e a cabeça fica POSTADA À FRENTE DELE, de olho na nave. Do posto:
 * ENSAIA (arma, balança, finta), TRAVA ~0,4 s (a linguagem da investida: parou de balançar, enrijeceu) e dá o BOTE RETO
 * até onde a nave estava na trava; recolhe e, depois do último bote, volta pelo arco para dentro do corpo. O posto é
 * FIXO: o jogador aprende de onde vem cada bote (bullet hell). A cabeça puxa, o corpo segue o caminho dela. Puro.
 */
import type { Ponto } from './padroes';

export type FaseSerpente = 'espera' | 'cresce' | 'ensaio' | 'trava' | 'bote' | 'recolhe' | 'volta' | 'fim';

export interface ParamSerpente {
  /** onde ela sai do corpo, na tela (atrás do casco) */
  raiz: Ponto;
  /** os dois controles do arco (uma cúbica raiz → posto) */
  c1: Ponto;
  c2: Ponto;
  /** o POSTO: onde a cabeça para, à frente dele */
  posto: Ponto;
  /** s antes de começar a crescer */
  atraso: number;
  botes: number;
  /** s de ensaio antes de cada bote */
  ensaio: number;
  fintas: number;
}

/** Os números (decisão minha, 23/11 — perguntados na folha). A nave anda a 110 px/s. */
export const SERPENTE = {
  /** crescendo pelo arco e voltando (px/s) */
  CORRE: 170,
  VOLTA: 220,
  /**
   * no ensaio a cabeça se ENROLA para trás do posto, contra a nave (px) — a cobra armando o bote em S —, em 1/ARMA_VEL s
   */
  ARMA: 7,
  ARMA_VEL: 4,
  /** o balanço da cabeça, de lado (px, rad/s) */
  BALANCO: 4,
  BALANCO_W: 7,
  /** a finta: meia investida na direção da nave (px) e quanto dura (s) */
  FINTA: 10,
  FINTA_S: 0.2,
  /** a trava (s), o recuo dela (px: mais enrolada) e quanto ele leva (s) */
  TRAVA: 0.4,
  RECUO: 5,
  RECUO_S: 0.12,
  /** o bote (px/s), o alcance (px: do posto a qualquer canto da esquerda) e o recolher (px/s) */
  BOTE: 400,
  BOTE_MAX: 260,
  RECOLHE: 260,
  /** quanto de arco antes do posto vira pescoço (px) — o pescoço é uma cúbica do arco à cabeça, sem quina */
  PESCOCO: 50,
  /** o pescoço SERPENTEIA no ensaio: os controles da cúbica balançam de lado (px, rad/s) */
  SERPENTEIA: 7,
  SERPENTEIA_W: 3.4,
  /** quão depressa a direção da cabeça e o serpentear seguem o que a fase pede (1/s) — sem estalo de uma fase à outra */
  TAN_VEL: 10,
  VIVO_VEL: 6,
  /** a ondulação do corpo inteiro: amplitude (px), número de onda (rad/px), velocidade (rad/s) */
  ONDA: 2.5,
  ONDA_K: 0.14,
  ONDA_W: 8,
  /** vinda do recolhe, a cabeça volta à pose do ensaio em (s) */
  MISTURA_S: 0.25,
  /** o maior giro do corpo entre cordas de 4 px (graus): acima disso é QUINA (o teste cobra) */
  DOBRA_MAX: 40,
} as const;

const unidade = (v: Ponto): Ponto => {
  const d = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / d, y: v.y / d };
};
const lerp = (a: Ponto, b: Ponto, k: number): Ponto => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const cubica = (a: Ponto, c1: Ponto, c2: Ponto, b: Ponto, t: number): Ponto => {
  const u = 1 - t;
  const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return { x: k0 * a.x + k1 * c1.x + k2 * c2.x + k3 * b.x, y: k0 * a.y + k1 * c1.y + k2 * c2.y + k3 * b.y };
};
const aproximar = (de: Ponto, para: Ponto, passo: number): Ponto => {
  const d = Math.hypot(para.x - de.x, para.y - de.y);
  return d <= passo ? { ...para } : lerp(de, para, passo / d);
};

/** a polilinha `pts` cortada no comprimento `L` (o último ponto interpolado) */
export function prefixo(pts: readonly Ponto[], L: number): Ponto[] {
  if (!pts.length) return [];
  const out: Ponto[] = [{ ...pts[0] }];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (s + d >= L) {
      out.push(lerp(pts[i - 1], pts[i], d > 0 ? (L - s) / d : 0));
      return out;
    }
    out.push({ ...pts[i] });
    s += d;
  }
  return out;
}

/** O CAMINHO de uma serpente, parametrizado pelo comprimento. */
export class Trilho {
  private readonly acum: number[];

  constructor(readonly pts: readonly Ponto[]) {
    this.acum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.acum.push(this.acum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
  }

  get comp(): number {
    return this.acum[this.acum.length - 1];
  }

  private segmento(s: number): number {
    let lo = 0, hi = this.acum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.acum[m] <= s) lo = m;
      else hi = m;
    }
    return lo;
  }

  /** o ponto do caminho no comprimento `s` */
  em(s: number): Ponto {
    const S = Math.max(0, Math.min(this.comp, s));
    const i = this.segmento(S);
    const d = this.acum[i + 1] - this.acum[i];
    return lerp(this.pts[i], this.pts[i + 1], d > 0 ? (S - this.acum[i]) / d : 0);
  }

  /** os pontos da raiz até `s` (o último interpolado) */
  ate(s: number): Ponto[] {
    const S = Math.max(0, Math.min(this.comp, s));
    const i = this.segmento(S);
    const out = this.pts.slice(0, i + 1).map((p) => ({ ...p }));
    if (S > this.acum[i]) out.push(this.em(S));
    return out;
  }
}

/** o arco largo do desenho dele: uma cúbica da raiz ao posto, amostrada a ~3 px */
export function caminhoSerpente(raiz: Ponto, c1: Ponto, c2: Ponto, posto: Ponto): Trilho {
  const aprox = Math.hypot(c1.x - raiz.x, c1.y - raiz.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(posto.x - c2.x, posto.y - c2.y);
  const n = Math.max(8, Math.ceil(aprox / 3));
  const pts: Ponto[] = [];
  for (let i = 0; i <= n; i++) pts.push(cubica(raiz, c1, c2, posto, i / n));
  pts[0] = { ...raiz };
  pts[n] = { ...posto };
  return new Trilho(pts);
}

export class Serpente {
  fase: FaseSerpente = 'espera';
  botesFeitos = 0;
  cabeca: Ponto;
  /** onde a nave estava na trava (o bote vai até aqui) */
  alvo: Ponto | null = null;
  readonly trilho: Trilho;
  /** o relógio da fase */
  private t = 0;
  private relogio = 0;
  /** até onde a cabeça chegou no arco (crescendo e voltando) */
  private s = 0;
  /** 0 = no posto, 1 = enrolada, de olho na nave */
  private armada = 0;
  /** 0 = rígida (trava, bote), 1 = serpenteando (ensaio) */
  private vivo = 0;
  /** para onde a cabeça aponta (a tangente da ponta da cúbica) — segue a fase devagar, nunca estala */
  private tanCab: Ponto = { x: -1, y: 0 };
  /** vinda do recolhe: de onde a cabeça volta à pose do ensaio */
  private de: Ponto | null = null;
  /** na volta: a cabeça já voltou ao posto e o corpo está entrando */
  private desceu = false;
  /** a cabeça no instante da trava, o começo do bote, a direção dele, o alcance e o quanto andou */
  private hT: Ponto = { x: 0, y: 0 };
  private h0: Ponto = { x: 0, y: 0 };
  private dir: Ponto = { x: 0, y: 0 };
  private dist = 0;
  private anda = 0;
  /**
   * O CORPO DELE ANDOU desde que ela saiu (23/11, ele: *"os cabos ficam presos e o guardião continua se movendo…
   * quero que os cabos acompanhem"*). A raiz vai junto inteira; o arraste some pelo arco até o começo do pescoço — o
   * posto e a cabeça ficam onde estão (o jogador aprende de onde vem o bote). Só o desenho e o que fere: o trilho e as
   * fases não mudam.
   */
  desvio: Ponto = { x: 0, y: 0 };

  constructor(readonly p: ParamSerpente) {
    this.trilho = caminhoSerpente(p.raiz, p.c1, p.c2, p.posto);
    this.cabeca = { ...p.raiz };
  }

  /** ensaiou o bastante: pode dar o bote (o coordenador decide quem vai) */
  get pronta(): boolean {
    return this.fase === 'ensaio' && this.t >= this.p.ensaio;
  }

  /** há quanto tempo está pronta esperando a vez */
  get esperando(): number {
    return this.t - this.p.ensaio;
  }

  get atacando(): boolean {
    return this.fase === 'trava' || this.fase === 'bote' || this.fase === 'recolhe';
  }

  get acabou(): boolean {
    return this.fase === 'fim';
  }

  private mudar(f: FaseSerpente): void {
    this.fase = f;
    this.t = 0;
  }

  /** a tangente do arco em `s` (para onde o corpo corre ali) */
  private tanArco(s: number): Ponto {
    const a = this.trilho.em(s - 3), b = this.trilho.em(s + 3);
    return unidade({ x: b.x - a.x, y: b.y - a.y });
  }

  /** a cabeça no ensaio: ENROLADA atrás do posto, contra a nave, balançando de lado, e as fintas para a frente */
  private poseEnsaio(nave: Ponto): Ponto {
    const S = SERPENTE;
    const P = this.p.posto;
    const e = this.armada;
    const d = unidade({ x: nave.x - P.x, y: nave.y - P.y });
    const balanco = S.BALANCO * Math.sin(this.relogio * S.BALANCO_W) * e;
    let finta = 0;
    for (let j = 0; j < this.p.fintas; j++) {
      const tf = (this.p.ensaio * (j + 1)) / (this.p.fintas + 1);
      finta = Math.max(finta, 1 - Math.abs(this.t - tf) / (S.FINTA_S / 2));
    }
    // suave na entrada e na saída da finta (sem o bico do triângulo)
    finta = finta * finta * (3 - 2 * finta);
    // ⚠️ ENROLA PARA DENTRO DO PRÓPRIO CORPO (para trás ao longo do arco), não contra a nave: com a nave do lado oposto ao
    // rumo do arco, recuar contra ela punha a cabeça atrás do posto e o pescoço virava um laço fechado (medido: 69° a
    // 9 px da cabeça, `_dobra.mjs`). Recolhendo ao longo do corpo, o S se forma sozinho na curva do pescoço.
    const T = this.tanArco(this.trilho.comp);
    const recua = S.ARMA * e;
    return {
      x: P.x - T.x * recua + d.x * S.FINTA * finta - d.y * balanco,
      y: P.y - T.y * recua + d.y * S.FINTA * finta + d.x * balanco,
    };
  }

  /** um passo. `liberada`: é a vez dela de dar o bote (ver `passoSerpentes`) */
  passo(dt: number, nave: Ponto, liberada: boolean): void {
    const S = SERPENTE;
    this.relogio += dt;
    this.t += dt;
    const P = this.p.posto;
    const dNave = unidade({ x: nave.x - P.x, y: nave.y - P.y });
    let tanAlvo: Ponto = this.tanArco(this.trilho.comp);
    let vivoAlvo = 0;
    switch (this.fase) {
      case 'espera':
        if (this.t >= this.p.atraso) this.mudar('cresce');
        break;

      case 'cresce':
        this.s = Math.min(this.trilho.comp, this.s + S.CORRE * dt);
        this.cabeca = this.trilho.em(this.s);
        tanAlvo = this.tanArco(this.s);
        if (this.s >= this.trilho.comp) this.mudar('ensaio');
        break;

      case 'ensaio': {
        this.armada = Math.min(1, this.armada + S.ARMA_VEL * dt);
        // a cabeça vira para a nave conforme se enrola (do rumo do arco para o da nave)
        const a = this.tanArco(this.trilho.comp);
        tanAlvo = unidade({ x: a.x + (dNave.x - a.x) * this.armada, y: a.y + (dNave.y - a.y) * this.armada });
        vivoAlvo = 1;
        const pose = this.poseEnsaio(nave);
        if (this.de) {
          const k = Math.min(1, this.t / S.MISTURA_S);
          const kk = k * k * (3 - 2 * k);
          this.cabeca = lerp(this.de, pose, kk);
          if (k >= 1) this.de = null;
        } else this.cabeca = pose;
        if (liberada && this.pronta) {
          this.alvo = { x: nave.x, y: nave.y };
          this.hT = { ...this.cabeca };
          this.dir = unidade({ x: nave.x - this.hT.x, y: nave.y - this.hT.y });
          this.de = null;
          this.mudar('trava');
        }
        break;
      }

      case 'trava': {
        // parou de balançar e enrijeceu: enrola mais um pouco, para trás da linha do bote
        const k = Math.min(1, this.t / S.RECUO_S);
        const kk = k * k * (3 - 2 * k);
        this.cabeca = { x: this.hT.x - this.dir.x * S.RECUO * kk, y: this.hT.y - this.dir.y * S.RECUO * kk };
        tanAlvo = this.dir;
        if (this.t >= S.TRAVA) {
          this.h0 = { ...this.cabeca };
          const a = this.alvo!;
          this.dir = unidade({ x: a.x - this.h0.x, y: a.y - this.h0.y });
          this.dist = Math.min(S.BOTE_MAX, Math.hypot(a.x - this.h0.x, a.y - this.h0.y));
          this.anda = 0;
          this.mudar('bote');
        }
        break;
      }

      case 'bote':
        this.anda = Math.min(this.dist, this.anda + S.BOTE * dt);
        this.cabeca = { x: this.h0.x + this.dir.x * this.anda, y: this.h0.y + this.dir.y * this.anda };
        tanAlvo = this.dir;
        if (this.anda >= this.dist) this.mudar('recolhe');
        break;

      case 'recolhe':
        this.anda = Math.max(0, this.anda - S.RECOLHE * dt);
        this.cabeca = { x: this.h0.x + this.dir.x * this.anda, y: this.h0.y + this.dir.y * this.anda };
        tanAlvo = this.dir;
        if (this.anda <= 0) {
          this.botesFeitos++;
          if (this.botesFeitos < this.p.botes) {
            this.de = { ...this.cabeca };
            this.mudar('ensaio');
          } else {
            this.desceu = false;
            this.mudar('volta');
          }
        }
        break;

      case 'volta':
        if (!this.desceu) {
          // a cabeça volta ao posto e desenrola (o rumo de volta ao do arco)…
          this.armada = Math.max(0, this.armada - S.ARMA_VEL * dt);
          this.cabeca = aproximar(this.cabeca, P, S.VOLTA * dt);
          const ok = this.cabeca.x === P.x && this.cabeca.y === P.y;
          const alinhada = 1 - (this.tanCab.x * tanAlvo.x + this.tanCab.y * tanAlvo.y) < 0.01;
          if (ok && alinhada && this.armada === 0) {
            this.desceu = true;
            this.s = this.trilho.comp;
          }
        } else {
          // …e o corpo entra pelo mesmo arco
          this.s = Math.max(0, this.s - S.VOLTA * dt);
          this.cabeca = this.trilho.em(this.s);
          tanAlvo = this.tanArco(this.s);
          if (this.s <= 0) this.mudar('fim');
        }
        break;

      case 'fim':
        break;
    }
    // a direção da cabeça e o serpentear seguem a fase, sem estalo (no arco, a direção é a do arco, exata)
    const noArco = this.fase === 'cresce' || (this.fase === 'volta' && this.desceu);
    if (noArco) this.tanCab = tanAlvo;
    else {
      const k = Math.min(1, S.TAN_VEL * dt);
      this.tanCab = unidade({ x: this.tanCab.x + (tanAlvo.x - this.tanCab.x) * k, y: this.tanCab.y + (tanAlvo.y - this.tanCab.y) * k });
    }
    this.vivo += (vivoAlvo - this.vivo) * Math.min(1, S.VIVO_VEL * dt);
  }

  /**
   * a polilinha do corpo, da CABEÇA à raiz (a ponta afina na cabeça); vazia antes de nascer e depois de entrar.
   * ⚠️ UMA CURVA SÓ, sem quina (23/11, ele: *"os ataques quebram, formam ângulos retos… ela precisa ter comportamento de
   * serpente, mais natural e fluido"*): o arco até o pescoço e, dali, uma cúbica com a tangente do arco numa ponta e a da
   * cabeça na outra — no bote a cabeça vai reta, e o corpo dobra suave atrás dela. Por cima, a onda que corre o corpo todo.
   */
  corpo(): Ponto[] {
    const S = SERPENTE;
    if (this.fase === 'espera' || this.fase === 'fim') return [];
    const noArco = this.fase === 'cresce' || (this.fase === 'volta' && this.desceu);
    let pts: Ponto[];
    /** o trecho reto do bote, a partir da cabeça, que a onda não mexe */
    let reto = 0;
    if (noArco) pts = this.trilho.ate(this.s);
    else {
      const sN = Math.max(0, this.trilho.comp - S.PESCOCO);
      pts = this.trilho.ate(sN);
      const N0 = this.trilho.em(sN), T0 = this.tanArco(sN), H = this.cabeca, TH = this.tanCab;
      const L = Math.hypot(H.x - N0.x, H.y - N0.y);
      // controles LONGOS: a virada do rumo do arco para o da nave se espalha pelo pescoço inteiro (curtos, ela se
      // concentrava junto à cabeça e virava grampo — medido com `scripts/_guardiao/_dobra.mjs`)
      // …e mais longos quanto maior a virada: com a nave do lado oposto ao rumo do arco (a de baixo sobe, a nave lá
      // embaixo) o pescoço faz um U — com controles de 0,5 L o U fechava em grampo junto à cabeça
      const vira = (1 - (T0.x * TH.x + T0.y * TH.y)) / 2;
      const k = Math.max(12, L * (0.5 + 0.2 * vira));
      // o serpentear: os controles balançam de lado, em fase oposta — o pescoço faz S
      const sw = S.SERPENTEIA * this.vivo * Math.sin(this.relogio * S.SERPENTEIA_W);
      const c1 = { x: N0.x + T0.x * k - T0.y * sw, y: N0.y + T0.y * k + T0.x * sw };
      const c2 = { x: H.x - TH.x * k + TH.y * sw * 0.6, y: H.y - TH.y * k - TH.x * sw * 0.6 };
      const n = Math.max(6, Math.ceil((L + 2 * k) / 3));
      for (let i = 1; i <= n; i++) pts.push(cubica(N0, c1, c2, H, i / n));
      // no bote o trecho que avançou vai reto (a linha que se lê); ao recolher ele relaxa, e a onda volta a correr nele
      // em 0,2 s — a cobra encolhendo, não uma vara voltando
      if (this.fase === 'bote') reto = this.anda;
      else if (this.fase === 'recolhe') reto = this.anda * Math.max(0, 1 - this.t / 0.2);
    }
    // a ONDA que corre o corpo inteiro (a cobra viva): pela normal, sumindo junto à raiz, à cabeça e no trecho do bote
    const base = pts.map((p) => ({ ...p }));
    const acum = [0];
    for (let i = 1; i < base.length; i++) acum.push(acum[i - 1] + Math.hypot(base[i].x - base[i - 1].x, base[i].y - base[i - 1].y));
    const total = acum[acum.length - 1];
    for (let i = 1; i < base.length - 1; i++) {
      const sq = acum[i], daCabeca = total - sq;
      const w = Math.min(1, sq / 30) * Math.min(1, Math.max(0, (daCabeca - reto) / 30));
      if (w <= 0) continue;
      const a = base[i - 1], b = base[i + 1];
      const nn = unidade({ x: -(b.y - a.y), y: b.x - a.x });
      // a onda corre da cabeça para a raiz: é o corpo seguindo a cabeça
      const o = S.ONDA * w * Math.sin(daCabeca * S.ONDA_K - this.relogio * S.ONDA_W);
      pts[i] = { x: base[i].x + nn.x * o, y: base[i].y + nn.y * o };
    }
    // o arraste do corpo dele (`desvio`): inteiro na raiz, nada do começo do pescoço em diante
    if (this.desvio.x || this.desvio.y) for (let i = 0; i < pts.length; i++) pts[i] = this.arrastado(pts[i], acum[i]);
    pts.reverse();
    pts[0] = this.cabecaVista();
    return pts;
  }

  /** quanto do `desvio` vale a `sq` px da raiz, pelo arco (suave: nada de dobra nova) */
  private arrastado(p: Ponto, sq: number): Ponto {
    const F = Math.max(1, this.trilho.comp - SERPENTE.PESCOCO);
    const u = Math.min(1, Math.max(0, sq / F));
    const w = 1 - u * u * (3 - 2 * u);
    return { x: p.x + this.desvio.x * w, y: p.y + this.desvio.y * w };
  }

  /** a cabeça como se vê: crescendo ou entrando pelo arco ela é arrastada junto com ele */
  private cabecaVista(): Ponto {
    const noArco = this.fase === 'cresce' || (this.fase === 'volta' && this.desceu);
    return noArco ? this.arrastado(this.cabeca, this.s) : { ...this.cabeca };
  }

  /**
   * o que FERE, da cabeça para trás: a cabeça — e, no bote e no recolher, o corpo esticado atrás dela até onde o bote
   * começou (o trecho que avançou sobre a arena)
   */
  trechoQueFere(): Ponto[] {
    if (this.fase === 'espera' || this.fase === 'fim') return [];
    if (this.fase === 'bote' || this.fase === 'recolhe') return prefixo(this.corpo(), this.anda + 6);
    return [this.cabecaVista()];
  }
}

/** UM BOTE POR VEZ (uma ataca enquanto a outra ensaia): se ninguém está atacando, a vez é da pronta que espera há mais tempo */
export function passoSerpentes(lista: readonly Serpente[], dt: number, nave: Ponto): void {
  let vez: Serpente | null = null;
  if (!lista.some((s) => s.atacando)) {
    for (const s of lista) if (s.pronta && (!vez || s.esperando > vez.esperando)) vez = s;
  }
  for (const s of lista) s.passo(dt, nave, s === vez);
}
