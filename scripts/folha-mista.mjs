import sharp from 'sharp';
const [IN, OUT] = process.argv.slice(2);
const COLS = [
  ['hoje', 'HOJE · monospace do sistema (referência)', '#9aa3b5'],
  ['silk', '0 · TUDO EM 384 · Silkscreen no pixel do mundo', '#f0a040'],
  ['pixel', 'A · MISTA PIXEL · camada 3×, Silkscreen no pixel fino (⅔)', '#f0a040'],
  ['lisa', 'B · MISTA LISA · camada 3×, Chakra Petch vetorial', '#f0a040'],
];
const TELAS = { menu: 'MENU', jogo: 'JOGO (HUD + aviso)', fim: 'FIM DE FASE', cartucho: 'MESA · CARTUCHO', compacto: 'MESA · COMPACTO', lista: 'MESA · LISTA' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
async function folha(celulas, cw, ch, cols, titulo, rodape, out, kernel) {
  const M = 16, GAP = 16, TOP = 56, LAB = 34;
  const rows = Math.ceil(celulas.length / cols);
  const W = M * 2 + cols * cw + (cols - 1) * GAP;
  const H = TOP + rows * (ch + LAB) + (rows - 1) * GAP + 44;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><style>text{font-family:Consolas,monospace;fill:#e6e8ee}</style>`;
  svg += `<text x="${M}" y="36" font-size="24" font-weight="bold">${esc(titulo)}</text>`;
  const comps = [];
  for (let i = 0; i < celulas.length; i++) {
    const [arq, rot, cor] = celulas[i];
    const x = M + (i % cols) * (cw + GAP), y = TOP + Math.floor(i / cols) * (ch + LAB + GAP);
    svg += `<text x="${x}" y="${y + 24}" font-size="18" style="fill:${cor}">${esc(rot)}</text>`;
    const img = sharp(`${IN}/${arq}.png`);
    comps.push({ input: await (cw === 1152 ? img : img.resize(cw, ch, { kernel })).png().toBuffer(), left: x, top: y + LAB });
  }
  svg += `<text x="${M}" y="${H - 16}" font-size="17" style="fill:#9aa3b5">${esc(rodape)}</text></svg>`;
  await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }, ...comps]).png().toFile(out);
}
const nota = 'Escala 1:1 da janela 1152×648 (o mundo 3×). A mista usa a mesma arte: só texto e moldura ganham o pixel fino.';
for (const [t, nome] of Object.entries(TELAS)) {
  await folha(COLS.map(([c, r, cor]) => [`${c}-${t}`, r, cor]), 1152, 648, 2, `RESOLUÇÃO MISTA · ${nome} — 29/09`, nota, `${OUT}/mista-${t}.png`);
}
const todas = [];
for (const t of Object.keys(TELAS)) for (const [c, r, cor] of COLS) todas.push([`${c}-${t}`, `${TELAS[t]} · ${r.split(' · ')[0]}${r.startsWith('HOJE') ? '' : ' ' + r.split(' · ')[1]}`, cor]);
await folha(todas, 576, 324, 4, 'RESOLUÇÃO MISTA · VISÃO GERAL (reduzida à metade — a nitidez se julga nas folhas 1:1)', 'Colunas: hoje · 0 tudo em 384 · A mista pixel · B mista lisa.', `${OUT}/mista-visao-geral.png`, 'lanczos3');
console.log('ok');
