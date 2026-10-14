"""Bay City Street Vehicles: ground vehicles for car chases.
Usage: python3 vehicles.py OUT_DIR
Writes OUT_DIR/tokens/<slug>.svg (top-down, transparent, front = top edge, sized to the token footprint),
OUT_DIR/emblems/<slug>.svg (noir octagon badge like the system's other vehicles) and OUT_DIR/street-vehicles.json.
Stats sit on the Core Rulebook scale (Ground Car: Size 2, Durability 30, Structure 4, 3 Speed Dice,
Handling 2) and use the book's vehicle upgrades to justify each step (Improved Engine +1 Speed Die,
Stripped Frame -1 Structure/-10 Durability/+1 Speed Die/+1 Handling, Reinforced Hull +10 Durability, ...).
"""
import json, math, os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools'))
import emblems as EM

INK, BONE, BONE2, GLASS = '#0a0d10', '#ece4cf', '#b9ae95', '#121a22'
CY, RED, AMB, GOLD, TEAL, VIO, PINK, BLUE, GREEN = '#32c7d6', '#ff3b5c', '#ffb020', '#e8c66a', '#3fe0c5', '#b48cff', '#ff4fd8', '#7fb2ff', '#8be6b0'
PX = 256  # token pixels per grid square

def V(id, name, kind, accent, token, size, dur, st, vel, sd, fuel, hand, travel, cargo, pas, spec, systems, bio, art,
      fc=0, crew=(1, 1, 1), control='driver', ai=''):
    return dict(id=id, name=name, kind=kind, accent=accent, token=token, art=art,
                system=dict(vehicle=dict(size=size, durability=dur, structure=dict(value=st, max=st), velocity=vel, speedDice=sd,
                                         fuel=dict(value=fuel, max=fuel), crewSkeleton=crew[0], crewStandard=crew[1], crewFull=crew[2],
                                         handling=hand, fireControl=fc, travel=travel, cargo=cargo, passengers=pas,
                                         systems=systems, control=control, aiPilot=ai),
                            biography=f'{bio} <p><strong>Pilot:</strong> {spec} specialization. All checks in the vehicle take {{Pilot -1 per Size}} unless Fully Crewed.</p>'))

ROSTER = [
 # ------------------------------------------------------------------ two wheels
 V('SV01', 'Sprocket BMX', 'bike', AMB, (1, 2), 0, 3, 1, '20 ft or 90 degrees', 1, 0, 4, 'district', 0, 0, 'Bicycle',
   'Human-powered: no Fuel. Goes where cars cannot: stairs, rails, alleys, through crowds.',
   'A chromed street BMX with fat pegs and a gyro bar. Slow on the flat, unstoppable in the alleys.', dict(type='bmx')),
 V('SV02', 'Kick-Glide E-Scooter', 'bike', CY, (1, 2), 0, 3, 1, '25 ft or 90 degrees', 1, 2, 4, 'district', 0, 0, 'Scooter',
   'Folds to carry. Silent motor. Stands up to nothing.',
   'Rental-fleet standing scooter, unlocked with a stolen code more often than a paid one.', dict(type='scooter')),
 V('SV03', 'Courier E-Bike', 'bike', GREEN, (1, 2), 0, 5, 1, '30 ft or 60 degrees', 2, 3, 3, 'district', 3, 0, 'Bicycle',
   'Pedal-assist motor; rear cargo rack and insulated box.',
   'The workhorse of Bay City\'s food and package couriers. Every rider knows every shortcut.', dict(type='ebike')),
 V('SV04', 'Vespina Mag-Scoot', 'bike', PINK, (1, 2), 1, 8, 2, '40 ft or 60 degrees', 2, 4, 3, 'city', 1, 1, 'Motorcycle',
   'Step-through mag-drive moped; pillion seat; top box.',
   'Pastel retro shell over a mag-drive motor. Looks harmless, which is the point.', dict(type='moped')),
 V('SV05', 'Hillcrawler Scrambler', 'bike', AMB, (1, 2), 1, 10, 2, '50 ft or 60 degrees', 3, 4, 4, 'city', 1, 0, 'Motorcycle',
   'Off-road: rubble, parks, stairs and dry storm drains are open road.',
   'Long-travel dirt bike with knobbly tyres. The Twin Peaks switchbacks are its home turf.', dict(type='dirt')),
 V('SV06', 'Kestrel Street Bike', 'bike', BLUE, (1, 2), 1, 10, 2, '60 ft or 45 degrees', 3, 5, 3, 'city', 1, 1, 'Motorcycle',
   'Naked street bike; pillion seat.',
   'The everyday city motorcycle: light, quick, forgiving, and parked outside every bar in Licktown.', dict(type='street')),
 V('SV07', 'Iron Saint Cruiser', 'bike', GOLD, (1, 2), 1, 15, 3, '60 ft or 30 degrees', 3, 6, 2, 'region', 2, 1, 'Motorcycle',
   'Reinforced Frame (+1 Structure); saddlebags; pillion seat.',
   'A long, low, heavy cruiser that would rather go through a roadblock than around it.', dict(type='cruiser')),
 V('SV08', 'BCPD Pursuit Bike', 'bike', BLUE, (1, 2), 1, 15, 3, '70 ft or 45 degrees', 4, 5, 3, 'city', 1, 0, 'Motorcycle',
   'Improved Engine (+1 Speed Die); Reinforced Frame (+1 Structure); light bar, siren, BCPD comms and plate scanner.',
   'Bay City Police Department pursuit motorcycle. Where one appears, an Interceptor is rarely far behind.', dict(type='police')),
 V('SV09', 'Corvo Diavolo Superbike', 'bike', RED, (1, 2), 1, 10, 2, '80 ft or 45 degrees', 4, 5, 4, 'city', 0, 1, 'Motorcycle',
   'Improved Engine (+1 Speed Die); race-tuned chassis (+1 Handling); twin headlights; pillion perch.',
   'Italian-pattern superbike with a blood-red fairing and a howl you hear three blocks away.', dict(type='superbike')),
 V('SV10', 'Lumen Hubless Hyperbike', 'bike', PINK, (1, 2), 1, 5, 1, '100 ft or 30 degrees', 5, 4, 3, 'city', 0, 0, 'Motorcycle',
   'Improved Engine (+1 Speed Die); Stripped Frame (+1 Speed Die, -1 Structure, -5 Durability); twitchy hubless steering keeps Handling at 3; glowing hubless rims.',
   'A single blade of carbon and light between two hubless neon rings. The fastest thing on Bay City\'s streets that is not flying, and the most fragile.', dict(type='hyper')),
 # ------------------------------------------------------------------ four wheels
 V('SV11', 'Fairway Runabout', 'car', GREEN, (1.5, 2), 1, 10, 2, '20 ft or 60 degrees', 1, 4, 2, 'district', 2, 3, 'Automobile',
   'Electric golf cart: canopy roof, rear-facing bench, open sides (anyone can jump on or off).',
   'Resort and campus runabout. In a chase it is a joke, until you need to get four people across the Presidio lawns.', dict(type='golf')),
 V('SV12', 'Bubble Pod City Car', 'car', TEAL, (1.5, 2), 1, 15, 2, '40 ft or 60 degrees', 2, 6, 3, 'city', 1, 1, 'Automobile',
   'Two-seat microcar; fits gaps and alleys most cars cannot.',
   'Egg-shaped two-seat city pod. Turns on a coin and parks sideways.', dict(type='pod')),
 V('SV13', 'Bay City Autocab', 'car', AMB, (2, 3), 2, 25, 3, '50 ft or 45 degrees', 2, 10, 2, 'city', 3, 4, 'Automobile',
   'Autopilot (Pilot +3 gear bonus); AI-driven by default; partition screen; fare meter.',
   'The yellow self-driving cab of Bay City. The AI will obey traffic law unless someone pulls its override.', dict(type='cab'),
   control='ai', ai='AUTOCAB DISPATCH'),
 V('SV14', 'Kitsu Rally Hatch', 'car', BLUE, (2, 3), 2, 25, 3, '60 ft or 45 degrees', 4, 8, 3, 'city', 3, 3, 'Automobile',
   'Improved Engine (+1 Speed Die); rally suspension (+1 Handling); roof rack.',
   'A boxy hot hatch with a turbo, a roof light pod and a reputation in the Mission street races.', dict(type='hatch')),
 V('SV15', 'Haulback Pickup', 'car', AMB, (2, 4), 2, 35, 4, '50 ft or 45 degrees', 3, 12, 2, 'region', 8, 4, 'Automobile',
   'Off-road; Hauler; two seats in the cab, two riders in the open bed (exposed to fire).',
   'A tall, scarred work truck from the Dogpatch yards. The bed has carried scrap, crates and the occasional body.', dict(type='pickup')),
 V('SV16', 'Courier Panel Van', 'car', CY, (2, 4), 3, 35, 4, '40 ft or 30 degrees', 2, 12, 1, 'region', 14, 2, 'Automobile',
   'Hauler; windowless load bay with rear doors (riders in the back cannot see out).',
   'Unmarked panel van. Every crew in Bay City owns one; nobody remembers seeing it.', dict(type='van')),
 V('SV17', 'Revenant V-12 Muscle Car', 'car', RED, (2, 3), 2, 35, 4, '70 ft or 30 degrees', 4, 10, 2, 'city', 3, 3, 'Automobile',
   'Improved Engine (+1 Speed Die); heavy steel body (+5 Durability); hood blower.',
   'A restored pre-Settlement muscle car: all straight-line power and very little interest in corners.', dict(type='muscle')),
 V('SV18', 'BCPD Interceptor', 'car', BLUE, (2, 3), 2, 40, 5, '70 ft or 45 degrees', 4, 10, 3, 'city', 3, 3, 'Automobile',
   'Improved Engine (+1 Speed Die); Reinforced Hull (+10 Durability); Reinforced Frame (+1 Structure); pursuit suspension (+1 Handling); light bar, siren, rear prisoner cage.',
   'Bay City Police Department pursuit car. Black and bone with blue strobes; the rear seats lock from outside.', dict(type='police')),
 V('SV19', 'Kitsune GT Coupe', 'car', VIO, (2, 3), 2, 25, 3, '80 ft or 45 degrees', 4, 8, 4, 'region', 2, 1, 'Automobile',
   'Improved Engine (+1 Speed Die); active aero and torque vectoring (+2 Handling).',
   'A low, smooth grand tourer for people who want to arrive at the Spire quickly and be seen doing it.', dict(type='coupe')),
 V('SV20', 'Cerberus Supercharged Roadster', 'car', GOLD, (2, 3), 2, 20, 3, '90 ft or 30 degrees', 5, 8, 3, 'city', 1, 1, 'Automobile',
   'Improved Engine x2 (supercharger, +2 Speed Dice); fibreglass body (-10 Durability, -1 Structure, +1 Handling); open top (occupants exposed to fire); no driver aids; side-exit exhausts.',
   'A hand-built British-pattern roadster: an enormous supercharged engine under a very long bonnet, two seats, no roof and no driver aids. It is the fastest car in the city and it wants to kill whoever is driving it.', dict(type='roadster')),
 V('SV21', 'Dune Skiff Buggy', 'car', AMB, (1.5, 2.5), 1, 15, 2, '60 ft or 60 degrees', 3, 6, 4, 'city', 1, 1, 'Automobile',
   'Off-road; open roll cage (occupants exposed to fire); jumps kerbs, parks and rubble.',
   'A tube-frame dune buggy. It treats a kerb as a ramp and a park as a shortcut.', dict(type='buggy')),
 V('SV22', 'Meth Stretch Limousine', 'car', GOLD, (2, 5), 3, 50, 5, '40 ft or 30 degrees', 2, 14, 1, 'region', 6, 6, 'Automobile',
   'Reinforced Hull x2 (+20 Durability); Reinforced Frame (+1 Structure); Autopilot (Pilot +3 gear bonus); privacy glass; bar.',
   'Armoured stretch limousine of the kind that carries Meths between the Spire and the Bay. The chauffeur may be human or AI.', dict(type='limo'),
   control='both', ai='CHAUFFEUR'),
 V('SV23', 'CTAC Rhino Armoured Car', 'car', RED, (3, 4), 3, 60, 7, '40 ft or 30 degrees', 2, 16, 1, 'region', 8, 6, 'Military vehicle',
   'Reinforced Hull x3 (+30 Durability); Reinforced Frame x3 (+3 Structure); Guided Weaponry (+1 Fire Control); roof turret (Gunner seat).',
   'Colonial Tactical Assault Corps six-wheeled armoured car. When this joins a chase, the chase is usually over.', dict(type='apc'),
   fc=2, crew=(1, 2, 2)),
]

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def f(v): return f'{v:.1f}'

# ------------------------------------------------------------------ geometry helpers (token px)
def chaikin(pts, n=3, closed=True):
    for _ in range(n):
        out = []
        m = len(pts)
        for i in range(m if closed else m - 1):
            a, b = pts[i], pts[(i + 1) % m]
            out += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        pts = out
    return pts

def path(pts, close=True): return 'M' + ' L'.join(f'{f(x)},{f(y)}' for x, y in pts) + (' Z' if close else '')

class Draw:
    def __init__(self, w, h, acc):
        self.W, self.H, self.acc = w * PX, h * PX, acc
        self.cx = self.W / 2
        self.under, self.body, self.over = [], [], []

    def sym(self, profile, top, bottom, n=3):
        """profile: [(t, half-width px)] front→rear; returns a smoothed symmetric outline."""
        L = bottom - top
        right = [(self.cx + hw, top + t * L) for t, hw in profile]
        left = [(self.cx - hw, top + t * L) for t, hw in reversed(profile)]
        return chaikin(right + left, n)

    def poly(self, pts, fill, extra='', layer='body'):
        getattr(self, layer).append(f'<path d="{path(pts)}" fill="{fill}" {extra}/>')

    def rect(self, x, y, w, h, fill, rx=6, extra='', layer='body'):
        getattr(self, layer).append(f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{f(rx)}" fill="{fill}" {extra}/>')

    def line(self, x1, y1, x2, y2, c, w, extra='', layer='over'):
        getattr(self, layer).append(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="{c}" stroke-width="{f(w)}" stroke-linecap="round" {extra}/>')

    def circ(self, x, y, r, fill, extra='', layer='over'):
        getattr(self, layer).append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}" {extra}/>')

    def raw(self, s, layer='over'): getattr(self, layer).append(s)

    def lights(self, y, half, w=0.16, color='#f4fbff', cone=True):
        """Headlights at the front edge, with a soft beam above."""
        lw = self.W * w if w < 1 else w
        for sx in (-1, 1):
            x = self.cx + sx * half - lw / 2
            if cone:
                self.raw(f'<path d="M{f(x)},{f(y)} L{f(x + lw)},{f(y)} L{f(x + lw / 2 + sx * lw * .9 + lw * .9)},{f(max(2, y - self.H * .09))} L{f(x + lw / 2 + sx * lw * .9 - lw * .9)},{f(max(2, y - self.H * .09))} Z" fill="url(#beam)" opacity=".8"/>', 'under')
            self.rect(x, y - 3, lw, 9, color, 4, 'filter="url(#glow)"', 'over')

    def tails(self, y, half, w=0.14):
        lw = self.W * w
        for sx in (-1, 1):
            self.rect(self.cx + sx * half - lw / 2, y - 6, lw, 8, RED, 3, 'filter="url(#glow)"', 'over')

    def svg(self):
        acc = self.acc
        shadow = ''.join(self.body).replace(BONE, '#000').replace(BONE2, '#000').replace(GLASS, '#000').replace(INK, '#000')
        return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{f(self.W)}" height="{f(self.H)}" viewBox="0 0 {f(self.W)} {f(self.H)}">
<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f4fbff" stop-opacity=".55"/><stop offset="1" stop-color="#f4fbff" stop-opacity="0"/></linearGradient></defs>
<g transform="translate(7 9)" opacity=".5" filter="url(#blur)">{shadow}</g>
{''.join(self.under)}{''.join(self.body)}{''.join(self.over)}</svg>'''

# ------------------------------------------------------------------ bikes (1 x 2 squares: 256 x 512 px)
def wheel(d, y, r, half, kind='tyre'):
    if kind == 'hubless':
        d.raw(f'<ellipse cx="{f(d.cx)}" cy="{f(y)}" rx="{f(half)}" ry="{f(r)}" fill="{INK}" stroke="{d.acc}" stroke-width="7" filter="url(#glow)"/>', 'body')
        return
    d.rect(d.cx - half, y - r, half * 2, r * 2, '#1a1f26', half * .9, f'stroke="{INK}" stroke-width="3"')
    if kind == 'knobby':
        for k in range(-3, 4):
            d.line(d.cx - half, y + k * r / 4, d.cx + half, y + k * r / 4, '#3a414b', 3, '', 'body')
    else:
        d.line(d.cx, y - r + 8, d.cx, y + r - 8, '#3a414b', 3, '', 'body')

def bike(spec, acc):
    d = Draw(1, 2, acc); t = spec['type']; W, H, cx = d.W, d.H, d.cx
    top, bot = 46, H - 30
    if t == 'bmx':
        wheel(d, top + 58, 58, 13); wheel(d, bot - 58, 58, 13)
        d.line(cx, top + 70, cx, bot - 70, BONE, 16, '', 'body'); d.line(cx - 18, bot - 150, cx + 18, bot - 150, BONE, 12, '', 'body')
        d.line(cx - 70, top + 78, cx + 70, top + 78, BONE, 12, '', 'body')  # bars
        d.line(cx - 50, top + 92, cx + 50, top + 92, BONE2, 8, '', 'body')   # crossbar
        for y in (top + 58, bot - 58): d.line(cx - 32, y, cx + 32, y, acc, 9, '', 'over')  # pegs
        d.rect(cx - 14, bot - 175, 28, 60, BONE2, 10)
        d.circ(cx - 70, top + 78, 9, acc); d.circ(cx + 70, top + 78, 9, acc)
        return d
    if t == 'scooter':
        wheel(d, top + 40, 36, 12); wheel(d, bot - 40, 36, 12)
        d.rect(cx - 30, top + 90, 60, H - 260, BONE, 18)
        d.rect(cx - 22, top + 110, 44, H - 300, '#2a3038', 10)
        for k in range(8): d.line(cx - 14, top + 125 + k * 28, cx + 14, top + 125 + k * 28, '#454c56', 4, '', 'over')
        d.line(cx, top + 36, cx, top + 96, BONE, 12, '', 'body'); d.line(cx - 64, top + 50, cx + 64, top + 50, BONE, 12, '', 'body')
        d.rect(cx - 30, top + 240, 60, 10, acc, 4, '', 'over'); d.lights(top + 22, 0, 0.12)
        d.tails(bot - 8, 0, .1)
        return d
    if t == 'hyper':
        wheel(d, top + 70, 70, 30, 'hubless'); wheel(d, bot - 70, 70, 30, 'hubless')
        body = d.sym([(0, 6), (.15, 20), (.35, 46), (.55, 40), (.8, 22), (1, 10)], top + 40, bot - 40)
        d.poly(body, BONE)
        d.poly(d.sym([(0, 4), (.3, 20), (.6, 14), (1, 4)], top + 120, top + 260), GLASS)
        d.line(cx, top + 270, cx, bot - 120, acc, 6, 'filter="url(#glow)"')
        d.line(cx - 52, top + 130, cx + 52, top + 130, BONE2, 9, '', 'body')
        d.lights(top + 20, 0, 0.1, acc); d.tails(bot - 30, 0, .12)
        return d
    tyre = 'knobby' if t == 'dirt' else 'tyre'
    rf, rr = (56, 60) if t not in ('cruiser',) else (52, 66)
    wheel(d, top + rf, rf, 20 if t != 'cruiser' else 24, tyre); wheel(d, bot - rr, rr, 24 if t != 'cruiser' else 30, tyre)
    prof = {
        'ebike': [(0, 16), (.2, 18), (.5, 18), (.8, 22), (1, 20)],
        'moped': [(0, 40), (.12, 46), (.3, 30), (.55, 42), (.85, 48), (1, 40)],
        'dirt': [(0, 20), (.2, 36), (.45, 34), (.75, 26), (1, 16)],
        'street': [(0, 22), (.18, 40), (.38, 52), (.6, 40), (.85, 30), (1, 18)],
        'cruiser': [(0, 28), (.15, 36), (.35, 48), (.6, 44), (.85, 54), (1, 40)],
        'police': [(0, 40), (.15, 56), (.35, 54), (.62, 44), (.85, 58), (1, 46)],
        'superbike': [(0, 14), (.12, 44), (.32, 60), (.55, 44), (.82, 30), (1, 12)],
    }[t]
    body = d.sym(prof, top + 50, bot - 50)
    d.poly(body, BONE)
    bars = {'cruiser': 92, 'dirt': 84, 'police': 78, 'superbike': 58, 'moped': 70, 'ebike': 72, 'street': 76}[t]
    bar_y = top + 112 if t != 'superbike' else top + 150
    d.line(cx - bars, bar_y + (14 if t == 'cruiser' else 0), cx, bar_y - 6, BONE, 11, '', 'body')
    d.line(cx + bars, bar_y + (14 if t == 'cruiser' else 0), cx, bar_y - 6, BONE, 11, '', 'body')
    d.circ(cx - bars, bar_y + (14 if t == 'cruiser' else 0), 8, INK); d.circ(cx + bars, bar_y + (14 if t == 'cruiser' else 0), 8, INK)
    # seat + tank
    if t in ('street', 'cruiser', 'police', 'superbike'):
        d.poly(d.sym([(0, 22), (.5, 34), (1, 20)], top + 150, top + 245), BONE2)        # tank
        d.line(cx, top + 160, cx, top + 236, acc, 8, 'filter="url(#glow)"')
    seat_top = {'moped': top + 230, 'ebike': top + 250, 'dirt': top + 190}.get(t, top + 255)
    d.poly(d.sym([(0, 18), (.4, 26), (1, 20)], seat_top, seat_top + 120), INK)
    if t == 'superbike':
        d.poly(d.sym([(0, 6), (.3, 30), (.7, 36), (1, 26)], top + 60, top + 150), GLASS)   # screen
        d.lights(top + 52, 16, 0.08, '#f4fbff'); d.tails(bot - 52, 0, .12)
        d.line(cx - 40, top + 330, cx - 22, bot - 90, acc, 7, 'opacity=".9"'); d.line(cx + 40, top + 330, cx + 22, bot - 90, acc, 7, 'opacity=".9"')
        d.rect(cx - 18, bot - 108, 36, 30, '#2a3038', 8)   # underseat exhaust
    elif t == 'police':
        d.rect(cx - 62, bot - 190, 26, 88, BONE2, 8); d.rect(cx + 36, bot - 190, 26, 88, BONE2, 8)  # panniers
        d.rect(cx - 46, bot - 92, 40, 12, BLUE, 4, 'filter="url(#glow)"', 'over'); d.rect(cx + 6, bot - 92, 40, 12, RED, 4, 'filter="url(#glow)"', 'over')
        d.poly(d.sym([(0, 20), (.5, 44), (1, 40)], top + 50, top + 120), GLASS)
        d.raw(f'<text x="{f(cx)}" y="{f(top + 330)}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="22" fill="{INK}" transform="rotate(-90 {f(cx)} {f(top + 330)})">BCPD</text>')
        d.lights(top + 50, 0, 0.12); d.tails(bot - 52, 0, .1)
    elif t == 'cruiser':
        d.rect(cx - 66, bot - 200, 28, 96, BONE2, 12); d.rect(cx + 38, bot - 200, 28, 96, BONE2, 12)
        for sx in (-1, 1): d.line(cx + sx * 50, top + 300, cx + sx * 56, bot - 40, '#c9cdd2', 8, '', 'over')  # pipes
        d.lights(top + 50, 0, 0.16, '#fff3c4'); d.tails(bot - 50, 0, .12)
    elif t == 'moped':
        d.rect(cx - 40, bot - 140, 80, 80, BONE2, 14); d.rect(cx - 30, bot - 128, 60, 10, acc, 4, '', 'over')
        d.poly(d.sym([(0, 30), (1, 34)], top + 96, top + 150), GLASS)
        d.lights(top + 52, 0, 0.14); d.tails(bot - 54, 0, .14)
    elif t == 'ebike':
        d.rect(cx - 16, top + 150, 32, 90, acc, 8, 'opacity=".85"')   # battery
        d.rect(cx - 52, bot - 200, 104, 110, BONE2, 10); d.rect(cx - 40, bot - 188, 80, 86, INK, 6)
        d.raw(f'<text x="{f(cx)}" y="{f(bot - 140)}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="20" fill="{acc}">EAT</text>')
        d.lights(top + 52, 0, 0.1); d.tails(bot - 86, 0, .1)
    elif t == 'dirt':
        d.rect(cx - 34, top + 40, 68, 46, BONE2, 10); d.raw(f'<text x="{f(cx)}" y="{f(top + 74)}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="26" fill="{INK}">77</text>', 'over')
        d.rect(cx - 24, bot - 110, 48, 70, BONE2, 10)
        d.line(cx + 34, top + 290, cx + 40, bot - 110, '#c9cdd2', 8, '', 'over')
        d.lights(top + 40, 0, 0.1); d.tails(bot - 42, 0, .08)
    else:  # street
        d.line(cx - 34, top + 300, cx - 42, bot - 70, '#c9cdd2', 8, '', 'over')
        d.lights(top + 50, 0, 0.13); d.tails(bot - 52, 0, .12)
    return d

# ------------------------------------------------------------------ cars
def car(spec, acc, token):
    w, h = token
    d = Draw(w, h, acc); t = spec['type']; W, H, cx = d.W, d.H, d.cx
    m = 26 if H < 800 else 30
    top, bot = m + 18, H - m
    L = bot - top
    hw = W / 2 - 14
    def y(tt): return top + tt * L
    # wheels (partly hidden under the body)
    axles = {'golf': (.2, .78), 'pod': (.22, .78), 'limo': (.12, .9), 'apc': (.16, .52, .86), 'van': (.14, .86), 'pickup': (.16, .82),
             'roadster': (.2, .82), 'buggy': (.2, .8)}.get(t, (.18, .82))
    ww, wl = (W * .13, L * (.13 if h <= 3 else .1))
    if t == 'buggy': ww = W * .17
    for a in axles:
        for sx in (-1, 1):
            x = cx + sx * (hw - ww * .35) - ww / 2
            d.rect(x, y(a) - wl / 2, ww, wl, '#1a1f26', 10, f'stroke="{INK}" stroke-width="3"', 'under')
            d.line(x + 6, y(a), x + ww - 6, y(a), '#3a414b', 3, '', 'under')
    def body(profile, fill=BONE, n=3):
        d.poly(d.sym([(tt, hw * k) for tt, k in profile], top, bot, n), fill)
    def glass(profile, a, b, fill=GLASS):
        pts = d.sym([(tt, hw * k) for tt, k in profile], y(a), y(b), 2); d.poly(pts, fill)
    stripes = False
    if t == 'golf':
        body([(0, .78), (.06, .9), (.5, .92), (.94, .9), (1, .8)])
        d.rect(cx - hw * .82, y(.24), hw * 1.64, L * .56, '#ded5bd', 18, f'stroke="{INK}" stroke-width="3" stroke-opacity=".35"')  # canopy
        d.line(cx - hw * .82, y(.52), cx + hw * .82, y(.52), INK, 3, 'opacity=".35"')
        d.rect(cx - hw * .7, y(.82), hw * 1.4, L * .1, INK, 6)   # rear bench / bag rack
        for k in range(2): d.rect(cx - hw * .5 + k * hw * .62, y(.84), hw * .38, L * .06, acc, 6, '', 'over')
        d.lights(y(0) + 6, hw * .55, .12)
    elif t == 'pod':
        body([(0, .6), (.12, .9), (.5, 1), (.88, .92), (1, .62)], n=4)
        glass([(0, .55), (.3, .8), (1, .78)], .1, .44)
        d.rect(cx - hw * .7, y(.46), hw * 1.4, L * .3, BONE2, 30)
        glass([(0, .7), (1, .5)], .78, .92)
        d.line(cx - hw * .95, y(.5), cx - hw * .95, y(.7), acc, 6, 'filter="url(#glow)"'); d.line(cx + hw * .95, y(.5), cx + hw * .95, y(.7), acc, 6, 'filter="url(#glow)"')
        d.lights(y(.03), hw * .6, .1); d.tails(y(.985), hw * .55, .12)
    elif t in ('cab', 'hatch', 'police', 'muscle', 'coupe'):
        prof = {'cab': [(0, .8), (.05, .93), (.5, .97), (.95, .93), (1, .82)],
                'hatch': [(0, .82), (.05, .94), (.5, .98), (.96, .95), (1, .88)],
                'police': [(0, .8), (.05, .93), (.5, .98), (.95, .94), (1, .84)],
                'muscle': [(0, .82), (.04, .95), (.3, .97), (.55, .9), (.85, .98), (1, .88)],
                'coupe': [(0, .5), (.08, .86), (.3, .96), (.55, .88), (.8, .99), (1, .72)]}[t]
        body(prof)
        cab = {'cab': (.3, .72), 'hatch': (.28, .86), 'police': (.32, .74), 'muscle': (.42, .76), 'coupe': (.36, .74)}[t]
        a, b = cab
        glass([(0, .6), (1, .8)], a, a + .12)                         # windscreen
        d.rect(cx - hw * .76, y(a + .12), hw * 1.52, L * (b - a - .22), BONE2 if t != 'police' else '#2a3038', 22)  # roof
        glass([(0, .8), (1, .62)], b - .1, b)                          # rear window
        for sx in (-1, 1):
            d.line(cx + sx * hw * .86, y(a + .12), cx + sx * hw * .86, y(b - .1), GLASS, 9, '', 'body')  # side glass
        if t == 'cab':
            d.rect(cx - hw * .3, y(a + .27), hw * .6, L * .06, AMB, 6, 'filter="url(#glow)"', 'over')
            d.raw(f'<text x="{f(cx)}" y="{f(y(a + .27) + L * .045)}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="{f(L*.032)}" fill="{INK}">TAXI</text>')
            for k in range(6): d.rect(cx - hw * .95 + k * hw * .32, y(.18), hw * .16, L * .02, INK, 2, '', 'over')
            d.poly(d.sym([(tt, hw * k) for tt, k in prof], top, bot), AMB, 'opacity=".22"', 'over')
        if t == 'hatch':
            d.rect(cx - hw * .6, y(a + .16), hw * 1.2, L * .26, 'none', 8, f'stroke="{INK}" stroke-width="7"', 'over')  # roof rack
            for k in range(4): d.circ(cx - hw * .45 + k * hw * .3, y(.04), 12, '#fff8d8', 'filter="url(#glow)"')
            stripes = True
        if t == 'police':
            d.rect(cx - hw * .7, y(a + .2), hw * .68, L * .045, BLUE, 6, 'filter="url(#glow)"', 'over')
            d.rect(cx + hw * .02, y(a + .2), hw * .68, L * .045, RED, 6, 'filter="url(#glow)"', 'over')
            d.raw(f'<text x="{f(cx)}" y="{f(y(.2))}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="{f(L*.05)}" letter-spacing="4" fill="{INK}">BCPD</text>')
            d.rect(cx - hw * .85, y(.0) - 4, hw * 1.7, 12, '#2a3038', 4, '', 'over')  # push bar
        if t == 'muscle':
            d.rect(cx - hw * .22, y(.12), hw * .44, L * .16, '#c9cdd2', 10, f'stroke="{INK}" stroke-width="4"', 'over')  # blower
            for k in range(3): d.line(cx - hw * .14, y(.15) + k * L * .04, cx + hw * .14, y(.15) + k * L * .04, INK, 4)
            stripes = True
        if t == 'coupe':
            d.line(cx - hw * .9, y(.92), cx + hw * .9, y(.92), INK, 10, '', 'over')  # active wing
            d.line(cx - hw * .9, y(.92), cx + hw * .9, y(.92), acc, 3, 'filter="url(#glow)"')
        d.lights(y(.015), hw * .62, .12); d.tails(y(.99), hw * .66, .16)
    elif t == 'roadster':
        prof = [(0, .55), (.05, .82), (.2, .97), (.45, .9), (.7, .96), (.88, .98), (1, .78)]
        body(prof)
        for sx in (-1, 1): d.line(cx + sx * hw * .45, y(.06), cx + sx * hw * .38, y(.5), BONE2, 5, '', 'body')  # long bonnet lines
        d.rect(cx - hw * .28, y(.16), hw * .56, L * .1, INK, 14, '', 'over')  # supercharger intake
        d.rect(cx - hw * .22, y(.175), hw * .44, L * .07, acc, 10, 'filter="url(#glow)" opacity=".9"', 'over')
        glass([(0, .7), (1, .8)], .52, .58)    # low screen
        d.rect(cx - hw * .76, y(.6), hw * 1.52, L * .2, INK, 20)  # open cockpit
        for sx in (-1, 1): d.rect(cx + sx * hw * .38 - hw * .28, y(.62), hw * .56, L * .16, '#5a2a1e', 16)  # leather seats
        d.rect(cx - hw * .1, y(.63), hw * .2, L * .13, '#2a3038', 6)
        d.rect(cx - hw * .9, y(.81), hw * 1.8, L * .05, BONE2, 10)  # roll hoops / deck
        for sx in (-1, 1):  # side-exit exhausts
            d.line(cx + sx * hw * 1.0, y(.46), cx + sx * hw * 1.0, y(.56), '#c9cdd2', 10, '', 'over')
        stripes = True
        d.lights(y(.03), hw * .5, .1, '#fff3c4'); d.tails(y(.99), hw * .56, .14)
    elif t == 'buggy':
        d.rect(cx - hw * .7, top + 20, hw * 1.4, L - 40, '#2a3038', 20)   # floor pan
        cage = [(cx - hw * .78, y(.18)), (cx + hw * .78, y(.18)), (cx + hw * .78, y(.82)), (cx - hw * .78, y(.82))]
        d.raw(f'<path d="{path(cage)}" fill="none" stroke="{BONE}" stroke-width="16" stroke-linejoin="round"/>', 'body')
        d.line(cx - hw * .78, y(.18), cx + hw * .78, y(.82), BONE, 10, '', 'body'); d.line(cx + hw * .78, y(.18), cx - hw * .78, y(.82), BONE, 10, '', 'body')
        d.line(cx - hw * .78, y(.5), cx + hw * .78, y(.5), BONE, 12, '', 'body')
        d.rect(cx - hw * .6, y(.02), hw * 1.2, L * .12, BONE, 14)   # nose
        d.rect(cx - hw * .5, y(.88), hw * 1.0, L * .1, BONE2, 10)   # engine
        for sx in (-1, 1): d.rect(cx + sx * hw * .32 - hw * .22, y(.32), hw * .44, L * .14, INK, 10, '', 'over')
        for k in range(4): d.circ(cx - hw * .45 + k * hw * .3, y(.2), 11, '#fff8d8', 'filter="url(#glow)"')
        d.tails(y(.99), hw * .4, .12)
    elif t in ('pickup', 'van', 'limo'):
        prof = {'pickup': [(0, .86), (.04, .97), (.5, 1), (1, .96)], 'van': [(0, .84), (.04, .97), (.5, 1), (1, .97)],
                'limo': [(0, .78), (.04, .93), (.5, .96), (.96, .93), (1, .8)]}[t]
        body(prof)
        if t == 'pickup':
            glass([(0, .7), (1, .82)], .2, .27)
            d.rect(cx - hw * .82, y(.27), hw * 1.64, L * .17, BONE2, 18)
            glass([(0, .82), (1, .82)], .44, .47)
            d.rect(cx - hw * .84, y(.5), hw * 1.68, L * .46, '#2a3038', 10)   # open bed
            for k in range(5): d.line(cx - hw * .84 + k * hw * .42, y(.52), cx - hw * .84 + k * hw * .42, y(.94), '#3c434d', 4)
            d.rect(cx - hw * .5, y(.6), hw * .55, L * .12, '#7a6a48', 6, '', 'over')   # crate
            d.rect(cx - hw * .8, y(.0) - 4, hw * 1.6, 14, '#2a3038', 5, '', 'over')
            for k in range(4): d.circ(cx - hw * .45 + k * hw * .3, y(.23), 10, '#fff8d8', 'filter="url(#glow)"')
        elif t == 'van':
            glass([(0, .78), (1, .88)], .04, .14)
            d.rect(cx - hw * .9, y(.16), hw * 1.8, L * .8, '#ded5bd', 12)
            for k in range(1, 6): d.line(cx - hw * .9, y(.16 + k * .13), cx + hw * .9, y(.16 + k * .13), INK, 3, 'opacity=".3"')
            d.line(cx, y(.9), cx, y(.995), INK, 4, 'opacity=".6"')
            d.raw(f'<text x="{f(cx)}" y="{f(y(.55))}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="{f(L*.03)}" letter-spacing="3" fill="{INK}" opacity=".45" transform="rotate(-90 {f(cx)} {f(y(.55))})">BAY RELIABLE COURIER</text>')
        else:  # limo
            glass([(0, .62), (1, .8)], .2, .27)
            d.rect(cx - hw * .78, y(.27), hw * 1.56, L * .58, '#1c2129', 22)   # privacy-glass roof
            for k in (.42, .6): d.line(cx - hw * .78, y(k), cx + hw * .78, y(k), acc, 3, 'opacity=".6"')
            d.circ(cx - hw * .5, y(.08), 9, GOLD); d.circ(cx + hw * .5, y(.08), 9, GOLD)   # pennant posts
            glass([(0, .8), (1, .62)], .85, .9)
        d.lights(y(.01), hw * .66, .12); d.tails(y(.99), hw * .7, .14)
    elif t == 'apc':
        prof = [(0, .7), (.06, .92), (.5, .98), (1, .94)]
        body(prof, '#cfc6ad')
        d.poly(d.sym([(tt, hw * k * .82) for tt, k in prof], top + L * .04, bot - L * .04, 2), BONE2)
        d.circ(cx, y(.52), W * .2, '#3a3a34', f'stroke="{INK}" stroke-width="5"', 'over')   # turret
        d.rect(cx - 10, y(.52) - W * .2 - L * .3, 20, L * .32, '#2a2e33', 6, '', 'over')      # gun
        d.rect(cx - hw * .5, y(.07), hw, L * .05, GLASS, 6, '', 'over')                       # vision slits
        for k in range(3):
            for sx in (-1, 1): d.rect(cx + sx * hw * .8 - hw * .1, y(.3 + k * .2), hw * .2, L * .1, INK, 4, 'opacity=".4"', 'over')
        d.raw(f'<text x="{f(cx)}" y="{f(y(.86))}" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="{f(L*.05)}" letter-spacing="6" fill="{RED}">CTAC</text>')
        d.lights(y(.01), hw * .6, .1, '#fff3c4'); d.tails(y(.99), hw * .7, .12)
    if stripes:
        stripe = [f'<rect x="{f(cx + sx * hw * .14 - hw * .07)}" y="{f(top + 4)}" width="{f(hw * .14)}" height="{f(L - 8)}" rx="4" fill="{acc}" opacity=".75"/>' for sx in (-1, 1)]
        d.body[1:1] = stripe   # over the paint, under the cabin, cockpit and glass
    return d

def draw(v):
    return bike(v['art'], v['accent']) if v['kind'] == 'bike' else car(v['art'], v['accent'], v['token'])

# ------------------------------------------------------------------ emblem: the token drawing, nose to the right, in the octagon badge
def emblem(v, n):
    d = draw(v)
    inner = ''.join(d.under) + ''.join(d.body) + ''.join(d.over)
    s = 300 / max(d.W, d.H)          # longest side ~300 badge units
    glyph = f'<g transform="rotate(90) scale({s:.4f}) translate({-d.W/2:.1f} {-d.H/2:.1f})">{inner}</g>'
    EM.glyph_for = lambda e: glyph
    EM.scale_for = lambda e: 1.0
    svg = EM.build(dict(name=v['name'], type='vehicle', pack='street-vehicles'), n)
    defs = '<filter id="blur"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f4fbff" stop-opacity=".55"/><stop offset="1" stop-color="#f4fbff" stop-opacity="0"/></linearGradient>'
    svg = svg.replace('<defs>', '<defs>' + defs, 1).replace(f'VEH-{n:03d}', f'SV-{n:02d} · CHASE')
    return svg.replace(' filter="url(#soft)"', '')

def main(out):
    os.makedirs(out + '/tokens', exist_ok=True); os.makedirs(out + '/emblems', exist_ok=True)
    data = []
    for i, v in enumerate(ROSTER, 1):
        sl = slug(v['name'])
        open(f'{out}/tokens/{sl}.svg', 'w').write(draw(v).svg())
        open(f'{out}/emblems/{sl}.svg', 'w').write(emblem(v, i))
        w, h = v['token']
        data.append(dict(id=v['id'], name=v['name'], kind=v['kind'], slug=sl, token=dict(width=w, height=h),
                         img=f'systems/altered-carbon-rpg/assets/emblems/vehicles/street/{sl}.svg',
                         tokenImg=f'systems/altered-carbon-rpg/assets/tokens/vehicles/{sl}.webp',
                         system=v['system']))
    json.dump(dict(source='Bay City Street Vehicles (system supplement, built on Core Rulebook vehicle rules pp.257-259)',
                   count=len(data), vehicles=data), open(f'{out}/street-vehicles.json', 'w'), indent=1)
    print(len(data), 'vehicles')

if __name__ == '__main__':
    main(sys.argv[1])
