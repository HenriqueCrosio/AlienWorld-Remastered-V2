// AS CARTAS NOVAS EM JOGO (spec 2026-10-01-catalogo-cartas-design.md §8): cada carta aplicada faz o que diz.
// Cada caso abre a F2 LIMPA (humana, voo livre, roteiro desligado, nave intocável), aplica as cartas e mede no próprio
// mundo. Uso: node scripts/probe-cartas-novas.mjs [dir-das-fotos]   (com `npm run dev` rodando)
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => {
  erros.push(e.message);
  console.log('[pageerror]', e.message, (e.stack ?? '').split('\n').slice(1, 4).join(' |'));
});
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Ajudantes NO MUNDO (sobrevivem à troca de cena: moram na página).
await page.evaluate(() => {
  window.__teste = {
    cena: () => window.__game.scene.getScene('Game'),
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    /** Um inimigo PARADO de `kind` em (x, y), com `hp`. */
    alvo(kind, x, y, hp) {
      const s = window.__game.scene.getScene('Game');
      s.enemies.spawn(kind, y, x);
      const kids = s.enemies.enemies.getChildren();
      const e = kids[kids.length - 1];
      e.setPosition(x, y);
      e.body.setVelocity(0, 0);
      e.setData('baseY', y);
      e.setData('hp', hp);
      return e;
    },
    /** Os projéteis ativos de uma origem de carta. */
    projeteis(origem) {
      return window.__game.scene.getScene('Game').weapons.bullets.getChildren().filter((b) => b.active && b.getData('origem') === origem);
    },
    /** Espia as explosões: devolve a lista de fontes, que cresce a cada `explodir`. */
    espiarExplosoes() {
      const ex = window.__game.scene.getScene('Game').cartas.explosao;
      const fontes = [];
      const orig = ex.explodir.bind(ex);
      ex.explodir = (f, ...resto) => {
        fontes.push(f);
        orig(f, ...resto);
      };
      return fontes;
    },
  };
});

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

/** A F2 limpa, com as cartas dadas: sem roteiro (nenhuma onda no meio da medida) e com a nave intocável. */
async function fase(cartas) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    // ⚠️ A INSTÂNCIA DA CENA É REAPROVEITADA entre partidas: o `cartas` da anterior ficaria lá e a espera abaixo
    // passaria antes de a cena nova montar. Apagado aqui, ele só volta quando o `create` novo o recriar.
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  // Parar e começar a MESMA cena no mesmo quadro não monta a nova: espera a velha sair de cena primeiro.
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(() => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(400);
  await page.evaluate((cartas) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    for (const id of cartas) s.cartas.aplicar(id);
  }, cartas);
}

/** Foto do mundo em volta de (x, y) do jogo, para a folha dele. */
async function foto(nome, x, y, w = 120, h = 70) {
  const z = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  await page.screenshot({ path: `${OUT}/${nome}.png`, clip: { x: z.left + (x - w / 2) * z.k, y: z.top + (y - h / 2) * z.k, width: w * z.k, height: h * z.k } });
}

// ─── OS CASOS ───

// ── A EXPLOSÃO ÚNICA (§4.1) ──
for (const [cartas, esperado, nome] of [
  [['EFF_001'], 99, 'sem Explosão Maior, o vizinho a 24px escapa (raio 18)'],
  [['EFF_001', 'EFF_002'], 98, 'com Explosão Maior, o vizinho a 24px leva o dano (raio 27)'],
]) {
  await fase(cartas);
  const hp = await page.evaluate(async () => {
    const t = window.__teste;
    const viz = t.alvo('drone', 224, 100, 99);
    t.cena().cartas.explosao.explodir('explosivo', 200, 100, 0, null);
    await t.dormir(150);
    return viz.getData('hp');
  });
  conferir(hp === esperado, nome, hp);
}

await fase(['EFF_001', 'EFF_003']);
const estilhacos = await page.evaluate(async () => {
  const t = window.__teste;
  t.cena().cartas.explosao.explodir('explosivo', 200, 100, 0, null);
  await t.dormir(60);
  return t.projeteis('estilhaco').length;
});
conferir(estilhacos >= 4 && estilhacos <= 6, 'Fragmentado solta 4–6 estilhaços', estilhacos);
await foto('fragmentado', 200, 100);

const fontes = await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  const fontes = t.espiarExplosoes();
  const e = t.alvo('drone', 250, 120, 99);
  s.cartas.aoAcertar(250, 120, e, 'estilhaco', 0);
  s.cartas.aoAcertar(250, 120, e, null, 0);
  return fontes;
});
conferir(JSON.stringify(fontes) === '["explosivo"]', 'o estilhaço não explode; o tiro da nave com Explosivo explode', fontes);

await fase(['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001']);
const queima = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('drone', 210, 100, 99);
  s.cartas.explosao.explodir('explosivo', 200, 100, 0, null);
  await t.dormir(100);
  return (e.getData('queimaAte') ?? 0) > s.time.now;
});
conferir(queima, 'Em Cadeia: quem está no raio da explosão pega fogo', queima);

// ── MÍSSIL GUIADO (WPN_009) ──
await fase(['WPN_009']);
const missil = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('drone', s.ship.x + 140, s.ship.y - 30, 99);
  let visto = 0;
  for (let i = 0; i < 50 && e.getData('hp') === 99; i++) {
    visto = Math.max(visto, t.projeteis('missil').length);
    await t.dormir(100);
  }
  return { visto, hp: e.getData('hp') };
});
conferir(missil.visto >= 1 && missil.hp < 99, 'o míssil sai, persegue e acerta', missil);

// Míssil ×2: cada um trava no SEU alvo, e o 2º sai um instante depois do 1º.
await fase(['WPN_009', 'WPN_009']);
const duplo = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const a = t.alvo('drone', s.ship.x + 150, s.ship.y - 50, 99);
  const b = t.alvo('drone', s.ship.x + 170, s.ship.y + 50, 99);
  const l = s.cartas.lancadores;
  l.proximoMissil = s.time.now;
  const saidas = [];
  for (let i = 0; i < 40 && saidas.length < 2; i++) {
    for (const m of l.misseis) if (!saidas.some((x) => x.id === m.id)) saidas.push({ id: m.id, t: s.time.now, alvo: m.alvo === a ? 'a' : m.alvo === b ? 'b' : null });
    await t.dormir(20);
  }
  return { saidas, atraso: saidas.length === 2 ? saidas[1].t - saidas[0].t : null };
});
conferir(
  duplo.saidas.length === 2 && duplo.saidas[0].alvo !== duplo.saidas[1].alvo && duplo.saidas.every((x) => x.alvo) && duplo.atraso >= 80,
  'míssil ×2: um alvo para cada, e o 2º sai depois do 1º',
  duplo,
);

// Sem ninguém para acertar, o míssil explode no ar no fim da vida (~2,5s).
await fase(['WPN_009']);
const noAr = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const fontes = t.espiarExplosoes();
  s.cartas.lancadores.proximoMissil = s.time.now;
  for (let i = 0; i < 40 && !fontes.includes('missil'); i++) await t.dormir(100);
  return { fontes, vivos: t.projeteis('missil').length };
});
conferir(noAr.fontes.includes('missil') && noAr.vivos === 0, 'o míssil que não acha ninguém explode no ar no fim da vida', noAr);

// ── FLARE (EFF_010): solto pelo JOGADOR (tecla provisória L), com espera de 8s ──
await fase(['EFF_010']);
await page.keyboard.press('KeyL');
const flare = await page.evaluate(async () => {
  const t = window.__teste;
  const fontes = t.espiarExplosoes();
  let solto = false;
  for (let i = 0; i < 50 && !fontes.includes('flare'); i++) {
    solto ||= t.projeteis('flare').length > 0;
    await t.dormir(100);
  }
  return { solto, fontes, hud: t.cena().hud.text.includes('FLARE') };
});
conferir(flare.solto && flare.fontes.includes('flare'), 'a tecla solta o flare para trás, e ele explode sozinho', flare);
await page.keyboard.press('KeyL');
await page.waitForTimeout(300);
const naEsperaFlare = await page.evaluate(() => window.__teste.projeteis('flare').length);
conferir(naEsperaFlare === 0 && !flare.hud, 'na espera, a tecla não solta outro e a HUD não mostra FLARE', { naEsperaFlare, hud: flare.hud });

await fase(['EFF_010']);
const toque = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  window.__fontesFlare = t.espiarExplosoes();
  window.__alvoFlare = t.alvo('drone', s.ship.x - 30, s.ship.y, 99);
  await t.dormir(150); // a HUD redesenha no quadro seguinte à carta
  return s.hud.text.includes('FLARE');
});
await page.keyboard.press('KeyL');
const toqueFim = await page.evaluate(async () => {
  const t = window.__teste;
  for (let i = 0; i < 30 && !window.__fontesFlare.includes('flare'); i++) await t.dormir(100);
  return { fontes: window.__fontesFlare, hp: window.__alvoFlare.getData('hp') };
});
conferir(toque && toqueFim.fontes.includes('flare') && toqueFim.hp < 99, 'com "FLARE" aceso, o flare explode no inimigo que toca', { hud: toque, ...toqueFim });

// ─── FIM ───

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
