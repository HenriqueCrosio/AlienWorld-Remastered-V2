// POR QUE O FLAK NÃO APARECE NA FASE DE VERDADE?
//
// A sonda do treino (`probe-capitania.mjs`) vê o flak todo ciclo — mas o treino luta num céu
// LIMPO. O Henrique jogou a fase inteira e não viu a cápsula uma vez sequer. Ou ela não está
// saindo, ou está saindo e MORRENDO antes de estourar.
//
// Esta sonda conta o ciclo de vida de cada cápsula na LUTA REAL: quantas nasceram, quantas
// estouraram, e quantas sumiram no caminho — e por quê.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V'); // FASE 2 de verdade (não o treino)
await page.waitForTimeout(1200);

// Pula para o chefão DENTRO da fase: os destroços que sobraram do enxame continuam na tela,
// que é justamente a diferença entre a fase e o treino.
await page.keyboard.press('G');
await page.waitForTimeout(6000);

// Instrumenta o chefão: conta cada nascimento e cada estouro, e vigia o destino de cada cápsula.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const b = s.boss;

  const c = (window.__flak = {
    volleys: 0,
    nasceram: 0,
    estouraram: 0,
    poolCheio: 0,
    sumiram: 0, // saiu da lista sem estourar = alguém a matou antes do pavio
  });

  const volleyOrig = b.flakVolley.bind(b);
  b.flakVolley = (t) => {
    c.volleys++;
    const antes = b.flak.length;
    volleyOrig(t);
    c.nasceram += b.flak.length - antes;
    // O pool é compartilhado e tem teto (64). Se ele estiver cheio, a salva sai VAZIA.
    if (b.flak.length - antes < 3) c.poolCheio++;
  };

  const detOrig = b.detonate.bind(b);
  b.detonate = (shell) => {
    c.estouraram++;
    detOrig(shell);
  };

  // Vigia: uma cápsula que sai da lista sem ter estourado foi absorvida por alguma coisa.
  const tickOrig = b.tickFlak.bind(b);
  b.tickFlak = (dt) => {
    const antes = b.flak.length;
    const estourouAntes = c.estouraram;
    tickOrig(dt);
    const saiu = antes - b.flak.length;
    const estourou = c.estouraram - estourouAntes;
    c.sumiram += Math.max(0, saiu - estourou);
  };
});

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    if (!b) return { chefao: null, ...window.__flak };

    return {
      vida: `${b.hp}/${b.maxHp}`,
      furia: b.hp <= b.maxHp / 2,
      noAr: b.flak.length,
      // Quantos projéteis inimigos estão vivos: se isto encostar em 64, o pool está estourado.
      poolUsado: s.enemies.enemyBullets.getChildren().filter((x) => x.active).length,
      // Cobertura na tela: o destroço ABSORVE tiro inimigo — e a cápsula é um tiro inimigo.
      coberturaNaTela: s.debris.hazards.getChildren().filter((x) => x.active).length,
      ...window.__flak,
    };
  });

/** Mantém o jogador vivo e empurra o chefão para a fúria — o que se mede é o PADRÃO. */
const sustentar = async (ms, dano = 0) => {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    await page.evaluate((d) => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s?.boss) return;
      s.lives = 9;
      s.invulnerableUntil = s.time.now + 3000;
      if (d > 0 && s.boss.hp > s.boss.maxHp * 0.42) s.boss.hp -= d;
    }, dano);
    await page.waitForTimeout(120);
  }
};

console.log('── INTEIRA ──');
await sustentar(3000);
console.log(JSON.stringify(await estado()));

// ⚠️ Empurra até a fúria DE VERDADE, e confere. A 1ª versão desta sonda batia no chefão por 3s
// fixos, parava em 68% de vida e ia medir o flak numa luta que NUNCA tinha entrado em fúria —
// o flak "não aparecia" porque a condição dele nunca acontecia. Um teste que não chega no estado
// que quer medir sempre "confirma" o bug.
console.log('\n── EMPURRANDO PARA A FÚRIA ──');
for (let i = 0; i < 20; i++) {
  await sustentar(500, 3);
  const e = await estado();
  if (e.furia) break;
}

const entrou = await estado();
console.log(JSON.stringify(entrou));

if (!entrou.furia) {
  console.log('\n✘ SONDA INVÁLIDA: o chefão não chegou à fúria — não dá para medir o flak.');
  await browser.close();
  process.exit(1);
}

console.log('\n── FÚRIA (é aqui que o flak TEM que sair) ──');
for (let i = 0; i < 6; i++) {
  await sustentar(2500);
  console.log(JSON.stringify(await estado()));
}

const f = await page.evaluate(() => window.__flak);
console.log('\n─────────────────────────────────────────────');
console.log(`salvas disparadas : ${f.volleys}`);
console.log(`cápsulas nascidas : ${f.nasceram}`);
console.log(`      ESTOURARAM  : ${f.estouraram}`);
console.log(`      sumiram     : ${f.sumiram}   <- absorvidas antes do pavio`);
console.log(`salvas com pool cheio: ${f.poolCheio}`);

await browser.close();
