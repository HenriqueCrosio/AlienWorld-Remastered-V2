import Phaser from 'phaser';
import { lcg } from '../menu/acaso';
import { brilho, garantirTexturas, LARG_CONE } from '../menu/texturas';
import { INVASAO, PROF } from './numerosF1';
import {
  alfaMagenta, anguloDefesa, explosaoEm, flakEm, holofoteAceso, lugaresDasExplosoes, posNave, rajadasDaArma, rastroEm,
  tracantesEm, type CaixaF1,
} from './ritmosF1';

/**
 * A INVASÃO DO HORIZONTE DA F1 (bloco G, spec §5, rodada 2): a colônia caindo na frente do jogador, presa ao relógio da
 * fase — o magenta acendendo onde o âmbar morreu, os holofotes e a artilharia da defesa até caírem, as naves invasoras
 * descendo das nuvens, as explosões ao longe (a folha da queda do Leviatã, reduzida) e o fogo e a fumaça que elas
 * deixam. Só cenário: nada aqui tem corpo, dá dano ou entra em colisão. As peças são assadas em pixel
 * (`scripts/_g/_invasao-f1.mjs`); aqui elas só são postas e movidas. Coordenadas da PINTURA + a deriva (`dx`).
 */

/** O `invasao.json` de `_invasao-f1.mjs`: os tamanhos dos quadros das folhas. */
interface DadosInvasao {
  naves: { w: number; h: number }[];
  explosao: { fw: number; fh: number; quadros: number };
  fumaca: { fw: number; fh: number; quadros: number };
  fogo: { fw: number; fh: number; quadros: number };
  flak: { fw: number; fh: number; quadros: number };
}

export const CHAVES_INVASAO = {
  dados: 'f1-invasao',
  naves: ['f1-nave-invasora', 'f1-nave-invasora-2'],
  explosao: 'f1-explosao',
  fumaca: 'f1-fumaca',
  fogo: 'f1-fogo',
  tracante: 'f1-tracante',
  flak: 'f1-flak',
} as const;

export interface Invasao {
  /** `dx` = a deriva da pintura (px, negativo); `saida` = o multiplicador da saída da atmosfera (1 → 0). */
  atualizar(t: number, dx: number, saida: number): void;
  /** Para a sonda: quantos objetos de cada peça. */
  readonly contagem: Record<string, number>;
}

/** Os traçantes ao mesmo tempo no ar, no máximo (o pool). */
const POOL_TRACANTES = 28;

/** Monta a invasão; `null` se as peças não foram carregadas (o horizonte segue sem ela). */
export function montarInvasao(scene: Phaser.Scene, janelas: readonly CaixaF1[], agenda: readonly number[]): Invasao | null {
  const D = scene.cache.json.get(CHAVES_INVASAO.dados) as DadosInvasao | undefined;
  const chaves = [...CHAVES_INVASAO.naves, CHAVES_INVASAO.explosao, CHAVES_INVASAO.fumaca, CHAVES_INVASAO.fogo, CHAVES_INVASAO.tracante, CHAVES_INVASAO.flak];
  const faltam = chaves.filter((k) => !scene.textures.exists(k));
  if (!D || faltam.length) {
    console.warn('[f1] as peças da invasão não chegaram', faltam);
    return null;
  }
  garantirTexturas(scene, 1);
  const cortar = (chave: string, f: { fw: number; fh: number; quadros: number }): void => {
    const tex = scene.textures.get(chave);
    if (tex.has('0')) return;
    for (let i = 0; i < f.quadros; i++) tex.add(i, 0, i * f.fw, 0, f.fw, f.fh);
  };
  cortar(CHAVES_INVASAO.explosao, D.explosao);
  cortar(CHAVES_INVASAO.fumaca, D.fumaca);
  cortar(CHAVES_INVASAO.fogo, D.fogo);
  cortar(CHAVES_INVASAO.flak, D.flak);
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;
  const r = lcg(73);

  // O MAGENTA: uma a cada `cada` janelas, depois que ela morre; o núcleo de 1 px e um brilho macio em volta.
  const M = INVASAO.magenta;
  const magentas = janelas
    .map((g, i) => ({ g, i }))
    .filter(({ i }) => i % M.cada === 0)
    .map(({ g, i }) => {
      const x = Math.round(g.x + g.w / 2) + 0.5;
      const y = Math.round(g.y + g.h / 2) + 0.5;
      return {
        x,
        y,
        brilho: A.image(x, y, 'menu-brilho').setScale(brilho(M.diametro)).setTint(M.cor).setBlendMode(ADD).setDepth(PROF.magenta),
        nucleo: A.image(x, y, 'menu-px').setTint(M.corNucleo).setDepth(PROF.magenta + 0.001),
        t0: agenda[i] + M.atrasoMin + r() * M.atrasoVar,
        per: M.perMin + r() * M.perVar,
        fase: r() * 6,
      };
    });
  // A PONTA DA CIDADELA, tomada: um magenta maior no alto da torre.
  const T = INVASAO.topo;
  const topo = A.image(T.x + 0.5, T.y + 0.5, 'menu-brilho').setScale(brilho(T.diametro)).setTint(M.cor).setBlendMode(ADD).setDepth(PROF.magenta);

  // OS HOLOFOTES DA DEFESA: o feixe (o cone do menu) e a lâmpada.
  const F = INVASAO.feixe;
  const holofotes = INVASAO.holofotes.map((h) => ({
    h,
    cone: A.image(h.x, h.y, 'menu-cone').setOrigin(0, 0.5).setBlendMode(ADD).setTint(F.cor).setDepth(PROF.holofote).setScale(h.comp / 256, F.largura / LARG_CONE),
    lampada: A.image(h.x, h.y, 'menu-brilho').setScale(brilho(F.lampada)).setTint(F.cor).setBlendMode(ADD).setDepth(PROF.holofote),
  }));

  // A ARTILHARIA: as rajadas de cada arma, e um pool de traçantes e um flak por arma.
  const armas = INVASAO.armas.map((a) => ({
    a,
    rajadas: rajadasDaArma(a),
    flak: A.sprite(a.x, a.y, CHAVES_INVASAO.flak, 0).setDepth(PROF.tracante).setVisible(false),
  }));
  const tracantes = Array.from({ length: POOL_TRACANTES }, () =>
    A.image(0, 0, CHAVES_INVASAO.tracante).setOrigin(1, 0.5).setBlendMode(ADD).setDepth(PROF.tracante).setVisible(false),
  );

  // AS NAVES INVASORAS: viradas para o lado em que descem (a arte aponta para a direita).
  const naves = INVASAO.naves.map((n) => ({
    n,
    o: A.image(n.de[0], n.de[1], CHAVES_INVASAO.naves[n.tipo]).setDepth(PROF.naves).setFlipX(n.para[0] < n.de[0]).setVisible(false),
  }));

  // AS EXPLOSÕES e o que elas deixam: o fogo (com o brilho dele) e a coluna de fumaça.
  const R = INVASAO.rastro;
  const E = INVASAO.explosao;
  const explosoes = lugaresDasExplosoes(janelas, agenda).map((l) => ({
    l,
    exp: A.sprite(l.x, l.y, CHAVES_INVASAO.explosao, 0).setOrigin(0.5, 0.85).setDepth(PROF.explosao).setVisible(false),
    clarao: A.image(l.x, l.y - 14, 'menu-brilho').setScale(brilho(E.clarao)).setTint(E.corClarao).setBlendMode(ADD).setDepth(PROF.clarao).setAlpha(0),
    fogo: A.sprite(l.x, l.y, CHAVES_INVASAO.fogo, 0).setOrigin(0.5, 1).setDepth(PROF.fogo).setVisible(false),
    brilhoFogo: A.image(l.x, l.y - 2, 'menu-brilho').setScale(brilho(R.brilho)).setTint(R.corBrilho).setBlendMode(ADD).setDepth(PROF.fogo).setAlpha(0),
    fumaca: A.sprite(l.x + 1, l.y - 2, CHAVES_INVASAO.fumaca, 0).setOrigin(0.5, 1).setDepth(PROF.fumaca).setAlpha(0),
    fase: r() * 10,
  }));

  const contagem = {
    magenta: magentas.length,
    holofotes: holofotes.length,
    armas: armas.length,
    naves: naves.length,
    explosoes: explosoes.length,
  };

  return {
    contagem,
    atualizar(t: number, dx: number, saida: number): void {
      for (const m of magentas) {
        const a = alfaMagenta(m.t0, m.per, m.fase, t) * saida;
        m.brilho.setPosition(m.x + dx, m.y).setAlpha(a);
        m.nucleo.setPosition(m.x + dx, m.y).setAlpha(Math.min(1, a * 1.4));
      }
      topo.setX(T.x + 0.5 + dx).setAlpha(t < T.t ? 0 : Math.min(1, (t - T.t) / M.entra) * T.alfa * (0.75 + 0.25 * Math.sin(t * 2.1)) * saida);

      for (const { h, cone, lampada } of holofotes) {
        const aceso = holofoteAceso(h.fim, t);
        cone.setPosition(h.x + dx, h.y).setAngle(anguloDefesa(h, t)).setAlpha(aceso ? F.alfa * saida : 0);
        lampada.setPosition(h.x + dx, h.y).setAlpha(aceso ? F.alfaLampada * saida : 0);
      }

      let n = 0;
      for (const { a, rajadas, flak } of armas) {
        for (const p of tracantesEm(a, rajadas, t)) {
          if (n >= tracantes.length) break;
          tracantes[n++].setPosition(p.x + dx, p.y).setAngle(p.ang).setAlpha(p.alfa * saida).setVisible(true);
        }
        const f = flakEm(a, rajadas, t, D.flak.quadros);
        if (f) flak.setPosition(f.x + dx, f.y).setFrame(f.quadro).setAlpha(saida).setVisible(true);
        else flak.setVisible(false);
      }
      for (; n < tracantes.length; n++) tracantes[n].setVisible(false);

      for (const { n: nave, o } of naves) {
        const p = posNave(nave, t);
        if (p) o.setPosition(Math.round(p.x + dx), Math.round(p.y)).setAlpha(p.alfa * saida).setVisible(true);
        else o.setVisible(false);
      }

      for (const e of explosoes) {
        const x = e.l.x + dx;
        const { quadro, clarao } = explosaoEm(e.l.t, t, D.explosao.quadros);
        if (quadro !== null) e.exp.setX(x).setFrame(quadro).setAlpha(saida).setVisible(true);
        else e.exp.setVisible(false);
        e.clarao.setX(x).setAlpha(clarao * saida);
        const rs = rastroEm(e.l.t, t);
        e.fogo.setX(x).setVisible(rs.fogo).setFrame(Math.floor(t * R.fogoFps + e.fase) % D.fogo.quadros).setAlpha((0.85 + 0.15 * Math.sin(t * 9 + e.fase)) * saida);
        e.brilhoFogo.setX(x).setAlpha(rs.fogo ? R.alfaBrilho * (0.8 + 0.2 * Math.sin(t * 7 + e.fase)) * saida : 0);
        e.fumaca.setX(x + 1).setFrame(Math.floor(t * R.fumacaFps + e.fase) % D.fumaca.quadros).setAlpha(rs.fumaca * saida);
      }
    },
  };
}
