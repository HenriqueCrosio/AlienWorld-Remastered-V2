// O POUSO de perto: onde a base da nave para em relação ao convés pintado.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:384,height:216}});
page.on('pageerror',e=>console.log('[ERRO] '+e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForTimeout(1200);
await page.evaluate(()=>{window.__game.scene.stop('Menu');
 window.__game.scene.start('Interlude3',{score:4200,handling:'diegetico',naveId:'arauto'});});
await page.waitForTimeout(7000);
const est=await page.evaluate(()=>{const s=window.__game.scene.getScenes(true)[0];
 const n=s.children.list.find(o=>o.depth===80&&o.texture);
 return n?{x:Math.round(n.x),y:Math.round(n.y),h:Math.round(n.displayHeight),base:Math.round(n.y+n.displayHeight/2)}:null;});
console.log('nave: '+JSON.stringify(est)+'   (DECK_Y=171)');
const buf=await page.screenshot();
await sharp(buf).extract({left:0,top:120,width:384,height:96}).resize(384*3,96*3,{kernel:'nearest'})
 .composite([{input:Buffer.from('<svg width="1152" height="288" xmlns="http://www.w3.org/2000/svg">'+
  '<line x1="0" y1="'+((171-120)*3)+'" x2="1152" y2="'+((171-120)*3)+'" stroke="#00ff88" stroke-width="1" opacity="0.9"/></svg>')}])
 .png().toFile('scripts/_cut3/pouso.png');
console.log('scripts/_cut3/pouso.png (3x, linha verde = DECK_Y 171)');
await browser.close();
