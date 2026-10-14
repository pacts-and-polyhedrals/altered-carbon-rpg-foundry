"""Bay City Street Atlas — linked car-chase street maps in the system's noir schematic style.
Usage: python3 street_atlas.py OUT_DIR CONTENT_JSON

Every map is 42 x 27 cells (100 px each). Roads cross map edges only at fixed slots, so a road
leaving one map always meets the same road on the neighbouring map:
  north/south edges:  L x 8-12   R x 29-33   B/C (bridge / causeway) x 18-24
  east/west edges:    U y 6-10   D y 17-21
The atlas's outer edges are closed (water, the city wall, or the Marin blockade).
"""
import json, os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coldstyle as cs
import bay_city as bc  # registers the city furniture in cs.FURNITURE

def f_baywater(x, y, w, h, acc):
    g = rect(x, y, w, h, '#0c3140', 0) + rect(x, y, w, h, acc, 0, 'opacity=".10"')
    return g + cs.FURNITURE['water'](x, y, w, h, acc)
cs.FURNITURE['baywater'] = f_baywater

def f_entrance(x, y, vertical, road_after, acc, name):
    """Building entrance on a block edge, labelled with the map it leads to."""
    g = cs.door(x, y, vertical, acc, '')
    label = 'ENTER · ' + name
    w = len(label) * .15 + .5
    if vertical:  # block is on the other side of the road strip
        bx = x - w - .3 if road_after else x + .3; by = y - 1.0
    else:
        bx = x - w / 2; by = y - .95 if road_after else y + 1.05
    g += rect(bx, by, w, .55, INK, 4, f'stroke="{acc}" stroke-width="3"') + text(bx + w / 2, by + .39, label, 18, acc, ls=2)
    return g
cs.FURNITURE['entrance'] = f_entrance
from coldstyle import px, rect, line, circ, text, INK, BONE, BONE2

W, H = 42, 27
cs.W, cs.H = W, H
CELL = cs.CELL
SLOT_X = {'L': (8, 12), 'R': (29, 33), 'B': (18, 24), 'C': (18, 24)}
SLOT_Y = {'U': (6, 10), 'D': (17, 21)}
DEPTH = 3
OPP = {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}
STEP = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}
CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE = bc.CY, bc.RED, bc.AMB, bc.GOLD, bc.TEAL, bc.VIO, bc.PINK, bc.BLUE
GREEN = '#8be6b0'

COL_NAMES = {0: {'L': 'Presidio Pkwy', 'R': 'Stanyan St'}, 1: {'L': 'Mission St', 'R': 'Valencia St'},
             2: {'L': 'Van Ness Ave', 'R': 'Powell St'}, 3: {'L': 'Third St', 'R': 'Battery St'}}
ROW_NAMES = {0: {'U': 'Embarcadero Hwy'}, 1: {'U': 'Fell St', 'D': 'Oak St'}, 2: {'U': '16th St', 'D': 'Cesar Chavez St'}}
SPECIAL = {'B': 'Golden Gate Bridge', 'C': 'Alcatraz Causeway'}
SHORT = lambda n: n.replace(' Street', '').replace(' St', '').replace(' Ave', '').replace(' Blvd', '').replace(' Pkwy', '').replace(' Hwy', '')

def T(id, col, row, code, name, district, accent, N=(), E=(), S=(), W=(), closed=None, **kw):
    t = dict(id=id, col=col, row=row, code=code, name=name, district=district, accent=accent,
             edges={'N': list(N), 'E': list(E), 'S': list(S), 'W': list(W)}, closed=closed or {}, **kw)
    return t

TILES = [
 T('BCS-GG-NORTH', 0, -1, 'BCS01', 'Golden Gate · North Span', 'BRIDGE STACKS', AMB, S=['B'],
   closed={'N': 'blockade', 'E': 'water', 'W': 'water'}, land=[(13, 3, 5, 24), (24, 3, 5, 24)],
   landmarks=['WEST STACKS', 'EAST STACKS'], stacks=True),
 T('BCS-GG-SOUTH', 0, 0, 'BCS02', 'Golden Gate · South Span', 'PRESIDIO', AMB, N=['B'], E=['U'], S=['L'],
   closed={'N': 'water', 'W': 'water'}, landmarks=['FORT POINT', 'PRESIDIO CHECKPOINT', 'TOLL AUTHORITY', 'BRIDGE DEPOT'], toll=True),
 T('BCS-MARINA', 1, 0, 'BCS03', 'Marina Seawall', 'MARINA', CY, E=['U'], S=['R'], W=['U'],
   closed={'N': 'water'}, landmarks=['MARINA HABS', 'SEAWALL PUMPS', 'YACHT STACKS', 'PALACE RUINS']),
 T('BCS-ALCATRAZ', 2, -1, 'BCS04', 'Psychasec Alcatraz', 'THE ROCK', RED, S=['C'],
   closed={'N': 'water', 'E': 'water', 'W': 'water'}, land=[(9, 4, 24, 16)],
   extra=[dict(x=11, y=6, w=20, h=3, o='h', name='Cellhouse Loop N'), dict(x=11, y=14, w=20, h=3, o='h', name='Cellhouse Loop S'),
          dict(x=11, y=9, w=3, h=5, o='v', name='West Ramp'), dict(x=28, y=9, w=3, h=5, o='v', name='East Ramp')],
   landmarks=['PSYCHASEC CELLHOUSE', 'LIGHTHOUSE', 'SALLY PORT', 'POWERHOUSE', 'PARADE GROUND'], island=True),
 T('BCS-WHARF', 2, 0, 'BCS05', 'Wharf & Causeway', 'FISHERMAN\'S WHARF', TEAL, N=['C'], E=['U'], S=['L', 'R'], W=['U'],
   closed={'N': 'water'}, landmarks=['FERRY TERMINAL', 'PIER MARKET', 'CAUSEWAY GATE', 'CANNERY HABS', 'CABLE YARD']),
 T('BCS-OLD-DT-N', 3, 0, 'BCS06', 'Old Downtown · North', 'OLD DOWNTOWN', GOLD, S=['L', 'R'], W=['U'],
   closed={'N': 'water', 'E': 'water'}, landmarks=['PYRAMID TOWER', 'OLD BANKS', 'DEAD TOWERS', 'FERRY BUILDING', 'GROUNDER CAMP']),
 T('BCS-PANHANDLE', 0, 1, 'BCS07', 'Panhandle West', 'HAIGHT', GREEN, N=['L'], E=['U', 'D'], S=['R'],
   closed={'W': 'water'}, landmarks=['GOLDEN GATE PARK', 'HAIGHT SQUATS', 'PANHANDLE GREEN', 'OCEAN WALL', 'KEZAR HABS'], park=True),
 T('BCS-FELL', 1, 1, 'BCS08', 'Fell Street · BCPD', 'HAYES VALLEY', BLUE, N=['R'], E=['U', 'D'], S=['L', 'R'], W=['U', 'D'],
   landmarks=['BCPD FELL ST PRECINCT', 'HAYES MARKET', 'IMPOUND LOT', 'ALAMO TERRACES', 'PATROL GARAGE', 'COURTHOUSE ANNEX']),
 T('BCS-CIVIC', 2, 1, 'BCS09', 'Civic Center', 'CIVIC CENTER', VIO, N=['L', 'R'], E=['U', 'D'], S=['L', 'R'], W=['U', 'D'],
   landmarks=['CITY HALL RUINS', 'UN PLAZA', 'PROTECTORATE OFFICE', 'OPERA HOUSE', 'TRANSIT HUB', 'ARCHIVE TOWER', 'MAGLEV DEPOT', 'SLUMS', 'MARKET ARCADE']),
 T('BCS-OLD-DT-S', 3, 1, 'BCS10', 'Old Downtown · South', 'OLD DOWNTOWN', GOLD, N=['L', 'R'], S=['L'], W=['U', 'D'],
   closed={'E': 'water'}, landmarks=['MAGLEV STATION', 'OLD DOWNTOWN ARCADE', 'BAY BRIDGE RAMP', 'SALESFORCE HULK', 'RINCON HABS', 'STACK BROKERS']),
 T('BCS-TWIN-PEAKS', 0, 2, 'BCS11', 'Twin Peaks Switchbacks', 'TWIN PEAKS', GREEN, N=['R'], E=['D'],
   closed={'W': 'water', 'S': 'wall'}, landmarks=['SUTRO MAST', 'PEAK OVERLOOK', 'RESERVOIR', 'HILL HABS'], park=True),
 T('BCS-MISSION', 1, 2, 'BCS12', 'Mission Street · AI Hotels', 'MISSION', PINK, N=['L', 'R'], E=['U', 'D'], W=['D'],
   closed={'S': 'wall'}, landmarks=['AI HOTEL ROW', 'THE NEON STRIP', 'TAQUERIA BLOCK', 'DOLORES CHAPEL', 'CLINIC ROW', 'MURAL ALLEY', 'NIGHT MARKET']),
 T('BCS-LICKTOWN', 2, 2, 'BCS13', 'Licktown', 'LICKTOWN · POTRERO', RED, N=['L', 'R'], E=['U'], W=['U', 'D'],
   closed={'S': 'wall'}, landmarks=['LICKTOWN MARKET', 'CONTAINER HABS', 'FIGHTDROME', 'CHOP SHOPS', 'STACK DEALERS', 'POTRERO HILL', 'SCRAPYARD']),
 T('BCS-DOGPATCH', 3, 2, 'BCS14', 'Dogpatch Docks', 'DOGPATCH', CY, N=['L'], W=['U'],
   closed={'E': 'water', 'S': 'wall'}, extra=[dict(x=29, y=6, w=4, h=18, o='v', name='Dock Road')],
   landmarks=['CRANE YARD', 'BAY DAM ACCESS', 'DRY DOCK', 'CONTAINER PIERS', 'POWER STATION']),
]
BY_POS = {(t['col'], t['row']): t for t in TILES}

# --------------------------------------------------------------------------- road network
def roads_for(t):
    e, col, row = t['edges'], t['col'], t['row']
    vs, hs = [], []
    for s in ('L', 'R', 'B', 'C'):
        n, so = s in e['N'], s in e['S']
        if n or so: vs.append(dict(slot=s, x=SLOT_X[s][0], w=SLOT_X[s][1] - SLOT_X[s][0], open_n=n, open_s=so,
                                   name=SPECIAL.get(s) or COL_NAMES[col][s]))
    for s in ('U', 'D'):
        w_, e_ = s in e['W'], s in e['E']
        if w_ or e_: hs.append(dict(slot=s, y=SLOT_Y[s][0], h=SLOT_Y[s][1] - SLOT_Y[s][0], open_w=w_, open_e=e_, name=ROW_NAMES[max(0, row)][s]))
    ex_v = [r for r in t.get('extra', []) if r['o'] == 'v']; ex_h = [r for r in t.get('extra', []) if r['o'] == 'h']
    top_wall = DEPTH if t['closed'].get('N') in ('water', 'blockade') else 0
    bottom_wall = H - DEPTH if t['closed'].get('S') in ('water',) else H - (1 if t['closed'].get('S') == 'wall' else 0)
    out = []
    xs = [v['x'] for v in vs] + [r['x'] for r in ex_v]; xe = [v['x'] + v['w'] for v in vs] + [r['x'] + r['w'] for r in ex_v]
    for h in hs:
        x0 = 0 if h['open_w'] else min(xs); x1 = W if h['open_e'] else max(xe)
        out.append(dict(o='h', x=x0, y=h['y'], w=x1 - x0, h=h['h'], name=h['name'], slot=h['slot']))
    ys = [h['y'] for h in hs] + [r['y'] for r in ex_h]; ye = [h['y'] + h['h'] for h in hs] + [r['y'] + r['h'] for r in ex_h]
    for v in vs:
        y0 = 0 if v['open_n'] else (min(ys) if ys else top_wall); y1 = H if v['open_s'] else (max(ye) if ye else bottom_wall)
        out.append(dict(o='v', x=v['x'], y=y0, w=v['w'], h=y1 - y0, name=v['name'], slot=v['slot']))
    for r in t.get('extra', []): out.append(dict(r, slot=None))
    return out

# --------------------------------------------------------------------------- cells → zones
def inside(px_, py_, r): return r[0] <= px_ < r[0] + r[2] and r[1] <= py_ < r[1] + r[3]

def build(t):
    roads = roads_for(t)
    water = []
    for edge, kind in t['closed'].items():
        if kind != 'water': continue
        water.append({'N': (0, 0, W, DEPTH), 'S': (0, H - DEPTH, W, DEPTH), 'W': (0, 0, DEPTH, H), 'E': (W - DEPTH, 0, DEPTH, H)}[edge])
    land = t.get('land')
    xs, ys = {0, W}, {0, H}
    for r in roads: xs |= {r['x'], r['x'] + r['w']}; ys |= {r['y'], r['y'] + r['h']}
    for r in water + (land or []): xs |= {r[0], r[0] + r[2]}; ys |= {r[1], r[1] + r[3]}
    # long stretches are split so a chase has granularity (no zone longer than ~11 cells)
    def refine(vals, limit=11):
        vals = sorted(vals); out = [vals[0]]
        for v in vals[1:]:
            gap = v - out[-1]
            if gap > limit:
                n = int(-(-gap // 9)); base = out[-1]
                out += [round(base + gap * k / n, 3) for k in range(1, n)]
            out.append(v)
        return sorted(set(out))
    xs, ys = refine(xs), refine(ys)
    cells = {}
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            on = [k for k, r in enumerate(roads) if inside(cx, cy, (r['x'], r['y'], r['w'], r['h']))]
            if on: kind = 'road'
            elif any(inside(cx, cy, w) for w in water) or (land is not None and not any(inside(cx, cy, l) for l in land)): kind = 'water'
            else: kind = 'land'
            cells[(i, j)] = dict(kind=kind, roads=on, rect=(xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]))
    zones, used = [], set()
    # junctions: road cells on two perpendicular roads
    for key, c in cells.items():
        if c['kind'] == 'road' and len({roads[k]['o'] for k in c['roads']}) == 2:
            h = next(roads[k] for k in c['roads'] if roads[k]['o'] == 'h'); v = next(roads[k] for k in c['roads'] if roads[k]['o'] == 'v')
            zones.append(dict(kind='junction', name=f"{SHORT(h['name'])} & {SHORT(v['name'])}", rect=list(c['rect']), keys=[key])); used.add(key)
    # road segments: runs of non-junction cells along each road
    for k, r in enumerate(roads):
        keys = sorted([key for key, c in cells.items() if c['kind'] == 'road' and k in c['roads'] and key not in used],
                      key=lambda q: (q[0], q[1]))
        runs, cur = [], []
        axis = 0 if r['o'] == 'h' else 1
        for key in sorted(keys, key=lambda q: q[axis]):
            if cur and key[axis] != cur[-1][axis] + 1: runs.append(cur); cur = []
            cur.append(key)
        if cur: runs.append(cur)
        chunked = []
        for run in runs:
            cur, length = [], 0
            for q in run:
                L = cells[q]['rect'][2 + axis]
                if cur and length + L > 10.5: chunked.append(cur); cur, length = [], 0
                cur.append(q); length += L
            if cur: chunked.append(cur)
        for run in chunked:
            rs = [cells[q]['rect'] for q in run]
            x0, y0 = min(a[0] for a in rs), min(a[1] for a in rs); x1, y1 = max(a[0] + a[2] for a in rs), max(a[1] + a[3] for a in rs)
            zones.append(dict(kind='road', road=r['name'], o=r['o'], name=r['name'], rect=[x0, y0, x1 - x0, y1 - y0], keys=run)); used.update(run)
    # land: greedy maximal rectangles
    land_keys = sorted([q for q, c in cells.items() if c['kind'] == 'land'], key=lambda q: (q[1], q[0]))
    for q in land_keys:
        if q in used: continue
        i0, j0 = q; i1 = i0
        span = lambda a, b, k: sum(cells[(i, j0)]['rect'][2] for i in range(a, b + 1)) if k == 'w' else sum(cells[(i0, j)]['rect'][3] for j in range(a, b + 1))
        while (i1 + 1, j0) in cells and cells[(i1 + 1, j0)]['kind'] == 'land' and (i1 + 1, j0) not in used and span(i0, i1 + 1, 'w') <= 12.5: i1 += 1
        j1 = j0
        while all((i, j1 + 1) in cells and cells[(i, j1 + 1)]['kind'] == 'land' and (i, j1 + 1) not in used for i in range(i0, i1 + 1)) and span(j0, j1 + 1, 'h') <= 9.5: j1 += 1
        keys = [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]
        x0, y0 = cells[(i0, j0)]['rect'][:2]; x1 = cells[(i1, j1)]['rect'][0] + cells[(i1, j1)]['rect'][2]; y1 = cells[(i1, j1)]['rect'][1] + cells[(i1, j1)]['rect'][3]
        zones.append(dict(kind='land', name='', rect=[x0, y0, x1 - x0, y1 - y0], keys=keys)); used.update(keys)
    name_zones(t, zones)
    return roads, water, zones

def compass(cx, cy):
    ns = 'North' if cy < H * .36 else 'South' if cy > H * .64 else ''
    ew = 'West' if cx < W * .36 else 'East' if cx > W * .64 else ''
    return (f'{ns}-{ew}' if ns and ew else ns or ew or 'Central')

def name_zones(t, zones):
    # road segments: West/Centre/East or North/Mid/South (numbered when more)
    by_road = {}
    for z in zones:
        if z['kind'] == 'road': by_road.setdefault(z['road'], []).append(z)
    for road, segs in by_road.items():
        segs.sort(key=lambda z: z['rect'][0] if z['o'] == 'h' else z['rect'][1])
        labels = (['West', 'Centre', 'East'] if segs[0]['o'] == 'h' else ['North', 'Mid', 'South']) if len(segs) == 3 else \
                 (['West', 'East'] if segs[0]['o'] == 'h' else ['North', 'South']) if len(segs) == 2 else \
                 [''] if len(segs) == 1 else [str(i + 1) for i in range(len(segs))]
        for z, lab in zip(segs, labels): z['name'] = f"{SHORT(road)} {lab}".strip() if lab else road
    # land: biggest blocks get the district landmarks, the rest compass names
    lands = sorted([z for z in zones if z['kind'] == 'land'], key=lambda z: -z['rect'][2] * z['rect'][3])
    marks = list(t.get('landmarks', []))
    seen = {}
    for z in lands:
        if marks and z['rect'][2] >= 4 and z['rect'][3] >= 2.5: z['name'] = marks.pop(0).title().replace("'S", "'s").replace('Bcpd', 'BCPD').replace('Un ', 'UN ').replace('Ai ', 'AI '); z['landmark'] = True
        else:
            base = compass(z['rect'][0] + z['rect'][2] / 2, z['rect'][1] + z['rect'][3] / 2) + ' Block'
            seen[base] = seen.get(base, 0) + 1
            z['name'] = base if seen[base] == 1 else f'{base} {seen[base]}'
    # unique ids
    ids = {}
    for z in zones:
        base = ''.join(ch if ch.isalnum() else '-' for ch in z['name'].lower()).strip('-')
        while '--' in base: base = base.replace('--', '-')
        ids[base] = ids.get(base, 0) + 1
        z['id'] = base if ids[base] == 1 else f'{base}-{ids[base]}'

def adjacency(zones):
    adj = {z['id']: set() for z in zones}
    for i, a in enumerate(zones):
        for b in zones[i + 1:]:
            if cs.shared_edge(a['rect'], b['rect']): adj[a['id']].add(b['id']); adj[b['id']].add(a['id'])
    return adj

# --------------------------------------------------------------------------- links between maps
def links_for(t):
    out = []
    for edge, slots in t['edges'].items():
        for s in slots:
            dx, dy = STEP[edge]; n = BY_POS.get((t['col'] + dx, t['row'] + dy))
            if edge in ('N', 'S'):
                x0, x1 = SLOT_X[s]; y0 = 0 if edge == 'N' else H - 2
                r = (x0, y0, x1 - x0, 2)
            else:
                y0, y1 = SLOT_Y[s]; x0 = 0 if edge == 'W' else W - 2
                r = (x0, y0, 2, y1 - y0)
            out.append(dict(edge=edge, slot=s, rect=r, to=n['id'] if n else None, toName=n['name'] if n else None, toEdge=OPP[edge]))
    return out

def validate():
    errs = []
    for t in TILES:
        for edge, slots in t['edges'].items():
            dx, dy = STEP[edge]; n = BY_POS.get((t['col'] + dx, t['row'] + dy))
            if slots and not n: errs.append(f"{t['code']} {edge} exit {slots} leads off the atlas")
            if n and sorted(n['edges'][OPP[edge]]) != sorted(slots): errs.append(f"{t['code']} {edge} {slots} != {n['code']} {OPP[edge]} {n['edges'][OPP[edge]]}")
            if not slots and not n and edge not in t['closed']: errs.append(f"{t['code']} {edge} edge has no neighbour and is not closed")
    # every map reachable from every other through road links
    seen, todo = set(), [TILES[0]['id']]
    while todo:
        cur = todo.pop(); seen.add(cur); t = next(x for x in TILES if x['id'] == cur)
        for l in links_for(t):
            if l['to'] and l['to'] not in seen: todo.append(l['to'])
    if len(seen) != len(TILES): errs.append(f'unreachable maps: {[t["code"] for t in TILES if t["id"] not in seen]}')
    return errs

# --------------------------------------------------------------------------- drawing
def decorate(t, roads, water, zones, links, rnd):
    acc = t['accent']; under, items, over = [], [], []
    for w in water: under.append(('baywater', *w, acc))
    if t.get('land'):
        under.insert(0, ('baywater', 0, 0, W, H, acc))
    for r in roads:
        under.append(('road', r['x'], r['y'], r['w'], r['h'], acc, r['o'] == 'h', 2))
    # seawall along water/land boundaries
    for edge, kind in t['closed'].items():
        if kind == 'water':
            seg = {'N': (0, DEPTH, W, DEPTH), 'S': (0, H - DEPTH, W, H - DEPTH), 'W': (DEPTH, 0, DEPTH, H), 'E': (W - DEPTH, 0, W - DEPTH, H)}[edge]
            if not t.get('land'): over.append(('window', *seg, acc))
        elif kind == 'wall':
            over.append(('barrier', .3, H - .45, W - .3, H - .45, acc)); over.append(('label', W / 2, H - .9, 'CITY LIMIT WALL · SEALED', acc, 20))
        elif kind == 'blockade':
            over.append(('barrier', 17, DEPTH - .2, 25, DEPTH - .2, RED)); over.append(('label', 21, DEPTH - .7, 'MARIN BLOCKADE · NO CROSSING', RED, 20))
    for z in zones:
        x, y, w, h = z['rect']
        if z['kind'] == 'junction':
            under.append(('crosswalk', x + .2, y - .45, w - .4, .4, True)) if y > .5 else None
            under.append(('crosswalk', x + .2, y + h + .05, w - .4, .4, True)) if y + h < H - .5 else None
        if z['kind'] == 'land':
            if t.get('stacks'):
                for k in range(int(h / 1.6)):
                    items.append(('container', x + .4, y + .4 + k * 1.6, [AMB, CY, RED, BONE2][k % 4], True, min(4.2, w - .8)))
            elif t.get('park') and z.get('landmark') and 'Park' in z['name'] or (t.get('park') and 'Green' in z['name']):
                for k in range(int(w * h / 6)):
                    items.append(('pillar', x + .8 + rnd.random() * (w - 1.6), y + .8 + rnd.random() * (h - 1.6), .32))
                items.append(('label', x + w / 2, y + h / 2, z['name'].upper(), GREEN, 22))
            elif w >= 2 and h >= 2:
                items.append(('building', x + .45, y + .45, w - .9, h - .9, acc, z['name'].upper() if z.get('landmark') else ''))
    # traffic and cover on road segments
    segs = [z for z in zones if z['kind'] == 'road']
    rnd.shuffle(segs)
    for z in segs[:6]:
        x, y, w, h = z['rect']
        horiz = z['o'] == 'h'
        if horiz and w >= 3:
            cx = x + .4 + rnd.random() * max(.1, w - 3); cy = y + (.45 if rnd.random() < .5 else h - 1.5)
            items.append(('car', cx, cy, rnd.choice([acc, RED, AMB, BONE2]), True))
        elif not horiz and h >= 3:
            cx = x + (.45 if rnd.random() < .5 else w - 1.5); cy = y + .4 + rnd.random() * max(.1, h - 3)
            items.append(('car', cx, cy, rnd.choice([acc, RED, AMB, BONE2]), False))
    for z in segs[6:9]:
        x, y, w, h = z['rect']; over.append(('cover', x + w / 2, y + h / 2, acc, rnd.random() < .3))
    for z in [z for z in zones if z['kind'] == 'road'][:3]:
        x, y, w, h = z['rect']; under.append(('puddle', x + w * .5, y + h * .5, min(1.4, w * .3), .35, acc))
    # tile specials
    if t.get('toll'):
        over.append(('gate', 18.2, 4.0, 23.8, 4.0, acc)); over.append(('label', 21, 4.7, 'TOLL GATES', acc, 18))
    if t['id'] == 'BCS-WHARF':
        over.append(('gate', 18.2, 4.0, 23.8, 4.0, RED)); over.append(('label', 21, 4.7, 'CAUSEWAY CHECKPOINT', RED, 18))
    if t.get('island'):
        over.append(('label', 21, 23.0, 'CAUSEWAY OVER THE BAY', RED, 20))
    if t['id'] == 'BCS-GG-NORTH':
        for y in (11.5, 12.6):
            over.append(('barrier', 17.6, y, 24.4, y, BONE2))
        over.append(('label', 21, 14.0, 'NORTH TOWER', acc, 20))
        for x in (17.8, 24.2): over.append(('window', x, DEPTH, x, H, acc))
    if t['id'] == 'BCS-GG-SOUTH':
        for x in (17.8, 24.2): over.append(('window', x, 0, x, 6, acc))
        over.append(('label', 21, 1.3, 'SOUTH TOWER', acc, 20))
    return under, items, over

def exits_for(t, links):
    out = []
    for l in links:
        if not l['to']: continue
        lab = l['toName'].upper()
        if l['edge'] == 'N': out.append(dict(at=[l['rect'][0] + l['rect'][2] / 2, .45], label=lab, dir='up'))
        elif l['edge'] == 'S': out.append(dict(at=[l['rect'][0] + l['rect'][2] / 2, H - .45], label=lab, dir='down'))
        elif l['edge'] == 'W': out.append(dict(at=[.35, l['rect'][1] + l['rect'][3] / 2], label=lab, dir='left'))
        else: out.append(dict(at=[W - .35, l['rect'][1] + l['rect'][3] / 2], label=lab, dir='right'))
    return out

def place_cartouche(roads, zones, exits):
    blockers = [(r['x'], r['y'], r['w'], r['h']) for r in roads] + [(e['at'][0] - 5, e['at'][1] - 1.5, 10, 3) for e in exits]
    cands = [(x, y) for y in (23.6, 22.4, 21.6, 14.2, 13.4, 11.0, 2.6, 1.0) for x in (33.4, 13.2, 14.8, 16.6, 19.6, .8, 1.4, 24.0)]
    for x, y in cands:
        r = (x, y, 8.0, 2.6)
        if r[0] + r[2] > W - .4 or r[1] + r[3] > H - .4: continue
        if not any(r[0] < b[0] + b[2] and b[0] < r[0] + r[2] and r[1] < b[1] + b[3] and b[1] < r[1] + r[3] for b in blockers): return (x, y)
    return (W - 8.4, H - 3.0)

def render_tile(t):
    rnd = random.Random(t['id'])
    roads, water, zones = build(t)
    links = links_for(t)
    exits = exits_for(t, links)
    under, items, over = decorate(t, roads, water, zones, links, rnd)
    for d in t.get('doors', []):
        ex, ey, vertical = d['point']
        road_after = d['rect'][0] >= ex - 1e-6 if vertical else d['rect'][1] >= ey - 1e-6
        over.append(('entrance', ex, ey, vertical, road_after, t['accent'], d['toName'].upper()))
    m = dict(id=t['id'], name=t['name'], code=t['code'], journal=t['district'], accent=t['accent'], series='BAY CITY STREETS',
             zones=[dict(id=z['id'], name=z['name'], rect=z['rect']) for z in zones], links=[],
             under=[u for u in under if u], items=items, over=over, exits=exits, cartouche=place_cartouche(roads, zones, exits))
    return cs.render(m), roads, zones, links

if __name__ == '__main__':
    out_dir, content = sys.argv[1], sys.argv[2]
    errs = validate()
    if errs: print('\n'.join(errs)); sys.exit(1)
    os.makedirs(out_dir, exist_ok=True)
    data = []
    for t in TILES:
        svg, roads, zones, links = render_tile(t)
        slug = t['code'].lower() + '-' + ''.join(ch if ch.isalnum() else '-' for ch in t['name'].lower()).strip('-').replace('---', '-').replace('--', '-')
        open(os.path.join(out_dir, slug + '.svg'), 'w').write(svg)
        adj = adjacency(zones)
        for z in zones:
            if not adj[z['id']]: print('isolated zone', t['code'], z['id'])
        data.append(dict(id=t['id'], code=t['code'], name=t['name'], district=t['district'], col=t['col'], row=t['row'], file=slug + '.webp',
                         width=W * CELL, height=H * CELL, gridSize=CELL,
                         zones=[dict(id=z['id'], name=z['name'], kind=z['kind'], rect=[px(v) for v in z['rect']], adjacent=sorted(adj[z['id']])) for z in zones],
                         links=[dict(edge=l['edge'], slot=l['slot'], rect=[px(v) for v in l['rect']], to=l['to'], toName=l['toName'], toEdge=l['toEdge']) for l in links]))
        print(f"{t['code']} {t['name']}: {len(zones)} zones, {len(links)} exits")
    json.dump(dict(atlas='Bay City Street Atlas', cols=4, rows=4, maps=data), open(content, 'w'), indent=1)
