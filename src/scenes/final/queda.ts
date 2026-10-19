import Phaser from 'phaser';
import { DERIVA_ESPACO } from '../../config';
import { garantirLuzRadial } from '../../entities/Predador';
import { PERFIS } from '../../systems/atmosfera/perfis';
import { JANELAS_IMPACTO } from './janelasImpacto';
import { LAVA_X, LAVA_Y } from './sobrevoo';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * A QUEDA — capítulo 5 (spec §3), em DOIS PLANOS.
 *
 * ⚠️ 18/10 (bloco D) — refeito a pedido dele: *"eu sempre achei muito pobre em questão de visual"* → *"crie um demo
 * ou a cena como você imaginou"*. O diagnóstico: o choque era um ponto de 40px numa colônia de 44, o corpo SUMIA no
 * contato e o efeito era um brilho redondo com poeira em bolinhas. A versão de 24/09 está no git (antes do bloco D).
 *
 *   1 · O PLANO LARGO (a lua de perto, o abismo atrás): o corpo cai encolhendo nos 12 tamanhos assados — agora
 *       ESPELHADO, do alto à esquerda para a direita: a mesma direção da deriva do capítulo 4 e a carcaça do 6 tem
 *       a cabeça à DIREITA. A ANTECIPAÇÃO: a brasa acende o chão sob ele e a rede de luz da colônia falha.
 *       19/10: a colônia é vista de ÓRBITA — as LUZES da noite dela, como a foto de satélite de uma cidade (ele: *"uma
 *       colônia vista do espaço, normalmente, são pontos de luzes"*), e não mais o prédio de 44px que lia como adesivo.
 *   2 · O CORTE para o PLANO BAIXO, o mesmo enquadramento do capítulo 6, antes da queda (a colônia sem a carcaça):
 *       o corpo entra INTEIRO pelo alto à esquerda, com a luz dele lambendo o chão, e bate atrás do chão da frente —
 *       no lugar onde a carcaça vai estar no capítulo 6.
 *   3 · O ESTOURO E O CONTATO: a EXPLOSÃO (a folha assada: a bola de fogo, a onda de poeira rasteira e a coluna)
 *       nasce ~70ms ANTES do focinho tocar o chão, com os dois QUADROS DE IMPACTO (silhueta preta no laranja, depois o
 *       inverso — o hit-stop dos jogos de luta); o encosto acontece dentro do fogo. Depois o tremor que decai e a
 *       CORTINA DE EJEÇÃO. 19/10: o corpo NÃO fica mais cravado (ele: *"se um animal colossal e bio mecânico cai, ele
 *       não cai duro"*) — ele desaba dentro da explosão e, quando a fumaça baixa, já está DEITADO: o quadro do
 *       capítulo 6, no mesmo enquadramento. As janelas apagam do impacto para fora; o fogo pega nas cúpulas.
 */
/** Onde o corpo nasce no plano largo (o centro do quadro inteiro, 160×161) — espelhado: alto à ESQUERDA. */
const DE = { x: 84, y: 36 };
/** Onde ele bate no plano largo: o centro da cidade (as luzes nascem dali). */
const IMPACTO = { x: 216, y: 178 };
/** As LUZES da colônia (`f8ColoniaLuzes`, 160×48): o ponto do impacto na folha, e os quadros da rede falhando (1–5). */
const LUZES_ORIGEM = { x: 80 / 160, y: 28 / 48 };
const LUZES_FALHANDO = 5;
const N_ESCALAS = 12;
const ESCALA_FIM = 0.18;
/** O último tamanho do plano largo (o quadro 9 ≈ 25%, ~42px: a largura da colônia). */
const ULTIMO_QUADRO = 9;
/** O plano largo dura isto, e corta ANTES do contato (o corpo a 92% do caminho, já sobre a colônia). */
const LARGO_MS = 3400;
const LARGO_ATE = 0.92;
/** Onde o abismo TERMINA o plano largo, derivando na deriva comum do espaço (25/09: *"bem lento"*). */
const ABISMO = { x: -70, y: -6 };

/** PLANO BAIXO: onde o focinho crava (atrás do chão da frente, que corta em y≈160). */
const NARIZ = { x: 258, y: 160 };
/** O focinho no quadro da reentrada ESPELHADO, em relação ao centro (no original ele fica embaixo à esquerda). */
const NARIZ_NO_CORPO = { x: 72, y: 71 };
/** De onde o corpo entra (o centro), fora do quadro no alto à esquerda, e quanto tempo leva até o contato. */
const ENTRA_DE = { x: -70, y: -110 };
const ENTRA_MS = 750;
/** Os dois quadros de impacto. */
const IMPACTO_A_MS = 70;
const IMPACTO_B_MS = 50;
/** A EXPLOSÃO vem ANTES do contato (19/10, ele: *"alguns ms antes dele encostar no solo a explosão ocorre e depois
 *  mostrar ele já caído"*) — como um meteoro, ele estoura antes de tocar: o focinho ainda a ~35px do chão. O encosto
 *  acontece DENTRO da bola de fogo, sem ser visto, e nada lê como "bateu reto e duro". */
const ANTES_MS = 70;
/** O DESABAR: o focinho bateu e o resto vem junto — o rabo cai para o chão, girando em volta do focinho, enquanto a
 *  explosão o engole. Ele termina quase deitado, dentro da onda de poeira (o rabo em x≈55, y≈155). */
const DESABA_GRAUS = -38;
const DESABA_MS = 430;
/** O focinho no quadro da reentrada COMO APARECE (espelhado: embaixo à direita) — o pivô do desabar. ⚠️ O Phaser
 *  espelha a imagem dentro da caixa dela, e a origem é medida no quadro já espelhado (centro + NARIZ_NO_CORPO). */
const NARIZ_NA_FOLHA = { x: 152 / 160, y: 151.5 / 161 };
/** A carcaça deitada aparece POR BAIXO da explosão: começa quando a fumaça já cobre ~80% dela e termina antes do pico
 *  (96% em 1,2 s — `scripts/_leviata/_explosao-conferir.mjs`). */
const DEITADO_DE_MS = DESABA_MS;
const DEITADO_MS = 650;
/** A velocidade com que a morte das luzes corre pela colônia, a partir do impacto (px/s). */
const APAGAR_PX_S = 260;
/** Onde o fogo pega depois do choque (as cúpulas que queimam no capítulo 6). */
/** O MERGULHO no escuro antes do capítulo 6 (o tempo passa: do corpo cravado em brasa à carcaça fria deitada). */
const MERGULHO_MS = 450;
const FOGOS = [
  { x: 80, y: 155, atraso: 380 }, { x: 110, y: 162, atraso: 620 }, { x: 345, y: 148, atraso: 460 }, { x: 112, y: 188, atraso: 900 },
];

export function montarQueda(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 5;
  c.atm.perfil(PERFIS.vacuoQueda);
  nave.setVisible(false);
  const cam = scene.cameras.main;
  cam.resetFX();
  garantirLuzRadial(scene);
  if (!scene.anims.exists('f8-ejecao')) {
    scene.anims.create({
      key: 'f8-ejecao',
      frames: scene.anims.generateFrameNumbers('f8EjecaoSheet', { start: 0, end: 47 }),
      frameRate: 18,
    });
  }
  if (!scene.anims.exists('f8-explosao')) {
    scene.anims.create({
      key: 'f8-explosao',
      frames: scene.anims.generateFrameNumbers('f8ExplosaoSheet', { start: 0, end: 47 }),
      frameRate: 18,
    });
  }
  const tudo: Phaser.GameObjects.GameObject[] = [];
  const guarda = <O extends Phaser.GameObjects.GameObject>(o: O): O => { tudo.push(o); return o; };

  // ─── 1 · O PLANO LARGO ───
  const abismo = scene.add
    .image(ABISMO.x + DERIVA_ESPACO * (LARGO_MS / 1000), ABISMO.y, 'paintBgCut1')
    .setOrigin(0, 0)
    .setDepth(DEPTH.FUNDO);
  const lua = scene.add.image(0, 0, 'f8LuaPertoLua').setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  // A COLÔNIA vista de órbita: as luzes da noite dela, somadas ao chão (ADD).
  const luzes = scene.add
    .sprite(IMPACTO.x, IMPACTO.y + 2, 'f8ColoniaLuzes', 0)
    .setOrigin(LUZES_ORIGEM.x, LUZES_ORIGEM.y)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.FUNDO + 2);
  let proximaFalha = 0;
  // A ANTECIPAÇÃO: a brasa acende o chão sob ele, mais forte quanto mais perto.
  const chaoLuz = scene.add
    .image(IMPACTO.x, IMPACTO.y + 2, 'luzRadial')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xe0561c)
    .setScale(1.6, 0.55)
    .setAlpha(0)
    .setDepth(DEPTH.FUNDO + 3);

  const corpo = scene.add.image(DE.x, DE.y, 'f8ReentradaEscalas', 0).setFlipX(true).setDepth(DEPTH.CENARIO);
  let escala = 1;
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
      angle: { min: 170, max: 260 }, // espelhado: elas ficam para trás, à esquerda e para cima
      scale: { onEmit: () => 0.35 * escala, onUpdate: (_p, _k, _t, v) => v * 0.97 },
      tint: [0xe8641f, 0xc4341a],
      frequency: 60,
    })
    .setDepth(DEPTH.CENARIO + 1);
  const largo = [abismo, lua, luzes, chaoLuz, corpo, fumaca, brasas];

  const queda = scene.tweens.addCounter({
    from: 0,
    to: LARGO_ATE,
    duration: LARGO_MS,
    ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      corpo.setPosition(DE.x + (IMPACTO.x - DE.x) * k, DE.y + (IMPACTO.y - 22 * (1 - k) - DE.y) * k);
      const q = Math.min(ULTIMO_QUADRO, Math.floor(k * (ULTIMO_QUADRO + 1)));
      corpo.setFrame(q);
      escala = Math.pow(ESCALA_FIM, q / (N_ESCALAS - 1));
      fumaca.setPosition(corpo.x - 50 * escala, corpo.y - 50 * escala);
      brasas.setPosition(corpo.x - 10 * escala, corpo.y + 10 * escala);
      chaoLuz.setAlpha(0.55 * k * k);
      // a REDE FALHA no último trecho: pedaços da cidade piscam e apagam sob o que vem, cada vez mais
      if (k > 0.66 && scene.time.now >= proximaFalha) {
        const falha = Math.random() < 0.3 + 0.6 * (k - 0.66) / (LARGO_ATE - 0.66);
        luzes.setFrame(falha ? 1 + Math.floor(Math.random() * LUZES_FALHANDO) : 0);
        proximaFalha = scene.time.now + 50 + Math.random() * 110;
      }
    },
  });

  // ─── 2 · O PLANO BAIXO ───
  let contato: Phaser.Time.TimerEvent | null = null;
  const corte = scene.time.delayedCall(LARGO_MS, () => {
    largo.forEach((o) => o.destroy());
    c.atm.perfil(PERFIS.superficie);

    guarda(scene.add.image(0, 0, 'f8ImpactoColonia').setOrigin(0, 0).setDepth(DEPTH.FUNDO));
    // as janelas acesas, com um halo, tremendo
    const halos = JANELAS_IMPACTO.map((j) =>
      guarda(
        scene.add
          .image(j.x + 0.5, j.y + 0.5, 'puff')
          .setScale(0.16)
          .setTint(0xffa040)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.FUNDO + 2),
      ),
    );
    // a LUZ DELE lambendo o chão e o céu enquanto entra — e a mancha no chão onde vai bater, crescendo
    const luzCorpo = guarda(
      scene.add.image(0, 0, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xe0561c).setScale(5).setAlpha(0.35)
        .setDepth(DEPTH.FUNDO + 3),
    );
    const luzChao = guarda(
      scene.add.image(NARIZ.x, NARIZ.y + 2, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xe0561c)
        .setScale(2.4, 0.7).setAlpha(0).setDepth(DEPTH.FUNDO + 3),
    );
    const grande = guarda(scene.add.image(ENTRA_DE.x, ENTRA_DE.y, 'f8ReentradaEscalas', 0).setFlipX(true).setDepth(DEPTH.CENARIO));
    const frente = guarda(scene.add.image(0, 0, 'f8ImpactoFrente').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 1));
    const rastro = guarda(
      scene.add
        .particles(0, 0, 'puff', {
          lifespan: 1400,
          speed: { min: 6, max: 20 },
          scale: { start: 1.2, end: 2.6 },
          alpha: { start: 0.5, end: 0 },
          tint: [0x1a1418, 0x221a20],
          frequency: 30,
        })
        .setDepth(DEPTH.CENARIO - 1),
    );
    const fagulhas = guarda(
      scene.add
        .particles(0, 0, 'puff', {
          lifespan: 700,
          speed: { min: 30, max: 80 },
          angle: { min: 180, max: 270 },
          scale: { start: 0.4, end: 0.1 },
          tint: [0xe8641f, 0xc4341a, 0xffb060],
          frequency: 25,
        })
        .setDepth(DEPTH.CENARIO + 2),
    );
    const fim = { x: NARIZ.x - NARIZ_NO_CORPO.x, y: NARIZ.y - NARIZ_NO_CORPO.y };
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ENTRA_MS,
      ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        grande.setPosition(ENTRA_DE.x + (fim.x - ENTRA_DE.x) * k, ENTRA_DE.y + (fim.y - ENTRA_DE.y) * k);
        luzCorpo.setPosition(grande.x + 40, grande.y + 40);
        rastro.setPosition(grande.x - 50, grande.y - 50);
        fagulhas.setPosition(grande.x + 30, grande.y + 30);
        luzChao.setAlpha(0.7 * k * k);
        halos.forEach((h) => h.setAlpha(Math.random() < 0.15 + 0.4 * k ? 0.2 : 1));
      },
    });

    // ─── 3 · O ESTOURO (ANTES do contato) ───
    contato = scene.time.delayedCall(ENTRA_MS - ANTES_MS, () => {
      estado.impacto = true;
      rastro.stop();
      fagulhas.stop();
      // A EXPLOSÃO: a bola de fogo, a onda de poeira rasteira e a coluna, assadas — nasce sob o focinho que ainda
      // desce, e cobre a carcaça inteira. Fica por cima das silhuetas: o clarão branco dela marca os quadros de impacto.
      const explosao = guarda(scene.add.sprite(0, 0, 'f8ExplosaoSheet', 0).setOrigin(0, 0).setDepth(DEPTH.CENARIO + 2.5));
      explosao.play('f8-explosao');
      explosao.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => explosao.setVisible(false));
      // OS QUADROS DE IMPACTO: tudo vira silhueta. A — preto no laranja-claro; B — o inverso. (O corpo segue descendo
      // por eles e encosta dentro do fogo.)
      const chapa = guarda(scene.add.rectangle(0, 0, 384, 216, 0xffd9a0).setOrigin(0, 0).setDepth(DEPTH.CENARIO - 0.5));
      const silhuetas = [grande, frente];
      silhuetas.forEach((o) => o.setTintFill(0x000000));
      halos.forEach((h) => h.setVisible(false));
      luzCorpo.setVisible(false);
      scene.time.delayedCall(IMPACTO_A_MS, () => {
        chapa.setFillStyle(0x000000);
        silhuetas.forEach((o) => o.setTintFill(0xffb060));
      });
      scene.time.delayedCall(IMPACTO_A_MS + IMPACTO_B_MS, () => {
        chapa.destroy();
        silhuetas.forEach((o) => o.clearTint());
        depoisDoChoque();
      });

      const depoisDoChoque = () => {
        cam.shake(700, 0.012);
        // O CLARÃO: a tela inteira acende e apaga num instante.
        const clarao = guarda(
          scene.add.rectangle(0, 0, 384, 216, 0xffc890).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6)
            .setDepth(DEPTH.CENARIO + 4),
        );
        scene.tweens.add({ targets: clarao, alpha: 0, duration: 280, ease: 'Quad.easeOut' });
        // O CORPO NÃO FICA CRAVADO: ele DESABA — o rabo cai para o chão, girando em volta do focinho — dentro da
        // explosão, e bate (um segundo tremor). Sob a fumaça vira o que ela revela: ele DEITADO, o quadro do capítulo 6
        // (a carcaça fria + a lava dela no estágio aceso), aparecendo por baixo enquanto a explosão cobre tudo.
        grande.setOrigin(NARIZ_NA_FOLHA.x, NARIZ_NA_FOLHA.y).setPosition(NARIZ.x, NARIZ.y);
        scene.tweens.add({
          targets: grande,
          angle: DESABA_GRAUS,
          y: NARIZ.y + 4,
          duration: DESABA_MS,
          ease: 'Quad.easeIn',
          onComplete: () => {
            cam.shake(320, 0.008);
            // o rabo bateu à esquerda, onde a onda de poeira ainda está chegando: ele ESMAECE enquanto a carcaça
            // deitada aparece no mesmo lugar (sumir de uma vez era um salto à vista)
            scene.tweens.add({ targets: [grande, frente], alpha: 0, duration: 300, ease: 'Sine.easeIn' });
          },
        });
        const deitado = [
          guarda(scene.add.image(0, 0, 'f8SobrevooFrio').setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1.5).setAlpha(0)),
          guarda(scene.add.image(LAVA_X, LAVA_Y, 'f8SobrevooLava', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1.6).setAlpha(0)),
        ];
        scene.tweens.add({ targets: deitado, alpha: 1, delay: DEITADO_DE_MS, duration: DEITADO_MS, ease: 'Linear' });
        // A CRATERA sob a cabeça: brilha forte no choque e baixa para uma brasa que pulsa.
        luzChao.setAlpha(0.9).setScale(2.8, 0.8);
        scene.tweens.add({ targets: luzChao, alpha: 0.4, duration: 900, ease: 'Quad.easeOut' });
        scene.tweens.add({ targets: luzChao, alpha: { from: 0.26, to: 0.38 }, delay: 1000, duration: 320, yoyo: true, repeat: -1 });
        // A CORTINA DE EJEÇÃO
        const ejecao = guarda(
          // (19/10: ATRÁS da explosão — por cima da fumaça escura os grãos liam como chiado; agora só aparecem fora dela)
          scene.add.sprite(NARIZ.x, NARIZ.y, 'f8EjecaoSheet', 0).setOrigin(192 / 384, 170 / 200).setDepth(DEPTH.CENARIO + 2.4),
        );
        ejecao.play('f8-ejecao');
        ejecao.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => ejecao.setVisible(false));
        // os destroços maiores, na gravidade baixa da lua
        const lascas = guarda(
          scene.add
            .particles(NARIZ.x, NARIZ.y, 'f4Destroco', {
              frame: [0, 1, 2, 3],
              speed: { min: 40, max: 95 },
              angle: { min: 200, max: 340 },
              rotate: { min: 0, max: 360 },
              scale: 0.45,
              gravityY: 45,
              lifespan: { min: 1600, max: 2600 },
              emitting: false,
            })
            .setDepth(DEPTH.CENARIO + 3),
        );
        lascas.explode(10);
        // AS LUZES MORREM em sequência, do impacto para fora
        JANELAS_IMPACTO.forEach((j, i) => {
          const atraso = (Math.hypot(j.x - NARIZ.x, j.y - NARIZ.y) / APAGAR_PX_S) * 1000;
          scene.time.delayedCall(atraso, () => {
            halos[i].destroy();
            guarda(scene.add.rectangle(j.x, j.y, 1, 1, j.parede).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1));
          });
        });
        // O FOGO PEGA nas cúpulas, uma a uma
        FOGOS.forEach((f) => {
          scene.time.delayedCall(f.atraso, () => {
            const brilho = guarda(
              scene.add.image(f.x, f.y, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xe0561c).setScale(0.9, 0.6)
                .setAlpha(0).setDepth(DEPTH.CENARIO + 2),
            );
            scene.tweens.add({ targets: brilho, alpha: 0.5, duration: 400 });
            scene.tweens.add({ targets: brilho, alpha: { from: 0.35, to: 0.55 }, delay: 400, duration: 220, yoyo: true, repeat: -1 });
            guarda(
              scene.add
                .particles(f.x, f.y, 'puff', {
                  lifespan: 900,
                  speedY: { min: -26, max: -10 },
                  speedX: { min: -4, max: 4 },
                  scale: { start: 0.35, end: 0.05 },
                  tint: [0xe8641f, 0xc4341a, 0xffb060],
                  frequency: 90,
                })
                .setDepth(DEPTH.CENARIO + 2),
            );
          });
        });
        // A COLUNA: a fumaça da colônia queimando, subindo até o corte
        guarda(
          scene.add
            .particles(NARIZ.x - 20, NARIZ.y - 10, 'puff', {
              lifespan: 2600,
              speedY: { min: -18, max: -6 },
              speedX: { min: -6, max: 6 },
              scale: { start: 0.8, end: 2.2 },
              alpha: { start: 0.45, end: 0 },
              tint: [0x1c161c, 0x2a2026, 0x3a2a2a],
              frequency: 70,
            })
            .setDepth(DEPTH.CENARIO + 2),
        );
      };
    });
  });

  // O MERGULHO: escurece no fim; o capítulo 6 abre do escuro (`sobrevoo.ts`).
  const mergulho = scene.time.delayedCall(T.SOBREVOO - T.QUEDA - MERGULHO_MS, () => cam.fadeOut(MERGULHO_MS, 0, 0, 0));

  return {
    update(dt) {
      if (abismo.active) abismo.x -= DERIVA_ESPACO * dt;
    },
    limpar() {
      queda.remove();
      corte.remove();
      contato?.remove();
      mergulho.remove();
      // os brilhos piscam em yoyo infinito: os tweens morrem antes dos alvos
      scene.tweens.killTweensOf([...largo, ...tudo]);
      [...largo, ...tudo].forEach((o) => o.active && o.destroy());
    },
  };
}
