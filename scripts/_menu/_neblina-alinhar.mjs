import sharp from 'sharp';
const S='C:/Users/Henrique/AppData/Local/Temp/claude/0048f17c995fe4db/fa289f9e-2614-44fc-9d57-de323ecab7cf/';
const P='public/sprites/menu/k4/';
// composite painting at 384x216 grayscale
const full = await sharp(P+'ceu.png').composite([{input:P+'cidade.png'}]).png().toBuffer();
const comp = await sharp(full).resize(384,216).greyscale().raw().toBuffer();
const shot = sharp(S+'images/1.png');
let best=null;
for (let s=0.98; s<=1.12; s+=0.005){
  const W=Math.round(1643/(s*4)), H=Math.round(861/(s*4)); // screenshot size in game px
  const g = await shot.clone().resize(W,H).greyscale().raw().toBuffer();
  for(let ox=0; ox<=384-W+0 && ox<=Math.max(0,384-W); ox++) for(let oy=0; oy<=216-H; oy++){
    let e=0,n=0; for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){const a=g[y*W+x],b=comp[(y+oy)*384+x+ox];e+=Math.abs(a-b);n++}
    e/=n; if(!best||e<best.e)best={e,s,W,H,ox,oy};
  }
}
console.log(best);
