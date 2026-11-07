// 07/11 — the sheet of the colossal eel's block mock (plan `plans/2026-11-07-serpente-grande-enguia.md` Task A5): the two
// probe videos (the dodging one big, the parked one beside it), the chapters (click = both videos jump; the current one
// written under the video while it plays), the measures from the two JSONs, the key stills, and the mock's PROPOSALS for
// him to approve or change. Text in Portuguese (it is his).
//   node scripts/_serpente/_enguia-maquete-folha.mjs [dir=docs/superpowers/folhas/2026-11-07/enguia-maquete]
import fs from 'node:fs';
import path from 'node:path';
import { N } from './enguia/numeros.mjs';
import { montaRoteiro } from './enguia/roteiro.mjs';
import { medidas } from './enguia/medidas.mjs';

const DIR = process.argv[2] ?? 'docs/superpowers/folhas/2026-11-07/enguia-maquete';
const ler = (j) => JSON.parse(fs.readFileSync(path.join(DIR, 'cru', `${j}.json`), 'utf8'));
const dv = ler('desvia'), pa = ler('parado');
const R = montaRoteiro(N, await medidas(N));

const NOME = {
  chegada: 'A chegada (a fusão + a 1ª passagem)', canos: 'Os canos de fogo', mergulho: 'O mergulho no rombo',
  erguida: 'Erguida no rombo: o Eco', sob: 'Sob o casco: os gêiseres', volta: 'A volta ao posto', morte: 'A morte no rombo',
};
const TIPO = { corpo: 'o corpo', cabeca: 'a cabeça', fogo: 'o fogo dos canos', eco: 'o Eco', geiser: 'os gêiseres' };
const s1 = (x) => x.toFixed(1).replace('.', ',');
const s2 = (x) => x.toFixed(2).replace('.', ',');
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// the chapters + the bites as markers
const marcas = [
  ...dv.capitulos.map((c) => ({ t: c.t, txt: `${NOME[c.cap]}${c.ciclo ? ` · ciclo ${c.ciclo}` : ''}` })),
  ...dv.mordidas.map((m) => ({ t: m.t, txt: m.pct === 5 ? 'A mordida no crânio (5%): a reta final' : `A mordida na cauda (${m.pct}%)`, evento: true })),
].sort((a, b) => a.t - b.t);

// where the cycle's time goes (cycle 1)
const c1 = dv.capitulos.filter((c) => c.ciclo === 1);
const proximo = dv.capitulos.find((c) => c.ciclo === 2);
const tempos = c1.map((c, i) => ({ cap: c.cap, d: (c1[i + 1]?.t ?? proximo.t) - c.t }));
const ecoDur = R.trechos.find((t) => t.hab === 'eco').t1 - R.trechos.find((t) => t.hab === 'eco').t0;
const morte = dv.capitulos.find((c) => c.cap === 'morte').t;

const linhaToques = (j) => Object.keys(TIPO).map((k) => `<td>${j.toquesPorTipo[k] ?? 0}</td>`).join('');
const folgas = Object.keys(TIPO).map((k) => { const f = dv.folgaMinimaPorTipo[k]; return f ? `<li><b>${TIPO[k]}</b>: ${s1(f.min)} px (aos ${s1(f.t)} s, ${NOME[f.cap].toLowerCase()})</li>` : ''; }).join('');
const canos = dv.canos.map((c) => `<tr><td>${s1(c.t)} s</td><td>${c.salva}ª</td><td>${c.daNave + 1} → ${c.livre + 1}</td><td>${s1(c.aviso)} s</td><td>${c.sobra == null ? '—' : `${s2(c.sobra)} s`}</td></tr>`).join('');
const tirosLinhas = Object.entries(dv.tiros.porCapitulo).map(([k, v]) => `<tr><td>${NOME[k]}</td><td>${v.tiros}</td><td>${v.acertos} (${Math.round((100 * v.acertos) / v.tiros)}%)</td><td>${v.cabeca}</td></tr>`).join('');
const ecoMin = Math.min(...dv.eco.map((e) => e.idadeMaisNova)), vistaMin = Math.min(...dv.eco.map((e) => e.vistaMin));
const fotos = [
  ['chegada', 'A chegada: ela sobe do rombo no arco'], ['posto', 'O posto (o seu truque): a cabeça pendurada no canto, o corpo subindo a borda e saindo por cima'],
  ['canos-aviso', 'Os canos: o aviso (a faixa livre azulada)'], ['canos-fogo', 'Os canos: o fogo'],
  ['posto2-fogo', 'O 2º posto (17 anéis, a cauda já mordida): o corpo ainda cobre a lateral e a faixa de baixo tem cano'],
  ['posto3-fogo', 'O 3º posto (14 anéis): o mesmo, com o enrolamento de cima mais curto'],
  ['mergulho', 'O mergulho: o corpo em S varre o meio'], ['erguida-eco', 'O Eco: as sementes no rastro'],
  ['sob-vazio', 'O corpo inteiro já sumiu no rombo: a lombada parte'], ['geiser', 'Sob o casco: a fissura R3 e um gêiser'],
  ['volta', 'A volta: sai do rombo e desce pela direita'], ['mordida', 'A mordida na cauda (22%)'], ['presa', 'A morte: a cabeça presa na boca do rombo'], ['fim', 'O fim: o rombo fica aberto (a entrada da nave)'],
].filter(([n]) => fs.existsSync(path.join(DIR, 'cru', `desvia-${n}.png`)));

const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Enguia: a maquete</title>
<style>
  :root { --bg:#0d0f15; --card:#151923; --line:#262c3a; --txt:#d9dde6; --sub:#9aa3b5; --pend:#ffb347; --ok:#6fcf97; --cia:#58c8ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--txt); font:15px/1.55 system-ui, "Segoe UI", sans-serif; }
  main { max-width: 1240px; margin: 0 auto; padding: 32px 16px 80px; }
  h1 { font-size: 28px; margin: 0 0 6px; }
  h2 { font-size: 22px; margin: 48px 0 14px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 17px; margin: 22px 0 8px; }
  p { margin: 6px 0; }
  .sub { color: var(--sub); }
  .item { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 18px; margin: 18px 0; }
  .decidir { border-color: var(--pend); }
  .rec { border-color: var(--ok); }
  code { background:#0a0c11; border:1px solid var(--line); border-radius:4px; padding:1px 5px; font-size:13px; }
  video { display:block; width:100%; border-radius:6px; border:1px solid var(--line); background:#000; image-rendering: pixelated; }
  .filmes { display:grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items:start; }
  @media (max-width: 860px) { .filmes { grid-template-columns: 1fr; } }
  .agora { margin-top: 8px; font-size: 18px; color: var(--cia); min-height: 1.6em; }
  .caps { display:flex; flex-wrap:wrap; gap:6px; margin-top: 12px; }
  .caps button { background:#0a0c11; color:var(--txt); border:1px solid var(--line); border-radius:6px; padding:5px 9px; font: 13px system-ui, sans-serif; cursor:pointer; }
  .caps button.ev { border-color: var(--pend); }
  .caps button.on { border-color: var(--cia); color: var(--cia); }
  .caps button span { color: var(--sub); margin-right: 6px; font-variant-numeric: tabular-nums; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line); }
  th { color: var(--sub); font-weight: 600; }
  .grade { display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
  figure { margin: 0; }
  figure img { display:block; width:100%; border-radius:6px; border:1px solid var(--line); image-rendering: pixelated; }
  figcaption { color: var(--sub); font-size: 13px; margin-top: 4px; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 4px 0; }
</style>
</head>
<body>
<main>
<h1>A enguia colossal: a maquete em blocos</h1>
<p class="sub">07/11/2026 · spec <code>specs/2026-11-03-serpente-grande-enguia-design.md</code> §7.1 · plano <code>plans/2026-11-07-serpente-grande-enguia.md</code> (Parte A) · fora do jogo, nada instalado.</p>

<div class="item rec">
  <h3>Rodada 2: as suas respostas, aplicadas</h3>
  <ul>
    <li><b>Um Eco por ciclo</b> e <b>o 1º aviso dos canos em 1,8 s</b> (as duas recomendações aprovadas).</li>
    <li><b>Sem o pontilhado.</b> No lugar dele ficaram gestos de cada momento: antes de partir, a cabeça recua; antes de ela sair do rombo, a borda do casco treme, solta poeira e o brilho do olho dela aparece no fundo do buraco. No Eco, a cabeça segue a nave e dá um tranco ao cuspir. Nos canos, a cabeça treme enquanto carrega.</li>
    <li><b>O arco da chegada fica</b> como estava.</li>
    <li><b>O posto pelo seu truque:</b> o corpo sobe a borda direita inteira e sai pelo canto de cima. Fora da tela ela se enrola e volta só com o pescoço e a cabeça, pendurados perto do canto, olhando a arena. Para o corpo ainda cobrir a borda até embaixo, ela ficou com 20 anéis (o topo da spec, que pedia 16–20).</li>
    <li><b>Os gêiseres só começam com o corpo inteiro dentro do rombo</b> (agora é um teste). A lombada e a fissura são as do casco vivo do jogo, a R3 que você aprovou: as colunas do casco sobem sobre ela, e a fissura escura de duas linhas abre atrás dela e se fecha a partir do rombo. Os gêiseres saem acendendo a própria fissura.</li>
    <li><b>Mais fluido, "se esgueirando":</b> o corpo virou um tubo contínuo (antes eram discos), o S do caminho ficou mais largo (14 px), uma onda corre pelo corpo o tempo todo (a cabeça firme, a cauda balançando mais), as partidas e paradas ficaram suaves, e nenhuma curva à vista dobra o corpo (o raio mínimo agora é teste).</li>
    <li><b>O rombo fica aberto no fim:</b> a cabeça se desfaz presa na boca, o resto do corpo afunda e o buraco fica vazio, pronto para a nave entrar no Leviatã.</li>
    <li><b>As velocidades ficam</b> para você sentir jogando.</li>
  </ul>
</div>

<div class="item rec">
  <h3>Rodada 2, ajuste: os canos com o corpo cobrindo a lateral</h3>
  <ul>
    <li><b>O corpo tampa toda a lateral direita</b> nos três postos: a coluna é reta na borda e só a parte grossa do corpo fica à vista, porque a ponta fina da cauda fica abaixo da tela. O fogo sai dos canos no corpo dela em todas as faixas.</li>
    <li><b>Depois das mordidas, a faixa de baixo continua com cano.</b> O enrolamento de cima, fora da tela, estica ou encolhe conforme o corpo que sobra: ${R.postos.map((p) => `${p.aneis} anéis → arco ${Math.round(p.h)} px mais alto`).join(' · ')}. Ela gasta menos corpo lá em cima e a coluna sempre chega até embaixo.</li>
    <li>As duas coisas agora são teste: em cada posto, a cada 0,5 s da pausa, toda linha da tela de y 10 a 215 tem corpo até a borda, e as 4 faixas têm cano.</li>
    <li><b>Os efeitos do pixelfx</b> (clonado em <code>Projetos folder/_referencias/pixelfx</code>) entram junto com o modelo da serpente, na Parte B. Aqui o fogo, o vapor e as explosões seguem em blocos.</li>
  </ul>
</div>

<div class="item">
  <p><b>O que é:</b> a luta inteira em velocidade real, com a enguia em <b>blocos cinzas</b> do tamanho da arte aprovada: a cabeça é a silhueta da E3 chapada, e o corpo é um tubo de ${N.corpo.aneis} anéis de 26 px, com a grossura tirada da F1. Tudo roda sobre a foto da arena. O que se julga aqui é o <b>movimento</b>, o tempo e as habilidades; a arte vem depois de você aprovar isto.</p>
  <p><b>Os dois vídeos:</b> à esquerda, uma sonda que <b>desvia</b>: anda na velocidade real da nave (110 px/s) e olha 1 s à frente. À direita, uma que fica <b>parada</b> em (70, 100). As duas atiram o tiro básico. A vida está roteirizada: as mordidas caem a 22%, 13% e 5% nos momentos marcados, para a maquete mostrar a luta até a morte.</p>
  <p><b>A meta da spec:</b> quem desvia escapa de tudo, e quem fica parado é pego. <b>Cumprida:</b> a que desvia levou <b>0 toques</b>; a parada foi pega pelo fogo, pelo Eco, pelos gêiseres e pelo corpo na chegada.</p>
</div>

<h2>Os vídeos</h2>
<div class="filmes">
  <div>
    <video id="v1" src="cru/desvia.mp4" controls preload="auto" muted></video>
    <div class="agora" id="agora"></div>
  </div>
  <div>
    <video id="v2" src="cru/parado.mp4" controls preload="auto" muted></video>
    <p class="sub">A parada (os toques piscam a nave de vermelho). Clicar num capítulo leva os dois vídeos ao mesmo ponto.</p>
  </div>
</div>
<div class="caps" id="caps">
${marcas.map((m, i) => `  <button data-t="${m.t}" data-i="${i}"${m.evento ? ' class="ev"' : ''}><span>${mmss(m.t)}</span>${m.txt}</button>`).join('\n')}
</div>

<h2>O que a maquete mediu</h2>
<div class="item">
  <h3>Os toques</h3>
  <table><tr><th></th>${Object.values(TIPO).map((t) => `<th>${t}</th>`).join('')}</tr>
  <tr><td><b>desvia</b></td>${linhaToques(dv)}</tr>
  <tr><td><b>parada</b></td>${linhaToques(pa)}</tr></table>
  <h3>A menor folga de quem desvia (a distância da caixa da nave ao perigo)</h3>
  <ul>${folgas}</ul>
  <p class="sub">A sonda reage no último instante, com reflexo perfeito. Folgas de 1–2 px no Eco e nos gêiseres querem dizer que a esquiva existe, não que ela seja confortável para uma pessoa.</p>
</div>

<div class="item">
  <h3>Os canos: o tempo sentado na faixa livre antes do fogo (quem desvia)</h3>
  <table><tr><th>quando</th><th>salva</th><th>faixa: da nave → livre</th><th>aviso</th><th>sobra</th></tr>${canos}</table>
  <p>${dv.canos.every((c) => c.livre !== c.daNave && (c.salva !== 2 || Math.abs(c.livre - c.daNave) <= 2) && (c.salva !== 3 || Math.abs(c.livre - c.daNave) === 1)) ? 'A regra da faixa livre se cumpriu em todas as salvas: nunca a faixa da nave; na 2ª, a até 2 faixas; na 3ª, a vizinha.' : '⚠️ Alguma salva quebrou a regra da faixa livre — ver a tabela.'} As faixas contam de cima: 1 = 0–54, 4 = 162–216.</p>
</div>

<div class="item">
  <h3>O Eco</h3>
  <p>${dv.eco.length} rodadas: o ponto mais novo do rastro tinha pelo menos <b>${s2(ecoMin)} s</b> quando ela cuspiu (a regra pede ≥ 0,4), e cada semente ficou à vista <b>${s2(vistaMin)} s</b> antes de explodir (a regra pede ≥ 0,6). As explosões seguem a ordem do caminho da nave.</p>
  <p class="sub">A sonda que desvia anda em círculo durante a leitura, como um jogador que não fica parado. A parada levou ${pa.toquesPorTipo.eco ?? 0} das ${pa.eco.length * N.eco.sementes} explosões: as sementes caem todas em volta dela, como a spec queria.</p>
</div>

<div class="item">
  <h3>Os tiros (quem desvia, o tiro básico a 7 por segundo)</h3>
  <table><tr><th>trecho</th><th>tiros</th><th>acertos</th><th>na cabeça</th></tr>${tirosLinhas}</table>
  <p class="sub">É o dado para a vida dela depois. Nos canos e no Eco ela fica parada com o corpo inteiro à vista: são as janelas de dano.</p>
</div>

<h2>As fotos-chave (ampliadas ×3)</h2>
<div class="grade">
${fotos.map(([n, c]) => `  <figure><img src="cru/desvia-${n}.png" alt="${c}"><figcaption>${c}</figcaption></figure>`).join('\n')}
</div>

<h2>Para você ver nesta rodada</h2>
<div class="item decidir">
  <h3>O ciclo ficou em ${s1(dv.ciclo)} s, não nos ~32 previstos</h3>
  <p>O Eco único tirou ~5 s, mas duas coisas que você pediu devolveram tempo: o corpo inteiro afunda no rombo antes dos gêiseres, e o posto pelo truque pede 20 anéis. No ciclo 1: ${tempos.map((x) => `${NOME[x.cap].toLowerCase()} <b>${s1(x.d)} s</b>`).join(' · ')}. Da chegada até ela começar a morrer: <b>${s1(morte)} s</b>.</p>
  <p>Como você quer sentir as velocidades jogando, deixei como está. O que mais pesa é o trecho sob o casco. Para chegar aos ~32 s, os botões são o afundar (hoje 260 px/s) e a lombada (hoje 140 px/s): a lombada a 180 e o afundar a 320 tiram ~1,5 s, sem mexer em mais nada.</p>
</div>
<div class="item">
  <h3>Os gestos desta maquete são blocos</h3>
  <p>A cabeça recua, treme, gira e dá o tranco girando a silhueta inteira. Servem para medir o tempo de cada momento. As animações de verdade da cabeça (a carga, o cuspe, o recuo, a presa na boca do rombo, a boca que fecha nas passagens?) saem do PixelLab na Parte B, uma por momento, a partir da E3 aprovada.</p>
</div>
<div class="item">
  <h3>Já decidido (rodada 1)</h3>
  <ul>
    <li>Um Eco por ciclo; o 1º aviso dos canos em 1,8 s (pode baixar se precisar).</li>
    <li>O arco da chegada fica. O pontilhado sai. O posto é o truque do canto. O rombo fica aberto no fim (a entrada da nave no Leviatã). As velocidades se ajustam jogando.</li>
  </ul>
</div>

<div class="item rec">
  <h3>Depois que você aprovar</h3>
  <p>Os números e os caminhos aprovados aqui viram a fonte da arte e do jogo, na ordem da Parte B do plano: os anéis recortados da F1 com os mapas de normais, os gestos da cabeça no PixelLab (e a pergunta da boca: ela fecha nas passagens?), os efeitos em pixel e a instalação, com esta maquete como oráculo.</p>
  <p class="sub">Para refazer: <code>node scripts/_serpente/_enguia-maquete.mjs desvia ${DIR}/cru fotos=1</code>, o mesmo com <code>parado</code>, e depois <code>node scripts/_serpente/_enguia-maquete-folha.mjs</code>. Os números ficam em <code>scripts/_serpente/enguia/numeros.mjs</code>, e os testes em <code>node scripts/test-enguia.mjs</code>.</p>
</div>
</main>
<script>
  const v1 = document.getElementById('v1'), v2 = document.getElementById('v2'), agora = document.getElementById('agora');
  const bts = [...document.querySelectorAll('#caps button')];
  const caps = bts.filter((b) => !b.classList.contains('ev')).map((b) => ({ t: +b.dataset.t, txt: b.textContent.replace(/^\\d+:\\d+/, ''), b }));
  bts.forEach((b) => b.addEventListener('click', () => {
    const t = Math.max(0, +b.dataset.t - (b.classList.contains('ev') ? 1 : 0));
    v1.currentTime = t; v2.currentTime = t; v1.play(); v2.play();
  }));
  v1.addEventListener('timeupdate', () => {
    let c = caps[0];
    for (const x of caps) if (x.t <= v1.currentTime + 0.05) c = x;
    agora.textContent = c ? c.txt : '';
    caps.forEach((x) => x.b.classList.toggle('on', x === c));
  });
  v1.addEventListener('play', () => { if (Math.abs(v2.currentTime - v1.currentTime) > 0.3) v2.currentTime = v1.currentTime; v2.play(); });
  v1.addEventListener('pause', () => v2.pause());
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIR, 'maquete.html'), html);
console.log('folha →', path.join(DIR, 'maquete.html'), `(${marcas.length} marcas, ${fotos.length} fotos)`);
