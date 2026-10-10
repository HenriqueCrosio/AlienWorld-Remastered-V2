# START — retomada da FRENTE B: o Tentáculo da F3 virou a SENTINELA DO CASCO (depois de 10/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-10-sentinela-casco-START.md`. Vou
> analisar os GIFs da Sentinela (o giro de 15° × 25°) e decidir o que falta antes de ela entrar no jogo."*

## 1. 📍 O PONTO MARCADO — o que espera o olho dele

Ele **ainda não viu** os últimos GIFs. Todos em `docs/superpowers/folhas/2026-10-10/elites/sentinela/`. O nome segue
o padrão `sentinela-{demo|explicada}-<takes idle/espinhos/bote>-g<graus>.gif`; "explicada" é a versão com a faixa de
legenda e os vãos em verde.

| GIF | O que mostra |
|---|---|
| `sentinela-demo-222-g0.gif` / `sentinela-explicada-222-g0.gif` | metade escondida + vermelho escurecido, **sem giro** (a referência) |
| `sentinela-demo-222-g15.gif` / `-explicada-222-g15.gif` | girada **15°** horário — o "um pouco" dele; a boca do bote passa ~40px abaixo da nave |
| `sentinela-demo-222-g25.gif` / `-explicada-222-g25.gif` | girada **25°** — a boca chega na altura da nave, ela fica bem inclinada |
| `sentinela-demo-111.gif` | a 1ª versão (corpo inteiro à mostra, take 1 dos gestos, vermelho cru) — histórico |

**As perguntas para ele, nesta ordem:**
1. O ângulo: 0°, 15°, 25° ou outro (é um número: `GIRO=<graus>`).
2. O vermelho dos espinhos ficou escuro o bastante? (`BRILHO=0.45`; menor = mais escuro)
3. Quanto do corpo à mostra? (`VISIVEL=0.58` da altura acima da crista)
4. O tamanho em jogo: 1:1 tem ~100px de altura (metade da tela de 216). Reduzir?
5. O bote FERE (corpo a corpo) ou é só ameaça visual?
6. **A regra do casco** (spec §3.3): ela toca o casco, então deveria rolar com ele (84 px/s — um ciclo de ~6s anda
   ~500px). O demo a deixa parada. Opções: ela nasce perto da borda direita e o ciclo cabe na travessia (encurtado),
   ou ela fica parada e o casco "freia" enquanto ela está em cena. Precisa da decisão dele.
7. Takes: os GIFs usam o take 2 dos três gestos (o espinhos-1 tem o brilho mais saturado; idle/bote 1 e 2 são
   parecidos). Se quiser comparar, `node scripts/_elites/_sentinela-demo.mjs 1 1 1` etc.

## 2. O que as sessões de 08–10/10 decidiram (com ele)

- **O Tentáculo virou a SERPENTE 63-3** (Pro, gerada INTEIRA — memória `criatura-inteira-vistas-animacao`). Tudo de
  08–09/10 está commitado (até `ff883ee`): rodopio, giro amarrado nas vistas, esticada, o "bote que se torce".
- **10/10 — o bote que se torce foi ABANDONADO.** Duas tentativas novas (A = transfer-outfit dos quadros sobre a 63-3,
  B = deformação por caminho "follow-the-leader") — ele: *"a serpente do rodopio ou da animação não tem nada a ver com
  a que eu escolhi"*; a B *"ficou boa, mas ainda foge do que imaginei"*. Os arquivos ficam como registro
  (`folhas/2026-10-10/elites/a/`, `serpente-A-x-B.gif`, `serpente-rastro-demo.gif`, script
  `_serpente-rastro-demo.mjs`).
- **A direção nova (dele):** *"uma skill mais simples, que mostre o corpo dela inteiro"* → a **SENTINELA DO CASCO**:
  sobe de trás da crista, balança, os espinhos acendem e saem 3 trios retos na nave (com vãos), balança, BOTE, afunda.
  Spec: o §3.4 (em avaliação) de `specs/2026-10-06-frente-b-fatia-f3-design.md`.
- **O retorno dele à 1ª versão:** *"a animação ficou melhor"*; o vermelho dos espinhos *"muito forte, trate a imagem
  para que fique mais escuro"*; *"gostei da animação do ataque, a esticada de corpo está boa"*; o corpo **metade
  escondido** (o rabisco dele: a crista cortando o corpo — *"parece que ela está surgindo da lateral do casco"*); e,
  por fim, **girar a criatura um pouco no sentido horário** para o bote ir mais na direção da nave.

## 3. O que existe

- **A arte** (`folhas/2026-10-10/elites/sentinela/`): `base-256.png` (a 63-3 em (100,72) num quadro 256²); os clipes
  PixMiniMax `idle-1/2`, `espinhos-1/2`, `bote-1/2` (17 quadros 0..16 + `job.json` + `.log`), gerados da base, no
  lugar, voltando a ela; `folha-gestos.png`. Os prompts estão nos `job.json`.
- **O demo** `scripts/_elites/_sentinela-demo.mjs [idle] [espinhos] [bote]` (takes; padrão 1 1 1) → o GIF na pasta
  acima. Variáveis: `GIRO` (graus, padrão 15), `BRILHO` (0.45), `VISIVEL` (0.58), `LEGENDA=1`, `LENTO=<fator>`,
  `QUADROS=<pasta>` (salva cada quadro em PNG). Leva ~1 min por GIF (o RotSprite em 8×).
  - O escurecimento: todo pixel com vermelho dominante desce para o vinho da pose base (os 3 canais juntos — senão o
    miolo rosado vira verde-água) — `apagar()`.
  - O giro: RotSprite (Scale2x ×3 → rotação nearest → o centro de cada bloco 8×8) em volta do PIVO = meio do corpo na
    linha da crista; o deslocamento (OX, OY) mantém o pivô no lugar.
  - Os espinhos: 3 trios nos quadros 6, 8, 10 do clipe de espinhos, cada um saindo da borda da frente dela na altura
    da sua fileira (acima da crista), fileiras 26px separadas no eixo da mira, 85 px/s.
- **No jogo NADA mudou ainda:** `src/entities/elites/Tentaculo.ts` segue com a provisória à mão e o ciclo de 07/10
  (bote sob a nave, mergulho, meia-lua).

## 4. Depois que ele aprovar

1. Fechar o §3.4 da spec com as decisões (ângulo, tamanho, bote fere?, a regra do casco) e escrever o plano.
2. Instalar a arte: assar os quadros já girados/escurecidos/recortados (como o `_instalar-f3.mjs` faz) — o jogo não
   deve girar nem tratar a imagem ao vivo.
3. Trocar o comportamento do `Tentaculo.ts` (ou um `Sentinela`/novo nome — cuidado: a F2 já tem a "Sentinela
   Orbital"; escolher com ele um nome que não colida), regras puras em `src/elitesRegras.ts`, números em
   `src/data/numerosElites.ts`, os espinhos como tiros desenhados; a crista recorta (setCrop, como hoje).
4. Sonda (`probe-elites-f3 tentaculo`) e o GIF em jogo para ele julgar.

## 5. Anotado — para depois

- Os anotados do START de 07/10 (a leitura da lula no ato 1, a cor das agulhas, a tinta parada) seguem valendo; o
  Caçador (lula) não foi reaberto.
- Os concept PNGs soltos na raiz (`concept art Inimigos.png`, `concept art de Inimigos Sci‑Fi.png`) são dele: não
  commitar nem apagar sem ele mandar.
- Nada desde `2ccd49c` foi empurrado (só ele decide o push; nunca para o remoto `legacy`).

## 6. Lições desta sessão

- **Gesto no lugar a partir da arte escolhida segura a identidade** (PixMiniMax com a 63-3 como 1º quadro, 2 gerações
  por clipe em 256²); gesto que TRANSLADA o corpo ou o reconstrói (rodopio, torção, transfer de quadros) vira outro
  bicho. Corpo longo carregado como sprite rígido varre a cauda de lado — só deformação por caminho resolve, e mesmo
  assim "foge" da arte.
- **transfer-outfit-v2 tem teto de quadros pelo tamanho** (32–64px: 15; 65–80px: 8; 81–256px: 3 — um slot é da
  referência) e deriva de estilo entre lotes mesmo com a mesma seed.
- **Girar pixel art em código:** RotSprite (Scale2x ×3) e não nearest direto; e o pivô onde a criatura encosta no
  cenário, para ela não "flutuar".
- **Escurecer brilho:** baixar os três canais juntos; só o vermelho deixa o miolo claro verde-água.
- O `sharp` junta quadros idênticos de GIF (o nº de páginas ≠ nº de quadros): para checar um instante exato, use
  `QUADROS=<pasta>` do demo em vez de ler a página do GIF.
