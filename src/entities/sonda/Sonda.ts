import Phaser from 'phaser';
import { SONDA as S } from '../../data/numerosSonda';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import { Som } from '../../som/Som';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from '../elites/tipos';
import {
  alinhada, atiraDeNovo, balanco, caminhoDoMembro, desvioDaEsquiva, esquivaNova, faseDoBalanco, inclinacao, ladosDaDispersao, passoEsquiva,
  quemAtira, sortearCaminho, xDoPrimeiroAviso, yNoCaminho, type Caminho, type Esquiva,
} from './regras';

export type PeleSonda = 'f2' | 'f3';
/** The skin by stage (spec §2): rust in the F3, dark everywhere else (the F2; the sandbox of any stage). */
export const peleDaFase = (fase: number): PeleSonda => (fase === 3 ? 'f3' : 'f2');
/** His static art (the PixelLab objects), the first frame of every clip. */
export const TEXTURA_SONDA: Record<PeleSonda, string> = { f2: 'sondaF2', f3: 'sondaF3' };

/** The WAVE being born: the first sonda draws the path and who shoots; the ones born right after inherit them. */
interface Onda {
  t0: number;
  caminho: Caminho;
  atiradores: boolean[];
  /** the dispersion's sides (−1 up, 0, +1 down), one per member */
  lados: number[];
  n: number;
}
let onda: Onda | null = null;

interface EstadoSonda {
  t: number;
  pele: PeleSonda;
  caminho: Caminho;
  atira: boolean;
  /** where her 1st warning starts (as soon as she is whole on screen) */
  xPrimeiro: number;
  /** her clock when the current warning started (`null` = none running) */
  aviso: number | null;
  /** shots fired, and her clock at the last one */
  tiros: number;
  ultimo: number;
  esquiva: Esquiva;
  /** the path's height (without the sway) a frame ago: the lean reads the path, not the sway */
  yAntes: number;
  /** her sway's phase (round 3) */
  fase: number;
  /** the lean clip she is holding (`null` = level) — Task 4 */
  inclinada: 'sobe' | 'desce' | null;
}

/**
 * Her orb (round 2, him: *"o mesmo formato do tiro grande, mas [...] numa escala bem menor"*): the gunship's orb at
 * `escala`, its circle hitbox scaling with it — and DESTRUCTIBLE (*"queria que eles fossem explodidos caso o jogador
 * consiga acertá-los"*): the player's shot pops it (`GameScene.tiroAcertaTiro`).
 */
function vestirBolinha(b: Phaser.Physics.Arcade.Sprite): void {
  PadroesDeTiro.vestirBola(b);
  b.setScale(S.tiro.escala);
  b.setData('destrutivel', true);
}

function atirar(e: Sprite, ctx: CtxElite): void {
  ctx.tiros.mirado(e.x - 10, e.y, ctx.alvo.x, ctx.alvo.y, S.tiro.vel, vestirBolinha);
  Som.tocar('inimigo.tiro', { x: e.x });
}

/** Her clips (Task 4): the flight loop level, the lean held while the path climbs or dives, played back to level. */
function animar(e: Sprite, s: EstadoSonda, vy: number): void {
  const anims = e.scene.anims;
  const voo = `sonda-${s.pele}-voo`;
  const inc = inclinacao(vy);
  if (inc === 'reto') {
    if (s.inclinada) {
      const volta = `sonda-${s.pele}-${s.inclinada}`;
      s.inclinada = null;
      if (anims.exists(volta)) {
        e.playReverse(volta);
        if (anims.exists(voo)) e.anims.chain(voo);
        return;
      }
    }
    if (anims.exists(voo) && !e.anims.isPlaying) e.play(voo);
    return;
  }
  if (s.inclinada === inc) return;
  const chave = `sonda-${s.pele}-${inc}`;
  if (!anims.exists(chave)) return;
  s.inclinada = inc;
  e.play(chave);
}

/**
 * THE SONDA (spec 2026-11-20-bloco-f-sonda-design.md §3 and §7): the wave enters from the right on the LEADER's path (the
 * dive, the diagonal cut, or the dispersion that opens in a fan), she shoots as soon as she is in (a small, destructible
 * orb) and again while in front of the ship, steps aside once from whoever aims at her, and leaves by the left. A `miudo`: driven like an elite, not one (it does not dim the foreground). Held by the electric, her
 * clock stops (`atualizar` does not run).
 */
export const SONDA_COMPORTAMENTO: ComportamentoElite = {
  iniciar(e, ctx) {
    const agora = ctx.scene.time.now / 1000;
    if (!onda || agora - onda.t0 > S.janelaOndaS || onda.n >= onda.atiradores.length) {
      onda = {
        t0: agora, caminho: sortearCaminho(Math.random, ctx.alvo.y), atiradores: quemAtira(Math.random, S.porOnda),
        lados: ladosDaDispersao(Math.random, S.porOnda), n: 0,
      };
    }
    const i = onda.n++;
    const pele = peleDaFase(ctx.fase);
    // his art already faces left (the eye toward the ship): no mirror
    e.setFlipX(false);
    vestir(e, TEXTURA_SONDA[pele], S.corpo);
    e.setTint(0xffffff);
    e.setData('tint', 0xffffff);
    // what she is made of (the debris): the dark one is METAL, the rust one dies in its own RUST (20/11)
    e.setData('material', pele === 'f3' ? 'ferrugem' : 'metal');
    const caminho = caminhoDoMembro(onda.caminho, onda.lados[i] ?? 0);
    const y = yNoCaminho(caminho, e.x);
    e.y = y;
    const s: EstadoSonda = {
      t: 0, pele, caminho, atira: onda.atiradores[i] ?? false, xPrimeiro: xDoPrimeiroAviso(Math.random), aviso: null,
      tiros: 0, ultimo: 0, esquiva: esquivaNova(), yAntes: y, fase: faseDoBalanco(i, Math.random), inclinada: null,
    };
    e.setData('elite', s);
    const voo = `sonda-${pele}-voo`;
    if (e.scene.anims.exists(voo)) e.play(voo);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoSonda;
    s.t += dt;
    // the SWAY over the path (round 3): a light bob and surge, each on her own phase
    const b = balanco(s.t, s.fase);
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(-S.vel + b.vx, 0);
    s.esquiva = passoEsquiva(s.esquiva, s.t, dt, alinhada(ctx.alvo.x, ctx.alvo.y, e.x, e.y), e.y);
    const y = yNoCaminho(s.caminho, e.x) + desvioDaEsquiva(s.esquiva, s.t);
    const vy = dt > 0 ? (y - s.yAntes) / dt : 0;
    e.y = y + b.dy;
    s.yAntes = y;
    animar(e, s, vy);

    if (!s.atira) return;
    // the 1st warning as soon as she is whole on screen, then one every interval while she is in front of the ship
    const comeca = s.tiros === 0 ? e.x <= s.xPrimeiro : atiraDeNovo(s.tiros, s.t - s.ultimo, e.x, ctx.alvo.x);
    if (s.aviso === null && comeca) {
      s.aviso = s.t;
      // the warning lasts the blink: the player READS it and leaves the line (the gunner's, block SOUND sheet 3)
      Som.tocar('inimigo.aviso', { x: e.x });
    }
    if (s.aviso === null) return;
    const resta = S.tiro.avisoS - (s.t - s.aviso);
    if (resta > 0) {
      e.setTint(Math.floor(resta * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);
      return;
    }
    e.setTint(0xffffff);
    atirar(e, ctx);
    s.aviso = null;
    s.tiros++;
    s.ultimo = s.t;
  },
};
