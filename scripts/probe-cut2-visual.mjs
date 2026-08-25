// A FATIA 4 — a apresentação da doca do cinturão. Entra pelo atalho [O] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (k) =>
      s.children.list.find((o) => o.texture && o.texture.key === k) ?? null;
    const ceu = acha('paintBgCut2');
    return {
      cena: s.scene.key,
      ceu: ceu ? { x: Math.round(ceu.x), y: Math.round(ceu.y), d: ceu.depth } : null,
      temParallaxPixel: !!s.parallax,
      doca: (() => {
        const d = acha('docaCinturao');
        return d ? { x: Math.round(d.x), y: Math.round(d.y), s: d.scaleX } : null;
      })(),
      luaPartida: acha('planetShattered') !== null,
      cordilheira: s.plataforma === undefined ? 'removida' : s.plataforma.length,
      amarras: s.amarras.map((a) => ({ x: Math.round(a.ancoraX), y: Math.round(a.ancoraY) })),
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(2500);

const e = await estado();
console.log('estado', JSON.stringify(e));

ok(e.cena === 'Interlude2', 'está na Interlude2');
ok(e.ceu !== null, 'a PINTURA do cinturão está na cena');
ok(e.ceu !== null && e.ceu.d === -110, 'a pintura está no depth -110 (atrás do starfield)');
ok(e.temParallaxPixel === false, 'o parallax pixel foi APOSENTADO (a pintura o substituiu)');
ok(e.doca !== null, 'a DOCA NOVA está na cena');
ok(e.doca !== null && Number.isInteger(e.doca.s), 'a doca está em escala INTEIRA');
ok(e.cordilheira === 'removida', 'o chão falso foi APAGADO (a doca flutua)');
ok(e.luaPartida === false, 'a lua partida (planetShattered) NÃO está na cena — três luas viraram duas');

// AS ÂNCORAS DOS CABOS: as três não podem se amontoar num só ponto — isso é o defeito medido no
// passe de correção original (18px de largura de doca, um cluster no terço esquerdo). O vão entre
// a mais à esquerda e a mais à direita tem que ser uma fração real da largura da doca (256px hoje,
// arte inteira), não um punhado de pixels. 100px é bem menos que os ~118px que a geometria atual
// entrega, mas é bem mais que os 18px do defeito — se alguém reintroduzir o cluster, isto acusa.
const xsAncora = e.amarras.map((a) => a.x);
const vaoAncoras = Math.max(...xsAncora) - Math.min(...xsAncora);
ok(vaoAncoras >= 100, `as âncoras dos cabos se espalham pela doca (vão=${vaoAncoras}px de 256px)`);

await page.screenshot({ path: 'probe-cut2-aproximacao.png' });

// A CENA É ESTÁTICA — "a imagem precisa estar estatica e a nave que chega" (Henrique). A doca
// costumava deslizar da direita e a pintura costumava derivar; as duas coisas foram cortadas.
// Sonda amostra a doca e a pintura duas vezes, a alguns segundos de distância, e reprova se
// QUALQUER uma das duas tiver andado um pixel — o assert é sobre estado real (x amostrado),
// não sobre print.
await page.waitForTimeout(2500);
const e2 = await estado();
console.log('estado+2.5s', JSON.stringify(e2));

ok(
  e.doca !== null && e2.doca !== null && e2.doca.x === e.doca.x,
  `a doca NÃO se move (x=${e.doca?.x} em t0, x=${e2.doca?.x} em t0+2.5s)`,
);
ok(
  e.ceu !== null && e2.ceu !== null && e2.ceu.x === e.ceu.x,
  `a pintura NÃO se move (x=${e.ceu?.x} em t0, x=${e2.ceu?.x} em t0+2.5s)`,
);

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
