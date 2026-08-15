// O RÓSTER DE CADA FASE, lado a lado — o critério de sucesso nº 3 do spec da Fatia 3:
// "duas facções na mesma fase, legível". Dá para distinguir os cinco num relance?
//
// Também é a REGRESSÃO das trocas globais. O kamikaze e o cargueiro trocaram de arte na chave
// BASE, então mudaram nas fases 2, 3 e 4 de uma vez; o batedor e a canhoneira trocaram pela pele
// por fase (`STAGE_2_SKIN`), que só existe na 2. Isso prevê uma tabela específica, e o script
// existe para conferi-la em vez de acreditar nela:
//
//   fase 1  os três biomec roxos, nada do cinturão   (sem kamikaze/cargueiro — não há onda deles)
//   fase 2  batedor+canhoneira do cinturão, kamikaze+cargueiro novos, drone roxo
//   fase 3  kamikaze+cargueiro novos, mas batedor+canhoneira VOLTAM ao biomec roxo
//   fase 4  idem à 3
//
// A fase 3 é a que interessa: é onde a arte nova do cinturão convive com a biomec sem a pele
// para harmonizar, e onde um redesenho global cobra o preço se cobrar.
//
// Os inimigos são congelados num x fixo — o objetivo é COMPARAR silhuetas, não filmar. A rotação
// do kamikaze também é fixada em 0: ele mira o jogador, que aqui está preso no canto, e um
// perseguidor apontado para baixo-esquerda vira ruído numa fileira. A ORIENTAÇÃO dele em voo é
// pergunta de `_probe-kami.mjs`, que roda por fase e já responde isso.
//
// uso: node scripts/_probe-roster-fases.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

// Contado no StageDirector, não presumido: STAGE_1 não traz nenhuma onda de kamikaze ou cargueiro.
const ELENCO = {
  1: [['drone', 60, 50], ['batedor', 160, 50], ['canhoneira', 290, 55]],
  2: [['drone', 60, 45], ['batedor', 160, 45], ['canhoneira', 295, 50], ['kamikaze', 70, 140], ['cargueiro', 225, 150]],
  3: [['drone', 60, 45], ['batedor', 160, 45], ['canhoneira', 295, 50], ['kamikaze', 70, 140], ['cargueiro', 225, 150]],
  4: [['drone', 60, 45], ['batedor', 160, 45], ['canhoneira', 295, 50], ['kamikaze', 70, 140], ['cargueiro', 225, 150]],
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const tudo = {};

for (const fase of [1, 2, 3, 4]) {
  await page.evaluate((f) => {
    // Os `setInterval` da fase anterior SOBREVIVEM ao `scene.start` — eles vivem na janela, não
    // na cena. E como `getScene('Game')` devolve a MESMA instância a cada fase, o laço velho
    // continua rodando com o `elencoFixo` velho e destrói o elenco novo inteiro, deixando as
    // fases 2/3/4 vazias. Matar antes de trocar.
    (window.__pinos ?? []).forEach(clearInterval);
    window.__pinos = [];
    window.__game.scene.getScene('Menu').scene.start('Game', { stage: f, handling: 'free' });
  }, fase);
  await page.waitForTimeout(1200);

  await page.evaluate((elenco) => {
    const s = window.__game.scene.getScene('Game');
    window.__pinos = window.__pinos ?? [];
    // O jogador preso no canto e imortal: sem isso a corrida morre no meio da pose.
    window.__pinos.push(setInterval(() => {
      s.invulnerableUntil = 1e12;
      if (s.ship) {
        s.ship.x = 24;
        s.ship.y = 200;
        s.ship.body?.setVelocity?.(0, 0);
      }
    }, 40));

    for (const [kind, x, y] of elenco) s.enemies.spawn(kind, y, x);
    // O cargueiro é uma FÁBRICA: a cada 1,5s ele cospe um drone, que nasce em cima do drone
    // posado da fileira e suja a comparação. O elenco é fechado no ato — quem chegar depois é
    // cria, não convidado.
    const elencoFixo = s.enemies.enemies.getChildren().filter((e) => e.active).slice();

    window.__pinos.push(setInterval(() => {
      for (const e of s.enemies.enemies.getChildren()) {
        if (!elencoFixo.includes(e)) {
          e.destroy();
          continue;
        }
        const par = elenco.find((a) => a[0] === e.getData('kind'));
        if (!par) continue;
        e.x = par[1];
        e.y = par[2];
        e.body?.setVelocity?.(0, 0);
        e.rotation = 0;
        e.flipY = false;
      }
    }, 40));
  }, ELENCO[fase]);

  await page.waitForTimeout(2500);

  tudo[fase] = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    return s.enemies.enemies
      .getChildren()
      .filter((e) => e.active)
      .map((e) => ({
        kind: e.getData('kind'),
        // A chave da ANIMAÇÃO, não a do quadro. `texture.key` devolve o quadro corrente
        // (`kamikazeAnim7` vs `...8`) e dois sprites da mesma arte em pontos diferentes do ciclo
        // pareceriam artes diferentes — falso alarme que esta sonda já deu uma vez.
        anim: e.anims.currentAnim?.key ?? '(sem anim)',
        tex: e.texture.key,
        tela: `${Math.round(e.displayWidth)}x${Math.round(e.displayHeight)}`,
        hitbox: `${e.body.width.toFixed(1)}x${e.body.height.toFixed(1)}`,
        tint: '0x' + e.tintTopLeft.toString(16).padStart(6, '0'),
      }))
      .sort((a, b) => a.kind.localeCompare(b.kind));
  });

  await page.screenshot({ path: `scripts/_roster-fase${fase}.png` });
}

for (const fase of [1, 2, 3, 4]) {
  console.log(`\n=== FASE ${fase} ===`);
  for (const e of tudo[fase]) {
    console.log(
      `  ${e.kind.padEnd(11)} anim=${e.anim.padEnd(24)} tela=${e.tela.padEnd(8)} hitbox=${e.hitbox.padEnd(11)} tint=${e.tint}`,
    );
  }
}

// A conferência que o olho não faz: a mesma chave tem que dar a MESMA textura e a MESMA hitbox
// nas fases 2, 3 e 4, porque a troca foi global. Divergência aqui é bug, não estilo.
console.log('\n=== global: kamikaze e cargueiro idênticos nas fases 2/3/4? ===');
for (const kind of ['kamikaze', 'cargueiro']) {
  const linha = [2, 3, 4].map((f) => tudo[f].find((e) => e.kind === kind));
  if (linha.some((l) => !l)) {
    console.log(`  ${kind}: AUSENTE em alguma fase — ${linha.map((l, i) => `f${i + 2}=${l ? 'ok' : 'FALTA'}`).join(' ')}`);
    continue;
  }
  const iguais = linha.every((l) => l.anim === linha[0].anim && l.hitbox === linha[0].hitbox && l.tela === linha[0].tela);
  console.log(
    `  ${kind}: ${iguais ? 'OK' : 'DIVERGE'} — ${linha.map((l, i) => `f${i + 2}[${l.anim} ${l.tela} ${l.hitbox}]`).join(' ')}`,
  );
}

console.log('\nscreenshots: scripts/_roster-fase{1,2,3,4}.png');
await browser.close();
