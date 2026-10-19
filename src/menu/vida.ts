import Phaser from 'phaser';
import { CACHOEIRA, ESTRELAS, FAROIS, JANELAS, NAVE, TRAFEGO } from './numerosMenu';
import { lcg } from './acaso';
import { alfaEstrela, farolApagado, janelaApagada, luzesDaNave, pontoTrafego, torres, type RitmoJanela } from './ritmos';
import { brilho } from './texturas';
import type { ContextoCenario, GrupoLuz, Peca } from './cenario';

/**
 * §3.2–3.4 A VIDA DA CIDADE: as estrelas na janela de céu, as janelas e os faróis que apagam (a luz TIRADA da pintura:
 * `apagadas.png` só tem os pixels que mudam, e fica debaixo da névoa), a cachoeira, o tráfego nas pontes (só no
 * trecho visível de cada deque) e a nave parada com as luzes dela. O sorteio é o das maquetes (`lcg`), na mesma ordem.
 */
export function montarVida(ctx: ContextoCenario): Peca {
  const { scene, k, chave, dados: D } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;

  // As estrelas: sorteadas na janela aberta, onde a cidade é transparente e o céu é escuro.
  const r = lcg(ESTRELAS.semente);
  const estrelas: { o: Phaser.GameObjects.Image; f: number; p: number }[] = [];
  for (let n = 0; n < ESTRELAS.tentativas && estrelas.length < ESTRELAS.quantidade; n++) {
    const x = Math.floor(ESTRELAS.xMin + r() * ESTRELAS.xVar);
    const y = Math.floor(r() * ESTRELAS.yVar);
    const i = (y * k * D.w + x * k) * 4;
    const l = 0.3 * ctx.pixelsCeu[i] + 0.59 * ctx.pixelsCeu[i + 1] + 0.11 * ctx.pixelsCeu[i + 2];
    if (ctx.pixelsCidade[i + 3] !== 0 || l >= ESTRELAS.lumMax) continue;
    const cor = r() < 0.5 ? ESTRELAS.cores[0] : ESTRELAS.cores[1];
    const o = A.image(x + 0.5, y + 0.5, 'menu-brilho').setScale(brilho(ESTRELAS.diametro)).setBlendMode(ADD).setDepth(0.5).setTint(cor);
    estrelas.push({ o, f: 0.6 + r() * 1.4, p: r() * 6 });
  }

  // As janelas que apagam: sorteadas entre as pequenas.
  const rj = lcg(JANELAS.semente);
  const candidatas = D.grupos.filter((g) => g.tipo === 'janela' && g.n <= JANELAS.areaMax);
  const escolhidas: GrupoLuz[] = [];
  while (escolhidas.length < JANELAS.quantidade && candidatas.length) {
    escolhidas.push(candidatas.splice(Math.floor(rj() * candidatas.length), 1)[0]);
  }
  // A peça apagada: a camada `apagadas` recortada na caixa da luz + a margem (a franja, o halo do farol).
  const apagar = (g: GrupoLuz, margem: number): Phaser.GameObjects.Image =>
    A.image(0, 0, chave('apagadas'))
      .setOrigin(0)
      .setScale(1 / k)
      .setDepth(2.01)
      .setCrop(
        Math.floor((g.x - margem) * k),
        Math.floor((g.y - margem) * k),
        Math.ceil((g.w + 2 * margem) * k),
        Math.ceil((g.h + 2 * margem) * k),
      )
      .setVisible(false);
  const janelas = escolhidas.map((g) => {
    const l: RitmoJanela = {
      ciclo: JANELAS.cicloMin + rj() * JANELAS.cicloVar,
      fora: JANELAS.foraMin + rj() * JANELAS.foraVar,
      fase: rj() * JANELAS.faseVar,
      falha: rj() < JANELAS.chanceFalha,
    };
    return { o: apagar(g, JANELAS.margem), l };
  });

  // Os faróis: os da mesma torre dividem a fase (piscam juntos).
  const fGrupos = D.grupos.filter((g) => g.tipo === 'farol' && g.n <= FAROIS.areaMax);
  const raizes = torres(fGrupos);
  const faseDaTorre = new Map<number, number>();
  const farois = fGrupos.map((g, i) => {
    if (!faseDaTorre.has(raizes[i])) faseDaTorre.set(raizes[i], rj() * FAROIS.ciclo);
    return { o: apagar(g, FAROIS.margem), fase: faseDaTorre.get(raizes[i]) ?? 0 };
  });

  // A cachoeira.
  const agua = A.sprite(D.agua.x, D.agua.y, chave('cachoeira'), 0).setOrigin(0).setScale(1 / k).setDepth(2.02);

  // O tráfego: luzes embaçadas, um pouco mais largas que altas, quantas o deque comporta.
  const trafego: { o: Phaser.GameObjects.Image; ponte: readonly number[]; v: number; p: number; fl: number }[] = [];
  for (const ponte of TRAFEGO.pontes) {
    const [x0, y0, x1, y1] = ponte;
    const n = 1 + Math.floor(Math.hypot(x1 - x0, y1 - y0) / TRAFEGO.porComprimento) + (rj() < 0.5 ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const cor = rj() < TRAFEGO.chanceCor1 ? TRAFEGO.cores[0] : TRAFEGO.cores[1];
      const o = A.image(0, 0, 'menu-brilho')
        .setScale(brilho(TRAFEGO.diametro) * TRAFEGO.alongar, brilho(TRAFEGO.diametro))
        .setBlendMode(ADD)
        .setDepth(2.3)
        .setTint(cor);
      const v = (rj() < 0.5 ? -1 : 1) * (TRAFEGO.velMin + rj() * TRAFEGO.velVar);
      trafego.push({ o, ponte, v, p: rj(), fl: rj() * 6 });
    }
  }

  // A nave, parada onde ele pintou (o sobe-e-desce escondia a nave desenhada), e as luzes dela.
  A.image(D.nave.x, D.nave.y, chave('nave')).setOrigin(0).setScale(1 / k).setDepth(2.4);
  const luz = ([fx, fy]: readonly number[], cor: number): Phaser.GameObjects.Image =>
    A.image(D.nave.x + fx + 0.5, D.nave.y + fy + 0.5, 'menu-brilho').setScale(brilho(NAVE.diametro)).setBlendMode(ADD).setDepth(2.5).setTint(cor);
  const fileira = NAVE.fileira.map((p) => luz(p, NAVE.corFileira));
  const baixo = NAVE.baixo.map((p) => luz(p, NAVE.corBaixo));
  const topo = luz(NAVE.topo, NAVE.corTopo);

  return {
    atualizar(t: number): void {
      for (const e of estrelas) e.o.setAlpha(alfaEstrela(e.f, e.p, t));
      for (const j of janelas) j.o.setVisible(janelaApagada(j.l, t));
      for (const f of farois) f.o.setVisible(farolApagado(f.fase, t));
      agua.setFrame(Math.floor(t * CACHOEIRA.fps) % D.agua.quadros);
      for (const c of trafego) {
        const p = pontoTrafego(c.ponte, c.p, c.v, c.fl, t);
        c.o.setPosition(p.x, p.y).setAlpha(p.alfa);
      }
      const L = luzesDaNave(t);
      fileira.forEach((o, i) => o.setAlpha(L.fileira[i]));
      baixo.forEach((o, i) => o.setAlpha(L.baixo[i]));
      topo.setVisible(L.topo);
    },
  };
}
