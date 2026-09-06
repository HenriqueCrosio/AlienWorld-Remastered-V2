# START — FATIA 7 · BLOCO A: O TESTE JOGADO

**🟠 IMPLEMENTADO, AGUARDANDO O TESTE JOGADO DO HENRIQUE.** Branch `feat/fase4-visual`.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-06-fatia7-bloco-a-START.md`. O Bloco A da Fatia 7 está
> implementado e eu vou jogar a Fase 4 agora para dar o veredicto. Não mexa em nada antes do meu
> feedback."**

---

## O QUE ELE VAI JULGAR — três perguntas, nesta ordem

Rode `npm run dev` e aperte **`L`** no jogo (atalho de DEV: cai direto na Fase 4).

1. **Parece estar dentro do bicho?** Era a queixa que abriu a fatia — *"não parece estar dentro de
   uma baleia"*.
2. **Dá para achar o vão de relance?** ⚠️ **Provavelmente não, ainda** — leia "o que EU já vi"
   abaixo antes de julgar isso como defeito novo.
3. **A troca entre câmaras se sente como passar por um estreitamento, ou como um corte?** O
   mergulho no escuro está em **600ms** (`Parallax.setPintura`), e esse número é ponto de partida,
   não decisão fechada.

**As trocas acontecem em `t=40` (a caixa torácica), `t=68` (o duto) e `t=82` (a câmara do
núcleo).** A fase inteira dura 86s.

---

## O QUE ENTROU (3 commits)

| commit | o que |
|---|---|
| `d26cf3f` | as 4 pinturas dele reduzidas para **384×216** e registradas no `BootScene` |
| `d3ab618` | o **`hangar` saiu** do modo `interior` e a pintura entrou no lugar (a `nebula3` saiu junto) |
| `d0a1a65` | o evento **`cenario`** no roteiro: as câmaras trocam em t=40 / 68 / 82 |

**Verificado, não presumido:** `probe-f4-visual` (16 asserts) verde, `probe-stage4` de ponta a
ponta verde, `probe-interlude3` verde, `npm run build` limpo.

⚠️ **A fronteira intacta:** o `hangar.png` continua **160×160 byte por byte** (`git status` limpo
nele) e a cutscene final segue usando o mesmo arquivo. A sonda cobra `usamHangar = 0` no interior.

⚠️ **Risco de hitbox: ZERO.** Nenhum número de `corredor`, `hazard` ou `wave` foi tocado. Se a
`probe-stage4` cair, o erro é de render, não de geometria.

---

## ⚠️ O QUE EU JÁ VI NOS QUADROS, PARA ELE NÃO GASTAR RODADA DESCOBRINDO

**As colunas continuam borrões.** O fundo mudou, mas as colunas do corredor ainda são
`costela`/`orgao`/`maquinario` — assets de CENÁRIO esticados até a altura sorteada e girados
alguns graus. Contra a pintura nova elas até destacam mais, mas **onde a coluna termina e onde o
vão começa continua difícil de ler de relance**.

Isso é a **Task 4 do plano** (`docs/superpowers/plans/2026-09-06-fatia7-bloco-a.md`), que está
deliberadamente **parada esperando o julgamento dele** — a task termina numa folha de contato, não
num merge. Gerar coluna nova e instalar sem ele ver é o que custou 40 gerações na Fatia 6.

---

## O QUE VEM DEPOIS, NA ORDEM

```
BLOCO A — O LUGAR          ✅ implementado    ◄ ELE JOGA AGORA
  └ Task 4 (as colunas)    ⬜ espera o OK dele na folha de contato
BLOCO B — O CHEFÃO         ⬜ a arte nova do guardião + a posição no alto-direita
  └ e o BRAINSTORM da 2ª forma, com a arena já na tela
BLOCO C — O DUTO           ⬜ paredes contínuas + as 3 portas (aqui mora a hitbox)
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
  que "explode" é luz por dentro. A segunda (gerada nesta sessão, prompt nomeando a quebra)
  **melhorou o fim** — vira carcaça oca com destroços — **mas o grosso da silhueta continua
  inteiro**. Duas tentativas convergiram no mesmo limite do gerador.
  **A saída proposta, para ele decidir:** compor a morte no motor — a animação nova rodando com
  as explosões que o jogo já usa em todo chefão por cima, e o quadro final sendo o
  `destruido.png`, que é o único em que a silhueta realmente quebra.
- ⚠️ A arte nova é **256×256** contra os 256×227 de hoje: `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y`
  **têm que ser remedidos**. Trocar a arte OBRIGA a remedir — é a lei que o próprio `BootScene`
  escreve sobre este asset.

---

## AS LEIS QUE ESTA SESSÃO CONFIRMOU OU DESCOBRIU

| lei | onde doeu |
|---|---|
| ⚠️ **Fundo pintado: assado em 384×216, escala 1. REDUZIR pode, AUMENTAR nunca** — é a grade de pixel casando com a da tela que dá a PROFUNDIDADE | ele cravou em 06/09; o instalador RECUSA ampliar |
| **A sonda espera por ESTADO, e o nome do estado se CONFERE** | `s.stageTime` não existe; a espera "por estado" virou relógio cego e os 4 primeiros quadros saíram todos já no chefão. O campo é `s.elapsed` |
| **`boss.forma` já é verdade enquanto o chefão VOA para dentro da tela** — `damage()` nesse estado é ignorado em silêncio. Espere por `!boss.entering` | ao capturar a 2ª forma, 06/09 |
| **Documento escrito na frente do fato vira mentira se a sessão cair** | o HANDOFF afirmava "empurrada para origin" antes do push existir |
| **Arte que o Henrique fez não se corrige sem perguntar** | segue valendo |

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**, empurrada. `main` está em `f417c0e` com a **Fatia 6 mergeada**.
`origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

**PixelLab:** 4.852 de 5.000 no ciclo que vira em 2026-10-04. Esta sessão gastou ~2 gerações.
