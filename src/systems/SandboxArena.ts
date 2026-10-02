import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';
import { INIMIGOS, type ConfigSandbox } from '../sandbox/config.ts';
import type { EnemyKind, EnemySystem } from './EnemySystem';
import type { Medidas } from './Medidas';

/** A primeira onda sai 1s depois do JOGAR; cada onda se espalha em 1,5s (para não nascer todo mundo no mesmo ponto). */
const PRIMEIRA_MS = 1000;
const ESPALHA_MS = 1500;
const MARGEM_Y = 24;
const PAINEL_MS = 250;

interface Onda {
  n: number;
  inicio: number;
  esperados: number;
  membros: Phaser.GameObjects.GameObject[];
  fechada: boolean;
}

/**
 * A ARENA DO SANDBOX (spec `2026-10-02-sandbox-dev-design.md` §3–4): solta as ondas da montagem (pela direita,
 * espalhadas na altura, escalonadas; repetindo no intervalo ou uma só), as teclas de dev (N onda agora, X limpar,
 * I invulnerável, M medidas) e o painel de medidas no canto da tela. Mede quanto cada onda levou para sumir.
 */
export class SandboxArena {
  invulneravel = false;
  private proxima: number;
  private contador = 0;
  private readonly ondas: Onda[] = [];
  private readonly painel: HTMLDivElement;
  private proximoPainel = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cfg: ConfigSandbox,
    private readonly enemies: EnemySystem,
    private readonly medidas: Medidas,
  ) {
    this.proxima = this.total > 0 ? scene.time.now + PRIMEIRA_MS : Infinity;

    const kb = scene.input.keyboard!;
    kb.on('keydown-N', () => this.onda());
    kb.on('keydown-X', () => this.limpar());
    kb.on('keydown-I', () => (this.invulneravel = !this.invulneravel));
    kb.on('keydown-M', () => (this.painel.hidden = !this.painel.hidden));

    this.painel = document.createElement('div');
    this.painel.id = 'sandbox-medidas';
    document.getElementById('sandbox-medidas')?.remove();
    document.body.appendChild(this.painel);
    this.painel.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).dataset.acao === 'copiar') void this.copiar();
    });
    scene.events.once('shutdown', () => this.painel.remove());
  }

  /** Quantos inimigos por onda, somados. */
  private get total(): number {
    return INIMIGOS.reduce((s, t) => s + this.cfg.inimigos[t], 0);
  }

  tick(agora: number): void {
    if (agora >= this.proxima) {
      this.onda();
      this.proxima = this.cfg.repetir ? agora + this.cfg.intervalo * 1000 : Infinity;
    }
    // A ONDA FECHA quando todos os membros já nasceram e sumiram (mortos ou escapados).
    for (const o of this.ondas) {
      if (o.fechada || o.membros.length < o.esperados || o.membros.some((m) => m.active)) continue;
      o.fechada = true;
      this.medidas.onda(o.n, agora - o.inicio, o.membros.filter((m) => !this.medidas.foiAbatido(m)).length);
    }
    if (agora >= this.proximoPainel) {
      this.proximoPainel = agora + PAINEL_MS;
      this.painel.innerHTML = `${this.medidas.painel(this.contador)}${this.invulneravel ? '<br><b>INVULNERÁVEL</b>' : ''}<br><button data-acao="copiar">copiar medidas</button>`;
    }
  }

  /** Uma onda: cada tipo na quantidade da montagem, espalhados na altura e no tempo. */
  onda(): void {
    if (!this.total) return;
    const o: Onda = { n: ++this.contador, inicio: this.scene.time.now, esperados: this.total, membros: [], fechada: false };
    this.ondas.push(o);
    for (const tipo of INIMIGOS) {
      const n = this.cfg.inimigos[tipo];
      for (let i = 0; i < n; i++) {
        const y = MARGEM_Y + ((i + 0.5) / n) * (GAME_HEIGHT - 2 * MARGEM_Y) + Phaser.Math.Between(-6, 6);
        this.scene.time.delayedCall(Phaser.Math.Between(0, ESPALHA_MS), () => {
          this.enemies.spawn(tipo as EnemyKind, y);
          const filhos = this.enemies.enemies.getChildren();
          o.membros.push(filhos[filhos.length - 1]);
        });
      }
    }
  }

  /** X: limpa a tela — inimigos e tiros deles somem (sem pontos, sem explosão, sem contar abate). */
  private limpar(): void {
    for (const e of [...this.enemies.enemies.getChildren()]) e.destroy();
    for (const b of [...this.enemies.enemyBullets.getChildren()] as Phaser.Physics.Arcade.Sprite[]) {
      if (b.active) this.enemies.release(b);
    }
  }

  private async copiar(): Promise<void> {
    const texto = JSON.stringify({ montagem: this.cfg, medidas: this.medidas.resumo() }, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      console.info('[sandbox] medidas:\n' + texto);
    }
  }
}
