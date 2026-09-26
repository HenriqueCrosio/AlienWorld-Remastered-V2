// UMA FASE EM RELÓGIO DE PAREDE, pelo atalho de dev do menu — quadros NATIVOS (384×216) de combate, com a nave
// INVULNERÁVEL (a captura não pode acabar numa morte). Um PNG por instante.
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f9/_ver-fase.mjs <tecla> <ms,...> <pasta> <prefixo>
//   ex.: node scripts/_f9/_ver-fase.mjs V 8000,25000 scripts/_f9/_quadros f2
import { chromium } from 'playwright';
import fs from 'node:fs';
import sharp from 'sharp';

const [tecla, instantes, pasta, prefixo] = process.argv.slice(2);
fs.mkdirSync(pasta, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press(tecla);
// a nave não morre: o GameScene só leva dano depois de `invulnerableUntil`, e as vidas não acabam
const blindar = setInterval(() => {
  page
    .evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (s?.scene.key === 'Game') {
        s.invulnerableUntil = 1e12;
        s.lives = 9;
      }
    })
    .catch(() => {});
}, 300);
const t0 = Date.now();
for (const ms of instantes.split(',').map(Number)) {
  const falta = ms - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  const buf = await page.screenshot();
  await sharp(buf).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${pasta}/${prefixo}-${ms}.png`);
}
clearInterval(blindar);
await browser.close();
console.log(`${prefixo}: quadros em ${pasta}`);
