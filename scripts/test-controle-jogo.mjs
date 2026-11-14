// BLOCK M2 (14/11) — the controller IN THE GAME, with a SIMULATED controller (`navigator.getGamepads` replaced in the
// page; the standard mapping of Xbox and PlayStation). Spec `specs/2026-11-14-bloco-m2-controles-design.md` §5.
//   menu     — connecting shows the notice; the d-pad walks the main menu; the hints change with the device;
//   nave     — the stick moves the ship, the trigger fires, START pauses and closes;
//   remapear — the CONTROLS tab: a new button (with the swap), a new key, a refused key, RESTORE;
//   queda    — the controller dropping in the middle of a stage opens the pause;
//   ps       — a PlayStation controller is named as one;
//   flap     — stage 1: the impulse is on the DASH button, never on the fire one (his feedback of 14/11);
//   sinais   — the three device symbols: lit when connected.
//   npm run dev  in another terminal, then  node scripts/test-controle-jogo.mjs [section …]
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);

const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, START: 9, CIMA: 12, BAIXO: 13, ESQ: 14, DIR: 15 };
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
const PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
async function abrir(sufixo = '') {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${sufixo || '/'}: ${e}`));
  await page.addInitScript(() => {
    const pad = { connected: false, id: '', index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibracoes: [] };
    pad.vibrationActuator = { playEffect: (tipo, p) => { pad.vibracoes.push({ tipo, ...p }); return Promise.resolve('complete'); }, reset: () => Promise.resolve('complete') };
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
/**
 * One press of a button: down until the game has READ it (the reader polls once per frame, and the automatic browser
 * runs slow — a fixed 90 ms sometimes fell between two frames), then up for two frames.
 */
const quadros = (page, n) => page.evaluate((k) => new Promise((ok) => { const g = window.__game; const alvo = g.loop.frame + k; const olha = () => (g.loop.frame >= alvo ? ok(null) : setTimeout(olha, 8)); olha(); }), n);
const botao = async (page, ...is) => { for (const i of is) { await segurar(page, i, true); await quadros(page, 2); await segurar(page, i, false); await quadros(page, 2); } };
const eixo = (page, x, y) => page.evaluate(([a, b]) => { window.__pad.axes[0] = a; window.__pad.axes[1] = b; }, [x, y]);
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(160); } };
const ativa = (page, chave, ms = 15000) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: ms }).then(() => true, () => false);
const imortal = (page) => page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.invulnerableUntil = 1e12; });
/** every text on screen, in both games */
const textos = (page) => page.evaluate(() => {
  const t = [];
  for (const g of [window.__game, window.__gameHD]) {
    if (!g) continue;
    for (const s of g.scene.getScenes(false)) for (const o of s.children?.list ?? []) if (typeof o.text === 'string' && o.active && o.alpha > 0 && o.visible) t.push(o.text);
  }
  return t;
});
const pausa = (page) => page.evaluate(() => {
  const g = window.__game;
  const p = g.scene.isActive('Pausa') ? g.scene.getScene('Pausa').diagnostico() : null;
  return { aberta: !!p, estado: p?.estado ?? null, textos: p?.textos ?? [], prefs: JSON.parse(localStorage.getItem('alienworld:preferencias') ?? 'null'), ativas: g.scene.getScenes(true).map((s) => s.scene.key) };
});
const tem = (lista, pedaco) => lista.some((t) => t.includes(pedaco));

if (roda('menu')) {
  const page = await abrir();
  await tecla(page, 'KeyQ'); // the opening skipped: the menu landed
  await page.waitForTimeout(400);
  await conectar(page, XBOX);
  ok(tem(await textos(page), 'CONTROLE CONECTADO'), 'connecting shows the notice');
  const c0 = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
  await botao(page, B.BAIXO, B.BAIXO);
  const c1 = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
  ok(c1 === c0 + 2, 'the d-pad walks the main menu', [c0, c1]);
  await eixo(page, 0, -1);
  await quadros(page, 2);
  await eixo(page, 0, 0);
  await quadros(page, 2);
  const c2 = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
  ok(c2 === c1 - 1, 'and so does the stick (one step per push)', [c1, c2]);
  await page.waitForTimeout(2100);
  ok(!tem(await textos(page), 'CONTROLE CONECTADO'), 'the notice leaves after 2 s');
  // into the settings with the confirm button; the footer speaks controller
  await botao(page, B.BAIXO, B.BAIXO, B.A);
  await page.waitForTimeout(300);
  let p = await pausa(page);
  ok(p.aberta && p.estado.tela === 'config', 'the bottom face button opens the SETTINGS from the menu', p.ativas);
  const icones = () => page.evaluate(() => (window.__gameHD ?? window.__game).scene.getScenes(false).flatMap((c) => c.children?.list ?? []).filter((o) => o.texture?.key === 'botoes' && o.active && o.frame.name < 19).map((o) => o.frame.name));
  ok(!tem(p.textos, '[Q  E]') && tem(p.textos, ' CONFIRMA'), 'the hints are the controller\'s (no keyboard keys in the footer)', p.textos.slice(-3));
  const vistos = await icones();
  ok([4, 5, 0, 1].every((q) => vistos.includes(q)), 'with the ICONS of LB, RB, A and B', vistos);
  await tecla(page, 'ArrowDown');
  p = await pausa(page);
  ok(tem(p.textos, '[Q  E] ABA') && tem(p.textos, '[ESC] VOLTA') && (await icones()).length === 0, 'a key press and the hints are the keyboard\'s again (no icon left)', p.textos.slice(-1));
  await botao(page, B.RB);
  p = await pausa(page);
  ok(p.estado.aba === 1 && tem(p.textos, 'CONTROLE · XBOX'), 'the shoulder changes the tab; the controller is named', p.estado);
  await botao(page, B.B);
  await page.waitForTimeout(500);
  ok(!(await pausa(page)).aberta, 'the right face button goes back');
  await page.close();
}

if (roda('nave')) {
  const page = await abrir();
  await conectar(page, XBOX);
  await tecla(page, 'KeyV');
  ok(await ativa(page, 'Game'), 'stage 2 opened');
  await imortal(page);
  await page.waitForTimeout(1500);
  const x0 = await page.evaluate(() => window.__game.scene.getScene('Game').ship.x);
  await eixo(page, 1, 0);
  await page.waitForTimeout(700);
  await eixo(page, 0, 0);
  const x1 = await page.evaluate(() => window.__game.scene.getScene('Game').ship.x);
  ok(x1 > x0 + 15, 'the stick moves the ship', [x0, x1]);
  await segurar(page, B.CIMA, true);
  const y0 = await page.evaluate(() => window.__game.scene.getScene('Game').ship.y);
  await page.waitForTimeout(500);
  await segurar(page, B.CIMA, false);
  const y1 = await page.evaluate(() => window.__game.scene.getScene('Game').ship.y);
  ok(y1 < y0 - 8, 'and so does the d-pad', [y0, y1]);
  const tiros = () => page.evaluate(() => window.__game.scene.getScene('Game').weapons.bullets.countActive(true));
  await page.waitForTimeout(900);
  const antes = await tiros();
  await segurar(page, B.RT, true);
  await page.waitForTimeout(1200);
  const durante = await tiros();
  await segurar(page, B.RT, false);
  ok(antes === 0 && durante > 0, 'the right trigger fires (MODERNO)', [antes, durante]);

  // the vibration: a blow, with the controller in use
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); delete s.damageShip; s.invulnerableUntil = 0; s.semDanoAte = 0; s.lives = 9; window.__pad.vibracoes.length = 0; s.damageShip(); });
  const vib = await page.evaluate(() => window.__pad.vibracoes);
  ok(vib.length === 1 && vib[0].tipo === 'dual-rumble' && vib[0].duration === 180, 'a blow shakes the controller', vib);
  await imortal(page);

  // START pauses, the d-pad walks the pause, START closes
  await botao(page, B.START);
  await page.waitForTimeout(300);
  let p = await pausa(page);
  ok(p.aberta && p.estado.tela === 'lista' && p.estado.cursor === 0, 'START pauses (and the pause stays open)', p.ativas);
  await botao(page, B.BAIXO);
  ok((await pausa(page)).estado?.cursor === 1, 'the d-pad walks the pause');
  await botao(page, B.START);
  await page.waitForTimeout(600);
  p = await pausa(page);
  ok(!p.aberta && p.ativas.includes('Game'), 'START again closes it — and it did not reopen by itself', p.ativas);
  await page.close();
}

if (roda('remapear')) {
  const page = await abrir();
  await conectar(page, XBOX);
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await imortal(page);
  await page.waitForTimeout(1200);
  // pause → SETTINGS → CONTROLS → the FIRE line, the controller cell
  await botao(page, B.START, B.BAIXO, B.BAIXO, B.A, B.RB, B.BAIXO, B.BAIXO, B.DIR);
  let p = await pausa(page);
  ok(p.estado?.tela === 'config' && p.estado.aba === 1 && p.estado.linha === 2 && p.estado.coluna === 1, 'on the FIRE line, the controller cell', p.estado);
  ok(tem(p.textos, 'RT') && tem(p.textos, 'ESPAÇO'), 'the table shows the keys and buttons in force', p.textos);
  await botao(page, B.A);
  p = await pausa(page);
  ok(p.estado.tela === 'captura' && tem(p.textos, 'APERTE O NOVO BOTÃO'), 'the confirm button waits for the new button (and is not taken as it)', p.estado);
  await botao(page, B.START);
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.prefs?.controle !== 'personalizado', 'START cancels the capture');
  await botao(page, B.A, B.CIMA);
  p = await pausa(page);
  ok(p.estado.tela === 'captura' && tem(p.textos, 'esse botão é do jogo'), 'the d-pad is refused, the capture stays open', p.textos.slice(-2));
  await botao(page, B.Y);
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.prefs.controle === 'personalizado' && p.prefs.mapaControle.tiro === B.Y, 'a free button: FIRE on Y, the profile is PERSONALIZADO', p.prefs);
  ok(tem(p.textos, 'PERSONALIZADO'), 'and the screen says so');
  await botao(page, B.A, B.X);
  p = await pausa(page);
  ok(p.prefs.mapaControle.tiro === B.X && p.prefs.mapaControle.bomba === B.Y, 'a button in use: FIRE and BOMB swap', p.prefs.mapaControle);

  // the keyboard cell
  await tecla(page, 'ArrowLeft', 'Enter');
  p = await pausa(page);
  ok(p.estado.tela === 'captura' && p.estado.coluna === 0 && tem(p.textos, 'APERTE A NOVA TECLA'), 'ENTER on the keyboard cell waits for the new key (and is not taken as it)', p.estado);
  await tecla(page, 'KeyW');
  p = await pausa(page);
  ok(p.estado.tela === 'captura' && tem(p.textos, 'essa tecla é do jogo'), 'W is refused');
  await tecla(page, 'KeyK');
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.prefs.teclas === 'personalizado' && p.prefs.mapaTeclado.tiro === 'K' && tem(p.textos, 'K'), 'FIRE on K', p.prefs);
  await tecla(page, 'Enter', 'KeyE');
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.estado.aba === 1 && p.prefs.mapaTeclado.tiro === 'E' && p.prefs.mapaTeclado.dash === 'K', 'E (the tab key) is captured as a key, not as "next tab": FIRE and DASH swap', p.prefs.mapaTeclado);
  await tecla(page, 'Enter', 'Escape');
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.prefs.mapaTeclado.tiro === 'E', 'ESC cancels the capture (and stays in the settings)', p.estado);

  // the remapped keys are live in the stage without restarting it
  await tecla(page, 'Escape', 'Escape');
  await page.waitForTimeout(600);
  ok(!(await pausa(page)).aberta, 'back in the stage');
  const tiros = () => page.evaluate(() => window.__game.scene.getScene('Game').weapons.bullets.countActive(true));
  await page.waitForTimeout(900);
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(1200);
  const comE = await tiros();
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(900);
  await segurar(page, B.X, true);
  await page.waitForTimeout(1200);
  const comX = await tiros();
  await segurar(page, B.X, false);
  ok(comE > 0 && comX > 0, 'the stage fires with the new key (E) and the new button (X)', [comE, comX]);

  // RESTORE
  await tecla(page, 'Escape', 'ArrowDown', 'ArrowDown', 'Enter', 'KeyE', 'ArrowUp', 'ArrowUp');
  for (let i = 0; i < 10; i++) await tecla(page, 'ArrowDown');
  p = await pausa(page);
  ok(tem(p.textos, 'RESTAURAR O PADRÃO') && p.estado.linha === 8, 'the last line is RESTORE', p.estado);
  await tecla(page, 'Enter');
  p = await pausa(page);
  ok(p.estado.tela === 'confirma' && p.estado.sim === false, 'it asks first, the cursor on NO', p.estado);
  await tecla(page, 'ArrowLeft', 'Enter');
  p = await pausa(page);
  ok(p.estado.tela === 'config' && p.prefs.teclas === 'padrao' && p.prefs.controle === 'moderno' && p.prefs.mapaTeclado === null && p.prefs.mapaControle === null, 'YES: both devices back to the factory profile', p.prefs);
  // the profile lines and the vibration
  await tecla(page, 'ArrowUp', 'ArrowRight');
  p = await pausa(page);
  ok(p.prefs.vibracao === false, 'the vibration line toggles', p.prefs);
  for (let i = 0; i < 6; i++) await tecla(page, 'ArrowUp');
  await tecla(page, 'ArrowRight');
  p = await pausa(page);
  ok(p.estado.linha === 1 && p.prefs.controle === 'arcade' && tem(p.textos, 'ARCADE'), 'the controller profile line: ARCADE', p.estado);
  await page.close();
}

if (roda('queda')) {
  const page = await abrir();
  await conectar(page, XBOX);
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await imortal(page);
  await page.waitForTimeout(1200);
  await botao(page, B.A); // the controller is the device in use
  await page.evaluate(() => { window.__pad.connected = false; });
  await page.waitForTimeout(400);
  const p = await pausa(page);
  ok(p.aberta, 'the controller dropped in the middle of the stage: the pause opens by itself', p.ativas);
  ok(tem(await textos(page), 'CONTROLE DESCONECTADO'), 'and the notice says so');
  await page.close();
}

if (roda('ps')) {
  const page = await abrir();
  await conectar(page, PS);
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await imortal(page);
  await page.waitForTimeout(1200);
  await botao(page, B.START, B.BAIXO, B.BAIXO, B.A, B.RB);
  const p = await pausa(page);
  const quadrosPs = await page.evaluate(() => (window.__gameHD ?? window.__game).scene.getScenes(false).flatMap((c) => c.children?.list ?? []).filter((o) => o.texture?.key === 'botoes' && o.active && o.frame.name < 19).map((o) => o.frame.name));
  ok(tem(p.textos, 'CONTROLE · PLAYSTATION') && tem(p.textos, 'R2') && tem(p.textos, 'QUADRADO'), 'a PlayStation controller: named, R2 and QUADRADO in the table', p.textos);
  ok([13, 14, 9, 10, 16, 11].every((q) => quadrosPs.includes(q)), 'with the PlayStation ICONS (L1, R1, cross, circle, R2, square)', quadrosPs);
  await page.close();
}

if (roda('flap')) {
  // the ship of stage 1 falls; a flap throws it up. `vy` right after a press tells whether that button flapped.
  const flapou = async (page, i) => {
    await page.waitForTimeout(350);
    await segurar(page, i, true);
    await quadros(page, 2);
    const vy = await page.evaluate(() => window.__game.scene.getScene('Game').ship.body.velocity.y);
    await segurar(page, i, false);
    await quadros(page, 2);
    return vy < -20;
  };
  for (const [perfil, tiro, dash] of [['moderno', B.RT, B.A], ['arcade', B.A, B.B]]) {
    const page = await abrir();
    await page.evaluate((p) => localStorage.setItem('alienworld:preferencias', JSON.stringify({ v: 2, controle: p })), perfil);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
    await page.waitForTimeout(1200);
    await conectar(page, PS);
    await tecla(page, 'Digit1');
    await ativa(page, 'Game');
    await imortal(page);
    await page.waitForTimeout(800);
    const comDash = await flapou(page, dash);
    const comTiro = await flapou(page, tiro);
    ok(comDash, `${perfil}: the DASH button gives the impulse in stage 1`);
    ok(!comTiro, `${perfil}: the FIRE button only fires (no impulse)`);
    const tiros = await page.evaluate(async () => { const s = window.__game.scene.getScene('Game'); return s.weapons.bullets.countActive(true); });
    await segurar(page, tiro, true);
    await page.waitForTimeout(900);
    const depois = await page.evaluate(() => window.__game.scene.getScene('Game').weapons.bullets.countActive(true));
    await segurar(page, tiro, false);
    ok(depois > tiros || depois > 0, `${perfil}: and it does fire`, [tiros, depois]);
    await page.evaluate(() => localStorage.removeItem('alienworld:preferencias'));
    await page.close();
  }
}

if (roda('sinais')) {
  const page = await abrir();
  await tecla(page, 'KeyQ');
  await page.waitForTimeout(400);
  const cores = () => page.evaluate(() => {
    const r = {};
    for (const g of [window.__game, window.__gameHD]) for (const s of g?.scene.getScenes(false) ?? []) for (const o of s.children?.list ?? []) if (['PS', 'XBOX', 'TECLADO'].includes(o.text) && o.active) r[o.text] = o.style?.color ?? String(o.tintTopLeft);
    return r;
  });
  let c = await cores();
  ok(c.PS && c.XBOX && c.TECLADO && c.TECLADO !== c.PS && c.PS === c.XBOX, 'no controller: the keyboard lit, PS and XBOX dim', c);
  await conectar(page, PS);
  c = await cores();
  ok(c.PS === c.TECLADO && c.XBOX !== c.PS, 'a PlayStation controller: PS and the keyboard lit, XBOX dim', c);
  await page.evaluate(() => { window.__pad.id = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)'; });
  await page.waitForTimeout(300);
  c = await cores();
  ok(c.XBOX === c.TECLADO && c.PS !== c.XBOX, 'an Xbox controller in its place: XBOX and the keyboard lit', c);
  await page.evaluate(() => { window.__pad.connected = false; });
  await page.waitForTimeout(300);
  c = await cores();
  ok(c.PS === c.XBOX && c.TECLADO !== c.PS, 'disconnected: only the keyboard lit again', c);
  await page.close();
}

if (erros.length) { console.log(erros); falhas += erros.length; }
console.log(falhas === 0 ? '\n✔ THE CONTROLLER IN THE GAME' : `\n✘ ${falhas} asserts failed`);
await browser.close();
process.exitCode = falhas ? 1 : 0;
