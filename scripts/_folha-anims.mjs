// Folha de contato de pastas de quadros numerados (0.png…): uma linha por pasta, ampliada ×Z sobre fundo escuro.
// Uso: node scripts/_folha-anims.mjs <out.png> <zoom> <pasta> [pasta...]
import fs from 'fs';
import sharp from 'sharp';
const [OUT, Z, ...PASTAS] = process.argv.slice(2);
const z = Number(Z);
const linhas = [];
let largura = 0;
let y = 10;
for (const p of PASTAS) {
  const fs_ = fs.readdirSync(p).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  const m = await sharp(`${p}/${fs_[0]}`).metadata();
  const w = m.width * z, h = m.height * z;
  linhas.push({ input: Buffer.from(`<svg width="600" height="20" xmlns="http://www.w3.org/2000/svg"><text x="0" y="15" font-family="Consolas" font-size="15" fill="#ffb040">${p.split(/[\/]/).slice(-1)[0]} (${m.width}×${m.height})</text></svg>`), left: 10, top: y });
  y += 22;
  for (const [i, f] of fs_.entries()) {
    linhas.push({ input: await sharp(`${p}/${f}`).resize(w, h, { kernel: 'nearest' }).toBuffer(), left: 10 + i * (w + 6), top: y });
    largura = Math.max(largura, 20 + (i + 1) * (w + 6));
  }
  y += h + 14;
}
await sharp({ create: { width: Math.max(largura, 620), height: y, channels: 4, background: '#0b0d14' } }).composite(linhas).png().toFile(OUT);
console.log(OUT);
