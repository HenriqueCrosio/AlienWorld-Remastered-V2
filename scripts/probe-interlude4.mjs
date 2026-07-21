// A CUTSCENE FINAL (Interlude4): a fuga para TRÁS → a ruptura → o Leviatã morrendo e
// PARTINDO → a lua crescendo → a CHUVA DE METEOROS sobre a colônia morta → a nave contra
// a lua → GameOver com a vitória da fase 4.
//
// O que só se vê rodando: se a nave voa para a ESQUERDA no beat 1 (a única cena da campanha),
// se o entulho cai e FICA atrás dela, se o corte da ruptura limpa o interior, se a partição
// separa as metades ENQUANTO o conjunto encolhe (o setApproach invertido), se a chuva tem
// ritmo (poucos → muitos) e se a cena termina na tela de vitória CERTA (fase 4 + o crédito).
//
// ⚠️ A cena NÃO tem tecla de pular (a lição mais cara do HANDOFF): a sonda espera a timeline
// real (~42s de CENA). Não acelere o relógio — beat visual se revisa com OLHO, nos screenshots.
//
// ⚠️ SONDA POR ESTADO, NÃO POR RELÓGIO. A versão anterior dormia sleeps fixos e amostrava —
// sob swiftshader carregado (a sheet 144² do Leviatã-baleia pesa) o relógio da CENA anda mais
// devagar que o da parede, e cada amostra caía um beat ANTES do esperado: 18 falsos negativos
// numa cena saudável (a armadilha 22 outra vez: sonda que não alcança a condição "confirma" o
// bug). Agora cada trecho ESPERA o estado que vai assertar (poll com timeout generoso) — o
// assert continua estrito; só a espera é elástica.
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
    return {
      cena: s.scene.key,
      beat: s.beat,
      nave: {
        x: Math.round(s.ship.x),
        y: Math.round(s.ship.y),
        id: s.naveId,
        flipX: s.ship.flipX,
      },
      entulho: s.entulho.length,
      cenario: s.cenario.length,
      leviatan: s.leviatan
        ? {
            tipo: s.leviatan.type,
            tex: s.leviatan.texture?.key ?? null,
            escala: +s.leviatan.scaleX.toFixed(2),
            // O beat 3 agora é ANIMADO (a sheet em pingpong): a sonda prova que a animação
            // está TOCANDO — textura da sheet + anim corrente + o quadro avançando.
            anim: s.leviatan.anims?.currentAnim?.key ?? null,
            tocando: s.leviatan.anims?.isPlaying ?? null,
            quadro: s.leviatan.anims?.currentFrame?.index ?? null,
          }
        : null,
      partido: s.partido,
      metades: s.metadeEsq ? { esq: Math.round(s.metadeEsq.x), dir: Math.round(s.metadeDir.x) } : null,
      lua: s.lua ? { alpha: +s.lua.alpha.toFixed(2), escala: +s.lua.scaleX.toFixed(2) } : null,
      meteoros: s.meteoros,
      impactos: s.impactos,
    };
  });

/** Espera a cena chegar no estado que o trecho vai assertar. Devolve a última amostra. */
const espera = async (rotulo, predicado, timeoutMs = 25000) => {
  const t0 = Date.now();
  let e = await estado();
  while (!predicado(e) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(300);
    e = await estado();
  }
  console.log(rotulo, JSON.stringify(e));
  return e;
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F'); // atalho dev: direto na CUTSCENE FINAL
await page.waitForTimeout(1200);

const t0 = Date.now();

// ─── BEAT 1 — DE DENTRO: a fuga para a ESQUERDA, o interior desabando atrás ───
const entrada = await espera('entrada  ', (e) => e.cena === 'Interlude4', 8000);
ok(entrada.cena === 'Interlude4', `a cena é a Interlude4 (${entrada.cena})`);
// ⚠️ Não se lê `ship.texture.key`: com a anim de propulsão tocando, a chave é o QUADRO atual
// (shipAnim0..6), não a textura base — a mesma razão da armadilha 26. O que se compara é o id.
ok(entrada.nave?.id === 'alien', `a nave é a escolhida no hangar (id=${entrada.nave?.id})`);
ok(entrada.nave?.flipX === true, 'a nave voa para TRÁS (flipX — declaração de design)');

const fuga = await espera('fuga     ', (e) => (e.entulho ?? 0) >= 4 && (e.nave?.x ?? 999) < 330, 15000);
ok(fuga.nave && fuga.nave.x < 330, `a nave está fugindo para a esquerda (x=${fuga.nave?.x})`);
ok(fuga.entulho >= 4, `o interior desaba ATRÁS dela (${fuga.entulho} peças de entulho caídas)`);
await page.screenshot({ path: 'probe-interlude4-beat1.png' });

// ─── BEAT 2/3 — a RUPTURA e o AFASTAMENTO: o Leviatã morrendo grande na tela ───
const fora = await espera('fora     ', (e) => e.beat === 3, 20000);
ok(fora.beat === 3, `a ruptura aconteceu (beat=${fora.beat})`);
ok(fora.cenario === 0 && fora.entulho === 0, 'o corte limpou o interior (cenário e entulho destruídos)');
// O beat 3 trocou o sprite ESTÁTICO (`leviathanWhaleDying`) pela SHEET ANIMADA — e a sonda cobra
// as duas coisas: a textura certa E a animação viva (uma sheet parada seria o adesivo de antes).
ok(
  fora.leviatan?.tex === 'leviathanWhaleDyingSheet',
  `o Leviatã MORRENDO é a sheet animada (tex=${fora.leviatan?.tex})`,
);
ok(
  fora.leviatan?.anim === 'leviathan-dying' && fora.leviatan?.tocando === true,
  `a animação está TOCANDO (anim=${fora.leviatan?.anim}, tocando=${fora.leviatan?.tocando})`,
);
ok(fora.nave?.flipX === false, 'lá fora a nave aponta para casa (sem flipX)');

// O quadro tem que AVANÇAR: amostra ~1s depois, a animação (8fps, pingpong de 2s) está
// obrigatoriamente em outro quadro — um pingpong congelado falharia aqui.
await page.waitForTimeout(1100);
const fora2 = await estado();
console.log('fora+1s  ', JSON.stringify(fora2));
ok(
  fora2.leviatan?.quadro !== null && fora2.leviatan?.quadro !== fora.leviatan?.quadro,
  `o quadro da animação AVANÇA (${fora.leviatan?.quadro} → ${fora2.leviatan?.quadro})`,
);
await page.screenshot({ path: 'probe-interlude4-beat3.png' });

// ─── A PARTIÇÃO: o bicho rasga em dois, e o conjunto ENCOLHE (setApproach invertido) ───
const partido = await espera('partição ', (e) => e.partido === true, 20000);
ok(partido.partido === true, 'a PARTIÇÃO aconteceu');
ok(partido.leviatan?.tipo === 'Container', 'as metades viraram um container de recortes');
const metades = await espera('metades  ', (e) => e.metades && e.metades.esq < -2 && e.metades.dir > 2, 12000);
ok(
  metades.metades && metades.metades.esq < -2 && metades.metades.dir > 2,
  `as metades se afastam com rotação oposta (esq=${metades.metades?.esq}, dir=${metades.metades?.dir})`,
);
ok(
  metades.leviatan && metades.leviatan.escala < 1.8,
  `o conjunto ENCOLHE — o afastamento é a inversão do setApproach (escala=${metades.leviatan?.escala})`,
);
await page.screenshot({ path: 'probe-interlude4-beat3b.png' });

// ─── BEAT 4 — O RETORNO: a lua de Kepler cresce na tela ───
const retorno = await espera('retorno  ', (e) => e.lua && e.lua.alpha > 0.3 && e.lua.escala > 0.85, 15000);
ok(retorno.lua && retorno.lua.alpha > 0.3, `a lua apareceu (alpha=${retorno.lua?.alpha})`);
ok(retorno.lua && retorno.lua.escala > 0.8, `a lua CRESCE — o círculo fecha (escala=${retorno.lua?.escala})`);
await page.screenshot({ path: 'probe-interlude4-beat4.png' });

// ─── BEAT 5 — A CHUVA DE METEOROS: primeiro poucos, depois muitos ───
const chuva1 = await espera('chuva 1  ', (e) => e.beat === 5 && (e.meteoros ?? 0) >= 4, 20000);
ok(chuva1.beat === 5, `a chuva começou (beat=${chuva1.beat})`);
ok(chuva1.meteoros >= 4 && chuva1.meteoros <= 14, `o ritmo abre com POUCOS (${chuva1.meteoros} meteoros)`);
await page.screenshot({ path: 'probe-interlude4-beat5a.png' });

const chuva2 = await espera('chuva 2  ', (e) => (e.meteoros ?? 0) >= 24, 25000);
ok(chuva2.meteoros >= 24, `depois MUITOS (${chuva2.meteoros} meteoros)`);
ok(chuva2.impactos >= 4, `os fragmentos caem SOBRE a lua (${chuva2.impactos} impactos)`);
await page.screenshot({ path: 'probe-interlude4-beat5b.png' });

// ─── BEAT 6 — A NAVE CONTRA A LUA ───
const final = await espera('quadro   ', (e) => e.beat === 6, 25000);
ok(final.beat === 6, `o último quadro (beat=${final.beat})`);
await page.screenshot({ path: 'probe-interlude4-beat6.png' });

// ─── O fim: a tela de vitória da FASE 4, com o crédito ───
const fimEstado = await espera('fim      ', (e) => e.cena === 'GameOver', 30000);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const textos = s?.children.list.filter((c) => c.type === 'Text').map((c) => c.text) ?? [];
  return { cena: s?.scene.key, textos };
});
const duracao = ((Date.now() - t0) / 1000).toFixed(1);
ok(fim.cena === 'GameOver', `a cutscene final fecha na tela de vitória (cena=${fim.cena})`);
ok(
  fim.textos.some((t) => t.includes('FASE 4 COMPLETA')),
  'a vitória é a da FASE 4 (o título não mente)',
);
ok(
  fim.textos.some((t) => t.includes('UM JOGO DE HENRIQUE CROSIO')),
  'o crédito do autor está no rodapé',
);
// A duração de PAREDE varia com a carga do swiftshader — o contrato é a timeline de CENA
// (~41.8s), que os asserts por estado acima já cobraram. Isto é telemetria, não assert.
console.log(`duração de parede: ~${duracao}s (timeline de cena: ~41.8s)`);

console.log(falhas === 0 ? '\n✔ CUTSCENE FINAL DE PONTA A PONTA' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
