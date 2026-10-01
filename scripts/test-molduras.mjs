// As molduras da carta (spec 2026-09-30-mesa-compacta-arte-design.md §2.3 e §3.1).
// Uso: node scripts/test-molduras.mjs
// Cobra: os 4 PNGs no tamanho da MOLDURA; a energia de cada um na cor da SUA raridade (e nenhum azul de energia
// sobrando fora da rara); cada ENCAIXE é miolo escuro uniforme cercado de borda — medido NA ARTE.
import fs from 'fs';
import sharp from 'sharp';
import { COR_RARIDADE, RARIDADES } from '../src/raridade.ts';
import { ENCAIXE, MOLDURA } from '../src/molduraCarta.ts';

const falhas = [];
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push(msg); };
const DIR = 'public/sprites/cartas';

/** O "miolo" da moldura: o cinza-chumbo escuro dos encaixes (luminância média de 22 a 39). */
const noMiolo = (r, g, b) => { const l = (r + g + b) / 3; return l >= 22 && l < 40; };
const ehEnergiaAzul = (r, g, b) => b > r + 35 && b > 90;

for (const r of RARIDADES) {
  const arq = `${DIR}/moldura-${r}.png`;
  if (!fs.existsSync(arq)) { cobrar(false, `${arq} existe`); continue; }
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cobrar(info.width === MOLDURA.w && info.height === MOLDURA.h, `${r}: ${info.width}×${info.height} = ${MOLDURA.w}×${MOLDURA.h}`);
  const px = (x, y) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

  // A ENERGIA: pixels claros com a direção de cor da raridade (cosseno ≥ 0.995) — pelo menos 150.
  const cor = COR_RARIDADE[r];
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const na = Math.hypot(...alvo);
  let naCor = 0, azulSobrando = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const [R, G, B, A] = px(x, y);
    if (!A || Math.max(R, G, B) <= 90) continue;
    const cos = (R * alvo[0] + G * alvo[1] + B * alvo[2]) / (Math.hypot(R, G, B) * na);
    if (cos >= 0.995) naCor++;
    // O roxo da épica também tem o azul alto (b > r+35): sobra é o azul que NÃO foi para a cor da raridade.
    if (r !== 'rara' && ehEnergiaAzul(R, G, B) && cos < 0.98) azulSobrando++;
  }
  cobrar(naCor >= 150, `${r}: ${naCor} pixels de energia na cor da raridade (≥150)`);
  cobrar(azulSobrando === 0, `${r}: nenhum azul de energia sobrando (${azulSobrando})`);

  // OS ENCAIXES, medidos na arte: miolo ≥97% uniforme; cada lado de fora (a 1px) ≤50% miolo — é borda.
  for (const [nome, c] of Object.entries(ENCAIXE)) {
    let dentro = 0, total = 0;
    for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) { total++; if (noMiolo(...px(x, y))) dentro++; }
    cobrar(dentro / total >= 0.97, `${r}/${nome}: miolo ${(100 * dentro / total).toFixed(1)}% uniforme (≥97%)`);
    const lados = {
      cima: Array.from({ length: c.w }, (_, i) => px(c.x + i, c.y - 1)),
      baixo: Array.from({ length: c.w }, (_, i) => px(c.x + i, c.y + c.h)),
      esquerda: Array.from({ length: c.h }, (_, i) => px(c.x - 1, c.y + i)),
      direita: Array.from({ length: c.h }, (_, i) => px(c.x + c.w, c.y + i)),
    };
    for (const [lado, pxs] of Object.entries(lados)) {
      const f = pxs.filter((p) => noMiolo(...p)).length / pxs.length;
      cobrar(f <= 0.5, `${r}/${nome}: borda de ${lado} (${(100 * f).toFixed(0)}% miolo, ≤50%)`);
    }
  }
}

const canto = `${DIR}/realce-canto.png`;
if (fs.existsSync(canto)) {
  const m = await sharp(canto).metadata();
  cobrar(m.width === 8 && m.height === 8, `realce-canto: ${m.width}×${m.height} = 8×8`);
} else cobrar(false, `${canto} existe`);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
