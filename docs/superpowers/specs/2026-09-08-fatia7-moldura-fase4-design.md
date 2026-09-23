# A MOLDURA — A FASE 4 PARA DE SORTEAR E VIRA UM LUGAR

**Data:** 2026-09-08 · **Branch:** `feat/fase4-visual` · **Substitui:** a Task 4 da Fatia 7 (as
colunas novas) e, em parte, a seção 7 da spec `2026-09-06-fatia7-fase4-design.md`.

---

## 1. DE ONDE ISTO VEIO

Ele olhou a Fase 4 depois do Bloco A aprovado e disse:

> *"Sinto que são assets jogados na cena e isso me causa um certo desconforto. As outras fases
> tudo bem, mas quero deixar um impacto visual maior na última fase, algo que se aproxime de um
> jogo AAA shoot'em up."*

E, sobre o que fazer com isso:

> *"Sei que o jogador pouco vê do cenário quando está concentrado em não morrer, mas precisa
> estar lá."*
>
> *"Por que temos agora fundos complexos e diferentes, essa transição precisa ser acompanhada de
> assets que casem com o ambiente."*
>
> *"Talvez colocar uma moldura em volta, como se fossem paredes?"*

A moldura é dele. Esta spec é a moldura levada até o fim.

⚠️ **Antes disso, a manhã do dia 08/09 foi gasta gerando 12 laminas largas** para a Task 4 e
descobrindo, com régua, que nenhuma resolvia. **O problema nunca foi a arte da coluna** — era a
estrutura que a segurava. Está registrado no plano do Bloco A, Passos 5 e 6.

---

## 2. O DIAGNÓSTICO — "SEM NEXO" É UM FATO DO CÓDIGO

Não é impressão. Está escrito em `GameScene.spawnCorredores` (`GameScene.ts:850`):

```ts
const vaoY = Phaser.Math.Between(TETO_Y + margem + meio, GROUND_Y - margem - meio);
```

**Cada par de colunas sorteia um `vaoY` NOVO.** O corredor não tem memória: o vão salta de altura
a cada batida, e duas colunas seguidas não têm relação nenhuma uma com a outra. Some a isso o
`sorteiaKind` (`GameScene.ts:869`), que escolhe entre três nomes soltos sem saber o que veio antes
nem em que trecho da fase está.

O resultado é exatamente o que ele descreveu: **objetos isolados chegando pela direita, pousados
no vazio**. Nenhuma arte nova conserta isso, porque o defeito não está no que é desenhado — está
em **não haver nada segurando o que é desenhado**.

⚠️ **É por isso que a Task 4 morre aqui.** Trocar a costela por uma lamina melhor era melhorar o
adesivo sem colar nada.

---

## 3. A TESE

**A borda já está pintada. Ela só está três planos atrás.**

As quatro pinturas dele (`paint-bg-f4-a..d`) têm massa orgânica escura fechando as quatro bordas e
o meio aberto — a composição que a pesquisa de montagem de cenário manda fazer, já feita. O que
falta é a camada de jogo **usar** essa borda.

A moldura é uma **faixa contínua de chão e teto**, desenhada, rolando com o mundo, da qual tudo
nasce. Nenhum obstáculo existe solto: o obstáculo é **a parede avançando**.

Julgado em mock (`scripts/_f4/_mock-moldura.png`, 4 faixas sobre a `bg-a`), veredicto dele:

> *"Definitivamente, o 2 ficou muito bom, trouxe preenchimento. E a número 4 me chamou a atenção
> pois é exatamente isso que eu pretendo na hora do duto (estreitamento da fase), algo nesse
> estilo mata minha intenção e deixa elegante."*

### O que a pesquisa sustenta

- A composição tem três conjuntos: **primeiro plano, centro de interesse e fundo**. O primeiro
  plano "cria uma **moldura** para a dominante" e entra como **silhueta, não como detalhe**
  ([Composition in Level Design](https://www.gamedeveloper.com/design/composition-in-level-design)).
- O Metal Slug usa **poucas camadas**, uma delas imediatamente atrás dos objetos de primeiro
  plano, e **desbota o fundo** para o primeiro plano poder ser ousado
  ([Linclo Games](https://linclogames.com/metal-slug-is-pixel-art-perfection/),
  [polycount](https://polycount.com/discussion/38090/metal-slug-background-gba)).
- Decoração de primeiro plano fica **na margem, onde o personagem não pode chegar**; fundo e
  primeiro plano levam **menos detalhe e menos cor** que o campo de jogo; o espaço negativo dá ao
  olho "um lugar para descansar"
  ([Dark Flow](http://www.darkflowgame.com/2021/04/08/aesthetics-and-affordance-in-shoot-em-ups/),
  [SLYNYRD Pixelblog 31](https://www.slynyrd.com/blog/2020/12/14/pixelblog-31-shmup-sprite-design)).

---

## 4. A GEOMETRIA — O QUE DESENHA E O QUE MATA

⚠️ **A separação mais importante desta spec.** Ela é o que protege a fase de virar um conserto de
colisão.

| | **A FAIXA** | **A MESA** |
|---|---|---|
| o que é | a parede contínua, chão e teto | a saliência que fecha o caminho |
| colide? | **NÃO. Decoração pura.** | **SIM** — é o `corredor` de hoje, com outra silhueta |
| quem manda nela | a espessura do trecho (número novo) | o `gap` do roteiro (já existe) |
| onde vive | fora do corredor, sempre | do topo da faixa até a borda do vão |

**Consequência:** a linha de base `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}` da
`probe-stage4` continua valendo, porque quem define o vão continua sendo o mesmo número do
roteiro. **Nenhuma física nova entra** — que é onde bug de colisão mora.

### 4.1 A linha do vão deixa de ser sorteada

O `vaoY` aleatório por par **é substituído por uma curva contínua**: a altura do corredor passa a
derivar de x (a posição no mundo), não de um sorteio por batida. A faixa desenha essa curva; a
mesa nasce dela. É o que faz duas colunas seguidas terem relação — e é a correção da causa raiz da
seção 2.

A curva é **segmentada, não senoidal**: uma sequência de placas de larguras diferentes, cada uma
num degrau, com bisel curto na emenda. Onda lisa lê como onda; placa lê como parede. (O mock
provou os dois: a primeira versão era senoidal e parecia água.)

### 4.2 A mesa é uma MESA, não uma colina

⚠️ **Topo CHATO, ombros em rampa curta.** Isto não é gosto: é a correção do defeito que custou 12
gerações no dia 08/09.

A hitbox de um prop sai da **largura da textura**, não do desenho (`TerrainSystem.ts:307`,
`body.setSize(p.width * 0.6, p.height)`), e é um retângulo de **altura cheia**. Uma silhueta de
base larga e ponta fina mata numa faixa larga na altura da ponta — que é justamente por onde o
jogador passa. Medido: a lamina alargada matava **46px no vazio**.

**Mesa de topo chato passa por construção**, porque o desenho alcança a largura da textura
exatamente na altura da ponta. A régua que confere isso já existe: `scripts/_f4/_medir-colunas.mjs`.

### 4.3 Os números que não mudam

`GAME_WIDTH` 384 · `GAME_HEIGHT` 216 · `GROUND_Y` 206 · `TETO_Y` 10 · `SCROLL_SPEED` 84px/s.
Banda jogável: 10 a 206. Um segmento de faixa de 128px de largura nasce a cada **128 ÷ 84 =
1,52s** — encostado no anterior, como a spec do duto já previa.

---

## 5. A ESPESSURA DA FAIXA É A DRAMATURGIA DA FASE

Um número novo por trecho, ao lado do `gap` que o roteiro já tem. O `gap` manda na colisão; a
espessura manda no desenho. A fase inteira vira uma frase: **as paredes vão fechando em você.**

**A espessura é medida em px**, do `GROUND_Y` (206) para cima no chão e do `TETO_Y` (10) para
baixo no teto — as mesmas âncoras que o `TerrainSystem` já usa.

| t | o roteiro já diz | espessura | o que se sente |
|---|---|---|---|
| 1 | gap 110, rate 2,2 | **16px** | você entrou num lugar grande |
| 15 | gap 96, rate 2,4 | **18px** | ele começa a se estreitar |
| 37 | gap 104, rate 2,6 | **26px** | as paredes ganharam corpo |
| 43 | gap 76, rate 1,9 | **36px** | o aperto |
| 63,5 | gap 84, rate 1,7 | **48px** | não é mais câmara |
| 68 | as paredes contínuas | **cheia** — a mesa vira parede | o duto |
| 79 | gap 0 | cheia | o silêncio antes do chefão |

⚠️ **A TRAVA:** a superfície da faixa nunca entra no corredor. Se a espessura pedida deixar menos
de **8px de folga** até a borda do vão, ela é **aparada** — o desenho cede, o vão nunca. É um
assert da sonda, não uma boa intenção: `superficie_chao >= borda_do_vao + 8`.

⚠️ **Os seis números são chute calibrado até o playtest**, com a mesma etiqueta dos vãos e dos HP
das portas. O que não é chute é a CURVA: ela tem de subir monotonicamente.

⚠️ **A curva já estava escrita nos vãos desde a Fatia 7.** Ela só não estava visível. A moldura é
o que faz o jogador enxergar o que os números já faziam com ele.

---

## 6. AS QUATRO CÂMARAS — E POR QUE ELAS SÃO DIFERENTES

As pinturas dele contam uma transformação que o jogo hoje não usa: **a Fase 4 vai de construído a
vivo.**

| câmara | t | a pintura mostra | o que é |
|---|---|---|---|
| **A** | 1–40 | passarelas horizontais, lâmpadas alaranjadas, cabos, uma coisa costelada atrás | **a doca engolida** — estrutura de gente, tomada por carne |
| **B** | 40–68 | azul, frio, um tubo liso recuando, tentáculos pendurados | **a garganta** — o metal acabou |
| **C** | 68–82 | vermelho, massa densa, um vórtice de olho | **o gânglio** — aqui mora o duto |
| **D** | 82+ | o núcleo aceso, tendões, chão espelhado | **o coração** — a arena do chefão |

O jogador nunca vai parar para ler isso. Mas ele **atravessa** a transformação, e é isso que fica.
Os eventos `cenario` que trocam a pintura (t=40 / 68 / 82) passam a trocar **o jogo de peças
junto** — que é o pedido dele de que os assets casem com o ambiente.

⚠️ **Cada câmara faz um trabalho diferente, e é isso que enxuga a lista:** A e B têm obstáculo;
C **é** o duto (parede cheia, sem mesa — quem fecha o caminho são as portas); D não tem terreno
nenhum, é arena.

---

## 7. AS 14 PEÇAS

Todas em **resolução nativa, escala 1**. ⚠️ Reduzir pode; **ampliar nunca** — a lei da resolução
que ele cravou em 06/09.

### Câmara A — a doca engolida *(a única com metal)*

| chave | tamanho | o que é |
|---|---|---|
| `f4FaixaA` | 128×64, encaixável | passarela de aço mordida pela carne: viga reta em cima, tendão saindo por baixo. O teto é ela com `flipY` |
| `f4MesaA1` | 96×112, topo chato | um pedaço de convés levantado — chapa dobrada, corrimão torto |
| `f4MesaA2` | 80×112, topo chato | um pilar de sustentação já tomado por costela |
| `f4VivoA` | 32×32, 6 quadros | lâmpada de emergência **piscando** na viga — o metal ainda tentando funcionar |

### Câmara B — a garganta

| chave | tamanho | o que é |
|---|---|---|
| `f4FaixaB` | 128×64 | anéis de cartilagem em fila, traqueia vista de lado |
| `f4MesaB1` | 96×112, topo chato | um anel que cresceu para dentro — o tecido da faixa, mais grosso |
| `f4MesaB2` | 80×112, topo chato | feixe de tendões esticado do chão, achatado no topo |
| `f4VivoB` | 32×48, 6 quadros | glândula que **pinga**; a gota cai e não colide |

### Câmara C — o gânglio / o duto

| chave | tamanho | o que é |
|---|---|---|
| `f4FaixaC` | 128×80 (mais grossa) | carne vermelha densa, nervuras, pontos acesos — a parede do duto |
| `f4PortaC` | 64×112 + estado destruído | a comporta que a spec da Fatia 7 já previa: anteparo escuro, **núcleo aceso** dizendo "mire aqui" |
| `f4VivoC` | 48×48, 8 quadros | esfíncter que **abre e fecha** na parede; não colide, só respira |

### Câmara D — o coração

| chave | tamanho | o que é |
|---|---|---|
| `f4FaixaD` | 128×64 | tendão liso e o chão espelhado da pintura — a arena tem de ser limpa |

### Compartilhado — o primeiro plano

| chave | tamanho | o que é |
|---|---|---|
| `f4Veu1`, `f4Veu2` | 128×216 | massa orgânica passando **na frente da nave**, só nas margens. Tintadas por câmara — uma arte serve as quatro |

**Total: 14 peças.** Quatro animadas, e essas quatro **são o orçamento inteiro do "vivo"** — uma
por câmara, na borda, onde a visão periférica pega movimento e não pega detalhe.

⚠️ **Quem faz o quê fica em aberto por decisão dele** — ele disse que pode criar os assets, e
quis definir *o que* criar antes de criar. O `Parallax` já tem camada de primeiro plano (depth 60,
os véus da nebulosa), então o `f4Veu` não pede infraestrutura nova.

---

## 8. AS LEIS DE ARTE DESTA FASE

1. ⚠️ **Mais contraste que a pintura — o que NÃO é o mesmo que mais clara.** Esta lei já nasceu
   mal escrita aqui e cobrou o preço no mesmo dia: as quatro primeiras faixas saíram de **1,55× a
   4,06× mais claras** que as próprias pinturas, e parede 4× mais clara que o lugar onde ela está
   não lê como plano da frente — lê como adesivo branco. A redação certa, em número:
   - a **média** da faixa fica pouco acima da média da pintura — alvo **1,3×**, não mais;
   - o **contraste interno** sobe (fator ~1,4): a diferença mora DENTRO da peça.
   - **O brilho é local, não geral.** Quem confere é `scripts/_f4/_valor-faixa.mjs`.

   (O erro simétrico também já aconteceu: as duas primeiras versões do mock escureceram a faixa e
   ela virou buraco preto. O alvo é uma faixa estreita, e por isso ele é um número.)
2. ⚠️ **Nada, nunca, no meio.** A banda onde o jogador voa fica vazia. O espaço negativo é o que
   faz o resto ser legível — e é o que permite gastar todo o detalhe na borda sem matar ninguém.
3. ⚠️ **Luz é PONTUAL, não contorno.** A primeira versão do mock desenhou um contorno aceso na
   borda inteira e virou neon. Luz só onde há energia: brasa nas emendas, contada, não contínua.
   O volume vem de uma quina 1px mais clara e de uma sombra de queda — isso é forma, não luz.
4. ⚠️ **Família de cor do fundo, valor próprio.** Forçar a paleta do fundo camufla o prop (rodada
   1 das colunas, 07/09); ignorar a família de cor o expulsa (as seis candidatas azuis, 08/09).
5. ⚠️ **Resolução nativa, escala 1.** Reduzir pode; ampliar nunca.

---

## 9. O QUE MORRE, O QUE SOBREVIVE

**Morre:**

- **A Task 4** (as colunas novas). As 10 candidatas de 07/09 e as 12 de 08/09 ficam no disco como
  material de estudo. Nenhuma é instalada.
- **O `sorteiaKind`** (`GameScene.ts:869`). Não há mais nomes soltos para sortear.
- **O `vaoY` sorteado por par** (`GameScene.ts:859`). Vira curva contínua.
- **`costela` / `orgao` / `maquinario` como terreno da F4.** Os arquivos ficam — eles são usados
  como decoração plantada NA faixa, que é o que a faixa 4 do mock mostrou.

**Sobrevive:**

- **`scripts/_f4/_medir-colunas.mjs`** — a régua de honestidade da MESA (hitbox contra desenho).
- **`scripts/_f4/_medir-faixas.mjs`** — a régua da FAIXA: se ela sangra nas três bordas, se o topo
  é reto e o quanto a emenda vai aparecer. ⚠️ Foi ela que provou que
  `create_1_direction_object` é a ferramenta ERRADA para uma parede: das 64 candidatas geradas em
  08/09, **nenhuma** encostava nas três bordas — a ferramenta existe para recortar um objeto do
  fundo, e parede precisa do oposto. A faixa é **imagem cheia** (`no_background: false`), e aí
  topo reto e bordas sangrando saem por construção.
- **`scripts/_f4/_valor-faixa.mjs`** — o acerto de valor contra a pintura da câmara.
- **`scripts/_f4/_folha-lamina.mjs` e `_mock-moldura.mjs`** — o ferramental de folha de contato.
- **Tudo do Bloco A já aprovado**: os quatro fundos, a saída do `hangar`, o evento `cenario`.

---

## 10. O QUE MUDA NA SPEC DA FATIA 7

⚠️ **O Bloco A e o Bloco C se fundem em parte.** A parede contínua deixa de ser um sistema
exclusivo do duto e vira o alicerce da fase inteira.

| bloco | antes | agora |
|---|---|---|
| A | 4 fundos + colunas sorteadas | 4 fundos ✅ + **a moldura** |
| B | o chefão | **inalterado** |
| C | paredes contínuas + 3 portas | **só as 3 portas** — a parede já é da fase |

A seção 7 da spec `2026-09-06-fatia7-fase4-design.md` (C1, as paredes contínuas) é absorvida por
esta. A seção C2 (as portas) continua valendo como está, HP incluídos.

---

## 11. COMO SE VERIFICA

- **`node scripts/probe-stage4.mjs`** — tem de devolver `corredores {"chao":3,"teto":3,
  "vaos":[110,110,110]}`. ⚠️ Se mudar, a mesa nova é mais justa que a coluna velha e está comendo
  o vão: **o erro é da ARTE, não do roteiro**.
- **`node scripts/probe-f4-visual.mjs`** — os 16 asserts do Bloco A continuam verdes; o `hangar`
  segue fora do modo `interior`.
- **`node scripts/_f4/_medir-colunas.mjs <mesa.png>`** — toda mesa nova passa pela régua ANTES de
  ser instalada. Critério: a largura na faixa do topo alcança a hitbox, como nos props de hoje.
- **`npm run build`** limpo.
- ⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.
- ⚠️ **A sonda NÃO pega a mudança de dificuldade na horizontal.** Ela cobre o vão, não a
  espessura. Isso só o controle na mão julga.

---

## 12. O QUE FICA DE FORA, DE PROPÓSITO

- **As outras fases.** A moldura é da Fase 4. Se ele gostar, as outras herdam em outra fatia.
- **A transição de 600ms do `Parallax.setPintura`.** Continua adiada por decisão dele — e a
  moldura pode aposentá-la, porque uma parede que muda de material enquanto rola é uma transição
  melhor que um fade.
- **A 2ª forma do chefão.** Brainstorm próprio, Bloco B.
- **A calibragem** dos números novos (espessura por trecho) — vai com a calibragem geral do passe
  visual, depois das fatias.

---

## 13. RISCOS

| risco | por que é real | como se descobre cedo |
|---|---|---|
| A faixa contínua come quadros | +1,3 sprite/s (chão + teto a cada 1,52s), permanentes na tela | medir no `probe-stage4`; a fase já roda com props e ondas juntos |
| A emenda entre segmentos aparece | 128px encostados, com textura orgânica | folha de contato com 4 segmentos em fila ANTES de gerar as 14 peças |
| A curva contínua muda a dificuldade | o vão deixa de saltar, e saltar era parte do desafio | é a primeira coisa a julgar com o controle na mão |
| 14 peças é muita arte | 4 rodadas de julgamento, e o gargalo do projeto é julgamento, não orçamento | fazer **a câmara A inteira primeiro** e só seguir depois do OK dele |

---

## 14. A ORDEM DE EXECUÇÃO

⚠️ **Isto não é um plano só.** 14 peças de arte com julgamento dele no meio não cabem numa
execução contínua — e o gargalo deste projeto nunca foi orçamento de geração, foi rodada de
julgamento.

| etapa | o que entrega | termina em |
|---|---|---|
| **M1 — o motor** | a faixa contínua, a curva do vão, a mesa, a trava dos 8px. **Com arte provisória** (o procedural do mock, assado em PNG) | ele JOGA. A pergunta: a curva contínua estragou a dificuldade? |
| **M2 — a câmara A** | as 4 peças da doca engolida, a primeira arte de verdade | folha de contato → ele julga → instala |
| **M3 — a câmara B** | as 4 peças da garganta | idem |
| **M4 — a câmara C** | a faixa grossa, o esfíncter, e as 3 portas (o resto do Bloco C) | idem |
| **M5 — a câmara D** | a faixa da arena | idem |

⚠️ **O M1 vem com arte feia de propósito.** É a única forma de descobrir se a mudança de
GEOMETRIA funciona antes de gastar 14 peças de arte em cima dela. Se a curva contínua estragar o
jogo, o M1 é barato de desfazer; depois do M3 não é.
