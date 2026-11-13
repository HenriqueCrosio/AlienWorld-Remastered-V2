// BLOCO I, etapa 3 (13/11) — the dawn menu and the end-of-campaign result (plan `plans/2026-11-13-tela-final-parte-a.md`):
//   marcas    — which menu opens before and after the first victory; the choice only records after it;
//   placar    — the medal bands, the record, practice never records;
//   avaria    — the failing letter of the neon sign: one letter, only after the sign is lit, the same every time;
//   resultado — the order the result comes in, the key only after everything, the way out.
//   vida      — the living scenery of the dawn: the masks (the mist only over painted mist, off the carcass), the rays;
//   node scripts/test-menu-amanhecer.mjs [section …]
import { medalhaDe, registrarRecorde } from '../src/placar.ts';
import { CHAVE_MENU, CHAVE_ZEROU, escolherMenu, marcarZerou, menuAtivo, zerou } from '../src/menu/qualMenu.ts';
import { AVARIA, RESULTADO, ABERTURA } from '../src/menu/numerosMenu.ts';
import { T_FIM, letraAcesa, letraFalha } from '../src/menu/abertura.ts';
import fs from 'node:fs';
import {
  BRASAS, BRUMA, CAIXA_LAVA, CARCACA, CINZA, EFEITOS, FOGO, FUMACA, LAVA, RAIOS, VEU,
  brumaNaCarcaca, efeitosLigados, ehFogo, ehLava, mascaraLuz, mascaraNevoa, naCarcaca,
} from '../src/menu/amanhecer/numerosAmanhecer.ts';
import { PARTES_RESULTADO, T0_SEGUNDO_TEMPO, alfaResultado, pontosMostrados, resultadoPronto, resultadoSaiu } from '../src/menu/resultado.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);
const guarda = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), m }; };

if (roda('marcas')) {
  const g = guarda();
  ok(!zerou(g) && menuAtivo(g) === 'noite', 'antes de zerar: o menu é o da noite');
  ok(escolherMenu(g, 'amanhecer') === false && g.m.size === 0, 'antes de zerar: a escolha não grava nada');
  ok(menuAtivo(g, 'amanhecer') === 'amanhecer', 'o menu forçado (dev) vale mesmo sem zerar');
  marcarZerou(g);
  ok(zerou(g) && g.getItem(CHAVE_ZEROU) === '1' && menuAtivo(g) === 'amanhecer', 'depois de zerar: o menu é o do amanhecer');
  ok(escolherMenu(g, 'noite') && g.getItem(CHAVE_MENU) === 'noite' && menuAtivo(g) === 'noite', 'depois de zerar: a escolha da noite grava e vale');
  ok(escolherMenu(g, 'amanhecer') && menuAtivo(g) === 'amanhecer', 'depois de zerar: a volta ao amanhecer grava e vale');
  g.setItem(CHAVE_MENU, 'lixo');
  ok(menuAtivo(g) === 'amanhecer', 'lixo na preferência: o amanhecer');
}

if (roda('placar')) {
  ok(medalhaDe(599) === null && medalhaDe(600).medal === 'bronze' && medalhaDe(1500).medal === 'prata' && medalhaDe(3000).medal === 'ouro', 'as faixas de medalha (600 · 1500 · 3000)');
  const g = guarda();
  const a = registrarRecorde(g, 'diegetico', 1000, false);
  ok(a.novo && a.anterior === 0 && a.recorde === 1000 && g.getItem('alienworld:record:diegetico') === '1000', 'a 1ª partida grava o recorde');
  const b = registrarRecorde(g, 'diegetico', 800, false);
  ok(!b.novo && b.anterior === 1000 && b.recorde === 1000, 'uma partida pior não grava; o recorde mostrado é o anterior');
  const c = registrarRecorde(g, 'diegetico', 5000, true);
  ok(!c.novo && g.getItem('alienworld:record:diegetico') === '1000', 'o treino não grava recorde');
  ok(registrarRecorde(g, 'flap', 10, false).novo, 'cada condução tem o seu recorde');
}

if (roda('avaria')) {
  const passo = 1 / 120, fim = T_FIM + AVARIA.desde + AVARIA.ciclo * 40;
  let outras = 0, cedo = 0, apagada = 0, total = 0, ciclosComFalha = new Set(), maior = 0, corrida = 0;
  for (let t = 0; t < fim; t += passo) {
    for (let i = 0; i < 10; i++) if (i !== AVARIA.letra && letraFalha(i, t)) outras++;
    const f = letraFalha(AVARIA.letra, t);
    if (f && t < T_FIM + AVARIA.desde) cedo++;
    if (t >= T_FIM + AVARIA.desde) {
      total++;
      if (f) { apagada++; corrida += passo; maior = Math.max(maior, corrida); ciclosComFalha.add(Math.floor((t - T_FIM - AVARIA.desde) / AVARIA.ciclo)); } else corrida = 0;
    }
  }
  ok(outras === 0, 'só a letra escolhida falha');
  ok(cedo === 0, 'nunca falha antes de o neon acender inteiro (nem na chegada)');
  ok(letraAcesa(AVARIA.letra, T_FIM), 'a letra escolhida acende com as outras');
  ok(ciclosComFalha.size === 40, `falha em todo ciclo (${ciclosComFalha.size}/40)`);
  ok(apagada / total > 0.02 && apagada / total < 0.2, `fica apagada numa fração pequena do tempo (${(100 * apagada / total).toFixed(1)}%)`);
  ok(maior <= AVARIA.apagao.dura[1] + 0.02 && maior >= AVARIA.apagao.dura[0], `o apagão mais longo dura entre 1 e 2 s (${maior.toFixed(2)} s)`);
  ok(letraFalha(AVARIA.letra, T_FIM + 20.5) === letraFalha(AVARIA.letra, T_FIM + 20.5), 'o mesmo instante dá sempre o mesmo estado');
  const pior = AVARIA.comeca[1] + AVARIA.piscadas[1] * (AVARIA.apagada[1] + AVARIA.acesa[1]) + AVARIA.apagao.dura[1] + AVARIA.apagao.zumbido[0] + AVARIA.apagao.zumbido[1];
  ok(pior < AVARIA.ciclo, `a rajada mais longa cabe no ciclo (${pior.toFixed(2)} s < ${AVARIA.ciclo} s)`);
}

if (roda('resultado')) {
  const E = RESULTADO.entra;
  const ordem = PARTES_RESULTADO.map((p) => E[p]);
  ok(PARTES_RESULTADO.join() === 'titulo,pontos,recorde,credito,tecla' && ordem.every((v, i) => i === 0 || v > ordem[i - 1]), 'a ordem de entrada: o título, os pontos, o recorde, o crédito, a tecla');
  ok(PARTES_RESULTADO.every((p) => alfaResultado(p, E.titulo - 0.01, -1) === 0), 'antes do título o amanhecer fica sozinho');
  ok(alfaResultado('titulo', E.titulo + RESULTADO.fade, -1) === 1 && alfaResultado('tecla', E.titulo + RESULTADO.fade, -1) === 0, 'o título entra antes da tecla');
  ok(!resultadoPronto(E.tecla + RESULTADO.fade - 0.01) && resultadoPronto(RESULTADO.pronto), 'a tecla só vale depois de tudo entrar');
  ok(RESULTADO.pronto >= E.tecla + RESULTADO.fade, 'o "pronto" vem depois de a tecla aparecer inteira');
  ok(PARTES_RESULTADO.every((p) => alfaResultado(p, 0, -1, true) === 1) && resultadoPronto(0, true), 'no movimento reduzido tudo já abre posto');
  const tSai = 9;
  ok(alfaResultado('titulo', tSai, tSai) === 1 && alfaResultado('titulo', tSai + RESULTADO.sai, tSai) === 0, 'na tecla o resultado some em 0,6 s');
  ok(!resultadoSaiu(tSai + 0.1, tSai) && resultadoSaiu(tSai + RESULTADO.sai + 0.01, tSai) && !resultadoSaiu(99, -1), 'o resultado só "saiu" depois do sumiço');
  ok(T0_SEGUNDO_TEMPO < ABERTURA.letreiro.t0 && T0_SEGUNDO_TEMPO > 0, 'o 2º tempo começa pouco antes de o letreiro entrar');
  // the count-up of the points
  let sobe = true, ant = 0;
  for (let t = 0; t < 8; t += 1 / 60) { const v = pontosMostrados(21000, t); if (v < ant || v > 21000 || !Number.isInteger(v)) sobe = false; ant = v; }
  ok(sobe, 'os pontos contam só para cima, inteiros, sem passar do valor');
  ok(pontosMostrados(21000, E.pontos) === 0 && pontosMostrados(21000, E.pontos + RESULTADO.conta) === 21000, 'a contagem vai de 0 (na entrada) ao valor (em `conta` s)');
  ok(E.pontos + RESULTADO.conta <= RESULTADO.pronto, 'a contagem acaba antes de a tecla valer');
  ok(pontosMostrados(0, 5) === 0, 'zero pontos: zero');
}

if (roda('vida')) {
  ok(mascaraLuz(0) === 0 && mascaraLuz(15) === 0 && mascaraLuz(60) === 1 && mascaraLuz(255) === 1, 'a máscara da luz: zero nas silhuetas pretas, cheia no céu e na névoa');
  ok(mascaraNevoa(8, 8, 10) === 0, 'a máscara da névoa: zero no preto');
  ok(mascaraNevoa(72, 69, 73) === 1, 'a máscara da névoa: cheia no cinza médio da névoa pintada');
  ok(mascaraNevoa(215, 200, 175) === 0, 'a máscara da névoa: zero no osso das costelas');
  ok(mascaraNevoa(210, 90, 40) === 0 && mascaraNevoa(120, 70, 50) === 0, 'a máscara da névoa: zero na lava e no fogo');
  ok(mascaraNevoa(230, 200, 160) === 0, 'a máscara da névoa: zero nas aberturas de sol');
  ok(brumaNaCarcaca(CARCACA.x, CARCACA.y) === CARCACA.bruma && brumaNaCarcaca(20, 110) === 1, 'a bruma quase não passa sobre a carcaça e vale inteira longe dela');
  // (13/11: he asked for it "um pouco mais densa, não muito" — the peaks went from 0.30 to 0.38; the ceiling follows)
  ok(BRUMA.bandas.every((b) => b.y >= 80 && b.y + b.h <= 240 && b.pico <= 0.42), 'a bruma fica no vale, sem tapar');
  ok(BRUMA.bandas.every((b, i) => i === 0 || b.vel > BRUMA.bandas[i - 1].vel) && BRUMA.bandas.at(-1).vel < 6, 'a bruma: cada faixa mais rápida que a de trás, e todas lentas');
  ok(RAIOS.fontes.every((f) => f.de >= 45 && f.ate <= 135 && f.de < f.ate), 'os raios descem (entre 45° e 135°)');
  ok(RAIOS.fontes.every((f) => f.y < 80 && f.x > 150 && f.x < 384), 'os raios nascem nas aberturas das nuvens, no céu');
  ok(RAIOS.fontes.every((f) => f.pico <= 0.35) && RAIOS.minimo < 0.5, 'os raios são fracos e respiram de verdade');
  ok(efeitosLigados(null).join() === EFEITOS.join() && efeitosLigados('0').length === 0 && efeitosLigados('raios').join() === 'raios', 'o parâmetro vida liga só o que foi pedido');
  ok(EFEITOS.join() === 'bruma,raios,fumaca,fogo,brasas,lava,cinza,veu', 'os sete efeitos da lista dele e o véu de fumaça');
  // the veil of smoke and haze over the whole scenery (his last adjustment)
  const cobre = (y) => VEU.lencois.some((l) => y >= l.y + l.h * 0.25 && y <= l.y + l.h * 0.75);
  ok([20, 60, 108, 150, 200].every(cobre), 'o véu cobre a tela inteira, de cima a baixo');
  ok(VEU.lencois.some((l) => l.tint < 0x404040) && VEU.lencois.some((l) => l.tint > 0x707070), 'o véu tem a fumaça escura e a neblina clara');
  ok(VEU.lencois.every((l) => l.pico <= 0.35 && l.vel <= 6) && VEU.minimo >= 0.5, 'o véu é lento, não tapa a pintura e nunca some');
  // the fire and the lava of the painting
  ok(ehFogo(230, 120, 50) && !ehFogo(230, 200, 160) && !ehFogo(215, 200, 175) && !ehFogo(70, 66, 70), 'o fogo: laranja aceso, não o creme do sol, nem o osso, nem a névoa');
  ok(ehLava(220, 90, 40) && ehLava(95, 30, 28) && !ehLava(215, 200, 175) && !ehLava(40, 36, 38), 'a lava: a rachadura acesa e o vermelho fundo, não o osso nem o casco');
  ok(naCarcaca(CARCACA.x, CARCACA.y) && !naCarcaca(40, 60) && !naCarcaca(CARCACA.x, CARCACA.y - CARCACA.ry - 4), 'a elipse da carcaça');
  ok(CAIXA_LAVA.x <= CARCACA.x - CARCACA.rx && CAIXA_LAVA.x + CAIXA_LAVA.w >= CARCACA.x + CARCACA.rx && CAIXA_LAVA.y <= CARCACA.y - CARCACA.ry && CAIXA_LAVA.y + CAIXA_LAVA.h >= CARCACA.y + CARCACA.ry, 'a caixa da lava contém a carcaça inteira');
  ok(LAVA.apagada[0] >= 0.4 && LAVA.apagada[1] < 1 && LAVA.apagada[0] < LAVA.apagada[1], 'a lava respira QUASE apagada: nunca acende inteira, nunca some de todo');
  ok(FUMACA.colunas.every((c) => c.x > 0 && c.x < 384 && c.y - c.sobe > -10 && c.sobe > 0) && FUMACA.pico <= 0.4, 'a fumaça sobe das colunas pintadas, dentro da tela, sem tapar');
  ok(BRASAS.daCarcaca <= BRASAS.quantas && BRASAS.quantas <= 60 && BRASAS.vida[0] >= 3, 'as brasas: poucas e lentas, a maioria da carcaça');
  ok(CINZA.cai[0] > 0 && CINZA.cai[1] <= 12 && CINZA.deriva[1] <= 0 && CINZA.quantos <= 90, 'a cinza cai devagar e deriva com o vento da bruma');
  ok(FOGO.alfa[1] <= 0.3 && FOGO.onda1[0] > 3, 'o fogo tremula depressa e fraco');
  // the baked data the game loads
  const dados = JSON.parse(fs.readFileSync('public/sprites/menu-amanhecer/k4/dados.json', 'utf8'));
  ok(dados.fogos.length >= 20 && dados.lava.length >= 5, `os focos assados: ${dados.fogos.length} de fogo, ${dados.lava.length} de lava`);
  ok(dados.lava.every((f) => naCarcaca(f.x + f.w / 2, f.y + f.h / 2)) && dados.fogos.every((f) => !naCarcaca(f.x + f.w / 2, f.y + f.h / 2)), 'a lava está na carcaça e o fogo fora dela');
  ok(fs.readFileSync('public/sprites/menu-amanhecer/k1/dados.json', 'utf8') === JSON.stringify(dados), 'as duas densidades leem os mesmos focos');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exitCode = falhas ? 1 : 0;
