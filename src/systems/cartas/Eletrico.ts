import type Phaser from 'phaser';
import { pixelsDoRaio, saltosDoArco, type Ponto } from '../../cartasRegras';
import type { Contexto, Inimigo } from './contexto';

/** PROVISÓRIOS (calibragem). */
const CHANCE = 0.2;
const TRAVA_MS = 400;
const ARCO = { saltos: 3, raio: 50, dano: 1 };
const PULSO = { raio: 30, dano: 2 };
const COR_CHOQUE = 0x9ff6ff;
const COR_QUEIMANDO = 0xff9a50;
/** O raio vive 3 quadros de 40ms, redesenhado a cada um (o zigue-zague treme). */
const RAIO_MS = 120;
const QUADRO_MS = 40;
/**
 * Chefões e minichefes levam o dano, mas NÃO travam — travar chefão quebra a luta (§4.1b). Os chefões nem passam por
 * aqui (não são do grupo de inimigos); a aranha (minichefe da F3) é.
 */
const NAO_TRAVA = new Set(['aranha']);

/**
 * A BUILD ELÉTRICA (§4.1b). O fogo mata em área; o elétrico CONTROLA: o eletrificado não anda nem atira por ~0,4s — a
 * resposta direta aos atiradores da frente B.
 * - ELÉTRICO: chance de o tiro da nave eletrificar.
 * - ARCO EM CADEIA: o choque salta para até 3 próximos, um por vez, sem voltar; quem leva o arco é eletrificado mas NÃO
 *   solta arco novo.
 * - SOBRECARGA: o eletrificado que morre solta um pulso que FERE em volta; o pulso NÃO eletrifica.
 *
 * O raio é desenhado em PIXEL na resolução do jogo (`pixelsDoRaio`) — não sprite esticada, não linha vetorial.
 * Provisório: o tint ciano e o `Fx.estalo`; a faísca e o eletrificado do PixelLab (#17, #29) entram depois.
 */
export class Eletrico {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly raios: { a: Ponto; b: Ponto; ate: number; troca: number; pts: Ponto[] }[] = [];
  private readonly tingidos = new Set<Inimigo>();

  constructor(private readonly c: Contexto) {
    this.g = c.h.scene.add.graphics().setDepth(45);
  }

  /** O tiro da NAVE acertou. */
  aoAcertar(alvo: Inimigo): void {
    if (!this.c.tem('EFF_011') || !alvo.active || Math.random() >= CHANCE) return;
    this.eletrificar(alvo, true, 0);
  }

  eletrificar(e: Inimigo, saltar: boolean, dano: number): void {
    if (!e.active) return;
    e.setData('eletrificadoAte', this.c.h.scene.time.now + TRAVA_MS);
    if (!NAO_TRAVA.has(e.getData('kind') as string)) this.c.h.travar(e, TRAVA_MS);
    this.c.h.fx.estalo(e.x, e.y, e.displayWidth * 0.42);
    if (dano) this.c.depois(() => this.c.ferir(e, dano));
    if (saltar && this.c.tem('EFF_012')) this.arco(e);
  }

  /** Um inimigo morreu: se estava eletrificado e há Sobrecarga, o pulso. */
  aoMorrer(e: Inimigo): void {
    const ate = (e.getData('eletrificadoAte') as number | undefined) ?? 0;
    if (!this.c.tem('EFF_013') || ate <= this.c.h.scene.time.now) return;
    const { x, y } = e;
    this.c.h.fx.choque(x, y, 0.8);
    this.c.depois(() => {
      for (const o of this.c.noRaio(x, y, PULSO.raio)) if (o !== e) this.c.ferir(o, PULSO.dano);
    });
  }

  tick(): void {
    const agora = this.c.h.scene.time.now;

    // O TINT do eletrificado, reescrito todo quadro: o flash de dano (40ms) restauraria o tint do tipo por cima dele.
    for (const e of this.c.h.inimigos()) {
      if (!e.active) continue;
      const ligado = ((e.getData('eletrificadoAte') as number | undefined) ?? 0) > agora;
      if (ligado) {
        e.setTint(COR_CHOQUE);
        this.tingidos.add(e);
      } else if (this.tingidos.delete(e)) {
        const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > agora;
        e.setTint(queimando ? COR_QUEIMANDO : (e.getData('tint') as number));
      }
    }
    for (const e of this.tingidos) if (!e.active) this.tingidos.delete(e);

    this.g.clear();
    for (let i = this.raios.length - 1; i >= 0; i--) {
      const r = this.raios[i];
      if (agora >= r.ate) {
        this.raios.splice(i, 1);
        continue;
      }
      if (agora >= r.troca) {
        r.pts = pixelsDoRaio(r.a, r.b, Math.random);
        r.troca = agora + QUADRO_MS;
      }
      r.pts.forEach((p, k) => {
        this.g.fillStyle(k % 3 ? COR_CHOQUE : 0xffffff);
        this.g.fillRect(p.x, p.y, 1, 1);
      });
    }
  }

  private arco(origem: Inimigo): void {
    const vivos = this.c.h.inimigos().filter((e) => e.active && e !== origem);
    const saltos = saltosDoArco(
      { id: -1, x: origem.x, y: origem.y },
      vivos.map((e, i) => ({ id: i, x: e.x, y: e.y })),
      ARCO.saltos,
      ARCO.raio,
    );
    let de: Ponto = { x: origem.x, y: origem.y };
    for (const i of saltos) {
      const alvo = vivos[i];
      this.raios.push({ a: de, b: { x: alvo.x, y: alvo.y }, ate: this.c.h.scene.time.now + RAIO_MS, troca: 0, pts: [] });
      // Quem leva o arco é eletrificado, mas NÃO solta arco novo (sem recursão).
      this.eletrificar(alvo, false, ARCO.dano);
      de = { x: alvo.x, y: alvo.y };
    }
  }
}
