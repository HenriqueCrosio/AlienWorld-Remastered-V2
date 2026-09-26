// PRÉVIA da Fatia 9: a Atmosfera nas FASES, aplicada OFFLINE sobre quadros reais de combate (`_ver-fase.mjs`).
// A conta é a do shader (`src/systems/atmosfera/AtmosferaPipeline.ts`, transcrita da prévia C aprovada), com a cor
// da névoa e da luz lidas de cada quadro. Colunas: ORIGINAL | −15% | −25% do nível das cutscenes.
// A faixa da HUD (y < 20: placar, barras de vida) fica LIMPA, como a câmera limpa faz no jogo.
//
//   node scripts/_f9/_preview-fases.mjs <pasta-quadros> <saida.png>
import fs from 'node:fs';
import sharp from 'sharp';

const [pasta, saida] = process.argv.slice(2);
const W = 384, H = 216, HUD = 20;
/** O nível das cutscenes (a média dos perfis aprovados, já com o grão suavizado) — a referência dos −15/−25%. */
const CUTSCENE = { densidade: 0.8, grao: 0.7, halo: 0.27, vinheta: 0.55, grade: 1, altura: 2 };
const VARIANTES = [['−15%', 0.85], ['−25%', 0.75]];

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

function ler(px) {
  const nev = [0, 0, 0], luz = [0, 0, 0]; let nn = 0, nl = 0;
  for (let i = W * HUD; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], l = lum(r, g, b);
    if (l > 30 && l < 90) { nev[0] += r; nev[1] += g; nev[2] += b; nn++; }
    if (r > 150 && r > g * 1.3) { luz[0] += r; luz[1] += g; luz[2] += b; nl++; }
  }
  const n = (v, k) => v.map((c) => c / Math.max(1, k));
  return { corNev: n(nev, nn).map((c, j) => Math.min(255, c * 1.5 + [4, 8, 14][j])), corLuz: nl ? n(luz, nl) : [230, 110, 40] };
}

function tratar(base, p) {
  const px = Float32Array.from(base), { corNev, corLuz } = ler(base);
  const quente = (i) => base[i * 3] >= 150 && base[i * 3] > base[i * 3 + 1] * 1.3;
  for (let y = HUD; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = bayer(x, y);
    // névoa
    const baixo = Math.pow(y / H, p.altura);
    const f1 = fbm(x / 70 + 3, y / 26, 3), f2 = fbm(x / 45 + 9, y / 18, 5);
    const f = Math.max(0, Math.min(1, ((f1 * 0.6 + f2 * 0.4) - 0.35) * 1.6 * (0.35 + baixo)));
    const a = (Math.floor(f * 3 + d) / 3) * 0.42 * p.densidade;
    for (let j = 0; j < 3; j++) px[i * 3 + j] += (corNev[j] - px[i * 3 + j]) * a;
    // halo: 7×7 passo 2, como o shader
    let soma = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx * 2, yy = y + dy * 2;
      if (xx >= 0 && xx < W && yy >= 0 && yy < H && quente(yy * W + xx)) soma++;
    }
    const v = Math.floor(Math.min(1, (soma / 49) * 2.4) * 4 + d - 0.5) / 4;
    if (v > 0) for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + corLuz[j] * v * p.halo);
    for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j]);
    // cor
    const l = lum(px[i * 3], px[i * 3 + 1], px[i * 3 + 2]) / 255, s = 1 - l;
    px[i * 3] += p.grade * (-6 * s + 10 * l); px[i * 3 + 1] += p.grade * (3 * s + 3 * l); px[i * 3 + 2] += p.grade * (8 * s - 8 * l);
    // vinheta
    const vin = Math.max(0, Math.min(1, (Math.hypot((x - W / 2) / (W / 2), ((y - H / 2) / (H / 2)) * 0.9) - 0.55) / 0.6));
    for (let j = 0; j < 3; j++) px[i * 3 + j] *= 1 - vin * p.vinheta;
    // grão
    const g = (rnd() + rnd() + rnd() - 1.5) * 9 * p.grao;
    for (let j = 0; j < 3; j++) px[i * 3 + j] = clamp(px[i * 3 + j] + g);
  }
  return px;
}

const rot = (t) => Buffer.from(`<svg width="${W}" height="20"><rect y="196" width="${t.length * 8 + 10}" height="18" fill="#000"/><text x="5" y="209" font-family="monospace" font-size="12" fill="#fc6">${t}</text></svg>`.replace('height="20"', 'height="216"'));
const quadros = fs.readdirSync(pasta).filter((f) => f.endsWith('.png')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const pecas = [];
for (let k = 0; k < quadros.length; k++) {
  const { data } = await sharp(`${pasta}/${quadros[k]}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = Float32Array.from(data);
  const colunas = [['ORIGINAL', base], ...VARIANTES.map(([nome, f]) => {
    semente = 7;
    const p = { ...CUTSCENE, densidade: CUTSCENE.densidade * f, grao: CUTSCENE.grao * f, halo: CUTSCENE.halo * f, vinheta: CUTSCENE.vinheta * f, grade: CUTSCENE.grade * f };
    return [nome, tratar(base, p)];
  })];
  for (let c = 0; c < colunas.length; c++) {
    const [nome, px] = colunas[c];
    const png = await sharp(Buffer.from(Uint8Array.from(px, (v) => clamp(Math.round(v)))), { raw: { width: W, height: H, channels: 3 } })
      .composite([{ input: rot(`${quadros[k].replace('.png', '')} · ${nome}`), left: 0, top: 0 }]).png().toBuffer();
    pecas.push({ input: png, left: c * (W + 4), top: k * (H + 4) });
  }
}
await sharp({ create: { width: 3 * (W + 4) - 4, height: quadros.length * (H + 4) - 4, channels: 3, background: '#000' } }).composite(pecas).png().toFile(saida);
console.log('folha:', saida, `(${quadros.length} quadros)`);
