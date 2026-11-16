/**
 * THE ACOUSTICS OF THE PLACE (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §4) — the sound
 * partner of the visual Atmosfera (GDD pillar 5: nothing goes raw). His words: *"tudo que é na atmosfera tem aquele som
 * mais abafado"*; in space the CABIN sound (dry); and THE DISTANCE DECIDES: what lives in the back layers, in the
 * vacuum, is almost silent (a dull thump felt through the hull). The profiles are data (tested in Node);
 * `montarAcustica` builds the Web Audio chain. The interface and the soundtrack never pass through here.
 */
export type Lugar = 'atmosfera' | 'caverna' | 'cabine' | 'interior' | 'agua';

export interface Perfil {
  /** Hz */
  passaAlta: number;
  /** Hz */
  passaBaixa: number;
  realce: { freq: number; ganhoDb: number };
  /** The generated tail: length (s), decay exponent, wet mix (0–1). */
  eco: { seg: number; decai: number; mistura: number };
}

/** The starting points; his ear tunes them on the sheets. */
export const PERFIS_SOM: Record<Lugar, Perfil> = {
  atmosfera: { passaAlta: 30, passaBaixa: 6000, realce: { freq: 180, ganhoDb: 2 }, eco: { seg: 1.8, decai: 3, mistura: 0.22 } },
  caverna: { passaAlta: 40, passaBaixa: 5000, realce: { freq: 400, ganhoDb: 1 }, eco: { seg: 1.2, decai: 2, mistura: 0.35 } },
  cabine: { passaAlta: 60, passaBaixa: 14000, realce: { freq: 2500, ganhoDb: 2 }, eco: { seg: 0.25, decai: 6, mistura: 0.06 } },
  interior: { passaAlta: 40, passaBaixa: 4500, realce: { freq: 300, ganhoDb: 2 }, eco: { seg: 1.4, decai: 2.5, mistura: 0.3 } },
  agua: { passaAlta: 30, passaBaixa: 800, realce: { freq: 120, ganhoDb: 3 }, eco: { seg: 1.0, decai: 2, mistura: 0.25 } },
};

/** A sound with `plano: 'fundo'`: its own low-pass and volume on top of the place. In space: almost nothing. */
export const AO_FUNDO: Record<Lugar, { passaBaixa: number; volume: number }> = {
  atmosfera: { passaBaixa: 2500, volume: 0.5 },
  caverna: { passaBaixa: 2000, volume: 0.5 },
  cabine: { passaBaixa: 150, volume: 0.25 },
  interior: { passaBaixa: 1800, volume: 0.5 },
  agua: { passaBaixa: 400, volume: 0.4 },
};

/**
 * His note (15/11): *"no espaço não se ouve bem ruídos de explosão, então as explosões que estão podem ficar mais
 * baixas"* — in the vacuum each blast is quieter and the LASTRO (the shared rumble, `mixagem.ts`) carries the chain.
 */
export const EXPLOSAO_NO_VACUO = 0.6;

/**
 * THE BOSSES IN THE VACUUM (16/11, him: *"tudo que for efeitos e som dos bosses do espaço F2 e F3 precisam do filtro de
 * espaço, som mais contido, como se tivesse num local 'fechado'"*). In the cabin place, every sound of `prioridade:
 * 'chefe'` (the Capitânia, the Serpente, the eel, a boss's end — the Aurora's last blast too) goes through a low-pass, a
 * little lower, and sends part of itself into a small CLOSED ROOM (a short dark tail): contained, not open.
 */
// (the room's mix is SMALL on purpose: the generated tail sums back — at 0.35 the Capitânia's shot came out LOUDER in
// the vacuum than in the air, measured; the rule is "contained", so the boss must come out lower)
export const CHEFE_NO_VACUO = { passaBaixa: 2200, volume: 0.7, sala: { seg: 0.6, decai: 4, mistura: 0.08 } } as const;
export const forcaNoLugar = (forca: number, l: Lugar): number => (l === 'cabine' ? forca * EXPLOSAO_NO_VACUO : forca);

/** The place a scene starts in. The cave (F1) and the chamber B water (F4) are switched by the scene itself. */
export function lugarDaCena(cena: string, fase?: number): Lugar {
  if (cena === 'Menu' || cena === 'Hangar') return 'atmosfera';
  if (cena === 'Game') return fase === 1 ? 'atmosfera' : fase === 4 ? 'interior' : 'cabine';
  return 'cabine';
}

/** A short stereo impulse (seeded noise with a decay) — the tail, without an impulse-response file. */
export function impulso(ctx: BaseAudioContext, seg: number, decai: number, semente = 1): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seg));
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  let s = semente >>> 0 || 1;
  const rnd = (): number => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, decai);
  }
  return b;
}

export interface Acustica {
  entrada: AudioNode;
  saida: AudioNode;
  lugar(): Lugar;
  /** Crosses to another place in `ms` (0 = at once). */
  mudar(l: Lugar, ms: number): void;
}

/** input → high-pass → peak → low-pass → (dry + tail) → output. */
export function montarAcustica(ctx: BaseAudioContext, inicial: Lugar): Acustica {
  const alta = ctx.createBiquadFilter();
  alta.type = 'highpass';
  const realce = ctx.createBiquadFilter();
  realce.type = 'peaking';
  realce.Q.value = 0.8;
  const baixa = ctx.createBiquadFilter();
  baixa.type = 'lowpass';
  baixa.Q.value = 0.5;
  const seco = ctx.createGain();
  const conv = ctx.createConvolver();
  const molhado = ctx.createGain();
  const saida = ctx.createGain();
  alta.connect(realce).connect(baixa);
  baixa.connect(seco).connect(saida);
  baixa.connect(conv).connect(molhado).connect(saida);

  let atual = inicial;
  let troca: ReturnType<typeof setTimeout> | null = null;
  // ⚠️ linear ramps, never setTargetAtTime: Chrome only advances that curve while signal flows (see `rumo` in Som.ts)
  const rampa = (param: AudioParam, v: number, seg: number): void => {
    const t = ctx.currentTime;
    const daqui = param.value;
    param.cancelScheduledValues(0);
    param.setValueAtTime(daqui, t);
    param.linearRampToValueAtTime(v, t + seg);
  };
  const filtros = (p: Perfil, seg: number): void => {
    rampa(alta.frequency, p.passaAlta, seg);
    rampa(realce.frequency, p.realce.freq, seg);
    rampa(realce.gain, p.realce.ganhoDb, seg);
    rampa(baixa.frequency, p.passaBaixa, seg);
  };
  const cauda = (p: Perfil): void => {
    conv.buffer = impulso(ctx, p.eco.seg, p.eco.decai, 7);
  };
  const ini = PERFIS_SOM[inicial];
  alta.frequency.value = ini.passaAlta;
  realce.frequency.value = ini.realce.freq;
  realce.gain.value = ini.realce.ganhoDb;
  baixa.frequency.value = ini.passaBaixa;
  molhado.gain.value = ini.eco.mistura;
  cauda(ini);

  return {
    entrada: alta,
    saida,
    lugar: () => atual,
    mudar(l: Lugar, ms: number): void {
      if (l === atual) return;
      atual = l;
      const p = PERFIS_SOM[l];
      if (troca) clearTimeout(troca);
      troca = null;
      if (ms <= 0) {
        const t = ctx.currentTime;
        for (const [param, v] of [[alta.frequency, p.passaAlta], [realce.frequency, p.realce.freq], [realce.gain, p.realce.ganhoDb], [baixa.frequency, p.passaBaixa], [molhado.gain, p.eco.mistura]] as const) {
          param.cancelScheduledValues(0);
          param.setValueAtTime(v, t);
          param.value = v;
        }
        cauda(p);
        return;
      }
      filtros(p, ms / 1000);
      // the tail cannot be crossfaded on one convolver: down, swap, up
      rampa(molhado.gain, 0, ms / 2000);
      troca = setTimeout(() => {
        cauda(p);
        rampa(molhado.gain, p.eco.mistura, ms / 2000);
        troca = null;
      }, ms / 2);
    },
  };
}
