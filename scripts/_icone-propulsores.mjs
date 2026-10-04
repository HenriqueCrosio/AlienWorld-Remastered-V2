// O ÍCONE DOS PROPULSORES (MOV_001) com a PONTA da chama (04/10, ele: o ícone *"está cortado bem na ponta da chama do
// motor"*). O desenho aprovado ocupa x 0–32 do quadro de 40 e a chama batia na borda esquerda: ele vai 6px para a
// direita e a ponta é FECHADA à mão, afinando em degraus com as cores da própria chama. Lê o aprovado (que fica
// intocado) e escreve o do jogo. Uso, da raiz: node scripts/_icone-propulsores.mjs
import sharp from 'sharp';

const ORIGEM = 'docs/superpowers/folhas/2026-10-01/pecas-novas/icones-finais/MOV_001.png';
const DESTINO = 'public/sprites/cartas/icone-MOV_001.png';
const DESLOCA = 6;
// A ponta, coluna a coluna (x novo → as linhas e as cores, de cima para baixo), centrada na linha 22 do núcleo.
const AZUL = { escuro: '041ef7', medio: '0378fa', claro: '0399fa', ciano: '08ecfc' };
const PONTA = {
  5: [19, [AZUL.escuro, AZUL.medio, AZUL.claro, AZUL.ciano, AZUL.claro, AZUL.medio, AZUL.escuro]],
  4: [20, [AZUL.escuro, AZUL.medio, AZUL.ciano, AZUL.medio, AZUL.escuro]],
  3: [20, [AZUL.escuro, AZUL.medio, AZUL.claro, AZUL.medio, AZUL.escuro]],
  2: [21, [AZUL.escuro, AZUL.medio, AZUL.escuro]],
  1: [22, [AZUL.escuro]],
};

const { data, info } = await sharp(ORIGEM).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const out = Buffer.alloc(data.length);
for (let y = 0; y < info.height; y++)
  for (let x = 0; x + DESLOCA < W; x++) data.copy(out, (y * W + x + DESLOCA) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
for (const [x, [y0, cores]] of Object.entries(PONTA)) {
  cores.forEach((hex, i) => {
    const k = ((y0 + i) * W + Number(x)) * 4;
    out[k] = parseInt(hex.slice(0, 2), 16);
    out[k + 1] = parseInt(hex.slice(2, 4), 16);
    out[k + 2] = parseInt(hex.slice(4, 6), 16);
    out[k + 3] = 255;
  });
}
await sharp(out, { raw: info }).png().toFile(DESTINO);
console.log(DESTINO);
