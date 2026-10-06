# START — retomada da FRENTE B: os elites da F2 (depois de 05/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-05-elites-retomada-START.md`. A fatia F2
> dos elites está jogável com a arte dele e empurrada; vou analisar o GIF v3 da sentinela e jogar o sandbox e a F2."*

## 0. ✅ 06/10 — A FATIA F2 FECHOU (aprovada); agora a F3

O retorno dele ao v3 e o que entrou (commits `923ec61` → `32f725c`):

- **Menos punição** (memória `elites-pressionam-sem-punir`): rajada do drone a 0,3s (não mais "fila indiana"), 5
  estilhaços, o leque do fogo com 2 tiros em 36°, a varredura com ~7 tiros em 100°. Um ciclo da sentinela: ~9 tiros.
- **Os canos da sentinela** acompanham o corpo no disparo (coice de 4px) e na sobrecarga (sobe 2px): o
  `_instalar-anims.mjs` mede o deslocamento do corpo por quadro e cola os canos do quadro parado deslocados.
- **O escudo com VIDA** (pedido dele): `escudoHp` 8 por ciclo; o `bloqueia` recebe o dano (caminho único
  `ferirInimigo`), `escudoAbsorve` é regra pura; quebrado, ela fica exposta até o próximo ABRIR. Pisca a cada golpe,
  enfraquece e estoura em lascas.
- **Os tiros DESENHADOS** (`scripts/_elites/_folha-tiros-elites.mjs`, folha em `folhas/2026-10-06/elites/tiros/`):
  minigun M-C (7×1 vermelho, só a ponta acesa) — a minigun tem DOIS canos (linhas 27 e 31 da arte), um tiro do leque
  de cada; balaço P-A (9×3) do canhão de cima; cristal C-C do drone; estilhaços em losango C-A.
  `PadroesDeTiro.vestirArte` dá a hitbox própria (o `release` devolve a do `bolt2`, 13×9).
- **Lição:** no Windows o sharp segura o arquivo aberto — para recodificar um GIF no lugar, leia com
  `fs.readFileSync` antes. E `interFrameMaxError` vai só até 32 (24 + 96 cores deixa o GIF em ~2–3 MB).

**Próximo: a fatia F3** (Caçador de Vácuo na nebulosa + Tentáculo do casco), o mesmo método.

## 1. 📍 O PONTO MARCADO — ele ANALISA o v3

Tudo de 05/10 está **commitado e empurrado** (`feat/cartas-preview`, sem merge). O que espera o olho dele:

1. **`folhas/2026-10-05/elites/sentinela-orbital-v3.gif`** — a luta nova da sentinela (os dois tiros e a varredura).
2. **`folhas/2026-10-05/elites/drone-mineracao-v2.gif`** — o drone na rocha 1, o olho acendendo no alerta.
3. **Jogar:** `http://localhost:5173/?sandbox` (fase 2, "drone de mineração (elite)" e "sentinela orbital (elite)" na
   montagem) e depois a **F1** (ondas maiores) e a **F2** inteira (~97s até a Capitânia).

Os números todos estão em **`src/data/numerosElites.ts`** — é ali que a calibragem dele mexe.

**Depois do aval dele:** a fatia F2 fecha → a **fatia F3** (Caçador de Vácuo na nebulosa + Tentáculo do casco), com o
mesmo método (arte de perfil → comportamento → ondas → ele joga).

## 2. A frente B, em uma tela (spec `specs/2026-10-05-frente-b-elites-design.md`)

- **2 ELITES por fase** em F2, F3 (um por ato) e F4; a **F1 não ganha elite** (fase do flap) — ganhou ONDAS MAIORES.
- **Mob elite NO FLUXO**, nunca arena: aparece 2–3× (a 1ª sozinho), a fase pode crescer mas não para. Palavras dele:
  *"o que eu procuro são mais inimigos atirando contra"*.
- Elenco: **F2** Drone de Mineração + Sentinela Orbital · **F3** Caçador de Vácuo + Tentáculo do casco · **F4** Larva
  Mecânica + Tubo Pulsante. Reserva: Serpente de Nébula. Fora: o Carrapato (colado na nave ficaria com ~10px).
- Os conceitos dele: `folhas/2026-10-05/elites/conceitos/` (cópias das duas folhas que estão na raiz).

## 3. O que a sessão de 05/10 fez (plano `plans/2026-10-05-frente-b-fatia-f2.md`, Tasks 1–10)

**A base (vale para os seis):** regras puras em `src/elitesRegras.ts` (`test-elites-regras`); números em
`src/data/numerosElites.ts`; padrões de tiro em `src/systems/PadroesDeTiro.ts` (mirado/leque/anel — a aranha usa o
anel); **o dano em inimigo por UM caminho** (`GameScene.ferirInimigo`: tiro, bomba e cartas perguntam ao escudo antes —
`EnemySystem.bloqueia`); a base de elite em `src/entities/elites/` (`ComportamentoElite`, delegação no `EnemySystem`,
texturas provisórias nas chaves da arte); as medidas do sandbox contam os BLOQUEIOS; o **primeiro plano atenua (25%)
com elite em cena** (`Parallax.setForegroundElite`).

**Drone de Mineração** (`DroneMineracao.ts`): MINERANDO dentro da cratera do geodo (o rabisco dele) → ALERTA (a broca
recolhe e o OLHO ACENDE, 0,65s) → ATAQUE (vem de encontro atirando rajadas de 3, olho aceso) → PISCA → explode em raio
com estilhaços em anel. **Morto no pisca, não explode.** A rocha deixa passar o tiro na FAIXA do drone (senão a janela
de matar antes sumia — o overlap com os destroços roda antes do com os inimigos). Arte: drone C a 70%, rocha 1 inteira
(80×78) com a pedra escurecida; animações minerar / alerta / voo.

**Sentinela Orbital** (`Sentinela.ts`), a S2 com PROPULSORES: ROLANDO (roda R3) → ABRIR (escudo em arco à frente) →
**FOGO** (como o golfinho: a **bola PESADA** lenta do canhão de cima — a `bulletOrb` — alterna com o **LEQUE leve** da
minigun, a cada 0,6s) → **SOBRECARGA** (o escudo CAI e a minigun VARRE de cima para baixo: a 2ª janela vulnerável) →
FECHAR → rola para outro posto; 3 ciclos e vai embora. ~14 tiros por ciclo (eram ~50: *"está soltando muita coisa"*).
Animações abrir / pairar / disparo / sobrecarga / fechar; as luzes dos canos acalmadas (copiados do quadro parado).

**O roteiro:** a F2 vai a ~97s — drone apresentado sozinho aos 13s (e cobrado aos 47s e no ENXAME), sentinela sozinha
aos 64s (e no ENXAME, no lugar da 2ª canhoneira). A F1 ganhou volume de drone e batedor (canhoneiras seguem 2).

## 4. Anotado — para depois

- **Sugestão dele:** o tiro do drone virar **CRISTAIS laranja** (a cor que ele minera).
- **Rebalanceamento (frente C):** o ELÉTRICO desfazer o escudo da sentinela (adiado por ele); a trava do elétrico pausar
  o relógio do estado dos elites (regra provisória); o tranco do pesado nos elites; elétrico + pesado = "muito
  roubados"; a recarga do míssil (8s/5s).
- **Sondas que já falhavam em 04/10** (conferido na linha de base, não é da frente B): `probe-stage2` (a nave parada
  morre aos 37s) e `probe-chain` (o chefão da F1 fica vivo).

## 5. Como testar

- `npm run dev` → `http://localhost:5173/?sandbox` (e `/` para a campanha).
- **Node:** `node scripts/test-elites-regras.mjs` (TUDO OK).
- **Sonda:** `node scripts/probe-elites.mjs` (13/13: o drone na cratera, a janela de matar antes, o pisca, o escudo
  segurando tiro e míssil, os dois tiros do fogo, a sobrecarga, ≤25 tiros por ciclo, a saída).
- **GIF em jogo:** `node scripts/_elites/_gif.mjs <out.gif> drone|sentinela [seg] [zoom]` (o grão da Atmosfera deixa o
  GIF pesado — re-codificar com `interFrameMaxError`, ver o histórico desta sessão).
- **Arte:** `scripts/_elites/` — `_gerar.mjs` (candidatos no PixelLab), `_folha*.mjs` (folhas em jogo),
  `_tratar.mjs` (escurecer / reduzir com paleta / achar a cratera), `_escudo.mjs` (o escudo à mão),
  `_instalar-anims.mjs` (instala os clipes: caixa comum, olho aceso, luzes acalmadas).

## 6. Lições desta sessão

- **O PixelLab copia o TAMANHO da imagem de estilo** (`generate-image-v2`): com a própria rocha D de estilo, a "maior"
  saiu 52×50 de novo. Para crescer, use a rocha pequena do jogo como estilo e o candidato como referência.
- **Peça que ENCOSTA na borda do quadro sai CORTADA** (reta de um lado, lasca do outro). Peça *"margem vazia em volta"*
  e confira a caixa: largura aparada = largura do quadro é corte.
- **Animações de um mesmo bicho numa CAIXA COMUM** (a união de todos os quadros), senão ele pula ao trocar de clipe; e a
  hitbox FIXA quando o quadro inclui chama/clarão (`vestir(e, chave, corpo)`).
- **"Atirar" no PixMiniMax transforma o cano inteiro em clarão**: recolorir deixa o contorno oco — copie os canos do
  quadro parado. O clarão de boca é do código.
- **Reduzir pixel art**: lanczos + cada pixel de volta à paleta ORIGINAL + alfa em 50% (sem cor nova, sem borda mole).
- **Sondas:** a bola que pulsa troca de textura (`bulletOrbAnimN` — use `startsWith`); a nave na linha COME os tiros
  mirados antes da contagem; não embrulhe o mesmo método duas vezes (contou em dobro); sondas em paralelo deixam a
  `probe-mina` instável (rodada sozinha passa 3/3); e confira no jogo o que a sonda diz — o "tiro real no escudo" passou
  sem nenhum tiro bater até as medidas contarem os bloqueios.
- **Script Python longo num heredoc do bash pode ser cortado** — escreva num arquivo e rode.
- **Campo da cena zera no `create`** (a instância é reaproveitada): o `eliteEmCena`.
