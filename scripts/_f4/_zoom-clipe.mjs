// UM CLIPE QUADRO A QUADRO, EM TAMANHO CHEIO (256²) — a folha de meia escala (`_folha-predador-anims.mjs`) serve
// para comparar clipes, mas é pequena demais para julgar QUAL GARRA está fazendo o gesto. Foi nela que a troca de
// garra do `teto-lava-b` passou batida (18/09).
//
//   node scripts/_f4/_zoom-clipe.mjs <saida.png> <dir-clipe> [colunas=6]
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const [saida, dir, cols0] = process.argv.slice(2);
const Q = 256, P = 6, T = 20, cols = parseInt(cols0 || '6');
const qs = fs.readdirSync(dir).filter(f=>/^\d+\.png$/.test(f)).sort((a,b)=>parseInt(a)-parseInt(b));
const rows = Math.ceil(qs.length/cols);
const comp = [];
for (const [i,f] of qs.entries()) {
  const c = i%cols, r = Math.floor(i/cols);
  const left = P + c*(Q+P), top = P + r*(Q+T+P);
  comp.push({ input: Buffer.from(`<svg width="60" height="${T}"><text x="0" y="15" fill="#ffd166" font-size="16" font-family="monospace">${i}</text></svg>`), left, top });
  comp.push({ input: await sharp(path.join(dir,f)).resize(Q,Q,{kernel:'nearest'}).toBuffer(), left, top: top+T });
}
await sharp({create:{width:P+cols*(Q+P),height:P+rows*(Q+T+P),channels:4,background:'#2a2130'}}).composite(comp).png().toFile(saida);
console.log(saida, qs.length);
