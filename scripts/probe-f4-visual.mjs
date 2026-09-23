// FATIA 7 · A FASE 4 — a sonda do passe visual do interior.
//
// O que só se vê rodando: se as quatro pinturas entraram na resolução do jogo, se o hangar
// SUMIU do modo interior, e se o cenário TROCA nas batidas que o roteiro manda.
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

// ─── As quatro pinturas, na resolução EXATA do jogo ───
const pinturas = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return ['paintBgF4a', 'paintBgF4b', 'paintBgF4c', 'paintBgF4d'].map((k) => {
    if (!s.textures.exists(k)) return { k, existe: false };
    const img = s.textures.get(k).getSourceImage();
    return { k, existe: true, w: img.width, h: img.height };
  });
});
console.log('pinturas ', JSON.stringify(pinturas));
for (const p of pinturas) {
  ok(p.existe, `${p.k} existe`);
  ok(p.existe && p.w === 384 && p.h === 216, `${p.k} está em 384×216 (${p.w}×${p.h})`);
}

// ─── O INTERIOR: a pintura entrou e o hangar SUMIU ───
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

const interior = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const imgs = s.children.list.filter((o) => o.type === 'Image');
  const chaves = imgs.map((o) => o.texture?.key).filter(Boolean);
  return {
    modo: s.parallax?.mode,
    usamHangar: chaves.filter((k) => k === 'hangar').length,
    pintura: chaves.filter((k) => String(k).startsWith('paintBgF4')).length,
    escalas: [
      ...new Set(
        imgs
          .filter((o) => String(o.texture?.key).startsWith('paintBgF4'))
          .map((o) => o.scaleX),
      ),
    ],
  };
});
console.log('interior ', JSON.stringify(interior));
ok(interior.modo === 'interior', `o fundo é o modo interior (${interior.modo})`);
ok(interior.usamHangar === 0, `o hangar SUMIU do interior (${interior.usamHangar} imagens usam)`);
ok(interior.pintura === 2, `a pintura entrou com as DUAS cópias (${interior.pintura})`);
ok(
  interior.escalas.length === 1 && interior.escalas[0] === 1,
  `a pintura é desenhada em escala 1 (${JSON.stringify(interior.escalas)})`,
);
// ─── A TROCA DE CENÁRIO: o roteiro manda, o Parallax obedece ───
//
// ⚠️ Espera por ESTADO (o relógio da fase), nunca por relógio de parede: um assert novo que
// gaste tempo faria a espera cega derivar. Foi assim que os quatro primeiros quadros desta
// fatia saíram todos já no chefão, em 06/09.
const pinturaEm = async (ate) => {
  for (let i = 0; i < 700; i++) {
    const e = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99; // a sonda não sabe jogar: testa-se o CENÁRIO, não quem segura o teclado
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      // ⚠️ A ARENA DO GOLFINHO (t=40–49,5) SEGURA O RELÓGIO enquanto ele vive, e esta sonda não
      // sabe matá-lo. Ela testa o CENÁRIO; quem testa o golfinho é a probe-f4-golfinho.
      if (s.golfinho) s.matarGolfinho();
      return { t: Math.round((s.elapsed ?? 0) * 10) / 10, tex: s.parallax?.pinturaAtual ?? null };
    });
    if (!e) return null;
    if (e.t >= ate) return e;
    await page.waitForTimeout(200);
  }
  return null;
};

const c1 = await pinturaEm(5);
console.log('cenario 1', JSON.stringify(c1));
ok(c1?.tex === 'paintBgF4a', `t=5s: a câmara 1 é o hangar engolido (${c1?.tex})`);

const c2 = await pinturaEm(45);
console.log('cenario 2', JSON.stringify(c2));
ok(c2?.tex === 'paintBgF4b', `t=45s: TROCOU para a caixa torácica (${c2?.tex})`);

const c3 = await pinturaEm(70);
console.log('cenario 3', JSON.stringify(c3));
ok(c3?.tex === 'paintBgF4c', `t=70s: TROCOU para o duto (${c3?.tex})`);

// ⚠️ t=110, e NÃO t=84. A câmara do núcleo entrava em t=82 até 10/09; com o duto crescendo de 11s
// para 38s (as três portas), ela foi para t=109 e o chefão para t=113. Este assert falhou verde na
// mudança e é bom que tenha falhado: um instante de sonda cravado à mão é um número que precisa
// acompanhar o roteiro, e falhar é como ele avisa.
//
// ⚠️ E t=116, NÃO MAIS t=110 (14/09): a pintura do núcleo passou a entrar PELA EMENDA — ela se revela
// atrás do pilar da junta enquanto ele atravessa a tela (`Parallax.setPinturaPelaEmenda`), e só vira
// a `pinturaAtual` quando a borda macia inteira passou da esquerda, por volta de t≈114,5. Em t=110 a
// emenda ainda nem entrou na tela, e o duto continua sendo o lugar certo à esquerda dela.
const c4 = await pinturaEm(116);
console.log('cenario 4', JSON.stringify(c4));
ok(c4?.tex === 'paintBgF4d', `t=116s: TROCOU para a câmara do núcleo, pela emenda (${c4?.tex})`);

// ─── A LEITURA DO MIOLO: o que a decoração NÃO pode tapar (teste jogado de 12/09) ───
//
// ⚠️ ESTES DOIS ASSERTS NASCERAM DE UM PRINT, não de uma falha vermelha — a lei da fatia, de novo.
// O Henrique circulou o destroço de primeiro plano atravessando o meio da tela e apontou quatro
// setas para os cabos do coração terminando no ar. As duas coisas são de POSIÇÃO, e posição é
// exatamente o que um assert sabe cobrar depois que alguém olhou a imagem uma vez.
//
// ⚠️ AMOSTRA AO LONGO DO TEMPO, e não um quadro só: as duas camadas sorteiam altura A CADA
// sprite, então um quadro que passe não prova nada sobre o próximo.
const leitura = { frenteNoMiolo: [], orgaoNoAr: [], amostras: 0 };
for (let i = 0; i < 24; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return null;
    const imgs = s.children.list.filter((o) => o.type === 'Image' && o.visible);
    const caixa = (o) => ({
      topo: Math.round(o.y - o.displayHeight * o.originY),
      base: Math.round(o.y + o.displayHeight * (1 - o.originY)),
    });
    const naTela = (o) => o.x > -o.displayWidth && o.x < 384 + o.displayWidth;
    return {
      // o destroço de PRIMEIRO PLANO é o único `derelict` em depth 60
      frente: imgs.filter((o) => o.texture?.key === 'derelict' && o.depth === 60 && naTela(o)).map(caixa),
      orgao: imgs.filter((o) => o.texture?.key === 'orgao' && naTela(o)).map(caixa),
    };
  });
  if (q) {
    leitura.amostras++;
    // O TERÇO CENTRAL (72–144) é onde o corredor vive. Nada de primeiro plano entra nele.
    for (const b of q.frente) if (b.base > 72 && b.topo < 144) leitura.frenteNoMiolo.push(b);
    // O topo do coração tem de estar ENTERRADO na faixa do teto (superfície em TETO_Y + 16 = 26
    // na abertura da fase). Acima disso os cabos dele ficam no ar — foi o que ele fotografou.
    for (const b of q.orgao) if (b.topo > 26) leitura.orgaoNoAr.push(b);
  }
  await page.waitForTimeout(250);
}
console.log('leitura  ', JSON.stringify(leitura));
ok(leitura.amostras >= 12, `a amostragem rodou (${leitura.amostras} quadros)`);
ok(
  leitura.frenteNoMiolo.length === 0,
  `o destroço de primeiro plano NUNCA entra no terço central (${leitura.frenteNoMiolo.length} invasões)`,
);
ok(
  leitura.orgaoNoAr.length === 0,
  `o coração sempre encosta o topo na faixa do teto (${leitura.orgaoNoAr.length} com cabo no ar)`,
);

console.log(falhas === 0 ? '\n✔ A FATIA 7 (BLOCO A) ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
