// BLOCK M1 (14/11) — the pause and the settings PHOTOGRAPHED in the game, for the sheet (`_pausa-folha.mjs`): the small
// window over a dark stage, a light one and a cutscene, the confirmation, each settings tab, the settings over the
// main menu, and the fallback without the HD layer.
//   npm run dev  in another terminal, then  node scripts/_m/_pausa-fotos.mjs <out>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: _pausa-fotos.mjs <out>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
const feitas = [];

async function abrir(sufixo = '') {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${sufixo || '/'}: ${e}`));
  await page.goto(`http://localhost:5173/${sufixo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  return page;
}
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(140); } };
const foto = async (page, nome) => {
  await page.waitForTimeout(450);
  const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
  await page.screenshot({ path: path.join(OUT, `${nome}.png`), clip });
  const d = await page.evaluate(() => window.__game.scene.isActive('Pausa') ? window.__game.scene.getScene('Pausa').diagnostico() : null);
  feitas.push({ nome, estado: d?.estado ?? null, textos: d?.textos ?? [] });
  console.log(`foto ${nome}`, JSON.stringify(d?.estado ?? 'sem pausa'));
};
const cena = (page, chave, ms = 15000) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: ms });

// ─── the dark stage (F1): the list, the confirmation, the three tabs ───
{
  const page = await abrir();
  await tecla(page, 'Digit1');
  await cena(page, 'Game');
  await page.waitForTimeout(4000);
  await tecla(page, 'Escape');
  await foto(page, 'f1-pausa');
  await tecla(page, 'ArrowDown', 'Enter');
  await foto(page, 'f1-confirma');
  await tecla(page, 'Escape', 'ArrowDown', 'Enter');
  await foto(page, 'f1-audio');
  await tecla(page, 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
  await foto(page, 'f1-audio-musica7');
  await tecla(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'KeyE');
  await foto(page, 'f1-controles');
  await tecla(page, 'ArrowRight');
  await foto(page, 'f1-controles-classico');
  await tecla(page, 'ArrowLeft', 'KeyE', 'ArrowDown');
  await foto(page, 'f1-video');
  await tecla(page, 'ArrowUp', 'ArrowUp');
  await foto(page, 'f1-faixa-das-abas');
  await page.close();
}

// ─── a light stage (F3, the nebula) ───
{
  const page = await abrir();
  await tecla(page, 'KeyM');
  await cena(page, 'Game');
  await page.waitForTimeout(5000);
  await tecla(page, 'Escape');
  await foto(page, 'f3-pausa');
  await tecla(page, 'ArrowDown', 'ArrowDown', 'Enter');
  await foto(page, 'f3-audio');
  await page.close();
}

// ─── a cutscene (the dock) ───
{
  const page = await abrir();
  await tecla(page, 'KeyO');
  await cena(page, 'Interlude2');
  await page.waitForTimeout(4000);
  await tecla(page, 'Escape');
  await foto(page, 'cutscene-pausa');
  await page.close();
}

// ─── the hangar (a choice: no RESTART) ───
{
  const page = await abrir();
  await tecla(page, 'KeyQ', 'Enter');
  await cena(page, 'Hangar');
  await page.waitForTimeout(2500);
  await tecla(page, 'Escape');
  await foto(page, 'hangar-pausa');
  await page.close();
}

// ─── the main menu: the 4-line list and the settings over the living painting (night and dawn) ───
for (const [sufixo, nome] of [['', 'menu-noite'], ['?menu=amanhecer', 'menu-amanhecer']]) {
  const page = await abrir(sufixo);
  await tecla(page, 'KeyQ', 'ArrowUp');
  await foto(page, `${nome}-lista`);
  await tecla(page, 'Enter');
  await foto(page, `${nome}-config`);
  await page.close();
}

// ─── who has beaten the game: the GAME tab ───
{
  const page = await abrir();
  await page.evaluate(() => localStorage.setItem('alienworld:zerou', '1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  await tecla(page, 'KeyQ', 'ArrowUp', 'Enter', 'KeyQ');
  await foto(page, 'menu-aba-jogo');
  await page.close();
}

// ─── the fallback without the HD layer ───
{
  const page = await abrir('?semhd');
  await tecla(page, 'Digit1');
  await cena(page, 'Game');
  await page.waitForTimeout(4000);
  await tecla(page, 'Escape');
  await foto(page, 'semhd-pausa');
  await tecla(page, 'ArrowDown', 'ArrowDown', 'Enter', 'KeyE');
  await foto(page, 'semhd-controles');
  await page.close();
}

fs.writeFileSync(path.join(OUT, 'fotos.json'), JSON.stringify(feitas, null, 2));
console.log(erros.length ? erros : 'no page error');
await browser.close();
process.exitCode = erros.length || feitas.some((f) => !f.estado) ? 1 : 0;
