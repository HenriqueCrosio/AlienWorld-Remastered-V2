// FATIA 7 · A ÁGUA DA ARENA DO GOLFINHO — a sonda do alagamento da câmara B.
//
// ⚠️ ELA EXISTE PARA COBRAR UMA ORDEM, e a ordem saiu do teste jogado de 12/09. A 1ª versão enchia
// no nascimento do golfinho e os dois eventos disputavam os mesmos dois segundos. Veredicto dele:
// *"achei o encher da tela muito repentino e forçado... do jeito que está agora o efeito de encher
// a tela de água casa/atrapalha com a chegada (aviso) do golfinho"*. A receita foi dele também:
// *"enchendo até ficar completamente cheio na hora do golfinho, mesmo que comece a encher antes do
// encontro"*.
//
// Daí os três asserts que importam aqui, e nenhum outro lugar os cobra:
//   1. a água está CHEIA quando a pintura troca;
//   2. a água está cheia E ASSENTADA quando o golfinho nasce;
//   3. o enchimento não invade o aviso do golfinho.
// Mexer no `agua` de t=36, no `cenario` de t=38,8 ou no `ENCHE_DUR` sem mexer nos outros quebra a
// ordem, e é isso que fica vermelho aqui.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(800);

// ─── A ÁGUA NASCE SECA, e fora da arena ela não existe ───
const antes = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { agua: s.agua?.estadoAtual ?? null, cheia: s.agua?.cheia ?? null };
});
console.log('antes    ', JSON.stringify(antes));
ok(antes.agua?.estado === 'seco', `fora da arena a água é SECA (${antes.agua?.estado})`);
ok(antes.agua?.alpha === 0, `e não pinta nada (alpha=${antes.agua?.alpha})`);

// ─── A ARTE DO CANO: chave de textura e dimensão (a lei 1 do M1) ───
const arte = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const r = {};
  for (const k of ['f4Cano', 'f4Cano2', 'f4Cano3']) {
    if (!s.textures.exists(k)) { r[k] = null; continue; }
    const img = s.textures.get(k).getSourceImage();
    r[k] = { w: img.width, h: img.height };
  }
  return r;
});
console.log('arte     ', JSON.stringify(arte));
for (const [k, v] of Object.entries(arte)) {
  ok(v !== null, `${k} existe`);
  // Girado 90° e aparado: alto e estreito. Se voltar deitado, o giro do _assar-cano.mjs se perdeu.
  ok(v !== null && v.h > v.w, `${k} está DE PÉ — a boca aponta para baixo (${v?.w}x${v?.h})`);
  ok(v !== null && v.h >= 30 && v.h <= 60, `${k} cabe na faixa do teto (altura ${v?.h}, esperado 30–60)`);
}

// ─── O SALTO: antes do t=36, para ver o enchimento inteiro ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 34.5;
  s.director.skipTo(34.5);
  s.aplicaCorredorEMoldura(34.5);
  s.hazardRate = 0;
  s.propRate = 0;
});

// ⚠️ AMOSTRAGEM DENSA, e é o ponto da sonda: o instante em que a textura troca e o instante em que
// o golfinho nasce duram UM frame. Um `waitForTimeout` grosso passaria por cima dos dois e a sonda
// ficaria verde sem ter olhado nada.
let noSwap = null;
let noNascimento = null;
let viuEnchendo = false;
let viuSuperficie = false;
let viuCanos = 0;
let picoAlpha = 0;
for (let i = 0; i < 320; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 99;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const canos = s.children.list.filter(
      (o) => o.type === 'Image' && String(o.texture?.key).startsWith('f4Cano') && o.visible && o.alpha > 0.3,
    );
    return {
      t: +(s.elapsed ?? 0).toFixed(2),
      e: s.agua?.estadoAtual ?? null,
      cheia: s.agua?.cheia ?? null,
      assentada: s.agua?.assentada ?? null,
      pintura: s.parallax?.pinturaAtual ?? null,
      vivo: !!s.golfinho,
      canos: canos.length,
    };
  });
  if (!q.e) break;
  if (q.e.estado === 'enchendo') viuEnchendo = true;
  if (q.e.nivel > 0.02 && q.e.nivel < 0.98) viuSuperficie = true;
  if (q.e.estado === 'enchendo') viuCanos = Math.max(viuCanos, q.canos);
  picoAlpha = Math.max(picoAlpha, q.e.alpha);
  if (noSwap === null && q.pintura === 'paintBgF4b') noSwap = q;
  if (noNascimento === null && q.vivo) noNascimento = q;
  if (noSwap && noNascimento) break;
  await page.waitForTimeout(30);
}

console.log('no corte ', JSON.stringify(noSwap));
console.log('no bicho ', JSON.stringify(noNascimento));
console.log('pico     ', picoAlpha.toFixed(3), ' canos vistos:', viuCanos);

ok(viuEnchendo, 'a água ENCHE (o estado `enchendo` foi visto)');
ok(viuSuperficie, 'e enche SUBINDO — há quadro com a superfície no meio da tela');
ok(noSwap !== null, 'a pintura trocou para a câmara B');

// ⭐ OS DOIS ASSERTS QUE SÃO A RAZÃO DE ESTA SONDA EXISTIR.
ok(
  noSwap?.cheia === true,
  `⭐ a pintura troca com a água JÁ CHEIA (nivel=${noSwap?.e?.nivel}, estado=${noSwap?.e?.estado})`,
);
ok(
  noNascimento?.assentada === true,
  `⭐ o golfinho nasce com a água cheia e ASSENTADA (estado=${noNascimento?.e?.estado}) — o aviso dele não divide a tela com o enchimento`,
);
ok(
  noSwap !== null && noNascimento !== null && noSwap.t < noNascimento.t,
  `a ordem é: alaga, troca a câmara, e SÓ ENTÃO o bicho chega (corte t=${noSwap?.t}, bicho t=${noNascimento?.t})`,
);

// ⚠️ O VÉU NUNCA VIRA TELA CHAPADA. A 1ª versão tinha um pico opaco de 0,96 para tapar a troca de
// pintura; ele morreu quando o enchimento foi adiantado, e quem esconde o corte voltou a ser o
// mergulho no escuro do `setPintura`. Se este assert ficar vermelho, o `surto` voltou por engano.
ok(picoAlpha <= 0.5, `o véu nunca vira tela chapada (pico de alpha ${picoAlpha.toFixed(3)}, teto 0,5)`);

// ─── OS CANOS: a água tem FONTE ───
ok(viuCanos >= 2, `há canos despejando enquanto a água sobe (${viuCanos} visíveis no pico)`);

// ─── O REPOUSO: submerso tem de deixar a fase legível ───
const submerso = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const canos = s.children.list.filter(
    (o) => o.type === 'Image' && String(o.texture?.key).startsWith('f4Cano') && o.visible && o.alpha > 0.3,
  );
  return { e: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho, canos: canos.length };
});
console.log('submerso ', JSON.stringify(submerso));
ok(submerso.e?.estado === 'submerso', `assenta em SUBMERSO (${submerso.e?.estado})`);
ok(
  submerso.e?.alpha > 0.1 && submerso.e?.alpha < 0.35,
  `e o véu de repouso deixa a fase legível (alpha=${submerso.e?.alpha}, esperado 0,1–0,35)`,
);
ok(submerso.canos === 0, `cheia a câmara, os canos FECHAM (${submerso.canos} ainda despejando)`);
ok(submerso.vivo, 'e tudo isso com o golfinho vivo — a água é da ARENA, não da morte dele');

// ─── A DRENAGEM: morto o golfinho, a câmara seca ───
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGolfinho());
let secou = null;
for (let i = 0; i < 60; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return { e: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho };
  });
  if (q.e?.estado === 'seco') { secou = q; break; }
  await page.waitForTimeout(50);
}
console.log('secou    ', JSON.stringify(secou));
ok(secou !== null, 'morto o golfinho, a água DRENA até secar');
ok(secou?.e?.alpha === 0, `e não deixa véu nenhum para trás (alpha=${secou?.e?.alpha})`);

// ─── O `G` PARA O CHEFÃO: a água some na hora, sem drenar por cima do salto ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.elapsed = 39.6;
  s.director.skipTo(39.6);
  s.spawnGolfinho(undefined, 49.5);
});
await page.waitForTimeout(700);
const antesDoG = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.agua?.estadoAtual ?? null;
});
await page.keyboard.press('G');
await page.waitForTimeout(200);
const depoisDoG = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const canos = s.children.list.filter(
    (o) => o.type === 'Image' && String(o.texture?.key).startsWith('f4Cano') && o.visible && o.alpha > 0.3,
  );
  return { agua: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho, canos: canos.length };
});
console.log('G        ', JSON.stringify({ antesDoG, depoisDoG }));
// ⚠️ O `encher()` do `spawnGolfinho` é a REDE para quem chega à arena por um caminho que pulou o
// t=36 — o treino, o `G`, ou uma sonda com `skipTo`. Arena sem água seria golfinho no seco.
ok(antesDoG?.estado !== 'seco', `a rede do spawnGolfinho enche quem pulou o t=36 (${antesDoG?.estado})`);
ok(
  depoisDoG.agua?.estado === 'seco' && depoisDoG.agua?.alpha === 0 && depoisDoG.canos === 0,
  `o G para o chefão APAGA a água e os canos na hora, sem drenar (${depoisDoG.agua?.estado})`,
);

console.log(falhas === 0 ? '\n✔ A ÁGUA DA ARENA ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
