// O teste dos perfis da Atmosfera — roda direto no Node 24 (type stripping lê o .ts).
//   node scripts/test-atmosfera-perfis.mjs
import { PERFIS, PERFIS_FASE, PERFIL_DA_PINTURA, PISO_DENSIDADE, interpolarPerfil } from '../src/systems/atmosfera/perfis.ts';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

// os seis da cutscene final + os três das outras cutscenes (Task 5)
const nomes = ['viscera', 'visceraSuccao', 'vacuo', 'vacuoQueda', 'superficie', 'apagando', 'aurora', 'doca', 'hangar'];
ok(nomes.every((n) => PERFIS[n]?.nome === n), `os nove perfis existem com o próprio nome (${Object.keys(PERFIS).join(',')})`);
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

// ─── FATIA 9: as fases (spec 2026-09-26-fatia9-atmosfera-fases-design.md) ───
const PINTURAS = {
  paintBgF1: 'faseF1', paintBgZeroG: 'faseZeroG', paintBgF2: 'faseF2', paintBgF3: 'faseF3',
  paintBgF4a: 'faseF4a', paintBgF4b: 'faseF4b', paintBgF4c: 'faseF4c', paintBgF4d: 'faseF4d',
};
for (const [pintura, nome] of Object.entries(PINTURAS)) {
  ok(PERFIL_DA_PINTURA[pintura]?.nome === nome, `${pintura} → ${nome} (${PERFIL_DA_PINTURA[pintura]?.nome})`);
  ok(PERFIS_FASE[nome]?.nome === nome, `o perfil ${nome} existe`);
  ok(PERFIS_FASE[nome].nevoa.densidade >= PISO_DENSIDADE, `${nome}: densidade ${PERFIS_FASE[nome].nevoa.densidade} >= piso`);
  ok(PERFIS_FASE[nome].nevoa.altura === 2, `${nome}: névoa baixa (altura ${PERFIS_FASE[nome].nevoa.altura})`);
}
ok(Object.keys(PERFIL_DA_PINTURA).length === 8, `o mapa cobre as 8 pinturas (${Object.keys(PERFIL_DA_PINTURA).length})`);
const perto = (a, b) => Math.abs(a - b) < 1e-9;
ok(perto(PERFIS_FASE.faseF1.nevoa.densidade, 0.8 * 0.75) && perto(PERFIS_FASE.faseF1.grao, 0.7 * 0.75), 'as abertas são −25% da base (névoa 0,6, grão 0,525)');
ok(perto(PERFIS_FASE.faseF4a.nevoa.densidade, 0.8 * 0.85) && perto(PERFIS_FASE.faseF4a.vinheta, 0.55 * 0.85), 'as densas são −15% da base (névoa 0,68, vinheta 0,4675)');
ok(PERFIS_FASE.faseF3.nevoa.densidade > PERFIS_FASE.faseF2.nevoa.densidade, 'a F3 (densa) pesa mais que a F2 (aberta)');
ok(PERFIS_FASE.faseF4d.nevoa.densidade < PERFIS.viscera.nevoa.densidade, 'a fase fica abaixo da cutscene do mesmo lugar (F4d < víscera)');

console.log(falhas === 0 ? '\n✔ PERFIS DA ATMOSFERA' : `\n✘ ${falhas} asserts falharam`);
process.exit(falhas === 0 ? 0 : 1);
