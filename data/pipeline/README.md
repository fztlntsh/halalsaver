# Dataset generation pipeline (archived)

One-time scripts that built the two source catalogs this project starts
from. Already run — their outputs (`data/cleaned_dataset.csv`,
`data/products.csv`) exist and are what the live app actually uses. Kept
here for reproducibility / thesis methodology reference (Section 3.2.3.2),
not meant to be re-run casually.

## Live catalog (6,300 rows, `data/cleaned_dataset.csv`)

1. `generate_datasets.js` → synthesises `products_lotus.csv`,
   `products_mydin.csv`, `products_aeon.csv`, then combines them into
   `products_combined.csv` (all in this folder).
2. `preprocess.js` → cleans/normalises/label-encodes `products_combined.csv`
   → writes `../cleaned_dataset.csv` (Section 3.2.3.2 of the thesis).

⚠️ **`cleaned_dataset.csv` has since been manually enriched** — real
product photos matched onto specific rows, and synthetic pack-size
suffixes ("Eco Pack", "Twin Pack", etc.) replaced with realistic units.
Re-running step 2 regenerates it from scratch and **wipes those
improvements**. If you do need to re-run it, re-apply the image sync
afterward (see `data/match_product_images.py` and
`data/MISSING_IMAGES_CHECKLIST.md`).

## Photographed catalog (400 rows, `data/products.csv`)

Built incrementally across three scripts, each appending more rows to the
same file — run in this order historically:

1. `gen_products.js` — initial rows
2. `gen_products.py` — appended PRD-401 to PRD-800
3. `gen_products2.js` — appended PRD-721 to PRD-801

`gen_products2.js` originally had a hardcoded path to a stray sibling
folder from before this project was renamed/moved — fixed to resolve
relative to itself instead.
