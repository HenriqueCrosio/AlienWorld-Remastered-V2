// AS LUZES DA DOCA — mede `public/sprites/doca-cinturao.png` e acha os pontos de luz JÁ PINTADOS
// (janelas âmbar/laranja nas torres, luzes vermelhas e âmbar na borda das plataformas), para que
// `Interlude2Scene` possa piscá-los em vez de pintar luz nova por cima da arte.
//
// ⚠️ POR SATURAÇÃO, NÃO POR LUMINÂNCIA — lição já paga neste projeto (ver `_cut2-doca.mjs`,
// `docs/HANDOFF.md`): metal e rocha desta pintura leem CLAROS mas NEUTROS (baixa saturação). Um
// corte por brilho pega o casco junto com as lâmpadas. Matiz quente + saturação alta é o que
// isola uma lâmpada de um parafuso metálico batendo luz.
//
// uso: node scripts/_cut2-luzes.mjs [satMin] [valMin] [raioCluster]
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = 'public/sprites/doca-cinturao.png';
const OUT = 'src/data/doca-luzes.json';

// ─── LIMIARES (ajustáveis por argv, ver a checagem de sanidade no fim) ───
const SAT_MIN = Number(process.argv[2] ?? 0.45); // saturação mínima (0..1)
const VAL_MIN = Number(process.argv[3] ?? 0.45); // valor (brilho HSV) mínimo (0..1)
const RAIO_CLUSTER = Number(process.argv[4] ?? 4); // px: suprime vizinhos de um ponto já aceito
const ALPHA_MIN = 40; // pixel tem que estar visivelmente opaco (não a rampa de feather da borda)
const CAP = 40; // teto de pontos — a cena não pode virar centenas de draw calls

// ─── RGB → HSV ───
function rgbToHsv(r, g, b) {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

// A pintura tem duas famílias de lâmpada: ÂMBAR/LARANJA (as janelas das torres, ~20°–55°) e
// VERMELHA (os círculos/chevrons de borda das plataformas, ~340°–20° passando por 0°). Fora
// dessas duas faixas de matiz não é lâmpada desta arte — é reflexo azulado de metal, por exemplo.
function familiaMatiz(h) {
  if (h >= 340 || h <= 18) return 'red';
  if (h > 18 && h <= 55) return 'amber';
  return null;
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// 1. Varre a imagem inteira, junta todo pixel candidato (saturado, quente, visível).
const candidatos = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a < ALPHA_MIN) continue;

    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { h, s, v } = rgbToHsv(r, g, b);
    if (s < SAT_MIN || v < VAL_MIN) continue;

    const familia = familiaMatiz(h);
    if (!familia) continue;

    candidatos.push({ x, y, r, g, b, s, v, familia, score: s * v });
  }
}

// 2. Os candidatos mais fortes primeiro — o representante de cada cluster é o pixel mais
// saturado/brilhante dele, não o primeiro encontrado na varredura raster.
candidatos.sort((a, b) => b.score - a.score);

// 3. UM PONTO POR CLUSTER: aceita um candidato só se estiver a mais de RAIO_CLUSTER de todo
// ponto já aceito. Pixels vizinhos acesos são a MESMA lâmpada — empilhar sprite em cada um lê
// como mancha, não como luz.
const aceitos = [];
for (const c of candidatos) {
  if (aceitos.length >= CAP) break;
  const perto = aceitos.some((p) => Math.hypot(p.x - c.x, p.y - c.y) <= RAIO_CLUSTER);
  if (perto) continue;
  aceitos.push(c);
}

// 4. Emite coordenadas de arte inteiras + a família de matiz (a cena tinge por família) + a cor
// amostrada (útil pra depurar/ajustar o tint na cena sem reabrir o PNG) + o `score` (saturação ×
// valor) já calculado no passo 1 — é o `score` que `Interlude2Scene.criarLuzes()` usa para
// ranquear "as mais fortes", em vez de reconstruir uma ordem a partir de só 3 cores distintas.
const pontos = aceitos.map((c) => ({
  x: Math.round(c.x),
  y: Math.round(c.y),
  familia: c.familia,
  cor: `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`,
  score: Math.round(c.score * 1000) / 1000,
}));

writeFileSync(OUT, JSON.stringify({ artW: width, artH: height, pontos }, null, 2));

const nAmbar = pontos.filter((p) => p.familia === 'amber').length;
const nVermelho = pontos.filter((p) => p.familia === 'red').length;

console.log(`${SRC}: ${width}x${height}`);
console.log(`limiares: satMin=${SAT_MIN} valMin=${VAL_MIN} raioCluster=${RAIO_CLUSTER}px`);
console.log(`candidatos brutos (antes do cluster): ${candidatos.length}`);
console.log(`PONTOS: ${pontos.length} (âmbar=${nAmbar}, vermelho=${nVermelho})`);
console.log(`→ ${OUT}`);

if (pontos.length <= 2) {
  console.log('\n⚠️ 0–2 pontos: o limiar de saturação está apertado demais para esta arte — afrouxe (satMin/valMin menores) e rode de novo.');
} else if (candidatos.length > 2000) {
  console.log('\n⚠️ centenas de candidatos brutos: o limiar está frouxo demais — aperte satMin/valMin.');
}
