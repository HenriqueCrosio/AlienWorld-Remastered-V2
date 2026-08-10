# START — Fatia 3: FASE 2 ("Frota Morta")

**Documento de retomada.** Atualizado **2026-08-09 (fim da sessão)**: Tasks 0–3 fechadas, a
Capitânia entrou fora do escopo, a correção de rumo dark sci-fi reabriu as fatias 1 e 2, e a
canhoneira ganhou bola animada. **Faltam as Tasks 4, 5 e 6** (kamikaze, cargueiro, regressão+merge).

---

## 🔑 COMO RETOMAR (frase de arranque)

Na próxima sessão, diga:

> **"Leia `docs/superpowers/plans/2026-08-05-fase2-visual-START.md` e continue a Fatia 3 na branch
> `feat/fase2-visual`. Comece decidindo comigo a pergunta em aberto do kamikaze (Task 4 do plano),
> depois siga para as Tasks 4, 5 e 6."**

Isso é o suficiente — este doc e o plano têm todo o contexto.

---

## Estado atual (2026-08-09)

- **Branch:** `feat/fase2-visual`, à frente de `main`. **Nada mergeado ainda.**
- **Plano:** `docs/superpowers/plans/2026-08-05-fase2-visual.md` — leia a **"Correção de rumo"** e
  as **2ª, 3ª e 4ª voltas**, que é onde mora o que foi aprendido (elas valem mais que os Steps).
- **Verificação:** `npm run build` limpo; `probe-chain` fecha a corrente; `probe-stage2` sem erro
  de página.

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

### Falta

- **Task 5 — cargueiro.** A decisão que travava o kamikaze **já foi resolvida e vale igual aqui**:
  troca GLOBAL, mesma chave, `tint` branco (ver o bloco ✅ na Task 4 do plano). Não há decisão
  nova a tomar — só gerar/receber a arte, instalar e medir.
- **Task 6 — regressão final + merge.** ⚠️ As fatias 1 e 2 foram REABERTAS pela correção de rumo,
  então o merge é **UM só**, não um por fatia. E a troca do kamikaze foi GLOBAL: a regressão
  precisa cobrir as fases 2, 3 e 4, não só a 2 (`probe-chain` ainda NÃO foi rodado depois dela).

---

## Regras que não se redescobrem (custaram sessão)

- **Arte dark sci-fi:** casco escuro e dessaturado, luz só onde há energia. E `setTint` sobre arte
  escura **REPINTA** em vez de insinuar — cor de estado tem que caber na paleta da arte.
- **O PixelLab ignora "facing right".** Trate como padrão, não acidente. `scripts/espelhar.mjs`
  espelha o bloco inteiro em disco (melhor que `setFlipX` sempre que houver offset medido no PNG).
- **O PixelLab anima sem âncora**, e o desenho escorrega ao longo do ciclo.
  `scripts/centrar-anim.mjs` (novo) tira a deriva do bloco em disco.
- **Descrever o que se quer não basta: liste o que NÃO se quer** no prompt ("no muzzle flash, no
  white sparks, no white lightning, no bright flares outside the silhouette"). Foi isso que
  destravou todas as animações.
- **`size` é IGNORADO quando se passa `style_images`** — a MAIOR referência define o tamanho de
  saída. Para gerar em 45px é preciso uma referência DE 45px (`scripts/_ref-batedor-45.png`, que é
  **gitignorado**; refazer com a linha registrada na Task 1 Step 1 do plano).
- **A âncora de facção é o batedor** (`public/sprites/enemy-scout-cinturao.png`), não mais a
  Capitânia.
- **A FASE 1 NÃO TEM KAMIKAZE NEM CARGUEIRO.** Os dois vivem em `STAGE_2`/`STAGE_3`/`STAGE_4`. O
  texto original da Task 4 dizia o contrário — ele rotulou os roteiros com um deslocamento de um,
  e uma decisão de arte inteira foi construída em cima disso. **Conte no `StageDirector` antes de
  afirmar em que fase um inimigo aparece.**
- **A hitbox sai da TELA do quadro, não da arte desenhada dentro dela**
  (`e.body.setSize(e.width * 0.6, e.height * 0.55)`, e o Arcade multiplica pela escala do sprite).
  Duas consequências: mexer no `scale` NÃO é mexer no balanceamento se o tamanho em tela for
  segurado; e instalar arte recortada justa no lugar de arte com moldura ENCOLHE a hitbox em
  silêncio (ver `scripts/_kami-moldura.mjs`).
- **A referência define o TAMANHO DA TELA de saída, não a PROPORÇÃO da nave.** Referência 1.47
  devolveu conteúdo 1.74–1.88. Proporção não sai do prompt nem da referência — se ela importa,
  desenhe à mão.
- **Comparar candidatos pela tela do PNG mente** — o que se compara é a caixa de CONTEÚDO, medida
  alfa a alfa (`sharp.trim()` devolve a tela inteira nestes PNGs).
- **O perseguidor voava de ponta-cabeça** desde sempre: `updateChaser` gira o sprite, e ir para a
  esquerda passa de 90°. Corrigido com `setFlipY`. Arte simétrica esconde esse tipo de defeito —
  **arte com dorso e barriga é o que denuncia.**
- **Idle sintetizado ganha de idle gerado** — duas vezes no mesmo dia (`pulsar-brilho.mjs`).
- **Pintura de fundo é 480×270** (posicionada com `y = −27`), como `paintBgF2`/`paintBgCut1`.
- **Sempre olhe o inimigo SE MOVENDO na sonda**, não só o contact sheet: orientação, tamanho em
  tela e hitbox só aparecem em jogo.
- **Mostre as duas opções e deixe o Henrique escolher** — não presuma que "mais efeito" é melhor
  (o hover regerado do chefão foi recusado em favor do original).
- **Autoria dos commits: só o Henrique**, sem `Co-Authored-By`.

## Sondas úteis desta fatia

`probe-chain.mjs` · `probe-stage2.mjs` · `_probe-zerog.mjs` (a saída da atmosfera, 6 marcos) ·
`_diag-zerog.mjs` (mede alpha a alpha em vez de julgar por screenshot) · `_probe-orb.mjs` ·
`_probe-canhoneira-cinturao.mjs` · `_probe-batedor-cinturao.mjs`

⚠️ **`_probe-zerog`/`_diag-zerog`:** para matar a Torre, `damage()` **não mata** — ele devolve
`true` e quem conduz a morte é `GameScene.killBoss` (como em `onBulletHitBoss`). Escrever `hp = 2`
no campo também não conta como golpe.
