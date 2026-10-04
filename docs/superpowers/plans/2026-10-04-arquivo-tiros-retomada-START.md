# START — retomada depois do 2º lote das peças, do Arquivo de Cartas e dos tiros laser (depois de 04/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-04-arquivo-tiros-retomada-START.md`.
> Tudo de 04/10 está aprovado e empurrado; vamos começar a FRENTE B (inimigos que atiram + ondas maiores) por
> brainstorming."*

## 1. 📍 O PONTO MARCADO — começar a FRENTE B

Tudo da sessão de 04/10 está **aprovado, commitado e empurrado** (`feat/cartas-preview`, sem merge). Nada pendente de
olho dele. A próxima frente é a **B — inimigos novos que atiram + ondas maiores** (a ordem dele de 01/10: A = catálogo
✅ → **B** → C = calibragem). Abre por **brainstorming** (comportamento do inimigo antes de arte).

O que já se sabe (memória `pendente-cartas-vs-dificuldade`, conferido no código em 01/10):
- As cartas deixam as fases fáceis — *"as fases vão ser passeios no parque"*.
- A ideia dele: **um inimigo que voa DE ENCONTRO ao jogador e ATIRA**.
- Hoje só atiram a `canhoneira` (6 aparições na campanha, 1 por onda) e as torres do terreno (F1 e o casco da F3);
  drone, batedor, kamikaze, cargueiro e água-viva são só de contato.
- O ELÉTRICO (trava 0,4s) é a resposta direta aos atiradores — a frente B é onde ele ganha sentido.

## 2. O que a sessão de 04/10 fez (tudo aprovado)

**O 2º lote das peças** (spec do catálogo §5.1e):
- Os tamanhos dele: flare 75% (a lata acesa, animada), eletrificado 75%, queimando 75%. A faísca #17 saiu.
- **Elétrico = o raio em código estalando ~0,4s no corpo e DEPOIS o anel #29 por 0,4s** (*"agora sim ficou ótimo"*);
  **queimando = a chama #12 por cima, sem tint**. Os estados moram em `EstadosNoInimigo`.
- A explosão do míssil alien repintada na manta.

**O míssil** (§4.3): deixou de ser automático (*"apelão demais"*) → **tecla Q** (clássico **V**), recarga 8s (×2: 5s),
HUD "MÍSSIL Ns". A saída cai da barriga, estabiliza virando o nariz e acende rápido no alvo travado; sem inimigo o Q
não gasta; perdeu o alvo = explode no ar em 0,4s.

**O tranco do Tiro Pesado**: ~8px por acerto (máx. 1 a cada 0,25s por inimigo); aranha metade; chefão não recua.
**O Perfurante perde força**: 100% → 90% → 60% → 30% e o tiro acaba.

**O ARQUIVO DE CARTAS** (spec `specs/2026-10-04-arquivo-de-cartas-design.md`, plano `plans/2026-10-04-arquivo-de-cartas.md`):
a wiki das skills no MENU (*"como o LoL"*). O menu virou lista (COMEÇAR / ARQUIVO DE CARTAS); a tela tem a grade dos
24 ícones, a ficha (descrição DIRETA revisada por ele, os números e a tecla) e um **clipe em loop** de 21 cartas
gravado em jogo. **Os números das cartas moram num endereço só: `src/data/numerosCartas.ts`** — o jogo e a ficha leem
de lá (a calibragem mexe ali).

**Os Propulsores = o JATO AZUL** na nave humana (T0–T3) — `scripts/_jato-azul.mjs`, animação `…-thrust-azul`,
`GameScene.tocarMotor`. O ícone deles ganhou a ponta da chama.

**Os TIROS BASE viraram LASER** (folhas em `folhas/2026-10-04/tiros/`): 7×1 à mão, só a ponta acesa, nas cores de
cada linhagem, **sem o halo** (era ele que engrossava o traçante) — *"ficou perfeito"*. `WeaponDef.semHalo`.

**A EXAUSTÃO do T1 humano** (o jato — antes a "chama" eram luzes piscando com as asas): a chama B à mão
(`scripts/_exaustao-jato.mjs`, originais em `folhas/2026-10-04/exaustao/original/`).

## 3. Anotado para o REBALANCEAMENTO (frente C)

- **Elétrico + Tiro Pesado juntos = "muito roubados"** (cada um sozinho está bom).
- A recarga do míssil (8s / 5s) é chute; o ×2 pode virar 2 cargas.
- Os números todos estão em `src/data/numerosCartas.ts`.

## 4. Como testar

- `npm run dev` → **http://localhost:5173/** (↓ + Enter = o Arquivo) e **http://localhost:5173/?sandbox**.
- Teclas: **Espaço** tiro · **Shift** bomba · **E** dash · **F** flare · **Q** míssil (clássico Z/X/C/F/V) · dev **1–6**.
- **Testes em node:** `test-numeros-cartas` · `test-cartas-regras` · `test-catalogo-cartas` · `test-sandbox-arvore` ·
  `test-controles` · `test-bomba-regras` — todos `TUDO OK` em 04/10.
- **Sondas:** `probe-arquivo` (nova) · `probe-cartas-novas` · `probe-sandbox` · `probe-teclas` · `probe-cartas` ·
  `probe-bomba-queda` — todas passaram em 04/10.
- **GIFs:** `node scripts/_gif-cartas.mjs <out.gif> <cenários> [seg] [modos] [nave]` (`GIF_ZOOM`, `GIF_TIER`).
  **Os clipes do Arquivo:** `node scripts/_gif-cartas.mjs --clipes [ID,...]` — regravar depois de mudar arte/número.

## 5. Lições desta rodada

- **NÃO edite `src/` enquanto uma gravação (GIF/clipe) roda**: o Vite recarrega a página e derruba a captura.
- **O `g.step` do Phaser já DESENHA o quadro**: mexer num objeto depois do passo não aparece na foto — o efeito tem
  de ser desligado na causa (ex.: zerar o `invulnerableUntil` no golpe, não forçar `setVisible` depois).
- **A instância da cena é REAPROVEITADA entre gravações**: o que o script troca nela (ex.: `damageShip` vazio) fica para
  a próxima — pegue o original da CLASSE (`Object.getPrototypeOf(s).damageShip`).
- **Os clipes desligam o cenário que passa na frente da nave**: os detritos (`spawnHazards`) e o primeiro plano
  (`parallax.setForegroundDimmed(true, 0)`) — a rocha cobria a explosão do flare.
- **Teclado: um evento, uma vez (WeakSet)** — o ↓ do menu andava duas casas; vale para TODA tela que escuta teclas.
- **A Silkscreen não tem `▸ ◂`** (sumiam) — use `> <`.
- **Arquivo com CRLF** (o `MenuScene`): edição por script em Python não casa; use o Edit.
- **"Mais fino" em pixel não é "mais comprido"**: o tiro já tinha 1px de altura (o mínimo); o que afina é quantos
  pixels ACENDEM e tirar o halo. Mostrar sempre o de HOJE na folha para comparar.
- **Pixel de fogo na traseira nem sempre é motor**: no T1 eram luzes — perguntar/olhar a animação antes de recolorir.
- **Comparação justa por GIF**: estados forçados em tempos fixos e sorte fixa (`Math.random` semeado), senão os
  painéis divergem no 1º acerto.
