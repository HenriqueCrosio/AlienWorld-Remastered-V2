// Slims a day's review sheets before they go into git: every image a sheet SHOWS (`src="…"`) that weighs more than
// `--min` KB as PNG becomes a JPEG (quality 90) beside it, the sheet's reference follows, and the PNG is removed. Small
// PNGs (pixel-exact crops) stay as they are. Prints the list of files to commit (the sheets, their images, the JSON).
//   node scripts/_i/_folha-emagrecer.mjs docs/superpowers/folhas/2026-11-13 [--min 900] [--lista out.txt]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const DIR = args[0], MIN = Number(val('--min', 900)) * 1024, LISTA = val('--lista', '');
const anda = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'q' || e.name === '_q' ? [] : anda(path.join(d, e.name))) : [path.join(d, e.name)]));
const todos = anda(DIR);
const manter = new Set(todos.filter((f) => f.endsWith('.json')));
let antes = 0, depois = 0, trocadas = 0;
for (const html of todos.filter((f) => f.endsWith('.html'))) {
  let s = fs.readFileSync(html, 'utf8');
  manter.add(html);
  for (const m of [...s.matchAll(/src="([^"]+)"/g)]) {
    const ref = m[1];
    if (/\.(mp4|webm)$/.test(ref)) continue;
    const arq = path.join(path.dirname(html), ref);
    const jpg = arq.replace(/\.png$/, '.jpg');
    if (ref.endsWith('.png') && fs.existsSync(arq) && fs.statSync(arq).size > MIN) {
      antes += fs.statSync(arq).size;
      await sharp(arq).flatten({ background: '#000' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(jpg);
      depois += fs.statSync(jpg).size;
      fs.rmSync(arq);
      trocadas++;
    }
    // another sheet may show the same image, already converted
    if (ref.endsWith('.png') && !fs.existsSync(arq) && fs.existsSync(jpg)) {
      s = s.split(`src="${ref}"`).join(`src="${ref.replace(/\.png$/, '.jpg')}"`);
      manter.add(jpg);
    } else if (fs.existsSync(arq)) manter.add(arq);
    else console.log(`FALTA ${arq} (em ${html})`);
  }
  fs.writeFileSync(html, s);
}
const lista = [...manter].map((f) => f.split(path.sep).join('/')).sort();
const peso = lista.reduce((t, f) => t + fs.statSync(f).size, 0);
console.log(`${trocadas} imagens de ${(antes / 1048576).toFixed(1)} MB para ${(depois / 1048576).toFixed(1)} MB; ${lista.length} arquivos a commitar, ${(peso / 1048576).toFixed(1)} MB`);
if (LISTA) fs.writeFileSync(LISTA, lista.join('\n') + '\n');
