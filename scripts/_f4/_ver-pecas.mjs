// FATIA 7 · ONDE AS PEÇAS NOVAS APARECEM na abertura da Fase 4.
// ⚠️ A pergunta dele, e ela é de frequência, não de existência: um prop que passa a cada 20s numa
// fase de 113s aparece 5 vezes — o jogador pode terminar a fase sem ter olhado para ele.
import { chromium } from 'playwright';

const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('[ERRO] ' + e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.keyboard.press('L');
await p.waitForTimeout(400);
await p.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  setInterval(() => { s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER; }, 150);
});

const CHAVES = ['f4Ponte', 'f4Ganglio', 'costela', 'orgao', 'maquinario', 'derelict'];
const visto = Object.fromEntries(CHAVES.map((k) => [k, 0]));
const quadros = { total: 0 };
let ultimo = -1;

for (let i = 0; i < 240; i++) {
  const q = await p.evaluate((CH) => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return null;
    const imgs = s.children.list.filter((o) => o.type === 'Image' && o.visible);
    const naTela = (o) => o.x > -o.displayWidth / 2 && o.x < 384 + o.displayWidth / 2;
    const r = {};
    for (const k of CH) r[k] = imgs.filter((o) => String(o.texture?.key).startsWith(k) && naTela(o)).length;
    return { t: +(s.elapsed ?? 0).toFixed(1), r };
  }, CHAVES);
  if (!q) break;
  if (q.t > 36) break;
  quadros.total++;
  for (const k of CHAVES) if (q.r[k] > 0) visto[k]++;
  if (Math.floor(q.t) !== ultimo && Math.floor(q.t) % 4 === 0) {
    ultimo = Math.floor(q.t);
    console.log(`t=${String(q.t).padStart(4)}  ` + CHAVES.map((k) => `${k}:${q.r[k]}`).join('  '));
  }
  await p.waitForTimeout(120);
}

console.log('\nQUANTO DO TEMPO cada peça está na tela, de t=0 a t=36 (a câmara A inteira):');
for (const k of CHAVES) {
  const pc = Math.round((visto[k] / Math.max(1, quadros.total)) * 100);
  console.log(`  ${k.padEnd(14)} ${String(pc).padStart(3)}%`);
}
await b.close();
