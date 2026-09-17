import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import type { Fx } from '../systems/Fx';

/**
 * O FIM DO PREDADOR — a morte que fecha a Fase 4 (pedido dele em 17/09, depois de ver o corpo no chão:
 * *"o corpo fica imóvel e o chão continua passando embaixo… o piso racha e explode, a lava sobe até a altura de onde
 * era o chão, e o corpo some na lava, como se estivesse afundando"*).
 *
 * Em quatro tempos:
 *   1. RACHA   — o piso RASGA sob o corpo: 6 estágios da folha `f4RachaSheet`, correndo PARA A ESQUERDA junto
 *                com o cenário (chapa que fica parada enquanto o chão rola denuncia o truque);
 *   2. ESTOURO — a fenda arrebenta: explosões na linha do chão, lascas de placa voando e brasas;
 *   3. SOBE    — a POÇA toma a faixa e para na altura de onde era o chão (`superficie`);
 *   4. AFUNDA  — o corpo desce por dentro dela, esfriando até o breu, e some.
 *
 * ⚠️ A ARTE É ASSADA, NÃO DESENHADA AQUI. A 1ª versão (17/09) montava tudo com `Graphics` e ele reprovou na hora:
 * *"ficou gerado e sem custos… preciso de uma lava mais condizente com o cenário, uma rachadura mais real"*. Traço
 * de `Graphics` é antisserrilhado e some do estilo; faixa lisa de cor chapada lê como fita colada. Agora vem tudo
 * de `scripts/_f4/_assar-fim-f4.mjs`, em pixel, na resolução nativa e com a PALETA DA FAIXA DO CHÃO da arena.
 * Mexer na aparência é mexer no assador e rodar de novo — não em código de cena.
 *
 * ⚠️ A soma dos tempos (≈3,8s) tem de caber em `BossNucleo.CORPO_FICA_MS`, que é o que a cena espera entre o
 * estouro final e a cutscene.
 */

/** Um tempo de corpo no chão antes de o piso ceder — o beat que ele pediu para ver a morte. */
const ESPERA_MS = 550;
/** Os 6 estágios do rasgo. */
const RACHA_MS = 900;
const ESTOURO_MS = 380;
const SOBE_MS = 900;
const AFUNDA_MS = 1100;
/** À frente da faixa da moldura (−0,6) e do corpo (0); atrás do HUD (100). */
const DEPTH_LAVA = 6;
/** Quanto o corpo desce para sumir dentro da poça. */
const AFUNDA_PX = 30;
/** O quadro da poça troca a cada tanto (8 quadros no ciclo). */
const LAVA_QUADRO_MS = 110;

export function afundarNaLava(scene: Phaser.Scene, corpo: Phaser.GameObjects.Image, fx: Fx, superficie: number): void {
  const centro = Phaser.Math.Clamp(corpo.x, 60, GAME_WIDTH - 60);
  const brasas = scene.add
    .particles(0, 0, 'puff', {
      lifespan: { min: 300, max: 700 },
      speedY: { min: -90, max: -24 },
      speedX: { min: -26, max: 26 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffb04a, 0xe8641f, 0xc4341a, 0x840008],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    })
    .setDepth(DEPTH_LAVA + 0.3);

  // ─── 1. O RASGO ───
  // A folha tem a fenda no meio da altura; o topo dela encosta na linha do chão. Ela ANDA com o cenário: o
  // deslocamento é o mesmo `SCROLL_SPEED` da moldura, e a chapa rasgada pertence ao chão que está passando.
  const racha = scene.add
    .image(centro, superficie - 4, 'f4RachaSheet', 0)
    .setOrigin(0.5, 0)
    .setDepth(DEPTH_LAVA - 0.2)
    .setVisible(false);
  let andando = false;
  const andar = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 1000,
    repeat: -1,
    onUpdate: () => {
      if (andando) racha.x -= (SCROLL_SPEED * scene.game.loop.delta) / 1000;
    },
  });

  // ─── 3. A POÇA ───
  // Um `TileSprite` da folha assada: a crosta já escorre dentro dos 8 quadros, e o `tilePositionX` soma a
  // rolagem do cenário por cima disso. A altura cresce de 0 até a linha do chão.
  const poca = scene.add
    .tileSprite(0, GAME_HEIGHT, GAME_WIDTH, 0, 'f4LavaSheet', 0)
    .setOrigin(0, 1)
    .setDepth(DEPTH_LAVA)
    .setVisible(false);
  let quadro = 0;
  scene.time.addEvent({
    delay: LAVA_QUADRO_MS,
    loop: true,
    callback: () => {
      quadro = (quadro + 1) % 8;
      poca.setFrame(quadro);
      poca.tilePositionX += (SCROLL_SPEED * LAVA_QUADRO_MS) / 1000;
    },
  });

  // O BRILHO que a poça joga na parede pintada acima dela — é o que costura o efeito no cenário. Não é pixel
  // art: é luz, e luz em ADD não tem serrilha para respeitar.
  const brilho = scene.add
    .image(GAME_WIDTH / 2, superficie, 'luzRadial')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xff4a10)
    .setScale(GAME_WIDTH / 40, 0.5)
    .setAlpha(0)
    .setDepth(DEPTH_LAVA - 0.05);

  /** A poça na altura `k` (0..1), com o brilho acompanhando. */
  const subir = (k: number): void => {
    poca.setVisible(k > 0);
    poca.height = (GAME_HEIGHT - superficie) * k;
    poca.y = GAME_HEIGHT;
    brilho.setY(GAME_HEIGHT - poca.height - 4);
    brilho.setAlpha(0.3 * k);
  };

  // ─── A LINHA DO TEMPO ───
  scene.time.delayedCall(ESPERA_MS, () => {
    racha.setVisible(true);
    andando = true;
    scene.cameras.main.shake(RACHA_MS, 0.005);
    scene.tweens.addCounter({
      from: 0,
      to: 5.99,
      duration: RACHA_MS,
      onUpdate: (tw) => {
        racha.setFrame(Math.floor(tw.getValue() ?? 0));
        if (Math.random() < 0.25) brasas.emitParticleAt(racha.x + Phaser.Math.Between(-90, 90), superficie + 4);
      },
      onComplete: () => {
        // ─── 2. O ESTOURO ───
        scene.cameras.main.shake(320, 0.013);
        for (let i = 0; i < 5; i++) {
          scene.time.delayedCall(i * 80, () => fx.explode(racha.x + (i - 2) * 46, superficie + 6, 1.3, 52));
        }
        brasas.explode(70, racha.x, superficie + 4);
        // As LASCAS de placa arrancadas: sobem girando e caem de volta na fenda.
        for (let i = 0; i < 12; i++) {
          const lasca = scene.add
            .image(racha.x + Phaser.Math.Between(-110, 110), superficie + 2, 'f4Destroco', i % 4)
            .setDepth(DEPTH_LAVA + 0.2);
          const alto = Phaser.Math.Between(26, 60);
          scene.tweens.add({
            targets: lasca,
            y: { value: lasca.y - alto, duration: 300, ease: 'Quad.easeOut', yoyo: true },
            x: lasca.x + Phaser.Math.Between(-30, 30),
            angle: Phaser.Math.Between(-360, 360),
            duration: 600,
            onComplete: () => lasca.destroy(),
          });
        }

        scene.tweens.addCounter({
          from: 0,
          to: 1,
          delay: ESTOURO_MS,
          duration: SOBE_MS,
          ease: 'Sine.easeOut',
          onUpdate: (tw) => {
            subir(tw.getValue() ?? 0);
            if (Math.random() < 0.3) brasas.emitParticleAt(Phaser.Math.Between(0, GAME_WIDTH), GAME_HEIGHT - poca.height);
          },
          onComplete: () => {
            racha.destroy();
            andar.stop();
            // ─── 4. O CORPO AFUNDA ───
            // A poça é desenhada por cima dele, então basta descer. Ele esfria para o breu no caminho: um corpo
            // que some mantendo a cor lê como sprite apagando, não como carne indo para dentro da lava.
            const claro = new Phaser.Display.Color(255, 255, 255);
            const frio = new Phaser.Display.Color(24, 6, 8);
            scene.tweens.add({
              targets: corpo,
              y: corpo.y + AFUNDA_PX,
              duration: AFUNDA_MS,
              ease: 'Sine.easeIn',
              onUpdate: (tw) => {
                const c = Phaser.Display.Color.Interpolate.ColorWithColor(claro, frio, 100, Math.floor((tw.progress ?? 0) * 100));
                corpo.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
                if (Math.random() < 0.4) brasas.emitParticleAt(corpo.x + Phaser.Math.Between(-24, 24), GAME_HEIGHT - poca.height);
              },
              onComplete: () => {
                brasas.explode(18, corpo.x, GAME_HEIGHT - poca.height);
                corpo.destroy();
              },
            });
          },
        });
      },
    });
  });
}
