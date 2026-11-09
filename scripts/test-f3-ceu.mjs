// The F3 casco sky's numbers (spec 2026-11-08-cenario-casco-arena): the keys, the depths and the baked art's size —
// the background law (384×216, scale 1; the clouds wrap at 384).   node scripts/test-f3-ceu.mjs
import sharp from 'sharp';
import { NUVENS_F3, CHAVE_CEU_F3, chavePinturaF3, PROFUNDIDADES_OCUPADAS_F3 } from '../src/f3/numerosCeuF3.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

ok(chavePinturaF3('ato1') === 'paintBgF3', 'ato 1: the old painting key (its profile unchanged)');
ok(chavePinturaF3('casco') === 'paintBgF3Casco', 'casco: its own key');
ok(chavePinturaF3('arena') === 'paintBgF3Arena', 'arena: its own key');
ok(CHAVE_CEU_F3 === 'f3Ceu', 'the sky key (his level 2, the only one baked)');

for (const n of NUVENS_F3) {
  ok(n.depth > -96 && n.depth < -75, `${n.chave}: between the painting (−96) and the casco (−75): ${n.depth}`);
  ok(!PROFUNDIDADES_OCUPADAS_F3.includes(n.depth), `${n.chave}: no tie with an existing depth`);
  ok(n.deriva < 0, `${n.chave}: drifts left on its own wind (${n.deriva} px/s)`);
}
ok(NUVENS_F3[0].depth < NUVENS_F3[1].depth && NUVENS_F3[0].fator < NUVENS_F3[1].fator, 'the far layer is behind and slower');

{
  const c = await sharp('public/sprites/f3casco/ceu.png').metadata();
  ok(c.width === 384 && c.height === 216, `ceu: 384×216 (${c.width}×${c.height})`);
  for (const k of ['longe', 'perto']) {
    const m = await sharp(`public/sprites/f3casco/nuvem-${k}.png`).metadata();
    ok(m.width === 384 && m.height === 216 && m.hasAlpha, `nuvem-${k}: 384×216 with alpha`);
  }
}

// the wrap: the last column and the first are neighbours in the cut (no seam when the TileSprite repeats)
{
  const { data } = await sharp('public/sprites/f3casco/nuvem-longe.png').raw().toBuffer({ resolveWithObject: true });
  let dif = 0;
  for (let y = 0; y < 216; y++) {
    const a = (y * 384 + 383) * 4, b = (y * 384) * 4;
    dif += Math.abs(data[a + 3] - data[b + 3]);
  }
  ok(dif / 216 < 12, `the clouds wrap without a seam (mean alpha step at x=384: ${(dif / 216).toFixed(1)})`);
}

const { PERFIS_FASE, PERFIL_DA_PINTURA, MS_DA_TROCA } = await import('../src/systems/atmosfera/perfis.ts');
ok(PERFIS_FASE.faseF3Casco && PERFIL_DA_PINTURA.paintBgF3Casco === PERFIS_FASE.faseF3Casco, 'paintBgF3Casco → faseF3Casco');
ok(PERFIS_FASE.faseF3Arena && PERFIL_DA_PINTURA.paintBgF3Arena === PERFIS_FASE.faseF3Arena, 'paintBgF3Arena → faseF3Arena');
ok(PERFIS_FASE.faseF3Arena?.poeira.quantidade <= PERFIS_FASE.faseF3Casco?.poeira.quantidade
  && PERFIS_FASE.faseF3Arena?.grao < PERFIS_FASE.faseF3Casco?.grao, 'the arena is cleaner (grain lower, no more dust)');
ok(MS_DA_TROCA?.paintBgF3Casco === 0, 'the casco profile cuts in behind the black');
ok(MS_DA_TROCA?.paintBgF3Arena > 0, 'the arena profile eases in during the silence');
ok(PERFIL_DA_PINTURA.paintBgF3 === PERFIS_FASE.faseF3, 'the Act 1 keeps its profile');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
