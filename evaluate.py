"""
evaluate.py
HalalSaver MY — System Evaluation
FYP — CS230 | UiTM

Implements evaluation metrics from thesis Section 3.2.3.1:

  RMSE / MAE     — Collaborative Filtering (SVD++ 5-fold cross-validation)
  Precision@10   — Content-Based Filtering (5 diverse sample products)
  Recall@10      — Content-Based Filtering (5 diverse sample products)
  Halal Compliance %  — 100% when halal_only=True
  Budget Compliance % — 100% (no recommended item exceeds user budget)

Outputs:
  outputs/evaluation_report.csv
  outputs/evaluation_chart.png
"""

from __future__ import annotations

import math
import pickle
import random
import sys
import warnings
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

warnings.filterwarnings("ignore")

# ─── resolve SYSTEM root ─────────────────────────────────────────────────────
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from recommender import (
    SVDPlusPlus,
    hybrid_recommend,
    _product_feature_matrix,
    N_FACTORS, N_EPOCHS, LR, REG,
    RATING_MIN, RATING_MAX,
)

# ─── PATHS ────────────────────────────────────────────────────────────────────
DATA_DIR    = ROOT / "data"
MODELS_DIR  = ROOT / "models"
OUTPUTS_DIR = ROOT / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

CLEANED_CSV    = DATA_DIR   / "cleaned_dataset.csv"
RATINGS_CSV    = DATA_DIR   / "user_ratings.csv"
SVDPP_PKL      = MODELS_DIR / "svdpp_model.pkl"
POPULARITY_PKL = MODELS_DIR / "popularity_scores.pkl"

REPORT_CSV = OUTPUTS_DIR / "evaluation_report.csv"
CHART_PNG  = OUTPUTS_DIR / "evaluation_chart.png"

# ─── SETTINGS ─────────────────────────────────────────────────────────────────
K_FOLDS         = 5     # cross-validation folds
TOP_N           = 10    # recommendation list length (P/R)
CBF_N_SAMPLES   = 5     # number of sample products for CBF evaluation
RANDOM_SEED     = 42

# Sample queries for compliance testing: (budget_myr, category_or_None)
COMPLIANCE_QUERIES = [
    (20.0, "Beverages"),
    (15.0, "Fresh Produce"),
    (10.0, "Snacks"),
    (25.0, None),
    (30.0, "Dairy & Chilled"),
]


# =============================================================================
# SECTION 1 — RMSE and MAE  (Collaborative Filtering, SVD++ 5-Fold CV)
# =============================================================================
#
#   RMSE = sqrt( (1/n) * sum( (r_ui - r_hat_ui)^2 ) )   [Eq. 3.3]
#   MAE  = (1/n) * sum( |r_ui - r_hat_ui| )
#
# =============================================================================

def rmse_mae_kfold(ratings_df: pd.DataFrame, k: int = K_FOLDS) -> dict:
    """5-fold cross-validation of SVD++ RMSE and MAE."""
    ratings = [
        (row.user_id, row.product_id, float(row.rating))
        for _, row in ratings_df.iterrows()
    ]

    # Build implicit feedback map
    implicit_full: dict[str, list[str]] = defaultdict(list)
    for uid, pid, _ in ratings:
        implicit_full[uid].append(pid)

    rng_cv = random.Random(RANDOM_SEED)
    rng_cv.shuffle(ratings)
    fold_size = len(ratings) // k

    print(f"\n[RMSE/MAE] {k}-Fold Cross-Validation  (n={len(ratings):,} ratings)")
    print(f"       {'Fold':<6}  {'n_test':>7}  {'RMSE':>8}  {'MAE':>8}")
    print("       " + "-" * 37)

    fold_rmses, fold_maes = [], []
    for f in range(k):
        test  = ratings[f * fold_size : (f + 1) * fold_size]
        train = ratings[: f * fold_size] + ratings[(f + 1) * fold_size :]

        implicit_train: dict[str, list[str]] = defaultdict(list)
        for uid, pid, _ in train:
            implicit_train[uid].append(pid)

        model = SVDPlusPlus(
            n_factors=N_FACTORS, n_epochs=N_EPOCHS,
            lr=LR, reg=REG, random_state=RANDOM_SEED
        )
        model.fit(train, implicit=dict(implicit_train))

        sq_err, abs_err = [], []
        for uid, pid, r_actual in test:
            r_pred = model.predict(uid, pid, implicit=dict(implicit_train))
            sq_err.append((r_actual - r_pred) ** 2)
            abs_err.append(abs(r_actual - r_pred))

        fold_rmse = math.sqrt(sum(sq_err) / len(sq_err))
        fold_mae  = sum(abs_err) / len(abs_err)
        fold_rmses.append(fold_rmse)
        fold_maes.append(fold_mae)
        print(f"       Fold {f+1:<2}  {len(test):>7}  {fold_rmse:>8.4f}  {fold_mae:>8.4f}")

    mean_rmse = float(np.mean(fold_rmses))
    mean_mae  = float(np.mean(fold_maes))
    std_rmse  = float(np.std(fold_rmses))

    print("       " + "-" * 37)
    print(f"       {'Mean':<8}         {mean_rmse:>8.4f}  {mean_mae:>8.4f}")
    print(f"       {'Std':<8}         {std_rmse:>8.4f}")
    print(f"\n       Target RMSE < 1.0  -->  "
          f"{'PASS' if mean_rmse < 1.0 else 'FAIL'}  (RMSE = {mean_rmse:.4f})")

    return {
        "mean_rmse":  mean_rmse,
        "mean_mae":   mean_mae,
        "std_rmse":   std_rmse,
        "fold_rmses": fold_rmses,
        "fold_maes":  fold_maes,
    }


# =============================================================================
# SECTION 2 — CBF Precision@10 and Recall@10  (5 Sample Products)
# =============================================================================
#
#   For each of CBF_N_SAMPLES diverse query products:
#     1. User preference vector = query product's feature vector
#        [price_after_discount_norm, category_enc_norm, halal_flag]
#     2. Score all halal-certified products by cosine similarity (Eq. 3.1)
#     3. Top-10 = highest-scoring halal products (excluding query itself)
#     4. Relevant = halal-certified products in the same category as query
#
#   Precision@10 = |top-10 ∩ relevant| / K                   [Eq. 3.4]
#   Recall@10    = |top-10 ∩ relevant| / min(K, |relevant|)  [Eq. 3.5]
#                  (normalised recall — proportion of achievable
#                   relevant items successfully retrieved at K)
#
# =============================================================================

def cbf_precision_recall(
    df:       pd.DataFrame,
    feat_mat: np.ndarray,
    top_n:    int = TOP_N,
    n_samples: int = CBF_N_SAMPLES,
    seed:     int = RANDOM_SEED,
) -> dict:
    """
    Evaluate Content-Based Filtering Precision@K and Recall@K
    on n_samples diverse sample products.
    """
    rng = np.random.default_rng(seed)

    # Identify halal products
    halal_flag = (
        df["halal_certified"]
        .map({True: True, "True": True, False: False, "False": False})
        .fillna(False)
        .values
    )
    halal_indices = np.where(halal_flag)[0]

    # Pre-normalise feature matrix for vectorised cosine similarity
    norms_mat = np.linalg.norm(feat_mat, axis=1, keepdims=True)
    norms_mat[norms_mat == 0] = 1.0
    feat_norm = feat_mat / norms_mat    # shape (n_products, 3)

    # Pick one halal product from each of n_samples different categories
    categories = df["category"].unique().tolist()
    rng.shuffle(categories)
    sample_categories = categories[:n_samples]

    query_indices = []
    for cat in sample_categories:
        cat_df = df[(df["category"] == cat) & halal_flag]
        if not cat_df.empty:
            chosen = int(rng.choice(cat_df.index.tolist()))
            query_indices.append(chosen)

    print(f"\n[CBF] Evaluating {len(query_indices)} sample products, Top-{top_n}")
    print(f"       {'Product ID':<20} {'Category':<28} {'Hits':>4}  "
          f"{'Relevant':>8}  {'P@10':>6}  {'R@10':>6}")
    print("       " + "-" * 75)

    precisions, recalls = [], []
    query_details = []

    for q_idx in query_indices:
        q_norm = feat_norm[q_idx]                  # normalised query vector

        # Cosine similarity to all products (vectorised)
        sims = feat_norm @ q_norm                  # shape (n_products,)
        sims[q_idx] = -2.0                         # exclude self

        # Restrict candidates to halal products only
        halal_sims = np.full(len(df), -3.0)
        halal_sims[halal_indices] = sims[halal_indices]

        top_k_idx = np.argsort(halal_sims)[-top_n:][::-1]
        top_k_pids = set(df.iloc[top_k_idx]["product_id"].tolist())

        # Relevant = halal products in same category as query (excluding query)
        query_cat = df.iloc[q_idx]["category"]
        query_pid = df.iloc[q_idx]["product_id"]
        relevant_mask = (
            halal_flag &
            (df["category"] == query_cat).values
        )
        relevant_mask[q_idx] = False              # exclude query itself
        relevant_pids = set(df[relevant_mask]["product_id"].tolist())

        hits      = len(top_k_pids & relevant_pids)
        precision = hits / top_n
        recall    = hits / min(top_n, len(relevant_pids)) if relevant_pids else 0.0

        precisions.append(precision)
        recalls.append(recall)
        query_details.append({
            "product_id": query_pid,
            "category":   query_cat,
            "hits":       hits,
            "relevant":   len(relevant_pids),
            "precision":  precision,
            "recall":     recall,
        })

        print(f"       {query_pid:<20} {query_cat:<28} {hits:>4}  "
              f"{len(relevant_pids):>8}  {precision*100:>5.1f}%  {recall*100:>5.1f}%")

    mean_p  = float(np.mean(precisions)) if precisions else 0.0
    mean_r  = float(np.mean(recalls))    if recalls    else 0.0
    mean_f1 = (2 * mean_p * mean_r / (mean_p + mean_r)
               if (mean_p + mean_r) > 0 else 0.0)

    print("       " + "-" * 75)
    print(f"       {'Mean':>49}  {mean_p*100:>5.1f}%  {mean_r*100:>5.1f}%")
    print(f"\n       Precision@{top_n} : {mean_p*100:.2f}%  "
          f"(target > 70%  {'PASS' if mean_p >= 0.70 else 'FAIL'})")
    print(f"       Recall@{top_n}    : {mean_r*100:.2f}%  "
          f"(target > 60%  {'PASS' if mean_r >= 0.60 else 'FAIL'})")

    return {
        "precision":      mean_p,
        "recall":         mean_r,
        "f1":             mean_f1,
        "n_queries":      len(precisions),
        "top_n":          top_n,
        "per_query":      query_details,
        "per_query_prec": precisions,
        "per_query_rec":  recalls,
    }


# =============================================================================
# SECTION 3 — Halal & Budget Compliance Rates
# =============================================================================

def compliance_rates(
    df:         pd.DataFrame,
    algo:       SVDPlusPlus,
    feat_mat:   np.ndarray,
    implicit:   dict[str, list[str]],
    pop_scores: pd.Series,
    n_cats:     int,
) -> dict[str, float]:
    """
    Test hybrid_recommend across COMPLIANCE_QUERIES to verify:
      Halal Compliance  = 100%  (every item is halal certified when halal_only=True)
      Budget Compliance = 100%  (no recommended item exceeds the stated budget)
    """
    rng = random.Random(RANDOM_SEED)
    user_pool = [f"U{i:04d}" for i in range(1, 501)]
    n_tests   = len(COMPLIANCE_QUERIES) * 5   # 5 users per query spec

    total_halal_items  = total_halal_pass  = 0
    total_budget_items = total_budget_pass = 0

    print(f"\n[Compliance] Testing {n_tests} recommendation queries ...")

    for budget, category in COMPLIANCE_QUERIES:
        for uid in rng.sample(user_pool, 5):
            # Halal compliance (halal_only=True)
            recs_h = hybrid_recommend(
                user_id    = uid,
                budget     = budget,
                category   = category,
                halal_only = True,
                top_n      = TOP_N,
                df         = df,
                feat_mat   = feat_mat,
                algo       = algo,
                implicit   = implicit,
                pop_scores = pop_scores,
                n_cats     = n_cats,
            )
            if not recs_h.empty:
                total_halal_items += len(recs_h)
                total_halal_pass  += int(
                    (recs_h["halal_status"] == "Certified").sum()
                )

            # Budget compliance
            recs_b = hybrid_recommend(
                user_id    = uid,
                budget     = budget,
                category   = category,
                halal_only = False,
                top_n      = TOP_N,
                df         = df,
                feat_mat   = feat_mat,
                algo       = algo,
                implicit   = implicit,
                pop_scores = pop_scores,
                n_cats     = n_cats,
            )
            if not recs_b.empty:
                total_budget_items += len(recs_b)
                total_budget_pass  += int(
                    (recs_b["price_after_discount"] <= budget).sum()
                )

    halal_rate  = total_halal_pass  / total_halal_items  if total_halal_items  else 1.0
    budget_rate = total_budget_pass / total_budget_items if total_budget_items else 1.0

    print(f"       Halal  : {total_halal_pass}/{total_halal_items} items certified"
          f"  -->  {halal_rate*100:.2f}%  "
          f"{'PASS' if halal_rate == 1.0 else 'FAIL'}")
    print(f"       Budget : {total_budget_pass}/{total_budget_items} items within budget"
          f"  -->  {budget_rate*100:.2f}%  "
          f"{'PASS' if budget_rate == 1.0 else 'FAIL'}")

    return {
        "halal_rate":  halal_rate,
        "budget_rate": budget_rate,
        "halal_checked":  total_halal_items,
        "budget_checked": total_budget_items,
    }


# =============================================================================
# SECTION 4 — Save CSV Report
# =============================================================================

def save_report(rmse_res: dict, cbf_res: dict, comp_res: dict) -> pd.DataFrame:
    """Serialise all metric results to outputs/evaluation_report.csv."""
    rows = [
        # CF metrics
        {"metric": "RMSE (5-Fold CV Mean)",
         "value": round(rmse_res["mean_rmse"], 4),
         "target": "< 1.0",
         "status": "PASS" if rmse_res["mean_rmse"] < 1.0 else "FAIL",
         "method": "Collaborative Filtering (SVD++)"},
        {"metric": "MAE (5-Fold CV Mean)",
         "value": round(rmse_res["mean_mae"], 4),
         "target": "< 1.0",
         "status": "PASS" if rmse_res["mean_mae"] < 1.0 else "FAIL",
         "method": "Collaborative Filtering (SVD++)"},
        {"metric": "RMSE Std Dev",
         "value": round(rmse_res["std_rmse"], 4),
         "target": "—",
         "status": "—",
         "method": "Collaborative Filtering (SVD++)"},
        # CBF metrics
        {"metric": f"Precision@{cbf_res['top_n']}",
         "value": round(cbf_res["precision"] * 100, 2),
         "target": "> 70%",
         "status": "PASS" if cbf_res["precision"] >= 0.70 else "FAIL",
         "method": "Content-Based Filtering (Cosine Similarity)"},
        {"metric": f"Recall@{cbf_res['top_n']}",
         "value": round(cbf_res["recall"] * 100, 2),
         "target": "> 60%",
         "status": "PASS" if cbf_res["recall"] >= 0.60 else "FAIL",
         "method": "Content-Based Filtering (Cosine Similarity)"},
        {"metric": f"F1-Score@{cbf_res['top_n']}",
         "value": round(cbf_res["f1"] * 100, 2),
         "target": "—",
         "status": "—",
         "method": "Content-Based Filtering (Cosine Similarity)"},
        # Compliance
        {"metric": "Halal Compliance Rate",
         "value": round(comp_res["halal_rate"] * 100, 2),
         "target": "100%",
         "status": "PASS" if comp_res["halal_rate"] == 1.0 else "FAIL",
         "method": "Hybrid Recommender (halal_only=True)"},
        {"metric": "Budget Compliance Rate",
         "value": round(comp_res["budget_rate"] * 100, 2),
         "target": "100%",
         "status": "PASS" if comp_res["budget_rate"] == 1.0 else "FAIL",
         "method": "Hybrid Recommender"},
    ]
    # Per-query CBF detail rows
    for i, q in enumerate(cbf_res["per_query"], 1):
        rows.append({
            "metric": f"CBF Query {i} — {q['category']}",
            "value":  round(q["precision"] * 100, 2),
            "target": "—",
            "status": "—",
            "method": q["product_id"],
        })

    report_df = pd.DataFrame(rows)
    report_df.to_csv(REPORT_CSV, index=False)
    print(f"\n  Saved evaluation_report.csv  ({len(report_df)} rows)")
    return report_df


# =============================================================================
# SECTION 5 — Save Chart
# =============================================================================

def save_chart(rmse_res: dict, cbf_res: dict, comp_res: dict) -> None:
    """
    Save outputs/evaluation_chart.png — a 2x2 dashboard:
      Top-left   : Main metrics bar chart (P, R, Halal, Budget)
      Top-right  : RMSE per fold (bars + line) with target at 1.0
      Bottom-left: Per-query CBF precision and recall
      Bottom-right: CBF query breakdown table
    """
    COLORS = {
        "pass":   "#2ecc71",
        "fail":   "#e74c3c",
        "target": "#e67e22",
        "rmse":   "#3498db",
        "mae":    "#9b59b6",
        "prec":   "#8e44ad",
        "rec":    "#27ae60",
    }

    fig = plt.figure(figsize=(16, 11))
    fig.patch.set_facecolor("#f8f9fa")
    gs  = GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.32)

    # ── Panel 1: Main metrics bar chart ──────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    metrics = {
        f"Precision@{TOP_N}":     cbf_res["precision"] * 100,
        f"Recall@{TOP_N}":        cbf_res["recall"]    * 100,
        "Halal\nCompliance":      comp_res["halal_rate"]  * 100,
        "Budget\nCompliance":     comp_res["budget_rate"] * 100,
    }
    targets = {
        f"Precision@{TOP_N}": 70,
        f"Recall@{TOP_N}":    60,
        "Halal\nCompliance":  100,
        "Budget\nCompliance": 100,
    }
    labels = list(metrics.keys())
    values = list(metrics.values())
    bar_colors = [
        COLORS["pass"] if v >= targets[l] else COLORS["fail"]
        for l, v in zip(labels, values)
    ]
    bars = ax1.bar(labels, values, color=bar_colors, width=0.55,
                   edgecolor="white", linewidth=1.2, zorder=3)
    for bar, lbl, val in zip(bars, labels, values):
        ax1.axhline(targets[lbl], xmin=bar.get_x() / ax1.get_xlim()[1],
                    color=COLORS["target"], linestyle="--", linewidth=1,
                    alpha=0.7, zorder=2)
        ax1.text(bar.get_x() + bar.get_width() / 2,
                 min(val + 1.5, 103), f"{val:.1f}%",
                 ha="center", va="bottom", fontsize=9, fontweight="bold")
    # draw target lines per bar properly
    for i, (lbl, val) in enumerate(zip(labels, values)):
        ax1.plot([i - 0.28, i + 0.28], [targets[lbl], targets[lbl]],
                 color=COLORS["target"], linewidth=1.5, linestyle="--", zorder=4)
    ax1.set_ylim(0, 115)
    ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f"{y:.0f}%"))
    ax1.set_ylabel("Score (%)", fontsize=10)
    ax1.set_title("Key Performance Metrics", fontsize=11,
                  fontweight="bold", pad=10)
    ax1.yaxis.grid(True, linestyle="--", alpha=0.4, zorder=0)
    ax1.set_axisbelow(True)
    ax1.set_facecolor("#fdfdfd")
    pass_patch = plt.matplotlib.patches.Patch(color=COLORS["pass"],  label="PASS")
    fail_patch = plt.matplotlib.patches.Patch(color=COLORS["fail"],  label="FAIL")
    tgt_patch  = plt.matplotlib.lines.Line2D([], [], color=COLORS["target"],
                                             linestyle="--", label="Target")
    ax1.legend(handles=[pass_patch, fail_patch, tgt_patch],
               fontsize=8, loc="lower right")

    # ── Panel 2: RMSE/MAE per fold ────────────────────────────────────────────
    ax2 = fig.add_subplot(gs[0, 1])
    folds  = [f"Fold {i+1}" for i in range(K_FOLDS)]
    x      = np.arange(K_FOLDS)
    width  = 0.35
    bars_rmse = ax2.bar(x - width/2, rmse_res["fold_rmses"], width,
                        label="RMSE", color=COLORS["rmse"],
                        edgecolor="white", linewidth=1.0)
    bars_mae  = ax2.bar(x + width/2, rmse_res["fold_maes"],  width,
                        label="MAE",  color=COLORS["mae"],
                        edgecolor="white", linewidth=1.0)
    ax2.axhline(1.0, color=COLORS["target"], linestyle="--",
                linewidth=1.5, label="Target (< 1.0)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(folds, fontsize=9)
    ax2.set_ylim(0, 1.2)
    ax2.set_ylabel("Error", fontsize=10)
    ax2.set_title(f"RMSE & MAE per Fold  (SVD++ {K_FOLDS}-Fold CV)",
                  fontsize=11, fontweight="bold", pad=10)
    ax2.legend(fontsize=8)
    ax2.yaxis.grid(True, linestyle="--", alpha=0.4, zorder=0)
    ax2.set_axisbelow(True)
    ax2.set_facecolor("#fdfdfd")

    # ── Panel 3: CBF per-query precision and recall ───────────────────────────
    ax3 = fig.add_subplot(gs[1, 0])
    qd      = cbf_res["per_query"]
    q_labels = [f"Q{i+1}" for i in range(len(qd))]
    q_prec   = [q["precision"] * 100 for q in qd]
    q_rec    = [q["recall"]    * 100 for q in qd]
    xq = np.arange(len(qd))
    ax3.bar(xq - 0.2, q_prec, 0.35, label=f"Precision@{TOP_N}",
            color=COLORS["prec"], edgecolor="white", linewidth=0.8)
    ax3.bar(xq + 0.2, q_rec,  0.35, label=f"Recall@{TOP_N}",
            color=COLORS["rec"],  edgecolor="white", linewidth=0.8)
    ax3.axhline(70, color=COLORS["target"], linestyle="--",
                linewidth=1.2, alpha=0.7, label="P target 70%")
    ax3.axhline(60, color="#c0392b", linestyle=":",
                linewidth=1.2, alpha=0.7, label="R target 60%")
    ax3.set_xticks(xq)
    ax3.set_xticklabels(q_labels, fontsize=9)
    ax3.set_ylim(0, 115)
    ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f"{y:.0f}%"))
    ax3.set_ylabel("Score (%)", fontsize=10)
    ax3.set_title(f"CBF Precision & Recall per Sample Query",
                  fontsize=11, fontweight="bold", pad=10)
    ax3.legend(fontsize=7.5, ncol=2)
    ax3.yaxis.grid(True, linestyle="--", alpha=0.4, zorder=0)
    ax3.set_axisbelow(True)
    ax3.set_facecolor("#fdfdfd")
    # annotate category labels below x-axis
    for xi, q in zip(xq, qd):
        short_cat = q["category"][:15] + "…" if len(q["category"]) > 15 else q["category"]
        ax3.text(xi, -9, short_cat, ha="center", va="top", fontsize=7,
                 rotation=15, color="#555")

    # ── Panel 4: Summary table ────────────────────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 1])
    ax4.axis("off")
    col_labels = ["Metric", "Value", "Target", "Status"]
    table_data = [
        ["RMSE (CV Mean)",
         f"{rmse_res['mean_rmse']:.4f}",
         "< 1.0",
         "PASS" if rmse_res["mean_rmse"] < 1.0 else "FAIL"],
        ["MAE (CV Mean)",
         f"{rmse_res['mean_mae']:.4f}",
         "< 1.0",
         "PASS" if rmse_res["mean_mae"] < 1.0 else "FAIL"],
        [f"Precision@{TOP_N} (CBF)",
         f"{cbf_res['precision']*100:.2f}%",
         "> 70%",
         "PASS" if cbf_res["precision"] >= 0.70 else "FAIL"],
        [f"Recall@{TOP_N} (CBF)",
         f"{cbf_res['recall']*100:.2f}%",
         "> 60%",
         "PASS" if cbf_res["recall"] >= 0.60 else "FAIL"],
        ["Halal Compliance",
         f"{comp_res['halal_rate']*100:.2f}%",
         "100%",
         "PASS" if comp_res["halal_rate"] == 1.0 else "FAIL"],
        ["Budget Compliance",
         f"{comp_res['budget_rate']*100:.2f}%",
         "100%",
         "PASS" if comp_res["budget_rate"] == 1.0 else "FAIL"],
    ]

    tbl = ax4.table(
        cellText=table_data,
        colLabels=col_labels,
        cellLoc="center",
        loc="center",
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9.5)
    tbl.scale(1.0, 2.0)

    # Style header
    for j in range(len(col_labels)):
        tbl[0, j].set_facecolor("#2d7a4f")
        tbl[0, j].set_text_props(color="white", fontweight="bold")

    # Style PASS/FAIL cells
    for i, row in enumerate(table_data, 1):
        status = row[3]
        for j in range(len(col_labels)):
            tbl[i, j].set_facecolor(
                "#d5f5e3" if status == "PASS" else "#fadbd8"
            )
        tbl[i, 3].set_text_props(
            color="#1a8a46" if status == "PASS" else "#c0392b",
            fontweight="bold"
        )

    ax4.set_title("Evaluation Summary", fontsize=11,
                  fontweight="bold", pad=10)

    # ── Figure title ─────────────────────────────────────────────────────────
    fig.suptitle(
        "HalalSaver MY — System Evaluation Report\n"
        "Section 3.2.3.1 | CF: RMSE/MAE  |  CBF: Precision@10 / Recall@10",
        fontsize=13, fontweight="bold", y=0.99,
    )
    fig.text(
        0.5, 0.005,
        f"CF: SVD++ {K_FOLDS}-fold CV   |   "
        f"CBF: {CBF_N_SAMPLES} sample products (cosine similarity)   |   "
        f"Compliance: {len(COMPLIANCE_QUERIES)*5} hybrid queries",
        ha="center", fontsize=8, color="#7f8c8d",
    )

    plt.savefig(CHART_PNG, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  Saved evaluation_chart.png")


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    print("=" * 62)
    print("  HalalSaver MY — System Evaluation")
    print("  Section 3.2.3.1")
    print("=" * 62)

    # Load data and model artefacts
    df         = pd.read_csv(CLEANED_CSV)
    ratings_df = pd.read_csv(RATINGS_CSV)
    n_cats     = int(df["category_enc"].max()) + 1
    feat_mat   = _product_feature_matrix(df)

    with open(SVDPP_PKL,      "rb") as f: svdpp_data = pickle.load(f)
    with open(POPULARITY_PKL, "rb") as f: pop_scores = pickle.load(f)

    algo     = svdpp_data["model"]
    implicit = svdpp_data["implicit"]

    print(f"\nDataset    : {len(df):,} products")
    print(f"Ratings    : {len(ratings_df):,} interactions  "
          f"({ratings_df['user_id'].nunique()} users)")

    # ── Section 1: RMSE and MAE ───────────────────────────────────────────────
    print("\n" + "-" * 62)
    print("  [1] RMSE and MAE — Collaborative Filtering (SVD++ 5-Fold CV)")
    print("-" * 62)
    rmse_res = rmse_mae_kfold(ratings_df, k=K_FOLDS)

    # ── Section 2: CBF Precision@10 / Recall@10 ───────────────────────────────
    print("\n" + "-" * 62)
    print(f"  [2] Precision@{TOP_N} / Recall@{TOP_N} — Content-Based Filtering")
    print(f"      (5 sample products, cosine similarity)")
    print("-" * 62)
    cbf_res = cbf_precision_recall(df, feat_mat, top_n=TOP_N,
                                   n_samples=CBF_N_SAMPLES, seed=RANDOM_SEED)

    # ── Section 3: Compliance ─────────────────────────────────────────────────
    print("\n" + "-" * 62)
    print("  [3] Halal & Budget Compliance Rates")
    print("-" * 62)
    comp_res = compliance_rates(df, algo, feat_mat, implicit, pop_scores, n_cats)

    # ── Outputs ───────────────────────────────────────────────────────────────
    print("\n" + "-" * 62)
    print("  [4] Saving outputs ...")
    print("-" * 62)
    save_report(rmse_res, cbf_res, comp_res)
    save_chart(rmse_res, cbf_res, comp_res)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 62)
    print("  EVALUATION SUMMARY")
    print("=" * 62)
    rows = [
        ("RMSE (5-Fold CV Mean)",  f"{rmse_res['mean_rmse']:.4f}",
         "< 1.0",  rmse_res["mean_rmse"] < 1.0),
        ("MAE (5-Fold CV Mean)",   f"{rmse_res['mean_mae']:.4f}",
         "< 1.0",  rmse_res["mean_mae"] < 1.0),
        (f"Precision@{TOP_N} (CBF)", f"{cbf_res['precision']*100:.2f}%",
         "> 70%",  cbf_res["precision"] >= 0.70),
        (f"Recall@{TOP_N} (CBF)",    f"{cbf_res['recall']*100:.2f}%",
         "> 60%",  cbf_res["recall"] >= 0.60),
        ("Halal Compliance Rate",  f"{comp_res['halal_rate']*100:.2f}%",
         "100%",   comp_res["halal_rate"] == 1.0),
        ("Budget Compliance Rate", f"{comp_res['budget_rate']*100:.2f}%",
         "100%",   comp_res["budget_rate"] == 1.0),
    ]
    n_pass = sum(1 for *_, ok in rows if ok)
    print(f"  {'Metric':<35} {'Value':>8}  {'Target':>6}  {'Status'}")
    print("  " + "-" * 58)
    for metric, val, target, ok in rows:
        print(f"  {metric:<35} {val:>8}  {target:>6}  "
              f"[{'PASS' if ok else 'FAIL'}]")
    print(f"\n  Passed: {n_pass} / {len(rows)} checks")
    print(f"\n  Outputs:")
    print(f"    {REPORT_CSV}")
    print(f"    {CHART_PNG}")
    print("=" * 62)


if __name__ == "__main__":
    main()
