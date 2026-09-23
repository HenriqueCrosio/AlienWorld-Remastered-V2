// FATIA 7 · O ATALHO DE DEV `G` — ele entrega a ARENA FINAL REAL?
//
// ⚠️ ESTA SONDA EXISTE PORQUE UMA SONDA DEPENDIA DO DEFEITO. `StageDirector.skipTo` DESCARTA os
// eventos pulados sem executar, e até 12/09 o `G` não reaplicava o estado que eles deixariam — só
// o modo treino fazia isso (`aplicaCorredorEMoldura`, desde 10/09). Consequência: apertar `G`
// dentro do duto levava a parede do duto para dentro da arena do chefão — espessura 54 e
// `duto: true`, ou seja, **o chefão final era lutado num corredor cujas paredes matam**.
//
// ⚠️ E A `probe-stage4` CHEGA AO CHEFÃO APERTANDO `G`. Ela nunca pegou isto por uma coincidência:
// ela aperta por volta de t≈10, e ali a espessura já é 16 e `duto` já é false — exatamente o
// estado da arena. O atalho só mentia quando alguém saltava de um trecho com parede diferente, que
// é precisamente o que um humano faz ao testar o chefão. **Atalho de dev que uma sonda usa deixa
// de ser atalho: ele passa a definir o que a sonda mede.**
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
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

// ─── O SALTO PARA DENTRO DO DUTO: o pior estado possível para saltar de novo ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  setInterval(() => { s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER; }, 150);
  s.elapsed = 72;
  s.director.skipTo(72);
  s.aplicaCorredorEMoldura(72);
});
await page.waitForTimeout(1200);

const noDuto = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { t: Math.round(s.elapsed), espessura: Math.round(s.moldura.espessura), duto: s.moldura.duto };
});
console.log('no duto  ', JSON.stringify(noDuto));
ok(noDuto.espessura >= 50, `o teste parte do duto de verdade (parede ${noDuto.espessura}px)`);
ok(noDuto.duto === true, 'e com a parede MORDENDO (duto=true)');

// ─── O `G` ───
await page.keyboard.press('G');
// ⚠️ 6,5s DE ESPERA, E O NÚMERO É UMA CONTA: a parede não salta, ela PERSEGUE o alvo a
// `Moldura.RAMPA` = 8px/s (ver `avanca`). De 54 para 16 são 38px, ou 4,75s. Medir antes disso
// pega a rampa no meio e reprova uma parede que está apenas a caminho — foi o que aconteceu na
// primeira verificação desta correção, que leu 38px aos 2s e acusou um defeito que não existia.
await page.waitForTimeout(6500);

const naArena = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    t: Math.round(s.elapsed),
    espessura: Math.round(s.moldura.espessura),
    duto: s.moldura.duto,
    chefao: !!s.boss,
  };
});
console.log('apos o G ', JSON.stringify(naArena));

ok(naArena.chefao, 'o G entrega o chefão');
ok(
  naArena.duto === false,
  `⭐ e a parede PARA DE MORDER ao sair do duto (duto=${naArena.duto}) — o defeito de 12/09`,
);
ok(
  naArena.espessura >= 14 && naArena.espessura <= 20,
  `⭐ e a arena é a de 16px do roteiro, não a do trecho de onde se saltou (${naArena.espessura}px)`,
);

console.log(falhas === 0 ? '\n✔ O ATALHO G ESTÁ HONESTO' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
