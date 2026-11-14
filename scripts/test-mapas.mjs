// BLOCK M2 (14/11) — the maps of keys and buttons (spec `specs/2026-11-14-bloco-m2-controles-design.md` §4.1): the
// factory profiles, the swap, what the game keeps for itself, the controller family and the names on screen.
//   node scripts/test-mapas.mjs
import {
  ACOES_REMAP, BOTAO, CONTROLE_FABRICA, PROIBIDAS_TECLADO, PROIBIDOS_CONTROLE, TECLADO_FABRICA, botaoPermitido, familiaDe,
  mapaControleValido, mapaTecladoValido, perfilDe, rotuloDaTecla, rotuloDoBotao, teclaPermitida, trocar,
} from '../src/entrada/mapas.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const unicos = (m) => new Set(Object.values(m)).size === ACOES_REMAP.length;

ok(Object.values(TECLADO_FABRICA).every(unicos) && Object.values(CONTROLE_FABRICA).every(unicos), 'no factory profile gives one key to two actions');
ok(Object.values(TECLADO_FABRICA).every(mapaTecladoValido) && Object.values(CONTROLE_FABRICA).every(mapaControleValido), 'every factory profile is a valid map');
ok(TECLADO_FABRICA.padrao.tiro === 'SPACE' && TECLADO_FABRICA.classico.tiro === 'Z', 'the keyboard profiles of 03/10: SPACE and Z fire');
ok(CONTROLE_FABRICA.moderno.tiro === BOTAO.RT && CONTROLE_FABRICA.moderno.missil === BOTAO.LT && CONTROLE_FABRICA.moderno.dash === BOTAO.A, 'MODERNO: fire on RT, missile on LT, dash on A');
ok(CONTROLE_FABRICA.arcade.tiro === BOTAO.A && CONTROLE_FABRICA.arcade.missil === BOTAO.RB && CONTROLE_FABRICA.arcade.flare === BOTAO.Y, 'ARCADE: fire on A, missile on RB, flare on Y');

// the swap
{
  const m = trocar(TECLADO_FABRICA.padrao, 'tiro', 'K');
  ok(m.tiro === 'K' && m.bomba === 'SHIFT' && TECLADO_FABRICA.padrao.tiro === 'SPACE', 'a free key: only that action changes (the factory map is untouched)');
  const t = trocar(TECLADO_FABRICA.padrao, 'tiro', 'E');
  ok(t.tiro === 'E' && t.dash === 'SPACE' && unicos(t), 'a key that was another action\'s: the two swap');
  ok(JSON.stringify(trocar(TECLADO_FABRICA.padrao, 'tiro', 'SPACE')) === JSON.stringify(TECLADO_FABRICA.padrao), 'the same key again changes nothing');
  const b = trocar(CONTROLE_FABRICA.moderno, 'bomba', BOTAO.RT);
  ok(b.bomba === BOTAO.RT && b.tiro === BOTAO.X && unicos(b), 'the same with buttons');
}

// which profile a map is
ok(perfilDe(TECLADO_FABRICA.classico, TECLADO_FABRICA) === 'classico' && perfilDe(CONTROLE_FABRICA.arcade, CONTROLE_FABRICA) === 'arcade', 'a factory map is recognised');
ok(perfilDe(trocar(TECLADO_FABRICA.padrao, 'tiro', 'K'), TECLADO_FABRICA) === 'personalizado', 'a changed map is PERSONALIZADO');
ok(perfilDe(trocar(trocar(TECLADO_FABRICA.padrao, 'tiro', 'K'), 'tiro', 'SPACE'), TECLADO_FABRICA) === 'padrao', 'changing it back makes it the factory profile again');

// what the game keeps
ok(PROIBIDAS_TECLADO.every((k) => !teclaPermitida(k)), 'the movement keys, ESC and ENTER cannot be given to an action');
ok(['CTRL', 'ALT', 'TAB', 'F5', 'F11', 'WINDOWS', 'CAPS_LOCK'].every((k) => !teclaPermitida(k)), 'nor CTRL, ALT, TAB or the F keys (the browser\'s own)');
ok(['Q', 'E', 'Z', 'SPACE', 'SHIFT', 'ONE', 'COMMA'].every(teclaPermitida), 'letters (Q and E too), digits, SPACE, SHIFT and punctuation can');
ok(PROIBIDOS_CONTROLE.every((b) => !botaoPermitido(b)) && [0, 1, 2, 3, 4, 5, 6, 7].every(botaoPermitido), 'START, the d-pad and the stick clicks are the game\'s; the 4 faces, the shoulders and the triggers are free');
ok(!botaoPermitido(-1) && !botaoPermitido(99) && !botaoPermitido(1.5), 'a button that does not exist is refused');
ok(!mapaTecladoValido({ ...TECLADO_FABRICA.padrao, tiro: 'W' }) && !mapaTecladoValido({ ...TECLADO_FABRICA.padrao, tiro: 'E' }) && !mapaTecladoValido(null) && !mapaTecladoValido({ tiro: 'K' }), 'a map with a forbidden key, a repeated key or a missing action is not valid');
ok(!mapaControleValido({ ...CONTROLE_FABRICA.moderno, tiro: BOTAO.START }) && !mapaControleValido({ ...CONTROLE_FABRICA.moderno, tiro: 'RT' }), 'the same for the controller');

// the names on screen
ok(rotuloDaTecla('SPACE') === 'ESPAÇO' && rotuloDaTecla('Z') === 'Z' && rotuloDaTecla('ONE') === '1', 'the keys by their names');
ok(familiaDe('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)') === 'xbox', 'an Xbox controller');
ok(familiaDe('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)') === 'ps' && familiaDe('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)') === 'ps', 'a PlayStation controller (by name or by Sony\'s vendor id)');
ok(familiaDe('Generic USB Joystick') === 'xbox' && familiaDe('') === 'xbox', 'an unknown controller uses the Xbox names');
ok(rotuloDoBotao(BOTAO.A, 'xbox') === 'A' && rotuloDoBotao(BOTAO.A, 'ps') === 'X' && rotuloDoBotao(BOTAO.RT, 'ps') === 'R2' && rotuloDoBotao(BOTAO.START, 'ps') === 'OPTIONS', 'the buttons by the names of each family');

console.log(falhas === 0 ? '\n✔ MAPS' : `\n✘ ${falhas} asserts failed`);
process.exitCode = falhas ? 1 : 0;
