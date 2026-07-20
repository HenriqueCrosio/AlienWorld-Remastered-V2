# MAPA TÉCNICO — AlienWorld Remastered V2 (foco: balanceamento)

Gerado por leitura integral de `src/` (~9.900 linhas, 30 arquivos). Referência de resolução: `GAME_WIDTH=384`, `GAME_HEIGHT=216`, `SCROLL_SPEED=84` px/s (`src/config.ts:2-3,36`). Paleta em `config.ts:6-30`.

---

## 1. NAVES / ARMAS

Róster em `src/ships.ts:29-135`; defs de armas em `src/systems/WeaponSystem.ts:142-270` (constante `WEAPONS`).

### 1.1 Róster v2 (as 8 naves da campanha)

| Nave (id) | Nome | Arma base | Disponível em |
|---|---|---|---|
| `jato` | JATO DE ATAQUE | `tracer` | Todos (DEFAULT_SHIP, Fase 1 forçada — ships.ts:138) |
| `verde` | BOMBARDEIRA | `obus` | Aurora, Doca, Final |
| `creme` | CORSÁRIA | `agulha` | Aurora, Doca, Final |
| `cinza` | FANTASMA | `salva` | Aurora, Doca, Final |
| `branca` | PERFURADORA | `perfurante` | Doca, Final |
| `alien2` | ESPECTRO | `lamina` | Doca, Final |
| `alien` | ARAUTO | `enxame` | Doca, Final |
| `canhoes` | BATERIA | `bateria` | Só Final (ROSTER_FINAL — ships.ts:159) |

Rósters: `ROSTER_AURORA` (4 naves, ships.ts:152), `ROSTER_DOCA` (7, ships.ts:153), `ROSTER_FINAL` (8, ships.ts:159). Legado fora de cena: `interceptor`→pulse, `lanca`→lance, `dispersor`→spread (ships.ts:92-113).

**Regra arquitetural:** a nave não tem atributo de casco/velocidade/vida — a escolha só muda a arma base (`setBase`, WeaponSystem.ts:397-401; chamada em GameScene.ts:196). Ao morrer ou esgotar munição, volta à arma DA NAVE (`equipBase`, WeaponSystem.ts:404-406).

### 1.2 Armas base (todas com `ammo: null` = infinita, `range: null` salvo indicado)

| Arma | dano | cadência (tiros/s) | projéteis/disparo | vel. projétil | **DPS efetivo** | Mecânica |
|---|---|---|---|---|---|---|
| `pulse` (legado) | 1 | 7 | 1 | 300 | **7** | — |
| `tracer` | 1 | 3.5 | 2 (muzzles paralelos dy ±2, ângulo 0) | 420 | **7** alvo grande / **3.5** alvo pequeno | muzzles paralelos — WeaponSystem.ts:231-235. ⚠️ comentário :219 diz "8/4 dps" — DESATUALIZADO (era rate 4) |
| `obus` | 5 | 1 | 1 | 150 (mais lento) | **5** | glow aditivo + pulso de alpha; muzzleFlash 4 — :236-242 |
| `agulha` | 1 | 6 | 1 | 500 (mais rápido) | **6** | bulletScale 0.7 — :243-246 |
| `salva` | 2 | 1.25 (pausa 0.8s) | burst 3 × interval 0.08s | 340 | **~6.25** médio (6 de dano em 0.16s, janela adiantada) | burst — :249-253, máquina de burst em :451-461 |
| `perfurante` | 2 | 2.5 | 1 | 300 | **5 por alvo** (× n alvos em linha) | `pierce: true` — atravessa inimigos (1× cada, Set `hits`), morre em rocha/destroço — :254-258, colisão em GameScene.ts:840-846 |
| `bateria` | 1 | 2 | 4 muzzles (dy −5/−2/+2/+5, ângulos −2/−0.7/+0.7/+2°) | 320 | **8** de perto; diverge com a distância | muzzles divergentes — :259-263 |
| `lamina` | 2 | 2 | 1 | 260 | **4** | bulletScaleY 3.2 (faixa ALTA, hitbox acompanha), tint teal 0x5ef2d8 — :266-269 |
| `lance` (legado) | 3 | 3 | 1 | 430 | **9** single-target | stretchX 1.8 (só visual; hitbox compensada :645) — :161 |
| `spread` (legado) | 1 | 3 | 3 (leque 22°) | 250 | **9** se os 3 conectam | range 110 px (~0.44s de voo) — :162 |
| `enxame` | 1 | 4 | 1 | 170 (o mais lento do jogo) | **4** | homing: turn 150°/s, range 150 px — :179-182 |

### 1.3 Armas especiais (drops; munição finita; perde ao morrer — GameScene.ts:883)

| Arma | dano | cadência | projéteis | vel. | munição | alcance | **DPS pico** |
|---|---|---|---|---|---|---|---|
| `hmg` | 1 | 18 | 1 (jitter ±~0.3° de spread 5) | 340 | 200 | ∞ | **18** |
| `shotgun` | 1 | 2.2 | 5 (leque 32°) | 210 | 40 | 96 px (~0.46s) | **11** se os 5 conectam |

### 1.4 HMG — giro e calor, números exatos (`spin`, WeaponSystem.ts:208)

- `up: 0.55` s de gatilho até cadência cheia (interpola linear de `rate × idleRate` até `rate` — :444-446)
- `idleRate: 0.22` (cano parado = 3.96 tiros/s ≈ 22%)
- `down: 0.9` s para o cano parar ao soltar
- `heatPerShot: 0.024` → a 18 t/s = +0.432 calor/s → superaquece em **~2.3s de fogo cheio** (comentário diz "~3s" incluindo spool-up)
- `cool: 0.15`/s **só fora do gatilho** → calor cheio leva **~6.7s** para dissipar (propositalmente mais lento que sobe — anti-tamborilar)
- `lock: 1.6` s travada ao superaquecer; durante a trava o calor drena até zerar (:497)
- Travamento dispara FX: 14 partículas + shake(120, 0.004) — :587-588
- Trocar de arma zera spool/calor/lock/burst (`equip` :382-394)
- Exposto ao HUD: `hasSpin`, `spoolPct`, `heatPct`, `overheated` (:363-380)

### 1.5 Mecânicas globais de tiro do jogador

- Pool de projéteis: `maxSize: 128` (:317). Pool cheio = tiro descartado silenciosamente (log só em DEV, :603)
- Hitbox do projétil: `max(largura×0.9, 3px) / stretchX` × `max(altura×0.9, 3px)` (:645) — piso de 3px existe pelo traçante (arte 8×1)
- Homing: alvos = inimigos vivos + chefão (targets multi-parte se houver); NUNCA rocha (GameScene.ts:382-396). Correção por frame limitada a `turn`°/s (:520-552), alvo = mais próximo dentro de `range`
- Cull: sai da tela (>384+8 / <−8 / <−8 / >224) ou range esgotado (:732-749)
- Cenário é cobertura para os DOIS lados: tiro inimigo morre em prop/hazard após carência de 16px (GameScene.ts:813-830)

---

## 2. INIMIGOS (`src/systems/EnemySystem.ts`, DEFS em :54-85)

| Kind | HP | Veloc. | Padrão | Tiro | Score | Comportamento |
|---|---|---|---|---|---|---|
| `drone` | 2 | 70 | reto | não atira | 25 | atravessa a tela; morre em x<−24 |
| `batedor` | 2 | 95 | senóide amplitude 28px, fase ~3 rad/s | não atira | 40 | scale 0.85, tint rosa 0xffc8dc |
| `canhoneira` | 6 | 40 | reto | 1 tiro MIRADO a cada 1.6s, vel. **110** px/s | 100 | telégrafo piscante **0.45s** antes de cada tiro (:286); primeiro tiro após 1.2–2.0s de entrada (:168) |
| `kamikaze` | 2 | 45 inicial | aceleração 150 px/s² NA DIREÇÃO do jogador | não atira (contato) | 60 | max velocity 190×190 (:153); passa reto e volta (só morre em x<−120); nariz aponta para o vetor de voo |
| `cargueiro` | 24 | 20 | reto | não atira — **cospe 1 drone a cada 1.5s** | 300 | scale 1.1; primeiro drone após 1.5s; drones nascem na barriga (y+4..14, x−6); só cospe quando x<384 |
| `aranha` (miniboss) | 50 | 30 | anda no casco (y cravado em 170) | leque de 3 mirado (±13°) a cada 2.6s, vel. 110 | 500 | ver detalhe abaixo |

- Hitbox inimigos: `width×0.6, height×0.55` (:158). Tiros inimigos comuns: pool `maxSize: 64` (:103), textura bolt2 scale 0.8 tint magenta 0xff3a78, blend ADD.
- **Aranha — máquina de estados** (:298-364): anda até x≤306 → estaciona → a cada **6–8s** (puloCd inicial 6, depois FloatBetween(6,8)): telégrafo piscante **0.5s** → salto mira `clamp(target.x+40, 150, 300)`, vy=−190, gravidade 360, ~1.1s de voo → aterrissagem em y=170 com **anel radial de 6 tiros a 105 px/s** + shake(110, 0.005).
- Spawn padrão: x = 384+16 (cargueiro cospe com x próprio).

### 2.1 Hazards — cinturão (`src/systems/DebrisSystem.ts`, HAZARDS :72-101)

| Kind | HP | Score | Notas |
|---|---|---|---|
| `asteroid` | 3 | 15 | destrutível; scale 0.7–1.9, giro ±40°/s, deriva ±10 px/s |
| `destroco` | ∞ | 0 | indestrutível; COBERTURA (absorve tiro inimigo) |
| `mina` | 1 | 30 | **explode ao morrer: raio 30px fere o jogador** (`MINE_BLAST_RADIUS`, :104; aplicado em GameScene.ts:791-807) |
| `sensor` (mina sensora) | 3 | 75 | raio de despertar **46px** → pavio **0.7s** piscando → **anel de 8 estilhaços a 105 px/s** (ângulo inicial sorteado). ⚠️ **abatida, NÃO estilhaça** (só no pavio) — :217-226. Estilhaços usam o pool de tiros inimigos |

- Spawn: x=384+40, y∈[30, 192]; hitbox 0.7×0.7; velocidade −84 (SCROLL_SPEED) + deriva.

### 2.2 Props de terreno (`src/systems/TerrainSystem.ts`, PROPS :36-44)

| Kind | HP | Score | Atira? |
|---|---|---|---|
| `spire` (rocha) | ∞ | 0 | não — corredor do flap; altura sorteada 0.55–1.25× |
| `building` | 8 | 60 | não |
| `turret` | 5 | 150 | **SIM**: míssil mirado vel. **100** px/s, cadência **2.4s**, telégrafo **0.4s**, primeiro tiro 1.6–2.8s; só atira se na tela e à frente do jogador (:230) |
| `base` | 16 | 250 | não |
| `silo` | 6 | 90 | não |
| `radar` | 4 | 120 | não |
| `wreck` | ∞ | 0 | não |

- Props de teto (F4) NUNCA atiram (guarda `!p.flipY`, :173

---

## 3. BOSSES

Contrato comum: `StageBoss` (src/entities/Boss.ts:11-26). Todos invulneráveis enquanto entram na tela. Barra de vida: 160×4px no topo (y=16). Flash de dano via setTint (~50-60ms). **+2000 de score por boss** (GameScene.ts:615). A GameScene instancia com HP explícito: Torre 150, Capitânia 150 (GameScene.ts:538-539); Serpente e Núcleo usam HP interno.

### 3.1 Fase 1 — TORRE DE DEFESA (`src/entities/Boss.ts`, 150 HP)

- Entrada: vel. −45 até x=328 (STATION_X, :55). Base Y=142, bobeira senoidal ±26px (t×0.8)
- **Fase normal (>50%, >75 HP):** a cada **1.9s**: leque de **5 cometas** cobrindo 150°–210°, vel. **80** px/s
- **Fúria (≤50%):** cadência **1.1s**; leque de **7** + **1 tiro mirado a 130 px/s** (:171, 187-191)
- Projétil: cometa animado, hitbox = círculo r=4.5 só na bola (cauda não fere, :242-247)
- Sem adds, sem telégrafo além do recuo da animação de tiro

### 3.2 Fase 2 — CANHONEIRA-CAPITÂNIA (`src/entities/BossCapitania.ts`, 150 HP)

Compasso cíclico (não cooldown simples). **Ciclo normal: 4.2s** | **Fúria (<50% = <75): 3.4s** — virar a fúria reinicia o compasso + flash (:254-259).

- **3 baterias** (offsets do centro 112×64): proa (−46,−2, 180°), ventral (−22,+14, 200°), ponte (+2,−24, 160°)
- **Partitura normal** (:209-218): t=0.0 larga **2 kamikazes** (stagger 180ms; **teto de 5 vivos** `MAX_KAMIKAZES` :92) → t=0.8/1.1/1.4 rajada de **3 traçantes** por bateria (90ms entre tiros, leque 26°, vel. **145**) → ~2.8s de silêncio
- **Partitura fúria** (:220-228): t=0.0 larga **3** kamikazes → t=0.5/0.7/0.9 rajada de **4** traçantes (leque 34°) → t=1.5 **flak** → t=2.1 **rajada mirada** (3 traçantes ±7°) → 1.3s silêncio
- **FLAK** (:393-405): 3 cápsulas em 2 tempos (2 agora + 1 após **3s**). Cada cápsula é projetada num PONTO sorteado (viés 0.35–0.7 para a altura do jogador; x∈[40, min(314, boss.x−40)]), tempo de voo **1.1–1.35s** (o telégrafo), pisca nos últimos **0.35s**, estoura em **anel de 8 estilhaços a 96 px/s** (offset angular sorteado). A cápsula NÃO fere — só o anel
- Kamikazes lançados = o mesmo inimigo da fase (HP 2, homing 150)

### 3.3 Fase 3 — SERPENTE DO CASCO (`src/entities/BossSerpente.ts`)

**4 formas, HP por cabeça: 50 + 50 + 50 + 60 = 210 total.** Só a cabeça da fase é vulnerável (hitbox circular r=15 com glow pulsante); o corpo ABSORVE tiro (GameScene.ts:557-559, 582-599 — com zona de tolerância 22px em volta do alvo). Perfurante morre no corpo também.

| Fase | Arte/escala | Cabeça | Padrões (relógios exatos) |
|---|---|---|---|
| A — ciano | serpente, 0.55 | offset (−63.1,−43.3) | **investida a cada 3.5s**; tiro secundário mirado ±0.35 rad a cada 2.0s, vel. **140** |
| B — verde | serpente2c, 0.55 | (−10.1,−55.4) | **leque de 5, 48°, vel. 155**, cadência **1.8→1.25s** (acelera com a vida da cabeça); investida a cada 5s |
| C — laranja | serpente1c, 0.55 | (46.4,−62.0) | **rajada de 3 mirados re-mirados** (120ms entre tiros), vel. **175**, a cada 2.1s; leque de 4, 40°, 150 a cada 3.4s |
| F — fusão | serpenteFusao, 0.63 (+15%) | (−30.8,−68.0) | **ciclo de 4 passos**: leque 7/64°/170 (0.9s) → rajada 4/190 (1.0s) → investida (1.5s) → **silêncio 0.8s** |

- **Investida** (:262-296): telégrafo **0.6s** recuando (+34 px/s) e piscando → avanço a **−380 px/s** até x≤150 → retorno +180
- **Transições** (:514-559): morte de cabeça = 5 explosões em **550ms**; fusão = 10 explosões em **1500ms** (convulsão). **Imune durante transição + 0.2s**
- Ordem das cabeças é estrutural (esquerda→direita; o corpo absorve bala no caminho)
- Entrada: vel. −46 até x=252 (STATION_X :94); ondulação ±14px

### 3.4 Fase 4 — O NÚCLEO (`src/entities/BossNucleo.ts`)

**Duas formas: Guardião 90 HP + Coração 180 HP = 270 total** (:37-39). Barra única somando as duas.

**FORMA 1 — GUARDIÃO** (escala 0.7, estação x=298, y=104):
- Máquina: `flutua` → a cada **6s** (`INVESTIDA_CADA`) → `telegrafo` **0.55s** piscando + corpo fecha inteiro → `investe`: vel. **−300** + componente vertical `clamp((Δy)×1.2, −70, 70)` (mirada no passado) até x<70 → `volta` +150
- **Vulnerabilidade: só PARADO.** Em movimento o corpo inteiro absorve (`corpoInteiro`, :156-159). Alvo: massa vermelha (offset +27,+31 × escala; hitbox 56×44)
- Tiro: leque de 3 glóbulos (152°–208°), vel. **100**, a cada **1.8s** enquanto flutua
- Transição para Coração: 7 pulsos × 170ms + pausa 1300ms, **invulnerável durante** (`trocando`)

**FORMA 2 — CORAÇÃO** (escala 1.2, x=306, y=108). Sístole (fechado = INVULNERÁVEL, dano devolve retinir :432-436) / diástole (aberto = janela, ferida brilha, hitbox 40×30). Fases pela vida do coração (>66% → fase 1; >33% → 2; senão 3):

| Fase | Aberto (janela) | Fechado | Cadência de tiro (fechado) | Parede | Adds |
|---|---|---|---|---|---|
| 1 | **3.2s** | **4.4s** | 1.7s — leque 3 (152–208°, vel. 100) | — | 1 drone ao fechar |
| 2 | **2.6s** | **3.8s** | 1.4s — leque 3 + **1 mirado vel. 135** | a cada **6.5s**, vão **92px** | 1 drone |
| 3 | **2.2s** | **3.2s** | 1.1s — leque **5** + mirado | a cada **5s**, vão **84px** | **2 drones** |

- Paredes = spires chão+teto com vão garantido, margem 34px (:365-377) — dano de contato normal (1 vida)
- Fechado, o primeiro tiro sai 0.7s após o fechamento (:327)

---

## 4. JOGADOR

- **Vidas: 3** (GameScene.ts:99). Todo dano = 1 vida (tiro, contato com inimigo/prop/hazard/boss, chão, raio de mina, parede do Núcleo). **Não existe sistema de bombas, continues ou escudo** (confirmado por grep)
- **I-frames: 1400ms** após qualquer dano (`invulnerableUntil`, GameScene.ts:879); nave pisca a 60ms (:349)
- **Hitbox: 55% × 42% do sprite** (GameScene.ts:200) — sprite 16×12 placeholder → ~8.8×5px; arte 32×32 → ~17.6×13.4px
- Spawn: (70, 108). `setCollideWorldBounds(true)`
- **Chão machuca** (zona atmosfera): y>200 → quica −120 e toma dano (GameScene.ts:353-357)
- **Perde a especial ao tomar dano** (não só ao morrer) — volta à arma da nave (GameScene.ts:883)
- Dano ao jogador: explosão 1.4× + flash(90, 255,122,168) (GameScene.ts:885-886)

### Física de condução

| | FLAP (FlapController.ts) | LIVRE (FreeController.ts) |
|---|---|---|
| gravidade | **420** px/s² (body gravityY) | 0 |
| impulso | **−170** (na borda da tecla) | — |
| queda máx | **260** | — |
| horizontal | **55** px/s | **110** px/s |
| aceleração | — | **900** px/s², drag **1200** (parada seca), diagonal normalizada |
| autoFire | **SIM** | não (gatilho: Espaço/J/ponteiro) |
| multiplicador de score | **×1.25** | ×1.0 |
| label HUD | `FLAP (LEGACY)` | `LIVRE (NEW)` |

Modo `diegetico`: zona da fase decide (atmosfera→flap, vacuo→free). `resetBody` zera drag/gravidade/limites antes de cada setup (FlightController.ts:63-71). Romper a atmosfera preserva o momento (`keepVelocity`).

---

## 5. ROTEIROS DE FASE (`src/systems/StageDirector.ts`)

Mecânica: `waves` cospem inimigos com `spacing` fixo e jitter de y ±12 (GameScene.ts:441); `terrain`/`hazard`/`corredor` são taxas em segundos por spawn. **Pickups NÃO são roteirizados** — dropam 18% por abate, só HMG/Shotgun (PickupSystem.ts:6, GameScene.ts:863).

### STAGE_1 "A DECOLAGEM" (~68s até o boss; zone: atmosfera, flap)
- t=1: relevo contínuo (rate 2.0→1.5→1.3→1.1s). t=23: torres entram (~1 em cada 6 props). t=41: `base` (250 pts). t=47-58: PICO "FOGO CRUZADO"
- Inimigos roteirizados: **39 drones + 24 batedores + 2 canhoneiras = 65 em ~68s ≈ 57/min**
- t=63: silêncio (rate 0). t=68: BOSS (Torre)

### STAGE_2 "FROTA MORTA" (~75s; vacuo, livre)
- t=1: asteroides rate 1.4s. t=13: destroços. t=22-23: **sensor apresentado sozinho** (rate 2.0). t=30: sensor+mina+destroço cobrado. t=34-35: kamikaze apresentado sozinho. t=47: cargueiro. t=55-66: pico ENXAME (hazard rate 0.85)
- Roteirizados: 23 drones + 29 batedores + 19 kamikazes + 1 cargueiro + 2 canhoneiras = **74 em ~75s ≈ 59/min** (+ drones cuspidos pelo cargueiro: 1/1.5s)
- t=70: silêncio. t=75: BOSS (Capitânia)

### STAGE_3 "O CASCO" (~88s; vacuo + parallax nebulosa)
- Ato 1 (0–42s, dentro da nuvem, densidade 1): hazard rate 1.3→1.0, cachos de sensores t=14. t=29: cargueiro
- t=42: `nebula 0` (fade 6s — a virada de ato). Ato 2: torres/radares sobre o casco (rate 1.6→1.4)
- **t=53: MINIBOSS aranha** (único evento 'miniboss' da campanha). t=54-63: respiro 9s (rate 0). t=70-78: pico
- Roteirizados: 31 drones + 20 batedores + 16 kamikazes + 1 cargueiro + 1 canhoneira + 1 aranha = **70 em ~88s ≈ 48/min**
- t=82: silêncio. t=88: BOSS (Serpente)

### STAGE_4 "O INTERIOR" (~86s; vacuo + parallax interior)
- Corredores chão+teto com vão garantido (margem 24px, mín. 14px por coluna): **gap 110 → 96 → 104 (respiro) → 76 (O APERTO, t=43) → 84**; rates 2.2→2.4→2.6→1.9→1.7s. Nave ~22px de hitbox no vão de 76
- t=15.5: sensores nos vãos. t=27-33: kamikazes no duto. t=51: cargueiro no corredor. t=63-75: pico REJEIÇÃO TOTAL
- Roteirizados: 29 drones + 18 batedores + 14 kamikazes + 1 cargueiro + 1 canhoneira = **63 em ~86s ≈ 44/min**
- t=79: silêncio total (corredor + hazard rate 0). t=86: BOSS (Núcleo)

### Meta (STAGES, :348-401)
| Fase | zone | parallax | interlude seguinte | next |
|---|---|---|---|---|
| 1 | atmosfera | superficie | `Interlude` | 2 |
| 2 | vacuo | espaco | `Interlude2` | 3 |
| 3 | vacuo | nebulosa | `Interlude3` | 4 |
| 4 | vacuo | interior | **null** | **null** |

`StageDirector.bossTime` / `skipTo(t)` (:419-430) — base do modo treino.

---

## 6. ECONOMIA DE SCORE

- **Fórmula** (`totalScore`, GameScene.ts:911-914): `floor((pontos + segundos×10) × multiplicadorDaCondução)` — bônus de tempo **10 pts/s** o tempo inteiro; multiplicador: flap ×1.25, livre ×1.0
- **Por abate:** drone 25 · batedor 40 · kamikaze 60 · canhoneira 100 · cargueiro 300 · aranha 500 · asteroid 15 · mina 30 · sensor 75 · building 60 · turret 150 · base 250 · silo 90 · radar 120
- **Boss: +2000** (killBoss, GameScene.ts:615)
- **NÃO existe bônus de no-hit** — nenhum código de bônus por fase sem dano (confirmado por grep; lacuna de design se desejado)
- **NÃO há acúmulo entre fases**: `GameScene.create` zera `score=0` (:137) e ignora `data.score`; comentário em :684-686 marca a lacuna ("quando a campanha tiver as 4, isto vira um total corrido"). Interlude1 nem repassa score (InterludeScene.ts:417); Interlude2/3 repassam (`score: this.score`) mas a GameScene ignora
- **Persistência:** `localStorage["alienworld:record:" + handling]` — um recorde POR modificador de condução (diegetico/flap/free), gravado só fora do treino (GameOverScene.ts:33-37)
- **Medalhas** (GameOverScene.ts:10-14): ouro ≥3000 · prata ≥1500 · bronze ≥600

---

## 7. FLUXO DE CENAS

`main.ts:32` registra: Boot → Menu → Game → Interlude → Interlude2 → Interlude3 → GameOver.

1. **BootScene** (`'Boot'`): carrega arte PixelLab ou gera placeholders procedurais (generateTexture), registra todas as animações (FRAMES/ANIMS :11-119) e entra no Menu
2. **MenuScene** (`'Menu'`): parallax de fundo, escolha de condução [1] diegética / [2] legacy ×1.25 / [3] livre → `scene.start('Game', { handling })` (:139-141). Atalhos DEV: B/C/N/K treinos de boss, V/M/L fases, I/O/P interludes (:66-115)
3. **GameScene** (`'Game'`): recebe `{ stage?, handling?, practice?, ship? }` (:107-112). Executa a StageDef inteira. Vitória → `victory()` (:677-706): se `next!==null` → `scene.start(interlude ?? 'Game', { stage, handling, score: totalScore(), ship })`; se `next===null` → `scene.start('GameOver', { score, handling, practice, victory: true, stage })`. Morte → `gameOver()` (:891-907) → GameOver com `victory: false`
4. **Interlude (Aurora)**: placar da fase → pouso → **ShipPanel com ROSTER_AURORA** → implosão → `scene.start('Game', { stage: 2, handling, ship })` (:417 — ⚠️ não repassa score)
5. **Interlude2 (Doca Kepler-9)**: recebe `{ score, handling, ship, stage }`; ROSTER_DOCA; guarda de STAGES → se a próxima não existir, GameOver com vitória (:712-721); senão `scene.start('Game', { stage: proxima, handling, score, ship })` (:723-728)
6. **Interlude3 (Hangar do Leviatã)**: ROSTER_FINAL (8 naves — única com `canhoes`); mesma estrutura da 2 (:559-581)
7. **GameOverScene**: recebe `{ score, handling, victory?, practice?, stage? }` (:21-29). Grava recorde, mostra medalha/gancho por fase (:47-52). ESPAÇO reinicia (`scene.start('Game', { handling, practice })` :86 — ⚠️ não repassa stage/ship: reinicia sempre na Fase 1 com jato); ESC → Menu

---

## 8. SISTEMA DE FX (`src/systems/Fx.ts` + chamadas espalhadas)

**Fx** (2 emissores): `explode(x,y,size)` = 10×size partículas aditivas (hotBright/hot/enemyBright) + **shake(90×size, 0.004×size)** (:38-41); `hit(x,y)` = 3 fagulhas ciano (:43-45). **Não existe hitstop/slow-motion** — só shake, flash, tint e partículas.

Chamadas principais de câmera:
- Shake: disparo do jogador (40, 0.0015 — WeaponSystem :685) · overheat HMG (120, 0.004) · torre/míssil (30, 0.001) · sensor acorda (60, 0.002) / detona (140, 0.006) · mina (120, 0.006) · aranha aterrissa (110, 0.005) · Capitânia: hangar (90), burst (60), flak (110) · Serpente: transições (70×n, 160/300) · Núcleo: investida/tiros (40-90) · killBoss: cadeia de 8 explosões ×140ms (GameScene :617-626) · breakAtmosphere (600, 0.01)
- Flash: dano no jogador (90ms, 255/122/168 — GameScene :886) · breakAtmosphere (400ms, 180/230/255) · fúria Capitânia (180ms, 232/48/107) · transições Serpente (140/300ms, 255/120/160) · Núcleo vira coração (500ms, 255/140/60)
- Tint de dano: inimigos/props/hazards 40ms (0xffb0b0); bosses 50-60ms (0xffa0a0/0xff9090/0xffb090); telégrafos piscantes (torre/canhoneira/aranha/flak/sensor/investidas — sempre `setTint`, nunca `setTintFill`)
- Partículas especializadas (1 emissor por sistema, nunca por tiro): muzzle do jogador, rastro teal do enxame, fumaça de míssil, trilha magenta da Capitânia, fumaça dos cotos da Serpente, glow do Núcleo, pulso do obus (alpha)

---

## 9. HUD / UI

- **HUD em jogo** (GameScene.ts:932-947): linha única no topo, fonte monospace bold 9px via `pixelText` (contorno 3px + sombra, resolução ×3 — src/ui.ts): `"{1G|0G} {condução}   {ARMA|TRAVADA} {munição|--}   ♦♦♦ {score}"`. Cor ciano (livre) ou laranja (flap)
- **Medidor HMG** (:254-279, 949-974): 2 barras no topo-direito (calor 56×3 âmbar→amarelo>0.7→magenta piscante travada; giro 56×2 ciano), só visíveis com arma de cano giratório
- **Banner** central (y=76, 13px): fade+zoom 1.8s (:916-930)
- **Barra de boss**: 160×4px em y=16 (criada por cada boss)
- **MenuScene**: título + 3 opções de condução; **GameOverScene**: título vitória/derrota, score, recorde, medalha, "NOVO RECORDE", instruções
- **ShipPanel** (src/ui/ShipPanel.ts — usado nas 3 interludes): visor âmbar com preview ×3 da nave, ficha de barras (DANO max 5, CADÊNCIA max 7, ALCANCE 5 ou 2 se range curto — derivada da `WeaponDef`, :226), slots centrados (passo encolhe com 7-8 naves), confirmação em 2 passos (ENTER → ENTER), ESC sai. ⚠️ Ficha mostra dano/cadência crus — não computa pellets/burst/muzzles (a salva parece fraca, a bateria parece igual à pulse)
- **Pickups**: cápsula com letra H/S + pulso de escala (PickupSystem)

---

## 10. PONTOS DE EXTENSÃO (ganchos exatos)

**(a) Placar online no fim da run:**
- `GameOverScene.create` (GameOverScene.ts:21-37) — recebe `score` final pronto; substituir/complementar o bloco localStorage :33-37 por submit. O `score` chega de `GameScene.gameOver()` (GameScene.ts:899-906) ou `victory()` (:697-705) via `scene.start('GameOver', {...})`
- Para placar por nave/fase: acrescentar campos ao payload nesses dois pontos (hoje passam score, handling, practice, victory, stage)

**(b) Score acumulado entre fases:**
- `GameScene.create` (GameScene.ts:107-140): ler `data.score` e inicializar `this.score` (e talvez `clockOffset`) com ele — o payload já chega das Interludes 2/3
- `GameScene.victory()` (:688-693): já passa `score: this.totalScore()` — funciona assim que o create consumir
- `InterludeScene.avancar` (InterludeScene.ts:417): adicionar `score: this.score` (única interlude que não repassa)
- Comentário-guia da própria codebase: GameScene.ts:684-686

**(c) Cutscene final após o boss da Fase 4:**
- Hook natural: `GameScene.victory()` (:683-706) — hoje `STAGES[4].next === null` cai direto no GameOver (:697). Opção A: criar `'Interlude4'` e mudar `STAGES[4].interlude` (StageDirector.ts:398-399) — a máquina de interludes já faz o resto sem tocar a GameScene. Opção B: ramo especial no `next === null`
- `killBoss` (GameScene.ts:628-637) — o delay de 1400ms pré-vitória é onde o Núcleo some; uma explosão-mor do Leviatã entraria aqui
- `GameOverScene` gancho de vitória da fase 4 já existe: `gancho[4] = 'o Leviatã caiu'` (GameOverScene.ts:47-52)

**(d) Novos efeitos visuais globais:**
- Centralizar na classe `Fx` (src/systems/Fx.ts) — todo impacto/explosão já passa por `fx.hit`/`fx.explode`; um shake/flash global novo entra aqui e cobre o jogo inteiro
- Flash/hitstop global de dano ao jogador: `GameScene.damageShip()` (GameScene.ts:875-889) — ponto único por onde TODO dano passa (ideal para hitstop, que hoje não existe)
- Morte do jogador: `gameOver()` (:891-907); killBoss: :613-638 (cadeia de explosões)
- Parallax global: `setForegroundDimmed`, `setNebulaDensity`, `breakAtmosphere`, `setApproach` (src/Parallax.ts:683-780) — efeitos de fundo por fase entram como modo novo de `ParallaxMode` (:13)

---

## APÊNDICE — achados relevantes para o rebalanceamento

1. **Comentário desatualizado**: WeaponSystem.ts:219 anuncia tracer "8/4 dps"; real é 7/3.5 (rate 3.5). A régua do comentário (:152-154, pulse=7) também cita os valores antigos
2. **Régua declarada**: pulse 7 dps = equilíbrio. Hoje: bateria 8 (de perto) e tracer 7 (grande) estão ACIMA; lamina 4 e enxame 4 são as mais fracas; obus 5 tem dano em rajada única (bom vs estático, ruim vs móvel)
3. **Ficha do ShipPanel mente para armas compostas** (não multiplica pellets/burst/muzzles) — ShipPanel.ts:226
4. **Treino de boss sempre começa com a arma base da nave atual** — atalhos DEV 1-4 trocam (GameScene.ts:302-308)
5. **GameOver reinicia SEMPRE na Fase 1 com o jato** (GameOverScene.ts:86) — morrer na Fase 4 perde a campanha toda; decisão de design a revisitar na rodada de balanceamento
6. **Pool de projéteis do jogador = 128** e do inimigo = 64: em fúria do Núcleo (leque 5 + mirado + anéis) o pool inimigo é o recurso mais apertado — tiros descartados silenciosamente quando cheio
7. **Sem no-hit bonus, sem bomba, sem continue** — três alavancas clássicas de balanceamento disponíveis e não utilizadas
