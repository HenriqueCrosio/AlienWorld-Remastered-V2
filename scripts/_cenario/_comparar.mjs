// Compares two layer folders: PNGs pixel by pixel, JSON byte by byte. Exit 1 on any difference.
//   node scripts/_cenario/_comparar.mjs <dirA> <dirB>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [A, B] = process.argv.slice(2);
let difs = 0;
for (const n of fs.readdirSync(A).filter((f) => /\.(png|json)$/.test(f)).sort()) {
  const a = path.join(A, n);
  const b = path.join(B, n);
  if (!fs.existsSync(b)) {
    console.log('FALTA ', n);
    difs++;
    continue;
  }
  let ok;
  if (n.endsWith('.json')) ok = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  else {
    const [ra, rb] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    ok = ra.info.width === rb.info.width && ra.info.height === rb.info.height && ra.data.equals(rb.data);
  }
  console.log(ok ? 'IGUAL ' : 'DIFERE', n);
  if (!ok) difs++;
}
console.log(difs ? `${difs} diferença(s)` : 'TUDO IGUAL');
process.exit(difs ? 1 : 0);
