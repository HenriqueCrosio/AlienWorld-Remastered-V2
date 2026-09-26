// UMA CUTSCENE EM RELÓGIO DE PAREDE, pelo atalho de dev do menu — a chegada até o painel de escolha e, depois de
// escolher (ENTER), a saída. Quadros em resolução NATIVA (384×216), um PNG por instante, numa pasta.
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f8/_ver-cena.mjs <tecla> <chegadaMs,...> <saidaMs,...> <pasta> <prefixo>
//   ex.: node scripts/_f8/_ver-cena.mjs I 800,2800,5200 800,2000,3200 scripts/_f8/_cenas c1-orig
import { chromium } from 'playwright';
import fs from 'node:fs';
import sharp from 'sharp';

const [tecla, chegada, saida, pasta, prefixo] = process.argv.slice(2);
const lista = (s) => (s ? s.split(',').map(Number) : []);
fs.mkdirSync(pasta, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press(tecla);
const foto = async (nome) => {
  const buf = await page.screenshot();
  await sharp(buf).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${pasta}/${prefixo}-${nome}.png`);
};
let t0 = Date.now();
for (const ms of lista(chegada)) {
  const falta = ms - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  await foto(`a${ms}`);
}
if (lista(saida).length) {
  // o painel de escolha aparece quando a nave pousa; ENTER escolhe e a cena sai
  await page.waitForFunction(() => !!window.__game.scene.getScenes(true)[0]?.panel, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  // o 1º ENTER marca a nave e pede "CONFIRMAR?"; o 2º confirma — a cena sai
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  t0 = Date.now();
  for (const ms of lista(saida)) {
    const falta = ms - (Date.now() - t0);
    if (falta > 0) await page.waitForTimeout(falta);
    await foto(`b${ms}`);
  }
}
await browser.close();
console.log('quadros em', pasta);
