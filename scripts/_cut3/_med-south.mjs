import sharp from 'sharp';
const USER='f7282f36-b779-4f64-832a-4693ca4cc628';
const OBJ='15f111fd-62c2-4689-9a33-93c931b5b796';
const r=await fetch(`https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}/rotations/south.png`);
const buf=Buffer.from(await r.arrayBuffer());
await sharp(buf).toFile('scripts/_cut3/_south-bruta.png');
const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
let x0=1e9,x1=-1,y0=1e9,y1=-1,n=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=data[(y*W+x)*4+3];if(a<10)continue;n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
console.log(`canvas ${W}x${H}  caixa ${x0}..${x1} x ${y0}..${y1}  =>  ${x1-x0+1}x${y1-y0+1}   ${n}px opacos`);
// perfil por LINHA dentro da caixa: quantos px opacos e a extensao horizontal
console.log('linha(rel)  px   xmin..xmax (rel a caixa)');
const alt=y1-y0+1;
for(let k=0;k<12;k++){
  const y=y0+Math.round(k*(alt-1)/11);
  let c=0,a0=1e9,a1=-1;
  for(let x=0;x<W;x++){if(data[(y*W+x)*4+3]<10)continue;c++;if(x<a0)a0=x;if(x>a1)a1=x;}
  const rel=((y-y0)/(alt-1)*100).toFixed(0);
  console.log(`  ${String(rel).padStart(3)}%  ${String(c).padStart(4)}   ${c?`${a0-x0}..${a1-x0}`:'-'}`);
}
