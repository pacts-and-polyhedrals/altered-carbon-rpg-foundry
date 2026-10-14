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
import bc_places as bp

# (original map, exit tag) <-> (destination map, exit tag on an original map | landmark block on a street map)
PAIRS = [
 ('BAY-STRIP', 'DOWNTOWN', 'BCS-OLD-DT-S', 'The Neon Strip'),
 ('BAY-STRIP', 'WATERFRONT', 'BCS-DOGPATCH', 'The Neon Strip · Waterfront'),
 ('BAY-STRIP', 'THE ALLEY', 'BAY-ALLEY', 'THE STRIP'),
 ('BAY-ALLEY', 'DELIVERY ROAD', 'BCS-MISSION', 'Rain Alley'),
 ('BAY-ALLEY', 'ROOFTOPS', 'BCS-MISSION', 'Rain Alley · Rooftops'),
 ('BAY-PRECINCT', 'STREET', 'BCS-FELL', 'BCPD Precinct House'),
 ('BAY-PRECINCT', 'GARAGE RAMP', 'BCS-FELL', 'BCPD Precinct House · Garage'),
 ('BAY-CLINIC', 'STREET', 'BCS-MISSION', 'Resleeving Clinic'),
 ('BAY-CLINIC', 'FIRE STAIR', 'BCS-MISSION', 'Resleeving Clinic · Fire Stair'),
 ('BAY-SPIRE', 'STREET LEVEL', 'BCS-OLD-DT-N', 'Meth Spire Penthouse'),
 ('BAY-SPIRE', 'SKY BRIDGE', 'BAY-SKYPORT', 'FLIGHT LANE'),
 ('BAY-PIT', 'STAIRS UP', 'BCS-LICKTOWN', 'The Fight Pit'),
 ('BAY-PIT', 'SERVICE TUNNEL', 'BAY-MARKET', 'STORM DRAINS'),
 ('BAY-DOCKS', 'CITY', 'BCS-DOGPATCH', 'Bay Docks'),
 ('BAY-DOCKS', 'BOAT SLIPS', 'BCS-WHARF', 'Bay Docks · Boat Slips'),
 ('BAY-SKYPORT', 'CONCOURSE', 'BCS-CIVIC', 'Skyport Landing Deck'),
 ('BAY-MARKET', 'STREET', 'BCS-LICKTOWN', 'Lower Bay Market'),
 ('BAY-CLUB', 'STREET', 'BCS-MISSION', 'Neon Nightclub'),
 ('BAY-CLUB', 'ALLEY DOOR', 'BCS-MISSION', 'Neon Nightclub · Alley Door'),
]
INTERIOR = {m['id']: m for m in bc.MAPS}
STREET = {t['id']: t for t in sa.TILES}
IW, IH = 28, 18

def display(map_id):
    return (INTERIOR[map_id]['name'] if map_id in INTERIOR else STREET[map_id]['name']).upper()

def proper(map_id):
    return INTERIOR[map_id]['name'] if map_id in INTERIOR else STREET[map_id]['name']

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

def street_door_sides(t, zones, landmark):
    """Every possible entrance on a block, best first: one per road side it touches."""
    z = next((z for z in zones if z.get('landmark') and z['name'] == landmark), None)
    out, seen = [], set()
    cands = []
    for r in zones:
        if r['kind'] not in ('road', 'junction'): continue
        e = cs.shared_edge(z['rect'], r['rect'])
        if e: cands.append(((r['kind'] == 'road', r.get('o') == 'h', -abs(e[0] - (z['rect'][0] + z['rect'][2] / 2))), r, e))
    cands.sort(key=lambda c: c[0], reverse=True)
    if not cands:   # block with no road frontage: entrance on the nearest road, facing the block
        zx, zy, zw, zh = z['rect']; best = None
        for r in zones:
            if r['kind'] not in ('road', 'junction'): continue
            rx, ry, rw, rh = r['rect']
            dx = max(0, rx - (zx + zw), zx - (rx + rw)); dy = max(0, ry - (zy + zh), zy - (ry + rh))
            if not best or (dx + dy) < best[0]: best = (dx + dy, r)
        r = best[1]; rx, ry, rw, rh = r['rect']
        cx = min(max(zx + zw / 2, rx + 1), rx + rw - 1)
        if ry + rh <= zy: ey = ry + rh; rect = (cx - 1, ey - 2, 2, 2)
        else: ey = ry; rect = (cx - 1, ey, 2, 2)
        return [dict(point=(cx, ey, False), rect=rect, land=(cx, rect[1] + 1), road=r['id'], roadName=r['name'])]
    for _, road, (ex, ey, vertical) in cands:
        side = ('v', round(ex, 1)) if vertical else ('h', round(ey, 1))
        if side in seen: continue
        seen.add(side)
        rx, ry, rw, rh = road['rect']
        if vertical: sx = ex if rx >= ex - 1e-6 else ex - 2; rect = (sx, ey - 1, 2, 2)
        else: sy = ey if ry >= ey - 1e-6 else ey - 2; rect = (ex - 1, sy, 2, 2)
        out.append(dict(point=(ex, ey, vertical), rect=rect, land=(rect[0] + rect[2] / 2, rect[1] + rect[3] / 2), road=road['id'], roadName=road['name']))
    return out

def overlaps(a, b): return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]

def main(isvg, ssvg, ijson, sjson, psvg=None, pjson=None):
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
        links.setdefault(a_map, []).append(dict(kind='exit' if a_map in INTERIOR else 'door', key=a_tag, rect=A['rect'], to=b_map, toName=proper(b_map), land=Bn['land']))
        links.setdefault(b_map, []).append(dict(kind='exit' if b_map in INTERIOR else 'door', key=b_key, rect=Bn['rect'], to=a_map, toName=proper(a_map), land=A['land']))
    # ---------------------------------------------------------------- a map for every named place without one
    places = []
    cs.W, cs.H = sa.W, sa.H
    used = {(b, k) for a_, at_, b, k in PAIRS}
    n = 0
    for t in sa.TILES:
        zones = street_zones[t['id']]
        taken = [e['rect'] for (mp, key), e in ends.items() if mp == t['id']] + [l['rect'] for l in sa.links_for(t)]
        for z in zones:
            if not z.get('landmark') or z.get('cs') or (t['id'], z['name']) in used: continue
            doors = []
            for d in street_door_sides(t, zones, z['name']):
                if any(overlaps(d['rect'], r) for r in taken + [x['rect'] for x in doors]): continue
                doors.append(d)
                if len(doors) == 2: break
            if not doors: raise SystemExit(f"{t['id']} {z['name']}: no free road side for an entrance")
            n += 1
            code = f'BP{n:02d}'
            exits = [dict(label=d['roadName'].upper(), side=side) for d, side in zip(doors, ['left', 'right'])]
            m = bp.make_place(z['name'], t['district'], t['accent'], code, exits)
            m['street'] = t['id']; m['block'] = z['name']
            for d, ex in zip(doors, m['exits']):
                r, land = exit_geometry(ex)
                key = f"{z['name']}#{d['roadName']}"
                ends[(t['id'], key)] = dict(rect=d['rect'], land=d['land'], point=d['point'])
                taken.append(d['rect'])
                links.setdefault(t['id'], []).append(dict(kind='door', key=key, at=z['name'], rect=d['rect'], to=m['id'], toName=m['name'], land=land))
                m.setdefault('links_out', []).append(dict(kind='exit', key=ex['label'], rect=r, to=t['id'], toName=t['name'], land=d['land'], zone=ex['zone'], arriveRoad=d['roadName']))
            places.append(m)
    # ---------------------------------------------------------------- relabel original exits with their real destinations
    for m in bc.MAPS:
        for e in m['exits']:
            l = next(l for l in links[m['id']] if l['key'] == e['tag'])
            if l['to'] in STREET:   # out onto a street: name the exact street section you arrive in
                lx, ly = l['land']
                z = next((z for z in street_zones[l['to']] if z['kind'] in ('road', 'junction') and z['rect'][0] <= lx <= z['rect'][0] + z['rect'][2] and z['rect'][1] <= ly <= z['rect'][1] + z['rect'][3]), None)
                e['label'] = (z['name'] if z else display(l['to'])).upper()
            else: e['label'] = display(l['to'])
            l['label'] = e['label']
        labels = [e['label'] for e in m['exits']]
        for e in m['exits']:   # two exits onto the same street section: add the entrance's name
            if labels.count(e['label']) > 1:
                l = next(l for l in links[m['id']] if l['key'] == e['tag'])
                blk = next((bk for a_, at_, b_, bk in PAIRS if a_ == m['id'] and at_ == e['tag']), '')
                suffix = blk.split(' · ')[-1] if ' · ' in blk else 'FRONT'
                e['label'] = f"{e['label']} · {suffix.upper()}"; l['label'] = e['label']
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
                          links=[dict(edge=None, kind=l['kind'], key=l.get('label', ''), rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], land=[cs.px(v) for v in l['land']]) for l in links[m['id']]]))
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
                                +[dict(edge=None, kind='door', at=l.get('at', l['key']), rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], land=[cs.px(v) for v in l['land']]) for l in doors]))
    json.dump(dict(atlas='Bay City Street Atlas', cols=4, rows=4, maps=sdata), open(sjson, 'w'), indent=1)
    # ---------------------------------------------------------------- place maps
    if psvg:
        cs.W, cs.H = IW, IH
        os.makedirs(psvg, exist_ok=True)
        pdata = []
        for m in places:
            open(os.path.join(psvg, m['slug'] + '.svg'), 'w').write(cs.render(m))
            adj = {z['id']: set() for z in m['zones']}
            for l in m['links']: adj[l[0]].add(l[1]); adj[l[1]].add(l[0])
            pdata.append(dict(id=m['id'], name=m['name'], code=m['code'], district=m['journal'], kind=m['kind'], street=m['street'], block=m['block'],
                              file='places/' + m['slug'] + '.webp', width=IW * 100, height=IH * 100, gridSize=100,
                              zones=[dict(id=z['id'], name=z['name'], rect=[cs.px(v) for v in z['rect']], adjacent=sorted(adj[z['id']])) for z in m['zones']],
                              exits=[e['label'] for e in m['exits']],
                              links=[dict(edge=None, kind='exit', key=l['key'], rect=[cs.px(v) for v in l['rect']], to=l['to'], toName=l['toName'], land=[cs.px(v) for v in l['land']], zone=l['zone'], arriveRoad=l['arriveRoad']) for l in m['links_out']]))
        json.dump({'maps': pdata}, open(pjson, 'w'), indent=1)
        print(len(places), 'place maps')
    print(len(PAIRS), 'two-way links;', sum(len(v) for v in links.values()), 'link ends')

if __name__ == '__main__':
    main(*sys.argv[1:7])
