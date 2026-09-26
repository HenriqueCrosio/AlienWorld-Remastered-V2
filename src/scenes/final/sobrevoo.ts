import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../../config';
import { garantirLuzRadial } from '../../entities/Predador';
import { pixelText } from '../../ui';
import { PERFIS } from '../../systems/atmosfera/perfis';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * O SOBREVOO e A LUZ SE APAGA — capítulos 6 e 7 (spec §3). PLANO FIXO E LARGO (escolha dele em 24/09): a colônia
 * da F1 em ruínas, com as montanhas e o céu dela, e a carcaça atravessada por cima — o conceito 6★ aprovado, com o
 * corpo RASGADO NO MEIO e as entranhas biomecânicas à mostra (3ª rodada de inpaint, seed 44 — *"a original, só com
 * o corpo rasgado no meio, pode sim mostrar partes mecanicas"*). `scripts/_f8/_gerar-sobrevoo.mjs`.
 *
 *   6 · a nave cruza em rasante da DIREITA para a ESQUERDA — o caminho da F1 ao contrário, a volta para uma casa que
 *       não existe mais; a fumaça sobe, o fogo das cúpulas tremula, o banner da colônia morta;
 *   7 · a câmera fica. A lava das rachaduras da carcaça ESFRIA placa por placa (da cauda para a cabeça) até restar
 *       UMA — a última luz — e ela apaga. O fogo da colônia míngua junto. Depois, o preto.
 *
 * A carcaça do quadro é FRIA (`f8-sobrevoo-frio.png`); a lava dela é uma folha à parte, na caixa dela, em 8
 * estágios (`f8-sobrevoo-lava-sheet.png`). No capítulo 6 a folha fica no estágio 0 — o quadro aceso, como aprovado.
 */
/** A caixa da lava da carcaça no quadro (`scripts/_f8/_sobrevoo-lava-caixa.json`). */
const LAVA_X = 98;
const LAVA_Y = 93;
const LAVA_ESTAGIOS = 8;
/** As bases das duas colunas de fumaça do quadro e os focos de fogo nas cúpulas. */
const FUMACAS = [
  { x: 64, y: 138 },
  { x: 352, y: 128 },
];
const FOGOS = [
  { x: 82, y: 156 },
  { x: 116, y: 184 },
  { x: 344, y: 146 },
];
/** O rasante: da direita para a esquerda, por cima da carcaça. */
const RASANTE_Y = 60;
const RASANTE_MS = 7200;

export function montarSobrevoo(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 6;
  c.atm.perfil(PERFIS.superficie);
  const cam = scene.cameras.main;
  cam.resetFX();
  garantirLuzRadial(scene);

  const quadro = scene.add.image(0, 0, 'f8SobrevooFrio').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const lava = scene.add.image(LAVA_X, LAVA_Y, 'f8SobrevooLava', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  estado.lavaCarcaca = 1;

  // A FUMAÇA das duas colunas do quadro, continuando para cima — a colônia ainda queimando.
  const fumacas = FUMACAS.map((f) =>
    scene.add
      .particles(f.x, f.y, 'puff', {
        x: { min: -4, max: 4 },
        lifespan: 3400,
        speedY: { min: -16, max: -8 },
        speedX: { min: -4, max: 5 },
        scale: { start: 0.9, end: 2.4 },
        alpha: { start: 0.4, end: 0 },
        tint: [0x1a1a22, 0x24222a, 0x2e2a30],
        frequency: 110,
      })
      .setDepth(DEPTH.CENARIO),
  );
  // O FOGO das cúpulas, tremulando baixo (luz ADD em alfa baixo — nunca clarão).
  const fogos = FOGOS.map((f, i) => {
    const luz = scene.add
      .image(f.x, f.y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xe0561c)
      .setScale(0.9, 0.7)
      .setAlpha(0.25)
      .setDepth(DEPTH.CENARIO + 1);
    scene.tweens.add({ targets: luz, alpha: { from: 0.18, to: 0.34 }, duration: 180 + i * 70, yoyo: true, repeat: -1 });
    return luz;
  });

  // ─── 6 · O RASANTE: da direita para a esquerda, virada para a esquerda — a F1 ao contrário ───
  nave.setVisible(true).setScale(1).setAngle(0).setFlipX(true).setPosition(GAME_WIDTH + 24, RASANTE_Y);
  scene.tweens.add({ targets: nave, x: -30, delay: 600, duration: RASANTE_MS, ease: 'Linear' });
  scene.tweens.add({ targets: nave, y: RASANTE_Y + 5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const banner = pixelText(scene, GAME_WIDTH / 2, 22, 'KEPLER · A COLÔNIA MORTA', { size: 11, color: COLORS.metalLight })
    .setDepth(DEPTH.TEXTO)
    .setAlpha(0);
  scene.tweens.add({ targets: banner, alpha: 1, delay: 1800, duration: 900, hold: 2800, yoyo: true });

  // ─── 7 · A LUZ SE APAGA ───
  const apagar = scene.time.delayedCall(T.APAGA - T.SOBREVOO, () => {
    estado.capitulo = 7;
    // A névoa esfria junto com a lava — mas NÃO some (o piso dele): 4,6s até o fade.
    c.atm.perfil(PERFIS.apagando, T.FADE - T.APAGA);
    fumacas.forEach((f) => f.stop());
    const dur = T.FADE - T.APAGA - 900;
    scene.tweens.add({ targets: fogos, alpha: 0, duration: dur, ease: 'Sine.easeIn' });
    scene.tweens.addCounter({
      from: 0,
      to: LAVA_ESTAGIOS - 0.01,
      duration: dur,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => lava.setFrame(Math.floor(tw.getValue() ?? 0)),
      onComplete: () => {
        // A ÚLTIMA LUZ: a placa que sobrou segura um instante… e apaga.
        scene.tweens.add({
          targets: lava,
          alpha: 0,
          delay: 500,
          duration: 380,
          onUpdate: () => (estado.lavaCarcaca = +lava.alpha.toFixed(2)),
          onComplete: () => (estado.lavaCarcaca = 0),
        });
      },
    });
  });

  return {
    limpar() {
      apagar.remove();
      [quadro, lava, banner, ...fumacas, ...fogos].forEach((o) => o.destroy());
    },
  };
}
