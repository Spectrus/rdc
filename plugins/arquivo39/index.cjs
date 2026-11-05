'use strict';
// Only publishes the user-approved Arquivo ’39. Never changes other works.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const APP = path.join(ROOT, 'arquivo-39');
const FILES = {
  'index.html': '3e89cbe6b25bc9d6ec9a8532022d67907498767ea9f9e45117c6bde276381649',
  'metadata.json': '9c088c0e5f9694da1d342358cac0591329b4e63b33cb644ec75569829ad3b79c',
  'capa.jpg': '65adbc5fcb1e9d6e1970df8ab4a53c4fdcbef59b555663d8ae004dbc6f6dd3e9'
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function verified(directory) {
  try {
    for (const [name, digest] of Object.entries(FILES)) {
      if (hash(await fs.readFile(path.join(directory, name))) !== digest) return false;
    }
    return true;
  } catch { return false; }
}
async function restorePublished() {
  // Durable fallback after cache eviction: the published production snapshot.
  // Every byte is checked against the approved package before it is accepted.
  const buffers = [];
  for (const [name, digest] of Object.entries(FILES)) {
    const response = await fetch('https://rdcguardandomomentos.com.br/arquivo-39/' + name,
      { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error('Publication is not yet available on production.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 35000000 || hash(bytes) !== digest) throw new Error('Published asset failed verification.');
    buffers.push([name, bytes]);
  }
  await fs.mkdir(APP, { recursive: true });
  for (const [name, bytes] of buffers) await fs.writeFile(path.join(APP, name), bytes);
}
async function injectCatalogue(directory) {
  const filename = path.join(directory, 'index.html');
  let html = await fs.readFile(filename, 'utf8');
  const marker = '// ARQUIVO39_APPROVED_PUBLICATION';
  if (html.includes(marker)) return;
  const anchor = 'const itens = [';
  if (html.split(anchor).length !== 2) throw new Error('Catalogue structure changed; refusing unrelated modifications.');
  const metadata = JSON.parse(await fs.readFile(path.join(APP, 'metadata.json'), 'utf8'));
  const item = {};
  for (const key of ['title', 'author', 'year', 'type', 'button', 'link', 'description']) item[key] = metadata[key];
  item.code = '10039';
  html = html.replace(anchor, anchor + '\n      ' + marker + '\n      ' + JSON.stringify(item) + ',\n');
  await fs.writeFile(filename, html, 'utf8');
}
module.exports = {
  async onPreBuild({ utils }) {
    if (!(await verified(APP))) {
      try { await utils.cache.restore(APP); } catch { /* integrity checks below remain authoritative */ }
    }
    if (!(await verified(APP)) && process.env.ARQUIVO39_SOURCE_URL) {
      // The download URL stays in a build-scoped secret, never in the repository or logs.
      const result = spawnSync('python3', [path.join(ROOT, 'scripts/publish-arquivo39.py')],
        { cwd: ROOT, env: process.env, encoding: 'utf8', timeout: 150000 });
      if (result.status !== 0) console.log('Arquivo39: bootstrap unavailable; checking the published, verified copy.');
    }
    if (!(await verified(APP))) {
      try { await restorePublished(); }
      catch { return utils.build.failBuild('Arquivo39 assets unavailable. The previous published site is unchanged.'); }
    }
    await injectCatalogue(ROOT);
    console.log('Arquivo ’39 verified: approved title, author, Documento category and synopsis.');
  },
  async onPostBuild({ constants, utils }) {
    const publish = path.resolve(constants.PUBLISH_DIR || ROOT);
    if (!(await verified(APP))) return utils.build.failBuild('Arquivo39 asset verification failed.');
    const destination = path.join(publish, 'arquivo-39');
    if (destination !== APP) {
      await fs.mkdir(destination, { recursive: true });
      for (const name of Object.keys(FILES)) await fs.copyFile(path.join(APP, name), path.join(destination, name));
    }
    await injectCatalogue(publish);
    if (!(await verified(destination))) return utils.build.failBuild('Arquivo39 output verification failed.');
    console.log('Arquivo ’39 ready at /arquivo-39/; existing catalogue entries retained.');
  },
  async onSuccess({ utils }) {
    if (await verified(APP)) {
      try { await utils.cache.save(APP); }
      catch { console.log('Arquivo39: production snapshot remains the verified fallback.'); }
    }
  }
};
