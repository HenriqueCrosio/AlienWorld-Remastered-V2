# Bloco M1 — a pausa e as CONFIGURAÇÕES: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o `ESC` pausa o jogo numa janela (pequena) com CONTINUAR · REINICIAR/PULAR · CONFIGURAÇÕES · SAIR, e as
CONFIGURAÇÕES (janela grande, abas ÁUDIO · CONTROLES · VÍDEO · JOGO) abrem dali e do menu principal.

**Architecture:** as preferências são um objeto só, versionado, num módulo puro com a guarda injetada (a ponta para o
perfil do usuário). Uma cena `Pausa` do jogo do MUNDO roda por cima da cena pausada; o que ela desenha vai para a irmã
HD dela, levada ao topo da camada. A máquina de estados da janela é pura e testada sem navegador.

**Tech Stack:** Phaser 3.90, TypeScript, Vite; testes em `scripts/test-*.mjs` (o Node importa os `.ts` puros direto;
os de navegador usam Playwright contra `npm run dev`).

**Spec:** `docs/superpowers/specs/2026-11-14-bloco-m1-pausa-configuracoes-design.md`.

## Global Constraints

- Commit e push só quando ele pedir, só no nome dele; nenhum passo deste plano commita.
- Editar com Edit/Write (sed/node -e falham em silêncio com CRLF). Código e comentários em inglês nos arquivos novos.
- Testes novos terminam com `process.exitCode`, nunca `process.exit`.
- Módulo puro = sem `import Phaser` e sem `window`/`localStorage` no topo (o teste do Node o importa).
- A tela final aprovada (a janela do placar) tem de sair IDÊNTICA depois da Task 3.
- O sandbox mantém o `ESC` = voltar à montagem. Arquivo de Cartas, menu e telas de resultado mantêm o `ESC` de hoje.
- Durante uma filmagem não editar `src/` nem `.html` do projeto.

## O que o código já tem (lido em 14/11)

- **Dois jogos Phaser:** o do mundo (`main.ts`) e a camada HD (`uiHD.ts`), com a `Cartas` rodando NA HD (a `Cartas` do
  mundo só repassa: `CartasScene.repassar`). Todo `pixelText` de uma cena do mundo nasce na IRMÃ dela (`irmaDe`), e
  toda irmã nasce ABAIXO da `Cartas` da HD.
- **A mesa nas fases:** `CartasEmJogo.abrirMesa` faz `scene.pause()` da `Game` e `launch('Cartas')`. **Nas cutscenes
  1–3:** `mesaDaCutscene(scene, titulo, mesa, depois, onSair)` (`src/cartas.ts`), com `onSair` = `sair()` → Menu.
- **O `ESC` de hoje:** `GameScene.ts:823` (menu, ou a montagem no sandbox); `HangarScene.ts:117` (menu, antes de
  confirmar); `CartasScene.ts:181` (só com `onSair`); `Interlude*.sair()`; `ShipPanel.ts:192`.
- **O fim das cutscenes:** `avancar()` (1–3) e `terminar()` (4), os dois guardados por `done`. Elas NÃO têm tecla de
  pular, de propósito (`InterludeScene.ts:255`: o Espaço comia a cena). Pular pela janela da pausa não tem esse defeito.
- **O volume:** `Music.VOLUME = 0.45` fixo. **Os clarões:** `Clarao.pico()` multiplica por `CLARAO.forca` (`as const`).
- **O menu:** `ITEM`/`NOMES_ITENS` (3 linhas, `lista: [178, 188, 198]`, a descrição em 208); sem a camada HD a última
  linha (o Arquivo) some (`MenuScene.ts:168`).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/preferencias.ts` (novo, puro) | o objeto `Preferencias`, padrões, limites, `ler`/`gravar`/`mudar`, a migração das chaves antigas |
| `src/aplicarPreferencias.ts` (novo) | a ponte: volume da música, força dos clarões, perfil de teclas, menu; `prefs()` em memória |
| `src/pausa/numerosPausa.ts` (novo, puro) | linhas por tipo de cena, tamanhos das janelas, abas, a máquina de estados |
| `src/pausa/abrirPausa.ts` (novo) | `ligarPausa(scene, opts)`, `abrirPausa`, a pausa automática |
| `src/scenes/PausaScene.ts` (novo) | desenha a janela e o conteúdo, lê as teclas, chama as ações |
| `src/ui/janela.ts` (novo) | a moldura da janela num tamanho qualquer (extraída do `painelResultado`) |
| `src/systems/Music.ts` | o alvo passa a ser `VOLUME × fator()`; `Music.atualizarVolume`, `Music.abafar` |
| `src/systems/clarao/Clarao.ts` | `pico()` lê `forcaDosClaroes()` |
| `src/uiHD.ts` | `jogoMundo()`; `VOZ_DA_CENA.Pausa = 'piloto'` |
| `src/controles.ts` | `perfilAtivo()` lê das preferências em memória quando existem |
| `GameScene`, `Interlude*Scene`, `HangarScene`, `CartasScene`, `MenuScene`, `numerosMenu.ts`, `main.ts`, `cartas.ts` | as ligações |
| `scripts/test-preferencias.mjs`, `test-pausa.mjs`, `test-pausa-jogo.mjs`, `scripts/_m/_pausa-fotos.mjs`, `_pausa-folha.mjs` | os testes e a folha |

---

### Task 1: as preferências (puro)

**Files:** Create `src/preferencias.ts`, `scripts/test-preferencias.mjs`.

**Interfaces — Produces:**

```ts
import type { Guarda } from './placar.ts';
export const CHAVE_PREFERENCIAS = 'alienworld:preferencias';
export interface Preferencias {
  v: 1;
  volume: { geral: number; musica: number; efeitos: number }; // integers 0–10
  teclas: 'padrao' | 'classico';
  reduzirClaroes: boolean;
  menu: 'noite' | 'amanhecer';
}
export const PADRAO: Preferencias; // volume 10/10/10, 'padrao', false, 'amanhecer'
export function ler(g: Guarda): Preferencias;       // never throws; falls back per field
export function gravar(g: Guarda, p: Preferencias): void; // also mirrors 'aw.teclas'; 'alienworld:menu' only if zerou
export type Campo = 'volume.geral' | 'volume.musica' | 'volume.efeitos' | 'teclas' | 'reduzirClaroes' | 'menu';
/** One step of ←→ on a line: volumes ±1 clamped to 0–10; the others toggle. Returns the NEW object (and records it). */
export function mudar(g: Guarda, p: Preferencias, campo: Campo, d: -1 | 1): Preferencias;
export const fatorMusica = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.musica / 10);
export const fatorEfeitos = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.efeitos / 10);
export const forcaClaroes = (p: Preferencias): number => (p.reduzirClaroes ? 0.5 : 1);
```

- [ ] **Step 1 — o teste** (`scripts/test-preferencias.mjs`, o molde de `test-claroes.mjs`: `ok(c, m)`, seções,
  `process.exitCode = falhas ? 1 : 0`). Casos:
  - guarda vazia → `ler` devolve o `PADRAO`;
  - guarda só com `aw.teclas = 'classico'` e `alienworld:menu = 'noite'` → `ler` os herda;
  - `gravar` + `ler` devolvem o mesmo objeto; a chave `alienworld:preferencias` é um JSON com `v: 1`;
  - `gravar` espelha `aw.teclas`; espelha `alienworld:menu` só quando `alienworld:zerou === '1'`;
  - JSON quebrado (`'{'`), `volume.geral: 99`, `-3`, `'x'`, `teclas: 'zzz'` → o padrão/limite do campo, sem exceção;
  - `mudar` nos volumes: 10 + 1 fica 10, 0 − 1 fica 0, 5 + 1 = 6; nos outros, alterna; o resultado já está gravado;
  - `fatorMusica` com 5/10 → 0,5; `forcaClaroes` 1 e 0,5.
- [ ] **Step 2:** `node scripts/test-preferencias.mjs` → falha (o módulo não existe).
- [ ] **Step 3:** implementar. `ler`: `try { JSON.parse }`, cada campo validado por si (`Number.isInteger` + clamp;
  `=== 'padrao' || === 'classico'`; `typeof === 'boolean'`); sem o objeto, os valores iniciais vêm de `aw.teclas` e
  `alienworld:menu`. As chaves antigas são constantes locais neste módulo (ele não importa `controles.ts`, que toca
  `localStorage` no topo de `perfilAtivo`).
- [ ] **Step 4:** `node scripts/test-preferencias.mjs` → tudo `✔`.

### Task 2: aplicar as preferências (volume, clarões, teclas)

**Files:** Create `src/aplicarPreferencias.ts`. Modify `src/systems/Music.ts`, `src/systems/clarao/Clarao.ts`,
`src/controles.ts`, `src/main.ts`. Test: `scripts/test-claroes.mjs` (segue passando), `npm run build`.

**Interfaces — Consumes:** Task 1. **Produces:**

```ts
// src/aplicarPreferencias.ts
export function prefs(): Preferencias;                          // the in-memory copy (read once from guardaDoNavegador())
export function mudarPref(campo: Campo, d: -1 | 1): Preferencias; // mudar() + apply
export function forcaDosClaroes(): number;
// src/systems/Music.ts
static fator: () => number;            // defaults to () => 1; aplicarPreferencias sets it
static atualizarVolume(): void;        // sets the playing track to VOLUME × fator() × abafo, no restart
static abafar(scene: Phaser.Scene, k: number, ms: number): void; // the pause ducks the music (k 0.4) and restores (k 1)
```

- [ ] **Step 1:** `Music`: um campo `private static abafo = 1`; `alvo() = VOLUME * fator() * abafo`; o tween de entrada
  de `play()` usa `Music.alvo()`; `atualizarVolume()` faz `(current as { setVolume(v: number): void }).setVolume(alvo())`
  quando há faixa; `abafar` muda `abafo` e faz um tween do volume da faixa até o alvo novo.
- [ ] **Step 2:** `aplicarPreferencias.ts`: `prefs()` lê uma vez; `mudarPref` chama `mudar`, guarda a cópia, e aplica
  (`Music.atualizarVolume()`); no carregamento do módulo, `Music.fator = () => fatorMusica(prefs())`.
- [ ] **Step 3:** `Clarao.pico()`: troca `CLARAO.forca` por `forcaDosClaroes()` (import de `aplicarPreferencias`).
  `CLARAO.forca` fica como está na constante (o teste a lê); o comentário dela passa a apontar para a função.
- [ ] **Step 4:** `controles.ts`: nada muda na leitura (a Task 1 espelha `aw.teclas`, que `perfilAtivo()` já lê a
  cada chamada). Conferir que `InputReader` chama `mapaAtivo()` no `create` da cena (a troca vale na próxima cena) e,
  se ele guarda as teclas, expor `InputReader.reler()` para a pausa chamar ao fechar.
- [ ] **Step 5:** `main.ts`: `import './aplicarPreferencias'` antes de criar o jogo.
- [ ] **Step 6:** `npm run build` e `node scripts/test-claroes.mjs` → ok.

### Task 3: a janela reaproveitável

**Files:** Create `src/ui/janela.ts`. Modify `src/menu/painelResultado.ts`. Test: foto antes × depois da tela final.

**Interfaces — Produces:**

```ts
/** The double-border window texture at any size (1 texel = 1 game px); `pintar` draws extra content (dotted lines…). */
export function texturaJanela(scene: Phaser.Scene, chave: string, w: number, h: number, pintar?: (c: CanvasRenderingContext2D) => void): string;
export const COR_JANELA: { osso: number; fundo: number };
```

- [ ] **Step 1:** ANTES de mexer, a foto de referência: `http://localhost:5173/?menu=amanhecer`, tecla `R` (o ensaio do
  resultado), esperar 6 s, `page.screenshot` → `scratchpad/resultado-antes.png` (com `Date.now`/`Math.random` fixos,
  como em `_perfis-fotos.mjs`, e o relógio em passos: `game.loop.sleep()` + `game.step`).
- [ ] **Step 2:** mover para `janela.ts` os helpers `css`, `textura` e o corpo de `texturaJanela` (fundo 0,78, as três
  bordas, os quatro cantos); o pontilhado das linhas vira o `pintar` que o `painelResultado` passa. A chave da textura
  do placar segue `res-janela-${w}x${h}`.
- [ ] **Step 3:** a mesma foto → `resultado-depois.png`; comparar com `sharp` (`raw()` dos dois, diferença máxima 0).
  Se o relógio em passos não der foto idêntica nem contra si mesma (dois "antes"), comparar só o recorte da janela
  (`RESULTADO.layout.janela`), que é estática depois dos 5,3 s.
- [ ] **Step 4:** `npm run build`, `node scripts/test-menu-amanhecer.mjs` → ok.

### Task 4: os números e a máquina de estados da pausa (puro)

**Files:** Create `src/pausa/numerosPausa.ts`, `scripts/test-pausa.mjs`.

**Interfaces — Produces:**

```ts
export type TipoPausa = 'fase' | 'cutscene' | 'escolha' | 'menu';   // 'menu' = settings opened from the main menu
export type Acao = 'continuar' | 'reiniciar' | 'pular' | 'config' | 'sair';
export const LINHAS: Record<Exclude<TipoPausa, 'menu'>, readonly Acao[]>;
export const ROTULO: Record<Acao, string>; // CONTINUAR · REINICIAR A FASE · PULAR A CENA · CONFIGURAÇÕES · SAIR PARA O MENU
export type Aba = 'audio' | 'controles' | 'video' | 'jogo';
export const abasDe = (zerou: boolean): readonly Aba[];            // 'jogo' only when zerou
export type Linha = Campo | 'telaCheia';
export const LINHAS_DA_ABA: Record<Aba, readonly Linha[]>;
export const JANELA = { pequena: { w: 136, hLinha: 13, margem: 14 }, grande: { x: 28, y: 22, w: 328, h: 176 }, cresce: 140 } as const;
export type Estado =
  | { tela: 'lista'; cursor: number }
  | { tela: 'confirma'; acao: 'reiniciar' | 'sair'; sim: boolean }
  | { tela: 'config'; aba: number; linha: number };                 // linha -1 = the cursor is on the tab strip
export type Tecla = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'ok' | 'esc' | 'abaAnt' | 'abaProx';
export type Efeito = { tipo: 'nada' } | { tipo: 'fechar' } | { tipo: 'acao'; acao: Acao } | { tipo: 'mudar'; linha: Linha; d: -1 | 1 };
export function inicial(tipo: TipoPausa): Estado;                   // 'menu' starts in config
export function passo(e: Estado, t: Tecla, ctx: { tipo: TipoPausa; zerou: boolean }): { estado: Estado; efeito: Efeito };
```

Regras de `passo`:
- `lista`: cima/baixo circulam; `esc` → `fechar`; `ok` em `continuar` → `fechar`; em `reiniciar`/`sair` → `confirma`
  com `sim: false`; em `pular` → `acao: pular`; em `config` → `config` aba 0, linha 0.
- `confirma`: esquerda/direita/cima/baixo alternam `sim`; `esc` → volta à lista (cursor na linha da ação); `ok` com
  `sim` → `acao`; `ok` sem `sim` → volta à lista.
- `config`: `abaAnt`/`abaProx` circulam a aba e põem `linha` 0; cima/baixo andam de −1 (a faixa das abas) até a última
  linha, sem circular; esquerda/direita com `linha === -1` trocam de aba, senão `mudar`; `ok` numa linha = `mudar` +1;
  `esc` → a lista (cursor em `config`), ou `fechar` quando o tipo é `menu`.

- [ ] **Step 1 — o teste** (`scripts/test-pausa.mjs`): as linhas de cada tipo (a `cutscene` tem `pular` e não
  `reiniciar`; a `escolha` não tem nenhum dos dois); o cursor circula; cada transição acima, uma asserção; `abasDe(false)`
  sem `jogo`; `inicial('menu')` em `config` e o `esc` dele = `fechar`; `confirma` nasce no NÃO e o `ok` nele não age.
- [ ] **Step 2:** rodar → falha. **Step 3:** implementar. **Step 4:** rodar → tudo `✔`.

### Task 5: a cena da pausa e o `abrirPausa`

**Files:** Create `src/scenes/PausaScene.ts`, `src/pausa/abrirPausa.ts`. Modify `src/uiHD.ts`, `src/main.ts`.

**Interfaces — Consumes:** Tasks 1–4. **Produces:**

```ts
// src/uiHD.ts
export const jogoMundo = (): Phaser.Game | null => mundo;
// src/pausa/abrirPausa.ts
export interface OpcoesPausa {
  tipo: TipoPausa;
  reiniciar?: () => void;   // 'fase'
  pular?: () => void;       // 'cutscene'
  sair: () => void;         // every type but 'menu'
  podeAbrir?: () => boolean; // e.g. not during a scene's own fade-out; default always
}
/** Registers ESC and the auto-pause (blur / hidden) on `scene`; unregisters on shutdown. */
export function ligarPausa(scene: Phaser.Scene, opts: OpcoesPausa): void;
/** Pauses `alvo` and runs the Pausa scene of the WORLD game over it. No-op if a pause is already open. */
export function abrirPausa(alvo: Phaser.Scene, opts: OpcoesPausa): void;
export const pausaAberta = (): boolean;
```

- [ ] **Step 1 — `abrirPausa`:** `const mundo = ehHD(alvo) ? jogoMundo()! : alvo.game`; se `mundo.scene.isActive('Pausa')`
  sai; `alvo.scene.pause()`; `mundo.scene.run('Pausa', { alvo, opts })`. O fechar (dentro da `PausaScene`):
  `this.scene.stop()`; `alvo.input.keyboard?.resetKeys()`; `alvo.scene.resume()` — exceto quando a ação já trocou de
  cena (reiniciar, sair, pular chamam o callback DEPOIS de `alvo.scene.resume()`, porque `scene.start` a partir de uma
  cena pausada funciona, mas os callbacks das cutscenes usam `this.time`).
- [ ] **Step 2 — `ligarPausa`:** `kb.on('keydown-ESC', …)` com o filtro "um evento, uma vez" (o `WeakSet` da
  `HangarScene`) e `!ev.repeat`; `scene.game.events.on(Phaser.Core.Events.BLUR | HIDDEN, …)` → `abrirPausa` se a cena
  está ativa (`scene.scene.isActive()`) e `podeAbrir()`; tudo desligado no `SHUTDOWN`. O tipo `menu` não registra nada
  (o menu chama `abrirPausa` direto).
- [ ] **Step 3 — `PausaScene.create({ alvo, opts })`:**
  - `destino = irmaDe(this) ?? this`; na HD, `destino.scene.bringToTop()` (a irmã nasce abaixo da `Cartas`);
  - o véu: `destino.add.rectangle(0, 0, 384, 216, 0x05060d, 0.55).setOrigin(0)` (não no tipo `menu`: a pintura fica);
  - a janela: `destino.add.image` de `texturaJanela(destino, 'pausa-WxH', w, h)`; a pequena centrada
    (`w` 136, `h` = `margem × 2 + linhas × hLinha`), a grande em `JANELA.grande`;
  - os textos por `pixelText(this, …, { voz: 'piloto' })`, recriados a cada mudança de tela (um `limpar()` que destrói
    a lista de objetos e um `desenhar(estado)`); o cursor = a cor `0xb5f7ff` + um `>` à esquerda;
  - `Music.abafar(this, 0.4, 200)` ao abrir e `Music.abafar(…, 1, 200)` ao fechar (no tipo `menu` não abafa);
  - a troca pequena ↔ grande: sem movimento reduzido, 140 ms com a imagem da janela nova entrando em escala a partir
    do centro; com ele, troca seca.
- [ ] **Step 4 — as teclas:** `UP/W`, `DOWN/S`, `LEFT/A`, `RIGHT/D`, `ENTER` + as de `mapaAtivo().tiro`, `ESC`, `Q`,
  `E` → `passo(estado, tecla, ctx)`; aplicar o efeito: `fechar`; `acao` (`config` não chega aqui; `reiniciar`/`pular`/
  `sair` fecham e chamam `opts.*`); `mudar` → `mudarPref(campo, d)` ou, em `telaCheia`, `document.fullscreenElement ?
  document.exitFullscreen() : document.documentElement.requestFullscreen()` (com `.catch(() => {})`). Só toque novo
  (`!ev.repeat`) no `ok` e no `esc`; as setas aceitam repetição (o volume anda segurando).
- [ ] **Step 5 — o conteúdo das abas** (a janela grande; coordenadas a partir de `JANELA.grande`):
  - a faixa das abas em y+14, as quatro (ou três) distribuídas; a ativa clara, com um traço de 1 px embaixo;
  - cada linha: o rótulo à esquerda (x+16), o valor à direita (x+w−16); o volume = dez blocos de 5×5 px (cheios até o
    valor) + o número; LIGADO/DESLIGADO e PADRÃO/CLÁSSICO como `< VALOR >` quando a linha tem o cursor;
  - CONTROLES: abaixo da linha TECLAS, o mapa do perfil em duas colunas (MOVER `WASD / SETAS`, TIRO, BOMBA, DASH,
    FLARE, MÍSSIL, PAUSA `ESC`), lido de `PERFIS[prefs().teclas]` com `rotuloDaTecla`;
  - ÁUDIO: sob EFEITOS, a nota `os efeitos sonoros chegam numa versão futura` (pequena, discreta);
  - o rodapé: `[<  >] MUDAR   [Q  E] ABA   [ESC] VOLTAR` (ASCII: a Chakra Petch não tem ← →).
- [ ] **Step 6:** `uiHD.ts`: `jogoMundo`, `Pausa: 'piloto'` em `VOZ_DA_CENA`. `main.ts`: `PausaScene` no fim da lista
  de cenas do mundo. `npm run build` → ok.

### Task 6: ligar nas fases

**Files:** Modify `src/scenes/GameScene.ts` (o `keydown-ESC` da linha ~823; um método novo).

- [ ] **Step 1:** guardar em `create` os dados de entrada (`this.dadosDeEntrada = data`). `reiniciarFase()`:
  `this.scene.start('Game', { stage: this.stage.id, handling: this.handling, practice: this.practice, ship: this.shipId, score: this.scoreBase })`
  — o mesmo payload do retry da `GameOverScene` (linhas 107–111). Conferir, lendo o `create`, de onde as cartas da fase
  voltam ao `cartasCheckpoint` numa nova tentativa, e que esse caminho roda aqui também.
- [ ] **Step 2:** o `ESC`: no sandbox fica `voltarMontagem()`; fora dele,
  `ligarPausa(this, { tipo: 'fase', reiniciar: () => this.reiniciarFase(), sair: () => this.scene.start('Menu'), podeAbrir: () => !this.over })`.
- [ ] **Step 3:** a mesa na fase: a `Game` já está pausada e quem está ativa é a `Cartas` da HD → Task 8.
- [ ] **Step 4:** `npm run build`; abrir a F1 (`1` no menu), `ESC`, conferir à mão as quatro linhas.

### Task 7: ligar nas cutscenes

**Files:** Modify `src/scenes/InterludeScene.ts`, `Interlude2Scene.ts`, `Interlude3Scene.ts`, `Interlude4Scene.ts`.

- [ ] **Step 1 (1–3):** um campo `private escolheu = false` (verdadeiro no começo de `escolher()`), e
  ```ts
  private pular(): void {
    if (this.done) return;
    this.time.removeAllEvents();
    this.tweens.killAll();
    if (this.escolheu) this.avancar();
    else this.escolha();   // the card table: skipping never costs the player a card
  }
  ```
  e no `create`: `ligarPausa(this, { tipo: 'cutscene', pular: () => this.pular(), sair: () => this.sair(), podeAbrir: () => !this.done })`.
  Ler `escolha()` e `avancar()` de cada uma antes: se `escolha()` depende de algo que o `pouso()` cria (o painel, a
  posição da nave), criar isso no `pular()`; anotar o que foi preciso em cada cena.
- [ ] **Step 2 (4):** `pular: () => this.terminar()`, `sair: () => { this.done = true; this.scene.start('Menu'); }`.
- [ ] **Step 3:** o `ESC` do `ShipPanel` (`ShipPanel.ts:192`) e o `onSair` das mesas das cutscenes seguem existindo;
  com a pausa por cima deles o `ESC` abre a pausa (Task 8 trata a mesa).
- [ ] **Step 4:** `npm run build`; `I`, `O`, `P`, `F` no menu abrem cada cutscene: pausar, PULAR antes e depois da mesa.

### Task 8: ligar na mesa de cartas e no hangar

**Files:** Modify `src/scenes/CartasScene.ts`, `src/scenes/HangarScene.ts`.

- [ ] **Step 1 — a mesa:** na `Cartas` que DESENHA (a da HD, ou a do mundo sem a camada), trocar o bloco
  `if (sair) kb.on('keydown-ESC', …)` por: `ligarPausa(this, { tipo: 'escolha', sair: () => { this.fechando = true; this.scene.stop(); (data.onSair ?? irAoMenu)(); }, podeAbrir: () => !this.fechando })`,
  com `irAoMenu = () => jogoMundo()…scene.start('Menu')` a partir da cena do mundo que está por baixo (parar a `Game`
  pausada: `mundo.scene.stop('Game')` antes do `start('Menu')`; ler como a `repassar` fecha a `Cartas` do mundo e
  seguir o mesmo caminho). ⚠️ No Arquivo/sandbox a mesa tem `onSair` próprio que NÃO é "sair do jogo": lá o `ESC`
  segue como hoje (a pausa só se liga quando a cena por baixo é `Game` ou `Interlude*`; passar isso em `CartasData`
  como `pausa?: boolean`, ligado por `CartasEmJogo.abrirMesa` e `mesaDaCutscene`).
- [ ] **Step 2 — as teclas dos dois jogos:** a `Pausa` é do mundo e a mesa é da HD; a `Cartas` do mundo fez
  `disableGlobalCapture()`. Conferir no navegador que as setas chegam à `Pausa` com a mesa por baixo; se não chegarem,
  a `PausaScene` religa a captura ao abrir e devolve ao fechar.
- [ ] **Step 3 — o hangar:** o `ESC` de hoje (menu, antes de confirmar) vira
  `ligarPausa(this, { tipo: 'escolha', sair: () => this.scene.start('Menu', { direto: true }), podeAbrir: () => this.estado.tConfirmou === null })`.
- [ ] **Step 4:** `npm run build`; conferir à mão a mesa da F1 (a do meio da fase) e o hangar.

### Task 9: CONFIGURAÇÕES no menu principal

**Files:** Modify `src/menu/numerosMenu.ts`, `src/scenes/MenuScene.ts`.

- [ ] **Step 1:** `ITEM = { comecar: 0, conducao: 1, arquivo: 2, config: 3 }`,
  `NOMES_ITENS = ['COMEÇAR', 'CONDUÇÃO', 'ARQUIVO DE CARTAS', 'CONFIGURAÇÕES']`, `lista: [168, 178, 188, 198]`.
  Sem a camada HD a lista hoje corta o ÚLTIMO item: trocar o corte por um filtro que tira só o Arquivo (a lista vira
  COMEÇAR · CONDUÇÃO · CONFIGURAÇÕES); o cursor passa a guardar o ITEM, não o índice da linha.
- [ ] **Step 2:** `confirmar()`: em `ITEM.config`,
  `abrirPausa(this, { tipo: 'menu', sair: () => {} })`. A `MenuScene` fica pausada por baixo: conferir se a pintura
  viva para (ela para — `scene.pause`); a spec pede que ela siga animada → no tipo `menu` o `abrirPausa` NÃO pausa a
  cena, só desliga o teclado dela (`alvo.input.keyboard.enabled = false`, religado ao fechar).
- [ ] **Step 3:** ao fechar, o menu relê a escolha noite/amanhecer: se mudou, `this.scene.restart({ direto: true, cursor: ITEM.config })`.
- [ ] **Step 4:** `npm run build`; `node scripts/test-menu-amanhecer.mjs` e os testes do menu → ok (ajustar os que
  contam 3 linhas).

### Task 10: os testes no navegador, a folha e os docs

**Files:** Create `scripts/test-pausa-jogo.mjs`, `scripts/_m/_pausa-fotos.mjs`, `scripts/_m/_pausa-folha.mjs`.

- [ ] **Step 1 — `test-pausa-jogo.mjs`** (Playwright, o molde de `probe-atmosfera-fases.mjs`):
  - F1: `ESC` → `isActive('Pausa')` e `isPaused('Game')`; `ESC` → fecha e a `Game` roda;
  - REINICIAR (↓, Enter, ←, Enter) → `Game` ativa com `elapsed` < 1; SAIR → `Menu`;
  - cada cutscene: PULAR antes da mesa → a `Cartas` abre; depois da escolha → a `Game` da fase seguinte;
  - a mesa e o hangar: três linhas, sem REINICIAR;
  - `window.dispatchEvent(new Event('blur'))` na F1 → a pausa abre;
  - menu → CONFIGURAÇÕES: → no volume da música muda `localStorage['alienworld:preferencias']` e o volume da faixa.
- [ ] **Step 2 — a pausa não muda a partida:** a F2 no relógio em passos e a sorte fixa (o arranjo de
  `_perfis-fotos.mjs`), 20 s; uma corrida direta e outra com a pausa aberta aos 8 s por 300 passos; comparar
  `elapsed`, o nº de inimigos e a posição de cada um → iguais.
- [ ] **Step 3 — a folha** (`folhas/2026-11-14/pausa/`): fotos da janela pequena (F1, F4 B, cutscene 2, mesa) e de
  cada aba (sobre a F1 e sobre o menu da noite), mais a reserva `?semhd`; `_pausa-folha.mjs` monta o `pausa.html`.
  ABRIR cada foto ampliada antes de mostrar (texto cortado, sobreposição, cursor).
- [ ] **Step 4:** `npm run build` e TODOS os `scripts/test-*.mjs` → ok.
- [ ] **Step 5 — os docs:** o 📍 do M1 no 🧭 do `docs/HANDOFF.md` (o que entrou, os arquivos, o que espera ele).

## Self-review

- Spec §3.1 → Tasks 4–8; §3.2 → Tasks 1, 2, 4, 5; §3.3 → Task 9; §4.1 → Task 1; §4.2 → Task 2; §4.3 → Task 5;
  §4.4 → Task 3; §4.5 → Tasks 6–9; §5 → Tasks 1, 4, 10.
- Duas correções à spec achadas lendo o código: (1) nas cutscenes 1–3, PULAR antes da escolha leva à MESA (pular
  nunca custa uma carta) e só depois dela à fase seguinte; (2) no menu principal a cena NÃO é pausada (a pintura
  segue viva), só o teclado dela é desligado.
