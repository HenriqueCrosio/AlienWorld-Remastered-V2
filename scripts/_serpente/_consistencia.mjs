// 02/11 — HER IDENTITY, FRAME BY FRAME (his: *"Eu preciso mesmo de uma consistência nas criações e, se você tem
// capacidade de verificar isso, verifique"* — after a generated flinch turned the green head into another kind of head).
// For every installed set, every frame, every living head: the head's own accent hue (the veins' `MATIZ`) around the
// head, against the same head in the form's approved frame — a head that turns into another loses its colour (the
// green's flinch: a long grey snout, its lights gone). The VULNERABLE head is measured within 36 art px of its skull
// (`gestosHab`), the others in their head's region above the neck. The approved sets' worst ratio per head (round 11's
// beam, round 13's gas, the cleaned shot clips, the rain) is the floor; a frame under 90% of it is flagged.
// What it does NOT see: a head that changes shape but keeps its lights, and the orange's mouth colour (its flesh
// palette is the neck plates' own palette, so a count can't tell a flesh tongue from the plates) — those are checked
// by eye on the zoomed sheets, every frame, before showing.
//   node scripts/_serpente/_consistencia.mjs [<medidas.json>]   (exits 1 when a NEW set has a flagged frame)
import fs from 'node:fs';
import sharp from 'sharp';

const { CONJUNTOS } = await import('../../src/entities/serpente/gestosHab.ts');
const [SAIDA] = process.argv.slice(2);
const L = 256, COLS = 8;
const CENTRO = { A: { x: 137, y: 133 }, B: { x: 137, y: 134.5 } };
const MATIZ = {
  ciano: { h: [168, 206], s: 0.35, v: 0.45 },
  verde: { h: [88, 166], s: 0.3, v: 0.4 },
  laranja: { h: [8, 50], s: 0.45, v: 0.4, quente: { s: 0.1, v: 0.82 } },
};
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
};
const doMatiz = (r, g, b, m) => {
  const [h, s, v] = hsv(r, g, b);
  return h >= m.h[0] && h <= m.h[1] && ((s >= m.s && v >= m.v) || (m.quente && s >= m.quente.s && v >= m.quente.v));
};
/** each head's region above its neck (canvas px): where its own accents live */
const REGIAO = {
  A: { ciano: (x, y) => x < 95 && y < 105, verde: (x, y) => x > 80 && x < 170 && y < 95, laranja: (x, y) => x > 140 && y < 115 },
  B: { verde: (x, y) => x > 45 && x < 170 && y < 95, laranja: (x, y) => x > 140 && y < 115 },
};
const VULNERAVEL = { A: 'ciano', B: 'verde' };
/** the vulnerable head's skull in the approved frame (art px from the centre, as `gestosHab` keeps it) */
const CRANIO0 = { A: { x: -84, y: -78 }, B: { x: 1, y: -91.5 } };

function cor(d, forma, cabeca, cranio) {
  let n = 0;
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const i = (y * L + x) * 4;
    if (d[i + 3] < 128) continue;
    const dentro = cranio ? Math.hypot(x - cranio.x, y - cranio.y) <= 36 : REGIAO[forma][cabeca](x, y);
    if (dentro && doMatiz(d[i], d[i + 1], d[i + 2], MATIZ[cabeca])) n++;
  }
  return n;
}

const ler = async (arq) => (await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const base = {};
for (const forma of ['A', 'B']) {
  const { data } = await ler(`public/sprites/serpente-erguer-${forma}-0.png`);
  const c0 = CENTRO[forma];
  base[forma] = Object.fromEntries(Object.keys(REGIAO[forma]).map((c) => {
    const cr = c === VULNERAVEL[forma] ? { x: CRANIO0[forma].x + c0.x, y: CRANIO0[forma].y + c0.y } : null;
    return [c, cor(data, forma, c, cr)];
  }));
}
console.log('o aprovado (px de cor de cada cabeça):', JSON.stringify(base));

const APROVADOS = ['tiroA', 'tiroC', 'tiroB', 'chuvaA', 'raioFechada', 'raioAberta', 'raioAbre', 'raioRecupera', 'gasAbreA', 'gasSopraA', 'gasCargaA', 'gasBoteA', 'gasFechaA', 'gasEncolheA'];
const medidas = {};
for (const [chave, c] of Object.entries(CONJUNTOS)) {
  const { data: folha, info } = await ler(`public/sprites/serpente-hab/${chave}.png`);
  const forma = c.forma, viva = VULNERAVEL[forma];
  medidas[chave] = [];
  for (let i = 0; i < c.quadros; i++) {
    const d = Buffer.alloc(L * L * 4), ox = (i % COLS) * L, oy = Math.floor(i / COLS) * L;
    for (let y = 0; y < L; y++) folha.copy(d, y * L * 4, ((oy + y) * info.width + ox) * 4, ((oy + y) * info.width + ox + L) * 4);
    const m = {};
    for (const cab of Object.keys(REGIAO[forma])) {
      const cr = cab === viva ? { x: c.cranio[i].x + CENTRO[forma].x, y: c.cranio[i].y + CENTRO[forma].y } : null;
      m[cab] = +(cor(d, forma, cab, cr) / Math.max(1, base[forma][cab])).toFixed(2);
    }
    medidas[chave].push(m);
  }
}
// the floor: the approved sets' worst colour ratio per head
const piso = {};
for (const k of APROVADOS) for (const m of medidas[k]) for (const [cab, v] of Object.entries(m)) piso[cab] = Math.min(piso[cab] ?? 99, v);
console.log('o piso dos aprovados:', JSON.stringify(piso));
const linhas = [];
let bandeiras = 0;
for (const [k, ms] of Object.entries(medidas)) {
  const ruins = [];
  ms.forEach((m, i) => { for (const [cab, v] of Object.entries(m)) if (v < piso[cab] * 0.9) ruins.push(`q${i} ${cab} ${v}`); });
  const aprovado = APROVADOS.includes(k) ? ' (aprovado)' : '';
  const l = `${ruins.length ? 'FALHA' : 'ok  '} ${k}${aprovado}: ${ruins.length ? ruins.slice(0, 6).join(' · ') + (ruins.length > 6 ? ` … +${ruins.length - 6}` : '') : 'cada cabeça com a sua cor em todos os quadros'}`;
  console.log(l);
  linhas.push(l);
  if (ruins.length && !aprovado) bandeiras++;
}
if (SAIDA) fs.writeFileSync(SAIDA, JSON.stringify({ base, piso, medidas, linhas }, null, 1));
process.exit(bandeiras ? 1 : 0);
