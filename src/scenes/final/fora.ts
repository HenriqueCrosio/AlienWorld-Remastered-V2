import { Starfield } from '../../Starfield';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * FORA — capítulo 4, A FERIDA (spec §3): o plano do A4 que ele escolheu (*"o 4 da A ficou muito bom"*). O
 * biomecânico inteiro, com o flanco aberto vazando; a nave sai rolando da ferida, estabiliza e se afasta.
 *
 * O Leviatã é RECORTADO do conceito aprovado (`scripts/_f8/_recortar-leviata.mjs`), não gerado de novo: é o
 * biomecânico certo, com a ferida no lugar, e na mesma posição do conceito (x=19, y=41 — ver `_leviata-caixa.json`).
 * O corpo vem com a lava APAGADA; a camada de lava por cima pulsa fraca — ele ainda está morrendo.
 *
 * ⚠️ A LUA É FIXA: posição e escala constantes do primeiro ao último quadro do plano (a regra física da spec —
 * astro não cresce sem a câmera ir até ele). A sonda cobra `escalasLua` com UM valor só.
 */
const LEV_X = 19;
const LEV_Y = 41;
/** A ferida, na tela: a boca das costelas abertas, de onde a nave sai (medida no recorte). */
const FERIDA_X = 225;
const FERIDA_Y = 110;
const LUA_X = 340;
const LUA_Y = 34;
/** A deriva do corpo no plano todo: devagar, para a direita e para baixo — rumo à lua (a queda começa aqui). */
const DERIVA_X = 14;
const DERIVA_Y = 6;

export function montarFora(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 4;
  const cam = scene.cameras.main;
  cam.resetFX();

  const estrelas = new Starfield(scene);
  const lua = scene.add.image(LUA_X, LUA_Y, 'f8LuaLonge').setDepth(DEPTH.FUNDO + 1);
  const corpo = scene.add.image(LEV_X, LEV_Y, 'f8Leviata').setOrigin(0, 0).setDepth(DEPTH.CENARIO);
  const lava = scene.add.image(LEV_X, LEV_Y, 'f8LeviataLava').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 1);
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
  scene.tweens.add({ targets: [corpo, lava], x: `+=${DERIVA_X}`, y: `+=${DERIVA_Y}`, duration: dur, ease: 'Sine.easeIn' });
  scene.tweens.add({ targets: [fluido, gotas], x: `+=${DERIVA_X}`, y: `+=${DERIVA_Y}`, duration: dur, ease: 'Sine.easeIn' });

  // A NAVE sai DA FERIDA rolando e CRESCENDO — o espelho de quando sumiu pela fenda, encolhendo (capítulo 3):
  // lá ela foi para dentro, aqui vem de dentro para fora. Estabiliza e se afasta para a direita.
  nave.setVisible(true).setScale(0.15).setFlipX(false).setAngle(-540).setPosition(FERIDA_X, FERIDA_Y);
  scene.tweens.add({ targets: nave, scale: 1, duration: 1300, ease: 'Quad.easeOut' });
  scene.tweens.add({ targets: nave, angle: 0, x: FERIDA_X + 70, y: FERIDA_Y - 8, duration: 2200, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: nave, x: 356, y: 70, delay: 2400, duration: dur - 2400, ease: 'Sine.easeInOut' });

  return {
    update(dt: number) {
      t += dt;
      estrelas.update(dt);
      lava.setAlpha(0.55 + 0.3 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1));
      estado.escalasLua.push(+lua.scaleX.toFixed(3));
    },
    limpar() {
      estrelas.destroy();
      [lua, corpo, lava, fluido, gotas].forEach((o) => o.destroy());
    },
  };
}
