import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { CHAO_F1, FUMACA_CHAO_F1, QUEDA_CHAO_F1 } from './numerosF1';
import { brasaApagada } from './ritmosF1';
import { CHAVES_INVASAO } from './invasao';

/**
 * O CHÃO DA F1 (rodada 5 do bloco G, 20/10) — as DUAS pinturas dele em faixas sem emenda (`_camadas-chao-f1.mjs`), cada
 * uma na sua velocidade (`CHAO_F1`): o Vale atrás, a Paisagem na frente dele, as estruturas plantadas entre a Paisagem e
 * o entulho da frente, e o primeiro plano na frente da nave. Vivo pela técnica do menu (`docs/CENARIO-VIVO.md`):
 * - as BRASAS das duas pinturas tremulam por terços (`_luzes-chao-f1.mjs`: a luz tirada por difusão; por cima da faixa,
 *   o terço "apagado" com o alfa de `brasaApagada`);
 * - os fogos das torres do Vale soltam a COLUNA DE FUMAÇA da invasão, presa à faixa.
 * Tudo em função do relógio e do quanto o mundo andou: o mesmo instante dá sempre o mesmo quadro.
 *
 * Na saída da atmosfera (`cair`), as faixas descem em parallax (a mais longe desce menos) e se apagam.
 */

type Nome = keyof typeof CHAO_F1;
interface Caixa {
  chave: string;
  w: number;
  h: number;
  y: number;
  brasas?: number;
  fogos?: { x: number; y: number }[];
}

export interface FaixaChao {
  nome: Nome;
  ts: Phaser.GameObjects.TileSprite;
  fator: number;
  queda: number;
  /** O y de repouso: a queda da saída soma a partir dele. */
  y0: number;
  /** A largura do ladrilho (o período da faixa). */
  w: number;
  /** Os terços "apagados" das brasas, por cima da faixa. */
  brasas: Phaser.GameObjects.TileSprite[];
}

export interface ChaoF1 {
  /** Na ordem de trás para a frente: vale, paisagem, frente, perto. */
  faixas: FaixaChao[];
  /**
   * `andado`: px que o mundo andou; `primeiroPlano`: o alfa do primeiro plano agora (some na luta do chefão e com um
   * elite em cena — ver `Parallax.setForegroundDimmed`).
   */
  atualizar(t: number, andado: number, primeiroPlano: number): void;
  /** A saída da atmosfera: desce e apaga, em `QUEDA_CHAO_F1.ms`. */
  cair(): void;
  frente(): Phaser.GameObjects.TileSprite | null;
}

export function montarChao(scene: Phaser.Scene): ChaoF1 | null {
  const D = scene.cache.json.get('f1-chao') as Record<Nome, Caixa> | undefined;
  if (!D) return null;
  const faixas: FaixaChao[] = [];
  for (const nome of ['vale', 'paisagem', 'frente', 'perto'] as const) {
    const d = D[nome];
    if (!d || !scene.textures.exists(d.chave)) continue;
    const c = CHAO_F1[nome];
    const ts = scene.add.tileSprite(0, d.y, GAME_WIDTH, d.h, d.chave).setOrigin(0, 0).setDepth(c.depth);
    const brasas: Phaser.GameObjects.TileSprite[] = [];
    for (let g = 0; g < (d.brasas ?? 0); g++) {
      const chave = `${d.chave}-brasa-${g}`;
      if (!scene.textures.exists(chave)) continue;
      brasas.push(scene.add.tileSprite(0, d.y, GAME_WIDTH, d.h, chave).setOrigin(0, 0).setDepth(c.depth + 0.001));
    }
    faixas.push({ nome, ts, fator: c.fator, queda: c.queda, y0: d.y, w: d.w, brasas });
  }

  // A fumaça dos fogos do Vale: dois sprites por fogo (a faixa tem 381 px e a tela 384: um fogo pode estar nas duas
  // pontas ao mesmo tempo). Os quadros da `f1-fumaca` já foram cortados pela invasão (montada antes, no horizonte).
  const vale = faixas.find((f) => f.nome === 'vale');
  const fogos = (vale && scene.textures.exists(CHAVES_INVASAO.fumaca) ? D.vale.fogos ?? [] : []).map((f, i) => ({
    f,
    fase: i * 3.1,
    s: [0, 1].map(() => scene.add.sprite(0, f.y, CHAVES_INVASAO.fumaca, 0).setOrigin(0.5, 1).setDepth(CHAO_F1.vale.depth + 0.002)),
  }));
  const quadrosFumaca = scene.textures.exists(CHAVES_INVASAO.fumaca) ? scene.textures.get(CHAVES_INVASAO.fumaca).frameTotal - 1 : 1;

  const queda = { p: 0 };
  return {
    faixas,
    atualizar(t: number, andado: number, primeiroPlano: number): void {
      const some = 1 - queda.p;
      for (const f of faixas) {
        const x = Math.round(andado * f.fator);
        const y = Math.round(f.y0 + f.queda * queda.p);
        const a = some * (f.nome === 'perto' ? primeiroPlano : 1);
        f.ts.setPosition(0, y).setAlpha(a);
        f.ts.tilePositionX = x;
        f.brasas.forEach((b, g) => {
          b.setPosition(0, y).setAlpha(a * brasaApagada(t, g));
          b.tilePositionX = x;
        });
      }
      if (!vale) return;
      const P = vale.w;
      const desloc = ((Math.round(andado * vale.fator) % P) + P) % P;
      const dy = Math.round(vale.queda * queda.p);
      for (const { f, fase, s } of fogos) {
        s.forEach((sp, k) => {
          const x = f.x - desloc + k * P;
          const ve = x > -12 && x < GAME_WIDTH + 12;
          sp.setVisible(ve);
          if (!ve) return;
          sp.setPosition(x, f.y + dy).setAlpha(FUMACA_CHAO_F1.alfa * some);
          sp.setFrame(Math.floor(t * FUMACA_CHAO_F1.fps + fase) % Math.max(1, quadrosFumaca));
        });
      }
    },
    cair(): void {
      scene.tweens.add({ targets: queda, p: 1, duration: QUEDA_CHAO_F1.ms, ease: 'Quad.easeIn' });
    },
    frente(): Phaser.GameObjects.TileSprite | null {
      return faixas.find((f) => f.nome === 'frente')?.ts ?? null;
    },
  };
}
