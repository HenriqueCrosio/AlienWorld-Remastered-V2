// THE GUARDIAN'S PATTERNS — the pure rules of step 2 (spec 2026-11-22-guardiao-coleira-design.md §5). From the root:
//   node --experimental-transform-types scripts/test-guardiao-padroes.mjs
import { miraSalva, angulosSalva, lequeLava } from '../src/entities/guardiao/padroes.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const graus = (r) => (r * 180) / Math.PI;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// ── the aim ──
{
  conferir(Math.abs(miraSalva({ x: 200, y: 100 }, { x: 50, y: 100 }) - 180) < 1e-9, 'nave à esquerda na mesma altura: 180°', null);
  const alto = miraSalva({ x: 200, y: 100 }, { x: 50, y: 40 });
  conferir(alto > 180 && alto < 220, 'nave acima: o centro sobe (ângulo > 180° na tela, y para baixo)', alto);
  const atras = miraSalva({ x: 200, y: 100 }, { x: 260, y: 30 });
  conferir(atras <= 240 + 1e-9 && atras >= 120 - 1e-9, 'nave atrás dele: preso em 180 ± 60', atras);
}

// ── the salvo: odd puts a globule on the ship, even too (half-step offset), the opening is kept ──
for (const n of [3, 4, 5]) {
  for (const r of [0.1, 0.9]) {
    const a = angulosSalva(n, 96, 200, seq(r)).map(graus);
    const perto = Math.min(...a.map((x) => Math.abs(x - 200)));
    conferir(perto < 1e-6, `n=${n} (sorteio ${r}): um glóbulo exatamente na mira`, a);
    conferir(Math.abs(a[n - 1] - a[0] - 96) < 1e-6, `n=${n}: a abertura segue 96°`, a);
  }
}
{
  const lados = new Set([0.1, 0.9].map((r) => Math.sign(angulosSalva(4, 96, 200, seq(r)).map(graus).reduce((s, x) => s + x, 0) / 4 - 200)));
  conferir(lados.size === 2, 'n=4: o desvio de meio passo sorteia o lado', [...lados]);
}

// ── the lava fan: n drops, one gap, never at an end, all cross the target column together ──
const base = { boca: { x: 217, y: 113 }, xAlvo: 40, T: 1, g: 260, passo: 18, topo: 30, base: 190 };
for (const n of [5, 6, 7]) {
  for (const r of [0, 0.5, 0.999]) {
    const L = lequeLava({ ...base, n, centroY: 110, rnd: seq(r) });
    conferir(L.vel.length === n && L.faixas.length === n + 1, `n=${n}: ${n} gotas em ${n + 1} faixas`, L.vel.length);
    conferir(L.vao >= 1 && L.vao <= n - 1, `n=${n} (sorteio ${r}): o vão nunca é a faixa da ponta`, L.vao);
    // simulate to the target column
    const ys = L.vel.map((v) => {
      const t = (base.xAlvo - base.boca.x) / v.x;
      return base.boca.y + v.y * t + 0.5 * base.g * t * t;
    });
    const ts = L.vel.map((v) => (base.xAlvo - base.boca.x) / v.x);
    conferir(ts.every((t) => Math.abs(t - base.T) < 1e-9), `n=${n}: todas chegam à coluna em T`, ts);
    const sep = ys.slice(1).map((y, i) => y - ys[i]).sort((p, q) => p - q);
    conferir(Math.abs(sep[0] - 18) < 1e-6 && Math.abs(sep[sep.length - 1] - 36) < 1e-6 && sep.filter((s) => s > 20).length === 1,
      `n=${n}: vizinhas a 18 px, UM vão de 36 px (26 px livres)`, sep);
    conferir(ys.every((y) => y >= base.topo && y <= base.base), `n=${n}: todas dentro da arena na coluna`, ys);
  }
  // the arc's peak: with the ship near the ceiling, no drop may graze it before the column (it would die there)
  for (const centroY of [30, 60, 110]) {
    const L = lequeLava({ ...base, n, centroY, rnd: seq(0.5) });
    const picos = L.vel.map((v) => (v.y < 0 ? base.boca.y - (v.y * v.y) / (2 * base.g) : base.boca.y));
    conferir(picos.every((p) => p >= base.topo + 3 - 1e-9), `n=${n}, nave em y=${centroY}: nenhum arco sobe ao teto`, picos);
  }
}
{
  const L = lequeLava({ ...base, n: 5, centroY: 32, rnd: seq(0.5) });
  conferir(L.faixas[0] >= base.topo, 'nave colada no teto: o leque fica preso na arena', L.faixas);
  const nao = lequeLava({ ...base, n: 5, centroY: 120, rnd: seq(0.5) });
  const meio = (nao.faixas[0] + nao.faixas[nao.faixas.length - 1]) / 2;
  conferir(Math.abs(meio - 120) < 1e-6, 'o leque centra na altura da nave', meio);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
