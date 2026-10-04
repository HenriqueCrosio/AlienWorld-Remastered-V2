// O ARQUIVO DE CARTAS (spec 2026-10-04-arquivo-de-cartas-design.md): o menu abre pela lista, as setas percorrem as 24,
// nenhuma ficha vaza da área, ESC volta e o COMEÇAR continua começando. Uso: node scripts/probe-arquivo.mjs
// (com `npm run dev` rodando)
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const ativa = (k) => page.evaluate((k) => window.__game.scene.isActive(k), k);
const arquivo = (f) => page.evaluate(f);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
// A 1ª tecla pula a abertura; espera o menu assentar. (⚠️ Não o X: é atalho de dev do menu — abre o sandbox.)
await page.keyboard.press('KeyQ');
await page.waitForFunction(() => window.__game.scene.getScene('Menu').settled);

// ── O menu: a lista, e ↓ + Enter abre o Arquivo ──
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150); // a tecla é processada no quadro seguinte
const cursor = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
conferir(cursor === 1, '↓ leva o cursor do menu ao ARQUIVO', cursor);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.scene.isActive('Arquivo'), null, { timeout: 5000 }).catch(() => {});
conferir(await ativa('Arquivo'), 'Enter no ARQUIVO abre a cena Arquivo', null);
await page.waitForTimeout(300);

const sel = () => page.evaluate(() => window.__game.scene.getScene('Arquivo').selecionada);
conferir((await sel()) === 'WPN_001', 'abre na primeira carta (Tiro Duplo)', await sel());

// ── As setas andam na grade ──
const passos = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('ArrowRight');
  passos.push(await sel());
}
conferir(new Set(passos).size === 6 && passos[5] === 'WPN_010', '→ seis vezes percorre a 1ª linha até o Drone', passos);
await page.keyboard.press('ArrowRight');
conferir((await sel()) === 'WPN_010', 'na borda direita, → para', await sel());
await page.keyboard.press('ArrowDown');
const abaixo = await sel();
conferir(abaixo.startsWith('EFF_'), '↓ desce para a linha do EFEITO', abaixo);
for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowDown');
const fundo = await sel();
conferir(fundo.startsWith('MOV_'), '↓ até o fim chega no MOVIMENTO e para', fundo);

// ── Toda ficha cabe na área dela ──
const vazadas = await arquivo(() => {
  const a = window.__game.scene.getScene('Arquivo');
  const ids = ['WPN_001', 'WPN_002', 'WPN_004', 'WPN_007', 'WPN_008', 'WPN_009', 'WPN_010', 'EFF_001', 'EFF_002', 'EFF_003',
    'EFF_004', 'EFF_006', 'EFF_007', 'EFF_010', 'EFF_011', 'EFF_012', 'EFF_013', 'DEF_001', 'DEF_002', 'DEF_003', 'DEF_004',
    'DEF_005', 'MOV_001', 'MOV_003'];
  const fora = [];
  for (const id of ids) {
    a.selecionar(id);
    const g = a.geometria();
    if (g.id !== id || g.caixas.length < 3) fora.push({ id, problema: 'ficha incompleta', n: g.caixas.length });
    for (const c of g.caixas) {
      const folga = 0.5;
      if (c.x < g.area.x - folga || c.x + c.w > g.area.x + g.area.w + folga || c.y + c.h > g.area.y + g.area.h + folga) {
        fora.push({ id, caixa: c });
      }
    }
  }
  return fora;
});
conferir(vazadas.length === 0, 'as 24 fichas cabem na área (nenhum texto vaza)', vazadas.slice(0, 4));

// ── A tecla nas ativas ──
const tecla = await arquivo(() => {
  const a = window.__game.scene.getScene('Arquivo');
  a.selecionar('WPN_009');
  return a.ficha.map((t) => t.text).join(' | ');
});
conferir(/TECLA Q/.test(tecla), 'o Míssil mostra a tecla Q', tecla);

// ── ESC volta ao menu, com o cursor no ARQUIVO; ↑ + Enter começa o jogo ──
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__game.scene.isActive('Menu'), null, { timeout: 5000 }).catch(() => {});
conferir(await ativa('Menu'), 'ESC volta ao menu', null);
await page.waitForFunction(() => window.__game.scene.getScene('Menu').settled, null, { timeout: 5000 }).catch(() => {});
const deVolta = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
conferir(deVolta === 1, 'de volta, o cursor está no ARQUIVO (e o menu já montado)', deVolta);
await page.keyboard.press('ArrowUp');
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 8000 }).catch(() => {});
conferir(await ativa('Game'), 'COMEÇAR continua começando o jogo', null);

conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 3));
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
