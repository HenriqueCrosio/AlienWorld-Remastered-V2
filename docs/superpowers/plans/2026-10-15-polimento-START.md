# START — POLIMENTO F1–F4: blocos A e B fechados, próximo é o bloco C (depois de 15/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `docs/superpowers/plans/2026-10-15-polimento-START.md`.
> Vamos para o bloco C do polimento."*

## 1. 📍 O PONTO MARCADO

- **14/10 — a análise.** Ele pediu, antes de um pós-processamento, uma análise cuidadosa de F1 a F4 e das cutscenes do
  que pode ser POLIDO (*"quero que me mostre primeiro, mas analise tudo antes"*). O relatório tem 16 itens, cada um com
  a causa medida e a solução: `docs/superpowers/folhas/2026-10-14/polimento/index.html`.
- **15/10 — bloco A, APROVADO** (*"ficou melhor e resolveu, deu um ar de mais polido"*). Folha:
  `folhas/2026-10-15/polimento/index.html`.
  - Item 1: saíram as silhuetas `derelict` da F4 (as bandas atrás da borda e as vigas de primeiro plano). Ele sabe que
    a fase perdeu profundidade; um primeiro plano PRÓPRIO da F4 vai para o bloco C.
  - Item 5: a F3 perdeu os cascos e o cinturão da F2, e as pontas do `belt`/`belt-2` foram esfareladas.
  - A `costela.png` ficou com os tendões recuados das bordas do quadro (pedido dele).
  - Itens 2 e 3: as `f4-faixa-c`/`f4-faixa-b` foram roladas meia peça e a costura foi feita por inpaint. **Os degraus
    da borda do duto são jogo e ficaram intocados:** só a pintura mudou, a forma nunca.
  - Os originais estão em `assets/raw/*-original.png`.
- **15/10 — bloco B, APROVADO por GIF** (*"boa … aprovado"*): o esfíncter preso ao tecido, com o item 4 junto. Folha:
  `folhas/2026-10-15/esfincter/index.html` (§6 = o que está no código).
  - **A causa:** ele nascia 56px depois do centro do pilar da junta, que tem 37,6px de meia largura. Ele mora ATRÁS da
    borda (−0,65) e o pilar fica na FRENTE (−0,54), então o pilar cortava o corpo dele numa linha reta.
  - **O esfíncter** nasce a 80px do pilar (`GameScene.GARGANTA_DEPOIS_DO_PILAR`) e continua atrás da borda. Na frente
    ele foi testado e REPROVADO: *"as raízes dão a base, mas a parte de baixo e de cima do esfíncter atravessam as
    raízes"*.
  - **Raízes B** à mão (`scripts/_polimento/_raizes-esfincter.mjs`), no violeta-escuro com veias magenta. O
    azul-petróleo do corpo dele é a cor exata dos ladrilhos da borda D, e a 1ª versão sumia na parede.
  - **Trepadeira B** na ponta do pilar da soleira. Ela pertence ao PILAR (`Moldura`, `juntaVestida` no evento t=109
    do `STAGE_4`), e por isso entra na tela com ele. Só esse pilar é vestido.
  - **O tubo de gás sai de dentro da trepadeira** (escolha dele entre duas opções): fica à frente do pilar e atrás do
    tecido (`Esfincter.CANO_NO_PILAR`). A nuvem e a zona do tiro ficaram onde estavam (`NUVEM_ADIANTE`).
- **Rebalanceamento (anotado por ele):** o rabo da F3 *"chegou rápido demais"*. Medido em tempo real: entra aos
  38,2s, como o roteiro manda desde 27/08 (t=38). Nada mudou no jogo; se mudar, é decisão de ritmo dele. A opção
  levantada é o rabo em ~45s, o ato 2 empurrado o mesmo tanto e mais conteúdo no ato 1. Decidir junto com o rabo
  colossal (bloco C).
- **COMMITADO em 15/10, NÃO empurrado** (ele pediu commit, não push), em `feat/cartas-preview`:
  - `50ef5e9`: o código e a arte dos blocos A e B;
  - `a3bca24`: as ferramentas e as folhas;
  - o commit dos docs (este START e o HANDOFF).
  - Ficaram FORA, no disco: os `jogo-*.gif` (vão para o backup), as tiras de fotos cruas das folhas de 15/10
    (`esfincter/{cru,cru-cano,cru-frente,gif-antes,gif-depois,gif-frente,gif-final}/`, ~80 MB, e as
    `polimento/a*-antes|depois.png`) e os `concept art*.png` da raiz.
  - Commit só quando ele pedir e só no nome dele, sem Co-Authored-By. Push só quando ele pedir, e nunca para `legacy`.

## 2. O PRÓXIMO: o bloco C

1. **Item 6, o rabo do Leviatã colossal** (hoje `raboLeviata` com `setScale(3.4)`, pixel gordo). A intenção dele é
   **ESPANTO PELO TAMANHO**: *"imagina o tamanho de um leviatã espacial que você consegue voar dentro"*. A vista é
   lateral, com a batida da nadadeira de lado. É arte nova (rodada de geração), feita na resolução nativa e sem
   aumentar nada. Decidir junto o tempo do rabo na F3 (§1).
   **✅ 16–17/10, NO JOGO:** o rabo novo é a M2 (nadadeira de tubarão da D + casco da B + lava da A), 16 quadros de
   368×248 em escala 1 (`public/sprites/rabo-leviata-sheet.png`, a 7/s). O gesto é a tomada 2 do PixMiniMax limpa das
   bordas brancas; o corpo aparente inteiro enverga com o pivô virtual a 500px, com a luz por normais no corpo e na
   nadadeira. O ciclo de ida e volta foi REPROVADO. Folha: `folhas/2026-10-16/rabo/`. **Ainda em aberto:** o tempo do
   rabo na F3 (§1) e o Leviatã do menu (`leviathan-swim-sheet`) e da cena final (`f8-leviata`), que seguem com a
   nadadeira de baleia.
2. **O primeiro plano próprio da F4**, que repõe a profundidade perdida no item 1: orgânico, quase preto, sem cruzar a
   linha da superfície da borda. Também é rodada de geração.
3. **Item 7, as peças ampliadas acima de 1** (pixel gordo). A lei: assar na resolução nativa; reduzir pode, aumentar
   nunca.
4. **Item 8, o destroço cinza da F2 dentro do Leviatã.** Em 15/10 ele também apareceu na F4, perto da soleira, em
   algumas rodadas (visto na tira `gif-final`, t≈109,9).

Pela regra dele: **arte com direção clara → gerar 3–4 conceitos e mostrar a folha, sem brainstorming antes.** A folha
é aprovada antes de a peça entrar no jogo, e o julgamento final é por GIF em jogo.

**Depois do C:** os itens de média e baixa (9 a 16: a fumaça de bolinhas dos chefões, os rótulos "(LEGACY)/(NEW)" no
HUD, a tela final, o subtítulo do menu, os flashes de tela cheia, a explosão chapada da cutscene 1, os drones
encavalados, as setas das dicas) e então o **pós-processamento**, que foi o motivo da análise.

**Pendentes dele, sem pressa:** jogar a F4 da rodada de 14/10 (START `plans/2026-10-14-f4-rodada-START.md`) e a F3
inteira.

## 3. As ferramentas (`scripts/_polimento/`, todas com `npm run dev` rodando)

| Para quê | Comando |
|---|---|
| Uma tira de fotos de um trecho, com um JS opcional na cena em t0 (mock em memória) | `node scripts/_polimento/_sequencia.mjs <fase> <t0> <t1> <passo> <prefixo> ["js com s"]` |
| GIF antes × depois a partir de duas tiras iguais | `node scripts/_polimento/_gif-par.mjs <antes> <depois> <out.gif> [ms] ["rótulo"] ["rótulo"]` |
| Antes × depois de uma correção ao vivo | `_antes-depois.mjs` |
| Quem cobre este pixel | `_quem-cobre.mjs` |
| A campanha inteira em fotos | `_varrer-campanha.mjs` |
| Tempo REAL (cutscenes, letreiros, quando algo entra) | `_cutscene-tempo-real.mjs`, `_relogio-real.mjs` |
| Ampliar uma pasta de fotos | `_ampliar.mjs <dir> <out> [k]` |
| Peças à mão (raízes, trepadeira) | `_raizes-esfincter.mjs <out dir>` |

⚠️ **A varredura quadro a quadro roda MAIS RÁPIDO que o relógio real, e os tweens andam no relógio real.** Letreiros,
fades e cutscenes parecem durar 4–7× mais. Tempo se confere em tempo real; a varredura serve para o espacial. (O
letreiro "ESFÍNCTER" que aparece por segundos nas tiras é isso.)

⚠️ No `_sequencia`, o JS roda em t0 e a 1ª foto sai no MESMO quadro, antes de qualquer `postupdate` do mock. Comece a
tira um pouco antes do instante que importa.

## 4. Como se confere

- `node scripts/probe-f4-esfincter.mjs` → sem `FALHA`. Ela cobre, desde 15/10, o pilar vestido, as raízes, os 80px e o
  tubo enterrado na ponta do pilar, entre o pilar e a trepadeira.
- `node scripts/probe-f4-visual.mjs` → as **4 falhas antigas** (sonda velha: as trocas de cenário aparecem como
  `undefined`, e a amostragem roda 0 quadros). Nenhuma nova.
- ⚠️ `probe-f4-moldura.mjs` QUEBRA em t≈50 (`s.terrain` undefined em `lerMesas`). Conferido em 15/10 no código ANTERIOR
  ao bloco B: quebra igual. Não é régua até alguém consertar a sonda.
- `npx tsc --noEmit -p .` → limpo.

## 5. Lições desta rodada

- **O que se prende a uma peça de cenário mora com ela.** A trepadeira nasceu presa à criatura no mock e brotaria na
  ponta de um pilar já visível. Ela foi para a `Moldura`, junto do pilar.
- **Mudar a posição de uma peça arrasta o que é relativo a ela.** O tubo estava a `criatura.x − 62`; com o +24 ele caiu
  sob a trepadeira, e foi ELE quem viu (*"o tubo de gás tá sumido atrás da mesa"*). Ao deslocar uma peça, procure tudo
  que mede a partir dela (`grep` pela constante) antes de gravar o GIF.
- **A cor do corpo pode ser a cor da parede.** O azul-petróleo do esfíncter é o ladrilho exato da borda D: as raízes
  nessa cor sumiam. O que já lia na parede eram as rachaduras do pilar (linha escura com brilho dentro), e foi essa a
  receita.
- **Uma regra herdada não é uma decisão.** O esfíncter ficava atrás da borda pelo pedido da PORTA (20/09), e não por
  causa dele. A pergunta dele (*"por que não na frente?"*) foi testada em jogo e respondida por ele.
