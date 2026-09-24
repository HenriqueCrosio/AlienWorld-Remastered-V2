import Phaser from 'phaser';
import { garantirLuzRadial } from '../../entities/Predador';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * A QUEDA — capítulo 5 (spec §3). OUTRO PLANO, POR CORTE: a câmera está junto do corpo, perto da lua. A lua é
 * grande porque a câmera está perto dela — e é A MESMA do capítulo 4 (o zero-G, com a atmosfera roxa), vista de
 * perto (`scripts/_f8/_gerar-queda.mjs fundo`, seed 22). O conceito 5★ tinha a lua cinza do menu: cortar do 4 para
 * ele trocaria de lua no meio da cena.
 *
 * O corpo em brasa é RECORTADO do conceito 5★ aprovado, com a borda amansada (spec §4, P6). Ele cai do alto à
 * direita para o horizonte à esquerda, acelerando, e passa POR TRÁS do chão da lua: a superfície é uma camada à
 * frente dele (`f8-lua-perto-chao.png`, cortada na linha acesa da atmosfera) — nenhuma máscara reta.
 * O impacto é CONTIDO: uma luz baixa por trás do horizonte e uma coluna de poeira escura. Nada de clarão.
 */
/** Onde o corpo nasce (fora do quadro, no alto à direita) e onde ele termina (já abaixo do horizonte). */
const DE = { x: 360, y: -70 };
// ⚠️ bem abaixo do horizonte: com y=212 a cauda (o corpo tem 161 de altura) ficava para fora depois do impacto
const ATE = { x: 70, y: 300 };
/** Onde a queda toca o horizonte — o ponto do impacto (onde o focinho cruza o horizonte, y≈140 — `_horizonte.json`). */
const IMPACTO = { x: 150, y: 142 };
/** Quanto do capítulo é a queda; o resto é o depois do impacto (a poeira, a luz morrendo). */
const QUEDA_MS = 5200;

export function montarQueda(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 5;
  nave.setVisible(false);
  const cam = scene.cameras.main;
  cam.resetFX();

  const fundo = scene.add.image(0, 0, 'f8LuaPerto').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const corpo = scene.add.image(DE.x, DE.y, 'f8Reentrada').setDepth(DEPTH.CENARIO);
  const chao = scene.add.image(0, 0, 'f8LuaPertoChao').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 5);

  // O RASTRO: fumaça escura saindo da cauda (em cima, à direita do corpo) e brasas se soltando.
  const fumaca = scene.add
    .particles(0, 0, 'puff', {
      lifespan: 1800,
      speed: { min: 4, max: 16 },
      scale: { start: 0.8, end: 2.2 },
      alpha: { start: 0.45, end: 0 },
      tint: [0x1a1418, 0x221a20],
      frequency: 45,
      follow: corpo,
      followOffset: { x: 50, y: -50 },
    })
    .setDepth(DEPTH.CENARIO - 1);
  // As BRASAS são pontos quentes pequenos (o rastro de lava da sucção lia como gravetos vermelhos — folha de 24/09).
  const brasas = scene.add
    .particles(0, 0, 'puff', {
      lifespan: 900,
      speed: { min: 20, max: 60 },
      angle: { min: -80, max: 10 },
      scale: { start: 0.35, end: 0 },
      tint: [0xe8641f, 0xc4341a],
      frequency: 60,
      follow: corpo,
      followOffset: { x: 10, y: 10 },
    })
    .setDepth(DEPTH.CENARIO + 1);

  scene.tweens.add({ targets: corpo, x: ATE.x, y: ATE.y, duration: QUEDA_MS, ease: 'Quad.easeIn' });

  // O IMPACTO por trás do horizonte: luz baixa que sobe e morre (ADD em alfa baixo — NUNCA flash) e a poeira.
  garantirLuzRadial(scene);
  const brilho = scene.add
    .image(IMPACTO.x, IMPACTO.y, 'luzRadial')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xc4341a)
    .setScale(4, 1.4)
    .setAlpha(0)
    .setDepth(DEPTH.CENARIO + 4);
  const poeira = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'puff', {
      lifespan: 2600,
      speedY: { min: -26, max: -8 },
      speedX: { min: -18, max: 18 },
      scale: { start: 1, end: 3.4 },
      alpha: { start: 0.6, end: 0 },
      tint: [0x1c161c, 0x2a2026, 0x3a2a2a],
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 4);
  const impacto = scene.time.delayedCall(QUEDA_MS - 600, () => {
    fumaca.stop();
    brasas.stop();
    scene.tweens.add({ targets: brilho, alpha: 0.34, duration: 400, yoyo: true, hold: 1200 });
    poeira.explode(46);
    cam.shake(600, 0.003);
    estado.impacto = true;
  });

  return {
    limpar() {
      impacto.remove();
      [fundo, corpo, chao, fumaca, brasas, brilho, poeira].forEach((o) => o.destroy());
    },
  };
}
