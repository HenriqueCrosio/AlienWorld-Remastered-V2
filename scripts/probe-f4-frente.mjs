// 17/10 — A SONDA DO PRIMEIRO PLANO DA F4 (`PrimeiroPlanoF4`). Joga a F4 inteira por passo de quadro (o golfinho
// morto em t≥45, sem mesa de cartas, a nave sem dano — a receita do `_sequencia.mjs`) e confere, TODO QUADRO, as três
// regras dele:
//   1. nenhuma silhueta cruza a linha da superfície da borda (a regra do bloco C) — coluna a coluna, sob a peça;
//   2. as famílias por câmara: *"ossos e tendões na borda, os pólipos podem aparecer na câmara do golfinho também,
//      membrana em todos"* — pólipos só nas bordas B (golfinho) e C (duto);
//   3. a arena do chefão é só pintura e borda: nenhuma peça visível depois do `soFundo` (passado o fade de saída, que
//      é de até 1,4s na entrada pela emenda). A borda D só existe DEPOIS dele (esfíncter e núcleo), então ela não tem
//      primeiro plano nenhum — e é o certo. ⚠️ O fade não se mede em quadros: no passo de quadro os tweens seguem o
//      relógio real (o START de 15/10). Então: nenhuma peça NASCE depois do `soFundo`, e no fim nenhuma está visível.
// E que a camada EXISTE de verdade: peças nas quatro câmaras e as quatro famílias na fase.
// 17/10, item 8 — o destroço e a deriva da mesma rodada: todo `destroco` da F4 nasce com a pele do casco engolido
// (`f4Engolido`) em escala 1; a `DerivaF4` só usa peças reduzidas (a regra dele: o que vai para trás DIMINUI), existe, e
// some na arena como o primeiro plano.
// 17/10, item 2b — as raízes da porta: toda porta do duto que aparece na tela tem o par de raízes (chão e teto) no x
// dela e encostado nas DUAS superfícies da borda, quadro a quadro (`RaizesPorta`, no `POST_UPDATE`).
//   node scripts/probe-f4-frente.mjs [t final = 125]
import { chromium } from 'playwright';

const T1 = Number(process.argv[2] ?? 125);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
const r = await page.evaluate(async (T1) => {
  const g = window.__game;
  g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const out = { destrocos: 0, destrocoErrado: [], deriva: 0, derivaInteira: [], derivaNaArena: 0, portas: 0, portaSemRaiz: [], raizDescolada: 0, quadros: 0, cruzou: [], fora: [], naArena: 0, arenaEm: null, porBorda: {}, familias: {}, max: 0, vistas: new Set() };
  const vistas = new WeakSet();
  const vistosH = new WeakSet();
  while (true) {
    if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
    const c = s();
    c.damageShip = () => {};
    if (c.cartas) c.cartas.abrirMesa = () => {};
    if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
    agora += 1000 / 60;
    g.step(agora, 1000 / 60);
    await new Promise((res) => setTimeout(res, 0));
    const m = c.moldura, pp = c.primeiroPlanoF4;
    if (out.arenaEm === null && c.parallax.cenarioDim === 0) out.arenaEm = Number(c.elapsed.toFixed(1));
    out.quadros++;
    out.max = Math.max(out.max, pp.vivas.length);
    for (const h of c.debris.hazards.getChildren()) {
      if (h.getData('kind') !== 'destroco' || vistosH.has(h)) continue;
      vistosH.add(h);
      out.destrocos++;
      if (h.texture.key !== 'f4Engolido' || h.scaleX !== 1) out.destrocoErrado.push(`${h.texture.key}/${h.frame.name}@${h.scaleX.toFixed(2)}`);
    }
    const raizes = c.children.list.filter((o) => o.name === 'f4PortaRaiz' && o.active);
    for (const p of c.terrain.props.getChildren()) {
      if (p.getData('kind') !== 'porta' || !p.active || p.x > 384 + 32) continue;
      if (!vistosH.has(p)) { vistosH.add(p); out.portas++; }
      const x = Math.round(p.x);
      const par = raizes.filter((r) => r.x === x);
      if (par.length !== 2) { out.portaSemRaiz.push(`t=${c.elapsed.toFixed(1)} x=${x} (${par.length})`); continue; }
      for (const r of par) {
        const alvo = Math.round(r.texture.key === 'f4PortaRaizTeto' ? m.superficieTetoEm(x) : m.superficieChaoEm(x));
        out.raizDescolada = Math.max(out.raizDescolada, Math.abs(r.y - alvo));
      }
    }
    for (const v of c.derivaF4.vivas) {
      if (vistas.has(v.img)) continue;
      vistas.add(v.img);
      out.deriva++;
      if (!/-(meia|terco)$/.test(v.img.frame.name)) out.derivaInteira.push(v.img.frame.name);
      if (out.arenaEm !== null) out.derivaNaArena++;
    }
    for (const v of pp.vivas) {
      const img = v.img;
      if (!vistas.has(img)) {
        vistas.add(img);
        const borda = m.faixaEm(Math.min(383, Math.max(0, img.x)), v.teto);
        const fam = img.frame.name.split('-')[0];
        if (out.arenaEm !== null) out.naArena++;
        out.porBorda[borda] ??= {};
        out.porBorda[borda][fam] = (out.porBorda[borda][fam] ?? 0) + 1;
        out.familias[fam] = (out.familias[fam] ?? 0) + 1;
        // A família nasce pela borda da placa da DIREITA da tela; aqui a amostra é no x de nascimento (≥ 383).
        if (fam === 'polipos' && !['f4FaixaB', 'f4FaixaC'].includes(m.faixaEm(383, v.teto))) out.fora.push(`${c.elapsed.toFixed(1)} ${borda}`);
      }
      // 1. A superfície: coluna a coluna, só no que está na tela.
      for (let x = Math.max(0, Math.round(img.x)); x < Math.min(384, Math.round(img.x) + img.width); x++) {
        const faixa = v.teto ? m.superficieTetoEm(x) : 216 - m.superficieChaoEm(x);
        if (img.height > faixa) { out.cruzou.push(`t=${c.elapsed.toFixed(2)} x=${x} ${img.frame.name} h=${img.height} faixa=${faixa}`); break; }
      }
    }
    if (c.elapsed > T1 || out.cruzou.length > 20) break;
  }
  // Deixa o fade de saída terminar no relógio real e conta o que ainda aparece.
  await new Promise((res) => setTimeout(res, 2500));
  agora += 1000 / 60;
  g.step(agora, 1000 / 60);
  out.derivaNoFim = s().derivaF4.vivas.filter((v) => v.img.alpha > 0.02 && v.img.x < 400).length;
  out.visiveisNoFim = s().primeiroPlanoF4.vivas.filter((v) => v.img.alpha > 0.02 && v.img.x < 384 && v.img.x + v.img.width > 0).length;
  return { ...out, vistas: undefined };
}, T1);
await browser.close();

let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? '✔' : '✘'} ${msg}`); if (!c) falhas++; };
console.log('por borda ' + JSON.stringify(r.porBorda));
console.log(`famílias ${JSON.stringify(r.familias)} · no máximo ${r.max} peças vivas · arena em t=${r.arenaEm} · ${r.quadros} quadros`);
ok(r.cruzou.length === 0, `nenhuma silhueta cruza a superfície da borda (${r.cruzou.length}${r.cruzou.length ? ': ' + r.cruzou.slice(0, 3).join(' | ') : ''})`);
for (const b of ['f4FaixaA', 'f4FaixaB', 'f4FaixaC']) ok(Object.keys(r.porBorda[b] ?? {}).length > 0, `há primeiro plano na borda ${b.slice(-1)}`);
for (const f of ['tendoes', 'ossos', 'polipos', 'membrana']) ok((r.familias[f] ?? 0) > 0, `a família ${f} aparece na fase`);
ok(!r.porBorda.f4FaixaD, `e a borda D, que já é arena, fica sem nenhum (${JSON.stringify(r.porBorda.f4FaixaD ?? {})})`);
ok(r.fora.length === 0, `os pólipos só nascem nas bordas B (golfinho) e C (duto)${r.fora.length ? ': ' + r.fora.slice(0, 3).join(', ') : ''}`);
ok(r.arenaEm !== null && r.naArena === 0, `nenhuma peça nasce na arena (${r.naArena} depois do soFundo de t=${r.arenaEm})`);
ok(r.visiveisNoFim === 0, `e a arena fica só com pintura e borda (${r.visiveisNoFim} peças visíveis no fim)`);
ok(r.destrocos > 0 && r.destrocoErrado.length === 0, `todo destroço da F4 é o casco engolido em escala 1 (${r.destrocos}${r.destrocoErrado.length ? ': ' + r.destrocoErrado.slice(0, 3).join(', ') : ''})`);
ok(r.deriva > 0 && r.derivaInteira.length === 0, `a deriva existe e só usa peças reduzidas (${r.deriva}${r.derivaInteira.length ? ': ' + r.derivaInteira.slice(0, 3).join(', ') : ''})`);
ok(r.portas >= 3 && r.portaSemRaiz.length === 0, `toda porta do duto tem as raízes no x dela (${r.portas} portas${r.portaSemRaiz.length ? ': ' + r.portaSemRaiz.slice(0, 3).join(', ') : ''})`);
ok(r.raizDescolada === 0, `e elas encostam nas duas superfícies da borda (pior desvio ${r.raizDescolada}px)`);
ok(r.derivaNaArena === 0 && r.derivaNoFim === 0, `e some na arena (${r.derivaNaArena} nascidas depois do soFundo, ${r.derivaNoFim} visíveis no fim)`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
