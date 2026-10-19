#!/usr/bin/env python3
"""
Moisture Master Pros static site build.

Page bodies live in src/*.body.html. This script wraps each one in the shared
head / nav / footer, generates the ten service pages from content/services.json,
and writes plain static HTML to the project root. No dependencies, no runtime:
what ships is exactly what a browser reads, which is what the local SEO work
needs it to be.

    python3 build.py
"""

import json, os, re, shutil, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = ROOT

ASSET_V = "73"   # bump to bust the CSS/JS cache after a change

SITE = {
    "name": "Moisture Master Pros",
    "short": "MMP",
    "tagline": "When you think of moisture and mold, think of the pros",
    "tagline_alt": "Creating and restoring healthy living environments",
    "tel": "1-833-466-4788",
    "tel_href": "+18334664788",
    "url": "https://moisturemasterpros.com",
    "areas": "Greater Philadelphia and northern Delaware",
}

with open(os.path.join(ROOT, "content", "services.json")) as f:
    DATA = json.load(f)
with open(os.path.join(ROOT, "content", "site.json")) as f:
    SITE_CONTENT = json.load(f)
with open(os.path.join(ROOT, "content", "cases.json")) as f:
    CASES = json.load(f)
SERVICES = DATA["services"]
CATS = DATA["categories"]
BY_SLUG = {s["slug"]: s for s in SERVICES}
CAT_LABEL = {c["id"]: c["label"] for c in CATS}


# ----------------------------------------------------------------- helpers
def rel(depth, path):
    return ("../" * depth) + path


def icon(name):
    I = {
        "drop": '<path d="M12 2.7S5.5 10 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 10 12 2.7 12 2.7Z"/>',
        "chev": '<path d="m6 9 6 6 6-6"/>',
        "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
        "phone": '<path d="M6.6 3.5h3l1.5 3.8-1.9 1.4a12 12 0 0 0 5.1 5.1l1.4-1.9 3.8 1.5v3a1.6 1.6 0 0 1-1.7 1.6A15.6 15.6 0 0 1 5 5.2 1.6 1.6 0 0 1 6.6 3.5Z"/>',
        "cal": '<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/>',
        "video": '<rect x="2.6" y="6" width="12.6" height="12" rx="2.4"/><path d="m15.2 11 6.2-3.4v8.8L15.2 13Z"/>',
        "wrench": '<path d="M15.6 3.6a5.4 5.4 0 0 0-5 8.8L4.2 18.8a1.8 1.8 0 0 0 2.6 2.6l6.4-6.4a5.4 5.4 0 0 0 6.7-7.3l-3 3-2.6-2.6 3-3a5.4 5.4 0 0 0-1.7-1.5Z"/>',
        "star": '<path d="m12 3.2 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8Z"/>',
        "pin": '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
        "shield": '<path d="M12 2.8 20 6v6c0 4.6-3.3 8.2-8 9.2-4.7-1-8-4.6-8-9.2V6Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
        "search": '<circle cx="11" cy="11" r="6.6"/><path d="m16 16 4.5 4.5"/>',
    }
    fill = "currentColor" if name in ("drop", "star", "wrench", "phone") else "none"
    return ('<svg viewBox="0 0 24 24" fill="%s" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (fill, I[name]))


# ----------------------------------------------------------------- chrome
def head(title, desc, depth, canonical, extra="", jsonld=None):
    # index.html is served at the site root, so canonicalise it there
    canonical = "" if canonical == "index.html" else canonical
    ld = ""
    for block in (jsonld or []):
        ld += '\n<script type="application/ld+json">%s</script>' % json.dumps(block, indent=0).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE['url']}/{canonical}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE['url']}/{canonical}">
<meta name="theme-color" content="#00557F">
<link rel="icon" href="{rel(depth,'assets/ui/favicon-32.png')}" sizes="32x32">
<link rel="apple-touch-icon" href="{rel(depth,'assets/ui/favicon-180.png')}">
<meta property="og:image" content="{SITE['url']}/assets/ui/logo-full.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{rel(depth,'css/mmp.css')}?v={ASSET_V}">{extra}{ld}
</head>
<body>
"""


def nav(depth, active=""):
    items = []
    for s in SERVICES:
        items.append(
            '<a href="%s"><b>%s</b><span>%s</span></a>'
            % (rel(depth, "services/%s.html" % s["slug"]), html.escape(s["short"]), html.escape(CAT_LABEL[s["cat"]]))
        )
    cur = lambda k: ' aria-current="page"' if active == k else ""
    return f"""<header class="nav" data-on="white">
  <div class="nav-in">
    <a class="brand" href="{rel(depth,'index.html')}" aria-label="{SITE['name']} home">
      <img class="mark" src="{rel(depth,'assets/ui/mark.png')}" alt="" width="519" height="741">
      <img class="mark-inv" src="{rel(depth,'assets/ui/mark-white.png')}" alt="" width="1095" height="1616">
      <span><b>Moisture Master Pros</b><span>Greater Philadelphia</span></span>
    </a>
    <button class="burger" aria-expanded="false" aria-label="Menu"><i></i><i></i><i></i></button>
    <nav class="links">
      <div class="drop" data-open="false">
        <button type="button" aria-haspopup="true">Services {icon('chev')}</button>
        <div class="drop-menu">{''.join(items)}
          <a href="{rel(depth,'services.html')}"><b>All services</b><span>See everything we fix</span></a>
        </div>
      </div>
      <a href="{rel(depth,'commercial.html')}"{cur('commercial')}>Commercial</a>
      <a href="{rel(depth,'case-studies.html')}"{cur('case-studies')}>Case Studies</a>
      <a href="{rel(depth,'process.html')}"{cur('process')}>How It Works</a>
      <a href="{rel(depth,'about.html')}"{cur('about')}>About</a>
      <a href="{rel(depth,'contact-us.html')}"{cur('contact')}>Contact</a>
      <a class="nav-tel" href="tel:{SITE['tel_href']}">{SITE['tel']}</a>
      <a class="b" href="{rel(depth,'book.html')}">Get started</a>
    </nav>
  </div>
</header>

<div class="callbar">
  <a class="c1" href="tel:{SITE['tel_href']}">{icon('phone')} Call now</a>
  <a class="c2" href="{rel(depth,'book.html')}">Get started</a>
</div>
"""


def foot(depth):
    """Two even service columns, then one company column. Grouping the footer
    by category left one column with a single link in it."""
    half = (len(SERVICES) + 1) // 2
    def col(items):
        return "".join(
            '<a href="%s">%s</a>' % (rel(depth, "services/%s.html" % x["slug"]), html.escape(x["short"]))
            for x in items
        )
    svc_html = ('<div><h4>Services</h4>%s</div><div><h4>More services</h4>%s<a href="%s">All services</a></div>'
                % (col(SERVICES[:half]), col(SERVICES[half:]), rel(depth, "services.html")))
    rest = ""

    return f"""<footer class="foot">
  <div class="foot-in">
    <div class="foot-grid">
      <div>
        <a class="brand on-dark" href="{rel(depth,'index.html')}" style="color:#fff;margin-bottom:18px">
          <img class="mark-inv" src="{rel(depth,'assets/ui/mark-white.png')}" alt="" width="1095" height="1616">
          <span><b>Moisture Master Pros</b><span style="color:rgba(255,255,255,.5)">Greater Philadelphia</span></span>
        </a>
        <p class="foot-tag">{SITE['tagline']}.</p>
        <p>Leak detection, mold remediation, water damage restoration and major moisture repair across the {SITE['areas']}.</p>
        <a class="b b-sm" href="tel:{SITE['tel_href']}" style="background:#fff;color:var(--navy)">{icon('phone')} {SITE['tel']}</a>
      </div>
      {svc_html}
      <div>
        <h4>Company</h4>
        {rest}<a href="{rel(depth,'case-studies.html')}">Case studies</a>
        <a href="{rel(depth,'work.html')}">Photo reports</a>
        <a href="{rel(depth,'process.html')}">How it works</a>
        <a href="{rel(depth,'about.html')}">About</a>
        <a href="{rel(depth,'book.html')}">Get started</a>
        <a href="{rel(depth,'contact-us.html')}">Contact us</a>
        <a href="{rel(depth,'contact-us.html')}#faq">Questions</a>
        <a href="{rel(depth,'contact.html')}">Free assessment</a>
      </div>
    </div>
    <div class="foot-base">
      <span>&copy; <span data-year>2026</span> {SITE['name']}. All rights reserved.</span>
      <span>Serving the {SITE['areas']}</span>
      <div class="socials">
        <a href="https://www.facebook.com/moisturemasterpros" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1V9.9H7.6V13h2.7v8Z"/></svg></a>
        <a href="https://www.instagram.com/moisturemasterpros" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://www.youtube.com/@moisturemasterpros" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"/></svg></a>
        <a href="mailto:info@moisturemasterpros.com" aria-label="Email"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4"/><path d="m3.4 6.6 8.6 6 8.6-6"/></svg></a>
      </div>
    </div>
  </div>
</footer>

<script src="{rel(depth,'js/mmp.js')}?v={ASSET_V}"></script>
</body>
</html>
"""


# ----------------------------------------------------------------- schema
LOCAL_BUSINESS = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": SITE["url"] + "/#business",
    "name": SITE["name"],
    "description": "Leak detection, mold remediation, water damage restoration, drainage, foundation and stucco remediation across Greater Philadelphia and northern Delaware.",
    "url": SITE["url"],
    "telephone": SITE["tel"],
    # Only what the confirmed ZIP list actually covers. Florida is announced
    # but not staffed, so it is deliberately absent from structured data.
    "areaServed": [
        {"@type": "City", "name": "Philadelphia", "addressRegion": "PA"},
        {"@type": "State", "name": "Pennsylvania"},
        {"@type": "State", "name": "Delaware"},
    ],
    "priceRange": "$$-$$$",
    "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "200"},
    "sameAs": [
        "https://www.facebook.com/moisturemasterpros",
        "https://www.instagram.com/moisturemasterpros",
    ],
}


def service_schema(s):
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": s["title"],
        "serviceType": s["title"],
        "description": s["blurb"],
        "provider": {"@id": SITE["url"] + "/#business"},
        "areaServed": "Greater Philadelphia and northern Delaware",
        "url": "%s/services/%s.html" % (SITE["url"], s["slug"]),
    }


def faq_schema(faqs):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": f["q"],
             "acceptedAnswer": {"@type": "Answer", "text": f["a"]}}
            for f in faqs
        ],
    }


def crumb_schema(items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE["url"] + "/" + u}
            for i, (n, u) in enumerate(items)
        ],
    }


# ----------------------------------------------------------------- writer
PAGES = []


def write(path, title, desc, body, depth=0, active="", jsonld=None, extra=""):
    full = head(title, desc, depth, path, extra, jsonld) + nav(depth, active) + body + foot(depth)
    dest = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w") as f:
        f.write(full)
    PAGES.append(path)


SVC_SCENE = {
"leak-detection": """
<rect class="zk" x="58" y="46" width="284" height="208" rx="12"/>
<path class="zk zq" d="M58 104h96a26 26 0 0 1 26 26v124"/>
<path class="zk zq" d="M342 104h-70"/>
<circle class="zhot" cx="180" cy="130" r="8"/>
<circle class="zhot zd1" cx="272" cy="104" r="6"/>
<g class="zsweep"><circle class="zk" cx="132" cy="160" r="36"/><path class="zk" d="m157 185 24 24"/><path class="zk zt" d="M120 160h24M132 148v24"/></g>
""",
"french-drains": """
<path class="zk" d="M40 96h92v158H40z"/>
<path class="zk zt" d="M62 124h48M62 152h48"/>
<path class="zk" d="M132 186c48-14 104-14 168 4"/>
<path class="zk zflow" d="M148 206c46-12 98-12 156 6"/>
<g class="zk zt"><path d="M170 196v10M198 193v10M226 193v10M254 196v10M282 200v10"/></g>
<path class="zk" d="M300 212c26 10 40 24 48 42"/>
<g class="zdrip"><path class="zk" d="M164 108c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<g class="zdrip zd2"><path class="zk" d="M222 96c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<g class="zdrip zd1"><path class="zk" d="M278 114c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
""",
"sump-pumps": """
<path class="zk" d="M74 74h252"/>
<path class="zk" d="M128 74v96a20 20 0 0 0 20 20h104a20 20 0 0 0 20-20V74"/>
<rect class="zlvl" x="136" y="118" width="128" height="64" rx="6"/>
<rect class="zk" x="170" y="120" width="60" height="58" rx="8"/>
<path class="zk zq" d="M200 120V88h86v-30"/>
<path class="zk zpump" d="M184 150h32M200 134v32"/>
<path class="zk zarr" d="M286 62v-18m-9 9 9-9 9 9"/>
<path class="zk zt" d="M74 226h252M74 250h252"/>
""",
"water-damage": """
<path class="zk" d="M52 210h296"/>
<rect class="zpool" x="120" y="176" width="160" height="34" rx="8"/>
<g class="zfan"><circle class="zk" cx="104" cy="176" r="30"/><path class="zk" d="M104 152c14 6 14 18 0 24-14-6-14-18 0-24Z"/></g>
<g class="zfan zd2"><circle class="zk" cx="296" cy="176" r="30"/><path class="zk" d="M296 152c14 6 14 18 0 24-14-6-14-18 0-24Z"/></g>
<path class="zk" d="M104 206h-16v22h32v-22Z"/>
<path class="zk" d="M296 206h-16v22h32v-22Z"/>
<path class="zk zt zvap" d="M162 148c0-14 16-14 16-28M200 140c0-14 16-14 16-28M238 148c0-14 16-14 16-28"/>
""",
"foundation-repair": """
<path class="zk" d="M84 54h232v186H84z"/>
<path class="zk zt" d="M84 110h232M84 166h232M148 54v56M252 54v56M116 110v56M200 110v56M284 110v56M148 166v74M252 166v74"/>
<path class="zk zcrack" d="M200 54c-8 28 12 34 4 60-8 26 14 34 6 60-6 20 6 30 2 66"/>
<rect class="zseal" x="176" y="54" width="48" height="186" rx="10"/>
<path class="zk" d="M60 240h280v22H60z"/>
""",
"mold-remediation": """
<rect class="zk" x="70" y="52" width="260" height="200" rx="14"/>
<path class="zk zq" d="M70 96h260"/>
<g class="zspore"><circle class="zf" cx="146" cy="160" r="22"/><circle class="zf zd1" cx="196" cy="140" r="15"/><circle class="zf zd2" cx="188" cy="192" r="18"/><circle class="zf zd3" cx="240" cy="172" r="13"/><circle class="zf zd1" cx="238" cy="126" r="9"/></g>
<path class="zk zwipe" d="M70 52v200"/>
<path class="zk zt" d="M100 74h32M148 74h16"/>
""",
"air-sealing": """
<path class="zk" d="M200 46 62 132v126h276V132Z"/>
<path class="zk zt" d="M152 258v-72h96v72"/>
<g class="zleak"><path class="zk" d="M104 150h-42m32-11-12 11 12 11"/></g>
<g class="zleak zd2"><path class="zk" d="M296 150h42m-32-11 12 11-12 11"/></g>
<g class="zleak zd1"><path class="zk" d="M200 108V70m-11 28 11-11 11 11"/></g>
<path class="zband" d="M200 46 62 132v126h276V132Z"/>
""",
"stucco-remediation": """
<path class="zk" d="M96 44h56v220H96z"/>
<path class="zk" d="M164 44h56v220h-56z"/>
<path class="zk zq" d="M232 44h72v220h-72z"/>
<path class="zk zt" d="M232 88h72M232 132h72M232 176h72M232 220h72"/>
<g class="ztrace"><path class="zk zq" d="M124 52v208"/></g>
<g class="zdrip"><path class="zk" d="M124 76c0 0-10 12-10 19a10 10 0 0 0 20 0c0-7-10-19-10-19Z"/></g>
<path class="zk zarr" d="M124 274v18m-9-9 9 9 9-9"/>
""",
"exterior-repairs": """
<path class="zk" d="M52 128 200 48l148 80"/>
<path class="zk" d="M84 128v132h232V128"/>
<path class="zk zt" d="M84 168h232M84 208h232"/>
<path class="zk zt" d="M144 128v132M200 128v132M256 128v132"/>
<rect class="zslot" x="200" y="168" width="56" height="40"/>
<rect class="zpan" x="200" y="168" width="56" height="40" rx="3"/>
""",
"mold-air-testing": """
<rect class="zk" x="58" y="152" width="96" height="86" rx="12"/>
<path class="zk zt" d="M80 178h52M80 200h32"/>
<path class="zk zq zflow" d="M154 178h74a22 22 0 0 0 22-22V96"/>
<rect class="zk" x="228" y="52" width="46" height="46" rx="8"/>
<path class="zk zt" d="M240 68h22M240 82h22"/>
<g class="zmote"><circle class="zf" cx="300" cy="118" r="5"/><circle class="zf zd1" cx="320" cy="150" r="4"/><circle class="zf zd2" cx="288" cy="176" r="6"/><circle class="zf zd3" cx="326" cy="206" r="4"/></g>
""",
"fiberglass-deck-repair": """
<path class="zk" d="M70 150h260v16H70z"/>
<path class="zk zt" d="M70 166v96h260v-96"/>
<path class="zk" d="M70 150V96M330 150V96M70 96h260"/>
<path class="zk zt" d="M118 150V96M166 150V96M214 150V96M262 150V96M310 150V96"/>
<path class="zk zcrack" d="M196 150c-6 4 4 8 0 12"/>
<g class="zdrip"><path class="zk" d="M198 176c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<g class="zdrip zd2"><path class="zk" d="M232 182c0 0-8 10-8 16a8 8 0 0 0 16 0c0-6-8-16-8-16Z"/></g>
<path class="zk zt" d="M96 262v-40h52v40"/>
""",
"basement-waterproofing": """
<path class="zk" d="M96 54 200 22l104 32"/>
<path class="zk" d="M118 54v70h164V54"/>
<path class="zk" d="M96 124h208v134H96z"/>
<path class="zk zt" d="M60 124h36M304 124h36"/>
<rect class="zlvl" x="104" y="196" width="192" height="54" rx="4"/>
<path class="zk zq zflow" d="M96 240h208"/>
<g class="zdrip"><path class="zk" d="M142 142c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<g class="zdrip zd1"><path class="zk" d="M258 150c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<path class="zk zarr" d="M200 272v18m-9-9 9 9 9-9"/>
""",
"winterization": """
<path class="zk" d="M48 150h304"/>
<path class="zk" d="M48 134h304M48 166h304"/>
<path class="zk" d="M132 128v44M268 128v44"/>
<g class="zk zt"><path d="M176 150v-34M176 124l-10-10M176 124l10-10M224 150v34M224 176l-10 10M224 176l10 10"/></g>
<path class="zk zcrack" d="M194 134c-7 6 5 10-2 16 7 6-4 10 3 16"/>
<g class="zdrip"><path class="zk" d="M200 176c0 0-9 11-9 17a9 9 0 0 0 18 0c0-6-9-17-9-17Z"/></g>
<path class="zk" d="M312 84v-26M300 70l12-12 12 12"/>
<circle class="zk" cx="312" cy="222" r="18"/>
<path class="zk" d="M312 204v-74"/>
<circle class="zf zhot" cx="312" cy="222" r="9"/>
""",
}


CAT_SCENE = {              # fallback drawing when a service has no scene of its own
    "water": "french-drains",
    "structure": "foundation-repair",
    "air": "mold-remediation",
    "envelope": "stucco-remediation",
    "interior": "water-damage",
}


def svc_index(depth=0, limit=None, order=None):
    """Home page service index: an editorial list paired with a sticky stage of
    animated line drawings. One scene per service, only the active one runs."""
    items = SERVICES
    if order:
        rank = {slug: i for i, slug in enumerate(order)}
        items = sorted(items, key=lambda x: rank.get(x["slug"], len(rank)))
    if limit:
        items = items[:limit]
    rows, stages = [], []
    for i, s in enumerate(items):
        n = "%02d" % (i + 1)
        stages.append(
            '<div class="sx-scene%s" data-scene="%d">'
            '<svg viewBox="0 0 400 300" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            'role="img" aria-label="%s">%s</svg></div>'
            % (" on" if i == 0 else "", i, html.escape(s["title"]),
               SVC_SCENE.get(s["slug"], SVC_SCENE[CAT_SCENE[s["cat"]]])))
        rows.append(f"""
      <li>
        <a class="sx-row{' on' if i == 0 else ''}" data-row="{i}" href="{rel(depth,'services/%s.html' % s['slug'])}">
          <span class="sx-n">{n}</span>
          <span class="sx-main">
            <span class="sx-t">{html.escape(s['title'])}</span>
            <span class="sx-d">{html.escape(s['blurb'])}</span>
          </span>
          <span class="sx-scale">{html.escape(s['scale'])}</span>
          <span class="sx-ar">{icon('arrow')}</span>
        </a>
      </li>""")
    return ('<div class="sx" data-svcx>'
            '<div class="sx-stage" aria-hidden="true">%s</div>'
            '<ol class="sx-list">%s</ol></div>' % ("".join(stages), "".join(rows)))


def svc_float(depth=0, limit=10, order=None):
    """Home page services: each one floats above its own shadow, the way the
    reference deck does it. The drawings are the same scenes the index uses,
    so there is one set of artwork to maintain."""
    items = SERVICES
    if order:
        rank = {slug: i for i, slug in enumerate(order)}
        items = sorted(items, key=lambda x: rank.get(x["slug"], len(rank)))
    items = items[:limit]

    out = []
    for i, s in enumerate(items):
        scene = SVC_SCENE.get(s["slug"], SVC_SCENE[CAT_SCENE[s["cat"]]])
        out.append(f"""
      <a class="fl" href="{rel(depth,'services/%s.html' % s['slug'])}" style="--i:{i}">
        <span class="fl-art" aria-hidden="true">
          <span class="fl-scene"><svg viewBox="0 0 400 300" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">{scene}</svg></span>
          <span class="fl-shadow"></span>
        </span>
        <h3>{html.escape(s['short'])}</h3>
        <p>{html.escape(s['blurb'])}</p>
        <span class="fl-go">Explore</span>
      </a>""")
    return '<div class="fl-grid">%s</div>' % "".join(out)


def body_of(name):
    """Read a page body fragment and expand the {{tokens}} it may use."""
    with open(os.path.join(SRC, name)) as f:
        t = f.read()
    t = t.replace("{{TEL}}", SITE["tel"]).replace("{{TEL_HREF}}", SITE["tel_href"])
    t = t.replace("{{SVC_FLOAT}}", svc_float(limit=10, order=[
        "mold-remediation", "fiberglass-deck-repair", "foundation-repair",
        "leak-detection", "air-sealing", "stucco-remediation",
        "basement-waterproofing", "water-damage", "french-drains", "winterization"]))
    t = t.replace("{{SVC_INDEX}}", svc_index(limit=8, order=[
        "mold-remediation", "fiberglass-deck-repair", "foundation-repair",
        "leak-detection", "air-sealing", "stucco-remediation",
        "basement-waterproofing", "water-damage"]))
    t = t.replace("{{SVC_CARDS}}", svc_cards())
    t = t.replace("{{SVC_CARDS_6}}", svc_cards(limit=6))
    t = t.replace("{{SVC_CATS}}", svc_cat_buttons())
    t = t.replace("{{QUIZ}}", quiz_block())
    t = t.replace("{{QUIZ_DATA}}", quiz_data())
    t = t.replace("{{QUIZ_INTRO}}", html.escape(SITE_CONTENT["quiz"]["intro"]))
    t = t.replace("{{FAQ_SHORT}}", faq_block(limit=5))
    t = t.replace("{{FAQ_ALL}}", faq_block())
    t = t.replace("{{TEAM}}", team_block())
    t = t.replace("{{PLANS}}", plans_block())
    t = t.replace("{{SECTORS}}", "".join(
        "<li>%s</li>" % html.escape(x) for x in SITE_CONTENT["commercial"]["sectors"]))
    t = t.replace("{{CASES}}", cases_block())
    t = t.replace("{{CASES_3}}", cases_block(limit=3, compact=True))
    t = t.replace("{{CASE_FILTERS}}", case_filters())
    return t


def case_filters():
    seen, out = [], ['<button data-cgo="all" aria-current="true">Everything</button>']
    for c in CASES["cases"]:
        if c["sector"] not in seen:
            seen.append(c["sector"])
            out.append('<button data-cgo="%s">%s</button>'
                       % (c["sector"].lower(), html.escape(c["sector"])))
    return "".join(out)


def cases_block(limit=None, compact=False, depth=0):
    """Each case is a dossier: what the caller said, what we found, what we did.
    The two are deliberately different, because that gap is the whole pitch."""
    items = CASES["cases"][:limit] if limit else CASES["cases"]
    out = []
    for c in items:
        stats = "".join(
            '<div><b>%s</b><span>%s</span></div>' % (html.escape(v), html.escape(k))
            for k, v in c["stats"])

        if c.get("map"):
            media = (f'<div class="ba" data-ba style="--p:52%">'
                     f'<img src="{rel(depth, c["raw"])}" alt="{html.escape(c["alt"])}" loading="lazy">'
                     f'<img class="after" src="{rel(depth, c["map"])}" alt="{html.escape(c["alt"])}" loading="lazy">'
                     f'<span class="handle"></span><span class="lbl l">Photograph</span>'
                     f'<span class="lbl r">Finding</span></div>')
        else:
            media = (f'<div class="fig"><img src="{rel(depth, c["raw"])}" '
                     f'alt="{html.escape(c["alt"])}" loading="lazy"></div>')

        if compact:
            out.append(f"""
      <a class="cs-mini" href="{rel(depth,'case-studies.html')}#{c['id']}" data-r>
        {media}
        <span class="cs-mini-tag">{html.escape(c['sector'])} &middot; {html.escape(c['service'])}</span>
        <h3>{html.escape(c['title'])}</h3>
        <span class="lnk">Read the file {icon('arrow')}</span>
      </a>""")
            continue

        out.append(f"""
      <article class="cs" id="{c['id']}" data-sector="{c['sector'].lower()}" data-r>
        <div class="cs-side">
          <span class="cs-n">{c['n']}</span>
          <span class="cs-sector">{html.escape(c['sector'])}</span>
        </div>
        <div class="cs-body">
          <p class="cs-place">{html.escape(c['place'])} &middot; {html.escape(c['service'])}</p>
          <h3 class="cs-title">{html.escape(c['title'])}</h3>
          <div class="cs-media">{media}</div>
          <dl class="cs-story">
            <dt>What they told us</dt><dd>{html.escape(c['said'])}</dd>
            <dt>What we found</dt><dd>{html.escape(c['found'])}</dd>
            <dt>What we did</dt><dd>{html.escape(c['did'])}</dd>
            <dt>How it ended</dt><dd>{html.escape(c['out'])}</dd>
          </dl>
          <div class="cs-stats">{stats}</div>
          <a class="lnk" href="{rel(depth,'services/%s.html' % c['svc'])}">More on {html.escape(c['service'].lower())} {icon('arrow')}</a>
        </div>
      </article>""")
    return "".join(out)


def quiz_block():
    """The assessment questionnaire, rendered from content/site.json so the
    questions stay in one place and match the set MMP already runs."""
    q = SITE_CONTENT["quiz"]
    out = ""
    for i, item in enumerate(q["questions"]):
        opts = "".join(
            '<button type="button" class="q-opt" data-w="%d">%s</button>' % (w, html.escape(label))
            for label, w in item["opts"]
        )
        out += (f'<div class="q{" on" if i == 0 else ""}" data-q data-key="{item["key"]}">'
                f'<h3 class="q-ask">{html.escape(item["ask"])}</h3>'
                f'<div class="q-opts">{opts}</div></div>')
    return out


def quiz_data():
    q = SITE_CONTENT["quiz"]
    return json.dumps({"max": sum(max(o[1] for o in i["opts"]) for i in q["questions"]),
                       "bands": q["bands"]})


def faq_block(limit=None, depth=0):
    items = SITE_CONTENT["faq"][:limit] if limit else SITE_CONTENT["faq"]
    out = ""
    for f in items:
        out += ('<div class="acc-item">'
                '<button class="acc-btn" aria-expanded="false">%s<i></i></button>'
                '<div class="acc-panel"><p>%s</p></div></div>'
                % (html.escape(f["q"]), html.escape(f["a"])))
    return out


def team_block():
    out = ""
    for m in SITE_CONTENT["team"]:
        initial = html.escape(m["name"][0])
        out += (f'<div class="tm" data-r>'
                f'<span class="tm-av">{initial}</span>'
                f'<b>{html.escape(m["name"])}</b>'
                f'<span class="tm-role">{html.escape(m["role"])}</span>'
                f'<p>{html.escape(m["note"])}</p>'
                f'</div>')
    return out


def plans_block():
    out = ""
    for pl in SITE_CONTENT["commercial"]["plans"]:
        pts = "".join("<li>%s</li>" % html.escape(x) for x in pl["points"])
        out += (f'<div class="plan" data-r>'
                f'<span class="plan-tag">{html.escape(pl["tag"])}</span>'
                f'<h3>{html.escape(pl["name"])}</h3>'
                f'<p>{html.escape(pl["blurb"])}</p>'
                f'<ul class="signs">{pts}</ul>'
                f'</div>')
    return out


def svc_cat_buttons():
    out = ['<button data-go="all" aria-current="true">Everything</button>']
    for c in CATS:
        out.append('<button data-go="%s">%s</button>' % (c["id"], html.escape(c["label"])))
    return "".join(out)


SVC_ICON = {
    "leak-detection":     '<circle cx="11" cy="11" r="6.4"/><path d="m15.8 15.8 4.6 4.6"/><path d="M11 8.2v5.6M8.4 11h5.2"/>',
    "french-drains":      '<path d="M3 15h18M6 15v-4a6 6 0 0 1 12 0v4"/><path d="M9 19.5h6M7 21.5h10"/>',
    "sump-pumps":         '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M12 11V5M12 5h5a2 2 0 0 1 2 2"/><path d="M9.5 15.5h5"/>',
    "water-damage":       '<path d="M12 3.2S6 9.4 6 13.4a6 6 0 0 0 12 0C18 9.4 12 3.2 12 3.2Z"/><path d="M9.6 13.8a2.4 2.4 0 0 0 2.4 2.4"/>',
    "foundation-repair":  '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M9 20v-5h6v5"/>',
    "mold-remediation":   '<circle cx="8.5" cy="9.5" r="3"/><circle cx="15" cy="13" r="3.6"/><path d="M4 20h16"/>',
    "air-sealing":        '<path d="M3 8h13a3 3 0 1 0-3-3"/><path d="M3 13h16a3 3 0 1 1-3 3"/><path d="M3 18h9"/>',
    "stucco-remediation": '<path d="M4 4h16v16H4z"/><path d="M4 10h16M4 15h16M10 4v6M15 10v5M8 15v5"/>',
    "exterior-repairs":   '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.6V20h13V9.6"/><path d="M10 20v-5h4v5"/>',
    "mold-air-testing":   '<path d="M9.4 3h5.2M10.6 3v5.8L6 17.6A2.4 2.4 0 0 0 8.1 21h7.8a2.4 2.4 0 0 0 2.1-3.4l-4.6-8.8V3"/><path d="M8 15h8"/>',
    "fiberglass-deck-repair":   '<path d="M3 9h18v3H3z"/><path d="M5 12v8M19 12v8"/><path d="M8 5.5 12 3l4 2.5"/><path d="M10 15.5h4"/>',
    "fiberglass-deck-replacement": '<path d="M3 8h18v3H3z"/><path d="M5 11v9M19 11v9"/><path d="M12 2.5v4M10 4.5l2-2 2 2"/><path d="M8 15h8"/>',
    "basement-waterproofing":   '<path d="M3 9.5 12 4l9 5.5"/><path d="M5.5 9v11h13V9"/><path d="M8 20v-5h8v5"/><path d="M8 12.5h8"/>',
    "masonry-pointing":         '<path d="M3 5h18v14H3z"/><path d="M3 9.7h18M3 14.3h18"/><path d="M9 5v4.7M15 9.7v4.6M9 14.3V19"/>',
    "stucco-repair":            '<path d="M4 4h16v16H4z"/><path d="M8 4v16M16 4v16"/><path d="M4 12h16"/><path d="m18 16 2 2-2 2"/>',
    "concrete-repair":          '<path d="M3 13h18v7H3z"/><path d="M8 13v7M16 13v7"/><path d="M6 10.5 12 7l6 3.5"/>',
    "historic-preservation":    '<path d="M4 20h16M6 20V9m12 11V9"/><path d="M3 9h18L12 3.5Z"/><path d="M10 20v-7h4v7"/>',
    "winterization":            '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><path d="M9.5 5 12 3l2.5 2M9.5 19 12 21l2.5-2"/>',
    "efflorescence":            '<path d="M4 4h16v16H4z"/><path d="M4 11h16"/><circle cx="8.5" cy="15.5" r="1.3"/><circle cx="13" cy="17.5" r="1"/><circle cx="16" cy="14.5" r="1.2"/>',
    "odor-investigation":       '<path d="M7 20c0-5 4-5 4-9a3 3 0 1 0-6 0"/><path d="M14 20c0-5 4-5 4-9a3 3 0 0 0-3-3"/>',
    "interior-repairs":         '<path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 10v10h13V10"/><path d="m13.5 13-4 4M11 12.5l1.5 1.5"/>',
    "flooring":                 '<path d="M3 6h18v12H3z"/><path d="M3 10h18M3 14h18"/><path d="M9 6v4M15 10v4M9 14v4"/>',
    "emergency-cleanup":        '<path d="M12 3.2S6.5 9 6.5 13a5.5 5.5 0 0 0 11 0C17.5 9 12 3.2 12 3.2Z"/><path d="M12 9v4M12 15.5h.01"/>',
}


def svc_cards(depth=0, limit=None, exclude=None):
    out = []
    for s in SERVICES:
        if exclude and s["slug"] in exclude:
            continue
        if limit and len(out) >= limit:
            break
        glyph = SVC_ICON.get(s["slug"], SVC_ICON["leak-detection"])
        out.append(f"""
      <a class="svc" data-cat="{s['cat']}" href="{rel(depth,'services/%s.html' % s['slug'])}" data-r>
        <span class="svc-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{glyph}</svg></span>
        <span class="svc-tag">{html.escape(s['scale'])}</span>
        <h3>{html.escape(s['title'])}</h3>
        <p>{html.escape(s['blurb'])}</p>
        <span class="lnk">What we fix {icon('arrow')}</span>
      </a>""")
    return "".join(out)


# ----------------------------------------------------------------- service pages
def build_service(s):
    d = 1
    signs = "".join("<li>%s</li>" % html.escape(x) for x in s["signs"])
    what = "".join('<p class="t1">%s</p>' % html.escape(p) for p in s["what"])
    steps = "".join(
        '<li><span class="n">%02d</span><div><h3>%s</h3><p>%s</p></div></li>'
        % (i + 1, html.escape(st["h"]), html.escape(st["p"]))
        for i, st in enumerate(s["steps"])
    )
    inc = "".join("<li>%s</li>" % html.escape(x) for x in s["includes"])
    faq = "".join(
        f"""<div class="acc-item">
          <button class="acc-btn" aria-expanded="false">{html.escape(f['q'])}<i></i></button>
          <div class="acc-panel"><p>{html.escape(f['a'])}</p></div>
        </div>"""
        for f in s["faq"]
    )
    rel_cards = "".join(
        f"""<a class="svc" href="{BY_SLUG[r]['slug']}.html" data-r>
          <div class="svc-fig"><img src="{rel(d,'assets/img/%s' % BY_SLUG[r]['img'])}" alt="{html.escape(BY_SLUG[r]['title'])}" loading="lazy" width="800" height="500">
          <span class="tagn">{html.escape(BY_SLUG[r]['scale'])}</span></div>
          <div class="svc-body"><h3>{html.escape(BY_SLUG[r]['title'])}</h3>
          <p>{html.escape(BY_SLUG[r]['blurb'])}</p>
          <span class="lnk">What we fix {icon('arrow')}</span></div>
        </a>"""
        for r in s["related"] if r in BY_SLUG
    )

    start_label = {
        "inspection": "Book a paid inspection",
        "project": "Discuss this project",
        "video": "Book a video consultation",
    }[s["start"]]

    body = f"""
<section class="phead">
  <div class="phead-in">
    <div class="phead-txt">
      <p class="crumb"><a href="{rel(d,'index.html')}">Home</a> &nbsp;/&nbsp; <a href="{rel(d,'services.html')}">Services</a> &nbsp;/&nbsp; {html.escape(s['title'])}</p>
      <span class="pill warm">{html.escape(s['scale'])} &middot; {html.escape(CAT_LABEL[s['cat']])}</span>
      <h1 class="d2" style="margin:20px 0 22px;max-width:16ch">{html.escape(s['title'])}</h1>
      <p class="t1" style="max-width:52ch">{html.escape(s['lead'])}</p>
      <div class="row" style="margin-top:32px">
        <a class="b" href="{rel(d,'book.html')}?path={s['start']}">{start_label}</a>
        <a class="b b-ghost" href="tel:{SITE['tel_href']}">{icon('phone')} {SITE['tel']}</a>
      </div>
    </div>
    <figure class="phead-fig"><img src="{rel(d,'assets/img/%s' % s['img'])}" alt="{html.escape(s['title'])}" width="1200" height="900"></figure>
  </div>
</section>

<section class="panel panel-auto">
  <div class="inner">
    <div class="two wide-l">
      <div data-r>
        <p class="kicker">What this actually is</p>
        <div class="stack">{what}</div>
      </div>
      <div data-r data-d="1">
        <p class="kicker">Signs you have this problem</p>
        <ul class="signs">{signs}</ul>
      </div>
    </div>
  </div>
</section>

<section class="panel panel-auto navy" data-nav="navy">
  <div class="inner">
    <div style="max-width:52ch" data-r>
      <p class="kicker">How the work runs</p>
      <h2 class="d3">Every job in this category follows the same order.</h2>
    </div>
    <div class="two" style="margin-top:clamp(34px,5vh,58px);align-items:start">
      <ul class="pr-steps" data-r data-d="1" style="gap:0">{steps}</ul>
      <div data-r data-d="2">
        <p class="kicker">What is included</p>
        <ul class="signs">{inc}</ul>
      </div>
    </div>
  </div>
</section>

<section class="panel panel-auto paper">
  <div class="inner" style="max-width:860px">
    <div data-r>
      <p class="kicker">Questions people ask</p>
      <h2 class="d3" style="margin-bottom:clamp(26px,4vh,40px)">{html.escape(s['short'])}, answered plainly.</h2>
    </div>
    <div class="acc" data-r data-d="1">{faq}</div>
  </div>
</section>

<section class="panel panel-auto">
  <div class="inner">
    <div class="mid" data-r style="margin-bottom:clamp(30px,5vh,50px)">
      <p class="kicker">Related work</p>
      <h2 class="d3">Problems that usually travel with this one.</h2>
    </div>
    <div class="svc-grid">{rel_cards}</div>
  </div>
</section>

<section class="panel panel-auto navy" data-nav="navy">
  <div class="inner mid" style="max-width:760px">
    <div data-r>
      <p class="kicker">Next step</p>
      <h2 class="d2" style="margin-bottom:20px">Start with your ZIP code.</h2>
      <p class="t1" style="margin-bottom:clamp(28px,4vh,40px)">We will tell you straight away whether this is something we can take on at your address.</p>
    </div>
    <div class="zip" data-zip data-zip-next="{rel(d,'book.html')}" data-r data-d="1">
      <form class="zip-form">
        <input type="text" inputmode="numeric" placeholder="Property ZIP code" aria-label="Property ZIP code" maxlength="5">
        <button class="b" type="submit">Check</button>
      </form>
      <div class="zip-out" data-zip-out></div>
      <p class="zip-note">Greater Philadelphia &middot; northern Delaware</p>
    </div>
  </div>
</section>
"""
    write(
        "services/%s.html" % s["slug"],
        "%s in Greater Philadelphia | %s" % (s["title"], SITE["name"]),
        s["blurb"],
        body, depth=1, active="services",
        jsonld=[
            LOCAL_BUSINESS,
            service_schema(s),
            faq_schema(s["faq"]),
            crumb_schema([("Home", "index.html"), ("Services", "services.html"),
                          (s["title"], "services/%s.html" % s["slug"])]),
        ],
    )


# ----------------------------------------------------------------- run
def main():
    PAGE_META = {
        "index.html": ("Moisture Master Pros | Leak Detection, Mold Remediation & Major Moisture Repair",
                       "We find the water, repair the damage, and prove it is dry. Leak detection, mold remediation, drainage, foundations and stucco across Greater Philadelphia and northern Delaware.", ""),
        "services.html": ("Our Services | Moisture Master Pros",
                          "Leak detection, mold remediation, water damage, French drains, sump pumps, foundation repair, air sealing, stucco and exterior repair, explained plainly.", "services"),
        "commercial.html": ("Commercial Property Services | Moisture Master Pros",
                            "Service plans, preventive maintenance and emergency readiness for property managers, facilities teams and building owners across Greater Philadelphia.", "commercial"),
        "work.html": ("Our Work | Moisture Master Pros",
                      "Real assessments, real remediation, real repairs. See what our findings, containment and rebuild work actually look like.", "work"),
        "process.html": ("How It Works | Moisture Master Pros",
                         "Check your ZIP, choose how to start, get a documented assessment, and get a priced scope of work you actually own.", "process"),
        "about.html": ("About Moisture Master Pros",
                       "Founded by Joshua Haynes. IAQA member, BBB accredited, OSHA certified. Over 2,000 properties across Greater Philadelphia.", "about"),
        "book.html": ("Get Started | Moisture Master Pros",
                      "Check your ZIP code, then discuss a repair project, book a paid inspection, or schedule a video consultation.", "book"),
        "case-studies.html": ("Case Studies | Moisture Master Pros",
                              "Six jobs start to finish. What the caller described, what we actually found, what it took to put right, and what it cost.", "case-studies"),
        "contact-us.html": ("Contact Us | Moisture Master Pros",
                            "Send us a message, call 1-833-466-4788, or read the questions people ask before they call. Greater Philadelphia and northern Delaware.", "contact"),
        "contact.html": ("Free Moisture Assessment | Moisture Master Pros",
                         "Eight questions, about sixty seconds, and a read on how urgent your moisture problem looks before anyone asks you for anything.", "contact"),
    }

    for fn, (title, desc, active) in PAGE_META.items():
        src = os.path.join(SRC, fn)
        if not os.path.exists(src):
            print("  ! missing src/%s, skipped" % fn)
            continue
        ld = [LOCAL_BUSINESS]
        if fn == "contact-us.html":
            ld.append(faq_schema(SITE_CONTENT["faq"]))
        write(fn, title, desc, body_of(fn), depth=0, active=active, jsonld=ld)

    for s in SERVICES:
        build_service(s)

    # sitemap + robots, so the SEO work has something to crawl
    urls = "".join(
        '  <url><loc>%s/%s</loc></url>\n' % (SITE["url"], "" if p == "index.html" else p)
        for p in sorted(PAGES))
    with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)
    with open(os.path.join(OUT, "robots.txt"), "w") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE["url"])

    print("built %d pages" % len(PAGES))
    for p in sorted(PAGES):
        print("  ", p)


if __name__ == "__main__":
    main()
