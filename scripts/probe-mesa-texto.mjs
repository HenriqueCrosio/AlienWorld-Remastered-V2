// A MESA — nenhum texto fora do quadro, nenhum fora do centro (spec 2026-09-30-mesa-compacta-arte-design.md §3.3).
// Uso: node scripts/probe-mesa-texto.mjs <dir-da-folha>   (com `npm run dev` rodando)
//
// Monta as 24 cartas (em lotes de 3) em 1152×648, 1920×1080 e 2560×1440. Para CADA grupo (nome, efeito, requer,
// raridade, ícone) de CADA carta, isola a TINTA por diferença de fotos (o grupo apagado × só ele aceso) e cobra:
// - a tinta dentro da caixa com ≥2px finos de folga nos quatro lados;
// - o centro da tinta a ≤1px fino do centro da caixa (nos eixos que o grupo centra);
// - no visor, ≥2px finos entre "requer", ícone e raridade, nessa ordem de cima para baixo.
// Escreve <dir>/mesa-24-cartas.png: as 24 cartas em 1152 (2×, sem suavizar) e em 1920 (1×).
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2] ?? '.';
const FOLGA = 2;
const CENTRO = 1;
const LIMIAR = 48; // diferença de cor (soma dos 3 canais) que conta como tinta
const MARGEM_FOTO = 6; // px finos em volta da carta na foto
const JANELAS = [[1152, 648], [1920, 1080], [2560, 1440]];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const falhas = [];
const cobrar = (ok, msg) => { if (!ok) { console.log(`FALHA ${msg}`); falhas.push(msg); } };
const folha = { 1152: [], 1920: [] };
const raw = (png) => sharp(png).raw().toBuffer({ resolveWithObject: true });

function diferenca(a, b) {
  const { data: A, info } = a;
  const B = b.data;
  const ch = info.channels;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * ch;
    if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > LIMIAR) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

for (const [W, H] of JANELAS) {
  const tag = `${W}x${H}`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const ids = await page.evaluate(async () => {
    const { CARTAS } = await import('/src/cartas.ts');
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
    return Object.keys(CARTAS);
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = s.time.now + 1e7;
    s.scene.pause();
  });

  let grupos = 0;
  for (let l = 0; l < ids.length; l += 3) {
    const lote = ids.slice(l, l + 3);
    await page.evaluate((lote) => {
      const hd = window.__gameHD;
      if (hd.scene.getScene('Cartas').sys.isActive()) hd.scene.stop('Cartas');
      window.__game.scene.stop('Cartas');
      window.__game.scene.getScene('Game').scene.launch('Cartas', { opcoes: lote, titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
    }, lote);
    // Espera a ENTRADA acabar (as cartas sobem com tween), não um tempo fixo: em 2560 o renderizador da sonda roda a
    // poucos quadros por segundo e o Phaser desacelera o relógio dos tweens — 1,2s não bastava, e a sonda lia a
    // carta ainda subindo.
    await page.waitForFunction(() => {
      const c = window.__gameHD.scene.getScene('Cartas');
      return c?.sys.isActive() && c.cartas?.length > 0 && c.tweens.getTweens().length === 0;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(150);
    const geo = await page.evaluate(() => {
      const hd = window.__gameHD;
      const c = hd.scene.getScene('Cartas');
      const r = hd.canvas.getBoundingClientRect();
      return { ...c.geometria(), z: c.cameras.main.zoom * (r.width / hd.canvas.width), left: r.left, top: r.top };
    });
    const eps = 0.5 / geo.z; // meio pixel de tela, em px finos
    const vis = (i, g, v) => page.evaluate(([i, g, v]) => {
      const c = window.__gameHD.scene.getScene('Cartas');
      c.grupos[i].forEach((gr, j) => (g === null || j === g) && gr.objs.forEach((o) => o.setVisible(v)));
    }, [i, g, v]);

    for (const [i, carta] of geo.cartas.entries()) {
      const clip = {
        x: geo.left + (carta.x - MARGEM_FOTO) * geo.z, y: geo.top + (carta.y - MARGEM_FOTO) * geo.z,
        width: (geo.moldura.w + 2 * MARGEM_FOTO) * geo.z, height: (geo.moldura.h + 2 * MARGEM_FOTO) * geo.z,
      };
      if (folha[W]) folha[W].push(await page.screenshot({ clip }));
      await vis(i, null, false);
      await page.waitForTimeout(60);
      const base = await raw(await page.screenshot({ clip }));
      const tintas = [];
      for (const [g, gr] of carta.grupos.entries()) {
        await vis(i, g, true);
        await page.waitForTimeout(60);
        const bb = diferenca(base, await raw(await page.screenshot({ clip })));
        await vis(i, g, false);
        grupos++;
        const nome = `${tag} ${carta.id} ${gr.tipo}`;
        if (!bb) { cobrar(false, `${nome}: nenhuma tinta`); continue; }
        // A tinta em px finos, relativa à carta.
        const t = {
          x0: bb.x0 / geo.z - MARGEM_FOTO, x1: (bb.x1 + 1) / geo.z - MARGEM_FOTO,
          y0: bb.y0 / geo.z - MARGEM_FOTO, y1: (bb.y1 + 1) / geo.z - MARGEM_FOTO,
        };
        const c = gr.caixa;
        const f = { esq: t.x0 - c.x, dir: c.x + c.w - t.x1, cima: t.y0 - c.y, baixo: c.y + c.h - t.y1 };
        for (const [lado, v] of Object.entries(f)) cobrar(v >= FOLGA - eps, `${nome}: folga ${lado} ${v.toFixed(2)} (≥${FOLGA})`);
        if (gr.centrarX) {
          const d = (t.x0 + t.x1) / 2 - (c.x + c.w / 2);
          cobrar(Math.abs(d) <= CENTRO + eps, `${nome}: fora do centro na horizontal por ${d.toFixed(2)} (≤${CENTRO})`);
        }
        if (gr.centrarY) {
          const d = (t.y0 + t.y1) / 2 - (c.y + c.h / 2);
          cobrar(Math.abs(d) <= CENTRO + eps, `${nome}: fora do centro na vertical por ${d.toFixed(2)} (≤${CENTRO})`);
        }
        tintas.push({ tipo: gr.tipo, ...t });
      }
      await vis(i, null, true);
      const ordem = ['requer', 'icone', 'raridade'].map((tp) => tintas.find((t) => t.tipo === tp)).filter(Boolean);
      for (let j = 1; j < ordem.length; j++) {
        const vao = ordem[j].y0 - ordem[j - 1].y1;
        cobrar(vao >= FOLGA - eps, `${tag} ${carta.id}: ${ordem[j - 1].tipo}→${ordem[j].tipo} a ${vao.toFixed(2)} (≥${FOLGA})`);
      }
    }
  }
  cobrar(grupos >= 24 * 4, `${tag}: ${grupos} grupos medidos (≥96)`);
  cobrar(erros.length === 0, `${tag}: zero erro${erros.length ? ` (${erros.slice(0, 3).join(' | ')})` : ''}`);
  console.log(`${tag}: ${grupos} grupos medidos`);
  await page.close();
}
await browser.close();

// A FOLHA: 24 cartas por janela, 7 por linha.
const blocos = [];
let y = 20;
for (const [W, zoom] of [[1152, 2], [1920, 1]]) {
  const fotos = await Promise.all(folha[W].map(async (f) => {
    const m = await sharp(f).metadata();
    return { buf: await sharp(f).resize(m.width * zoom, m.height * zoom, { kernel: 'nearest' }).toBuffer(), w: m.width * zoom, h: m.height * zoom };
  }));
  if (!fotos.length) continue;
  const fw = fotos[0].w + 16, fh = fotos[0].h + 16;
  fotos.forEach((f, i) => blocos.push({ input: f.buf, left: 20 + (i % 7) * fw, top: y + Math.floor(i / 7) * fh }));
  y += Math.ceil(fotos.length / 7) * fh + 30;
}
const largura = Math.max(...blocos.map((b) => b.left)) + 600;
await sharp({ create: { width: largura, height: y, channels: 4, background: '#0b0d14' } }).composite(blocos).png().toFile(`${OUT}/mesa-24-cartas.png`);
console.log(`folha: ${OUT}/mesa-24-cartas.png`);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
