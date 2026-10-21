// BLOCO G · the CAVE passage (his idea, 21/10) — a MOCK-UP of the transition with his three paintings, at the game's
// resolution, before any code: the cave frame MIRRORED (its closed wall on the left) is the ENTRANCE, the frame as he
// painted it (wall on the right) is the EXIT; the interior painting exists only between the two walls (to the right of
// the entrance wall, to the left of the exit wall) — the rock of the mouth hides the seam between the two backdrops.
// Four moments: approaching, at the mouth, inside, leaving. Without the image treatment (Atmosfera): approximate tones.
//   node scripts/_g/_caverna-maquete.mjs [outDir=docs/superpowers/folhas/2026-10-21/caverna]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chaveXadrez, reduzir } from './_xadrez.mjs';

const [OUT = 'docs/superpowers/folhas/2026-10-21/caverna'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const RAW = 'assets/raw/';
const W = 429, H = 216, S = 384;
const moldura = await reduzir(await chaveXadrez(RAW + 'Moldura de Caverna com Brilho de Brasas.png'), W, H);
const teto = await reduzir(await chaveXadrez(RAW + 'Teto de Caverna Sombrio com Estalactites.png'), W, H);
const interior = await sharp(RAW + 'Caverna Subterrânea de Luzes Misteriosas.png').resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
for (const [n, b] of [['moldura', moldura], ['teto', teto]]) await sharp(b, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${n}-429.png`));
await sharp(interior, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, 'interior-429.png'));

// where the frame's closed wall is (columns ≥ 90% opaque, scanning in from the right)
const cobertura = (x) => { let n = 0; for (let y = 0; y < H; y++) if (moldura[(y * W + x) * 4 + 3]) n++; return n / H; };
let parede = W - 1; while (parede > W / 2 && cobertura(parede - 1) >= 0.9) parede--;
// the opening: the frame's ceiling bottom and floor top (median over the open columns)
const col = (x) => { let t = 0; while (t < H && moldura[(t * W + x) * 4 + 3]) t++; let b = H - 1; while (b > 0 && moldura[(b * W + x) * 4 + 3]) b--; return [t, b]; };
const vaos = Array.from({ length: parede - 20 }, (_, x) => col(x + 10));
const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
const tetoY = med(vaos.map((v) => v[0])), chaoY = med(vaos.map((v) => v[1]));
console.log(`moldura: parede de x ${parede} a ${W - 1} (${W - parede} px); vão entre y ${tetoY} e ${chaoY} (${chaoY - tetoY} px)`);

const espelhar = (b) => { const o = Buffer.alloc(b.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.copy(o, (y * W + (W - 1 - x)) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4); return o; };
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
let semente = 7171;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const passeio = (n, max, passo) => { let v = max / 2; return Array.from({ length: n }, () => (v = Math.max(0, Math.min(max, v + (rnd() - 0.5) * passo)))); };

// The wall's OUTER edge is the painting's border — a straight vertical cut. Erode it per row by a random walk (0–12 px),
// so it reads as rock (the cordilheira's lesson).
function bordaDeRocha(b) {
  const o = Buffer.from(b);
  const ero = passeio(H, 12, 3.2);
  for (let y = 0; y < H; y++) for (let x = W - Math.round(ero[y]); x < W; x++) o[(y * W + x) * 4 + 3] = 0;
  return o;
}
// OPTION A — the MOUTH: the wall kept only above (the mountain's mass) and below (the floor); in the opening, the rock is
// cut away with a rocky underside and a rising floor, and the seam is hidden by a THROAT of darkness (ordered dither).
const GARGANTA = { fora: 26, dentro: 44, cheio: 10 };
function boca(b, topoCorte, baseCorte) {
  const o = bordaDeRocha(b);
  const cimaW = passeio(W, 10, 3), baixoW = passeio(W, 8, 3);
  for (let x = parede - 30; x < W; x++) for (let y = 0; y < H; y++) {
    const t = topoCorte + Math.round(cimaW[x]), bb = baseCorte - Math.round(baixoW[x]);
    if (y > t && y < bb) o[(y * W + x) * 4 + 3] = 0;
  }
  return o;
}
const molduraB = bordaDeRocha(moldura);
const molduraA = boca(moldura, tetoY + 22, chaoY - 4);
const entradaB = espelhar(molduraB), entradaA = espelhar(molduraA);
const entrada = entradaB;
const paredeEntrada = W - 1 - parede;
/** The throat: black over the opening rows, solid at the seam, dithered out to both sides. */
function garganta(img, seam, lado) {
  for (let y = tetoY + 10; y < chaoY + 4; y++) for (let x = seam - GARGANTA.fora - 4; x < seam + GARGANTA.dentro + 4; x++) {
    if (x < 0 || x >= S) continue;
    const d = (x - seam) * lado; // >0 = towards the interior
    const a = d >= 0 ? (d <= GARGANTA.cheio ? 1 : 1 - (d - GARGANTA.cheio) / (GARGANTA.dentro - GARGANTA.cheio)) : 1 + d / GARGANTA.fora;
    // the throat is thinner near the top and bottom of the opening (it is a hole, not a band)
    const u = (y - tetoY) / (chaoY - tetoY), forma = Math.min(1, Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 1.6);
    if (a * forma > BAYER4[(y % 4) * 4 + (x % 4)]) { const i = (y * S + x) * 4; img[i] = 4; img[i + 1] = 5; img[i + 2] = 8; img[i + 3] = 255; }
  }
}
const dados = JSON.parse(fs.readFileSync('public/sprites/f1/chao.json', 'utf8'));

async function exterior() {
  const comp = [];
  for (const n of ['vale', 'paisagem', 'frente']) comp.push({ input: `public/sprites/f1/chao-${n}.png`, left: 0, top: dados[n].y });
  const full = await sharp('public/sprites/f1/pintura.png').composite(comp).png().toBuffer();
  return sharp(full).extract({ left: 0, top: 0, width: S, height: H }).ensureAlpha().raw().toBuffer();
}
const ext = await exterior();
const nave = fs.existsSync('public/sprites/ship.png') ? await sharp('public/sprites/ship.png').png().toBuffer() : null;

/** One moment: the exterior, the interior where x is between the walls, the frames on top, the ship for scale. */
async function momento(nome, { molduras, dentro, gargantas = [] }) {
  const img = Buffer.from(ext);
  for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
    if (!dentro(x)) continue;
    const i = (y * S + x) * 4, j = (y * W + Math.min(W - 1, x)) * 4;
    for (let c = 0; c < 4; c++) img[i + c] = interior[j + c];
  }
  for (const g of gargantas) garganta(img, g.seam, g.lado);
  const comp = [];
  for (const m of molduras) {
    const png = await sharp(m.buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    const left = Math.max(0, m.x), corte = Math.max(0, -m.x), larg = Math.min(W - corte, S - left);
    if (larg > 0) comp.push({ input: await sharp(png).extract({ left: corte, top: 0, width: larg, height: H }).png().toBuffer(), left, top: 0 });
  }
  if (nave) comp.push({ input: nave, left: 60, top: Math.round((tetoY + chaoY) / 2) - 8 });
  const out = await sharp(img, { raw: { width: S, height: H, channels: 4 } }).composite(comp).png().toBuffer();
  await sharp(out).resize(S * 3, H * 3, { kernel: 'nearest' }).toFile(path.join(OUT, `${nome}.png`));
}
// 1 · approaching: the entrance frame comes in from the right (B: the whole wall; A: the mouth with the throat)
const x1 = 250;
await momento('1-chegando-B', { molduras: [{ buf: entradaB, x: x1 }], dentro: (x) => x >= x1 + paredeEntrada - 4 });
await momento('1-chegando-A', { molduras: [{ buf: entradaA, x: x1 }], dentro: (x) => x >= x1 + paredeEntrada - 4, gargantas: [{ seam: x1 + paredeEntrada - 4, lado: 1 }] });
// 2 · at the mouth
const x2 = 40;
await momento('2-na-boca-B', { molduras: [{ buf: entradaB, x: x2 }], dentro: (x) => x >= x2 + paredeEntrada - 4 });
await momento('2-na-boca-A', { molduras: [{ buf: entradaA, x: x2 }], dentro: (x) => x >= x2 + paredeEntrada - 4, gargantas: [{ seam: x2 + paredeEntrada - 4, lado: 1 }] });
// 3 · inside: the interior, the ceiling strip and the frame's floor (its open part) tiled
{
  const chao = Buffer.alloc(W * H * 4);
  for (let y = chaoY - 6; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + (x % parede)) * 4; moldura.copy(chao, (y * W + x) * 4, s, s + 4); }
  await momento('3-dentro', { molduras: [{ buf: teto, x: 0 }, { buf: chao, x: 0 }], dentro: () => true });
}
// 4 · leaving: the exit frame (wall on the right) passes; the exterior again to the right of the wall
const x4 = 200 - parede;
await momento('4-saindo-B', { molduras: [{ buf: molduraB, x: x4 }], dentro: (x) => x < x4 + parede + 4 });
await momento('4-saindo-A', { molduras: [{ buf: molduraA, x: x4 }], dentro: (x) => x < x4 + parede + 4, gargantas: [{ seam: x4 + parede + 4, lado: -1 }] });
console.log('maquete em', OUT);
