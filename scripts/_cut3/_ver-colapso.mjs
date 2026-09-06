// O FIM DA CENA: a boca selada. Só existe depois de o jogador escolher a nave, entao a captura
// TEM de jogar a cena — espera cega nunca chega aqui.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:384,height:216}});
page.on('pageerror',e=>console.log('[ERRO] '+e.message));
await page.goto('http://localhost:5173/',{waitUntil:'networkidle'});
await page.waitForTimeout(1200);
await page.evaluate(()=>{window.__game.scene.stop('Menu');
 window.__game.scene.start('Interlude3',{score:4200,handling:'diegetico',naveId:'arauto'});});
let painel=false;
for(let i=0;i<60&&!painel;i++){painel=await page.evaluate(()=>{const s=window.__game.scene.getScenes(true)[0];return !!s.panel;});
 if(!painel)await page.waitForTimeout(400);}
await page.keyboard.press('8');await page.waitForTimeout(400);
await page.keyboard.press('Enter');await page.waitForTimeout(300);
await page.keyboard.press('Enter');
// 6 quadros ao longo do colapso, 700ms cada
const tiras=[];
for(let i=0;i<6;i++){await page.waitForTimeout(700);tiras.push(await page.screenshot());}
const Z=2;
const comp=tiras.map((b,i)=>({input:b,left:(i%3)*384*Z,top:((i/3)|0)*216*Z}));
const escalados=await Promise.all(tiras.map(b=>sharp(b).resize(384*Z,216*Z,{kernel:'nearest'}).png().toBuffer()));
await sharp({create:{width:384*Z*3,height:216*Z*2,channels:4,background:{r:0,g:0,b:0,alpha:1}}})
 .composite(escalados.map((b,i)=>({input:b,left:(i%3)*384*Z,top:((i/3)|0)*216*Z})))
 .png().toFile('scripts/_cut3/colapso.png');
console.log('scripts/_cut3/colapso.png — 6 quadros do colapso, 2x');
await browser.close();
