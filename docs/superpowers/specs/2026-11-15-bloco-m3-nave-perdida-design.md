# Bloco M3 — a janela da NAVE PERDIDA (design)

> 15/11. A terceira peça da MOLDURA do jogo (M1 a pausa e as CONFIGURAÇÕES ✅ · M2 os controles ✅ · **M3** · M4 o
> carregamento e o favicon). Decidido com ele, uma pergunta por vez; ao fim: *"Pode escrever e implementar, é algo mais
> simples. Eu analiso quando terminar tudo"*.

## 1. O problema

A `GameOverScene` é texto solto sobre o fundo liso: o maior contraste de acabamento do jogo depois que a tela final
ganhou a janela e a pausa virou uma janela com linhas.

**Quem chega a ela (conferido no código em 15/11):** as quatro fases declaram cutscene (`StageDirector.ts`) e o
`victory()` sempre vai para ela; a F4 vencida vai para o resultado no menu do amanhecer. Na campanha, a única tela da
`GameOverScene` que o jogador vê é a **NAVE PERDIDA**. A "FASE COMPLETA" só aparece pelo treino do chefão, que são as
teclas de atalho do menu (`B`, `C`, `N`, `K`), todas dentro de `import.meta.env.DEV`: não existem na build final.

## 2. As decisões dele

| # | Pergunta | Resposta |
|---|---|---|
| 1 | O que a NAVE PERDIDA passa | Um placar sóbrio e rápido de "tente de novo" |
| 2 | O fundo | O último quadro da fase, parado e escurecido, como na pausa |
| 3 | A janela | Pequena, do porte da janela da pausa; os pontos já parados, sem contagem |
| 4 | As opções | Três linhas como na pausa: TENTAR DE NOVO · CONFIGURAÇÕES · SAIR PARA O MENU, o cursor na primeira |
| 5 | A "FASE COMPLETA" do treino | Fica como está (some na build final) |

A folha de 2–3 conceitos do START foi dispensada: o desenho sai inteiro da janela da pausa, já aprovada. Ele avalia a
tela de verdade, em fotos no jogo.

## 3. O que o jogador vê

A morte da nave corre inteira, como hoje (`docs/DESTROCOS.md`). Quando ela termina, a fase **para no último quadro**, o
véu da pausa escurece a tela e a janela entra por cima, sem troca de cena.

Dentro da janela (156 px de largura, centrada), de cima para baixo:

1. **NAVE PERDIDA** (a cor do inimigo) e, pequena, "a fase N continua esperando".
2. **PONTOS** e **RECORDE**, o rótulo à esquerda e o valor à direita. Batido o recorde, o rótulo vira
   **★ NOVO RECORDE**, aceso.
3. A **medalha em pixel** da tela final com "MEDALHA DE OURO/PRATA/BRONZE", só quando há uma. Sem medalha a linha não
   existe (some o "SEM MEDALHA") e a janela fica mais baixa.
4. As três linhas, o cursor em TENTAR DE NOVO.

Embaixo da janela, a dica pelo aparelho em uso: a tecla de tiro (ou o botão de baixo) confirma, `ESC` (ou o da direita)
vai ao menu.

## 4. Como se comporta

- **TENTAR DE NOVO** recomeça a fase com a mesma nave e o placar da ENTRADA dela (morrer reinicia a fase, não a
  campanha: GDD §8). Sem confirmação: não há partida a perder.
- **CONFIGURAÇÕES** abre a janela grande do M1; o `ESC` lá volta para a NAVE PERDIDA, com o cursor em CONFIGURAÇÕES.
- **SAIR PARA O MENU**, o `ESC` e o botão de voltar vão direto ao menu, sem confirmação.
- **Só toque novo:** quem morre segurando o tiro não recomeça sozinho; e a janela não aceita nada nos primeiros 350 ms
  (quem ainda está martelando o tiro vê o placar antes de escolher).
- **A música** não troca de faixa: fica abafada como na pausa. A fase recomeça com a dela; o menu, com a dele.
- O recorde é gravado uma vez, quando a janela abre (o treino de dev não grava, como hoje).
- Com movimento reduzido no sistema, o véu e a janela aparecem sem a entrada suave.

## 5. Como é feito

A janela da NAVE PERDIDA é **um tipo novo da pausa** (`'derrota'`), não uma cena à parte: a `PausaScene` já tem a
moldura, as linhas, a janela grande das configurações, o controle, as dicas e a irmã na camada HD. Uma cena separada
teria de duplicar tudo isso ou abrir a pausa por cima de si mesma.

- `src/pausa/numerosPausa.ts` (puro): o tipo `'derrota'`, as suas linhas, o rótulo TENTAR DE NOVO, as medidas da
  janela, e as regras em `passo` (sem confirmação; `ESC` na lista = sair).
- `src/pausa/abrirPausa.ts`: os dados do placar viajam em `OpcoesPausa.derrota`; `abrirPausa` devolve se abriu e aceita
  a guarda de tempo.
- `src/scenes/PausaScene.ts`: desenha a lista da derrota.
- `src/menu/painelResultado.ts`: a `texturaMedalha` passa a ser exportada (o desenho não muda: a tela final continua
  idêntica).
- `src/scenes/GameScene.ts#gameOver`: grava o recorde e abre a janela no lugar de `scene.start('GameOver')`. Se uma
  pausa já estiver aberta naquele instante (não deveria: a pausa não abre durante a morte), cai na tela antiga.
- A `GameOverScene` **não é tocada**: fica servindo à "FASE COMPLETA" do treino de dev.

## 6. Os testes

- `scripts/test-pausa.mjs` (regras): as linhas da derrota, sem confirmação, `ESC` = sair, as configurações voltam à
  lista.
- `scripts/test-derrota-jogo.mjs` (no navegador, contra o `npm run dev`): morrer abre a janela sobre a fase parada; o
  placar, o recorde novo e a medalha; o tiro segurado não recomeça; TENTAR DE NOVO volta à fase com o placar da
  entrada; as configurações e a volta; SAIR e `ESC`; o botão do controle simulado.
- A folha: `scripts/_m/_derrota-fotos.mjs` e `_derrota-folha.mjs` → `folhas/2026-11-15/nave-perdida/nave-perdida.html`.

## 7. Fora do escopo

A "FASE COMPLETA" do treino; pintura própria para a derrota; a contagem animada dos pontos; os ícones de botão fora das
CONFIGURAÇÕES além da dica desta janela.
