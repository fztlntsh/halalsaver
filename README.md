# HalalSaver MY — Hybrid Grocery Recommender System

**Student:** Faizatul Natasha Binti Rabuan
**Matric:** 2023607332
**University:** UiTM Cawangan Melaka Kampus Jasin
**Course:** CS230 — Final Year Project

---

## Project Overview

HalalSaver MY is a web-based hybrid grocery recommender system designed to help Malaysian consumers find the best halal grocery deals across major supermarkets (Lotus's, Mydin, AEON). The system combines two recommendation algorithms — SVD++ collaborative filtering and Cosine Similarity content-based filtering — to generate personalised product recommendations that respect the user's budget and halal dietary requirements.

The web application is built with Flask and uses a fully responsive design that adapts automatically to any screen size — phone, tablet, or laptop — without requiring manual view switching.

---

## Project Objectives

1. Design a grocery recommender system that identifies grocery items by price and Halal certification
2. Develop a hybrid recommendation system combining budget optimisation and Halal verification
3. Evaluate the system's functionality and accuracy

---

## Tech Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Frontend     | HTML5 / CSS3 (Responsive) / JavaScript      |
| Backend      | Python 3 + Flask                            |
| Database     | Firebase Firestore                          |
| Auth         | Firebase Authentication                     |
| ML Models    | SVD++ (Surprise) + Cosine Similarity        |
| CSS Framework| Bootstrap 5 + Custom CSS (mobile-first)     |
| Icons        | FontAwesome 6                               |
| IDE          | Visual Studio Code + Jupyter Notebook       |

---

## Pages & Features

### 1. Home Page — `/`
**File:** [templates/home.html](templates/home.html)

The public landing page. Introduces the system and allows any visitor (logged in or not) to explore the catalogue.

| Section | Description |
|---|---|
| **Hero Banner** | Headline, tagline, and two CTA buttons (Get Started / Sign In). Shows key stats: 500+ products, 3 stores, 13 categories, 100% Halal. |
| **Hero Search Bar** | Full-text search input with quick-tag shortcuts (Milo, Rice, Cooking Oil, Detergent, Chicken). Pressing Enter or clicking Search redirects to the Products page with the query. |
| **Shop by Category** | 12 category icon buttons (Beverages, Dairy & Eggs, Meat & Poultry, Rice & Grains, Cooking, Snacks, Personal Care, Household, Frozen, Bakery, Halal Only, All). Each links directly to the filtered Products page. |
| **Featured Stores** | Three store cards (Lotus's, Mydin, AEON). Clicking a card filters Products by that store. |
| **Featured Products** | A product grid pulled from the backend showing selected products with image, price, halal badge, discount badge, Favourite, View, and Compare buttons. |
| **Hot Deals Today** | Three promotional banners highlighting current discounts, halal guarantee, and AI recommendations. |
| **How It Works** | 4-step walkthrough (Create Account → Set Preferences → Get Recommendations → Compare & Save). Hidden on mobile to keep the page clean. |
| **CTA Banner** | Bottom call-to-action encouraging sign-up. |

---

### 2. Sign In Page — `/login`
**File:** [templates/login.html](templates/login.html)

Authentication page for returning users.

| Feature | Description |
|---|---|
| **Two-column layout (desktop)** | Left panel shows a green promotional sidebar with feature highlights. Right panel holds the login form. |
| **Single-column layout (mobile)** | The promo sidebar is hidden; the logo appears above the form instead. |
| **Login form** | Email + password fields with show/hide password toggle. |
| **Google Sign-In** | One-click sign in via Firebase Google authentication. |
| **Redirect** | Redirects to Dashboard after successful login. |

---

### 3. Sign Up Page — `/signup`
**File:** [templates/signup.html](templates/signup.html)

Registration page for new users.

| Feature | Description |
|---|---|
| **Two-column layout (desktop)** | Form on the left, promo panel on the right (reverse of login). |
| **Registration form** | Full name, email, password, confirm password fields with real-time strength indicator. |
| **Google Sign-Up** | Register and sign in with Google in one step. |
| **Redirect** | On success, redirects to the Preferences page so new users can immediately set up their shopping profile. |

---

### 4. Preferences Page — `/preferences`
**File:** [templates/preferences.html](templates/preferences.html)

Personalisation settings page. Users configure the filters that drive their recommendations. Requires login.

| Setting | Description |
|---|---|
| **Quick Presets** | Three one-click preset buttons: Budget Shopping (RM50, essentials only), Family Groceries (RM200, all categories), Premium Shopper (RM500, all categories). |
| **Monthly Budget Slider** | A range slider (RM5–RM500) with quick-set buttons (RM50 / RM100 / RM200 / RM300 / RM500). Live display updates as the slider moves. |
| **Halal Only Toggle** | A toggle switch. When ON, only JAKIM-certified products appear in recommendations. Defaults to ON. |
| **Preferred Categories** | Multi-select checkboxes for all 13 product categories. Select All / Clear All shortcuts included. |
| **Preferred Stores** | Checkbox selection for Lotus's, Mydin, AEON. Leaving all unchecked means all stores are included. |
| **Save** | Submits via POST, saves to Firestore `user_preferences` collection, and redirects back to Dashboard. |

---

### 5. Dashboard — `/dashboard`
**File:** [templates/dashboard.html](templates/dashboard.html)

The main personalised hub. Requires login. Shows the user's recommendations and account overview.

| Section | Description |
|---|---|
| **Welcome Header** | User avatar (generated from name initials), greeting message, and "Edit Preferences" button (desktop only). |
| **Budget Tracker Card** | Displays monthly budget from preferences, a progress bar (hardcoded at 35% for demo), spent/remaining amounts, and total recommendation count for the day. |
| **Your Recommendations** | A live product grid generated by the hybrid recommender. Each card shows name, price, halal badge, store badge, discount badge, and a match-score bar (%). Includes a budget override input and a Refresh button that calls `/api/recommend` via fetch to reload recommendations without a page reload. |
| **My Preferences (sidebar, desktop)** | A summary card showing current budget, halal toggle status, selected categories, and selected stores. |
| **Quick Actions (sidebar, desktop)** | Shortcut links to Browse Products, Compare Prices, Top Rankings, and Halal Products. |
| **Your Stats (sidebar, desktop)** | Live counts of Products Viewed, Favourites Saved, and items In Comparison — pulled from localStorage. |

---

### 6. Products Page — `/products`
**File:** [templates/products.html](templates/products.html)

The main product catalogue with search, filter, sort, and pagination. Accessible to guests and logged-in users.

| Feature | Description |
|---|---|
| **Search** | Full-text search via `?q=` URL parameter. Displays result count and the search term. |
| **Sidebar Filters (desktop)** | A sticky left sidebar with: text search, category dropdown, store dropdown, price range slider (RM5–RM500), and halal-only toggle. Filters apply on change or on submit. |
| **Filter Drawer (mobile)** | A slide-up bottom drawer with the same filters, activated by the "Filters" button at the top of the page. A badge shows how many filters are currently active. |
| **Active Filter Chips** | When filters are applied, chips appear below the results header with individual × remove links and a "Clear all" option. |
| **Sort (desktop)** | A dropdown to reorder the current product grid by Price Low→High, Price High→Low, Biggest Discount, or Name A–Z. Sorting happens client-side without a page reload. |
| **Product Grid** | Responsive grid of cards. Each card shows product image, halal badge (if certified), store badge, name, discounted price, discount %, and three action buttons: Favourite (heart), View (links to detail page), Compare (scales). |
| **Pagination** | Page-by-page navigation preserving all active filters in the URL. Shows current page, total pages, and total product count. |

---

### 7. Product Detail Page — `/products/<product_id>`
**File:** [templates/product_detail.html](templates/product_detail.html)

Full detail view for a single product.

| Section | Description |
|---|---|
| **Breadcrumb** | Home → Products → Category → Product Name navigation trail. |
| **Product Image** | Large placeholder image with halal badge overlay and discount % badge. |
| **Mobile Action Buttons** | "Save to Favourites" and "Compare" buttons placed below the image on mobile screens. |
| **Product Info** | Store badge, category chip, in-stock status, full product name, brand, unit/weight. |
| **Price Block** | Shows discounted price prominently. If a discount applies, the original price appears crossed out with the savings amount calculated. |
| **Desktop Action Buttons** | "Save to Favourites" and "Add to Comparison" buttons in the info column on desktop. |
| **Product Attributes** | Structured rows for Category, Brand, Unit, Halal Status, In Stock, Store — laid out in a clean attribute table. |
| **Similar Products** | A "You Might Also Like" section with content-based recommendations for products in the same category. |

---

### 8. Comparison Page — `/comparison`
**File:** [templates/comparison.html](templates/comparison.html)

Side-by-side price and feature comparison for up to 4 products at once.

| Feature | Description |
|---|---|
| **Search Bar** | Live-search with debounce (300ms) to find and add products. Calls `/api/search?q=` and shows a dropdown of up to 8 matching results with name, store, price, and halal badge. |
| **Comparison Table (desktop)** | A full HTML table where each column is one product. Rows compare: Price (best price highlighted with a star badge), Store, Halal Certification, Discount %, Original Price, Category, Brand, Unit, and In Stock status. |
| **Mobile Cards (mobile)** | A horizontally scrollable row of compact cards, one per product. Shows image, name, price, store, halal badge, and discount. The lowest-priced product gets a "Best Price" ribbon. |
| **Remove Products** | Each product has a × button to remove it from the comparison. The URL updates with the remaining product IDs. |
| **Try Comparing Suggestions (desktop)** | Category chip shortcuts below the table to help users discover products to compare. |
| **Empty State** | When no products are selected, a prompt with a Browse Products link is shown. |

---

### 9. Ranking Page — `/ranking`
**File:** [templates/ranking.html](templates/ranking.html)

Leaderboard of the highest-scoring products across all stores, ranked by popularity and halal-adjusted score.

| Section | Description |
|---|---|
| **Hero Banner** | Page title, description, and three live stats: total products ranked, halal-certified count, number of stores. |
| **Tab Filters** | Four tabs: All, By Store, By Category, Best Value. "By Store" and "By Category" reveal sub-filter chips below the tabs. "Best Value" re-sorts the list by discount % descending (client-side). |
| **Sub-filters** | Store chips (Lotus's, Mydin, AEON) or Category chips appear under the tab bar to narrow the ranking list. |
| **Top 3 Podium (desktop)** | A visual podium showing 1st (gold crown), 2nd (silver), and 3rd (bronze) place products with image, name, and price. Hidden on mobile. |
| **Full Ranking List** | Every product ranked with: medal (top 3) or rank number, product image, name, store badge, category, halal badge, brand, price, discount badge, a score progress bar (desktop only), and action buttons (View, Favourite, Compare). |

---

## Folder Structure

```
SYSTEM/
├── app.py                    # Flask application — routes, session, API endpoints
├── recommender.py            # Hybrid recommender: SVD++ + Cosine Similarity
├── database.py               # Firebase Firestore + Auth integration
├── evaluate.py               # Model evaluation (RMSE, MAE, Precision@10, Recall@10)
├── firestore_seed.py         # One-time script to upload products to Firestore
├── firestore.rules           # Firestore security rules
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (NOT in git)
├── .env.example              # Template for .env
├── serviceAccountKey.json    # Firebase service account (NOT in git)
├── manifest.json             # PWA manifest
├── sw.js                     # Service worker
│
├── data/
│   ├── cleaned_dataset.csv   # 6,300 grocery products (pre-cleaned)
│   └── user_ratings.csv      # Synthetic user ratings for SVD++ training
│
├── models/
│   ├── svdpp_model.pkl        # Trained SVD++ model
│   ├── cosine_sim_matrix.pkl  # Pre-computed cosine similarity matrix
│   └── popularity_scores.pkl  # Pre-computed popularity scores
│
├── outputs/
│   ├── evaluation_report.csv  # Evaluation metrics results
│   └── evaluation_chart.png   # Evaluation metrics chart
│
├── templates/                 # Jinja2 HTML templates
│   ├── base.html              # Base layout — responsive navbar, mobile bottom nav, footer
│   ├── home.html              # Landing page with hero, categories, featured products
│   ├── login.html             # Sign in (email/password + Google)
│   ├── signup.html            # Register new account
│   ├── preferences.html       # User preferences — budget, halal filter, categories, stores
│   ├── dashboard.html         # Personalised recommendations + budget tracker
│   ├── products.html          # Product catalogue with filters, search, sort, pagination
│   ├── product_detail.html    # Single product detail with similar products
│   ├── comparison.html        # Side-by-side product comparison (up to 4 products)
│   └── ranking.html           # Top-ranked products leaderboard
│
├── static/
│   ├── css/
│   │   ├── app.css            # Main layout and component styles
│   │   └── toggle.css        # Responsive breakpoint styles (replaces view-toggle)
│   └── js/
│       ├── main.js            # Shared utilities (static HTML version)
│       └── toggle.js          # Stub (view switching removed — CSS handles responsiveness)
│
├── css/
│   └── styles.css             # Green-themed design system and component styles
│
└── js/
    ├── main.js                # Main JavaScript (Firebase auth, shared components)
    └── functions.js           # Product interactions (favourites, compare tray)
```

---

## Responsive Design

The system uses a single responsive layout that automatically adapts to different screen sizes. There is no manual view-switching button.

| Breakpoint | Behaviour |
|---|---|
| **Desktop (> 768px)** | Full navbar with links and search bar visible. Sidebar filters shown on Products page. Footer in multi-column layout. Top 3 podium shown on Ranking page. Score bars shown in comparisons. |
| **Mobile (≤ 768px)** | Navbar collapses to logo + search icon + avatar. Bottom navigation bar appears for main pages. Sidebar filters replaced by slide-up filter drawer. Product grid switches to 2 columns. Footer stacks vertically. |

CSS utility classes used in templates:
- `.web-only` — element is hidden on mobile (≤ 768px), visible on desktop
- `.mobile-only` — element is hidden on desktop (> 768px), visible on mobile

---

## Firebase Setup Instructions

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project named **HalalSaver**
3. Enable **Firestore Database** (Start in test mode)
4. Enable **Firebase Authentication**
   - Email/Password
   - Google Sign-In
5. Go to **Project Settings → Service Accounts**
6. Click **Generate New Private Key**
7. Download and rename to: `serviceAccountKey.json`
8. Place `serviceAccountKey.json` in the project root folder
9. Go to **Project Settings → General** → copy **Web API Key**
10. Create a `.env` file in the project root:
    ```
    FIREBASE_WEB_API_KEY=your-web-api-key-here
    ```
11. Deploy Firestore security rules from `firestore.rules`

> **WARNING:** NEVER push `serviceAccountKey.json` or `.env` to GitHub. Both are listed in `.gitignore`.

---

## Installation Instructions

1. Clone or download this project folder
2. Open terminal in project root
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Make sure `serviceAccountKey.json` is in the root folder
5. Create `.env` with your Firebase Web API Key (see Firebase Setup above)
6. Seed product data to Firestore (run once):
   ```bash
   python firestore_seed.py
   ```
7. Run the Flask app:
   ```bash
   python app.py
   ```
8. Open browser at:
   ```
   http://127.0.0.1:5000
   ```

---

## How to Run Jupyter Notebooks

1. Open terminal
2. Run:
   ```bash
   jupyter notebook
   ```
3. Open the `notebooks/` folder
4. Run notebooks in order:
   ```
   01 → 02 → 03 → 04 → 05 → 06
   ```

---

## Evaluation Results Summary

| Metric             | Result  | Target  | Status |
|--------------------|---------|---------|--------|
| RMSE               | 0.6471  | < 1.0   | PASS   |
| MAE                | 0.5188  | < 0.8   | PASS   |
| Precision@10       | 92.00%  | > 70%   | PASS   |
| Recall@10          | 92.00%  | > 60%   | PASS   |
| Halal Compliance   | 100%    | 100%    | PASS   |
| Budget Compliance  | 100%    | 100%    | PASS   |

---

## Firebase Collections

| Collection         | Description                              |
|--------------------|------------------------------------------|
| `grocery_items`    | 6,300 grocery products (seeded from CSV) |
| `users`            | User profiles created at signup          |
| `user_preferences` | Budget, categories, halal flag, stores   |
| `user_ratings`     | User-product interactions and ratings    |
| `user_favourites`  | Saved/bookmarked products per user       |

---

## Key Features

- **Hybrid Recommendations** — SVD++ collaborative filtering combined with Cosine Similarity content-based filtering, producing a final weighted score per product
- **Halal Verification** — 100% JAKIM-certified halal filtering enforced at recommendation and display level
- **Budget Optimisation** — Recommendations stay within the user's defined monthly budget
- **Responsive Web Design** — Single codebase adapts automatically to phone, tablet, and laptop screen sizes using CSS media queries
- **Firebase Auth** — Email/password sign in and Google Sign-In via Firebase Authentication
- **Real-time Recommendation Refresh** — Dashboard fetches updated recommendations via `/api/recommend` without a page reload
- **Product Comparison** — Side-by-side comparison of up to 4 products with best-price highlighting
- **Product Ranking** — Leaderboard ranked by popularity score with halal boost weighting, filterable by store, category, or best value
- **Favourites & Compare Tray** — Client-side localStorage tracking of saved products and comparison queue, persisted across pages
