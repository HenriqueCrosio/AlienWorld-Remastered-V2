import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
const reg=(nome,x,y,w,h)=>{let t=0,n=0;
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){n++;if(data[((y+dy)*W+(x+dx))*4+3]<20)t++;}
 console.log('  '+nome.padEnd(26)+(t/n*100).toFixed(1)+'% transparente');};
console.log('-- parede REAL (fora de toda janela medida) --');
reg('parede topo-esq',0,0,36,40);
reg('parede entre jan 2 e 3',100,6,30,30);
reg('parede entre jan 3 e 4',258,10,26,26);
reg('parede topo-dir',356,0,28,38);
reg('parede baixo-esq',4,140,40,20);
console.log('-- convés e faixa --');
reg('CONVES',160,158,50,10);
reg('faixa de perigo',160,171,50,4);

// marca: fundo magenta sob a pintura -> tudo que estiver magenta esta vazado
const fundo=Buffer.alloc(W*H*4);
for(let i=0;i<W*H;i++){fundo[i*4]=255;fundo[i*4+1]=0;fundo[i*4+2]=255;fundo[i*4+3]=255;}
await sharp(fundo,{raw:{width:W,height:H,channels:4}})
 .composite([{input:await sharp(data,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}])
 .resize(W*3,H*3,{kernel:'nearest'}).png().toFile('scripts/_cut3/_marca-janelas.png');
console.log('marca: scripts/_cut3/_marca-janelas.png (magenta = vazado), 3x');
