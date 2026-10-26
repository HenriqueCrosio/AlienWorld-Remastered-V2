# A escada humana nova, tirada do concept — design

> ⚠️⚠️ **E à noite mudou de novo:** o molde passou a ser a PRETA "a", e o hangar escolhe entre a "a" (laranja/preta) e
> o jato (a T1 antiga, na pintura dele ou de osso). Ver `2026-10-25-naves-do-hangar-design.md`.

> ⚠️ **SUBSTITUÍDO no mesmo dia (25/10, à tarde): os tiers saíram do jogo.** Ele: *"ainda nao consegui gostar das
> evoluções ... minha decisão talvez seja de retirar os tiers e trabalhar apenas com 1 tipo de nave, exatamente como
> aparecem no primeiro hangar e depois a manta no seu tier maximo"*, e depois *"As estrelas ou peças podem ficar
> dropando, para o player conseguir a vida extra"*. O que valeu deste spec: a forma (a laranja "a"), as duas pinturas
> (§4, a preta medida e instalada com K 0,8) e a pintura no código (§5, sem o tier). As rodadas 1 e 1b da escada
> (`folhas/2026-10-25/escada/`) ficam como histórico. O que entrou no jogo:
> - a humana é a "a" da F1 ao fim, na pintura do hangar (`scripts/_naves/_nave-unica.mjs`: a chama à mão em 8 quadros
>   e a azul; a preta pela tabela do §4); [H] no menu (dev) e o sandbox trocam a pintura até o hangar existir;
> - a manta é a dos chifres abertos (a antiga T2), no cadastro (`SHIPS.alienigena`) — a doca mostra a nave com que o
>   jogador sai;
> - as peças viraram ESTRELAS e caem em toda F1–F3; a coleção dá só o 1-UP; o HUD mostra as 3 no canto superior
>   direito, vazias, e cada uma pega preenche (a ideia dele);
> - as cutscenes que mostram o jato (`SHIPS.humana.texture`) não mudaram — trocam quando ele aprovar a "a" jogando.
> - Teste: `scripts/_naves/_testar-nave-unica.mjs` (substitui o `_testar-tiers.mjs`) e `scripts/probe-pecas.mjs`.

> 25/10/2026. Decidido com ele na conversa, sobre a folha `folhas/2026-10-22/naves-conceito.html`:
> - **a forma é a laranja "a"** (`naves/cru/conceito/gerado/laranja-48x32-21-00.png`), e as duas pinturas têm a MESMA forma
>   ("pode seguir com a forma da laranja a");
> - **a T0 e a T1 saem dela**, pelo **caminho 1**: recortar a própria "a" (o caminho 3, o PixelLab, só onde o recorte não
>   ficar bom);
> - **a pintura é escolhida no começo do jogo**, numa cena de hangar que **ele faz**. Eu ligo a escolha no código ("pode
>   ligar você");
> - **ele vê os concepts da T0 e da T1 antes de qualquer coisa entrar no jogo.**

## 1. O que é

A humana troca a escada inteira (T0 → T1 → T2) por uma família tirada do caça do concept dele, em duas pinturas: a
**laranja** (a original) e a **preta** (o extra). Os tiers seguem só no visual; a hitbox (21×9) e a arma não mudam.

## 2. A forma — rodada 1 (só concepts, fora do jogo)

A "a" num quadro 48×32, desenho 41×22 em (3,5), 403 px, 35 cores. As peças, em coordenadas do quadro:

| peça | onde |
|---|---|
| a chama (pintada) | x 3–9, y 14–19 |
| o bocal | x 9–14, y 14–19 |
| o corpo | x 10–42, y 13–19 (a barriga escura em y 17–18) |
| o nariz de agulha | x 36–43, y 15–17 |
| a cabine | x 28–32, y 13–14 |
| a asa grande de cima | x 10–19, y 5–13 |
| a aleta de trás | x 6–10, y 9–13 |
| a asa de baixo | x 11–20, y 19–26 |

A escada, nos tamanhos de hoje (as medidas da escada atual: T0 33×15, T1 38×20, T2 41×22):

| tier | alvo | o que tem |
|---|---|---|
| T2 | 41×22 | a "a" inteira |
| T1 | ~38×20 | sem a aleta de trás, asas menores, corpo mais curto |
| T0 | ~33×15 | o corpo, a cabine, o nariz e o bocal; as asas só como tocos |

- **Como se faz:** tirar as peças à mão (apagar e redesenhar a junta onde a peça saía, nunca corte reto) e encurtar o
  corpo com `scripts/_naves/_encolher.mjs` (costuras de pixel repetido; nenhum pixel muda de cor). Onde a junta ou a
  costura deformar o nariz, a cabine ou uma asa, corrigir à mão; só se não der, inpaint no PixelLab.
- **3–4 opções por tier**, variando quais peças ficam e o tamanho delas.
- **A folha** `folhas/2026-10-25/escada/escada.html`: as opções ampliadas e em 1× lado a lado com a "a" e com a escada de
  hoje, numeradas. **Nada plantado no jogo nesta rodada** (o pedido dele). Cada opção conferida ampliada antes de entrar
  na folha.
- Ele escolhe uma por tier. Só então seguem as rodadas 2 e 3.

## 3. O motor — rodada 2

- A T2 de hoje anima ~30 px por quadro: a chama e algumas luzes. A escada nova faz o mesmo.
- **A chama** se desenha em pixel, à mão (peça pequena), no bocal da "a": 8 quadros, em laranja e na variante azul dos
  Propulsores (`<anim>-azul`, lida em `GameScene`). O bocal é o mesmo nos três tiers, então a mesma chama serve a todos.
- **As luzes** que piscam: poucas, à mão, nos pontos claros da "a" (a luz amarela da asa de baixo, a cabine).
- A chama pintada da "a" sai do still; o still fica com o quadro 0.

## 4. A preta — rodada 2

- É a laranja repintada: uma tabela de cor laranja → preta tirada da preta "a" (por tom, do mais escuro ao mais claro),
  aplicada a todos os quadros; a chama fica intacta.
- A cabine em âmbar (a decisão de 23/10, igual à preta de hoje).
- **O casco clareia** até medir 1,5× ou mais na F3 com `scripts/_naves/_contraste-jogo.mjs` (a laranja mede 1,8×; a preta
  "a" crua, 1,03–1,13×).
- A rodada 2 termina numa folha com as duas pinturas, os três tiers, e um GIF de cada em velocidade real.

## 5. A pintura no código

- **O estado:** `pintura: 'laranja' | 'preta'` no `registry` do jogo, padrão `'laranja'`. Um par de funções em
  `src/ships.ts` (`pinturaDaNave(registry)` / `escolherPintura(registry, p)`) — é o que a cena do hangar dele chama.
- **O visual:** `visualDaNave(id, tier, pintura)` devolve a textura e a animação da pintura; a alien ignora a pintura.
- **Todo lugar que mostra a humana** passa a usar `visualDaNave` com o tier e a pintura:
  - `GameScene` e `Interlude4Scene` (já usam; ganham a pintura);
  - a chegada nas cutscenes `InterludeScene`, `Interlude2Scene` e `Interlude3Scene` e o painel da Doca (`ShipPanel`) — hoje
    mostram sempre o jato (`SHIPS.humana.texture`), qualquer que seja o tier. Isso é um defeito que já existe e a escada
    nova corrige.
- **Para testar até o hangar existir:** uma tecla de teste no menu (só em dev) troca a pintura, e o sandbox ganha a
  opção (`src/sandbox/config.ts`).

## 6. A instalação — rodada 3

- **Os arquivos** em `public/sprites/naves/`: `humana-t{0,1,2}.png`, `-anim-0..7`, `-azul-anim-0..7`, e o mesmo com
  `-preta` (`humana-t1-preta-anim-3.png`). Os quadros de hoje: T0 52×26, T1 e T2 44×26, com o centro da caixa de
  desenho no mesmo lugar que o tier de hoje (a hitbox e a boca do tiro continuam em cima da nave).
- **A T1 ganha arquivo próprio**; o `shipJato` fica, porque a nave `jato` do róster antigo ainda usa.
- **As artes de hoje da T0 e da T2 não se apagam:** vão para `assets/raw/naves-humana-2026-10/` (a pintura preta da
  família A, guardada em `naves/encolher/preta/`, fica onde está).
- `BootScene` carrega os seis conjuntos; `TIERS.humana` aponta para eles.

## 7. Como se confere

- Cada rodada: uma folha, cada peça aberta ampliada antes; da rodada 2 em diante, GIF em velocidade real.
- Rodada 3: `npm run typecheck`; `scripts/_naves/_testar-tiers.mjs` (peças e textura por fase e tier, nas duas pinturas,
  sem erro de carga); a hitbox e a boca do tiro desenhadas sobre cada tier; as cutscenes da Doca e do Leviatã mostrando
  o tier e a pintura certos; o contraste das duas pinturas em F1–F4 (`_contraste-jogo.mjs`).
- Nada entra no jogo sem a aprovação dele.

## 8. Fora deste trabalho

- A cena do hangar e a passagem do menu para ela (dele). Quando ela existir, só chama `escolherPintura`.
- A rodada 3 das naves, as mantas menores (perguntar a ele quando).
- A T3 (saiu em 23/10).
