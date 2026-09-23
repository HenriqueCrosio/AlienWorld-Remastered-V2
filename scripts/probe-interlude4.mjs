// A CUTSCENE FINAL REFEITA (Fatia 8, spec 2026-09-23): a câmara D convulsiona e rasga, a
// descompressão arranca a nave, o Leviatã ferido cai na lua, o sobrevoo espelha a Fase 1 e a luz
// dele se apaga. SONDA POR ESTADO (a lição de julho): cada trecho ESPERA o estado que vai assertar.
//
// ⚠️ Sem tecla de pular: a sonda espera a timeline real (~47s de CENA).
//
//   npm run dev  noutro terminal, depois  node scripts/probe-interlude4.mjs
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
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`[console:error] ${m.text()}`);
});

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Interlude4') return { cena: s?.scene.key ?? '?' };
    const tex = s.textures;
    return {
      cena: s.scene.key,
      ...s.estado,
      nave: { x: Math.round(s.ship.x), y: Math.round(s.ship.y), id: s.naveId, flipX: s.ship.flipX, visivel: s.ship.visible },
      baleias: ['leviathanWhale', 'leviathanWhaleDying', 'leviathanWhaleDyingSheet', 'leviathanWhaleSplit'].filter((k) => tex.exists(k)),
    };
  });

/** Espera a cena chegar no estado que o trecho vai assertar. Devolve a última amostra. */
const espera = async (rotulo, predicado, timeoutMs = 25000) => {
  const t0 = Date.now();
  let e = await estado();
  while (!predicado(e) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(250);
    e = await estado();
  }
  console.log(rotulo, JSON.stringify(e));
  return e;
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F'); // atalho dev: direto na CUTSCENE FINAL (sem costura: fundo = paintBgF4d)
await page.waitForTimeout(800);

// ─── CAPÍTULO 1 — CONVULSÃO: a câmara D, a nave onde o jogador parou ───
const c1 = await espera('cap 1    ', (e) => e.cena === 'Interlude4' && e.capitulo === 1, 8000);
ok(c1.cena === 'Interlude4', `a cena é a Interlude4 (${c1.cena})`);
ok(c1.capitulo === 1, `abre no capítulo 1 (capitulo=${c1.capitulo})`);
ok(c1.fundo === 'paintBgF4d', `pelo menu, o fundo é a pintura da câmara D (fundo=${c1.fundo})`);
ok(c1.nave?.id === 'alien', `a nave é a escolhida (id=${c1.nave?.id})`);
ok(c1.nave?.x === 120 && c1.nave?.y === 110, `a nave está na posição padrão do menu (${c1.nave?.x},${c1.nave?.y})`);
ok(c1.baleias?.length === 0, `nenhuma baleia errada carregada (${c1.baleias?.join(',')})`);
await page.screenshot({ path: 'probe-interlude4-cap1.png' });

// ─── [CAPÍTULOS 2–7 — cada tarefa do plano insere o seu bloco AQUI, em ordem] ───

// ─── O fim: a tela de vitória da FASE 4, com o crédito ───
await espera('fim      ', (e) => e.cena === 'GameOver', 70000);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const textos = s?.children.list.filter((c) => c.type === 'Text').map((c) => c.text) ?? [];
  return { cena: s?.scene.key, textos };
});
ok(fim.cena === 'GameOver', `a cutscene final fecha na tela de vitória (cena=${fim.cena})`);
ok(fim.textos.some((t) => t.includes('FASE 4 COMPLETA')), 'a vitória é a da FASE 4 (o título não mente)');
ok(fim.textos.some((t) => t.includes('UM JOGO DE HENRIQUE CROSIO')), 'o crédito do autor está no rodapé');

console.log(falhas === 0 ? '\n✔ CUTSCENE FINAL DE PONTA A PONTA' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
