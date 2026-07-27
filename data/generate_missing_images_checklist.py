"""
Turn data/products_missing_images.csv into a manually-maintained checklist
(data/MISSING_IMAGES_CHECKLIST.md), grouped by category, with a PRE-ASSIGNED
filename per product (continuing the PRD-XXX numbering after whatever's
already in frontend/assets/images/) so there's no ambiguity when saving a
photo or reporting back which one you did — just save it under the exact
filename already printed next to that product, no retyping of names needed.

This is a STARTING POINT, not something to blindly regenerate: once you
start checking boxes off by hand as you source photos, re-running this
script would wipe your progress AND reassign filenames (a product that was
"PRD-391" could become "PRD-402" on a re-run since the missing list shrinks).
If you do need to regenerate it, copy the checked state over by hand first,
or treat any already-saved-but-not-yet-synced photos as a fresh checklist.
"""
import csv
import os
import re
from collections import defaultdict

import pandas as pd

BASE = os.path.dirname(__file__)
IMAGES_DIR = os.path.join(BASE, "..", "frontend", "assets", "images")


def next_prd_number():
    """
    First free PRD-XXX number after everything already spoken for — both
    real image files on disk AND every product_id already reserved in
    products.csv (even ones that don't have a photo yet), so these new
    live-catalog filenames never collide with that other catalog's IDs.
    """
    used = [
        int(m.group(1))
        for f in os.listdir(IMAGES_DIR)
        if (m := re.fullmatch(r"PRD-(\d+)\.(?:jpg|jpeg|png|webp)", f, re.IGNORECASE))
    ]
    prd_csv = pd.read_csv(os.path.join(BASE, "products.csv"))
    reserved = prd_csv["product_id"].str.extract(r"(\d+)")[0].astype(int).tolist()
    return max(used + reserved) + 1


def main():
    rows = list(csv.DictReader(
        open(os.path.join(BASE, "products_missing_images.csv"), encoding="utf-8")
    ))

    by_category = defaultdict(list)
    for r in rows:
        by_category[r["category"]].append((r["brand"], r["product_name"]))

    start = next_prd_number()

    lines = []
    lines.append("# Missing Product Images — Live Catalog Checklist")
    lines.append("")
    lines.append(
        "Products in `data/cleaned_dataset.csv` with no real photo yet. "
        "Each row already has a **pre-assigned filename** — save your photo "
        "under that exact name, no need to retype the product name anywhere."
    )
    lines.append("")
    lines.append(
        "**Workflow:** save the photo into `frontend/assets/images/` using "
        "the filename shown → tell me which filenames you've added → I add "
        "them to `manual_image_overrides.json`, re-run `match_product_images.py`, "
        "and regenerate this checklist (see `GUIDE.md` §9.1)."
    )
    lines.append("")
    lines.append(
        "⚠️ Filenames here are only valid until this file is regenerated — "
        "if the list changes, a product's assigned filename can shift. Get "
        "photos matched in (tell me what you've saved) before regenerating."
    )
    lines.append("")
    lines.append(f"**Total remaining: {len(rows)}**  |  **Next filenames start at `PRD-{start:03d}.jpg`**")
    lines.append("")
    lines.append("---")
    lines.append("")

    counter = start
    for cat in sorted(by_category, key=lambda c: -len(by_category[c])):
        items = sorted(by_category[cat])
        lines.append(f"## {cat} (0/{len(items)} done)")
        lines.append("")
        lines.append("| Done | Save As | Brand | Product Name |")
        lines.append("|---|---|---|---|")
        for brand, name in items:
            lines.append(f"| [ ] | `PRD-{counter:03d}.jpg` | `{brand}` | `{name}` |")
            counter += 1
        lines.append("")

    out_path = os.path.join(BASE, "MISSING_IMAGES_CHECKLIST.md")
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    print(f"Wrote {out_path} ({len(rows)} items across {len(by_category)} categories)")
    print(f"Assigned filenames PRD-{start:03d}.jpg through PRD-{counter - 1:03d}.jpg")


if __name__ == "__main__":
    main()
