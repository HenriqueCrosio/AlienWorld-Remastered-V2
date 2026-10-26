// 25/10 — THE NEW HUMAN LADDER, cut from the orange "a" (his pick: "pode seguir com a forma da laranja a"; path 1:
// cut the "a" itself, PixelLab only where a cut can't be fixed). One recipe per option; the tool is
// `_escada-recorte.mjs`. Coordinates are on the 48x32 frame of the "a". Its pieces (spec 2026-10-25 §2):
//   tail fin x5–9 y9–12 · top wing x9–19 y5–12 · lower wing x10–21 y19–26 · ventral strake x22–28 y19–22
//   body x6–43 y12–19 · canopy x27–37 y13–15 · needle nose x34–43 y15–18 · nozzle x9–13 y13–19 · flame x3–8 y14–19
// apagar: inclusive rects [x0,y0,x1,y1] to erase. fechar: close the outline where a piece came off (an erased pixel
// next to a kept non-outline pixel takes the outline colour of the "a"). pixels: [x,y,[sx,sy]] copies the colour of
// the "a" at (sx,sy) — touch-ups never invent a colour. alvo: the drawn box after `_encolher.mjs` (null = no shrink).
// proteger: x ranges no column seam may cut (`_encolher.mjs --proteger`): the nozzle, the canopy and the needle nose
// are the identity of the ship — unprotected, the T0 lost its needle (a grey run is the cheapest seam).
export const BASE = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito/gerado/laranja-48x32-21-00.png';

const ALETA = [5, 9, 9, 12];
const ASA_CIMA_TODA = [[10, 5, 19, 11], [9, 5, 9, 8]];
const NARIZ = '9-13,27-43';

export const RECEITAS = [
  // ─── T1 (~38x20) ───
  { id: 't1-a', tier: 1, nome: 'sem a aleta, as duas asas aparadas', apagar: [ALETA, [9, 5, 16, 6], [10, 25, 15, 26]], fechar: true, pixels: [], alvo: '38x20', proteger: NARIZ },
  { id: 't1-b', tier: 1, nome: 'a aleta fica, a asa de cima mais baixa', apagar: [[9, 5, 17, 8], [10, 24, 16, 26]], fechar: true, pixels: [], alvo: '38x20', proteger: NARIZ },
  { id: 't1-c', tier: 1, nome: 'sem a asa de cima, a de baixo inteira', apagar: [...ASA_CIMA_TODA], fechar: true, pixels: [], alvo: '38x20', proteger: NARIZ },
  { id: 't1-d', tier: 1, nome: 'as asas inteiras, sem a aleta, corpo curto', apagar: [ALETA], fechar: true, pixels: [], alvo: '38x20', proteger: NARIZ },
  // ─── T0 (~33x15) ───
  { id: 't0-a', tier: 0, nome: 'os dois tocos de asa, sem a aleta', apagar: [ALETA, [9, 5, 19, 10], [10, 22, 21, 26]], fechar: true, pixels: [], alvo: '33x15', proteger: NARIZ },
  { id: 't0-b', tier: 0, nome: 'uma asa (a de baixo, curta) e a aleta', apagar: [...ASA_CIMA_TODA, [10, 23, 17, 26]], fechar: true, pixels: [], alvo: '33x15', proteger: NARIZ },
  { id: 't0-c', tier: 0, nome: 'o dardo: só a aleta, sem asas', apagar: [...ASA_CIMA_TODA, [13, 19, 21, 26], [10, 20, 12, 26]], fechar: true, pixels: [], alvo: '33x15', proteger: NARIZ },
  { id: 't0-d', tier: 0, nome: 'o toco de cima e a asa de baixo curta', apagar: [ALETA, [9, 5, 19, 9], [10, 23, 17, 26]], fechar: true, pixels: [], alvo: '33x15', proteger: NARIZ },

  // ─── RODADA 1b (25/10, the answer to the sheet): "A T0 c ficou boa, mas a turbina pode ser menor um pouco. A T1 é
  // que precisamos refazer, pois ficaram muito parecidas com a T2 (a opção b da T1 ficou boa)." ───
  // T0 c with a smaller turbine: whole nozzle columns out (x10/x11 of the "a": the ring between the two outlines) and/or
  // the bottom row of the nozzle (it hangs below the belly) closed with the outline at y18, the flame's row 19 with it.
  ...[
    ['t0-c1', 'o bocal 1 coluna mais curto', [11], false],
    ['t0-c2', 'o bocal 2 colunas mais curto', [10, 11], false],
    ['t0-c3', 'o bocal 1 mais curto e 1 mais baixo', [11], true],
    ['t0-c4', 'o bocal 2 mais curto e 1 mais baixo', [10, 11], true],
  ].map(([id, nome, cols, baixo]) => ({
    id, tier: 0, rodada: '1b', nome,
    apagar: [...ASA_CIMA_TODA, [13, 19, 21, 26], [10, 20, 12, 26], ...(baixo ? [[3, 19, 13, 19]] : [])],
    fechar: true, semFechar: [[3, 19, 8, 19]],
    pixels: baixo ? [9, 10, 11, 12, 13].map((x) => [x, 18, [9, 5]]) : [],
    tirarColunas: cols, alvo: '33x15', proteger: '11-13,27-43',
  })),
  // T1 from b (the fin and the clipped top wing), each one step further from the T2, all shorter (36: T0 33 → T1 36 →
  // T2 41) and with a mid turbine (one nozzle column out: T0 small → T1 mid → T2 whole).
  ...[
    ['t1-e', 'a b, mais curta e com a turbina média', [[10, 24, 16, 26]]],
    ['t1-f', 'a b sem a asa de baixo', [[13, 19, 21, 26], [10, 20, 12, 26]]],
    ['t1-g', 'a b com a asa de baixo em toco', [[10, 22, 21, 26]]],
    ['t1-h', 'a b com as duas asas menores', [[10, 23, 17, 26], [9, 5, 18, 9]]],
  ].map(([id, nome, mais]) => ({
    id, tier: 1, rodada: '1b', nome,
    apagar: [[9, 5, 17, 8], ...mais],
    fechar: true, pixels: [], tirarColunas: [11], alvo: '36x17', proteger: '10-13,27-43',
  })),
];
