/**
 * THE EEL IN THE GAME (plan `2026-11-08-enguia-instalacao.md`, Task 10 and decision 13): the main thread's side of her.
 * It reads the approved PNGs from the loaded textures, hands them to the worker (`enguia.worker.ts`, which runs
 * `MotorEnguia`), and then, every game frame: sends the ship and the life's events when the worker is free and her next
 * step is due (`taxa`: 30 = a fixed 1/30 s grid, the approved video's; `auto` = whenever the worker is free), and puts
 * the answers on screen (`CamadaEnguia`). Between answers, the last one stands: the hit mask (`acerto`), the hazards
 * (`morde`) and where she is (`estado`).
 */
import type Phaser from 'phaser';
import { ARQUIVOS_ENGUIA } from './arquivos';
import { CamadaEnguia } from './camadaEnguia';
import { leitorDeTexturas } from './fonte';
import type { EstadoEnguia, Evento, InicioMotor } from './motor';
import { folga, type Forma } from './perigos';
import { PARTE_CABECA, PARTE_COBERTA, PARTE_CORPO } from './alvos';
import type { Img, Ponto } from './tipos';

export type Taxa = 30 | 'auto';

export interface OpcEmJogo {
  /** the oracle's script and dice (`?roteiro=maquete`: the side by side with the mock) */
  maquete: boolean;
  taxa: Taxa;
}

const W = 384, H = 216;

export class EnguiaEmJogo {
  pronta = false;
  erro: string | null = null;
  /** her fight has started (the fusion's lights) */
  ativa = false;
  estado: EstadoEnguia | null = null;
  perigos: Forma[] = [];
  /** her cost per step in the worker (ms), and how late the answers came (for the probes) */
  readonly tempos: { t: number; ms: number }[] = [];
  private readonly scene: Phaser.Scene;
  private readonly opc: OpcEmJogo;
  private readonly worker: Worker;
  private readonly camada: CamadaEnguia;
  private mascara: Uint8Array | null = null;
  private ocupado = false;
  private tJogo = 0;
  private tEnguia = 0;
  private passos = 0;
  private eventos: Evento[] = [];

  constructor(scene: Phaser.Scene, opc: OpcEmJogo) {
    this.scene = scene;
    this.opc = opc;
    this.camada = new CamadaEnguia(scene);
    this.camada.mostra(false);
    this.worker = new Worker(new URL('./enguia.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.recebe(e.data);
    this.worker.onerror = (e) => { this.erro = e.message; };
    this.ler = leitorDeTexturas(scene.textures);
    this.faltam = [...Object.keys(ARQUIVOS_ENGUIA), 'serpenteRomboLabio'];
  }

  // the approved PNGs, read from the loaded textures a few per game frame (all at once was a 0.8 s hitch at her
  // arrival) and handed over; the worker then builds her art (~1 s, off the game's thread)
  private readonly ler: ReturnType<typeof leitorDeTexturas>;
  private faltam: string[];
  private readonly imgs: Record<string, Img> = {};
  /** reads `porQuadro` more PNGs; the last one sends everything to the worker */
  carrega(porQuadro = 4): void {
    if (!this.faltam.length) return;
    for (const k of this.faltam.splice(0, porQuadro)) this.imgs[k] = this.ler(k);
    if (this.faltam.length) return;
    const { serpenteRomboLabio: labio, ...imgs } = this.imgs;
    const inicio: InicioMotor = { imgs, labio, maquete: this.opc.maquete };
    this.worker.postMessage({ tipo: 'inicio', inicio }, Object.values(this.imgs).map((i) => i.data.buffer as ArrayBuffer));
  }

  /** her fight starts now (t = 0: the fusion's pause) */
  comeca(): void {
    this.ativa = true;
    this.tJogo = 0;
    this.tEnguia = 0;
    this.passos = 0;
    this.camada.mostra(true);
  }

  /** her time now (s since the fusion's lights) */
  get t(): number {
    return this.estado?.t ?? 0;
  }

  /** a bite asked by her life (22 / 13 / 5) */
  mordida(pct: number): void {
    this.eventos.push({ tipo: 'mordida', pct });
  }
  /** her life reached 0 in the den */
  mata(): void {
    this.eventos.push({ tipo: 'mata' });
  }

  update(dt: number, nave: Ponto): void {
    if (!this.ativa || !this.pronta || this.ocupado) {
      if (this.ativa) this.tJogo += dt;
      return;
    }
    this.tJogo += dt;
    let t: number, passo: number;
    if (this.opc.taxa === 30) {
      const tk = this.passos / 30; // (the mock's own clock: t = k · (1/30))
      if (this.tJogo + 1e-6 < tk) return;
      t = tk;
      passo = 1 / 30;
    } else {
      t = this.tJogo;
      passo = this.passos === 0 ? 1 / 60 : Math.max(1 / 240, t - this.tEnguia);
    }
    this.tEnguia = t;
    this.passos++;
    this.ocupado = true;
    const eventos = this.eventos;
    this.eventos = [];
    this.worker.postMessage({ tipo: 'passo', pedido: { t, dt: passo, nave, eventos } });
  }

  private recebe(m: { tipo: string; [k: string]: unknown }): void {
    if (m.tipo === 'pronta') { this.pronta = true; return; }
    if (m.tipo === 'erro') { this.erro = m.erro as string; return; }
    if (m.tipo !== 'quadro') return;
    this.ocupado = false;
    this.estado = m.estado as EstadoEnguia;
    this.perigos = m.perigos as Forma[];
    this.mascara = m.mascara as Uint8Array;
    this.camada.recebe(m.caixa as { x0: number; y0: number; x1: number; y1: number }, m.cima as Uint8ClampedArray, m.luz as Uint8ClampedArray, m.baixo as Uint8ClampedArray);
    this.tempos.push({ t: this.estado.t, ms: m.ms as number });
    if (this.tempos.length > 6000) this.tempos.splice(0, 1000);
  }

  /** where a player shot's box lands on her drawing (the last frame shown): the head, the body, the lip over her */
  acerto(x0: number, y0: number, x1: number, y1: number): 'cabeca' | 'corpo' | 'casco' | null {
    const m = this.mascara;
    if (!m || !this.estado || this.estado.imune) return null;
    let corpo = false, casco = false;
    for (let Y = Math.max(0, Math.floor(y0)); Y < Math.min(H, Math.ceil(y1)); Y++)
      for (let X = Math.max(0, Math.floor(x0)); X < Math.min(W, Math.ceil(x1)); X++) {
        const v = m[Y * W + X];
        if (v === PARTE_CABECA) return 'cabeca';
        if (v === PARTE_CORPO) corpo = true;
        else if (v === PARTE_COBERTA) casco = true;
      }
    return corpo ? 'corpo' : casco ? 'casco' : null;
  }

  /** what hurts the ship's box now (the mock's hazards: her tube and head, the fire, the geysers, the Echo's blasts) */
  morde(esq: number, dir: number, topo: number, base: number): boolean {
    const c = { x: (esq + dir) / 2, y: (topo + base) / 2 }, hit = { w: dir - esq, h: base - topo };
    for (const f of this.perigos) if (folga(c, hit, f) < 0) return true;
    return false;
  }

  esconde(): void {
    this.camada.mostra(false);
  }

  destroy(): void {
    this.worker.terminate();
    this.camada.destroy();
  }

  /** (the probes) the scene this lives in */
  get cena(): Phaser.Scene {
    return this.scene;
  }
}
