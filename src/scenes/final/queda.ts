import Phaser from 'phaser';
import { garantirLuzRadial } from '../../entities/Predador';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * A QUEDA — capítulo 5 (spec §3). OUTRO PLANO, POR CORTE: a câmera está perto da lua. É A MESMA lua do capítulo 4
 * (o zero-G, com a atmosfera roxa), vista de perto (`scripts/_f8/_gerar-queda.mjs fundo`, seed 22) — o conceito 5★
 * tinha a lua cinza do menu, e cortar do 4 para ele trocaria de lua no meio da cena.
 *
 * O corpo em brasa é RECORTADO do conceito 5★ aprovado, com a borda amansada (spec §4, P6). ⚠️ A PERSPECTIVA
 * (24/09): *"enquanto o leviatã cai, ele vai diminuindo de tamanho para parecer que ele vai se distanciando até cair
 * na lua (o leviatã é grande, mas não do tamanho de uma lua)"*. Ele nasce grande, perto da câmera, e ENCOLHE indo
 * para o horizonte: os tamanhos são ASSADOS (`f8-reentrada-escalas.png`, 12 passos do inteiro a 18% — reduzir no
 * motor cintilaria a pixel art) e o quadro acompanha o avanço da queda. O rastro encolhe junto.
 *
 * Ele passa POR TRÁS do chão da lua: a superfície é uma camada à frente dele (`f8-lua-perto-chao.png`, cortada na
 * linha acesa da atmosfera) — nenhuma máscara reta. O impacto é CONTIDO e LONGE: uma luz baixa por trás do
 * horizonte e uma coluna de poeira pequena. Nada de clarão.
 */
/** Onde o corpo nasce: grande, perto da câmera, no alto à direita (o centro do quadro inteiro, 170×161). */
const DE = { x: 300, y: 36 };
/** Onde a queda toca o horizonte — o ponto do impacto (o horizonte ali é y≈140, `_horizonte.json`). */
const IMPACTO = { x: 150, y: 141 };
/** Onde o corpo termina, já pequeno: um pouco ABAIXO do impacto, atrás do chão (o menor quadro tem ~31×29). */
const ATE = { x: IMPACTO.x - 4, y: IMPACTO.y + 24 };
const N_ESCALAS = 12;
/** A escala do menor quadro (a última do assador) — o rastro e a poeira se medem por ela. */
const ESCALA_FIM = 0.18;
/** Quanto do capítulo é a queda; o resto é o depois do impacto (a poeira assentando, a luz morrendo). */
const QUEDA_MS = 5200;

export function montarQueda(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 5;
  nave.setVisible(false);
  const cam = scene.cameras.main;
  cam.resetFX();

  const fundo = scene.add.image(0, 0, 'f8LuaPerto').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const corpo = scene.add.image(DE.x, DE.y, 'f8ReentradaEscalas', 0).setDepth(DEPTH.CENARIO);
  const chao = scene.add.image(0, 0, 'f8LuaPertoChao').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 5);
  /** A escala APARENTE agora (1 perto → ESCALA_FIM longe): o rastro nasce do tamanho do corpo. */
  let escala = 1;

  // O RASTRO: fumaça escura saindo da cauda (acima e à direita do corpo) e brasas se soltando — as duas nascem
  // na escala aparente do corpo e crescem/morrem a partir dela.
  const fumaca = scene.add
    .particles(0, 0, 'puff', {
      lifespan: 1800,
      speed: { min: 4, max: 16 },
      scale: { onEmit: () => 0.8 * escala, onUpdate: (_p, _k, _t, v) => v * 1.012 },
      alpha: { start: 0.45, end: 0 },
      tint: [0x1a1418, 0x221a20],
      frequency: 45,
    })
    .setDepth(DEPTH.CENARIO - 1);
  // As BRASAS são pontos quentes pequenos (o rastro de lava da sucção lia como gravetos vermelhos — 24/09).
  const brasas = scene.add
    .particles(0, 0, 'puff', {
      lifespan: 900,
      speed: { min: 20, max: 60 },
      angle: { min: -80, max: 10 },
      scale: { onEmit: () => 0.35 * escala, onUpdate: (_p, _k, _t, v) => v * 0.97 },
      tint: [0xe8641f, 0xc4341a],
      frequency: 60,
    })
    .setDepth(DEPTH.CENARIO + 1);

  // A QUEDA: a posição acelera (Quad.easeIn); o TAMANHO segue o avanço — mais longe, menor.
  const queda = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: QUEDA_MS,
    ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      corpo.setPosition(DE.x + (ATE.x - DE.x) * k, DE.y + (ATE.y - DE.y) * k);
      const q = Math.min(N_ESCALAS - 1, Math.floor(k * N_ESCALAS));
      corpo.setFrame(q);
      escala = Math.pow(ESCALA_FIM, q / (N_ESCALAS - 1));
      // a cauda fica acima e à direita do centro, a ~50px no tamanho inteiro
      fumaca.setPosition(corpo.x + 50 * escala, corpo.y - 50 * escala);
      brasas.setPosition(corpo.x + 10 * escala, corpo.y + 10 * escala);
    },
  });

  // O IMPACTO por trás do horizonte, LONGE: luz baixa que sobe e morre (ADD em alfa baixo — NUNCA flash) e a
  // poeira, pequena como tudo a essa distância.
  garantirLuzRadial(scene);
  const brilho = scene.add
    .image(IMPACTO.x, IMPACTO.y, 'luzRadial')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xc4341a)
    .setScale(1.6, 0.6)
    .setAlpha(0)
    .setDepth(DEPTH.CENARIO + 4);
  const poeira = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'puff', {
      lifespan: 2600,
      speedY: { min: -12, max: -4 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.4, end: 1.4 },
      alpha: { start: 0.6, end: 0 },
      tint: [0x1c161c, 0x2a2026, 0x3a2a2a],
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 4);
  const impacto = scene.time.delayedCall(QUEDA_MS - 250, () => {
    fumaca.stop();
    brasas.stop();
    scene.tweens.add({ targets: brilho, alpha: 0.4, duration: 350, yoyo: true, hold: 1000 });
    poeira.explode(30);
    cam.shake(400, 0.002);
    estado.impacto = true;
  });

  return {
    limpar() {
      queda.remove();
      impacto.remove();
      [fundo, corpo, chao, fumaca, brasas, brilho, poeira].forEach((o) => o.destroy());
    },
  };
}
