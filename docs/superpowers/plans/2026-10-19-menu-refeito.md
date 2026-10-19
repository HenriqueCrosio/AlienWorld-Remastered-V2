# BLOCO E — o menu refeito (a colônia de Kepler à noite) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** levar para o jogo o menu aprovado nas nove rodadas de 19/10 (spec
`docs/superpowers/specs/2026-10-19-menu-refeito-design.md`). A pintura dele, viva e tratada, mora na camada HD
atrás do texto; o letreiro de neon desce freando nos retrofoguetes e acende; a condução vira uma linha da lista.

**Architecture:** os números e as regras de tempo são módulos PUROS em `src/menu/` (`numerosMenu.ts`, `acaso.ts`,
`abertura.ts`, `ritmos.ts`, `letreiroPixels.ts`), testados no Node por `scripts/test-menu-*.mjs`. O cenário é
montado por `Cenario` (`src/menu/cenario.ts`) a partir de camadas assadas fora do jogo (`scripts/_menu/_camadas.mjs` e
`_tempestade.mjs` → `public/sprites/menu/k4` e `k1`). Ele roda numa cena própria da camada HD (`MenuCenaHD`, câmera
em zoom `s`, Atmosfera com `uEscala = s`) ou, sem a camada, dentro do `MenuScene` na densidade 1. O `MenuScene` fica
com o relógio da abertura, o letreiro (`titulo.ts`, gerado por `letreiro.ts`), os jatos (`jatos.ts`) e a lista.

**Tech Stack:** Phaser 3.90 (WebGL, PostFX), TypeScript, Vite; Node 24 (type stripping lê o `.ts` nos testes);
`sharp` e `playwright` nos scripts.

## ✅ Executado em 19–20/10 — o que saiu diferente do texto abaixo

Todas as tasks feitas, testes e sondas verdes, commitado e empurrado (Task 16). Os desvios:
- **`test-menu-abertura`, "nem no fim da queima":** a aceleração salta no fim da queima (a mola entra); o teste mede a
  ±0,002 s com tolerância 0,5, em vez de exigir continuidade exata.
- **`test-menu-letreiro-jogo` e `_ver-cenario.mjs`:** depois de um HMR o Vite serve os módulos com `?t=`, e um
  `import('/src/x.ts')` nu cria uma SEGUNDA instância (o `glifosDaFonte` dela via `assadas = null`; o `uiHD` dela, a
  camada `null`). As duas importam pela URL que a página já carregou (`performance.getEntriesByType('resource')`), e o
  `_ver-cenario` põe a `MenuCenaHD` direto em `window.__gameHD.scene` (`add` + `sendToBack`), sem importar o `uiHD`.
- **`MenuCenaHD.montar`:** dentro do `create()` o estado é CREATING e `sys.isActive()` é falso, então o
  `if (!this.sys.isActive()) return` do plano NUNCA montava o cenário. Virou `status >= Phaser.Scenes.SHUTDOWN`.
- **`perigo.ts`:** um tipo `Relampago` explícito (o `proximo` herdava os literais `2.4`/`0`/`true` do `as const`).
- **`fonte.ts`:** `glifosDaFonte` lê os pixels do canvas assado UMA vez (cache por canvas); o letreiro pede o título e
  o subtítulo a cada escala, e o navegador avisava das leituras repetidas.
- **`BootScene`:** o comentário do `moonBelt` aponta para a lua antiga em `assets/raw/menu-moon-original.png`.
- **`probe-menu.mjs`:** as páginas saem de UM `browser.newContext()` (o `browser.newPage()` abre um contexto novo a cada
  página, e a condução guardada no `localStorage` não passava de uma para a outra).
- **`probe-atmosfera-fases.mjs`:** entrava na F1 com Enter durante a abertura; pela spec (§6.1) o Enter ali só PULA,
  então os três `press('Enter')` do menu viraram `press('Digit1')` (o mesmo jogo: diegética).
- **`docs/ASSETS.md`** não tinha lista de pastas de sprites: a entrada do menu abriu a seção "Pastas ASSADAS por script".
- **`_filmar-menu.mjs`:** o quadro do relâmpago é o de 2,43 s (`t2.4.png`), não o de 2,5 s: aos 2,5 s o relâmpago está
  entre dois golpes, fraco e sem o raio.

## Global Constraints

- **Commit e push SÓ na Task 16**, que ele já pediu (*"commita e pusha o que tiver que fazer"*). Autor só ele
  (HenriqueCrosio), **sem `Co-Authored-By` e sem "Generated with"**; push para `origin`, **nunca para `legacy`**. Não
  entram: os `concept art*.png` da raiz, `.env.pixellab`, e os vídeos e GIFs das folhas (`*.webm`, `*.gif`), que ficam
  no disco como nos blocos anteriores.
- Comentários do `src/` em português, no tom dos arquivos vizinhos; scripts novos com comentários em inglês, como os
  de `scripts/_menu/`.
- Edite com o Edit e confira. `sed` e `node -e` falham em silêncio aqui (CRLF, `${}`).
- Módulos puros importam uns aos outros COM a extensão `.ts` (o Node 24 os lê assim nos testes); o resto do `src/`
  importa sem extensão, como sempre.
- Coordenadas do cenário em PIXELS DE JOGO (384×216); texturas de camada na densidade `k` (4 na camada HD, 1 sem
  ela) e desenhadas com `setScale(1 / k)`.
- O texto, o letreiro e os jatos ficam FORA do tratamento (na irmã da camada HD; sem a camada, com profundidade
  ≥ 19, acima do `limiteLimpo` da Atmosfera).
- `npm run dev` rodando em http://localhost:5173 para as sondas e o filme.
- Testes: `node scripts/test-menu-<nome>.mjs` sai com código 0 e imprime `TUDO OK`.

## O mapa dos arquivos

| Arquivo | O que é |
|---|---|
| `src/menu/numerosMenu.ts` (novo) | todos os números da spec (puro) |
| `src/menu/acaso.ts` (novo) | o LCG das maquetes, o hash dos jatos, o smoothstep (puro) |
| `src/menu/abertura.ts` (novo) | a abertura como funções do tempo: o letreiro, os jatos, a lista, o acender, o véu (puro) |
| `src/menu/ritmos.ts` (novo) | o tempo do cenário: janelas, faróis e torres, tráfego, nave, holofotes, relâmpago, travessia (puro) |
| `src/menu/letreiroPixels.ts` (novo) | o neon pixel a pixel a partir das letras da fonte (puro) |
| `src/menu/letreiro.ts` (novo) | o neon como texturas Phaser para a escala `s` |
| `src/menu/titulo.ts` (novo) | o letreiro na tela (neon por letra; o texto Silkscreen sem a camada) e `tingirLetras` |
| `src/menu/jatos.ts` (novo) | o pool de quadradinhos dos jatos |
| `src/menu/conducao.ts` (novo) | a condução lembrada (`localStorage`) |
| `src/menu/texturas.ts` (novo) | as texturas desenhadas (brilho, bruma, facho, cone) e a leitura de pixels |
| `src/menu/cenario.ts` (novo) | os tipos, o carregamento das camadas e o `Cenario` que monta as peças |
| `src/menu/leviata.ts`, `vida.ts`, `volume.ts`, `perigo.ts` (novos) | as peças do cenário |
| `src/menu/MenuCenaHD.ts` (novo) | a cena do cenário na camada HD, com a Atmosfera |
| `src/scenes/MenuScene.ts` | reescrito: sem o diorama; o relógio da abertura, o letreiro, os jatos, a lista |
| `src/scenes/ArquivoScene.ts` | volta para o menu no item do ARQUIVO (`ITEM.arquivo`, agora 2) |
| `src/scenes/BootScene.ts` | saem `leviathanSwimSheet`, `menuLogoSheet`, `menuMoon` |
| `src/scenes/BootHDScene.ts` | carrega as camadas `k4` do menu |
| `src/uiHD.ts` | `cenaDeFundoHD` e `removerCenaHD` |
| `src/main.ts` | `?semhd` (só em DEV): o jogo sem a camada HD, para a sonda do plano B |
| `src/fonte.ts` | `glifosDaFonte(texto)` |
| `src/systems/atmosfera/AtmosferaPipeline.ts` | o `uEscala` |
| `src/systems/atmosfera/Atmosfera.ts` | a opção `escala`, `setEscala`, `liberar` |
| `src/systems/atmosfera/perfis.ts` | `PERFIS.menu` |
| `scripts/_menu/_tempestade.mjs` (novo) | assa as máscaras da tempestade |
| `scripts/test-menu-abertura.mjs`, `test-menu-ritmos.mjs`, `test-menu-letreiro.mjs` (novos) | os testes dos módulos puros |
| `scripts/fixtures/menu/` (novo) | as letras e os três neons aprovados (o gabarito do letreiro) |
| `scripts/test-atmosfera-perfis.mjs` | ganha o perfil `menu` |
| `scripts/probe-menu.mjs` | reescrita para o menu novo |
| `scripts/probe-menu-intro.mjs` | sai (testava a abertura antiga) |
| `scripts/probe-arquivo.mjs`, `scripts/_folha-arquivo.mjs` | o ARQUIVO agora é o 3º item (dois ↓) |
| `scripts/_menu/_filmar-menu.mjs` (novo) | filma o menu de verdade num relógio a passos |
| `scripts/_menu/_ver-cenario.mjs` (novo) | fotografa o cenário montado pelo jogo num instante exato (a conferência das Tasks 8–11) |
| `scripts/test-menu-letreiro-jogo.mjs` (novo) | as letras assadas pelo jogo = o gabarito; o neon como textura |
| `public/sprites/menu/k4/`, `k1/` (novos) | as camadas, o Leviatã reduzido e as máscaras da tempestade |
| `assets/raw/menu-moon-original.png`, `menu-logo-sheet-original.png` | o backup do menu antigo |
| `docs/CENARIO-VIVO.md` (novo) | a técnica, documentada para os próximos cenários (pedido dele) |

---

### Task 1: os números e o acaso

**Files:**
- Create: `src/menu/numerosMenu.ts`
- Create: `src/menu/acaso.ts`
- Test: `scripts/test-menu-ritmos.mjs` (só o começo; a Task 3 completa)

**Interfaces:**
- Produces: todas as constantes abaixo (as tasks seguintes importam por nome); `lcg(semente): () => number`,
  `hash4(a, b, c, d): number`, `suave(a, b, x): number`.

- [ ] **Step 1: o teste que falha**

`scripts/test-menu-ritmos.mjs`:

```js
// O TEMPO DO CENÁRIO DO MENU (spec 2026-10-19-menu-refeito-design.md §3–4). Uso, da raiz: node scripts/test-menu-ritmos.mjs
import { lcg, hash4, suave } from '../src/menu/acaso.ts';
import { TRAVESSIA, FAROIS, TRAFEGO, TEMPESTADE, HOLOFOTES } from '../src/menu/numerosMenu.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

// ── O ACASO ──
const a = lcg(23), b = lcg(23);
const sa = [a(), a(), a()], sb = [b(), b(), b()];
conferir(JSON.stringify(sa) === JSON.stringify(sb), 'o LCG é determinístico (a mesma semente, a mesma sequência)', [sa, sb]);
conferir(sa.every((v) => v >= 0 && v < 1), 'o LCG fica em [0, 1)', sa);
// O primeiro sorteio da semente 23 nas maquetes (window.__rnd(23)): o mesmo número aqui.
conferir(Math.abs(lcg(23)() - (((23 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)) < 1e-12, 'é o LCG das maquetes', null);
conferir(hash4(1, 2, 3, 4) === hash4(1, 2, 3, 4) && hash4(1, 2, 3, 4) !== hash4(1, 2, 3, 5), 'o hash é estável e muda com a entrada', null);
conferir(suave(0, 1, -1) === 0 && suave(0, 1, 2) === 1 && suave(0, 1, 0.5) === 0.5, 'o smoothstep', null);

// ── OS NÚMEROS ──
conferir(TRAVESSIA.seg === 45 && TRAVESSIA.adiantar === 3 && TRAVESSIA.pausa === 6, 'a travessia: 45 s, 3 s adiantada, 6 s de pausa', TRAVESSIA);
conferir(FAROIS.ciclo === 2.3 && FAROIS.acesoAte === 1.4, 'o farol: 1,4 s aceso a cada 2,3 s', FAROIS);
conferir(TRAFEGO.pontes.length === 5, 'cinco pontes', TRAFEGO.pontes.length);
conferir(TEMPESTADE.focos.length === 3 && TEMPESTADE.raios.length === 3, 'três focos e três raios', null);
conferir(HOLOFOTES.length === 3, 'três holofotes', HOLOFOTES.length);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: rodar e ver falhar**

Run: `node scripts/test-menu-ritmos.mjs`
Expected: erro `ERR_MODULE_NOT_FOUND` (`src/menu/acaso.ts` não existe).

- [ ] **Step 3: `src/menu/acaso.ts`**

```ts
/**
 * O ACASO DO MENU, determinístico: o mesmo menu a cada vez que ele abre (as mesmas janelas piscam, os mesmos raios).
 * O LCG é o das maquetes (`scripts/_menu/_maquete2.mjs`, `window.__rnd`), para as escolhas saírem as aprovadas.
 * Módulo puro: os testes (`scripts/test-menu-*.mjs`) o leem direto no Node.
 */

/** O gerador das maquetes: `s = (s·1103515245 + 12345) & 0x7fffffff`, devolvendo [0, 1). */
export function lcg(semente: number): () => number {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** Um número em [0, 1) para (a, b, c, d), sem estado: o acaso dos jatos, que são função pura do tempo. */
export function hash4(a: number, b: number, c: number, d: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + d * 4.581) * 43758.5453;
  return s - Math.floor(s);
}

/** O smoothstep de `a` a `b`. */
export function suave(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
```

- [ ] **Step 4: `src/menu/numerosMenu.ts`**

```ts
/**
 * OS NÚMEROS DO MENU (spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`). Saíram das nove rodadas de
 * maquete (`scripts/_menu/_maquete2.mjs`), aprovadas por ele em 19/10. Tudo em PIXELS DE JOGO (384×216) e segundos;
 * cores em 0xRRGGBB; ângulos em graus (−90 = para cima).
 *
 * Módulo puro: sem Phaser, sem DOM (os testes `scripts/test-menu-*.mjs` e os scripts de `scripts/_menu/` o leem).
 */

export const LARGURA = 384;
export const ALTURA = 216;
export const TITULO = 'ALIEN WORLD';
export const SUBTITULO = 'R E M A S T E R E D';

// ─── O CENÁRIO ──────────────────────────────────────────────────────────────────────────────────────────────────

/** §3.1 O Leviatã: a travessia em loop (sai à direita, o céu fica vazio, ele volta a sair da nuvem). */
export const TRAVESSIA = { x0: 200, y0: 30, x1: 404, y1: 42, seg: 45, adiantar: 3, pausa: 6, nadoFps: 6, quadros: 16 } as const;

/** §3 As estrelas: só na janela aberta (a cidade transparente) e onde o céu é escuro. */
export const ESTRELAS = {
  quantidade: 9, tentativas: 400, xMin: 200, xVar: 184, yVar: 80, lumMax: 13, diametro: 1.6, semente: 11,
  cores: [0xc8d4ee, 0x8fa0c8],
} as const;

/** §3.2 As 24 janelas que apagam de tempos em tempos (35% com uma falha antes). */
export const JANELAS = {
  quantidade: 24, areaMax: 6, semente: 23, cicloMin: 4, cicloVar: 7, foraMin: 0.4, foraVar: 2.2, faseVar: 11,
  chanceFalha: 0.35, falhaDur: 0.5, falhaHz: 12, margem: 1,
} as const;

/** §3.2 Os faróis: 1,4 s acesos a cada 2,3 s; os da mesma torre (≤ 3 px de lado, ≤ 14 de altura) juntos. */
export const FAROIS = { areaMax: 4, ciclo: 2.3, acesoAte: 1.4, margem: 3, torreDx: 3, torreDy: 14 } as const;

/** §3.2 A cachoeira. */
export const CACHOEIRA = { fps: 10 } as const;

/** §3.3 O tráfego: só no trecho visível de cada deque (de → até), sumindo nos últimos `pontaFade` px. */
export const TRAFEGO = {
  pontes: [
    [70, 120.5, 145, 122.3], [58, 166, 112, 166], [127, 157.6, 157, 157.6], [277, 182.6, 342, 182.6],
    [332, 130.6, 346, 130.6],
  ],
  porComprimento: 28, pontaFade: 2.5, velMin: 3, velVar: 6, diametro: 3.2, alongar: 1.5, chanceCor1: 0.7,
  cores: [0xffc88a, 0xfff0d0],
} as const;

/** §3.4 A nave: parada onde ele pintou; só as luzes vivem (posições relativas ao recorte). */
export const NAVE = {
  fileira: [[5, 7], [11, 7], [16, 7], [18, 7], [21, 7], [24, 7]],
  baixo: [[7, 8], [9, 9], [17, 10]],
  topo: [17, 3],
  diametro: 2.4, corFileira: 0xffb05a, corBaixo: 0xd8823c, corTopo: 0xff3a2a, corridaHz: 7, apagada: 0.35,
  topoPeriodo: 1.6, topoAceso: 0.25,
} as const;

/** §3.5 O volume: a bruma das fases, os fachos frios, a volumetria da cutscene 2. */
export const VOLUME = {
  longe: { y: 34, h: 72, tint: 0x3a4658, pico: 0.3, vel: 1.2 },
  bandas: [
    { y: 108, h: 70, tint: 0x2c3647, pico: 0.42, vel: 1.5, frente: false },
    { y: 126, h: 70, tint: 0x323d50, pico: 0.38, vel: 3, frente: false },
    { y: 144, h: 72, tint: 0x384558, pico: 0.34, vel: 5, frente: false },
    { y: 158, h: 76, tint: 0x262f3e, pico: 0.3, vel: 8, frente: true },
    { y: 172, h: 80, tint: 0x1d2531, pico: 0.24, vel: 12, frente: true },
  ],
  fachos: [
    { x: 300, y: 72, escala: 2.0, pico: 0.18, deriva: 4, angulo: -32 },
    { x: 210, y: 122, escala: 2.4, pico: 0.15, deriva: 6, angulo: -30 },
    { x: 330, y: 150, escala: 1.6, pico: 0.13, deriva: 5, angulo: -34 },
  ],
  corFacho: 0xc8d6ff,
  halos: {
    quantidade: 5, margem: 14, diamMin: 26, diamVar: 12, cor: 0xffb066, baseMin: 0.22, baseVar: 0.1, durMin: 1.8,
    durVar: 1.4, semente: 37,
  },
  fachosLuz: {
    quantidade: 2, cor: 0xffcf9a, alfaMin: 0.05, alfaVar: 0.04, anguloMin: -70, anguloVar: 40, larguraMin: 0.22,
    larguraVar: 0.1, compMin: 0.5, compVar: 0.2,
  },
} as const;

// ─── O PERIGO ───────────────────────────────────────────────────────────────────────────────────────────────────

/** §4.1 Os holofotes antiaéreos, em estruturas da pintura. */
export const HOLOFOTES = [
  { x: 26, y: 80, base: -98, amp: 16, per: 21, fase: 0, comp: 120 },
  { x: 52, y: 96, base: -80, amp: 13, per: 17, fase: 3.1, comp: 130 },
  { x: 300, y: 82, base: -84, amp: 14, per: 25, fase: 1.3, comp: 110 },
] as const;

export const FEIXE = {
  largura: 10, alfa: 0.14, cor: 0xd8e4ff, lampada: 2.6, corLampada: 0xf0f4ff, alfaLampada: 0.8, vaguear: 0.25,
  vaguearPer: 0.37,
} as const;

/** §4.2 A nave vasculhando a colônia (posições relativas ao recorte da nave). */
export const BUSCA = {
  origem: [14.5, 11.2], comp: 75, largura: 22, alfa: 0.16, base: 92, amp: 26, per: 15, ampFina: 6, perFina: 6.3,
  lampada: 2, corLampada: 0xeef4ff, alfaLampada: 0.7,
} as const;

export const PROPULSORES = { pontos: [[8, 9.6], [19, 9.3]], diametro: 2.4, cor: 0x9cc2ff, alfa: 0.5, jato: [7, 3], alfaJato: 0.16 } as const;

/** §4.3 A tempestade chegando, na massa de nuvem que ele marcou. */
export const TEMPESTADE = {
  regiao: [
    [2, 10], [15, 2], [75, 1], [201, 6], [226, 12], [239, 33], [259, 48], [264, 65], [254, 80], [226, 100], [196, 110],
    [176, 105], [131, 103], [95, 110], [83, 116], [58, 114], [38, 105], [15, 90], [4, 75], [1, 38],
  ],
  borda: 10,
  /** [x, y, raio]: de onde cada clarão se espalha. */
  focos: [[60, 35, 85], [150, 28, 95], [215, 55, 70]],
  /** Os traçados dos raios, ponta a ponta (o raio n mora no foco n). */
  raios: [[[36, 16], [104, 44]], [[142, 10], [196, 38]], [[206, 26], [168, 70]]],
  semente: 91,
  /** Cada relâmpago: [início, força, duração] de cada golpe; a cauda decai em `decai` s. */
  golpes: [[0, 1, 0.06], [0.11, 0.5, 0.05], [0.22, 0.9, 0.08]],
  decai: 0.09,
  duracao: 1.5,
  forca: 0.65, cor: 0xc8d0ff, corRaio: 0xe4e8ff, global: 0.05, corGlobal: 0x8890b0,
  rolar: { alfa: 0.8, cor: 0x05070c, escala: [2.2, 2.4], vel: 3, ondula: 6, ondulaHz: 0.05, someDe: 58, someAte: 80 },
  primeiro: { t: 2.4, foco: 0, comRaio: true },
  intervalo: [6, 12],
  chanceRaio: 0.5,
} as const;

// ─── A ABERTURA E O MENU ────────────────────────────────────────────────────────────────────────────────────────

/** §6.1–6.2 O véu, o lugar das coisas e a queda do letreiro. */
export const ABERTURA = {
  veu: 1.2,
  layout: { x: 192, titulo: 58, sub: 71, lista: [178, 188, 198], desc: 208 },
  letreiro: {
    t0: 3.0, yIni: -30, queima: 3.8, forma: 2.4, sobra: 2.5,
    molaY: { periodo: 0.9, amortecimento: 0.55 },
    deriva: 6,
    molaX: { periodo: 1.4, amortecimento: 0.35 },
    /** Os jatos param de emitir este tanto depois do fim da queima. */
    fimJatos: 2,
  },
} as const;

/** §6.3 Os jatos. */
export const JATOS = {
  taxa: 420, aRef: 60, queimaAprovada: 2.2, teto: 1.4, vida: [0.18, 0.42], vel: [90, 150], abre: 0.32, arrasto: 0.13,
  herda: 0.6, deriva: [-3, -2], espalho: [2.5, 1.5], quente: 0.05, chama: 0.13, max: 1600,
  cores: { quente: 0xfff3dc, chama: 0xffb860, vapor: 0x9eacc2 },
  /** [dx, dy, ux, uy, peso]: a partir do centro do letreiro; (ux, uy) é a direção do GÁS. */
  bicos: [
    [-34.1, 16.5, 0, 1, 0.8], [-13.6, 16.5, 0, 1, 0.8], [14.9, 16.5, 0, 1, 0.8], [33.9, 16.5, 0, 1, 0.8],
    [-48, -7, 0, -1, 0.5], [48, -7, 0, -1, 0.5],
    [-62, 0, -1, 0, 0.3], [-50, 13, -1, 0, 0.22],
    [62, 0, 1, 0, 0.3], [50, 13, 1, 0, 0.22],
  ],
} as const;

/** §6.4 A lista: em formação, depois do letreiro. */
export const LISTA = { t0: 7.2, queda: 14, passo: 0.08, periodo: 0.95, amortecimento: 0.5, fade: 0.45, assenta: 1.4 } as const;

/** §6.4 O acender: cada letra acesa, apagada, acesa (a falha das janelas). */
export const ACENDE = { t0: 8.8, porLetra: 0.07, subDepois: 0.1, subPorLetra: 0.025, olhos: 0.45, acesaAte: 0.04, apagadaAte: 0.09 } as const;

/** §6.4 O repouso. */
export const REPOUSO = { respira: 5.2, respiraMin: 0.82, piscaPeriodo: 2.2, piscaMin: 0.4, outros: 0.7 } as const;

export const CORES_TEXTO = {
  selecionado: 0xb5f7ff, item: 0xd0d0dc, subApagado: 0x2f3c50, subAceso: 0x17a6bd, tituloApagado: 0x4b5a70,
  tituloAceso: 0xb5f7ff, dev: 0x6b6b7a,
} as const;

/** §7.2 Os itens da lista. */
export const ITEM = { comecar: 0, conducao: 1, arquivo: 2 } as const;
export const NOMES_ITENS = ['COMEÇAR', 'CONDUÇÃO', 'ARQUIVO DE CARTAS'] as const;

export const CONDUCOES = [
  { id: 'diegetico', nome: 'DIEGÉTICA', desc: 'a gravidade decide · recomendado', cor: 0x3ee0f0 },
  { id: 'flap', nome: 'LEGACY', desc: 'flap sempre · score ×1.25', cor: 0xff8c1a },
  { id: 'free', nome: 'LIVRE', desc: 'voo livre sempre · acessível', cor: 0x17a6bd },
] as const;

/** A chave da condução lembrada (`localStorage`). */
export const CHAVE_CONDUCAO = 'alienworld:conducao';
```

- [ ] **Step 5: rodar e ver passar**

Run: `node scripts/test-menu-ritmos.mjs`
Expected: todas as linhas `OK`, e `TUDO OK` no fim.

- [ ] **Step 6: checkpoint** — `npm run typecheck` sem erro (sem commit: os commits são da Task 15).

---

### Task 2: a abertura, em funções do tempo

**Files:**
- Create: `src/menu/abertura.ts`
- Test: `scripts/test-menu-abertura.mjs`

**Interfaces:**
- Consumes: `ABERTURA`, `JATOS`, `LISTA`, `ACENDE`, `REPOUSO`, `TITULO`, `SUBTITULO` (Task 1); `hash4`, `suave`.
- Produces:
  - `amortecida(o0, v0, periodo, z): (s: number) => number`
  - `posicaoLetreiro(tau): { x: number; y: number }`, `velocidadeLetreiro(tau): { vx; vy }`,
    `aceleracaoLetreiro(tau): { ax; ay }` (τ = t − `ABERTURA.letreiro.t0`)
  - `interface Particula { x; y; tam; cor; alfa }`, `particulasDosJatos(t): Particula[]`
  - `quedaLista(i, t): { dy; alfa }`, `alfaItem(selecionado, t, tCursor, pousado): number`
  - `acesa(ti, t)`, `letraAcesa(i, t)`, `subAcesa(i, t)`, `olhosAcesos(t)`, `respiracao(t)`, `alfaVeu(t)`,
    `quieto(t, pulou)`
  - `T_SUB`, `T_ACESO`, `T_OLHOS`, `T_LISTA_POUSA`, `T_FIM` (todos em segundos do relógio da abertura)

- [ ] **Step 1: o teste que falha**

`scripts/test-menu-abertura.mjs`:

```js
// A ABERTURA DO MENU (spec 2026-10-19-menu-refeito-design.md §6). Uso, da raiz: node scripts/test-menu-abertura.mjs
import { ABERTURA, JATOS } from '../src/menu/numerosMenu.ts';
import {
  posicaoLetreiro, velocidadeLetreiro, aceleracaoLetreiro, particulasDosJatos, quedaLista, alfaItem, acesa,
  letraAcesa, olhosAcesos, respiracao, alfaVeu, quieto, T_SUB, T_ACESO, T_OLHOS, T_LISTA_POUSA, T_FIM,
} from '../src/menu/abertura.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const perto = (a, b, e = 1e-3) => Math.abs(a - b) <= e;
const L = ABERTURA.letreiro;

// ── A QUEDA (§6.2) ──
conferir(perto(posicaoLetreiro(0).y, L.yIni), 'o letreiro entra em y −30', posicaoLetreiro(0));
conferir(perto(posicaoLetreiro(L.queima).y, ABERTURA.layout.titulo + L.sobra), 'o fim da queima para 2,5 px além do ponto', posicaoLetreiro(L.queima));
conferir(perto(posicaoLetreiro(9).y, ABERTURA.layout.titulo, 0.05), 'e firma no ponto (y 58)', posicaoLetreiro(9));
conferir(perto(posicaoLetreiro(9).x, ABERTURA.layout.x, 0.05), 'centralizado (x 192)', posicaoLetreiro(9));
conferir(perto(posicaoLetreiro(-0.001).y, posicaoLetreiro(0.001).y, 0.2), 'sem salto ao entrar', null);
const v0 = velocidadeLetreiro(0.01).vy;
conferir(v0 > 55 && v0 < 58, `entra a ~57 px/s (${v0.toFixed(1)})`, v0);
conferir(perto(velocidadeLetreiro(-0.01).vy, velocidadeLetreiro(0.01).vy, 1), 'sem salto de velocidade ao entrar', null);
conferir(Math.abs(velocidadeLetreiro(L.queima - 0.01).vy - velocidadeLetreiro(L.queima + 0.01).vy) < 1, 'nem no fim da queima', null);
conferir(aceleracaoLetreiro(-1).ay === 0, 'antes de entrar, sem aceleração (sem jato)', null);
conferir(aceleracaoLetreiro(1).ay < 0, 'na queima, a aceleração é para cima (os retrofoguetes freiam)', aceleracaoLetreiro(1));

// A MESMA PLUMA da rodada 7 (2,2 s): a força vertical, na mesma fração da queima, é a mesma.
const p = L.forma, Dq = ABERTURA.layout.titulo + L.sobra - L.yIni;
for (const f of [0.2, 0.4, 0.6, 0.8]) {
  const tau = f * L.queima, ay = -aceleracaoLetreiro(tau).ay;
  const ref = JATOS.aRef * (JATOS.queimaAprovada / L.queima) ** 2;
  const aprovada = (p * (p - 1) * Dq * (1 - f) ** (p - 2)) / JATOS.queimaAprovada ** 2 / JATOS.aRef;
  conferir(perto(ay / ref, aprovada, 0.01), `a força em ${f * 100}% da queima é a da rodada 7 (${(ay / ref).toFixed(3)})`, aprovada);
}

// ── OS JATOS (§6.3) ──
conferir(particulasDosJatos(L.t0 - 0.5).length === 0, 'antes de o letreiro entrar, nenhum jato', null);
const p1 = particulasDosJatos(L.t0 + 1);
conferir(p1.length > 40, `na queima, a pluma (${p1.length} partículas)`, p1.length);
conferir(JSON.stringify(p1) === JSON.stringify(particulasDosJatos(L.t0 + 1)), 'os jatos são função pura do tempo', null);
const cy = posicaoLetreiro(1).y;
conferir(p1.filter((q) => q.y > cy).length > p1.length * 0.6, 'a maior parte do gás sai por baixo (o freio)', null);
conferir(particulasDosJatos(L.t0 + L.queima + L.fimJatos + 0.5).length === 0, 'depois da queima e do ajuste, os jatos param', null);
conferir(p1.every((q) => q.alfa >= 0 && q.alfa <= 1 && q.tam > 0), 'alfa e tamanho válidos', null);

// ── A LISTA (§6.4) ──
conferir(quedaLista(0, 7.2).dy === -14 && quedaLista(0, 7.2).alfa === 0, 'a lista começa 14 px acima, invisível', quedaLista(0, 7.2));
conferir(Math.abs(quedaLista(2, 9.5).dy) < 0.3 && quedaLista(2, 9.5).alfa === 1, 'e pousa no lugar', quedaLista(2, 9.5));
conferir(perto(T_LISTA_POUSA, 7.2 + 0.16 + 1.4), `pousa em ${T_LISTA_POUSA.toFixed(2)} s`, T_LISTA_POUSA);
conferir(alfaItem(false, 20, 10, true) === 0.7, 'item fora do cursor a 0,7', null);
conferir(perto(alfaItem(true, 10, 10, true), 1) && perto(alfaItem(true, 11.1, 10, true), 0.4), 'o do cursor pisca de 1 a 0,4 em 2,2 s', null);

// ── O ACENDER (§6.4) ──
conferir(acesa(0, 0.02) && !acesa(0, 0.06) && acesa(0, 0.1) && !acesa(0, -0.01), 'cada letra: acesa, apagada, acesa de vez', null);
conferir(!letraAcesa(0, 8.79) && letraAcesa(0, 8.9), 'a 1ª letra acende aos 8,8 s', null);
conferir(perto(T_SUB, 9.6) && perto(T_ACESO, 9.95) && perto(T_OLHOS, 10.4), `REMASTERED ${T_SUB.toFixed(2)}, aceso ${T_ACESO.toFixed(2)}, olhos ${T_OLHOS.toFixed(2)}`, null);
conferir(!olhosAcesos(10.3) && olhosAcesos(10.6), 'os olhos por último (~10,4 s)', null);
conferir(T_FIM > T_OLHOS, 'a abertura acaba depois dos olhos', T_FIM);
conferir(respiracao(9) === 1, 'antes de acender inteiro, o letreiro não respira', null);
const minimo = Math.min(...Array.from({ length: 60 }, (_, i) => respiracao(T_ACESO + i * 0.1)));
conferir(perto(minimo, 0.82, 0.01), `depois respira até 0,82 (${minimo.toFixed(3)})`, minimo);

// ── O VÉU E A JANELA QUIETA (§6.1, §4.3) ──
conferir(alfaVeu(0) === 1 && alfaVeu(1.2) === 0, 'o véu sai em 1,2 s', null);
conferir(!quieto(2.4, false), 'o 1º relâmpago (2,4 s) pode cair', null);
conferir(quieto(3, false) && quieto(10.45, false) && !quieto(10.6, false), 'nenhum relâmpago de 3,0 a 10,5 s', null);
conferir(!quieto(5, true), 'pulada a abertura, o céu volta a poder trovejar', null);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: rodar e ver falhar**

Run: `node scripts/test-menu-abertura.mjs`
Expected: `ERR_MODULE_NOT_FOUND` (`src/menu/abertura.ts`).

- [ ] **Step 3: `src/menu/abertura.ts`**

```ts
import { ABERTURA, ACENDE, JATOS, LISTA, REPOUSO, SUBTITULO, TITULO } from './numerosMenu.ts';
import { hash4, suave } from './acaso.ts';

/**
 * A ABERTURA DO MENU como funções puras do relógio (spec `2026-10-19-menu-refeito-design.md` §6): o mesmo instante
 * sempre dá o mesmo quadro — a sonda para o relógio em qualquer ponto e confere (`MenuScene.irPara`).
 *
 * O letreiro é uma NAVE: entra pelo alto já freando, os retrofoguetes queimam o caminho todo (3,8 s, forte e constante,
 * aliviando só no fim), ele passa um pouco do ponto e uma mola o firma; de lado, chega deslocado e outra mola o corrige.
 * Cada bocal dos jatos dispara quando essa aceleração pede o empurrão dele — a física comanda os jatos.
 */

/** Uma mola subamortecida: o deslocamento `s` segundos depois, saindo de `o0` com velocidade `v0`. */
export function amortecida(o0: number, v0: number, periodo: number, z: number): (s: number) => number {
  const w = (2 * Math.PI) / periodo;
  const wd = w * Math.sqrt(1 - z * z);
  const b = (v0 + z * w * o0) / wd;
  return (s) => Math.exp(-z * w * s) * (o0 * Math.cos(wd * s) + b * Math.sin(wd * s));
}

const L = ABERTURA.letreiro;
/** A distância da queima: do alto até 2,5 px além do ponto. */
const DQ = ABERTURA.layout.titulo + L.sobra - L.yIni;
/** A velocidade com que ele entra (a da queima no instante 0). */
const V0 = (L.forma * DQ) / L.queima;
const MOLA_Y = amortecida(L.sobra, 0, L.molaY.periodo, L.molaY.amortecimento);
const MOLA_X = amortecida(L.deriva, 0, L.molaX.periodo, L.molaX.amortecimento);

function yLetreiro(tau: number): number {
  if (tau < 0) return L.yIni + V0 * tau; // antes de entrar: em linha reta, na velocidade da queima (sem salto)
  if (tau < L.queima) return L.yIni + DQ * (1 - Math.pow(1 - tau / L.queima, L.forma));
  return ABERTURA.layout.titulo + MOLA_Y(tau - L.queima);
}

function xLetreiro(tau: number): number {
  return ABERTURA.layout.x + (tau < 0 ? L.deriva : MOLA_X(tau));
}

/** O CENTRO do letreiro em px de jogo, `tau` segundos depois de ele entrar (τ < 0: ainda acima da tela). */
export function posicaoLetreiro(tau: number): { x: number; y: number } {
  return { x: xLetreiro(tau), y: yLetreiro(tau) };
}

const H = 0.004;

export function velocidadeLetreiro(tau: number): { vx: number; vy: number } {
  return {
    vx: (xLetreiro(tau + H) - xLetreiro(tau - H)) / (2 * H),
    vy: (yLetreiro(tau + H) - yLetreiro(tau - H)) / (2 * H),
  };
}

/** A aceleração (px/s²). Antes de entrar é zero: ele ainda não ligou os jatos. */
export function aceleracaoLetreiro(tau: number): { ax: number; ay: number } {
  if (tau < 0) return { ax: 0, ay: 0 };
  return {
    ax: (xLetreiro(tau + H) - 2 * xLetreiro(tau) + xLetreiro(tau - H)) / (H * H),
    ay: (yLetreiro(tau + H) - 2 * yLetreiro(tau) + yLetreiro(tau - H)) / (H * H),
  };
}

export interface Particula {
  x: number;
  y: number;
  /** O lado do quadradinho, em px de jogo. */
  tam: number;
  cor: number;
  alfa: number;
}

/**
 * O gás dos jatos no instante `t` (relógio da abertura). A emissão mora numa grade fixa de 60 Hz e o acaso sai de um
 * hash de (instante, bocal, partícula): é uma função PURA do tempo. Cada partícula sai quente (branca), vira chama
 * (âmbar) e depois vapor frio que cresce, freia no ar, herda parte da velocidade do letreiro e deriva com o vento.
 */
export function particulasDosJatos(t: number): Particula[] {
  const out: Particula[] = [];
  const fim = L.t0 + L.queima + L.fimJatos;
  const refQueima = JATOS.aRef * Math.pow(JATOS.queimaAprovada / L.queima, 2);
  for (let j = Math.max(0, Math.floor((t - JATOS.vida[1]) * 60)); j <= Math.floor(t * 60); j++) {
    const te = j / 60;
    const tau = te - L.t0;
    if (tau < 0 || te > fim) continue;
    const { ax, ay } = aceleracaoLetreiro(tau);
    const { x: cx, y: cy } = posicaoLetreiro(tau);
    const { vx, vy } = velocidadeLetreiro(tau);
    JATOS.bicos.forEach(([dx, dy, ux, uy, peso], b) => {
      // A queima longa e suave mantém a pluma aprovada (rodada 7): a referência vertical escala com ela.
      const ref = uy !== 0 && tau < L.queima ? refQueima : JATOS.aRef;
      const forca = Math.min(JATOS.teto, Math.max(0, -(ax * ux + ay * uy)) / ref);
      const qtd = Math.floor((forca * JATOS.taxa * peso) / 60 + hash4(j, b, 0, 1));
      for (let k = 0; k < qtd && out.length < JATOS.max; k++) {
        const r = (c: number): number => hash4(j, b, k + 1, c);
        const vida = JATOS.vida[0] + r(1) * (JATOS.vida[1] - JATOS.vida[0]);
        const idade = t - te;
        if (idade < 0 || idade >= vida) continue;
        const ang = Math.atan2(uy, ux) + (r(2) - 0.5) * JATOS.abre;
        const v = JATOS.vel[0] + r(3) * (JATOS.vel[1] - JATOS.vel[0]);
        const d = JATOS.arrasto * (1 - Math.exp(-idade / JATOS.arrasto)); // quanto uma velocidade unitária andou, com o arrasto do ar
        const f = idade / vida;
        out.push({
          x: cx + dx + (r(4) - 0.5) * JATOS.espalho[0] + (Math.cos(ang) * v + vx * JATOS.herda) * d + JATOS.deriva[0] * idade,
          y: cy + dy + (r(5) - 0.5) * JATOS.espalho[1] + (Math.sin(ang) * v + vy * JATOS.herda) * d + JATOS.deriva[1] * idade,
          tam: idade < JATOS.quente ? 0.75 : idade < JATOS.chama ? 1 : 1 + f,
          cor: idade < JATOS.quente ? JATOS.cores.quente : idade < JATOS.chama ? JATOS.cores.chama : JATOS.cores.vapor,
          alfa: idade < JATOS.chama ? 1 : 0.6 * Math.pow(1 - f, 1.5),
        });
      }
    });
  }
  return out;
}

const MOLA_LISTA = amortecida(-LISTA.queda, 0, LISTA.periodo, LISTA.amortecimento);

/** A linha `i` da lista: quanto falta descer (px) e o quanto já apareceu. Em formação, 0,08 s uma da outra. */
export function quedaLista(i: number, t: number): { dy: number; alfa: number } {
  const tau = t - (LISTA.t0 + i * LISTA.passo);
  return { dy: tau <= 0 ? -LISTA.queda : MOLA_LISTA(tau), alfa: suave(0, LISTA.fade, tau) };
}

/** A lista inteira pousou: o menu aceita teclas. */
export const T_LISTA_POUSA = LISTA.t0 + 2 * LISTA.passo + LISTA.assenta;

/** No repouso: o item do cursor pisca (1 → 0,4), os outros ficam a 0,7. */
export function alfaItem(selecionado: boolean, t: number, tCursor: number, pousado: boolean): number {
  if (!selecionado) return REPOUSO.outros;
  if (!pousado) return 1;
  return 1 - ((1 - REPOUSO.piscaMin) / 2) * (1 - Math.cos((2 * Math.PI * (t - tCursor)) / REPOUSO.piscaPeriodo));
}

/** Uma luz que acende com a falha das janelas: acesa, apagada, e acesa de vez. */
export function acesa(ti: number, t: number): boolean {
  const d = t - ti;
  return d >= ACENDE.apagadaAte || (d >= 0 && d < ACENDE.acesaAte);
}

const letras = (s: string): number => [...s].filter((c) => c !== ' ').length;
export const T_SUB = ACENDE.t0 + letras(TITULO) * ACENDE.porLetra + ACENDE.subDepois;
export const T_ACESO = T_SUB + letras(SUBTITULO) * ACENDE.subPorLetra + ACENDE.subDepois;
export const T_OLHOS = T_ACESO + ACENDE.olhos;
/** A abertura acabou: pular leva o relógio para cá. */
export const T_FIM = T_OLHOS + ACENDE.apagadaAte + 0.1;

export const letraAcesa = (i: number, t: number): boolean => acesa(ACENDE.t0 + i * ACENDE.porLetra, t);
export const subAcesa = (i: number, t: number): boolean => acesa(T_SUB + i * ACENDE.subPorLetra, t);
export const olhosAcesos = (t: number): boolean => acesa(T_OLHOS, t);

/** Aceso inteiro, o letreiro respira (1 → 0,82). */
export function respiracao(t: number): number {
  if (t <= T_ACESO) return 1;
  return 1 - ((1 - REPOUSO.respiraMin) / 2) * (1 - Math.cos((2 * Math.PI * (t - T_ACESO)) / REPOUSO.respira));
}

/** O véu preto que revela o cenário. */
export const alfaVeu = (t: number): number => 1 - suave(0, ABERTURA.veu, t);

/** A janela sem relâmpago: da entrada do letreiro até os olhos acenderem (a menos que a abertura tenha sido pulada). */
export const quieto = (t: number, pulou: boolean): boolean => !pulou && t >= L.t0 && t <= T_OLHOS + 0.1;
```

- [ ] **Step 4: rodar e ver passar**

Run: `node scripts/test-menu-abertura.mjs`
Expected: todas as linhas `OK`, `TUDO OK`.

- [ ] **Step 5: checkpoint** — `npm run typecheck` sem erro.

---

### Task 3: o tempo do cenário

**Files:**
- Create: `src/menu/ritmos.ts`
- Modify: `scripts/test-menu-ritmos.mjs` (os testes do ritmo antes do resumo final)

**Interfaces:**
- Consumes: `TRAVESSIA`, `JANELAS`, `FAROIS`, `TRAFEGO`, `NAVE`, `FEIXE`, `BUSCA`, `TEMPESTADE` (Task 1).
- Produces:
  - `interface Caixa { x; y; w; h }`, `interface RitmoJanela { ciclo; fora; fase; falha }`
  - `janelaApagada(l, t): boolean`, `farolApagado(fase, t): boolean`, `torres(caixas): number[]`
  - `travessia(t): { x; y; quadro }`, `pontoTrafego(ponte, p, v, fl, t): { x; y; alfa }`
  - `luzesDaNave(t): { fileira: number[]; baixo: number[]; topo: boolean }`
  - `anguloHolofote(h, t)`, `anguloBusca(t)`, `forcaPropulsor(i, t)`, `alfaEstrela(f, p, t)`
  - `brilhoRelampago(dt): { v: number; raio: number }`

- [ ] **Step 1: os testes que falham**

Em `scripts/test-menu-ritmos.mjs`, troque o import da 1ª linha de código por:

```js
import { lcg, hash4, suave } from '../src/menu/acaso.ts';
import { TRAVESSIA, FAROIS, TRAFEGO, TEMPESTADE, HOLOFOTES } from '../src/menu/numerosMenu.ts';
import {
  janelaApagada, farolApagado, torres, travessia, pontoTrafego, luzesDaNave, anguloHolofote, forcaPropulsor,
  alfaEstrela, brilhoRelampago,
} from '../src/menu/ritmos.ts';
```

e, antes da linha `console.log(falhas.length ? ...`, acrescente:

```js
// ── AS JANELAS E OS FARÓIS (§3.2) ──
const jan = { ciclo: 5, fora: 1, fase: 0, falha: false };
conferir(janelaApagada(jan, 0.5) && !janelaApagada(jan, 2), 'a janela apaga `fora` s a cada ciclo', null);
const falha = { ...jan, falha: true };
conferir(janelaApagada(falha, 0.05) && !janelaApagada(falha, 0.1), 'com falha, ela pisca a 12 Hz antes de apagar', null);
conferir(!farolApagado(0, 0.5) && farolApagado(0, 1.5) && !farolApagado(0, 2.4), 'o farol: aceso até 1,4 s, apagado até 2,3 s', null);
const raizes = torres([{ x: 10, y: 10, w: 1, h: 1 }, { x: 10.5, y: 18, w: 1, h: 1 }, { x: 40, y: 10, w: 1, h: 1 }]);
conferir(raizes[0] === raizes[1] && raizes[2] !== raizes[0], 'dois faróis na mesma coluna são uma torre; o longe é outra', raizes);

// ── A TRAVESSIA EM LOOP (§3.1) ──
conferir(Math.abs(travessia(0).x - (200 + (204 * 3) / 45)) < 1e-6, 'o menu abre com a travessia 3 s adiantada', travessia(0));
conferir(travessia(42).x === 404 && travessia(47).x === 404, 'sai pela direita e o céu fica vazio por 6 s', [travessia(42).x, travessia(47).x]);
conferir(travessia(48.1).x < 201, 'e volta a sair da nuvem: loop de 51 s', travessia(48.1));
conferir(travessia(1).quadro === 6 % 16, 'nada a 6 quadros/s', travessia(1).quadro);

// ── O TRÁFEGO (§3.3) ──
const ponte = [0, 0, 100, 0];
conferir(pontoTrafego(ponte, 0, 0, 0, 0).alfa === 0, 'na ponta do deque a luz some (não atravessa a parede)', null);
const meio = pontoTrafego(ponte, 0.5, 0, 0, 0);
conferir(meio.alfa > 0.3 && Math.abs(meio.x - 50.5) < 1e-9, 'no meio, acesa e no centro do pixel', meio);
conferir(TRAFEGO.pontes.every(([x0, , x1]) => x1 > x0), 'as pontes vão da esquerda para a direita', null);

// ── A NAVE E OS HOLOFOTES (§3.4, §4) ──
const n0 = luzesDaNave(0);
conferir(n0.fileira[0] === 1 && n0.fileira.slice(1).every((a) => a === 0.35), 'a fileira corre: uma acesa, as outras a 0,35', n0.fileira);
conferir(luzesDaNave(0.1).topo && !luzesDaNave(0.5).topo, 'o farol do topo pisca 0,25 s a cada 1,6 s', null);
const h = HOLOFOTES[0];
conferir(anguloHolofote(h, 0) === h.base, 'o holofote começa na base', anguloHolofote(h, 0));
const angs = Array.from({ length: 200 }, (_, i) => anguloHolofote(h, i * 0.37));
conferir(angs.every((a) => Math.abs(a - h.base) <= h.amp * 1.25 + 1e-9), 'e varre só dentro da faixa dele', null);
conferir(Array.from({ length: 50 }, (_, i) => forcaPropulsor(1, i * 0.03)).every((f) => f >= 0.5 && f <= 1), 'o propulsor treme entre 0,5 e 1', null);
conferir(Array.from({ length: 50 }, (_, i) => alfaEstrela(1.2, 0.3, i * 0.1)).every((a) => a >= 0.35 && a <= 1), 'a estrela cintila entre 0,35 e 1', null);

// ── O RELÂMPAGO (§4.3) ──
const r0 = brilhoRelampago(0.01), r1 = brilhoRelampago(0.08), r2 = brilhoRelampago(0.12);
conferir(r0.v === 1 && r0.raio === 1, 'o 1º golpe: clarão inteiro, com o raio', r0);
conferir(r1.raio === 0 && r1.v > 0 && r1.v < 1, 'entre os golpes, o raio some e o clarão decai', r1);
conferir(r2.raio === 0.5, 'o 2º golpe é mais fraco', r2);
conferir(brilhoRelampago(2).v === 0 && brilhoRelampago(-0.1).v === 0, 'fora do relâmpago, nada', null);
const golpesPorSegundo = TEMPESTADE.golpes.length / (TEMPESTADE.golpes.at(-1)[0] + TEMPESTADE.golpes.at(-1)[2]);
conferir(TEMPESTADE.golpes.length <= 3, `no máximo 3 clarões por relâmpago (${golpesPorSegundo.toFixed(1)}/s num instante)`, null);
conferir(FAROIS.margem === 3, 'a peça do farol leva o halo (3 px)', FAROIS.margem);
```

- [ ] **Step 2: rodar e ver falhar**

Run: `node scripts/test-menu-ritmos.mjs`
Expected: `ERR_MODULE_NOT_FOUND` (`src/menu/ritmos.ts`).

- [ ] **Step 3: `src/menu/ritmos.ts`**

```ts
import { BUSCA, FAROIS, FEIXE, JANELAS, NAVE, TEMPESTADE, TRAFEGO, TRAVESSIA } from './numerosMenu.ts';

/**
 * O TEMPO DO CENÁRIO DO MENU (spec `2026-10-19-menu-refeito-design.md` §3–4), em funções puras do relógio `t` (s):
 * quando cada luz apaga, onde anda cada luz do tráfego, para onde aponta cada holofote, quanto brilha um relâmpago. As
 * peças (`vida.ts`, `perigo.ts`, `leviata.ts`) só leem daqui e pintam.
 */

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RitmoJanela {
  ciclo: number;
  fora: number;
  fase: number;
  /** Pisca antes de apagar (a falha). */
  falha: boolean;
}

/** A janela está apagada em `t`? Apaga `fora` s a cada `ciclo`; as com falha piscam a 12 Hz no começo. */
export function janelaApagada(l: RitmoJanela, t: number): boolean {
  const c = (t + l.fase) % l.ciclo;
  if (l.falha && c < JANELAS.falhaDur) return Math.floor(c * JANELAS.falhaHz) % 2 === 0;
  return c < l.fora;
}

/** O farol está apagado em `t`? 1,4 s aceso a cada 2,3 s. */
export function farolApagado(fase: number, t: number): boolean {
  return (t + fase) % FAROIS.ciclo > FAROIS.acesoAte;
}

/**
 * As TORRES: os faróis a ≤ 3 px de lado e ≤ 14 px de altura uns dos outros são a mesma torre e piscam juntos (19/10,
 * ele: o de cima e o de baixo da torre alta estavam em descompasso). Devolve, para cada farol, o índice da torre.
 */
export function torres(caixas: readonly Caixa[]): number[] {
  const pai = caixas.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const cx = (c: Caixa): number => c.x + c.w / 2;
  const cy = (c: Caixa): number => c.y + c.h / 2;
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      if (Math.abs(cx(caixas[i]) - cx(caixas[j])) <= FAROIS.torreDx && Math.abs(cy(caixas[i]) - cy(caixas[j])) <= FAROIS.torreDy) {
        pai[raiz(j)] = raiz(i);
      }
    }
  }
  return caixas.map((_, i) => raiz(i));
}

/** O Leviatã: a travessia de 45 s em loop, 3 s adiantada, com 6 s de céu vazio entre uma e outra. */
export function travessia(t: number): { x: number; y: number; quadro: number } {
  const T = TRAVESSIA;
  const u = Math.min(1, ((t + T.adiantar) % (T.seg + T.pausa)) / T.seg);
  return { x: T.x0 + (T.x1 - T.x0) * u, y: T.y0 + (T.y1 - T.y0) * u, quadro: Math.floor(t * T.nadoFps) % T.quadros };
}

/**
 * Uma luz do tráfego numa ponte `[x0, y0, x1, y1]` (o trecho VISÍVEL do deque): onde está (no centro do pixel) e
 * quanto brilha — tremendo no ar e sumindo nos últimos `pontaFade` px de cada ponta, como quem entra num portão.
 */
export function pontoTrafego(ponte: readonly number[], p: number, v: number, fl: number, t: number): { x: number; y: number; alfa: number } {
  const [x0, y0, x1, y1] = ponte;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const s = ((((p * len + v * t) % len) + len) % len) / len;
  const ponta = Math.min(1, (s * len) / TRAFEGO.pontaFade, ((1 - s) * len) / TRAFEGO.pontaFade);
  const tremor = 0.6 + 0.25 * Math.sin(t * 5.3 + fl) + 0.1 * Math.sin(t * 13.1 + fl * 2);
  return { x: x0 + (x1 - x0) * s + 0.5, y: y0 + (y1 - y0) * s + 0.5, alfa: tremor * ponta * ponta };
}

/** As luzes da nave: a fileira da barriga corre, as de baixo respiram, o farol do topo pisca. */
export function luzesDaNave(t: number): { fileira: number[]; baixo: number[]; topo: boolean } {
  const vez = Math.floor(t * NAVE.corridaHz) % (NAVE.fileira.length + 2);
  return {
    fileira: NAVE.fileira.map((_, i) => (i === vez ? 1 : NAVE.apagada)),
    baixo: NAVE.baixo.map((_, i) => 0.45 + 0.35 * Math.sin(t * 2.2 + i)),
    topo: t % NAVE.topoPeriodo < NAVE.topoAceso,
  };
}

/** Um holofote antiaéreo procurando: a varredura e uma vagueada mais lenta, cada um no seu relógio. */
export function anguloHolofote(h: { base: number; amp: number; per: number; fase: number }, t: number): number {
  return (
    h.base +
    h.amp * Math.sin((2 * Math.PI * t) / h.per + h.fase) +
    FEIXE.vaguear * h.amp * Math.sin((2 * Math.PI * t) / (h.per * FEIXE.vaguearPer) + 2 * h.fase)
  );
}

/** O holofote da nave varrendo o vale. */
export function anguloBusca(t: number): number {
  return BUSCA.base + BUSCA.amp * Math.sin((2 * Math.PI * t) / BUSCA.per) + BUSCA.ampFina * Math.sin((2 * Math.PI * t) / BUSCA.perFina + 1);
}

/** O tremor de um propulsor (0,5–1). */
export function forcaPropulsor(i: number, t: number): number {
  return 0.75 + 0.15 * Math.sin(t * 31 + i * 2) + 0.1 * Math.sin(t * 57 + i * 5);
}

/** O cintilar de uma estrela (0,35–1). */
export function alfaEstrela(f: number, p: number, t: number): number {
  return 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * f * 2 + p));
}

/**
 * Um relâmpago, `dt` s depois de começar: `v` é o clarão (cada golpe aceso pela duração dele e decaindo depois) e
 * `raio` a força do golpe aceso agora (o raio só aparece enquanto um golpe está aceso; entre eles, some).
 */
export function brilhoRelampago(dt: number): { v: number; raio: number } {
  if (dt < 0 || dt > TEMPESTADE.duracao) return { v: 0, raio: 0 };
  let v = 0;
  let raio = 0;
  for (const [inicio, forca, dur] of TEMPESTADE.golpes) {
    const u = dt - inicio;
    if (u < 0) continue;
    v = Math.max(v, u <= dur ? forca : forca * Math.exp(-(u - dur) / TEMPESTADE.decai));
    if (u <= dur) raio = Math.max(raio, forca);
  }
  return { v, raio };
}
```

- [ ] **Step 4: rodar e ver passar**

Run: `node scripts/test-menu-ritmos.mjs`
Expected: `TUDO OK`.

- [ ] **Step 5: checkpoint** — `npm run typecheck` sem erro.

---

### Task 4: o neon, pixel a pixel

**Files:**
- Create: `scripts/fixtures/menu/glifos-alien-world.json`, `neon-apagado.png`, `neon-aceso.png`, `neon-olhos.png`
- Create: `src/menu/letreiroPixels.ts`
- Test: `scripts/test-menu-letreiro.mjs`

**Interfaces:**
- Produces:
  - `interface Glifos { w: number; h: number; linhas: readonly string[]; letras: readonly { ch: string; x0: number; x1: number }[] }`
  - `type EstadoLetreiro = 'apagado' | 'aceso' | 'olhos'`
  - `interface ImagemLetreiro { w: number; h: number; rgba: Uint8ClampedArray }`
  - `PAD = 6`, `pintarLetreiro(g, P, estado): ImagemLetreiro`
  - `faixasDasLetras(g, P): { ch: string; ini: number; fim: number }[]` (colunas, em pixels do letreiro)

- [ ] **Step 1: o gabarito (os neons aprovados na rodada 7)**

```bash
mkdir -p scripts/fixtures/menu
S="/c/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/07003ab8-51e6-403a-82f7-7a6881699d8a/scratchpad/menuE"
B=docs/superpowers/folhas/2026-10-19/menu/rodada7/bases
cp "$S/letreiro/glifos.json" scripts/fixtures/menu/glifos-alien-world.json
cp $B/neon-apagado-1x.png scripts/fixtures/menu/neon-apagado.png
cp $B/neon-aceso-1x.png scripts/fixtures/menu/neon-aceso.png
cp $B/neon-aceso-olhos-1x.png scripts/fixtures/menu/neon-olhos.png
```

Se o `glifos.json` do scratch não existir mais, gere de novo: `node scripts/_menu/_glifos.mjs scripts/fixtures/menu`
(com o `npm run dev` rodando) e renomeie `glifos.json` para `glifos-alien-world.json`.

- [ ] **Step 2: o teste que falha**

`scripts/test-menu-letreiro.mjs`:

```js
// O NEON DO LETREIRO (spec 2026-10-19-menu-refeito-design.md §6.5): o gerador do jogo reproduz, pixel a pixel, os três
// estados aprovados na rodada 7 (o gabarito em scripts/fixtures/menu/). Uso, da raiz: node scripts/test-menu-letreiro.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { pintarLetreiro, faixasDasLetras, PAD } from '../src/menu/letreiroPixels.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const DIR = 'scripts/fixtures/menu';
const glifos = JSON.parse(fs.readFileSync(`${DIR}/glifos-alien-world.json`, 'utf8'));

for (const [estado, arquivo] of [['apagado', 'neon-apagado.png'], ['aceso', 'neon-aceso.png'], ['olhos', 'neon-olhos.png']]) {
  const img = pintarLetreiro(glifos, 4, estado);
  const { data, info } = await sharp(`${DIR}/${arquivo}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  conferir(img.w === info.width && img.h === info.height, `${estado}: o tamanho (${img.w}×${img.h})`, [info.width, info.height]);
  let dif = 0, primeiro = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== img.rgba[i]) {
      dif++;
      if (!primeiro) primeiro = { px: Math.floor(i / 4), canal: i % 4, gabarito: data[i], gerado: img.rgba[i] };
    }
  }
  conferir(dif === 0, `${estado}: idêntico ao aprovado, pixel a pixel`, { dif, primeiro });
}

const f4 = faixasDasLetras(glifos, 4);
conferir(f4.length === 10 && f4.map((l) => l.ch).join('') === 'ALIENWORLD', 'dez letras, na ordem', f4.map((l) => l.ch).join(''));
conferir(f4[0].ini === 0 && f4.at(-1).fim === glifos.w * 4 + 2 * PAD, 'as faixas cobrem o letreiro inteiro', [f4[0], f4.at(-1)]);
conferir(f4.every((l, i) => i === 0 || l.ini === f4[i - 1].fim), 'sem buraco nem sobreposição entre letras', null);

// Outra escala (Full HD, s = 5): o mesmo desenho num grão maior, com os olhos só no estado `olhos`.
const vermelhos = (img) => {
  let n = 0;
  for (let i = 0; i < img.rgba.length; i += 4) if (img.rgba[i] === 255 && img.rgba[i + 1] === 58 && img.rgba[i + 2] === 42) n++;
  return n;
};
const a5 = pintarLetreiro(glifos, 5, 'aceso'), o5 = pintarLetreiro(glifos, 5, 'olhos');
conferir(a5.w === glifos.w * 5 + 2 * PAD && a5.h === glifos.h * 5 + 2 * PAD, `em P = 5: ${a5.w}×${a5.h}`, null);
conferir(vermelhos(a5) === 0 && vermelhos(o5) > 0, 'os olhos só no estado com olhos', [vermelhos(a5), vermelhos(o5)]);
conferir(vermelhos(pintarLetreiro(glifos, 4, 'apagado')) === 0, 'apagado: sem nenhum sinal dos olhos', null);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 3: rodar e ver falhar**

Run: `node scripts/test-menu-letreiro.mjs`
Expected: `ERR_MODULE_NOT_FOUND` (`src/menu/letreiroPixels.ts`).

- [ ] **Step 4: `src/menu/letreiroPixels.ts`** (a transcrição da base B de `scripts/_menu/_letreiro.mjs`)

```ts
/**
 * O LETREIRO DE NEON, pixel a pixel (spec `2026-10-19-menu-refeito-design.md` §6.5) — a base B da rodada 7, escolhida
 * por ele (*"a neon que acende, da forma que usou no gif"*). Nasce das letras EXATAS da Silkscreen do jogo (a grafia
 * certa, o W da cabeça do alien): cada pixel da fonte vira P×P pixels do letreiro, e cada pixel do letreiro ocupa
 * 2 px de tela (P = s: nítido em qualquer tela). Tubos de vidro correm pelo contorno de cada letra — borda ciano,
 * núcleo branco —, os ocos grandes (a cara do W) ficam escuros com um brilho por dentro, e aceso o brilho vaza no ar.
 *
 * Módulo puro: `scripts/test-menu-letreiro.mjs` confere que P = 4 reproduz os três estados aprovados, pixel a pixel.
 */

export interface Glifos {
  w: number;
  h: number;
  /** Uma string por linha: `#` aceso, `.` apagado. */
  linhas: readonly string[];
  /** A faixa de colunas de tinta de cada letra (sem os espaços). */
  letras: readonly { ch: string; x0: number; x1: number }[];
}

export type EstadoLetreiro = 'apagado' | 'aceso' | 'olhos';

export interface ImagemLetreiro {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
}

/** A folga em volta das letras (o brilho e o contorno), em pixels do letreiro. */
export const PAD = 6;

type Cor = readonly [number, number, number] | readonly [number, number, number, number];

const BORDA_ACESA: Cor = [40, 200, 232];
const NUCLEO_ACESO: Cor = [214, 252, 255];
const BORDA_APAGADA: Cor = [62, 72, 88];
const NUCLEO_APAGADO: Cor = [100, 114, 134];
const OLHO: Cor = [255, 58, 42];
const OLHO_QUENTE: Cor = [255, 200, 180];

export function pintarLetreiro(g: Glifos, P: number, estado: EstadoLetreiro): ImagemLetreiro {
  const W = g.w * P + 2 * PAD;
  const H = g.h * P + 2 * PAD;
  const aceso = estado !== 'apagado';
  const comOlhos = estado === 'olhos';
  const fonte = (fx: number, fy: number): boolean => fy >= 0 && fy < g.h && fx >= 0 && fx < g.w && g.linhas[fy][fx] === '#';
  const dentro = (x: number, y: number): boolean => x >= PAD && y >= PAD && fonte(Math.floor((x - PAD) / P), Math.floor((y - PAD) / P));

  // A distância de Chebyshev até o outro lado da borda da letra (1 = encostado nela), até 5; 6 = mais longe.
  const D = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lado = dentro(x, y);
      let d = 6;
      busca: for (let r = 1; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && dentro(x + dx, y + dy) !== lado) {
              d = r;
              break busca;
            }
          }
        }
      }
      D[y * W + x] = d;
    }
  }

  // Os OCOS: dentro da letra, além do tubo de 2 px. Só um oco GRANDE fica escuro (a cara do W); os pequenos (os
  // degraus do N) liam como furos, e o tubo os preenche.
  const OCO = new Uint8Array(W * H);
  const visto = new Uint8Array(W * H);
  const limiar = 40 * (P / 4) * (P / 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i0 = y * W + x;
      if (visto[i0] || !dentro(x, y) || D[i0] < 3) continue;
      const fila = [i0];
      const comp: number[] = [];
      visto[i0] = 1;
      while (fila.length) {
        const i = fila.pop()!;
        comp.push(i);
        const cx = i % W;
        const cy = (i - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (visto[n] || !dentro(nx, ny) || D[n] < 3) continue;
          visto[n] = 1;
          fila.push(n);
        }
      }
      if (comp.length >= limiar) for (const i of comp) OCO[i] = 1;
    }
  }

  // Os OLHOS: no rosto do W (a linha 3, as colunas 2 e 4 da letra), meio pixel de fonte cada, um pixel quente.
  const LW = g.letras.find((l) => l.ch === 'W');
  const lado = Math.max(1, Math.round(P / 2));
  const desloc = Math.round(P / 4);
  const olhos = LW ? [LW.x0 + 1, LW.x0 + 3].map((fx) => [PAD + fx * P + desloc, PAD + 2 * P + desloc]) : [];
  const ehOlho = (x: number, y: number): boolean => olhos.some(([ox, oy]) => x >= ox && x < ox + lado && y >= oy && y < oy + lado);
  const pertoOlho = (x: number, y: number): boolean =>
    olhos.some(([ox, oy]) => x >= ox - 1 && x < ox + lado + 1 && y >= oy - 1 && y < oy + lado + 1);
  const olhoQuente = (x: number, y: number): boolean => olhos.some(([ox, oy]) => x === ox && y === oy);

  const cor = (x: number, y: number): Cor | null => {
    const d = D[y * W + x];
    if (comOlhos && ehOlho(x, y)) return olhoQuente(x, y) ? OLHO_QUENTE : OLHO;
    if (dentro(x, y)) {
      if (d === 1) return aceso ? BORDA_ACESA : BORDA_APAGADA;
      if (d === 2 || !OCO[y * W + x]) return aceso ? NUCLEO_ACESO : NUCLEO_APAGADO;
      if (aceso && comOlhos && pertoOlho(x, y)) return [255, 58, 42, 45];
      return aceso ? [20, 110, 130, d === 3 ? 110 : 60] : [10, 12, 18, 150];
    }
    if (aceso) return d === 1 ? [40, 200, 232, 120] : d === 2 ? [40, 200, 232, 64] : d === 3 ? [40, 200, 232, 28] : null;
    return d === 1 ? [6, 8, 12, 210] : null;
  };

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = cor(x, y);
      if (!c) continue;
      const i = (y * W + x) * 4;
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = c.length === 4 ? c[3] : 255;
    }
  }
  return { w: W, h: H, rgba };
}

/** A faixa de colunas de cada letra no letreiro (a divisa no meio do vão: o brilho vai junto com a sua letra). */
export function faixasDasLetras(g: Glifos, P: number): { ch: string; ini: number; fim: number }[] {
  const W = g.w * P + 2 * PAD;
  return g.letras.map((l, i, a) => ({
    ch: l.ch,
    ini: i === 0 ? 0 : Math.round(PAD + ((a[i - 1].x1 + 1 + l.x0) / 2) * P),
    fim: i === a.length - 1 ? W : Math.round(PAD + ((l.x1 + 1 + a[i + 1].x0) / 2) * P),
  }));
}
```

- [ ] **Step 5: rodar e ver passar**

Run: `node scripts/test-menu-letreiro.mjs`
Expected: os três estados `idêntico ao aprovado, pixel a pixel`, e `TUDO OK`. Se algum estado diferir, compare a
função `neon` de `scripts/_menu/_letreiro.mjs` linha a linha com `cor()` acima: o gabarito é a verdade.

- [ ] **Step 6: checkpoint** — `npm run typecheck` sem erro.

---

### Task 5: as letras da fonte e o neon como textura

**Files:**
- Modify: `src/fonte.ts` (no fim do arquivo)
- Create: `src/menu/letreiro.ts`
- Test: `scripts/test-menu-letreiro-jogo.mjs`

**Interfaces:**
- Consumes: `pintarLetreiro`, `faixasDasLetras`, `Glifos`, `EstadoLetreiro` (Task 4); `TITULO` (Task 1).
- Produces:
  - `glifosDaFonte(texto: string): Glifos | null` (em `src/fonte.ts`)
  - `interface Letreiro { s: number; w: number; h: number; chaves: Record<EstadoLetreiro, string>; letras: { ch: string; ini: number; fim: number }[] }`
  - `gerarLetreiro(scene: Phaser.Scene, s: number): Letreiro | null` — texturas `letreiro-<estado>-<s>`, com os
    quadros `L0`…`L9` (uma letra cada)

- [ ] **Step 1: o teste que falha**

`scripts/test-menu-letreiro-jogo.mjs`:

```js
// O LETREIRO NO JOGO: as letras que o jogo assa (src/fonte.ts) são exatamente as do gabarito, e o neon vira textura com
// um quadro por letra. Uso: node scripts/test-menu-letreiro-jogo.mjs (com `npm run dev` rodando)
import fs from 'node:fs';
import { chromium } from 'playwright';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const gabarito = JSON.parse(fs.readFileSync('scripts/fixtures/menu/glifos-alien-world.json', 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 30000 });
const r = await page.evaluate(async () => {
  const { glifosDaFonte } = await import('/src/fonte.ts');
  const { gerarLetreiro } = await import('/src/menu/letreiro.ts');
  const cena = window.__game.scene.getScene('Menu');
  const L4 = gerarLetreiro(cena, 4);
  const L5 = gerarLetreiro(cena, 5);
  const quadros = (L) => cena.textures.get(L.chaves.olhos).getFrameNames().filter((n) => n.startsWith('L')).length;
  return {
    g: glifosDaFonte('ALIEN WORLD'),
    L4: { w: L4.w, h: L4.h, n: L4.letras.length, quadros: quadros(L4), chaves: L4.chaves },
    L5: { w: L5.w, h: L5.h },
  };
});
await browser.close();

conferir(JSON.stringify(r.g) === JSON.stringify(gabarito), 'as letras assadas pelo jogo são as do gabarito', r.g);
conferir(r.L4.w === 244 && r.L4.h === 32, `s = 4: 244×32 (${r.L4.w}×${r.L4.h})`, r.L4);
conferir(r.L4.n === 10 && r.L4.quadros === 10, 'dez letras, um quadro cada', r.L4);
conferir(r.L4.chaves.aceso === 'letreiro-aceso-4', 'as chaves levam a escala', r.L4.chaves);
conferir(r.L5.w === 58 * 5 + 12, `s = 5: o grão maior (${r.L5.w})`, r.L5);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: rodar e ver falhar**

Run: `node scripts/test-menu-letreiro-jogo.mjs`
Expected: o `page.evaluate` falha (`glifosDaFonte` não existe / `letreiro.ts` não existe).

- [ ] **Step 3: `glifosDaFonte` no fim de `src/fonte.ts`**

```ts
/** As letras de um texto como o jogo as assa — ver `glifosDaFonte`. */
export interface Glifos {
  w: number;
  h: number;
  /** Uma string por linha: `#` aceso, `.` apagado. */
  linhas: string[];
  /** A faixa de colunas de tinta de cada letra (sem os espaços). */
  letras: { ch: string; x0: number; x1: number }[];
}

/**
 * As letras de `texto` como o jogo as assa (a Silkscreen no tamanho nativo, binarizada): a grade dos pixels acesos,
 * sem as linhas e as colunas vazias, e a faixa de colunas de cada letra. É daqui que nasce o letreiro de neon do menu
 * (`src/menu/letreiro.ts`) — o mesmo método de `scripts/_menu/_glifos.mjs`, que fez o gabarito. `null` sem a fonte.
 */
export function glifosDaFonte(texto: string): Glifos | null {
  if (!assadas) return null;
  const a = assadas.limpa;
  const ctx = a.canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const TW = a.canvas.width;
  const px = ctx.getImageData(0, 0, TW, a.canvas.height).data;
  // A linha inteira: cada letra no avanço acumulado, como o `fillText` do `_glifos.mjs`.
  const pos: { ch: string; x0: number; adv: number }[] = [];
  let x = 0;
  for (const ch of texto) {
    const c = a.chars[ch.charCodeAt(0)];
    if (!c) return null;
    pos.push({ ch, x0: x, adv: c.adv });
    x += c.adv;
  }
  const W = x + 2;
  const H = a.linha;
  const tinta = new Uint8Array(W * H);
  for (const p of pos) {
    const c = a.chars[p.ch.charCodeAt(0)];
    for (let gy = 0; gy < c.h && gy < H; gy++) {
      for (let gx = 0; gx < c.w && p.x0 + gx < W; gx++) {
        if (px[((c.y + gy) * TW + c.x + gx) * 4 + 3] >= 128) tinta[gy * W + p.x0 + gx] = 1;
      }
    }
  }
  const colunaTem = (cx: number): boolean => {
    for (let y = 0; y < H; y++) if (tinta[y * W + cx]) return true;
    return false;
  };
  const linhaTem = (y: number): boolean => {
    for (let cx = 0; cx < W; cx++) if (tinta[y * W + cx]) return true;
    return false;
  };
  const ys = [...Array(H).keys()].filter(linhaTem);
  const xs = [...Array(W).keys()].filter(colunaTem);
  if (!ys.length || !xs.length) return null;
  const [y0, y1, x0, x1] = [ys[0], ys[ys.length - 1], xs[0], xs[xs.length - 1]];
  const linhas: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let s = '';
    for (let cx = x0; cx <= x1; cx++) s += tinta[y * W + cx] ? '#' : '.';
    linhas.push(s);
  }
  const letras = pos
    .filter((p) => p.ch !== ' ')
    .map((p) => {
      const cols = [...Array(p.adv).keys()].map((i) => p.x0 + i).filter(colunaTem);
      return { ch: p.ch, x0: cols[0] - x0, x1: cols[cols.length - 1] - x0 };
    });
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, linhas, letras };
}
```

- [ ] **Step 4: `src/menu/letreiro.ts`**

```ts
import Phaser from 'phaser';
import { glifosDaFonte } from '../fonte';
import { TITULO } from './numerosMenu';
import { faixasDasLetras, pintarLetreiro, type EstadoLetreiro } from './letreiroPixels';

/** O neon pronto para a tela: as três texturas (um quadro `L<i>` por letra) e as faixas das letras. */
export interface Letreiro {
  /** A escala da tela para a qual foi gerado (P = s pixels do letreiro por pixel da fonte). */
  s: number;
  w: number;
  h: number;
  chaves: Record<EstadoLetreiro, string>;
  letras: { ch: string; ini: number; fim: number }[];
}

const ESTADOS: EstadoLetreiro[] = ['apagado', 'aceso', 'olhos'];

/**
 * O neon do título como texturas da cena, para a escala `s` da tela (spec §6.5). Gerado na hora a partir das letras que
 * o jogo assa: cai pixel a pixel na tela em qualquer janela (cada pixel do letreiro = 2 px de tela). `null` sem a fonte.
 */
export function gerarLetreiro(scene: Phaser.Scene, s: number): Letreiro | null {
  const g = glifosDaFonte(TITULO);
  if (!g) return null;
  const letras = faixasDasLetras(g, s);
  const chaves = {} as Record<EstadoLetreiro, string>;
  let w = 0;
  let h = 0;
  for (const estado of ESTADOS) {
    const chave = `letreiro-${estado}-${s}`;
    chaves[estado] = chave;
    if (!scene.textures.exists(chave)) {
      const img = pintarLetreiro(g, s, estado);
      const tex = scene.textures.createCanvas(chave, img.w, img.h);
      if (!tex) return null;
      tex.context.putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.w, img.h), 0, 0);
      tex.refresh();
      letras.forEach((l, i) => tex.add(`L${i}`, 0, l.ini, 0, l.fim - l.ini, img.h));
    }
    const fonte = scene.textures.get(chave).getSourceImage();
    w = fonte.width;
    h = fonte.height;
  }
  return { s, w, h, chaves, letras };
}
```

- [ ] **Step 5: rodar e ver passar**

Run: `npm run typecheck` e `node scripts/test-menu-letreiro-jogo.mjs`
Expected: sem erro de tipo; `TUDO OK`. Se as letras diferirem do gabarito, a diferença está na composição da linha:
o `_glifos.mjs` desenha todas as letras num canvas só (`fillText` no avanço acumulado); confira o `adv` e a coluna
extra (+2) de cada glifo.

- [ ] **Step 6: checkpoint** — `node scripts/test-menu-letreiro.mjs` continua `TUDO OK`.

---

### Task 6: a Atmosfera com escala, e o perfil `menu`

**Files:**
- Modify: `src/systems/atmosfera/AtmosferaPipeline.ts`
- Modify: `src/systems/atmosfera/Atmosfera.ts`
- Modify: `src/systems/atmosfera/perfis.ts`
- Test: `scripts/test-atmosfera-perfis.mjs`

**Interfaces:**
- Produces: `OpcoesAtmosfera.escala?: number` (padrão 1); `Atmosfera#setEscala(s)`; `Atmosfera#liberar()`;
  `AtmosferaPipeline#escala`; `PERFIS.menu`.

- [ ] **Step 1: o teste que falha** — em `scripts/test-atmosfera-perfis.mjs`, troque a lista de nomes e a mensagem:

```js
// os seis da cutscene final + os três das outras cutscenes (Task 5) + o do menu (bloco E, 19/10)
const nomes = ['viscera', 'visceraSuccao', 'vacuo', 'vacuoQueda', 'superficie', 'apagando', 'aurora', 'doca', 'hangar', 'menu'];
ok(nomes.every((n) => PERFIS[n]?.nome === n), `os dez perfis existem com o próprio nome (${Object.keys(PERFIS).join(',')})`);
```

Run: `node scripts/test-atmosfera-perfis.mjs`
Expected: `✘ os dez perfis existem…` (falta o `menu`).

- [ ] **Step 2: o perfil** — em `src/systems/atmosfera/perfis.ts`, depois do `hangar` e antes do `} as const satisfies`:

```ts
  /**
   * O MENU (bloco E, 19/10): a colônia de Kepler à noite — as cores tiradas da pintura dele (névoa = os tons médio-
   * escuros ×1,5 + o toque frio; halo = a média do âmbar aceso), uma névoa baixa no vale, lenta.
   */
  menu: {
    nome: 'menu',
    nevoa: { densidade: 0.75, cor: [42, 52, 67], altura: 2.2, velTras: [-3, 0], velFrente: [-8, 0], evolucao: 0.02 },
    halo: { forca: 0.3, limiar: 0.59, cor: [182, 120, 70] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.55,
    grao: 0.6,
    poeira: { quantidade: 50, cor: [67, 83, 107], deriva: [-4, -1], espalhar: 2 },
  },
```

Run: `node scripts/test-atmosfera-perfis.mjs` → `✔ PERFIS DA ATMOSFERA`.

- [ ] **Step 3: o `uEscala` no shader** — em `src/systems/atmosfera/AtmosferaPipeline.ts`:

Logo depois de `uniform vec2 uResolucao;`:

```glsl
// A escala da tela (bloco E): numa camada em s× a névoa e o halo medem em pixels do JOGO (tela / s), e não encolhem.
uniform float uEscala;
```

As duas linhas da névoa passam a ser:

```glsl
  float f1 = fbm((tela / uEscala - uVelTras * uTempo) / vec2(70.0, 26.0) + vec2(3.0, uTempo * uEvolucao), 3.0);
  float f2 = fbm((tela / uEscala - uVelFrente * uTempo) / vec2(45.0, 18.0) + vec2(9.0, 0.0), 5.0);
```

e a amostra do halo:

```glsl
      vec3 s = texture2D(uMainSampler, (px + 0.5 + vec2(float(i), float(j)) * 2.0 * uEscala) / uResolucao).rgb;
```

Na classe, depois de `flash = 0;`:

```ts
  /** Pixels de tela por pixel do jogo (1 no mundo; `s` na camada HD, onde mora o menu). */
  escala = 1;
```

e em `onPreRender`, logo depois de `this.set1f('uFlash', this.flash);`:

```ts
    this.set1f('uEscala', this.escala);
```

- [ ] **Step 4: a escala na `Atmosfera`** — em `src/systems/atmosfera/Atmosfera.ts`:

Em `OpcoesAtmosfera`, depois de `profundidadePoeira`:

```ts
  /**
   * Pixels de tela por pixel do jogo (padrão 1). O menu mora na camada HD, com a câmera em zoom `s`: o shader mede a
   * névoa e o halo em `tela / s`, e a poeira nasce na área do jogo, em grãos de `s/2` px de tela.
   */
  escala?: number;
```

Um campo, depois de `private suspenso = false;`:

```ts
  private escala = 1;
```

No construtor, logo depois de `this.pipeline = cam.getPostPipeline(CHAVE_ATMOSFERA) as AtmosferaPipeline;`:

```ts
    this.escala = opcoes.escala ?? 1;
    this.pipeline.escala = this.escala;
```

Dois métodos públicos novos, depois de `fadeOut`:

```ts
  /** A tela mudou de escala (a camada HD se refez): o shader e a poeira acompanham. */
  setEscala(s: number): void {
    if (!this.ativo) return;
    this.escala = s;
    if (this.pipeline) this.pipeline.escala = s;
    if (this.atual) this.montarPoeira(this.atual);
  }

  /**
   * Solta o pipeline e a câmera limpa AGORA. Uma cena removida da camada HD (`scene.remove`) só emite `DESTROY`, nunca
   * `SHUTDOWN` — sem isto, cada volta ao menu vazava o pipeline e os RenderTargets dele.
   */
  liberar(): void {
    this.destruir();
  }
```

Em `montarPoeira`, troque `const { width: W, height: H } = this.scene.scale;` por:

```ts
    // A área da poeira é a do JOGO: numa câmera em zoom `escala`, o canvas tem `escala`× os pixels do mundo.
    const W = this.scene.scale.width / this.escala;
    const H = this.scene.scale.height / this.escala;
```

e, na config de `particles`, depois de `frequency: VIDA_POEIRA / quantidade,`:

```ts
        scale: this.escala > 1 ? 0.5 : 1,
```

Por fim, `destruir` passa a poder rodar duas vezes sem efeito (o `liberar` e o `SHUTDOWN`): no começo dele,

```ts
    if (!this.pipeline && !this.limpa && !this.poeira) return;
```

- [ ] **Step 5: conferir que as fases não mudaram**

Run: `npm run typecheck`, `node scripts/test-atmosfera-perfis.mjs` e `node scripts/probe-atmosfera-fases.mjs`.
Expected: sem erro de tipo; `✔ PERFIS DA ATMOSFERA`; a sonda das fases passa como antes (lá `uEscala = 1`, a mesma
conta de sempre).

- [ ] **Step 6: checkpoint** — nada além desses três arquivos e do teste mudou.

---

### Task 7: a arte do menu, assada e instalada

**Files:**
- Create: `scripts/_menu/_tempestade.mjs`
- Create: `public/sprites/menu/k4/*`, `public/sprites/menu/k1/*` (gerados)
- Modify: `src/scenes/BootHDScene.ts`
- Create: `src/menu/cenario.ts` — só a função `carregarCamadasMenu` e os tipos nesta task (a Task 8 completa)

**Interfaces:**
- Consumes: `TEMPESTADE` (Task 1), `lcg` (Task 1); `scripts/_menu/_camadas.mjs`, `_leviata-menor.mjs`.
- Produces: em `public/sprites/menu/<k4|k1>/`: `ceu.png`, `cidade.png`, `apagadas.png`, `nave.png`,
  `cachoeira.png`, `leviata.png`, `dados.json`, `tempestade/{flash0,flash1,flash2,raio0,raio1,raio2,nuvem}.png` e
  `tempestade/tempestade.json`; `carregarCamadasMenu(load, prefixo, pasta)`; os tipos `Caixa`, `GrupoLuz`,
  `DadosCamadas`, `DadosTempestade`, `EstadoMenu`, `Peca`, `ContextoCenario`.

- [ ] **Step 1: `scripts/_menu/_tempestade.mjs`**

```js
// BLOCO E · the storm's masks for the menu (spec §4.3), baked once per density so the game doesn't build them (in the
// mock they were built in the page: seconds, and ~37 MB of textures). Reads the city layer from `_camadas.mjs`.
//   node scripts/_menu/_tempestade.mjs <layersDir>      (layersDir holds cidade.png and dados.json)
// Writes <layersDir>/tempestade/: flash0..2.png and nuvem.png at HALF resolution, raio0..2.png at full, each cropped to
// its box, and tempestade.json ({ reducao, flashes, raios, nuvem }: boxes in the layer's full-resolution pixels).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TEMPESTADE as T } from '../../src/menu/numerosMenu.ts';
import { lcg } from '../../src/menu/acaso.ts';

const [DIR] = process.argv.slice(2);
const OUT = path.join(DIR, 'tempestade');
fs.mkdirSync(OUT, { recursive: true });
const dados = JSON.parse(fs.readFileSync(path.join(DIR, 'dados.json'), 'utf8'));
const K = dados.k, W = dados.w, H = dados.h, REDUCAO = 2;
const cidade = await sharp(path.join(DIR, 'cidade.png')).ensureAlpha().raw().toBuffer();
const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// The region: his polygon, white on black, blurred (the soft edge).
const pontos = T.regiao.map(([x, y]) => `${x * K},${y * K}`).join(' ');
const svgRegiao = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><polygon points="${pontos}" fill="#fff"/></svg>`;
const regiao = await sharp(Buffer.from(svgRegiao)).blur(T.borda * K).extractChannel(0).raw().toBuffer();

// Per pixel: how much a flash lights it (the cloud's own brightness; never the warm lit buildings) and where a bolt or
// the rolling cloud may show (not over the near-black silhouettes: they stand in front of the storm).
const nuvem = new Float32Array(W * H), ceu = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const j = i * 4;
  if (cidade[j + 3] < 255) continue;
  const r = cidade[j], g = cidade[j + 1], b = cidade[j + 2], l = 0.3 * r + 0.59 * g + 0.11 * b;
  if (r > b + 20) continue;
  const m = regiao[i] / 255;
  nuvem[i] = sst(14, 70, l) * m;
  ceu[i] = sst(4, 11, l) * m;
}

const caixaDe = (alfa) => {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alfa(x, y) > 0.002) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const m = 2;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
const gravar = async (nome, alfa, caixa, reduzir) => {
  const buf = Buffer.alloc(caixa.w * caixa.h * 4);
  for (let y = 0; y < caixa.h; y++) for (let x = 0; x < caixa.w; x++) {
    const o = (y * caixa.w + x) * 4;
    buf[o] = buf[o + 1] = buf[o + 2] = 255;
    buf[o + 3] = Math.round(255 * Math.min(1, alfa(caixa.x + x, caixa.y + y)));
  }
  let img = sharp(buf, { raw: { width: caixa.w, height: caixa.h, channels: 4 } });
  if (reduzir) img = img.resize(Math.ceil(caixa.w / REDUCAO), Math.ceil(caixa.h / REDUCAO), { kernel: 'lanczos3' });
  await img.png().toFile(path.join(OUT, `${nome}.png`));
};

const regiaoCaixa = caixaDe((x, y) => regiao[y * W + x] / 255);

// The flashes: the cloud's own light × a soft falloff from where the discharge is.
const flashes = [];
for (const [n, [fx, fy, raio]] of T.focos.entries()) {
  const alfa = (x, y) => {
    const d = Math.hypot(x / K - fx, y / K - fy) / raio;
    return nuvem[y * W + x] * Math.max(0, 1 - d * d);
  };
  await gravar(`flash${n}`, alfa, regiaoCaixa, true);
  flashes.push(regiaoCaixa);
}

// The bolts: a jagged line (midpoint displacement) with one branch — the same draws as the mock (window.__rnd(91)) —
// soft wide strokes under sharp ones, cut by the sky mask.
const rr = lcg(T.semente);
const linha = (p, q, nivel) => {
  let pts = [p, q];
  for (let it = 0; it < nivel; it++) {
    const nv = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), o = (rr() - 0.5) * L * 0.42;
      nv.push([(x0 + x1) / 2 - ((y1 - y0) / L) * o, (y0 + y1) / 2 + ((x1 - x0) / L) * o], pts[i]);
    }
    pts = nv;
  }
  return pts;
};
const raios = [];
for (const [n, [a, b]] of T.raios.entries()) {
  const tronco = linha(a, b, 6);
  const meio = tronco[Math.floor(tronco.length * (0.35 + rr() * 0.25))];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rr() < 0.5 ? -1 : 1) * (0.5 + rr() * 0.4);
  const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.4;
  const galho = linha(meio, [meio[0] + Math.cos(ang) * L2, meio[1] + Math.sin(ang) * L2], 5);
  const traco = (pts, larg, op) =>
    `<polyline points="${pts.map(([x, y]) => `${x * K},${y * K}`).join(' ')}" fill="none" stroke="#fff" stroke-opacity="${op}" stroke-width="${larg * K}" stroke-linejoin="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${traco(tronco, 1.6, 0.22)}${traco(galho, 1.1, 0.16)}${traco(tronco, 0.5, 1)}${traco(galho, 0.35, 0.85)}</svg>`;
  const px = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const alfa = (x, y) => (px[(y * W + x) * 4 + 3] / 255) * ceu[y * W + x];
  const caixa = caixaDe(alfa);
  await gravar(`raio${n}`, alfa, caixa, false);
  raios.push(caixa);
}

// The rolling cloud's mask: the sky of the region, fading out above the rooftops (y 58–80).
const nuvemAlfa = (x, y) => ceu[y * W + x] * (1 - sst(T.rolar.someDe, T.rolar.someAte, y / K));
const nuvemCaixa = caixaDe(nuvemAlfa);
await gravar('nuvem', nuvemAlfa, nuvemCaixa, true);

fs.writeFileSync(path.join(OUT, 'tempestade.json'), JSON.stringify({ reducao: REDUCAO, flashes, raios, nuvem: nuvemCaixa }, null, 1));
console.log(OUT, `k=${K}`, 'região', regiaoCaixa, 'raios', raios.map((c) => `${c.w}×${c.h}`).join(' '));
```

- [ ] **Step 2: assar as camadas nas duas densidades**

(O `$TEMP` do Git Bash vem com barras invertidas e o `sharp` tropeça nele: use o scratch, com barras normais.)

```bash
S="/c/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/07003ab8-51e6-403a-82f7-7a6881699d8a/scratchpad/menuE"
node scripts/_menu/_camadas.mjs public/sprites/menu/k4 4
node scripts/_menu/_camadas.mjs public/sprites/menu/k1 1
node scripts/_menu/_tempestade.mjs public/sprites/menu/k4
node scripts/_menu/_tempestade.mjs public/sprites/menu/k1
node scripts/_menu/_leviata-menor.mjs "$S/leviata-menu" aro 0.545 0.136
cp "$S/leviata-menu/leviata-0.545-aro.png" public/sprites/menu/k4/leviata.png
cp "$S/leviata-menu/leviata-0.136-aro.png" public/sprites/menu/k1/leviata.png
ls public/sprites/menu/k4 public/sprites/menu/k4/tempestade public/sprites/menu/k1 public/sprites/menu/k1/tempestade
```

Expected: em cada pasta, `ceu.png cidade.png apagadas.png nave.png cachoeira.png leviata.png dados.json` e
`tempestade/` com 7 PNGs e o JSON. Confira os tamanhos: `cidade.png` 1536×864 (k4) e 384×216 (k1);
`leviata.png` 1536×44 (k4: 16 quadros de 96) e 16 quadros de ~24 px (k1). O `_camadas.mjs` deve listar **24
faróis** (`faróis 24` na última linha) em k4.

- [ ] **Step 3: auditar as luzes que piscam (k4)**

Run: `node scripts/_menu/_auditar-luzes.mjs public/sprites/menu/k4 "$S/auditoria-k4.png"`
Expected: `janelas 24 faróis 24 tiles 96`. Abra a imagem e confira, par a par (aceso · apagado), que cada luz some na
própria fachada ou no céu, sem borrão nem buraco. Abra também `tempestade/raio0.png` ampliado: um raio bifurcado,
cortado onde passa por trás da torre.

- [ ] **Step 4: os tipos e o carregamento — `src/menu/cenario.ts` (primeira parte)**

```ts
import Phaser from 'phaser';

/**
 * O CENÁRIO DO MENU (spec `2026-10-19-menu-refeito-design.md` §2–5): a pintura dele em camadas, viva e com perigo no
 * ar. As camadas são assadas fora do jogo (`scripts/_menu/_camadas.mjs`, `_tempestade.mjs`) em duas densidades: `k4`
 * (a camada HD, onde o menu mora) e `k1` (sem a camada). Tudo aqui se escreve em PIXELS DE JOGO; uma textura de
 * camada tem `k` pixels por pixel de jogo e entra com `setScale(1 / k)`.
 */

/** Uma caixa em pixels. */
export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Um grupo de luz da pintura (`dados.json`): caixa e área em px de jogo. */
export interface GrupoLuz extends Caixa {
  tipo: 'janela' | 'farol';
  n: number;
}

/** O `dados.json` de `_camadas.mjs`: `w`/`h` e os quadros da água na densidade da camada; o resto em px de jogo. */
export interface DadosCamadas {
  k: number;
  w: number;
  h: number;
  nave: Caixa;
  agua: Caixa & { quadros: number; fw: number; fh: number };
  grupos: GrupoLuz[];
}

/** O `tempestade.json` de `_tempestade.mjs`: as caixas em px da camada (resolução cheia); `reducao` = 2. */
export interface DadosTempestade {
  reducao: number;
  flashes: Caixa[];
  raios: Caixa[];
  nuvem: Caixa;
}

/** O estado da abertura que o cenário lê (o `MenuScene` escreve). */
export interface EstadoMenu {
  /** O relógio da abertura (s). */
  tAbertura: number;
  /** A abertura foi pulada (uma tecla, a volta do Arquivo, o movimento reduzido). */
  pulou: boolean;
  /** `prefers-reduced-motion`: sem relâmpagos. */
  reduzido: boolean;
  /** O cenário montou: a abertura pode correr. */
  pronto: boolean;
  /** A sonda parou o relógio (`MenuScene.irPara`). */
  congelado: boolean;
}

/** Uma peça viva do cenário. */
export interface Peca {
  atualizar(t: number): void;
}

/** O que as peças recebem. */
export interface ContextoCenario {
  scene: Phaser.Scene;
  /** Pixels da camada por pixel de jogo (4 na camada HD; 1 sem ela). */
  k: number;
  chave: (nome: string) => string;
  dados: DadosCamadas;
  tempestade: DadosTempestade;
  /** Os pixels do céu e da cidade (as estrelas nascem onde a cidade é transparente e o céu é escuro). */
  pixelsCeu: Uint8ClampedArray;
  pixelsCidade: Uint8ClampedArray;
}

export const IMAGENS_CAMADAS = ['ceu', 'cidade', 'apagadas', 'nave', 'cachoeira', 'leviata'] as const;
export const IMAGENS_TEMPESTADE = ['flash0', 'flash1', 'flash2', 'raio0', 'raio1', 'raio2', 'nuvem'] as const;

/** Põe na fila do `load` as camadas do menu de uma densidade (`sprites/menu/k4` ou `k1`); o que já está, pula. */
export function carregarCamadasMenu(load: Phaser.Loader.LoaderPlugin, prefixo: string, pasta: string): void {
  const tex = load.scene.textures;
  const json = load.scene.cache.json;
  for (const n of IMAGENS_CAMADAS) if (!tex.exists(`${prefixo}-${n}`)) load.image(`${prefixo}-${n}`, `${pasta}/${n}.png`);
  for (const n of IMAGENS_TEMPESTADE) {
    if (!tex.exists(`${prefixo}-${n}`)) load.image(`${prefixo}-${n}`, `${pasta}/tempestade/${n}.png`);
  }
  if (!json.exists(`${prefixo}-dados`)) load.json(`${prefixo}-dados`, `${pasta}/dados.json`);
  if (!json.exists(`${prefixo}-tempestade`)) load.json(`${prefixo}-tempestade`, `${pasta}/tempestade/tempestade.json`);
}
```

- [ ] **Step 5: a camada HD carrega as camadas `k4`** — em `src/scenes/BootHDScene.ts`, o import e o fim do
`preload`:

```ts
import { carregarCamadasMenu } from '../menu/cenario';
```

```ts
    // O MENU (bloco E): a pintura dele em camadas, na densidade da camada (o cenário mora aqui, atrás do texto).
    carregarCamadasMenu(this.load, 'menuK4', 'sprites/menu/k4');
```

Atualize o comentário da classe: *"carrega aqui as que as cenas dela usam (a mesa: molduras, ícones e o realce; o
menu: as camadas da pintura)"*.

- [ ] **Step 6: conferir que a camada carregou**

Run (com `npm run dev`):

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1536, height: 864 } });
  await p.goto('http://localhost:5173/');
  await p.waitForFunction(() => window.__gameHD?.textures.exists('menuK4-raio2'), null, { timeout: 60000 });
  console.log(await p.evaluate(() => ({ dados: window.__gameHD.cache.json.get('menuK4-dados').grupos.length, temp: window.__gameHD.cache.json.get('menuK4-tempestade').raios.length })));
  await b.close();
})();"
```

Expected: `{ dados: <~990>, temp: 3 }`.

- [ ] **Step 7: checkpoint** — `npm run typecheck` sem erro; o menu de hoje abre igual (ele ainda não usa nada disso).

---

### Task 8: o cenário na camada HD — o céu, a cidade e o Leviatã

**Files:**
- Create: `src/menu/texturas.ts`, `src/menu/leviata.ts`, `src/menu/MenuCenaHD.ts`
- Modify: `src/menu/cenario.ts` (o `Cenario`, no fim do arquivo)
- Modify: `src/uiHD.ts` (dois ajudantes no fim)
- Create: `scripts/_menu/_ver-cenario.mjs`

**Interfaces:**
- Consumes: os tipos e `carregarCamadasMenu` (Task 7); `travessia` (Task 3); `alfaVeu` (Task 2); `ALTURA`, `LARGURA`,
  `TRAVESSIA` (Task 1); `Atmosfera` com `escala`/`liberar`, `PERFIS.menu` (Task 6).
- Produces:
  - `texturas.ts`: `LARG_CONE = 46`, `brilho(diametro): number` (a escala da textura `menu-brilho` para esse
    diâmetro em px de jogo), `garantirTexturas(scene, k)` (cria `menu-px`, `menu-brilho`, `menu-fog-<k>`,
    `menu-raio-<k>`, `menu-cone`), `lerPixels(scene, chave): Uint8ClampedArray`
  - `cenario.ts`: `class Cenario { static criar(scene, k, prefixo, estado, profundidadeVeu): Cenario | null;
    atualizar(t): void; relampagos: () => number }`
  - `leviata.ts`: `montarLeviata(ctx): Peca`
  - `MenuCenaHD.ts`: `CHAVE_MENU_HD = 'MenuHD'`, `class MenuCenaHD` (dados `{ estado: EstadoMenu }`; públicos
    `cenario`, `atm`, `t`)
  - `uiHD.ts`: `cenaDeFundoHD(chave, classe, dados): Phaser.Scene | null`, `removerCenaHD(chave): void`

- [ ] **Step 1: `src/menu/texturas.ts`**

```ts
import Phaser from 'phaser';
import { lcg } from './acaso';

/**
 * As TEXTURAS DESENHADAS do cenário do menu (spec §3.5, §4): o brilho macio das luzes, a bruma e o facho das fases
 * redesenhados na densidade `k` (ampliados, os de 384×216 viravam blocos) e o cone dos holofotes. Cada jogo Phaser
 * tem as suas: o mundo (k = 1) e a camada HD (k = 4).
 */

/** A largura visível do cone no fim (px da textura): para dar a um feixe a largura em px de jogo. */
export const LARG_CONE = 46;

/** A escala da textura `menu-brilho` (64 px) para um brilho de `diametro` px de jogo. */
export const brilho = (diametro: number): number => diametro / 64;

function canvas(
  scene: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  desenhar: (c: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  if (scene.textures.exists(chave)) return;
  const t = scene.textures.createCanvas(chave, w, h);
  if (!t) return;
  desenhar(t.context, w, h);
  t.refresh();
}

export function garantirTexturas(scene: Phaser.Scene, k: number): void {
  canvas(scene, 'menu-px', 1, 1, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 1, 1);
  });
  // Uma luz vista de longe: macia, não um ponto (19/10, ele: *"luzes mais distorcidas ou embaçadas"*).
  canvas(scene, 'menu-brilho', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  // A BRUMA das fases (`BootScene.makeFogBand`), com a mesma receita e a mesma semente, nesta densidade.
  canvas(scene, `menu-fog-${k}`, 256 * k, 64 * k, (c, W, H) => {
    const rnd = lcg(0x5eed);
    const borrao = (x: number, y: number, rr: number, a: number): void => {
      const g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    for (const p of [{ n: 34, rMin: 16, rMax: 38, alpha: 0.26 }, { n: 55, rMin: 5, rMax: 14, alpha: 0.18 }]) {
      for (let i = 0; i < p.n; i++) {
        const x = rnd() * W;
        const y = H / 2 + (rnd() - 0.5) * H * 0.9;
        const rr = (p.rMin + rnd() * (p.rMax - p.rMin)) * k;
        borrao(x, y, rr, p.alpha);
        if (x - rr < 0) borrao(x + W, y, rr, p.alpha);
        if (x + rr > W) borrao(x - W, y, rr, p.alpha);
      }
    }
    const corte = c.createLinearGradient(0, 0, 0, H);
    corte.addColorStop(0, 'rgba(0,0,0,1)');
    corte.addColorStop(0.22, 'rgba(0,0,0,0)');
    corte.addColorStop(0.78, 'rgba(0,0,0,0)');
    corte.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = corte;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  });
  // O FACHO das fases (`BootScene.makeGodRay`): 192×24 px de jogo, macio nos dois sentidos, pico 0,55.
  canvas(scene, `menu-raio-${k}`, 192 * k, 24 * k, (c, W, H) => {
    for (let y = 0; y < H; y++) {
      const tt = 1 - Math.abs(y - (H - 1) / 2) / ((H - 1) / 2);
      const tr = tt * tt;
      if (tr <= 0) continue;
      for (let x = 0; x < W; x += 6) {
        c.fillStyle = `rgba(255,255,255,${0.55 * tr * Math.sin((Math.PI * (x + 3)) / W)})`;
        c.fillRect(x, y, 6, 1);
      }
    }
  });
  // O FEIXE de um holofote: um cone macio a partir da lâmpada (o meio da borda esquerda), abrindo e sumindo.
  canvas(scene, 'menu-cone', 256, 64, (c, W, H) => {
    const img = c.createImageData(W, H);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const ao = Math.pow(1 - u, 1.2) * Math.min(1, x / 6);
      const meia = 3 + u * 26;
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * ao * Math.exp(-Math.pow((y - H / 2 + 0.5) / meia, 2) * 1.6));
      }
    }
    c.putImageData(img, 0, 0);
  });
}

/** Os pixels RGBA de uma textura carregada. */
export function lerPixels(scene: Phaser.Scene, chave: string): Uint8ClampedArray {
  const img = scene.textures.get(chave).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}
```

- [ ] **Step 2: `src/menu/leviata.ts`**

```ts
import { travessia } from './ritmos';
import type { ContextoCenario, Peca } from './cenario';

/** §3.1 O Leviatã ao longe: nada pela janela de céu, atrás da cidade e na frente do planeta, em loop. */
export function montarLeviata(ctx: ContextoCenario): Peca {
  const o = ctx.scene.add.sprite(0, 0, ctx.chave('leviata'), 0).setScale(1 / ctx.k).setDepth(1);
  return {
    atualizar(t: number): void {
      const p = travessia(t);
      o.setPosition(p.x, p.y).setFrame(p.quadro);
    },
  };
}
```

- [ ] **Step 3: o `Cenario` — no fim de `src/menu/cenario.ts`**

Acrescente aos imports do topo:

```ts
import { ALTURA, LARGURA, TRAVESSIA } from './numerosMenu';
import { alfaVeu } from './abertura';
import { garantirTexturas, lerPixels } from './texturas';
import { montarLeviata } from './leviata';
```

e no fim do arquivo:

```ts
/** O contexto das peças, ou `null` se as camadas não estão carregadas. */
function contexto(scene: Phaser.Scene, k: number, prefixo: string): ContextoCenario | null {
  const chave = (nome: string): string => `${prefixo}-${nome}`;
  const faltam = [...IMAGENS_CAMADAS, ...IMAGENS_TEMPESTADE].filter((n) => !scene.textures.exists(chave(n)));
  const dados = scene.cache.json.get(chave('dados')) as DadosCamadas | undefined;
  const tempestade = scene.cache.json.get(chave('tempestade')) as DadosTempestade | undefined;
  if (faltam.length || !dados || !tempestade) {
    console.warn('[menu] as camadas do cenário não chegaram — o menu abre sem ele', faltam);
    return null;
  }
  garantirTexturas(scene, k);
  const quadros = (nome: string, n: number, fw: number, fh: number): void => {
    const tex = scene.textures.get(chave(nome));
    if (tex.has('0')) return;
    for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  };
  quadros('cachoeira', dados.agua.quadros, dados.agua.fw, dados.agua.fh);
  const levi = scene.textures.get(chave('leviata')).getSourceImage();
  quadros('leviata', TRAVESSIA.quadros, levi.width / TRAVESSIA.quadros, levi.height);
  // A pintura é a única coisa que a camada AMPLIA (21% em Full HD): suave, não em blocos (a camada é `pixelArt`).
  if (k > 1) {
    for (const n of [...IMAGENS_CAMADAS, ...IMAGENS_TEMPESTADE]) {
      scene.textures.get(chave(n)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  return {
    scene, k, chave, dados, tempestade,
    pixelsCeu: lerPixels(scene, chave('ceu')),
    pixelsCidade: lerPixels(scene, chave('cidade')),
  };
}

/**
 * O CENÁRIO montado numa cena (a `MenuCenaHD`, ou o próprio `MenuScene` sem a camada): o céu, a cidade, as peças
 * vivas e o véu da abertura. `atualizar(t)` com o relógio do cenário.
 */
export class Cenario {
  private readonly pecas: Peca[];
  private readonly veu: Phaser.GameObjects.Rectangle;
  private readonly estado: EstadoMenu;
  /** Para a sonda: quantos relâmpagos já caíram. */
  relampagos: () => number = () => 0;

  private constructor(ctx: ContextoCenario, estado: EstadoMenu, profundidadeVeu: number) {
    const { scene, k, chave } = ctx;
    this.estado = estado;
    scene.add.image(0, 0, chave('ceu')).setOrigin(0).setScale(1 / k).setDepth(0);
    scene.add.image(0, 0, chave('cidade')).setOrigin(0).setScale(1 / k).setDepth(2);
    this.pecas = [montarLeviata(ctx)];
    this.veu = scene.add.rectangle(0, 0, LARGURA, ALTURA, 0x000000, 1).setOrigin(0).setDepth(profundidadeVeu);
  }

  /** Monta o cenário com as camadas `prefixo` já carregadas; `null` se elas não estão lá. */
  static criar(scene: Phaser.Scene, k: number, prefixo: string, estado: EstadoMenu, profundidadeVeu: number): Cenario | null {
    const ctx = contexto(scene, k, prefixo);
    return ctx ? new Cenario(ctx, estado, profundidadeVeu) : null;
  }

  atualizar(t: number): void {
    for (const p of this.pecas) p.atualizar(t);
    this.veu.setAlpha(this.estado.pulou ? 0 : alfaVeu(this.estado.tAbertura));
  }
}
```

- [ ] **Step 4: os ajudantes da camada — no fim de `src/uiHD.ts`**

```ts
/**
 * Uma cena de FUNDO na camada (o cenário do menu, bloco E): entra ATRÁS de todas, inclusive das irmãs (a ordem de
 * desenho é a ordem das cenas). Se já existe uma com a chave, ela sai antes. `null` se a camada não existe.
 */
export function cenaDeFundoHD(chave: string, classe: typeof Phaser.Scene, dados: object): Phaser.Scene | null {
  if (!jogo || !jogo.isBooted) return null;
  if (jogo.scene.getScene(chave)) jogo.scene.remove(chave);
  const cena = jogo.scene.add(chave, classe, true, dados) as Phaser.Scene | null;
  if (!cena) return null;
  jogo.scene.sendToBack(chave);
  return cena;
}

/** Tira uma cena da camada (só `DESTROY`: quem guarda pipeline solta no evento — ver `Atmosfera.liberar`). */
export function removerCenaHD(chave: string): void {
  if (jogo?.scene.getScene(chave)) jogo.scene.remove(chave);
}
```

- [ ] **Step 5: `src/menu/MenuCenaHD.ts`**

```ts
import Phaser from 'phaser';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import { EVENTO_ESCALA, escalaHD, prepararCameraHD } from '../uiHD';
import { Cenario, type EstadoMenu } from './cenario';

export const CHAVE_MENU_HD = 'MenuHD';

/**
 * O CENÁRIO DO MENU NA CAMADA HD (spec §8.1): a pintura na resolução dela, viva, sob a Atmosfera `menu` — atrás da
 * irmã do texto (`cenaDeFundoHD`). A câmera fica no zoom `s` da camada, então tudo se escreve em px de jogo; a pintura
 * (k = 4) entra com escala ¼ e filtro LINEAR. As camadas vêm do `BootHDScene`; se ainda estão chegando, ela espera.
 * O `MenuScene` a abre e a tira, e escreve o `estado` (o relógio da abertura) que ela lê.
 */
export class MenuCenaHD extends Phaser.Scene {
  /** Públicos: a sonda e o filme leem (e o filme zera `t`). */
  cenario: Cenario | null = null;
  atm: Atmosfera | null = null;
  t = 0;
  private estado!: EstadoMenu;
  private readonly aoEscala = (s: number): void => this.atm?.setEscala(s);

  constructor() {
    super(CHAVE_MENU_HD);
  }

  init(data: { estado: EstadoMenu }): void {
    this.estado = data.estado;
    this.cenario = null;
    this.atm = null;
    this.t = 0;
  }

  create(): void {
    prepararCameraHD(this);
    this.cameras.main.setBackgroundColor('#000000');
    this.game.events.on(EVENTO_ESCALA, this.aoEscala);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.game.events.off(EVENTO_ESCALA, this.aoEscala);
      this.atm?.liberar();
    });
    const boot = this.scene.get('BootHD');
    if (boot && boot.load.isLoading()) boot.load.once(Phaser.Loader.Events.COMPLETE, () => this.montar());
    else this.montar();
  }

  private montar(): void {
    if (!this.sys.isActive()) return;
    this.cenario = Cenario.criar(this, 4, 'menuK4', this.estado, 50);
    if (this.cenario) {
      // Nada aqui é "limpo": o texto mora em outra cena (a irmã). O véu (50) também passa pelo tratamento.
      this.atm = new Atmosfera(this, { limiteLimpo: 1000, profundidadePoeira: 1.5, escala: escalaHD() });
      this.atm.perfil(PERFIS.menu);
    }
    this.estado.pronto = true;
  }

  override update(_time: number, delta: number): void {
    if (!this.cenario) return;
    const dt = delta / 1000;
    this.t += dt;
    this.atm?.update(dt);
    this.cenario.atualizar(this.t);
  }
}
```

- [ ] **Step 6: `scripts/_menu/_ver-cenario.mjs`**

```js
// BLOCO E · a quick look at the menu scenery as the game builds it: mounts MenuCenaHD in the HD layer under a finished
// opening, hides the menu's text, runs the scenery clock on fixed 1/30 s steps up to <segundos>, and takes the screen.
// Deterministic: the same <segundos> always gives the same frame (a lightning at 2.43 s, say).
//   node scripts/_menu/_ver-cenario.mjs <out.png> [segundos=6]      (with `npm run dev` running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, SEG = '6'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__gameHD?.textures.exists('menuK4-raio2') && window.__game?.scene.isActive('Menu'), null, { timeout: 60000 });
await page.evaluate(async () => {
  const { MenuCenaHD, CHAVE_MENU_HD } = await import('/src/menu/MenuCenaHD.ts');
  const { cenaDeFundoHD } = await import('/src/uiHD.ts');
  const hd = window.__gameHD;
  let cena = hd.scene.getScene(CHAVE_MENU_HD);
  if (!cena) {
    window.__estadoMenu = { tAbertura: 99, pulou: true, reduzido: false, pronto: false, congelado: false };
    cena = cenaDeFundoHD(CHAVE_MENU_HD, MenuCenaHD, { estado: window.__estadoMenu });
  } else {
    window.__estadoMenu = window.__game.scene.getScene('Menu').estado;
  }
  for (const c of hd.scene.getScenes(true)) if (c.sys.settings.key.startsWith('irma:')) c.sys.setVisible(false);
});
await page.waitForFunction(() => window.__estadoMenu?.pronto, null, { timeout: 30000 });
// From here, a stepped clock: both games asleep, stepped 1/30 s at a time, the scenery clock from 0 to SEG.
await page.evaluate((seg) => {
  const g = window.__game, hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
  g.loop.sleep();
  hd.loop.sleep();
  cena.t = 0;
  const dt = 1000 / 30;
  let agora = performance.now();
  while (cena.t < seg - 1e-6) {
    agora += dt;
    g.step(agora, dt);
    hd.step(agora, dt);
  }
}, Number(SEG));
const r = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const tela = await page.screenshot({ clip: r });
await sharp(tela).toFile(OUT);
await browser.close();
console.log(OUT, erros.length ? `ERROS: ${erros.join(' | ')}` : 'sem erros');
process.exit(erros.length ? 1 : 0);
```

- [ ] **Step 7: olhar**

Run: `npm run typecheck` e `node scripts/_menu/_ver-cenario.mjs "$S/t8.png" 8` (o `S` da Task 7).
Expected: `sem erros`. Abra a imagem: a pintura inteira (o céu pela janela da direita, a cidade, a nave parada),
tratada (névoa pontilhada, grão, vinheta), e o Leviatã de 96 px na janela de céu (aos 8 s ele está em x ≈ 252, logo
à direita do "WORLD", abaixo do alto da cidadela). Sem bloco de pixel: a pintura em 1536 cai 1:1.

- [ ] **Step 8: checkpoint** — `npm run typecheck` sem erro.

---

### Task 9: a vida da cidade

**Files:**
- Create: `src/menu/vida.ts`
- Modify: `src/menu/cenario.ts` (o import e a lista de peças)

**Interfaces:**
- Consumes: `ESTRELAS`, `JANELAS`, `FAROIS`, `CACHOEIRA`, `TRAFEGO`, `NAVE` (Task 1); `lcg`; `alfaEstrela`,
  `janelaApagada`, `farolApagado`, `torres`, `pontoTrafego`, `luzesDaNave`, `RitmoJanela` (Task 3); `brilho` (Task 8);
  `ContextoCenario`, `GrupoLuz`, `Peca` (Task 7).
- Produces: `montarVida(ctx): Peca`.

- [ ] **Step 1: `src/menu/vida.ts`**

```ts
import Phaser from 'phaser';
import { CACHOEIRA, ESTRELAS, FAROIS, JANELAS, NAVE, TRAFEGO } from './numerosMenu';
import { lcg } from './acaso';
import { alfaEstrela, farolApagado, janelaApagada, luzesDaNave, pontoTrafego, torres, type RitmoJanela } from './ritmos';
import { brilho } from './texturas';
import type { ContextoCenario, GrupoLuz, Peca } from './cenario';

/**
 * §3.2–3.4 A VIDA DA CIDADE: as estrelas na janela de céu, as janelas e os faróis que apagam (a luz TIRADA da pintura:
 * `apagadas.png` só tem os pixels que mudam, e fica debaixo da névoa), a cachoeira, o tráfego nas pontes (só no
 * trecho visível de cada deque) e a nave parada com as luzes dela. O sorteio é o das maquetes (`lcg`), na mesma ordem.
 */
export function montarVida(ctx: ContextoCenario): Peca {
  const { scene, k, chave, dados: D } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;

  // As estrelas: sorteadas na janela aberta, onde a cidade é transparente e o céu é escuro.
  const r = lcg(ESTRELAS.semente);
  const estrelas: { o: Phaser.GameObjects.Image; f: number; p: number }[] = [];
  for (let n = 0; n < ESTRELAS.tentativas && estrelas.length < ESTRELAS.quantidade; n++) {
    const x = Math.floor(ESTRELAS.xMin + r() * ESTRELAS.xVar);
    const y = Math.floor(r() * ESTRELAS.yVar);
    const i = (y * k * D.w + x * k) * 4;
    const l = 0.3 * ctx.pixelsCeu[i] + 0.59 * ctx.pixelsCeu[i + 1] + 0.11 * ctx.pixelsCeu[i + 2];
    if (ctx.pixelsCidade[i + 3] !== 0 || l >= ESTRELAS.lumMax) continue;
    const cor = r() < 0.5 ? ESTRELAS.cores[0] : ESTRELAS.cores[1];
    const o = A.image(x + 0.5, y + 0.5, 'menu-brilho').setScale(brilho(ESTRELAS.diametro)).setBlendMode(ADD).setDepth(0.5).setTint(cor);
    estrelas.push({ o, f: 0.6 + r() * 1.4, p: r() * 6 });
  }

  // As janelas que apagam: sorteadas entre as pequenas.
  const rj = lcg(JANELAS.semente);
  const candidatas = D.grupos.filter((g) => g.tipo === 'janela' && g.n <= JANELAS.areaMax);
  const escolhidas: GrupoLuz[] = [];
  while (escolhidas.length < JANELAS.quantidade && candidatas.length) {
    escolhidas.push(candidatas.splice(Math.floor(rj() * candidatas.length), 1)[0]);
  }
  // A peça apagada: a camada `apagadas` recortada na caixa da luz + a margem (a franja, o halo do farol).
  const apagar = (g: GrupoLuz, margem: number): Phaser.GameObjects.Image =>
    A.image(0, 0, chave('apagadas'))
      .setOrigin(0)
      .setScale(1 / k)
      .setDepth(2.01)
      .setCrop(
        Math.floor((g.x - margem) * k),
        Math.floor((g.y - margem) * k),
        Math.ceil((g.w + 2 * margem) * k),
        Math.ceil((g.h + 2 * margem) * k),
      )
      .setVisible(false);
  const janelas = escolhidas.map((g) => {
    const l: RitmoJanela = {
      ciclo: JANELAS.cicloMin + rj() * JANELAS.cicloVar,
      fora: JANELAS.foraMin + rj() * JANELAS.foraVar,
      fase: rj() * JANELAS.faseVar,
      falha: rj() < JANELAS.chanceFalha,
    };
    return { o: apagar(g, JANELAS.margem), l };
  });

  // Os faróis: os da mesma torre dividem a fase (piscam juntos).
  const fGrupos = D.grupos.filter((g) => g.tipo === 'farol' && g.n <= FAROIS.areaMax);
  const raizes = torres(fGrupos);
  const faseDaTorre = new Map<number, number>();
  const farois = fGrupos.map((g, i) => {
    if (!faseDaTorre.has(raizes[i])) faseDaTorre.set(raizes[i], rj() * FAROIS.ciclo);
    return { o: apagar(g, FAROIS.margem), fase: faseDaTorre.get(raizes[i]) ?? 0 };
  });

  // A cachoeira.
  const agua = A.sprite(D.agua.x, D.agua.y, chave('cachoeira'), 0).setOrigin(0).setScale(1 / k).setDepth(2.02);

  // O tráfego: luzes embaçadas, um pouco mais largas que altas, quantas o deque comporta.
  const trafego: { o: Phaser.GameObjects.Image; ponte: readonly number[]; v: number; p: number; fl: number }[] = [];
  for (const ponte of TRAFEGO.pontes) {
    const [x0, y0, x1, y1] = ponte;
    const n = 1 + Math.floor(Math.hypot(x1 - x0, y1 - y0) / TRAFEGO.porComprimento) + (rj() < 0.5 ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const cor = rj() < TRAFEGO.chanceCor1 ? TRAFEGO.cores[0] : TRAFEGO.cores[1];
      const o = A.image(0, 0, 'menu-brilho')
        .setScale(brilho(TRAFEGO.diametro) * TRAFEGO.alongar, brilho(TRAFEGO.diametro))
        .setBlendMode(ADD)
        .setDepth(2.3)
        .setTint(cor);
      const v = (rj() < 0.5 ? -1 : 1) * (TRAFEGO.velMin + rj() * TRAFEGO.velVar);
      trafego.push({ o, ponte, v, p: rj(), fl: rj() * 6 });
    }
  }

  // A nave, parada onde ele pintou (o sobe-e-desce escondia a nave desenhada), e as luzes dela.
  A.image(D.nave.x, D.nave.y, chave('nave')).setOrigin(0).setScale(1 / k).setDepth(2.4);
  const luz = ([fx, fy]: readonly number[], cor: number): Phaser.GameObjects.Image =>
    A.image(D.nave.x + fx + 0.5, D.nave.y + fy + 0.5, 'menu-brilho').setScale(brilho(NAVE.diametro)).setBlendMode(ADD).setDepth(2.5).setTint(cor);
  const fileira = NAVE.fileira.map((p) => luz(p, NAVE.corFileira));
  const baixo = NAVE.baixo.map((p) => luz(p, NAVE.corBaixo));
  const topo = luz(NAVE.topo, NAVE.corTopo);

  return {
    atualizar(t: number): void {
      for (const e of estrelas) e.o.setAlpha(alfaEstrela(e.f, e.p, t));
      for (const j of janelas) j.o.setVisible(janelaApagada(j.l, t));
      for (const f of farois) f.o.setVisible(farolApagado(f.fase, t));
      agua.setFrame(Math.floor(t * CACHOEIRA.fps) % D.agua.quadros);
      for (const c of trafego) {
        const p = pontoTrafego(c.ponte, c.p, c.v, c.fl, t);
        c.o.setPosition(p.x, p.y).setAlpha(p.alfa);
      }
      const L = luzesDaNave(t);
      fileira.forEach((o, i) => o.setAlpha(L.fileira[i]));
      baixo.forEach((o, i) => o.setAlpha(L.baixo[i]));
      topo.setVisible(L.topo);
    },
  };
}
```

- [ ] **Step 2: a peça entra no `Cenario`** — em `src/menu/cenario.ts`, o import e a lista:

```ts
import { montarVida } from './vida';
```

```ts
    this.pecas = [montarLeviata(ctx), montarVida(ctx)];
```

- [ ] **Step 3: olhar**

Run: `npm run typecheck` e `node scripts/_menu/_ver-cenario.mjs "$S/t9.png" 5`.
Expected: `sem erros`. Recorte e amplie (×3) a ponte de baixo à direita (x 1040–1400, y 690–770 da tela de 1536),
a passarela da cachoeira (1290–1430, 490–550) e a nave (250–550, 190–390): as luzes do tráfego andam só nos deques
(nenhuma na frente de rocha ou torre), a cachoeira cai, a nave está parada com a fileira acesa. Rode duas vezes com
segundos diferentes (5 e 6,1): alguma janela ou farol apagado aparece numa e não na outra, sem buraco escuro.

- [ ] **Step 4: checkpoint** — `npm run typecheck` sem erro.

---

### Task 10: o volume (o tratamento das fases e da cutscene 2)

**Files:**
- Create: `src/menu/volume.ts`
- Modify: `src/menu/cenario.ts` (o import e a lista de peças)

**Interfaces:**
- Consumes: `VOLUME`, `LARGURA`, `ALTURA` (Task 1); `lcg`; `brilho` (Task 8); `ContextoCenario`, `Peca`.
- Produces: `montarVolume(ctx): Peca`.

- [ ] **Step 1: `src/menu/volume.ts`**

```ts
import Phaser from 'phaser';
import { ALTURA, LARGURA, VOLUME } from './numerosMenu';
import { lcg } from './acaso';
import { brilho } from './texturas';
import type { ContextoCenario, Peca } from './cenario';

/**
 * §3.5 O VOLUME — o tratamento das fases e das cutscenes, não só a Atmosfera (19/10, ele: *"névoa, granulação,
 * volumetria"*): a BRUMA das fases em faixas que andam em velocidades diferentes (a diferença é que vende o volume; as
 * duas mais rápidas passam NA FRENTE das luzes; uma na janela, atrás da cidade e na frente do Leviatã), os FACHOS
 * frios das fases e a VOLUMETRIA da cutscene 2 (um halo grande e macio nas luzes mais fortes, um facho âmbar raro).
 */
export function montarVolume(ctx: ContextoCenario): Peca {
  const { scene, k, dados: D } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;

  // A bruma. A textura tem `k` px por px de jogo: a escala do ladrilho divide por `k`.
  const bandas: { ts: Phaser.GameObjects.TileSprite; vel: number; sx: number }[] = [];
  const banda = (b: { y: number; h: number; tint: number; pico: number; vel: number }, i: number, depth: number): void => {
    const sx = 1 - i * 0.095;
    const ts = A.tileSprite(0, b.y, LARGURA, b.h, `menu-fog-${k}`).setOrigin(0).setDepth(depth).setTint(b.tint).setAlpha(b.pico);
    ts.setTileScale(sx / k, b.h / 64 / k);
    bandas.push({ ts, vel: b.vel, sx });
  };
  banda(VOLUME.longe, 0, 1.5);
  VOLUME.bandas.forEach((b, i) => banda(b, i, b.frente ? 2.6 : 2.05));

  // Os fachos frios, do lado aceso do planeta, atravessando a névoa.
  const fachos = VOLUME.fachos.map((f, i) => ({
    img: A.image(f.x, f.y, `menu-raio-${k}`).setDepth(2.07).setTint(VOLUME.corFacho).setBlendMode(ADD).setAngle(f.angulo).setScale(f.escala / k, 1 / k),
    f,
    i,
  }));

  // A volumetria: as cinco luzes mais fortes longe das bordas, cada uma com o seu halo respirando; as duas mais
  // fortes, um facho âmbar.
  const H = VOLUME.halos;
  const F = VOLUME.fachosLuz;
  const rh = lcg(H.semente);
  const fortes = D.grupos
    .filter((g) => g.tipo === 'janela' && g.x > H.margem && g.x < LARGURA - H.margem && g.y > H.margem && g.y < ALTURA - H.margem)
    .sort((a, b) => b.n - a.n)
    .slice(0, H.quantidade);
  const halos = fortes.map((g, i) => {
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;
    const o = A.image(cx, cy, 'menu-brilho').setBlendMode(ADD).setTint(H.cor).setDepth(2.08).setScale(brilho(H.diamMin + rh() * H.diamVar));
    const halo = { o, base: H.baseMin + rh() * H.baseVar, dur: H.durMin + rh() * H.durVar, fase: rh() * 6 };
    if (i < F.quantidade) {
      A.image(cx, cy, `menu-raio-${k}`)
        .setBlendMode(ADD)
        .setTint(F.cor)
        .setDepth(2.08)
        .setAlpha(F.alfaMin + rh() * F.alfaVar)
        .setAngle(F.anguloMin - rh() * F.anguloVar)
        .setScale((F.larguraMin + rh() * F.larguraVar) / k, (F.compMin + rh() * F.compVar) / k);
    }
    return halo;
  });

  return {
    atualizar(t: number): void {
      for (const b of bandas) b.ts.tilePositionX = (t * b.vel * k) / b.sx;
      for (const { img, f, i } of fachos) {
        img.setX(f.x + Math.sin(t * 0.05 + i * 2) * f.deriva);
        img.setAlpha(f.pico * (0.7 + 0.3 * Math.sin(t * 0.45 + i * 1.7)));
      }
      for (const h of halos) h.o.setAlpha(h.base * (0.7 + 0.3 * Math.sin((t * 2 * Math.PI) / h.dur + h.fase)));
    },
  };
}
```

- [ ] **Step 2: a peça entra no `Cenario`**

```ts
import { montarVolume } from './volume';
```

```ts
    this.pecas = [montarLeviata(ctx), montarVida(ctx), montarVolume(ctx)];
```

- [ ] **Step 3: olhar**

Run: `node scripts/_menu/_ver-cenario.mjs "$S/t10.png" 5`
Expected: `sem erros`. A bruma vela o vale em camadas (as duas da frente passam por cima das luzes de baixo), os fachos
frios atravessam a névoa vindos do alto à direita, e as cinco luzes mais fortes têm um halo âmbar macio. Compare com
`docs/superpowers/folhas/2026-10-19/menu/rodada9/` (o vídeo): o mesmo volume.

- [ ] **Step 4: checkpoint** — `npm run typecheck` sem erro.

---

### Task 11: o perigo — holofotes, a nave vasculhando, a tempestade

**Files:**
- Create: `src/menu/perigo.ts`
- Modify: `src/menu/cenario.ts` (o import, a lista de peças e a contagem dos relâmpagos)

**Interfaces:**
- Consumes: `HOLOFOTES`, `FEIXE`, `BUSCA`, `PROPULSORES`, `TEMPESTADE`, `LARGURA`, `ALTURA` (Task 1); `lcg`;
  `quieto` (Task 2); `anguloHolofote`, `anguloBusca`, `forcaPropulsor`, `brilhoRelampago` (Task 3); `brilho`,
  `LARG_CONE` (Task 8); `ContextoCenario`, `EstadoMenu`, `Peca`.
- Produces: `montarPerigo(ctx, estado): Peca & { contagem: () => number }`.

- [ ] **Step 1: `src/menu/perigo.ts`**

```ts
import Phaser from 'phaser';
import { ALTURA, BUSCA, FEIXE, HOLOFOTES, LARGURA, PROPULSORES, TEMPESTADE } from './numerosMenu';
import { lcg } from './acaso';
import { quieto } from './abertura';
import { anguloBusca, anguloHolofote, brilhoRelampago, forcaPropulsor } from './ritmos';
import { brilho, LARG_CONE } from './texturas';
import type { ContextoCenario, EstadoMenu, Peca } from './cenario';

/**
 * §4 O PERIGO (19/10, ele: *"precisamos deixar uma impressão de perigo"*): os holofotes antiaéreos varrendo o céu, a
 * nave vasculhando a colônia com o holofote da quilha, e a tempestade chegando na massa de nuvem que ele marcou —
 * clarões por dentro das nuvens (as silhuetas da frente ficam em contraluz), um raio em cerca de metade deles, a nuvem
 * pesada rolando. Nenhum relâmpago na janela quieta da abertura, nem com movimento reduzido.
 */
export function montarPerigo(ctx: ContextoCenario, estado: EstadoMenu): Peca & { contagem: () => number } {
  const { scene, k, chave, dados: D, tempestade: TD } = ctx;
  const A = scene.add;
  const ADD = Phaser.BlendModes.ADD;
  const feixe = (x: number, y: number, comp: number, larg: number, alfa: number, depth: number): Phaser.GameObjects.Image =>
    A.image(x, y, 'menu-cone')
      .setOrigin(0, 0.5)
      .setBlendMode(ADD)
      .setTint(FEIXE.cor)
      .setDepth(depth)
      .setScale(comp / 256, larg / LARG_CONE)
      .setAlpha(alfa);

  // Os holofotes antiaéreos: o feixe e a lâmpada na base.
  const holofotes = HOLOFOTES.map((h) => {
    A.image(h.x, h.y, 'menu-brilho').setScale(brilho(FEIXE.lampada)).setTint(FEIXE.corLampada).setBlendMode(ADD).setDepth(2.31).setAlpha(FEIXE.alfaLampada);
    return { o: feixe(h.x, h.y, h.comp, FEIXE.largura, FEIXE.alfa, 2.09), h };
  });

  // A nave vasculhando: o holofote da quilha e os dois propulsores frios.
  const bx = D.nave.x + BUSCA.origem[0];
  const by = D.nave.y + BUSCA.origem[1];
  const busca = feixe(bx, by, BUSCA.comp, BUSCA.largura, BUSCA.alfa, 2.39);
  A.image(bx, by, 'menu-brilho').setScale(brilho(BUSCA.lampada)).setTint(BUSCA.corLampada).setBlendMode(ADD).setDepth(2.45).setAlpha(BUSCA.alfaLampada);
  const propulsores = PROPULSORES.pontos.map(([px, py]) => {
    const x = D.nave.x + px;
    const y = D.nave.y + py;
    return {
      luz: A.image(x, y, 'menu-brilho').setScale(brilho(PROPULSORES.diametro)).setTint(PROPULSORES.cor).setBlendMode(ADD).setDepth(2.45),
      jato: feixe(x, y, PROPULSORES.jato[0], PROPULSORES.jato[1], PROPULSORES.alfaJato, 2.39).setTint(PROPULSORES.cor).setAngle(90),
    };
  });

  // A tempestade: as máscaras assadas (`_tempestade.mjs`) — os clarões e a nuvem em meia resolução, os raios inteiros.
  const meia = TD.reducao / k;
  const flashes = TD.flashes.map((c, n) =>
    A.image(c.x / k, c.y / k, chave(`flash${n}`)).setOrigin(0).setScale(meia).setBlendMode(ADD).setTint(TEMPESTADE.cor).setDepth(2.03).setAlpha(0),
  );
  const raios = TD.raios.map((c, n) =>
    A.image(c.x / k, c.y / k, chave(`raio${n}`)).setOrigin(0).setScale(1 / k).setBlendMode(ADD).setTint(TEMPESTADE.corRaio).setDepth(2.04).setAlpha(0),
  );
  const clarao = A.rectangle(0, 0, LARGURA, ALTURA, TEMPESTADE.corGlobal, 1).setOrigin(0).setBlendMode(ADD).setDepth(2.62).setAlpha(0);
  // A nuvem pesada rolando, só sobre as nuvens da massa (a máscara só existe no WebGL).
  const R = TEMPESTADE.rolar;
  let rolo: Phaser.GameObjects.TileSprite | null = null;
  if (scene.renderer.type === Phaser.WEBGL) {
    const c = TD.nuvem;
    rolo = A.tileSprite(c.x / k, c.y / k, c.w / k, c.h / k, `menu-fog-${k}`)
      .setOrigin(0)
      .setDepth(2.035)
      .setTint(R.cor)
      .setAlpha(R.alfa)
      .setTileScale(R.escala[0] / k, R.escala[1] / k);
    const mascara = scene.make.image({ x: c.x / k, y: c.y / k, key: chave('nuvem') }, false).setOrigin(0).setScale(meia);
    rolo.setMask(mascara.createBitmapMask());
  }

  // Os relâmpagos: o primeiro com hora marcada (antes do letreiro), os outros sorteados a cada 6–12 s.
  const rnd = lcg(TEMPESTADE.semente);
  const sortear = (depois: number): { t: number; foco: number; comRaio: boolean } => ({
    t: depois + TEMPESTADE.intervalo[0] + rnd() * (TEMPESTADE.intervalo[1] - TEMPESTADE.intervalo[0]),
    foco: Math.floor(rnd() * TEMPESTADE.focos.length),
    comRaio: rnd() < TEMPESTADE.chanceRaio,
  });
  let proximo = { t: TEMPESTADE.primeiro.t, foco: TEMPESTADE.primeiro.foco, comRaio: TEMPESTADE.primeiro.comRaio };
  let atual: { t: number; foco: number; comRaio: boolean } | null = null;
  let contagem = 0;

  return {
    contagem: () => contagem,
    atualizar(t: number): void {
      for (const { o, h } of holofotes) o.setAngle(anguloHolofote(h, t));
      busca.setAngle(anguloBusca(t));
      propulsores.forEach((p, i) => {
        const f = forcaPropulsor(i, t);
        p.luz.setAlpha(PROPULSORES.alfa * f);
        p.jato.setAlpha(PROPULSORES.alfaJato * f);
      });
      if (rolo) {
        rolo.tilePositionX = -(t * R.vel * k) / R.escala[0];
        rolo.tilePositionY = Math.sin(t * R.ondulaHz) * R.ondula * k;
      }
      if (t >= proximo.t) {
        // Na janela quieta (o letreiro descendo e acendendo) e com movimento reduzido, o relâmpago não cai.
        if (!estado.reduzido && !quieto(estado.tAbertura, estado.pulou)) {
          atual = proximo;
          contagem++;
        }
        proximo = sortear(proximo.t);
      }
      const a = atual;
      const { v, raio } = a ? brilhoRelampago(t - a.t) : { v: 0, raio: 0 };
      flashes.forEach((f, n) => f.setAlpha(a && n === a.foco ? TEMPESTADE.forca * v : 0));
      raios.forEach((r, n) => r.setAlpha(a && a.comRaio && n === a.foco ? raio : 0));
      clarao.setAlpha(TEMPESTADE.global * v);
    },
  };
}
```

- [ ] **Step 2: a peça entra no `Cenario`** — em `src/menu/cenario.ts`:

```ts
import { montarPerigo } from './perigo';
```

e o construtor passa a ser:

```ts
  private constructor(ctx: ContextoCenario, estado: EstadoMenu, profundidadeVeu: number) {
    const { scene, k, chave } = ctx;
    this.estado = estado;
    scene.add.image(0, 0, chave('ceu')).setOrigin(0).setScale(1 / k).setDepth(0);
    scene.add.image(0, 0, chave('cidade')).setOrigin(0).setScale(1 / k).setDepth(2);
    const perigo = montarPerigo(ctx, estado);
    this.pecas = [montarLeviata(ctx), montarVida(ctx), montarVolume(ctx), perigo];
    this.relampagos = perigo.contagem;
    this.veu = scene.add.rectangle(0, 0, LARGURA, ALTURA, 0x000000, 1).setOrigin(0).setDepth(profundidadeVeu);
  }
```

- [ ] **Step 3: olhar o relâmpago e os feixes**

Run: `npm run typecheck`, `node scripts/_menu/_ver-cenario.mjs "$S/t11-raio.png" 2.43` e
`node scripts/_menu/_ver-cenario.mjs "$S/t11-calmo.png" 2`.
Expected: `sem erros`. Em `t11-raio.png`, a massa de nuvem da esquerda acesa por dentro (a torre, a cúpula e a nave
escuras na frente) e um raio bifurcado; em `t11-calmo.png`, sem clarão, a massa mais densa que o resto do céu (a
nuvem pesada) e sem escurecer a cúpula nem a torre. Nas duas: os três feixes (dois finos à esquerda, um da cidadela
para a janela de céu) e o holofote da nave varrendo o vale, com os dois propulsores azulados embaixo do casco.

- [ ] **Step 4: checkpoint** — `npm run typecheck` sem erro.

---

### Task 12: o menu de verdade

**Files:**
- Create: `src/menu/titulo.ts`, `src/menu/jatos.ts`, `src/menu/conducao.ts`
- Rewrite: `src/scenes/MenuScene.ts`
- Modify: `src/scenes/ArquivoScene.ts` (as duas voltas para o menu)
- Modify: `src/scenes/BootScene.ts` (saem três chaves)
- Modify: `src/main.ts` (`?semhd`)
- Move: `public/sprites/menu-moon.png`, `public/sprites/menu-logo-sheet.png` → `assets/raw/*-original.png`

**Interfaces:**
- Consumes: tudo das Tasks 1–11.
- Produces (o que a sonda da Task 13 usa no `MenuScene`): `settled`, `cursorMenu`, `conducao`, `estado`, `cenario`,
  `jatos` (com `quantos`), `irPara(t)`, `diagnostico()`.

- [ ] **Step 1: `src/menu/conducao.ts`**

```ts
import type { HandlingMode } from '../scenes/GameScene';
import { CHAVE_CONDUCAO, CONDUCOES } from './numerosMenu';

/** A condução lembrada entre sessões (spec §7.2); sem `localStorage` (ou com lixo nele), a diegética. */
export function lerConducao(): HandlingMode {
  try {
    const v = localStorage.getItem(CHAVE_CONDUCAO);
    const c = CONDUCOES.find((x) => x.id === v);
    if (c) return c.id;
  } catch {
    // Sem armazenamento (modo privado, bloqueado): fica a padrão.
  }
  return 'diegetico';
}

export function salvarConducao(h: HandlingMode): void {
  try {
    localStorage.setItem(CHAVE_CONDUCAO, h);
  } catch {
    // Sem armazenamento: a escolha vale só nesta sessão.
  }
}
```

- [ ] **Step 2: `src/menu/jatos.ts`**

```ts
import Phaser from 'phaser';
import type { Particula } from './abertura';

/**
 * Os JATOS do letreiro na tela (spec §6.3): um pool de quadradinhos nítidos na camada do texto (fora do tratamento),
 * desenhados a partir de `particulasDosJatos(t)`. As posições caem no pixel da tela (1/s px de jogo).
 */
export class Jatos {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private vivos = 0;

  constructor(scene: Phaser.Scene, profundidade: number, max: number) {
    if (!scene.textures.exists('menu-px')) {
      const t = scene.textures.createCanvas('menu-px', 1, 1);
      if (t) {
        t.context.fillStyle = '#fff';
        t.context.fillRect(0, 0, 1, 1);
        t.refresh();
      }
    }
    for (let i = 0; i < max; i++) this.pool.push(scene.add.image(0, 0, 'menu-px').setDepth(profundidade).setVisible(false));
  }

  /** Quantas partículas estão na tela (a sonda lê). */
  get quantos(): number {
    return this.vivos;
  }

  desenhar(ps: readonly Particula[], s: number): void {
    const q = (v: number): number => Math.round(v * s) / s;
    const n = Math.min(ps.length, this.pool.length);
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      this.pool[i].setVisible(true).setPosition(q(p.x), q(p.y)).setScale(Math.max(1 / s, q(p.tam))).setTint(p.cor).setAlpha(p.alfa);
    }
    for (let i = n; i < this.vivos; i++) this.pool[i].setVisible(false);
    this.vivos = n;
  }

  destruir(): void {
    for (const o of this.pool) o.destroy();
    this.pool.length = 0;
    this.vivos = 0;
  }
}
```

- [ ] **Step 3: `src/menu/titulo.ts`**

```ts
import Phaser from 'phaser';
import { pixelText } from '../ui';
import { ABERTURA, CORES_TEXTO, TITULO } from './numerosMenu';
import { letraAcesa, olhosAcesos, respiracao } from './abertura';
import { gerarLetreiro, type Letreiro } from './letreiro';

/** O título do menu na tela (spec §6.5): o letreiro de neon (camada HD) ou, sem ela, o texto que acende por cor. */
export interface TituloMenu {
  /** Desenha no instante `t` da abertura, com o centro em (cx, cy) px de jogo. */
  atualizar(t: number, cx: number, cy: number): void;
  /** A tela mudou de escala: o neon é gerado de novo para ela. */
  trocarEscala(s: number): void;
  /** Para a sonda: onde está, quantas letras acesas, os olhos. */
  estado(): { x: number; y: number; acesas: number; olhos: boolean };
  destruir(): void;
}

/**
 * Pinta cada letra (sem contar os espaços) com `cor(i)`. Na BitmapText (a Silkscreen assada), letra a letra; no texto
 * do sistema (sem a fonte), o texto inteiro com a cor da 1ª letra.
 */
export function tingirLetras(o: Phaser.GameObjects.Text, cor: (i: number) => number): void {
  const b = o as unknown as Phaser.GameObjects.BitmapText;
  if (typeof b.setCharacterTint === 'function') {
    let i = 0;
    for (let c = 0; c < b.text.length; c++) {
      if (b.text[c] === ' ') continue;
      b.setCharacterTint(c, 1, false, cor(i++));
    }
  } else {
    o.setColor(Phaser.Display.Color.IntegerToColor(cor(0)).rgba);
  }
}

/** O neon: por letra, uma peça apagada e uma acesa (o W, também a acesa com os olhos), cada pixel = 2 px de tela. */
class TituloNeon implements TituloMenu {
  private pecas: { ini: number; apagado: Phaser.GameObjects.Image; aceso: Phaser.GameObjects.Image; olhos: Phaser.GameObjects.Image | null }[] = [];
  private letreiro: Letreiro | null = null;
  private ultimo = { x: 0, y: 0, acesas: 0, olhos: false };

  constructor(private readonly cena: Phaser.Scene, s: number) {
    this.montar(s);
  }

  get pronto(): boolean {
    return this.letreiro !== null;
  }

  private montar(s: number): void {
    this.soltar();
    this.letreiro = gerarLetreiro(this.cena, s);
    const L = this.letreiro;
    if (!L) return;
    const escala = 2 / L.s;
    this.pecas = L.letras.map((l, i) => {
      const peca = (chave: string): Phaser.GameObjects.Image =>
        this.cena.add.image(0, 0, chave, `L${i}`).setOrigin(0, 0.5).setScale(escala).setDepth(20).setVisible(false);
      return { ini: l.ini, apagado: peca(L.chaves.apagado), aceso: peca(L.chaves.aceso), olhos: l.ch === 'W' ? peca(L.chaves.olhos) : null };
    });
  }

  trocarEscala(s: number): void {
    this.montar(s);
  }

  atualizar(t: number, cx: number, cy: number): void {
    const L = this.letreiro;
    if (!L) return;
    const e = 2 / L.s;
    const resp = respiracao(t);
    const olhos = olhosAcesos(t);
    let acesas = 0;
    this.pecas.forEach((p, i) => {
      const x = cx + (p.ini - L.w / 2) * e;
      const aceso = letraAcesa(i, t);
      if (aceso) acesas++;
      const comOlhos = p.olhos !== null && olhos;
      p.apagado.setPosition(x, cy).setVisible(!aceso);
      p.aceso.setPosition(x, cy).setVisible(aceso && !comOlhos).setAlpha(resp);
      p.olhos?.setPosition(x, cy).setVisible(aceso && comOlhos).setAlpha(resp);
    });
    this.ultimo = { x: cx, y: cy, acesas, olhos };
  }

  estado(): { x: number; y: number; acesas: number; olhos: boolean } {
    return this.ultimo;
  }

  private soltar(): void {
    for (const p of this.pecas) {
      p.apagado.destroy();
      p.aceso.destroy();
      p.olhos?.destroy();
    }
    this.pecas = [];
  }

  destruir(): void {
    this.soltar();
    this.letreiro = null;
  }
}

/** Sem a camada HD: o texto Silkscreen, apagado e acendendo letra por letra (o marcador de lugar da rodada 6). */
class TituloTexto implements TituloMenu {
  private readonly o: Phaser.GameObjects.Text;
  private ultimo = { x: 0, y: 0, acesas: 0, olhos: false };

  constructor(cena: Phaser.Scene) {
    this.o = pixelText(cena, ABERTURA.layout.x, -40, TITULO, { size: 20, color: CORES_TEXTO.tituloApagado }).setDepth(20);
  }

  atualizar(t: number, cx: number, cy: number): void {
    let acesas = 0;
    this.o.setPosition(cx, cy).setAlpha(respiracao(t));
    tingirLetras(this.o, (i) => {
      const a = letraAcesa(i, t);
      if (a) acesas++;
      return a ? CORES_TEXTO.tituloAceso : CORES_TEXTO.tituloApagado;
    });
    this.ultimo = { x: cx, y: cy, acesas, olhos: false };
  }

  trocarEscala(_s: number): void {
    // O texto se redesenha sozinho na escala nova (`registrarTextoHD`).
  }

  estado(): { x: number; y: number; acesas: number; olhos: boolean } {
    return this.ultimo;
  }

  destruir(): void {
    this.o.destroy();
  }
}

/** O neon na irmã da camada HD; sem a camada (ou sem a fonte), o texto. */
export function criarTitulo(mundo: Phaser.Scene, irma: Phaser.Scene | null, s: number): TituloMenu {
  if (irma) {
    const neon = new TituloNeon(irma, s);
    if (neon.pronto) return neon;
    neon.destruir();
  }
  return new TituloTexto(mundo);
}
```

- [ ] **Step 4: `src/scenes/MenuScene.ts`** — o arquivo inteiro passa a ser:

```ts
import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { cenaDeFundoHD, escalaHD, EVENTO_ESCALA, irmaDe, jogoHD, removerCenaHD } from '../uiHD';
import { Music } from '../systems/Music';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import type { HandlingMode } from './GameScene';
import { ABERTURA, CONDUCOES, CORES_TEXTO, ITEM, JATOS, NOMES_ITENS, SUBTITULO } from '../menu/numerosMenu';
import { T_FIM, T_LISTA_POUSA, alfaItem, particulasDosJatos, posicaoLetreiro, quedaLista, subAcesa } from '../menu/abertura';
import { Cenario, carregarCamadasMenu, type EstadoMenu } from '../menu/cenario';
import { CHAVE_MENU_HD, MenuCenaHD } from '../menu/MenuCenaHD';
import { criarTitulo, tingirLetras, type TituloMenu } from '../menu/titulo';
import { Jatos } from '../menu/jatos';
import { lerConducao, salvarConducao } from '../menu/conducao';

const movimentoReduzido = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A TELA-TÍTULO — A COLÔNIA DE KEPLER À NOITE (bloco E, spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`).
 *
 * O cenário — a pintura dele na resolução dela, viva, com perigo no ar, sob a Atmosfera `menu` — mora numa cena da
 * camada HD (`MenuCenaHD`), atrás do texto; sem a camada, ele roda aqui mesmo, na resolução do jogo (§8.3). Esta cena
 * fica com o relógio da ABERTURA (§6): alguns segundos só de cenário; o letreiro de neon entra pelo alto freando nos
 * retrofoguetes e firma; a lista desce em formação; o neon acende letra por letra; por último, os olhos do W. Tudo é
 * função do relógio (`src/menu/abertura.ts`): a sonda o para em qualquer instante (`irPara`).
 *
 * Qualquer tecla antes de a lista pousar pula para o menu pousado; 1/2/3 começam direto; o movimento reduzido abre pousado.
 */
export class MenuScene extends Phaser.Scene {
  /** Público: a sonda lê. A lista pousou (ou a abertura foi pulada): o menu aceita teclas. */
  settled = false;
  /** Público: a sonda lê o cursor. */
  cursorMenu: number = ITEM.comecar;
  /** A condução da linha do menu, lembrada entre sessões. Pública: a sonda lê. */
  conducao: HandlingMode = 'diegetico';
  /** O relógio da abertura e o que o cenário lê (o véu, a janela quieta da tempestade). Público: a sonda lê. */
  readonly estado: EstadoMenu = { tAbertura: 0, pulou: false, reduzido: false, pronto: false, congelado: false };
  /** Sem a camada HD, o cenário mora aqui. Público: a sonda lê. */
  cenario: Cenario | null = null;
  /** Público: a sonda conta as partículas. */
  jatos: Jatos | null = null;
  private atm: Atmosfera | null = null;
  private tCena = 0;
  private tCursor = 0;
  private direto = false;
  /** O texto mora na camada HD (a irmã)? Então as posições caem no pixel da tela (1/s). */
  private naCamada = false;
  private itens: Phaser.GameObjects.Text[] = [];
  private coresItens: number[] = [];
  private sub: Phaser.GameObjects.Text | null = null;
  private desc: Phaser.GameObjects.Text | null = null;
  private titulo: TituloMenu | null = null;
  private readonly aoEscala = (s: number): void => this.titulo?.trocarEscala(s);

  constructor() {
    super('Menu');
  }

  init(data: { cursor?: number; direto?: boolean } = {}): void {
    this.cursorMenu = data.cursor ?? ITEM.comecar;
    this.direto = data.direto === true;
  }

  create(): void {
    // Cada partida nova sorteia as variantes de arte de novo (como o menu antigo fazia).
    resetVariantCache();
    this.settled = false;
    Object.assign(this.estado, { tAbertura: 0, pulou: false, pronto: false, congelado: false, reduzido: movimentoReduzido() });
    this.cenario = null;
    this.atm = null;
    this.jatos = null;
    this.titulo = null;
    this.tCena = 0;
    this.tCursor = 0;
    this.itens = [];
    this.coresItens = [];
    this.conducao = lerConducao();
    this.cameras.main.setBackgroundColor('#000000');

    this.montarCenario();
    this.montarTexto();
    // A faixa atravessa a transição de cena sem corte (Music.play não reinicia se já toca).
    Music.play(this, 'stage1');
    this.bindKeys();
    if (this.direto || this.estado.reduzido) this.pular();

    const hd = jogoHD();
    hd?.events.on(EVENTO_ESCALA, this.aoEscala);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      hd?.events.off(EVENTO_ESCALA, this.aoEscala);
      removerCenaHD(CHAVE_MENU_HD);
      this.titulo?.destruir();
      this.jatos?.destruir();
    });
  }

  // ─── O cenário e o texto ────────────────────────────────────────────────────

  private montarCenario(): void {
    if (cenaDeFundoHD(CHAVE_MENU_HD, MenuCenaHD, { estado: this.estado })) return;
    // Sem a camada HD: o cenário na resolução do jogo, aqui mesmo (§8.3).
    carregarCamadasMenu(this.load, 'menuK1', 'sprites/menu/k1');
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.sys.isActive()) return;
      this.cenario = Cenario.criar(this, 1, 'menuK1', this.estado, 18);
      if (this.cenario) {
        // O texto, o título e os jatos ficam em 19+: fora do tratamento.
        this.atm = new Atmosfera(this, { limiteLimpo: 19, profundidadePoeira: 1.5 });
        this.atm.perfil(PERFIS.menu);
      }
      this.estado.pronto = true;
    });
    this.load.start();
  }

  private montarTexto(): void {
    const L = ABERTURA.layout;
    this.sub = this.t(L.x, -40, SUBTITULO, 8, CORES_TEXTO.subApagado).setAlpha(0);
    // O ARQUIVO desenha os ícones na camada HD: sem ela, a lista é só COMEÇAR e a condução.
    const n = jogoHD() ? NOMES_ITENS.length : NOMES_ITENS.length - 1;
    this.cursorMenu = Math.min(this.cursorMenu, n - 1);
    for (let i = 0; i < n; i++) {
      this.itens.push(this.t(L.x, L.lista[i] - 40, NOMES_ITENS[i], 8, CORES_TEXTO.item).setAlpha(0));
      this.coresItens.push(CORES_TEXTO.item);
    }
    this.desc = this.t(L.x, L.desc, ' ', 7, CONDUCOES[0].cor).setAlpha(0);
    if (import.meta.env.DEV) {
      this.t(GAME_WIDTH / 2, 8, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, CORES_TEXTO.dev);
      this.t(GAME_WIDTH / 2, 16, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, CORES_TEXTO.dev);
    }
    const irma = irmaDe(this);
    this.naCamada = irma !== null;
    this.titulo = criarTitulo(this, irma, escalaHD());
    this.jatos = new Jatos(irma ?? this, 19, JATOS.max);
  }

  // ─── A abertura ─────────────────────────────────────────────────────────────

  /** Vai direto ao menu pousado (uma tecla, a volta do Arquivo, o movimento reduzido). O relógio segue (o repouso). */
  private pular(): void {
    if (this.estado.pulou) return;
    this.estado.pulou = true;
    if (this.estado.tAbertura < T_FIM) this.estado.tAbertura = T_FIM;
    if (!this.settled) {
      this.settled = true;
      this.tCursor = this.estado.tAbertura;
    }
  }

  /** Para a sonda: o relógio da abertura parado no instante `t` (s), já desenhado. */
  irPara(t: number): void {
    this.estado.congelado = true;
    this.estado.pulou = false;
    this.estado.tAbertura = t;
    this.settled = t >= T_LISTA_POUSA;
    this.desenhar(t);
  }

  /** Para a sonda: onde está cada coisa agora. */
  diagnostico(): {
    titulo: { x: number; y: number; acesas: number; olhos: boolean } | null;
    sub: { y: number; alfa: number } | null;
    jatos: number;
    lista: { texto: string; y: number; alfa: number }[];
    desc: { texto: string; alfa: number } | null;
  } {
    return {
      titulo: this.titulo?.estado() ?? null,
      sub: this.sub ? { y: this.sub.y, alfa: this.sub.alpha } : null,
      jatos: this.jatos?.quantos ?? 0,
      lista: this.itens.map((o) => ({ texto: o.text, y: o.y, alfa: +o.alpha.toFixed(3) })),
      desc: this.desc ? { texto: this.desc.text, alfa: this.desc.alpha } : null,
    };
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.cenario) {
      this.tCena += dt;
      this.atm?.update(dt);
      this.cenario.atualizar(this.tCena);
    }
    if (!this.estado.pronto) return;
    if (!this.estado.congelado) this.estado.tAbertura += dt;
    const t = this.estado.tAbertura;
    if (!this.settled && t >= T_LISTA_POUSA) {
      this.settled = true;
      this.tCursor = t;
    }
    this.desenhar(t);
  }

  private desenhar(t: number): void {
    const s = this.naCamada ? escalaHD() : 1;
    const q = (v: number): number => Math.round(v * s) / s;
    const L = ABERTURA.layout;
    const p = posicaoLetreiro(t - ABERTURA.letreiro.t0);
    const cx = q(p.x);
    const cy = q(p.y);
    this.titulo?.atualizar(t, cx, cy);
    if (this.sub) {
      this.sub.setPosition(cx, q(p.y + L.sub - L.titulo)).setAlpha(1);
      tingirLetras(this.sub, (i) => (subAcesa(i, t) ? CORES_TEXTO.subAceso : CORES_TEXTO.subApagado));
    }
    this.jatos?.desenhar(this.estado.pulou ? [] : particulasDosJatos(t), s);
    this.desenharLista(t, q);
  }

  private desenharLista(t: number, q: (v: number) => number): void {
    const L = ABERTURA.layout;
    const c = CONDUCOES.find((x) => x.id === this.conducao) ?? CONDUCOES[0];
    this.itens.forEach((o, i) => {
      const nome = i === ITEM.conducao ? `CONDUÇÃO: ${c.nome}` : NOMES_ITENS[i];
      const sel = i === this.cursorMenu;
      const txt = sel ? `> ${nome} <` : nome;
      if (o.text !== txt) o.setText(txt);
      const cor = sel ? CORES_TEXTO.selecionado : CORES_TEXTO.item;
      if (this.coresItens[i] !== cor) {
        o.setColor(Phaser.Display.Color.IntegerToColor(cor).rgba);
        this.coresItens[i] = cor;
      }
      const { dy, alfa } = quedaLista(i, t);
      o.setPosition(L.x, q(L.lista[i] + dy));
      o.setAlpha(alfa * alfaItem(sel, t, this.tCursor, this.settled));
    });
    if (this.desc) {
      const mostra = this.settled && this.cursorMenu === ITEM.conducao;
      if (mostra && this.desc.text !== c.desc) {
        this.desc.setText(c.desc);
        this.desc.setColor(Phaser.Display.Color.IntegerToColor(c.cor).rgba);
      }
      this.desc.setAlpha(mostra ? 1 : 0);
    }
  }

  // ─── Teclas ─────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    // Antes de a lista pousar, qualquer tecla só PULA a abertura. O Phaser emite `keydown-X` ANTES de `keydown`:
    // os handlers da lista se guardam com `settled` (e não agem), e este pula. Os atalhos 1/2/3 e os de dev começam
    // direto, como sempre (as sondas contam com isso).
    kb.on('keydown', () => {
      if (!this.settled) this.pular();
    });
    // ⚠️ UM EVENTO, UMA VEZ (a lição da mesa, 03/10): o Phaser reprocessa a fila de teclas a cada evento novo, e o ↓
    // andava duas casas.
    const vistos = new WeakSet<KeyboardEvent>();
    const umaVez = (f: () => void) => (ev: KeyboardEvent): void => {
      if (vistos.has(ev)) return;
      vistos.add(ev);
      f();
    };
    for (const k of ['UP', 'W']) kb.on(`keydown-${k}`, umaVez(() => this.mover(-1)));
    for (const k of ['DOWN', 'S']) kb.on(`keydown-${k}`, umaVez(() => this.mover(1)));
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, umaVez(() => this.trocar(-1)));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, umaVez(() => this.trocar(1)));
    for (const k of ['ENTER', 'SPACE']) kb.on(`keydown-${k}`, umaVez(() => this.confirmar()));
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    if (import.meta.env.DEV) {
      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      // O SANDBOX de dev (`src/sandbox/`): monte a build, os inimigos e o fundo, e jogue.
      kb.on('keydown-X', () => this.game.events.emit('sandbox:montagem'));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () => this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }));
      kb.on('keydown-M', () => this.scene.start('Game', { stage: 3, handling: 'diegetico' }));
      kb.on('keydown-N', () => this.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true }));
      kb.on('keydown-I', () => this.scene.start('Interlude', { score: 4820, handling: 'diegetico' }));
      kb.on('keydown-O', () => this.scene.start('Interlude2', { score: 9140, handling: 'diegetico', ship: 'humana', stage: 3 }));
      kb.on('keydown-L', () => this.scene.start('Game', { stage: 4, handling: 'diegetico', ship: 'humana' }));
      kb.on('keydown-K', () => this.scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
      kb.on('keydown-P', () => this.scene.start('Interlude3', { score: 15200, handling: 'diegetico', ship: 'humana', stage: 4 }));
      kb.on('keydown-F', () =>
        this.scene.start('Interlude4', {
          score: 21000, handling: 'diegetico', ship: 'humana', stage: null, stageDone: 4, practice: false, baseScore: 15200,
        }),
      );
    }
  }

  private mover(d: number): void {
    if (!this.settled || this.itens.length < 2) return;
    this.cursorMenu = Phaser.Math.Wrap(this.cursorMenu + d, 0, this.itens.length);
    this.tCursor = this.estado.tAbertura;
  }

  /** ←→ (e Enter) na linha da condução trocam o valor, e ele fica lembrado. */
  private trocar(d: number): void {
    if (!this.settled || this.cursorMenu !== ITEM.conducao) return;
    const i = CONDUCOES.findIndex((c) => c.id === this.conducao);
    this.conducao = CONDUCOES[Phaser.Math.Wrap(i + d, 0, CONDUCOES.length)].id;
    salvarConducao(this.conducao);
  }

  private confirmar(): void {
    if (!this.settled) return;
    if (this.cursorMenu === ITEM.comecar) this.start(this.conducao);
    else if (this.cursorMenu === ITEM.conducao) this.trocar(1);
    else if (this.cursorMenu === ITEM.arquivo) this.scene.start('Arquivo');
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }
}
```

- [ ] **Step 5: a volta do Arquivo** — em `src/scenes/ArquivoScene.ts`, importe `ITEM` e troque as duas ocorrências
de `{ cursor: 1, direto: true }` por `{ cursor: ITEM.arquivo, direto: true }`:

```ts
import { ITEM } from '../menu/numerosMenu';
```

- [ ] **Step 6: o `BootScene` não carrega mais o menu antigo** — em `src/scenes/BootScene.ts`, apague as entradas
`leviathanSwimSheet` e `menuLogoSheet` do `SHEETS` e `menuMoon` do `ART`, com os blocos de comentário de cada uma.
O `leviathan-swim-sheet.png` fica em `public/sprites/` (é a fonte do `_leviata-menor.mjs`, do `_instalar-menu-nado.mjs`
e do `_estilo-nadadeira.mjs`); só deixa de ser carregado. Depois:

Run: `grep -rn -E "menuMoon|menuLogoSheet|leviathanSwimSheet|menu-moon|menu-logo-sheet" src scripts/*.mjs`
Expected: nada no `src/`; nos scripts, só as sondas antigas que a Task 13 troca (`probe-menu.mjs`,
`probe-menu-intro.mjs`).

- [ ] **Step 7: o backup da arte do menu antigo** (*"não jogue fora o que temos"*)

```bash
mv public/sprites/menu-moon.png assets/raw/menu-moon-original.png
mv public/sprites/menu-logo-sheet.png assets/raw/menu-logo-sheet-original.png
```

- [ ] **Step 8: `?semhd` em `src/main.ts`** — troque `void criarCamadaHD(game, [BootHDScene, CartasScene]);` por:

```ts
// DEV: `?semhd` abre o jogo SEM a camada HD — o plano B do menu e do texto (a sonda do menu passa por ele).
const semHD = import.meta.env.DEV && new URLSearchParams(location.search).has('semhd');
if (!semHD) void criarCamadaHD(game, [BootHDScene, CartasScene]);
```

- [ ] **Step 9: olhar o menu inteiro**

Run: `npm run typecheck`, `node scripts/test-menu-abertura.mjs`, e abra http://localhost:5173/ no navegador (1536 ou
maior): o véu sai, o Leviatã sai da nuvem, o letreiro desce apagado com os retrofoguetes acesos e firma, a lista desce,
o neon acende letra por letra, o REMASTERED, os olhos. ↓ vai à condução (a descrição aparece), ←→ trocam, ↓ vai ao
ARQUIVO, Enter abre o Arquivo e ESC volta com o cursor no ARQUIVO.

- [ ] **Step 10: checkpoint** — `npm run typecheck` sem erro.

---

### Task 13: as sondas

**Files:**
- Rewrite: `scripts/probe-menu.mjs`
- Delete: `scripts/probe-menu-intro.mjs` (testava a abertura antiga: a lua, o emblema, a travessia única)
- Modify: `scripts/probe-arquivo.mjs`, `scripts/_folha-arquivo.mjs`

**Interfaces:**
- Consumes: os públicos do `MenuScene` (Task 12) e da `MenuCenaHD` (Task 8); `abertura.ts` e `numerosMenu.ts`
  importados na página.

- [ ] **Step 1: `scripts/probe-menu.mjs`** — o arquivo inteiro passa a ser:

```js
// O MENU REFEITO (spec 2026-10-19-menu-refeito-design.md §9): o cenário na camada HD atrás do texto; a abertura nos
// tempos certos (o letreiro na curva da queda, os jatos só na descida, a lista, o neon e os olhos); pular; as teclas da
// lista e da condução (lembrada entre sessões); o atalho 1; o relâmpago (e nenhum com movimento reduzido); a troca de
// escala da tela; o menu sem a camada HD (?semhd). Uso: node scripts/probe-menu.mjs (com `npm run dev` rodando)
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const erros = [];
const abrir = async ({ viewport = { width: 1536, height: 864 }, reduzido = false, sufixo = '' } = {}) => {
  const page = await browser.newPage({ viewport });
  if (reduzido) await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto(URL + sufixo, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
  return page;
};

// ── 1. O cenário mora na camada HD, atrás do texto (§8.1) ──
let page = await abrir();
await page.evaluate(() => localStorage.removeItem('alienworld:conducao'));
const camada = await page.evaluate(() => {
  const hd = window.__gameHD;
  const cena = hd.scene.getScene('MenuHD');
  return {
    chaves: hd.scene.scenes.map((c) => c.sys.settings.key),
    s: hd.canvas.width / 384,
    zoom: cena?.cameras.main.zoom,
    temCenario: !!cena?.cenario,
    escalaAtm: cena?.atm?.pipeline?.escala,
  };
});
const S = camada.s;
conferir(camada.chaves[0] === 'MenuHD', 'a cena do cenário é a primeira da camada (atrás de tudo)', camada.chaves);
conferir(camada.chaves.findIndex((k) => k.startsWith('irma:Menu')) > 0, 'o texto mora numa irmã, acima dela', camada.chaves);
conferir(camada.temCenario && camada.zoom === S && camada.escalaAtm === S, `a câmera e a Atmosfera na escala da tela (s = ${S})`, camada);

// ── 2. A abertura, instante a instante (§6) ──
const em = (t) =>
  page.evaluate(async (t) => {
    const A = await import('/src/menu/abertura.ts');
    const N = await import('/src/menu/numerosMenu.ts');
    const m = window.__game.scene.getScene('Menu');
    m.irPara(t);
    const p = A.posicaoLetreiro(t - N.ABERTURA.letreiro.t0);
    return { d: m.diagnostico(), esperado: p, settled: m.settled };
  }, t);
const tol = 1 / S + 1e-6;
let e = await em(2.0);
conferir(e.d.titulo.y < 0 && e.d.jatos === 0 && e.d.lista.every((l) => l.alfa === 0), '2,0 s: só o cenário (o letreiro acima da tela)', e.d);
e = await em(4.0);
conferir(Math.abs(e.d.titulo.y - e.esperado.y) <= tol && Math.abs(e.d.titulo.x - e.esperado.x) <= tol, '4,0 s: o letreiro na curva da queda', [e.d.titulo, e.esperado]);
conferir(e.d.jatos > 20 && e.d.titulo.acesas === 0, `4,0 s: descendo apagado, com os retrofoguetes (${e.d.jatos} partículas)`, e.d);
e = await em(6.0);
conferir(e.d.jatos > 0, '6,0 s: a queima ainda acesa', e.d.jatos);
e = await em(9.0);
conferir(e.d.titulo.acesas > 0 && e.d.titulo.acesas < 10 && !e.d.titulo.olhos, `9,0 s: o neon pegando (${e.d.titulo.acesas} letras)`, e.d.titulo);
e = await em(9.4);
conferir(e.d.jatos === 0 && Math.abs(e.d.titulo.y - 58) <= 0.3, '9,4 s: firme em y 58, sem jatos', e.d);
conferir(Math.abs(e.d.sub.y - (e.d.titulo.y + 13)) <= tol, 'o REMASTERED 13 px abaixo', [e.d.sub, e.d.titulo]);
conferir(e.d.lista.every((l, i) => Math.abs(l.y - [178, 188, 198][i]) <= 0.3) && e.settled, 'a lista pousada no lugar; o menu aceita teclas', e.d.lista);
e = await em(10.2);
conferir(e.d.titulo.acesas === 10 && !e.d.titulo.olhos, '10,2 s: aceso inteiro, ainda sem os olhos', e.d.titulo);
e = await em(10.6);
conferir(e.d.titulo.olhos, '10,6 s: por último, os olhos', e.d.titulo);

// ── 3. Pular (§6.1) ──
await page.close();
page = await abrir();
await page.keyboard.press('KeyQ');
await page.waitForTimeout(300);
const pulo = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { settled: m.settled, pulou: m.estado.pulou, d: m.diagnostico() };
});
conferir(pulo.settled && pulo.pulou, 'uma tecla na abertura pula para o menu pousado', pulo);
conferir(pulo.d.titulo.acesas === 10 && pulo.d.titulo.olhos && pulo.d.jatos === 0, 'pulado: aceso, com os olhos, sem jatos', pulo.d);
await page.screenshot({ path: 'probe-menu.png' });

// ── 4. A lista e a condução (§7.2) ──
const tecla = async (k) => {
  await page.keyboard.press(k);
  await page.waitForTimeout(150);
};
const ler = () =>
  page.evaluate(() => {
    const m = window.__game.scene.getScene('Menu');
    return { cursor: m.cursorMenu, conducao: m.conducao, d: m.diagnostico() };
  });
await tecla('ArrowDown');
let l = await ler();
conferir(l.cursor === 1 && l.d.desc.alfa === 1 && l.d.desc.texto.includes('gravidade'), '↓ vai à condução, e a descrição aparece', l);
await tecla('ArrowRight');
l = await ler();
conferir(l.conducao === 'flap' && l.d.lista[1].texto.includes('LEGACY') && l.d.desc.texto.includes('flap'), '→ troca para LEGACY', l);
await tecla('ArrowRight');
conferir((await ler()).conducao === 'free', '→ de novo: LIVRE', null);
await tecla('Enter');
conferir((await ler()).conducao === 'diegetico', 'Enter na condução também avança (volta à DIEGÉTICA)', null);
await tecla('ArrowLeft');
await tecla('ArrowLeft');
conferir((await ler()).conducao === 'flap', '←← volta até LEGACY', null);
await tecla('ArrowDown');
l = await ler();
conferir(l.cursor === 2 && l.d.desc.alfa === 0, '↓ vai ao ARQUIVO, e a descrição some', l);
await tecla('ArrowUp');
await tecla('ArrowUp');
conferir((await ler()).cursor === 0, '↑↑ volta ao COMEÇAR', null);
const guardada = await page.evaluate(() => localStorage.getItem('alienworld:conducao'));
conferir(guardada === 'flap', `a condução fica guardada (${guardada})`, guardada);

// ── 5. Lembrada ao abrir de novo, e o Enter começa com ela ──
await page.close();
page = await abrir();
conferir((await page.evaluate(() => window.__game.scene.getScene('Menu').conducao)) === 'flap', 'aberto de novo, o menu lembra a LEGACY', null);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(250);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 }).catch(() => {});
const jogo = await page.evaluate(() => ({ handling: window.__game.scene.getScene('Game')?.handling, cenaHD: !!window.__gameHD.scene.getScene('MenuHD') }));
conferir(jogo.handling === 'flap', `Enter em COMEÇAR começa com a condução escolhida (${jogo.handling})`, jogo);
conferir(!jogo.cenaHD, 'saindo do menu, a cena do cenário sai da camada', jogo);
await page.evaluate(() => localStorage.removeItem('alienworld:conducao'));

// ── 6. O atalho 1 começa direto, mesmo durante a abertura ──
await page.close();
page = await abrir();
await page.keyboard.press('Digit1');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 }).catch(() => {});
conferir(await page.evaluate(() => window.__game.scene.isActive('Game')), 'o 1 começa direto', null);

// ── 7. O relâmpago cai aos 2,4 s; com movimento reduzido, nunca (§4.3, §6.1) ──
await page.close();
page = await abrir();
await page.waitForFunction(() => window.__gameHD.scene.getScene('MenuHD')?.t > 2.7, null, { timeout: 60000 });
const comRaio = await page.evaluate(() => window.__gameHD.scene.getScene('MenuHD').cenario.relampagos());
conferir(comRaio >= 1, `o primeiro relâmpago caiu (${comRaio})`, comRaio);
await page.close();
page = await abrir({ reduzido: true });
await page.waitForFunction(() => window.__gameHD.scene.getScene('MenuHD')?.t > 2.7, null, { timeout: 60000 });
const rm = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { settled: m.settled, olhos: m.diagnostico().titulo.olhos, relampagos: window.__gameHD.scene.getScene('MenuHD').cenario.relampagos() };
});
conferir(rm.settled && rm.olhos, 'movimento reduzido: abre pousado e aceso', rm);
conferir(rm.relampagos === 0, 'movimento reduzido: nenhum relâmpago', rm);

// ── 8. A tela muda de escala (§8.1) ──
await page.close();
page = await abrir();
await page.keyboard.press('KeyQ');
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForFunction(() => window.__gameHD.canvas.width === 1920, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
const r5 = await page.evaluate(() => {
  const hd = window.__gameHD;
  const c = hd.scene.getScene('MenuHD');
  return { w: hd.canvas.width, zoom: c.cameras.main.zoom, escala: c.atm?.pipeline?.escala, neon: hd.textures.exists('letreiro-aceso-5') };
});
conferir(r5.w === 1920 && r5.zoom === 5 && r5.escala === 5, 'em 1920, s = 5: a câmera e a Atmosfera acompanham', r5);
conferir(r5.neon, 'o neon é gerado de novo para s = 5', r5);

// ── 9. Sem a camada HD (?semhd): o plano B (§8.3) ──
await page.close();
page = await abrir({ sufixo: '?semhd' });
const sem = await page.evaluate(() => {
  const m = window.__game.scene.getScene('Menu');
  return { hd: !!window.__gameHD, cenario: !!m.cenario, itens: m.diagnostico().lista.length, titulo: !!m.diagnostico().titulo };
});
conferir(!sem.hd && sem.cenario, 'sem a camada HD, o cenário roda no próprio menu (k1)', sem);
conferir(sem.itens === 2 && sem.titulo, 'a lista sem o ARQUIVO, e o título em texto', sem);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(300);
await page.screenshot({ path: 'probe-menu-semhd.png' });
await page.close();

await browser.close();
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log('telas: probe-menu.png, probe-menu-semhd.png');
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: rodar**

Run: `node scripts/probe-menu.mjs`
Expected: `TUDO OK`. Abra `probe-menu.png` (o menu pousado na camada HD) e `probe-menu-semhd.png` (o plano B em 384×216)
e olhe os dois.

- [ ] **Step 3: a sonda antiga sai** — `rm scripts/probe-menu-intro.mjs`

- [ ] **Step 4: o ARQUIVO agora é o 3º item** — em `scripts/probe-arquivo.mjs`:

o bloco `// ── O menu: a lista, e ↓ + Enter abre o Arquivo ──` passa a ser:

```js
// ── O menu: a lista (COMEÇAR, CONDUÇÃO, ARQUIVO), e ↓↓ + Enter abre o Arquivo ──
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150); // a tecla é processada no quadro seguinte
const cursor = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
conferir(cursor === 2, '↓↓ leva o cursor do menu ao ARQUIVO', cursor);
```

e, na volta:

```js
conferir(deVolta === 2, 'de volta, o cursor está no ARQUIVO (e o menu já montado)', deVolta);
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('Enter');
```

Em `scripts/_folha-arquivo.mjs`, depois do `await page.keyboard.press('ArrowDown');` que vem logo após o
`waitForFunction(... settled)`, acrescente outro `await page.keyboard.press('ArrowDown');`.

- [ ] **Step 5: as sondas de regressão**

Run: `node scripts/probe-arquivo.mjs`, `node scripts/probe.mjs`, `node scripts/probe-sandbox.mjs`,
`node scripts/probe-atmosfera-fases.mjs`, e os testes `node scripts/test-menu-abertura.mjs`,
`node scripts/test-menu-ritmos.mjs`, `node scripts/test-menu-letreiro.mjs`, `node scripts/test-atmosfera-perfis.mjs`.
Expected: todas passam como antes.

- [ ] **Step 6: checkpoint** — `npm run build` sem erro.

---

### Task 14: o filme do menu no jogo, e a folha dele

**Files:**
- Create: `scripts/_menu/_filmar-menu.mjs`
- Create: `docs/superpowers/folhas/2026-10-19/menu/no-jogo.html` e `no-jogo/` (o vídeo, os quadros, a tela cheia)

- [ ] **Step 1: `scripts/_menu/_filmar-menu.mjs`**

```js
// BLOCO E · the real menu (src/, not the mock), filmed on a stepped clock at 30 fps for his sheet: the opening and a
// stretch of the scenery after it (the storm, the searchlights, the Leviathan). The DEV shortcut lines are hidden.
//   node scripts/_menu/_filmar-menu.mjs <outDir> [segundos=24] [largura=1536]      (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { webm } from './_webm.mjs';

const [OUT, SEG = '24', LARG = '1536'] = process.argv.slice(2);
const W = Number(LARG);
const H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
// From the very start: both games asleep, the opening and the scenery clocks back to 0, the DEV lines hidden.
await page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD;
  g.loop.sleep();
  hd.loop.sleep();
  g.scene.getScene('Menu').estado.tAbertura = 0;
  hd.scene.getScene('MenuHD').t = 0;
  for (const cena of hd.scene.getScenes(true)) {
    for (const o of cena.children.list) if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
  }
  window.__relogio = performance.now();
});
const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const total = Math.round(Number(SEG) * 30);
const momentos = [2.5, 4, 5.5, 9.4, 10.6, 14].map((s) => Math.round(s * 30));
for (let i = 0; i < total; i++) {
  await page.evaluate(() => {
    const dt = 1000 / 30;
    window.__relogio += dt;
    window.__game.step(window.__relogio, dt);
    window.__gameHD.step(window.__relogio, dt);
  });
  const arq = path.join(QUADROS, `${String(i).padStart(4, '0')}.png`);
  await page.screenshot({ path: arq, clip });
  if (momentos.includes(i + 1)) fs.copyFileSync(arq, path.join(OUT, `t${((i + 1) / 30).toFixed(1)}.png`));
}
await browser.close();
await webm(QUADROS, path.join(OUT, 'menu.webm'), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(OUT, total, 'quadros');
```

- [ ] **Step 2: filmar**

Run: `node scripts/_menu/_filmar-menu.mjs docs/superpowers/folhas/2026-10-19/menu/no-jogo 24`
Expected: `… 720 quadros`, `menu.webm` e seis quadros `t2.5.png` … `t14.0.png`. Abra os quadros e compare com a
rodada 9 (`rodada9/abertura.webm`): o mesmo menu, agora saindo do jogo de verdade. Copie a página da tela cheia (ela
já aponta para `menu.webm`):
`cp docs/superpowers/folhas/2026-10-19/menu/rodada4/teste-tela.html docs/superpowers/folhas/2026-10-19/menu/no-jogo/teste-tela.html`.

- [ ] **Step 3: a folha `docs/superpowers/folhas/2026-10-19/menu/no-jogo.html`** — no mesmo estilo das rodadas (copie o
`<head>` de `rodada9.html`), com: o título *"Menu refeito · no jogo"*; o vídeo `no-jogo/menu.webm` com o link da tela
cheia; os seis quadros com a legenda do instante (o relâmpago aos 2,5 s; a queima aos 4 e 5,5 s; pousado aos 9,4 s;
os olhos aos 10,6 s; o menu em repouso aos 14 s); e um parágrafo: *"É o menu do jogo, não a maquete: o cenário mora
numa cena da camada HD, atrás do texto; tudo o que você aprovou nas nove rodadas está nos números de
`src/menu/numerosMenu.ts`."* Abra a folha no navegador.

---

### Task 15: a técnica do cenário vivo, documentada (pedido dele)

*"Crie um doc com a exata técnica usada para dar vida ao cenário do menu. Isso vai poder ser usado para qualquer coisa
depois, criar novos cenários de menu, fases etc."*

**Files:**
- Create: `docs/CENARIO-VIVO.md`

- [ ] **Step 1: escrever `docs/CENARIO-VIVO.md`** com este conteúdo (ajuste só o que a implementação mudou; os números
são os de `src/menu/numerosMenu.ts`):

````markdown
# O CENÁRIO VIVO — a técnica do menu (bloco E, 19/10/2026)

Como uma pintura parada vira um lugar vivo, tratado e com perigo no ar, sem que nenhum detalhe fique estranho. Foi
feito para o menu (spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`), e vale para qualquer cenário
pintado: um menu novo, o fundo de uma fase, uma cutscene. O código está em `src/menu/`; as ferramentas, em
`scripts/_menu/`.

## 0. O método (antes de qualquer código)

1. **A pintura é dele.** Ela entra inteira; o que muda é o que vive POR CIMA dela. Nada de redesenhar a pintura.
2. **Maquete no jogo, nunca no vácuo.** Cada rodada roda no próprio jogo, com o texto de verdade, filmada num relógio
   a passos (`scripts/_menu/_maquete2.mjs`, `_webm.mjs`) e mostrada numa folha HTML com vídeo. Ele julga olhando.
3. **Tudo é função do relógio.** Nenhum tween: o mesmo instante dá sempre o mesmo quadro (`ritmos.ts`, `abertura.ts`).
   Isso permite filmar, sondar (`irPara(t)`) e testar no Node.
4. **Um efeito de cada vez, e conferido ampliado.** Recorte ×3 de cada região antes de mostrar. Ele acha o que você
   não olhou: buraco escuro, luz atravessando parede, farol em descompasso.

## 1. As camadas (`scripts/_menu/_camadas.mjs`)

A pintura vira camadas numa densidade `k` (pixels de camada por pixel de jogo): 4 para a camada HD, 1 para 384×216.
Reduza do ORIGINAL uma vez só (lanczos3).

| Camada | Como |
|---|---|
| **céu** | a pintura de fundo, só onde a da frente é transparente (a "janela" que ele recorta para algo aparecer e sumir). Limpe o que vaza (as agulhas-fantasma). |
| **cidade** | a pintura da frente, com o alfa apertado (`smoothstep 0,25→0,6`): a borda semitransparente deixava o rabo do Leviatã aparecer através da ponta de uma torre. |
| **o que se move** | recorte com máscara (a nave) e remende o buraco com a textura vizinha (as nuvens 130 px ao lado). Se o recorte não se mexe, deixe-o PARADO no lugar pintado: o sobe-e-desce mostrava a nave desenhada por baixo. |
| **apagadas** | o estado apagado de cada luz que pisca (§2). |
| **água** | os pixels claros dentro de uma caixa, em N quadros com listras que descem 1 px por quadro (o loop fecha sozinho). |

O que passa por trás (o Leviatã) fica ENTRE o céu e a cidade: aparece só na janela.

## 2. As luzes

**Detectar.** Janela = quente (`r ≥ 105`, `r > b + 45`, `r > 1,12 g`) mais os núcleos branco-quentes encostados. Farol =
vermelho PURO (`r ≥ 130`, `g < 0,36 r`, `b < 0,4 r`), pequeno (≤ 4 px²) e contra o escuro. As armadilhas que custaram
rodadas:

- laranja saturado NÃO é farol (eram fachadas inteiras piscando como quadrados escuros);
- vermelho cercado de âmbar é parte da janela (uma porta acesa virava um borrão quando "o farol" apagava);
- vermelho dentro de luz (a escada de lava: 7–20% de pixels quentes no anel de 2K–3K px) é luz fixa — os faróis
  reais medem ≤ 4%;
- a luz de baixo de uma torre, mesmo alaranjada, é do farol (pisca com ele), se não está numa fileira acesa (deque).

**Apagar é tirar a luz da pintura.** Nunca escureça o pixel (vira um buraco preto com franja laranja). Preencha a luz
e a franja quente dela (K px; no farol, o halo vermelho de 3K) por DIFUSÃO a partir dos vizinhos que não mudam: atrás
da janela fica a parede, atrás do farol o céu. A peça apagada tem só os pixels que mudam (o resto transparente) e fica
DEBAIXO da névoa (a peça opaca por cima da bruma deixava um retângulo limpo).

**Piscar.** Janelas: algumas, sorteadas entre as pequenas, cada uma no seu ciclo (4–11 s, fora 0,4–2,6 s), um terço
com uma falha a 12 Hz antes de apagar. Faróis: 1,4 s acesos a cada 2,3 s; **os da mesma torre juntos** (≤ 3 px de lado,
≤ 14 de altura).

**Auditar.** `scripts/_menu/_auditar-luzes.mjs` mostra cada luz que pisca, acesa e apagada, recortada como o jogo
recorta. Rode sempre que assar de novo.

## 3. A vida

- **Tráfego**: luz EMBAÇADA (brilho macio 1,5× mais largo que alto, tremendo no ar), andando só no trecho VISÍVEL de
  cada deque (meça na pintura com régua), sumindo nos últimos 2,5 px de cada ponta. Linha que passa da ponta = luz
  atravessando parede.
- **Luzes de uma máquina**: posições relativas ao recorte; uma fileira que corre, umas que respiram, um farol.
- **Estrelas**: só onde a frente é transparente e o céu é escuro.
- **Um bicho ao longe**: pequeno, lento (45 s de travessia), atrás das camadas de frente, com um aro frio; em loop com
  uma pausa de céu vazio (nada de corte preto).

## 4. O volume (o tratamento das fases, além da Atmosfera)

- **Bruma em faixas** (a textura das fases, redesenhada na densidade): velocidades diferentes vendem o volume; as mais
  rápidas passam NA FRENTE das luzes; uma faixa na janela fica atrás da cidade e na frente do bicho.
- **Fachos frios** atravessando a névoa, vindos da fonte de luz da pintura (o planeta).
- **Volumetria**: um halo grande e macio respirando nas luzes mais fortes; um facho âmbar raro.
- **A Atmosfera** por cima de tudo isso, com perfil tirado da pintura (névoa = tons médio-escuros ×1,5 + toque frio;
  halo = média do âmbar aceso). Numa tela em `s×`, `uEscala = s` (a névoa e o halo medem em pixels do jogo).

## 5. O perigo

- **Holofotes**: cone macio aditivo, a lâmpada na base, em estruturas que existem; ângulo = varredura + vagueada mais
  lenta, cada um no seu relógio; nenhum atravessa uma torre (escolha a base e a faixa de ângulos para isso).
- **Tempestade**: o clarão acende cada pixel de nuvem pela PRÓPRIA claridade (as silhuetas da frente ficam escuras:
  contraluz), com queda a partir de um foco; três golpes por relâmpago (≤ 3 clarões/s); raio bifurcado em metade deles
  (o resto, "ar de distância"), recortado pela máscara do céu; a nuvem pesada rolando só sobre as nuvens (máscara
  BitmapMask) e acima dos telhados. As máscaras são assadas fora (`_tempestade.mjs`).
- **Hierarquia**: um evento por vez; o constante é lento e fraco; o forte é raro e curto; nada compete com o momento
  principal (nenhum relâmpago durante a entrada do letreiro).

## 6. O texto por cima

O texto, o título e os jatos moram na camada HD, fora do tratamento, nítidos (posições no pixel da tela: 1/s). Um
título que é objeto (o letreiro de neon) se gera das letras exatas da fonte do jogo (`letreiroPixels.ts`), na escala
da tela; acende letra por letra com a mesma falha das janelas da cidade.

## 7. Movimento de objeto com física (a nave-letreiro)

Defina a trajetória (a queima: `y = 1 − (1 − u)^2,4`, uma mola no fim; outra mola de lado) e derive a ACELERAÇÃO.
Cada bocal dispara com força proporcional à aceleração contra ele: a física comanda os jatos. Partícula: branca →
âmbar → vapor frio que cresce, freia no ar e herda parte da velocidade. Queima mais longa e suave: escale a referência
para manter a mesma pluma.

## 8. Para um cenário novo (um menu, o fundo de uma fase)

1. Peça a pintura com a janela recortada onde algo vai aparecer.
2. `_camadas.mjs <saída> <k>` (ajuste o recorte, a caixa do que se move, a caixa da água).
3. `_auditar-luzes.mjs` e corrija as regras de luz se algo apagar estranho.
4. Meça na pintura (com régua: `_pontes.png`, `_esq.png` nas folhas de 19/10) as pontes, as bases dos holofotes, a
   região da tempestade.
5. Os números num `numeros*.ts`; as peças (`vida`, `volume`, `perigo`) aceitam o contexto e devolvem `atualizar(t)`.
6. Maquete, filme, folha, ele olha. Só depois, o jogo.
7. Numa fase (384×216, k = 1), as mesmas peças rodam no mundo, abaixo das camadas de jogo; o tratamento já é o da
   fase.
````

- [ ] **Step 2: conferir** — releia o documento contra o código: cada número citado tem de bater com
`src/menu/numerosMenu.ts` e com `_camadas.mjs`.

---

### Task 16: os docs, o roadmap, o START, o commit e o push (pedido dele)

*"Quando terminar tudo: atualize os docs, atualize o roadmap, atualize o start para depois iniciarmos o restante dos
blocos numa nova sessão. Commita e pusha o que tiver que fazer."*

**Files:**
- Modify: `docs/HANDOFF.md` (o 🧭)
- Create: `docs/superpowers/plans/2026-10-19-blocos-f-a-j-START.md`
- Modify: `docs/ASSETS.md` (a pasta nova `public/sprites/menu/`)
- Modify: a memória (`roadmap-blocos-d-a-j.md`, `fundos-pintados-resolucao-nativa.md`, uma nova `cenario-vivo-tecnica.md`
  e o `MEMORY.md`)

- [ ] **Step 1: o 🧭 do `docs/HANDOFF.md`**

A frase de arranque passa a ser:

```markdown
> **"Leia o 🧭 do `docs/HANDOFF.md`. O bloco E fechou; vamos começar o bloco F (a frota e o minerador da F2). O START
> é `plans/2026-10-19-blocos-f-a-j-START.md`."**
```

Logo abaixo dela, um 📍 novo, acima do de 19/10 do bloco D:

```markdown
> 📍 **19/10 (noite) — O BLOCO E FECHOU: COMMITADO E EMPURRADO** (os hashes dos três commits da Step 6). O menu é a
> colônia de Kepler à noite, a pintura dele na resolução dela (a exceção aprovada à lei do 384×216), viva e tratada,
> com perigo no ar (a tempestade, os holofotes antiaéreos, a nave vasculhando), o Leviatã de 96 px em loop, o letreiro
> de neon que desce freando nos retrofoguetes e acende (os olhos por último) e a condução numa linha só (lembrada).
> Spec `specs/2026-10-19-menu-refeito-design.md`, plano `plans/2026-10-19-menu-refeito.md`, folhas
> `folhas/2026-10-19/menu/` (rodadas 2–9 e `no-jogo.html`). **A técnica do cenário vivo ficou documentada em
> `docs/CENARIO-VIVO.md`** (pedido dele: serve para os próximos menus, as fases e as cutscenes — use no G e no H).
```

No roadmap, a linha do **E** passa a ser:

```markdown
> - **E — o menu refeito** (✅ FECHADO 19/10, COMMITADO e EMPURRADO: a colônia de Kepler à noite, viva, com perigo e o
>   letreiro de neon; spec `specs/2026-10-19-menu-refeito-design.md`; a técnica em `docs/CENARIO-VIVO.md`). O próximo é o F.
```

e, no **I**, o *"o subtítulo do menu (vai com E)"* vira *"o subtítulo do menu (✅ resolvido no E: o REMASTERED
ficou como texto, acendendo depois do letreiro)"*. No **G** e no **H**, acrescente: *"A técnica do menu
(`docs/CENARIO-VIVO.md`) é o ponto de partida: camadas, luzes que apagam limpas, volume, perigo, tudo em função do
relógio."*

- [ ] **Step 2: o START dos blocos F–J** — `docs/superpowers/plans/2026-10-19-blocos-f-a-j-START.md`:

```markdown
# START — os blocos F a J (depois do menu)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md`. O bloco E fechou; vamos começar o bloco F."**
> O roadmap vivo é o 🧭 do HANDOFF; este START é o mapa de entrada da sessão.

## ▶️ COMEÇAR AQUI

1. Ler o 🧭 do `docs/HANDOFF.md` (o roadmap em blocos) e a memória `roadmap-blocos-d-a-j`.
2. Abrir o **bloco F** com as perguntas a ele ANTES de mexer (é jogabilidade: ele testa jogando):
   - **os batedores da frota (F2):** quantas naves por frota; o voo de NAVE (inclinar, curvar) no lugar da senóide;
     atirar contra ele sem punir (medir); a manobra de evasão; passar e sair pela esquerda se não forem abatidos; a
     hitbox das naves finas. ⚠️ O `batedor` também voa na F3: a mudança vale só para a F2?
   - **a rocha do elite minerador:** destoa e é grande demais — diminuir, ou prender a um canto ou a um pedaço maior
     de asteroide (arte nova), junto com o `asteroid` do item 7.
3. Depois do F, o **G** (a arte do cenário da F1: perguntar a referência da cordilheira ANTES de gerar; refazer arte e
   composição), o **H** (os efeitos de imersão por fase, só visuais), o **I** (os itens 9, 11 e 14 da análise de
   14/10; o 13 foi resolvido no E) e o **J** (o pós-processamento, por último).

## O que vem do bloco E e serve aqui

- **`docs/CENARIO-VIVO.md`** — a técnica completa do cenário vivo (camadas, luzes que apagam limpas, tráfego,
  volume, perigo, texto por cima, objetos com física, a auditoria). O G (as camadas da F1) e o H (mísseis caindo,
  meteoros, silhuetas ao fundo) partem dela.
- **As peças reutilizáveis** em `src/menu/`: `ritmos.ts` (o tempo das luzes, do tráfego, dos holofotes, do relâmpago),
  `texturas.ts` (o brilho, a bruma, o facho, o cone), `perigo.ts` (holofotes e tempestade), `acaso.ts` (o LCG).
- **As ferramentas** em `scripts/_menu/`: `_maquete2.mjs` (a maquete no jogo, filmada a passos), `_webm.mjs`,
  `_camadas.mjs`, `_tempestade.mjs`, `_auditar-luzes.mjs`, `_ver-cenario.mjs`, `_filmar-menu.mjs`.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele, nunca para `legacy`; GIFs, vídeos e os `concept art` da raiz
  fora do commit.
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; criatura animada nasce inteira
  no PixelLab; fundo pintado em 384×216 (o menu é a única exceção).
- Avaliar mecânica e efeito por vídeo/GIF em velocidade real.
```

- [ ] **Step 3: `docs/ASSETS.md`** — acrescente, na seção dos sprites (siga o formato da vizinha):

```markdown
- `public/sprites/menu/k4/` e `k1/` (bloco E, 19/10): o menu. As camadas da pintura dele (`ceu`, `cidade`,
  `apagadas`, `nave`, `cachoeira`), o Leviatã reduzido (`leviata.png`, 16 quadros), `dados.json` (as luzes, a nave,
  a água) e `tempestade/` (as máscaras dos clarões, dos raios e da nuvem). Geradas por `scripts/_menu/_camadas.mjs`,
  `_tempestade.mjs` e `_leviata-menor.mjs` a partir de `assets/raw/menu_inicial_transparente.png` e
  `Cidade-Fortaleza sob a Lua Colossal (1).png`. NÃO edite à mão: asse de novo e rode `_auditar-luzes.mjs`.
```

- [ ] **Step 4: a memória** (`C:\Users\Henrique\.claude\projects\C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater\memory\`):
  - `roadmap-blocos-d-a-j.md`: um parágrafo *"19/10 (noite): o E FECHOU, implementado (plano
    `plans/2026-10-19-menu-refeito.md`), commitado e empurrado; a técnica em `docs/CENARIO-VIVO.md`; o próximo é o F,
    START `plans/2026-10-19-blocos-f-a-j-START.md`"*; e a `description` do frontmatter passa a dizer E ✅.
  - `fundos-pintados-resolucao-nativa.md`: na exceção do menu, *"implementada em 19/10: a cena `MenuCenaHD` na camada
    HD, camadas em `public/sprites/menu/k4` com filtro LINEAR"*.
  - nova `cenario-vivo-tecnica.md` (type `reference`): *"a técnica do cenário vivo do menu está em
    `docs/CENARIO-VIVO.md` — use para menus novos, fases (G, H) e cutscenes"*, com `[[roadmap-blocos-d-a-j]]`.
  - `MEMORY.md`: uma linha para a nova, e a do roadmap atualizada (`E ✅ FECHADO, COMMITADO e EMPURRADO 19/10 → ▶️ F`).

- [ ] **Step 5: tudo verde antes do commit**

Run: `npm run build`, `node scripts/test-menu-abertura.mjs`, `node scripts/test-menu-ritmos.mjs`,
`node scripts/test-menu-letreiro.mjs`, `node scripts/test-atmosfera-perfis.mjs`, `node scripts/probe-menu.mjs`,
`node scripts/probe-arquivo.mjs`, `node scripts/probe.mjs`.
Expected: tudo passa. Se algo falhar, conserte antes; não commite vermelho.

- [ ] **Step 6: os três commits e o push** (autor só ele; sem `Co-Authored-By`, sem "Generated with")

```bash
git status --short   # confira: nada de concept art, .env.pixellab, *.webm, *.gif no que vai entrar

git add src/menu src/scenes/MenuScene.ts src/scenes/ArquivoScene.ts src/scenes/BootScene.ts src/scenes/BootHDScene.ts \
  src/uiHD.ts src/main.ts src/fonte.ts src/systems/atmosfera \
  public/sprites/menu public/sprites/menu-moon.png public/sprites/menu-logo-sheet.png \
  assets/raw/menu-moon-original.png assets/raw/menu-logo-sheet-original.png assets/raw/menu_inicial_transparente.png \
  "assets/raw/Cidade-Fortaleza sob a Lua Colossal (1).png" "assets/raw/Colônia Futurista Sob um Planeta Gigante.png"
git commit -m "feat(menu): o bloco E — a colônia de Kepler à noite

A pintura dele na resolução dela, numa cena da camada HD atrás do texto: viva (janelas e faróis que apagam limpos,
a cachoeira, o tráfego só nos deques, a nave parada com as luzes), com o volume das fases e a Atmosfera 'menu' (com
uEscala), e com perigo no ar (a tempestade, os holofotes antiaéreos, a nave vasculhando). O Leviatã de 96 px em loop.
O letreiro de neon desce freando nos retrofoguetes e acende; os olhos do W por último. A condução numa linha da lista,
lembrada entre sessões. Sem a camada HD, o mesmo cenário em 384×216. A lua e o emblema antigos viraram backup."

git add scripts/_menu scripts/test-menu-abertura.mjs scripts/test-menu-ritmos.mjs scripts/test-menu-letreiro.mjs \
  scripts/test-menu-letreiro-jogo.mjs scripts/test-atmosfera-perfis.mjs scripts/fixtures/menu scripts/probe-menu.mjs \
  scripts/probe-menu-intro.mjs scripts/probe-arquivo.mjs scripts/_folha-arquivo.mjs
git add -- docs/superpowers/folhas/2026-10-19/menu ':(exclude)*.webm' ':(exclude)*.gif'
git commit -m "chore(menu): as ferramentas, os testes e as folhas do bloco E (sem os vídeos)

As maquetes no jogo filmadas a passos (_maquete2, _webm), as camadas (_camadas, _tempestade, _leviata-menor), o
letreiro (_glifos, _letreiro), a auditoria das luzes, o filme do menu; os testes dos módulos puros e o gabarito do
neon; a sonda do menu reescrita (a antiga da abertura saiu) e a do Arquivo com o 3º item; as folhas das rodadas 1–9."

git add docs/superpowers/specs/2026-10-19-menu-refeito-design.md docs/superpowers/plans/2026-10-19-menu-refeito.md \
  docs/superpowers/plans/2026-10-19-blocos-f-a-j-START.md docs/CENARIO-VIVO.md docs/HANDOFF.md docs/ASSETS.md
git commit -m "docs: o bloco E fechado — a spec, o plano, a técnica do cenário vivo, o HANDOFF e o START dos blocos F–J"

git push origin feat/cartas-preview
git log --oneline -4
```

Expected: três commits novos no topo, o push aceito. Ponha os hashes no 📍 do Step 1 (um quarto commit `docs:` pequeno
só com essa troca, empurrado também).

---

## Self-review (feito ao escrever)

- **Cobertura da spec:** §2 camadas → Task 7; §3.1 → Tasks 3 e 8; §3.2–3.4 → Tasks 3 e 9; §3.5 → Task 10; §4 → Tasks 3
  e 11; §5 → Task 6; §6.1–6.4 → Tasks 2 e 12; §6.5 → Tasks 4, 5 e 12; §7 → Task 12; §8.1–8.2 → Tasks 7, 8 e 12; §8.3 →
  Task 12 (`?semhd` na sonda); §8.4 → Tasks 7 e 12; §9 → Task 13. Os pedidos finais dele → Tasks 15 e 16.
- **Nomes que atravessam tasks:** `EstadoMenu` (`tAbertura`, `pulou`, `reduzido`, `pronto`, `congelado`),
  `Cenario.criar(scene, k, prefixo, estado, profundidadeVeu)`, `CHAVE_MENU_HD = 'MenuHD'`, `cenaDeFundoHD`,
  `removerCenaHD`, `carregarCamadasMenu`, `gerarLetreiro`, `particulasDosJatos`, `irPara`, `diagnostico` — conferidos.

