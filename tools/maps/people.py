"""Top-down character tokens in the vehicle-token style (seen from directly above, facing the top edge).
Usage: python3 people.py OUT_DIR  -> OUT_DIR/<slug>.svg and OUT_DIR/people.json
512 x 512, transparent. Bone shapes, ink detail, soft shadow and a neon accent ring.
"""
import json, os, sys, random, hashlib
INK, BONE, BONE2, SKIN = '#0a0d10', '#ece4cf', '#b9ae95', '#c9b49a'
CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE, GREEN = '#32c7d6', '#ff3b5c', '#ffb020', '#e8c66a', '#3fe0c5', '#b48cff', '#ff4fd8', '#7fb2ff', '#8be6b0'
S = 512; C = S / 2
import re
def upright(frag):
    def fix(m):
        tag = m.group(0); x = float(re.search(r' x="([-\d.]+)"', tag).group(1)); y = float(re.search(r' y="([-\d.]+)"', tag).group(1))
        return tag.replace('<text ', f'<text transform="rotate(180 {x:.1f} {y - 7:.1f})" ', 1)
    return re.sub(r'<text [^>]*>', fix, frag)
def f(v): return f'{v:.1f}'

def person(build='medium', outfit='jacket', head='short', item='none', acc=CY, coat=BONE, hair='#2a2622', ring=True, holo=False, extra='', synth=False, serial='', mask=False, hold='', ringc=None):
    sw = {'slim': 132, 'medium': 150, 'heavy': 178}[build]      # shoulder half-width
    sd = {'slim': 62, 'medium': 70, 'heavy': 84}[build]         # shoulder half-depth
    g = []
    if ring:
        rc = ringc or acc
        g.append(f'<circle cx="{C}" cy="{C}" r="232" fill="none" stroke="{rc}" stroke-width="10" opacity=".95" filter="url(#glow)"/>')
        g.append(f'<circle cx="{C}" cy="{C}" r="214" fill="{rc}" opacity=".08"/>')
    body = []
    # coat tails / cape behind (below = behind, facing up)
    if outfit in ('trench', 'robe'):
        body.append(f'<path d="M{f(C-sw*.82)},{f(C+10)} Q{f(C-sw*.86)},{f(C+118)} {f(C-sw*.5)},{f(C+132)} L{f(C+sw*.5)},{f(C+132)} Q{f(C+sw*.86)},{f(C+118)} {f(C+sw*.82)},{f(C+10)} Z" fill="{BONE2 if outfit=="trench" else coat}"/>')
        body.append(f'<line x1="{C}" y1="{f(C+40)}" x2="{C}" y2="{f(C+130)}" stroke="{INK}" stroke-width="5" opacity=".45"/>')
    # arms
    arm_y = C - 8
    for sx in (-1, 1):
        ax = C + sx * (sw - 18)
        if item in ('rifle',) and sx == -1: body.append(f'<path d="M{f(ax)},{f(arm_y)} Q{f(C-sw*.55)},{f(C-70)} {f(C-26)},{f(C-102)}" fill="none" stroke="{coat}" stroke-width="40" stroke-linecap="round"/>')
        elif item in ('rifle', 'pistol', 'blade') and sx == 1: body.append(f'<path d="M{f(ax)},{f(arm_y)} Q{f(C+sw*.62)},{f(C-74)} {f(C+30)},{f(C-104)}" fill="none" stroke="{coat}" stroke-width="40" stroke-linecap="round"/>')
        else: body.append(f'<ellipse cx="{f(ax)}" cy="{f(arm_y+22)}" rx="30" ry="58" fill="{coat}"/>')
    # torso (shoulders seen from above)
    body.append(f'<ellipse cx="{C}" cy="{C}" rx="{sw}" ry="{sd}" fill="{coat}"/>')
    if outfit == 'armor':
        for sx in (-1, 1): body.append(f'<ellipse cx="{f(C+sx*sw*.8)}" cy="{f(C+2)}" rx="{f(sw*.26)}" ry="{f(sd*.72)}" fill="{BONE2}" stroke="{INK}" stroke-width="5"/>')
        body.append(f'<rect x="{f(C-sw*.42)}" y="{f(C+sd*.05)}" width="{f(sw*.84)}" height="{f(sd*.7)}" rx="14" fill="{BONE2}" stroke="{INK}" stroke-width="5"/>')
    elif outfit == 'suit':
        body.append(f'<path d="M{f(C-28)},{f(C-sd+6)} L{C},{f(C+12)} L{f(C+28)},{f(C-sd+6)}" fill="{INK}" opacity=".85"/>')
        body.append(f'<line x1="{C}" y1="{f(C-sd+10)}" x2="{C}" y2="{f(C+8)}" stroke="{acc}" stroke-width="7"/>')
    elif outfit == 'hoodie':
        body.append(f'<ellipse cx="{C}" cy="{f(C+34)}" rx="70" ry="38" fill="{BONE2}"/>')
    elif outfit == 'jacket':
        body.append(f'<line x1="{C}" y1="{f(C-sd+8)}" x2="{C}" y2="{f(C+sd-8)}" stroke="{INK}" stroke-width="5" opacity=".5"/>')
        for sx in (-1, 1): body.append(f'<path d="M{f(C+sx*30)},{f(C-sd+6)} L{f(C+sx*62)},{f(C-8)}" stroke="{INK}" stroke-width="5" opacity=".45"/>')
    elif outfit == 'labcoat':
        body.append(f'<rect x="{f(C-sw*.55)}" y="{f(C-6)}" width="{f(sw*1.1)}" height="{f(sd*.5)}" rx="10" fill="{BONE}" stroke="{INK}" stroke-width="3" opacity=".9"/>')
    elif outfit == 'trench':
        body.append(f'<path d="M{f(C-sw*.8)},{f(C-10)} Q{C},{f(C-sd-26)} {f(C+sw*.8)},{f(C-10)}" fill="none" stroke="{INK}" stroke-width="6" opacity=".55"/>')
    # accent stripe on the shoulders
    body.append(f'<path d="M{f(C-sw*.92)},{f(C+6)} Q{C},{f(C-sd*.6)} {f(C+sw*.92)},{f(C+6)}" fill="none" stroke="{acc}" stroke-width="6" opacity=".8"/>')
    if synth:   # synthetic sleeve: panel seams across the shoulders, optional serial stencil
        for sx in (-1, 1): body.append(f'<path d="M{f(C+sx*sw*.35)},{f(C-sd+10)} L{f(C+sx*sw*.5)},{f(C+sd-10)}" stroke="{INK}" stroke-width="4" opacity=".55"/><circle cx="{f(C+sx*sw*.72)}" cy="{f(C-6)}" r="7" fill="{acc}" opacity=".9"/>')
        if serial: body.append(f'<text x="{f(C+sw*.52)}" y="{f(C+sd*.55)}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="22" fill="{INK}" opacity=".75">{serial}</text>')
    # items held forward
    if item == 'pistol': body.append(f'<rect x="{f(C+20)}" y="{f(C-158)}" width="20" height="58" rx="5" fill="#2a2e33" stroke="{INK}" stroke-width="3"/>')
    if item == 'rifle': body.append(f'<rect x="{f(C-10)}" y="{f(C-210)}" width="22" height="150" rx="6" fill="#2a2e33" stroke="{INK}" stroke-width="3"/><rect x="{f(C-6)}" y="{f(C-150)}" width="14" height="22" fill="{acc}" opacity=".8"/>')
    if item == 'blade': body.append(f'<path d="M{f(C+28)},{f(C-104)} L{f(C+40)},{f(C-212)} L{f(C+50)},{f(C-104)} Z" fill="#dfe8ee" stroke="{INK}" stroke-width="3"/>')
    if item == 'bag': body.append(f'<rect x="{f(C+sw-40)}" y="{f(C+8)}" width="56" height="70" rx="12" fill="{BONE2}" stroke="{INK}" stroke-width="4"/>')
    if item == 'cane': body.append(f'<circle cx="{f(C+sw-6)}" cy="{f(C-60)}" r="14" fill="{GOLD}"/>')
    # head (top of the head, nose toward the top edge)
    hr = 58
    hx, hy = C, C - 22
    if head == 'hood': body.append(f'<ellipse cx="{hx}" cy="{f(hy+6)}" rx="{hr+16}" ry="{hr+20}" fill="{BONE2}" stroke="{INK}" stroke-width="5"/><ellipse cx="{hx}" cy="{f(hy-30)}" rx="34" ry="18" fill="{INK}" opacity=".8"/>')
    elif head == 'helmet':
        body.append(f'<circle cx="{hx}" cy="{hy}" r="{hr+6}" fill="#3a3f46" stroke="{INK}" stroke-width="5"/><path d="M{f(hx-44)},{f(hy-38)} Q{hx},{f(hy-70)} {f(hx+44)},{f(hy-38)}" fill="none" stroke="{acc}" stroke-width="10" filter="url(#glow)"/>')
    elif head == 'fedora': body.append(f'<ellipse cx="{hx}" cy="{hy}" rx="{hr+38}" ry="{hr+30}" fill="#2a2622" stroke="{INK}" stroke-width="4"/><ellipse cx="{hx}" cy="{hy}" rx="{hr-6}" ry="{hr-12}" fill="#3a332c"/><path d="M{f(hx-hr+8)},{f(hy+4)} Q{hx},{f(hy+22)} {f(hx+hr-8)},{f(hy+4)}" stroke="{acc}" stroke-width="6" fill="none"/>')
    elif head == 'cap': body.append(f'<circle cx="{hx}" cy="{hy}" r="{hr}" fill="{acc}" opacity=".9"/><ellipse cx="{hx}" cy="{f(hy-hr+6)}" rx="44" ry="22" fill="{INK}" opacity=".85"/>')
    else:
        body.append(f'<circle cx="{hx}" cy="{hy}" r="{hr}" fill="{SKIN if head=="bald" else hair}" stroke="{INK}" stroke-width="4"/>')
        if head == 'long': body.append(f'<path d="M{f(hx-hr+6)},{f(hy+10)} Q{f(hx-hr+2)},{f(hy+100)} {hx},{f(hy+104)} Q{f(hx+hr-2)},{f(hy+100)} {f(hx+hr-6)},{f(hy+10)} Z" fill="{hair}"/>')
        if head == 'bun': body.append(f'<circle cx="{hx}" cy="{f(hy+44)}" r="22" fill="{hair}" stroke="{INK}" stroke-width="3"/>')
        if head == 'mohawk': body.append(f'<rect x="{f(hx-12)}" y="{f(hy-hr)}" width="24" height="{2*hr}" rx="12" fill="{acc}"/>')
        if head == 'bald': body.append(f'<path d="M{f(hx-22)},{f(hy-20)} Q{hx},{f(hy-36)} {f(hx+22)},{f(hy-20)}" stroke="#a89377" stroke-width="5" fill="none"/>')
        if head == 'short': body.append(f'<path d="M{f(hx-hr+10)},{f(hy-18)} Q{hx},{f(hy-hr-8)} {f(hx+hr-10)},{f(hy-18)}" stroke="#0f0d0b" stroke-width="5" fill="none" opacity=".6"/>')
        # nose / face direction mark
        body.append(f'<path d="M{f(hx-10)},{f(hy-hr+2)} L{hx},{f(hy-hr-12)} L{f(hx+10)},{f(hy-hr+2)}" fill="{SKIN}"/>')
    if mask: body.append(f'<rect x="{f(hx-30)}" y="{f(hy-hr-16)}" width="60" height="30" rx="12" fill="#3a3f46" stroke="{INK}" stroke-width="4"/><circle cx="{f(hx-16)}" cy="{f(hy-hr-1)}" r="7" fill="{acc}"/><circle cx="{f(hx+16)}" cy="{f(hy-hr-1)}" r="7" fill="{acc}"/>')
    if hold == 'orange': body.append(f'<circle cx="{f(C+sw-10)}" cy="{f(C-50)}" r="20" fill="#ff9a3c" stroke="{INK}" stroke-width="3"/>')
    if hold == 'cuff': body.append(f'<rect x="{f(C-sw+2)}" y="{f(C-44)}" width="34" height="18" rx="6" fill="#dfe8ee" stroke="{INK}" stroke-width="3"/>')
    if hold == 'scalpel': body.append(f'<path d="M{f(C+30)},{f(C-104)} L{f(C+36)},{f(C-160)} L{f(C+42)},{f(C-104)} Z" fill="#dfe8ee" stroke="{INK}" stroke-width="2"/>')
    if hold == 'mic': body.append(f'<rect x="{f(C+24)}" y="{f(C-150)}" width="14" height="44" rx="6" fill="#2a2e33"/><circle cx="{f(C+31)}" cy="{f(C-154)}" r="13" fill="{acc}"/>')
    if hold == 'tablet': body.append(f'<rect x="{f(C-36)}" y="{f(C-150)}" width="72" height="44" rx="6" fill="#121a22" stroke="{acc}" stroke-width="4"/>')
    if extra: body.append(extra)
    inner = ''.join(body)
    shadow = inner
    for c in (BONE, BONE2, SKIN, '#2a2e33', '#3a3f46', '#2a2622', '#3a332c', hair, coat): shadow = shadow.replace(c, '#000')
    op = ' opacity=".55"' if holo else ''
    holo_fx = f'<g opacity=".35">{"".join(f"<line x1=\'40\' y1=\'{y}\' x2=\'472\' y2=\'{y}\' stroke=\'{acc}\' stroke-width=\'3\'/>" for y in range(60, 460, 14))}</g>' if holo else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur"><feGaussianBlur stdDeviation="7"/></filter><clipPath id="disc"><circle cx="{C}" cy="{C}" r="226"/></clipPath></defs>
{''.join(g[:1])}<g clip-path="url(#disc)">{''.join(g[1:])}<g transform="translate(9 12)" opacity="{0 if holo else .5}" filter="url(#blur)"><g transform="rotate(180 {C} {C})">{shadow}</g></g><g{op} transform="rotate(180 {C} {C})">{upright(inner)}</g>{holo_fx}</g></svg>'''

# --------------------------------------------------------------------------- named adversaries (official pack)
NAMED = {
 'Corporate Stooge': dict(build='medium', outfit='suit', head='short', item='bag', acc=BLUE, coat='#d9d3c4'),
 'Thug': dict(build='heavy', outfit='jacket', head='bald', item='blade', acc=RED, coat=BONE2),
 'Hitman': dict(build='slim', outfit='trench', head='fedora', item='pistol', acc=RED, coat='#cfc6ad'),
 'CTAC Special Forces Praetorian': dict(build='heavy', outfit='armor', head='helmet', item='rifle', acc=RED, coat='#9aa39b'),
 'Generational Meth': dict(build='medium', outfit='robe', head='long', item='cane', acc=GOLD, coat='#efe6cf', hair='#d8c9a3'),
 'Dipper': dict(build='slim', outfit='hoodie', head='hood', item='none', acc=PINK, coat=BONE2),
 'Bay City Police Officer': dict(build='medium', outfit='armor', head='cap', item='pistol', acc=BLUE, coat='#b7c2cf'),
 'Freak': dict(build='heavy', outfit='jacket', head='mohawk', item='blade', acc=GREEN, coat=BONE2),
}
# Cold Storage: pregens, benefactors and its own adversaries (matched by Actor name).
NAMED.update({
 'Nia Calder': dict(build='medium', outfit='trench', head='bun', item='none', hold='tablet', acc=CY, coat='#cfc6ad', hair='#3b2a20'),
 'Tomas “Latch” Araya': dict(build='heavy', outfit='jacket', head='bald', item='bag', acc=AMB, coat=BONE2, synth=True),
 'Sabine Kade': dict(build='slim', outfit='jacket', head='long', item='none', acc=GOLD, coat='#d9d3c4', hair='#d8c9a3'),
 'Imani Voss': dict(build='medium', outfit='armor', head='short', item='pistol', acc=RED, coat='#b9b0a0', hair='#1b1b22'),
 'Cass Ren': dict(build='medium', outfit='hoodie', head='short', item='blade', acc=PINK, coat=BONE2, synth=True, serial='EV-77', hair='#121214'),
 'Dr Edda Sorn': dict(build='slim', outfit='labcoat', head='bun', item='none', hold='scalpel', acc=TEAL, coat=BONE, hair='#9a948a'),
 'Anik Rao': dict(build='medium', outfit='suit', head='short', item='none', hold='tablet', acc=VIO, coat='#cfc6ad', synth=True, hair='#1b1b22'),
 'Solenne Pryce': dict(build='heavy', outfit='jacket', head='long', item='none', hold='mic', acc=GREEN, coat=BONE2, mask=True, hair='#5a3a22'),
 'Dr Adria Sen': dict(build='slim', outfit='labcoat', head='bun', item='none', acc=GREEN, coat=BONE, hair='#2a2622', ring=True),
 'Magistrate Severin Holt': dict(build='medium', outfit='robe', head='short', item='none', hold='cuff', acc=VIO, coat='#2f2b3a', hair='#b9b2a6'),
 'Director Oren Thale': dict(build='medium', outfit='suit', head='bald', item='none', hold='orange', acc=BLUE, coat='#7f9ccf'),
 'Palimpsest Recovery Dipper': dict(build='slim', outfit='hoodie', head='hood', item='none', hold='tablet', acc=VIO, coat=BONE2),
 'Palimpsest Retrieval Hitman': dict(build='slim', outfit='trench', head='fedora', item='pistol', acc=VIO, coat='#cfc6ad'),
 'Compromised Protectorate Officer': dict(build='medium', outfit='armor', head='cap', item='pistol', acc=AMB, coat='#b7c2cf'),
 'Praetorian Black-Recovery Operative': dict(build='heavy', outfit='armor', head='helmet', item='rifle', acc=RED, coat='#5c635c'),
})
# The ring (token base) takes the colour of the character's picture: red case-file badges for the official
# adversaries, Cold Storage's red opponent badges and gold benefactor badges, each pregen's portrait accent.
RING = {'Corporate Stooge': '#ff3b3b', 'Thug': '#ff3b3b', 'Hitman': '#ff3b3b', 'CTAC Special Forces Praetorian': '#ff3b3b', 'Generational Meth': '#ff3b3b', 'Dipper': '#ff3b3b', 'Bay City Police Officer': '#ff3b3b', 'Freak': '#ff3b3b', 'Palimpsest Recovery Dipper': '#ff3b55', 'Palimpsest Retrieval Hitman': '#ff3b55', 'Compromised Protectorate Officer': '#ff3b55', 'Praetorian Black-Recovery Operative': '#ff3b55', 'Dr Adria Sen': '#c9a24a', 'Magistrate Severin Holt': '#c9a24a', 'Director Oren Thale': '#c9a24a'}
PREGEN_ACCENT = {'Nia Calder': '#78ecf3', 'Tomas “Latch” Araya': '#ffc467', 'Sabine Kade': '#e9cc8c', 'Imani Voss': '#ff5a6e', 'Cass Ren': '#ff7fb0', 'Dr Edda Sorn': '#5ef0c4', 'Anik Rao': '#b9a2ff', 'Solenne Pryce': '#ff8a3d'}
for _n, _c in RING.items(): NAMED[_n]['ringc'] = _c
for _n, _c in PREGEN_ACCENT.items(): NAMED[_n]['ringc'] = _c; NAMED[_n]['acc'] = _c
# --------------------------------------------------------------------------- generic looks for PCs and NPCs
LOOKS = []
_r = random.Random(2384)
OUT = ['trench', 'jacket', 'suit', 'hoodie', 'armor', 'labcoat', 'robe']
HEAD = ['short', 'long', 'bun', 'bald', 'mohawk', 'fedora', 'cap', 'hood', 'helmet']
ITEM = ['none', 'pistol', 'none', 'blade', 'bag', 'rifle', 'none']
ACC = [CY, PINK, AMB, GREEN, VIO, BLUE, RED, TEAL, GOLD]
HAIR = ['#2a2622', '#5a3a22', '#c9a46a', '#1b1b22', '#8a2f2f', '#d8d0c0']
for i in range(36):
    LOOKS.append(dict(build=['slim', 'medium', 'heavy'][i % 3], outfit=OUT[i % 7], head=HEAD[(i * 4 + 1) % 9], item=ITEM[(i * 3) % 7],
                      acc=ACC[i % 9], hair=HAIR[(i * 5) % 6], coat=[BONE, BONE2, '#d9d3c4', '#cfc6ad'][i % 4]))
AI_LOOK = dict(build='medium', outfit='robe', head='short', item='none', acc=CY, coat='#bfefff', hair='#7fe9ff', holo=True)

def slug(s): return ''.join(ch if ch.isalnum() else '-' for ch in s.lower()).strip('-').replace('--', '-')
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); index = {'named': {}, 'generic': [], 'ai': ''}
    for name, spec in NAMED.items():
        fn = f'npc-{slug(name)}.svg'; open(f'{out}/{fn}', 'w').write(person(**spec)); index['named'][name] = fn
    for i, spec in enumerate(LOOKS):
        fn = f'look-{i+1:02d}.svg'; open(f'{out}/{fn}', 'w').write(person(**spec)); index['generic'].append(fn)
    open(f'{out}/ai-hologram.svg', 'w').write(person(**AI_LOOK)); index['ai'] = 'ai-hologram.svg'
    index['lookAccents'] = [l['acc'] for l in LOOKS]
    json.dump(index, open(f'{out}/people.json', 'w'), indent=1)
    print(len(index['named']) + len(index['generic']) + 1, 'tokens')
