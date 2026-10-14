"""The Butterfly Cut GM book in the teal case-file format, every reference live.
Usage: python3 journal.py SYSTEM_DIR OUT_ENTRIES_JSON OUT_BOARD_SVG"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from bookfmt import *
B, OUT, SVG = sys.argv[1:4]
D = json.load(open(f'{B}/data/oneshot-butterfly-cut.json'))
MAPS = {m['id']: m for f in ['bay-city-street-atlas.json', 'bay-city-maps.json', 'bay-city-places.json'] for m in json.load(open(f'{B}/data/{f}'))['maps']}
PACK, APACK, TAG = 'oneshot-butterfly-journal', 'oneshot-butterfly-actors', 'butterfly-cut'
P = {p['id']: p for p in D['places']}; T = {t['id']: t for t in D['threads']}; N = {n['id']: n for n in D['npcs']}
NAME = lambda i: P[i]['name'] if i in P else i
IMG = f'systems/{SYS}/assets/oneshot/butterfly-cut'
TOK = lambda n: f'systems/{SYS}/assets/tokens/people/npc-' + ''.join(c if c.isalnum() else '-' for c in n.lower()).strip('-').replace('--', '-') + '.webp'
ORDER = ['BCS-LICKTOWN', 'BCS-DOGPATCH', 'BCS-MISSION', 'BCS-FELL', 'BCS-CIVIC', 'BCS-OLD-DT-N', 'BCS-OLD-DT-S', 'BCS-ALCATRAZ', 'BCS-WHARF',
         'BCS-GG-SOUTH', 'BCS-GG-NORTH', 'BCS-MARINA', 'BCS-PANHANDLE', 'BCS-TWIN-PEAKS']
KICK = 'THE BUTTERFLY CUT // GM ONLY // '

# ------------------------------------------------------------------ ids first, so every page can link to every other
E = {}            # entry key -> entry id
PG = {}           # page key -> (entry key, page id)
def eid(key): E.setdefault(key, sid(TAG, 'entry', key)); return E[key]
def pid(ekey, pkey): eid(ekey); PG[pkey] = (ekey, sid(TAG, 'page', ekey, pkey)); return PG[pkey][1]
def pref(pkey, label=None):
    ek, p = PG[pkey]; return link(page_uuid(PACK, E[ek], p), label or pkey)
def place_link(i, label=None): return pref('place:' + i, label or NAME(i))
def thread_link(t): return pref('thread:' + t, T[t]['name'])
import hashlib
def aid_pc(i): return hashlib.sha1(('butterfly:pc:' + i).encode()).hexdigest()[:16]
def aid_npc(i): return hashlib.sha1(('butterfly:npc:' + i).encode()).hexdigest()[:16]
def actor_link(n):
    for g in D['pregens']:
        if g['name'] == n: return link(actor_uuid(APACK, aid_pc(g['id'])), n)
    for x in D['npcs']:
        if x['name'] == n: return link(actor_uuid(APACK, aid_npc(x['id'])), n)
    return esc(n)

START, WEB, THREADS, NPCS, PCS, HANDOUTS = 'start', 'web', 'threads', 'npcs', 'pregens', 'handouts'
for k in ['intro', 'run', 'opening', 'clock', 'endings', 'chain', 'crossover']: pid(START, k)
pid(WEB, 'board'); pid(WEB, 'index')
for t in D['threads']: pid(THREADS, 'thread:' + t['id'])
for s in ORDER:
    pid('district:' + s, 'place:' + s)
    for p in D['places']:
        if p['kind'] != 'street' and p['street'] == s: pid('district:' + s, 'place:' + p['id'])
for n in D['npcs']: pid(NPCS, 'npc:' + n['id'])
for g in D['pregens']: pid(PCS, 'pc:' + g['id'])
for h in D['handouts']: pid(HANDOUTS, 'handout:' + h['id'])
missing = [p['id'] for p in D['places'] if 'place:' + p['id'] not in PG]
assert not missing, missing

def handout_show(h): ek, p = PG['handout:' + h['id']]; return f'@ACShow[{page_uuid(PACK, E[ek], p)}]{{Show {h["id"]} to players}}'
def tag(t): return f'<span class="ac-tag" style="--c:{T[t]["colour"]}">{esc(T[t]["name"])}</span>'
def code(i): return MAPS[i].get('code', i)

# ------------------------------------------------------------------ pages
def place_page(p):
    inbound = sorted({q['id'] for q in D['places'] for c in q['clues'] if c['to'] == p['id']}, key=NAME)
    clock = [(i, c) for i, c in enumerate(D['clock']) if c['place'] == p['id']]
    hand = [h for h in D['handouts'] if h['place'] == p['id']]
    back = [b for b in D['backstory'] if b['place'] == p['id']]
    src = f'BC-{code(p["id"])}'
    b = [f'<div class="ac-meta"><span class="ac-role">{esc(p["role"])}</span> {tag(p["thread"])} <span>{esc(p["district"])} · {esc(p["zone"])}</span> <span>{pref("thread:" + p["thread"], "Thread notes")}</span></div>']
    chips = [f'@ACMap[{p["id"]}]{{Open {p["name"]}}}']
    if p['kind'] != 'street': chips.append(f'@ACMap[{p["street"]}]{{Street outside: {NAME(p["street"])}}}')
    b.append('<div class="ac-chip-row">' + ' '.join(chips) + '</div>')
    b.append(f'<h2>What is here</h2><p>{esc(p["scene"])}</p>')
    b.append(f'<h2>The mission</h2><p><strong>{esc(p["mission"])}</strong></p>')
    if p.get('check'): b.append(f'<h2>Checks</h2><p>{mark_bare(mark_checks(esc(p["check"]), src), src)}</p>')
    if p.get('npc'):
        n = N[p['npc']]
        b.append(f'<h2>Who is here</h2><div class="ac-person"><img src="{TOK(n["name"])}" width="72" height="72" alt=""><div><p><strong>{actor_link(n["name"])}</strong>, {esc(n["role"])}. {esc(n["look"])}</p><p><em>Wants:</em> {esc(n["wants"])}</p><p><em>Secret:</em> {esc(n["secret"])}</p><p>{pref("npc:" + n["id"], "Full NPC notes")}</p></div></div>')
    b.append('<h2>Where it leads</h2><ul class="ac-clues">' + ''.join(f'<li>{place_link(c["to"])} — {esc(c["text"])}</li>' for c in p['clues']) + '</ul>')
    if inbound: b.append('<h2>Pointed to from</h2><p>' + ' '.join(place_link(i) for i in inbound) + '</p>')
    if hand: b.append('<h2>Evidence here</h2><ul>' + ''.join(f'<li>{pref("handout:" + h["id"], h["id"] + " " + h["name"])} {handout_show(h)}</li>' for h in hand) + '</ul>')
    if back: b.append('<h2>What already happened here</h2><ul>' + ''.join(f'<li><span class="ac-day">DAY {b_["day"]}</span> {esc(b_["text"])}</li>' for b_ in back) + '</ul>')
    if clock: b.append('<h2>Tonight</h2><ul>' + ''.join(f'<li><strong>{c["hour"]} · {esc(c["title"])}.</strong> {esc(c["event"])}' + (f' <em>Prevented if:</em> {esc(c["prevent"])}' if c['prevent'] else '') + f' {pref("clock", "Night console")}</li>' for i, c in clock) + '</ul>')
    if p.get('ignored'): b.append(f'<div class="ac-alert"><strong>If nobody comes:</strong> {esc(p["ignored"])}</div>')
    kind = {'street': 'STREET MAP', 'building': 'BUILDING', 'place': 'PLACE'}[p['kind']]
    return dict(_id=PG['place:' + p['id']][1], name=p['name'] + (' (street)' if p['kind'] == 'street' else ''),
                html=article('place', f'{KICK}{kind} // {code(p["id"])}', p['name'], '\n'.join(b)), flags={SYS: {'oneshotPlace': p['id']}})

def page(key, name, cat, kick, body, title=None, flags=None):
    return dict(_id=PG[key][1], name=name, html=article(cat, KICK + kick, title or name, body), flags=flags or {})

entries = []
def entry(key, name, pages, cat='gm'):
    entries.append(dict(_id=E[key], name=name, pages=pages, flags={SYS: {'book': True, 'bookCategory': cat}}))

# 00 Start here
pregen_list = ''.join(f'<tr><td>{actor_link(g["name"])}</td><td>{esc(g["role"])}</td><td>{thread_link(g["thread"])}</td><td>{" ".join(place_link(l) for l in g["leads"])}</td><td>{pref("pc:" + g["id"], "Handout")}</td></tr>' for g in D['pregens'])
intro = (f'<img class="ac-board" src="{IMG}/web.webp" alt="The case web"><p><strong>{esc(D["meta"]["tagline"])}</strong></p>'
         f'<p>{esc(D["meta"]["timeline_note"])} Length: {D["meta"]["length"]}. Players: {D["meta"]["players"]}.</p>'
         f'<blockquote><p>{D["pitch"]}</p></blockquote>{D["premise"]}'
         '<h2>Your first preparation</h2><p>Read this page, ' + pref('run', 'How to run it') + ', ' + pref('chain', 'The chain of dominoes') + ' and ' + pref('board', 'The case web') + '. Keep ' + pref('clock', 'the Night Console') + ' open during play; it tracks the hour, fires the events to you in chat, and scores the ending. Every place in Bay City has a case-file page, and every page links onward.</p>'
         '<h2>The pregens</h2><table><thead><tr><th>Pregen</th><th>Role</th><th>Thread</th><th>Starts at</th><th></th></tr></thead><tbody>' + pregen_list + '</tbody></table>'
         '<h2>Begin</h2><p>Move to ' + pref('opening', 'Opening scene: 16th Street, 21:00') + '.</p>')
run = mark_checks(D['howToRun'].replace('<h3>', '<h2>').replace('</h3>', '</h2>'), 'B01') + (
    '<h2>Setting up in Foundry</h2><ol><li>In <strong>Install / Update Content</strong>, press <strong>Set up The Butterfly Cut</strong>: the GM book and characters are imported, links are pointed at the world copies, and every Bay City map gets GM-only case pins.</li>'
    '<li>Assign the pregens to players (each has a ' + pref('pc:PG01', 'handout') + ' you can show with one click).</li>'
    '<li>Open @ACMap[BCS-LICKTOWN]{Licktown} and activate it (shift-click the chip).</li>'
    '<li>Run the night from ' + pref('clock', 'the Night Console') + '.</li></ol>'
    '<h2>Live text in this book</h2><ul><li><strong>Skill chips</strong> open GM Control with the check filled in.</li><li><strong>Map chips</strong> open that map (imported if needed); shift-click activates it for everyone.</li><li><strong>Show chips</strong> show a handout to every player.</li><li>Names of people, places and threads are links.</li></ul>')
open_html = ('<div class="ac-chip-row">@ACMap[BCS-LICKTOWN]{Open Licktown} @ACMap[BAY-MARKET]{Lower Bay Market}</div>'
             '<blockquote><p>Rain. Neon bleeding into puddles on 16th Street. A crowd has made a circle in the road, and in the middle of it a kid in a yellow raincoat is standing perfectly still. Eyes open. Breathing. Nobody home.</p><p>A vendor is screaming for someone to help. At the edge of the crowd a dealer in a green hood is easing away towards the Lower Bay Market. A BCPD cruiser slows, its driver sees who it is, and it drives on.</p></blockquote>'
             '<h2>Getting the pregens there</h2><p>Everyone is in Licktown tonight for their own reason: the task force was called out (' + actor_link('Marisol Okafor-Reyes') + ', ' + actor_link('Teo Vashti') + '), ' + actor_link('Kesh Arlo') + ' cannot reach his handler and comes himself, ' + actor_link('Hollis Fenn') + ' is on call for tox, ' + actor_link('Ines “Rook” Calloway') + ' is in the van, ' + actor_link('Danny “Two-Coats” Mbeki') + ' was meeting Marisol, ' + actor_link('Juniper Vance') + ' is riding along with "her" task force, and ' + actor_link('Sunny Achterberg') + ' heard it on the scanner.</p>'
             '<h2>First questions</h2><p>Ask each player: <em>What do you notice first about Moth, and what do you do?</em> Then hand out the personal-domino handouts privately and start the clock at 21:00.</p>'
             '<p>The full case file for the street is ' + place_link('BCS-LICKTOWN', 'Licktown (street)') + '. The first victim is ' + actor_link('Moth') + '.</p>')
clock_html = ('@ACClock[butterfly-cut]<h2>Reference</h2><p>Advance one hour after each major scene. An event fires unless the players prevented it; mark it prevented first. The console whispers you each event as it happens.</p>'
              '<table><thead><tr><th>Hour</th><th>Event</th><th>Where</th><th>Prevented if</th></tr></thead><tbody>' + ''.join(f'<tr><td><strong>{c["hour"]}</strong></td><td><strong>{esc(c["title"])}.</strong> {esc(c["event"])}</td><td>{place_link(c["place"])}</td><td>{esc(c["prevent"]) or "—"}</td></tr>' for c in D['clock']) + '</tbody></table>')
end_html = ('<p>Tick the pressure points on ' + pref('clock', 'the Night Console') + ' as the players resolve them; it shows the ending.</p><table><thead><tr><th>Pressure point</th><th>Resolved</th><th>Left standing</th></tr></thead><tbody>' + ''.join(f'<tr><td><strong>{esc(x["name"])}</strong></td><td>{esc(x["good"])}</td><td>{esc(x["bad"])}</td></tr>' for x in D['pressure']) + '</tbody></table><h2>Endings</h2>' + ''.join(f'<p><strong>{esc(e["score"])} — {esc(e["name"])}.</strong> {esc(e["text"])}</p>' for e in D['endings']))
chain_html = '<p>What happened before the session, in order. Every line is a place the players can visit and a cause they can prove.</p><ol class="ac-chain">' + ''.join(f'<li><span class="ac-day">DAY {b["day"]}</span> {place_link(b["place"])}: {esc(b["text"])}</li>' for b in D['backstory']) + '</ol>'
cross_html = '<p>Only if your world is also running <em>Cold Storage: The Faces We Left Behind</em>. Both stories happen in the same weeks of 2384; neither depends on the other.</p>' + ''.join(f'<h2>{esc(c["name"])}</h2><p>{esc(c["text"])}</p>' for c in D['crossover'])
entry(START, 'The Butterfly Cut — B00 Start Here', [
    page('intro', 'Start Here: The Night in One Page', 'gm', 'ADVENTURE BOOK // B00', intro),
    page('run', 'How to Run It', 'gm', 'ADVENTURE BOOK // B01', run),
    page('opening', 'Opening Scene: 16th Street, 21:00', 'gm', 'SCENE // B02', open_html),
    page('clock', 'Night Console', 'gm', 'RUNNING CONSOLE // B03', clock_html),
    page('endings', 'Pressure Points and Endings', 'gm', 'ADVENTURE BOOK // B04', end_html),
    page('chain', 'The Chain of Dominoes', 'reference', 'BACKSTORY // B05', chain_html),
    page('crossover', 'Cold Storage Crossover', 'reference', 'CROSSOVER // B06', cross_html)])

# 01 Case web
rows = ''.join(f'<tr><td>{place_link(p["id"])}</td><td>{esc(p["district"])}</td><td>{esc(p["role"])}</td><td>{tag(p["thread"])}</td><td>{" ".join(place_link(c["to"]) for c in p["clues"])}</td></tr>'
               for p in sorted(D['places'], key=lambda p: (ORDER.index(p['street']) if p['street'] in ORDER else 99, p['kind'] != 'street', p['name'])))
entry(WEB, 'The Butterfly Cut — B10 Case Web', [
    page('board', 'The Case Web', 'reference', 'CASE WEB // B10', f'<img class="ac-board" src="{IMG}/web.webp" alt="The case web"><p>Left: the chain of dominoes before the session. Right: the eight threads, one per pregen. Red string marks a place on two threads, where the investigations collide.</p><h2>Threads</h2><p>' + ' '.join(thread_link(t['id']) for t in D['threads']) + '</p>'),
    page('index', 'Every Place at a Glance', 'reference', 'CASE WEB // B11', '<table><thead><tr><th>Place</th><th>District</th><th>Role</th><th>Thread</th><th>Leads to</th></tr></thead><tbody>' + rows + '</tbody></table>')], 'reference')

# 02 Threads
tp = []
for t in D['threads']:
    g = next(x for x in D['pregens'] if x['id'] == t['pregen'])
    steps = ''.join(f'<li>{place_link(s)} @ACMap[{s}]{{map}} — {esc(P[s]["mission"])}</li>' for s in t['spine'])
    places = [p for p in D['places'] if p['thread'] == t['id']]
    body = (f'<div class="ac-meta">{tag(t["id"])} <span>Pregen: {actor_link(g["name"])}</span></div><p><strong>{esc(t["question"])}</strong></p><p>{esc(t["summary"])}</p>'
            f'<h2>The spine</h2><ol>{steps}</ol><h2>Every place on this thread</h2><p>' + ' '.join(place_link(p['id']) for p in places) + '</p>')
    tp.append(page('thread:' + t['id'], t['name'], 'thread', 'THREAD // ' + t['id'].upper(), body))
entry(THREADS, 'The Butterfly Cut — B20 Threads', tp)

# District case files
for i, s in enumerate(ORDER):
    on = sorted([p for p in D['places'] if p['kind'] != 'street' and p['street'] == s], key=lambda p: (p['kind'] != 'building', p['name']))
    entry('district:' + s, f'The Butterfly Cut — B{30 + i} {NAME(s)}', [place_page(P[s])] + [place_page(p) for p in on], 'reference')

# NPCs, pregens, handouts
entry(NPCS, 'The Butterfly Cut — B50 NPCs', [page('npc:' + n['id'], n['name'], 'npc', 'NPC // ' + n['id'],
      f'<div class="ac-person"><img src="{TOK(n["name"])}" width="110" height="110" alt=""><div><p>{tag(n["thread"])}</p><p><strong>{actor_link(n["name"])}</strong>, {esc(n["role"])}.</p><p>Found at {place_link(n["place"])} @ACMap[{n["place"]}]{{map}}</p></div></div>'
      f'<h2>Look</h2><p>{esc(n["look"])}</p><h2>Wants</h2><p>{esc(n["wants"])}</p><h2>How they play</h2><p>{esc(n["tactic"])}</p><div class="ac-secret"><strong>Secret:</strong> {esc(n["secret"])}</div>') for n in D['npcs']])
pc_pages = []
for g in D['pregens']:
    ek, p_ = PG['pc:' + g['id']]
    body = (f'<div class="ac-chip-row">@ACShow[{page_uuid(PACK, E[ek], p_)}]{{Show to players}}</div>'
            f'<div class="ac-person"><img src="{TOK(g["name"])}" width="110" height="110" alt=""><div><p>{tag(g["thread"])}</p><p><strong>{esc((g["rank"] + " ") if g["rank"] else "")}{actor_link(g["name"])}</strong><br>{esc(g["role"])}<br>{esc(g["archetype"])} / {esc(g["package"])}</p></div></div>'
            f'<h2>Your hook</h2><p>{esc(g["hook"])}</p><h2>Your goal tonight</h2><p>{esc(g["goal"])}</p><h2>Where you would start</h2><ul>' + ''.join(f'<li>{esc(NAME(l))}</li>' for l in g['leads']) + '</ul>'
            f'<div class="ac-secret"><strong>Your personal domino (secret):</strong> {esc(g["domino"])}</div>')
    pc_pages.append(page('pc:' + g['id'], g['name'], 'personal', 'PREGEN HANDOUT // ' + g['id'], body))
entry(PCS, 'The Butterfly Cut — B60 Pregen Handouts', pc_pages, 'personal')
ho = []
for h in D['handouts']:
    ek, p_ = PG['handout:' + h['id']]
    ho.append(dict(_id=p_, name=f'{h["id"]} {h["name"]}', html=article('handout', f'BCPD CASE FILE // EVIDENCE // {h["id"]}', h['name'],
              f'<p>{esc(h["text"])}</p><p><small>Recovered at: {esc(NAME(h["place"]))}</small></p><p>@ACShow[{page_uuid(PACK, E[ek], p_)}]{{Show to players}}</p>'), flags={}))
entry(HANDOUTS, 'The Butterfly Cut — B70 Evidence Handouts', ho, 'handout')

json.dump(entries, open(OUT, 'w'), indent=1, ensure_ascii=False)
print(len(entries), 'entries,', sum(len(e['pages']) for e in entries), 'pages')

# ------------------------------------------------------------------ the board (SVG), unchanged design
W, H = 2400, 1500
bg, ink, dim = '#0d0f14', '#ece4cf', '#7d8794'
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="{bg}"/>',
     '<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#12262c" stroke-width="1"/></pattern></defs>',
     f'<rect width="{W}" height="{H}" fill="url(#grid)"/>',
     f'<text x="60" y="92" font-family="Georgia,serif" font-size="64" fill="{ink}" letter-spacing="2">THE BUTTERFLY CUT</text>',
     f'<text x="62" y="134" font-family="Courier New,monospace" font-size="24" fill="#78ecf3">BAY CITY 2384 · CASE WEB · BCPD NARCOTICS TASK FORCE · LICKTOWN</text>']
chain = ['BCP-SEAWALL-PUMPS', 'BCP-BAY-DAM-ACCESS', 'BCP-POWER-STATION', 'BCP-CRANE-YARD', 'BCP-CHOP-SHOPS', 'BCP-CONTAINER-HABS', 'BAY-PIT', 'BCS-LICKTOWN']
labels = ['Storm breaks the pumps', 'Dam takes the power', 'Dogpatch browns out', 'Container KX-4471 dropped', 'Vials fenced', 'Cut into Flutter', 'Sold on the street', '21:00 Moth goes glassed']
x0, y0, dy = 70, 210, 150
o.append(f'<text x="{x0}" y="{y0 - 22}" font-family="Courier New,monospace" font-size="22" fill="#78ecf3" letter-spacing="3">THE DOMINOES</text>')
for i, (pid_, lab) in enumerate(zip(chain, labels)):
    y = y0 + i * dy
    o.append(f'<g transform="rotate({-4 + (i % 3) * 3} {x0 + 230} {y + 50})"><rect x="{x0}" y="{y}" width="460" height="104" rx="6" fill="#ece4cf"/><rect x="{x0}" y="{y}" width="14" height="104" fill="#32c7d6"/>'
             f'<text x="{x0 + 34}" y="{y + 44}" font-family="Georgia,serif" font-size="30" fill="#111">{esc(NAME(pid_))}</text><text x="{x0 + 34}" y="{y + 82}" font-family="Courier New,monospace" font-size="20" fill="#444">{esc(lab)}</text></g>')
    if i < len(chain) - 1: o.append(f'<path d="M{x0 + 230},{y + 108} L{x0 + 230},{y + dy - 6}" stroke="#32c7d6" stroke-width="4" stroke-dasharray="8 6"/>')
lx, ly, lh = 640, 210, 150
o.append(f'<text x="{lx}" y="{ly - 22}" font-family="Courier New,monospace" font-size="22" fill="#78ecf3" letter-spacing="3">THE THREADS · ONE PER PREGEN</text>')
pos = {}
for i, t in enumerate(D['threads']):
    y = ly + i * lh; c = t['colour']; g = next(x for x in D['pregens'] if x['id'] == t['pregen'])
    o.append(f'<text x="{lx}" y="{y + 30}" font-family="Georgia,serif" font-size="30" fill="{c}">{esc(t["name"])}</text><text x="{lx}" y="{y + 62}" font-family="Courier New,monospace" font-size="19" fill="{dim}">{esc(g["name"])}</text>')
    sx = lx + 380; step = (W - 230 - sx) / max(1, len(t['spine']) - 1)
    pts = []
    for j, s in enumerate(t['spine']):
        x = sx + j * step; yy = y + 40; pts.append((x, yy)); pos.setdefault(s, []).append((x, yy, c))
    o.append(f'<polyline points="{" ".join(f"{x:.0f},{yy:.0f}" for x, yy in pts)}" fill="none" stroke="{c}" stroke-width="5" opacity=".75"/>')
    for (x, yy), s in zip(pts, t['spine']):
        nm = NAME(s); w = 18 + len(nm) * 12.5
        o.append(f'<rect x="{x - w / 2:.0f}" y="{yy - 22}" width="{w:.0f}" height="44" rx="22" fill="{bg}" stroke="{c}" stroke-width="4"/><text x="{x:.0f}" y="{yy + 8}" text-anchor="middle" font-family="Courier New,monospace" font-size="20" fill="{ink}">{esc(nm)}</text>')
for s, ps in pos.items():
    for a, b_ in zip(ps, ps[1:]):
        o.append(f'<path d="M{a[0]:.0f},{a[1] + 24:.0f} C{a[0] + 60:.0f},{(a[1] + b_[1]) / 2:.0f} {b_[0] - 60:.0f},{(a[1] + b_[1]) / 2:.0f} {b_[0]:.0f},{b_[1] - 24:.0f}" fill="none" stroke="#ff3b3b" stroke-width="3" stroke-dasharray="6 6" opacity=".85"/>')
o.append(f'<text x="{W - 60}" y="{H - 40}" text-anchor="end" font-family="Courier New,monospace" font-size="20" fill="{dim}">red string = the same place on two threads · 81 places, 227 clues</text></svg>')
open(SVG, 'w').write(''.join(o))
