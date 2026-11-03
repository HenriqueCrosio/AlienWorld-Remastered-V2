/**
 * THE SERPENT'S SKILLS — the numbers and the pure sums (spec `2026-11-02-serpente-habilidades-instalacao-design.md`).
 * Every number is the approved mock's (`scripts/_serpente/_habilidades-maquete.mjs`, rounds 1–14) unless the spec gives
 * one. The mock runs at 30 frames/s; the port keeps its numbers and converts its per-frame quantities (`porQuadro`,
 * `chance`). Without Phaser: `scripts/test-serpente-hab.mjs` runs it in Node.
 */
import type { Cor, FormaHab, NomeHab, Ponto, Variacao } from './tipos';

export const FPS_MAQUETE = 30;

export const HAB = {
  /** the skills of each form, in order (the head that dies takes its skill with it) */
  ciclo: { A: ['chuva', 'raio', 'gas'], B: ['chuva', 'gas'], C: [], fusao: [] } as Record<FormaHab, NomeHab[]>,
  /** between two skills: this long, with a common shot at each of `tiros` (s from the pause's start) */
  pausa: { dur: 2.4, tiros: [0.6, 1.6] },
  /** a skill whose head died dissolves in this long */
  aborta: 0.5,
  /** the gas counter takes this share of the form's HP */
  contra: 0.15,
  /** the pixel layer's two canvases: over her body, and under the ship (the ship is at depth 1, her at 30, the lip 35) */
  profundidade: { cima: 36, baixo: 0.9 },
  tiros: {
    variacoes: { A: ['mirado', 'leque', 'cerco'], B: ['mirado', 'leque', 'cerco'] } as Record<'A' | 'B', Variacao[]>,
    /** today's aimed shot: one head in turn, ±0.35 rad, 140 px/s */
    mirado: { vel: 140, desvio: 0.35, ordem: { A: ['ciano', 'verde', 'laranja'], B: ['verde', 'laranja'] } as Record<'A' | 'B', Cor[]> },
    leque: { n: 3, abertura: 30, vel: 105 },
    /** the pairs take turns (his: "No 'cerco' elas se revezam na dupla de ataque conjunto") */
    cerco: {
      afasta: 22,
      vel: 140,
      pares: { A: [['ciano', 'verde'], ['verde', 'laranja'], ['ciano', 'laranja']], B: [['verde', 'laranja']] } as Record<'A' | 'B', [Cor, Cor][]>,
    },
    /** the collision box: today's (`bolt2`'s 13×9 frame at 0.9) — the pool sprite keeps today's texture and scale */
    caixa: { w: 13 * 0.9, h: 9 * 0.9 },
    /** the shot leaves at the gesture's action frame (the joined clip's 2, 9, 16 = each set's frame 2), clips at 12 fps */
    acao: 2,
    fpsGesto: 12,
    /** the C (today's): the aimed burst and the fan, with the ember */
    C: { rajada: { n: 3, vel: 175, cada: 2.1, entre: 0.12 }, leque: { n: 4, abertura: 40, vel: 150, cada: 3.4 } },
  },
  /** the mock's colours (123–125, 273–274, 364, 517): each head's colour, its near-black rim, its near-white core; the
   * jets' gas (hot white → amber → cold vapour); the stabilizers' cold gas; metal; the 4×4 ordered dither */
  cores: {
    COR: { ciano: [88, 120, 255], verde: [96, 240, 136], laranja: [255, 160, 64] } as Record<Cor, readonly number[]>,
    BORDA: { ciano: [7, 10, 28], verde: [7, 18, 12], laranja: [22, 12, 4] } as Record<Cor, readonly number[]>,
    NUCLEO: { ciano: [232, 236, 255], verde: [232, 255, 240], laranja: [255, 242, 220] } as Record<Cor, readonly number[]>,
    GAS: { quente: [255, 243, 220], chama: [255, 184, 96], vapor: [158, 172, 194] },
    METAL: [70, 78, 94],
    METAL_LUZ: [168, 178, 196],
    FRIO: { quente: [238, 245, 255], meio: [192, 208, 228], vapor: [146, 162, 188] },
    BAYER: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  },
  /** the hull's crest on screen (the mock's `CRISTA`): the gas spreads on it, the missiles burst on it */
  crista: 151,
  chuva: {
    /** each living head spits a salvo of 9, 0.022 s apart, up and out (35° to the left, ±16°, a hair of luck) */
    salva: { n: 9, entre: 0.022, inclina: 35, abre: 4, sorte: 3, vel: 280 },
    /** the waves: 0.55 s after the spit, 0.6 s apart; 10 slots of 22 px from x 14 (all in front of her), a gap of 3 */
    ondas: { depois: 0.55, entre: 0.6, de: 14, passo: 22, vagas: 10, vao: 3 },
    /** the engine pushes them down from rest (px/s²); they burst on the hull */
    acel: 160,
    /** the box along the flight: falling 7×11, rising (diagonal) 9×9 */
    caixa: { desce: { w: 7, h: 11 }, sobe: { w: 9, h: 9 } },
    /** the A's gesture (`chuvaM2`, 16 frames at 12 fps): the salvo leaves at its strike frame */
    acaoA: 9,
  },
  /**
   * THE CYAN'S BEAM (the mock's `VARRE`, 1419–1434; rounds 8–12): two big slices — the top one (−10 → 90 at the left
   * edge) and the bottom one, starting ON the hull (172 → 60) — each inside a 1.6 s warning (read the ship 0.35 s,
   * rehearse the path 0.45 s, back to the middle, jaws open, to the start); then the salvo of six thin beams, drawn
   * slice by slice. `meia` is the beam's half-width.
   */
  raio: {
    fatias: [{ de: -10, ate: 90, dur: 0.9, carga: 1.6 }, { de: 172, ate: 60, dur: 0.9, carga: 1.6 }],
    inicio: 0.3,
    segura: 0.25,
    meia: 6,
    fase: { le: 0.35, ensaia: 0.45, centra: 0.05, abre: 0.36 },
    recupera: { centra: 0.1, fps: 12 },
    salva: { n: 6, cargaPrimeira: 1.0, ciclo: 0.7, dur: 0.3, segura: 0.06, meia: 3, le: 0.24, centra: 0.1 },
  },
  /** a skill starts on the idle's frame 0 and her heads leave the idle one idle cycle later (9 frames at 8 fps), on
   * frame 0 again (every set starts from the approved frame): the mocks' `PRE` */
  cicloIdle: 9 / 8,
  /**
   * THE GAS + SPARK (rounds 5–7 and 13; the mock's `GASCFG` 502–515, `VAPOR` 516, `GEL` 551, `PADRAO` 868–874,
   * `TERMO` 912, `RAMPA` 950, `GMOV` 1263). The green pours the breath out of her open jaws, down, into a low bank in
   * front of her; the orange charges 2.5 s and strikes a pocket of it from behind, throwing burning jelly at the ship in
   * one of THE THREE DODGES (the fan, the rails, the file). The ship's shots through the gas heat the thermometer: full,
   * the flame runs back up the breath into their faces (the counter, `contra` of her HP). With INCENDIÁRIO it lights at
   * the first touch.
   */
  gas: {
    /** the breath (s on the skill's clock), the orange's strikes, its charge before each */
    sopro: [0.2, 11.3],
    faiscas: [3.6, 7.1, 10.6],
    carga: 2.5,
    /** the dodge of each strike, in turn, per form (his, 03/11: the two-headed form has its own sequence) */
    ordem: { A: ['leque', 'trilhos', 'fila'], B: ['rasteira', 'cortina', 'filaFunda'] },
    /** the gas's density (per 2-px cell, summed 3×3): seen, full, burns, a pocket */
    dVis: 0.4,
    dCheia: 5,
    dMin: 0.9,
    dBolsao: 1.8,
    /** the shots' heat in the gas (the subtle hint): what lights it, what a shot adds, how fast it cools */
    calorIgn: 3.5,
    calorTiro: 0.5,
    calorTau: 3,
    /** a flame front runs this fast (px/s) */
    frente: 170,
    /** the thermometer: a shot through the thick gas adds this much (~12 shots); it cools this much per s */
    termoTiro: 1 / 12,
    termoEsfria: 0.04,
    /** the breath: down from her jaws (rad: 0.87 under the horizontal), a fan of ±0.22, particles per mock frame */
    vapor: { eixo: Math.PI - 0.87, abre: 0.22, taxa: 11 },
    /** the jelly: its wobble's frequency and its burning skin's boil */
    gel: { f0: 3.2, ruido: 2.3 },
    /**
     * THE THREE DODGES, per form. A strike's `alvos`: px above/below the ship, or an object of its own — `dy`, `rente`
     * (aimed just over the hull's crest at the ship's column: it skims the plate and splats burning on it), `y` (an
     * absolute screen row at the ship's column), `cruza` (it CROSSES the crest instead of splatting on it), and its own
     * `R`, `v`, `corte`, `tRacha`. THE HULL IS NOT A FLOOR: it lies in the background, and the ship flies over it down to
     * the screen's bottom (in vacuum it only meets the screen's edges) — so a ship can hide UNDER the crest from the
     * jelly, which splats on it. THE B's own sequence (his, 03/11: *"o último tiro da leva B eu quero que cruze o casco
     * para baixo [...] ser mais abrangente na parte de baixo, para punir quem usou disso antes"*):
     *   rasteira   a blob at you (torn across, the fan) + a train skimming the crest           → step UP out of the line
     *   cortina    three trains at once: above you, on your line, on the crest                → half a step into a gap
     *   filaFunda  three in rhythm: at you, then two fans that CROSS the crest and tear across  → keep moving, and high
     *              the band under it (the hiding place)
     */
    padroes: {
      A: {
        leque: [{ dt: 0, alvos: [0], R: 9.5, v: 88, corte: 'atravessa' }],
        trilhos: [{ dt: 0, alvos: [-30, 30], R: 7.5, v: 80, corte: 'aoLongo' }],
        fila: [
          { dt: 0, alvos: [0], R: 7, v: 104, corte: 'aoLongo', tRacha: 0.85 },
          { dt: 0.4, alvos: [0], R: 7, v: 104, corte: 'aoLongo', tRacha: 0.85 },
          { dt: 0.8, alvos: [0], R: 7, v: 104, corte: 'aoLongo', tRacha: 0.85 },
        ],
      },
      B: {
        rasteira: [{ dt: 0, alvos: [0, { rente: true, corte: 'aoLongo', R: 7.5, v: 96 }], R: 9.5, v: 88, corte: 'atravessa' }],
        cortina: [{ dt: 0, alvos: [-54, 0, { rente: true }], R: 7, v: 82, corte: 'aoLongo' }],
        filaFunda: [
          { dt: 0, alvos: [0], R: 7, v: 104, corte: 'aoLongo', tRacha: 0.85 },
          { dt: 0.4, alvos: [{ y: 168, cruza: true }], R: 9.5, v: 135, corte: 'atravessa', tRacha: 0.5 },
          { dt: 0.8, alvos: [{ y: 196, cruza: true }], R: 10.5, v: 135, corte: 'atravessa', tRacha: 0.5 },
        ],
      },
    },
    /** the thermometer's glass (top-left, 3 px wide; the bulb under it), beside her */
    termo: { x: 370, y: 66, alto: 40 },
    /** the heat's colour up the column: a dull red, the orange, the yellow, the white-hot top */
    rampa: [[150, 40, 28], [226, 92, 40], [255, 162, 64], [255, 222, 140], [255, 248, 228]],
    /** her heads' gestures (s): the green opens, the orange draws back, pecks (out, held, back), relaxes; the green
     * closes; the three flinch; a charge let go plays back this many frames/s; the green's neck pumps at this fps */
    mov: { abre: 1.0, carga: 0.8, vai: 0.08, pico: 0.12, volta: 0.1, relaxa: 0.5, fecha: 0.75, encolhe: 1.2, aborta: 20, sopraFps: 10 },
  },
  /** the mock's set names → the installed sets */
  conjuntos: {
    raio: { fechada: 'raioFechada', aberta: 'raioAberta', abre: 'raioAbre', recupera: 'raioRecupera' },
    gas: {
      A: { abre: 'gasAbreA', sopra: 'gasSopraA', carga: 'gasCargaA', bote: 'gasBoteA', fecha: 'gasFechaA', encolhe: 'gasEncolheA' },
      B: { abre: 'gasAbreB', sopra: 'gasSopraB', carga: 'gasCargaB', bote: 'gasBoteB', fecha: 'gasFechaB', encolhe: 'gasEncolheB' },
    },
  },
} as const;

/**
 * This step (t0, t1] reaches the instant tx: true on the first frame whose time is ≥ tx — the mock's
 * `t >= tx && t - 1/FPS < tx` with `t` the frame's time and `t0 = t − dt`. A hair of slack, so an instant that lands
 * exactly on a frame boundary fires once (the mock's 14th-round fix).
 */
export function cruza(t0: number, t1: number, tx: number): boolean {
  return t1 >= tx - 1e-9 && t0 < tx - 1e-9;
}

/** how many mock frames this step is */
export function porQuadro(dt: number): number {
  return dt * FPS_MAQUETE;
}

/** a per-frame chance (or fraction) of the mock, for a step of `dt` */
export function chance(p: number, dt: number): number {
  const k = porQuadro(dt);
  return k === 1 ? p : 1 - Math.pow(1 - p, k);
}

/** the mock's die (an LCG): `gerador(7)` is its `acaso`, `gerador(99)` its `visual` */
export function gerador(semente: number): () => number {
  let s = semente >>> 0;
  return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
}

export function rodizio<T>(lista: readonly T[], k: number): T {
  return lista[((k % lista.length) + lista.length) % lista.length];
}

/** the encirclement's two aim points: above and below the ship */
export function alvosDoCerco(nave: Ponto): [Ponto, Ponto] {
  const d = HAB.tiros.cerco.afasta;
  return [{ x: nave.x, y: nave.y - d }, { x: nave.x, y: nave.y + d }];
}

/** n angles over `aberturaDeg`, centred on `centro` (rad) */
export function angulosDoLeque(centro: number, n: number, aberturaDeg: number): number[] {
  const ab = (aberturaDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => centro + (n === 1 ? 0 : i / (n - 1) - 0.5) * ab);
}

/** one wave's missiles: the slots' x, with the gap of `vao` slots starting at slot `inicio` */
export function vagasDosCasulos(inicio: number): number[] {
  const O = HAB.chuva.ondas, xs: number[] = [];
  for (let s = 0; s < O.vagas; s++) if (s < inicio || s >= inicio + O.vao) xs.push(O.de + s * O.passo);
  return xs;
}

/** the first wave's gap and the way it walks (±1 slot per wave), drawn so every wave's gap stays in the inner slots */
export function inicioDoVao(sorte: () => number, ondas: number): { inicio: number; passo: 1 | -1 } {
  const O = HAB.chuva.ondas, max = O.vagas - 1 - O.vao; // the gap's last start (slot 9 is the edge)
  const passo: 1 | -1 = sorte() < 0.5 ? 1 : -1;
  const lo = passo === 1 ? 1 : 1 + (ondas - 1), hi = passo === 1 ? max - (ondas - 1) : max;
  return { inicio: lo + Math.floor(sorte() * (hi - lo + 1)), passo };
}
