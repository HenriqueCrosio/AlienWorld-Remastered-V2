// FASE 4 — O INTERIOR: corredores chão+TETO, vão garantido, e o andaime do chefão.
//
// O que só se vê rodando: se o fundo é o modo `interior` (parede de hangar + bandas de teto e
// chão), se os corredores nascem em PARES com o vão prometido pelo roteiro (alturas
// independentes somariam parede impassável), se o TETO MATA de verdade (a nave levada até uma
// coluna pendurada perde vida — grupo certo não prova overlap vivo), e se a vitória da fase 4
// entrega a CUTSCENE FINAL (Interlude4) e ela fecha a campanha na tela de vitória.
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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

const inicio = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    cena: s.scene.key,
    fase: s.stage?.id,
    parallax: s.parallax?.mode,
    zona: s.zone,
  };
});
console.log('início   ', JSON.stringify(inicio));
ok(inicio.fase === 4, `fase 4 rodando (id=${inicio.fase})`);
ok(inicio.parallax === 'interior', `fundo no modo interior (${inicio.parallax})`);
ok(inicio.zona === 'vacuo', `zero-G — voo livre, sem flap (${inicio.zona})`);

// ─── Os corredores: pares chão+teto com vão garantido ───
// Espera o roteiro encher a tela (o evento `corredor` começa em t=1, rate 2.2).
await page.waitForTimeout(7000);
await page.screenshot({ path: 'probe-stage4-corredor.png' });

const corredores = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const props = s.terrain.props.getChildren().filter((p) => p.active);
  const chao = props.filter((p) => !p.flipY);
  const teto = props.filter((p) => p.flipY);

  // Pareia por proximidade de x (o par nasce no mesmo tick, no mesmo x).
  const pares = [];
  for (const t of teto) {
    const par = chao.find((c) => Math.abs(c.x - t.x) < 8);
    if (!par) continue;
    const baseTeto = t.y + t.displayHeight;
    const topoChao = par.y - par.displayHeight;
    pares.push(Math.round(topoChao - baseTeto));
  }
  return { chao: chao.length, teto: teto.length, vaos: pares };
});
console.log('corredores', JSON.stringify(corredores));
ok(corredores.teto >= 2, `o TETO existe (${corredores.teto} colunas penduradas)`);
ok(corredores.chao >= 2, `o chão existe (${corredores.chao} colunas)`);
ok(corredores.vaos.length >= 2, `colunas nascem em PARES (${corredores.vaos.length} pares medidos)`);
// t≈8s: o roteiro está no gap 110 (t=1). Margem de ±14 para arredondamento de escala/altura.
const vaosOk = corredores.vaos.every((v) => v >= 96 && v <= 124);
ok(vaosOk, `todo vão respeita o prometido (~110px): [${corredores.vaos}]`);

// ─── O teto MATA: leva a nave até uma coluna pendurada e mede a vida ───
const dano = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 5; // a sonda não sabe jogar: vidas para cima, senão o teste mede o GameOver
  const alvo = s.terrain.props
    .getChildren()
    .filter((p) => p.active && p.flipY && p.x > 120 && p.x < 330)
    .sort((a, b) => a.x - b.x)[0];
  if (!alvo) return null;
  s.ship.setPosition(alvo.x, alvo.y + alvo.displayHeight / 2);
  return { vidasAntes: s.lives };
});
await page.waitForTimeout(400);
const depois = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { vidas: s.lives };
});
if (dano === null) {
  ok(false, 'não havia coluna de teto na tela para o teste de dano');
} else {
  ok(depois.vidas < dano.vidasAntes, `bater no TETO dói (${dano.vidasAntes} → ${depois.vidas} vidas)`);
}

// ─── O NÚCLEO: a batida sístole/diástole, por BALA REAL (armadilha 19) ───
await page.keyboard.press('G');

// Espera o coração estacionar. A sonda não sabe jogar: vidas e invulnerabilidade para cima —
// testa-se o CHEFÃO, não a habilidade de quem segura o teclado.
for (let i = 0; i < 40; i++) {
  const pronto = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.boss && !s.boss.entering) {
      s.lives = 99;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      return true;
    }
    return false;
  });
  if (pronto) break;
  await page.waitForTimeout(400);
}

const boss0 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    forma: s.boss.forma,
    hpG: s.boss.hpGuardiao,
    alvos: s.boss.targets?.length ?? 0,
    tex: s.boss.sprite.texture.key,
    anim: s.boss.sprite.anims?.currentAnim?.key ?? null,
    tocando: s.boss.sprite.anims?.isPlaying ?? null,
    quadro: s.boss.sprite.anims?.currentFrame?.index ?? null,
  };
});
console.log('boss     ', JSON.stringify(boss0));
ok(boss0.forma === 'guardiao', `a luta abre com o GUARDIÃO (forma=${boss0.forma})`);
ok(boss0.alvos === 1, `a massa é o único alvo (targets=${boss0.alvos})`);
// O guardião RESPIRA (a sheet animada, 2026-07-21): a sonda cobra a animação viva, não só a
// textura — o chefe final estático de antes era a "animação que existia só na teoria".
ok(
  boss0.anim === 'guardiao-idle' && boss0.tocando === true,
  `o guardião RESPIRA (anim=${boss0.anim}, tocando=${boss0.tocando})`,
);
await page.screenshot({ path: 'probe-stage4-guardiao.png' });
await page.waitForTimeout(1100);
const boss0b = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].boss.sprite.anims?.currentFrame?.index ?? null,
);
ok(boss0b !== boss0.quadro, `o quadro da respiração AVANÇA (${boss0.quadro} → ${boss0b})`);

const atirar = async (ms) => {
  await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.ship.setPosition(s.boss.core.x - 130, s.boss.core.y);
    s.ship.body.reset(s.boss.core.x - 130, s.boss.core.y);
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(ms);
  await page.keyboard.up('Space');
};

// GUARDIÃO PARADO: a barriga vermelha é alvo por BALA REAL (armadilha 19 — a casca à
// esquerda dela NÃO pode absorver o tiro antes de ele chegar).
for (let i = 0; i < 30; i++) {
  const parado = await page.evaluate(
    () => window.__game.scene.getScenes(true)[0].boss.acao === 'flutua',
  );
  if (parado) break;
  await page.waitForTimeout(300);
}
const hpG0 = await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.hpGuardiao);
await atirar(900);
const hpG1 = await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.hpGuardiao);
ok(hpG1 < hpG0, `a bala real fere a MASSA do guardião parado (hp ${hpG0} → ${hpG1})`);

// Mata a casca → a TROCA: convulsão e o coração surge.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
await page.waitForTimeout(2200);
const troca = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    forma: s.boss.forma,
    tex: s.boss.sprite.texture.key,
    aberto: s.boss.aberto,
    anim: s.boss.sprite.anims?.currentAnim?.key ?? null,
    tocando: s.boss.sprite.anims?.isPlaying ?? null,
  };
});
console.log('troca    ', JSON.stringify(troca));
ok(troca.forma === 'coracao', `a casca morta revela o CORAÇÃO (forma=${troca.forma})`);
// A arte trocou junto: a SHEET do batimento (ou o estático de fallback, se a sheet faltar).
ok(
  troca.tex === 'nucleoBeatSheet' || troca.tex === 'nucleo',
  `a arte trocou junto (tex=${troca.tex})`,
);
ok(
  troca.anim === 'nucleo-beat' && troca.tocando === true,
  `o coração BATE (anim=${troca.anim}, tocando=${troca.tocando})`,
);
await page.screenshot({ path: 'probe-stage4-nucleo.png' });

const esperarEstado = async (aberto) => {
  for (let i = 0; i < 30; i++) {
    const ok = await page.evaluate(
      (a) => window.__game.scene.getScenes(true)[0].boss.aberto === a,
      aberto,
    );
    if (ok) return true;
    await page.waitForTimeout(300);
  }
  return false;
};

await esperarEstado(false);
const hpAntesFechado = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].boss.hpCoracao,
);
await atirar(900);
const hpDepoisFechado = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].boss.hpCoracao,
);
ok(
  hpDepoisFechado === hpAntesFechado,
  `FECHADO, a blindagem segura a bala real (hp ${hpAntesFechado} → ${hpDepoisFechado})`,
);

await esperarEstado(true);
await atirar(1200);
const hpDepoisAberto = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].boss.hpCoracao,
);
ok(
  hpDepoisAberto < hpAntesFechado,
  `ABERTO, a bala real fere a ferida (hp ${hpAntesFechado} → ${hpDepoisAberto})`,
);

// Fase 2 (<66%): as PAREDES entram na luta. Derruba a vida pela ferida e conta o terreno.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (s.boss.aberto) s.boss.damage(Math.ceil(s.boss.hpCoracao - 180 * 0.5));
});
const propsAntes = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].terrain.props.getChildren().filter((p) => p.active).length,
);
await page.waitForTimeout(8000);
const propsDepois = await page.evaluate(
  () => window.__game.scene.getScenes(true)[0].terrain.props.getChildren().filter((p) => p.active).length,
);
console.log(`paredes   antes=${propsAntes} depois=${propsDepois}`);
ok(propsDepois > 0, `as PAREDES nascem durante a luta (${propsDepois} colunas vivas)`);
await page.screenshot({ path: 'probe-stage4-paredes.png' });

// Mata pela ferida — o contrato do jogo real: damage() true no golpe fatal, o CHAMADOR
// dispara o killBoss (o mesmo espelho da probe-stage3).
for (let i = 0; i < 60; i++) {
  const morto = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s.boss || s.boss.isDead) return true;
    if (s.boss.aberto && s.boss.damage(999)) {
      s.killBoss();
      return true;
    }
    return false;
  });
  if (morto) break;
  await page.waitForTimeout(300);
}

await page.waitForTimeout(4500);
const meio = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { cena: s?.scene.key };
});
console.log('meio     ', JSON.stringify(meio));
// A CUTSCENE FINAL entra entre o NÚCLEO e o GameOver (2026-07-20): vencer a Fase 4 agora
// entrega a Interlude4 — a vitória amarga — e é ELA quem fecha a campanha.
ok(meio.cena === 'Interlude4', `matar o NÚCLEO entrega a CUTSCENE FINAL (cena=${meio.cena})`);
await page.screenshot({ path: 'probe-stage4-cutscene-final.png' });

// Atravessa a interlude SEM tecla de pular (de propósito — docs/HANDOFF.md): espera a
// timeline real (~42s) até ela entregar o GameOver.
let fim = { cena: null };
for (let i = 0; i < 55; i++) {
  await page.waitForTimeout(1000);
  fim = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return { cena: s?.scene.key };
  });
  if (fim.cena === 'GameOver') break;
}
console.log('fim      ', JSON.stringify(fim));
ok(fim.cena === 'GameOver', `a cutscene final fecha a campanha na tela de vitória (cena=${fim.cena})`);

console.log(falhas === 0 ? '\n✔ FASE 4 DE PONTA A PONTA (com o NÚCLEO)' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
