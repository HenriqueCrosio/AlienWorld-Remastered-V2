import Phaser from 'phaser';
import { mapaDoControle, mapaDoTeclado } from '../aplicarPreferencias';
import { aoConectar, aoMudarAparelho, aparelhoAtivo, familiaDoControle } from './controle';
import { BOTAO, rotuloDaTecla, rotuloDoBotao, type AcaoRemap } from './mapas';

/**
 * THE HINTS ON SCREEN FOLLOW THE DEVICE IN USE (14/11, block M2 — spec §3.2): touched the controller, "ESPAÇO
 * continua" becomes "A continua"; touched the keyboard, it goes back. The button names follow the family of the
 * controller (Xbox or PlayStation).
 */
const noControle = (): boolean => aparelhoAtivo() === 'controle';
const botao = (i: number): string => rotuloDoBotao(i, familiaDoControle());

/** The key (or button) of an action of the ship: "ESPAÇO", "RT". */
export const dicaDaAcao = (acao: AcaoRemap): string => (noControle() ? botao(mapaDoControle()[acao]) : rotuloDaTecla(mapaDoTeclado()[acao]));

/** The fixed keys of the menus. `tiro` = the screens where the fire key is the one that confirms (the scoreboards). */
export const DICA = {
  ok: (): string => (noControle() ? botao(BOTAO.A) : 'ENTER'),
  tiro: (): string => (noControle() ? botao(BOTAO.A) : rotuloDaTecla(mapaDoTeclado().tiro)),
  voltar: (): string => (noControle() ? botao(BOTAO.B) : 'ESC'),
  pausa: (): string => (noControle() ? botao(BOTAO.START) : 'ESC'),
  apagar: (): string => (noControle() ? botao(BOTAO.B) : 'BACKSPACE'),
  abas: (): string => (noControle() ? `${botao(BOTAO.LB)}  ${botao(BOTAO.RB)}` : 'Q  E'),
} as const;

/**
 * Keeps a text of the scene equal to `f()`: now, and again whenever the device in use changes or the controller comes
 * or goes. Stops when the scene shuts down.
 */
export function dicaViva(scene: Phaser.Scene, texto: { setText(s: string): unknown; active?: boolean }, f: () => string): void {
  const por = (): void => {
    if (texto.active !== false) texto.setText(f());
  };
  por();
  const soltas = [aoMudarAparelho(por), aoConectar(por)];
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => soltas.forEach((s) => s()));
}
