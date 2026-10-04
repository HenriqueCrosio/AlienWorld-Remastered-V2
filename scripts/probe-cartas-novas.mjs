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
// A HUD das recargas (8s): "FLARE" / "DASH" quando prontos; "FLARE 6s" / "DASH 3s" contando.
const hudPronto = (texto, nome) => new RegExp(`${nome}(?! \\d)`).test(texto);
const hudContando = (texto, nome) => new RegExp(`${nome} \\d+s`).test(texto);
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

// ── MÍSSIL GUIADO (WPN_009): solto pelo JOGADOR (tecla Q), com recarga — 04/10, o automático era "apelão" ──
// Os tempos pelo relógio do JOGO (no SwiftShader ele anda mais devagar que o real).
await fase(['WPN_009']);
const sozinho = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  window.__alvoMissil = t.alvo('drone', s.ship.x + 140, s.ship.y - 30, 99);
  const fim = s.time.now + 1500;
  let visto = 0;
  while (s.time.now < fim) {
    visto = Math.max(visto, t.projeteis('missil').length);
    await t.dormir(50);
  }
  return { visto };
});
conferir(sozinho.visto === 0, 'sem a tecla, o míssil não sai sozinho', sozinho);
await page.keyboard.press('KeyQ');
const missil = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = window.__alvoMissil;
  // A recarga lida no quadro em que o míssil aparece (o Q só é processado no tick seguinte ao aperto).
  let recarga = null;
  let visto = 0;
  const fim = s.time.now + 3000;
  while (s.time.now < fim && e.getData('hp') === 99) {
    visto = Math.max(visto, t.projeteis('missil').length);
    if (visto && recarga === null) recarga = s.cartas.lancadores.missilFalta;
    await t.dormir(50);
  }
  return { visto, hp: e.getData('hp'), recarga, hud: s.hud.text };
});
conferir(missil.visto >= 1 && missil.hp < 99, 'Q solta o míssil, que persegue e acerta', missil);
conferir(missil.recarga > 7000 && missil.recarga <= 8000, 'com a carta ×1, a recarga é de 8s', missil);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(300);
const naEsperaMissil = await page.evaluate(() => ({ vivos: window.__teste.projeteis('missil').length, hud: window.__teste.cena().hud.text }));
conferir(naEsperaMissil.vivos === 0 && hudContando(naEsperaMissil.hud, 'MÍSSIL'), 'na recarga, o Q não solta outro e a HUD conta (MÍSSIL Ns)', naEsperaMissil);

// Míssil ×2: a recarga encurta para 5s.
await fase(['WPN_009', 'WPN_009']);
await page.evaluate(() => {
  const s = window.__teste.cena();
  window.__teste.alvo('drone', s.ship.x + 150, s.ship.y - 50, 99);
});
await page.keyboard.press('KeyQ');
const duplo = await page.evaluate(async () => {
  const t = window.__teste;
  await t.dormir(100);
  return { recarga: t.cena().cartas.lancadores.missilFalta, saiu: t.cena().cartas.lancadores.misseis.length };
});
conferir(duplo.saiu === 1 && duplo.recarga > 4000 && duplo.recarga <= 5000, 'com a carta ×2, um míssil e a recarga de 5s', duplo);

// Sem ninguém para travar, o Q não solta e não gasta a recarga.
await fase(['WPN_009']);
await page.keyboard.press('KeyQ');
const semNinguem = await page.evaluate(async () => {
  const t = window.__teste;
  await t.dormir(300);
  return { vivos: t.projeteis('missil').length, falta: t.cena().cartas.lancadores.missilFalta };
});
conferir(semNinguem.vivos === 0 && semNinguem.falta === 0, 'sem inimigo na tela, o Q não solta nem gasta a recarga', semNinguem);

// Perdeu o alvo (morreu antes) e não sobrou outro: explode no ar logo (~0,4s), ainda na tela.
await fase(['WPN_009']);
await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  window.__fontesMissil = t.espiarExplosoes();
  window.__alvoMissil = t.alvo('drone', s.ship.x + 160, s.ship.y - 40, 99);
});
await page.keyboard.press('KeyQ');
const noAr = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const fontes = window.__fontesMissil;
  const e = window.__alvoMissil;
  const l = s.cartas.lancadores;
  // Espera o míssil sair e acender, e tira o alvo do jogo.
  let fim = s.time.now + 1500;
  while (s.time.now < fim && !l.misseis.some((m) => m.aceso)) await t.dormir(20);
  const saiu = l.misseis.length;
  e.setActive(false).setVisible(false);
  const tirado = s.time.now;
  fim = s.time.now + 1500;
  while (s.time.now < fim && !fontes.includes('missil')) await t.dormir(20);
  return { saiu, fontes, depoisMs: Math.round(s.time.now - tirado), vivos: t.projeteis('missil').length };
});
conferir(
  noAr.saiu === 1 && noAr.fontes.includes('missil') && noAr.vivos === 0 && noAr.depoisMs <= 700,
  'o míssil que perde o alvo (e não acha outro) explode no ar logo',
  noAr,
);

// ── FLARE (EFF_010): solto pelo JOGADOR (tecla F), com espera de 8s ──
await fase(['EFF_010']);
await page.keyboard.press('KeyF');
const flare = await page.evaluate(async () => {
  const t = window.__teste;
  const fontes = t.espiarExplosoes();
  let solto = false;
  for (let i = 0; i < 50 && !fontes.includes('flare'); i++) {
    solto ||= t.projeteis('flare').length > 0;
    await t.dormir(100);
  }
  return { solto, fontes, hud: t.cena().hud.text };
});
conferir(flare.solto && flare.fontes.includes('flare'), 'a tecla solta o flare para trás, e ele explode sozinho', flare);
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
const naEsperaFlare = await page.evaluate(() => window.__teste.projeteis('flare').length);
conferir(naEsperaFlare === 0 && hudContando(flare.hud, 'FLARE'), 'na espera, a tecla não solta outro e a HUD conta a recarga (FLARE Ns)', { naEsperaFlare, hud: flare.hud });

await fase(['EFF_010']);
const toque = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  window.__fontesFlare = t.espiarExplosoes();
  window.__alvoFlare = t.alvo('drone', s.ship.x - 30, s.ship.y, 99);
  await t.dormir(150); // a HUD redesenha no quadro seguinte à carta
  return s.hud.text;
});
await page.keyboard.press('KeyF');
const toqueFim = await page.evaluate(async () => {
  const t = window.__teste;
  for (let i = 0; i < 30 && !window.__fontesFlare.includes('flare'); i++) await t.dormir(100);
  return { fontes: window.__fontesFlare, hp: window.__alvoFlare.getData('hp') };
});
conferir(hudPronto(toque, 'FLARE') && toqueFim.fontes.includes('flare') && toqueFim.hp < 99, 'com "FLARE" aceso, o flare explode no inimigo que toca', { hud: toque, ...toqueFim });

// ── DRONE AUXILIAR (WPN_010) — e ele NÃO copia Triplo nem Cadência da nave ──
await fase(['WPN_010', 'WPN_002', 'WPN_004', 'WPN_004']);
const drone = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  await t.dormir(800);
  const d = s.cartas.drone.sprite;
  const dist = d ? Math.hypot(d.x - s.ship.x, d.y - s.ship.y) : null;
  const tiros = [];
  const orig = s.weapons.disparar.bind(s.weapons);
  s.weapons.disparar = (p) => {
    if (p.origem === 'drone') tiros.push(p.angulo);
    return orig(p);
  };
  const e = t.alvo('drone', s.ship.x + 110, s.ship.y - 12, 99);
  await t.dormir(2600);
  return { existe: !!d, dist, tiros: tiros.length, hp: e.getData('hp') };
});
conferir(drone.existe && drone.dist < 30, 'o drone acompanha a nave de perto', drone);
conferir(drone.tiros >= 1 && drone.tiros <= 3 && drone.hp < 99, 'o drone atira guiado, devagar, um tiro por vez, e acerta', drone);

const desvio = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  s.enemies.enemies.clear(true, true);
  const d = s.cartas.drone.sprite;
  const e = t.alvo('drone', d.x + 8, d.y, 99);
  await t.dormir(400);
  return Math.hypot(d.x - e.x, d.y - e.y);
});
conferir(desvio > 14, 'o drone se afasta de um inimigo encostado', desvio);

// Inimigo vindo em LINHA RETA na direção do drone: ele sai da FRENTE (para o lado da trajetória), não recua.
const lateral = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  s.enemies.enemies.clear(true, true);
  await t.dormir(500);
  const d = s.cartas.drone.sprite;
  const x0 = d.x;
  const y0 = d.y;
  const e = t.alvo('drone', d.x + 70, d.y + 2, 99);
  e.body.setVelocity(-90, 0);
  let maxDx = 0;
  let maxDy = 0;
  let menor = 999;
  for (let i = 0; i < 40; i++) {
    maxDx = Math.max(maxDx, Math.abs(d.x - x0));
    maxDy = Math.max(maxDy, Math.abs(d.y - y0));
    menor = Math.min(menor, Math.hypot(d.x - e.x, d.y - e.y));
    await t.dormir(30);
  }
  return { maxDx: Math.round(maxDx), maxDy: Math.round(maxDy), menor: Math.round(menor) };
});
conferir(lateral.maxDy > lateral.maxDx && lateral.maxDy >= 8, 'com o inimigo vindo reto, o drone desvia para o lado, não para trás', lateral);

// ── ELÉTRICO (EFF_011): trava movimento e tiro ──
await fase(['EFF_011']);
const trava = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('canhoneira', 300, 90, 99);
  e.body.setVelocity(-40, 0);
  await t.dormir(100);
  e.setData('cooldown', 0.25);
  s.cartas.eletrico.eletrificar(e, false, 0);
  const x0 = e.x;
  await t.dormir(250);
  const travado = { dx: Math.abs(e.x - x0), cd: e.getData('cooldown'), tiros: s.enemies.enemyBullets.countActive(true) };
  await t.dormir(400);
  return { travado, vx: e.body.velocity.x };
});
conferir(trava.travado.dx < 0.5 && trava.travado.cd === 0.25 && trava.travado.tiros === 0, 'eletrificado não anda nem atira', trava);
conferir(trava.vx === -40, 'ao destravar, volta a andar no rumo de antes', trava);

// ── ARCO EM CADEIA (EFF_012): no máximo 3 saltos, sem recursão ──
await fase(['EFF_011', 'EFF_012']);
const arco = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const fila = [0, 1, 2, 3, 4, 5].map((i) => t.alvo('drone', 200 + i * 20, 60, 99));
  s.cartas.eletrico.eletrificar(fila[0], true, 0);
  await t.dormir(60);
  return fila.map((e) => (e.getData('eletrificadoAte') ?? 0) > s.time.now);
});
conferir(arco[0] && arco.filter(Boolean).length === 4, 'o arco salta para no máximo 3 e não recursa', arco);

// ── SOBRECARGA (EFF_013): o pulso fere e NÃO eletrifica ──
await fase(['EFF_011', 'EFF_012', 'EFF_013']);
const pulso = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const a = t.alvo('drone', 200, 150, 99);
  const b = t.alvo('drone', 215, 150, 99);
  s.cartas.eletrico.eletrificar(a, false, 0);
  s.matarInimigo(a);
  await t.dormir(120);
  return { hp: b.getData('hp'), eletrificado: (b.getData('eletrificadoAte') ?? 0) > s.time.now };
});
conferir(pulso.hp === 97 && !pulso.eletrificado, 'o pulso da Sobrecarga fere e não eletrifica', pulso);

// ── MINICHEFE leva o choque mas não trava ──
const aranha = await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('aranha', 300, 170, 99);
  s.cartas.eletrico.eletrificar(e, false, 0);
  return { travado: (e.getData('travadoAte') ?? 0) > s.time.now, eletrificado: (e.getData('eletrificadoAte') ?? 0) > s.time.now };
});
conferir(!aranha.travado && aranha.eletrificado, 'a minichefe leva o choque mas não trava', aranha);

// ── BOMBA EXTRA (DEF_005 ×2): 3 + 2 na hora, e de novo a cada vida ──
await fase(['DEF_005', 'DEF_005']);
const bombas = await page.evaluate(() => {
  const s = window.__teste.cena();
  const agora = s.bombs;
  s.bombs = 0;
  s.invulnerableUntil = 0;
  s.damageShip();
  return { agora, naVidaNova: s.bombs };
});
conferir(bombas.agora === 5 && bombas.naVidaNova === 5, 'Bomba Extra ×2: 5 bombas, e 5 de novo na vida nova', bombas);

// ── A AURA DO CASCO (§4.3b) ──
await fase(['DEF_001']);
// Sem os i-frames: com eles a nave PISCA, e a aura (que pisca junto, de propósito) seria lida apagada.
await page.evaluate(() => {
  window.__teste.cena().invulnerableUntil = 0;
});
await page.waitForTimeout(300);
const naveCasco = await page.evaluate(() => ({ x: window.__teste.cena().ship.x, y: window.__teste.cena().ship.y }));
await foto('aura-do-casco', naveCasco.x, naveCasco.y, 70, 40);
const aura = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const antes = s.cartas.aura.visivel && s.cartas.aura.img.visible;
  const vidas = s.lives;
  s.invulnerableUntil = 0;
  s.damageShip();
  await t.dormir(100);
  return { antes, depois: s.cartas.aura.img.visible, vidas, vidasDepois: s.lives };
});
conferir(aura.antes && !aura.depois && aura.vidas === aura.vidasDepois, 'a aura aparece com o Casco pronto e some quando ele quebra', aura);

// ── PROPULSORES (MOV_001): o jato da nave humana fica AZUL (04/10) — na mão desde o início e ao escolher no meio ──
await fase([]);
const jato = await page.evaluate(() => {
  const s = window.__teste.cena();
  const antes = s.ship.anims.currentAnim?.key;
  s.cartas.aplicar('MOV_001');
  return { antes, depois: s.ship.anims.currentAnim?.key };
});
conferir(!jato.antes?.endsWith('-azul') && jato.depois === `${jato.antes}-azul`, 'Propulsores: o jato da nave humana fica azul', jato);
// A carta JÁ NA MÃO (vinda de uma fase anterior): o `fase()` zera a mão, então este começa a fase à mão.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  const velha = g.scene.getScene('Game');
  if (velha) velha.cartas = undefined;
});
await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
await page.evaluate(() => {
  const g = window.__game;
  g.registry.set('cartas', ['MOV_001']);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
const jatoDeAntes = await page.evaluate(() => window.__game.scene.getScene('Game').ship.anims.currentAnim?.key);
conferir(jatoDeAntes?.endsWith('-azul'), 'Propulsores já na mão: a fase começa com o jato azul', jatoDeAntes);

// ── DASH (MOV_003): a tecla E (03/10) na direção segurada, avanço curto, invulnerável, espera ──
async function dash(tecla) {
  await page.keyboard.down(tecla);
  await page.keyboard.press('KeyE');
  await page.keyboard.up(tecla);
}
const xDaNave = () => page.evaluate(() => window.__teste.cena().ship.x);

await fase([]);
let x0 = await xDaNave();
await dash('KeyD');
await page.waitForTimeout(300);
const semCarta = (await xDaNave()) - x0;

await fase(['MOV_003']);
x0 = await xDaNave();
await dash('KeyD');
await page.waitForTimeout(20);
const naveDash = await page.evaluate(() => ({ x: window.__teste.cena().ship.x, y: window.__teste.cena().ship.y }));
await foto('dash-fantasmas', naveDash.x - 15, naveDash.y, 90, 40);
await page.waitForTimeout(280);
const comDash = (await xDaNave()) - x0;
conferir(semCarta < 15 && comDash >= 30, 'E: o dash avança ~40px (sem a carta, nada)', { semCarta, comDash });

const hud = await page.evaluate(() => window.__teste.cena().hud.text);
x0 = await xDaNave();
await dash('KeyD');
await page.waitForTimeout(300);
const naEspera = (await xDaNave()) - x0;
conferir(hudContando(hud, 'DASH') && naEspera < 15, 'na espera (8s), o E não dispara e a HUD conta a recarga (DASH Ns)', { hud, naEspera });
await page.waitForTimeout(8000);
const hudDepois = await page.evaluate(() => window.__teste.cena().hud.text);
conferir(hudPronto(hudDepois, 'DASH'), 'passada a espera, "DASH" acende na HUD', hudDepois);

await dash('KeyW');
await page.waitForTimeout(40); // o dash começa no quadro SEGUINTE ao E (o leitor entrega a borda no update)
const inv =await page.evaluate(() => {
  const s = window.__teste.cena();
  s.invulnerableUntil = 0;
  const antes = s.lives;
  s.damageShip();
  return { antes, depois: s.lives };
});
conferir(inv.antes === inv.depois, 'durante o dash a nave não leva dano', inv);

// ─── FIM ───

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
