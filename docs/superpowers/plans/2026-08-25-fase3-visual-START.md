# START — Fatia 5: FASE 3 ("O CASCO")

**🟡 FATIA EM ANDAMENTO.** Tasks 1, 2 e 3 implementadas e commitadas na branch
`feat/fase3-visual` (4 commits). **A Task 4 NÃO rodou** — não há regressão final, não há merge, e a
branch segue de pé. `main` continua em `ee4e2a0` (a Fatia 4).

A sessão parou aqui de propósito, a pedido do Henrique: **a próxima sessão começa com ELE testando
o que já entrou**, e os ajustes saem desse teste.

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está em andamento
> na branch `feat/fase3-visual`, com as Tasks 1–3 feitas e a 4 pendente. Eu vou testar a Fase 3
> primeiro (`[M]` no menu) e te dizer o que ajustar; só depois seguimos para a Task 4."**

⚠️ **NÃO comece pela Task 4.** Ela é o fechamento (luz condicional, regressão, START, merge), e
fechar antes do teste humano é fechar sobre arte que ainda pode mudar.

⚠️ **NÃO re-despache as Tasks 1–3.** Elas estão commitadas. Ver o ledger em
`.superpowers/sdd/progress.md`.

---

## O que testar, e como

O dev server sobe com `npm run dev` (porta 5173). No menu:

| Tecla | O quê |
|---|---|
| **`M`** | Entra direto na **Fase 3** — é o que interessa |
| `N` | Treino da **serpente** (as 4 formas) |

A linha do tempo da fase, para saber o que olhar quando:

| t | O quê |
|---|---|
| 0–21s | Ato 1 dentro da nuvem, agora com a **pintura** no lugar do procedural dourado |
| **21s** | **O casco começa a se anunciar** — a nuvem afina 25% e a estrutura aparece por baixo |
| 42s | A virada: a nuvem abre, o casco assume (e o planeta reaparece junto) |
| 53s | A aranha |
| 88s | A serpente |

---

## As DUAS perguntas que estão esperando o seu olho

**1. As garras pálidas da arte nº 4 puxam o olho?** Era a suspeita nomeada no próprio spec — a
única das sete artes com cor de osso, e o pálido dominante já derrubou duas levas de casco antes.
Nas capturas ela aparece no canto inferior direito do Ato 2. Se incomodar, **a saída é uma linha**:
apagar `public/sprites/casco-detalhe4.png` (as variantes restantes assumem sozinhas, o
`pickVariant` não precisa de nada).

**2. O casco está claro demais contra o Ato 2?** A luminância medida da família é 0,142–0,176 —
escura em absoluto, mas a cena em volta é ainda mais escura. Se pesar, o conserto é tint escuro
nas duas camadas (`buildNebula()`), **nunca** um tint claro.

Uma terceira que **já se resolveu**: o `0.75` da revelação em t=21 está certo. Com a arte velha o
anúncio era invisível; com a nova, dá para ver a estrutura fantasma sem conseguir lê-la — que é
exatamente o critério.

---

## O que as Tasks 1–3 entregaram

| Commit | O quê |
|---|---|
| `876753d` | **A pintura da nebulosa** substitui a camada procedural mais profunda. Véus em `alpha 0.24`. |
| `6dde782` | A pintura sai do empate de profundidade com o planeta (`−97` → `−96`). |
| `8538007` | **O casco se anuncia** em t=21 (`{ t: 21, type: 'nebula', density: 0.75 }`). |
| `bebda41` | **As sete artes do casco**, em duas camadas: base lisa + pontuação. |

**Estado das revisões:** Tasks 1 e 2 revisadas e aprovadas (a 1 com um Important corrigido).
⚠️ **A Task 3 NÃO foi revisada** — a sessão fechou antes. A revisão dela, ou a revisão ampla da
branch, ainda deve acontecer antes do merge.

---

## Regras que não se redescobrem (custaram sessão)

### Método

- ⚠️ **A/B VISUAL SEM CONGELAR A CENA NÃO É A/B.** O primeiro A/B dos véus saiu com os três tiros
  a 400ms de intervalo **com o jogo andando** — são três momentos diferentes, não três versões do
  mesmo quadro. E um deles pegou um flash de dano que tingiu a tela de rosa. Refazendo com
  `scene.pause()` e `cameras.main.resetFX()` antes de cada tiro, a diferença entre `0.38` e `0.24`
  ficou óbvia; antes era indistinguível do ruído.
- ⚠️ **Depois do `scene.pause()` a cena SAI do `getScenes(true)`** e o script quebra na segunda
  iteração. Busque por chave: `window.__game.scene.getScene('Game')`.
- **Um assert cujo limiar fica abaixo do piso de ruído prova menos do que parece.** O
  `alpha > 0.05` do anúncio passa, mas passaria também com o mecanismo meio quebrado. A parte que
  vale ali é qualitativa e é do olho humano — o assert só garante que algo aconteceu.

### Arte

- **Pintura QUASE 16:9 não precisa de alargamento.** A da Fase 3 é 1625×968 e o recorte central
  custa **5,6%** — MEDIDO. (A da Cutscene 2 era quadrada e perdia 44%, e por isso existe o
  `alargar-16x9.mjs`. **Não use aqui.**)
- ⚠️ **Pintura de fundo é 100% OPACA e esconde tudo atrás dela** (medido: 0 pixels não-opacos em
  129.600). Na Fase 3 isso esconde o planeta durante o Ato 1 — aceito, e com um efeito bom que
  ninguém projetou: quando a nuvem abre em t=42 e a pintura some, **o planeta reaparece junto com
  o casco**. A virada revela duas coisas.
- **Os trechos LISOS são a maioria da faixa, e isso é contraintuitivo.** Um casco em que cada
  metro tem uma engrenagem lê como brinquedo — são os trechos vazios que fazem o maquinário
  significar alguma coisa. Mesma lógica do SILÊNCIO no ciclo da Capitânia.
- **O PixelLab desenha SUJEITOS, não superfícies.** Tentei gerar textura de casco com o prefixo de
  estilo da casa e lista de negativas, e saíram: um bicho, uma espinha vista de frente, e uma placa
  com fundo opaco. As sete que funcionaram são do Henrique, e o nome delas começa com *"Seamless
  horizontally repeating"* — a frase no COMEÇO do prompt, onde ele pesa mais.

### Código

- ⚠️ **Empate de profundidade renderiza certo por acidente.** A pintura entrou em `−97`, o mesmo
  da camada do planeta; funcionava só por ordem de inserção, e qualquer reordenação futura a viraria
  para trás sem nenhuma sonda pegar. Toda profundidade nova precisa ser **distinta e comentada**.
- **A pintura NÃO é uma `ScatterLayer`** — o alpha dela não passa por `alphaFor`, então quem a
  apaga é o `setNebulaDensity`, à mão. Sem isso ela ficaria de pé depois de t=42 e o Ato 2 teria
  nebulosa no céu.
- **O `pickVariant` sorteia UNIFORME.** Quando a proporção entre variantes importa, ela não pode
  vir dele: na Fase 3 ela vem da GEOMETRIA — duas camadas, uma com `gap` menor que a largura da
  arte (contínua) e outra com `gap` grande (pontuação).
- ⚠️ **Sonda existente que encosta na mudança tem que ser conferida, não afrouxada.** Duas vezes
  nesta fatia um subagente ajustou a `probe-stage3` (`camadasNebulosa >= 3 → >= 2`, e
  `casco === 1 → === 2`). **As duas foram legítimas** — os números contavam a arquitetura antiga —
  mas só se sabe isso conferindo. A segunda ficou mais ESTRITA, não menos.

---

## Sondas úteis desta fatia

`probe-f3-visual.mjs` (**nova**: a pintura em 2 cópias no depth certo, o parallax procedural
reduzido, os véus vivos, o casco se anunciando no Ato 1 com alpha entre 0,05 e 0,5, e as duas
camadas de casco no Ato 2 com a base sendo maioria) · `probe-stage3.mjs` (**o portão**: a fase de
ponta a ponta, as 4 formas da serpente, a entrega do hangar)

---

## O que falta (a Task 4)

1. **A luz quente entre segmentos do casco — CONDICIONAL.** Só entra se o Henrique disser que falta
   luz. A arte nº 1 já traz veios alaranjados e a nº 3 uma luz azul; pode ser que a faixa já
   respire. **Se ele pedir, PARE e escreva uma tarefa própria** — é medir sete artes, escolher
   limiares e calibrar, do tamanho de uma tarefa inteira. A implementação de referência é
   `Interlude2Scene.criarLuzes()` (commit `88b80c4`) + `scripts/_cut2-luzes.mjs`.
2. **A regressão completa**: build, `probe-f3-visual`, `probe-stage3`, `probe-chain`, e as duas da
   Fatia 4 (`probe-cut2-visual`, `probe-doca`) — o `Parallax` é compartilhado e uma mudança nele
   pode vazar para a Cutscene 2.
3. **A revisão ampla da branch** (a Task 3 nunca foi revisada).
4. **Os documentos e o merge** (`--no-ff`, mensagem por arquivo).

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
