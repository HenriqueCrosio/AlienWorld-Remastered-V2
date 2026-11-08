/**
 * THE EEL'S WORKER (plan `2026-11-08-enguia-instalacao.md`, decision 13): `MotorEnguia` off the game's thread. It gets
 * the approved PNGs once (`inicio`), then one `passo` per step of hers; it answers with the drawn box of each canvas
 * (cropped, transferred), the hit mask, the hazards and where she stands.
 */
import { MotorEnguia, type InicioMotor, type PedidoPasso } from './motor.ts';

interface Contexto {
  postMessage(m: unknown, t?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
}
const ctx = self as unknown as Contexto;
let motor: MotorEnguia | null = null;

function recorta(buf: Uint8ClampedArray, c: { x0: number; y0: number; x1: number; y1: number }, W: number): Uint8ClampedArray {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, out = new Uint8ClampedArray(Math.max(0, w * h * 4));
  for (let y = 0; y < h; y++) out.set(buf.subarray(((c.y0 + y) * W + c.x0) * 4, ((c.y0 + y) * W + c.x1 + 1) * 4), y * w * 4);
  return out;
}

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data as { tipo: 'inicio'; inicio: InicioMotor } | { tipo: 'passo'; pedido: PedidoPasso };
  if (m.tipo === 'inicio') {
    const a = performance.now();
    try {
      motor = new MotorEnguia(m.inicio);
      ctx.postMessage({ tipo: 'pronta', ms: performance.now() - a });
    } catch (err) {
      ctx.postMessage({ tipo: 'erro', erro: String(err) });
    }
    return;
  }
  if (m.tipo === 'passo' && motor) {
    let r: ReturnType<MotorEnguia['passo']>;
    try {
      r = motor.passo(m.pedido);
    } catch (err) {
      ctx.postMessage({ tipo: 'erro', erro: `${String(err)}\n${(err as Error).stack ?? ''}` });
      return;
    }
    const c = r.caixa, vazio = c.x1 < c.x0;
    const cima = vazio ? new Uint8ClampedArray(0) : recorta(r.cima, c, 384);
    const baixo = vazio ? new Uint8ClampedArray(0) : recorta(r.baixo, c, 384);
    const luz = vazio ? new Uint8ClampedArray(0) : recorta(r.luz, c, 384);
    const mascara = r.mascara.slice();
    ctx.postMessage({ tipo: 'quadro', estado: r.estado, caixa: c, cima, baixo, luz, mascara, perigos: r.perigos, ms: r.ms },
      [cima.buffer, baixo.buffer, luz.buffer, mascara.buffer]);
  }
};
