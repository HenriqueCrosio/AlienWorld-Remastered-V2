// Foto de página inteira de um HTML local (para conferir uma folha antes de mandar) e a lista de imagens que não
// carregaram. Uso: node scripts/_print-pagina.mjs <arquivo.html> <saida.png>
import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from 'playwright';

const [HTML, OUT] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(pathToFileURL(path.resolve(HTML)).href);
await p.waitForTimeout(1500);
await p.screenshot({ path: OUT, fullPage: true });
const info = await p.evaluate(() => ({
  altura: document.body.scrollHeight,
  quebradas: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src.split('/').slice(-1)[0]),
}));
console.log(JSON.stringify(info));
await b.close();
