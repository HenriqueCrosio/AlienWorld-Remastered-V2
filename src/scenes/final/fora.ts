import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * FORA — capítulo 4, A FERIDA (spec §3). O arranjo que ele escolheu na folha de 24/09 (*"D com a lua espelhada
 * igual à lua do B"*): o biomecânico INTEIRO por cima da lua da colônia, que aparece PERTO, embaixo, com a
 * atmosfera acesa. O fundo é o céu do zero-G espelhado (`f8-fundo-ferida.png`) — a pintura da decolagem
 * reaproveitada, mas não igual ao começo. A queda do capítulo 5 vira consequência do que se vê: o corpo já está
 * sobre ela.
 *
 * O Leviatã é RECORTADO do conceito aprovado (`scripts/_f8/_recortar-leviata.mjs`), não gerado de novo. O corpo
 * vem com a lava APAGADA; a camada de lava por cima pulsa fraca — ele ainda está morrendo. A nuvem que vinha no
 * conceito se desfaz em pontilhado (sobre este céu ela lia como mancha); o vazamento segue em partículas.
 *
 * ⚠️ A LUA É FIXA: ela é o próprio fundo, parado o plano todo (a regra física da spec — astro não cresce sem a
 * câmera ir até ele). A sonda cobra `escalasLua` com UM valor só.
 */
const LEV_X = 12;
const LEV_Y = 6;
/** A ferida, na tela: a boca das costelas abertas, de onde a nave sai (medida no recorte: x=206, y=69). */
const FERIDA_X = LEV_X + 206;
const FERIDA_Y = LEV_Y + 69;
/** A região animada da ferida no recorte (`scripts/_f8/_ferida-regiao.json`) e o passo do vai-e-vem. */
const FERIDA_REGIAO_X = 100;
const FERIDA_MS = 150;
/** A deriva do corpo no plano todo: devagar, para baixo e para a direita — rumo à lua (a queda começa aqui). */
const DERIVA_X = 10;
const DERIVA_Y = 16;

export function montarFora(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 4;
  scene.cameras.main.resetFX();

  const fundo = scene.add.image(0, 0, 'f8FundoFerida').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const corpo = scene.add.image(LEV_X, LEV_Y, 'f8Leviata').setOrigin(0, 0).setDepth(DEPTH.CENARIO);
  // A lava pulsante FORA da ferida — dentro dela, a lava vem na própria animação (duas lavas seriam fantasma).
  const lava = scene.add.image(LEV_X, LEV_Y, 'f8LeviataLavaFora').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 1);
  // A FERIDA VIVA (24/09): o coração deste plano, como o núcleo foi o da câmara D — as costelas arfam, a carne
  // contrai, a lava lateja (v3 sobre a própria região, `scripts/_f8/_gerar-ferida-viva.mjs`, seed 3), em vai-e-vem.
  const ferida = scene.add.image(LEV_X + FERIDA_REGIAO_X, LEV_Y, 'f8Ferida', 0).setOrigin(0, 0).setDepth(DEPTH.CENARIO + 1);
  const nFerida = ferida.texture.frameTotal - 1; // o Phaser conta o `__BASE`
  let qf = 0;
  let sf = 1;
  const bater = scene.time.addEvent({
    delay: FERIDA_MS,
    loop: true,
    callback: () => {
      qf += sf;
      if (qf >= nFerida - 1 || qf <= 0) sf = -sf;
      ferida.setFrame(qf);
    },
  });
  // O PULSO da lava: fraco e irregular (dois senos fora de fase) — um coração falhando, não um alarme.
  let t = 0;

  // O VAZAMENTO: o que ainda sai da ferida, devagar, sem gravidade (é vácuo) — fluido escuro e gotas de lava.
  const fluido = scene.add
    .particles(FERIDA_X + 10, FERIDA_Y, 'puff', {
      speedX: { min: 8, max: 26 },
      speedY: { min: -8, max: 8 },
      scale: { start: 0.6, end: 1.4 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x2a0a10, 0x3a1016, 0x1a0c12],
      lifespan: 2600,
      frequency: 90,
    })
    .setDepth(DEPTH.CENARIO + 2);
  const gotas = scene.add
    .particles(FERIDA_X + 10, FERIDA_Y, 'f8SuccaoSheet', {
      frame: [2, 4, 5],
      speedX: { min: 10, max: 34 },
      speedY: { min: -12, max: 12 },
      rotate: { min: 0, max: 360 },
      lifespan: 3000,
      frequency: 260,
    })
    .setDepth(DEPTH.CENARIO + 2);

  const dur = T.QUEDA - T.FERIDA;
  scene.tweens.add({ targets: [corpo, lava, ferida, fluido, gotas], x: `+=${DERIVA_X}`, y: `+=${DERIVA_Y}`, duration: dur, ease: 'Sine.easeIn' });

  // A NAVE sai DA FERIDA rolando e CRESCENDO — o espelho de quando sumiu pela fenda, encolhendo (capítulo 3):
  // lá ela foi para dentro, aqui vem de dentro para fora. Estabiliza e se afasta, para cima e para a direita.
  nave.setVisible(true).setScale(0.15).setFlipX(false).setAngle(-540).setPosition(FERIDA_X, FERIDA_Y);
  scene.tweens.add({ targets: nave, scale: 1, duration: 1300, ease: 'Quad.easeOut' });
  scene.tweens.add({ targets: nave, angle: 0, x: FERIDA_X + 60, y: FERIDA_Y - 14, duration: 2200, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: nave, x: 360, y: 26, delay: 2400, duration: dur - 2400, ease: 'Sine.easeInOut' });

  return {
    update(dt: number) {
      t += dt;
      lava.setAlpha(0.55 + 0.3 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1));
      estado.escalasLua.push(+fundo.scaleX.toFixed(3));
    },
    limpar() {
      bater.remove();
      [fundo, corpo, lava, ferida, fluido, gotas].forEach((o) => o.destroy());
    },
  };
}
