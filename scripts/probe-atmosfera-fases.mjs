// A FATIA 9 (spec 2026-09-26-fatia9-atmosfera-fases-design.md): a Atmosfera nas fases. Em cada fase, pelo atalho de
// dev: a Atmosfera ligada, o perfil DA PINTURA NA TELA, a HUD na câmera limpa; na F1, a saída para o zero-G troca o
// tom; na F2, um flash quente apaga o halo; na F4, o tom acompanha as câmaras A → D. A nave fica INVULNERÁVEL.
//
//   npm run dev  noutro terminal, depois  node scripts/probe-atmosfera-fases.mjs   (~2,5 min: a F4 é longa)
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};
const NOME = {
  paintBgF1: 'faseF1', paintBgZeroG: 'faseZeroG', paintBgF2: 'faseF2', paintBgF3: 'faseF3',
  paintBgF4a: 'faseF4a', paintBgF4b: 'faseF4b', paintBgF4c: 'faseF4c', paintBgF4d: 'faseF4d',
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return { cena: s?.scene.key ?? '?' };
    s.invulnerableUntil = 1e12;
    s.lives = 9;
    // A CÂMARA B (F4): o roteiro só solta o relógio da fase (`golfinhoSeguraEm`) quando o golfinho morre — a
    // sonda não sabe jogar, então o abate assim que ele fica vulnerável (mesmo cheat de `probe-stage4.mjs`).
    if (s.golfinho?.vulneravel) s.golfinho.damage(9999);
    const main = s.cameras.main;
    const limpa = s.cameras.getCamera('limpa');
    const hud = s.children.list.filter((o) => o.depth >= 99);
    return {
      cena: 'Game',
      pintura: s.parallax.pinturaNaTela(),
      atm: s.atm?.estado() ?? null,
      hudLimpa: !!limpa && hud.length > 0 && hud.every((o) => (o.cameraFilter & main.id) !== 0 && (o.cameraFilter & limpa.id) === 0),
      nHud: hud.length,
    };
  });
const espera = async (predicado, timeoutMs) => {
  const t0 = Date.now();
  let e = await estado();
  while (!predicado(e) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(250);
    e = await estado();
  }
  return e;
};
const abrir = async (tecla) => {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.keyboard.press(tecla);
  return espera((e) => e.cena === 'Game' && e.atm?.perfil, 10000);
};
const conferir = (rotulo, e) => {
  console.log(rotulo, JSON.stringify(e));
  ok(e.atm?.ativo === true, `${rotulo}: a Atmosfera está ligada`);
  ok(e.atm?.perfil === NOME[e.pintura], `${rotulo}: o perfil é o da pintura na tela (${e.pintura} → ${e.atm?.perfil})`);
  ok(e.hudLimpa, `${rotulo}: a HUD fica FORA do tratamento (${e.nHud} objetos)`);
};

// ─── F1 e a saída para o zero-G ───
const f1 = await abrir('Enter');
conferir('F1   ', f1);
ok(f1.pintura === 'paintBgF1', `a F1 abre na pintura da colônia (${f1.pintura})`);
await page.evaluate(() => window.__game.scene.getScenes(true)[0].parallax.breakAtmosphere());
const zg = await espera((e) => e.atm?.perfil === 'faseZeroG', 3000);
ok(zg.pintura === 'paintBgZeroG' && zg.atm?.perfil === 'faseZeroG', `rompida a atmosfera, o tom vira o do zero-G (${zg.pintura} → ${zg.atm?.perfil})`);

// ─── F2 e o flash quente ───
const f2 = await abrir('V');
conferir('F2   ', f2);
const flash = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  s.cameras.main.flash(600, 255, 150, 80);
  await new Promise((r) => setTimeout(r, 120));
  return s.atm.estado().flash;
});
ok(flash > 0.3, `durante um flash quente o halo cede (flash=${flash})`);
const depois = await espera((e) => (e.atm?.flash ?? 1) === 0, 3000);
ok(depois.atm?.flash === 0, `passado o flash, o halo volta (flash=${depois.atm?.flash})`);

// ─── F3 ───
conferir('F3   ', await abrir('M'));

// ─── F4: as câmaras A → D ───
const f4 = await abrir('L');
conferir('F4 A ', f4);
ok(f4.pintura === 'paintBgF4a', `a F4 abre na câmara A (${f4.pintura})`);
const vistas = new Set([f4.atm?.perfil]);
const t0 = Date.now();
let e4 = f4;
while (e4.pintura !== 'paintBgF4d' && Date.now() - t0 < 140000) {
  await page.waitForTimeout(1000);
  e4 = await estado();
  if (e4.atm?.perfil) vistas.add(e4.atm.perfil);
}
conferir('F4 D ', e4);
ok(['faseF4a', 'faseF4b', 'faseF4c', 'faseF4d'].every((n) => vistas.has(n)), `o tom passou pelas quatro câmaras (${[...vistas].join(' → ')})`);

// ─── A TRIAGEM SOBREVIVE AO GAME OVER (achado do review, 26/09) ───
//
// `triar()` rodava dentro de `Atmosfera.update`, chamada só pelo `update()` da cena — e o
// `update()` da cena RETORNA CEDO depois do game over (`if (this.over) return`). Um objeto
// nascido nos ~900ms entre a morte e a tela de fim (a explosão da nave) nunca era triado e
// ficava com `cameraFilter = 0`: as DUAS câmeras o desenhavam, a cópia limpa por cima. Agora a
// triagem roda em `PRE_RENDER`, que dispara todo quadro independente do `update()` da cena.
//
// ⚠️ ESTE BLOCO NÃO USA `estado()` — ele força `lives = 9` a cada chamada (é o que deixa a nave
// invulnerável pelo resto da sonda) e apagaria o game over antes de ele acontecer.
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
const cenaCarregada = async () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s && s.scene.key === 'Game' ? { pronta: true } : { pronta: false };
  });
{
  const t0 = Date.now();
  let c = await cenaCarregada();
  while (!c.pronta && Date.now() - t0 < 10000) {
    await page.waitForTimeout(200);
    c = await cenaCarregada();
  }
  ok(c.pronta, 'game over: a Fase 1 carregou (sem forçar vidas/invulnerabilidade)');
}

// ─── `suspender()`: o próximo quadro sai sem tratamento (achado do review, 26/09) ───
//
// Roda AQUI, na cena recém-carregada — antes do teste de game over abaixo, que precisa da janela
// de ~900ms inteira livre para poder ler o `children.list` sem correr contra a troca de cena.
const susp = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return null;
  s.atm.suspender();
  return s.atm.estado();
});
ok(susp !== null, 'suspender(): a cena Game está viva');
ok(susp?.suspenso === true, `suspender(): estado().suspenso vira true (${susp?.suspenso})`);
ok(
  susp?.perfil === null && susp?.densidade === 0 && susp?.grao === 0,
  `suspender(): o pipeline lê sem perfil (perfil=${susp?.perfil}, densidade=${susp?.densidade}, grao=${susp?.grao})`,
);

// Recarrega limpo para o teste de game over: a suspensão acima não pode vazar para ele (e um
// `atm.perfil()` novo não desliga `suspenso` — ver o comentário de `Atmosfera.suspender`).
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
{
  const t0 = Date.now();
  let c = await cenaCarregada();
  while (!c.pronta && Date.now() - t0 < 10000) {
    await page.waitForTimeout(200);
    c = await cenaCarregada();
  }
  ok(c.pronta, 'game over: a Fase 1 recarregou para o teste seguinte');
}

// ⚠️ O `damageShip()` E O PRIMEIRO `requestAnimationFrame` FICAM NO MESMO `evaluate`: a explosão da
// morte (`Fx.explode`, um sprite NOVO) nasce sem triagem nenhuma — como qualquer objeto criado no
// meio de um quadro — e só ganha `cameraFilter` correto no PRÓXIMO `PRE_RENDER`. Isso é a folga de
// UM quadro que o próprio evento do Phaser garante (não é o defeito: o defeito era a triagem NUNCA
// mais rodar depois do game over). A sonda cobra o que a correção promete — que a folga não passa de
// um quadro — então espera esse quadro entregar antes de começar a amostrar.
await page.evaluate(
  () =>
    new Promise((resolve) => {
      const s = window.__game.scene.getScenes(true)[0];
      s.lives = 1;
      s.invulnerableUntil = 0;
      s.damageShip();
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }),
);

let piorAmostra = null;
let amostras = 0;
const t0go = Date.now();
while (Date.now() - t0go < 750) {
  const amostra = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const limpa = s.cameras.getCamera('limpa');
    if (!limpa) return { checavel: false };
    const ruins = s.children.list.filter(
      (o) => o.depth < 99 && (o.cameraFilter & limpa.id) === 0,
    );
    return { checavel: true, over: s.over, n: s.children.list.length, ruins: ruins.length };
  });
  amostras++;
  if (amostra.checavel && amostra.ruins > 0) {
    piorAmostra = amostra;
    break;
  }
  await page.waitForTimeout(50);
}
ok(
  piorAmostra === null,
  `game over: todo objeto com depth < 99 fica excluído da câmera limpa durante os ~900ms (${amostras} amostras, pior=${JSON.stringify(piorAmostra)})`,
);

console.log(falhas === 0 ? '\n✔ A ATMOSFERA NAS FASES' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
