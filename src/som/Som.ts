import { AO_FUNDO, montarAcustica, type Acustica, type Lugar } from './acustica.ts';
import { SONS, type DefSom } from './catalogoSons.ts';
import { LASTRO, energiaDepois, ganhoDaCamada, ganhoDoLastro, type Camada, type Volumes } from './mixagem.ts';
import { PESO, decidir, sortearVariacao, type VozAtiva } from './vozes.ts';

/**
 * THE SOUND-EFFECTS PLAYER (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.1). Every effect of
 * the game passes here; the soundtrack stays in `Music`. Our own Web Audio graph on Phaser's context:
 *
 *   voice (buffer → gain → pan [→ background low-pass]) → layer bus ─┬→ acoustics → duck → out → Phaser destination
 *                                                   (interface bus) ─┴──────────────────────→ out
 *
 * (the action bus goes through one more gain first — the SHIP LOST silence.) Before the browser unlocks the audio,
 * `tocar` drops the sound (a late shot is worse than none) and `laco` waits. Without Web Audio it is silent, no errors.
 */
interface Gerente {
  context?: AudioContext;
  destination?: AudioNode;
}
interface CacheAudio {
  get(chave: string): unknown;
}
export interface Laco {
  volume(v: number, ms?: number): void;
  parar(ms?: number): void;
}
export interface DiagnosticoSom {
  iniciado: boolean;
  pronto: boolean;
  estado: string;
  lugar: Lugar;
  vozes: string[];
  recusadas: number;
  ganhos: Record<Camada, number>;
  abafo: number;
  acaoMuda: number;
  /** How many catalogue sounds have a decoded buffer (of how many). */
  carregados: [number, number];
  /** Every name that started playing since the page opened, in order (the tests read it). */
  tocados: string[];
  /** The LASTRO now: its energy and whether its loop is playing. */
  lastro: { energia: number; tocando: boolean };
}
/** The shared rumble under the chains (`mixagem.ts` LASTRO). */
export const NOME_LASTRO = 'explosao.lastro';
type Voz = VozAtiva & { fonte: AudioBufferSourceNode; ganho: GainNode; ponte: boolean };

export const chaveSom = (nome: string): string => `sfx:${nome}`;
const LARGURA_TELA = 384;
const PAN_MAX = 0.4;
const CAMADAS: Camada[] = ['acao', 'interface', 'ambiente', 'motor'];

/**
 * Sets an AudioParam: at once when `ms <= 0`, otherwise a LINEAR ramp of `ms`. ⚠️ Never `setTargetAtTime` on a bus:
 * Chrome computes it sample by sample ONLY while signal goes through the node, so on an idle bus the curve freezes and
 * the next sound arrives at the OLD level (measured 15/11: the first shot after SHIP LOST played at full volume). A
 * linear ramp is computed from the clock. All the old automation goes first (`cancelScheduledValues(0)`).
 */
/**
 * The target each param was last sent to. The diagnosis reads THIS: Chrome only renders the automation of a node that
 * has signal going through it, so `.value` of an idle bus can stay frozen at the old level (measured 15/11: the SHIP LOST
 * silence read 1 for seconds on an idle action bus, while the busy duck read its new level).
 */
const alvos = new WeakMap<AudioParam, number>();
const alvoDe = (p: AudioParam | undefined): number => (p ? (alvos.get(p) ?? p.value) : 0);

function rumo(p: AudioParam, v: number, agora: number, ms: number): void {
  alvos.set(p, v);
  const daqui = p.value;
  p.cancelScheduledValues(0);
  if (ms <= 0) {
    p.setValueAtTime(v, agora);
    p.value = v;
  } else {
    p.setValueAtTime(daqui, agora);
    p.linearRampToValueAtTime(v, agora + ms / 1000);
  }
}

export class Som {
  /** The player's volumes (0–1): `aplicarPreferencias.ts` plugs them in. */
  static volumes: () => Volumes = () => ({ geral: 1, efeitos: 1, musica: 1 });

  private static ctx: AudioContext | null = null;
  private static cache: CacheAudio | null = null;
  private static barras = {} as Record<Camada, GainNode>;
  private static acaoMudaNo: GainNode | null = null;
  private static abafoNo: GainNode | null = null;
  private static ac: Acustica | null = null;
  private static lugarAtual: Lugar = 'atmosfera';
  private static ativas: Voz[] = [];
  private static ultimo = new Map<string, number>();
  private static extras = new Map<string, { def: DefSom; buffer: AudioBuffer }>();
  private static proxId = 1;
  private static recusadas = 0;
  private static tocados: string[] = [];
  private static energia = 0;
  private static energiaEm = 0;
  private static lastroLaco: Laco | null = null;
  private static lastroTimer: ReturnType<typeof setInterval> | null = null;
  private static semente = 20261115;
  private static rnd = (): number => (Som.semente = (Math.imul(Som.semente, 1664525) + 1013904223) >>> 0) / 4294967296;

  /** Once, in the BootScene: the Phaser sound manager and the audio cache. */
  static iniciar(gerente: unknown, cache: CacheAudio): void {
    const g = gerente as Gerente;
    if (Som.ctx || !g.context || !g.destination) return;
    const ctx = g.context;
    Som.ctx = ctx;
    Som.cache = cache;
    const saida = ctx.createGain();
    saida.connect(g.destination);
    Som.abafoNo = ctx.createGain();
    Som.abafoNo.connect(saida);
    Som.ac = montarAcustica(ctx, Som.lugarAtual);
    Som.ac.saida.connect(Som.abafoNo);
    Som.acaoMudaNo = ctx.createGain();
    Som.acaoMudaNo.connect(Som.ac.entrada);
    for (const c of CAMADAS) {
      const b = ctx.createGain();
      if (c === 'interface') b.connect(saida);
      else if (c === 'acao') b.connect(Som.acaoMudaNo);
      else b.connect(Som.ac.entrada);
      Som.barras[c] = b;
    }
    Som.atualizarVolume();
    if (import.meta.env?.DEV) (window as unknown as { __som: typeof Som }).__som = Som;
  }

  static contexto(): AudioContext | null {
    return Som.ctx;
  }

  static pronto(): boolean {
    return Som.ctx?.state === 'running';
  }

  private static achar(nome: string): { def: DefSom; buffer: AudioBuffer } | null {
    const extra = Som.extras.get(nome);
    if (extra) return extra;
    const def = SONS[nome];
    const buffer = def ? Som.cache?.get(chaveSom(nome)) : undefined;
    return def && buffer instanceof AudioBuffer ? { def, buffer } : null;
  }

  /** A sound beside the catalogue (the tests, and DEV tries). */
  static registrar(nome: string, def: DefSom, buffer: AudioBuffer): void {
    Som.extras.set(nome, { def, buffer });
  }

  private static voz(nome: string, def: DefSom, buffer: AudioBuffer, ganhoExtra: number, x: number | undefined, laco: boolean): Voz | null {
    const ctx = Som.ctx!;
    const agora = ctx.currentTime;
    const peso = PESO[def.prioridade];
    const d = decidir(Som.ativas, nome, peso, def.vozes, agora, Som.ultimo.get(nome));
    if (d.tipo === 'recusar') {
      Som.recusadas++;
      return null;
    }
    if (d.tipo === 'trocar') Som.cortar(d.id);
    Som.ultimo.set(nome, agora);

    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = laco;
    const v = sortearVariacao(Som.rnd, def.variacao.tom, def.variacao.vol);
    fonte.playbackRate.value = v.taxa;
    const ganho = ctx.createGain();
    let nivel = def.volume * v.ganho * ganhoExtra;
    let ultimoNo: AudioNode = fonte.connect(ganho);
    if (x !== undefined) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, (x / LARGURA_TELA) * 2 - 1)) * PAN_MAX;
      ultimoNo = ultimoNo.connect(pan);
    }
    const corte = Math.min(def.passaBaixa ?? Infinity, Som.lugarAtual === 'cabine' ? (def.passaBaixaNoVacuo ?? Infinity) : Infinity);
    if (Number.isFinite(corte)) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = corte;
      lp.Q.value = 0.5;
      ultimoNo = ultimoNo.connect(lp);
    }
    if (def.plano === 'fundo' && def.camada !== 'interface') {
      const f = AO_FUNDO[Som.lugarAtual];
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = f.passaBaixa;
      nivel *= f.volume;
      ultimoNo = ultimoNo.connect(lp);
    }
    ganho.gain.value = Math.min(1, nivel);
    ultimoNo.connect(Som.barras[def.camada]);
    const voz: Voz = { id: Som.proxId++, nome, peso, inicio: agora, fonte, ganho, ponte: !!def.ponte };
    fonte.onended = () => {
      Som.ativas = Som.ativas.filter((a) => a !== voz);
      ganho.disconnect();
    };
    Som.ativas.push(voz);
    if (Som.tocados.length < 4000) Som.tocados.push(nome);
    fonte.start();
    return voz;
  }

  private static cortar(id: number): void {
    const v = Som.ativas.find((a) => a.id === id);
    if (!v || !Som.ctx) return;
    Som.ativas = Som.ativas.filter((a) => a !== v);
    rumo(v.ganho.gain, 0, Som.ctx.currentTime, 30);
    try {
      v.fonte.stop(Som.ctx.currentTime + 0.05);
    } catch {
      /* already stopped */
    }
  }

  /**
   * A one-shot. `x` = screen x (0–384) → a gentle pan; `forca` (0–1) scales the volume; `fracao` (0–1) plays only that
   * part of it, faded out over its last 80 ms (the TERMINUS arrival that grows with the burst).
   */
  static tocar(nome: string, op: { x?: number; forca?: number; fracao?: number } = {}): void {
    if (!Som.pronto()) return;
    const s = Som.achar(nome);
    if (!s) return;
    const v = Som.voz(nome, s.def, s.buffer, op.forca ?? 1, op.x, false);
    if (v && s.def.lastro) Som.alimentarLastro(s.def.lastro * (op.forca ?? 1));
    if (v && op.fracao !== undefined && op.fracao < 1 && Som.ctx) {
      const fim = Som.ctx.currentTime + Math.max(0.1, (s.buffer.duration / v.fonte.playbackRate.value) * op.fracao);
      v.ganho.gain.setValueAtTime(v.ganho.gain.value, fim - 0.08);
      v.ganho.gain.linearRampToValueAtTime(0, fim);
      try {
        v.fonte.stop(fim + 0.02);
      } catch {
        /* already stopped */
      }
    }
  }

  /** Pours energy into the LASTRO (an explosion, or a scene composing its own chain) and starts its loop if needed. */
  static alimentarLastro(e: number): void {
    const ctx = Som.ctx;
    if (!ctx || !Som.pronto()) return;
    const agora = ctx.currentTime;
    Som.energia = energiaDepois(Som.energia, agora - Som.energiaEm) + e;
    Som.energiaEm = agora;
    if (!Som.lastroLaco && Som.energia >= LASTRO.liga && Som.achar(NOME_LASTRO)) {
      Som.lastroLaco = Som.laco(NOME_LASTRO, 0);
      if (Som.lastroTimer) clearInterval(Som.lastroTimer);
      Som.lastroTimer = setInterval(() => Som.seguirLastro(), 100);
    }
    Som.seguirLastro();
  }

  /** The loop follows the draining energy; under the floor it fades out and stops. */
  private static seguirLastro(): void {
    if (!Som.ctx || !Som.lastroLaco) return;
    const e = energiaDepois(Som.energia, Som.ctx.currentTime - Som.energiaEm);
    if (e < LASTRO.desliga) {
      Som.lastroLaco.parar(800);
      Som.lastroLaco = null;
      if (Som.lastroTimer) clearInterval(Som.lastroTimer);
      Som.lastroTimer = null;
      Som.energia = 0;
      return;
    }
    Som.lastroLaco.volume(ganhoDoLastro(e), 150);
  }

  /** Is a sound playing right now? */
  static tocando(nome: string): boolean {
    return Som.ativas.some((v) => v.nome === nome);
  }

  /** The place the world sounds in now. */
  static lugarAgora(): Lugar {
    return Som.lugarAtual;
  }

  /** A loop (the engine, the ambience). `inicial` = its first level (0 = silent until `volume`). Before the unlock it
   *  waits; `parar` before it starts cancels it. */
  static laco(nome: string, inicial = 1): Laco | null {
    const ctx = Som.ctx;
    const s = Som.achar(nome);
    if (!ctx || !s) return null;
    let voz: Voz | null = null;
    let alvo = inicial;
    let cancelado = false;
    const comecar = (): void => {
      if (cancelado || voz) return;
      voz = Som.voz(nome, s.def, s.buffer, alvo, undefined, true);
    };
    if (Som.pronto()) comecar();
    else {
      const espera = (): void => {
        if (ctx.state !== 'running') return;
        ctx.removeEventListener('statechange', espera);
        comecar();
      };
      ctx.addEventListener('statechange', espera);
    }
    return {
      volume(v: number, ms = 300): void {
        alvo = v;
        if (voz) rumo(voz.ganho.gain, Math.min(1, s.def.volume * v), ctx.currentTime, ms);
      },
      parar(ms = 400): void {
        cancelado = true;
        if (!voz) return;
        rumo(voz.ganho.gain, 0, ctx.currentTime, ms);
        try {
          voz.fonte.stop(ctx.currentTime + ms / 1000 + 0.05);
        } catch {
          /* already stopped by a scene change */
        }
      },
    };
  }

  /** The preferences changed: each layer bus to its new gain at once. */
  static atualizarVolume(): void {
    if (!Som.ctx) return;
    const v = Som.volumes();
    for (const c of CAMADAS) {
      const b = Som.barras[c];
      if (b) rumo(b.gain, ganhoDaCamada(c, v), Som.ctx.currentTime, 0);
    }
  }

  /** Ducks the world to `k` (the pause: the music's factor) or restores it (1); `calarAcao` = SHIP LOST. */
  static abafar(k: number, ms: number, calarAcao = false): void {
    if (!Som.ctx || !Som.abafoNo || !Som.acaoMudaNo) return;
    const t = Som.ctx.currentTime;
    rumo(Som.abafoNo.gain, k, t, ms);
    rumo(Som.acaoMudaNo.gain, calarAcao ? 0 : 1, t, ms);
  }

  /**
   * A SCENE CHANGE (15/11, his bug: *"o som da explosão maior perde o efeito do espaço e entra na F2 [...] o som da
   * cutscene não avança para a fase posterior"* — in NO scene change): every voice still sounding fades out in `ms`, the
   * LASTRO drains at once, and only then the new scene's place. The soundtrack is not touched (it is his, with its own
   * crossfade in `Music`). Every scene calls this first thing in `create`.
   */
  static trocarDeCena(l: Lugar, ms = 250): void {
    const ctx = Som.ctx;
    if (ctx) {
      const agora = ctx.currentTime;
      // (a `ponte` sound — only the F1 sonic boom — crosses on purpose, and keeps its place in the list)
      for (const v of Som.ativas) {
        if (v.ponte) continue;
        rumo(v.ganho.gain, 0, agora, ms);
        try {
          v.fonte.stop(agora + ms / 1000 + 0.03);
        } catch {
          /* already stopped */
        }
      }
      Som.ativas = Som.ativas.filter((v) => v.ponte);
      Som.ultimo.clear();
    }
    if (Som.lastroTimer) clearInterval(Som.lastroTimer);
    Som.lastroTimer = null;
    Som.lastroLaco = null;
    Som.energia = 0;
    Som.lugar(l, 0);
  }

  /** The place of the scene (spec §4). */
  static lugar(l: Lugar, ms = 1000): void {
    Som.lugarAtual = l;
    Som.ac?.mudar(l, ms);
  }

  /**
   * For the tests: the loudest sample (0–1) that passes the action's silence gain (after the SHIP LOST gate, before the
   * acoustics) during `ms`. The real signal, not the param.
   */
  static picoDaAcao(ms: number): Promise<number> {
    const ctx = Som.ctx;
    if (!ctx || !Som.acaoMudaNo) return Promise.resolve(0);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    Som.acaoMudaNo.connect(an);
    const buf = new Float32Array(an.fftSize);
    let pico = 0;
    const fim = performance.now() + ms;
    return new Promise((ok) => {
      const olha = (): void => {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) pico = Math.max(pico, Math.abs(v));
        if (performance.now() < fim) setTimeout(olha, 10);
        else {
          Som.acaoMudaNo?.disconnect(an);
          ok(pico);
        }
      };
      olha();
    });
  }

  static diagnostico(): DiagnosticoSom {
    const ganhos = {} as Record<Camada, number>;
    for (const c of CAMADAS) ganhos[c] = alvoDe(Som.barras[c]?.gain);
    return {
      iniciado: !!Som.ctx,
      pronto: Som.pronto(),
      estado: Som.ctx?.state ?? 'none',
      lugar: Som.lugarAtual,
      vozes: Som.ativas.map((a) => a.nome),
      recusadas: Som.recusadas,
      ganhos,
      abafo: Som.abafoNo ? alvoDe(Som.abafoNo.gain) : 1,
      acaoMuda: Som.acaoMudaNo ? alvoDe(Som.acaoMudaNo.gain) : 1,
      carregados: [Object.keys(SONS).filter((n) => Som.cache?.get(chaveSom(n)) instanceof AudioBuffer).length, Object.keys(SONS).length],
      tocados: [...Som.tocados],
      lastro: { energia: Som.ctx ? energiaDepois(Som.energia, Som.ctx.currentTime - Som.energiaEm) : 0, tocando: !!Som.lastroLaco },
    };
  }
}
