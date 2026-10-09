"""Cold Storage zoned scene maps (noir schematic style, matching the emblems).
Usage: python3 maps.py OUT_DIR CONTENT_JSON  -> OUT_DIR/<slug>.svg + CONTENT_JSON (zones, adjacency, exits)
Grid: 28 x 18 cells of 100 px (2800 x 1800). Zones are rectangles in cell units [x, y, w, h].
"""
import json, math, os, sys, html

CELL = 100
W, H = 28, 18
INK, BONE, BONE2 = '#0a0d10', '#ece4cf', '#b9ae95'

def px(v): return round(v * CELL, 1)
def esc(s): return html.escape(str(s))

# --------------------------------------------------------------------------- furniture
def shadowed(svg): return f'<g transform="translate(9,11)" opacity=".55">{svg.replace(BONE, "#000").replace(BONE2, "#000")}</g>{svg}'
def rect(x, y, w, h, fill=BONE, rx=8, extra=''): return f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" rx="{rx}" fill="{fill}" {extra}/>'
def line(x1, y1, x2, y2, c=INK, w=6, extra=''): return f'<line x1="{px(x1)}" y1="{px(y1)}" x2="{px(x2)}" y2="{px(y2)}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" {extra}/>'
def circ(x, y, r, fill=BONE, extra=''): return f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(r)}" fill="{fill}" {extra}/>'
def text(x, y, s, size=26, fill=BONE2, anchor='middle', mono=True, weight=700, ls=3, extra=''):
    fam = "'Courier New',Courier,monospace" if mono else "Oswald,'Bebas Neue','Roboto Condensed','Arial Narrow',Impact,sans-serif"
    return f'<text x="{px(x)}" y="{px(y)}" text-anchor="{anchor}" font-family="{fam}" font-size="{size}" font-weight="{weight}" letter-spacing="{ls}" fill="{fill}" {extra}>{esc(s)}</text>'

def f_bed(x, y, acc, w=1.3, h=2.4, empty=False):
    g = rect(x, y, w, h, BONE, 10) + rect(x + .12, y + .12, w - .24, .45, INK if empty else BONE2, 6)
    if not empty: g += rect(x + .1, y + 1.0, w - .2, h - 1.1, BONE2, 6) + line(x + .1, y + 1.0, x + w - .1, y + 1.0, INK, 4)
    else: g += line(x + .2, y + .8, x + w - .2, y + h - .2, INK, 3, 'opacity=".5"') + line(x + w - .2, y + .8, x + .2, y + h - .2, INK, 3, 'opacity=".5"')
    g += rect(x + w + .08, y + .1, .32, .5, acc, 4)  # bed monitor
    return shadowed(g)
def f_table(x, y, w, h, chairs=0, cups=0, acc='#fff'):
    g = ''
    if chairs:
        per = max(1, chairs // 2)
        for i in range(per):
            cx = x + (i + .5) * w / per - .3
            g += rect(cx, y - .75, .6, .55, BONE2, 6) + rect(cx, y + h + .2, .6, .55, BONE2, 6)
    g += rect(x, y, w, h, BONE, 12)
    for i in range(cups):
        cx = x + .45 + i * (w - .9) / max(1, cups - 1)
        g += circ(cx, y + h / 2, .17, INK) + circ(cx, y + h / 2, .1, acc)
    return shadowed(g)
def f_desk(x, y, acc='#fff', w=2.4, h=1.0, screen=True):
    g = rect(x, y, w, h, BONE, 8)
    if screen: g += rect(x + .25, y + .18, w * .45, .3, acc, 3)
    return shadowed(g)
def f_console(x, y, w, h, acc, label=''):
    g = rect(x, y, w, h, BONE, 10) + rect(x + .2, y + .2, w - .4, h * .45, INK, 6) + rect(x + .32, y + .32, (w - .64) * .7, h * .12, acc, 3) + rect(x + .32, y + .32 + h * .18, (w - .64) * .45, h * .1, acc, 3, 'opacity=".6"')
    out = shadowed(g)
    if label: out += text(x + w / 2, y + h + .42, label, 22, acc)
    return out
def f_cabinets(x, y, n, w=.9, h=2.6, horizontal=True, acc='#fff'):
    g = ''
    for i in range(n):
        cx, cy = (x + i * (w + .25), y) if horizontal else (x, y + i * (w + .25))
        ww, hh = (w, h) if horizontal else (h, w)
        g += rect(cx, cy, ww, hh, BONE, 5)
        for k in range(1, 5):
            if horizontal: g += line(cx + .1, cy + k * hh / 5, cx + ww - .1, cy + k * hh / 5, INK, 3, 'opacity=".55"')
            else: g += line(cx + k * ww / 5, cy + .1, cx + k * ww / 5, cy + hh - .1, INK, 3, 'opacity=".55"')
        g += circ(cx + ww - .18, cy + .2, .07, acc)
    return shadowed(g)
def f_crates(x, y, n=3, s=.8):
    g = ''
    for i in range(n):
        cx, cy = x + (i % 3) * (s + .15), y + (i // 3) * (s + .15)
        g += rect(cx, cy, s, s, BONE2, 4) + line(cx + .1, cy + .1, cx + s - .1, cy + s - .1, INK, 3, 'opacity=".5"') + line(cx + s - .1, cy + .1, cx + .1, cy + s - .1, INK, 3, 'opacity=".5"')
    return shadowed(g)
def f_stairs(x, y, w, h, vertical=True):
    g = rect(x, y, w, h, BONE2, 6)
    steps = 7
    for i in range(1, steps):
        if vertical: g += line(x + .08, y + i * h / steps, x + w - .08, y + i * h / steps, INK, 4)
        else: g += line(x + i * w / steps, y + .08, x + i * w / steps, y + h - .08, INK, 4)
    return shadowed(g)
def f_lift(x, y, s, acc):
    g = rect(x, y, s, s, BONE, 8) + rect(x + .15, y + .15, s - .3, s - .3, INK, 6) + line(x + .3, y + .3, x + s - .3, y + s - .3, acc, 5) + line(x + s - .3, y + .3, x + .3, y + s - .3, acc, 5)
    return shadowed(g)
def f_pool(x, y, w, h, acc):
    g = f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" rx="26" fill="#0f1c22" stroke="{BONE}" stroke-width="6"/>'
    for i in range(1, int(h / .6)):
        yy = y + i * .6
        g += f'<path d="M{px(x+.3)} {px(yy)} q{px(.35)} -10 {px(.7)} 0 t{px(.7)} 0 t{px(.7)} 0" fill="none" stroke="{acc}" stroke-width="2" opacity=".18"/>'
    return g
def f_water(x, y, w, h, acc):
    g = f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="#0c1a20"/>'
    for i in range(int(h / .45)):
        yy = y + .25 + i * .45
        for k in range(int(w / 2.2)):
            xx = x + .2 + k * 2.2 + (i % 2) * 1.1
            g += f'<path d="M{px(xx)} {px(yy)} q{px(.3)} -9 {px(.6)} 0 t{px(.6)} 0" fill="none" stroke="{acc}" stroke-width="2" opacity=".22"/>'
    return g
def f_chairs(x, y, n, gap=1.05, s=.6):
    return shadowed(''.join(rect(x + i * gap, y, s, s, BONE2, 6) + rect(x + i * gap, y - .18, s, .16, BONE, 3) for i in range(n)))
def f_bench(x, y, w, h, acc):
    return shadowed(rect(x, y, w, h, BONE, 6) + rect(x + .3, y + h - .35, w - .6, .2, INK, 3) + rect(x + w / 2 - .5, y + .2, 1, .3, acc, 3))
def f_cradle(x, y, acc):
    return shadowed(f'<rect x="{px(x)}" y="{px(y)}" width="{px(1.4)}" height="{px(3)}" rx="{px(.7)}" fill="{BONE}"/>' + f'<rect x="{px(x+.2)}" y="{px(y+.3)}" width="{px(1)}" height="{px(2.4)}" rx="{px(.5)}" fill="{acc}" opacity=".35"/>')
def f_lightwall(x, y, h, acc):
    g = line(x, y, x, y + h, BONE, 10)
    for i, (dy, dx) in enumerate(((.6, -1.2), (1.4, -1.6), (2.1, -1.0), (2.9, -1.8), (3.6, -1.1), (4.4, -1.5))):
        if y + dy > y + h: break
        g += line(x, y + dy, x + dx, y + dy - .4, acc, 4, 'opacity=".9"') + circ(x + dx, y + dy - .4, .1, acc)
    return g
def f_transmitter(x, y, acc):
    g = f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(2.1)}" fill="none" stroke="{BONE}" stroke-width="10"/>' + f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(1.4)}" fill="none" stroke="{acc}" stroke-width="3" stroke-dasharray="14 10"/>' + circ(x, y, .55, BONE) + circ(x, y, .2, acc)
    return shadowed(g)
def f_billboard(x, y, w, acc):
    g = rect(x, y, w, 1.6, BONE, 6) + rect(x + .15, y + .15, w - .3, 1.3, INK, 4)
    cols = ('#ffffff', '#cfd6d8', '#78ecf3')
    for i in range(3):
        cx = x + (i + .5) * w / 3
        g += circ(cx, y + .55, .2, cols[i]) + f'<path d="M{px(cx-.35)} {px(y+1.4)} Q{px(cx)} {px(y+.7)} {px(cx+.35)} {px(y+1.4)} Z" fill="{cols[i]}"/>'
    g += rect(x + w / 2 - .2, y + 1.6, .4, .9, BONE2, 3) + circ(x + w / 2 + .5, y + 2.4, .15, acc) + circ(x + w / 2 + .75, y + 2.3, .12, acc)
    return shadowed(g)
def f_memorial(x, y, acc):
    g = f'<path d="M{px(x)} {px(y-1.3)} L{px(x+.45)} {px(y+.6)} L{px(x-.45)} {px(y+.6)} Z" fill="{BONE}"/>' + rect(x - .7, y + .6, 1.4, .3, BONE2, 3)
    for i in range(5): g += circ(x - .55 + i * .27, y + 1.05, .09, acc)
    return shadowed(g)
def f_bowls(x, y, cols, rows, acc):
    g = ''
    for r in range(rows):
        g += line(x - .3, y + r * 1.25 - .55, x + cols * .9, y + r * 1.25 - .55, BONE2, 2, 'opacity=".7"')
        for c in range(cols):
            cx = x + c * .9
            g += line(cx, y + r * 1.25 - .55, cx, y + r * 1.25 - .25, BONE, 3) + circ(cx, y + r * 1.25, .22, BONE) + circ(cx, y + r * 1.25, .12, acc, 'opacity=".55"')
    return g
def f_fan(x, y, r, acc):
    g = circ(x, y, r, BONE) + circ(x, y, r * .82, INK)
    for a in (0, 120, 240):
        g += f'<path d="M{px(x)} {px(y)} L{px(x + r*.75*math.cos(math.radians(a)))} {px(y + r*.75*math.sin(math.radians(a)))} L{px(x + r*.75*math.cos(math.radians(a+40)))} {px(y + r*.75*math.sin(math.radians(a+40)))} Z" fill="{BONE2}"/>'
    return shadowed(g + circ(x, y, r * .15, acc))
def f_lockers(x, y, n, acc):
    return shadowed(''.join(rect(x + i * .5, y, .42, 1.1, BONE2, 3) + circ(x + i * .5 + .3, y + .55, .05, acc) for i in range(n)))
def f_pump(x, y, acc):
    return shadowed(circ(x, y, .7, BONE) + circ(x, y, .4, INK) + circ(x, y, .2, acc) + rect(x + .6, y - .12, 1.4, .24, BONE2, 3) + rect(x - 2, y - .12, 1.4, .24, BONE2, 3))
def f_grate(x, y, w, h):
    g = rect(x, y, w, h, BONE2, 4)
    for i in range(1, int(w / .25)): g += line(x + i * .25, y + .08, x + i * .25, y + h - .08, INK, 3)
    return shadowed(g)
def f_door_label(x, y, w, label, acc):
    return shadowed(rect(x, y, w, .5, BONE, 4)) + text(x + w / 2, y + .95, label, 19, acc)
def f_wafer(x, y, acc):
    return shadowed(f'<path d="M{px(x)} {px(y-.8)} L{px(x+.8)} {px(y)} L{px(x)} {px(y+.8)} L{px(x-.8)} {px(y)} Z" fill="{BONE}"/>' + f'<path d="M{px(x)} {px(y-.45)} L{px(x+.45)} {px(y)} L{px(x)} {px(y+.45)} L{px(x-.45)} {px(y)} Z" fill="{acc}"/>') + f'<circle cx="{px(x)}" cy="{px(y)}" r="{px(1.25)}" fill="none" stroke="{acc}" stroke-width="3" stroke-dasharray="8 8"/>'
def f_window(x1, y1, x2, y2, acc):
    return line(x1, y1, x2, y2, acc, 10, 'opacity=".55"') + line(x1, y1, x2, y2, BONE, 3, 'stroke-dasharray="16 12"')
def f_wallpaper(x, y, w, h, acc):
    g = ''
    for i in range(int(w / .7)):
        g += line(x + .35 + i * .7, y + .2, x + .35 + i * .7, y + h - .2, acc, 2, 'opacity=".22" stroke-dasharray="6 10"')
    return g
def f_partition(x1, y1, x2, y2):
    return line(x1, y1, x2, y2, BONE, 14) + line(x1, y1, x2, y2, INK, 4, 'stroke-dasharray="8 14"')
def f_cover(x, y, acc, heavy=False):
    s = .42
    d = f'M{px(x)} {px(y-s)} L{px(x+s*.85)} {px(y-s*.6)} L{px(x+s*.85)} {px(y+s*.05)} C{px(x+s*.85)} {px(y+s*.6)} {px(x+s*.35)} {px(y+s*.9)} {px(x)} {px(y+s)} C{px(x-s*.35)} {px(y+s*.9)} {px(x-s*.85)} {px(y+s*.6)} {px(x-s*.85)} {px(y+s*.05)} L{px(x-s*.85)} {px(y-s*.6)} Z'
    g = f'<path d="{d}" fill="{INK}" stroke="{acc}" stroke-width="4"/>'
    if heavy: g += f'<path d="{d}" fill="{acc}" opacity=".55" transform="translate({px(x)},{px(y)}) scale(.55) translate({-px(x)},{-px(y)})"/>'
    return g + text(x, y + s + .38, 'HEAVY COVER' if heavy else 'COVER', 17, acc, ls=2)
def f_label(x, y, s, acc, size=19): return text(x, y, s, size, acc, ls=2)

FURNITURE = dict(bed=f_bed, table=f_table, desk=f_desk, console=f_console, cabinets=f_cabinets, crates=f_crates, stairs=f_stairs, lift=f_lift,
                 pool=f_pool, water=f_water, chairs=f_chairs, bench=f_bench, cradle=f_cradle, lightwall=f_lightwall, transmitter=f_transmitter,
                 billboard=f_billboard, memorial=f_memorial, bowls=f_bowls, fan=f_fan, lockers=f_lockers, pump=f_pump, grate=f_grate,
                 doorlabel=f_door_label, wafer=f_wafer, window=f_window, wallpaper=f_wallpaper, partition=f_partition, cover=f_cover, label=f_label)

# --------------------------------------------------------------------------- map composition
def shared_edge(a, b):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    for (x1, x2, ox1, ox2, fixed_a, fixed_b, vertical) in ((ay, ay + ah, by, by + bh, ax + aw, bx, True), (ay, ay + ah, by, by + bh, ax, bx + bw, True),
                                                          (ax, ax + aw, bx, bx + bw, ay + ah, by, False), (ax, ax + aw, bx, bx + bw, ay, by + bh, False)):
        if abs(fixed_a - fixed_b) < 1e-6:
            lo, hi = max(x1, ox1), min(x2, ox2)
            if hi - lo >= .9:
                mid = (lo + hi) / 2
                return (fixed_a, mid, True) if vertical else (mid, fixed_a, False)
    return None
def door(x, y, vertical, acc, label=''):
    gap = .9
    if vertical:
        g = f'<rect x="{px(x-.09)}" y="{px(y-gap/2)}" width="{px(.18)}" height="{px(gap)}" fill="{INK}"/>' + line(x - .22, y - gap / 2, x + .22, y - gap / 2, acc, 6) + line(x - .22, y + gap / 2, x + .22, y + gap / 2, acc, 6)
        lx, ly = x, y + gap / 2 + .42
    else:
        g = f'<rect x="{px(x-gap/2)}" y="{px(y-.09)}" width="{px(gap)}" height="{px(.18)}" fill="{INK}"/>' + line(x - gap / 2, y - .22, x - gap / 2, y + .22, acc, 6) + line(x + gap / 2, y - .22, x + gap / 2, y + .22, acc, 6)
        lx, ly = x, y + .62
    if label: g += f'<rect x="{px(lx)-len(label)*7-10}" y="{px(ly)-21}" width="{len(label)*14+20}" height="30" rx="4" fill="{INK}" opacity=".85"/>' + text(lx, ly, label, 18, acc, ls=2)
    return g
def edge_point(r, toward):
    x, y, w, h = r; cx, cy = x + w / 2, y + h / 2; tx, ty = toward
    dx, dy = tx - cx, ty - cy
    sx = (w / 2) / abs(dx) if dx else 1e9; sy = (h / 2) / abs(dy) if dy else 1e9
    s = min(sx, sy)
    return cx + dx * s, cy + dy * s
def connector(a, b, acc, label='', via=None):
    if via:
        pts = [edge_point(a, via[0])] + via + [edge_point(b, via[-1])]
    else:
        ca, cb = (a[0] + a[2] / 2, a[1] + a[3] / 2), (b[0] + b[2] / 2, b[1] + b[3] / 2)
        pts = [edge_point(a, cb), edge_point(b, ca)]
    d = 'M' + ' L'.join(f'{px(x)} {px(y)}' for x, y in pts)
    g = f'<path d="{d}" fill="none" stroke="{acc}" stroke-width="5" stroke-dasharray="18 12" opacity=".9"/>'
    for p in (pts[0], pts[-1]): g += circ(p[0], p[1], .14, acc)
    if label:
        m = pts[len(pts) // 2] if len(pts) > 2 else ((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2)
        g += f'<rect x="{px(m[0])-len(label)*7-10}" y="{px(m[1])-20}" width="{len(label)*14+20}" height="30" rx="4" fill="{INK}" opacity=".9"/>' + text(m[0], m[1] + .02, label, 18, acc, ls=2)
    return g
def exit_marker(x, y, label, acc, direction='right'):
    w = len(label) * .16 + 1.0
    rot = {'right': 0, 'left': 180, 'up': -90, 'down': 90}[direction]
    arrow = f'<path d="M-28 -18 L0 0 L-28 18" fill="none" stroke="{acc}" stroke-width="7" stroke-linejoin="round" transform="translate({px(x)},{px(y)}) rotate({rot})"/>'
    bx = x - w - .25 if direction == 'right' else x + .25 if direction == 'left' else x - w / 2
    by = y - .3 if direction in ('right', 'left') else (y + .35 if direction == 'up' else y - .95)
    return (f'<rect x="{px(bx)}" y="{px(by)}" width="{px(w)}" height="{px(.6)}" rx="4" fill="{INK}" stroke="{acc}" stroke-width="3"/>' +
            text(bx + w / 2, by + .41, 'EXIT · ' + label, 19, acc, ls=2) + arrow)
def zone_plaque(z, i, acc):
    x, y, w, h = z['rect']
    name = z['name'].upper()
    pw = min(w - .4, .55 + len(name) * .2 + .9)
    fs = 28 if len(name) * .2 + 1.4 <= w - .4 else 22
    return (f'<rect x="{px(x+.22)}" y="{px(y+.22)}" width="{px(pw)}" height="{px(.62)}" fill="{INK}" stroke="{BONE}" stroke-width="3"/>' +
            f'<rect x="{px(x+.22)}" y="{px(y+.22)}" width="{px(.78)}" height="{px(.62)}" fill="{acc}"/>' +
            text(x + .61, y + .67, f'Z{i}', 24, INK, ls=1) +
            text(x + 1.1, y + .67, name, fs, BONE, 'start', mono=False, ls=2, extra=f'textLength="{px(pw-1.0)}" lengthAdjust="spacingAndGlyphs"' if len(name) * .2 + 1.4 > pw else ''))

def render(m):
    acc = m['accent']
    zones = m['zones']; byid = {z['id']: z for z in zones}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*CELL}" height="{H*CELL}" viewBox="0 0 {W*CELL} {H*CELL}">',
           f'<title>{esc(m["name"])} — zone map</title>',
           f'''<defs><radialGradient id="ink" cx="30%" cy="22%" r="95%"><stop offset="0" stop-color="#1b242a"/><stop offset=".6" stop-color="#0c1114"/><stop offset="1" stop-color="#040506"/></radialGradient>
<pattern id="grid" width="{CELL}" height="{CELL}" patternUnits="userSpaceOnUse"><path d="M{CELL} 0H0V{CELL}" fill="none" stroke="#9fc7cf" stroke-width="1" opacity=".05"/></pattern>
<pattern id="blinds" width="2800" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-28 1400 900)"><rect width="2800" height="46" fill="#fff" opacity=".035"/></pattern>
<pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="22" fill="{acc}" opacity=".07"/></pattern>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="{len(m["id"])}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>''',
           f'<rect width="{W*CELL}" height="{H*CELL}" fill="url(#ink)"/><rect width="{W*CELL}" height="{H*CELL}" fill="url(#grid)"/>']
    for f in m.get('under', []): out.append(FURNITURE[f[0]](*f[1:]))
    for z in zones:
        x, y, w, h = z['rect']
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="url(#hatch)"/>')
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="{acc}" opacity=".035"/>')
    for f in m.get('items', []): out.append(FURNITURE[f[0]](*f[1:]))
    for z in zones:
        x, y, w, h = z['rect']
        out.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" fill="none" stroke="{BONE}" stroke-width="7"/>')
        out.append(f'<rect x="{px(x+.12)}" y="{px(y+.12)}" width="{px(w-.24)}" height="{px(h-.24)}" fill="none" stroke="{acc}" stroke-width="2" opacity=".6"/>')
    for link in m['links']:
        a, b = byid[link[0]], byid[link[1]]; label = link[2] if len(link) > 2 else ''
        via = link[3] if len(link) > 3 else None
        e = None if via else shared_edge(a['rect'], b['rect'])
        out.append(door(e[0], e[1], e[2], acc, label) if e else connector(a['rect'], b['rect'], acc, label, via))
    for f in m.get('over', []): out.append(FURNITURE[f[0]](*f[1:]))
    for ex in m.get('exits', []): out.append(exit_marker(ex['at'][0], ex['at'][1], ex['label'], acc, ex.get('dir', 'right')))
    for i, z in enumerate(zones, 1): out.append(zone_plaque(z, i, acc))
    out.append(f'<rect width="{W*CELL}" height="{H*CELL}" fill="url(#blinds)"/><rect width="{W*CELL}" height="{H*CELL}" filter="url(#grain)"/><rect width="{W*CELL}" height="{H*CELL}" fill="url(#vig)"/>')
    # title cartouche
    cx, cy = m.get('cartouche', (19.6, 15.2))
    cw, ch = 8.0, 2.6
    title = m['name'].upper()
    tfs = 54 if len(title) <= 20 else 44 if len(title) <= 26 else 36
    out.append(f'<g><rect x="{px(cx)}" y="{px(cy)}" width="{px(cw)}" height="{px(ch)}" fill="{INK}" stroke="{BONE}" stroke-width="6"/><rect x="{px(cx+.14)}" y="{px(cy+.14)}" width="{px(cw-.28)}" height="{px(ch-.28)}" fill="none" stroke="{acc}" stroke-width="2"/>'
               + text(cx + .4, cy + .62, f'{m.get("series","COLD STORAGE")} // {m["code"]} // {m["journal"]}', 22, acc, 'start')
               + text(cx + .4, cy + 1.38, title, tfs, BONE, 'start', mono=False, ls=2, extra=f'textLength="{px(cw-.8)}" lengthAdjust="spacingAndGlyphs"' if len(title) * tfs * .62 > px(cw - .8) else '')
               + line(cx + .4, cy + 1.62, cx + cw - .4, cy + 1.62, acc, 2, 'opacity=".6"')
               + door(cx + .75, cy + 2.05, True, acc) + text(cx + 1.15, cy + 2.15, 'ADJACENT', 18, BONE2, 'start', ls=2)
               + f'<path d="M{px(cx+2.95)} {px(cy+2.05)} L{px(cx+3.55)} {px(cy+2.05)}" stroke="{acc}" stroke-width="5" stroke-dasharray="12 8"/>' + text(cx + 3.7, cy + 2.15, 'CONNECTED', 18, BONE2, 'start', ls=2)
               + text(cx + cw - .4, cy + 2.15, f'{len(zones)} ZONES', 18, acc, 'end', ls=2) + '</g>')
    out.append('</svg>')
    return '\n'.join(out)

