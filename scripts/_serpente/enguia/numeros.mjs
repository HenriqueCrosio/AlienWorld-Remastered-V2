// 07/11 — THE COLOSSAL EEL'S MOCK (spec `2026-11-03-serpente-grande-enguia-design.md` §7.1, plan
// `plans/2026-11-07-serpente-grande-enguia.md` Part A): every number of the mock in one place. The spec's numbers are
// copied as written; the rest are the mock's PROPOSALS (marked), for him to judge on the video.
export const N = {
  tela: { W: 384, H: 216, fps: 30 },
  crista: 151,
  // the breach: the hole in the lip texture (`serpente-rombo-labio.png`, origin (0.5, 1) at x 300, y 216)
  // (`topo`: below it, inside the hole's columns, she is in the den — behind the lip's raised plates, which reach y ~118)
  rombo: { x: 290, x0: 245, x1: 332, topo: 120, labio: { x: 140, y: 116 } },
  // the ship: FreeController.SPEED, GameScene.HITBOX_NAVE, the PULSE (rate 7, speed 300)
  nave: { vel: 110, hit: { w: 21, h: 9 }, casa: { x: 70, y: 100 }, lim: { x0: 14, x1: 300, y0: 10, y1: 206 }, nariz: 12 },
  tiro: { cada: 1 / 7, vel: 300 },
  // the body: measured on the approved art (the head + neck 84 px from snout to neck; ~18 rings of 26 px)
  // (2nd round: 20 rings — the spec's top — so the post's trick still has the body down the whole right edge)
  corpo: { aneis: 20, passo: 26, cabeca: 84 },
  // PROPOSAL: the speeds (px/s) and the ramps at rest ends (s)
  // (`escondido`: nothing of her on screen — the trip under the breach between the dive and the rise)
  // (07/11, 2nd round: `afunda` — she sinks whole into the breach before the geysers; ramps with a smooth (cosine) push)
  vel: { passagem: 230, chegada: 160, rombo: 200, afunda: 260, sob: 140, escondido: 1500, recua: 120, rampa: 0.6 },
  // the slither (2nd round, his "mais fluido, como uma serpente se esgueirando"): a wider S on every path she swims,
  // and a wave running down her body all the time (the head steady, the tail swinging the most)
  onda: { A: 14, lambda: 200 }, respira: { A: 4.5, lambda: 120, w: 2.6, ate: 120 },
  // the body as a tube: a sample every `passo` px of arc (drawn), every `toque` px for the touch
  tubo: { passo: 2, toque: 10 },
  // (2nd round: the dotted warning is out) before she leaves rest: the head draws back (visible) or the breach trembles
  // and breathes dust with her eye's glow down in it (hidden) — this long
  prepara: { dur: 0.6, giro: 0.24 },
  // spec §3 — the fire pipes (2nd round: his "aprovo o primeiro aviso ser 1,8s")
  canos: { faixas: [0, 54, 108, 162, 216], aviso: [1.8, 1.1, 0.7], frente: 0.15, queima: 0.6, entre: 0.4, brasa: 0.5, antes: 0.6 },
  // spec §4 — the Echo (the final one faster: PROPOSAL)
  // (`voo`: the seeds fly straight, all in the same time — PROPOSAL)
  // (2nd round: ONE round per cycle — his "pode ser um ciclo do Eco")
  eco: { leitura: 2.0, sementes: 5, voo: 0.45, minIdade: 0.4, vista: 0.6, intervalo: 0.25, raio: 15, fere: 0.2, rodadas: 1,
    entre: 0.6, giro: 30, final: { leitura: 1.4, intervalo: 0.18, rodadas: 1 } },
  // spec §5 — the geysers
  // (the bump and the crack are the living hull's, `cascoVivo.ts`: the R3 he approved — the band's columns pushed up
  // over her, `amp` px at the crest fading `fundo` px down, `larg` wide; the crack on the panel's row 168 ±5, healing
  // from the breach in `cura` s)
  // (4th round, his note: the first geyser was too close to the breach — it starts at x 220, every 55 px, and the bump
  // runs on to x 20 so the passage still has 7)
  geiser: { passo: 55, aviso: 0.45, coluna: 0.5, largura: 16, topo: 70, vapor: 0.9, inicio: 220, fim: 20, yLombada: 168,
    lombada: { amp: 4, larg: 9, fundo: 46 }, cura: 2.5 },
  // spec §6 — the bites (rings off the tail) and the scripted life of the mock (PROPOSAL: when each threshold falls)
  mordida: { aneis: 3 },
  ciclos: 2, // two whole cycles, then the third's canos until the 5% bite
};
export const LCG = (semente) => { let a = semente >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
