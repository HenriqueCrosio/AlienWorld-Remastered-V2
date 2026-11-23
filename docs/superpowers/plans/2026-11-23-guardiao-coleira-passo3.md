# O Guardião na coleira — passo 3: os cabos-serpente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ⚠️ **23/11, a rodada 2 — o DESENHO DELE mudou o caminho:** *"as serpentes saem do próprio guardião"*. A corrida pela
> borda (`bordaY`, `offsetX`, `ACOMPANHA`, "estacionar à esquerda da nave") SAIU. O trilho agora é uma cúbica da raiz a um
> POSTO fixo à frente dele (`ParamSerpente { raiz, c1, c2, posto, … }`), o arco por cima quase no teto, por baixo quase no
> chão; os postos medidos no desenho: (183, 54) e (178, 128); `BOTE_MAX` 260. O código e os testes estão na versão nova;
> o resto deste plano (as fases, a vez, a camada, o rodízio) vale como está.

**Goal:** de 66% em diante, o Guardião solta cabos-serpente que saem DELE (o feixe do alto e os tentáculos de baixo),
correm pela borda como cobra na parede até ficar à frente da nave, ensaiam, TRAVAM 0,4 s e dão o bote RETO até onde a
nave estava na trava — a ação nova do rodízio (spec `specs/2026-11-22-guardiao-coleira-design.md` §6 e §8).

**Architecture:** um módulo PURO (`src/entities/guardiao/serpente.ts`: o trilho pela borda, a máquina de fases de uma
serpente, o coordenador que dá a vez de um bote por vez) testado em Node; uma camada Phaser
(`src/entities/guardiao/camadaSerpentes.ts`) que desenha cada serpente com o MESMO rasterizador da corda da coleira
(`desenharCorda`, a textura amostrada da pintura) numa CanvasTexture atrás do corpo, e põe círculos invisíveis no grupo
`perigos` (o que fere sem ser alvo, como a serra) só na cabeça e no trecho esticado do bote; o `BossNucleo` ganha a ação
`serpentes` e um rodízio por degrau (`proximaAcao`, puro, em `padroes.ts`).

**Tech Stack:** TypeScript, Phaser 3 (Arcade), Vite; testes puros com `node --experimental-transform-types`; em jogo com
Playwright (o padrão de `scripts/test-guardiao-lava-jogo.mjs`); o filme com Playwright + sharp (o padrão de
`scripts/_guardiao/_gif-pulsos.mjs`).

## Global Constraints

- O que a spec fixa: as de cima saem do **feixe de cabos do alto das costas** e contornam pela borda de cima; as de baixo
  saem dos **tentáculos de baixo**, rente à borda de baixo. **A mesma corda da coleira** (§9), a cabeça puxando e o corpo
  seguindo o caminho dela.
- **O ensaio:** a cabeça se ergue, balança e finta uma ou duas vezes, de olho na nave. **O bote:** a cabeça para de
  balançar e **enrijece ~0,4 s**, dispara **reta até onde a nave estava na trava**, recolhe e volta pelo mesmo caminho
  para dentro do corpo.
- **Machuca só a cabeça e o trecho esticado do bote.** O corpo encostado na borda não — numa camada **atrás da nave e mais
  escuro**, como o cabo da serra.
- **Quantas:** 66–33% **duas** (uma de cima, uma de baixo), botes alternados (uma ataca enquanto a outra ensaia); 33–0%
  **três**, ensaio mais curto.
- **O rodízio (§8):** 100–66% serra ↔ investida (como hoje); 66–33% investida → serra → serpentes → …; 33–0% investida →
  serpentes → serra → … (o aperto e o teto entram nos passos 4 e 5). A salva mirada só no `flutua`, entre as ações.
- **A janela de dano (§8):** nas serpentes ele fica na estação operando os cabos: o miolo aberto (o corpo-domo de sempre).
- Nada vetorial (`Graphics`), nada esticado: a corda é pixel a pixel na resolução da tela (lei da serra e da coleira).
- A lava NÃO acelera por degrau (23/11, ele) — e o mesmo espírito aqui: o que muda no último degrau é o número e o
  ensaio, não a velocidade do bote.
- **Fora deste passo:** os sons (passo 6), acertar a cabeça para fazê-la recuar (§6, "para depois"), a arte própria da
  cabeça (a pergunta da folha — ver a Task 5).
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); vídeos, GIFs, `q/` fora do git.
- Enquanto ele joga: não editar `src/` nem `.html` (a cópia na 5174).

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **A cabeça é a ponta da própria corda, afilada** (14 px). A spec previa "a ponta pintada do tentáculo recortada do
   desenho", mas os tentáculos de baixo saem todos pela borda do quadro (medido na grade ampliada de
   `guardiao-coleira.png`, x 190–255): não há ponta pintada para recortar. Forma antes do detalhe: o movimento primeiro,
   a cabeça depois (recorte de um trecho, ou 3–4 conceitos no PixelLab), se ele pedir.
2. **"As cabeças vindo da esquerda":** a cabeça estaciona na borda 30 px À ESQUERDA da nave (a de trás do 3º degrau, 80
   px), passando por cima da coluna dela; o bote desce/sobe na diagonal para a direita.
3. **Os números:** corre 170 px/s pela borda; no ensaio acompanha a nave a 80 px/s (mais devagar que ela, 110); ergue 16
   px; o bote a 400 px/s, até 190 px; recolhe a 260 px/s; 2 botes por serpente; ensaio 1,1 s com 2 fintas (66–33%) e
   0,7 s com 1 finta (33–0%). Só um bote por vez (o coordenador).
4. **A 3ª serpente** (33–0%) sai do feixe do alto, da raiz de TRÁS, e corre 5 px mais rente à tela que a 1ª.

## File Structure

| Arquivo | O quê |
|---|---|
| `src/entities/guardiao/serpente.ts` (novo) | puro: `SERPENTE` (os números), `Trilho` + `caminhoSerpente`, `Serpente` (as fases), `passoSerpentes` (a vez), `prefixo` |
| `src/entities/guardiao/desenharCorda.ts` | + o parâmetro `pontaPx` (afinar só a ponta) e `escurecerFaixa` |
| `src/entities/guardiao/padroes.ts` | + `proximaAcao` (o rodízio por degrau) |
| `src/entities/guardiao/camadaSerpentes.ts` (novo) | Phaser: a CanvasTexture (depth −0,39), o desenho escuro + a parte que fere clara, os círculos no `perigos` |
| `src/entities/BossNucleo.ts` | a ação `serpentes`, o rodízio, as serpentes de cada degrau, `arrebentar` na troca, `destroy` |
| `scripts/test-guardiao-serpente.mjs` (novo) | os testes puros das serpentes |
| `scripts/test-guardiao-padroes.mjs` | + o rodízio |
| `scripts/test-guardiao-serpente-jogo.mjs` (novo) | em jogo |
| `scripts/_guardiao/_gif-serpentes.mjs` (novo) | o filme na velocidade real |
| `docs/superpowers/folhas/2026-11-22/guardiao/folha.html` | a rodada 4 (o passo 3) no topo |

---

### Task 1: a serpente pura (o trilho, as fases, a vez)

**Files:**
- Create: `src/entities/guardiao/serpente.ts`
- Test: `scripts/test-guardiao-serpente.mjs`

**Interfaces:**
- Consumes: `Ponto` de `./padroes`.
- Produces: `SERPENTE`, `FaseSerpente`, `ParamSerpente { raiz, bordaY, dentro: 1|-1, xMin, offsetX, atraso, botes,
  ensaio, fintas }`, `Trilho { pts, iBorda, sBorda, comp, em(s), ate(s), sDoX(x) }`, `caminhoSerpente(raiz, bordaY,
  xMin): Trilho`, `class Serpente { fase, botesFeitos, cabeca, alvo, trilho, pronta, esperando, atacando, acabou,
  passo(dt, nave, liberada), corpo(): Ponto[] (da cabeça à raiz), trechoQueFere(): Ponto[] }`,
  `passoSerpentes(lista, dt, nave)`, `prefixo(pts, L): Ponto[]`.

- [ ] **Step 1: o teste que falha** — `scripts/test-guardiao-serpente.mjs`:

```js
// THE CABLE-SERPENTS — the pure rules of step 3 (spec 2026-11-22-guardiao-coleira-design.md §6). From the root:
//   node --experimental-transform-types scripts/test-guardiao-serpente.mjs
import { SERPENTE, caminhoSerpente, Serpente, passoSerpentes, prefixo } from '../src/entities/guardiao/serpente.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const DT = 1 / 60;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const CIMA = { raiz: { x: 265, y: 60 }, bordaY: 28, dentro: 1, xMin: 6, offsetX: -30, atraso: 0, botes: 2, ensaio: 1.1, fintas: 2 };
const BAIXO = { ...CIMA, raiz: { x: 348, y: 152 }, bordaY: 192, dentro: -1, atraso: 0.5 };

// ── the path: from the root, a curve onto the border, then along it to the left end ──
{
  const t = caminhoSerpente(CIMA.raiz, CIMA.bordaY, CIMA.xMin);
  conferir(dist(t.pts[0], CIMA.raiz) < 1e-9, 'o caminho nasce na raiz', t.pts[0]);
  const fim = t.pts[t.pts.length - 1];
  conferir(fim.x === 6 && fim.y === 28, 'e termina na ponta esquerda da borda', fim);
  const naBorda = t.pts.slice(t.iBorda);
  conferir(naBorda.every((p) => p.y === 28), 'depois da curva, rente à borda', naBorda.find((p) => p.y !== 28));
  conferir(naBorda.every((p, i) => i === 0 || p.x < naBorda[i - 1].x), 'e sempre para a esquerda', null);
  conferir(Math.abs(t.sDoX(100) - (t.sBorda + (t.pts[t.iBorda].x - 100))) < 1e-9, 'sDoX na borda é a distância a partir da curva', t.sDoX(100));
  conferir(dist(t.em(t.sDoX(100)), { x: 100, y: 28 }) < 1e-6, 'em(sDoX(x)) cai em (x, borda)', t.em(t.sDoX(100)));
}

// ── one serpent, a still ship: grows, rehearses, locks 0.4 s, strikes straight at where the ship WAS, recoils, goes home ──
{
  const s = new Serpente(CIMA);
  const nave = { x: 120, y: 110 };
  const fases = [];
  let travaQ = 0, travaMove = 0, hT = null, bote = [], h0 = null, alvoTrava = null, maxPasso = 0, maxBuraco = 0;
  let ergueMax = 0, cabecaPrimeira = true, fereBote = true, fereEnsaio = true, prev = { ...s.cabeca };
  for (let i = 0; i < 60 * 20 && !s.acabou; i++) {
    // the ship moves AFTER the lock: the strike must not follow it
    if (s.fase === 'trava' && travaQ > 3) nave.y = 160;
    passoSerpentes([s], DT, nave);
    if (fases[fases.length - 1] !== s.fase) fases.push(s.fase);
    maxPasso = Math.max(maxPasso, dist(prev, s.cabeca));
    prev = { ...s.cabeca };
    const c = s.corpo();
    if (c.length) {
      if (dist(c[0], s.cabeca) > 1e-6) cabecaPrimeira = false;
      for (let k = 1; k < c.length; k++) maxBuraco = Math.max(maxBuraco, dist(c[k], c[k - 1]));
    }
    if (s.fase === 'ensaio') {
      ergueMax = Math.max(ergueMax, s.cabeca.y - 28);
      if (s.trechoQueFere().length !== 1) fereEnsaio = false;
    }
    if (s.fase === 'trava') {
      if (!hT) { hT = { ...s.cabeca }; alvoTrava = { ...s.alvo }; }
      travaQ++;
      travaMove = Math.max(travaMove, dist(hT, s.cabeca));
    }
    if (s.fase === 'bote') {
      const f = s.trechoQueFere();
      if (f.length !== 2) fereBote = false;
      if (!h0) h0 = f[0];
      bote.push({ ...s.cabeca });
    }
    if (s.fase === 'recolhe' && bote.length && !s.__fim1) { s.__fim1 = { ...bote[bote.length - 1] }; nave.y = 110; }
  }
  conferir(fases.join(',') === 'cresce,ensaio,trava,bote,recolhe,ensaio,trava,bote,recolhe,volta,fim', 'as fases, com 2 botes', fases);
  conferir(Math.abs(travaQ / 2 - SERPENTE.TRAVA * 60) <= 1, 'a trava dura 0,4 s (por bote)', travaQ / 2);
  conferir(travaMove <= SERPENTE.RECUO + 1e-6, 'na trava a cabeça só recua (enrijece)', travaMove);
  conferir(alvoTrava && alvoTrava.x === 120 && alvoTrava.y === 110, 'o alvo é a nave NA TRAVA', alvoTrava);
  const fim1 = s.__fim1;
  conferir(fim1 && dist(fim1, { x: 120, y: 110 }) < 1, 'o 1º bote termina onde a nave estava, não onde ela foi', fim1);
  const reto = bote.every((p) => {
    const ax = fim1.x - h0.x, ay = fim1.y - h0.y, bx = p.x - h0.x, by = p.y - h0.y;
    return Math.abs(ax * by - ay * bx) / Math.hypot(ax, ay) < 0.01;
  });
  conferir(reto, 'o bote é RETO', null);
  conferir(ergueMax > SERPENTE.ERGUE * 0.8, 'no ensaio a cabeça se ergue da borda para dentro', ergueMax);
  conferir(maxPasso <= SERPENTE.BOTE * DT + 1.5, 'a cabeça nunca salta (≤ o bote por quadro)', maxPasso);
  conferir(maxBuraco <= 6, 'o corpo sem buraco (pontos a ≤ 6 px)', maxBuraco);
  conferir(cabecaPrimeira, 'o corpo começa na cabeça (a ponta afina ali)', null);
  conferir(fereEnsaio && fereBote, 'fere: só a cabeça no ensaio; cabeça + trecho esticado no bote', { fereEnsaio, fereBote });
  conferir(s.acabou && s.corpo().length === 0 && s.trechoQueFere().length === 0, 'no fim ela entrou: nada desenhado, nada fere', null);
}

// ── a far ship: the strike stops at its reach ──
{
  const s = new Serpente({ ...CIMA, botes: 1 });
  const nave = { x: 40, y: 205 };
  let max = 0, h0 = null;
  for (let i = 0; i < 60 * 10 && !s.acabou; i++) {
    passoSerpentes([s], DT, nave);
    if (s.fase === 'bote' || s.fase === 'recolhe') {
      h0 ??= s.trechoQueFere()[0];
      max = Math.max(max, dist(h0, s.cabeca));
    }
  }
  conferir(max <= SERPENTE.BOTE_MAX + 1e-6, 'o bote para no alcance', max);
}

// ── two serpents: one strike at a time, alternating, 4 in all ──
{
  const A = new Serpente(CIMA), B = new Serpente(BAIXO);
  const nave = { x: 120, y: 110 };
  let juntas = 0;
  const ordem = [];
  const antes = new Map([[A, ''], [B, '']]);
  for (let i = 0; i < 60 * 30 && !(A.acabou && B.acabou); i++) {
    passoSerpentes([A, B], DT, nave);
    if (A.atacando && B.atacando) juntas++;
    for (const [s, nome] of [[A, 'A'], [B, 'B']]) {
      if (s.fase === 'bote' && antes.get(s) !== 'bote') ordem.push(nome);
      antes.set(s, s.fase);
    }
  }
  conferir(juntas === 0, 'nunca duas atacando ao mesmo tempo', juntas);
  conferir(ordem.join('') === 'ABAB', 'os botes alternam: A, B, A, B', ordem);
  conferir(A.acabou && B.acabou, 'as duas voltam para dentro', { A: A.fase, B: B.fase });
  const yB = [];
  const C = new Serpente(BAIXO);
  for (let i = 0; i < 60 * 3; i++) { passoSerpentes([C], DT, nave); if (C.fase === 'ensaio') yB.push(C.cabeca.y); }
  conferir(yB.length && Math.min(...yB) < 192 - SERPENTE.ERGUE * 0.8, 'a de baixo se ergue PARA CIMA', Math.min(...yB));
}

// ── the cut ──
{
  const p = prefixo([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 15);
  conferir(p.length === 3 && dist(p[2], { x: 10, y: 5 }) < 1e-9, 'prefixo corta a polilinha no comprimento', p);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: rodar e ver falhar** — `node --experimental-transform-types scripts/test-guardiao-serpente.mjs` →
  esperado: erro de import (`serpente.ts` não existe).

- [ ] **Step 3: a implementação** — `src/entities/guardiao/serpente.ts` (o código completo está no arquivo; os pontos
  que o teste cobra):
  - `caminhoSerpente`: a curva quadrática raiz → (raiz.x − 34, borda) com controle (raiz.x − 4, borda), 16 amostras; depois
    a borda a cada 4 px até `xMin`. `Trilho.sDoX(x) = sBorda + (pts[iBorda].x − x)`, preso em [sBorda, comp].
  - As fases: `espera` (o atraso) → `cresce` (a cabeça corre pelo trilho a `CORRE`, só para a frente, até o ponto da nave
    + `offsetX`) → `ensaio` (ergue em 0,25 s, balança `BALANCO` a `BALANCO_W`, as fintas em `ensaio·(j+1)/(fintas+1)`,
    o ponto de parada acompanha a nave a `ACOMPANHA`; vinda do recolhe, mistura da posição de onde veio em 0,2 s) →
    `trava` (só a vez do coordenador; o alvo = a nave AGORA; recuo de `RECUO` em 0,1 s; `TRAVA` s) → `bote` (reto, a
    `BOTE`, até o alvo ou `BOTE_MAX`) → `recolhe` (de volta pela mesma reta a `RECOLHE`) → `ensaio` ou, depois do último,
    `volta` (a cabeça volta à borda e o corpo entra pelo trilho a `VOLTA`) → `fim`.
  - `corpo()`: na borda, `trilho.ate(s)`; no ensaio/ataque, o trilho até `sPara − PESCOCO` + o pescoço (a curva até a
    cabeça, ou até o começo do bote) + o trecho reto do bote subdividido a ≤ 6 px; a ondulação (`ONDA`) só no trecho da
    borda, longe da raiz e do pescoço; invertido (a cabeça primeiro).
  - `passoSerpentes`: se ninguém está atacando, a vez vai para a pronta que espera há mais tempo.

- [ ] **Step 4: rodar e ver passar** — o mesmo comando → `TODOS OK`.

### Task 2: o rodízio por degrau

**Files:**
- Modify: `src/entities/guardiao/padroes.ts` (+ `proximaAcao`, `AcaoGuardiao`, `RODIZIO`)
- Test: `scripts/test-guardiao-padroes.mjs`

**Interfaces:**
- Produces: `type AcaoGuardiao = 'serra' | 'investida' | 'serpentes'`; `proximaAcao(degrau: number, atual: AcaoGuardiao):
  AcaoGuardiao`.

- [ ] **Step 1: o teste que falha** — acrescentar ao `scripts/test-guardiao-padroes.mjs` (antes do resumo final), e o
  `proximaAcao` no import:

```js
// ── the rotation per life step (spec §8): 100–66% saw ↔ lunge; 66–33% lunge → saw → serpents; 33–0% lunge → serpents → saw ──
{
  const ciclo = (d, a0, n) => { const v = [a0]; for (let i = 1; i < n; i++) v.push(proximaAcao(d, v[i - 1])); return v.join(','); };
  conferir(ciclo(0, 'serra', 4) === 'serra,investida,serra,investida', '100–66%: serra ↔ investida (sem serpentes)', ciclo(0, 'serra', 4));
  conferir(ciclo(1, 'investida', 4) === 'investida,serra,serpentes,investida', '66–33%: investida → serra → serpentes', ciclo(1, 'investida', 4));
  conferir(ciclo(2, 'investida', 4) === 'investida,serpentes,serra,investida', '33–0%: investida → serpentes → serra', ciclo(2, 'investida', 4));
  conferir(proximaAcao(0, 'serpentes') === 'serra', 'uma ação fora do rodízio do degrau recomeça a lista', proximaAcao(0, 'serpentes'));
}
```

- [ ] **Step 2: rodar e ver falhar** — `node --experimental-transform-types scripts/test-guardiao-padroes.mjs` → o import
  falha (`proximaAcao` não existe).
- [ ] **Step 3: a implementação** — em `padroes.ts`:

```ts
export type AcaoGuardiao = 'serra' | 'investida' | 'serpentes';

/** O RODÍZIO por degrau (spec §8): uma camada nova por degrau (decisão dele); o aperto e o teto entram nos passos 4–5. */
export const RODIZIO: readonly (readonly AcaoGuardiao[])[] = [
  ['serra', 'investida'],
  ['investida', 'serra', 'serpentes'],
  ['investida', 'serpentes', 'serra'],
];

/** A ação depois de `atual` no degrau `degrau`; fora da lista do degrau (a vida caiu de degrau), recomeça por ela. */
export function proximaAcao(degrau: number, atual: AcaoGuardiao): AcaoGuardiao {
  const lista = RODIZIO[Math.max(0, Math.min(RODIZIO.length - 1, degrau))];
  const i = lista.indexOf(atual);
  return lista[(i + 1) % lista.length];
}
```
  (com `i = −1`, `(−1 + 1) % n = 0`: recomeça pela primeira.)
- [ ] **Step 4: rodar e ver passar** → `TODOS OK`.

### Task 3: a camada no jogo e o Guardião

**Files:**
- Modify: `src/entities/guardiao/desenharCorda.ts` (+ `pontaPx`, + `escurecerFaixa`)
- Create: `src/entities/guardiao/camadaSerpentes.ts`
- Modify: `src/entities/BossNucleo.ts`

**Interfaces:**
- Consumes: Task 1 (`Serpente`, `passoSerpentes`, `prefixo`, `ParamSerpente`), Task 2 (`proximaAcao`, `AcaoGuardiao`).
- Produces: `desenharCorda(buf, W, H, pts, faixa, escala, s0 = 0, afina = 0, pontaPx = 0)` (com `pontaPx > 0` a ponta
  afina só nos primeiros `pontaPx` px; 0 = o comportamento de hoje, a corda inteira); `escurecerFaixa(f, k): FaixaCabo`;
  `class CamadaSerpentes { constructor(scene, perigos, escala); soltar(params); lista; terminou; atualizar(dt, nave);
  arrebentar(); destroy() }`; no `BossNucleo`: `acao` ganha `'serpentes'`, `proxima: AcaoGuardiao`, o campo `serpentes:
  CamadaSerpentes` (lido pelos testes: `b.serpentes.lista`).

- [ ] **Step 1: `desenharCorda`** — o parâmetro novo e o fator:

```ts
  afina = 0,
  pontaPx = 0,
): void {
…
        // a ponta (s = 0) afina até `1 − afina` da largura: ao longo da corda inteira, ou só nos primeiros `pontaPx`
        const fator = afina > 0 && total > 0 ? 1 - afina * (1 - Math.min(1, sAqui / (pontaPx > 0 ? pontaPx : total))) : 1;
```
  e, no fim do arquivo:

```ts
/** a faixa num tom mais escuro (k < 1): o corpo da serpente encostado na borda, que não fere */
export function escurecerFaixa(f: FaixaCabo, k: number): FaixaCabo {
  const e = (c: number): number =>
    (Math.round(((c >> 16) & 0xff) * k) << 16) | (Math.round(((c >> 8) & 0xff) * k) << 8) | Math.round((c & 0xff) * k);
  return { largura: f.largura, linhas: f.linhas.map((l) => l.map(e)) };
}
```
  Rodar `node --experimental-transform-types scripts/test-guardiao-coleira.mjs` → `TODOS OK` (a coleira não muda).

- [ ] **Step 2: `camadaSerpentes.ts`** — a CanvasTexture `guardiaoSerpentes` 384×216, depth **−0,39** (atrás do corpo,
  0; à frente das cordas da coleira, −0,4, e da moldura, −0,6; atrás da nave, 1). Por serpente, a cada quadro: o corpo
  inteiro na faixa `musgo` escurecida (0,55), afilado na cabeça (`afina` 0,55, `pontaPx` 14); por cima, o trecho que fere
  (os 16 px da cabeça + o trecho reto do bote) na faixa clara. 40 círculos invisíveis (`spark`, 2×2) no grupo `perigos`,
  `setCircle(r, 1 − r, 1 − r)`: a cabeça r = 5, o trecho do bote a cada 6 px r = 3; os que sobram, `enable = false`.
  `arrebentar()`: esvazia a lista, desliga os círculos e apaga a imagem em 500 ms.

- [ ] **Step 3: o `BossNucleo`** —
  - `acao` + `'serpentes'`; `proxima: AcaoGuardiao = 'serra'`.
  - No `flutua`, ao fim da pausa: `const agora = this.proxima; this.proxima = proximaAcao(this.degrau, agora);` e o ramo
    por `agora` (tirar os `this.proxima = 'investida'` / `'serra'` de dentro dos ramos). O ramo novo:
    `this.acao = 'serpentes'; this.body.setVelocityY(0); this.serpentes.soltar(this.paramSerpentes());`.
  - `case 'serpentes'`: assenta na altura da base (`setVelocityY((G_BASE_Y − y) * 6)`), o brilho do miolo (`glow`, 0,35),
    sem salva; `if (this.serpentes.terminou)` → `flutua`, `acaoT = pausa(degrau)`, `cdTiro = 0.6`.
  - `update`: `this.serpentes.atualizar(dt, target)` logo depois da lava (segue na troca, como as cordas).
  - `SERPENTES` (os dois degraus) e `paramSerpentes()`: as raízes em px do PNG a partir do centro — o feixe do alto
    (−47,5, −63) e a raiz de trás dele (48,5, −67), os tentáculos de baixo (72, 68) — na tela `sprite + raiz·0,7`; a borda
    de cima a `ARENA_TOPO − 2` (a 3ª a `ARENA_TOPO − 7`), a de baixo a `ARENA_BASE + 2`, `xMin` 6.
  - `trocarParaPredador`: `this.serpentes.arrebentar()`. `destroy`: `this.serpentes.destroy()`.
- [ ] **Step 4:** `npx tsc --noEmit -p .` limpo; os 3 testes puros e os 2 em jogo antigos (`test-guardiao-coleira-jogo`,
  `test-guardiao-lava-jogo`) seguem `TODOS OK`.

### Task 4: o teste em jogo

**Files:**
- Create: `scripts/test-guardiao-serpente-jogo.mjs`

- [ ] **Step 1:** o molde do `test-guardiao-lava-jogo.mjs` (o treino da F4, o relógio em passos, `damageShip` contado). As
  conferências:
  - **66–33%** (vida 50%), `proxima = 'serpentes'`, a nave parada em (80, 110): **2** serpentes; o Guardião não sai da
    estação (|x − G_STATION_X| < 0,5) e assenta na base; **nunca duas atacando**; **4 botes**; nenhuma bala inimiga
    (salva, lava) no ar durante a ação; a nave parada é **atingida** (bordas de subida do toque ≥ 1); volta a `flutua`;
    no fim todos os círculos desligados.
  - **A janela:** durante as serpentes, `b.damage(1)` tira 1 de vida.
  - **33–0%** (vida 20%): **3** serpentes, **6 botes**, nunca duas atacando.
  - **A nave que lê:** em cada `trava`, a nave salta 70 px para longe do alvo (para cima ou para baixo, a que couber) e
    volta depois do recolhe → **0 toques** de bote.
  - O rodízio em jogo: com a vida 50% e `proxima = 'investida'`, depois de 3 ações vêm investida, serra, serpentes.
  - Nenhum erro de página.
- [ ] **Step 2:** `node scripts/test-guardiao-serpente-jogo.mjs` (com o `npm run dev`) → `TODOS OK`.

### Task 5: o filme e a folha (a rodada 4)

**Files:**
- Create: `scripts/_guardiao/_gif-serpentes.mjs`
- Modify: `docs/superpowers/folhas/2026-11-22/guardiao/folha.html`

- [ ] **Step 1:** o filme no molde do `_gif-pulsos.mjs`: `--degrau 1|2`, `--cenas x:y:seg,…` (onde a nave começa), a
  nave LÊ o bote (na trava ela anda, a 110 px/s, para longe da reta do bote; depois volta devagar), imprime os toques.
  `node scripts/_guardiao/_gif-serpentes.mjs docs/superpowers/folhas/2026-11-22/guardiao/serpentes-d1.gif --degrau 1`
  e o mesmo com `--degrau 2` → `serpentes-d2.gif`. Também uma versão com a nave parada (`--parada`), para mostrar que
  ela é punida.
- [ ] **Step 2:** conferir os GIFs AMPLIADOS (memória `conferir-ampliado-antes-de-mostrar`): a emenda da raiz atrás do
  casco, o pescoço, a ponta, o corpo escuro contra a pintura (se sumir, clarear o 0,55), a parte clara do bote.
- [ ] **Step 3:** a folha: a rodada 4 no topo — os GIFs, o que foi feito, as medidas, e as perguntas: (1) a cabeça
  (a ponta afilada da corda × recorte × 3–4 conceitos no PixelLab); (2) estacionar à esquerda da nave; (3) os números
  (a velocidade do bote, o ensaio, 2 botes por serpente); (4) a 3ª serpente pelo feixe de trás.
- [ ] **Step 4:** a spec §10 (passo 3: o que entrou, esperando o veredito), o START (§1 e §2), o 🧭. Commit só quando
  ele pedir.

## Self-review

- Spec §6: de onde (Task 3, as raízes), o caminho (Task 1, o trilho), o ensaio, o bote, o que machuca (Task 1 +
  Task 3), quantas (Task 3, `SERPENTES`) ✓. §8: o rodízio (Task 2) e a janela (Task 4) ✓. §9: a mesma corda (Task 3) ✓.
- Os nomes: `proximaAcao`/`AcaoGuardiao` (Task 2) usados na Task 3; `b.serpentes.lista` (Task 3) lido na Task 4 ✓.
