// BLOCO E · rodada 2 — the menu over HIS painting, alive: the sky behind, the Leviathan (B, smaller, baked) between,
// the cut-out city in front, and the life on it (window lights going off and on, red beacons blinking, the
// waterfall falling, traffic on the bridges, the hovering ship with its running lights, stars in the window), all
// under a menu profile of the Atmosfera. Nothing in src/ changes: the capture builds the stage in the page.
//
//   node scripts/_menu/_maquete2.mjs jogo <outDir> <k1Dir> <leviPng> [segundos=20]
//       → inside the real Menu scene, with the real text (HD layer) moved to the proposed layout
//   node scripts/_menu/_maquete2.mjs par <outDir> <k1Dir> <k4Dir> <leviPng> [segundos=20]
//       → two bare games in lockstep: the game resolution (384×216) and the painting at 4× (1536×864), no text
//   node scripts/_menu/_maquete2.mjs hd <outDir> <k4Dir> <leviHdPng> [segundos=48] [travessia=45]
//       → 19/10, his pick (the painting at its own resolution): the stage INSIDE the HD layer (s = 4, 1536×864),
//         under the real menu text; the Leviathan baked at that density (no game-pixel blocks), slower
//   node scripts/_menu/_maquete2.mjs abertura <outDir> <k4Dir> <leviHdPng> [segundos=16] [travessia=45] [letreiroDir base]
//       (round 7: with a lettering base from `_letreiro.mjs`, the base's images replace the Silkscreen title)
//       → 19/10, rounds 5–6: the hd stage plus the opening, at 30 fps — a few seconds of scenery alone; the title block
//         falls in as a craft, brakes on retro jets and corrects its drift with side puffs (a rocket's stabilizers);
//         the list drops after it; then the title lights up letter by letter (a placeholder for his lettering). The
//         condução is one line of the list; at the end the cursor visits it and cycles its three values
//
// Every motion is a pure function of the stepped clock `t` (no tweens), so both games show the same instant.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [MODO, OUT, ...resto] = process.argv.slice(2);
// par: each game gets the Leviathan baked for ITS density (the game one ×4 would be blocks on the fine painting).
const ARG = MODO === 'par' ? { k1: resto[0], k4: resto[1], levi: resto[2], leviHd: resto[3], seg: resto[4], trav: resto[5] }
  : MODO === 'hd' || MODO === 'abertura' ? { k4: resto[0], leviHd: resto[1], seg: resto[2], trav: resto[3], letreiro: resto[4], base: resto[5] }
    : { k1: resto[0], levi: resto[1], seg: resto[2], trav: resto[3] };
const K1 = ARG.k1, K4 = ARG.k4, SEG = Number(ARG.seg ?? 20);
// The opening goes at 30 fps (its jets and the fall are fast); the slow scenery at 10.
const QUADRO = 1000 / 60, POR_FOTO = MODO === 'abertura' ? 2 : 6;
fs.mkdirSync(OUT, { recursive: true });
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const camadas = (dir) => ({
  dados: JSON.parse(fs.readFileSync(path.join(dir, 'dados.json'), 'utf8')),
  img: Object.fromEntries(['ceu', 'cidade', 'apagadas', 'nave', 'cachoeira'].map((n) => [n, b64(path.join(dir, `${n}.png`))])),
});
const leviInfo = async (f) => { if (!f) return null; const m = await sharp(f).metadata(); return { src: b64(f), fw: m.width / 16, fh: m.height }; };
const LEVI_INFO = await leviInfo(ARG.levi);
const LEVI_HD = await leviInfo(ARG.leviHd);
// The treatment at 4×: the same Atmosfera, but its fog shapes and halo radius measured in GAME pixels (the same size
// on screen as in the game); the dither and the grain stay on the painting's own fine pixel.
const ATM_HD = { atmEscala: 4, leviEscala: 1, ponto: 2, volume: true, suave: true, perigo: MODO === 'abertura' };

// The menu profile of the Atmosfera: colours sampled from the painting (fog = mid-dark mean ×1.5 + the cold touch;
// halo = the mean of the lit amber), a cutscene-level density with the fog low in the valley, drifting slowly.
const PERFIL_MENU = {
  nome: 'menu',
  nevoa: { densidade: 0.75, cor: [42, 52, 67], altura: 2.2, velTras: [-3, 0], velFrente: [-8, 0], evolucao: 0.02 },
  halo: { forca: 0.3, limiar: 0.59, cor: [182, 120, 70] },
  grade: 1, gradeQuente: 1, vinheta: 0.55, grao: 0.6,
  poeira: { quantidade: 50, cor: [67, 83, 107], deriva: [-4, -1], espalhar: 2 },
};
// Game coordinates (k = 1). The crossing: out of the left cloud edge, behind the spires, in front of the planet.
const CENA = {
  travessia: { x0: 196, y0: 30, x1: 418, y1: 44, seg: 26 },
  // 19/10 (he): the traffic lights went THROUGH walls at the bridge ends. Each path now runs only along the deck that
  // shows (measured on the painting, on its lamp row) and fades in/out over its last `pontaFade` px: out of a gate,
  // behind a rock.
  pontes: [[70, 120.5, 145, 122.3], [58, 166, 112, 166], [127, 157.6, 157, 157.6], [277, 182.6, 342, 182.6], [332, 130.6, 346, 130.6]],
  pontaFade: 2.5,
  // 19/10 (he): "precisamos deixar uma impressão de perigo".
  perigo: {
    // The ship scans the colony: a searchlight from its keel sweeping the valley, two cold thrusters holding it up
    // (positions on its sprite, game px).
    nave: { holofote: [14.5, 11.2], comp: 75, largura: 22, alfa: 0.16, base: 92, amp: 26, per: 15, propulsores: [[8, 9.6], [19, 9.3]] },
    // Anti-aircraft searchlights searching the sky, on real structures (the dome's top, the terrace right of the tall
    // tower, the citadel's right terrace); none crosses a tower on its way up. Angles in degrees (−90 = straight up).
    holofotes: [
      { x: 26, y: 80, base: -98, amp: 16, per: 21, fase: 0, comp: 120 },
      { x: 52, y: 96, base: -80, amp: 13, per: 17, fase: 3.1, comp: 130 },
      { x: 300, y: 82, base: -84, amp: 14, per: 25, fase: 1.3, comp: 110 },
    ],
    feixe: { largura: 10, alfa: 0.14 },
    // The storm coming in over the mass of cloud he marked (a game-px polygon): flashes INSIDE the clouds, each pixel
    // lit by its own brightness (the dark silhouettes in front stay dark: backlit), a bolt now and then, cut by the
    // same mask (it runs behind the towers), and the heavier cloud rolling in.
    tempestade: {
      regiao: [[2, 10], [15, 2], [75, 1], [201, 6], [226, 12], [239, 33], [259, 48], [264, 65], [254, 80], [226, 100], [196, 110],
        [176, 105], [131, 103], [95, 110], [83, 116], [58, 114], [38, 105], [15, 90], [4, 75], [1, 38]],
      borda: 10,
      focos: [[60, 35, 85], [150, 28, 95], [215, 55, 70]], // [x, y, radius]: where each flash lights the mass
      raios: [[[36, 16], [104, 44]], [[142, 10], [196, 38]], [[206, 26], [168, 70]]], // the bolts, end to end
      // [t, focus, bolt (−1: none)]. 19/10, he: keep some flashes without a bolt — "aquele ar de distância".
      eventos: [[2.4, 0, 0], [12.2, 1, 1], [17.0, 2, -1], [21.0, 0, 2]],
      golpes: [[0, 1, 0.06], [0.11, 0.5, 0.05], [0.22, 0.9, 0.08]], // each flash: [offset, strength, length] strokes
      // rolar: the rolling cloud's opacity (×the mist texture's own ~0.3–0.5; at 0.35 it was a ~9% shade nobody saw).
      forca: 0.65, global: 0.05, rolar: 0.8,
    },
  },
  // The ship's own lights, relative to its sprite (from the original painting): the belly row chases, the lower ones
  // breathe, the top one is a red beacon.
  naveFileira: [[5, 7], [11, 7], [16, 7], [18, 7], [21, 7], [24, 7]],
  naveBaixo: [[7, 8], [9, 9], [17, 10]],
  naveTopo: [17, 3],
  layout: { titulo: [100, 15], sub: [100, 30], lista: [100, 42], rot: [192, 172], cond: [183, 194, 205] },
  // The VOLUME of the phases and cutscenes (game px; colours from the menu's cold fog [42, 52, 67]).
  volume: {
    // The phases' bruma: five bands drifting left at different speeds, low in the valley under the city (the two
    // fastest pass IN FRONT of the lights), plus a far one in the window: behind the city, in front of the Leviathan.
    longe: { y: 34, h: 72, tint: 0x3a4658, pico: 0.3, vel: 1.2 },
    bandas: [
      { y: 108, h: 70, tint: 0x2c3647, pico: 0.42, vel: 1.5, frente: false },
      { y: 126, h: 70, tint: 0x323d50, pico: 0.38, vel: 3, frente: false },
      { y: 144, h: 72, tint: 0x384558, pico: 0.34, vel: 5, frente: false },
      { y: 158, h: 76, tint: 0x262f3e, pico: 0.3, vel: 8, frente: true },
      { y: 172, h: 80, tint: 0x1d2531, pico: 0.24, vel: 12, frente: true },
    ],
    // The phases' fachos: faint cold light from the planet's lit limb (upper right), through the mist.
    fachos: [
      { x: 300, y: 72, escala: 2.0, pico: 0.18, deriva: 4, angulo: -32 },
      { x: 210, y: 122, escala: 2.4, pico: 0.15, deriva: 6, angulo: -30 },
      { x: 330, y: 150, escala: 1.6, pico: 0.13, deriva: 5, angulo: -34 },
    ],
    // Cutscene 2's volumetria: a big soft breathing halo on the 5 strongest lights, a rare shaft from the 2 strongest.
    halos: 5,
    fachosLuz: 2,
  },
};
// 19/10, he: smaller AND slower. A slower crossing slows the swim too (fast strokes at a crawl read as treading water).
if (ARG.trav) {
  CENA.travessia = { x0: 200, y0: 30, x1: 404, y1: 42, seg: Number(ARG.trav) };
  CENA.nadoFps = 6;
}
// The opening: the crossing is already 3 s in when the veil lifts, so the creature slides out of the cloud in the
// "wait" seconds, BEFORE the words drop (same path, same speed). 19/10, he: the crossing LOOPS (no black cut and
// restart) — out on the right, a pause with the sky empty, and it slides out of the cloud again.
if (MODO === 'abertura') Object.assign(CENA.travessia, { adiantar: 3, pausa: 6 });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const VIEWPORT = { par: { width: 1600, height: 1120 }, hd: { width: 1536, height: 864 }, abertura: { width: 1536, height: 864 } }[MODO] ?? { width: 1152, height: 648 };
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('[página]', m.text()); });
page.on('pageerror', (e) => console.log('[página] erro', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.getScene('Menu')?.sys?.isActive() && window.__gameHD, null, { polling: 4, timeout: 30000 });

// ─── The stage builder, shared by every game ────────────────────────────────────────────────────────────────────
await page.evaluate(() => {
  // A tiny seeded random (the same windows flicker in both games).
  window.__rnd = (s) => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  window.__carregar = (scene, chave, src, folha) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      if (folha) scene.textures.addSpriteSheet(chave, img, folha); else scene.textures.addImage(chave, img);
      ok();
    };
    img.src = src;
  });
  // OP.leviEscala: 1 when the Leviathan sheet is already baked at this density (hd); OP.ponto: the size of the
  // 1-pixel pieces (stars, the ship's lights) — at 4× a game pixel is a 4 px block, too coarse on his painting.
  window.__montar = async (scene, k, C, LEVI, CENA, PERFIL, OP = {}) => {
    const P = OP.ponto ?? k, pc = (k - P) / 2;
    const D = C.dados;
    for (const n of ['ceu', 'cidade', 'apagadas', 'nave']) await window.__carregar(scene, 'maq-' + n, C.img[n]);
    await window.__carregar(scene, 'maq-agua', C.img.cachoeira, { frameWidth: D.agua.fw, frameHeight: D.agua.fh });
    await window.__carregar(scene, 'maq-levi', LEVI.src, { frameWidth: LEVI.fw, frameHeight: LEVI.fh });
    const textura = (chave, w, h, desenhar) => {
      if (scene.textures.exists(chave)) return;
      const t = scene.textures.createCanvas(chave, w, h);
      desenhar(t.context, w, h);
      t.refresh();
    };
    textura('maq-px', 1, 1, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 1, 1); });
    // A soft light (19/10, he: the traffic dots should read as lights seen from far away, blurred, not dots).
    textura('maq-brilho', 64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
    // The phases' BRUMA texture (`BootScene.makeFogBand`), redrawn at THIS density with the same seed: at 4× the
    // game's 256×64 band would be scaled into blocks; drawn at 1024×256 it stays the same soft cloud.
    textura('maq-fog', 256 * k, 64 * k, (c, W, H) => {
      let s = 0x5eed;
      const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const borrao = (x, y, rr, a) => {
        const g = c.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      };
      for (const p of [{ n: 34, rMin: 16, rMax: 38, alpha: 0.26 }, { n: 55, rMin: 5, rMax: 14, alpha: 0.18 }]) {
        for (let i = 0; i < p.n; i++) {
          const x = rnd() * W, y = H / 2 + (rnd() - 0.5) * H * 0.9, rr = (p.rMin + rnd() * (p.rMax - p.rMin)) * k;
          borrao(x, y, rr, p.alpha);
          if (x - rr < 0) borrao(x + W, y, rr, p.alpha);
          if (x + rr > W) borrao(x - W, y, rr, p.alpha);
        }
      }
      const corte = c.createLinearGradient(0, 0, 0, H);
      corte.addColorStop(0, 'rgba(0,0,0,1)'); corte.addColorStop(0.22, 'rgba(0,0,0,0)');
      corte.addColorStop(0.78, 'rgba(0,0,0,0)'); corte.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = corte; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    });
    // The phases' FACHO texture (`BootScene.makeGodRay`), same: 192×24 game px, soft both ways, peak 0.55.
    textura('maq-raio', 192 * k, 24 * k, (c, W, H) => {
      for (let y = 0; y < H; y++) {
        const tt = 1 - Math.abs(y - (H - 1) / 2) / ((H - 1) / 2), tr = tt * tt;
        if (tr <= 0) continue;
        for (let x = 0; x < W; x += 6) {
          c.fillStyle = `rgba(255,255,255,${0.55 * tr * Math.sin((Math.PI * (x + 3)) / W)})`;
          c.fillRect(x, y, 6, 1);
        }
      }
    });
    // A searchlight's beam: a soft cone from its lamp (the texture's left middle), widening, fading along its length.
    // `LARG_CONE`: the texture's visible width at the far end, to scale a beam to a width in game px.
    textura('maq-cone', 256, 64, (c, W, H) => {
      const img = c.createImageData(W, H);
      for (let x = 0; x < W; x++) {
        const u = x / W, ao = Math.pow(1 - u, 1.2) * Math.min(1, x / 6), meia = 3 + u * 26;
        for (let y = 0; y < H; y++) {
          const i = (y * W + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = Math.round(255 * ao * Math.exp(-Math.pow((y - H / 2 + 0.5) / meia, 2) * 1.6));
        }
      }
      c.putImageData(img, 0, 0);
    });
    const LARG_CONE = 46;
    const brilho = (diametro) => (diametro * k) / 64;
    const A = scene.add;
    A.image(0, 0, 'maq-ceu').setOrigin(0).setDepth(0);
    const r = window.__rnd(11);
    // Stars: only in the open window (city alpha 0) where the sky is dark and empty.
    const ceuCan = scene.textures.get('maq-ceu').getSourceImage();
    const cidCan = scene.textures.get('maq-cidade').getSourceImage();
    const ler = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const ceuPx = ler(ceuCan), cidPx = ler(cidCan);
    const estrelas = [];
    for (let tent = 0; tent < 400 && estrelas.length < 9; tent++) {
      const x = Math.floor(200 + r() * 184), y = Math.floor(r() * 80);
      const i = (y * k * D.w + x * k) * 4;
      const l = 0.3 * ceuPx[i] + 0.59 * ceuPx[i + 1] + 0.11 * ceuPx[i + 2];
      if (cidPx[i + 3] !== 0 || l >= 13) continue;
      const cor = r() < 0.5 ? 0xc8d4ee : 0x8fa0c8;
      const o = OP.suave
        ? A.image(x * k + k / 2, y * k + k / 2, 'maq-brilho').setScale(brilho(1.6)).setBlendMode(Phaser.BlendModes.ADD)
        : A.image(x * k + pc, y * k + pc, 'maq-px').setOrigin(0).setScale(P);
      estrelas.push({ o: o.setDepth(0.5).setTint(cor), f: 0.6 + r() * 1.4, p: r() * 6 });
    }
    const levi = A.sprite(CENA.travessia.x0 * k, CENA.travessia.y0 * k, 'maq-levi', 0).setScale(OP.leviEscala ?? k).setDepth(1);
    A.image(0, 0, 'maq-cidade').setOrigin(0).setDepth(2);

    // ─── O VOLUME (19/10, he: "o mesmo tratamento das fases e cutscenes — névoa, granulação, volumetria") ───
    // The phases' bruma in bands that drift at different speeds (the speed difference is what sells volume), the
    // phases' fachos crossing the mist, and cutscene 2's volumetria on the strongest lights.
    const V = OP.volume ? CENA.volume : null;
    const bandas = [], fachos = [], halos = [];
    if (V) {
      const banda = (b, i, depth) => {
        const ts = A.tileSprite(0, b.y * k, 384 * k, b.h * k, 'maq-fog').setOrigin(0).setDepth(depth).setTint(b.tint).setAlpha(b.pico);
        ts.setTileScale(1 - i * 0.095, b.h / 64);
        bandas.push({ ts, b, sx: 1 - i * 0.095 });
      };
      // The far one lives in the WINDOW: behind the city, in front of the Leviathan (seen through the mist).
      banda(V.longe, 0, 1.5);
      V.bandas.forEach((b, i) => banda(b, i, b.frente ? 2.6 : 2.05));
      for (const [i, f] of V.fachos.entries()) {
        const img = A.image(f.x * k, f.y * k, 'maq-raio').setDepth(2.07).setTint(0xc8d6ff)
          .setBlendMode(Phaser.BlendModes.ADD).setAngle(f.angulo).setScale(f.escala, 1);
        fachos.push({ img, f, i });
      }
      const MARGEM = 14;
      const fortes = D.grupos.filter((g) => g.tipo === 'janela' && g.x > MARGEM && g.x < 384 - MARGEM && g.y > MARGEM && g.y < 216 - MARGEM)
        .sort((a, b) => b.n - a.n).slice(0, V.halos);
      const rh = window.__rnd(37);
      for (const [i, g] of fortes.entries()) {
        const cx = (g.x + g.w / 2) * k, cy = (g.y + g.h / 2) * k;
        const halo = A.image(cx, cy, 'maq-brilho').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb066).setDepth(2.08)
          .setScale(brilho(26 + rh() * 12));
        // A soft gradient deposits far less than cutscene 2's hard 4 px disc at the same alpha: the base is ~2× theirs.
        halos.push({ o: halo, base: 0.22 + rh() * 0.1, dur: 1.8 + rh() * 1.4, fase: rh() * 6 });
        if (i < V.fachosLuz) {
          A.image(cx, cy, 'maq-raio').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffcf9a).setDepth(2.08)
            .setAlpha(0.05 + rh() * 0.04).setAngle(-70 - rh() * 40).setScale(0.22 + rh() * 0.1, 0.5 + rh() * 0.2);
        }
      }
    }
    // The lights: ~24 small windows that go dark now and then, and every red beacon blinking.
    const janelas = D.grupos.filter((g) => g.tipo === 'janela' && g.n <= 6);
    const escolhidas = [];
    const rj = window.__rnd(23);
    while (escolhidas.length < 24 && janelas.length) escolhidas.push(janelas.splice(Math.floor(rj() * janelas.length), 1)[0]);
    // The "off" piece (19/10, he: the off lights left holes): only the changed pixels (the light lifted out of the
    // painting, `_camadas.mjs`), cropped to the light plus its fringe (`margem` game px), and UNDER the fog bands
    // like the city itself (the opaque piece over the fog was a clear patch).
    const apagar = (g, margem) => A.image(0, 0, 'maq-apagadas').setOrigin(0).setDepth(2.01)
      .setCrop(Math.floor((g.x - margem) * k), Math.floor((g.y - margem) * k), Math.ceil((g.w + 2 * margem) * k), Math.ceil((g.h + 2 * margem) * k))
      .setVisible(false);
    const luzes = escolhidas.map((g) => ({ o: apagar(g, 1), ciclo: 4 + rj() * 7, fora: 0.4 + rj() * 2.2, fase: rj() * 11, piscada: rj() < 0.35 }));
    // Beacons on the same tower blink TOGETHER, as real obstruction lights do (19/10, he: the top and the lower red
    // lights of the tall left tower were out of step). Same tower = within 3 px across and 14 px up/down.
    const fGrupos = D.grupos.filter((g) => g.tipo === 'farol' && g.n <= 4);
    const torre = fGrupos.map((_, i) => i);
    const raiz = (i) => (torre[i] === i ? i : (torre[i] = raiz(torre[i])));
    fGrupos.forEach((a, i) => fGrupos.forEach((b, j) => {
      if (j <= i) return;
      if (Math.abs(a.x + a.w / 2 - b.x - b.w / 2) <= 3 && Math.abs(a.y + a.h / 2 - b.y - b.h / 2) <= 14) torre[raiz(j)] = raiz(i);
    }));
    const faseTorre = new Map();
    const farois = fGrupos.map((g, i) => {
      const r0 = raiz(i);
      if (!faseTorre.has(r0)) faseTorre.set(r0, rj() * 2.3);
      return { o: apagar(g, 3), fase: faseTorre.get(r0) };
    });
    const agua = A.sprite(D.agua.x * k, D.agua.y * k, 'maq-agua', 0).setOrigin(0).setDepth(2.02);
    const trafego = [];
    for (const [x0, y0, x1, y1] of CENA.pontes) {
      // As many lights as the deck is long (the short walkway over the waterfall gets one).
      const n = 1 + Math.floor(Math.hypot(x1 - x0, y1 - y0) / 28) + (rj() < 0.5 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const cor = rj() < 0.7 ? 0xffc88a : 0xfff0d0;
        // Soft: a blurred light a bit longer than tall (moving along the deck), seen through the night air.
        const o = OP.suave
          ? A.image(0, 0, 'maq-brilho').setScale(brilho(3.2) * 1.5, brilho(3.2)).setBlendMode(Phaser.BlendModes.ADD)
          : A.image(0, 0, 'maq-px').setOrigin(0).setScale(Math.max(1, k / 2));
        trafego.push({ o: o.setDepth(2.3).setTint(cor), x0, y0, x1, y1, v: (rj() < 0.5 ? -1 : 1) * (3 + rj() * 6), p: rj(), fl: rj() * 6 });
      }
    }
    const nave = A.image(D.nave.x * k, D.nave.y * k, 'maq-nave').setOrigin(0).setDepth(2.4);
    const ponto = (cor) => (OP.suave
      ? A.image(0, 0, 'maq-brilho').setScale(brilho(2.4)).setBlendMode(Phaser.BlendModes.ADD)
      : A.image(0, 0, 'maq-px').setOrigin(0).setScale(P)).setDepth(2.5).setTint(cor);
    // Soft lights are centred on their pixel; hard ones sit on its corner.
    const pcx = OP.suave ? k / 2 : pc;
    const fileira = CENA.naveFileira.map(() => ponto(0xffb05a));
    const baixo = CENA.naveBaixo.map(() => ponto(0xd8823c));
    const topo = ponto(0xff3a2a);

    // ─── O PERIGO (19/10, he: "precisamos deixar uma impressão de perigo") ───
    const PG = OP.perigo ? CENA.perigo : null;
    const perigo = { feixes: [], tempestade: null, nave: null };
    if (PG) {
      const feixe = (x, y, comp, larg, alfa, depth) => A.image(x, y, 'maq-cone').setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xd8e4ff).setDepth(depth).setScale((comp * k) / 256, (larg * k) / LARG_CONE).setAlpha(alfa);
      // The anti-aircraft searchlights: a beam and its lamp each.
      for (const h of PG.holofotes) {
        const o = feixe(h.x * k, h.y * k, h.comp, PG.feixe.largura, PG.feixe.alfa, 2.09);
        A.image(h.x * k, h.y * k, 'maq-brilho').setScale(brilho(2.6)).setTint(0xf0f4ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(2.31).setAlpha(0.8);
        perigo.feixes.push({ o, h });
      }
      // The ship: its searchlight scanning the colony, its thrusters (a glow and a short cold exhaust each).
      const N = PG.nave, nx0 = D.nave.x, ny0 = D.nave.y;
      const busca = feixe((nx0 + N.holofote[0]) * k, (ny0 + N.holofote[1]) * k, N.comp, N.largura, N.alfa, 2.39);
      A.image((nx0 + N.holofote[0]) * k, (ny0 + N.holofote[1]) * k, 'maq-brilho').setScale(brilho(2)).setTint(0xeef4ff)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(2.45).setAlpha(0.7);
      const propulsores = N.propulsores.map(([px, py]) => ({
        brilho: A.image((nx0 + px) * k, (ny0 + py) * k, 'maq-brilho').setScale(brilho(2.4)).setTint(0x9cc2ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(2.45),
        jato: feixe((nx0 + px) * k, (ny0 + py) * k, 7, 3, 0.16, 2.39).setTint(0x9cc2ff).setAngle(90),
      }));
      perigo.nave = { busca, propulsores, N };

      // The storm: masks from the city layer itself (its pixels are the clouds he painted).
      const T = PG.tempestade, cw = D.w, ch = D.h; // dados.json sizes are already in this density's pixels
      const reg = document.createElement('canvas'); reg.width = cw; reg.height = ch;
      const rg = reg.getContext('2d', { willReadFrequently: true });
      rg.filter = `blur(${T.borda * k}px)`; rg.fillStyle = '#fff'; rg.beginPath();
      T.regiao.forEach(([x, y], i) => (i ? rg.lineTo(x * k, y * k) : rg.moveTo(x * k, y * k)));
      rg.closePath(); rg.fill();
      const regD = rg.getImageData(0, 0, cw, ch).data;
      const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      const nuvem = new Float32Array(cw * ch), ceuM = new Float32Array(cw * ch);
      for (let i = 0; i < cw * ch; i++) {
        const j = i * 4, a = cidPx[j + 3];
        if (a < 255) continue;
        const r0 = cidPx[j], g0 = cidPx[j + 1], b0 = cidPx[j + 2], l = 0.3 * r0 + 0.59 * g0 + 0.11 * b0;
        if (r0 > b0 + 20) continue; // warm: a lit building, not a cloud
        const m = regD[j + 3] / 255;
        nuvem[i] = sst(14, 70, l) * m; // the brighter billows light more
        // Where a bolt can show: everywhere in the mass but over the near-black silhouettes (a first try at 10–24 also
        // hid it in the dark gaps between the clouds, so only crumbs of it showed).
        ceuM[i] = sst(4, 11, l) * m;
      }
      const pintar = (chave, alfaDe) => {
        const t = scene.textures.createCanvas(chave, cw, ch), id = t.context.createImageData(cw, ch);
        for (let i = 0; i < cw * ch; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.round(255 * alfaDe(i)); }
        t.context.putImageData(id, 0, 0); t.refresh();
      };
      // One flash per focus: the cloud's own light × a soft falloff from where the discharge is.
      const flashes = T.focos.map(([fx, fy, raio], n) => {
        pintar('maq-flash' + n, (i) => { const x = (i % cw) / k, y = Math.floor(i / cw) / k, d = Math.hypot(x - fx, y - fy) / raio; return nuvem[i] * Math.max(0, 1 - d * d); });
        return A.image(0, 0, 'maq-flash' + n).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xc8d0ff).setDepth(2.03).setAlpha(0);
      });
      // The bolts: a jagged line (midpoint displacement) with a branch, drawn soft then sharp, cut by the sky mask.
      const rr = window.__rnd(91);
      const raios = T.raios.map(([a, b], n) => {
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
        const tronco = linha(a, b, 6);
        const meio = tronco[Math.floor(tronco.length * (0.35 + rr() * 0.25))];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rr() < 0.5 ? -1 : 1) * (0.5 + rr() * 0.4), L2 = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.4;
        const galho = linha(meio, [meio[0] + Math.cos(ang) * L2, meio[1] + Math.sin(ang) * L2], 5);
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const g = cv.getContext('2d', { willReadFrequently: true });
        const tracar = (pts, larg, cor) => { g.lineWidth = larg; g.strokeStyle = cor; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.stroke(); };
        tracar(tronco, 1.6 * k, 'rgba(190,200,255,0.22)'); tracar(galho, 1.1 * k, 'rgba(190,200,255,0.16)');
        tracar(tronco, 0.5 * k, 'rgba(255,255,255,1)'); tracar(galho, 0.35 * k, 'rgba(235,240,255,0.85)');
        const px = g.getImageData(0, 0, cw, ch).data;
        pintar('maq-raio' + n, (i) => (px[i * 4 + 3] / 255) * ceuM[i]);
        return A.image(0, 0, 'maq-raio' + n).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xe4e8ff).setDepth(2.04).setAlpha(0);
      });
      // The whole scene catches a little of each flash.
      const clarao = A.rectangle(0, 0, cw, ch, 0x8890b0, 1).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(2.62).setAlpha(0);
      // The heavier cloud rolling in: a dark mist drifting over the marked mass — over its CLOUDS only (the sky mask:
      // no silhouette, no lit building) and above the rooftops (a first try over the whole region dimmed the dome and
      // the tower, which stand in front of the storm).
      let rolo = null;
      try {
        pintar('maq-regiao', (i) => ceuM[i] * (1 - sst(58, 80, Math.floor(i / cw) / k)));
        const mascara = scene.make.image({ x: 0, y: 0, key: 'maq-regiao', add: false }).setOrigin(0);
        rolo = A.tileSprite(0, 0, 272 * k, 122 * k, 'maq-fog').setOrigin(0).setDepth(2.035).setTint(0x05070c).setAlpha(T.rolar).setTileScale(2.2, 2.4);
        rolo.setMask(mascara.createBitmapMask());
      } catch (e) { console.warn('[maquete] rolo', e); rolo = null; }
      perigo.tempestade = { T, flashes, raios, clarao, rolo };
    }

    // The Atmosfera, with the menu profile.
    const { Atmosfera } = await import('/src/systems/atmosfera/Atmosfera.ts');
    const E = OP.atmEscala ?? 1;
    if (E > 1) {
      // The shader measures everything in screen pixels (fog cells 70×26, halo 7×7 taps 2 px apart): on a 4× canvas
      // all of it shrinks 4× and the treatment nearly vanishes. A copy with a scale uniform, registered under the same
      // key BEFORE the Atmosfera asks for it (it only registers its own class when the key is free).
      const fonte = (await import('/src/systems/atmosfera/AtmosferaPipeline.ts?raw')).default;
      const FRAG = fonte.slice(fonte.indexOf('const FRAG = `') + 14, fonte.indexOf('`;', fonte.indexOf('const FRAG = `')));
      const FRAG_HD = FRAG
        .replace('uniform vec2 uResolucao;', 'uniform vec2 uResolucao;\nuniform float uEscala;')
        .replace('fbm((tela - uVelTras * uTempo)', 'fbm((tela / uEscala - uVelTras * uTempo)')
        .replace('fbm((tela - uVelFrente * uTempo)', 'fbm((tela / uEscala - uVelFrente * uTempo)')
        .replace('vec2(float(i), float(j)) * 2.0) / uResolucao', 'vec2(float(i), float(j)) * 2.0 * uEscala) / uResolucao');
      if ((FRAG_HD.match(/uEscala/g) ?? []).length !== 4) throw new Error('the Atmosfera shader changed: the HD patch missed');
      const { AtmosferaPipeline, CHAVE_ATMOSFERA } = await import('/src/systems/atmosfera/AtmosferaPipeline.ts');
      class AtmosferaHD extends AtmosferaPipeline {
        constructor(game) { super(game); this.config.fragShader = FRAG_HD; }
        onPreRender() { super.onPreRender(); this.set1f('uEscala', E); }
      }
      scene.renderer.pipelines.addPostPipeline(CHAVE_ATMOSFERA, AtmosferaHD);
      // The dust drifts in screen pixels too: the same speed on screen, and 2 px grains instead of 1.
      PERFIL = { ...PERFIL, poeira: { ...PERFIL.poeira, deriva: PERFIL.poeira.deriva.map((v) => v * E), espalhar: PERFIL.poeira.espalhar * E } };
    }
    const atm = new Atmosfera(scene, { limiteLimpo: 99, profundidadePoeira: 1.5 });
    atm.perfil(PERFIL);
    if (E > 1) atm.poeira?.setParticleScale?.(OP.ponto ?? 2);

    let tAnt = 0;
    return (t) => {
      atm.update(t - tAnt); tAnt = t;
      const T = CENA.travessia, tt = t + (T.adiantar ?? 0);
      const u = T.pausa === undefined ? Math.min(1, tt / T.seg) : Math.min(1, (tt % (T.seg + T.pausa)) / T.seg);
      levi.setPosition(Math.round((T.x0 + (T.x1 - T.x0) * u) * k), Math.round((T.y0 + (T.y1 - T.y0) * u) * k));
      levi.setFrame(Math.floor(t * (CENA.nadoFps ?? 10)) % 16);
      for (const s of estrelas) s.o.setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.f * 2 + s.p)));
      for (const l of luzes) {
        const c = (t + l.fase) % l.ciclo;
        let off = c < l.fora;
        if (l.piscada && c < 0.5) off = Math.floor(c * 12) % 2 === 0; // a short failing flicker before it goes dark
        l.o.setVisible(off);
      }
      for (const f of farois) f.o.setVisible((t + f.fase) % 2.3 > 1.4);
      agua.setFrame(Math.floor(t * 10) % D.agua.quadros);
      for (const c of trafego) {
        const len = Math.hypot(c.x1 - c.x0, c.y1 - c.y0);
        const s = (((c.p * len + c.v * t) % len) + len) % len / len;
        c.o.setPosition(Math.round((c.x0 + (c.x1 - c.x0) * s) * k + (OP.suave ? k / 2 : 0)), Math.round((c.y0 + (c.y1 - c.y0) * s) * k + (OP.suave ? k / 2 : 0)));
        // Far lights shimmer in the air (soft only): a small, uneven flutter. At the deck's ends they fade (into a
        // gate, behind a rock) instead of crossing the wall.
        const ponta = Math.min(1, (s * len) / CENA.pontaFade, ((1 - s) * len) / CENA.pontaFade);
        if (OP.suave) c.o.setAlpha((0.6 + 0.25 * Math.sin(t * 5.3 + c.fl) + 0.1 * Math.sin(t * 13.1 + c.fl * 2)) * ponta * ponta);
      }
      for (const { ts, b, sx } of bandas) ts.tilePositionX = (t * b.vel * k) / sx;
      for (const { img, f, i } of fachos) {
        img.setX(f.x * k + Math.sin(t * 0.05 + i * 2) * f.deriva * k);
        img.setAlpha(f.pico * (0.7 + 0.3 * Math.sin(t * 0.45 + i * 1.7)));
      }
      for (const h of halos) h.o.setAlpha(h.base * (0.7 + 0.3 * Math.sin((t * 2 * Math.PI) / h.dur + h.fase)));
      // The ship stays where he painted it (19/10, he: the bobbing cut-out hid the painted ship); only its lights live:
      // the belly row chases, the beacon blinks.
      const nx = D.nave.x * k, ny = D.nave.y * k;
      nave.setPosition(Math.round(nx), Math.round(ny));
      const vez = Math.floor(t * 7) % (fileira.length + 2);
      fileira.forEach((o, i) => o.setPosition(Math.round(nx + CENA.naveFileira[i][0] * k + pcx), Math.round(ny + CENA.naveFileira[i][1] * k + pcx)).setAlpha(i === vez ? 1 : 0.35));
      baixo.forEach((o, i) => o.setPosition(Math.round(nx + CENA.naveBaixo[i][0] * k + pcx), Math.round(ny + CENA.naveBaixo[i][1] * k + pcx)).setAlpha(0.45 + 0.35 * Math.sin(t * 2.2 + i)));
      topo.setPosition(Math.round(nx + CENA.naveTopo[0] * k + pcx), Math.round(ny + CENA.naveTopo[1] * k + pcx)).setVisible(t % 1.6 < 0.25);
      if (PG) {
        // The searchlights search: a slow sweep plus a slower wander, each on its own clock.
        for (const { o, h } of perigo.feixes) {
          o.setAngle(h.base + h.amp * Math.sin((2 * Math.PI * t) / h.per + h.fase) + 0.25 * h.amp * Math.sin((2 * Math.PI * t) / (h.per * 0.37) + 2 * h.fase));
        }
        const { busca, propulsores, N } = perigo.nave;
        busca.setAngle(N.base + N.amp * Math.sin((2 * Math.PI * t) / N.per) + 6 * Math.sin((2 * Math.PI * t) / 6.3 + 1));
        propulsores.forEach((p, i) => {
          const f = 0.75 + 0.15 * Math.sin(t * 31 + i * 2) + 0.1 * Math.sin(t * 57 + i * 5);
          p.brilho.setAlpha(0.5 * f); p.jato.setAlpha(0.16 * f);
        });
        // The storm: each event a few strokes (on, a fast decay); the bolt shows only while a stroke is on.
        const TP = perigo.tempestade, T = TP.T;
        const nivel = TP.flashes.map(() => 0), nivelRaio = TP.raios.map(() => 0);
        let total = 0;
        for (const [t0, foco, raio] of T.eventos) {
          const dt = t - t0;
          if (dt < 0 || dt > 1.5) continue;
          let v = 0, vr = 0;
          for (const [o, I, d] of T.golpes) {
            const u = dt - o;
            if (u < 0) continue;
            v = Math.max(v, u <= d ? I : I * Math.exp(-(u - d) / 0.09));
            if (u <= d) vr = Math.max(vr, I);
          }
          nivel[foco] = Math.max(nivel[foco], v);
          if (raio >= 0) nivelRaio[raio] = Math.max(nivelRaio[raio], vr);
          total = Math.max(total, v);
        }
        TP.flashes.forEach((f, n) => f.setAlpha(T.forca * nivel[n]));
        TP.raios.forEach((r, n) => r.setAlpha(nivelRaio[n]));
        TP.clarao.setAlpha(T.global * total);
        if (TP.rolo) { TP.rolo.tilePositionX = -(t * 3 * k) / 2.2; TP.rolo.tilePositionY = Math.sin(t * 0.05) * 6 * k; }
      }
    };
  };
});

// The stepped clock (tweens and Phaser time follow it).
await page.evaluate(() => {
  window.__passo = { t: performance.now() };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
});

// The real menu text (HD layer): hide the dev lines, move the rest to the proposed layout.
await page.evaluate((L) => {
  window.__textoMenu = (m) => {
    for (const c of window.__gameHD.scene.getScenes(true)) for (const o of c.children.list) {
      if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
    }
    const [titulo, sub, , rot, c1, c2, c3] = m.uiTargets.map((u) => u.obj);
    titulo.setPosition(...L.titulo);
    sub.setPosition(...L.sub);
    m.itensMenu.forEach((t, i) => t.setPosition(L.lista[0], L.lista[1] + i * 10));
    rot.setPosition(...L.rot);
    [c1, c2, c3].forEach((c, i) => c.setPosition(192, L.cond[i]));
  };
  window.__esvaziarMenu = () => {
    const m = window.__game.scene.getScene('Menu');
    m.skipIntro();
    for (const o of m.children.list) o.setVisible(false);
    m.starfield = null;
    return m;
  };
}, CENA.layout);

// Round 5 (19/10): the opening. Game coordinates; seconds from the scene's start.
// Round 6 (19/10, he): the title becomes the LOGO (a lettering that lights up — his pick A), lower, towards the middle
// of the picture; and the stabilizers are a ROCKET's: the title block is a craft that falls in, fires retro jets to
// brake and side puffs (RCS) to correct its drift, then holds. The list drops after it; then the lettering lights up.
const ABERTURA = {
  veu: 1.2, // the black veil lifts; then the scenery plays alone for a couple of seconds
  // Centred: the title block in the clouds between the towers, BELOW the Leviathan's path (it crosses above); the list
  // at the bottom; the valley in the middle stays clear.
  // Round 7 (he): "pode até descer mais um pouco" — 8 px lower.
  layout: { titulo: 58, sub: 71, lista: [178, 188, 198], desc: 208 },
  // The craft (title + REMASTERED, one piece). Round 7 (he): "para frear algo em descida a queima precisa ser maior" —
  // a LONG burn: it comes in from above the screen already braking, the retro jets firing the whole way down
  // (y = 1 − (1 − u)^forma: a strong, steady thrust that only eases near the end), stops `sobra` px past its spot,
  // and a last puff settles it back. Meanwhile it drifts sideways and the side jets keep correcting it.
  // Round 9 (he): "o letreiro precisa cair mais lentamente, como se ele estivesse sendo controlado; os estabilizadores
  // continuam da mesma forma" — the burn 2.2 → 3.8 s (it comes in at ~57 px/s, not ~99, braking ~3× gentler); the
  // jets keep their plume (`jatos.queimaAprovada`); it starts a little earlier so the opening doesn't stretch.
  nave: {
    t0: 3.0, yIni: -30, queima: 3.8, forma: 2.4, sobra: 2.5,
    mola: { periodo: 0.9, amortecimento: 0.55 },
    deriva: { ini: 6, periodo: 1.4, amortecimento: 0.35 },
    apagado: [0x4b5a70, 0x2f3c50], // unlit tints (title, REMASTERED) until it lights up
    aceso: [0xb5f7ff, 0x17a6bd],
  },
  // The jets: hot gas at the nozzle (white → amber) turning into cold vapour that spreads, slows down and fades. Each
  // nozzle fires when the craft's acceleration needs its push. Crisp squares in the text layer, never in the treatment.
  // (The first try, 110 puffs/s, read as stray dots: a jet needs a dense plume.) The gas keeps part of the craft's
  // own speed (`herda`), so the retro plume stretches while it brakes the fall.
  jatos: {
    // aRef: the acceleration that makes a full plume (the long burn brakes at ~60 px/s²); the force is capped.
    // queimaAprovada: the burn the plume was tuned on (round 7); a longer, gentler burn scales the vertical reference by
    // (queimaAprovada / queima)², so the retro plume looks the same; the side puffs and the final settle keep aRef.
    taxa: 420, aRef: 60, queimaAprovada: 2.2, teto: 1.4, vida: [0.18, 0.42], vel: [90, 150], abre: 0.32, arrasto: 0.13, herda: 0.6,
    quente: 0.05, chama: 0.13, // white-hot, then amber, then cold vapour
    // [dx, dy] from the title's centre, the gas direction, the weight.
    bicos: [
      // Under REMASTERED, each retro jet coming out from UNDER A LETTER (19/10, he) — the 2nd E, the A, the 3rd and the
      // 4th E (centres measured on the frame: −34.1, −13.6, +14.9, +33.9), symmetric pairs; four plumes at 0.8 keep
      // the burn he approved.
      [-34.1, 16.5, [0, 1], 0.8], [-13.6, 16.5, [0, 1], 0.8], [14.9, 16.5, [0, 1], 0.8], [33.9, 16.5, [0, 1], 0.8],
      [-48, -7, [0, -1], 0.5], [48, -7, [0, -1], 0.5], // over the title
      [-62, 0, [-1, 0], 0.3], [-50, 13, [-1, 0], 0.22], // the left side (the drift's push is ~2× the burn's)
      [62, 0, [1, 0], 0.3], [50, 13, [1, 0], 0.22], // the right side
    ],
  },
  // The list drops after the craft, as a formation (0.08 s apart: the lines never cross in flight), no jets.
  lista: { t0: 7.2, H: 14, passo: 0.08, mola: { periodo: 0.95, amortecimento: 0.5 } },
  // Then the lettering lights up letter by letter, each with a failing flicker (as the city's windows do), REMASTERED
  // after it, and LAST the W's eyes (round 7). Without a base, the Silkscreen title stands in for his lettering.
  acende: { t0: 8.8, porLetra: 0.07, subPorLetra: 0.025, olhos: 0.45 },
  letreiro: null, // filled below from `_letreiro.mjs` (round 7)
  // The demo at the end: the cursor visits the condução line, cycles its three values, and goes back.
  cursor: [[0, 0], [13.5, 1], [19, 0]],
  valor: [[0, 0], [15, 1], [16.5, 2], [18, 0]],
  valores: [
    { nome: 'DIEGÉTICA', desc: 'a gravidade decide · recomendado', cor: 0x3ee0f0 },
    { nome: 'LEGACY', desc: 'flap sempre · score ×1.25', cor: 0xff8c1a },
    { nome: 'LIVRE', desc: 'voo livre sempre · acessível', cor: 0x17a6bd },
  ],
};
if (ARG.letreiro) {
  const f = (k) => b64(path.join(ARG.letreiro, `${ARG.base}-${k}.png`));
  ABERTURA.letreiro = {
    ...JSON.parse(fs.readFileSync(path.join(ARG.letreiro, 'letras.json'), 'utf8')),
    // Unlit WITHOUT the eyes (19/10, he: the eye only lights at the very end — no trace of it before); lit without
    // the eyes; lit with them, last.
    img: { apagado: f('apagado'), aceso: f('aceso'), olhos: f('aceso-olhos') },
  };
}

await page.evaluate(() => {
  window.__abertura = async (m, cena, A) => {
    const objs = m.uiTargets.map((u) => u.obj);
    const [titulo, sub, , rot, c1, c2, c3] = objs;
    // The old condução block goes; its choice becomes one line of the list.
    for (const o of [rot, c1, c2, c3]) o.setVisible(false);
    for (const o of objs) m.tweens.killTweensOf(o);
    m.pulsoMenu?.remove(); m.pulsoMenu = null;
    const [comecar, arquivo] = m.itensMenu;
    const cond = m.t(192, 0, 'CONDUÇÃO', 8, 0xd0d0dc);
    const desc = m.t(192, A.layout.desc, ' ', 7, 0x3ee0f0);
    const itens = [
      { o: comecar, nome: () => 'COMEÇAR' },
      { o: cond, nome: (v) => `CONDUÇÃO: ${A.valores[v].nome}` },
      { o: arquivo, nome: () => 'ARQUIVO DE CARTAS' },
    ];
    // The veil sits on top of the scenery, under the text (as in today's menu).
    const veu = cena.add.rectangle(0, 0, 1536, 864, 0x000000, 1).setOrigin(0).setDepth(100);
    const q = (v) => Math.round(v * 4) / 4; // the screen pixel (¼ game px): the letters stay crisp while they move
    const suave = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const degrau = (tab, t) => { let v = tab[0]; for (const e of tab) if (t >= e[0]) v = e; return v; };
    // An underdamped spring from offset o0 and velocity v0.
    const amortecida = (o0, v0, periodo, z) => {
      const w = (2 * Math.PI) / periodo, wd = w * Math.sqrt(1 - z * z), B = (v0 + z * w * o0) / wd;
      return (s) => Math.exp(-z * w * s) * (o0 * Math.cos(wd * s) + B * Math.sin(wd * s));
    };

    // ─ The craft: the long burn, then a last settle; the drift corrected all the way down. Smooth in position and
    // speed (before the burn it comes in at the burn's opening speed), so the jets follow the acceleration cleanly.
    const N = A.nave, yF = A.layout.titulo, dSub = A.layout.sub - A.layout.titulo;
    const Dq = yF + N.sobra - N.yIni, v0 = (N.forma * Dq) / N.queima;
    const oy = amortecida(N.sobra, 0, N.mola.periodo, N.mola.amortecimento);
    const ox = amortecida(N.deriva.ini, 0, N.deriva.periodo, N.deriva.amortecimento);
    const naveY = (tau) => (tau < 0 ? N.yIni + v0 * tau
      : tau < N.queima ? N.yIni + Dq * (1 - Math.pow(1 - tau / N.queima, N.forma)) : yF + oy(tau - N.queima));
    const naveX = (tau) => 192 + (tau < 0 ? N.deriva.ini : ox(tau));
    const H = 0.004;
    const acel = (f, tau) => (tau < 0 ? 0 : (f(tau + H) - 2 * f(tau) + f(tau - H)) / (H * H));

    // ─ The jets, a pure function of t: emission on a fixed 60 Hz grid, randomness hashed from (slot, nozzle, puff).
    const J = A.jatos;
    const hash = (a, b, c, d) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + d * 4.581) * 43758.5453; return s - Math.floor(s); };
    const pool = [];
    for (let i = 0; i < 1600; i++) pool.push(titulo.scene.add.image(0, 0, 'maq-px').setDepth(19).setVisible(false));
    const vel = (f, tau) => (f(tau + H) - f(tau - H)) / (2 * H);
    const jatos = (t) => {
      let n = 0;
      for (let j = Math.max(0, Math.floor((t - J.vida[1]) * 60)); j <= Math.floor(t * 60); j++) {
        const te = j / 60, tau = te - N.t0;
        if (tau < 0) continue;
        const ax = acel(naveX, tau), ay = acel(naveY, tau), cx = naveX(tau), cy = naveY(tau);
        const vx = vel(naveX, tau) * J.herda, vy = vel(naveY, tau) * J.herda;
        J.bicos.forEach(([dx, dy, [ux, uy], peso], b) => {
          const ref = uy !== 0 && tau < N.queima ? J.aRef * Math.pow(J.queimaAprovada / N.queima, 2) : J.aRef;
          const forca = Math.min(J.teto, Math.max(0, -(ax * ux + ay * uy)) / ref);
          const qtd = Math.floor((forca * J.taxa * peso) / 60 + hash(j, b, 0, 1));
          for (let k = 0; k < qtd && n < pool.length; k++) {
            const r = (c) => hash(j, b, k + 1, c);
            const vida = J.vida[0] + r(1) * (J.vida[1] - J.vida[0]), idade = t - te;
            if (idade < 0 || idade >= vida) continue;
            const ang = Math.atan2(uy, ux) + (r(2) - 0.5) * J.abre;
            const v = J.vel[0] + r(3) * (J.vel[1] - J.vel[0]);
            const d = J.arrasto * (1 - Math.exp(-idade / J.arrasto)); // how far a unit speed got, with the air's drag
            const f = idade / vida;
            // The vapour drifts with the night air (left and a little up), like the dust.
            const px = cx + dx + (r(4) - 0.5) * 2.5 + (Math.cos(ang) * v + vx) * d - 3 * idade;
            const py = cy + dy + (r(5) - 0.5) * 1.5 + (Math.sin(ang) * v + vy) * d - 2 * idade;
            const cor = idade < J.quente ? 0xfff3dc : idade < J.chama ? 0xffb860 : 0x9eacc2;
            const tam = idade < J.quente ? 0.75 : idade < J.chama ? 1 : 1 + f;
            const alfa = idade < J.chama ? 1 : 0.6 * Math.pow(1 - f, 1.5);
            pool[n++].setVisible(true).setPosition(q(px), q(py)).setScale(q(tam)).setTint(cor).setAlpha(alfa);
          }
        });
      }
      for (let i = n; i < pool.length; i++) pool[i].setVisible(false);
    };

    // ─ The lighting up: letter by letter, each one on, off, on (the failing flicker of the city's windows).
    const acesa = (ti, t) => t - ti >= 0.09 || (t - ti >= 0 && t - ti < 0.04);
    const letras = (txt) => [...txt].map((c, i) => (c === ' ' ? -1 : i)).filter((i) => i >= 0);
    const LT = letras(titulo.text), LS = letras(sub.text);
    const tSub = A.acende.t0 + LT.length * A.acende.porLetra + 0.1;
    const tAceso = tSub + LS.length * A.acende.subPorLetra + 0.1;
    const acender = (o, idx, t0, passo, apagado, aceso, t) => idx.forEach((c, i) => o.setCharacterTint(c, 1, false, acesa(t0 + i * passo, t) ? aceso : apagado));
    const tOlhos = tAceso + A.acende.olhos;

    // ─ His lettering (round 7), in place of the Silkscreen title: per letter an unlit and a lit piece (the column spans
    // from `_letreiro.mjs`, glow included); the W's lit piece shows the eyes only from their own moment on. Each
    // lettering pixel is 2 screen px (scale 0.5 in the layer's game units).
    const LE = A.letreiro;
    let pecas = null;
    if (LE) {
      const ct = titulo.scene;
      for (const [k, src] of Object.entries(LE.img)) await window.__carregar(ct, 'let-' + k, src);
      pecas = LE.letras.map((l, i) => {
        for (const k of Object.keys(LE.img)) ct.textures.get('let-' + k).add('L' + i, 0, l.ini, 0, l.fim - l.ini, LE.h);
        const peca = (k) => ct.add.image(0, 0, 'let-' + k, 'L' + i).setOrigin(0, 0.5).setScale(0.5).setDepth(20);
        return { l, apagado: peca('apagado'), aceso: peca('aceso'), olhos: l.ch === 'W' ? peca('olhos') : null };
      });
      titulo.setVisible(false);
    }

    // ─ The list: a formation on a spring, after the craft.
    const L = A.lista, molaL = amortecida(-L.H, 0, L.mola.periodo, L.mola.amortecimento);
    const molaLista = (tau) => (tau <= 0 ? -L.H : molaL(tau));
    const pousoLista = L.t0 + 2 * L.passo + 1.4;

    return (t) => {
      veu.setAlpha(1 - suave(0, A.veu, t));
      const tau = t - N.t0, cx = naveX(tau), cy = naveY(tau);
      titulo.setPosition(q(cx), q(cy)).setAlpha(1);
      sub.setPosition(q(cx), q(cy + dSub)).setAlpha(1);
      acender(titulo, LT, A.acende.t0, A.acende.porLetra, N.apagado[0], N.aceso[0], t);
      acender(sub, LS, tSub, A.acende.subPorLetra, N.apagado[1], N.aceso[1], t);
      // Lit, the title breathes (1 → 0.82), as today.
      const respira = t > tAceso ? 1 - 0.09 * (1 - Math.cos((2 * Math.PI * (t - tAceso)) / 5.2)) : 1;
      titulo.setAlpha(respira);
      if (pecas) {
        pecas.forEach((p, i) => {
          const x = q(cx + (p.l.ini - LE.w / 2) * 0.5), y = q(cy);
          const aceso = acesa(A.acende.t0 + i * A.acende.porLetra, t), olhos = p.olhos && acesa(tOlhos, t);
          p.apagado.setPosition(x, y).setVisible(!aceso);
          p.aceso.setPosition(x, y).setVisible(aceso && !olhos).setAlpha(respira);
          p.olhos?.setPosition(x, y).setVisible(aceso && olhos).setAlpha(respira);
        });
      }
      jatos(t);

      const [tCur, cur] = degrau(A.cursor, t), [, val] = degrau(A.valor, t);
      itens.forEach((it, i) => {
        const nome = it.nome(val), txt = i === cur ? `> ${nome} <` : nome;
        if (it.o.text !== txt) it.o.setText(txt);
        it.o.setTint(i === cur ? 0xb5f7ff : 0xd0d0dc);
        const tl = t - (L.t0 + i * L.passo);
        it.o.setPosition(192, q(A.layout.lista[i] + molaLista(tl)));
        // At rest: the cursor's item blinks (1 → 0.4), the others sit at 0.7.
        let a = suave(0, 0.45, tl);
        if (i !== cur) a *= 0.7;
        else if (t > pousoLista) a *= 0.7 + 0.3 * Math.cos((2 * Math.PI * (t - Math.max(pousoLista, tCur))) / 2.2);
        it.o.setAlpha(a);
      });
      // The value's description shows only while the cursor is on the condução line.
      const v = A.valores[val];
      if (cur === 1 && t > pousoLista) {
        if (desc.text !== v.desc) desc.setText(v.desc);
        desc.setTint(v.cor).setAlpha(1).setPosition(192, A.layout.desc);
      } else desc.setAlpha(0);
    };
  };
});

const jogos = [];
if (MODO === 'jogo') {
  const C = camadas(K1);
  await page.evaluate(async ({ C, LEVI, CENA, PERFIL }) => {
    const g = window.__game;
    g.loop.sleep();
    const m = window.__esvaziarMenu();
    window.__atualizar = { jogo: await window.__montar(m, 1, C, LEVI, CENA, PERFIL) };
    window.__textoMenu(m);
    window.__jogos = [g];
  }, { C, LEVI: LEVI_INFO, CENA, PERFIL: PERFIL_MENU });
  jogos.push({ nome: 'jogo', k: 1 });
} else if (MODO === 'hd' || MODO === 'abertura') {
  // The stage goes INTO the HD layer (the second Phaser.Game, the text's), at the back, under the menu text: the way
  // the real menu would have to be built at the painting's resolution. 1536×864 viewport → that layer runs at s = 4.
  const C4 = camadas(K4);
  await page.evaluate(async ({ C4, LEVI, CENA, PERFIL, OP, ABRE }) => {
    const g = window.__game, hd = window.__gameHD;
    if (hd.canvas.width !== 1536) throw new Error(`the HD layer is ${hd.canvas.width} px wide, not 1536`);
    const cena = await new Promise((ok) => hd.scene.add('maqHD', { key: 'maqHD', create() { ok(this); } }, true));
    hd.scene.sendToBack('maqHD');
    g.loop.sleep(); hd.loop.sleep();
    const m = window.__esvaziarMenu();
    window.__atualizar = { hd: await window.__montar(cena, 4, C4, LEVI, CENA, PERFIL, OP) };
    window.__textoMenu(m);
    if (ABRE) window.__atualizar.abertura = await window.__abertura(m, cena, ABRE);
    window.__jogos = [g, hd];
  }, { C4, LEVI: LEVI_HD, CENA, PERFIL: PERFIL_MENU, OP: ATM_HD, ABRE: MODO === 'abertura' ? ABERTURA : null });
  jogos.push({ nome: 'hd', k: 4 });
} else {
  const C1 = camadas(K1), C4 = camadas(K4);
  await page.evaluate(async ({ C1, C4, LEVI1, LEVI4, CENA, PERFIL, OP }) => {
    window.__game.loop.sleep();
    window.__gameHD.loop.sleep();
    for (const c of document.querySelectorAll('canvas')) c.style.display = 'none';
    const G = window.__game.constructor;
    const criar = (k, top) => new Promise((ok) => {
      const div = document.createElement('div');
      div.id = 'maq-k' + k;
      Object.assign(div.style, { position: 'absolute', left: '0px', top: top + 'px', zIndex: 50 });
      document.body.appendChild(div);
      const jogo = new G({
        type: 2, width: 384 * k, height: 216 * k, pixelArt: true, antialias: false, banner: false, parent: div,
        backgroundColor: '#000000', scale: { mode: 0 },
        scene: { key: 'maq', create() { ok({ jogo, cena: this }); } },
      });
    });
    const a = await criar(4, 0);
    const b = await criar(1, 880);
    a.jogo.loop.sleep(); b.jogo.loop.sleep();
    window.__atualizar = {
      k4: await window.__montar(a.cena, 4, C4, LEVI4 ?? LEVI1, CENA, PERFIL, LEVI4 ? OP : {}),
      k1: await window.__montar(b.cena, 1, C1, LEVI1, CENA, PERFIL),
    };
    window.__jogos = [a.jogo, b.jogo];
  }, { C1, C4, LEVI1: LEVI_INFO, LEVI4: LEVI_HD, CENA, PERFIL: PERFIL_MENU, OP: ATM_HD });
  jogos.push({ nome: 'k4', k: 4 }, { nome: 'k1', k: 1 });
}

const recorte = async (nome) => {
  if (nome === 'jogo' || nome === 'hd') {
    // The HD layer is aligned over the world canvas: the same rectangle shows both.
    const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
    return { x: geo.x, y: geo.y, width: geo.w, height: geo.h };
  }
  const k = nome === 'k4' ? 4 : 1;
  return { x: 0, y: k === 4 ? 0 : 880, width: 384 * k, height: 216 * k };
};
const clips = Object.fromEntries(await Promise.all(jogos.map(async (j) => [j.nome, await recorte(j.nome)])));
// Frames go to disk and become WebM (`_webm.mjs`): the Atmosfera grain changes every frame, and the GIFs of the first
// try weighed 40–90 MB.
//   jogo → the screen as the player sees it (the canvas at ×3, 1152×648) + `perto`, the left half ×2 (the ship, the
//          bridges and their traffic);
//   hd   → the screen at 1536×864 (the painting at 97% of its file), with the menu text;
//   par  → both at 1536×864: the game resolution ×4 (nearest), the 4× painting 1:1.
const saidas = MODO === 'jogo' ? ['jogo', 'perto'] : MODO === 'hd' || MODO === 'abertura' ? ['hd'] : ['k4', 'k1'];
for (const s of saidas) fs.rmSync(path.join(OUT, `_q-${s}`), { recursive: true, force: true }), fs.mkdirSync(path.join(OUT, `_q-${s}`));
let nQ = 0;
const total = Math.round(SEG * 60);
// Stills: at 25/50/75%, or (the opening) at the beats — scenery alone, the drop, the dip, at rest, each condução value.
// FOTOS="1.5 2 2.5": stills at those seconds instead (a check of something that blinks, say).
const momentos = process.env.FOTOS
  ? process.env.FOTOS.trim().split(/\s+/).map(Number).map((s) => Math.round((s * 60) / POR_FOTO) * POR_FOTO - POR_FOTO)
  : MODO === 'abertura'
  ? [2.7, 3.4, 4.0, 4.6, 5.2, 5.8, 6.4, 7.0, 7.6, 11.6, 14.5].map((s) => Math.round((s * 60) / POR_FOTO) * POR_FOTO - POR_FOTO)
  : [0.25, 0.5, 0.75].map((f) => Math.round((total * f) / POR_FOTO) * POR_FOTO);
const nomeFoto = (passo) => (MODO === 'abertura' ? `t${((passo + POR_FOTO) / 60).toFixed(1)}` : String(Math.round((passo / total) * 100)));
for (let passo = 0; passo < total; passo += POR_FOTO) {
  // ONE engine step per photo (a 100 ms delta): every motion here is a function of `t`, and the software GL renders a
  // 1536×864 frame with the 49-tap halo slowly — six renders per photo were five thrown away.
  await page.evaluate(({ n, QUADRO }) => {
    const dt = n * QUADRO;
    window.__passo.t += dt;
    const t = (window.__passo.tAcum = (window.__passo.tAcum ?? 0) + dt / 1000);
    for (const f of Object.values(window.__atualizar)) f(t);
    for (const g of window.__jogos) g.step(window.__passo.t, dt);
  }, { n: POR_FOTO, QUADRO });
  const nome4 = String(nQ).padStart(4, '0');
  for (const j of jogos) {
    const f = await page.screenshot({ clip: clips[j.nome] });
    const tela = j.nome === 'jogo'
      ? await sharp(f).resize(1152, 648, { kernel: 'nearest' }).png().toBuffer()
      : await sharp(f).resize(1536, 864, { kernel: 'nearest' }).png().toBuffer();
    if (momentos.includes(passo)) fs.writeFileSync(path.join(OUT, `${j.nome}-${nomeFoto(passo)}.png`), tela);
    fs.writeFileSync(path.join(OUT, `_q-${j.nome}`, `${nome4}.png`), tela);
    if (j.nome === 'jogo') {
      await sharp(tela).extract({ left: 120, top: 150, width: 576, height: 360 }).resize(1152, 720, { kernel: 'nearest' })
        .toFile(path.join(OUT, '_q-perto', `${nome4}.png`));
    }
  }
  nQ++;
}
await browser.close();
const { webm } = await import('./_webm.mjs');
for (const s of saidas) {
  await webm(path.join(OUT, `_q-${s}`), path.join(OUT, `${s}.webm`), 60 / POR_FOTO);
  fs.rmSync(path.join(OUT, `_q-${s}`), { recursive: true, force: true });
}
console.log(OUT, MODO, saidas.join(' '), nQ, 'quadros');
