// PixelLab pela REST v2 a partir de PNG LOCAL (o MCP pede a imagem em base64 inline, que trunca).
// A chave fica em `.env.pixellab` (gitignored). Cada chamada salva a resposta crua em `<saida>.job.json`
// antes de esperar — se o terminal cair, o job não se perde.
//
//   node scripts/_f4/_pl.mjs edit <entrada.png> <saida.png> "<descrição>"
//       edit-image-pro-flash, só texto, fundo transparente (~9 gerações em 256²)
//   node scripts/_f4/_pl.mjs anim|mini <primeiro.png> <dir-saida> <quadros> "<ação>" [ultimo.png]
//       animate-with-text-v3 (o motor que segurou o estilo da S no giro) — quadros 4..16, par
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
if (!TOKEN) throw new Error('PIXELLAB_SECRET não encontrada em .env.pixellab');
const API = 'https://api.pixellab.ai/v2';
const b64 = (f) => ({ type: 'base64', base64: fs.readFileSync(f).toString('base64'), format: 'png' });

const post = async (rota, corpo) => {
  const r = await fetch(`${API}${rota}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${rota}: HTTP ${r.status} — ${JSON.stringify(j).slice(0, 500)}`);
  return j;
};

const esperar = async (jobId) => {
  for (let i = 0; i < 240; i++) {
    const j = await (await fetch(`${API}/background-jobs/${jobId}`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
    if (j.status === 'completed') return j;
    if (j.status === 'failed') throw new Error(`job falhou: ${JSON.stringify(j).slice(0, 800)}`);
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error(`timeout no job ${jobId}`);
};

/** Acha as imagens no resultado, onde quer que venham: {base64}, data URL ou URL https. */
const imagens = (no, achadas = []) => {
  if (!no || typeof no !== 'object') return achadas;
  if (Array.isArray(no)) { no.forEach((x) => imagens(x, achadas)); return achadas; }
  if (typeof no.base64 === 'string' && no.base64.length > 100) achadas.push({ base64: no.base64 });
  else if (typeof no.url === 'string' && /^https?:|^data:/.test(no.url)) achadas.push({ url: no.url });
  for (const [k, v] of Object.entries(no)) if (k !== 'base64' && k !== 'url') imagens(v, achadas);
  return achadas;
};

const gravar = async (img, arquivo) => {
  let buf;
  if (img.base64) buf = Buffer.from(img.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  else if (img.url.startsWith('data:')) buf = Buffer.from(img.url.split(',')[1], 'base64');
  else buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
  fs.writeFileSync(arquivo, buf);
};

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'edit') {
  const [entrada, saida, descricao] = args;
  const r = await post('/edit-image-pro-flash', { image: b64(entrada), method: 'text', description: descricao, no_background: true });
  fs.writeFileSync(`${saida}.job.json`, JSON.stringify(r, null, 2));
  const imgsDiretas = imagens(r);
  const fim = imgsDiretas.length ? r : await esperar(r.background_job_id ?? r.job_id);
  fs.writeFileSync(`${saida}.job.json`, JSON.stringify({ inicio: r, fim: { ...fim, last_response: '[omitido]' } }, null, 2));
  const achadas = imagens(fim);
  if (!achadas.length) throw new Error(`sem imagem no resultado: ${JSON.stringify(fim).slice(0, 800)}`);
  await gravar(achadas[0], saida);
  console.log(saida, `(${achadas.length} imagem)`, JSON.stringify(fim.usage ?? r.usage ?? {}));
} else if (cmd === 'anim' || cmd === 'mini') {
  const [primeiro, dir, quadros, acao, ultimo] = args;
  fs.mkdirSync(dir, { recursive: true });
  // `mini` = PixMiniMax: movimento mais SOLTO que o v3 (o v3 tende a "quase idle" em gesto grande — a
  // morte de 16/09); quadros em múltiplos de 4 (4..40). `anim` = v3: segura melhor o traço do 1º quadro.
  const r =
    cmd === 'mini'
      ? await post('/animate-pixminimax', {
          first_frame: b64(primeiro),
          ...(ultimo ? { last_frame: b64(ultimo) } : {}),
          description: acao,
          frame_count: Number(quadros),
          no_background: true,
        })
      : await post('/animate-with-text-v3', {
          first_frame: b64(primeiro),
          ...(ultimo ? { last_frame: b64(ultimo) } : {}),
          action: acao,
          frame_count: Number(quadros),
          no_background: true,
        });
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({ inicio: r, acao }, null, 2));
  const fim = await esperar(r.background_job_id);
  const achadas = imagens(fim);
  if (!achadas.length) throw new Error(`sem quadros no resultado: ${JSON.stringify(fim).slice(0, 800)}`);
  for (const [i, img] of achadas.entries()) await gravar(img, path.join(dir, `${i}.png`));
  fs.writeFileSync(path.join(dir, 'job.json'), JSON.stringify({ inicio: r, acao, quadros: achadas.length, usage: fim.usage }, null, 2));
  console.log(dir, `${achadas.length} quadros`, JSON.stringify(fim.usage ?? {}));
} else {
  console.error('uso: edit <entrada> <saida> "<desc>" | anim|mini <primeiro> <dir> <quadros> "<ação>" [ultimo]');
  process.exit(1);
}
