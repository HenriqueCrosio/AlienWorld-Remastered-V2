// Prepara a referÃªncia do hangar (imagem 1 do Henrique) para style_images:
// recorte quadrado representativo -> 160x160 lanczos -> JPEG comprimido -> base64.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = 'C:/Users/Henrique/.claude/image-cache/5899a4b2-6d17-4624-9180-8a6917936dbc/1.png';
const OUT_DIR = process.argv[2];

const meta = await sharp(SRC).metadata();
console.log(`fonte: ${meta.width}x${meta.height}`);

// Recorte quadrado da metade inferior-mÃ©dia: estrutura escura + corrimÃ£os + chÃ£o
// (transfere paleta/luz/textura; a composiÃ§Ã£o vem do prompt).
const side = meta.width;
const top = Math.min(300, meta.height - side);

const buf = await sharp(SRC)
  .extract({ left: 0, top, width: side, height: side })
  .resize(160, 160, { kernel: 'lanczos3' })
  .jpeg({ quality: 72 })
  .toBuffer();

writeFileSync(`${OUT_DIR}/ref-hangar-160.jpg`, buf);
writeFileSync(`${OUT_DIR}/ref-hangar-160.b64`, buf.toString('base64'));
console.log(`ref: 160x160 jpeg, ${buf.length} bytes, base64 ${Math.ceil((buf.length * 4) / 3)} chars`);

