// Onde ficam as BATERIAS da Capitânia, medidas na própria arte em vez de estimadas.
//
// Os offsets de `BossCapitania.BATTERIES` são em px a partir do CENTRO do sprite, e trocar a
// arte os invalida: um tiro que nasce fora da boca desmente o desenho. A régua aqui é a própria
// animação de salva — cada quadro dela acende UM clarão na boca de UMA bateria, então o clarão
// É a medida. Diferença por pixel contra o estático, centroide do ganho de luz.
//
// uso: node scripts/_medir-capitania.mjs
import sharp from 'sharp';

async function raw(f) {
  const { data, info } = await sharp(`public/sprites/${f}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

const base = await raw('capitania.png');
const cx = base.W / 2;
const cy = base.H / 2;

console.log(`capitania.png ${base.W}x${base.H} · centro (${cx}, ${cy})\n`);

for (let i = 0; i < 9; i++) {
  const q = await raw(`capitania-fire-anim-${i}.png`);

  // 1) O mapa de ganho de luz contra o estático.
  const ganho = new Float32Array(q.W * q.H);
  let pico = 0;
  let picoP = -1;
  for (let p = 0; p < q.W * q.H; p++) {
    const lumA =
      (q.data[p * 4] + q.data[p * 4 + 1] + q.data[p * 4 + 2]) * (q.data[p * 4 + 3] / 255);
    const lumB =
      (base.data[p * 4] + base.data[p * 4 + 1] + base.data[p * 4 + 2]) *
      (base.data[p * 4 + 3] / 255);
    const g = lumA - lumB;
    ganho[p] = g;
    if (g > pico) {
      pico = g;
      picoP = p;
    }
  }

  // Um clarão de boca satura em branco-laranja. Ganho baixo é só luzinha de casco piscando,
  // que existe em TODO quadro e não marca bateria nenhuma.
  if (pico < 350) {
    console.log(`quadro ${i}: sem clarão (quadro calmo · pico ${pico.toFixed(0)})`);
    continue;
  }

  // 2) O centroide SÓ da vizinhança do pico. Media global falhava porque o disparo alaranja o
  // casco inteiro de leve, e esse brilho espalhado puxava o centroide para o meio da nave —
  // dava sempre a mesma posição, qualquer que fosse a bateria que disparou.
  const px = picoP % q.W;
  const py = Math.floor(picoP / q.W);
  const R = 10;
  let soma = 0;
  let sx = 0;
  let sy = 0;
  for (let y = Math.max(0, py - R); y <= Math.min(q.H - 1, py + R); y++) {
    for (let x = Math.max(0, px - R); x <= Math.min(q.W - 1, px + R); x++) {
      const g = ganho[y * q.W + x];
      if (g < pico * 0.5) continue;
      soma += g;
      sx += x * g;
      sy += y * g;
    }
  }
  const mx = sx / soma;
  const my = sy / soma;
  console.log(
    `quadro ${i}: clarão em (${mx.toFixed(1)}, ${my.toFixed(1)}) · ` +
      `DO CENTRO x=${Math.round(mx - cx)} y=${Math.round(my - cy)} · pico ${pico.toFixed(0)}`,
  );
}
