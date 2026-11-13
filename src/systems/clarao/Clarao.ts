import Phaser from 'phaser';
import { CLARAO, raioDoImpacto, teto } from './claraoRegras';
import { texturaDisco, texturaVinheta } from './texturasClarao';

/** O teto é um só por jogo (vale entre cenas): os instantes dos clarões do último segundo. */
const janela: number[] = [];
const porCena = new WeakMap<Phaser.Scene, Clarao>();

/** O clarão da cena (criado na 1ª vez). É por aqui que TODO o jogo acende a tela — nunca `cameras.main.flash`. */
export function claraoDe(scene: Phaser.Scene): Clarao {
  let c = porCena.get(scene);
  if (!c) porCena.set(scene, (c = new Clarao(scene)));
  return c;
}

/**
 * OS CLARÕES DE UMA CENA (13/11, bloco I, etapa 2). Uma forma por família (ver `claraoRegras.ts`):
 * - `impacto` / `climax` — a luz em volta de uma explosão; a tela não muda de cor;
 * - `sinal` — a mesma luz, na cor do sinal, em volta de quem mudou (a nave armada, o chefão que virou);
 * - `golpe` — a VINHETA: as bordas acendem, o meio fica legível. É SÓ do golpe na nave: bordas acesas = "fui atingido";
 * - `largada` — a tela inteira, fraca e curta (o que não tem fonte na tela).
 * Todos passam pelo teto de 3 por segundo.
 */
export class Clarao {
  constructor(private readonly scene: Phaser.Scene) {}

  /** O pico de um clarão novo, já com o teto e a força geral. */
  private pico(base: number): number {
    return base * teto(janela, this.scene.time.now) * CLARAO.forca;
  }

  /** Toca os quadros da textura (a luz morrendo) em `ms` e destrói a imagem. */
  private toca(img: Phaser.GameObjects.Image, ms: number): void {
    let k = 0;
    this.scene.time.addEvent({
      delay: ms / CLARAO.quadros,
      repeat: CLARAO.quadros - 1,
      callback: () => {
        k++;
        if (k >= CLARAO.quadros) img.destroy();
        else if (img.active) img.setFrame(k);
      },
    });
  }

  private disco(x: number, y: number, raio: number, cor: number, pico: number, ms: number, depth: number): void {
    const img = this.scene.add
      .image(Math.round(x), Math.round(y), texturaDisco(this.scene, raio), 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(cor)
      .setAlpha(pico)
      .setDepth(depth);
    this.toca(img, ms);
  }

  /** Uma explosão grande: o raio pela `escala` do `explodeBig` (ou um `raio` dado); `ms` é a duração do flash antigo. */
  impacto(x: number, y: number, cor: number, o: { escala?: number; raio?: number; ms?: number; depth?: number } = {}): void {
    const I = CLARAO.impacto;
    const raio = o.raio ?? raioDoImpacto(o.escala ?? 1);
    this.disco(x, y, raio, cor, this.pico(I.pico), Math.max((o.ms ?? 120) * I.msFator, I.msMin), o.depth ?? CLARAO.depth.local);
  }

  /** O clímax de uma cutscene (a Aurora, a doca, a queda do Leviatã): o disco grande, pelos `ms` de sempre. */
  climax(x: number, y: number, cor: number, ms: number, depth: number = CLARAO.depth.local): void {
    this.disco(x, y, CLARAO.climax.raio, cor, this.pico(CLARAO.climax.pico), ms, depth);
  }

  /** Um sinal (a nave armada, a virada de um chefão, a fusão): a cor de sempre, em volta do dono. */
  sinal(x: number, y: number, cor: number, raio: number, depth: number = CLARAO.depth.local): void {
    this.disco(x, y, raio, cor, this.pico(CLARAO.sinal.pico), CLARAO.sinal.ms, depth);
  }

  /** O golpe na nave: a vinheta. `ms` é a duração do flash antigo. */
  golpe(cor: number, ms: number): void {
    const G = CLARAO.golpe;
    const { w, h } = CLARAO.tela;
    const img = this.scene.add
      .image(w / 2, h / 2, texturaVinheta(this.scene), 0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(cor)
      .setAlpha(this.pico(G.pico))
      .setDepth(CLARAO.depth.tela);
    this.toca(img, Math.max(ms * G.msFator, G.msMin));
  }

  /** A largada (e o que mais não tem fonte na tela): a tela inteira, fraca. `ms` é a duração do flash antigo. */
  largada(cor: number, ms: number): void {
    const L = CLARAO.largada;
    const { w, h } = CLARAO.tela;
    const r = this.scene.add.rectangle(w / 2, h / 2, w, h, cor, this.pico(L.pico)).setScrollFactor(0).setDepth(CLARAO.depth.tela);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: ms * L.msFator, onComplete: () => r.destroy() });
  }

  /** Registra no teto um clarão que a cena desenha por conta própria (os quadros de impacto da queda do Leviatã). */
  conta(): void {
    teto(janela, this.scene.time.now);
  }
}
