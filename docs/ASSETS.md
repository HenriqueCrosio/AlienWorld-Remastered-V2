# Especificação de assets (PixelLab)

Esta spec é independente de *como* o PixelLab é chamado (MCP, API ou manual). Ela é o contrato:
qualquer sprite que não obedeça a estas regras é rejeitado e regerado.

## Regras invioláveis

1. **Fundo transparente** em todo sprite (nada de fundo preto "que parece transparente").
2. **Paleta travada** (abaixo). Se o gerador sair da paleta, quantizar depois no Aseprite.
3. **Sem anti-aliasing.** Pixel art de verdade: bordas duras, 1 pixel = 1 pixel.
4. **Grid consistente.** Todo frame de uma animação tem o mesmo tamanho de canvas e o mesmo ponto de ancoragem.
5. **Orientação:** a nave e os inimigos voam para a **direita**. Sprite desenhado apontando para a direita.

## Paleta — "Deep Void" (24 cores)

Espaço escuro e dessaturado; o que importa **brilha**. Regra de leitura: o cenário nunca usa
os acentos quentes (laranja/magenta) — eles são reservados para perigo e para o jogador.

```
Fundo / cenário (frios, escuros, baixo contraste)
#05060d  #0b0f1e  #131a33  #1e2a4a  #2c3c63  #3d5280  #55709c  #7590b8

Estrutura / metal (neutros)
#1a1a1f  #2e2e38  #4a4a57  #6b6b7a  #9a9aab  #d0d0dc

Jogador / aliado (ciano)
#0e6b7a  #17a6bd  #3ee0f0  #b5f7ff

Perigo / inimigo (magenta-vermelho)
#5c0e2e  #a11347  #e8306b  #ff7aa8

Energia / explosão (quentes)
#ff8c1a  #ffd447
```

## Tamanhos de canvas

| Asset | Canvas | Frames |
|---|---|---|
| Nave do jogador | 32×32 | idle 1, thrust 4, tilt-up 1, tilt-down 1, explosão 8 |
| Drone / Batedor / Mina | 24×24 | idle 4, morte 6 |
| Kamikaze | 24×24 | voo 4, carga 4 |
| Torre | 32×32 | idle 1, tiro 3 |
| Canhoneira | 48×48 | voo 4, tiro 4, morte 8 |
| Cargueiro | 64×48 | voo 4, cuspir 4, morte 10 |
| Asteroide | 32×32 e 48×48 | 3 variações, quebra 5 |
| Mini-boss | 96×96 | idle 4, ataque 6, morte 12 |
| Boss | 160×144 | por partes (ver abaixo) |
| Projétil (jogador) | 8×8 / 16×8 | 2 |
| Projétil (inimigo) | 8×8 | 2 |
| Pickup de arma | 16×16 | pulsando 4 |
| Explosão | 32×32 e 64×64 | 8 |
| Tiles de cenário | 16×16 | tileset por fase |
| Parallax | 384×216 | 3-4 camadas por fase |

> **Bosses são montados por partes**, nunca gerados como um sprite gigante único. Corpo + garra
> esquerda + garra direita + núcleo + canhão, cada um seu próprio sprite, animados por composição.
> Isso é o que permite destruir partes individualmente (Behemoth) e é a única forma de manter
> qualidade num sprite desse tamanho.

## Prompt base

Todo prompt de sprite começa com este prefixo, para travar o estilo entre gerações:

```
dark sci-fi pixel art, limited 24-color palette, deep navy and near-black background tones,
cyan player accents / magenta enemy accents, hard edges, no anti-aliasing, no dithering gradients,
transparent background, side view facing right, retro arcade run-and-gun style,
readable silhouette on a dark background
```

Depois, o específico. Exemplos:

- **Nave do jogador:** `+ small agile starfighter, sharp angular hull, twin cyan engine glow, battle-worn plating, 32x32`
- **Kamikaze:** `+ insectoid drone, magenta glowing core, sharp ramming spike, 24x24`
- **Cargueiro:** `+ bulky alien carrier ship, armored hull, open bay hatch, magenta veins, 64x48`
- **Boss 3 (Behemoth):** `+ colossal organic alien creature, chitin plating, exposed pulsing core, four grasping claws — generate as separate parts`
- **Parallax fase 1:** `+ distant asteroid field, dim starfield, cold blue nebula, very dark, low contrast, no foreground detail, 384x216`

## Orçamento

**Saldo disponível no PixelLab: ~$9.60.** Ao contrário do que parecia à primeira vista, isso é
**folgado** — desde que a gente use o modelo certo.

O preço é **por chamada, escalando com o tamanho do output**
([fonte](https://www.pixellab.ai/pixellab-api)):

| Modelos padrão (Pixen, Bitforge) | Custo/chamada |
|---|---|
| 32×32 | ~$0.007 |
| 64×64 | ~$0.007–0.008 |
| 128×128 | ~$0.008–0.01 |
| 256×256+ | $0.01–0.02 |

Nossos sprites vivem entre 24 e 64 px (partes de boss até 128). Ou seja, **menos de um centavo por
geração** — o saldo dá para ~1.000 chamadas. O "hero set" da Fase 1 (~15 sprites) custa **~$0.12**.
A arte completa das 4 fases, com animações, fica na casa de **$2**.

> *"All prices are estimates and will vary because of variation in the GPU processing time."*
> Trate como ordem de grandeza.

### VERIFICADO no MCP (2026-07-13)

Saldo real: **$9.61 em créditos**. Assinatura Tier 1 ativa, mas **as 2.000 gerações do plano já
foram consumidas (2000/2000)** — portanto tudo agora sai dos créditos.

A unidade de cobrança é a **geração** (~$0.005 cada). Custo por ferramenta:

| Ferramenta | Custo | |
|---|---|---|
| `create_character` (padrão) | **1 gen** | barato |
| `animate_character` (template/v3) | **1 gen/direção** | barato |
| `create_sidescroller_tileset` | **1 gen** | barato |
| `create_1_direction_object` | **20-40 gens** (~$0.095 a ≤128px) | ⚠️ **PRO** |
| `create_tiles_pro`, `create_8_direction_object` | 20-40 gens | ⚠️ **PRO** |

**A armadilha:** `create_1_direction_object` — a ferramenta natural para uma nave/inimigo em vista
lateral — **é Pro**. Naves e inimigos são "objetos", não "personagens", então o caminho óbvio é o caro.

### Onde o dinheiro realmente vaza

1. **Ferramentas Pro — ~20-40× o padrão.** É o único fator que importa.
2. **Canvas grande.** Pro escala por faixa: ≤256px = $0.095 · ≤341px = $0.125 · ≤512px = $0.185.
   Nossos sprites (≤128px) caem sempre na faixa mais barata. Mais um motivo para montar boss por partes.

### A conta

Hero set da Fase 1 = ~15 assets. **Mesmo que todos sejam objetos Pro: ~15 × $0.095 = ~$1.43**
(15% do saldo). Sobram ~$8 para iterar na nave e no boss. A campanha inteira sai em ~$4-6.
**O escopo original cabe.**

### ⚠️ Teste que pode cortar o custo em 20× (fazer no M4, antes do lote)

Gerar a nave com **`create_character` (padrão, 1 gen)** em vez de `create_1_direction_object`
(Pro, 20-40 gens). Uma nave em vista lateral pode funcionar como "personagem" para o gerador.
Se funcionar, o hero set cai de ~$1.43 para ~$0.10. **Custa 1 geração descobrir.**

Com isso resolvido, há folga para **iterar**: regerar a nave 10× custa 7 centavos. Não economize
na única coisa que o jogador olha 100% do tempo.

### O que NÃO se gera — não por economia, mas porque fica melhor

As decisões abaixo valem por mérito próprio: explosão com blend aditivo fica melhor **em
movimento** do que sprite gerado, e um starfield procedural é infinito e não pesa no bundle.

| Asset | Como sai de graça |
|---|---|
| Explosões, fogo, fumaça | Partículas do Phaser com blend aditivo. Num shmup em movimento, ninguém vê o pixel da explosão — vê o clarão. |
| Projéteis | Retângulos/losangos de 8×8 desenhados em código, com glow aditivo. Literalmente 3 cores. |
| Muzzle flash, hit flash, dano | `setTint` branco por 2 frames. |
| Campo de estrelas | Gerado proceduralmente (pontos em 3 velocidades de parallax). Fica melhor que uma imagem, e é infinito. |
| Ícones de arma (pickup) | **Um** engradado 16×16 gerado, com a letra (H/S/L/R/F) desenhada por cima em bitmap font. 1 asset em vez de 6. |
| Variantes de inimigo | `tint` + escala sobre o mesmo sprite base. Um drone vira 3 inimigos diferentes. |
| Frames de animação simples | Bob, tilt, pulso e thrust por transform/rotação/tint no código — não por frames gerados. |

Isso sozinho elimina a maior parte da lista.

### O que se gera (o "hero set" da Fase 1) — ~12-15 gerações

1. **Nave do jogador** (a única que precisa estar impecável — o jogador olha para ela 100% do tempo)
2. **3 bases de inimigo**: drone, canhoneira, torre → viram 6-8 inimigos por tint/escala
3. **Asteroide** (1-2 formas; variação por rotação e escala em código)
4. **Boss 1, em ~4 partes** (corpo, broca, núcleo, canhão)
5. **Tileset 16×16** da estação/destroços (1 folha)
6. **1 camada de nebulosa** 384×216 — reaproveitada em **todas** as fases com tint diferente

> A nebulosa recolorida por fase é o truque de maior retorno do projeto: 1 geração, 4 ambientes.

### Regras de gasto

- **Confirmar o modelo antes do primeiro lote.** Padrão = centavos; Pro = 10-25× mais. Esta é a
  única regra que realmente protege o saldo.
- **Nada de fases 2-4 antes de M3.** Não é questão de custo (é barato), é questão de *retrabalho*:
  se o jogo mudar, a arte gerada vai para o lixo.
- **Iterar é permitido e encorajado** na nave e no boss. É o resto do projeto que não deve ser
  regerado por perfeccionismo — para esses, terminar no Aseprite é mais rápido que regerar.
- Prompt e seed de cada geração ficam salvos em `assets/raw/prompts.json` — para nunca pagar duas
  vezes pela mesma coisa por ter perdido o prompt, e para conseguir reproduzir o estilo depois.

## Variantes — aproveite o lote inteiro

Um lote do PixelLab devolve **dezenas de candidatos pelo mesmo preço** (64 num sprite de 32px).
Quando mais de um fica bom, **todos entram no jogo**. Variedade que já foi paga.

A convenção é só de nome: `spire`, `spire2`, `spire3`. O `src/art.ts` descobre as variantes
sozinho (`pickVariant`) e sorteia uma a cada spawn. Acrescentar uma variante é **copiar um PNG e
registrá-lo no `ART` da BootScene** — nenhum código muda.

Em uso hoje: 3 picos de rocha, 3 construções, 2 torres, 2 drones, 3 asteroides, 3 destroços,
2 minas, 2 minas sensoras, 2 cargueiros, 3 montanhas distantes, 3 montanhas médias.
Um relevo com um pico só é um padrão; com três, é uma paisagem.

## ⚠️ TINT NÃO É UM SEGUNDO SPRITE — e essa lição custou o róster inteiro

Durante quase todo o projeto, `tint + escala` foi tratado como "variante de inimigo de graça":
o batedor era o drone rosa e menor, o kamikaze era o drone laranja, o cargueiro era a canhoneira
a 1.9×. Em teoria, economia elegante. **Na prática, não funcionava.**

Num shmup o jogador **não lê a tela** — ele reconhece FORMAS na periferia enquanto olha para o que
está atirando nele. **Cor é o segundo canal, não o primeiro.** Um kamikaze que mergulha em cima de
você e um drone que atravessa em linha reta pedem reações opostas; se os dois têm o mesmo contorno,
a decisão só existe depois de o jogador ter comparado as cores — e nesse tempo o kamikaze já bateu.

Hoje **cada inimigo tem a sua silhueta**, e ela anuncia o VERBO:

| Inimigo | A forma diz | O jogador faz |
|---|---|---|
| drone | casco de inseto, reto | atravessa — ignore ou limpe |
| batedor | asas em flecha, magro | rápido, em senóide |
| **kamikaze** | **ESPETO na proa** | vem em cima de você — **atire NELE** |
| canhoneira | casco pesado, canhão | para e mira — saia da linha |
| **cargueiro** | **barriga com HANGAR aberto** | não atira: **PARE** — prioridade de alvo |

A cor continua **reforçando** (o kamikaze é quente, o cargueiro é escuro). Ela só não trabalha mais
sozinha. O tint segue ótimo para o que ele realmente é: um **acento**, não uma identidade.

E há um custo técnico escondido: o cargueiro a **1.9×** era escala **fracionária em pixel art** —
ela **borra a grade**, que é a única coisa que faz o jogo parecer feito de pixels. Gerado nativo a
64px, ele vai a 1.1× e a grade fica de pé.

## ⚠️ Duas armadilhas que fizeram tudo FLUTUAR

Descobertas com o probe (`npm run probe`), não a olho nu. Custaram uma tarde — não repita.

**1. O PixelLab entrega o sprite num canvas quadrado, com transparência de sobra.**
`mtn-far` veio 128×128 mas a arte ocupava só 128×**39** — havia 89px de nada embaixo. Ancorando
pela base (`origin 0.5, 1`), o objeto boiava exatamente a altura dessa sobra. **Todo sprite
ancorado no chão passa por `sharp().trim()`** antes de entrar em `public/sprites/`.

**2. Trocar a origem depois de criar o corpo físico faz o sprite subir sozinho.**
`group.create()` ancora pelo centro. Ao trocar para `origin(0.5, 1)` e chamar
`body.updateFromGameObject()`, o corpo é reposicionado mas a **posição anterior** que ele guarda
não — e no frame seguinte o Arcade lê a diferença como *movimento* e puxa o sprite para cima.
Use **`body.reset(x, y)`**, que sincroniza posição e posição-anterior de uma vez (e lembre que ele
zera a velocidade: defina a velocidade **depois**).

## Pipeline

```
PixelLab  →  revisão manual (Aseprite: quantizar paleta, limpar bordas, ajustar pivô)
          →  atlas (TexturePacker ou free-tex-packer) → atlas.png + atlas.json
          →  src/assets/  →  BootScene carrega
```

Manter os PNGs originais gerados em `assets/raw/` (fora do bundle) e os atlas em `assets/dist/`.
Nunca editar o atlas na mão — reempacotar.

## Ordem de produção

1. **M1-M3 rodam com placeholder** (retângulos coloridos). O jogo tem que estar divertido *antes* da arte.
2. **M4: hero set da Fase 1.** Ela vira a referência de estilo.
3. **Fases 2-4 só depois**, imitando o que ficou bom na Fase 1 — e só com orçamento recarregado.

Gerar 200 sprites antes de saber se o estilo funciona em movimento é a forma mais cara possível
de descobrir que a paleta está errada.
