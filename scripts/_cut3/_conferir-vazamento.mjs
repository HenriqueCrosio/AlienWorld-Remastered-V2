import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
console.log('pintura '+W+'x'+H);
const reg=(nome,x,y,w,h)=>{let t=0,n=0;
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){n++;if(data[((y+dy)*W+(x+dx))*4+3]<20)t++;}
 console.log('  '+nome.padEnd(22)+(t/n*100).toFixed(1)+'% transparente');};
console.log('-- os retangulos do plano --');
reg('janela central',185,80,30,30);
reg('janela esq 1',18,64,18,40);
reg('janela dir 2',350,64,18,40);
reg('PAREDE/visceras',55,25,30,30);
reg('CONVES',160,158,50,10);
reg('faixa de perigo',160,171,50,4);

// -- o teste forte: todo pixel transparente tem de cair dentro de uma das 5 janelas medidas --
const sx=W/1671, sy=H/940;
const CAIXAS=[[39,216,196,549],[270,418,200,547],[581,1090,188,580],[1252,1404,196,547],[1457,1641,197,547]]
  .map(([x0,x1,y0,y1])=>[Math.floor(x0*sx)-1,Math.ceil(x1*sx)+1,Math.floor(y0*sy)-1,Math.ceil(y1*sy)+1]);
let fora=0, total=0, parcial=0;
const primeiros=[];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const a=data[(y*W+x)*4+3];
 if(a<20){total++;
  if(!CAIXAS.some(([x0,x1,y0,y1])=>x>=x0&&x<=x1&&y>=y0&&y<=y1)){fora++;if(primeiros.length<8)primeiros.push(x+','+y);}
 } else if(a<250) parcial++;
}
console.log('-- o teste forte --');
console.log('  transparentes: '+total+' ('+(total/(W*H)*100).toFixed(1)+'%)');
console.log('  FORA das 5 janelas: '+fora+(primeiros.length?'   ex: '+primeiros.join(' '):''));
console.log('  alpha parcial (borda reamostrada): '+parcial);
