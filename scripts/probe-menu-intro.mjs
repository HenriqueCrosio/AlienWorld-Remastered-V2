// Sonda da ABERTURA do menu: fotografa um frame NO MEIO da cinemática e prova que ela existe
// (o menu ainda NÃO está montado) e que a tecla PULA para o estado montado.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// 700ms: dentro da janela da abertura (~3–4s), longe do fim. O menu NÃO deve estar montado, e o
// Leviatã tem que estar NADANDO a travessia (visível, tocando `leviathan-swim`) e ATRÁS da lua
// em profundidade — é ela quem o oclui quando ele some.
await page.waitForTimeout(700);
await page.screenshot({ path: 'probe-menu-intro.png' });
const meio = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const lev = s.children.list.find(
    (c) => c.type === 'Sprite' && c.texture?.key === 'leviathanSwimSheet',
  );
  const lua = s.children.list.find((c) => c.type === 'Image' && c.name === 'menuMoon');
  const logo = s.children.list.find((c) => c.type === 'Sprite' && c.texture?.key === 'menuLogoSheet');
  return {
    settled: s.settled,
    lev: lev ? { anim: lev.anims?.currentAnim?.key ?? null, depth: lev.depth, flipX: lev.flipX } : null,
    lua: lua ? { depth: lua.depth, alpha: +lua.alpha.toFixed(2) } : null,
    logoAlpha: logo ? +logo.alpha.toFixed(2) : null,
  };
});
ok(meio.settled === false, 'a 700ms a cinemática ainda ESTÁ rodando (settled=false)');
ok(!!meio.lev, 'o Leviatã está NADANDO durante a abertura');
ok(meio.lev?.anim === 'leviathan-swim', `o Leviatã toca a travessia (${meio.lev?.anim})`);
// O sprite aponta para a direita SEM flip; nadando para a direita, a cabeça lidera. Um flip aqui
// = a criatura de costas (o bug que a sonda de estado não via — a régua é o SENTIDO da cabeça).
ok(meio.lev?.flipX === false, `o Leviatã nada de FRENTE, não de costas (flipX=${meio.lev?.flipX})`);
ok(
  meio.lev != null && meio.lua != null && meio.lev.depth < meio.lua.depth,
  `o Leviatã passa ATRÁS da lua (depth ${meio.lev?.depth} < lua ${meio.lua?.depth})`,
);
// A lua tem que ser OPACA para ESCONDER o Leviatã atrás dela — com alpha < 1 ele vazava pela lua.
ok(meio.lua?.alpha === 1, `a lua é OPACA e esconde o Leviatã (alpha ${meio.lua?.alpha})`);
// O emblema só surge DEPOIS que o Leviatã some: durante a travessia ele ainda está invisível.
ok(meio.logoAlpha === 0, `o emblema ainda NÃO surgiu durante a travessia (alpha ${meio.logoAlpha})`);

// Uma tecla PULA a abertura: em seguida o menu tem que estar montado E o Leviatã removido — o
// repouso é SEM criatura (ela passa uma vez só; pular rompe a travessia no meio).
await page.keyboard.press('X');
await page.waitForTimeout(150);
await page.waitForTimeout(300);
const depois = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const lev = s.children.list.find(
    (c) => c.type === 'Sprite' && c.texture?.key === 'leviathanSwimSheet',
  );
  const logo = s.children.list.find((c) => c.type === 'Sprite' && c.texture?.key === 'menuLogoSheet');
  return { settled: s.settled, temLeviatan: !!lev, logoAlpha: logo ? +logo.alpha.toFixed(2) : null };
});
ok(depois.settled === true, 'qualquer tecla PULA a abertura (settled=true após a tecla)');
ok(depois.temLeviatan === false, 'ao pular, o Leviatã é removido (repouso sem criatura)');
// Ao pular, o emblema também aparece (vamos direto ao repouso, que já o inclui).
ok(depois.logoAlpha != null && depois.logoAlpha > 0, `ao pular, o emblema surge (alpha ${depois.logoAlpha})`);

console.log('screenshot: probe-menu-intro.png');
console.log(falhas === 0 ? '\n✔ ABERTURA OK' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
