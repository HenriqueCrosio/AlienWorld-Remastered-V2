// POR QUE ALGUNS LANCA-MISSEIS NAO ATIRAM. Envelopa o `fireAt` do TerrainSystem e, a cada
// frame, guarda para cada prop que atira o motivo de ele NAO estar podendo disparar.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
const PX = Number(process.argv[2] ?? 70);
const respirar = () => page.evaluate((px) => { const s=window.__game.scene.getScenes(true)[0]; if(s.lives!==undefined) s.lives=9; if(s.player) s.player.x = px; }, PX);
const t = () => page.evaluate(() => Number((window.__game.scene.getScenes(true)[0].elapsed ?? 0).toFixed(1)));

// espera a cena existir DE VERDADE: `press m` e assincrono e o evaluate seguinte corria antes.
for (let i = 0; i < 60; i++) {
  const pronto = await page.evaluate(() => !!(window.__game && window.__game.scene.getScene('Game') && window.__game.scene.getScene('Game').terrain));
  if (pronto) break;
  await page.waitForTimeout(250);
}
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__lanca = { nasceram: 0, atiraram: 0, porProp: new Map(), amostras: [] };
  const origSpawn = s.terrain.spawn.bind(s.terrain);
  s.terrain.spawn = (kind, opts) => {
    const r = origSpawn(kind, opts);
    if (kind === 'lancaMisseis') {
      window.__lanca.nasceram++;
      const p = s.terrain.props.getChildren().at(-1);
      p.setData('__id', window.__lanca.nasceram);
      window.__lanca.porProp.set(window.__lanca.nasceram, { tiros: 0, cdInicial: Number(p.getData('cooldown').toFixed(2)), xMin: 999, playerXmax: 0 });
    }
    return r;
  };
  const origFire = s.terrain.fireAt.bind(s.terrain);
  s.terrain.fireAt = (p, alvo) => {
    const id = p.getData('__id');
    if (id) { window.__lanca.atiraram++; window.__lanca.porProp.get(id).tiros++; }
    return origFire(p, alvo);
  };
  // a cada update, registra a posicao relativa
  const origUpd = s.terrain.update.bind(s.terrain);
  s.terrain.update = (dt, alvo) => {
    for (const o of s.terrain.props.getChildren()) {
      const id = o.getData ? o.getData('__id') : null;
      if (!id || !o.active) continue;
      const r = window.__lanca.porProp.get(id);
      r.xMin = Math.min(r.xMin, Math.round(o.x));
      r.playerXmax = Math.max(r.playerXmax, Math.round(alvo.x));
      // largura da janela em que ele PODE carregar: x<374 e x>playerX
      if (o.x < 374 && o.x > alvo.x) r.janela = (r.janela ?? 0) + dt;
    }
    return origUpd(dt, alvo);
  };
});

// prende a nave no x pedido, todo frame, para medir a janela real de tiro naquela posicao
await page.evaluate((px) => { const s = window.__game.scene.getScene('Game');
  const o = s.terrain.update.bind(s.terrain);
  s.terrain.update = (dt, alvo) => { alvo.x = px; return o(dt, alvo); }; }, PX);
while ((await t()) < 84) { await page.waitForTimeout(700); await respirar(); }
const out = await page.evaluate(() => ({
  nasceram: window.__lanca.nasceram,
  atiraram: window.__lanca.atiraram,
  props: [...window.__lanca.porProp.entries()].map(([id, r]) => ({ id, ...r, janela: Number((r.janela ?? 0).toFixed(2)) })),
}));
console.log('jogador em x=' + PX);
console.log('nasceram ' + out.nasceram + '  |  disparos ' + out.atiraram);
console.table(out.props);
await browser.close();
