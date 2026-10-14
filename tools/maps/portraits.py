"""Noir contact portraits in the emblem style.
Usage: python3 portraits.py OUT_DIR INDEX_JSON CONTACTS_JSON
 - generic/<category>-NN.svg : 12 looks for each Contact category (informant, supplier, mercenary, contact)
 - named/<slug>.svg          : one portrait per named Cold Storage contact
"""
import json, os, sys, random, hashlib, re
INK, BONE, BONE2 = '#0a0d10', '#ece4cf', '#b9ae95'
CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE = '#78ecf3', '#ff5a6e', '#ffc467', '#e9cc8c', '#5ef0c4', '#b9a2ff', '#ff7fb0', '#7fb2ff'
CATS = {'informant': CY, 'supplier': AMB, 'mercenary': RED, 'contact': VIO}
esc = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def P(d, cls='sil'): return f'<path class="{cls}" d="{d}"/>'

# --------------------------------------------------------------------------- silhouette parts (head centre 256,210)
def shoulders(kind, acc):
    d = 'M86,512 C92,410 150,352 214,336 L298,336 C362,352 420,410 426,512 Z'
    out = P(d) + P(d, 'outline')
    if kind == 'suit':
        out += P('M214,336 L256,420 L298,336', 'rim') + P('M256,420 L244,440 L256,512 L268,440 Z', 'acc') + P('M190,350 L232,430 M322,350 L280,430', 'rim')
    elif kind == 'trench':
        out += P('M196,330 L176,392 L232,430 L214,336 Z', 'sil') + P('M316,330 L336,392 L280,430 L298,336 Z', 'sil') + P('M196,330 L176,392 L232,430 M316,330 L336,392 L280,430', 'rim')
    elif kind == 'hoodie':
        out += P('M196,346 C210,396 302,396 316,346', 'rim') + P('M236,392 L232,452 M276,392 L280,452', 'rim')
    elif kind == 'armor':
        out += P('M150,380 L214,350 L298,350 L362,380 L352,430 L160,430 Z', 'sil') + P('M150,380 L214,350 L298,350 L362,380 L352,430 L160,430 Z', 'rim') + P('M200,400 L312,400', 'acc-line')
    elif kind == 'clerical':
        out += P('M226,338 L286,338 L282,356 L230,356 Z', 'bone')
    elif kind == 'labcoat':
        out += P('M214,336 L242,450 L256,512 M298,336 L270,450 L256,512', 'bone-line') + P('M200,350 L226,470 M312,350 L286,470', 'rim')
    elif kind == 'turtleneck':
        out += P('M220,318 L292,318 L298,348 L214,348 Z', 'sil') + P('M220,318 L292,318 L298,348 L214,348 Z', 'rim')
    elif kind == 'highcollar':
        out += P('M200,300 L224,336 L288,336 L312,300 L322,350 L190,350 Z', 'sil') + P('M200,300 L224,336 L288,336 L312,300', 'acc-line')
    return out

def head(acc):
    d = 'M256,124 C302,124 324,160 324,206 C324,254 296,292 256,292 C216,292 188,254 188,206 C188,160 210,124 256,124 Z'
    return P('M232,286 L232,330 L280,330 L280,286', 'sil') + P('M232,288 L232,330 M280,288 L280,330', 'outline') + P(d) + P(d, 'outline')

def hair(kind, acc):
    if kind == 'short': return P('M190,196 C186,140 222,112 258,114 C298,116 326,142 322,196 C312,170 290,150 256,150 C222,150 200,170 190,196 Z', 'hair')
    if kind == 'slick': return P('M188,190 C190,132 230,108 270,114 C312,122 330,160 324,190 C300,150 240,142 188,190 Z', 'hair') + P('M206,160 C240,134 286,134 312,156', 'rim')
    if kind == 'long': return P('M186,200 C180,130 230,104 262,110 C304,116 334,150 326,206 L334,330 L300,320 L310,210 C296,170 222,166 204,212 L214,320 L178,330 Z', 'hair')
    if kind == 'bun': return P('M190,196 C186,140 222,114 258,116 C298,118 326,144 322,196 C310,168 290,152 256,152 C222,152 202,168 190,196 Z', 'hair') + '<circle class="hair" cx="256" cy="104" r="26"/>'
    if kind == 'bob': return P('M182,232 C176,150 220,112 258,114 C300,116 336,150 330,232 L314,236 C316,186 296,160 256,158 C216,160 196,186 198,236 Z', 'hair')
    if kind == 'mohawk': return P('M240,150 L246,84 L256,70 L266,84 L272,150 Z', 'acc') + P('M196,190 C200,160 220,146 240,150 M272,150 C292,146 312,160 316,190', 'rim')
    if kind == 'bald': return P('M206,150 C226,130 286,130 306,150', 'rim')
    if kind == 'fedora': return P('M150,170 C190,182 322,182 362,170 C334,160 318,158 312,156 L302,104 C282,112 256,96 210,104 L200,156 C194,158 178,160 150,170 Z', 'hat') + P('M200,150 C236,158 276,158 312,150', 'acc-line')
    if kind == 'cap': return P('M190,186 C188,136 226,112 258,114 C292,116 324,138 322,186 Z', 'hat') + P('M190,180 L140,192 C150,200 188,198 212,190', 'hat') + P('M206,170 L310,170', 'acc-line')
    if kind == 'beret': return P('M182,170 C176,128 236,106 290,116 C330,124 344,152 328,168 C300,150 220,148 182,170 Z', 'hat') + '<circle class="acc" cx="300" cy="118" r="7"/>'
    if kind == 'hood': return P('M162,330 C150,200 190,96 256,96 C322,96 362,200 350,330 L320,336 C330,230 304,150 256,150 C208,150 182,230 192,336 Z', 'hat')
    if kind == 'helmet': return P('M180,220 C176,140 216,104 256,104 C296,104 336,140 332,220 L320,250 L192,250 Z', 'hat') + P('M196,196 L316,196 L308,226 L204,226 Z', 'acc')
    return ''

def face(kind, acc):
    if kind == 'visor': return P('M200,200 L312,200 L306,222 L206,222 Z', 'acc')
    if kind == 'glasses': return '<circle class="rim" cx="230" cy="210" r="16"/><circle class="rim" cx="282" cy="210" r="16"/>' + P('M246,210 L266,210', 'rim')
    if kind == 'cybereye': return '<circle class="acc" cx="282" cy="208" r="11"/>' + P('M296,208 L326,196 M296,214 L322,226', 'acc-line')
    if kind == 'scar': return P('M276,180 L296,236', 'acc-line') + P('M281,196 L291,192 M285,210 L295,206 M289,224 L299,220', 'acc-line')
    if kind == 'mask': return P('M206,236 C220,276 292,276 306,236 L306,262 C290,292 222,292 206,262 Z', 'acc')
    if kind == 'eyes': return P('M218,210 L242,210 M270,210 L294,210', 'rim')
    return ''

def portrait(acc, clothes, hair_kind, face_kind, title, subtitle, seed):
    rnd = random.Random(seed)
    rain = ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x-14:.0f}" y2="{y+48:.0f}" stroke="#9fb6c8" stroke-width="1.4" opacity="{rnd.uniform(.05,.2):.2f}"/>'
                   for x, y in ((rnd.uniform(0, 540), rnd.uniform(-40, 500)) for _ in range(34)))
    fs = 30 if len(title) <= 16 else 25 if len(title) <= 22 else 20
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<radialGradient id="bg" cx="50%" cy="34%" r="72%"><stop offset="0" stop-color="#1c2330"/><stop offset=".55" stop-color="#0b0d13"/><stop offset="1" stop-color="#030305"/></radialGradient>
<linearGradient id="rimlight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{acc}" stop-opacity=".0"/><stop offset="1" stop-color="{acc}" stop-opacity=".35"/></linearGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="card"><rect x="34" y="28" width="444" height="456" rx="26"/></clipPath>
<style>.sil{{fill:#18202b;stroke:none}}.outline{{fill:none;stroke:{acc};stroke-width:4;stroke-opacity:.75;stroke-linejoin:round}}.hair{{fill:#151b24;stroke:{acc};stroke-width:3;stroke-opacity:.55}}.hat{{fill:#121821;stroke:{acc};stroke-width:4}}.rim{{fill:none;stroke:{acc};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}}.acc{{fill:{acc};stroke:none}}.acc-line{{fill:none;stroke:{acc};stroke-width:5;stroke-linecap:round}}.bone{{fill:{BONE};stroke:none}}.bone-line{{fill:none;stroke:{BONE};stroke-width:5;stroke-linecap:round;opacity:.8}}</style>
</defs>
<g clip-path="url(#card)">
<rect width="512" height="512" fill="url(#bg)"/>
<circle cx="256" cy="210" r="150" fill="{acc}" opacity=".07"/>
{rain}
<g transform="translate(0,6)">
<g filter="url(#glow)">{shoulders(clothes, acc)}{head(acc)}{hair(hair_kind, acc)}{face(face_kind, acc)}</g>
<path d="M324,206 C324,254 296,292 256,292" fill="none" stroke="url(#rimlight)" stroke-width="10"/>
</g>
<g opacity=".5">{"".join(f'<line x1="0" y1="{y}" x2="512" y2="{y}" stroke="#fff" stroke-width="1" opacity=".035"/>' for y in range(4, 512, 6))}</g>
</g>
<rect x="34" y="28" width="444" height="456" rx="26" fill="none" stroke="{acc}" stroke-width="6" filter="url(#glow)"/>
<rect x="50" y="44" width="412" height="424" rx="18" fill="none" stroke="{BONE}" stroke-width="1.5" opacity=".25"/>
<path d="M60,402 L452,402 L466,424 L452,446 L60,446 L46,424 Z" fill="#07080c" stroke="{acc}" stroke-width="3"/>
<text x="256" y="{424 + fs*.36:.0f}" text-anchor="middle" font-family="Bebas Neue, Oswald, Impact, 'Arial Narrow', sans-serif" font-size="{fs}" letter-spacing="2" fill="#f1ede4">{esc(title.upper())}</text>
<text x="256" y="470" text-anchor="middle" font-family="Courier New, monospace" font-size="13" letter-spacing="4" fill="{acc}" opacity=".85">{esc(subtitle.upper())}</text>
</svg>'''

CLOTHES = ['suit', 'trench', 'hoodie', 'armor', 'clerical', 'labcoat', 'turtleneck', 'highcollar']
HAIRS = ['short', 'slick', 'long', 'bun', 'bob', 'mohawk', 'bald', 'fedora', 'cap', 'beret', 'hood', 'helmet']
FACES = ['', 'visor', 'glasses', 'cybereye', 'scar', 'mask', 'eyes']
CAT_STYLE = {
    'informant': (['trench', 'hoodie', 'suit', 'turtleneck'], ['fedora', 'hood', 'cap', 'slick', 'bob', 'short'], ['', 'glasses', 'cybereye', 'eyes', 'visor']),
    'supplier': (['labcoat', 'turtleneck', 'suit', 'hoodie', 'highcollar'], ['bun', 'beret', 'short', 'long', 'cap', 'bald'], ['glasses', 'visor', 'cybereye', '', 'eyes']),
    'mercenary': (['armor', 'trench', 'hoodie', 'turtleneck'], ['helmet', 'mohawk', 'bald', 'short', 'cap', 'hood'], ['scar', 'visor', 'mask', 'cybereye', 'eyes']),
    'contact': (CLOTHES, HAIRS, FACES),
}

NAMED = {  # Cold Storage contacts: (clothes, hair, face, accent)
 'C01': ('suit', 'slick', 'visor', VIO), 'C02': ('armor', 'helmet', '', RED), 'C03': ('highcollar', 'short', 'cybereye', GOLD),
 'C04': ('labcoat', 'bun', 'glasses', TEAL), 'C05': ('hoodie', 'hood', 'eyes', AMB), 'C06': ('hoodie', 'bald', 'scar', RED),
 'C07': ('trench', 'mohawk', 'eyes', CY), 'C08': ('clerical', 'short', 'glasses', GOLD), 'C09': ('suit', 'bun', 'eyes', BLUE),
 'C10': ('trench', 'fedora', 'scar', RED), 'C11': ('turtleneck', 'bob', 'visor', CY), 'C12': ('hoodie', 'short', 'glasses', TEAL),
 'C13': ('highcollar', 'long', 'cybereye', GOLD), 'C14': ('trench', 'fedora', 'eyes', BLUE), 'C15': ('labcoat', 'short', 'mask', PINK),
 'C16': ('turtleneck', 'beret', 'cybereye', VIO), 'C17': ('armor', 'short', 'visor', RED), 'C18': ('turtleneck', 'mohawk', 'visor', PINK),
 'C19': ('clerical', 'bald', 'eyes', GOLD), 'C20': ('suit', 'long', 'eyes', BLUE),
}

if __name__ == '__main__':
    out, index_path, contacts_path = sys.argv[1:4]
    os.makedirs(os.path.join(out, 'generic'), exist_ok=True); os.makedirs(os.path.join(out, 'named'), exist_ok=True)
    index = {'generic': {}, 'named': {}}
    for cat, acc in CATS.items():
        clothes, hairs, faces = CAT_STYLE[cat]
        rnd = random.Random('looks-' + cat); files = []
        combos = [(c, h, f) for c in clothes for h in hairs for f in faces]
        rnd.shuffle(combos)
        for i, (c, h, f) in enumerate(combos[:12], 1):
            name = f'{cat}-{i:02d}.svg'
            open(os.path.join(out, 'generic', name), 'w').write(portrait(acc, c, h, f, cat.title(), 'BAY CITY CONTACT // ' + f'{i:02d}', name))
            files.append(f'systems/altered-carbon-rpg/assets/emblems/contacts/generic/{name}')
        index['generic'][cat] = files
    contacts = json.load(open(contacts_path))
    for c in contacts:
        clothes, h, f, acc = NAMED[c['id']]
        name = slug(c['currentIdentity']) + '.svg'
        open(os.path.join(out, 'named', name), 'w').write(portrait(acc, clothes, h, f, c['currentIdentity'], c.get('presentFunction', '')[:30], c['id']))
        src = f'systems/altered-carbon-rpg/assets/emblems/contacts/named/{name}'
        for key in {c['currentIdentity'], c.get('historicalIdentity') or c['currentIdentity']}:
            index['named'][key.lower()] = src
    json.dump(index, open(index_path, 'w'), indent=1)
    print(sum(len(v) for v in index['generic'].values()), 'generic,', len(contacts), 'named')
