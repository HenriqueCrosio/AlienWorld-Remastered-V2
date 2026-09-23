// A FASE 4 COMO ELA ESTA HOJE — a linha de base visual da Fatia 7.
//
// Atalho `L` cai direto na Fase 4. Captura os quatro momentos que o roteiro cria:
// os corredores LARGOS (vao 110), o interior REAGINDO (minas, vao 96), o APERTO (vao 76)
// e o chefao nas duas formas. Nao julga nada — so mostra.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('scripts/_f4', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1200);

// A camera nao sabe jogar: vidas e invulnerabilidade no alto, senao o roteiro vira GameOver
// antes do primeiro tiro. O interesse aqui e o CENARIO.
const manterVivo = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return;
    s.lives = 99;
    s.invulnerableUntil = s.time.now + 60000;
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return { cena: s.scene.key, fase: s.stage?.id, t: Math.round((s.elapsed ?? 0) * 10) / 10 };
  });

// A nave fica parada no meio: o interesse aqui e o CENARIO, nao a pilotagem.
const tiros = [
  { nome: 'a-largos', ate: 6 },
  { nome: 'b-anticorpos', ate: 19 },
  { nome: 'c-aperto', ate: 47 },
  { nome: 'd-pico', ate: 68 },
];

for (const t of tiros) {
  // espera por ESTADO, nunca por relogio cego
  for (let i = 0; i < 400; i++) {
    const e = await estado();
    if (e.cena !== 'Game') break;
    if (e.t >= t.ate) break;
    await manterVivo();
    await page.waitForTimeout(250);
  }
  const e = await estado();
  await page.screenshot({ path: `scripts/_f4/_${t.nome}.png` });
  console.log(`${t.nome.padEnd(14)} t=${e.t}s cena=${e.cena}`);
}

// O CHEFAO: espera a troca de cena/forma em vez de contar segundos.
for (let i = 0; i < 600; i++) {
  const forma = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.boss?.forma ?? null;
  });
  if (forma === 'guardiao') break;
  await manterVivo();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(600);
await page.screenshot({ path: 'scripts/_f4/_e-guardiao.png' });
console.log('e-guardiao     capturado');

await browser.close();
