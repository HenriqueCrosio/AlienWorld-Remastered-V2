// 14/10 — THE IMAGES OF THE POLISH REPORT: crops and pairs from the sweep (`_varrer-campanha.mjs`), the real-time
// cutscenes (`_cutscene-tempo-real.mjs`), the live before × after (`_antes-depois.mjs`) and the mock-ups
// (`_mock-emendas.mjs`), written as numbered PNGs next to the report.
//   node scripts/_polimento/_relatorio-imagens.mjs <work dir (the sweep folders)> <his screenshot> <out dir>
import fs from 'node:fs';
import sharp from 'sharp';

const [W, PRINT, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const V = `${W}/varredura`, V4 = `${W}/varredura-f4`;
const salvar = async (buf, nome) => { await sharp(buf).png().toFile(`${OUT}/${nome}.png`); console.log(nome); };
const recorte = (arq, x, y, w, h, z = 1) =>
  sharp(arq).extract({ left: x, top: y, width: w, height: h }).resize(Math.round(w * z), Math.round(h * z), { kernel: 'nearest' }).png().toBuffer();
const lado = async (bufs, gap = 8) => {
  const ms = await Promise.all(bufs.map((b) => sharp(b).metadata()));
  const comp = [];
  let x = 0;
  bufs.forEach((b, i) => { comp.push({ input: b, left: x, top: 0 }); x += ms[i].width + gap; });
  return sharp({ create: { width: x - gap, height: Math.max(...ms.map((m) => m.height)), channels: 4, background: '#ff00ff' } }).composite(comp).png().toBuffer();
};
const meia = (arq) => sharp(arq).resize(576, 324).png().toBuffer();

// 01 — the old `derelict` bands poking into the F4 corridor: his print, then before × after (live).
await salvar(await sharp(PRINT).png().toBuffer(), '01a-print-dele');
await salvar(await lado([await meia(`${W}/ad/frente-t48-antes.png`), await meia(`${W}/ad/frente-t48-depois.png`)]), '01b-bandas-antes-depois');
await salvar(await lado([await recorte(`${W}/ad/frente-t48-antes.png`, 0, 470, 640, 178), await recorte(`${W}/ad/frente-t48-depois.png`, 0, 470, 640, 178)]), '01c-bandas-detalhe');
// 02 — the duct border seams: in game (top wall), then the tile mock-up.
await salvar(await recorte(`${V4}/0047-F4-t84.4.png`, 0, 40, 1152, 250), '02a-duto-emendas-no-jogo');
await salvar(await sharp(`${W}/mock/f4-faixa-c-ladrilho.png`).png().toBuffer(), '02b-duto-ladrilho-antes-depois');
// 03 — the ribs border, same cause, milder.
await salvar(await sharp(`${W}/mock/f4-faixa-b-ladrilho.png`).png().toBuffer(), '03-costelas-ladrilho-antes-depois');
// 04 — the duct's end and the chamber painting entering with a straight edge.
await salvar(await sharp(`${V4}/0061-F4-t112.4.png`).png().toBuffer(), '04a-fim-do-duto');
await salvar(await sharp(`${W}/mock/pintura-f4-emenda.png`).png().toBuffer(), '04b-pintura-emenda-antes-depois');
// 05 — the black boxes of the dense rock belt (F2/F3).
await salvar(await sharp(`${V}/0160-F3-t26.2.png`).png().toBuffer(), '05a-caixas-pretas-f3');
await salvar(await sharp(`${W}/mock/belt-2-pontas.png`).png().toBuffer(), '05b-cinturao-pontas-antes-depois');
// 06 — the Leviathan's tail at scale 3.4.
await salvar(await sharp(`${V}/0186-F3-t70.9.png`).png().toBuffer(), '06-rabo-do-leviata');
// 07 — pixel density: the grey wreck (scale up to 1.6) in the F4 interior.
await salvar(await recorte(`${V4}/0033-F4-t56.4.png`, 80, 380, 420, 260, 1.5), '07-destroco-na-f4');
// 08 — the boss death smoke as round dots.
await salvar(await lado([await recorte(`${V}/0047-F1-t85.4.png`, 700, 280, 420, 260), await recorte(`${V}/0128-F2-t114.4.png`, 780, 240, 372, 260)]), '08-fumaca-bolinhas');
// 09 — the HUD's developer labels.
await salvar(await recorte(`${V}/0039-F1-t69.5-chefe.png`, 0, 0, 1152, 46), '09a-hud-f1');
await salvar(await recorte(`${V}/0068-F2-t0.7.png`, 0, 0, 1152, 46), '09b-hud-f2');
// 10 — the end screen.
await salvar(await sharp(`${V4}/0104-GameOver.png`).png().toBuffer(), '10-tela-final');
// 11 — the menu subtitle.
await salvar(await recorte(`${V}/0000-menu.png`, 300, 230, 560, 120, 1.5), '11-menu-subtitulo');
// 12 — full-screen colour flashes in the cutscenes (real time).
const rt = (d, pre) => `${W}/${d}/${fs.readdirSync(`${W}/${d}`).find((f) => f.startsWith(pre))}`;
await salvar(await lado([await sharp(rt('rt-i1', '004-')).resize(380, 214).toBuffer(), await sharp(rt('rt-i1', '020-')).resize(380, 214).toBuffer(), await sharp(rt('rt-i3', '022-')).resize(380, 214).toBuffer()]), '12-flashes');
// 13 — the flat red explosion in the 1st cutscene (real time).
await salvar(await sharp(rt('rt-i1', '028-')).png().toBuffer(), '13-explosao-chapada');
// 14 — drones in a row, overlapping.
await salvar(await sharp(`${V}/0011-F1-t20.png`).png().toBuffer(), '14-drones-sobrepostos');
// 15 — the two different arrow hints.
await salvar(await lado([await recorte(`${V}/0034-F1-t63-mesa-depois-da-mesa.png`, 330, 600, 500, 40, 1.4), await recorte(`${V}/0140-Interlude2.png`, 340, 458, 480, 32, 1.4)]), '15-setas-das-dicas');
