import type Phaser from 'phaser';

/**
 * AS TEXTURAS PROVISÓRIAS DOS ELITES — até a arte aprovada entrar pelas MESMAS chaves (a `BootScene` carrega o PNG,
 * e aí esta função não desenha nada). Formas simples nas cores do bioma: o comportamento se testa sem esperar a arte.
 */
export function criarTexturasElites(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const fazer = (chave: string, w: number, h: number, desenhar: () => void): void => {
    if (scene.textures.exists(chave)) return;
    g.clear();
    desenhar();
    g.generateTexture(chave, w, h);
  };
  // O drone: corpo escuro, olho laranja à DIREITA (os sprites nascem apontando para a direita) e a broca.
  fazer('eliteDrone', 36, 24, () => {
    g.fillStyle(0x2a2d33).fillRoundedRect(2, 4, 26, 14, 5);
    g.fillStyle(0x4a4f58).fillRect(6, 18, 3, 5).fillRect(14, 18, 3, 5).fillRect(22, 18, 3, 5);
    g.fillStyle(0x6b6f78).fillTriangle(28, 9, 28, 15, 36, 12);
    g.fillStyle(0xff9a2e).fillRect(22, 8, 3, 3);
  });
  // A rocha: cinza-azulada com cristal laranja na face ESQUERDA (onde o drone trabalha).
  fazer('eliteRocha', 40, 40, () => {
    g.fillStyle(0x4a5866).fillCircle(22, 20, 17);
    g.fillStyle(0x34404c).fillCircle(26, 24, 10);
    g.fillStyle(0xffa640).fillTriangle(4, 18, 12, 12, 12, 24).fillTriangle(8, 28, 14, 22, 16, 30);
  });
  // A sentinela em RODA: esfera escura, olho vermelho.
  fazer('eliteSentinelaRoda', 26, 26, () => {
    g.fillStyle(0x2a2c31).fillCircle(13, 13, 12);
    g.lineStyle(1, 0x45484f).strokeCircle(13, 13, 8);
    g.fillStyle(0xff3030).fillRect(12, 12, 3, 3);
  });
  // A sentinela ABERTA: o anel em C, o núcleo com o canhão para a DIREITA e as três pernas.
  fazer('eliteSentinela', 36, 34, () => {
    g.lineStyle(4, 0x2f3238).beginPath().arc(14, 15, 12, Math.PI * 0.35, Math.PI * 1.65, false).strokePath();
    g.fillStyle(0x3a3d44).fillCircle(18, 15, 5);
    g.fillStyle(0x50545c).fillRect(22, 13, 12, 3);
    g.fillStyle(0xff3030).fillRect(17, 14, 2, 2);
    g.lineStyle(1, 0x3a3d44).lineBetween(18, 20, 10, 33).lineBetween(18, 20, 18, 33).lineBetween(18, 20, 26, 33);
  });
  // O escudo: um arco de energia (o lado convexo para a ESQUERDA).
  fazer('eliteEscudo', 12, 36, () => {
    g.lineStyle(2, 0xff6a6a, 0.9).beginPath().arc(26, 18, 22, Math.PI * 0.68, Math.PI * 1.32, false).strokePath();
    g.lineStyle(1, 0xffd0d0, 0.8).beginPath().arc(26, 18, 22, Math.PI * 0.72, Math.PI * 1.28, false).strokePath();
  });
  g.destroy();
}
