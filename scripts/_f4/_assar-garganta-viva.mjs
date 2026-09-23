// A GARGANTA RESPIRANDO, COM O ESTOURO DE BRANCO CORRIGIDO — a folha que o prop da Fase 4 usa.
//
// ⚠️ O DEFEITO, MEDIDO. A `garganta-idle` foi gerada no PixelLab e caiu na armadilha que este
// projeto já documentou duas vezes: **o gerador não obedece limite de cor, e "pulsar" vira
// "clarear"**. Medido nos quadros crus:
//
//     garganta.png (o estático)   px claros (lum>150):  0,8%
//     garganta-idle-anim-5        px claros:            7,3%   ← NOVE VEZES mais
//
// No quadro 5 o miolo não está aceso: está BRANCO PURO. Na cutscene do hangar isso passa (a cena
// é clara e ela é um elemento entre muitos); no DUTO — a câmara mais escura das quatro — vira a
// coisa mais brilhante da tela, competindo com as veias e com o próprio estouro que vem depois.
// É exatamente a razão de o `_assar-porta-nucleo.mjs` existir.
//
// ⚠️ A CORREÇÃO NÃO É ESCURECER TUDO. Baixar o brilho geral apagaria o casco junto e mataria a
// respiração. O que se faz aqui é pôr um TETO: acima dele a luz é comprimida E puxada de volta
// para o MAGENTA da goela — porque o defeito do gerador não é só brilho, é DESSATURAÇÃO (ele
// caminha para o branco, não para o rosa quente). Abaixo do teto nada é tocado.
//
// ⚠️ E ELA SAI NUMA CHAVE NOVA. A `garganta-idle` original fica intocada: a cutscene 3 está
// MERGEADA E APROVADA, e ele já viu e aprovou esses quadros lá. Corrigir no lugar seria mudar uma
// cena fechada de carona — a fronteira que o M1 pagou caro para aprender.
//
//   node scripts/_f4/_assar-garganta-viva.mjs
import sharp from 'sharp';

const N = 11;

// ⚠️ AS DUAS ANIMAÇÕES LEVAM A MESMA CORREÇÃO, e a morte importa MAIS que o idle: ela é a que
// fica na tela depois do estouro, enquanto a carcaça rola pelo duto até o culling. Corrigir só o
// idle deixaria a peça escurecer na vida e estourar em branco na morte.
//
// ⚠️ MAS O `puxa` MUDA ENTRE AS DUAS, E ISSO CUSTOU UMA VOLTA. No IDLE a coisa clara é a GOELA
// acesa, então puxar a luz de volta para o magenta é devolver a cor que o gerador comeu. Na
// MORTE a coisa clara são os DENTES — a boca escancara e aparecem trinta deles —, e o mesmo
// puxão deixou a criatura com dentes ROSA-CHOQUE. Dente é osso: ele pode escurecer, não pode
// mudar de cor. Na morte a luz só é COMPRIMIDA, com um resto de puxão para o flare da goela.
const OBRAS = [
  { cru: 'garganta-idle-anim', saida: 'public/sprites/garganta-viva-sheet.png', puxa: 1 },
  { cru: 'garganta-morte-anim', saida: 'public/sprites/garganta-morta-sheet.png', puxa: 0.22 },
];

/** Acima deste brilho a luz é comprimida. Medido: o estático quase não passa daqui. */
const TETO = 118;
/** Quanto do excesso sobrevive. 0 = corta reto (chapa), 1 = não corrige nada. */
const SOBRA = 0.34;
/** Para onde a luz estourada é puxada: o magenta da goela, não o branco. */
const GOELA = [206, 78, 156];

for (const { cru, saida, puxa } of OBRAS) {
  const quadros = [];
  let pico = { antes: 0, depois: 0, f: 0 };

  for (let f = 0; f < N; f++) {
    const { data, info } = await sharp(`public/sprites/${cru}-${f}.png`)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    let antes = 0,
      depois = 0,
      total = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 40) continue;
      total++;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum > 150) antes++;
      if (lum <= TETO) continue;

      // Quanto este pixel passou do teto, de 0 a 1.
      const t = Math.min(1, (lum - TETO) / (255 - TETO)) * puxa;
      // 1 · puxa a cor para o magenta da goela — desfaz a DESSATURAÇÃO do gerador. Só comprimir o
      // brilho deixaria o miolo CINZA, que é tão errado quanto branco: a luz dela é da goela.
      const r = data[i] + (GOELA[0] - data[i]) * t;
      const g = data[i + 1] + (GOELA[1] - data[i + 1]) * t;
      const b = data[i + 2] + (GOELA[2] - data[i + 2]) * t;
      // 2 · comprime o brilho de volta para perto do teto.
      const alvo = TETO + (lum - TETO) * SOBRA;
      // ⚠️ A COMPRESSÃO DE BRILHO NÃO DEPENDE DO `puxa`: ela vale igual para as duas obras. O que
      // o `puxa` controla é só PARA ONDE a cor caminha, nunca QUANTO ela escurece.
      const k = alvo / Math.max(1, (r + g + b) / 3);
      data[i] = Math.min(255, Math.round(r * k));
      data[i + 1] = Math.min(255, Math.round(g * k));
      data[i + 2] = Math.min(255, Math.round(b * k));
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 > 150) depois++;
    }

    if (antes / total > pico.antes) pico = { antes: antes / total, depois: depois / total, f };
    quadros.push(
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer(),
    );
  }

  const { width: W, height: H } = await sharp(`public/sprites/${cru}-0.png`).metadata();
  await sharp({
    create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
    .png()
    .toFile(saida);

  console.log(
    `${saida}  ${N} quadros de ${W}x${H}  ·  pior quadro (#${pico.f}): px claros ` +
      `${(pico.antes * 100).toFixed(1)}% → ${(pico.depois * 100).toFixed(1)}%  (o estático é 0,8%)`,
  );
}
