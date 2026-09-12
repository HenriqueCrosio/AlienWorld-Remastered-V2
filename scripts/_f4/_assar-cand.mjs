// FATIA 7 · ASSA as candidaturas escolhidas do Henrique em peças de cenário da Fase 4.
//
// ⚠️ AS 64 FORAM REPROVADAS COMO FAIXA E ESTÃO SENDO APROVADAS COMO OUTRA COISA. Faixa precisa
// sangrar nas três bordas e ter topo reto; medido, nenhuma tem (o sangramento lateral varia de 0%
// a 100% da altura, sem regra). Mas `create_1_direction_object` faz bem exatamente o que faixa NÃO
// queria: recortar um objeto do fundo. Como PROP DE CENÁRIO, o recorte é a virtude.
//
// ⚠️ E O VALOR NÃO É CORRIGIDO AQUI, DE PROPÓSITO. Medido contra a pintura da câmara (16,4): a
// decoração que já está no jogo entra CRUA a 2,2×–4,6× e quem a empurra para o fundo é o TINT da
// camada (costela 4,59× com tint 0x4a3e48, orgao 2,60× com 0x5a4048). As escolhidas caem na mesma
// banda — A-01 a 2,20×, B-06 a 4,57× — então elas obedecem ao sistema que já existe em vez de
// inventar um segundo. Mexer no valor é mexer no `tint` da camada, no Parallax.
//
//   node scripts/_f4/_assar-cand.mjs
import fs from 'fs';
import sharp from 'sharp';

const ORIG = 'scripts/_f4/_cand';
const DEST = 'public/sprites';

/** Recorta o retângulo dos pixels opacos: peça bottom-anchored precisa da base COLADA no desenho. */
async function aparar(entrada) {
  const img = sharp(entrada).ensureAlpha();
  const { width: W, height: H } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * ESFUMA a peça numa elipse irregular. ⚠️ "sprite com BORDA RETA é veneno" (HANDOFF) — e B e C são
 * texturas de QUADRO CHEIO, então sem isto elas entram como quadrado colado no fundo. A
 * irregularidade vem de dois senos na ANGULAR: elipse perfeita lê como bolha de filtro.
 */
async function esfumar(entrada, saida) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const ang = Math.atan2(dy, dx);
      // O raio de corte ondula entre ~0,82 e ~1,0 conforme o ângulo.
      const raio = 0.91 + Math.sin(ang * 3) * 0.06 + Math.sin(ang * 5 + 1.2) * 0.03;
      const r = Math.sqrt(dx * dx + dy * dy) / raio;
      // Opaco até 0,58; rampa até 1.
      const k = r <= 0.58 ? 1 : Math.max(0, 1 - (r - 0.58) / 0.42);
      const i = (y * W + x) * 4 + 3;
      data[i] = Math.round(data[i] * k);
    }
  }
  await sharp(data, { raw: info }).png().toFile(saida);
}

// ─── PEÇA 1 · f4Passarela — a passarela de aço engolida pela carne (do objeto A) ───
//
// É a peça-assinatura da CÂMARA A, a doca engolida: um convés industrial com guarda-corpo e
// lâmpada âmbar, com as veias do bicho subindo por baixo e tomando conta. Entra APARADA e inteira
// — o corte lateral do corrimão lê como "a passarela continua no escuro", que é o que ela é.
const PASSARELA = { 'A-01': 'f4-passarela.png', 'A-05': 'f4-passarela2.png', 'A-13': 'f4-passarela3.png' };
for (const [cand, nome] of Object.entries(PASSARELA)) {
  const caixa = await aparar(`${ORIG}/${cand}.png`);
  await sharp(`${ORIG}/${cand}.png`).extract(caixa).png().toFile(`${DEST}/${nome}`);
  console.log(`✔ ${nome}  ${caixa.width}x${caixa.height}  (de ${cand})`);
}

// ─── PEÇA 2 · f4Ganglio — os núcleos acesos do bicho (do objeto B) ───
//
// ⚠️ A PRIMEIRA TENTATIVA FOI OUTRA, E A CAPTURA A MATOU. Eu tinha escolhido B-06 e B-14, os
// empilhamentos de anéis de cartilagem, para dizer "caixa torácica" na câmara B — e o mock contra
// a pintura mostrou o óbvio: **a pintura da câmara B JÁ É uma caixa torácica**, com as costelas
// pintadas ocupando o meio do quadro. A peça repetia o que já estava lá e só somava massa escura.
//
// ⚠️ A LEI: peça de cenário tem de dizer o que a PINTURA não diz. Estas duas dizem — são núcleos
// nervosos ACESOS (B-05, um núcleo grande de carne com brasa vermelha no centro; B-12, um punhado
// de nódulos acesos no escuro), e nenhuma das quatro pinturas tem um ponto de luz próprio desse
// tamanho. É a fase inteira em uma peça: *luz só onde há energia*.
const GANGLIO = { 'B-05': 'f4-ganglio.png', 'B-12': 'f4-ganglio2.png' };
for (const [cand, nome] of Object.entries(GANGLIO)) {
  await esfumar(`${ORIG}/${cand}.png`, `${DEST}/${nome}`);
  console.log(`✔ ${nome}  esfumado  (de ${cand})`);
}

console.log('\n⚠️ Agora: registrar no ART da BootScene e criar as camadas no Parallax.');
