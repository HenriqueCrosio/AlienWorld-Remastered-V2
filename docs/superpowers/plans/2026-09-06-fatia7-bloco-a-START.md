# ⛔ ESTE DOCUMENTO FOI SUPERADO EM 08/09/2026

**A porta de entrada agora é
[`2026-09-08-fatia7-moldura-START.md`](2026-09-08-fatia7-moldura-START.md).**

A **Task 4 (as colunas novas) morreu.** Ela foi substituída pela MOLDURA — a faixa contínua de
chão e teto, decidida com ele em 08/09 e especificada em
`docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md`.

**O que ainda vale aqui, e só isto:**

- ✅ o registro do Bloco A aprovado no teste jogado (os 4 fundos, a saída do `hangar`, o evento
  `cenario`) — a parte de cima deste documento;
- ✅ a seção **"O QUE JÁ ESTÁ NA MÃO PARA O BLOCO B"** — o guardião novo continua de pé, intacto;
- ✅ a linha de base `[110,110,110]`.

**O que NÃO vale mais:** tudo que fala em escolher, gerar ou instalar coluna sorteada.

---

# START — FATIA 7 · BLOCO A: ONDE A PRÓXIMA SESSÃO PEGA

**🟢 O BLOCO A PASSOU NO TESTE JOGADO (07/09/2026).**
**🔴 A TASK 4 (as colunas) está PARADA NO PASSO 7, esperando o julgamento dele.**
Branch `feat/fase4-visual`.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-06-fatia7-bloco-a-START.md`. A lamina larga já foi
> gerada e a folha já está montada. A Task 4 está parada no Passo 7 esperando meu julgamento
> de `scripts/_f4/_folha-lamina.png`."**

---

## ⏭️ A PRÓXIMA AÇÃO, EM UMA FRASE

**Nenhuma — a bola está com ele.** Abrir `scripts/_f4/_folha-lamina.png` e responder:
**o feixe de osso (`_lam-K-feixe`) convive com `costela`/`orgao`/`maquinario`, ou continua não
sendo bom?**

Com a resposta, o **Passo 8** instala (`BootScene` + o `sorteiaKind` de `GameScene.ts:869`
passando a saber em que trecho da fase está) e re-mede os vãos. Sem ela, nada é instalado.

### O que a sessão de 08/09 fez — 12 gerações, ZERO instaladas

| | |
|---|---|
| **`_lam-K-feixe.png`** | a candidata que sobrou: feixe de lâminas de OSSO, coroa larga, brasa entre as lâminas. 70px de largura contra os 44px da 6 original (**+59%**), **honesta na ponta** e da família quente dos três de hoje |
| `_lam-E-vela.png` | a alternativa grande (107px) e AZUL — está na folha só para ele ver o que a cor errada faz mesmo com o tamanho certo |
| `_medir-colunas.mjs` | a régua de honestidade, versionada: mede na altura real do jogo, depois do aparo, com os três de hoje sempre impressos como referência |
| `_folha-lamina.mjs` | a folha MISTA, no vão da parte LARGA (110/96), não no aperto de 76 |

---

## ✅ O VEREDICTO DO BLOCO A — 07/09/2026, com o controle na mão

> *"Os 3 fundos trocados deram uma boa dimensão de profundidade e atmosfera para a fase, a
> transição ainda está seca e repentina, mas isso vamos organizar no decorrer das fatias."*

| pergunta | resposta |
|---|---|
| **1. Parece estar dentro do bicho?** | ✅ **SIM.** A queixa que abriu a fatia está respondida pelo FUNDO. |
| **2. Dá para achar o vão de relance?** | — não julgada; ele já sabia que as colunas não mudaram. É a **Task 4**. |
| **3. Estreitamento ou corte?** | ⚠️ **Corte.** "seca e repentina" — **ADIADA POR DECISÃO DELE**, não esquecida. |

⚠️ **NÃO mexa no `durationMs` de 600ms do `Parallax.setPintura` sem ele pedir.** A transição volta
junto com o **Bloco C**, onde uma passagem que o jogador ATRAVESSA pode aposentar o fade. Afinar o
número agora é afinar algo que o Bloco C pode jogar fora.

---

## 🎨 A TASK 4 ATÉ AQUI — 10 colunas geradas, ZERO instaladas

Duas rodadas no PixelLab, duas folhas de contato (`scripts/_f4/_folha-colunas-forma.png` e
`_folha-colunas-contraste.png`, ambas abrindo com a faixa **HOJE** como controle).

### O veredicto dele, na íntegra

> *"Eu ainda acho que não ficou bom, mas podemos tentar o N 6 bem grandes em conjunto com o que já
> temos hoje em dia. Mas isso vai ficar para as primeiras partes da fase, quando o duto ficar
> estreito, vai ser outros assets criados."*

| | |
|---|---|
| **NÃO é** | trocar `costela`/`orgao`/`maquinario` pela arte nova |
| **É** | a **6 (lamina)**, **bem grande**, entrando no sorteio **JUNTO** com os três de hoje |
| **E SÓ** | na parte **LARGA** da fase — o duto estreito ganha assets PRÓPRIOS, no **Bloco C** |

⚠️ **Essa última linha é fronteira nova, cravada por ele — o plano não tinha.** A coluna larga e a
coluna do aperto deixaram de ser o mesmo problema.

⚠️ **Consequência para o `sorteiaKind` (`GameScene.ts:869`):** ele passa a ter de saber **em que
trecho da fase está**. Hoje sorteia entre três nomes, sem noção de tempo.

⚠️ **"BEM GRANDE" SÓ TEM UM EIXO LIVRE.** A altura é cravada pelo roteiro (`alturaPx`) e a escala
é UNIFORME (`TerrainSystem.ts:278`) — a única forma de a lamina ter a presença dos assets de hoje
(102–119px de largura a 110 de altura) é a **TEXTURA NASCER MAIS LARGA**. A 6 atual dá 48px: um
palito ao lado dos de hoje.

---

## 🔴 A LEI QUE O 08/09 DESCOBRIU — E QUE CUSTOU 3 GERAÇÕES PARA APARECER

**"BEM GRANDE" TEM DE SER LARGO NA PONTA, NÃO NA BASE.**

A primeira tentativa de alargar a lamina acertou os 110px pedidos engordando a BASE — e piorou o
jogo. A hitbox é um retângulo de **altura cheia** com 60% da largura da textura, e é na altura da
**ponta** que o jogador passa. Resultado: 103px de textura, hitbox de 62px, e 10px de desenho lá
em cima — **46px de morte invisível**, o dobro da candidata 7 que o Passo 4 já tinha reprovado.

⚠️ **O alvo não é "110px de largura". É "a largura na faixa do topo alcança a hitbox"**, como nos
três props de hoje. Quem mede isso agora é `node scripts/_f4/_medir-colunas.mjs <arte.png>`.

**E a segunda:** com "dark sci-fi / alien hull" no prompt, o gerador puxa para o **azul-frio**, e
azul no quadro da F4 é corpo estranho — tudo que é vivo ali é osso, brasa e latão. O prompt tem de
dizer `bone white / rust orange / ember / NO blue`. É o aviso da paleta forçada visto do outro
lado: **forçar a paleta do fundo camufla; ignorar a família de cor expulsa.**

---

## ⚠️ AS MEDIDAS QUE VALEM MAIS QUE AS DEZ ARTES

A tabela completa das 10 candidatas está no plano. O que ela ensinou:

**1. A HITBOX SAI DA LARGURA DA TEXTURA, NÃO DO DESENHO** — `TerrainSystem.ts:307`,
`body.setSize(p.width * 0.6, ...)`. Onde o desenho é mais estreito que a textura, **o jogador
morre no vazio**: a candidata 7 desenha 6px e mata em 29 — 23px de colisão invisível. Das dez, só
a **6**, a **1** e a **9** são honestas.

**2. PIXEL TRANSPARENTE NA BASE = COLUNA FLUTUANDO.** A origem é a base da TEXTURA, então padding
embaixo vira ar entre a coluna e o chão. Só a 7 e a 9 encostam.

⚠️ Os dois são defeito **técnico de recorte**, não gosto: **aparar e recentrar a textura na
largura do desenho conserta os dois de uma vez** — faça isso na lamina larga antes de qualquer
outra coisa.

**3. A FASE FICA MAIS FÁCIL NA HORIZONTAL — e isso é decisão dele.** A hitbox cai de **71px para
29px**. O vão VERTICAL não muda, então a `probe-stage4` continua devolvendo `[110,110,110]` e **a
sonda NÃO pega esta mudança**. A sonda cobre o vão, não a espessura.

**4. PALETA FORÇADA DO FUNDO É CAMUFLAGEM.** A rodada 1 passou `color_image_base64` com um recorte
da `paint-bg-f4-a.png`: a FORMA saiu certa de primeira, mas a coluna ficou DA COR DA PINTURA e
some no quadro. O prop precisa da **família** de cor do fundo, não do **valor** dele. A rodada 2
largou a paleta forçada e ganhou legibilidade.

---

## 📌 A LINHA DE BASE — não perca este número

```
corredores {"chao":3,"teto":3,"vaos":[110,110,110]}
```

`node scripts/probe-stage4.mjs`, medido ANTES de qualquer troca de arte. Depois de instalar coluna
nova a sonda tem de devolver **exatamente** isto. Se mudar, a arte nova é mais justa que a velha e
está comendo o vão — **o erro é da ARTE, não do roteiro**.

---

## 🗂️ O QUE ESTÁ NO DISCO

**Commitado** — os 3 commits do Bloco A:

| commit | o que |
|---|---|
| `d26cf3f` | as 4 pinturas dele reduzidas para **384×216** e registradas no `BootScene` |
| `d3ab618` | o **`hangar` saiu** do modo `interior` e a pintura entrou no lugar (a `nebula3` saiu junto) |
| `d0a1a65` | o evento **`cenario`** no roteiro: as câmaras trocam em t=40 / 68 / 82 |

**Verificado, não presumido:** `probe-f4-visual` (16 asserts) verde, `probe-stage4` de ponta a
ponta verde, `probe-interlude3` verde, `npm run build` limpo.

**Da Task 4** — em `scripts/_f4/`, tudo com `_` na frente (material de trabalho, não entra no
jogo): `_col-1..10-*.png` (as dez candidatas), `_folha-colunas.mjs` (o gerador das folhas — a
geometria dele é COPIADA de `spawnCorredores` + `TerrainSystem.spawn`, não inventada),
`_folha-colunas-forma.png`, `_folha-colunas-contraste.png`, `_paleta-f4a.png` e `_paleta.b64`.

⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore:40`). As dez candidatas e as duas
folhas existem **só neste disco** — um `git clean` as apaga e não há de onde restaurar. Os
`.mjs`/`.b64` estão versionados; os PNG, não.

⚠️ **A fronteira intacta:** o `hangar.png` continua **160×160 byte por byte** e a cutscene final
segue usando o mesmo arquivo. A sonda cobra `usamHangar = 0` no interior.

⚠️ **Risco de hitbox no que já entrou: ZERO.** Nenhum número de `corredor`, `hazard` ou `wave` foi
tocado. Se a `probe-stage4` cair, o erro é de render, não de geometria.

---

## O QUE VEM DEPOIS, NA ORDEM

```
BLOCO A — O LUGAR          ✅ APROVADO no teste jogado (07/09)
  └ Task 4 (as colunas)    🔴 PARADA no Passo 7 — a folha `_folha-lamina.png` espera ele  ◄ AQUI
  └ a transição (600ms)    ⏸ ADIADA por ele — volta junto com o Bloco C
BLOCO B — O CHEFÃO         ⬜ a arte nova do guardião + a posição no alto-direita
  └ e o BRAINSTORM da 2ª forma, com a arena já na tela
BLOCO C — O DUTO           ⬜ paredes contínuas + as 3 portas (aqui mora a hitbox)
  └ os assets do APERTO     ⬜ fronteira nova dele: o duto estreito tem arte PRÓPRIA
  └ e a TRANSIÇÃO adiada    ⬜ a passagem atravessada pode aposentar o fade
```

**Spec da fatia inteira:** `docs/superpowers/specs/2026-09-06-fatia7-fase4-design.md`.
**Plano do Bloco A:** `docs/superpowers/plans/2026-09-06-fatia7-bloco-a.md`.

---

## O QUE JÁ ESTÁ NA MÃO PARA O BLOCO B

**A arte nova do guardião, dele, já baixada** em `assets/raw/anim-guardiao-novo/`:
`estatico.png`, `idle-0..8`, `morte-0..8` e `destruido.png`. PixelLab
`9436240c-c69c-49a6-a75f-5eb8e57850d6`.

- A **idle** está aprovada — o miolo esquenta até um branco-amarelo e volta a apagar.
  ⚠️ **Mas nos quadros 6–8 ele apaga quase por completo, e esse miolo É O ALVO.** Alvo que some
  metade do ciclo é coisa de julgar com o controle na mão.
- A **morte**: a primeira (dele) falhou porque a silhueta nunca muda — o casco fica intacto e o
  que "explode" é luz por dentro. A segunda (gerada em 06/09, prompt nomeando a quebra)
  **melhorou o fim** — vira carcaça oca com destroços — **mas o grosso da silhueta continua
  inteiro**. Duas tentativas convergiram no mesmo limite do gerador.
  **A saída proposta, para ele decidir:** compor a morte no motor — a animação nova rodando com
  as explosões que o jogo já usa em todo chefão por cima, e o quadro final sendo o
  `destruido.png`, que é o único em que a silhueta realmente quebra.
- ⚠️ A arte nova é **256×256** contra os 256×227 de hoje: `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y`
  **têm que ser remedidos**. Trocar a arte OBRIGA a remedir — é a lei que o próprio `BootScene`
  escreve sobre este asset.

---

## AS LEIS QUE ESTA FATIA CONFIRMOU OU DESCOBRIU

| lei | onde doeu |
|---|---|
| ⚠️ **Fundo pintado: assado em 384×216, escala 1. REDUZIR pode, AUMENTAR nunca** — é a grade de pixel casando com a da tela que dá a PROFUNDIDADE | ele cravou em 06/09; o instalador RECUSA ampliar |
| ⚠️ **A hitbox de um prop de cenário sai da LARGURA DA TEXTURA, não do desenho** | as 10 colunas, 07/09 — 23px de morte invisível na pior delas |
| ⚠️ **Paleta forçada do fundo camufla o prop** — passe a FAMÍLIA de cor, não o VALOR | a rodada 1 das colunas, 07/09 |
| **A sonda espera por ESTADO, e o nome do estado se CONFERE** | `s.stageTime` não existe; a espera "por estado" virou relógio cego e os 4 primeiros quadros saíram todos já no chefão. O campo é `s.elapsed` |
| **`boss.forma` já é verdade enquanto o chefão VOA para dentro da tela** — `damage()` nesse estado é ignorado em silêncio. Espere por `!boss.entering` | ao capturar a 2ª forma, 06/09 |
| **Documento escrito na frente do fato vira mentira se a sessão cair** | o HANDOFF afirmava "empurrada para origin" antes do push existir |
| **Arte que o Henrique fez não se corrige sem perguntar** | segue valendo |
| **Gerar arte e instalar sem ele ver custou 40 gerações na Fatia 6** | a Task 4 termina numa FOLHA, não num merge |

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**. `main` está em `f417c0e` com a **Fatia 6 mergeada**.
`origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

**PixelLab:** ~4.782 de 5.000 no ciclo que vira em 2026-10-04 (a Task 4 gastou 10 em 07/09 e
mais 12 em 08/09). Confira o saldo no arranque antes de gastar.
