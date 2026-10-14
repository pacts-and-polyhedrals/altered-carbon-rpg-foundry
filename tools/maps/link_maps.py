"""Link the 10 original Bay City maps to real destinations and render both map sets.
Usage: python3 link_maps.py INTERIOR_SVG_DIR STREET_SVG_DIR INTERIOR_JSON STREET_JSON

Every exit tag on an original map leads somewhere real, and every link works both ways:
 - original map <-> original map (paired exits), or
 - original map <-> a building entrance drawn on a Street Atlas block.
"""
import json, os, sys, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coldstyle as cs
import bay_city as bc
import street_atlas as sa

# (original map, exit tag) <-> (destination map, exit tag on an original map | landmark block on a street map)
PAIRS = [
 ('BAY-STRIP', 'DOWNTOWN', 'BCS-OLD-DT-S', 'Old Downtown Arcade'),
 ('BAY-STRIP', 'WATERFRONT', 'BCS-DOGPATCH', 'Dry Dock'),
 ('BAY-STRIP', 'THE ALLEY', 'BAY-ALLEY', 'THE STRIP'),
 ('BAY-ALLEY', 'DELIVERY ROAD', 'BCS-MISSION', 'Mural Alley'),
 ('BAY-ALLEY', 'ROOFTOPS', 'BCS-MISSION', 'AI Hotel Row'),
 ('BAY-PRECINCT', 'STREET', 'BCS-FELL', 'BCPD Fell St Precinct'),
 ('BAY-PRECINCT', 'GARAGE RAMP', 'BCS-FELL', 'Patrol Garage'),
 ('BAY-CLINIC', 'STREET', 'BCS-MISSION', 'Clinic Row'),
 ('BAY-CLINIC', 'FIRE STAIR', 'BCS-MISSION', 'Taqueria Block'),
 ('BAY-SPIRE', 'STREET LEVEL', 'BCS-OLD-DT-N', 'Pyramid Tower'),
 ('BAY-SPIRE', 'SKY BRIDGE', 'BAY-SKYPORT', 'FLIGHT LANE'),
 ('BAY-PIT', 'STAIRS UP', 'BCS-LICKTOWN', 'Fightdrome'),
 ('BAY-PIT', 'SERVICE TUNNEL', 'BAY-MARKET', 'STORM DRAINS'),
 ('BAY-DOCKS', 'CITY', 'BCS-DOGPATCH', 'Container Piers'),
 ('BAY-DOCKS', 'BOAT SLIPS', 'BCS-WHARF', 'Ferry Terminal'),
 ('BAY-SKYPORT', 'CONCOURSE', 'BCS-CIVIC', 'Transit Hub'),
 ('BAY-MARKET', 'STREET', 'BCS-LICKTOWN', 'Licktown Market'),
 ('BAY-CLUB', 'STREET', 'BCS-MISSION', 'Night Market'),
 ('BAY-CLUB', 'ALLEY DOOR', 'BCS-MISSION', 'The Neon Strip'),
]
INTERIOR = {m['id']: m for m in bc.MAPS}
STREET = {t['id']: t for t in sa.TILES}
IW, IH = 28, 18

def display(map_id):
    return (INTERIOR[map_id]['name'] if map_id in INTERIOR else STREET[map_id]['name']).upper()

def interior_exit(m, tag):
    e = next((e for e in m['exits'] if e.get('tag', e['label']) == tag), None)
    if not e: raise SystemExit(f"{m['id']} has no exit {tag}")
    return e

def exit_geometry(e):
    """Exit strip (cells) beside the arrow, and the landing point one step inside the map."""
    x, y = e['at']; d = e['dir']
    if d == 'right': r, land = (x - 2, y - 1, 2, 2), (x - 3.2, y)
    elif d == 'left': r, land = (max(0, x - 1), y - 1, 2, 2), (max(0, x - 1) + 3.2, y)
    elif d == 'down': r, land = (x - 1, y - 2, 2, 2), (x, y - 3.2)
    else: r, land = (x - 1, max(0, y - 1), 2, 2), (x, max(0, y - 1) + 3.2)
    return r, land

def street_door(t, zones, landmark):
    """Entrance on a landmark block: the shared edge with a road, strip on the road side."""
    z = next((z for z in zones if z.get('landmark') and z['name'] == landmark), None)
    if not z: raise SystemExit(f"{t['id']} has no landmark block {landmark}")
    best = None
    for r in zones:
        if r['kind'] not in ('road', 'junction'): continue
        e = cs.shared_edge(z['rect'], r['rect'])
        if not e: continue
        score = (r['kind'] == 'road', r.get('o') == 'h')
        if not best or score > best[0]: best = (score, r, e)
    if not best: raise SystemExit(f"{t['id']} {landmark} touches no road")
    _, road, (ex, ey, vertical) = best
    rx, ry, rw, rh = road['rect']
    if vertical:  # block and road side by side: strip on the road side of x=ex
        sx = ex if rx >= ex - 1e-6 else ex - 2
        rect = (sx, ey - 1, 2, 2)
    else:
        sy = ey if ry >= ey - 1e-6 else ey - 2
        rect = (ex - 1, sy, 2, 2)
    land = (rect[0] + rect[2] / 2, rect[1] + rect[3] / 2)
    return dict(point=(ex, ey, vertical), rect=rect, land=land, road=road['id'])

def main(isvg, ssvg, ijson, sjson):
    # ---------------------------------------------------------------- resolve both ends of every pair
    for m in bc.MAPS:
        for e in m['exits']: e['tag'] = e['label']
    street_zones = {}
    for t in sa.TILES: street_zones[t['id']] = sa.build(t)[2]
    ends = {}  # (map, key) -> dict(rect, land)
    for a_map, a_tag, b_map, b_key in PAIRS:
        for mp, key in ((a_map, a_tag), (b_map, b_key)):
            if (mp, key) in ends: raise SystemExit(f'{mp} {key} used twice')
            if mp in INTERIOR:
                r, land = exit_geometry(interior_exit(INTERIOR[mp], key)); ends[(mp, key)] = dict(rect=r, land=land)
            else:
                ends[(mp, key)] = street_door(STREET[mp], street_zones[mp], key)
    # every original exit is linked
    for m in bc.MAPS:
        for e in m['exits']:
            if not any((m['id'], e['tag']) in ((a, at), (b, bk)) for a, at, b, bk in PAIRS): raise SystemExit(f"unlinked exit {m['id']} {e['tag']}")
    links = {}
    for a_map, a_tag, b_map, b_key in PAIRS:
        A, Bn = ends[(a_map, a_tag)], ends[(b_map, b_key)]
        links.setdefault(a_map, []).append(dict(kind='exit' if a_map in INTERIOR else 'door', key=a_tag, rect=A['rect'], to=b_map, toName=display(b_map).title(), land=Bn['land']))
        links.setdefault(b_map, []).append(dict(kind='exit' if b_map in INTERIOR else 'door', key=b_key, rect=Bn['rect'], to=a_map, toName=display(a_map).title(), land=A['land']))
    # ---------------------------------------------------------------- relabel original exits with their real destinations
    for m in bc.MAPS:
        for e in m['exits']:
            l = next(l for l in links[m['id']] if l['key'] == e['tag'])
            e['label'] = display(l['to'])
    # ---------------------------------------------------------------- interiors
    cs.W, cs.H = IW, IH
    os.makedirs(isvg, exist_ok=True)
    idata = []
    for m in bc.MAPS:
        open(os.path.join(isvg, m['slug'] + '.svg'), 'w').write(cs.render(m))
        adj = {z['id']: set() for z in m['zones']}
        for l in m['links']: adj[l[0]].add(l[1]); adj[l[1]].add(l[0])
        idata.append(dict(id=m['id'], name=m['name'], code=m['code'], district=m['journal'], file=m['slug'] + '.webp', width=IW * 100, height=IH * 100, gridSize=100,
                          zones=[dict(id=z['id'], name=z['name'], rect=[cs.px(v) for v in z['rect']], adjacent=sorted(adj[z['id']])) for z in m['zones']],
                          exits=[e['label'] for e in m['exits']],
                          links=[dict(edge=None, kind=l['kind'], rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], land=[cs.px(v) for v in l['land']]) for l in links[m['id']]]))
    json.dump({'maps': idata}, open(ijson, 'w'), indent=1)
    # ---------------------------------------------------------------- street maps with entrances
    cs.W, cs.H = sa.W, sa.H
    os.makedirs(ssvg, exist_ok=True)
    sdata = []
    for t in sa.TILES:
        doors = [l for l in links.get(t['id'], [])]
        t['doors'] = [dict(ends[(t['id'], l['key'])], key=l['key'], toName=l['toName']) for l in doors]
        svg, roads, zones, elinks = sa.render_tile(t)
        slug = t['code'].lower() + '-' + ''.join(ch if ch.isalnum() else '-' for ch in t['name'].lower()).strip('-').replace('---', '-').replace('--', '-')
        open(os.path.join(ssvg, slug + '.svg'), 'w').write(svg)
        adj = sa.adjacency(zones)
        sdata.append(dict(id=t['id'], code=t['code'], name=t['name'], district=t['district'], col=t['col'], row=t['row'], file='streets/' + slug + '.webp',
                          width=sa.W * 100, height=sa.H * 100, gridSize=100,
                          zones=[dict(id=z['id'], name=z['name'], kind=z['kind'], rect=[cs.px(v) for v in z['rect']], adjacent=sorted(adj[z['id']])) for z in zones],
                          links=[dict(edge=l['edge'], slot=l['slot'], kind='edge', rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], toEdge=l['toEdge']) for l in elinks]
                                +[dict(edge=None, kind='door', at=l['key'], rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], land=[cs.px(v) for v in l['land']]) for l in doors]))
    json.dump(dict(atlas='Bay City Street Atlas', cols=4, rows=4, maps=sdata), open(sjson, 'w'), indent=1)
    print(len(PAIRS), 'two-way links;', sum(len(v) for v in links.values()), 'link ends')

if __name__ == '__main__':
    main(*sys.argv[1:5])
