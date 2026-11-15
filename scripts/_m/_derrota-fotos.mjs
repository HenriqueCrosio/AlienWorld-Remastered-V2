// BLOCK M3 (15/11) — the SHIP LOST window PHOTOGRAPHED in the game, for the sheet (`_derrota-folha.mjs`): the four
// stages, with and without a medal, the new record, the cursor on each line, the settings over it, the hint with a
// simulated controller (Xbox and PlayStation), and the fallback without the HD layer.
//   npm run dev  in another terminal, then  node scripts/_m/_derrota-fotos.mjs <out>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: _derrota-fotos.mjs <out>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const B = { A: 0, B: 1, BAIXO: 13 };
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
const PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
const feitas = [];

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
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(140); } };
const conectar = async (page, id) => { await page.evaluate((i) => { window.__pad.id = i; window.__pad.connected = true; }, id); await page.waitForTimeout(250); };
const segurar = (page, i, v) => page.evaluate(([b, on]) => { window.__pad.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; }, [i, v]);
const quadros = (page, n) => page.evaluate((k) => new Promise((ok) => { const g = window.__game; const alvo = g.loop.frame + k; const olha = () => (g.loop.frame >= alvo ? ok(null) : setTimeout(olha, 8)); olha(); }), n);
const botao = async (page, ...is) => { for (const i of is) { await segurar(page, i, true); await quadros(page, 2); await segurar(page, i, false); await quadros(page, 2); } };
const foto = async (page, nome) => {
  await page.waitForTimeout(700);
  const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
  await page.screenshot({ path: path.join(OUT, `${nome}.png`), clip });
  const d = await page.evaluate(() => window.__game.scene.isActive('Pausa') ? window.__game.scene.getScene('Pausa').diagnostico() : null);
  feitas.push({ nome, estado: d?.estado ?? null, textos: d?.textos ?? [] });
  console.log(`foto ${nome}`, JSON.stringify(d?.estado ?? 'sem janela'));
};
const cena = (page, chave, ms = 20000) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: ms });

/**
 * Opens a stage by its dev key, lets it run, and loses the ship with `pontos` on the board (and `recorde` already
 * recorded): the real death plays, and the window opens by itself at the end of it.
 */
async function morrer(page, teclaDaFase, espera, pontos, recorde) {
  await tecla(page, teclaDaFase);
  await cena(page, 'Game');
  await page.waitForTimeout(espera);
  await page.evaluate(([p, r]) => {
    const s = window.__game.scene.getScene('Game');
    if (r) localStorage.setItem(`alienworld:record:${s.handling}`, String(r));
    else localStorage.removeItem(`alienworld:record:${s.handling}`);
    s.score = p - s.scoreBase;
    s.gameOver();
  }, [pontos, recorde]);
  await cena(page, 'Pausa');
}

// ─── the four stages ───
for (const [k, nome, espera, pontos, recorde] of [
  ['Digit1', 'f1-sem-medalha', 6000, 240, 1320],
  ['KeyV', 'f2-recorde-prata', 6000, 1840, 900],
  ['KeyM', 'f3-ouro', 6000, 3460, 5120],
  ['KeyL', 'f4-bronze', 6000, 780, 5120],
]) {
  const page = await abrir();
  await morrer(page, k, espera, pontos, recorde);
  await foto(page, nome);
  if (nome === 'f2-recorde-prata') {
    await tecla(page, 'ArrowDown');
    await foto(page, 'f2-cursor-config');
    await tecla(page, 'Enter');
    await foto(page, 'f2-config');
    await tecla(page, 'Escape', 'ArrowDown');
    await foto(page, 'f2-cursor-sair');
  }
  await page.close();
}

// ─── the hint with a controller (Xbox, then PlayStation) ───
for (const [id, nome] of [[XBOX, 'controle-xbox'], [PS, 'controle-ps']]) {
  const page = await abrir();
  await conectar(page, id);
  await morrer(page, 'KeyV', 5000, 1210, 2000);
  await page.waitForTimeout(500);
  await botao(page, B.BAIXO);
  await foto(page, nome);
  await page.close();
}

// ─── the fallback without the HD layer ───
{
  const page = await abrir('?semhd');
  await morrer(page, 'KeyV', 5000, 3100, 900);
  await foto(page, 'semhd-recorde-ouro');
  await page.close();
}

fs.writeFileSync(path.join(OUT, 'fotos.json'), JSON.stringify(feitas, null, 2));
console.log(erros.length ? erros : 'no page error');
await browser.close();
process.exitCode = erros.length || feitas.some((f) => !f.estado) ? 1 : 0;
