import Phaser from 'phaser';
import { ALTURA, LARGURA, VOLUME } from './numerosMenu';
import { lcg } from './acaso';
import { brilho } from './texturas';
import type { ContextoCenario, Peca } from './cenario';

/**
 * §3.5 O VOLUME — o tratamento das fases e das cutscenes, não só a Atmosfera (19/10, ele: *"névoa, granulação,
 * volumetria"*): a BRUMA das fases em faixas que andam em velocidades diferentes (a diferença é que vende o volume; as
 * duas mais rápidas passam NA FRENTE das luzes; uma na janela, atrás da cidade e na frente do Leviatã), os FACHOS
 * frios das fases e a VOLUMETRIA da cutscene 2 (um halo grande e macio nas luzes mais fortes, um facho âmbar raro).
 */
export function montarVolume(ctx: ContextoCenario): Peca {
  const { scene, k, dados: D } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;

  // A bruma. A textura tem `k` px por px de jogo: a escala do ladrilho divide por `k`.
  const bandas: { ts: Phaser.GameObjects.TileSprite; vel: number; sx: number }[] = [];
  const banda = (b: { y: number; h: number; tint: number; pico: number; vel: number }, i: number, depth: number): void => {
    const sx = 1 - i * 0.095;
    const ts = A.tileSprite(0, b.y, LARGURA, b.h, `menu-fog-${k}`).setOrigin(0).setDepth(depth).setTint(b.tint).setAlpha(b.pico);
    ts.setTileScale(sx / k, b.h / 64 / k);
    bandas.push({ ts, vel: b.vel, sx });
  };
  banda(VOLUME.longe, 0, 1.5);
  VOLUME.bandas.forEach((b, i) => banda(b, i, b.frente ? 2.6 : 2.05));

  // Os fachos frios, do lado aceso do planeta, atravessando a névoa.
  const fachos = VOLUME.fachos.map((f, i) => ({
    img: A.image(f.x, f.y, `menu-raio-${k}`).setDepth(2.07).setTint(VOLUME.corFacho).setBlendMode(ADD).setAngle(f.angulo).setScale(f.escala / k, 1 / k),
    f,
    i,
  }));

  // A volumetria: as cinco luzes mais fortes longe das bordas, cada uma com o seu halo respirando; as duas mais
  // fortes, um facho âmbar.
  const H = VOLUME.halos;
  const F = VOLUME.fachosLuz;
  const rh = lcg(H.semente);
  const fortes = D.grupos
    .filter((g) => g.tipo === 'janela' && g.x > H.margem && g.x < LARGURA - H.margem && g.y > H.margem && g.y < ALTURA - H.margem)
    .sort((a, b) => b.n - a.n)
    .slice(0, H.quantidade);
  const halos = fortes.map((g, i) => {
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;
    const o = A.image(cx, cy, 'menu-brilho').setBlendMode(ADD).setTint(H.cor).setDepth(2.08).setScale(brilho(H.diamMin + rh() * H.diamVar));
    const halo = { o, base: H.baseMin + rh() * H.baseVar, dur: H.durMin + rh() * H.durVar, fase: rh() * 6 };
    if (i < F.quantidade) {
      A.image(cx, cy, `menu-raio-${k}`)
        .setBlendMode(ADD)
        .setTint(F.cor)
        .setDepth(2.08)
        .setAlpha(F.alfaMin + rh() * F.alfaVar)
        .setAngle(F.anguloMin - rh() * F.anguloVar)
        .setScale((F.larguraMin + rh() * F.larguraVar) / k, (F.compMin + rh() * F.compVar) / k);
    }
    return halo;
  });

  return {
    atualizar(t: number): void {
      for (const b of bandas) b.ts.tilePositionX = (t * b.vel * k) / b.sx;
      for (const { img, f, i } of fachos) {
        img.setX(f.x + Math.sin(t * 0.05 + i * 2) * f.deriva);
        img.setAlpha(f.pico * (0.7 + 0.3 * Math.sin(t * 0.45 + i * 1.7)));
      }
      for (const h of halos) h.o.setAlpha(h.base * (0.7 + 0.3 * Math.sin((t * 2 * Math.PI) / h.dur + h.fase)));
    },
  };
}
