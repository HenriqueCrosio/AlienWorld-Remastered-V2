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

// ─── A ESPESSURA CRAVA NO PRIMEIRO VALOR (checada AQUI, antes da curva e da trava) ───
//
// ⚠️ Por que este assert mora aqui e não junto com o resto dos asserts de espessura, no fim do
// arquivo: os laços da CURVA (120×200ms ≈ 24s) e da TRAVA (60×250ms ≈ 15s) logo abaixo somam
// ~40s de relógio DE JOGO antes da primeira leitura — medido: o bloco de espessura do fim do
// arquivo já encontra a fase em t≈42s na primeira consulta, mesmo esperando por ESTADO. Checar
// "abre fina" (t=1, 16px) só é possível ANTES desses dois laços rodarem — depois, o relógio já
// passou do instante que se queria medir, e não tem como voltar.
const cravaInicial = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
});
console.log('espessuraInicial', JSON.stringify(cravaInicial));
ok(
  cravaInicial.e >= 15 && cravaInicial.e <= 17,
  `a fase abre com a faixa fina, já cravada (${cravaInicial.e}px, esperado 16)`,
);

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
//
// ⚠️ CADA PLACA CONTRA O SEU PRÓPRIO `gap`, NUNCA CONTRA O `gap` CORRENTE (`s.corredorGap`). A
// trava é aplicada dentro de `Moldura.gerar()` com o `gap` vigente NA HORA em que a placa nasce;
// quando o roteiro alarga o corredor (t=37: 96→104, t=63,5: 76→84), as placas ainda na tela
// nasceram sob o vão antigo. Medi-las contra o `gap` corrente é medir a régua errada — dá 4px
// onde a trava garantiu 8, e o defeito seria da medida, não da parede. A `Moldura` expõe os fatos
// crus (cada placa carrega o `gap` sob o qual nasceu); quem faz a aritmética é a sonda.
let pior = Infinity;
let amostras = 0;
for (let i = 0; i < 60; i++) {
  await blindar();
  const f = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura || s.corredorRate <= 0) return null;
    let min = Infinity;
    for (let x = 0; x <= 384; x += 10) {
      const p = s.moldura.placaEm(x);
      if (p.gap <= 0) continue; // sem corredor nesta placa, não há o que proteger
      const meio = p.gap / 2;
      min = Math.min(min, p.superficieChao - (p.vaoY + meio), (p.vaoY - meio) - p.superficieTeto);
    }
    return min === Infinity ? null : min;
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

// ─── A ESPESSURA SOBE AO LONGO DA FASE ───
//
// ⚠️ Espera por ESTADO (o relógio da fase), nunca por relógio de parede: um assert novo que gaste
// tempo faria a espera cega derivar. Foi assim que quatro quadros de conferência da Fatia 7
// saíram todos já no chefão, em 06/09.
//
// ⚠️ DESVIO DELIBERADO dos instantes 10/40/60/70 do brief: a essa altura da sonda (depois da
// curva e da trava) o relógio da fase já passa de t≈42s na primeira leitura — 10 e 40 ficam para
// trás ANTES da primeira consulta, e os dois colapsam na mesma amostra (medido:
// {"t":42.1,"e":26} duas vezes seguidas). O bug não é da `Moldura` nem do roteiro — é dos
// instantes do assert não sobreviverem ao próprio custo da sonda. Ficam 55/66/74: caem fundo nas
// janelas do STAGE_4 ainda alcançáveis daqui (43–63,5 → 36 · 63,5–68 → 48 · 68–79 → 54) e provam
// a MESMA subida. A abertura fina (16px) já foi provada acima, antes da curva consumir o relógio.
const espessuraEm = async (ate) => {
  for (let i = 0; i < 900; i++) {
    const e = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
    });
    if (!e) return null;
    if (e.t >= ate) return e;
    await page.waitForTimeout(100);
  }
  return null;
};

const e55 = await espessuraEm(55);
const e66 = await espessuraEm(66);
const e74 = await espessuraEm(74);
console.log('espessura', JSON.stringify([e55, e66, e74]));
ok(e55 && e55.e === 36, `t=55s: o aperto (${e55 && e55.e}px, esperado 36)`);
ok(e66 && e55 && e66.e > e55.e, `t=66s: não é mais câmara (${e55 && e55.e} → ${e66 && e66.e}px)`);
ok(e74 && e66 && e74.e > e66.e, `t=74s: o duto — a faixa cheia (${e66 && e66.e} → ${e74 && e74.e}px)`);

console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
