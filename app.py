"""
app.py
HalalSaver MY — Flask Web Application
FYP — CS230 | UiTM
"""

from __future__ import annotations

import os
import pickle
import math
import traceback
from functools import wraps

import pandas as pd
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, flash, jsonify, send_from_directory
)

import sys
import recommender as _recommender_mod
# Make SVDPlusPlus findable under __main__ when unpickling (model was trained
# from a script where recommender was __main__)
sys.modules['__main__'].SVDPlusPlus = _recommender_mod.SVDPlusPlus  # type: ignore

from recommender import hybrid_recommend, _product_feature_matrix, SVDPlusPlus
import database as db_layer

# ─── APP SETUP ────────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', 'halalsaver-fyp-dev-secret')

# ─── STATIC FILE ROUTES (serve existing css/js from non-static folders) ──────

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('assets', filename)

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('.', 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    return send_from_directory('.', 'sw.js')

# ─── LOAD DATA & MODELS AT STARTUP ───────────────────────────────────────────

print("[HalalSaver] Loading dataset and models...")

df         = pd.read_csv('data/cleaned_dataset.csv')
ratings_df = pd.read_csv('data/user_ratings.csv')
n_cats     = int(df['category_enc'].max()) + 1
feat_mat   = _product_feature_matrix(df)

with open('models/svdpp_model.pkl', 'rb') as f:
    svdpp_data = pickle.load(f)

with open('models/popularity_scores.pkl', 'rb') as f:
    pop_scores = pickle.load(f)

algo     = svdpp_data['model']
implicit = svdpp_data['implicit']

# Pre-compute useful lists
CATEGORIES = sorted(df['category'].dropna().unique().tolist())
STORES     = sorted(df['store'].dropna().unique().tolist())

print(f"[HalalSaver] Loaded {len(df)} products | {len(CATEGORIES)} categories | {len(STORES)} stores")

# ─── HELPERS ─────────────────────────────────────────────────────────────────

PER_PAGE = 24


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            # API routes get a JSON 401 so JS callers can handle it gracefully
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Login required', 'login_url': url_for('login')}), 401
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


def get_current_user_id() -> str | None:
    return session.get('user_id') or session.get('user', {}).get('id') or None


def df_to_records(frame: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to JSON-serialisable list of dicts."""
    records = []
    for row in frame.to_dict(orient='records'):
        clean = {}
        for k, v in row.items():
            if pd.isna(v) if not isinstance(v, (list, dict)) else False:
                clean[k] = None
            elif isinstance(v, float):
                clean[k] = round(float(v), 4)
            elif hasattr(v, 'item'):       # numpy scalar
                clean[k] = v.item()
            else:
                clean[k] = v
        records.append(clean)
    return records


def filter_products(
    category: str | None = None,
    store: str | None = None,
    halal: str | None = None,
    max_price: float | None = None,
    q: str | None = None,
) -> pd.DataFrame:
    """Return filtered slice of df."""
    result = df.copy()
    if category and category != 'all':
        result = result[result['category'].str.lower() == category.lower()]
    if store and store != 'all':
        result = result[result['store'].str.lower() == store.lower()]
    if halal and halal.lower() == 'true':
        result = result[result['halal_certified'] == True]
    if max_price:
        result = result[result['price_after_discount'] <= float(max_price)]
    if q:
        mask = (
            result['product_name'].str.contains(q, case=False, na=False) |
            result['category'].str.contains(q, case=False, na=False) |
            result['brand'].str.contains(q, case=False, na=False)
        )
        result = result[mask]
    return result


# ─── PAGE ROUTES ─────────────────────────────────────────────────────────────

@app.route('/')
def home():
    # Featured products: top 8 by popularity
    featured = []
    try:
        top_ids = pop_scores.nlargest(8).index.tolist()
        feat_df = df[df['product_id'].isin(top_ids)].copy()
        featured = df_to_records(feat_df)
    except Exception:
        featured = df_to_records(df.head(8))
    return render_template('home.html', featured_products=featured, active_page='home')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        uid, err = db_layer.sign_in_with_email_password(email, password)
        if err:
            flash(err, 'danger')
        else:
            user_doc = db_layer.get_user(uid) or db_layer.get_user_by_email(email) or {}
            name = user_doc.get('name', email.split('@')[0])
            session['user_id'] = uid
            session['user'] = {'id': uid, 'name': name, 'email': email}
            # Load saved preferences into session
            prefs = db_layer.get_preferences(uid)
            if prefs:
                session['prefs'] = {
                    'budget':     prefs.get('budget_max', 100),
                    'categories': prefs.get('preferred_categories', []),
                    'halal_only': prefs.get('halal_only', True),
                    'stores':     prefs.get('fav_stores', []),
                }
            flash(f"Welcome back, {name}!", 'success')
            return redirect(url_for('dashboard'))
    return render_template('login.html', active_page='')


@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name             = request.form.get('full_name', '').strip()
        email            = request.form.get('email', '').strip().lower()
        password         = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        halal_only       = request.form.get('halal_only') == 'on'

        if not name or not email or not password:
            flash('Please fill in all required fields.', 'danger')
        elif password != confirm_password:
            flash('Passwords do not match.', 'danger')
        else:
            uid, err = db_layer.create_auth_user(email, password, name)
            if err:
                flash(err, 'danger')
            else:
                db_layer.save_user(uid, name, email, halal_only=halal_only)
                session['user_id'] = uid
                session['user'] = {'id': uid, 'name': name, 'email': email}
                flash('Account created! Please set your preferences.', 'success')
                return redirect(url_for('preferences'))
    return render_template('signup.html', active_page='')


@app.route('/preferences', methods=['GET', 'POST'])
@login_required
def preferences():
    if request.method == 'POST':
        prefs = {
            'budget':     float(request.form.get('budget', 100)),
            'categories': request.form.getlist('categories'),
            'halal_only': request.form.get('halal_only') == 'on',
            'stores':     request.form.getlist('stores'),
        }
        session['prefs'] = prefs
        # Persist to database
        user_id = get_current_user_id()
        db_layer.save_preferences(user_id, prefs)
        flash('Preferences saved!', 'success')
        return redirect(url_for('dashboard'))
    # Load from database if session prefs missing
    user_id = get_current_user_id()
    saved = db_layer.get_preferences(user_id)
    current_prefs = session.get('prefs') or {
        'budget':     saved.get('budget_max', 100),
        'categories': saved.get('preferred_categories', []),
        'halal_only': saved.get('halal_only', True),
        'stores':     saved.get('fav_stores', []),
    }
    return render_template(
        'preferences.html',
        active_page='preferences',
        categories=CATEGORIES,
        stores=STORES,
        prefs=current_prefs,
    )


@app.route('/dashboard')
@login_required
def dashboard():
    user_id = get_current_user_id()

    # Load prefs from database if session is empty
    if 'prefs' not in session:
        saved = db_layer.get_preferences(user_id)
        session['prefs'] = {
            'budget':     saved.get('budget_max', 100),
            'categories': saved.get('preferred_categories', []),
            'halal_only': saved.get('halal_only', True),
            'stores':     saved.get('fav_stores', []),
        }

    prefs      = session['prefs']
    budget     = prefs.get('budget', 100)
    halal_only = prefs.get('halal_only', True)
    category   = prefs.get('categories', [None])[0] if prefs.get('categories') else None

    recommendations = []
    try:
        recs_df = hybrid_recommend(
            user_id=user_id,
            budget=float(budget),
            category=category,
            halal_only=halal_only,
            top_n=10,
            df=df,
            feat_mat=feat_mat,
            algo=algo,
            implicit=implicit,
            pop_scores=pop_scores,
            n_cats=n_cats,
        )
        recommendations = df_to_records(recs_df)
    except Exception as e:
        print(f"[Dashboard] recommend error: {e}")
        recommendations = df_to_records(df.head(10))

    # Load favourites and user profile from database
    favourites   = db_layer.get_favourites(user_id)
    user_profile = db_layer.get_user(user_id) or session.get('user', {})

    return render_template(
        'dashboard.html',
        active_page='dashboard',
        recommendations=recommendations,
        user_prefs=prefs,
        favourites=favourites,
        user_profile=user_profile,
    )


@app.route('/products')
@login_required
def products():
    category  = request.args.get('category')
    store     = request.args.get('store')
    halal     = request.args.get('halal')
    max_price = request.args.get('max_price', type=float)
    q         = request.args.get('q', '').strip()
    page      = request.args.get('page', 1, type=int)

    filtered  = filter_products(category, store, halal, max_price, q)
    total     = len(filtered)
    pages     = max(1, math.ceil(total / PER_PAGE))
    page      = max(1, min(page, pages))
    start     = (page - 1) * PER_PAGE
    end       = start + PER_PAGE
    page_products = df_to_records(filtered.iloc[start:end])

    return render_template(
        'products.html',
        active_page='products',
        products=page_products,
        total=total,
        page=page,
        pages=pages,
        categories=CATEGORIES,
        stores=STORES,
        args=request.args,
    )


@app.route('/products/<pid>')
@login_required
def product_detail(pid):
    row = df[df['product_id'] == pid]
    if row.empty:
        flash('Product not found.', 'danger')
        return redirect(url_for('products'))

    product = df_to_records(row)[0]
    # Increment popularity on each view
    db_layer.update_popularity(pid, delta=0.01)

    # Related: same category, exclude self, top 8 by pop score
    cat = product.get('category')
    related_df = df[(df['category'] == cat) & (df['product_id'] != pid)]
    if not related_df.empty:
        try:
            related_ids = pop_scores[pop_scores.index.isin(related_df['product_id'])].nlargest(8).index.tolist()
            related_df  = related_df[related_df['product_id'].isin(related_ids)]
        except Exception:
            related_df = related_df.head(8)
    related = df_to_records(related_df.head(8))

    return render_template(
        'product_detail.html',
        active_page='products',
        product=product,
        related=related,
    )


@app.route('/comparison')
@login_required
def comparison():
    # Redirect old /comparison?ids=... links to new /compare
    return redirect(url_for('compare', **request.args))


@app.route('/ranking')
@login_required
def ranking():
    try:
        top_ids   = pop_scores.nlargest(50).index.tolist()
        ranked_df = df[df['product_id'].isin(top_ids)].copy()
        ranked_df['pop_score'] = ranked_df['product_id'].map(pop_scores)
        # Boost halal products
        ranked_df['rank_score'] = ranked_df['pop_score'] * ranked_df['halal_certified'].apply(lambda x: 1.2 if x else 1.0)
        ranked_df = ranked_df.sort_values('rank_score', ascending=False).reset_index(drop=True)
        ranked_products = df_to_records(ranked_df)
    except Exception as e:
        print(f"[Ranking] error: {e}")
        ranked_products = df_to_records(df.head(50))
    return render_template(
        'ranking.html',
        active_page='ranking',
        ranked_products=ranked_products,
        categories=CATEGORIES,
        stores=STORES,
    )


# ─── API ENDPOINTS ────────────────────────────────────────────────────────────

@app.route('/api/recommend')
@login_required
def api_recommend():
    user_id    = request.args.get('user_id', get_current_user_id())
    budget     = float(request.args.get('budget', 50))
    category   = request.args.get('category') or None
    halal_only = request.args.get('halal_only', 'true').lower() == 'true'
    top_n      = int(request.args.get('top_n', 10))

    try:
        recs = hybrid_recommend(
            user_id=user_id, budget=budget, category=category,
            halal_only=halal_only, top_n=top_n,
            df=df, feat_mat=feat_mat, algo=algo,
            implicit=implicit, pop_scores=pop_scores, n_cats=n_cats,
        )
        return jsonify(df_to_records(recs))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/products')
def api_products():
    category  = request.args.get('category')
    store     = request.args.get('store')
    halal     = request.args.get('halal')
    max_price = request.args.get('max_price', type=float)
    q         = request.args.get('q', '').strip()
    page      = request.args.get('page', 1, type=int)
    per_page  = request.args.get('per_page', PER_PAGE, type=int)

    filtered  = filter_products(category, store, halal, max_price, q)
    total     = len(filtered)
    pages     = max(1, math.ceil(total / per_page))
    page      = max(1, min(page, pages))
    start     = (page - 1) * per_page
    end       = start + per_page

    return jsonify({
        'products': df_to_records(filtered.iloc[start:end]),
        'total':    total,
        'page':     page,
        'pages':    pages,
    })


@app.route('/api/product/<pid>')
def api_product(pid):
    row = df[df['product_id'] == pid]
    if row.empty:
        return jsonify({'error': 'Product not found'}), 404

    product = df_to_records(row)[0]
    cat     = product.get('category')
    related_df = df[(df['category'] == cat) & (df['product_id'] != pid)]
    try:
        related_ids = pop_scores[pop_scores.index.isin(related_df['product_id'])].nlargest(6).index.tolist()
        related_df  = related_df[related_df['product_id'].isin(related_ids)]
    except Exception:
        related_df = related_df.head(6)

    return jsonify({'product': product, 'related': df_to_records(related_df.head(6))})


@app.route('/api/search')
def api_search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    results = filter_products(q=q)
    return jsonify(df_to_records(results.head(20)))


@app.route('/api/auth/google', methods=['POST'])
def api_auth_google():
    """Verify a Firebase ID token from the client-side Google Sign-In."""
    data     = request.get_json(silent=True) or {}
    id_token = data.get('id_token', '')
    if not id_token:
        return jsonify({'error': 'id_token required'}), 400

    uid = db_layer.verify_id_token(id_token)
    if not uid:
        return jsonify({'error': 'Invalid or expired token'}), 401

    user_doc = db_layer.get_user(uid) or {}
    name     = user_doc.get('name') or data.get('display_name', 'User')
    email    = user_doc.get('email') or data.get('email', '')

    # Upsert user record
    if not user_doc:
        db_layer.save_user(uid, name, email)

    session['user_id'] = uid
    session['user'] = {'id': uid, 'name': name, 'email': email}
    prefs = db_layer.get_preferences(uid)
    session['prefs'] = {
        'budget':     prefs.get('budget_max', 100),
        'categories': prefs.get('preferred_categories', []),
        'halal_only': prefs.get('halal_only', True),
        'stores':     prefs.get('fav_stores', []),
    }
    return jsonify({'uid': uid, 'name': name, 'redirect': url_for('dashboard')})


@app.route('/api/favourites', methods=['GET'])
@login_required
def api_get_favourites():
    user_id = get_current_user_id()
    favs    = db_layer.get_favourites(user_id)
    return jsonify({'favourites': favs})


@app.route('/api/favourites/<pid>', methods=['POST'])
@login_required
def api_add_favourite(pid):
    user_id = get_current_user_id()
    db_layer.save_favourite(user_id, pid)
    db_layer.save_rating(user_id, pid, 4.0, interaction_type='favourite')
    db_layer.update_popularity(pid, delta=0.05)
    return jsonify({'status': 'saved', 'product_id': pid})


@app.route('/api/favourites/<pid>', methods=['DELETE'])
@login_required
def api_remove_favourite(pid):
    user_id = get_current_user_id()
    db_layer.remove_favourite(user_id, pid)
    return jsonify({'status': 'removed', 'product_id': pid})


@app.route('/api/rate', methods=['POST'])
@login_required
def api_rate():
    data     = request.get_json(silent=True) or {}
    user_id  = get_current_user_id()
    pid      = data.get('product_id', '')
    rating   = float(data.get('rating', 3.0))
    itype    = data.get('interaction_type', 'view')
    if not pid:
        return jsonify({'error': 'product_id required'}), 400
    db_layer.save_rating(user_id, pid, rating, interaction_type=itype)
    db_layer.update_popularity(pid, delta=0.01)
    return jsonify({'status': 'ok'})


@app.route('/api/db/status')
def api_db_status():
    """Diagnostic endpoint — shows Firebase connection state."""
    return jsonify(db_layer.status())


# ─── SPEC ROUTES (Step 9) ─────────────────────────────────────────────────────

@app.route('/google-signin', methods=['POST'])
def google_signin():
    """Receive Firebase ID token from Google Sign-In popup."""
    data     = request.get_json(silent=True) or {}
    id_token = data.get('id_token', '')
    if not id_token:
        return jsonify({'error': 'id_token required'}), 400

    uid = db_layer.verify_id_token(id_token)
    if not uid:
        return jsonify({'error': 'Invalid or expired token'}), 401

    user_doc = db_layer.get_user(uid) or {}
    name     = user_doc.get('name') or data.get('display_name', 'User')
    email    = user_doc.get('email') or data.get('email', '')
    if not user_doc:
        db_layer.save_user(uid, name, email)

    session['user_id'] = uid
    session['user']    = {'id': uid, 'name': name, 'email': email}
    prefs = db_layer.get_preferences(uid)
    session['prefs'] = {
        'budget':     prefs.get('budget_max', 100),
        'categories': prefs.get('preferred_categories', []),
        'halal_only': prefs.get('halal_only', True),
        'stores':     prefs.get('fav_stores', []),
    }
    return jsonify({'uid': uid, 'redirect': url_for('dashboard')})


@app.route('/search')
@login_required
def search():
    """GET /search?q=keyword — renders products.html with search results."""
    q = request.args.get('q', '').strip()
    results = filter_products(q=q) if q else df.head(0)
    return render_template(
        'products.html',
        active_page='products',
        products=df_to_records(results.head(48)),
        total=len(results),
        page=1,
        pages=1,
        categories=CATEGORIES,
        stores=STORES,
        args=request.args,
        search_query=q,
    )


@app.route('/recommend', methods=['POST'])
@login_required
def recommend():
    """POST /recommend — returns JSON list of recommended products."""
    data       = request.get_json(silent=True) or {}
    user_id    = get_current_user_id()
    budget     = float(data.get('budget', 100))
    category   = data.get('category') or None
    halal_only = bool(data.get('halal_only', True))
    top_n      = int(data.get('top_n', 10))

    try:
        recs = hybrid_recommend(
            user_id=user_id, budget=budget, category=category,
            halal_only=halal_only, top_n=top_n,
            df=df, feat_mat=feat_mat, algo=algo,
            implicit=implicit, pop_scores=pop_scores, n_cats=n_cats,
        )
        return jsonify(df_to_records(recs))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/compare', methods=['GET', 'POST'])
@login_required
def compare():
    """GET /compare — render comparison page.
       POST /compare — receive {product_ids:[...]} and return JSON."""
    if request.method == 'POST':
        data     = request.get_json(silent=True) or {}
        pid_list = data.get('product_ids', [])[:4]
        results  = []
        for pid in pid_list:
            row = df[df['product_id'] == pid]
            if not row.empty:
                results.append(df_to_records(row)[0])
        return jsonify(results)

    # GET — keep existing comparison page behaviour
    ids_param        = request.args.get('ids', '')
    compare_products = []
    if ids_param:
        for pid in [p.strip() for p in ids_param.split(',') if p.strip()][:4]:
            row = df[df['product_id'] == pid]
            if not row.empty:
                compare_products.append(df_to_records(row)[0])
    return render_template(
        'comparison.html',
        active_page='comparison',
        compare_products=compare_products,
        categories=CATEGORIES,
        stores=STORES,
    )


@app.route('/favourites/add', methods=['POST'])
def favourites_add():
    """POST /favourites/add — save a product to favourites."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'guest': True, 'error': 'Login required'}), 401
    data    = request.get_json(silent=True) or {}
    pid     = data.get('product_id', '')
    user_id = get_current_user_id()
    if not pid:
        return jsonify({'success': False, 'error': 'product_id required'}), 400
    db_layer.save_favourite(user_id, pid)
    db_layer.save_rating(user_id, pid, 4.0, interaction_type='favourite')
    db_layer.update_popularity(pid, delta=0.05)
    return jsonify({'success': True})


@app.route('/favourites', methods=['GET'])
@login_required
def favourites():
    """GET /favourites — render products page showing saved favourites."""
    user_id  = get_current_user_id()
    fav_ids  = db_layer.get_favourites(user_id)
    fav_df   = df[df['product_id'].isin(fav_ids)]
    return render_template(
        'products.html',
        active_page='products',
        products=df_to_records(fav_df),
        total=len(fav_df),
        page=1,
        pages=1,
        categories=CATEGORIES,
        stores=STORES,
        args=request.args,
        page_title='My Favourites',
    )


@app.route('/favourites/remove', methods=['DELETE'])
def favourites_remove():
    """DELETE /favourites/remove — remove a product from favourites."""
    if 'user_id' not in session:
        return jsonify({'success': False, 'guest': True, 'error': 'Login required'}), 401
    data    = request.get_json(silent=True) or {}
    pid     = data.get('product_id', '')
    user_id = get_current_user_id()
    if not pid:
        return jsonify({'success': False, 'error': 'product_id required'}), 400
    db_layer.remove_favourite(user_id, pid)
    return jsonify({'success': True})


@app.route('/rate', methods=['POST'])
@login_required
def rate():
    """POST /rate — save a product rating."""
    data    = request.get_json(silent=True) or {}
    user_id = get_current_user_id()
    pid     = data.get('product_id', '')
    rating  = float(data.get('rating', 3.0))
    itype   = data.get('interaction_type', 'view')
    if not pid:
        return jsonify({'success': False, 'error': 'product_id required'}), 400
    db_layer.save_rating(user_id, pid, rating, interaction_type=itype)
    db_layer.update_popularity(pid, delta=0.01)
    return jsonify({'success': True})


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
