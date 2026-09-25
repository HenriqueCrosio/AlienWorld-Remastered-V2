# A ATMOSFERA — o motor de tratamento atmosférico das cutscenes (1ª aplicação: a cutscene final)

**Data:** 2026-09-25 · **Branch:** `feat/cutscene-final-visual` (entra na Fatia 8, antes do merge) · **Estado:** aprovado

## 1. O pedido

> *"quero que a cutscene final (conjunto dos capitulos) passem por um tratamento. Com particulas, luminosidade,
> efeitos, tudo pensado para deixar mais atmosferico e imersivo. Fog, luz, granulação"*

> *"curva dramática, pode seguir. Mas quero que todos os capitulos sejam densos, pois o momento é pesado. Pode variar
> na curva dramatica, mas nao tire completamente a densidade"*

> *"pode seguir com a 1 e torne isso uma engine para aplicarmos depois nas outras cutscenes"*

## 2. As decisões, e de onde vieram

| Decisão | Origem |
|---|---|
| **Direção C · híbrido**: névoa, halo e poeira em pixel com dither + uma camada de câmera (correção de cor, vinheta, grão) que amarra os sete capítulos num tom só | folha `folhas/2026-09-25/atmos-abc.png` (A/B/C sobre o 1º quadro de cada capítulo) — *"gostei de todos, mas podemos seguir com o hibrido"* |
| O comportamento no tempo: névoa em 2 camadas derivando e se transformando, poeira flutuando, halo respirando, grão trocando a 12 fps | prévia `folhas/2026-09-25/atmos-c-mov.html` (caps 1, 4 e 6) — aprovada |
| **Curva dramática com piso de densidade** (nenhum capítulo abaixo de 0,6) | as palavras dele acima |
| **Construção: um shader de pós-processamento** que transcreve a matemática da prévia, em vez de folhas assadas | escolha 1 de 3 — a névoa que se transforma pediria dezenas de quadros de tela cheia por ambiente, e a correção de cor não se assa |
| **Um motor reutilizável**, com perfis nomeados; as outras cutscenes o adotam depois | pedido dele |

⚠️ **Por que um shader não contraria a lição de 17/09** (`efeito-de-cena-assado-em-pixel`): o que ele reprovou foi
traço vetorial antisserrilhado e degradê liso. A câmera renderiza em **384×216 nativo** (`pixelArt: true`,
`Scale.FIT` só amplia o canvas), então o shader roda pixel a pixel na resolução do jogo, e **todo termo de névoa e
halo sai quantizado em Bayer 4×4** — o mesmo resultado da prévia que ele aprovou. Só a vinheta, a correção de cor e o
grão são contínuos, como na C aprovada.

## 3. A arquitetura

```
src/systems/atmosfera/
  AtmosferaPipeline.ts   o shader (PostFXPipeline) — só matemática, lê uniforms
  Atmosfera.ts           o controlador que a cena usa — câmeras, poeira, perfis, transições, fade
  perfis.ts              os perfis nomeados — só números
```

### 3.1 `AtmosferaPipeline` — o shader

Um `Phaser.Renderer.WebGL.Pipelines.PostFXPipeline` registrado uma vez no renderer (`pipelines.addPostPipeline`) e
posto na câmera principal da cena (`camera.setPostPipeline`). Na ordem, por pixel:

1. **Névoa** — duas camadas de fbm (3 oitavas de value noise), a de trás mais larga e lenta, a da frente mais fina e
   rápida; cada uma com velocidade própria (px/s, x e y) e uma evolução lenta no tempo, para mudar de FORMA e não só
   deslizar. A densidade cresce para baixo (`altura`: o expoente do gradiente vertical). O valor é quantizado em 3
   degraus com Bayer 4×4 e mistura a cena com a `corNevoa`, até `0.42 × densidade`.
2. **Halo** — o que é quente e aceso (`r > limiar` e `r > g × 1,3`, igual à prévia) é amostrado numa janela 7×7 com
   passo 2 (~raio 6 px), a soma é quantizada em 4 degraus com Bayer e SOMADA na cor da luz, com `forcaHalo`
   respirando (`± 20%`, ciclo de 2,4 s). Lido da imagem: quando a lava esfria, o halo apaga junto, sem código novo.
3. **Correção de cor** — sombra puxada para o petróleo, luz para o âmbar, na medida de `grade` (0 = nenhuma).
   `gradeQuente` escala só a parte âmbar (o capítulo 7 a esfria).
4. **Vinheta** — contínua, `vinheta` = quanto escurece a borda.
5. **Grão** — ruído gaussiano aproximado (soma de 3 hashes), monocromático, amplitude `grao`; a semente troca a
   12 fps (`quadroGrao`), o passo do filme.

Uniforms: `tempo`, `quadroGrao`, `resolucao`, e os números do perfil corrente (seção 3.3). O shader não conhece
capítulo nem cena.

### 3.2 `Atmosfera` — o controlador

```ts
const atm = new Atmosfera(scene, { limiteLimpo: DEPTH.TEXTO });
atm.perfil(PERFIS.viscera);            // corte: troca seca
atm.perfil(PERFIS.apagando, 4600);     // transição: interpola todos os números
atm.update(dt);                        // no update da cena
atm.fadeOut(ms);                       // fade das DUAS câmeras
atm.estado();                          // lido pela sonda: { ativo, perfil, densidade, grao, ... }
```

- **A câmera limpa.** Uma segunda câmera, sem pipeline, desenha só o que tem `depth >= limiteLimpo`; a principal
  ignora esses objetos. A triagem roda a cada quadro sobre a display list (os capítulos criam e destroem objetos o
  tempo todo; olhar por profundidade dispensa cada capítulo avisar). Na cutscene final, `limiteLimpo = DEPTH.TEXTO`:
  **o banner fica limpo, a nave fica DENTRO do tratamento** (na prévia ela assentou no ar da cena; limpa, pareceria
  colada).
- **O fade.** `fadeOut` aplica nas duas câmeras. A regente troca o `cameras.main.fadeOut` por `atm.fadeOut`.
- **O tremor.** O `cam.shake` do impacto age na principal; o texto não treme (nenhum texto está na tela no impacto).
- **A poeira.** Um emissor de partículas de 1 px (textura 1×1 gerada uma vez), com quantidade, cor, deriva e
  cintilar vindos do perfil, na profundidade logo abaixo de `DEPTH.NAVE`. Ela passa pelo shader, então recebe névoa
  e grão como o resto.
- **Os perfis.** `perfil(p, ms = 0)` guarda o de origem e o de destino e interpola número a número (cores
  componente a componente) no `update`. `ms = 0` é o corte seco.
- **Sem WebGL** (renderer Canvas): o construtor detecta, não cria nada, e todos os métodos viram no-op —
  `estado().ativo === false`. A cena roda como hoje. Mesma guarda do `preFX` no `EnemySystem`.
- **Limpeza.** Ouve o `shutdown` da cena: remove a pipeline da câmera, destrói a câmera limpa e o emissor.

### 3.3 `perfis.ts` — os números

```ts
interface PerfilAtmosfera {
  nome: string;
  nevoa: { densidade: number; cor: [number, number, number]; altura: number;
           velTras: [number, number]; velFrente: [number, number]; evolucao: number };
  halo: { forca: number; limiar: number; cor: [number, number, number] };
  grade: number; gradeQuente: number;
  vinheta: number;
  grao: number;
  poeira: { quantidade: number; cor: [number, number, number]; deriva: [number, number]; espalhar: number };
}
```

As cores de névoa e de halo são amostradas OFFLINE dos fundos de cada ambiente (o mesmo cálculo da prévia: névoa =
média dos tons médio-escuros ×1,5 + um toque frio; luz = média do que é quente e aceso) e gravadas como constantes.
A prévia media a cada quadro; o shader não pode, e o fundo de cada capítulo é fixo, então a constante é equivalente.

## 4. A curva da cutscene final

**Piso: `nevoa.densidade >= 0.6` em todo perfil desta cena.** A sonda cobra.

| Caps | Perfil | Névoa | Grão | Vinheta | O caráter |
|---|---|---|---|---|---|
| 1–2 · convulsão, estouro | `viscera` | 1,0 · vermelho-escura · alta (cobre a tela) | 1,0 | 0,6 | sufocante; a poeira é fuligem e brasa |
| 3 · descompressão | `visceraSuccao` | 1,0 · as duas camadas correndo para a direita, rumo ao rasgo (`RASGO_X` 204; ~40 e ~70 px/s) | 1,0 | 0,6 | o ar sendo arrancado |
| 4 · a ferida | `vacuo` | 0,75 · violeta fria · baixa | 0,85 | 0,5 | poeira fria e lenta; o halo pega a lava da ferida |
| 5 · a queda | `vacuoQueda` | 0,7 · a do 4, mais fria | 0,85 | 0,5 | o rastro de fogo acende o halo |
| 6 · o sobrevoo | `superficie` | 0,9 · cinza-azulada · baixa (rente ao chão) | 0,9 | 0,55 | cinza caindo devagar |
| 7 · a luz se apaga | `apagando` (transição de 4,6 s a partir de `T.APAGA`) | 0,8 | 1,0 | 0,7 | `gradeQuente` → 0 (o âmbar sai); o halo apaga sozinho com a lava |

Os números são o PONTO DE PARTIDA, calibrados na folha e ajustados no olho dele; a regra é o piso e a forma da curva
(dentro > superfície > espaço, nunca abaixo de 0,6).

**Onde entra.** A regente (`Interlude4Scene`) cria a Atmosfera no `create`, chama `atm.update(dt)` no `update` e
troca o fade. Cada `montar*` recebe a Atmosfera pelo `CenaFinal` (novo campo `atm`) e escolhe o perfil ao montar; o
sobrevoo agenda a transição para `apagando` em `T.APAGA - T.SOBREVOO`.

## 5. Os testes

- **`probe-interlude4`** ganha, por capítulo: `atm.ativo === true` (a sonda roda com WebGL via SwiftShader), o nome
  do perfil esperado, `densidade >= 0.6`, e no sobrevoo o banner fora da câmera principal e dentro da limpa. Segue
  cobrando `faltando === 0`.
- **Folha por relógio de parede** (`_ver-final.mjs`) do começo de cada capítulo com o tratamento real, comparada à
  prévia aprovada — o shader tem de ler como a prévia.
- **Fechamento da Fatia 8** como já previsto: `npm run build`, `probe-interlude4`, `probe-stage4`, `probe-menu`.

## 6. Fora do escopo

- Aplicar nas cutscenes 1, 2 e 3 — uma fatia própria depois; o motor nasce pronto (só perfis novos + 4 linhas na cena).
- Aplicar nas fases jogáveis.
- Luz dinâmica por objeto (normal maps, sombras) — o halo lido da imagem cobre o pedido.

## 7. Os riscos

| Risco | O que fazemos |
|---|---|
| O shader não ler como a prévia (a prévia media a cor por quadro) | as cores saem da mesma conta, feita offline; a folha lado a lado decide |
| Custo do halo em máquina fraca (49 amostras × 83 mil px) | na resolução nativa é pouco para GPU; se pesar, cai para 5×5 |
| A sonda rodar lenta com o shader no SwiftShader | medir; se pesar, a sonda tolera a folga de tempo, não desliga o tratamento |
| Um capítulo criar texto abaixo de `DEPTH.TEXTO` | a regra é da profundidade; texto novo nasce em `DEPTH.TEXTO` |
