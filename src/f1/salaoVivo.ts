import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { brilho, garantirTexturas } from '../menu/texturas';
import { hash4, lcg } from '../menu/acaso';
import { SALAO_F1 } from './numerosF1';
import { brasaApagada } from './ritmosF1';

/**
 * O SALÃO VIVO da caverna da F1 (21/10, ele: "aplique os efeitos de iluminação, brumas, névoa etc no cenário interior")
 * — o cenário vivo (`docs/CENARIO-VIVO.md`) sobre as três pinturas do salão: as brasas tremulando por terços, a bruma em
 * faixas de velocidades diferentes, os fachos frios da abertura, os halos respirando e a poeira no facho. Os números em
 * `SALAO_F1`; as luzes medidas por `scripts/_g/_luzes-caverna-f1.mjs` (`caverna.json` → `luzes`). Tudo preso ao salão
 * pela máscara dele e função do relógio (`t`) e do mundo (`d`): o mesmo instante dá sempre o mesmo quadro.
 */

interface Ponto {
  x: number;
  y: number;
}

export interface LuzesSalao {
  interior: { brasas: number; chave: string; fortes: (Ponto & { n: number })[]; abertura: Ponto & { raio: number } };
  teto: { brasas: number; chave: string };
  chao: { brasas: number; chave: string };
}

export interface SalaoVivo {
  /** `t`: o relógio (s); `d`: px de mundo desde o evento; `fundoX`: onde o fundo do salão está (a deriva). */
  atualizar(t: number, d: number, fundoX: number): void;
  mostrar(v: boolean): void;
}

export function montarSalaoVivo(
  scene: Phaser.Scene,
  luzes: LuzesSalao | undefined,
  mascara: Phaser.Display.Masks.GeometryMask,
  teto: Phaser.GameObjects.TileSprite,
  chao: Phaser.GameObjects.TileSprite,
): SalaoVivo | null {
  if (!luzes || !scene.textures.exists('fogBand')) return null;
  garantirTexturas(scene, 1);
  const S = SALAO_F1;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;
  const todos: (Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.Mask)[] = [];
  const preso = <T extends Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.Mask>(o: T): T => {
    o.setMask(mascara);
    o.setVisible(false);
    todos.push(o);
    return o;
  };

  // AS BRASAS: os terços "apagados" por cima de cada pintura (o alfa = o quanto o terço está apagado agora).
  const terco = (n: number, chave: string, criar: (k: string) => Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite) =>
    Array.from({ length: n }, (_, g) => `${chave}-${g}`).filter((k) => scene.textures.exists(k)).map((k) => preso(criar(k)));
  const brasasFundo = terco(luzes.interior.brasas, luzes.interior.chave, (k) => A.image(0, 0, k).setOrigin(0, 0).setDepth(S.brasas.depthFundo));
  const brasasTeto = terco(luzes.teto.brasas, luzes.teto.chave, (k) =>
    A.tileSprite(teto.x, teto.y, teto.width, teto.height, k).setOrigin(0, 0).setDepth(S.brasas.depthBordas),
  ) as Phaser.GameObjects.TileSprite[];
  const brasasChao = terco(luzes.chao.brasas, luzes.chao.chave, (k) =>
    A.tileSprite(chao.x, chao.y, chao.width, chao.height, k).setOrigin(0, 0).setDepth(S.brasas.depthBordas),
  ) as Phaser.GameObjects.TileSprite[];

  // A BRUMA em faixas: a diferença de velocidade entre elas e o fundo vende o volume.
  const bruma = S.bruma.map((b) => {
    const ts = preso(A.tileSprite(0, b.y, GAME_WIDTH, b.h, 'fogBand').setOrigin(0, 0).setDepth(b.depth).setTint(b.tint).setAlpha(b.pico));
    ts.setTileScale(1, b.h / 64);
    return { ts, fator: b.fator };
  });

  // A ABERTURA: o halo grande e frio da fonte de luz da pintura, e os fachos descendo dela.
  const ab = luzes.interior.abertura;
  const abertura = preso(A.image(0, ab.y, 'menu-brilho').setBlendMode(ADD).setTint(S.abertura.cor).setDepth(S.abertura.depth).setScale(brilho(S.abertura.diametro)));
  const F = S.fachos;
  const fachos = F.itens.map((f, i) => ({
    img: preso(A.image(0, f.y, 'menu-raio-1').setBlendMode(ADD).setTint(F.cor).setDepth(F.depth).setAngle(F.angulo).setScale(f.escala, 1)),
    f,
    i,
  }));

  // OS HALOS âmbar nas brasas mais fortes, cada um no seu fôlego.
  const H = S.halos;
  const rh = lcg(H.semente);
  const halos = luzes.interior.fortes.map((g) => ({
    o: preso(A.image(0, g.y, 'menu-brilho').setBlendMode(ADD).setTint(H.cor).setDepth(H.depth).setScale(brilho(H.diamMin + rh() * H.diamVar))),
    x: g.x,
    base: H.baseMin + rh() * H.baseVar,
    dur: H.durMin + rh() * H.durVar,
    fase: rh() * 6,
  }));

  // A POEIRA no facho principal: grãos de 1 px descendo devagar, cada um na sua altura e no seu fôlego.
  const P = S.poeira;
  const principal = F.itens[0];
  const rad = Phaser.Math.DegToRad(F.angulo);
  const ux = -Math.cos(rad), uy = -Math.sin(rad); // ao longo do facho, de cima para baixo (para a esquerda e para baixo)
  const meio = (192 * principal.escala) / 2;
  const poeira = Array.from({ length: P.n }, (_, i) => ({
    o: preso(A.image(0, 0, 'menu-px').setOrigin(0, 0).setTint(P.cor).setDepth(P.depth)),
    u: (hash4(i, 1, 7, 3) - 0.5) * 1.4 * meio,
    p: (hash4(i, 2, 5, 1) - 0.5) * P.largura,
    cai: hash4(i, 3, 9, 4) * 40,
    respira: 0.4 + hash4(i, 4, 1, 8) * 0.9,
    fase: hash4(i, 5, 3, 2) * 6,
  }));

  return {
    atualizar(t: number, d: number, fundoX: number): void {
      const td = Math.round(d);
      brasasFundo.forEach((o, g) => o.setPosition(fundoX, 0).setAlpha(brasaApagada(t, g + S.brasas.fase[0])));
      brasasTeto.forEach((o, g) => {
        o.tilePositionX = td;
        o.setAlpha(brasaApagada(t, g + S.brasas.fase[1]));
      });
      brasasChao.forEach((o, g) => {
        o.tilePositionX = td;
        o.setAlpha(brasaApagada(t, g + S.brasas.fase[2]));
      });
      for (const b of bruma) b.ts.tilePositionX = d * b.fator;
      abertura.setX(fundoX + ab.x).setAlpha(S.abertura.base + S.abertura.amp * Math.sin((t * 2 * Math.PI) / S.abertura.per));
      for (const { img, f, i } of fachos) {
        img.setX(fundoX + f.x + Math.sin(t * 0.05 + i * 2) * f.deriva);
        img.setAlpha(f.pico * (0.7 + 0.3 * Math.sin((t * 2 * Math.PI) / f.per + i * 1.7)));
      }
      for (const h of halos) h.o.setX(fundoX + h.x).setAlpha(h.base * (0.7 + 0.3 * Math.sin((t * 2 * Math.PI) / h.dur + h.fase)));
      for (const g of poeira) {
        // a queda em 40 px, recomeçando; some nas pontas (sem estalo)
        const q = (g.cai + t * P.queda) % 40;
        const borda = Math.min(1, q / 6, (40 - q) / 6);
        const x = fundoX + principal.x + ux * g.u - uy * g.p;
        const y = principal.y + uy * g.u + ux * g.p + q - 20;
        g.o.setPosition(Math.round(x), Math.round(y)).setAlpha(P.alfa * borda * (0.5 + 0.5 * Math.sin(t * g.respira * 2 + g.fase)));
      }
    },
    mostrar(v: boolean): void {
      for (const o of todos) o.setVisible(v);
    },
  };
}
