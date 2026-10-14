"""Top-down character tokens in the vehicle-token style (seen from directly above, facing the top edge).
Usage: python3 people.py OUT_DIR  -> OUT_DIR/<slug>.svg and OUT_DIR/people.json
512 x 512, transparent. Bone shapes, ink detail, soft shadow and a neon accent ring.
"""
import json, os, sys, random, hashlib
INK, BONE, BONE2, SKIN = '#0a0d10', '#ece4cf', '#b9ae95', '#c9b49a'
CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE, GREEN = '#32c7d6', '#ff3b5c', '#ffb020', '#e8c66a', '#3fe0c5', '#b48cff', '#ff4fd8', '#7fb2ff', '#8be6b0'
S = 512; C = S / 2
def f(v): return f'{v:.1f}'

def person(build='medium', outfit='jacket', head='short', item='none', acc=CY, coat=BONE, hair='#2a2622', ring=True, holo=False, extra=''):
    sw = {'slim': 132, 'medium': 150, 'heavy': 178}[build]      # shoulder half-width
    sd = {'slim': 62, 'medium': 70, 'heavy': 84}[build]         # shoulder half-depth
    g = []
    if ring:
        g.append(f'<circle cx="{C}" cy="{C}" r="232" fill="none" stroke="{acc}" stroke-width="10" opacity=".9" filter="url(#glow)"/>')
        g.append(f'<circle cx="{C}" cy="{C}" r="214" fill="{acc}" opacity=".07"/>')
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
    if extra: body.append(extra)
    inner = ''.join(body)
    shadow = inner
    for c in (BONE, BONE2, SKIN, '#2a2e33', '#3a3f46', '#2a2622', '#3a332c', hair, coat): shadow = shadow.replace(c, '#000')
    op = ' opacity=".55"' if holo else ''
    holo_fx = f'<g opacity=".35">{"".join(f"<line x1=\'40\' y1=\'{y}\' x2=\'472\' y2=\'{y}\' stroke=\'{acc}\' stroke-width=\'3\'/>" for y in range(60, 460, 14))}</g>' if holo else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur"><feGaussianBlur stdDeviation="7"/></filter><clipPath id="disc"><circle cx="{C}" cy="{C}" r="226"/></clipPath></defs>
{''.join(g[:1])}<g clip-path="url(#disc)">{''.join(g[1:])}<g transform="translate(9 12)" opacity="{0 if holo else .5}" filter="url(#blur)">{shadow}</g><g{op}>{inner}</g>{holo_fx}</g></svg>'''

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
    json.dump(index, open(f'{out}/people.json', 'w'), indent=1)
    print(len(index['named']) + len(index['generic']) + 1, 'tokens')
