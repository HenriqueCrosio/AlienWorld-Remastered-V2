// BLOCO J (14/11) — the sheet of the profiles side by side, from the photos and numbers of `_perfis-fotos.mjs`.
//   node scripts/_j/_perfis-folha.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2];
const ROTULO = {
  paintBgF1: 'F1 · a colônia', paintBgCaverna: 'F1 · a caverna', paintBgZeroG: 'F1 · o zero-G', paintBgF2: 'F2 · a frota morta',
  paintBgF3: 'F3 · Ato 1, a nebulosa', paintBgF3Casco: 'F3 · o casco', paintBgF3Arena: 'F3 · a arena',
  paintBgF4a: 'F4 · câmara A', paintBgF4b: 'F4 · câmara B, a água', paintBgF4c: 'F4 · câmara C', paintBgF4d: 'F4 · câmara D',
};
const dados = [1, 2, 3, 4].flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, `fase${f}.json`), 'utf8')));
const ordem = Object.keys(ROTULO).map((k) => dados.find((d) => d.pintura === k)).filter(Boolean);
const med = (k) => { const v = ordem.map((d) => d.medida[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const M = { luma: med('luma'), p5: med('p5'), p95: med('p95'), sat: med('sat') };
const cel = (v, m, folga) => `<td class="${Math.abs(v - m) > folga ? 'fora' : ''}">${v}</td>`;
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bloco J · os perfis lado a lado</title>
<style>
body{background:#0b0d14;color:#cdd3e0;font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:1640px}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#9aa3b5;max-width:900px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(384px,1fr));gap:16px}
figure{margin:0}img{width:100%;image-rendering:pixelated;display:block;border:1px solid #232838}
figcaption{padding:6px 2px;font-size:13px}figcaption b{color:#fff}
table{border-collapse:collapse;margin:24px 0}td,th{padding:4px 12px;border-bottom:1px solid #232838;text-align:right}
td:first-child,th:first-child{text-align:left}.fora{color:#ffb05c;font-weight:600}
</style>
<h1>Bloco J · os perfis da Atmosfera lado a lado</h1>
<p>Uma foto de cada pintura das quatro fases, tirada do jogo 5 s depois de ela chegar à tela, com o tratamento que o jogo aplica hoje. Em laranja, na tabela, o que sai da faixa das outras.</p>
<div class="g">${ordem.map((d) => `<figure><img src="${d.pintura}.png" alt=""><figcaption><b>${ROTULO[d.pintura]}</b> · claridade ${d.medida.luma} · preto ${d.medida.p5} · branco ${d.medida.p95}</figcaption></figure>`).join('')}</div>
<table><tr><th>cena</th><th>claridade média</th><th>ponto de preto (5%)</th><th>ponto de branco (95%)</th><th>saturação</th><th>névoa</th><th>grão</th></tr>
${ordem.map((d) => `<tr><td>${ROTULO[d.pintura]}</td>${cel(d.medida.luma, M.luma, 10)}${cel(d.medida.p5, M.p5, 4)}${cel(d.medida.p95, M.p95, 22)}${cel(d.medida.sat, M.sat, 0.12)}<td>${d.atm?.densidade?.toFixed?.(2) ?? ''}</td><td>${d.atm?.grao?.toFixed?.(2) ?? ''}</td></tr>`).join('\n')}
<tr><th>mediana</th><th>${M.luma}</th><th>${M.p5}</th><th>${M.p95}</th><th>${M.sat}</th><th></th><th></th></tr></table>
</html>`;
fs.writeFileSync(path.join(DIR, 'perfis.html'), html);
console.log('folha:', path.join(DIR, 'perfis.html'));
