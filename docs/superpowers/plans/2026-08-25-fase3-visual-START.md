# START — Fatia 5: FASE 3 ("O CASCO")

**🟡 FATIA EM ANDAMENTO.** Branch `feat/fase3-visual`, **não mergeada**. `main` continua em
`ee4e2a0` (a Fatia 4).

O Henrique **jogou a fase em 27/08** e deu veredicto por parte. A sessão de 27/08 entregou os
quatro ajustes que ele pediu. **Nada disso foi jogado ainda.**

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está em andamento
> na branch `feat/fase3-visual`. A sessão passada entregou quatro mudanças que EU AINDA NÃO
> TESTEI: o rabo colossal saindo do quadro, o toco da cauda virando a costura do casco, os
> respiradouros raros, e a água-viva elétrica no Ato 1. Sobe o `npm run dev`, eu entro com `[M]`,
> e só depois do meu veredicto seguimos para o fechamento."**

⚠️ **NÃO comece pelo fechamento** (revisão ampla, documentos, merge). Fechar antes do teste humano
é fechar sobre arte que ainda pode mudar — foi por isso que esta fatia abriu duas vezes.

⚠️ **NÃO re-despache as Tasks 1–3 antigas.** Estão commitadas. Ledger em `.superpowers/sdd/progress.md`.

---

## O que testar, e como

`npm run dev` (porta 5173). No menu: **`M`** entra direto na Fase 3, `N` é o treino da serpente.

| t | O quê |
|---|---|
| 0–37s | Ato 1 dentro da nuvem — **a água-viva entra em t=8 e t=16** |
| 21s | A nuvem afina 25%… **e o casco NÃO aparece** (era aqui o gradiente estranho) |
| 37,5s | Os hazards param — o quadro esvazia |
| **38s** | **O RABO** entra pela direita, colossal, sangrando do quadro |
| 42s | A nuvem abre: planeta e estrelas voltam. **O casco continua invisível** |
| **46,5s** | A nadadeira sai pelo rodapé. **Só o TOCO fica — e o casco nasce dele** |
| 48s | O casco está sólido; o toco afunda por trás dele |
| 48,5s | Banner `O CASCO DO LEVIATÃ` |
| 53s / 88s | A aranha / a serpente |

---

## As QUATRO mudanças que esperam o seu olho

### 1. O rabo colossal ⭐

Escala **2,4 → 3,4**: 364×248 numa tela de 384×216, sangrando ~20px em cima e ~12px embaixo. A
regra antiga (*"o arco inteiro tem que caber"*) morreu com o seu teste.

- **Está opressivo?** A nadadeira agora alcança x≈33 — atravessa a tela inteira por trás de você,
  e o fundo do quadro vira todo rabo por ~7s. **3,0 é o degrau abaixo**, e a coreografia não muda
  com ele: é trocar um número.
- **A batida mudou de peso?** Não deveria: o arco caiu de ±8° para ±6° justamente porque a
  alavanca cresceu de 236 para 335px. A varredura foi de ~66px para ~70px.

### 2. O toco vira a costura

O mergulho virou **rotação em torno do pedúnculo** (−38°): a nadadeira desce 206px e sai pelo
rodapé, o toco fica na quina, o casco nasce dali, e só depois o toco afunda por baixo do chão novo.

- **A emenda ficou fluida?** É a pergunta central desta rodada. Se ainda ler como corte, os botões
  são a pausa do toco (800ms) e a duração da revelação (1500ms), em `raboDoLeviata()`.
- **O gradiente sumiu mesmo?** Em t=21 e t=44 o casco tem que estar em alpha **0**.

### 3. Os respiradouros raros

De ~13 na fase para **~3**, com espaçamento mínimo de 6,4s.

- ⚠️ **~3 pode ser POUCO DEMAIS** — é o número que eu mais desconfio. O botão é
  `RESPIRADOURO_CARENCIA` no `GameScene`: 5s → ~3; **3s → ~4**; 8s → ~2.
- **Mexer na CARÊNCIA, nunca na mistura.** A mistura é o que segura o volume de tiro do Ato 2.
- O número de lança-mísseis não mudou (medido: 4 antes, 3–6 depois, mesma variância de sempre).

### 4. A água-viva elétrica

Do objeto que você criou. Deriva a 28px/s (o drone faz 70), não atira, não persegue, `hp 10`.
Duas ondas: 3 em t=8 e 4 em t=16.

- ⚠️ **`hp 10` é o número mais frágil.** É 5× um drone. A intenção é "obstáculo que atrapalha", não
  "alvo que você deleta". Se virar pedágio, é o `hp` que desce — **não a velocidade**, que é a
  razão de ela existir.
- **7 na tela ao mesmo tempo é demais?** As duas ondas se sobrepõem de propósito (lento e rápido
  no mesmo quadro), mas o número é ajustável.
- O pulso elétrico é código; os quadros só fazem o sino contrair e os tentáculos arrastarem.

---

## Regras que não se redescobrem (custaram sessão)

### As duas regras que o TESTE JOGADO derrubou

⚠️ **A "insinuação" do casco em t=21 foi REVERTIDA.** O `HANDOFF` pedia desde a Fatia 0 (*"na
metade do tempo o Leviatã começa a aparecer"*), a sessão de 26/08 implementou, e o Henrique
reprovou jogando. **Ela não foi esquecida: foi construída, vista e rejeitada.** Não reimplemente.

⚠️ **"Colossal tem teto" também morreu.** Sair do quadro deixou de ser defeito e virou o objetivo.

### O que as sondas ensinaram, e continua valendo

⚠️ **ASSERT DE MOVIMENTO QUE NÃO OLHA A DIREÇÃO NÃO MEDE MOVIMENTO.** O mergulho saiu com o sinal
invertido (`+38` em vez de `−38`) e a nadadeira atravessava o TOPO do quadro. O assert
`angulo > 20` passou verde: media o tamanho do giro, não o lado. **Quem reprovou foi a captura de
tela.** Toda sonda visual desta fatia tira foto por isso.

⚠️ **ASSERT QUE AMOSTRA UMA LINHA SÓ NÃO MEDE O QUE DIZ MEDIR** (a lição do rodapé e das emendas).
E o gêmeo dela: **contar sprites vivos não conta nascimentos** — props reciclam, então a sonda dos
respiradouros envelopa `terrain.spawn` em vez de olhar a tela.

⚠️ **SONDA EXISTENTE QUE ENCOSTA NA MUDANÇA SE CONFERE, NÃO SE AFROUXA.** Nesta rodada dois
asserts mudaram de critério (o do casco e o do "colossal") e um mudou de HORA (o do Ato 2
amostrava em t=47, no meio da revelação, e reprovava um casco correto mas inacabado). Nenhum
afrouxou.

⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** Três browsers headless no mesmo Vite quebram a
`probe-stage3`.

### Arte gerada

⚠️ **MOVIMENTO QUE CABE NUMA FRASE DE GEOMETRIA NÃO VAI PARA OS QUADROS GERADOS.** O v3 leu *"bater
para cima e para baixo"* como **girar** e devolveu o rabo como hélice. Na água-viva a divisão foi
feita a tempo: quadros para o sino deformando, código para o pulso — e ela voltou certa de
primeira.

⚠️ **GLOW INTERNO, NUNCA EXTERNO, em sprite recortado justo.** O halo externo vaza da quad e é
ceifado nela: vira um retângulo aceso em volta do bicho.

⚠️ **MEDIR NO TAMANHO REAL DO JOGO.** O míssil descartado (`e77eebe8`) só se entregou assim.

⚠️ **NÃO GERE ARTE A PARTIR DA COISA EM QUE ELA SE APOIA** (a lição da doca, repetida no
lança-mísseis: 16 candidatas voltaram sendo a baleia com um canhão nas costas).

⚠️ **PARA TRAVAR O ÂNGULO, RECORTE O ÂNGULO DA PRÓPRIA REF.**

### As regras das sessões anteriores, ainda válidas

- ⚠️ **A/B visual sem congelar a cena não é A/B** (`scene.pause()` + `cameras.main.resetFX()`; e
  depois do pause busque a cena por chave, `getScene('Game')`).
- ⚠️ **Empate de profundidade renderiza certo por acidente.** Toda profundidade nova precisa ser
  distinta e comentada.
- **O `pickVariant` sorteia UNIFORME.** Proporção que importa vem da GEOMETRIA, não dele — e
  ESPAÇAMENTO, muito menos.
- ⚠️ **O `paint-bg.mjs` sempre esteve certo; ele vinha sendo CHAMADO errado.** Um script correto
  invocado errado é mais difícil de achar do que um script errado.

---

## Sondas

`probe-f3-visual.mjs` — **36 asserts**, tudo verde. Cobre a pintura em resolução real, a água-viva
(existe, deriva, pulsa, limpa a tela antes do rabo), o casco INVISÍVEL no Ato 1 com a nuvem
afinando mesmo assim, o rabo (bate, arco curto, se segura na direita, colossal, sangra do quadro,
sem corpo físico), o TOCO (gira para baixo, depth −76, o casco nascendo dele), o casco inteiro no
Ato 2, o rodapé, as emendas, e os respiradouros (poucos, espaçados, sem mexer nos atiradores).

`probe-stage3.mjs` — **o portão**: a fase de ponta a ponta, as 4 formas da serpente, o hangar.

Regressão da sessão de 27/08: `tsc` limpo · `npm run build` limpo · `probe-f3-visual` 36/36 ·
`probe-stage3` verde · `probe-chain` verde · `probe-cut2-visual` verde · `probe-doca` verde.

---

## O que falta

1. **Os ajustes que saírem do teste do Henrique** — é por isso que a fatia está aberta.
2. **A luz quente entre segmentos do casco — CONDICIONAL.** Só se ele disser que falta luz. **Se
   pedir, PARE e escreva uma tarefa própria**: é medir sete artes, escolher limiares e calibrar.
   Referência: `Interlude2Scene.criarLuzes()` (`88b80c4`) + `scripts/_cut2-luzes.mjs`.
3. **A decisão sobre a `paintBgF2` / `paintBgZeroG`** (o mesmo erro de resolução, em fases
   mergeadas e revisadas). Uma linha por pintura: `node scripts/paint-bg.mjs <origem> <destino>
   384 216`, mais o `y` no `Parallax`.
4. ⚠️ **A REVISÃO AMPLA DA BRANCH** — a Task 3 nunca foi revisada, nem a sessão de 26/08, nem a de
   27/08. **Tem que acontecer antes do merge.**
5. **Os documentos e o merge** (`--no-ff`, mensagem por arquivo).

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
