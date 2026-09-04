// Dois recortes ampliados para JULGAR: o convés com as carcaças, e a nadadeira no vao das janelas.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:384,height:216}});
page.on('pageerror',e=>console.log('[ERRO] '+e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForTimeout(1200);
await page.evaluate(()=>{window.__game.scene.stop('Menu');
 window.__game.scene.start('Interlude3',{score:4200,handling:'diegetico',naveId:'arauto'});});
// a nadadeira atravessa entre t=1,2s e t=7,2s: pega ela no meio do caminho
await page.waitForTimeout(3600);
await sharp(await page.screenshot()).extract({left:0,top:36,width:384,height:104})
 .resize(384*3,104*3,{kernel:'nearest'}).png().toFile('scripts/_cut3/det-nadadeira.png');
// ⚠️ E O CONVES ANTES DO PAINEL: ele abre em t~10,1s e TAPA o conves inteiro.
await page.waitForTimeout(5500);
await sharp(await page.screenshot()).extract({left:0,top:132,width:384,height:52})
 .resize(384*3,52*3,{kernel:'nearest'}).png().toFile('scripts/_cut3/det-conves.png');
console.log('det-nadadeira.png + det-conves.png');
await browser.close();
