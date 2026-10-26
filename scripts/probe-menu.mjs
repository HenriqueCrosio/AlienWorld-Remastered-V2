// O MENU REFEITO (spec 2026-10-19-menu-refeito-design.md §9): o cenário na camada HD atrás do texto; a abertura nos
// tempos certos (o letreiro na curva da queda, os jatos só na descida, a lista, o neon e os olhos); pular; as teclas da
// lista e da condução (lembrada entre sessões); o atalho 1; o relâmpago (e nenhum com movimento reduzido); a troca de
// escala da tela; o menu sem a camada HD (?semhd). Uso: node scripts/probe-menu.mjs (com `npm run dev` rodando)
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const erros = [];
// One context for every page: `browser.newPage()` would make a fresh one each time, and the remembered handling lives in
// that context's localStorage.
const contexto = await browser.newContext();
const abrir = async ({ viewport = { width: 1536, height: 864 }, reduzido = false, sufixo = '' } = {}) => {
  const page = await contexto.newPage();
  await page.setViewportSize(viewport);
  if (reduzido) await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto(URL + sufixo, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
  return page;
};

// ── 1. O cenário mora na camada HD, atrás do texto (§8.1) ──
let page = await abrir();
await page.evaluate(() => localStorage.removeItem('alienworld:conducao'));
const camada = await page.evaluate(() => {
  const hd = window.__gameHD;
  const cena = hd.scene.getScene('MenuHD');
  return {
    chaves: hd.scene.scenes.map((c) => c.sys.settings.key),
    s: hd.canvas.width / 384,
    zoom: cena?.cameras.main.zoom,
    temCenario: !!cena?.cenario,
    escalaAtm: cena?.atm?.pipeline?.escala,
  };
});
const S = camada.s;
conferir(camada.chaves[0] === 'MenuHD', 'a cena do cenário é a primeira da camada (atrás de tudo)', camada.chaves);
conferir(camada.chaves.findIndex((k) => k.startsWith('irma:Menu')) > 0, 'o texto mora numa irmã, acima dela', camada.chaves);
conferir(camada.temCenario && camada.zoom === S && camada.escalaAtm === S, `a câmera e a Atmosfera na escala da tela (s = ${S})`, camada);

// ── 2. A abertura, instante a instante (§6) ──
const em = (t) =>
  page.evaluate(async (t) => {
    const A = await import('/src/menu/abertura.ts');
    const N = await import('/src/menu/numerosMenu.ts');
    const m = window.__game.scene.getScene('Menu');
    m.irPara(t);
    const p = A.posicaoLetreiro(t - N.ABERTURA.letreiro.t0);
    return { d: m.diagnostico(), esperado: p, settled: m.settled };
  }, t);
const tol = 1 / S + 1e-6;
let e = await em(2.0);
conferir(e.d.titulo.y < 0 && e.d.jatos === 0 && e.d.lista.every((l) => l.alfa === 0), '2,0 s: só o cenário (o letreiro acima da tela)', e.d);
e = await em(4.0);
conferir(Math.abs(e.d.titulo.y - e.esperado.y) <= tol && Math.abs(e.d.titulo.x - e.esperado.x) <= tol, '4,0 s: o letreiro na curva da queda', [e.d.titulo, e.esperado]);
conferir(e.d.jatos > 20 && e.d.titulo.acesas === 0, `4,0 s: descendo apagado, com os retrofoguetes (${e.d.jatos} partículas)`, e.d);
e = await em(6.0);
conferir(e.d.jatos > 0, '6,0 s: a queima ainda acesa', e.d.jatos);
e = await em(9.0);
conferir(e.d.titulo.acesas > 0 && e.d.titulo.acesas < 10 && !e.d.titulo.olhos, `9,0 s: o neon pegando (${e.d.titulo.acesas} letras)`, e.d.titulo);
e = await em(9.4);
conferir(e.d.jatos === 0 && Math.abs(e.d.titulo.y - 58) <= 0.3, '9,4 s: firme em y 58, sem jatos', e.d);
conferir(Math.abs(e.d.sub.y - (e.d.titulo.y + 13)) <= tol, 'o REMASTERED 13 px abaixo', [e.d.sub, e.d.titulo]);
conferir(e.d.lista.every((l, i) => Math.abs(l.y - [178, 188, 198][i]) <= 0.3) && e.settled, 'a lista pousada no lugar; o menu aceita teclas', e.d.lista);
e = await em(10.2);
conferir(e.d.titulo.acesas === 10 && !e.d.titulo.olhos, '10,2 s: aceso inteiro, ainda sem os olhos', e.d.titulo);
e = await em(10.6);
conferir(e.d.titulo.olhos, '10,6 s: por último, os olhos', e.d.titulo);

// ── 3. Pular (§6.1) ──
await page.close();
page = await abrir();
await page.keyboard.press('KeyQ');
await page.waitForTimeout(300);
const pulo = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { settled: m.settled, pulou: m.estado.pulou, d: m.diagnostico() };
});
conferir(pulo.settled && pulo.pulou, 'uma tecla na abertura pula para o menu pousado', pulo);
conferir(pulo.d.titulo.acesas === 10 && pulo.d.titulo.olhos && pulo.d.jatos === 0, 'pulado: aceso, com os olhos, sem jatos', pulo.d);
await page.screenshot({ path: 'probe-menu.png' });

// ── 4. A lista e a condução (§7.2) ──
const tecla = async (k) => {
  await page.keyboard.press(k);
  await page.waitForTimeout(150);
};
const ler = () =>
  page.evaluate(() => {
    const m = window.__game.scene.getScene('Menu');
    return { cursor: m.cursorMenu, conducao: m.conducao, d: m.diagnostico() };
  });
await tecla('ArrowDown');
let l = await ler();
conferir(l.cursor === 1 && l.d.desc.alfa === 1 && l.d.desc.texto.includes('gravidade'), '↓ vai à condução, e a descrição aparece', l);
await tecla('ArrowRight');
l = await ler();
conferir(l.conducao === 'flap' && l.d.lista[1].texto.includes('LEGACY') && l.d.desc.texto.includes('flap'), '→ troca para LEGACY', l);
await tecla('ArrowRight');
conferir((await ler()).conducao === 'free', '→ de novo: LIVRE', null);
await tecla('Enter');
conferir((await ler()).conducao === 'diegetico', 'Enter na condução também avança (volta à DIEGÉTICA)', null);
await tecla('ArrowLeft');
await tecla('ArrowLeft');
conferir((await ler()).conducao === 'flap', '←← volta até LEGACY', null);
await tecla('ArrowDown');
l = await ler();
conferir(l.cursor === 2 && l.d.desc.alfa === 0, '↓ vai ao ARQUIVO, e a descrição some', l);
await tecla('ArrowUp');
await tecla('ArrowUp');
conferir((await ler()).cursor === 0, '↑↑ volta ao COMEÇAR', null);
const guardada = await page.evaluate(() => localStorage.getItem('alienworld:conducao'));
conferir(guardada === 'flap', `a condução fica guardada (${guardada})`, guardada);

// ── 5. Lembrada ao abrir de novo, e o Enter começa com ela ──
await page.close();
page = await abrir();
conferir((await page.evaluate(() => window.__game.scene.getScene('Menu').conducao)) === 'flap', 'aberto de novo, o menu lembra a LEGACY', null);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(250);
await page.keyboard.press('Enter');
// COMEÇAR passa pelo HANGAR (25/10): lá, ENTER decola na nave escolhida e a fase começa.
await page.waitForFunction(() => window.__game.scene.isActive('Hangar'), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 }).catch(() => {});
const jogo = await page.evaluate(() => ({ handling: window.__game.scene.getScene('Game')?.handling, cenaHD: !!window.__gameHD.scene.getScene('MenuHD') }));
conferir(jogo.handling === 'flap', `Enter em COMEÇAR começa com a condução escolhida (${jogo.handling})`, jogo);
conferir(!jogo.cenaHD, 'saindo do menu, a cena do cenário sai da camada', jogo);
await page.evaluate(() => localStorage.removeItem('alienworld:conducao'));

// ── 6. O atalho 1 começa direto, mesmo durante a abertura ──
await page.close();
page = await abrir();
await page.keyboard.press('Digit1');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 }).catch(() => {});
conferir(await page.evaluate(() => window.__game.scene.isActive('Game')), 'o 1 começa direto', null);

// ── 7. O relâmpago cai aos 2,4 s; com movimento reduzido, nunca (§4.3, §6.1) ──
await page.close();
page = await abrir();
await page.waitForFunction(() => window.__gameHD.scene.getScene('MenuHD')?.t > 2.7, null, { timeout: 60000 });
const comRaio = await page.evaluate(() => window.__gameHD.scene.getScene('MenuHD').cenario.relampagos());
conferir(comRaio >= 1, `o primeiro relâmpago caiu (${comRaio})`, comRaio);
await page.close();
page = await abrir({ reduzido: true });
await page.waitForFunction(() => window.__gameHD.scene.getScene('MenuHD')?.t > 2.7, null, { timeout: 60000 });
const rm = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { settled: m.settled, olhos: m.diagnostico().titulo.olhos, relampagos: window.__gameHD.scene.getScene('MenuHD').cenario.relampagos() };
});
conferir(rm.settled && rm.olhos, 'movimento reduzido: abre pousado e aceso', rm);
conferir(rm.relampagos === 0, 'movimento reduzido: nenhum relâmpago', rm);

// ── 8. A tela muda de escala (§8.1) ──
await page.close();
page = await abrir();
await page.keyboard.press('KeyQ');
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForFunction(() => window.__gameHD.canvas.width === 1920, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
const r5 = await page.evaluate(() => {
  const hd = window.__gameHD;
  const c = hd.scene.getScene('MenuHD');
  return { w: hd.canvas.width, zoom: c.cameras.main.zoom, escala: c.atm?.pipeline?.escala, neon: hd.textures.exists('letreiro-aceso-5') };
});
conferir(r5.w === 1920 && r5.zoom === 5 && r5.escala === 5, 'em 1920, s = 5: a câmera e a Atmosfera acompanham', r5);
conferir(r5.neon, 'o neon é gerado de novo para s = 5', r5);

// ── 9. Sem a camada HD (?semhd): o plano B (§8.3) ──
await page.close();
page = await abrir({ sufixo: '?semhd' });
const sem = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { hd: !!window.__gameHD, cenario: !!m.cenario, itens: m.diagnostico().lista.length, titulo: !!m.diagnostico().titulo };
});
conferir(!sem.hd && sem.cenario, 'sem a camada HD, o cenário roda no próprio menu (k1)', sem);
conferir(sem.itens === 2 && sem.titulo, 'a lista sem o ARQUIVO, e o título em texto', sem);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(300);
await page.screenshot({ path: 'probe-menu-semhd.png' });
await page.close();

await browser.close();
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log('telas: probe-menu.png, probe-menu-semhd.png');
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
