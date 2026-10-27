// THE ENEMIES' DEBRIS — the numbers (26/10, his ask: *"Já faça uma separação dos inimigos, elites, mini boss e boss do
// jogo para aplicarmos efeitos de dano, explosões, derrotas decentes iguais ao das naves"*). The technique is the
// ship's (`docs/DESTROCOS.md`); here are the CLASSES (how often a thing dies decides how much its death may take),
// the MATERIALS (what it is made of decides its colours), the VARIATIONS on the table for him to choose, and the
// hull loss by HP thresholds. Times in seconds of game time, speeds in px/s of the native 384×216.

/** How often it dies: a drone dies dozens of times a phase, a boss once. */
export type Classe = 'comum' | 'elite' | 'mini' | 'chefe';
/**
 * What it is made of: METAL burns (the PixelLab explosion's own palette, the fireball under the debris); LUZ is a
 * living glow that goes out in its own colour (the jellyfish: an electric discharge, no fire); CARNE tears in chunks
 * and droplets (the Tubo, the pupa, the fly: no fire, no white); BIOMEC is flesh with plates (the Larva, the squid):
 * the flesh's cut, and a small fireball. ROCHA (27/10, the F2 belt) has no fire at all: gravel, dust, and a fresh face
 * a little lighter than the weathered one.
 */
export type Material = 'metal' | 'luz' | 'carne' | 'biomec' | 'rocha';
/** The death shapes (geometry); the material paints them. `rocha`: a rock breaking in the vacuum (`DESTROCOS.rocha`). */
export type Estilo = 'lascas' | 'meio' | 'carcaca' | 'ruptura' | 'estilhacos' | 'desintegra' | 'rocha';
/** How a rock breaks (27/10, for him to choose in the film): R1 the fracture, R2 the crumble, R3 split in two. */
export type VarianteRocha = 'hoje' | 'R1' | 'R2' | 'R3';

/**
 * THE BELT'S PIECES (27/10, his ask: *"pensa no asset como um asset destrutível, cada pixel é um pedacinho dele que pode
 * tomar dano e se desfazer"*, and his picks: the F2 belt and the ships' wrecks; the hardness by material). Each shot
 * marks them as it marks an enemy (`Destrocos.marcar`). `dureza` = px of hit per pixel taken (a wreck's metal: a pixel
 * every 2nd shot). `rocha` = it dies breaking like a rock (the PixelLab explosion stays over it). The wreck stays
 * indestructible: it only loses pixels. The F4's wreck is the fleet swallowed — steel taken by tissue: `biomec`
 * (`materialF4`).
 */
export const PECAS: Record<string, { classe: Classe; material: Material; dureza: number; rocha?: boolean; materialF4?: Material }> = {
  asteroid: { classe: 'comum', material: 'rocha', dureza: 1, rocha: true },
  mineravel: { classe: 'comum', material: 'rocha', dureza: 1, rocha: true },
  destroco: { classe: 'comum', material: 'metal', dureza: 2, materialF4: 'biomec' },
  mina: { classe: 'comum', material: 'metal', dureza: 1 },
  sensor: { classe: 'comum', material: 'metal', dureza: 1 },
};
/** A variation on the table: `hoje` is today's death (the PixelLab explosion alone), for the comparison. */
export type Variante = 'hoje' | 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1';

/** THE SEPARATION: each enemy kind in its class, with its material (from the study board `scripts/_inimigos/_prancha.mjs`). */
export const SEPARACAO: Record<string, { classe: Classe; material: Material }> = {
  drone: { classe: 'comum', material: 'metal' },
  batedor: { classe: 'comum', material: 'metal' },
  canhoneira: { classe: 'comum', material: 'metal' },
  kamikaze: { classe: 'comum', material: 'metal' },
  cargueiro: { classe: 'comum', material: 'metal' },
  aguaViva: { classe: 'comum', material: 'luz' },
  pupa: { classe: 'comum', material: 'carne' },
  mosca: { classe: 'comum', material: 'carne' },
  droneMineracao: { classe: 'elite', material: 'metal' },
  sentinela: { classe: 'elite', material: 'metal' },
  cacador: { classe: 'elite', material: 'biomec' },
  larva: { classe: 'elite', material: 'biomec' },
  tubo: { classe: 'elite', material: 'carne' },
  aranha: { classe: 'mini', material: 'metal' },
};

/**
 * THE BOSSES AND THE DOLPHIN (27/10, his choice: *"C1, D1"*, with the recommendation — D1 on the Capitânia and the
 * Serpente; the Torre, the Guardião and the Predador had approved deaths, so they only take the bites during the fight).
 * `morte` = the death becomes the break-up in its own pixels (the class's variation); false = the approved death stays.
 * `furo: false` = the bite tears a piece off but leaves no hole: a hole lives in the frame's pixels, and a body that
 * changes pose too much would carry it to the wrong place (the predator walks, slashes, hangs from the ceiling; the
 * dolphin flips).
 */
export const CHEFOES: Record<string, { classe: Classe; material: Material; morte: boolean; furo: boolean }> = {
  torre: { classe: 'chefe', material: 'metal', morte: false, furo: true },
  capitania: { classe: 'chefe', material: 'metal', morte: true, furo: true },
  serpente: { classe: 'chefe', material: 'biomec', morte: true, furo: true },
  guardiao: { classe: 'chefe', material: 'biomec', morte: false, furo: true },
  predador: { classe: 'chefe', material: 'carne', morte: false, furo: false },
  golfinho: { classe: 'mini', material: 'biomec', morte: true, furo: false },
};

/** The variations of each class, in the order of the sheet; the first after `hoje` is my recommendation. */
export const VARIANTES: Record<Classe, Variante[]> = {
  comum: ['hoje', 'A1', 'A2', 'A3'],
  elite: ['hoje', 'B1', 'B2'],
  mini: ['hoje', 'C1', 'C2'],
  chefe: ['hoje', 'D1'],
};
/** HIS CHOICE (27/10: *"Vou com a sua recomendação: A1 e A3 misto, B1, C1, D1"*): each class's death. */
export const PADRAO: Record<Classe, Variante> = { comum: 'A1', elite: 'B1', mini: 'C1', chefe: 'D1' };
/**
 * The kinds that die apart from their class (the "misto" of the commons): the big ones — the gunship and the carrier —
 * char and tumble before they pop (A3); the carrier's wreck was the best moment of the films.
 */
export const PADRAO_DO_TIPO: Partial<Record<string, Variante>> = { canhoneira: 'A3', cargueiro: 'A3' };

/**
 * Each variation's death shape. A1 the burst into a few pieces of the enemy itself; A2 cut in half by the shot; A3
 * the burning wreck that tumbles off and only then pops; B1 the break-up (pops along the body, then big parts — the
 * X-Aelo's death, small); B2 the shatter with a freeze of 45 ms; C1/C2 the break-up / the wreck, with the slow motion;
 * D1 the boss: wounds that stay, pops along them, and the break-up in big sections. The LUZ always comes apart in
 * embers (`desintegra`): a jellyfish has no hull to break.
 */
export const ESTILO_DA_VARIANTE: Record<Exclude<Variante, 'hoje'>, Estilo> = {
  A1: 'lascas',
  A2: 'meio',
  A3: 'carcaca',
  B1: 'ruptura',
  B2: 'estilhacos',
  C1: 'ruptura',
  C2: 'carcaca',
  D1: 'ruptura',
};

export const DESTROCOS = {
  mundo: {
    gravidade: 170,
    arrasto: { atmosfera: 0.9, vacuo: 0.25 },
    /** the push to the left: the world scrolls, the wreck stays behind */
    deriva: { atmosfera: -40, vacuo: -22 },
    /** how much of the enemy's own speed the debris keep */
    herda: 0.45,
  },
  /** the size of an effect grows with the body, between these (n = the body's opaque pixels in game px) */
  porte: (n: number): number => Math.min(2.2, Math.max(0.55, Math.sqrt(n) / 18)),

  /**
   * A1 — a few pieces of the enemy itself out of a small fireball. Quick: 0.5–0.7 s. (The fireball at 0.42 was too
   * small to read the death at a glance in the 1st film: the dark pieces alone vanish on a dark sky.)
   */
  lascas: { pecas: [3, 6] as [number, number], pxPorPeca: 90, torto: 2, vel: [34, 72], giro: [2, 7], calor: 0.35, somem: [0.42, 0.7], someEm: 0.22, bola: 0.62, fumacaMin: 20 },
  /** A2 — cut in two along a ragged line; the halves part, spinning opposite, the cut glowing and smoking. */
  meio: { torto: 3.5, separa: [28, 44], giro: [2.5, 5], calor: 0.6, somem: [0.75, 1.0], someEm: 0.3, bola: 0.32 },
  /** A3 — the wreck: chars, tumbles off course trailing smoke, and pops into pieces at `estoura`. */
  carcaca: { estoura: 0.45, queda: 70, giro: [3, 5.5], fumaca: 0.04, bola: 0.55 },
  /**
   * B1/C1/D1 — pops along the body, then the break-up in sections (more seeds the bigger the body) and chips off the
   * cut. The 1st film's pops (0.32) and blast (0.6) made the elite's break-up weaker than the plain explosion; a
   * boss's blast is ×`chefe` (the big sheet, behind the pieces).
   */
  ruptura: { estalos: [0, 0.16], estalo: 0.45, partirEm: 0.3, torto: 3.5, vel: [22, 48], giro: [0.8, 3.4], lascas: 0.28, calor: 0.8, somem: [1.1, 1.5], someEm: 0.4, bola: 0.85, chefe: 1.3 },
  /** B2 — the hull goes white and shatters at once. The scene freezes 45 ms (`congelaMs`). */
  estilhacos: { clarao: 0.05, distMin: 6, torto: 2.5, vel: [26, 60], giro: [1, 4.5], calor: 0.6, somem: [0.9, 1.3], someEm: 0.35, bola: 0.55, congelaMs: 45 },
  /** LUZ — a front crosses the body from the shot's side; every pixel lets go as an ember of its own glow. */
  desintegra: { queima: [0.32, 0.7] as [number, number], borda: 0.05, vel: [10, 40], vida: [0.35, 0.9] },
  /**
   * ROCHA — a rock breaking in the vacuum (27/10, his ask: *"o estilhaçar dela precisa ser algo mais parecido como
   * estilhaçar uma rocha no espaço. Para não ter um estilhaço igual ao dos inimigos"*). Against the enemies' A1: no
   * fireball of its own (the PixelLab explosion goes over it, as today), no glowing cut, no smoke — the cut is a FRESH
   * face a little lighter, flashing pale a moment; the pieces are angular (the cut barely bends), drift slowly and turn
   * slowly, and the vacuum keeps them; gravel off the cuts, and a ring of dust that hangs and thins out.
   *   R1 the fracture: four to seven blocks; R2 the crumble: many small pieces in a cloud; R3 split in two or three.
   * `pecas` [min, max] and `pxPorPeca` the count; `vel` px/s out; `giro` rad/s; `somem` when they start going (s);
   * `cascalho` the share of the cut's pixels that fly as gravel; `poeira` puffs of dust; `clarao` the pale flash (s).
   */
  rocha: {
    /**
     * HIS CHOICE (27/10: *"Vou com R2 para as rochas grandes e R3 para as pequenas. Mas faça com que os pedaços
     * desapareçam mais rápido"*): a rock of `pxGrande` opaque px or more, as drawn, crumbles (R2); a smaller one
     * splits (R3). An asteroid (~500 px at 1×, drawn at 0.7–1.9×) is big from ~1.3× on; the mining rock (~4800) is big.
     */
    pxGrande: 850,
    torto: 0.9,
    clarao: 0.12,
    /** the gravel and the dust, shorter with his "mais rápido" (they were 0.6–1.5 s and 0.9–1.7 s) */
    vidaCascalho: [0.35, 0.7] as [number, number],
    vidaPoeira: [0.5, 0.9] as [number, number],
    R1: { pecas: [4, 7] as [number, number], pxPorPeca: 70, vel: [12, 30] as [number, number], giro: [0.4, 2.2] as [number, number], somem: [0.7, 1.0] as [number, number], someEm: 0.3, cascalho: 0.35, poeira: 9 },
    R2: { pecas: [8, 16] as [number, number], pxPorPeca: 28, vel: [16, 42] as [number, number], giro: [1, 4] as [number, number], somem: [0.45, 0.75] as [number, number], someEm: 0.25, cascalho: 0.6, poeira: 16 },
    R3: { pecas: [2, 3] as [number, number], pxPorPeca: 400, vel: [8, 18] as [number, number], giro: [0.3, 1.2] as [number, number], somem: [0.6, 0.9] as [number, number], someEm: 0.3, cascalho: 0.5, poeira: 6 },
  },
  /** CARNE — the spray of droplets that goes with the chunks (per body pixel), and how heavy a droplet is. */
  carne: { gotasPorPx: 0.22, velGota: [30, 95], vidaGota: [0.35, 0.9], gravidadeGota: 0.6 },

  /**
   * THE HIT'S MARK (27/10, his idea: *"um tiro tira 1 px e explosões pequenas 3 px e maiores 4 px. Ser simbólico mas dar
   * um efeito que, os tiros realmente tiram pixels e explosões também"*): every hit that does not kill takes `px` pixels
   * off the body, on the face it came from, and they fly off in their own colour. The burn and the shock have no side
   * to come from: they take none. 27/10 (his report from the guardian, the tower, the serpent): the pixel is the first
   * one of the body on the hit's own line — the EDGE, *"cada tiro tira 1 px da borda do asset"* —, and every blow is
   * replayed on each frame of the animation, so the mark stays on the edge whatever the pose (`Destrocos.marcar`).
   */
  marca: {
    /**
     * px per hit: the bomb 4, an explosion or the missile 3, a shot its damage (1 to 3: the lance digs more — 27/10,
     * his pick "pelo material": the strong weapon digs deeper, a hard body resists, `dureza`)
     */
    px: (fonte: string, dano = 1): number =>
      fonte === 'bomba' ? 4 : fonte.startsWith('explos') || fonte === 'missil' ? 3 : Math.min(3, Math.max(1, Math.round(dano))),
    /** the pixel flies off this fast (px/s), for this long (s) */
    vel: [30, 75] as [number, number],
    vida: [0.3, 0.6] as [number, number],
    /** the rim of a mark is hot this long, then charred (no ember flicker: a hundred marks would be a hundred embers) */
    calor: 0.25,
    /**
     * THE NOTCH (27/10, his rule: each shot takes 1 px off the asset's EDGE): a hit eats the first pixel on its own
     * line, and when that lane is already this many px deeper than a neighbour, the neighbour goes first — a narrow V
     * that deepens slowly (a wide shave never goes through; a lane alone is a laser slit). Going through a 10 px plate
     * takes ~30 hits on one place and a 40 px wreck ~500 (the estimate he agreed to): not at a phase's pace.
     */
    sulco: 3,
    /** the lanes on each side of the hit the V may spread to */
    alcance: 8,
    /** a part a cut leaves hanging falls off when it is up to this share of the body (bigger: it is still the body) */
    ilha: 0.2,
    /** how far (px) a frame's art may sit from the first frame's — a body that bobs in its frame (the guardian: 3) */
    registro: 4,
  },

  /**
   * THE HULL LOSS BY HP (the measure here IS the life bar: an enemy's HP is fixed per kind, so a share of it is an
   * honest measure — unlike the player's lives, which vary). Crossing a threshold bites the body on the side the shot
   * came from; the bites STAY (the wreck shows what it took) and the wound smokes, sparks, drips or glows until it
   * dies. `fracao` of the body's pixels per bite, between `min` and `max`.
   *
   * ⚠️ 27/10, HIS CALL: the big bites only NEAR THE DEATH (*"as patas saírem pode ser no momento final antes de
   * matá-la ... os danos já serão visíveis com os tiros"*). The marks show the fight; the bite says it is about to go
   * (the spider's legs fall in its last fifth). Before, three to six bites spread over the fight, and on a body that
   * moves the hole stayed in the frame while the part moved on.
   */
  lasca: {
    comum: { limiares: (hp: number): number[] => (hp <= 3 ? [0.5] : [0.3]), fracao: 0.1, min: 6, max: 30, ferida: 0.22 },
    elite: { limiares: (): number[] => [0.2], fracao: 0.08, min: 10, max: 50, ferida: 0.12 },
    mini: { limiares: (): number[] => [0.2, 0.1], fracao: 0.05, min: 14, max: 90, ferida: 0.08 },
    chefe: { limiares: (): number[] => [0.15, 0.06], fracao: 0.03, min: 40, max: 240, ferida: 0.06 },
    torto: 1.4,
    /** the bitten piece leaves the body at this speed (px/s), spinning */
    vel: [40, 70] as [number, number],
    giro: [3, 6] as [number, number],
    /** the rim glows (hot metal, wet flesh, living light) this long, then stays charred / dark */
    calor: 0.4,
    /** the blast of a bite (metal), per class: a boss's death chain is made of these */
    estouro: { comum: 0.28, elite: 0.36, mini: 0.5, chefe: 0.95 } as Record<Classe, number>,
  },

  /** The smoke, drawn in pixels (the ship's: `MORTE.fumaca`), per material. */
  fumaca: { vida: [0.45, 1.0] as [number, number], raio: [1, 3.8] as [number, number], densidade: 0.6, cada: 0.06 },
};
