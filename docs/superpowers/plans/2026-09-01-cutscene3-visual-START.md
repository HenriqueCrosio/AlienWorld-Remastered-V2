# START — Fatia 6: CUTSCENE 3, TESTE JOGADO DA 2ª VOLTA

**🟠 A 2ª VOLTA FOI JOGADA UMA VEZ (2026-09-05), TRÊS COISAS CAÍRAM E FORAM CONSERTADAS. FALTA
JOGAR DE NOVO.** Branch `feat/cutscene3-visual`. **O último commit de CÓDIGO é `94a3660`**; o que
veio depois é documentação. **Não mergeada e não empurrada** — `main` segue em `392eedf`.

> ⚠️ **ESTE DOCUMENTO MUDOU DE MÃO PELA TERCEIRA VEZ, EM 2026-09-04.** Ele nasceu mapa de quem ia
> IMPLEMENTAR a fatia; em 02/09 virou mapa de quem ia TESTÁ-LA; em 03/09 voltou a ser mapa de quem
> implementa (a 2ª volta); e agora, com a 2ª volta de pé, volta a ser **mapa de quem TESTA**.

## O QUE MUDOU DEPOIS DO 1º TESTE JOGADO (2026-09-05)

| o que ele disse | o que foi feito |
|---|---|
| *"Retire completamente a nadadeira (...) não faz diferença no final das contas"* | **Saiu inteira** — textura, chave, método, constantes do pivô e assert. O bloco de teste dela saiu daqui junto. |
| *"Por que o modelo que eu criei está estranho e sem cor?"* | A lei de cor girava **52% dos pixels** dele de azul para lodo, com um motivo que não se sustentava (o ciano do jogador é 188°, o casco dela é 220–260°). A peça entra **CRUA** agora: média 31,8 / pico 207. |
| *"A animação de idle funciona. O da morte, não"* | Ela funcionava — em **480ms**, escondida debaixo da própria explosão. Agora são **1.040ms**, com a explosão no ponto de impacto. |

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md`. A 2ª volta da Fatia 6 foi
> jogada uma vez em 2026-09-05 e as três reprovações foram consertadas. Sobe o `npm run dev`, abre
> a Cutscene 3 e me guia pelo teste bloco a bloco. Não conserta nada antes de eu julgar."**

---

## COMO ABRIR A CENA

```bash
npm run dev
```

No navegador, com o jogo aberto, no console:

```js
window.__game.scene.stop('Menu');
window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', ship: 'arauto' });
```

A cena dura ~16s até o painel de naves, e o beat final leva mais ~6s depois da escolha.

---

## O QUE JULGAR — cinco blocos, na ordem em que aparecem

### 1. A GARGANTA, desde o primeiro quadro

A criatura na direita é **a arte que você fez** (objeto PixelLab `15f111fd`, face `south`), em
**136×137 nativos**, sem um pixel de estica. Ela pisa no convés (`DECK_Y` = 171), cobre x 262..398,
oclui a janela #5 inteira e quase toda a #4, e **respira desde o quadro zero** — durante a queda, a
derrapagem e o painel de escolha.

- Ela lê como um CORPO dentro do hangar, ou ainda parece colada na parede?
- ⚠️ **A COR É A SUA, CRUA.** Média **31,8** e pico **207**, contra uma pintura de média 13,1 e teto
  prático ~110. Ela é a coisa mais clara da tela por uma margem larga — foi a sua decisão em 05/09
  (*"quero a cor que foi criada, a original, sem tint"*), e é o que precisa de veredicto agora:
  **ela grita contra o fundo, ou está no ponto?**
- ⚠️ **O ENQUADRAMENTO MUDOU E VOCÊ PRECISA JULGAR ISSO.** O spec pedia "altura inteira"
  (y 8..199, 191px). Sua arte tem 137px, e esticar quebraria a grade de pixel — então o
  enquadramento cedeu para a arte. Ela ficou menor do que a opção C que você aprovou. **Serve?**

### 2. ⚠️ O RISCO ABERTO — a nave parada em cima dela

A nave derrapa e para em **x=258**. A criatura começa em **x=262**. Durante os ~10 segundos do
painel de escolha, a nave fica encostada na borda esquerda dela, e as duas são escuras.

**A silhueta da nave some?** Esta foi uma decisão sua em 04/09 (a alternativa era puxar o convés
inteiro para a esquerda), tomada com o mock na mesa e o risco anotado. É o momento de julgar.

### 3. O BEAT FINAL — a corrente causal

Escolha uma nave e assista. A ordem é:

| t | o que tem que acontecer |
|---|---|
| 0 | a nave sobe do convés e **recua** para x=150, encarando a garganta |
| +600ms | **dispara** um torpedo CIANO com aletas — não o traço magenta de sempre |
| +1000ms | **impacto**: a boca dá um flare magenta e apaga até virar buraco preto, em **1,04s** — a explosão estoura na BORDA dela, não em cima |
| +1200ms | a cadeia corre **de x=330 para x=8** — 10 estouros, direita → esquerda |
| +2000ms | a nave voa **para dentro da boca**, encolhendo, e some no miolo |
| +2700ms | o entulho cai e mura a esquerda |

- O banner `A ENTRADA ESTÁ COLAPSANDO` agora chega **no impacto**, não antes. Ele lê como legenda
  do que você viu, ou ainda parece a causa?
- ⚠️ **O tiro é ciano, e isso rompe o contrato do magenta de propósito.** É o único tiro da
  campanha que sai da nave do jogador numa cutscene, então ele veste a paleta dele. Aceita?
- A nave sumindo DENTRO da boca lê como "engolida", ou como bug?

### 4. O ENTULHO — frota engolida, não pedra

São **4 peças biomecânicas novas** (casco com osso dentro), nas **mesmas 9 posições medidas** da 1ª
volta. O tamanho e a cor estão assados no arquivo: escala 1, zero `setTint`.

- Elas lêem como restos da frota, ou ainda como pedra genérica?
- A ordem de queda inverteu: dentro de cada fiada elas entram da **direita para a esquerda**,
  acompanhando a onda. As fiadas continuam de baixo para cima. Lê como desabamento?

### 5. AS LUZES — 100% código, zero arte nova

As **17 lâmpadas já estavam pintadas** na sua arte (186 pixels no total). O código só pôs brilho
aditivo em cima, cada uma na **cor medida dela**.

- 14 respiram, **3 falham** (mau contato, com apagão curto). Dá para ver a diferença?
- No colapso **todas viram alarme** em uníssono, com a cor puxada para o `enemy`. Lê?
- Há 3 emissores de faísca nas junções da parede. Aparecem de menos? De mais?

---

## O QUE JÁ ESTÁ PROVADO — não precisa conferir no olho

| prova | estado |
|---|---|
| `probe-cut3-visual` | ✔ 45 asserts, tudo verde |
| `probe-interlude3` | ✔ `DECK_Y` 171 / nave em 164 — intacto |
| `probe-stage4` | ✔ a fronteira com a Fase 4 de pé |
| `probe-f3-visual` | ✔ (tem ruído documentado: se falhar por contagem de lança-mísseis, rode de novo) |
| `probe-menu` | ✔ |
| `npm run build` | ✔ `tsc --noEmit` limpo |
| `hangar.png` | ✔ 160×160, `git status` limpo, `usamHangar: 0` |

⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.

---

## SE ALGUM BLOCO FOR REPROVADO

**Não conserte antes de o Henrique julgar todos os cinco.** A 1ª volta ensinou que dois blocos
podem cair juntos por motivos diferentes (a nadadeira caiu por arte E por movimento, separadamente,
e no fim caiu por escopo), e consertar o primeiro antes de ouvir o resto refaz trabalho.

Anote o veredicto bloco a bloco, com a **frase literal** dele, e só então decida o que é spec novo
e o que é conserto.

---

## A BANCADA

⚠️ Os PNGs de conferência em `scripts/_cut3/` **não são versionados** — são bancada. Os scripts,
sim:

| script | o que faz |
|---|---|
| `_paleta.mjs` | a LEI DE COR da fatia. ⚠️ Ela vale para peça **gerada**; a garganta é arte do Henrique e entra CRUA (ver `_instalar-garganta.mjs`) |
| `_paleta-familia.mjs` | a linha de comando da lei, peça a peça |
| `_png8.mjs` | escreve PNG indexado — é o que faz a imagem de estilo caber no base64 da chamada MCP |
| `_estilo-garganta.mjs` | monta a imagem de estilo. Herança da 1ª tentativa: a peça que ficou é a do Henrique, sem redesenho |
| `_diag-morte.mjs` | amostra a cena a cada 80ms e diz se uma animação é **VISTA**, não só se ela entra |
| `_instalar-garganta.mjs` | baixa estático + as duas animações, recorta TUDO pela mesma caixa e **não toca na cor** |
| `_instalar-destrocos.mjs` | as 4 peças de entulho: limpa, assa o tamanho, assa a cor |
| `_medir-lampadas.mjs` | acha as 17 lâmpadas pintadas e imprime o array pronto |
| `_med-south.mjs` · `_mock-garganta.mjs` | mediram a face `south` e a geometria antes de uma linha ser escrita |
| `ver-cena.mjs` · `_ver-colapso.mjs` · `_ver-detalhe.mjs` | regeram as tiras de conferência |
| `reduzir-sprite.mjs` | assa o TAMANHO no arquivo (a lei 1px de arte = 1px de jogo) |

---

## ⚠️ A FRONTEIRA — continua valendo, e agora vale para a Fatia 7

`public/sprites/hangar.png` é a parede de fundo da **Fase 4** (`Parallax` modo `interior`), que é a
**Fatia 7**. **Não pode ser tocado.** Provas a cada rodada: 160×160 · `git status` limpo nele ·
`usamHangar: 0` na sonda da fatia · `probe-stage4` verde.

⚠️ **E `destroco`/`destroco2`/`destroco3` também não.** São o casco à deriva das Fases 2 e 3
(`DebrisSystem`), e nesta sessão o instalador do entulho quase os comeu por escolher o mesmo nome —
as peças da cutscene se chamam `entulho1..4`.

---

## O ORÇAMENTO DO PIXELLAB

Em 2026-09-04 o ciclo virou e reabasteceu para **5.000**, com a próxima virada em **2026-10-04**.
A 2ª volta gastou **107** (40 delas em duas gerações descartadas da criatura, antes de o Henrique
mandar usar a arte que ele já tinha). Orçamento não é restrição.

---

## ONDE ISSO CAI NO ROADMAP

```
0–5  ✅ fechadas e mergeadas
6    🟠 Cutscene 3 — 2ª volta IMPLEMENTADA, aguardando teste jogado   ← VOCÊ ESTÁ AQUI
7    ⬜ Fase 4 — o interior (⚠️ mexe em GEOMETRIA, não só em pintura)
8    ⬜ Cutscene final + as duas baleias erradas que ainda estão na F3/F4
```

Depois das fatias, na ordem já fechada: **calibragem** → **balanceamento** → **playtest humano de
todas as fases** → placar (Supabase) → deploy.

---

## O REPOSITÓRIO

`origin` = **github.com/HenriqueCrosio/AlienWorld-Remastered-V2**.
⚠️ O remoto **`legacy`** aponta para o repositório ANTIGO — **nunca empurre para ele**.
