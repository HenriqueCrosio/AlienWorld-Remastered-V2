# Bloco I, etapa 3, parte A — o esqueleto jogável da tela final · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** zerar o jogo abre o menu do amanhecer em "modo resultado" (o título, o placar, o crédito), e na tecla ele
vira o menu, com o letreiro avariado; a troca fica gravada.

**Architecture:** três módulos puros (`src/placar.ts`, `src/menu/qualMenu.ts`, `src/menu/resultado.ts`) + a avaria em
`abertura.ts`; um cenário novo (`src/menu/amanhecer/cenarioAmanhecer.ts`) com a interface do da noite; a `MenuCenaHD` e
o `MenuScene` escolhem o cenário e ganham o 1º tempo.

**Tech Stack:** Phaser 3.90, TypeScript, Vite; testes puros em `node scripts/test-*.mjs` (importam `.ts` direto: só
TypeScript apagável, imports com `.ts` nos módulos puros, sem Phaser).

Spec: `specs/2026-11-13-bloco-i-tela-final-amanhecer-design.md`.

## Global Constraints

- O menu da NOITE não muda em nada (os 4 `test-menu-*` seguem passando; o letreiro com `avariado = false` é o de hoje).
- A pintura é dele: entra inteira, o MESMO corte do menu (`{ left: 186, top: 0, width: 1582, height: 890 }`), reduzida
  do original uma vez só (lanczos3). AUMENTAR nunca (só a camada HD amplia, com filtro LINEAR).
- Tudo é função do relógio; nenhum tween no que a sonda precisa parar.
- Chaves: `alienworld:zerou`, `alienworld:menu`. O treino nunca grava.
- Commit e push só quando ele pedir, só no nome dele; vídeos e `q/` fora. Editar com Edit/Write.
- Durante uma filmagem não editar `src/` nem `.html` do projeto.

---

### Task 1: os módulos puros e o teste

**Files:** Create `src/placar.ts`, `src/menu/qualMenu.ts`, `src/menu/resultado.ts`, `scripts/test-menu-amanhecer.mjs`;
Modify `src/menu/numerosMenu.ts` (`AVARIA`, `RESULTADO`), `src/menu/abertura.ts` (`letraFalha`),
`src/scenes/GameOverScene.ts` (usa o `placar.ts`).

**Interfaces — Produces:**
- `placar.ts`: `MEDALHAS`, `medalhaDe(score): { medal, color } | null`, `registrarRecorde(g: Guarda, handling: string, score: number, practice: boolean): { anterior: number; recorde: number; novo: boolean }`, `type Guarda = Pick<Storage, 'getItem' | 'setItem'>`
- `qualMenu.ts`: `type QualMenu = 'noite' | 'amanhecer'`, `zerou(g)`, `marcarZerou(g)`, `menuAtivo(g, forcado?)`, `escolherMenu(g, m): boolean`, `guardaDoNavegador(): Guarda`, `menuDaUrl(): QualMenu | null`
- `resultado.ts`: `type ParteResultado = 'titulo' | 'pontos' | 'recorde' | 'credito' | 'tecla'`, `alfaResultado(parte, t, tSai): number`, `resultadoPronto(t): boolean`, `T0_SEGUNDO_TEMPO`
- `abertura.ts`: `letraFalha(i: number, t: number): boolean`

- [ ] o teste primeiro (falha: módulos não existem) → os módulos → o teste passa → a `GameOverScene` usando
  `medalhaDe`/`registrarRecorde` com o mesmo resultado na tela → `npm run typecheck`.

### Task 2: a pintura assada e o cenário

**Files:** Create `scripts/_menu/_camadas-amanhecer.mjs`, `public/sprites/menu-amanhecer/k4/pintura.png`,
`…/k1/pintura.png`, `src/menu/amanhecer/cenarioAmanhecer.ts`; Modify `src/menu/cenario.ts` (a interface comum
`CenarioDoMenu`, `EstadoMenu.tVeu`), `src/menu/MenuCenaHD.ts`, `src/systems/atmosfera/perfis.ts` (`menuAmanhecer`).

**Interfaces — Produces:** `carregarAmanhecer(load, prefixo, pasta)`, `CenarioAmanhecer.criar(scene, k, prefixo, estado, profundidadeVeu): CenarioAmanhecer | null`, `atualizar(t)`; `MenuCenaHD.init({ estado, qual })`.

- [ ] assar (conferir as duas reduções ampliadas) → o cenário (a pintura + o véu, que lê `estado.tVeu ?? estado.tAbertura`)
  → a `MenuCenaHD` carrega a pintura sob demanda e monta o cenário pedido → o perfil → typecheck.

### Task 3: a cena em dois tempos

**Files:** Modify `src/scenes/MenuScene.ts` (o `resultado` no `init`, o 1º tempo, a tecla, os atalhos de dev, o cenário
k1 do amanhecer), `src/menu/titulo.ts` (`avariado`), `src/scenes/Interlude4Scene.ts` (`terminar`).

- [ ] o `init` → o texto do resultado (as três vozes) → o relógio do 1º tempo e a tecla → o 2º tempo → o letreiro
  avariado → a `Interlude4` → typecheck, build, todos os testes.

### Task 4: a prova

**Files:** Create `scripts/_menu/_filmar-amanhecer.mjs`, `docs/superpowers/folhas/2026-11-13/tela-final/parte-a.html`.

- [ ] filmar no relógio a passos: o resultado inteiro → a tecla → o menu pousado; e 30 s do letreiro avariado →
  conferir os quadros ampliados (o texto sobre a pintura, nada sobre a carcaça) → a folha → os docs (🧭, START).
