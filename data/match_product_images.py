"""
Match the live app's catalog (cleaned_dataset.csv, LOTUS-/AEON-/MYDIN- ids)
against the smaller photographed catalog (products.csv, PRD-xxx ids) by
brand + product name, so real product photos can be reused across the
larger dataset. Two independently-authored catalogs -> no shared ids,
so this is a fuzzy name/brand match, not an exact join.

Outputs data/product_images.json: { cleaned_dataset_product_name: image_path }
keyed by product_name (not product_id) since the same base product repeats
under LOTUS-/AEON-/MYDIN- with identical names.
"""
import csv
import json
import os
import re
import unicodedata

BASE = os.path.dirname(__file__)
IMAGES_DIR = os.path.join(BASE, "..", "frontend", "assets", "images")

STOPWORDS = {
    "the", "with", "in", "of", "and", "original", "flavour", "flavoured",
    "flavored", "pack", "family", "size",
    # synthetic pack/SKU-variant suffixes the dataset generator appends to
    # pad the catalog (see generate_datasets.js variantSuffixes) — strip
    # them so e.g. "... Eco Pack" / "... Twin Pack" still matches whatever
    # photo the plain base product matched to.
    "eco", "bundle", "refill", "value", "limited", "edition", "new",
    "formula", "twin",
}


def fold_ascii(text):
    """Nestlé -> Nestle, Nescafé -> Nescafe — fold instead of stripping so
    brand names still line up against the plain-ascii live catalog."""
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def normalize(text):
    text = text.lower()
    text = fold_ascii(text)
    text = re.sub(r"[’']", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    # strip pack/weight-ish tokens like 3in1, 500ml, 5kg, 30sachets
    tokens = []
    for tok in text.split():
        if re.fullmatch(r"\d+(ml|g|kg|l|pcs|sachets|in1|x\d+)?", tok):
            continue
        if tok in STOPWORDS:
            continue
        tokens.append(tok)
    return tokens


def load_photographed_products():
    """PRD products that actually have a local photo file."""
    have_ids = {
        f.replace(".jpg", "")
        for f in os.listdir(IMAGES_DIR)
        if f.startswith("PRD-") and f.endswith(".jpg")
    }
    rows = []
    with open(os.path.join(BASE, "products.csv"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["product_id"] not in have_ids:
                continue
            name_tokens = set(normalize(r["name"]))
            rows.append({
                "id": r["product_id"],
                "brand": fold_ascii(r["brand"].strip().lower()),
                "name": r["name"],
                "name_tokens": name_tokens,
                "image": f"/frontend/assets/images/{r['product_id']}.jpg",
            })
    return rows


def load_live_catalog_unique_products():
    seen = {}
    with open(os.path.join(BASE, "cleaned_dataset.csv"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            name = r["product_name"]
            if name in seen:
                continue
            name_tokens = set(normalize(name))
            seen[name] = {"brand": fold_ascii(r["brand"].strip().lower()), "name_tokens": name_tokens}
    return seen


def same_brand(a, b):
    if not a or not b:
        return False
    return a == b or a in b or b in a


def best_match(target_brand, target_name_tokens, candidates):
    """Brand match is mandatory; among same-brand candidates, require
    meaningful overlap in the *product name* itself (not just the brand)
    so e.g. 'Farmhouse Fresh Milk' doesn't borrow a 'Farmhouse Prawns' photo."""
    best, best_score = None, 0.0
    for c in candidates:
        if not same_brand(target_brand, c["brand"]):
            continue
        if not target_name_tokens or not c["name_tokens"]:
            continue
        overlap = target_name_tokens & c["name_tokens"]
        union = target_name_tokens | c["name_tokens"]
        jaccard = len(overlap) / len(union) if union else 0
        if jaccard > best_score:
            best_score, best = jaccard, c
    return (best, best_score) if best and best_score >= 0.3 else (None, best_score)


def load_manual_overrides():
    """Hand-reviewed pairs that the automated brand+name matcher couldn't
    reach on its own (see data/candidate_matches.csv + find_candidate_matches.py)
    but were confirmed by eye to be the same product or a trivial flavour/
    size variant. Deliberately small and conservative — most near-miss
    candidates get rejected because a shared brand does NOT mean a safe
    photo swap (e.g. a cereal brand also makes ice cream and baby formula)."""
    path = os.path.join(BASE, "manual_image_overrides.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    photographed = load_photographed_products()
    live_products = load_live_catalog_unique_products()
    manual = load_manual_overrides()

    mapping = {}
    matched_pairs = []
    for name, info in live_products.items():
        match, score = best_match(info["brand"], info["name_tokens"], photographed)
        if match:
            mapping[name] = match["image"]
            matched_pairs.append((name, match["name"], round(score, 2)))

    applied_manual = 0
    for name, image in manual.items():
        if name in live_products and name not in mapping:
            mapping[name] = image
            applied_manual += 1

    out_path = os.path.join(BASE, "product_images.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(mapping, fh, indent=2, ensure_ascii=False)

    print(f"Photographed PRD products available: {len(photographed)}")
    print(f"Unique live-catalog products:         {len(live_products)}")
    print(f"Matched automatically:                {len(mapping) - applied_manual}")
    print(f"Matched via manual overrides:          {applied_manual}")
    print(f"Total matched:                         {len(mapping)}")
    print(f"Wrote {out_path}")
    print("\nSample matches:")
    for live_name, prd_name, score in matched_pairs[:25]:
        print(f"  [{score}] {live_name!r}  <-  {prd_name!r}")


if __name__ == "__main__":
    main()
