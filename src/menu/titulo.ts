import Phaser from 'phaser';
import { pixelText } from '../ui';
import { ABERTURA, CORES_TEXTO, TITULO } from './numerosMenu';
import { letraAcesa, olhosAcesos, respiracao } from './abertura';
import { gerarLetreiro, type Letreiro } from './letreiro';

/** O título do menu na tela (spec §6.5): o letreiro de neon (camada HD) ou, sem ela, o texto que acende por cor. */
export interface TituloMenu {
  /** Desenha no instante `t` da abertura, com o centro em (cx, cy) px de jogo. */
  atualizar(t: number, cx: number, cy: number): void;
  /** A tela mudou de escala: o neon é gerado de novo para ela. */
  trocarEscala(s: number): void;
  /** Para a sonda: onde está, quantas letras acesas, os olhos. */
  estado(): { x: number; y: number; acesas: number; olhos: boolean };
  destruir(): void;
}

/**
 * Pinta cada letra (sem contar os espaços) com `cor(i)`. Na BitmapText (a Silkscreen assada), letra a letra; no texto
 * do sistema (sem a fonte), o texto inteiro com a cor da 1ª letra.
 */
export function tingirLetras(o: Phaser.GameObjects.Text, cor: (i: number) => number): void {
  const b = o as unknown as Phaser.GameObjects.BitmapText;
  if (typeof b.setCharacterTint === 'function') {
    let i = 0;
    for (let c = 0; c < b.text.length; c++) {
      if (b.text[c] === ' ') continue;
      b.setCharacterTint(c, 1, false, cor(i++));
    }
  } else {
    o.setColor(Phaser.Display.Color.IntegerToColor(cor(0)).rgba);
  }
}

/** O neon: por letra, uma peça apagada e uma acesa (o W, também a acesa com os olhos), cada pixel = 2 px de tela. */
class TituloNeon implements TituloMenu {
  private pecas: { ini: number; apagado: Phaser.GameObjects.Image; aceso: Phaser.GameObjects.Image; olhos: Phaser.GameObjects.Image | null }[] = [];
  private letreiro: Letreiro | null = null;
  private ultimo = { x: 0, y: 0, acesas: 0, olhos: false };

  constructor(private readonly cena: Phaser.Scene, s: number) {
    this.montar(s);
  }

  get pronto(): boolean {
    return this.letreiro !== null;
  }

  private montar(s: number): void {
    this.soltar();
    this.letreiro = gerarLetreiro(this.cena, s);
    const L = this.letreiro;
    if (!L) return;
    const escala = 2 / L.s;
    this.pecas = L.letras.map((l, i) => {
      const peca = (chave: string): Phaser.GameObjects.Image =>
        this.cena.add.image(0, 0, chave, `L${i}`).setOrigin(0, 0.5).setScale(escala).setDepth(20).setVisible(false);
      return { ini: l.ini, apagado: peca(L.chaves.apagado), aceso: peca(L.chaves.aceso), olhos: l.ch === 'W' ? peca(L.chaves.olhos) : null };
    });
  }

  trocarEscala(s: number): void {
    this.montar(s);
  }

  atualizar(t: number, cx: number, cy: number): void {
    const L = this.letreiro;
    if (!L) return;
    const e = 2 / L.s;
    const resp = respiracao(t);
    const olhos = olhosAcesos(t);
    let acesas = 0;
    this.pecas.forEach((p, i) => {
      const x = cx + (p.ini - L.w / 2) * e;
      const aceso = letraAcesa(i, t);
      if (aceso) acesas++;
      const comOlhos = p.olhos !== null && olhos;
      p.apagado.setPosition(x, cy).setVisible(!aceso);
      p.aceso.setPosition(x, cy).setVisible(aceso && !comOlhos).setAlpha(resp);
      p.olhos?.setPosition(x, cy).setVisible(aceso && comOlhos).setAlpha(resp);
    });
    this.ultimo = { x: cx, y: cy, acesas, olhos };
  }

  estado(): { x: number; y: number; acesas: number; olhos: boolean } {
    return this.ultimo;
  }

  private soltar(): void {
    for (const p of this.pecas) {
      p.apagado.destroy();
      p.aceso.destroy();
      p.olhos?.destroy();
    }
    this.pecas = [];
  }

  destruir(): void {
    this.soltar();
    this.letreiro = null;
  }
}

/** Sem a camada HD: o texto Silkscreen, apagado e acendendo letra por letra (o marcador de lugar da rodada 6). */
class TituloTexto implements TituloMenu {
  private readonly o: Phaser.GameObjects.Text;
  private ultimo = { x: 0, y: 0, acesas: 0, olhos: false };

  constructor(cena: Phaser.Scene) {
    this.o = pixelText(cena, ABERTURA.layout.x, -40, TITULO, { size: 20, color: CORES_TEXTO.tituloApagado }).setDepth(20);
  }

  atualizar(t: number, cx: number, cy: number): void {
    let acesas = 0;
    this.o.setPosition(cx, cy).setAlpha(respiracao(t));
    tingirLetras(this.o, (i) => {
      const a = letraAcesa(i, t);
      if (a) acesas++;
      return a ? CORES_TEXTO.tituloAceso : CORES_TEXTO.tituloApagado;
    });
    this.ultimo = { x: cx, y: cy, acesas, olhos: false };
  }

  trocarEscala(_s: number): void {
    // O texto se redesenha sozinho na escala nova (`registrarTextoHD`).
  }

  estado(): { x: number; y: number; acesas: number; olhos: boolean } {
    return this.ultimo;
  }

  destruir(): void {
    this.o.destroy();
  }
}

/** O neon na irmã da camada HD; sem a camada (ou sem a fonte), o texto. */
export function criarTitulo(mundo: Phaser.Scene, irma: Phaser.Scene | null, s: number): TituloMenu {
  if (irma) {
    const neon = new TituloNeon(irma, s);
    if (neon.pronto) return neon;
    neon.destruir();
  }
  return new TituloTexto(mundo);
}
