---
status: reverse-documented
source: src/entities/BossSerpente.ts (+ numerosSerpente.ts, cascoVivo.ts, gestoSerpente.ts, serpenteFusao.ts; o spawn em src/scenes/GameScene.ts; o roteiro STAGE_3 em src/systems/StageDirector.ts)
date: 2026-10-30
verified-by: Henrique (a intenção respondida em 30/10)
---

# Game Brief: Serpente do Casco — o chefão da fase 3

> **Documentado a partir da implementação** — gerado pelo `/reverse-document` a partir de `src/entities/BossSerpente.ts`
> em 30/10/2026, no commit `14a6bcc` **mais** as mudanças da S1, da S1b e da revisão, que estão no disco sem commit
> (o backup: `docs/ccgs-serpente/backup-2026-10-30/`).
> Este documento registra o que o código **faz**. O que está marcado como `INTENT UNKNOWN` foi inferido, não confirmado
> pelo autor. Onde este documento e o código discordarem, não tome o documento como o requisito.

**Pitch:** uma serpente biomecânica de três cabeças irrompe do casco do Leviatã e cobra, cabeça por cabeça, os padrões
que a campanha ensinou, até as três se fundirem numa só. *(Fonte: os comentários do código — "ela COBRA a campanha
inteira" e, dele, "depois da terceira, surge um boss maior com uma cabeça só, que é a junção das 3".)*

## Core loop
- Ler o aviso da forma (a rachadura que trava branca, as bocas que acendem, o metrônomo do leque).
- Sair da linha.
- Bater na ÚNICA cabeça vulnerável enquanto ela está exposta.
- A cabeça cai, a forma muda, e com ela o padrão.

## Player goal & fail state — what "working" looks like
- **Vencer:** zerar a vida das formas (210 no total), o que leva à Interlude3. **Perder:** ficar sem as vidas da nave.
- **"Funcionando" (ele, 30/10):** *"algo entre ser difícil pela leitura e um pouco de reflexo"*. Quem lê o aviso e desvia
  não é punido pelo ataque grande; quem fica parado é.

## MVP — what must exist to be the game
1. Uma cabeça vulnerável por vez. **A ideia fica; a forma muda:** como ela se marca, se alcança e ataca está aberto (30/10).
2. **Todas as formas se movem pela arena** (30/10: *"Todas mais móveis"*). ⚠️ **A implementação de hoje não atende:** as
   formas de cabeças vivem presas no rombo e só saem dele no bote, por baixo do casco; a fusão também fica no rombo.
3. Avisos legíveis e espaço para desviar pela ESQUERDA (ele: *"o jogador sempre vai estar para a esquerda da serpente"*).
4. A troca de forma visível na anatomia: a cabeça cai, a arte muda, o coto fumega.
5. Uma forma final maior. Ele, 29/10: *"ela se desgarra da forma imóvel e se torna mais móvel"*.
6. A chegada da arena no casco do Leviatã.

## Out of scope — not building this
- **O som.** Ele (30/10): *"o som será feito apenas depois que terminarmos todo o balanceamento do jogo"*. Sem equipe de
  som por enquanto.
- Outros chefões, outras fases, a nave, as cartas e o HUD.
- Os sistemas compartilhados (a cena do jogo, o carregamento, o parallax, os destroços, o pool de tiros) sem passar pela
  sessão principal: o GUARDRAIL do `CLAUDE.md`.

## Build order
1. O backup da forma atual (ele, 30/10: *"mantenha a forma atual como backup"*). Ver a linha de base abaixo.
2. **O movimento de uma forma, provado antes de tudo.** É o maior risco e o pedido que mais se repete (*"muito
   engessadas"*, desde 28/10).
3. Os ataques por cima do movimento, um padrão por forma, com aviso.
4. A arte e as animações: `/asset-spec` → PixelLab, a partir da arte aprovada, com conceitos numa folha antes de instalar.
5. A forma final.
6. A calibragem pelas sondas (o jogador parado e o que desvia).

---
**Who it's for / what they feel:** `INTENT UNKNOWN` — o tom da luta não foi dito. A dificuldade foi: leitura com um
pouco de reflexo.

**Art & audio direction:** pixel art dark sci-fi a 384×216 (o casco escuro, luz só onde há energia); o corpo animado no
PixelLab a partir da arte aprovada, nunca movimento fingido em código. O som fica para depois do balanceamento do jogo.

**Reference game:** Metal Slug — o chefe que se despedaça (Iron Nokana): o dano vira anatomia visível. *(O pedido dele,
julho, registrado no código.)*

---

## A linha de base implementada (o backup) — o que o código faz hoje

**A arena (STAGE_3):**
- 91 s: o banner "ALERTA · SERPENTE DO CASCO"; 95 s: o chefão nasce. Antes dele vêm as "Defesas do casco" (drones,
  kamikazes e batedores, entre 80 e 85 s). Na vitória, a Interlude3.
- O casco chega com a faixa INTEIRA; o mundo freia (28 px/s², a distância da freada é v²÷56) até parar com ela em x 300.
- O casco treme 1,2 s e estoura de dentro para fora, nos próprios pixels; vira o rombo. Ela sobe por ele a 90 px/s.

**As formas:**

| Forma | Vida | A cabeça vulnerável | Os ataques |
| --- | --- | --- | --- |
| A, 3 cabeças | 50 | a ciano (tiro AZUL) | o bote a cada 4 s; um tiro esparso a cada 2 s, revezando as 3 cabeças, cada uma na sua cor; a chuva tripla, alternando com o bote |
| B, 2 cabeças | 50 | a verde | um leque de 5 em metrônomo, de 1,8 s a 1,25 s (aperta com o dano); o bote DUPLO a cada 5 s; a âmbar esparsa a cada 2,6 s; a chuva de 2 ondas |
| C, 1 cabeça | 50 | a laranja (tiro ÂMBAR) | a rajada mirada de 3 a cada 2,1 s; um leque de 4 a cada 3,4 s; o bote a cada 5,5 s, com a rajada de perto na janela |
| Fusão | 60 | o crânio | um ciclo: leque de 7 → rajada de 4 → bote → 0,8 s de silêncio. Hoje fica no rombo, com a arte de 09/2026 |

**No rombo:** ela aparece inteira, em três alturas (o sprite em y 142, 126 e 110), respirando ±14 px. O ERGUER
(PixMiniMax, 17 quadros: as cabeças sobem e abrem a boca) é o gesto de ataque dela, e o tiro sai da boca de quem atira.

**O bote por baixo do casco:**
1. Ela mergulha a 380 px/s.
2. A rachadura corre a 300 px/s até o x da nave (nunca à esquerda de x 60) e a segue por 0,4 s, a 160 px/s.
3. Trava BRANCA por 0,55 s.
4. Ela rompe o casco e sobe a 700 px/s, com o erguer; a cabeça vulnerável fica na altura da nave
   (altura = limite(naveY − cabeça·escala; posto alto; crista − 6 − cabeça·escala)).
5. A janela: 1,1 s (na primeira da B, 0,5 s).
6. Ela afunda, a lombada volta a 300 px/s, e o rasgo e a fissura se curam em 2,5 s.

**A chuva tripla:**
1. O aviso, 0,7 s: as bocas acendem.
2. O cuspe para o alto.
3. Uma onda por cabeça viva, a cada 0,55 s, a 100 px/s, com um vão de 3 gotas que anda no máximo 1 vaga entre as ondas.

**A troca de forma:** uma cadeia de estouros de 0,55 s, com imunidade. Da C para a fusão:
1. Ela afunda no rombo.
2. As três luzes convergem lá dentro.
3. O rombo estoura em cascalho.
4. A fusão sobe.

**A marca da cabeça:**
- as veias batem como coração (1/s em repouso, 2,5/s no alerta);
- o acerto solta 2 a 4 pixels de carne;
- o círculo de acerto mede 16,5 px (18,9 na fusão), no crânio desenhado.

**A morte:** a ruptura nos próprios pixels; três mordidas na fusão, a 22%, 13% e 5% da vida (pescoço, queixo, crânio).

**Medido** (`scripts/_serpente/_sonda-luta.mjs`, o treino):
- o jogador parado: 42,0 s de luta, 7 botes levados;
- o que desvia: 41,7 s, 0 botes, 15 tiros levados.

**Lacunas conhecidas:**
- a aparição depois do bote ainda é a "sombra" que ele reprovou. A arte nova (a E2 + o erguer, saindo do buraco H1)
  espera a escolha dele em `docs/superpowers/folhas/2026-10-29/serpente-casco/revisao/`;
- a fusão não se solta do casco.

## Open questions (`INTENT UNKNOWN`)
- O tom e o sentimento da luta.
- Quanto tempo ela deve durar.
- Se a chegada que estoura, a chuva tripla e o erguer ficam. Ele (30/10): *"se não passarem ou forem reformulados, tudo
  bem"* — são candidatos, não exigências.
