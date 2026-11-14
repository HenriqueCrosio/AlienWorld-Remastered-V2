// BLOCK M1 (14/11) — the player's preferences (plan `plans/2026-11-14-bloco-m1-pausa-configuracoes.md` Task 1):
// defaults, limits, a broken record, the old keys seeding and being mirrored, one step of a line.
//   node scripts/test-preferencias.mjs
import {
  CHAVE_PREFERENCIAS, PADRAO, fatorEfeitos, fatorMusica, forcaClaroes, gravar, ler, mapaControleDe, mapaTecladoDe, mudar,
  remapear, restaurarControles,
} from '../src/preferencias.ts';
import { BOTAO, CONTROLE_FABRICA, TECLADO_FABRICA } from '../src/entrada/mapas.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const guarda = (ini = {}) => { const m = new Map(Object.entries(ini)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), m }; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

ok(igual(ler(guarda()), PADRAO), 'empty guard: the defaults');
ok(PADRAO.volume.geral === 10 && PADRAO.teclas === 'padrao' && PADRAO.reduzirClaroes === false && PADRAO.menu === 'amanhecer', 'the defaults are 10/10/10, padrao, flashes whole, dawn');

const velha = ler(guarda({ 'aw.teclas': 'classico', 'alienworld:menu': 'noite' }));
ok(velha.teclas === 'classico' && velha.menu === 'noite', 'the old keys seed the object when it does not exist yet');

{
  const g = guarda();
  const p = { ...PADRAO, volume: { geral: 7, musica: 3, efeitos: 0 }, teclas: 'classico', reduzirClaroes: true, menu: 'noite' };
  gravar(g, p);
  ok(igual(ler(g), p), 'gravar + ler give the same object back');
  ok(JSON.parse(g.m.get(CHAVE_PREFERENCIAS)).v === 2, 'one versioned object under one key');
  ok(g.m.get('aw.teclas') === 'classico', 'gravar mirrors the key profile to aw.teclas');
  ok(!g.m.has('alienworld:menu'), 'the menu key is NOT written before the first victory');
  const z = guarda({ 'alienworld:zerou': '1' });
  gravar(z, p);
  ok(z.m.get('alienworld:menu') === 'noite', 'after the first victory the menu choice is mirrored');
}

{
  ok(igual(ler(guarda({ [CHAVE_PREFERENCIAS]: '{' })), PADRAO), 'a broken JSON falls back to the defaults');
  ok(igual(ler(guarda({ [CHAVE_PREFERENCIAS]: '"texto"' })), PADRAO), 'a JSON that is not an object falls back too');
  const torta = ler(guarda({ [CHAVE_PREFERENCIAS]: JSON.stringify({ v: 1, volume: { geral: 99, musica: -3, efeitos: 'x' }, teclas: 'zzz', reduzirClaroes: 'sim', menu: 7 }) }));
  ok(torta.volume.geral === 10 && torta.volume.musica === 0 && torta.volume.efeitos === 10, 'volumes out of range go to the limit; a non-number to the default');
  ok(torta.teclas === 'padrao' && torta.reduzirClaroes === false && torta.menu === 'amanhecer', 'invalid fields fall back one by one');
  const quebra = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  let lancou = false;
  try { ler(quebra); gravar(quebra, PADRAO); mudar(quebra, PADRAO, 'teclas', 1); } catch { lancou = true; }
  ok(!lancou, 'a guard that refuses (private tab) never throws');
}

{
  const g = guarda();
  let p = ler(g);
  p = mudar(g, p, 'volume.musica', 1);
  ok(p.volume.musica === 10, 'volume: 10 + 1 stays 10');
  for (let i = 0; i < 12; i++) p = mudar(g, p, 'volume.musica', -1);
  ok(p.volume.musica === 0, 'volume: never below 0');
  p = mudar(g, p, 'volume.geral', -1);
  ok(p.volume.geral === 9 && ler(g).volume.geral === 9, 'mudar already records the new object');
  ok(mudar(g, p, 'teclas', 1).teclas === 'classico' && mudar(g, p, 'reduzirClaroes', 1).reduzirClaroes === true && mudar(g, p, 'menu', -1).menu === 'noite', 'the other lines toggle');
  ok(p.volume.geral === 9 && PADRAO.volume.geral === 10, 'mudar returns a NEW object (the old one and the defaults are untouched)');
}

ok(fatorMusica({ ...PADRAO, volume: { geral: 5, musica: 10, efeitos: 4 } }) === 0.5, 'the music factor = general × music');
ok(Math.abs(fatorEfeitos({ ...PADRAO, volume: { geral: 5, musica: 10, efeitos: 4 } }) - 0.2) < 1e-9, 'the effects factor = general × effects');
ok(forcaClaroes(PADRAO) === 1 && forcaClaroes({ ...PADRAO, reduzirClaroes: true }) === 0.5, 'reduce flashes = half strength');

// block M2: the custom maps, the controller profile, the vibration
{
  ok(PADRAO.controle === 'moderno' && PADRAO.vibracao === true && PADRAO.mapaTeclado === null && PADRAO.mapaControle === null, 'the new defaults: MODERNO, vibration on, no custom map');
  const v1 = ler(guarda({ [CHAVE_PREFERENCIAS]: JSON.stringify({ v: 1, volume: { geral: 6, musica: 4, efeitos: 2 }, teclas: 'classico', reduzirClaroes: true, menu: 'noite' }) }));
  ok(v1.v === 2 && v1.volume.geral === 6 && v1.teclas === 'classico' && v1.reduzirClaroes === true && v1.controle === 'moderno' && v1.vibracao === true, 'a v1 object (block M1) is read and completed with the new defaults');

  const g = guarda();
  let p = ler(g);
  ok(igual(mapaTecladoDe(p), TECLADO_FABRICA.padrao) && igual(mapaControleDe(p), CONTROLE_FABRICA.moderno), 'the maps in force are the factory ones');
  p = remapear(g, p, 'teclado', 'tiro', 'K');
  ok(p.teclas === 'personalizado' && p.mapaTeclado.tiro === 'K' && mapaTecladoDe(p).bomba === 'SHIFT', 'a remapped key makes the profile PERSONALIZADO');
  ok(!g.m.has('aw.teclas') && ler(g).mapaTeclado.tiro === 'K', 'recorded; the old key is not touched by a custom map');
  p = remapear(g, p, 'teclado', 'dash', 'K');
  ok(mapaTecladoDe(p).dash === 'K' && mapaTecladoDe(p).tiro === 'E', 'a key already in use swaps with its action');
  ok(remapear(g, p, 'teclado', 'tiro', 'W') === p && remapear(g, p, 'teclado', 'tiro', 'CTRL') === p, 'a forbidden key is refused (the same object back)');
  p = remapear(g, remapear(g, p, 'teclado', 'dash', 'E'), 'teclado', 'tiro', 'SPACE');
  ok(p.teclas === 'padrao' && p.mapaTeclado === null && g.m.get('aw.teclas') === 'padrao', 'a map changed back to a factory one IS that profile again');

  p = remapear(g, p, 'controle', 'bomba', BOTAO.RT);
  ok(p.controle === 'personalizado' && mapaControleDe(p).bomba === BOTAO.RT && mapaControleDe(p).tiro === BOTAO.X, 'the same for the controller, with the swap');
  ok(remapear(g, p, 'controle', 'tiro', BOTAO.START) === p, 'START is refused');
  ok(mudar(g, p, 'controle', 1).controle === 'moderno' && mudar(g, p, 'controle', -1).controle === 'arcade' && mudar(g, p, 'controle', 1).mapaControle === null, 'leaving PERSONALIZADO goes to a factory profile and drops the custom map');
  ok(mudar(g, PADRAO, 'controle', 1).controle === 'arcade' && mudar(g, PADRAO, 'vibracao', 1).vibracao === false, 'the controller profile and the vibration toggle');
  const r = restaurarControles(g, remapear(g, p, 'teclado', 'flare', 'G'));
  ok(r.teclas === 'padrao' && r.controle === 'moderno' && r.mapaTeclado === null && r.mapaControle === null, 'RESTORE puts both devices back');

  const torto = ler(guarda({ [CHAVE_PREFERENCIAS]: JSON.stringify({ v: 2, teclas: 'personalizado', mapaTeclado: { tiro: 'W', bomba: 'X', dash: 'C', flare: 'F', missil: 'V' }, controle: 'personalizado', mapaControle: { tiro: 0 } }) }));
  ok(torto.teclas === 'padrao' && torto.mapaTeclado === null && torto.controle === 'moderno' && torto.mapaControle === null, 'an invalid custom map falls back to the factory profile');
}

console.log(falhas === 0 ? '\n✔ PREFERENCES' : `\n✘ ${falhas} asserts failed`);
process.exitCode = falhas ? 1 : 0;
