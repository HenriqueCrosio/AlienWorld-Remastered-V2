# Design — Passe visual da Fase 1 ("A Decolagem"), leva 1: PROFUNDIDADE DE CENÁRIO

**Data:** 2026-07-22
**Fatia:** 1 de 9 (Fase 1) do passe visual da campanha — **leva 1 de N: o CENÁRIO**.
**Arquivos-alvo:** `src/Parallax.ts` (`buildSurface`), `src/systems/TerrainSystem.ts` (raiz dos
picos), `src/scenes/BootScene.ts` (carga de assets novos).

---

## Contexto e objetivo

A Fase 1 já teve um passe forte no parallax (2026-07-18): tráfego da colônia, skyline, cometa
raro, montanhas em 2 camadas, chão de rocha, entulho e picos em primeiro plano. Mesmo assim, o
Henrique marcou **três problemas** olhando o jogo rodando:

1. **"MAIS COMPLEXIDADE"** — o meio-de-cena (a faixa entre os picos do chão e o céu alto) tem
   **espaço morto**; a cena não tem a densidade/profundidade que ele quer.
2. **"SPRITE COLADO"** — os picos de cristal claros (`spire`, obstáculos do `TerrainSystem`)
   parecem **recortes colados** no chão: entram com borda dura, sem base, sem sombra, sem
   integração à cena.
3. **Referência Metal Slug** — o alvo estético: **profundidade atmosférica**, camadas de montanha
   separadas por **névoa/haze**, um vale com luz, clima denso e em camadas.

### Decisão de clima (aprovada)

**Manter o tema DARK da Fase 1, mas trazer a profundidade e a complexidade de cenário do Metal
Slug — "o melhor dos dois mundos".** Nada de clarear a cena para um crepúsculo terrestre: a
névoa é FRIA e dim, a paleta continua a alienígena/espacial de hoje. O que muda é a densidade de
CAMADAS e a leitura de distância.

### Abordagem (aprovada): A **+** B

- **A — Atmosfera em engine:** haze entre as camadas, gradiente de céu, 3ª faixa de montanha,
  luzes da colônia, névoa rasteira e o enraizamento dos picos. Sem depender de arte nova.
- **B — Arte nova no PixelLab:** peças bespoke de cenário para dar complexidade REAL ao
  meio-fundo (não só reuso). Cada asset é gerado, **previsto/aprovado antes de entrar**, e
  carregado com a guarda `textures.exists` de sempre.

### Escopo desta leva

**Só o CENÁRIO/atmosfera + a raiz dos picos.** A marcação do Henrique foi toda de cenário. Os
**inimigos** (drone/batedor/canhoneira/torres) e o **chefão Torre** ficam para a **próxima leva
da mesma Fatia 1**. Jogabilidade, balanceamento e roteiro (`STAGE_1`) **não mudam** — os picos
seguem sendo obstáculos INDESTRUTÍVEIS a desviar, e continuam legíveis.

---

## O que muda (design concreto)

### 1. Haze aéreo entre as camadas — o truque-mestre do Metal Slug

Faixas finas de **névoa fria e dim** assentadas no PÉ de cada banda de montanha e no horizonte.
Cada cume dissolve na bruma, e a camada de trás passa a ler como mais LONGE (perspectiva aérea
por névoa, não só por tint). Derivam de leve na horizontal. Ficam no FUNDO (atrás do campo de
jogo) — nunca sobre a faixa jogável. Em engine (imagens `nebula` tintadas dim + faixas
translúcidas), com a guarda de textura.

### 2. Encher o meio-de-cena (o "MAIS COMPLEXIDADE")

- **3ª faixa de montanha** entre `mtnMid` e o primeiro plano: mais próxima/rápida, um degrau de
  tint acima, preenchendo o vão vazio. Começa reusando a arte `mtnMid`/`mtnFar` (variantes já
  existem); vira arte bespoke se a leva B pedir.
- **Luzes frias da colônia** no skyline — o "vale com luz" do Metal Slug, mas alienígena:
  pontos de luz fria (não janelas amarelas) pontilhando a silhueta industrial no horizonte.
- **Gradiente de céu** sutil: topo mais preto → horizonte um tom acima, para o céu ganhar
  VOLUME em vez de preto chapado. Fica atrás de tudo.
- **(B) Cenário bespoke:** peças novas de meio-fundo para densidade autoral — candidatas:
  estruturas da colônia (torres/domos/antenas industriais), formações de rocha distintas,
  destroços/estruturas ancoradas. Geradas e aprovadas uma a uma.

### 3. Enraizar os picos (o "SPRITE COLADO")

Cada `spire` obstáculo, ao nascer, ganha um **kit de raiz** que viaja junto:
- **Base de entulho** (montinho de pedra) onde o pico encontra o chão.
- **Sombra de contato** no solo (elipse dim), para ele PESAR no terreno.
- **Respiro de névoa** no pé — o mesmo haze frio da cena, lambendo a base.

O CORPO do pico continua claro e legível (é obstáculo — o verbo da fase é desviar). A raiz é
decoração que acompanha o prop e recicla com ele; nada de física nova. Pode-se, se ajudar,
escurecer levemente só a base do pico (gradiente de raiz) mantendo o topo claro.

### 4. Névoa rasteira

Uma faixa de fog frio e sutil cruzando a linha do chão (o fog de solo do Metal Slug), derivando
devagar. Fria, dim, atrás dos obstáculos — dá "ar" ao terreno sem esconder o jogo.

---

## Arquitetura de camadas (fundo → frente)

Estende `buildSurface` sem quebrar a ordem atual. Depths novos entre os existentes:

| Depth | Camada | Estado |
|-------|--------|--------|
| −99 | Gradiente de céu | **novo** (engine) |
| −98 | Nebulosa distante | existe |
| −97 | Planeta anelado | existe |
| −96 | Tráfego da colônia / cometa raro | existe |
| −95 | **Haze do horizonte** (atrás das montanhas) | **novo** |
| −93 | Skyline da colônia + **luzes frias** | existe + **novo** |
| −92 | mtnFar | existe |
| −90 | **Haze entre mtnFar e mtnMid** | **novo** |
| −88 | mtnMid | existe |
| −86 | **3ª faixa de montanha (mtnNear)** | **novo** |
| −84 | **Haze baixo / névoa rasteira** | **novo** |
| −80 | Chão (tile) + rim | existe |
| −78 | Entulho do chão | existe |
| — | Picos-obstáculo (`TerrainSystem`) + **raiz** | existe + **novo** |
| 60 | Primeiro plano (picos escuros) | existe |

> Regra dura: nenhuma camada nova cobre o campo de jogo nem os padrões do chefão. As faixas de
> haze e a névoa rasteira são de FUNDO. Qualquer coisa em primeiro plano (depth 60) respeita o
> `setForegroundDimmed` que já apaga o primeiro plano na luta de chefão.

---

## Assets a criar no PixelLab (leva B) — orçar/aprovar antes

Candidatos (só entram os que o Henrique aprovar, um a um; guarda de textura sempre):

- **Estrutura(s) de colônia** — silhueta industrial rica (torres, domos, antenas) para o
  meio-fundo, mais detalhada que o `skyline` atual.
- **Formação de rocha de meio-fundo** — cordilheira/pináculos distintos para a 3ª faixa, se o
  reuso de `mtnMid` não bastar.
- **Base de pico** (opcional) — se a raiz em engine não convencer, um sprite de entulho dedicado.

Pipeline de sempre: `scripts/install-sprite.mjs` (estático) / `scripts/anim-sheet.mjs` (animado),
saída em `public/sprites/`, registro em `BootScene.ts`.

---

## Fallback e legibilidade

- **Guarda de textura**: todo asset novo passa por `this.textures.exists(...)`. Sem o PNG, a
  camada simplesmente não entra — o jogo nunca quebra por arte faltando.
- **Legibilidade jogável é lei**: os picos-obstáculo continuam claros e lidos de relance; a névoa
  e as camadas novas ficam no fundo; a luta de chefão continua limpa (`setForegroundDimmed`).
- **Sem custo de física**: a raiz dos picos é decoração que acompanha o prop; nenhuma hitbox
  nova, nenhuma mudança no `STAGE_1`.

---

## Verificação (padrão de sondas do projeto)

- **`scripts/probe-stage1.mjs`** (ou a sonda de F1 existente) + screenshot: conferir a cena com
  as camadas novas, os picos enraizados e a leitura preservada.
- **Revisão a olho** dos frames: a régua é "profundidade Metal Slug em paleta dark", os picos
  não mais "colados", o meio-de-cena preenchido.
- `npm run typecheck` + `npm run build` limpos.
- Conferir a luta de chefão: as camadas novas não podem tapar os padrões da Torre.

---

## Critérios de sucesso

1. O meio-de-cena deixa de ter espaço morto — profundidade em CAMADAS, no clima do Metal Slug.
2. Os picos-obstáculo NASCEM do terreno (base + sombra + névoa) — fim do "sprite colado" —,
   mantendo-se legíveis para desviar.
3. A paleta segue DARK/alienígena; a névoa é fria e dim, não um crepúsculo terrestre.
4. Nada quebra sem os PNGs novos; jogabilidade, balanceamento e roteiro inalterados.
5. A luta de chefão continua limpa e legível.
