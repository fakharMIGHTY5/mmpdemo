# Moisture Master Pros — website

A static site. No framework, no build step at runtime: what ships is plain HTML,
one stylesheet and one script. That is deliberate — the local SEO work in
progress needs pages a crawler reads on the first request.

## Run it

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Change something

Page bodies live in `src/`. Service content lives in `content/services.json`.
Shared chrome (head, nav, footer, schema) lives in `build.py`. After any edit:

```bash
python3 build.py
```

That regenerates the HTML at the project root, plus `sitemap.xml` and
`robots.txt`. **Never edit the generated `.html` files at the root** — they are
overwritten on the next build.

| I want to change…              | Edit this                                    |
| ------------------------------ | -------------------------------------------- |
| Any service page's content     | `content/services.json`                       |
| Add a whole new service        | `content/services.json` (a new array entry)   |
| Home / about / work / contact  | `src/<page>.html`                             |
| Nav, footer, SEO schema, title | `build.py`                                    |
| Colours, spacing, components   | `css/mmp.css`                                 |
| Service-area ZIPs, funnel, UI  | `js/mmp.js`                                   |

## Pages

- `index.html` — hero and ZIP gate, three conversion paths, the mold test, services, process, work, reviews
- `services.html` — filterable hub for all ten services
- `services/*.html` — ten generated detail pages
- `process.html` — the five-stage sequence and the equipment
- `work.html` — before/after report findings, containment, rebuild
- `about.html` — founder, promises, credentials
- `book.html` — the four-step funnel
- `contact.html` — direct contact and general form

## The three things that are wired up

**ZIP gate.** The service area is the `AREA` table at the top of `js/mmp.js`:
the 49 ZIP codes MMP confirmed, listed explicitly rather than as prefix
ranges, so there is no guessing at the edge of a county. It is the single
source of truth, read by the hero, every service page, the booking funnel and
the contact page. An answer is remembered in `sessionStorage` for the rest of
the visit, so nobody is asked twice.

A ZIP resolves to one of four states:

| State | Meaning | What the visitor is offered |
| --- | --- | --- |
| `in` | on the confirmed list | all three paths |
| `soon` | Florida (320xx to 349xx) | video consultation, plus a waitlist |
| `out` | anywhere else | video consultation, plus a waitlist |
| `bad` | not five digits | a correction |

Florida is announced on the site but not staffed, so it is deliberately absent
from the structured data in `build.py` and it blocks the two on-site paths in
the funnel exactly as an uncovered ZIP does. When crews go live, move the
Florida ZIPs into `AREA`, delete `isSoon`, and add Florida back to
`areaServed`.

**The funnel.** `book.html` runs ZIP → path → details → confirmation. An
out-of-area ZIP disables the two on-site paths and leaves the video
consultation available, rather than letting someone fill in six fields and then
be told no. A path can be deep-linked: `book.html?path=inspection`.

**The mold test.** The interactive piece on the home page, in `initGame`.
Round one is a canvas scrub: procedurally generated growth over a wall, erased
with a soft brush, with coverage measured by downsampling the canvas to 80x50
and summing alpha above a threshold. At 85% the growth fades back in and the
card says so. Round two switches to a line-drawn cross-section of a row
property and asks the player to pick the source from four candidates, with a
real explanation for each wrong answer. It is the company's own argument
— mold is evidence, not the problem — made playable.

The growth pattern is seeded deterministically so a window resize repaints the
same wall rather than dealing a fresh one mid-clean. On touch the stage uses
`touch-action: pan-y`, so a horizontal drag scrubs and a vertical swipe still
scrolls the page.

**The reviews wall.** Two rows of cards drifting in opposite directions,
paused on hover or focus. `initReviews` clones each row's cards once and marks
the clones `aria-hidden`, so the 50% translate loops with no seam and screen
readers and crawlers only see each quote once. Under `prefers-reduced-motion`
the rows stop animating and become plain scrollers. The quotes are real text in
the HTML, not a third-party embed, so they are indexable.

## Brand

Taken from `MMP_Brand Guides.pdf` and the logo files MMP supplied, not invented:

| Token | Value | Role |
| --- | --- | --- |
| `--blue` | `#00557F` | primary: buttons, links, dark grounds |
| `--cyan` | `#35C5DF` | secondary: accents, kickers on dark, rules |
| `--paper` | `#F5F5F5` | alternating section ground |
| `--white` | `#FFFFFF` | page ground |
| accent | `#000000` | reserved; body text uses a near-black |

Typeface is **Roboto** throughout, with **Roboto Mono** for the small
instrument-style labels. Both load from Google Fonts in `build.py`.

`#35C5DF` fails contrast as text on white (about 2:1), so it is used only as
an accent, a rule, or on a dark ground. Anything that has to be read on white
uses `--blue`, which clears 7:1.

The logo ships as two transparent PNGs cut from the supplied artwork:
`assets/ui/mark.png` (colour, for light chrome) and `assets/ui/mark-white.png`
(for dark). Both sit in the DOM and CSS shows one, because swapping `src` on
scroll made the nav flash. The wordmark beside them is live Roboto text, not
an image, so it stays sharp and selectable. Favicons are generated from the
white mark on a `#00557F` tile.

## Copy style

Short sentences. No em dashes or en dashes anywhere in site copy: use a full
stop, a comma, or a colon instead. Section headings run three to seven words.
Body copy is one or two sentences per block. If a paragraph needs a third
sentence, it usually wanted to be a list.

## Before this goes live

These are placeholders or unverified, and need MMP to confirm:

1. **Form submissions go nowhere.** Both `data-lead` handlers log to the console
   and show a confirmation. They need pointing at the CRM or form endpoint —
   one function in `js/mmp.js` each. This is the one blocking item.
2. ~~Service-area ZIP list~~ **Done.** `AREA` now holds the 49 confirmed ZIP
   codes. Note that several Philadelphia codes next to covered ones are *not*
   on the list (19102, 19104, 19107, 19145, 19148 among them) and will be told
   we do not cover them. Confirm that is intended rather than an omission.
3. **The guarantee length.** The current site says a three-year workmanship
   guarantee; several recent reviews say five years and transferable. The site
   currently says five, transferable. Confirm which is right.
4. **Photography.** All job photos are real MMP work, pulled from the AccuMold
   project. The founder portrait is AccuMold-branded and should be reshot or
   swapped for an MMP one.
5. **The colour mark has a soft drop shadow baked into the supplied artwork.**
   It is invisible on white but will show if the mark is ever placed on a
   tinted ground. A flat vector (SVG or EPS) would be better if the designer
   has one.
5. **Review attribution.** Reviews are quoted from the public Google profile and
   attributed as "Google review". Confirm you are happy with that, or replace
   with a live Google reviews embed.
6. **The 4.8 / 200+ rating** appears in three places: the schema in
   `build.py`, the hero trust row, and the reviews panel. It is my estimate,
   not a figure I verified. Structured-data ratings must match a verifiable
   public source, so set the real numbers or remove them. The reviews panel
   also wants a link to the live Google profile, which I did not have.
7. **Consultation and inspection pricing** ($250/$375/$500 and $500/$750) is
   taken from MMP's own published pricing. Confirm it is current.

## Deployment

Vercel, same as the AccuMold site. `vercel.json` sets clean URLs and asset
caching. The project root is the deploy root; there is no build command, so
run `python3 build.py` and commit the output before deploying.
