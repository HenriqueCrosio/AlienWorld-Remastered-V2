// Ref de estilo para a Aurora: o caça CINZA (paleta humana, vista lateral) ampliado para a
// LARGURA ALVO — com style_images o size é ignorado e a MAIOR ref define o tamanho de saída.
import sharp from 'sharp';
await sharp('public/sprites/ship-cinza.png')
  .resize({ width: 192, kernel: 'nearest' })
  .png()
  .toFile('scripts/_ref-aurora.png');
console.log('scripts/_ref-aurora.png (192 de largura)');
