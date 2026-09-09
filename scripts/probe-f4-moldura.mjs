// A SONDA DA MOLDURA (Fatia 7 · M1).
//
// O que só se vê rodando: se a linha do vão virou CURVA (placas vizinhas se relacionam) em vez de
// sorteio por batida, se a faixa existe e é DECORAÇÃO (sem corpo físico, escala 1), se a trava dos
// 8px segura, e se a espessura sobe ao longo da fase.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez: três browsers headless no mesmo Vite quebram.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:error] ${m.text()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

// A sonda não sabe jogar: vidas e invulnerabilidade para cima — testa-se a MOLDURA.
const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});
await blindar();

// ─── A CURVA: placas vizinhas se relacionam ───
//
// ⚠️ Amostra o vão na BOCA DE CENA (x = 414, onde o corredor nasce) e guarda só as MUDANÇAS. É a
// medida direta do defeito diagnosticado em `GameScene.ts:859`: hoje cada par sorteia um `vaoY`
// novo no alcance inteiro (saltos de até 38px); a curva anda no máximo `PASSO_MAX`.
const PASSO_MAX = 14;
const serie = [];
for (let i = 0; i < 120; i++) {
  await blindar();
  const v = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s && s.moldura ? Math.round(s.moldura.vaoEm(414)) : null;
  });
  if (v !== null && v !== serie[serie.length - 1]) serie.push(v);
  await page.waitForTimeout(200);
}
const saltos = serie.slice(1).map((v, i) => Math.abs(v - serie[i]));
const maior = saltos.length ? Math.max(...saltos) : 0;
console.log('curva    ', JSON.stringify({ degraus: serie.length, serie, maior }));
ok(serie.length >= 6, `a curva ANDOU ao longo da fase (${serie.length} degraus distintos)`);
ok(maior <= PASSO_MAX + 1, `o degrau nunca salta mais que ${PASSO_MAX}px (maior=${maior})`);

// ─── A FAIXA: ela existe, é DECORAÇÃO, e está em escala 1 ───
const faixa = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const pega = (nome) => s.children.list.filter((o) => o.name === nome);
  const chao = pega('faixaChao');
  const teto = pega('faixaTeto');
  const todos = [...chao, ...teto];
  return {
    chao: chao.length,
    teto: teto.length,
    comCorpo: todos.filter((o) => o.body).length,
    escalas: [...new Set(todos.flatMap((o) => [o.scaleX, o.scaleY]))],
    cobre: chao.length
      ? Math.min(...chao.map((o) => o.x)) <= 0 &&
        Math.max(...chao.map((o) => o.x)) + 128 >= 384
      : false,
  };
});
console.log('faixa    ', JSON.stringify(faixa));
ok(faixa.chao === 4, `a faixa do CHÃO tem os 4 segmentos (${faixa.chao})`);
ok(faixa.teto === 4, `a faixa do TETO tem os 4 segmentos (${faixa.teto})`);
// ⚠️ O assert mais importante desta sonda: a faixa é DECORAÇÃO. Um corpo físico aqui seria a
// física nova que a spec proibiu, e ele apareceria como morte invisível no meio do vão.
ok(faixa.comCorpo === 0, `a faixa NÃO tem corpo físico — é decoração (${faixa.comCorpo} com corpo)`);
ok(
  faixa.escalas.length === 1 && faixa.escalas[0] === 1,
  `a faixa é desenhada em escala 1 (${JSON.stringify(faixa.escalas)})`,
);
ok(faixa.cobre, 'os 4 segmentos cobrem a largura da tela sem buraco');

// ─── A TRAVA DOS 8px: a superfície nunca entra no corredor ───
//
// ⚠️ Mede a tela inteira, coluna a coluna, e durante um trecho longo — a trava só MORDE quando a
// espessura cresce, então uma amostra curta passaria sem testar nada.
let pior = Infinity;
let amostras = 0;
for (let i = 0; i < 60; i++) {
  await blindar();
  const f = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura || s.corredorRate <= 0) return null;
    const meio = s.corredorGap / 2;
    let min = Infinity;
    for (let x = 0; x <= 384; x += 10) {
      const v = s.moldura.vaoEm(x);
      min = Math.min(
        min,
        s.moldura.superficieChaoEm(x) - (v + meio),
        v - meio - s.moldura.superficieTetoEm(x),
      );
    }
    return min;
  });
  if (f !== null) {
    pior = Math.min(pior, f);
    amostras++;
  }
  await page.waitForTimeout(250);
}
console.log('trava    ', JSON.stringify({ folgaMinima: pior, amostras }));
// ⚠️ O `amostras` NÃO É ENFEITE. Sem ele o assert passa quando NUNCA MEDIU: `pior` fica em
// `Infinity` se toda iteração cair fora da janela de corredor, e `Infinity >= 8` é verdadeiro —
// o guard-rail que protege o vão ficaria verde justamente no caso em que perdeu a capacidade de
// testar. Um assert que não distingue "sempre teve folga" de "nunca olhou" não é um assert.
ok(
  amostras >= 10 && pior >= 8,
  `a superfície da faixa nunca entra no corredor (${amostras} amostras, folga mínima ${pior}px, mínimo 8)`,
);

console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
