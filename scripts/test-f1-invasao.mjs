// A INVASÃO DA F1 (spec 2026-10-20-f1-cenario-design.md §5, rodada 2): o relógio puro. Uso: node scripts/test-f1-invasao.mjs
import fs from 'node:fs';
import { INVASAO } from '../src/f1/numerosF1.ts';
import {
  agendaDasLuzes, luzMorta, alfaMagenta, holofoteAceso, rajadasDaArma, tracantesEm, flakEm, posNave, lugaresDasExplosoes,
  explosaoEm, rastroEm,
} from '../src/f1/ritmosF1.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const D = JSON.parse(fs.readFileSync('public/sprites/f1/dados.json', 'utf8'));
const janelas = D.grupos.filter((g) => g.tipo === 'janela');

// ── AS JANELAS ──
const agenda = agendaDasLuzes(janelas);
const J = INVASAO.janelas;
conferir(agenda.length === janelas.length && agenda.every((t) => t >= J.ini && t <= J.fim), `toda janela morre entre ${J.ini} e ${J.fim} s`, [Math.min(...agenda), Math.max(...agenda)]);
const dist = (g) => Math.hypot(g.x + g.w / 2 - INVASAO.centro.x, g.y + g.h / 2 - INVASAO.centro.y);
const ordem = janelas.map((g, i) => [dist(g), agenda[i]]).sort((a, b) => a[0] - b[0]);
const media = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const perto = media(ordem.slice(0, 20).map((v) => v[1])), longe = media(ordem.slice(-20).map((v) => v[1]));
conferir(perto > longe + 20, 'de fora para dentro: as da cidadela morrem bem depois das de fora', { perto, longe });
conferir(JSON.stringify(agendaDasLuzes(janelas)) === JSON.stringify(agenda), 'a agenda é determinística', null);
conferir(!luzMorta(30, 29) && luzMorta(30, 30) && luzMorta(30, 99), 'acesa antes, apagada de vez depois', null);
const naFalha = [29.62, 29.66, 29.7, 29.74, 29.78, 29.82, 29.86, 29.9, 29.94, 29.98].map((t) => luzMorta(30, t));
conferir(naFalha.includes(true) && naFalha.includes(false), 'a falha pisca nos últimos 0,4 s', naFalha);

// ── O MAGENTA ──
conferir(alfaMagenta(40, 3, 0, 39.9) === 0, 'o magenta não existe antes da hora', null);
const am = [41, 42, 43, 44].map((t) => alfaMagenta(40, 3, 0, t));
conferir(am.every((a) => a > 0 && a <= INVASAO.magenta.alfaMax), 'depois, pulsa sem passar do teto (mais apagado que os olhos dos inimigos)', am);

// ── A DEFESA ──
for (const h of INVASAO.holofotes) conferir(holofoteAceso(h.fim, 0) && !holofoteAceso(h.fim, h.fim) && !holofoteAceso(h.fim, 90), `o holofote de x ${h.x} apaga aos ${h.fim} s`, null);
for (const a of INVASAO.armas) {
  const r = rajadasDaArma(a);
  conferir(r.length >= 3 && r.every((b) => b.t < a.fim), `a arma de x ${a.x} dispara ${r.length} rajadas, todas antes dos ${a.fim} s`, r.map((b) => b.t.toFixed(1)));
  const b = r[1];
  const voo = tracantesEm(a, r, b.t + 0.5);
  conferir(voo.length > 0 && voo.every((p) => p.y < a.y), 'os traçantes sobem', voo);
  conferir(tracantesEm(a, r, a.fim + 2).length === 0, 'e param depois que a arma cai', null);
  const comFlak = r.find((q) => q.flak);
  if (comFlak) {
    const R = INVASAO.rajada;
    const te = comFlak.t + (comFlak.tiros - 1) * R.cadencia + R.vida * 0.85;
    const f = flakEm(a, r, te + 0.01, 5);
    conferir(f !== null && f.quadro === 0 && f.y < a.y, 'o flak estoura no alto, no fim da rajada', f);
  }
}

// ── AS NAVES ──
for (const n of INVASAO.naves) {
  const ini = posNave(n, n.t - 0.1), meio = posNave(n, n.t + n.dur / 2), fim = posNave(n, n.t + n.dur + 0.1);
  conferir(ini === null && fim === null && meio !== null && meio.alfa > 0.5, `a nave das ${n.t} s só existe na descida`, { ini, meio, fim });
  const quase = posNave(n, n.t + n.dur * 0.99);
  conferir(quase.alfa < 0.05, 'e some na névoa ao pousar', quase.alfa);
  conferir(n.t + n.dur <= 63, 'nenhuma desce depois do silêncio (63 s)', n.t + n.dur);
}

// ── AS EXPLOSÕES ──
const lugares = lugaresDasExplosoes(janelas, agenda);
conferir(lugares.length === INVASAO.explosoes.length && lugares.every((l) => l.t <= 63), 'as explosões acabam antes do silêncio', lugares.map((l) => l.t));
conferir(new Set(lugares.map((l) => `${l.x},${l.y}`)).size === lugares.length, 'cada uma num lugar', lugares);
const intervalos = lugares.slice(1).map((l, i) => l.t - lugares[i].t);
conferir(intervalos.every((d) => d >= 4), 'um evento forte por vez: ao menos 4 s entre elas', intervalos);
conferir(explosaoEm(20, 19.9, 24).quadro === null && explosaoEm(20, 20, 24).quadro === 0 && explosaoEm(20, 25, 24).quadro === null, 'a explosão dura os seus quadros e acaba', null);
conferir(explosaoEm(20, 20.05, 24).clarao > explosaoEm(20, 21, 24).clarao, 'o clarão nas nuvens decai', null);
const r0 = rastroEm(20, 20.1), r1 = rastroEm(20, 21), r2 = rastroEm(20, 40);
conferir(!r0.fogo && r1.fogo && r1.fumaca === 0 && r2.fumaca === INVASAO.rastro.alfaFumaca, 'deixa um fogo, depois uma coluna de fumaça que entra devagar', { r0, r1, r2 });

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
