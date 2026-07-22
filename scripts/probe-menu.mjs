// Sonda do MENU "O DESPERTAR": o diorama montado no estado de REPOUSO.
//
// O que ela prova: o fundo é o DIORAMA composto em camadas (a lua `menuMoon` + as bandas de
// montanha), o TÍTULO existe e é grande (≥20px) e visível (alpha ≥0.8), o subtítulo, o CTA e as
// TRÊS conduções estão no terço de baixo, e o menu chegou ao estado montado (settled). O Leviatã
// atravessa UMA vez e some atrás da lua (~10s): no repouso NÃO há mais criatura na cena — por isso
// a sonda espera passar a travessia antes de fotografar.
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
// A travessia do Leviatã dura ~16s + o fade do emblema. Esperar passar dela: o repouso só existe
// depois que a criatura some atrás da lua e o emblema surge. Fotografar antes mediria a travessia.
await page.waitForTimeout(18000);
await page.screenshot({ path: 'probe-menu.png' });

const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const filhos = s.children.list;

  // O DIORAMA: a lua (nomeada) e as bandas de montanha (texturas mtn*).
  const lua = filhos.find((c) => c.type === 'Image' && c.name === 'menuMoon');
  const montanhasArr = filhos.filter(
    (c) => c.type === 'Image' && /^mtn/i.test(c.texture?.key ?? ''),
  );
  const montanhas = montanhasArr.length;
  const montanhaDepthMin = montanhas ? Math.min(...montanhasArr.map((c) => c.depth)) : null;

  const textos = filhos.filter((c) => c.type === 'Text').map((c) => ({
    valor: c.text,
    alpha: +c.alpha.toFixed(2),
    y: Math.round(c.y),
    tamanho: parseInt(c.style.fontSize, 10),
  }));
  const texto = (trecho) => textos.find((t) => t.valor.replace(/ /g, '').includes(trecho));

  return {
    settled: s.settled,
    lua: lua ? { tex: lua.texture?.key, depth: lua.depth, alpha: +lua.alpha.toFixed(2) } : null,
    montanhas,
    montanhaDepthMin,
    titulo: texto('ALIENWORLD'),
    subtitulo: texto('REMASTERED'),
    cta: texto('ENTER'),
    opcoes: [texto('[1]'), texto('[2]'), texto('[3]')].map((t) => t ?? null),
    // No repouso a criatura já passou: NÃO deve haver sprite da travessia na cena.
    temLeviatan: filhos.some(
      (c) => c.type === 'Sprite' && c.texture?.key === 'leviathanSwimSheet',
    ),
    // ...e o EMBLEMA já SURGIU (o beat de recompensa depois que o Leviatã some).
    logo: (() => {
      const lg = filhos.find((c) => c.type === 'Sprite' && c.texture?.key === 'menuLogoSheet');
      return lg ? { alpha: +lg.alpha.toFixed(2), anim: lg.anims?.currentAnim?.key ?? null } : null;
    })(),
  };
});

console.log(JSON.stringify(estado, null, 1));

ok(estado.settled === true, 'o menu chegou ao estado montado (settled)');
ok(!!estado.lua, `a lua do diorama está na cena (${estado.lua?.tex})`);
ok(estado.montanhas >= 4, `as bandas de montanha do diorama estão na cena (${estado.montanhas} ≥ 4)`);
// A lua fica ATRÁS das montanhas (o horizonte próximo passa à frente dela) e é OPACA.
ok(
  estado.lua != null && estado.montanhaDepthMin != null && estado.lua.depth < estado.montanhaDepthMin,
  `a lua está ATRÁS das montanhas (depth ${estado.lua?.depth} < ${estado.montanhaDepthMin})`,
);
ok(estado.lua?.alpha === 1, `a lua é OPACA (alpha ${estado.lua?.alpha})`);
ok(!!estado.titulo, 'o título ALIEN WORLD existe');
ok(estado.titulo && estado.titulo.alpha >= 0.8, `o título está VISÍVEL (alpha ${estado.titulo?.alpha})`);
ok(estado.titulo && estado.titulo.tamanho >= 20, `o título tem tratamento de TÍTULO (${estado.titulo?.tamanho}px ≥ 20)`);
ok(!!estado.subtitulo, 'o subtítulo REMASTERED existe');
ok(!!estado.cta, 'o CTA "ENTER · COMEÇAR" existe');
ok(estado.opcoes.every((o) => o !== null), 'as TRÊS conduções estão no menu ([1] [2] [3])');
ok(estado.opcoes.every((o) => o && o.y > 148), `as opções estão no terço de baixo (y: ${estado.opcoes.map((o) => o?.y)})`);
ok(estado.temLeviatan === false, 'no repouso o Leviatã já passou (sem criatura na cena)');
ok(!!estado.logo, 'o EMBLEMA surgiu no repouso (depois que o Leviatã sumiu)');
ok(estado.logo && estado.logo.alpha >= 0.9, `o emblema está VISÍVEL (alpha ${estado.logo?.alpha})`);

// ─── Reduced-motion: a cena tem que montar DIRETO e SEM partículas ───
const page2 = await browser.newPage();
await page2.emulateMedia({ reducedMotion: 'reduce' });
await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page2.waitForTimeout(800); // sem cinemática, monta quase na hora
const rm = await page2.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const particulas = s.children.list.filter((c) => c.type === 'ParticleEmitter').length;
  return { settled: s.settled, particulas };
});
ok(rm.settled === true, `reduced-motion monta DIRETO (settled=${rm.settled})`);
ok(rm.particulas === 0, `reduced-motion NÃO cria partículas (${rm.particulas})`);
await page2.close();

console.log('screenshot: probe-menu.png');
console.log(falhas === 0 ? '\n✔ MENU DE PONTA A PONTA' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
