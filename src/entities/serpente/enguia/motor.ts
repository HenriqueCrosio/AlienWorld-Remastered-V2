/**
 * THE EEL'S ENGINE (plan `2026-11-08-enguia-instalacao.md`, decision 13): everything of hers that costs — the fight
 * (`LutaEnguia`) and her frame (`quadro` into the game's canvases) — behind one message-shaped interface, so it runs in
 * a Web Worker (`enguia.worker.ts`) and the game's frame never waits for it. Pure (no DOM): Node runs it in the tests.
 *   new MotorEnguia(inicio) → builds the art from the approved PNGs, the fight
 *   passo(pedido)           → one step of hers at time t: the life's events, the fight, the frame → the canvases, the
 *                             hit mask, the hazards' shapes and where she stands
 */
import { AlvoLonas } from './alvos.ts';
import { carregaArte } from './arte.ts';
import { preparaDesenho, quadro } from './desenho.ts';
import { carregaGestos } from './gestos.ts';
import { LutaEnguia } from './luta.ts';
import { medidas } from './medidas.ts';
import { N } from './numeros.ts';
import type { Forma } from './perigos.ts';
import type { Img, Ponto } from './tipos.ts';

export interface InicioMotor {
  /** the approved PNGs as RGBA, by their Phaser keys (`arquivos.ts`) */
  imgs: Record<string, Img>;
  /** the breach lip's texture (`serpenteRomboLabio`) */
  labio: Img;
  /** the oracle's script and dice (`?roteiro=maquete`) */
  maquete: boolean;
}

export type Evento = { tipo: 'mordida'; pct: number } | { tipo: 'mata' };

export interface PedidoPasso {
  t: number;
  dt: number;
  nave: Ponto;
  eventos: Evento[];
}

export interface EstadoEnguia {
  t: number;
  trecho: string;
  cap: string;
  hab: string | null;
  imune: boolean;
  podeMorrer: boolean;
  morta: boolean;
  acabou: boolean;
  final: boolean;
  /** the skull's centre on screen (the bomb's aim, the boss' head target) */
  cabeca: Ponto;
  /** the living hull's bump over her (under the hull) or the breach's tremble before she breaks out */
  lombada: { x: number; amp: number; larg: number } | null;
  /** the crack behind her, as the mock draws it */
  fissuras: { de: number; ate: number; cura: number }[];
}

export interface RespostaPasso {
  estado: EstadoEnguia;
  cima: Uint8ClampedArray;
  baixo: Uint8ClampedArray;
  luz: Uint8ClampedArray;
  temLuz: boolean;
  /** the box drawn this step and the last one (what the canvases must take) */
  caixa: { x0: number; y0: number; x1: number; y1: number };
  /** 0 nothing, 1 body, 2 head, 3 hers under the lip */
  mascara: Uint8Array;
  /** what hurts the ship now (circles and rectangles: `perigos.ts` `folga`) */
  perigos: Forma[];
  /** her own cost this step (ms) */
  ms: number;
}

export class MotorEnguia {
  readonly luta: LutaEnguia;
  private readonly alvo = new AlvoLonas();
  private readonly D: ReturnType<typeof preparaDesenho>;

  constructor(inicio: InicioMotor) {
    const ler = (k: string): Img => {
      const v = inicio.imgs[k];
      if (!v) throw new Error(`enguia: falta a imagem ${k}`);
      return v;
    };
    const med = medidas(N, ler('enguiaCabeca'), ler('enguiaF1'));
    const arte = carregaArte(N, ler);
    const G = carregaGestos(ler, arte.dorsoCabeca);
    this.D = preparaDesenho(N, med, arte, { labio: inicio.labio });
    this.alvo.defineLabio(this.D.labioTela);
    this.luta = new LutaEnguia(med, G, this.D, inicio.maquete ? { sementes: { rnd: 20261107, sorte: 5 }, maquete: true } : {});
  }

  passo(p: PedidoPasso): RespostaPasso {
    const a = performance.now(), L = this.luta;
    for (const ev of p.eventos) {
      if (ev.tipo === 'mordida') L.pedeMordida(ev.pct, p.t);
      else L.mata(p.t);
    }
    L.antes(p.t, p.dt, p.nave);
    L.grava(p.nave.x, p.nave.y);
    L.depois(p.dt);
    this.alvo.limpa();
    const s = L.cena();
    quadro(this.D, s, this.alvo);
    // (what was drawn last step — now cleared — and what was drawn now)
    const caixa = uniao(this.alvo.caixa, this.alvo.sujoAgora);
    const C = s.pose.cabeca, tr = s.pose.e.trecho;
    let lombada: EstadoEnguia['lombada'] = null;
    if (s.lombada != null) lombada = { x: s.lombada, amp: N.geiser.lombada.amp, larg: N.geiser.lombada.larg };
    for (const g of s.sinais) {
      const k = Math.min(1, (s.t - g.t0) / (g.t1 - g.t0));
      lombada = { x: g.x, amp: 2.2 * k * (0.6 + 0.4 * Math.sin(s.t * 38)), larg: 34 };
    }
    return {
      estado: {
        t: p.t, trecho: tr.nome, cap: tr.cap, hab: tr.hab ?? null, imune: L.imune, podeMorrer: L.podeMorrer, morta: L.morta,
        acabou: L.acabou, final: L.final, cabeca: { x: (C.pescoco.x + C.focinho.x) / 2, y: (C.pescoco.y + C.focinho.y) / 2 },
        lombada, fissuras: s.fissuras,
      },
      cima: this.alvo.cima, baixo: this.alvo.baixo, luz: this.alvo.luz, temLuz: this.alvo.temLuz,
      caixa, mascara: this.alvo.mascara, perigos: L.agora.map((h) => h.forma), ms: performance.now() - a,
    };
  }
}

function uniao(a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }): { x0: number; y0: number; x1: number; y1: number } {
  if (a.x1 < a.x0) return { ...b };
  if (b.x1 < b.x0) return { ...a };
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}
