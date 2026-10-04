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
//     · estadoeletrico · estadoqueimando · missilalien (as chaves de `CENARIOS`)
//   modos: jogo,variada,aprovada (padrão: aprovada) · nave: humana | alienigena
import fs from 'fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENARIO = 'fragmentado', SEG = '2.5', MODOS = 'aprovada', NAVE = 'humana'] = process.argv.slice(2);
/** `--clipes [ID,...]`: os clipes do Arquivo, não um GIF (ver `CLIPES`). */
const MODO_CLIPES = OUT === '--clipes';

// nome · cartas · se a nave atira · os alvos · [segundo, lançador] = forçar um disparo de carta naquele instante (a
// espera real é de 3s no míssil, e o flare é do jogador) · a janela do mundo (padrão abaixo).
// Alvo: [x, dy da nave, vida, tipo?, vx?, vy?, teto?] — sem tipo é drone PARADO; com velocidade, ele anda; o teto de
// velocidade é ENCENAÇÃO do GIF (o kamikaze do jogo voa a 190, e o míssil, a 150, não o alcança na volta).
const CENARIOS = {
  base: { nome: 'SEM A CARTA', cartas: [], atira: true, alvos: 'cacho' },
  duplo: { nome: 'TIRO DUPLO', cartas: ['WPN_001'], atira: true, alvos: 'cacho' },
  triplo: { nome: 'TIRO TRIPLO', cartas: ['WPN_002'], atira: true, alvos: 'cacho' },
  cadencia: { nome: 'CADÊNCIA ×3', cartas: ['WPN_004', 'WPN_004', 'WPN_004'], atira: true, alvos: 'cacho' },
  perfurante: { nome: 'PERFURANTE', cartas: ['WPN_007'], atira: true, alvos: 'fila' },
  pesado: { nome: 'TIRO PESADO', cartas: ['WPN_008'], atira: true, alvos: 'cacho' },
  // O TRANCO (04/10): três vindo na direção da nave — sem a carta eles chegam; com o Pesado cada acerto os joga para
  // trás; com o elétrico junto, o travado leva o tranco parado.
  trancobase: { nome: 'SEM A CARTA — eles chegam', cartas: [], atira: true, alvos: 'vindo' },
  tranco: { nome: 'TIRO PESADO — cada acerto joga para trás', cartas: ['WPN_008'], atira: true, alvos: 'vindo' },
  trancoeletrico: { nome: 'PESADO + ELÉTRICO — trava e tranco', cartas: ['WPN_008'], atira: true, alvos: 'vindo', forcar: [[0.5, 'eletrificar:0'], [1.6, 'eletrificar:0']] },
  maior: { nome: 'EXPLOSIVO + EXPLOSÃO MAIOR', cartas: ['EFF_001', 'EFF_002'], atira: true, alvos: 'cacho' },
  fragmentos: { nome: 'EXPLOSIVO + FRAGMENTADO', cartas: ['EFF_001', 'EFF_003'], atira: true, alvos: 'cacho' },
  incendiario: { nome: 'INCENDIÁRIO', cartas: ['EFF_004'], atira: true, alvos: 'cacho' },
  combustao: { nome: 'INCENDIÁRIO + COMBUSTÃO', cartas: ['EFF_004', 'EFF_006'], atira: true, alvos: 'cacho' },
  arco: { nome: 'ELÉTRICO + ARCO EM CADEIA', cartas: ['EFF_011', 'EFF_012'], atira: true, alvos: 'cacho4' },
  reativo: { nome: 'CASCO + CASCO REATIVO', cartas: ['DEF_001', 'DEF_004'], atira: false, alvos: 'perto', forcar: [[1.0, 'golpe']], clip: { x: 20, y: 60, w: 160, h: 96 } },
  explosivo: { nome: 'EXPLOSIVO', cartas: ['EFF_001'], atira: true, alvos: 'cacho' },
  fragmentado: { nome: 'EXPLOSIVO + EXPLOSÃO MAIOR + FRAGMENTADO', cartas: ['EFF_001', 'EFF_002', 'EFF_003'], atira: true, alvos: 'cacho' },
  emcadeia: { nome: 'INCENDIÁRIO + COMBUSTÃO + EM CADEIA + EXPLOSIVO', cartas: ['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001'], atira: true, alvos: 'cacho' },
  missil: { nome: 'MÍSSIL ×2', cartas: ['WPN_009', 'WPN_009'], atira: false, alvos: 'espalhado', forcar: [[0.1, 'missil'], [1.6, 'missil']] },
  missil1: { nome: 'MÍSSIL — tiro único', cartas: ['WPN_009'], atira: false, alvos: 'um', forcar: [[0.1, 'missil']] },
  // A saída em queda antes da ignição (04/10), em DOIS apertos do Q (o GIF zera a recarga entre eles).
  missil2: { nome: 'MÍSSIL — humana, na tecla Q: cai, estabiliza, acende', cartas: ['WPN_009', 'WPN_009'], atira: false, alvos: 'dois', forcar: [[0.1, 'missil'], [1.6, 'missil']] },
  missilvolta: { nome: 'MÍSSIL — o alvo desvia: erra e volta', cartas: ['WPN_009'], atira: false, alvos: 'cruzando', desvio: true, forcar: [[0.1, 'missil']], clip: { x: 46, y: 20, w: 270, h: 176 } },
  drone: { nome: 'DRONE — humana: tiro laranja', cartas: ['WPN_010'], atira: false, alvos: 'drone', clip: { x: 20, y: 46, w: 250, h: 116 } },
  dronealien: { nome: 'DRONE — alien: tiro ciano', cartas: ['WPN_010'], atira: false, alvos: 'drone', nave: 'alienigena', clip: { x: 20, y: 46, w: 250, h: 116 } },
  eletrico: { nome: 'ELÉTRICO + ARCO EM CADEIA + SOBRECARGA — o raio salta, o pulso fere', cartas: ['EFF_011', 'EFF_012', 'EFF_013'], atira: true, alvos: 'cacho4' },
  eletricotrava: { nome: 'ELÉTRICO — a canhoneira eletrificada para e não atira', cartas: ['EFF_011'], atira: true, alvos: 'canhoneiras' },
  casco: { nome: 'CASCO — humana', cartas: ['DEF_001'], atira: false, alvos: 'nenhum', forcar: [[1.6, 'golpe']], clip: { x: 40, y: 80, w: 130, h: 56 } },
  cascoalien: { nome: 'CASCO — alien', cartas: ['DEF_001'], atira: false, alvos: 'nenhum', nave: 'alienigena', forcar: [[1.6, 'golpe']], clip: { x: 40, y: 80, w: 130, h: 56 } },
  dash: { nome: 'DASH — tecla E: avanço invulnerável com imagens-fantasma; espera de 8s', cartas: ['MOV_003'], atira: false, alvos: 'nenhum', forcar: [[0.4, 'dashD'], [1.2, 'dashD'], [1.8, 'dashW']], clip: { x: 30, y: 36, w: 170, h: 110 } },
  flare: { nome: 'FLARE — na tecla', cartas: ['EFF_010'], atira: false, alvos: 'atras', forcar: [[0.1, 'flare'], [1.2, 'flare']], clip: { x: 0, y: 46, w: 200, h: 116 } },
  // OS ESTADOS NO INIMIGO (04/10), de perto: a faísca e o anel do elétrico, a chama do incendiário.
  // O estado é FORÇADO em tempos fixos (`eletrificar:N` / `incendiar:N`, N = o alvo), e não pela chance da carta: o
  // efeito novo e o antigo gastam o `Math.random` diferente, e a sorte dos painéis se separaria no 1º acerto.
  estadoeletrico: { nome: 'ELÉTRICO — o raio no acerto, o anel enquanto trava', cartas: [], atira: true, alvos: 'trio', forcar: [[0.4, 'eletrificar:0'], [1.0, 'eletrificar:1'], [1.6, 'eletrificar:0'], [2.2, 'eletrificar:2']], clip: { x: 150, y: 70, w: 120, h: 70 } },
  // SEM o tiro da nave (04/10): a piscada de dano de cada tiro devolve a cor do inimigo, e o tint laranja do painel
  // ANTES sumia — os três painéis pareciam iguais.
  estadoqueimando: { nome: 'INCENDIÁRIO — a chama enquanto queima', cartas: [], atira: false, alvos: 'trio', forcar: [[0.3, 'incendiar:0'], [0.6, 'incendiar:1'], [0.9, 'incendiar:2']], clip: { x: 172, y: 74, w: 66, h: 64 } },
  missilalien: { nome: 'MÍSSIL — alien, na tecla Q: a redonda repintada na manta', cartas: ['WPN_009', 'WPN_009'], atira: false, alvos: 'dois', nave: 'alienigena', forcar: [[0.1, 'missil'], [1.6, 'missil']] },
};
const NOME_MODO = { jogo: 'ANTES — a explosão de sempre', variada: 'A — a de sempre, variando', aprovada: 'A + B — a arte aprovada de cada carta, variando' };
// (No modo `--clipes` o 2º argumento é a lista de cartas, não de cenários.)
const cenarios = (MODO_CLIPES ? [] : CENARIO.split(',')).map((c) => {
  if (!CENARIOS[c]) throw new Error(`cenário desconhecido: ${c}`);
  return CENARIOS[c];
});
const modos = MODOS.split(',');
const paineis = cenarios.flatMap((cen) => modos.map((modo) => ({ cen, modo })));
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
// OS CLIPES DO ARQUIVO (04/10, spec 2026-10-04-arquivo-de-cartas §4.3): `node scripts/_gif-cartas.mjs --clipes [ID,...]`
// grava cada carta numa janela FIXA de 160×90 em volta da nave, em pixel NATIVO, e monta a folha de quadros que o jogo
// toca em loop (`public/sprites/cartas/clipes/<ID>.png` + `clipes.json`). Os alvos são as variantes "C" (mais perto da
// nave: a nave e o efeito cabem nos 160px). `dx`: a borda esquerda da janela em relação à nave (padrão -30); `dy`:
// desloca a janela, que fica centrada na altura da nave.
const CLIPE ={ w: 160, h: 90, fps: 20, colunas: 10 };
const CLIPES = {
  WPN_001: { cen: 'duplo', seg: 2.5, alvos: 'cachoC' },
  WPN_002: { cen: 'triplo', seg: 2.5, alvos: 'cachoC' },
  WPN_004: { cen: 'cadencia', seg: 2.5, alvos: 'cachoC' },
  WPN_007: { cen: 'perfurante', seg: 2.5, alvos: 'filaC' },
  WPN_008: { cen: 'tranco', seg: 3, alvos: 'vindoC' },
  WPN_009: { cen: 'missil2', seg: 3, alvos: 'doisC' },
  WPN_010: { cen: 'drone', seg: 3, alvos: 'droneC' },
  EFF_001: { cen: 'explosivo', seg: 2.5, alvos: 'cachoC' },
  EFF_002: { cen: 'maior', seg: 2.5, alvos: 'cachoC' },
  EFF_003: { cen: 'fragmentos', seg: 2.5, alvos: 'cachoC' },
  EFF_004: { cen: 'estadoqueimando', seg: 2.5, alvos: 'trioC' },
  EFF_006: { cen: 'combustao', seg: 3, alvos: 'cachoC' },
  EFF_007: { cen: 'emcadeia', seg: 3, alvos: 'cachoC' },
  EFF_010: { cen: 'flare', seg: 3.5, alvos: 'atrasC', dx: -100 },
  EFF_011: { cen: 'estadoeletrico', seg: 3, alvos: 'trioC' },
  EFF_012: { cen: 'arco', seg: 2.5, alvos: 'cacho4C' },
  EFF_013: { cen: 'eletrico', seg: 3, alvos: 'cacho4C' },
  DEF_001: { cen: 'casco', seg: 3, alvos: 'nenhum', dx: -80 },
  DEF_004: { cen: 'reativo', seg: 2.5, alvos: 'perto', dx: -80 },
  MOV_003: { cen: 'dash', seg: 2.5, alvos: 'nenhum', dx: -40, dy: -10, naveLivre: true },
};
// O mundo é 384×216; a foto sai em ZOOM× do mundo, sem suavizar. GIF_ZOOM=1 = o pixel nativo (a folha amplia na tela).
const ZOOM = MODO_CLIPES ? 1 : Number(process.env.GIF_ZOOM ?? 2);
const CLIP_PADRAO = { x: 46, y: 46, w: 270, h: 116 };
const ROTULO = ZOOM >= 2 ? 26 : 16;
const FONTE = ZOOM >= 2 ? 15 : 10;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function gravar(cen, modo) {
  let clip = cen.clip ?? CLIP_PADRAO;
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
    const y0 = s.ship.y;
    const x0 = s.ship.x;
    const ALVOS = {
      // um CACHO na linha da nave
      cacho: [[190, 0, 6], [205, -12, 6], [205, 12, 6], [222, -4, 6], [222, 18, 6], [238, -14, 6], [240, 6, 6]],
      // três VINDO na linha da nave (o do meio no tiro), duros: o tranco se vê no do meio
      vindo: [[230, 0, 200, 'drone', -45, 0], [250, -26, 200, 'drone', -45, 0], [250, 26, 200, 'drone', -45, 0]],
      // três ESPAÇADOS e duros: o estado se vê em cada um, sem um tapar o outro
      trio: [[190, 0, 14], [218, -22, 14], [218, 22, 14]],
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
      // em FILA na linha da nave: o tiro perfurante atravessa todos
      fila: [[170, 0, 6], [195, 0, 6], [220, 0, 6], [245, 0, 6], [270, 0, 6]],
      // em volta da nave: o Casco Reativo explode neles
      perto: [[x0 + 22, -10, 3], [x0 + 26, 12, 3], [x0 - 18, 14, 3]],
      // ATRÁS da nave: o flare é armadilha para quem persegue
      atras: [[x0 - 30, 0, 1]],
      // AS VARIANTES DOS CLIPES do Arquivo (janela de 160×90 a partir de x0 - 30): os mesmos grupos, mais perto da nave.
      cachoC: [[x0 + 70, 0, 6], [x0 + 82, -12, 6], [x0 + 82, 12, 6], [x0 + 95, -4, 6], [x0 + 95, 18, 6], [x0 + 108, -14, 6], [x0 + 110, 6, 6]],
      cacho4C: [[x0 + 70, 0, 4], [x0 + 82, -12, 4], [x0 + 82, 12, 4], [x0 + 95, -4, 4], [x0 + 95, 18, 4], [x0 + 108, -14, 4], [x0 + 110, 6, 4]],
      filaC: [[x0 + 60, 0, 6], [x0 + 78, 0, 6], [x0 + 96, 0, 6], [x0 + 114, 0, 6]],
      trioC: [[x0 + 75, 0, 14], [x0 + 100, -22, 14], [x0 + 100, 22, 14]],
      vindoC: [[x0 + 115, 0, 200, 'drone', -45, 0], [x0 + 128, -26, 200, 'drone', -45, 0], [x0 + 128, 26, 200, 'drone', -45, 0]],
      doisC: [[x0 + 95, -30, 6], [x0 + 115, 30, 6]],
      droneC: [[x0 + 80, -34, 3], [x0 + 100, 30, 3], [x0 + 120, -12, 99, 'drone', -70, 0]],
      // o perseguidor vem de LONGE, por trás, na linha da nave: o flare fica no caminho dele
      atrasC: [[x0 - 95, 0, 1, 'drone', 28, 0], [x0 - 95, 10, 1, 'drone', 22, 0]],
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
    // A SORTE FIXA (04/10): as chances das cartas (20% do elétrico, 25% do incendiário) usam `Math.random` — com a
    // mesma semente em todo painel, a comparação mostra o MESMO acerto nos três.
    let a = 20261004;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // O RELÓGIO À MÃO: o laço do Phaser dorme e cada `step` avança exatamente um quadro.
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    return { x0, y0 };
  }, { cartas: cen.cartas, modo, alvos: cen.alvos }).then((nave) => {
    // O CLIPE do Arquivo: a janela fixa em volta da nave (ver `CLIPES`).
    if (cen.clipe) {
      const x = Math.round(nave.x0 + (cen.clipe.dx ?? -30));
      const y = Math.round(nave.y0 - CLIPE.h / 2 + (cen.clipe.dy ?? 0));
      clip = { x: Math.max(0, Math.min(384 - CLIPE.w, x)), y: Math.max(0, Math.min(216 - CLIPE.h, y)), w: CLIPE.w, h: CLIPE.h };
    }
  });

  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  // NOS CLIPES a nave fica PARADA onde nasceu (sem tiro, a do voo livre deriva para a esquerda e sai da janela de
  // 160px) — menos no Dash, em que o avanço é a carta.
  const fixar = !!cen.clipe && !cen.clipe.naveLivre;
  const passo = (n) => page.evaluate(({ n, QUADRO, fixar }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    window.__naveEm ??= { x: s.ship.x, y: s.ship.y };
    for (let i = 0; i < n; i++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
      if (fixar) {
        s.ship.setPosition(window.__naveEm.x, window.__naveEm.y);
        s.ship.body.setVelocity(0, 0);
      }
      // Nos clipes a nave NÃO pisca (o pisca-pisca de invulnerável, num loop curto, parece defeito).
      if (window.__clipe) s.ship.setVisible(true);
    }
  }, { n, QUADRO, fixar });
  await page.evaluate((clipe) => {
    window.__naveEm = null;
    window.__clipe = clipe;
  }, !!cen.clipe);

  if (cen.atira) await page.keyboard.down('Space'); // a nave atira o tempo todo
  const quadros = [];
  const total = Math.round((Number(cen.seg ?? SEG) * 60) / POR_FOTO);
  const forcar = [...(cen.forcar ?? [])];
  for (let i = 0; i < total; i++) {
    const seg = (i * POR_FOTO) / 60;
    while (forcar.length && forcar[0][0] <= seg) {
      const [, qual] = forcar.shift();
      // O DASH de VERDADE: a direção segurada e o E (03/10), teclas reais entre os passos do relógio.
      if (qual.startsWith('dash')) {
        const tecla = qual === 'dashD' ? 'KeyD' : 'KeyW';
        await page.keyboard.down(tecla);
        await page.keyboard.press('KeyE');
        await passo(2);
        await page.keyboard.up(tecla);
        continue;
      }
      if (qual.startsWith('eletrificar') || qual.startsWith('incendiar')) {
        await page.evaluate((qual) => {
          const s = window.__game.scene.getScene('Game');
          const [acao, n] = qual.split(':');
          const e = s.enemies.enemies.getChildren().filter((x) => x.active)[Number(n)];
          if (!e) return;
          if (acao === 'eletrificar') s.cartas.eletrico.eletrificar(e, false, 0);
          else s.cartas.incendiar(e);
        }, qual);
        continue;
      }
      await page.evaluate((qual) => {
        const l = window.__game.scene.getScene('Game').cartas.lancadores;
        if (qual === 'golpe') {
          // Um golpe de verdade (o caminho do dano da cena), para o Casco absorver.
          const s = window.__game.scene.getScene('Game');
          s.invulnerableUntil = 0;
          s.__golpe();
        } else if (qual === 'missil') l.missilPronto = 0;
        // O flare e o míssil são do JOGADOR (04/10): o GIF zera a espera (para caber no GIF) e aperta a tecla de
        // verdade logo abaixo.
        else l.flarePronto = 0;
      }, qual);
      if (qual === 'missil') await page.keyboard.press('KeyQ');
      else if (qual !== 'golpe') await page.keyboard.press('KeyF');
      await passo(1);
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

if (MODO_CLIPES) {
  // Os clipes: um por carta, em grade de `CLIPE.colunas`, e o índice `clipes.json` (o que já existia é mantido).
  const OUT_CLIPES = 'public/sprites/cartas/clipes';
  fs.mkdirSync(OUT_CLIPES, { recursive: true });
  const indice = `${OUT_CLIPES}/clipes.json`;
  const json = fs.existsSync(indice) ? JSON.parse(fs.readFileSync(indice, 'utf8')) : { cartas: {} };
  const ids = process.argv[3] ? process.argv[3].split(',') : Object.keys(CLIPES);
  for (const id of ids) {
    const c = CLIPES[id];
    if (!c) throw new Error(`carta sem clipe: ${id}`);
    const base = CENARIOS[c.cen];
    // A duração vem da carta (o `SEG` é dos GIFs).
    const quadros = await gravar({ ...base, alvos: c.alvos ?? base.alvos, clipe: { dx: c.dx, dy: c.dy, naveLivre: c.naveLivre }, seg: c.seg }, 'aprovada');
    const linhas = Math.ceil(quadros.length / CLIPE.colunas);
    await sharp({ create: { width: CLIPE.w * CLIPE.colunas, height: CLIPE.h * linhas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(quadros.map((input, i) => ({ input, left: (i % CLIPE.colunas) * CLIPE.w, top: Math.floor(i / CLIPE.colunas) * CLIPE.h })))
      // PNG de PALETA (256 cores, sem pontilhar): o grão da Atmosfera deixava cada folha com ~1,4 MB.
      .png({ palette: true, colours: 256, dither: 0 })
      .toFile(`${OUT_CLIPES}/${id}.png`);
    json.cartas[id] = { quadros: quadros.length };
    console.log(`${OUT_CLIPES}/${id}.png`, quadros.length, 'quadros');
  }
  fs.writeFileSync(indice, `${JSON.stringify({ w: CLIPE.w, h: CLIPE.h, fps: CLIPE.fps, colunas: CLIPE.colunas, cartas: json.cartas }, null, 1)}\n`);
  await browser.close();
  process.exit(0);
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
  `<svg width="${W}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="${ROTULO - 5}" font-family="Consolas, monospace" font-size="${FONTE}" fill="#ffb040">${nomeDo(p)}</text></svg>`,
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
