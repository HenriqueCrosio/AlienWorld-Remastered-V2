// Monte Carlo of the card draft across the 7 tables of a human-line campaign.
// Mirrors src/cartas.ts `sortear` (pure re-implementation, no Phaser).
import { CARTAS, type CartaDef } from '../../src/data/catalogoCartas.ts';

type R = 'comum' | 'incomum' | 'rara' | 'epica';
const ORDEM: R[] = ['comum', 'incomum', 'rara', 'epica'];
const PADRAO: Record<R, number> = { comum: 50, incomum: 32, rara: 14, epica: 4 };

interface Mesa { nome: string; fase: number; garante?: R; pesos?: Partial<Record<R, number>> }
const MESAS: Mesa[] = [
  { nome: 'F1 meio', fase: 1 },
  { nome: 'Torre (Aurora)', fase: 2, garante: 'incomum' },
  { nome: 'F2 meio', fase: 2 },
  { nome: 'Capitania (Doca)', fase: 3, garante: 'rara' },
  { nome: 'Aranha F3', fase: 3, garante: 'incomum' },
  { nome: 'Serpente (Leviata)', fase: 4, garante: 'rara', pesos: { epica: 12 } },
  { nome: 'Guardiao F4', fase: 4, garante: 'rara' },
];
// Which boss each player faces after N tables: Torre after 1, Capitania after 3, Serpente after 5, Nucleo after 7.
const BOSS_APOS: Record<string, number> = { Torre: 1, Capitania: 3, Serpente: 5, Nucleo: 7 };

const q = (mao: string[], id: string) => mao.filter((c) => c === id).length;
function elegivel(mao: string[], c: CartaDef, fase: number) {
  if (q(mao, c.id) >= c.max) return false;
  if (c.requer && !mao.includes(c.requer)) return false;
  if (c.excluiSe && mao.includes(c.excluiSe)) return false;
  if (c.semF1 && fase <= 1) return false;
  return true;
}
function sortear(mao: string[], m: Mesa): CartaDef[] {
  const pesos = { ...PADRAO, ...m.pesos };
  const pool = Object.values(CARTAS).filter((c) => elegivel(mao, c, m.fase));
  const out: CartaDef[] = [];
  const tirar = (cs: CartaDef[]) => {
    const tot = cs.reduce((s, c) => s + pesos[c.raridade as R], 0);
    let r = Math.random() * tot;
    for (const c of cs) { r -= pesos[c.raridade as R]; if (r <= 0) { out.push(c); return; } }
    if (cs.length) out.push(cs[cs.length - 1]);
  };
  if (m.garante) {
    const piso = ORDEM.indexOf(m.garante);
    const altas = pool.filter((c) => ORDEM.indexOf(c.raridade as R) >= piso);
    if (altas.length) tirar(altas);
  }
  while (out.length < 3) { const resto = pool.filter((c) => !out.includes(c)); if (!resto.length) break; tirar(resto); }
  return out;
}

// A "power player" ranking (higher = picked first), from the analysis of the numbers.
const RANK: Record<string, number> = {
  WPN_002: 100, WPN_008: 95, WPN_001: 90, DEF_001: 85, WPN_004: 80, DEF_003: 75, DEF_002: 70, EFF_001: 60,
  EFF_004: 58, EFF_011: 57, WPN_009: 55, EFF_002: 50, EFF_003: 49, EFF_006: 48, EFF_012: 47, MOV_003: 45,
  EFF_013: 44, EFF_007: 43, WPN_007: 40, DEF_004: 38, MOV_001: 35, DEF_005: 30, WPN_010: 25, EFF_010: 20,
};
type Pol = 'aleatorio' | 'forte';
const escolher = (op: CartaDef[], pol: Pol) =>
  pol === 'aleatorio' ? op[Math.floor(Math.random() * op.length)] : [...op].sort((a, b) => RANK[b.id] - RANK[a.id])[0];

// Boss DPS multiplier vs a big target (all pellets connect).
function mult(mao: string[]) {
  const tiros = mao.includes('WPN_002') ? 3 : mao.includes('WPN_001') ? 2 : 1;
  return tiros * Math.pow(1.15, q(mao, 'WPN_004')) * (mao.includes('WPN_008') ? 2 : 1);
}

const N = 50000;
for (const pol of ['aleatorio', 'forte'] as Pol[]) {
  const freq: Record<string, number> = {};
  const multBoss: Record<string, number[]> = { Torre: [], Capitania: [], Serpente: [], Nucleo: [] };
  let viuEpica = 0, cadeiaEletrica = 0, cadeiaFogo3 = 0, multiAntesCapitania = 0, cascoAntesF2 = 0;
  let pesadoMaisEletrico = 0, epicasOferecidas = 0, raridadeEscolhida: Record<string, number> = {};
  let duploDesperdicado = 0, mesasSemArmaOuDefesaForte = 0;
  for (let i = 0; i < N; i++) {
    const mao: string[] = [];
    let viu = false;
    MESAS.forEach((m, k) => {
      const op = sortear(mao, m);
      if (op.some((c) => c.raridade === 'epica')) { viu = true; epicasOferecidas++; }
      const fortes = ['WPN_002', 'WPN_008', 'WPN_001', 'DEF_001', 'WPN_004', 'DEF_003'];
      if (!op.some((c) => fortes.includes(c.id))) mesasSemArmaOuDefesaForte++;
      const c = escolher(op, pol);
      if (c.id === 'WPN_002' && mao.includes('WPN_001')) duploDesperdicado++;
      mao.push(c.id);
      raridadeEscolhida[c.raridade] = (raridadeEscolhida[c.raridade] ?? 0) + 1;
      for (const [b, n] of Object.entries(BOSS_APOS)) if (k + 1 === n) multBoss[b].push(mult(mao));
      if (k === 0 && mao.includes('DEF_001')) cascoAntesF2++;
      if (k === 2 && (mao.includes('WPN_001') || mao.includes('WPN_002'))) multiAntesCapitania++;
    });
    if (viu) viuEpica++;
    if (mao.includes('EFF_013')) cadeiaEletrica++;
    if (mao.includes('EFF_007')) cadeiaFogo3++;
    if (mao.includes('WPN_008') && mao.includes('EFF_011')) pesadoMaisEletrico++;
    for (const id of mao) freq[id] = (freq[id] ?? 0) + 1;
  }
  const pct = (x: number) => `${((100 * x) / N).toFixed(1)}%`;
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return `mediana x${s[Math.floor(s.length / 2)].toFixed(2)} · p90 x${s[Math.floor(s.length * 0.9)].toFixed(2)} · max x${s[s.length - 1].toFixed(2)}`; };
  console.log(`\n=== POLITICA: ${pol} (${N} campanhas, linhagem humana, 7 mesas) ===`);
  for (const b of Object.keys(multBoss)) console.log(`DPS no chefao ${b.padEnd(10)}: ${med(multBoss[b])}`);
  console.log(`tiro multiplo (Duplo/Triplo) antes da Capitania: ${pct(multiAntesCapitania)}`);
  console.log(`Casco ja na F2: ${pct(cascoAntesF2)}`);
  console.log(`viu ao menos 1 epica na campanha: ${pct(viuEpica)} · epicas oferecidas por campanha: ${(epicasOferecidas / N).toFixed(2)}`);
  console.log(`fechou a cadeia eletrica (Sobrecarga): ${pct(cadeiaEletrica)} · fechou o fogo ate Em Cadeia: ${pct(cadeiaFogo3)}`);
  console.log(`Pesado + Eletrico juntos: ${pct(pesadoMaisEletrico)} · Triplo por cima do Duplo (pick gasto): ${pct(duploDesperdicado)}`);
  console.log(`mesas sem nenhuma carta "forte" (de 7): ${(mesasSemArmaOuDefesaForte / N).toFixed(2)}`);
  const tot = Object.values(raridadeEscolhida).reduce((a, b) => a + b, 0);
  console.log('raridade escolhida:', Object.fromEntries(Object.entries(raridadeEscolhida).map(([k, v]) => [k, `${((100 * v) / tot).toFixed(1)}%`])));
  console.log('cartas na mao ao fim (% das campanhas):');
  console.log(Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([id, v]) => `  ${id} ${CARTAS[id].nome.padEnd(15)} ${CARTAS[id].raridade.padEnd(8)} ${pct(v)}`).join('\n'));
}
