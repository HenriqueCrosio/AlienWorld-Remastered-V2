// Sheet: the three icon-colour options (A rarity · B neutral · C category), on the real table at 1152×648 (s=3).
// Usage: node scripts/_folha-icones-cor.mjs <mesa-1152.png> <out.png>
import sharp from 'sharp';

const [MESA, OUT] = process.argv.slice(2);
const DIR = 'public/sprites/cartas/';
const S = 3;

const RARIDADE = { comum: 0x8a93a6, incomum: 0x3ee0f0, rara: 0xb07cff, epica: 0xff8c1a };
const CAT = { arma: 0xff8c1a, efeito: 0xe8306b, defesa: 0x3ee0f0, movimento: 0x5fe07a };
const NEUTRA = 0xdfe8f0;
const CARTAS = [
  ['WPN_001', 'comum', 'arma'], ['WPN_002', 'incomum', 'arma'], ['WPN_004', 'comum', 'arma'], ['WPN_007', 'incomum', 'arma'],
  ['WPN_008', 'rara', 'arma'], ['EFF_001', 'incomum', 'efeito'], ['EFF_004', 'incomum', 'efeito'], ['EFF_006', 'epica', 'efeito'],
  ['DEF_001', 'comum', 'defesa'], ['DEF_002', 'incomum', 'defesa'], ['DEF_003', 'rara', 'defesa'], ['DEF_004', 'rara', 'defesa'],
  ['MOV_001', 'comum', 'movimento'],
];
const INFO = Object.fromEntries(CARTAS.map(([id, r, c]) => [id, { r, c }]));
// Category palette that dodges the rarity hues (grey/cyan/purple/orange).
const CAT2 = { arma: 0xffd447, efeito: 0xe8306b, defesa: 0x5fe07a, movimento: 0xdfe8f0 };
const VARIANTE = process.argv[4] ?? 'cor';
const OPCOES = VARIANTE === 'cor'
  ? [
    { tag: 'A · NA COR DA RARIDADE', cor: (id) => RARIDADE[INFO[id].r] },
    { tag: 'B · UMA COR NEUTRA', cor: () => NEUTRA },
    { tag: 'C · UMA COR POR CATEGORIA', cor: (id) => CAT[INFO[id].c] },
  ]
  : [
    { tag: 'C1 · como a folha anterior (paletas cruzam)', cor: (id) => CAT[INFO[id].c] },
    { tag: 'C2 · categoria em cores que a raridade não usa', cor: (id) => CAT2[INFO[id].c] },
    { tag: 'C3 · a cor é SÓ da categoria; raridade = marcas', cor: (id) => CAT[INFO[id].c], neutra: true },
  ];

// C3: the rarity-coloured strips go neutral steel; the rarity becomes 1–4 pips beside the label.
const ACO_FAIXA = [58, 66, 82];
const PIPS = { comum: 1, incomum: 2, rara: 3, epica: 4 };
async function neutralizarFaixas(buf, dentro) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += info.channels) {
    const p = i / info.channels;
    if (!dentro(p % info.width, Math.floor(p / info.width))) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    // strong saturated fill = a rarity strip (text is light grey, stroke is near-black, bg is dark)
    if (sat > 30 && Math.max(r, g, b) > 60) {
      const k = Math.max(r, g, b) / 230;
      out[i] = Math.round(ACO_FAIXA[0] * k); out[i + 1] = Math.round(ACO_FAIXA[1] * k); out[i + 2] = Math.round(ACO_FAIXA[2] * k);
    }
  }
  return sharp(out, { raw: info }).png().toBuffer();
}
const pips = (n, cor) => {
  const c = `#${cor.toString(16).padStart(6, '0')}`;
  const d = Array.from({ length: 4 }, (_, i) =>
    `<rect x="${i * 12 + 3}" y="3" width="7" height="7" transform="rotate(45 ${i * 12 + 6.5} 6.5)" fill="${i < n ? c : 'none'}" stroke="${i < n ? c : '#3a4252'}" stroke-width="1.5"/>`).join('');
  return Buffer.from(`<svg width="52" height="14" xmlns="http://www.w3.org/2000/svg">${d}</svg>`);
};

const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** One colour, four tones: luminance of the original → shadow / body / light / glint of the target hue. */
async function monocromo(id, cor, escala) {
  const { data, info } = await sharp(`${DIR}icone-${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = rgb(cor);
  const tons = [mix(base, [5, 6, 13], 0.7), mix(base, [5, 6, 13], 0.35), base, mix(base, [255, 255, 255], 0.55)];
  let lo = 1, hi = 0;
  const lum = (i) => (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 40) { const l = lum(i); lo = Math.min(lo, l); hi = Math.max(hi, l); }
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 40) { out[i + 3] = 0; continue; }
    const t = (lum(i) - lo) / Math.max(0.01, hi - lo);
    const [r, g, b] = tons[t < 0.22 ? 0 : t < 0.5 ? 1 : t < 0.82 ? 2 : 3];
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }
  return sharp(out, { raw: info }).resize(info.width * escala, info.height * escala, { kernel: 'nearest' }).png().toBuffer();
}

const texto = (s, w, h, size = 26, cor = '#ffb040') =>
  Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);

// The table crop (world x 60..324, y 44..164) and the three cards' icon slots (world centre x, y=96, 32×32).
const CROP = { left: 60 * S, top: 44 * S, width: 264 * S, height: 120 * S };
const MESA_CARTAS = [['WPN_001', 108], ['EFF_006', 192], ['DEF_003', 276]];
const FUNDO_CARTA = { r: 13, g: 17, b: 24, alpha: 1 };

const COL = CROP.width + 40;
const W = COL * 3 + 40;
const H = 60 + 50 + CROP.height + 30 + 2 * 110 + 70;
const TITULO = VARIANTE === 'cor'
  ? 'A COR DOS ÍCONES — três opções na mesa real (1152×648 · ícones atuais repintados, tamanho atual)'
  : 'A OPÇÃO C — três jeitos de a cor da categoria não brigar com a da raridade (mesa real 1152×648)';
const RODAPE = VARIANTE === 'cor'
  ? 'A: raridade = moldura + ícone (a carta fala uma cor) · B: raridade só na moldura · C: cor da categoria briga com a da raridade (incomum = ciano, épica = laranja)'
  : 'C1: duas cores por carta, laranja = arma E épica · C2: arma amarelo, efeito magenta, defesa verde, movimento gelo · C3: faixas em aço, raridade = 1–4 marcas';
const comp = [{ input: texto(TITULO, W, 40, 24, '#e0e6f0'), left: 20, top: 16 }];

for (const [k, op] of OPCOES.entries()) {
  const x0 = 20 + k * COL;
  const y0 = 70;
  comp.push({ input: texto(op.tag, COL, 40), left: x0, top: y0 });
  const camadas = [];
  for (const [id, wx] of MESA_CARTAS) {
    const left = (wx - 16) * S - CROP.left, top = (96 - 16) * S - CROP.top;
    camadas.push({ input: { create: { width: 32 * S, height: 32 * S, channels: 4, background: FUNDO_CARTA } }, left, top });
    camadas.push({ input: await monocromo(id, op.cor(id), S), left, top });
  }
  let base = await sharp(MESA).extract(CROP).png().toBuffer();
  if (op.neutra) {
    // only inside the cards (world: centre ±34 wide, y 61..155) — the focus brackets keep their yellow
    const dentro = (px, py) => {
      const wx = (px + CROP.left) / S, wy = (py + CROP.top) / S;
      return wy > 58 && wy < 157 && MESA_CARTAS.some(([, cx]) => Math.abs(wx - cx) < 37.5);
    };
    base = await neutralizarFaixas(base, dentro);
    // pips at the card foot (world y ≈147), coloured by the category — the only colour on the card
    for (const [id, wx] of MESA_CARTAS)
      camadas.push({ input: pips(PIPS[INFO[id].r], op.cor(id)), left: wx * S - 26 - CROP.left, top: 146 * S - CROP.top });
  }
  const mesa = await sharp(base).composite(camadas).png().toBuffer();
  comp.push({ input: mesa, left: x0, top: y0 + 50 });
  // All 13 icons, 7 + 6, at the in-game size.
  const yi = y0 + 50 + CROP.height + 30;
  for (const [i, [id]] of CARTAS.entries()) {
    comp.push({ input: await monocromo(id, op.cor(id), S), left: x0 + (i % 7) * 106, top: yi + Math.floor(i / 7) * 110 });
  }
}
comp.push({ input: texto(RODAPE, W, 40, 20, '#8a93a6'), left: 20, top: H - 50 });

await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT, W, H);
