"""Bay City zoned scene maps — same noir schematic style as the Cold Storage maps.
Usage: python3 bay_city.py OUT_DIR CONTENT_JSON
Grid 28 x 18 cells of 100 px (2800 x 1800); zones are [x, y, w, h] in cells.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coldstyle as cs
from coldstyle import px, rect, line, circ, text, shadowed, INK, BONE, BONE2, W, H, CELL, FURNITURE

CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE = '#78ecf3', '#ff5a6e', '#ffc467', '#e9cc8c', '#5ef0c4', '#b9a2ff', '#ff7fb0', '#7fb2ff'
ASPHALT = '#11171b'

# --------------------------------------------------------------------------- city furniture
def f_road(x, y, w, h, acc, horizontal=True, lanes=2):
    g = rect(x, y, w, h, ASPHALT, 0)
    if horizontal:
        g += line(x, y + .08, x + w, y + .08, BONE2, 4, 'opacity=".55"') + line(x, y + h - .08, x + w, y + h - .08, BONE2, 4, 'opacity=".55"')
        for k in range(1, lanes):
            yy = y + h * k / lanes
            g += line(x + .3, yy, x + w - .3, yy, BONE, 5, 'stroke-dasharray="60 50" opacity=".6"')
    else:
        g += line(x + .08, y, x + .08, y + h, BONE2, 4, 'opacity=".55"') + line(x + w - .08, y, x + w - .08, y + h, BONE2, 4, 'opacity=".55"')
        for k in range(1, lanes):
            xx = x + w * k / lanes
            g += line(xx, y + .3, xx, y + h - .3, BONE, 5, 'stroke-dasharray="60 50" opacity=".6"')
    return g
def f_crosswalk(x, y, w, h, horizontal=True):
    g = ''
    if horizontal:
        for i in range(int(w / .5)): g += rect(x + i * .5 + .08, y, .3, h, BONE, 2, 'opacity=".5"')
    else:
        for i in range(int(h / .5)): g += rect(x, y + i * .5 + .08, w, .3, BONE, 2, 'opacity=".5"')
    return g
def f_car(x, y, acc, horizontal=True, wreck=False):
    w, h = (2.2, 1.05) if horizontal else (1.05, 2.2)
    g = rect(x, y, w, h, BONE, 22)
    if horizontal:
        g += rect(x + .55, y + .14, .45, h - .28, INK, 6) + rect(x + 1.35, y + .16, .35, h - .32, INK, 6) + rect(x + w - .12, y + .12, .08, .22, acc, 2) + rect(x + w - .12, y + h - .34, .08, .22, acc, 2)
    else:
        g += rect(x + .14, y + .55, w - .28, .45, INK, 6) + rect(x + .16, y + 1.35, w - .32, .35, INK, 6) + rect(x + .12, y + h - .12, .22, .08, acc, 2) + rect(x + w - .34, y + h - .12, .22, .08, acc, 2)
    if wreck: g += line(x + .2, y + .2, x + w - .2, y + h - .2, INK, 4, 'opacity=".6"')
    return shadowed(g)
def f_aircar(x, y, acc):
    g = f'<ellipse cx="{px(x+1.2)}" cy="{px(y+.6)}" rx="{px(1.25)}" ry="{px(.6)}" fill="{BONE}"/>' + f'<ellipse cx="{px(x+1.35)}" cy="{px(y+.6)}" rx="{px(.55)}" ry="{px(.32)}" fill="{INK}"/>'
    g += rect(x - .05, y + .05, .5, .22, BONE2, 4) + rect(x - .05, y + .93, .5, .22, BONE2, 4) + rect(x + 1.95, y + .05, .5, .22, BONE2, 4) + rect(x + 1.95, y + .93, .5, .22, BONE2, 4)
    return shadowed(g) + circ(x + 1.2, y + .6, .9, 'none', f'stroke="{acc}" stroke-width="3" stroke-dasharray="8 8" opacity=".7"')
def f_building(x, y, w, h, acc, label=''):
    g = rect(x, y, w, h, '#151c21', 4, f'stroke="{BONE}" stroke-width="6"') + rect(x + .18, y + .18, w - .36, h - .36, 'none', 2, f'stroke="{acc}" stroke-width="2" opacity=".45"')
    g += rect(x + .5, y + .5, .7, .5, BONE2, 3) + rect(x + w - 1.3, y + h - 1.1, .8, .6, BONE2, 3) + circ(x + w - .9, y + .9, .25, BONE2)
    if label: g += text(x + w / 2, y + h / 2 + .12, label, 20, acc, ls=3)
    return g
def f_neon(x, y, s, acc, size=30):
    return (f'<text x="{px(x)}" y="{px(y)}" text-anchor="middle" font-family="Oswald,\'Bebas Neue\',Impact,sans-serif" font-size="{size}" font-weight="700" letter-spacing="4" fill="none" stroke="{acc}" stroke-width="9" opacity=".25">{cs.esc(s)}</text>'
            + text(x, y, s, size, acc, mono=False, ls=4))
def f_puddle(x, y, rx, ry, acc):
    return f'<ellipse cx="{px(x)}" cy="{px(y)}" rx="{px(rx)}" ry="{px(ry)}" fill="{acc}" opacity=".06" stroke="{acc}" stroke-width="2" stroke-opacity=".3"/>'
def f_barrier(x1, y1, x2, y2, acc):
    return line(x1, y1, x2, y2, BONE, 14) + line(x1, y1, x2, y2, acc, 14, 'stroke-dasharray="18 18"')
def f_dumpster(x, y, acc):
    return shadowed(rect(x, y, 1.6, .9, BONE2, 6) + line(x + .1, y + .3, x + 1.5, y + .3, INK, 4) + rect(x + .2, y + .5, .3, .2, acc, 2))
def f_container(x, y, acc, horizontal=True, length=4.0):
    w, h = (length, 1.25) if horizontal else (1.25, length)
    g = rect(x, y, w, h, BONE, 4)
    n = int((w if horizontal else h) / .35)
    for i in range(1, n):
        g += line(x + i * .35, y + .08, x + i * .35, y + h - .08, BONE2, 3) if horizontal else line(x + .08, y + i * .35, x + w - .08, y + i * .35, BONE2, 3)
    g += rect(x + (w - .5 if horizontal else .3), y + (.3 if horizontal else h - .5), .2 if horizontal else .6, .6 if horizontal else .2, acc, 2)
    return shadowed(g)
def f_crane(x, y, acc, length=8.0):
    return shadowed(rect(x - .7, y - .7, 1.4, 1.4, BONE, 6) + rect(x - .3, y - .3, .6, .6, INK, 4)) + line(x, y, x + length, y, BONE, 16) + line(x, y, x + length, y, INK, 4, 'stroke-dasharray="20 20"') + circ(x + length, y, .25, acc)
def f_pad(x, y, r, acc, label=''):
    g = circ(x, y, r, '#121a1f', f'stroke="{BONE}" stroke-width="8"') + circ(x, y, r * .8, 'none', f'stroke="{acc}" stroke-width="4" stroke-dasharray="26 18"')
    for a, d in ((0, 'M-30 -40 L0 -70 L30 -40'), (180, 'M-30 -40 L0 -70 L30 -40')):
        g += f'<path d="{d}" fill="none" stroke="{acc}" stroke-width="8" transform="translate({px(x)},{px(y)}) rotate({a}) scale({r/1.4})"/>'
    if label: g += text(x, y + .3, label, 84, BONE, mono=False, ls=4, extra='opacity=".85"')
    return g
def f_ring(x, y, w, h, acc):
    g = rect(x, y, w, h, '#161d22', 4) + rect(x + .15, y + .15, w - .3, h - .3, 'none', 2, f'stroke="{acc}" stroke-width="5"') + rect(x + .35, y + .35, w - .7, h - .7, 'none', 2, f'stroke="{BONE2}" stroke-width="3"')
    for cx, cy in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)): g += circ(cx, cy, .2, BONE)
    return g
def f_stall(x, y, w, acc, label=''):
    g = rect(x, y, w, 1.2, BONE, 4)
    for i in range(int(w / .5)): g += rect(x + i * .5, y, .25, .45, acc, 0, 'opacity=".75"')
    g += rect(x + .2, y + .7, w - .4, .32, BONE2, 3)
    out = shadowed(g)
    if label: out += text(x + w / 2, y + 1.6, label, 16, acc, ls=2)
    return out
def f_cells(x, y, n, acc, w=1.6, h=2.2):
    g = ''
    for i in range(n):
        cx = x + i * w
        g += rect(cx, y, w, h, '#151c21', 2, f'stroke="{BONE}" stroke-width="5"') + rect(cx + .4, y + .3, .7, .35, BONE2, 3)
        for k in range(1, 6): g += line(cx + k * w / 6, y + h - .05, cx + k * w / 6, y + h + .02, acc, 5)
    return g
def f_bar(x, y, w, acc, stools=5, vertical=False):
    if vertical:
        g = rect(x, y, .8, w, BONE, 8) + rect(x + .1, y + .2, .2, w - .4, acc, 3, 'opacity=".55"')
        for i in range(stools): g += circ(x + 1.25, y + .5 + i * (w - 1) / max(1, stools - 1), .24, BONE2)
    else:
        g = rect(x, y, w, .8, BONE, 8) + rect(x + .2, y + .1, w - .4, .2, acc, 3, 'opacity=".55"')
        for i in range(stools): g += circ(x + .5 + i * (w - 1) / max(1, stools - 1), y + 1.25, .24, BONE2)
    return shadowed(g)
def f_booth(x, y, acc):
    g = f'<path d="M{px(x)} {px(y)} L{px(x)} {px(y+1.6)} Q{px(x)} {px(y+2.2)} {px(x+.6)} {px(y+2.2)} L{px(x+2.0)} {px(y+2.2)} L{px(x+2.0)} {px(y+1.7)} L{px(x+.5)} {px(y+1.7)} L{px(x+.5)} {px(y)} Z" fill="{BONE2}"/>'
    g += rect(x + .8, y + .4, 1.0, .9, BONE, 10) + circ(x + 1.3, y + .85, .12, acc)
    return shadowed(g)
def f_stage(x, y, w, h, acc):
    g = rect(x, y, w, h, BONE, 6) + rect(x + .2, y + .2, w - .4, h - .4, INK, 4)
    for i in range(int(w / .8)): g += circ(x + .45 + i * .8, y + .45, .12, acc)
    return shadowed(g)
def f_dancefloor(x, y, w, h, acc):
    g = ''
    for i in range(int(w)):
        for j in range(int(h)):
            g += rect(x + i + .06, y + j + .06, .88, .88, acc if (i + j) % 2 == 0 else '#1a2228', 3, 'opacity=".14"' if (i + j) % 2 == 0 else 'opacity=".9"')
    return g
def f_pillar(x, y, r=.35):
    return shadowed(circ(x, y, r, BONE) + circ(x, y, r * .5, BONE2))
def f_tank(x, y, acc):
    return shadowed(rect(x, y, 1.2, 2.6, BONE, 30) + rect(x + .18, y + .3, .84, 2.0, acc, 22, 'opacity=".28"') + circ(x + .6, y + 1.0, .2, BONE) + rect(x + .5, y + 1.15, .2, .8, BONE, 6))
def f_pier(x, y, w, h):
    g = rect(x, y, w, h, '#1a2024', 2, f'stroke="{BONE2}" stroke-width="4"')
    for i in range(1, int(w / .4)): g += line(x + i * .4, y + .06, x + i * .4, y + h - .06, '#0c1013', 3)
    return g
def f_bollards(x, y, n, gap=1.4, acc='#fff'):
    return ''.join(shadowed(circ(x + i * gap, y, .16, BONE)) for i in range(n))
def f_server(x, y, n, acc, vertical=False):
    g = ''
    for i in range(n):
        cx, cy = (x, y + i * 1.0) if vertical else (x + i * .8, y)
        g += rect(cx, cy, .65 if not vertical else 1.6, 1.6 if not vertical else .8, BONE, 4)
        for k in range(4):
            g += circ(cx + .18 + (k % 2) * .28 if not vertical else cx + .3 + k * .3, cy + .3 + (k // 2) * .3 if not vertical else cy + .4, .05, acc)
    return shadowed(g)
def f_gate(x1, y1, x2, y2, acc):
    return line(x1, y1, x2, y2, BONE, 10) + line(x1, y1, x2, y2, acc, 4, 'stroke-dasharray="6 10"') + circ(x1, y1, .18, acc) + circ(x2, y2, .18, acc)

FURNITURE.update(road=f_road, crosswalk=f_crosswalk, car=f_car, aircar=f_aircar, building=f_building, neon=f_neon, puddle=f_puddle, barrier=f_barrier,
                 dumpster=f_dumpster, container=f_container, crane=f_crane, pad=f_pad, ring=f_ring, stall=f_stall, cells=f_cells, bar=f_bar, booth=f_booth,
                 stage=f_stage, dancefloor=f_dancefloor, pillar=f_pillar, tank=f_tank, pier=f_pier, bollards=f_bollards, server=f_server, gate=f_gate)

Z = lambda i, n, r: dict(id=i, name=n, rect=r)

# --------------------------------------------------------------------------- Bay City
MAPS = [
 dict(id='BAY-STRIP', slug='bc01-the-neon-strip', code='BC01', journal='STREET', name='The Neon Strip', accent=CY,
  zones=[Z('north-walk', 'North Sidewalk', [1, 1, 26, 3]), Z('strip-road', 'Strip Road', [1, 4, 26, 5]), Z('south-walk', 'South Sidewalk', [1, 9, 18, 3]),
         Z('noodle-bar', 'Noodle Bar', [1, 12, 8, 5]), Z('alley-mouth', 'Alley Mouth', [9, 12, 5, 5]), Z('pachinko', 'Pachinko Parlour', [14, 12, 5, 5]),
         Z('skyway-stair', 'Skyway Stair', [19, 9, 8, 5.6])],
  links=[('north-walk', 'strip-road', 'CROSSWALK'), ('strip-road', 'south-walk'), ('strip-road', 'skyway-stair'), ('south-walk', 'noodle-bar'),
         ('south-walk', 'alley-mouth'), ('south-walk', 'pachinko'), ('south-walk', 'skyway-stair'), ('noodle-bar', 'alley-mouth', 'KITCHEN DOOR')],
  under=[('road', 1, 4, 26, 5, CY, True, 2), ('crosswalk', 11.5, 4.1, 3.0, 4.8, True), ('puddle', 6, 7.2, 1.4, .4, CY), ('puddle', 22, 5.6, 1.8, .5, CY), ('puddle', 12, 15.5, .9, .3, CY)],
  items=[('billboard', 3.0, 1.2, 5.0, CY), ('neon', 15.0, 2.8, 'GENE-TAILORED // 24H', PINK, 30), ('neon', 23.0, 2.2, 'NEEDLECAST', CY, 34),
         ('car', 3.0, 7.4, CY), ('car', 17.0, 4.5, RED), ('car', 22.5, 7.4, AMB), ('cover', 4.1, 6.9, CY), ('cover', 18.1, 5.0, CY),
         ('bar', 1.8, 12.6, 5.6, PINK, 5), ('label', 4.6, 15.6, 'STEAM · BROTH · NO QUESTIONS', PINK, 16), ('dumpster', 10.4, 14.6, CY),
         ('cabinets', 14.6, 13.2, 4, .9, 2.0, True, PINK), ('stairs', 21.0, 10.0, 4.0, 2.4, False), ('label', 23.0, 13.6, 'TO THE SKYWAY', CY, 17),
         ('cover', 8.0, 10.4, CY), ('label', 8.0, 11.55, 'KIOSK', CY, 15)],
  exits=[dict(at=[1.0, 6.5], label='DOWNTOWN', dir='left'), dict(at=[27.6, 6.5], label='WATERFRONT', dir='right'), dict(at=[11.5, 17.0], label='THE ALLEY', dir='down')]),

 dict(id='BAY-ALLEY', slug='bc02-rain-alley', code='BC02', journal='STREET', name='Rain Alley', accent=AMB,
  zones=[Z('alley-entrance', 'Alley Entrance', [1, 6, 6, 6]), Z('dumpster-run', 'Dumpster Run', [7, 6, 11, 6]), Z('loading-dock', 'Loading Dock', [18, 6, 9, 6]),
         Z('fire-escape', 'Fire Escape', [7, 1, 11, 5]), Z('service-door', 'Service Door', [18, 1, 9, 5]), Z('back-court', 'Back Court', [7, 12, 12, 5])],
  links=[('alley-entrance', 'dumpster-run'), ('dumpster-run', 'loading-dock'), ('dumpster-run', 'fire-escape', 'LADDER'), ('loading-dock', 'service-door', 'ROLL-UP DOOR'),
         ('dumpster-run', 'back-court', 'CHAIN-LINK GAP'), ('fire-escape', 'service-door', 'CATWALK')],
  under=[('puddle', 9, 9.2, 2.0, .6, AMB), ('puddle', 14.5, 8, 1.2, .4, AMB), ('puddle', 3.5, 10.5, 1.0, .3, AMB), ('grate', 12.0, 10.6, 1.4, .8)],
  items=[('dumpster', 8.0, 7.0, AMB), ('dumpster', 11.0, 7.0, AMB), ('cover', 8.8, 8.6, AMB), ('cover', 11.8, 8.6, AMB), ('crates', 15.0, 10.4, 4, .7),
         ('stairs', 9.0, 2.0, 7.0, 2.4, False), ('label', 12.5, 5.2, 'RUSTED FIRE ESCAPE', AMB, 17), ('doorlabel', 20.0, 2.6, 4.5, 'STAFF ONLY', AMB),
         ('container', 19.0, 7.4, AMB, True, 4.0), ('cover', 23.8, 8.0, AMB, True), ('car', 20.0, 10.0, AMB), ('neon', 4.0, 7.4, 'NO LOITERING', AMB, 22),
         ('lockers', 9.0, 13.4, 6, AMB), ('bench', 14.0, 14.2, 3.0, .9, AMB), ('label', 13.0, 16.4, 'SMOKING SPOT · CAMERA BLIND', AMB, 16)],
  exits=[dict(at=[1.0, 9.0], label='THE STRIP', dir='left'), dict(at=[27.6, 9.0], label='DELIVERY ROAD', dir='right'), dict(at=[12.5, 1.0], label='ROOFTOPS', dir='up')],
  cartouche=(19.6, 14.8)),

 dict(id='BAY-PRECINCT', slug='bc03-bcpd-precinct', code='BC03', journal='LAW', name='BCPD Precinct House', accent=BLUE,
  zones=[Z('front-desk', 'Front Desk', [1, 1, 8, 7]), Z('bullpen', 'Bullpen', [9, 1, 11, 9]), Z('captain-office', "Captain's Office", [20, 1, 7, 5]),
         Z('interrogation', 'Interrogation', [20, 6, 7, 5]), Z('holding-cells', 'Holding Cells', [1, 8, 8, 9]), Z('evidence-locker', 'Evidence Locker', [9, 10, 5, 7]),
         Z('motor-pool', 'Motor Pool', [14, 10, 5.4, 4.8])],
  links=[('front-desk', 'bullpen', 'SECURITY GATE'), ('bullpen', 'captain-office'), ('bullpen', 'interrogation'), ('front-desk', 'holding-cells', 'SALLY PORT'),
         ('bullpen', 'evidence-locker', 'BADGE READER'), ('bullpen', 'motor-pool'), ('holding-cells', 'evidence-locker')],
  items=[('desk', 2.0, 2.5, BLUE, 3.0, 1.0), ('chairs', 2.2, 5.6, 5), ('neon', 5.0, 7.4, 'BAY CITY POLICE', BLUE, 22),
         *[('desk', 10.2 + (i % 3) * 3.2, 2.6 + (i // 3) * 3.0, BLUE, 2.4, 1.0) for i in range(6)], ('cover', 12.0, 8.6, BLUE),
         ('desk', 21.2, 2.0, BLUE, 3.0, 1.1), ('cabinets', 25.0, 1.6, 2, .8, 2.0, True, BLUE), ('table', 22.0, 7.6, 2.4, 1.2, 2), ('window', 20.2, 10.85, 26.8, 10.85, BLUE),
         ('label', 23.4, 10.4, 'ONE-WAY GLASS', BLUE, 16), ('cells', 1.5, 9.0, 4, BLUE), ('bench', 1.6, 14.0, 6.2, .8, BLUE), ('label', 4.8, 15.6, 'BOOKING · DNA SWAB · STACK SCAN', BLUE, 15),
         ('cabinets', 9.6, 10.8, 4, .9, 2.4, True, BLUE), ('cover', 11.4, 15.3, BLUE, True), ('car', 14.6, 11.0, BLUE), ('car', 16.9, 11.0, BLUE)],
  exits=[dict(at=[1.0, 4.5], label='STREET', dir='left'), dict(at=[19.4, 12.4], label='GARAGE RAMP', dir='right')]),

 dict(id='BAY-CLINIC', slug='bc04-resleeving-clinic', code='BC04', journal='MEDICAL', name='Resleeving Clinic', accent=TEAL,
  zones=[Z('lobby', 'Reception Lobby', [1, 1, 9, 7]), Z('consult', 'Consultation', [1, 8, 9, 5]), Z('sleeve-storage', 'Sleeve Storage', [10, 1, 10, 7]),
         Z('resleeve-theatre', 'Resleeve Theatre', [10, 8, 10, 6.8]), Z('stack-vault', 'Stack Vault', [20, 1, 7, 6]), Z('staff-corridor', 'Staff Corridor', [20, 7, 7, 4.6]),
         Z('loading-bay', 'Morgue Lift', [1, 13, 9, 4])],
  links=[('lobby', 'consult'), ('lobby', 'sleeve-storage', 'AUTHORISED'), ('consult', 'resleeve-theatre'), ('sleeve-storage', 'resleeve-theatre'),
         ('sleeve-storage', 'stack-vault', 'VAULT DOOR'), ('resleeve-theatre', 'staff-corridor'), ('stack-vault', 'staff-corridor'), ('consult', 'loading-bay')],
  items=[('desk', 2.0, 2.2, TEAL, 3.4, 1.0), ('chairs', 2.0, 5.4, 6), ('neon', 5.5, 7.4, 'NEW BODY // NEW YOU', TEAL, 22),
         *[('tank', 11.0 + i * 1.75, 2.0, TEAL) for i in range(5)], ('label', 15.0, 5.3, 'SYNTH & CLONE SLEEVES ON ICE', TEAL, 16),
         ('cradle', 14.0, 9.6, TEAL), ('console', 11.0, 9.4, 2.4, 1.6, TEAL), ('console', 16.6, 9.4, 2.4, 1.6, TEAL), ('cover', 12.2, 12.8, TEAL), ('cover', 17.8, 12.8, TEAL),
         ('server', 21.0, 2.0, 6, TEAL), ('label', 23.4, 4.6, 'CORTICAL STACK ARCHIVE', TEAL, 16), ('lockers', 21.0, 8.4, 10, TEAL), ('table', 2.6, 9.4, 3.0, 1.2, 4),
         ('lift', 6.4, 14.0, 2.2, TEAL), ('crates', 2.0, 14.2, 3, .7)],
  exits=[dict(at=[1.0, 4.5], label='STREET', dir='left'), dict(at=[27.6, 9.3], label='FIRE STAIR', dir='right')]),

 dict(id='BAY-SPIRE', slug='bc05-meth-spire-penthouse', code='BC05', journal='AERIUM', name='Meth Spire Penthouse', accent=GOLD,
  zones=[Z('landing-pad', 'Landing Pad', [1, 1, 9, 9]), Z('atrium', 'Atrium', [10, 1, 10, 9]), Z('gallery', 'Gallery', [20, 1, 7, 9]),
         Z('lift-core', 'Lift Core', [1, 10, 6, 6.6]), Z('salon', 'Salon', [7, 10, 7, 6.6]), Z('private-study', 'Private Study', [14, 10, 5.4, 6.6])],
  links=[('landing-pad', 'atrium', 'BLAST DOORS'), ('atrium', 'gallery'), ('landing-pad', 'lift-core'), ('lift-core', 'salon'), ('atrium', 'salon'),
         ('salon', 'private-study', 'BIOMETRIC'), ('atrium', 'private-study')],
  under=[('pool', 12.0, 3.0, 6.0, 3.0, GOLD)],
  items=[('pad', 5.5, 5.5, 3.2, GOLD), ('aircar', 4.3, 4.9, GOLD), ('label', 5.5, 9.4, 'PRIVATE AIRCAR BERTH', GOLD, 16), ('pillar', 11.0, 7.8), ('pillar', 19.0, 7.8),
         ('chairs', 12.6, 7.6, 5), ('cover', 11.0, 2.0, GOLD), ('lightwall', 26.6, 1.5, 8.0, GOLD), ('memorial', 22.5, 4.0, GOLD), ('memorial', 22.5, 7.6, GOLD),
         ('label', 23.0, 9.4, 'PRE-COLLAPSE ART · BIO-LOCKED', GOLD, 15), ('lift', 2.6, 11.6, 2.6, GOLD), ('table', 8.2, 12.0, 4.6, 1.4, 6, 3, GOLD), ('bench', 8.0, 15.0, 5.0, .9, GOLD),
         ('desk', 15.0, 11.2, GOLD, 3.0, 1.2), ('cabinets', 15.0, 13.8, 3, .9, 2.0, True, GOLD), ('cover', 18.4, 12.0, GOLD, True), ('window', 1.2, 1.1, 26.8, 1.1, GOLD)],
  exits=[dict(at=[1.0, 13.4], label='STREET LEVEL', dir='left'), dict(at=[27.6, 5.5], label='SKY BRIDGE', dir='right')]),

 dict(id='BAY-PIT', slug='bc06-fight-pit', code='BC06', journal='UNDERWORLD', name='The Fight Pit', accent=RED,
  zones=[Z('the-pit', 'The Pit', [9, 4, 10, 8]), Z('north-stands', 'North Stands', [9, 1, 10, 3]), Z('west-stands', 'West Stands', [1, 1, 8, 11]),
         Z('east-stands', 'East Stands', [19, 1, 8, 11]), Z('betting-booth', 'Betting Booth', [1, 12, 8, 5]), Z('locker-room', 'Locker Room', [9, 12, 10, 5]),
         Z('back-exit', 'Back Exit', [19, 12, 8, 2.6])],
  links=[('the-pit', 'north-stands', 'CAGE GATE'), ('the-pit', 'west-stands', 'CAGE GATE'), ('the-pit', 'east-stands', 'CAGE GATE'), ('the-pit', 'locker-room', 'TUNNEL'),
         ('west-stands', 'north-stands'), ('east-stands', 'north-stands'), ('west-stands', 'betting-booth'), ('east-stands', 'back-exit'), ('locker-room', 'back-exit'),
         ('betting-booth', 'locker-room')],
  items=[('ring', 10.0, 5.0, 8.0, 6.0, RED), ('neon', 14.0, 8.4, 'SLEEVES BURN · STACKS WALK', RED, 26), ('bowls', 2.0, 2.6, 7, 6, RED), ('bowls', 20.0, 2.6, 7, 6, RED),
         ('chairs', 10.2, 2.0, 8), ('desk', 2.0, 13.0, RED, 3.2, 1.0), ('label', 4.8, 15.4, 'ODDS · STAKES · DEBTS', RED, 16), ('cover', 7.6, 14.0, RED, True),
         ('lockers', 10.0, 13.0, 10, RED), ('bench', 10.4, 15.0, 6.0, .8, RED), ('crates', 21.0, 12.7, 3, .6), ('pillar', 9.0, 4.0), ('pillar', 19.0, 4.0), ('pillar', 9.0, 12.0), ('pillar', 19.0, 12.0)],
  exits=[dict(at=[1.0, 6.5], label='STAIRS UP', dir='left'), dict(at=[27.6, 13.3], label='SERVICE TUNNEL', dir='right')]),

 dict(id='BAY-DOCKS', slug='bc07-bay-docks', code='BC07', journal='WATERFRONT', name='Bay Docks', accent=CY,
  zones=[Z('pier', 'The Pier', [1, 1, 26, 3.4]), Z('container-yard', 'Container Yard', [1, 4.4, 12, 7.6]), Z('crane-deck', 'Crane Deck', [13, 4.4, 7, 7.6]),
         Z('warehouse', 'Warehouse 9', [20, 4.4, 7, 7.6]), Z('gate-house', 'Gate House', [1, 12, 7, 5]), Z('access-road', 'Access Road', [8, 12, 11.4, 5])],
  links=[('pier', 'container-yard'), ('pier', 'crane-deck'), ('pier', 'warehouse', 'DOCK DOORS'), ('container-yard', 'crane-deck'), ('crane-deck', 'warehouse'),
         ('container-yard', 'gate-house'), ('container-yard', 'access-road'), ('gate-house', 'access-road', 'BOOM GATE'), ('crane-deck', 'access-road')],
  under=[('water', 0, 0, 28, 1.0, CY), ('pier', 1, 1, 26, 3.4), ('road', 8, 12, 11.4, 5, CY, True, 2)],
  items=[('bollards', 2.0, 1.4, 18, 1.4), ('container', 2.0, 5.2, CY, True, 4.0), ('container', 6.6, 5.2, RED, True, 4.0), ('container', 2.0, 7.0, AMB, True, 4.0),
         ('container', 2.0, 9.4, CY, True, 4.0), ('container', 7.6, 8.4, VIO, False, 3.2), ('cover', 6.4, 7.6, CY, True), ('cover', 10.8, 10.6, CY),
         ('crane', 16.5, 8.0, CY, 9.0), ('crates', 21.0, 5.4, 6, .7), ('crates', 21.0, 9.4, 4, .7), ('cover', 25.4, 7.4, CY), ('label', 23.5, 11.4, 'BONDED · NO MANIFEST', CY, 15),
         ('desk', 2.0, 13.0, CY, 2.4, 1.0), ('gate', 8.0, 12.2, 8.0, 16.8, CY), ('car', 10.0, 12.8, CY), ('car', 14.8, 15.0, AMB), ('neon', 4.5, 16.0, 'PORT AUTHORITY', CY, 20)],
  exits=[dict(at=[19.4, 14.5], label='CITY', dir='right'), dict(at=[27.6, 2.7], label='BOAT SLIPS', dir='right')]),

 dict(id='BAY-SKYPORT', slug='bc08-skyport-deck', code='BC08', journal='TRANSIT', name='Skyport Landing Deck', accent=VIO,
  zones=[Z('pad-a', 'Pad A', [1, 1, 9, 9]), Z('pad-b', 'Pad B', [10, 1, 9, 9]), Z('control-booth', 'Control Booth', [19, 1, 8, 5]),
         Z('fuel-bay', 'Charging Bay', [19, 6, 8, 6]), Z('terminal', 'Terminal Gate', [1, 10, 11, 6.6]), Z('lift-lobby', 'Lift Lobby', [12, 10, 7, 4.8])],
  links=[('pad-a', 'pad-b'), ('pad-b', 'control-booth'), ('pad-b', 'fuel-bay'), ('control-booth', 'fuel-bay'), ('pad-a', 'terminal', 'BOARDING RAMP'),
         ('pad-b', 'lift-lobby'), ('terminal', 'lift-lobby'), ('fuel-bay', 'lift-lobby', 'SERVICE')],
  items=[('pad', 5.5, 5.5, 3.3, VIO, 'A'), ('pad', 14.5, 5.5, 3.3, VIO, 'B'), ('aircar', 13.3, 4.9, VIO), ('console', 20.0, 1.8, 3.0, 1.6, VIO), ('console', 23.6, 1.8, 3.0, 1.6, VIO),
         ('window', 19.2, 5.85, 26.8, 5.85, VIO), ('pump', 22.0, 8.0, VIO), ('pump', 22.0, 10.4, VIO), ('cover', 25.4, 9.2, VIO, True), ('label', 23.0, 11.5, 'HIGH VOLTAGE', VIO, 15),
         ('chairs', 2.0, 12.0, 8), ('chairs', 2.0, 13.4, 8), ('desk', 2.6, 15.0, VIO, 3.0, .9), ('cover', 11.0, 12.7, VIO), ('lift', 13.4, 11.0, 2.4, VIO), ('lift', 16.4, 11.0, 2.4, VIO),
         ('barrier', 1.2, 9.8, 9.6, 9.8, VIO), ('neon', 6.5, 16.1, 'DEPARTURES // ORBITAL & SUBORBITAL', VIO, 20)],
  exits=[dict(at=[27.6, 3.5], label='FLIGHT LANE', dir='right'), dict(at=[1.0, 13.3], label='CONCOURSE', dir='left')]),

 dict(id='BAY-MARKET', slug='bc09-lower-bay-market', code='BC09', journal='UNDERWORLD', name='Lower Bay Market', accent=PINK,
  zones=[Z('stall-row', 'Stall Row', [1, 1, 18, 5]), Z('food-court', 'Food Court', [1, 6, 9, 6]), Z('chop-shop', 'Chop Shop', [10, 6, 9, 6]),
         Z('stack-dealer', "Stack Dealer's Den", [19, 1, 8, 7]), Z('drainage-tunnel', 'Drainage Tunnel', [19, 8, 8, 6.6]), Z('stairwell', 'Market Stairwell', [1, 12, 9, 5]),
         Z('back-room', 'Back Room', [10, 12, 9, 2.8])],
  links=[('stall-row', 'food-court'), ('stall-row', 'chop-shop'), ('stall-row', 'stack-dealer', 'BEADED CURTAIN'), ('food-court', 'chop-shop'),
         ('chop-shop', 'drainage-tunnel', 'HATCH'), ('stack-dealer', 'drainage-tunnel'), ('food-court', 'stairwell'), ('chop-shop', 'back-room')],
  under=[('water', 19.4, 10.0, 7.2, 2.4, PINK), ('puddle', 5, 4.6, 1.4, .3, PINK)],
  items=[*[('stall', 1.6 + i * 3.4, 1.4, 3.0, PINK if i % 2 else CY) for i in range(5)], ('label', 9.5, 5.3, 'BLACK-MARKET SLEEVE PARTS · BOOTLEG SOFTWARE', PINK, 15),
         ('bar', 1.8, 7.0, 6.6, AMB, 6), ('table', 2.2, 9.6, 2.4, 1.0, 4), ('table', 5.6, 9.6, 2.4, 1.0, 4), ('cradle', 11.0, 7.0, PINK), ('bed', 13.0, 7.0, PINK),
         ('console', 15.4, 7.2, 3.0, 1.6, PINK), ('cover', 17.6, 10.6, PINK), ('label', 14.5, 11.6, 'UNLICENSED AUGMENTS', PINK, 15), ('server', 20.0, 1.8, 4, PINK),
         ('desk', 23.6, 2.0, PINK, 2.6, 1.0), ('cover', 25.8, 5.6, PINK, True), ('grate', 20.0, 13.0, 2.0, 1.0), ('stairs', 2.2, 13.0, 6.0, 2.6, False), ('crates', 11.0, 12.6, 6, .62)],
  exits=[dict(at=[1.0, 14.3], label='STREET', dir='left'), dict(at=[27.6, 11.2], label='STORM DRAINS', dir='right')]),

 dict(id='BAY-CLUB', slug='bc10-neon-nightclub', code='BC10', journal='NIGHTLIFE', name='Neon Nightclub', accent=PINK,
  zones=[Z('queue', 'Door Queue', [1, 1, 6, 16]), Z('dance-floor', 'Dance Floor', [7, 1, 12, 9]), Z('main-bar', 'Main Bar', [7, 10, 12, 5]),
         Z('dj-stage', 'DJ Stage', [19, 1, 8, 4]), Z('vip-booths', 'VIP Booths', [19, 5, 8, 6]), Z('back-office', 'Back Office', [19, 11, 8, 3.6]),
         Z('restrooms', 'Restrooms', [7, 15, 6, 2])],
  links=[('queue', 'dance-floor', 'BOUNCER'), ('queue', 'main-bar'), ('dance-floor', 'main-bar'), ('dance-floor', 'dj-stage'), ('dance-floor', 'vip-booths', 'VELVET ROPE'),
         ('vip-booths', 'back-office', 'KEYCARD'), ('main-bar', 'back-office'), ('main-bar', 'restrooms'), ('dj-stage', 'vip-booths')],
  items=[('dancefloor', 8.0, 2.0, 10, 7, PINK), ('neon', 13.0, 9.6, 'SLEEVELESS SATURDAYS', CY, 26),
         ('barrier', 2.0, 2.0, 2.0, 15.0, PINK), ('chairs', 3.0, 3.0, 1), ('label', 4.0, 16.4, 'ID CHECK · STACK SCAN', PINK, 15),
         ('bar', 8.0, 11.0, 10.0, PINK, 8), ('stage', 19.8, 1.6, 6.4, 2.6, CY), ('booth', 19.8, 5.6, PINK), ('booth', 22.6, 5.6, PINK), ('booth', 19.8, 8.4, PINK), ('booth', 22.6, 8.4, PINK),
         ('cover', 26.0, 7.2, PINK), ('desk', 20.2, 11.8, PINK, 2.8, 1.0), ('cabinets', 24.0, 11.6, 3, .8, 2.0, True, PINK), ('cover', 9.2, 13.8, PINK)],
  exits=[dict(at=[1.0, 9.0], label='STREET', dir='left'), dict(at=[27.6, 12.8], label='ALLEY DOOR', dir='right')]),
]
for m in MAPS: m['series'] = 'BAY CITY'

# --------------------------------------------------------------------------- validation
def validate(m):
    errs = []
    zones = m['zones']; ids = [z['id'] for z in zones]
    if len(set(ids)) != len(ids): errs.append('duplicate zone ids')
    cx, cy = m.get('cartouche', (19.6, 15.2))
    for z in zones:
        x, y, w, h = z['rect']
        if x < 0 or y < 0 or x + w > W or y + h > H: errs.append(f"{z['id']} outside map")
        if x < cx + 8 and x + w > cx + .01 and y < cy + 2.6 and y + h > cy + .01: errs.append(f"{z['id']} under title cartouche")
    for i, a in enumerate(zones):
        for b in zones[i + 1:]:
            ax, ay, aw, ah = a['rect']; bx, by, bw, bh = b['rect']
            if ax < bx + bw - 1e-6 and bx < ax + aw - 1e-6 and ay < by + bh - 1e-6 and by < ay + ah - 1e-6: errs.append(f"{a['id']} overlaps {b['id']}")
    adj = {i: set() for i in ids}
    for l in m['links']:
        if l[0] not in adj or l[1] not in adj: errs.append(f'bad link {l}'); continue
        adj[l[0]].add(l[1]); adj[l[1]].add(l[0])
    seen, todo = set(), [ids[0]]
    while todo:
        n = todo.pop()
        if n in seen: continue
        seen.add(n); todo += list(adj[n])
    if seen != set(ids): errs.append(f'unreachable: {set(ids) - seen}')
    return errs

if __name__ == '__main__':
    out_dir, content = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    data, bad = [], False
    for m in MAPS:
        e = validate(m)
        if e: print(m['code'], e); bad = True
        open(os.path.join(out_dir, m['slug'] + '.svg'), 'w').write(cs.render(m))
        adj = {z['id']: set() for z in m['zones']}
        for l in m['links']: adj[l[0]].add(l[1]); adj[l[1]].add(l[0])
        data.append({'id': m['id'], 'name': m['name'], 'code': m['code'], 'district': m['journal'], 'file': m['slug'] + '.webp', 'width': W * CELL, 'height': H * CELL, 'gridSize': CELL,
                     'zones': [{'id': z['id'], 'name': z['name'], 'rect': [px(v) for v in z['rect']], 'adjacent': sorted(adj[z['id']])} for z in m['zones']],
                     'exits': [e['label'] for e in m.get('exits', [])]})
    json.dump({'maps': data}, open(content, 'w'), indent=1)
    print(len(data), 'maps', 'with problems' if bad else 'valid')
    sys.exit(1 if bad else 0)
