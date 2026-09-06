import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
// AMARELO da faixa de perigo: quente e saturado.
console.log('linha  px amarelos');
for(let y=0;y<H;y++){let n=0;
 for(let x=0;x<W;x++){const p=(y*W+x)*4,r=data[p],g=data[p+1],b=data[p+2];
  if(data[p+3]>200&&r>110&&g>85&&b<70&&r-b>60)n++;}
 if(n>20)console.log(String(y).padStart(5),n);}
