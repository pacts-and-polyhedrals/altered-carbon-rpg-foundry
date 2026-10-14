"""Bay City Street Atlas overview: all 14 street maps on one high-resolution sheet.
Usage: python3 overview.py SPNG_DIR STREET_JSON OUT_DIR SCALE
Writes OUT_DIR/under.svg, OUT_DIR/over.svg (rendered separately) and OUT_DIR/overview.json.
The final image = under layer + the 14 tile renders (scaled) + over layer (labels).
"""
import json, os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import street_atlas as sa

spng, sjson, out, scale = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
os.makedirs(out, exist_ok=True)
TW, TH = round(sa.W * 100 * scale), round(sa.H * 100 * scale)   # tile size on the sheet
COLS, ROWS, ROW0 = 4, 4, -1
WIDTH, HEIGHT = COLS * TW, ROWS * TH
INK, BONE, BONE2 = '#0a0d10', '#ece4cf', '#b9ae95'
SANS = "Oswald,'Bebas Neue','Roboto Condensed','Arial Narrow',Impact,sans-serif"
MONO = "'Courier New',Courier,monospace"
esc = lambda s: html.escape(str(s))
k = scale * 100  # sheet px per map cell

def origin(t): return t['col'] * TW, (t['row'] - ROW0) * TH
def T(x, y, s, size, fill=BONE, anchor='middle', fam=MONO, weight=700, ls=3, extra=''):
    return f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-family="{fam}" font-size="{size}" font-weight="{weight}" letter-spacing="{ls}" fill="{fill}" {extra}>{esc(s)}</text>'

def water_cell(c, r, label=None):
    x, y = c * TW, (r - ROW0) * TH
    g = f'<rect x="{x}" y="{y}" width="{TW}" height="{TH}" fill="#0c2a36"/>'
    g += f'<rect x="{x}" y="{y}" width="{TW}" height="{TH}" fill="url(#hatch)"/>'
    return g

def under():
    used = {(t['col'], t['row']) for t in sa.TILES}
    cells = ''.join(water_cell(c, r) for c in range(COLS) for r in range(ROW0, ROW0 + ROWS) if (c, r) not in used)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<defs><pattern id="hatch" width="{24*scale*2:.0f}" height="{24*scale*2:.0f}" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
<line x1="0" y1="0" x2="0" y2="{24*scale*2:.0f}" stroke="#32c7d6" stroke-width="{3*scale*2:.1f}" opacity=".09"/></pattern></defs>
<rect width="{WIDTH}" height="{HEIGHT}" fill="{INK}"/>{cells}</svg>'''

def road_label(t, r):
    ox, oy = origin(t)
    name = r['name'].upper()
    fs = round(30 * scale * 2)
    w = len(name) * fs * .66 + fs * 1.6; h = fs * 1.55
    if r['o'] == 'h':
        cx = 37.5 if r['x'] <= 34 and r['x'] + r['w'] >= 41 else r['x'] + r['w'] / 2
        cy = r['y'] + r['h'] / 2
        X, Y, rot = ox + cx * k, oy + cy * k, 0
    else:
        cx = r['x'] + r['w'] / 2
        pw = plate_w(t) / k / 2 + .8           # half plate width in cells
        hidden = lambda y: abs(cx - sa.W / 2) < pw and abs(y - sa.H / 2) < 5.4
        half = w / k / 2 + .3
        covers = lambda y: r['y'] + half <= y <= r['y'] + r['h'] - half
        cy = next((y for y in (13.5, 22.5, 4.5, 6) if covers(y) and not hidden(y)), None)
        if cy is None:
            if r['h'] < 2 * half: return ''
            cy = r['y'] + r['h'] / 2
        X, Y, rot = ox + cx * k, oy + cy * k, -90
    acc = t['accent']
    return (f'<g transform="translate({X:.1f} {Y:.1f}) rotate({rot})">'
            f'<rect x="{-w/2:.1f}" y="{-h/2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h/2:.1f}" fill="{INK}" fill-opacity=".9" stroke="{acc}" stroke-width="{3*scale*2:.1f}"/>'
            + T(0, fs * .36, name, fs, BONE, ls=round(4 * scale * 2)) + '</g>')

def plate_w(t):
    s = scale * 2; fs = round(64 * s)
    return max(len(t['name']) * fs * .62 + 120 * s, 640 * s)

def plate(t):
    ox, oy = origin(t)
    X, Y = ox + TW / 2, oy + TH / 2
    acc = t['accent']; s = scale * 2
    name = t['name'].upper(); fs = round(64 * s)
    w = max(len(name) * fs * .62 + 120 * s, 640 * s); h = 170 * s
    g = f'<g transform="translate({X:.1f} {Y:.1f})">'
    g += f'<path d="M{-w/2:.1f},{-h/2:.1f} L{w/2:.1f},{-h/2:.1f} L{w/2+26*s:.1f},0 L{w/2:.1f},{h/2:.1f} L{-w/2:.1f},{h/2:.1f} L{-w/2-26*s:.1f},0 Z" fill="{INK}" fill-opacity=".9" stroke="{acc}" stroke-width="{6*s:.1f}" filter="url(#glow)"/>'
    g += f'<line x1="{-w/2+30*s:.1f}" y1="{-h/2+50*s:.1f}" x2="{w/2-30*s:.1f}" y2="{-h/2+50*s:.1f}" stroke="{acc}" stroke-width="{2*s:.1f}" opacity=".5"/>'
    g += T(0, -h / 2 + 38 * s, f"{t['code']}  //  {t['district']}", round(24 * s), acc, ls=round(5 * s))
    g += T(0, h / 2 - 40 * s, name, fs, BONE, fam=SANS, ls=round(5 * s))
    return g + '</g>'

def title_cell(c, r):
    x, y = c * TW, (r - ROW0) * TH; s = scale * 2; acc = '#32c7d6'
    cx = x + TW / 2
    g = f'<rect x="{x + 120*s:.1f}" y="{y + 150*s:.1f}" width="{TW - 240*s:.1f}" height="{TH - 300*s:.1f}" fill="{INK}" fill-opacity=".88" stroke="{acc}" stroke-width="{6*s:.1f}" filter="url(#glow)"/>'
    g += f'<rect x="{x + 145*s:.1f}" y="{y + 175*s:.1f}" width="{TW - 290*s:.1f}" height="{TH - 350*s:.1f}" fill="none" stroke="{BONE2}" stroke-width="{1.5*s:.1f}" opacity=".4"/>'
    g += T(cx, y + 300 * s, 'BAY CITY  //  2384  //  SURFACE TRAFFIC GRID', round(28 * s), acc, ls=round(8 * s))
    g += T(cx, y + 450 * s, 'BAY CITY STREET ATLAS', round(120 * s), BONE, fam=SANS, ls=round(10 * s))
    g += f'<line x1="{x + 260*s:.1f}" y1="{y + 500*s:.1f}" x2="{x + TW - 260*s:.1f}" y2="{y + 500*s:.1f}" stroke="{acc}" stroke-width="{3*s:.1f}"/>'
    g += T(cx, y + 570 * s, '14 LINKED CHASE MAPS · EVERY ROAD MEETS ITS NEIGHBOUR', round(30 * s), BONE2, ls=round(5 * s))
    # legend
    lx, ly = x + 330 * s, y + 690 * s; row = 92 * s; sw = 150 * s
    items = [
        ('road', 'ROAD LANE · ZONE'),
        ('junction', 'JUNCTION · ZONE'),
        ('door', 'ENTER · BUILDING / ORIGINAL MAP'),
        ('exit', 'EXIT STRIP · NEXT MAP'),
    ]
    for i, (kind, label) in enumerate(items):
        yy = ly + i * row
        if kind == 'road':
            g += f'<rect x="{lx:.1f}" y="{yy - 26*s:.1f}" width="{sw:.1f}" height="{52*s:.1f}" fill="#141a20" stroke="{BONE}" stroke-width="{3*s:.1f}"/>'
            g += f'<line x1="{lx + 12*s:.1f}" y1="{yy:.1f}" x2="{lx + sw - 12*s:.1f}" y2="{yy:.1f}" stroke="{BONE2}" stroke-width="{3*s:.1f}" stroke-dasharray="{18*s:.1f} {14*s:.1f}"/>'
        elif kind == 'junction':
            g += f'<rect x="{lx + sw/2 - 34*s:.1f}" y="{yy - 34*s:.1f}" width="{68*s:.1f}" height="{68*s:.1f}" fill="#141a20" stroke="{BONE}" stroke-width="{3*s:.1f}"/>'
            g += f'<circle cx="{lx + sw/2:.1f}" cy="{yy:.1f}" r="{12*s:.1f}" fill="none" stroke="{acc}" stroke-width="{3*s:.1f}"/>'
        elif kind == 'door':
            g += f'<rect x="{lx + 20*s:.1f}" y="{yy - 20*s:.1f}" width="{sw - 40*s:.1f}" height="{40*s:.1f}" fill="{INK}" stroke="#ff4fd8" stroke-width="{3*s:.1f}"/>'
            g += T(lx + sw / 2, yy + 8 * s, 'ENTER', round(22 * s), '#ff4fd8', ls=round(3 * s))
        else:
            g += f'<path d="M{lx + 20*s:.1f},{yy - 22*s:.1f} L{lx + sw - 50*s:.1f},{yy - 22*s:.1f} L{lx + sw - 14*s:.1f},{yy:.1f} L{lx + sw - 50*s:.1f},{yy + 22*s:.1f} L{lx + 20*s:.1f},{yy + 22*s:.1f} Z" fill="none" stroke="{acc}" stroke-width="{3*s:.1f}"/>'
        g += T(lx + sw + 40 * s, yy + 11 * s, label, round(30 * s), BONE, anchor='start', ls=round(4 * s))
    g += T(cx, y + TH - 215 * s, 'TOKEN ON A DISTRICT → RIGHT-CLICK → GO TO', round(28 * s), acc, ls=round(5 * s))
    return g

def bay_cell(c, r):
    x, y = c * TW, (r - ROW0) * TH; s = scale * 2; cx, cy = x + TW / 2, y + TH / 2
    g = T(cx, cy - 40 * s, 'SAN FRANCISCO BAY', round(96 * s), '#5fb7c6', fam=SANS, ls=round(24 * s), extra='opacity=".55"')
    g += T(cx, cy + 40 * s, 'NO SURFACE ROUTE · AIRCAR LANES ONLY', round(28 * s), '#5fb7c6', ls=round(6 * s), extra='opacity=".5"')
    # compass rose
    R = 150 * s; px_, py_ = x + TW - 330 * s, y + TH - 330 * s
    g += f'<g transform="translate({px_:.1f} {py_:.1f})" opacity=".85">'
    g += f'<circle r="{R:.1f}" fill="none" stroke="#5fb7c6" stroke-width="{3*s:.1f}"/><circle r="{R*.82:.1f}" fill="none" stroke="#5fb7c6" stroke-width="{1.5*s:.1f}" opacity=".5"/>'
    g += f'<path d="M0,{-R*1.05:.1f} L{R*.16:.1f},0 L0,{R*1.05:.1f} L{-R*.16:.1f},0 Z" fill="{BONE}"/>'
    g += f'<path d="M{-R*1.05:.1f},0 L0,{R*.16:.1f} L{R*1.05:.1f},0 L0,{-R*.16:.1f} Z" fill="#5fb7c6" opacity=".7"/>'
    g += T(0, -R * 1.18, 'N', round(56 * s), BONE, fam=SANS, ls=0)
    return g + '</g>'

def outer_frame():
    s = scale * 2
    g = f'<rect x="{6*s:.1f}" y="{6*s:.1f}" width="{WIDTH - 12*s:.1f}" height="{HEIGHT - 12*s:.1f}" fill="none" stroke="#32c7d6" stroke-width="{8*s:.1f}" opacity=".7"/>'
    # tile seams
    for t in sa.TILES:
        ox, oy = origin(t)
        g += f'<rect x="{ox:.1f}" y="{oy:.1f}" width="{TW}" height="{TH}" fill="none" stroke="{t["accent"]}" stroke-width="{3*s:.1f}" stroke-dasharray="{30*s:.1f} {20*s:.1f}" opacity=".45"/>'
    return g

def over():
    labels = []
    for t in sa.TILES:
        seen = set()
        for r in sa.roads_for(t):
            if not r.get('name') or (r['name'], r['o']) in seen: continue
            seen.add((r['name'], r['o'])); labels.append(road_label(t, r))
    plates = ''.join(plate(t) for t in sa.TILES)
    used = {(t['col'], t['row']) for t in sa.TILES}
    empty = [(c, r) for r in range(ROW0, ROW0 + ROWS) for c in range(COLS) if (c, r) not in used]
    extras = (title_cell(*empty[-1]) if empty else '') + ''.join(bay_cell(*e) for e in empty[:-1])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<defs><filter id="glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="{6*scale*2:.1f}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
{outer_frame()}{''.join(labels)}{plates}{extras}</svg>'''

open(os.path.join(out, 'under.svg'), 'w').write(under())
open(os.path.join(out, 'over.svg'), 'w').write(over())

# ---------------------------------------------------------------- scene data: one zone per district, a Go-to link per district
atlas = json.load(open(sjson))
by_id = {m['id']: m for m in atlas['maps']}
zones, links = [], []
for t in sa.TILES:
    m = by_id[t['id']]; ox, oy = origin(t)
    adj = sorted({l['to'] for l in m['links'] if l.get('edge')})
    zones.append(dict(id=t['id'].lower(), name=t['name'], rect=[ox, oy, TW, TH], adjacent=[a.lower() for a in adj]))
    # land on the junction nearest the middle of that map
    cxm, cym = m['width'] / 2, m['height'] / 2
    js = [z for z in m['zones'] if z.get('kind') == 'junction'] or [z for z in m['zones'] if z.get('kind') == 'road']
    j = min(js, key=lambda z: (z['rect'][0] + z['rect'][2] / 2 - cxm) ** 2 + (z['rect'][1] + z['rect'][3] / 2 - cym) ** 2)
    links.append(dict(edge=None, kind='district', rect=[ox, oy, TW, TH], to=t['id'], toName=t['name'],
                      land=[round(j['rect'][0] + j['rect'][2] / 2), round(j['rect'][1] + j['rect'][3] / 2)]))
entry = dict(id='BCS-OVERVIEW', code='BCS00', name='Bay City Overview · All Districts', district='BAY CITY', col=None, row=None,
             file='streets/bcs00-bay-city-overview.webp', width=WIDTH, height=HEIGHT, gridSize=round(100 * scale * 2),
             zones=zones, links=links)
json.dump({'maps': [entry], 'tiles': [dict(id=t['id'], src=os.path.join(spng, f)) for t in sa.TILES
          for f in os.listdir(spng) if f.startswith(t['code'].lower() + '-')],
           'origins': {t['id']: origin(t) for t in sa.TILES}, 'tile': [TW, TH], 'size': [WIDTH, HEIGHT]},
          open(os.path.join(out, 'overview.json'), 'w'), indent=1)
print('overview', WIDTH, 'x', HEIGHT)
