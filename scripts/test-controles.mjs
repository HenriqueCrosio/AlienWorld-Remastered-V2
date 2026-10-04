// O MAPA DE TECLAS (spec 2026-10-03-mapa-de-teclas-design.md). Uso, da raiz:
// node scripts/test-controles.mjs
import { ACOES, PERFIS, resolverPerfil, rotuloDaTecla } from '../src/controles.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

for (const [nome, mapa] of Object.entries(PERFIS)) {
  igual(ACOES.filter((a) => !(mapa[a]?.length > 0)), [], `${nome}: as 9 ações têm tecla`);
  // Uma tecla, uma ação — fora W/↑, que são "cima" E "flap" de propósito (o flap é o "para cima" da F1).
  const dono = new Map();
  const repetidas = [];
  for (const a of ACOES) {
    for (const t of mapa[a]) {
      const par = [dono.get(t), a].sort().join('+');
      if (dono.has(t) && par !== 'cima+flap') repetidas.push(`${t}: ${par}`);
      dono.set(t, a);
    }
  }
  igual(repetidas, [], `${nome}: nenhuma tecla em duas ações (fora cima+flap)`);
  igual([...dono.keys()].filter((t) => t === 'CTRL'), [], `${nome}: sem CTRL (Ctrl+W fecha a aba)`);
}

igual([PERFIS.padrao.tiro, PERFIS.padrao.bomba, PERFIS.padrao.dash, PERFIS.padrao.flare, PERFIS.padrao.missil], [['SPACE'], ['SHIFT'], ['E'], ['F'], ['Q']], 'padrão: Espaço · Shift · E · F · Q');
igual([PERFIS.classico.tiro, PERFIS.classico.bomba, PERFIS.classico.dash, PERFIS.classico.flare, PERFIS.classico.missil], [['Z'], ['X'], ['C'], ['F'], ['V']], 'clássico: Z · X · C · F · V');
igual([PERFIS.padrao.flap, PERFIS.classico.flap], [['W', 'UP'], ['W', 'UP']], 'o flap é W / ↑ nos dois (o Espaço não faz flap)');

igual(resolverPerfil(null, ''), { perfil: 'padrao', gravar: null }, 'nada salvo, nada na URL: padrão');
igual(resolverPerfil('classico', ''), { perfil: 'classico', gravar: null }, 'o salvo vale');
igual(resolverPerfil('lixo', ''), { perfil: 'padrao', gravar: null }, 'salvo inválido: padrão');
igual(resolverPerfil(null, '?teclas=classico'), { perfil: 'classico', gravar: 'classico' }, '?teclas=classico escolhe e grava');
igual(resolverPerfil('classico', '?sandbox&teclas=padrao'), { perfil: 'padrao', gravar: 'padrao' }, 'a URL vence o salvo');
igual(resolverPerfil('classico', '?teclas=xyz'), { perfil: 'classico', gravar: null }, 'URL inválida: fica o salvo');

igual([rotuloDaTecla('SPACE'), rotuloDaTecla('Z')], ['ESPAÇO', 'Z'], 'o rótulo na tela');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
