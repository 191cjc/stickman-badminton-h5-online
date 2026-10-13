#!/usr/bin/env python3
"""Extract numeric Flash timelines and prepare script-free art-only SWF export.

No ActionScript is evaluated. The original inputs are never rewritten.
"""
import argparse
import copy
import gzip
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
IDENTITY = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
CURVE_TOLERANCE = 0.01  # In Joe-local pixels, before runtime character scale.


def load_xml(path):
    return ET.parse(gzip.open(path, 'rb') if str(path).endswith('.gz') else path).getroot()


def character_id(tag):
    return int(next((tag.get(k) for k in ('spriteId', 'shapeId', 'characterID', 'characterId') if tag.get(k)), '0'))


def matrix(tag):
    m = tag.find('matrix')
    if m is None:
        return IDENTITY
    return tuple(float(m.get(k, default)) for k, default in (
        ('scaleX', '1'), ('rotateSkew0', '0'), ('rotateSkew1', '0'),
        ('scaleY', '1'), ('translateX', '0'), ('translateY', '0')))[:4] + (
        float(m.get('translateX', 0)) / 20, float(m.get('translateY', 0)) / 20)


def compose(a, b):
    return (a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5])


def transform(m, p):
    return (m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5])


def timeline(tag):
    """Resolve PlaceObject updates by depth; matrix/character/name persist on move."""
    depths, frames = {}, []
    for item in tag.find('subTags'):
        kind = item.get('type')
        if kind.startswith('RemoveObject'):
            depths.pop(int(item.get('depth')), None)
        elif kind.startswith('PlaceObject'):
            depth = int(item.get('depth'))
            old = depths.get(depth)
            if old is None or item.get('placeFlagMove') != 'true':
                old = ET.Element('item', dict(item.attrib))
            else:
                old = copy.deepcopy(old)
                for key, value in item.attrib.items():
                    # Flags describe THIS update; keep the resolved presence flags.
                    if not key.startswith('placeFlag') or value == 'true':
                        old.set(key, value)
            for child in item:
                previous = old.find(child.tag)
                if previous is not None:
                    old.remove(previous)
                old.append(copy.deepcopy(child))
            old.set('placeFlagMove', 'false')
            depths[depth] = old
        elif kind == 'ShowFrameTag':
            frames.append(copy.deepcopy(depths))
    assert len(frames) == int(tag.get('frameCount'))
    return frames


def named(frames, name, frame=1):
    return next(p for p in frames[frame-1].values() if p.get('name') == name)


def rect_from_points(points):
    xs, ys = zip(*points)
    return dict(x=min(xs), y=min(ys), width=max(xs)-min(xs), height=max(ys)-min(ys))


def shape_rect(tag, m):
    b = tag.find('shapeBounds')
    return rect_from_points([transform(m, (float(b.get(x))/20, float(b.get(y))/20))
                            for x,y in [('Xmin','Ymin'), ('Xmax','Ymin'), ('Xmax','Ymax'), ('Xmin','Ymax')]])


def midpoint(a, b):
    return ((a[0]+b[0])/2, (a[1]+b[1])/2)


def flatten_quadratic(start, control, end, result):
    # Quadratic maximum distance from its chord <= half control/chord-mid distance.
    chord = midpoint(start, end)
    if math.dist(control, chord)/2 <= CURVE_TOLERANCE:
        result.append(end)
        return
    a, b = midpoint(start, control), midpoint(control, end)
    c = midpoint(a, b)
    flatten_quadratic(start, a, c, result)
    flatten_quadratic(c, b, end, result)


def shape_polygon(tag, m):
    """One closed filled contour in the selected original hit-zone shapes."""
    point, points, contours = (0,0), [], 0
    for item in tag.findall('shapes/shapeRecords/item'):
        kind = item.get('type')
        if kind == 'StyleChangeRecord' and item.get('stateMoveTo') == 'true':
            contours += 1
            point = (float(item.get('moveDeltaX'))/20, float(item.get('moveDeltaY'))/20)
            points.append(point)
        elif kind == 'StraightEdgeRecord':
            point = (point[0]+float(item.get('deltaX', 0))/20, point[1]+float(item.get('deltaY', 0))/20)
            points.append(point)
        elif kind == 'CurvedEdgeRecord':
            control = (point[0]+float(item.get('controlDeltaX'))/20, point[1]+float(item.get('controlDeltaY'))/20)
            end = (control[0]+float(item.get('anchorDeltaX'))/20, control[1]+float(item.get('anchorDeltaY'))/20)
            # Error must be measured after the mount transform.
            flat = []
            flatten_quadratic(transform(m, point), transform(m, control), transform(m, end), flat)
            # Already transformed; convert at the end through inverse transform is unnecessary.
            if not flat:
                raise ValueError('Empty curve')
            points.extend([('world', p) for p in flat])
            point = end
    assert contours == 1, f'Expected single contour, got {contours}'
    result = [p[1] if isinstance(p[0], str) else transform(m,p) for p in points]
    return [dict(x=x,y=y) for x,y in result]


def first_child(definitions, sprite_id):
    return next(iter(timeline(definitions[sprite_id])[0].values()))


def make_geometry(definitions):
    joe = timeline(definitions[230]); scene = timeline(definitions[344])
    point = matrix(named(joe, 'servePoint'))
    net_side = matrix(named(scene, '_-0j')); net_top = matrix(named(scene, '_-3H'))
    net_shape = definitions[112]
    data = dict(
        servePoint=dict(x=point[4], y=point[5]),
        underhandZone=shape_polygon(definitions[151], matrix(named(joe,'underHitbox'))),
        computerZone=shape_polygon(definitions[153], matrix(named(joe,'computerHitbox'))),
        net=dict(x=matrix(named(scene,'_-3m'))[4], side=shape_rect(net_shape,net_side), top=shape_rect(net_shape,net_top), sideOrigin=dict(x=net_side[4],y=net_side[5]), topOrigin=dict(x=net_top[4],y=net_top[5])),
    )
    poses = {}
    for kind, name, sprite_id in [('serve','serveSwing',135),('underhand','underhandSwing',137),('overhead','overheadSwing',140)]:
        mount = matrix(named(joe,name)); poses[kind] = []
        for frame in timeline(definitions[sprite_id]):
            racket = next(p for p in frame.values() if p.get('name') == 'racket')
            racket_transform = matrix(racket)
            body = named(timeline(definitions[int(racket.get('characterId'))]), 'body')
            hitbox = named(timeline(definitions[int(body.get('characterId'))]), 'hitbox2')
            shape = first_child(definitions, int(hitbox.get('characterId')))
            full = compose(compose(compose(compose(mount, racket_transform),matrix(body)),matrix(hitbox)),matrix(shape))
            poses[kind].append(dict(rotation=math.degrees(math.atan2(racket_transform[1],racket_transform[0])),
                                    hitbox=shape_rect(definitions[int(shape.get('characterId'))],full),
                                    matrix=list(full)))
    # Swings and zones remain placed across the parent gotoAndStop labels.
    for name in ['serveSwing','underhandSwing','overheadSwing','underHitbox','computerHitbox','servePoint']:
        assert all(matrix(named(joe,name,i+1)) == matrix(named(joe,name)) for i in range(len(joe)))
    return dict(geometry=data, poses=poses, animation=dict(fps=60,serve=dict(frames=23,release=7),overhead=dict(frames=27,contactEnd=15),underhand=dict(frames=19,contactEnd=10),net=dict(frames=int(definitions[330].get('frameCount')))),
                source=dict(joeSymbol=230, collisionShape=109, zoneShapes=[151,153], polygonTolerance=CURVE_TOLERANCE))


def synthetic_sprite(sprite_id, placements, frames):
    sprite = ET.Element('item',dict(type='DefineSpriteTag',forceWriteAsLong='true',frameCount=str(frames),hasEndTag='true',spriteId=str(sprite_id)))
    children = ET.SubElement(sprite,'subTags')
    for placement in placements:
        children.append(copy.deepcopy(placement))
    for _ in range(frames):
        ET.SubElement(children,'item',dict(type='ShowFrameTag',forceWriteAsLong='false'))
    return sprite


def prepare_art_swf(root, definitions, output):
    # Only artwork definitions are retained. No bytecode, URL actions, ads/buttons,
    # external imports, original document class or root timeline is executed/exported.
    art = ET.Element('swf',dict(root.attrib)); art.set('frameCount','1')
    tags = ET.SubElement(art,'tags')
    # A whitelist closure of actual displayed artwork, not all original symbols.
    # This excludes unrelated sponsor/score/UI/binary definitions as well as code.
    required = set()
    def include_art(symbol):
        if symbol in required:
            return
        required.add(symbol)
        definition = definitions[symbol]
        for child in definition.iter():
            for key in ['characterId', 'bitmapId']:
                dependency = child.get(key)
                if dependency and int(dependency) not in [0, 65535]:
                    include_art(int(dependency))
    for symbol in [135,137,140,142,144,163,166,168,229,310,312,314,315,318,330,100]:
        include_art(symbol)
    for item in root.find('tags'):
        if character_id(item) in required and item.get('type', '').startswith(('DefineShape','DefineMorphShape','DefineSprite','DefineBits')):
            tags.append(copy.deepcopy(item))
        elif item.get('type') == 'JPEGTablesTag':
            tags.append(copy.deepcopy(item))
    joe = timeline(definitions[230]); scene = timeline(definitions[344])
    specs = []
    for name, symbol, parent_frame, frames in [('normal',1001,1,1),('backward',1002,11,16),('forward',1003,21,16),('jump',1004,30,1)]:
        placements = [p for depth,p in joe[parent_frame-1].items() if depth in [11,13,15]]
        tags.append(synthetic_sprite(symbol,placements,frames))
        specs.append(dict(kind='body',name=name,symbol=symbol,frames=frames))
    for name, symbol, mount, frames in [('serve',1011,'serveSwing',23),('underhand',1012,'underhandSwing',19),('overhead',1013,'overheadSwing',27)]:
        tags.append(synthetic_sprite(symbol,[named(joe,mount)],frames))
        specs.append(dict(kind='swings',name=name,symbol=symbol,frames=frames))
    tags.append(synthetic_sprite(1020,[p for depth,p in scene[0].items() if depth in [1,3,6,8,10]],1))
    specs.append(dict(kind='background',name='background',symbol=1020,frames=1))
    tags.append(synthetic_sprite(1021,[named(scene,'_-3m')],24))
    specs.append(dict(kind='net',name='net',symbol=1021,frames=24))
    specs.append(dict(kind='shuttle',name='shuttle',symbol=100,frames=1))
    ET.SubElement(tags,'item',dict(type='ShowFrameTag',forceWriteAsLong='false'))
    output.parent.mkdir(parents=True,exist_ok=True)
    ET.ElementTree(art).write(output,encoding='utf-8',xml_declaration=True)
    return specs


def run(source, intermediate):
    root = load_xml(source)
    assert root.get('_generator') == 'JPEXS Free Flash Decompiler v.26.3.0'
    definitions = {character_id(t):t for t in root.find('tags') if character_id(t) and t.get('type', '').startswith(('DefineShape', 'DefineSprite', 'DefineMorphShape', 'DefineBits'))}
    data = make_geometry(definitions)
    raw_xml = gzip.decompress(source.read_bytes()) if str(source).endswith('.gz') else source.read_bytes()
    data['source']['xmlSha256'] = hashlib.sha256(raw_xml).hexdigest()
    assert data['source']['xmlSha256'] == '3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0', 'Unexpected source XML'
    out = ROOT/'src/shared/classic/assets-data.ts'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('// Generated by tools/flash-assets/extract.py from Flash 90302. Do not hand edit.\nexport const classicAssetData = '+json.dumps(data,ensure_ascii=False,indent=2)+' as const;\n')
    specs = prepare_art_swf(root,definitions,intermediate/'art-only.xml')
    (intermediate/'export-specs.json').write_text(json.dumps(specs,indent=2)+'\n')
    print(json.dumps({'numericData':str(out.relative_to(ROOT)),'syntheticXml':str((intermediate/'art-only.xml').relative_to(ROOT)), 'symbols':[s['symbol'] for s in specs]}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--xml',type=Path,default=ROOT/'reference/flash-90302/original.xml.gz')
    parser.add_argument('--intermediate',type=Path,default=ROOT/'artifacts/flash-asset-build')
    args = parser.parse_args()
    run(args.xml,args.intermediate)
