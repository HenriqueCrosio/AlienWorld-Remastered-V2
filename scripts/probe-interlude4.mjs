// A CUTSCENE FINAL REFEITA (Fatia 8, spec 2026-09-23): a câmara D convulsiona e rasga, a
// descompressão arranca a nave, o Leviatã ferido cai na lua, o sobrevoo espelha a Fase 1 e a luz
// dele se apaga. SONDA POR ESTADO (a lição de julho): cada trecho ESPERA o estado que vai assertar.
//
// ⚠️ Sem tecla de pular: a sonda espera a timeline real (~42s de CENA — `src/scenes/final/tempos.ts`).
//
//   npm run dev  noutro terminal, depois  node scripts/probe-interlude4.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

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
      // ⚠️ A LIÇÃO DE 24/09: a sonda contava os quadros da pulsação enquanto a tela desenhava `__MISSING` (a folha
      // nem carregava). Contar quadro não prova arte na tela — isto prova.
      faltando: s.children.list.filter((o) => o.texture?.key === '__MISSING').length,
      baleias: ['leviathanWhale', 'leviathanWhaleDying', 'leviathanWhaleDyingSheet', 'leviathanWhaleSplit'].filter((k) => tex.exists(k)),
      // A ATMOSFERA (spec 2026-09-25): o perfil do capítulo e os números que a sonda cobra.
      atm: s.atm?.estado() ?? null,
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
// ±3 no y: a nave TREME no capítulo 1 (até 2px de amplitude) — a tolerância é o tremor, não folga.
ok(c1.nave?.x === 120 && Math.abs((c1.nave?.y ?? 0) - 110) <= 3, `a nave está na posição padrão do menu (${c1.nave?.x},${c1.nave?.y})`);
ok(c1.baleias?.length === 0, `nenhuma baleia errada carregada (${c1.baleias?.join(',')})`);
const c1b = await espera('cap 1 pulso', (e) => (e.rachadura ?? -1) >= 5, 8000);
ok(c1b.rachadura >= 5, `o núcleo PULSA (${c1b.rachadura} quadros avançados)`);
ok(c1b.faltando === 0, `toda a arte do capítulo 1 carregou (${c1b.faltando} texturas faltando)`);
ok(c1b.atm?.ativo === true, `a Atmosfera está ligada (ativo=${c1b.atm?.ativo})`);
ok(c1b.atm?.perfil === 'viscera', `dentro do corpo, o perfil é a víscera (${c1b.atm?.perfil})`);
ok((c1b.atm?.densidade ?? 0) >= 0.6, `a névoa é densa (${c1b.atm?.densidade})`);
await page.screenshot({ path: 'probe-interlude4-cap1.png' });

// ─── CAPÍTULO 2 — O ESTOURO: a parede arrebenta logo depois, e a música morre ───
const c2 = await espera('cap 2    ', (e) => e.capitulo === 2 && (e.rasgo ?? -1) >= 3, 6000);
ok(c2.capitulo === 2, `a parede estourou (capitulo=${c2.capitulo})`);
ok(c2.rasgo >= 3, `as bordas do rasgo se mexem (quadro=${c2.rasgo})`);
ok(c2.musicaCortada === true, 'a música MORRE no estouro');
ok(c2.faltando === 0, `toda a arte do estouro carregou (${c2.faltando} faltando)`);
ok(c2.atm?.perfil === 'viscera' && c2.atm.densidade >= 0.6, `o estouro segue na víscera (${c2.atm?.perfil}, ${c2.atm?.densidade})`);
await page.screenshot({ path: 'probe-interlude4-cap2.png' });

// ─── CAPÍTULO 3 — DESCOMPRESSÃO: tudo é sugado, a nave é arrancada girando ───
const c3 = await espera('cap 3    ', (e) => e.capitulo === 3, 6000);
ok(c3.capitulo === 3, `a descompressão começou (capitulo=${c3.capitulo})`);
await page.waitForTimeout(1500);
const c3b = await estado();
ok(c3b.nave.x > c3.nave.x, `a nave é PUXADA para o rasgo (x ${c3.nave.x} → ${c3b.nave.x})`);
ok(c3b.faltando === 0, `toda a arte da descompressão carregou (${c3b.faltando} faltando)`);
ok(c3b.atm?.perfil === 'visceraSuccao', `na descompressão, a névoa é arrancada para o rasgo (${c3b.atm?.perfil})`);
const c3c = await espera('cap 3 fim', (e) => e.naveSumiu === true, 5000);
ok(c3c.naveSumiu === true && c3c.nave.visivel === false, 'a nave SOME pela fenda antes do corte (não fica derivando)');
await page.screenshot({ path: 'probe-interlude4-cap3.png' });

// ─── CAPÍTULO 4 — A FERIDA: fora, o biomecânico aberto; a nave sai de dentro dele; a lua PARADA ───
const c4 = await espera('cap 4    ', (e) => e.capitulo === 4, 8000);
ok(c4.capitulo === 4, `o corte para fora (capitulo=${c4.capitulo})`);
await page.waitForTimeout(3000);
const c4b = await estado();
const escalas = [...new Set(c4b.escalasLua ?? [])];
ok(escalas.length === 1, `a lua NÃO muda de escala no plano (${escalas.join(',')})`);
ok(c4b.nave.visivel && c4b.nave.flipX === false, 'a nave está lá fora, apontando para a direita');
ok(c4b.faltando === 0, `toda a arte da ferida carregou (${c4b.faltando} faltando)`);
ok(c4b.atm?.perfil === 'vacuo' && c4b.atm.densidade >= 0.6, `fora, o vácuo — denso mesmo assim (${c4b.atm?.perfil}, ${c4b.atm?.densidade})`);
await page.screenshot({ path: 'probe-interlude4-cap4.png' });

// ─── CAPÍTULO 5 — A QUEDA: o corpo em brasa entra na lua, por corte; a nave fora do plano ───
const c5 = await espera('cap 5    ', (e) => e.capitulo === 5, 12000);
ok(c5.capitulo === 5, `o corte para a queda (capitulo=${c5.capitulo})`);
ok(c5.nave.visivel === false, 'na queda, a câmera está com o CORPO: a nave fora do plano');
ok(c5.faltando === 0, `toda a arte da queda carregou (${c5.faltando} faltando)`);
ok(c5.atm?.perfil === 'vacuoQueda' && c5.atm.densidade >= 0.6, `na queda, o vácuo mais frio (${c5.atm?.perfil}, ${c5.atm?.densidade})`);
const c5b = await espera('cap 5 imp', (e) => e.impacto === true, 8000);
ok(c5b.impacto === true, 'o corpo bate NA colônia, à vista (não atrás do horizonte)');
await page.screenshot({ path: 'probe-interlude4-cap5.png' });

// ─── CAPÍTULO 6 — O SOBREVOO: a colônia da F1 em ruínas, a nave voltando para a ESQUERDA ───
const c6 = await espera('cap 6    ', (e) => e.capitulo === 6, 12000);
ok(c6.capitulo === 6, `a colônia morta (capitulo=${c6.capitulo})`);
await page.waitForTimeout(2500);
const c6a = await estado();
await page.waitForTimeout(1500);
const c6b = await estado();
ok(c6b.nave.flipX === true && c6b.nave.visivel, 'a nave voa virada para a ESQUERDA (o caminho da F1 ao contrário)');
ok(c6b.nave.x < c6a.nave.x, `e anda para a esquerda (x ${c6a.nave.x} → ${c6b.nave.x})`);
ok(c6b.faltando === 0, `toda a arte do sobrevoo carregou (${c6b.faltando} faltando)`);
ok(c6b.atm?.perfil === 'superficie' && c6b.atm.densidade >= 0.6, `na superfície, névoa baixa (${c6b.atm?.perfil}, ${c6b.atm?.densidade})`);
const bannerLimpo = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const main = s.cameras.main;
  const limpa = s.cameras.getCamera('limpa');
  const textos = s.children.list.filter((o) => o.depth >= 100);
  return { n: textos.length, ok: !!limpa && textos.length > 0 && textos.every((o) => (o.cameraFilter & main.id) !== 0 && (o.cameraFilter & limpa.id) === 0) };
});
ok(bannerLimpo.ok, `o banner fica FORA do tratamento, na câmera limpa (${bannerLimpo.n} texto[s])`);
await page.screenshot({ path: 'probe-interlude4-cap6.png' });

// ─── CAPÍTULO 7 — A LUZ SE APAGA: a lava da carcaça esfria placa por placa até o breu ───
const c7 = await espera('cap 7    ', (e) => e.capitulo === 7, 15000);
ok(c7.capitulo === 7, `a câmera fica sobre a carcaça (capitulo=${c7.capitulo})`);
ok(c7.atm?.perfil === 'apagando', `no apagar, o perfil é o apagando (${c7.atm?.perfil})`);
const c7b = await espera('cap 7 fim', (e) => e.lavaCarcaca === 0, 8000);
ok(c7b.lavaCarcaca === 0, `a última luz se apagou (lavaCarcaca=${c7b.lavaCarcaca})`);
ok((c7b.atm?.gradeQuente ?? 1) < 0.5 && c7b.atm.densidade >= 0.6, `o âmbar esfriou e a névoa NÃO sumiu (gradeQuente=${c7b.atm?.gradeQuente}, densidade=${c7b.atm?.densidade})`);
await page.screenshot({ path: 'probe-interlude4-cap7.png' });

// ─── O FADE FINAL CHEGA AO PRETO (a correção de 25/09) ───
// ⚠️ A JANELA É CURTA: o fade dura só (T.FIM - T.FADE) e `terminar()` troca de cena assim que ele acaba — um
// poll do Node a cada 100ms de fora arrisca pular o instante. Por isso a espera roda DENTRO da página, quadro a
// quadro (`polling: 'raf'`, sem ida-e-volta), lendo `escuro` direto do pipeline (a lição de sempre: o estado, não
// o relógio) — e ele só CRESCE até a troca de cena, então o screenshot logo depois do resolve fica igual ou mais
// escuro, nunca mais claro.
let achouFadePreto = true;
try {
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScenes(true)[0];
      return s?.scene.key === 'Interlude4' && (s.atm?.pipeline?.escuro ?? 0) >= 0.95;
    },
    null,
    { timeout: 10000, polling: 'raf' },
  );
} catch {
  achouFadePreto = false;
}
ok(achouFadePreto, 'o fade final atinge escuro>=0,95 ainda na Interlude4 (a janela não passou batida)');
const fotoFade = await page.screenshot();
const { channels } = await sharp(fotoFade).greyscale().stats();
const luminancia = channels[0].mean;
ok(luminancia < 6, `o fade final chega ao PRETO (luminância média=${luminancia.toFixed(2)})`);

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
