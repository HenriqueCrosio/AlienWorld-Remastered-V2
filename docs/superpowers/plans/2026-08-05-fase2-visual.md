# Fase 2 — Passe Visual ("Frota Morta") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fundo pintado da colônia do cinturão como camada nova do vácuo, e uma facção nova
(ancorada na Capitânia) para os quatro inimigos redesenhados — batedor, canhoneira, kamikaze e
cargueiro — com canhoneira/batedor trocando de pele por FASE (biomec roxo na F1, cinturão na F2),
sem duplicar `EnemyKind` nem mexer em comportamento/balanceamento.

**Architecture:** Fundo: nova camada em `Parallax.buildSpace()`, mesmo mecanismo genérico
`paintedBg[]` que `paintBgF1` já usa (zero código novo em `update()`). Inimigos: troca de ARTE só
— `EnemySystem` ganha uma tabela `STAGE_2_SKIN` que resolve textura/anim por `EnemyKind` quando a
fase é a 2 (com guarda de textura: sem o PNG novo, cai na pele antiga); os quatro sprites entram
pelo pipeline de sempre do PixelLab, com a Capitânia como `style_images` de referência.

**Tech Stack:** TypeScript + Phaser 3 + Vite. PixelLab (`scripts/gerar.mjs`, `scripts/animar.mjs`,
`scripts/anim-sheet.mjs`/`scripts/install-anim.mjs`, `scripts/install-sprite.mjs`,
`scripts/sheet.mjs` para julgar candidatos ampliados). Sondas Playwright
(`scripts/probe-stage2.mjs`, já existente).

## Global Constraints

- **Facção nova do cinturão**: casco cinza-azulado frio (a cor da Capitânia) + acentos
  magenta/vermelho quentes nas janelas/bocas de canhão. A Capitânia (`public/sprites/capitania.png`)
  é a `style_images` de referência do PixelLab para os quatro redesenhos — nunca o sprite antigo
  de cada inimigo.
- **O drone continua roxo biomec** (reaproveitado da Fase 1) — variedade proposital, não mexer.
- **Comportamento e balanceamento INALTERADOS** nos quatro inimigos — só arte. Hitbox preservada
  (a `scale` de cada `EnemyDef` não muda; se a arte nova tiver dimensão nativa diferente da atual,
  gerar/recortar para bater com a dimensão nativa de hoje, não ajustar `scale`).
- **Canhoneira e batedor trocam de TEXTURA por FASE** (mesmo `EnemyKind`/comportamento): opção
  (A) do spec — chave nova condicionada à `stage` atual no momento do spawn, não duplicar a
  `EnemyDef`. Como os dois aparecem em AMBAS as fases com o MESMO `scale`, a arte nova do
  cinturão tem que nascer na MESMA dimensão nativa da arte biomec atual (batedor 27×26, canhoneira
  45×26) — senão o mesmo `scale` desenha tamanhos diferentes entre as duas aparições.
  **Atualizado após a Task 2:** na prática o PixelLab nem sempre entrega essa dimensão exata (o
  batedor saiu 115×36, um dardo bem mais alongado) — recortar à força pra caber em 27×26
  esmagaria o desenho. (A arte de 2026-08-09 que a substituiu tem 115×37 — o mesmo caso.)
  `STAGE_2_SKIN` agora aceita um `scale?: number` OPCIONAL por pele,
  usado no lugar de `DEFS.scale` só naquele spawn — `DEFS.scale` continua intocado (a Fase 1 não
  muda). Calibrar esse número por revisão visual (largura em tela parecida com a da Fase 1), não
  por conta de cabeça.
- **Guarda de textura** em toda arte nova (`textures.exists`); sem o PNG, a Fase 2 (e a Fase 1,
  no caso de batedor/canhoneira) continuam exatamente como hoje.
- **⚠️ ORIENTAÇÃO, não só silhueta/cor/escala — checar SEMPRE em jogo, não só no lote de
  candidatos.** Lição da Task 2: o batedor saiu do PixelLab com o nariz pra ESQUERDA (o prompt
  pediu "facing right", o modelo não obedeceu) — como o jogo espelha todo sprite pra esquerda em
  runtime (`setFlipX`, convenção: arte SEMPRE gerada apontando pra DIREITA), a nave entrou
  voando de costas, e isso só aparece OLHANDO O INIMIGO SE MOVENDO na sonda, não no contact
  sheet estático. Depois de instalar QUALQUER sprite de inimigo/nave, rodar a sonda e olhar o
  sentido do nariz contra o sentido do movimento antes de dar como pronto. Se vier invertido:
  `install-sprite.mjs ... --flip` pro estático, e espelhar os quadros da animação em BLOCO
  (junto com o estático, mesma transformação) pra não perder a caixa de recorte unificada que
  `install-anim.mjs` monta entre eles.
  **Atualizado em 2026-08-09:** aconteceu de novo, nas DUAS artes novas de nave (o batedor
  remodelado e a Aurora). Já não é acidente — trate como o padrão: o PixelLab ignora "facing
  right". Existe agora `scripts/espelhar.mjs` pra espelhar o bloco inteiro em disco de uma vez;
  espelhar em disco é melhor que `setFlipX` sempre que houver offset medido no PNG (bocas de
  canhão, aresta do convés), porque o flip de runtime não acompanha esses números.
- **Arte aprovada asset por asset pelo Henrique antes de entrar no jogo.** Autoria dos commits:
  só Henrique (sem `Co-Authored-By`).
- Verificação por sonda/screenshot + `npm run build` (typecheck + vite) — não há testes
  unitários neste projeto.
- **Fora de escopo** (não mexer): a Canhoneira-Capitânia (arte já pronta), a mina sensora, os
  destroços (`destroco`), `setApproach()`/os números de escala da lua e do Leviatã.

---

## Estrutura de arquivos

- **`src/Parallax.ts`** — `buildSpace()`: camada nova `paintedBg` (fundo pintado). **[FEITO —
  ver Task 0.]**
- **`src/scenes/BootScene.ts`** — `FRAMES`/`ANIMS`/`ART`: chaves novas da facção do cinturão
  (`enemyScoutCinturao`, `enemyGunshipCinturao`) e a arte redesenhada de kamikaze/cargueiro (nas
  MESMAS chaves de hoje — eles não trocam por fase, só de skin permanente).
- **`src/systems/EnemySystem.ts`** — `STAGE_2_SKIN` (textura/anim por `EnemyKind` quando
  `stageId === 2`) + o construtor passa a receber `stageId`.
- **`src/scenes/GameScene.ts`** — um ponto: `new EnemySystem(this, this.stage.id)`.
- **`scripts/`** — pipeline de arte existente; `_ref-*.png` para style refs (gitignorado).

---

### Task 0: Fundo pintado do cinturão — ✅ FEITO

**Files:** Created `public/sprites/paint-bg-f2.png`; Modified `src/scenes/BootScene.ts`,
`src/Parallax.ts`.

- [x] **Step 1:** `node scripts/paint-bg.mjs assets/raw/paint-bg-f2-original.png public/sprites/paint-bg-f2.png 768 432` (corte central mínimo — a proporção original, 1672×941, já batia quase exata com a do jogo).
- [x] **Step 2:** Registrado em `BootScene.ART` como `paintBgF2: 'sprites/paint-bg-f2.png'`.
- [x] **Step 3:** `Parallax.buildSpace()` empurra 2 cópias para `this.paintedBg[]` (`depth −99`,
      `y=−108`), guardado por `this.mode === 'espaco' && textures.exists('paintBgF2')` — o guard
      de `mode` importa porque `buildSpace()` também roda no modo `'nebulosa'` (Fase 3), e a
      pintura é cenário só da Fase 2.
- [x] **Step 4:** Verificado — `npm run build` limpo; `node scripts/probe-stage2.mjs`
      (`probe-stage2-cinturao.png`/`-kamikaze.png`): a colônia (guindastes, janelas acesas)
      aparece atrás do cinturão/derelict/nebulosa, sem tapar a lua/Leviatã.
- [x] **Step 5:** Commit `feat(fase2): fundo pintado da colonia do cinturao (arte do Henrique)`
      em `72e840b`, branch `feat/fase2-visual`.

---

### Task 1: Referência de facção + infraestrutura de troca de textura por fase

**Files:** Modify `src/systems/EnemySystem.ts`, `src/scenes/GameScene.ts`.

**Interfaces:**
- Produces: `EnemySystem` passa a exigir `stageId: number` no construtor; `spawn()` resolve
  `texture`/`anim` por uma tabela `STAGE_2_SKIN` antes de cair no `def.texture`/`def.anim` de
  sempre. As Tasks 2 e 3 (batedor/canhoneira) só precisam colocar os PNGs nas chaves certas —
  nenhum código novo.

- [x] **Step 1: Fixar a referência de facção** — ⚠️ **A ÂNCORA MUDOU (2026-08-09).**

Era `public/sprites/capitania.png`. Depois da correção de rumo, quem define a paleta real da
facção em tela é o **batedor do cinturão** (`public/sprites/enemy-scout-cinturao.png`) — foi
contra ele que a canhoneira teve de casar, não contra a Capitânia.

E há uma armadilha de TAMANHO que custou uma leva inteira: **`size` é IGNORADO quando se passa
`style_images`** — a MAIOR referência define o tamanho de saída (lição 17, já escrita no
cabeçalho do `gerar.mjs`). Para gerar em 45px é preciso uma referência DE 45px: existe
`scripts/_ref-batedor-45.png`, um recorte 1:1 da proa do batedor, feito para isso. O mínimo que
a API aceita em `size` é 32.

⚠️ Esse arquivo é GITIGNORADO (`scripts/_*.png`), então numa máquina limpa ele não existe.
Refazer é uma linha:

```
node -e "require('sharp')('public/sprites/enemy-scout-cinturao.png').extract({left:70,top:5,width:45,height:26}).toFile('scripts/_ref-batedor-45.png')"
```

- [x] **Step 2: Tabela de pele por fase, em `EnemySystem.ts`**

Adicionar logo abaixo de `DEFS`:

```ts
/**
 * PELE POR FASE: canhoneira e batedor trocam de arte entre a Fase 1 (biomec roxo, sempre) e a
 * Fase 2 (facção do cinturão) — mesmo `EnemyKind`/comportamento, só a textura. Fonte única de
 * verdade para o comportamento (opção A do spec 2026-08-05): sem o PNG do cinturão, `spawn()`
 * cai de volta em `def.texture`/`def.anim` — a Fase 1 e uma Fase 2 sem arte nova continuam
 * IDÊNTICAS a hoje.
 */
const STAGE_2_SKIN: Partial<Record<EnemyKind, { texture: string; anim: string }>> = {
  batedor: { texture: 'enemyScoutCinturao', anim: 'scout-cinturao-fly' },
  canhoneira: { texture: 'enemyGunshipCinturao', anim: 'gunship-cinturao-fly' },
};
```

- [x] **Step 3: `EnemySystem` passa a saber a fase atual**

```ts
export class EnemySystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  private readonly muzzleFlash: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    /** A FASE atual (`GameScene.stage.id`) — só usada para a pele por fase (ver `STAGE_2_SKIN`). */
    private readonly stageId: number,
  ) {
```

(o resto do construtor não muda.)

- [x] **Step 4: `spawn()` resolve a pele antes de criar o sprite**

Trocar o início de `spawn()` — de:

```ts
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

    const texture = pickVariant(this.scene, def.texture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === def.texture && def.anim && this.scene.anims.exists(def.anim)) {
      e.play(def.anim);
    }
```

para:

```ts
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

    // A PELE POR FASE (canhoneira/batedor): na Fase 2, tenta a textura do cinturão primeiro;
    // sem o PNG (guarda de textura), cai na arte biomec de sempre — ver STAGE_2_SKIN.
    const skin = this.stageId === 2 ? STAGE_2_SKIN[kind] : undefined;
    const hasSkin = skin !== undefined && this.scene.textures.exists(skin.texture);
    const baseTexture = hasSkin ? skin!.texture : def.texture;
    const baseAnim = hasSkin ? skin!.anim : def.anim;

    const texture = pickVariant(this.scene, baseTexture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === baseTexture && baseAnim && this.scene.anims.exists(baseAnim)) {
      e.play(baseAnim);
    }
```

(o resto de `spawn()` — `setVelocityX`, `setScale(def.scale)`, `setTint(def.tint)`, hitbox, etc.
— não muda: continua lendo de `def`, que é a mesma `EnemyDef` nas duas fases.)

- [x] **Step 5: `GameScene` passa a fase ao construir o `EnemySystem`**

Em `src/scenes/GameScene.ts:191`, trocar:

```ts
    this.enemies = new EnemySystem(this);
```

por:

```ts
    this.enemies = new EnemySystem(this, this.stage.id);
```

- [x] **Step 6: Verificar** — `npm run build` PASS (typecheck pega qualquer assinatura
      desalinhada). Rodar `node scripts/probe-stage2.mjs` e `node scripts/probe-chain.mjs`: sem
      nenhum PNG novo instalado ainda, o comportamento tem que estar BYTE a byte igual ao de
      antes (batedor/canhoneira continuam com a arte biomec de sempre nas duas fases) — é a
      regressão que prova que a guarda funciona antes de qualquer arte nova entrar.

- [x] **Step 7: Commit** — `feat(fase2): infra de troca de pele por fase (canhoneira/batedor)`.

---

### Task 2: Batedor do cinturão — ✅ FEITO (refeito em 2026-08-09)

**Files:** Create `public/sprites/enemy-scout-cinturao.png` (+ quadros de animação); Modify
`src/scenes/BootScene.ts` (`FRAMES`, `ANIMS`, `ART`).

**Interfaces:** Produces a textura `enemyScoutCinturao` + anim `scout-cinturao-fly`, lidas pela
`STAGE_2_SKIN` da Task 1.

- [x] **Step 1: Gerar no PixelLab** — `node scripts/gerar.mjs "sleek dart-shaped scout starship, cold blue-grey hull, glowing warm magenta cockpit window, sharp arrow-like silhouette, side view facing right" 27 sidescroller public/sprites/capitania.png` (⚠️ `view` é `'sidescroller'`/`'top-down'`, não `'side'` — a API rejeita `'side'` com 422). Lote de 4 candidatos; animação via `mcp__pixellab__animate_object` (frame_count=6 gera 6+1 referência = 7 quadros, batendo com o padrão `xAnim: 7` do resto do jogo).
- [x] **Step 2: Julgar candidatos ampliados** (`scripts/sheet.mjs`) e mostrar ao Henrique — aprovado o candidato #0 (dardo magro, cinza-azulado, faixa magenta); descartados #1 (mais "caixa", menos afilado), #2 (canhão visível no topo — lia como canhoneira, não batedor) e #3 (antena + paleta verde-água, fora da paleta pedida).
- [x] **Step 3: Instalar** — promovido via `mcp__pixellab__select_object_frames` (o lote fica em status `review`; promover cria um objeto `completed` próprio), depois `install-sprite.mjs`/`install-anim.mjs` como sempre.
- [x] **Step 4: Registrado em `BootScene.ts`** (`FRAMES.scoutCinturaoAnim: 7`, `ANIMS` com `frameRate: 12` igual ao `scout-fly`, `ART.enemyScoutCinturao` + `animFrames`).
- [x] **Step 5: Dimensão nativa divergiu bastante** (115×36, não 27×26 — a arte veio um dardo de verdade, bem mais alongado). Recortar pra 27×26 teria esmagado o desenho; em vez disso, `STAGE_2_SKIN.batedor` ganhou um campo `scale?: number` (0.28) que `spawn()` usa NO LUGAR de `DEFS.batedor.scale` só para essa pele — `DEFS.batedor.scale` (compartilhado com a Fase 1) não mudou. **Desvio do texto original deste step, registrado aqui.**
- [x] **Step 6: Verificar** — `npm run build` PASS; sonda dedicada (`scripts/_probe-batedor-cinturao.mjs`) confirmou os 4 batedores da primeira onda (F2, t≈9s) como dardos distintos e bem separados — a 1ª tentativa (antes de ligar o `scale` da pele em `spawn()`, bug pego na revisão visual) mostrava eles GRUDADOS numa massa só; corrigido e reverificado. `probe-chain.mjs`: Fase 1 sem erros de página (a arte biomec do batedor continua a mesma).
- [x] **Step 7: Commit** — `feat(fase2): arte nova do batedor (facao do cinturao)` em `6f41110`.
- [x] **Step 8 (2026-08-09): REFEITO.** O Henrique remodelou o batedor no PixelLab
      (`ca7ce209-f4bb-4d20-97ca-e26a950028b3`) e a arte de ontem foi substituída — ver a
      "Correção de rumo" abaixo. Dardo de casco escuro com cabine vermelha, 11 quadros (eram 7),
      dimensão nativa 115×37 contra 115×36: o `scale` 0.28 da pele não mudou. Espelhado em disco
      de novo (a arte nasceu apontando para a esquerda pela SEGUNDA vez — ver o constraint de
      orientação). Commit `23b9cc3`.

---

### Correção de rumo (2026-08-09): a linha dark sci-fi

**Não é uma task do plano** — é o Henrique parando o passe visual para dizer que ele tinha se
afastado do que ele construiu antes: casco escuro, contraste baixo, luz só onde há energia. O
que entrou, na ordem em que ele pediu, com a arte já criada por ele no PixelLab:

1. **Chefão da Fase 1 — torre remodelada** (`5bba5ffc…` pousada, `48724795…` aérea). Commit
   `b6d256e`. Três coisas para lembrar:
   - As duas animações vieram com quadros PODRES: no grupo do ar o quadro 2 é um borrão cinza e
     o 4/8 têm um clarão branco SOLTO ao lado do casco. Um quadro solto não é só feio — ele entra
     na caixa UNIÃO do `install-boss-fight.mjs` e infla o recorte de todo mundo. O script passou a
     declarar QUAIS índices entram, e em que ordem tocam.
   - Os dois IDLES são sintetizados do estático (`pulsar-brilho.mjs`), não gerados. Já era assim
     no idle de solo; agora vale para o hover aéreo também.
   - A torre nova NÃO tem animação de decolagem. Ver a task seguinte.
2. **Explosões na decolagem** (pedido no meio do trabalho). Sem a animação de decolagem, a troca
   de forma seria um corte seco. A cadeia de estouros de `Boss.blowUpBase()` sobe pela base ao
   longo de ~1s e a arte troca DEBAIXO do maior deles (`SWAP_AT`, no meio da subida) — o truque
   de corte mais velho que existe. **Armadilha aprendida:** `Fx.explodeBig` e o
   `cameras.main.flash(400)` da decolagem antiga lavavam a TELA INTEIRA justamente no quadro que
   o jogador precisa ver. Viraram `Fx.explode(2.6)` (mesma sheet de 128px, sem flash) e um flash
   de 160ms.
3. **Aurora da cutscene 1** (`03f52489…`). Commit `a3747bd`. Remedida: 189×83, convés na row 43,
   vão [12..178]. E a proa aponta para LESTE — a arte nasceu virada a oeste e é espelhada EM
   DISCO na instalação (`scripts/espelhar.mjs`, novo), o que tirou o `setFlipX` de runtime.
4. **Batedor do cinturão** (`ca7ce209…`) — ver Task 2 Step 8.

**Fatias reabertas:** 1 e 2 do passe visual (Fase 1 e Cutscene 1) já estavam mergeadas no `main`.
Os três primeiros itens acima mexem nelas a partir da branch `feat/fase2-visual` — na hora do
merge, é UM merge só, não um por fatia.

**Constraint novo, para todo asset daqui para frente:** casco escuro e dessaturado, luz só onde
há energia (olho, propulsor, boca de canhão). E `setTint` em cima de arte escura REPINTA em vez
de insinuar — o `baseTint` da fase aérea do chefão (`0xff9a6a`) virava o aço em cobre
enferrujado e foi para `0xffd0bc`. Se uma cor de estado precisa aparecer, ela tem que caber na
paleta da arte, não passar por cima dela.

### 2ª volta (mesmo dia): o balanceamento que a arte nova cobrou

O Henrique jogou e a luta do chefão da Fase 1 estava punindo sem querer. Commits `1078701` e
`0049eef`.

- **O leque não deixava espaço.** Virou número com `scripts/_probe-leque.mjs` (mede o vão
  vertical entre cometas na COLUNA do jogador, que é onde importa — na boca do canhão todos
  saem do mesmo pixel): a fase pousada abria 41–44px, folgado para uma nave de ~14px; a AÉREA
  abria 31px **e caía para 15px** onde o tiro mirado cruzava o leque. Corrigido em duas partes,
  e a segunda importa mais: 7 → 5 tiros, e o tiro mirado saiu de dentro do leque (`AIMED_DELAY`,
  400ms depois). Somados eram uma parede; separados no tempo, o leque continua sendo um problema
  de POSIÇÃO e o mirado um de REAÇÃO. Remedido: 41–46px nas duas fases.
- **Os mísseis ganharam propósito próprio.** A salva de 4 em ângulos fixos era o mesmo leque com
  outra arte. Agora sai UM de cada vez, mirado na posição do jogador no instante do disparo e
  reto (corrigir o curso tiraria a única esquiva que o flap permite). `scripts/_probe-missil.mjs`
  confirma a mira em três alturas diferentes.
- **A decolagem ganhou animação.** O que destravou o PixelLab foi PROIBIR item por item no
  prompt: *"no muzzle flash, no white sparks, no white lightning, no bright flares outside the
  silhouette"*. Vale para qualquer asset daqui pra frente — descrever o que se quer não basta,
  tem que listar o que não se quer. O Henrique recortou à mão os 7 quadros que prestam
  (`assets/raw/anim_transi_boss_1`): só a base explodindo, porque depois disso o gerador desenha
  uma torre que não é a dos grandes propulsores. `install-boss-fight.mjs` passou a aceitar grupo
  vindo do DISCO por causa disso.
- **O hover regerado foi RECUSADO por ele** — preferiu o original, onde a minigun aparece
  atirando durante o voo e os bocais brilham em vez de cuspir chama. Lição: mostrar as duas e
  deixar ele escolher, não presumir que "mais efeito" é melhor.
- **A aresta do convés da Aurora precisou de mais desfoque.** O degradê de 3 linhas com pico 0.5
  tinha sido calibrado contra a arte ANTIGA, cuja linha de destaque era clara — ali o ciano
  REFORÇAVA um brilho que a arte já tinha. Na arte nova essa linha é bem mais escura e o mesmo
  ciano passou a DESENHAR. Virou 6 linhas com pico 0.30, caindo para baixo.
- **Armadilha de sonda:** `probe-chain.mjs` escreve `boss.hp = 2` no CAMPO, o que não chama
  `damage()` — então é o golpe seguinte que dispara a decolagem e os 1.3s de imunidade. Com 3s
  de orçamento a cadeia falhava por sorte, não por bug. Subiu para 7s.
- **E depois o leque foi de 5 para 4** (`f7ef889`), nas duas fases: com 5 os vãos já cabiam a
  nave, mas caber não é ser tranquilo — a fase de fúria já entrega a punição da luta, e o leque
  é a batida de fundo. O arco de 60° abre de 15° para 20° entre tiros: 55–62px de vão.

### 3ª volta: a Capitânia e a canhoneira

Commits `0b49aa7`, `760977e`, `8eb3522`.

- **A Capitânia (chefão da Fase 2) entrou fora do escopo original**, a pedido do Henrique — o
  plano a listava como "arte já pronta". A nova é uma EDIÇÃO da anterior: mesmo layout, mesma
  proa, mesma orientação (aponta para a ESQUERDA, vem na sua direção), só muito mais escura e
  com os canhões desenhados. Por isso é a primeira que não passou por `espelhar.mjs`.
- **Nome ambíguo, resolvido aqui:** `canhoneira` é o inimigo comum (45×26, ondas na F1 e na F2);
  a **Capitânia** é o chefão da F2 (124×65). O placeholder procedural dela se chama
  `CANHONEIRA-CAPITÂNIA` no `BootScene`, e foi daí que veio a confusão numa sessão inteira.
- **Baterias remedidas pela própria salva** (`scripts/_medir-capitania.mjs`): cada quadro da
  animação acende UM clarão numa boca, então o clarão é a régua. Média global não servia — o
  disparo alaranja o casco inteiro de leve e puxava o centroide para o meio da nave, dando
  sempre a mesma posição. Virou centroide da VIZINHANÇA do pico.
- **O idle da Capitânia foi gerado e RECUSADO**: o v3 inventou um painel azul que virava magenta
  e depois vermelho. Voltou a ser sintetizado do estático (`pulsar-brilho.mjs`) — é a segunda
  vez no mesmo dia que o idle gerado perde para o sintetizado.
- **`size` é IGNORADO quando se passa `style_images`** — a maior referência define o tamanho de
  saída, e isso já estava escrito no cabeçalho do `gerar.mjs` (lição 17). Custou uma leva
  inteira da canhoneira gerada em 115px quando o pedido era 45. A saída foi recortar uma
  referência 1:1 de 45×26 do próprio batedor.
- **A canhoneira ficou em `scale` 0.72 (83×26)**, encaixando pela ALTURA e não pela largura. É
  decisão de balanceamento: o jogador atira na horizontal, então o perfil VERTICAL é quem decide
  "quão difícil é acertar" (a hitbox sai de `e.height * 0.55`). Pela largura ela ficaria com
  13px de altura e metade da hitbox de hoje — mais tanque sem ninguém ter pedido.
- **`STAGE_2_SKIN` ganhou `tint` e `bullet`**, pela mesma razão que ganhou `scale`: o que foi
  calibrado para a arte biomec (clara) não serve para a do cinturão (quase preta). O lilás
  `0xbfa8f0` repintava a nave; o traço `bolt2` sumia no fundo. Agora a pele carrega a própria
  cor e a própria munição — uma bola de energia de ~15×14 —, e a Fase 1 continua intocada.
- **Fogo foi descartado para o projétil**, por gosto do Henrique e por leitura: fogo é a
  assinatura do chefão da Fase 1 (o cometa da Torre), e repetir a linguagem numa tropa comum
  diluiria a hierarquia.

---

### Task 3: Canhoneira do cinturão — ✅ FEITA

**Files:** Created `public/sprites/enemy-gunship-cinturao.png` + 7 quadros de voo +
`public/sprites/bullet-orb.png`; Modified `src/scenes/BootScene.ts`, `src/systems/EnemySystem.ts`.

- [x] **Step 1: Gerar** — duas levas descartadas antes da boa: a primeira (`469f8fb7`, cinza-azulada
      com magenta) morreu na correção de rumo dark sci-fi; a segunda saiu em 115px porque `size` é
      IGNORADO junto de `style_images`. A terceira usou uma referência 1:1 de 45×26 recortada do
      próprio batedor. **A arte escolhida pelo Henrique acabou vindo da leva de 115px**
      (`2dd7ce65`), pelo canhão mais legível.
- [x] **Step 2: Julgar + aprovação do Henrique** — contact sheets em `scripts/_sheet-canhoneira-*.png`,
      incluindo um comparando as três escalas possíveis em tamanho REAL de tela.
- [x] **Step 3: Instalar** — `install-sprite.mjs` + `install-anim.mjs`. **Não precisou de flip**: é o
      primeiro sprite da série que já nasceu apontando para a direita.
- [x] **Step 4: Registrado em `BootScene.ts`** (`FRAMES.gunshipCinturaoAnim: 7`, `gunship-cinturao-fly`
      a 8fps, `ART` + `animFrames`, e a chave `bulletOrb`).
- [x] **Step 5: DESVIO da dimensão nativa** — a arte veio 115×36, não 45×26. Em vez de recortar
      (esmagaria o desenho), `STAGE_2_SKIN.canhoneira.scale = 0.72` encaixa pela ALTURA: 83×26 em
      tela. Ver a 3ª volta acima para o porquê de ser a altura e não a largura. `DEFS.canhoneira.scale`
      não foi tocado — a Fase 1 continua idêntica.
- [x] **Step 6: Verificar** — build limpo; `scripts/_probe-canhoneira-cinturao.mjs` (nova) confirma
      83×26 tocando `gunship-cinturao-fly`, nariz na direção do voo, e a bola no ar; `probe-stage2.mjs`
      sem erro de página.
- [x] **Step 7: Commits** — `760977e` (arte + voo + tint por pele) e `8eb3522` (bola de energia).

**Fora do texto original, e o Henrique pediu no meio:** o `tint` e o `bullet` por pele. Ver a 3ª volta.

---

### Task 3b: Capitânia — chefão da Fase 2 — ✅ FEITA (fora do escopo original)

O plano listava a Capitânia como fora de escopo ("arte já pronta"). O Henrique pediu a troca no meio
da fatia. Commit `0b49aa7`; detalhes na 3ª volta acima. Arte 124×65, baterias remedidas, idle
sintetizado, salva gerada.

---

### 4ª volta (2026-08-09, fim do dia): o projétil e a saída da atmosfera

Duas coisas que o Henrique pediu ANTES de começar o kamikaze. Commits `8edbaac` e `6911896`.

- **A bola da canhoneira foi refeita e ANIMADA** (arte dele, objeto `99abc5f2`). Os 7 quadros
  nasceram com **deriva**: o desenho escorregava 5.6px para a esquerda e 2.9px para cima ao longo
  do ciclo. Num projétil isso soma à velocidade e vira solavanco a cada volta.
  - Corrigido EM DISCO por `scripts/centrar-anim.mjs` (**novo, e reutilizável** — a deriva é um
    defeito recorrente do PixelLab, como a orientação espelhada). Ele realinha o bloco por um
    ponto comum e recorta todos pela mesma caixa união. A âncora é a **bbox do CORPO** (linhas/
    colunas com menos de 4px opacos não contam): a bbox crua seria puxada pela fagulha de um
    quadro só, e o centroide pelo núcleo quente, que se move de propósito dentro da bola.
    Deriva residual: 0.5px, o arredondamento para inteiro.
  - **Dois números mudaram junto com a arte, para o jogo NÃO mudar.** `scale` 0.5 → 0.8 (a bola
    nova tem corpo de 18px contra os 29 da anterior); e a hitbox virou **círculo** de raio 6.25 no
    centro medido (10,12), como a do cometa da Torre — manter o `0.7` do canvas teria inflado a
    caixa vertical em 37%, porque o canvas novo é mais alto e a fagulha teria virado hitbox.
  - **Armadilha de sonda:** ao tocar a animação, `texture.key` deixa de ser `bulletOrb` e vira a
    chave do QUADRO (`bulletOrbAnim3`) — cada quadro é uma textura própria (`animFrames`). Filtrar
    por igualdade não acha o tiro.
  - De quebra: a bola anterior tinha **3 componentes soltas** no PNG (a esfera + dois cacos de 32
    e 30px flutuando no canvas). A nova está limpa.

- **A saída da atmosfera ganhou cenário próprio** (`public/sprites/paint-bg-zerog.png`, arte dele).
  Os ~6.5s de zero-G entre a Torre morrer e a cutscene 1 rodavam contra o cenário da Fase 1.
  Medido, não suposto: o terreno procedural apaga sim, mas `paintBgF1`, `groundFront` e o gradiente
  de céu ficavam inteiros.
  - **Coreografia:** a bruma fecha (0.95s) → a troca acontece DENTRO dela (delay 500ms) → a bruma
    ABRE, cada faixa DESCENDO enquanto se dissolve. O passo 2 é o mesmo truque de corte da
    decolagem do chefão; o passo 3 foi pedido depois de o Henrique jogar ("liberdade ao sair") —
    apagar só não bastava, porque névoa que perde opacidade some POR CIMA da nave e lê como
    "o efeito acabou".
  - **Depth −95.5 resolve quase tudo de graça:** a pintura é opaca, então céu (−99), nebulosa
    (−98) e tráfego (−96) somem cobertos. Só o que está NA FRENTE dela precisa de fade à mão.
  - **A convenção real de tamanho de pintura é 480×270** (com `y = −27` centralizando em 384×216),
    como `paintBgF2`/`paintBgCut1` — não os 768×432 que o texto da Task 0 deste plano afirma.
  - **A lua procedural não entra mais quando há pintura**: clara e chapada, ela lia como adesivo
    sobre arte escura — e o corpo que a nave deixa já está desenhado ocupando a tela.
  - **`fogBand` é textura de CANVAS, não `Graphics`:** `fillCircle` dá disco de aresta dura (cem
    discos somam um degradê liso = filtro de cor, não névoa), e `Graphics` **não sabe apagar** — a
    queda das bordas tem que ser recorte (`destination-out`) por cima do desenho pronto. Calculá-la
    por borrão não funciona: raio 40 numa faixa de 64 cobre a altura inteira em alpha uniforme e
    devolve arestas retas.
  - **A névoa arrasta só na HORIZONTAL.** `tilePositionY` desloca a coincidência entre a parte
    transparente da textura e a borda do TileSprite; o miolo opaco chega na borda, que corta seco,
    e aparecem linhas retas atravessando a pintura.
  - **Retardatário de camada:** `gap = [1e9,1e9]` não basta — o `while (nextX < …)` ainda solta UM
    sprite, e ele nascia com o alpha cheio da camada. Zerar `layer.alpha` faz o `alphaFor()`
    (a fonte única) apagar também o retardatário.

---

### Task 4: Kamikaze do cinturão (espeto na proa, facção nova)

**Files:** Create `public/sprites/enemy-kamikaze.png` (substitui a atual, MESMA chave — o
kamikaze não troca por fase); Modify `src/scenes/BootScene.ts` só se a contagem de quadros mudar.

> ⚠️ **DECISÃO EM ABERTO — resolver com o Henrique ANTES de gerar (2026-08-09).** O levantamento
> já está feito; falta só a escolha dele.
>
> O kamikaze aparece em **todas as três fases** (`StageDirector`: F1 em t=35/40/50/58/65, F2 em
> t=20/32/67/76, F3 em t=27/33/54/64/75) **e dentro da luta da Capitânia** (`BossCapitania` larga
> 2 por ciclo, 3 na fúria, teto de 5). Uma arte na chave `enemyKamikaze` muda os quatro lugares.
>
> E há o `tint`: `DEFS.kamikaze.tint = 0xffb066` (laranja quente, já ABRANDADO uma vez de
> `0xff8c1a` porque o laranja chapado apagava o espeto). Pela lição da correção de rumo — `setTint`
> sobre arte escura REPINTA — um casco carvão sai laranja chapado. Numa troca global o tint teria
> de ir para ~branco, e aí **o kamikaze da Fase 1 deixa de ser a peça quente que é hoje**.
>
> As opções levantadas:
> 1. **Pele só da Fase 2** (entra na `STAGE_2_SKIN`, que já aceita `texture`/`anim`/`scale`/
>    `tint`/`bullet`): uma linha na tabela + chaves novas no `BootScene`. F1/F3/Capitânia
>    intocadas, e o `scale?` por pele salva qualquer dimensão nativa divergente — a arte não
>    precisa sair em 26×24.
> 2. **Troca global**, como o texto original desta task diz: exige arte perto de 26×24 (senão
>    `DEFS.kamikaze.scale` muda e o balanceamento junto) e o tint indo para ~branco.
> 3. Troca global mantendo o tint quente — assumindo que a arte carvão vai ler alaranjada.
>
> O **cargueiro (Task 5) está no mesmo caso** (60×39, `scale` 1.1, tint `0xb9a8d8`, presente nas
> três fases) — vale decidir junto ou logo depois, mas conscientemente.

- [ ] **Step 1: Gerar** — na linha dark sci-fi e ancorado no BATEDOR (ver Task 1 Step 1), não na Capitânia: `node scripts/gerar.mjs "small interceptor with a sharp forward spike on the nose, very dark charcoal armour, almost black, low contrast, dim deep red glowing accents, no bright colours, dark sci-fi, side view" 32 sidescroller scripts/_ref-batedor-45.png`. **Proibir os clarões item por item no prompt** — "no muzzle flash, no white sparks, no white lightning, no bright flares outside the silhouette" — é o que destravou todas as animações desta sessão. ⚠️ O kamikaze **não troca por fase**: ele substitui a arte na MESMA chave, então não há `STAGE_2_SKIN.scale` para salvar uma dimensão nativa divergente. Ou a arte sai perto de 26×24, ou o `DEFS.kamikaze.scale` muda — e aí a Fase 1 muda junto. Animação de voo (`frameRate` 14 já fixado).
- [ ] **Step 2: Julgar + aprovação do Henrique.**
- [ ] **Step 3: Instalar NA MESMA CHAVE** — `install-sprite.mjs <object-id> <frame> enemy-kamikaze` e `install-anim.mjs kamikaze-anim <url-base> <n> enemy-kamikaze` (sobrescrevendo `public/sprites/enemy-kamikaze*.png` — sem mudança nenhuma em `BootScene.ART`/`EnemySystem`, já apontam para essa chave).
- [ ] **Step 4: Se a contagem de quadros divergir de 7**, atualizar `FRAMES.kamikazeAnim` em `BootScene.ts`.
- [ ] **Step 5: Medir dimensão nativa**; recortar para bater com 26×24 se divergir (não tocar `DEFS.kamikaze.scale`).
- [ ] **Step 6: Verificar** — build PASS; `probe-stage2.mjs`: o kamikaze lê como espeto quente vindo em cima do jogador, casado com a paleta da Capitânia, mesmo tamanho/velocidade/homing de hoje.
- [ ] **Step 7: Commit** — `feat(fase2): arte nova do kamikaze (facao do cinturao)`.

---

### Task 5: Cargueiro do cinturão (barriga com hangar aberto, facção nova)

**Files:** Create `public/sprites/enemy-carrier.png` (substitui a atual, MESMA chave — o
cargueiro não troca por fase); Modify `src/scenes/BootScene.ts` só se a contagem de quadros mudar.

- [ ] **Step 1: Gerar** — mesma linha e mesmas armadilhas do kamikaze: `node scripts/gerar.mjs "slow bulky freighter with an open hangar bay on the belly, very dark charcoal hull, almost black, low contrast, dim deep red glow inside the bay, no bright colours, dark sci-fi, side view" 60 sidescroller scripts/_ref-batedor-45.png` (dimensão nativa 60×39, igual à atual — o hangar aceso na barriga é onde os drones nascem, ver `EnemySystem.updateCarrier`; e ele TAMBÉM não troca por fase). Animação lenta (`frameRate` 6, já fixado).
- [ ] **Step 2: Julgar + aprovação do Henrique.**
- [ ] **Step 3: Instalar NA MESMA CHAVE** — `install-sprite.mjs <object-id> <frame> enemy-carrier` e `install-anim.mjs carrier-anim <url-base> <n> enemy-carrier`.
- [ ] **Step 4: Se a contagem de quadros divergir de 7**, atualizar `FRAMES.carrierAnim`.
- [ ] **Step 5: RE-MEDIR onde a barriga/hangar fica no PNG novo** — `updateCarrier` cospe o drone em `e.y + Phaser.Math.Between(4, 14)`, relativo ao centro do sprite; confirmar visualmente que o drone ainda nasce de dentro do hangar aceso, não do meio do casco.
- [ ] **Step 6: Medir dimensão nativa**; recortar para bater com 60×39 se divergir (não tocar `DEFS.cargueiro.scale`).
- [ ] **Step 7: Verificar** — build PASS; `probe-stage2.mjs` (`probe-stage2-cargueiro.png`): o cargueiro lê pesado/lento, hangar aceso na barriga cuspindo drones, casado com a facção nova.
- [ ] **Step 8: Commit** — `feat(fase2): arte nova do cargueiro (facao do cinturao)`.

---

### Task 6: Regressão + revisão final

- [ ] **Step 1: `npm run build`** limpo (typecheck + vite).
- [ ] **Step 2: `node scripts/probe-stage2.mjs`** — verde, sem erro de página/console; os quatro
      screenshots (`cinturao`, `kamikaze`, `cargueiro`, `capitania`) mostram a facção nova coesa
      e a Capitânia intocada.
- [ ] **Step 3: `node scripts/probe-chain.mjs`** — a cadeia Fase 1 → chefão → zero-G → Fase 2
      continua fechando; a canhoneira/batedor da FASE 1 continuam com a arte biomec roxa (a pele
      do cinturão só aparece na Fase 2).
- [ ] **Step 4: Revisão a olho — roster lado a lado.** Um screenshot com os 4 redesenhados
      (mesmo princípio do `probe-roster-f1.mjs` da Fatia 1: "dá para distinguir num relance") +
      o drone roxo biomec ao lado — confirma o critério de sucesso #3 do spec (duas facções na
      mesma fase, legível).
- [ ] **Step 5: Hitbox/balanceamento** — conferir visualmente que nenhum dos quatro cresceu/
      encolheu em jogo (comparar com os screenshots do Task 0/commits anteriores).
- [ ] **Step 6: Merge** — seguir `superpowers:finishing-a-development-branch` a partir da branch
      `feat/fase2-visual` (mesmo fluxo das fatias 1 e 2).

---

## Self-review (cobertura do spec)

- Facção nova ancorada na Capitânia (style ref) → Task 1 Step 1, Tasks 2–5. ✔
- Drone continua roxo biomec → Global Constraints (nenhuma task mexe nele). ✔
- Redesenho dos 4 (batedor/canhoneira/kamikaze/cargueiro) → Tasks 2–5. ✔
- Canhoneira/batedor trocam de textura por FASE sem duplicar `EnemyKind` (opção A) → Task 1. ✔
- Comportamento/balanceamento/hitbox inalterados → Global Constraints + Steps de dimensão nativa
  em cada task. ✔
- Fundo pintado ENTRA (não substitui `Parallax('espaco')`), depth −99, guarda de `mode` +
  textura → Task 0 (feito). ✔
- Guarda de textura em toda arte nova → Constraints + Step de instalação de cada task. ✔
- Fora de escopo (Capitânia, mina, destroços, `setApproach()`) → nenhuma task toca esses
  arquivos/mecanismos. ✔
- Verificação (`npm run build`, `probe-stage2.mjs`, revisão a olho, hitbox) → Task 6. ✔

Sem placeholders de código onde há código (Task 1 traz o diff completo do `EnemySystem`/
`GameScene`). Tasks 2–5 são interativas por natureza (arte aprovada asset por asset pelo
Henrique) — os steps de geração/julgamento/aprovação são a ordem correta do pipeline
estabelecido (`docs/HANDOFF.md` §PixelLab), não placeholders.
