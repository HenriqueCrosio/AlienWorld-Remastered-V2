// INSTALA a pintura do hangar da cutscene 3: vaza as janelas e reduz para a resolução do jogo.
//
// ⚠️ ELA NÃO SUBSTITUI O `hangar.png`. Aquele arquivo é a parede de fundo da FASE 4 (Parallax
// modo `interior`), e a Fase 4 é a Fatia 7. Esta pintura entra como asset NOVO.
//
// ⚠️ A REDUÇÃO SAI DO ORIGINAL DE 1672x940, nunca de uma versão já reduzida — a lição do Zero-G:
// sem original guardado, um passo de reamostragem a mais custa DETALHE e o Henrique reprova.
//
// uso: node scripts/instalar-cut3.mjs
import { execFileSync } from 'node:child_process';

const ORIG = 'assets/raw/paint-bg-cut3-original.png';
const VAZADA = 'assets/raw/paint-bg-cut3-vazada.png';
const SAIDA = 'public/sprites/paint-bg-cut3.png';

/**
 * As cinco janelas, MEDIDAS — os centroides das regiões neutras conexas do original
 * (ver o plano, Task 1 passo 2). Da esquerda para a direita. NÃO são chutes: cada uma
 * saiu da varredura, e o vazador aborta se a semente não casar com o cinza do xadrez.
 */
const SEMENTES = ['127,378', '341,375', '836,385', '1332,372', '1546,380'];

execFileSync('node', ['scripts/vazar-por-sementes.mjs', ORIG, VAZADA, ...SEMENTES], {
  stdio: 'inherit',
});
execFileSync('node', ['scripts/paint-bg.mjs', VAZADA, SAIDA, '384', '216'], { stdio: 'inherit' });
console.log(`${SAIDA} pronto`);
