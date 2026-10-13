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
    return int(next((tag.get(k) for k in ('spriteId', 'shapeId', 'characterID', 'fontID', 'fontId', 'buttonId', 'characterId') if tag.get(k)), '0'))


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


# The seven reachable original versus buttons, not all archived classes.
CHARACTERS = {'joe':230, 'nadia':226, 'harry':233, 'toaster':178,
              'pirate':221, 'top-hat':169, 'red':236}
NAMES = {'joe':'Average\nJoe', 'nadia':'Naughty\nNadia', 'harry':'Hairy\nHarry',
         'toaster':'Flying\nToaster', 'pirate':'Pirate\nPete',
         'top-hat':'Top Hat\nSam', 'red':'The Red\nDude'}
FAMILIES = {'adult':(230, {'serve':135, 'underhand':137, 'overhead':140}),
            'toaster':(178, {'serve':172, 'underhand':174, 'overhead':171})}


def make_family(definitions, actor_id, swings):
    actor = timeline(definitions[actor_id])
    point = matrix(named(actor, 'servePoint'))
    geometry = dict(servePoint=dict(x=point[4],y=point[5]),
        underhandZone=shape_polygon(definitions[151],matrix(named(actor,'underHitbox'))))
    poses = {}
    for kind, sprite_id in swings.items():
        mount = matrix(named(actor,kind+'Swing')); poses[kind] = []
        for frame in timeline(definitions[sprite_id]):
            racket = next(p for p in frame.values() if p.get('name') == 'racket')
            racket_transform = matrix(racket)
            body = named(timeline(definitions[int(racket.get('characterId'))]), 'body')
            hitbox = named(timeline(definitions[int(body.get('characterId'))]), 'hitbox2')
            shape = first_child(definitions,int(hitbox.get('characterId')))
            full = compose(compose(compose(compose(mount,racket_transform),matrix(body)),matrix(hitbox)),matrix(shape))
            poses[kind].append(dict(rotation=math.degrees(math.atan2(racket_transform[1],racket_transform[0])),
                hitbox=shape_rect(definitions[int(shape.get('characterId'))],full),matrix=list(full)))
    for name in ['serveSwing','underhandSwing','overheadSwing','underHitbox','servePoint']:
        assert all(matrix(named(actor,name,i+1)) == matrix(named(actor,name)) for i in range(len(actor)))
    return dict(geometry=geometry,poses=poses,animation=dict(
        serve=dict(frames=int(definitions[swings['serve']].get('frameCount')),release=8 if actor_id==178 else 7),
        overhead=dict(frames=27,contactEnd=15),underhand=dict(frames=19,contactEnd=10)))


def make_geometry(definitions):
    scene = timeline(definitions[344])
    net_side = matrix(named(scene,'_-0j')); net_top = matrix(named(scene,'_-3H'))
    families = {name:make_family(definitions,actor,swings) for name,(actor,swings) in FAMILIES.items()}
    # Prove shared adult mounts against every included actor, not an art assumption.
    for symbol in CHARACTERS.values():
        if symbol == 178: continue
        assert make_family(definitions,symbol,FAMILIES['adult'][1]) == families['adult']
    return dict(families=families,net=dict(x=matrix(named(scene,'_-3m'))[4],
        side=shape_rect(definitions[112],net_side),top=shape_rect(definitions[112],net_top),
        sideOrigin=dict(x=net_side[4],y=net_side[5]),topOrigin=dict(x=net_top[4],y=net_top[5])),
        animation=dict(fps=60,net=dict(frames=int(definitions[330].get('frameCount')))),
        source=dict(characters=CHARACTERS,collisionShape=109,zoneShapes=[151],polygonTolerance=CURVE_TOLERANCE))

def synthetic_sprite(sprite_id, placements, frames):
    sprite = ET.Element('item',dict(type='DefineSpriteTag',forceWriteAsLong='true',frameCount=str(frames),hasEndTag='true',spriteId=str(sprite_id)))
    children = ET.SubElement(sprite,'subTags')
    for placement in placements:
        children.append(copy.deepcopy(placement))
    for _ in range(frames):
        ET.SubElement(children,'item',dict(type='ShowFrameTag',forceWriteAsLong='false'))
    return sprite


def place(symbol, depth=1, x=0, y=0):
    p = ET.Element('item',dict(type='PlaceObject2Tag',characterId=str(symbol),depth=str(depth),
        forceWriteAsLong='false',placeFlagHasCharacter='true',placeFlagHasMatrix='true',placeFlagMove='false'))
    ET.SubElement(p,'matrix',dict(type='MATRIX',hasScale='false',hasRotate='false',translateX=str(round(x*20)),translateY=str(round(y*20))))
    return p


def prepare_art_swf(root, definitions, output):
    art = ET.Element('swf',dict(root.attrib)); art.set('frameCount','1')
    tags = ET.SubElement(art,'tags'); specs=[]; generated=[]; required=set(); next_id=1000
    def add(kind,name,placements,frames=1,**extra):
        nonlocal next_id
        next_id += 1
        generated.append(synthetic_sprite(next_id,placements,frames))
        specs.append(dict(kind=kind,name=name,symbol=next_id,frames=frames,**extra))
    for character,actor_id in CHARACTERS.items():
        actor=timeline(definitions[actor_id]); family='toaster' if actor_id==178 else 'adult'
        for name,parent_frame,frames in [('normal',1,1),('backward',11,16),('forward',21,16),('jump',30,1)]:
            placements=[p for _,p in sorted(actor[parent_frame-1].items()) if not p.get('name')]
            add('body',name,placements,1 if family=='toaster' else frames,character=character,bodySymbols=[int(p.get('characterId')) for p in placements],bodyDepths=[int(p.get('depth')) for p in placements])
        preview=[p for _,p in sorted(actor[0].items()) if not p.get('name') or p.get('name')=='overheadSwing']
        add('preview','preview',preview,character=character)
    for family,(actor_id,swings) in FAMILIES.items():
        actor=timeline(definitions[actor_id])
        for name,symbol in swings.items():
            add('swings',name,[named(actor,name+'Swing')],int(definitions[symbol].get('frameCount')),family=family)
    scene=timeline(definitions[344])
    add('background','background',[p for depth,p in scene[0].items() if depth in [1,3,6,8,10]])
    add('net','net',[named(scene,'_-3m')],24)
    add('shuttle','shuttle',[place(100)])
    # Preserve visible source branding (depth38), without its click/remote behavior.
    brand=copy.deepcopy(named(scene,'kongBtn'));brand.set('name','courtBrand')
    add('courtBrand','court-brand',[brand],originalSymbol=343)
    # Static scene markers are repositioned by PlayState at net +/-125.
    markers=[]
    for depth,name,offset in [(18,'switch',-125),(20,'_-2S',125)]:
        p=copy.deepcopy(named(scene,name)); p.find('matrix').set('translateX',str(round((317.25+offset)*20))); markers.append(p)
    add('markers','markers',markers)
    for name,symbol in [('spark',278),('tail',245),('smoke',242),('confetti',282)]:
        add('effects',name,[place(symbol)],int(definitions[symbol].get('frameCount')),originalSymbol=symbol)
    intro=timeline(definitions[255])[0]
    # Original title/versus decoration, replacing dynamic names separately.
    title=copy.deepcopy(definitions[254]); title.set('characterID','2000'); title.set('html','false'); title.set('initialText','Exhibition'); definitions[2000]=title
    title_place=copy.deepcopy(intro[8]); title_place.set('characterId','2000')
    add('ui','intro',[intro[3],intro[6],title_place],originalSymbol=255)
    for character,text in NAMES.items():
        for side,depth,text_id in [('left',7,253),('right',5,251)]:
            ident=2001+len([d for d in definitions if d>=2001])
            t=copy.deepcopy(definitions[text_id]);t.set('characterID',str(ident));t.set('html','false');t.set('initialText',text);definitions[ident]=t
            p=copy.deepcopy(intro[depth]);p.set('characterId',str(ident))
            add('introNames',character+'-'+side,[p])
    # Original frame1 panel, plus script-free rematch/more button art for native actions.
    finish=timeline(definitions[269])[0]
    add('ui','finish',[finish[1]],originalSymbol=269,originalFrame=1)
    for name,button in [('rematch',265),('more',262)]:
        records=definitions[button].find('characters')
        for state in ['Up','Over']:
            ps=[]
            for record in records:
                if record.get('buttonState'+state)=='true':
                    p=place(int(record.get('characterId')),int(record.get('placeDepth')))
                    p.remove(p.find('matrix'));m=copy.deepcopy(record.find('placeMatrix'));m.tag='matrix';p.append(m)
                    c=copy.deepcopy(record.find('colorTransform'));p.set('placeFlagHasColorTransform','true');p.append(c);ps.append(p)
            add('ui',name+state,ps)
    # The source scoreboard font/layout is pre-rendered for every reachable score/result.
    for text in [f'{a} - {b}' for a in range(8) for b in range(8)]+['P1 Wins','P2 Wins']:
        ident=max(2100,max(definitions))+1
        t=copy.deepcopy(definitions[332]);t.set('characterID',str(ident));t.set('hasText','true');t.set('initialText',text);definitions[ident]=t
        p=copy.deepcopy(named(scene,'_-4P'));p.set('characterId',str(ident))
        add('scores',text.replace(' ','').lower(),[p])
    def include(symbol):
        if symbol in required:return
        required.add(symbol);definition=definitions[symbol]
        for node in definition.iter():
            for key in ['characterId','bitmapId','fontId']:
                dep=node.get(key)
                if dep and int(dep) not in [0,65535]:include(int(dep))
    for sprite in generated:
        for node in sprite.iter():
            if node.get('characterId'):include(int(node.get('characterId')))
    # Restrict originals to declarative art. No ABC/actions/root/game/sponsor behavior.
    for ident in sorted(required):
        t=definitions[ident]; kind=t.get('type','')
        assert kind.startswith(('DefineShape','DefineMorphShape','DefineSprite','DefineBits','DefineFont','DefineText','DefineEditText','DefineButton2Tag')),kind
        t=copy.deepcopy(t)
        if kind=='DefineButton2Tag':
            # Button visuals/filter records are declarative; no button actions enter art-only output.
            actions=t.find('actions')
            if actions is not None:t.remove(actions)
        if kind=='DefineSpriteTag':
            sub=t.find('subTags')
            for child in list(sub):
                if child.get('type','').startswith(('Do','StartSound','SymbolClass','ExportAssets','ImportAssets')):sub.remove(child)
        tags.append(t)
    for t in root.find('tags'):
        if t.get('type')=='JPEGTablesTag':tags.append(copy.deepcopy(t))
    tags.extend(generated)
    ET.SubElement(tags,'item',dict(type='ShowFrameTag',forceWriteAsLong='false'))
    output.parent.mkdir(parents=True,exist_ok=True)
    ET.ElementTree(art).write(output,encoding='utf-8',xml_declaration=True)
    return specs

def run(source, intermediate):
    root = load_xml(source)
    assert root.get('_generator') == 'JPEXS Free Flash Decompiler v.26.3.0'
    definitions = {character_id(t):t for t in root.find('tags') if character_id(t) and t.get('type', '').startswith(('DefineShape', 'DefineSprite', 'DefineMorphShape', 'DefineBits', 'DefineFont3Tag', 'DefineFont2Tag', 'DefineText', 'DefineEditText', 'DefineButton2Tag'))}
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
