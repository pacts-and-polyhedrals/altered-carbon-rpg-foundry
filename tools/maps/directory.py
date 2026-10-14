"""Bay City Travel Directory: every exit on every map, exactly where it leads and where you arrive.
Usage: python3 directory.py SYSTEM_DIR COLD_STORAGE_MAPS_JSON OUT_JSON
Writes journal entries (one per district plus an index and a Cold Storage entry) for the pack builder.
"""
import json, sys, html, re
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
def link_to(mid): return f'<strong>{esc(NAME(mid))}</strong>'

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
    for s in streets:
        if any(l['to'] == m['id'] for l in s['links'] if l['kind'] == 'door'): orig_by_street.setdefault(s['id'], []).append(m); break
index_rows = []
for s in sorted(streets, key=lambda m: (m['row'], m['col'])):
    pages = [dict(name=s['name'] + ' (street map)', html=street_page(s))]
    for m in orig_by_street.get(s['id'], []): pages.append(dict(name=m['name'], html=building_page(m, 'Original Bay City map')))
    for m in sorted(by_street.get(s['id'], []), key=lambda m: m['name']): pages.append(dict(name=m['name'], html=building_page(m, f'Place map on the {esc(s["name"])} block of the same name')))
    entries.append(dict(name=f'Bay City Directory — {s["name"]}', pages=pages))
    index_rows.append([f'<strong>{esc(s["name"])}</strong>', esc(s.get('district', '')), ', '.join(esc(m['name']) for m in orig_by_street.get(s['id'], []) + by_street.get(s['id'], [])) or '—'])
csp = [dict(name='Cold Storage maps', html='<p>These links exist only while the <strong>Cold Storage</strong> module is active. Each building\'s street exit leads back to its own entrance on the street map; the other exits follow the adventure\'s routes. The memory maps connect through Palimpsest Virtuality.</p>')]
for k, m in csm.items(): csp.append(dict(name=m['name'], html=building_page(m, 'Cold Storage module')))
entries.append(dict(name='Bay City Directory — Cold Storage', pages=csp))
entries.insert(0, dict(name='Bay City Directory — Index & Rules', pages=[dict(name='How travel works', html=intro),
    dict(name='Districts', html='<h2>Districts and their buildings</h2>' + table(index_rows, ['Street map', 'District', 'Buildings with maps']))]))
json.dump(entries, open(OUT, 'w'), indent=1)
print(len(entries), 'entries,', sum(len(e['pages']) for e in entries), 'pages')
