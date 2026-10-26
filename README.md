# HalalSaver MY — Hybrid Grocery Recommender

A web app that recommends **Halal, budget-friendly groceries** across AEON, Lotus's and Mydin. It combines content-based filtering, a **from-scratch SVD++ collaborative filter (NumPy)** and popularity scoring, and filters every recommendation against the user's budget and Halal preference.

Final Year Project, B.Sc. Computer Science, UiTM Cawangan Melaka (Kampus Jasin).

<!-- Add 2–3 screenshots to docs/screenshots/ with these names, or delete this block -->
<p align="center">
  <img src="docs/screenshots/dashboard.png" width="32%">
  <img src="docs/screenshots/products.png" width="32%">
  <img src="docs/screenshots/comparison.png" width="32%">
</p>

<!-- If deployed, uncomment: **Live demo:** https://your-app.onrender.com -->

---

## How it works

```
User preferences (budget, categories, stores, Halal only)
        │
        ├──► Content-based filtering ── cosine similarity on product features
        │
        ├──► Collaborative filtering ─── custom SVD++ (NumPy, manual SGD)
        │
        ▼
  base_score  = max(content_score, collab_score)
  final_score = 0.9 × base_score + 0.1 × popularity_score
        │
        ▼
  Hard filters: Halal status + budget  ──►  Top-10 recommendations
```

- **SVD++ is implemented from scratch** (no Surprise library): 20 latent factors, 25 epochs, learning rate 0.005, L2 regularisation 0.02, with implicit feedback from each user's rated-item set.
- **Content-based filtering** scores products by similarity to the requested budget, category and Halal constraints. Personalisation comes from SVD++.
- **Popularity** is a normalised aggregate of user interactions (views + 2 × purchases + clicks).

## Results

Evaluated with 5-fold cross-validation on 6,300 products and 17,658 ratings from 500 users (`evaluate.py`).

| Metric | Result |
|---|---|
| RMSE | 0.6481 (SD 0.0069) |
| MAE | 0.5193 |
| Precision@10 | 96.00% |
| Recall@10 | 19.22% |
| F1@10 | 32.03% |
| Halal compliance | 100% |
| Budget compliance | 100% |
| SUS (usability) | 63.41 |

**Why Recall@10 is low:** with only 10 recommendations against category pools of 59–845 relevant items, high recall is mathematically impossible. Precision is the meaningful measure here: 96% of what users see is relevant.

## Limitations

- **Synthetic data.** The product catalogue was generated for this project (see `data/pipeline/`), and the collaborative filter is trained on ratings from 500 simulated users, not real shopper behaviour.
- **Halal verification is simulated.** Halal status and JAKIM fields come from the dataset; there is no live JAKIM API check. The filtering mechanism is validated, not live certification.
- **Prices are static** and are not scraped from the stores.
- **Facebook sign-in** is a placeholder button, not yet implemented.

## Features

- **Personalised recommendations** on the dashboard, refreshed via `/api/recommend` without a page reload
- **Preferences:** monthly budget (RM5–RM500), Halal-only toggle, preferred categories and stores, quick presets
- **Product catalogue** with search, category/store/price/Halal filters, sorting and pagination
- **Price comparison** of up to 4 products side by side, with best-price highlighting
- **Ranking leaderboard** by store, category or best value
- **Favourites and shopping list**, stored per user in Firestore
- **Authentication** with email/password and Google (Firebase Authentication)
- **Responsive, installable PWA**: one layout for phone, tablet and laptop

## Pages

| Route | Page | Login |
|---|---|---|
| `/` | Home: search, categories, featured stores and products | — |
| `/login`, `/signup` | Sign in / register | — |
| `/preferences` | Budget, Halal, category and store preferences | ✓ |
| `/dashboard` | Personalised recommendations and preference summary | ✓ |
| `/products` | Catalogue with filters, sort and pagination | — |
| `/products/<id>` | Product detail with similar products | — |
| `/comparison` | Side-by-side comparison (up to 4) | — |
| `/ranking` | Top-ranked products | — |
| `/saved` | Favourites and shopping list | ✓ |
| `/profile` | Account profile | ✓ |

**API:** `/api/recommend`, `/api/products`, `/api/product/<id>`, `/api/search`, `/api/favourites`, `/api/list`, `/api/auth/google`

## Tech stack

Python 3.12 · Flask · NumPy · pandas · scikit-learn · Firebase Firestore & Authentication · Jinja2 · HTML/CSS/JavaScript · Bootstrap 5 · PWA (manifest + service worker) · Render (deployment config)

## Project structure

```
halalsaver/
├── app.py                 # Flask app: routes, session, API endpoints
├── recommender.py         # Hybrid recommender: content-based + custom SVD++ + popularity
├── evaluate.py            # 5-fold CV evaluation (RMSE, MAE, Precision/Recall/F1@10)
├── database.py            # Firestore + Firebase Auth integration
├── firestore_seed.py      # One-time product upload to Firestore
├── firestore.rules        # Firestore security rules
├── requirements.txt
├── .env.example           # Template for .env (never commit .env)
├── Procfile, render.yaml  # Deployment config
├── manifest.json, sw.js   # PWA manifest and service worker
├── data/
│   ├── cleaned_dataset.csv   # 6,300-product catalogue used by the app
│   ├── user_ratings.csv      # 17,658 simulated ratings (500 users)
│   ├── products.csv          # Photographed product subset
│   └── pipeline/             # Archived dataset-generation scripts
├── models/
│   ├── svdpp_model.pkl       # Trained SVD++ model
│   └── popularity_scores.pkl
├── templates/             # Jinja2 pages + _partials/
├── static/css/, css/, js/ # Styles and client-side scripts
└── frontend/assets/       # Product images and PWA icons
```

A beginner-friendly walkthrough of the codebase is in [GUIDE.md](GUIDE.md).

## Getting started

### 1. Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Firestore Database** and **Authentication** (Email/Password, Google).
3. **Project Settings → Service Accounts → Generate New Private Key.** Save it as `serviceAccountKey.json` in the project root.
4. **Project Settings → General:** copy the **Web API Key**.
5. Deploy the security rules in `firestore.rules`.

> Never commit `serviceAccountKey.json` or `.env`. Both are in `.gitignore`.

### 2. Run locally

```bash
git clone https://github.com/fztlntsh/halalsaver.git
cd halalsaver
pip install -r requirements.txt
cp .env.example .env              # paste your Firebase Web API key
python firestore_seed.py          # seed products (run once)
python app.py                     # open http://127.0.0.1:5000
```

### 3. Reproduce the evaluation

```bash
python evaluate.py                # writes outputs/evaluation_report.csv and a chart
```

## Data model (Firestore)

| Collection | Contents |
|---|---|
| `grocery_items` | Product catalogue (read-only to clients) |
| `users` | User profiles |
| `user_preferences` | Budget, categories, Halal flag, stores |
| `user_ratings` | User–product ratings (1–5) |
| `user_favourites` | Saved products |
| `user_list` | Shopping list items and quantities |

Security rules let users read and write only their own documents; products are writable only by the server (Admin SDK).

## Author

**Faizatul Natasha binti Rabuan**, B.Sc. Computer Science, UiTM Cawangan Melaka (Kampus Jasin)
Supervisor: Miss Siti Fatimah binti Mohd Rum
[LinkedIn](https://linkedin.com/in/faizatul-natasha)
