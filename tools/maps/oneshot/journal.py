"""The Butterfly Cut GM book: journal entries for the pack builder, plus the case-web board SVG.
Usage: python3 journal.py SYSTEM_DIR OUT_ENTRIES_JSON OUT_BOARD_SVG"""
import json, sys, html
B, OUT, SVG = sys.argv[1:4]
D = json.load(open(f'{B}/data/oneshot-butterfly-cut.json'))
esc = lambda s: html.escape(str(s), quote=False)
P = {p['id']: p for p in D['places']}
T = {t['id']: t for t in D['threads']}
N = {n['id']: n for n in D['npcs']}
NAME = lambda i: P[i]['name'] if i in P else i
IMG = 'systems/altered-carbon-rpg/assets/oneshot/butterfly-cut'
TOK = lambda n: 'systems/altered-carbon-rpg/assets/tokens/people/npc-' + ''.join(c if c.isalnum() else '-' for c in n.lower()).strip('-').replace('--', '-') + '.webp'
STREETS = [p for p in D['places'] if p['kind'] == 'street']
ORDER = ['BCS-LICKTOWN', 'BCS-DOGPATCH', 'BCS-MISSION', 'BCS-FELL', 'BCS-CIVIC', 'BCS-OLD-DT-N', 'BCS-OLD-DT-S', 'BCS-ALCATRAZ', 'BCS-WHARF',
         'BCS-GG-SOUTH', 'BCS-GG-NORTH', 'BCS-MARINA', 'BCS-PANHANDLE', 'BCS-TWIN-PEAKS']

def tag(t): th = T[t]; return f'<span class="ac-os-tag" style="--c:{th["colour"]}">{esc(th["name"])}</span>'
def role(r): return f'<span class="ac-os-role">{esc(r)}</span>'
def entry_of(pid):
    p = P[pid]; st = p['street'] if p['kind'] != 'street' else pid
    return f'The Butterfly Cut — {NAME(st)}'
def ref(pid): return f'<strong>{esc(NAME(pid))}</strong>'

def place_page(p):
    inbound = [(q, c) for q in D['places'] for c in q['clues'] if c['to'] == p['id']]
    clock = [c for c in D['clock'] if c['place'] == p['id']]
    hand = [h for h in D['handouts'] if h['place'] == p['id']]
    back = [b for b in D['backstory'] if b['place'] == p['id']]
    h = [f'<div class="ac-os-head">{role(p["role"])} {tag(p["thread"])} <span class="ac-os-where">{esc(p["district"])} · {esc(p["zone"])}</span></div>']
    h.append(f'<p class="ac-os-scene">{esc(p["scene"])}</p>')
    h.append(f'<p><strong>Mission:</strong> {esc(p["mission"])}</p>')
    if p.get('check'): h.append(f'<p><strong>Checks:</strong> {esc(p["check"])}</p>')
    if p.get('npc'):
        n = N[p['npc']]
        h.append(f'<div class="ac-os-npc"><img src="{TOK(n["name"])}" width="64" height="64" alt=""><div><strong>{esc(n["name"])}</strong>, {esc(n["role"])}. {esc(n["look"])}<br><em>Wants:</em> {esc(n["wants"])} <em>Secret:</em> {esc(n["secret"])}</div></div>')
    h.append('<h3>Clues: where this leads</h3><ul class="ac-os-clues">' + ''.join(f'<li>→ {ref(c["to"])}: {esc(c["text"])}</li>' for c in p['clues']) + '</ul>')
    if inbound: h.append('<h3>Pointed to from</h3><p class="ac-os-small">' + ', '.join(sorted({esc(NAME(q["id"])) for q, _ in inbound})) + '</p>')
    if hand: h.append('<h3>Handouts here</h3><ul>' + ''.join(f'<li><strong>{h_["id"]} {esc(h_["name"])}</strong></li>' for h_ in hand) + '</ul>')
    if back: h.append('<h3>What already happened here</h3><ul>' + ''.join(f'<li>Day {b["day"]}: {esc(b["text"])}</li>' for b in back) + '</ul>')
    if clock: h.append('<h3>Tonight</h3><ul>' + ''.join(f'<li><strong>{c["hour"]} {esc(c["title"])}:</strong> {esc(c["event"])}' + (f' <em>Prevented if:</em> {esc(c["prevent"])}' if c['prevent'] else '') + '</li>' for c in clock) + '</ul>')
    if p.get('ignored'): h.append(f'<p class="ac-os-ignored"><strong>If nobody comes:</strong> {esc(p["ignored"])}</p>')
    return dict(name=p['name'], html='\n'.join(h), flags={'altered-carbon-rpg': {'oneshotPlace': p['id']}})

entries = []
# ------------------------------------------------------------------ 00 Start here
opening = D['places'][0]
start = [
    dict(name='The Butterfly Cut', html=f'<img class="ac-os-banner" src="{IMG}/web.webp" alt="The case web"><p class="ac-os-tagline">{esc(D["meta"]["tagline"])}</p><p>{esc(D["meta"]["timeline_note"])} Length: {D["meta"]["length"]}. Players: {D["meta"]["players"]}.</p><h3>Player pitch (read aloud)</h3><blockquote>{D["pitch"]}</blockquote>{D["premise"]}'),
    dict(name='How to run it', html=D['howToRun'] + '<h3>Setting up in Foundry</h3><ol><li>Import the eight pregens from <em>One-Shot: The Butterfly Cut — Characters</em> and assign them.</li><li>Import <em>Streets · Licktown</em> from Bay City Streets and activate it.</li><li>Run <strong>Place case pins</strong> (Game Settings → Altered Carbon Content, or <code>game.alteredCarbon.OneShot.placePins()</code>). Every Bay City map in the world gets a pin on each place that opens its page here. Maps imported later get theirs automatically.</li><li>Drop NPCs from the Characters compendium as the players find them.</li></ol>'),
    dict(name='Opening scene: 16th Street, 21:00', html=f'<blockquote>Rain. Neon bleeding into puddles on 16th Street. A crowd has made a circle in the road, and in the middle of it a kid in a yellow raincoat is standing perfectly still. Eyes open. Breathing. Nobody home. A vendor is screaming for someone to help. At the edge of the crowd a dealer in a green hood is easing away towards the Lower Bay Market. A BCPD cruiser slows, its driver sees who it is, and it drives on.</blockquote>' + place_page(opening)['html'] + '<h3>Getting the pregens there</h3><p>Everyone is in Licktown tonight for their own reason: the task force was called out (Marisol, Teo, Kesh\'s handler is unreachable so he comes himself), Fenn is on call for tox, Rook is in the van, Two-Coats was meeting Marisol, Juniper is riding along with "her" task force, and Sunny heard it on the scanner.</p>'),
    dict(name='The night (clock)', html='<p>Advance one hour after each major scene. Fire the event unless the players have prevented it. Use Sunny\'s feed, radio chatter and phone calls to let the players hear about events elsewhere.</p><table class="ac-directory"><thead><tr><th>Hour</th><th>Event</th><th>Where</th><th>Prevented if</th></tr></thead><tbody>' + ''.join(f'<tr><td><strong>{c["hour"]}</strong></td><td><strong>{esc(c["title"])}.</strong> {esc(c["event"])}</td><td>{esc(NAME(c["place"]))}</td><td>{esc(c["prevent"]) or "—"}</td></tr>' for c in D['clock']) + '</tbody></table>'),
    dict(name='Pressure points and endings', html='<p>At dawn, score one point for each pressure point the players resolved in their favour.</p><table class="ac-directory"><thead><tr><th>Pressure point</th><th>Resolved</th><th>Left standing</th></tr></thead><tbody>' + ''.join(f'<tr><td><strong>{esc(x["name"])}</strong></td><td>{esc(x["good"])}</td><td>{esc(x["bad"])}</td></tr>' for x in D['pressure']) + '</tbody></table><h3>Endings</h3>' + ''.join(f'<p><strong>{esc(e["score"])} — {esc(e["name"])}.</strong> {esc(e["text"])}</p>' for e in D['endings'])),
    dict(name='The chain of dominoes (backstory)', html='<p>What happened before the session, in order. Every line is a place the players can visit and a cause they can prove.</p><ol class="ac-os-chain">' + ''.join(f'<li><span class="ac-os-day">Day {b["day"]}</span> <strong>{esc(NAME(b["place"]))}</strong>: {esc(b["text"])}</li>' for b in D['backstory']) + '</ol>'),
    dict(name='Cold Storage crossover', html='<p>Only if your world is also running <em>Cold Storage: The Faces We Left Behind</em>. Both stories happen in the same weeks of 2384; neither depends on the other.</p>' + ''.join(f'<p><strong>{esc(c["name"])}.</strong> {esc(c["text"])}</p>' for c in D['crossover'])),
]
entries.append(dict(name='The Butterfly Cut — 00 Start Here', pages=start))

# ------------------------------------------------------------------ 01 Case web
rows = ''.join(f'<tr><td>{ref(p["id"])}</td><td>{esc(p["district"])}</td><td>{esc(p["role"])}</td><td>{tag(p["thread"])}</td><td>{", ".join(esc(NAME(c["to"])) for c in p["clues"])}</td></tr>' for p in sorted(D['places'], key=lambda p: (ORDER.index(p['street']) if p['street'] in ORDER else 99, p['kind'] != 'street', p['name'])))
web = [dict(name='The case web', html=f'<img class="ac-os-board" src="{IMG}/web.webp" alt="The case web: dominoes and threads"><p>Left: the chain of dominoes before the session. Right: the eight threads, one per pregen, each a line of places. Places on more than one line are where the threads collide. Every place in Bay City has a page in the district journals.</p>'),
       dict(name='Every place at a glance', html='<table class="ac-directory"><thead><tr><th>Place</th><th>District</th><th>Role</th><th>Thread</th><th>Leads to</th></tr></thead><tbody>' + rows + '</tbody></table>')]
entries.append(dict(name='The Butterfly Cut — 01 Case Web', pages=web))

# ------------------------------------------------------------------ 02 Threads
tp = []
for t in D['threads']:
    g = next(x for x in D['pregens'] if x['id'] == t['pregen'])
    steps = ''.join(f'<li>{ref(s)}: <em>{esc(P[s]["mission"])}</em></li>' for s in t['spine'])
    places = [p for p in D['places'] if p['thread'] == t['id']]
    tp.append(dict(name=t['name'], html=f'<div class="ac-os-head">{tag(t["id"])}</div><p><strong>The question:</strong> {esc(t["question"])}</p><p>{esc(t["summary"])}</p><p><strong>Pregen:</strong> {esc(g["name"])} ({esc(g["role"])})</p><h3>The spine</h3><ol>{steps}</ol><h3>Every place on this thread</h3><p class="ac-os-small">{", ".join(esc(p["name"]) for p in places)}</p>'))
entries.append(dict(name='The Butterfly Cut — 02 Threads', pages=tp))

# ------------------------------------------------------------------ 03.. District journals (one per street map)
for i, sid in enumerate(ORDER):
    s = P[sid]
    pages = [place_page(s)]
    pages[0]['name'] = s['name'] + ' (street)'
    on = sorted([p for p in D['places'] if p['kind'] != 'street' and p['street'] == sid], key=lambda p: (p['kind'] != 'building', p['name']))
    pages += [place_page(p) for p in on]
    entries.append(dict(name=f'The Butterfly Cut — {s["name"]}', pages=pages, flags={'altered-carbon-rpg': {'oneshotStreet': sid}}))

# ------------------------------------------------------------------ NPCs, pregens, handouts
entries.append(dict(name='The Butterfly Cut — NPCs', pages=[dict(name=n['name'], html=f'<div class="ac-os-npc big"><img src="{TOK(n["name"])}" width="120" height="120" alt=""><div>{tag(n["thread"])}<p><strong>{esc(n["role"])}</strong>, found at {ref(n["place"])}.</p></div></div><p><strong>Look:</strong> {esc(n["look"])}</p><p><strong>Wants:</strong> {esc(n["wants"])}</p><p><strong>How they play:</strong> {esc(n["tactic"])}</p><p><strong>Secret:</strong> {esc(n["secret"])}</p>') for n in D['npcs']]))
entries.append(dict(name='The Butterfly Cut — Pregens (handouts)', pages=[dict(name=g['name'], html=f'<div class="ac-os-npc big"><img src="{TOK(g["name"])}" width="120" height="120" alt=""><div>{tag(g["thread"])}<p><strong>{esc((g["rank"] + " ") if g["rank"] else "")}{esc(g["name"])}</strong><br>{esc(g["role"])}<br>{esc(g["archetype"])} / {esc(g["package"])}</p></div></div><h3>Your hook</h3><p>{esc(g["hook"])}</p><h3>Your goal tonight</h3><p>{esc(g["goal"])}</p><h3>Where you\'d start</h3><ul>{"".join(f"<li>{esc(NAME(l))}</li>" for l in g["leads"])}</ul><h3>Your personal domino (secret)</h3><p class="ac-os-secret">{esc(g["domino"])}</p>') for g in D['pregens']]))
entries.append(dict(name='The Butterfly Cut — Handouts', pages=[dict(name=f'{h["id"]} {h["name"]}', html=f'<div class="ac-os-evidence"><span class="ac-os-evid">EVIDENCE {h["id"]}</span><h2>{esc(h["name"])}</h2><p>{esc(h["text"])}</p><p class="ac-os-small">Found at: {esc(NAME(h["place"]))}</p></div>') for h in D['handouts']]))
json.dump(entries, open(OUT, 'w'), indent=1, ensure_ascii=False)
print(len(entries), 'entries,', sum(len(e['pages']) for e in entries), 'pages')

# ------------------------------------------------------------------ the board (SVG)
W, H = 2400, 1500
bg, ink, dim = '#0d0f14', '#ece4cf', '#7d8794'
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="{bg}"/>',
     '<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
     '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#1a1f28" stroke-width="1"/></pattern></defs>',
     f'<rect width="{W}" height="{H}" fill="url(#grid)"/>',
     f'<text x="60" y="92" font-family="Georgia,serif" font-size="64" fill="{ink}" letter-spacing="2">THE BUTTERFLY CUT</text>',
     f'<text x="62" y="134" font-family="Courier New,monospace" font-size="24" fill="{dim}">BAY CITY 2384 · CASE WEB · BCPD NARCOTICS TASK FORCE · LICKTOWN</text>']
chain = ['BCP-SEAWALL-PUMPS', 'BCP-BAY-DAM-ACCESS', 'BCP-POWER-STATION', 'BCP-CRANE-YARD', 'BCP-CHOP-SHOPS', 'BCP-CONTAINER-HABS', 'BAY-PIT', 'BCS-LICKTOWN']
labels = ['Storm breaks the pumps', 'Dam takes the power', 'Dogpatch browns out', 'Container KX-4471 dropped', 'Vials fenced', 'Cut into Flutter', 'Sold on the street', '21:00 Moth goes glassed']
x0, y0, dy = 70, 210, 150
o.append(f'<text x="{x0}" y="{y0 - 22}" font-family="Courier New,monospace" font-size="22" fill="#ff7fb0" letter-spacing="3">THE DOMINOES</text>')
for i, (pid, lab) in enumerate(zip(chain, labels)):
    y = y0 + i * dy
    o.append(f'<g transform="rotate({-4 + (i % 3) * 3} {x0 + 230} {y + 50})"><rect x="{x0}" y="{y}" width="460" height="104" rx="6" fill="#ece4cf"/><rect x="{x0}" y="{y}" width="14" height="104" fill="#ff7fb0"/>'
             f'<text x="{x0 + 34}" y="{y + 44}" font-family="Georgia,serif" font-size="30" fill="#111">{esc(NAME(pid))}</text><text x="{x0 + 34}" y="{y + 82}" font-family="Courier New,monospace" font-size="20" fill="#444">{esc(lab)}</text></g>')
    if i < len(chain) - 1: o.append(f'<path d="M{x0 + 230},{y + 108} L{x0 + 230},{y + dy - 6}" stroke="#ff7fb0" stroke-width="4" stroke-dasharray="8 6"/>')
# thread lanes
lx, ly, lh = 640, 210, 150
o.append(f'<text x="{lx}" y="{ly - 22}" font-family="Courier New,monospace" font-size="22" fill="#ff7fb0" letter-spacing="3">THE THREADS · ONE PER PREGEN</text>')
pos = {}
for i, t in enumerate(D['threads']):
    y = ly + i * lh; c = t['colour']; g = next(x for x in D['pregens'] if x['id'] == t['pregen'])
    o.append(f'<text x="{lx}" y="{y + 30}" font-family="Georgia,serif" font-size="30" fill="{c}">{esc(t["name"])}</text><text x="{lx}" y="{y + 62}" font-family="Courier New,monospace" font-size="19" fill="{dim}">{esc(g["name"])}</text>')
    sx = lx + 380; step = (W - 230 - sx) / max(1, len(t['spine']) - 1)
    pts = []
    for j, s in enumerate(t['spine']):
        x = sx + j * step if len(t['spine']) > 1 else sx; yy = y + 40
        pts.append((x, yy)); pos.setdefault(s, []).append((x, yy, c))
    o.append(f'<polyline points="{" ".join(f"{x:.0f},{yy:.0f}" for x, yy in pts)}" fill="none" stroke="{c}" stroke-width="5" opacity=".75"/>')
    for (x, yy), s in zip(pts, t['spine']):
        nm = NAME(s); w = 18 + len(nm) * 12.5
        o.append(f'<rect x="{x - w / 2:.0f}" y="{yy - 22}" width="{w:.0f}" height="44" rx="22" fill="{bg}" stroke="{c}" stroke-width="4"/><text x="{x:.0f}" y="{yy + 8}" text-anchor="middle" font-family="Courier New,monospace" font-size="20" fill="{ink}">{esc(nm)}</text>')
# collisions: places on 2+ spines get a red string between their pills
for s, ps in pos.items():
    if len(ps) > 1:
        for a, b in zip(ps, ps[1:]):
            o.append(f'<path d="M{a[0]:.0f},{a[1] + 24:.0f} C{a[0] + 60:.0f},{(a[1] + b[1]) / 2:.0f} {b[0] - 60:.0f},{(a[1] + b[1]) / 2:.0f} {b[0]:.0f},{b[1] - 24:.0f}" fill="none" stroke="#ff3b3b" stroke-width="3" stroke-dasharray="6 6" opacity=".85"/>')
o.append(f'<text x="{W - 60}" y="{H - 40}" text-anchor="end" font-family="Courier New,monospace" font-size="20" fill="{dim}">red string = the same place on two threads · 81 places, 227 clues</text>')
o.append('</svg>')
open(SVG, 'w').write(''.join(o))
