"""
database.py
HalalSaver MY — Firebase Integration Layer
FYP — CS230 | UiTM

Wraps Firebase Admin SDK (Firestore + Auth) with a graceful local fallback.

  FIREBASE_ENABLED = True   → reads/writes go to Firestore + Firebase Auth REST
  FIREBASE_ENABLED = False  → in-memory store + local CSV (demo / offline mode)

User-data collections stored in Firestore:
  users              — profile created at signup
  user_preferences   — budget, categories, halal flag, stores
  user_ratings       — ratings / interactions (for SVD++ training)
  user_favourites    — saved products

Product data (6,300 rows) is always served from the local cleaned_dataset.csv
for speed — Firestore is used for real-time price/halal updates when enabled.

Firestore Realtime DB path: /prices/{product_id} → {price, halal_status, ts}

--------------------------------------------------------------------
SETUP:
  1. Create a Firebase project at console.firebase.google.com
  2. Project Settings → Service accounts → Generate new private key
     → save as  serviceAccountKey.json  in the project root
  3. Project Settings → General → Web API Key
     → add to  .env  as  FIREBASE_WEB_API_KEY=...
  4. Enable Email/Password + Google in Firebase Console → Authentication
  5. Run  python firestore_seed.py  once to upload product data
--------------------------------------------------------------------
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

# ─── Load .env if present ────────────────────────────────────────────────────
_HERE = Path(__file__).parent  # always the SYSTEM/ folder, regardless of CWD

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=_HERE / ".env")
except ImportError:
    pass

FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "")
SERVICE_ACCOUNT_PATH = _HERE / "serviceAccountKey.json"

# ─── Try to initialize Firebase Admin SDK ────────────────────────────────────

FIREBASE_ENABLED = False
db  = None   # Firestore client
rdb = None   # Realtime Database client
_fb_auth = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth as fb_auth_module
    import firebase_admin.db as fb_rdb
    import json as _json

    _sa_json_str = os.getenv("FIREBASE_SERVICE_ACCOUNT", "")

    if _sa_json_str:
        # Cloud deployment: credentials provided as JSON env var
        _sa_dict    = _json.loads(_sa_json_str)
        _cred_source = credentials.Certificate(_sa_dict)
        _project_id  = _sa_dict.get("project_id", "")
        logger.info("[DB] Using FIREBASE_SERVICE_ACCOUNT env var")
    elif SERVICE_ACCOUNT_PATH.exists():
        # Local development: credentials file on disk
        _sa_dict    = _json.loads(SERVICE_ACCOUNT_PATH.read_text())
        _cred_source = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
        _project_id  = _sa_dict.get("project_id", "")
        logger.info("[DB] Using serviceAccountKey.json file")
    else:
        _cred_source = None
        _project_id  = ""

    if _cred_source is not None:
        if not firebase_admin._apps:
            _rdb_url = os.getenv(
                "FIREBASE_DATABASE_URL",
                f"https://{_project_id}-default-rtdb.firebaseio.com"
            )
            firebase_admin.initialize_app(_cred_source, {"databaseURL": _rdb_url})

        db       = firestore.client()
        rdb      = fb_rdb
        _fb_auth = fb_auth_module
        FIREBASE_ENABLED = True
        logger.info("[DB] Firebase initialised (Firestore + Auth + Realtime DB)")
    else:
        logger.warning(
            "[DB] No Firebase credentials found — running in local/demo mode. "
            "Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json."
        )
except Exception as _e:
    logger.warning(f"[DB] Firebase init failed: {_e} — running in local/demo mode.")


# ─── Local in-memory fallback stores ─────────────────────────────────────────

_LOCAL_USERS:       dict[str, dict] = {}   # keyed by email
_LOCAL_PREFS:       dict[str, dict] = {}   # keyed by user_id
_LOCAL_RATINGS:     list[dict]      = []
_LOCAL_FAVOURITES:  dict[str, list] = {}   # user_id → [product_id, ...]


# =============================================================================
# SECTION A — Firebase Auth helpers
# =============================================================================

def create_auth_user(email: str, password: str, display_name: str) -> tuple[str | None, str | None]:
    """
    Create a Firebase Auth user (email + password).

    Returns (uid, error_message).
    Falls back to a generated UID in local mode.
    """
    if FIREBASE_ENABLED and _fb_auth:
        try:
            user_record = _fb_auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
            )
            return user_record.uid, None
        except Exception as e:
            msg = str(e)
            if "EMAIL_EXISTS" in msg or "email-already-exists" in msg:
                return None, "An account with this email already exists."
            return None, f"Auth error: {msg}"
    else:
        # Local mode: generate deterministic UID from email
        uid = f"local_{abs(hash(email)) % 999999:06d}"
        return uid, None


def sign_in_with_email_password(email: str, password: str) -> tuple[str | None, str | None]:
    """
    Verify email + password via Firebase Auth REST API.

    Returns (uid, error_message).
    Falls back to local in-memory lookup when Firebase is not configured.

    NOTE: Firebase Admin SDK cannot verify passwords on the server side.
    We use the Identity Toolkit REST API instead, which requires
    FIREBASE_WEB_API_KEY in .env.
    """
    if FIREBASE_ENABLED and FIREBASE_WEB_API_KEY:
        import requests  # type: ignore
        url = (
            "https://identitytoolkit.googleapis.com/v1/accounts:"
            f"signInWithPassword?key={FIREBASE_WEB_API_KEY}"
        )
        try:
            resp = requests.post(
                url,
                json={"email": email, "password": password, "returnSecureToken": True},
                timeout=8,
            )
            data = resp.json()
            if "error" in data:
                code = data["error"].get("message", "UNKNOWN")
                if code in ("INVALID_PASSWORD", "EMAIL_NOT_FOUND", "INVALID_LOGIN_CREDENTIALS"):
                    return None, "Invalid email or password."
                return None, f"Login failed: {code}"
            return data["localId"], None  # localId = Firebase UID
        except Exception as e:
            logger.error(f"[DB] Firebase sign-in REST error: {e}")
            return None, "Authentication service unavailable. Please try again."

    # ── Local fallback ────────────────────────────────────────────────────────
    user = _LOCAL_USERS.get(email.lower())
    if user and user.get("password") == password:
        return user["id"], None
    return None, "Invalid email or password."


def verify_id_token(id_token: str) -> str | None:
    """
    Verify a Firebase ID token from the client-side JS SDK (Google / social login).
    Returns the uid or None on failure.
    """
    if FIREBASE_ENABLED and _fb_auth:
        try:
            decoded = _fb_auth.verify_id_token(id_token)
            return decoded["uid"]
        except Exception as e:
            logger.warning(f"[DB] Token verification failed: {e}")
    return None


# =============================================================================
# SECTION B — User Profile  (collection: users)
# =============================================================================

def save_user(user_id: str, name: str, email: str,
              halal_only: bool = True, budget_pref: float = 100.0) -> None:
    """Create or overwrite user document in Firestore (or local store)."""
    doc = {
        "user_id":     user_id,
        "name":        name,
        "email":       email,
        "halal_only":  halal_only,
        "budget_pref": budget_pref,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }
    if FIREBASE_ENABLED and db:
        try:
            db.collection("users").document(user_id).set(doc)
            return
        except Exception as e:
            logger.error(f"[DB] save_user Firestore error: {e}")
    # Local fallback — index by both user_id and email
    _LOCAL_USERS[email.lower()] = {**doc, "password": _LOCAL_USERS.get(email.lower(), {}).get("password", ""), "id": user_id}


def get_user(user_id: str) -> dict | None:
    """Return user document by user_id."""
    if FIREBASE_ENABLED and db:
        try:
            doc = db.collection("users").document(user_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"[DB] get_user error: {e}")
    # Local fallback — search by user_id
    for u in _LOCAL_USERS.values():
        if u.get("id") == user_id or u.get("user_id") == user_id:
            return u
    return None


def get_user_by_email(email: str) -> dict | None:
    """Return user document by email."""
    if FIREBASE_ENABLED and db:
        try:
            docs = (
                db.collection("users")
                .where("email", "==", email.lower())
                .limit(1)
                .stream()
            )
            for doc in docs:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"[DB] get_user_by_email error: {e}")
    return _LOCAL_USERS.get(email.lower())


# =============================================================================
# SECTION C — User Preferences  (collection: user_preferences)
# =============================================================================

def save_preferences(user_id: str, preferences_dict: dict) -> None:
    """Save or update user preferences."""
    doc = {
        "pref_id":              user_id,
        "user_id":              user_id,
        "budget_min":           float(preferences_dict.get("budget_min", 5)),
        "budget_max":           float(preferences_dict.get("budget", preferences_dict.get("budget_max", 100))),
        "preferred_categories": preferences_dict.get("categories", []),
        "halal_only":           bool(preferences_dict.get("halal_only", True)),
        "fav_stores":           preferences_dict.get("stores", []),
        "updated_at":           datetime.now(timezone.utc).isoformat(),
    }
    if FIREBASE_ENABLED and db:
        try:
            db.collection("user_preferences").document(user_id).set(doc, merge=True)
            return
        except Exception as e:
            logger.error(f"[DB] save_preferences error: {e}")
    _LOCAL_PREFS[user_id] = doc


def get_preferences(user_id: str) -> dict:
    """Return preferences dict for a user (defaults if not set)."""
    defaults = {
        "budget_max": 100.0,
        "budget_min": 5.0,
        "preferred_categories": [],
        "halal_only": True,
        "fav_stores": [],
    }
    if FIREBASE_ENABLED and db:
        try:
            doc = db.collection("user_preferences").document(user_id).get()
            if doc.exists:
                return {**defaults, **doc.to_dict()}
        except Exception as e:
            logger.error(f"[DB] get_preferences error: {e}")
    return {**defaults, **_LOCAL_PREFS.get(user_id, {})}


# =============================================================================
# SECTION D — Grocery Items  (collection: grocery_items)
# =============================================================================

def get_all_products() -> list[dict]:
    """
    Load all grocery items.
    NOTE: In production, products are served from Firestore.
    For performance, the Flask app loads them from local CSV at startup instead.
    This function is provided for the seeder and background tasks.
    """
    if FIREBASE_ENABLED and db:
        try:
            docs = db.collection("grocery_items").stream()
            return [d.to_dict() for d in docs]
        except Exception as e:
            logger.error(f"[DB] get_all_products error: {e}")
    return []   # Flask app uses local df directly


def get_products_by_store(store_name: str) -> list[dict]:
    """Return grocery items filtered by store from Firestore."""
    if FIREBASE_ENABLED and db:
        try:
            docs = (
                db.collection("grocery_items")
                .where("store", "==", store_name)
                .stream()
            )
            return [d.to_dict() for d in docs]
        except Exception as e:
            logger.error(f"[DB] get_products_by_store error: {e}")
    return []


# =============================================================================
# SECTION E — Realtime Price / Halal Updates  (Realtime Database)
# =============================================================================

def get_realtime_price(product_id: str) -> dict | None:
    """
    Fetch current price & halal status from Firebase Realtime Database.
    Path: /prices/{product_id}
    Returns dict with keys: price, halal_status, updated_at  — or None.
    """
    if FIREBASE_ENABLED and rdb:
        try:
            ref = rdb.reference(f"/prices/{product_id}")
            return ref.get()
        except Exception as e:
            logger.debug(f"[DB] get_realtime_price ({product_id}): {e}")
    return None


def update_realtime_price(product_id: str, price: float,
                          halal_status: str = "Certified") -> None:
    """Push a live price / halal update to Realtime Database."""
    if FIREBASE_ENABLED and rdb:
        try:
            rdb.reference(f"/prices/{product_id}").set({
                "price":        price,
                "halal_status": halal_status,
                "updated_at":   datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"[DB] update_realtime_price error: {e}")


# =============================================================================
# SECTION F — User Ratings  (collection: user_ratings)
# =============================================================================

def save_rating(user_id: str, product_id: str,
                rating: float, interaction_type: str = "view") -> None:
    """Save a user-item interaction/rating."""
    doc = {
        "user_id":          user_id,
        "product_id":       product_id,
        "rating":           float(max(1.0, min(5.0, rating))),
        "interaction_type": interaction_type,
        "timestamp":        datetime.now(timezone.utc).isoformat(),
    }
    if FIREBASE_ENABLED and db:
        try:
            db.collection("user_ratings").add(doc)
            return
        except Exception as e:
            logger.error(f"[DB] save_rating error: {e}")
    _LOCAL_RATINGS.append(doc)


def get_all_ratings() -> list[dict]:
    """Return all ratings (for SVD++ re-training)."""
    if FIREBASE_ENABLED and db:
        try:
            docs = db.collection("user_ratings").stream()
            return [d.to_dict() for d in docs]
        except Exception as e:
            logger.error(f"[DB] get_all_ratings error: {e}")
    return list(_LOCAL_RATINGS)


# =============================================================================
# SECTION G — Favourites  (collection: user_favourites)
# =============================================================================

def save_favourite(user_id: str, product_id: str) -> None:
    """Save a product to user favourites (idempotent)."""
    doc = {
        "user_id":    user_id,
        "product_id": product_id,
        "saved_at":   datetime.now(timezone.utc).isoformat(),
    }
    if FIREBASE_ENABLED and db:
        try:
            # Use composite key as document ID to ensure idempotency
            fav_id = f"{user_id}_{product_id}"
            db.collection("user_favourites").document(fav_id).set(doc, merge=True)
            return
        except Exception as e:
            logger.error(f"[DB] save_favourite error: {e}")
    favs = _LOCAL_FAVOURITES.setdefault(user_id, [])
    if product_id not in favs:
        favs.append(product_id)


def remove_favourite(user_id: str, product_id: str) -> None:
    """Remove a product from favourites."""
    if FIREBASE_ENABLED and db:
        try:
            fav_id = f"{user_id}_{product_id}"
            db.collection("user_favourites").document(fav_id).delete()
            return
        except Exception as e:
            logger.error(f"[DB] remove_favourite error: {e}")
    favs = _LOCAL_FAVOURITES.get(user_id, [])
    if product_id in favs:
        favs.remove(product_id)


def get_favourites(user_id: str) -> list[str]:
    """Return list of product_ids favourited by the user."""
    if FIREBASE_ENABLED and db:
        try:
            docs = (
                db.collection("user_favourites")
                .where("user_id", "==", user_id)
                .stream()
            )
            return [d.to_dict()["product_id"] for d in docs]
        except Exception as e:
            logger.error(f"[DB] get_favourites error: {e}")
    return list(_LOCAL_FAVOURITES.get(user_id, []))


# =============================================================================
# SECTION H — Popularity  (Realtime DB counter)
# =============================================================================

def update_popularity(product_id: str, delta: float = 0.01) -> None:
    """
    Increment the live popularity score for a product in Realtime DB.
    Path: /popularity/{product_id}
    """
    if FIREBASE_ENABLED and rdb:
        try:
            ref = rdb.reference(f"/popularity/{product_id}")
            current = ref.get() or 0.0
            ref.set(round(float(current) + delta, 6))
        except Exception as e:
            logger.debug(f"[DB] update_popularity ({product_id}): {e}")


# =============================================================================
# SECTION I — Status / diagnostics
# =============================================================================

def status() -> dict:
    """Return current database connection status."""
    return {
        "firebase_enabled": FIREBASE_ENABLED,
        "firestore":        db is not None,
        "realtime_db":      rdb is not None,
        "auth":             _fb_auth is not None,
        "web_api_key_set":  bool(FIREBASE_WEB_API_KEY),
        "local_users":      len(_LOCAL_USERS),
        "local_ratings":    len(_LOCAL_RATINGS),
    }
