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
// real (~42s). Não acelere o relógio — beat visual se revisa com OLHO, nos screenshots.
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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F'); // atalho dev: direto na CUTSCENE FINAL
await page.waitForTimeout(1200);

const t0 = Date.now();

// ─── BEAT 1 — DE DENTRO: a fuga para a ESQUERDA, o interior desabando atrás ───
const entrada = await estado();
console.log('entrada  ', JSON.stringify(entrada));
ok(entrada.cena === 'Interlude4', `a cena é a Interlude4 (${entrada.cena})`);
// ⚠️ Não se lê `ship.texture.key`: com a anim de propulsão tocando, a chave é o QUADRO atual
// (shipAnim0..6), não a textura base — a mesma razão da armadilha 26. O que se compara é o id.
ok(entrada.nave?.id === 'alien', `a nave é a escolhida no hangar (id=${entrada.nave?.id})`);
ok(entrada.nave?.flipX === true, 'a nave voa para TRÁS (flipX — declaração de design)');

await page.waitForTimeout(4400); // ~t=5.6s da cena
const fuga = await estado();
console.log('fuga     ', JSON.stringify(fuga));
ok(fuga.nave && fuga.nave.x < 330, `a nave está fugindo para a esquerda (x=${fuga.nave?.x})`);
ok(fuga.entulho >= 4, `o interior desaba ATRÁS dela (${fuga.entulho} peças de entulho caídas)`);
await page.screenshot({ path: 'probe-interlude4-beat1.png' });

// ─── BEAT 2/3 — a RUPTURA e o AFASTAMENTO: o Leviatã morrendo grande na tela ───
await page.waitForTimeout(3600); // ~t=9.2s
const fora = await estado();
console.log('fora     ', JSON.stringify(fora));
ok(fora.beat === 3, `a ruptura aconteceu (beat=${fora.beat})`);
ok(fora.cenario === 0 && fora.entulho === 0, 'o corte limpou o interior (cenário e entulho destruídos)');
// O beat 3 trocou o sprite ESTÁTICO (`leviathanDying`) pela SHEET ANIMADA — e a sonda cobra
// as duas coisas: a textura certa E a animação viva (uma sheet parada seria o adesivo de antes).
ok(
  fora.leviatan?.tex === 'leviathanDyingSheet',
  `o Leviatã MORRENDO é a sheet animada (tex=${fora.leviatan?.tex})`,
);
ok(
  fora.leviatan?.anim === 'leviathan-dying' && fora.leviatan?.tocando === true,
  `a animação está TOCANDO (anim=${fora.leviatan?.anim}, tocando=${fora.leviatan?.tocando})`,
);
ok(fora.nave?.flipX === false, 'lá fora a nave aponta para casa (sem flipX)');

// O quadro tem que AVANÇAR: amostra 1s depois, a animação (8fps, pingpong de 2s) está
// obrigatoriamente em outro quadro — um pingpong congelado falharia aqui.
await page.waitForTimeout(1000); // ~t=10.2s
const fora2 = await estado();
console.log('fora+1s  ', JSON.stringify(fora2));
ok(
  fora2.leviatan?.quadro !== null && fora2.leviatan?.quadro !== fora.leviatan?.quadro,
  `o quadro da animação AVANÇA (${fora.leviatan?.quadro} → ${fora2.leviatan?.quadro})`,
);

await page.waitForTimeout(1800); // ~t=12s
await page.screenshot({ path: 'probe-interlude4-beat3.png' });

// ─── A PARTIÇÃO: o bicho rasga em dois, e o conjunto ENCOLHE (setApproach invertido) ───
await page.waitForTimeout(5600); // ~t=17.6s
const partido = await estado();
console.log('partição ', JSON.stringify(partido));
ok(partido.partido === true, 'a PARTIÇÃO aconteceu');
ok(partido.leviatan?.tipo === 'Container', 'as metades viraram um container de recortes');
ok(
  partido.metades && partido.metades.esq < -2 && partido.metades.dir > 2,
  `as metades se afastam com rotação oposta (esq=${partido.metades?.esq}, dir=${partido.metades?.dir})`,
);
ok(
  partido.leviatan && partido.leviatan.escala < 2.55,
  `o conjunto ENCOLHE — o afastamento é a inversão do setApproach (escala=${partido.leviatan?.escala})`,
);
await page.screenshot({ path: 'probe-interlude4-beat3b.png' });

// ─── BEAT 4 — O RETORNO: a lua de Kepler cresce na tela ───
await page.waitForTimeout(4000); // ~t=21.6s
const retorno = await estado();
console.log('retorno  ', JSON.stringify(retorno));
ok(retorno.lua && retorno.lua.alpha > 0.3, `a lua apareceu (alpha=${retorno.lua?.alpha})`);
ok(retorno.lua && retorno.lua.escala > 0.8, `a lua CRESCE — o círculo fecha (escala=${retorno.lua?.escala})`);
await page.screenshot({ path: 'probe-interlude4-beat4.png' });

// ─── BEAT 5 — A CHUVA DE METEOROS: primeiro poucos, depois muitos ───
await page.waitForTimeout(5400); // ~t=27s
const chuva1 = await estado();
console.log('chuva 1  ', JSON.stringify(chuva1));
ok(chuva1.beat === 5, `a chuva começou (beat=${chuva1.beat})`);
ok(chuva1.meteoros >= 4 && chuva1.meteoros <= 14, `o ritmo abre com POUCOS (${chuva1.meteoros} meteoros)`);
await page.screenshot({ path: 'probe-interlude4-beat5a.png' });

await page.waitForTimeout(4600); // ~t=31.6s
const chuva2 = await estado();
console.log('chuva 2  ', JSON.stringify(chuva2));
ok(chuva2.meteoros >= 24, `depois MUITOS (${chuva2.meteoros} meteoros)`);
ok(chuva2.impactos >= 4, `os fragmentos caem SOBRE a lua (${chuva2.impactos} impactos)`);
await page.screenshot({ path: 'probe-interlude4-beat5b.png' });

// ─── BEAT 6 — A NAVE CONTRA A LUA ───
await page.waitForTimeout(6600); // ~t=38.2s
const final = await estado();
console.log('quadro   ', JSON.stringify(final));
ok(final.beat === 6, `o último quadro (beat=${final.beat})`);
await page.screenshot({ path: 'probe-interlude4-beat6.png' });

// ─── O fim: a tela de vitória da FASE 4, com o crédito ───
await page.waitForTimeout(4600); // ~t=42.8s
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const textos = s?.children.list.filter((c) => c.type === 'Text').map((c) => c.text) ?? [];
  return { cena: s?.scene.key, textos };
});
const duracao = ((Date.now() - t0) / 1000).toFixed(1);
console.log('fim      ', JSON.stringify(fim));
ok(fim.cena === 'GameOver', `a cutscene final fecha na tela de vitória (cena=${fim.cena})`);
ok(
  fim.textos.some((t) => t.includes('FASE 4 COMPLETA')),
  'a vitória é a da FASE 4 (o título não mente)',
);
ok(
  fim.textos.some((t) => t.includes('UM JOGO DE HENRIQUE CROSIO')),
  'o crédito do autor está no rodapé',
);
console.log(`duração da cena: ~${duracao}s (esperado ~41.8s)`);

console.log(falhas === 0 ? '\n✔ CUTSCENE FINAL DE PONTA A PONTA' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
