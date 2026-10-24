// 23/10 — round 2a: the three ship lines as PART LISTS on the 44×26 frame (nose to the RIGHT, flame on the left).
// Each tier is the tier below plus parts you can see in the silhouette. Draw order = list order (later on top).
// Materials: hull (top-lit body, three tones + rim) · far (the far side, a step darker) · plane / farplane (a flat
// plate facing the light: wings, fins) · dark (metal) · glass · amber (energy: the light grows with the tier) ·
// flame (needs `eixo`, its axis row) · seam (a panel line) · cut (erases).
// `costura`: the part gets a dark seam where it overlaps an earlier part (plates read as plates).
const P = (mat, pts, o = {}) => ({ mat, pts, ...o });
const R = (mat, x0, y0, x1, y1, o = {}) => ({ mat, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], ...o });
const E = (mat, cx, cy, rx, ry, o = {}) => ({ mat, ell: [cx, cy, rx, ry], ...o });
/** A flame: tip at x0, nozzle at x1, axis cy, half height h. */
const FL = (x0, cy, x1, h) => ({ mat: 'flame', pts: [[x0, cy], [x1, cy - h], [x1, cy + h]], eixo: cy });
/** One amber running light / window, w×h px with its top-left pixel at (x, y). */
const LUZ = (x, y, w = 2, h = 1) => R('amber', x, y, x + w, y + h);
const C = { costura: true };

// ── LINE 1 · CAÇA — today's fighter, the ladder fixed: the T1 back in the family, the T3 a visible reward.
// References (principle only): today's T0/T2 (3/4 side view, big swept wing planes carry the light), the F-14/Su-27
// twin tail, the Gradius Vic Viper needle nose. ──
const caca = [
  // T0 · one wing: needle nose, one big swept wing, the tail fin, one small engine, only the cockpit lit
  [
    FL(1, 13, 5.5, 1.2),
    R('dark', 5, 11.4, 8, 14.6),
    P('hull', [[7.5, 11], [14, 10.5], [24, 10.6], [30, 11.2], [34, 12.1], [40.5, 13], [34, 13.7], [28, 14.3], [16, 14.8], [7.5, 14.7]]),
    P('plane', [[16.5, 10.8], [10, 5.6], [7.5, 5.6], [8.5, 11]], C),
    P('plane', [[26, 14.2], [12.5, 21.2], [9, 21.2], [11.5, 14.2]], C),
    P('glass', [[23, 10.9], [25.5, 9.2], [29, 9.4], [31.5, 11.4], [27, 11.5]]),
    R('seam', 19, 11.5, 20, 14.4),
  ],
  // T1 · two wings: the far wing shows above, longer body, bigger canopy and engine, one running light
  [
    P('farplane', [[28, 10.8], [16, 4.4], [12.5, 4.4], [14, 10.8]]),
    FL(0, 13, 5, 1.5),
    R('dark', 4.5, 11.2, 7.5, 14.8),
    P('hull', [[7, 10.8], [14, 10.3], [25, 10.4], [31, 11], [35, 11.9], [41.5, 13], [35, 13.8], [29, 14.5], [16, 15], [7, 14.9]]),
    P('plane', [[15.5, 10.6], [9, 5.2], [6.5, 5.2], [8, 10.8]], C),
    P('plane', [[28, 14.4], [13.5, 22], [9.5, 22], [12, 14.4]], C),
    P('glass', [[24, 10.7], [26.5, 8.8], [30.5, 9], [33, 11.2], [28, 11.3]]),
    R('seam', 19, 11.4, 20, 14.6),
    LUZ(21, 12, 3),
  ],
  // T2 · canards + twin engine + twin tail: two flames, the ventral fin, bigger wings, two lights
  [
    P('farplane', [[29, 10.6], [16.5, 3.4], [12.5, 3.4], [14, 10.6]]),
    P('farplane', [[35, 11.2], [31.5, 8], [29.8, 8], [30.8, 11.2]]),
    FL(0, 11.4, 4, 1.2), FL(0, 14.6, 4, 1.2),
    R('dark', 3.5, 9.8, 7, 12.8), R('dark', 3.5, 13.2, 7, 16.2),
    P('hull', [[6.5, 10.4], [14, 9.9], [26, 10], [32, 10.7], [36, 11.7], [42.5, 13], [36, 13.9], [30, 14.7], [16, 15.4], [6.5, 15.4]]),
    P('plane', [[14.5, 10.2], [8.5, 4.4], [6, 4.4], [7.5, 10.4]], C),
    P('plane', [[13, 15.2], [8.5, 19], [6.5, 19], [7.5, 15.2]], C),
    P('plane', [[29, 15], [14.5, 22.8], [10, 22.8], [12.5, 15]], C),
    P('plane', [[35.5, 13.8], [32, 17.4], [30.3, 17.4], [30.8, 14.2]], C),
    P('glass', [[25, 10.4], [27.5, 8.4], [31.5, 8.6], [34, 11], [29, 11.1]]),
    R('seam', 18, 11, 19, 15), R('seam', 24, 11.2, 25, 14.8),
    LUZ(19, 12), LUZ(26, 12),
  ],
  // T3 · the reward: wingtip gun pods top and bottom, a cannon under the nose, afterburners, three lights
  [
    P('farplane', [[29, 10.6], [16.5, 4], [12.5, 4], [14, 10.6]]),
    R('dark', 10.5, 2.4, 21.5, 4.2, C), R('amber', 21, 2.4, 22.5, 4.2),
    P('farplane', [[35, 11.2], [31.5, 8], [29.8, 8], [30.8, 11.2]]),
    FL(0, 11.4, 4.5, 1.6), FL(0, 14.6, 4.5, 1.6),
    R('dark', 4, 9.6, 7, 13), R('dark', 4, 13, 7, 16.4),
    P('hull', [[6.5, 10.4], [14, 9.9], [26, 10], [32, 10.7], [36, 11.7], [42, 13], [36, 13.9], [30, 14.7], [16, 15.4], [6.5, 15.4]]),
    R('dark', 29, 14.8, 43, 16.2, C), R('amber', 42, 14.8, 43, 16.2),
    P('plane', [[14.5, 10.2], [8.5, 4.4], [6, 4.4], [7.5, 10.4]], C),
    P('plane', [[13, 15.2], [8.5, 19], [6.5, 19], [7.5, 15.2]], C),
    P('plane', [[29, 15], [14.5, 22.2], [10, 22.2], [12.5, 15]], C),
    R('dark', 8.5, 22, 20, 23.8, C), R('amber', 19.5, 22, 21, 23.8),
    P('plane', [[35.5, 13.8], [32, 17.4], [30.3, 17.4], [30.8, 14.2]], C),
    P('glass', [[25, 10.4], [27.5, 8.4], [31.5, 8.6], [34, 11], [29, 11.1]]),
    R('seam', 16, 11, 17, 15), R('seam', 24, 11.2, 25, 14.8),
    LUZ(18, 12), LUZ(21.5, 12), LUZ(26, 12),
  ],
];

// ── LINE 2 · GÓTICA DEITADA — the cathedral laid along the flight with its towers pointing FORWARD: the spires are
// the nose (one, then the fork; the shot leaves from between them), the rose window is the cockpit glass at the
// facade, the buttresses are fins swept back, the apse is the engine. The T3 closes a flying buttress (an open
// arch) over the back. References (principle only): the facade and side elevation of a gothic cathedral (twin
// spires, rose, buttresses, pinnacles), the Warhammer 40k Imperial Navy fighters (gothic on a horizontal fighter),
// the Gradius Vic Viper and R-Type R-9 (the forked nose that the shot leaves from). ──
const gotica = [
  // T0 · chapel: ONE spire as the nose, the rose as the cockpit, one buttress fin, one small engine
  [
    FL(1, 13, 5.5, 1.2),
    R('dark', 5, 11.6, 8, 14.6),
    P('hull', [[7, 11], [16, 10.5], [26, 10.6], [30, 11], [32, 11.6], [32, 14.4], [30, 14.9], [16, 15.2], [7, 14.8]]),
    P('plane', [[31, 11.2], [41.5, 13], [31, 14.6]], C),
    P('plane', [[24, 10.8], [17, 5.8], [14, 5.8], [16, 10.6]], C),
    P('plane', [[20, 15], [15, 18.4], [12.5, 18.4], [14, 15]], C),
    E('glass', 29.6, 12.9, 1.5, 1.5),
  ],
  // T1 · church: the fork begins (a long spire over a short one), a second buttress fin, two windows
  [
    FL(0.5, 13, 5.5, 1.4),
    R('dark', 5, 11.4, 8, 14.8),
    P('hull', [[7, 10.6], [16, 10.1], [26, 10.1], [30, 10.5], [32, 11], [32, 15.4], [30, 15.8], [16, 16], [7, 15.6]]),
    P('plane', [[31, 10.6], [42.5, 11.8], [31, 13]], C),
    P('plane', [[31, 14], [38.5, 15], [31, 15.8]], C),
    P('plane', [[24.5, 10.4], [17.5, 5], [14.5, 5], [16.5, 10.2]], C),
    P('plane', [[12.5, 10.4], [8.5, 6.8], [6.5, 6.8], [7.5, 10.6]], C),
    P('plane', [[21, 15.8], [15.5, 19.6], [12.5, 19.6], [14.5, 15.8]], C),
    E('glass', 29.4, 12.8, 1.6, 1.6),
    LUZ(19, 12, 1, 2), LUZ(23, 12, 1, 2),
  ],
  // T2 · abbey: the full fork (two spires, the shot between them), three buttress fins, a bigger engine, four windows
  [
    FL(0, 13, 5, 1.7),
    R('dark', 4.5, 11.2, 8, 15.2),
    P('hull', [[6.5, 10.2], [16, 9.6], [27, 9.6], [31, 10], [33, 10.5], [33, 15.8], [31, 16.2], [16, 16.4], [6.5, 16]]),
    P('plane', [[32, 10], [43, 11.2], [32, 12.6]], C),
    P('plane', [[32, 14], [41, 15.2], [32, 16.2]], C),
    R('amber', 33, 13, 34, 14),
    P('plane', [[25, 10], [17.5, 4.2], [14, 4.2], [16, 9.8]], C),
    P('plane', [[12.5, 10], [8, 5.8], [5.5, 5.8], [7, 10.2]], C),
    P('plane', [[23, 16.2], [16, 21], [12.5, 21], [15, 16.2]], C),
    E('glass', 30.2, 12.9, 1.7, 1.7),
    LUZ(14, 12, 1, 2), LUZ(17.5, 12, 1, 2), LUZ(21, 12, 1, 2), LUZ(24.5, 12, 1, 2),
  ],
  // T3 · cathedral: longer spires, the flying buttress closing an OPEN arch over the back, pinnacles on the fins,
  // twin engines, the rose ringed in amber, six windows
  [
    FL(0, 11.2, 4.5, 1.5), FL(0, 14.8, 4.5, 1.5),
    R('dark', 4, 9.6, 7.5, 12.8), R('dark', 4, 13.2, 7.5, 16.4),
    P('plane', [[6, 5.6], [18, 4], [19, 5.4], [6.5, 6.8]], C),
    P('hull', [[6.5, 10], [16, 9.4], [27, 9.4], [31, 9.8], [33, 10.3], [33, 16], [31, 16.4], [16, 16.6], [6.5, 16.2]]),
    P('plane', [[32, 9.8], [45.5, 11], [32, 12.6]], C),
    P('plane', [[32, 14], [43.5, 15.3], [32, 16.4]], C),
    R('amber', 33, 13, 35, 14),
    P('plane', [[25.5, 9.8], [18, 3.6], [14.5, 3.6], [16.5, 9.6]], C),
    P('plane', [[11, 9.8], [6.5, 5.2], [4, 5.2], [5.5, 10]], C),
    P('plane', [[17.5, 3.8], [15.5, 1.6], [19.5, 3.6]]),
    P('plane', [[23.5, 16.4], [16, 21.6], [12, 21.6], [15, 16.4]], C),
    P('plane', [[13, 21.4], [10, 23.2], [15, 21.6]]),
    E('amber', 30.2, 13, 2.2, 2.2),
    E('glass', 30.2, 13, 1.3, 1.3),
    LUZ(12, 12, 1, 2), LUZ(15, 12, 1, 2), LUZ(18, 12, 1, 2), LUZ(21, 12, 1, 2), LUZ(24, 12, 1, 2), LUZ(27, 12, 1, 2),
  ],
];

// ── LINE 3 · PESADA — the fat engine: a chunky hull, a bubble canopy, engines as pods, guns you can see.
// References (principle only): the Metal Slug Slug Flyer (chunky, big canopy, visible guns), the A-10 (engine
// pods high at the back, the nose gun), the R-Type R-9 (compact, bubble canopy). ──
const pesada = [
  // T0 · tug: short chunky hull, big bubble canopy, ONE fat engine pod on top at the back, stubby wing
  [
    FL(2, 9.6, 6.5, 2),
    E('hull', 13.5, 9.6, 6.2, 2.7),
    E('dark', 7.6, 9.6, 1.3, 2.1),
    P('hull', [[10, 10.8], [20, 10.2], [28, 10.4], [32.5, 11.6], [36, 13.5], [33.5, 15.6], [26, 16.6], [13, 16.6], [10, 15]], C),
    E('glass', 27.5, 10.6, 3.8, 2.3),
    P('plane', [[16, 15.8], [23, 15.8], [20.5, 18.8], [15, 18.8]], C),
    R('seam', 19, 12, 20, 16),
  ],
  // T1 · + a chin gun, the engine grows, a second (far) stub wing, one light on the pod
  [
    P('farplane', [[17, 11], [24, 11], [22, 8.2], [17.5, 8.2]]),
    FL(0.5, 9.3, 5.5, 2.3),
    E('hull', 13, 9.3, 7.3, 3.1),
    E('dark', 6.2, 9.3, 1.5, 2.5),
    P('hull', [[9.5, 10.8], [20, 10.2], [29, 10.4], [34, 11.6], [37.5, 13.5], [35, 15.6], [27, 16.8], [12, 16.8], [9.5, 15]], C),
    R('dark', 27, 16.2, 39.5, 17.6, C),
    E('glass', 28.5, 10.6, 4, 2.4),
    P('plane', [[15, 16], [25, 16], [22, 19.6], [14, 19.6]], C),
    R('seam', 20, 12, 21, 16),
    LUZ(14, 8, 3),
  ],
  // T2 · twin engine pods (top and bottom), a gatling with its housing, an armour plate, two lights
  [
    FL(0, 9, 5, 2.3), FL(0, 17.5, 5, 2),
    E('hull', 12.5, 9, 7.5, 3.1),
    E('dark', 5.6, 9, 1.5, 2.5),
    E('hull', 12, 17.5, 7, 2.7),
    E('dark', 5.6, 17.5, 1.4, 2.1),
    P('hull', [[9, 10.6], [20, 10], [30, 10.2], [35.5, 11.4], [39, 13.4], [36.5, 15.6], [28, 16.6], [14, 16.6], [9, 15]], C),
    R('dark', 27, 15.2, 33, 18.6, C), R('dark', 33, 15.8, 41.5, 17.8), R('amber', 40.5, 15.8, 41.5, 17.8),
    P('plane', [[17, 11.6], [27, 11.6], [26, 15], [18, 15]], C),
    E('glass', 30, 10.4, 4.2, 2.5),
    LUZ(14, 7.6, 3), LUZ(13, 17, 3),
  ],
  // T3 · two big engines with big flames, a gun pod on the wing, a heavier gatling, glowing vents
  [
    P('farplane', [[18, 10.8], [26, 10.8], [24, 6.6], [19, 6.6]]),
    FL(0, 8.8, 5, 2.7), FL(0, 17.6, 5, 2.4),
    E('hull', 12.5, 8.8, 8, 3.4),
    E('dark', 5.4, 8.8, 1.6, 2.8),
    E('hull', 12.5, 17.6, 7.5, 3),
    E('dark', 5.6, 17.6, 1.5, 2.4),
    P('hull', [[9, 10.4], [20, 9.8], [30, 10], [35.5, 11.2], [39, 13.3], [36.5, 15.6], [28, 16.6], [14, 16.6], [9, 15]], C),
    R('dark', 26.5, 15, 33, 19, C), R('dark', 33, 15.4, 43, 16.8), R('dark', 33, 17.2, 42, 18.6),
    R('amber', 42, 15.4, 43, 16.8),
    P('plane', [[17, 11.4], [27, 11.4], [26, 15], [18, 15]], C),
    P('plane', [[20, 16.4], [28, 16.4], [26, 20.4], [20, 20.4]], C),
    R('dark', 19, 20.4, 31, 21.8, C), R('amber', 30, 20.4, 31, 21.8),
    E('glass', 30.5, 10.2, 4.2, 2.5),
    LUZ(10, 7.4), LUZ(13.5, 7.4), LUZ(17, 7.4),
  ],
];

export const LINHAS = { caca, gotica, pesada };
