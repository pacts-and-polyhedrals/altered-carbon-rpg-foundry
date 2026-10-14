"""Shared helpers for the system's book journals (teal case-file format, live links)."""
import hashlib, html, re
SYS = 'altered-carbon-rpg'
esc = lambda s: html.escape(str(s), quote=False)
def sid(*parts): return hashlib.sha1(':'.join(map(str, parts)).encode()).hexdigest()[:16]
def page_uuid(pack, eid, pid): return f'Compendium.{SYS}.{pack}.JournalEntry.{eid}.JournalEntryPage.{pid}'
def entry_uuid(pack, eid): return f'Compendium.{SYS}.{pack}.JournalEntry.{eid}'
def actor_uuid(pack, aid): return f'Compendium.{SYS}.{pack}.Actor.{aid}'
def link(uuid, label): return f'@UUID[{uuid}]{{{label}}}'
def article(cat, kicker, title, body):
    return f'<article class="ac-book-journal ac-cat-{cat}"><p class="ac-page-kicker">{esc(kicker)}</p><h1>{esc(title)}</h1>\n{body}\n</article>'
SKILLS = ['Athletics','Brawl','Endurance','Melee Combat','Toughness','Detection','Directed Energy Weapons','Firearms','Search','Stealth','Throw','Diplomacy','Expression','Read Person','Composure','Discipline','Intimidation','Data Analysis','Data Engineering','Digital Networking','Investigation','Mechanics','Navigation','Pilot','Survival','Bureaucracy','Cultures','Engineering','Geography','History','Science','Medicine']
_SK = '|'.join(re.escape(s) for s in sorted(SKILLS, key=len, reverse=True))
_LIST = rf'(?:{_SK})(?:(?:,\s*|,?\s+or\s+|\s+and\s+)(?:{_SK}))*'
CHECK_RE = re.compile(rf'\b({_LIST})([^().;:]{{0,60}}?)\s*\((?:Difficulty|D)\s*(\d)([^)]*)\)')
def mark_checks(text, source=''):
    """Turn 'Skill or Skill ... (Difficulty N ...)' into @ACCheck chips. Text outside tags only."""
    parts = re.split(r'(<[^>]+>|@\w+\[[^\]]*\]\{[^}]*\})', str(text))
    for i in range(0, len(parts), 2):
        def rep(m):
            skills = sorted((s for s in SKILLS if re.search(rf'\b{re.escape(s)}\b', m.group(1))), key=lambda s: m.group(1).index(s))
            return f'@ACCheck[{";".join(skills)}|{m.group(3)}|{source}]{{{m.group(0)}}}'
        parts[i] = CHECK_RE.sub(rep, parts[i])
    return ''.join(parts)

BARE_RE = re.compile(rf'\b({_SK})\b')
def mark_bare(text, source=''):
    """For a Checks line: any Skill still unmarked becomes a Difficulty 0 chip on the Skill name."""
    parts = re.split(r'(<[^>]+>|@\w+\[[^\]]*\]\{[^}]*\})', str(text))
    for i in range(0, len(parts), 2):
        parts[i] = BARE_RE.sub(lambda m: f'@ACCheck[{m.group(1)}|0|{source}]{{{m.group(1)}}}', parts[i])
    return ''.join(parts)
