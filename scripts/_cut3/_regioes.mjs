import sharp from 'sharp';
const {data,info}=await sharp('assets/raw/paint-bg-cut3-original.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const casa=i=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
 const s=Math.max(r,g,b)-Math.min(r,g,b);const L=lum(r,g,b);
 return s<=12&&L>=45&&L<=105;};
const visto=new Uint8Array(W*H);
const regioes=[];
for(let i=0;i<W*H;i++){
 if(visto[i]||!casa(i))continue;
 const fila=[i];visto[i]=1;let n=0,sx=0,sy=0,x0=1e9,x1=-1,y0=1e9,y1=-1;
 while(fila.length){const j=fila.pop();n++;const x=j%W,y=(j/W)|0;sx+=x;sy+=y;
  if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
  const v=[];if(x>0)v.push(j-1);if(x<W-1)v.push(j+1);if(y>0)v.push(j-W);if(y<H-1)v.push(j+W);
  for(const k of v)if(!visto[k]&&casa(k)){visto[k]=1;fila.push(k);}}
 if(n>2000)regioes.push({n,cx:Math.round(sx/n),cy:Math.round(sy/n),x0,x1,y0,y1});
}
regioes.sort((a,b)=>a.cx-b.cx);
console.log('imagem '+W+'x'+H);
console.log('regioes neutras com mais de 2000px: '+regioes.length);
for(const r of regioes)console.log('  semente '+r.cx+','+r.cy+'   '+r.n+'px   x='+r.x0+'..'+r.x1+'  y='+r.y0+'..'+r.y1);
