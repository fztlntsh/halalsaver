# HalalSaver MY — Beginner's Guide to the System

This is a plain-English walkthrough of the whole project, written for someone
opening this folder for the first time. It complements [README.md](README.md)
(which is the formal feature/spec list) — this doc is more "here's what's
actually going on and how to not get confused."

---

## 1. What is this, in one paragraph

HalalSaver MY is a Flask (Python) web app. A visitor browses a catalogue of
6,300 Malaysian grocery products across three stores (Lotus's, Mydin, AEON),
can filter/search/compare them, and — if they sign up — gets personalised
"you should buy this" recommendations from a hybrid recommender (two ML
techniques blended together) that respects their budget and halal
preference. That's the whole product.

---

## 2. IMPORTANT: there are two separate front-ends in this folder

This is the single biggest source of confusion, so read this section first.

| | **The real app (use this)** | **An old static prototype (ignore this)** |
|---|---|---|
| Entry point | `app.py` → visit `http://127.0.0.1:5000/` | `index.html` opened directly by double-click |
| Pages live in | `templates/*.html` (Jinja2, rendered by Flask) | root-level `login.html`, `products.html`, `dashboard.html`, etc. |
| Styling | `static/css/app.css`, `static/css/toggle.css`, `css/styles.css` | `css/styles.css` (shared) + `frontend/css/styles.css` (unused) |
| Behaviour | `js/functions.js` (favourites, compare tray, scroll animations) | `js/main.js` (a huge hardcoded 400-product demo dataset + Firebase login) |
| Product data | `data/cleaned_dataset.csv` (6,300 products) | a hardcoded JS array inside `js/main.js` |
| Actually deployed? | **Yes** — `Procfile` / `render.yaml` run this | No — it's leftover scaffolding from an earlier version of the project |

**Rule of thumb:** if you're not running it through `python app.py` and viewing
it in a browser at `127.0.0.1:5000`, you're probably looking at the wrong
system. All the redesign work described in this guide (glassmorphism,
gradients, bento grid, real product photos) only applies to the Flask
templates — it does **not** touch the root `index.html`/`login.html`/etc.
files.

---

## 3. How to launch it

```powershell
cd "D:\DEG CS230\SYSTEM 1"
.venv\Scripts\python.exe app.py
```

Wait for:
```
[HalalSaver] Loading dataset and models...
[HalalSaver] Matched 1990 / 6300 products to real photos
[HalalSaver] Loaded 6300 products | 13 categories | 3 stores
 * Running on http://127.0.0.1:5000
```

Then open **http://127.0.0.1:5000/** in your browser. Leave the terminal
window open — closing it stops the server. `Ctrl+C` in that terminal stops
it cleanly.

**If a page looks unstyled or stale after you edit CSS/HTML:** hard-refresh
the browser (`Ctrl+Shift+R`). The Flask reloader (`debug=True` in `app.py`)
auto-restarts on Python/template changes, but browsers cache CSS/JS
aggressively.

**A known quirk:** creating an account (`/signup`) or logging in currently
crashes the local dev server on some machines (a Windows-specific gRPC/
OpenSSL issue talking to Firebase — `OPENSSL_Uplink ... no OPENSSL_Applink`).
This is a pre-existing environment issue, not something introduced by any of
the redesign work. If it happens, just restart `python app.py` again. Pages
that don't require login (`/`, `/products`, `/compare?ids=...`) are
unaffected.

---

## 4. What each top-level thing in the folder actually is

```
app.py                 ← the whole app's brain: every URL route lives here
recommender.py          ← the hybrid recommendation algorithm (see §7)
database.py              ← talks to Firebase Firestore (users, favourites, prefs)
evaluate.py               ← offline script that scored the recommender for the FYP report
requirements.txt           ← Python packages needed (pip install -r requirements.txt)
serviceAccountKey.json      ← Firebase credentials (keep private, don't commit)

templates/                ← every HTML page Flask actually serves (Jinja2)
  base.html                ← shared skeleton: navbar, footer, mobile nav — every
                              other template "extends" this one
  home.html, login.html, signup.html, dashboard.html, products.html,
  product_detail.html, comparison.html, ranking.html, preferences.html

static/
  css/app.css               ← the big one: layout + component styles for every page
  css/toggle.css             ← responsive/mobile breakpoint rules
  js/toggle.js                 ← (mostly a stub now, CSS handles responsiveness)

css/styles.css              ← shared design tokens (colours, radius, shadows —
                               loaded by every page via base.html) + some legacy styles
js/functions.js              ← client-side behaviour actually used by the Flask
                               pages: favourites, compare tray, toasts, scroll-reveal
js/main.js                    ← belongs to the OLD static prototype, not the real
                               app — see §2. Also confusingly loaded by base.html
                               for a couple of leftover shared helpers.

data/
  cleaned_dataset.csv         ← THE product catalogue the live app reads (6,300 rows)
  products.csv                 ← a separate, smaller (400-product) catalogue that
                                  the real product PHOTOS are indexed against — see §8
  product_images.json           ← generated file: maps cleaned_dataset.csv product
                                    names → real photo paths (output of match_product_images.py)
  products_missing_images.csv    ← generated file: every product still using a
                                    placeholder image, grouped by category
  user_ratings.csv                ← synthetic ratings used to train the SVD++ model
  match_product_images.py          ← script that builds product_images.json (§8)
  list_missing_images.py            ← script that builds products_missing_images.csv (§9)

models/                        ← pre-trained ML artefacts (loaded at startup, not
                                  retrained on every request — fast)
  svdpp_model.pkl, popularity_scores.pkl, cosine_sim_matrix.pkl

frontend/assets/images/         ← the 302 real product photos, named PRD-001.jpg
                                   … PRD-400.jpg, served at /frontend/assets/...
```

---

## 5. How a page load actually works (e.g. visiting `/products`)

1. Browser requests `GET /products`.
2. `app.py` has `@app.route('/products')` → runs the `products()` function.
3. That function filters/sorts/paginates the in-memory `df` (a pandas
   DataFrame loaded once from `data/cleaned_dataset.csv` when the server
   started — nothing re-reads the CSV per request).
4. It calls `render_template('products.html', products=..., ...)`.
5. `products.html` extends `base.html` (gets the navbar/footer for free) and
   loops over `products` with Jinja `{% for p in products %}` to build the
   HTML for each product card.
6. Flask sends the finished HTML to the browser. The browser also requests
   `static/css/app.css`, `js/functions.js`, etc., which are just files
   served as-is (no templating).

There's no separate frontend build step (no React/Vue/webpack) — Jinja
templates + plain CSS/JS, rendered server-side. This is why editing a
`.html` file in `templates/` and refreshing the browser is enough to see the
change (once the server has restarted / auto-reloaded).

---

## 6. The two "kinds" of pages

- **Server-rendered, static per request** — most pages (`/products`,
  `/comparison`→`/compare`, `/ranking`, home). Flask builds the full HTML
  before sending it.
- **Server-rendered + client-refreshed** — the dashboard's "Your
  Recommendations" section is rendered once on page load, but the
  "Refresh" button calls `fetch('/api/recommend?...')`, which returns JSON,
  and `js` rebuilds just that section's HTML in the browser without a full
  page reload. Look at `refreshRecommendations()` inside `dashboard.html`
  for that pattern.

---

## 7. The recommender, in plain terms (`recommender.py`)

For a logged-in user with a budget and a halal preference, `hybrid_recommend()`:

1. Filters the catalogue down to products that are (a) halal-certified if
   the user wants that, and (b) within budget.
2. Scores every remaining product two different ways:
   - **Content-based score** — how similar the product is to what a
     "typical" user with this budget/category/halal preference would want
     (cosine similarity between a user-preference vector and a
     product-feature vector).
   - **Collaborative score** — an SVD++ model (`models/svdpp_model.pkl`,
     trained offline on `data/user_ratings.csv`) predicts a rating based on
     patterns across other users, similar to how Netflix/Spotify
     recommendations work.
3. Combines them: `final_score = 0.9 × max(content, collaborative) + 0.1 × popularity`.
4. Returns the top N products sorted by that score.

This function is used by `/dashboard`, `/api/recommend`, and the compare
route. It's re-run on every request (fast — the model is pre-trained, this
step is just inference, not training).

---

## 8. Where the real product photos come from

There are **two independently-built product catalogues** in this project,
with no shared IDs:

- `data/cleaned_dataset.csv` — 6,300 rows, ids like `LOTUS-0001`. This is
  what the live app actually shows.
- `data/products.csv` — 400 rows, ids like `PRD-001`. This is the smaller
  catalogue that someone manually photographed real products for — 302 of
  those 400 have a real `.jpg` sitting in
  `frontend/assets/images/PRD-XXX.jpg`.

Since they don't share IDs, `data/match_product_images.py` does a **fuzzy
match by brand + product name** between the two catalogues (e.g.
`"Milo Activ-Go 3-in-1 Chocolate Drink"` in the live catalogue gets matched
against `"Milo 3-in-1 (30 sachets)"` in the photographed catalogue if the
brand matches and enough name words overlap). Brand match is mandatory —
it deliberately will not, say, show a Spritzer photo on an Evian product
just because both say "mineral water."

The output is `data/product_images.json` — a simple lookup:
`{ "product name": "/frontend/assets/images/PRD-042.jpg" }`. `app.py` loads
this once at startup and attaches it to every product as `image_local`.
Every template shows `p.image_local` if present, otherwise falls back to a
`placehold.co` placeholder box.

**To re-run the matching** (e.g. after adding more real photos to
`frontend/assets/images/`):
```powershell
.venv\Scripts\python.exe data\match_product_images.py
```
Then restart `app.py` so it picks up the new `product_images.json`.

Current coverage: **2,155 of 2,163 unique live-catalog products** (≈99.6%)
have a real photo, which covers **6,288 of the 6,300 rows** once you count
all three store variants of each matched product. 831 of those come from
the automated brand+name matcher; 1,324 come from
`data/manual_image_overrides.json` — most of those via sibling-linking
(reusing an already-photographed size variant's photo for the same base
product, see §9) rather than one-by-one hand review.

**A note on matching quality:** a shared brand does not mean a safe photo
swap — e.g. Nestlé makes cereal, ice cream, *and* baby formula, so
"same brand" alone would happily put an ice-cream photo on a baby-formula
product if the threshold were loosened. The automated matcher requires
*both* a brand match *and* meaningful product-name overlap before it
auto-applies anything; anything weaker than that gets written to
`data/candidate_matches.csv` for a human to review (§9.1), not applied
automatically.

---

## 9. Products still missing a real photo

Run this any time to regenerate the list:
```powershell
.venv\Scripts\python.exe data\list_missing_images.py
```
It writes `data/products_missing_images.csv` (product name + brand +
category for every unmatched product) and prints a per-category count.

For an actual working checklist (checkbox per product, grouped by category
— same idea as `frontend/assets/images/incoming/CHECKLIST.md`), see
**[data/MISSING_IMAGES_CHECKLIST.md](data/MISSING_IMAGES_CHECKLIST.md)**.
It's a one-time generated starting point (`data\generate_missing_images_checklist.py`)
meant to be checked off by hand as you source photos — don't re-run the
generator carelessly once you've started checking boxes, since it
overwrites the file from scratch (all unchecked). As of the last run,
**only 2 products remain** (both Health & Wellness — Appeton Weight Gain
Chocolate and Minyak Angin Cap Kapak), down from an original 1,592.

**Why the count dropped so much more than photos taken:** `generate_datasets.js`
assigns each synthetic size variant a random pack unit (`extraUnits`,
mixing L/ml with kg/g) with no regard for whether the product is even a
liquid or solid — so the same base product often shows up as several
"different" catalogue rows (e.g. a powder detergent labelled both "1kg"
and a nonsensical "1L"). Rather than editing those units in the live
dataset, `data/photo_group_map.json` records which product names each
checklist filename also covers once photographed, so one photo resolves
every size variant of that product at once. This is why the checklist
shrank from 1,592 to 2 while nowhere near 1,590 individual photos were
taken — see the note block at the top of
`MISSING_IMAGES_CHECKLIST.md` itself for the mechanism.

### 9.1 Reviewing near-miss candidates (unused real photos)

Not every photographed product actually gets used — as of the last run,
**199 of the 302 real photos aren't matched to anything**, because the
automated matcher is deliberately strict (see the note in §8). To surface
those as reviewable suggestions rather than lost coverage, run:
```powershell
.venv\Scripts\python.exe data\find_candidate_matches.py
```
This writes `data/candidate_matches.csv` — for every unused photo, the
closest missing live products by a *looser* score (brand match is a bonus,
not mandatory). **Do not bulk-apply this file** — most rows in it are
wrong on inspection (e.g. it will confidently suggest a deodorant photo for
a carton of eggs, purely because "fa" happens to be a substring of "farm").
Eyeball each row; if a pair is genuinely the same product or a trivial
flavour/size variant, add it to `data/manual_image_overrides.json`
(`"live product name": "/frontend/assets/images/PRD-XXX.jpg"`), then
re-run `match_product_images.py` to fold it in.

---

## 10. The visual design system (what got built this session)

Everything below lives in `static/css/app.css` unless noted, and is shared
by every Flask-rendered page via `base.html`.

- **Design tokens** — `css/styles.css` `:root` block: `--radius-card` (22px,
  used on every card), `--shadow-card` / `--shadow-card-hover`,
  `--ease-premium` (one consistent animation curve used everywhere),
  `--accent-blue`. Change these in one place to retheme the whole site.
- **Floating blurred navbar** — `.web-navbar` uses `backdrop-filter: blur()`
  and a translucent background instead of solid white.
- **Glassmorphism cards** — login/signup forms, the home hero, and the
  featured-recommendation card all use `backdrop-filter: blur()` +
  translucent backgrounds.
- **Animated mesh gradient** — the home page hero (`.hero-section`) uses
  four layered radial gradients that slowly drift (`heroMeshDrift`
  keyframes), plus floating blurred "blob" shapes (`.hero-bg-blobs`).
- **Scroll-reveal animations** — cards fade + slide in as they enter the
  viewport. Implemented in `js/functions.js` (`_hsInitScrollReveal()`) using
  `IntersectionObserver`; the CSS classes are `.reveal-init` /
  `.reveal-in`. Applies automatically to `.product-card`, `.dash-card`,
  `.ranking-item`, etc. — no per-page setup needed.
- **Bento grid dashboard** — `.dashboard-widgets` uses CSS Grid
  (`grid-template-areas`) so the budget tracker is a full-width strip, the
  recommendations tile is large or the left, and preferences/quick-actions/
  stats stack as smaller tiles on the right.
- **Soft glow** — the ranking page's #1 podium spot and the dashboard's
  "Top Pick" recommendation card both get a pulsing radial glow
  (`podiumGlowPulse` keyframes).
- **Micro-animations** — heart/compare icon buttons scale on hover/click,
  category icons tilt on hover, quick-nav chevrons slide.

If you want to change a colour, corner radius, or animation speed
**everywhere at once**, edit the tokens in `css/styles.css` `:root` rather
than hunting through `app.css`.

### 10.1 Mobile/web feature-parity fixes

`static/css/toggle.css` controls `.web-only` / `.mobile-only` via a
`max-width: 768px` media query (replaced an older manual JS class-toggle
system — see the comment at the top of that file). Three sections had a
leftover `web-only` class from before that replacement that hid content
on mobile the responsive CSS was already fully set up to handle (the
mobile-width grid/column rules existed and were simply unused) — fixed:

- **Dashboard** (`templates/dashboard.html`) — the "Edit Preferences"
  header button and the entire right sidebar (My Preferences summary +
  Quick Actions cards) were `web-only` with no mobile equivalent. Removed
  the class; `.dashboard-widgets`' existing 1-column mobile layout stacks
  them correctly below the main content, no CSS changes needed.
- **Products page** (`templates/products.html`) — the desktop "Sort by"
  dropdown had no mobile equivalent (the mobile filter drawer only had
  Category/Store/Price/Halal). Added a matching Sort control at the top
  of the drawer, calling the same `sortProducts()` JS function. While
  there, also fixed `sortProducts()` silently ignoring the `discount` sort
  key (the "Biggest Discount" option did nothing on desktop either) using
  the `data-discount` attribute already present on `.product-card`.
- **Homepage** (`templates/home.html`) — the "How HalalSaver MY Works"
  4-step explainer section was entirely `web-only`; first-time mobile
  visitors never saw it. Removed the class; `.how-steps`' existing
  responsive `grid-template-columns` rules (2 cols → 1 col) handle it.

All three verified by driving a headless browser at a 390×844 mobile
viewport against the actual running app, not just read from the CSS.

---

## 11. "I want to change X" cheat-sheet

| I want to... | Edit this |
|---|---|
| Change wording/layout on a specific page | the matching file in `templates/` |
| Change the navbar or footer (shared by every page) | `templates/base.html` |
| Change any page's colours/spacing/card look | `static/css/app.css` (or the shared tokens in `css/styles.css`) |
| Change what happens when you click "Favourite" / "Compare" | `js/functions.js` |
| Change how recommendations are scored | `recommender.py` |
| Add/change a URL route or API endpoint | `app.py` |
| Add more real product photos | drop `PRD-XXX.jpg` files in `frontend/assets/images/`, matching the IDs in `data/products.csv`, then re-run `match_product_images.py` and restart the server |
| See which products still need a real photo | `data/products_missing_images.csv` (regenerate with `list_missing_images.py`) |
| Rescue a few more matches from photos already taken | `data/find_candidate_matches.py` → review `candidate_matches.csv` by eye → add good ones to `manual_image_overrides.json` |

---

## 12. Quick glossary

- **Jinja2** — the templating language Flask uses (`{{ variable }}`,
  `{% for x in y %}`). It's just Python-flavoured HTML.
- **`df`** — shorthand used throughout `app.py`/`recommender.py` for the
  main pandas DataFrame (the whole product catalogue loaded into memory).
- **SVD++** — a collaborative-filtering algorithm (same family used by old
  Netflix Prize recommender systems) trained on synthetic user ratings.
- **Cosine similarity** — a math formula that measures how "similar" two
  vectors point (used here to compare a user's preferences to a product's
  features).
- **Halal-certified** — in this dataset, a boolean flag plus a fake JAKIM
  reference number, simulating real Malaysian halal certification data for
  academic/demo purposes (see the dataset's own disclaimer in
  `data/products.json`).
