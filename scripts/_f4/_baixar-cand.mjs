// FATIA 7 · baixa as 16 candidaturas de cada um dos 4 objetos do Henrique no PixelLab.
// ⚠️ Elas foram REPROVADAS COMO FAIXA (não sangram nas bordas) — o que se procura aqui é outra
// coisa: peça de CENÁRIO com silhueta, que é justamente o que `create_1_direction_object` faz bem.
import fs from 'fs';
import path from 'path';

const BASE = 'https://backblaze.pixellab.ai/file/pixellab-characters/objects/f7282f36-b779-4f64-832a-4693ca4cc628';
const OBJ = {
  A: 'be88daa1-175e-4e5e-b794-557d762c6c7f', // passarela de aço engolida pela carne (azul/âmbar)
  B: '0884adc1-2a87-42e6-947f-ecc476ddac9c', // anéis de cartilagem, traqueia (índigo frio)
  C: 'b9771d81-d557-4679-825c-eb3cbb2fadf3', // carne muscular densa com cordões nervosos (carmim)
  D: '0dcb4148-4bd4-4779-8d57-c0bca6fa723e', // fibras de tendão, chão de arena (quase preto)
};

const dir = 'scripts/_f4/_cand';
fs.mkdirSync(dir, { recursive: true });

for (const [letra, id] of Object.entries(OBJ)) {
  for (let i = 0; i < 16; i++) {
    const destino = path.join(dir, `${letra}-${String(i).padStart(2, '0')}.png`);
    if (fs.existsSync(destino)) continue;
    const r = await fetch(`${BASE}/${id}/rotations/frame_${i}.png`);
    if (!r.ok) { console.log(`✘ ${letra}-${i}: HTTP ${r.status}`); continue; }
    fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  }
  console.log(`✔ ${letra} — 16 candidaturas`);
}
