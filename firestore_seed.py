"""
firestore_seed.py
HalalSaver MY — Upload cleaned_dataset.csv to Firestore
FYP — CS230 | UiTM

Run once:  python firestore_seed.py

Uploads all rows from data/cleaned_dataset.csv to the Firestore
'grocery_items' collection in batches of 500 (Firestore limit).

Requires:
  - serviceAccountKey.json in project root
  - firebase-admin installed:  uv pip install firebase-admin
"""

from __future__ import annotations

import math
import os
import sys
import json
from pathlib import Path

import pandas as pd

# ─── Firebase init ────────────────────────────────────────────────────────────

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("[Seed] firebase-admin not installed. Run: uv pip install firebase-admin")
    sys.exit(1)

SERVICE_ACCOUNT_PATH = Path("serviceAccountKey.json")
if not SERVICE_ACCOUNT_PATH.exists():
    print("[Seed] serviceAccountKey.json not found. Cannot connect to Firestore.")
    sys.exit(1)

if not firebase_admin._apps:
    _sa = json.loads(SERVICE_ACCOUNT_PATH.read_text())
    _project_id = _sa.get("project_id", "")
    _rdb_url = os.getenv(
        "FIREBASE_DATABASE_URL",
        f"https://{_project_id}-default-rtdb.firebaseio.com",
    )
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
    firebase_admin.initialize_app(cred, {"databaseURL": _rdb_url})

db = firestore.client()

# ─── Load CSV ─────────────────────────────────────────────────────────────────

CSV_PATH = Path("data/cleaned_dataset.csv")
if not CSV_PATH.exists():
    print(f"[Seed] {CSV_PATH} not found.")
    sys.exit(1)

df = pd.read_csv(CSV_PATH)
print(f"[Seed] Loaded {len(df)} rows from {CSV_PATH}")

# ─── Normalise rows ───────────────────────────────────────────────────────────

def row_to_doc(row: dict) -> dict:
    """Convert a DataFrame row to a Firestore-safe dict."""
    doc = {}
    for k, v in row.items():
        if pd.isna(v) if not isinstance(v, (list, dict)) else False:
            doc[k] = None
        elif isinstance(v, float):
            doc[k] = round(float(v), 4)
        elif hasattr(v, 'item'):   # numpy scalar
            doc[k] = v.item()
        else:
            doc[k] = v
    return doc

# ─── Batch upload (500 per commit) ───────────────────────────────────────────

BATCH_SIZE  = 500
total_rows  = len(df)
n_batches   = math.ceil(total_rows / BATCH_SIZE)
uploaded    = 0
skipped     = 0

print(f"[Seed] Uploading {total_rows} products in {n_batches} batches of {BATCH_SIZE}...")

for batch_num in range(n_batches):
    start = batch_num * BATCH_SIZE
    end   = min(start + BATCH_SIZE, total_rows)
    chunk = df.iloc[start:end]

    batch = db.batch()
    for _, row in chunk.iterrows():
        doc  = row_to_doc(row.to_dict())
        pid  = str(doc.get("product_id", ""))
        if not pid:
            skipped += 1
            continue
        ref = db.collection("grocery_items").document(pid)
        batch.set(ref, doc, merge=True)
        uploaded += 1

    batch.commit()
    pct = round((end / total_rows) * 100, 1)
    print(f"  Batch {batch_num + 1}/{n_batches} committed ({end}/{total_rows} — {pct}%)")

print(f"\n[Seed] Done. {uploaded} documents uploaded, {skipped} skipped (missing product_id).")
