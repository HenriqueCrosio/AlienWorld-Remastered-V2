// Sonda do MENU: a tela-título sobre a KEY ART (o passe visual do menu, 2026-07-20).
//
// O que ela prova: a key art está na cena como fundo (imagem `menuKeyart` na resolução
// cheia do jogo), o TÍTULO existe e terminou o fade-in (alpha 1 — texto invisível é menu
// quebrado), o CTA e as TRÊS conduções estão lá, e as estrelas de cintilação nasceram.
// Não entra no jogo: a primeira impressão é medida parada.
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
// Os fades da abertura levam ~1.5s (arte 1s + título atrasado 0.3+0.6s). Esperar o DOBRO:
// sonda que fotografa no meio de um fade mede o fade, não o menu (armadilha 21).
await page.waitForTimeout(3000);
await page.screenshot({ path: 'probe-menu.png' });

const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const filhos = s.children.list;

  const arte = filhos.find((c) => c.type === 'Image' && c.texture?.key === 'menuKeyart');
  const textos = filhos.filter((c) => c.type === 'Text').map((c) => ({
    valor: c.text,
    alpha: +c.alpha.toFixed(2),
    y: Math.round(c.y),
    tamanho: parseInt(c.style.fontSize, 10),
  }));
  // As estrelas de cintilação são retângulos 1×1 em depth 1 (a faixa das opções é 68px de
  // altura em depth 5 — não confundir).
  const estrelas = filhos.filter((c) => c.type === 'Rectangle' && c.depth === 1).length;

  const texto = (trecho) => textos.find((t) => t.valor.replace(/ /g, '').includes(trecho));
  return {
    arte: arte
      ? { w: arte.width, h: arte.height, alpha: +arte.alpha.toFixed(2), depth: arte.depth }
      : null,
    titulo: texto('ALIENWORLD'),
    subtitulo: texto('REMASTERED'),
    cta: texto('ENTER'),
    opcoes: [texto('[1]'), texto('[2]'), texto('[3]')].map((t) => t ?? null),
    estrelas,
  };
});

console.log(JSON.stringify(estado, null, 1));

ok(!!estado.arte, 'a KEY ART está na cena');
ok(
  estado.arte?.w === 384 && estado.arte?.h === 216,
  `a arte cobre a tela inteira (${estado.arte?.w}×${estado.arte?.h})`,
);
ok(estado.arte?.alpha === 1, `o fade-in da arte TERMINOU (alpha ${estado.arte?.alpha})`);
ok(!!estado.titulo, 'o título ALIEN WORLD existe');
// O título PULSA (0.82↔1) depois do fade-in: qualquer alpha ≥ 0.8 prova que o fade
// terminou E que a amostra caiu dentro do pulso — abaixo disso o fade não completou.
ok(estado.titulo && estado.titulo.alpha >= 0.8, `o título está VISÍVEL após o fade (alpha ${estado.titulo?.alpha})`);
ok(
  estado.titulo && estado.titulo.tamanho >= 17,
  `o título tem tratamento de TÍTULO (${estado.titulo?.tamanho}px ≥ 17px)`,
);
ok(!!estado.subtitulo, 'o subtítulo REMASTERED existe');
ok(!!estado.cta, 'o CTA "ENTER · COMEÇAR" existe');
ok(
  estado.opcoes.every((o) => o !== null),
  'as TRÊS conduções estão no menu ([1] [2] [3])',
);
ok(
  estado.opcoes.every((o) => o && o.y > 148),
  `as opções estão no terço de baixo, sobre a faixa (y: ${estado.opcoes.map((o) => o?.y)})`,
);
ok(estado.estrelas >= 10, `as estrelas de cintilação nasceram (${estado.estrelas} ≥ 10)`);

console.log('screenshot: probe-menu.png');
console.log(falhas === 0 ? '\n✔ MENU DE PONTA A PONTA' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
