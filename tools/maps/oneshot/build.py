"""Merge and validate The Butterfly Cut. Usage: python3 build.py SYSTEM_DIR"""
import json, sys
from butterfly_core import *
from butterfly_places import PLACES
B = sys.argv[1]
L = lambda f: json.load(open(f'{B}/data/{f}'))
maps = {m['id']: m for f in ['bay-city-street-atlas.json', 'bay-city-maps.json', 'bay-city-places.json'] for m in L(f)['maps']}
ids = [p['id'] for p in PLACES]
errs = []
dup = {i for i in ids if ids.count(i) > 1}
if dup: errs.append(f'duplicate places {dup}')
missing = set(maps) - set(ids); extra = set(ids) - set(maps)
if missing: errs.append(f'maps without a place {sorted(missing)}')
if extra: errs.append(f'unknown places {sorted(extra)}')
npcs = {n['id'] for n in NPCS}; threads = {t['id'] for t in THREADS}
for p in PLACES:
    m = maps.get(p['id'])
    if m and p['zone'] not in [z['name'] for z in m['zones']]: errs.append(f"{p['id']}: zone {p['zone']!r}")
    for c in p['clues']:
        if c['to'] not in maps: errs.append(f"{p['id']}: clue to {c['to']}")
        if c['to'] == p['id']: errs.append(f"{p['id']}: clue to itself")
    if p['npc'] and p['npc'] not in npcs: errs.append(f"{p['id']}: npc {p['npc']}")
    if p['thread'] not in threads: errs.append(f"{p['id']}: thread {p['thread']}")
    if not p['clues']: errs.append(f"{p['id']}: no clues")
for t in THREADS:
    for s in t['spine']:
        if s not in maps: errs.append(f"thread {t['id']}: {s}")
for x in CLOCK + BACKSTORY + HANDOUTS:
    if x['place'] not in maps: errs.append(f"{x}: place")
for n in NPCS:
    if n['place'] not in maps: errs.append(f"{n['id']}: place")
for g in PREGENS:
    for s in g['leads']:
        if s not in maps: errs.append(f"{g['id']}: lead {s}")
bag = {b['id'] for b in L('baggage-catalog.json')['entries']}
for g in PREGENS:
    for b in g['baggage']:
        if b not in bag: errs.append(f"{g['id']}: baggage {b}")
advids = {a['id'] for a in L('adversary-catalog.json')['records']}
for n in NPCS:
    if n.get('base') and n['base'] not in advids: errs.append(f"{n['id']}: base {n['base']} (have {sorted(advids)[:12]})")
# reachability from the start through clues
seen, todo = set(), [META['start']]
by = {p['id']: p for p in PLACES}
while todo:
    x = todo.pop()
    if x in seen or x not in by: continue
    seen.add(x); todo += [c['to'] for c in by[x]['clues']]
    st = maps[x].get('street') if x in maps else None
    if x.startswith('BCS-'): todo += [l['to'] for l in maps[x]['links'] if l['kind'] in ('door','edge') and l.get('to')]
    elif st: todo.append(st)
    else: todo += [s for s, sm in maps.items() if s.startswith('BCS-') and any(l['to'] == x for l in sm['links'] if l['kind'] == 'door')]
unreach = set(ids) - seen
inbound = {i: 0 for i in ids}
for p in PLACES:
    for c in p['clues']: inbound[c['to']] = inbound.get(c['to'], 0) + 1
if errs:
    print('\n'.join(errs)); sys.exit(1)
for p in PLACES:
    m = maps[p['id']]; p['name'] = m['name']; p['district'] = m.get('district', ''); p['inbound'] = inbound[p['id']]
    p['kind'] = 'street' if p['id'].startswith('BCS-') else 'building' if p['id'].startswith('BAY-') else 'place'
    p['street'] = m.get('street') or next((s for s, sm in maps.items() if s.startswith('BCS-') and any(l['to'] == p['id'] for l in sm['links'] if l['kind'] == 'door')), p['id'])
out = dict(meta=META, pitch=PITCH, premise=GM_PREMISE, howToRun=HOW_TO_RUN, threads=THREADS, backstory=BACKSTORY, clock=CLOCK,
           pressure=PRESSURE, endings=ENDINGS, npcs=NPCS, pregens=PREGENS, handouts=HANDOUTS, crossover=CROSSOVER, places=PLACES)
json.dump(out, open(f'{B}/data/oneshot-butterfly-cut.json', 'w'), indent=1, ensure_ascii=False)
print(len(PLACES), 'places,', sum(len(p['clues']) for p in PLACES), 'clues; unreachable from start:', sorted(unreach))
print('places with no inbound clue:', sorted(i for i, n in inbound.items() if n < 1 and not i.startswith('BCS-')))
