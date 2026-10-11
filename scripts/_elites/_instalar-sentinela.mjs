// INSTALLS THE HULL SENTINEL — the 63-3 serpent that took the F3 "tentaculo" slot (spec F3 §3.4; his calls of 11/10:
// tilt 25°, the strike hurts). The game must not rotate or treat the image live, so everything is BAKED here:
//   (a) her three gestures (idle, espinhos, bote — the takes he approved, 2 2 2), with the spine glow darkened and the
//       whole creature tilted 25° clockwise (RotSprite), all cropped to ONE box so the frames share an origin;
//   (b) the SPINE (the demo's hand-drawn 15×3, pointing right — the shot turns to its heading);
//   (c) the measures the behaviour needs (`src/data/tentaculoQuadros.ts`): the pivot (where the crest cuts her), how far
//       she sinks to hide, the body box of every frame and the MOUTH of the strike;
//   (d) a check sheet with those boxes drawn over the frames.
//   node scripts/_elites/_instalar-sentinela.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { ampliar, colar, gravar, ler, novo } from './_pixel-lib.mjs';
import { mapa, px } from './_cena-casco.mjs';
import { apagar, rotSprite } from './_sentinela-lib.mjs';

const D = 'docs/superpowers/folhas/2026-10-10/elites/sentinela';
const OUT = 'public/sprites';
const TAKE = { idle: 2, espinhos: 2, bote: 2 };
const GIRO_GRAUS = 25, BRILHO = 0.45, VISIVEL = 0.58;

const clipe = async (dir) => {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  return Promise.all([...Array(n).keys()].map((i) => ler(`${dir}/${i}.png`)));
};
const opaco = (q, x, y) => q.d[(y * q.w + x) * 4 + 3] > 64;

const cru = {
  idle: await clipe(`${D}/idle-${TAKE.idle}`),
  espinhos: (await clipe(`${D}/espinhos-${TAKE.espinhos}`)).map((q) => apagar(q, BRILHO)),
  bote: await clipe(`${D}/bote-${TAKE.bote}`),
};

// The pivot, as in the demo: the middle of her body on the row where the crest cuts the base pose (VISIVEL of her
// height above it).
const base = cru.idle[0];
let topo = -1, fundo = 0;
for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) if (opaco(base, x, y)) { if (topo < 0) topo = y; fundo = y; }
const linha = topo + Math.round(VISIVEL * (fundo - topo));
let x0 = -1, x1 = -1;
for (let x = 0; x < base.w; x++) if (opaco(base, x, linha)) { if (x0 < 0) x0 = x; x1 = x; } else if (x0 >= 0) break; // the first run = the body
const R = rotSprite((GIRO_GRAUS * Math.PI) / 180, base.w);
const p2 = R.onde((x0 + x1) / 2, linha);
const PIVO = { x: Math.round(p2.x), y: Math.round(p2.y) };

// Tilted, with a hard edge (the demo only drew what was > 64 of alpha).
const girado = Object.fromEntries(Object.entries(cru).map(([k, qs]) => [k, qs.map((q) => {
  const g = R.f(q);
  for (let i = 3; i < g.d.length; i += 4) g.d[i] = g.d[i] > 64 ? 255 : 0;
  return g;
})]));

// ONE crop for every frame (the union of what is opaque), so they all share the origin.
const todos = Object.values(girado).flat();
const cx = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
for (const q of todos)
  for (let y = 0; y < q.h; y++)
    for (let x = 0; x < q.w; x++)
      if (opaco(q, x, y)) { cx.x0 = Math.min(cx.x0, x); cx.y0 = Math.min(cx.y0, y); cx.x1 = Math.max(cx.x1, x); cx.y1 = Math.max(cx.y1, y); }
const W = cx.x1 - cx.x0 + 1, H = cx.y1 - cx.y0 + 1;
const recortar = (q) => {
  const out = novo(W, H);
  for (let y = 0; y < H; y++) q.d.copy(out.d, y * W * 4, ((cx.y0 + y) * q.w + cx.x0) * 4, ((cx.y0 + y) * q.w + cx.x0 + W) * 4);
  return out;
};
const quadros = Object.fromEntries(Object.entries(girado).map(([k, qs]) => [k, qs.map(recortar)]));
const pivo = { x: PIVO.x - cx.x0, y: PIVO.y - cx.y0 };

// ── (a) the frames ──
for (const [k, qs] of Object.entries(quadros)) for (const [i, q] of qs.entries()) await gravar(q, `${OUT}/elite-tentaculo-${k}-${i}.png`);

// ── (b) the spine ──
fs.mkdirSync(`${OUT}/tiros`, { recursive: true });
await gravar(mapa(['.OOOOOO........', 'OFRrMMhhHHsssOO', '.OOOOOOOO......']), `${OUT}/tiros/elite-espinho.png`);

// ── (c) the measures ──
/** What shows above the crest (standing): every opaque pixel over the pivot row. */
const acima = (q) => {
  const p = [];
  for (let y = 0; y < pivo.y; y++) for (let x = 0; x < q.w; x++) if (opaco(q, x, y)) p.push([x, y]);
  return p;
};
/** The BODY box: the middle 70% of that mass on each axis — the spines and wisps around it are not hitbox. */
const corpo = (q) => {
  const p = acima(q);
  const xs = p.map(([x]) => x).sort((a, b) => a - b), ys = p.map(([, y]) => y).sort((a, b) => a - b);
  const em = (v, f) => v[Math.floor((v.length - 1) * f)];
  const [bx0, bx1, by0, by1] = [em(xs, 0.15), em(xs, 0.85), em(ys, 0.15), em(ys, 0.85)];
  return { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
};
const frente = (q) => Math.min(...acima(q).map(([x]) => x));
const baseR = quadros.idle[0];
const frenteBase = frente(baseR);
/** The MOUTH of the strike: the tip of the head while it is thrown out past where the base pose ends. */
const BOCA_FUNDO = 14, BOCA_AVANCO = 10;
const boca = (q) => {
  const p = acima(q), f = Math.min(...p.map(([x]) => x));
  if (f > frenteBase - BOCA_AVANCO) return null;
  const ponta = p.filter(([x]) => x <= f + BOCA_FUNDO);
  return { x: Math.round(ponta.reduce((s, [x]) => s + x, 0) / ponta.length) - pivo.x, y: Math.round(ponta.reduce((s, [, y]) => s + y, 0) / ponta.length) - pivo.y };
};
const topoR = Math.min(...acima(baseR).map(([, y]) => y));
// The chest (where the spines leave): her front edge at the middle of what shows.
const peitoY = Math.round((topoR + pivo.y) / 2);
let peitoX = 0;
while (!opaco(baseR, peitoX, peitoY)) peitoX++;

// Her FRONT EDGE row by row at the glow's peak (espinhos frame 8): each trio leaves from it, not from thin air.
const pico = quadros.espinhos[8];
const frente_ = Array.from({ length: pivo.y }, (_, y) => {
  for (let x = 0; x < pico.w; x++) if (opaco(pico, x, y)) return x - pivo.x;
  return null;
});

const medidas = {
  w: W,
  h: H,
  pivo,
  /** How far below the crest the pivot goes for her top to be hidden. */
  afundado: pivo.y - topoR + 2,
  peito: { x: peitoX - pivo.x, y: peitoY - pivo.y },
  frente: frente_,
  corpo: Object.fromEntries(Object.entries(quadros).map(([k, qs]) => [k, qs.map(corpo)])),
  boca: quadros.bote.map(boca),
};
const ts = `// GERADO por \`scripts/_elites/_instalar-sentinela.mjs\` — não edite à mão: mudou a arte, o giro ou o quanto dela fica à
// mostra, reinstale. As medidas dos quadros assados da serpente do casco (o posto "tentaculo" da F3, spec §3.4).

/**
 * \`pivo\` = o ponto do quadro que fica na CRISTA do casco (a origem do sprite). \`afundado\` = quanto o pivô desce para ela
 * sumir. \`peito\` = de onde saem os espinhos e \`boca\` = a ponta da cabeça em cada quadro do bote (os dois a partir do
 * pivô; \`null\` = a cabeça ainda não saiu). \`frente\` = a borda da frente dela em cada linha acima da crista, no auge
 * do brilho (x a partir do pivô; \`null\` = linha vazia). \`corpo\` = a hitbox de cada quadro, no quadro (x, y do canto).
 */
export const TENTACULO_QUADROS = ${JSON.stringify(medidas, null, 2)} as const;
`;
fs.writeFileSync('src/data/tentaculoQuadros.ts', ts);

// ── (d) the check sheet: every bote frame and three of the others, with the crest, the body box and the mouth ──
const Z = 3, cols = 6;
const lista = [...quadros.bote.map((q, i) => ['bote', i, q]), ['idle', 0, quadros.idle[0]], ['idle', 8, quadros.idle[8]], ['espinhos', 8, quadros.espinhos[8]]];
const folha = novo(cols * (W + 4), Math.ceil(lista.length / cols) * (H + 4));
for (let i = 0; i < folha.d.length; i += 4) folha.d.set([58, 70, 96, 255], i);
for (const [k, [nome, i, q]] of lista.entries()) {
  const ox = (k % cols) * (W + 4), oy = Math.floor(k / cols) * (H + 4);
  colar(folha, q, ox, oy);
  for (let x = 0; x < W; x++) px(folha, ox + x, oy + pivo.y, [90, 255, 140], 0.8);
  const c = medidas.corpo[nome][i];
  for (let x = 0; x < c.w; x++) { px(folha, ox + c.x + x, oy + c.y, [255, 230, 80], 1); px(folha, ox + c.x + x, oy + c.y + c.h - 1, [255, 230, 80], 1); }
  for (let y = 0; y < c.h; y++) { px(folha, ox + c.x, oy + c.y + y, [255, 230, 80], 1); px(folha, ox + c.x + c.w - 1, oy + c.y + y, [255, 230, 80], 1); }
  const b = nome === 'bote' ? medidas.boca[i] : null;
  if (b) for (let d = -6; d <= 6; d++) { px(folha, ox + pivo.x + b.x + d, oy + pivo.y + b.y, [80, 220, 255], 1); px(folha, ox + pivo.x + b.x, oy + pivo.y + b.y + d, [80, 220, 255], 1); }
}
await sharp(await ampliar(folha, Z)).toFile(`${D}/instalada-conferencia.png`);

console.log(`serpente do casco: ${todos.length} quadros de ${W}×${H}, pivô ${JSON.stringify(pivo)}, afundado ${medidas.afundado}, peito ${JSON.stringify(medidas.peito)}`);
console.log('boca do bote:', JSON.stringify(medidas.boca));
