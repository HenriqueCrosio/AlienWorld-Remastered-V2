// The 24 card icons INSIDE THE REAL CARD (the HD table at 1152): 3 candidates per card. The 11 new cards are injected
// into CARTAS at runtime (from the catalog spec) so the card shows its real name/effect/requirement and the single
// text size is computed with the new names. One page load per variant (the icon ink cache is per texture key).
// Usage: node scripts/_folha-icones-cartas.mjs <icon-dir> <out.png>   (npm run dev running)
import fs from 'fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [ICONES, OUT] = process.argv.slice(2);
const PICKS = {
  WPN_001: [0, 2, 9], WPN_002: [0, 16, 56], WPN_004: [8, 24, 60], WPN_007: [3, 5, 43], WPN_008: [8, 13, 21],
  WPN_009: [1, 17, 36], WPN_010: [2, 36, 48], EFF_001: [2, 12, 13], EFF_002: [2, 33, 57], EFF_003: [4, 22, 49],
  EFF_004: [3, 17, 40], EFF_006: [8, 29, 47], EFF_007: [0, 3, 21], EFF_010: [3, 25, 42], EFF_011: [0, 30, 61],
  EFF_012: [15, 23, 41], EFF_013: [3, 10, 47], DEF_001: [0, 9, 37], DEF_002: [1, 31, 51], DEF_003: [0, 6, 30],
  DEF_004: [3, 10, 43], DEF_005: [24, 32, 48], MOV_001: [0, 8, 26], MOV_003: [0, 1, 2],
};
const PASTA = { EFF_004: 'EFF_004b', MOV_003: 'MOV_003b' };
const ROTULO_MOV_003 = ['humana T2', 'jato', 'manta'];
const NOVAS = {
  WPN_009: { id: 'WPN_009', nome: 'MÍSSIL GUIADO', texto: '', curto: 'MÍSSIL QUE PERSEGUE', categoria: 'arma', raridade: 'incomum', max: 2 },
  WPN_010: { id: 'WPN_010', nome: 'DRONE AUXILIAR', texto: '', curto: 'DRONE QUE ATIRA', categoria: 'arma', raridade: 'epica', max: 1 },
  EFF_002: { id: 'EFF_002', nome: 'EXPLOSÃO MAIOR', texto: '', curto: 'EXPLOSÕES MAIORES', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_003: { id: 'EFF_003', nome: 'FRAGMENTOS', texto: '', curto: 'SOLTA ESTILHAÇOS', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_007: { id: 'EFF_007', nome: 'EM CADEIA', texto: '', curto: 'EXPLOSÃO INCENDEIA', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_006' },
  EFF_010: { id: 'EFF_010', nome: 'FLARE', texto: '', curto: 'ARMADILHA TRASEIRA', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_011: { id: 'EFF_011', nome: 'ELÉTRICO', texto: '', curto: 'CHOQUE QUE TRAVA', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_012: { id: 'EFF_012', nome: 'ARCO EM CADEIA', texto: '', curto: 'CHOQUE SALTA', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_011' },
  EFF_013: { id: 'EFF_013', nome: 'SOBRECARGA', texto: '', curto: 'ELETRIFICADO EXPLODE', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_012' },
  DEF_005: { id: 'DEF_005', nome: 'BOMBA EXTRA', texto: '', curto: '+1 BOMBA', categoria: 'defesa', raridade: 'comum', max: 2 },
  MOV_003: { id: 'MOV_003', nome: 'DASH', texto: '', curto: 'AVANÇO INVULNERÁVEL', categoria: 'movimento', raridade: 'rara', max: 1 },
};
// Optional 3rd arg: a JSON { "ID": ["file.png", ...] } — only those cards, those files (1–3 each; short lists repeat
// the last). Without it: all 24 from PICKS/PASTA.
const CONFIG = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], 'utf8')) : null;
const IDS = CONFIG ? Object.keys(CONFIG) : Object.keys(PICKS);
const arquivo = (id, v) => (CONFIG ? CONFIG[id][Math.min(v, CONFIG[id].length - 1)] : `${ICONES}/${PASTA[id] ?? id}/${PICKS[id][v]}.png`);
const rotulo = (id, v) => (CONFIG ? (CONFIG[id][v] ? CONFIG[id][v].split('/').slice(-2).join('/').replace('.png', '') : '—') : id === 'MOV_003' ? ROTULO_MOV_003[v] : `#${PICKS[id][v]}`);
const M = 6, Z = 2; // margin around the card (fine px) · zoom of the shot in the sheet
const uri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fotos = {}; // id → [buf, buf, buf]
for (let v = 0; v < 3; v++) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const tex = Object.fromEntries(IDS.map((id) => [id, uri(arquivo(id, v))]));
  await page.evaluate(async ({ novas, tex }) => {
    // The SAME module instance the game loaded: after an edit Vite serves it as `/src/cartas.ts?t=…`, and a bare
    // import('/src/cartas.ts') would be another copy.
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/cartas.ts')) ?? '/src/cartas.ts';
    const m = await import(url);
    Object.assign(m.CARTAS, novas);
    const hd = window.__gameHD;
    for (const [id, u] of Object.entries(tex)) {
      const key = `icone-${id}`;
      if (hd.textures.exists(key)) hd.textures.remove(key);
      await new Promise((ok) => { hd.textures.once(`addtexture-${key}`, ok); hd.textures.addBase64(key, u); });
    }
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  }, { novas: NOVAS, tex });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 1e7; s.scene.pause(); });
  for (let l = 0; l < IDS.length; l += 3) {
    const lote = IDS.slice(l, l + 3);
    await page.evaluate((lote) => {
      const hd = window.__gameHD;
      if (hd.scene.getScene('Cartas').sys.isActive()) hd.scene.stop('Cartas');
      window.__game.scene.stop('Cartas');
      window.__game.scene.getScene('Game').scene.launch('Cartas', { opcoes: lote, titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
    }, lote);
    await page.waitForFunction(() => {
      const c = window.__gameHD.scene.getScene('Cartas');
      return c?.sys.isActive() && c.cartas?.length > 0 && c.tweens.getTweens().length === 0;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(150);
    // no focus brackets in the shots
    await page.evaluate(() => { const c = window.__gameHD.scene.getScene('Cartas'); c.realces.forEach((r) => r.forEach((k) => k.setVisible(false))); });
    const geo = await page.evaluate(() => {
      const hd = window.__gameHD, c = hd.scene.getScene('Cartas'), r = hd.canvas.getBoundingClientRect();
      return { ...c.geometria(), z: c.cameras.main.zoom * (r.width / hd.canvas.width), left: r.left, top: r.top };
    });
    for (const k of geo.cartas) {
      const clip = { x: geo.left + (k.x - M) * geo.z, y: geo.top + (k.y - M) * geo.z, width: (geo.moldura.w + 2 * M) * geo.z, height: (geo.moldura.h + 2 * M) * geo.z };
      (fotos[k.id] ??= [])[v] = await page.screenshot({ clip });
    }
  }
  await page.close();
}
await browser.close();

// THE SHEET: 2 cards per row, each with its 3 candidates in the real card.
const texto = (s, w, size = 18, cor = '#ffb040') => Buffer.from(`<svg width="${w}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
const m0 = await sharp(fotos[IDS[0]][0]).metadata();
const CW = m0.width * Z, CH = m0.height * Z, G = 14, BLOCO = 3 * CW + 2 * G + 40;
const TITULO = CONFIG
  ? 'AS TROCAS DE ÍCONE — dentro da carta real (mesa a 1152, ampliada 2×). O rótulo diz de onde veio cada um.'
  : 'OS 24 ÍCONES DENTRO DA CARTA REAL — 3 candidatos cada (mesa a 1152, ampliada 2×). Escolha um número por carta.';
const comp = [{ input: texto(TITULO, 2 * BLOCO, 22, '#e0e6f0'), left: 20, top: 16 }];
let y = 60;
for (let i = 0; i < IDS.length; i += 2) {
  for (const [j, id] of IDS.slice(i, i + 2).entries()) {
    const x0 = 20 + j * BLOCO;
    comp.push({ input: texto(id, 300, 18), left: x0, top: y });
    for (let v = 0; v < 3; v++) {
      const rot = rotulo(id, v);
      comp.push({ input: texto(rot, CW, 15, '#8a93a6'), left: x0 + v * (CW + G), top: y + 26 });
      comp.push({ input: await sharp(fotos[id][v]).resize(CW, CH, { kernel: 'nearest' }).toBuffer(), left: x0 + v * (CW + G), top: y + 48 });
    }
  }
  y += 48 + CH + 28;
}
await sharp({ create: { width: 20 + 2 * BLOCO, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
