import Phaser from 'phaser';
import { lcg } from '../menu/acaso';
import { FAROIS } from '../menu/numerosMenu';
import { farolApagado, torres } from '../menu/ritmos';
import { montarInvasao, type Invasao } from './invasao';
import { CACHOEIRA_F1, INVASAO, PROF } from './numerosF1';
import { agendaDasLuzes, derivaPintura, luzMorta } from './ritmosF1';

/**
 * O HORIZONTE DA F1 (bloco G, spec `2026-10-20-f1-cenario-design.md` §4–5): a pintura dele INTEIRA (429×216, escala 1),
 * as luzes TIRADAS da pintura (`apagadas.png` só tem os pixels que mudam), a cachoeira correndo e a invasão — tudo
 * derivando junto com a pintura, pelo RELÓGIO DA FASE. As camadas são assadas fora do jogo (`scripts/_g/`).
 *
 * A COLÔNIA CAI PELA LUZ (rodada 2): cada janela tem a hora em que apaga de vez (as de fora primeiro, a cidadela por
 * último, `agendaDasLuzes`), com a falha antes; os faróis piscam até a região deles cair, e o da ponta da cidadela
 * passa ao magenta (`INVASAO.topo`).
 */

/** Um grupo de luz da pintura (`dados.json`): caixa e área em px de jogo. */
export interface GrupoLuzF1 {
  tipo: 'janela' | 'farol';
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
}

/** O `dados.json` de `_camadas-f1.mjs`. */
export interface DadosF1 {
  k: number;
  w: number;
  h: number;
  agua: { x: number; y: number; w: number; h: number; quadros: number; fw: number; fh: number };
  grupos: GrupoLuzF1[];
}

export const CHAVES_F1 = {
  pintura: 'f1-pintura',
  apagadas: 'f1-apagadas',
  cachoeira: 'f1-cachoeira',
  dados: 'f1-dados',
} as const;

export interface Horizonte {
  atualizar(t: number): void;
  /** O multiplicador da saída da atmosfera (1 → 0): o `Parallax` o leva a 0 num tween, e tudo some junto. */
  readonly saida: { v: number };
  /** Os objetos fixos (a pintura, as luzes, a cachoeira). A sonda os lê. */
  readonly objetos: Phaser.GameObjects.GameObject[];
  readonly pintura: Phaser.GameObjects.Image;
  /** As peças apagadas dos faróis (visível = farol apagado). */
  readonly farois: Phaser.GameObjects.Image[];
  /** As peças apagadas das janelas (visível = janela apagada). */
  readonly janelas: Phaser.GameObjects.Image[];
  readonly invasao: Invasao | null;
}

/** O sorteio da fase de cada torre: o mesmo a cada partida. */
const SEMENTE_FAROIS = 41;

/** Monta o horizonte; `null` se as camadas não foram carregadas (a fase segue, com o céu de reserva). */
export function montarHorizonte(scene: Phaser.Scene): Horizonte | null {
  const D = scene.cache.json.get(CHAVES_F1.dados) as DadosF1 | undefined;
  const faltam = [CHAVES_F1.pintura, CHAVES_F1.apagadas, CHAVES_F1.cachoeira].filter((k) => !scene.textures.exists(k));
  if (!D || faltam.length) {
    console.warn('[f1] as camadas do horizonte não chegaram', faltam);
    return null;
  }
  const A = scene.add;
  const pintura = A.image(0, 0, CHAVES_F1.pintura).setOrigin(0).setDepth(PROF.pintura);
  // A peça apagada de uma luz: a camada `apagadas` recortada na caixa dela + a margem (a franja, o halo do farol).
  const apagar = (g: GrupoLuzF1, m: number): Phaser.GameObjects.Image => {
    const x0 = Math.max(0, Math.floor(g.x - m));
    const y0 = Math.max(0, Math.floor(g.y - m));
    return A.image(0, 0, CHAVES_F1.apagadas)
      .setOrigin(0)
      .setDepth(PROF.apagadas)
      .setCrop(x0, y0, Math.ceil(g.w + 2 * m), Math.ceil(g.h + 2 * m))
      .setVisible(false);
  };

  // As janelas: cada uma apaga de vez na hora dela.
  const gJanelas = D.grupos.filter((g) => g.tipo === 'janela');
  const agenda = agendaDasLuzes(gJanelas);
  const janelas = gJanelas.map((g, i) => ({ o: apagar(g, 1), morte: agenda[i] }));

  // Os faróis: os da mesma torre dividem a fase (piscam juntos, a regra do menu) e morrem com a região deles; o mais
  // perto da ponta da cidadela morre na hora do topo (ali acende o magenta).
  const gFarois = D.grupos.filter((g) => g.tipo === 'farol');
  const raizes = torres(gFarois);
  const rf = lcg(SEMENTE_FAROIS);
  const faseDaTorre = new Map<number, number>();
  const agendaF = agendaDasLuzes(gFarois, INVASAO.janelas.semente + 1);
  const T = INVASAO.topo;
  const dTopo = (g: GrupoLuzF1): number => Math.hypot(g.x + g.w / 2 - T.x, g.y + g.h / 2 - T.y);
  const doTopo = gFarois.reduce((m, g, i) => (m < 0 || dTopo(g) < dTopo(gFarois[m]) ? i : m), -1);
  const farois = gFarois.map((g, i) => {
    if (!faseDaTorre.has(raizes[i])) faseDaTorre.set(raizes[i], rf() * FAROIS.ciclo);
    return { o: apagar(g, FAROIS.margem), fase: faseDaTorre.get(raizes[i]) ?? 0, morte: i === doTopo ? T.t : agendaF[i] };
  });

  // A cachoeira: os quadros da folha, cortados uma vez por cena.
  const tex = scene.textures.get(CHAVES_F1.cachoeira);
  if (!tex.has('0')) for (let i = 0; i < D.agua.quadros; i++) tex.add(i, 0, i * D.agua.fw, 0, D.agua.fw, D.agua.fh);
  const agua = A.sprite(D.agua.x, D.agua.y, CHAVES_F1.cachoeira, 0).setOrigin(0).setDepth(PROF.agua);

  const invasao = montarInvasao(scene, gJanelas, agenda);
  const saida = { v: 1 };
  const objetos: Phaser.GameObjects.GameObject[] = [pintura, ...janelas.map((j) => j.o), ...farois.map((f) => f.o), agua];
  return {
    saida,
    objetos,
    pintura,
    farois: farois.map((f) => f.o),
    janelas: janelas.map((j) => j.o),
    invasao,
    atualizar(t: number): void {
      const dx = -derivaPintura(t);
      const a = saida.v;
      pintura.setX(dx).setAlpha(a);
      for (const j of janelas) j.o.setX(dx).setVisible(luzMorta(j.morte, t)).setAlpha(a);
      for (const f of farois) f.o.setX(dx).setVisible(luzMorta(f.morte, t) || farolApagado(f.fase, t)).setAlpha(a);
      agua.setX(D.agua.x + dx).setFrame(Math.floor(t * CACHOEIRA_F1.fps) % D.agua.quadros).setAlpha(a);
      invasao?.atualizar(t, dx, a);
    },
  };
}
