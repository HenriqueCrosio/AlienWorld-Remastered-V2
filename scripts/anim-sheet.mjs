// Baixa os quadros de uma animação do PixelLab e monta a sprite sheet do jogo.
//
// DECISÃO: NÃO recorta o alpha de cada quadro. Recorte por quadro = centro que dança = animação
// tremida. Os quadros do v3 vêm no MESMO canvas da arte de origem (a âncora é estável), então a
// sheet é a concatenação crua: células UNIFORMES, jitter zero. O que se limpa é o XADREZ e as
// colunas de borda opacas de sempre (ver install-sprite.mjs / docs/HANDOFF.md).
//
// Saídas:
//   public/sprites/<nome>-sheet.png  — a sheet 1× (N células de L×A, horizontal)
//   scripts/_anim-<nome>-review.png  — a mesma sheet ampliada ×Z para julgar os quadros
//
// uso: node scripts/anim-sheet.mjs <object-id> <animation-id> <nome> [direction]
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [objId, animId, nome, direction = 'unknown'] = process.argv.slice(2);
if (!objId || !animId || !nome) {
  console.error('uso: node scripts/anim-sheet.mjs <object-id> <animation-id> <nome> [direction]');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const base = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/animations/${animId}/${direction}`;
const Z = 6;

// ─── download até o primeiro 404 (o índice é sequencial: 0.png, 1.png, ...) ──
const frames = [];
for (let i = 0; ; i++) {
  const res = await fetch(`${base}/${i}.png`);
  if (!res.ok) break;
  frames.push(Buffer.from(await res.arrayBuffer()));
}
if (frames.length === 0) throw new Error('nenhum quadro encontrado');

const meta = await sharp(frames[0]).metadata();
const W = meta.width;
const H = meta.height;

// ─── limpeza por quadro: xadrez desenhado + colunas/linhas de borda opacas ───
const limpos = [];
for (const buf of frames) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8Array(data); // cópia mutável

  const opaco = (x, y) => px[(y * info.width + x) * 4 + 3] > 200;

  // Xadrez de transparência DESENHADO (cinza opaco miúdo): zera o alpha desses pixels.
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4;
      if (px[o + 3] === 0) continue;
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const cinza = Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 120 && r < 190;
      if (cinza) px[o + 3] = 0;
    }
  }

  // Colunas/linhas de borda 100% opacas de ponta a ponta (o RISCO da tela): limpa.
  const bordaOpaca = (acesso, n) => {
    for (let i = 0; i < n; i++) if (!acesso(i)) return false;
    return true;
  };
  const limpaCol = (x) => {
    for (let y = 0; y < info.height; y++) px[(y * info.width + x) * 4 + 3] = 0;
  };
  const limpaLin = (y) => {
    for (let x = 0; x < info.width; x++) px[(y * info.width + x) * 4 + 3] = 0;
  };
  if (bordaOpaca((y) => opaco(0, y), info.height)) limpaCol(0);
  if (bordaOpaca((y) => opaco(info.width - 1, y), info.height)) limpaCol(info.width - 1);
  if (bordaOpaca((x) => opaco(x, 0), info.width)) limpaLin(0);
  if (bordaOpaca((x) => opaco(x, info.height - 1), info.width)) limpaLin(info.height - 1);

  limpos.push(await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
}

// ─── a sheet: N células de W×H, em linha ─────────────────────────────────────
const sheet = await sharp({
  create: { width: W * limpos.length, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(limpos.map((buf, i) => ({ input: buf, left: i * W, top: 0 })))
  .png()
  .toBuffer();

const saida = `public/sprites/${nome}-sheet.png`;
writeFileSync(saida, sheet);

// A revisão ampliada sobre fundo escuro (transparência em branco some no olho).
const review = await sharp(sheet)
  .flatten({ background: '#0b0e1a' })
  .resize(W * limpos.length * Z, H * Z, { kernel: 'nearest' })
  .png()
  .toBuffer();
writeFileSync(`scripts/_anim-${nome}-review.png`, review);

console.log(`${saida} — ${limpos.length} quadros de ${W}x${H} (sheet ${W * limpos.length}x${H})`);
console.log(`revisão: scripts/_anim-${nome}-review.png`);
