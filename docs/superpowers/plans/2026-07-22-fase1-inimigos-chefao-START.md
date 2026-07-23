# START — Fatia 1 leva 2: INIMIGOS + CHEFÃO da Fase 1 (retomada)

**Documento de retomada desta leva.** Criado 2026-07-22 no fim de uma sessão longa, para uma
próxima sessão criar os assets no PixelLab e implementar.

---

## 🔑 COMO RETOMAR (invocação)

Na próxima sessão, diga algo como:

> **"Leia `docs/superpowers/plans/2026-07-22-fase1-inimigos-chefao-START.md` e continue a leva de
> inimigos + chefão da Fase 1, executando o plano a partir da Task 1."**

Isso é o suficiente — este doc tem todo o contexto, o pipeline e os prompts.

---

## Estado atual (2026-07-23)

- **Branch:** `feat/fase1-cenario` (a leva 2 seguiu nela; a leva 1/cenário já está completa e
  commitada aqui).
- **Spec:** `docs/superpowers/specs/2026-07-22-fase1-inimigos-chefao-design.md` (commit `1408127`)
- **Plano:** `docs/superpowers/plans/2026-07-22-fase1-inimigos-chefao.md` (commit `602230b`)
- **A LEVA 2 ESTÁ COMPLETA.** Tasks 0–8 fechadas: drone, batedor, canhoneira, torre de solo,
  arte do chefão, salva de mísseis, telégrafo + fúria, e a regressão.
- O chefão é a **fortaleza do Henrique** (`49a4f934-6aa9-4d85-aaec-9334890a5816`, 197×190). Um
  lote automático ficou sem uso em review: `f8a87745-dd7d-4cd6-812f-13d623796ce3` — descartar com
  `dismiss_review` quando quiser.

### O que ficou de dívida (nenhuma bloqueia a fatia)

- **Batedor**: não virou o DARDO magro do spec. Ele se separa do drone por tamanho e limpeza de
  casco, não por silhueta. Regerar exigiria resolver o dilema vista-vs-forma (ver a lição abaixo).
- **Animação de despertar do chefão**: a de 13 quadros do Henrique (`ce2a3b84-…`, a cidadela
  rachando e decolando) é um belo beat de ENTRADA e está sem uso — hoje o chefão só entra
  deslizando. Ligá-la seria código novo na entrada do `Boss.ts`.

## ⚠️ A SEGUNDA LIÇÃO: o v3 não faz IDLE SUTIL

Duas tentativas de animar a fortaleza "pairando" voltaram estroboscópio — a estrutura inteira
lavando de branco e o **olho magenta apagando**. Medido: luminância média oscilando entre 36 e 88
contra 45 do quadro base, e a contagem de pixels magenta caindo a zero em vários quadros. Não
havia subconjunto aproveitável nos dois lotes.

O v3 dramatiza: quanto mais sutil o pedido, mais ele parece compensar. Pedir "do not flash, do
not change color" não adiantou.

**A saída:** `scripts/pulsar-brilho.mjs` sintetiza o loop a partir de UM quadro bom, modulando
cada pixel pela própria "magentice" (R−G). Pedra cinza (R≈G) fica byte a byte intacta; só o olho
e as veias respiram. E o que a arte não tem — os propulsores — virou **emissor de partículas** no
`Boss.ts`, que é como o resto do jogo faz fogo. Vale para qualquer sprite grande daqui em diante.

## ⚠️ A LIÇÃO DO PIPELINE DE ARTE (custou 5 lotes)

**A `style_images` manda mais que a descrição.** Três regras, todas verificadas:

1. **Ref = o sprite ATUAL do próprio inimigo → máquina de cópia.** 64 candidatos do drone saíram
   como releituras do drone antigo; idem batedor e canhoneira. A descrição foi ignorada.
2. **Sem ref nenhuma → a forma se solta, mas a VISTA se perde.** Sai de cima/de frente, inútil num
   side-scroller. O parâmetro `sidescroller` sozinho não segura — quem carrega a vista é a ref.
3. **O que funciona: ref de OUTRO asset, em vista lateral, já no tamanho alvo.** Ela carrega vista
   e paleta sem impor a silhueta. Quanto mais DISTANTE a ref do que se pede, mais a forma se
   solta (a torre de solo escapou porque a ref era cinza-mecânica e o pedido era roxo-biomec).

E: **`size` mínimo da API é 32**; com `style_images` o `size` é ignorado e a MAIOR ref define o
tamanho de saída.

## Objetivo da leva (resumo do spec)

1. Redesenhar os **4 inimigos** da Fase 1 (drone, batedor, canhoneira, torre de solo) com
   **silhuetas distintas por função**, mantendo a facção (defesas biomec da colônia, roxo/magenta,
   **olho magenta brilhante**). **Comportamento e balanceamento INALTERADOS — só arte.**
2. Chefão **Torre**: arte nova (presença) + **salva de MÍSSEIS NÃO teleguiada** (padrão fixo, só
   esquivar — flap + homing seria punitivo), leques mantidos, telégrafos + marco de fúria.

## Ordem (Tasks do plano)

1 drone → 2 batedor → 3 canhoneira → 4 torre de solo → 5 chefão (arte) → 6 mísseis (código) →
7 telégrafo + fúria (código) → 8 regressão.

---

## 🛠️ Pipeline de arte (repetir por asset)

1. **Gerar objeto:** `node scripts/gerar.mjs "<desc em inglês>" <size> sidescroller <ref.png>`
   → imprime `OBJECT_ID`. Usa `.env.pixellab` (a chave; já existe). Com `style_images` (o ref) o
   `size` é IGNORADO — a MAIOR ref define o tamanho. Ref de facção = `public/sprites/enemy-gunship.png`
   (paleta magenta/roxo).
2. **Revisar:** MCP `get_object(object_id=OBJECT_ID)` → mostra os candidatos inline (16 quando
   size ≤85). Escolher o melhor. **Mostrar ao Henrique e aprovar antes de instalar.**
3. **Promover:** MCP `select_object_frames(object_id, indices=[N])` (ou `dismiss_review` p/ descartar
   e regerar).
4. **Animar:** MCP `animate_object(object_id, animation_description="hovering/thrusters, eye pulsing",
   frame_count=6)` → 7 quadros (v3 guarda o quadro-ref, então 6 → 7). Esperar com `get_object`
   (pega a URL base: `animations[].unknown` = `.../animations/<animId>/unknown` com `/{i}.png`).
5. **Instalar (quadros + estático):**
   `node scripts/install-anim.mjs <prefixo-arq> <url-base> 7 <estatico>`
   - drone → `install-anim.mjs drone-anim <url> 7 enemy-drone`
   - batedor → `scout-anim <url> 7 enemy-scout`
   - canhoneira → `gunship-anim <url> 7 enemy-gunship`
6. **Wire:** MANTER as chaves atuais no BootScene (`enemyDrone`/`droneAnim`/`drone-fly`, etc.) — o
   EnemySystem não muda. Ajustar `DEFS.<kind>.scale` (`src/systems/EnemySystem.ts`) só se a arte
   nova mudou de tamanho, para manter a HITBOX (~28×26 drone/batedor, ~45×26 canhoneira).
   ⚠️ **Remover a variante 2** (`enemyDrone2`, `enemyCarrier2`) do BootScene se não for regerá-la,
   senão o `pickVariant` mistura arte velha + nova.
7. **Verificar:** `npm run build`; subir a F1 com `node scripts/probe-stage1-visual.mjs` (harness já
   existe) e conferir a olho; sonda de regressão.

---

## 🎨 Assets + prompts (facção coesa, vista lateral apontando à direita)

- **drone** — OBJECT_ID **`0c66617e-d845-481b-b03d-82dacc607c09`** (⚠️ **EM REVIEW, 16 candidatos**).
  Prompt usado: *"small compact biomechanical alien swarm drone, rounded pod body, single large
  glowing magenta eye at center, dark purple armored carapace, short stubby fins, side view"*.
  Candidatos que pareceram bons: **[4], [7], [8], [14]** (pods com olho magenta nítido). Próximo:
  `select_object_frames` → `animate_object` → `install-anim drone-anim ... enemy-drone`. Silhueta
  alvo: PEQUENO/simples (≠ batedor).
- **batedor** (scout) — gerar novo. Silhueta alvo: **DARDO magro e afilado, pontudo para a frente**.
  Prompt sugerido: *"sleek thin biomechanical alien interceptor dart, very pointed streamlined nose,
  narrow body, glowing magenta eye, dark purple hull, small swept fins, side view"*. → `enemy-scout`/
  `scout-anim`/`scout-fly`.
- **canhoneira** (gunship) — gerar novo. Silhueta alvo: **PESADA, blocada, CANHÃO grande saliente**.
  Prompt: *"heavy bulky biomechanical alien gunship, thick armored blocky hull, one large prominent
  cannon barrel, glowing magenta eye, dark purple armor, side view"*. → `enemy-gunship`/`gunship-anim`/
  `gunship-fly`. ⚠️ é a ref de facção atual — se regerar, guardar a antiga antes.
- **torre de solo** — gerar novo. Silhueta alvo: **bateria/emplacamento FIXO, base larga + cano curto
  para cima**. Chave: conferir no `TerrainSystem`/`BootScene` (`turret`/`building`) qual usa; **re-medir
  a boca do cano** no PNG novo (o tiro/telégrafo nasce dela). Prompt: *"fixed alien ground defense
  turret battery, wide anchored base, short cannon pointing up, biomechanical, magenta glow, dark
  purple, side view"*.
- **chefão Torre** — gerar novo. **COLOSSAL/ameaçadora**, coerente com as torres de solo e a facção,
  canhão pesado. → chaves `boss`/`bossAnim`/`boss-fire`. **Recalibrar `src/entities/Boss.ts`**:
  `BASE_Y`, `STATION_X`, `MUZZLE_X/Y`, hitbox (`body.setSize`) — MEDIR no PNG novo (usar
  `find-pad.mjs`), não chutar. Prompt: *"colossal menacing alien colony defense tower, heavy cannon,
  biomechanical, magenta glow, dark purple armor, imposing, side view"*.

## 🔧 Chefão — código (Tasks 6–7, sem arte)

- **Task 6 — salva de mísseis NÃO teleguiada:** o código completo está no plano (Task 6, Step 2:
  `launchMissiles`). Padrão FIXO em leque largo e lento (`MISSILE_COUNT=4`, `MISSILE_SPEED=70`,
  ângulos fixos 140–220°), textura `missile`, marcado `data('missile')` para o rastro. Agendar
  intercalado com o leque, com telégrafo. Investigar se `TerrainSystem.tickMissileTrails` alcança as
  balas do boss (senão, emitir o rastro à parte).
- **Task 7 — telégrafo + fúria:** aviso (pisca/brilho nos tubos) ~0.5–0.7s antes da salva; marco
  visual na virada de fúria (<50% vida): a torre esquenta/racha/muda de tint + shake, uma vez.

## ⚠️ Constraints (não esquecer)

- Facção coesa: casco roxo-escuro + **olho magenta brilhante** em TODOS.
- Comportamento/balanceamento dos inimigos **inalterados** — só arte; hitbox preservada via `scale`.
- Mísseis do chefão **NÃO teleguiados**.
- Guarda de textura (`textures.exists`) em toda arte nova; placeholder procedural é o fallback.
- Commits com autoria **só do Henrique** (sem Co-Authored-By).
- Verificação por sonda/screenshot + `npm run typecheck`/`build`.

## Saldo PixelLab

**~690 gerações** (2026-07-23; eram 838 e a caça à silhueta consumiu ~150). Objeto novo ~20–40 ger;
animação v3 ~1–2 ger. Conta: user `f7282f36-b779-4f64-832a-4693ca4cc628` (a mesma do MCP e do
`.env.pixellab`).

## Sondas desta leva (todas verdes em 2026-07-23)

- `scripts/probe-roster-f1.mjs` — os 4 inimigos parados na mesma tela. É a única forma de julgar
  "dá para distinguir num relance", e ela imprime as hitboxes para provar que não mudaram
  (drone 16×14, batedor 14×12, canhoneira 27×14 — idênticas às de antes da fatia).
- `scripts/probe-chefao-misseis.mjs` — prova que a salva NÃO é teleguiada comparando os ângulos
  com a nave em dois lugares opostos, e fotografa o telégrafo.
- `scripts/probe-torre-solo.mjs` — torre atirando de perto: espelhamento e boca do cano.
- `scripts/probe-chefao-arte.mjs` — o chefão PARADO, que é quando se julga arte. Falha se ele
  transbordar a tela ou invadir o HUD (hoje: 148×143, caixa x 229..377, y 57..199).
