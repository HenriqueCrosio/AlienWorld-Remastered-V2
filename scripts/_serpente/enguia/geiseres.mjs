// 07/11 — the geysers (spec §5): she runs under the hull, the bump of the living hull rides over her head; a geyser
// every ~60 px of the way — a fast warning (the crack lights green, a puff, the plates rise 1 px), the column (~16 px wide,
// from the screen's foot to y ~70, THROUGH the crest), the green steam that spreads and fades (nothing falls). The way
// back's geysers fall BETWEEN the way out's (the safe spots change).

// the living hull's crack path: the same seeded walk as `cascoVivo.ts` (the panel's row 168 ±5, little branches every
// 13 columns) — shared by the drawing and the touch (5th round: the geysers rise FROM it, so the column's foot is it)
let trilhaMemo = null;
export function trilhaFissura(N) {
  if (trilhaMemo) return trilhaMemo;
  const W = N.tela.W, trilha = new Int16Array(W), ramos = [];
  let semente = 20261029;
  const rnd = () => { semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0; return semente / 4294967296; };
  let y = N.geiser.yLombada, passo = 0;
  for (let x = W - 1; x >= 0; x--) {
    if (--passo <= 0) { y = Math.max(N.geiser.yLombada - 5, Math.min(N.geiser.yLombada + 5, y + (rnd() < 0.5 ? -1 : 1))); passo = 2 + Math.floor(rnd() * 3); }
    trilha[x] = y;
    if (x % 13 === 0) { const sobe = rnd() < 0.5 ? -1 : 1, n = 2 + Math.floor(rnd() * 3); for (let q = 1; q <= n; q++) ramos.push({ x: x - Math.round(q * 0.7), y: y + sobe * q }); }
  }
  trilhaMemo = { trilha, ramos };
  return trilhaMemo;
}

// the x of each geyser: the way out from `inicio` every `passo` while ≥ fim + passo/3; the way back on the midpoints
export function pontosGeiser(G) {
  const ida = [];
  for (let x = G.inicio; x >= G.fim + G.passo / 3; x -= G.passo) ida.push(x);
  const volta = [];
  for (let i = ida.length - 1; i > 0; i--) volta.push((ida[i] + ida[i - 1]) / 2);
  return { ida, volta };
}

// every geyser of the fight: when the snout (under the hull) crosses its x on the way out / back
export function geiseres(R, N) {
  const G = N.geiser, { ida, volta } = pontosGeiser(G), out = [];
  for (const tr of R.trechos.filter((t) => t.sob)) {
    const xs = tr.sob === 'ida' ? ida : volta;
    const feitos = new Set();
    let antes = R.caminho.ponto(R.estado(tr.t0).s).x;
    for (let t = tr.t0; t <= tr.t1; t += 1 / 240) {
      const x = R.caminho.ponto(R.estado(t).s).x;
      for (const g of xs) if (!feitos.has(g) && (antes - g) * (x - g) <= 0 && antes !== x) {
        feitos.add(g);
        out.push({ x: g, ciclo: tr.ciclo, via: tr.sob, tAviso: t, tColuna: t + G.aviso, tFim: t + G.aviso + G.coluna, tVapor: t + G.aviso + G.coluna + G.vapor });
      }
      antes = x;
    }
  }
  return out;
}

// the crack behind her (the living hull's R3): it opens from the breach's end as the bump runs left, and once she is
// back in the breach it heals from there toward its tip in `cura` s — [{de, ate, cura (0–1)}]
export function fissuras(R, N, t) {
  const out = [], ate = N.rombo.x0 + 5;
  const idas = R.trechos.filter((tr) => tr.sob === 'ida');
  for (const ida of idas) {
    const volta = R.trechos.find((tr) => tr.sob === 'volta' && tr.ciclo === ida.ciclo);
    if (t < ida.t0 || t > volta.t1 + N.geiser.cura) continue;
    const de = t < ida.t1 ? R.caminho.ponto(R.estado(t).s).x : N.geiser.fim;
    if (de >= ate) continue;
    out.push({ de, ate, cura: t > volta.t1 ? Math.min(1, (t - volta.t1) / N.geiser.cura) : 0 });
  }
  return out;
}

// the bump's x while she is under the hull (null when she is not)
export function lombada(R, N, t) {
  const e = R.estado(t);
  if (!e.trecho.sob) return null;
  const p = R.caminho.ponto(e.s);
  return p.x <= N.rombo.x0 + 10 ? p.x : null;
}
