"""
For every photographed PRD product that ISN'T currently being used by any
live-catalog product (see match_product_images.py), suggest the closest
candidate(s) among the still-missing live products using a looser score
(brand match is no longer mandatory, just weighted heavily). This is a
review list, not an auto-apply — brand-less matches are risky, so a human
should eyeball the CSV before promoting any of these into the real mapping.

Writes data/candidate_matches.csv:
  prd_id, prd_brand, prd_name, candidate_live_name, candidate_live_brand,
  candidate_live_category, score, same_brand
"""
import csv
import json
import os

from match_product_images import normalize, load_photographed_products, load_live_catalog_unique_products, same_brand

BASE = os.path.dirname(__file__)


def score_pair(a_tokens, a_brand, b_tokens, b_brand):
    if not a_tokens or not b_tokens:
        return 0.0
    overlap = a_tokens & b_tokens
    union = a_tokens | b_tokens
    jaccard = len(overlap) / len(union) if union else 0
    bonus = 0.25 if same_brand(a_brand, b_brand) else 0
    return jaccard + bonus


def main():
    with open(os.path.join(BASE, "product_images.json"), encoding="utf-8") as fh:
        used_images = set(json.load(fh).values())

    photographed = load_photographed_products()
    unused_prd = [p for p in photographed if p["image"] not in used_images]

    live = load_live_catalog_unique_products()
    with open(os.path.join(BASE, "cleaned_dataset.csv"), encoding="utf-8") as fh:
        cat_by_name = {}
        for r in csv.DictReader(fh):
            cat_by_name.setdefault(r["product_name"], r["category"])

    already_matched_names = set(json.load(open(os.path.join(BASE, "product_images.json"), encoding="utf-8")).keys())
    missing_live = {n: info for n, info in live.items() if n not in already_matched_names}

    rows = []
    for prd in unused_prd:
        candidates = []
        for name, info in missing_live.items():
            s = score_pair(prd["name_tokens"], prd["brand"], info["name_tokens"], info["brand"])
            if s >= 0.25:
                candidates.append((s, name, info["brand"], same_brand(prd["brand"], info["brand"])))
        candidates.sort(key=lambda c: -c[0])
        for s, name, brand, sb in candidates[:2]:
            rows.append({
                "prd_id": prd["id"],
                "prd_brand": prd["brand"],
                "prd_name": prd["name"],
                "candidate_live_name": name,
                "candidate_live_brand": brand,
                "candidate_live_category": cat_by_name.get(name, ""),
                "score": round(s, 2),
                "same_brand": sb,
            })

    rows.sort(key=lambda r: -r["score"])
    out_path = os.path.join(BASE, "candidate_matches.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else [
            "prd_id", "prd_brand", "prd_name", "candidate_live_name",
            "candidate_live_brand", "candidate_live_category", "score", "same_brand",
        ])
        w.writeheader()
        w.writerows(rows)

    print(f"Unused photographed products: {len(unused_prd)}")
    print(f"Candidate suggestions written: {len(rows)}")
    print(f"Wrote {out_path}\n")
    print("Top 30 by score:")
    for r in rows[:30]:
        flag = "SAME BRAND" if r["same_brand"] else "diff brand"
        print(f"  [{r['score']}] ({flag}) {r['prd_brand']} / {r['prd_name']!r}  ->  {r['candidate_live_name']!r}")


if __name__ == "__main__":
    main()
