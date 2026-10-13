#!/usr/bin/env python3
"""Rebuild art and numeric data using frozen XML and isolated JPEXS 26.3.0."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--java',type=Path,default=ROOT/'artifacts/flash-original-research/tools/jre-local/usr/lib/jvm/java-21-openjdk-amd64/bin/java')
    parser.add_argument('--ffdec',type=Path,default=ROOT/'artifacts/flash-original-research/tools/ffdec/ffdec.jar')
    args = parser.parse_args()
    for path in [args.java,args.ffdec]:
        if not path.is_file():
            raise SystemExit(f'Missing {path}; see tools/flash-assets/README.md for tool setup.')
    source = ROOT/'reference/flash-90302'; recorded = json.loads((source/'SOURCE.json').read_text())
    for name,key in [('original.swf','sha256'),('original.xml.gz','xml_gzip_sha256')]:
        assert hashlib.sha256((source/name).read_bytes()).hexdigest() == recorded[key], f'Changed frozen source: {name}'
    intermediate = ROOT/'artifacts/flash-asset-build'; exported = intermediate/'exported'
    subprocess.run([sys.executable,str(ROOT/'tools/flash-assets/extract.py')],check=True)
    command = [str(args.java),'-Djava.awt.headless=true',f'-Duser.home={intermediate / "jpexs-profile"}','-jar',str(args.ffdec)]
    version = subprocess.run(command+['-help'],check=True,capture_output=True,text=True).stdout
    assert 'JPEXS Free Flash Decompiler v.26.3.0' in version, 'Use pinned JPEXS 26.3.0'
    subprocess.run(command+['-xml2swf',str(intermediate/'art-only.xml'),str(intermediate/'art-only.swf')],check=True)
    if exported.exists():
        shutil.rmtree(exported)
    with (intermediate/'export.log').open('w') as log:
        subprocess.run(command+['-onerror','abort','-ignorebackground','-format','sprite:svg','-selectid',','.join(str(s['symbol']) for s in json.loads((intermediate/'export-specs.json').read_text())),'-export','sprite',str(exported),str(intermediate/'art-only.swf')],check=True,stdout=log,stderr=subprocess.STDOUT)
    subprocess.run([sys.executable,str(ROOT/'tools/flash-assets/finalize.py')],check=True)
    # Keep generated TypeScript formatting reproducible under repository tooling.
    subprocess.run([str(ROOT/'node_modules/.bin/prettier'),'--write',str(ROOT/'src/shared/classic/assets-data.ts')],check=True)

if __name__ == '__main__':
    main()
