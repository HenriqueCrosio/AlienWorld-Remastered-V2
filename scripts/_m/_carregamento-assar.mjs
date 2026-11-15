// BLOCK M4 (15/11) — bakes the LOADING SCREEN from his painting ("Hangar no Coração da Tempestade"): everything at the
// native 384×216, 1 texel = 1 game px, in the palette of the painting.
//   fundo.png      the painting, with the vignette and the grain baked in (this screen exists before the game: it does
//                  not go through the Atmosfera)
//   clarao-N.png   the flashes BEHIND the clouds: light where the painting's clouds are thin, around N points
//   neblina-a/b    two tileable fog bands (they drift at different speeds)
//   brasa.png      the warm light of the hangar caught by the fog around the dock
//   luzes.png      the dock lights alone (they pulse)
//   chuva.png      a tile of thin rain
//   nave.svg       the silhouette of the ship of the bar (the X-AELO at half size, one flat tone), the engine fire in two frames
//   ../favicon.svg + ../favicon.png   the default ship alone, transparent around it, for the browser tab
//   node scripts/_m/_carregamento-assar.mjs ["<painting>"]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const FONTE = process.argv[2] ?? 'assets/raw/Hangar no Coração da Tempestade.png';
const OUT = 'public/carregamento';
const W = 384, H = 216;
fs.mkdirSync(OUT, { recursive: true });

// ─── helpers ───
let semente = 20261115;
const rnd = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** an alpha 0–1 snapped to fine steps (an ordered dither was tried: at 3× its mesh read as a screen door over the clouds) */
const pontilhar = (a, _x, _y, niveis) => Math.min(1, Math.round(a * niveis * 4) / (niveis * 4));
const suave = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** `cores`: the size of the palette (the layers are few tones each; a palette keeps them light) */
const salvar = async (nome, rgba, cores) => {
  const f = path.join(OUT, nome);
  await sharp(Buffer.from(rgba), { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: true, colours: cores, dither: 0.4, effort: 10 }).toFile(f);
  console.log(nome.padEnd(16), fs.statSync(f).size, 'bytes');
};
/** tileable (in x, period `px`) value noise with octaves, 0–1 */
function ruido(px, py, oitavas, seed) {
  const tabela = new Map();
  const h = (ix, iy, o) => { const k = `${o}:${ix}:${iy}`; let v = tabela.get(k); if (v === undefined) { v = rnd(); tabela.set(k, v); } return v; };
  void seed;
  return (x, y) => {
    let soma = 0, amp = 1, total = 0;
    for (let o = 0; o < oitavas; o++) {
      const nx = Math.max(1, Math.round((W / px) * 2 ** o)); // lattice columns across the tile: an integer, so it wraps
      const fx = (x / W) * nx, fy = (y / py) * 2 ** o;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = h(ix % nx, iy, o), b = h((ix + 1) % nx, iy, o), c = h(ix % nx, iy + 1, o), d = h((ix + 1) % nx, iy + 1, o);
      soma += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      total += amp;
      amp *= 0.5;
    }
    return soma / total;
  };
}

// ─── the painting at the native resolution ───
const { data: src } = await sharp(FONTE).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const luma = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) luma[i] = (0.299 * src[i * 3] + 0.587 * src[i * 3 + 1] + 0.114 * src[i * 3 + 2]) / 255;

// the dock: the warm pixels of the painting (orange light), and their centre
const quente = new Float32Array(W * H);
let qx = 0, qy = 0, qs = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, r = src[i * 3], g = src[i * 3 + 1], b = src[i * 3 + 2];
  const q = suave(1.25, 1.9, r / Math.max(1, b)) * suave(0.12, 0.3, luma[i]) * (g < r ? 1 : 0);
  quente[i] = q;
  qx += x * q; qy += y * q; qs += q;
}
const DOCA = { x: Math.round(qx / qs), y: Math.round(qy / qs) };
console.log('the dock (centre of the warm light):', DOCA);

// ─── fundo.png ───
{
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const vinheta = 1 - 0.3 * Math.min(1, (dx * dx + dy * dy) / 1.6);
    const grao = (rnd() - 0.5) * 5;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(src[i * 3 + c] * vinheta + grao)));
    out[i * 4 + 3] = 255;
  }
  await salvar('fundo.png', out, 96);
}

// ─── the flashes behind the clouds ───
// Around each point the light follows the painting: where its clouds are thin (lighter) the flash comes through, where
// they are thick (darker) they stay a silhouette against it. The levels are taken INSIDE each region, so a flash also
// shows the cloud shapes of the dark parts of the sky.
const CLAROES = [
  { x: 228, y: 56, rx: 104, ry: 66 },
  { x: 334, y: 44, rx: 88, ry: 60 },
  { x: 120, y: 70, rx: 96, ry: 58 },
  { x: 48, y: 122, rx: 100, ry: 54 },
  { x: 310, y: 126, rx: 104, ry: 54 },
  { x: 176, y: 22, rx: 96, ry: 44 },
];
for (const [n, c] of CLAROES.entries()) {
  const dentro = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2;
    if (d < 0.7) dentro.push(luma[y * W + x]);
  }
  dentro.sort((a, b) => a - b);
  const lo = dentro[Math.floor(dentro.length * 0.3)], hi = dentro[Math.floor(dentro.length * 0.985)];
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const d = ((x - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2;
    const queda = Math.exp(-d * 1.5);
    const fino = suave(lo, hi, luma[i]) ** 1.5;
    // a broad, faint lift of the whole region (the cloud mass lit from inside) + the strong light in the thin parts
    const a = pontilhar(Math.min(1, queda * (0.4 + 0.85 * fino)) * (1 - quente[i]), x, y, 14);
    const branco = fino * queda;
    out[i * 4] = Math.round(96 + 150 * branco);
    out[i * 4 + 1] = Math.round(140 + 110 * branco);
    out[i * 4 + 2] = 255;
    out[i * 4 + 3] = Math.round(a * 255);
  }
  await salvar(`clarao-${n + 1}.png`, out, 48);
}

// ─── the fog: two tileable bands, in the grey-blue of the painting's clouds ───
const meio = [...luma].sort((a, b) => a - b);
const [p55, p80] = [meio[Math.floor(meio.length * 0.55)], meio[Math.floor(meio.length * 0.8)]];
const cor = [0, 0, 0];
let nCor = 0;
for (let i = 0; i < W * H; i++) if (luma[i] > p55 && luma[i] < p80 && quente[i] < 0.05) { cor[0] += src[i * 3]; cor[1] += src[i * 3 + 1]; cor[2] += src[i * 3 + 2]; nCor++; }
const NEBLINA = cor.map((v) => Math.min(255, Math.round((v / nCor) * 2.7)));
console.log('fog colour:', NEBLINA);
const ruidoA = ruido(128, 34, 4, 1), ruidoB = ruido(192, 52, 4, 2);
for (const [nome, f, forca, y0, y1] of [['neblina-a.png', ruidoA, 0.62, 78, 180], ['neblina-b.png', ruidoB, 0.5, 30, 216]]) {
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // denser around the height of the dock and below it; the bottom band stays dark for the bar
    const faixa = suave(y0 - 40, y0, y) * (1 - suave(y1 - 30, y1 + 10, y) * 0.75);
    const a = pontilhar(suave(0.4, 0.8, f(x, y)) * faixa * forca, x, y, 8);
    out[i * 4] = NEBLINA[0]; out[i * 4 + 1] = NEBLINA[1]; out[i * 4 + 2] = NEBLINA[2];
    out[i * 4 + 3] = Math.round(a * 255);
  }
  await salvar(nome, out, 32);
}

// ─── brasa.png: the warm light of the hangar in the fog ───
{
  const nevoa = ruido(96, 26, 4, 3);
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const dx = (x - DOCA.x) / 84, dy = (y - (DOCA.y + 7)) / (y > DOCA.y + 7 ? 36 : 20);
    const d = dx * dx + dy * dy;
    // the light spills wide and DOWN (the fog bank under the dock catches it), in wisps, and the painting's clouds
    // catch it more where they are lighter
    const fumo = 0.08 + 0.92 * suave(0.34, 0.74, nevoa(x, y));
    const nuvem = 0.55 + 0.45 * suave(0.03, 0.2, luma[i]);
    const a = pontilhar(Math.min(1, Math.exp(-d * 1.7) * fumo * nuvem * 0.8 + Math.exp(-d * 22) * 0.3), x, y, 10);
    const perto = Math.exp(-d * 6);
    out[i * 4] = 255; out[i * 4 + 1] = Math.round(128 + 70 * perto); out[i * 4 + 2] = Math.round(52 + 60 * perto);
    out[i * 4 + 3] = Math.round(a * 255);
  }
  await salvar('brasa.png', out, 160);
}

// ─── luzes.png: the dock lights alone ───
{
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = Math.round(Math.min(1, quente[i] * 1.4) * 255);
    if (a === 0) continue;
    out[i * 4] = src[i * 3]; out[i * 4 + 1] = src[i * 3 + 1]; out[i * 4 + 2] = src[i * 3 + 2];
    out[i * 4 + 3] = a;
  }
  await salvar('luzes.png', out, 32);
}

// ─── chuva.png: a tile of thin rain (falls 2 px down for 1 px left) ───
{
  const T = 96;
  const out = new Uint8Array(T * T * 4);
  for (let k = 0; k < 26; k++) {
    let x = Math.floor(rnd() * T), y = Math.floor(rnd() * T);
    const comprimento = 3 + Math.floor(rnd() * 4), a = 0.16 + rnd() * 0.2;
    for (let s = 0; s < comprimento; s++) {
      const px = (((x - (s >> 1)) % T) + T) % T, py = (y + s) % T, i = (py * T + px) * 4;
      out[i] = 150; out[i + 1] = 176; out[i + 2] = 210; out[i + 3] = Math.round(a * 255 * (0.5 + 0.5 * (s / comprimento)));
    }
  }
  const f = path.join(OUT, 'chuva.png');
  await sharp(Buffer.from(out), { raw: { width: T, height: T, channels: 4 } }).png({ compressionLevel: 9 }).toFile(f);
  console.log('chuva.png'.padEnd(16), fs.statSync(f).size, 'bytes');
}

// ─── the ship: the silhouette of the bar and the favicon ───
const NAVE = 'public/sprites/naves/humana.png';
const lerNave = async (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: nv, info: ni } = await lerNave(NAVE);
const px = (d, x, y) => { const i = (y * ni.width + x) * 4; return x < 0 || y < 0 || x >= ni.width || y >= ni.height ? [0, 0, 0, 0] : [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
/** runs of equal colour per row → <rect>s */
function retangulos(corDe) {
  let s = '';
  for (let y = 0; y < ni.height; y++) {
    let x = 0;
    while (x < ni.width) {
      const c = corDe(x, y);
      if (!c) { x++; continue; }
      let x1 = x + 1;
      while (x1 < ni.width && corDe(x1, y) === c) x1++;
      s += `<rect x="${x}" y="${y}" width="${x1 - x}" height="1" fill="${c}"/>`;
      x = x1;
    }
  }
  return s;
}
{
  // THE SHIP OF THE BAR (his feedback, 15/11: the first one was *"muito grande e grosseira, pensei em algo mais
  // delicado, mais silhueta e menor"*, and the X-fighter *"fica mais elegante como carregamento, pois ela é uma das
  // naves mais antigas"*): the X-AELO at HALF size — a game pixel of the silhouette is on when at least 2 of the 4
  // sprite pixels under it are —, one flat tone, and a 2-pixel engine fire in two frames.
  const { data: jt, info: ji } = await lerNave('public/sprites/ship-jato.png');
  const cheio = (x, y) => (x < 0 || y < 0 || x >= ji.width || y >= ji.height ? 0 : jt[(y * ji.width + x) * 4 + 3] > 40 ? 1 : 0);
  const w = Math.ceil(ji.width / 2), h = Math.ceil(ji.height / 2);
  const meia = (x, y) => cheio(2 * x, 2 * y) + cheio(2 * x + 1, 2 * y) + cheio(2 * x, 2 * y + 1) + cheio(2 * x + 1, 2 * y + 1) >= 2;
  let corpo = '', y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!meia(x, y)) { x++; continue; }
      let x1 = x + 1;
      while (x1 < w && meia(x1, y)) x1++;
      corpo += `<rect x="${x}" y="${y}" width="${x1 - x}" height="1"/>`;
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      x = x1;
    }
  }
  // the engine: behind the tail of the fuselage (its longest row)
  let linha = 0, maior = 0;
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) if (meia(x, y)) n++; if (n > maior) { maior = n; linha = y; } }
  let cauda = 0;
  while (cauda < w && !meia(cauda, linha)) cauda++;
  const fogoA = `<rect x="${cauda - 2}" y="${linha}" width="1" height="1" fill="#e8641c"/><rect x="${cauda - 1}" y="${linha}" width="1" height="1" fill="#ffd27a"/>`;
  const fogoB = `<rect x="${cauda - 1}" y="${linha}" width="1" height="1" fill="#ff9a3c"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges"><g fill="#7189a3">${corpo}</g><g class="fogo-a">${fogoA}</g><g class="fogo-b">${fogoB}</g></svg>`;
  fs.writeFileSync(path.join(OUT, 'nave.svg'), svg);
  console.log('nave.svg'.padEnd(16), svg.length, 'bytes', `(${w}×${h}, the silhouette on rows ${y0}–${y1}, the nose at x=${w - 1}, the engine on row ${linha})`);
}
{
  // the favicon: only the ship, in its colours, on a transparent square (his feedback, 15/11)
  const L = ni.width, oy = Math.floor((L - ni.height) / 2);
  const corpo = retangulos((x, y) => { const p = px(nv, x, y); return p[3] > 40 ? hex(p[0], p[1], p[2]) : null; });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}" shape-rendering="crispEdges"><g transform="translate(0 ${oy})">${corpo}</g></svg>`;
  fs.writeFileSync('public/favicon.svg', svg);
  await sharp(Buffer.from(svg), { density: 72 * 4 }).resize(176, 176, { kernel: 'nearest' }).png({ compressionLevel: 9 }).toFile('public/favicon.png');
  console.log('favicon.svg'.padEnd(16), svg.length, 'bytes; favicon.png', fs.statSync('public/favicon.png').size, 'bytes');
}
console.log('total:', fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0), 'bytes in', OUT);
