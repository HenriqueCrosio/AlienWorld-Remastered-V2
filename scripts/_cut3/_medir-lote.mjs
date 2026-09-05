import sharp from 'sharp';
const [objId,N]=process.argv.slice(2);
const USER='f7282f36-b779-4f64-832a-4693ca4cc628';
const base=`https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations`;
console.log('quadro  lum media  px opacos  caixa real');
for(let i=0;i<Number(N);i++){
 const r=await fetch(`${base}/frame_${i}.png`);
 const {data,info}=await sharp(Buffer.from(await r.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:W,height:H}=info;
 let L=0,n=0,x0=1e9,x1=-1,y0=1e9,y1=-1;
 for(let p=0;p<W*H;p++){if(data[p*4+3]<128)continue;
  L+=0.2126*data[p*4]+0.7152*data[p*4+1]+0.0722*data[p*4+2];n++;
  const x=p%W,y=(p/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 console.log('  ['+i+']   '+String(Math.round(L/n)).padStart(6)+'   '+String(n).padStart(8)+'   '+(x1-x0+1)+'x'+(y1-y0+1));
}
