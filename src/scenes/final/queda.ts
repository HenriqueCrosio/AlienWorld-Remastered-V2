import Phaser from 'phaser';
import { DERIVA_ESPACO } from '../../config';
import { garantirLuzRadial } from '../../entities/Predador';
import { PERFIS } from '../../systems/atmosfera/perfis';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * A QUEDA — capítulo 5 (spec §3). OUTRO PLANO, POR CORTE: a câmera acompanha o corpo até a lua.
 *
 * AS CAMADAS, de trás para a frente:
 *   · o ABISMO — o céu da Cutscene 1 (`paintBgCut1`, a galáxia, a poeira, os asteroides lá longe), maior que a tela
 *     e DERIVANDO devagar enquanto a câmera acompanha a queda: é a profundidade que ele pediu (24/09: *"um abismo
 *     espacial como fundo de primeira camada daria mais profundidade"*);
 *   · a LUA — a mesma do capítulo 4, de perto, sem o céu dela (`f8-lua-perto-lua.png`, o halo se desfazendo);
 *   · a COLÔNIA DA F1, reduzida, pousada na superfície À VISTA, com as luzes acesas;
 *   · o CORPO em brasa (recortado do conceito 5★, borda amansada), encolhendo — ele se afasta da câmera
 *     (*"o leviatã é grande, mas não do tamanho de uma lua"*), em 12 tamanhos assados.
 *
 * ⚠️ O IMPACTO É À VISTA (24/09): a 1ª versão o fazia sumir atrás do horizonte — *"Eu quero ele caindo nela… o
 * jogador veja ela colidindo com a lua e consequentemente a colonia"*. Ele bate NA colônia, na superfície da frente:
 * as luzes dela morrem, os pedaços voam, o fogo fica e a fumaça sobe. Contido: nada de clarão que lave a tela.
 */
/** Onde o corpo nasce: grande, perto da câmera, no alto à direita (o centro do quadro inteiro, 170×161). */
const DE = { x: 300, y: 36 };
/** A COLÔNIA na superfície da frente (a base das construções) — e o ponto do impacto é ela. */
const COLONIA = { x: 168, y: 184 };
const IMPACTO = { x: COLONIA.x, y: COLONIA.y - 6 };
const N_ESCALAS = 12;
const ESCALA_FIM = 0.18;
/** O último tamanho da queda: o quadro 9 ≈ 25% — ~42px, a largura da colônia (44): ele cai EM CIMA dela (24/09:
 *  *"a baleia precisa diminuir mais um pouco para cair em cima da colonia"*). */
const ULTIMO_QUADRO = 9;
/** Quanto do capítulo é a queda; o resto é a colônia queimando. */
const QUEDA_MS = 5000;
/** Onde o abismo TERMINA o capítulo (o enquadramento do impacto, aprovado). Ele chega aqui derivando para a esquerda
 *  na deriva comum do espaço (`DERIVA_ESPACO`, a mesma da Cutscene 1) — 25/09: a deriva antiga (26×34px em 8s, pico
 *  de ~7px/s) corria demais: *"o movimento precisa ser bem lento… pois se trata do espaço"*. */
const ABISMO = { x: -70, y: -6 };
/** As janelas acesas da colônia (em relação ao canto esquerdo de baixo dela) — na redução elas somem da arte. */
const JANELAS = [
  [2, -6], [8, -4], [12, -5], [16, -4], [22, -5], [29, -4], [34, -5], [41, -4],
];

export function montarQueda(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 5;
  c.atm.perfil(PERFIS.vacuoQueda);
  nave.setVisible(false);
  const cam = scene.cameras.main;
  cam.resetFX();
  garantirLuzRadial(scene);

  const abismo = scene.add
    .image(ABISMO.x + DERIVA_ESPACO * ((T.SOBREVOO - T.QUEDA) / 1000), ABISMO.y, 'paintBgCut1')
    .setOrigin(0, 0)
    .setDepth(DEPTH.FUNDO);
  const lua = scene.add.image(0, 0, 'f8LuaPertoLua').setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  const colonia = scene.add.image(COLONIA.x, COLONIA.y, 'f8ColoniaLonge').setOrigin(0.5, 1).setDepth(DEPTH.FUNDO + 2);
  const esq = COLONIA.x - colonia.width / 2;
  const luzes = JANELAS.map(([dx, dy]) =>
    scene.add
      .image(esq + dx, COLONIA.y + dy, 'puff')
      .setScale(0.2)
      .setTint(0xffa040)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.FUNDO + 3),
  );

  const corpo = scene.add.image(DE.x, DE.y, 'f8ReentradaEscalas', 0).setDepth(DEPTH.CENARIO);
  let escala = 1;

  // O RASTRO: fumaça escura saindo da cauda e brasas se soltando — nascem na escala aparente do corpo.
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

  // A QUEDA: a posição acelera (Quad.easeIn); o TAMANHO segue o avanço, até o quadro do impacto.
  const queda = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: QUEDA_MS,
    ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      corpo.setPosition(DE.x + (IMPACTO.x - DE.x) * k, DE.y + (IMPACTO.y - 22 * (1 - k) - DE.y) * k);
      const q = Math.min(ULTIMO_QUADRO, Math.floor(k * (ULTIMO_QUADRO + 1)));
      corpo.setFrame(q);
      escala = Math.pow(ESCALA_FIM, q / (N_ESCALAS - 1));
      fumaca.setPosition(corpo.x + 50 * escala, corpo.y - 50 * escala);
      brasas.setPosition(corpo.x + 10 * escala, corpo.y + 10 * escala);
    },
  });

  // ─── O IMPACTO, À VISTA ───
  const fogo = scene.add
    .image(IMPACTO.x, IMPACTO.y + 2, 'luzRadial')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xe0561c)
    .setScale(1.6, 0.8)
    .setAlpha(0)
    .setDepth(DEPTH.CENARIO + 3);
  const pedacos = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'f8PedacosSheet', {
      frame: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      speed: { min: 25, max: 80 },
      angle: { min: 210, max: 330 },
      rotate: { min: 0, max: 360 },
      scale: { min: 0.1, max: 0.2 },
      gravityY: 120,
      lifespan: { min: 700, max: 1400 },
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 4);
  const lascas = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'f4Destroco', {
      frame: [0, 1, 2, 3],
      speed: { min: 30, max: 90 },
      angle: { min: 210, max: 330 },
      rotate: { min: 0, max: 360 },
      scale: 0.45,
      gravityY: 140,
      lifespan: { min: 600, max: 1200 },
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 4);
  // A COLUNA: a poeira do choque e a fumaça da colônia queimando, subindo até o fim do capítulo.
  const coluna = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'puff', {
      lifespan: 3000,
      speedY: { min: -22, max: -8 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.6, end: 2 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x1c161c, 0x2a2026, 0x3a2a2a],
      frequency: 45,
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 2);

  // O CHOQUE: uma nuvem de poeira GROSSA no instante do contato, que engole o corpo — sem ela ele sumia de uma vez.
  const choque = scene.add
    .particles(IMPACTO.x, IMPACTO.y, 'puff', {
      lifespan: { min: 900, max: 1600 },
      speed: { min: 12, max: 45 },
      angle: { min: 180, max: 360 },
      // ⚠️ o puff é 7×7: ampliado a 4× ele lia como BLOCO quadrado — menor e em maior número
      scale: { start: 0.8, end: 1.8 },
      alpha: { start: 0.85, end: 0 },
      tint: [0x2a2026, 0x3a2a2a, 0x4a3430],
      emitting: false,
    })
    .setDepth(DEPTH.CENARIO + 5);

  const impacto = scene.time.delayedCall(QUEDA_MS, () => {
    estado.impacto = true;
    corpo.setVisible(false);
    fumaca.stop();
    brasas.stop();
    // a colônia MORRE: as luzes apagam e a arte some sob o fogo — o que sobra é a coluna e o brilho baixo
    luzes.forEach((l) => l.destroy());
    colonia.setVisible(false);
    // CONTIDO (24/09: *"o efeito de destroços ficou bom, mas um pouco mais contido"*)
    choque.explode(36);
    pedacos.explode(10);
    lascas.explode(8);
    coluna.explode(12);
    coluna.start();
    cam.shake(400, 0.004);
    scene.tweens.add({ targets: fogo, alpha: 0.45, duration: 180, ease: 'Quad.easeOut' });
    // o fogo fica, baixo e irregular: a colônia queimando
    scene.tweens.add({ targets: fogo, alpha: { from: 0.3, to: 0.45 }, delay: 600, duration: 260, yoyo: true, repeat: -1 });
  });

  return {
    update(dt) {
      abismo.x -= DERIVA_ESPACO * dt;
    },
    limpar() {
      queda.remove();
      impacto.remove();
      [abismo, lua, colonia, corpo, fumaca, brasas, fogo, choque, pedacos, lascas, coluna, ...luzes].forEach((o) => o.destroy());
    },
  };
}
