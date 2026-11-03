/**
 * THE SERPENT'S FIGHT — the numbers and the pure sums.
 *
 * S1 (28/10, spec `2026-10-28-serpente-luta-s1-design.md`): the breach in the hull, the posts, the veins, the head-sized
 * hit. S1b (29/10, spec `2026-10-29-serpente-luta-s1b-design.md`) — him, on the S1: *"Ficou a mesma coisa, só mudou a
 * base e a distância da investida"*: every move was still the whole drawing sliding through the air. Now SHE LIVES IN
 * THE HULL: the arrival bursts it open and she rises from the breach.
 *
 * 02/11 (spec `2026-11-02-serpente-habilidades-instalacao-design.md`): THE CHARGE IS GONE (his choice: "a investida sai
 * de todas") — with it the cut, the burst's heights and x, the lock and the tear; the triple rain became the missiles'
 * (`serpente/numerosHab.ts`, with every skill's numbers).
 *
 * 03/11 (the spec's amendment): one post, the whole fight; the whole body takes damage, the head about to fall 1.5×.
 *
 * Game px of the native 384×216 (y down), seconds. Without Phaser: `scripts/test-serpente.mjs` runs it in Node.
 */
export interface FormaLuta {
  /** the live head's SKULL from the sprite's centre, in ART px (the hit circle; measured on the grid, 29/10) */
  cabeca: { x: number; y: number };
  escala: number;
  /** the art's height (px) — where the hidden sprite sits */
  altura: number;
}

export const LUTA = {
  /** the breach: its centre x (her home), half its width, the y of the hull band's crest */
  rombo: { x: 300, meio: 72, crista: 150 },
  /** the breach strip (`serpente-rombo.png`, 318×100; the whole one `serpente-rombo-inteiro.png`): its width, and where
   * the hole's centre sits in it */
  faixa: { largura: 318, buraco: 159 },
  /** the band's first lit row (measured on the arena's photo, 151–152); the hull's dark band below it (`cascoVivo`) */
  crista: 151,
  escuro: 7,
  /** the world brakes to a stop with the breach under her post (px/s²), from the full scroll */
  freada: 28,
  /** THE ARRIVAL: the whole hull trembles this long before it bursts open; then she rises at `subida` (px/s) */
  tremor: 1.2,
  subida: 90,
  /** IN THE BREACH SHE SHOWS WHOLE, the breach's lip in front of her coils: her post (the sprite's y), the mocks' one,
   * where every skill plays. 03/11 — him: *"A serpente sobe e desce no buraco, com um movimento muito irreal"* → ONE
   * post, the whole fight: only her animations move her (no height changes, no breathing slide) */
  posto: 142,
  /** 03/11 — THE WHOLE BODY TAKES DAMAGE (him: *"basta acertar o corpo e as cabeças vão caindo conforme a vida desce"*);
   * a hit on the head about to fall is worth more, not double (*"Ele recompensa, mas não facilita o dobro"*) */
  cabecaVale: 1.5,
  /** each form's life: doubled on 03/11 since nearly every shot now lands (provisional — calibrate playing) */
  vida: { A: 100, B: 100, C: 100, fusao: 120 },
  /** the fusion bursts out of the breach at this speed (px/s; half the old charge's 700) */
  surge: 350,
  /** the heartbeat of the live head's veins (beats per second): at rest, and while a skill runs */
  coracao: { calmo: 1.0, alerta: 2.5 },
} as const;

/** Per form. The skulls measured on the grid (29/10): the S1's offsets (July, the head's colour centroid) sat on the
 * NECK of the cyan and the green, 25–35 art px below the skull. */
export const FORMAS: Record<'A' | 'B' | 'C' | 'fusao', FormaLuta> = {
  A: { cabeca: { x: -84, y: -78 }, escala: 0.55, altura: 246 },
  B: { cabeca: { x: 1, y: -91.5 }, escala: 0.55, altura: 243 },
  C: { cabeca: { x: 63, y: -64.5 }, escala: 0.55, altura: 249 },
  fusao: { cabeca: { x: -52.0, y: -75.6 }, escala: 0.63, altura: 248 },
};

/** The sprite's y at her post IN THE BREACH (she shows whole there). */
export function romboY(): number {
  return LUTA.posto;
}

const GAME_H = 216;

/** The sprite's y with all of her below the screen (hidden in the breach). */
export function escondidaRombo(f: FormaLuta): number {
  return GAME_H + (f.altura / 2) * f.escala + 4;
}

/**
 * THE HIT CAP (30/10, found in the CCGS review and kept by him when the CCGS left): one hit never takes more than a third
 * of a form's HP. The bomb deals 12 to a boss in one hit — a third of a 36-HP form; with it, a form could fall to two
 * bombs. The bomb itself is untouched (a shared system); the cap lives in the boss.
 */
export function golpeMax(hpForma: number): number {
  return Math.floor(hpForma / 3);
}

/** How far the world travels braking from `v` (px/s) to a stop: where the breach must be when the brake starts. */
export function freadaDe(v: number): number {
  return (v * v) / (2 * LUTA.freada);
}

/**
 * The heartbeat, 0..1: a strong beat and a weaker one right after it, then rest (lub-dub). `t` in seconds,
 * `porSegundo` in beats per second.
 */
export function pulso(t: number, porSegundo: number): number {
  const u = (((t * porSegundo) % 1) + 1) % 1;
  const batida = (c: number, l: number): number => Math.exp(-(((u - c) / l) ** 2));
  return Math.min(1, batida(0.08, 0.07) + 0.6 * batida(0.3, 0.07));
}
