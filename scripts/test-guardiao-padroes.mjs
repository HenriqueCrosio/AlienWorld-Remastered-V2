// THE GUARDIAN'S PATTERNS — the pure rules of step 2 (spec 2026-11-22-guardiao-coleira-design.md §5). From the root:
//   node --experimental-transform-types scripts/test-guardiao-padroes.mjs
import { miraSalva, angulosSalva, angulosPulso } from '../src/entities/guardiao/padroes.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const graus = (r) => (r * 180) / Math.PI;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// ── the aim ──
{
  conferir(Math.abs(miraSalva({ x: 200, y: 100 }, { x: 50, y: 100 }) - 180) < 1e-9, 'nave à esquerda na mesma altura: 180°', null);
  const alto = miraSalva({ x: 200, y: 100 }, { x: 50, y: 40 });
  conferir(alto > 180 && alto < 220, 'nave acima: o centro sobe (ângulo > 180° na tela, y para baixo)', alto);
  const atras = miraSalva({ x: 200, y: 100 }, { x: 260, y: 30 });
  conferir(atras <= 240 + 1e-9 && atras >= 120 - 1e-9, 'nave atrás dele: preso em 180 ± 60', atras);
}

// ── the salvo: odd puts a globule on the ship, even too (half-step offset), the opening is kept ──
for (const n of [3, 4, 5]) {
  for (const r of [0.1, 0.9]) {
    const a = angulosSalva(n, 96, 200, seq(r)).map(graus);
    const perto = Math.min(...a.map((x) => Math.abs(x - 200)));
    conferir(perto < 1e-6, `n=${n} (sorteio ${r}): um glóbulo exatamente na mira`, a);
    conferir(Math.abs(a[n - 1] - a[0] - 96) < 1e-6, `n=${n}: a abertura segue 96°`, a);
  }
}
{
  const lados = new Set([0.1, 0.9].map((r) => Math.sign(angulosSalva(4, 96, 200, seq(r)).map(graus).reduce((s, x) => s + x, 0) / 4 - 200)));
  conferir(lados.size === 2, 'n=4: o desvio de meio passo sorteia o lado', [...lados]);
}

// ── the lava pulses (22/11, his bullet-hell direction): a FIXED figure, A = n rays, B = n + 1 half a step off ──
{
  const graus2 = (L) => L.map(graus);
  const boca = { x: 218, y: 100 }, alvo = { x: 0, y: 110 };
  const A = graus2(angulosPulso(0, 7, 10, boca, alvo));
  const B = graus2(angulosPulso(1, 7, 10, boca, alvo));
  const A2 = graus2(angulosPulso(2, 7, 10, boca, alvo));
  conferir(A.length === 7 && B.length === 8, 'o pulso A tem 7 raios, o B tem 8', [A.length, B.length]);
  conferir(A.every((a, i) => Math.abs(a - A2[i]) < 1e-9), 'o 3º pulso repete o A (a figura não sorteia nada)', A2);
  const passos = A.slice(1).map((a, i) => a - A[i]);
  conferir(passos.every((p) => Math.abs(p - 10) < 1e-9), 'o A: raios a 10° um do outro', passos);
  const meios = A.slice(1).map((a, i) => (a + A[i]) / 2);
  conferir(meios.every((m) => B.some((b) => Math.abs(b - m) < 1e-9)), 'o B cai no meio de cada vão do A', { meios, B });
  const eixo = graus(Math.atan2(alvo.y - boca.y, alvo.x - boca.x));
  conferir(Math.abs(A[3] - eixo) < 1e-9 && Math.abs((B[3] + B[4]) / 2 - eixo) < 1e-9, 'as duas figuras centradas no eixo (o meio da borda esquerda)', { eixo, A3: A[3] });
}
// the rule he asked for: "cobra quem não percebe o padrão" — no parked spot survives both pulses. Over where the core
// really stops (the lunge aims ±70: core y 80–150; the leash puts it at x 215–232), in the ship's zone (x 20–80, the
// WHOLE screen height: the drops cross the arena walls, 22/11 — the ship can hug the screen edge, y 5–211), the widest
// run of parked-safe centers is a hairline at the corners (measured 22/11: ≤ 7 px up to x = 80). ⚠️ NEARER HIM (from x ≈ 90) the 7 rays
// don't reach the screen's top and bottom corners: a parked pocket that grows to 10–39 px by x 100–120, at his face — left OPEN, for him.
{
  const HIT = 5 + 4.5, alvo = { x: 0, y: 110 };
  let pior = 0, onde = null, livreMin = Infinity;
  for (const ox of [215, 232]) for (const oy of [80, 100, 126, 150]) {
    const boca = { x: ox, y: oy };
    const A = angulosPulso(0, 7, 10, boca, alvo), B = angulosPulso(1, 7, 10, boca, alvo);
    const ys = (L, x) => L.map((a) => oy + (x - ox) * Math.tan(a));
    for (let x = 20; x <= 80; x += 2) {
      let run = 0;
      for (let y = 5; y <= 211; y += 0.5) {
        run = [...ys(A, x), ...ys(B, x)].some((v) => Math.abs(v - y) < HIT) ? 0 : run + 0.5;
        if (run > pior) { pior = run; onde = { ox, oy, x, y }; }
      }
    }
    // the gap of ONE pulse at the ship's usual column (x 40–80) must fit the 9 px ship with room
    for (const x of [40, 60, 80]) {
      const s = ys(A, x).sort((p, q) => p - q);
      for (let i = 1; i < s.length; i++) if (s[i] > 35 && s[i - 1] < 185) livreMin = Math.min(livreMin, s[i] - s[i - 1] - 2 * 5);
    }
  }
  conferir(pior <= 7.5, 'parado, na tela inteira (x 20–80), nenhum fio seguro acima de 7 px', { pior, onde });
  conferir(livreMin >= 11, 'lendo, o vão de um pulso na coluna da nave tem ≥ 11 px livres (a nave tem 9)', livreMin);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
