// The background battle of the F3 (round 3, plan `plans/2026-11-08-cenario-casco-rodada3.md`): the silhouettes, the
// rules of the passes (the arena only, the calm windows only, never two within 8 s), the physics of the hit ship (no
// gravity) and the colours.   node scripts/test-f3-batalha.mjs
import { SILHUETAS_HUMANAS, SILHUETAS_CRIATURAS, COR_SILHUETA, carimbo } from '../src/f3/silhuetasF3.ts';
import { BatalhaFundo, CAMADA_BATALHA, CLAROES, PASSAGEM } from '../src/f3/batalhaFundo.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

// ── the silhouettes
for (const [nome, mapas] of [['ship', SILHUETAS_HUMANAS], ['creature', SILHUETAS_CRIATURAS]]) {
  for (const [op, m] of Object.entries(mapas)) {
    const c = carimbo(m);
    let escuros = 0;
    for (let i = 2; i < c.px.length; i += 3) if (c.px[i] !== 2) escuros++;
    ok(c.w >= 7 && c.w <= 14, `${nome} ${op}: ${c.w} px wide (7–14)`);
    ok(escuros / (c.px.length / 3) >= 0.7, `${nome} ${op}: mostly dark (${Math.round((100 * escuros) / (c.px.length / 3))}%)`);
  }
}
ok(CAMADA_BATALHA.depth > -96 && CAMADA_BATALHA.depth < -92 && CAMADA_BATALHA.depth !== -93.5, `behind the clouds, in front of the painting, no tie (${CAMADA_BATALHA.depth})`);

// ── the colours
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const proibida = (c) => (c[0] > 200 && c[1] < 80) || (c[2] > c[0] && lum(c) > 0.8);
for (const [n, c] of [['ship shot', PASSAGEM.tiroHumano], ['creature shot', PASSAGEM.tiroCriatura], ['engine', COR_SILHUETA.motor], ['eye', COR_SILHUETA.olho], ['glow', CLAROES.brilho], ...CLAROES.rampa.map((c, i) => [`flash ${i}`, c])]) {
  ok(!proibida(c), `${n} [${c}] is neither warning red nor free-lane white-blue`);
}

// ── the rules
const roda = (b, s, calmo) => { for (let i = 0; i < s * 30; i++) b.passo(1 / 30, typeof calmo === 'function' ? calmo(i / 30) : calmo); };
{
  const b = new BatalhaFundo(1);
  roda(b, 120, true);
  ok(b.passagens === 0, 'the casco (Act 2): no pass, even "calm"');
}
{
  const b = new BatalhaFundo(2);
  b.regime('arena', 0);
  roda(b, 60, false);
  ok(b.passagens === 0, 'the arena, never calm: no pass');
}
{
  const b = new BatalhaFundo(3);
  b.regime('arena', 0);
  // a calm window of 1 s every 2 s: many windows, but never two passes within 8 s
  const inicios = [];
  let antes = 0;
  for (let i = 0; i < 120 * 30; i++) {
    b.passo(1 / 30, (i / 30) % 2 < 1);
    if (b.passagens > antes) { inicios.push(i / 30); antes = b.passagens; }
  }
  ok(inicios.length > 2, `the arena's calm windows get passes (${inicios.length})`);
  // the variety (round 3, him: "Ora passam frotas de uma, outra"): one pair of models per fleet, different fleets
  ok(new Set(b.modelos).size >= 3, `the fleets vary (${[...new Set(b.modelos)].join(' ')})`);
  ok(new Set(b.modelos.map((m) => m[0])).size >= 2 && new Set(b.modelos.map((m) => m[2])).size >= 2, 'both the ships and the creatures vary');
  ok(inicios.every((t, i) => i === 0 || t - inicios[i - 1] >= PASSAGEM.minEntre - 1e-9), `never two passes within ${PASSAGEM.minEntre} s`);
}
{
  // the hit ship: momentum only — its velocity never changes after the hit
  const b = new BatalhaFundo(4);
  b.regime('arena', 0);
  let abatidas = 0, mudou = 0;
  const visto = new Map();
  for (let i = 0; i < 200 * 30; i++) {
    b.passo(1 / 30, true);
    for (const n of b.passagem?.naves ?? []) {
      if (n.abatida == null || !n.viva) continue;
      if (!visto.has(n)) { visto.set(n, [n.vx, n.vy]); abatidas++; }
      const [vx, vy] = visto.get(n);
      if (vx !== n.vx || vy !== n.vy) mudou++;
    }
  }
  ok(abatidas > 0, `ships are hit (${abatidas})`);
  ok(mudou === 0, 'a hit ship keeps its momentum (no gravity, no thrust)');
  const out = new Uint8ClampedArray(384 * CAMADA_BATALHA.h * 4);
  b.desenhar(out);
  ok(out.length === 384 * CAMADA_BATALHA.h * 4, 'draws inside its buffer');
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
