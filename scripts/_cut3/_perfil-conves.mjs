import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
// 1) o pixel mais "amarelo" da imagem, para calibrar o limiar em vez de chutar
let best=null;
for(let i=0;i<W*H;i++){const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
 if(data[i*4+3]<200)continue;
 const am=Math.min(r,g)-b;            // quanto de amarelo (r e g altos, b baixo)
 if(!best||am>best.am)best={am,r,g,b,x:i%W,y:(i/W)|0};}
console.log('pixel mais amarelo:',JSON.stringify(best));
// 2) perfil por linha: quantos pixels amarelos com limiar derivado
const LIM=Math.round(best.am*0.55);
console.log('limiar derivado: min(r,g)-b >= '+LIM);
console.log('linha  px amarelos');
const linhas=[];
for(let y=0;y<H;y++){let n=0;
 for(let x=0;x<W;x++){const p=(y*W+x)*4;
  if(data[p+3]<200)continue;
  if(Math.min(data[p],data[p+1])-data[p+2]>=LIM)n++;}
 if(n>20){console.log(String(y).padStart(5),n);linhas.push(y);}}
if(linhas.length)console.log('faixa: y='+linhas[0]+'..'+linhas[linhas.length-1]+'  TOPO='+linhas[0]);
else console.log('nenhuma linha passou -- a faixa nao e amarela o bastante');
