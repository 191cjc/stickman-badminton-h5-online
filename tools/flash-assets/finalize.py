#!/usr/bin/env python3
"""Normalize JPEXS SVG exports to draw entries with original anchor offsets."""
import argparse
import base64
import gzip
import hashlib
import json
import re
import shutil
import math
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
    # A conservative 4-sigma support plus offsets avoids outer viewport clipping.
    # Keep the converted filter tree; do not raster-tint/remove the original blur.
    padding = 0
    for flt in root.findall('.//'+SVG+'filter'):
        sigma = sum(max(map(float,n.get('stdDeviation','0').split())) for n in flt.findall(SVG+'feGaussianBlur'))
        offset = max([0]+[max(abs(float(n.get('dx','0'))),abs(float(n.get('dy','0')))) for n in flt.findall(SVG+'feOffset')])
        padding = max(padding, math.ceil(4*sigma+offset+1))
        flt.set('x','-1000%');flt.set('y','-1000%');flt.set('width','2100%');flt.set('height','2100%')
    if padding:
        width += 2*padding; height += 2*padding; x -= padding; y -= padding
        root.find(SVG+'g').set('transform',f'matrix(1,0,0,1,{-x},{-y})')
    # Only the original shape279 body changes color; outer bevel/glow remain.
    for group in root.findall('.//'+SVG+'g'):
        for use in group.findall(SVG+'use'):
            if use.get(FFDEC+'characterId') == '279':
                shape = root.find('.//'+SVG+'g[@id="'+use.get(XLINK+'href')[1:]+'"]')
                for path in shape.findall(SVG+'path'):path.set('data-confetti-body','true')
    for node in root.iter():
        assert node.tag not in [SVG+'script',SVG+'foreignObject',SVG+'a']
        for key,value in list(node.attrib.items()):
            if key.startswith(FFDEC):
                del node.attrib[key]
            elif key.lower().startswith('on'):
                raise ValueError('SVG event handler')
            elif key in ['href',XLINK+'href']:
                assert value.startswith(('#','data:image/')), value
    root.set('width',f'{width}px');root.set('height',f'{height}px')
    root.set('viewBox',f'0 0 {width} {height}')
    target.parent.mkdir(parents=True,exist_ok=True)
    ET.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
    return dict(path=str(target.relative_to(ROOT/'public/classic')),x=x,y=y,width=width,height=height,filterPadding=padding)


SOUNDS = {'whoosh':38,'birdiehit':45,'toasterpop':40,'ding':43,'cheer':47,
          'music':46,'hover':19,'press':20}


def run(intermediate, export_dir):
    original = ET.parse(gzip.open(ROOT/'reference/flash-90302/original.xml.gz')).getroot()
    definitions = {int(tag.get('shapeId',tag.get('characterID','0'))):tag for tag in original.find('tags') if tag.get('type','').startswith(('DefineShape','DefineBits'))}
    specs = json.loads((intermediate/'export-specs.json').read_text()); target_root=ROOT/'public/classic'
    # Generated directory only: stale first-version layers cannot survive rebuild.
    if target_root.exists():shutil.rmtree(target_root)
    target_root.mkdir(parents=True)
    manifest = dict(schema=2,fps=60,coordinateSystem=dict(width=640,height=426),
        source=dict(url='https://www.4399.com/flash/90302.htm',swfSha256='cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912',
                    license='No open-source license verified; original artwork and copyright retained'),
        characters={},families={},effects={},sounds={},ui={},scores={},introNames={},uiSources={})
    for spec in specs:
        folder = next(p for p in export_dir.iterdir() if p.is_dir() and (p.name==f'DefineSprite_{spec["symbol"]}' or p.name.startswith(f'DefineSprite_{spec["symbol"]}_')))
        kind=spec['kind']; scope=spec.get('character',spec.get('family',''))
        frames=[]
        for frame in range(1,spec['frames']+1):
            target=target_root/kind/scope/f'{spec["name"]}-{frame:02d}.svg'
            frames.append(normalize(folder/f'{frame}.svg',target,definitions))
        if 'character' in spec:
            character=manifest['characters'].setdefault(scope,dict(family='toaster' if scope=='toaster' else 'adult',body={}))
            if kind=='body':
                character['body'][spec['name']]=frames
                character.setdefault('bodySymbols',{})[spec['name']]=spec['bodySymbols']
                character.setdefault('bodyDepths',{})[spec['name']]=spec['bodyDepths']
            else:character['preview']=frames[0]
        elif kind=='swings':manifest['families'].setdefault(scope,dict(swings={} ))['swings'][spec['name']]=frames
        elif kind=='net':manifest['netFrames']=frames
        elif kind=='effects':
            manifest['effects'][spec['name']]=dict(frames=frames,originalSymbol=spec['originalSymbol'],
                removeFrame=22 if spec['name']=='spark' else None)
        elif kind in ['ui','scores','introNames']:
            manifest[kind][spec['name']]=frames[0]
            if 'originalSymbol' in spec:manifest['uiSources'][spec['name']]=dict(symbol=spec['originalSymbol'],frame=spec.get('originalFrame',1))
        else:
            manifest[kind]=frames[0]
            if 'originalSymbol' in spec:manifest['uiSources'][kind]=dict(symbol=spec['originalSymbol'],frame=1)
    sound_tags={int(t.get('soundId')):t for t in original.find('tags') if t.get('type')=='DefineSoundTag'}
    for name,symbol in SOUNDS.items():
        tag=sound_tags[symbol];assert tag.get('soundFormat')=='2'
        raw=bytes.fromhex(tag.get('soundData'));path=target_root/'sounds'/f'{name}-{symbol}.mp3';path.parent.mkdir(exist_ok=True);path.write_bytes(raw[2:])
        manifest['sounds'][name]=dict(path=str(path.relative_to(target_root)),originalSymbol=symbol,
            seekSamples=int.from_bytes(raw[:2],'little',signed=True),sha256=hashlib.sha256(raw[2:]).hexdigest())
    hashes={str(p.relative_to(target_root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(target_root.rglob('*')) if p.is_file()}
    manifest['files']=hashes
    (target_root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'resources':len(hashes),'bytes':sum(p.stat().st_size for p in target_root.rglob('*') if p.is_file())}))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--intermediate',type=Path,default=ROOT/'artifacts/flash-asset-build')
    p.add_argument('--export-dir',type=Path,default=ROOT/'artifacts/flash-asset-build/exported')
    args = p.parse_args()
    run(args.intermediate,args.export_dir)
