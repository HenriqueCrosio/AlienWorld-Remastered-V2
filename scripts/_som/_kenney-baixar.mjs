// BLOCK SOUND (15/11) — downloads Kenney's CC0 audio packs into assets/raw/sons/_kenney/<pack>/ (the zip, unzipped,
// with its License.txt). The page asks for a fresh signed link (`/download-link/<hex of "assets/<slug>">`).
//   node scripts/_som/_kenney-baixar.mjs sci-fi-sounds impact-sounds interface-sounds
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pacotes = process.argv.slice(2);
if (!pacotes.length) {
  console.error('uso: node scripts/_som/_kenney-baixar.mjs <slug> [<slug> …]');
  process.exitCode = 1;
}
for (const slug of pacotes) {
  const destino = join('assets/raw/sons/_kenney', slug);
  if (existsSync(join(destino, 'License.txt'))) {
    console.log(`${slug}: já baixado`);
    continue;
  }
  const pagina = await fetch(`https://kenney.nl/assets/${slug}`);
  const cookie = (pagina.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const html = await pagina.text();
  const id = /data-download-id='([0-9a-f]+)'/.exec(html)?.[1] ?? Buffer.from(`assets/${slug}`).toString('hex');
  const link = await (await fetch(`https://kenney.nl/download-link/${id}`, { headers: { cookie, referer: `https://kenney.nl/assets/${slug}` } })).json();
  if (!link.url) throw new Error(`${slug}: sem link (${JSON.stringify(link)})`);
  const zip = Buffer.from(await (await fetch(link.url)).arrayBuffer());
  mkdirSync(destino, { recursive: true });
  const arquivo = join(destino, `${slug}.zip`);
  writeFileSync(arquivo, zip);
  execFileSync('tar', ['-xf', arquivo, '-C', destino]);
  console.log(`${slug}: ${(zip.length / 1e6).toFixed(1)} MB, ${existsSync(join(destino, 'License.txt')) ? 'com' : 'SEM'} License.txt`);
}
