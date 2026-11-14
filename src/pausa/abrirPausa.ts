import Phaser from 'phaser';
import { aoConectar, aoQuadro, desceuBotao } from '../entrada/controle';
import { BOTAO } from '../entrada/mapas';
import { ehHD, jogoHD, jogoMundo } from '../uiHD';
import type { TipoPausa } from './numerosPausa';

/**
 * OPENING AND CLOSING THE PAUSE (14/11, block M1 — spec §4.3).
 *
 * The `Pausa` scene belongs to the WORLD game and runs over the paused scene — which may be a world scene (a stage, a
 * cutscene, the hangar) or the card table, which lives in the HD layer (another Phaser game listening to the same
 * window).
 *
 * ⚠️ TWO GAMES, ONE KEY PRESS. Each game keeps its own queue of key events and its own frame: the ESC that closes the
 * pause in the world game could be read again by the table in the HD game one frame later (reopening it), and the ESC
 * that opens it could be read by the new `Pausa` scene (closing it at once). Each open/close keeps the timestamp of
 * the event that caused it, and nothing older than that is accepted afterwards.
 */
export interface OpcoesPausa {
  tipo: TipoPausa;
  /** 'fase': start the stage again */
  reiniciar?: () => void;
  /** 'cutscene': skip ahead */
  pular?: () => void;
  /** leave to the main menu (every kind but 'menu') */
  sair?: () => void;
  /** false while the scene is leaving on its own (a death, a fade-out) */
  podeAbrir?: () => boolean;
  /** called after the window closed and the scene underneath is back (the menu re-reads the night/dawn choice) */
  aoFechar?: () => void;
}

export interface DadosPausa {
  alvo: Phaser.Scene;
  opts: OpcoesPausa;
  /** the timestamp of what opened it: older key events are not for the window */
  carimbo: number;
}

let aberta = false;
let fechouEm = -1;

export const pausaAberta = (): boolean => aberta;

/** Pauses `alvo` and runs the Pausa scene over it. No-op when one is already open or the scene says no. */
export function abrirPausa(alvo: Phaser.Scene, opts: OpcoesPausa, ev?: KeyboardEvent): void {
  if (aberta) return;
  const carimbo = ev?.timeStamp ?? performance.now();
  if (carimbo <= fechouEm) return;
  if (opts.podeAbrir && !opts.podeAbrir()) return;
  const mundo = ehHD(alvo) ? jogoMundo() : alvo.game;
  if (!mundo) return;
  // A CARD TABLE OPEN OVER A CUTSCENE: the cutscene keeps running under it and hears the same ESC. The table opens
  // the pause (it is the one that has to go quiet); the scene underneath stays out of it.
  const mesa = (jogoHD() ?? mundo).scene.getScene('Cartas') as Phaser.Scene | null;
  if (mesa && mesa !== alvo && mesa.scene.isActive()) return;
  aberta = true;
  // From the main menu the living painting keeps moving behind the window: only its keyboard goes quiet.
  if (opts.tipo === 'menu') {
    if (alvo.input.keyboard) alvo.input.keyboard.enabled = false;
  } else alvo.scene.pause();
  const dados: DadosPausa = { alvo, opts, carimbo };
  mundo.scene.run('Pausa', dados);
}

/** The Pausa scene calls this when it closes: gives the scene underneath back (keys released). */
export function devolverCena(dados: DadosPausa, carimbo: number): void {
  aberta = false;
  fechouEm = carimbo;
  const { alvo, opts } = dados;
  const kb = alvo.input?.keyboard;
  // ⚠️ RELEASE THE KEYS: the paused scene did not see the keyup of whoever let go of an arrow while paused, and the
  // ship would come back flying on its own (the lesson of the card table, `CartasEmJogo.abrirMesa`).
  kb?.resetKeys();
  if (opts.tipo === 'menu') {
    if (kb) kb.enabled = true;
  } else if (alvo.scene.isPaused()) alvo.scene.resume();
  opts.aoFechar?.();
}

/**
 * ESC opens the pause over `scene`, and so does the window losing focus or the tab being hidden. Everything is
 * unregistered when the scene shuts down.
 */
export function ligarPausa(scene: Phaser.Scene, opts: OpcoesPausa): void {
  const kb = scene.input.keyboard;
  // ONE EVENT, ONCE (the lesson of the card table, 03/10): Phaser reprocesses the key queue at every new event.
  const vistos = new WeakSet<KeyboardEvent>();
  const esc = (ev: KeyboardEvent): void => {
    if (ev.repeat || vistos.has(ev)) return;
    vistos.add(ev);
    abrirPausa(scene, opts, ev);
  };
  kb?.on('keydown-ESC', esc);
  const sozinha = (): void => {
    if (scene.scene.isActive()) abrirPausa(scene, opts);
  };
  const eventos = scene.game.events;
  eventos.on(Phaser.Core.Events.BLUR, sozinha);
  eventos.on(Phaser.Core.Events.HIDDEN, sozinha);
  // THE CONTROLLER (block M2): START pauses; and a controller that drops in the middle of the action pauses too.
  const soltarStart = aoQuadro(() => {
    if (desceuBotao(BOTAO.START) && scene.scene.isActive()) abrirPausa(scene, opts);
  });
  const soltarQueda = aoConectar((ligou) => {
    if (!ligou && scene.scene.isActive()) abrirPausa(scene, opts);
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    soltarStart();
    soltarQueda();
    kb?.off('keydown-ESC', esc);
    eventos.off(Phaser.Core.Events.BLUR, sozinha);
    eventos.off(Phaser.Core.Events.HIDDEN, sozinha);
  });
}
