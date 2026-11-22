// THE GUARDIAN'S LEASH — the pure rules (spec 2026-11-22-guardiao-coleira-design.md §4 and §9). From the root:
//   node --experimental-transform-types scripts/test-guardiao-coleira.mjs
import { Corda } from '../src/entities/guardiao/corda.ts';
import { xDaParada, TRANCOS, deslocTranco, voltaElastica } from '../src/entities/guardiao/coleira.ts';
import { desenharCorda } from '../src/entities/guardiao/desenharCorda.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

// ── the reach: a circle around the anchor ──
{
  const a = { x: 300, y: -4 }, r = { x: 0, y: -60 }, L = 160;
  const x = xDaParada(a, r, L, 104);
  const d = Math.hypot(x + r.x - a.x, 104 + r.y - a.y);
  conferir(x < 300 && Math.abs(d - L) < 0.01, 'a parada fica à esquerda da âncora, a L dela', { x, d });
  const xBaixo = xDaParada(a, r, L, 150);
  conferir(xBaixo > x, 'mais longe da âncora em y, a parada fica mais à direita (o alcance é um círculo)', { x, xBaixo });
  conferir(xDaParada(a, r, 10, 104) === a.x - r.x, 'fora do alcance em y: a parada é debaixo da âncora', xDaParada(a, r, 10, 104));
}

// ── the rope: slack sags, taut is straight, never longer than L ──
{
  const a = { x: 100, y: 0 }, b = { x: 140, y: 60 };
  const L = 120;
  const c = new Corda(a, b, L);
  for (let i = 0; i < 120; i++) c.passo(1 / 60, a, b, 260);
  const p = c.pontos(), meio = p[p.length >> 1];
  const yReta = a.y + ((meio.x - a.x) / (b.x - a.x)) * (b.y - a.y);
  conferir(meio.y > yReta + 5, 'frouxa, o meio cede abaixo da reta', { meio, yReta });
  conferir(!c.esticada(a, b), 'frouxa não está esticada', null);
  const comp = (pts) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - pts[i].x, q.y - pts[i].y), 0);
  const b2 = { x: a.x + L * 0.6, y: a.y + L * 0.8 };
  for (let i = 0; i < 120; i++) c.passo(1 / 60, a, b2, 260);
  const p2 = c.pontos();
  const longe = Math.max(...p2.map((q) => Math.abs((q.x - a.x) * 0.8 - (q.y - a.y) * 0.6)));
  conferir(c.esticada(a, b2) && longe < 1, 'na distância L, esticada e reta (< 1 px da reta)', { longe });
  conferir(comp(p2) <= L * 1.01, 'nunca passa de L + 1 %', comp(p2));
  c.golpe(10);
  c.passo(1 / 60, a, b2, 260);
  const longe2 = Math.max(...c.pontos().map((q) => Math.abs((q.x - a.x) * 0.8 - (q.y - a.y) * 0.6)));
  conferir(longe2 > 0.5, 'o golpe tira a corda da reta (a onda do tranco)', { longe2 });
}

// ── the jerk and the return ──
for (const [k, tr] of Object.entries(TRANCOS)) {
  const amostras = Array.from({ length: 121 }, (_, i) => deslocTranco(i / 200, tr));
  const max = Math.max(...amostras);
  let trocas = 0;
  for (let i = 1; i < amostras.length; i++) if (Math.sign(amostras[i]) !== Math.sign(amostras[i - 1]) && amostras[i] !== 0 && amostras[i - 1] !== 0) trocas++;
  conferir(deslocTranco(0, tr) === 0 && max <= tr.passa + 0.5 && max >= tr.passa - 0.5, `tranco ${k}: parte de 0 e passa ${tr.passa} px`, { max });
  conferir(Math.abs(deslocTranco(0.6, tr)) < 0.5, `tranco ${k}: assentado em 0,6 s`, deslocTranco(0.6, tr));
  conferir(tr.molas > 0 ? trocas >= 2 : trocas === 0, `tranco ${k}: ${tr.molas > 0 ? 'oscila' : 'não oscila'}`, { trocas });
}
{
  const ks = Array.from({ length: 21 }, (_, i) => voltaElastica(i / 20));
  conferir(ks[0] === 0 && ks[20] === 1 && ks.every((v, i) => i === 0 || v >= ks[i - 1]), 'a volta vai de 0 a 1 sem recuar', ks);
  conferir(voltaElastica(0.3) > 0.5, 'a volta é rápida no começo', voltaElastica(0.3));
}

// ── the rasteriser: no holes, only the strip's colours ──
{
  const faixa = { largura: 6, linhas: [[0x111111, 0x553322, 0x664433, 0x775544, 0x553322, 0x111111], [0x111111, 0x442211, 0x553322, 0x664433, 0x442211, 0x111111]] };
  const W = 120, H = 120;
  const cores = new Set(faixa.linhas.flat().map((c) => (0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)) >>> 0));
  for (const [nome, pts] of [['vertical', [{ x: 60, y: 5 }, { x: 60, y: 115 }]], ['a 45°', [{ x: 10, y: 10 }, { x: 110, y: 110 }]], ['curva', [{ x: 10, y: 60 }, { x: 40, y: 30 }, { x: 80, y: 40 }, { x: 110, y: 90 }]]]) {
    const buf = new Uint32Array(W * H);
    desenharCorda(buf, W, H, pts, faixa, 0.7);
    let fora = 0, buracos = 0, escritos = 0;
    for (let y = 0; y < H; y++) {
      let ini = -1, fim = -1;
      for (let x = 0; x < W; x++) {
        const v = buf[y * W + x];
        if (!v) continue;
        escritos++;
        if (!cores.has(v)) fora++;
        if (ini < 0) ini = x;
        fim = x;
      }
      if (nome !== 'curva' && ini >= 0) for (let x = ini; x <= fim; x++) if (!buf[y * W + x]) buracos++;
    }
    conferir(escritos > 0 && fora === 0, `corda ${nome}: só as cores da faixa`, { escritos, fora });
    if (nome !== 'curva') conferir(buracos === 0, `corda ${nome}: sem buraco`, { buracos });
  }
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
