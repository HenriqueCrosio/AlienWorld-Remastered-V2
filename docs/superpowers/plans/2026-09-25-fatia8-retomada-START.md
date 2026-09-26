# START — FATIA 8 · RETOMADA: A CENA ESTÁ INTEIRA, FALTA O VEREDITO DA ÚLTIMA

**🟠 A FATIA 8 ESTÁ QUASE FECHADA.** Os sete capítulos da cutscene final existem, as baleias erradas saíram do
jogo, e as sondas estão verdes. **Paramos no feedback da última cena (capítulos 6 e 7)**: ele ainda não assistiu à
versão final e não deu o veredito.

**Estado do repositório (25/09):** branch `feat/cutscene-final-visual`, empurrada para o `origin` (V2), **sem merge**.
`main` segue em `c05380c`. Commits de autoria SÓ dele. NUNCA o remoto `legacy`.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md`. A cutscene final está inteira na branch
> `feat/cutscene-final-visual`; paramos no meu feedback da última cena (sobrevoo e a luz que se apaga)."**

---

## 🚦 O QUE FAZER, EM ORDEM

1. `git checkout feat/cutscene-final-visual` · `npm run dev`.
2. **Ele assiste à cena inteira**, pelos dois caminhos:
   - **o real:** `L` → Fase 4 → matar o predador. A cena tem de abrir SEM corte na câmara D (a costura);
   - **o atalho:** `F` no menu.
   Folha dos capítulos 6–7 para ele: `docs/superpowers/folhas/2026-09-23/p6p7-sobrevoo.png`.
3. **As perguntas abertas, uma de cada vez:**
   - o veredito dos capítulos 6 e 7 (o rasante, o banner, a lava esfriando placa por placa);
   - **o corte do M4** (~1,5s no close do flanco jorrando, entre a descompressão e a ferida) — decidido deixar para o
     teste assistido desde a spec; ele ainda não respondeu;
   - a variante do núcleo pulsando: a cena usa a **seed 3**; a 17 só existe pelo `?pulso=17`. Se ele não pedir a 17,
     **tirar o parâmetro de URL de `dentro.ts` e o `f8-pulso-17.png`** (é código de comparação, não de jogo).
4. Os ajustes que ele pedir → sondas → folha por relógio de parede (`node scripts/_f8/_ver-final.mjs <ms,...> <saída>`).
5. **Fechamento:** `npm run build` + `probe-interlude4` + `probe-stage4` + `probe-menu` verdes → o 🧭 do
   `docs/HANDOFF.md` marca a Fatia 8 ✅ e aponta para a CALIBRAGEM → merge `--no-ff` de `feat/cutscene-final-visual`
   em `main` → `git push origin main` **só com o OK dele**.

⚠️ **Ao fechar a 8, o PASSE VISUAL ACABA.** A próxima frente é a CALIBRAGEM (etapa 2 do 🧭).

---

## 🎬 A CENA COMO ESTÁ (~42s)

`src/scenes/Interlude4Scene.ts` é a REGENTE; os capítulos moram em `src/scenes/final/`. Tempos em
`src/scenes/final/tempos.ts` (a única fonte). Sonda: `node scripts/probe-interlude4.mjs` (33 asserts, um por beat).

**A ATMOSFERA (25–26/09, APROVADA):** a cena inteira passa pelo motor `src/systems/atmosfera/` (spec
`specs/2026-09-25-atmosfera-engine-design.md`, plano `plans/2026-09-25-atmosfera-engine.md`): névoa em dither, halo
lido da imagem, correção de cor, vinheta e grão, com a curva dramática por capítulo (`viscera` → `visceraSuccao` →
`vacuo` → `vacuoQueda` → `superficie` → `apagando`) e piso de densidade 0,6. O grão já desceu ~25% a pedido dele.
Calibrar = mexer em `perfis.ts`. Teste: `node scripts/test-atmosfera-perfis.mjs`. Folha: `folhas/2026-09-25/atmos-real-capitulos.png`.
Também em 25/09: o abismo da queda deriva na `DERIVA_ESPACO` (~0,4px/s, a da Cutscene 1) e as luzes do morro não
apagam mais com a carcaça (`LUZES_DO_MORRO` no `_gerar-sobrevoo.mjs`).

| # | Capítulo | ms | Arquivo | De onde vem a arte |
|---|---|---|---|---|
| 1 | **CONVULSÃO** | 0 – 1.500 | `dentro.ts` | a **fotografia do último quadro da luta** (`f8Costura`, feita no `GameScene.victory`) ou, pelo `F`, a `paintBgF4d`; o núcleo pulsa: a pintura animada pela v3 (`_gerar-pulso.mjs`, seed 3) |
| 2 | **O ESTOURO** | 1.500 – 3.500 | `dentro.ts` | corte seco para o rasgado do conceito 2★ (inpaint sobre a câmara D), com o topo fechado por um lábio de membrana (`_gerar-rasgo.mjs`); as bordas se mexem pela v3 (seed 21); a música morre aqui |
| 3 | **DESCOMPRESSÃO** | 3.500 – 8.000 | `dentro.ts` | partículas assadas (`_assar-succao.mjs`) + as vísceras da F4 repintadas em vermelho (`_repintar-pedacos.mjs`); a nave é puxada, encolhe e SOME pela fenda |
| 4 | **A FERIDA** | 8.000 – 16.000 | `fora.ts` | o Leviatã **recortado do conceito 4★** (`_recortar-leviata.mjs`), IMÓVEL e abatido, a lava esmorecendo; o céu é o zero-G espelhado; a nave sai da ferida crescendo |
| 5 | **A QUEDA** | 16.000 – 24.000 | `queda.ts` | o abismo da Cutscene 1 derivando + a mesma lua de perto (gerada com o céu do 4 como referência) + a colônia da F1 reduzida; o corpo do conceito 5★ em 12 tamanhos assados, encolhendo até cair EM CIMA da colônia, à vista |
| 6 | **O SOBREVOO** | 24.000 – 36.000 | `sobrevoo.ts` | o conceito 6★ com o corpo rasgado no meio (inpaint, seed 44, `_gerar-sobrevoo.mjs`); plano fixo; a nave cruza da direita para a esquerda; banner `KEPLER · A COLÔNIA MORTA` |
| 7 | **A LUZ SE APAGA** | 36.000 – 42.000 | `sobrevoo.ts` | a lava da carcaça em 8 estágios, esfriando placa por placa até a última; fade; `GameOver` com o crédito |

---

## 🗣️ O QUE ELE DECIDIU NESTA SESSÃO (23–25/09), COM AS PALAVRAS DELE

- **A câmara D só se reconhece; o rasgo vem logo:** *"podemos até mostrar a camara D inicialmente, mas o rasgo na
  estrutura tem que vir logo depois"* (o capítulo 1 caiu de 5s para 1,5s; a cena toda, de 47s para 42s).
- **As rachas em linha foram reprovadas:** *"essas rachaduras lembram teias"*. O que ficou foi a pintura pulsando.
- **O corte reto no alto do rasgo:** *"existe angulos muito retos… como se houvesse um corte"* → o rasgo fecha por dentro.
- **A nave tem de sumir pela fenda**, não ficar derivando na boca do buraco.
- **O Leviatã de fora fica IMÓVEL, já abatido.** A ferida animada por região foi reprovada: *"parte da cabeça do
  animal fica imóvel e o corpo mexe… essa linha que separa… fica quebrada"*. *"Já temos um movimento, que são
  expelidos do rasgo."*
- **A lua da colônia perto**, com um fundo que já temos: o arranjo *"D com a lua espelhada igual à lua do B"*.
- **A queda em perspectiva:** *"o leviatã é grande, mas não do tamanho de uma lua"* → ele encolhe caindo.
- **O impacto à vista:** *"Eu quero ele caindo nela… o jogador veja ela colidindo com a lua e consequentemente a
  colonia"* · *"um abismo espacial como fundo de primeira camada daria mais profundidade"*.
- **A colônia pequena, a baleia do tamanho dela no impacto, os destroços contidos.**
- **A carcaça do sobrevoo:** *"a original, só com o corpo rasgado no meio, pode sim mostrar partes mecanicas"* — a
  cratera das duas primeiras rodadas foi reprovada (*"slopada e estranha"*).

---

## 🧰 LIÇÕES DESTA SESSÃO (valem para a calibragem também)

- **Partir da arte aprovada, não gerar do zero.** Recortar ou fazer inpaint sobre o conceito que ele aprovou deu
  certo todas as vezes; a geração nova saiu fora do modelo (dentes de tubarão, lua trocada, cratera colada).
- **Animação v3 só com distância PEQUENA.** Animar a própria pintura (pulso, bordas do rasgo) funciona; interpolar do
  intacto ao rasgado inventa manchas chapadas; animar uma REGIÃO de um corpo maior deixa emenda visível.
- **Reduzir no motor cintila a pixel art** → os tamanhos da queda foram ASSADOS (12 passos) e trocados por quadro.
- **Recorte com linha reta aparece.** Borda de máscara, `setCrop`, faixa de corte: ele vê e reprova. Feche por
  dentro (inpaint), use a maior região contínua, ou desfaça em pontilhado.
- **A sonda contava quadros de uma folha que nem carregava** (a tela desenhava `__MISSING`): a sonda agora cobra
  `faltando === 0` em todo capítulo. **Contar quadro não prova arte na tela.**
- **Edição por script inline (`sed`/`node -e` com template strings) falhou em silêncio** por causa do CRLF do
  Windows e do shell comendo `${}`. Para trocar trecho de código, use o Edit.
- **Os marcadores provisórios** (`provisorio.ts`, já removido) deixaram a cena andar pela linha do tempo real
  enquanto ela era construída. Sem eles, o último capítulo pronto ficava em loop até o fim.

---

## 📁 AS FOLHAS (`docs/superpowers/folhas/2026-09-23/`)

Storyboard e conceitos: `storyboard-saida-A-C-mescla.png`, `capitulos-conceito.png`, `conceito-*`.
Por capítulo, a última versão de cada: `p1-pulso.png`, `p2-rasgo-bordas.png`, `p1p2p3-dentro-v3.png` (1–3 em
movimento), `p4-arranjos.png` e `p4-ferida-v3.png` (4), `p5-queda-fundos.png` e `p5-queda-v8.png` (5),
`p7-carcaca-inpaint.png`, `p7-carcaca-inpaint2.png`, `p7-carcaca-rasgo.png`, `p7-quadro-inteiro.png` e
`p6p7-sobrevoo.png` (6–7).

Os caches que NÃO se regeram (regerar mudaria o resultado aprovado): `scripts/_f8/_rasgado-cheio.png`,
`_rasgo-v3-21.json`, `_sobrevoo3-44.png`, `_lua-perto-22.png`. O cliente PixelLab é `scripts/_f8/_pl.mjs`.
