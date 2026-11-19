import Phaser from 'phaser';
import { Som, rumo } from '../som/Som';
import {
  BOLSO, CONTEXTOS, FAIXAS, curvaEntra, ganhoDaFaixa, ganhoDoContexto, proximoDuck, reducaoDaTrilha,
  type ContextoTrilha, type Track,
} from '../som/trilha';

export type { Track };

interface Faixa {
  track: Track;
  el: HTMLAudioElement;
  fonte: MediaElementAudioSourceNode;
  ganho: GainNode;
  /** the browser let it play */
  tocando: boolean;
  /** the next lap already crossed in */
  sucedida: boolean;
  soltarEscutas: () => void;
}

const PASSO_MS = 40;
const PONTOS_DA_CURVA = 32;

/** An equal-power ramp of a track's gain: `entra` rises from silence, otherwise it falls from where it is. */
function cruzar(p: AudioParam, alvo: number, agora: number, ms: number, entra: boolean): void {
  const de = p.value;
  p.cancelScheduledValues(0);
  if (ms <= 0) {
    p.setValueAtTime(alvo, agora);
    return;
  }
  const curva = new Float32Array(PONTOS_DA_CURVA);
  for (let i = 0; i < PONTOS_DA_CURVA; i++) {
    const u = i / (PONTOS_DA_CURVA - 1);
    curva[i] = entra ? alvo * curvaEntra(u) : de * curvaEntra(1 - u);
  }
  p.setValueCurveAtTime(curva, agora, ms / 1000);
}

/**
 * THE SOUNDTRACK (18/11: his five tracks). Streamed from the files (four minutes decoded would take ~90 MB each), in its own
 * chain, beside the effects:
 *
 *   lap (element → crossfade gain) → pocket EQ → snapshot → duck → pause → player's volume → output
 *
 * How it sits in the mix is decided in `som/trilha.ts`. Browsers lock audio until the first gesture: `play` is safe to call
 * early, the track waits for the unlock.
 */
export class Music {
  /** The player's volume (general × music, 0–1): `aplicarPreferencias.ts` plugs it in. */
  static fator: () => number = () => 1;

  private static atual: Faixa | null = null;
  private static saindo: Faixa[] = [];
  private static contexto: ContextoTrilha = 'menu';
  private static duckDb = 0;
  private static entrada: GainNode | null = null;
  private static graves: BiquadFilterNode | null = null;
  private static presenca: BiquadFilterNode | null = null;
  private static contextoNo: GainNode | null = null;
  private static duckNo: GainNode | null = null;
  private static abafoNo: GainNode | null = null;
  /** The end of the chain (public: the probes tap it). */
  static saidaNo: GainNode | null = null;
  private static mundo: AnalyserNode | null = null;
  private static amostras = new Float32Array(2048);

  private static montar(): AudioContext | null {
    const ctx = Som.contexto();
    const destino = Som.destinoFinal();
    if (!ctx || !destino) return null;
    if (Music.entrada) return ctx;
    Music.entrada = ctx.createGain();
    Music.graves = ctx.createBiquadFilter();
    Music.graves.type = 'lowshelf';
    Music.graves.frequency.value = BOLSO.gravesHz;
    Music.presenca = ctx.createBiquadFilter();
    Music.presenca.type = 'peaking';
    Music.presenca.frequency.value = BOLSO.presencaHz;
    Music.presenca.Q.value = BOLSO.presencaQ;
    Music.contextoNo = ctx.createGain();
    Music.duckNo = ctx.createGain();
    Music.abafoNo = ctx.createGain();
    Music.saidaNo = ctx.createGain();
    Music.saidaNo.gain.value = Music.fator();
    Music.entrada.connect(Music.graves).connect(Music.presenca).connect(Music.contextoNo).connect(Music.duckNo).connect(Music.abafoNo).connect(Music.saidaNo).connect(destino);
    Music.mundo = Som.escutaDoMundo();
    Music.aplicarContexto(0);
    // the tab went to the background: Phaser suspends the context, and the elements wait with it
    ctx.addEventListener('statechange', () => {
      for (const f of [Music.atual, ...Music.saindo]) {
        if (!f?.tocando) continue;
        if (ctx.state === 'running') void f.el.play().catch(() => undefined);
        else f.el.pause();
      }
    });
    setInterval(() => Music.passo(PASSO_MS / 1000), PASSO_MS);
    if (import.meta.env?.DEV) (window as unknown as { __music: typeof Music }).__music = Music;
    return ctx;
  }

  private static aplicarContexto(ms: number): void {
    const ctx = Som.contexto();
    if (!ctx || !Music.contextoNo || !Music.graves || !Music.presenca) return;
    const c = CONTEXTOS[Music.contexto];
    rumo(Music.contextoNo.gain, ganhoDoContexto(Music.contexto), ctx.currentTime, ms);
    rumo(Music.graves.gain, c.graves, ctx.currentTime, ms);
    rumo(Music.presenca.gain, c.presenca, ctx.currentTime, ms);
  }

  /** Every 40 ms: the world pushes the track down, and a lap near its end hands over to the next one. */
  private static passo(dt: number): void {
    const ctx = Som.contexto();
    if (!ctx || ctx.state !== 'running' || !Music.duckNo) return;
    let rmsDb = -120;
    if (Music.mundo) {
      Music.mundo.getFloatTimeDomainData(Music.amostras);
      let e = 0;
      for (const v of Music.amostras) e += v * v;
      rmsDb = 10 * Math.log10(e / Music.amostras.length + 1e-12);
    }
    Music.duckDb = proximoDuck(Music.duckDb, reducaoDaTrilha(rmsDb, Som.cenarioSoando()), dt);
    rumo(Music.duckNo.gain, 10 ** (Music.duckDb / 20), ctx.currentTime, PASSO_MS);

    const f = Music.atual;
    if (f?.tocando && !f.sucedida && Number.isFinite(f.el.duration)) {
      const cauda = FAIXAS[f.track].cauda;
      if (f.el.duration - f.el.currentTime <= cauda) {
        f.sucedida = true;
        Music.entrar(f.track, cauda * 1000);
      }
    }
  }

  /** A new lap of `track` takes over, crossing with whatever was playing. */
  private static entrar(track: Track, ms: number): void {
    const ctx = Music.montar();
    if (!ctx || !Music.entrada) return;
    const anterior = Music.atual;
    const el = new Audio();
    el.src = `audio/trilha/${FAIXAS[track].arquivo}.${el.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a'}`;
    el.preload = 'auto';
    const fonte = ctx.createMediaElementSource(el);
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    fonte.connect(ganho).connect(Music.entrada);
    const f: Faixa = { track, el, fonte, ganho, tocando: false, sucedida: false, soltarEscutas: () => undefined };
    // (the browser may refuse to play before the first gesture: it tries again on each of the next ones)
    const tentar = (): void => {
      if (f.tocando || ctx.state !== 'running' || (Music.atual !== f && !Music.saindo.includes(f))) return;
      el.play().then(() => {
        if (f.tocando || (Music.atual !== f && !Music.saindo.includes(f))) return;
        f.tocando = true;
        f.soltarEscutas();
        cruzar(ganho.gain, ganhoDaFaixa(track), ctx.currentTime, ms, true);
        // the bed yields to the music as it comes in (spec §10.11)
        Som.musicaSoando(1, ms);
      }).catch(() => undefined);
    };
    f.soltarEscutas = (): void => {
      ctx.removeEventListener('statechange', tentar);
      window.removeEventListener('pointerdown', tentar);
      window.removeEventListener('keydown', tentar);
    };
    ctx.addEventListener('statechange', tentar);
    window.addEventListener('pointerdown', tentar);
    window.addEventListener('keydown', tentar);
    // a lap that ends without a successor (a timer held back in the background) starts over
    el.addEventListener('ended', () => {
      if (Music.atual === f && !f.sucedida) {
        f.sucedida = true;
        Music.entrar(track, 400);
      }
    });
    Music.atual = f;
    if (anterior) Music.sair(anterior, ms);
    tentar();
  }

  /** A lap fades out and lets go of its element. */
  private static sair(f: Faixa, ms: number): void {
    const ctx = Som.contexto();
    f.soltarEscutas();
    Music.saindo.push(f);
    if (ctx && f.tocando) cruzar(f.ganho.gain, 0, ctx.currentTime, ms, false);
    setTimeout(() => {
      Music.saindo = Music.saindo.filter((x) => x !== f);
      f.el.pause();
      f.el.removeAttribute('src');
      f.el.load();
      f.fonte.disconnect();
      f.ganho.disconnect();
    }, ms + 80);
  }

  /** The preference changed: the track goes to the new level at once, without restarting. */
  static atualizarVolume(): void {
    const ctx = Som.contexto();
    if (ctx && Music.saidaNo) rumo(Music.saidaNo.gain, Music.fator(), ctx.currentTime, 0);
  }

  /** Ducks the track to `k` of its level (the pause: 0.4) or restores it (1), in `ms`. */
  static abafar(_scene: Phaser.Scene, k: number, ms: number): void {
    const ctx = Music.montar();
    if (ctx && Music.abafoNo) rumo(Music.abafoNo.gain, k, ctx.currentTime, ms);
  }

  /**
   * The track of a place. The same track already playing goes on untouched: it only takes the place's level. The level
   * is the menu's for the menus' tracks and the stage's for the others, unless `situacao` says (19/11: the closing theme
   * comes in inside the final cutscene, at the scenes' level).
   */
  static play(_scene: Phaser.Scene, key: Track, fadeMs = 800, situacao?: ContextoTrilha): void {
    if (!Music.montar()) return;
    Music.situacao(situacao ?? (key === 'menu' || key === 'final' ? 'menu' : 'fase'));
    if (Music.atual?.track !== key) Music.entrar(key, fadeMs);
  }

  /** The situation changed (a cutscene, the results): the same track, at that situation's level. */
  static situacao(c: ContextoTrilha, ms = 900): void {
    if (Music.contexto === c) return;
    Music.contexto = c;
    Music.aplicarContexto(ms);
  }

  static stop(_scene: Phaser.Scene, fadeMs = 500): void {
    const f = Music.atual;
    if (!f) return;
    Music.atual = null;
    Music.sair(f, fadeMs);
    // no track sounding: the bed and the engine back to where he approved them, as the track leaves
    Som.musicaSoando(0, fadeMs);
  }

  /** The track playing now (or fading in), `null` with none. */
  static faixaAtual(): Track | null {
    return Music.atual?.track ?? null;
  }

  /** For the tests. */
  static diagnostico(): { faixa: Track | null; tocando: boolean; tempo: number; contexto: ContextoTrilha; duckDb: number; voltas: number } {
    return {
      faixa: Music.atual?.track ?? null,
      tocando: !!Music.atual?.tocando && !Music.atual.el.paused,
      tempo: Music.atual?.el.currentTime ?? 0,
      contexto: Music.contexto,
      duckDb: Music.duckDb,
      voltas: Music.saindo.length,
    };
  }
}
