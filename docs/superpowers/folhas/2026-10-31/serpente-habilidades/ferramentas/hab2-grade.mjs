// A clip frame at 3x with a 10 px grid labelled in the 256² canvas coords (x 0..200, y 0..140 — the heads' area).
//   node hab2-grade.mjs <out.png> <frame.png> [<frame.png> ...]   (stacked vertically)
import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [out, ...fs] = process.argv.slice(2);
const X1 = 200, Y1 = 140, Z = 3;
const tiles = [];
for (const f of fs) {
  const crop = await sharp(f).extract({ left: 0, top: 0, width: X1, height: Y1 }).resize(X1 * Z, Y1 * Z, { kernel: 'nearest' }).png().toBuffer();
  let svg = `<svg width="${X1 * Z}" height="${Y1 * Z}" xmlns="http://www.w3.org/2000/svg">`;
  for (let x = 0; x <= X1; x += 10) svg += `<line x1="${x * Z}" y1="0" x2="${x * Z}" y2="${Y1 * Z}" stroke="#ff0" stroke-opacity="${x % 50 ? 0.18 : 0.5}"/><text x="${x * Z + 1}" y="10" font-size="9" fill="#ff0" font-family="monospace">${x}</text>`;
  for (let y = 0; y <= Y1; y += 10) svg += `<line x1="0" y1="${y * Z}" x2="${X1 * Z}" y2="${y * Z}" stroke="#ff0" stroke-opacity="${y % 50 ? 0.18 : 0.5}"/><text x="1" y="${y * Z - 1}" font-size="9" fill="#ff0" font-family="monospace">${y}</text>`;
  svg += `<text x="${X1 * Z - 200}" y="${Y1 * Z - 6}" font-size="13" fill="#f0f" font-family="monospace">${f.split(/[\/]/).slice(-2).join('/')}</text></svg>`;
  tiles.push(await sharp({ create: { width: X1 * Z, height: Y1 * Z, channels: 4, background: '#262b38' } }).composite([{ input: crop }, { input: Buffer.from(svg) }]).png().toBuffer());
}
await sharp({ create: { width: X1 * Z, height: tiles.length * (Y1 * Z + 4), channels: 4, background: '#000' } })
  .composite(tiles.map((t, i) => ({ input: t, left: 0, top: i * (Y1 * Z + 4) }))).png().toFile(out);
