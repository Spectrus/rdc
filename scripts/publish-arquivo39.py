"""Publish the approved, self-contained Arquivo ’39 without changing existing works."""
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import io
import json
import os
import zipfile

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'arquivo-39'
PACKAGE_SHA256 = '75321289b24b8f5e083c67740239fde2105d037d56ba7e81ae76d559435c9a35'
ALLOWED = {'arquivo-39/index.html', 'arquivo-39/metadata.json', 'arquivo-39/capa.jpg'}

if not (APP / 'index.html').is_file():
    source = os.environ.get('ARQUIVO39_SOURCE_URL', '')
    if not source:
        raise SystemExit('Arquivo 39 source asset is missing. Restore the committed assets or set the build-only source URL.')
    if not source.startswith('https://'):
        raise SystemExit('Source must use HTTPS.')
    try:
        with urlopen(Request(source, headers={'User-Agent': 'Arquivo39-Publisher/1.0'}), timeout=90) as response:
            payload = response.read(40_000_001)
    except Exception:
        raise SystemExit('Could not download the approved publication package; no source URL is logged.') from None
    if len(payload) > 40_000_000 or hashlib.sha256(payload).hexdigest() != PACKAGE_SHA256:
        raise SystemExit('Publication package integrity check failed.')
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        if set(archive.namelist()) != ALLOWED:
            raise SystemExit('Unexpected archive entries.')
        for entry in archive.infolist():
            if entry.file_size > 35_000_000:
                raise SystemExit('Unexpected file size.')
            destination = ROOT / entry.filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(entry))

metadata = json.loads((APP / 'metadata.json').read_text(encoding='utf-8'))
application = (APP / 'index.html').read_text(encoding='utf-8')
if metadata['title'] != 'Arquivo ’39' or 'Arquivo ’39' not in application:
    raise SystemExit('Incorrect publication title.')
if metadata['author'] != 'Reinaldo Duarte Castanheira' or metadata['type'] != 'Documento':
    raise SystemExit('Incorrect catalogue metadata.')
if 'É dessa lembrança que partimos ao encontrar' not in metadata['description']:
    raise SystemExit('Approved synopsis text missing.')
if application.count('data:image/') < 9:
    raise SystemExit('Embedded publication images are missing.')

index = ROOT / 'index.html'
text = index.read_text(encoding='utf-8')
marker = '// ARQUIVO39_APPROVED_PUBLICATION'
if marker not in text:
    anchor = 'const itens = ['
    if text.count(anchor) != 1:
        raise SystemExit('Catalogue insertion anchor changed; existing site left untouched.')
    item = {key: metadata[key] for key in ('title', 'author', 'year', 'type', 'button', 'link', 'description')}
    item['code'] = '10039'
    insertion = '\n      ' + marker + '\n      ' + json.dumps(item, ensure_ascii=False) + ',\n'
    text = text.replace(anchor, anchor + insertion, 1)
    index.write_text(text, encoding='utf-8')

print('Arquivo ’39: approved assets verified; catalogue category Documento; existing works preserved.')
