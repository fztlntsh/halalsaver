"""
List every unique product in the live catalog (cleaned_dataset.csv) that
still has NO real photo match, grouped by category, for use as a photo
shopping list (same idea as frontend/assets/images/incoming/CHECKLIST.md).

Run AFTER match_product_images.py (reads its output, data/product_images.json).
Writes data/products_missing_images.csv and prints a category breakdown.
"""
import csv
import json
import os
from collections import defaultdict

BASE = os.path.dirname(__file__)


def main():
    with open(os.path.join(BASE, "product_images.json"), encoding="utf-8") as fh:
        matched_names = set(json.load(fh).keys())

    seen = {}
    with open(os.path.join(BASE, "cleaned_dataset.csv"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            name = r["product_name"]
            if name in seen:
                continue
            seen[name] = {"brand": r["brand"], "category": r["category"]}

    missing = {n: info for n, info in seen.items() if n not in matched_names}

    by_category = defaultdict(list)
    for name, info in missing.items():
        by_category[info["category"]].append((info["brand"], name))

    out_path = os.path.join(BASE, "products_missing_images.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["category", "brand", "product_name"])
        for cat in sorted(by_category):
            for brand, name in sorted(by_category[cat]):
                w.writerow([cat, brand, name])

    print(f"Total unique products in live catalog: {len(seen)}")
    print(f"Matched to a real photo:                {len(matched_names)}")
    print(f"Still missing a photo:                   {len(missing)}")
    print(f"Wrote {out_path}\n")
    print("By category:")
    for cat in sorted(by_category, key=lambda c: -len(by_category[c])):
        print(f"  {cat:<25} {len(by_category[cat])}")


if __name__ == "__main__":
    main()
