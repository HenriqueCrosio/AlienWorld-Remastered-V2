// AS 7 ARMAS-BASE DO RÓSTER v2 — cadência real e assinatura de cada uma, medidas em jogo.
//
// A sonda equipa cada arma na GameScene (modo LIVRE, gatilho = ESPAÇO segurado), conta os
// DISPAROS reais por instrumentação do `shoot()` e inspeciona os projéteis vivos. Cada arma tem
// um assert do que a DEFINE (armadilha 22 do HANDOFF: sonda que não chega na condição aborta):
//
//   tracer      2 projéteis por disparo, PARALELOS (mesmo ângulo, y ±2)
//   obus        dano 5 viajando devagar
//   agulha      ~6 disparos/s
//   salva       rajada: intervalos curtos (~80ms) E pausas longas (~0.8s) no MESMO trem
//   perfurante  projétil marcado pierce, com o Set de atingidos
//   bateria     4 projéteis por disparo
//   lamina      projétil ALTO (hitbox de mundo ≥ 10px de altura) e teal
//
// ⚠️ O que ela NÃO mede: dano efetivo contra inimigo (o perfurante ferindo 2 enfileirados é
// teste de playtest — inimigo vivo em posição controlada não existe fora da fase real).
import { chromium } from 'playwright';

// WebGL não funciona no Chromium headless puro: força renderização por software.
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Entra no jogo em modo LIVRE (tecla 3 no menu): sem flap, o gatilho é o ESPAÇO.
await page.keyboard.press('3');
await page.waitForTimeout(1600);

const cena = await page.evaluate(() => window.__game.scene.getScenes(true)[0]?.scene.key);
if (cena !== 'Game') {
  console.error(`✘ ABORTADO: esperava a GameScene, estou em ${cena}`);
  await browser.close();
  process.exit(1);
}

// Blinda a sonda: ela mede arma, não sobrevivência (armadilha 19: elimine as outras fontes).
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = 1e15;
  // A sonda MATA inimigos atirando — e um pickup coletado no meio da medição TROCARIA a arma
  // (foi exatamente o que aconteceu na 1ª rodada: o perfurante mediu 3.6/s porque a nave pegou
  // uma especial). A sonda mede arma, não coleta.
  s.pickups.maybeDrop = () => {};
  const w = s.weapons;
  if (!w.__probe) {
    w.__probe = { count: 0, stamps: [] };
    const orig = w.shoot.bind(w);
    w.shoot = (x, y) => {
      w.__probe.count++;
      w.__probe.stamps.push(performance.now());
      orig(x, y);
    };
  }
});

async function medir(id, segundos = 2.5) {
  await page.evaluate((arma) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.weapons.equip(arma);
    s.weapons.__probe.count = 0;
    s.weapons.__probe.stamps = [];
  }, id);

  await page.keyboard.down('Space');
  await page.waitForTimeout(segundos * 1000);

  const amostra = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const vivos = s.weapons.bullets.getChildren().filter((b) => b.active).map((b) => ({
      x: Number(b.x.toFixed(1)),
      y: Number(b.y.toFixed(1)),
      rot: Number(b.rotation.toFixed(3)),
      sy: Number(b.scaleY.toFixed(2)),
      dano: b.getData('damage'),
      pierce: b.getData('pierce') === true,
      temSet: b.getData('hits') instanceof Set,
      corpoH: Number(b.body.height.toFixed(1)),
      vx: Number(b.body.velocity.x.toFixed(0)),
    }));
    return { count: s.weapons.__probe.count, stamps: [...s.weapons.__probe.stamps], vivos, equipada: s.weapons.current.id };
  });

  await page.keyboard.up('Space');
  await page.waitForTimeout(500);

  // A arma medida TEM que ser a equipada — senão a sonda está medindo outra coisa.
  if (amostra.equipada !== id) {
    console.error(`✘ ABORTADO: media '${id}' mas a arma equipada é '${amostra.equipada}'`);
    await browser.close();
    process.exit(1);
  }
  return amostra;
}

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

// ─── tracer ───
{
  const m = await medir('tracer');
  const rate = m.count / 2.5;
  ok(rate > 3.2 && rate < 4.8, `tracer: cadência ${rate.toFixed(1)}/s (~4)`);
  const pares = m.vivos.filter((b) => Math.abs(b.rot) < 0.01);
  const temPar = pares.some((a) => pares.some((b) => a !== b && Math.abs(a.x - b.x) < 6 && Math.abs(Math.abs(a.y - b.y) - 4) < 2));
  ok(temPar, `tracer: par paralelo (y±2) no ar (${pares.length} retos vivos)`);
}

// ─── obus ───
{
  const m = await medir('obus');
  const rate = m.count / 2.5;
  ok(rate > 0.7 && rate < 1.4, `obus: cadência ${rate.toFixed(1)}/s (~1)`);
  ok(m.vivos.some((b) => b.dano === 5 && b.vx < 180), `obus: dano 5 viajando devagar (vx<180)`);
}

// ─── agulha ───
{
  const m = await medir('agulha');
  const rate = m.count / 2.5;
  ok(rate > 5 && rate < 7, `agulha: cadência ${rate.toFixed(1)}/s (~6)`);
}

// ─── salva ───
{
  const m = await medir('salva', 3);
  const gaps = m.stamps.slice(1).map((t, i) => t - m.stamps[i]);
  const curtos = gaps.filter((g) => g < 200).length;
  const longos = gaps.filter((g) => g > 500).length;
  ok(curtos >= 4 && longos >= 2, `salva: rajada (${curtos} intervalos curtos, ${longos} pausas longas)`);
  ok(m.vivos.every((b) => b.dano === undefined || b.dano === 2) && m.count >= 6, `salva: dano 2 por tiro, ${m.count} tiros em 3s`);
}

// ─── perfurante ───
{
  const m = await medir('perfurante');
  ok(m.vivos.some((b) => b.pierce && b.temSet), 'perfurante: projétil marcado pierce com Set de atingidos');
  const rate = m.count / 2.5;
  ok(rate > 2 && rate < 3, `perfurante: cadência ${rate.toFixed(1)}/s (~2.5)`);
}

// ─── bateria ───
{
  const m = await medir('bateria');
  const rate = m.count / 2.5;
  ok(rate > 1.6 && rate < 2.4, `bateria: cadência ${rate.toFixed(1)}/s (~2)`);
  // 4 por disparo: logo após uma salva, 4 projéteis quase na mesma coluna. A amostra é FRÁGIL
  // (um projétil pode morrer numa rocha entre o disparo e a foto), então tenta de novo antes
  // de acusar — acusar um bug que não existe é pior que tentar duas vezes (armadilha 21).
  const coluna = (vivos) =>
    vivos.some((a) => vivos.filter((b) => Math.abs(a.x - b.x) < 14).length >= 4);
  let quatro = coluna(m.vivos);
  if (!quatro) {
    const m2 = await medir('bateria', 1.5);
    quatro = coluna(m2.vivos);
  }
  ok(quatro, `bateria: 4 projéteis por disparo`);
}

// ─── lamina ───
{
  const m = await medir('lamina');
  ok(m.vivos.some((b) => b.sy > 2 && b.corpoH >= 10), `lamina: projétil alto (corpo ≥10px de mundo)`);
  const rate = m.count / 2.5;
  ok(rate > 1.6 && rate < 2.4, `lamina: cadência ${rate.toFixed(1)}/s (~2)`);
}

// A arma volta para a base da NAVE (o jato → tracer) ao final.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].weapons.equipBase());

console.log(falhas === 0 ? '✔ TODAS as 7 armas passaram' : `✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
