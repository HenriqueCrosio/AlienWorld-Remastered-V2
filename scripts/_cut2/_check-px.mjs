import sharp from 'sharp';
const { data, info } = await sharp('public/sprites/doca-cinturao.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pts = [[19,73],[36,104],[32,143],[245,22],[194,92],[137,121]];
for (const [x,y] of pts) {
  const i = (y*info.width+x)*4;
  console.log(x,y,'rgba=',data[i],data[i+1],data[i+2],data[i+3]);
}
