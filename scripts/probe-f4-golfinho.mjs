// A SONDA DO GOLFINHO (Fatia 7) — o mini-chefão da câmara B da Fase 4.
//
// O que só se vê rodando: se ele nasce com o evento de t=40, se A e B caem em paredes opostas nos
// DOIS sorteios, se o aviso é intocável, se o X fere e o piso segura em 25, se a fase SEGURA em
// t=49,5 com o mundo rolando, se o duelo cospe rajada, e se a morte solta a fase.
//
// ⚠️ TODO DANO É BALA REAL (a lição da Fase 3: sonda que pula a balística não testa a luta). Os
// únicos atalhos são baixar a vida antes de atirar, para a sonda não depender de mira.
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez.
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
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:error] ${m.text()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});

/** Espera por ESTADO do jogo, nunca por relógio de parede. */
const esperar = async (fn, max = 600) => {
  for (let i = 0; i < max; i++) {
    await blindar();
    const r = await page.evaluate(fn);
    if (r) return r;
    await page.waitForTimeout(100);
  }
  return null;
};

// ─── O SALTO: 1s antes da câmara B, com o estado que o roteiro teria deixado ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 39;
  s.director.skipTo(39);
  s.aplicaCorredorEMoldura(39);
  s.hazardRate = 0;
  s.propRate = 0;
});

// ─── NASCE COM O ROTEIRO ───
const nasceu = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.golfinho ? { t: Math.round(s.elapsed * 10) / 10, sentido: s.golfinho.sentido, segura: s.golfinhoSeguraEm } : null;
}, 100);
console.log('nasceu   ', JSON.stringify(nasceu));
ok(nasceu !== null && nasceu.t >= 40, `o golfinho nasce com o evento de t=40 (${JSON.stringify(nasceu)})`);
ok(nasceu?.segura === 49.5, `o roteiro manda a fase segurar em 49,5 (${nasceu?.segura})`);

// ─── A ARTE: chave de textura e dimensão (a lei 1 do M1) ───
const arte = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const folha = (k) => {
    if (!s.textures.exists(k)) return null;
    const f = s.textures.getFrame(k, 0);
    return { quadros: s.textures.get(k).getFrameNames().length, dim: `${f.width}x${f.height}` };
  };
  const shot = s.textures.exists('shotGolfinho') ? s.textures.get('shotGolfinho').getSourceImage() : null;
  return {
    nado: folha('golfinhoNado'),
    flip: folha('golfinhoFlip'),
    camb: folha('golfinhoCambalhota'),
    shot: shot ? `${shot.width}x${shot.height}` : null,
  };
});
console.log('arte     ', JSON.stringify(arte));
ok(arte.nado?.quadros === 9 && arte.nado?.dim === '80x80', `folha do NADO: 9 quadros de 80×80 (${JSON.stringify(arte.nado)})`);
ok(arte.flip?.quadros === 17 && arte.flip?.dim === '80x80', `folha do FLIP: 17 quadros de 80×80 (${JSON.stringify(arte.flip)})`);
ok(arte.camb?.quadros === 17 && arte.camb?.dim === '80x80', `folha da CAMBALHOTA: 17 quadros de 80×80 (${JSON.stringify(arte.camb)})`);
ok(arte.shot === '13x9', `a bala do golfinho é 13×9, o quadro do bolt2 (${arte.shot})`);

if (!nasceu) {
  console.log(`\n✘ ${falhas} asserts falharam (o golfinho não nasceu — o resto da sonda não tem o que medir)`);
  await browser.close();
  process.exit(1);
}

// ─── OS DOIS SORTEIOS: A e B em paredes opostas ───
const sorteios = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const meio = (s.moldura.superficieTetoEm(320) + s.moldura.superficieChaoEm(320)) / 2;
  const r = { meio };
  for (const sentido of ['desce', 'sobe']) {
    s.spawnGolfinho(sentido, 49.5);
    r[sentido] = { yA: s.golfinho.yA, yB: s.golfinho.yB };
  }
  return r;
});
console.log('sorteios ', JSON.stringify(sorteios));
ok(sorteios.desce.yA < sorteios.meio && sorteios.desce.yB > sorteios.meio, `DESCE: A no teto, B no chão (${JSON.stringify(sorteios.desce)})`);
ok(sorteios.sobe.yA > sorteios.meio && sorteios.sobe.yB < sorteios.meio, `SOBE: A no chão, B no teto (${JSON.stringify(sorteios.sobe)})`);

// ─── O AVISO: intocável, sem barra, hitbox do CORPO ───
const aviso = await page.evaluate(() => {
  const g = window.__game.scene.getScenes(true)[0].golfinho;
  return {
    estado: g.estado,
    tex: g.sprite.texture.key,
    dims: `${g.sprite.displayWidth}x${g.sprite.displayHeight}`,
    escala: g.sprite.scaleX,
    corpo: `${g.sprite.body.width}x${g.sprite.body.height}`,
    corpoLigado: g.sprite.body.enable,
    vulneravel: g.vulneravel,
    barra: g.bar.visible,
    angulo: g.sprite.angle,
  };
});
console.log('aviso    ', JSON.stringify(aviso));
ok(aviso.estado === 'aviso', `começa no AVISO (${aviso.estado})`);
ok(aviso.tex === 'golfinhoNado', `nada com a folha certa, não a textura de erro (${aviso.tex})`);
ok(aviso.dims === '80x80' && aviso.escala === 1, `escala 1, quadro 80×80 (${aviso.dims}, ${aviso.escala})`);
// ⚠️ O ASSERT QUE PEGA A HITBOX DO QUADRO INTEIRO: com a regra padrão ela seria 80×80 e mataria no vazio.
ok(aviso.corpo === '34x20', `a hitbox é do CORPO, 34×20 — não do quadro (${aviso.corpo})`);
ok(aviso.corpoLigado === false && aviso.vulneravel === false, `no aviso ele é intocável (corpo=${aviso.corpoLigado}, vulnerável=${aviso.vulneravel})`);
ok(aviso.barra === false, `no aviso a barra está escondida (${aviso.barra})`);
ok(Math.abs(aviso.angulo) === 90, `a travessia vertical gira 90°, sem serrilhar (${aviso.angulo})`);
await page.waitForTimeout(500);
await page.screenshot({ path: 'probe-f4-golfinho-aviso.png' });

// ─── A BALA ATRAVESSA O AVISO (na espera em B, parado) ───
await esperar(() => window.__game.scene.getScenes(true)[0].golfinho?.estado === 'espera', 100);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  s.ship.body.reset(g.sprite.x - 90, g.sprite.y);
});
await page.keyboard.down('Space');
await page.waitForTimeout(900);
const atravessa = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  return {
    estado: g.estado,
    hp: g.hp,
    alem: s.weapons.bullets.getChildren().filter((b) => b.active && b.x > g.sprite.x + 30).length,
  };
});
await page.keyboard.up('Space');
console.log('atravessa', JSON.stringify(atravessa));
ok(atravessa.hp === 50, `a bala do jogador não fere o aviso (hp=${atravessa.hp})`);
ok(atravessa.alem > 0, `a bala ATRAVESSA o golfinho no aviso (${atravessa.alem} balas além dele)`);

// ─── O X: fere, barra aparece, leque de 3 na metade direita, piso em 25 ───
const x1 = await esperar(() => {
  const g = window.__game.scene.getScenes(true)[0].golfinho;
  return g && g.estado === 'x1' ? { barra: g.bar.visible, corpo: g.sprite.body.enable, vulneravel: g.vulneravel } : null;
}, 100);
console.log('x1       ', JSON.stringify(x1));
ok(x1 !== null && x1.barra && x1.corpo && x1.vulneravel, `no X a barra aparece e ele passa a ferir e apanhar (${JSON.stringify(x1)})`);

await page.evaluate(() => { window.__game.scene.getScenes(true)[0].golfinho._hp = 27; });
let leque = null;
let dimsBala = [];
let hpX = null;
let capturouX = false;
await page.keyboard.down('Space');
for (let i = 0; i < 120; i++) {
  await blindar();
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return null;
    if (g.sprite.x > 120) s.ship.body.reset(Math.max(24, g.sprite.x - 100), g.sprite.y);
    const bs = s.enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'shotGolfinho');
    const grupos = {};
    for (const b of bs) {
      const k = `${Math.round(b.getData('ox'))},${Math.round(b.getData('oy'))}`;
      grupos[k] = (grupos[k] ?? 0) + 1;
    }
    return { estado: g.estado, hp: g.hp, grupos, dims: [...new Set(bs.map((b) => `${b.displayWidth}x${b.displayHeight}`))] };
  });
  if (!r || (r.estado !== 'x1' && r.estado !== 'intervalo' && r.estado !== 'x2')) break;
  hpX = r.hp;
  for (const [k, n] of Object.entries(r.grupos)) if (n >= 3 && !leque) leque = { k, n };
  if (r.dims.length) dimsBala = r.dims;
  if (leque && !capturouX) {
    await page.screenshot({ path: 'probe-f4-golfinho-x.png' });
    capturouX = true;
  }
  await page.waitForTimeout(80);
}
await page.keyboard.up('Space');
console.log('X        ', JSON.stringify({ leque, dimsBala, hpX }));
ok(leque !== null && leque.n === 3, `a cambalhota cospe um LEQUE de 3 (${JSON.stringify(leque)})`);
ok(leque !== null && Number(leque.k.split(',')[0]) > 192, `o leque sai na METADE DIREITA da tela (origem ${leque?.k})`);
ok(dimsBala.length === 1 && dimsBala[0] === '13x9', `a bala em tela é 13×9 (${JSON.stringify(dimsBala)})`);
ok(hpX === 25, `o PISO segura: o X não derruba a vida abaixo de 25 (hp=${hpX})`);

// ─── O DUELO: a fase segura em 49,5, o mundo rola, nada nasce, rajada de 3 ───
const d0 = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  if (!g || g.estado !== 'duelo') return null;
  return {
    now: s.time.now,
    faixa: s.children.list.filter((o) => o.name === 'faixaChao').map((o) => Math.round(o.x)).join(','),
    inimigos: s.enemies.enemies.countActive(),
  };
}, 300);
ok(d0 !== null, 'o golfinho chega ao DUELO');
let dFim = null;
let rajada = null;
let yFora = 0;
for (let i = 0; d0 && i < 300; i++) {
  await blindar();
  const r = await page.evaluate((now0) => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return null;
    s.ship.body.reset(60, 108);
    const bs = s.enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'shotGolfinho');
    const grupos = {};
    for (const b of bs) {
      const k = `${Math.round(b.getData('ox'))},${Math.round(b.getData('oy'))}`;
      grupos[k] = (grupos[k] ?? 0) + 1;
    }
    return {
      dt: s.time.now - now0,
      t: s.elapsed,
      estado: g.estado,
      y: g.sprite.y,
      teto: s.moldura.superficieTetoEm(300) + 22,
      chao: s.moldura.superficieChaoEm(300) - 22,
      grupos,
      faixa: s.children.list.filter((o) => o.name === 'faixaChao').map((o) => Math.round(o.x)).join(','),
      props: s.terrain.props.countActive(),
      perigos: s.debris.hazards.countActive(),
      inimigos: s.enemies.enemies.countActive(),
    };
  }, d0.now);
  if (!r) break;
  if (r.y < r.teto - 1 || r.y > r.chao + 1) yFora++;
  for (const [k, n] of Object.entries(r.grupos)) if (n >= 3 && !rajada) rajada = { k, n };
  dFim = r;
  if (r.dt >= 4000 && rajada) break;
  await page.waitForTimeout(100);
}
console.log('duelo    ', JSON.stringify({ dFim, rajada, yFora }));
await page.screenshot({ path: 'probe-f4-golfinho-duelo.png' });
ok(dFim?.t === 49.5, `a fase SEGURA em t=49,5 durante o duelo (t=${dFim?.t})`);
ok(dFim && dFim.faixa !== d0.faixa, `mas o MUNDO continua rolando — a faixa andou (${d0?.faixa} → ${dFim?.faixa})`);
ok(dFim?.props === 0 && dFim?.perigos === 0, `na arena não nasce mesa nem mina (props=${dFim?.props}, perigos=${dFim?.perigos})`);
ok(dFim && dFim.inimigos <= d0.inimigos, `nenhum inimigo novo entra na arena (${d0?.inimigos} → ${dFim?.inimigos})`);
ok(rajada !== null && rajada.n === 3, `o flip cospe uma RAJADA de 3 (${JSON.stringify(rajada)})`);
ok(yFora === 0, `a altura dele fica presa entre as paredes (${yFora} amostras fora)`);

// ─── PERDER UMA VIDA NO DUELO: ele continua ───
const perda = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.invulnerableUntil = 0;
  const antes = s.lives;
  s.damageShip();
  return { antes, depois: s.lives, estado: s.golfinho?.estado };
});
await blindar();
ok(perda.depois === perda.antes - 1 && perda.estado === 'duelo', `perder uma vida no duelo não o encerra (${JSON.stringify(perda)})`);

// ─── A MORTE POR BALA REAL: +500, e a fase segue de 49,5 ───
const score0 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.golfinho._hp = 4;
  return s.score;
});
let morto = null;
await page.keyboard.down('Space');
for (let i = 0; i < 100; i++) {
  await blindar();
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return { score: s.score };
    s.ship.body.reset(g.sprite.x - 120, g.sprite.y);
    return null;
  });
  if (r) { morto = r; break; }
  await page.waitForTimeout(100);
}
await page.keyboard.up('Space');
ok(morto !== null, 'a bala real mata o golfinho');
ok(morto && morto.score - score0 >= 500, `a morte paga 500 pontos (${score0} → ${morto?.score})`);
const solto = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.elapsed >= 50.4 ? { t: Math.round(s.elapsed * 10) / 10, gap: s.corredorGap, rate: s.corredorRate } : null;
}, 100);
console.log('solto    ', JSON.stringify(solto));
ok(solto !== null, 'morto o golfinho, a fase volta a andar');
ok(solto?.gap === 76 && solto?.rate === 1.9, `o evento de t=50 disparou: o aperto voltou (${JSON.stringify(solto)})`);
await esperar(() => window.__game.scene.getScenes(true)[0].elapsed >= 53, 100);
await page.screenshot({ path: 'probe-f4-golfinho-t50.png' });

// ─── O ESCAPE `G`: a pausa nunca prende a fase ───
const preso = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.spawnGolfinho('desce', s.elapsed);
  return s.elapsed;
});
await page.waitForTimeout(700);
const presoDepois = await page.evaluate(() => window.__game.scene.getScenes(true)[0].elapsed);
ok(presoDepois === preso, `com o golfinho vivo o relógio não passa do teto (${preso} → ${presoDepois})`);
await page.keyboard.press('G');
const escape = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.boss ? { semGolfinho: s.golfinho === null, t: Math.round(s.elapsed) } : null;
}, 150);
console.log('escape   ', JSON.stringify(escape));
ok(escape !== null && escape.semGolfinho, `o G no meio da arena encerra o golfinho e a fase chega ao chefão (${JSON.stringify(escape)})`);

console.log(falhas === 0 ? '\n✔ O GOLFINHO ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
