"""Bay City Travel Directory: every exit on every map, exactly where it leads and where you arrive.
Usage: python3 directory.py SYSTEM_DIR COLD_STORAGE_MAPS_JSON OUT_JSON
Writes journal entries (one per district plus an index and a Cold Storage entry) for the pack builder.
"""
import json, sys, html, re, os
sys.path.insert(0, os.path.dirname(__file__))
from bookfmt import sid, article, link, page_uuid
B, CSJ, OUT = sys.argv[1:4]
L = lambda f: json.load(open(f'{B}/data/{f}'))
streets = L('bay-city-street-atlas.json')['maps']; inter = L('bay-city-maps.json')['maps']; places = L('bay-city-places.json')['maps']
cs = L('cold-storage-links.json'); csm = {m['id']: m for m in json.load(open(CSJ))['maps']}
maps = {m['id']: m for m in streets + inter + places}
for k, m in csm.items(): maps[k] = dict(m, links=cs['scenes'].get(k, {}).get('links', []), coldStorage=True)
esc = lambda s: html.escape(str(s))
NAME = lambda mid: maps[mid]['name'] if mid in maps else mid
COMPASS = {'N': 'north', 'S': 'south', 'E': 'east', 'W': 'west'}

def zone_at(m, p):
    for z in m.get('zones', []):
        r = z['rect']
        if r[0] <= p[0] <= r[0] + r[2] and r[1] <= p[1] <= r[1] + r[3]: return z['name']
    return '—'
def centre(r): return [r[0] + r[2] / 2, r[1] + r[3] / 2]
def arrive(l):
    t = maps.get(l['to'])
    if not t: return '—'
    if l.get('edge'):
        back = next((b for b in t['links'] if b.get('edge') and b['to'] != None and b.get('toEdge') == l['edge'] and b.get('slot') == l.get('slot')), None) \
            or next((b for b in t['links'] if b.get('edge') == {'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}[l['edge']]), None)
        return zone_at(t, centre(back['rect'])) if back else f"{COMPASS[{'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E'}[l['edge']]]} edge"
    return zone_at(t, l['land'])
def table(rows, head):
    th = ''.join(f'<th>{h}</th>' for h in head)
    tr = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows)
    return f'<table class="ac-directory"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'
PACK, TAG = 'bay-city-directory', 'bay-city-directory'
PAGEID = {}   # map id -> (entry key, page id)
def link_to(mid):
    if mid in PAGEID: ek, pid = PAGEID[mid]; return link(page_uuid(PACK, sid(TAG, 'entry', ek), pid), NAME(mid)) + f' @ACMap[{mid}]{{map}}' if not mid.startswith('SCENE-') else link(page_uuid(PACK, sid(TAG, 'entry', ek), pid), NAME(mid))
    return f'<strong>{esc(NAME(mid))}</strong>'

def street_page(m):
    out = [f'<h2>{esc(m["name"])}</h2><p class="ac-muted">{esc(m.get("district", ""))} · grid column {m.get("col")}, row {m.get("row")}</p>']
    edges = [l for l in m['links'] if l.get('edge')]
    if edges:
        out.append('<h3>Roads off the map</h3>' + table([[esc(zone_at(m, centre(l['rect']))), COMPASS[l['edge']], link_to(l['to']), esc(arrive(l))] for l in edges],
                                                        ['Exit strip (zone)', 'Edge', 'Leads to', 'You arrive in']))
    doors = [l for l in m['links'] if l['kind'] == 'door']
    if doors:
        out.append('<h3>Building entrances</h3>' + table([[esc(l.get('at') or ''), esc(zone_at(m, centre(l['rect']))), link_to(l['to']), esc(arrive(l))] for l in doors],
                                                         ['Block', 'Entrance on (zone)', 'Leads to', 'You arrive in']))
    csd = cs['streetDoors'].get(m['id'], [])
    if csd:
        out.append('<h3>Cold Storage entrances <small>(only while the Cold Storage module is active)</small></h3>' + table(
            [[esc(d['at']), esc(zone_at(m, centre(d['rect']))), f'<strong>{esc(d["toName"])}</strong>', esc(zone_at(csm[d['to']], d['land']))] for d in csd],
            ['Block', 'Entrance on (zone)', 'Leads to', 'You arrive in']))
    return '\n'.join(out)
def building_page(m, note=''):
    rows = []
    for l in m.get('links', []):
        z = zone_at(m, centre(l['rect']))
        tag = l.get('key') or (l.get('arriveRoad') or l.get('toName') or '').upper()
        rows.append([esc(tag), esc(z), link_to(l['to']), esc(arrive(l))])
    head = f'<h2>{esc(m["name"])}</h2>' + (f'<p class="ac-muted">{note}</p>' if note else '')
    zones = ', '.join(esc(z['name']) for z in m.get('zones', []))
    return head + f'<p><strong>Zones:</strong> {zones}</p>' + ('<h3>Exits</h3>' + table(rows, ['Exit tag', 'In zone', 'Leads to', 'You arrive in']) if rows else '<p><em>No exits.</em></p>')

entries = []
intro = """<h2>How travel works</h2>
<ul>
<li><strong>Party at an exit.</strong> When every player character on a map is gathered at an exit (within two squares of its strip), the GM is asked where they go. One button per destination shows the map and the zone they arrive in. Choosing one moves the whole party and changes the scene for everyone. <em>Setting: Ask the GM when the party reaches an exit.</em></li>
<li><strong>Vehicles.</strong> A vehicle crosses with everyone aboard. Into a building, the riders get out and walk in, and the vehicle is parked at that building's street entrance.</li>
<li><strong>Self-driving cars.</strong> The Autocab, the limousine and any vehicle set to AI let anyone aboard pick a destination from the travel list (token HUD).</li>
<li><strong>One at a time.</strong> Right-click a token at an exit → Go to …, or turn on <em>Walk into buildings automatically</em> to send each character through the moment they step into an entrance.</li>
<li><strong>Names.</strong> Every street block with an entrance carries exactly the name of the map it opens into. A second entrance to the same map is named <em>Map · entrance</em>. Exit tags inside buildings name the street section you come out on.</li>
</ul>"""
by_street = {}
for p in places: by_street.setdefault(p['street'], []).append(p)
orig_by_street = {}
for m in inter:
    for s_ in streets:
        if any(l['to'] == m['id'] for l in s_['links'] if l['kind'] == 'door'): orig_by_street.setdefault(s_['id'], []).append(m); break
ordered = sorted(streets, key=lambda m: (m['row'], m['col']))
# register every page id first so any page can link to any other
for s_ in ordered:
    ek = 'district:' + s_['id']
    for m in [s_] + orig_by_street.get(s_['id'], []) + sorted(by_street.get(s_['id'], []), key=lambda m: m['name']): PAGEID[m['id']] = (ek, sid(TAG, 'page', ek, m['id']))
for k in csm: PAGEID[k] = ('cold-storage', sid(TAG, 'page', 'cold-storage', k))
def strip_head(h):
    h = re.sub(r'^<h2>.*?</h2>', '', h, count=1)
    return h.replace('<h3>', '<h2>').replace('</h3>', '</h2>').replace('<p class="ac-muted">', '<p><em>').replace('</p><p><strong>Zones', '</em></p><p><strong>Zones', 1)
KICK = 'BAY CITY TRAVEL DIRECTORY // GM REFERENCE // '
def mk(m, html_, kind):
    ek, pid = PAGEID[m['id']]
    chips = '' if m['id'].startswith('SCENE-') else f'<div class="ac-chip-row">@ACMap[{m["id"]}]{{Open {m["name"]}}}</div>'
    return dict(_id=pid, name=m['name'] + (' (street map)' if kind == 'STREET MAP' else ''), html=article('reference', KICK + kind + ' // ' + str(m.get('code', m['id'])), m['name'], chips + strip_head(html_)), flags={'altered-carbon-rpg': {'directoryMap': m['id']}})
entries = []
index_rows = []
for s_ in ordered:
    ek = 'district:' + s_['id']
    pages = [mk(s_, street_page(s_), 'STREET MAP')]
    for m in orig_by_street.get(s_['id'], []): pages.append(mk(m, building_page(m, 'Original Bay City map'), 'BUILDING'))
    for m in sorted(by_street.get(s_['id'], []), key=lambda m: m['name']): pages.append(mk(m, building_page(m, f'Place map on the {esc(s_["name"])} block of the same name'), 'PLACE'))
    entries.append(dict(_id=sid(TAG, 'entry', ek), name=f'Bay City Directory — {s_["name"]}', pages=pages, flags={'altered-carbon-rpg': {'book': True, 'bookCategory': 'reference'}}))
    index_rows.append([link_to(s_['id']), esc(s_.get('district', '')), ' '.join(link_to(m['id']) for m in orig_by_street.get(s_['id'], []) + by_street.get(s_['id'], [])) or '—'])
csp = [dict(_id=sid(TAG, 'page', 'cold-storage', 'intro'), name='Cold Storage maps', html=article('reference', KICK + 'COLD STORAGE', 'Cold Storage maps', '<p>These links exist only while the <strong>Cold Storage</strong> module is active. Each building\'s street exit leads back to its own entrance on the street map; the other exits follow the adventure\'s routes. The memory maps connect through Palimpsest Virtuality.</p>'), flags={})]
for k, m in csm.items(): csp.append(mk(dict(m, id=k), building_page(m, 'Cold Storage module'), 'COLD STORAGE'))
entries.append(dict(_id=sid(TAG, 'entry', 'cold-storage'), name='Bay City Directory — Cold Storage', pages=csp, flags={'altered-carbon-rpg': {'book': True, 'bookCategory': 'reference'}}))
entries.insert(0, dict(_id=sid(TAG, 'entry', 'index'), name='Bay City Directory — Index & Rules', flags={'altered-carbon-rpg': {'book': True, 'bookCategory': 'reference'}}, pages=[
    dict(_id=sid(TAG, 'page', 'index', 'rules'), name='How travel works', html=article('primer', KICK + 'RULES', 'How travel works', strip_head(intro)), flags={}),
    dict(_id=sid(TAG, 'page', 'index', 'districts'), name='Districts', html=article('reference', KICK + 'INDEX', 'Districts and their buildings', table(index_rows, ['Street map', 'District', 'Buildings with maps'])), flags={})]))
json.dump(entries, open(OUT, 'w'), indent=1)
print(len(entries), 'entries,', sum(len(e['pages']) for e in entries), 'pages')
