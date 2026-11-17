#!/usr/bin/env python3
"""Create a deterministic install ZIP from explicitly approved text files only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

RUNTIME_FILES = (
    'manifest.json', 'background.mjs', 'core.mjs', 'queue.mjs',
    'downloads.mjs', 'canvas-content.js', 'echo-content.js',
    'popup.html', 'popup.js',
)
FILES = {name: name for name in RUNTIME_FILES}
FILES['INSTALL.md'] = 'packaging/INSTALL.md'
PRIVATE_PATTERNS = {
    'local user path': r'/Users/[^\s/]+|[A-Z]:\\Users\\',
    'email address': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
    'concrete Canvas course URL': r'canvas\.sydney\.edu\.au/courses/\d',
    'concrete Echo identifier URL': r'echo360\.net\.au/(?:section|lesson)/[0-9a-f]{8}-',
    'UUID literal': r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b',
    'credential material': r'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|-----BEGIN .*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{30,}\.',
}


def package(source, output):
    manifest = json.loads((source / 'manifest.json').read_text())
    version = manifest['version']
    if not re.fullmatch(r'\d+(?:\.\d+){1,3}', version):
        raise ValueError('Unexpected extension version')
    contents = {}
    for name, source_name in FILES.items():
        path = source / source_name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'Missing file or symbolic link: {name}')
        data = path.read_bytes()
        text = data.decode('utf-8')
        for label, pattern in PRIVATE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                raise ValueError(f'Privacy review required: {label} in {name}')
        contents[name] = data
    for name, data in contents.items():
        if name.endswith('.md'):
            for target in re.findall(r'\]\(([^)]+)\)', data.decode('utf-8')):
                if not target.startswith(('https://', 'http://', '#')) and target.split('#')[0] not in contents:
                    raise ValueError(f'Unresolved package documentation link in {name}: {target}')
    required = [manifest['background']['service_worker'], manifest['action']['default_popup']]
    required += [name for script in manifest['content_scripts'] for name in script['js']]
    for name in required:
        if name not in contents:
            raise ValueError(f'Manifest dependency omitted: {name}')

    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'EchoTranscriptCompanion-v{version}.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
        for name, data in sorted(contents.items()):
            info = zipfile.ZipInfo(f'EchoTranscriptCompanion/{name}', (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            target.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(archive) as target:
        if target.testzip() is not None or len(target.namelist()) != len(FILES):
            raise ValueError('Archive integrity or file count check failed')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
    print(json.dumps({'archive': archive.name, 'version': version, 'files': len(FILES), 'sha256': digest}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    package(Path(__file__).resolve().parents[1], args.output)
