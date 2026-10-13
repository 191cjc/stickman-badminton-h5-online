#!/usr/bin/env python3
"""Normalize JPEXS SVG exports to draw entries with original anchor offsets."""
import argparse
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SVG = '{http://www.w3.org/2000/svg}'
FFDEC = '{https://www.free-decompiler.com/flash}'
XLINK = '{http://www.w3.org/1999/xlink}'
ET.register_namespace('', SVG[1:-1])
ET.register_namespace('xlink', XLINK[1:-1])


def normalize(source, target, definitions):
    raw = source.read_bytes()
    root = ET.fromstring(raw)
    # Keep original JPEG bitstreams rather than JPEXS's much larger lossless
    # PNG encoding of the decoded JPEG. This introduces no new recompression.
    for pattern in root.findall('.//' + SVG + 'pattern'):
        match = re.fullmatch(r'PatternID_(\d+)_\d+', pattern.get('id', ''))
        if match:
            shape = definitions.get(int(match.group(1)))
            if shape is not None:
                bitmap_ids = {int(style.get('bitmapId')) for style in shape.findall('.//fillStyles/item') if style.get('bitmapId') not in (None, '65535')}
                if len(bitmap_ids) == 1:
                    bitmap = definitions[next(iter(bitmap_ids))]
                    jpeg_hex = bitmap.get('imageData') if bitmap.get('type') == 'DefineBitsJPEG2Tag' else bitmap.get('jpegData')
                    if jpeg_hex:
                        jpeg = bytes.fromhex(jpeg_hex)
                        assert jpeg.startswith(b'\xff\xd8') and jpeg.endswith(b'\xff\xd9')
                        for image in pattern.findall('.//' + SVG + 'image'):
                            image.set(XLINK+'href','data:image/jpeg;base64,' + base64.b64encode(jpeg).decode())
    width = float(root.get('width').removesuffix('px'))
    height = float(root.get('height').removesuffix('px'))
    anchor = root.find(SVG+'g').get('transform')
    values = [float(n) for n in re.findall(r'[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?', anchor)]
    assert len(values) == 6 and values[:4] == [1,0,0,1], anchor
    x,y = -values[4], -values[5]
    for node in root.iter():
        assert node.tag not in [SVG+'script',SVG+'foreignObject',SVG+'a']
        for key,value in list(node.attrib.items()):
            if key.startswith(FFDEC):
                del node.attrib[key]
            elif key.lower().startswith('on'):
                raise ValueError('SVG event handler')
            elif key in ['href',XLINK+'href']:
                assert value.startswith(('#','data:image/')), value
    root.set('viewBox',f'0 0 {width} {height}')
    target.parent.mkdir(parents=True,exist_ok=True)
    ET.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
    return dict(path=str(target.relative_to(ROOT/'public/classic')),x=x,y=y,width=width,height=height)


def run(intermediate, export_dir):
    original = ET.parse(gzip.open(ROOT/'reference/flash-90302/original.xml.gz')).getroot()
    definitions = {int(tag.get('shapeId', tag.get('characterID', '0'))):tag for tag in original.find('tags') if tag.get('type', '').startswith(('DefineShape', 'DefineBits'))}
    specs = json.loads((intermediate/'export-specs.json').read_text())
    manifest = dict(schema=1,fps=60,coordinateSystem=dict(width=640,height=426),
        source=dict(url='https://www.4399.com/flash/90302.htm',swfSha256='cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912',
                    license='No open-source license verified; original artwork and copyright retained'),body={},swings={})
    for spec in specs:
        folder = next(p for p in export_dir.iterdir() if p.is_dir() and (p.name == f'DefineSprite_{spec["symbol"]}' or p.name.startswith(f'DefineSprite_{spec["symbol"]}_')))
        frames = []
        for frame in range(1,spec['frames']+1):
            filename = f'{spec["name"]}-{frame:02d}.svg'
            target = ROOT/'public/classic'/spec['kind']/filename
            frames.append(normalize(folder/f'{frame}.svg',target,definitions))
        if spec['kind'] in ['body','swings']:
            manifest[spec['kind']][spec['name']] = frames
        elif spec['kind'] == 'net':
            manifest['net'] = frames[0]
            manifest['netFrames'] = frames
        else:
            manifest[spec['kind']] = frames[0]
    hashes = {str(p.relative_to(ROOT/'public/classic')):hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted((ROOT/'public/classic').rglob('*.svg'))}
    manifest['files'] = hashes
    (ROOT/'public/classic/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'images':len(hashes),'bytes':sum(p.stat().st_size for p in (ROOT/'public/classic').rglob('*.svg'))}))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--intermediate',type=Path,default=ROOT/'artifacts/flash-asset-build')
    p.add_argument('--export-dir',type=Path,default=ROOT/'artifacts/flash-asset-build/exported')
    args = p.parse_args()
    run(args.intermediate,args.export_dir)
