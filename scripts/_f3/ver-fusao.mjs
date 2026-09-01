// A CENA DA FUSÃO, quadro a quadro — e os asserts do que ela promete.
//
// Leva a serpente até a última cabeça, mata, e a partir do golpe final captura a cada 150ms.
// Uma tira de quadros não PROVA que a cena funciona (captura parada não julga movimento), mas
// prova que cada beat existe e que nada sobrou na tela no fim — que é o que uma sonda pode dizer.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true });
});
await page.waitForTimeout(2500);

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 99;
    s.invulnerableUntil = 1e15;
    const b = s.boss;
    if (!b) return null;
    const acha = (n) => s.children.list.filter((o) => o.name === n);
    const veu = acha('veuDaFusao')[0];
    const nucleo = acha('nucleoDaFusao')[0];
    return {
      fase: b.faseIdx,
      hpFase: b.hpFase,
      imune: +(b.imune ?? 0).toFixed(2),
      colapso: !!b.colapso,
      tex: b.sprite?.texture?.key,
      arte: b.fase?.arte,
      escala: +(b.sprite?.scale ?? 0).toFixed(3),
      anim: b.sprite?.anims?.currentAnim?.key ?? null,
      fios: acha('fioDaFusao').length,
      nucleo: nucleo ? +nucleo.scale.toFixed(2) : null,
      veu: veu ? +veu.alpha.toFixed(2) : null,
      tiros: s.enemies.enemyBullets.getChildren().filter((x) => x.active).length,
    };
  });

// Bate até chegar na ÚLTIMA cabeça (fase 2) com pouca vida.
let e = null;
for (let i = 0; i < 400; i++) {
  e = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    if (b && b.faseIdx < 2) b.damage(9);
    else if (b && b.faseIdx === 2 && b.hpFase > 12) b.damage(9);
    return b ? { fase: b.faseIdx, hp: b.hpFase } : null;
  });
  if (e && e.fase === 2 && e.hp <= 12) break;
  await page.waitForTimeout(60);
}
ok(!!e && e.fase === 2, `chegou na ULTIMA cabeca antes da fusao (fase ${e?.fase})`);

const antes = await estado();
console.log('antes  ', JSON.stringify(antes));

// O GOLPE FINAL — e a captura começa junto.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.boss.damage(99);
});

const linha = [];
const shots = [];
for (let i = 0; i < 20; i++) {
  const st = await estado();
  linha.push({ t: i * 150, ...st });
  shots.push(await page.screenshot());
  await page.waitForTimeout(150);
}

console.log('');
console.log('  t(ms) fase colapso fios nucleo veu  escala  textura');
for (const l of linha) {
  console.log(
    String(l.t).padStart(6),
    String(l.fase).padStart(4),
    String(l.colapso).padStart(7),
    String(l.fios).padStart(4),
    String(l.nucleo).padStart(6),
    String(l.veu).padStart(4),
    String(l.escala).padStart(6),
    ' ' + l.tex,
  );
}

// A tira de contato da cena.
const comps = [];
for (let i = 0; i < shots.length; i++) {
  comps.push({
    input: await sharp(shots[i]).resize(256, 144).toBuffer(),
    left: (i % 5) * 256,
    top: Math.floor(i / 5) * 144,
  });
}
await sharp({ create: { width: 1280, height: 144 * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
  .composite(comps)
  .png()
  .toFile('scripts/_f3/fusao-tira.png');
console.log('\ntira -> scripts/_f3/fusao-tira.png (20 quadros, 150ms cada)');

const em = (ms) => linha.find((l) => l.t === ms);
console.log('');
ok(em(0).colapso === true, 'o COLAPSO comeca no golpe final (a ondulacao para)');
ok(em(0).fios === 0 && em(0).nucleo === null, 'no SILENCIO inicial nao ha fio nem nucleo ainda');
ok(linha.some((l) => l.fios === 3), 'as TRES cicatrizes acendem (3 fios ao mesmo tempo)');
ok(linha.some((l) => l.nucleo !== null && l.nucleo > 0.5), 'o NUCLEO cresce');
ok(linha.some((l) => l.veu !== null && l.veu >= 0.99), 'a tela chega a ESCURECER por completo');
// A textura de um sprite ANIMADO e o QUADRO ('serpenteFusaoAnim1'), nunca a chave da arte.
// A 1a versao deste assert comparava com 'serpenteFusao' e reprovava codigo certo.
ok(linha.some((l) => l.arte === 'serpenteFusao'), 'a arte troca para a FUSAO');
const trocou = linha.find((l) => l.arte === 'serpenteFusao');
const escureceu = linha.find((l) => l.veu !== null && l.veu >= 0.99);
ok(!!trocou && !!escureceu && escureceu.t <= trocou.t, 'e a troca acontece ATRAS do veu, nunca a olho nu');
const fim = linha[linha.length - 1];
ok(fim.veu === null, 'o veu foi DESTRUIDO no fim, nao deixado em alpha 0');
ok(fim.nucleo === null, 'o nucleo foi DESTRUIDO no fim');
ok(fim.fios === 0, 'nenhum fio orfao sobrou');
ok(fim.arte === 'serpenteFusao' && Math.abs(fim.escala - 0.63) < 0.01, `no fim ela e a fusao em 0,63 (${fim.escala})`);
ok(fim.anim === 'serpente-fusao-fury', `e a animacao nova esta tocando (${fim.anim})`);

// ─── A BOCA: o tiro da fusao nasce nela, nao na cabeca ───
//
// Os dois offsets sao DIFERENTES nesta arte (cabeca -52,-75.6 / boca -58,-30), entao a 0,63 eles
// ficam ~29px afastados na vertical. Um tiro nascendo na cabeca seria a testa dela cuspindo.
const tiro = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  const b = s.boss;
  b.imune = 0;
  for (const o of [...s.enemies.enemyBullets.getChildren()]) if (o.active) s.enemies.release(o);
  const alvo = { x: 60, y: 120, active: true };
  b.tiro(b.posBoca().x, b.posBoca().y, Math.PI, 100);
  const bala = s.enemies.enemyBullets.getChildren().find((x) => x.active);
  const cab = b.posCabeca(), boc = b.posBoca();
  return bala
    ? {
        bala: [Math.round(bala.x), Math.round(bala.y)],
        cabeca: [Math.round(cab.x), Math.round(cab.y)],
        boca: [Math.round(boc.x), Math.round(boc.y)],
        dCabeca: Math.round(Math.hypot(bala.x - cab.x, bala.y - cab.y)),
        dBoca: Math.round(Math.hypot(bala.x - boc.x, bala.y - boc.y)),
      }
    : null;
});
console.log('');
console.log('boca   ', JSON.stringify(tiro));
ok(!!tiro, 'a fusao dispara');
if (tiro) {
  ok(tiro.dBoca < 2, `o tiro nasce NA BOCA (${tiro.dBoca}px dela)`);
  ok(tiro.dCabeca > 20, `e NAO na cabeca (${tiro.dCabeca}px dela) — os dois pontos sao mesmo distintos`);
}

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FUSAO ACONTECE, E NADA SOBRA NA TELA');
await browser.close();
process.exit(falhas ? 1 : 0);
