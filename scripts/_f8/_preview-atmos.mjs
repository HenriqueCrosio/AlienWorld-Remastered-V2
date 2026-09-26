// PRÉVIA do passe atmosférico — A (pixel-fiel) · B (shader) · C (híbrido), aplicados OFFLINE sobre quadros reais.
// Não é o efeito do jogo: é maquete para ele escolher a natureza do tratamento.
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f8/_preview-atmos.mjs 2600,11000,22000,30000 docs/superpowers/folhas/2026-09-25/atmos-abc.png
import { chromium } from 'playwright';
import sharp from 'sharp';

const INSTANTES = (process.argv[2] ?? '2600,11000,22000,30000').split(',').map(Number);
const saida = process.argv[3] ?? 'scripts/_f8/_atmos.png';
const W = 384, H = 216, Z = 2;

// ─── captura em resolução nativa ───
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
const t0 = Date.now();
const fotos = [];
for (const ms of INSTANTES) {
  const falta = ms - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  fotos.push({ ms, buf: await page.screenshot() });
}
await browser.close();

// ─── ferramentas ───
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
let semente = 7;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const suave = (t) => t * t * (3 - 2 * t);
function ruido(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = suave(x - xi), fy = suave(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x, y, s) => 0.55 * ruido(x, y, s) + 0.3 * ruido(x * 2.1, y * 2.1, s + 1) + 0.15 * ruido(x * 4.3, y * 4.3, s + 2);
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function borrar(src, raio, passes) {
  let a = Float32Array.from(src), t = new Float32Array(W * H);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let k = -raio; k <= raio; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += a[y * W + xx]; n++; } }
      t[y * W + x] = s / n;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let k = -raio; k <= raio; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += t[yy * W + x]; n++; } }
      a[y * W + x] = s / n;
    }
  }
  return a;
}

/** A leitura da cena: a cor de névoa (a média dos tons médio-escuros) e a cor da luz (a média do que é quente e aceso). */
function ler(px) {
  const nev = [0, 0, 0], luz = [0, 0, 0]; let nn = 0, nl = 0;
  const quente = new Float32Array(W * H), claro = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], l = lum(r, g, b);
    if (l > 30 && l < 90) { nev[0] += r; nev[1] += g; nev[2] += b; nn++; }
    if (r > 150 && r > g * 1.3) { quente[i] = 1; luz[0] += r; luz[1] += g; luz[2] += b; nl++; }
    if (l > 170) claro[i] = 1;
  }
  const n = (v, k) => v.map((c) => c / Math.max(1, k));
  const corNev = n(nev, nn).map((c, j) => c * 1.5 + [4, 8, 14][j]); // a névoa é o tom médio da cena, levantado
  const corLuz = nl ? n(luz, nl) : [230, 110, 40];
  return { corNev, corLuz, quente, claro };
}

const mistura = (px, i, cor, a) => { for (let j = 0; j < 3; j++) px[i * 3 + j] = px[i * 3 + j] + (cor[j] - px[i * 3 + j]) * a; };
const soma = (px, i, cor, a) => { for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + cor[j] * a); };

// ─── os pedaços ───
function nevoa(px, cor, s, dither) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const baixo = Math.pow(y / H, 1.6);                       // mais densa embaixo
    let f = (fbm(x / 70 + s, y / 26, s) - 0.35) * 1.6 * (0.35 + baixo);
    f = Math.max(0, Math.min(1, f));
    const a = dither ? (Math.floor(f * 3 + bayer(x, y)) / 3) * 0.42 : f * 0.42;
    mistura(px, i, cor, a);
  }
}
function brilho(px, mascara, cor, forca, dither, raio) {
  const g = borrar(mascara, raio, 2);
  for (let i = 0; i < W * H; i++) {
    let v = Math.min(1, g[i] * 2.4);
    if (dither) v = Math.floor(v * 4 + bayer(i % W, (i / W) | 0) - 0.5) / 4;
    if (v > 0) soma(px, i, cor, v * forca / 255);
  }
}
function poeira(px, cor, n) {
  semente = 11;
  for (let k = 0; k < n; k++) {
    const x = (rnd() * W) | 0, y = (rnd() * H) | 0, i = y * W + x;
    mistura(px, i, cor, 0.35 + rnd() * 0.35);
  }
}
function vinheta(px, forca, dither) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    let v = Math.max(0, Math.min(1, (Math.hypot(dx, dy * 0.9) - 0.55) / 0.6));
    if (dither) v = Math.floor(v * 4 + bayer(x, y) - 0.25) / 4;
    const k = 1 - Math.max(0, v) * forca, i = y * W + x;
    for (let j = 0; j < 3; j++) px[i * 3 + j] *= k;
  }
}
function grao(px, amp, fracao, s) {
  semente = s;
  for (let i = 0; i < W * H; i++) {
    if (rnd() > fracao) continue;
    const d = fracao < 1 ? (rnd() < 0.5 ? -amp : amp) : (rnd() + rnd() + rnd() - 1.5) * amp; // pixel solto × gaussiano
    for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + d);
  }
}
function aberracao(px) {
  const o = Float32Array.from(px);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    px[i * 3] = o[(y * W + Math.min(W - 1, x + 1)) * 3];
    px[i * 3 + 2] = o[(y * W + Math.max(0, x - 1)) * 3 + 2];
  }
}
function grade(px) { // sombra para o petróleo, luz para o âmbar — o mesmo tom nos sete capítulos
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], l = lum(r, g, b) / 255;
    const s = 1 - l, h = l;
    px[i * 3] = clamp(r - 6 * s + 10 * h); px[i * 3 + 1] = clamp(g + 3 * s + 3 * h); px[i * 3 + 2] = clamp(b + 8 * s - 8 * h);
  }
}
function quantizar(px) { for (let i = 0; i < px.length; i++) px[i] = clamp(Math.round(px[i])); }

// ─── os três tratamentos ───
function A(base, l) {
  const px = Float32Array.from(base);
  nevoa(px, l.corNev, 3, true);
  brilho(px, l.quente, l.corLuz, 70, true, 5);
  poeira(px, l.corNev.map((c) => c * 1.6), 110);
  vinheta(px, 0.6, true);
  grao(px, 14, 0.035, 5);
  return px;
}
function B(base, l) {
  const px = Float32Array.from(base);
  nevoa(px, l.corNev, 3, false);
  brilho(px, l.claro, [255, 235, 210], 110, false, 9);
  aberracao(px);
  vinheta(px, 0.65, false);
  grao(px, 16, 1, 5);
  return px;
}
function C(base, l) {
  const px = Float32Array.from(base);
  nevoa(px, l.corNev, 3, true);
  brilho(px, l.quente, l.corLuz, 70, true, 5);
  poeira(px, l.corNev.map((c) => c * 1.6), 110);
  grade(px);
  vinheta(px, 0.5, false);
  grao(px, 9, 1, 5);
  return px;
}

// ─── a folha ───
const ROTULOS = ['ORIGINAL', 'A · PIXEL-FIEL', 'B · SHADER', 'C · HÍBRIDO'];
const celulas = [];
for (const { ms, buf } of fotos) {
  const { data } = await sharp(buf).resize(W, H, { kernel: 'nearest' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = Float32Array.from(data), l = ler(base);
  const versoes = [base, A(base, l), B(base, l), C(base, l)];
  for (let k = 0; k < 4; k++) {
    const v = Float32Array.from(versoes[k]); quantizar(v);
    const png = await sharp(Buffer.from(Uint8Array.from(v)), { raw: { width: W, height: H, channels: 3 } })
      .resize(W * Z, H * Z, { kernel: 'nearest' })
      .composite([{ input: Buffer.from(`<svg width="260" height="24"><rect width="${k ? 170 : 150}" height="22" fill="#000"/><text x="6" y="16" font-family="monospace" font-size="14" fill="#fc6">${ROTULOS[k]} ${k ? '' : ms + 'ms'}</text></svg>`), left: 0, top: 0 }])
      .png().toBuffer();
    celulas.push(png);
  }
}
const CW = W * Z, CH = H * Z, G = 4;
await sharp({ create: { width: CW * 4 + G * 3, height: CH * fotos.length + G * (fotos.length - 1), channels: 3, background: '#000' } })
  .composite(celulas.map((input, i) => ({ input, left: (i % 4) * (CW + G), top: Math.floor(i / 4) * (CH + G) })))
  .png().toFile(saida);
console.log('folha:', saida);
