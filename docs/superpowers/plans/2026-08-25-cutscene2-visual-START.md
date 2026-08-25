# START — Fatia 4: CUTSCENE 2 (a doca do cinturão)

**✅ FATIA FECHADA (2026-08-25).** 19 commits, revisão ampla da branch aprovada com correções (todas
aplicadas), merge único em `main`. Ver "Fechamento" no fim.

---

## 🔑 COMO RETOMAR (frase de arranque)

A próxima é a **Fatia 5 — Fase 3 (nebulosa → casco → serpente/fusão)**, e ela ainda não tem spec
nem plano. Na próxima sessão, diga:

> **"Leia `docs/superpowers/plans/2026-08-25-cutscene2-visual-START.md` para o contexto do que já
> fechou, e comece a Fatia 5 — Fase 3 — pelo BRAINSTORMING, rumo ao spec. Ainda não há plano,
> então não comece a implementar."**

⚠️ **A pintura da Fase 3 já existe e nunca foi instalada:** `assets/raw/paint-bg-f3-original.png`
(salva em 08/08). Foi exatamente o que aconteceu com a desta fatia — a arte estava lá o tempo todo
e ninguém tinha olhado.

---

## ⚠️ O SPEC E O PLANO DESTA FATIA VIRARAM ARQUEOLOGIA

`2026-08-24-cutscene2-visual-design.md` e `2026-08-24-cutscene2-visual.md` descrevem uma cutscene
que **não existe**. Eles foram escritos antes de o Henrique ver a cena montada, e a partir daí a
direção mudou seis vezes. **O CÓDIGO É A VERDADE.** Este START é o resumo fiel.

O que os dois documentos ainda prometem e que é falso: recorte central da pintura, deriva do céu,
deslize da doca, a arte `906bb897`, ganho ×2.2, feather, o Arauto na pista, `padRim`.

---

## O que a fatia entregou

| | |
|---|---|
| **Céu** | A pintura do Henrique, **alargada para 16:9** (`scripts/alargar-16x9.mjs`) para caber inteira. Estática. |
| **Doca** | Arte NOVA (`c166782d`) — um cais no paredão de um asteroide, colada na borda esquerda, ganho ×1.5, sem feather. |
| **Cena** | **ESTÁTICA.** Sai o deslize da doca, sai a deriva do fundo. Quem chega é a nave. |
| **Chão falso** | Os 33 asteroides ampliados do rodapé foram **apagados** (8 pontos de uso). A doca flutua. |
| **Luzes** | 31 lâmpadas medidas por saturação (24 âmbar, 7 vermelhas), piscando em código, com halo nas 5 mais fortes e facho nas 2 mais fortes. |
| **O achado** | O Arauto pousado na plataforma do meio — a premissa da cena, que até aqui só existia em comentário. |
| **Destruição** | Cadeia remedida contra a doca nova; a nave da vaga morre junto. |

---

## Regras que não se redescobrem (custaram sessão)

### A lição cara desta fatia

**NÃO GERE A ARTE DO CENÁRIO A PARTIR DA PRÓPRIA PINTURA DE FUNDO.**

A 1ª doca (`906bb897`) foi gerada no PixelLab **usando a pintura do céu como referência**. O
PixelLab devolveu uma cópia competente da mesma composição — e **uma cópia da coisa que já está
atrás não funciona como camada da frente.** Diagnóstico do Henrique, verbatim: *"usar duas imagens
sobrepostas e parecidas causa estranheza"*.

Custou **três rodadas tratando sintoma**: esfumar borda, corrigir tom, esconder a lua partida,
centralizar na tela. Nenhuma resolvia, porque o defeito era de CONCEITO, não de acabamento.

A saída foi arte **genuinamente diferente**: uma DOCA contra um CÉU, em vez de uma imagem contra a
cópia dela.

### Arte

- **Feather é remédio para CORTE, não acabamento padrão.** Ele servia à 1ª arte, que era um recorte
  retangular arrancado do meio de uma cena. Arte que já vem com cutout e silhueta próprios **não
  leva** — a rampa de alpha só come as pontas de antenas, cabos e conveses, que é o detalhe que dá
  vida à silhueta.
- **Pintura quadrada numa tela 16:9 só tem três saídas:** cortar, deixar barra vazia, ou alargar.
  `scripts/alargar-16x9.mjs` faz a terceira — e ele **diz na própria cabeça que não é outpainting**:
  é espelho borrado e escurecido, e as laterais são mancha, não arte. O caminho bom é a pintura já
  nascer 16:9.
- ⚠️ **O outpaint do Higgsfield está fora:** plano free, 1,9 créditos, custa 2.
- **Ganho tonal se escolhe em A/B, não no olho isolado.** ×1.0 esconde o convés de pouso; ×2.0
  estoura as plataformas e a doca volta a ser a coisa mais clara da tela — o defeito que matou a
  arte anterior. ×1.5 é o ponto.
- **`normalise()` é a ferramenta errada** para arte esmagada no preto: uns poucos pixels claros
  travam o alongamento. Ganho linear é o que funciona.
- **Uma lua por cena.** A pintura tinha uma, a arte da doca tinha outra, e a cena desenhava o
  `planetShattered` — três. Ele saiu.

### Geometria

- **DERIVAR PAGA DIVIDENDO.** O ponto de pouso nunca foi um número escrito à mão: ele sai da pista
  (`(artToScreenX(PAD_X0) + artToScreenX(PAD_X1)) / 2`). Por isso mover a doca para o centro, e
  depois colá-la à esquerda, **moveu o pouso junto** — cada troca custou UMA constante. Se aquele
  `168` estivesse chumbado no roteiro, teria sido uma caçada.
- ⚠️ **Coordenada de tela escrita à mão é dívida com juros.** A cadeia de explosões caminhava de
  `x=344` até `x=60` — casada com uma doca que deixou de existir. Com a doca nova (`x 0..256`) ela
  detonava a **88px fora**, em céu vazio. As sondas não pegam isso.
- **Âncora de cabo vai na LINHA MEDIDA, não "um pouco acima".** `ANCHOR_LIFT = 12` punha a âncora no
  vão ABERTO entre duas plataformas em balanço, e o cabo nascia no ar. Acima do convés não há
  convés. É zero.
- **O cabo passa POR TRÁS de tudo que ele liga.** Ele era `depth 67` contra `66` das rochas e
  cruzava por cima delas — lia como risco pintado na pedra, não como amarra. Ele é o menor dos
  três: abaixo da rocha e abaixo da doca.

### Código

- ⚠️ **Objeto criado em `create()` tem que MORRER com o que ele decora.** As 31 luzes, os 5 halos e
  os 2 fachos não guardavam referência: a doca afundava e sumia, e as lâmpadas continuavam piscando
  no vazio. A sonda não pegou porque **ela não avançava até a destruição**.
- **Dois doc-comments seguidos: o TypeScript só liga o último.** Reordenar métodos órfãou a
  documentação de `criarLuzes()` e `amarrarRochas()` sem nenhum aviso do compilador.
- **`noUnusedLocals` achou um buraco de DESIGN.** Ele reclamou que ninguém lia o campo `naveDaVaga`
  — e a pergunta "quem deveria ler?" revelou que, se o jogador ESCOLHE a nave da vaga, ela tem que
  sumir de lá. Senão a cena mente.
- **Script de pipeline rejeitado não pode escrever no asset ao vivo.** O `_cut2-doca.mjs` (mantido
  de propósito, o cabeçalho dele é a lição) apontava para `public/sprites/doca-cinturao.png` — uma
  execução acidental trocaria a arte aprovada pela rejeitada, em silêncio.
- **Fonte de arte vai para `assets/raw/` e é COMMITADA.** Enquanto ela vivia num diretório
  gitignorado, a instrução "se a arte mudar, rode o script de novo" era impossível fora de uma
  máquina, e as constantes medidas viravam folclore.

### O padrão da VAGA (reusar nas outras cutscenes)

**Toda cutscene deve mostrar, pousada em algum canto, a nave que ela desbloqueia.** Pedido do
Henrique. Faz sentido narrativo (a nave veio de algum lugar) e fecha de graça o buraco que esta
cena tinha.

Como o róster ainda vai ser rebalanceado e enxugado, a vaga ficou **parametrizada**:
`NAVE_DA_VAGA` / `VAGA_AX` / `VAGA_AY`. **Trocar a nave é editar uma linha.**

O que viaja para outra interlude: (1) a constante da nave, (2) uma posição **medida** na arte
daquela cena, (3) um `Image` — nunca `Sprite`, para não tocar animação por engano, (4) o sumiço em
`escolher()` quando o jogador leva a nave, (5) a morte junto com o cenário quando ele não leva.

---

## Sondas úteis desta fatia

`probe-cut2-visual.mjs` (**nova** — a sonda desta fatia: pintura, doca, escala inteira, chão falso
removido, lua partida ausente, vão das âncoras, cena estática amostrada em dois instantes, luzes
piscando, e a fase de destruição) · `probe-doca.mjs` (**o portão**: a nave pousa NA PISTA e a
corrente entrega a Fase 3) · `probe-chain.mjs`

Scripts de arte: `alargar-16x9.mjs` · `paint-bg.mjs` · `_cut2-doca2.mjs` (o pipeline VIVO) ·
`_cut2-luzes.mjs` · `_cut2-doca.mjs` (o pipeline REJEITADO, mantido só como registro)

---

## Fechamento

Revisão ampla da branch (17 commits na época): **"Pronto para merge, com correções"** — zero
Critical. Os 13 achados foram aplicados: o defeito visível (luzes sobrevivendo à doca), três
comentários que afirmavam coisas falsas, a fonte de arte fora do git, o script rejeitado apontando
para o asset vivo, dois doc-comments órfãos, e sete melhorias menores.

**Fica ABERTO de propósito:** um pedaço de cabo aparece atravessando o vão transparente entre duas
plataformas e parece começar no ar. Investigado: é o cabo da âncora esquerda, que nasce escondido
atrás do convés e reaparece no buraco da estrutura. **A âncora está presa** — é o caminho dela que
cruza um vazio. O Henrique viu e aprovou a cena assim. Se um dia incomodar, o conserto é mover as
âncoras para a metade direita, onde os cabos sobem por céu aberto.

**Dívidas registradas:** o painel de escolha tapa a cena inteira durante a escolha; e não há
ferramenta de vídeo — a sonda fotografa, e beats em movimento (a explosão) só se julgam vendo.
O molde para essa ferramenta existe em `scripts/_ver-cargueiro-mov.mjs`.
