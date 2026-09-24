// P6 · A QUEDA (capítulo 5). Duas peças:
//   1. o FUNDO: a MESMA lua do capítulo 4 (o zero-G espelhado, com a atmosfera roxa acesa), vista MAIS DE PERTO —
//      gerada com o céu do capítulo 4 como referência de estilo e de assunto. ⚠️ O conceito 5★ tinha a lua cinza
//      do menu: cortar do 4 para ele trocaria de lua no meio da cena. A lua é uma só;
//   2. o CORPO EM REENTRADA: recortado do conceito 5★ aprovado (como o Leviatã do capítulo 4), com a borda em
//      brasa AMANSADA (spec §4, P6: era o ponto mais claro da cena).
//
//   node scripts/_f8/_gerar-queda.mjs fundo <seed> [<seed> ...]   → scripts/_f8/_lua-perto-<seed>.png (candidatos)
//   node scripts/_f8/_gerar-queda.mjs corpo                       → public/sprites/f8-reentrada.png
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const [modo, ...resto] = process.argv.slice(2);

if (modo === 'fundo') {
  const REF = 'public/sprites/f8-fundo-ferida.png';
  for (const seed of resto.map(Number)) {
    const [img] = await gerar('/generate-image-v2', {
      description: 'The same moon from the reference, seen MUCH CLOSER: its cratered dark surface fills the lower third of the frame with a low, gently curved horizon, a thin glowing purple atmosphere line along the horizon, dark empty sky above with a few faint stars. No creatures, no ships, no asteroids. Dark sci-fi pixel art, desaturated, low contrast, same palette as the reference.',
      image_size: { width: 384, height: 216 },
      no_background: false,
      seed,
      reference_images: [{ image: b64(REF), size: { width: 384, height: 216 }, usage_description: 'this exact moon: its surface, craters, purple atmosphere glow and palette — now much closer' }],
      style_image: { image: b64(REF), size: { width: 384, height: 216 } },
      style_options: { color_palette: true, outline: true, detail: true, shading: true },
    });
    fs.writeFileSync(`scripts/_f8/_lua-perto-${seed}.png`, img);
    console.log(`scripts/_f8/_lua-perto-${seed}.png`);
  }
}

if (modo === 'corpo') {
  const SRC = `${F}/conceito-5-queda-11-limpo.png`;
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const lum = (i) => 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
  // o espaço: o preto ligado às bordas de CIMA e dos LADOS (embaixo é a lua do conceito, que não vem junto)
  const espaco = new Uint8Array(W * H);
  const fila = [];
  for (let x = 0; x < W; x++) fila.push(x);
  for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
  for (const p of fila) espaco[p] = 1;
  for (let k = 0; k < fila.length; k++) {
    const p = fila[k], x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q]) continue;
      // o espaço deste conceito é (10,13,22), lum 13,1; o casco mais escuro, (10,17,26), lum 16
      if (lum(q * 4) < 14.5) { espaco[q] = 1; fila.push(q); }
    }
  }
  // o corpo = a região que contém o meio do bicho (a lua embaixo é outra região)
  const SEMENTE = { x: 185, y: 110 };
  const corpo = new Uint8Array(W * H);
  const f = [SEMENTE.y * W + SEMENTE.x];
  corpo[f[0]] = 1;
  for (let k = 0; k < f.length; k++) {
    const p = f[k], x = p % W, y = (p / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      // a lua: tudo abaixo da linha do horizonte do conceito (y ≥ 151: ali começa a lua cinza do conceito) não entra
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q] || corpo[q]) continue;
      // ⚠️ abaixo de y=151 a lua cinza do conceito encosta no focinho: ali só entra pixel QUENTE (a brasa) — um
      // corte reto nessa linha arrancava a ponta do focinho e deixava uma borda reta (a lição do rasgo)
      if (yy >= 151 && !(data[q * 4] > data[q * 4 + 2] + 30)) continue;
      corpo[q] = 1; f.push(q);
    }
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let p = 0; p < W * H; p++) if (corpo[p]) {
    const x = p % W, y = (p / W) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4, 0);
  let amansados = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = (y + y0) * W + x + x0, i = p * 4, o = (y * cw + x) * 4;
    if (!corpo[p]) continue;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    // AMANSAR: o quase-branco da borda em brasa desce para o laranja quente — é energia, mas não o ponto mais claro
    if (lum(i) > 190) { r = 238; g = 118; b = 52; amansados++; }
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
  }
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile('public/sprites/f8-reentrada.png');
  console.log(`f8-reentrada.png ${cw}×${ch} (no conceito em ${x0},${y0}) · ${amansados}px amansados`);
}

if (modo === 'superficie') {
  // A SUPERFÍCIE À FRENTE: o chão da lua (do horizonte para baixo) numa camada própria, por cima do corpo —
  // é ela que "engole" o bicho quando ele passa do horizonte, sem máscara reta. O horizonte de cada coluna é a
  // linha acesa da atmosfera: a linha MAIS CLARA da coluna entre y=100 e y=180; dali para baixo é chão.
  const SRC = 'public/sprites/f8-lua-perto.png';
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const lum = (i) => 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
  const out = Buffer.alloc(W * H * 4, 0);
  const horizonte = [];
  for (let x = 0; x < W; x++) {
    let melhor = 100, lMax = -1;
    for (let y = 100; y < 180; y++) { const l = lum((y * W + x) * 4); if (l > lMax) { lMax = l; melhor = y; } }
    horizonte.push(melhor);
    for (let y = melhor; y < H; y++) { const i = (y * W + x) * 4; data.copy(out, i, i, i + 4); out[i + 3] = 255; }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile('public/sprites/f8-lua-perto-chao.png');
  fs.writeFileSync('scripts/_f8/_horizonte.json', JSON.stringify(horizonte));
  console.log(`f8-lua-perto-chao.png · horizonte de y=${Math.min(...horizonte)} a ${Math.max(...horizonte)}`);
}

if (modo === 'escalas') {
  // A PERSPECTIVA DA QUEDA (24/09): *"enquanto o leviatã cai, ele vai diminuindo de tamanho para parecer que ele
  // vai se distanciando até cair na lua (o leviatã é grande, mas não do tamanho de uma lua)"*. Reduzir no motor a
  // cada quadro cintila a pixel art; então os tamanhos são ASSADOS aqui (redução com filtro bom, fora do jogo —
  // reduzir pode) e a cena troca de quadro conforme ele cai. N passos em progressão geométrica, do inteiro a FIM.
  // Todos no mesmo quadro (o tamanho do inteiro), CENTRADOS — a cena ancora pelo centro.
  const N = 12, FIM = 0.18;
  const SRC = 'public/sprites/f8-reentrada.png';
  const m = await sharp(SRC).metadata();
  const quadros = [];
  for (let k = 0; k < N; k++) {
    const e = Math.pow(FIM, k / (N - 1));
    const w = Math.max(4, Math.round(m.width * e)), h = Math.max(4, Math.round(m.height * e));
    const img = k === 0 ? await sharp(SRC).png().toBuffer() : await sharp(SRC).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
    // o lanczos cria meio-alfa nas bordas: pixel art não tem — corta em 50%
    const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 128 ? 255 : 0;
    quadros.push({ input: await sharp(data, { raw: info }).png().toBuffer(), left: k * m.width + Math.round((m.width - info.width) / 2), top: Math.round((m.height - info.height) / 2) });
  }
  await sharp({ create: { width: m.width * N, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(quadros).png().toFile('public/sprites/f8-reentrada-escalas.png');
  console.log(`f8-reentrada-escalas.png: ${N} tamanhos de ${m.width}×${m.height}, do inteiro a ${FIM}`);
}
