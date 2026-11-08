/**
 * THE COLOSSAL EEL'S NUMBERS — the approved mock's `scripts/_serpente/enguia/numeros.mjs`, as written (spec
 * `2026-11-03-serpente-grande-enguia-design.md`; the mock's rounds noted in its own comments), and the body strip's
 * constants from the mock's `arte.mjs` (the neck/skull joint), so the pure modules never import the art loader.
 */
export const N = {
  tela: { W: 384, H: 216, fps: 30 },
  crista: 151,
  // the breach: the hole in the lip texture (`serpente-rombo-labio.png`, origin (0.5, 1) at x 300, y 216)
  rombo: { x: 290, x0: 245, x1: 332, topo: 120, labio: { x: 140, y: 116 } },
  // the ship: FreeController.SPEED, GameScene.HITBOX_NAVE, the PULSE (rate 7, speed 300)
  nave: { vel: 110, hit: { w: 21, h: 9 }, casa: { x: 70, y: 100 }, lim: { x0: 14, x1: 300, y0: 10, y1: 206 }, nariz: 12 },
  tiro: { cada: 1 / 7, vel: 300 },
  // the body: the head + neck 84 px from snout to neck; 20 rings of 26 px
  corpo: { aneis: 20, passo: 26, cabeca: 84 },
  // the speeds (px/s) and the ramps at rest ends (s)
  vel: { passagem: 230, chegada: 160, rombo: 200, afunda: 260, sob: 140, escondido: 1500, recua: 120, rampa: 0.6 },
  // the slither: a wider S on every path she swims, and a wave running down her body all the time
  onda: { A: 14, lambda: 200 },
  respira: { A: 4.5, lambda: 120, w: 2.6, ate: 120 },
  // the body as a tube: a sample every `passo` px of arc (drawn), every `toque` px for the touch
  tubo: { passo: 2, toque: 10 },
  // before she leaves rest: the head draws back (visible) or the breach trembles (hidden) — this long
  prepara: { dur: 0.6, giro: 0.24 },
  // spec §3 — the fire pipes
  canos: { faixas: [0, 54, 108, 162, 216], aviso: [1.8, 1.1, 0.7], frente: 0.15, queima: 0.6, entre: 0.4, brasa: 0.5, antes: 0.6 },
  // spec §4 — the Echo
  eco: {
    leitura: 2.0, sementes: 5, voo: 0.45, minIdade: 0.4, vista: 0.6, intervalo: 0.25, raio: 15, fere: 0.2, rodadas: 1,
    entre: 0.6, giro: 30, final: { leitura: 1.4, intervalo: 0.18, rodadas: 1 },
  },
  // spec §5 — the geysers
  geiser: {
    passo: 55, aviso: 0.45, coluna: 0.5, largura: 16, topo: 70, vapor: 0.9, inicio: 220, fim: 20, yLombada: 168,
    lombada: { amp: 4, larg: 9, fundo: 46 }, cura: 2.5,
  },
  // spec §6 — the bites (rings off the tail)
  mordida: { aneis: 3 },
  ciclos: 2,
};
export type Numeros = typeof N;

/** the mock's LCG (its dice: the pipes' free lane `20261107`, the looks `5`) */
export const LCG = (semente: number): (() => number) => {
  let a = semente >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
};

// ─── the body strip (the mock's `arte.mjs` 16–29) ───
export const ALTURA = 64, CENTRO = 32, PERIODO = 18;
/** the skull's rigid part (its chord) ends at x 66 */
export const CRANIO_X = 66;
/** the strip starts here: x 56–65 lie under the skull */
export const FAIXA_X0 = 56;
/** the strip's index of u = 0 (the old joint, x 96) */
export const PESCOCO = 96 - FAIXA_X0;
/** from the skull's joint to u = 0, on the path (30 px) */
export const JUNTA = 96 - CRANIO_X;
/** the skull drawn past its joint, over the skin */
export const SOBRE = 6;
