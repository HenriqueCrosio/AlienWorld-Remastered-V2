// UM GIF DA CARTA EM JOGO, na velocidade real: o relógio do Phaser é CONGELADO e avançado à mão, 1/60s por passo, com
// uma foto do mundo a cada 3 passos (20 qps no GIF: o atraso do GIF é em centésimos, e 50ms é exato). A captura é
// lenta (SwiftShader), mas o jogo não sabe disso. A cena é a F2 limpa (como a probe-cartas-novas): roteiro desligado,
// nave intocável, alvos postos à mão.
//
// PAINÉIS EMPILHADOS: cada cenário × cada modo de arte (`ExplosaoDoJogador.arte`) vira um painel, um em cima do outro,
// com o nome em cima — a comparação lado a lado.
//
// Uso: node scripts/_gif-cartas.mjs <out.gif> <cenarios> [segundos] [modos] [nave]   (npm run dev rodando)
//   cenários (separados por vírgula): explosivo · fragmentado · emcadeia · missil · missil1 · missil2 · missilvolta · flare
//   modos: jogo,variada,aprovada (padrão: aprovada) · nave: humana | alienigena
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENARIO = 'fragmentado', SEG = '2.5', MODOS = 'aprovada', NAVE = 'humana'] = process.argv.slice(2);

// nome · cartas · se a nave atira · os alvos · [segundo, lançador] = forçar um disparo de carta naquele instante (a
// espera real é de 3s no míssil, e o flare é do jogador) · a janela do mundo (padrão abaixo).
// Alvo: [x, dy da nave, vida, tipo?, vx?, vy?, teto?] — sem tipo é drone PARADO; com velocidade, ele anda; o teto de
// velocidade é ENCENAÇÃO do GIF (o kamikaze do jogo voa a 190, e o míssil, a 150, não o alcança na volta).
const CENARIOS = {
  explosivo: { nome: 'EXPLOSIVO', cartas: ['EFF_001'], atira: true, alvos: 'cacho' },
  fragmentado: { nome: 'EXPLOSIVO + EXPLOSÃO MAIOR + FRAGMENTADO', cartas: ['EFF_001', 'EFF_002', 'EFF_003'], atira: true, alvos: 'cacho' },
  emcadeia: { nome: 'INCENDIÁRIO + COMBUSTÃO + EM CADEIA + EXPLOSIVO', cartas: ['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001'], atira: true, alvos: 'cacho' },
  missil: { nome: 'MÍSSIL ×2', cartas: ['WPN_009', 'WPN_009'], atira: false, alvos: 'espalhado', forcar: [[0.1, 'missil'], [1.6, 'missil']] },
  missil1: { nome: 'MÍSSIL — tiro único', cartas: ['WPN_009'], atira: false, alvos: 'um', forcar: [[0.1, 'missil']] },
  missil2: { nome: 'MÍSSIL ×2 — um alvo para cada, o 2º sai depois', cartas: ['WPN_009', 'WPN_009'], atira: false, alvos: 'dois', forcar: [[0.1, 'missil']] },
  missilvolta: { nome: 'MÍSSIL — o alvo desvia (encenado): erra, faz a curva e volta', cartas: ['WPN_009'], atira: false, alvos: 'cruzando', desvio: true, forcar: [[0.1, 'missil']], clip: { x: 46, y: 20, w: 270, h: 176 } },
  drone: { nome: 'DRONE — nave humana: tiro laranja; desvia de quem passa perto', cartas: ['WPN_010'], atira: false, alvos: 'drone', clip: { x: 20, y: 46, w: 250, h: 116 } },
  dronealien: { nome: 'DRONE — nave alien: tiro ciano', cartas: ['WPN_010'], atira: false, alvos: 'drone', nave: 'alienigena', clip: { x: 20, y: 46, w: 250, h: 116 } },
  eletrico: { nome: 'ELÉTRICO + ARCO EM CADEIA + SOBRECARGA — o raio salta, o pulso fere', cartas: ['EFF_011', 'EFF_012', 'EFF_013'], atira: true, alvos: 'cacho4' },
  eletricotrava: { nome: 'ELÉTRICO — a canhoneira eletrificada para e não atira', cartas: ['EFF_011'], atira: true, alvos: 'canhoneiras' },
  casco: { nome: 'CASCO — a aura pulsa; no golpe, estoura e some (nave humana)', cartas: ['DEF_001'], atira: false, alvos: 'nenhum', forcar: [[1.6, 'golpe']], clip: { x: 40, y: 80, w: 130, h: 56 } },
  cascoalien: { nome: 'CASCO — nave alien', cartas: ['DEF_001'], atira: false, alvos: 'nenhum', nave: 'alienigena', forcar: [[1.6, 'golpe']], clip: { x: 40, y: 80, w: 130, h: 56 } },
  flare: { nome: 'FLARE — na tecla', cartas: ['EFF_010'], atira: false, alvos: 'atras', forcar: [[0.1, 'flare'], [1.2, 'flare']], clip: { x: 0, y: 46, w: 200, h: 116 } },
};
const NOME_MODO = { jogo: 'ANTES — a explosão de sempre', variada: 'A — a de sempre, variando', aprovada: 'A + B — a arte aprovada de cada carta, variando' };
const cenarios = CENARIO.split(',').map((c) => {
  if (!CENARIOS[c]) throw new Error(`cenário desconhecido: ${c}`);
  return CENARIOS[c];
});
const modos = MODOS.split(',');
const paineis = cenarios.flatMap((cen) => modos.map((modo) => ({ cen, modo })));
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
const ZOOM = 2; // o mundo é 384×216; a foto sai em 2× do mundo, sem suavizar
const CLIP_PADRAO = { x: 46, y: 46, w: 270, h: 116 };
const ROTULO = 26;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function gravar(cen, modo) {
  const clip = cen.clip ?? CLIP_PADRAO;
  // A F2 limpa: o roteiro desligado, a nave intocável, as cartas dadas.
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((nave) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: 2, ship: nave, handling: 'diegetico' });
  }, cen.nave ?? NAVE);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(600);
  await page.evaluate(({ cartas, modo, alvos }) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    // Nave intocável SEM i-frames: com eles ela pisca (60ms), e o GIF a pegaria some-aparece.
    s.__golpe = s.damageShip.bind(s);
    s.damageShip = () => {};
    s.invulnerableUntil = 0;
    for (const id of cartas) s.cartas.aplicar(id);
    s.cartas.explosao.arte = modo;
    // O míssil só sai quando o GIF manda (`forcar`); o flare já é só do jogador.
    s.cartas.lancadores.proximoMissil = Infinity;
    const y0 = s.ship.y;
    const x0 = s.ship.x;
    const ALVOS = {
      // um CACHO na linha da nave
      cacho: [[190, 0, 6], [205, -12, 6], [205, 12, 6], [222, -4, 6], [222, 18, 6], [238, -14, 6], [240, 6, 6]],
      cacho4: [[190, 0, 4], [205, -12, 4], [205, 12, 4], [222, -4, 4], [222, 18, 4], [238, -14, 4], [240, 6, 4]],
      // canhoneiras andando e atirando (a trava se vê nelas)
      canhoneiras: [[230, 0, 10, 'canhoneira', -30, 0], [250, -40, 10, 'canhoneira', -30, 0], [250, 40, 10, 'canhoneira', -30, 0]],
      // ESPALHADOS na vertical: o míssil tem que fazer a curva
      espalhado: [[230, -45, 6], [250, 40, 6], [270, -10, 6]],
      um: [[250, -35, 6]],
      dois: [[230, -45, 6], [250, 42, 6]],
      // um drone parado que DESVIA quando o míssil chega (ver `desvio`)
      cruzando: [[250, -20, 2]],
      // dois parados à frente e um que PASSA rente ao drone (ele desvia)
      drone: [[175, -40, 3], [195, 35, 3], [190, -12, 99, 'drone', -70, 0]],
      nenhum: [],
      // ATRÁS da nave: o flare é armadilha para quem persegue
      atras: [[x0 - 30, 0, 1]],
    };
    ALVOS[alvos].forEach(([x, dy, hp, tipo = 'drone', vx = 0, vy = 0, teto]) => {
      s.enemies.spawn(tipo, y0 + dy, x);
      const kids = s.enemies.enemies.getChildren();
      const e = kids[kids.length - 1];
      e.setPosition(x, y0 + dy);
      e.body.setVelocity(vx, vy);
      if (teto) e.body.setMaxVelocity(teto, teto);
      e.setData('hp', hp);
    });
    // Sem o letreiro da fase por cima.
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    // O RELÓGIO À MÃO: o laço do Phaser dorme e cada `step` avança exatamente um quadro.
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  }, { cartas: cen.cartas, modo, alvos: cen.alvos });

  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n) => page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
    }
  }, { n, QUADRO });

  if (cen.atira) await page.keyboard.down('Space'); // a nave atira o tempo todo
  const quadros = [];
  const total = Math.round((Number(SEG) * 60) / POR_FOTO);
  const forcar = [...(cen.forcar ?? [])];
  for (let i = 0; i < total; i++) {
    const seg = (i * POR_FOTO) / 60;
    while (forcar.length && forcar[0][0] <= seg) {
      const [, qual] = forcar.shift();
      await page.evaluate((qual) => {
        const l = window.__game.scene.getScene('Game').cartas.lancadores;
        const agora = window.__game.scene.getScene('Game').time.now;
        if (qual === 'golpe') {
          // Um golpe de verdade (o caminho do dano da cena), para o Casco absorver.
          const s = window.__game.scene.getScene('Game');
          s.invulnerableUntil = 0;
          s.__golpe();
        } else if (qual === 'missil') l.proximoMissil = agora;
        // O flare é do JOGADOR: o GIF "aperta a tecla" (e ignora a espera, para caber no GIF).
        else {
          l.flarePronto = 0;
          l.pediuFlare = true;
        }
      }, qual);
      await passo(1);
      await page.evaluate(() => {
        window.__game.scene.getScene('Game').cartas.lancadores.proximoMissil = Infinity;
      });
    }
    await passo(POR_FOTO);
    // O DESVIO ENCENADO: com o míssil a 30px, o alvo dá uma esquivada rápida para baixo (0,3s) e para — o míssil, com
    // inércia, passa reto, faz a curva e volta.
    if (cen.desvio) {
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        const e = s.enemies.enemies.getChildren().find((x) => x.active);
        const m = s.cartas.lancadores.misseis[0];
        if (!e || !m || e.getData('desviou')) return;
        if (Math.hypot(m.b.x - e.x, m.b.y - e.y) > 30) return;
        e.setData('desviou', true);
        e.body.setVelocity(0, 170);
        s.time.delayedCall(300, () => e.active && e.body.setVelocity(0, 0));
      });
    }
    const foto = await page.screenshot({
      clip: { x: geo.left + clip.x * geo.k, y: geo.top + clip.y * geo.k, width: clip.w * geo.k, height: clip.h * geo.k },
    });
    quadros.push(await sharp(foto).resize(clip.w * ZOOM, clip.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  if (cen.atira) await page.keyboard.up('Space');
  return quadros;
}

const porPainel = [];
for (const { cen, modo } of paineis) porPainel.push(await gravar(cen, modo));
await browser.close();

// Os painéis empilhados, cada um com o nome em cima (o do cenário, ou o do modo quando o cenário é um só).
const larguras = await Promise.all(porPainel.map(async (q) => (await sharp(q[0]).metadata()).width));
const alturas = await Promise.all(porPainel.map(async (q) => (await sharp(q[0]).metadata()).height));
const W = Math.max(...larguras);
const comRotulo = paineis.length > 1;
const nomeDo = ({ cen, modo }) => (cenarios.length > 1 ? cen.nome : NOME_MODO[modo] ?? modo);
const rotulos = await Promise.all(paineis.map((p) => sharp(Buffer.from(
  `<svg width="${W}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="8" y="18" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${nomeDo(p)}</text></svg>`,
)).png().toBuffer()));
const topos = [];
let H = 0;
for (const h of alturas) {
  topos.push(H);
  H += h + (comRotulo ? ROTULO : 0);
}
const n = Math.min(...porPainel.map((q) => q.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  const comp = [];
  porPainel.forEach((q, k) => {
    if (comRotulo) comp.push({ input: rotulos[k], left: 0, top: topos[k] });
    comp.push({ input: q[i], left: 0, top: topos[k] + (comRotulo ? ROTULO : 0) });
  });
  quadros.push(await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros ×', paineis.length, 'painéis');
