import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const { pontos } = JSON.parse(readFileSync('src/data/doca-luzes.json', 'utf8'));
const svgDots = pontos.map(p => {
  const c = p.familia === 'red' ? '#00ff00' : '#00ffff';
  return `<circle cx="${p.x}" cy="${p.y}" r="2.2" fill="none" stroke="${c}" stroke-width="0.8"/>`;
}).join('');
const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">${svgDots}</svg>`;
await sharp('public/sprites/doca-cinturao.png')
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .resize(256 * 3, 256 * 3, { kernel: 'nearest' })
  .png()
  .toFile('scripts/_cut2/ver-luzes-x3.png');
console.log('ok');
