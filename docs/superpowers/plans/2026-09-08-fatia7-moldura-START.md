# START — FATIA 7 · A MOLDURA: ONDE A PRÓXIMA SESSÃO PEGA

**🟢 O DESIGN ESTÁ FECHADO E APROVADO POR ELE (08/09/2026).**
**🟢 O M1 — O MOTOR — ESTÁ IMPLEMENTADO E VERIFICADO (09/09/2026).**
**🔴 O M1 AINDA NÃO FOI JOGADO. É essa a próxima ação — ver "O QUE VEM DEPOIS, NA ORDEM".**
Branch `feat/fase4-visual`.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`. O M1 está implementado e
> verificado; eu já joguei. Aqui está o meu veredicto sobre a curva contínua: <DIGA AQUI>.
> Toque o M2 — a câmara A."**

⚠️ **Se ele ainda NÃO jogou, a próxima ação não é código: é ele jogar.** Ver a seção
"🔴 O M1 ESTÁ DE PÉ, MAS NÃO FOI JOGADO", mais abaixo.

---

## ⏭️ A PRÓXIMA AÇÃO, EM UMA FRASE

**ELE JOGA O M1.** O código está pronto e as sondas estão verdes, mas a pergunta que o M1 existe
para responder — *a curva contínua estragou a dificuldade?* — só o controle na mão responde.

⚠️ **Não gere arte nenhuma antes disso.** Se a geometria estiver errada, o M1 é barato de desfazer;
depois do M3, com 8 peças de arte em cima dela, não é.

---

## 📖 O QUE ACONTECEU NESTA SESSÃO, EM ORDEM

1. **A sessão abriu para instalar a "lamina larga"** (Task 4 do Bloco A). 12 gerações, e a régua
   provou que nenhuma servia: alargar a base alarga a textura, a hitbox vai junto e a ponta
   continua fina. A melhor delas matava **46px no vazio**.
2. **Ele parou tudo:** *"sinto que são assets jogados na cena"*, e pediu impacto de shmup AAA na
   última fase.
3. **Brainstorm.** Ele apontou quatro coisas: qualidade dos assets, **posicionamento sem nexo**,
   estilo, e vontade de tentar cenário "vivo". Escolheu composição **mista** (momentos autorados +
   miolo com gramática).
4. **Achei a causa raiz no código** — não é impressão, é `GameScene.ts:859`: cada par de colunas
   sorteia um `vaoY` NOVO, então duas colunas seguidas não têm relação nenhuma.
5. **Ele propôs a moldura:** *"talvez colocar uma moldura em volta, como se fossem paredes?"*
6. **Pesquisa de montagem de cenário** (Metal Slug, composição, legibilidade de shmup) → as
   fontes estão na spec, seção 3.
7. **Mock procedural** em 4 faixas sobre a `bg-a`. Veredicto dele: *"o 2 ficou muito bom, trouxe
   preenchimento. E a número 4 é exatamente o que eu pretendo na hora do duto."*
8. **Spec escrita, revisada e commitada** (`15794c0`).
9. **Divisão de trabalho decidida por ele:** as 4 faixas são dele; as 10 restantes, minhas.
10. **Ele gerou as 4 faixas no PixelLab** — e a régua reprovou as 64 candidatas por ferramenta
    errada. Regerei as 4 como imagem cheia: passaram na estrutura, falharam no valor.
11. **A lei do valor virou número** e foi corrigida na spec (`f40c90a`).

---

## ✅ O DESIGN, EM CINCO LINHAS

- O chão e o teto viram uma **faixa contínua** desenhada, rolando com o mundo.
- O obstáculo deixa de ser prop sorteado e vira **a parede avançando** — uma **mesa de topo chato**.
- ⚠️ **A faixa é DECORAÇÃO, sem colisão.** Quem colide é a mesa, com a mesma `alturaPx` de hoje.
  Por isso a linha de base `[110,110,110]` sobrevive e **nenhuma física nova entra**.
- A **espessura** da faixa cresce ao longo da fase (16 → cheia): as paredes fecham em você.
- Cada uma das **quatro câmaras** tem seu jogo de peças, trocado pelo evento `cenario` que já
  existe (t=40 / 68 / 82).

**A spec inteira:** `docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md`.

---

## 🔴 AS DUAS DECISÕES ABERTAS — ELE PRECISA RESPONDER

### 1. A REPETIÇÃO DA FAIXA

384 ÷ 128 = **3 cópias idênticas na tela ao mesmo tempo**, e o olho pega. A `B` e a `C` são as
piores (o motivo lê como papel de parede). No jogo a repetição vira temporal, mas o mesmo desenho
volta a cada **1,5s**.

| saída | custo |
|---|---|
| **duas variantes por câmara**, alternadas | dobra a arte dele; mata a repetição |
| **uma variante mais neutra** — menos motivo, mais textura | repete igual, mas não se denuncia |

### 2. QUEM PINTA AS FAIXAS, DE FATO

Ele quis as 4 faixas para si. As quatro geradas estão no disco, com valor corrigido, prontas para
ele pintar por cima — **mas nenhuma foi aprovada por ele ainda**.

---

## 🗂️ A DIVISÃO DAS 14 PEÇAS — decidida por ele em 08/09

**Critério:** não é difícil × fácil. É **o que uma máquina consegue acertar**. Máquina acerta
restrição mecânica (topo chato, 6 quadros, silhueta); não acerta mão.

**DELE — 4 peças:** `f4FaixaA` (128×64), `f4FaixaB` (128×64), `f4FaixaC` (128×80),
`f4FaixaD` (128×64). São a moldura inteira, ficam 100% do tempo na tela e têm de ser da mesma mão
dos quatro fundos.

**MINHAS — 10 peças:** `f4MesaA1/A2/B1/B2` (a régua reprova sozinha o que mentir na hitbox),
`f4VivoA/B/C` (32×32 a 48×48, animadas), `f4PortaC` + destruída, `f4Veu1/Veu2`.

---

## ⚠️ AS LEIS QUE ESTA SESSÃO DESCOBRIU OU CORRIGIU

| lei | onde doeu |
|---|---|
| ⚠️ **"Bem grande" tem de ser largo NA PONTA, não na base** — a hitbox é retângulo de altura cheia com 60% da largura da TEXTURA, e é na ponta que o jogador passa | a lamina alargada: 103px de textura, 10px de desenho no topo, **46px de morte invisível** |
| ⚠️ **Mais contraste ≠ mais claro.** A média da faixa fica em **1,3×** a da pintura; quem sobe é o contraste INTERNO | as 4 faixas nasceram de **1,55× a 4,06×** mais claras que os próprios fundos |
| ⚠️ **`create_1_direction_object` é a ferramenta ERRADA para parede** — ela recorta um objeto do fundo, e parede precisa do oposto. Parede é **imagem cheia** (`no_background: false`) | das 64 candidatas geradas por ele, **nenhuma** encostava nas três bordas |
| ⚠️ **Objeto custa ~25 gerações; imagem cheia custa 1** — porque objeto devolve 16 candidatas | 99 gerações nas 4 dele contra 4 nas 4 minhas |
| ⚠️ **O gerador puxa para o AZUL-FRIO** com "dark sci-fi / alien hull" no prompt, e azul na F4 é corpo estranho | as 6 primeiras laminas; o prompt precisa de `bone white / rust orange / NO blue` |
| **"Sem nexo" era um fato do código, não uma impressão** | `GameScene.ts:859` — `vaoY` sorteado por par |

---

## 🧰 O FERRAMENTAL NOVO — tudo versionado em `scripts/_f4/`

| script | o que responde |
|---|---|
| `_medir-colunas.mjs` | **de uma MESA:** onde esta arte mata sem desenhar? Imprime sempre os 3 props de hoje como referência |
| `_medir-faixas.mjs` | **de uma FAIXA:** sangra nas três bordas? topo reto? quanto a emenda aparece? |
| `_valor-faixa.mjs` | reaplica o acerto de valor de uma faixa contra a pintura da câmara |
| `_folha-faixas.mjs` | as 4 faixas no enquadramento real, cru contra corrigido |
| `_mock-moldura.mjs` | o mock procedural que ele aprovou — **e a fonte da arte provisória do M1** |
| `_folha-lamina.mjs` | a folha mista (da Task 4 morta; a geometria dela ainda serve) |

⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore:40`). Os PNG existem **só neste
disco** — um `git clean` apaga e não há de onde restaurar. Os `.mjs` estão versionados.

**Os arquivos que importam no disco:**
`_faixa-{A,B,C,D}.png` (cru) e **`_faixa-{A,B,C,D}-v.png` (valor corrigido — é daqui que vale
pintar por cima)**. Mais `_folha-faixas.png`, `_mock-moldura.png`, `_folha-lamina.png` e o
material morto da Task 4 (`_col-1..10`, `_lam-A..K`).

---

## 🧹 UMA LIMPEZA PENDENTE NO PIXELLAB

Os 4 objetos que ele gerou continuam em `review:awaiting-selection` — eles seguram slot e
poluem a listagem. Se ele confirmar que não quer nenhuma das 64 candidatas,
`dismiss_review(object_id=...)` em cada um:

| câmara | object_id |
|---|---|
| A | `be88daa1-175e-4e5e-b794-557d762c6c7f` |
| B | `0884adc1-2a87-42e6-947f-ecc476ddac9c` |
| C | `b9771d81-d557-4679-825c-eb3cbb2fadf3` |
| D | `0dcb4148-4bd4-4779-8d57-c0bca6fa723e` |

---

## O QUE VEM DEPOIS, NA ORDEM

```
M1 — O MOTOR              ✅ CÓDIGO PRONTO E VERIFICADO (09/09) · 🔴 FALTA O TESTE JOGADO DELE
  a faixa contínua, a curva do vão, a mesa, a trava dos 8px — com arte provisória.
  Plano: docs/superpowers/plans/2026-09-09-fatia7-m1-motor-moldura.md
  └ A PERGUNTA QUE AINDA NÃO TEM RESPOSTA: a curva contínua estragou a dificuldade?
M2 — A CÂMARA A           ⬜ ◄ PEGUE AQUI (depois que ele jogar) · as 4 peças da doca engolida
M3 — A CÂMARA B           ⬜ a garganta
M4 — A CÂMARA C           ⬜ a faixa grossa, o esfíncter, e as 3 PORTAS (o resto do Bloco C)
M5 — A CÂMARA D           ⬜ a faixa da arena
BLOCO B — O CHEFÃO        ⬜ INALTERADO pela moldura, e ainda de pé
```

### 🔴 O M1 ESTÁ DE PÉ, MAS NÃO FOI JOGADO

O código está completo e verificado (build limpo · `probe-f4-moldura` 19/19 · `probe-stage4` 22/22
com `vaos:[110,110,110]` · `probe-f4-visual` 17/17 · a régua da mesa honesta). **Nada disso responde
a pergunta do M1.** Ela é do controle na mão:

> **A curva contínua estragou a dificuldade?** O vão parou de saltar, e saltar era parte do desafio.

Para jogar: `npm run dev` → `http://localhost:5173/` → tecla **`L`** (vai direto para a Fase 4).
Se ficou monótono, o knob é **um só**: `Moldura.PASSO_MAX` (hoje 14). Se ficou injusto, o mesmo
número para baixo. As outras quatro coisas para olhar estão na Task 6 do plano do M1.

⚠️ **A arte é provisória e feia de propósito**, com dois defeitos já conhecidos que **não são do
motor**: a mesa lê mais CLARA que a parede (inverte a leitura de plano) e a faixa fica escura
demais nos trechos grossos. Os dois são distribuição de valor da peça, e a arte do M2 resolve.
**Julgue a geometria e o ritmo; a beleza não está em jogo aqui.**

### ⚠️ AS DUAS LEIS QUE O M1 PAGOU CARO PARA APRENDER — valem para o M2–M5

**1. Toda peça de arte precisa de assert de CHAVE DE TEXTURA e de DIMENSÃO.** Medir a posição não
prova que a peça certa está na tela. A mesa nasceu com a textura de ERRO do Phaser (a chave foi
registrada como `f4Mesa` enquanto o `PropKind` se chamava `mesa`), a hitbox virou 32×32 em vez de
96×112 — o obstáculo praticamente deixou de existir — e **as quatro sondas passaram**. A linha de
base `[110,110,110]` é cega para isso *por construção*: o vão é calculado a partir do mesmo número
que posiciona a peça, então os termos se cancelam. ⚠️ **A chave da arte de um prop É o nome do
`PropKind`** (`pickVariant(scene, kind)`), e é assim que `mesa2`/`mesa3` entram de graça no M2.

**2. Toda mudança em código COMPARTILHADO exige olhar as fases que não são a sua.** A faixa da F4
estava sendo desenhada nas Fases **1, 2 e 3** — uma tira opaca e acesa no rodapé de três fases já
mergeadas e aprovadas jogando. É a mesma fronteira que o `TerrainSystem.updateTurret` já cravou
como regra, atravessada na direção contrária. **Nenhuma sonda pegaria**: as quatro cobrem a F4.

**E a regra que resume as duas: ABRA A IMAGEM.** Três dos cinco achados sérios desta etapa só
apareceram porque alguém olhou uma captura, não porque um assert ficou vermelho.

### 📌 EM ABERTO PARA O M2, decidir ANTES de gerar arte

- **Como a arte troca por câmara.** O M1 entregou **um** `PropKind` só (`mesa`), e o plano diz que
  M2–M5 trocam só a TEXTURA. Mas a spec de 08/09 nomeia as peças como `f4MesaA1/A2/B1/B2`. Com um
  kind só, trocar por câmara exige decidir: `setTexture` no spawn conforme a câmara, ou kinds
  separados? ⚠️ Seja qual for, ela esbarra na **lei 1** acima.
- **O atalho de dev `G`** (pula pro chefão numa partida ao vivo) descarta os eventos entre o
  instante atual e o `bossTime` — apertar `G` em t=10 luta com parede de 16px em vez de 54. O
  modo treino já foi consertado; o `G` não. ⚠️ A `probe-stage4` **usa o `G`**, então a luta que
  ela testa não é a luta final real.
- **O relevo da faixa é CORTADO, não deslocado** (`Math.min` em `Moldura.gerar`). A partir de
  espessura 44 ele começa a ser aparado, e em 54 (t≈68 até o fim) é exatamente **0**: a parede
  vira régua reta justamente no clímax. Não é defeito — mas é a explicação se o duto parecer
  "morto" no teste jogado.

⚠️ **O Bloco B não foi tocado** e continua com tudo o que estava pronto: a arte nova do guardião
em `assets/raw/anim-guardiao-novo/`, a idle aprovada, a morte que precisa ser composta no motor, e
o aviso de que `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y` **têm que ser remedidos** porque a arte nova é
256×256 contra 256×227. Detalhe no START antigo, seção "O QUE JÁ ESTÁ NA MÃO PARA O BLOCO B".

---

## ⚰️ O QUE MORREU NESTA SESSÃO

- **A Task 4** (as colunas novas). As 10 candidatas de 07/09 e as 12 de 08/09 ficam no disco como
  estudo. **Nenhuma é instalada.**
- **O `sorteiaKind`** (`GameScene.ts:869`) e **o `vaoY` sorteado** (`GameScene.ts:859`) — morrem
  no M1.
- **O Bloco C perdeu as paredes contínuas** para a fase inteira; ficou só com as 3 portas.

---

## 📌 A LINHA DE BASE — não perca este número

```
corredores {"chao":3,"teto":3,"vaos":[110,110,110]}
```

`node scripts/probe-stage4.mjs`. Depois do M1 tem de devolver **exatamente** isto. Se mudar, a
mesa nova está comendo o vão — **o erro é da ARTE, não do roteiro**.

⚠️ **A sonda NÃO pega a mudança de dificuldade na horizontal nem a curva contínua.** Ela cobre o
vão, não a espessura nem o ritmo. Isso só o controle na mão julga — e é por isso que o M1 termina
com ele jogando.

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**, em dia com o `origin`. `main` está em `f417c0e` com a Fatia 6
mergeada. `origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

Os commits desta sessão:

| commit | o que |
|---|---|
| `603f538` | (da sessão anterior) o julgamento das dez colunas |
| `15794c0` | a spec da moldura + as réguas + o mock |
| `f40c90a` | a lei do valor virando número + a régua da faixa |

**PixelLab:** **4.679** de 5.000, ciclo virando em 2026-10-04. Consumo do dia: 115 (99 nos 4
objetos dele, 16 nas gerações minhas). ⚠️ Confira o saldo no arranque antes de gastar.
