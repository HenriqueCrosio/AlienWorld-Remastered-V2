import Phaser from 'phaser';

/**
 * O SANGUE DO CHEFÃO FINAL (B3, 16/09) — o jorro e as manchas na tela. Moram fora do `BossNucleo` porque
 * servem às DUAS mortes: a do guardião (a troca, onde o predador sai de dentro dele) e a do predador.
 * Tudo desenhado no motor: zero geração.
 */

/** O jorro: sangue escuro que sobe e CAI (gravidade), um flash vermelho e o tranco forte. */
export function explosaoSangrenta(scene: Phaser.Scene, x: number, y: number, escala = 1): void {
  const gotas = scene.add
    .particles(x, y, 'puff', {
      lifespan: { min: 700, max: 1400 },
      speed: { min: 70, max: 240 },
      angle: { min: 200, max: 340 },
      gravityY: 340,
      scale: { start: 1.6, end: 0.5 },
      alpha: { start: 0.95, end: 0.2 },
      tint: [0x5a0508, 0x7a0a0c, 0x3a0204, 0x9a1812],
      emitting: false,
    })
    .setDepth(53);
  gotas.explode(Math.round(90 * escala));
  const nevoa = scene.add
    .particles(x, y, 'puff', {
      lifespan: { min: 500, max: 900 },
      speed: { min: 10, max: 60 },
      scale: { start: 3, end: 6 },
      // ⚠️ Escura demais (0x3a0204 a 0,7) ela lia como BURACOS PRETOS sobre a barriga dele (captura 16/09).
      alpha: { start: 0.35, end: 0 },
      tint: [0x8a1410, 0x6a0a0c],
      emitting: false,
    })
    .setDepth(52);
  nevoa.explode(Math.round(26 * escala));
  scene.time.delayedCall(1600, () => {
    gotas.destroy();
    nevoa.destroy();
  });
  scene.cameras.main.flash(260, 140, 0, 0);
  scene.cameras.main.shake(500, 0.012);
}

/**
 * SANGUE NA TELA: manchas presas à câmera, por cima de tudo, que escorrem e somem ANTES de a arma destravar
 * — ninguém começa a luta olhando através do sangue. Desenhadas no motor (zero geração).
 */
export function sangueNaTela(scene: Phaser.Scene, manchas = 10): void {
  for (let v = 0; v < 3; v++) {
    const key = `sangueTela${v}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    const cx = 48;
    const cy = 40;
    g.fillStyle(0x4a0306, 0.92);
    g.fillCircle(cx, cy, 16 + v * 3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + v;
      const d = 14 + ((i * 7 + v * 5) % 16);
      g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 3 + ((i + v) % 4));
    }
    g.fillStyle(0x6a0a0c, 0.9);
    g.fillCircle(cx - 4, cy - 5, 8 + v);
    // As escorridas.
    g.fillStyle(0x4a0306, 0.9);
    for (let i = 0; i < 3; i++) g.fillRect(cx - 10 + i * 9 + v * 2, cy + 8, 3, 22 + ((i * 11 + v * 7) % 30));
    g.generateTexture(key, 96, 96);
    g.destroy();
  }
  for (let i = 0; i < manchas; i++) {
    const img = scene.add
      .image(Phaser.Math.Between(10, 374), Phaser.Math.Between(4, 200), `sangueTela${i % 3}`)
      .setScrollFactor(0)
      .setDepth(95)
      .setScale(Phaser.Math.FloatBetween(0.6, 1.5))
      .setAngle(Phaser.Math.Between(-30, 30))
      .setAlpha(0.9);
    scene.tweens.add({
      targets: img,
      y: img.y + 18,
      alpha: 0,
      delay: Phaser.Math.Between(700, 1000),
      duration: 1100,
      ease: 'Sine.easeIn',
      onComplete: () => img.destroy(),
    });
  }
}
