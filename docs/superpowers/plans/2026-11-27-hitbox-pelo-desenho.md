# PLANO — A colisão da nave pelo DESENHO (o rebalanceamento, etapa 2)

> 27/11. A decisão dele: a colisão pelo desenho (o polygon collider não existe na física Arcade; trocar para o Matter.js
> seria reescrever a física do jogo), **com 1 px de perdão** na nave. A folha da medida: `folhas/2026-11-27/hitbox/folha.html`.
> START: `plans/2026-11-27-rebalanceamento-etapas-START.md` §2.

## A ideia (a mesma da Besta, 25/11, aprovada por ele)

A caixa Arcade continua como a fase LARGA (barata, diz "estão perto"). Quando as caixas se tocam, a fase ESTREITA confere
os pixels: só há golpe se o DESENHO da nave e o desenho do outro caem no mesmo ponto do mundo.

- **A máscara da nave** = o CASCO: nas humanas, os pixels opacos e iguais em todos os quadros da animação (o fogo do
  motor fica de fora); na manta, o quadro na tela (as nadadeiras são o corpo). **Erodida 1 px** (o perdão: um pixel só
  fica se os 4 vizinhos também são desenho).
- **A máscara do outro** = o quadro na tela, com a posição, a escala, o espelho e a ROTAÇÃO dele. Um pixel conta com
  alfa ≥ 128; num sprite de brilho aditivo (ADD), conta só se tem luz (alfa × brilho ≥ 64) — o preto do ADD não é corpo.
- **Sem máscara possível** (a peça invisível cujo desenho é outro objeto — o Caçador, a Larva, o Tubo —, textura que não
  se lê): fica a caixa de hoje. Nunca pior que hoje.

## Os passos (um por vez; teste em jogo + folha/GIF para ele antes do próximo)

1. **O módulo** `src/systems/colisao/`: a máscara pura (montar, interseção, erosão, consulta; teste em node) e a parte do
   Phaser (a máscara de um quadro carregado, a do casco da nave, o "tocam?" entre dois sprites com transformação).
2. **A nave contra os INIMIGOS e os TIROS inimigos** (`GameScene`: os overlaps `ship × enemies` e `ship × enemyBullets`
   ganham o processCallback). Teste em jogo: caixa tocando sem desenho = sem golpe; desenho tocando = golpe; nas 3 naves.
3. **Os destroços e asteroides** (`ship × hazards`): o desenho girando com a pedra.
4. **As peças do terreno, as bordas e os chefões** (o que hoje usa a caixa da nave: `ship × props`, a moldura da F4, o
  chão da F1, a caverna, os chefões que ainda usam caixa).

Fora: o esporo (só deixa lenta) e as peças/estrelas (pegar continua pela caixa, generosa de propósito).

## Registro (27/11)

- **Os passos 1 e 2 feitos** (`src/systems/colisao/`, `GameScene.colisoesPeloDesenho`; testes `test-mascara-pixel`,
  `test-colisao-desenho-jogo`). O PERDÃO: ele escolheu 1 px; medido contra um drone, a área que fere DOBRAVA (×2,0); ele
  jogou `?perdao=2` e ficou: *"Achei justo, está bem mais preciso. Isso é bom"* → **2 px é o padrão** (`?perdao=N` segue
  em dev). Com 2 px, contra o drone, a regra de hoje não feria em 44% / 41% / 33% das posições em que o desenho encosta
  (Terminus / X-Aelo / Charybdis) e feria sem encostar em 23 / 82 / 17.
- ⚠️ **Um erro meu de MEDIDA, corrigido no mesmo dia:** os scripts moviam as peças com `body.reset`, que deixa a caixa
  física no CANTO do quadro, sem o offset, até o próximo passo da física. Toda conta "hoje" (caixa × caixa) e "só a nave"
  saiu torta; as do DESENHO não usam a caixa e estavam certas. Agora `body.updateFromGameObject()`. O jogo não tinha o erro.
- **"É preciso refazer de todos?"** (ele) — medido (`scripts/_hitbox/_medir-categorias.mjs`, já corrigido), as posições
  em que cada regra erra o encosto do desenho:

  | Peça | Hoje (caixa × caixa) | Só a nave (casco × caixa da peça) |
  |---|---|---|
  | Asteroide (0°, 30°, 60°) | 34–43% | 11–21% |
  | Destroço | 38–43% | 23–34% |
  | Rocha do minerador | 34–40% | 23–28% |
  | Rocha e prédio da F1 | 20–34% | 12–22% |

  → nos destroços e no terreno, **corrigir só a nave corta o erro pela metade, mas não basta**: a caixa da peça cobre
  60–70% do desenho e não gira com ela.
- **A opção A dele** (*"quero que o jogador entenda que encostar dá dano, fica feio se ele começar a perceber que pode
  'afundar' a asa no cenário sem tomar"*): as bordas (a F4, a caverna) e o que o chefão morde recebem o CASCO em faixas
  (`cascoMorde`); o corpo dos chefões e do golfinho pelos dois desenhos DENTRO da caixa de toque de cada um (a Serpente
  tem partes escondidas atrás da borda do casco, desenhada por cima dela); o que eles soltam (`perigos`) pelos dois
  desenhos. As explosões por raio (a mina, o elite) e o chão da F1 (uma linha) ficam como estão. Testes
  `test-casco-morde-jogo`, `test-colisao-cenario-jogo`. As BORDAS (a moldura da F4, a caverna da F1), o que o chefão MORDE e a Besta já medem pelo desenho do lado delas:
  ali só falta o lado da nave.
- **Um defeito achado no caminho:** a nave PISCA nos i-frames (invisível em alguns quadros) e a conferência caía na caixa
  nesses quadros; agora a nave usa o casco sempre.

- **Os chefões ficam como estão (a decisão dele, 27/11):** aplicada a A, os testes dos chefões mostraram que as figuras
  foram desenhadas e provadas com a nave de 21×9 — a parede lenta da Besta (*"~6 px of free x for a 21 px ship"*,
  `percorrivel(naveH = 9)`) quebrou (quem segue o corredor tomava dano, a cauda do casco nos estilhaços da coluna já
  passada); os pulsos de lava do Guardião deixaram a nave parada com 2 toques em vez de 8. Ele: *"precisamos manter
  então os chefões como estão, para manter a experiência que já construímos. Aplicar apenas onde a dificuldade vai ser
  de destreza, não de mecânica de luta como nos chefões"*. → **`GameScene.emLuta()`** (um chefão vivo, ou o golfinho):
  durante a luta TODA colisão da nave é a de antes (os overlaps Arcade, a Besta pelo desenho dela contra a caixa da
  nave, a borda da F4 e as mordidas contra a caixa) — inclusive o que entra pelos grupos comuns (os kamikazes e o flak
  da Capitânia, a lava do Guardião). Fora da luta, o casco. A aranha da F3 está no fluxo, não é luta: casco.
- **A TORRE é a exceção (ele, jogando, 27/11):** *"eu quero o 2px no boss da fase 1 (torre), sempre me incomodou eu poder
  'relar' parte da nave nas bolas de fogo"*, e perguntou se eram as bolas ou a permissividade. Medido
  (`scripts/_hitbox/_torre-cometa.mjs`): **os dois** — o círculo que fere ficava no CENTRO do quadro, 3,8 px atrás da bola
  sólida (o corpo Arcade não gira, e o comentário supunha que a bola "orbitava" o centro), e a caixa da nave; hoje um
  erro escondia o outro (a bola encostava sem ferir em 23% / 17% dos encostos, feria sem encostar em 13% / 27% —
  Terminus / X-Aelo); consertar só um lado PIORAVA (33–62%). → `Boss.shoot` põe o círculo sobre a bola girada (uma vez
  por tiro: ele voa reto) e marca `feresoCorpo` (o casco contra o CÍRCULO, nunca o desenho: a cauda segue sem ferir);
  `emLuta()` deixa a F1 de fora. ⚠️ O Arcade ARREDONDA para baixo a metade do corpo circular (`halfWidth` 4 num círculo de
  9,9 px; o `center` 0,95 px fora em x e y): `cascoNoCorpo` usa o círculo exato. Teste `test-torre-cometa-jogo`.
- **Um defeito achado no caminho:** a 1ª versão de `cascoMorde` consultava o retângulo inteiro do casco antes das
  faixas, e a borda torcida do aperto do Guardião é uma TRAVA que a primeira leitura apaga (`BossNucleo.morde`) — as
  faixas não achavam nada. Agora só as faixas.

## O que pode mudar no jogo

Menos golpe "sem encostar" (a caixa sobre o vazio: 19% na X-Aelo, 26% na manta) e golpe onde o desenho encosta de
verdade (o nariz, as asas). O nariz e as asas passam a contar: o jogo fica mais justo e, nas bordas, um pouco mais duro.
A folha-base de 26/11 (os robôs) fica como o "antes".
