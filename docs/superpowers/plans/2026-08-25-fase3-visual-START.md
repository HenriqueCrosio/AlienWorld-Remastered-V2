# START — Fatia 5: FASE 3 ("O CASCO")

**🟡 FATIA EM ANDAMENTO.** Branch `feat/fase3-visual`, **não mergeada**. `main` continua em
`ee4e2a0` (a Fatia 4).

A sessão de **26/08** entrou depois do primeiro teste do Henrique e atendeu ao que ele pediu ali.
**Nada disso foi jogado ainda** — ele vai testar na próxima sessão, e é dela que saem os ajustes.

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está em andamento
> na branch `feat/fase3-visual`. A sessão passada entregou cinco mudanças que EU AINDA NÃO
> TESTEI: a pintura de fundo em resolução real, o rabo do Leviatã na virada, a faixa que planta
> os props, o lança-mísseis com míssil novo e 4 bocas, e os consertos do piso do casco. Sobe o
> `npm run dev`, eu entro com `[M]`, e só depois do meu veredicto seguimos para a Task 4."**

⚠️ **NÃO comece pela Task 4.** Ela é o fechamento (regressão final, revisão ampla, documentos,
merge), e fechar antes do teste humano é fechar sobre arte que ainda pode mudar.

⚠️ **NÃO re-despache as Tasks 1–3.** Estão commitadas. Ledger em `.superpowers/sdd/progress.md`.

---

## O que testar, e como

`npm run dev` (porta 5173). No menu: **`M`** entra direto na Fase 3, `N` é o treino da serpente.

| t | O quê |
|---|---|
| 0–21s | Ato 1 dentro da nuvem — **a pintura agora em resolução real** |
| 21s | O casco se anuncia: a nuvem afina 25% e a estrutura aparece por baixo |
| **40,5s** | **O RABO** entra pela direita e se segura, batendo a nadadeira |
| 42s | A nuvem abre — o casco assume (e o planeta reaparece junto) |
| ~47,5s | O rabo **afunda** por trás do casco: a transição dita em movimento |
| 46s+ | Ato 2 — lança-mísseis e respiradouros sobre o casco |
| 53s / 88s | A aranha / a serpente |

---

## As CINCO mudanças que esperam o seu olho

### 1. A pintura de fundo, em resolução real ⭐ (a reclamação de três sessões)

Ela era **480×270 em `y=−27`** numa tela de **384×216** — mostrava 80% de cada eixo, ou seja
**64% da pintura com zoom de 1,25×**. Agora é 384×216 em `y=0`: largura inteira, 94,4% da altura,
um pixel da arte por pixel de tela.

⚠️ **A `paintBgF2` (Cutscene 2) e a `paintBgZeroG` (rompimento da atmosfera) continuam erradas** —
mesmo defeito, em fases já mergeadas e revisadas. Não foram tocadas. O conserto é uma linha por
pintura (`node scripts/paint-bg.mjs <origem> <destino> 384 216`, mais o `y` no `Parallax`), e a
decisão é sua.

### 2. O rabo do Leviatã

Chega pela direita, **se segura** com o corpo saindo do quadro, bate a nadadeira, e afunda por
trás do casco. Escala **2,4** (175px de altura numa tela de 216).

- **Ele está colossal o bastante?** Tentei 3,0 e ficou pior: a nadadeira sozinha media 219px e a
  batida a varria para fora da tela em cima e embaixo — via-se a lombada, nunca o rabo inteiro.
  2,4 é o maior tamanho em que o arco inteiro cabe. Para ir além, o arco tem que encolher.
- **A batida está com peso?** Ela é assimétrica: sobe em 1,5s, desce em 0,55s. Se estiver lenta
  demais ou rápida demais, são dois números em `raboDoLeviata()`.

### 3. A faixa que planta os props

O respiradouro parecia colado. A causa não era a arte — era a falta da **faixa da frente**, que a
Fase 1 tem desde sempre e a Fase 3 não tinha. Agora existe, em `depth −0.2`.

- **O pé dos props sumiu direito?** Se ainda parecer colado, a tira sobe (`GROUND_Y − 4` → −8).
- **O tom dela está certo?** Ela é o casco MAIS PERTO, em leve sombra (tint `0x9aa4b8`). Se
  brigar com a faixa de trás, escurece — **nunca clareia**.

### 4. O lança-mísseis e o míssil

Você criou dois projéteis; escolhi o **`d77055b6`** e descartei o `e77eebe8`. O motivo, medido no
tamanho real do jogo: o descartado vira uma lasca de 20×18 quase vazia, lê como lança arremessada
e a chama some. O escolhido tem corpo compacto e chama forte em 21×11.

⚠️ Os dois vinham **inclinados**, e o código faz `setRotation(angle)` — a arte tem que ser
horizontal apontando para a direita, senão o míssil voa com o nariz torto o tempo todo. Foi
endireitado em 11,5° com nearest (ampliando 4x e voltando, para não derreter a aresta).

**As 4 bocas revezam**: um míssil por disparo, saindo de um tubo diferente a cada vez, ciclo
fechado (verificado). **Não é salva.** Uma salva de quatro quadruplicaria o volume de tiro do
Ato 2, e esse número está fechado até o playtest — se você quiser a salva, é uma decisão de
balanceamento, não de arte.

### 5. Os consertos do piso e das emendas

O piso do casco não encostava no rodapé (sobrava uma tira de 7px onde se via estrela passando por
baixo do chão) e as peças tinham contorno preto na borda, que virava risco vertical a cada ~60px.
Os dois estão corrigidos e travados por assert.

---

## Regras que não se redescobrem (custaram sessão)

### O erro da pintura, e por que ele durou tanto

⚠️ **O `paint-bg.mjs` sempre fez a coisa certa** — o cabeçalho dele diz *"1 px da arte = 1 px do
jogo"*. Ele vinha sendo **CHAMADO com os números errados** (480×270 em vez de 384×216), em fase
após fase. Um script correto invocado errado é mais difícil de achar do que um script errado:
ninguém suspeita da ferramenta que documenta o próprio contrato.

### Arte gerada

⚠️ **O v3 do PixelLab lê "bater para cima e para baixo" como "GIRAR".** A animação do rabo voltou
com a nadadeira rodando em torno do próprio eixo — uma hélice. Descartada inteira. **Movimento que
se descreve numa frase de geometria não precisa de quadros gerados**: a batida virou uma rotação
em torno do pedúnculo, em código, e não tem como dar a volta.

⚠️ **NÃO GERE ARTE A PARTIR DA COISA EM QUE ELA SE APOIA.** A lição da doca (Fatia 4) se repetiu:
pedi um lança-mísseis *"mounted on a whale hull"* com a baleia de referência, e as 16 candidatas
voltaram sendo a baleia com um canhão nas costas. Custou 20 gerações e uma rodada.

⚠️ **PARA TRAVAR O ÂNGULO, RECORTE O ÂNGULO DA PRÓPRIA REF.** O primeiro rabo saiu numa vista de
cima porque o prompt dizia "wide horizontal fin". O que resolveu não foi adjetivo: foi recortar a
CAUDA da baleia de referência (`assets/raw/ref-rabo-lateral.png`) e mandar ela como style image.

**Colossal tem teto.** O que não cabe na tela não se vê: em escala 3,0 sobrava a lombada
atravessando o quadro e o rabo nunca aparecia inteiro. Quem limita é a ponta do braço mais longo.

### Sondas

⚠️ **ASSERT QUE AMOSTRA UMA LINHA SÓ NÃO MEDE O QUE DIZ MEDIR.** O do rodapé reprovou porque uma
das duas linhas caiu numa junta de placa — arte legítima. Virou média de 6 linhas. O das emendas
tinha o defeito gêmeo: contava toda coluna escura e acusava 11, que eram as silhuetas dos
respiradouros. A diferença entre um risco e um prop é a **largura**. **Quando um assert visual
reprova, confira se ele mede a coisa antes de mexer na coisa.**

⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** A `probe-stage3` quebrou com três browsers
headless disputando o mesmo Vite, e passou sozinha sem nenhuma mudança.

### As regras das sessões anteriores, ainda válidas

- ⚠️ **A/B visual sem congelar a cena não é A/B** (`scene.pause()` + `cameras.main.resetFX()`; e
  depois do pause busque a cena por chave, `getScene('Game')`).
- ⚠️ **Empate de profundidade renderiza certo por acidente.** Toda profundidade nova precisa ser
  distinta e comentada.
- **Pintura de fundo é 100% opaca** e esconde o planeta no Ato 1 — aceito, e com efeito bom: em
  t=42 a pintura some e o planeta reaparece junto com o casco.
- **O `pickVariant` sorteia UNIFORME.** Proporção que importa vem da GEOMETRIA (o `gap`), não dele.
- ⚠️ **Sonda existente que encosta na mudança se CONFERE, não se afrouxa.**

---

## Sondas

`probe-f3-visual.mjs` — **26 asserts**, tudo verde. Cobre a pintura em resolução real, o casco se
anunciando, o rabo (existe, bate, arco curto e não giro, se segura na direita, é colossal, não tem
corpo físico), o rodapé, as emendas, os props do Ato 2 e a faixa da frente.

`probe-stage3.mjs` — **o portão**: a fase de ponta a ponta, as 4 formas da serpente, o hangar.

Regressão da sessão: `tsc` limpo · `npm run build` limpo · `probe-f3-visual` 26/26 ·
`probe-stage3` verde · `probe-chain` verde · `probe-cut2-visual` verde · `probe-doca` verde.

---

## O que falta (a Task 4)

1. **Os ajustes que saírem do teste do Henrique** — é por isso que a fatia está aberta.
2. **A luz quente entre segmentos do casco — CONDICIONAL.** Só se ele disser que falta luz. **Se
   pedir, PARE e escreva uma tarefa própria**: é medir sete artes, escolher limiares e calibrar.
   Referência: `Interlude2Scene.criarLuzes()` (`88b80c4`) + `scripts/_cut2-luzes.mjs`.
3. **A decisão sobre a `paintBgF2` / `paintBgZeroG`** (o mesmo erro de resolução, em fases
   mergeadas).
4. **A revisão ampla da branch** — a Task 3 nunca foi revisada, e a sessão de 26/08 não passou
   por revisão nenhuma.
5. **Os documentos e o merge** (`--no-ff`, mensagem por arquivo).

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
