// OS ELITES DA F2 NO JOGO REAL (spec 2026-10-05-frente-b-elites-design.md §3.7). Uso: node scripts/probe-elites.mjs
// (com `npm run dev` rodando). Joga no sandbox, fase 2, invulnerável, e chama cada elite pelo EnemySystem.
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({
    fase: 2, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0 },
  }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3'); // invulnerável

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const espera = (ms) => page.waitForTimeout(ms);
const G = () => window.__game.scene.getScene('Game');

// ── O DRONE ──
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 40);
  s.enemies.spawn('droneMineracao', 150);
});
await espera(400);
let d = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  const rochas = s.debris.hazards.getChildren().filter((h) => h.active && h.getData('kind') === 'mineravel');
  return { fase: e?.getData('elite')?.fase, rochas: rochas.length, dentro: rochas[0] ? rochas[0].getBounds().contains(e.x, e.y) : false, acima: rochas[0] ? e.depth > rochas[0].depth : false };
});
conferir(d.fase === 'minerando' && d.rochas === 1 && d.dentro && d.acima, 'o drone nasce minerando, DENTRO da cratera e desenhado por cima da rocha', d);

// A JANELA DE MATAR ANTES: o tiro que cai no drone fere o DRONE, não a rocha (a rocha deixa passar).
await espera(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  s.ship.setPosition(60, e.y);
});
// UM tiro (um toque curto): o primeiro acerto já o acorda.
await page.keyboard.down('Space');
await espera(40);
await page.keyboard.up('Space');
await espera(900);
const janela = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  const r = s.debris.hazards.getChildren().find((h) => h.active && h.getData('kind') === 'mineravel');
  const st = e?.getData('elite');
  return { hpDrone: e?.getData('hp'), maxDrone: st?.hpMax, hpRocha: r?.getData('hp') };
});
conferir(janela.hpDrone < janela.maxDrone && janela.hpRocha === 8, 'atirar no drone minerando fere o drone, e a rocha fica inteira', janela);
await page.evaluate(() => window.__game.scene.getScene('Game').ship.setPosition(40, 40));

// Quebrar a rocha acorda o drone.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.debris.hazards.getChildren().find((h) => h.active && h.getData('kind') === 'mineravel');
  s.killHazard(r);
});
await espera(700);
d = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao')?.getData('elite')?.fase);
conferir(d === 'ataque', 'a rocha quebrada acorda o drone, e depois do alerta ele ataca', d);

// Ele atira enquanto vem.
// Conta os DISPAROS (e não os tiros vivos num instante: uns saem da tela enquanto outros nascem).
await page.evaluate(() => {
  const t = window.__game.scene.getScene('Game').enemies.tiros;
  window.__disparos = 0;
  const orig = t.disparar.bind(t);
  t.disparar = (...a) => (window.__disparos++, orig(...a));
});
// Uma rajada inteira cabe na janela: até `rajadaCadaS` (1,4s) para começar + 2 × `rajadaEspacoS` (0,3s, 06/10).
await espera(2400);
const disparos = await page.evaluate(() => window.__disparos);
conferir(disparos >= 3, 'atacando, ele atira (rajadas)', disparos);

// Perto da nave: pisca; morto NO pisca, não explode (nenhum anel de estilhaços).
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  s.ship.setPosition(e.x - 20, e.y);
});
await espera(150);
const pisca = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  const fase = e?.getData('elite')?.fase;
  s.ferirInimigo(e, 99, 'probe');
  return { fase, vivo: e.active };
});
await espera(800);
const estilhacos = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.countActive(true));
conferir(pisca.fase === 'pisca' && !pisca.vivo && estilhacos === 0, 'morto no pisca: morre sem explodir', { ...pisca, estilhacos });

// Deixado em paz, explode com o anel.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 40);
  s.enemies.spawn('droneMineracao', 120);
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  s.ferirInimigo(e, 1, 'probe'); // ferido: acorda
});
await page.waitForFunction(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'droneMineracao'), null, { timeout: 12000 });
// Os estilhaços são LOSANGOS de cristal (06/10): 5, em anel.
const anel = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'eliteEstilhaco').length);
conferir(anel === 5, 'deixado em paz, ele pisca e explode soltando o anel de losangos de cristal', anel);

// ── A SENTINELA ──
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
  s.ship.setPosition(40, 108);
  s.enemies.spawn('sentinela', 108);
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'fogo', null, { timeout: 10000 });
const escudo = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  const hp0 = e.getData('hp');
  const frente = s.ferirInimigo(e, 1, 'probe', { x: e.x - 40, y: e.y });
  const missil = s.ferirInimigo(e, 1, 'míssil', { x: e.x - 30, y: e.y + 8 });
  const cima = s.ferirInimigo(e, 1, 'probe', { x: e.x, y: e.y - 40 });
  return { frente, missil, cima, perdeu: hp0 - e.getData('hp') };
});
conferir(escudo.frente === 'bloqueado' && escudo.missil === 'bloqueado' && escudo.cima === 'vivo' && escudo.perdeu === 1, 'aberta: o escudo segura a frente (tiro e míssil); por cima passa', escudo);

// O tiro DE VERDADE: a nave na frente, atirando — a vida não cai no fogo.
// A nave NA LINHA dela (o posto tem altura sorteada) e à frente — o tiro vai reto no escudo.
const hpAntes = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  s.ship.setPosition(e.x - 140, e.y);
  return e.getData('hp');
});
await page.keyboard.down('Space');
await espera(700);
await page.keyboard.up('Space');
const real = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  return { hp: e.getData('hp'), fase: e.getData('elite').fase, bloqueados: s.medidas.resumo().bloqueados.tiro ?? 0 };
});
// O tiro de VERDADE tem de ter batido no escudo (as medidas contam), e não só passado ao lado.
conferir(real.bloqueados > 0 && (real.fase !== 'fogo' || real.hp === hpAntes), 'o tiro real de frente morre no escudo (as medidas contam os bloqueios)', { hpAntes, ...real });

// OS DOIS TIROS DO FOGO (05/10 (2), como o golfinho): a bola PESADA lenta do canhão de cima e o LEQUE leve da minigun.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
  // Longe da linha: os tiros mirados não podem morrer na nave antes da contagem.
  s.ship.setPosition(30, 200);
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'fogo', null, { timeout: 15000 });
await espera(1300);
const municao = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const vivos = s.enemies.enemyBullets.getChildren().filter((b) => b.active);
  const vel = (b) => Math.round(Math.hypot(b.body.velocity.x, b.body.velocity.y));
  return {
    // Os tiros DESENHADOS (06/10): o balaço do canhão de cima e o traço da minigun.
    pesados: vivos.filter((b) => b.texture.key === 'eliteTiroBalaco').map(vel),
    leves: vivos.filter((b) => b.texture.key === 'eliteTiroMinigun').map(vel),
    // Os dois canos da minigun: os tiros do leque nascem em alturas diferentes.
    alturas: [...new Set(vivos.filter((b) => b.texture.key === 'eliteTiroMinigun').map((b) => b.getData('oy')))].length,
  };
});
conferir(
  // O leque de 2 (06/10; eram 3).
  municao.pesados.length >= 1 && municao.leves.length >= 2 && municao.alturas >= 2 && Math.max(...municao.pesados) < Math.min(...municao.leves),
  'fogo: o balaço (mais lento) e o leque leve (mais rápido, um tiro de cada cano), alternando',
  municao,
);

// A SOBRECARGA (a 2ª janela): o escudo cai, a minigun varre — e o tiro de frente FERE.
// Conta os DISPAROS de um ciclo inteiro (fogo + sobrecarga): era ~50 — impossível no meio da fase.
// (O contador de disparos já foi instalado na parte do drone — só zera.)
await page.evaluate(() => {
  window.__disparos = 0;
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'sobrecarga', null, { timeout: 10000 });
await espera(600);
const sobrecarga = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  const frente = s.ferirInimigo(e, 1, 'probe', { x: e.x - 40, y: e.y });
  return { frente, tiros: s.enemies.enemyBullets.countActive(true), escudoVisivel: e.getData('elite').escudo?.visible ?? false };
});
conferir(sobrecarga.frente === 'vivo' && sobrecarga.tiros >= 3 && !sobrecarga.escudoVisivel, 'sobrecarga: sem escudo, a varredura no ar, e o tiro de frente fere', sobrecarga);
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase !== 'sobrecarga', null, { timeout: 10000 });
const porCiclo = await page.evaluate(() => window.__disparos);
conferir(porCiclo <= 25, `um ciclo solta ~18 tiros (era ~50): viu ${porCiclo} desde o meio do fogo`, porCiclo);

// A VIDA DO ESCUDO (06/10): golpeado o bastante no fogo, ele QUEBRA — e o tiro de frente passa a ferir; o ciclo
// seguinte ergue um escudo novo, inteiro.
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'fogo', null, { timeout: 15000 });
const quebra = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  const st = e.getData('elite');
  const cheio = st.escudoHp;
  const golpes = [];
  for (let i = 0; i < 40 && st.escudoHp > 0; i++) golpes.push(s.ferirInimigo(e, 1, 'probe', { x: e.x - 40, y: e.y }));
  const hp0 = e.getData('hp');
  const depois = s.ferirInimigo(e, 1, 'probe', { x: e.x - 40, y: e.y });
  return { cheio, golpes: golpes.length, todosBloqueados: golpes.every((g) => g === 'bloqueado'), depois, perdeu: hp0 - e.getData('hp'), visivel: st.escudo.visible };
});
conferir(
  quebra.golpes === quebra.cheio && quebra.todosBloqueados && quebra.depois === 'vivo' && quebra.perdeu === 1 && !quebra.visivel,
  'o escudo tem VIDA: segura `escudoHp` golpes, QUEBRA, e o tiro de frente passa a ferir',
  quebra,
);
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'abrir', null, { timeout: 15000 });
const novo = await page.evaluate(() => {
  const st = window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela').getData('elite');
  return { escudoHp: st.escudoHp, visivel: st.escudo.visible };
});
conferir(novo.escudoHp === quebra.cheio && novo.visivel, 'o ciclo seguinte ergue um escudo NOVO, inteiro', novo);

// Depois dos ciclos, ela vai embora.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 20);
});
await page.waitForFunction(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'sentinela'), null, { timeout: 30000 }).catch(() => {});
const foi = await page.evaluate(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'sentinela'));
conferir(foi, 'depois dos ciclos, a sentinela vai embora rolando', foi);

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
