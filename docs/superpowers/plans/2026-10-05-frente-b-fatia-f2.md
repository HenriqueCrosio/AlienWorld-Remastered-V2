# FRENTE B — Fatia F2 (Drone de Mineração + Sentinela Orbital + ondas maiores da F1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Os dois primeiros ELITES (mob elite no fluxo) jogáveis na F2 — Drone de Mineração (com o asteroide minerável) e Sentinela Orbital (escudo frontal) — mais as ondas maiores da F1, sobre uma base comum de elite que as fatias F3 e F4 reaproveitam.

**Architecture:** Cada elite é um `EnemyKind` do `EnemySystem` (cartas, placar e sandbox funcionam de graça); a máquina de estados mora em `src/entities/elites/<nome>.ts` atrás de `ComportamentoElite`, e as TRANSIÇÕES são funções puras em `src/elitesRegras.ts` (testadas em node). Os números moram em `src/data/numerosElites.ts`. Todo dano em inimigo passa por `GameScene.ferirInimigo` (tiro, bomba, cartas), que pergunta ao elite se ele BLOQUEIA (o escudo). Os tiros saem de `PadroesDeTiro` (mirado/leque/anel) sobre a piscina de tiros inimigos.

**Tech Stack:** Phaser 3.90 (Arcade), TypeScript (Vite), testes em node 24 importando `.ts` direto, sondas Playwright contra `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-10-05-frente-b-elites-design.md` (§2 arquitetura, §3 a fatia F2).

> **ESTADO (05/10, fim da sessão):** Tasks 1–11 FEITAS e empurradas, mais três rodadas de ajuste pedidas por ele (a
> rocha inteira, o drone dentro da cratera, o olho acendendo, a sentinela com propulsores e a SOBRECARGA, a luta com os
> dois tiros, o primeiro plano atenuado). O registro está no START `plans/2026-10-05-elites-retomada-START.md`. Falta só
> ele analisar o v3 e jogar.

## Global Constraints

- Elite **não segura o relógio** da fase; a fase pode ficar mais longa (§1.1.3).
- **Morto DURANTE o pisca, o drone morre SEM explodir** (§3.2.4).
- **O elétrico NÃO desfaz o escudo** nesta fatia (§5) — só trava (a trava pausa o relógio do estado, §2.7).
- Os números são chute e moram SÓ em `src/data/numerosElites.ts`.
- Módulos puros (`elitesRegras.ts`, `numerosElites.ts`) não importam Phaser e importam entre si COM a extensão `.ts`.
- Arte: provisória em código até ele aprovar a folha `folhas/2026-10-05/elites/elites-f2-em-jogo.png`; a definitiva entra pelas MESMAS chaves de textura (a provisória só nasce se o PNG não existir).
- Commits só com a autoria dele (sem `Co-Authored-By`). Código e comentários seguem o idioma do arquivo (pt-br).
- **Não edite `src/` enquanto uma gravação de GIF roda** (o Vite recarrega a página).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/data/numerosElites.ts` (novo) | os números provisórios dos elites |
| `src/elitesRegras.ts` (novo) | transições de estado e bloqueio — puras |
| `scripts/test-elites-regras.mjs` (novo) | testes em node das regras |
| `src/systems/PadroesDeTiro.ts` (novo) | mirado / leque / anel sobre a piscina de tiros inimigos |
| `src/entities/elites/tipos.ts` (novo) | `ComportamentoElite`, `CtxElite`, `GanchosElite` |
| `src/entities/elites/texturasProvisorias.ts` (novo) | as texturas em código até a arte entrar |
| `src/entities/elites/DroneMineracao.ts` (novo) | a máquina de estados do drone |
| `src/entities/elites/Sentinela.ts` (novo) | a máquina de estados da sentinela |
| `src/systems/EnemySystem.ts` | os dois `EnemyKind`, delegação ao elite, `bloqueia`, `ligarElites`, anel da aranha via `PadroesDeTiro` |
| `src/systems/DebrisSystem.ts` | o hazard `mineravel` e `spawnEm(kind, x, y)` |
| `src/scenes/GameScene.ts` | `ferirInimigo` único; ganchos dos elites |
| `src/systems/CartasEmJogo.ts`, `src/systems/cartas/contexto.ts` | o dano das cartas pelo caminho único (com o ponto de origem) |
| `src/systems/Bombas.ts` | a bomba passa o ponto da explosão |
| `src/sandbox/config.ts` | os elites na montagem |
| `src/systems/StageDirector.ts` | o roteiro novo da F2 e as ondas maiores da F1 |
| `scripts/probe-elites.mjs` (novo) | sonda no jogo real |

---

### Task 1: Os números e as regras puras (TDD)

**Files:**
- Create: `src/data/numerosElites.ts`
- Create: `src/elitesRegras.ts`
- Test: `scripts/test-elites-regras.mjs`

**Interfaces:**
- Produces: `ELITES` (objeto de números); `EstadoDrone`, `droneAvanca(estado, t, sinais)`, `droneExplode(estado, t)`; `EstadoSentinela`, `sentinelaAvanca(estado, t, sinais)`, `sentinelaBloqueia(estado, ex, ey, deX, deY)`, `escolherPosto(sorte, yAnterior)`.

- [ ] **Step 1: Escrever o teste que falha** — `scripts/test-elites-regras.mjs`:

```js
// OS ELITES DA F2 (spec 2026-10-05-frente-b-elites-design.md §3). Uso, da raiz: node scripts/test-elites-regras.mjs
import { ELITES } from '../src/data/numerosElites.ts';
import { droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escolherPosto } from '../src/elitesRegras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const D = ELITES.drone;
const S = ELITES.sentinela;
const calmo = { dist: 300, ferido: false, rochaViva: true, rochaX: 300 };

// ── O DRONE ──
conferir(droneAvanca('minerando', 5, calmo) === 'minerando', 'longe, intacto e com a rocha: segue minerando', calmo);
conferir(droneAvanca('minerando', 0, { ...calmo, dist: D.raioAlerta }) === 'alerta', 'a nave chegou perto: acorda', D.raioAlerta);
conferir(droneAvanca('minerando', 0, { ...calmo, ferido: true }) === 'alerta', 'levou tiro: acorda', null);
conferir(droneAvanca('minerando', 0, { ...calmo, rochaViva: false }) === 'alerta', 'a rocha quebrou: acorda na hora', null);
conferir(droneAvanca('minerando', 0, { ...calmo, rochaX: D.acordaAteX }) === 'alerta', 'a rocha passou do meio da tela: acorda (nunca sai minerando)', D.acordaAteX);
conferir(droneAvanca('alerta', D.alertaS - 0.01, calmo) === 'alerta' && droneAvanca('alerta', D.alertaS, calmo) === 'ataque', 'o alerta dura alertaS e vira ataque', D.alertaS);
conferir(droneAvanca('ataque', 1, calmo) === 'ataque', 'atacando, longe: segue atacando', null);
conferir(droneAvanca('ataque', 1, { ...calmo, dist: D.raioPisca }) === 'pisca', 'chegou perto: pisca', D.raioPisca);
conferir(droneAvanca('ataque', D.ataqueMaxS, calmo) === 'pisca', 'atacou tempo demais: pisca mesmo longe', D.ataqueMaxS);
conferir(droneAvanca('pisca', 99, calmo) === 'pisca', 'o pisca não volta atrás', null);
conferir(!droneExplode('pisca', D.piscaS - 0.01) && droneExplode('pisca', D.piscaS), 'explode quando o pisca TERMINA', D.piscaS);
conferir(!droneExplode('ataque', 99) && !droneExplode('minerando', 99), 'fora do pisca nunca explode', null);

// ── A SENTINELA ──
conferir(sentinelaAvanca('rolando', 9, { chegou: false, ciclos: 0 }) === 'rolando', 'rola até chegar ao posto', null);
conferir(sentinelaAvanca('rolando', 0, { chegou: true, ciclos: 0 }) === 'abrir', 'chegou: abre', null);
conferir(sentinelaAvanca('abrir', S.abrirS, { chegou: true, ciclos: 0 }) === 'fogo', 'abriu: fogo', S.abrirS);
conferir(sentinelaAvanca('fogo', S.fogoS - 0.01, { chegou: true, ciclos: 0 }) === 'fogo' && sentinelaAvanca('fogo', S.fogoS, { chegou: true, ciclos: 0 }) === 'fechar', 'o fogo dura fogoS', S.fogoS);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: 1 }) === 'rolando', 'fechou com ciclos sobrando: rola para outro posto', null);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: S.ciclos }) === 'saindo', `depois de ${S.ciclos} ciclos: vai embora`, S.ciclos);
conferir(sentinelaAvanca('saindo', 99, { chegou: true, ciclos: S.ciclos }) === 'saindo', 'saindo não volta', null);

// O ESCUDO: arco virado para a ESQUERDA (onde está a nave), só aberta.
conferir(sentinelaBloqueia('fogo', 300, 100, 200, 100), 'fogo: tiro de frente é bloqueado', null);
conferir(sentinelaBloqueia('abrir', 300, 100, 200, 110), 'abrir: o escudo já está subindo', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 300, 40), 'fogo: tiro de CIMA passa (flanquear funciona)', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 360, 100), 'fogo: tiro de trás passa', null);
conferir(!sentinelaBloqueia('fechar', 300, 100, 200, 100) && !sentinelaBloqueia('rolando', 300, 100, 200, 100), 'fechada ou rolando: sem escudo', null);

// O POSTO: na metade direita, longe do anterior na altura.
const seq = [0.1, 0.12, 0.13, 0.9, 0.5];
let i = 0;
const sorte = () => seq[i++ % seq.length];
const p = escolherPosto(sorte, S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]));
conferir(p.x >= S.postoX[0] && p.x <= S.postoX[1] && p.y >= S.postoY[0] && p.y <= S.postoY[1], 'o posto cai na faixa', p);
conferir(Math.abs(p.y - (S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]))) >= S.postoDistY, 'o posto novo foge da altura do anterior', p);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar** — `node scripts/test-elites-regras.mjs` → erro de módulo não encontrado (`numerosElites.ts`).

- [ ] **Step 3: Os números** — `src/data/numerosElites.ts`:

```ts
/**
 * OS NÚMEROS DOS ELITES (spec 2026-10-05-frente-b-elites-design.md §2.5) — UM endereço, como o `numerosCartas.ts`.
 * Todos são CHUTE até a calibragem no sandbox. Módulo PURO (sem Phaser): o `test-elites-regras` roda em node.
 * Tempos em segundos, distâncias em px de jogo (384×216), velocidades em px/s.
 */
export const ELITES = {
  drone: {
    hp: 10,
    score: 250,
    /** Acorda quando a nave chega a esta distância. */
    raioAlerta: 90,
    /** ...ou quando a rocha passa deste x (nunca atravessa a tela minerando). */
    acordaAteX: 190,
    alertaS: 0.4,
    velAtaque: 55,
    /** Quão rápido ele corrige o rumo para a nave (rad/s). */
    giro: 2.5,
    rajadaCadaS: 1.4,
    rajadaN: 3,
    rajadaEspacoS: 0.12,
    velTiro: 110,
    ataqueMaxS: 5,
    raioPisca: 34,
    piscaS: 0.6,
    raioExplosao: 30,
    estilhacos: 8,
    velEstilhaco: 100,
  },
  /** O asteroide minerável (o hazard `mineravel`). */
  rocha: { hp: 8, score: 40 },
  sentinela: {
    hp: 18,
    score: 350,
    velRolando: 120,
    /** O giro da roda (graus/s). */
    giroRolando: 540,
    abrirS: 0.5,
    fogoS: 2.5,
    fecharS: 0.5,
    ciclos: 3,
    /** A abertura TOTAL do arco do escudo, centrado na esquerda. */
    escudoArcoGraus: 120,
    rajadaCadaS: 0.8,
    rajadaN: 3,
    rajadaEspacoS: 0.1,
    anelN: 8,
    velTiro: 110,
    postoX: [230, 330] as const,
    postoY: [40, 176] as const,
    postoDistY: 50,
    velSaida: 140,
  },
};
```

- [ ] **Step 4: As regras** — `src/elitesRegras.ts`:

```ts
// Com a extensão: o `test-elites-regras` importa este módulo em node, que não resolve import sem ela.
import { ELITES } from './data/numerosElites.ts';

/**
 * AS REGRAS DOS ELITES (spec 2026-10-05-frente-b-elites-design.md §2.4) — quando cada um muda de estado e se o
 * escudo segura o golpe. PURAS: quem anda, atira e desenha é a classe do elite; aqui só se decide. `t` é o tempo
 * (s) no estado atual, contado pelo `update` — e o `update` NÃO roda com o inimigo travado (elétrico), então a
 * trava pausa estes relógios de graça (§2.7).
 */

export type EstadoDrone = 'minerando' | 'alerta' | 'ataque' | 'pisca';
export interface SinaisDrone {
  /** Distância até a nave. */
  dist: number;
  /** Já levou dano (hp < máximo). */
  ferido: boolean;
  rochaViva: boolean;
  rochaX: number;
}

export function droneAvanca(estado: EstadoDrone, t: number, s: SinaisDrone): EstadoDrone {
  const D = ELITES.drone;
  if (estado === 'minerando') {
    const acorda = s.ferido || !s.rochaViva || s.dist <= D.raioAlerta || s.rochaX <= D.acordaAteX;
    return acorda ? 'alerta' : 'minerando';
  }
  if (estado === 'alerta') return t >= D.alertaS ? 'ataque' : 'alerta';
  if (estado === 'ataque') return s.dist <= D.raioPisca || t >= D.ataqueMaxS ? 'pisca' : 'ataque';
  return 'pisca';
}

/**
 * A autodestruição acontece quando o pisca TERMINA — e só assim. ⚠️ Morto antes (inclusive NO pisca), ele morre pelo
 * caminho comum e não explode: matar tem de ser melhor do que deixar (a regra da mina sensora, GDD §6).
 */
export const droneExplode = (estado: EstadoDrone, t: number): boolean => estado === 'pisca' && t >= ELITES.drone.piscaS;

export type EstadoSentinela = 'rolando' | 'abrir' | 'fogo' | 'fechar' | 'saindo';
export interface SinaisSentinela {
  /** Chegou ao posto (só conta rolando). */
  chegou: boolean;
  /** Quantos FOGOS já terminaram. */
  ciclos: number;
}

export function sentinelaAvanca(estado: EstadoSentinela, t: number, s: SinaisSentinela): EstadoSentinela {
  const S = ELITES.sentinela;
  if (estado === 'rolando') return s.chegou ? 'abrir' : 'rolando';
  if (estado === 'abrir') return t >= S.abrirS ? 'fogo' : 'abrir';
  if (estado === 'fogo') return t >= S.fogoS ? 'fechar' : 'fogo';
  if (estado === 'fechar') {
    if (t < S.fecharS) return 'fechar';
    return s.ciclos >= S.ciclos ? 'saindo' : 'rolando';
  }
  return 'saindo';
}

/**
 * O ESCUDO: aberta (abrindo ou atirando), ela segura o que vem de FRENTE — o arco de `escudoArcoGraus` centrado na
 * esquerda, o lado da nave. `(deX, deY)` é de onde o golpe veio. Por cima, por baixo ou por trás, passa.
 */
export function sentinelaBloqueia(estado: EstadoSentinela, ex: number, ey: number, deX: number, deY: number): boolean {
  if (estado !== 'abrir' && estado !== 'fogo') return false;
  const ang = Math.atan2(deY - ey, deX - ex);
  const desvio = Math.abs(Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)));
  return desvio <= ((ELITES.sentinela.escudoArcoGraus / 2) * Math.PI) / 180;
}

/** O próximo posto: na metade direita, e pelo menos `postoDistY` longe da altura do anterior (até 8 sorteios). */
export function escolherPosto(sorte: () => number, yAnterior: number | null): { x: number; y: number } {
  const S = ELITES.sentinela;
  const x = S.postoX[0] + sorte() * (S.postoX[1] - S.postoX[0]);
  let y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  for (let i = 0; i < 8 && yAnterior !== null && Math.abs(y - yAnterior) < S.postoDistY; i++) {
    y = S.postoY[0] + sorte() * (S.postoY[1] - S.postoY[0]);
  }
  return { x, y };
}
```

- [ ] **Step 5: Rodar e ver passar** — `node scripts/test-elites-regras.mjs` → `TUDO OK`. `npm run typecheck` → sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/data/numerosElites.ts src/elitesRegras.ts scripts/test-elites-regras.mjs
git commit -m "feat(elites): os números e as regras puras dos elites da F2 (drone e sentinela), com o teste"
```

---

### Task 2: Os padrões de tiro (e o anel da aranha por eles)

**Files:**
- Create: `src/systems/PadroesDeTiro.ts`
- Modify: `src/systems/EnemySystem.ts` (construtor; o anel de 6 em `updateAranha`)

**Interfaces:**
- Produces: `class PadroesDeTiro { constructor(pool: Phaser.Physics.Arcade.Group, flash: Phaser.GameObjects.Particles.ParticleEmitter); disparar(x, y, angulo, vel, vestir?): boolean; mirado(x, y, alvoX, alvoY, vel, vestir?): void; leque(x, y, angulo, n, aberturaRad, vel, vestir?): void; anel(x, y, n, vel, fase?, vestir?): void }` e `EnemySystem.tiros: PadroesDeTiro`. `vestir(b)` troca a munição; sem ele, o tiro é o padrão (o `bolt2` magenta, aditivo — o mesmo de `fireAt`).

- [ ] **Step 1: Criar `src/systems/PadroesDeTiro.ts`**

```ts
import Phaser from 'phaser';

type Tiro = Phaser.Physics.Arcade.Sprite;

/**
 * OS PADRÕES DE TIRO DOS INIMIGOS (spec frente B §2.3) — mirado, leque e anel sobre a piscina de tiros inimigos que
 * já existe (`EnemySystem.enemyBullets`). Os elites atiram por aqui; a aranha também (o anel de 6 da aterrissagem).
 * O tempo ENTRE os tiros de uma rajada é de quem atira (no `update` dele): assim a trava do elétrico o pausa.
 */
export class PadroesDeTiro {
  constructor(
    private readonly pool: Phaser.Physics.Arcade.Group,
    private readonly flash: Phaser.GameObjects.Particles.ParticleEmitter,
  ) {}

  /** O tiro padrão do inimigo: o `bolt2` magenta, aditivo — o mesmo de `EnemySystem.fireAt`. */
  static vestirPadrao(b: Tiro): void {
    b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
    b.setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Um tiro. Devolve false se a piscina estiver cheia (o tiro é descartado, como em `fireAt`). */
  disparar(x: number, y: number, angulo: number, vel: number, vestir: (b: Tiro) => void = PadroesDeTiro.vestirPadrao): boolean {
    const b = this.pool.get(x, y) as Tiro | null;
    if (!b) {
      if (import.meta.env.DEV) console.warn('[inimigos] pool cheio, tiro descartado');
      return false;
    }
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    vestir(b);
    // Origem: a carência contra o relevo (ver GameScene).
    b.setData('ox', x);
    b.setData('oy', y);
    b.setVelocity(Math.cos(angulo) * vel, Math.sin(angulo) * vel);
    b.setRotation(angulo);
    return true;
  }

  mirado(x: number, y: number, alvoX: number, alvoY: number, vel: number, vestir?: (b: Tiro) => void): void {
    this.disparar(x, y, Phaser.Math.Angle.Between(x, y, alvoX, alvoY), vel, vestir);
    this.flash.explode(3, x, y);
  }

  /** `n` tiros espalhados em `aberturaRad` (total), centrados em `angulo`. */
  leque(x: number, y: number, angulo: number, n: number, aberturaRad: number, vel: number, vestir?: (b: Tiro) => void): void {
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? angulo : angulo - aberturaRad / 2 + (aberturaRad * i) / (n - 1);
      if (!this.disparar(x, y, a, vel, vestir)) break;
    }
    this.flash.explode(4, x, y);
  }

  /** `n` tiros radiais; `fase` gira o anel (rad). */
  anel(x: number, y: number, n: number, vel: number, fase = 0, vestir?: (b: Tiro) => void): void {
    for (let i = 0; i < n; i++) if (!this.disparar(x, y, (i / n) * Math.PI * 2 + fase, vel, vestir)) break;
    this.flash.explode(8, x, y);
  }
}
```

- [ ] **Step 2: Ligar no `EnemySystem`** — no topo, `import { PadroesDeTiro } from './PadroesDeTiro';`; na classe, `readonly tiros: PadroesDeTiro;`; no fim do construtor (depois de criar `this.muzzleFlash`): `this.tiros = new PadroesDeTiro(this.enemyBullets, this.muzzleFlash);`.

- [ ] **Step 3: O anel da aranha pelo padrão** — em `updateAranha`, troque o laço `for (let i = 0; i < 6; i++) { ... }` e o `this.muzzleFlash.explode(8, e.x, e.y + 16);` por:

```ts
      // O ANEL da aterrissagem: 6 tiros radiais, na MESMA munição de cobre do leque dela (ver `municaoAranha`).
      this.tiros.anel(e.x, e.y - 6, 6, 105, Math.PI / 12, (b) => EnemySystem.municaoAranha(b));
```

(mantenha o `this.scene.cameras.main.shake(110, 0.005);` logo depois.)

- [ ] **Step 4: Conferir** — `npm run typecheck` → limpo. `node scripts/probe-stage3.mjs` (com `npm run dev` rodando) → passa como antes (a aranha atira o anel).

- [ ] **Step 5: Commit**

```bash
git add src/systems/PadroesDeTiro.ts src/systems/EnemySystem.ts
git commit -m "refactor(inimigos): os padrões de tiro (mirado/leque/anel) num módulo — a aranha usa o anel"
```

---

### Task 3: O caminho ÚNICO do dano em inimigo

**Files:**
- Modify: `src/scenes/GameScene.ts` (`bulletHitEnemy`, `ferirInimigo`, `bombaDePanico`, host das cartas e das bombas)
- Modify: `src/systems/CartasEmJogo.ts` (`ferir`), `src/systems/cartas/contexto.ts`, `src/systems/cartas/ExplosaoDoJogador.ts`, `src/systems/cartas/Eletrico.ts`
- Modify: `src/systems/Bombas.ts`
- Modify: `src/systems/EnemySystem.ts` (`bloqueia`)

**Interfaces:**
- Consumes: nada novo.
- Produces: `EnemySystem.bloqueia(e, deX, deY): boolean` (por ora, sempre false — os elites ligam na Task 4); `GameScene.ferirInimigo(e, dano, fonte, de?, piscar = true): 'bloqueado' | 'vivo' | 'morto'`; `HostCartas.ferir(e, dano, fonte, de?)`; `Contexto.ferir(e, dano, fonte, de?)`; o host das bombas `ferirInimigo(e, dano, de?)`.

- [ ] **Step 1: `EnemySystem.bloqueia`** (logo depois de `empurrar`):

```ts
  /**
   * O golpe que veio de (deX, deY) é BLOQUEADO? (o escudo da Sentinela, spec frente B §2.2). Quem fere inimigo
   * pergunta aqui antes — `GameScene.ferirInimigo`, o caminho único do tiro, da bomba e das cartas.
   */
  bloqueia(e: Phaser.Physics.Arcade.Sprite, deX: number, deY: number): boolean {
    const def = DEFS[e.getData('kind') as EnemyKind];
    return def?.elite?.bloqueia?.(e, deX, deY) ?? false;
  }
```

(o campo `elite` do `EnemyDef` nasce na Task 4; até lá, declare-o já aqui: em `interface EnemyDef`, `elite?: { bloqueia?(e: Phaser.Physics.Arcade.Sprite, deX: number, deY: number): boolean };` — a Task 4 troca pelo tipo completo.)

- [ ] **Step 2: `GameScene.ferirInimigo` vira o caminho único** — substitua o método inteiro por:

```ts
  /**
   * O DANO EM INIMIGO — UM caminho (spec frente B §2.2): o tiro, as bombas e as cartas passam por aqui. Primeiro
   * pergunta se o golpe é BLOQUEADO (o escudo da Sentinela, pela direção de onde ele veio — `de`; sem `de`, como a
   * queima, não há o que bloquear). Depois tira a vida, conta nas medidas, pisca (as cartas não piscam) e mata pelo
   * `matarInimigo`. Antes eram três cópias, e um escudo que só uma delas consultasse seguraria o tiro e deixaria o
   * míssil passar.
   */
  private ferirInimigo(
    e: Phaser.Physics.Arcade.Sprite,
    dano: number,
    fonte: string,
    de?: { x: number; y: number },
    piscar = true,
  ): 'bloqueado' | 'vivo' | 'morto' {
    if (!e.active) return 'morto';
    if (de && this.enemies.bloqueia(e, de.x, de.y)) {
      this.medidas?.dano(`${fonte} (bloqueado)`, 0);
      return 'bloqueado';
    }
    const antes = e.getData('hp') as number;
    const hp = antes - dano;
    this.medidas?.dano(fonte, Math.min(dano, Math.max(0, antes)));
    e.setData('hp', hp);
    if (hp <= 0) {
      this.matarInimigo(e);
      return 'morto';
    }
    if (piscar) {
      e.setTint(0xffb0b0);
      this.time.delayedCall(40, () => {
        if (e.active) e.setTint(e.getData('tint') as number);
      });
    }
    return 'vivo';
  }
```

- [ ] **Step 3: `bulletHitEnemy` usa o caminho único** — troque do `this.fx.hit(bullet.x, bullet.y);` até o fim do método por:

```ts
    this.fx.hit(bullet.x, bullet.y);

    // De onde o tiro VEIO: um pouco atrás dele, no rumo do voo (o escudo decide por aqui).
    const v = (bullet.body as Phaser.Physics.Arcade.Body).velocity;
    const n = Math.hypot(v.x, v.y) || 1;
    const de = { x: bullet.x - (v.x / n) * 16, y: bullet.y - (v.y / n) * 16 };
    const bx = bullet.x;
    const by = bullet.y;
    const r = this.ferirInimigo(enemy, (bullet.getData('damage') as number) * fator, origem ?? 'tiro', de);
    // Bloqueado: o projétil morre no escudo (até o perfurante) e nenhuma carta dispara no acerto.
    if (r === 'bloqueado') {
      if (bullet.active) this.weapons.release(bullet);
      return;
    }
    this.cartas.aoAcertar(bx, by, enemy, origem, angulo);
  }
```

(⚠️ `aoAcertar` era chamado DEPOIS do `matarInimigo` no caminho da morte e antes no da vida; agora é sempre depois do dano — confira com `probe-cartas` e `probe-cartas-novas` no Step 7.)

- [ ] **Step 4: As bombas passam o ponto** — em `src/systems/Bombas.ts`, na interface do host troque `ferirInimigo(e: Corpo, dano: number): void;` por `ferirInimigo(e: Corpo, dano: number, de?: { x: number; y: number }): void;` e em `explodir` troque a chamada por `this.h.ferirInimigo(e, BOMBA.dano, { x, y })`. Na `GameScene`, o host das bombas vira `ferirInimigo: (e, dano, de) => { this.ferirInimigo(e, dano, 'bomba', de); },`; em `bombaDePanico`, `this.ferirInimigo(e, 12, 'bomba', { x: this.ship.x, y: this.ship.y });`.

- [ ] **Step 5: As cartas pelo caminho único** — em `src/systems/cartas/contexto.ts`:
  - em `HostCartas`, acrescente: `/** O dano pelo caminho único da cena (\`GameScene.ferirInimigo\`): bloqueio, vida, medidas, morte. \`de\` = de onde veio. */ ferir: (e: Inimigo, dano: number, fonte: string, de?: { x: number; y: number }) => void;`
  - em `Contexto`, troque a assinatura para `ferir: (e: Inimigo, dano: number, fonte: string, de?: { x: number; y: number }) => void;`

  Em `src/systems/CartasEmJogo.ts`: `ferir: (e, dano, fonte, de) => this.ferir(e, dano, fonte, de),` e o método vira:

```ts
  private ferir(e: Inimigo, dano: number, fonte: string, de?: { x: number; y: number }): void {
    if (!e.active) return;
    this.h.ferir(e, dano, fonte, de);
  }
```

  Na `GameScene`, no objeto do host das cartas (onde está `matar: (e) => this.matarInimigo(e),`), acrescente `ferir: (e, dano, fonte, de) => { this.ferirInimigo(e, dano, fonte, de, false); },`.

  Os pontos de origem: `ExplosaoDoJogador.ts:80` → `this.c.ferir(e, base.dano, \`explosão (${fonte})\`, { x, y })` (o centro da explosão — confira o nome das variáveis no escopo); `Eletrico.ts:72` → passe o ponto do acerto que o método já recebe (`{ x, y }` do choque); `Eletrico.ts:83` → `{ x, y }` do pulso. A queima (`CartasEmJogo.ts:232`) fica SEM `de`.

- [ ] **Step 6: Conferir** — `npm run typecheck` → limpo.

- [ ] **Step 7: As sondas antigas** (com `npm run dev`): `node scripts/probe-cartas.mjs`, `node scripts/probe-cartas-novas.mjs`, `node scripts/probe-bomba-queda.mjs`, `node scripts/probe-sandbox.mjs` → todas passam como em 04/10.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/CartasEmJogo.ts src/systems/cartas src/systems/Bombas.ts src/systems/EnemySystem.ts
git commit -m "refactor(dano): o dano em inimigo por UM caminho (tiro, bomba, cartas) — com a pergunta do bloqueio"
```

---

### Task 4: A base dos elites no `EnemySystem` (+ texturas provisórias + sandbox)

**Files:**
- Create: `src/entities/elites/tipos.ts`, `src/entities/elites/texturasProvisorias.ts`
- Modify: `src/systems/EnemySystem.ts`, `src/sandbox/config.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `PadroesDeTiro` (Task 2), `ELITES` (Task 1).
- Produces: `ComportamentoElite`, `CtxElite`, `GanchosElite` (abaixo); `EnemySystem.ligarElites(g: GanchosElite)`; `EnemyKind` ganha `'droneMineracao' | 'sentinela'` (as DEFS deles entram nas Tasks 6 e 7 — aqui entram com `elite` provisório nulo? NÃO: aqui entram só os TIPOS; os kinds nascem nas Tasks 6/7).

- [ ] **Step 1: `src/entities/elites/tipos.ts`**

```ts
import type Phaser from 'phaser';
import type { PadroesDeTiro } from '../../systems/PadroesDeTiro';

export type Sprite = Phaser.Physics.Arcade.Sprite;

/** O que a cena entrega aos elites — as únicas portas para fora do `EnemySystem`. */
export interface GanchosElite {
  /** Cria o asteroide minerável em (x, y) (`DebrisSystem.spawnEm('mineravel', …)`). */
  criarRocha: (x: number, y: number) => Sprite | null;
  /** A explosão INIMIGA em raio: o estouro e, se a nave estiver a `raio` px, o dano nela. */
  explodir: (x: number, y: number, raio: number) => void;
}

export interface CtxElite {
  scene: Phaser.Scene;
  /** A nave. */
  alvo: Sprite;
  tiros: PadroesDeTiro;
  ganchos: GanchosElite;
}

/**
 * UM ELITE (spec frente B §2.1): a máquina de estados de um inimigo do `EnemySystem`. O estado mora no próprio
 * sprite (`setData('elite', …)`). O `atualizar` NÃO é chamado com o inimigo travado (o elétrico), e o tranco já foi
 * aplicado antes dele.
 */
export interface ComportamentoElite {
  iniciar(e: Sprite, ctx: CtxElite): void;
  atualizar(e: Sprite, dt: number, ctx: CtxElite): void;
  /** O golpe que veio de (deX, deY) é bloqueado? */
  bloqueia?(e: Sprite, deX: number, deY: number): boolean;
}

/** Troca a textura E refaz a hitbox (o corpo do Arcade não acompanha a troca sozinho). */
export function vestir(e: Sprite, chave: string): void {
  if (e.texture.key !== chave) e.setTexture(chave);
  (e.body as Phaser.Physics.Arcade.Body).setSize(e.width * 0.6, e.height * 0.55);
}
```

- [ ] **Step 2: `src/entities/elites/texturasProvisorias.ts`** — formas em código nas chaves da arte, só se o PNG não existir:

```ts
import type Phaser from 'phaser';

/**
 * AS TEXTURAS PROVISÓRIAS DOS ELITES — até a arte aprovada entrar pelas MESMAS chaves (a `BootScene` carrega o PNG,
 * e aí esta função não desenha nada). Formas simples nas cores do bioma: o comportamento se testa sem esperar a arte.
 */
export function criarTexturasElites(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const fazer = (chave: string, w: number, h: number, desenhar: () => void): void => {
    if (scene.textures.exists(chave)) return;
    g.clear();
    desenhar();
    g.generateTexture(chave, w, h);
  };
  // O drone: corpo escuro, olho laranja à DIREITA (os sprites nascem apontando para a direita) e a broca.
  fazer('eliteDrone', 36, 24, () => {
    g.fillStyle(0x2a2d33).fillRoundedRect(2, 4, 26, 14, 5);
    g.fillStyle(0x4a4f58).fillRect(6, 18, 3, 5).fillRect(14, 18, 3, 5).fillRect(22, 18, 3, 5);
    g.fillStyle(0x6b6f78).fillTriangle(28, 9, 28, 15, 36, 12);
    g.fillStyle(0xff9a2e).fillRect(22, 8, 3, 3);
  });
  // A rocha: cinza-azulada com cristal laranja na face ESQUERDA (onde o drone trabalha).
  fazer('eliteRocha', 40, 40, () => {
    g.fillStyle(0x4a5866).fillCircle(22, 20, 17);
    g.fillStyle(0x34404c).fillCircle(26, 24, 10);
    g.fillStyle(0xffa640).fillTriangle(4, 18, 12, 12, 12, 24).fillTriangle(8, 28, 14, 22, 16, 30);
  });
  // A sentinela em RODA: esfera escura, olho vermelho.
  fazer('eliteSentinelaRoda', 26, 26, () => {
    g.fillStyle(0x2a2c31).fillCircle(13, 13, 12);
    g.lineStyle(1, 0x45484f).strokeCircle(13, 13, 8);
    g.fillStyle(0xff3030).fillRect(12, 12, 3, 3);
  });
  // A sentinela ABERTA: o anel em C, o núcleo com o canhão para a DIREITA e as três pernas.
  fazer('eliteSentinela', 36, 34, () => {
    g.lineStyle(4, 0x2f3238).beginPath().arc(14, 15, 12, Math.PI * 0.35, Math.PI * 1.65, false).strokePath();
    g.fillStyle(0x3a3d44).fillCircle(18, 15, 5);
    g.fillStyle(0x50545c).fillRect(22, 13, 12, 3);
    g.fillStyle(0xff3030).fillRect(17, 14, 2, 2);
    g.lineStyle(1, 0x3a3d44).lineBetween(18, 20, 10, 33).lineBetween(18, 20, 18, 33).lineBetween(18, 20, 26, 33);
  });
  // O escudo: um arco de energia (o lado convexo para a ESQUERDA).
  fazer('eliteEscudo', 12, 36, () => {
    g.lineStyle(2, 0xff6a6a, 0.9).beginPath().arc(26, 18, 22, Math.PI * 0.68, Math.PI * 1.32, false).strokePath();
    g.lineStyle(1, 0xffd0d0, 0.8).beginPath().arc(26, 18, 22, Math.PI * 0.72, Math.PI * 1.28, false).strokePath();
  });
  g.destroy();
}
```

- [ ] **Step 3: O `EnemySystem` delega** — em `src/systems/EnemySystem.ts`:
  - imports: `import type { ComportamentoElite, CtxElite, GanchosElite } from '../entities/elites/tipos';` e `import { criarTexturasElites } from '../entities/elites/texturasProvisorias';`
  - em `EnemyDef`, troque o `elite?` provisório da Task 3 por `/** O ELITE (frente B): a máquina de estados que assume o voo e o tiro (ver \`entities/elites\`). */ elite?: ComportamentoElite;`
  - campos: `private ganchos: GanchosElite = { criarRocha: () => null, explodir: () => {} };` e `private alvo: Phaser.Physics.Arcade.Sprite | null = null;`
  - no construtor, depois de `this.tiros = …`: `criarTexturasElites(scene);`
  - método:

```ts
  /** A cena liga as portas dos elites (a rocha do drone, a explosão inimiga) — ver `GanchosElite`. */
  ligarElites(g: GanchosElite): void {
    this.ganchos = g;
  }

  private ctxElite(alvo: Phaser.Physics.Arcade.Sprite): CtxElite {
    return { scene: this.scene, alvo, tiros: this.tiros, ganchos: this.ganchos };
  }
```

  - em `spawn`, no FIM do método: `if (def.elite && this.alvo) def.elite.iniciar(e, this.ctxElite(this.alvo));` — e, para o 1º elite antes de qualquer `update`, guarde o alvo também na cena: no início de `update`, `this.alvo = target;`. (O 1º `update` roda antes de qualquer onda do roteiro; no sandbox também.)
  - em `update`, logo DEPOIS do bloco `TRAVADO` (antes do `if (def.travessia === 'vertical')`):

```ts
      // O ELITE assume tudo (voo, tiro, culling próprio): nada do róster comum roda nele.
      if (def.elite) {
        def.elite.atualizar(e, dt, this.ctxElite(target));
        if (e.active && (e.x < -60 || e.x > GAME_WIDTH + 90 || e.y < -60 || e.y > GAME_HEIGHT + 60)) e.destroy();
        continue;
      }
```

- [ ] **Step 4: A cena liga os ganchos** — na `GameScene`, logo depois de criar `this.debris` (o `DebrisSystem` ganha `spawnEm` na Task 5; até lá, ligue só o `explodir`):

```ts
    // Os ELITES (frente B): a rocha do drone nasce no DebrisSystem (herda tiro, bomba e colisão) e a explosão dele
    // fere como a da mina.
    this.enemies.ligarElites({
      criarRocha: () => null,
      explodir: (x, y, raio) => {
        this.fx.explode(x, y, 1.8);
        this.cameras.main.shake(120, 0.006);
        if (Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) <= raio) this.damageShip();
      },
    });
```

- [ ] **Step 5: O sandbox conhece os elites** — em `src/sandbox/config.ts`: `INIMIGOS` ganha `'droneMineracao', 'sentinela'` (antes de `'aranha'`); `NOME_INIMIGO` ganha `droneMineracao: 'drone de mineração (elite)', sentinela: 'sentinela orbital (elite)'`; `MAX_POR_ONDA` ganha `droneMineracao: 5, sentinela: 5`; `PADRAO.inimigos` ganha `droneMineracao: 0, sentinela: 0`.

- [ ] **Step 6: Conferir** — `npm run typecheck` dá erro só onde o `EnemyKind` ainda não tem os dois nomes; acrescente-os agora ao `EnemyKind` (`| 'droneMineracao' | 'sentinela'`) e, para o `Record<EnemyKind, EnemyDef>` fechar, as DUAS entradas mínimas nas `DEFS` (a Task 6/7 completa o `elite`):

```ts
  // OS ELITES (frente B, spec 2026-10-05): a máquina de estados mora em `entities/elites`; `speed`/`fireRate` 0
  // porque quem anda e atira é ela.
  droneMineracao: { texture: 'eliteDrone', hp: ELITES.drone.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.drone.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0 },
  sentinela: { texture: 'eliteSentinelaRoda', hp: ELITES.sentinela.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.sentinela.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0 },
```

  (com `import { ELITES } from '../data/numerosElites';`). `npm run typecheck` → limpo. `node scripts/test-sandbox-arvore.mjs` → TUDO OK. `node scripts/probe-sandbox.mjs` → passa.

- [ ] **Step 7: Commit**

```bash
git add src/entities/elites src/systems/EnemySystem.ts src/sandbox/config.ts src/scenes/GameScene.ts
git commit -m "feat(elites): a base dos elites no EnemySystem — delegação, ganchos, texturas provisórias e o sandbox"
```

---

### Task 5: O asteroide minerável

**Files:**
- Modify: `src/systems/DebrisSystem.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Produces: `HazardKind` ganha `'mineravel'`; `DebrisSystem.spawnEm(kind: HazardKind, x: number, y: number): Phaser.Physics.Arcade.Sprite`.

- [ ] **Step 1: A definição** — em `HAZARDS`, depois de `destroco`:

```ts
  // O ASTEROIDE MINERÁVEL (frente B §3.1): a rocha do Drone de Mineração. Só nasce COM o drone (nunca no `mix` do
  // roteiro), não gira nem deriva na vertical — o drone está encaixado nela — e não espelha: o encaixe é à esquerda.
  mineravel: { texture: 'eliteRocha', hp: ELITES.rocha.hp, score: ELITES.rocha.score, scale: [1, 1], spin: [0, 0], drift: 0 },
```

(`import { ELITES } from '../data/numerosElites';`; se o `HazardDef` exigir campos que esta linha não tem, siga o que o TypeScript pedir com os valores neutros.)

- [ ] **Step 2: `spawnEm`** — refatore `spawn(kind)` para sortear o `y` e chamar `spawnEm(kind, GAME_WIDTH + 40, y)`; o corpo atual de `spawn` (do `pickVariant` ao fim) vira `spawnEm`, que DEVOLVE o sprite. Dentro dele, troque `h.setFlipX(Math.random() < 0.5);` por `if (kind !== 'mineravel') h.setFlipX(Math.random() < 0.5);`.

- [ ] **Step 3: O gancho real** — na `GameScene`, `criarRocha: (x, y) => this.debris.spawnEm('mineravel', x, y),`.

- [ ] **Step 4: Conferir** — `npm run typecheck` → limpo; `node scripts/probe-stage2.mjs` e `node scripts/probe-mina.mjs` → passam (o `spawn` sorteado segue igual).

- [ ] **Step 5: Commit**

```bash
git add src/systems/DebrisSystem.ts src/scenes/GameScene.ts
git commit -m "feat(elites): o asteroide minerável — um destroço do DebrisSystem que nasce onde o drone pede"
```

---

### Task 6: O Drone de Mineração

**Files:**
- Create: `src/entities/elites/DroneMineracao.ts`
- Modify: `src/systems/EnemySystem.ts` (a DEF ganha `elite: DRONE_MINERACAO`)

**Interfaces:**
- Consumes: `droneAvanca`, `droneExplode`, `ELITES`, `ComportamentoElite`, `vestir`.
- Produces: `DRONE_MINERACAO: ComportamentoElite`; o estado no sprite: `e.getData('elite')` = `{ fase: EstadoDrone; t: number; … }` (a sonda lê `fase`).

- [ ] **Step 1: `src/entities/elites/DroneMineracao.ts`**

```ts
import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { droneAvanca, droneExplode, type EstadoDrone } from '../../elitesRegras';
import type { ComportamentoElite, CtxElite, Sprite } from './tipos';

const D = ELITES.drone;

interface Estado {
  fase: EstadoDrone;
  t: number;
  rocha: Sprite | null;
  hpMax: number;
  /** Onde ele fica em relação ao centro da rocha (à esquerda dela, encaixado). */
  dx: number;
  rumo: number;
  cd: number;
  rajada: number;
  rajadaT: number;
}

/** As animações, se a arte já as registrou (a provisória é estática). */
const tocar = (e: Sprite, chave: string): void => {
  if (e.scene.anims.exists(chave) && e.anims.currentAnim?.key !== chave) e.play(chave);
};

/**
 * O DRONE DE MINERAÇÃO (spec frente B §3.2): nasce TRABALHANDO, encaixado num asteroide minerável. MINERANDO (não
 * ataca — a janela de matar antes) → ALERTA (recolhe a broca, vira para a nave) → ATAQUE (vem de encontro atirando
 * rajadas) → PISCA (o núcleo pisca) → explode em raio com estilhaços em anel. ⚠️ Morto no pisca, não explode: a
 * explosão só sai daqui, quando o pisca termina (`droneExplode`).
 */
export const DRONE_MINERACAO: ComportamentoElite = {
  iniciar(e, ctx) {
    const rocha = ctx.ganchos.criarRocha(e.x + 24, e.y);
    // De frente para a ROCHA (à direita dele): os sprites nascem apontando para a direita.
    e.setFlipX(false);
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const dx = rocha ? -(rocha.displayWidth / 2 + e.displayWidth * 0.3) : 0;
    const s: Estado = { fase: 'minerando', t: 0, rocha, hpMax: e.getData('hp') as number, dx, rumo: Math.PI, cd: D.rajadaCadaS * 0.5, rajada: 0, rajadaT: 0 };
    e.setData('elite', s);
    if (rocha) e.setPosition(rocha.x + dx, rocha.y);
    tocar(e, 'elite-drone-minerar');
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
    const rochaViva = s.rocha?.active === true;
    const prox = droneAvanca(s.fase, s.t, {
      dist,
      ferido: (e.getData('hp') as number) < s.hpMax,
      rochaViva,
      rochaX: rochaViva ? s.rocha!.x : -999,
    });
    if (prox !== s.fase) {
      s.fase = prox;
      s.t = 0;
      if (prox === 'alerta') tocar(e, 'elite-drone-alerta');
      if (prox === 'ataque') {
        s.rumo = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
        tocar(e, 'elite-drone-voo');
      }
    }

    if (s.fase === 'minerando' && rochaViva) {
      // Encaixado: anda com a rocha (que anda no scroll).
      body.setVelocity(0, 0);
      e.setPosition(s.rocha!.x + s.dx, s.rocha!.y);
    } else if (s.fase === 'alerta') {
      body.setVelocity(0, 0);
      e.setFlipX(ctx.alvo.x < e.x);
    } else if (s.fase === 'ataque') {
      voar(e, s, dt, ctx);
      atirar(e, s, dt, ctx);
    } else if (s.fase === 'pisca') {
      body.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9);
      // O NÚCLEO PISCA: branco-quente e normal, rápido — o telégrafo da explosão.
      if (Math.floor(s.t * 16) % 2 === 0) e.setTintFill(0xffd27a);
      else e.setTint(e.getData('tint') as number);
      if (droneExplode(s.fase, s.t)) {
        ctx.tiros.anel(e.x, e.y, D.estilhacos, D.velEstilhaco, Math.random() * Math.PI);
        ctx.ganchos.explodir(e.x, e.y, D.raioExplosao);
        e.destroy();
      }
    }
  },
};

/** Vem de encontro: o rumo vira para a nave a `giro` rad/s (não teleguia na hora — dá para desviar). */
function voar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  const alvo = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
  s.rumo = Phaser.Math.Angle.RotateTo(s.rumo, alvo, D.giro * dt);
  (e.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(s.rumo) * D.velAtaque, Math.sin(s.rumo) * D.velAtaque);
  e.setFlipX(Math.cos(s.rumo) < 0);
}

/** A RAJADA: `rajadaN` tiros mirados, `rajadaEspacoS` entre eles, uma a cada `rajadaCadaS`. */
function atirar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  if (s.rajada > 0) {
    s.rajadaT -= dt;
    if (s.rajadaT <= 0) {
      ctx.tiros.mirado(e.x, e.y, ctx.alvo.x, ctx.alvo.y, D.velTiro);
      s.rajada--;
      s.rajadaT = D.rajadaEspacoS;
    }
    return;
  }
  s.cd -= dt;
  if (s.cd <= 0) {
    s.cd = D.rajadaCadaS;
    s.rajada = D.rajadaN;
    s.rajadaT = 0;
  }
}
```

- [ ] **Step 2: Ligar** — em `EnemySystem`, `import { DRONE_MINERACAO } from '../entities/elites/DroneMineracao';` e a DEF `droneMineracao` ganha `elite: DRONE_MINERACAO`.

- [ ] **Step 3: Conferir à mão** — `npm run typecheck` → limpo. No sandbox (`http://localhost:5173/?sandbox`, fase 2, só `drone de mineração (elite)` = 1): ele entra encaixado na rocha, acorda quando a nave chega perto, vem atirando rajadas de 3 e explode; matá-lo no pisca não explode. (A sonda da Task 8 verifica isto automaticamente.)

- [ ] **Step 4: Commit**

```bash
git add src/entities/elites/DroneMineracao.ts src/systems/EnemySystem.ts
git commit -m "feat(elites): o Drone de Mineração — minera, acorda, vem atirando e se autodestrói"
```

---

### Task 7: A Sentinela Orbital

**Files:**
- Create: `src/entities/elites/Sentinela.ts`
- Modify: `src/systems/EnemySystem.ts` (a DEF ganha `elite: SENTINELA`)

**Interfaces:**
- Consumes: `sentinelaAvanca`, `sentinelaBloqueia`, `escolherPosto`, `ELITES`, `vestir`.
- Produces: `SENTINELA: ComportamentoElite`; estado no sprite `{ fase: EstadoSentinela; t; ciclos; … }`.

- [ ] **Step 1: `src/entities/elites/Sentinela.ts`**

```ts
import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { escolherPosto, sentinelaAvanca, sentinelaBloqueia, type EstadoSentinela } from '../../elitesRegras';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const S = ELITES.sentinela;

interface Estado {
  fase: EstadoSentinela;
  t: number;
  ciclos: number;
  posto: { x: number; y: number };
  rajada: number;
  rajadaT: number;
  cd: number;
  anel: boolean;
  escudo: Phaser.GameObjects.Image | null;
}

const tocar = (e: Sprite, chave: string): void => {
  if (e.scene.anims.exists(chave) && e.anims.currentAnim?.key !== chave) e.play(chave);
};

/**
 * A SENTINELA ORBITAL (spec frente B §3.3) — à la droideka: ROLANDO (a roda girando até um posto na metade direita)
 * → ABRIR (desdobra e ergue o ESCUDO em arco, virado para a nave) → FOGO (rajadas miradas e um anel) → FECHAR (sem
 * escudo: a janela) → rola para outro posto. Depois de `ciclos` fogos, vai embora rolando. O escudo segura o que vem
 * de FRENTE (`sentinelaBloqueia`); por cima, por baixo ou por trás passa. ⚠️ O elétrico NÃO o desfaz (rebalanceamento).
 */
export const SENTINELA: ComportamentoElite = {
  iniciar(e) {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    const s: Estado = { fase: 'rolando', t: 0, ciclos: 0, posto: escolherPosto(Math.random, null), rajada: 0, rajadaT: 0, cd: 0, anel: false, escudo: null };
    e.setData('elite', s);
    e.once('destroy', () => s.escudo?.destroy());
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    const chegou = s.fase === 'rolando' && Phaser.Math.Distance.Between(e.x, e.y, s.posto.x, s.posto.y) < 3;
    const prox = sentinelaAvanca(s.fase, s.t, { chegou, ciclos: s.ciclos });
    if (prox !== s.fase) entrar(e, s, prox);

    if (s.fase === 'rolando' || s.fase === 'saindo') {
      const vx = s.fase === 'saindo' ? -S.velSaida : 0;
      if (s.fase === 'rolando') {
        const a = Phaser.Math.Angle.Between(e.x, e.y, s.posto.x, s.posto.y);
        const d = Phaser.Math.Distance.Between(e.x, e.y, s.posto.x, s.posto.y);
        const v = Math.min(S.velRolando, d / Math.max(dt, 1e-3));
        body.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
      } else {
        body.setVelocity(vx, 0);
      }
      // A RODA GIRA no sentido de quem rola para a esquerda.
      e.rotation -= Phaser.Math.DegToRad(S.giroRolando) * dt;
    } else {
      body.setVelocity(0, 0);
    }

    if (s.escudo) s.escudo.setPosition(e.x - e.displayWidth * 0.5, e.y).setAlpha(s.fase === 'abrir' ? Math.min(1, s.t / S.abrirS) : 0.75 + 0.25 * Math.sin(s.t * 18));
    if (s.fase === 'fogo') atirar(e, s, dt, ctx);
  },

  bloqueia(e, deX, deY) {
    const s = e.getData('elite') as Estado | undefined;
    return s ? sentinelaBloqueia(s.fase, e.x, e.y, deX, deY) : false;
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoSentinela): void {
  if (s.fase === 'fogo') s.ciclos++;
  s.fase = fase;
  s.t = 0;
  if (fase === 'abrir') {
    e.setRotation(0);
    vestir(e, 'eliteSentinela');
    // Virada para a nave: a arte nasce apontando para a direita.
    e.setFlipX(true);
    tocar(e, 'elite-sentinela-abrir');
    s.escudo ??= e.scene.add.image(e.x, e.y, 'eliteEscudo').setDepth(e.depth + 1);
    s.escudo.setVisible(true).setAlpha(0);
    s.cd = 0.3;
    s.anel = false;
  } else if (fase === 'fechar') {
    s.escudo?.setVisible(false);
    tocar(e, 'elite-sentinela-fechar');
  } else if (fase === 'rolando' || fase === 'saindo') {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    s.escudo?.setVisible(false);
    if (fase === 'rolando') s.posto = escolherPosto(Math.random, s.posto.y);
  }
}

/** O FOGO: rajadas miradas de `rajadaN`, uma a cada `rajadaCadaS`, e UM anel no meio do fogo. */
function atirar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  const boca = { x: e.x - e.displayWidth * 0.4, y: e.y - 2 };
  if (!s.anel && s.t >= S.fogoS / 2) {
    s.anel = true;
    ctx.tiros.anel(e.x, e.y, S.anelN, S.velTiro * 0.8, Math.random() * Math.PI);
  }
  if (s.rajada > 0) {
    s.rajadaT -= dt;
    if (s.rajadaT <= 0) {
      ctx.tiros.mirado(boca.x, boca.y, ctx.alvo.x, ctx.alvo.y, S.velTiro);
      s.rajada--;
      s.rajadaT = S.rajadaEspacoS;
    }
    return;
  }
  s.cd -= dt;
  if (s.cd <= 0) {
    s.cd = S.rajadaCadaS;
    s.rajada = S.rajadaN;
    s.rajadaT = 0;
  }
}
```

- [ ] **Step 2: Ligar** — em `EnemySystem`, `import { SENTINELA } from '../entities/elites/Sentinela';` e a DEF `sentinela` ganha `elite: SENTINELA`.

- [ ] **Step 3: Conferir** — `npm run typecheck` → limpo; no sandbox (fase 2, `sentinela orbital (elite)` = 1): rola, abre com o arco, atira, fecha, repete 3× e sai rolando; o tiro de frente não tira vida na abertura, por cima tira.

- [ ] **Step 4: Commit**

```bash
git add src/entities/elites/Sentinela.ts src/systems/EnemySystem.ts
git commit -m "feat(elites): a Sentinela Orbital — rola, abre com o escudo frontal, atira, fecha e vai embora"
```

---

### Task 8: A sonda dos elites

**Files:**
- Create: `scripts/probe-elites.mjs`

- [ ] **Step 1: Escrever a sonda**

```js
// OS ELITES DA F2 NO JOGO REAL (spec 2026-10-05-frente-b-elites-design.md §3.7). Uso: node scripts/probe-elites.mjs
// (com `npm run dev` rodando). Joga no sandbox, fase 2, invulnerável, e chama cada elite pelo EnemySystem.
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({
    fase: 2, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0 },
  }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3'); // invulnerável

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const espera = (ms) => page.waitForTimeout(ms);
const G = () => window.__game.scene.getScene('Game');

// ── O DRONE ──
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 40);
  s.enemies.spawn('droneMineracao', 150);
});
await espera(400);
let d = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  const rochas = s.debris.hazards.getChildren().filter((h) => h.active && h.getData('kind') === 'mineravel');
  return { fase: e?.getData('elite')?.fase, rochas: rochas.length, colado: rochas[0] ? Math.abs(rochas[0].y - e.y) < 1 : false };
});
conferir(d.fase === 'minerando' && d.rochas === 1 && d.colado, 'o drone nasce minerando, encaixado na rocha dele', d);

// Quebrar a rocha acorda o drone.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.debris.hazards.getChildren().find((h) => h.active && h.getData('kind') === 'mineravel');
  s.killHazard(r);
});
await espera(700);
d = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao')?.getData('elite')?.fase);
conferir(d === 'ataque', 'a rocha quebrada acorda o drone, e depois do alerta ele ataca', d);

// Ele atira enquanto vem.
const tirosAntes = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.countActive(true));
await espera(1800);
const tirosDepois = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.countActive(true));
conferir(tirosDepois > tirosAntes, 'atacando, ele atira', { tirosAntes, tirosDepois });

// Perto da nave: pisca; morto NO pisca, não explode (nenhum anel de estilhaços).
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  s.ship.setPosition(e.x - 20, e.y);
});
await espera(150);
const pisca = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  const fase = e?.getData('elite')?.fase;
  s.ferirInimigo(e, 99, 'probe');
  return { fase, vivo: e.active };
});
await espera(800);
const estilhacos = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.countActive(true));
conferir(pisca.fase === 'pisca' && !pisca.vivo && estilhacos === 0, 'morto no pisca: morre sem explodir', { ...pisca, estilhacos });

// Deixado em paz, explode com o anel.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 40);
  s.enemies.spawn('droneMineracao', 120);
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'droneMineracao');
  s.ferirInimigo(e, 1, 'probe'); // ferido: acorda
});
await page.waitForFunction(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'droneMineracao'), null, { timeout: 12000 });
const anel = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.countActive(true));
conferir(anel >= 6, 'deixado em paz, ele pisca e explode soltando o anel', anel);

// ── A SENTINELA ──
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
  s.ship.setPosition(40, 108);
  s.enemies.spawn('sentinela', 108);
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela')?.getData('elite')?.fase === 'fogo', null, { timeout: 10000 });
const escudo = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  const hp0 = e.getData('hp');
  const frente = s.ferirInimigo(e, 1, 'probe', { x: e.x - 40, y: e.y });
  const missil = s.ferirInimigo(e, 1, 'míssil', { x: e.x - 30, y: e.y + 8 });
  const cima = s.ferirInimigo(e, 1, 'probe', { x: e.x, y: e.y - 40 });
  return { frente, missil, cima, perdeu: hp0 - e.getData('hp') };
});
conferir(escudo.frente === 'bloqueado' && escudo.missil === 'bloqueado' && escudo.cima === 'vivo' && escudo.perdeu === 1, 'aberta: o escudo segura a frente (tiro e míssil); por cima passa', escudo);

// O tiro DE VERDADE: a nave na frente, atirando — a vida não cai no fogo.
const hpAntes = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela').getData('hp'));
await page.keyboard.down('Space');
await espera(700);
await page.keyboard.up('Space');
const real = await page.evaluate(() => {
  const e = window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.getData('kind') === 'sentinela');
  return { hp: e.getData('hp'), fase: e.getData('elite').fase };
});
conferir(real.fase !== 'fogo' || real.hp === hpAntes, 'o tiro real de frente não fere a sentinela no fogo', { hpAntes, ...real });

// Depois dos ciclos, ela vai embora.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(40, 20);
});
await page.waitForFunction(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'sentinela'), null, { timeout: 30000 }).catch(() => {});
const foi = await page.evaluate(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.getData('kind') === 'sentinela'));
conferir(foi, 'depois dos ciclos, a sentinela vai embora rolando', foi);

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

(Se a montagem salva parcial não abrir a fase 2, confira `carregar()` em `src/sandbox/config.ts`: ele mescla com o `PADRAO`.) Note a ordem: o tiro real da nave pode MATAR a sentinela se ela fechar no meio — por isso a conferência aceita `fase !== 'fogo'`.

- [ ] **Step 2: Rodar** — `node scripts/probe-elites.mjs` → `TUDO OK`. Se alguma falhar, é defeito do código das Tasks 4–7 (corrija lá; não afrouxe a sonda).

- [ ] **Step 3: Commit**

```bash
git add scripts/probe-elites.mjs
git commit -m "test(elites): a sonda dos elites da F2 no jogo real"
```

---

### Task 9: O roteiro — a F2 com os elites e a F1 com ondas maiores

**Files:**
- Modify: `src/systems/StageDirector.ts` (`STAGE_1`, `STAGE_2`)

- [ ] **Step 1: A F2 (de 75s para ~92s no chefão)** — substitua o `STAGE_2` inteiro pelo roteiro abaixo (mantendo os comentários antigos nos blocos que não mudaram; os novos estão marcados):

```ts
export const STAGE_2: StageEvent[] = [
  { t: 0.5, type: 'banner', text: 'CINTURÃO DE DESTROÇOS · FROTA MORTA' },
  { t: 1, type: 'hazard', rate: 1.4, mix: ['asteroid'] },
  { t: 5, type: 'wave', kind: 'drone', count: 4, spacing: 0.4, y: 80 },
  { t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.4, y: 130 },

  // ─── O DRONE DE MINERAÇÃO ENTRA AQUI, E SOZINHO (frente B, 05/10) ───
  // No campo de asteroides da abertura, que é a casa dele: um asteroide minerável com o drone trabalhando. A
  // primeira vez é sozinha — o jogador tem que ver a broca, ver ele ACORDAR e descobrir que atirar antes resolve.
  { t: 13, type: 'banner', text: 'SINAL DE MINERAÇÃO' },
  { t: 13.5, type: 'wave', kind: 'droneMineracao', count: 1, spacing: 0, y: 100 },

  { t: 19, type: 'banner', text: 'RESTOS DA 3ª FROTA' },
  { t: 20, type: 'hazard', rate: 1.2, mix: ['asteroid', 'asteroid', 'destroco'] },
  { t: 21, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 60 },
  { t: 24, type: 'wave', kind: 'batedor', count: 5, spacing: 0.32, y: 110 },

  { t: 28, type: 'banner', text: 'CAMPO MINADO · SENSORES ATIVOS' },
  { t: 29, type: 'hazard', rate: 2.0, mix: ['sensor', 'asteroid'] },
  { t: 33, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 70 },
  { t: 36, type: 'hazard', rate: 1.15, mix: ['asteroid', 'sensor', 'mina', 'destroco'] },
  { t: 37, type: 'wave', kind: 'drone', count: 6, spacing: 0.25, y: 120 },

  { t: 40, type: 'banner', text: 'CONTATO · INTERCEPTADORES' },
  { t: 41, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.8, y: 90 },
  { t: 45, type: 'hazard', rate: 1.2, mix: ['asteroid', 'destroco', 'sensor', 'mina'] },
  { t: 46, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.7, y: 60 },
  // O DRONE COBRADO (frente B): minerando no meio dos kamikazes — quem só desvia deixa ele acordar.
  { t: 47, type: 'wave', kind: 'droneMineracao', count: 1, spacing: 0, y: 150 },
  { t: 48, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 130 },

  { t: 52, type: 'banner', text: 'CARGUEIRO INIMIGO' },
  { t: 53, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 80 },
  { t: 56, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 120 },
  { t: 58, type: 'wave', kind: 'batedor', count: 4, spacing: 0.3, y: 55 },

  // ─── A SENTINELA ORBITAL ENTRA AQUI, E SOZINHA (frente B, 05/10) ───
  // Depois do cargueiro, num céu limpo: ela rola, abre, ergue o escudo e atira. O jogador tem que ver o tiro dele
  // MORRER no escudo e descobrir as duas saídas — flanquear ou esperar ela fechar. A deriva continua (só rocha).
  { t: 63, type: 'hazard', rate: 1.6, mix: ['asteroid'] },
  { t: 63.5, type: 'banner', text: 'SENTINELA ORBITAL' },
  { t: 64, type: 'wave', kind: 'sentinela', count: 1, spacing: 0, y: 108 },

  { t: 76, type: 'banner', text: 'ENXAME' },
  { t: 76.5, type: 'hazard', rate: 0.85, mix: ['asteroid', 'destroco', 'sensor', 'mina'] },
  { t: 77, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 70 },
  { t: 78, type: 'wave', kind: 'droneMineracao', count: 1, spacing: 0, y: 160 },
  { t: 79, type: 'wave', kind: 'kamikaze', count: 5, spacing: 0.5, y: 100 },
  { t: 82, type: 'wave', kind: 'drone', count: 8, spacing: 0.2, y: 60 },
  { t: 84, type: 'wave', kind: 'batedor', count: 6, spacing: 0.25, y: 140 },
  { t: 86, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 80 },
  // A SENTINELA COBRADA no lugar da 2ª canhoneira (frente B §3.4).
  { t: 87, type: 'wave', kind: 'sentinela', count: 1, spacing: 0, y: 120 },

  { t: 92, type: 'hazard', rate: 0, mix: [] },
  { t: 94, type: 'banner', text: 'ALERTA · CANHONEIRA-CAPITÂNIA' },
  { t: 97, type: 'boss' },
];
```

  E atualize o comentário do topo da Fase 2: `Duração ~78s` → `Duração ~97s (frente B: os elites)` e acrescente ao RITMO `→ drone de mineração (13s) … → sentinela orbital (64s)`.

- [ ] **Step 2: A F1 com ondas maiores** — no `STAGE_1`, sem mudar o relevo nem a ordem, aumente as levas (o flap aguenta volume de drone/batedor; as canhoneiras ficam em 2 — playtest de 14/07):
  - `t: 4` drone `count: 4` → `5`; `t: 8` drone `4` → `5`;
  - `t: 13` batedor `3` → `4`; `t: 17` drone `5` → `6`; `t: 18` batedor `3` → `4`;
  - novas: `{ t: 21, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 90 },` e `{ t: 39, type: 'wave', kind: 'batedor', count: 4, spacing: 0.3, y: 60 },` e `{ t: 44, type: 'wave', kind: 'drone', count: 5, spacing: 0.25, y: 140 },`;
  - `t: 54` drone `8` → `9`; `t: 58` batedor `5` → `6`.
  Comentário acima das novas: `// ONDAS MAIORES (frente B, 05/10): a F1 não ganha elite (é a fase do flap) — ganha VOLUME. Números para ele calibrar jogando.`

- [ ] **Step 3: Conferir** — `npm run typecheck`; `node scripts/probe-stage2.mjs` e `node scripts/probe-stage1-visual.mjs` (ou `probe-roster-f1.mjs`) → passam (se uma sonda checar o TEMPO do chefão da F2, atualize o número esperado para 97 — é a mudança pedida, não afrouxamento). Rode `node scripts/probe-chain.mjs` se ele cobrir a passagem F1→F2.

- [ ] **Step 4: Commit**

```bash
git add src/systems/StageDirector.ts scripts
git commit -m "feat(roteiro): a F2 com os dois elites (apresentados sozinhos, depois cobrados) e a F1 com ondas maiores"
```

---

### Task 10: A ARTE aprovada (depois da escolha dele na folha)

**Pré-requisito:** ele escolheu na `docs/superpowers/folhas/2026-10-05/elites/elites-f2-em-jogo.png` (drone A/B/C/D, rocha A/B/C/D, sentinela aberta A/B/C/D, roda R1–R4). Candidatos crus em `folhas/2026-10-05/elites/cand/`.

**Files:**
- Create: `public/sprites/elite-drone.png`, `elite-rocha.png`, `elite-sentinela.png`, `elite-sentinela-roda.png`, `elite-escudo.png` (+ quadros de animação quando houver)
- Create: `scripts/_elites/_instalar.mjs`
- Modify: `src/scenes/BootScene.ts` (o mapa de sprites, ~linha 677; as animações, ~linha 160)

- [ ] **Step 1: Instalar as escolhidas** — `scripts/_elites/_instalar.mjs` copia cada candidato escolhido, aparado (`sharp(...).trim()`), com a orientação certa (os sprites do jogo NASCEM APONTANDO PARA A DIREITA — o drone gerado já aponta; a sentinela gerada também; a rocha com o cristal à ESQUERDA), para `public/sprites/elite-*.png`.
- [ ] **Step 2: O escudo à mão** — `elite-escudo.png`: arco de ~36px de altura, 3–4 quadros pulsando, desenhado pixel a pixel (`pixelart_workbench` ou script sharp) na paleta vermelha dos olhos da sentinela escolhida; e a faísca de bloqueio ≤8px.
- [ ] **Step 3: Carregar** — no mapa da `BootScene`: `eliteDrone: 'sprites/elite-drone.png', eliteRocha: 'sprites/elite-rocha.png', eliteSentinela: 'sprites/elite-sentinela.png', eliteSentinelaRoda: 'sprites/elite-sentinela-roda.png', eliteEscudo: 'sprites/elite-escudo.png',` — as provisórias param de nascer sozinhas (guarda `textures.exists`).
- [ ] **Step 4: As animações** (PixMiniMax pela `scripts/_f4/_pl.mjs mini`, 80×80 com folga; transição antes do ciclo): `elite-drone-minerar` (broca girando, loop), `elite-drone-alerta` (recolhe a broca), `elite-drone-voo` (loop), `elite-sentinela-abrir` (roda → aberta), `elite-sentinela-fechar` (o inverso). Os nomes JÁ são os que o código toca (`tocar` só toca se existir).
- [ ] **Step 5: Conferir em jogo** — `node scripts/probe-elites.mjs` → TUDO OK; folha nova em jogo (`_folha-emjogo.mjs`) com a arte instalada; GIF de cada elite (`scripts/_gif-cartas.mjs` adaptado ou `scripts/_elites/_gif.mjs`) para ele julgar.
- [ ] **Step 6: Commit** — `feat(elites): a arte aprovada do drone, da rocha e da sentinela`.

---

### Task 11: Os registros

- [ ] **Step 1:** `docs/HANDOFF.md` — no 🧭: o 📍 de 05/10 (a spec-mãe, a fatia F2, o que ele aprovou), a linha 1.5 do roadmap (frente B: F2 → F3 → F4), a frase de arranque nova.
- [ ] **Step 2:** o START novo `docs/superpowers/plans/2026-10-05-elites-retomada-START.md` (o ponto marcado, o que a sessão fez, como testar — `test-elites-regras`, `probe-elites` —, o rebalanceamento: o elétrico desfazer o escudo; as lições).
- [ ] **Step 3:** a memória `pendente-cartas-vs-dificuldade` aponta para a frente B em curso.
- [ ] **Step 4: Commit** — `docs: a frente B em curso — a fatia F2 dos elites`.
