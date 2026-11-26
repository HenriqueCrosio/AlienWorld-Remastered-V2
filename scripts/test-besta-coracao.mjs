// THE HEART STOPS, the pure rules (25/11, the Beast's step 8 — spec 2026-11-24 §4.4; step 12, the put-out route): 30
// shards in 5 rows × 6 columns, right to left; each reaches its place exactly at the freeze; none hits the ceiling or the
// floor before it; after the resume they all go on to the left (the safe place is across the field, by her). Step 12:
// four fixed routes of put-out shards, each a chain of cells from the field's left edge to the pocket, in L steps, with
// room for the ship (21×9) along it and short enough to cross inside the freeze.
//   node --experimental-transform-types scripts/test-besta-coracao.mjs
import { CORACAO, apagadas, campo, figuraDoCampo, ondeEsta } from '../src/entities/besta/coracao.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};
const G = 260;
const X0 = 238;
const Y0 = 111;
const TF = 0.9;
const TETO = 14;
const CHAO = 186;
const NAVE = [21, 9];
const VNAVE = 110;

const f = figuraDoCampo();
conferir(f.length === 30, '30 estilhaços (5 linhas × 6 colunas)', f.length);
const alturas = [0, 1, 2, 3, 4].map((k) => f.filter((p) => p.linha === k).reduce((s, p) => s + p.y, 0) / 6);
conferir(alturas.every((h, i) => i === 0 || h > alturas[i - 1]), '5 linhas de alturas diferentes', alturas.map(Math.round));
let perto = Infinity;
for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) perto = Math.min(perto, Math.hypot(f[i].x - f[j].x, f[i].y - f[j].y));
conferir(perto >= 28, 'nenhum par a menos de 28 px', +perto.toFixed(1));
conferir(f.every((p) => p.y > TETO + 10 && p.y < CHAO - 10), 'todos dentro da sala na hora do congelamento');

// the pocket by her: right of the field and left of her body (the squeeze frames of coracao-a start at frame x 65 → screen 256)
const xs = f.map((p) => p.x);
const bolso = { x0: Math.max(...xs) + 10, x1: 300 + (65 - 128) * 0.7 };
conferir(bolso.x1 - bolso.x0 >= 36, `há um bolso entre o campo e ela (x ${bolso.x0}–${Math.round(bolso.x1)})`);

// ── the routes ──
const caixa = (ax, ay, aw, ah, bx, by, bw, bh) => {
  const dx = Math.max(0, Math.abs(ax - bx) - (aw + bw) / 2);
  const dy = Math.max(0, Math.abs(ay - by) - (ah + bh) / 2);
  return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
};
const cel = (l, c) => f.find((p) => p.linha === l && p.coluna === c);
CORACAO.ROTAS.forEach((r, n) => {
  const fora = apagadas(n);
  const C = r.celulas;
  const encadeada = C.every(([l, c], i) => i === 0 || (Math.abs(l - C[i - 1][0]) + Math.abs(c - C[i - 1][1]) === 1));
  conferir(encadeada, `rota ${r.nome}: encadeada, uma célula por passo (degraus em L)`);
  conferir(C[0][1] === 0 && C.at(-1)[1] === CORACAO.COLUNAS.length - 1, `rota ${r.nome}: da borda da esquerda do campo até a última coluna (o bolso)`);
  conferir(fora.size === C.length && C.length <= 8, `rota ${r.nome}: ${C.length} apagadas`);
  // the ship flies the route: from the left of the field, through each cell, into the pocket — its box against every lit one
  const pts = [{ x: 10, y: cel(...C[0]).y }, ...C.map(([l, c]) => cel(l, c)), { x: bolso.x0 + 12, y: cel(...C.at(-1)).y }];
  const acesas = f.filter((p) => !fora.has(`${p.linha},${p.coluna}`));
  let folga = Infinity;
  let comprimento = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
    comprimento += n;
    for (let k = 0; k <= n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n;
      const y = a.y + ((b.y - a.y) * k) / n;
      for (const p of acesas) folga = Math.min(folga, caixa(x, y, NAVE[0], NAVE[1], p.x, p.y, CORACAO.CAIXA[0], CORACAO.CAIXA[1]));
    }
  }
  conferir(folga >= 8, `rota ${r.nome}: a nave passa com ≥ 8 px de folga das acesas`, +folga.toFixed(1));
  const s = comprimento / VNAVE;
  conferir(s <= CORACAO.PARADO_S - 0.3, `rota ${r.nome}: do canto esquerdo (x=10) ao bolso em ${s.toFixed(2)} s, dentro do congelamento com folga de reação`, { s: +s.toFixed(2), parado: CORACAO.PARADO_S });
});
conferir(apagadas(4).size === apagadas(0).size && [...apagadas(4)].every((k) => apagadas(0).has(k)), 'as rotas giram (a 5ª é a 1ª)');

// ── the throw ──
const T = campo(X0, Y0, TF, G);
conferir(T.every((e) => { const p = ondeEsta(e, X0, Y0, TF, G); return Math.abs(p.x - e.x) < 1e-6 && Math.abs(p.y - e.y) < 1e-6; }), 'cada um chega ao seu lugar exatamente no congelamento');
let bate = null;
for (const e of T) for (let t = 0; t <= TF; t += 0.01) { const p = ondeEsta(e, X0, Y0, t, G); if (p.y <= TETO || p.y >= CHAO) { bate = { x: e.x, y: e.y, t }; break; } }
conferir(!bate, 'nenhum bate no teto ou no chão antes do congelamento', bate ?? undefined);
conferir(T.every((e) => e.vx < 0), 'depois da retomada todos seguem para a esquerda (o lugar seguro é atravessar o campo, perto dela)');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
