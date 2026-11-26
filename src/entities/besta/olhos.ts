/**
 * THE EYES IN THE DARK (25/11, the Beast's step 7 — spec 2026-11-24 §4.3, his "A"), the pure rules. In the dark she
 * leaves the screen and three lights come on — only IN FRONT of the ship: on the right wall and the ceiling (his call:
 * nothing from behind, the ship does not turn its nose). She is the light that pulses WITH THE HEART (the true light
 * shows the beat for who plays without sound); the other two are lava embers that pulse off the rhythm and, at the
 * end, burst in place. After two beats the true one leaps:
 *   - from the right wall, straight across the room to the height the ship had at the last beat, out by the left edge
 *     (she never waits behind the ship);
 *   - from the ceiling, straight down onto the column the ship had at the last beat.
 * The figures are a fixed table that turns (never drawn by lot). No Phaser here (`scripts/test-besta-olhos.mjs`).
 */

export type BordaLuz = 'paredeD' | 'teto';

export interface Luz {
  borda: BordaLuz;
  /** Where the light (her core) is, screen px. */
  x: number;
  y: number;
  verdadeira: boolean;
  /** The light's own rhythm: period (s) and phase (rad). The true one has the heart's. */
  periodo: number;
  fase: number;
}

export interface ArenaOlhos {
  escala: number;
  largura: number;
  chaoApoio: number;
  garraCrava: number;
  garraTetoY: number;
  /** The core (frame px) of the poses she shows: the wall pose (descola 0), hanging (teto1), the leap (voo), side. */
  coreParede: [number, number];
  coreTeto: [number, number];
  coreVoo: [number, number];
  coreLado: [number, number];
}

export const OLHOS = {
  /**
   * The heart in the eyes. 25/11, him playing: *"está tudo muito rápido e acelerado... o tempo é curto entre saber qual
   * olho vai atacar, quando você vê, a criatura já pulou em você"* — was 2 beats of 0.8 s, 0.25 s and a 380 px/s leap
   * (~1.9 s from the lights to the hit). Now 4 beats of 1.0 s: by the 2nd or 3rd the embers show they are off the beat.
   */
  PULSO_S: 1.25,
  /**
   * 26/11, him playing again: *"ainda está irreconhecível... tudo é muito rápido e frenético... aumentar o tempo para o
   * jogador entender que aquilo é um estágio de reconhecer o verdadeiro"* — 4 → 6 beats of a slower heart (1.0 → 1.25 s):
   * ~7 s of lights before the tell, so the stage reads as "find her" before anything moves.
   */
  BATIDAS: 6,
  /** After the last beat, THE TELL: the true eyes narrow and flare, with a growl — then the leap. */
  ATRASO_S: 0.8,
  /**
   * 26/11 — THE COLOURS (his: *"poderia mudar visualmente o olho correto e deixar o olho da besta vermelho (poderia ficar
   * fácil demais)"*): at rest the three lights are the same dim amber; on its OWN peak each one flares — hers RED (her
   * eyes), the embers lava yellow. So the red shows only on her beat, the one you hear: seeing and hearing agree, and a
   * glance at a quiet moment tells nothing.
   */
  COR_REPOUSO: 0xb85a22,
  COR_VERDADEIRA: 0xff1e12,
  COR_BRASA: 0xffc040,
  /** The leap, px/s. */
  VEL: 260,
  /**
   * 25/11 — THE TRUE LIGHT CAN BE SHOT (his: *"pode deixar que ele tome o dano caso o jogador saque o esquema, mas pode
   * ser um dano reduzido"*): the true light IS her core, so while the lights are on it takes the player's shots at this
   * fraction of the damage; the embers swallow them for nothing. Half: reading the rhythm pays, but the window where she
   * is open after the leap stays the place to hurt her.
   */
  DANO_LUZ: 0.5,
  /** From the ceiling, the eyes glide along it to the ship's column first (her body still in the dark), px/s. */
  DESLIZE: 350,
  /** The wall pose's claws, frame x (the mirrored wall pose, `parede-descola` frame 0). */
  PAREDE_GARRA_X: 251,
  /** The fake embers' rhythms, as fractions of the heart's period, and their phases (rad). */
  FALSAS: [
    // (26/11: searched again for 6 beats of 1.25 s — both stay under 0.1 on every beat of hers; 1.6 peaked on the 5th)
    { k: 0.67, fase: 0.9 },
    { k: 1.89, fase: 5.1 },
  ],
  /**
   * The three figures (they turn): each light on the right wall (`y`, its height) or on the ceiling (`x`), and which one
   * is she. The true one alternates wall / ceiling / wall. 25/11, him: *"os três olhos têm hora que vão muito próximos da
   * nave... quero que os olhos fiquem mais concentrados sempre mais para o lado direito, assim dá tempo do jogador ler"*
   * — the ceiling lights went from x 175–300 to 250–300 (the right third of the room).
   */
  FIGURAS: [
    { luzes: [{ borda: 'paredeD', y: 60 }, { borda: 'paredeD', y: 150 }, { borda: 'teto', x: 280 }], verdadeira: 1 },
    { luzes: [{ borda: 'paredeD', y: 105 }, { borda: 'teto', x: 250 }, { borda: 'teto', x: 300 }], verdadeira: 1 },
    { luzes: [{ borda: 'paredeD', y: 70 }, { borda: 'paredeD', y: 165 }, { borda: 'teto', x: 275 }], verdadeira: 0 },
  ] as readonly { luzes: readonly ({ borda: 'paredeD'; y: number } | { borda: 'teto'; x: number })[]; verdadeira: number }[],
} as const;

/** The sprite position (frame centre) that puts a pose's core on (x, y). */
function spriteDoCore(core: readonly [number, number], x: number, y: number, e: number, espelho = false): { x: number; y: number } {
  return { x: x - (core[0] - 128) * e * (espelho ? -1 : 1), y: y - (core[1] - 128) * e };
}

/** The lights of the n-th appearance (the figures turn). */
export function luzes(n: number, a: ArenaOlhos): Luz[] {
  const e = a.escala;
  const fig = OLHOS.FIGURAS[n % OLHOS.FIGURAS.length];
  const yTeto = a.garraCrava - a.garraTetoY * e;
  const xParede = a.largura - (OLHOS.PAREDE_GARRA_X - 128) * e;
  let falsa = 0;
  return fig.luzes.map((l, i) => {
    const verdadeira = i === fig.verdadeira;
    const ritmo = verdadeira ? { periodo: OLHOS.PULSO_S, fase: 0 } : { periodo: OLHOS.PULSO_S * OLHOS.FALSAS[falsa].k, fase: OLHOS.FALSAS[falsa++].fase };
    if (l.borda === 'paredeD') return { borda: l.borda, x: xParede + (a.coreParede[0] - 128) * e, y: l.y, verdadeira, ...ritmo };
    return { borda: l.borda, x: l.x, y: yTeto + (a.coreTeto[1] - 128) * e, verdadeira, ...ritmo };
  });
}

/** A light's glow at time t (s since the lights came on), 0..1 — the heart's own curve (a sharp peak per period). */
export function pulsoDa(l: Luz, t: number): number {
  return Math.pow(Math.max(0, Math.sin(l.fase + (t * Math.PI * 2) / l.periodo)), 3);
}

/** When the true light beats (its peaks), s since the lights came on. */
export function batidas(): number[] {
  return Array.from({ length: OLHOS.BATIDAS }, (_, i) => OLHOS.PULSO_S / 4 + i * OLHOS.PULSO_S);
}

export interface Salto {
  /** The pose she shows at the light, and the sprite position for it. */
  pose: 'parede' | 'teto';
  inicio: { x: number; y: number };
  /** Where the sprite ends (off-screen on the left for the wall leap; on the floor for the ceiling one). */
  fim: { x: number; y: number };
  /** The core's line: from the light to the target. */
  de: { x: number; y: number };
  ate: { x: number; y: number };
  ms: number;
  /** From the ceiling: the eyes glide along it from the light to the column, before the drop (x from → to, ms). */
  deslize?: { de: number; ate: number; ms: number };
}

/**
 * The true one's leap, toward where the ship was at the last beat. From the wall: the core goes straight to the ship's
 * height and on out past the left edge. From the ceiling: straight down to the ship's column, landing on the floor.
 */
export function salto(l: Luz, nave: { x: number; y: number }, a: ArenaOlhos): Salto {
  const e = a.escala;
  if (l.borda === 'paredeD') {
    const inicio = spriteDoCore(a.coreParede, l.x, l.y, e);
    // she leaves the wall in the leap pose (voo): its core at the light, then straight to the ship's height, out on the left
    const de = { x: inicio.x + (a.coreVoo[0] - 128) * e, y: inicio.y + (a.coreVoo[1] - 128) * e };
    const yAlvo = Math.min(Math.max(nave.y, 36), 186);
    // the line through the ship's height at the ship's x, carried on until the whole body is off the left edge
    const xSai = -(256 - a.coreVoo[0]) * e - 8;
    // (a ship right in front of the wall would make the line steep: aim at least 60 px in from the light)
    const xMira = Math.min(nave.x, de.x - 60);
    const k = (xSai - de.x) / (xMira - de.x);
    const ate = { x: xSai, y: de.y + (yAlvo - de.y) * k };
    const fim = { x: inicio.x + (ate.x - de.x), y: inicio.y + (ate.y - de.y) };
    return { pose: 'parede', inicio, fim, de, ate, ms: (Math.hypot(ate.x - de.x, ate.y - de.y) / OLHOS.VEL) * 1000 };
  }
  // the drop is STRAIGHT DOWN (the let-go painted in the clip; the sprite only goes from the hanging anchor to the floor
  // one) — so first the eyes glide along the ceiling to the ship's column, then she shows and falls
  const yTeto = a.garraCrava - a.garraTetoY * e;
  const yChao = a.chaoApoio - 124 * e;
  const xAlvo = Math.min(Math.max(nave.x, 40), a.largura - 40);
  const xs = xAlvo - (a.coreLado[0] - 128) * e;
  const inicio = { x: xs, y: yTeto };
  const fim = { x: xs, y: yChao };
  const de = { x: xs + (a.coreTeto[0] - 128) * e, y: yTeto + (a.coreTeto[1] - 128) * e };
  const ate = { x: xAlvo, y: yChao + (a.coreLado[1] - 128) * e };
  const deslize = { de: l.x, ate: de.x, ms: (Math.abs(de.x - l.x) / OLHOS.DESLIZE) * 1000 };
  return { pose: 'teto', inicio, fim, de, ate, ms: Math.max(380, (Math.hypot(ate.x - de.x, ate.y - de.y) / OLHOS.VEL) * 1000), deslize };
}
