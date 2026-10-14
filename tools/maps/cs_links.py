"""Place the Cold Storage module's maps on the Bay City Street Atlas.
Usage: python3 cs_links.py STREET_ATLAS_JSON COLD_STORAGE_MAPS_JSON OUT_JSON
Writes the links the system adds at runtime when the cold-storage module is active:
street-map entrances (drawn as Drawings, never baked into the art), the way back out of each
Cold Storage map, and the links between Cold Storage maps that follow its own exit tags.
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coldstyle as cs

atlas = {m['id']: m for m in json.load(open(sys.argv[1]))['maps']}
csmaps = {m['id']: m for m in json.load(open(sys.argv[2]))['maps']}
C = lambda v: v / 100

# Exit markers as drawn on the Cold Storage art (cells; arrow tip; direction), read from the maps.
EXITS = {
 'SCENE-WARD': {'FRONT DESK': ((10.9, 16.0), 'right'), 'CORRIDOR': ((27.5, 10.8), 'right')},
 'SCENE-BREACH': {'RECOVERY VAN': ((27.5, 4.0), 'right'), 'THE RAINLINE': ((18.9, 13.8), 'right')},
 'SCENE-RAINLINE': {'RELAY SEVENTEEN': ((27.4, 3.1), 'right'), 'QUIET ARCHIVE': ((1.1, 15.6), 'left'), 'BLUE LOTUS': ((13.8, 16.9), 'down')},
 'SCENE-ARCHIVE': {'STREET': ((1.1, 9.0), 'left'), 'BACK DOOR': ((27.4, 13.0), 'right')},
 'SCENE-LOTUS': {'STREET': ((1.1, 3.6), 'left'), 'CANAL / ANANSI': ((1.1, 15.4), 'left')},
 'SCENE-RELAY': {'CANAL': ((1.1, 9.0), 'left'), 'SERVICE LADDER': ((27.5, 8.0), 'right')},
 'SCENE-SAFEHOUSE': {'STREET': ((1.1, 5.6), 'left')},
 'SCENE-SPIRE': {'CANAL': ((1.1, 13.0), 'left')},
 'SCENE-COUNCIL': {'THE WAY IN': ((13.5, 16.4), 'down')},
 'SCENE-CORE': {'OUTSIDE': ((18.9, 16.0), 'right')},
 'SCENE-COURT': {'DIRTY MIRRORS': ((1.1, 3.6), 'left')},
 'SCENE-BROADCAST': {'CANAL ACCESS': ((27.5, 11.0), 'right')},
}
# Links without a drawn marker (a labelled Drawing is added on the scene): rect + landing, cells.
CUSTOM = {
 ('SCENE-RAINLINE', 'STREETS'): dict(rect=(1.0, 1.2, 2.0, 2.0), land=(4.5, 2.4), label='EXIT · LICKTOWN STREETS'),
 ('SCENE-SPIRE', 'LIFT'): dict(rect=(14.7, 7.0, 2.4, 2.4), land=(13.2, 8.6), label='LIFT · THE COUNCIL'),
 ('SCENE-VIRTUAL', 'COURT GATE'): dict(rect=(24.0, 2.0, 2.4, 2.4), land=(21.0, 3.4), label='GATE · THE COURT OF UNRELIABLE WITNESSES'),
 ('SCENE-VIRTUAL', 'THEATRE GATE'): dict(rect=(24.0, 6.9, 2.4, 2.4), land=(21.0, 8.3), label='GATE · THE OPERATING THEATRE'),
 ('SCENE-VIRTUAL', 'BROADCAST GATE'): dict(rect=(24.0, 11.8, 2.4, 2.4), land=(21.0, 13.2), label='GATE · THE LAST BROADCAST'),
 ('SCENE-VIRTUAL', 'EXIT ANCHOR'): dict(rect=(1.4, 7.0, 2.4, 2.4), land=(5.0, 8.0), label='EXIT ANCHOR · ANANSI HOUSE'),
 ('SCENE-THEATRE', 'WAKE'): dict(rect=(1.4, 14.2, 2.4, 2.4), land=(5.5, 15.0), label='WAKE · PALIMPSEST VIRTUALITY'),
}
# Where each building stands: (Cold Storage map, its street exit, street map, block, which side of the block)
PLACES = [
 ('SCENE-WARD', 'FRONT DESK', 'BCS-DOGPATCH', 'The Resurrection Ward', 0),
 ('SCENE-BREACH', 'RECOVERY VAN', 'BCS-DOGPATCH', 'The Resurrection Ward', 1),
 ('SCENE-RAINLINE', ('STREETS',), 'BCS-LICKTOWN', 'The Rainline', 0),
 ('SCENE-ARCHIVE', 'STREET', 'BCS-LICKTOWN', 'The Quiet Archive', 0),
 ('SCENE-LOTUS', 'STREET', 'BCS-LICKTOWN', 'Blue Lotus, Black Water', 0),
 ('SCENE-RELAY', 'SERVICE LADDER', 'BCS-LICKTOWN', 'Relay Seventeen', 0),
 ('SCENE-SAFEHOUSE', 'STREET', 'BCS-MISSION', 'Anansi House', 0),
 ('SCENE-SPIRE', 'CANAL', 'BCS-CIVIC', 'The Spire', 0),
]
# Directed links between Cold Storage maps: (from map, from exit, to map, landing = ('exit', name) | ('zone', id))
INTRA = [
 ('SCENE-WARD', 'CORRIDOR', 'SCENE-BREACH', ('zone', 'ward-entrance')),
 ('SCENE-BREACH', 'THE RAINLINE', 'SCENE-RAINLINE', ('zone', 'billboard-plaza')),
 ('SCENE-RAINLINE', 'QUIET ARCHIVE', 'SCENE-ARCHIVE', ('exit', 'BACK DOOR')),
 ('SCENE-ARCHIVE', 'BACK DOOR', 'SCENE-RAINLINE', ('exit', 'QUIET ARCHIVE')),
 ('SCENE-RAINLINE', 'BLUE LOTUS', 'SCENE-LOTUS', ('exit', 'STREET')),
 ('SCENE-RAINLINE', 'RELAY SEVENTEEN', 'SCENE-RELAY', ('exit', 'CANAL')),
 ('SCENE-RELAY', 'CANAL', 'SCENE-RAINLINE', ('exit', 'RELAY SEVENTEEN')),
 ('SCENE-LOTUS', 'CANAL / ANANSI', 'SCENE-SAFEHOUSE', ('exit', 'STREET')),
 ('SCENE-COUNCIL', 'THE WAY IN', 'SCENE-SPIRE', ('zone', 'lift-lobby')),
 ('SCENE-CORE', 'OUTSIDE', 'SCENE-SPIRE', ('zone', 'lift-lobby')),
 ('SCENE-SPIRE', ('LIFT',), 'SCENE-COUNCIL', ('zone', 'antechamber')),
 ('SCENE-COURT', 'DIRTY MIRRORS', 'SCENE-VIRTUAL', ('zone', 'court-gate')),
 ('SCENE-BROADCAST', 'CANAL ACCESS', 'SCENE-VIRTUAL', ('zone', 'broadcast-gate')),
 ('SCENE-THEATRE', ('WAKE',), 'SCENE-VIRTUAL', ('zone', 'theatre-gate')),
 ('SCENE-VIRTUAL', ('COURT GATE',), 'SCENE-COURT', ('exit', 'DIRTY MIRRORS')),
 ('SCENE-VIRTUAL', ('THEATRE GATE',), 'SCENE-THEATRE', ('zone', 'operating-floor')),
 ('SCENE-VIRTUAL', ('BROADCAST GATE',), 'SCENE-BROADCAST', ('exit', 'CANAL ACCESS')),
 ('SCENE-VIRTUAL', ('EXIT ANCHOR',), 'SCENE-SAFEHOUSE', ('zone', 'parlour')),
]

def exit_geom(mid, name):
    if isinstance(name, tuple):
        c = CUSTOM[(mid, name[0])]; return c['rect'], c['land']
    (x, y), d = EXITS[mid][name]
    if d == 'right': return (x - 2, y - 1, 2, 2), (x - 3.2, y)
    if d == 'left': return (max(0, x - 1), y - 1, 2, 2), (max(0, x - 1) + 3.2, y)
    if d == 'down': return (x - 1, y - 2, 2, 2), (x, y - 3.2)
    return (x - 1, max(0, y - 1), 2, 2), (x, max(0, y - 1) + 3.2)

def zone_centre(mid, zid):
    z = next(z for z in csmaps[mid]['zones'] if z['id'] == zid)
    r = [C(v) for v in z['rect']]; return (r[0] + r[2] / 2, r[1] + r[3] / 2)

def street_door(mid, block, nth):
    m = atlas[mid]; zones = [dict(z, rect=[C(v) for v in z['rect']]) for z in m['zones']]
    z = next(z for z in zones if z['kind'] == 'land' and z['name'] == block)
    cands = []
    for r in zones:
        if r['kind'] not in ('road', 'junction'): continue
        e = cs.shared_edge(z['rect'], r['rect'])
        if e: cands.append(((r['kind'] == 'road', r.get('o') == 'h'), r, e))
    cands.sort(key=lambda c: c[0], reverse=True)
    if len(cands) <= nth: raise SystemExit(f'{mid} {block}: no side {nth}')
    _, road, (ex, ey, vertical) = cands[nth]
    rx, ry, rw, rh = road['rect']
    if vertical: sx = ex if rx >= ex - 1e-6 else ex - 2; rect = (sx, ey - 1, 2, 2)
    else: sy = ey if ry >= ey - 1e-6 else ey - 2; rect = (ex - 1, sy, 2, 2)
    return rect, (rect[0] + rect[2] / 2, rect[1] + rect[3] / 2), z['rect']

px = lambda t: [round(v * 100) for v in t]
street_doors, scenes = {}, {k: {'name': v['name'], 'links': [], 'labels': []} for k, v in csmaps.items()}
for mid, ex, smid, block, nth in PLACES:
    rect, land, brect = street_door(smid, block, nth)
    def ov(a, b): return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]
    for other in street_doors.get(smid, []) + [l for l in atlas[smid]['links']]:
        assert not ov(other['rect'], px(rect)), f'{smid} {block} door clashes with {other.get("toName")}'
    erect, eland = exit_geom(mid, ex)
    street_doors.setdefault(smid, []).append(dict(kind='door', at=block, key=f'cs:{mid}', rect=px(rect), to=mid, toName=csmaps[mid]['name'], land=px(eland), block=px(brect), label=f"ENTER · {csmaps[mid]['name'].upper()}"))
    scenes[mid]['links'].append(dict(kind='exit', key=ex if isinstance(ex, str) else ex[0], rect=px(erect), to=smid, toName=atlas[smid]['name'], land=px(land)))
for mid, ex, tmid, (lk, lv) in INTRA:
    erect, _ = exit_geom(mid, ex)
    land = exit_geom(tmid, lv)[1] if lk == 'exit' else zone_centre(tmid, lv)
    scenes[mid]['links'].append(dict(kind='exit', key=ex if isinstance(ex, str) else ex[0], rect=px(erect), to=tmid, toName=csmaps[tmid]['name'], land=px(land)))
for (mid, key), c in CUSTOM.items():
    scenes[mid]['labels'].append(dict(key=key, rect=px(c['rect']), label=c['label']))
# every drawn exit marker on a physical map leads somewhere
for mid, exits in EXITS.items():
    keys = {l['key'] for l in scenes[mid]['links']}
    for e in exits: assert e in keys, f'{mid} exit {e} unlinked'
# landings inside the target map
for mid, s in scenes.items():
    for l in s['links']:
        W, H = (atlas[l['to']]['width'], atlas[l['to']]['height']) if l['to'] in atlas else (csmaps[l['to']]['width'], csmaps[l['to']]['height'])
        assert 0 < l['land'][0] < W and 0 < l['land'][1] < H, (mid, l)
out = dict(module='cold-storage', builtFor='1.9.0', streetDoors=street_doors,
           scenes={k: v for k, v in scenes.items() if v['links']})
json.dump(out, open(sys.argv[3], 'w'), indent=1)
print(sum(len(v) for v in street_doors.values()), 'street entrances;', sum(len(v['links']) for v in out['scenes'].values()), 'Cold Storage map links')
for smid, ds in street_doors.items():
    for d in ds: print(' ', smid, d['at'], '→', d['toName'], d['rect'])
