"""
data/products.csv and data/products.json (the 400-item / 80-item PRD
catalogs) still carry stale image_url values from before any photos were
sourced — fake local paths like "assets/images/tuna.png" that never
existed, or old openfoodfacts.org placeholder URLs. Point them at the real
photos in frontend/assets/images/ instead (empty string if no photo exists
for that product yet), so the files are internally consistent with what's
actually on disk.
"""
import csv
import json
import os

BASE = os.path.dirname(__file__)
IMAGES_DIR = os.path.join(BASE, "..", "frontend", "assets", "images")


def real_photo_ids():
    return {
        f.replace(".jpg", "")
        for f in os.listdir(IMAGES_DIR)
        if f.startswith("PRD-") and f.endswith(".jpg")
    }


def fix_csv(have_ids):
    path = os.path.join(BASE, "products.csv")
    with open(path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
        fieldnames = list(rows[0].keys())

    updated = 0
    for r in rows:
        new_url = f"/frontend/assets/images/{r['product_id']}.jpg" if r["product_id"] in have_ids else ""
        if r.get("image_url") != new_url:
            r["image_url"] = new_url
            updated += 1

    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"products.csv: updated image_url on {updated} / {len(rows)} rows")


def fix_json(have_ids):
    path = os.path.join(BASE, "products.json")
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    updated = 0
    for p in data["products"]:
        new_url = f"/frontend/assets/images/{p['product_id']}.jpg" if p["product_id"] in have_ids else ""
        if p.get("image_url") != new_url:
            p["image_url"] = new_url
            updated += 1

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"products.json: updated image_url on {updated} / {len(data['products'])} products")


def main():
    have_ids = real_photo_ids()
    print(f"Real photos on disk: {len(have_ids)}")
    fix_csv(have_ids)
    fix_json(have_ids)


if __name__ == "__main__":
    main()
