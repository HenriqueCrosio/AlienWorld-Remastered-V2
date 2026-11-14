// BLOCK M2 (14/11) — the controller PHOTOGRAPHED in the game with a simulated controller, for the sheet
// (`_controle-folha.mjs`): the CONTROLS tab on the keyboard, with an Xbox and with a PlayStation controller, the
// capture, the notice, and the hints of the other screens following the device.
//   npm run dev  in another terminal, then  node scripts/_m/_controle-fotos.mjs <out>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: _controle-fotos.mjs <out>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, START: 9, CIMA: 12, BAIXO: 13, ESQ: 14, DIR: 15 };
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
const PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
async function abrir(sufixo = '') {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${sufixo || '/'}: ${e}`));
  await page.addInitScript(() => {
    const pad = { connected: false, id: '', index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
  });
  await page.goto(`http://localhost:5173/${sufixo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  return page;
}
const conectar = async (page, id) => { await page.evaluate((i) => { window.__pad.id = i; window.__pad.connected = true; }, id); await page.waitForTimeout(250); };
const segurar = (page, i, v) => page.evaluate(([b, on]) => { window.__pad.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; }, [i, v]);
const quadros = (page, n) => page.evaluate((k) => new Promise((ok) => { const g = window.__game; const alvo = g.loop.frame + k; const olha = () => (g.loop.frame >= alvo ? ok(null) : setTimeout(olha, 8)); olha(); }), n);
const botao = async (page, ...is) => { for (const i of is) { await segurar(page, i, true); await quadros(page, 2); await segurar(page, i, false); await quadros(page, 2); } };
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(160); } };
const cena = (page, chave) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: 15000 });
const foto = async (page, nome) => {
  await page.waitForTimeout(450);
  const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
  await page.screenshot({ path: path.join(OUT, `${nome}.png`), clip });
  console.log(`foto ${nome}`);
};
const imortal = (page) => page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.invulnerableUntil = 1e12; });

// ─── the keyboard only: the CONTROLS tab, the capture of a key ───
{
  const page = await abrir();
  await tecla(page, 'KeyV');
  await cena(page, 'Game');
  await imortal(page);
  await page.waitForTimeout(2500);
  await tecla(page, 'Escape', 'ArrowDown', 'ArrowDown', 'Enter', 'KeyE');
  await foto(page, 'teclado-controles');
  await tecla(page, 'ArrowDown', 'ArrowDown');
  await foto(page, 'teclado-linha-tiro');
  await tecla(page, 'Enter');
  await foto(page, 'teclado-captura');
  await tecla(page, 'KeyW');
  await foto(page, 'teclado-recusa');
  await tecla(page, 'KeyK');
  await foto(page, 'teclado-personalizado');
  for (let i = 0; i < 8; i++) await tecla(page, 'ArrowDown');
  await tecla(page, 'Enter');
  await foto(page, 'restaurar-confirma');
  await tecla(page, 'ArrowLeft', 'Enter');
  await page.close();
}

// ─── an Xbox controller: the notice, the tab, the capture, the pause, the hints of the other screens ───
{
  const page = await abrir();
  await tecla(page, 'KeyQ');
  await page.waitForTimeout(500);
  await conectar(page, XBOX);
  await foto(page, 'xbox-aviso-conectado');
  await page.waitForTimeout(2100);
  await botao(page, B.BAIXO, B.BAIXO, B.BAIXO, B.A, B.RB);
  await foto(page, 'xbox-controles');
  await botao(page, B.BAIXO, B.BAIXO, B.DIR, B.A);
  await foto(page, 'xbox-captura');
  await botao(page, B.Y);
  await foto(page, 'xbox-personalizado');
  await botao(page, B.BAIXO, B.BAIXO, B.BAIXO, B.BAIXO, B.BAIXO, B.BAIXO, B.A, B.ESQ, B.A, B.B);
  await page.waitForTimeout(400);
  // the hangar with the controller in use
  await botao(page, B.CIMA, B.CIMA, B.CIMA, B.A);
  await cena(page, 'Hangar');
  await page.waitForTimeout(2500);
  await foto(page, 'xbox-hangar');
  await botao(page, B.START);
  await foto(page, 'xbox-pausa');
  await page.close();
}

// ─── a PlayStation controller ───
{
  const page = await abrir();
  await tecla(page, 'KeyQ');
  await page.waitForTimeout(500);
  await conectar(page, PS);
  await page.waitForTimeout(2100);
  await botao(page, B.BAIXO, B.BAIXO, B.BAIXO, B.A, B.RB);
  await foto(page, 'ps-controles');
  await botao(page, B.BAIXO, B.RB, B.ESQ);
  await page.close();
}

// ─── the end-of-stage screen and the card table with the controller in use ───
{
  const page = await abrir();
  await conectar(page, XBOX);
  // from the menu scene itself (the manager's `start` would leave the menu running underneath)
  await page.evaluate(() => { window.__game.scene.getScene('Menu').scene.start('GameOver', { score: 4820, handling: 'diegetico', victory: false, stage: 2, ship: 'humana', baseScore: 0 }); });
  await cena(page, 'GameOver');
  await page.waitForTimeout(600);
  await botao(page, B.CIMA);
  await foto(page, 'xbox-nave-perdida');
  await page.close();
}

console.log(erros.length ? erros : 'no page error');
await browser.close();
process.exitCode = erros.length ? 1 : 0;
