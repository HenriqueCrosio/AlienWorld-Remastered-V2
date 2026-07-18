// A FASE 3 — O CASCO, de ponta a ponta em duas sondas:
//
//  PARTE 1 (a fase real, ~56s): a nebulosa está ATIVA? a saída dela acontece (nebulaDim → 0)
//  e o casco aparece? a ARANHA nasce no casco?
//  PARTE 2 (treino [N]): a SERPENTE troca as 4 artes NA ORDEM (serpente → 2c → 1c → fusão),
//  a fúria tem UM alvo, e matar a fusão entrega a VITÓRIA.
//
// Armadilha 22: toda espera por estado ASSERTA que chegou nele, e ABORTA se não chegou.
// Armadilha 19: o jogador é blindado (a sonda mede a FASE, não a habilidade de quem joga).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};
const abort = async (msg) => {
  console.error(`✘ ABORTADO: ${msg}`);
  await browser.close();
  process.exit(1);
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// ─── PARTE 1: a fase real ───
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Game', { stage: 3, handling: 'diegetico' });
});
await page.waitForTimeout(2000);

const blindar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return false;
    s.lives = 99;
    s.invulnerableUntil = 1e15;
    return true;
  });
if (!(await blindar())) await abort('não entrou na GameScene da fase 3');

const estadoFase = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const nebulosa = s.parallax.layers.filter((l) => l.key === 'nebula3');
    const casco = s.parallax.layers.filter((l) => l.casco);
    return {
      cena: s.scene.key,
      fase: s.stage?.id,
      elapsed: Number((s.elapsed ?? 0).toFixed(1)),
      camadasNebulosa: nebulosa.length,
      spritesNebulosa: nebulosa.reduce((n, l) => n + l.sprites.length, 0),
      nebulaDim: Number((s.parallax.nebulaDim ?? -1).toFixed(2)),
      casco: casco.length,
      alphaCasco: casco[0]?.sprites[0]?.alpha ?? -1,
      aranha: s.enemies.enemies.getChildren().some(
        (e) => e.active && e.getData('kind') === 'aranha',
      ),
    };
  });

let f = await estadoFase();
console.log('ato 1    ', JSON.stringify(f));
ok(f.fase === 3, `fase 3 rodando (id=${f.fase})`);
ok(f.camadasNebulosa >= 3 && f.spritesNebulosa > 0, `nebulosa ATIVA (${f.camadasNebulosa} camadas, ${f.spritesNebulosa} nuvens)`);
ok(f.nebulaDim >= 0.95, `dentro da nuvem (nebulaDim=${f.nebulaDim})`);
ok(f.casco === 1 && f.alphaCasco < 0.05, `casco ainda escondido (alpha=${f.alphaCasco.toFixed(2)})`);
await page.screenshot({ path: 'probe-stage3-nebulosa.png' });

// Espera a VIRADA (evento aos 42s + fade de 6s) e a aranha (53s). Blindagem renovada no meio.
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(9000);
  await blindar();
}

f = await estadoFase();
console.log('ato 2    ', JSON.stringify(f));
if (f.cena !== 'Game') await abort(`a sonda morreu no caminho (cena=${f.cena})`);
if (f.elapsed < 50) await abort(`o relógio não chegou ao Ato 2 (t=${f.elapsed})`);
ok(f.nebulaDim <= 0.05, `saiu da nuvem (nebulaDim=${f.nebulaDim})`);
ok(f.alphaCasco > 0.7, `o CASCO apareceu (alpha=${f.alphaCasco.toFixed(2)})`);
ok(f.aranha, 'a ARANHA nasceu no casco');
await page.screenshot({ path: 'probe-stage3-casco.png' });

// ─── PARTE 2: a serpente (treino da fúria — atalho de dev N) ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true });
});
await page.waitForTimeout(6500);
await blindar();

// ⚠️ A ANIMAÇÃO SOBRESCREVE A TEXTURE.KEY (armadilha 26, versão sonda): com o idle tocando, a
// key é 'serpenteAnim7', nunca 'serpente'. A FORMA se lê por PREFIXO — do mais específico
// para o mais genérico, porque 'serpente' é prefixo de todos.
const estadoBoss = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    if (!b) return { cena: s.scene.key, boss: null };
    const key = b.sprite.texture.key;
    const forma = key.startsWith('serpenteFusao')
      ? 'fusao'
      : key.startsWith('serpente2c')
        ? '2c'
        : key.startsWith('serpente1c')
          ? '1c'
          : 'base';
    return {
      cena: s.scene.key,
      boss: forma,
      key,
      alvos: b.targets?.filter((t) => t.active).length ?? -1,
      hpTotal: b.hpTotal,
      fumaca: !!b.smokeFx,
      cabecaJunta:
        Math.abs(b.targets?.[0]?.x - (b.sprite.x + b.fase.cabeca.x * b.fase.escala)) < 2,
    };
  });

/**
 * ⚠️ O TESTE QUE FALTAVA (o bug da cabeça inalcançável passou pela 1ª sonda): dano por BALA
 * REAL, não por boss.damage(). A nave alinha com a cabeça vulnerável, atira 1.6s, e o HP TEM
 * que cair — se o corpo absorver tudo no caminho, a fase é invencível e a campanha trava.
 */
async function alcancavelPorBala(nome) {
  const antes = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.boss?.hpTotal ?? -1;
  });
  await page.keyboard.down('Space');
  for (let i = 0; i < 16; i++) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      const alvo = s.boss?.targets?.[0];
      if (alvo) {
        s.ship.y = alvo.y;
        s.ship.x = 70;
        s.ship.body.setVelocity(0, 0);
      }
    });
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('Space');
  const depois = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.boss?.hpTotal ?? -1;
  });
  ok(antes - depois >= 3, `${nome}: a cabeça é ALCANÇÁVEL por bala (dano real ${antes - depois})`);
}

let bs = await estadoBoss();
if (!bs.boss) await abort('a serpente não entrou no treino [N]');
console.log('serpente ', JSON.stringify(bs));
ok(bs.boss === 'base', `forma inicial: ${bs.boss} (3 cabeças)`);
await alcancavelPorBala('fase A (ciano)');
ok(bs.alvos === 1, `UM alvo vivo (a cabeça laranja)`);
ok(bs.cabecaJunta, 'a hitbox da cabeça acompanha o offset medido');
await page.screenshot({ path: 'probe-stage3-serpente.png' });

/** Bate no chefão até a FORMA trocar (ou aborta): o dano entra por boss.damage, como as sondas
 *  da Capitânia — o que se testa aqui é a ANATOMIA das fases, não a pontaria. */
async function matarCabeca(formaEsperada) {
  for (let tent = 0; tent < 300; tent++) {
    const r = await page.evaluate((alvo) => {
      const s = window.__game.scene.getScenes(true)[0];
      const b = s.boss;
      if (!b || b.isDead) return { fim: true, forma: null };
      const key = b.sprite.texture.key;
      const forma = key.startsWith('serpenteFusao')
        ? 'fusao'
        : key.startsWith('serpente2c')
          ? '2c'
          : key.startsWith('serpente1c')
            ? '1c'
            : 'base';
      if (forma === alvo) return { fim: false, forma };
      b.damage(4);
      return { fim: false, forma };
    }, formaEsperada);
    if (r.fim) return 'morto';
    if (r.forma === formaEsperada) return 'trocou';
    await page.waitForTimeout(120);
  }
  return 'nunca';
}

const ordem = ['2c', '1c', 'fusao'];
for (const forma of ordem) {
  const r = await matarCabeca(forma);
  if (r === 'nunca') await abort(`a forma nunca trocou para ${forma}`);
  if (r === 'morto') await abort(`morreu ANTES de chegar em ${forma}`);
  bs = await estadoBoss();
  console.log(`fase     `, JSON.stringify(bs));
  ok(bs.boss === forma, `forma trocou para ${forma}`);
  // A imunidade da transição precisa expirar antes do teste de bala.
  await page.waitForTimeout(1800);
  await alcancavelPorBala(`fase ${forma}`);
  if (forma === '2c') ok(bs.fumaca, 'o coto FUMEGA (emissor vivo)');
  if (forma === 'fusao') {
    ok(bs.alvos === 1, 'a FÚRIA tem um alvo único (a cabeça fundida)');
    await page.screenshot({ path: 'probe-stage3-fusao.png' });
  }
}

// Mata a fusão → vitória. O contrato do jogo real é o do bulletHitBoss: `damage()` devolve
// true no golpe fatal e é o CHAMADOR quem dispara o killBoss — a sonda espelha isso.
for (let tent = 0; tent < 200; tent++) {
  const fim = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.scene.key !== 'Game') return s.scene.key;
    if (s.boss && !s.boss.isDead) {
      if (s.boss.damage(4)) s.killBoss();
    }
    return null;
  });
  if (fim) break;
  await page.waitForTimeout(120);
}
await page.waitForTimeout(4000);

const final = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { cena: s.scene.key, victory: s.victory ?? s.data?.victory ?? null };
});
console.log('fim      ', JSON.stringify(final));
ok(final.cena === 'GameOver', `matar a fusão entrega o fim de campanha (cena=${final.cena})`);

console.log(falhas === 0 ? '\n✔ FASE 3 DE PONTA A PONTA' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
