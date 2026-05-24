"""
recommender.py
HalalSaver MY — Hybrid Grocery Recommender System
FYP — CS230 | UiTM

Implements three components as described in thesis Chapter 3:

  [A] Content-Based Filtering   — Cosine Similarity    (Section 3.2.3.3 / Eq. 3.1)
  [B] Item-Based Collaborative  — SVD++                (Section 3.2.3.4 / Eq. 3.2)
  [C] Hybrid Weighted Approach  — Weighted Combination (Section 3.2.3.5 / Fig. 3.16)

Dependencies: numpy, pandas, scikit-learn  (no scikit-surprise required)
"""

from __future__ import annotations

import math
import pickle
import random
import warnings
from pathlib import Path
from collections import defaultdict

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_similarity

warnings.filterwarnings("ignore")

# ─── PATHS ────────────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

CLEANED_CSV    = DATA_DIR  / "cleaned_dataset.csv"
RATINGS_CSV    = DATA_DIR  / "user_ratings.csv"
COSINE_PKL     = MODELS_DIR / "cosine_sim_matrix.pkl"
SVDPP_PKL      = MODELS_DIR / "svdpp_model.pkl"
POPULARITY_PKL = MODELS_DIR / "popularity_scores.pkl"

# ─── HYPER-PARAMETERS ────────────────────────────────────────────────────────

NUM_USERS        = 500           # simulated users
RATINGS_PER_USER = (20, 50)      # explicit ratings per user (min, max)
N_FACTORS        = 20            # SVD++ latent dimension
N_EPOCHS         = 25            # SGD training epochs
LR               = 0.005         # learning rate  (η)
REG              = 0.02          # L2 regularisation (λ)
RATING_MIN       = 1.0
RATING_MAX       = 5.0

# Feature vector layout shared between user preference and product vectors
# dim-0: price (budget_norm / price_after_discount_norm)
# dim-1: category (category_enc / n_cats-1)
# dim-2: halal flag (1.0 / 0.0)
FEAT_DIM = 3


# ═══════════════════════════════════════════════════════════════════════════════
# [A]  CONTENT-BASED FILTERING — Cosine Similarity  (Section 3.2.3.3)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Thesis Equation (3.1):
#
#      Cosine Similarity(A, B) = (A · B) / (||A|| × ||B||)
#
#  A = User Preference Vector    [budget_norm,  category_norm, halal_flag]
#  B = Grocery Item Feature Vec  [price_norm,   category_norm, halal_flag]
#
# ═══════════════════════════════════════════════════════════════════════════════


def get_content_score(user_vector: list[float],
                      product_vector: list[float]) -> float:
    """
    Cosine similarity between user preference vector A and item feature vector B.

    Implements Thesis Equation (3.1):
        Cosine Similarity(A, B) = (A · B) / (||A|| × ||B||)

    Parameters
    ----------
    user_vector    : [budget_norm,  category_norm, halal_flag]  — vector A
    product_vector : [price_norm,   category_norm, halal_flag]  — vector B

    Returns
    -------
    float in [0.0, 1.0] — higher = more relevant to user preferences
    """
    A = np.asarray(user_vector,    dtype=np.float64)
    B = np.asarray(product_vector, dtype=np.float64)

    dot_product = float(np.dot(A, B))           # A · B
    mag_A       = float(np.linalg.norm(A))      # ||A||
    mag_B       = float(np.linalg.norm(B))      # ||B||

    if mag_A == 0.0 or mag_B == 0.0:
        return 0.0

    sim = dot_product / (mag_A * mag_B)
    return float(np.clip(sim, 0.0, 1.0))


def _product_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Build (n_products × FEAT_DIM) product feature matrix.
    Layout: [price_after_discount_norm, category_norm, halal_flag]
    """
    n_cats = int(df["category_enc"].max()) + 1
    halal_col = (
        df["halal_certified"]
        .map({True: 1.0, False: 0.0, "True": 1.0, "False": 0.0})
        .astype(float)
        .values
    )
    return np.column_stack([
        df["price_after_discount_norm"].values.astype(float),
        (df["category_enc"].values / (n_cats - 1)).astype(float),
        halal_col,
    ])


def build_content_model(df: pd.DataFrame) -> np.ndarray:
    """
    Build the item-item cosine similarity matrix and save to COSINE_PKL.

    Matrix shape: (n_products × n_products).
    Entry [i,j] = cosine similarity between product i and product j
    based on their 3-D feature vectors.

    Returns the feature matrix (n_products × FEAT_DIM).
    """
    print("[A] Building product feature matrix …")
    feat_mat = _product_feature_matrix(df)

    n = len(df)
    print(f"    Computing {n} × {n} cosine similarity matrix …")
    cosine_matrix = sk_cosine_similarity(feat_mat)           # (n × n)

    payload = {
        "matrix":      cosine_matrix,
        "product_ids": df["product_id"].values,
    }
    with open(COSINE_PKL, "wb") as fh:
        pickle.dump(payload, fh)
    print(f"    Saved cosine_sim_matrix.pkl  shape={cosine_matrix.shape}")
    return feat_mat


# ═══════════════════════════════════════════════════════════════════════════════
# [B]  ITEM-BASED COLLABORATIVE FILTERING — SVD++  (Section 3.2.3.4)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Thesis Equation (3.2) — SVD++ prediction rule:
#
#      r̂_ui = μ + b_u + b_i + q_iᵀ ( p_u + (1/√|N(u)|) Σ_{j∈N(u)} y_j )
#
#  μ     — global average rating
#  b_u   — user u bias
#  b_i   — item i bias
#  p_u   — latent factor vector of user u          (n_factors,)
#  q_i   — latent factor vector of item i          (n_factors,)
#  N(u)  — set of items user u has interacted with (implicit feedback)
#  y_j   — implicit feedback factor vector for item j
#
#  SGD update rules (per rating e_ui = r_ui − r̂_ui):
#    b_u   += η·(e_ui − λ·b_u)
#    b_i   += η·(e_ui − λ·b_i)
#    q_i   += η·(e_ui·(p_u + implicit_sum) − λ·q_i)
#    p_u   += η·(e_ui·q_i − λ·p_u)
#    ∀ j∈N(u): y_j += η·(e_ui·q_i / √|N(u)| − λ·y_j)
#
# ═══════════════════════════════════════════════════════════════════════════════


class SVDPlusPlus:
    """
    Pure-NumPy implementation of SVD++ (Koren, 2008).

    Implements Thesis Equation (3.2) exactly.  Handles both explicit ratings
    and implicit feedback (items a user has interacted with but may not have
    rated — the set N(u)).
    """

    def __init__(self, n_factors: int = N_FACTORS,
                 n_epochs: int = N_EPOCHS,
                 lr: float = LR, reg: float = REG,
                 random_state: int = 42) -> None:
        self.n_factors    = n_factors
        self.n_epochs     = n_epochs
        self.lr           = lr
        self.reg          = reg
        self.random_state = random_state

        # Will be filled by .fit()
        self.mu_: float = 0.0
        self.bu_: dict  = {}          # user biases
        self.bi_: dict  = {}          # item biases
        self.pu_: dict  = {}          # user latent vectors
        self.qi_: dict  = {}          # item latent vectors
        self.yi_: dict  = {}          # implicit feedback vectors
        self._users: list = []
        self._items: list = []

    # ── internal helpers ─────────────────────────────────────────────────────

    def _init_vec(self) -> np.ndarray:
        return np.random.normal(0, 0.1, self.n_factors)

    def _implicit_sum(self, Nu: list[str]) -> np.ndarray:
        """
        Compute (1/√|N(u)|) Σ_{j∈N(u)} y_j  — the implicit feedback term.
        """
        if not Nu:
            return np.zeros(self.n_factors)
        scale = 1.0 / math.sqrt(len(Nu))
        return scale * sum(self.yi_[j] for j in Nu)

    # ── training ─────────────────────────────────────────────────────────────

    def fit(self, ratings: list[tuple[str, str, float]],
            implicit: dict[str, list[str]] | None = None) -> "SVDPlusPlus":
        """
        Train SVD++ via SGD.

        Parameters
        ----------
        ratings  : list of (user_id, item_id, rating)
        implicit : dict mapping user_id → list of item_ids the user has
                   interacted with (views/clicks/purchases). If None the
                   rated item set is used as N(u) (standard Surprise behaviour).
        """
        rng = np.random.default_rng(self.random_state)

        # Index unique users and items
        users = sorted({r[0] for r in ratings})
        items = sorted({r[1] for r in ratings})
        self._users = users
        self._items = items

        # Global mean  μ
        self.mu_ = float(np.mean([r[2] for r in ratings]))

        # Initialise parameters
        for u in users:
            self.bu_[u] = 0.0
            self.pu_[u] = self._init_vec()
        for i in items:
            self.bi_[i] = 0.0
            self.qi_[i] = self._init_vec()
            self.yi_[i] = self._init_vec()

        # Build N(u): if no explicit implicit set is provided, use rated items
        if implicit is None:
            Nu_map: dict[str, list[str]] = defaultdict(list)
            for u, i, _ in ratings:
                Nu_map[u].append(i)
            implicit = dict(Nu_map)

        # Ensure all items in N(u) have a y_j vector
        for u, items_nu in implicit.items():
            for j in items_nu:
                if j not in self.yi_:
                    self.yi_[j] = self._init_vec()

        # SGD — n_epochs passes over all ratings (shuffled each epoch)
        all_ratings = list(ratings)
        for epoch in range(1, self.n_epochs + 1):
            rng.shuffle(all_ratings)   # type: ignore[arg-type]
            total_sq_err = 0.0

            for u, i, r_ui in all_ratings:
                Nu  = implicit.get(u, [])
                imp = self._implicit_sum(Nu)

                # Prediction  r̂_ui = μ + b_u + b_i + q_iᵀ(p_u + imp)
                r_hat = (self.mu_
                         + self.bu_[u]
                         + self.bi_.get(i, 0.0)
                         + float(np.dot(self.qi_.get(i, np.zeros(self.n_factors)),
                                        self.pu_[u] + imp)))
                r_hat = float(np.clip(r_hat, RATING_MIN, RATING_MAX))

                e_ui = r_ui - r_hat
                total_sq_err += e_ui ** 2

                # Gradients and updates
                bu_old = self.bu_[u]
                bi_old = self.bi_.get(i, 0.0)
                qi_old = self.qi_.get(i, np.zeros(self.n_factors)).copy()
                pu_old = self.pu_[u].copy()

                self.bu_[u]         += self.lr * (e_ui - self.reg * bu_old)
                self.bi_[i]          = bi_old + self.lr * (e_ui - self.reg * bi_old)
                self.qi_[i]          = (qi_old
                                        + self.lr * (e_ui * (pu_old + imp)
                                                     - self.reg * qi_old))
                self.pu_[u]         += self.lr * (e_ui * qi_old - self.reg * pu_old)

                # Update implicit vectors y_j for each j in N(u)
                if Nu:
                    scale = 1.0 / math.sqrt(len(Nu))
                    for j in Nu:
                        self.yi_[j] += self.lr * (
                            e_ui * scale * qi_old - self.reg * self.yi_[j]
                        )

            rmse = math.sqrt(total_sq_err / len(all_ratings))
            if epoch % 5 == 0 or epoch == 1:
                print(f"    epoch {epoch:>3}/{self.n_epochs}  RMSE={rmse:.4f}")

        return self

    # ── prediction ───────────────────────────────────────────────────────────

    def predict(self, user_id: str, item_id: str,
                implicit: dict[str, list[str]] | None = None) -> float:
        """
        Predict rating for (user_id, item_id) using Equation (3.2).

        Returns raw rating in [RATING_MIN, RATING_MAX].
        Unknown user/item → global mean.
        """
        bu  = self.bu_.get(user_id, 0.0)
        bi  = self.bi_.get(item_id,  0.0)
        pu  = self.pu_.get(user_id,  np.zeros(self.n_factors))
        qi  = self.qi_.get(item_id,  np.zeros(self.n_factors))
        imp = self._implicit_sum(implicit.get(user_id, []) if implicit else [])

        r_hat = self.mu_ + bu + bi + float(np.dot(qi, pu + imp))
        return float(np.clip(r_hat, RATING_MIN, RATING_MAX))

    def cross_val_rmse(self, ratings: list[tuple[str, str, float]],
                       k: int = 3) -> tuple[float, float]:
        """Stratified k-fold RMSE on hold-out ratings (quick evaluation)."""
        rng = np.random.default_rng(self.random_state)
        arr = list(ratings)
        rng.shuffle(arr)
        fold_sz = len(arr) // k
        rmses, maes = [], []
        for f in range(k):
            test  = arr[f * fold_sz: (f + 1) * fold_sz]
            preds = [self.predict(u, i) for u, i, _ in test]
            errs  = [abs(p - r) for (_, _, r), p in zip(test, preds)]
            maes.append(np.mean(errs))
            rmses.append(math.sqrt(np.mean([e ** 2 for e in errs])))
        return float(np.mean(rmses)), float(np.mean(maes))


# ── data generation & training interface ─────────────────────────────────────


def generate_user_ratings(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """
    Simulate 500 users × 20–50 explicit ratings with implicit signals.

    Saves data/user_ratings.csv with columns:
        user_id, product_id, rating, views, purchases, clicks

    Ratings (1.0–5.0) are influenced by product halal status,
    discount level, and a per-user preference bias.
    """
    random.seed(seed)
    np.random.seed(seed)

    product_ids = df["product_id"].tolist()
    halal_flags = (
        df["halal_certified"]
        .map({True: 1.2, False: 0.8, "True": 1.2, "False": 0.8})
        .values.astype(float)
    )
    disc_boost  = 1 + df["discount_percent"].values.astype(float) / 100
    weights     = (halal_flags * disc_boost).astype(float)
    weights    /= weights.sum()

    rows = []
    for uid in range(1, NUM_USERS + 1):
        user_id    = f"U{uid:04d}"
        n_ratings  = random.randint(*RATINGS_PER_USER)
        chosen_idx = np.random.choice(len(product_ids), size=n_ratings,
                                      replace=False, p=weights)
        user_bias  = random.uniform(-0.5, 0.5)

        for idx in chosen_idx:
            pid        = product_ids[idx]
            h_bonus    = 0.3 if halal_flags[idx] > 1.0 else 0.0
            d_bonus    = float(df.iloc[idx]["discount_percent"]) / 100.0
            base       = 3.0 + h_bonus + d_bonus + user_bias
            rating     = float(np.clip(np.random.normal(base, 0.6), 1.0, 5.0))
            rating     = round(rating * 2) / 2     # nearest 0.5

            views     = int(np.clip(np.random.poisson(rating * 2.5),  1, 20))
            purchases = int(np.clip(np.random.poisson(max(0, rating - 2.5)), 0, 5))
            clicks    = int(np.clip(np.random.poisson(rating * 1.8),  1, 15))

            rows.append(dict(user_id=user_id, product_id=pid,
                             rating=rating, views=views,
                             purchases=purchases, clicks=clicks))

    ratings_df = pd.DataFrame(rows)
    ratings_df.to_csv(RATINGS_CSV, index=False)
    print(f"[B] user_ratings.csv — {len(ratings_df):,} rows  "
          f"({NUM_USERS} users × avg {len(ratings_df)//NUM_USERS} ratings)")
    return ratings_df


def train_svdpp(ratings_df: pd.DataFrame) -> SVDPlusPlus:
    """
    Train SVD++ on ratings_df and save model to SVDPP_PKL.

    SVD++ (Eq. 3.2) handles both explicit ratings and implicit feedback.
    Implicit feedback set N(u) is derived from all interactions the user
    has had (views / clicks / purchases), not just explicit ratings.

    Model evaluation: 3-fold cross-validation RMSE and MAE reported.
    """
    print(f"[B] Training SVD++  "
          f"(factors={N_FACTORS}, epochs={N_EPOCHS}, lr={LR}, reg={REG}) …")

    # Build ratings list and implicit set N(u)
    ratings = list(zip(
        ratings_df["user_id"],
        ratings_df["product_id"],
        ratings_df["rating"].astype(float),
    ))

    # N(u): all items a user has viewed / clicked / purchased (implicit signal)
    implicit: dict[str, list[str]] = defaultdict(list)
    for _, row in ratings_df.iterrows():
        if row["views"] > 0 or row["clicks"] > 0 or row["purchases"] > 0:
            implicit[row["user_id"]].append(row["product_id"])

    algo = SVDPlusPlus(n_factors=N_FACTORS, n_epochs=N_EPOCHS,
                       lr=LR, reg=REG, random_state=42)
    algo.fit(ratings, implicit=dict(implicit))

    # Cross-validation
    print("    Running 3-fold cross-validation …")
    rmse, mae = algo.cross_val_rmse(ratings, k=3)
    print(f"    CV RMSE={rmse:.4f}  MAE={mae:.4f}")

    with open(SVDPP_PKL, "wb") as fh:
        pickle.dump({"model": algo, "implicit": dict(implicit)}, fh)
    print(f"    Saved svdpp_model.pkl")
    return algo


def get_collab_score(user_id: str, product_id: str,
                     algo: SVDPlusPlus,
                     implicit: dict[str, list[str]] | None = None) -> float:
    """
    Predict user u's preference score for item i via SVD++ Equation (3.2).

    The raw prediction (RATING_MIN–RATING_MAX scale) is normalised to [0,1].

    Parameters
    ----------
    user_id    : e.g. "U0042"
    product_id : e.g. "LOTUS-0001"
    algo       : trained SVDPlusPlus object
    implicit   : N(u) map (optional — loaded from model if not provided)

    Returns
    -------
    float in [0.0, 1.0]
    """
    raw = algo.predict(user_id, product_id, implicit=implicit)
    return float((raw - RATING_MIN) / (RATING_MAX - RATING_MIN))


# ═══════════════════════════════════════════════════════════════════════════════
# [C]  HYBRID FILTERING — Weighted Approach  (Section 3.2.3.5 / Fig. 3.16)
# ═══════════════════════════════════════════════════════════════════════════════
#
#  Two-step weighted formula (Figure 3.16):
#
#      Step 1:  base_score  = max(content_score, collab_score)
#      Step 2:  final_score = (0.9 × base_score) + (0.1 × popularity_score)
#
#  content_score    — Cosine Similarity [A]
#  collab_score     — Normalised SVD++ prediction [B]
#  popularity_score — Normalised aggregate interactions (views+2×purchases+clicks)
#
# ═══════════════════════════════════════════════════════════════════════════════


def _build_popularity_scores(ratings_df: pd.DataFrame,
                             df: pd.DataFrame) -> pd.Series:
    """Aggregate and normalise implicit signals per product → [0, 1]."""
    agg = (ratings_df
           .groupby("product_id")
           .agg(views=("views", "sum"),
                purchases=("purchases", "sum"),
                clicks=("clicks", "sum"))
           .reset_index())
    agg["pop_raw"] = agg["views"] + agg["purchases"] * 2 + agg["clicks"]

    merged = (df[["product_id"]]
              .merge(agg[["product_id", "pop_raw"]], on="product_id", how="left")
              .fillna(0))
    raw   = merged["pop_raw"].values.astype(float)
    r_min, r_max = raw.min(), raw.max()
    normed = (raw - r_min) / (r_max - r_min) if r_max > r_min else np.zeros_like(raw)

    pop = pd.Series(normed, index=merged["product_id"].values)
    with open(POPULARITY_PKL, "wb") as fh:
        pickle.dump(pop, fh)
    print(f"    Saved popularity_scores.pkl  ({len(pop)} products)")
    return pop


def hybrid_recommend(
    user_id:    str,
    budget:     float,
    category:   str | None = None,
    halal_only: bool = True,
    top_n:      int  = 10,
    *,
    df:         pd.DataFrame,
    feat_mat:   np.ndarray,
    algo:       SVDPlusPlus,
    implicit:   dict[str, list[str]],
    pop_scores: pd.Series,
    n_cats:     int,
) -> pd.DataFrame:
    """
    Main hybrid recommendation function — Section 3.2.3.5 / Figure 3.16.

    Pipeline
    --------
    1. Halal filter  : keep only JAKIM-certified products (if halal_only=True)
    2. Budget filter : price_after_discount ≤ budget
    3. Category filter: optional exact category match
    4. Per filtered product:
         A. content_score   = Cosine Similarity(user_vec, product_vec)   [Eq. 3.1]
         B. collab_score    = SVD++ normalised prediction                [Eq. 3.2]
         C. base_score      = max(content_score, collab_score)           [Fig. 3.16 Step 1]
         D. final_score     = 0.9 × base_score + 0.1 × popularity_score [Fig. 3.16 Step 2]
    5. Sort by final_score DESC, return top_n.

    Parameters
    ----------
    user_id    : user identifier (e.g. "U0042")
    budget     : maximum price after discount in MYR
    category   : optional category string  (e.g. "Beverages")
    halal_only : restrict to JAKIM-certified products
    top_n      : number of recommendations to return

    Returns
    -------
    pd.DataFrame — columns: product_name, store, price_after_discount,
                             halal_status, halal_body, rating,
                             discount_percent, final_score
    """

    # ── 1. Build user preference vector A ─────────────────────────────────────
    max_price    = df["price_after_discount"].max()
    budget_norm  = float(np.clip(budget / max_price, 0.0, 1.0))

    if category is not None and category in df["category"].values:
        cat_enc     = int(df[df["category"] == category]["category_enc"].iloc[0])
        cat_norm_u  = float(cat_enc) / (n_cats - 1)
    else:
        cat_norm_u  = 0.5          # neutral — matches all categories equally

    halal_flag_u = 1.0 if halal_only else 0.5

    user_vector = [budget_norm, cat_norm_u, halal_flag_u]   # vector A

    # ── 2. Apply filters ──────────────────────────────────────────────────────
    mask = pd.Series(True, index=df.index)

    if halal_only:
        mask &= df["halal_certified"].isin([True, "True"])

    mask &= df["price_after_discount"].astype(float) <= budget

    if category is not None:
        mask &= df["category"] == category

    filtered = df[mask]

    if filtered.empty:
        print(f"  [!] No products found "
              f"(halal_only={halal_only}, budget=RM{budget:.2f}, "
              f"category={category})")
        return pd.DataFrame()

    # ── 3. Score each product ─────────────────────────────────────────────────
    records = []
    for orig_idx, row in filtered.iterrows():
        pid    = row["product_id"]
        df_pos = df.index.get_loc(orig_idx)

        # A — Content score  (Eq. 3.1)
        prod_vec = feat_mat[df_pos].tolist()             # vector B
        c_score  = get_content_score(user_vector, prod_vec)

        # B — Collaborative score  (Eq. 3.2)
        cf_score = get_collab_score(user_id, pid, algo, implicit=implicit)

        # C — Popularity score
        p_score = float(pop_scores.get(pid, 0.0))

        # D — Hybrid formula  (Fig. 3.16)
        base_score  = max(c_score, cf_score)                  # Step 1
        final_score = 0.9 * base_score + 0.1 * p_score        # Step 2

        records.append({
            "product_name":         row["product_name"],
            "store":                row["store"],
            "price_after_discount": round(float(row["price_after_discount"]), 2),
            "halal_status":         "Certified"
                                    if row["halal_certified"] in [True, "True"]
                                    else "Not Certified",
            "halal_body":           row["halal_body"],
            "rating":               round(cf_score * (RATING_MAX - RATING_MIN)
                                          + RATING_MIN, 2),
            "discount_percent":     float(row["discount_percent"]),
            # intermediate scores (useful for thesis reporting)
            "content_score":        round(c_score,   4),
            "collab_score":         round(cf_score,  4),
            "popularity_score":     round(p_score,   4),
            "base_score":           round(base_score, 4),
            "final_score":          round(final_score, 4),
        })

    out_cols = [
        "product_name", "store", "price_after_discount",
        "halal_status", "halal_body", "rating",
        "discount_percent", "final_score",
    ]
    results = (
        pd.DataFrame(records)
          .sort_values("final_score", ascending=False)
          .head(top_n)
          .reset_index(drop=True)
    )
    results.index += 1     # rank from 1
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# ─── LOAD / TRAIN HELPERS ─────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════


def load_or_train(df: pd.DataFrame
                  ) -> tuple[np.ndarray, SVDPlusPlus, dict, pd.Series, int]:
    """
    Return (feat_mat, algo, implicit, pop_scores, n_cats).
    Loads from disk if all artefacts exist; otherwise trains from scratch.
    """
    artefacts_exist = all(p.exists() for p in
                          [COSINE_PKL, SVDPP_PKL, RATINGS_CSV, POPULARITY_PKL])

    if artefacts_exist:
        print("Loading cached models …")
        with open(COSINE_PKL,     "rb") as f:
            cosine_data = pickle.load(f)
        with open(SVDPP_PKL,      "rb") as f:
            svdpp_data  = pickle.load(f)
        with open(POPULARITY_PKL, "rb") as f:
            pop_scores  = pickle.load(f)

        algo     = svdpp_data["model"]
        implicit = svdpp_data["implicit"]
        feat_mat = _product_feature_matrix(df)

        print(f"  cosine_sim_matrix : {cosine_data['matrix'].shape}")
        print(f"  svdpp_model       : SVD++, factors={algo.n_factors}, "
              f"epochs={algo.n_epochs}")
        print(f"  popularity_scores : {len(pop_scores)} products")
    else:
        print("No cached models found — training from scratch …\n")
        feat_mat   = build_content_model(df)
        ratings_df = generate_user_ratings(df)
        algo       = train_svdpp(ratings_df)
        pop_scores = _build_popularity_scores(ratings_df, df)

        # Rebuild implicit from saved ratings
        ratings_df2 = pd.read_csv(RATINGS_CSV)
        from collections import defaultdict as _dd
        imp: dict = _dd(list)
        for _, row in ratings_df2.iterrows():
            if row["views"] > 0 or row["clicks"] > 0 or row["purchases"] > 0:
                imp[row["user_id"]].append(row["product_id"])
        implicit = dict(imp)

    n_cats = int(df["category_enc"].max()) + 1
    return feat_mat, algo, implicit, pop_scores, n_cats


# ═══════════════════════════════════════════════════════════════════════════════
# ─── MAIN ─────────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════


def _print_recs(recs: pd.DataFrame, title: str) -> None:
    """Pretty-print a recommendation result table."""
    sep = "=" * 74
    print(f"\n{sep}")
    print(f"  {title}")
    print(sep)
    if recs.empty:
        print("  No results.")
        return
    header = (f"  {'#':<4} {'Product':<36} {'Store':<7} {'Price':>8}  "
              f"{'Halal':<11} {'Disc%':>5}  {'Score':>7}")
    print(header)
    print(f"  {'-' * 70}")
    for rank, row in recs.iterrows():
        name  = str(row["product_name"])[:35]
        store = str(row["store"])
        price = f"RM {row['price_after_discount']:>5.2f}"
        halal = str(row["halal_status"])[:10]
        disc  = f"{row['discount_percent']:>4.0f}%"
        score = f"{row['final_score']:.4f}"
        print(f"  {rank:<4} {name:<36} {store:<7} {price}  {halal:<11} {disc}  {score}")
    print(sep)


def main() -> None:
    print("=" * 62)
    print("  HalalSaver MY - Hybrid Grocery Recommender")
    print("  Chapter 3: CBF (Eq.3.1) + SVD++ (Eq.3.2) + Hybrid (Fig.3.16)")
    print("=" * 62)

    if not CLEANED_CSV.exists():
        raise FileNotFoundError(
            f"cleaned_dataset.csv not found at {CLEANED_CSV}. "
            "Run preprocess.js first."
        )

    df = pd.read_csv(CLEANED_CSV)
    print(f"\nDataset : {len(df):,} rows × {len(df.columns)} columns")
    print(f"Stores  : {sorted(df['store'].unique())}")
    print(f"Cats    : {sorted(df['category'].unique())}\n")

    feat_mat, algo, implicit, pop_scores, n_cats = load_or_train(df)

    shared = dict(df=df, feat_mat=feat_mat, algo=algo,
                  implicit=implicit, pop_scores=pop_scores, n_cats=n_cats)

    # ── Test 1: Halal | RM 25 | All categories ───────────────────────────────
    _print_recs(
        hybrid_recommend("U0001", 25.0, halal_only=True,  top_n=10, **shared),
        "Test 1 — U0001 | Budget RM 25 | Halal only | All categories",
    )

    # ── Test 2: Halal | RM 20 | Beverages ────────────────────────────────────
    _print_recs(
        hybrid_recommend("U0042", 20.0, category="Beverages",
                         halal_only=True,  top_n=10, **shared),
        "Test 2 — U0042 | Budget RM 20 | Halal | Beverages",
    )

    # ── Test 3: All products | RM 15 | Fresh Produce ─────────────────────────
    _print_recs(
        hybrid_recommend("U0123", 15.0, category="Fresh Produce",
                         halal_only=False, top_n=10, **shared),
        "Test 3 — U0123 | Budget RM 15 | All products | Fresh Produce",
    )

    # ── Test 4: Halal | RM 50 | Snacks ───────────────────────────────────────
    _print_recs(
        hybrid_recommend("U0250", 50.0, category="Snacks",
                         halal_only=True,  top_n=10, **shared),
        "Test 4 — U0250 | Budget RM 50 | Halal | Snacks",
    )

    print("\nModel artefacts:")
    for p in [COSINE_PKL, SVDPP_PKL, POPULARITY_PKL, RATINGS_CSV]:
        size = p.stat().st_size / 1024 if p.exists() else 0
        print(f"  {p.name:<30}  {size:>8.1f} KB")
    print("\nDone.\n")


if __name__ == "__main__":
    main()
