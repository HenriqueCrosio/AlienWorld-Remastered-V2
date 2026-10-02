import Phaser from 'phaser';
import { COLORS } from '../config';
import type { OrigemProjetil } from './WeaponSystem';
import { CARTAS, adicionar, montarArma, quantas, sortear, tem, type Mesa } from '../cartas';
import type { Contexto, HostCartas, Inimigo } from './cartas/contexto';
import { ExplosaoDoJogador } from './cartas/ExplosaoDoJogador';
import { Lancadores } from './cartas/Lancadores';
import { DroneAuxiliar } from './cartas/DroneAuxiliar';
import { Eletrico } from './cartas/Eletrico';
import { criarTexturasProvisorias } from './cartas/texturasProvisorias';

export type { HostCartas } from './cartas/contexto';

/**
 * AS CARTAS DENTRO DA FASE (feat/cartas-preview; o catálogo de 24 é de 01/10 — spec `2026-10-01-catalogo-cartas`).
 *
 * A `GameScene` só chama os GANCHOS (acerto, morte, dano, tick); tudo o que as cartas fazem em jogo mora aqui e nos
 * subsistemas de `systems/cartas/`, que recebem um `Contexto` comum:
 * - as MESAS no meio da fase (quando abrir, pausar a fase, aplicar a escolha);
 * - a EXPLOSÃO ÚNICA (`ExplosaoDoJogador`): Explosivo, Combustão, Casco Reativo, Flare e Míssil chamam a mesma;
 * - INCENDIÁRIO (no acerto) e a queima;
 * - a BUILD ELÉTRICA (`Eletrico`): Elétrico, Arco em Cadeia e Sobrecarga;
 * - o CASCO, a RECARGA e o CASCO REATIVO (no dano à nave);
 * - os PROPULSORES (no teto de velocidade do voo livre).
 *
 * As cartas de ARMAMENTO de número (Duplo, Triplo, Cadência, Perfurante, Pesado) não passam por aqui depois de
 * escolhidas: viram a `WeaponDef` montada (`montarArma`), e a arma não sabe que existe carta. Míssil e Drone, que são
 * lançadores PRÓPRIOS, passam — e não copiam Duplo, Triplo nem Cadência da nave (spec §4.3).
 */

/** Onde cada fase abre a mesa do MEIO (segundos do roteiro): o silêncio antes do chefão. */
const MESA_NO_TEMPO: Record<number, number> = { 1: 63, 2: 70 };

/** Segundos até o Casco voltar: sem Recarga · com Recarga (máx. 1 — com 2 chegava a 3,5s, quase invulnerável; §4.4). */
const CASCO_RECARGA = [8, 5.5];
const VELOCIDADE_LIVRE = 110;
const QUEIMA_MS = 2000;
const COR_QUEIMANDO = 0xff9a50;

export class CartasEmJogo {
  readonly explosao: ExplosaoDoJogador;
  readonly lancadores: Lancadores;
  readonly drone: DroneAuxiliar;
  readonly eletrico: Eletrico;
  private readonly c: Contexto;
  private readonly abertas = new Set<string>();
  private cascoPronto = false;
  private cascoVoltaEm = 0;
  private queimaTick = 0;

  // ⚠️ O CASCO NÃO TEM DESENHO EM VOLTA DA NAVE (28/09). Era uma elipse ciano de 30px, do tamanho das naves antigas:
  // nas de 44px ela sumia atrás do casco e só o arco de cima aparecia, sobre a barbatana — lia como um "feixe de luz"
  // saindo da nave. O estado mora na HUD (`cascoAtivo`) e a nave pisca ciano quando ele volta.
  constructor(private readonly h: HostCartas) {
    criarTexturasProvisorias(h.scene);
    this.c = {
      h,
      tem: (id) => tem(this.reg, id),
      quantas: (id) => quantas(this.reg, id),
      ferir: (e, dano) => this.ferir(e, dano),
      incendiar: (e) => this.incendiar(e),
      noRaio: (x, y, raio) =>
        h.inimigos().filter((e) => e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= raio),
      depois: (fn) => {
        h.scene.time.delayedCall(0, fn);
      },
    };
    this.explosao = new ExplosaoDoJogador(this.c);
    this.lancadores = new Lancadores(this.c, this.explosao);
    this.drone = new DroneAuxiliar(this.c);
    this.eletrico = new Eletrico(this.c);
    this.cascoPronto = tem(this.reg, 'DEF_001');
  }

  /** O Casco está pronto para absorver o próximo golpe? (a HUD mostra) */
  get cascoAtivo(): boolean {
    return this.cascoPronto;
  }

  /**
   * Há projétil GUIADO de carta na mão (Míssil ou Drone)? A cena só monta a lista de alvos da perseguição quando
   * alguém persegue (`GameScene.homingTargets`) — sem isto o míssil voaria reto.
   */
  get temGuiado(): boolean {
    return tem(this.reg, 'WPN_009') || tem(this.reg, 'WPN_010');
  }

  /** "FLARE" aceso na HUD: o jogador pode soltar o próximo. */
  get flarePronto(): boolean {
    return this.lancadores.flareProntoAgora;
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

    this.lancadores.tick(dt);
    this.drone.tick(dt);
    this.eletrico.tick();
  }

  /**
   * Um projétil acertou um inimigo (depois do dano normal). `origem` diz quem soltou (`null` = o gatilho da nave) e
   * `angulo` (rad) é o rumo do projétil — a explosão do tiro é direcional (§5.1c).
   */
  aoAcertar(x: number, y: number, alvo: Inimigo, origem: OrigemProjetil | null, angulo: number): void {
    if (origem === 'missil' || origem === 'flare') {
      this.explosao.explodir(origem, x, y, null, alvo);
      return;
    }
    // O tiro do drone e o estilhaço só fazem o dano deles (o drone não copia as cartas da nave; o estilhaço não
    // explode de novo).
    if (origem) return;
    if (tem(this.reg, 'EFF_004') && alvo.active && Math.random() < 0.25) this.incendiar(alvo);
    this.eletrico.aoAcertar(alvo);
    if (tem(this.reg, 'EFF_001')) this.explosao.explodir('explosivo', x, y, Phaser.Math.RadToDeg(angulo), alvo);
  }

  /** Um projétil de carta acertou o CHEFÃO ou o golfinho: o míssil e o flare explodem ali também. */
  aoAcertarChefe(x: number, y: number, origem: OrigemProjetil | null): void {
    if (origem === 'missil' || origem === 'flare') this.explosao.explodir(origem, x, y, null, null);
  }

  /** Um inimigo morreu. */
  aoMorrer(e: Inimigo): void {
    const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > this.h.scene.time.now;
    if (queimando && tem(this.reg, 'EFF_006')) this.explosao.explodir('combustao', e.x, e.y, null, e);
    this.eletrico.aoMorrer(e);
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
    this.cascoVoltaEm = time + CASCO_RECARGA[Math.min(quantas(this.reg, 'DEF_002'), 1)] * 1000;
    const n = this.h.nave();
    this.h.fx.hit(n.x, n.y);
    this.h.scene.cameras.main.flash(70, 62, 224, 240);
    if (tem(this.reg, 'DEF_004')) this.explosao.explodir('reativo', n.x, n.y, null, null);
    return true;
  }

  // ─── O DANO DAS CARTAS ────────────────────────────────────────────────────────────────────────

  private incendiar(e: Inimigo): void {
    if (!e.active) return;
    e.setData('queimaAte', this.h.scene.time.now + QUEIMA_MS);
    e.setTint(COR_QUEIMANDO);
  }

  private ferir(e: Inimigo, dano: number): void {
    if (!e.active) return;
    const hp = (e.getData('hp') as number) - dano;
    e.setData('hp', hp);
    if (hp <= 0) this.h.matar(e);
  }
}
