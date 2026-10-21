import Phaser from 'phaser';

/**
 * O CHEFÃO DA F1 NO BLOCO G (spec `2026-10-20-f1-cenario-design.md` §7): a PLUMA dos propulsores da Torre no ar e a
 * explosão da queda do Leviatã no tamanho dela (a decolagem e a morte). As peças são assadas em pixel
 * (`scripts/_g/_chefe-f1.mjs`); a arte da Torre (as duas formas que ele refez em agosto) não muda.
 *
 * A dívida das "chamas chapadas" era de julho, de antes da troca: na arte de hoje os bocais só BRILHAM. A pluma sai de
 * cada bocal aceso: branca na boca, âmbar, vermelha, e um vapor frio no fim — forte na decolagem, respirando no voo.
 */

/** O `chefe.json` de `_chefe-f1.mjs`. */
interface DadosChefe {
  plumas: { chave: string; fw: number; fh: number; quadros: number }[];
  explosao: { fw: number; fh: number; quadros: number };
}

export const CHAVES_CHEFE = { dados: 'f1-chefe', explosao: 'f1-explosao-chefe' } as const;

/**
 * OS BOCAIS ACESOS da arte no ar (`boss-air-anim-*.png`, 197×193, medidos em 20/10 nos quadros em que acendem): a boca
 * de cada um em px da ARTE (antes da escala do sprite), a pluma que cabe nela (0 = 14 px, 1 = 20, 2 = 26 — a boca na tela
 * tem ~13, ~20 e ~27 px) e a inclinação (graus; o da esquerda aponta um pouco para trás). O quarto bocal fica escondido
 * atrás dos outros.
 */
const BOCAIS = [
  { x: 60, y: 166, pluma: 1, angulo: 18 },
  { x: 87, y: 175, pluma: 0, angulo: 0 },
  { x: 127, y: 176, pluma: 2, angulo: -4 },
] as const;

/** A pluma: fps do tremor, e a força na decolagem × no voo (comprimento, alfa). */
const PLUMA = { fps: 14, forte: { comp: 1.25, alfa: 1 }, voo: { comp: 0.85, alfa: 0.88 }, respira: 0.12 } as const;

export interface Plumas {
  /** `forte` = decolando. */
  atualizar(agoraMs: number, forte: boolean): void;
  destroy(): void;
}

/** As plumas presas aos bocais do sprite (a escala e a posição dele valem); `null` sem as peças. */
export function montarPlumas(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite): Plumas | null {
  const D = scene.cache.json.get(CHAVES_CHEFE.dados) as DadosChefe | undefined;
  if (!D || D.plumas.some((p) => !scene.textures.exists(p.chave))) return null;
  for (const p of D.plumas) {
    const tex = scene.textures.get(p.chave);
    if (!tex.has('0')) for (let i = 0; i < p.quadros; i++) tex.add(i, 0, i * p.fw, 0, p.fw, p.fh);
  }
  const plumas = BOCAIS.map((b, i) => {
    const d = D.plumas[b.pluma];
    // Logo ATRÁS da Torre: a boca da pluma fica escondida debaixo do lábio do bocal.
    const o = scene.add.sprite(0, 0, d.chave, 0).setOrigin(0.5, 0).setDepth(sprite.depth - 0.01);
    return { b, o, d, fase: i * 1.7 };
  });
  return {
    atualizar(agoraMs: number, forte: boolean): void {
      const t = agoraMs / 1000;
      const F = forte ? PLUMA.forte : PLUMA.voo;
      const s = sprite.scaleX;
      for (const { b, o, d, fase } of plumas) {
        const visivel = sprite.active && sprite.visible;
        o.setVisible(visivel);
        if (!visivel) continue;
        // A boca do bocal no mundo: o centro do sprite + o deslocamento da arte, na escala dele.
        o.setPosition(sprite.x + (b.x - sprite.width / 2) * s, sprite.y + (b.y - sprite.height / 2) * s - 1);
        o.setAngle(b.angulo + sprite.angle);
        o.setFrame(Math.floor(t * PLUMA.fps + fase) % d.quadros);
        // Respira: o comprimento oscila um pouco; nunca maior que a arte (a escala vertical fica ≤ 1 no voo).
        const comp = F.comp * (1 - PLUMA.respira + PLUMA.respira * Math.sin(t * 9 + fase));
        o.setScale(1, Math.min(forte ? F.comp : 1, comp));
        o.setAlpha(F.alfa * (0.9 + 0.1 * Math.sin(t * 23 + fase)));
      }
    },
    destroy(): void {
      for (const p of plumas) p.o.destroy();
    },
  };
}

/**
 * A EXPLOSÃO DA QUEDA DO LEVIATÃ no tamanho do chefão (150×90, 24 quadros a 24 fps): a bola de fogo, a nuvem escura e a
 * fumaça que se desfaz — no lugar da `explosion-big`, cuja fumaça em bolinhas era o item 9 da análise de 14/10. A
 * origem é a BASE da nuvem (`yBase`): na decolagem ela nasce no chão, rente, e a Torre sobe de dentro dela.
 */
export function explosaoDaQueda(scene: Phaser.Scene, x: number, yBase: number, depth: number): Phaser.GameObjects.Sprite | null {
  const D = scene.cache.json.get(CHAVES_CHEFE.dados) as DadosChefe | undefined;
  if (!D || !scene.textures.exists(CHAVES_CHEFE.explosao)) return null;
  const tex = scene.textures.get(CHAVES_CHEFE.explosao);
  if (!tex.has('0')) for (let i = 0; i < D.explosao.quadros; i++) tex.add(i, 0, i * D.explosao.fw, 0, D.explosao.fw, D.explosao.fh);
  if (!scene.anims.exists('f1-explosao-chefe')) {
    scene.anims.create({
      key: 'f1-explosao-chefe',
      frames: Array.from({ length: D.explosao.quadros }, (_, i) => ({ key: CHAVES_CHEFE.explosao, frame: i })),
      frameRate: 24,
      repeat: 0,
    });
  }
  const s = scene.add.sprite(Math.round(x), Math.round(yBase), CHAVES_CHEFE.explosao, 0).setOrigin(0.5, 0.92).setDepth(depth);
  s.play('f1-explosao-chefe');
  s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  return s;
}
