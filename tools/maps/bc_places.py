"""Bay City places: a zoned noir map for every named street block that has no map of its own.
Imported by link_maps.py, which links each place's exits to its street block.

make_place(name, district, accent, code, exits) -> coldstyle map spec
  exits: list of dicts {label, side ('left'|'right')} in order front, back.
Maps are 28 x 18 cells like the original Bay City maps. Zones follow a template; each archetype
names the zones and fills them with furniture from the shared coldstyle library.
"""
import random, re
INK, BONE, BONE2 = '#0a0d10', '#ece4cf', '#b9ae95'
RED, AMB = '#ff5a6e', '#ffc467'

# --------------------------------------------------------------------------- templates (cells)
# Every template keeps the bottom-right corner (x >= 19, y >= 14.6) free for the title cartouche,
# has a zone on the left edge (front exit) and one on the right edge (back exit).
TEMPLATES = {
 'rooms': dict(zones=[(1, 1, 9, 8), (10, 1, 17, 8), (1, 9, 9, 8), (10, 9, 9, 8), (19, 9, 8, 5)], left=(0, 2), right=(1, 4)),
 'hall':  dict(zones=[(1, 1, 26, 6), (1, 7, 8, 10), (9, 7, 10, 10), (19, 7, 8, 7)], left=(0, 1), right=(0, 3)),
 'open':  dict(zones=[(1, 1, 14, 16), (15, 1, 12, 7), (15, 8, 12, 6)], left=(0,), right=(1, 2)),
 'yard':  dict(zones=[(1, 1, 18, 11), (19, 1, 8, 6), (19, 7, 8, 7), (1, 12, 10, 5), (11, 12, 8, 5)], left=(0, 3), right=(1, 2)),
 'tower': dict(zones=[(1, 1, 8, 16), (9, 1, 10, 8), (19, 1, 8, 8), (9, 9, 10, 8), (19, 9, 8, 5)], left=(0,), right=(2, 4)),
}

# --------------------------------------------------------------------------- archetypes
# zones: names for the template's zones in order; fill: per-zone furniture recipe; notes: flavour labels.
A = {
 'habs':      dict(t='rooms', zones=['Lobby', 'Hab Units', 'Laundry Court', 'Stairwell Units', 'Roof Garden'],
                   fill=['desk_lobby', 'beds', 'crates', 'beds', 'garden'], notes=['BUZZER BOARD · HALF THE NAMES BURNED OUT', 'RENT IN ARREARS', 'WASHING LINES', 'TWO TO A BUNK', 'RAIN BARRELS']),
 'stacks':    dict(t='yard', zones=['Container Stacks', 'Ladder Shaft', 'Bridge Deck', 'Cook Fires', 'Lookout'],
                   fill=['containers', 'stairs', 'cars_wreck', 'tables', 'cover'], notes=['STACKED SIX HIGH', 'RUNG BY RUNG', 'ABANDONED TRAFFIC', 'SHARED POT', 'MARIN BLOCKADE IN VIEW']),
 'market':    dict(t='hall', zones=['Stall Hall', 'Food Court', 'Back Stores', 'Loading Bay'],
                   fill=['stalls', 'tables', 'crates', 'cars'], notes=['CASH · CHIT · CRED', 'NOODLES · SKEWERS · SYNTH', 'NO RECEIPTS', 'DELIVERIES ONLY']),
 'office':    dict(t='rooms', zones=['Lobby', 'Open Office', 'Records Room', 'Meeting Room', 'Executive Suite'],
                   fill=['desk_lobby', 'desks', 'cabinets', 'table_big', 'desk_exec'], notes=['VISITORS SIGN IN', 'HOT DESKS', 'PAPER STILL KEPT HERE', 'MINUTES NOT TAKEN', 'NO APPOINTMENT · NO ENTRY']),
 'vault':     dict(t='rooms', zones=['Banking Hall', 'Teller Line', 'Vault Antechamber', 'Strongroom', 'Manager\'s Office'],
                   fill=['pillars', 'teller', 'lockers', 'vault', 'desk_exec'], notes=['MARBLE · CRACKED', 'CLOSED SINCE THE COLLAPSE', 'DEPOSIT BOXES', 'TIME LOCK', 'PORTRAIT REMOVED']),
 'ruins':     dict(t='hall', zones=['Collapsed Hall', 'Broken Wing', 'Courtyard', 'Cellar Stair'],
                   fill=['rubble', 'rubble', 'garden', 'stairs'], notes=['ROOF OPEN TO THE RAIN', 'SCAVENGED TO THE STUDS', 'SQUATTERS\' FIRE PIT', 'GOES DOWN FURTHER THAN IT SHOULD']),
 'park':      dict(t='open', zones=['Lawns & Paths', 'Pavilion', 'Camp'],
                   fill=['park', 'bench_ring', 'camp'], notes=['TREES · REAL ONES', 'BANDSTAND', 'TARPS AND COOK FIRES']),
 'plaza':     dict(t='open', zones=['The Plaza', 'Colonnade', 'Memorial'],
                   fill=['plaza', 'pillars', 'memorial'], notes=['PROTEST PERMITS DENIED', 'PILLARS · SCAFFOLD', 'NAMES OF THE LOST']),
 'yard':      dict(t='yard', zones=['Yard', 'Gatehouse', 'Workshop', 'Fuel Bay', 'Parts Store'],
                   fill=['yard', 'console', 'workshop', 'pumps', 'crates'], notes=['FLOODLIT ALL NIGHT', 'SIGN IN · SIGN OUT', 'LIFTS · WELDERS', 'NO NAKED FLAMES', 'COUNTED · RECOUNTED']),
 'impound':   dict(t='yard', zones=['Impound Rows', 'Release Office', 'Crusher', 'Evidence Cage', 'Tow Bay'],
                   fill=['cars_rows', 'console', 'workshop', 'lockers', 'cars']),
 'scrap':     dict(t='yard', zones=['Scrap Mountains', 'Weigh Office', 'Crusher', 'Salvage Shed', 'Dogs\' Run'],
                   fill=['rubble_cars', 'console', 'workshop', 'crates', 'cover'], notes=['WE BUY ANYTHING', 'CASH BY WEIGHT', 'HYDRAULIC · 40 TONNES', 'SORTED · TAGGED', 'BEWARE']),
 'station':   dict(t='hall', zones=['Concourse', 'Ticket Hall', 'Platform', 'Maintenance'],
                   fill=['benches', 'stalls', 'platform', 'workshop'], notes=['DEPARTURES · DELAYED', 'NO REFUNDS', 'MIND THE GAP · MAGLEV FIELD LIVE', 'AUTHORISED STAFF']),
 'checkpoint':dict(t='yard', zones=['Inspection Lanes', 'Guard Post', 'Holding Pens', 'Search Bay', 'Watchtower'],
                   fill=['lanes', 'console', 'cells', 'cars', 'cover'], notes=['PAPERS · STACK SCAN', 'SHIFT ROTA', 'DETAINED PENDING', 'VEHICLE STRIP SEARCH', 'OVERWATCH']),
 'fort':      dict(t='rooms', zones=['Casemates', 'Gun Gallery', 'Barracks', 'Magazine', 'Ramparts'],
                   fill=['pillars', 'cover', 'beds', 'crates', 'cover'], notes=['BRICK · 1861', 'EMPLACEMENTS RE-ARMED', 'CTAC BILLET', 'SEALED · STENCILLED', 'BAY WIND']),
 'industrial':dict(t='hall', zones=['Machine Hall', 'Control Room', 'Switchgear', 'Stores'],
                   fill=['machines', 'console', 'server', 'crates'], notes=['TURBINES · HUMMING', 'ALARMS SILENCED', 'HIGH VOLTAGE', 'SPARES']),
 'pumps':     dict(t='hall', zones=['Pump Hall', 'Control Room', 'Sluice Gallery', 'Valve Room'],
                   fill=['pumps', 'console', 'water', 'machines'], notes=['THE BAY WANTS IN', 'TIDE TABLE', 'SLUICES · HALF OPEN', 'HAND WHEELS']),
 'dock':      dict(t='yard', zones=['Moorings', 'Harbourmaster', 'Boat Shed', 'Fuel Jetty', 'Chandlery'],
                   fill=['moorings', 'console', 'workshop', 'pumps', 'stalls'], notes=['MOORED TWO DEEP', 'BERTHING FEES', 'HULLS ON CRADLES', 'NO SMOKING', 'ROPE · PAINT · BAIT']),
 'tower':     dict(t='tower', zones=['Base Lobby', 'Lift Core', 'Equipment Deck', 'Service Floor', 'Roof Access'],
                   fill=['desk_lobby', 'lift', 'transmitter', 'server', 'cover'], notes=['SECURITY DESK', 'SIXTY FLOORS · FOUR WORK', 'BROADCAST ARRAY', 'CABLE RUNS', 'WIND · RAIN · VIEW']),
 'deadtower': dict(t='tower', zones=['Gutted Lobby', 'Dead Lift Core', 'Squat Floor', 'Collapse Zone', 'Open Roof'],
                   fill=['rubble', 'lift', 'beds', 'rubble', 'cover'], notes=['GLASS UNDERFOOT', 'SHAFT · NO CAR', 'THIRTY FAMILIES', 'DO NOT CROSS', 'SNIPERS\' FAVOURITE']),
 'lighthouse':dict(t='tower', zones=['Keeper\'s Cottage', 'Spiral Stair', 'Lamp Room', 'Fog Signal', 'Gallery'],
                   fill=['beds', 'stairs', 'transmitter', 'machines', 'cover'], notes=['LOGBOOK · 2109', 'ONE HUNDRED STEPS', 'THE BEAM STILL TURNS', 'HORN · DORMANT', 'SEARCHLIGHT SWEEP']),
 'chapel':    dict(t='hall', zones=['The Nave', 'Vestry', 'Altar', 'Crypt Stair'],
                   fill=['pews', 'cabinets', 'memorial', 'stairs'], notes=['CANDLES FOR THE UNSLEEVED', 'ROBES · LEDGERS', 'NO RESLEEVING · NO EXCEPTIONS', 'THE OLD DEAD']),
 'theatre':   dict(t='hall', zones=['Auditorium', 'Foyer Bar', 'The Stage', 'Backstage'],
                   fill=['pews', 'bar', 'stage', 'lockers'], notes=['VELVET · MOTH-EATEN', 'LAST ORDERS', 'TONIGHT · SOLD OUT', 'DRESSING ROOMS']),
 'cells':     dict(t='rooms', zones=['Booking', 'Cell Block A', 'Guard Station', 'Cell Block B', 'Exercise Yard'],
                   fill=['desk_lobby', 'cells', 'console', 'cells', 'cover'], notes=['NEEDLECAST INTAKE', 'NEURACHEM SEDATION', 'MONITORS', 'STACK STORAGE', 'TWENTY MINUTES A DAY']),
 'garage':    dict(t='yard', zones=['Workshop Floor', 'Office', 'Paint Booth', 'Parts Racks', 'Back Lot'],
                   fill=['cars_wreck', 'console', 'workshop', 'cabinets', 'cars']),
 'blackclinic':dict(t='rooms', zones=['Front Counter', 'Stack Vault', 'Waiting Room', 'Back Room', 'Exit Alley'],
                   fill=['desk_lobby', 'server', 'benches', 'beds', 'crates'], notes=['NO NAMES', 'STACKS · GRADED', 'CASH ONLY', 'UNLICENSED SLEEVING', 'KEEP WALKING']),
 'camp':      dict(t='open', zones=['The Camp', 'Water Point', 'Lookout'],
                   fill=['camp', 'pumps', 'cover'], notes=['TARPS · CRATES · FIRES', 'QUEUE HERE', 'EYES ON THE ROAD']),
 'reservoir': dict(t='open', zones=['The Reservoir', 'Pump House', 'Dam Walk'],
                   fill=['reservoir', 'pumps', 'cover'], notes=['DRINKING WATER · GUARDED', 'FILTRATION', 'CITY BELOW']),
 'wall':      dict(t='hall', zones=['Wall Walk', 'Gun Port', 'Stores', 'Stair Tower'],
                   fill=['cover', 'cover', 'crates', 'stairs'], notes=['THE OCEAN BEYOND', 'SEALED SINCE THE STORMS', 'SANDBAGS', 'UP TO THE WALK']),
 'ramp':      dict(t='yard', zones=['On-Ramp', 'Toll Booths', 'Maintenance Bay', 'Underpass Camp', 'Signal Box'],
                   fill=['lanes', 'console', 'workshop', 'camp', 'console']),
}
# Archetype for each named place.
KIND = {
 'West Stacks': 'stacks', 'East Stacks': 'stacks',
 'Fort Point': 'fort', 'Presidio Checkpoint': 'checkpoint', 'Toll Authority': 'office', 'Bridge Depot': 'yard',
 'Marina Habs': 'habs', 'Seawall Pumps': 'pumps', 'Yacht Stacks': 'dock', 'Palace Ruins': 'ruins',
 'Psychasec Cellhouse': 'cells', 'Lighthouse': 'lighthouse', 'Sally Port': 'checkpoint', 'Powerhouse': 'industrial',
 'Pier Market': 'market', 'Causeway Gate': 'checkpoint', 'Cannery Habs': 'habs', 'Cable Yard': 'yard',
 'Old Banks': 'vault', 'Dead Towers': 'deadtower', 'Ferry Building': 'market', 'Grounder Camp': 'camp',
 'Golden Gate Park': 'park', 'Haight Squats': 'habs', 'Panhandle Green': 'park', 'Ocean Wall': 'wall', 'Kezar Habs': 'habs',
 'Hayes Market': 'market', 'Impound Lot': 'impound', 'Alamo Terraces': 'habs', 'Courthouse Annex': 'office',
 'City Hall Ruins': 'ruins', 'UN Plaza': 'plaza', 'Protectorate Office': 'office', 'Opera House': 'theatre',
 'Archive Tower': 'tower', 'Maglev Depot': 'station', 'Slums': 'camp', 'Market Arcade': 'market',
 'Maglev Station': 'station', 'Bay Bridge Ramp': 'ramp', 'Salesforce Hulk': 'deadtower', 'Rincon Habs': 'habs', 'Stack Brokers': 'blackclinic',
 'Sutro Mast': 'tower', 'Peak Overlook': 'plaza', 'Reservoir': 'reservoir', 'Hill Habs': 'habs',
 'Dolores Chapel': 'chapel',
 'Container Habs': 'habs', 'Chop Shops': 'garage', 'Stack Dealers': 'blackclinic', 'Potrero Hill': 'camp', 'Scrapyard': 'scrap',
 'Crane Yard': 'yard', 'Power Station': 'industrial', 'Bay Dam Access': 'pumps',
}
STALL_WORDS = ['NOODLES', 'SKEWERS', 'STACK REPAIR', 'SYNTH FISH', 'IMPLANTS', 'CHIPS', 'BOOTLEG', 'RAIN GEAR', 'TEA', 'PARTS', 'GUNS?', 'LUCK']

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# --------------------------------------------------------------------------- furniture recipes
def fill(kind, rect, acc, rnd, clear_left=False, clear_right=False):
    """Furniture inside a zone (cells). Keeps clear of the zone plaque (top-left) and walls."""
    x, y, w, h = rect
    X0, Y0, X1, Y1 = x + .6 + (3.4 if clear_left else 0), y + 1.3, x + w - .6 - (3.6 if clear_right else 0), y + h - .5
    W, H = X1 - X0, Y1 - Y0
    it, under = [], []
    def grid(cw, ch, fn, maxn=99):
        cols = max(1, int(W // cw)); rows = max(1, int(H // ch)); n = 0
        ox = X0 + (W - cols * cw) / 2; oy = Y0 + (H - rows * ch) / 2
        for r in range(rows):
            for c in range(cols):
                if n >= maxn: return
                fn(ox + c * cw, oy + r * ch); n += 1
    if kind == 'beds': grid(2.1, 3.0, lambda a, b: it.append(('bed', a + .3, b + .2, acc, 1.3, 2.4, rnd.random() < .25)), 12)
    elif kind == 'desks': grid(3.2, 2.0, lambda a, b: it.append(('desk', a + .2, b + .3, acc, 2.4, 1.0, True)), 12)
    elif kind == 'desk_lobby':
        it.append(('desk', X0 + .4, Y0 + .4, acc, min(4.0, W - 1), 1.1, True)); it.append(('chairs', X0 + .6, Y1 - 1.0, max(2, int(W // 1.3)), 1.05, .6))
        if H > 4: it.append(('lockers', X1 - 2.6, Y0 + 2.2, 3, acc))
    elif kind == 'desk_exec': it.append(('desk', X0 + W / 2 - 1.6, Y0 + .6, acc, 3.2, 1.2, True)); it.append(('chairs', X0 + W / 2 - 1.0, Y0 + 2.4, 2, 1.2, .6))
    elif kind == 'table_big': it.append(('table', X0 + .8, Y0 + H / 2 - .7, max(2.5, W - 1.6), 1.4, max(4, int(W)), 3, acc))
    elif kind == 'tables': grid(3.0, 2.6, lambda a, b: it.append(('table', a + .4, b + .7, 2.0, 1.0, 4, 2, acc)), 9)
    elif kind == 'cabinets': it.append(('cabinets', X0 + .3, Y0 + .3, max(2, min(8, int(W // 1.15))), .9, min(2.6, H - .8), True, acc))
    elif kind == 'lockers': it.append(('lockers', X0 + .3, Y0 + .4, max(2, min(9, int(W // .9))), acc)); it.append(('crates', X0 + .5, Y1 - 1.2, 3, .8))
    elif kind == 'server': it.append(('server', X0 + .3, Y0 + .4, max(2, min(8, int(W // 1.0))), acc, False)); it.append(('console', X0 + .4, Y1 - 1.5, min(3.0, W - 1), 1.1, acc, ''))
    elif kind == 'console': it.append(('console', X0 + .3, Y0 + .4, min(3.4, W - .8), 1.3, acc, 'MONITORS')); it.append(('chairs', X0 + .5, Y0 + 2.4, 2, 1.1, .6))
    elif kind == 'crates': grid(2.2, 1.8, lambda a, b: it.append(('crates', a + .2, b + .2, rnd.choice([2, 3, 4]), .8)), 8)
    elif kind == 'containers':
        for i in range(max(1, int(H // 2.0))):
            if rnd.random() < .85: it.append(('container', X0 + rnd.uniform(0, max(0, W - 6.5)), Y0 + i * 2.0, rnd.choice([acc, RED, AMB, BONE2]), True, min(6.0, W - .4)))
    elif kind == 'stalls':
        cols = max(1, int(W // 3.1)); rows = max(1, int(H // 2.6)); k = 0
        for r in range(rows):
            for c in range(cols):
                it.append(('stall', X0 + c * 3.1 + .2, Y0 + r * 2.6 + .3, 2.6, acc, STALL_WORDS[(k + rnd.randint(0, 11)) % 12])); k += 1
    elif kind == 'cars': grid(4.6, 2.6, lambda a, b: it.append(('car', a + .3, b + .4, rnd.choice([acc, RED, AMB, BONE2]), True, False)), 4)
    elif kind == 'cars_rows': grid(4.4, 2.4, lambda a, b: it.append(('car', a + .3, b + .3, rnd.choice([acc, RED, AMB, BONE2, BONE2]), True, rnd.random() < .2)), 14)
    elif kind == 'cars_wreck': grid(4.6, 2.8, lambda a, b: it.append(('car', a + .3, b + .4, rnd.choice([acc, RED, BONE2]), True, rnd.random() < .6)), 6)
    elif kind == 'rubble_cars':
        grid(4.6, 2.8, lambda a, b: it.append(('car', a + .3, b + .4, BONE2, rnd.random() < .5, True)), 8); it.append(('crates', X0 + .4, Y1 - 1.2, 4, .8))
    elif kind == 'workshop': it.append(('car', X0 + .4, Y0 + .4, rnd.choice([acc, RED, AMB]), True, True)); it.append(('cabinets', X1 - 3.0, Y0 + .3, 3, .9, 1.8, True, acc)); it.append(('crates', X0 + .4, Y1 - 1.2, 3, .8))
    elif kind == 'pumps': grid(3.4, 2.6, lambda a, b: it.append(('pump', a + 1.7, b + .9, acc)) if rnd.random() < .6 else it.append(('tank', a + .9, b + .8, acc)), 6)
    elif kind == 'machines':
        def mach(a, b):
            if rnd.random() < .5: it.append(('tank', a + .8, b + .9, acc))
            else: it.append(('fan', a + 1.5, b + 1.4, 1.0, acc))
        grid(3.2, 3.0, mach, 8)
    elif kind == 'water': under.append(('water', X0, Y0 + .2, W, H - .2, acc))
    elif kind == 'reservoir': under.append(('water', X0 + .4, Y0 + .4, W - .8, H - 2.2, acc)); it.append(('bollards', X0 + .6, Y1 - .9, max(3, int(W // 1.6)), 1.6, acc))
    elif kind == 'moorings':
        under.append(('water', X0, Y0 + 2.2, W, H - 2.2, acc)); it.append(('pier', X0 + 1.0, Y0 + 2.2, 1.2, H - 2.6)); it.append(('pier', X0 + W / 2, Y0 + 2.2, 1.2, H - 2.6))
        for i in range(3): it.append(('car', X0 + 2.6 + i * 3.4 if i < 2 else X0 + W / 2 + 1.6, Y0 + 3.0 + i * 2.2, rnd.choice([BONE2, acc]), False, False))
    elif kind == 'platform':
        under.append(('road', X0, Y0 + H / 2 - .9, W, 1.8, acc, True, 1)); it.append(('bench', X0 + .5, Y0 + .3, min(5.0, W - 1), .6, acc)); it.append(('bollards', X0 + .6, Y1 - .7, max(3, int(W // 1.6)), 1.6, acc))
    elif kind == 'benches': grid(3.6, 2.0, lambda a, b: it.append(('bench', a + .3, b + .6, 3.0, .6, acc)), 10)
    elif kind == 'pews': grid(4.6, 1.5, lambda a, b: it.append(('bench', a + .2, b + .4, 4.0, .55, acc)), 18)
    elif kind == 'bench_ring': it.append(('ring', X0 + W / 2 - 2.2, Y0 + H / 2 - 1.6, 4.4, 3.2, acc)); it.append(('bench', X0 + .4, Y1 - .9, min(4.0, W - 1), .6, acc))
    elif kind == 'pillars': grid(2.6, 2.6, lambda a, b: it.append(('pillar', a + 1.3, b + 1.3, .38)), 16)
    elif kind == 'teller': it.append(('bar', X0 + .3, Y0 + .6, min(W - .6, 7.0), acc, max(3, int(W // 1.6)))); it.append(('chairs', X0 + .6, Y1 - 1.0, max(2, int(W // 1.3)), 1.05, .6))
    elif kind == 'vault': it.append(('ring', X0 + W / 2 - 1.6, Y0 + H / 2 - 1.5, 3.2, 3.0, acc)); it.append(('lockers', X0 + .3, Y0 + .3, max(2, min(6, int(W // 1.0) - 2)), acc))
    elif kind == 'memorial': it.append(('memorial', X0 + W / 2 - .6, Y0 + H / 2 - 1.0, acc)); it.append(('bench', X0 + .4, Y1 - .9, min(4.0, W - 1), .6, acc))
    elif kind == 'stage': it.append(('stage', X0 + .3, Y0 + .3, W - .6, min(H - .6, 4.0), acc))
    elif kind == 'bar': it.append(('bar', X0 + .3, Y0 + .6, min(W - .6, 7.0), acc, max(3, int(W // 1.4)))); it.append(('table', X0 + .6, Y1 - 1.6, 2.0, 1.0, 3, 2, acc))
    elif kind == 'stairs': it.append(('stairs', X0 + W / 2 - 1.2, Y0 + .4, 2.4, min(H - .8, 4.0), True))
    elif kind == 'lift': it.append(('lift', X0 + W / 2 - 1.2, Y0 + H / 2 - 1.2, 2.4, acc)); it.append(('stairs', X0 + .4, Y1 - 2.4, 2.0, 2.0, False))
    elif kind == 'transmitter': it.append(('transmitter', X0 + W / 2, Y0 + H / 2, acc)); it.append(('server', X0 + .3, Y1 - 1.4, max(2, min(5, int(W // 1.0) - 1)), acc, False))
    elif kind == 'cells': it.append(('cells', X0 + .2, Y0 + .3, max(2, min(6, int(W // 1.75))), acc, 1.6, min(2.2, H - .6)))
    elif kind == 'rubble':
        for _ in range(int(W * H / 6)): it.append(('crates', X0 + rnd.uniform(0, max(.1, W - 2)), Y0 + rnd.uniform(0, max(.1, H - 1)), rnd.choice([1, 2, 3]), rnd.choice([.6, .8, 1.0])))
        for _ in range(3): under.append(('puddle', X0 + rnd.uniform(1, max(1.1, W - 1)), Y0 + rnd.uniform(1, max(1.1, H - 1)), rnd.uniform(.6, 1.6), rnd.uniform(.25, .5), acc))
        it.append(('pillar', X0 + W * .3, Y0 + H * .5, .4)); it.append(('pillar', X0 + W * .7, Y0 + H * .4, .4))
    elif kind == 'garden':
        for _ in range(max(3, int(W * H / 8))): it.append(('pillar', X0 + rnd.uniform(.5, max(.6, W - .5)), Y0 + rnd.uniform(.5, max(.6, H - .5)), rnd.uniform(.3, .6)))
        it.append(('bench', X0 + .4, Y1 - .9, min(3.4, W - 1), .6, acc))
    elif kind == 'park':
        under.append(('water', X0 + W * .45, Y0 + H * .25, W * .4, H * .3, acc))
        for _ in range(int(W * H / 5)):
            a, b = X0 + rnd.uniform(.5, W - .5), Y0 + rnd.uniform(.5, H - .5)
            if not (X0 + W * .43 < a < X0 + W * .87 and Y0 + H * .22 < b < Y0 + H * .58): it.append(('pillar', a, b, rnd.uniform(.35, .7)))
        it.append(('bench', X0 + 1.0, Y1 - 1.0, 3.0, .6, acc)); it.append(('memorial', X0 + 1.2, Y0 + 1.0, acc))
    elif kind == 'plaza':
        under.append(('crosswalk', X0 + 1.0, Y0 + H / 2 - 1.0, W - 2.0, 2.0, True)); it.append(('ring', X0 + W / 2 - 2.0, Y0 + H * .2, 4.0, 3.0, acc))
        it.append(('bollards', X0 + .6, Y1 - .7, max(3, int(W // 1.6)), 1.6, acc)); it.append(('billboard', X0 + .6, Y0 + .2, min(5.0, W - 1.2), acc))
    elif kind == 'camp':
        for _ in range(int(W * H / 7)): it.append(('crates', X0 + rnd.uniform(0, max(.1, W - 2)), Y0 + rnd.uniform(0, max(.1, H - 1)), rnd.choice([2, 3]), .8))
        it.append(('dumpster', X0 + W * .6, Y0 + H * .3, acc)); it.append(('dumpster', X0 + W * .25, Y0 + H * .7, acc))
        under.append(('puddle', X0 + W / 2, Y0 + H / 2, 1.2, .4, acc))
    elif kind == 'yard':
        for i in range(max(1, int(H // 2.4))): it.append(('container', X0 + .3 + (i % 2) * 2.0, Y0 + i * 2.4, rnd.choice([acc, RED, AMB, BONE2]), True, min(5.0, W / 2)))
        it.append(('crane', X0 + W * .62, Y0 + H * .15, acc, min(7.0, H - 1))); it.append(('car', X0 + W * .6, Y1 - 2.0, AMB, True, False))
    elif kind == 'lanes':
        under.append(('road', X0, Y0 + .4, W, H - .8, acc, True, 3)); it.append(('barrier', X0 + W * .45, Y0 + .4, X0 + W * .45, Y1 - .4, RED))
        it.append(('car', X0 + 1.0, Y0 + 1.0, rnd.choice([acc, BONE2]), True, False)); it.append(('bollards', X0 + W * .45 + .6, Y0 + .6, max(2, int((H - 1) // 1.4)), 1.4, acc))
    elif kind == 'cover':
        it.append(('cover', X0 + W * .3, Y0 + H * .45, acc, True)); it.append(('cover', X0 + W * .72, Y0 + H * .6, acc, False))
    return under, it

def make_place(name, district, accent, code, exits, seed=None):
    kind = KIND[name]; arch = A[kind]; tpl = TEMPLATES[arch['t']]
    rnd = random.Random(seed or name)
    zones, under, items = [], [], []
    used = set()
    nex = len(exits)
    lz = tpl['left'][0]; rz = (tpl['right'][-1] if len(tpl['right']) > 1 else tpl['right'][0]) if nex > 1 else None
    for i, r in enumerate(tpl['zones']):
        zname = arch['zones'][i]; zid = slug(zname)
        while zid in used: zid += '-2'
        used.add(zid)
        zones.append(dict(id=zid, name=zname, rect=list(r)))
        u, it = fill(arch['fill'][i], r, accent, rnd, clear_left=(i == lz), clear_right=(i == rz))
        under += u; items += it
        notes = arch.get('notes')
        if notes and i < len(notes):
            x, y, w, h = r
            items.append(('label', x + w / 2, y + h - .32, notes[i], accent, 15))
    # doors between zones that share a wall
    import coldstyle as cs
    links = []
    for i, a in enumerate(zones):
        for b in zones[i + 1:]:
            e = cs.shared_edge(a['rect'], b['rect'])
            if e: links.append((a['id'], b['id']))
    # exits: front on the left edge, back on the right edge
    ex = []
    for k, e in enumerate(exits):
        side = e['side']; zi = lz if side == 'left' else rz
        r = zones[zi]['rect']; ymid = round(r[1] + r[3] / 2, 1)
        ex.append(dict(label=e['label'], dir=side, at=[1.0, ymid] if side == 'left' else [27.6, ymid], zone=zones[zi]['id']))
    return dict(id='BCP-' + slug(name).upper(), slug=f'{code.lower()}-{slug(name)}', code=code, journal=district, name=name, accent=accent,
                zones=zones, links=links, under=under, items=items, exits=ex, series='BAY CITY', kind=kind)
