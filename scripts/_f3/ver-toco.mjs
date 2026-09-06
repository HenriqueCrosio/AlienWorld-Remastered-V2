// O TOCO, ISOLADO: quais pixels da tela são o RABO, e não destroço do fundo.
//
// ⚠️ POR DIFERENÇA, NÃO A OLHO. A quina inferior direita da Fase 3 tem `derelict` pálido do
// parallax passando o tempo todo, e numa captura ele é indistinguível do toco — a rodada de
// 28/08 quase calibrou a pose em cima de um destroço. Aqui a cena é CONGELADA, fotografada com
// o rabo visível e invisível, e a diferença é a silhueta dele. Sem congelar não é diferença:
// o fundo rola entre os dois tiros.
import { chromium } from 'playwright';
import sharp from 'sharp';

const ALVO = Number(process.argv[2] ?? 48.4);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');

const t = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
    return s.elapsed ?? 0;
  });
let voltas = 0;
while ((await t()) < ALVO) {
  if (++voltas > 400) throw new Error('travou');
  await page.waitForTimeout(400);
}

// ⚠️ CONGELA e depois busca por CHAVE: com tudo pausado, `getScenes(true)` volta vazio.
await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
const info = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  window.__rabo = r;
  return { t: Number((s.elapsed ?? 0).toFixed(1)), rabo: r ? { x: Math.round(r.x), y: Math.round(r.y), a: Number(r.angle.toFixed(1)) } : null, casco: Number(s.parallax.cascoReveal.toFixed(2)) };
});
console.log(`t=${info.t}  casco=${info.casco}  rabo=${JSON.stringify(info.rabo)}`);
if (!info.rabo) throw new Error('o rabo não está em cena neste instante');

const com = await page.screenshot();
await page.evaluate(() => window.__rabo.setVisible(false));
await page.waitForTimeout(80);
const sem = await page.screenshot();
await page.evaluate(() => window.__rabo.setVisible(true));

const A = await sharp(com).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const B = await sharp(sem).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = A.info.width;
const H = A.info.height;

// A silhueta: onde os dois tiros diferem, o rabo está visível.
const mascara = Buffer.alloc(W * H * 4);
const topo = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const dif = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    const ehRabo = dif > 12;
    mascara[i] = ehRabo ? 255 : A.data[i] >> 2;
    mascara[i + 1] = ehRabo ? 40 : A.data[i + 1] >> 2;
    mascara[i + 2] = ehRabo ? 40 : A.data[i + 2] >> 2;
    mascara[i + 3] = 255;
    if (ehRabo && !topo.has(x)) topo.set(x, y);
  }
}
await sharp(mascara, { raw: { width: W, height: H, channels: 4 } }).resize(W * 3, H * 3, { kernel: 'nearest' }).png().toFile('scripts/_f3/ver-toco.png');
await sharp(com).resize(W * 3, H * 3, { kernel: 'nearest' }).png().toFile('scripts/_f3/ver-toco-cena.png');

const cols = [...topo.entries()].sort((a, b) => a[0] - b[0]);
const CRISTA = 150; // a crista da faixa do casco (baseY 216 − 66)
const acima = cols.filter(([, y]) => y < CRISTA);
console.log(`o rabo aparece em ${cols.length} colunas (x ${cols[0]?.[0]}..${cols[cols.length - 1]?.[0]})`);
console.log(
  acima.length
    ? `ACIMA da crista (y<${CRISTA}): ${acima.length} colunas, x ${acima[0][0]}..${acima[acima.length - 1][0]}, ponto mais alto y=${Math.min(...acima.map((a) => a[1]))}`
    : `ACIMA da crista: NENHUMA coluna — o toco está inteiro atrás do casco`,
);
console.log('scripts/_f3/ver-toco.png (silhueta em vermelho) + ver-toco-cena.png');
await browser.close();
