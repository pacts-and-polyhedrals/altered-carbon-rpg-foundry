"""Glyph library for Altered Carbon noir emblems.
Every glyph draws in a box roughly -90..90 on both axes, centred on (0,0).
Glyphs return SVG fragments that use the CSS classes:
  .g  = neon stroke outline (accent), dark fill
  .s  = neon stroke only, no fill
  .f  = solid accent fill
  .d  = dim secondary stroke
"""
import math

def P(d, cls="g"):
    return f'<path class="{cls}" d="{d}"/>'

def C(x, y, r, cls="g"):
    return f'<circle class="{cls}" cx="{x}" cy="{y}" r="{r}"/>'

def R(x, y, w, h, cls="g", rx=0):
    return f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'

def L(x1, y1, x2, y2, cls="s"):
    return f'<line class="{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'

def G(inner, t=""):
    return f'<g transform="{t}">{inner}</g>' if t else inner

def bolt(x=0, y=0, s=1.0, cls="f"):
    return G(P("M6,-40 L-16,4 L-2,4 L-10,40 L16,-6 L2,-6 Z", cls), f"translate({x},{y}) scale({s})")

# ---------------------------------------------------------------- weapons
def pistol(extra=""):
    body = P("M-62,-34 L58,-34 L64,-26 L64,-14 L-6,-14 L-14,40 L-44,40 L-36,-14 L-62,-14 Z")
    guard = P("M-6,-14 Q-2,12 -24,12", "s")
    slide = L(-50, -24, 50, -24, "d")
    return body + guard + slide + extra

def revolver():
    body = P("M-66,-30 L40,-30 L40,-14 L-4,-14 L-12,40 L-42,40 L-34,-14 L-66,-14 Z")
    cyl = R(2, -38, 34, 30, "g", 6) + L(8, -30, 30, -30, "d") + L(8, -16, 30, -16, "d")
    return body + cyl + P("M-4,-14 Q0,10 -22,10", "s")

def derringer():
    return G(P("M-40,-26 L44,-26 L44,-4 L-4,-4 L-10,36 L-36,36 L-28,-4 L-40,-4 Z") +
             L(-30, -15, 40, -15, "d") + P("M-4,-4 Q0,14 -18,14", "s"), "scale(1.05)")

def flechette():
    return pistol(L(64, -24, 88, -30, "s") + L(64, -24, 90, -22, "s") + L(64, -24, 88, -14, "s"))

def shard_pistol():
    return pistol(P("M66,-30 L90,-24 L66,-18 Z", "f") + P("M74,-40 L86,-34", "s") + P("M74,-8 L86,-14", "s"))

def rifle(scope=False, mag=True, bipod=False, long=False):
    x2 = 92 if long else 84
    body = P(f"M-90,-22 L-56,-28 L{x2-30},-28 L{x2-30},-22 L{x2},-22 L{x2},-14 L{x2-30},-14 L{x2-30},-10 L12,-10 L6,8 L-8,8 L-4,-10 L-30,-10 L-44,22 L-66,22 L-58,-6 L-90,-2 Z")
    out = body
    if mag:
        out += P("M16,-10 L28,30 L42,26 L32,-10", "g")
    if scope:
        out += R(-30, -46, 54, 12, "g", 4) + L(-22, -34, -22, -28, "s") + L(14, -34, 14, -28, "s")
    if bipod:
        out += L(x2-40, -14, x2-58, 36, "s") + L(x2-40, -14, x2-22, 36, "s")
    return out

def smg():
    return G(P("M-64,-28 L50,-28 L50,-12 L10,-12 L4,6 L-8,6 L-4,-12 L-20,-12 L-28,36 L-48,36 L-40,-12 L-64,-12 Z") +
             P("M10,-12 L14,40 L28,40 L24,-12", "g") + L(50, -20, 70, -20, "s") + P("M-64,-24 L-84,-24 L-84,-8 L-64,-12", "s"), "scale(1.1)")

def shotgun():
    return P("M-92,-18 L-58,-28 L88,-28 L88,-18 L-20,-18 L-30,-10 L-44,20 L-66,20 L-58,-6 L-92,-2 Z") + \
        R(10, -18, 48, 12, "g", 4) + L(16, -12, 52, -12, "d") + L(-50, -23, 84, -23, "d")

def energy_rifle(coils=3):
    out = rifle(mag=False)
    for i in range(coils):
        out += C(10 + i * 18, -19, 9, "s")
    out += L(84, -18, 100, -18, "s")
    return out

def blaster():
    out = pistol()
    out += C(30, -24, 12, "s") + C(30, -24, 5, "f") + L(64, -20, 96, -20, "s") + L(70, -30, 92, -38, "d") + L(70, -10, 92, -2, "d")
    return out

def railgun():
    out = P("M-90,-30 L70,-30 L70,-22 L-60,-22 Z") + P("M-90,-6 L70,-6 L70,2 L-60,2 Z")
    out += P("M-60,-22 L-60,-6 M-20,-22 L-20,-6 M20,-22 L20,-6", "s")
    out += P("M-40,2 L-52,38 L-30,38 L-22,2", "g")
    out += P("M74,-26 Q86,-14 74,-2", "s") + P("M80,-30 Q98,-14 80,2", "d")
    return out

def grenade(kind="frag"):
    body = C(0, 14, 44)
    out = body + R(-14, -42, 28, 16, "g", 3) + P("M14,-38 Q48,-50 46,-8", "s") + C(-26, -40, 10, "s")
    if kind == "frag":
        out += L(-44, 14, 44, 14, "d") + L(0, -30, 0, 58, "d") + L(-30, -16, 30, 44, "d") + L(30, -16, -30, 44, "d")
    elif kind == "stun":
        out += bolt(0, 16, 0.75)
    elif kind == "termite":
        out += P("M0,40 C-24,20 -4,6 -8,-12 C10,2 24,18 0,40 Z", "f")
    elif kind == "halluc":
        out += P("M-22,14 a22,22 0 1,1 44,0 a14,14 0 1,1 -28,0 a7,7 0 1,1 14,0", "s")
    return out

def dispenser():
    out = R(-70, -24, 140, 48, "g", 22)
    for i in range(4):
        out += C(-48 + i * 32, 0, 13, "s")
    out += L(-70, 34, 70, 34, "d")
    return out

def knife(guard=True):
    blade = P("M-8,-88 L10,-88 L12,10 L-12,10 Z")
    blade = P("M0,-90 C16,-60 14,-20 12,6 L-10,6 L-10,-60 Z")
    g = R(-26, 6, 52, 10, "g", 3) if guard else ""
    handle = R(-9, 16, 18, 52, "g", 4) + L(-9, 30, 9, 30, "d") + L(-9, 46, 9, 46, "d")
    return G(blade + g + handle, "rotate(40)")

def sword():
    blade = P("M-5,-96 L5,-96 C9,-40 8,0 7,22 L-7,22 C-8,0 -9,-40 -5,-96 Z")
    guard = R(-20, 22, 40, 8, "g", 4)
    handle = R(-6, 30, 12, 50, "g", 3) + L(-6, 42, 6, 54, "d") + L(-6, 54, 6, 66, "d")
    return G(blade + guard + handle, "rotate(45)")

def staff():
    return G(R(-6, -96, 12, 192, "g", 6) + R(-9, -60, 18, 16, "f", 3) + R(-9, 44, 18, 16, "f", 3) + R(-8, -8, 16, 16, "d", 3), "rotate(45)")

def baton():
    return G(R(-8, -84, 16, 168, "g", 7) + R(-8, -10, 40, 14, "g", 5) + R(24, -10, 12, 36, "g", 5) + L(-8, -60, 8, -60, "d") + L(-8, 60, 8, 60, "d"), "rotate(35)")

def knuckles(force=False):
    out = ""
    for i in range(4):
        out += C(-45 + i * 30, -10, 15)
    out += P("M-62,8 Q0,46 62,8 L62,20 Q0,62 -62,20 Z")
    if force:
        out += P("M-70,-40 L-56,-30 L-66,-22 L-50,-14", "s") + P("M70,-40 L56,-30 L66,-22 L50,-14", "s")
    return out

def hammer():
    return G(R(-46, -78, 92, 42, "g", 6) + R(-8, -36, 16, 114, "g", 4) + L(-46, -57, 46, -57, "d") +
             P("M-62,-90 L-52,-80 M62,-90 L52,-80 M-66,-30 L-54,-36 M66,-30 L54,-36", "s"), "rotate(-30)")

def shuriken():
    out = ""
    for a in (0, 120, 240):
        out += G(P("M0,-6 L-14,-30 L0,-84 L14,-30 Z"), f"rotate({a} -22 10) translate(-22 10)")
    out2 = ""
    for i, (x, y) in enumerate([(-30, 20), (12, -10), (40, 40)]):
        out2 += G(P("M-6,-46 L6,-46 L8,20 L-8,20 Z") + R(-10, 20, 20, 24, "g", 3), f"translate({x},{y}) rotate({30 + i * 10}) scale(0.9)")
    return out2

# ---------------------------------------------------------------- ammunition
def bullet(x=0, y=0, s=1.0, tip="round", cls="g"):
    tips = {
        "round": "M-10,-20 C-10,-44 10,-44 10,-20",
        "point": "M-10,-20 L0,-52 L10,-20",
        "hollow": "M-10,-20 C-10,-42 -4,-44 -4,-36 L4,-36 C4,-44 10,-42 10,-20",
        "flat": "M-10,-20 L-8,-36 L8,-36 L10,-20",
    }
    d = tips[tip] + " L10,40 L-10,40 Z"
    return G(P(d, cls) + L(-10, -20, 10, -20, "d") + R(-12, 30, 24, 10, "g", 2), f"translate({x},{y}) scale({s})")

def shell(x=0, y=0, s=1.0, mark=""):
    out = R(-16, -46, 32, 70, "g", 6) + R(-18, 24, 36, 22, "g", 3) + L(-18, 32, 18, 32, "d")
    return G(out + mark, f"translate({x},{y}) scale({s})")

def ammo_set(tip="round", extra=""):
    return bullet(-34, 10, 1.15, tip) + bullet(0, -4, 1.3, tip) + bullet(34, 10, 1.15, tip) + extra

def shell_set(mark=""):
    return shell(-26, 6, 1.05, mark) + shell(26, 6, 1.05, mark)

def plasma_cell():
    return R(-30, -60, 60, 110, "g", 10) + R(-14, -72, 28, 12, "g", 3) + C(0, -4, 20, "s") + C(0, -4, 9, "f") + L(-30, 30, 30, 30, "d")

def emp_mark(s=1.0):
    return G(C(0, 0, 30, "s") + bolt(0, 0, 0.6), f"scale({s})")

# ---------------------------------------------------------------- armour
def trench_coat():
    d = ("M-30,-80 L30,-80 L50,-60 L64,60 L22,70 L10,-30 L0,-50 L-10,-30 L-22,70 L-64,60 L-50,-60 Z")
    return P(d) + P("M-30,-80 L0,-40 L30,-80", "s") + L(-36, 0, -14, 0, "d") + L(36, 0, 14, 0, "d") + C(-8, -10, 3, "f") + C(-8, 10, 3, "f")

def riot_armor():
    return P("M-60,-70 L60,-70 L60,10 C60,50 20,76 0,86 C-20,76 -60,50 -60,10 Z") + R(-44, -48, 88, 22, "s", 6) + \
        L(-40, 0, 40, 0, "d") + L(-30, 30, 30, 30, "d") + P("M-20,-48 L-20,-26 M20,-48 L20,-26", "d")

def body_plate():
    return P("M-60,-70 L-24,-70 Q0,-54 24,-70 L60,-70 L66,-30 L46,-24 L46,70 L-46,70 L-46,-24 L-66,-30 Z") + \
        L(0, -50, 0, 70, "d") + L(-46, 10, 46, 10, "d") + L(-46, 40, 46, 40, "d")

def belt():
    return R(-90, -14, 180, 28, "g", 4) + R(-24, -26, 48, 52, "g", 6) + R(-12, -14, 24, 28, "s", 3) + \
        L(-70, 0, -40, 0, "d") + L(40, 0, 70, 0, "d") + C(54, 0, 3, "f") + C(66, 0, 3, "f")

def clothes():
    return P("M-24,-70 L24,-70 L70,-46 L58,-10 L40,-18 L40,70 L-40,70 L-40,-18 L-58,-10 L-70,-46 Z") + \
        P("M-24,-70 L0,-40 L24,-70", "s") + P("M0,-40 L-8,-28 L0,30 L8,-28 Z", "f")

def combat_suit():
    return P("M-18,-86 L18,-86 L22,-60 L50,-52 L60,10 L46,12 L38,-22 L30,0 L34,86 L8,86 L0,20 L-8,86 L-34,86 L-30,0 L-38,-22 L-46,12 L-60,10 L-50,-52 L-22,-60 Z") + \
        L(-30, -10, 30, -10, "d") + L(-22, -40, 22, -40, "d")

def helmet(chevron=False, visor="slit"):
    out = P("M-60,20 C-62,-50 -30,-80 0,-80 C30,-80 62,-50 60,20 L48,60 L-48,60 Z")
    if visor == "slit":
        out += P("M-46,-14 L46,-14 L40,6 L-40,6 Z", "f")
    else:
        out += P("M-44,-24 L44,-24 L30,14 L-30,14 Z", "s") + L(-36, -6, 36, -6, "d")
    out += L(-30, 34, 30, 34, "d") + L(0, 20, 0, 58, "d")
    if chevron:
        out += P("M-24,-60 L0,-46 L24,-60", "s") + P("M-24,-50 L0,-36 L24,-50", "s")
    return out

# ---------------------------------------------------------------- equipment
def chip():
    out = R(-44, -44, 88, 88, "g", 6) + R(-22, -22, 44, 44, "s", 3)
    for i in range(-30, 31, 15):
        out += L(i, -44, i, -62, "s") + L(i, 44, i, 62, "s") + L(-44, i, -62, i, "s") + L(44, i, 62, i, "s")
    return out

def deck(portable=False):
    if portable:
        return R(-40, -70, 80, 140, "g", 10) + R(-28, -56, 56, 60, "s", 4) + "".join(
            R(-26 + c * 18, 16 + r * 16, 14, 10, "d", 2) for r in range(3) for c in range(3))
    out = P("M-86,10 L86,10 L76,56 L-76,56 Z") + R(-60, -66, 120, 70, "g", 6) + R(-50, -56, 100, 50, "s", 3)
    out += P("M-40,-40 L-26,-32 L-40,-24 M-20,-24 L0,-24", "s")
    for r in range(2):
        out += L(-66 + r * 6, 24 + r * 14, 66 - r * 6, 24 + r * 14, "d")
    return out

def drone():
    out = R(-22, -16, 44, 32, "g", 8) + C(0, 0, 7, "f")
    for x, y in ((-56, -40), (56, -40), (-56, 40), (56, 40)):
        out += L(x * 0.4, y * 0.4, x, y, "s") + f'<ellipse class="s" cx="{x}" cy="{y}" rx="28" ry="7"/>'
    return out

def toolkit():
    wrench = G(P("M-8,-60 L8,-60 L8,40 C26,46 26,76 8,82 L8,66 L-8,66 L-8,82 C-26,76 -26,46 -8,40 Z"), "rotate(45)")
    driver = G(R(-9, -84, 18, 50, "g", 4) + P("M-4,-34 L4,-34 L3,60 L0,70 L-3,60 Z"), "rotate(-45)")
    return wrench + driver

def upgrade_kit():
    gear = ""
    teeth = 8
    pts = []
    for i in range(teeth * 2):
        a = math.pi * 2 * i / (teeth * 2)
        r = 50 if i % 2 == 0 else 38
        pts.append(f"{r*math.cos(a):.1f},{r*math.sin(a):.1f}")
    gear = P("M" + " L".join(pts) + " Z") + C(0, 0, 16, "s")
    return gear + P("M40,40 L76,76", "s") + P("M70,58 L58,70 L82,94 L94,82 Z", "f")

def gear(r1=50, r2=38, teeth=8, hole=16, x=0, y=0):
    pts = []
    for i in range(teeth * 2):
        a = math.pi * 2 * i / (teeth * 2)
        r = r1 if i % 2 == 0 else r2
        pts.append(f"{x + r*math.cos(a):.1f},{y + r*math.sin(a):.1f}")
    return P("M" + " L".join(pts) + " Z") + C(x, y, hole, "s")

def battery(power=False):
    out = R(-36, -60, 72, 124, "g", 8) + R(-14, -72, 28, 12, "g", 3)
    if power:
        out += bolt(0, 2, 0.95)
    else:
        out += R(-24, 20, 48, 30, "f", 3) + R(-24, -12, 48, 26, "s", 3) + L(-24, -30, 24, -30, "d")
    return out

def harness():
    out = P("M-40,-80 L-30,60 M40,-80 L30,60", "s") + P("M-46,-10 L46,-10", "s") + R(-14, -22, 28, 24, "g", 4)
    out += P("M-74,40 L-64,20 L-54,40 M-74,64 L-64,44 L-54,64 M54,40 L64,20 L74,40 M54,64 L64,44 L74,64", "s")
    out += P("M-40,60 Q0,90 40,60", "s")
    return out

def welder():
    return G(R(-14, -10, 28, 90, "g", 6) + P("M-10,-10 L-4,-60 L4,-60 L10,-10 Z") + L(-14, 20, 14, 20, "d"), "rotate(-35)") + \
        P("M44,-74 C30,-56 52,-50 40,-34 C62,-44 66,-66 44,-74 Z", "f") + L(30, -50, 18, -38, "s")

def bug():
    out = f'<ellipse class="g" cx="0" cy="10" rx="30" ry="42"/>' + C(0, -42, 16) + L(0, -30, 0, 52, "d")
    out += P("M-6,-56 L-22,-82 M6,-56 L22,-82", "s")
    for y in (-6, 14, 34):
        out += L(-30, y, -60, y - 14, "s") + L(30, y, 60, y - 14, "s")
    out += C(0, -42, 5, "f")
    return out

def chassis():
    return R(-70, -50, 140, 100, "s", 6) + L(-70, -50, 70, 50, "s") + L(70, -50, -70, 50, "s") + \
        R(-26, -18, 52, 36, "g", 4) + C(-70, -50, 6, "f") + C(70, -50, 6, "f") + C(-70, 50, 6, "f") + C(70, 50, 6, "f")

# ---------------------------------------------------------------- weapon upgrades
def crosshair(r=50, inner=True):
    out = C(0, 0, r, "s") + L(-r - 20, 0, -12, 0, "s") + L(12, 0, r + 20, 0, "s") + L(0, -r - 20, 0, -12, "s") + L(0, 12, 0, r + 20, "s")
    if inner:
        out += C(0, 0, r * 0.45, "d") + C(0, 0, 4, "f")
    return out

def scope(kind=""):
    out = R(-70, -18, 140, 36, "g", 16) + R(-82, -24, 22, 48, "g", 6) + R(60, -24, 22, 48, "g", 6) + R(-18, -36, 36, 18, "g", 4)
    if kind == "sniper":
        out += G(crosshair(20, False), "translate(0,56)")
    if kind == "long":
        out += L(-60, 40, 60, 40, "s") + P("M50,32 L60,40 L50,48", "s")
    return out

def barrel_ext():
    return R(-90, -14, 90, 28, "g", 3) + R(0, -10, 80, 20, "g", 3) + P("M84,-16 L84,16", "s") + L(-60, 0, 60, 0, "d") + P("M16,-30 L40,-30 M30,-38 L40,-30 L30,-22", "s")

def stock_fold():
    return P("M-80,-30 L10,-30 L10,-10 L-50,-10 L-70,30 L-90,30 Z") + C(10, -20, 8, "s") + \
        P("M18,-20 Q60,-30 80,10", "s") + P("M70,0 L80,10 L86,-4", "s")

def laser_sight():
    return R(-70, -18, 70, 36, "g", 8) + C(-10, 0, 8, "f") + L(0, 0, 92, 0, "s") + C(92, 0, 5, "f") + L(-70, 30, -10, 30, "d")

def dna_lock():
    out = R(-34, -6, 68, 60, "g", 6) + P("M-22,-6 L-22,-32 C-22,-62 22,-62 22,-32 L22,-6", "s") + C(0, 22, 8, "f") + L(0, 22, 0, 40, "s")
    helix = ""
    for i in range(7):
        y = -70 + i * 22
        helix += L(-82, y, -54, y, "d")
    helix += P("M-82,-80 C-50,-50 -86,-20 -54,10 C-86,40 -50,70 -82,90", "s") + P("M-54,-80 C-86,-50 -50,-20 -82,10 C-50,40 -86,70 -54,90", "s")
    return out + helix

def layers():
    return P("M0,-70 L76,-34 L0,2 L-76,-34 Z") + P("M-76,-4 L0,32 L76,-4", "s") + P("M-76,26 L0,62 L76,26", "s")

def magazine(extended=False):
    h = 140 if extended else 100
    out = P(f"M-24,{-h/2} L24,{-h/2} L34,{h/2} L-14,{h/2} Z")
    for i in range(4 if not extended else 6):
        out += L(-16, -h / 2 + 18 + i * 18, 22, -h / 2 + 18 + i * 18, "d")
    out += bullet(0, -h / 2 - 18, 0.55, "round")
    return out

def magnet():
    return P("M-56,-20 L-56,10 C-56,64 56,64 56,10 L56,-20 L28,-20 L28,10 C28,30 -28,30 -28,10 L-28,-20 Z") + \
        R(-56, -50, 28, 30, "f", 2) + R(28, -50, 28, 30, "f", 2) + P("M-80,-70 L-70,-58 M80,-70 L70,-58 M0,-84 L0,-66", "s")

# ---------------------------------------------------------------- augmentations
def brain(mark=""):
    out = P("M0,-60 C-30,-74 -64,-56 -62,-24 C-82,-10 -74,26 -50,30 C-46,56 -14,62 0,46 C14,62 46,56 50,30 C74,26 82,-10 62,-24 C64,-56 30,-74 0,-60 Z")
    out += P("M0,-60 L0,46", "d") + P("M-40,-36 C-24,-30 -30,-10 -14,-6", "d") + P("M40,-36 C24,-30 30,-10 14,-6", "d") + P("M-46,10 C-30,4 -26,24 -10,20", "d") + P("M46,10 C30,4 26,24 10,20", "d")
    return out + mark

def eye(reticle=True, crossed=False):
    out = P("M-84,0 C-44,-50 44,-50 84,0 C44,50 -44,50 -84,0 Z") + C(0, 0, 26, "s") + C(0, 0, 10, "f")
    if reticle:
        out += L(0, -54, 0, -36, "s") + L(0, 36, 0, 54, "s") + L(-42, 0, -30, 0, "d") + L(30, 0, 42, 0, "d")
    if crossed:
        out += L(-70, 56, 70, -56, "s")
    return out

def cyber_arm():
    return P("M-70,-60 L-30,-74 L-10,-40 L-40,-26 Z") + P("M-28,-34 L30,10 L18,26 L-40,-18 Z") + C(-28, -30, 9, "s") + \
        P("M24,14 L54,10 L70,30 L66,40 L50,32 L56,48 L48,54 L38,36 L30,48 L22,44 Z") + L(-20, -16, 16, 14, "d")

def skeleton():
    out = L(0, -80, 0, 80, "s")
    for i in range(5):
        y = -56 + i * 22
        w = 56 - abs(i - 1.5) * 6
        out += P(f"M0,{y} C{-w*0.5},{y-6} {-w},{y+2} {-w},{y+14}", "s") + P(f"M0,{y} C{w*0.5},{y-6} {w},{y+2} {w},{y+14}", "s")
    out += P("M-24,70 L0,86 L24,70", "s") + C(0, -86, 6, "f")
    return out

def nwire():
    out = R(-6, -86, 12, 172, "d", 4)
    for i in range(7):
        out += R(-16, -76 + i * 24, 32, 12, "g", 4)
    out += P("M-60,-80 L-30,-56 L-56,-30 L-24,-4 L-52,24 L-20,50 L-44,80", "s")
    out += P("M60,-80 L30,-56 L56,-30 L24,-4 L52,24 L20,50 L44,80", "s")
    return out

def hex_plates():
    out = ""
    for (x, y) in ((0, 0), (-46, -26), (46, -26), (-46, 26), (46, 26), (0, -52), (0, 52)):
        pts = " L".join(f"{x + 24*math.cos(math.pi/3*i):.1f},{y + 24*math.sin(math.pi/3*i):.1f}" for i in range(6))
        out += P("M" + pts + " Z", "g" if (x, y) != (0, 0) else "f")
    return out

def coil():
    out = ""
    for i in range(6):
        out += f'<ellipse class="s" cx="0" cy="{-60 + i*24}" rx="44" ry="12"/>'
    out += L(-44, -60, -44, 60, "d") + L(44, -60, 44, 60, "d") + C(0, -84, 6, "f") + C(0, 84, 6, "f")
    return out

def masks(level=1):
    out = P("M-70,-40 C-70,-74 -14,-74 -14,-40 L-14,10 C-14,40 -70,40 -70,10 Z") + P("M14,-30 C14,-64 70,-64 70,-30 L70,20 C70,50 14,50 14,20 Z")
    out += P("M-56,-26 L-40,-24 M-30,-24 L-24,-26", "s") + P("M28,-16 L40,-14 M50,-14 L58,-16", "s") + P("M-54,14 Q-42,22 -30,14", "s") + P("M30,24 Q42,16 54,24", "s")
    arrows = P("M-30,60 Q0,80 30,60", "s") + P("M22,54 L30,60 L22,68", "s")
    out += arrows
    for i in range(level - 1):
        out += C(-20 + i * 40, -84, 6, "f")
    return out

def heart_pulse():
    return P("M0,60 C-80,10 -70,-60 -24,-60 C-10,-60 0,-48 0,-40 C0,-48 10,-60 24,-60 C70,-60 80,10 0,60 Z") + \
        P("M-86,0 L-40,0 L-28,-24 L-12,26 L4,-34 L16,0 L86,0", "s")

def claw_marks():
    return P("M-60,-80 C-40,-20 -40,20 -50,80 C-30,20 -26,-20 -60,-80 Z", "f") + P("M-10,-86 C10,-26 10,26 0,86 C22,26 24,-26 -10,-86 Z", "f") + \
        P("M40,-80 C60,-20 60,20 50,80 C70,20 72,-20 40,-80 Z", "f")

def fang():
    return P("M-70,-50 C-30,-70 30,-70 70,-50 L60,-30 L-60,-30 Z") + P("M-40,-30 L-28,40 L-16,-30 Z", "f") + P("M40,-30 L28,40 L16,-30 Z", "f") + \
        P("M-8,-30 L0,-6 L8,-30", "s")

def appendage():
    return P("M-70,70 C-70,0 -10,-10 10,-50 C20,-70 50,-80 60,-60", "s") + P("M60,-60 L84,-80 M60,-60 L86,-54 M60,-60 L74,-36", "s") + \
        P("M-80,70 L-60,70", "s") + C(-14, -10, 5, "f") + C(14, -40, 5, "f")

def stack_head(mark="dot"):
    out = P("M-40,80 L-40,50 C-74,36 -76,-30 -60,-54 C-40,-90 40,-90 60,-54 C76,-30 74,36 40,50 L40,80")
    if mark == "dot":
        out += C(0, -20, 18, "s") + C(0, -20, 7, "f")
    return out

def jack():
    return R(-20, -80, 40, 60, "g", 6) + R(-12, -20, 8, 30, "f") + R(4, -20, 8, 30, "f") + P("M0,-80 C0,-100 70,-96 70,-60 L70,-30", "s") + \
        P("M-50,40 L50,40 L50,80 L-50,80 Z") + R(-14, 46, 8, 18, "d") + R(6, 46, 8, 18, "d")

def cortical_stack():
    out = P("M-26,-70 L26,-70 L34,70 L-34,70 Z") + R(-20, -50, 40, 14, "s", 3) + R(-20, -24, 40, 14, "s", 3) + R(-20, 2, 40, 14, "f", 3) + R(-20, 28, 40, 14, "s", 3)
    return out

# ---------------------------------------------------------------- drugs / software
def capsule(mark=""):
    return G(R(-24, -70, 48, 140, "g", 24) + L(-24, 0, 24, 0, "s") + P("M-24,0 L-24,46 C-24,78 24,78 24,46 L24,0 Z", "f"), "rotate(35)") + mark

def syringe():
    return G(R(-12, -60, 24, 90, "g", 4) + L(0, 30, 0, 74, "s") + R(-22, -70, 44, 10, "g", 2) + R(-4, -96, 8, 26, "g") + R(-12, -10, 24, 40, "f", 2) +
             L(-12, -40, -4, -40, "d") + L(-12, -26, -4, -26, "d"), "rotate(40)")

def vial(mark=""):
    return P("M-18,-80 L18,-80 L18,-50 L40,30 C46,60 30,80 0,80 C-30,80 -46,60 -40,30 L-18,-50 Z") + R(-24, -92, 48, 14, "g", 3) + \
        P("M-36,24 C-14,14 14,34 38,24 L42,40 C46,62 30,76 0,76 C-30,76 -46,62 -42,40 Z", "f") + mark

def crystals():
    return P("M-10,70 L-40,10 L-20,-60 L10,-20 L0,70 Z") + P("M10,70 L30,-40 L50,-10 L46,60 Z") + P("M-50,70 L-66,30 L-50,0 L-34,40 Z", "f") + \
        L(-20, -60, -10, 70, "d")

def merge():
    return C(-28, 0, 46, "s") + C(28, 0, 46, "s") + P("M0,-38 C14,-24 14,24 0,38 C-14,24 -14,-24 0,-38 Z", "f")

def skull():
    return P("M-50,10 C-60,-60 60,-60 50,10 C50,26 36,30 32,40 L32,58 L-32,58 L-32,40 C-36,30 -50,26 -50,10 Z") + C(-20, -6, 13, "f") + C(20, -6, 13, "f") + \
        P("M0,14 L-7,30 L7,30 Z", "f") + L(-16, 44, -16, 58, "d") + L(0, 44, 0, 58, "d") + L(16, 44, 16, 58, "d")

def moon_pill():
    tablet = f'<ellipse class="g" cx="0" cy="34" rx="70" ry="30"/>' + P("M-70,34 L-70,46 C-70,86 70,86 70,46 L70,34", "s") + L(-40, 34, 40, 34, "s")
    moon = P("M10,-86 C-30,-80 -40,-24 -4,-6 C-34,-4 -54,-40 -40,-66 C-32,-80 -12,-88 10,-86 Z", "f")
    return tablet + moon + C(30, -60, 4, "f") + C(46, -30, 3, "f") + C(20, -24, 3, "f")

def code_brackets(inner=""):
    return P("M-56,-60 L-86,0 L-56,60", "s") + P("M56,-60 L86,0 L56,60", "s") + inner

def virus():
    out = C(0, 0, 30) + C(0, 0, 10, "f")
    for i in range(8):
        a = math.pi * 2 * i / 8
        x1, y1, x2, y2 = 30 * math.cos(a), 30 * math.sin(a), 50 * math.cos(a), 50 * math.sin(a)
        out += L(x1, y1, x2, y2, "s") + C(x2, y2, 6, "f")
    return out

def book():
    return P("M0,-50 C-30,-66 -60,-62 -80,-50 L-80,60 C-60,48 -30,48 0,62 Z") + P("M0,-50 C30,-66 60,-62 80,-50 L80,60 C60,48 30,48 0,62 Z") + \
        P("M-56,-20 L-66,-6 L-56,8 M-24,-20 L-14,-6 L-24,8 M-34,12 L-46,-24", "s") + L(18, -26, 62, -32, "d") + L(18, -8, 62, -14, "d") + L(18, 10, 62, 4, "d")

def psychosurgery():
    return stack_head("none") + P("M-30,-30 C-20,-50 20,-50 30,-30", "d") + G(R(-4, -20, 8, 70, "g", 2) + P("M-4,-20 L0,-50 L4,-20 Z", "f"), "translate(50,-30) rotate(-35)")

# ---------------------------------------------------------------- networks
def union():
    return gear(56, 44, 10, 20) + G(R(-8, -10, 16, 90, "g", 3) + R(-30, -30, 60, 26, "g", 4), "rotate(-35) translate(0,-20) scale(0.7)")

def columns():
    out = P("M-80,-36 L0,-80 L80,-36 Z") + R(-84, -36, 168, 12, "g") + R(-90, 62, 180, 16, "g")
    for x in (-60, -24, 12, 48):
        out += R(x, -18, 14, 74, "g", 2)
    return out

def police_badge(text=""):
    pts = []
    for i in range(14):
        a = -math.pi / 2 + math.pi * 2 * i / 14
        r = 80 if i % 2 == 0 else 58
        pts.append(f"{r*math.cos(a):.1f},{r*math.sin(a):.1f}")
    out = P("M" + " L".join(pts) + " Z") + C(0, 0, 40, "s")
    sp = []
    for i in range(10):
        a = -math.pi / 2 + math.pi * 2 * i / 10
        r = 26 if i % 2 == 0 else 11
        sp.append(f"{r*math.cos(a):.1f},{r*math.sin(a):.1f}")
    out += P("M" + " L".join(sp) + " Z", "f")
    return out

def figure_crown():
    return C(0, -26, 22) + P("M-50,80 C-50,20 50,20 50,80 Z") + P("M-24,-56 L-24,-76 L-12,-64 L0,-82 L12,-64 L24,-76 L24,-56 Z", "f")

def skyscraper():
    out = P("M-26,80 L-26,-56 L0,-90 L26,-56 L26,80 Z") + P("M-70,80 L-70,-10 L-30,-26 L-30,80 Z") + P("M30,80 L30,-30 L70,-14 L70,80 Z")
    for y in range(-40, 70, 18):
        out += L(-16, y, 16, y, "d")
    out += L(0, -90, 0, -104, "s")
    return out

def dagger_rose():
    rose = C(0, -8, 30) + P("M-14,-8 C-14,-26 14,-26 14,-8 C14,6 -4,6 -4,-4", "s")
    dagger = G(P("M-6,-96 L6,-96 L8,40 L-8,40 Z") + R(-30, 40, 60, 10, "g", 3) + R(-7, 50, 14, 36, "g", 3), "rotate(-30)")
    return dagger + rose + P("M0,22 C-30,40 -40,60 -60,64", "s")

def ctac():
    wings = P("M-10,-10 L-90,-40 L-80,-24 L-92,-16 L-76,-4 L-86,6 L-20,10 Z") + P("M10,-10 L90,-40 L80,-24 L92,-16 L76,-4 L86,6 L20,10 Z")
    return wings + G(helmet(visor="slit"), "translate(0,6) scale(0.42)") + P("M-30,50 L0,66 L30,50 M-30,64 L0,80 L30,64", "s")

# ---------------------------------------------------------------- adversaries
def suit_tie():
    return P("M-80,90 C-80,30 -50,10 -22,4 L0,40 L22,4 C50,10 80,30 80,90 Z") + P("M-22,4 L0,40 L22,4", "s") + P("M0,40 L-9,52 L0,90 L9,52 Z", "f") + \
        C(0, -38, 34) + R(-30, 60, 16, 4, "d")

def fedora(y=0):
    return G(P("M-80,10 C-60,22 60,22 80,10 C60,0 50,-2 46,-4 L40,-46 C20,-38 0,-56 -40,-46 L-46,-4 C-50,-2 -60,0 -80,10 Z") +
             P("M-44,-14 C-14,-8 14,-8 44,-14", "f"), f"translate(0,{y})")

def hitman():
    return fedora(-26) + P("M-46,-6 C-46,40 -20,60 0,60 C20,60 46,40 46,-6", "s") + G(crosshair(38, False), "translate(0,20) scale(0.9)") + \
        P("M-20,-6 L-10,-4", "d") + P("M10,-4 L20,-6", "d")

def thug():
    return C(0, -30, 36) + P("M-22,-34 L-6,-30 M6,-30 L22,-34", "s") + P("M-12,-6 L12,-6", "s") + \
        G(knuckles(), "translate(0,56) scale(0.7)")

def meth_tower():
    out = P("M-14,80 L-14,-50 L0,-74 L14,-50 L14,80 Z") + P("M-60,80 L-30,20 L-30,80 Z") + P("M60,80 L30,20 L30,80 Z")
    out += P("M-28,-84 L-28,-104 L-14,-92 L0,-110 L14,-92 L28,-104 L28,-84 Z", "f")
    out += f'<ellipse class="s" cx="0" cy="-30" rx="48" ry="10"/>' + L(-90, 80, 90, 80, "s")
    return out

def dipper():
    return cortical_stack() + G(syringe(), "translate(50,-40) scale(0.5)") + P("M0,70 C-6,84 6,84 0,96", "f")

def bcpd():
    cap = P("M-80,-20 C-70,-70 70,-70 80,-20 L60,-4 L-60,-4 Z") + P("M-62,-4 L62,-4 L70,14 C30,26 -30,26 -70,14 Z", "g")
    badge = G(police_badge(), "translate(0,-36) scale(0.28)")
    face = P("M-40,20 C-40,70 -16,86 0,86 C16,86 40,70 40,20", "s") + P("M-24,40 L-10,42 M10,42 L24,40", "s")
    return cap + badge + face

def freak():
    return P("M-56,-50 C-56,-90 56,-90 56,-50 L56,20 C56,64 20,86 0,86 C-20,86 -56,64 -56,20 Z") + C(-22, -16, 12, "f") + C(22, -16, 12, "f") + \
        P("M-6,-86 L4,-50 L-8,-20 L6,10 L-4,40 L4,86", "s") + P("M-30,44 L-20,38 L-10,46 L0,38 L10,46 L20,38 L30,44", "s") + \
        P("M-40,-60 L-30,-56 M40,-60 L30,-56", "d")

# ---------------------------------------------------------------- vehicles
def ground_car():
    return P("M-92,20 L-86,-6 L-50,-14 L-26,-42 L36,-42 L60,-14 L90,-6 L94,20 Z") + C(-54, 24, 16) + C(54, 24, 16) + \
        P("M-20,-36 L-40,-14 L0,-14 L0,-36 Z", "s") + P("M8,-36 L8,-14 L48,-14 L30,-36 Z", "s") + L(-100, 50, 100, 50, "d")

def aircar():
    return P("M-92,8 L-80,-14 L-40,-20 L-20,-46 L40,-46 L62,-20 L92,-12 L96,8 Z") + f'<ellipse class="g" cx="-54" cy="18" rx="26" ry="8"/>' + \
        f'<ellipse class="g" cx="54" cy="18" rx="26" ry="8"/>' + P("M-14,-40 L-30,-20 L10,-20 L10,-40 Z", "s") + \
        P("M-70,36 L-40,36 M-62,50 L-46,50 M40,36 L70,36 M46,50 L62,50", "s")

def airbike():
    return P("M-86,0 L-40,-26 L20,-30 L56,-14 L92,-10 L80,10 L-70,14 Z") + P("M-20,-30 L-6,-52 L14,-50", "s") + \
        f'<ellipse class="g" cx="-50" cy="22" rx="28" ry="7"/>' + f'<ellipse class="g" cx="50" cy="22" rx="28" ry="7"/>' + \
        P("M-64,40 L-36,40 M36,40 L64,40", "s")
