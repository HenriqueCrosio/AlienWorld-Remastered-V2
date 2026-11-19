// BLOCK SOUND (15/11) — the pure rules of the sound effects (spec `specs/2026-11-15-bloco-som-design.md`):
// the mix (layers, the presence under the music), the voice rules, the places and the catalogue.
//   node scripts/test-som.mjs
import { existsSync, readFileSync } from 'node:fs';
import { AO_FUNDO, PERFIS_SOM, lugarDaCena } from '../src/som/acustica.ts';
import { NOME_SOM, SONS, validarCatalogo } from '../src/som/catalogoSons.ts';
import { BURACO, MESTRE, PISO_AMBIENTE, PISO_PRESENCA, buracoDoAmbiente, ganhoDaCamada, presenca } from '../src/som/mixagem.ts';
import { CONTEXTOS, DUCK, FAIXAS, abreEspaco, curvaEntra, proximoDuck, reducaoDaTrilha } from '../src/som/trilha.ts';
import { INTERVALO_MIN, PESO, TETO_GERAL, decidir, sortearVariacao } from '../src/som/vozes.ts';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const perto = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// ─── the mix ───
ok(presenca(0) === 1, 'presence: music at 0 → ambience full');
ok(perto(presenca(1), PISO_PRESENCA), 'presence: music full → the floor', presenca(1));
ok([0, 0.2, 0.5, 0.8, 1].every((m, i, a) => i === 0 || presenca(m) <= presenca(a[i - 1])), 'presence never rises with the music');
ok(presenca(-1) === 1 && perto(presenca(2), PISO_PRESENCA), 'presence clamps out-of-range input');
const v = { geral: 0.5, efeitos: 0.8, musica: 1 };
ok(perto(ganhoDaCamada('acao', v), 0.4), 'action = general × effects', ganhoDaCamada('acao', v));
ok(perto(ganhoDaCamada('interface', v), 0.4), 'interface = general × effects');
ok(perto(ganhoDaCamada('ambiente', v), 0.4 * PISO_AMBIENTE), 'ambience = general × effects × its own floor under the music');
ok(perto(ganhoDaCamada('motor', v), 0.4 * PISO_PRESENCA), 'engine = general × effects × its floor under the music');
// 19/11, the mix pass (spec §10.11): the real track arrived — the bed yields to it, the engine a little, and the hole follows the music
ok(PISO_AMBIENTE < PISO_PRESENCA && PISO_PRESENCA < 1 && PISO_AMBIENTE >= 0.4, 'the bed yields first (−6 dB), the engine less (−3 dB)', [PISO_AMBIENTE, PISO_PRESENCA]);
ok(buracoDoAmbiente(0) === 0 && buracoDoAmbiente(1) === BURACO.db && BURACO.db < 0 && buracoDoAmbiente(2) === BURACO.db, "the bed's hole: none without music, its depth with the music full");
ok(MESTRE.limiar === -1 && MESTRE.razao >= 20, 'the master holds the sum under −1 dBFS (EBU R128 / ASWG true-peak ceiling)');
ok(perto(ganhoDaCamada('motor', { ...v, musica: 0 }), 0.4), 'engine without music = full');
ok(ganhoDaCamada('acao', { geral: 0, efeitos: 1, musica: 1 }) === 0, 'GERAL 0 silences everything');
ok(ganhoDaCamada('ambiente', { geral: 1, efeitos: 0, musica: 0 }) === 0, 'EFEITOS 0 silences the ambience too');

// ─── the voices ───
const voz = (id, nome, peso, inicio) => ({ id, nome, peso, inicio });
ok(decidir([], 'a', PESO.jogador, 4, 1, undefined).tipo === 'tocar', 'empty: plays');
ok(decidir([], 'a', PESO.jogador, 4, 1, 1 - INTERVALO_MIN / 2).tipo === 'recusar', 'the same sound inside the min interval is refused');
ok(decidir([], 'a', PESO.jogador, 4, 1, 1 - INTERVALO_MIN * 2).tipo === 'tocar', 'after the interval it plays');
{
  const ativas = [voz(1, 'a', 3, 0.1), voz(2, 'a', 3, 0.3)];
  const d = decidir(ativas, 'a', 3, 2, 1, 0.3);
  ok(d.tipo === 'trocar' && d.id === 1, 'the per-sound cap replaces the OLDEST of the same sound', d);
}
{
  const cheio = Array.from({ length: TETO_GERAL }, (_, i) => voz(i + 1, `s${i}`, i < 3 ? PESO.inimigo : PESO.jogador, i));
  const d = decidir(cheio, 'novo', PESO.jogador, 4, 99, undefined);
  ok(d.tipo === 'trocar' && d.id === 1, 'global cap: the player pushes out the oldest enemy voice', d);
  const d2 = decidir(cheio.map((x) => ({ ...x, peso: PESO.chefe })), 'novo', PESO.inimigo, 4, 99, undefined);
  ok(d2.tipo === 'recusar', 'global cap: an enemy does not push out a boss or the player', d2);
  const d3 = decidir(cheio.map((x) => ({ ...x, peso: PESO.interface })), 'novo', PESO.interface, 4, 99, undefined);
  ok(d3.tipo === 'recusar', 'global cap: interface voices are never pushed out', d3);
}
{
  let s = 0.123; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const vs = Array.from({ length: 200 }, () => sortearVariacao(rnd, 0.04, 0.1));
  ok(vs.every((x) => x.taxa >= 0.96 && x.taxa <= 1.04 && x.ganho >= 0.9 && x.ganho <= 1.1), 'the variation stays inside ±tom and ±vol');
  ok(new Set(vs.map((x) => x.taxa.toFixed(4))).size > 50, 'the variation varies');
}

// ─── the places ───
ok(lugarDaCena('Menu') === 'atmosfera' && lugarDaCena('Hangar') === 'atmosfera', 'the menu and the hangar are in the atmosphere');
ok(lugarDaCena('Game', 1) === 'atmosfera', 'stage 1 is in the atmosphere');
ok(lugarDaCena('Game', 2) === 'cabine' && lugarDaCena('Game', 3) === 'cabine', 'stages 2 and 3 are in space (cabin)');
ok(lugarDaCena('Game', 4) === 'interior', 'stage 4 is the organic interior');
ok(lugarDaCena('Interlude2') === 'cabine', 'a cutscene without its own place falls on the cabin');
ok(PERFIS_SOM.atmosfera.passaBaixa < PERFIS_SOM.cabine.passaBaixa, 'the atmosphere is more muffled than the cabin');
ok(PERFIS_SOM.atmosfera.eco.seg > PERFIS_SOM.cabine.eco.seg, 'the atmosphere has a longer tail than the cabin');
ok(PERFIS_SOM.agua.passaBaixa <= 2000 && PERFIS_SOM.agua.passaBaixa < PERFIS_SOM.interior.passaBaixa, 'the water is the most muffled place, moderately (his choice, 18/11)');
ok(AO_FUNDO.cabine.passaBaixa <= 200 && AO_FUNDO.cabine.volume <= 0.3, 'in space the background is only a dull low thump');
ok(Object.keys(PERFIS_SOM).every((l) => AO_FUNDO[l].passaBaixa < PERFIS_SOM[l].passaBaixa), 'the background is always more muffled than the place');

// ─── the catalogue ───
const def = (o = {}) => ({ arquivo: 'nave/x', camada: 'acao', volume: 0.6, vozes: 4, variacao: { tom: 0.04, vol: 0.1 }, prioridade: 'jogador', ...o });
const tudo = () => true;
const cred = '| `nave.xaelo.tiro` | PixelLab |';
ok(NOME_SOM.test('nave.xaelo.tiro') && NOME_SOM.test('explosao.carne') && !NOME_SOM.test('Nave.Tiro') && !NOME_SOM.test('tiro'), 'the name is grupo.dono.acao, lower case');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, tudo, cred).length === 0, 'a valid entry passes');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, () => false, cred).some((e) => e.includes('.ogg')), 'a missing file is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, tudo, '').some((e) => e.includes('SONS.md')), 'a missing credits line is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ volume: 1.4 }) }, tudo, cred).length > 0, 'volume over 1 is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ vozes: 0 }) }, tudo, cred).length > 0, 'zero voices is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ variacao: { tom: 0.3, vol: 0.1 } }) }, tudo, cred).length > 0, 'a pitch variation over 10% is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ camada: 'interface', plano: 'fundo' }) }, tudo, cred).length > 0, 'the interface has no background');
{
  const creditos = existsSync('docs/SONS.md') ? readFileSync('docs/SONS.md', 'utf8') : '';
  const erros = validarCatalogo(SONS, (c) => existsSync(`public/sfx/${c}`), creditos);
  ok(erros.length === 0, `the REAL catalogue is valid (${Object.keys(SONS).length} sounds)`, erros);
}

// ─── which sound an explosion makes (sheet 2) ───
{
  const { somDaExplosao, forcaDaExplosao, somDoAcerto, METAL_GRANDE_A_PARTIR } = await import('../src/som/somDaExplosao.ts');
  ok(somDaExplosao('metal', 1) === 'explosao.metal' && somDaExplosao('metal', METAL_GRANDE_A_PARTIR) === 'explosao.metalGrande', 'metal splits by size: a drone is not a cargo ship');
  ok(somDaExplosao('carne', 3) === 'explosao.carne' && somDaExplosao('chefeFim', 2.4) === 'explosao.chefeFim', 'the other types are their own sound, any size');
  ok(forcaDaExplosao(0.3) < forcaDaExplosao(1) && forcaDaExplosao(1) < forcaDaExplosao(1.5) && forcaDaExplosao(9) === 1, 'bigger = louder, capped at 1');
  ok(somDoAcerto(undefined) === 'acerto.metal' && somDoAcerto('biomec') === 'acerto.carne' && somDoAcerto('rocha') === 'acerto.rocha' && somDoAcerto('luz') === 'acerto.metal', 'the hit by material (no material = the ships: metal)');
  const tipos = ['perigo', 'metal', 'chefeFim', 'luz', 'biomec', 'carne', 'rocha', 'carta', 'implosao'];
  ok(somDoAcerto('metal', 'drone') === 'acerto.drone' && somDoAcerto('metal', 'batedor') === 'acerto.metal', 'the swarm drone has its own hit; the other metal ones keep the metal hit');
  const { somDaMorte } = await import('../src/som/somDaExplosao.ts');
  ok(somDaMorte('drone') === 'explosao.drone' && somDaMorte('batedor') === null, 'the swarm drone plays its own death; the others the material');
  const pendentes = new Set(); // (none left: round 3 closed the small metal one, 15/11)
  const faltam = tipos.flatMap((t) => [somDaExplosao(t, 1), somDaExplosao(t, 3)]).filter((n) => !SONS[n] && !pendentes.has(n));
  ok(faltam.length === 0, 'every explosion type has its sound in the catalogue (except the ones still on sheet 2b)', faltam);
}

// ─── the TERMINUS rotary gun: the A1 arrival grows with the burst, capped (16/11) ───
{
  const { chegadaDaRajada, CHEGADA_DA_RAJADA } = await import('../src/som/somDaNave.ts');
  const toque = chegadaDaRajada(1);
  const meio = chegadaDaRajada(CHEGADA_DA_RAJADA.cheioEm / 2);
  const cheio = chegadaDaRajada(CHEGADA_DA_RAJADA.cheioEm);
  const cravado = chegadaDaRajada(200);
  ok(toque.forca < meio.forca && meio.forca < cheio.forca && toque.fracao < cheio.fracao, 'the arrival grows with the shots fired');
  ok(cravado.forca === cheio.forca && cravado.fracao === cheio.fracao && cheio.forca === 1, 'past the cap (the finger nailed on the trigger) it stops growing');
  ok(chegadaDaRajada(0).forca === CHEGADA_DA_RAJADA.forcaMin && chegadaDaRajada(0).fracao > 0, 'even a tap has an arrival, small');
  ok(!SONS['nave.terminus.tiro'] && SONS['nave.terminus.rotativa.laco']?.laco && SONS['nave.terminus.rotativa.laco'].passaBaixaNoVacuo, 'the TERMINUS has no per-shot sound: the rotary loop, muffled in the vacuum');
}

// ─── the composition: the LASTRO, the vacuum, the engines (his notes after playing, 15/11) ───
{
  const { LASTRO, energiaDepois, ganhoDoLastro } = await import('../src/som/mixagem.ts');
  const { forcaNoLugar, EXPLOSAO_NO_VACUO } = await import('../src/som/acustica.ts');
  ok(perto(energiaDepois(1, LASTRO.tau), Math.exp(-1)) && energiaDepois(1, 0) === 1, 'the energy drains with the time constant');
  // a chain of 14 blasts 150 ms apart keeps the bed up; a lone small one barely starts it
  let e = 0;
  for (let i = 0; i < 14; i++) e = energiaDepois(e, 0.15) + 0.8 * 0.45;
  ok(ganhoDoLastro(e) > 0.6, 'a chain (the Aurora: 14 × 150 ms) fills the bed', ganhoDoLastro(e));
  ok(ganhoDoLastro(0.35 * 0.85) < 0.2, 'a lone small blast barely lifts it', ganhoDoLastro(0.3));
  ok(energiaDepois(e, 8) < LASTRO.desliga, 'eight seconds after the chain, the bed is off');
  ok(ganhoDoLastro(99) === 1 && ganhoDoLastro(-1) === 0, 'the bed gain is clamped');
  ok(forcaNoLugar(1, 'cabine') === EXPLOSAO_NO_VACUO && forcaNoLugar(1, 'atmosfera') === 1, 'in the vacuum the blasts are quieter; in the air, not');
  // the SHIPS' engines (a boss's thrusters are a sound of the fight, not the ship's bed)
  const motores = Object.entries(SONS).filter(([n]) => n.startsWith('nave.') && n.endsWith('.motor'));
  ok(motores.length === 3 && motores.every(([, d]) => d.camada === 'motor' && d.passaBaixa && d.passaBaixa <= 1500), 'the three engines are muffled, on their own layer', motores.map(([n, d]) => [n, d.volume, d.passaBaixa]));
  const explosoes = Object.entries(SONS).filter(([n]) => n.startsWith('explosao.') && n !== 'explosao.luz' && n !== 'explosao.lastro');
  ok(SONS['explosao.lastro']?.laco && !SONS['explosao.lastro'].lastro, 'the bed itself is a loop that does not feed itself');
  ok(explosoes.every(([, d]) => d.lastro > 0), 'every explosion (but the light) feeds the bed', explosoes.filter(([, d]) => !d.lastro).map(([n]) => n));
}

// ── SHEET 6, the interface (17/11): the pause's sound is a pure rule over its state machine; the result's timing ──
{
  const { passo, inicial } = await import('../src/pausa/numerosPausa.ts');
  const { somDaPausa } = await import('../src/pausa/somDaPausa.ts');
  const { sonsDoResultado, RECORDE_DEPOIS } = await import('../src/menu/resultado.ts');
  const { RESULTADO } = await import('../src/menu/numerosMenu.ts');
  const ctx = { tipo: 'fase', zerou: false, temControle: false };
  const som = (e, t, c = ctx) => { const r = passo(e, t, c); return [somDaPausa(e, r.estado, r.efeito, t, c), r.estado]; };
  let e = inicial('fase');
  let s;
  [s, e] = som(e, 'baixo');
  ok(s === 'ui.mover', 'the pause: ↓ on the list MOVES', s);
  [s] = som(inicial('fase'), 'esc');
  ok(s === 'ui.pausa.fechar', 'the pause: ESC closes it', s);
  [s] = som(inicial('fase'), 'esc', { ...ctx, tipo: 'menu' });
  ok(s === 'ui.voltar', 'the settings from the MENU: ESC is a back, not the pause closing', s);
  const cfg = { tela: 'config', aba: 0, linha: 0, coluna: 0 };
  [s] = som(cfg, 'abaProx');
  ok(s === 'ui.aba', 'the settings: the tab', s);
  [s] = som(cfg, 'direita');
  ok(s === 'ui.ajustar', 'the settings: ←→ on a value ADJUSTS', s);
  [s] = som({ tela: 'confirma', acao: 'sair', sim: false }, 'direita');
  ok(s === 'ui.mover', 'the confirmation: SIM/NÃO moves', s);
  [s] = som({ tela: 'confirma', acao: 'sair', sim: false }, 'ok');
  ok(s === 'ui.voltar', 'the confirmation: OK on NÃO goes back', s);
  [s] = som({ tela: 'confirma', acao: 'sair', sim: true }, 'ok');
  ok(s === 'ui.confirmar', 'the confirmation: OK on SIM confirms the action', s);
  [s] = som({ tela: 'captura', aba: 1, linha: 0, coluna: 0 }, 'esc');
  ok(s === 'ui.voltar', 'the remap: ESC cancels the capture (a back)', s);
  const contaLiga = sonsDoResultado(RESULTADO.entra.pontos - 0.01, RESULTADO.entra.pontos + 0.01, false);
  const assenta = RESULTADO.entra.pontos + RESULTADO.conta;
  const fim = sonsDoResultado(assenta - 0.01, assenta + RECORDE_DEPOIS + 0.01, true);
  ok(contaLiga.includes('contaLiga'), 'the result: the counter starts with the points', contaLiga);
  ok(fim.join() === 'contaDesliga,medalha,recorde', 'the result: the counter stops, the MEDAL lands, then the RECORD', fim);
  ok(!sonsDoResultado(assenta - 0.01, assenta + 1, false).includes('recorde'), 'no record sound when it is not a record');
  const posto = sonsDoResultado(0, 0.5, true, true);
  ok(!posto.includes('contaLiga') && posto.includes('medalha') && posto.includes('recorde'), 'reduced motion: no counter, the medal and the record at once', posto);
}

// THE SOUNDTRACK UNDER THE WORLD (18/11)
{
  ok(CONTEXTOS.fase.lufs >= -22 && CONTEXTOS.fase.lufs <= CONTEXTOS.cena.lufs && CONTEXTOS.cena.lufs < CONTEXTOS.menu.lufs, 'the track up front: level with the action while playing (≥ −22), highest on the menu');
  ok(CONTEXTOS.fase.graves < 0 && CONTEXTOS.fase.presenca < 0, 'while playing it leaves a pocket for the explosions and the shots');
  ok(reducaoDaTrilha(DUCK.limiar - 1, false) === 0, 'under the threshold the track is left alone');
  ok(reducaoDaTrilha(DUCK.limiar + 4, false) < 0, 'a loud moment pushes it down');
  ok(reducaoDaTrilha(0, false) === DUCK.maximo, 'never deeper than the limit');
  ok(reducaoDaTrilha(-60, true) === DUCK.cenario, 'a far event clears space even in silence');
  ok(reducaoDaTrilha(0, true) === DUCK.maximo, 'the deeper of the two wins');
  ok(Math.abs(proximoDuck(0, -8, 0.04)) > Math.abs(proximoDuck(-8, 0, 0.04) + 8), 'it gets out of the way faster than it comes back');
  ok(proximoDuck(-1, -1, 0.04) === -1 && proximoDuck(-0.01, 0, 1) === 0, 'it stops on the target');
  ok(abreEspaco('fx.f2.laser') && abreEspaco('fx.f3.enguia') && abreEspaco('fx.menu.trovao.perto'), 'the far events ask for space');
  ok(!abreEspaco('fx.f1.artilharia') && !abreEspaco('fx.f4.coracao') && !abreEspaco('nave.xaelo.tiro'), 'what repeats all the time does not');
  ok(Math.abs(curvaEntra(0.5) ** 2 + curvaEntra(0.5) ** 2 - 1) < 1e-9, 'the crossfade keeps the power constant');
  for (const [t, f] of Object.entries(FAIXAS)) ok(existsSync(`public/audio/trilha/${f.arquivo}.ogg`) && existsSync(`public/audio/trilha/${f.arquivo}.m4a`), `the track ${t} is installed in both formats`);
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
