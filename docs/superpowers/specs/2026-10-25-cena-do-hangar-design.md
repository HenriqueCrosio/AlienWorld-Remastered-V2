# A cena do hangar — design

> 25/10/2026, à noite. Ele: *"Eu gerei essa imagem nova do hangar ... na esquerda tem uma nave ... com a turbina ligada
> e tem umas estruturas finas saindo do motor, você consegue retirar isso? Caso fique bom: você pode montar uma cena de
> pré abertura, que será o início e a escolha inicial das naves, pensei na cena do hangar, com uma seta que o jogador
> muda para a esquerda ou direita e escolhe a nave. Mas a cena precisa ter o nível de vida existente na cena do menu,
> mas quero que você utilize bastante fog no cenário atrás, para parecer mais as luzes do que detalhes, focar na escolha
> da nave e não no cenário."* As escolhas são as 4 de `2026-10-25-naves-do-hangar-design.md` (ele: *"gostei da cor
> osso ... pode manter as cores para as naves (4 no total)"*).
>
> Folha: `folhas/2026-10-25/hangar/hangar.html` (o filme em `filme/`).

## 1. Onde fica

- **Fluxo:** menu → COMEÇAR → **Hangar** → F1. Os atalhos 1/2/3 do menu continuam indo direto para a fase (as sondas
  usam), e ESC no hangar volta ao menu, já pousado.
- **A escolha:** ←→ (A/D) leva a seta de uma nave à outra. ↑↓ (W/S) troca a pintura da nave escolhida, e a nave
  estacionada é repintada na hora (uma varredura). ENTER/ESPAÇO confirma: `escolherNave(registry, …)`, o motor da
  escolhida acende, o anel do pad estoura, o véu fecha e a F1 começa.
- **A seta entra** na nave que está no registry (a última escolhida).

## 2. A pintura dele

O arquivo é `assets/raw/Hangar Futurista com Caças Estacionados.png` (1774×887): o jato à esquerda, a "a" à direita.

- **A limpeza** (`scripts/_hangar/_limpar-nave.mjs`) mexe só no jato, 321 px:
  - as duas hastes finas saem para a parede de trás;
  - a boca acesa do motor vira metal apagado;
  - o reflexo vermelho embaixo também sai.

  A "a" também tem uma haste fina saindo do motor. Ela ficou, porque ele não pediu.
- **As camadas** (`scripts/_hangar/_camadas.mjs`, em k4 e k1):
  - o recorte 16:9 tira 98 px de cada lado;
  - o **bloco** do hangar (a baia, os pilares, o deque e as luzes de baixo) fica nítido;
  - **fora dele, a névoa vem assada:** a pintura desfocada, puxada à cor da névoa, mais densa quanto mais longe do
    bloco, e com as luzes mantidas (o núcleo e um bloom);
  - **as naves** são recortadas em cada pintura. Só os pixels quentes e coloridos mudam: o osso dessatura, a laranja
    satura, a preta vira grafite. O vidro e o trem de pouso ficam;
  - **os anéis** dos pads são recortados pela elipse;
  - **as luzes** (`dados.json`) são agrupadas: quentes, faróis (vermelho de verdade, com algum azul) e as lâmpadas
    frias. As que caem em cima de uma nave ficam de fora.

## 3. A vida (no nível do menu, `docs/CENARIO-VIVO.md`)

- **Fora do bloco:**
  - faixas de bruma passam atrás do bloco (a baia as cobre);
  - as luzes de fora viram halos que respiram, e as pequenas tremulam;
  - os faróis piscam, os vizinhos juntos.
- **Na baia:**
  - halos baixos nas faixas âmbar;
  - cones de luz fria descem das lâmpadas do teto, com a poeira da Atmosfera dentro;
  - uma bruma rala na frente, embaixo do deque.
- **A escolha:**
  - a seta é pixel art âmbar com contorno, balança devagar e desliza entre as naves;
  - o anel do pad acende;
  - a nave de fora fica na sombra.
- **A Atmosfera:** o perfil `escolha`, com névoa fria e alta, halo âmbar e poeira fria caindo devagar.
- **O texto:** na voz do piloto, com as setas `< >` e `^ v` (a Chakra Petch não tem ←→).

## 4. O código

- `src/hangar/numerosHangar.ts`: os números (lados, pinturas, nomes JATO/CAÇA, tempos, cores).
- `src/hangar/escolha.ts`: o estado e as funções puras do relógio.
- `src/hangar/cenarioHangar.ts`: as camadas e as peças vivas.
- As cenas:
  - `src/hangar/HangarCenaHD.ts`: a cena de fundo na camada HD;
  - `src/scenes/HangarScene.ts`: a cena do mundo, com relógio, teclas e texto, e o fallback em k1 sem a camada.
- Ligações:
  - `main.ts`;
  - `BootHDScene` (carrega o k4);
  - `uiHD` (a voz `Hangar: 'piloto'`);
  - `MenuScene.confirmar`;
  - `perfis.ts` (`escolha`).
- Testes:
  - `scripts/_hangar/_testar-hangar.mjs` (o fluxo com teclas de verdade);
  - `_ver-hangar.mjs` (fotos, com `--semhd`);
  - `_filmar-hangar.mjs` (o filme da folha);
  - `scripts/probe-menu.mjs` (o Enter passa pelo hangar).

## 5. Junto com a cena: o balanço saiu de todas as naves

Ele: *"não faz sentido deixar uma movimentação de flutuando em naves que voam no espaço ... retirar ou diminuir de todas
as naves"*.

- **A "a":** `BALANCO_PX = 0` em `_nave-molde-preta.mjs`.
- **O jato:** travado pelo nariz (`scripts/_naves/_jato-sem-balanco.mjs`, a partir dos quadros originais de 04/10). A
  chama B foi redesenhada sobre o corpo parado, e as asas continuam batendo.
- **A manta** segue nadando: o movimento dela são as nadadeiras.

## 6. Em aberto (dele)

- Ver o filme e jogar. **26/10: ele gostou** (*"Eu gostei do hangar e dos efeitos. Muito bom."*).
- Os nomes na tela: **26/10, decididos por ele** — X-AELO (o jato), TERMINUS (a "a"), CHARYBDIS (a manta); ver
  `2026-10-26-morte-da-nave-design.md` §6.
- Se a haste do motor da "a" também sai (ele não respondeu).

## 7. 26/10 (noite): o nariz aceso e os nomes das pinturas

Ele: *"quando passo a seleção para a terminus e a luz sai da x-aelo, o bico fica com luz ainda. O mesmo parece acontecer
com a terminus"*.

- **A causa:** o recorte da nave (`mascaraNave` em `_camadas.mjs`) deixava partes dela na baia, e a baia não apaga:
  - na X-Aelo, a caixa terminava em x 694 e o cone do nariz vai até ~722;
  - na Terminus, a regra só pega pixel quente ou neutro, e o cone prateado, os realces da cabine e os bocais são
    frios.
- **A correção** é pontual:
  - a X-Aelo ganhou uma `ponta` (x 694–728, só a faixa do nariz, y 428–466). A caixa da seta não mudou;
  - as duas naves ganharam as peças FRIAS: um pixel frio mais claro que qualquer parede perto delas (brilho > 48; a
    parede mede ≤ 46) que encosta na nave entra no recorte, acima do piso (y < 480);
  - o escuro dessas peças fica de fora, porque ele lê como a parede, aceso ou não.
- **A prova:**
  - a caixa da nave é reduzida exatamente como antes, e a ponta à parte, colada do lado;
  - fundo, baia, anéis e `dados.json` ficaram idênticos;
  - nas naves só mudaram a faixa da cabine e o nariz (k4: x 89–309 / y 33–75 na X-Aelo, x 6–211 / y 44–74 na
    Terminus), e a nave escolhida (acesa) ficou igual à de antes.
- **Os nomes das pinturas** (dele, *"referências para as obras que eu admiro"*; `NOME_PINTURA` em `numerosHangar.ts`):
  - a laranja é a **CLÁSSICA** nas duas naves;
  - o osso da X-Aelo é a **REBELS** (Star Wars);
  - a preta da Terminus é a **UNGOLIANT** (Tolkien).
  - Primeiro foram REBELD e MORDUR. Ele trocou porque, em maiúsculas na tela, podiam ler como erro de digitação.
- **Os nomes internos** (`jato-osso`, `a-preta`…, no registry, no sandbox e na linha de dev do menu) não mudaram.
