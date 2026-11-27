// THE MEASUREMENT SHEET (spec 2026-11-26-medicao-das-lutas §6): the robots' JSONs → per boss, per hand, the canhão's
// shortest time and the two pilots' (experiente 550 ms, comum 700 ms) time, blows, lives and deaths; per phase the
// times, the lives, the threats and the breathing room; the MARKS (§6) computed; the blows' photos when there are.
// The text of the findings goes in by hand (`--notas file.html`, inserted under each boss by its id).
//   node scripts/_rebalance/robo/folha.mjs --saida <folha.html> --chefe "Nome=dir[,dir…]" [--chefe …] [--fotos "Nome=dir"] [--notas notas.html]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const todos = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const saida = todos('--saida')[0];
const chefes = todos('--chefe').map((s) => { const [nome, dirs] = s.split('='); return { nome, dirs: dirs.split(',') }; });
const fotosDe = Object.fromEntries(todos('--fotos').map((s) => s.split('=')));
const notas = todos('--notas')[0] ? fs.readFileSync(todos('--notas')[0], 'utf8') : '';

const MAOS = ['nenhuma', 'mediana', 'forte'];
const NOME_MAO = { nenhuma: 'sem cartas', mediana: 'mediana', forte: 'forte' };
const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f1 = (n) => (Number.isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—');
const s0 = (n) => (Number.isFinite(n) ? `${Math.round(n)} s` : '—');
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const perfil = (r) => (r.robo === 'canhao' ? 'canhao' : r.reacao >= 650 ? 'comum' : 'experiente');

function ler(dirs) {
  return dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))))
    .filter((r) => r.resumo && r.robo !== 'parado');
}

async function secao(nome, runs) {
  const id = nome.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const de = (p, m) => runs.filter((r) => perfil(r) === p && r.mao === m);
  let h = `<h2 id="${id}">${esc(nome)}</h2>`;
  if (notas.includes(`data-chefe="${id}"`)) {
    const m = notas.match(new RegExp(`<section data-chefe="${id}">([\\s\\S]*?)</section>`));
    if (m) h += m[1];
  }
  h += '<table><tr><th rowspan="2">Mão</th><th>Canhão</th><th colspan="4">Piloto experiente (550 ms)</th><th colspan="4">Piloto comum (700 ms)</th></tr>';
  h += '<tr><th>a luta</th><th>a luta</th><th>golpes</th><th>vidas</th><th>mortes</th><th>a luta</th><th>golpes</th><th>vidas</th><th>mortes</th></tr>';
  for (const m of MAOS) {
    const c = de('canhao', m), e = de('experiente', m), k = de('comum', m);
    if (!c.length && !e.length && !k.length) continue;
    const cel = (rs) => rs.length ? `<td>${s0(media(rs.map((r) => r.resumo.s)))}</td><td>${f1(media(rs.map((r) => r.resumo.total.golpes)))}</td><td>${f1(media(rs.map((r) => r.resumo.total.vidas)))}</td><td>${f1(media(rs.map((r) => r.mortes ?? 0)))}</td>` : '<td colspan="4" class="dim">—</td>';
    h += `<tr><td><b>${NOME_MAO[m]}</b> <span class="dim">(${c.length}/${e.length}/${k.length})</span></td><td>${c.length ? s0(media(c.map((r) => r.resumo.s))) : '—'}</td>${cel(e)}${cel(k)}</tr>`;
  }
  h += '</table><p class="dim">Médias das lutas; entre parênteses, quantas lutas de cada robô. "Golpes" conta o que o casco das cartas segurou; "vidas", só o que tirou vida.</p>';
  // per phase, per hand
  const marcas = [];
  for (const m of MAOS) {
    const c = de('canhao', m), e = de('experiente', m), k = de('comum', m);
    if (!c.length && !e.length) continue;
    const fases = [...new Set([...c, ...e, ...k].flatMap((r) => r.resumo.fases.map((f) => f.fase)))].filter((f) => f !== 'troca' && f !== 'fusao');
    h += `<h3>${esc(nome)} · ${NOME_MAO[m]}, fase a fase</h3><table><tr><th>Fase</th><th>Canhão</th><th>Experiente</th><th>vidas</th><th>Comum</th><th>vidas</th><th>Ameaças na tela (média)</th><th>Maior respiro</th><th>Onde o experiente apanha</th></tr>`;
    for (const fase of fases) {
      const fs_ = (rs) => rs.map((r) => r.resumo.fases.find((f) => f.fase === fase)).filter(Boolean);
      const fc = fs_(c), fe = fs_(e), fk = fs_(k);
      const causas = {};
      for (const f of fe) for (const [cz, n] of Object.entries(f.porAtaque)) causas[cz] = (causas[cz] ?? 0) + n / fe.length;
      const onde = Object.entries(causas).sort((a, b) => b[1] - a[1]).map(([cz, n]) => `${esc(cz)} ${f1(n)}`).join(' · ');
      const sc = media(fc.map((f) => f.s)), se = media(fe.map((f) => f.s));
      const ve = media(fe.map((f) => f.vidas)), vk = media(fk.map((f) => f.vidas));
      const ameacas = media([...fe, ...fc].map((f) => f.ameacasMedia));
      const resp = media([...fe, ...fc].map((f) => f.respiroMax));
      h += `<tr><td>${esc(fase)}</td><td>${s0(sc)}</td><td>${s0(se)}</td><td>${f1(ve)}</td><td>${s0(media(fk.map((f) => f.s)))}</td><td>${f1(vk)}</td><td>${f1(ameacas)}</td><td>${f1(resp)} s</td><td class="dim">${onde}</td></tr>`;
      if (Number.isFinite(sc) && sc < 2) marcas.push(`<b>${esc(fase)}</b> (${NOME_MAO[m]}): a fase passa em ${f1(sc)} s no canhão — ela some.`);
      if (Number.isFinite(sc) && Number.isFinite(se) && se >= 3 * sc && sc > 3) marcas.push(`<b>${esc(fase)}</b> (${NOME_MAO[m]}): o experiente leva ${f1(se / sc)}× o tempo do canhão — fase de esquiva.`);
      if (Number.isFinite(resp) && resp < 1) marcas.push(`<b>${esc(fase)}</b> (${NOME_MAO[m]}): o maior respiro é ${f1(resp)} s — sem pausa.`);
      for (const [cz, n] of Object.entries(causas)) if (n >= 1) marcas.push(`<b>${esc(fase)}</b> (${NOME_MAO[m]}): o experiente apanha em <i>${esc(cz)}</i> ${f1(n)}× por luta.`);
    }
    h += '</table>';
  }
  if (marcas.length) h += `<h3>As marcas</h3><ul>${marcas.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const fd = fotosDe[nome];
  if (fd && fs.existsSync(path.join(fd, 'fotos.json'))) {
    const fotos = JSON.parse(fs.readFileSync(path.join(fd, 'fotos.json'), 'utf8'));
    const rel = `fotos/${id}`;
    const dest = path.join(path.dirname(saida), rel);
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fotos) await sharp(path.join(fd, f.nome)).jpeg({ quality: 85 }).toFile(path.join(dest, f.nome.replace('.png', '.jpg')));
    h += `<h3>Onde o experiente apanha (uma luta, mão mediana)</h3><div class="fotos">${fotos.map((f) => `<figure><img src="${rel}/${f.nome.replace('.png', '.jpg')}" alt=""><figcaption>${esc(f.fase)} · ${esc(f.ataque)} · ${esc(f.causa)}${f.quem ? `:${esc(f.quem)}` : ''}${f.absorvido ? ' (o casco segurou)' : ''}</figcaption></figure>`).join('')}</div>`;
  }
  return h;
}

// THE SUMMARY (all bosses side by side) and the data file (the aggregated numbers + every fight's summary)
const dados = { gerado: new Date().toISOString(), metodo: 'spec 2026-11-26-medicao-das-lutas; canhão = invulnerável e alinhado; experiente = piloto 550 ms; comum = piloto 700 ms', chefes: [] };
let resumo = '<h2 id="resumo">O resumo: todos os chefões</h2><table><tr><th>Chefão</th><th>Mão</th><th>Canhão: a luta</th><th>Experiente: a luta</th><th>vidas</th><th>mortes</th><th>Comum: vidas</th><th>mortes</th></tr>';
let corpo = '';
for (const c of chefes) {
  const runs = ler(c.dirs);
  corpo += await secao(c.nome, runs);
  const ag = { chefe: c.nome, maos: {} };
  for (const m of MAOS) {
    const de = (p) => runs.filter((r) => perfil(r) === p && r.mao === m);
    const sum = (rs) => (rs.length ? { lutas: rs.length, s: media(rs.map((r) => r.resumo.s)), golpes: media(rs.map((r) => r.resumo.total.golpes)), vidas: media(rs.map((r) => r.resumo.total.vidas)), mortes: media(rs.map((r) => r.mortes ?? 0)), fases: Object.fromEntries([...new Set(rs.flatMap((r) => r.resumo.fases.map((f) => f.fase)))].map((fa) => { const fs_ = rs.map((r) => r.resumo.fases.find((f) => f.fase === fa)).filter(Boolean); return [fa, { s: media(fs_.map((f) => f.s)), vidas: media(fs_.map((f) => f.vidas)), golpes: media(fs_.map((f) => f.golpes)), ameacas: media(fs_.map((f) => f.ameacasMedia)), respiro: media(fs_.map((f) => f.respiroMax)) }]; })) } : null);
    ag.maos[m] = { canhao: sum(de('canhao')), experiente: sum(de('experiente')), comum: sum(de('comum')) };
    const a = ag.maos[m];
    if (!a.canhao && !a.experiente) continue;
    resumo += `<tr><td>${esc(c.nome)}</td><td>${NOME_MAO[m]}</td><td>${s0(a.canhao?.s)}</td><td>${s0(a.experiente?.s)}</td><td>${f1(a.experiente?.vidas)}</td><td>${f1(a.experiente?.mortes)}</td><td>${f1(a.comum?.vidas)}</td><td>${f1(a.comum?.mortes)}</td></tr>`;
  }
  ag.lutas = runs.map((r) => ({ robo: perfil(r), mao: r.mao, reacao: r.reacao, mortes: r.mortes ?? 0, resumo: r.resumo }));
  dados.chefes.push(ag);
}
resumo += '</table><p class="dim">"Vidas" = vidas perdidas por luta (média); "mortes" = vezes por luta em que as 3 vidas acabaram. O casco das cartas segura golpes sem tirar vida.</p>';
corpo = resumo + corpo;
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(path.join(path.dirname(saida), 'dados.json'), JSON.stringify(dados));
const html = `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>A medição das lutas</title>
<style>
:root { --bg:#0e1015; --pane:#161921; --line:#2a2d36; --fg:#e4e4e8; --dim:#9a9aa6; }
* { box-sizing: border-box; }
body { background:var(--bg); color:var(--fg); font:15px/1.6 system-ui, sans-serif; margin:0 auto; max-width:1500px; padding:16px; }
h1 { font-size:28px; margin:8px 0 6px; } h2 { font-size:22px; margin:44px 0 10px; border-top:2px solid var(--line); padding-top:18px; } h3 { font-size:17px; margin:24px 0 6px; }
p, li { max-width: 1000px; } .dim { color:var(--dim); }
table { border-collapse:collapse; font-size:14px; margin:8px 0; } th, td { border:1px solid var(--line); padding:5px 9px; text-align:left; vertical-align:top; } th { background:var(--pane); }
.fotos { display:flex; flex-wrap:wrap; gap:10px; } figure { margin:0; width:384px; } figure img { width:384px; image-rendering:pixelated; border:1px solid var(--line); display:block; } figcaption { font-size:13px; color:var(--dim); }
</style></head><body>
<h1>A medição das lutas</h1>
${notas.match(/<section data-chefe="intro">([\s\S]*?)<\/section>/)?.[1] ?? ''}
${corpo}
${notas.match(/<section data-chefe="fim">([\s\S]*?)<\/section>/)?.[1] ?? ''}
</body></html>
`;
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, html);
console.log(`folha: ${saida}`);
