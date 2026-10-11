# START — retomada da FRENTE B: a SERPENTE DO CASCO está no jogo, esperando o teste dele (depois de 11/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o
> `docs/superpowers/plans/2026-10-11-serpente-casco-START.md`. Testei a serpente do casco no sandbox — vou dizer o que
> achei das três coisas marcadas e fechamos a F3."*

## 1. 📍 O PONTO MARCADO — as 3 coisas para ele olhar no teste

Ela está JOGÁVEL com a sequência inteira. **Como testar:** `npm run dev` → `http://localhost:5173/?sandbox` → fase 3 →
**"serpente do casco (elite; na F3 revela o casco)"**. O GIF dela em jogo, na velocidade real:
`docs/superpowers/folhas/2026-10-11/elites/gif-serpente-casco.gif`.

Ele pediu a montagem e saiu antes de testar. **As três coisas, nesta ordem:**

1. **Ela some no fundo escuro.** O corpo da 63-3 é quase preto e o fundo do ato 2 no sandbox é azul-escuro: só o contorno e os pontos vermelhos aparecem. Em todos os demos de 10/10 ela estava sobre a nebulosa
   LARANJA do recorte `fundo-casco.png` — por isso ninguém viu antes. Conferido: não é camada por cima (na frente de
   tudo ela fica igual). A arte NÃO foi mexida. Se incomodar, as saídas são do instalador (nunca ao vivo): uma luz de
   borda fina assada, ou clarear os meios-tons. ⚠️ É arte aprovada: mostrar as opções numa folha EM JOGO, lado a lado
   com a de hoje, antes de trocar qualquer quadro.
2. **Ela fica PARADA na tela — não rola com o casco** (a regra do casco, spec §3.3, segue em aberto para ela). A
   recomendação de manhã era rolar; a conta não fecha com a sequência inteira: o ciclo dura ~5,9s, o casco anda a
   84 px/s (~500px) e a tela tem 384 — do começo da subida ao auge do bote são 4,35s (365px), então ou a subida
   acontece fora da tela, ou o bote. As saídas: (a) deixar parada — ela está ATRÁS da crista, não plantada nas placas,
   e lê como quem acompanha a nave; (b) encurtar o ciclo para ele caber na travessia (ele pediu a sequência inteira);
   (c) uma deriva parcial. Decisão dele.
3. **Um ciclo por aparição:** ela sobe, faz tudo uma vez, afunda e vai embora sem pontos (como o Tentáculo fazia; a
   decisão A dele de 06/10). Com 14 de vida e três janelas curtas de balanço, dá para matar? Ele sente jogando. No
   roteiro ela entra em t=63,5 e t=75 (janelas de ~6s; o ciclo cabe).

Ajustes prováveis depois do teste, todos em `src/data/numerosElites.ts` (bloco `tentaculo`, com recarga a quente):
`trioAtrasoS` (0,33), `faixaDist` (26 = meia largura do vão), `velEspinho` (85), `distNave` (90), os tempos dos
balanços, `hp`.

## 2. O que a sessão de 11/10 decidiu (com ele)

- **O giro é 25°** (*"o ângulo 25 ficou bom"*).
- **O bote FERE** — só a boca, e só enquanto a cabeça está lançada; o recuo é o aviso.
- **Os espinhos:** *"ficam difíceis de desviar do jeito que está, tire o conjunto do meio e faça ter um atraso de ms
  entre os outros, assim abre-se uma lacuna para o player passar no meio"* → 2 trios paralelos, um de cada lado da
  linha da mira, o 2º 0,33s depois; a mira trava na nave no 1º. A nave parada fica no vão.
- **A falha da beirada** (ele circulou no GIF): *"existe uma falha entre a beirada do casco e a criatura"*. A causa: o
  demo cortava a serpente numa linha RETA em y=150, e a beirada real das placas varia de 0 a 2px por coluna — sobrava
  céu entre as duas. A correção: ela passou para TRÁS das placas (depth −76); quem a corta é a silhueta do casco.
- *"Monte a sequência dela inteira, qualquer coisa ajustamos depois"* e *"lembre-se de utilizar a arte decidida nas
  outras skills"* → os takes aprovados (idle, espinhos e bote, take 2), o vermelho escurecido (`BRILHO 0.45`), metade à
  mostra (`VISIVEL 0.58`) e o espinho desenhado do demo.
- Sem resposta ainda: o vermelho, o quanto do corpo à mostra, o tamanho (1:1 ≈ 100px), o NOME (a F2 já tem a
  Sentinela Orbital — no código ela segue como `tentaculo`, o posto do róster, até ele escolher).

## 3. O que existe

- **A arte assada** — `node scripts/_elites/_instalar-sentinela.mjs` (≈1 min): lê os clipes de
  `folhas/2026-10-10/elites/sentinela/`, escurece o vermelho, gira 25° (RotSprite) e recorta os 51 quadros numa caixa
  só (179×129) → `public/sprites/elite-tentaculo-{idle,espinhos,bote}-N.png` e `tiros/elite-espinho.png`. Mede e grava
  `src/data/tentaculoQuadros.ts` (GERADO: o pivô, o quanto afunda, a hitbox de cada quadro, a boca do bote, a borda da
  frente por linha) e a folha de conferência `folhas/2026-10-10/elites/sentinela/instalada-conferencia.png` (as caixas
  desenhadas sobre os quadros). Mudou o giro, o brilho, o take ou o quanto fica à mostra: as constantes no topo do
  script, e reinstalar.
- **O tratamento compartilhado** — `scripts/_elites/_sentinela-lib.mjs` (`apagar`, `scale2x`, `rotSprite`); o demo
  (`_sentinela-demo.mjs`) passou a usá-lo e continua saindo byte a byte igual.
- **O comportamento** — `src/entities/elites/Tentaculo.ts` (reescrito; a corrente de gomos, a rachadura e a meia-lua
  saíram, e os 6 PNGs provisórios deles também). Sem animação do Phaser: o quadro sai do relógio do estado. Duas
  hitboxes: o CORPO (o próprio inimigo; fere e é ferido) e a BOCA (um corpo sem desenho em `corposElite`; fere a nave e
  absorve o tiro). A raiz é fixa — nem o tranco do tiro pesado a arrasta. Travada pelo elétrico, congela na pose.
- **As regras puras** — `src/elitesRegras.ts`: `tentaculoAvanca`, `tentaculoRaizX`, `tentaculoAfundado`,
  `tentaculoExposta`, `tentaculoMira`, `tentaculoTrio`. Os números em `ELITES.tentaculo`.
- **As conferências** — `node scripts/test-elites-regras.mjs` (9 dela) e `node scripts/probe-elites-f3.mjs tentaculo`
  (10 dela, no relógio manual: atrás das placas, parada com o casco correndo, 2 trios com atraso, a nave no vão, a boca
  morde onde a nave estava e não morde quem saiu, não sobra corpo). Tudo verde em 11/10, com `npm run typecheck`.
  ⚠️ A metade da LULA da sonda roda em tempo real e falhou 1 vez em 4 (a rajada contou 6 agulhas) com a máquina
  carregada — ela não foi tocada; rode de novo antes de desconfiar do jogo.
- **O GIF em jogo** — `node scripts/_elites/_gif.mjs <saida.gif> tentaculo 7 2` (a nave fica no vão e desvia do bote).

## 4. Depois do teste dele

1. Fechar as três coisas do §1 e o que mais ele trouxer; reinstalar a arte se mexer nela.
2. O nome dela (e então renomear `tentaculo` de uma vez: tipo, chaves, arquivos, sandbox, roteiro, sondas).
3. Jogar a F3 inteira no roteiro (t=63,5 e t=75): ninguém jogou a campanha com ela ainda — só o sandbox e a sonda.
4. Aprovada: tirar o "em teste" do §3.4 da spec, e a fatia F3 fecha → **F4** (Larva Mecânica + Tubo Pulsante) →
   frente C (a calibragem das cartas).

## 5. Anotado — para depois

- A explosão de morte dela sai no PIVÔ (na crista), não no meio do corpo.
- A mira dos espinhos não passa de 60° da horizontal (`miraMaxGraus`): com a nave quase em cima dela, o vão não fica
  centrado na nave.
- Os anotados do START de 07/10 (a leitura da lula no ato 1, a cor das agulhas, a tinta parada) seguem valendo.
- Os concept PNGs soltos na raiz (`concept art Inimigos.png`, `concept art de Inimigos Sci‑Fi.png`) são dele: não
  commitar nem apagar sem ele mandar.
- Nada desde `2ccd49c` (07/10) foi empurrado — só ele decide o push; nunca para o remoto `legacy`.

## 6. Lições desta sessão

- **O que o cenário esconde se desenha ATRÁS da camada real** — nunca recortado numa linha reta: a beirada da arte
  não é reta, e a diferença vira fresta.
- **O fundo do demo engana:** o recorte de 06/10 tinha a nebulosa laranja atrás; arte escura se julga em jogo, sobre o
  fundo mais escuro que ela vai encontrar.
- **Deslocar um tiro de fileira se faz AO LONGO da mira**, não em x: em x a fileira anda de lado e o vão fecha.
- **Tratamento de imagem assado + medidas geradas:** o jogo só troca de quadro; pivô, hitbox e pontos de saída vêm
  medidos da própria arte, com uma folha que desenha as caixas para conferir no olho.
- **Recomendar antes de fazer a conta custa retrabalho:** a regra do casco "rolando" parecia a escolha óbvia até somar
  os tempos do ciclo.
