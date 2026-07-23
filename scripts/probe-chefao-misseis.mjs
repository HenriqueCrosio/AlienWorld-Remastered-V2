// Sonda da SALVA DE MÍSSEIS do chefão da Fase 1 (Torre).
//
// Prova o que o balanceamento exige: a salva NÃO é teleguiada. O teste move a nave para dois
// lugares MUITO diferentes e compara os ângulos das duas salvas — se mudarem com a posição do
// jogador, os mísseis miram, e isso é justamente o que a fatia proíbe.
//
// uso: node scripts/probe-chefao-misseis.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// `practice: true` = treino de chefão: o boss entra em segundos, sem a fase inteira pela frente.
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', {
    stage: 1,
    handling: 'free',
    practice: true,
  });
});
await page.waitForTimeout(600);

/** Prende a nave num ponto e a mantém imortal — a luta corre, mas nada mata a sonda. */
async function ancorar(x, y) {
  await page.evaluate(
    ([px, py]) => {
      const s = window.__game.scene.getScene('Game');
      clearInterval(window.__ancora);
      window.__ancora = setInterval(() => {
        s.invulnerableUntil = 1e12;
        if (s.ship) {
          s.ship.x = px;
          s.ship.y = py;
          s.ship.body?.setVelocity?.(0, 0);
        }
      }, 40);
    },
    [x, y],
  );
}

/** Colhe os ângulos (em graus, arredondados) dos mísseis vivos, esperando até uma salva sair. */
async function colherSalva(rotulo) {
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(100);
    const angulos = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const balas = s?.enemies?.enemyBullets?.getChildren() ?? [];
      return balas
        .filter((b) => b.active && b.getData('missile') === true)
        .map((b) => ({
          ang: Math.round((Math.atan2(b.body.velocity.y, b.body.velocity.x) * 180) / Math.PI),
          tex: b.texture.key,
          corpo: `${Math.round(b.body.width)}x${Math.round(b.body.height)}`,
          ox: b.getData('ox'),
        }));
    });
    // Espera a salva INTEIRA estar no ar (nascem todos no mesmo frame).
    if (angulos.length >= 4) {
      console.log(`${rotulo}: ${angulos.length} mísseis · ângulos ${angulos.map((a) => a.ang).join(', ')}`);
      console.log(`${rotulo}: textura=${angulos[0].tex} corpo=${angulos[0].corpo} ox=${angulos[0].ox}`);
      return angulos;
    }
  }
  throw new Error(`${rotulo}: nenhuma salva de 4 mísseis em 20s`);
}

await ancorar(40, 40);

// O TELÉGRAFO: fotografa a torre no meio da carga (missileCharge > 0), antes de a salva sair.
// Privado em TS, acessível em runtime — é o único jeito de pegar o instante certo.
for (let i = 0; i < 300; i++) {
  await page.waitForTimeout(50);
  const carregando = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game')?.boss;
    return b ? b.missileCharge > 0 : false;
  });
  if (carregando) {
    await page.screenshot({ path: 'scripts/_chefao-telegrafo.png' });
    console.log('telégrafo fotografado: scripts/_chefao-telegrafo.png');
    break;
  }
}

const alta = await colherSalva('nave NO ALTO  (40,40)');
await page.screenshot({ path: 'scripts/_chefao-misseis.png' });

await ancorar(140, 190);
// Deixa a salva anterior sair de cena antes de colher a próxima.
await page.waitForTimeout(2500);
const baixa = await colherSalva('nave EMBAIXO (140,190)');

const a = alta.map((x) => x.ang).sort((p, q) => p - q);
const b = baixa.map((x) => x.ang).sort((p, q) => p - q);
const iguais = a.length === b.length && a.every((v, i) => v === b[i]);

console.log('');
console.log(`NÃO TELEGUIADO: ${iguais ? 'PASS' : 'FALHA'} — [${a}] vs [${b}]`);
console.log(`hitbox própria: ${alta[0].corpo !== '13x9' ? 'PASS' : 'FALHA (herdou o corpo do pool)'}`);
console.log(`carência ox/oy: ${typeof alta[0].ox === 'number' ? 'PASS' : 'FALHA (undefined → NaN)'}`);
console.log('screenshot: scripts/_chefao-misseis.png');

await browser.close();
if (!iguais) process.exit(1);
