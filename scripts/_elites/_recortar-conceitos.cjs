const sharp = require('sharp');
const out = process.argv[2];
const src = 'concept art Inimigos.png';
const crops = {
  'drone-mineracao': [20, 140, 185, 185],
  'touro': [295, 140, 175, 185],
  'sentinela': [560, 140, 180, 185],
  'drone-mineracao-vistas': [205, 165, 60, 140],
  'sentinela-vistas': [740, 175, 55, 140],
};
(async () => {
  for (const [n, [left, top, width, height]] of Object.entries(crops))
    await sharp(src).extract({ left, top, width, height }).toFile(`${out}/${n}.png`);
  console.log('ok');
})();
