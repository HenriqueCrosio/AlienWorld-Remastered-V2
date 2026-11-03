import { chromium } from 'file:///C:/Users/Henrique/Documents/Projetos%20folder/AlienWorld_resmater/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
const [arquivo, foto] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
p.on('requestfailed', (r) => erros.push('falhou ' + r.url()));
await p.goto(pathToFileURL(arquivo).href);
await p.waitForTimeout(2500);
const r = await p.evaluate(() => ({
  imgs: [...document.images].map((i) => [i.getAttribute('src'), i.naturalWidth]),
  vids: [...document.querySelectorAll('video')].map((v) => [v.getAttribute('src'), v.readyState, v.videoWidth, v.error && v.error.code]),
  largura: document.documentElement.scrollWidth,
}));
console.log(JSON.stringify(r, null, 1));
console.log('erros:', erros);
await p.screenshot({ path: foto, fullPage: false });
await b.close();
