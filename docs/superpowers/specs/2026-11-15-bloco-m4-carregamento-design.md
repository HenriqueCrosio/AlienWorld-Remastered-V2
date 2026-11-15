# Bloco M4 — a tela de carregamento e o favicon (design)

> 15/11. A quarta e última peça da MOLDURA do jogo (M1 ✅ · M2 ✅ · M3 ✅ · **M4**). Decidido com ele, uma pergunta por
> vez; a cena é dele (a pintura e o risco da posição da nave).

## 1. O problema

Não havia tela de carregamento: a página ficava escura enquanto o jogo baixava os assets (`public` tem 65 MB) e pulava
para o menu. A aba mostrava o ícone padrão do navegador.

## 2. As decisões dele

| # | Pergunta | Resposta |
|---|---|---|
| 1 | O que a tela mostra | Uma peça de arte, não só a barra |
| 2 | A cena | *"O jogador sai do hangar na colônia e se distancia dela"*: o hangar ao fundo, já tomado pela tempestade, só a silhueta, a doca aparente pelas luzes. A pintura é dele: `assets/raw/Hangar no Coração da Tempestade.png` |
| 3 | A barra | Na parte mais escura da cena (embaixo), com a silhueta da nave voando da esquerda para a direita até completar |
| 4 | A nave do primeiro plano (a grande, do risco dele) | Fica só a nave da barra |
| 5 | A atmosfera | *"Pesada"*: clarões em vários pontos das nuvens grossas, sem raio desenhado (*"o próprio clarão atrás das nuvens vai deixar a atmosfera pesada e densa"*); mais fog, volumetria, a luz quente do hangar refletindo na neblina |

**O formato (a pergunta dele sobre SVG):** medido em 15/11, a pintura em SVG de grade 384×216 dá 18.822 retângulos,
cerca de 950 KB; o PNG assado na resolução nativa dá 20 KB. A pintura vai em PNG (a regra de todo fundo pintado do
jogo); o SVG fica onde ganha: a nave da barra e o favicon. O SVG de 32×18 que ele tentou era pequeno demais (cada
ponto = 12 px de jogo) e estava incompleto.

## 3. O que o jogador vê

A cena em 384×216, escalada como o jogo. Camadas, de trás para a frente:

1. **O fundo:** a pintura, com a vinheta e o grão assados (esta tela existe antes do jogo e não passa pela Atmosfera).
2. **Os clarões:** seis pontos do céu, cada um no seu relógio (períodos de 7,3 a 16,7 s que nunca se alinham), dois
   batimentos e uma queda lenta. A luz segue a pintura: forte onde a nuvem é fina, e a massa em volta acende por
   dentro; as partes grossas e o hangar ficam em silhueta.
3. **A neblina:** duas faixas que se repetem na horizontal, andando em sentidos opostos, 1 px de jogo por passo.
4. **A brasa:** a luz quente da doca presa na névoa, em fiapos, mais larga para baixo; respira devagar.
5. **As luzes da doca**, pulsando.
6. **A chuva** fina, em riscos de 1 px.
7. **A barra:** uma linha de 1 px na faixa escura de baixo, a parte cheia na cor da nave; a silhueta da X-AELO voa sobre ela; "CARREGANDO" e a porcentagem. A 1ª versão (a TERMINUS em 44 px, com
   borda clara) ele reprovou: *"muito grande e grosseira, pensei em algo mais delicado, mais silhueta e menor"*, e a
   X-fighter *"fica mais elegante como carregamento, pois ela é uma das naves mais antigas"*. Ficou a X-AELO pela
   METADE (22×13, tirada do sprite: um pixel aceso quando 2 dos 4 debaixo dele são nave), num tom só, com um fogo de
   motor de 2 px em dois quadros.
8. **O favicon:** só a nave padrão (a TERMINUS laranja) nas cores dela, com o fundo transparente (pedido dele).

**O fim:** a barra chega a 100%, a nave acelera e sai pela direita, a cena escurece; o menu começa por baixo e a tela é
retirada da página depois que ele desenhou.

**Reduzir clarões** (a aba VÍDEO) e o movimento reduzido do sistema: os clarões viram um brilho lento e fraco; com o
movimento reduzido, a neblina e a chuva param.

## 4. Como é feito

- **A tela mora na página, não no jogo** (`index.html`): está de pé antes de o código do jogo e as fontes chegarem.
  Tudo o que se mexe é CSS (segue liso enquanto a página está ocupada carregando); o JS da página só ajusta a escala e
  expõe `window.__carga` (`progresso`, `sair`, `remover`).
- **`scripts/_m/_carregamento-assar.mjs`** assa as camadas da pintura em `public/carregamento/` (13 arquivos, 74 KB) e
  o favicon (`public/favicon.svg` + `favicon.png`). O pontilhado ordenado foi testado e saiu: ampliado 3×, a malha lia
  como tela de mosquiteiro sobre as nuvens.
- **`src/carregamento.ts`** (o lado do jogo): a barra é a soma pesada dos dois carregadores, depois do passo do código
  e das fontes (`PESO`: 6% + 62% do mundo + 32% da camada HD); `carregamentoAcabou()` completa a barra e espera a
  saída. `BootScene` e `BootHDScene` informam o progresso; o `BootScene.create` só inicia o menu depois da saída.
- **DEV:** `?carregamento=N` segura a tela por N segundos (o carregamento local dura menos de 1 s).

## 5. Os testes

`scripts/test-carregamento.mjs`: a regra da barra (pura) e, no navegador: a tela existe antes do jogo, a barra nunca
volta e chega a 100%, a nave sai, o menu começa e a tela sai da página (segurada, na velocidade real e sem a camada
HD); os arquivos são servidos; "reduzir clarões" acalma. A folha: `_carregamento-fotos.mjs` e `_carregamento-folha.mjs`
→ `folhas/2026-11-15/carregamento/carregamento.html`.

## 6. Fora do escopo

A nave grande do primeiro plano; raios desenhados; som; um tempo mínimo de exibição (em rede rápida a tela passa
depressa, de propósito).
