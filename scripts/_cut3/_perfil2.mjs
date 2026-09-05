import sharp from 'sharp';
const {data,info}=await sharp('public/sprites/paint-bg-cut3.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:W,height:H}=info;
console.log('linha   R   G   B   |  px com r-b>25  |  px com r-b>40');
for(let y=140;y<200;y++){
 let R=0,G=0,B=0,q=0,q2=0;
 for(let x=0;x<W;x++){const p=(y*W+x)*4;R+=data[p];G+=data[p+1];B+=data[p+2];
  if(data[p]-data[p+2]>25)q++; if(data[p]-data[p+2]>40)q2++;}
 console.log(String(y).padStart(5),String(Math.round(R/W)).padStart(4),String(Math.round(G/W)).padStart(4),String(Math.round(B/W)).padStart(4),'   ',String(q).padStart(4),'          ',String(q2).padStart(4));
}
