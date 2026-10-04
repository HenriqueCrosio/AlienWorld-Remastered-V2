import Phaser from 'phaser';
import type { HostCartas, Inimigo } from './contexto';

/**
 * As peças animadas (04/10, os tamanhos que ele escolheu na folha de 03/10 — `scripts/_montar-pecas.mjs`). A FAÍSCA
 * #17 ficou de fora: na comparação em jogo ele preferiu o raio em código atravessando o corpo (`Fx.estalo`) — *"fica
 * muito bem acabado"*.
 */
const PECA = {
  eletrificado: { sheet: 'cartaEletrificadoSheet', anim: 'carta-eletrificado', fps: 16 },
  queimando: { sheet: 'cartaQueimandoSheet', anim: 'carta-queimando', fps: 10 },
};
type Peca = (typeof PECA)[keyof typeof PECA];

/** Acima do inimigo (40) e abaixo das explosões das cartas (50). */
const PROFUNDIDADE = 46;

interface NoInimigo {
  eletrificado?: Phaser.GameObjects.Sprite;
  queimando?: Phaser.GameObjects.Sprite;
}

/**
 * OS ESTADOS DAS CARTAS DESENHADOS NO INIMIGO (o 2º lote das peças, 04/10). Até aqui eram só COR (`setTint`); agora
 * são peças por cima, que ACOMPANHAM o inimigo (o anel entre `anelDesde` e `anelAte`; a chama até `queimaAte`):
 * - ELETRIFICADO: o anel #29 — DEPOIS do raio em código que o `Eletrico` desenha no acerto (a escolha dele: "raio +
 *   anel", nessa ordem);
 * - QUEIMANDO: a chama #12, sem tingir o inimigo (a escolha dele: o "NOVO").
 * Comparação: `folhas/2026-10-04/pecas/eletrico-comparacao.gif` e `queimando-comparacao.gif`.
 *
 * Quem liga e desliga os estados continua sendo o `Eletrico` e o `CartasEmJogo`; aqui só se lê os dados do inimigo a
 * cada quadro. Sem a tira (o PNG não carregou), o estado volta a ser o tint de antes (`tingeEletrico`/`tingeQueima`).
 */
export class EstadosNoInimigo {
  private readonly presos = new Map<Inimigo, NoInimigo>();

  constructor(private readonly h: HostCartas) {}

  get tingeEletrico(): boolean {
    return !this.h.scene.textures.exists(PECA.eletrificado.sheet);
  }

  get tingeQueima(): boolean {
    return !this.h.scene.textures.exists(PECA.queimando.sheet);
  }

  tick(agora: number): void {
    for (const e of this.h.inimigos()) {
      if (!e.active) continue;
      // O anel só DEPOIS do raio (`anelDesde`/`anelAte`, ver `Eletrico`): um choque novo apaga o anel e o raio volta.
      const desde = (e.getData('anelDesde') as number | undefined) ?? 0;
      const eletrificado = desde > 0 && desde <= agora && ((e.getData('anelAte') as number | undefined) ?? 0) > agora;
      const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > agora;
      if (!eletrificado && !queimando && !this.presos.has(e)) continue;
      const p = this.presos.get(e) ?? {};
      this.presos.set(e, p);
      p.eletrificado = this.manter(p.eletrificado, eletrificado, PECA.eletrificado, e);
      p.queimando = this.manter(p.queimando, queimando, PECA.queimando, e);
    }

    // Segue o dono; some com ele (morto, devolvido ao pool).
    for (const [e, p] of this.presos) {
      if (!e.active) {
        p.eletrificado?.destroy();
        p.queimando?.destroy();
        this.presos.delete(e);
        continue;
      }
      // O anel no centro do corpo; a chama em cima dele (o fogo sobe), um pouco atrás do nariz.
      p.eletrificado?.setPosition(Math.round(e.x), Math.round(e.y));
      p.queimando?.setPosition(Math.round(e.x + e.displayWidth * 0.1), Math.round(e.y - e.displayHeight * 0.2));
      if (!p.eletrificado && !p.queimando) this.presos.delete(e);
    }
  }

  private manter(
    s: Phaser.GameObjects.Sprite | undefined,
    ligado: boolean,
    peca: Peca,
    e: Inimigo,
  ): Phaser.GameObjects.Sprite | undefined {
    if (ligado) return s ?? this.sprite(peca, e.x, e.y) ?? undefined;
    s?.destroy();
    return undefined;
  }

  private sprite(peca: Peca, x: number, y: number): Phaser.GameObjects.Sprite | null {
    const s = this.h.scene;
    if (!s.textures.exists(peca.sheet)) return null;
    if (!s.anims.exists(peca.anim)) {
      // O loop da PixMiniMax não fecha (o último quadro não emenda no primeiro): vaivém.
      s.anims.create({
        key: peca.anim,
        frames: s.anims.generateFrameNumbers(peca.sheet, {}),
        frameRate: peca.fps,
        repeat: -1,
        yoyo: true,
      });
    }
    const sp = s.add.sprite(Math.round(x), Math.round(y), peca.sheet).setDepth(PROFUNDIDADE);
    sp.play({ key: peca.anim, startFrame: Phaser.Math.Between(0, 4) });
    return sp;
  }
}
