# START — Fatia 3: FASE 2 ("Frota Morta")

**✅ FATIA FECHADA (2026-08-15).** Tasks 0–6 completas, regressão verde, merge ÚNICO em `main`
(`138acf7`) e push feito em `origin/main`. Branch `feat/fase2-visual` apagada localmente (a remota
segue de pé). Ver "Fechamento" no fim do documento.

---

## 🔑 COMO RETOMAR (frase de arranque)

A Fatia 3 acabou. A próxima é a **Fatia 4 — Cutscene 2 (Interlude2): a doca no cinturão e a
explosão**, e ela ainda não tem spec nem plano. Na próxima sessão, diga:

> **"Leia `docs/superpowers/plans/2026-08-05-fase2-visual-START.md` para o contexto do que já
> fechou, e comece a Fatia 4 — Cutscene 2 (a doca no cinturão e a explosão) — pelo
> BRAINSTORMING, rumo ao spec. Ainda não há plano, então não comece a implementar."**

O fluxo da casa é brainstorming → spec → plano → implementação; pular direto para o código já
custou sessão antes.

---

## Estado atual (2026-08-15)

- **Branch:** nenhuma. `main` = `origin/main` = `138acf7`.
- **Fatias 0, 1, 2 e 3 fechadas e mergeadas.** Restam as fatias 4–8 (ver mapa em
  `docs/superpowers/specs/2026-07-21-menu-visual-design.md`).
- **Verificação no merge:** `npm run build` limpo; `probe-chain` fecha a corrente; `probe-stage2`
  sem erro de página; róster conferido nas quatro fases; hitboxes iguais às de antes das trocas.

### Feito

| | |
|---|---|
| **Task 0** | Fundo pintado do cinturão (`paint-bg-f2.png`) |
| **Task 1** | Infra de pele por fase (`STAGE_2_SKIN` + `stageId` no `EnemySystem`) |
| **Task 2** | Batedor do cinturão — **refeito** em 09/08 (arte escura, 11 quadros) |
| **Task 3** | Canhoneira do cinturão + bola de energia |
| **Task 3b** | **Capitânia** (chefão da F2) — entrou fora do escopo, a pedido |
| **Correção de rumo** | Chefão da F1 remodelado, explosões na decolagem, Aurora da cutscene 1 |
| **2ª volta** | Balanceamento que a arte nova cobrou (leque, mísseis, decolagem animada) |
| **4ª volta** | Bola da canhoneira animada e sem deriva; **saída da atmosfera** com pintura própria |
| **Task 4** | **Kamikaze** — arte feita à mão pelo Henrique, troca GLOBAL, `tint` branco, `scale` 0.85; hitbox conferida em jogo |
| **Task 5** | **Cargueiro** — idem, 13 quadros, `scale` intocado; baia MEDIDA e o `updateCarrier` acertado para cuspir de dentro dela |
| **Task 6** | **Regressão + merge.** Róster conferido nas 4 fases, orientação do kamikaze por fase, hitboxes inalteradas, merge único em `main` |

---

## Regras que não se redescobrem (custaram sessão)

### Arte

- **Arte dark sci-fi:** casco escuro e dessaturado, luz só onde há energia. E `setTint` sobre arte
  escura **REPINTA** em vez de insinuar — cor de estado tem que caber na paleta da arte.
- **A leitura de um inimigo é uma função do FUNDO, não só da arte.** A baia do cargueiro ANUNCIA
  na Fase 2 (casco quase se funde com a rocha, só ela o separa) e CAMUFLA na Fase 4 (o cenário é
  feito de órgãos vermelhos). Nenhum código muda entre as duas. Toda troca na chave BASE é global,
  e o preço dela se cobra por fase — só o róster lado a lado mostra isso.
- **Sempre olhe o inimigo SE MOVENDO na sonda**, não só o contact sheet: orientação, tamanho em
  tela e hitbox só aparecem em jogo. Para animação de ciclo longo, `_ver-cargueiro-mov.mjs`
  monta GIF + folha de contato (um quadro por índice).
- **Mostre as duas opções e deixe o Henrique escolher** — não presuma que "mais efeito" é melhor.
- **Idle sintetizado ganha de idle gerado** (`pulsar-brilho.mjs`).
- **Pintura de fundo é 480×270** (posicionada com `y = −27`), como `paintBgF2`/`paintBgCut1`.

### Geração (PixelLab)

- **O PixelLab ignora "facing right".** Trate como padrão, não acidente. `scripts/espelhar.mjs`
  espelha o bloco inteiro em disco (melhor que `setFlipX` sempre que houver offset medido no PNG).
- **O PixelLab anima sem âncora**, e o desenho escorrega ao longo do ciclo.
  `scripts/centrar-anim.mjs` tira a deriva do bloco em disco.
- **Descrever o que se quer não basta: liste o que NÃO se quer** no prompt ("no muzzle flash, no
  white sparks, no white lightning, no bright flares outside the silhouette").
- **`size` é IGNORADO quando se passa `style_images`** — a MAIOR referência define o tamanho de
  saída. Para gerar em 45px é preciso uma referência DE 45px (`scripts/_ref-batedor-45.png`, que é
  **gitignorado**; refazer com a linha registrada na Task 1 Step 1 do plano).
- **A referência define o TAMANHO DA TELA de saída, não a PROPORÇÃO da nave.** Referência 1.47
  devolveu conteúdo 1.74–1.88. Proporção não sai do prompt nem da referência — se ela importa,
  desenhe à mão. (Foi o que aconteceu no kamikaze e no cargueiro: cinco levas, nenhuma melhor.)
- **Comparar candidatos pela tela do PNG mente** — o que se compara é a caixa de CONTEÚDO, medida
  alfa a alfa (`sharp.trim()` devolve a tela inteira nestes PNGs).
- **A âncora de facção é o batedor** (`public/sprites/enemy-scout-cinturao.png`), não a Capitânia.

### Instalação de arte nova

- **A hitbox sai da TELA do quadro, não da arte desenhada dentro dela**
  (`e.body.setSize(e.width * 0.6, e.height * 0.55)`, e o Arcade multiplica pela escala do sprite).
  Duas consequências: mexer no `scale` NÃO é mexer no balanceamento se o tamanho em tela for
  segurado; e instalar arte recortada justa no lugar de arte com moldura ENCOLHE a hitbox em
  silêncio (ver `scripts/_moldurar.mjs`).
- **Redesenho na mesma chave: cheque se existe uma `<chave>2` registrada no `BootScene`.** Ela é
  a arte VELHA, e o `pickVariant` sorteia entre base e variante — metade dos inimigos nasceria com
  o sprite antigo, e sem animação (ela só toca na variante BASE). Pegou o cargueiro
  (`enemyCarrier2`) e o drone.
- **Onde a arte ACENDE se mede por SATURAÇÃO, não por luminância.** A baia do cargueiro é
  colorida; o casco e as espinhas dorsais são claros mas NEUTROS, e um limiar de brilho devolve
  as espinhas junto.

### Fases e comportamento

- **A FASE 1 NÃO TEM KAMIKAZE NEM CARGUEIRO.** Os dois vivem em `STAGE_2`/`STAGE_3`/`STAGE_4`.
  **Conte no `StageDirector` antes de afirmar em que fase um inimigo aparece.**
- **A pele por fase (`STAGE_2_SKIN`) só liga na fase 2.** Nas fases 3 e 4 o batedor e a canhoneira
  VOLTAM ao biomec roxo — é desenho, não bug. O kamikaze e o cargueiro, por trocarem na chave
  base, valem nas três.
- **O perseguidor voava de ponta-cabeça** desde sempre: `updateChaser` gira o sprite, e ir para a
  esquerda passa de 90°. Corrigido com `setFlipY`. Arte simétrica esconde esse tipo de defeito —
  **arte com dorso e barriga é o que denuncia.**

### Sondas (armadilhas das próprias ferramentas)

- **`probe-stage2` morre em t≈37s**, antes das ondas de kamikaze e cargueiro: o piloto automático
  não chega vivo lá. Ela NÃO é sonda para julgar esses dois — use `_probe-kami.mjs` e
  `_ver-cargueiro-mov.mjs`, que spawnam à mão.
- **Os `setInterval` do navegador SOBREVIVEM ao `scene.start`** — eles vivem na janela, não na
  cena, e `getScene('Game')` devolve a MESMA instância a cada fase. Laço de fase anterior segue
  rodando e mexe no elenco novo. Guarde os ids e mate na troca (`_probe-roster-fases.mjs`).
- **`texture.key` é o QUADRO corrente, não a arte.** `kamikazeAnim7` vs `...8` são o mesmo sprite
  em pontos diferentes do ciclo. Para comparar artes, use `anims.currentAnim.key`.
- **`pageHeight` do `sharp` vai DENTRO de `raw`.** No topo das opções ele é aceito e IGNORADO em
  silêncio, e o GIF sai como uma tira estática de N andares. Confira `pages` depois de escrever.
- **O cargueiro é uma fábrica** — a cria dele suja qualquer fileira posada. Feche o elenco no ato
  do spawn.
- **`_probe-zerog`/`_diag-zerog`:** para matar a Torre, `damage()` **não mata** — ele devolve
  `true` e quem conduz a morte é `GameScene.killBoss` (como em `onBulletHitBoss`). Escrever
  `hp = 2` no campo também não conta como golpe.

### Processo

- **Autoria dos commits: só o Henrique**, sem `Co-Authored-By`.
- **Merge de fatia usa `--no-ff`** com mensagem `merge: <descrição>` (convenção da história).
  `git merge -F -` NÃO lê de stdin como `git commit` — passe por arquivo.

## Sondas úteis desta fatia

`probe-chain.mjs` · `probe-stage2.mjs` · `_probe-roster-fases.mjs` (róster nas 4 fases + tabela de
textura/tamanho/hitbox — **a sonda de regressão de troca global**) · `_ver-cargueiro-mov.mjs`
(GIF + ciclo quadro a quadro) · `_probe-kami.mjs` (aceita a fase: 2, 3 ou 4) ·
`_probe-cargueiro.mjs` · `_probe-zerog.mjs` · `_diag-zerog.mjs` · `_probe-orb.mjs` ·
`_probe-canhoneira-cinturao.mjs` · `_probe-batedor-cinturao.mjs`

---

## Fechamento

Mergeada em `138acf7`, com `main` empurrado para `origin`. A regressão da Task 6 passou em tudo o
que era critério: build limpo, corrente fechada, róster coeso nas quatro fases, hitboxes idênticas
às de antes das trocas (kamikaze `15.8×13.1`, cargueiro `39.6×23.6`).

**Duas coisas ficaram ABERTAS de propósito** — foram vistas, medidas e não resolvidas, porque
resolvê-las é decisão de arte que o Henrique ainda não tomou:

1. **A baia do cargueiro camufla na Fase 4.** O interior do Leviatã é feito de órgãos vermelhos, e
   a baia cicla no vermelho nos quadros 1–5. Na Fase 2 ela é o que anuncia o cargueiro; ali ela o
   esconde. Se virar problema de jogo, o caminho provável é uma pele de fase para a Fase 4 (a
   infra do `STAGE_2_SKIN` já existe e é genérica o bastante), não repintar a arte.
2. **O batedor do cinturão é a silhueta mais frágil do róster** — 32×10 px de casco escuro sobre
   campo de asteroides escuro. Lê como arranhão, não como nave. É dívida da Task 2, não das
   Tasks 4/5.

Nenhuma das duas bloqueia a Fatia 4.
