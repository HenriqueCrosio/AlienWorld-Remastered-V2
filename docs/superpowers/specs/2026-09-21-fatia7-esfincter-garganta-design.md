# SPEC — O ESFÍNCTER DA SOLEIRA: A GARGANTA NA COSTURA (2026-09-21)

**A última peça da Fatia 7.** Depois dela: rejogar a fase inteira, atualizar o `docs/HANDOFF.md` e
fechar a fatia com merge `--no-ff` de `feat/fase4-visual` em `main`.

Origem: `2026-09-08-fatia7-moldura-fase4-design.md` §7, a peça `f4VivoC` — *"esfíncter que abre e
fecha na parede; não colide, só respira"*. **Esta spec muda a peça de lugar e de trabalho**, e a
seção 1 diz por quê.

---

## 1 · POR QUE A PEÇA MUDOU DE TRABALHO

A spec de 08/09 escreveu três peças "vivas" — `f4VivoA` (lâmpada piscando), `f4VivoB` (glândula
pingando) e `f4VivoC` (o esfíncter). **Duas foram riscadas em 19/09** (*"risca as 3 primeiras"*), e a
razão foi: *o coração e o maquinário que respiram já pagaram o "vivo"*.

⚠️ **Essa razão vale igual para a C.** Um esfíncter decorativo numa parede que rola morre pelo mesmo
argumento que matou as irmãs — e a Fatia 7 fecharia sem ele sem perder nada.

**O que salva a peça é uma dívida que o jogo já tinha.** Em `StageDirector.ts` a Fase 4 tem, desde
antes das portas existirem:

```ts
{ t: 88, type: 'banner', text: 'ESFÍNCTER FINAL' },
```

Os banners desta campanha ANUNCIAM o que vem (`A GARGANTA APERTA`, `ALERTA · O NÚCLEO`, `SENTINELA DO
CASCO`). Este anuncia um esfíncter — e o que chega em t=94 é a terceira porta, com a mesma arte
rebitada das outras duas. **O texto promete uma coisa e a tela entrega outra.**

E há uma segunda dívida, maior. A Fase 4 abre assim:

```ts
{ t: 0.5, type: 'banner', text: 'O INTERIOR · SEM VOLTA' },
```

**Uma comporta de carne que se fecha atrás de você paga essa frase 109 segundos depois.** Nenhuma
outra peça da fase faz isso.

**A decisão (Henrique, 21/09):** o esfíncter deixa de ser decoração de parede e vira a **última
comporta antes do núcleo** — destrutível, na costura, e o chefão espera. *"Ela vai ficar bem na linha
que separa a arte da borda do duto e começo da arte da borda do núcleo. Não tem problema atrasar um
pouco a chegada do guardião."*

---

## 2 · A PEÇA JÁ EXISTE, E É A DA CUTSCENE DO HANGAR

A criatura é a **GARGANTA** — PixelLab `15f111fd-62c2-4689-9a33-93c931b5b796`, a mesma que engole a
nave na cutscene do hangar (`Interlude3Scene`). Escolha dele: *"podemos reutilizar esse asset, pois
ele pode ser um esfíncter que segura a entrada do núcleo"*.

⚠️ **E ela já é o esfíncter da spec, sem ninguém ter percebido.** A descrição com que ela foi gerada,
semanas atrás:

> *"o anel de dentes **contrai e relaxa** lentamente, a garganta espiral pulsa com um brilho interno
> fraco, os tentáculos vagueiam"*

A spec de 08/09 pediu *"abre e fecha na parede… só respira"*. **É a mesma frase.** A peça que faltava
já estava no disco.

### A rima que a reutilização abre

Na cutscene do hangar a nave passa **pela boca** de uma dessas. Na soleira do núcleo ela encontra
outra e **não passa** — estoura. A mesma criatura cobra duas vezes, de dois jeitos, e o jogador
reconhece a espécie sem que ninguém explique. Pedido dele: *"dessa vez não vai passar pela boca como
na cutscene, vai ter que explodir a criatura para passar"*.

### O que a arte é, medido

`public/sprites/garganta.png` — **97×171** de quadro, **167px de conteúdo** (y 2..168), largura máxima
opaca **82px**. É uma massa vertical com um rasgo aceso no meio: a boca ocupa y **47..122** (76px), em
magenta saturado.

---

## 3 · A CENA

A garganta **É** a costura entre a câmara C (o duto) e a câmara D (o núcleo). Os dois pilares da
junta — `juntaChao` e `juntaTeto`, `JUNTA_ESCALA` 0,8, centrados na emenda — viram o **soquete** dela,
em cima e embaixo. Ela ocupa o meio. Atrás dela, já rolando, o azul do núcleo.

⚠️ **É a mesma gramática da porta**, e não por acaso: a porta é *uma fenda acesa dentro de um soquete
de anéis blindados*. Aqui o soquete é a própria parede, e a peça que ele segura está viva.

```
t≈109,5   o cano quebrado entra pelo teto, À FRENTE dela, jorrando gás
t≈110     ela entra COM a costura, respirando (garganta-idle)
          → o núcleo já está na tela, atrás dela
t≈110–111,5  a nuvem engrossa. Você vê a criatura, vê o gás, e entende
t≈111,5   denso: o PRÓXIMO TIRO acende
          → CLARÃO · o cone dispara para a DIREITA, para dentro do núcleo
          → garganta-morte: as mandíbulas escancaram, a goela chameja
            uma vez e apaga
t≈112–114 o gore — pedaços dela cuspidos para dentro do núcleo
t≈114,5   a passagem está aberta, a tela limpa
t=118     o chefão  (era 113)
```

### A regra do gás — decidida em 21/09

**Qualquer tiro serve.** A nuvem cobre a faixa inteira do corredor, então todo tiro atravessa gás por
construção. O gás existe para a explosão ser plausível e gigante, **não para ser resolvido**. Pedido
dele: *"pensei em algo fácil, mas dinâmico"*.

⚠️ **MAS A NUVEM ENGROSSA ANTES DE ACENDER, e isso não é enfeite.** Num shmup o dedo já está no
gatilho. Se qualquer tiro acendesse no instante em que ela aparece, ela morreria em ~0,2s e o jogador
não veria nada — nem a criatura, nem o gás, nem o motivo. **O acúmulo é o que transforma o tiro numa
espera de ~1,5s em que o jogador sabe o que vem.** A parte dinâmica é a antecipação, não o disparo.

### Se o jogador não atirar

Ela alcança a nave em ~3,5s e **cobra uma vida**, exatamente como as portas — os 1400ms de i-frames do
`damageShip` impedem que a mesma peça cobre duas vezes, e a fase nunca trava. A peça ser fácil não a
torna inofensiva.

---

## 4 · AS PEÇAS — NENHUMA GERAÇÃO NO PIXELLAB

| peça | de onde vem | estado |
|---|---|---|
| a garganta parada | `public/sprites/garganta.png` (97×171) | ✅ já no projeto |
| ela respirando, 11 quadros | `garganta-idle-anim-{0..10}.png` | ✅ já no projeto, anim já registrada |
| ela morrendo, 11 quadros | `garganta-morte-anim-{0..10}.png` | ✅ já no projeto, anim já registrada |
| o cano quebrado | `f4-cano2.png` (39×43) | ✅ já no projeto, **sem tocar** |
| a pluma de gás | **assada** — `_assar-gas.mjs` | ⬜ a fazer |
| o cone do estouro | **assado** — `_assar-cone.mjs` | ⬜ a fazer |
| os pedaços do gore | **assados recortando os pixels DELA** | ⬜ a fazer |

⚠️ **OS TRÊS ASSADOS SEGUEM A LEI MAIS CARA DESTA FATIA:** efeito de cenário se assa em pixel na
resolução nativa, com a paleta do vizinho. A 1ª versão do fim do predador foi feita com `Graphics` em
tempo de jogo e reprovada na hora (*"ficou gerado e sem custos"*); foi refeita assada
(`_assar-fim-f4.mjs`). **O código de cena só toca arte assada.**

⚠️ **O GORE SAI DOS PIXELS DELA, e isso não é economia — é a garantia de paleta.** Recortar os
destroços do próprio sprite é o mesmo princípio do `_assar-porta-nucleo.mjs`, onde o pico do pulso É o
estático: a peça é a fonte da própria luz, então não existe como o destroço destoar da criatura de que
ele saiu. Gerar pedaços novos traria outra paleta e faria o magenta brigar consigo mesmo.

⚠️ **O CANO NÃO PRECISA DE VERSÃO QUEBRADA.** `f4-cano2.png` já pendura de uma placa de teto, com
volante e um risco âmbar de pressão. **Um cano com gás jorrando É um cano quebrado** — a pluma conta a
história inteira, e mexer na peça só acrescentaria uma arte para destoar.

---

## 5 · O MOTOR

### 5.1 · O prop

Um `PropKind` novo, `garganta`, ancorado pelo **centro do vão** (`opts.centroVao`) — o **segundo** prop
`(0.5, 0.5)` da fase, depois da porta.

⚠️ **E AÍ MORAM OS DOIS DEFEITOS QUE A PORTA EXPÔS EM 20/09, e esta peça nasce sabendo deles:**

1. **o estouro sai do CENTRO, nunca de `y − displayHeight/2`.** Essa conta é a dos props ancorados
   pelo pé; num prop de origem `(0.5, 0.5)` ela joga a explosão para cima. Na porta era **56px fora do
   lugar**, e ficou assim desde que a porta existe — nenhuma sonda pegava;
2. **a mordida sai pelo `inerte`, NUNCA pelo `body.enable`.** Prop é movido por velocidade
   (`setVelocityX` no `spawn`); desligar o corpo **congela** o destroço no ar enquanto a parede rola por
   baixo. O `inerte` é o mecanismo que os três overlaps de prop já consultam pelo `TerrainSystem.solido`.

Depth: `TerrainSystem.DEPTH_NA_PAREDE` (−0,65), como a porta — ela invade a banda da parede nas duas
pontas e tem de ler **encaixada DENTRO** da abertura, não colada na frente. Medido em 20/09: as faixas
da F4 são 100% opacas, então a profundidade sozinha esconde.

### 5.2 · A zona de gás

Um overlap **bala × zona**, não um teste de distância. Duas fases:

| fase | duração | o que faz |
|---|---|---|
| **vazando** | ~1,5s | a pluma cresce; tiro atravessa e **nada acontece** |
| **denso** | até acender | o primeiro tiro a tocar a zona dispara a ignição |

A zona acompanha a criatura (rola com o mundo) e morre com ela.

### 5.3 · A morte, em dois tempos

Herda a lei da porta, invertida pela arte: no `garganta-morte` a goela **chameja uma vez e apaga**.

```
tiro na zona densa → ignição
  · a nuvem vira o CLARÃO (a pluma some, o cone entra)
  · garganta-morte toca (11 quadros)
  · o cone assado dispara para a direita
  · a criatura vira inerte AQUI — a passagem abre antes de o gore terminar
+ N ms → os pedaços partem para dentro do núcleo
```

⚠️ **A criatura vira `inerte` na ignição, não no fim da animação.** O jogador atirou e ganhou; fazê-lo
esperar 2,2s de animação para poder passar seria cobrar duas vezes. É a mesma razão do `delayedCall`
da porta — o ponto é agora, o espetáculo é depois.

### 5.4 · O roteiro

| mudança | de | para | por quê |
|---|---|---|---|
| o chefão | `t: 113` | `t: 118` | a cena precisa de ~5s. `t=113` é um número solto: a música do chefão nasce no `spawnBoss`, então ela espera junto — a cena acontece no SILÊNCIO, que é o que o silêncio serve para fazer em todas as fases |
| o banner de t=88 | `'ESFÍNCTER FINAL'` | `'A ÚLTIMA COMPORTA'` | o esfíncter deixa de ser a 3ª porta. O texto passa a descrever o que chega em t=94 |
| banner novo | — | `t≈109,5: 'ESFÍNCTER'` | onde a coisa realmente está |
| o cano + a garganta | — | dois eventos novos na soleira | ver a cena, §3 |

⚠️ **O `entrada: 'emenda'` FICA.** O fade de 1400ms corre por TRÁS dela: ela tapa a costura enquanto
está viva, e quando estoura o núcleo já assentou. **Não se toca no que foi aprovado em 15/09**
(*"a transição suave… não tem aquele impacto seco mais. Foi uma saída barata e eficaz"*).

⚠️ **O `soFundo: true` do núcleo NÃO mata a criatura** — verificado: ele chama
`parallax.limpaCenario`, que apaga o coração, o maquinário e as costelas do FUNDO. Prop de terreno não
é tocado. O pedido de 14/09 (*"retire os maquinários do fundo do núcleo"*) segue respeitado.

---

## 6 · O QUE A ARTE IMPÕE À FASE

⚠️ **Pela TERCEIRA vez nesta fatia, arte com linha forte manda na geometria.** A veia acesa da borda C
obrigou o duto a mudar o ritmo da curva; o núcleo aceso da porta obrigou a peça a ir para trás do layer
da borda. Agora:

**A criatura tem 167px, e o corredor só abre para isso em t≈110.** Medido pelo motor em
`scripts/_f4/_ver-soleira.mjs`:

| t | espessura | corredor | a garganta (167px) |
|---|---|---|---|
| 104 | 54 | 108 | 59px enterrados |
| 106,5 | 50 | 116 | 51px enterrados |
| 107,5 | 42 | 132 | 35px enterrados |
| 108,5 | 34 | 148 | 19px — só a franja |
| **110** | **22** | **172** | **folga de 5px** ← *o pilar entra pela direita* |
| 111,5 | 16 | 184 | folga de 17px ← *o pilar no meio* |

**Por isso o chefão atrasa.** Não é conveniência de roteiro: é a peça cobrando, e preferimos pagar a
reduzir a arte.

### E duas coisas que a posição na costura dá de graça

- **a boca é magenta e o núcleo é AZUL.** Contra a parede vermelha do duto ela sumiria; contra o azul
  do núcleo ela **recorta**. É o mesmo princípio que fez a fenda vertical da porta funcionar contra as
  veias horizontais do duto — pôr ela na costura não é só roteiro, é onde ela é **legível**;
- **o degrau do chão na emenda passa por baixo dela.** Com a criatura cobrindo a costura, o degrau
  nasce escondido. É o mesmo ganho que esconder as pontas da porta deu (21/09): *"as pontas de baixo
  são ângulos mais retos, bom que fiquem escondidas"*.

⚠️ **E a franja enterrada na parede não é um defeito tolerado — é a anatomia certa.** Esfíncter é um
anel PRESO na parede. A borda dela dentro da banda é o que faz ela ser parte do bicho em vez de um
monstro estacionado no corredor.

---

## 7 · SONDAS — E O DISCRIMINADOR É OBRIGATÓRIO

⚠️ **O AVISO MAIS CARO DA SESSÃO DAS PORTAS, e ele vale inteiro aqui.** O assert *"a nave atravessa a
lasca sem dano"* passou sozinho (50 → 50) e quase foi dado como prova. Ao acrescentar o par — *a porta
VIVA TEM de cobrar vida, mesma nave, mesmo lugar* — o teste começou a FALHAR (50 → 49), porque **a nave
parada no meio do duto leva de onda, de bala e de parede**. Um "não aconteceu nada" só vale com o
discriminador do lado.

Os asserts, em pares:

| o que prova | o par que o torna honesto |
|---|---|
| a nave atravessa a passagem aberta sem dano | a garganta VIVA cobra vida, mesma nave, mesmo lugar |
| tiro na nuvem **vazando** não acende | tiro na nuvem **densa** acende |
| a criatura morre com UM tiro pela zona | ela NÃO morre com tiro nenhum se a zona nunca ficou densa |

E os dois asserts que o M1 pagou caro para aprender, obrigatórios em toda peça nova:

- **assert de CHAVE DE TEXTURA** — medir posição não prova que a peça certa está na tela. A mesa nasceu
  com a textura de ERRO do Phaser e as quatro sondas passaram;
- **assert de DIMENSÃO** — 97×171, cravado.

Capturas: `scripts/_f4/_ver-soleira.mjs` (já existe — a soleira antes da peça) e uma nova que fotografe
a cena inteira, da chegada ao gore.

**E a regra que resume tudo: ABRA A IMAGEM.** Três dos cinco achados sérios do M1 só apareceram porque
alguém olhou uma captura, não porque um assert ficou vermelho.

---

## 8 · O TESTE JOGADO — AS PERGUNTAS

Ele joga e corrige depois (*"eu corrijo e dou meu feedback depois de testado"*). As perguntas, e o
conserto de cada uma já escrito:

| # | a pergunta | se a resposta for "não" |
|---|---|---|
| 1 | *a espera do gás engrossando é tensão, ou é tempo morto?* | encurtar a fase "vazando" — é um número |
| 2 | *o estouro parece grande o bastante para o que ela era?* | a escala e a duração do cone assado; **não** clarear |
| 3 | *o gore diz "isso era um bicho", ou lê como estilhaço genérico?* | mais pedaços, ou pedaços maiores recortados dela |
| 4 | *ela recorta contra o azul do núcleo, como a medição prometeu?* | o tint da peça na costura |
| 5 | *o chefão 5s depois ainda chega como chegava?* | o `t: 118` volta para perto de 113 |

---

## 9 · O QUE NÃO SE REFAZ SEM ELE PEDIR

- **a criatura**: é a arte dele, gerada por ele, e já aprovada em cena na cutscene do hangar;
- **as duas animações** (`garganta-idle`, `garganta-morte`): existem, estão medidas (a boca do
  `morte` mede 84px nos quadros 1–3 e despenca para 28px no quadro 8) e são usadas pela `Interlude3Scene`.
  ⚠️ **Mexer nelas mexe na cutscene 3, que está mergeada e aprovada** — a mesma fronteira que o M1
  atravessou quando a faixa da F4 apareceu nas Fases 1, 2 e 3;
- **o `f4-cano2`**: peça aprovada, entra sem tocar.
