# A bomba de queda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a bomba deixa de limpar a tela e vira um objeto: cai em parábola na atmosfera (explode no solo), é arremessada reta no vácuo (explode no pavio), explode no contato e fere quem estiver no raio — inclusive as construções. A bomba antiga fica atrás de uma chave.

**Architecture:** `src/bombaRegras.ts` (sem Phaser) guarda os números, o lançamento por zona e o passo da física. `src/systems/Bombas.ts` cuida das bombas no ar e conversa com a cena por `HostBombas`. A `GameScene` ganha a chave `bombaModo`, a bomba antiga num método (`bombaDePanico`) e dois feridores reaproveitáveis (`ferirInimigo`, `ferirConstrucao`).

**Tech Stack:** TypeScript + Phaser 3.90; teste em node (`node scripts/test-*.mjs`); sondas Playwright com `npm run dev` no ar.

**Spec:** `docs/superpowers/specs/2026-10-03-bomba-de-queda-design.md`

## Global Constraints

- Raio **36px**, dano **12**, gravidade **420**, freio do `vx` até **−30 px/s** (fração 1,5/s), arremesso **+120 px/s**, pavio **1500ms** — todos no `BOMBA` do `bombaRegras.ts`.
- Quem decide atmosfera × vácuo é a ZONA (`this.zone`), não a condução.
- A bomba nova NÃO limpa tiro inimigo, NÃO dá invulnerável, NÃO fere a nave.
- A bomba antiga continua no código, inteira, em `bombaDePanico()`; `BOMBA.modo = 'panico'` a devolve.
- Comentários em pt-br no tom da casa; editar com a ferramenta Edit. Commits sem `Co-Authored-By`.

---

### Task 1: `src/bombaRegras.ts` — os números e a física

**Files:** Create `src/bombaRegras.ts` · Test `scripts/test-bomba-regras.mjs`

**Produces:** `type ZonaBomba = 'atmosfera' | 'vacuo'`, `type ModoBomba = 'queda' | 'panico'`, `BOMBA`, `interface EstadoBomba { x; y; vx; vy; gravidade; freia }`, `lancamento(zona, x, y, vx, vy): EstadoBomba & { pavioMs: number | null }`, `passo(b, dt): EstadoBomba`.

- [ ] **Step 1: o teste (falha)** — `scripts/test-bomba-regras.mjs`:

```js
// A BOMBA DE QUEDA (spec 2026-10-03-bomba-de-queda-design.md). Uso, da raiz: node scripts/test-bomba-regras.mjs
import { BOMBA, lancamento, passo } from '../src/bombaRegras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const voar = (b, s) => {
  for (let t = 0; t < s; t += 1 / 60) b = passo(b, 1 / 60);
  return b;
};

conferir(BOMBA.modo === 'queda', 'a bomba nova é a padrão (a de pânico fica guardada)', BOMBA.modo);

const a = lancamento('atmosfera', 100, 80, 40, -50);
conferir(a.x === 100 && a.y === 86 && a.vx === 40 && a.vy === -50 && a.pavioMs === null, 'atmosfera: solta da barriga com a velocidade da nave, sem pavio', a);
const a1 = voar(a, 1);
conferir(a1.y > a.y && a1.vy > 300, 'atmosfera: em 1s ela já desce rápido (gravidade)', a1);
const a3 = voar(a, 3);
conferir(Math.abs(a3.vx - BOMBA.freioAlvo) < 3, 'atmosfera: o ar leva o vx até o alvo (fica para trás aos poucos)', a3.vx);

const v = lancamento('vacuo', 100, 80, 20, 10);
conferir(v.x === 110 && v.vx === 20 + BOMBA.arremesso && v.vy === 10 && v.pavioMs === BOMBA.pavioMs, 'vácuo: arremessada à frente, com pavio', v);
const v1 = voar(v, 1);
conferir(Math.abs(v1.vx - v.vx) < 1e-9 && Math.abs(v1.vy - v.vy) < 1e-9, 'vácuo: segue reta, sem gravidade nem freio', v1);
conferir(Math.abs(v1.x - (v.x + v.vx)) < 1 && Math.abs(v1.y - (v.y + v.vy)) < 1, 'vácuo: anda a própria velocidade em 1s', v1);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

Run `node scripts/test-bomba-regras.mjs` → erro de módulo não encontrado.

- [ ] **Step 2: implementar** — `src/bombaRegras.ts` (código na seção abaixo, "Código do Task 1").
- [ ] **Step 3:** `node scripts/test-bomba-regras.mjs` → `TUDO OK`.
- [ ] **Step 4: commit** `feat(bomba): os números e a física da bomba de queda`.

**Código do Task 1:**

```ts
/**
 * A BOMBA DE QUEDA (spec `2026-10-03-bomba-de-queda-design.md`) — os números e a física, sem Phaser (testável em node).
 *
 * Na ATMOSFERA ela se SOLTA da barriga e cai em parábola, herdando a velocidade da nave; o ar freia o `vx` e ela fica
 * para trás aos poucos, como a de avião. No VÁCUO é ARREMESSADA para a frente e segue reta até o pavio (*"explode no
 * sentido que for jogada"*). Quem decide é a ZONA, não a condução: no LEGACY a F2 é vácuo.
 */
export type ZonaBomba = 'atmosfera' | 'vacuo';
export type ModoBomba = 'queda' | 'panico';

export const BOMBA = {
  /**
   * 'panico' DEVOLVE A BOMBA ANTIGA (limpa os tiros, fere todo mundo, 1s invulnerável) — guardada a pedido dele, 03/10:
   * *"guarde o que temos... se ficar ruim a nova mecânica, voltamos à antiga"*. Com as cartas, ela limpava onda fácil.
   */
  modo: 'queda' as ModoBomba,
  raio: 36,
  dano: 12,
  /** A mesma do flap (`FlapController.GRAVITY`): a bomba cai no mesmo mundo que a nave. */
  gravidade: 420,
  /** O ar leva o `vx` (px/s, na tela) até aqui: a bomba vai ficando para trás da nave enquanto cai. */
  freioAlvo: -30,
  /** Fração por segundo que o `vx` anda até o `freioAlvo`. */
  freio: 1.5,
  /** No vácuo, o empurrão para a frente (px/s), somado à velocidade da nave. */
  arremesso: 120,
  pavioMs: 1500,
};

export interface EstadoBomba {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravidade: number;
  freia: boolean;
}

/** Onde e como a bomba nasce: da barriga na atmosfera (sem pavio — explode no solo); à frente no vácuo (com pavio). */
export function lancamento(zona: ZonaBomba, x: number, y: number, vx: number, vy: number): EstadoBomba & { pavioMs: number | null } {
  if (zona === 'atmosfera') return { x, y: y + 6, vx, vy, gravidade: BOMBA.gravidade, freia: true, pavioMs: null };
  return { x: x + 10, y, vx: vx + BOMBA.arremesso, vy, gravidade: 0, freia: false, pavioMs: BOMBA.pavioMs };
}

/** Um passo da física (Euler semi-implícito: a velocidade primeiro, a posição com a velocidade nova). */
export function passo(b: EstadoBomba, dt: number): EstadoBomba {
  const vy = b.vy + b.gravidade * dt;
  const vx = b.freia ? b.vx + (BOMBA.freioAlvo - b.vx) * Math.min(1, BOMBA.freio * dt) : b.vx;
  return { ...b, x: b.x + vx * dt, y: b.y + vy * dt, vx, vy };
}
```

---

### Task 2: a `GameScene` — a bomba antiga guardada e os feridores

**Files:** Modify `src/scenes/GameScene.ts` (`useBomb`, `bulletHitProp`)

**Produces:** `bombaModo: ModoBomba` (campo da cena, começa em `BOMBA.modo`), `bombaDePanico()`, `ferirInimigo(e, dano)`, `ferirConstrucao(prop, dano)`. Sem mudança de comportamento ainda (o `'queda'` entra na Task 3).

- [ ] **Step 1:** o corpo de hoje do `useBomb` (do `cameras.main.flash` até o golfinho) vira `private bombaDePanico(): void`, com o comentário de cabeçalho *"A BOMBA DE PÂNICO — a de antes de 03/10, guardada inteira (`BOMBA.modo = 'panico'` a devolve)…"*; o laço dos inimigos dentro dele chama `this.ferirInimigo(e, 12)`.
- [ ] **Step 2:** `ferirInimigo(e, dano)` — o laço de hoje, extraído (hp, `medidas.dano('bomba', …)`, `matarInimigo` ou o tint de 60ms).
- [ ] **Step 3:** `ferirConstrucao(prop, dano)` — o miolo do `bulletHitProp` depois do `release`/`fx.hit` (hp, Infinity sai cedo, tint, porta, explode, score, destroy); o `bulletHitProp` passa a chamar `this.ferirConstrucao(prop, bullet.getData('damage') as number)`.
- [ ] **Step 4:** `useBomb()` gasta o estoque e chama `this.bombaDePanico()` (a Task 3 põe o `if`). Campo `bombaModo: ModoBomba = BOMBA.modo`.
- [ ] **Step 5:** `npx tsc --noEmit` limpo; a `probe-bomba` (que mede a de pânico) passa. Commit `refactor(bomba): a bomba de pânico num método, e os feridores de inimigo e construção`.

---

### Task 3: `src/systems/Bombas.ts` e a ligação na cena

**Files:** Create `src/systems/Bombas.ts` · Modify `src/scenes/GameScene.ts` (create, update, useBomb)

**Consumes:** Task 1 e os feridores da Task 2. **Produces:** `class Bombas { lancar(agora); tick(dt, agora); get quantas }`, `interface HostBombas`.

- [ ] **Step 1:** `Bombas.ts` — as bombas no ar (`Image` de textura `bomba`, provisória em código 8×4), `passo` por quadro, gira pelo ângulo da velocidade, some fora da tela, explode no SOLO (`GROUND_Y`, só na atmosfera), no PAVIO ou no CONTATO (o ponto da bomba dentro do corpo — com 2–3px de folga — de inimigo ativo, construção sólida ou alvo do chefão). A explosão fere no raio pela DISTÂNCIA AO CORPO (o ponto mais perto do retângulo): construções são altas e ancoradas no pé, e o chefão é grande — medir até o centro erraria os dois. Chefão: uma vez por explosão, se qualquer alvo dele estiver no raio. Snapshot das listas antes de ferir (matar destrói).
- [ ] **Step 2:** na cena: `this.bombas = new Bombas({...})` no `create` (depois de `terrain`, `weapons` e `cartas`); `this.bombas.tick(dt, time)` no `update` depois da arma; `useBomb` com `if (this.bombaModo === 'panico') this.bombaDePanico(); else this.bombas.lancar(this.time.now);`. O host: `zona()` = `this.zone`; `construcoes()` = props ativos e `TerrainSystem.solido`; `alvosDoChefe()` = `boss.targets ?? [boss.sprite]` (vazio sem chefão ou morto); `ferirChefe(d)` com `medidas.dano('bomba (chefão)', d)` e `killBoss`; `ferirGolfinho` pela distância ao `golfinho.sprite` (≤ raio + metade da largura) quando `vulneravel`; `explosao(x, y)` = `fx.explodeBig(x, y, 1)` + `cameras.main.shake(160, 0.006)`.
- [ ] **Step 3:** `npx tsc --noEmit`; commit `feat(bomba): a bomba de queda — parábola na atmosfera, arremesso no vácuo, contato e raio`.

---

### Task 4: as sondas

**Files:** Create `scripts/probe-bomba-queda.mjs` · Modify `scripts/probe-bomba.mjs`

- [ ] **Step 1:** `probe-bomba` — logo depois do jogo abrir: `scene.bombaModo = 'panico'` (ela mede a limpeza de tiros, que é da bomba antiga).
- [ ] **Step 2:** `probe-bomba-queda` (molde da `probe-teclas`, fase limpa): **F1** — nave no meio, Shift: o estoque cai 1, a bomba existe, 300ms depois está ABAIXO de onde nasceu, e some (explodiu) antes de 2s; uma `turret` posta no chão sob a nave (pelo `terrain.spawn` da cena) perde a vida. **F2** — Shift: a bomba anda para a FRENTE, o `y` quase não muda, e explode entre 1,3s e 1,8s. **Contato** — um drone parado 30px à frente da nave na F2: a bomba explode antes do pavio e o drone morre (12 ≥ hp do drone). **Pânico** — `bombaModo = 'panico'`: nenhuma bomba no ar e os tiros inimigos somem. Ajustar à cena real os nomes que a sonda supõe (o `spawn` do terreno, o hp do drone).
- [ ] **Step 3:** rodar `test-bomba-regras`, `npm run build`, `probe-bomba-queda`, `probe-bomba`, `probe-teclas`, `probe-sandbox`, `probe-cartas-novas`. Commit `test(bomba): a probe-bomba-queda, e a probe-bomba no modo pânico`.

---

### Task 5: o GIF e a documentação

- [ ] **Step 1:** GIF na velocidade REAL (o molde do `_gif-cartas.mjs`: `loop.sleep()` + `game.step` à mão, foto a cada 3 passos, 50ms por quadro) da queda na F1 e do arremesso no vácuo, lado a lado, em `docs/superpowers/folhas/2026-10-03/bomba/`.
- [ ] **Step 2:** HANDOFF (📍 de 03/10), a spec ("✅ implementada" + o que mudou), START de 02/10 (a bomba no "como testar"). Commit `docs(bomba): …`.
