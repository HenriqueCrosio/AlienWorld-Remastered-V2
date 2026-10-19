// P7 · O SOBREVOO (capítulo 6) — a partir do conceito 6★ APROVADO (`conceito-6-sobrevoo-22-limpo.png`): as montanhas
// e o céu da F1, a colônia em ruínas, a carcaça atravessada. ⚠️ O POLIMENTO DA SPEC (§4, P7): a carcaça estava
// INTEIRA e LIMPA demais para quem caiu de órbita — o inpaint repinta SÓ a região dela: partida em dois, afundada
// numa cratera recém-aberta, com a borda de entulho levantada.
//
//   node scripts/_f8/_gerar-sobrevoo.mjs carcaca <seed> [<seed> ...]  → scripts/_f8/_sobrevoo-<seed>.png (candidatos)
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const C6 = `${F}/conceito-6-sobrevoo-22-limpo.png`;
const W = 384, H = 216;
const [modo, ...resto] = process.argv.slice(2);

if (modo === 'carcaca') {
  // a máscara: uma elipse sobre a carcaça (x 92..336, y 84..190), um pouco mais funda embaixo — a cratera
  const m = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - 214) / 124) ** 2 + ((y - 140) / 56) ** 2;
    m.fill(d <= 1 ? 255 : 0, (y * W + x) * 3, (y * W + x) * 3 + 3);
  }
  const mascara = await sharp(m, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  fs.writeFileSync('scripts/_f8/_sobrevoo-mascara.png', mascara);
  for (const seed of resto.map(Number)) {
    const [img] = await gerar('/inpaint-v3', {
      description: 'the colossal dead biomechanical whale-like leviathan carcass after crashing from orbit: its body BROKEN in two uneven parts with a gap between them, half SUNK into the ground inside a fresh impact crater with a raised rim of rubble and rocks, pale ribs snapped and splintered, dark charcoal hide cracked with dim glowing orange lava veins, smoke rising from the break. Dark, desaturated pixel art, light only from the lava.',
      inpainting_image: { image: b64(C6), size: { width: W, height: H } },
      mask_image: { image: b64(mascara), size: { width: W, height: H } },
      seed,
    });
    fs.writeFileSync(`scripts/_f8/_sobrevoo-${seed}.png`, img);
    console.log(`scripts/_f8/_sobrevoo-${seed}.png`);
  }
}

if (modo === 'carcaca2') {
  // 2ª RODADA (24/09): *"seed 31 está boa, mas a cratera está slopada e estranha. Precisamos usar a carcaça do seed
  // 31 no estilo da primeira imagem"* — a quebra da 31, DEITADA entre as ruínas como no conceito, sem cratera.
  // A elipse grande da 1ª rodada deixava área vazia que o gerador enchia de cratera: agora a máscara é JUSTA na
  // carcaça (elipse baixa, o corpo), e o pedido diz o chão que fica em volta.
  const m = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - 214) / 116) ** 2 + ((y - 132) / 40) ** 2;
    m.fill(d <= 1 ? 255 : 0, (y * W + x) * 3, (y * W + x) * 3 + 3);
  }
  const mascara = await sharp(m, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  for (const seed of resto.map(Number)) {
    const [img] = await gerar('/inpaint-v3', {
      description: 'the colossal dead biomechanical whale-like leviathan carcass lying on its side across the crushed colony ruins, its body BROKEN in two uneven halves with a dark gap between them, pale ribs snapped and sticking out of the break, part of the skull bone exposed, dark charcoal hide with bold glowing orange lava crack veins, resting directly on the ground and rubble, no crater. Same pixel art style as the surrounding scene: bold outlines, dark desaturated palette, light only from the lava.',
      inpainting_image: { image: b64(C6), size: { width: W, height: H } },
      mask_image: { image: b64(mascara), size: { width: W, height: H } },
      seed,
    });
    fs.writeFileSync(`scripts/_f8/_sobrevoo2-${seed}.png`, img);
    console.log(`scripts/_f8/_sobrevoo2-${seed}.png`);
  }
}

if (modo === 'rasgo') {
  // 3ª RODADA (24/09): *"a original, só com o corpo rasgado no meio, pode sim mostrar partes mecanicas tambem, por
  // se tratar de um animal bio mecanico"*. A carcaça do conceito fica INTEIRA — cabeça, rabo, costelas, lava —
  // e só uma faixa estreita no meio do corpo (entre as costelas e a cabeça) é repintada: o rasgo, com as
  // entranhas biomecânicas à mostra.
  const m = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - 238) / 24) ** 2 + ((y - 136) / 42) ** 2;
    m.fill(d <= 1 ? 255 : 0, (y * W + x) * 3, (y * W + x) * 3 + 3);
  }
  const mascara = await sharp(m, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  fs.writeFileSync('scripts/_f8/_sobrevoo-mascara-rasgo.png', mascara);
  for (const seed of resto.map(Number)) {
    const [img] = await gerar('/inpaint-v3', {
      description: 'a deep ragged TEAR through the middle of the dead biomechanical leviathan body: the dark charcoal hide ripped open, revealing exposed biomechanical internals — bent metal pipes, torn cables, cracked armor plates and dark crimson organic tissue — with glowing orange lava along the torn edges and a little smoke. The rest of the body stays intact. Same pixel art style as the surrounding: bold outlines, dark desaturated palette, light only from the lava.',
      inpainting_image: { image: b64(C6), size: { width: W, height: H } },
      mask_image: { image: b64(mascara), size: { width: W, height: H } },
      seed,
    });
    fs.writeFileSync(`scripts/_f8/_sobrevoo3-${seed}.png`, img);
    console.log(`scripts/_f8/_sobrevoo3-${seed}.png`);
  }
}

if (modo === 'instalar') {
  // A ESCOLHIDA (24/09): a 3ª rodada, seed 44 — a original com o corpo rasgado no meio e as entranhas biomecânicas.
  // Sai em três peças:
  //   f8-sobrevoo.png            o quadro inteiro, como ele aprovou (o capítulo 6);
  //   f8-sobrevoo-frio.png       o mesmo, com a lava DA CARCAÇA trocada pela crosta fria (a base do capítulo 7);
  //   f8-sobrevoo-lava-sheet.png a lava da carcaça, na caixa dela, em 8 estágios: as PLACAS (grupos de pixels
  //                              quentes ligados) apagam uma a uma, da cauda (esquerda) para a cabeça; no último
  //                              resta UMA — a última luz. O fogo das cúpulas não entra: é a colônia, não o bicho.
  // ⚠️ 19/10 (bloco D): a fonte e as luzes do morro passaram a ser ARGUMENTOS — a carcaça nova (a 82 com a dorsal da
  // base) não tem as luzes nos mesmos lugares da 44. Sem argumentos, reinstala a de 24/09.
  //   node scripts/_f8/_gerar-sobrevoo.mjs instalar [<fonte.png> <luzes-do-morro.json>]
  const ANTIGA = 'scripts/_f8/_sobrevoo3-44.png';
  const args = process.argv.slice(3); // (o bloco tem outro `resto` mais abaixo: a ordem das placas)
  const SRC = args[0] ?? ANTIGA;
  fs.copyFileSync(SRC, 'public/sprites/f8-sobrevoo.png');
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // ⚠️ o limiar pega os tons MÉDIOS da lava também (r>95): com r>150 sobravam rachas laranja fracas no fim do 7
  const quente = (i) => data[i] > 95 && data[i] > data[i + 2] * 1.7 && data[i] > data[i + 1] * 1.25;
  // a região da carcaça (a mesma elipse das rodadas de inpaint, um pouco maior)
  // ⚠️ 25/09 — as LUZES DO MORRO caem dentro da elipse e têm a cor da lava: apagavam junto com o bicho (*"logo
  // acima da cabeça, as luzes da montanha se apagam junto"*). Ficam de fora — elas são o mundo, não a carcaça.
  // O json: { "pontos": [[x, y], ...], "caixas": [[x0, y0, x1, y1], ...] } — as caixas tiram da carcaça o que é
  // da COLÔNIA e cai na elipse (19/10, a 82: o fogo da cúpula da direita e o entulho cor de ferrugem embaixo).
  const fora = args[1]
    ? JSON.parse(fs.readFileSync(args[1], 'utf8'))
    : { pontos: SRC === ANTIGA ? [[295, 96], [299, 96], [304, 110], [325, 111], [310, 116], [322, 117], [326, 117], [87, 143]] : [] };
  const LUZES_DO_MORRO = fora.pontos ?? [];
  const CAIXAS = fora.caixas ?? [];
  const noMorro = (x, y) =>
    LUZES_DO_MORRO.some(([mx, my]) => Math.abs(x - mx) <= 1 && Math.abs(y - my) <= 1) ||
    CAIXAS.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  const naCarcaca = (x, y) => ((x - 214) / 130) ** 2 + ((y - 132) / 58) ** 2 <= 1 && !noMorro(x, y);
  // ⚠️ 19/10 — o miolo BRANCO de uma brasa (o olho da 82: 23 px de amarelo-pálido) não é "quente" pela cor e ficava
  // aceso no quadro frio depois que a última luz apagava. Uma ilha clara PEQUENA e CERCADA de lava é o miolo da lava:
  // entra na placa. (O osso das costelas tem a mesma cor clara, mas é grande e não está cercado de lava.)
  const brasa = new Uint8Array(W * H);
  {
    const lum = (p) => 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
    const visto = new Uint8Array(W * H);
    for (let p0 = 0; p0 < W * H; p0++) {
      if (visto[p0] || lum(p0) <= 170 || !naCarcaca(p0 % W, (p0 / W) | 0)) continue;
      const ilha = [p0];
      visto[p0] = 1;
      const borda = new Set();
      for (let k = 0; k < ilha.length; k++) {
        const p = ilha[k], x = p % W, y = (p / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy, q = yy * W + xx;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if (lum(q) > 170) { if (!visto[q]) { visto[q] = 1; ilha.push(q); } } else borda.add(q);
        }
      }
      const quentes = [...borda].filter((q) => quente(q * 4)).length;
      if (ilha.length < 40 && quentes >= borda.size * 0.5) for (const p of ilha) brasa[p] = 1;
    }
  }
  const ehQuente = (p) => quente(p * 4) || brasa[p] === 1;
  const placa = new Int32Array(W * H).fill(-1);
  let n = 0;
  for (let p0 = 0; p0 < W * H; p0++) {
    const x0 = p0 % W, y0 = (p0 / W) | 0;
    if (placa[p0] !== -1 || !naCarcaca(x0, y0) || !ehQuente(p0)) continue;
    const f = [p0]; placa[p0] = n;
    for (let k = 0; k < f.length; k++) {
      const p = f[k], x = p % W, y = (p / W) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H || placa[q] !== -1 || !naCarcaca(xx, yy) || !ehQuente(q)) continue;
        placa[q] = n; f.push(q);
      }
    }
    n++;
  }
  // a caixa da lava e a ordem de apagar (pelo x médio, da esquerda para a direita — da cauda para a cabeça)
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  const soma = new Float64Array(n), cont = new Float64Array(n);
  for (let p = 0; p < W * H; p++) if (placa[p] >= 0) {
    const x = p % W, y = (p / W) | 0;
    soma[placa[p]] += x; cont[placa[p]]++;
    bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
  }
  const ordem = [...Array(n).keys()].sort((a, b) => soma[a] / cont[a] - soma[b] / cont[b]);
  // a ÚLTIMA luz: a maior placa perto da cabeça (o olho/rosto fica por último)
  const ultima = ordem.slice(-Math.max(1, Math.ceil(n / 5))).sort((a, b) => cont[b] - cont[a])[0];
  const resto = ordem.filter((p) => p !== ultima);
  const N = 8;
  const apagaEm = new Int32Array(n);
  resto.forEach((pl, k) => { apagaEm[pl] = Math.min(N - 2, Math.floor((k / Math.max(1, resto.length)) * (N - 1))); });
  apagaEm[ultima] = N - 1;
  const cw = bx1 - bx0 + 1, ch = by1 - by0 + 1;
  const folha = Buffer.alloc(cw * N * ch * 4, 0);
  for (let q = 0; q < N; q++) for (let p = 0; p < W * H; p++) {
    const pl = placa[p]; if (pl < 0) continue;
    // acesa antes do estágio dela; no estágio dela, esfriando (escurecida); depois, some
    const k = q < apagaEm[pl] ? 1 : q === apagaEm[pl] ? 0.45 : 0;
    if (k === 0) continue;
    const x = p % W - bx0, y = ((p / W) | 0) - by0, i = p * 4, o = (y * cw * N + q * cw + x) * 4;
    folha[o] = Math.round(data[i] * k); folha[o + 1] = Math.round(data[i + 1] * k); folha[o + 2] = Math.round(data[i + 2] * k); folha[o + 3] = 255;
  }
  await sharp(folha, { raw: { width: cw * N, height: ch, channels: 4 } }).png().toFile('public/sprites/f8-sobrevoo-lava-sheet.png');
  // o quadro FRIO: a lava da carcaça vira a crosta (o cinza-azulado escuro da pele dela)
  const frio = Buffer.from(data);
  for (let p = 0; p < W * H; p++) if (placa[p] >= 0) { frio[p * 4] = 30; frio[p * 4 + 1] = 32; frio[p * 4 + 2] = 40; }
  await sharp(frio, { raw: { width: W, height: H, channels: 4 } }).png().toFile('public/sprites/f8-sobrevoo-frio.png');
  fs.writeFileSync('scripts/_f8/_sobrevoo-lava-caixa.json', JSON.stringify({ left: bx0, top: by0, width: cw, height: ch, placas: n }));
  console.log(`f8-sobrevoo(-frio).png · lava: ${n} placas, caixa ${cw}×${ch} em (${bx0},${by0}), ${N} estágios`);
}
