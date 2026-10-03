// O SANDBOX DE DEV (spec 2026-10-02-sandbox-dev-design.md §6): monta uma build PELA TELA, joga, confere as ondas, as
// cartas, as medidas e as teclas de dev, volta pelo ESC com a montagem intacta — e abre os fundos F1, F3 e F4 e o
// "começar no chefão". Uso: node scripts/probe-sandbox.mjs   (com `npm run dev` rodando)
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  if (!sessionStorage.getItem('probe-sandbox')) {
    localStorage.removeItem('alienworld.sandbox');
    sessionStorage.setItem('probe-sandbox', '1');
  }
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const montagemAberta = () => page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
const jogar = async () => {
  await page.click('button[data-acao="jogar"]');
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
};

// ── 1. A MONTAGEM PELA TELA ──
await montagemAberta();
await page.click('button[data-acao="atalho"][data-nome="FOGO"]');
await page.click('.no[data-id="EFF_001"]');
await page.click('.no[data-id="WPN_004"]');
await page.click('.no[data-id="WPN_004"]');
await page.click('.no[data-id="EFF_004"]', { button: 'right' }); // segura a Combustão: não sai
const pontos = await page.textContent('#sandbox .pontos');
conferir(pontos === 'PONTOS 6/7', 'a árvore soma pelo clique, o atalho monta a cadeia, e quem segura outro não sai', pontos);

// ── 2. JOGAR: a build na mão, as ondas saindo ──
await jogar();
// Invulnerável já (tecla 3): parada atirando, a nave morreria e o sandbox voltaria à montagem no meio da medida.
await page.keyboard.press('Digit3');
await page.waitForTimeout(3500);
const jogo = await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  const total = Object.values(s.arena.cfg.inimigos).reduce((a, b) => a + b, 0);
  return { mao: g.registry.get('cartas'), stage: s.stage.id, onda1: s.arena.ondas[0]?.membros.length, total, roteiro: s.director.events?.length };
});
conferir(
  JSON.stringify(jogo.mao) === JSON.stringify(['WPN_004', 'WPN_004', 'EFF_001', 'EFF_004', 'EFF_006', 'EFF_007']),
  'a build da montagem chega à mão (na ordem da árvore, com os níveis)',
  jogo.mao,
);
conferir(jogo.onda1 === jogo.total && jogo.total > 0, 'a 1ª onda sai com a quantidade montada', jogo);

// ── 3. AS MEDIDAS e as TECLAS DE DEV ──
await page.keyboard.down('Space');
await page.waitForTimeout(4000);
await page.keyboard.up('Space');
const medidas = await page.evaluate(() => window.__game.scene.getScene('Game').medidas.resumo());
conferir(medidas.dano > 0 && medidas.dano_por_fonte.tiro > 0, 'as medidas contam o dano por fonte', medidas);
await page.keyboard.press('Digit2');
await page.waitForTimeout(200);
const limpou = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.countActive(true));
conferir(limpou === 0, '2 limpa a tela', limpou);
const antesN = await page.evaluate(() => window.__game.scene.getScene('Game').arena.contador);
await page.keyboard.press('Digit1');
await page.waitForTimeout(2000);
const teclas = await page.evaluate((antesN) => {
  const s = window.__game.scene.getScene('Game');
  return { invulneravel: s.arena.invulneravel, hud: s.hud.text.includes('INVULN.'), novaOnda: s.arena.contador >= antesN + 1, inimigos: s.enemies.enemies.countActive(true) };
}, antesN);
conferir(teclas.invulneravel && teclas.hud && teclas.novaOnda && teclas.inimigos > 0, '3 liga o invulnerável (HUD) e 1 chama uma onda', teclas);
await page.keyboard.press('Digit3');
const desligou = await page.evaluate(() => !window.__game.scene.getScene('Game').arena.invulneravel);
conferir(desligou, 'I de novo desliga o invulnerável', desligou);

// ── 4. ESC: de volta à montagem, intacta ──
await page.keyboard.press('Escape');
await montagemAberta();
const volta = await page.textContent('#sandbox .pontos');
conferir(volta === pontos, 'ESC volta à montagem com a build intacta', volta);

// ── 5. OS OUTROS FUNDOS e o CHEFÃO ──
for (const [fase, chefe] of [[1, false], [3, false], [4, false], [2, true]]) {
  await page.evaluate(({ fase, chefe }) => {
    const c = JSON.parse(localStorage.getItem('alienworld.sandbox'));
    Object.assign(c, { fase, chefe, niveis: { EFF_001: 1 }, inimigos: { ...c.inimigos, drone: 3, canhoneira: 0, kamikaze: 0 } });
    localStorage.setItem('alienworld.sandbox', JSON.stringify(c));
    window.__game.scene.getScenes(true).forEach((s) => s.scene.stop());
    window.__sandbox.abrir();
  }, { fase, chefe });
  await montagemAberta();
  await jogar();
  await page.keyboard.press('Digit3');
  await page.waitForTimeout(chefe ? 7000 : 3000);
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    return { stage: s.stage.id, inimigos: s.enemies.enemies.countActive(true), chefao: !!s.boss || !!s.golfinho, ativa: window.__game.scene.isActive('Game') };
  });
  conferir(r.ativa && r.stage === fase && (chefe ? r.chefao : r.inimigos > 0), chefe ? 'F2 começando no chefão: o chefão entra' : `fundo F${fase}: a fase abre e as ondas saem`, r);
  await page.keyboard.press('Escape');
  await montagemAberta();
}

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
