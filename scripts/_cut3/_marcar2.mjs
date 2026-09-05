import sharp from 'sharp';
const Z=3;
const arte=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha()
 .resize(384*Z,216*Z,{kernel:'nearest'}).png().toBuffer();
const W=384*Z,H=216*Z;
const fundo=Buffer.alloc(W*H*4);
for(let i=0;i<W*H;i++){fundo[i*4]=255;fundo[i*4+1]=0;fundo[i*4+2]=255;fundo[i*4+3]=255;}
await sharp(fundo,{raw:{width:W,height:H,channels:4}})
 .composite([{input:arte,top:0,left:0}]).png().toFile('scripts/_cut3/_marca-janelas.png');
// e um recorte ampliado da borda da janela central, 6x
await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha()
 .extract({left:120,top:40,width:80,height:60}).resize(80*6,60*6,{kernel:'nearest'})
 .flatten({background:'#ff00ff'}).png().toFile('scripts/_cut3/_marca-borda.png');
console.log('ok');
