// O teste dos perfis da Atmosfera — roda direto no Node 24 (type stripping lê o .ts).
//   node scripts/test-atmosfera-perfis.mjs
import { PERFIS, PISO_DENSIDADE, interpolarPerfil } from '../src/systems/atmosfera/perfis.ts';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const nomes = ['viscera', 'visceraSuccao', 'vacuo', 'vacuoQueda', 'superficie', 'apagando'];
ok(nomes.every((n) => PERFIS[n]?.nome === n), `os seis perfis existem com o próprio nome (${Object.keys(PERFIS).join(',')})`);
ok(PISO_DENSIDADE === 0.6, `o piso é 0,6 (${PISO_DENSIDADE})`);
for (const n of nomes) {
  ok(PERFIS[n].nevoa.densidade >= PISO_DENSIDADE, `${n}: densidade ${PERFIS[n].nevoa.densidade} >= piso`);
}
// a forma da curva: dentro > superfície > espaço
ok(PERFIS.viscera.nevoa.densidade > PERFIS.superficie.nevoa.densidade, 'dentro é mais denso que a superfície');
ok(PERFIS.superficie.nevoa.densidade > PERFIS.vacuo.nevoa.densidade, 'a superfície é mais densa que o espaço');
ok(PERFIS.apagando.gradeQuente === 0, 'no apagar, o âmbar sai (gradeQuente 0)');

const meio = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 0.5);
ok(meio.nome === 'apagando', `a interpolação já leva o nome do destino (${meio.nome})`);
ok(Math.abs(meio.nevoa.densidade - (PERFIS.superficie.nevoa.densidade + PERFIS.apagando.nevoa.densidade) / 2) < 1e-9, `densidade no meio (${meio.nevoa.densidade})`);
ok(Math.abs(meio.gradeQuente - 0.5) < 1e-9, `gradeQuente no meio (${meio.gradeQuente})`);
ok(meio.nevoa.cor.length === 3 && meio.nevoa.velTras.length === 2, 'cores e vetores interpolam componente a componente');
const fim = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 1);
ok(JSON.stringify(fim) === JSON.stringify(PERFIS.apagando), 'k = 1 é o destino exato');
const ini = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 0);
ok(ini.nevoa.densidade === PERFIS.superficie.nevoa.densidade, 'k = 0 começa na origem');

console.log(falhas === 0 ? '\n✔ PERFIS DA ATMOSFERA' : `\n✘ ${falhas} asserts falharam`);
process.exit(falhas === 0 ? 0 : 1);
