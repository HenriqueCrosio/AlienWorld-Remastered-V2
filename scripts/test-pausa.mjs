// BLOCK M1 (14/11) — the pause and the settings, the rules (plan `plans/2026-11-14-bloco-m1-pausa-configuracoes.md` Task 4):
// the lines of each kind of scene, every key on every state, the tabs.
//   node scripts/test-pausa.mjs
import { DERROTA, JANELA, LINHAS, LINHAS_DA_ABA, ROTULO, abasDe, alturaPequena, inicial, layoutDerrota, passo, rotuloDaAcao } from '../src/pausa/numerosPausa.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const fase = { tipo: 'fase', zerou: false }, cut = { tipo: 'cutscene', zerou: false }, esc = { tipo: 'escolha', zerou: false };
const menu = { tipo: 'menu', zerou: false }, zerou = { tipo: 'fase', zerou: true };
/** runs a sequence of keys; returns the last state and the list of effects that were not 'nada' */
const corre = (e, teclas, ctx) => { const ef = []; for (const t of teclas) { const r = passo(e, t, ctx); e = r.estado; if (r.efeito.tipo !== 'nada') ef.push(r.efeito); } return { e, ef }; };

// the lines
ok(LINHAS.fase.join() === 'continuar,reiniciar,config,sair', 'a stage: CONTINUE · RESTART · SETTINGS · QUIT');
ok(LINHAS.cutscene.includes('pular') && !LINHAS.cutscene.includes('reiniciar'), 'a cutscene: SKIP in the place of RESTART');
ok(!LINHAS.escolha.includes('pular') && !LINHAS.escolha.includes('reiniciar') && LINHAS.escolha.length === 3, 'a choice (card table, hangar): neither');
ok(Object.values(LINHAS).every((l) => l.every((a) => ROTULO[a])), 'every line has its label');
ok(alturaPequena(4) > alturaPequena(3) && JANELA.grande.x + JANELA.grande.w <= 384 && JANELA.grande.y + JANELA.grande.h <= 216, 'the big window fits the screen; the small one grows with its lines');

// the list
ok(inicial('fase').tela === 'lista' && inicial('fase').cursor === 0, 'the pause opens on the list, the cursor on CONTINUE');
ok(corre(inicial('fase'), ['cima'], fase).e.cursor === 3 && corre(inicial('fase'), ['baixo', 'baixo', 'baixo', 'baixo'], fase).e.cursor === 0, 'the cursor wraps');
ok(corre(inicial('fase'), ['esc'], fase).ef[0]?.tipo === 'fechar', 'ESC on the list closes');
ok(corre(inicial('fase'), ['ok'], fase).ef[0]?.tipo === 'fechar', 'OK on CONTINUE closes');
ok(corre(inicial('fase'), ['esquerda', 'direita', 'abaProx'], fase).ef.length === 0, 'the other keys do nothing on the list');

// the confirmations
{
  const r = corre(inicial('fase'), ['baixo', 'ok'], fase);
  ok(r.e.tela === 'confirma' && r.e.acao === 'reiniciar' && r.e.sim === false && r.ef.length === 0, 'RESTART asks first, the cursor on NO');
  const nao = corre(r.e, ['ok'], fase);
  ok(nao.e.tela === 'lista' && nao.e.cursor === 1 && nao.ef.length === 0, 'OK on NO goes back to the list, on the same line, and does nothing');
  const sim = corre(r.e, ['esquerda', 'ok'], fase);
  ok(sim.ef.length === 1 && sim.ef[0].tipo === 'acao' && sim.ef[0].acao === 'reiniciar', 'YES + OK restarts');
  ok(corre(r.e, ['direita', 'esquerda'], fase).e.sim === false && corre(r.e, ['baixo'], fase).e.sim === true, 'any arrow toggles NO/YES');
  ok(corre(r.e, ['direita', 'esc'], fase).e.tela === 'lista' && corre(r.e, ['direita', 'esc'], fase).ef.length === 0, 'ESC on the confirmation cancels');
  const sair = corre(inicial('fase'), ['cima', 'ok', 'direita', 'ok'], fase);
  ok(sair.ef[0]?.acao === 'sair', 'QUIT asks too');
  const sairEsc = corre(inicial('escolha'), ['cima', 'ok', 'esc'], esc);
  ok(sairEsc.e.tela === 'lista' && sairEsc.e.cursor === 2, 'the cancelled QUIT of a 3-line list lands back on QUIT');
}
{
  const r = corre(inicial('cutscene'), ['baixo', 'ok'], cut);
  ok(r.ef.length === 1 && r.ef[0].acao === 'pular', 'SKIP does not ask');
}

// the settings
{
  const c = corre(inicial('fase'), ['baixo', 'baixo', 'ok'], fase);
  ok(c.e.tela === 'config' && c.e.aba === 0 && c.e.linha === 0, 'SETTINGS opens on the first tab, first line');
  const m = corre(c.e, ['direita', 'esquerda', 'ok'], fase).ef;
  ok(m.length === 3 && m[0].linha === 'volume.geral' && m[0].d === 1 && m[1].d === -1 && m[2].d === 1, '←→ change the value of the line; OK steps it forward');
  ok(corre(c.e, ['baixo', 'baixo', 'baixo', 'baixo'], fase).e.linha === LINHAS_DA_ABA.audio.length - 1, 'the lines do not wrap downwards');
  const faixa = corre(c.e, ['cima', 'cima'], fase);
  ok(faixa.e.linha === -1, 'above the first line: the tab strip');
  ok(corre(faixa.e, ['direita'], fase).e.aba === 1 && corre(faixa.e, ['esquerda'], fase).e.aba === 2 && corre(faixa.e, ['direita'], fase).ef.length === 0, 'on the strip ←→ change the tab (wrapping), nothing is changed');
  ok(corre(faixa.e, ['direita'], fase).e.linha === -1 && corre(faixa.e, ['ok'], fase).e.linha === 0, 'the cursor stays on the strip; OK goes down into the tab');
  const prox = corre(c.e, ['baixo', 'abaProx'], fase);
  ok(prox.e.aba === 1 && prox.e.linha === 0 && corre(c.e, ['abaAnt'], fase).e.aba === 2, 'Q/E change the tab from any line and land on its first line');
  ok(corre(c.e, ['abaProx', 'ok'], fase).ef[0].linha === 'teclas' && corre(c.e, ['abaProx', 'abaProx', 'ok'], fase).ef[0].linha === 'telaCheia', 'each tab has its lines');
  const volta = corre(c.e, ['esc'], fase);
  ok(volta.e.tela === 'lista' && volta.e.cursor === 2 && volta.ef.length === 0, 'ESC in the settings goes back to the list, on SETTINGS');
  ok(corre(inicial('cutscene'), ['baixo', 'baixo', 'ok', 'esc'], cut).e.cursor === 2, 'the same in a cutscene');
}
ok(abasDe(false).join() === 'audio,controles,video' && abasDe(true).includes('jogo'), 'the GAME tab only exists after the first victory');
ok(corre({ tela: 'config', aba: 0, linha: 0 }, ['abaAnt', 'ok'], zerou).ef[0]?.linha === 'menu', 'who has beaten the game reaches the menu choice');
ok(corre({ tela: 'config', aba: 3, linha: 0 }, ['ok'], fase).ef[0]?.linha === 'reduzirClaroes' || corre({ tela: 'config', aba: 3, linha: 0 }, ['ok'], fase).ef[0]?.linha === 'telaCheia', 'a tab index out of range is clamped');

// the settings from the main menu
ok(inicial('menu').tela === 'config', 'from the main menu the settings open straight on the big window');
ok(corre(inicial('menu'), ['esc'], menu).ef[0]?.tipo === 'fechar', 'and ESC there closes');

// THE SHIP LOST window (15/11, block M3)
{
  const der = { tipo: 'derrota', zerou: false };
  ok(LINHAS.derrota.join() === 'reiniciar,config,sair', 'a death: TRY AGAIN · SETTINGS · QUIT (no CONTINUE)');
  ok(rotuloDaAcao('derrota', 'reiniciar') === 'TENTAR DE NOVO' && rotuloDaAcao('fase', 'reiniciar') === ROTULO.reiniciar && rotuloDaAcao('derrota', 'sair') === ROTULO.sair, 'RESTART reads TRY AGAIN only after a death');
  ok(inicial('derrota').tela === 'lista' && inicial('derrota').cursor === 0, 'it opens with the cursor on TRY AGAIN');
  const de = corre(inicial('derrota'), ['ok'], der);
  ok(de.ef.length === 1 && de.ef[0].tipo === 'acao' && de.ef[0].acao === 'reiniciar' && de.e.tela === 'lista', 'OK tries again at once, without asking');
  const sai = corre(inicial('derrota'), ['cima', 'ok'], der);
  ok(sai.ef.length === 1 && sai.ef[0].acao === 'sair', 'QUIT does not ask either');
  const escD = corre(inicial('derrota'), ['esc'], der);
  ok(escD.ef.length === 1 && escD.ef[0].tipo === 'acao' && escD.ef[0].acao === 'sair', 'ESC leaves for the menu (there is nothing to resume)');
  ok(!['cima', 'baixo', 'esquerda', 'direita', 'abaAnt', 'abaProx'].some((t) => corre(inicial('derrota'), [t], der).ef.length), 'no other key does anything — and nothing ever CLOSES it');
  const cfg = corre(inicial('derrota'), ['baixo', 'ok'], der);
  ok(cfg.e.tela === 'config' && cfg.ef.length === 0, 'SETTINGS opens the big window');
  const volta = corre(cfg.e, ['esc'], der);
  ok(volta.e.tela === 'lista' && volta.e.cursor === 1 && volta.ef.length === 0, 'and ESC there comes back to the scoreboard, on SETTINGS');
  const sem = layoutDerrota(false), com = layoutDerrota(true);
  ok(sem.medalha === null && com.medalha !== null && com.h === sem.h + 13 && sem.linhas.length === 3, 'the medal row only exists with a medal (the window grows by one row)');
  ok(com.h <= 216 - 24 && DERROTA.w <= 384 && com.linhas[2] < com.h && sem.regua2 > sem.recorde && com.regua2 > com.medalha, 'it fits the screen with the hint under it, the rows in order');
}

// purity
{
  const e = Object.freeze({ tela: 'lista', cursor: 0 });
  let lancou = false;
  try { passo(e, 'baixo', fase); passo(Object.freeze({ tela: 'config', aba: 0, linha: 0 }), 'baixo', fase); } catch { lancou = true; }
  ok(!lancou && e.cursor === 0, 'passo never mutates the state');
}

console.log(falhas === 0 ? '\n✔ PAUSE RULES' : `\n✘ ${falhas} asserts failed`);
process.exitCode = falhas ? 1 : 0;
