# Design — Passe visual da Fase 1 ("A Decolagem"), leva 2: INIMIGOS + CHEFÃO

**Data:** 2026-07-22
**Fatia:** 1 de 9 (Fase 1) do passe visual da campanha — **leva 2: os INIMIGOS e o CHEFÃO**.
**Arquivos-alvo:** `src/scenes/BootScene.ts` (carga de arte), `src/systems/EnemySystem.ts` (defs
dos inimigos), `src/systems/TerrainSystem.ts` (torre de solo), `src/entities/Boss.ts` (a Torre).

---

## Contexto e objetivo

A leva 1 fechou o CENÁRIO da Fase 1. Esta leva trata dos INIMIGOS e do CHEFÃO. Dois problemas
que o Henrique marcou jogando:

1. **Inimigos parecidos demais.** Apesar de cada um já ter sprite próprio, na prática o **drone** e
   o **batedor** são quase idênticos (a mesma nave-inseto roxa, olho magenta, asas em flecha) — e
   eles pedem reações OPOSTAS (o drone atravessa reto, o batedor vem rápido em senóide). Silhueta
   que não telegrafa comportamento é leitura roubada.
2. **O chefão (Torre) é plano.** Entra, flutua, dispara um LEQUE fixo de bolas de fogo (5 → 7 no
   enfurecido) + um tiro mirado só no fim. Falta presença e uma segunda ameaça.

### Decisões aprovadas

- **Inimigos: diferenciar por FUNÇÃO, mantendo a FACÇÃO.** Continuam as defesas biomec da colônia
  (roxo/magenta, olho magenta brilhante — unidade visual), mas cada um ganha uma **silhueta
  distinta que telegrafa o papel**. Redesenhar os QUATRO: drone, batedor, canhoneira e a torre de
  solo. **Comportamento e balanceamento INALTERADOS** — é troca de arte; a hitbox/escala em jogo é
  preservada (ajusta-se a escala se a arte nova mudar de tamanho).
- **Chefão: presença + mísseis.** Arte NOVA (maior/mais ameaçadora, ainda a torre de defesa da
  colônia). O **leque de fogo continua**. Adiciona-se uma **salva de MÍSSEIS** — a única mudança de
  JOGO no chefão. Telégrafos reforçados + transição de fúria mais visível.
  - ⚠️ **Os mísseis NÃO são teleguiados.** Com o sistema de FLAP da Fase 1 (controle limitado),
    míssil que persegue seria punitivo demais. É uma salva TELEGRAFADA num padrão FIXO/espalhado,
    só para ESQUIVAR por posicionamento — leitura diferente do leque (rápido e em arco).

---

## Os inimigos (4 silhuetas)

Todos na facção: casco biomec roxo-escuro, **olho/cabine magenta brilhante** (o traço que unifica),
aresta clara de um lado (o truque de volume do resto do jogo). A DIFERENÇA é a forma:

| Inimigo | Comportamento (fixo) | Silhueta que o telegrafa |
|---|---|---|
| **drone** | atravessa reto; descartável | PEQUENO e SIMPLES — pod/orbe de enxame, sem asas dramáticas. "Não vale a bala." |
| **batedor** | rápido, em senóide | DARDO magro e pontudo, muito afilado para a frente. "Vem rápido." |
| **canhoneira** | para e mira | PESADA e blocada, com um CANHÃO óbvio saliente. "Saia da linha." |
| **torre de solo** | fixa, telegrafa e atira míssil | BATERIA encravada no chão — base larga + cano curto para cima. Distinta das voadoras. |

Regras de arte (pipeline de sempre):
- Vista LATERAL, apontando para a ESQUERDA em jogo (voam contra o jogador que vai para a direita);
  o PixelLab gera apontando para a direita → o EnemySystem já espelha/gira conforme a arte atual.
- Tamanho em jogo PRÓXIMO do atual (drone/batedor ~28×26, canhoneira ~45×26) para a hitbox e o
  balanceamento não mudarem; se a arte nova sair maior/menor, compensa-se pela `scale` da def.
- Animação de voo/idle por inimigo (propulsão/olho pulsando). A torre de solo ganha idle + o
  telégrafo (pisca) que já existe no código.
- Cada asset é gerado, **revisado e aprovado antes de entrar** (guarda `textures.exists`).

---

## O chefão (Torre)

### Arte
Repaginar a Torre no PixelLab: **maior e mais ameaçadora**, mas ainda legível como a grande torre
de defesa da colônia (coerente com as torres de solo e a facção). Mantém as animações de flutuar e
disparar (ou novas equivalentes). ⚠️ Se as dimensões mudarem, recalibrar `BASE_Y`, `STATION_X`,
`MUZZLE_X/Y` e a hitbox (o código já avisa: as bocas de cano são MEDIDAS no PNG, não chutadas).

### Ataques
- **Leque de fogo** — mantido como está (5 normal / 7 enfurecido, arco 150–210°, bolas-cometa).
- **Salva de MÍSSEIS (novo)** — um ataque TELEGRAFADO, periódico, distinto do leque:
  - **NÃO teleguiado**: os mísseis saem num padrão FIXO/espalhado (ex.: 3–4 mísseis em leque largo
    e LENTO, ou uma cortina com brechas) que o jogador ESQUIVA por posicionamento.
  - **Telégrafo claro** antes da salva (a torre "carrega": pisca/brilha nos tubos + um aviso) —
    míssil sem aviso, mesmo não teleguiado, é injusto.
  - **Arte do míssil**: reusa a chave `missile` (a mesma das torres de solo) ou uma variante; o
    míssil é alongado, girado no vetor de voo, com fumaça de exaustão (receita já existente no
    `TerrainSystem.tickMissileTrails`).
  - **Cadência**: intercalado com o leque, com folga para o jogador respirar. Números exatos
    (quantos mísseis, velocidade, intervalo) são CALIBRAÇÃO — fechados por sonda + olho, sem tornar
    a luta injusta.

### Telégrafos e fúria
- Aviso visível antes da salva de mísseis (o beat que separa "difícil" de "sacanagem").
- A transição para a FÚRIA (<50% vida) ganha um marco visual (a torre esquenta/racha/muda de
  postura) — hoje ela só acelera silenciosamente.

---

## Fora de escopo

- Novos COMPORTAMENTOS dos inimigos (drone/batedor/canhoneira/torre) — só arte; a lógica de voo,
  senóide, mira e balanceamento fica intacta.
- Mísseis TELEGUIADOS no chefão (rejeitado por design — flap + homing = punitivo).
- Uma 3ª fase do chefão, deploy de drones ou feixe varrendo (não pedidos nesta leva).
- Os inimigos das outras fases (kamikaze, cargueiro, aranha, serpente, etc.) — outras fatias.

---

## Fallback e verificação

- **Guarda de textura**: toda arte nova passa por `textures.exists`; sem o PNG, cai no placeholder
  procedural atual (`makeEnemy`, `makeBoss`, `makeMissile`) — o jogo nunca quebra.
- **Balanceamento preservado**: hitboxes e números dos inimigos ficam; só a arte muda. No chefão,
  só a salva de mísseis é nova, e é calibrada para não desequilibrar (o resto da luta é o mesmo).
- **Sondas**: `probe-stage1` (fim a fim) e a sonda do chefão (bala real nas duas fases); a salva de
  mísseis ganha asserção (a torre dispara mísseis, eles têm hitbox, não perseguem). Revisão a olho
  de cada sprite e da luta. `npm run typecheck` + `npm run build` limpos.

---

## Critérios de sucesso

1. Drone, batedor e canhoneira são distinguíveis À DISTÂNCIA, cada silhueta dizendo o
   comportamento — o "parecidos" acaba.
2. A torre de solo tem cara própria de emplacamento fixo.
3. A Torre-chefão tem presença maior + a salva de mísseis (não teleguiada) como 2ª ameaça, com
   telégrafo justo; o leque e o balanceamento da luta seguem.
4. Facção visual coesa (roxo/magenta, olho brilhante) em todos.
5. Nada quebra sem os PNGs; comportamentos e balanceamento dos inimigos inalterados.
