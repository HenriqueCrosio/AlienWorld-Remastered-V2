# Fatia 6 — Cutscene 3, o hangar do Leviatã: plano de implementação

> **Para quem executa:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans`, tarefa a tarefa. Os passos usam `- [ ]` para marcação.

**Objetivo:** dar um LUGAR à cutscene 3 — a pintura do Henrique no lugar do azulejo repetido, a
nadadeira peitoral atravessando as janelas, as carcaças da frota engolida no convés, e o portão
que sela a saída.

**Arquitetura:** a pintura é um asset novo (`paintBgCut3`) desenhado como UMA imagem 384×216 em
`y=0`, substituindo as duas cópias de `hangar.png` **dentro da cutscene apenas**. As janelas dela
são vazadas por preenchimento a partir de sementes (não por limiar global). A nadadeira vive numa
profundidade entre a nebulosa e a pintura, então as janelas a recortam sozinhas. Carcaças e portão
são props gerados, plantados com a régua do `TerrainSystem` da Fase 3.

**Ferramentas:** TypeScript + Phaser 3, `sharp` para arte, Playwright para as sondas, PixelLab MCP
para gerar.

**Spec:** `docs/superpowers/specs/2026-09-01-cutscene3-visual-design.md`

## Restrições globais

- ⚠️ **`public/sprites/hangar.png` NÃO PODE SER MODIFICADO NEM APAGADO.** Ele é a parede de fundo
  da **Fase 4** (`Parallax` modo `interior`). Esta fatia é a 6; a Fase 4 é a 7.
- ⚠️ **Commits são de autoria só do Henrique** — sem `Co-Authored-By`.
- ⚠️ **Mensagens de commit sem acentos** (convenção do repositório).
- ⚠️ **Offsets de arte se MEDEM, nunca se chutam** (lição 13). Todo número novo desta fatia sai de
  medição no PNG instalado, e é CONFERIDO marcando-o na arte antes de entrar no código.
- ⚠️ **Movimento é tween; textura é o que se gera.** O v3 do PixelLab lê "bater para cima e para
  baixo" como "girar".
- ⚠️ **Sonda de tempo real se roda UMA POR VEZ** — três browsers headless no mesmo Vite quebram.
- O dev server: `npm run dev` (porta 5173). A cutscene abre com **`P`** no menu.
- Verificação de cada tarefa: `npm run typecheck` limpo + a sonda da tarefa verde + **a tira de
  quadros olhada**. Captura parada não julga movimento; sonda que passa não prova que está bom.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `scripts/vazar-por-sementes.mjs` | **criar** — vaza regiões por preenchimento a partir de sementes |
| `scripts/instalar-cut3.mjs` | **criar** — o pipeline da pintura: vazar → reduzir → instalar |
| `public/sprites/paint-bg-cut3.png` | **criar** — 384×216, o fundo da cutscene |
| `public/sprites/nadadeira.png` | **criar** — a nadadeira peitoral |
| `public/sprites/carcaca-{1,2,3}.png` | **criar** — os destroços da frota engolida |
| `public/sprites/portao-hangar.png` | **criar** — a comporta que sela |
| `src/scenes/BootScene.ts` | **modificar** — registrar os assets novos |
| `src/scenes/Interlude3Scene.ts` | **modificar** — a parede, a nadadeira, as carcaças, o portão |
| `scripts/_cut3/probe-cut3-visual.mjs` | **criar** — a sonda da fatia |
| `scripts/_cut3/ver-cena.mjs` | já existe — a tira de quadros |

---

## Task 1: A pintura entra vazada e na resolução do jogo

**Arquivos:**
- Criar: `scripts/vazar-por-sementes.mjs`
- Criar: `scripts/instalar-cut3.mjs`
- Criar: `public/sprites/paint-bg-cut3.png`
- Modificar: `src/scenes/BootScene.ts`

**Interfaces:**
- Produz: a chave de textura `paintBgCut3`, 384×216, com as cinco janelas em alpha 0.

- [ ] **Passo 1: escrever o vazador por sementes**

O key global por cor abriria buracos na parede (20,5% dela cai na faixa neutra — medido). Semente
dentro de cada janela, alastrando só por pixels que casam.

Criar `scripts/vazar-por-sementes.mjs`:

```js
// VAZA regiões de um PNG por PREENCHIMENTO A PARTIR DE SEMENTES.
//
// ⚠️ POR QUE NÃO UM KEY GLOBAL POR COR. Medido na pintura do hangar: as janelas são cinza neutro
// (luminância 73, saturação 0,8) e 100% delas casa com o teste — mas 20,5% da PAREDE cai na mesma
// faixa. Um key global abriria buracos nas vísceras. Pixel de parede que por acaso casa não está
// CONECTADO a janela nenhuma, então o preenchimento não o alcança.
//
// ⚠️ E APERTAR O LIMIAR NÃO É A SAÍDA: apertar até a parede sobreviver comeria a BORDA das
// janelas — e é na borda que a nadadeira aparece recortada.
//
// uso: node scripts/vazar-por-sementes.mjs <entrada.png> <saida.png> <x,y> [<x,y> ...]
import sharp from 'sharp';

const [entrada, saida, ...sementes] = process.argv.slice(2);
if (!entrada || !saida || !sementes.length) {
  console.error('uso: node scripts/vazar-por-sementes.mjs <in.png> <out.png> <x,y> [<x,y> ...]');
  process.exit(1);
}

const { data, info } = await sharp(entrada)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** O cinza do xadrez: NEUTRO e de luminância média. Medido: janelas 73/0,8; convés 44/13,2. */
const casa = (i) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const L = lum(r, g, b);
  return sat <= 12 && L >= 45 && L <= 105;
};

const visto = new Uint8Array(W * H);
const fila = [];
for (const s of sementes) {
  const [sx, sy] = s.split(',').map(Number);
  const i = sy * W + sx;
  if (!casa(i)) {
    console.error(`semente ${sx},${sy} NAO casa com o cinza do xadrez — confira a coordenada`);
    process.exit(1);
  }
  fila.push(i);
  visto[i] = 1;
}

let n = 0;
while (fila.length) {
  const i = fila.pop();
  n++;
  data[i * 4 + 3] = 0;
  const x = i % W, y = (i / W) | 0;
  const vizinhos = [];
  if (x > 0) vizinhos.push(i - 1);
  if (x < W - 1) vizinhos.push(i + 1);
  if (y > 0) vizinhos.push(i - W);
  if (y < H - 1) vizinhos.push(i + W);
  for (const v of vizinhos) if (!visto[v] && casa(v)) { visto[v] = 1; fila.push(v); }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(saida);
console.log(`${saida}: ${n}px vazados de ${W}x${H} (${(n / (W * H) * 100).toFixed(1)}%)`);
```

- [ ] **Passo 2: achar as cinco sementes, medindo**

Rodar, para listar os centros das regiões neutras grandes:

```bash
node -e "
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('assets/raw/paint-bg-cut3-original.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:W,height:H}=info;
 const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
 const casa=i=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
  const s=Math.max(r,g,b)-Math.min(r,g,b);const L=lum(r,g,b);
  return s<=12&&L>=45&&L<=105;};
 const visto=new Uint8Array(W*H);
 const regioes=[];
 for(let i=0;i<W*H;i++){
  if(visto[i]||!casa(i))continue;
  const fila=[i];visto[i]=1;let n=0,sx=0,sy=0,x0=1e9,x1=-1;
  while(fila.length){const j=fila.pop();n++;const x=j%W,y=(j/W)|0;sx+=x;sy+=y;
   if(x<x0)x0=x;if(x>x1)x1=x;
   const v=[];if(x>0)v.push(j-1);if(x<W-1)v.push(j+1);if(y>0)v.push(j-W);if(y<H-1)v.push(j+W);
   for(const k of v)if(!visto[k]&&casa(k)){visto[k]=1;fila.push(k);}}
  if(n>2000)regioes.push({n,cx:Math.round(sx/n),cy:Math.round(sy/n),x0,x1});
 }
 regioes.sort((a,b)=>a.cx-b.cx);
 console.log('regioes neutras com mais de 2000px:');
 for(const r of regioes)console.log('  semente '+r.cx+','+r.cy+'   '+r.n+'px   x='+r.x0+'..'+r.x1);
})();"
```

Esperado: **cinco** regiões, da esquerda para a direita. Anotar as cinco sementes.

⚠️ Se aparecerem mais de cinco, as extras são manchas neutras da parede — **não** as use como
semente. Se aparecerem menos de cinco, alguma janela tem tom diferente: afrouxe o `casa()` só o
suficiente e re-meça.

- [ ] **Passo 3: escrever o instalador da pintura**

Criar `scripts/instalar-cut3.mjs` (as cinco sementes do Passo 2 entram aqui, com as coordenadas
reais no lugar das do exemplo):

```js
// INSTALA a pintura do hangar da cutscene 3: vaza as janelas e reduz para a resolução do jogo.
//
// ⚠️ ELA NÃO SUBSTITUI O `hangar.png`. Aquele arquivo é a parede de fundo da FASE 4 (Parallax
// modo `interior`), e a Fase 4 é a Fatia 7. Esta pintura entra como asset NOVO.
//
// ⚠️ A REDUÇÃO SAI DO ORIGINAL DE 1672x940, nunca de uma versão já reduzida — a lição do Zero-G:
// sem original guardado, um passo de reamostragem a mais custa DETALHE e o Henrique reprova.
//
// uso: node scripts/instalar-cut3.mjs
import { execFileSync } from 'node:child_process';

const ORIG = 'assets/raw/paint-bg-cut3-original.png';
const VAZADA = 'assets/raw/paint-bg-cut3-vazada.png';
const SAIDA = 'public/sprites/paint-bg-cut3.png';

/** As cinco janelas, MEDIDAS (ver o plano, Task 1 passo 2). Da esquerda para a direita. */
const SEMENTES = ['130,380', '330,380', '850,380', '1340,380', '1560,380'];

execFileSync('node', ['scripts/vazar-por-sementes.mjs', ORIG, VAZADA, ...SEMENTES], {
  stdio: 'inherit',
});
execFileSync('node', ['scripts/paint-bg.mjs', VAZADA, SAIDA, '384', '216'], { stdio: 'inherit' });
console.log(`${SAIDA} pronto`);
```

- [ ] **Passo 4: rodar e CONFERIR o vazamento medindo**

```bash
node scripts/instalar-cut3.mjs
node -e "
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:W,height:H}=info;
 const reg=(nome,x,y,w,h)=>{let t=0,n=0;
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){n++;if(data[((y+dy)*W+(x+dx))*4+3]<20)t++;}
  console.log(nome.padEnd(22),(t/n*100).toFixed(1)+'% transparente');};
 console.log('pintura',W+'x'+H);
 reg('janela central',185,80,30,30);
 reg('janela esq 1',18,64,18,40);
 reg('janela dir 2',350,64,18,40);
 reg('PAREDE/visceras',55,25,30,30);
 reg('CONVES',160,158,50,10);
 reg('faixa de perigo',160,171,50,4);
})();"
```

Esperado: **384x216**; janelas perto de **100%**; parede, convés e faixa em **0,0%**.

⚠️ Se a parede acusar transparência, uma semente estava fora de janela ou o `casa()` está frouxo
demais. **Não siga** — volte ao passo 2.

- [ ] **Passo 5: registrar no BootScene**

Em `src/scenes/BootScene.ts`, junto das outras pinturas (perto de `paintBgCut2`):

```ts
  // ⚠️ A PINTURA DO HANGAR DA CUTSCENE 3 — asset NOVO, e ela NÃO substitui o `hangar.png`.
  // Aquele arquivo é também a parede de fundo da FASE 4 (`Parallax` modo `interior`): trocá-lo
  // faria a Fatia 6 mudar a Fase 4 sem ninguém pedir, e a Fase 4 é a Fatia 7. A mesma lei que o
  // cooldown dos canhões já custou nesta campanha.
  //
  // As cinco janelas são vazadas por `scripts/instalar-cut3.mjs` (preenchimento a partir de
  // sementes, nunca limiar global — 20,5% da parede cai na mesma faixa neutra do xadrez).
  paintBgCut3: 'sprites/paint-bg-cut3.png',
```

- [ ] **Passo 6: typecheck e commit**

```bash
npm run typecheck
git add scripts/vazar-por-sementes.mjs scripts/instalar-cut3.mjs public/sprites/paint-bg-cut3.png assets/raw/paint-bg-cut3-original.png assets/raw/paint-bg-cut3-vazada.png src/scenes/BootScene.ts
git commit -m "feat(fatia6): a pintura do hangar entra vazada e na resolucao do jogo

O PNG do Henrique chegou com 3 canais, SEM alpha: o xadrez das janelas estava
pintado como pixels cinza opacos -- a armadilha que os instaladores do projeto ja
documentam (licoes 16-17), desta vez vinda da exportacao.

O key foi medido antes de ser escrito. Janelas: luminancia 73, saturacao 0,8.
Conves (44 / 13,2) e faixa de perigo (24 / 22,5) estao a salvo. Mas 20,5% da
PAREDE cai na mesma faixa neutra, entao key global por cor abriria buracos nas
visceras -- e apertar o limiar comeria a BORDA das janelas, que e onde a
nadadeira vai aparecer recortada.

Por isso o vazador novo preenche a partir de SEMENTES: pixel de parede que por
acaso casa nao esta conectado a janela nenhuma.

A reducao saiu do original de 1672x940, nunca de uma versao ja reduzida -- a
licao do Zero-G desta mesma sessao.

E ela NAO substitui o hangar.png, que e a parede de fundo da Fase 4."
```

---

## Task 2: A parede vira a pintura, e o convés é re-medido

**Arquivos:**
- Modificar: `src/scenes/Interlude3Scene.ts:207-234` (`construirHangar`) e as constantes em `:65-100`
- Criar: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consome: a textura `paintBgCut3` da Task 1.
- Produz: `Interlude3Scene.DECK_Y` re-medido; a cena passa a ter UMA imagem de fundo nomeada
  `paredeCut3`, que as sondas usam para agarrar.

- [ ] **Passo 1: MEDIR a linha do convés na pintura**

O `DECK_ROW = 138` e o `DECK_Y = 150` de hoje são do `hangar.png`. A faixa de perigo amarela e
preta é a marca mais legível da pintura — ache a linha dela:

```bash
node -e "
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:W,height:H}=info;
 // AMARELO da faixa de perigo: quente e saturado.
 console.log('linha  px amarelos');
 for(let y=0;y<H;y++){let n=0;
  for(let x=0;x<W;x++){const p=(y*W+x)*4,r=data[p],g=data[p+1],b=data[p+2];
   if(data[p+3]>200&&r>110&&g>85&&b<70&&r-b>60)n++;}
  if(n>20)console.log(String(y).padStart(5),n);}
})();"
```

Esperado: uma faixa contígua de linhas. **O topo dela é o `DECK_ROW` novo** — a linha onde a nave
encosta.

⚠️ **CONFERIR MARCANDO, nunca só o número.** Desenhe a linha na pintura e olhe:

```bash
node -e "
const sharp=require('sharp');
const L=Number(process.argv[1]);
const S='scripts/_cut3/';
(async()=>{
 const Z=3,W=384*Z,H=216*Z;
 const base=await sharp('public/sprites/paint-bg-cut3.png').resize(W,H,{kernel:'nearest'}).toBuffer();
 const svg='<svg width=\"'+W+'\" height=\"'+H+'\" xmlns=\"http://www.w3.org/2000/svg\">'+
  '<line x1=\"0\" y1=\"'+(L*Z)+'\" x2=\"'+W+'\" y2=\"'+(L*Z)+'\" stroke=\"#00ff88\" stroke-width=\"2\"/>'+
  '<text x=\"6\" y=\"'+(L*Z-6)+'\" fill=\"#00ff88\" font-size=\"18\">DECK_Y '+L+'</text></svg>';
 await sharp({create:{width:W,height:H,channels:4,background:{r:10,g:14,b:24,alpha:1}}})
  .composite([{input:base},{input:Buffer.from(svg)}]).png().toFile(S+'conves-medido.png');
 console.log(S+'conves-medido.png');
})();" <A_LINHA_MEDIDA>
```

Abra `scripts/_cut3/conves-medido.png` e confirme que a linha cai **no topo da faixa de perigo**.

- [ ] **Passo 2: escrever o assert que ainda FALHA**

Criar `scripts/_cut3/probe-cut3-visual.mjs`:

```js
// A FATIA 6 na tela. Cobre a pintura, a fronteira com a Fase 4, a nadadeira, as carcaças e o
// portão. Roda UMA POR VEZ (três browsers no mesmo Vite quebram).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', naveId: 'arauto' });
});
await page.waitForTimeout(1500);

const cena = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (n) => s.children.list.filter((o) => o.name === n);
    const p = acha('paredeCut3')[0];
    return {
      key: s.scene.key,
      parede: p ? { tex: p.texture.key, x: Math.round(p.x), y: Math.round(p.y), w: p.width, h: p.height } : null,
      // Quantas imagens ainda usam a arte da FASE 4 nesta cena.
      usamHangar: s.children.list.filter((o) => o.texture && o.texture.key === 'hangar').length,
    };
  });

const c = await cena();
console.log('cena  ', JSON.stringify(c));
ok(c.key === 'Interlude3', 'a cutscene 3 abriu');
ok(!!c.parede, 'a parede da cena existe e tem nome (paredeCut3)');
if (c.parede) {
  ok(c.parede.tex === 'paintBgCut3', `a parede e a PINTURA (${c.parede.tex})`);
  ok(c.parede.w === 384 && c.parede.h === 216, `em 384x216 (${c.parede.w}x${c.parede.h})`);
  ok(c.parede.x === 0 && c.parede.y === 0, `ancorada em 0,0 (${c.parede.x},${c.parede.y})`);
}
ok(c.usamHangar === 0, `nenhuma imagem da cena usa mais o 'hangar' da Fase 4 (${c.usamHangar})`);

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
```

- [ ] **Passo 3: rodar e ver FALHAR**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: falha em *"a parede da cena existe e tem nome"* — ela ainda não existe.

- [ ] **Passo 4: trocar a parede pela pintura**

Em `src/scenes/Interlude3Scene.ts`, substituir o corpo de `construirHangar()` (as duas
`add.image('hangar')` e o retângulo do piso) por:

```ts
  private construirHangar(): void {
    // ⚠️ UMA IMAGEM, NÃO DUAS CÓPIAS ESPELHADAS. A parede era `hangar.png` (160×160) desenhado
    // duas vezes a 1,5× — e a repetição se via: o mesmo arco/janela/pilar quatro vezes na tela.
    // A pintura é um quadro largo e assimétrico de 384×216: 1px de arte = 1px de jogo, sem
    // emenda para esconder.
    //
    // ⚠️ E O `hangar.png` CONTINUA EXISTINDO, intocado: ele é a parede de fundo da FASE 4
    // (`Parallax` modo `interior`), que é a Fatia 7. Esta cena só deixou de usá-lo.
    //
    // O piso desenhado por trás também saiu: a pintura entrega o convés, a faixa de perigo e a
    // banda de baixo dela mesma.
    this.add
      .image(0, 0, 'paintBgCut3')
      .setOrigin(0, 0)
      .setDepth(Interlude3Scene.DEPTH_HANGAR)
      // O nome é o que a sonda tem para agarrar.
      .setName('paredeCut3');
  }
```

E atualizar as constantes de geometria (`DECK_Y` recebe a linha MEDIDA no passo 1):

```ts
  // ─── A GEOMETRIA DO HANGAR — medida na PINTURA (384×216), não mais no `hangar.png` ───
  //
  // ⚠️ OS NÚMEROS ANTIGOS ERAM DA OUTRA ARTE. `ART_W/ART_H` (160), `SCALE` (1,5), `HANGAR_X`
  // (264), `WALL_ROW` (97) e `DECK_ROW` (138) descreviam o azulejo de 160px desenhado duas vezes.
  // A pintura é 1:1 com a tela, então só sobra a linha do convés.
  //
  // `DECK_Y` é o TOPO DA FAIXA DE PERIGO amarela e preta, medida por cor na pintura instalada e
  // conferida marcando a linha na arte (scripts/_cut3/conves-medido.png). É onde a nave encosta.
  private static readonly DECK_Y = <A_LINHA_MEDIDA>;
```

⚠️ Remover `ART_W`, `ART_H`, `SCALE`, `HANGAR_X`, `WALL_ROW`, `DECK_ROW` e o getter `hangarY`
**só depois** de o `typecheck` apontar quem mais os usa — e corrigir cada uso para o `DECK_Y` novo.

- [ ] **Passo 5: rodar a sonda e ver PASSAR**

```bash
npm run typecheck
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: os cinco asserts verdes.

- [ ] **Passo 6: a regressão da FASE 4 — a fronteira que esta fatia não atravessa**

```bash
node -e "
const fs=require('fs');const b=fs.readFileSync('public/sprites/hangar.png');
console.log('hangar.png:', b.readUInt32BE(16)+'x'+b.readUInt32BE(20));" 
git status --short public/sprites/hangar.png
```

Esperado: **160x160** e **nenhuma linha** no `git status` — o arquivo não foi tocado.

Depois, a Fase 4 de ponta a ponta:

```bash
node scripts/probe-stage4.mjs
```

Esperado: verde, igual a antes.

- [ ] **Passo 7: OLHAR a cena**

```bash
node scripts/_cut3/ver-cena.mjs
```

Abra `scripts/_cut3/cena-hoje.png`. Confirme: a repetição sumiu, a nave **toca e para no convés**
(não flutuando nem enterrada), e a nebulosa aparece pelas cinco janelas.

⚠️ Se a nave estiver fora do convés, o `DECK_Y` está errado — volte ao passo 1. **Não ajuste no
olho**: re-meça.

- [ ] **Passo 8: commit**

```bash
git add src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): a parede do hangar vira a pintura, e o conves e re-medido

A parede era o hangar.png (160x160) desenhado duas vezes a 1,5x, e a repeticao se
via: o mesmo arco/janela/pilar quatro vezes na tela. Agora e a pintura do
Henrique, 384x216, 1px de arte = 1px de jogo.

O CONVES FOI RE-MEDIDO, nunca herdado. O DECK_ROW=138 e o DECK_Y=150 eram do
azulejo antigo; o novo saiu de achar a faixa de perigo por cor na pintura
instalada, e foi conferido marcando a linha na arte antes de entrar no codigo. E
a licao 13, que acabou de cobrar de novo na serpente -- o offset da boca da arte
antiga apontava para o lugar errado da nova.

E o hangar.png ficou INTOCADO: ele e a parede de fundo da Fase 4, que e a Fatia 7.
A sonda cobra que nenhuma imagem desta cena o use mais, e a probe-stage4 confirma
que a Fase 4 abre igual."
```

---

## Task 3: A nadadeira peitoral

**Arquivos:**
- Criar: `public/sprites/nadadeira.png`
- Modificar: `src/scenes/BootScene.ts`, `src/scenes/Interlude3Scene.ts`
- Modificar: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consome: `paredeCut3` e `DEPTH_HANGAR` da Task 2.
- Produz: `Interlude3Scene.nadadeira()`, e o objeto nomeado `nadadeiraCut3`.

- [ ] **Passo 1: gerar no PixelLab**

```
mcp__pixellab__create_1_direction_object(
  description: "dark sci-fi pixel art, limited 24-color palette, deep navy and near-black tones,
    hard edges, no anti-aliasing, no dithering gradients, transparent background, side view,
    retro arcade run-and-gun style, very dark, low contrast — the colossal pectoral fin of a
    biomechanical space leviathan seen from outside its hull, armored plating over a membrane
    stretched between long ribs, dark cold blue-grey with faint orange energy seams along the
    ribs, the root of the fin at the RIGHT edge and the tip pointing LEFT, horizontal, no body,
    no background",
  size: 128,
  view: "sidescroller"
)
```

⚠️ **NÃO peça animação.** O movimento é tween — o v3 lê "bater" como "girar".

- [ ] **Passo 2: escolher medindo, não na miniatura**

```bash
node scripts/_folha-contato.mjs <object-id> 4 3 scripts/_cut3/nadadeiras.png
```

Olhe a folha. Critérios, nesta ordem: (1) a silhueta lê como **nadadeira** e não como asa ou
folha; (2) ela é **larga na horizontal** — vai atravessar uma faixa de janelas; (3) o valor é
escuro o bastante para não brigar com a pintura, mas claro o bastante para aparecer contra a
nebulosa. Meça o contraste contra a nebulosa como o míssil da colônia foi medido.

Promover com `mcp__pixellab__select_object_frames` e instalar:

```bash
node scripts/install-sprite.mjs <object-id-promovido> - nadadeira
```

- [ ] **Passo 3: MEDIR a faixa das janelas na pintura**

A nadadeira só aparece pelas janelas — a altura e a escala dela se decidem contra a faixa que elas
ocupam, não no olho:

```bash
node -e "
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:W,height:H}=info;
 let y0=1e9,y1=-1;
 for(let y=0;y<H;y++){let n=0;
  for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]<20)n++;
  if(n>4){if(y<y0)y0=y;if(y>y1)y1=y;}}
 console.log('faixa das janelas: y='+y0+'..'+y1+'  (altura '+(y1-y0+1)+'px)');
 console.log('centro da faixa: y='+Math.round((y0+y1)/2));
})();"
```

- [ ] **Passo 4: escrever o assert que ainda FALHA**

Acrescentar ao `scripts/_cut3/probe-cut3-visual.mjs`, antes do bloco final:

```js
// ─── A NADADEIRA: uma remada só, da DIREITA para a ESQUERDA, e só o `x` se mexe ───
//
// ⚠️ O ASSERT COBRA A DIREÇÃO QUE O DESENHO EXIGE, NÃO A QUE O CÓDIGO ESCOLHEU. O assert do rabo
// cobrava `x2 < x1` e ficou VERDE em cima da versão que o Henrique reprovou, porque media a
// escolha de quem o escreveu. Aqui a direita→esquerda foi derivada da Fase 3 (o corpo do Leviatã
// está fora do quadro à direita, ele nada para a direita, a remada de força varre para trás) e
// CONFIRMADA por ele antes de uma linha ser escrita.
const nad = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const n = s.children.list.filter((o) => o.name === 'nadadeiraCut3')[0];
    const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
    return n
      ? { x: Math.round(n.x), y: Math.round(n.y), ang: Math.round(n.angle),
          alpha: +n.alpha.toFixed(2), depth: n.depth, depthParede: p ? p.depth : null }
      : null;
  });

let a = null;
for (let i = 0; i < 60 && !a; i++) { a = await nad(); if (!a) await page.waitForTimeout(200); }
ok(!!a, 'a nadadeira entra em cena');
if (a) {
  await page.waitForTimeout(1500);
  const b = await nad();
  console.log('nadadeira', JSON.stringify(a), '->', JSON.stringify(b));
  ok(!!b, 'ela ainda esta na tela 1,5s depois (a remada e lenta)');
  if (b) {
    ok(b.x < a.x, `ela varre da DIREITA para a ESQUERDA (${a.x} -> ${b.x})`);
    ok(b.y === a.y, `sem eixo Y — a saida e uma linha so (${a.y} -> ${b.y})`);
    ok(b.ang === a.ang, `sem giro (${a.ang}deg)`);
    ok(b.alpha === a.alpha && b.alpha === 1, `sem fade: alpha fica em 1 (${a.alpha} -> ${b.alpha})`);
    ok(b.depth < b.depthParede, `ela fica ATRAS da pintura (${b.depth} < ${b.depthParede}), entao so aparece pelas janelas`);
  }
}
```

- [ ] **Passo 5: rodar e ver FALHAR**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: falha em *"a nadadeira entra em cena"*.

- [ ] **Passo 6: registrar o asset e implementar a remada**

Em `BootScene.ts`, junto dos sprites:

```ts
  // ⚠️ A NADADEIRA PEITORAL do Leviatã (cutscene 3), ideia do Henrique: ela atravessa a faixa das
  // janelas mostrando que o bicho bate as nadadeiras nadando — e diz, sem banner, que você está
  // DENTRO de uma coisa viva em movimento.
  //
  // ⚠️ SÓ A TEXTURA É GERADA. A remada é tween: o v3 do PixelLab leu "bater para cima e para
  // baixo" como GIRAR e devolveu o rabo do Leviatã como hélice, nesta mesma campanha.
  nadadeira: 'sprites/nadadeira.png',
```

Em `Interlude3Scene.ts`, o método novo (`<CENTRO_DA_FAIXA>` é o número do passo 3):

```ts
  /**
   * A NADADEIRA PEITORAL — uma remada só, atravessando a faixa das janelas.
   *
   * ⚠️ ELA VIVE ATRÁS DA PINTURA, e é isso que faz a cena funcionar sem máscara nenhuma. Como as
   * cinco janelas são as ÚNICAS aberturas da pintura, a nadadeira só aparece por elas — o quadro
   * da janela a recorta sozinho, e esse recorte é exatamente o que vende que ela está do lado de
   * fora do casco.
   *
   * ⚠️ DIREITA → ESQUERDA, e a direção foi DERIVADA E CONFIRMADA, nunca assumida. A Fase 3 já
   * cravou que o corpo do Leviatã fica fora do quadro à direita e que ele nada no mesmo sentido
   * da nave; num bicho que nada para a direita, a remada de FORÇA varre para trás. Assumir esta
   * direção sem perguntar foi o que reprovou quatro versões do rabo.
   *
   * ⚠️ E É UMA LINHA SÓ: O `x`. Sem `y`, sem `angle`, sem `alpha`. Cada eixo extra que entrou nas
   * tentativas do rabo foi lido como o corpo se deformando ou se soltando.
   */
  private nadadeira(): void {
    if (!this.textures.exists('nadadeira')) return;

    const nad = this.add
      .image(GAME_WIDTH + 140, <CENTRO_DA_FAIXA>, 'nadadeira')
      .setDepth(Interlude3Scene.DEPTH_HANGAR - 1)
      .setName('nadadeiraCut3');

    this.tweens.add({
      targets: nad,
      x: -140,
      delay: 1200,
      duration: 6000,
      ease: 'Sine.easeInOut',
      // DESTRUIR, nunca deixar parada fora da tela: objeto esquecido é a armadilha que o preto do
      // casco e a sombra órfã do prop já documentaram.
      onComplete: () => nad.destroy(),
    });
  }
```

E chamar `this.nadadeira();` no `create()`, logo depois de `construirHangar()`.

- [ ] **Passo 7: rodar a sonda e ver PASSAR**

```bash
npm run typecheck
node scripts/_cut3/probe-cut3-visual.mjs
```

- [ ] **Passo 8: OLHAR a remada — sonda não julga movimento**

```bash
node scripts/_cut3/ver-cena.mjs
```

Abra a tira. Confirme: a nadadeira **aparece recortada pelas janelas** (nunca por cima da parede),
atravessa devagar, e some. ⚠️ Se ela passar por cima da pintura, o depth está errado. Se ela
sumir sem ser vista, a faixa das janelas foi mal medida — volte ao passo 3.

- [ ] **Passo 9: commit**

```bash
git add public/sprites/nadadeira.png src/scenes/BootScene.ts src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): a nadadeira do Leviata atravessa as janelas do hangar

Ideia do Henrique: 'ela vai passar lentamente entre as janelas, mostrando que o
leviata bate suas nadadeiras no seu nadar espacial'. Membro colossal atravessando
o quadro e a frase mais eficaz que esta campanha tem -- foi o rabo que salvou a
virada do casco depois de quatro tentativas reprovadas.

E ela sai quase de graca: vive numa profundidade ENTRE a nebulosa e a pintura, e
como as cinco janelas sao as unicas aberturas, so aparece por elas. O quadro da
janela a recorta sozinho, e esse recorte e o que vende que ela esta do lado de
fora. Nenhuma mascara, nenhum shader.

DIREITA -> ESQUERDA, derivada e CONFIRMADA antes de uma linha ser escrita: a Fase
3 ja cravou que o corpo fica fora do quadro a direita e que ele nada no mesmo
sentido da nave, e num bicho que nada para a direita a remada de forca varre para
tras. Assumir essa direcao sem perguntar reprovou quatro versoes do rabo.

E o assert cobra a direcao que o DESENHO exige, nao a que o codigo escolheu -- o
assert do rabo cobrava x2 < x1 e ficava verde em cima do defeito.

So a textura foi gerada; a remada e tween. O v3 le 'bater para cima e para baixo'
como GIRAR."
```

---

## Task 4: As carcaças da frota engolida

**Arquivos:**
- Criar: `public/sprites/carcaca-1.png`, `carcaca-2.png`, `carcaca-3.png`
- Modificar: `src/scenes/BootScene.ts`, `src/scenes/Interlude3Scene.ts`
- Modificar: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consome: `DECK_Y` (Task 2), `DEPTH_HANGAR` (Task 2).
- Produz: objetos nomeados `carcacaCut3` e `sombraCarcaca`.

- [ ] **Passo 1: gerar as três no PixelLab**

Uma chamada, com `item_descriptions` — assim elas saem como CONJUNTO, que foi o que salvou a
cordilheira da Fase 1:

```
mcp__pixellab__create_1_direction_object(
  description: "dark sci-fi pixel art, limited 24-color palette, deep navy and near-black tones,
    hard edges, no anti-aliasing, no dithering gradients, transparent background, side view,
    retro arcade run-and-gun style, very dark, low contrast — the wreck of a small human warship
    lying broken on a deck, half DIGESTED: hull plating peeled open, dark biomechanical flesh and
    cabling of a leviathan already growing over and through it, cold grey metal against wet dark
    red tissue, resting flat on its belly, no background, no ground line",
  item_descriptions: [
    "a broken gunship hull, cockpit crushed, one wing snapped upward",
    "a heavy carrier hull split across the middle, bay doors hanging open",
    "a small scout, mostly intact but wrapped in creeping flesh"
  ],
  size: 128,
  view: "sidescroller"
)
```

- [ ] **Passo 2: escolher e instalar**

```bash
node scripts/_folha-contato.mjs <object-id> 4 3 scripts/_cut3/carcacas.png
```

Critérios: as três têm que **ler como naves** (silhueta de casco, não pedra), e a luminância média
das três precisa ficar na mesma família — foi assim que as cristas da Fase 1 viraram conjunto (33
/ 34 / 35) e foi por isso que duas candidatas foram descartadas.

Promover as três e instalar:

```bash
node scripts/install-sprite.mjs <id-1> - carcaca-1
node scripts/install-sprite.mjs <id-2> - carcaca-2
node scripts/install-sprite.mjs <id-3> - carcaca-3
```

- [ ] **Passo 3: escrever o assert que ainda FALHA**

Acrescentar ao `probe-cut3-visual.mjs`:

```js
// ─── AS CARCAÇAS: plantadas, não enfileiradas, e fora do vão onde a nave para ───
const carc = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const cs = s.children.list.filter((o) => o.name === 'carcacaCut3');
  const so = s.children.list.filter((o) => o.name === 'sombraCarcaca');
  return {
    n: cs.length,
    sombras: so.length,
    pes: cs.map((o) => Math.round(o.y)),
    xs: cs.map((o) => Math.round(o.x)),
    depths: cs.map((o) => +o.depth.toFixed(3)),
  };
});
console.log('carcacas', JSON.stringify(carc));
ok(carc.n >= 3, `ha carcacas no conves (${carc.n})`);
ok(carc.sombras === carc.n, `uma sombra por carcaca (${carc.sombras}/${carc.n})`);
ok(new Set(carc.pes).size > 1, `elas NAO estao todas no mesmo y (${carc.pes.join(',')})`);
// ⚠️ A nave derrapa e PARA em x≈258, um vão escolhido a dedo na revisão de 2026-07-19 para ela
// não sumir dentro do metal cinza. Plantar uma carcaça ali refaria aquele defeito.
ok(carc.xs.every((x) => Math.abs(x - 258) > 40), `nenhuma carcaca no vao de parada da nave (${carc.xs.join(',')})`);
```

- [ ] **Passo 4: rodar e ver FALHAR**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: falha em *"ha carcacas no conves (0)"*.

- [ ] **Passo 5: registrar e plantar**

Em `BootScene.ts`:

```ts
  // ⚠️ AS CARCAÇAS DA FROTA ENGOLIDA (cutscene 3). O HANDOFF promete desde julho que "o hangar
  // guarda carcaças da frota engolida — a Frota Morta da F2, vista por dentro", e que o painel de
  // naves existe porque "você não compra uma nave, você SALVA uma nave irmã do cemitério". Até
  // 2026-09-01 isso só existia em comentário: no convés havia três borrões cinzas genéricos.
  carcaca1: 'sprites/carcaca-1.png',
  carcaca2: 'sprites/carcaca-2.png',
  carcaca3: 'sprites/carcaca-3.png',
```

Em `Interlude3Scene.ts`:

```ts
  /**
   * O PLANTIO DAS CARCAÇAS — a régua é a que a Fase 3 pagou (`TerrainSystem.PLANTIO`).
   *
   * ⚠️ PÉ SORTEADO COM SALTO MÍNIMO GARANTIDO POR CONSTRUÇÃO, nunca por probabilidade. Sorteio
   * uniforme puro dá dois vizinhos a 1px de diferença e a fila volta — o olho não compara uma
   * peça com a média da faixa, compara com a VIZINHA. A Fase 3 mediu isso: oito props saíram
   * entre 191 e 199 numa execução.
   *
   * ⚠️ E ELAS SÃO CENÁRIO: sem corpo físico, sem colisão. A nave derrapa e para em x≈258, um vão
   * escolhido a dedo na revisão de 2026-07-19 justamente para ela não parar dentro do monte de
   * metal e sumir. Plantar uma carcaça ali refaria aquele defeito — daí o `VAO_DA_NAVE`.
   */
  private static readonly CARCACAS = { fundo: -10, frente: 4, saltoMin: 4 } as const;
  private static readonly VAO_DA_NAVE = { x: 258, raio: 40 } as const;

  private plantarCarcacas(): void {
    const artes = ['carcaca1', 'carcaca2', 'carcaca3'].filter((k) => this.textures.exists(k));
    if (!artes.length) return;

    const { fundo, frente, saltoMin } = Interlude3Scene.CARCACAS;
    const xs = [64, 150, 330].filter(
      (x) => Math.abs(x - Interlude3Scene.VAO_DA_NAVE.x) > Interlude3Scene.VAO_DA_NAVE.raio,
    );

    let ultimo = 0;
    for (let i = 0; i < xs.length; i++) {
      // O salto mínimo é garantia de construção: sorteia dentro do que SOBRA, em vez de tentar de
      // novo até dar certo — laço de recusa com teto às vezes estoura e devolve altura repetida.
      let pe: number;
      if (ultimo === 0) {
        pe = Math.round(fundo + Math.random() * (frente - fundo));
      } else {
        const abaixo = Math.max(0, ultimo - saltoMin - fundo + 1);
        const acima = Math.max(0, frente - (ultimo + saltoMin) + 1);
        const n = Math.floor(Math.random() * (abaixo + acima));
        pe = n < abaixo ? fundo + n : ultimo + saltoMin + (n - abaixo);
      }
      ultimo = pe;

      const y = Interlude3Scene.DECK_Y + pe;
      const c = this.add
        .image(xs[i], y, artes[i % artes.length])
        .setOrigin(0.5, 1)
        // Quem está plantado mais à FRENTE (pé maior) desenha por cima. Sem isto, a ordem seria
        // decidida pela ordem de criação, ou seja, por acaso.
        .setDepth(Interlude3Scene.DEPTH_HANGAR + 1 + (pe - fundo) * 0.01)
        .setName('carcacaCut3');

      // A SOMBRA DE CONTATO: escurecimento puro, nunca glow — a regra do projeto é que o que está
      // perto do olho entra em sombra, jamais em luz. Ela tem que TRANSBORDAR a base (1,35 da
      // largura) e ficar 1px ABAIXO do pé: mais estreita que a peça, ela desenha inteira atrás do
      // dono e não sobra um pixel na tela. Foi assim na 1ª versão do prop de casco.
      const sombra = this.add
        .ellipse(c.x, y + 1, Math.round(c.displayWidth * 1.35), 6, 0x000000, 0.5)
        .setDepth(c.depth - 0.001)
        .setName('sombraCarcaca');
      c.once('destroy', () => sombra.destroy());
    }
  }
```

E chamar `this.plantarCarcacas();` no `create()`, depois de `construirHangar()`.

- [ ] **Passo 6: rodar a sonda e ver PASSAR**

```bash
npm run typecheck
node scripts/_cut3/probe-cut3-visual.mjs
```

- [ ] **Passo 7: OLHAR — o defeito que sonda nenhuma pega**

```bash
node scripts/_cut3/ver-cena.mjs
```

⚠️ A revisão de 2026-07-19 nesta MESMA cena pegou que a nave parava dentro do monte de carcaças e
sumia no metal cinza. Confirme na tira que **a nave continua legível onde ela para**, e que as
carcaças leem como naves e não como entulho.

- [ ] **Passo 8: commit**

```bash
git add public/sprites/carcaca-*.png src/scenes/BootScene.ts src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): as carcacas da frota engolida saem do comentario e entram na tela

O HANDOFF promete desde julho que 'o hangar guarda carcacas da frota engolida -- a
Frota Morta da F2, vista por dentro', e que o painel de naves existe porque 'voce
nao compra uma nave, voce SALVA uma nave irma do cemiterio'. No conves havia tres
borroes cinzas genericos.

Elas entregam quatro coisas: o segundo plano que a pintura (sendo fundo) nao tem,
a narrativa que so existia em comentario, o sentido do painel de naves, e
silhueta que o jogador reconhece da Fase 2.

O PLANTIO USA A REGUA QUE A FASE 3 PAGOU: pe sorteado com salto minimo garantido
POR CONSTRUCAO (sorteia dentro do que sobra, nunca laco de recusa com teto -- um
laco desses as vezes estoura e devolve altura repetida), sombra de contato
transbordando a base, e profundidade acompanhando o plantio.

E nenhuma cai no vao onde a nave para (x~258). Aquele vao foi escolhido a dedo na
revisao de 2026-07-19 justamente porque a nave sumia dentro do metal cinza -- e
plantar uma carcaca ali refaria o defeito que aquela revisao consertou."
```

---

## Task 5: O portão que sela a saída

**Arquivos:**
- Criar: `public/sprites/portao-hangar.png`
- Modificar: `src/scenes/BootScene.ts`, `src/scenes/Interlude3Scene.ts` (`selarBoca`)
- Modificar: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consome: `DEPTH_ENTULHO` (já existe, 72).
- Produz: objeto nomeado `portaoCut3`.

- [ ] **Passo 1: gerar no PixelLab**

```
mcp__pixellab__create_1_direction_object(
  description: "dark sci-fi pixel art, limited 24-color palette, deep navy and near-black tones,
    hard edges, no anti-aliasing, no dithering gradients, transparent background, side view,
    retro arcade run-and-gun style, very dark — a massive biomechanical blast door seen head on,
    interlocking armored plates that close like a sphincter, dark wet flesh and cabling gripping
    the metal ring, faint orange energy seams where the plates meet, CLOSED and sealed, tall
    rectangular shape, no background",
  size: 128,
  view: "sidescroller"
)
```

- [ ] **Passo 2: escolher e instalar**

```bash
node scripts/_folha-contato.mjs <object-id> 4 3 scripts/_cut3/portoes.png
node scripts/install-sprite.mjs <id-escolhido> - portao-hangar
```

- [ ] **Passo 3: escrever o assert que ainda FALHA**

Acrescentar ao `probe-cut3-visual.mjs`, no fim (a boca sela lá pelo fim da cena):

```js
// ─── O PORTÃO: a saída morre, e a cicatriz FICA ───
await page.waitForTimeout(6000);
const port = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const p = s.children.list.filter((o) => o.name === 'portaoCut3')[0];
  return p ? { x: Math.round(p.x), alpha: +p.alpha.toFixed(2), depth: p.depth } : null;
});
console.log('portao  ', JSON.stringify(port));
ok(!!port, 'o portao selou a saida');
if (port) {
  ok(port.x < 160, `e ele fecha a metade ESQUERDA, que e a boca (x=${port.x})`);
  ok(port.alpha === 1, 'ele esta solido, nao meio transparente');
}
```

- [ ] **Passo 4: rodar e ver FALHAR**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

- [ ] **Passo 5: registrar e implementar**

Em `BootScene.ts`:

```ts
  // ⚠️ O PORTÃO que sela a saída (cutscene 3). Esta é a 1ª cutscene da campanha em que a ponte
  // queimada é a SAÍDA — a Aurora e a Doca destruíam o lugar DE ONDE o jogador vinha; aqui ele é
  // ENGOLIDO. O beat merecia uma FORMA fechando, não um monte de entulho genérico.
  portaoHangar: 'sprites/portao-hangar.png',
```

Em `selarBoca()`, acrescentar o portão ANTES do entulho existente (o entulho continua caindo em
volta dele — o que muda é ter uma forma fechando):

```ts
    // ⚠️ O PORTÃO ENTRA PRIMEIRO E O ENTULHO CAI EM VOLTA. A ordem importa: uma comporta que
    // aparece depois do entulho leria como "surgiu do nada"; aparecendo antes, o entulho vira o
    // que ela ARRANCOU ao fechar.
    if (this.textures.exists('portaoHangar')) {
      const portao = this.add
        .image(80, Interlude3Scene.DECK_Y, 'portaoHangar')
        .setOrigin(0.5, 1)
        .setDepth(Interlude3Scene.DEPTH_ENTULHO)
        .setAlpha(0)
        .setName('portaoCut3');
      this.tweens.add({ targets: portao, alpha: 1, duration: 260, ease: 'Quad.easeIn' });
    }
```

- [ ] **Passo 6: rodar a sonda inteira e ver TUDO passar**

```bash
npm run typecheck
node scripts/_cut3/probe-cut3-visual.mjs
node scripts/probe-interlude3.mjs
```

- [ ] **Passo 7: a regressão da campanha**

Uma por vez:

```bash
node scripts/probe-stage3.mjs
node scripts/probe-stage4.mjs
node scripts/probe-chain.mjs
```

- [ ] **Passo 8: OLHAR a cena inteira**

```bash
node scripts/_cut3/ver-cena.mjs
```

- [ ] **Passo 9: build e commit**

```bash
npm run build
git add public/sprites/portao-hangar.png src/scenes/BootScene.ts src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): a saida do hangar morre atras de um portao, nao de entulho generico

Esta e a 1a cutscene da campanha em que a ponte queimada e a SAIDA: a Aurora e a
Doca destruiam o lugar DE ONDE o jogador vinha, aqui ele e ENGOLIDO. O beat
merecia uma FORMA fechando.

O portao entra PRIMEIRO e o entulho cai em volta dele. A ordem importa: uma
comporta que aparece depois do entulho leria como 'surgiu do nada'; aparecendo
antes, o entulho vira o que ela arrancou ao fechar."
```

---

## Fechamento da fatia

- [ ] Rodar `probe-f3-visual`, `probe-stage1-visual`, `probe-stage2` — uma por vez, sem regressão.
- [ ] Atualizar `docs/HANDOFF.md`: a Fatia 6 fechada na tabela do roadmap, e a seção das lições.
- [ ] **O veredicto é do Henrique, jogando** (`P` no menu). Sonda que passa não prova que a cena
      está boa — foi a revisão com o olho que pegou os quatro defeitos desta cena em julho.
