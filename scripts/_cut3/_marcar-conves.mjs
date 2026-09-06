import sharp from 'sharp';
const L=Number(process.argv[2]);
const Z=3,W=384*Z,H=216*Z;
const base=await sharp('public/sprites/paint-bg-cut3.png').resize(W,H,{kernel:'nearest'}).toBuffer();
const svg='<svg width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg">'+
 '<line x1="0" y1="'+(L*Z)+'" x2="'+W+'" y2="'+(L*Z)+'" stroke="#00ff88" stroke-width="2"/>'+
 '<text x="6" y="'+(L*Z-6)+'" fill="#00ff88" font-size="18">DECK_Y '+L+'</text>'+
 // onde a NAVE de fato fica: centro em DECK_Y-7, ~14px de altura
 '<rect x="'+(150*Z)+'" y="'+((L-14)*Z)+'" width="'+(40*Z)+'" height="'+(14*Z)+'" fill="none" stroke="#ff3366" stroke-width="2"/>'+
 '<text x="'+(192*Z)+'" y="'+((L-8)*Z)+'" fill="#ff3366" font-size="16">a nave pousada</text></svg>';
await sharp({create:{width:W,height:H,channels:4,background:{r:10,g:14,b:24,alpha:1}}})
 .composite([{input:base},{input:Buffer.from(svg)}]).png().toFile('scripts/_cut3/conves-medido.png');
// e um recorte 8x da faixa, para julgar a linha de perto
await sharp('public/sprites/paint-bg-cut3.png').extract({left:120,top:150,width:150,height:40})
 .resize(150*6,40*6,{kernel:'nearest'})
 .composite([{input:Buffer.from('<svg width="'+(150*6)+'" height="'+(40*6)+'" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="'+((L-150)*6)+'" x2="'+(150*6)+'" y2="'+((L-150)*6)+'" stroke="#00ff88" stroke-width="2"/></svg>')}])
 .png().toFile('scripts/_cut3/conves-zoom.png');
console.log('scripts/_cut3/conves-medido.png + conves-zoom.png com DECK_Y='+L);
