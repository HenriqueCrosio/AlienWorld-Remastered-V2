// BLOCO D · checks an explosion sheet BEFORE it goes into the game: how much of the carcass (the pixels where the
// chapter-6 frame differs from the colony of the impact) each frame hides, and a grid of key frames composited over
// the chapter-6 frame (what shows through as the smoke thins).
//   node scripts/_leviata/_explosao-conferir.mjs <sheet.png> <grade.png>
import sharp from 'sharp';

const [SHEET, GRADE] = process.argv.slice(2);
const FW = 384, FH = 216, COLS = 6, N = 48, FPS = 18;
const raw = async (f) => (await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const antes = await raw('public/sprites/f8-impacto-colonia.png');
const depois = await raw('public/sprites/f8-sobrevoo.png');
const alvo = [];
for (let p = 0; p < FW * FH; p++) {
  const i = p * 4;
  if (Math.abs(antes[i] - depois[i]) + Math.abs(antes[i + 1] - depois[i + 1]) + Math.abs(antes[i + 2] - depois[i + 2]) > 24) alvo.push(p);
}
const folha = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = folha.info.width;
const linha = [];
for (let f = 0; f < N; f++) {
  const ox = (f % COLS) * FW, oy = Math.floor(f / COLS) * FH;
  let cob = 0;
  for (const p of alvo) {
    const x = p % FW, y = (p / FW) | 0;
    if (folha.data[((oy + y) * W + ox + x) * 4 + 3] > 0) cob++;
  }
  linha.push(`${(f / FPS).toFixed(2)}s ${Math.round((100 * cob) / alvo.length)}%`);
}
console.log(`carcaça: ${alvo.length} px que mudam · cobertura por quadro:`);
console.log(linha.join(' · '));

const qs = [0, 2, 4, 7, 10, 14, 18, 22, 26, 30, 36, 44];
const tiles = [];
for (const [k, q] of qs.entries()) {
  const fr = await sharp(SHEET).extract({ left: (q % COLS) * FW, top: Math.floor(q / COLS) * FH, width: FW, height: FH }).png().toBuffer();
  const c = await sharp('public/sprites/f8-sobrevoo.png').composite([{ input: fr, left: 0, top: 0 }]).png().toBuffer();
  tiles.push({ input: c, left: (k % 4) * (FW + 4), top: Math.floor(k / 4) * (FH + 4) });
}
await sharp({ create: { width: 4 * (FW + 4), height: 3 * (FH + 4), channels: 4, background: '#0d0f15' } }).composite(tiles).png().toFile(GRADE);
