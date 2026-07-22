# Fase 1 — Inimigos + Chefão (leva 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar aos 4 inimigos da Fase 1 (drone/batedor/canhoneira/torre de solo) silhuetas distintas por função (arte nova no PixelLab, mesma facção), e ao chefão Torre presença nova + uma salva de mísseis NÃO teleguiada — sem mexer no balanceamento.

**Architecture:** Troca de ARTE nos inimigos (BootScene carrega, EnemySystem/TerrainSystem só apontam para as chaves; comportamento intacto). No chefão, arte nova (recalibrar geometria medida no PNG) + um método de ataque novo (`launchMissiles`) reusando a arte/rastro de míssil que já existe. Verificação por sonda + revisão a olho; arte aprovada asset por asset.

**Tech Stack:** TypeScript + Phaser 3 + Vite. PixelLab (`animate_object`/`create_*`, `scripts/anim-sheet.mjs`, `scripts/install-sprite.mjs`). Sondas Playwright.

## Global Constraints

- **Facção coesa**: casco biomec roxo-escuro + olho/cabine MAGENTA brilhante em todos os inimigos.
- **Silhueta = função**: drone pequeno/simples · batedor dardo magro · canhoneira pesada/canhão · torre de solo bateria fixa.
- **Comportamento e balanceamento INALTERADOS** nos inimigos — só arte. Hitbox preservada (compensar via `scale` da def se a arte mudar de tamanho).
- **Chefão**: leques mantidos; a ÚNICA mudança de jogo é a salva de mísseis, e ela é **NÃO teleguiada** (padrão fixo/espalhado, telegrafada, só esquivar) — flap + homing = punitivo.
- **Guarda de textura** em toda arte nova (`textures.exists`); placeholder procedural é o fallback.
- **Arte aprovada asset por asset pelo Henrique antes de entrar no jogo.** Autoria dos commits: só Henrique.
- Verificação por sonda/screenshot + typecheck/build (não há testes unitários).

---

## Estrutura de arquivos

- **`src/scenes/BootScene.ts`** — registrar a arte nova (chaves de sprite/animação) com guarda; ajustar `FRAMES`/`ANIMS` se as contagens de quadro mudarem.
- **`src/systems/EnemySystem.ts`** — `DEFS` dos inimigos: só ajustar `scale`/`texture`/`anim` se preciso (comportamento intacto).
- **`src/systems/TerrainSystem.ts`** — a torre de solo (prop `turret`/`building`): só a arte.
- **`src/entities/Boss.ts`** — recalibrar geometria da Torre (arte nova) + `launchMissiles` (ataque novo) + telégrafo de mísseis + marco visual de fúria.
- **`scripts/`** — pipeline de arte existente; `_ref-*.png` para style refs (gitignorado).

---

### Task 0: Referência de facção + pipeline de quadros dos inimigos

**Files:** investigação apenas.

- [ ] **Step 1: Fixar a referência de facção**

Baixar o sprite atual `enemy-drone.png`/`enemy-gunship.png` como `style_images` de referência para o PixelLab, para a arte nova herdar a paleta (roxo/magenta, olho magenta). Anotar o `object_id`/estilo a reusar.

- [ ] **Step 2: Entender como os quadros de animação dos inimigos entram**

Ler `BootScene.ts` (`FRAMES`, `ANIMS`, `animFrames`) e confirmar: os inimigos usam QUADROS individuais (`drone-anim-0.png`...), não sheets. Decidir o pipeline para a arte nova: (a) exportar quadros individuais com o mesmo padrão de nome, ou (b) migrar o inimigo para SHEET (como o Leviatã do menu) ajustando `BootScene`+registro. Anotar a decisão — as Tasks 1–4 seguem ela.

- [ ] **Step 3: Confirmar o saldo PixelLab** (`get_balance`) e orçar os ~5 assets.

Sem geração nesta task.

---

### Task 1: Drone (pod de enxame)

**Files:** Create `public/sprites/enemy-drone*.png` (+ quadros/sheet); Modify `BootScene.ts`, talvez `EnemySystem.ts` (`DEFS.drone.scale`).

**Interfaces:** Produces a arte/anim do drone sob a MESMA chave (`enemyDrone`/`droneAnim` ou nova), carregada com guarda.

- [ ] **Step 1: Gerar no PixelLab** — objeto "pequeno pod/orbe de enxame biomec, olho magenta, casco roxo-escuro, vista lateral apontando à direita", com a ref de facção da Task 0. Animação de idle/propulsão (olho pulsando).
- [ ] **Step 2: Revisar a arte** e mostrar ao Henrique. Só segue com aprovação.
- [ ] **Step 3: Instalar** pelo pipeline (quadros ou sheet, conforme Task 0) em `public/sprites/`.
- [ ] **Step 4: Registrar** em `BootScene` com guarda; se a arte mudou de tamanho, ajustar `DEFS.drone.scale` para manter a hitbox atual (~28×26 em jogo).
- [ ] **Step 5: Verificar** — `npm run build` PASS; subir F1 e screenshot: o drone lê como PEQUENO/descartável, distinto do batedor, com o olho magenta.
- [ ] **Step 6: Commit** — `feat(fase1): arte nova do drone (pod de enxame)`.

---

### Task 2: Batedor (dardo veloz)

**Files:** Create `public/sprites/enemy-scout*.png` (+ quadros/sheet); Modify `BootScene.ts`, talvez `EnemySystem.ts`.

- [ ] **Step 1: Gerar** — "dardo/interceptor MAGRO e afilado, muito pontudo para a frente, biomec roxo, olho magenta, vista lateral". Animação de voo.
- [ ] **Step 2: Revisar + aprovação do Henrique.**
- [ ] **Step 3: Instalar** (mesmo pipeline).
- [ ] **Step 4: Registrar** + ajustar `DEFS.batedor.scale` para a hitbox atual.
- [ ] **Step 5: Verificar** — build PASS; screenshot: o batedor lê como DARDO veloz, claramente ≠ drone.
- [ ] **Step 6: Commit** — `feat(fase1): arte nova do batedor (dardo veloz)`.

---

### Task 3: Canhoneira (pesada, canhão óbvio)

**Files:** Create `public/sprites/enemy-gunship*.png`; Modify `BootScene.ts`, talvez `EnemySystem.ts`.

- [ ] **Step 1: Gerar** — "nave-canhoneira PESADA e blocada, casco grosso, um CANHÃO grande saliente, biomec roxo, olho magenta, vista lateral". Animação.
- [ ] **Step 2: Revisar + aprovação.**
- [ ] **Step 3: Instalar.**
- [ ] **Step 4: Registrar** + ajustar `DEFS.canhoneira.scale` (~45×26).
- [ ] **Step 5: Verificar** — build PASS; screenshot: lê PESADA com canhão, ≠ das voadoras leves.
- [ ] **Step 6: Commit** — `feat(fase1): arte nova da canhoneira (peso + canhão)`.

---

### Task 4: Torre de solo (bateria fixa)

**Files:** Create `public/sprites/turret*.png` (ou a chave que o TerrainSystem usa); Modify `BootScene.ts`, `TerrainSystem.ts` se a chave/dimensão mudar.

- [ ] **Step 1: Identificar a chave** que a torre de solo usa hoje (`turret`/`building`) no `TerrainSystem`/`BootScene` e a boca do cano medida.
- [ ] **Step 2: Gerar** — "bateria/torre de defesa de solo encravada, base larga, cano curto apontando para cima, biomec roxo, luz magenta, vista lateral". (Estático + idle se fizer sentido.)
- [ ] **Step 3: Revisar + aprovação.**
- [ ] **Step 4: Instalar + registrar**; RE-MEDIR a boca do cano no PNG novo (o telégrafo/tiro nasce dela) e ajustar no `TerrainSystem`.
- [ ] **Step 5: Verificar** — build PASS; screenshot com a torre atirando: cara de emplacamento fixo, tiro sai da boca certa.
- [ ] **Step 6: Commit** — `feat(fase1): arte nova da torre de solo (bateria fixa)`.

---

### Task 5: Chefão — arte nova (presença)

**Files:** Create `public/sprites/boss*.png` (+ anims hover/fire); Modify `BootScene.ts`, `Boss.ts` (geometria).

- [ ] **Step 1: Gerar** — "torre de defesa da colônia COLOSSAL e ameaçadora, coerente com as torres de solo e a facção biomec roxa/magenta, canhão pesado, vista lateral". Animações de flutuar e disparar.
- [ ] **Step 2: Revisar + aprovação do Henrique.**
- [ ] **Step 3: Instalar + registrar** (com guarda; o placeholder `makeBoss` continua o fallback).
- [ ] **Step 4: RECALIBRAR geometria** em `Boss.ts` medindo no PNG novo (find-pad/olho): `BASE_Y`, `STATION_X`, `MUZZLE_X/Y`, e a hitbox (`body.setSize`). O código já avisa que a boca é MEDIDA, não chutada.
- [ ] **Step 5: Verificar** — build PASS; sonda/screenshot do chefão: entra, flutua, dispara o leque da boca certa, hitbox coerente.
- [ ] **Step 6: Commit** — `feat(fase1): arte nova do chefao Torre (presenca)`.

---

### Task 6: Chefão — salva de MÍSSEIS (não teleguiada)

**Files:** Modify `src/entities/Boss.ts` (novo método `launchMissiles` + agendamento); talvez `GameScene`/`TerrainSystem` para o rastro do míssil.

**Interfaces:**
- Consumes: `this.bullets` (grupo de balas do inimigo), a textura `missile`, e o rastro (`tickMissileTrails` do TerrainSystem, que segue balas com `data('missile')`).
- Produces: `launchMissiles()` — dispara N mísseis num padrão FIXO, não teleguiado.

- [ ] **Step 1: Investigar** de qual grupo o `this.bullets` do boss vem (GameScene) e se o rastro de míssil (`TerrainSystem.tickMissileTrails`, que itera `enemyBullets` procurando `data('missile')`) alcança as balas do boss. Anotar o caminho para os mísseis ganharem rastro.

- [ ] **Step 2: Escrever `launchMissiles`** em `Boss.ts` — mísseis em padrão FIXO, alongados, girados no vetor de voo, marcados `missile` (para o rastro), SEM perseguir:

```ts
  private static readonly MISSILE_COUNT = 4;
  private static readonly MISSILE_SPEED = 70; // lento — dá para ler e esquivar

  /** Salva de MÍSSEIS: leque LARGO e LENTO em ângulos FIXOS (não mira o jogador). O jogador
   *  esquiva por posicionamento — leitura oposta ao leque rápido de fogo. */
  private launchMissiles(): void {
    const m = this.muzzle;
    const n = Boss.MISSILE_COUNT;
    // Arco amplo para a ESQUERDA, com brechas onde caber a nave — ângulos fixos, não mirados.
    for (let i = 0; i < n; i++) {
      const angle = Phaser.Math.DegToRad(140 + (i / (n - 1)) * 80);
      const b = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
      if (!b) continue;
      b.setActive(true).setVisible(true);
      b.body!.enable = true;
      b.setTexture('missile').setScale(0.9).clearTint();
      b.setData('missile', true); // rastro de exaustão (TerrainSystem.tickMissileTrails)
      b.setRotation(angle);
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.setSize(b.width * 0.6, b.height * 0.6);
      b.setVelocity(Math.cos(angle) * Boss.MISSILE_SPEED, Math.sin(angle) * Boss.MISSILE_SPEED);
    }
  }
```

- [ ] **Step 3: Agendar a salva** no `update` do boss — periódica, intercalada com o leque, COM TELÉGRAFO (ver Task 7). Ex.: um contador `missileCooldown` separado; quando zera, dispara o telégrafo e, ao fim dele, `launchMissiles()`. Números (intervalo, count, speed) = CALIBRAÇÃO por sonda + olho.

- [ ] **Step 4: Verificar** — build PASS; sonda do chefão: a salva SAI, os mísseis têm hitbox, viajam em linha reta (NÃO perseguem — medir que o ângulo não muda com a posição do jogador). Screenshot da salva.

- [ ] **Step 5: Commit** — `feat(fase1): chefao dispara salva de misseis (nao teleguiada)`.

---

### Task 7: Telégrafo dos mísseis + marco de fúria

**Files:** Modify `src/entities/Boss.ts`.

- [ ] **Step 1: Telégrafo da salva** — antes de `launchMissiles`, a torre "carrega": pisca/brilha nos tubos + um aviso curto (ex.: `setTint` pulsante + partículas de carga na boca), ~0.5–0.7s. Míssil sem aviso é injusto (mesmo não teleguiado).

- [ ] **Step 2: Marco visual de fúria** — na transição para `enraged` (<50% vida), um beat visível UMA vez (a torre esquenta/racha/muda de tint base + shake) em vez de só acelerar em silêncio.

- [ ] **Step 3: Verificar** — build PASS; screenshot: o telégrafo aparece antes dos mísseis; a fúria tem um marco.

- [ ] **Step 4: Commit** — `feat(fase1): telegrafo dos misseis + marco de furia do chefao`.

---

### Task 8: Regressão + revisão final

- [ ] **Step 1: Rodar as sondas de F1** (`probe-stage1` e a do chefão, se houver) — verdes; sem erro de página.
- [ ] **Step 2: Revisão a olho** — os 4 inimigos distinguíveis à distância (screenshot com vários na tela); a luta do chefão com leque + mísseis legível e justa; facção coesa.
- [ ] **Step 3: typecheck/build limpos**; commit de ajustes finos se houver.

---

## Self-review (cobertura do spec)

- Silhuetas distintas por função (drone/batedor/canhoneira/torre) → Tasks 1–4. ✔
- Facção coesa (roxo/magenta, olho) → Constraints + refs Task 0. ✔
- Hitbox/balanceamento preservados → Constraints + Steps de `scale`. ✔
- Chefão arte nova (presença) + recalibragem → Task 5. ✔
- Salva de mísseis NÃO teleguiada + telégrafo → Tasks 6, 7. ✔
- Leques mantidos → Task 6 não toca `fan`. ✔
- Marco de fúria → Task 7. ✔
- Guarda de textura / fallback → Constraints (todas as tasks). ✔

Sem placeholders de código onde há código (Task 6 traz o método completo). As Tasks 1–5 são interativas por natureza (arte aprovada asset por asset) — os "steps" de geração/aprovação são a ordem correta, não placeholders. Tasks 0/6 têm passos de INVESTIGAÇÃO explícitos (pipeline de quadros; origem do grupo de balas) porque o código se ancora neles.
