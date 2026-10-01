// As TRÊS VOZES na CAMADA HD, nas telas reais (spec 2026-09-29-tres-vozes-camada-hd-design.md §6).
// Uso: node scripts/probe-vozes.mjs [outdir]   (com `npm run dev` rodando)
// Cobra, em duas janelas (1152×648 → s=3 e 1920×1080 → s=5): zero erro · a escala da camada · o texto NA camada e
// nenhum no mundo · a HUD com "ZERO-G" · o mouse na mesa · o fade apagando o texto · a camada refeita ao redimensionar.
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const falhas = [];
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push(msg); };

const limpar = () => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.scene.getScenes(false).filter((s) => s.sys.isPaused()).forEach((s) => s.scene.stop());
};
/** Quantos textos a cena do mundo tem NA CAMADA (as irmãs dela) e quantos sobraram NO MUNDO. */
const contar = (key) => {
  const g = window.__game, hd = window.__gameHD;
  const tipo = (o) => o.type === 'Text' || o.type === 'BitmapText';
  const noMundo = g.scene.getScene(key).children.list.filter(tipo).length;
  const naCamada = hd.scene.getScenes(true).filter((s) => s.scene.key.startsWith(`irma:${key}:`))
    .reduce((n, s) => n + s.children.list.filter(tipo).length, 0);
  return { noMundo, naCamada };
};

for (const [W, H, esperado] of [[1152, 648, 3], [1920, 1080, 5]]) {
  const tag = `${W}x${H}`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);
  const shot = (t) => page.screenshot({ path: `${OUT}/vozes-${tag}-${t}.png` });

  const s = await page.evaluate(() => window.__gameHD && window.__gameHD.canvas.width / 384);
  cobrar(s === esperado, `${tag}: a camada existe na escala ${esperado} (veio ${s})`);

  const menu = await page.evaluate(contar, 'Menu');
  cobrar(menu.naCamada > 0 && menu.noMundo === 0, `${tag}: menu — ${menu.naCamada} textos na camada, ${menu.noMundo} no mundo`);
  await shot('menu');

  // A FASE: HUD + alerta.
  await page.evaluate(limpar);
  await page.evaluate(() => {
    const g = window.__game; g.registry.set('cartas', []); g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = s.time.now + 120000;
    s.showBanner('ALERTA · CAPITÂNIA À FRENTE', 0xffb040);
  });
  await page.waitForTimeout(400);
  const jogo = await page.evaluate(contar, 'Game');
  const hud = await page.evaluate(() => window.__game.scene.getScene('Game').hud.text);
  cobrar(jogo.naCamada > 0 && jogo.noMundo === 0, `${tag}: fase — ${jogo.naCamada} textos na camada, ${jogo.noMundo} no mundo`);
  cobrar(hud.includes('ZERO-G'), `${tag}: a HUD diz ZERO-G ("${hud.slice(0, 24)}…")`);
  await shot('jogo');

  // A FAIXA DE PROGRESSO não encosta na HUD (30/09): o texto mora na camada, POR CIMA do mundo, e o contorno das
  // letras cortava a faixa — lia como sublinhado. Mede a tinta ciana do texto (só a camada) contra a linha da faixa.
  const faixaY = await page.evaluate(() => window.__game.scene.getScene('Game').progressFill.y);
  await page.evaluate(() => { document.querySelectorAll('canvas')[0].style.visibility = 'hidden'; });
  const soTexto = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: (H / 216) * 20 } });
  await page.evaluate(() => { document.querySelectorAll('canvas')[0].style.visibility = ''; });
  const { data: px, info: dim } = await sharp(soTexto).raw().toBuffer({ resolveWithObject: true });
  let pe = 0; // a última linha de tela com tinta ciana da HUD
  for (let y = 0; y < dim.height; y++)
    for (let x = 0; x < dim.width; x++) {
      const i = (y * dim.width + x) * dim.channels;
      if (px[i + 1] > 150 && px[i + 2] > 150) { pe = y; break; }
    }
  const peMundo = (pe + 1) / (H / 216);
  cobrar(faixaY - peMundo >= 1, `${tag}: a faixa de progresso (y=${faixaY}) fica ≥1px abaixo da tinta da HUD (pé em ${peMundo.toFixed(1)})`);

  // A MESA, com o mouse sobre o meio da 3ª carta (as cartas moram no grid fino — a posição sai da geometria).
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game'); s.scene.pause();
    s.scene.launch('Cartas', { opcoes: ['WPN_001', 'EFF_006', 'DEF_003'], titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
  });
  await page.waitForTimeout(900);
  const alvo = await page.evaluate(() => {
    const hd = window.__gameHD;
    const c = hd.scene.getScene('Cartas');
    const g = c.geometria();
    const k = g.cartas[2];
    const r = hd.canvas.getBoundingClientRect();
    const z = c.cameras.main.zoom * (r.width / hd.canvas.width);
    return { x: r.left + (k.x + g.moldura.w / 2) * z, y: r.top + (k.y + g.moldura.h / 2) * z };
  });
  await page.mouse.move(alvo.x, alvo.y);
  await page.waitForTimeout(250);
  const mesa = await page.evaluate(() => {
    const hd = window.__gameHD;
    const c = hd.scene.getScene('Cartas');
    const ordem = hd.scene.getScenes(true).map((s) => s.scene.key);
    return {
      cursor: c.cursor, mouse: hd.canvas.style.pointerEvents, ativa: c.sys.isActive(),
      noTopo: ordem[ordem.length - 1] === 'Cartas',
    };
  });
  cobrar(mesa.ativa && mesa.cursor === 2 && mesa.mouse === 'auto', `${tag}: mesa na camada, mouse sobre a 3ª carta → cursor ${mesa.cursor}`);
  cobrar(mesa.noTopo, `${tag}: a mesa desenha por cima do texto da fase`);
  await shot('mesa');
  await page.evaluate(() => { window.__game.scene.stop('Cartas'); });
  await page.waitForTimeout(300);
  const mouseDepois = await page.evaluate(() => ({
    mouse: window.__gameHD.canvas.style.pointerEvents,
    ativa: window.__gameHD.scene.getScene('Cartas').sys.isActive(),
  }));
  cobrar(mouseDepois.mouse === 'none' && !mouseDepois.ativa, `${tag}: fechar a mesa no mundo fecha a da camada e devolve o mouse`);

  // O FADE: o texto da fase apaga junto com a câmera do mundo.
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.scene.resume(); s.cameras.main.fadeOut(300, 0, 0, 0); });
  await page.waitForTimeout(600);
  const alpha = await page.evaluate(() => {
    const irma = window.__gameHD.scene.getScenes(true).find((s) => s.scene.key.startsWith('irma:Game:'));
    return irma ? irma.cameras.main.alpha : null;
  });
  cobrar(alpha !== null && alpha < 0.05, `${tag}: fade de saída → alpha do texto ${alpha}`);

  // A CUTSCENE: o letreiro.
  await page.evaluate(limpar);
  await page.evaluate(() => { window.__game.scene.start('Interlude', { score: 12400, handling: 'diegetico' }); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Interlude');
    s.tweens.killTweensOf(s.banner);
    s.aviso('CAPITÂNIA AURORA · CONVÉS DE POUSO', 0x3ee0f0);
  });
  await page.waitForTimeout(300);
  await shot('cutscene');

  // O FIM DE FASE.
  await page.evaluate(limpar);
  await page.evaluate(() => { window.__game.scene.start('GameOver', { score: 48210, handling: 'diegetico', victory: true, stage: 2, ship: 'humana' }); });
  await page.waitForTimeout(2500);
  const fim = await page.evaluate(contar, 'GameOver');
  cobrar(fim.naCamada > 0 && fim.noMundo === 0, `${tag}: fim de fase — ${fim.naCamada} textos na camada, ${fim.noMundo} no mundo`);
  await shot('fim');

  // A JANELA: só na primeira, cresce para 1920×1080 e a camada se refaz em s=5.
  if (esperado === 3) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(800);
    const depois = await page.evaluate(() => window.__gameHD.canvas.width / 384);
    cobrar(depois === 5, `${tag}: redimensionar para 1920×1080 → a camada vai para s=${depois}`);
    await page.screenshot({ path: `${OUT}/vozes-${tag}-redimensionada.png` });
  }

  cobrar(erros.length === 0, `${tag}: zero erro${erros.length ? ` (${erros.slice(0, 3).join(' | ')})` : ''}`);
  await page.close();
}
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
