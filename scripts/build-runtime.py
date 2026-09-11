#!/usr/bin/env python3
"""Create the original flat runtime ZIP, reproducibly, without changing source files.

ZIP_STORED deliberately avoids cross-platform zlib differences. The complete
runtime is approximately 2 MB; stable byte hashes are more useful than saving
approximately 1.5 MB on this custom package.
"""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED
import json
import stat
import sys


def build(root: Path, output: Path) -> Path:
    root = root.resolve()
    names = [Path('system.json'), Path('altered-carbon-rpg.mjs')]
    for folder in ('module', 'data', 'lang', 'styles', 'templates'):
        directory = root / folder
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError(f'Missing or unsafe runtime directory: {folder}')
        for entry in directory.rglob('*'):
            if entry.is_symlink():
                raise ValueError(f'Symlinks are not allowed in a release: {entry}')
            if entry.is_file():
                names.append(entry.relative_to(root))
    for name in names:
        entry = root / name
        if not entry.is_file() or entry.is_symlink():
            raise ValueError(f'Missing or unsafe runtime file: {name}')
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w', compression=ZIP_STORED) as archive:
        for name in sorted(names, key=lambda p: p.as_posix()):
            info = ZipInfo(name.as_posix(), date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = ZIP_STORED
            archive.writestr(info, (root / name).read_bytes())
    return output


if __name__ == '__main__':
    root = Path.cwd()
    version = json.loads((root / 'system.json').read_text(encoding='utf-8'))['version']
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / f'altered-carbon-rpg-v{version}.zip'
    print(build(root, output))
