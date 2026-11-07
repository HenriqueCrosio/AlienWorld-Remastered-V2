// 07/11 — Part B, step 1 (the rings): the sheet. Round 1 showed two ways to wear the art (rigid rings × bent skin);
// he chose the SKIN ("A Pele contínua está muito boa, movimento natural, fluido") and circled the ugly spots: the
// turned head breaking up, the head/neck joint, the stuck head; and asked for a torn stump. Round 2 shows the fixes.
//   node scripts/_serpente/_enguia-aneis-folha.mjs
// (needs: `_enguia-faixa.mjs`, the normal maps from the PixelLab, and `_enguia-maquete.mjs desvia <dir>/cru corpo=pele
//  fotos=1` + `corpo=pele luz=0 ate=24 fotos=1`)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { N } from './enguia/numeros.mjs';
import { carregaArte, ALTURA, PESCOCO } from './enguia/arte.mjs';

const DIR = 'docs/superpowers/folhas/2026-11-07/enguia-aneis';
const A = await carregaArte(N);
// the joined normal map of the strip, ×4, for the sheet
{
  const F = A.faixa, K = 4, w = F.w * K, h = ALTURA * K, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = Math.floor(x / K), r = Math.floor(y / K), p = (r * F.w + u) * 3, o = (y * w + x) * 4;
    const vazio = A.nFaixa[p] === 0 && A.nFaixa[p + 1] === 0 && A.nFaixa[p + 2] === 0;
    out.set(vazio ? [13, 15, 21, 255] : [(A.nFaixa[p] + 1) * 127.5, (A.nFaixa[p + 1] + 1) * 127.5, (A.nFaixa[p + 2] + 1) * 127.5, 255], o);
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(DIR, 'faixa-normal-x4.png'));
  await sharp(path.join(DIR, 'cabeca-normal.png')).resize(384, 256, { kernel: 'nearest' }).toFile(path.join(DIR, 'cabeca-normal-x4.png'));
  await sharp('docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png').resize(384, 256, { kernel: 'nearest' }).toFile(path.join(DIR, 'cabeca-x4.png'));
}
const info = JSON.parse(fs.readFileSync(path.join(DIR, 'faixa.json'), 'utf8'));
const jsonB = JSON.parse(fs.readFileSync(path.join(DIR, 'cru', 'desvia-pele.json'), 'utf8'));
const NOME = { chegada: 'A chegada', canos: 'Os canos', mergulho: 'O mergulho', erguida: 'Erguida: o Eco', sob: 'Sob o casco', volta: 'A volta', morte: 'A morte' };
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const caps = [
  ...jsonB.capitulos.map((c) => ({ t: c.t, txt: `${NOME[c.cap]}${c.ciclo ? ` · ${c.ciclo}` : ''}` })),
  ...jsonB.mordidas.filter((m) => m.pct !== 5).map((m) => ({ t: m.t - 0.5, txt: `A mordida ${m.pct}%`, ev: true })),
].sort((a, b) => a.t - b.t);
const existe = (n) => fs.existsSync(path.join(DIR, 'cru', `desvia-pele-${n}.png`));
const circulos = [
  ['canos-fogo', 'Os canos: a cabeça pendurada', 'a mandíbula e o crânio inteiros; o pescoço sobe para fora da tela sem emenda'],
  ['chegada', 'A chegada', 'a cabeça girada sem picotar; o pescoço curva junto com o corpo'],
  ['erguida-eco', 'Erguida no rombo: o Eco', 'a junta da cabeça com o corpo sumiu: o pescoço é pele, dobra com ela'],
  ['presa', 'A morte: a cabeça presa', 'em vez de reta para cima, ela tomba de lado sobre a borda do rombo'],
].filter(([n]) => existe(n));
const outros = [
  ['posto', 'O posto (o truque do canto)'], ['mergulho', 'O mergulho'], ['volta', 'A volta'], ['posto3-fogo', 'O 3º posto (a cauda já mordida)'],
].filter(([n]) => existe(n));
const luz = ['chegada', 'mergulho', 'canos-fogo'].filter((n) => fs.existsSync(path.join(DIR, 'cru', `desvia-pele-semluz-${n}.png`)));

const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Enguia: os anéis</title>
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
  img, video { display:block; max-width:100%; border-radius:6px; border:1px solid var(--line); background:#000; image-rendering: pixelated; }
  video { width: 100%; }
  .par { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items:start; }
  @media (max-width: 860px) { .par { grid-template-columns: 1fr; } }
  .rot { color: var(--sub); font-size: 13px; margin: 4px 0 0; }
  .rot b { color: var(--txt); }
  .agora { margin-top: 8px; font-size: 18px; color: var(--cia); min-height: 1.6em; }
  .caps { display:flex; flex-wrap:wrap; gap:6px; margin-top: 12px; }
  .caps button { background:#0a0c11; color:var(--txt); border:1px solid var(--line); border-radius:6px; padding:5px 9px; font: 13px system-ui, sans-serif; cursor:pointer; }
  .caps button.ev { border-color: var(--pend); }
  .caps button span { color: var(--sub); margin-right: 6px; font-variant-numeric: tabular-nums; }
  ul { margin: 6px 0; padding-left: 22px; }
  li { margin: 4px 0; }
</style>
</head>
<body>
<main>
<h1>A enguia colossal: os anéis</h1>
<p class="sub">07/11/2026 · plano <code>plans/2026-11-07-serpente-grande-enguia.md</code>, Parte B, passo 1 · a arte aprovada (F1 + E3) no movimento aprovado · fora do jogo, nada instalado.</p>

<div class="item rec">
  <h3>Rodada 6: o rolar de volta, atrás do crânio, a raspada só com faíscas e fumaça</h3>
  <ul>
    <li><b>O rolar voltou em todas as viradas</b> (você: <i>"estava muito natural, com o movimento de uma serpente mesmo"</i>), como na rodada 4, e o mergulho voltou ao caminho de antes, para ela rolar na descida. A curva da chegada continua mais lenta. O estalo da cabeça trocando de lado fica para a etapa do PixelLab: as vistas extras da cabeça vão deixá-la girar de forma natural junto com o corpo.</li>
    <li><b>A textura atrás do crânio</b> (no Eco final, quando a cabeça gira para seguir a nave): era o pedaço de pele que eu tinha posto por baixo do crânio para fechar a fenda. Agora só fica a faixa do meio dele, que fecha a fenda e nunca aparece por cima. Abaixo, três quadros do Eco final.</li>
    <li><b>A raspada:</b> saíram as bordas acesas (a solda) e o clarão parado. Ficaram mais faíscas, mais fumaça, as gotas fundidas e as lascas.</li>
  </ul>
  <img src="cru/desvia-pele-eco-final-seq.png" alt="o Eco final" style="margin-top:10px">
  <p style="margin-top:12px"><b>A entrada no rombo (ajuste):</b> a queda do mergulho passa ~12 px mais para a direita e entra mais pelo meio do buraco. As faíscas e a fumaça saem da linha onde o corpo some atrás da borda (o lugar do clipe), em mais pontos, e duram mais: cada ponto continua fumegando e soltando algumas faíscas por ~1,2 s depois que o corpo passou. A fumaça grossa faz a maior parte do trabalho de esconder. Abaixo, a entrada a cada 0,4 s (22,6 · 23,0 · 23,4 · 23,8 s).</p>
  <img src="cru/desvia-pele-entrada-seq.png" alt="a entrada no rombo" style="margin-top:6px">
</div>

<div class="item">
  <h3>Rodada 5 (registro): a girada da chegada, as viradas fora da tela, a solda, o gêiser e a ferida</h3>
  <ul>
    <li><b>A girada da cabeça na chegada (4–5 s)</b> estava rápida e seca. Duas causas: a curva do arco era fechada, e a cabeça (rígida) trocava de lado de um quadro para o outro bem ali. Agora a curva começa antes e é mais aberta, e ela <b>desacelera</b> para contorná-la (160 → 100 px/s, sem tranco) e retoma depois. A cabeça leva ~1,2 s para girar de "olhando para a esquerda" a "olhando para baixo".</li>
    <li><b>O movimento estranho das giradas</b> (as suas 3 fotos) era ela virando de lado à vista, com o corpo rolando em leque. Agora toda virada de lado acontece <b>fora da tela</b>: abaixo da borda de baixo, dentro do buraco, acima da tela. A queda do mergulho no rombo ficou mais íngreme, para ela entrar sem virar. Na luta inteira nenhuma virada acontece à vista.</li>
    <li><b>A raspada virou solda:</b> só na faixa de metal em volta da borda do buraco, onde o corpo atravessa a borda. O metal derrete em manchas que mudam a cada quadro, esfria aos poucos (branco, amarelo, laranja, vermelho) e deixa uma marca de queimado que vai sumindo. No contato, a cada quadro: um clarão desenhado <b>por cima do corpo</b> (esconde que ele atravessa a borda), chuva de faíscas na direção do movimento, gotas de metal fundido, lascas da própria placa voando e fumaça.</li>
    <li><b>O gêiser sai só da rachadura para cima:</b> sem o reflexo para baixo. O perigo vai da rachadura (y ~168) até o alto, então quem se esconde sob a crista (y 151) continua sendo pego.</li>
    <li><b>A textura atrás da cabeça mordida:</b> a mordida no crânio (5%) deixava ver o que estava atrás. Agora ela é uma <b>ferida</b>: carne escura com brasas, borda rasgada, nunca um buraco vazado.</li>
  </ul>
  <p style="margin-top:10px"><b>A chegada, a cada 0,6 s</b> (4,0 · 4,6 · 5,2 · 5,8 s):</p>
  <img src="cru/desvia-pele-chegada-seq.png" alt="a girada da chegada">
  <div class="par" style="margin-top:10px">
    <div><img src="cru/desvia-pele-solda-zoom.png" alt="a solda"><p class="rot">A raspada: a solda na borda do buraco, as faíscas e os clarões no contato</p></div>
    <div><img src="cru/desvia-pele-solda-esfria-zoom.png" alt="a solda esfriando"><p class="rot">Logo depois: a solda esfriando aos poucos</p></div>
    <div><img src="cru/desvia-pele-geiser.png" alt="o gêiser"><p class="rot">O gêiser só da rachadura para cima</p></div>
    <div><img src="cru/desvia-pele-ferida-zoom.png" alt="a ferida"><p class="rot">A mordida no crânio como ferida</p></div>
  </div>
</div>

<div class="item">
  <h3>Rodada 4 (registro): as placas, a borda incandescente e o veneno</h3>
  <ul>
    <li><b>As placas esticadas na virada (cilindro):</b> no meio da virada a projeção espremia as poucas linhas das placas de cima por toda a largura do corpo, e virava riscos. Agora, no meio da virada, a textura é lida pelo comprimento ao redor do cilindro. As placas passam pela frente na ordem, esticando no máximo ~1,6×, e nas pontas da virada volta a ser a arte como foi desenhada.</li>
    <li><b>A borda raspada fica incandescente:</b> onde o corpo encosta na borda do rombo, o metal esquenta (o calor se acumula enquanto ela raspa): branco, amarelo, laranja e vermelho-escuro, até voltar ao normal em ~2 s. As faíscas continuam.</li>
    <li><b>O gêiser de veneno, melhor:</b> o veneno escorre para cima na coluna, as bordas se agitam em ondas, sobem bolhas, e no topo forma-se uma nuvem. A ruptura cospe veneno quando estoura, a coluna solta gotas dos lados, e o vapor que fica é maior.</li>
    <li><b>O primeiro gêiser saiu do pé do rombo:</b> agora começa em x 220 (antes 250), a cada 55 px, e a lombada vai até x 20, então a passagem continua com 7.</li>
  </ul>
  <div class="par" style="margin-top:10px">
    <div><img src="cru/desvia-pele-mergulho-zoom.png" alt="as placas na virada"><p class="rot">A virada (cilindro), ampliada: as placas de cima passam pela frente sem esticar</p></div>
    <div><img src="cru/desvia-pele-raspa-esfria-zoom.png" alt="a borda incandescente"><p class="rot">A borda do rombo, logo depois que ela raspou: incandescente, esfriando</p></div>
  </div>
</div>

<div class="item">
  <h3>Rodada 3 (registro): as suas marcações</h3>
  <ul>
    <li><b>A fenda entre o crânio e o pescoço</b> (nos canos e erguida): as duas peças agora se <b>sobrepõem</b>. A pele começa 10 px por baixo do crânio, e o crânio cobre os primeiros 6 px da pele, então a curva forte não abre fresta.</li>
    <li><b>A fenda no topo do pescoço, erguida:</b> era a virada de lado acontecendo ali, à vista. Ela subia pelo rombo ainda "virada" desde o mergulho. Agora, num trecho reto (subindo ou descendo), ela já mostra o lado da próxima curva, e a virada acontece fora da tela: embaixo do rombo, acima da tela, na borda de baixo. Na luta inteira só duas viradas ficam à vista, nas curvas onde ela muda de direção (no arco da chegada e no mergulho).</li>
    <li><b>A raspada no rombo:</b> quando a borda do corpo, dentro do buraco, encosta no lábio enquanto ela se move, saem faíscas na direção do movimento e o metal do lábio fica em brasa em pontos.</li>
    <li><b>Os gêiseres saem da rachadura:</b> cada coluna nasce de uma ruptura na linha da fissura R3, com as placas abertas e a fenda acesa em verde. O gás sobe até o alto e escorre para baixo, mais estreito. O perigo continua cobrindo a altura toda: sob a crista não tem esconderijo.</li>
    <li><b>A morte com gore:</b> a cabeça explode com clarão, dois anéis de choque, o crânio em pedaços (cada um com os próprios pixels, escurecendo, com brasas na borda), brasas, uma névoa de carne e um esguicho de gotas. Depois, o pescoço decapitado, rasgado na frente, <b>bombeia o fluido em pulsos</b> que enfraquecem. As cores são as do jogo: o fluido oleoso com reflexo laranja e os vermelhos das mordidas da fusão. No vácuo nada cai: as gotas voam e flutuam, perdendo velocidade.</li>
  </ul>
</div>

<h2>Registro da rodada 3: a virada de lado, cilindro × anel por anel</h2>
<p class="sub">(Você escolheu o cilindro, e desde a rodada 6 ele rola em todas as viradas. À esquerda, o mergulho como está agora.)</p>
<div class="par">
  <div><video id="vc" src="cru/desvia-pele-virada.mp4" controls preload="auto" muted loop></video><p class="rot"><b>Cilindro</b></p></div>
  <div><video id="va" src="cru/desvia-pele-rolaneis.mp4" controls preload="auto" muted loop></video><p class="rot"><b>Anel por anel</b></p></div>
</div>
<div class="par" style="margin-top:12px">
  <img src="cru/desvia-pele-mergulho.png" alt="cilindro"><img src="cru/desvia-pele-rolaneis-mergulho.png" alt="anel por anel">
</div>

<h2>A raspada, a explosão e o jorro</h2>
<div class="par">
  <div><img src="cru/desvia-pele-raspa.png" alt="a raspada"><p class="rot">A raspada no lábio do rombo (faíscas e pontos em brasa)</p></div>
  <div><img src="cru/desvia-pele-geiser.png" alt="o gêiser"><p class="rot">O gêiser saindo da ruptura na fissura</p></div>
  <div><img src="cru/desvia-pele-explode.png" alt="a explosão"><p class="rot">A cabeça explode</p></div>
  <div><img src="cru/desvia-pele-jorro.png" alt="o jorro"><p class="rot">O pescoço decapitado bombeando o fluido</p></div>
</div>

<div class="item">
  <h3>Rodada 2 (registro): a pele contínua, com as falhas que você circulou corrigidas</h3>
  <ul>
    <li><b>A cabeça girada não quebra mais.</b> Antes eu girava a arte pixel a pixel, e as linhas finas (a mandíbula, os dentes, o contorno) se partiam. Agora ela gira pelo método feito para pixel art (o RotSprite): a arte é ampliada 8× preservando o traço, e cada pixel girado sai dessa versão. As linhas ficam inteiras em qualquer ângulo, e nenhuma cor nova é inventada.</li>
    <li><b>A junta da cabeça com o corpo sumiu.</b> A cabeça era rígida até o fim do pescoço, e o corpo dobrava logo depois: na curva, os dois se cruzavam. Agora só o <b>crânio</b> é rígido; os ${PESCOCO} px do pescoço viraram o começo da pele e dobram junto com ela.</li>
    <li><b>A cabeça presa na morte</b> tomba de lado sobre a borda do rombo, sem ficar reta para cima. O gesto de verdade vem do PixelLab, no passo seguinte.</li>
    <li><b>A cauda mordida fica rasgada:</b> a ponta não é mais um corte reto. A borda é irregular, linha por linha, de carne escura com brasas, com fiapos e placas pendurados além dela e a pele machucada logo atrás.</li>
  </ul>
</div>

<h2>A luta inteira (a pele)</h2>
<video id="v" src="cru/desvia-pele.mp4" controls preload="auto" muted></video>
<div class="agora" id="agora"></div>
<div class="caps">
${caps.map((c) => `  <button data-t="${c.t}"${c.ev ? ' class="ev"' : ''}><span>${mmss(c.t)}</span>${c.txt}</button>`).join('\n')}
</div>

<h2>Onde você circulou</h2>
${circulos.map(([n, t, d]) => `<h3>${t}</h3><p class="sub">${d}</p><img src="cru/desvia-pele-${n}.png" alt="${t}">`).join('\n')}

<h2>A cauda mordida</h2>
<p class="sub">Depois da 2ª mordida (13%), ampliado: a ponta arrancada de forma irregular.</p>
<div class="par"><img src="cru/desvia-pele-toco2.png" alt="o toco"><img src="cru/desvia-pele-toco2-zoom.png" alt="o toco ampliado"></div>

<h2>Os outros momentos</h2>
<div class="par">
${outros.map(([n, t]) => `  <div><img src="cru/desvia-pele-${n}.png" alt="${t}"><p class="rot">${t}</p></div>`).join('\n')}
</div>

<h2>A luz por normais (com e sem)</h2>
<p class="sub">À esquerda, a arte só girada. À direita, reacesa: quando o corpo vira, o lado que encara a luz da pintura acende e o outro apaga.</p>
${luz.map((n) => `<div class="par"><img src="cru/desvia-pele-semluz-${n}.png" alt="sem luz"><img src="cru/desvia-pele-${n}.png" alt="com luz"></div>`).join('\n')}

<h2>De onde vem o corpo</h2>
<div class="item">
  <p><b>A faixa:</b> o pescoço (${PESCOCO} px) + o corpo da F1 endireitado e alongado <b>cortando nas costelas</b>: ${info.pecas} pedaços de 18 px alternados entre ${info.pool.length} começos que emendam bem (x ${info.pool.map((p) => p.a).join(', ')}). ${info.w} px no total. Abaixo, a régua: cinza = como foi desenhado, azul = os pedaços repetidos.</p>
  <img src="faixa-x4.png" alt="a faixa do corpo">
  <p style="margin-top:12px"><b>Os mapas de normais</b> (PixelLab, lite; o pescoço usa o da cabeça, que é o mesmo desenho). Custo total: 0,5 geração.</p>
  <img src="faixa-normal-x4.png" alt="as normais do corpo">
  <div class="par" style="margin-top:12px"><img src="cabeca-x4.png" alt="a cabeça E3"><img src="cabeca-normal-x4.png" alt="as normais da cabeça"></div>
</div>

<div class="item decidir">
  <h3>Os próximos passos (já nos planos)</h3>
  <p>Aprovado o corpo, vem o passo 2: <b>as animações da cabeça no PixelLab</b>, uma para cada momento (a carga dos canos, o Eco seguindo a nave e cuspindo, a preparação antes de partir, a mordida e a presa no rombo; e a pergunta da boca: ela fecha nas passagens e abre só no cuspe?). Depois o passo 3: <b>os efeitos do corpo</b>, com os mini estabilizadores soltando jato nas curvas e nas arrancadas (a spec já previa; hoje são pontinhos) e os efeitos do pixelfx. Por último, a instalação no jogo.</p>
  <p>Aprovados os anéis, o próximo é o passo 2: as animações da cabeça no PixelLab, uma para cada momento. Antes delas falta decidir se a boca fecha nas passagens e abre só no cuspe do Eco.</p>
</div>
</main>
<script>
  const v = document.getElementById('v'), agora = document.getElementById('agora');
  const bts = [...document.querySelectorAll('.caps button')];
  const caps = bts.filter((b) => !b.classList.contains('ev')).map((b) => ({ t: +b.dataset.t, txt: b.textContent.replace(/^\\d+:\\d+/, '') }));
  bts.forEach((b) => b.addEventListener('click', () => { v.currentTime = +b.dataset.t; v.play(); }));
  const vc = document.getElementById('vc'), va = document.getElementById('va');
  vc.addEventListener('play', () => { va.currentTime = vc.currentTime; va.play(); });
  vc.addEventListener('pause', () => va.pause());
  v.addEventListener('timeupdate', () => { let c = caps[0]; for (const x of caps) if (x.t <= v.currentTime + 0.05) c = x; agora.textContent = c ? c.txt : ''; });
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIR, 'aneis.html'), html);
console.log('folha →', path.join(DIR, 'aneis.html'), `(${circulos.length} círculos, ${outros.length} outros, ${luz.length} de luz)`);
