# Alien World: Remastered — Game Design Document

> Remaster de *Alien World v2* (Unity, 2024). O projeto Unity original foi perdido; sobreviveu
> apenas o build compilado. Portanto **este projeto é um rebuild**, não um port. O que herdamos
> do v2 é o *design*: a física de flap, a curva de dificuldade progressiva, os obstáculos
> procedurais, as medalhas e o recorde persistente.

---

## 1. Pitch

Um run'n'gun espacial pixelado e sombrio. Você pilota a última nave de uma frota destruída
através de destroços, estações abandonadas e da colmeia de uma espécie alienígena. Desvia,
atira, coleta armas e mata o que estiver no caminho.

**Referências:** Metal Slug (peso, exagero, explosões, sistema de armas) + R-Type / Gradius
(shmup horizontal, bosses de padrão) + estética dark sci-fi (Alien, Dead Space, Hyper Light Drifter).

---

## 2. Pilares de design

1. **Peso e impacto.** Todo tiro sacode a tela, todo inimigo morre explodindo. Juice acima de realismo.
2. **Duas conduções, um jogo.** O flap não é um modo secundário nem um minigame — é uma forma legítima e mais difícil de jogar a campanha inteira.
3. **Leitura clara no escuro.** Cenário escuro e dessaturado; inimigos, projéteis e itens brilham. O jogador nunca morre por não ter enxergado.
4. **Sessão curta.** Uma fase dura 3-5 minutos. A campanha inteira, ~20 minutos. É um jogo de navegador.

---

## 3. Condução — DIEGÉTICA (o pilar do jogo)

**A condução não é uma opção de menu. É uma propriedade física do lugar onde a nave está.**

| Onde | Física | Condução |
|---|---|---|
| **Atmosfera** (superfície da lua) | Há gravidade → a nave cai | **FLAP** — você impulsiona para não cair |
| **Vácuo** (espaço aberto) | Não há gravidade → a nave flutua | **LIVRE** — voo em 8 direções |
| **Interior do Leviatã** | Gravidade **artificial** | **FLAP** — ele volta |

O jogador não escolhe o flap: **a gravidade o impõe.**

### O que isso faz com a campanha

```
FASE 1  atmosfera ──[rompe a atmosfera EM PLENO VOO]──▶ vácuo
        FLAP                                            LIVRE
FASE 2  vácuo · LIVRE
FASE 3  vácuo · LIVRE
FASE 4  dentro do Leviatã · gravidade artificial · FLAP  ← o flap VOLTA, no clímax
```

O jogo **ensina** o flap no berço dele (a superfície, que é o Alien World v2), **tira** o flap do
jogador por duas fases inteiras, e o **devolve no clímax** — nos corredores apertados, quando ele
já desaprendeu. Isso é estrutura, e ela sai de graça da física.

O momento em que a atmosfera rompe e **os controles se transformam na sua mão, em pleno voo**, é o
momento-assinatura do jogo.

> **Consequência de implementação:** na transição em voo o **momento é preservado**
> (`resetBody(body, keepVelocity=true)`). A física muda; a nave não para no ar. Zerar a velocidade
> ali daria um solavanco que denuncia a troca de controller.

### A escolha do jogador vira MODIFICADOR

O menu não pergunta mais "qual condução?" — pergunta "quem decide a condução?":

| Opção | Efeito |
|---|---|
| **Diegética** (padrão) | O mundo decide. É a campanha como projetada. |
| **Legacy** | Flap em tudo, inclusive no vácuo. Hardcore. Score ×1.25. |
| **Livre** | Voo livre em tudo. Acessibilidade. |

Travada durante a partida — se desse para trocar em jogo, o jogador farmaria o ×1.25 do Flap nas
partes fáceis e fugiria para o Livre nas difíceis, e o placar perderia sentido. (O `TAB`/`G` de
troca em jogo existe **apenas em build de dev**, como ferramenta de playtest.)

### Flap (Legacy)
A física do v2 original: gravidade constante puxa a nave para baixo, o input aplica um impulso
vertical (`AddForce` → no rebuild, um `setVelocityY` negativo). A nave nunca para no ar.

- Input: `Espaço` / `Clique` / `W` — impulso. Movimento horizontal reduzido.
- **Mais difícil por natureza.** Compensações: hitbox mais generosa, +25% no multiplicador de score, e o dano de contato com o cenário é o mesmo (não perdoa).

#### ✅ TIRO AUTOMÁTICO — decidido no playtest do M1

**Constatação:** não dá para atirar e flapear ao mesmo tempo. Exigir o gatilho no Flap mata o
run'n'gun — a mão está 100% ocupada com a altitude.

**Decisão:** no Flap **a nave atira sozinha**, sem parar. O jogador gasta todo o orçamento de
atenção na posição.

**Por que isso NÃO perde o estilo Metal Slug:** o gênero não vem de segurar o gatilho — vem da
**variedade de armas, do volume de inimigos e das explosões**. Nada disso depende do gatilho manual.
O que o Flap perde é o botão, não o tiro.

Implementado como `FlightController.autoFire` — é uma propriedade da *condução*, não um caso
especial na cena. As armas não sabem a diferença.

### Livre (New)
Voo em 8 direções, sem gravidade. Controle direto, estilo shmup clássico.

- Input: `WASD` / setas / analógico — movimento. `J` / `Espaço` — atirar. `K` — arma especial / bomba.
- É a condução "padrão", onde o level design é calibrado.

> **Implicação técnica:** todo level design precisa ser jogável nas duas conduções. Regra prática:
> nenhum corredor exige precisão vertical maior que o arco de um flap. Corredores apertados
> (fase 2) precisam de passagem verificada com o flap antes de fechar.

---

## 4. Modos

### Campanha
4 fases lineares com waves desenhadas à mão, mini-boss no meio e boss no fim. Estrutura de cada fase:

```
Intro (nave entra) → Wave A → Wave B → [Mini-boss] → Wave C (mais densa) → Corredor/gimmick da fase → [BOSS] → Outro
```

### Sobrevivência (Legacy)
Recriação direta do v2, com a arte nova. Obstáculos procedurais infinitos, dificuldade interpolada
por tempo (`lerp` entre `tempoFacil` e `tempoDificil`), pontuação por obstáculo ultrapassado,
medalhas de **bronze / prata / ouro** ao morrer, recorde salvo em `localStorage`.
Sem combate — é o jogo antigo, preservado.

---

## 5. Armas (modelo Metal Slug)

Arma base infinita e fraca. Pickups dão armas especiais com **munição limitada**; ao esgotar,
volta para a base. **Ao morrer, perde a arma.** Só uma arma especial equipada por vez —
pegar outra descarta a atual.

| Arma | Sigla | Munição | Comportamento |
|---|---|---|---|
| Pulse Cannon | — | ∞ | Tiro base. Fraco, cadência média. Sempre disponível. |
| Heavy Machine Gun | **H** | 200 | Cadência altíssima. **CANO GIRATÓRIO + CALOR** (abaixo). |
| Shotgun | **S** | 60 | Cone de 5 projéteis, alto dano de perto, curto alcance. |
| Laser | **L** | 30 | Feixe perfurante, atravessa toda a fileira de inimigos. |
| Rockets | **R** | 40 | Teleguiado, dano em área, cadência lenta. |
| Plasma Torch | **F** | 120 | Jato curto e contínuo, DPS brutal, obriga a chegar perto. |
| Drone | **D** | 30s | Companheiro que espelha seus tiros. Temporário, não é arma — acumula com a atual. |

Bombas: recurso separado (3 por vida), limpa a tela e dá i-frames.

### A mini-gun COBRA — giro e calor

No 1º playtest ela **matou o chefão da Fase 1 sozinha**. O problema não era o dano: era ela não
cobrar **nada** — 18 tiros/s, de graça, no frame em que o dedo desce. Não havia decisão, havia um
botão de vencer. E baixar o dano só a transformaria numa Pulse pior, que ninguém pegaria.

Ela cobra duas coisas, e cada uma fecha um buraco:

- **GIRO** — o cano precisa girar até a cadência cheia (~0.55s). É o custo de **ABRIR** fogo: a
  HMG deixa de ser a resposta instantânea para tudo e passa a exigir que o jogador decida **antes**
  o que quer matar. O giro cai rápido ao soltar — ele pune quem **alterna de alvo**.
- **CALOR** — atirar esquenta; ~3s de fogo cheio **TRAVA** a arma por 1.6s. É o custo de **MANTER**.

⚠️ **O calor NÃO zera ao soltar o gatilho, e é isso que fecha o exploit.** A defesa óbvia contra o
superaquecimento é metralhar em toques curtos; se o calor caísse a pique fora do gatilho, quem
tamborilasse o dedo **jamais** esquentaria e a mecânica inteira seria enfeite. Ele dissipa
**devagar** — bem mais devagar do que sobe. **Tamborilar ADIA o travamento, nunca o evita.**

O DPS de pico continua brutal. Ele só não é mais grátis nem eterno. E no **FLAP** (tiro automático)
ela entra girando e esquenta sozinha: ali é uma arma que se **gasta**.

---

## 6. Inimigos

| Inimigo | Papel |
|---|---|
| **Asteroide** | Obstáculo destrutível. Sem IA. Ensina o jogador a atirar. |
| **Drone** | Trivial. Voa reto. Serve de alvo e de decoração de wave. |
| **Batedor** | Voa em senóide. Ensina a mirar em movimento. |
| **Torre** | Fixa em parede/asteroide. Atira mirado. Pune quem fica parado. |
| **Mina** | Estática, explode em raio ao contato. Puro controle de espaço. |
| **Mina sensora** | **Acorda quando você passa perto e ESTILHAÇA.** A resposta é atirar ANTES. |
| **Kamikaze** | Acelera na direção do jogador. Força reação. |
| **Canhoneira** | Blindada, atira em rajada de 3. O inimigo "sério". |
| **Cargueiro** | Grande, lento, cospe drones. Prioridade de alvo. |

### A mina sensora — o perigo que pune o CAMINHO

A Fase 2 saiu **mais fácil que a Fase 1**, e por um motivo estrutural: o espaço dela é **aberto**.
Sem chão, o corredor não aperta, e todo perigo dela **vem até você** — coisas que se resolvem
apontando para a frente e atirando.

Faltava um perigo que punisse o **caminho**. A mina sensora não persegue nem atira: fica parada e
cobra **pedágio do espaço em volta dela**. Passou perto, ela acorda, pisca, e estilhaça em leque.

Ela obriga o jogador a **limpar a frente** em vez de só reagir ao que entra na tela — e assim
transforma o espaço aberto, que era a **fraqueza** da fase, no problema a resolver. É o que o chão
fazia na Fase 1, sem chão nenhum.

⚠️ **Ela não estilhaça quando é abatida.** Se atirar nela também cuspisse o leque, atirar e não
atirar dariam no mesmo — e a única decisão que a peça oferece deixaria de existir.

### A SILHUETA é o primeiro canal, a cor é o segundo

Cada inimigo tem a **sua forma**, e ela anuncia o **verbo**: o kamikaze tem um **espeto** na proa,
o cargueiro tem um **hangar aberto** na barriga. Num shmup o jogador não *lê* a tela — ele
reconhece formas na periferia enquanto olha para o que está atirando nele. Dois inimigos que pedem
reações opostas **não podem ter o mesmo contorno**, por mais diferentes que sejam as cores deles
(ver `docs/ASSETS.md`).

### Bosses (um por fase)
1. **Escavadeira Órbita-7** — mineradora abandonada. Ataca com brocas e detritos. Padrão simples, ensina a leitura de boss.
2. **Núcleo AXIOM** — a IA da estação. Luta em ambiente fechado, com torres nas paredes e laser giratório.
3. **Behemoth** — criatura orgânica na superfície. Multi-parte (destruir as garras antes do núcleo).
4. **A Rainha** — boss final, 3 fases, junta os padrões de todos os anteriores.

---

## 7. Fases — o arco da aproximação

**A campanha é uma jornada só: da superfície de uma lua até o interior de uma nave colossal.**
O "Leviatã" está visível ao fundo desde que você sai da atmosfera, e cresce a cada fase.

O arco **respira**: fechado → **aberto** → fechando → fechado. Um jogo que só aperta, cansa;
um que abre antes de apertar, tem clímax.

| # | Nome | Ambiente | Fundo | Espaço de manobra | Boss |
|---|---|---|---|---|---|
| 1 | **A Decolagem** | Rasante à superfície de uma lua → rompe a atmosfera → espaço | O céu vira vazio | Fechado (chão abaixo) → **abre** | Torre de Defesa da Colônia |
| 2 | **Frota Morta** | Cinturão de asteroides e destroços da sua frota | A lua **encolhe**, o Leviatã **cresce** | Aberto. Liberdade total. | Canhoneira-Capitânia |
| 3 | **O Casco** | Rente à superfície externa do Leviatã | Ele **virou o chão** | Corredor amplo, teto aberto | Portão de Doca (arrombá-lo = entrar) |
| 4 | **O Interior** | Dentro dele. Corredores, escuridão. | Você está no fundo | Fechado. | O Núcleo |

### A abertura é o Alien World v2

**A Fase 1 começa como o jogo antigo:** chão embaixo, obstáculos vindo, voando de flap. Quem jogou
o original reconhece nos primeiros 30 segundos — e então a nave rompe a atmosfera e o jogo **se
revela ser outra coisa**. É o remaster dizendo "eu era aquilo, agora sou isto". Custa zero: é só
ordenar as fases direito.

Bônus mecânico: a superfície é o **habitat natural do Flap**. O jogo ensina a condução mais difícil
no ambiente onde ela nasceu, antes de exigir dela num run'n'gun.

### Por que o arco funciona

- **Narrativo:** depois da decolagem, o alvo está à vista o jogo inteiro. A tensão é ele ficando maior.
- **Mecânico:** o espaço de manobra fecha progressivamente. Curva de dificuldade que não depende de
  empilhar mais inimigos na tela.
- **Visual:** vender *escala* é o mais difícil em pixel art. Dois fundos contam a história inteira —
  a lua encolhendo e o Leviatã crescendo. "Aquilo que era um ponto agora é o chão."
- **Custo:** lua + Leviatã = **2 assets gerados**, reaproveitados em escalas diferentes. É o maior
  elemento de coesão do jogo e custa duas gerações.

### ⚠️ Restrição de level design (inegociável)

O espaço fecha, mas **nenhum corredor pode ser mais estreito que o arco de um flap**. A Fase 4 é
onde a condução Flap mais sofre — todo corredor dela precisa ser jogado no Flap antes de ser
aprovado. Se não passa no Flap, o corredor está errado, não a condução.

---

## 8. Progressão e feedback

- **Vidas:** 3 por run na campanha. Morrer reinicia a fase (não a campanha).
- **Score:** por inimigo + bônus de no-hit + multiplicador de condução (Flap = ×1.25).
- **Medalhas:** preservadas do v2 — bronze/prata/ouro por faixa de score, na tela de fim.
- **Persistência:** `localStorage` (recorde por modo e por condução, fases desbloqueadas, opções).

---

## 9. Fora de escopo (v1)

Multiplayer, meta-progressão/upgrades permanentes, história com diálogos, loja, conquistas,
leaderboard online, mais de 4 fases. Nada disso entra antes do jogo estar jogável de ponta a ponta.
