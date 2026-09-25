// PRÉVIA EM MOVIMENTO do passe atmosférico C (híbrido), aplicada OFFLINE sobre a cena real: ORIGINAL | C, lado a
// lado, em WebP animado a 12 fps. Não é o efeito do jogo — é maquete do comportamento no tempo (a névoa derivando,
// a poeira flutuando, o halo da lava respirando, o grão trocando de padrão).
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f8/_preview-atmos-mov.mjs <inicioMs>:<duracaoMs>[,...] <pasta-saida>
//   ex.: node scripts/_f8/_preview-atmos-mov.mjs 150:1300,8500:2500,25000:2500 docs/superpowers/folhas/2026-09-25
import { chromium } from 'playwright';
import sharp from 'sharp';

const TRECHOS = (process.argv[2] ?? '150:1300,8500:2500,25000:2500').split(',').map((s) => s.split(':').map(Number));
const pasta = process.argv[3] ?? 'scripts/_f8';
const W = 384, H = 216, Z = 2, FPS = 12;

// ─── captura: o mais rápido que der, com o relógio de cada quadro ───
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
const t0 = Date.now();
const capturas = TRECHOS.map(() => []);
for (let k = 0; k < TRECHOS.length; k++) {
  const [ini, dur] = TRECHOS[k];
  const falta = ini - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  while (Date.now() - t0 < ini + dur) capturas[k].push({ ms: Date.now() - t0, buf: await page.screenshot() });
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
function ler(px) {
  const nev = [0, 0, 0], luz = [0, 0, 0]; let nn = 0, nl = 0;
  const quente = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], l = lum(r, g, b);
    if (l > 30 && l < 90) { nev[0] += r; nev[1] += g; nev[2] += b; nn++; }
    if (r > 150 && r > g * 1.3) { quente[i] = 1; luz[0] += r; luz[1] += g; luz[2] += b; nl++; }
  }
  const n = (v, k) => v.map((c) => c / Math.max(1, k));
  return { corNev: n(nev, nn).map((c, j) => c * 1.5 + [4, 8, 14][j]), corLuz: nl ? n(luz, nl) : [230, 110, 40], quente };
}
const mistura = (px, i, cor, a) => { for (let j = 0; j < 3; j++) px[i * 3 + j] += (cor[j] - px[i * 3 + j]) * a; };
const soma = (px, i, cor, a) => { for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + cor[j] * a); };

// ─── C no tempo t (s) ───
/** A névoa: duas camadas de ruído que derivam em velocidades diferentes (a de trás mais lenta) e se transformam. */
function nevoa(px, cor, t) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const baixo = Math.pow(y / H, 1.6);
    const f1 = fbm((x + t * 6) / 70 + 3, y / 26 + t * 0.03, 3);
    const f2 = fbm((x + t * 14) / 45 + 9, y / 18, 5);
    let f = ((f1 * 0.6 + f2 * 0.4) - 0.35) * 1.6 * (0.35 + baixo);
    f = Math.max(0, Math.min(1, f));
    mistura(px, y * W + x, cor, (Math.floor(f * 3 + bayer(x, y)) / 3) * 0.42);
  }
}
/** O halo da lava respira devagar (~2,4s por ciclo). */
function halo(px, mascara, cor, t) {
  const g = borrar(mascara, 5, 2), forca = 70 * (0.8 + 0.2 * Math.sin((t * Math.PI * 2) / 2.4));
  for (let i = 0; i < W * H; i++) {
    const v = Math.floor(Math.min(1, g[i] * 2.4) * 4 + bayer(i % W, (i / W) | 0) - 0.5) / 4;
    if (v > 0) soma(px, i, cor, (v * forca) / 255);
  }
}
/** A poeira: cada grão com a própria deriva e cintilar. */
const GRAOS = (() => { semente = 11; return Array.from({ length: 110 }, () => ({ x: rnd() * W, y: rnd() * H, vx: 1 + rnd() * 5, vy: -2 + rnd() * 3, a: 0.35 + rnd() * 0.35, f: rnd() * 6 })); })();
function poeira(px, cor, t) {
  for (const g of GRAOS) {
    const x = ((((g.x + g.vx * t) % W) + W) % W) | 0, y = ((((g.y + g.vy * t) % H) + H) % H) | 0;
    mistura(px, y * W + x, cor, g.a * (0.6 + 0.4 * Math.sin(t * 3 + g.f)));
  }
}
function grade(px) {
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], l = lum(r, g, b) / 255, s = 1 - l;
    px[i * 3] = clamp(r - 6 * s + 10 * l); px[i * 3 + 1] = clamp(g + 3 * s + 3 * l); px[i * 3 + 2] = clamp(b + 8 * s - 8 * l);
  }
}
function vinheta(px) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.max(0, Math.min(1, (Math.hypot((x - W / 2) / (W / 2), ((y - H / 2) / (H / 2)) * 0.9) - 0.55) / 0.6));
    const k = 1 - v * 0.5, i = y * W + x;
    for (let j = 0; j < 3; j++) px[i * 3 + j] *= k;
  }
}
/** O grão troca de padrão a cada quadro (12 fps — o passo do filme). */
function grao(px, quadro) {
  semente = 1000 + quadro * 7919;
  for (let i = 0; i < W * H; i++) { const d = (rnd() + rnd() + rnd() - 1.5) * 9; for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + d); }
}
function C(base, t, quadro) {
  const l = ler(base), px = Float32Array.from(base);
  nevoa(px, l.corNev, t);
  halo(px, l.quente, l.corLuz, t);
  poeira(px, l.corNev.map((c) => c * 1.6), t);
  grade(px); vinheta(px); grao(px, quadro);
  return px;
}

// ─── os WebPs ───
const png = (px) => sharp(Buffer.from(Uint8Array.from(px, (v) => clamp(Math.round(v)))), { raw: { width: W, height: H, channels: 3 } })
  .resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer();
const rotulo = (txt) => Buffer.from(`<svg width="200" height="24"><rect width="${txt.length * 9 + 12}" height="22" fill="#000"/><text x="6" y="16" font-family="monospace" font-size="14" fill="#fc6">${txt}</text></svg>`);
for (let k = 0; k < TRECHOS.length; k++) {
  const [ini, dur] = TRECHOS[k], lista = capturas[k], quadros = [];
  const n = Math.floor((dur / 1000) * FPS);
  for (let q = 0; q < n; q++) {
    const alvo = ini + (q * 1000) / FPS;
    const foto = lista.reduce((m, c) => (Math.abs(c.ms - alvo) < Math.abs(m.ms - alvo) ? c : m));
    const { data } = await sharp(foto.buf).resize(W, H, { kernel: 'nearest' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const base = Float32Array.from(data);
    const [a, b] = await Promise.all([png(base), png(C(base, q / FPS, q))]);
    quadros.push(await sharp({ create: { width: W * Z * 2 + 4, height: H * Z, channels: 3, background: '#000' } })
      .composite([{ input: a, left: 0, top: 0 }, { input: b, left: W * Z + 4, top: 0 }, { input: rotulo('ORIGINAL'), left: 0, top: 0 }, { input: rotulo('C · HÍBRIDO'), left: W * Z + 4, top: 0 }])
      .png().toBuffer());
  }
  const saida = `${pasta}/atmos-c-mov-${ini}.webp`;
  await sharp(quadros, { join: { animated: true } }).webp({ lossless: true, loop: 0, delay: Array(quadros.length).fill(Math.round(1000 / FPS)) }).toFile(saida);
  console.log(`${saida}  (${quadros.length} quadros, ${lista.length} capturas reais)`);
}
