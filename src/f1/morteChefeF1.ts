import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';

/**
 * A MORTE DA TORRE, MAIOR E MAIS VIOLENTA (rodada 5 do bloco G — ele, 20/10: "a explosão + fumaça + efeitos podem ser
 * maiores e mais violentos"). Três tempos:
 * 1. A CADEIA (~1,3 s): a explosão da queda do Leviatã em 84 px estourando pelo corpo, doze vezes, cada uma com fagulhas
 *    e um tranco curto; a Torre aderna, afunda e treme. Substitui a `explosion-sheet` (a fumaça em bolinhas, item 9).
 * 2. O ESTOURO: a mesma explosão em 250 px (ainda uma REDUÇÃO da original, 344), os 48 quadros; os estilhaços cortados da
 *    própria arte da Torre voando em arco, cada um com o seu rastro de fumaça; o tremor longo e o clarão.
 * 3. O INCÊNDIO: onde ela caiu, fogo e uma coluna de fumaça no entulho da frente, PRESOS a ele — andam com o chão e caem
 *    com ele na saída da atmosfera.
 * As peças são assadas em pixel (`scripts/_g/_morte-chefe-f1.mjs`, as caixas em `sprites/f1/morte.json`).
 */

interface Quadros {
  fw: number;
  fh: number;
  quadros: number;
  colunas?: number;
  /** Onde a bola de fogo nasce, em fração do quadro (`_explosao-fonte.mjs`): a origem do sprite. */
  centro?: { x: number; y: number };
}
interface DadosMorte {
  explosaoG: Quadros;
  explosaoM: Quadros;
  estilhacos: Quadros;
  fumaca: Quadros;
  fogo: Quadros;
}

export const CHAVES_MORTE = {
  dados: 'f1-morte',
  explosaoG: 'f1-explosao-chefe-g',
  explosaoM: 'f1-explosao-chefe-m',
  estilhacos: 'f1-estilhacos-chefe',
  fumaca: 'f1-fumaca-chefe',
  fogo: 'f1-fogo-chefe',
} as const;

/** Os números da morte. `estouroMs`: quando o estouro grande vem, contado do golpe final (o fim da cadeia). */
export const MORTE_F1 = {
  cadeia: { vezes: 12, passoMs: 105, fps: 24, abalo: 0.9 },
  estouroMs: 1300,
  estouro: { fps: 30, abalo: 1.8 },
  aderna: { graus: 9, afunda: 24, treme: 1.5 },
  estilhacos: { n: 16, velMin: 90, velMax: 240, gravidade: 320, giro: 420, vidaMs: 2600 },
  // ⚠️ `atrasoMs` CURTO: o estouro rompe a atmosfera e o chão começa a cair na hora (2,5 s). Aos 700 ms (o primeiro
  // valor) o fogo nascia num chão já indo embora, e a fumaça virava uma barra escura contra o céu do zero-G (20/10).
  incendio: { atrasoMs: 150, fogos: [-18, 0, 15], fumacaFps: 6, fogoFps: 11, baseFogo: 210, baseFumaca: 198, duraMs: 9000 },
} as const;

const dados = (scene: Phaser.Scene): DadosMorte | undefined => scene.cache.json.get(CHAVES_MORTE.dados) as DadosMorte | undefined;

/** As peças da morte nova estão carregadas? Sem elas o `GameScene` fica com a morte da rodada 4. */
export function morteF1Pronta(scene: Phaser.Scene): boolean {
  return !!dados(scene) && Object.values(CHAVES_MORTE).every((k) => k === CHAVES_MORTE.dados || scene.textures.exists(k));
}

/** Os quadros de uma folha em GRADE (uma vez) e a animação dela; devolve a chave da animação. */
function animDe(scene: Phaser.Scene, chave: string, q: Quadros, fps: number, repeat: number): string {
  const tex = scene.textures.get(chave);
  const cols = q.colunas ?? q.quadros;
  if (!tex.has('0')) for (let i = 0; i < q.quadros; i++) tex.add(i, 0, (i % cols) * q.fw, Math.floor(i / cols) * q.fh, q.fw, q.fh);
  const anim = `${chave}-anim`;
  if (!scene.anims.exists(anim)) {
    scene.anims.create({ key: anim, frames: Array.from({ length: q.quadros }, (_, i) => ({ key: chave, frame: i })), frameRate: fps, repeat });
  }
  return anim;
}

/**
 * Uma explosão que se apaga sozinha no último quadro, nascendo NO PONTO: a origem é o centro da bola de fogo (`centro`),
 * espelhado junto quando a explosão sai espelhada (metade das vezes — a fumaça se desfaz para um lado ou para o outro).
 */
function estourar(scene: Phaser.Scene, chave: string, anim: string, q: Quadros, x: number, y: number, depth: number): void {
  const espelha = Math.random() < 0.5;
  const c = q.centro ?? { x: 0.5, y: 0.6 };
  const s = scene.add
    .sprite(Math.round(x), Math.round(y), chave, 0)
    .setOrigin(espelha ? 1 - c.x : c.x, c.y)
    .setDepth(depth)
    .setFlipX(espelha);
  s.play(anim);
  s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
}

/** 1. A CADEIA: os estouros pelo corpo e a Torre adernando. Chamada no golpe final. */
export function cadeiaDaMorte(scene: Phaser.Scene, fx: Fx, sprite: Phaser.GameObjects.Sprite): void {
  const D = dados(scene);
  if (!D) return;
  const C = MORTE_F1.cadeia;
  const anim = animDe(scene, CHAVES_MORTE.explosaoM, D.explosaoM, C.fps, 0);
  const w = sprite.displayWidth, h = sprite.displayHeight;
  for (let i = 0; i < C.vezes; i++) {
    scene.time.delayedCall(i * C.passoMs, () => {
      if (!sprite.active) return;
      const x = sprite.x + (Math.random() - 0.5) * w * 0.7;
      const y = sprite.y + (Math.random() - 0.5) * h * 0.7;
      estourar(scene, CHAVES_MORTE.explosaoM, anim, D.explosaoM, x, y, 50);
      fx.abalo(x, y, C.abalo);
    });
  }
  const A = MORTE_F1.aderna;
  const dura = C.vezes * C.passoMs;
  const lado = Math.random() < 0.5 ? -1 : 1;
  scene.tweens.add({ targets: sprite, angle: lado * A.graus, y: sprite.y + A.afunda, duration: dura, ease: 'Quad.easeIn' });
  scene.tweens.add({ targets: sprite, x: sprite.x + A.treme, duration: 45, yoyo: true, repeat: Math.ceil(dura / 90) });
}

/**
 * 2 e 3. O ESTOURO grande no centro da Torre, os estilhaços e, se houver o entulho da frente (`frente`), o incêndio
 * preso a ele.
 */
export function estouroDaMorte(scene: Phaser.Scene, fx: Fx, x: number, y: number, frente: Phaser.GameObjects.TileSprite | null): void {
  const D = dados(scene);
  if (!D) return;
  const E = MORTE_F1.estouro;
  estourar(scene, CHAVES_MORTE.explosaoG, animDe(scene, CHAVES_MORTE.explosaoG, D.explosaoG, E.fps, 0), D.explosaoG, x, y, 50);
  fx.abaloGrande(x, y, E.abalo);
  estilhacos(scene, D, x, y);
  if (frente) scene.time.delayedCall(MORTE_F1.incendio.atrasoMs, () => incendio(scene, D, x, frente));
}

/**
 * OS ESTILHAÇOS: pedaços da própria arte da Torre (as bordas rasgadas em brasa), em leque para cima, caindo em arco e
 * girando, cada um com um rastro de fumaça. Movidos à mão pelo `update` da cena — fora do Arcade, que o hitstop pausa.
 */
function estilhacos(scene: Phaser.Scene, D: DadosMorte, x: number, y: number): void {
  const S = MORTE_F1.estilhacos;
  for (let i = 0; i < D.estilhacos.quadros; i++) {
    const tex = scene.textures.get(CHAVES_MORTE.estilhacos);
    if (!tex.has(String(i))) tex.add(i, 0, i * D.estilhacos.fw, 0, D.estilhacos.fw, D.estilhacos.fh);
  }
  const pecas = Array.from({ length: S.n }, (_, i) => {
    // O leque: −165° a −15° (para cima), com uns poucos saindo baixo para os lados.
    const ang = Phaser.Math.DegToRad(-165 + Math.random() * 150 + (i % 5 === 0 ? 40 * Math.sign(Math.random() - 0.5) : 0));
    const vel = S.velMin + Math.random() * (S.velMax - S.velMin);
    const img = scene.add
      .image(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, CHAVES_MORTE.estilhacos, i % D.estilhacos.quadros)
      .setDepth(51)
      .setAngle(Math.random() * 360);
    const rastro = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 380, max: 650 },
        speed: { min: 2, max: 10 },
        scale: { start: 0.35, end: 1.0 },
        alpha: { start: 0.55, end: 0 },
        tint: [0x3a3940, 0x2b2a31, 0x5c4638],
        frequency: 38,
      })
      .setDepth(50.5);
    rastro.startFollow(img);
    return { img, rastro, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, va: (Math.random() - 0.5) * 2 * S.giro };
  });
  let vida = 0;
  const passo = (_t: number, deltaMs: number): void => {
    const dt = deltaMs / 1000;
    vida += deltaMs;
    for (const p of pecas) {
      p.vy += S.gravidade * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.angle += p.va * dt;
      // Some nos últimos 400 ms (os que ainda estão na tela caem para baixo do chão que desce).
      p.img.setAlpha(Math.min(1, (S.vidaMs - vida) / 400));
    }
    if (vida < S.vidaMs) return;
    scene.events.off(Phaser.Scenes.Events.UPDATE, passo);
    for (const p of pecas) {
      p.rastro.stop();
      p.img.destroy();
      scene.time.delayedCall(700, () => p.rastro.destroy());
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, passo);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, passo));
}

/**
 * O INCÊNDIO no entulho da frente: três fogos e uma coluna de fumaça, presos à faixa — andam com o `tilePositionX` dela e
 * descem com o `y` dela (a queda da saída), e o alfa segue o dela. Na frente da faixa (depth −0,19), atrás da nave.
 */
function incendio(scene: Phaser.Scene, D: DadosMorte, x: number, frente: Phaser.GameObjects.TileSprite): void {
  if (!frente.active) return;
  const I = MORTE_F1.incendio;
  const animFogo = animDe(scene, CHAVES_MORTE.fogo, D.fogo, I.fogoFps, -1);
  const animFumaca = animDe(scene, CHAVES_MORTE.fumaca, D.fumaca, I.fumacaFps, -1);
  const fumaca = scene.add.sprite(x, I.baseFumaca, CHAVES_MORTE.fumaca, 0).setOrigin(0.5, 1).setDepth(-0.195);
  fumaca.play(animFumaca);
  const fogos = I.fogos.map((dx, i) => {
    const f = scene.add.sprite(x + dx, I.baseFogo, CHAVES_MORTE.fogo, 0).setOrigin(0.5, 1).setDepth(-0.19).setFlipX(i % 2 === 1);
    f.play(animFogo);
    f.anims.setProgress(i / I.fogos.length);
    return { f, dx };
  });
  const t0 = frente.tilePositionX, y0 = frente.y;
  let vida = 0;
  const passo = (_t: number, deltaMs: number): void => {
    vida += deltaMs;
    const dx = -(frente.tilePositionX - t0), dy = frente.y - y0;
    // Entra em 300 ms e se apaga no último segundo.
    const a = frente.alpha * Math.min(1, vida / 300, Math.max(0, (I.duraMs - vida) / 1000));
    fumaca.setPosition(Math.round(x + dx), Math.round(I.baseFumaca + dy)).setAlpha(a);
    for (const { f, dx: d } of fogos) f.setPosition(Math.round(x + d + dx), Math.round(I.baseFogo + dy)).setAlpha(a);
    if (vida < I.duraMs && x + dx > -60) return;
    scene.events.off(Phaser.Scenes.Events.UPDATE, passo);
    fumaca.destroy();
    for (const { f } of fogos) f.destroy();
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, passo);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, passo));
}
