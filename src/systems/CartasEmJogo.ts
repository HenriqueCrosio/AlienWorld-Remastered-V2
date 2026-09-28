import Phaser from 'phaser';
import { COLORS } from '../config';
import type { Fx } from './Fx';
import type { WeaponSystem } from './WeaponSystem';
import { CARTAS, adicionar, montarArma, quantas, sortear, tem, type Mesa } from '../cartas';

/**
 * AS CARTAS DENTRO DA FASE — PROTÓTIPO (feat/cartas-preview, 27/09).
 *
 * A `GameScene` só chama os GANCHOS (acerto, morte, dano, tick); tudo o que as cartas fazem em jogo mora aqui:
 * - as MESAS no meio da fase (quando abrir, pausar a fase, aplicar a escolha);
 * - EXPLOSIVO, INCENDIÁRIO e COMBUSTÃO (no acerto e na morte do inimigo);
 * - o CASCO, a RECARGA e o CASCO REATIVO (no dano à nave);
 * - os PROPULSORES (no teto de velocidade do voo livre).
 *
 * As cartas de ARMAMENTO não passam por aqui depois de escolhidas: elas viram a `WeaponDef` montada
 * (`montarArma`), e a arma não sabe que existe carta.
 */
export interface HostCartas {
  scene: Phaser.Scene;
  fx: Fx;
  weapons: WeaponSystem;
  inimigos: () => Phaser.Physics.Arcade.Sprite[];
  nave: () => Phaser.Physics.Arcade.Sprite;
  matar: (e: Phaser.Physics.Arcade.Sprite) => void;
  baseDaNave: string;
  fase: number;
  ganharVida: () => void;
}

/** Onde cada fase abre a mesa do MEIO (segundos do roteiro): o silêncio antes do chefão. */
const MESA_NO_TEMPO: Record<number, number> = { 1: 63, 2: 70 };

const CASCO_RECARGA = [8, 5.5, 3.5];
const VELOCIDADE_LIVRE = 110;

export class CartasEmJogo {
  private readonly abertas = new Set<string>();
  private cascoPronto = false;
  private cascoVoltaEm = 0;
  private queimaTick = 0;

  // ⚠️ O CASCO NÃO TEM DESENHO EM VOLTA DA NAVE (28/09). Era uma elipse ciano de 30px, do tamanho das naves antigas:
  // nas de 44px ela sumia atrás do casco e só o arco de cima aparecia, sobre a barbatana — lia como um "feixe de luz"
  // saindo da nave. O estado mora na HUD (`cascoAtivo`) e a nave pisca ciano quando ele volta.
  constructor(private readonly h: HostCartas) {
    this.cascoPronto = tem(this.reg, 'DEF_001');
  }

  /** O Casco está pronto para absorver o próximo golpe? (a HUD mostra) */
  get cascoAtivo(): boolean {
    return this.cascoPronto;
  }

  /** O aviso de que o Casco voltou: a nave pisca ciano, rápido. */
  private piscarCasco(): void {
    const nave = this.h.nave();
    nave.setTint(COLORS.playerBright);
    this.h.scene.time.delayedCall(120, () => nave.active && nave.clearTint());
  }

  private get reg(): Phaser.Data.DataManager {
    return this.h.scene.registry;
  }

  /** A arma da nave com as cartas de armamento já aplicadas. */
  arma(): string {
    return montarArma(this.reg, this.h.baseDaNave);
  }

  /** Vidas extras da mão, para a vida inicial da fase. */
  vidasExtras(): number {
    return quantas(this.reg, 'DEF_003');
  }

  // ─── A MESA ───────────────────────────────────────────────────────────────────────────────────

  /**
   * Abre uma mesa de 3 cartas e PAUSA a fase. `chave` impede a mesma mesa de abrir duas vezes (a aranha morre uma
   * vez, mas o relógio passa pelo mesmo segundo em vários quadros).
   */
  abrirMesa(chave: string, titulo: string, mesa: Partial<Mesa> = {}): void {
    if (this.abertas.has(chave)) return;
    this.abertas.add(chave);
    const opcoes = sortear(this.reg, { fase: this.h.fase, ...mesa });
    if (!opcoes.length) return;

    const s = this.h.scene;
    s.scene.pause();
    s.scene.launch('Cartas', {
      opcoes,
      titulo,
      onEscolha: (id: string) => {
        this.aplicar(id);
        // ⚠️ SOLTA AS TECLAS: a fase pausada não viu o keyup de quem soltou a seta durante a escolha, e a nave
        // voltaria andando sozinha.
        s.input.keyboard?.resetKeys();
        s.scene.resume();
      },
    });
  }

  aplicar(id: string): void {
    adicionar(this.reg, id);
    const c = CARTAS[id];
    if (c.categoria === 'arma') this.h.weapons.setBase(this.arma());
    if (id === 'DEF_003') this.h.ganharVida();
    if (id === 'DEF_001') {
      this.cascoPronto = true;
      this.piscarCasco();
    }
  }

  // ─── GANCHOS ──────────────────────────────────────────────────────────────────────────────────

  tick(time: number, dt: number, elapsed: number, livre: boolean, body: Phaser.Physics.Arcade.Body): void {
    const t = MESA_NO_TEMPO[this.h.fase];
    if (t !== undefined && elapsed >= t) this.abrirMesa('meio', 'SUPRIMENTO ENCONTRADO');

    // O CASCO: volta sozinho depois da recarga.
    if (tem(this.reg, 'DEF_001') && !this.cascoPronto && time >= this.cascoVoltaEm) {
      this.cascoPronto = true;
      this.piscarCasco();
    }

    // PROPULSORES: só no voo livre (a F1 é impulso, e a carta nem aparece nela).
    const prop = quantas(this.reg, 'MOV_001');
    if (livre && prop) body.setMaxVelocity(VELOCIDADE_LIVRE * (1 + 0.12 * prop));

    // A QUEIMA: 1 de dano a cada 0.4s enquanto durar.
    this.queimaTick -= dt;
    if (this.queimaTick <= 0) {
      this.queimaTick = 0.4;
      for (const e of this.h.inimigos()) {
        const ate = e.getData('queimaAte') as number | undefined;
        if (!e.active || !ate) continue;
        if (time > ate) {
          e.setData('queimaAte', 0);
          e.setTint(e.getData('tint') as number);
          continue;
        }
        this.h.fx.hit(e.x + Phaser.Math.Between(-4, 4), e.y + Phaser.Math.Between(-4, 4));
        this.ferir(e, 1);
      }
    }
  }

  /** O projétil acertou um inimigo (depois do dano normal). */
  aoAcertar(x: number, y: number, alvo: Phaser.Physics.Arcade.Sprite): void {
    if (tem(this.reg, 'EFF_004') && alvo.active && Math.random() < 0.25) {
      alvo.setData('queimaAte', this.h.scene.time.now + 2000);
      alvo.setTint(0xff9a50);
    }
    if (tem(this.reg, 'EFF_001')) {
      this.h.fx.explode(x, y, 0.45);
      // Adiado um quadro, pelo mesmo motivo da Combustão (ver `aoMorrer`).
      this.h.scene.time.delayedCall(0, () => this.emArea(x, y, 18, 1, alvo));
    }
  }

  /** Um inimigo morreu. */
  aoMorrer(e: Phaser.Physics.Arcade.Sprite): void {
    const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > this.h.scene.time.now;
    if (queimando && tem(this.reg, 'EFF_006')) {
      this.h.fx.explode(e.x, e.y, 0.9);
      // Adiado um quadro: a morte acontece DENTRO do laço de colisão, e matar vizinhos ali mexe no grupo que o
      // Arcade ainda está percorrendo.
      const { x, y } = e;
      this.h.scene.time.delayedCall(0, () => this.emArea(x, y, 26, 2, null));
    }
    if (e.getData('kind') === 'aranha') {
      this.h.scene.time.delayedCall(250, () => this.abrirMesa('aranha', 'DESTROÇOS DA ARANHA', { garante: 'incomum' }));
    }
  }

  /** O golfinho (o guardião da F4) morreu. */
  aoMorrerGuardiao(): void {
    this.h.scene.time.delayedCall(400, () => this.abrirMesa('guardiao', 'O NÚCLEO DO GUARDIÃO', { garante: 'rara' }));
  }

  /**
   * A nave ia tomar dano. Devolve `true` se o CASCO absorveu (a vida fica intacta).
   */
  absorver(time: number): boolean {
    if (!this.cascoPronto) return false;
    this.cascoPronto = false;
    this.cascoVoltaEm = time + CASCO_RECARGA[Math.min(quantas(this.reg, 'DEF_002'), 2)] * 1000;
    const n = this.h.nave();
    this.h.fx.hit(n.x, n.y);
    this.h.scene.cameras.main.flash(70, 62, 224, 240);
    if (tem(this.reg, 'DEF_004')) {
      this.h.fx.explode(n.x, n.y, 1.2);
      const { x, y } = n;
      this.h.scene.time.delayedCall(0, () => this.emArea(x, y, 40, 3, null));
    }
    return true;
  }

  // ─── ÁREA ─────────────────────────────────────────────────────────────────────────────────────

  private emArea(x: number, y: number, r: number, dano: number, exceto: Phaser.GameObjects.GameObject | null): void {
    for (const e of this.h.inimigos()) {
      if (!e.active || e === exceto) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) > r) continue;
      this.ferir(e, dano);
    }
  }

  private ferir(e: Phaser.Physics.Arcade.Sprite, dano: number): void {
    if (!e.active) return;
    const hp = (e.getData('hp') as number) - dano;
    e.setData('hp', hp);
    if (hp <= 0) this.h.matar(e);
  }
}
