// BLOCO G · the CAVE (21/10, his idea — spec `2026-10-21-f1-caverna-design.md`): his four paintings baked for the game.
//   "Parede de Caverna Vulcânica Sombria"      → f1-cav-faixa.png, the ROCK BAND (he rejected every opening transition,
//                         the crumbling one and the three tried after it: "sem a parede sumir ou pular"): his portal as
//                         it is — the mouth on the left (outside through it), its rim ")" — and its right side carved by
//                         the MIRRORED mouth: the rim "(" (the inside appears past it). It never opens: it passes IN FRONT
//                         of the ship, faster than the world (the ship shows through its aura), and the outside/inside
//                         swap hides behind its rock — wide enough to cover the whole screen for an instant (ROCHA px at
//                         the waist). Only the inner rim and B px next to it come from the mirror (a minimum-error seam
//                         that follows the contour): the rock between the rims is his, unmirrored — a mirrored middle
//                         made a symmetric "butterfly". The exit is the same band mirrored (the inside on its left).
//   "Teto de Caverna Sombrio com Estalactites" → f1-cav-teto.png, the hall's ceiling, seamless; its contour (the lowest
//                         rock per column: the stalactite tips) is what bites.
//   "Moldura de Caverna com Brilho de Brasas"  → f1-cav-chao.png, the hall's floor (the open part of the frame, before
//                         its closed wall), seamless; its contour (the highest rock per column) bites.
//   "Caverna Subterrânea de Luzes Misteriosas" → f1-cav-interior.png, the cave's backdrop.
// Plus public/sprites/f1/caverna.json and the sheet <sheetDir>/pecas.png.
// ⚠️ Run `_luzes-caverna-f1.mjs` AFTER this one: it adds the hall's lights (`luzes`) to `caverna.json`.
//   node scripts/_g/_caverna-f1.mjs [outDir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-21/caverna/frente]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chaveXadrez, reduzir } from './_xadrez.mjs';
import { emendar } from './_emenda.mjs';

const [OUT = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-21/caverna/frente'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOLHA, { recursive: true });
const RAW = 'assets/raw/';
const W = 429, H = 216;
// ARO: the rim (the rock within ARO px of the mouth). ROCHA: the rock between the two rims at the middle row. B + SOBRA:
// where the mirrored inner rim hands over to his rock (the seam runs B … B+SOBRA px before the inner rim, per row).
// ROCHA = 380: the band must cover the WHOLE screen for an instant (ele: the outside leaves by the left before the inside
// comes in by the right) — at the middle row the rock + the two rims ≥ 384 + a little. FONTES: where each extension chunk
// starts in the portal (different windows, so the chunks don't repeat the same rock).
const ARO = 14, ROCHA = 380, B = 4, SOBRA = 12, SOBRA_EXT = 48, FONTES = [190, 230, 210];
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
const op = (b, w, x, y) => b[(y * w + x) * 4 + 3] > 0;

const parede = await reduzir(await chaveXadrez(RAW + 'Parede de Caverna Vulcânica Sombria.png'), W, H);
const teto = await reduzir(await chaveXadrez(RAW + 'Teto de Caverna Sombrio com Estalactites.png'), W, H);
const moldura = await reduzir(await chaveXadrez(RAW + 'Moldura de Caverna com Brilho de Brasas.png'), W, H);
const interior = await sharp(RAW + 'Caverna Subterrânea de Luzes Misteriosas.png').resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
await png(interior, W, H, 'cav-interior.png');

// ─── 1. The portal: the mouth (a flood from the left edge — never "the first rock from the left": a stalactite inside
// the opening stopped that scan short and the interior leaked into the mouth, the first mock-up, 21/10) ──────────
const aberto = new Uint8Array(W * H);
{
  const fila = [];
  for (let y = 0; y < H; y++) if (!op(parede, W, 0, y)) { aberto[y * W] = 1; fila.push(y * W); }
  while (fila.length) {
    const c = fila.pop(), x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx; if (aberto[q] || op(parede, W, nx, ny)) continue; aberto[q] = 1; fila.push(q);
    }
  }
}
const fundo = Array.from({ length: H }, (_, y) => { let m = -1; for (let x = 0; x < W; x++) if (aberto[y * W + x]) m = x; return m; });
const ref = fundo.findIndex((v) => v >= 0);
for (let y = 0; y < H; y++) if (fundo[y] < 0) fundo[y] = fundo[y < ref ? ref : y - 1];
const fundoMeio = fundo[H >> 1];

// ─── 2. His rock, wide enough: the portal + EXTENSIONS, each a chunk of his pure rock (columns FONTES[i] … W−1, past
// the deepest mouth + rim in every row) joined to the current end by a minimum-error seam ──────────────────────────
const LF = 2 * fundoMeio + 2 * ARO + ROCHA + 1;
const PRECISA = LF + B + SOBRA;
const MAX = PRECISA + W;
const rocha = Buffer.alloc(MAX * H * 4);
for (let y = 0; y < H; y++) parede.copy(rocha, y * MAX * 4, y * W * 4, (y + 1) * W * 4);
let LARGO = W;
for (const F0 of FONTES) {
  if (LARGO >= PRECISA) break;
  if (F0 <= Math.max(...fundo) + ARO) throw new Error(`extension source ${F0} reaches the mouth`);
  const Bf = (y, k) => (y * W + F0 + k) * 4;
  const A = (y, k) => (y * MAX + LARGO - SOBRA_EXT + k) * 4;
  const custo = (y, k) => { const a = A(y, k), b = Bf(y, k); return Math.abs(rocha[a] - parede[b]) + Math.abs(rocha[a + 1] - parede[b + 1]) + Math.abs(rocha[a + 2] - parede[b + 2]); };
  const D = new Float64Array(H * SOBRA_EXT), V = new Int16Array(H * SOBRA_EXT);
  for (let k = 0; k < SOBRA_EXT; k++) D[k] = k < 3 || k >= SOBRA_EXT - 3 ? 1e12 : custo(0, k);
  for (let y = 1; y < H; y++) for (let k = 0; k < SOBRA_EXT; k++) {
    let best = 1e18, bk = k;
    for (const dk of [-1, 0, 1]) { const kk = k + dk; if (kk < 0 || kk >= SOBRA_EXT) continue; if (D[(y - 1) * SOBRA_EXT + kk] < best) { best = D[(y - 1) * SOBRA_EXT + kk]; bk = kk; } }
    D[y * SOBRA_EXT + k] = best + (k < 3 || k >= SOBRA_EXT - 3 ? 1e12 : custo(y, k)); V[y * SOBRA_EXT + k] = bk;
  }
  let k = 0, best = 1e18;
  for (let j = 0; j < SOBRA_EXT; j++) if (D[(H - 1) * SOBRA_EXT + j] < best) { best = D[(H - 1) * SOBRA_EXT + j]; k = j; }
  const costura = new Int16Array(H);
  for (let y = H - 1; y >= 0; y--) { costura[y] = k; k = V[y * SOBRA_EXT + k]; }
  const n = W - F0;
  for (let y = 0; y < H; y++) for (let j = 0; j < n; j++) {
    if (j < SOBRA_EXT && j < costura[y]) continue;
    const s = Bf(y, j), o = (y * MAX + LARGO - SOBRA_EXT + j) * 4;
    parede.copy(rocha, o, s, s + 4);
  }
  LARGO = LARGO - SOBRA_EXT + n;
}
if (LARGO < PRECISA) throw new Error(`rock ${LARGO} narrower than the band needs (${PRECISA})`);

// ─── 3. THE BAND: outside | ")" rim · his rock · "(" mirrored rim | inside ──────────────────────────────────────
// Band column X; the mirrored portal maps X → original column LF−1−X, so the inner rim of row y sits at
// [LF−1−fundo−ARO, LF−1−fundo] and the inside starts at LF−fundo (transparent from there). The contour is symmetric:
// the middle of the rock is the same column, LF−1 / 2, in every row (the scene swap hides there).
const faixa = Buffer.alloc(LF * H * 4);
const px = (b, w, x, y) => (y * w + x) * 4;
const dif = (y, X) => {
  const a = px(rocha, MAX, X, y), m = px(parede, W, LF - 1 - X, y);
  return Math.abs(rocha[a] - parede[m]) + Math.abs(rocha[a + 1] - parede[m + 1]) + Math.abs(rocha[a + 2] - parede[m + 2]);
};
// the seam, in CONTOUR-RELATIVE columns: X_k = LF−1−fundo−ARO−B−k (k = 0 nearest the inner rim), ±1 per row
const Xk = (y, k) => LF - 1 - fundo[y] - ARO - B - k;
const Dp = new Float64Array(H * SOBRA), Vp = new Int16Array(H * SOBRA);
for (let k = 0; k < SOBRA; k++) Dp[k] = dif(0, Xk(0, k));
for (let y = 1; y < H; y++) for (let k = 0; k < SOBRA; k++) {
  let best = 1e18, bk = k;
  for (const dk of [-1, 0, 1]) { const kk = k + dk; if (kk < 0 || kk >= SOBRA) continue; if (Dp[(y - 1) * SOBRA + kk] < best) { best = Dp[(y - 1) * SOBRA + kk]; bk = kk; } }
  Dp[y * SOBRA + k] = best + dif(y, Xk(y, k)); Vp[y * SOBRA + k] = bk;
}
const corte = new Int16Array(H);
{
  let k = 0, best = 1e18;
  for (let j = 0; j < SOBRA; j++) if (Dp[(H - 1) * SOBRA + j] < best) { best = Dp[(H - 1) * SOBRA + j]; k = j; }
  for (let y = H - 1; y >= 0; y--) { corte[y] = Xk(y, k); k = Vp[y * SOBRA + k]; }
}
let buracos = 0;
for (let y = 0; y < H; y++) for (let X = 0; X < LF; X++) {
  if (X <= fundo[y] || X >= LF - 1 - fundo[y]) continue; // the outside's mouth / the inside past the inner rim
  const o = px(faixa, LF, X, y);
  const s = X < corte[y] ? px(rocha, MAX, X, y) : px(parede, W, LF - 1 - X, y);
  const fonte = X < corte[y] ? rocha : parede;
  if (!fonte[s + 3]) { buracos++; continue; }
  fonte.copy(faixa, o, s, s + 4);
}
await png(faixa, LF, H, 'cav-faixa.png');

// ─── 4. The ceiling: the Teto's rows down to its last rock, seamless; the contour = the lowest rock per column ─────
let fimTeto = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (op(teto, W, x, y)) fimTeto = Math.max(fimTeto, y);
const hT = fimTeto + 1;
const { T: tetoT, P: wT } = emendar(Buffer.from(teto.subarray(0, W * hT * 4)), W, hT, 48);
const contornoTeto = Array.from({ length: wT }, (_, x) => { let b = -1; for (let y = 0; y < hT; y++) if (tetoT[(y * wT + x) * 4 + 3]) b = y; return b + 1; });
await png(tetoT, wT, hT, 'cav-teto.png');

// ─── 5. The floor: the open part of the frame (before its closed wall), from a little above its floor, seamless ────
let paredeMol = W - 1;
while (paredeMol > W / 2) { let n = 0; for (let y = 0; y < H; y++) if (op(moldura, W, paredeMol - 1, y)) n++; if (n / H < 0.9) break; paredeMol--; }
const larguraAberta = paredeMol - 10;
const topos = Array.from({ length: larguraAberta - 20 }, (_, i) => { const x = i + 10; let b = H - 1; while (b > 0 && op(moldura, W, x, b)) b--; return b; }).sort((a, b) => a - b);
// from just above the HIGHEST floor rock (the median cut the tallest rocks flat, 21/10)
const chaoY = topos[0] - 1;
const hC = H - chaoY;
const faixaChao = Buffer.alloc(larguraAberta * hC * 4);
for (let y = 0; y < hC; y++) moldura.copy(faixaChao, y * larguraAberta * 4, ((chaoY + y) * W) * 4, ((chaoY + y) * W + larguraAberta) * 4);
const { T: chaoT, P: wC } = emendar(faixaChao, larguraAberta, hC, 48);
const contornoChao = Array.from({ length: wC }, (_, x) => { let t = 0; while (t < hC && !chaoT[(t * wC + x) * 4 + 3]) t++; return chaoY + t; });
await png(chaoT, wC, hC, 'cav-chao.png');

// ─── 6. The fog colour of the cave (the middle band of the interior) and the data ───────────────────────────────
const cores = [[], [], []];
for (let y = 140; y < 176; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) cores[c].push(interior[(y * W + x) * 4 + c]);
const nevoa = cores.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
const dados = {
  largura: LF, fundo, fundoMeio, aroPx: ARO, rocha: ROCHA,
  faixa: { chave: 'f1-cav-faixa' },
  teto: { chave: 'f1-cav-teto', w: wT, h: hT, contorno: contornoTeto },
  chao: { chave: 'f1-cav-chao', w: wC, h: hC, y: chaoY, contorno: contornoChao },
  interior: { chave: 'f1-cav-interior' },
  nevoa,
};
fs.writeFileSync(path.join(OUT, 'caverna.json'), JSON.stringify(dados));
const maxTeto = Math.max(...contornoTeto), minChao = Math.min(...contornoChao);
console.log(`boca: fundo no meio ${fundoMeio}, de ${Math.min(...fundo)} a ${Math.max(...fundo)}`);
console.log(`faixa ${LF}×${H}: rocha na cintura ${ROCHA} px (+ ${2 * ARO} das bordas); costura a ${B}–${B + SOBRA} px da borda de dentro; ${buracos} pixels vazios na rocha`);
console.log(`teto ${wT}×${hT} (ponta mais baixa ${maxTeto}); chão ${wC}×${hC} desde y ${chaoY} (topo mais alto ${minChao})`);
console.log(`vão mínimo sem deslocar o teto: ${minChao - maxTeto} px; névoa ${nevoa}`);

// ─── 7. The sheet: the band (the entrance) and mirrored (the exit) over a checker, the ceiling and the floor twice ──
{
  const Z = 2;
  const pecas = [];
  const add = async (buf, w, h, left, top, espelha = false) => {
    let s = sharp(buf, { raw: { width: w, height: h, channels: 4 } });
    if (espelha) s = sharp(await s.flop().png().toBuffer());
    pecas.push({ input: await s.resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer(), left, top });
  };
  await add(faixa, LF, H, 10, 10);
  await add(faixa, LF, H, 20 + LF * Z, 10, true);
  const dois = (b, w, h) => { const o = Buffer.alloc(w * 2 * h * 4); for (let y = 0; y < h; y++) { b.copy(o, y * w * 2 * 4, y * w * 4, (y + 1) * w * 4); b.copy(o, (y * w * 2 + w) * 4, y * w * 4, (y + 1) * w * 4); } return o; };
  const topo2 = 20 + H * Z;
  await add(dois(tetoT, wT, hT), wT * 2, hT, 10, topo2);
  await add(dois(chaoT, wC, hC), wC * 2, hC, 10, topo2 + hT * Z + 10);
  const larg = Math.max(LF * Z * 2 + 30, wT * 2 * Z + 20), alt = topo2 + (hT + hC) * Z + 30;
  await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } }).composite(pecas).png().toFile(path.join(FOLHA, 'pecas.png'));
}
