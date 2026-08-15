// O KAMIKAZE, de perto e sem depender do piloto automático.
//
// A probe-stage2 depende de a corrida chegar viva até a onda de kamikaze (t=20/32/67/76) — e
// quando ela morre antes, o screenshot não tem o inimigo que se queria julgar. Aqui eles são
// spawnados à mão, em alturas conhecidas, e o script espera o suficiente para eles VIRAREM em
// direção ao jogador — que é o estado em que o defeito de rotação aparecia (voando para a
// esquerda, o giro de ~180° entregava a nave de ponta-cabeça).
//
// A troca do kamikaze é GLOBAL (mesma chave nas três fases), então ele precisa ser julgado
// contra cada fundo: o azul da Fase 1 e o cinturão escuro da Fase 2 pedem coisas diferentes de
// uma arte clara.
//
// uso: node scripts/_probe-kami.mjs <saida.png> [1|2]
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
// ⚠️ A FASE 1 NÃO TEM KAMIKAZE (`STAGE_1` não traz nenhuma onda dele) — ele vive nas fases 2, 3
// e 4, e sai do hangar da Capitânia. O plano da fatia afirma o contrário porque rotulou os
// roteiros com um deslocamento de um.
const ATALHO = { 2: 'V', 3: 'M', 4: 'L' };
const fase = process.argv[3] ?? '2';
const tecla = ATALHO[fase];
if (!tecla) throw new Error(`fase ${fase} sem atalho de menu (o kamikaze existe na 2, 3 e 4)`);
await page.keyboard.press(tecla);
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  for (const y of [70, 110, 150]) s.enemies.spawn('kamikaze', y);
});

// Tempo de eles acelerarem e fazerem a curva: é voando para a ESQUERDA que o sprite era
// entregue invertido, então é esse o instante que interessa.
await page.waitForTimeout(1600);

const dados = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return (s.enemies.enemies.getChildren() ?? [])
    .filter((o) => o.active && o.getData('kind') === 'kamikaze')
    .map((o) => ({
      x: Number(o.x.toFixed(1)),
      y: Number(o.y.toFixed(1)),
      rot: Number(((o.rotation * 180) / Math.PI).toFixed(1)),
      flipY: o.flipY,
      largura: Number(o.displayWidth.toFixed(1)),
      altura: Number(o.displayHeight.toFixed(1)),
      hitbox: `${o.body.width.toFixed(1)}x${o.body.height.toFixed(1)}`,
    }));
});

console.log('kamikazes em voo:');
for (const d of dados) console.log(' ', JSON.stringify(d));

const cru = await page.screenshot();
await sharp(cru).toFile(process.argv[2]);

// E um zoom em cada um: a 25px de largura numa tela de 384, olho nenhum julga no screenshot cheio.
const m = await sharp(cru).metadata();
const escala = m.width / 384;
for (let i = 0; i < dados.length; i++) {
  const d = dados[i];
  const lado = 60;
  const left = Math.max(0, Math.round(d.x * escala - (lado * escala) / 2));
  const top = Math.max(0, Math.round(d.y * escala - (lado * escala) / 2));
  const w = Math.min(Math.round(lado * escala), m.width - left);
  const h = Math.min(Math.round(lado * escala), m.height - top);
  await sharp(cru)
    .extract({ left, top, width: w, height: h })
    .resize(w * 2, h * 2, { kernel: 'nearest' })
    .toFile(process.argv[2].replace('.png', `-zoom${i}.png`));
}

await browser.close();
