// Downloads the candidates of the 24 card-icon jobs into <outdir>/<CARD_ID>/ and builds one contact sheet per card.
// Usage: node scripts/_icones-baixar.mjs <outdir> [ID ...]   (no IDs = all)
import { execFileSync } from 'child_process';

const OUT = process.argv[2];
const SO = process.argv.slice(3);
export const JOBS = {
  WPN_001: '1b65964c-bd64-43ec-8819-684d249d7025', WPN_002: 'cbcfe728-c15a-4f91-86ac-3cfb36040997',
  WPN_004: 'cd6cbb51-9f0b-43dc-911d-77572dece673', WPN_007: '2eb0b580-f26b-4df9-9adf-7cd5321d9352',
  WPN_008: 'b2881144-e7f9-40ec-8358-be491d49e056', WPN_009: '56a81d65-2888-4444-a980-0a4087a58d2c',
  WPN_010: '07bd389a-c234-4613-8b0c-cfa3d7939f81', EFF_001: '57a8e505-4eca-43f6-a549-07ddaa1ce2f0',
  EFF_002: 'e80be2ce-76e2-4f71-a570-ff259fdcd185', EFF_003: '319d0146-192f-4167-9bdd-7f5b1c514e4f',
  EFF_004: 'e8444ec4-8bcf-412e-b417-723abb0c78ac', EFF_006: '08bb3435-fde9-4eb4-9769-95860242cdec',
  EFF_007: 'b9b9d2c5-553c-4a4d-bae6-7de230c9ddac', EFF_010: 'cc9ba5c3-8baf-4416-aefa-eed70cab57ef',
  EFF_011: '5f449b64-d7eb-4cd1-8020-b12f9ca67101', EFF_012: '6f447dd2-aefa-4875-9b59-b6c6e8106b30',
  EFF_013: 'aab3ce09-92d2-4c02-8c70-2e3cbfaae452', DEF_001: 'efd7dc01-3616-4e8f-876c-3f480b510117',
  DEF_002: 'a43b730c-415b-4f67-9d39-f1c71ab20f06', DEF_003: 'acbbc4f6-55aa-4906-87e4-3d76092730c6',
  DEF_004: '785ae075-c93f-44b5-9e9d-810492908b23', DEF_005: '6c983817-9f2d-4bdc-8710-d5a25b005d75',
  MOV_001: '5cff8920-ed5b-4bfb-b834-636ae3137167', MOV_003: 'e00f0508-ed12-4fbd-a55a-534e4648eefb',
};
for (const [id, job] of Object.entries(JOBS)) {
  if (SO.length && !SO.includes(id)) continue;
  execFileSync('node', ['scripts/_contato-pixellab.mjs', job, '64', '3', OUT, id], { stdio: 'inherit' });
}
