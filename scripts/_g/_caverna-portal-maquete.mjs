// BLOCO G · the CAVE PORTAL (his idea, 21/10): "assim que a nave passar pelo portal ela abre o fundo da caverna e suas
// bordas". His "Parede de Caverna Vulcânica Sombria" is the mountain seen from OUTSIDE, with the mouth on its left: it
// HIDES the cave. When the ship passes the mouth, the mountain's BODY dissolves and the cave opens behind it — the
// interior painting and its borders (the stalactite ceiling, the frame's floor). The RIM of the mouth (the band of rock
// along the opening, his own art) stays: it covers the seam between outside and inside. The exit is the same portal
// mirrored: the exterior shows through its opening, and once the ship is out, its body closes over the cave behind.
// A mock-up at the game's resolution (no image treatment: approximate tones), six moments.
//   node scripts/_g/_caverna-portal-maquete.mjs [dir=docs/superpowers/folhas/2026-10-21/caverna]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chaveXadrez, reduzir } from './_xadrez.mjs';

const [DIR = 'docs/superpowers/folhas/2026-10-21/caverna'] = process.argv.slice(2);
const W = 429, H = 216, S = 384;
const RIM = 14; // px of rock kept along the mouth
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const raw = async (f) => sharp(path.join(DIR, f)).ensureAlpha().raw().toBuffer();
const interior = await raw('interior-429.png');
const teto = await raw('teto-429.png');
const moldura = await raw('moldura-429.png');
const parede = await reduzir(await chaveXadrez('assets/raw/Parede de Caverna Vulcânica Sombria.png'), W, H);
await sharp(parede, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, 'parede-429.png'));
const espelhar = (b) => { const o = Buffer.alloc(b.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.copy(o, (y * W + (W - 1 - x)) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4); return o; };
const op = (b, x, y) => b[(y * W + x) * 4 + 3] > 0;

// The mouth: per row, the DEEP edge of the opening — the rightmost transparent pixel CONNECTED to the left edge (a flood
// from it). ⚠️ Not "the first rock from the left": a stalactite hanging inside the opening stopped that scan short, and
// the interior leaked into the mouth beyond it (the first mock-up, 21/10).
const aberto = new Uint8Array(W * H);
{
  const fila = [];
  for (let y = 0; y < H; y++) if (!op(parede, 0, y)) { aberto[y * W] = 1; fila.push(y * W); }
  while (fila.length) {
    const c = fila.pop(), x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx; if (aberto[q] || op(parede, nx, ny)) continue; aberto[q] = 1; fila.push(q);
    }
  }
}
const fundo = Array.from({ length: H }, (_, y) => { let m = -1; for (let x = 0; x < W; x++) if (aberto[y * W + x]) m = x; return m; });
// rows with no opening (the rock above it) take the nearest row's edge, so the rim runs top to bottom
const ref = fundo.findIndex((v) => v >= 0);
for (let y = 0; y < H; y++) if (fundo[y] < 0) fundo[y] = fundo[y < ref ? ref : y - 1];
// THE BODY CONTINUES: the rock of the right part of the image (pure rock), tiled after the portal — the mountain is as
// long as the cave, and one screen of portal is not.
const CORPO0 = 250;
const extensao = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + CORPO0 + (x % (W - CORPO0))) * 4; parede.copy(extensao, (y * W + x) * 4, s, s + 4); }
// THE OPENING SWEEPS: each pixel of the body vanishes at a threshold = its distance from the mouth (+ noise), so the
// cave opens FROM the mouth inwards, raggedly, like rock crumbling — not an even dither over the whole mountain.
let semente = 3737;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const ruido = Float32Array.from({ length: (W * 2) * H }, () => rnd());
const limiar = (xl, y) => Math.min(1, Math.max(0, (xl - fundo[y]) / 380 + (ruido[y * W * 2 + Math.min(W * 2 - 1, xl)] - 0.5) * 0.18));
const borda = (b, lado) => { // lado 1: entrance (opening on the left); −1: exit (mirrored)
  const aro = Buffer.alloc(b.length), corpo = Buffer.alloc(b.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xe = lado === 1 ? x : W - 1 - x; // in the entrance's frame
    const i = (y * W + x) * 4; if (!b[i + 3]) continue;
    (xe <= fundo[y] + RIM ? aro : corpo).set(b.subarray(i, i + 4), i);
  }
  return { aro, corpo };
};
const entrada = borda(parede, 1);
const saida = borda(espelhar(parede), -1);

// The cave's floor strip: the frame's open part (its floor), tiled.
let paredeMol = W - 1; while (paredeMol > W / 2) { let n = 0; for (let y = 0; y < H; y++) if (op(moldura, paredeMol - 1, y)) n++; if (n / H < 0.9) break; paredeMol--; }
const chaoY = (() => { const a = []; for (let x = 10; x < paredeMol - 10; x++) { let b = H - 1; while (b > 0 && op(moldura, x, b)) b--; a.push(b); } return a.sort((p, q) => p - q)[a.length >> 1]; })();
const chao = Buffer.alloc(W * H * 4);
for (let y = chaoY - 6; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + (x % paredeMol)) * 4; moldura.copy(chao, (y * W + x) * 4, s, s + 4); }

const dados = JSON.parse(fs.readFileSync('public/sprites/f1/chao.json', 'utf8'));
const extComp = ['vale', 'paisagem', 'frente'].map((n) => ({ input: `public/sprites/f1/chao-${n}.png`, left: 0, top: dados[n].y }));
const ext = await sharp(await sharp('public/sprites/f1/pintura.png').composite(extComp).png().toBuffer()).extract({ left: 0, top: 0, width: S, height: H }).ensureAlpha().raw().toBuffer();
const nave = await sharp('public/sprites/ship.png').png().toBuffer();

/**
 * One moment. `dentro(x, y)`: the cave shows here (interior + borders); `pecas`: [{ buf, x, alfa }] drawn on top
 * (alfa < 1 = dissolving, ordered dither — the body of the mountain opening).
 */
async function momento(nome, dentro, pecas) {
  const img = Buffer.from(ext);
  const pinta = (i, src, j) => { if (src[j + 3]) for (let c = 0; c < 4; c++) img[i + c] = src[j + c]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
    if (!dentro(x, y)) continue;
    const i = (y * S + x) * 4, j = (y * W + Math.min(W - 1, x)) * 4;
    pinta(i, interior, j); pinta(i, teto, j); pinta(i, chao, j);
  }
  for (const p of pecas) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = p.x + x; if (sx < 0 || sx >= S) continue;
    const j = (y * W + x) * 4; if (!p.buf[j + 3]) continue;
    // `aberto` (0–1): how far the opening has swept; a body pixel is gone once the sweep passes its threshold
    if (p.aberto !== undefined && p.aberto > limiar(x + (p.desloc ?? 0), y)) continue;
    pinta((y * S + sx) * 4, p.buf, j);
  }
  const out = await sharp(img, { raw: { width: S, height: H, channels: 4 } }).composite([{ input: nave, left: 60, top: 100 }]).png().toBuffer();
  await sharp(out).resize(S * 3, H * 3, { kernel: 'nearest' }).toFile(path.join(DIR, `portal-${nome}.png`));
}
const naCaverna = (px, lado) => (x, y) => (lado === 1 ? x > px + fundo[y] + RIM / 2 : x < px + (W - 1 - fundo[y]) - RIM / 2);

// THE ENTRANCE. The ship is at x 60–90. The body = the portal's body + its extension (the rock tiled after it).
const corpo = (px, aberto) => [{ buf: entrada.corpo, x: px, aberto }, { buf: extensao, x: px + W, aberto, desloc: W }];
let p = 240; // the portal comes in from the right
await momento('1-chegando', naCaverna(p, 1), [...corpo(p), { buf: entrada.aro, x: p }]);
p = 75 - (fundo[100] + RIM); // the ship at the mouth's deep edge
await momento('2-no-portal', naCaverna(p, 1), [...corpo(p), { buf: entrada.aro, x: p }]);
p -= 12;
await momento('3-abrindo', naCaverna(p, 1), [...corpo(p, 0.45), { buf: entrada.aro, x: p }]);
p -= 24;
await momento('4-aberto', naCaverna(p, 1), [{ buf: entrada.aro, x: p }]);
// THE EXIT (the mirrored portal: opening on the right; its body extension BEFORE it, mirrored).
const espelharExt = espelhar(extensao);
const fundoS = (y) => W - 1 - fundo[y]; // the exit's deep edge, from its left
p = 300 - fundoS(100);
await momento('5-saida-vem', naCaverna(p, -1), [{ buf: saida.aro, x: p }]);
// THE EXIT'S FINISH (his sketch on moment 5, 21/10: a rock arc with its teeth outwards on the far side of the exit
// opening). The frame's CLOSED wall already has that shape — a ")" of rock coming down from the ceiling to the floor,
// with embers — so its right part is reused as the lip. Two readings: (aro) the lip in front, the exterior going on past
// it; (janela) rock past the lip too — the exit is a window, and it opens fully when the ship passes, mirroring the
// entrance.
{
  const L0 = 330; // the frame's right part: the overhang, the closed wall, the rising floor
  const labio = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = L0; x < W; x++) { const s = (y * W + x) * 4; moldura.copy(labio, (y * W + (x - L0)) * 4, s, s + 4); }
  // the lip's own right edge was the painting's border: erode it like rock (at most 6 px: the wall is only ~22 px)
  let v = 3; for (let y = 0; y < H; y++) { v = Math.max(0, Math.min(6, v + (rnd() - 0.5) * 2)); for (let x = W - L0 - Math.round(v); x < W - L0; x++) labio[(y * W + x) * 4 + 3] = 0; }
  const pe = 250 - fundoS(100);
  const R = pe + fundoS(100); // the exit rim's outer side
  // the ")" of the lip sits ~26 px past the rim: its overhang and its floor reach back over the window, its wall closes it
  const xl = R + 26 - 60;
  await momento('5b-saida-aro', naCaverna(pe, -1), [{ buf: saida.aro, x: pe }, { buf: labio, x: xl }]);
  const fimDoLabio = xl + (W - L0) - 4;
  const rochaAlem = Buffer.alloc(S * H * 4);
  for (let y = 0; y < H; y++) for (let x = fimDoLabio; x < S; x++) { const s = (y * W + (CORPO0 + ((x - fimDoLabio) % (W - CORPO0)))) * 4; parede.copy(rochaAlem, (y * S + x) * 4, s, s + 4); }
  // (the rock beyond is drawn at screen width: wrap it in a W-wide piece for `momento`)
  const rochaW = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) rochaAlem.copy(rochaW, y * W * 4, y * S * 4, y * S * 4 + S * 4);
  await momento('5c-saida-janela', naCaverna(pe, -1), [{ buf: saida.aro, x: pe }, { buf: rochaW, x: 0 }, { buf: labio, x: xl }]);
}
// THE EXIT, AS HE ASKED (21/10: "algo mais simples, apenas uma parede escura que dê acabamento no canto direito do quadro
// 5 … que faça a nave atravessar e sair no quadro 6"): past the exit rim, a DARK WALL — the mountain's rock, darkened —
// closes the right corner. The ship crosses it; it gives way FROM the rim outwards (the entrance's sweep, mirrored) and
// the exterior appears; behind, the mountain closes over the cave.
{
  const escura = Buffer.alloc(S * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
    const s = (y * W + (CORPO0 + (x % (W - CORPO0)))) * 4;
    const brasa = parede[s] > 90 && parede[s] > parede[s + 2] + 40;
    const k = brasa ? 0.55 : 0.38;
    for (let c = 0; c < 3; c++) escura[(y * S + x) * 4 + c] = Math.round(parede[s + c] * k);
    escura[(y * S + x) * 4 + 3] = 255;
  }
  const comoPeca = (desde, aberto) => {
    const b = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W && x < S; x++) {
      if (x < desde(y)) continue;
      // the sweep: from the rim outwards, ragged
      if (aberto !== undefined && aberto > Math.min(1, Math.max(0, (x - desde(y)) / 300 + (ruido[y * W * 2 + x] - 0.5) * 0.18))) continue;
      escura.copy(b, (y * W + x) * 4, (y * S + x) * 4, (y * S + x) * 4 + 4);
    }
    return b;
  };
  let pe = 250 - fundoS(100);
  const desde = (pp) => (y) => pp + (W - 1 - fundo[y]) - 2; // the wall starts under the rim's outer side
  await momento('5-saida-vem', naCaverna(pe, -1), [{ buf: comoPeca(desde(pe)), x: 0 }, { buf: saida.aro, x: pe }]);
  pe = 70 - fundoS(100);
  await momento('5d-saida-atravessa', naCaverna(pe, -1), [{ buf: comoPeca(desde(pe), 0.4), x: 0 }, { buf: saida.aro, x: pe }]);
}
// THE EXIT, AS HE MEANT IT (21/10, confirmed): the mirrored rim draws an inverted half-moon "(" open to the right; a NEW
// layer IN FRONT — a concave half-moon ")" in the right corner — closes it into a HOLE, an oval through which a little
// of the exterior shows. That layer is his entrance Parede itself, not mirrored: the right edge of its mouth is exactly
// that ")" with the teeth of rock outwards. When the ship goes through the hole, the front layer gives way FROM the hole
// outwards (the entrance's sweep) and the exterior opens; behind, the mountain closes over the cave (moment 6).
{
  const pe = 300 - fundoS(100);
  const R = pe + fundoS(100); // the back rim's outer side at the mid row
  const BURACO = 80; // the hole's width at its widest
  const pP = R + BURACO - fundo[100]; // the front Parede: its concave edge BURACO px past the rim
  const frente = (aberto) => [{ buf: entrada.corpo, x: pP, aberto }, { buf: extensao, x: pP + W, aberto, desloc: W }, { buf: entrada.aro, x: pP, aberto }];
  await momento('5e-saida-buraco', naCaverna(pe, -1), [{ buf: saida.aro, x: pe }, ...frente()]);
  const d = 230; // the world moved: the ship (x 60–90) is at the hole
  await momento('5f-saida-atravessa', naCaverna(pe - d, -1), [{ buf: saida.aro, x: pe - d }, ...frente(0.4).map((f) => ({ ...f, x: f.x - d }))]);
}
p = 40 - fundoS(100);
await momento('6-saida-fecha', naCaverna(p, -1), [{ buf: espelharExt, x: p - W }, { buf: saida.corpo, x: p }, { buf: saida.aro, x: p }]);
console.log('portal: borda de', RIM, 'px; a boca vai até x', Math.max(...fundo), 'da parede');
