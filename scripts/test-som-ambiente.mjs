// BLOCK SOUND (18/11) — sheet 8, the pure rules: the depth of the world (each step farther is darker, quieter, narrower
// and wetter), the thunder, the belt's far layers, the F4's two breaths and the near miss of a rock.
//   node scripts/test-som-ambiente.mjs
import { DISTANCIAS, meioDoLugar, perfilDaDistancia } from '../src/som/distancia.ts';
import { SONS } from '../src/som/catalogoSons.ts';
import {
  CINTURAO, CamadasDoCinturao, QUASE, REVEZAMENTO, RevezamentoDoInterior, TROVAO, cruzou, passouRaspando, sorteadorSemRepetir, trovoes,
} from '../src/som/regrasAmbiente.ts';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const semente = (s0) => { let s = s0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

// ─── the depth ───
for (const meio of ['ar', 'vacuo']) {
  const [m, l, ml] = ['medio', 'longe', 'muitoLonge'].map((d) => DISTANCIAS[meio][d]);
  ok(m.passaBaixa > l.passaBaixa && l.passaBaixa > ml.passaBaixa, `${meio}: the farther, the darker`);
  ok(m.volume > l.volume && l.volume > ml.volume, `${meio}: the farther, the quieter`);
  ok(m.eco < l.eco && l.eco < ml.eco, `${meio}: the farther, the more of it is its own tail`);
  ok(m.pan > l.pan && l.pan > ml.pan, `${meio}: the farther, the narrower`);
  ok(m.atrasoEco < l.atrasoEco && l.atrasoEco < ml.atrasoEco, `${meio}: the farther, the later the tail`);
}
ok(['medio', 'longe', 'muitoLonge'].every((d) => DISTANCIAS.vacuo[d].passaBaixa < DISTANCIAS.ar[d].passaBaixa), 'through a hull everything is darker than in the air');
ok(meioDoLugar('cabine') === 'vacuo' && ['atmosfera', 'caverna', 'interior', 'agua'].every((l) => meioDoLugar(l) === 'ar'), 'only the cabin is the vacuum');
ok(perfilDaDistancia('longe', 'cabine') === DISTANCIAS.vacuo.longe, 'the profile follows the place');

// ─── what he asked to be far, is far ───
const longe = (n) => SONS[n]?.distancia;
ok(longe('fx.f2.laser') === 'muitoLonge' && longe('fx.f2.martelo') === 'muitoLonge', 'the belt: the laser and the hammers are VERY far');
ok(['fx.f1.flyby', 'fx.f1.flyby2', 'fx.f1.flyby3'].every((n) => longe(n) === 'longe'), 'the F1: the ships coming down on the colony are far');
ok(['fx.f1.artilharia', 'fx.f1.explosao', 'fx.f1.explosao2', 'fx.f1.flak', 'fx.f1.flak2'].every((n) => longe(n) === 'muitoLonge'), 'the F1: the fight on the horizon is very far');
ok(['fx.f2.cascalho', 'fx.f2.passa', 'fx.f2.rangido', 'fx.f4.agua.sobe'].every((n) => SONS[n] && !longe(n)), 'what touches the ship is right here');
ok(Object.entries(SONS).filter(([n]) => n.startsWith('amb.')).every(([, d]) => d.camada === 'ambiente' && d.laco), 'every bed is a loop on the ambience layer');

// ─── the thunder ───
{
  const rnd = semente(7);
  const perto = Array.from({ length: 300 }, () => trovoes(true, rnd));
  const longes = Array.from({ length: 300 }, () => trovoes(false, rnd));
  ok(perto.every((l) => l.every((t) => TROVAO.perto.nomes.includes(t.nome))), 'a bolt: the close thunder');
  ok(longes.every((l) => l.every((t) => TROVAO.longe.nomes.includes(t.nome))), 'only the glow: the far thunder');
  ok(Math.max(...perto.map((l) => l[0].atrasoMs)) < Math.min(...longes.map((l) => l[0].atrasoMs)), 'the far thunder always takes longer to arrive');
  const dois = perto.filter((l) => l.length === 2);
  ok(dois.length > 40 && dois.length < 150, 'sometimes the second take comes in over the first', dois.length);
  ok(dois.every((l) => l[0].nome !== l[1].nome && l[1].atrasoMs > l[0].atrasoMs), 'the second one is the other take, and later');
  ok(new Set(perto.map((l) => l[0].nome)).size === 2, 'both takes open a thunder');
}

// ─── the takes that vary ───
{
  const s = sorteadorSemRepetir(['a', 'b', 'c'], semente(3));
  const seq = Array.from({ length: 200 }, s);
  ok(seq.every((x, i) => i === 0 || x !== seq[i - 1]), 'never the same take twice in a row');
  ok(new Set(seq).size === 3, 'all the takes are used');
}

// ─── the belt from afar ───
{
  const c = new CamadasDoCinturao(semente(5));
  const toques = [];
  for (let t = 0; t < 600; t += 0.1) { const n = c.passo(0.1, true); if (n) toques.push({ t, n }); }
  ok(new Set(toques.map((x) => x.n)).size === 3, 'the laser, the hammers and the metal all sound', toques.length);
  ok(toques.every((x, i) => i === 0 || x.t - toques[i - 1].t >= CINTURAO.folga - 0.11), 'two layers never start close together');
  ok(toques.length >= 15 && toques.length <= 50, 'they are rare: heard alone, in the distance', toques.length);
  const preso = new CamadasDoCinturao(semente(5));
  let durante = 0;
  for (let t = 0; t < 120; t += 0.1) if (preso.passo(0.1, false)) durante++;
  ok(durante === 0, 'a boss on screen holds them back');
}

// ─── the F4's two breaths ───
{
  const r = new RevezamentoDoInterior(semente(9));
  let a = 0, b = 0;
  for (let t = 0; t < 1200; t += 0.1) { r.passo(0.1); if (r.naB) b += 0.1; else a += 0.1; }
  ok(a > b * 2, 'mostly the A, the B in some moments', { a, b });
  ok(b > 0 && REVEZAMENTO.b[1] < REVEZAMENTO.a[0], 'the B is a short visit');
}

// ─── the clock and the near miss ───
ok(cruzou(1, 2, 2) && !cruzou(1, 2, 1) && !cruzou(1, 2, 2.1), 'the clock crossing a moment fires once');
ok(passouRaspando(30, 20, false), 'a rock grazing the ship is a near miss');
ok(!passouRaspando(20 + QUASE.margem + 1, 20, false), 'a rock far above is nothing');
ok(!passouRaspando(0, 20, true), 'a rock that HIT the ship is not a near miss');

console.log(falhas ? `${falhas} falha(s)` : 'tudo certo');
process.exitCode = falhas ? 1 : 0;
