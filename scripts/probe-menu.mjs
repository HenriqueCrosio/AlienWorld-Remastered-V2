// Sonda do MENU "O DESPERTAR": o diorama vivo montado (estado de REPOUSO).
//
// O que ela prova: o fundo está na cena (placa `menuBg` OU o fallback de parallax), o TÍTULO
// existe e é grande (≥20px) e visível (alpha ≥0.8), o subtítulo, o CTA e as TRÊS conduções
// estão lá no terço de baixo, e o menu chegou ao estado montado (settled) — nada preso no meio
// de um fade. Fotografa parada: a primeira impressão se mede em repouso.
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
// A cinemática dura ~3–4s. Esperar folgado: fotografar no meio mede o fade, não o menu.
await page.waitForTimeout(5000);
await page.screenshot({ path: 'probe-menu.png' });

const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const filhos = s.children.list;

  const fundoPlaca = filhos.find((c) => c.type === 'Image' && c.texture?.key === 'menuBg');
  const temFallback = !!s.parallax; // o campo público do fallback

  const textos = filhos.filter((c) => c.type === 'Text').map((c) => ({
    valor: c.text,
    alpha: +c.alpha.toFixed(2),
    y: Math.round(c.y),
    tamanho: parseInt(c.style.fontSize, 10),
  }));
  const texto = (trecho) => textos.find((t) => t.valor.replace(/ /g, '').includes(trecho));

  return {
    settled: s.settled,
    fundo: fundoPlaca ? 'placa' : temFallback ? 'fallback' : null,
    titulo: texto('ALIENWORLD'),
    subtitulo: texto('REMASTERED'),
    cta: texto('ENTER'),
    opcoes: [texto('[1]'), texto('[2]'), texto('[3]')].map((t) => t ?? null),
  };
});

console.log(JSON.stringify(estado, null, 1));

ok(estado.settled === true, 'o menu chegou ao estado montado (settled)');
ok(estado.fundo !== null, `há um fundo na cena (${estado.fundo})`);
ok(!!estado.titulo, 'o título ALIEN WORLD existe');
ok(estado.titulo && estado.titulo.alpha >= 0.8, `o título está VISÍVEL (alpha ${estado.titulo?.alpha})`);
ok(estado.titulo && estado.titulo.tamanho >= 20, `o título tem tratamento de TÍTULO (${estado.titulo?.tamanho}px ≥ 20)`);
ok(!!estado.subtitulo, 'o subtítulo REMASTERED existe');
ok(!!estado.cta, 'o CTA "ENTER · COMEÇAR" existe');
ok(estado.opcoes.every((o) => o !== null), 'as TRÊS conduções estão no menu ([1] [2] [3])');
ok(estado.opcoes.every((o) => o && o.y > 148), `as opções estão no terço de baixo (y: ${estado.opcoes.map((o) => o?.y)})`);

console.log('screenshot: probe-menu.png');
console.log(falhas === 0 ? '\n✔ MENU DE PONTA A PONTA' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
