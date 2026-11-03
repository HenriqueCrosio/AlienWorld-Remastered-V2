// 03/11 (plan Task 11) — THE ORACLE: "the approved is what shows" made a test. A ported skill runs in Node on the mock's
// own clock (1/30 s steps, the mock's `t = k/30 − PRE`), with a FAKE facade that answers with the mock's own formulas —
// its points (`pontos.json`, by its set names), its screen transform (`naTela`, the mock 57–59), the ship where the
// mock's mannequin was (the log's `nave`, the hitbox centre) — and every frame is compared with the approved mock's
// `rastreia=` log: the beam (x0, y0, x1, y1, its half-width, whether it hits the hull) and her head (set and frame).
//   const r = await rodarOraculo({ hab: 'raio', log, pontos, semente: 11 })
//     → { quadros, piorPosicao, raioFora, cabFora, primeiro }   (`primeiro`: the first frame that differs, and how)
//   const r = await rodarOraculo({ hab: 'gas', modo: 'padroes' | 'contra' | 'carta', log, pontos })
//     → { quadros, gelFora, termoFora, cabFora, contras, primeiro }   (the jelly and the thermometer as the log rounds them)
import fs from 'node:fs';
import { createRequire } from 'node:module';

// the mock's screen transform: her 256² canvas at 0.55, the approved frame's centre on the post (300, 142)
const ESC = 0.55, LADO = Math.round(256 * ESC), KC = LADO / 256;
const ORIG = { x: Math.round(300 - 137 * ESC), y: Math.round(142 - 133 * ESC) };
const POSTO = { x: 300, y: 142 };
const naTela = (p) => ({ x: ORIG.x + p[0] * KC, y: ORIG.y + p[1] * KC });

export async function rodarOraculo(opc) {
  if (opc.hab === 'gas') return oraculoGas(opc);
  return oraculoRaio(opc);
}

/**
 * THE GAS's fake facade (the mock 86–121, 1084–1090): her mouths by the mock's formula — in a set's frame, the idle's
 * hand-measured mouth plus the frame's shift from the approved frame; in the idle, the idle frame's measured shift, the
 * idle restarting on its frame 0 whenever the skill calls `idle()` —; her left edge on each row from the idle's frame 0
 * at 0.55; and, in the counter and the card, the mock's own stream of shots (one every 0.12 s from 0.3 s, 320 px/s, from
 * the ship's nose) — a shot that reached her edge is gone the next step, as the game kills it on her body.
 */
async function oraculoGas({ modo, log, pontos, sementes = [7, 99] }) {
  const LOG = JSON.parse(fs.readFileSync(log, 'utf8'));
  const PONTOS = JSON.parse(fs.readFileSync(pontos, 'utf8'));
  const { HAB } = await import('../../src/entities/serpente/numerosHab.ts');
  const { Gas } = await import('../../src/entities/serpente/gas.ts');
  const { alcance } = await import('../../src/entities/serpente/geleia.ts');
  const sharp = createRequire(import.meta.url)('sharp');
  const BOCAS = { ciano: [-97, -58], verde: [-20, -73], laranja: [35, -53] };
  const BOCA_IDLE = {
    ciano: [[0, 0], [0, 3], [0, 4], [0, 4], [0, 2], [-1, -1], [-2, -3], [-4, -5], [-5, -7]],
    verde: [[0, 0], [0, 4], [0, 6], [0, 7], [1, 6], [2, 4], [2, 1], [3, -3], [4, -5]],
    laranja: [[0, 0], [0, 3], [-1, 4], [-2, 4], [-2, 3], [-2, 0], [-1, -2], [0, -6], [2, -8]],
  };
  // her left edge per row (the mock 86–92)
  const borda = new Int16Array(216).fill(384);
  {
    const { data: f, info } = await sharp('public/sprites/serpente-anim-0.png').resize(Math.round(238 * ESC), Math.round(246 * ESC), { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ox = Math.round(POSTO.x - info.width / 2), oy = Math.round(POSTO.y - info.height / 2);
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
      if (f[(y * info.width + x) * 4 + 3] >= 128 && oy + y >= 0 && oy + y < 216) { borda[oy + y] = Math.min(borda[oy + y], ox + x); break; }
  }
  const NOME = Object.fromEntries(Object.entries(HAB.conjuntos.gas.A).map(([nome, chave]) => [chave, nome]));
  const tAbre = HAB.gas.sopro[0] - HAB.gas.mov.abre;
  const PRE = 0.6 + Math.ceil((9 / 8 - tAbre - 0.6) * 30) / 30; // the mock 1804
  let k = 0, t = 0, mostrado = null, tIdle = -PRE, ultimo = -9, contras = 0;
  const balas = [];
  const boca = (cor) => {
    if (mostrado) {
      const L = PONTOS[NOME[mostrado.chave]][cor];
      let p = L[mostrado.i];
      for (let j = mostrado.i; !p && j >= 0; j--) p = L[j];
      const p0 = PONTOS.abre[cor][0];
      return { x: POSTO.x + BOCAS[cor][0] * ESC + (p[0] - p0[0]) * KC, y: POSTO.y + BOCAS[cor][1] * ESC + (p[1] - p0[1]) * KC };
    }
    const [ix, iy] = BOCA_IDLE[cor][Math.floor((t - tIdle) * 8) % 9];
    return { x: POSTO.x + (BOCAS[cor][0] + ix) * ESC, y: POSTO.y + (BOCAS[cor][1] + iy) * ESC };
  };
  const corpo = {
    forma: 'A',
    cores: ['ciano', 'verde', 'laranja'],
    tocador: {
      mostrar: (chave, i) => { mostrado = { chave, i }; },
      idle: () => { mostrado = null; tIdle = t; },
      clipe() {},
      soltar() {},
      get atual() { return mostrado; },
    },
    boca,
    labios: () => { const b = boca('verde'); return { x: b.x - 3, y: b.y + 1.5 }; },
    ponto: () => null,
    nave: () => LOG[k].nave,
    bordaEsq: (y) => (y >= 0 && y < 216 ? borda[y] : 384),
    treme() {},
    balas: () => balas.filter((b) => b.active),
    incendiario: () => modo === 'carta',
    contra() { contras++; },
    gesto() {},
    luz() {},
  };
  const h = new Gas(corpo);
  h.sementes = sementes;
  h.comecar();
  let gelFora = 0, termoFora = 0, cabFora = 0, primeiro = null;
  const anota = (msg) => { primeiro ??= `quadro ${k} (t ${t.toFixed(3)}): ${msg}`; };
  for (k = 0; k < LOG.length; k++) {
    t = k / 30 - PRE;
    // the mock's shots (the counter, the card): the ones that reached her are gone; a new one; all fly on
    if (modo !== 'padroes') {
      for (const b of balas) if (b.passou) b.active = false;
      const nv = LOG[k].nave;
      if (t - ultimo >= 0.12 && t > 0.3) { ultimo = t; balas.push({ x: nv.x + 1.5 + 26, y: nv.y + 1, active: true }); }
      for (const b of balas) if (b.active) {
        b.x += 320 / 30;
        if (b.x >= corpo.bordaEsq(Math.round(b.y))) b.passou = true;
      }
    }
    h.t = t;
    h.update(1 / 30);
    h.desenhar(() => {});
    const L = LOG[k];
    const g = h.geleias.lista.map((g) => ({ id: g.id, x: +g.x.toFixed(1), y: +g.y.toFixed(1), mae: !!g.mae, preso: g.preso ?? null, r: +alcance(g).toFixed(2) }));
    if (JSON.stringify(g) !== JSON.stringify(L.g)) {
      gelFora++;
      const i = g.findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(L.g[j]));
      anota(`geleia ${i}: ${JSON.stringify(g[i] ?? null)} × ${JSON.stringify(L.g[i] ?? null)} (${g.length} × ${L.g.length})`);
    }
    if (+h.termo.mostra.toFixed(3) !== L.termo) {
      termoFora++;
      anota(`termômetro ${h.termo.mostra.toFixed(3)} × ${L.termo}`);
    }
    const cab = mostrado ? { nome: NOME[mostrado.chave], i: mostrado.i } : null;
    if (JSON.stringify(cab) !== JSON.stringify(L.cab)) {
      cabFora++;
      anota(`cabeça ${JSON.stringify(cab)} × ${JSON.stringify(L.cab)}`);
    }
  }
  return { quadros: LOG.length, gelFora, termoFora, cabFora, contras, primeiro };
}

async function oraculoRaio({ log, pontos, semente }) {
  const LOG = JSON.parse(fs.readFileSync(log, 'utf8'));
  const PONTOS = JSON.parse(fs.readFileSync(pontos, 'utf8'));
  const { HAB } = await import('../../src/entities/serpente/numerosHab.ts');
  const { Raio } = await import('../../src/entities/serpente/raio.ts');
  // the installed set → the mock's name for it
  const NOME = Object.fromEntries(Object.entries(HAB.conjuntos.raio).map(([nome, chave]) => [chave, nome]));
  let k = 0, mostrado = null;
  const corpo = {
    forma: 'A',
    cores: ['ciano', 'verde', 'laranja'],
    tocador: {
      mostrar: (chave, i) => { mostrado = { chave, i }; },
      idle: () => { mostrado = null; },
      clipe() {},
      soltar() {},
      get atual() { return mostrado; },
    },
    ponto: (chave, i, tipo) => {
      const p = PONTOS[NOME[chave]]?.[tipo]?.[i];
      return p ? naTela(p) : null;
    },
    nave: () => LOG[k].nave,
    boca: () => { throw new Error('oráculo: o raio não pede boca(cor)'); },
    labios: () => { throw new Error('oráculo: o raio não pede labios()'); },
    bordaEsq: () => 384,
    treme() {},
    balas: () => [],
    incendiario: () => false,
    contra() {},
    gesto() {},
    luz() {},
  };
  const h = new Raio(corpo);
  h.sementeSalva = semente;
  h.comecar();
  const PRE = HAB.cicloIdle - HAB.raio.inicio;
  let pior = 0, raioFora = 0, cabFora = 0, primeiro = null;
  const anota = (msg) => { primeiro ??= `quadro ${k}: ${msg}`; };
  for (k = 0; k < LOG.length; k++) {
    h.t = k / 30 - PRE;
    h.update(1 / 30);
    h.desenhar(() => {});
    const L = LOG[k], fx = h.feixe;
    if (!!L.raio !== !!fx) {
      raioFora++;
      anota(`raio ${L.raio ? 'na maquete, não no porte' : 'no porte, não na maquete'}`);
    } else if (fx) {
      const d = Math.max(...['x0', 'y0', 'x1', 'y1', 'meia'].map((c) => Math.abs(fx[c] - L.raio[c])));
      pior = Math.max(pior, d);
      if (d >= 1e-6) anota(`raio ${d.toExponential(2)} px fora (${JSON.stringify(L.raio)} × ${JSON.stringify(fx)})`);
      if (fx.bate !== L.raio.bate) {
        raioFora++;
        anota(`bate ${fx.bate} × ${L.raio.bate}`);
      }
    }
    const cab = mostrado ? { nome: NOME[mostrado.chave], i: mostrado.i } : null;
    if (JSON.stringify(cab) !== JSON.stringify(L.cab)) {
      cabFora++;
      anota(`cabeça ${JSON.stringify(cab)} × ${JSON.stringify(L.cab)}`);
    }
  }
  return { quadros: LOG.length, piorPosicao: pior, raioFora, cabFora, primeiro };
}
