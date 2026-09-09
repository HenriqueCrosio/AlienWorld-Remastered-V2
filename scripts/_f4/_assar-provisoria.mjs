// A ARTE PROVISÓRIA DO M1 (Fatia 7 · a moldura).
//
// ⚠️ ISTO É ARTE FEIA DE PROPÓSITO, e é a coisa mais importante deste arquivo. O M1 existe para
// descobrir se a mudança de GEOMETRIA funciona ANTES de gastar as 14 peças de arte em cima dela.
// Se a curva contínua estragar o jogo, o M1 é barato de desfazer; depois do M3 não é.
//
// A receita é a mesma do `_mock-moldura.mjs`, que ele aprovou em 08/09 ("o 2 ficou muito bom,
// trouxe preenchimento"): a textura é a BORDA ESQUERDA da própria pintura, ampliada e com o
// valor corrigido. Mesma mão, mesma família de cor, e uma estrutura que já É parede.
//
//   node scripts/_f4/_assar-provisoria.mjs
import sharp from 'sharp';

const FUNDO = 'public/sprites/paint-bg-f4-a.png';
const FAIXA_W = 128, FAIXA_H = 64;
const MESA_W = 96, MESA_H = 112;
const PLACA = 19;                      // a largura da nervura interna (do mock)
const BRASA = [255, 122, 60];

const rnd = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

// A TEXTURA-MÃE: a borda esquerda da pintura, ampliada 1,3x e com o valor puxado.
// ⚠️ `brightness`/`linear` aqui reproduzem o mock; o alvo de valor DE VERDADE (média 1,3x a da
// pintura, contraste interno 1,4x) é conferido no passo 6 com `_valor-faixa.mjs`.
// ⚠️ AJUSTE (passo 6): a borda esquerda desta pintura específica é escura demais para o offset
// `-26` do mock — mesmo `brightness` até 3,5 não tirava a faixa de ~0,77x a média da pintura.
// O offset do `linear` foi subido de -26 para +8 (mesmo ganho 1.45, só menos corte de sombra)
// até a régua `_valor-faixa.mjs` devolver ~1,3x. Ver task-1-report.md para os números.
const tex = await sharp(FUNDO)
  .extract({ left: 0, top: 0, width: 96, height: 216 })
  .resize(Math.round(384 * 1.3), Math.round(216 * 1.3), { kernel: 'nearest' })
  .modulate({ brightness: 1.35, saturation: 1.25 })
  .linear(1.45, 8)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const amostra = (x, y) => {
  const tw = tex.info.width, th = tex.info.height;
  const j = ((((y % th) + th) % th) * tw + (((x % tw) + tw) % tw)) * 4;
  return [tex.data[j], tex.data[j + 1], tex.data[j + 2]];
};

const clamp = (v) => Math.max(0, Math.min(255, v));

// ─── A FAIXA: 128×64, opaca de ponta a ponta, TOPO RETO ────────────────────────────────────
//
// ⚠️ TOPO RETO, e isso não é preguiça. Quem faz a parede subir e descer é o CÓDIGO, colocando
// cada placa numa altura (ver `Moldura.ts`). Uma peça com topo irregular brigaria com a curva.
//
// ⚠️ E ELA SANGRA NAS TRÊS BORDAS. Uma faixa não é um objeto, é uma PAREDE: se sobrar ar na
// esquerda, na direita ou embaixo, ela vira adesivo — que é o defeito que a moldura existe para
// matar. Foi a régua `_medir-faixas.mjs` que provou isso nas 64 candidatas de 08/09.
{
  const buf = Buffer.alloc(FAIXA_W * FAIXA_H * 4);
  for (let y = 0; y < FAIXA_H; y++) {
    for (let x = 0; x < FAIXA_W; x++) {
      const i = (y * FAIXA_W + x) * 4;
      let [r, g, b] = amostra(x + 61, y + 37);

      // A quina de 1px no topo é VOLUME, não luz; a sombra de queda logo abaixo dá a espessura.
      // ⚠️ SEM CONTORNO ACESO. Luz é PONTUAL — a primeira versão do mock desenhou um contorno na
      // borda inteira e virou neon.
      if (y < 1) { r = r * 1.45 + 10; g = g * 1.45 + 10; b = b * 1.45 + 10; }
      else if (y < 4) { r *= 0.5; g *= 0.5; b *= 0.5; }

      // A nervura entre placas internas — é ela que dá leitura de "placa", não de textura solta.
      const emenda = Math.abs((x % PLACA) - PLACA / 2) > PLACA / 2 - 1.2;
      if (emenda && y > 1 && y < 22) { r *= 0.62; g *= 0.62; b *= 0.62; }

      // A brasa: só nas emendas, e só em 1 de cada 3 delas. Contada, nunca contínua.
      if (emenda && rnd(Math.floor(x / PLACA) + 21) > 0.66 && y > 2 && y < 7) {
        const f = 0.75 * (1 - Math.abs(y - 4.5) / 2.5);
        r = r * (1 - f) + BRASA[0] * f;
        g = g * (1 - f) + BRASA[1] * f;
        b = b * (1 - f) + BRASA[2] * f;
      }

      buf[i] = clamp(r);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(b);
      buf[i + 3] = 255;                                   // OPACA — sangra nas três bordas
    }
  }
  await sharp(buf, { raw: { width: FAIXA_W, height: FAIXA_H, channels: 4 } })
    .png().toFile('public/sprites/f4-faixa-prov.png');
  console.log('✔ public/sprites/f4-faixa-prov.png  128×64  (faixa provisória — topo reto, 3 bordas sangrando)');
}

// ─── A MESA: 96×112, TOPO CHATO, ombros em rampa curta ─────────────────────────────────────
//
// ⚠️ TOPO CHATO, e isto NÃO é gosto: é a correção do defeito que custou 12 gerações em 08/09.
// A hitbox de um prop sai da LARGURA DA TEXTURA (`TerrainSystem`, `body.setSize(p.width*0.6, ...)`)
// e é um retângulo de ALTURA CHEIA. Uma silhueta de base larga e ponta fina mata numa faixa larga
// na altura da PONTA — que é justamente por onde o jogador passa. A lâmina alargada matava 46px
// no vazio. Mesa de topo chato passa por CONSTRUÇÃO, porque o desenho alcança a largura da
// textura exatamente na altura da ponta.
{
  const OMBRO = 10;                    // a rampa curta, em linhas, a partir do topo
  const buf = Buffer.alloc(MESA_W * MESA_H * 4);
  for (let y = 0; y < MESA_H; y++) {
    // A rampa só existe nas primeiras `OMBRO` linhas; abaixo disso a mesa é reta e cheia.
    const recuo = y < OMBRO ? Math.round((OMBRO - y) * 0.8) : 0;
    for (let x = 0; x < MESA_W; x++) {
      const i = (y * MESA_W + x) * 4;
      if (x < recuo || x >= MESA_W - recuo) { buf[i + 3] = 0; continue; }

      let [r, g, b] = amostra(x + 210, y + 96);
      if (y < 1) { r = r * 1.5 + 12; g = g * 1.5 + 12; b = b * 1.5 + 12; }
      else if (y < 4) { r *= 0.55; g *= 0.55; b *= 0.55; }
      // Duas nervuras verticais: dão leitura de chapa dobrada sem custar desenho.
      if (x % 31 === 0 && y > 2) { r *= 0.6; g *= 0.6; b *= 0.6; }

      buf[i] = clamp(r);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(b);
      buf[i + 3] = 255;
    }
  }
  await sharp(buf, { raw: { width: MESA_W, height: MESA_H, channels: 4 } })
    .png().toFile('public/sprites/f4-mesa-prov.png');
  console.log('✔ public/sprites/f4-mesa-prov.png   96×112 (mesa provisória — topo CHATO)');
}
