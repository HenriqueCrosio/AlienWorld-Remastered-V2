// 27/10 — stills out of a finished film (to check a film before it goes on the sheet): the webm played in a page at its
// own size, seeked to each second asked, and photographed (a file:// video taints a canvas: it is the page's screenshot).
//   node scripts/_inimigos/_quadros-filme.mjs <film.webm> <out-prefix> <s1> [s2 …]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [FILME, OUT, ...TEMPOS] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve(FILME)).href);
await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1);
const { w, h, dur } = await page.evaluate(() => {
  const v = document.querySelector('video');
  document.body.style.margin = '0';
  document.body.style.background = '#000';
  v.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;object-fit:contain';
  v.controls = false;
  return { w: v.videoWidth, h: v.videoHeight, dur: v.duration };
});
await page.setViewportSize({ width: w, height: h });
console.log(`${FILME}: ${dur.toFixed(2)} s, ${w}×${h}`);
for (const t of TEMPOS.map(Number)) {
  await page.evaluate(async (t) => {
    const v = document.querySelector('video');
    v.pause();
    await new Promise((ok) => {
      v.onseeked = ok;
      v.currentTime = Math.min(t, v.duration - 0.01);
    });
  }, t);
  const arq = `${OUT}-${String(t).replace('.', '_')}.png`;
  await page.screenshot({ path: arq });
  console.log(arq);
}
await browser.close();
