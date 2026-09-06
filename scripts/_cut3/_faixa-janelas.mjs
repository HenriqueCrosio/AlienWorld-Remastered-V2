import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
let y0=1e9,y1=-1;
for(let y=0;y<H;y++){let n=0;
 for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]<20)n++;
 if(n>4){if(y<y0)y0=y;if(y>y1)y1=y;}}
console.log('faixa das janelas: y='+y0+'..'+y1+'  (altura '+(y1-y0+1)+'px)');
console.log('centro da faixa: y='+Math.round((y0+y1)/2));
// e a largura util de cada janela, para dimensionar a nadadeira
let x0=1e9,x1=-1;
for(let x=0;x<W;x++){let n=0;
 for(let y=0;y<H;y++)if(data[(y*W+x)*4+3]<20)n++;
 if(n>4){if(x<x0)x0=x;if(x>x1)x1=x;}}
console.log('extensao horizontal das janelas: x='+x0+'..'+x1);
