import Phaser from 'phaser';
import { ALTURA, BUSCA, FEIXE, HOLOFOTES, LARGURA, PROPULSORES, TEMPESTADE } from './numerosMenu';
import { lcg } from './acaso';
import { quieto } from './abertura';
import { anguloBusca, anguloHolofote, brilhoRelampago, forcaPropulsor } from './ritmos';
import { brilho, LARG_CONE } from './texturas';
import type { ContextoCenario, EstadoMenu, Peca } from './cenario';

/**
 * §4 O PERIGO (19/10, ele: *"precisamos deixar uma impressão de perigo"*): os holofotes antiaéreos varrendo o céu, a
 * nave vasculhando a colônia com o holofote da quilha, e a tempestade chegando na massa de nuvem que ele marcou —
 * clarões por dentro das nuvens (as silhuetas da frente ficam em contraluz), um raio em cerca de metade deles, a nuvem
 * pesada rolando. Nenhum relâmpago na janela quieta da abertura, nem com movimento reduzido.
 */
export function montarPerigo(ctx: ContextoCenario, estado: EstadoMenu): Peca & { contagem: () => number } {
  const { scene, k, chave, dados: D, tempestade: TD } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;
  const feixe = (x: number, y: number, comp: number, larg: number, alfa: number, depth: number): Phaser.GameObjects.Image =>
    A.image(x, y, 'menu-cone')
      .setOrigin(0, 0.5)
      .setBlendMode(ADD)
      .setTint(FEIXE.cor)
      .setDepth(depth)
      .setScale(comp / 256, larg / LARG_CONE)
      .setAlpha(alfa);

  // Os holofotes antiaéreos: o feixe e a lâmpada na base.
  const holofotes = HOLOFOTES.map((h) => {
    A.image(h.x, h.y, 'menu-brilho').setScale(brilho(FEIXE.lampada)).setTint(FEIXE.corLampada).setBlendMode(ADD).setDepth(2.31).setAlpha(FEIXE.alfaLampada);
    return { o: feixe(h.x, h.y, h.comp, FEIXE.largura, FEIXE.alfa, 2.09), h };
  });

  // A nave vasculhando: o holofote da quilha e os dois propulsores frios.
  const bx = D.nave.x + BUSCA.origem[0];
  const by = D.nave.y + BUSCA.origem[1];
  const busca = feixe(bx, by, BUSCA.comp, BUSCA.largura, BUSCA.alfa, 2.39);
  A.image(bx, by, 'menu-brilho').setScale(brilho(BUSCA.lampada)).setTint(BUSCA.corLampada).setBlendMode(ADD).setDepth(2.45).setAlpha(BUSCA.alfaLampada);
  const propulsores = PROPULSORES.pontos.map(([px, py]) => {
    const x = D.nave.x + px;
    const y = D.nave.y + py;
    return {
      luz: A.image(x, y, 'menu-brilho').setScale(brilho(PROPULSORES.diametro)).setTint(PROPULSORES.cor).setBlendMode(ADD).setDepth(2.45),
      jato: feixe(x, y, PROPULSORES.jato[0], PROPULSORES.jato[1], PROPULSORES.alfaJato, 2.39).setTint(PROPULSORES.cor).setAngle(90),
    };
  });

  // A tempestade: as máscaras assadas (`_tempestade.mjs`) — os clarões e a nuvem em meia resolução, os raios inteiros.
  const meia = TD.reducao / k;
  const flashes = TD.flashes.map((c, n) =>
    A.image(c.x / k, c.y / k, chave(`flash${n}`)).setOrigin(0).setScale(meia).setBlendMode(ADD).setTint(TEMPESTADE.cor).setDepth(2.03).setAlpha(0),
  );
  const raios = TD.raios.map((c, n) =>
    A.image(c.x / k, c.y / k, chave(`raio${n}`)).setOrigin(0).setScale(1 / k).setBlendMode(ADD).setTint(TEMPESTADE.corRaio).setDepth(2.04).setAlpha(0),
  );
  const clarao = A.rectangle(0, 0, LARGURA, ALTURA, TEMPESTADE.corGlobal, 1).setOrigin(0).setBlendMode(ADD).setDepth(2.62).setAlpha(0);
  // A nuvem pesada rolando, só sobre as nuvens da massa (a máscara só existe no WebGL).
  const R = TEMPESTADE.rolar;
  let rolo: Phaser.GameObjects.TileSprite | null = null;
  if (scene.renderer.type === Phaser.WEBGL) {
    const c = TD.nuvem;
    rolo = A.tileSprite(c.x / k, c.y / k, c.w / k, c.h / k, `menu-fog-${k}`)
      .setOrigin(0)
      .setDepth(2.035)
      .setTint(R.cor)
      .setAlpha(R.alfa)
      .setTileScale(R.escala[0] / k, R.escala[1] / k);
    const mascara = scene.make.image({ x: c.x / k, y: c.y / k, key: chave('nuvem') }, false).setOrigin(0).setScale(meia);
    rolo.setMask(mascara.createBitmapMask());
  }

  // Os relâmpagos: o primeiro com hora marcada (antes do letreiro), os outros sorteados a cada 6–12 s.
  const rnd = lcg(TEMPESTADE.semente);
  type Relampago = { t: number; foco: number; comRaio: boolean };
  const sortear = (depois: number): Relampago => ({
    t: depois + TEMPESTADE.intervalo[0] + rnd() * (TEMPESTADE.intervalo[1] - TEMPESTADE.intervalo[0]),
    foco: Math.floor(rnd() * TEMPESTADE.focos.length),
    comRaio: rnd() < TEMPESTADE.chanceRaio,
  });
  let proximo: Relampago = { t: TEMPESTADE.primeiro.t, foco: TEMPESTADE.primeiro.foco, comRaio: TEMPESTADE.primeiro.comRaio };
  let atual: Relampago | null = null;
  let contagem = 0;

  return {
    contagem: () => contagem,
    atualizar(t: number): void {
      for (const { o, h } of holofotes) o.setAngle(anguloHolofote(h, t));
      busca.setAngle(anguloBusca(t));
      propulsores.forEach((p, i) => {
        const f = forcaPropulsor(i, t);
        p.luz.setAlpha(PROPULSORES.alfa * f);
        p.jato.setAlpha(PROPULSORES.alfaJato * f);
      });
      if (rolo) {
        rolo.tilePositionX = -(t * R.vel * k) / R.escala[0];
        rolo.tilePositionY = Math.sin(t * R.ondulaHz) * R.ondula * k;
      }
      if (t >= proximo.t) {
        // Na janela quieta (o letreiro descendo e acendendo) e com movimento reduzido, o relâmpago não cai.
        if (!estado.reduzido && !quieto(estado.tAbertura, estado.pulou)) {
          atual = proximo;
          contagem++;
        }
        proximo = sortear(proximo.t);
      }
      const a = atual;
      const { v, raio } = a ? brilhoRelampago(t - a.t) : { v: 0, raio: 0 };
      flashes.forEach((f, n) => f.setAlpha(a && n === a.foco ? TEMPESTADE.forca * v : 0));
      raios.forEach((r, n) => r.setAlpha(a && a.comRaio && n === a.foco ? raio : 0));
      clarao.setAlpha(TEMPESTADE.global * v);
    },
  };
}
