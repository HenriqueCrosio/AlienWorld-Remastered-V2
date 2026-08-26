// A FATIA 5 — a apresentação da Fase 3. Entra pelo atalho [M] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

/** Mantém a nave viva: a sonda não sabe jogar, e uma sonda morta testa o GameOver. */
const respirar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.parallax;
    const acha = (k) => s.children.list.filter((o) => o.texture && o.texture.key === k);
    const pint = acha('paintBgF3');
    return {
      cena: s.scene.key,
      t: Number((s.elapsed ?? 0).toFixed(1)),
      nebulaDim: p ? Number(p.nebulaDim.toFixed(2)) : null,
      pintura: pint.length
        ? { n: pint.length, y: Math.round(pint[0].y), d: pint[0].depth, a: Number(pint[0].alpha.toFixed(2)) }
        : null,
      // As camadas do Parallax, por chave: quantos sprites e o alpha do primeiro.
      camadas: (p?.layers ?? []).map((l) => ({
        key: l.key,
        n: l.sprites.length,
        alpha: l.sprites[0] ? Number(l.sprites[0].alpha.toFixed(3)) : null,
        primeiroPlano: !!l.primeiroPlano,
        casco: !!l.casco,
      })),
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);
await respirar();

const e = await estado();
console.log('t=' + e.t, JSON.stringify(e.camadas.map((c) => c.key)));

ok(e.cena === 'Game', 'está na fase');
ok(e.pintura !== null, 'a PINTURA da nebulosa está na cena');
ok(e.pintura !== null && e.pintura.n === 2, 'a pintura entra em DUAS cópias (rolagem sem buraco)');
ok(e.pintura !== null && e.pintura.y === -27, 'a pintura está em y=-27 (centrada na janela)');

// A camada procedural mais profunda da nuvem saiu; a do meio ficou.
const nebulas = e.camadas.filter((c) => c.key === 'nebula3');
ok(nebulas.length === 2, `restam 2 camadas de nebula3 procedural (achei ${nebulas.length})`);
ok(nebulas.some((c) => c.primeiroPlano), 'os VÉUS (primeiroPlano) continuam existindo');

await page.screenshot({ path: 'scripts/_f3/probe-ato1.png' });

// O CASCO SE ANUNCIA: em t≈25s ele já existe e já tem alpha, mas BAIXO.
while ((await estado()).t < 25) {
  await page.waitForTimeout(1500);
  await respirar();
}
const meio = await estado();
const cascoMeio = meio.camadas.filter((c) => c.casco);
console.log('t=' + meio.t, 'nebulaDim=' + meio.nebulaDim, JSON.stringify(cascoMeio));

ok(cascoMeio.length > 0, 'a camada do casco existe');
ok(
  cascoMeio.some((c) => c.alpha !== null && c.alpha > 0.05),
  'o casco JÁ SE VÊ na metade do Ato 1 (alpha > 0.05)',
);
ok(
  cascoMeio.every((c) => c.alpha === null || c.alpha < 0.5),
  'mas ele é só uma INSINUAÇÃO (alpha < 0.5) — a virada em t=42 ainda tem o que revelar',
);
await page.screenshot({ path: 'scripts/_f3/probe-anuncio.png' });

// ─── A TRANSIÇÃO: o RABO do Leviatã atravessa a tela ───
//
// Ele entra em t=40,5 — ANTES da nuvem abrir em t=42 — e leva ~9,5s para cruzar. A ordem é o
// desenho todo: primeiro o jogador vê O QUE alcançou, e só depois o casco se revela como o
// corpo daquilo. Um assert que só perguntasse "o rabo existe" passaria com ele entrando DEPOIS
// da virada, que é a versão sem sentido — por isso este mede o nebulaDim junto.
while ((await estado()).t < 41.5) {
  await page.waitForTimeout(800);
  await respirar();
}
const naVirada = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.filter((o) => o.texture && String(o.texture.key).startsWith('raboLeviata'));
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    nebulaDim: Number(s.parallax.nebulaDim.toFixed(2)),
    n: r.length,
    depth: r[0]?.depth ?? null,
    anim: r[0]?.anims?.currentAnim?.key ?? null,
    corpo: r[0]?.body ?? null,
  };
});
console.log('rabo    ' + JSON.stringify(naVirada));
ok(naVirada.n === 1, `o RABO está na tela na virada (achei ${naVirada.n})`);
ok(naVirada.anim === 'rabo-batida', `a nadadeira está BATENDO (anim=${naVirada.anim})`);
ok(naVirada.nebulaDim > 0.5, `e ele chega AINDA DENTRO da nuvem (nebulaDim=${naVirada.nebulaDim})`);
// Cenário, não inimigo: sem corpo físico, e atrás do jogo (depth 0) e na frente do casco (−74).
ok(naVirada.corpo === null, 'o rabo NÃO tem corpo físico (é cenário, não inimigo)');
ok(
  naVirada.depth !== null && naVirada.depth > -75 && naVirada.depth < 0,
  `depth ${naVirada.depth}: na frente do casco e atrás do jogo`,
);
await page.screenshot({ path: 'scripts/_f3/probe-rabo.png' });

// O ATO 2: a nuvem abriu e o casco é a superfície.
while ((await estado()).t < 47) {
  await page.waitForTimeout(1500);
  await respirar();
}
const ato2 = await estado();
const casco2 = ato2.camadas.filter((c) => c.casco);
console.log('t=' + ato2.t, JSON.stringify(casco2));

ok(
  casco2.some((c) => c.key === 'cascoLeviata'),
  'a BASE do casco usa a arte nova (cascoLeviata)',
);
ok(
  casco2.some((c) => c.key === 'cascoDetalhe'),
  'a PONTUAÇÃO do casco existe (cascoDetalhe)',
);
ok(
  !casco2.some((c) => c.key === 'derelict'),
  'o destroço genérico saiu da camada do casco',
);
// A base é a MAIORIA: mais sprites que a pontuação, por construção do gap.
const base = casco2.find((c) => c.key === 'cascoLeviata');
const det = casco2.find((c) => c.key === 'cascoDetalhe');
ok(
  base && det && base.n > det.n,
  `os trechos lisos são a MAIORIA da faixa (base ${base?.n} > pontuação ${det?.n})`,
);
await page.screenshot({ path: 'scripts/_f3/probe-ato2.png' });

// ─── O RODAPÉ: a faixa do casco ENCOSTA na borda de baixo? ───
//
// Achado da revisão: o `baseY` ancora a BORDA DO QUADRO, e o quadro tem 14px de padding
// transparente embaixo. Em `GAME_HEIGHT + 6` sobrava uma tira de 7px de espaço aberto no rodapé
// (dava para ver estrela passando POR BAIXO do chão) — e NENHUM assert de contagem de sprites
// pega isso, porque os sprites estavam todos lá, no lugar errado.
//
// ⚠️ Isto mede PIXEL, não estado. O limiar sai da medição: o casco fica em ~0,11–0,13 de
// luminância e o vazio em ~0,028 — 0,06 passa no meio dos dois, longe do piso de ruído.
const tiro = await page.screenshot();
const { data, info } = await sharp(tiro).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const linha = (y) => {
  let l = 0;
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return l / info.width;
};
const ultima = linha(info.height - 1);
const penultima = linha(info.height - 3);
console.log(`rodapé   linha ${info.height - 3}=${penultima.toFixed(3)} linha ${info.height - 1}=${ultima.toFixed(3)}`);
ok(
  ultima > 0.06 && penultima > 0.06,
  `a faixa do casco ENCOSTA no rodapé (última linha ${ultima.toFixed(3)} > 0.06 — vazio mediria ~0.03)`,
);

// ─── AS EMENDAS: nenhum risco PRETO vertical atravessando a faixa ───
//
// As peças vinham do PixelLab com uma coluna de contorno preta (0,008) na borda; a peça da
// direita desenha por cima, então o contorno dela virava um risco a cada ~60px. Quem apara é o
// `aparar-casco.mjs`. Aqui: nenhuma COLUNA dentro da faixa pode ser quase-preta.
const faixaY = [info.height - 40, info.height - 2];
const coluna = (x) => {
  let l = 0;
  let n = 0;
  for (let y = faixaY[0]; y <= faixaY[1]; y++) {
    const i = (y * info.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    n++;
  }
  return l / n;
};
let pretas = 0;
for (let x = 0; x < info.width; x++) if (coluna(x) < 0.05) pretas++;
ok(pretas === 0, `nenhuma emenda PRETA na faixa (${pretas} colunas abaixo de 0.05)`);

// ─── OS PROPS DO ATO 2: a colônia da FASE 1 saiu de cima do casco ───
//
// O Ato 2 sorteava `turret`/`radar`/`silo`/`wreck` — a colônia da Fase 1 parafusada nas costas
// de uma baleia. Este assert existe porque a volta é BARATA: basta alguém reabrir o `STAGE_3` e
// reaproveitar um prop que já existe. A proporção de quem ATIRA também é conferida: a troca é
// de arte, e uma mistura que dobrasse os atiradores mudaria a fase sem ninguém notar.
while ((await estado()).t < 66) {
  await page.waitForTimeout(1500);
  await respirar();
}
const vistos = new Set();
for (let i = 0; i < 8; i++) {
  const kinds = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.lives = 9;
    return s.terrain.props.getChildren().filter((p) => p.active).map((p) => p.getData('kind'));
  });
  for (const k of kinds) vistos.add(k);
  await page.waitForTimeout(1100);
}
const props = [...vistos].sort();
console.log('props ato2  ' + JSON.stringify(props));
const colonia = props.filter((k) => ['turret', 'radar', 'silo', 'wreck', 'building', 'base', 'spire'].includes(k));
ok(colonia.length === 0, `nenhum prop da COLÔNIA da Fase 1 no casco (achei: ${colonia.join(', ') || 'nenhum'})`);
ok(props.includes('lancaMisseis'), 'o LANÇA-MÍSSEIS está no casco');
ok(props.includes('respiradouro'), 'o RESPIRADOURO está no casco');
await page.screenshot({ path: 'scripts/_f3/probe-props.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
