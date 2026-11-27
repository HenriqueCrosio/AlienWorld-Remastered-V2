// THE ROBOTS' RUNS, TOGETHER (spec 2026-11-26-medicao-das-lutas §6): every JSON a robot wrote (`--saida`), grouped by
// robot · boss · hand · reaction; per group the mean and the range of the fight time, the lives and blows, and per phase
// the mean time and the lives lost.
//   node scripts/_rebalance/robo/juntar.mjs <file.json | dir>... [--json out.json]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const outJson = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const entradas = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const arquivos = entradas.flatMap((e) => (fs.statSync(e).isDirectory() ? fs.readdirSync(e).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => path.join(e, f)) : [e]));
const runs = arquivos.map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).filter((r) => r.resumo);

const grupos = new Map();
for (const r of runs) {
  const k = `${r.robo} · ${r.chefe} · ${r.mao}${r.reacao !== undefined && r.robo !== 'canhao' ? ` · ${r.reacao} ms` : ''}`;
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k).push(r);
}
const media = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const faixa = (a) => `${f1(media(a))} (${f1(Math.min(...a))}–${f1(Math.max(...a))})`;
const saida = [];
for (const [k, rs] of [...grupos].sort()) {
  const s = rs.map((r) => r.resumo.s);
  const vidas = rs.map((r) => r.resumo.total.vidas);
  const golpes = rs.map((r) => r.resumo.total.golpes);
  const mortes = rs.map((r) => r.mortes ?? 0);
  const acerto = rs.map((r) => r.resumo.total.acerto);
  const tetos = rs.filter((r) => r.teto || !r.resumo.terminou).length;
  console.log(`\n=== ${k} — ${rs.length} luta(s)${tetos ? ` · ${tetos} NO TETO` : ''}`);
  console.log(`luta ${faixa(s)} s · vidas ${faixa(vidas)} · golpes ${faixa(golpes)} · mortes ${faixa(mortes)} · acerto ${Math.round(media(acerto) * 100)}%`);
  const fases = [...new Set(rs.flatMap((r) => r.resumo.fases.map((f) => f.fase)))];
  const linhaFases = [];
  for (const fase of fases) {
    const fs_ = rs.map((r) => r.resumo.fases.find((f) => f.fase === fase)).filter(Boolean);
    const causas = {};
    for (const f of fs_) for (const [c, n] of Object.entries(f.porCausa)) causas[c] = (causas[c] ?? 0) + n;
    const l = { fase, s: media(fs_.map((f) => f.s)), vidas: media(fs_.map((f) => f.vidas)), golpes: media(fs_.map((f) => f.golpes)), ameacas: media(fs_.map((f) => f.ameacasMedia)), respiro: media(fs_.map((f) => f.respiroMax)), causas };
    linhaFases.push(l);
    console.log(`  ${fase.padEnd(12)} ${f1(l.s).padStart(6)} s · vidas ${f1(l.vidas)} · golpes ${f1(l.golpes)} · ameaças ${f1(l.ameacas)} · respiro ${f1(l.respiro)} s · ${Object.entries(causas).map(([c, n]) => `${c} ${n}`).join(', ')}`);
  }
  saida.push({ grupo: k, n: rs.length, tetos, s: media(s), vidas: media(vidas), golpes: media(golpes), mortes: media(mortes), acerto: media(acerto), fases: linhaFases });
}
if (outJson) fs.writeFileSync(outJson, JSON.stringify(saida, null, 1));
