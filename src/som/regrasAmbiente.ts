/**
 * THE RULES OF THE AMBIENCE (block SOUND, sheet 8, 18/11 — spec `specs/2026-11-15-bloco-som-design.md` §10.10). Pure: no
 * Phaser, no audio; `AmbienteDaFase.ts` and the scenery ask, this answers.
 */
type Rnd = () => number;

const entre = (rnd: Rnd, [a, b]: readonly [number, number]): number => a + (b - a) * rnd();

/** Did the clock go past `t` in this step? */
export const cruzou = (t0: number, t1: number, t: number): boolean => t0 < t && t <= t1;

/** One of the takes, never the same one twice in a row ("A e B variando"). */
export function sorteadorSemRepetir(nomes: readonly string[], rnd: Rnd): () => string {
  let ultimo = -1;
  return () => {
    if (nomes.length < 2) return nomes[0];
    let i = Math.floor(rnd() * (nomes.length - 1));
    if (i >= ultimo && ultimo >= 0) i++;
    ultimo = i;
    return nomes[i];
  };
}

export interface Trovao {
  nome: string;
  /** ms after the flash: light arrives first, and the farther the storm the longer the sound takes. */
  atrasoMs: number;
}

export const TROVAO = {
  // (his lightning opens on ~0.45 s of tearing before the strike.) 19/11, him: the sound must come ~1 s after the flash,
  // "para indicar que o raio ainda está mais distante" — the ones without a visible bolt stay later still.
  perto: { atraso: [900, 1150] as const, nomes: ['fx.menu.trovao.perto', 'fx.menu.trovao.perto2'] },
  longe: { atraso: [1300, 2400] as const, nomes: ['fx.menu.trovao.longe', 'fx.menu.trovao.longe2', 'fx.menu.trovao.longe3', 'fx.menu.trovao.longe4', 'fx.menu.trovao.longe5'] },
  /** him: *"Separados ou o B e o A entrando"* — how often the second take comes in over the first, and how late. */
  chanceDosDois: 0.3,
  segundoEntra: [700, 1500] as const,
};

/** The storm heard from inside the hangar (18/11, him): a rolling thunder soon after arriving, then now and then (s). */
export const TROVAO_DO_HANGAR = { nome: 'fx.hangar.trovao', primeiro: 3.5, espera: [24, 40] as const };

/** s until the hangar's next thunder. */
export const proximoTrovaoDoHangar = (rnd: Rnd): number => entre(rnd, TROVAO_DO_HANGAR.espera);

/** The thunder of one flash: with a bolt it is close, without one it rolls far behind the clouds. */
export function trovoes(comRaio: boolean, rnd: Rnd): Trovao[] {
  const T = comRaio ? TROVAO.perto : TROVAO.longe;
  const n = T.nomes.length;
  const primeiro = Math.min(n - 1, Math.floor(rnd() * n));
  const atrasoMs = entre(rnd, T.atraso);
  const out: Trovao[] = [{ nome: T.nomes[primeiro], atrasoMs }];
  if (rnd() < TROVAO.chanceDosDois) {
    const segundo = (primeiro + 1 + Math.min(n - 2, Math.floor(rnd() * (n - 1)))) % n;
    out.push({ nome: T.nomes[segundo], atrasoMs: atrasoMs + entre(rnd, TROVAO.segundoEntra) });
  }
  return out;
}

/**
 * THE BELT HEARD FROM AFAR (F2, him: the colossal mining rigs' laser, the hammers on the anvils, the dead metal groaning):
 * three layers drawn over the bed, each on its own slow clock, and never two starting close together — each one has to
 * be heard alone, in the distance.
 */
export const CINTURAO = {
  camadas: [
    { nome: 'fx.f2.laser', primeira: 7, espera: [28, 46] as const },
    { nome: 'fx.f2.martelo', primeira: 19, espera: [30, 52] as const },
    { nome: 'fx.f2.metal', primeira: 31, espera: [30, 50] as const },
  ],
  /** s between the starts of two layers */
  folga: 12,
};

export class CamadasDoCinturao {
  private readonly faltam: number[] = CINTURAO.camadas.map((c) => c.primeira);
  private desdeUltima = CINTURAO.folga;
  private readonly rnd: Rnd;

  constructor(rnd: Rnd) {
    this.rnd = rnd;
  }

  /** One step; `livre` = false holds the layers back (a boss on screen). The name to play now, if any. */
  passo(dt: number, livre: boolean): string | null {
    this.desdeUltima += dt;
    if (!livre) return null;
    let pronta = -1;
    this.faltam.forEach((f, i) => {
      this.faltam[i] = f - dt;
      if (this.faltam[i] <= 0 && (pronta < 0 || this.faltam[i] < this.faltam[pronta])) pronta = i;
    });
    if (pronta < 0 || this.desdeUltima < CINTURAO.folga) return null;
    this.desdeUltima = 0;
    this.faltam[pronta] = entre(this.rnd, CINTURAO.camadas[pronta].espera);
    return CINTURAO.camadas[pronta].nome;
  }
}

/** The F4's breathing (him: *"Usar a A, a B em alguns momentos"*): long stretches of A, a short visit to B. */
export const REVEZAMENTO = { a: [45, 75] as const, b: [14, 22] as const, trocaMs: 4000 };

export class RevezamentoDoInterior {
  private falta: number;
  private readonly rnd: Rnd;
  naB = false;

  constructor(rnd: Rnd) {
    this.rnd = rnd;
    this.falta = entre(rnd, REVEZAMENTO.a);
  }

  /** One step: true when it just changed sides (read `naB`). */
  passo(dt: number): boolean {
    this.falta -= dt;
    if (this.falta > 0) return false;
    this.naB = !this.naB;
    this.falta = entre(this.rnd, this.naB ? REVEZAMENTO.b : REVEZAMENTO.a);
    return true;
  }
}

/**
 * THE INVASION IS ON THE HORIZON (F1): the light of a far gun or blast reaches the player before its sound does. These
 * delays are what put the colony kilometres away.
 */
export const HORIZONTE = {
  /** ms between the flash on the horizon and its sound */
  atrasoRajada: 850,
  atrasoFlak: 950,
  atrasoExplosao: 1400,
  /** s: the guns are many — at most one burst heard in this time */
  folgaRajada: 1.7,
} as const;

/** How close (px, beyond the rock's own radius) a rock has to pass for the ship to feel it. */
export const QUASE = { margem: 34, atras: 44, folgaRocha: 1.5, folgaDestroco: 10 } as const;

/** A rock crossing the ship's nose just now: was it a near miss? (A rock that hit the ship has its own sound.) */
export function passouRaspando(dy: number, raio: number, bateu: boolean): boolean {
  return !bateu && Math.abs(dy) <= raio + QUASE.margem;
}
