// A JANELA DE TIRO DOS CANHOES DO CASCO — o assert do defeito relatado jogando em 2026-08-29:
// *"alguns canhoes nao estao atirando"*.
//
// A CAUSA, medida: a janela em que um canhao pode disparar e `(374 - x_do_jogador) / 84`, ou
// seja, ela ENCOLHE conforme o jogador avanca. O cooldown inicial era sorteado em 1,6-2,8s e
// corria desde o nascimento, entao o canhao gastava a janela inteira esperando ficar pronto:
//
//     jogador em x=70   janela 3,62s   4 de 4 atiravam
//     jogador em x=160  janela 2,55s   7 de 7
//     jogador em x=240  janela 1,60s   2 de 4
//     jogador em x=300  janela 0,88s   0 de 7
//
// Quanto mais para a frente se jogava, MENOS o Ato 2 revidava. O conserto parou o relogio fora
// da janela (ver `TerrainSystem.updateTurret`).
//
// ⚠️ ESTE ASSERT SO VALE PORQUE PRENDE A NAVE. Rodar a fase com a sonda parada em x=70 passa
// verde no codigo DEFEITUOSO — foi assim que o bug sobreviveu ate um teste jogado. O que se mede
// aqui e a INDEPENDENCIA da ameaca em relacao a onde o jogador voa.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '✔ ' : '✘ ') + msg); if (!cond) falhas++; };

const medir = async (px) => {
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 384, height: 216 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.keyboard.press('m');
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !!(window.__game?.scene.getScene('Game')?.terrain))) break;
    await page.waitForTimeout(250);
  }
  await page.evaluate((x) => {
    const s = window.__game.scene.getScene('Game');
    window.__c = { nasceram: 0, atiraram: new Set() };
    const oSpawn = s.terrain.spawn.bind(s.terrain);
    s.terrain.spawn = (kind, opts) => {
      const r = oSpawn(kind, opts);
      if (kind === 'lancaMisseis') {
        window.__c.nasceram++;
        s.terrain.props.getChildren().at(-1).setData('__id', window.__c.nasceram);
      }
      return r;
    };
    window.__c.suicidas = 0;
    const oFire = s.terrain.fireAt.bind(s.terrain);
    s.terrain.fireAt = (p, alvo) => {
      const r = oFire(p, alvo);
      const id = p.getData('__id');
      if (id) window.__c.atiraram.add(id);
      return r;
    };
    // ⚠️ O CANO NÃO PODE COMER O PRÓPRIO TIRO. O projétil nasce DENTRO da hitbox de quem o
    // dispara (a boca fica a 7–23px do centro de uma peça de 35px), e a carência de 16px do
    // `enemyBulletHitCover` não dá conta disso quando o tiro sai em diagonal. Medido em
    // 2026-08-30: 2 de cada 4 mísseis morriam com 16–17px andados, comidos pelo próprio dono.
    // Era o *"o canhão está soltando o míssil e explodindo antes de tudo"*.
    const oCover = s.enemyBulletHitCover.bind(s);
    s.enemyBulletHitCover = (bullet, cover) => {
      const dono = bullet.getData('atirador');
      const vivo = bullet.active;
      const r = oCover(bullet, cover);
      if (vivo && !bullet.active && dono === cover) window.__c.suicidas++;
      return r;
    };
    // PRENDE a nave: e o que faz este teste medir a coisa certa.
    const oUpd = s.terrain.update.bind(s.terrain);
    s.terrain.update = (dt, alvo) => { alvo.x = x; return oUpd(dt, alvo); };
  }, px);
  const t = () => page.evaluate(() => Number((window.__game.scene.getScenes(true)[0].elapsed ?? 0).toFixed(1)));
  while ((await t()) < 84) {
    await page.waitForTimeout(700);
    await page.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; if (s.lives !== undefined) s.lives = 9; });
  }
  const r = await page.evaluate(() => ({ nasceram: window.__c.nasceram, atiraram: window.__c.atiraram.size, suicidas: window.__c.suicidas }));
  await browser.close();
  return r;
};

// ⚠️ UMA POR VEZ. Tres headless no mesmo Vite quebram a sonda (licao ja paga nesta fatia).
for (const px of [70, 160, 240, 300]) {
  const r = await medir(px);
  const janela = ((374 - px) / 84).toFixed(2);
  ok(
    r.nasceram > 0 && r.atiraram === r.nasceram,
    `com a nave presa em x=${px} (janela ${janela}s) TODO lanca-misseis atira: ${r.atiraram}/${r.nasceram}`,
  );
  ok(
    r.suicidas === 0,
    `e nenhum missil e comido pelo canhao que o disparou (${r.suicidas} em x=${px})`,
  );
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\n✔ A AMEACA NAO DEPENDE DE ONDE O JOGADOR VOA');
process.exit(falhas ? 1 : 0);
