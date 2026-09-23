import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { Predador } from '../../entities/Predador';
import { SOBE_ACIMA_PX } from '../../entities/fimDoPredador';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * DENTRO — capítulos 1 a 3 (spec §3). Abre NA CÂMARA D, sem corte: o fundo é a fotografia do último
 * quadro da luta (`f8Costura`) ou, pelo menu, a pintura dela (`paintBgF4d`). A poça do fim do predador
 * continua VIVA por cima, na mesma altura em que o `afundarNaLava` a deixou — é o que esconde a troca.
 */

/** A crista da poça: a mesma conta do `afundarNaLava` (superfície + o que ela sobe acima dela). */
const CRISTA = Predador.CHAO_APOIO - SOBE_ACIMA_PX;
const LAVA_QUADRO_MS = 110;

export function montarDentro(c: CenaFinal, fundo: 'f8Costura' | 'paintBgF4d'): Capitulo {
  const { scene, nave, estado } = c;
  const objetos: Phaser.GameObjects.GameObject[] = [];
  estado.capitulo = 1;
  estado.fundo = fundo;

  objetos.push(scene.add.image(0, 0, fundo).setOrigin(0, 0).setDepth(DEPTH.FUNDO));

  // A POÇA VIVA — o mesmo TileSprite do fim do predador, parado na crista.
  const poca = scene.add
    .tileSprite(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT - CRISTA, 'f4LavaSheet', 0)
    .setOrigin(0, 1)
    .setDepth(DEPTH.CENARIO);
  objetos.push(poca);
  let quadro = 0;
  const lava = scene.time.addEvent({
    delay: LAVA_QUADRO_MS,
    loop: true,
    callback: () => {
      quadro = (quadro + 1) % 8;
      poca.setFrame(quadro);
    },
  });

  // AS RACHADURAS (P1): a PINTURA rachando, estágio a estágio, até o rasgo. Por cima do fundo, atrás da poça.
  const rachas = scene.add.image(0, 0, 'f8ConvulsaoSheet', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  objetos.push(rachas);
  estado.rachadura = 0;
  scene.tweens.addCounter({
    from: 0,
    to: 7.99,
    duration: T.RASGO - 400,
    ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const q = Math.floor(tw.getValue() ?? 0);
      if (q !== estado.rachadura) {
        estado.rachadura = q;
        rachas.setFrame(q);
      }
    },
  });

  // O TREMOR CRESCE em três degraus até o rasgo: o bicho morrendo em volta da nave.
  const cam = scene.cameras.main;
  cam.shake(1600, 0.002);
  scene.time.delayedCall(1600, () => cam.shake(1600, 0.004));
  scene.time.delayedCall(3200, () => cam.shake(T.RASGO - 3200, 0.007));

  // O FLUIDO escorrendo do teto — gotas escuras, uma a uma, sem aditivo (não é luz).
  const gotas = scene.add
    .particles(0, 0, 'puff', {
      x: { min: 20, max: GAME_WIDTH - 20 },
      y: -4,
      lifespan: 1400,
      speedY: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0.3 },
      tint: [0x3a0508, 0x5a0a10],
      frequency: 180,
    })
    .setDepth(DEPTH.EFEITO);
  objetos.push(gotas);

  // A nave TREME no lugar: o jogador já não a controla.
  const baseY = nave.y;
  let t = 0;

  return {
    update(dt: number) {
      t += dt;
      const k = Math.min(1, (t * 1000) / T.RASGO);
      nave.y = baseY + Math.sin(t * 22) * (0.5 + 1.5 * k);
    },
    limpar() {
      lava.remove();
      objetos.forEach((o) => o.destroy());
    },
  };
}
