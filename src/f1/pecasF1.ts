import Phaser from 'phaser';
import { PECAS_F1 } from './pecasF1.dados';

/**
 * AS PEÇAS DO CHÃO DA F1 (rodada 6 do bloco G, 21/10): as estruturas no escuro que ele escolheu — as cúpulas da colônia
 * com o gótico das pinturas dele crescendo delas, o invasor em violeta e magenta. As texturas vêm de
 * `scripts/_g/_instalar-pecas-f1.mjs` (a lista em `pecasF1.dados.ts`): cada variante na caixa do seu tipo (a mesma
 * escala de área de colisão de antes), as LUZES assadas em quadros (as janelas âmbar piscando por grupo, o magenta
 * pulsando, a luz vermelha da antena), o pilar em 5 alturas assadas.
 */

/** O ritmo das luzes: lento, como sempre foi — luz de cenário piscando rápido rouba a atenção do perigo. */
const LUZ_FPS = 5;

/** As chaves `ART` das peças (o `BootScene` as carrega no lugar das antigas). */
export const ART_PECAS_F1: Record<string, string> = Object.fromEntries(PECAS_F1.map((p) => [p.chave, p.arquivo]));

/**
 * Corta os quadros de cada variante, cria a animação `<chave>-luz` das que têm luz e guarda a boca do cano das torres
 * em `texture.customData.boca` (o `TerrainSystem` a lê ao atirar). Chamado uma vez, no `create` do `BootScene` — quem
 * toca a animação é o `TerrainSystem`, muito depois.
 */
export function registrarPecasF1(scene: Phaser.Scene): void {
  for (const p of PECAS_F1) {
    if (!scene.textures.exists(p.chave)) continue;
    const tex = scene.textures.get(p.chave);
    if (!tex.has('0')) for (let i = 0; i < p.quadros; i++) tex.add(i, 0, i * p.fw, 0, p.fw, p.fh);
    if (p.boca) (tex.customData as { boca?: readonly [number, number] }).boca = p.boca;
    const anim = `${p.chave}-luz`;
    if (p.quadros > 1 && !scene.anims.exists(anim)) {
      scene.anims.create({
        key: anim,
        frames: Array.from({ length: p.quadros }, (_, i) => ({ key: p.chave, frame: i })),
        frameRate: LUZ_FPS,
        repeat: -1,
      });
    }
  }
}
