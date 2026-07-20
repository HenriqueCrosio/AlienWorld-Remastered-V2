// A 3ª CUTSCENE: o hangar do Leviatã (queda da nave DANIFICADA → escolha com 8 naves → colapso).
//
// O que só se vê rodando: se a nave DERRAPA NO CONVÉS medido (DECK_ROW=138 → tela y=150, e não
// no vazio), se a fumaça do dano liga na entrada e desliga na troca de nave, se o róster é o
// COMPLETO (8 — a BATERIA entra aqui e só aqui), se a textura TROCA de verdade (a armadilha da
// animação que sobrescreve o setTexture, já paga DUAS vezes) e se o fim cai na VITÓRIA — nunca
// na Fase 1 pela rede STAGES[x] ?? STAGES[1] (a Fase 4 ainda não existe).
import { chromium } from 'playwright';

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
    if (!s || s.scene.key !== 'Interlude3') return { cena: s?.scene.key ?? '?' };

    return {
      cena: s.scene.key,
      nave: {
        x: Math.round(s.ship.x),
        y: Math.round(s.ship.y),
        angulo: Math.round(s.ship.angle),
        tex: s.ship.texture.key,
      },
      fumaca: s.fumaca.emitting,
      fagulhas: s.fagulhas.emitting,
      fase: s.fase,
      painel: s.panel ? 'aberto' : null,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('P'); // atalho: a 3ª cutscene
await page.waitForTimeout(1500);

const entrada = await estado();
console.log('entrada  ', JSON.stringify(entrada));
console.log(
  entrada.fumaca ? '✔ a nave chega FUMEGANDO' : '✘ sem fumaça na entrada — o dano não aparece',
);

// O voo cambaleante (o update anima y/ângulo por senoide até a queda).
await page.waitForTimeout(2500);
await page.screenshot({ path: 'probe-i3-cambaleio.png' });
console.log('cambaleio', JSON.stringify(await estado()));

// A queda começa em t=5.2s e a derrapagem termina por volta de t=9.3s (+0.8s até o painel).
await page.waitForTimeout(4500);
await page.screenshot({ path: 'probe-i3-derrapagem.png' });
console.log('derrapa  ', JSON.stringify(await estado()));

await page.waitForTimeout(2000);
const parada = await estado();
console.log('parada   ', JSON.stringify(parada));
await page.screenshot({ path: 'probe-i3-painel.png' });

// Derrapou até o meio do convés? (o convés está em y=150; a nave assenta 7px acima; para em x=240)
const noConves = parada.nave && Math.abs(parada.nave.y - (150 - 7)) < 4;
console.log(
  noConves
    ? '✔ derrapou NO CONVÉS'
    : `✘ parou FORA do convés (y=${parada.nave?.y}, esperado ~143)`,
);
// x=258: o VÃO LIVRE entre os dois montes de carcaça (parar colado no monte esquerdo escondia
// a nave no meio do metal cinza — revisão visual 2026-07-19).
const noMeio = parada.nave && Math.abs(parada.nave.x - 258) < 6;
console.log(noMeio ? '✔ parou no vão entre as carcaças (x~258)' : `✘ parou em x=${parada.nave?.x}, esperado ~258`);
console.log(parada.painel === 'aberto' ? '✔ painel aberto' : '✘ o painel NÃO abriu');

// ─── O painel: as 8 naves — a BATERIA entra AQUI e só aqui ───
const roster = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.panel ? s.panel.naves : null;
});
console.log('róster   ', JSON.stringify(roster));
console.log(roster?.length === 8 ? '✔ róster COMPLETO (8)' : `✘ róster com ${roster?.length} naves, esperado 8`);
console.log(roster?.includes('canhoes') ? '✔ a BATERIA está no hangar' : '✘ a BATERIA não apareceu');

// Escolhe a BATERIA (tecla 8 — a última do róster final) e confirma.
const texAntes = parada.nave?.tex;
await page.keyboard.press('8');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);

const armada = await estado();
console.log('armada   ', JSON.stringify(armada));
// A armadilha da animação: o setTexture solto durava até o próximo quadro do thrust. A prova é a
// textura DEPOIS da confirmação — a olho nu ninguém pega (já mentiu em DUAS cutscenes).
console.log(
  armada.nave?.tex === 'shipCanhoes'
    ? '✔ a textura TROCOU para a BATERIA'
    : `✘ textura mentindo: veio ${armada.nave?.tex} (antes: ${texAntes}), esperado shipCanhoes`,
);
console.log(
  armada.fumaca === false
    ? '✔ a fumaça apagou (a nave nova está inteira)'
    : '✘ a nave nova ainda fumega — a troca não conta a história',
);

// O colapso da entrada.
await page.waitForTimeout(2600);
await page.screenshot({ path: 'probe-i3-colapso.png' });
console.log('colapso  ', JSON.stringify(await estado()));

// O fim: a FASE 4 EXISTE (2026-07-19) → o hangar ENTREGA nela. Cair em Game/1 seria a rede
// de segurança despejando o jogador na Fase 1 — o desastre silencioso documentado.
await page.waitForTimeout(3600);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { cena: s?.scene.key, fase: s?.stage?.id ?? null, victory: s?.victory ?? null };
});
console.log('fim      ', JSON.stringify(fim));
if (fim.cena === 'Game' && fim.fase === 4) {
  console.log('✔ o hangar entrega a FASE 4');
} else if (fim.cena === 'Game' && fim.fase === 1) {
  console.log('✘ DESASTRE: a rede STAGES[x] ?? STAGES[1] despejou o jogador na FASE 1');
} else {
  console.log(`✘ fim inesperado: ${fim.cena}/${fim.fase} (esperava Game/4)`);
}

await browser.close();
