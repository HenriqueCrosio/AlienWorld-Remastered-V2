// THE GUARDIAN'S NEW LAYERS WITH THEIR SOUND (23/11, step 6 — him: "monte uma folha com a fase das ondas sonoras e dos
// respingos… com os sons, efeitos, com trilha e sem"). REAL TIME (the sound is real time, so the game is too): the
// canvas through `captureStream` and the game's whole audio (Phaser's master volume node — the effects AND the track
// both end there) through a MediaStreamDestination, into one MediaRecorder; then ffmpeg → mp4 (×3, nearest).
// The F4 boss practice (the K path) at 33–0 %, the layers' locks already open; a ship that READS each attack
// (the squeeze: to the gap's height when the ring swells; the ceiling: in a gap of the 1st wave, then into its old column),
// never damaged (not invulnerable: that blinks) and not firing. The sequence: the squeeze with the HIGH gap, the squeeze with the LOW gap, the bleeding
// ceiling.
//   npm run dev, then  node scripts/_guardiao/_filmar-som.mjs <out.mp4> [--sem-trilha] [--porta 5173]
//     [--acoes aperto,aperto,teto]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const SEM_TRILHA = process.argv.includes('--sem-trilha');
const ACOES = arg('--acoes', 'aperto,aperto,teto').split(',');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
// the K path: the F4 boss practice
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
// the stage track (the game's own instance: `window.__music`) — wait for it to sound, or stop it
if (!SEM_TRILHA) await page.waitForFunction(() => window.__music?.diagnostico().tocando, null, { timeout: 30000 }).catch(() => console.log('(a trilha não tocou)'));

const info = await page.evaluate(async ({ SEM_TRILHA, ACOES }) => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  const b = s.boss;
  const Music = window.__music;
  if (SEM_TRILHA) Music.stop(s, 0);
  // (no damage, but NOT invulnerable: the invulnerable ship blinks — the robot reads every attack anyway)
  s.damageShip = () => {};
  b.hpGuardiao = b.constructor.HP_GUARDIAO * 0.2;
  for (const a of ['serpentes', 'aperto', 'teto']) b.vistas.add(a);
  b.serra?.destroy?.();
  b.serra = null;
  b.acao = 'flutua';
  b.acaoT = 1.2;
  b.vezAperto = 0;
  // the sequence: each time he floats again, the next of ACOES; the salvo stays off (the layers alone)
  window.__fila = [...ACOES];
  b.proxima = window.__fila.shift();
  window.__fim = false;
  const casa = { x: 80, y: 110 };
  s.ship.setPosition(casa.x, casa.y);
  let antes = 'flutua';
  s.events.on('update', () => {
    b.cdTiro = 99;
    if (b.acao === 'flutua' && antes !== 'flutua') {
      if (window.__fila.length) { b.proxima = window.__fila.shift(); b.acaoT = Math.min(b.acaoT, 1.4); }
      else window.__fim = true;
    }
    antes = b.acao;
    // the robot reads the attack
    const V = 110 / 60;
    let alvo = casa;
    const ap = b.borda.atual;
    if (b.acao === 'aperto' && ap && ap.vaoY && ap.fase !== 'aviso') alvo = { x: casa.x, y: ap.vaoY };
    if (b.acao === 'teto' && b.teto) {
      const T = b.teto.constructor;
      const A = [32, 96, 160, 224], B = [64, 128, 192, 256];
      const perto = (xs) => xs.reduce((m, x) => (Math.abs(x - s.ship.x) < Math.abs(m - s.ship.x) ? x : m), xs[0]);
      const passou = b.teto.t >= T.ultima(0) + T.queda(36, s.ship.y + 8.5);
      if (b.teto.t >= T.inicio(0)) alvo = { x: passou ? perto(A) : perto(B), y: casa.y };
    }
    const dx = alvo.x - s.ship.x, dy = alvo.y - s.ship.y, d = Math.hypot(dx, dy);
    if (d > 0.5) s.ship.setPosition(s.ship.x + (dx / d) * Math.min(d, V), s.ship.y + (dy / d) * Math.min(d, V));
  });
  // the recorder: the canvas + everything the game sends to the speakers
  const ctx = window.__som.contexto();
  const dest = ctx.createMediaStreamDestination();
  g.sound.masterVolumeNode.connect(dest);
  const tela = g.canvas.captureStream(60);
  const fluxo = new MediaStream([...tela.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const tipo = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
  const rec = new MediaRecorder(fluxo, { mimeType: tipo, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  window.__pedacos = [];
  rec.ondataavailable = (e) => window.__pedacos.push(e.data);
  rec.start(500);
  window.__rec = rec;
  window.__t0 = performance.now();
  return { tipo, w: g.canvas.width, h: g.canvas.height, trilha: Music.faixaAtual() };
}, { SEM_TRILHA, ACOES });
console.log('gravando', JSON.stringify(info));

await page.waitForFunction(() => window.__fim, null, { timeout: 180000, polling: 200 });
await page.waitForTimeout(1500);
const fps = await page.evaluate(() => window.__game.loop.actualFps);
const b64 = await page.evaluate(async () => {
  await new Promise((r) => { window.__rec.onstop = r; window.__rec.stop(); });
  const blob = new Blob(window.__pedacos, { type: 'video/webm' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { dados: btoa(s), seg: (performance.now() - window.__t0) / 1000 };
});
await browser.close();
const dir = mkdtempSync(join(tmpdir(), 'guardiao-som-'));
const webm = join(dir, 'cru.webm');
writeFileSync(webm, Buffer.from(b64.dados, 'base64'));
// ×3 nearest (the pixel stays a pixel), constant 30 fps, h264 + aac for every browser
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', webm, '-vf', 'fps=30,scale=1152:648:flags=neighbor', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
console.log(`${OUT}  ${b64.seg.toFixed(1)} s, o jogo a ${fps.toFixed(0)} q/s`);
