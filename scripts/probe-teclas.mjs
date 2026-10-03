// O MAPA DE TECLAS (spec 2026-10-03-mapa-de-teclas-design.md): cada ação na tecla certa, a F1 sem tiro automático, a
// mesa imune à tecla segurada e o perfil clássico. Uso: node scripts/probe-teclas.mjs   (com `npm run dev` rodando)
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

async function abrir(url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

/** A fase `stage` LIMPA (humana, roteiro desligado, nave intocável), com as `cartas` na mão. */
async function fase(stage, cartas = []) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    // ⚠️ A INSTÂNCIA DA CENA É REAPROVEITADA: sem apagar, a espera abaixo passaria antes de a cena nova montar.
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((stage) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, stage);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(400);
  await page.evaluate((cartas) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    for (const id of cartas) s.cartas.aplicar(id);
  }, cartas);
}

const cena = (f, arg) => page.evaluate(f, arg);
/** Os tiros da NAVE no ar (sem os das cartas). */
const tirosVivos = () =>
  cena(() => window.__game.scene.getScene('Game').weapons.bullets.getChildren().filter((b) => b.active && !b.getData('origem')).length);
/** Apaga os tiros no ar — para medir se nasce algum DEPOIS. */
const apagarTiros = () =>
  cena(() => window.__game.scene.getScene('Game').weapons.bullets.getChildren().forEach((b) => b.setActive(false).setVisible(false)));
/** A nave parada no meio da tela (o chão da F1 empurra para cima e confundiria a medida do flap). */
const naveNoMeio = () =>
  cena(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(80, 90);
    s.ship.body.setVelocity(0, 0);
  });

await abrir('http://localhost:5173/');

// ── 1. F1: o Espaço ATIRA e não faz flap; sem ele, nada sai; o W faz o flap ──
await fase(1);
await naveNoMeio();
await page.keyboard.down('Space');
await page.waitForTimeout(300);
const f1 = await cena(() => ({ vy: window.__game.scene.getScene('Game').ship.body.velocity.y }));
const tirosF1 = await tirosVivos();
await page.keyboard.up('Space');
conferir(tirosF1 > 0 && f1.vy > -100, 'F1: o Espaço atira e não impulsiona a nave', { tirosF1, vy: f1.vy });
await page.waitForTimeout(150);
await apagarTiros();
await naveNoMeio();
await page.waitForTimeout(600);
const semTiro = await tirosVivos();
conferir(semTiro === 0, 'F1: sem o Espaço a nave não atira sozinha (o tiro automático saiu)', semTiro);
await naveNoMeio();
await page.keyboard.press('KeyW');
await page.waitForTimeout(40);
const vyFlap = await cena(() => window.__game.scene.getScene('Game').ship.body.velocity.y);
conferir(vyFlap < -100, 'F1: o W faz o flap', vyFlap);

// ── 2. Shift solta a bomba ──
await fase(2);
const bombas0 = await cena(() => window.__game.scene.getScene('Game').bombs);
await page.keyboard.press('Shift');
await page.waitForTimeout(150);
const bombas1 = await cena(() => window.__game.scene.getScene('Game').bombs);
conferir(bombas1 === bombas0 - 1, 'Shift solta uma bomba', { bombas0, bombas1 });

// ── 3. E parado: dash para a FRENTE; F solta o flare ──
await fase(2, ['MOV_003', 'EFF_010']);
const x0 = await cena(() => window.__game.scene.getScene('Game').ship.x);
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
const x1 = await cena(() => window.__game.scene.getScene('Game').ship.x);
conferir(x1 - x0 >= 30, 'E parado: o dash avança ~40px para a frente', { x0, x1 });
await page.keyboard.press('KeyF');
await page.waitForTimeout(150);
const flares = await cena(() =>
  window.__game.scene.getScene('Game').weapons.bullets.getChildren().filter((b) => b.active && b.getData('origem') === 'flare').length,
);
conferir(flares > 0, 'F solta o flare', flares);

// ── 4. Segurar o Espaço quando a mesa abre NÃO escolhe a carta; um toque novo escolhe ──
await fase(2);
await page.keyboard.down('Space');
await cena(() => window.__game.scene.getScene('Game').cartas.abrirMesa('teste', 'MESA DE TESTE'));
await page.waitForTimeout(900);
// A repetição automática do sistema: o Playwright manda `repeat: true` quando a tecla já está descida.
await page.keyboard.down('Space');
await page.keyboard.down('Space');
await page.waitForTimeout(300);
const mesa = await cena(() => {
  const c = (window.__gameHD ?? window.__game).scene.getScene('Cartas');
  return { ativa: c.scene.isActive(), fechando: c.fechando };
});
await page.keyboard.up('Space');
conferir(mesa.ativa && !mesa.fechando, 'segurar o Espaço quando a mesa abre não escolhe a carta', mesa);
// As teclas que a fase captura (setas, WASD) chegam à mesa — até 03/10 o mundo as bloqueava e o cursor não andava.
const cursor = () => cena(() => (window.__gameHD ?? window.__game).scene.getScene('Cartas').cursor);
const c0 = await cursor();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
const c1 = await cursor();
await page.keyboard.press('KeyA');
await page.waitForTimeout(150);
const c2 = await cursor();
conferir(c1 !== c0 && c2 === c0, 'na mesa, → e A movem o cursor', { c0, c1, c2 });
await page.keyboard.press('Space');
await page.waitForTimeout(600);
const escolheu = await cena(() => {
  const g = window.__gameHD ?? window.__game;
  return !g.scene.isActive('Cartas') || g.scene.getScene('Cartas').fechando === true;
});
conferir(escolheu, 'um toque NOVO no Espaço confirma', escolheu);

// ── 5. ?teclas=classico: o Z atira, o Espaço não, e a escolha fica gravada ──
await abrir('http://localhost:5173/?teclas=classico');
await fase(2);
await page.keyboard.down('Space');
await page.waitForTimeout(300);
const comEspaco = await tirosVivos();
await page.keyboard.up('Space');
await page.keyboard.down('KeyZ');
await page.waitForTimeout(300);
const comZ = await tirosVivos();
await page.keyboard.up('KeyZ');
const salvo = await cena(() => localStorage.getItem('aw.teclas'));
conferir(comEspaco === 0 && comZ > 0 && salvo === 'classico', '?teclas=classico: o Z atira, o Espaço não, e a escolha fica gravada', { comEspaco, comZ, salvo });
await abrir('http://localhost:5173/?teclas=padrao');

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
