"""Generate noir emblems for the Altered Carbon RPG compendiums.
Usage: python3 -I emblems.py entries.json OUT_DIR index.json
"""
import json, math, random, re, sys, hashlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glyphs as g

ACCENT = {
    "weapon": "#ff2e4d", "ammunition": "#ffb020", "armour": "#7fb2ff", "equipment": "#32c7d6",
    "augmentation": "#b48cff", "drug": "#6dff9a", "software": "#ff4fd8", "network": "#e8c66a",
    "threat": "#ff3b3b", "vehicle": "#32c7d6", "upgrade": "#32c7d6",
}
CODE = {"weapon": "WPN", "ammunition": "AMM", "armour": "ARM", "equipment": "EQP", "augmentation": "AUG",
        "drug": "CHM", "software": "SFT", "network": "NET", "threat": "BCPD CASE", "vehicle": "VEH", "upgrade": "MOD"}

def slug(name):
    s = name.lower().replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def has(n, *words):
    return any(w in n for w in words)

def glyph_for(e):
    n = e["name"].lower(); t = e["type"]; pack = e["pack"]
    if t == "threat":
        return {"corporate stooge": g.suit_tie, "thug": g.thug, "hitman": g.hitman,
                "ctac special forces praetorian": lambda: g.helmet(chevron=True), "generational meth": g.meth_tower,
                "dipper": g.dipper, "bay city police officer": g.bcpd, "freak": g.freak}.get(n, g.freak)()
    if t == "vehicle":
        return {"ground car": g.ground_car, "aircar": g.aircar, "airbike": g.airbike}.get(n, g.ground_car)()
    if t == "network":
        if has(n, "union", "guild"): return g.union()
        if has(n, "protectorate", "bureaucracy"): return g.columns()
        if n == "police": return g.police_badge()
        if has(n, "influential"): return g.figure_crown()
        if has(n, "corporation"): return g.skyscraper()
        if has(n, "syndicate"): return g.dagger_rose()
        if n == "ctac": return g.ctac()
    if pack == "weapon-upgrades":
        if has(n, "barrel"): return g.barrel_ext()
        if has(n, "sniper"): return g.scope("sniper")
        if has(n, "longshot"): return g.scope("long")
        if has(n, "scope"): return g.scope()
        if has(n, "stock"): return g.stock_fold()
        if has(n, "laser"): return g.laser_sight()
        if has(n, "genemapped"): return g.dna_lock()
        if has(n, "composite"): return g.layers()
        if has(n, "extended magazine"): return g.magazine(True)
        if has(n, "magazine"): return g.magazine()
        if has(n, "mag-plating"): return g.magnet()
        if has(n, "power cell"): return g.battery(True)
    if t == "weapon":
        if has(n, "stun grenade"): return g.grenade("stun")
        if has(n, "termite"): return g.grenade("termite")
        if has(n, "hallucinogen"): return g.grenade("halluc")
        if has(n, "frag grenade"): return g.grenade("frag")
        if has(n, "dispenser"): return g.dispenser()
        if has(n, "railgun"): return g.railgun()
        if has(n, "particle blaster"): return g.blaster()
        if has(n, "beam rifle"): return g.energy_rifle(3)
        if has(n, "sunjet snipe"): return g.energy_rifle(2) + g.R(-30, -46, 54, 12, "g", 4)
        if has(n, "sunjet"): return g.energy_rifle(4)
        if has(n, "frag rifle"): return g.rifle(mag=True) + g.P("M88,-18 L100,-30 M88,-18 L102,-18 M88,-18 L100,-6", "s")
        if has(n, "shocktrooper", "ak"): return g.rifle(mag=True)
        if has(n, "nemesis", "nemex"): return g.rifle(scope=True, bipod=True, long=True)
        if has(n, "shotgun"): return g.shotgun()
        if has(n, "vector"): return g.smg()
        if has(n, "slugthrower"): return g.rifle(mag=True, scope=False) + g.C(-70, 4, 4, "f")
        if has(n, "flechette"): return g.flechette()
        if has(n, "shard"): return g.shard_pistol()
        if has(n, ".357", "bcpd"): return g.revolver()
        if has(n, "derringer"): return g.derringer()
        if has(n, "steyr", "praetorian sidearm", "9mm"): return g.pistol()
        if has(n, "throwing"):
            kunai = g.P("M0,-88 L12,-30 L5,-22 L5,22 L-5,22 L-5,-22 L-12,-30 Z") + g.L(-5, 0, 5, 0, "d") + g.C(0, 34, 11, "s")
            return "".join(g.G(kunai, f"translate(0,40) rotate({a}) translate(0,-40)") for a in (-34, 0, 34))
        if has(n, "force knuckles"): return g.knuckles(True)
        if has(n, "power knuckles"): return g.knuckles() + g.bolt(0, -54, 0.5)
        if has(n, "force hammer"): return g.hammer()
        if has(n, "sword"): return g.sword()
        if has(n, "bo staff", "staff"): return g.staff()
        if has(n, "baton"): return g.baton()
        if has(n, "blade"): return g.knife()
        return g.pistol()
    if t == "ammunition":
        if has(n, "shells", "buckshot", "slug"):
            mark = ""
            if has(n, "emp"): mark = g.bolt(0, -10, 0.45)
            elif has(n, "plasma"): mark = g.C(0, -10, 8, "f")
            elif has(n, "frag"): mark = g.P("M-8,-20 L8,0 M8,-20 L-8,0", "s")
            elif has(n, "tungsten"): mark = g.R(-8, -18, 16, 16, "f")
            elif has(n, "breaching"): mark = g.P("M0,-26 L6,-12 L-6,-6 L4,6", "s")
            elif has(n, "stunbolt"): mark = g.bolt(0, -10, 0.4)
            elif has(n, "buckshot"): mark = g.C(-6, -16, 4, "f") + g.C(6, -16, 4, "f") + g.C(0, -4, 4, "f")
            elif has(n, "solid slug"): mark = g.R(-10, -30, 20, 30, "f", 4)
            return g.shell_set(mark)
        if has(n, "plasma"): return g.plasma_cell()
        if has(n, "emp"): return g.ammo_set("flat") + g.G(g.emp_mark(), "translate(0,-60) scale(0.55)")
        if has(n, "hollow"): return g.ammo_set("hollow")
        if has(n, "armor penetrating", "armour penetrating"): return g.ammo_set("point")
        if has(n, "reaper"): return g.bullet(-40, 20, 1.0) + g.bullet(40, 20, 1.0) + g.G(g.skull(), "translate(0,-6) scale(0.55)")
        return g.ammo_set("round")
    if t == "armour":
        if has(n, "flak coat"): return g.trench_coat()
        if has(n, "riot"): return g.riot_armor()
        if has(n, "praetorian"): return g.helmet(visor="slit")
        if has(n, "marine"): return g.helmet(chevron=True, visor="wide")
        if has(n, "combat suit"): return g.combat_suit()
        if has(n, "body plate"): return g.body_plate()
        if has(n, "belt"): return g.belt()
        if has(n, "clothes"): return g.clothes()
        return g.body_plate()
    if t == "augmentation":
        if has(n, "n-wire"): return g.nwire()
        if has(n, "cybernetic limb"): return g.cyber_arm()
        if has(n, "optic"): return g.eye()
        if has(n, "concealment"): return g.eye(reticle=False, crossed=True)
        if has(n, "subdermal"): return g.hex_plates()
        if has(n, "data coil"): return g.coil()
        if has(n, "polymorph, lesser"): return g.masks(1)
        if has(n, "polymorph, advanced"): return g.masks(3)
        if has(n, "polymorph"): return g.masks(2)
        if has(n, "metabolic"): return g.heart_pulse()
        if has(n, "bestial dermis"): return g.claw_marks()
        if has(n, "bestial upgrade"): return g.fang()
        if has(n, "bestial appendage"): return g.appendage()
        if has(n, "oni"): return g.stack_head("dot")
        if has(n, "biojack"): return g.jack()
        if has(n, "carbon fiber", "skeletal"): return g.skeleton()
        if has(n, "neurachem"):
            marks = {
                "military": g.P("M-26,-14 L0,0 L26,-14 M-26,0 L0,14 L26,0", "f"),
                "speed": g.P("M-30,-10 L20,-10 M-36,4 L26,4 M-30,18 L14,18", "s"),
                "congenial": g.P("M-22,0 Q0,22 22,0", "s"),
                "combat": g.P("M-20,-20 L20,20 M20,-20 L-20,20", "s"),
                "reflex": g.bolt(0, 0, 0.55),
                "cognition": g.gear(18, 13, 8, 6),
            }
            key = next((k for k in marks if k in n), "combat")
            return g.brain(g.G(marks[key], "translate(0,-4)"))
        return g.brain()
    if t == "drug":
        if has(n, "regrowth"): return g.syringe() + g.P("M40,30 C60,10 80,20 76,40 C60,50 44,44 40,30 Z", "f")
        if has(n, "tetrameth"): return g.crystals()
        if has(n, "merge", "empathin"): return g.merge()
        if has(n, "reaper", "bethanatine"): return g.vial(g.G(g.skull(), "translate(0,-6) scale(0.35)"))
        if has(n, "soma"): return g.moon_pill()
        if has(n, "stallion"): return g.capsule(g.bolt(46, -46, 0.5))
        if has(n, "lethinol"): return g.vial(g.P("M0,-30 C-14,-10 -14,4 0,4 C14,4 14,-10 0,-30 Z", "s"))
        return g.capsule()
    if t == "software":
        if has(n, "interrogation", "virus"): return g.code_brackets(g.G(g.virus(), "scale(0.85)"))
        if has(n, "intel", "instructional"): return g.book()
        if has(n, "psychosurgery"): return g.psychosurgery()
        return g.code_brackets()
    if t == "equipment":
        if has(n, "upgrade kit"): return g.upgrade_kit()
        if has(n, "grav-harness"): return g.harness()
        if has(n, "data storage"): return g.chip()
        if has(n, "deck, portable"): return g.deck(True)
        if n == "deck": return g.deck()
        if has(n, "d.e.", "power cell"): return g.battery(True)
        if has(n, "battery"): return g.battery()
        if has(n, "drone"): return g.drone()
        if has(n, "tool kit"): return g.toolkit()
        if has(n, "chassis"): return g.chassis()
        if has(n, "bio welder"): return g.welder()
        if has(n, "surveillance bug"): return g.bug()
        return g.chip()
    return g.chip()

def scale_for(e):
    n = e["name"].lower(); t = e["type"]
    if t in ("threat", "network", "vehicle"): return 1.62
    if has(n, "derringer"): return 2.0
    if has(n, "throwing"): return 1.5
    if t == "weapon" and has(n, "sidearm", "steyr", "pistol", "357", "grenade", "knuckles"): return 1.85
    if t == "ammunition": return 1.8
    if t == "weapon" and has(n, "rifle", "railgun", "nemesis", "sunjet", "shotgun", "slugthrower", "ak", "blaster"): return 1.55
    return 1.68

def rng_for(name):
    return random.Random(int(hashlib.sha1(name.encode()).hexdigest()[:12], 16))

def rain(rnd, n=34, color="#9fb6c8"):
    out = []
    for _ in range(n):
        x = rnd.uniform(-40, 552); y = rnd.uniform(-40, 520); ln = rnd.uniform(18, 60)
        op = rnd.uniform(0.05, 0.22)
        out.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x-ln*0.28:.1f}" y2="{y+ln:.1f}" stroke="{color}" stroke-width="1.4" opacity="{op:.2f}"/>')
    return "".join(out)

def poly(cx, cy, r, sides, rot=0):
    return " ".join(f"{cx + r*math.cos(rot + 2*math.pi*i/sides):.1f},{cy + r*math.sin(rot + 2*math.pi*i/sides):.1f}" for i in range(sides))

def frame(kind, accent, rnd):
    """Returns (clip_shape, frame_markup) in 512 space."""
    if kind == "network":
        pts = poly(256, 236, 206, 6, math.pi / 6)
        inner = poly(256, 236, 188, 6, math.pi / 6)
        clip = f'<polygon points="{pts}"/>'
        mk = f'<polygon points="{pts}" fill="none" stroke="{accent}" stroke-width="6" filter="url(#glow)"/>'
        mk += f'<polygon points="{inner}" fill="none" stroke="{accent}" stroke-width="1.5" opacity=".55"/>'
        for i in range(6):
            a = math.pi / 6 + 2 * math.pi * i / 6
            mk += f'<circle cx="{256 + 196*math.cos(a):.1f}" cy="{236 + 196*math.sin(a):.1f}" r="5" fill="{accent}"/>'
        return clip, mk
    if kind == "threat":
        d = "M70,40 L442,40 L472,70 L472,400 L442,430 L70,430 L40,400 L40,70 Z"
        clip = f'<path d="{d}"/>'
        mk = f'<path d="{d}" fill="none" stroke="{accent}" stroke-width="6" filter="url(#glow)"/>'
        mk += '<path d="M60,60 L452,60 L452,410 L60,410 Z" fill="none" stroke="#e9e3d4" stroke-width="1" opacity=".25"/>'
        # fingerprint whorls
        fx, fy = 380 + rnd.uniform(-20, 20), 330 + rnd.uniform(-20, 20)
        fp = "".join(f'<ellipse cx="{fx:.0f}" cy="{fy:.0f}" rx="{10+i*9}" ry="{14+i*11}" fill="none" stroke="#e9e3d4" stroke-width="1.2" opacity=".07" transform="rotate({rnd.uniform(-30,30):.0f} {fx:.0f} {fy:.0f})"/>' for i in range(8))
        return clip, fp + mk
    if kind == "vehicle":
        pts = poly(256, 236, 210, 8, math.pi / 8)
        clip = f'<polygon points="{pts}"/>'
        mk = f'<polygon points="{pts}" fill="none" stroke="{accent}" stroke-width="6" filter="url(#glow)"/>'
        mk += f'<polygon points="{poly(256, 236, 192, 8, math.pi / 8)}" fill="none" stroke="{accent}" stroke-width="1.5" opacity=".5"/>'
        return clip, mk
    # item: circular badge with seeded tick ring
    clip = '<circle cx="256" cy="236" r="208"/>'
    mk = f'<circle cx="256" cy="236" r="208" fill="none" stroke="{accent}" stroke-width="6" filter="url(#glow)"/>'
    mk += f'<circle cx="256" cy="236" r="190" fill="none" stroke="{accent}" stroke-width="1.5" opacity=".5"/>'
    ticks = rnd.choice([24, 36, 48, 60])
    skip = rnd.randint(0, ticks - 1)
    for i in range(ticks):
        if (i - skip) % ticks < ticks // 8:
            continue
        a = 2 * math.pi * i / ticks - math.pi / 2
        r1 = 196; r2 = 204 if i % 3 else 182
        mk += f'<line x1="{256 + r1*math.cos(a):.1f}" y1="{236 + r1*math.sin(a):.1f}" x2="{256 + r2*math.cos(a):.1f}" y2="{236 + r2*math.sin(a):.1f}" stroke="{accent}" stroke-width="2" opacity=".55"/>'
    return clip, mk

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def build(e, index_no):
    t = "upgrade" if e["pack"] == "weapon-upgrades" else e["type"]
    accent = ACCENT.get(t, "#32c7d6")
    kind = {"network": "network", "threat": "threat", "vehicle": "vehicle"}.get(e["type"], "item")
    rnd = rng_for(e["name"] + e["type"])
    clip, fr = frame(kind, accent, rnd)
    glyph = glyph_for(e)
    serial = f'{CODE.get(t, "AC")}-{index_no:03d}'
    name = e["name"].upper()
    fs = 36 if len(name) <= 14 else 31 if len(name) <= 20 else 27
    est = len(name) * fs * 0.6 + len(name) * 2
    tl = f' textLength="370" lengthAdjust="spacingAndGlyphs"' if est > 370 else ""
    glyph_scale = scale_for(e)
    stamp = ""
    if kind == "threat":
        stamp = f'<g transform="rotate(-8 140 92)"><rect x="70" y="72" width="150" height="38" fill="none" stroke="{accent}" stroke-width="3" opacity=".85"/><text x="145" y="99" text-anchor="middle" font-family="Courier New, monospace" font-weight="700" font-size="20" fill="{accent}" letter-spacing="3" opacity=".9">CASE FILE</text></g>'
    hue2 = rnd.choice(["#ff4fd8", "#32c7d6", "#ffb020", "#7fb2ff"]) if t not in ("threat",) else "#32c7d6"
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#1a1f2b"/><stop offset=".55" stop-color="#0b0d13"/><stop offset="1" stop-color="#030305"/></radialGradient>
<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hue2}" stop-opacity=".16"/><stop offset=".5" stop-color="{hue2}" stop-opacity="0"/><stop offset="1" stop-color="{accent}" stop-opacity=".14"/></linearGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="clip">{clip}</clipPath>
<style>.g{{fill:#0d1018;stroke:{accent};stroke-width:4.5;stroke-linejoin:round;stroke-linecap:round}}.s{{fill:none;stroke:{accent};stroke-width:4.5;stroke-linejoin:round;stroke-linecap:round}}.f{{fill:{accent};stroke:none}}.d{{fill:none;stroke:{accent};stroke-width:2;opacity:.55;stroke-linecap:round}}</style>
</defs>
<g clip-path="url(#clip)">
<rect width="512" height="512" fill="url(#bg)"/>
<rect width="512" height="512" fill="url(#haze)"/>
<g opacity=".5">{"".join(f'<line x1="0" y1="{y}" x2="512" y2="{y}" stroke="#ffffff" stroke-width="1" opacity=".035"/>' for y in range(6, 512, 6))}</g>
{rain(rnd)}
<ellipse cx="256" cy="330" rx="150" ry="22" fill="{accent}" opacity=".08"/>
</g>
{fr}
{stamp}
<g transform="translate(256 226) scale({glyph_scale})" filter="url(#soft)">{glyph}</g>
<g>
<path d="M66,402 L446,402 L462,424 L446,446 L66,446 L50,424 Z" fill="#07080c" stroke="{accent}" stroke-width="3"/>
<text x="256" y="{424 + fs*0.36:.0f}" text-anchor="middle" font-family="Bebas Neue, Oswald, Impact, 'Arial Narrow', sans-serif" font-size="{fs}" letter-spacing="2" fill="#f1ede4"{tl}>{esc(name)}</text>
</g>
<text x="256" y="472" text-anchor="middle" font-family="Courier New, monospace" font-size="13" letter-spacing="4" fill="{accent}" opacity=".8">{serial} // BAY CITY</text>
</svg>'''
    return svg

def main():
    entries = json.load(open(sys.argv[1])); out = sys.argv[2]; idx_path = sys.argv[3]
    folder = {"threat": "adversaries", "vehicle": "vehicles", "network": "networks"}
    counters = {}
    index = {}
    for e in sorted(entries, key=lambda x: (x["pack"], x["name"])):
        sub = folder.get(e["type"], "upgrades" if e["pack"] == "weapon-upgrades" else "items")
        t = "upgrade" if e["pack"] == "weapon-upgrades" else e["type"]
        counters[t] = counters.get(t, 0) + 1
        os.makedirs(f"{out}/{sub}", exist_ok=True)
        fn = f"{sub}/{slug(e['name'])}.svg"
        open(f"{out}/{fn}", "w").write(build(e, counters[t]))
        index[f"{e['type']}|{e['name']}"] = f"systems/altered-carbon-rpg/assets/emblems/{fn}"
    json.dump(index, open(idx_path, "w"), indent=1)
    print(len(index), "emblems")

if __name__ == "__main__":
    main()
