import Phaser from 'phaser';

/**
 * O ADITIVO PURO (02/11 — ele: *"existe uma tela preta em volta da serpente [...] fica mais aparente quando nuvem mais
 * clara passa atrás"*). O `ADD` do Phaser é (ONE, DST_ALPHA): o que já está desenhado é MULTIPLICADO pelo próprio alfa.
 * As nuvens do céu são semitransparentes (alfa < 1 no alvo da câmera), então um quadrado aditivo, mesmo vazio, as
 * escurece. O (ONE, ONE) só soma luz. Um por renderizador. (Movido do `BossSerpente` em 08/11: a luz do pixelfx da
 * enguia usa o mesmo.)
 */
const ADITIVO_PURO = new WeakMap<Phaser.Renderer.WebGL.WebGLRenderer, number>();
export function aditivoPuro(scene: Phaser.Scene): number {
  const r = scene.renderer;
  if (!(r instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return Phaser.BlendModes.ADD;
  let m = ADITIVO_PURO.get(r);
  if (m === undefined) {
    m = r.addBlendMode([r.gl.ONE, r.gl.ONE], r.gl.FUNC_ADD);
    ADITIVO_PURO.set(r, m);
  }
  return m;
}
