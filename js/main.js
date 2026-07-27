/* ============================================================
   HalalSaver MY — Hybrid Grocery Recommender System
   Shared JavaScript — Components, Data, Filters, Utilities
   ============================================================ */

'use strict';

/* ============================================================
   FIREBASE CONFIGURATION
   Replace the placeholder values below with your actual Firebase
   project credentials from:
   https://console.firebase.google.com → Project Settings → General → Your apps
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDKfXTYZMkPDO6wNrZYOi-gwHwKALyZlK8",
  authDomain: "halalsaver-my.firebaseapp.com",
  projectId: "halalsaver-my",
  storageBucket: "halalsaver-my.firebasestorage.app",
  messagingSenderId: "1054041364345",
  appId: "1:1054041364345:web:4c1d31a10f123fddbc01a8",
  measurementId: "G-L6MQBC88VD"
};

/* Initialise Firebase (safe — catches double-init if page reloads) */
let _db   = null;
let _auth = null;
let _currentUser  = null;   // Firebase Auth user object
let _userProfile  = null;   // Firestore user profile { name, email, budget, preferences, … }

try {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  _db   = firebase.firestore();
  _auth = firebase.auth();
} catch (e) {
  console.warn('Firebase init skipped:', e.message);
}

/* Data-ready promise — resolves once GROCERY_DATA is populated from Firestore (or fallback) */
let _resolveDataReady;
window.hsDataReady = new Promise(r => { _resolveDataReady = r; });

/* Auth-ready promise — resolves once Firebase Auth reports its initial state.
   Firebase always fires onAuthStateChanged once on load (from cached credentials),
   so this resolves quickly even offline.                                          */
let _resolveAuthReady;
window.hsAuthReady = new Promise(r => { _resolveAuthReady = r; });

if (_auth) {
  _auth.onAuthStateChanged(async user => {
    /* If Firebase auto-restored a cached session but the user did not
       explicitly log in during this browser session, sign out immediately
       so they are always prompted for credentials on a fresh visit.      */
    if (user && sessionStorage.getItem('hs_active_session') !== '1') {
      await _auth.signOut();   /* triggers onAuthStateChanged again with user=null */
      return;
    }
    _currentUser = user;
    if (user && _db) {
      try {
        const doc = await _db.collection('users').doc(user.uid).get();
        _userProfile = doc.exists ? doc.data() : null;
      } catch (e) {
        _userProfile = null;
      }
    } else {
      _userProfile = null;
    }
    _resolveAuthReady({ user, profile: _userProfile });
  });
} else {
  /* Firebase not configured — resolve immediately so pages don't hang */
  _resolveAuthReady({ user: null, profile: null });
}

/* ── Logo SVG (shared across all pages) ── */
const LOGO_SVG = `
<svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="21" cy="21" r="21" fill="#059669"/>
  <path d="M10 14h3.5l3.5 10h9l2.5-7H16" stroke="white" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="17" cy="27" r="1.8" fill="white"/>
  <circle cx="24" cy="27" r="1.8" fill="white"/>
  <path d="M26 11 C31 10, 33 15.5, 28 17.5 C25.5 18.5, 23 16, 26 11Z" fill="#81c784"/>
  <path d="M26 11 L28 17.5" stroke="white" stroke-width=".8" stroke-linecap="round" opacity=".6"/>
</svg>`;

/* ── Logo HTML Component ── */
function createLogo(linkTo = 'index.html') {
  return `
  <a href="${linkTo}" class="brand-logo" style="text-decoration:none;">
    <div class="logo-mark">${LOGO_SVG}</div>
    <div class="logo-text-group">
      <span class="logo-name">HalalSaver</span>
      <span class="logo-badge">MY &bull; Recommender</span>
    </div>
  </a>`;
}

/* ── Footer Component ── */
function createFooter() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div>
      &copy; ${year} <strong>HalalSaver MY</strong> &mdash;
      Hybrid Grocery Recommender System for Budget-Friendly &amp; Halal-Conscious Shopping in Malaysia
    </div>
    <div class="footer-links">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Use</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
      <a href="#">Help Centre</a>
    </div>
  </footer>`;
}

/* ── Inject shared components ── */
function injectComponents({ logoTarget, footerTarget, logoLink } = {}) {
  if (logoTarget) {
    const el = document.getElementById(logoTarget);
    if (el) el.innerHTML = createLogo(logoLink || 'index.html');
  }
  if (footerTarget) {
    const el = document.getElementById(footerTarget);
    if (el) el.innerHTML = createFooter();
  }
}

/* ── Toast Notification ── */
function showToast(message, type = 'success', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Password Toggle ── */
function initPasswordToggle() {
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.closest('.input-group-custom').querySelector('input');
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      this.className = `toggle-pass fas ${isText ? 'fa-eye' : 'fa-eye-slash'}`;
    });
  });
}

/* ── Password Strength Indicator ── */
function initPasswordStrength() {
  const pwInput = document.getElementById('password');
  const bar = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  if (!pwInput || !bar) return;

  pwInput.addEventListener('input', function () {
    const val = this.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { pct: '0%',   color: 'transparent', text: '' },
      { pct: '25%',  color: '#e74c3c',     text: 'Weak' },
      { pct: '50%',  color: '#e67e22',     text: 'Fair' },
      { pct: '75%',  color: '#f1c40f',     text: 'Good' },
      { pct: '100%', color: '#059669',     text: 'Strong' },
    ];

    bar.style.width      = levels[score].pct;
    bar.style.background = levels[score].color;
    if (label) label.textContent = levels[score].text;
  });
}

/* ============================================================
   AUTH — localStorage-based session management
   Users stored in localStorage key: 'hs_users'
   Active session in sessionStorage key: 'hs_session'
   ============================================================ */

/* Seed a demo account so the system works out of the box */
/* ── Session helpers — now backed by Firebase Auth + Firestore ── */

/* Returns the active user profile object, or null if not logged in */
function getSession() {
  if (_userProfile) {
    return {
      name:        _userProfile.name        || '',
      email:       _userProfile.email       || (_currentUser ? _currentUser.email : ''),
      budget:      _userProfile.budget      || 200,
      preferences: _userProfile.preferences || {}
    };
  }
  /* Fallback: build minimal object from Firebase Auth user if profile not yet loaded */
  if (_currentUser) {
    return { name: _currentUser.displayName || _currentUser.email, email: _currentUser.email, budget: 200, preferences: {} };
  }
  return null;
}

/* Kept as no-ops — Firebase Auth handles persistence automatically */
function setSession()   { /* handled by Firebase Auth */ }
function clearSession() { /* handled by Firebase Auth signOut() */ }

/* ── Guest Mode ── */
function setGuestSession()  { sessionStorage.setItem('hs_guest', 'true'); }
function isGuest()          { return !_currentUser && sessionStorage.getItem('hs_guest') === 'true'; }
function clearGuestSession(){ sessionStorage.removeItem('hs_guest'); }


/* Guest banner for semi-protected pages */
function injectGuestBanner() {
  if (document.getElementById('guestBanner')) return;
  const banner = document.createElement('div');
  banner.id        = 'guestBanner';
  banner.className = 'guest-banner';
  banner.innerHTML = `
    <i class="fas fa-user-clock"></i>
    <span>You're browsing as <strong>Guest</strong> — some features are limited.</span>
    <div style="display:flex;gap:.5rem;flex-shrink:0;">
      <a href="login.html" class="guest-banner-btn">Login</a>
      <a href="register.html" class="guest-banner-btn primary">Register Free</a>
    </div>`;
  const main = document.querySelector('.page-main') || document.querySelector('main') || document.body;
  main.insertBefore(banner, main.firstChild);
}

/* Locked page shown to guests on fully-protected pages */
function showGuestLockedPage(pageLabel) {
  const main = document.querySelector('.page-main') || document.querySelector('main');
  if (!main) return;
  main.innerHTML = `
    <div class="guest-locked-wrap">
      <div class="guest-locked-card">
        <div class="guest-locked-icon"><i class="fas fa-lock"></i></div>
        <h2>Login Required</h2>
        <p>The <strong>${pageLabel || 'this page'}</strong> is only available to registered users.
           Create a free account or sign in to access personalised features.</p>
        <div class="guest-locked-actions">
          <a href="login.html" class="btn-primary-custom" style="text-decoration:none;display:inline-flex;align-items:center;gap:.5rem;">
            <i class="fas fa-arrow-right-to-bracket"></i> Sign In
          </a>
          <a href="register.html" class="btn-outline-custom" style="text-decoration:none;">
            <i class="fas fa-user-plus"></i> Create Account
          </a>
        </div>
        <div style="margin-top:1.2rem;">
          <a href="products.html" style="font-size:.8rem;color:var(--text-muted);">
            <i class="fas fa-arrow-left"></i> Continue browsing as Guest
          </a>
        </div>
      </div>
    </div>`;
}

/* Return true (logged in) | 'guest' (guest session) | false (no auth, redirected)
   Must be called AFTER hsAuthReady resolves so _currentUser is known.           */
function requireAuth() {
  if (_currentUser) return true;
  if (isGuest())    return 'guest';
  window.location.href = 'login.html';
  return false;
}

/* Inject real user name + initials into dashboard/products/comparison navbar */
function injectSessionUser() {
  const user = getSession();

  /* Guest mode: show Guest label in nav */
  if (!user && isGuest()) {
    const navAvatarImg = document.querySelector('.nav-avatar-img');
    if (navAvatarImg) navAvatarImg.src = 'https://ui-avatars.com/api/?name=G&background=9e9e9e&color=fff&rounded=true';
    const navAvatar = document.querySelector('.nav-avatar');
    const navName   = document.querySelector('.nav-user-name');
    if (navAvatar) navAvatar.textContent = 'G';
    if (navName)   navName.textContent   = 'Guest';
    return;
  }

  if (!user) return;
  const firstName = user.name.split(' ')[0];
  const initials  = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  /* dashboard avatar + dropdown */
  const avatar   = document.querySelector('.user-avatar');
  const dName    = document.querySelector('.d-name');
  const dEmail   = document.querySelector('.d-email');
  const heroName = document.getElementById('heroUserName');
  if (avatar)   avatar.textContent   = initials;
  if (dName)    dName.textContent    = user.name;
  if (dEmail)   dEmail.textContent   = user.email;
  if (heroName) heroName.textContent = firstName + '!';

  /* products/comparison nav avatar */
  const navAvatarImg = document.querySelector('.nav-avatar-img');
  if (navAvatarImg) navAvatarImg.src =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2d7a4f&color=fff&rounded=true`;
  const navAvatar = document.querySelector('.nav-avatar');
  const navName   = document.querySelector('.nav-user-name');
  if (navAvatar) navAvatar.textContent = initials;
  if (navName)   navName.textContent   = firstName;
}

/* Logout handler — signs out of Firebase Auth and clears guest flag */
function handleLogout() {
  clearGuestSession();
  sessionStorage.removeItem('hs_active_session');
  if (_auth) {
    _auth.signOut().finally(() => { window.location.href = 'login.html'; });
  } else {
    window.location.href = 'login.html';
  }
}

/* ── Login Form — Firebase Authentication ── */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  /* Already logged in → skip straight to dashboard */
  if (_currentUser) { window.location.href = 'dashboard.html'; return; }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const pass  = document.getElementById('pass').value;
    const btn   = form.querySelector('.btn-primary-custom');

    if (!email || !pass) { showToast('Please fill in all fields.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid email address.', 'error'); return;
    }

    if (!_auth) {
      showToast('Firebase is not configured. Check firebaseConfig in main.js.', 'error'); return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
    btn.disabled  = true;

    try {
      sessionStorage.setItem('hs_active_session', '1');  /* mark explicit login */
      await _auth.signInWithEmailAndPassword(email, pass);
      showToast('Welcome back! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
      const msgs = {
        'auth/user-not-found':    'No account found with this email.',
        'auth/wrong-password':    'Incorrect password. Please try again.',
        'auth/invalid-credential':'Invalid email or password.',
        'auth/invalid-email':     'Enter a valid email address.',
        'auth/user-disabled':     'This account has been disabled.',
        'auth/too-many-requests': 'Too many failed attempts. Try again later.',
      };
      showToast(msgs[err.code] || 'Sign in failed. Please try again.', 'error');
      btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In';
      btn.disabled  = false;
    }
  });
}

/* ── Registration Form — Firebase Authentication + Firestore ── */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim().toLowerCase();
    const phone   = (document.getElementById('phone') || {}).value || '';
    const budget  = parseFloat((document.getElementById('budget') || {}).value) || 200;
    const pass    = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPass').value;
    const terms   = document.getElementById('termsCheck').checked;
    const btn     = form.querySelector('.btn-register');

    /* Client-side validation */
    if (!name || !email || !pass || !confirm) {
      showToast('Please fill in all required fields.', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid email address.', 'error'); return;
    }
    if (pass.length < 8) {
      showToast('Password must be at least 8 characters.', 'error'); return;
    }
    if (pass !== confirm) {
      showToast('Passwords do not match.', 'error'); return;
    }
    if (!terms) {
      showToast('Please agree to the Terms of Service.', 'error'); return;
    }
    if (!_auth || !_db) {
      showToast('Firebase is not configured. Check firebaseConfig in main.js.', 'error'); return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…';
    btn.disabled  = true;

    try {
      /* 1. Create Firebase Auth account */
      const cred = await _auth.createUserWithEmailAndPassword(email, pass);

      /* 2. Set display name on Firebase Auth user */
      await cred.user.updateProfile({ displayName: name });

      /* 3. Save full profile to Firestore users/{uid} */
      const profile = {
        name, email, phone, budget,
        uid:     cred.user.uid,
        joined:  new Date().toISOString(),
        preferences: {
          halalOnly:    true,
          categories:   [],
          budget,
          hypermarkets: ['aeon', 'lotus', 'mydin']
        }
      };
      await _db.collection('users').doc(cred.user.uid).set(profile);

      /* Update local cache so getSession() works immediately */
      _currentUser = cred.user;
      _userProfile = profile;
      sessionStorage.setItem('hs_active_session', '1');  /* mark explicit login */

      showToast('Account created! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'preferences.html'; }, 900);

    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password':        'Password is too weak. Use at least 8 characters.',
        'auth/invalid-email':        'Enter a valid email address.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      showToast(msgs[err.code] || 'Registration failed. Please try again.', 'error');
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Free Account';
      btn.disabled  = false;
    }
  });
}

/* ============================================================
   GROCERY DATA — Simulated Real-World Data
   Source: Simulated based on Malaysian hypermarket product ranges
   (AEON, Lotus's, Mydin) as of 2024. For academic/FYP use only.

   Each item includes:
   - productId    : Unique product identifier
   - name         : Product name
   - brand        : Brand name
   - category     : Product category
   - weight       : Weight / size / quantity
   - store        : Primary store where it's most commonly found
   - discount     : Current promotion or discount (null if none)
   - halal        : Boolean halal status
   - halalStatus  : 'Certified' | 'Not Certified' | 'Unknown'
   - jakimNo      : JAKIM halal cert reference (null if uncertified)
   - prices       : Per-hypermarket prices in RM { aeon, lotus, mydin }
   - pricePerUnit : Price per unit/kg/litre at cheapest store
   - savings      : Savings % vs highest store price
   - contentScore : Content-Based Filtering score (cosine similarity)
   - collabScore  : Collaborative Filtering score (SVD++ item-based)
   - popularity   : Popularity score normalised 0–100
   - score        : Hybrid = 0.9 × max(CBF, CF) + 0.1 × popularity
   - imageUrl     : Placeholder image (emoji used in UI)
   ============================================================ */

let GROCERY_DATA = [
  /* ── CANNED GOODS ── */
  {
    productId:'PRD-001', id:1, name:'Ayam Brand Tuna Chunks in Brine', brand:'Ayam Brand',
    category:'Canned Goods', icon:'🐟', color:'#e3f2fd', weight:'185g',
    store:'AEON', discount:'Buy 3 Free 1',
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2021-01234',
    prices:{ aeon:4.50, lotus:4.20, mydin:3.90 }, pricePerUnit:'RM 2.11/100g',
    savings:'15%', contentScore:94, collabScore:91, popularity:88,
    imageUrl:'assets/images/tuna.png',
    desc:'Premium tuna chunks in brine, rich in protein and omega-3.'
  },
  {
    productId:'PRD-002', id:2, name:'Ayam Brand Sardines in Tomato Sauce', brand:'Ayam Brand',
    category:'Canned Goods', icon:'🐠', color:'#ffebee', weight:'155g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2021-01235',
    prices:{ aeon:3.80, lotus:3.60, mydin:3.40 }, pricePerUnit:'RM 2.19/100g',
    savings:'11%', contentScore:88, collabScore:84, popularity:85,
    imageUrl:'assets/images/sardines.png',
    desc:'Tender sardines in rich tomato sauce — great with rice or bread.'
  },
  {
    productId:'PRD-003', id:3, name:'Campbell\'s Mushroom Soup 305g', brand:'Campbell\'s',
    category:'Canned Goods', icon:'🥫', color:'#fff3e0', weight:'305g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:5.90, lotus:5.70, mydin:null }, pricePerUnit:'RM 1.87/100g',
    savings:'3%', contentScore:65, collabScore:62, popularity:72,
    imageUrl:'assets/images/campbell.png',
    desc:'Creamy condensed mushroom soup, great as a sauce or standalone.'
  },
  {
    productId:'PRD-004', id:4, name:'Adabi Coconut Milk 200ml', brand:'Adabi',
    category:'Canned Goods', icon:'🥥', color:'#f1f8e9', weight:'200ml',
    store:'Mydin', discount:'10% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-11111',
    prices:{ aeon:2.90, lotus:2.70, mydin:2.50 }, pricePerUnit:'RM 1.25/100ml',
    savings:'14%', contentScore:89, collabScore:86, popularity:90,
    imageUrl:'assets/images/coconutmilk.png',
    desc:'Thick, creamy coconut milk — essential for Malaysian curries and desserts.'
  },

  /* ── BAKERY ── */
  {
    productId:'PRD-005', id:5, name:'Gardenia Original Classic Bread', brand:'Gardenia',
    category:'Bakery', icon:'🍞', color:'#fff8e1', weight:'400g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-05678',
    prices:{ aeon:3.20, lotus:3.10, mydin:2.90 }, pricePerUnit:'RM 0.73/100g',
    savings:'10%', contentScore:89, collabScore:85, popularity:92,
    imageUrl:'assets/images/gardenia.png',
    desc:'Soft, fluffy white bread — a Malaysian household staple.'
  },
  {
    productId:'PRD-006', id:6, name:'Massimo Soft Banana Bread', brand:'Massimo',
    category:'Bakery', icon:'🍌', color:'#fff9c4', weight:'350g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-05999',
    prices:{ aeon:3.60, lotus:3.40, mydin:3.50 }, pricePerUnit:'RM 0.97/100g',
    savings:'6%', contentScore:82, collabScore:78, popularity:83,
    imageUrl:'assets/images/massimo.png',
    desc:'Soft and moist banana bread with natural banana flavour.'
  },
  {
    productId:'PRD-007', id:7, name:'High-5 Wholemeal Bread', brand:'High-5',
    category:'Bakery', icon:'🌿', color:'#d1fae5', weight:'400g',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-06100',
    prices:{ aeon:4.20, lotus:4.00, mydin:3.80 }, pricePerUnit:'RM 0.95/100g',
    savings:'10%', contentScore:85, collabScore:80, popularity:80,
    imageUrl:'assets/images/high5.png',
    desc:'Nutritious wholemeal bread — high in fibre, great for healthy eating.'
  },

  /* ── BEVERAGES ── */
  {
    productId:'PRD-008', id:8, name:'Milo 3-in-1 (30 sachets)', brand:'Nestlé Milo',
    category:'Beverages', icon:'☕', color:'#efebe9', weight:'570g (30×19g)',
    store:'Mydin', discount:'Free Mug',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-09876',
    prices:{ aeon:8.90, lotus:8.50, mydin:8.20 }, pricePerUnit:'RM 0.27/sachet',
    savings:'8%', contentScore:86, collabScore:88, popularity:95,
    imageUrl:'assets/images/milo.png',
    desc:'Chocolate malt energy drink, loved by Malaysians of all ages.'
  },
  {
    productId:'PRD-009', id:9, name:'100Plus Isotonic 24-can Pack', brand:'F&N',
    category:'Beverages', icon:'🥤', color:'#e0f7fa', weight:'24×325ml',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-33333',
    prices:{ aeon:24.90, lotus:23.50, mydin:22.80 }, pricePerUnit:'RM 0.29/100ml',
    savings:'9%', contentScore:76, collabScore:78, popularity:85,
    imageUrl:'assets/images/100plus.png',
    desc:'Refreshing isotonic drink to replenish electrolytes post-workout.'
  },
  {
    productId:'PRD-010', id:10, name:'Sunquick Orange Concentrate 840ml', brand:'Sunquick',
    category:'Beverages', icon:'🧃', color:'#fff9c4', weight:'840ml',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2020-45678',
    prices:{ aeon:12.90, lotus:12.50, mydin:11.90 }, pricePerUnit:'RM 1.42/100ml',
    savings:'9%', contentScore:82, collabScore:79, popularity:84,
    imageUrl:'assets/images/sunquick.png',
    desc:'Rich orange juice concentrate — just add water for a refreshing drink.'
  },
  {
    productId:'PRD-011', id:11, name:'Pokka Green Tea 500ml ×24', brand:'Pokka',
    category:'Beverages', icon:'🍵', color:'#f1f8e9', weight:'24×500ml',
    store:'AEON', discount:'5% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-44444',
    prices:{ aeon:28.80, lotus:27.60, mydin:null }, pricePerUnit:'RM 0.24/100ml',
    savings:'4%', contentScore:72, collabScore:70, popularity:76,
    imageUrl:'assets/images/pokka.png',
    desc:'Lightly sweetened green tea — refreshing and antioxidant-rich.'
  },
  {
    productId:'PRD-012', id:12, name:'Nescafé Classic Instant Coffee 200g', brand:'Nescafé',
    category:'Beverages', icon:'☕', color:'#d7ccc8', weight:'200g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-55555',
    prices:{ aeon:11.90, lotus:11.50, mydin:11.20 }, pricePerUnit:'RM 5.60/100g',
    savings:'6%', contentScore:80, collabScore:82, popularity:87,
    imageUrl:'assets/images/nescafe.png',
    desc:'Rich, full-bodied instant coffee for a perfect morning brew.'
  },

  /* ── STAPLES ── */
  {
    productId:'PRD-013', id:13, name:'Jasmine Rice 5kg', brand:'Cap Jati',
    category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'5kg',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-34567',
    prices:{ aeon:18.50, lotus:17.90, mydin:17.20 }, pricePerUnit:'RM 3.44/kg',
    savings:'12%', contentScore:95, collabScore:90, popularity:97,
    imageUrl:'assets/images/rice.png',
    desc:'Premium fragrant jasmine rice, perfect for everyday Malaysian cooking.'
  },
  {
    productId:'PRD-014', id:14, name:'Cap Sauh White Sugar 1kg', brand:'Cap Sauh',
    category:'Staples', icon:'🍬', color:'#fafafa', weight:'1kg',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2019-77777',
    prices:{ aeon:2.90, lotus:2.80, mydin:2.65 }, pricePerUnit:'RM 2.65/kg',
    savings:'9%', contentScore:90, collabScore:86, popularity:93,
    imageUrl:'assets/images/sugar.png',
    desc:'Pure white granulated sugar — an everyday kitchen essential.'
  },
  {
    productId:'PRD-015', id:15, name:'Cap Buruh Table Salt 500g', brand:'Cap Buruh',
    category:'Staples', icon:'🧂', color:'#eceff1', weight:'500g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2018-88888',
    prices:{ aeon:1.50, lotus:1.40, mydin:1.30 }, pricePerUnit:'RM 2.60/kg',
    savings:'13%', contentScore:88, collabScore:83, popularity:90,
    imageUrl:'assets/images/salt.png',
    desc:'Fine iodised table salt — essential for seasoning and preserving food.'
  },
  {
    productId:'PRD-016', id:16, name:'Tepung Gandum (All-Purpose Flour) 1kg', brand:'Bungasari',
    category:'Staples', icon:'🌾', color:'#fff8e1', weight:'1kg',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2020-99999',
    prices:{ aeon:2.40, lotus:2.30, mydin:2.15 }, pricePerUnit:'RM 2.15/kg',
    savings:'10%', contentScore:87, collabScore:82, popularity:88,
    imageUrl:'assets/images/flour.png',
    desc:'Premium all-purpose wheat flour — ideal for kuih, cakes, and cooking.'
  },

  /* ── DAIRY ── */
  {
    productId:'PRD-017', id:17, name:'Farm Fresh Full Cream Milk 1L', brand:'Farm Fresh',
    category:'Dairy', icon:'🥛', color:'#d1fae5', weight:'1L',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-JH-2021-78901',
    prices:{ aeon:6.30, lotus:6.10, mydin:5.90 }, pricePerUnit:'RM 5.90/L',
    savings:'6%', contentScore:85, collabScore:82, popularity:89,
    imageUrl:'assets/images/farmfresh.png',
    desc:'Fresh, full-cream milk from local Malaysian farms.'
  },
  {
    productId:'PRD-018', id:18, name:'Dutch Lady Full Cream UHT Milk 1L', brand:'Dutch Lady',
    category:'Dairy', icon:'🍼', color:'#e3f2fd', weight:'1L',
    store:'Mydin', discount:'Bundle 3 for RM17',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-12345',
    prices:{ aeon:6.50, lotus:6.20, mydin:5.80 }, pricePerUnit:'RM 5.80/L',
    savings:'11%', contentScore:84, collabScore:81, popularity:87,
    imageUrl:'assets/images/dutchlady.png',
    desc:'Creamy UHT full-cream milk — long shelf life, great taste.'
  },
  {
    productId:'PRD-019', id:19, name:'Cheddar Cheese Slices 10pc', brand:'Chesdale',
    category:'Dairy', icon:'🧀', color:'#fff3e0', weight:'200g',
    store:'Lotus\'s', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:8.90, lotus:8.50, mydin:null }, pricePerUnit:'RM 0.85/slice',
    savings:'5%', contentScore:62, collabScore:60, popularity:75,
    imageUrl:'assets/images/cheddar.png',
    desc:'Smooth, melty cheddar slices — perfect for sandwiches and burgers.'
  },
  {
    productId:'PRD-020', id:20, name:'Marigold Low-Fat Yogurt Strawberry 130g', brand:'Marigold',
    category:'Dairy', icon:'🍓', color:'#fce4ec', weight:'130g',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-22222',
    prices:{ aeon:3.50, lotus:3.30, mydin:3.20 }, pricePerUnit:'RM 2.46/100g',
    savings:'9%', contentScore:78, collabScore:75, popularity:80,
    imageUrl:'assets/images/yogurt.png',
    desc:'Creamy low-fat yogurt with real strawberry pieces — a healthy snack.'
  },

  /* ── INSTANT FOOD ── */
  {
    productId:'PRD-021', id:21, name:'Maggi Mee Curry (5-pack)', brand:'Maggi',
    category:'Instant Food', icon:'🍜', color:'#fff3e0', weight:'5×75g',
    store:'Mydin', discount:'Buy 2 Get 1',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2018-23456',
    prices:{ aeon:5.60, lotus:5.40, mydin:5.10 }, pricePerUnit:'RM 1.02/pack',
    savings:'9%', contentScore:80, collabScore:83, popularity:93,
    imageUrl:'assets/images/maggi.png',
    desc:'Iconic curry-flavoured instant noodles — quick and satisfying.'
  },
  {
    productId:'PRD-022', id:22, name:'Mamee Chef Asam Laksa (4-pack)', brand:'Mamee Chef',
    category:'Instant Food', icon:'🍲', color:'#ffccbc', weight:'4×90g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-24680',
    prices:{ aeon:5.80, lotus:5.60, mydin:5.30 }, pricePerUnit:'RM 1.33/pack',
    savings:'9%', contentScore:85, collabScore:83, popularity:88,
    imageUrl:'assets/images/mamee.png',
    desc:'Tangy asam laksa flavour instant noodles — a Penang-inspired classic.'
  },
  {
    productId:'PRD-023', id:23, name:'Cintan Curry Mi Goreng (5-pack)', brand:'Cintan',
    category:'Instant Food', icon:'🍝', color:'#fff9c4', weight:'5×80g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2019-13579',
    prices:{ aeon:4.80, lotus:4.60, mydin:4.40 }, pricePerUnit:'RM 0.88/pack',
    savings:'8%', contentScore:78, collabScore:76, popularity:82,
    imageUrl:'assets/images/cintan.png',
    desc:'Spicy fried noodle flavour — a favourite budget-friendly meal.'
  },
  {
    productId:'PRD-024', id:24, name:'Prima Taste Singapore Laksa Paste', brand:'Prima Taste',
    category:'Instant Food', icon:'🫕', color:'#ffe0b2', weight:'185g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Unknown', jakimNo:null,
    prices:{ aeon:7.90, lotus:null, mydin:null }, pricePerUnit:'RM 4.27/100g',
    savings:'0%', contentScore:60, collabScore:58, popularity:68,
    imageUrl:'assets/images/prima.png',
    desc:'Ready-made laksa paste for an authentic Singaporean-style laksa at home.'
  },

  /* ── BREAKFAST ── */
  {
    productId:'PRD-025', id:25, name:'Nestlé Cornflakes 500g', brand:'Nestlé',
    category:'Breakfast', icon:'🥣', color:'#fce4ec', weight:'500g',
    store:'Mydin', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:7.80, lotus:7.50, mydin:7.20 }, pricePerUnit:'RM 1.44/100g',
    savings:'8%', contentScore:68, collabScore:65, popularity:78,
    imageUrl:'assets/images/cornflakes.png',
    desc:'Crispy golden cornflakes — a nutritious and quick breakfast choice.'
  },
  {
    productId:'PRD-026', id:26, name:'Quaker Oats Original 800g', brand:'Quaker',
    category:'Breakfast', icon:'🌾', color:'#efebe9', weight:'800g',
    store:'Mydin', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:9.90, lotus:9.50, mydin:9.10 }, pricePerUnit:'RM 1.14/100g',
    savings:'8%', contentScore:75, collabScore:72, popularity:80,
    imageUrl:'assets/images/quaker.png',
    desc:'Wholesome rolled oats — a heart-healthy high-fibre breakfast option.'
  },
  {
    productId:'PRD-027', id:27, name:'Koko Krunch Cereal 330g', brand:'Nestlé',
    category:'Breakfast', icon:'🍫', color:'#d7ccc8', weight:'330g',
    store:'Lotus\'s', discount:'RM1 Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-66666',
    prices:{ aeon:8.50, lotus:8.10, mydin:7.90 }, pricePerUnit:'RM 2.39/100g',
    savings:'7%', contentScore:73, collabScore:70, popularity:82,
    imageUrl:'assets/images/kokokrunch.png',
    desc:'Chocolate flavoured cereal puffs — a kid-favourite breakfast treat.'
  },

  /* ── COOKING ── */
  {
    productId:'PRD-028', id:28, name:'Knife Vegetable Cooking Oil 2L', brand:'Knife',
    category:'Cooking', icon:'🫙', color:'#f9fbe7', weight:'2L',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-56789',
    prices:{ aeon:9.90, lotus:9.50, mydin:9.20 }, pricePerUnit:'RM 4.60/L',
    savings:'7%', contentScore:91, collabScore:88, popularity:90,
    imageUrl:'assets/images/cookingoil.png',
    desc:'High-quality vegetable cooking oil — cholesterol-free and versatile.'
  },
  {
    productId:'PRD-029', id:29, name:'Cap Burung Kicap Manis 340g', brand:'Cap Burung',
    category:'Cooking', icon:'🍶', color:'#4e342e', weight:'340g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-34321',
    prices:{ aeon:3.80, lotus:3.60, mydin:3.40 }, pricePerUnit:'RM 1.00/100g',
    savings:'11%', contentScore:88, collabScore:84, popularity:89,
    imageUrl:'assets/images/soysauce.png',
    desc:'Sweet soy sauce for marinating, stir-frying, and dipping.'
  },
  {
    productId:'PRD-030', id:30, name:'Prego Traditional Italian Pasta Sauce 680g', brand:'Prego',
    category:'Cooking', icon:'🍅', color:'#ffebee', weight:'680g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:9.90, lotus:9.50, mydin:null }, pricePerUnit:'RM 1.40/100g',
    savings:'4%', contentScore:58, collabScore:55, popularity:65,
    imageUrl:'assets/images/prego.png',
    desc:'Classic Italian-style pasta sauce with tomato and basil.'
  },
  {
    productId:'PRD-031', id:31, name:'Brahim\'s Rendang Paste 180g', brand:'Brahim\'s',
    category:'Cooking', icon:'🌶️', color:'#bf360c', weight:'180g',
    store:'Mydin', discount:'10% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-43210',
    prices:{ aeon:4.50, lotus:4.30, mydin:3.90 }, pricePerUnit:'RM 2.17/100g',
    savings:'13%', contentScore:90, collabScore:87, popularity:91,
    imageUrl:'assets/images/rendang.png',
    desc:'Authentic ready-made rendang paste — rich, fragrant, and spicy.'
  },

  /* ── SEASONING ── */
  {
    productId:'PRD-032', id:32, name:'Maggi Secukup Rasa 300g', brand:'Maggi',
    category:'Seasoning', icon:'🧂', color:'#fbe9e7', weight:'300g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2018-67890',
    prices:{ aeon:4.20, lotus:4.00, mydin:3.80 }, pricePerUnit:'RM 1.27/100g',
    savings:'10%', contentScore:87, collabScore:84, popularity:91,
    imageUrl:'assets/images/secukuprasa.png',
    desc:'All-in-one seasoning powder for authentic Malaysian flavours.'
  },
  {
    productId:'PRD-033', id:33, name:'Knorr Chicken Stock Cubes 20s', brand:'Knorr',
    category:'Seasoning', icon:'🍗', color:'#fff8e1', weight:'20×10g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-11223',
    prices:{ aeon:5.90, lotus:5.60, mydin:5.40 }, pricePerUnit:'RM 0.27/cube',
    savings:'8%', contentScore:85, collabScore:82, popularity:88,
    imageUrl:'assets/images/knorr.png',
    desc:'Rich chicken stock cubes to enhance soups, stews, and gravies.'
  },
  {
    productId:'PRD-034', id:34, name:'Adabi Cili Boh (Chili Paste) 500g', brand:'Adabi',
    category:'Seasoning', icon:'🌶️', color:'#ffcdd2', weight:'500g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-33445',
    prices:{ aeon:5.50, lotus:5.20, mydin:4.90 }, pricePerUnit:'RM 0.98/100g',
    savings:'11%', contentScore:89, collabScore:85, popularity:90,
    imageUrl:'assets/images/ciliboh.png',
    desc:'Freshly blended chili paste — the base of Malaysian sambal and curries.'
  },

  /* ── SNACKS ── */
  {
    productId:'PRD-035', id:35, name:"Julie's Love Letters 700g", brand:"Julie's",
    category:'Snacks', icon:'🍪', color:'#f3e5f5', weight:'700g',
    store:'Mydin', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:6.50, lotus:6.20, mydin:5.90 }, pricePerUnit:'RM 0.84/100g',
    savings:'9%', contentScore:69, collabScore:67, popularity:80,
    imageUrl:'assets/images/loveletters.png',
    desc:'Light, crispy egg roll biscuits — a beloved Malaysian snack.'
  },
  {
    productId:'PRD-036', id:36, name:'Mister Potato Crisps Original 75g', brand:'Mister Potato',
    category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'75g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-55667',
    prices:{ aeon:3.90, lotus:3.70, mydin:3.50 }, pricePerUnit:'RM 4.67/100g',
    savings:'10%', contentScore:75, collabScore:72, popularity:85,
    imageUrl:'assets/images/misterp.png',
    desc:'Crunchy potato crisps — an irresistible halal-certified snack.'
  },
  {
    productId:'PRD-037', id:37, name:'Mamee Monster Snack Chicken 25g ×20', brand:'Mamee',
    category:'Snacks', icon:'🍗', color:'#ffe0b2', weight:'20×25g',
    store:'Mydin', discount:'20% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-66778',
    prices:{ aeon:8.90, lotus:8.50, mydin:7.90 }, pricePerUnit:'RM 0.40/pack',
    savings:'11%', contentScore:72, collabScore:70, popularity:83,
    imageUrl:'assets/images/mamee_snack.png',
    desc:'Crunchy chicken-flavoured noodle snack — kids\' all-time favourite.'
  },
  {
    productId:'PRD-038', id:38, name:'Twisties Cheese 60g', brand:'Twisties',
    category:'Snacks', icon:'🧀', color:'#fff9c4', weight:'60g',
    store:'Lotus\'s', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:2.80, lotus:2.60, mydin:2.50 }, pricePerUnit:'RM 4.17/100g',
    savings:'11%', contentScore:63, collabScore:60, popularity:77,
    imageUrl:'assets/images/twisties.png',
    desc:'Light and crunchy cheese-flavoured corn puffs — a classic Malaysian snack.'
  },

  /* ── PERSONAL CARE ── */
  {
    productId:'PRD-039', id:39, name:'Colgate Total Advanced White Toothpaste 150g', brand:'Colgate',
    category:'Personal Care', icon:'🦷', color:'#d1fae5', weight:'150g',
    store:'Lotus\'s', discount:'RM 2 Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-77889',
    prices:{ aeon:9.90, lotus:8.90, mydin:9.50 }, pricePerUnit:'RM 5.93/100g',
    savings:'10%', contentScore:80, collabScore:77, popularity:86,
    imageUrl:'assets/images/colgate.png',
    desc:'Whitening toothpaste with 12-hour antibacterial protection.'
  },
  {
    productId:'PRD-040', id:40, name:'Dove Body Wash Original 550ml', brand:'Dove',
    category:'Personal Care', icon:'🛁', color:'#e3f2fd', weight:'550ml',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Unknown', jakimNo:null,
    prices:{ aeon:12.90, lotus:12.50, mydin:null }, pricePerUnit:'RM 2.27/100ml',
    savings:'3%', contentScore:62, collabScore:58, popularity:72,
    imageUrl:'assets/images/dove.png',
    desc:'Gentle moisturising body wash with ¼ moisturising cream.'
  },
  {
    productId:'PRD-041', id:41, name:'Rejoice 3-in-1 Shampoo 340ml', brand:'Rejoice',
    category:'Personal Care', icon:'💆', color:'#f3e5f5', weight:'340ml',
    store:'Mydin', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:7.90, lotus:7.50, mydin:7.20 }, pricePerUnit:'RM 2.12/100ml',
    savings:'9%', contentScore:65, collabScore:62, popularity:74,
    imageUrl:'assets/images/rejoice.png',
    desc:'All-in-one shampoo, conditioner, and moisturiser for smooth hair.'
  },

  /* ── HOUSEHOLD ── */
  {
    productId:'PRD-042', id:42, name:'Dynamo Liquid Detergent 2.7kg', brand:'Dynamo',
    category:'Household', icon:'🧺', color:'#e0f7fa', weight:'2.7kg',
    store:'Mydin', discount:'Bundle Deal',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-99001',
    prices:{ aeon:22.90, lotus:21.50, mydin:20.80 }, pricePerUnit:'RM 7.70/kg',
    savings:'9%', contentScore:82, collabScore:78, popularity:84,
    imageUrl:'assets/images/dynamo.png',
    desc:'Powerful liquid detergent that removes tough stains in one wash.'
  },
  {
    productId:'PRD-043', id:43, name:'Clorox Bleach 3.78L', brand:'Clorox',
    category:'Household', icon:'🧹', color:'#e8eaf6', weight:'3.78L',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:14.90, lotus:13.90, mydin:13.50 }, pricePerUnit:'RM 3.57/L',
    savings:'9%', contentScore:60, collabScore:57, popularity:70,
    imageUrl:'assets/images/clorox.png',
    desc:'Concentrated bleach for effective disinfection and whitening.'
  },
  {
    productId:'PRD-044', id:44, name:'Dettol Anti-Bacterial Handwash 250ml', brand:'Dettol',
    category:'Household', icon:'🧼', color:'#d1fae5', weight:'250ml',
    store:'Lotus\'s', discount:'Buy 2 RM9',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-00123',
    prices:{ aeon:6.50, lotus:5.90, mydin:6.20 }, pricePerUnit:'RM 2.36/100ml',
    savings:'9%', contentScore:83, collabScore:80, popularity:88,
    imageUrl:'assets/images/dettol.png',
    desc:'Anti-bacterial handwash that kills 99.9% of germs — fresh scent.'
  },

  /* ── FRESH PRODUCE ── */
  {
    productId:'PRD-045', id:45, name:'Local Red Onion 500g', brand:'Local',
    category:'Fresh Produce', icon:'🧅', color:'#fce4ec', weight:'500g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-11223',
    prices:{ aeon:2.90, lotus:2.70, mydin:2.50 }, pricePerUnit:'RM 5.00/kg',
    savings:'14%', contentScore:91, collabScore:87, popularity:92,
    imageUrl:'assets/images/onion.png',
    desc:'Fresh local red onions — a key base ingredient in Malaysian cuisine.'
  },
  {
    productId:'PRD-046', id:46, name:'Local Garlic 250g', brand:'Local',
    category:'Fresh Produce', icon:'🧄', color:'#fff8e1', weight:'250g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-11224',
    prices:{ aeon:2.50, lotus:2.30, mydin:2.10 }, pricePerUnit:'RM 8.40/kg',
    savings:'16%', contentScore:90, collabScore:86, popularity:91,
    imageUrl:'assets/images/garlic.png',
    desc:'Aromatic fresh garlic — essential for curries, stir-fries, and sambals.'
  },
  {
    productId:'PRD-047', id:47, name:'Choy Sum (Chinese Cabbage) 300g', brand:'Local',
    category:'Fresh Produce', icon:'🥬', color:'#d1fae5', weight:'300g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-11225',
    prices:{ aeon:2.80, lotus:2.60, mydin:2.40 }, pricePerUnit:'RM 8.00/kg',
    savings:'14%', contentScore:88, collabScore:83, popularity:87,
    imageUrl:'assets/images/choysum.png',
    desc:'Fresh leafy green vegetable — quick to cook and nutritious.'
  },
  {
    productId:'PRD-048', id:48, name:'Free-Range Chicken Eggs 10pcs', brand:'QL Farm',
    category:'Fresh Produce', icon:'🥚', color:'#fff9c4', weight:'10 eggs',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-11226',
    prices:{ aeon:7.90, lotus:7.50, mydin:7.20 }, pricePerUnit:'RM 0.72/egg',
    savings:'9%', contentScore:93, collabScore:89, popularity:95,
    imageUrl:'assets/images/eggs.png',
    desc:'Fresh Grade A free-range eggs — a daily Malaysian kitchen staple.'
  },

  /* ── FROZEN ── */
  {
    productId:'PRD-049', id:49, name:'Ramly Burger Patty Beef 360g', brand:'Ramly',
    category:'Frozen', icon:'🍔', color:'#efebe9', weight:'6×60g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-55001',
    prices:{ aeon:8.90, lotus:8.60, mydin:8.20 }, pricePerUnit:'RM 1.37/patty',
    savings:'8%', contentScore:85, collabScore:82, popularity:88,
    imageUrl:'assets/images/ramly.png',
    desc:'The iconic Malaysian halal beef burger patty — a street food essential.'
  },
  {
    productId:'PRD-050', id:50, name:'Mydin Frozen Prawn 500g', brand:'Mydin',
    category:'Frozen', icon:'🦐', color:'#ffccbc', weight:'500g',
    store:'Mydin', discount:'20% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-33001',
    prices:{ aeon:null, lotus:null, mydin:11.90 }, pricePerUnit:'RM 23.80/kg',
    savings:'20%', contentScore:80, collabScore:77, popularity:82,
    imageUrl:'assets/images/prawn.png',
    desc:'Fresh-frozen shell-on prawns — great for sambal, tom yam, and stir-fries.'
  },
  {
    productId:'PRD-051', id:51, name:'MFM Frozen Chicken Nuggets 400g', brand:'MFM',
    category:'Frozen', icon:'🍗', color:'#fff3e0', weight:'400g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-55002',
    prices:{ aeon:9.90, lotus:9.50, mydin:9.20 }, pricePerUnit:'RM 2.30/100g',
    savings:'7%', contentScore:78, collabScore:75, popularity:83,
    imageUrl:'assets/images/nuggets.png',
    desc:'Crispy chicken nuggets — a quick and easy halal-certified meal for kids.'
  },

  /* ── HEALTH & NUTRITION ── */
  {
    productId:'PRD-052', id:52, name:'Brands Essence of Chicken 70ml ×6', brand:'Brand\'s',
    category:'Health', icon:'💪', color:'#fce4ec', weight:'6×70ml',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-JH-2021-66001',
    prices:{ aeon:28.90, lotus:27.50, mydin:null }, pricePerUnit:'RM 4.58/bottle',
    savings:'5%', contentScore:74, collabScore:70, popularity:76,
    imageUrl:'assets/images/brands.png',
    desc:'Premium essence of chicken — supports concentration and mental clarity.'
  },
  {
    productId:'PRD-053', id:53, name:'Herbalife Formula 1 Shake Mix 550g', brand:'Herbalife',
    category:'Health', icon:'🥤', color:'#d1fae5', weight:'550g',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-77001',
    prices:{ aeon:145.00, lotus:null, mydin:null }, pricePerUnit:'RM 26.36/100g',
    savings:'0%', contentScore:65, collabScore:62, popularity:70,
    imageUrl:'assets/images/herbalife.png',
    desc:'Nutritional meal replacement shake — high protein, vitamins, and minerals.'
  },

  /* ── BABY & KIDS ── */
  {
    productId:'PRD-054', id:54, name:'Dumex Dugro Step 3 Growing Up Milk 1.2kg', brand:'Dumex',
    category:'Baby & Kids', icon:'👶', color:'#e3f2fd', weight:'1.2kg',
    store:'AEON', discount:'Free Tumbler',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-88001',
    prices:{ aeon:58.90, lotus:57.50, mydin:55.80 }, pricePerUnit:'RM 46.50/kg',
    savings:'5%', contentScore:77, collabScore:73, popularity:79,
    imageUrl:'assets/images/dumex.png',
    desc:'Step 3 growing-up milk formula enriched with DHA and essential nutrients.'
  },
  {
    productId:'PRD-055', id:55, name:'Heinz Baby Puree Apple & Mango 120g', brand:'Heinz',
    category:'Baby & Kids', icon:'🍎', color:'#fff3e0', weight:'120g',
    store:'Lotus\'s', discount:null,
    halal:false, halalStatus:'Unknown', jakimNo:null,
    prices:{ aeon:4.50, lotus:4.20, mydin:null }, pricePerUnit:'RM 3.50/100g',
    savings:'7%', contentScore:58, collabScore:55, popularity:65,
    imageUrl:'assets/images/heinz.png',
    desc:'Smooth apple and mango puree — a wholesome first food for babies.'
  },

  /* ── BEVERAGES (extended) ── */
  {
    productId:'PRD-056', id:56, name:'Lipton Yellow Label Tea 100 bags', brand:'Lipton',
    category:'Beverages', icon:'🍵', color:'#fff8e1', weight:'200g (100×2g)',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-56001',
    prices:{ aeon:11.90, lotus:11.50, mydin:10.90 }, pricePerUnit:'RM 0.11/bag',
    savings:'9%', contentScore:78, collabScore:75, popularity:82,
    imageUrl:'assets/images/lipton.png',
    desc:'Classic black tea bags with rich, smooth flavour — perfect for teh tarik at home.'
  },
  {
    productId:'PRD-057', id:57, name:"F&N Seasons Ice Lemon Tea 1.5L", brand:'F&N',
    category:'Beverages', icon:'🍋', color:'#fff9c4', weight:'1.5L',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-56002',
    prices:{ aeon:4.90, lotus:4.70, mydin:4.50 }, pricePerUnit:'RM 3.00/L',
    savings:'9%', contentScore:72, collabScore:70, popularity:80,
    imageUrl:'assets/images/seasons.png',
    desc:'Refreshing ice lemon tea — lightly sweetened with real lemon flavour.'
  },
  {
    productId:'PRD-058', id:58, name:'Spritzer Natural Mineral Water 600ml ×24', brand:'Spritzer',
    category:'Beverages', icon:'💧', color:'#e3f2fd', weight:'24×600ml',
    store:'Mydin', discount:'5% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2021-56003',
    prices:{ aeon:14.90, lotus:14.50, mydin:13.90 }, pricePerUnit:'RM 0.10/100ml',
    savings:'7%', contentScore:80, collabScore:77, popularity:85,
    imageUrl:'assets/images/spritzer.png',
    desc:'Pure, natural mineral water from Perak highlands — essential for daily hydration.'
  },
  {
    productId:'PRD-059', id:59, name:'OldTown White Coffee 3-in-1 (30 sachets)', brand:'OldTown',
    category:'Beverages', icon:'☕', color:'#d7ccc8', weight:'600g (30×20g)',
    store:'AEON', discount:'Free Mug',
    halal:true, halalStatus:'Certified', jakimNo:'MY-PNG-2020-56004',
    prices:{ aeon:19.90, lotus:19.50, mydin:18.90 }, pricePerUnit:'RM 0.63/sachet',
    savings:'5%', contentScore:83, collabScore:80, popularity:87,
    imageUrl:'assets/images/oldtown.png',
    desc:'Smooth, creamy white coffee from Ipoh — rich aroma with a velvety finish.'
  },

  /* ── STAPLES (extended) ── */
  {
    productId:'PRD-060', id:60, name:'Bernas Premium White Rice 10kg', brand:'Bernas',
    category:'Staples', icon:'🌾', color:'#f3f3f3', weight:'10kg',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-56005',
    prices:{ aeon:33.90, lotus:32.50, mydin:31.20 }, pricePerUnit:'RM 3.12/kg',
    savings:'8%', contentScore:92, collabScore:88, popularity:94,
    imageUrl:'assets/images/bernas.png',
    desc:'Government-subsidised premium white rice — trusted by Malaysian families for generations.'
  },
  {
    productId:'PRD-061', id:61, name:'Gula Perang (Brown Sugar) 500g', brand:'Cap Sauh',
    category:'Staples', icon:'🍯', color:'#ffe0b2', weight:'500g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2020-56006',
    prices:{ aeon:2.90, lotus:2.70, mydin:2.50 }, pricePerUnit:'RM 5.00/kg',
    savings:'14%', contentScore:84, collabScore:80, popularity:86,
    imageUrl:'assets/images/brownsugar.png',
    desc:'Unrefined brown sugar with natural molasses — great for Malaysian desserts and kuih.'
  },
  {
    productId:'PRD-062', id:62, name:'Planta Margarine 480g', brand:'Planta',
    category:'Staples', icon:'🧈', color:'#fff9c4', weight:'480g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-56007',
    prices:{ aeon:7.90, lotus:7.50, mydin:7.20 }, pricePerUnit:'RM 15.00/kg',
    savings:'9%', contentScore:81, collabScore:78, popularity:83,
    imageUrl:'assets/images/planta.png',
    desc:'Classic Malaysian margarine — versatile for baking, frying, and spreading.'
  },

  /* ── SNACKS (extended) ── */
  {
    productId:'PRD-063', id:63, name:'Pringles Original 147g', brand:'Pringles',
    category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'147g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:8.90, lotus:8.50, mydin:null }, pricePerUnit:'RM 5.78/100g',
    savings:'5%', contentScore:60, collabScore:58, popularity:82,
    imageUrl:'assets/images/pringles.png',
    desc:'Stackable, crunch potato crisps in original flavour — a globally loved snack.'
  },
  {
    productId:'PRD-064', id:64, name:'Cadbury Dairy Milk Chocolate 90g', brand:'Cadbury',
    category:'Snacks', icon:'🍫', color:'#4a148c', weight:'90g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-56008',
    prices:{ aeon:5.90, lotus:5.60, mydin:5.40 }, pricePerUnit:'RM 6.00/100g',
    savings:'8%', contentScore:71, collabScore:68, popularity:88,
    imageUrl:'assets/images/cadbury.png',
    desc:'Smooth, creamy milk chocolate made with full-cream dairy milk — a timeless treat.'
  },
  {
    productId:'PRD-065', id:65, name:"Chipsmore Original Cookies 163g", brand:"Chipsmore",
    category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'163g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2020-56009',
    prices:{ aeon:5.50, lotus:5.20, mydin:4.90 }, pricePerUnit:'RM 3.01/100g',
    savings:'11%', contentScore:73, collabScore:70, popularity:85,
    imageUrl:'assets/images/chipsmore.png',
    desc:'Soft, chunky chocolate chip cookies — a Malaysian school canteen favourite.'
  },
  {
    productId:'PRD-066', id:66, name:"Munchy's Muzic Crackers 216g", brand:"Munchy's",
    category:'Snacks', icon:'🫙', color:'#fafafa', weight:'216g',
    store:'Mydin', discount:'10% Off',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2019-56010',
    prices:{ aeon:4.90, lotus:4.70, mydin:4.30 }, pricePerUnit:'RM 1.99/100g',
    savings:'12%', contentScore:70, collabScore:68, popularity:80,
    imageUrl:'assets/images/muzic.png',
    desc:'Light, crispy cream crackers — great with butter, jam, or dips.'
  },

  /* ── DAIRY (extended) ── */
  {
    productId:'PRD-067', id:67, name:"F&N Evaporated Milk 385g (3-pack)", brand:'F&N',
    category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'3×385g',
    store:'Mydin', discount:'Bundle Deal',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-56011',
    prices:{ aeon:9.90, lotus:9.50, mydin:9.10 }, pricePerUnit:'RM 0.79/100ml',
    savings:'8%', contentScore:83, collabScore:80, popularity:88,
    imageUrl:'assets/images/fnmilk.png',
    desc:'Rich, creamy evaporated milk — essential for teh tarik, desserts, and cooking.'
  },
  {
    productId:'PRD-068', id:68, name:'Goodday Full Cream Milk 1L', brand:'Goodday',
    category:'Dairy', icon:'🍼', color:'#d1fae5', weight:'1L',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2021-56012',
    prices:{ aeon:5.90, lotus:5.70, mydin:5.50 }, pricePerUnit:'RM 5.50/L',
    savings:'7%', contentScore:82, collabScore:79, popularity:83,
    imageUrl:'assets/images/goodday.png',
    desc:'Fresh, full-cream UHT milk from Sabah — great for growing children.'
  },
  {
    productId:'PRD-069', id:69, name:'Nestlé Bliss Low Fat Yogurt 135g', brand:'Nestlé',
    category:'Dairy', icon:'🫙', color:'#fce4ec', weight:'135g',
    store:'AEON', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-56013',
    prices:{ aeon:3.20, lotus:3.00, mydin:null }, pricePerUnit:'RM 2.22/100g',
    savings:'6%', contentScore:75, collabScore:72, popularity:76,
    imageUrl:'assets/images/bliss.png',
    desc:'Smooth low-fat yogurt with live cultures — a light, healthy dairy snack.'
  },

  /* ── CANNED GOODS (extended) ── */
  {
    productId:'PRD-070', id:70, name:'Ayam Brand Baked Beans in Tomato Sauce 425g', brand:'Ayam Brand',
    category:'Canned Goods', icon:'🫘', color:'#ffccbc', weight:'425g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2021-56014',
    prices:{ aeon:3.90, lotus:3.70, mydin:3.50 }, pricePerUnit:'RM 0.82/100g',
    savings:'10%', contentScore:85, collabScore:82, popularity:84,
    imageUrl:'assets/images/bakedbeans.png',
    desc:'Hearty baked beans in rich tomato sauce — high protein, halal certified.'
  },
  {
    productId:'PRD-071', id:71, name:'Del Monte Whole Corn Kernels 418g', brand:'Del Monte',
    category:'Canned Goods', icon:'🌽', color:'#fff9c4', weight:'418g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Unknown', jakimNo:null,
    prices:{ aeon:3.80, lotus:3.60, mydin:null }, pricePerUnit:'RM 0.86/100g',
    savings:'5%', contentScore:62, collabScore:59, popularity:70,
    imageUrl:'assets/images/delmonte.png',
    desc:'Sweet, tender whole corn kernels — great for salads, soups, and stir-fries.'
  },
  {
    productId:'PRD-072', id:72, name:'Ayam Brand Green Peas 420g', brand:'Ayam Brand',
    category:'Canned Goods', icon:'🫛', color:'#d1fae5', weight:'420g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2021-56015',
    prices:{ aeon:3.50, lotus:3.30, mydin:3.10 }, pricePerUnit:'RM 0.74/100g',
    savings:'11%', contentScore:83, collabScore:79, popularity:78,
    imageUrl:'assets/images/greenpeas.png',
    desc:'Tender green peas in brine — nutritious addition to rice dishes, soups, and salads.'
  },

  /* ── COOKING (extended) ── */
  {
    productId:'PRD-073', id:73, name:"Lingham's Chilli Sauce 340g", brand:"Lingham's",
    category:'Cooking', icon:'🌶️', color:'#ffcdd2', weight:'340g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-PNG-2020-56016',
    prices:{ aeon:6.90, lotus:6.50, mydin:6.20 }, pricePerUnit:'RM 1.82/100g',
    savings:'10%', contentScore:84, collabScore:81, popularity:83,
    imageUrl:'assets/images/linghams.png',
    desc:'Malaysia\'s original sweet chilli sauce since 1908 — iconic tangy-sweet flavour.'
  },
  {
    productId:'PRD-074', id:74, name:'Lee Kum Kee Oyster Sauce 255g', brand:'Lee Kum Kee',
    category:'Cooking', icon:'🫙', color:'#4e342e', weight:'255g',
    store:'AEON', discount:null,
    halal:false, halalStatus:'Not Certified', jakimNo:null,
    prices:{ aeon:7.90, lotus:7.50, mydin:null }, pricePerUnit:'RM 2.94/100g',
    savings:'5%', contentScore:58, collabScore:55, popularity:73,
    imageUrl:'assets/images/oystersauce.png',
    desc:'Premium oyster sauce with rich umami flavour — a staple in Asian stir-fries.'
  },
  {
    productId:'PRD-075', id:75, name:"Habhal's Fish Curry Powder 250g", brand:"Habhal's",
    category:'Cooking', icon:'🐟', color:'#fff3e0', weight:'250g',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2020-56017',
    prices:{ aeon:5.50, lotus:5.20, mydin:4.90 }, pricePerUnit:'RM 1.96/100g',
    savings:'11%', contentScore:88, collabScore:85, popularity:86,
    imageUrl:'assets/images/currypowder.png',
    desc:'Authentic Kedah-style fish curry powder blend — fragrant and perfectly spiced.'
  },

  /* ── FRESH PRODUCE (extended) ── */
  {
    productId:'PRD-076', id:76, name:'Pisang Berangan (Banana) 1kg', brand:'Local',
    category:'Fresh Produce', icon:'🍌', color:'#fff9c4', weight:'~1kg',
    store:'Mydin', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:null,
    prices:{ aeon:4.50, lotus:4.20, mydin:3.90 }, pricePerUnit:'RM 3.90/kg',
    savings:'13%', contentScore:86, collabScore:82, popularity:90,
    imageUrl:'assets/images/banana.png',
    desc:'Sweet, fragrant Berangan bananas — Malaysia\'s most popular everyday fruit.'
  },
  {
    productId:'PRD-077', id:77, name:'Local Tomatoes 500g', brand:'Local',
    category:'Fresh Produce', icon:'🍅', color:'#ffcdd2', weight:'500g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:null,
    prices:{ aeon:2.90, lotus:2.70, mydin:2.50 }, pricePerUnit:'RM 5.00/kg',
    savings:'14%', contentScore:87, collabScore:83, popularity:88,
    imageUrl:'assets/images/tomato.png',
    desc:'Fresh, ripe local tomatoes — essential for sambal, gravies, and salads.'
  },
  {
    productId:'PRD-078', id:78, name:'Local Carrots 500g', brand:'Local',
    category:'Fresh Produce', icon:'🥕', color:'#ffe0b2', weight:'500g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:null,
    prices:{ aeon:2.50, lotus:2.30, mydin:2.10 }, pricePerUnit:'RM 4.20/kg',
    savings:'16%', contentScore:85, collabScore:81, popularity:84,
    imageUrl:'assets/images/carrot.png',
    desc:'Crisp, sweet orange carrots — great for soups, stir-fries, and juicing.'
  },

  /* ── FROZEN (extended) ── */
  {
    productId:'PRD-079', id:79, name:'Ayamas Crispy Chicken Strips 400g', brand:'Ayamas',
    category:'Frozen', icon:'🍗', color:'#fff3e0', weight:'400g',
    store:'Mydin', discount:'Buy 2 Save RM3',
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-56018',
    prices:{ aeon:11.90, lotus:11.50, mydin:10.90 }, pricePerUnit:'RM 2.73/100g',
    savings:'8%', contentScore:81, collabScore:78, popularity:85,
    imageUrl:'assets/images/ayamas.png',
    desc:'Crispy, golden chicken strips — quick-fry for a satisfying halal snack or meal.'
  },
  {
    productId:'PRD-080', id:80, name:'Gardenia Frozen Roti Canai 5pcs', brand:'Gardenia',
    category:'Frozen', icon:'🫓', color:'#fafafa', weight:'5×120g',
    store:'Lotus\'s', discount:null,
    halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2021-56019',
    prices:{ aeon:5.90, lotus:5.60, mydin:5.30 }, pricePerUnit:'RM 1.06/pc',
    savings:'10%', contentScore:83, collabScore:80, popularity:86,
    imageUrl:'assets/images/roticanai.png',
    desc:'Authentic Malaysian frozen roti canai — just pan-fry for a warm, flaky treat.'
  },

  /* ── Extended dataset: 400-product expansion ── */
  /* BEVERAGES ×21 (PRD-081 to PRD-101) */
  { productId:'PRD-081', id:81, name:"Yeo's Chrysanthemum Tea 250ml", brand:"Yeo's", category:'Beverages', icon:'🍵', color:'#d1fae5', weight:'250ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81001', prices:{aeon:1.90, lotus:1.80, mydin:1.70}, pricePerUnit:'RM 1.70/unit', savings:'11%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Light and refreshing chrysanthemum tea, naturally sweetened.' },
  { productId:'PRD-082', id:82, name:"Yeo's Barley Water 250ml", brand:"Yeo's", category:'Beverages', icon:'🍵', color:'#d1fae5', weight:'250ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81001', prices:{aeon:1.90, lotus:1.80, mydin:1.70}, pricePerUnit:'RM 1.70/unit', savings:'11%', contentScore:75, collabScore:73, popularity:80, imageUrl:'', desc:'Smooth barley water, a Malaysian favourite for detox and cooling.' },
  { productId:'PRD-083', id:83, name:"Yeo's Soya Bean Milk 250ml", brand:"Yeo's", category:'Beverages', icon:'🥛', color:'#d1fae5', weight:'250ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81001', prices:{aeon:2.00, lotus:1.90, mydin:1.80}, pricePerUnit:'RM 1.80/unit', savings:'10%', contentScore:78, collabScore:76, popularity:83, imageUrl:'', desc:'Smooth soya bean milk rich in plant protein, JAKIM-certified.' },
  { productId:'PRD-084', id:84, name:'F&N Seasons Ice Lemon Tea 500ml', brand:'F&N Seasons', category:'Beverages', icon:'🍋', color:'#fff9c4', weight:'500ml', store:"Lotus's", discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-81002', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 2.50/unit', savings:'14%', contentScore:77, collabScore:75, popularity:85, imageUrl:'', desc:'Crisp ice lemon tea with real lemon flavour, zero preservatives.' },
  { productId:'PRD-085', id:85, name:'F&N Seasons Green Tea 500ml', brand:'F&N Seasons', category:'Beverages', icon:'🍵', color:'#f1f8e9', weight:'500ml', store:"Lotus's", discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-81002', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 2.50/unit', savings:'14%', contentScore:76, collabScore:74, popularity:83, imageUrl:'', desc:'Light Japanese-style green tea, no added artificial colours.' },
  { productId:'PRD-086', id:86, name:'F&N Sparkling Orange 325ml', brand:'F&N', category:'Beverages', icon:'🧃', color:'#fff9c4', weight:'325ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-81002', prices:{aeon:2.20, lotus:2.00, mydin:1.90}, pricePerUnit:'RM 1.90/unit', savings:'14%', contentScore:72, collabScore:70, popularity:78, imageUrl:'', desc:'Fizzy orange carbonated drink, classic F&N taste.' },
  { productId:'PRD-087', id:87, name:'Tropicana Twister Orange 1.5L', brand:'Tropicana', category:'Beverages', icon:'🍊', color:'#fff9c4', weight:'1.5L', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81003', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 4.60/L', savings:'8%', contentScore:79, collabScore:77, popularity:84, imageUrl:'', desc:'Refreshing orange juice drink with pulp, great for the whole family.' },
  { productId:'PRD-088', id:88, name:'Vitagen Original 125ml×5', brand:'Vitagen', category:'Beverages', icon:'🥛', color:'#e3f2fd', weight:'5×125ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-81004', prices:{aeon:5.00, lotus:4.80, mydin:4.50}, pricePerUnit:'RM 0.90/bottle', savings:'10%', contentScore:82, collabScore:80, popularity:88, imageUrl:'', desc:'Malaysia\'s favourite cultured milk drink with live active cultures.' },
  { productId:'PRD-089', id:89, name:'Vitagen Strawberry 125ml×5', brand:'Vitagen', category:'Beverages', icon:'🍓', color:'#fce4ec', weight:'5×125ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-81004', prices:{aeon:5.00, lotus:4.80, mydin:4.50}, pricePerUnit:'RM 0.90/bottle', savings:'10%', contentScore:81, collabScore:79, popularity:87, imageUrl:'', desc:'Strawberry-flavoured cultured milk drink, kids love it.' },
  { productId:'PRD-090', id:90, name:'Spritzer Mineral Water 600ml', brand:'Spritzer', category:'Beverages', icon:'💧', color:'#e3f2fd', weight:'600ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-81005', prices:{aeon:1.20, lotus:1.10, mydin:0.90}, pricePerUnit:'RM 0.90/unit', savings:'25%', contentScore:70, collabScore:68, popularity:92, imageUrl:'', desc:'Pure natural mineral water from Taiping\'s pristine springs.' },
  { productId:'PRD-091', id:91, name:'Spritzer Sparkling Water 325ml', brand:'Spritzer', category:'Beverages', icon:'💧', color:'#e3f2fd', weight:'325ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-81005', prices:{aeon:2.50, lotus:2.30, mydin:null}, pricePerUnit:'RM 2.30/unit', savings:'8%', contentScore:71, collabScore:69, popularity:75, imageUrl:'', desc:'Natural sparkling mineral water with fine bubbles, no added sugar.' },
  { productId:'PRD-092', id:92, name:'Cactus Mineral Water 1.5L', brand:'Cactus', category:'Beverages', icon:'💧', color:'#e3f2fd', weight:'1.5L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-81006', prices:{aeon:1.90, lotus:1.80, mydin:1.50}, pricePerUnit:'RM 1.00/L', savings:'21%', contentScore:69, collabScore:67, popularity:88, imageUrl:'', desc:'Affordable natural mineral water, ideal for daily hydration.' },
  { productId:'PRD-093', id:93, name:'Marigold Peel Fresh Orange 1L', brand:'Marigold', category:'Beverages', icon:'🍊', color:'#fff9c4', weight:'1L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81007', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 6.20/L', savings:'10%', contentScore:80, collabScore:78, popularity:82, imageUrl:'', desc:'100% chilled fresh orange juice, no added sugar or preservatives.' },
  { productId:'PRD-094', id:94, name:'Marigold Peel Fresh Apple 1L', brand:'Marigold', category:'Beverages', icon:'🍎', color:'#f1f8e9', weight:'1L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81007', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 6.20/L', savings:'10%', contentScore:79, collabScore:77, popularity:80, imageUrl:'', desc:'Fresh chilled apple juice, naturally sweet and refreshing.' },
  { productId:'PRD-095', id:95, name:'Ribena Blackcurrant Cordial 1L', brand:'Ribena', category:'Beverages', icon:'🍇', color:'#f3e5f5', weight:'1L', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-81008', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 12.90/L', savings:'7%', contentScore:78, collabScore:76, popularity:79, imageUrl:'', desc:'Rich blackcurrant cordial, high in Vitamin C. Just dilute and serve.' },
  { productId:'PRD-096', id:96, name:'Goodday Full Cream Milk 1L', brand:'Goodday', category:'Beverages', icon:'🥛', color:'#e3f2fd', weight:'1L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81009', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 6.90/L', savings:'8%', contentScore:82, collabScore:80, popularity:85, imageUrl:'', desc:'Pasteurised full cream fresh milk, farm-to-table quality.' },
  { productId:'PRD-097', id:97, name:'Goodday Chocolate Milk 200ml', brand:'Goodday', category:'Beverages', icon:'🍫', color:'#4e342e', weight:'200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81009', prices:{aeon:2.20, lotus:2.10, mydin:1.99}, pricePerUnit:'RM 1.99/unit', savings:'10%', contentScore:79, collabScore:77, popularity:86, imageUrl:'', desc:'Creamy chocolate milk for kids and adults, calcium-enriched.' },
  { productId:'PRD-098', id:98, name:'Pokka Lemon Tea 300ml', brand:'Pokka', category:'Beverages', icon:'🍋', color:'#fff9c4', weight:'300ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81010', prices:{aeon:3.50, lotus:3.30, mydin:3.10}, pricePerUnit:'RM 3.10/unit', savings:'11%', contentScore:75, collabScore:73, popularity:81, imageUrl:'', desc:'Smooth Japanese-style lemon tea, lightly sweetened.' },
  { productId:'PRD-099', id:99, name:'Teh Tarik Kaw Canned 325ml', brand:'Ah Huat', category:'Beverages', icon:'☕', color:'#d7ccc8', weight:'325ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81011', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 2.50/unit', savings:'14%', contentScore:80, collabScore:78, popularity:87, imageUrl:'', desc:'Authentic Malaysian teh tarik in a can, thick and aromatic.' },
  { productId:'PRD-100', id:100, name:'Milo RTD 200ml', brand:'Nestlé Milo', category:'Beverages', icon:'☕', color:'#4e342e', weight:'200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81012', prices:{aeon:2.50, lotus:2.30, mydin:2.20}, pricePerUnit:'RM 2.20/unit', savings:'12%', contentScore:85, collabScore:83, popularity:92, imageUrl:'', desc:'Ready-to-drink Milo, packed with malt, milk and cocoa goodness.' },
  { productId:'PRD-101', id:101, name:'Old Town White Coffee 3in1 30g×15', brand:'Old Town', category:'Beverages', icon:'☕', color:'#d7ccc8', weight:'450g (15×30g)', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-81013', prices:{aeon:14.90, lotus:13.90, mydin:12.90}, pricePerUnit:'RM 0.86/sachet', savings:'13%', contentScore:83, collabScore:81, popularity:88, imageUrl:'', desc:'Iconic Malaysian white coffee blend, creamy and aromatic.' },

  /* SNACKS ×22 (PRD-102 to PRD-123) */
  { productId:'PRD-102', id:102, name:"Julie's Love Letters 700g", brand:"Julie's", category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'700g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-82001', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 11.90/700g', savings:'8%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Classic crispy egg roll biscuits, perfect with coffee or tea.' },
  { productId:'PRD-103', id:103, name:"Julie's Peanut Butter Sandwich 180g", brand:"Julie's", category:'Snacks', icon:'🥜', color:'#fff8e1', weight:'180g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-82001', prices:{aeon:4.90, lotus:4.70, mydin:4.50}, pricePerUnit:'RM 4.50/180g', savings:'8%', contentScore:77, collabScore:75, popularity:80, imageUrl:'', desc:'Crispy sandwich biscuits filled with smooth peanut butter.' },
  { productId:'PRD-104', id:104, name:'Hup Seng Ping Pong Crackers 428g', brand:'Hup Seng', category:'Snacks', icon:'🍘', color:'#fff8e1', weight:'428g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-82002', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 5.90/428g', savings:'15%', contentScore:74, collabScore:72, popularity:78, imageUrl:'', desc:'Classic Malaysian salted crackers, crunchy and light.' },
  { productId:'PRD-105', id:105, name:'Hup Seng Cream Crackers 428g', brand:'Hup Seng', category:'Snacks', icon:'🍘', color:'#fff8e1', weight:'428g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-82002', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 5.90/428g', savings:'15%', contentScore:75, collabScore:73, popularity:82, imageUrl:'', desc:'Crispy cream crackers, great with butter, kaya or cheese.' },
  { productId:'PRD-106', id:106, name:'Munchy\'s Munchys Biskut Marie 300g', brand:"Munchy's", category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82003', prices:{aeon:4.50, lotus:4.20, mydin:3.90}, pricePerUnit:'RM 3.90/300g', savings:'13%', contentScore:73, collabScore:71, popularity:79, imageUrl:'', desc:'Soft marie biscuits, light and mildly sweet, JAKIM halal certified.' },
  { productId:'PRD-107', id:107, name:"Munchy's Muzic Wafer Choc 180g", brand:"Munchy's", category:'Snacks', icon:'🍫', color:'#4a148c', weight:'180g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82003', prices:{aeon:4.90, lotus:4.70, mydin:4.50}, pricePerUnit:'RM 4.50/180g', savings:'8%', contentScore:76, collabScore:74, popularity:81, imageUrl:'', desc:'Crispy chocolate wafer fingers, great for sharing.' },
  { productId:'PRD-108', id:108, name:'Khong Guan Assorted Biscuits 650g', brand:'Khong Guan', category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'650g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-82004', prices:{aeon:15.90, lotus:15.50, mydin:14.90}, pricePerUnit:'RM 14.90/650g', savings:'6%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Assorted biscuit tin — a Malaysian festive classic since 1947.' },
  { productId:'PRD-109', id:109, name:'Twisties Chicken 60g', brand:'Twisties', category:'Snacks', icon:'🍗', color:'#fff3e0', weight:'60g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82005', prices:{aeon:2.80, lotus:2.60, mydin:2.40}, pricePerUnit:'RM 2.40/unit', savings:'14%', contentScore:75, collabScore:73, popularity:84, imageUrl:'', desc:'Classic crunchy chicken-flavoured corn twists, a Malaysian icon.' },
  { productId:'PRD-110', id:110, name:'Twisties Cheese 60g', brand:'Twisties', category:'Snacks', icon:'🧀', color:'#fff9c4', weight:'60g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82005', prices:{aeon:2.80, lotus:2.60, mydin:2.40}, pricePerUnit:'RM 2.40/unit', savings:'14%', contentScore:75, collabScore:73, popularity:83, imageUrl:'', desc:'Crunchy cheese-flavoured corn snack, kids and adults love it.' },
  { productId:'PRD-111', id:111, name:'Mister Potato Sour Cream & Onion 75g', brand:'Mister Potato', category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'75g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82006', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Thin and crispy potato chips with sour cream & onion seasoning.' },
  { productId:'PRD-112', id:112, name:'Mister Potato Original 75g', brand:'Mister Potato', category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'75g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82006', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:75, collabScore:73, popularity:81, imageUrl:'', desc:'Original lightly salted potato chips, thin and crispy.' },
  { productId:'PRD-113', id:113, name:'Mamee Monster Noodle Snack BBQ 25g×5', brand:'Mamee', category:'Snacks', icon:'🍜', color:'#ffe0b2', weight:'5×25g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-MLK-2022-82007', prices:{aeon:3.50, lotus:3.30, mydin:2.90}, pricePerUnit:'RM 0.58/pack', savings:'17%', contentScore:74, collabScore:72, popularity:85, imageUrl:'', desc:'Crunchy BBQ flavoured mini noodle snack, a childhood favourite.' },
  { productId:'PRD-114', id:114, name:'Chipsmore Original 163g', brand:'Chipsmore', category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'163g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82008', prices:{aeon:5.90, lotus:5.70, mydin:5.50}, pricePerUnit:'RM 5.50/163g', savings:'7%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Soft and chunky chocolate chip cookies, baked not fried.' },
  { productId:'PRD-115', id:115, name:'Chipsmore Double Chocolate 163g', brand:'Chipsmore', category:'Snacks', icon:'🍫', color:'#4a148c', weight:'163g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82008', prices:{aeon:5.90, lotus:5.70, mydin:5.50}, pricePerUnit:'RM 5.50/163g', savings:'7%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Soft double chocolate chip cookies packed with cocoa flavour.' },
  { productId:'PRD-116', id:116, name:'Jack n Jill Roller Coaster 80g', brand:'Jack n Jill', category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82009', prices:{aeon:3.20, lotus:3.00, mydin:2.80}, pricePerUnit:'RM 2.80/unit', savings:'13%', contentScore:72, collabScore:70, popularity:79, imageUrl:'', desc:'Fun curly potato ring snack, lightly seasoned.' },
  { productId:'PRD-117', id:117, name:'Rota Cheeselets 65g', brand:'Rota', category:'Snacks', icon:'🧀', color:'#fff9c4', weight:'65g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-82010', prices:{aeon:3.00, lotus:2.80, mydin:2.60}, pricePerUnit:'RM 2.60/unit', savings:'13%', contentScore:71, collabScore:69, popularity:76, imageUrl:'', desc:'Small round cheese-flavoured biscuits, addictively crunchy.' },
  { productId:'PRD-118', id:118, name:'Cadbury Chocolate Digestives 400g', brand:'Cadbury', category:'Snacks', icon:'🍫', color:'#4a148c', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-82011', prices:{aeon:13.90, lotus:13.50, mydin:null}, pricePerUnit:'RM 13.50/400g', savings:'3%', contentScore:80, collabScore:78, popularity:83, imageUrl:'', desc:'Crunchy digestive biscuits half-dipped in creamy Cadbury chocolate.' },
  { productId:'PRD-119', id:119, name:'Tiger Biscuit Original 120g', brand:'Tiger', category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'120g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-82012', prices:{aeon:2.50, lotus:2.30, mydin:2.00}, pricePerUnit:'RM 2.00/unit', savings:'20%', contentScore:70, collabScore:68, popularity:77, imageUrl:'', desc:'Classic hard biscuits with a distinctive tiger stripe pattern.' },
  { productId:'PRD-120', id:120, name:'Kacang Putih Muruku 200g', brand:'Shaheen', category:'Snacks', icon:'🧂', color:'#fff9c4', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-82013', prices:{aeon:4.50, lotus:null, mydin:3.90}, pricePerUnit:'RM 3.90/200g', savings:'13%', contentScore:72, collabScore:70, popularity:78, imageUrl:'', desc:'Crispy Indian-style muruku savoury snack, freshly made.' },
  { productId:'PRD-121', id:121, name:'Tora Chocolate Snack 24g', brand:'Tora', category:'Snacks', icon:'🍫', color:'#4a148c', weight:'24g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82014', prices:{aeon:1.50, lotus:1.40, mydin:1.20}, pricePerUnit:'RM 1.20/unit', savings:'20%', contentScore:68, collabScore:66, popularity:74, imageUrl:'', desc:'Fun chocolate wafer snack for kids with a collectible toy surprise.' },
  { productId:'PRD-122', id:122, name:'Loacker Quadratini Vanilla 125g', brand:'Loacker', category:'Snacks', icon:'🍪', color:'#fff8e1', weight:'125g', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:8.90, lotus:8.50, mydin:null}, pricePerUnit:'RM 8.50/125g', savings:'4%', contentScore:78, collabScore:76, popularity:79, imageUrl:'', desc:'Italian premium wafer cubes with creamy vanilla filling.' },
  { productId:'PRD-123', id:123, name:'Pringles Original 107g', brand:'Pringles', category:'Snacks', icon:'🥔', color:'#fff3e0', weight:'107g', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:null}, pricePerUnit:'RM 9.50/107g', savings:'4%', contentScore:77, collabScore:75, popularity:82, imageUrl:'', desc:'Stacked saddle-shaped potato crisps in iconic tube packaging.' },

  /* STAPLES ×17 (PRD-124 to PRD-140) */
  { productId:'PRD-124', id:124, name:'Jasmine Fragrant Rice 10kg', brand:'Jasmine', category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'10kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-83001', prices:{aeon:39.90, lotus:38.90, mydin:36.90}, pricePerUnit:'RM 3.69/kg', savings:'8%', contentScore:85, collabScore:83, popularity:91, imageUrl:'', desc:'Long-grain Thai fragrant rice, soft and fluffy when cooked.' },
  { productId:'PRD-125', id:125, name:'Jasmine Super Tempatan Rice 5kg', brand:'Jasmine', category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'5kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-83001', prices:{aeon:20.90, lotus:20.50, mydin:19.90}, pricePerUnit:'RM 3.98/kg', savings:'5%', contentScore:84, collabScore:82, popularity:89, imageUrl:'', desc:'Premium local rice, slightly sticky and full of aroma.' },
  { productId:'PRD-126', id:126, name:'Bernas Special Rice 5kg', brand:'Bernas', category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'5kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83002', prices:{aeon:22.50, lotus:22.00, mydin:21.50}, pricePerUnit:'RM 4.30/kg', savings:'4%', contentScore:83, collabScore:81, popularity:87, imageUrl:'', desc:'Government-subsidised quality rice brand, trusted across Malaysia.' },
  { productId:'PRD-127', id:127, name:'Cap Sauh Basmathi Rice 5kg', brand:'Cap Sauh', category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'5kg', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83003', prices:{aeon:32.90, lotus:31.90, mydin:30.90}, pricePerUnit:'RM 6.18/kg', savings:'6%', contentScore:82, collabScore:80, popularity:84, imageUrl:'', desc:'Premium basmathi rice with long slender grains and floral aroma.' },
  { productId:'PRD-128', id:128, name:'Sunwhite Calrose Rice 5kg', brand:'Sunwhite', category:'Staples', icon:'🌾', color:'#f3e5f5', weight:'5kg', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83004', prices:{aeon:29.90, lotus:28.90, mydin:null}, pricePerUnit:'RM 5.78/kg', savings:'3%', contentScore:80, collabScore:78, popularity:79, imageUrl:'', desc:'Japanese-style short-grain rice, ideal for sushi and porridge.' },
  { productId:'PRD-129', id:129, name:'Seri Murni Brown Rice 2kg', brand:'Seri Murni', category:'Staples', icon:'🌾', color:'#d7ccc8', weight:'2kg', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83005', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 5.95/kg', savings:'8%', contentScore:81, collabScore:79, popularity:76, imageUrl:'', desc:'Nutritious whole-grain brown rice, high in fibre and minerals.' },
  { productId:'PRD-130', id:130, name:'Anchor Extra White Sugar 1kg', brand:'Anchor', category:'Staples', icon:'🍬', color:'#fafafa', weight:'1kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83006', prices:{aeon:3.10, lotus:3.00, mydin:2.85}, pricePerUnit:'RM 2.85/kg', savings:'8%', contentScore:72, collabScore:70, popularity:90, imageUrl:'', desc:'Refined white cane sugar, government-controlled price item.' },
  { productId:'PRD-131', id:131, name:'CSR Raw Sugar 1kg', brand:'CSR', category:'Staples', icon:'🍬', color:'#ffe0b2', weight:'1kg', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83006', prices:{aeon:4.50, lotus:4.30, mydin:4.00}, pricePerUnit:'RM 4.00/kg', savings:'11%', contentScore:74, collabScore:72, popularity:77, imageUrl:'', desc:'Natural raw cane sugar with light molasses flavour.' },
  { productId:'PRD-132', id:132, name:'Malaysia Flour Mills Superfine Flour 1kg', brand:'MFM', category:'Staples', icon:'🌾', color:'#fafafa', weight:'1kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83007', prices:{aeon:2.50, lotus:2.40, mydin:2.20}, pricePerUnit:'RM 2.20/kg', savings:'12%', contentScore:74, collabScore:72, popularity:85, imageUrl:'', desc:'All-purpose superfine wheat flour for breads, cakes and pastries.' },
  { productId:'PRD-133', id:133, name:'Softasilk Cake Flour 1kg', brand:'Softasilk', category:'Staples', icon:'🌾', color:'#fafafa', weight:'1kg', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83007', prices:{aeon:3.90, lotus:3.70, mydin:null}, pricePerUnit:'RM 3.70/kg', savings:'5%', contentScore:73, collabScore:71, popularity:74, imageUrl:'', desc:'Fine cake flour for softer sponges and delicate pastries.' },
  { productId:'PRD-134', id:134, name:'Habhal\'s Honey 500g', brand:"Habhal's", category:'Staples', icon:'🍯', color:'#ffe0b2', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83008', prices:{aeon:18.90, lotus:17.90, mydin:16.90}, pricePerUnit:'RM 33.80/kg', savings:'11%', contentScore:82, collabScore:80, popularity:80, imageUrl:'', desc:'Pure local Malaysian honey, raw and unprocessed.' },
  { productId:'PRD-135', id:135, name:'Leggos Pasta Spaghetti 400g', brand:'Leggos', category:'Staples', icon:'🍝', color:'#fff9c4', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-83009', prices:{aeon:4.50, lotus:4.20, mydin:3.90}, pricePerUnit:'RM 3.90/400g', savings:'13%', contentScore:75, collabScore:73, popularity:76, imageUrl:'', desc:'Italian-style durum wheat spaghetti, cooks al dente in 8 minutes.' },
  { productId:'PRD-136', id:136, name:'Naturel Olive Oil Extra Virgin 500ml', brand:'Naturel', category:'Staples', icon:'🫒', color:'#f1f8e9', weight:'500ml', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83010', prices:{aeon:24.90, lotus:23.90, mydin:null}, pricePerUnit:'RM 47.80/L', savings:'4%', contentScore:84, collabScore:82, popularity:78, imageUrl:'', desc:'Cold-pressed extra virgin olive oil, ideal for dressings and cooking.' },
  { productId:'PRD-137', id:137, name:'Anchor Butter Salted 250g', brand:'Anchor', category:'Staples', icon:'🧈', color:'#fff9c4', weight:'250g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83011', prices:{aeon:9.90, lotus:9.50, mydin:9.00}, pricePerUnit:'RM 36.00/kg', savings:'9%', contentScore:80, collabScore:78, popularity:83, imageUrl:'', desc:'Premium New Zealand salted butter, perfect for baking and spreading.' },
  { productId:'PRD-138', id:138, name:'Anchor Butter Unsalted 250g', brand:'Anchor', category:'Staples', icon:'🧈', color:'#fff9c4', weight:'250g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83011', prices:{aeon:9.90, lotus:9.50, mydin:9.00}, pricePerUnit:'RM 36.00/kg', savings:'9%', contentScore:80, collabScore:78, popularity:80, imageUrl:'', desc:'Premium New Zealand unsalted butter for baking and pastry work.' },
  { productId:'PRD-139', id:139, name:'Kaya Coconut Jam 500g', brand:'Yeos', category:'Staples', icon:'🥥', color:'#d1fae5', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83012', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 7.90/500g', savings:'11%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Traditional Malaysian coconut egg jam, naturally pandan-scented.' },
  { productId:'PRD-140', id:140, name:'Nutella Hazelnut Spread 380g', brand:'Nutella', category:'Staples', icon:'🌰', color:'#4e342e', weight:'380g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-83013', prices:{aeon:18.90, lotus:18.50, mydin:17.90}, pricePerUnit:'RM 47.11/kg', savings:'5%', contentScore:83, collabScore:81, popularity:88, imageUrl:'', desc:'Creamy hazelnut and cocoa spread, JAKIM halal certified.' },

  /* STAPLES continued (PRD-141 to PRD-150) */
  { productId:'PRD-141', id:141, name:'Golden Chef Sesame Oil 200ml', brand:'Golden Chef', category:'Staples', icon:'🫚', color:'#fff9c4', weight:'200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83014', prices:{aeon:7.90, lotus:7.50, mydin:7.00}, pricePerUnit:'RM 35.00/L', savings:'11%', contentScore:78, collabScore:76, popularity:80, imageUrl:'', desc:'Pure toasted sesame oil for drizzling over noodles, rice and stir-fries.' },
  { productId:'PRD-142', id:142, name:'Maeploy Coconut Milk 400ml', brand:'Mae Ploy', category:'Staples', icon:'🥥', color:'#d1fae5', weight:'400ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83015', prices:{aeon:4.50, lotus:4.20, mydin:3.90}, pricePerUnit:'RM 9.75/L', savings:'13%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Rich and creamy coconut milk for curries, desserts and rendang.' },
  { productId:'PRD-143', id:143, name:'Kara Coconut Cream 200ml', brand:'Kara', category:'Staples', icon:'🥥', color:'#d1fae5', weight:'200ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83015', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 17.50/L', savings:'10%', contentScore:78, collabScore:76, popularity:81, imageUrl:'', desc:'Thick coconut cream for desserts, laksa and nasi lemak.' },
  { productId:'PRD-144', id:144, name:'Yeos Sambal Belacan 200g', brand:"Yeo's", category:'Staples', icon:'🌶️', color:'#ffccbc', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83016', prices:{aeon:5.90, lotus:5.50, mydin:5.00}, pricePerUnit:'RM 25.00/kg', savings:'15%', contentScore:77, collabScore:75, popularity:83, imageUrl:'', desc:'Traditional Malaysian sambal belacan paste, spicy and aromatic.' },
  { productId:'PRD-145', id:145, name:'Adabi Santan Kelapa Pekat 200ml', brand:'Adabi', category:'Staples', icon:'🥥', color:'#d1fae5', weight:'200ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-83017', prices:{aeon:3.50, lotus:3.30, mydin:3.00}, pricePerUnit:'RM 15.00/L', savings:'14%', contentScore:76, collabScore:74, popularity:80, imageUrl:'', desc:'Thick coconut santan for authentic Malaysian curry and desserts.' },
  { productId:'PRD-146', id:146, name:'Kimball Tomato Ketchup 500g', brand:'Kimball', category:'Staples', icon:'🍅', color:'#ffccbc', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-83018', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 9.80/kg', savings:'11%', contentScore:75, collabScore:73, popularity:82, imageUrl:'', desc:'Classic tomato ketchup, a Malaysian kitchen staple since 1967.' },

  /* ADDITIONAL BEVERAGES to reach 30 (PRD-147 to PRD-150 — moved to fill gap) */
  { productId:'PRD-147', id:147, name:'Nestlé Milo Powder 1kg', brand:'Nestlé Milo', category:'Beverages', icon:'☕', color:'#4e342e', weight:'1kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81012', prices:{aeon:24.90, lotus:23.90, mydin:22.90}, pricePerUnit:'RM 22.90/kg', savings:'8%', contentScore:86, collabScore:84, popularity:93, imageUrl:'', desc:'Malted malt barley and milk powder, the No.1 energy food drink in Malaysia.' },
  { productId:'PRD-148', id:148, name:'Horlicks Original Malt 400g', brand:'Horlicks', category:'Beverages', icon:'☕', color:'#d7ccc8', weight:'400g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-81014', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 34.75/kg', savings:'7%', contentScore:80, collabScore:78, popularity:80, imageUrl:'', desc:'Warm malted milk drink, a classic bedtime favourite for the family.' },
  { productId:'PRD-149', id:149, name:'Ovaltine Malt Drink 400g', brand:'Ovaltine', category:'Beverages', icon:'☕', color:'#4e342e', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81015', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 32.25/kg', savings:'7%', contentScore:78, collabScore:76, popularity:78, imageUrl:'', desc:'Classic malted drink with vitamins and minerals for growing children.' },
  { productId:'PRD-150', id:150, name:'Teh Boh Original Tea Bags 100s', brand:'Teh Boh', category:'Beverages', icon:'🍵', color:'#fff8e1', weight:'200g (100×2g)', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81016', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 0.08/bag', savings:'11%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Cameron Highlands premium black tea bags, bold and aromatic.' },

  /* SNACKS continued (PRD-151 to PRD-160) */
  { productId:'PRD-151', id:151, name:'Mamee Snack Noodles Hot & Spicy 25g×10', brand:'Mamee', category:'Snacks', icon:'🌶️', color:'#ffe0b2', weight:'10×25g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-MLK-2022-82007', prices:{aeon:6.50, lotus:6.20, mydin:5.90}, pricePerUnit:'RM 0.59/pack', savings:'9%', contentScore:75, collabScore:73, popularity:83, imageUrl:'', desc:'Crunchy mini noodle snack with fiery hot & spicy seasoning.' },
  { productId:'PRD-152', id:152, name:'Oreo Original 133g', brand:'Oreo', category:'Snacks', icon:'🍪', color:'#212121', weight:'133g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-82015', prices:{aeon:5.50, lotus:5.30, mydin:5.00}, pricePerUnit:'RM 5.00/133g', savings:'9%', contentScore:79, collabScore:77, popularity:87, imageUrl:'', desc:'America\'s favourite cookie — crunchy chocolate wafer with cream filling.' },
  { productId:'PRD-153', id:153, name:'Oreo Double Stuf 133g', brand:'Oreo', category:'Snacks', icon:'🍪', color:'#212121', weight:'133g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-82015', prices:{aeon:5.90, lotus:5.70, mydin:5.50}, pricePerUnit:'RM 5.50/133g', savings:'7%', contentScore:78, collabScore:76, popularity:85, imageUrl:'', desc:'Double the cream filling in every Oreo cookie for extra indulgence.' },
  { productId:'PRD-154', id:154, name:'Lay\'s Classic Salted 68g', brand:"Lay's", category:'Snacks', icon:'🥔', color:'#fff9c4', weight:'68g', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:4.50, lotus:4.30, mydin:null}, pricePerUnit:'RM 4.30/unit', savings:'4%', contentScore:74, collabScore:72, popularity:82, imageUrl:'', desc:'Lightly salted wavy potato chips, world-famous crispy snack.' },
  { productId:'PRD-155', id:155, name:'Kinder Bueno 2 bars 43g', brand:'Kinder', category:'Snacks', icon:'🍫', color:'#ffe0b2', weight:'43g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-82016', prices:{aeon:4.90, lotus:4.70, mydin:null}, pricePerUnit:'RM 4.70/unit', savings:'4%', contentScore:79, collabScore:77, popularity:84, imageUrl:'', desc:'Crispy wafer bar filled with hazelnut cream and coated with chocolate.' },
  { productId:'PRD-156', id:156, name:'Kit Kat 4-finger 45g', brand:'Nestlé', category:'Snacks', icon:'🍫', color:'#c62828', weight:'45g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-82017', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 2.50/unit', savings:'14%', contentScore:78, collabScore:76, popularity:86, imageUrl:'', desc:'Have a break! Crispy wafer fingers coated in smooth milk chocolate.' },
  { productId:'PRD-157', id:157, name:'Pocky Chocolate 47g', brand:'Glico', category:'Snacks', icon:'🍫', color:'#4e342e', weight:'47g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82018', prices:{aeon:4.50, lotus:4.30, mydin:4.00}, pricePerUnit:'RM 4.00/unit', savings:'11%', contentScore:76, collabScore:74, popularity:83, imageUrl:'', desc:'Thin biscuit sticks dipped in chocolate, Japan\'s iconic snack.' },
  { productId:'PRD-158', id:158, name:'Penang Famous Amos Cookies Choc Chip 170g', brand:'Famous Amos', category:'Snacks', icon:'🍪', color:'#4e342e', weight:'170g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PNG-2022-82019', prices:{aeon:12.90, lotus:12.50, mydin:null}, pricePerUnit:'RM 12.50/170g', savings:'3%', contentScore:82, collabScore:80, popularity:86, imageUrl:'', desc:'Small batch chocolate chip cookies from the legendary Penang brand.' },
  { productId:'PRD-159', id:159, name:'Mamee Cheezels 60g', brand:'Mamee', category:'Snacks', icon:'🧀', color:'#fff9c4', weight:'60g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-MLK-2022-82007', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 2.50/unit', savings:'14%', contentScore:73, collabScore:71, popularity:80, imageUrl:'', desc:'Ring-shaped cheese puffs, a classic Malaysian childhood snack.' },
  { productId:'PRD-160', id:160, name:'Mister Potato Crisps Seaweed 60g', brand:'Mister Potato', category:'Snacks', icon:'🌊', color:'#d1fae5', weight:'60g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-82006', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:76, collabScore:74, popularity:81, imageUrl:'', desc:'Crispy potato crisps with nori seaweed seasoning, Asian-style.' },

  /* DAIRY ×18 (PRD-161 to PRD-178) */
  { productId:'PRD-161', id:161, name:'Farm Fresh Full Cream Milk 1.5L', brand:'Farm Fresh', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'1.5L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SWK-2022-84001', prices:{aeon:11.90, lotus:11.50, mydin:10.90}, pricePerUnit:'RM 7.27/L', savings:'8%', contentScore:88, collabScore:86, popularity:92, imageUrl:'', desc:'Fresh whole milk from grass-fed cows, no added hormones.' },
  { productId:'PRD-162', id:162, name:'Farm Fresh Low Fat Milk 1L', brand:'Farm Fresh', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'1L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SWK-2022-84001', prices:{aeon:8.50, lotus:8.20, mydin:7.90}, pricePerUnit:'RM 7.90/L', savings:'7%', contentScore:86, collabScore:84, popularity:89, imageUrl:'', desc:'Fresh low-fat milk with all the goodness, less fat.' },
  { productId:'PRD-163', id:163, name:'Farm Fresh UHT Milk 200ml×6', brand:'Farm Fresh', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'6×200ml', store:'Mydin', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-SWK-2022-84001', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 1.48/unit', savings:'10%', contentScore:85, collabScore:83, popularity:88, imageUrl:'', desc:'Long-life UHT milk, convenient for school lunchboxes.' },
  { productId:'PRD-164', id:164, name:'Dutch Lady Full Cream UHT 1L', brand:'Dutch Lady', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'1L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-84002', prices:{aeon:6.90, lotus:6.60, mydin:6.30}, pricePerUnit:'RM 6.30/L', savings:'9%', contentScore:84, collabScore:82, popularity:87, imageUrl:'', desc:'Trusted Dutch Lady UHT full cream milk, calcium-rich.' },
  { productId:'PRD-165', id:165, name:'Dutch Lady Strawberry Milk 200ml×6', brand:'Dutch Lady', category:'Dairy', icon:'🍓', color:'#fce4ec', weight:'6×200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-84002', prices:{aeon:8.50, lotus:8.20, mydin:7.90}, pricePerUnit:'RM 1.32/unit', savings:'7%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Strawberry-flavoured milk drink for kids, packed with calcium.' },
  { productId:'PRD-166', id:166, name:'Marigold Fresh Milk Full Cream 1L', brand:'Marigold', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'1L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-84003', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 6.90/L', savings:'8%', contentScore:83, collabScore:81, popularity:85, imageUrl:'', desc:'Fresh pasteurised full cream milk, creamy and nutritious.' },
  { productId:'PRD-167', id:167, name:'Marigold Yogurt Plain 400g', brand:'Marigold', category:'Dairy', icon:'🥛', color:'#f1f8e9', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-84003', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 15.50/kg', savings:'10%', contentScore:81, collabScore:79, popularity:80, imageUrl:'', desc:'Smooth natural yogurt with live cultures, no added preservatives.' },
  { productId:'PRD-168', id:168, name:'Marigold Yogurt Mango 140g', brand:'Marigold', category:'Dairy', icon:'🥭', color:'#fff9c4', weight:'140g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-84003', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 17.86/kg', savings:'14%', contentScore:79, collabScore:77, popularity:81, imageUrl:'', desc:'Mango-flavoured yogurt with real fruit pieces and live cultures.' },
  { productId:'PRD-169', id:169, name:'Cheddar Cheese Slices 250g', brand:'Chesdale', category:'Dairy', icon:'🧀', color:'#fff9c4', weight:'250g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-84004', prices:{aeon:11.90, lotus:11.50, mydin:10.90}, pricePerUnit:'RM 43.60/kg', savings:'8%', contentScore:80, collabScore:78, popularity:82, imageUrl:'', desc:'Mild cheddar cheese slices, perfect for sandwiches and burgers.' },
  { productId:'PRD-170', id:170, name:'Kraft Mozzarella Cheese 250g', brand:'Kraft', category:'Dairy', icon:'🧀', color:'#fafafa', weight:'250g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84005', prices:{aeon:14.90, lotus:14.50, mydin:null}, pricePerUnit:'RM 58.00/kg', savings:'3%', contentScore:79, collabScore:77, popularity:78, imageUrl:'', desc:'Stretchy low-moisture mozzarella, ideal for pizza and pasta bakes.' },
  { productId:'PRD-171', id:171, name:'Nestle Greek Yogurt Strawberry 150g', brand:'Nestlé', category:'Dairy', icon:'🍓', color:'#fce4ec', weight:'150g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84006', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 23.33/kg', savings:'10%', contentScore:80, collabScore:78, popularity:82, imageUrl:'', desc:'Thick and creamy Greek-style yogurt with strawberry fruit swirl.' },
  { productId:'PRD-172', id:172, name:'F&N Condensed Milk 391g', brand:'F&N', category:'Dairy', icon:'🥛', color:'#fff9c4', weight:'391g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84007', prices:{aeon:4.90, lotus:4.60, mydin:4.30}, pricePerUnit:'RM 11.00/kg', savings:'12%', contentScore:78, collabScore:76, popularity:88, imageUrl:'', desc:'Classic sweetened condensed milk for teh tarik, cakes and desserts.' },
  { productId:'PRD-173', id:173, name:'Carnation Evaporated Milk 410g', brand:'Carnation', category:'Dairy', icon:'🥛', color:'#fff9c4', weight:'410g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84008', prices:{aeon:4.50, lotus:4.30, mydin:4.00}, pricePerUnit:'RM 9.76/kg', savings:'11%', contentScore:76, collabScore:74, popularity:83, imageUrl:'', desc:'Rich evaporated milk, perfect for cendol, curries and creamy desserts.' },
  { productId:'PRD-174', id:174, name:'Lactel UHT Chocolate Milk 200ml×6', brand:'Lactel', category:'Dairy', icon:'🍫', color:'#4e342e', weight:'6×200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84009', prices:{aeon:11.90, lotus:11.50, mydin:null}, pricePerUnit:'RM 1.92/unit', savings:'3%', contentScore:76, collabScore:74, popularity:78, imageUrl:'', desc:'French-origin UHT chocolate milk, smooth and cocoa-rich.' },
  { productId:'PRD-175', id:175, name:'Meadow Gold Butter 250g', brand:'Meadow Gold', category:'Dairy', icon:'🧈', color:'#fff9c4', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-84010', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 31.60/kg', savings:'11%', contentScore:77, collabScore:75, popularity:78, imageUrl:'', desc:'Creamy salted butter for bread-spreading, baking and cooking.' },
  { productId:'PRD-176', id:176, name:'Goodday Chocolate Flavoured Milk 1L', brand:'Goodday', category:'Dairy', icon:'🍫', color:'#4e342e', weight:'1L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-84011', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 6.90/L', savings:'8%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Chocolate-flavoured milk drink, calcium and protein enriched.' },
  { productId:'PRD-177', id:177, name:'Yoplait Yogurt Mixed Berry 150g', brand:'Yoplait', category:'Dairy', icon:'🫐', color:'#f3e5f5', weight:'150g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84012', prices:{aeon:3.50, lotus:3.30, mydin:null}, pricePerUnit:'RM 22.00/kg', savings:'6%', contentScore:78, collabScore:76, popularity:79, imageUrl:'', desc:'Smooth mixed berry yogurt with live cultures, lightly sweetened.' },
  { productId:'PRD-178', id:178, name:'Nestle Omega Plus Milk Powder 1.5kg', brand:'Nestlé', category:'Dairy', icon:'🥛', color:'#e3f2fd', weight:'1.5kg', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-84013', prices:{aeon:69.90, lotus:67.90, mydin:64.90}, pricePerUnit:'RM 43.27/kg', savings:'7%', contentScore:83, collabScore:81, popularity:80, imageUrl:'', desc:'Adult milk powder with Acticol to help reduce cholesterol absorption.' },

  /* CANNED GOODS ×18 (PRD-179 to PRD-196) */
  { productId:'PRD-179', id:179, name:'Ayam Brand Sardines in Tomato Sauce 425g', brand:'Ayam Brand', category:'Canned Goods', icon:'🐟', color:'#ffe0b2', weight:'425g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85001', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 13.88/kg', savings:'15%', contentScore:82, collabScore:80, popularity:89, imageUrl:'', desc:'Tender sardines in rich tomato sauce, a Malaysian pantry staple.' },
  { productId:'PRD-180', id:180, name:'Ayam Brand Tuna Flakes in Spring Water 185g', brand:'Ayam Brand', category:'Canned Goods', icon:'🐟', color:'#e3f2fd', weight:'185g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85001', prices:{aeon:6.50, lotus:6.20, mydin:5.80}, pricePerUnit:'RM 31.35/kg', savings:'11%', contentScore:83, collabScore:81, popularity:87, imageUrl:'', desc:'Skipjack tuna flakes in spring water, high protein, low fat.' },
  { productId:'PRD-181', id:181, name:'Ayam Brand Mackerel in Tomato Sauce 425g', brand:'Ayam Brand', category:'Canned Goods', icon:'🐟', color:'#ffe0b2', weight:'425g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85001', prices:{aeon:7.90, lotus:7.50, mydin:6.90}, pricePerUnit:'RM 16.24/kg', savings:'13%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Mackerel fillets in spicy tomato sauce, omega-3 rich.' },
  { productId:'PRD-182', id:182, name:'Tesco Baked Beans 420g', brand:'Tesco', category:'Canned Goods', icon:'🫘', color:'#fff3e0', weight:'420g', store:"Lotus's", discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85002', prices:{aeon:null, lotus:3.90, mydin:null}, pricePerUnit:'RM 9.29/kg', savings:'0%', contentScore:72, collabScore:70, popularity:75, imageUrl:'', desc:'Haricot beans in rich tomato sauce, classic British-style baked beans.' },
  { productId:'PRD-183', id:183, name:'Del Monte Peach Slices in Juice 415g', brand:'Del Monte', category:'Canned Goods', icon:'🍑', color:'#fff9c4', weight:'415g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85003', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 16.63/kg', savings:'8%', contentScore:76, collabScore:74, popularity:78, imageUrl:'', desc:'Luscious yellow peach slices in natural fruit juice, no added sugar.' },
  { productId:'PRD-184', id:184, name:'Del Monte Pineapple Slices 567g', brand:'Del Monte', category:'Canned Goods', icon:'🍍', color:'#fff9c4', weight:'567g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85003', prices:{aeon:6.90, lotus:6.60, mydin:6.20}, pricePerUnit:'RM 10.93/kg', savings:'10%', contentScore:75, collabScore:73, popularity:80, imageUrl:'', desc:'Sweet pineapple rings in syrup, ideal for cakes and pizza toppings.' },
  { productId:'PRD-185', id:185, name:'Grace Coconut Milk 400ml', brand:'Grace', category:'Canned Goods', icon:'🥥', color:'#d1fae5', weight:'400ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-85004', prices:{aeon:4.50, lotus:4.20, mydin:3.90}, pricePerUnit:'RM 9.75/L', savings:'13%', contentScore:76, collabScore:74, popularity:79, imageUrl:'', desc:'Creamy coconut milk for Malaysian and Caribbean cooking.' },
  { productId:'PRD-186', id:186, name:'Campbell\'s Tomato Soup 305g', brand:"Campbell's", category:'Canned Goods', icon:'🍅', color:'#ffccbc', weight:'305g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85005', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 16.07/kg', savings:'11%', contentScore:77, collabScore:75, popularity:80, imageUrl:'', desc:'Classic tomato soup in a can, smooth and ready to heat in minutes.' },
  { productId:'PRD-187', id:187, name:"Campbell's Cream of Mushroom 305g", brand:"Campbell's", category:'Canned Goods', icon:'🍄', color:'#eceff1', weight:'305g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85005', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 16.07/kg', savings:'11%', contentScore:76, collabScore:74, popularity:78, imageUrl:'', desc:'Creamy mushroom soup, great as a sauce base for pasta or chicken.' },
  { productId:'PRD-188', id:188, name:'Jalen Corned Beef 340g', brand:'Jalen', category:'Canned Goods', icon:'🥩', color:'#ffccbc', weight:'340g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85006', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 26.18/kg', savings:'10%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Halal corned beef made from quality beef, ready to eat or fry.' },
  { productId:'PRD-189', id:189, name:'Rexona Tuna in Sunflower Oil 185g', brand:'Rexona', category:'Canned Goods', icon:'🐟', color:'#fff9c4', weight:'185g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-85007', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 28.11/kg', savings:'12%', contentScore:75, collabScore:73, popularity:78, imageUrl:'', desc:'Tuna chunks in sunflower oil, mild flavour and flaky texture.' },
  { productId:'PRD-190', id:190, name:'Seri Murni Sweet Corn Cream 420g', brand:'Seri Murni', category:'Canned Goods', icon:'🌽', color:'#fff9c4', weight:'420g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85008', prices:{aeon:4.50, lotus:4.20, mydin:3.80}, pricePerUnit:'RM 9.05/kg', savings:'16%', contentScore:72, collabScore:70, popularity:77, imageUrl:'', desc:'Creamy cream-style sweet corn for soups and corn fritters.' },
  { productId:'PRD-191', id:191, name:'Ayam Brand Coconut Milk 400ml', brand:'Ayam Brand', category:'Canned Goods', icon:'🥥', color:'#d1fae5', weight:'400ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 12.25/L', savings:'11%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Thick Ayam Brand coconut milk for laksa, rendang and desserts.' },
  { productId:'PRD-192', id:192, name:'Heinz Baked Beans 415g', brand:'Heinz', category:'Canned Goods', icon:'🫘', color:'#fff3e0', weight:'415g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85009', prices:{aeon:6.50, lotus:6.20, mydin:5.90}, pricePerUnit:'RM 14.22/kg', savings:'9%', contentScore:76, collabScore:74, popularity:79, imageUrl:'', desc:'World-famous Heinz baked beans in tomato sauce, a breakfast staple.' },
  { productId:'PRD-193', id:193, name:'Prego Pasta Sauce Traditional 680g', brand:'Prego', category:'Canned Goods', icon:'🍅', color:'#ffccbc', weight:'680g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-85010', prices:{aeon:11.90, lotus:11.50, mydin:10.90}, pricePerUnit:'RM 16.03/kg', savings:'8%', contentScore:78, collabScore:76, popularity:81, imageUrl:'', desc:'Classic Italian-style tomato basil pasta sauce with vine tomatoes.' },
  { productId:'PRD-194', id:194, name:'Mary Brown Canned Chicken 425g', brand:'Mary Brown', category:'Canned Goods', icon:'🍗', color:'#ffe0b2', weight:'425g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-85011', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 23.29/kg', savings:'9%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Canned halal chicken chunks ready to add to curries, rice or stews.' },
  { productId:'PRD-195', id:195, name:'Golden Churn Canned Butter 340g', brand:'Golden Churn', category:'Canned Goods', icon:'🧈', color:'#fff9c4', weight:'340g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-85012', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 40.88/kg', savings:'7%', contentScore:78, collabScore:76, popularity:80, imageUrl:'', desc:'Classic canned butter from New Zealand, mild and creamy for baking.' },
  { productId:'PRD-196', id:196, name:'Yeos Soya Bean Milk 300ml×6', brand:"Yeo's", category:'Canned Goods', icon:'🥛', color:'#d1fae5', weight:'6×300ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-85013', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 1.32/can', savings:'11%', contentScore:77, collabScore:75, popularity:82, imageUrl:'', desc:'Smooth soya bean milk in cans, cholesterol-free and protein-rich.' },

  /* COOKING ×20 (PRD-197 to PRD-216) */
  { productId:'PRD-197', id:197, name:'Knife Sunflower Cooking Oil 2L', brand:'Knife', category:'Cooking', icon:'🍳', color:'#fff9c4', weight:'2L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-86001', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 6.95/L', savings:'7%', contentScore:78, collabScore:76, popularity:85, imageUrl:'', desc:'Refined sunflower oil, light flavour ideal for frying and baking.' },
  { productId:'PRD-198', id:198, name:'Saji Cooking Oil 5L', brand:'Saji', category:'Cooking', icon:'🍳', color:'#fff9c4', weight:'5L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86002', prices:{aeon:34.90, lotus:33.90, mydin:31.90}, pricePerUnit:'RM 6.38/L', savings:'9%', contentScore:77, collabScore:75, popularity:88, imageUrl:'', desc:'Economy palm cooking oil, great for everyday Malaysian cooking.' },
  { productId:'PRD-199', id:199, name:'Buruh Cooking Oil 2L', brand:'Cap Buruh', category:'Cooking', icon:'🍳', color:'#fff9c4', weight:'2L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86003', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 6.45/L', savings:'7%', contentScore:75, collabScore:73, popularity:84, imageUrl:'', desc:'Trusted palm cooking oil brand, widely used in Malaysian homes.' },
  { productId:'PRD-200', id:200, name:'Vesawit Palm Olein Oil 5L', brand:'Vesawit', category:'Cooking', icon:'🍳', color:'#fff9c4', weight:'5L', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86004', prices:{aeon:35.90, lotus:34.90, mydin:32.90}, pricePerUnit:'RM 6.58/L', savings:'8%', contentScore:74, collabScore:72, popularity:82, imageUrl:'', desc:'Refined palm olein oil, high smoke point for deep frying.' },
  { productId:'PRD-201', id:201, name:'Adabi Curry Powder 250g', brand:'Adabi', category:'Cooking', icon:'🌶️', color:'#ffe0b2', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86005', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 23.60/kg', savings:'15%', contentScore:79, collabScore:77, popularity:86, imageUrl:'', desc:'Authentic Malaysian curry powder blend for fish, meat and chicken curries.' },
  { productId:'PRD-202', id:202, name:'Adabi Rendang Paste 180g', brand:'Adabi', category:'Cooking', icon:'🥩', color:'#4e342e', weight:'180g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86005', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 28.89/kg', savings:'12%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Ready-to-cook rendang paste with galangal, lemongrass and turmeric.' },
  { productId:'PRD-203', id:203, name:"Brahim's Nasi Lemak Sambal 180g", brand:"Brahim's", category:'Cooking', icon:'🌶️', color:'#ffe0b2', weight:'180g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86006', prices:{aeon:7.90, lotus:7.50, mydin:7.00}, pricePerUnit:'RM 38.89/kg', savings:'11%', contentScore:81, collabScore:79, popularity:84, imageUrl:'', desc:'Authentic nasi lemak sambal, ready to heat and serve instantly.' },
  { productId:'PRD-204', id:204, name:'Cap Faiza Kurma Powder 250g', brand:'Cap Faiza', category:'Cooking', icon:'🌿', color:'#d1fae5', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-86007', prices:{aeon:7.90, lotus:7.50, mydin:6.90}, pricePerUnit:'RM 27.60/kg', savings:'13%', contentScore:79, collabScore:77, popularity:83, imageUrl:'', desc:'Fragrant kurma spice mix for chicken, lamb and vegetable kurma.' },
  { productId:'PRD-205', id:205, name:'Lee Kum Kee Hoisin Sauce 230g', brand:'Lee Kum Kee', category:'Cooking', icon:'🥫', color:'#4e342e', weight:'230g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86008', prices:{aeon:7.90, lotus:7.50, mydin:null}, pricePerUnit:'RM 32.61/kg', savings:'5%', contentScore:76, collabScore:74, popularity:77, imageUrl:'', desc:'Sweet and savoury Chinese hoisin sauce, great for Peking duck and dips.' },
  { productId:'PRD-206', id:206, name:'Prego Bolognese Pasta Sauce 490g', brand:'Prego', category:'Cooking', icon:'🍅', color:'#ffccbc', weight:'490g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86009', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 20.20/kg', savings:'9%', contentScore:77, collabScore:75, popularity:79, imageUrl:'', desc:'Meaty bolognese pasta sauce with tomatoes and herbs.' },
  { productId:'PRD-207', id:207, name:'Maggi Oyster Sauce 510g', brand:'Maggi', category:'Cooking', icon:'🥫', color:'#2e7d32', weight:'510g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-86010', prices:{aeon:8.50, lotus:8.20, mydin:7.90}, pricePerUnit:'RM 15.49/kg', savings:'7%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Rich oyster sauce to enhance stir-fries, vegetables and marinades.' },
  { productId:'PRD-208', id:208, name:'Maggi Tomato Ketchup 325g', brand:'Maggi', category:'Cooking', icon:'🍅', color:'#ffccbc', weight:'325g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-86010', prices:{aeon:4.90, lotus:4.60, mydin:4.30}, pricePerUnit:'RM 13.23/kg', savings:'12%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Tangy and smooth Maggi tomato ketchup for fries and snacks.' },
  { productId:'PRD-209', id:209, name:'Kimball Chilli Sauce 340g', brand:'Kimball', category:'Cooking', icon:'🌶️', color:'#ffccbc', weight:'340g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-86011', prices:{aeon:5.00, lotus:4.80, mydin:4.50}, pricePerUnit:'RM 13.24/kg', savings:'10%', contentScore:76, collabScore:74, popularity:83, imageUrl:'', desc:'Spicy and tangy chilli sauce, the perfect dipping condiment.' },
  { productId:'PRD-210', id:210, name:'Habhal\'s Fish Curry Powder 250g', brand:"Habhal's", category:'Cooking', icon:'🐟', color:'#ffe0b2', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-86012', prices:{aeon:7.50, lotus:7.00, mydin:6.50}, pricePerUnit:'RM 26.00/kg', savings:'13%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Special fish curry spice blend for authentic Malaysian fish curry.' },
  { productId:'PRD-211', id:211, name:'Knorr Chicken Stock Cubes 8s', brand:'Knorr', category:'Cooking', icon:'🍗', color:'#ffe0b2', weight:'8×10g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86013', prices:{aeon:5.90, lotus:5.60, mydin:5.30}, pricePerUnit:'RM 0.66/cube', savings:'10%', contentScore:79, collabScore:77, popularity:83, imageUrl:'', desc:'Concentrated chicken stock cubes for soups, gravies and stir-fries.' },
  { productId:'PRD-212', id:212, name:'Knorr Tomyam Paste 100g', brand:'Knorr', category:'Cooking', icon:'🍲', color:'#ffccbc', weight:'100g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86013', prices:{aeon:4.90, lotus:4.60, mydin:4.30}, pricePerUnit:'RM 43.00/kg', savings:'12%', contentScore:80, collabScore:78, popularity:84, imageUrl:'', desc:'Ready-to-use tom yam paste for instant Thai-style spicy soup.' },
  { productId:'PRD-213', id:213, name:'ABC Soy Sauce Dark 625ml', brand:'ABC', category:'Cooking', icon:'🫙', color:'#4e342e', weight:'625ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86014', prices:{aeon:6.90, lotus:6.50, mydin:6.00}, pricePerUnit:'RM 9.60/L', savings:'13%', contentScore:75, collabScore:73, popularity:80, imageUrl:'', desc:'Indonesian-style sweet dark soy sauce (kecap manis), perfect for satay.' },
  { productId:'PRD-214', id:214, name:'Dragonfly Light Soy Sauce 600ml', brand:'Dragonfly', category:'Cooking', icon:'🫙', color:'#4e342e', weight:'600ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86015', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 8.17/L', savings:'11%', contentScore:74, collabScore:72, popularity:78, imageUrl:'', desc:'Light soy sauce for seasoning and marinades, brewed from soybeans.' },
  { productId:'PRD-215', id:215, name:'Heinz White Vinegar 473ml', brand:'Heinz', category:'Cooking', icon:'🍶', color:'#fafafa', weight:'473ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-86016', prices:{aeon:5.90, lotus:5.60, mydin:null}, pricePerUnit:'RM 11.84/L', savings:'5%', contentScore:70, collabScore:68, popularity:72, imageUrl:'', desc:'Distilled white vinegar for pickling, cooking and cleaning.' },
  { productId:'PRD-216', id:216, name:'Weikfield Corn Flour 100g', brand:'Weikfield', category:'Cooking', icon:'🌽', color:'#fff9c4', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-86017', prices:{aeon:2.50, lotus:2.30, mydin:2.10}, pricePerUnit:'RM 21.00/kg', savings:'16%', contentScore:70, collabScore:68, popularity:77, imageUrl:'', desc:'Fine corn flour for thickening soups, sauces and gravies.' },

  /* INSTANT FOOD ×24 (PRD-217 to PRD-240) */
  { productId:'PRD-217', id:217, name:'Maggi Mee Goreng 5pack', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'5×80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.98/pack', savings:'11%', contentScore:83, collabScore:81, popularity:91, imageUrl:'', desc:'Spicy fried noodle seasoning pack, a Malaysian flavour icon.' },
  { productId:'PRD-218', id:218, name:'Maggi Tom Yam Noodles 5pack', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#ffccbc', weight:'5×78g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.98/pack', savings:'11%', contentScore:82, collabScore:80, popularity:89, imageUrl:'', desc:'Tangy Thai-style tom yam instant noodles with spicy lemon soup base.' },
  { productId:'PRD-219', id:219, name:'Maggi Asam Laksa Noodles 5pack', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#ffe0b2', weight:'5×80g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 1.24/pack', savings:'10%', contentScore:83, collabScore:81, popularity:87, imageUrl:'', desc:'Penang-style tangy asam laksa instant noodles with prawn paste sachet.' },
  { productId:'PRD-220', id:220, name:'Mamee Chef Kari Noodles 5pack', brand:'Mamee', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'5×80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-MLK-2022-87002', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 1.04/pack', savings:'12%', contentScore:81, collabScore:79, popularity:88, imageUrl:'', desc:'Rich Malaysian-style curry flavoured instant noodles.' },
  { productId:'PRD-221', id:221, name:'Mamee Chef Mee Goreng 5pack', brand:'Mamee', category:'Instant Food', icon:'🍜', color:'#ffe0b2', weight:'5×80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-MLK-2022-87002', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 1.04/pack', savings:'12%', contentScore:80, collabScore:78, popularity:86, imageUrl:'', desc:'Spicy fried noodle flavour instant noodles with sambal seasoning.' },
  { productId:'PRD-222', id:222, name:'Cintan Goreng 5pack', brand:'Cintan', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'5×80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87003', prices:{aeon:4.90, lotus:4.60, mydin:4.30}, pricePerUnit:'RM 0.86/pack', savings:'12%', contentScore:78, collabScore:76, popularity:83, imageUrl:'', desc:'Budget-friendly fried noodle instant mee, a student staple.' },
  { productId:'PRD-223', id:223, name:'Cintan Chicken Soup 5pack', brand:'Cintan', category:'Instant Food', icon:'🍜', color:'#d1fae5', weight:'5×75g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87003', prices:{aeon:4.50, lotus:4.30, mydin:3.90}, pricePerUnit:'RM 0.78/pack', savings:'13%', contentScore:77, collabScore:75, popularity:81, imageUrl:'', desc:'Mild chicken soup instant noodles, comforting and easy to make.' },
  { productId:'PRD-224', id:224, name:'MyKuali Penang White Curry Noodles 4pack', brand:'MyKuali', category:'Instant Food', icon:'🍜', color:'#fafafa', weight:'4×110g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PNG-2022-87004', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 3.48/pack', savings:'7%', contentScore:85, collabScore:83, popularity:84, imageUrl:'', desc:'Award-winning Penang-style white curry instant noodles, rich coconut broth.' },
  { productId:'PRD-225', id:225, name:'MyKuali Penang Hokkien Prawn Noodles 4pack', brand:'MyKuali', category:'Instant Food', icon:'🍜', color:'#ffe0b2', weight:'4×110g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PNG-2022-87004', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 3.48/pack', savings:'7%', contentScore:84, collabScore:82, popularity:83, imageUrl:'', desc:'Authentic Penang Hokkien mee with rich prawn and pork-free broth.' },
  { productId:'PRD-226', id:226, name:'Prima Taste Singapore Laksa 2pack', brand:'Prima Taste', category:'Instant Food', icon:'🍜', color:'#ffccbc', weight:'2×185g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87005', prices:{aeon:16.90, lotus:15.90, mydin:null}, pricePerUnit:'RM 7.95/pack', savings:'6%', contentScore:82, collabScore:80, popularity:79, imageUrl:'', desc:'Premium Singapore-style laksa with coconut milk soup paste.' },
  { productId:'PRD-227', id:227, name:'Brahim\'s Nasi Ayam Ready Meal 300g', brand:"Brahim's", category:'Instant Food', icon:'🍚', color:'#fff9c4', weight:'300g', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87006', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 39.67/kg', savings:'8%', contentScore:82, collabScore:80, popularity:82, imageUrl:'', desc:'Retort-pouch chicken rice meal, ready in minutes — just heat and eat.' },
  { productId:'PRD-228', id:228, name:"Brahim's Nasi Lemak Ready Meal 300g", brand:"Brahim's", category:'Instant Food', icon:'🍚', color:'#d1fae5', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87006', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 39.67/kg', savings:'8%', contentScore:81, collabScore:79, popularity:83, imageUrl:'', desc:'Fragrant coconut rice with sambal, anchovies and peanuts in a pouch.' },
  { productId:'PRD-229', id:229, name:'Maggi Noodles Curry 5pack', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#ffe0b2', weight:'5×79g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.98/pack', savings:'11%', contentScore:81, collabScore:79, popularity:88, imageUrl:'', desc:'Curry-flavoured instant noodles, Malaysia\'s No.1 comfort food.' },
  { productId:'PRD-230', id:230, name:'Indomie Mee Goreng 5pack', brand:'Indomie', category:'Instant Food', icon:'🍜', color:'#ffe0b2', weight:'5×85g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-87007', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 1.04/pack', savings:'12%', contentScore:80, collabScore:78, popularity:87, imageUrl:'', desc:'Indonesian-origin fried noodles with sweet soy and chilli seasoning.' },
  { productId:'PRD-231', id:231, name:'Koka Instant Noodles Mushroom 5pack', brand:'Koka', category:'Instant Food', icon:'🍜', color:'#d1fae5', weight:'5×85g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87008', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 1.24/pack', savings:'10%', contentScore:76, collabScore:74, popularity:75, imageUrl:'', desc:'Singapore-brand flat rice noodles in mushroom soup base.' },
  { productId:'PRD-232', id:232, name:'Nissin Cup Noodles Seafood 75g', brand:'Nissin', category:'Instant Food', icon:'🍜', color:'#e3f2fd', weight:'75g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87009', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:78, collabScore:76, popularity:80, imageUrl:'', desc:'Self-contained cup noodles with seafood soup, just add boiling water.' },
  { productId:'PRD-233', id:233, name:'Nissin Cup Noodles Chicken 75g', brand:'Nissin', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'75g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-87009', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:77, collabScore:75, popularity:79, imageUrl:'', desc:'Chicken-flavoured cup noodles, convenient office or travel snack.' },
  { productId:'PRD-234', id:234, name:'Adabi Instant Mee Segera Kari 5pack', brand:'Adabi', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'5×75g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-87010', prices:{aeon:5.00, lotus:4.80, mydin:4.50}, pricePerUnit:'RM 0.90/pack', savings:'10%', contentScore:77, collabScore:75, popularity:80, imageUrl:'', desc:'Halal Malaysian-brand curry instant noodles with aromatic seasoning.' },
  { productId:'PRD-235', id:235, name:'Gardenia Pita Bread 6s', brand:'Gardenia', category:'Instant Food', icon:'🫓', color:'#fff8e1', weight:'6pcs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87011', prices:{aeon:5.90, lotus:5.60, mydin:5.30}, pricePerUnit:'RM 0.88/pc', savings:'10%', contentScore:75, collabScore:73, popularity:76, imageUrl:'', desc:'Soft flatbread rounds for wraps, dipping and Middle Eastern dishes.' },
  { productId:'PRD-236', id:236, name:'Adabi Instant Curry Laksa Paste 200g', brand:'Adabi', category:'Instant Food', icon:'🍲', color:'#ffccbc', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-87010', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 26.00/kg', savings:'12%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Curry laksa paste for a rich, spicy coconut broth — serves 3-4.' },
  { productId:'PRD-237', id:237, name:'Roti Canai Frozen 10pcs', brand:'MyRoti', category:'Instant Food', icon:'🫓', color:'#fafafa', weight:'10pcs', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-87012', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 0.89/pc', savings:'10%', contentScore:80, collabScore:78, popularity:86, imageUrl:'', desc:'Frozen roti canai flaky flatbread, ready in 3 minutes on the pan.' },
  { productId:'PRD-238', id:238, name:'Maggi 2-Minute Noodles Chicken 5pack', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#fff9c4', weight:'5×70g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:4.90, lotus:4.60, mydin:4.30}, pricePerUnit:'RM 0.86/pack', savings:'12%', contentScore:80, collabScore:78, popularity:87, imageUrl:'', desc:'The original 2-minute chicken noodles, quick and satisfying.' },
  { productId:'PRD-239', id:239, name:'Cintan Non-Fried Instant Noodles 5pack', brand:'Cintan', category:'Instant Food', icon:'🍜', color:'#fafafa', weight:'5×75g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87003', prices:{aeon:7.50, lotus:7.20, mydin:6.90}, pricePerUnit:'RM 1.38/pack', savings:'8%', contentScore:78, collabScore:76, popularity:78, imageUrl:'', desc:'Air-dried non-fried instant noodles, lower in fat than regular varieties.' },
  { productId:'PRD-240', id:240, name:'Maggi Hot Cup Tom Yam 62g', brand:'Maggi', category:'Instant Food', icon:'🍜', color:'#ffccbc', weight:'62g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-87001', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 3.50/unit', savings:'10%', contentScore:79, collabScore:77, popularity:83, imageUrl:'', desc:'Spicy tom yam cup noodles, just add hot water and enjoy in 2 minutes.' },

  /* SEASONING ×22 (PRD-241 to PRD-262) */
  { productId:'PRD-241', id:241, name:'Adabi Sea Salt Fine 500g', brand:'Adabi', category:'Seasoning', icon:'🧂', color:'#eceff1', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88001', prices:{aeon:2.50, lotus:2.30, mydin:2.00}, pricePerUnit:'RM 4.00/kg', savings:'20%', contentScore:70, collabScore:68, popularity:85, imageUrl:'', desc:'Pure fine sea salt, iodised for daily cooking and baking.' },
  { productId:'PRD-242', id:242, name:'Cap Faiza Turmeric Powder 200g', brand:'Cap Faiza', category:'Seasoning', icon:'🟡', color:'#fff9c4', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-88002', prices:{aeon:5.50, lotus:5.20, mydin:4.80}, pricePerUnit:'RM 24.00/kg', savings:'13%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Bright yellow turmeric powder for curries, rice dishes and marinades.' },
  { productId:'PRD-243', id:243, name:'Cap Faiza Coriander Powder 200g', brand:'Cap Faiza', category:'Seasoning', icon:'🌿', color:'#d1fae5', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-88002', prices:{aeon:5.50, lotus:5.20, mydin:4.80}, pricePerUnit:'RM 24.00/kg', savings:'13%', contentScore:74, collabScore:72, popularity:78, imageUrl:'', desc:'Aromatic ground coriander for spice blends and Malaysian curries.' },
  { productId:'PRD-244', id:244, name:'Cap Faiza Chilli Powder 250g', brand:'Cap Faiza', category:'Seasoning', icon:'🌶️', color:'#ffccbc', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KDH-2022-88002', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 23.60/kg', savings:'15%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Vibrant red chilli powder blend for sambal, rendang and curries.' },
  { productId:'PRD-245', id:245, name:'Adabi Black Pepper Powder 100g', brand:'Adabi', category:'Seasoning', icon:'⚫', color:'#4e342e', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88001', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 52.00/kg', savings:'12%', contentScore:75, collabScore:73, popularity:80, imageUrl:'', desc:'Finely ground black pepper for soups, marinades and table seasoning.' },
  { productId:'PRD-246', id:246, name:'Adabi Cumin Powder 100g', brand:'Adabi', category:'Seasoning', icon:'🌿', color:'#d1fae5', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88001', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 52.00/kg', savings:'12%', contentScore:73, collabScore:71, popularity:75, imageUrl:'', desc:'Earthy cumin powder essential for Malaysian and Indian-inspired cooking.' },
  { productId:'PRD-247', id:247, name:'Rempah Cap Ibu Biryani Spice 40g', brand:'Cap Ibu', category:'Seasoning', icon:'🍛', color:'#fff9c4', weight:'40g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88003', prices:{aeon:3.50, lotus:3.20, mydin:2.90}, pricePerUnit:'RM 72.50/kg', savings:'17%', contentScore:78, collabScore:76, popularity:83, imageUrl:'', desc:'Traditional biryani spice blend for fragrant and authentic rice dishes.' },
  { productId:'PRD-248', id:248, name:'Ajinomoto MSG Seasoning 500g', brand:'Ajinomoto', category:'Seasoning', icon:'🧂', color:'#fafafa', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88004', prices:{aeon:6.50, lotus:6.20, mydin:5.80}, pricePerUnit:'RM 11.60/kg', savings:'11%', contentScore:70, collabScore:68, popularity:80, imageUrl:'', desc:'Monosodium glutamate umami seasoning to enhance the flavour of any dish.' },
  { productId:'PRD-249', id:249, name:'Maggi Secukup Rasa 100g', brand:'Maggi', category:'Seasoning', icon:'🧂', color:'#fff9c4', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-88005', prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 25.00/kg', savings:'14%', contentScore:76, collabScore:74, popularity:88, imageUrl:'', desc:'All-in-one seasoning powder — just a pinch makes everything taste better.' },
  { productId:'PRD-250', id:250, name:'Knorr Chicken Seasoning Powder 100g', brand:'Knorr', category:'Seasoning', icon:'🐓', color:'#ffe0b2', weight:'100g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88006', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 49.00/kg', savings:'11%', contentScore:77, collabScore:75, popularity:83, imageUrl:'', desc:'Rich chicken seasoning for soups, rice and all everyday dishes.' },
  { productId:'PRD-251', id:251, name:'Knorr Lime Seasoning Powder 50g', brand:'Knorr', category:'Seasoning', icon:'🍋', color:'#f1f8e9', weight:'50g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88006', prices:{aeon:3.50, lotus:3.30, mydin:null}, pricePerUnit:'RM 66.00/kg', savings:'6%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Zesty lime seasoning to brighten up salads, grilled fish and ceviche.' },
  { productId:'PRD-252', id:252, name:'McCormick Garlic Powder 70g', brand:'McCormick', category:'Seasoning', icon:'🧄', color:'#fafafa', weight:'70g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88007', prices:{aeon:8.90, lotus:8.50, mydin:null}, pricePerUnit:'RM 121.43/kg', savings:'5%', contentScore:75, collabScore:73, popularity:77, imageUrl:'', desc:'Pure garlic powder with intense flavour, great for marinades and rubs.' },
  { productId:'PRD-253', id:253, name:'McCormick Paprika 35g', brand:'McCormick', category:'Seasoning', icon:'🌶️', color:'#ffccbc', weight:'35g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88007', prices:{aeon:7.90, lotus:7.50, mydin:null}, pricePerUnit:'RM 214.29/kg', savings:'5%', contentScore:74, collabScore:72, popularity:74, imageUrl:'', desc:'Sweet smoked paprika from Spain, adds colour and depth to dishes.' },
  { productId:'PRD-254', id:254, name:'Habhal Meat Curry Powder 250g', brand:"Habhal's", category:'Seasoning', icon:'🥩', color:'#ffe0b2', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-88008', prices:{aeon:8.50, lotus:8.00, mydin:7.50}, pricePerUnit:'RM 30.00/kg', savings:'12%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Robust meat curry spice blend for beef, mutton and venison curries.' },
  { productId:'PRD-255', id:255, name:'Baba\'s Fish Curry Powder 250g', brand:"Baba's", category:'Seasoning', icon:'🐟', color:'#ffe0b2', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-88009', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 31.60/kg', savings:'11%', contentScore:78, collabScore:76, popularity:81, imageUrl:'', desc:'Classic Baba\'s fish curry powder, fragrant and slightly spicy.' },
  { productId:'PRD-256', id:256, name:'Seri Aji All-Purpose Seasoning 120g', brand:'Seri Aji', category:'Seasoning', icon:'🧂', color:'#d1fae5', weight:'120g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88010', prices:{aeon:3.90, lotus:3.60, mydin:3.30}, pricePerUnit:'RM 27.50/kg', savings:'15%', contentScore:72, collabScore:70, popularity:78, imageUrl:'', desc:'Versatile seasoning blend for rice, noodles and all everyday cooking.' },
  { productId:'PRD-257', id:257, name:'Adabi Mixed Herbs 20g', brand:'Adabi', category:'Seasoning', icon:'🌿', color:'#d1fae5', weight:'20g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88001', prices:{aeon:4.90, lotus:4.60, mydin:null}, pricePerUnit:'RM 230.00/kg', savings:'6%', contentScore:71, collabScore:69, popularity:72, imageUrl:'', desc:'Italian-style dried mixed herbs for pizza, pasta and roasted chicken.' },
  { productId:'PRD-258', id:258, name:'Maldon Sea Salt Flakes 125g', brand:'Maldon', category:'Seasoning', icon:'🧂', color:'#eceff1', weight:'125g', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:16.90, lotus:15.90, mydin:null}, pricePerUnit:'RM 127.20/kg', savings:'6%', contentScore:76, collabScore:74, popularity:72, imageUrl:'', desc:'Gourmet pyramid sea salt flakes for finishing steaks and desserts.' },
  { productId:'PRD-259', id:259, name:'Peppercorn Whole Black 50g', brand:'McCormick', category:'Seasoning', icon:'⚫', color:'#4e342e', weight:'50g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88007', prices:{aeon:7.90, lotus:7.50, mydin:null}, pricePerUnit:'RM 150.00/kg', savings:'5%', contentScore:73, collabScore:71, popularity:73, imageUrl:'', desc:'Whole black peppercorns for freshly grinding over dishes at the table.' },
  { productId:'PRD-260', id:260, name:'Hacks Chicken Seasoning Granules 200g', brand:'Hacks', category:'Seasoning', icon:'🐓', color:'#ffe0b2', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-88011', prices:{aeon:6.50, lotus:6.20, mydin:5.80}, pricePerUnit:'RM 29.00/kg', savings:'11%', contentScore:73, collabScore:71, popularity:77, imageUrl:'', desc:'Granulated chicken seasoning for soups, fried rice and stir-fries.' },
  { productId:'PRD-261', id:261, name:'Knorr Beef Granules 80g', brand:'Knorr', category:'Seasoning', icon:'🥩', color:'#4e342e', weight:'80g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-88006', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 65.00/kg', savings:'12%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Rich beef stock granules to add depth to stews, soups and gravies.' },
  { productId:'PRD-262', id:262, name:'Yeos Sambal Oelek 200g', brand:"Yeo's", category:'Seasoning', icon:'🌶️', color:'#ffccbc', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-88012', prices:{aeon:5.50, lotus:5.20, mydin:4.80}, pricePerUnit:'RM 24.00/kg', savings:'13%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Pure ground chilli sambal paste, great with everything from noodles to eggs.' },

  /* FROZEN ×20 (PRD-263 to PRD-282) */
  { productId:'PRD-263', id:263, name:'Ramly Burger Beef Patty 6pcs', brand:'Ramly', category:'Frozen', icon:'🍔', color:'#ffe0b2', weight:'6×90g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89001', prices:{aeon:11.90, lotus:11.50, mydin:10.90}, pricePerUnit:'RM 1.82/pc', savings:'8%', contentScore:82, collabScore:80, popularity:91, imageUrl:'', desc:'Malaysia\'s iconic halal beef burger patties, quick to pan-fry.' },
  { productId:'PRD-264', id:264, name:'Ramly Chicken Burger Patty 6pcs', brand:'Ramly', category:'Frozen', icon:'🍔', color:'#fff9c4', weight:'6×90g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89001', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 1.65/pc', savings:'9%', contentScore:81, collabScore:79, popularity:89, imageUrl:'', desc:'Tender halal chicken burger patties, great for home grilling.' },
  { productId:'PRD-265', id:265, name:'Ayamas Chicken Nuggets 500g', brand:'Ayamas', category:'Frozen', icon:'🍗', color:'#ffe0b2', weight:'500g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89002', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 27.80/kg', savings:'7%', contentScore:83, collabScore:81, popularity:90, imageUrl:'', desc:'Crunchy halal chicken nuggets, kids\' favourite — oven or air-fry ready.' },
  { productId:'PRD-266', id:266, name:'Ayamas Chicken Sausages 500g', brand:'Ayamas', category:'Frozen', icon:'🌭', color:'#ffe0b2', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89002', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 23.80/kg', savings:'8%', contentScore:81, collabScore:79, popularity:87, imageUrl:'', desc:'Halal chicken sausages for grilling, frying or BBQ. No pork.' },
  { productId:'PRD-267', id:267, name:'Farmhouse Frozen Prawns 500g', brand:'Farmhouse', category:'Frozen', icon:'🦐', color:'#ffe0b2', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89003', prices:{aeon:22.90, lotus:21.90, mydin:20.90}, pricePerUnit:'RM 41.80/kg', savings:'9%', contentScore:80, collabScore:78, popularity:83, imageUrl:'', desc:'Frozen medium prawns, cleaned and deveined, ready to cook.' },
  { productId:'PRD-268', id:268, name:'Frozen Fish Fillet (Dory) 500g', brand:'SeaChoice', category:'Frozen', icon:'🐟', color:'#e3f2fd', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89004', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 27.80/kg', savings:'7%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Individually frozen dory fish fillets, mild taste and boneless.' },
  { productId:'PRD-269', id:269, name:'Frozen Mixed Vegetables 500g', brand:'Birds Eye', category:'Frozen', icon:'🥕', color:'#f1f8e9', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-89005', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 15.80/kg', savings:'11%', contentScore:78, collabScore:76, popularity:80, imageUrl:'', desc:'Mixed peas, carrots and corn, frozen at peak freshness.' },
  { productId:'PRD-270', id:270, name:'Gardenia Frozen Bread Rolls 8pcs', brand:'Gardenia', category:'Frozen', icon:'🍞', color:'#fafafa', weight:'8pcs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89006', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 0.99/pc', savings:'11%', contentScore:77, collabScore:75, popularity:78, imageUrl:'', desc:'Frozen dinner rolls, bake from frozen to fluffy in 15 minutes.' },
  { productId:'PRD-271', id:271, name:'Ayamas Chicken Frankfurter 500g', brand:'Ayamas', category:'Frozen', icon:'🌭', color:'#ffccbc', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89002', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 25.80/kg', savings:'7%', contentScore:79, collabScore:77, popularity:84, imageUrl:'', desc:'Juicy halal chicken frankfurters for hotdogs, spaghetti and BBQ.' },
  { productId:'PRD-272', id:272, name:'Frozen Squid Ring 300g', brand:'SeaChoice', category:'Frozen', icon:'🦑', color:'#e3f2fd', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89004', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 39.67/kg', savings:'8%', contentScore:77, collabScore:75, popularity:79, imageUrl:'', desc:'Tender frozen squid rings, perfect for calamari or stir-frying.' },
  { productId:'PRD-273', id:273, name:'Sunshine Frozen Fried Tofu 250g', brand:'Sunshine', category:'Frozen', icon:'🧈', color:'#fff9c4', weight:'250g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89007', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 20.80/kg', savings:'12%', contentScore:74, collabScore:72, popularity:77, imageUrl:'', desc:'Pre-fried tofu puffs for laksa, curry and vegetable dishes.' },
  { productId:'PRD-274', id:274, name:'Ramly Beef Frankfurter 500g', brand:'Ramly', category:'Frozen', icon:'🌭', color:'#ffe0b2', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89001', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 25.80/kg', savings:'7%', contentScore:79, collabScore:77, popularity:85, imageUrl:'', desc:'Halal beef frankfurters for hotdogs, pasta and everyday cooking.' },
  { productId:'PRD-275', id:275, name:'Farmhouse Frozen Crab Sticks 200g', brand:'Farmhouse', category:'Frozen', icon:'🦀', color:'#ffccbc', weight:'200g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89003', prices:{aeon:7.90, lotus:7.50, mydin:7.00}, pricePerUnit:'RM 35.00/kg', savings:'11%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Imitation crab sticks from surimi, great for salads and sushi rolls.' },
  { productId:'PRD-276', id:276, name:'Super Ring Cheese Balls 100g (Frozen)', brand:'Super Ring', category:'Frozen', icon:'🧀', color:'#fff9c4', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89008', prices:{aeon:5.90, lotus:null, mydin:4.90}, pricePerUnit:'RM 49.00/kg', savings:'17%', contentScore:72, collabScore:70, popularity:74, imageUrl:'', desc:'Frozen cheese-flavoured puffed snack balls, bake for a crispy treat.' },
  { productId:'PRD-277', id:277, name:'Gardenia Frozen Pizza Dough 400g', brand:'Gardenia', category:'Frozen', icon:'🍕', color:'#fafafa', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89006', prices:{aeon:8.90, lotus:8.50, mydin:null}, pricePerUnit:'RM 21.25/kg', savings:'5%', contentScore:75, collabScore:73, popularity:73, imageUrl:'', desc:'Ready-to-use frozen pizza base dough, thaw and top with your choice.' },
  { productId:'PRD-278', id:278, name:'Frozen Edamame Beans 500g', brand:'GreenFarm', category:'Frozen', icon:'🫛', color:'#f1f8e9', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-89009', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 17.80/kg', savings:'10%', contentScore:76, collabScore:74, popularity:75, imageUrl:'', desc:'Young green soybeans, steam-ready for a nutritious snack or side.' },
  { productId:'PRD-279', id:279, name:'Sunshine Vegetarian Chicken 300g', brand:'Sunshine', category:'Frozen', icon:'🥦', color:'#f1f8e9', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89007', prices:{aeon:13.90, lotus:13.50, mydin:null}, pricePerUnit:'RM 45.00/kg', savings:'3%', contentScore:74, collabScore:72, popularity:72, imageUrl:'', desc:'Soy-based vegetarian mock chicken, JAKIM certified halal.' },
  { productId:'PRD-280', id:280, name:'Farmhouse Frozen Whole Chicken 1.5kg', brand:'Farmhouse', category:'Frozen', icon:'🍗', color:'#ffe0b2', weight:'1.5kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89003', prices:{aeon:19.90, lotus:18.90, mydin:17.90}, pricePerUnit:'RM 11.93/kg', savings:'10%', contentScore:80, collabScore:78, popularity:83, imageUrl:'', desc:'Halal whole frozen chicken, great for roasting, curry or soup.' },
  { productId:'PRD-281', id:281, name:'Crab Meat Frozen 200g', brand:'Ocean King', category:'Frozen', icon:'🦀', color:'#ffe0b2', weight:'200g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89010', prices:{aeon:15.90, lotus:15.50, mydin:null}, pricePerUnit:'RM 77.50/kg', savings:'3%', contentScore:75, collabScore:73, popularity:74, imageUrl:'', desc:'Frozen real crab meat flakes, ideal for crab cakes and fried rice.' },
  { productId:'PRD-282', id:282, name:'Ayamas Chicken Meatballs 500g', brand:'Ayamas', category:'Frozen', icon:'🍡', color:'#ffe0b2', weight:'500g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-89002', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 25.80/kg', savings:'7%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Juicy halal chicken meatballs for soup, curry and pasta dishes.' },

  /* FRESH PRODUCE ×18 (PRD-283 to PRD-300) */
  { productId:'PRD-283', id:283, name:'Red Onion 500g', brand:'Local', category:'Fresh Produce', icon:'🧅', color:'#f3e5f5', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:3.50, lotus:3.20, mydin:2.90}, pricePerUnit:'RM 5.80/kg', savings:'17%', contentScore:75, collabScore:73, popularity:90, imageUrl:'', desc:'Naturally halal fresh red onions, essential for Malaysian cooking.' },
  { productId:'PRD-284', id:284, name:'Potato White 1kg', brand:'Local', category:'Fresh Produce', icon:'🥔', color:'#fff9c4', weight:'1kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:4.90, lotus:4.60, mydin:4.20}, pricePerUnit:'RM 4.20/kg', savings:'14%', contentScore:74, collabScore:72, popularity:88, imageUrl:'', desc:'Fresh white potatoes, great for curry, soup and mashed potato.' },
  { productId:'PRD-285', id:285, name:'Sweet Potato 500g', brand:'Local', category:'Fresh Produce', icon:'🍠', color:'#ff8f00', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:3.90, lotus:3.60, mydin:3.20}, pricePerUnit:'RM 6.40/kg', savings:'18%', contentScore:74, collabScore:72, popularity:83, imageUrl:'', desc:'Sweet orange-fleshed sweet potato, great for desserts and porridge.' },
  { productId:'PRD-286', id:286, name:'Spinach 200g', brand:'Local', category:'Fresh Produce', icon:'🥬', color:'#f1f8e9', weight:'200g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.90, lotus:2.70, mydin:2.50}, pricePerUnit:'RM 12.50/kg', savings:'14%', contentScore:76, collabScore:74, popularity:80, imageUrl:'', desc:'Fresh bayam spinach, packed with iron and folate.' },
  { productId:'PRD-287', id:287, name:'Broccoli 300g', brand:'Local', category:'Fresh Produce', icon:'🥦', color:'#f1f8e9', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:4.90, lotus:4.60, mydin:4.20}, pricePerUnit:'RM 14.00/kg', savings:'14%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Fresh broccoli florets, high in vitamin C and fibre.' },
  { productId:'PRD-288', id:288, name:'Cucumber 2pcs', brand:'Local', category:'Fresh Produce', icon:'🥒', color:'#f1f8e9', weight:'~400g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.50, lotus:2.20, mydin:1.90}, pricePerUnit:'RM 4.75/kg', savings:'24%', contentScore:71, collabScore:69, popularity:85, imageUrl:'', desc:'Crisp and cool Malaysian cucumber, perfect for ulam and salads.' },
  { productId:'PRD-289', id:289, name:'Long Bean 200g', brand:'Local', category:'Fresh Produce', icon:'🫘', color:'#f1f8e9', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.50, lotus:2.20, mydin:1.90}, pricePerUnit:'RM 9.50/kg', savings:'24%', contentScore:71, collabScore:69, popularity:83, imageUrl:'', desc:'Fresh kacang panjang (long beans), ideal for stir-fries and sambal.' },
  { productId:'PRD-290', id:290, name:'Bird\'s Eye Chilli 100g', brand:'Local', category:'Fresh Produce', icon:'🌶️', color:'#ffccbc', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.90, lotus:2.50, mydin:2.20}, pricePerUnit:'RM 22.00/kg', savings:'24%', contentScore:72, collabScore:70, popularity:86, imageUrl:'', desc:'Fiery cili padi for sambals, soups and Malaysian sauces.' },
  { productId:'PRD-291', id:291, name:'Lemongrass 100g', brand:'Local', category:'Fresh Produce', icon:'🌿', color:'#f1f8e9', weight:'100g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.50, lotus:2.20, mydin:1.90}, pricePerUnit:'RM 19.00/kg', savings:'24%', contentScore:73, collabScore:71, popularity:83, imageUrl:'', desc:'Aromatic serai (lemongrass) stalks essential for rendang and laksa.' },
  { productId:'PRD-292', id:292, name:'Pandan Leaves Bundle', brand:'Local', category:'Fresh Produce', icon:'🌿', color:'#d1fae5', weight:'~80g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.00, lotus:1.80, mydin:1.50}, pricePerUnit:'RM 18.75/kg', savings:'25%', contentScore:72, collabScore:70, popularity:82, imageUrl:'', desc:'Fragrant pandan leaves for rice, kuih and Malaysian desserts.' },
  { productId:'PRD-293', id:293, name:'Ginger 200g', brand:'Local', category:'Fresh Produce', icon:'🫚', color:'#fff9c4', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:3.50, lotus:3.20, mydin:2.80}, pricePerUnit:'RM 14.00/kg', savings:'20%', contentScore:73, collabScore:71, popularity:84, imageUrl:'', desc:'Fresh halia (ginger) root, indispensable for Malaysian and Chinese cooking.' },
  { productId:'PRD-294', id:294, name:'Apple Fuji 4pcs', brand:'Imported', category:'Fresh Produce', icon:'🍎', color:'#ffccbc', weight:'~600g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:7.90, lotus:7.50, mydin:6.90}, pricePerUnit:'RM 11.50/kg', savings:'13%', contentScore:75, collabScore:73, popularity:83, imageUrl:'', desc:'Crisp and sweet Fuji apples from China, a popular fresh fruit choice.' },
  { productId:'PRD-295', id:295, name:'Watermelon Seedless ~2kg', brand:'Local', category:'Fresh Produce', icon:'🍉', color:'#fce4ec', weight:'~2kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:12.90, lotus:11.90, mydin:10.90}, pricePerUnit:'RM 5.45/kg', savings:'16%', contentScore:77, collabScore:75, popularity:86, imageUrl:'', desc:'Sweet seedless watermelon, a must-have for hot Malaysian days.' },
  { productId:'PRD-296', id:296, name:'Papaya Betik ~1kg', brand:'Local', category:'Fresh Produce', icon:'🍈', color:'#fff9c4', weight:'~1kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:5.90, lotus:5.50, mydin:4.90}, pricePerUnit:'RM 4.90/kg', savings:'17%', contentScore:74, collabScore:72, popularity:80, imageUrl:'', desc:'Ripe Malaysian betik papaya, naturally sweet with vitamin C.' },
  { productId:'PRD-297', id:297, name:'Mango Harumanis 2pcs', brand:'Local', category:'Fresh Produce', icon:'🥭', color:'#fff9c4', weight:'~500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 17.80/kg', savings:'10%', contentScore:78, collabScore:76, popularity:84, imageUrl:'', desc:'Sweet Harumanis mangoes from Perlis, prized for their fragrant aroma.' },
  { productId:'PRD-298', id:298, name:'Rambutan 500g', brand:'Local', category:'Fresh Produce', icon:'🍈', color:'#fce4ec', weight:'500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 11.80/kg', savings:'15%', contentScore:74, collabScore:72, popularity:82, imageUrl:'', desc:'Sweet hairy tropical fruit native to Malaysia, fresh from local orchards.' },
  { productId:'PRD-299', id:299, name:'Guava 3pcs', brand:'Local', category:'Fresh Produce', icon:'🍈', color:'#f1f8e9', weight:'~500g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:5.50, lotus:5.00, mydin:4.50}, pricePerUnit:'RM 9.00/kg', savings:'18%', contentScore:73, collabScore:71, popularity:79, imageUrl:'', desc:'Crunchy local jambu (guava), eaten fresh or with rojak sauce.' },
  { productId:'PRD-300', id:300, name:'Kangkung Water Spinach 200g', brand:'Local', category:'Fresh Produce', icon:'🥬', color:'#f1f8e9', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:null, prices:{aeon:2.50, lotus:2.20, mydin:1.90}, pricePerUnit:'RM 9.50/kg', savings:'24%', contentScore:70, collabScore:68, popularity:82, imageUrl:'', desc:'Fresh kangkung for stir-frying with sambal belacan or garlic.' },

  /* BREAKFAST ×20 (PRD-301 to PRD-320) */
  { productId:'PRD-301', id:301, name:'Nestlé Corn Flakes 300g', brand:'Nestlé', category:'Breakfast', icon:'🌽', color:'#fff9c4', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 26.33/kg', savings:'11%', contentScore:80, collabScore:78, popularity:86, imageUrl:'', desc:'Classic golden corn flakes, crunchy and ready to eat with milk.' },
  { productId:'PRD-302', id:302, name:'Kellogg\'s Frosties 300g', brand:"Kellogg's", category:'Breakfast', icon:'🐯', color:'#fff9c4', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90002', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 33.00/kg', savings:'9%', contentScore:79, collabScore:77, popularity:85, imageUrl:'', desc:'Sugar-frosted corn flakes, Tony the Tiger\'s legendary breakfast.' },
  { productId:'PRD-303', id:303, name:"Kellogg's Coco Pops 300g", brand:"Kellogg's", category:'Breakfast', icon:'🍫', color:'#4e342e', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90002', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 33.00/kg', savings:'9%', contentScore:78, collabScore:76, popularity:83, imageUrl:'', desc:'Chocolate-flavoured rice puffs that turn milk into chocolate milk.' },
  { productId:'PRD-304', id:304, name:'Nestlé Milo Cereal 330g', brand:'Nestlé', category:'Breakfast', icon:'☕', color:'#4e342e', weight:'330g', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 36.06/kg', savings:'8%', contentScore:82, collabScore:80, popularity:87, imageUrl:'', desc:'Milo-flavoured cereal balls with cocoa malt goodness, iron-fortified.' },
  { productId:'PRD-305', id:305, name:'Quaker Rolled Oats 500g', brand:'Quaker', category:'Breakfast', icon:'🥣', color:'#fff8e1', weight:'500g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90003', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 17.80/kg', savings:'10%', contentScore:83, collabScore:81, popularity:84, imageUrl:'', desc:'Whole grain rolled oats, high in beta-glucan fibre for heart health.' },
  { productId:'PRD-306', id:306, name:'Quaker Instant Oats 800g', brand:'Quaker', category:'Breakfast', icon:'🥣', color:'#fff8e1', weight:'800g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90003', prices:{aeon:16.90, lotus:16.50, mydin:15.90}, pricePerUnit:'RM 19.88/kg', savings:'6%', contentScore:82, collabScore:80, popularity:83, imageUrl:'', desc:'Quick-cook instant oats, ready in 90 seconds — a healthy breakfast.' },
  { productId:'PRD-307', id:307, name:"Nestlé Koko Krunch 330g", brand:'Nestlé', category:'Breakfast', icon:'🍫', color:'#4e342e', weight:'330g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 30.00/kg', savings:'9%', contentScore:79, collabScore:77, popularity:84, imageUrl:'', desc:'Cocoa-flavoured cereal pillows, kids love them with cold milk.' },
  { productId:'PRD-308', id:308, name:"Kellogg's Special K 300g", brand:"Kellogg's", category:'Breakfast', icon:'🌾', color:'#fff9c4', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90002', prices:{aeon:12.90, lotus:12.50, mydin:null}, pricePerUnit:'RM 41.67/kg', savings:'3%', contentScore:78, collabScore:76, popularity:76, imageUrl:'', desc:'Light multi-grain flakes for weight-management and healthy breakfast.' },
  { productId:'PRD-309', id:309, name:'Nestlé Milo Breakfast Cereal 330g', brand:'Nestlé', category:'Breakfast', icon:'☕', color:'#4e342e', weight:'330g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 39.09/kg', savings:'7%', contentScore:80, collabScore:78, popularity:82, imageUrl:'', desc:'Crunchy Milo breakfast biscuits enriched with vitamins and minerals.' },
  { productId:'PRD-310', id:310, name:'Bob\'s Red Mill Granola 340g', brand:"Bob's Red Mill", category:'Breakfast', icon:'🥣', color:'#d7ccc8', weight:'340g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90004', prices:{aeon:22.90, lotus:21.90, mydin:null}, pricePerUnit:'RM 64.41/kg', savings:'4%', contentScore:80, collabScore:78, popularity:74, imageUrl:'', desc:'Whole grain oat granola with honey and real nuts, no artificial flavours.' },
  { productId:'PRD-311', id:311, name:'Nestlé Fitnesse Cereal 375g', brand:'Nestlé', category:'Breakfast', icon:'🌾', color:'#f1f8e9', weight:'375g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 34.40/kg', savings:'7%', contentScore:77, collabScore:75, popularity:75, imageUrl:'', desc:'Light cereal with whole wheat flakes and rice crisps, less sugar.' },
  { productId:'PRD-312', id:312, name:'Koko Krunch Duo 330g', brand:'Nestlé', category:'Breakfast', icon:'🍫', color:'#4e342e', weight:'330g', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 36.06/kg', savings:'8%', contentScore:78, collabScore:76, popularity:81, imageUrl:'', desc:'Duo chocolate and vanilla cocoa cereal pillows in one pack.' },
  { productId:'PRD-313', id:313, name:'Quaker Oatmeal Raisin Cookie 340g', brand:'Quaker', category:'Breakfast', icon:'🍪', color:'#d7ccc8', weight:'340g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90003', prices:{aeon:14.90, lotus:14.50, mydin:null}, pricePerUnit:'RM 42.65/kg', savings:'3%', contentScore:76, collabScore:74, popularity:76, imageUrl:'', desc:'Soft and chewy oat cookies with plump raisins, a wholesome snack.' },
  { productId:'PRD-314', id:314, name:'Sunbites Whole Grain Snacks 70g', brand:'Sunbites', category:'Breakfast', icon:'🌾', color:'#fff9c4', weight:'70g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90005', prices:{aeon:5.90, lotus:5.60, mydin:null}, pricePerUnit:'RM 80.00/kg', savings:'5%', contentScore:74, collabScore:72, popularity:73, imageUrl:'', desc:'Baked whole grain snack squares with garden herbs, guilt-free munching.' },
  { productId:'PRD-315', id:315, name:'Nestlé Breakfast Biscuits 225g', brand:'Nestlé', category:'Breakfast', icon:'🍪', color:'#fff8e1', weight:'225g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90001', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 39.56/kg', savings:'10%', contentScore:76, collabScore:74, popularity:77, imageUrl:'', desc:'Whole grain breakfast biscuits, two biscuits = one portion of wholegrain.' },
  { productId:'PRD-316', id:316, name:'Kellogg\'s All Bran 200g', brand:"Kellogg's", category:'Breakfast', icon:'🌾', color:'#d7ccc8', weight:'200g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90002', prices:{aeon:10.90, lotus:10.50, mydin:null}, pricePerUnit:'RM 52.50/kg', savings:'4%', contentScore:75, collabScore:73, popularity:72, imageUrl:'', desc:'High-fibre bran flakes to support digestive health and regularity.' },
  { productId:'PRD-317', id:317, name:'Uncle Toby\'s Nutrigrain 390g', brand:"Uncle Toby's", category:'Breakfast', icon:'🌾', color:'#fff9c4', weight:'390g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90006', prices:{aeon:16.90, lotus:16.50, mydin:null}, pricePerUnit:'RM 42.31/kg', savings:'2%', contentScore:74, collabScore:72, popularity:71, imageUrl:'', desc:'Outer grain, inner fruit cereal bar strips for sustained morning energy.' },
  { productId:'PRD-318', id:318, name:'Milo Nuggets Cereal 170g', brand:'Nestlé Milo', category:'Breakfast', icon:'☕', color:'#4e342e', weight:'170g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-81012', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 46.47/kg', savings:'11%', contentScore:79, collabScore:77, popularity:80, imageUrl:'', desc:'Chocolate malt cereal nuggets, great for breakfast or as an on-the-go snack.' },
  { productId:'PRD-319', id:319, name:'Jordans Country Crisp Raisin 400g', brand:'Jordans', category:'Breakfast', icon:'🍇', color:'#f3e5f5', weight:'400g', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:19.90, lotus:19.50, mydin:null}, pricePerUnit:'RM 48.75/kg', savings:'2%', contentScore:74, collabScore:72, popularity:68, imageUrl:'', desc:'British-style chunky granola clusters with whole grain oats and raisins.' },
  { productId:'PRD-320', id:320, name:'Bear Brand Sterilised Milk 300g', brand:'Nestlé Bear Brand', category:'Breakfast', icon:'🥛', color:'#e3f2fd', weight:'300g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-90007', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 16.33/kg', savings:'11%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Sterilised white milk in a tin can, great emergency pantry staple.' },

  /* BAKERY ×20 (PRD-321 to PRD-340) */
  { productId:'PRD-321', id:321, name:'Gardenia ClassicWhite Bread 400g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#fff8e1', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:3.50, lotus:3.30, mydin:3.10}, pricePerUnit:'RM 7.75/kg', savings:'11%', contentScore:83, collabScore:81, popularity:91, imageUrl:'', desc:'Soft and fluffy white sandwich bread, Malaysia\'s No.1 bread brand.' },
  { productId:'PRD-322', id:322, name:'Gardenia Whole Wheat Bread 400g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#d7ccc8', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:4.50, lotus:4.30, mydin:4.10}, pricePerUnit:'RM 10.25/kg', savings:'9%', contentScore:82, collabScore:80, popularity:86, imageUrl:'', desc:'Nutritious whole wheat bread with added fibre for a healthier choice.' },
  { productId:'PRD-323', id:323, name:'Gardenia Butterscotch Bread 400g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#fff9c4', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:4.90, lotus:4.70, mydin:4.50}, pricePerUnit:'RM 11.25/kg', savings:'8%', contentScore:80, collabScore:78, popularity:85, imageUrl:'', desc:'Soft bread enriched with butterscotch flavour, great toasted with butter.' },
  { productId:'PRD-324', id:324, name:'Massimo White Sandwich Bread 400g', brand:'Massimo', category:'Bakery', icon:'🍞', color:'#fff8e1', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91002', prices:{aeon:3.90, lotus:3.60, mydin:3.40}, pricePerUnit:'RM 8.50/kg', savings:'13%', contentScore:81, collabScore:79, popularity:89, imageUrl:'', desc:'Soft, springy white bread — great for sandwiches and toasts.' },
  { productId:'PRD-325', id:325, name:'Massimo Soft Bun 6pcs', brand:'Massimo', category:'Bakery', icon:'🥐', color:'#fff8e1', weight:'6pcs', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91002', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 0.58/pc', savings:'10%', contentScore:79, collabScore:77, popularity:86, imageUrl:'', desc:'Fluffy sweet buns, perfect for kaya butter or peanut butter sandwiches.' },
  { productId:'PRD-326', id:326, name:'High 5 White Bread 400g', brand:'High 5', category:'Bakery', icon:'🍞', color:'#fff8e1', weight:'400g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-91003', prices:{aeon:3.50, lotus:3.30, mydin:3.10}, pricePerUnit:'RM 7.75/kg', savings:'11%', contentScore:78, collabScore:76, popularity:83, imageUrl:'', desc:'Value-for-money soft white bread from the High 5 brand.' },
  { productId:'PRD-327', id:327, name:'High 5 Roti Gardenia Mix 400g', brand:'High 5', category:'Bakery', icon:'🍞', color:'#d7ccc8', weight:'400g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-91003', prices:{aeon:4.20, lotus:4.00, mydin:3.80}, pricePerUnit:'RM 9.50/kg', savings:'10%', contentScore:76, collabScore:74, popularity:79, imageUrl:'', desc:'Mixed grain soft bread loaf, soft texture with wholesome flavour.' },
  { productId:'PRD-328', id:328, name:'Krafts Cream Cheese Spread 227g', brand:'Kraft', category:'Bakery', icon:'🧀', color:'#fff9c4', weight:'227g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-91004', prices:{aeon:9.90, lotus:9.50, mydin:null}, pricePerUnit:'RM 41.85/kg', savings:'4%', contentScore:78, collabScore:76, popularity:78, imageUrl:'', desc:'Smooth cream cheese for spreading on bagels, crackers and toast.' },
  { productId:'PRD-329', id:329, name:'Gardenia Raisin Loaf 380g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#d7ccc8', weight:'380g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:5.90, lotus:5.60, mydin:5.30}, pricePerUnit:'RM 13.95/kg', savings:'10%', contentScore:78, collabScore:76, popularity:80, imageUrl:'', desc:'Soft bread dotted with plump sultana raisins, mildly sweet.' },
  { productId:'PRD-330', id:330, name:'Massimo Croissant 4pcs', brand:'Massimo', category:'Bakery', icon:'🥐', color:'#fff8e1', weight:'4pcs', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91002', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 1.55/pc', savings:'10%', contentScore:77, collabScore:75, popularity:79, imageUrl:'', desc:'Flaky and buttery croissants, great warm from the oven for breakfast.' },
  { productId:'PRD-331', id:331, name:'Gardenia Twiggies Chocolate 6pcs', brand:'Gardenia', category:'Bakery', icon:'🍫', color:'#4e342e', weight:'6pcs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.82/pc', savings:'11%', contentScore:79, collabScore:77, popularity:83, imageUrl:'', desc:'Sponge Swiss roll filled with smooth chocolate cream, kids\' favourite.' },
  { productId:'PRD-332', id:332, name:'Gardenia Muffin Double Choc 6pcs', brand:'Gardenia', category:'Bakery', icon:'🧁', color:'#4e342e', weight:'6pcs', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:7.90, lotus:7.50, mydin:7.00}, pricePerUnit:'RM 1.17/pc', savings:'11%', contentScore:78, collabScore:76, popularity:81, imageUrl:'', desc:'Rich double chocolate muffins with real chocolate chips inside.' },
  { productId:'PRD-333', id:333, name:'Hup Seng Biscuits Tin Assorted 700g', brand:'Hup Seng', category:'Bakery', icon:'🍪', color:'#fff8e1', weight:'700g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-PRK-2022-91005', prices:{aeon:19.90, lotus:19.50, mydin:18.90}, pricePerUnit:'RM 27.00/kg', savings:'5%', contentScore:79, collabScore:77, popularity:82, imageUrl:'', desc:'Classic assorted biscuit tin great for entertaining and gifting.' },
  { productId:'PRD-334', id:334, name:'Sarawak Kek Lapis Layered Cake 300g', brand:'Dayang Salhah', category:'Bakery', icon:'🎂', color:'#ffe0b2', weight:'300g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SWK-2022-91006', prices:{aeon:35.90, lotus:33.90, mydin:null}, pricePerUnit:'RM 113.00/kg', savings:'6%', contentScore:83, collabScore:81, popularity:78, imageUrl:'', desc:'Authentic Sarawak kek lapis with intricate layered pattern, premium gift.' },
  { productId:'PRD-335', id:335, name:'Massimo Mini Sausage Roll 4pcs', brand:'Massimo', category:'Bakery', icon:'🌭', color:'#ffe0b2', weight:'4pcs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91002', prices:{aeon:5.90, lotus:5.60, mydin:5.30}, pricePerUnit:'RM 1.33/pc', savings:'10%', contentScore:76, collabScore:74, popularity:78, imageUrl:'', desc:'Soft bread rolls with savoury chicken sausage filling.' },
  { productId:'PRD-336', id:336, name:'Gardenia Toast Premium White 600g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#fff8e1', weight:'600g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:6.90, lotus:6.50, mydin:6.20}, pricePerUnit:'RM 10.33/kg', savings:'10%', contentScore:80, collabScore:78, popularity:84, imageUrl:'', desc:'Thick-sliced premium white bread ideal for toast and grilled sandwiches.' },
  { productId:'PRD-337', id:337, name:'Wonda Coffee Mini Bun 6pcs', brand:'Wonda', category:'Bakery', icon:'☕', color:'#d7ccc8', weight:'6pcs', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-91007', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.82/pc', savings:'11%', contentScore:74, collabScore:72, popularity:76, imageUrl:'', desc:'Soft mini buns with coffee-flavoured cream filling.' },
  { productId:'PRD-338', id:338, name:'Massimo Hotdog Bun 6pcs', brand:'Massimo', category:'Bakery', icon:'🌭', color:'#fff8e1', weight:'6pcs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91002', prices:{aeon:3.90, lotus:3.70, mydin:3.50}, pricePerUnit:'RM 0.58/pc', savings:'10%', contentScore:76, collabScore:74, popularity:79, imageUrl:'', desc:'Soft elongated buns for hotdogs and sausages, lightly sweetened.' },
  { productId:'PRD-339', id:339, name:'Hwa Tai Snack Crackers 200g', brand:'Hwa Tai', category:'Bakery', icon:'🍘', color:'#fff8e1', weight:'200g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-91008', prices:{aeon:4.50, lotus:4.20, mydin:3.90}, pricePerUnit:'RM 19.50/kg', savings:'13%', contentScore:72, collabScore:70, popularity:76, imageUrl:'', desc:'Crisp savoury crackers for snacking or pairing with dips and cheese.' },
  { productId:'PRD-340', id:340, name:'Gardenia Multigrain Loaf 400g', brand:'Gardenia', category:'Bakery', icon:'🍞', color:'#d7ccc8', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-91001', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 12.25/kg', savings:'11%', contentScore:79, collabScore:77, popularity:81, imageUrl:'', desc:'Hearty multigrain bread with seeds and whole grains for added nutrition.' },

  /* PERSONAL CARE ×16 (PRD-341 to PRD-356) */
  { productId:'PRD-341', id:341, name:'Colgate Total Toothpaste 150g', brand:'Colgate', category:'Personal Care', icon:'🪥', color:'#e3f2fd', weight:'150g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-92001', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 52.67/kg', savings:'11%', contentScore:80, collabScore:78, popularity:88, imageUrl:'', desc:'12-hour complete protection toothpaste against germs and cavities.' },
  { productId:'PRD-342', id:342, name:'Darlie All Shiny White Toothpaste 160g', brand:'Darlie', category:'Personal Care', icon:'🪥', color:'#fafafa', weight:'160g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-92002', prices:{aeon:7.90, lotus:7.50, mydin:6.90}, pricePerUnit:'RM 43.13/kg', savings:'13%', contentScore:78, collabScore:76, popularity:84, imageUrl:'', desc:'Whitening toothpaste for visibly whiter teeth in 2 weeks.' },
  { productId:'PRD-343', id:343, name:'Oral B Toothbrush Medium 2pcs', brand:'Oral-B', category:'Personal Care', icon:'🪥', color:'#e3f2fd', weight:'2pcs', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 3.95/pc', savings:'11%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Classic manual toothbrush with cross-action bristles for plaque removal.' },
  { productId:'PRD-344', id:344, name:'Listerine Cool Mint Mouthwash 250ml', brand:'Listerine', category:'Personal Care', icon:'💧', color:'#e3f2fd', weight:'250ml', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-92003', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 47.60/L', savings:'8%', contentScore:78, collabScore:76, popularity:82, imageUrl:'', desc:'Antibacterial mint mouthwash that kills 99.9% of bad breath germs.' },
  { productId:'PRD-345', id:345, name:'Pantene Shampoo Total Damage Care 340ml', brand:'Pantene', category:'Personal Care', icon:'🧴', color:'#fff9c4', weight:'340ml', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:19.90, lotus:18.90, mydin:17.90}, pricePerUnit:'RM 52.65/L', savings:'10%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Total damage care shampoo for smooth, strong and healthy hair.' },
  { productId:'PRD-346', id:346, name:'Rejoice 3in1 Shampoo 320ml', brand:'Rejoice', category:'Personal Care', icon:'🧴', color:'#f3e5f5', weight:'320ml', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:13.90, lotus:13.50, mydin:12.90}, pricePerUnit:'RM 40.31/L', savings:'7%', contentScore:75, collabScore:73, popularity:81, imageUrl:'', desc:'3-in-1 shampoo, conditioner and treatment in one step for busy mornings.' },
  { productId:'PRD-347', id:347, name:'Dove Body Wash Sensitive 550ml', brand:'Dove', category:'Personal Care', icon:'🧴', color:'#fafafa', weight:'550ml', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:19.90, lotus:18.90, mydin:17.90}, pricePerUnit:'RM 32.55/L', savings:'10%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Gentle moisturising body wash with Dove signature 1/4 moisturising cream.' },
  { productId:'PRD-348', id:348, name:'Safeguard Antibacterial Bar Soap 135g×3', brand:'Safeguard', category:'Personal Care', icon:'🧼', color:'#e3f2fd', weight:'3×135g', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-92004', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 21.98/kg', savings:'10%', contentScore:77, collabScore:75, popularity:85, imageUrl:'', desc:'Antibacterial bar soap that protects against 99.9% of germs.' },
  { productId:'PRD-349', id:349, name:'Dettol Antiseptic Liquid 250ml', brand:'Dettol', category:'Personal Care', icon:'🧴', color:'#f1f8e9', weight:'250ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-92005', prices:{aeon:11.90, lotus:11.50, mydin:10.90}, pricePerUnit:'RM 43.60/L', savings:'8%', contentScore:79, collabScore:77, popularity:83, imageUrl:'', desc:'Original Dettol antiseptic liquid for cuts, wounds and surface disinfection.' },
  { productId:'PRD-350', id:350, name:'Nivea Men Face Wash 100ml', brand:'Nivea', category:'Personal Care', icon:'🧴', color:'#e3f2fd', weight:'100ml', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:14.90, lotus:13.90, mydin:null}, pricePerUnit:'RM 139.00/L', savings:'7%', contentScore:74, collabScore:72, popularity:77, imageUrl:'', desc:'Deep-cleaning men\'s face wash with active charcoal for clear skin.' },
  { productId:'PRD-351', id:351, name:'Simple Kind to Skin Moisturiser 125ml', brand:'Simple', category:'Personal Care', icon:'🧴', color:'#f1f8e9', weight:'125ml', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:21.90, lotus:20.90, mydin:null}, pricePerUnit:'RM 167.20/L', savings:'5%', contentScore:73, collabScore:71, popularity:73, imageUrl:'', desc:'Gentle fragrance-free moisturiser for sensitive skin, dermatologist tested.' },
  { productId:'PRD-352', id:352, name:'Safi Balqis Skincare Face Wash 100g', brand:'Safi', category:'Personal Care', icon:'🧴', color:'#f3e5f5', weight:'100g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-92006', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 119.00/kg', savings:'8%', contentScore:80, collabScore:78, popularity:80, imageUrl:'', desc:'Halal-certified face wash with black seed extract for radiant skin.' },
  { productId:'PRD-353', id:353, name:'Safi Rania Gold Serum 30ml', brand:'Safi', category:'Personal Care', icon:'✨', color:'#fff9c4', weight:'30ml', store:'AEON', discount:'10%', halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-92006', prices:{aeon:39.90, lotus:38.90, mydin:null}, pricePerUnit:'RM 1296.67/L', savings:'3%', contentScore:81, collabScore:79, popularity:76, imageUrl:'', desc:'Anti-aging gold serum with 24K gold and royal jelly, halal certified.' },
  { productId:'PRD-354', id:354, name:'Bioessence Bird\'s Nest Whitening Cream 50g', brand:'Bioessence', category:'Personal Care', icon:'🧴', color:'#fff8e1', weight:'50g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-92007', prices:{aeon:24.90, lotus:23.90, mydin:null}, pricePerUnit:'RM 478.00/kg', savings:'4%', contentScore:76, collabScore:74, popularity:74, imageUrl:'', desc:'Bird\'s nest extract whitening day cream for a brighter complexion.' },
  { productId:'PRD-355', id:355, name:'Vaseline Intensive Care Lotion 400ml', brand:'Vaseline', category:'Personal Care', icon:'🧴', color:'#e3f2fd', weight:'400ml', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:16.90, lotus:15.90, mydin:14.90}, pricePerUnit:'RM 37.25/L', savings:'12%', contentScore:75, collabScore:73, popularity:80, imageUrl:'', desc:'Deep moisturising body lotion that repairs dry skin in just 5 days.' },
  { productId:'PRD-356', id:356, name:'Gatsby Facial Wash 100g', brand:'Gatsby', category:'Personal Care', icon:'🧴', color:'#e3f2fd', weight:'100g', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 89.00/kg', savings:'10%', contentScore:72, collabScore:70, popularity:76, imageUrl:'', desc:'Oil-control facial wash for men, keeps skin matte and fresh all day.' },

  /* HOUSEHOLD ×16 (PRD-357 to PRD-372) */
  { productId:'PRD-357', id:357, name:'Breeze Laundry Powder 2.5kg', brand:'Breeze', category:'Household', icon:'🧺', color:'#e3f2fd', weight:'2.5kg', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-93001', prices:{aeon:22.90, lotus:21.90, mydin:20.90}, pricePerUnit:'RM 8.36/kg', savings:'9%', contentScore:78, collabScore:76, popularity:86, imageUrl:'', desc:'Powerful laundry powder that removes tough stains in cold water.' },
  { productId:'PRD-358', id:358, name:'Dynamo Liquid Detergent 1.6L', brand:'Dynamo', category:'Household', icon:'🧺', color:'#e3f2fd', weight:'1.6L', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-93002', prices:{aeon:22.90, lotus:21.90, mydin:20.90}, pricePerUnit:'RM 13.06/L', savings:'9%', contentScore:77, collabScore:75, popularity:84, imageUrl:'', desc:'Concentrated liquid detergent for front and top-load washing machines.' },
  { productId:'PRD-359', id:359, name:'Ariel Laundry Pods 12s', brand:'Ariel', category:'Household', icon:'🧺', color:'#e3f2fd', weight:'12pods', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:24.90, lotus:23.90, mydin:null}, pricePerUnit:'RM 1.99/pod', savings:'4%', contentScore:75, collabScore:73, popularity:77, imageUrl:'', desc:'Pre-measured laundry pods for hassle-free washing, no measuring needed.' },
  { productId:'PRD-360', id:360, name:'Magiclean Floor Cleaner 1L', brand:'Magiclean', category:'Household', icon:'🧹', color:'#f1f8e9', weight:'1L', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-93003', prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 7.90/L', savings:'11%', contentScore:76, collabScore:74, popularity:82, imageUrl:'', desc:'Anti-bacterial floor cleaner leaves floors shiny and germ-free.' },
  { productId:'PRD-361', id:361, name:'Dettol Floor Cleaner 900ml', brand:'Dettol', category:'Household', icon:'🧹', color:'#f1f8e9', weight:'900ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-93004', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 13.22/L', savings:'8%', contentScore:79, collabScore:77, popularity:84, imageUrl:'', desc:'Hospital-grade Dettol floor cleaner that kills 99.9% of bacteria.' },
  { productId:'PRD-362', id:362, name:'Fairy Dishwashing Liquid 400ml', brand:'Fairy', category:'Household', icon:'🍽️', color:'#f1f8e9', weight:'400ml', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:null}, pricePerUnit:'RM 23.75/L', savings:'4%', contentScore:73, collabScore:71, popularity:76, imageUrl:'', desc:'Long-lasting dishwashing liquid that cuts through grease effortlessly.' },
  { productId:'PRD-363', id:363, name:'Mama Lemon Lime Dishwash 400ml', brand:'Mama Lemon', category:'Household', icon:'🍋', color:'#fff9c4', weight:'400ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-SL-2022-93005', prices:{aeon:5.90, lotus:5.60, mydin:5.20}, pricePerUnit:'RM 13.00/L', savings:'12%', contentScore:75, collabScore:73, popularity:82, imageUrl:'', desc:'Lemon-scented dishwashing liquid that removes oil and odours.' },
  { productId:'PRD-364', id:364, name:'Scotch Brite Scrub Sponge 3pcs', brand:'Scotch-Brite', category:'Household', icon:'🧽', color:'#fff9c4', weight:'3pcs', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:5.90, lotus:5.60, mydin:4.90}, pricePerUnit:'RM 1.63/pc', savings:'17%', contentScore:70, collabScore:68, popularity:80, imageUrl:'', desc:'Durable dual-sided scrub sponge for dishes, pots and hard surfaces.' },
  { productId:'PRD-365', id:365, name:'Clorox Bleach 1L', brand:'Clorox', category:'Household', icon:'🧴', color:'#fafafa', weight:'1L', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 7.90/L', savings:'11%', contentScore:70, collabScore:68, popularity:75, imageUrl:'', desc:'Bleach solution for whitening, disinfecting and mould removal.' },
  { productId:'PRD-366', id:366, name:'Febreze Air Freshener 300ml', brand:'Febreze', category:'Household', icon:'🌸', color:'#f3e5f5', weight:'300ml', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:15.90, lotus:15.50, mydin:null}, pricePerUnit:'RM 51.67/L', savings:'3%', contentScore:72, collabScore:70, popularity:76, imageUrl:'', desc:'Fabric spray that eliminates odours and leaves a fresh clean scent.' },
  { productId:'PRD-367', id:367, name:'Glad Garbage Bags Medium 30L 30pcs', brand:'Glad', category:'Household', icon:'🛍️', color:'#4e342e', weight:'30pcs', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 0.30/bag', savings:'10%', contentScore:68, collabScore:66, popularity:79, imageUrl:'', desc:'Heavy-duty garbage bags with tie handles, won\'t leak or tear.' },
  { productId:'PRD-368', id:368, name:'Downy Fabric Softener 2L', brand:'Downy', category:'Household', icon:'🌸', color:'#f3e5f5', weight:'2L', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:18.90, lotus:17.90, mydin:16.90}, pricePerUnit:'RM 8.45/L', savings:'11%', contentScore:74, collabScore:72, popularity:80, imageUrl:'', desc:'Fabric conditioner that softens clothes and imparts long-lasting freshness.' },
  { productId:'PRD-369', id:369, name:'Sunlight Dishwash Lemon 500ml', brand:'Sunlight', category:'Household', icon:'🍋', color:'#fff9c4', weight:'500ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-93006', prices:{aeon:6.90, lotus:6.50, mydin:5.90}, pricePerUnit:'RM 11.80/L', savings:'15%', contentScore:74, collabScore:72, popularity:81, imageUrl:'', desc:'Budget-friendly lemon dishwashing liquid for everyday use.' },
  { productId:'PRD-370', id:370, name:'Dettol Handwash Liquid Pump 250ml', brand:'Dettol', category:'Household', icon:'🧴', color:'#f1f8e9', weight:'250ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-93004', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 39.60/L', savings:'9%', contentScore:79, collabScore:77, popularity:85, imageUrl:'', desc:'Antibacterial hand wash that kills 99.9% of germs, with moisturisers.' },
  { productId:'PRD-371', id:371, name:'Breeze Colour Protect Liquid 1.6L', brand:'Breeze', category:'Household', icon:'🧺', color:'#f3e5f5', weight:'1.6L', store:'AEON', discount:'5%', halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-93001', prices:{aeon:21.90, lotus:20.90, mydin:19.90}, pricePerUnit:'RM 12.44/L', savings:'9%', contentScore:76, collabScore:74, popularity:80, imageUrl:'', desc:'Colour-protect liquid detergent that keeps bright clothes vibrant.' },
  { productId:'PRD-372', id:372, name:'Glad Wrap Cling Film 30m', brand:'Glad', category:'Household', icon:'🥗', color:'#e3f2fd', weight:'30m', store:'AEON', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:7.90, lotus:7.50, mydin:null}, pricePerUnit:'RM 0.25/m', savings:'5%', contentScore:67, collabScore:65, popularity:74, imageUrl:'', desc:'BPA-free cling wrap for covering bowls, wrapping food for storage.' },

  /* HEALTH ×14 (PRD-373 to PRD-386) */
  { productId:'PRD-373', id:373, name:'Appeton Weight Gain Adult 450g', brand:'Appeton', category:'Health', icon:'💊', color:'#d1fae5', weight:'450g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94001', prices:{aeon:52.90, lotus:51.90, mydin:49.90}, pricePerUnit:'RM 110.89/kg', savings:'6%', contentScore:77, collabScore:75, popularity:72, imageUrl:'', desc:'High-protein weight gain supplement with 28 vitamins and minerals.' },
  { productId:'PRD-374', id:374, name:'Appeton Multivitamin Kids Chewable 60s', brand:'Appeton', category:'Health', icon:'🍊', color:'#fff9c4', weight:'60tabs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94001', prices:{aeon:28.90, lotus:27.90, mydin:26.90}, pricePerUnit:'RM 0.45/tab', savings:'7%', contentScore:80, collabScore:78, popularity:76, imageUrl:'', desc:'Chewable multivitamin tablets for kids with 12 essential vitamins.' },
  { productId:'PRD-375', id:375, name:'Scott\'s DHA Gummies 60s', brand:"Scott's", category:'Health', icon:'🐟', color:'#e3f2fd', weight:'60gummies', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94002', prices:{aeon:34.90, lotus:33.90, mydin:32.90}, pricePerUnit:'RM 0.55/gummy', savings:'6%', contentScore:82, collabScore:80, popularity:78, imageUrl:'', desc:'DHA omega-3 gummies for children\'s brain development and memory support.' },
  { productId:'PRD-376', id:376, name:'Redoxon Triple Action Vitamin C 30s', brand:'Redoxon', category:'Health', icon:'🍊', color:'#fff9c4', weight:'30tabs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94003', prices:{aeon:34.90, lotus:33.90, mydin:32.90}, pricePerUnit:'RM 1.10/tab', savings:'6%', contentScore:80, collabScore:78, popularity:77, imageUrl:'', desc:'Effervescent Vitamin C + Zinc + Vitamin D for immune support.' },
  { productId:'PRD-377', id:377, name:'Nestlé Boost Diabetic Nutrition 400g', brand:'Nestlé', category:'Health', icon:'💊', color:'#d1fae5', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94004', prices:{aeon:44.90, lotus:43.90, mydin:42.90}, pricePerUnit:'RM 107.25/kg', savings:'4%', contentScore:78, collabScore:76, popularity:70, imageUrl:'', desc:'Specially formulated nutrition powder for people with diabetes.' },
  { productId:'PRD-378', id:378, name:'Brands Essence of Chicken 68ml×6', brand:"Brand's", category:'Health', icon:'🍗', color:'#ffe0b2', weight:'6×68ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-KV-2022-94005', prices:{aeon:38.90, lotus:37.90, mydin:36.90}, pricePerUnit:'RM 0.92/bottle', savings:'5%', contentScore:81, collabScore:79, popularity:79, imageUrl:'', desc:'Pure chicken essence for energy, focus and recovery, no fat or cholesterol.' },
  { productId:'PRD-379', id:379, name:'Scott\'s Emulsion Cod Liver Oil 400ml', brand:"Scott's", category:'Health', icon:'🐟', color:'#fff9c4', weight:'400ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94002', prices:{aeon:28.90, lotus:27.90, mydin:26.90}, pricePerUnit:'RM 67.25/L', savings:'7%', contentScore:79, collabScore:77, popularity:76, imageUrl:'', desc:'Orange-flavoured cod liver oil with Vitamin A and D for healthy growth.' },
  { productId:'PRD-380', id:380, name:'Neurogain Brain Health 30s', brand:'Neurogain', category:'Health', icon:'🧠', color:'#f3e5f5', weight:'30caps', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94006', prices:{aeon:62.90, lotus:60.90, mydin:null}, pricePerUnit:'RM 2.03/cap', savings:'3%', contentScore:74, collabScore:72, popularity:68, imageUrl:'', desc:'Phosphatidylserine brain health supplement to support memory and focus.' },
  { productId:'PRD-381', id:381, name:'Enervon Multivitamin C 30s', brand:'Enervon', category:'Health', icon:'🍊', color:'#fff9c4', weight:'30tabs', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94007', prices:{aeon:22.90, lotus:21.90, mydin:20.90}, pricePerUnit:'RM 0.70/tab', savings:'9%', contentScore:76, collabScore:74, popularity:74, imageUrl:'', desc:'Vitamin C + B-complex multivitamin for sustained energy and immunity.' },
  { productId:'PRD-382', id:382, name:'Biogesic Paracetamol 500mg 20s', brand:'Biogesic', category:'Health', icon:'💊', color:'#d1fae5', weight:'20tabs', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94008', prices:{aeon:5.50, lotus:5.20, mydin:4.90}, pricePerUnit:'RM 0.25/tab', savings:'11%', contentScore:72, collabScore:70, popularity:83, imageUrl:'', desc:'Paracetamol for fast and effective relief of fever and headaches.' },
  { productId:'PRD-383', id:383, name:'Tiger Balm White 10g', brand:'Tiger Balm', category:'Health', icon:'🐯', color:'#fafafa', weight:'10g', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 790.00/kg', savings:'11%', contentScore:71, collabScore:69, popularity:78, imageUrl:'', desc:'Aromatic herbal balm for headaches, muscle aches and insect bites.' },
  { productId:'PRD-384', id:384, name:'Mopiko Itch Relief Cream 20g', brand:'Mopiko', category:'Health', icon:'🧴', color:'#d1fae5', weight:'20g', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:7.90, lotus:7.50, mydin:6.90}, pricePerUnit:'RM 345.00/kg', savings:'13%', contentScore:70, collabScore:68, popularity:77, imageUrl:'', desc:'Japan-formulated itch relief cream for mosquito bites and skin irritation.' },
  { productId:'PRD-385', id:385, name:'Gaviscon Antacid 150ml', brand:'Gaviscon', category:'Health', icon:'🍵', color:'#fafafa', weight:'150ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94009', prices:{aeon:21.90, lotus:20.90, mydin:null}, pricePerUnit:'RM 139.33/L', savings:'5%', contentScore:71, collabScore:69, popularity:70, imageUrl:'', desc:'Antacid and alginate for fast heartburn and indigestion relief.' },
  { productId:'PRD-386', id:386, name:'Predavin Children Syrup 60ml', brand:'Predavin', category:'Health', icon:'💊', color:'#fff9c4', weight:'60ml', store:'Mydin', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-94010', prices:{aeon:12.90, lotus:12.50, mydin:11.90}, pricePerUnit:'RM 198.33/L', savings:'8%', contentScore:70, collabScore:68, popularity:71, imageUrl:'', desc:'Multivitamin syrup for children to support growth and development.' },

  /* BABY & KIDS ×14 (PRD-387 to PRD-400) */
  { productId:'PRD-387', id:387, name:'Dumex Dugro Step 3 Growing Up Milk 800g', brand:'Dumex', category:'Baby & Kids', icon:'👶', color:'#e3f2fd', weight:'800g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95001', prices:{aeon:62.90, lotus:61.90, mydin:59.90}, pricePerUnit:'RM 74.88/kg', savings:'5%', contentScore:82, collabScore:80, popularity:76, imageUrl:'', desc:'Growing-up milk with DHA and prebiotics for toddlers 1-3 years.' },
  { productId:'PRD-388', id:388, name:'Frisolac Gold Step 1 Infant Formula 400g', brand:'Friso', category:'Baby & Kids', icon:'👶', color:'#fff9c4', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95002', prices:{aeon:69.90, lotus:68.90, mydin:null}, pricePerUnit:'RM 172.25/kg', savings:'1%', contentScore:83, collabScore:81, popularity:74, imageUrl:'', desc:'Step 1 infant formula with LockNutri for 0-6 month babies.' },
  { productId:'PRD-389', id:389, name:'Heinz Baby Cereal Rice 125g', brand:'Heinz', category:'Baby & Kids', icon:'🥣', color:'#fff9c4', weight:'125g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95003', prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 71.20/kg', savings:'10%', contentScore:79, collabScore:77, popularity:73, imageUrl:'', desc:'Iron-fortified rice baby cereal for 4+ months weaning stage.' },
  { productId:'PRD-390', id:390, name:'Nestlé Cerelac Wheat Honey 250g', brand:'Nestlé', category:'Baby & Kids', icon:'🥣', color:'#fff9c4', weight:'250g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95004', prices:{aeon:18.90, lotus:17.90, mydin:16.90}, pricePerUnit:'RM 67.60/kg', savings:'11%', contentScore:80, collabScore:78, popularity:74, imageUrl:'', desc:'Baby wheat cereal with honey taste, fortified with 18 nutrients.' },
  { productId:'PRD-391', id:391, name:'Pampers Active Baby Dry M 58pcs', brand:'Pampers', category:'Baby & Kids', icon:'🍼', color:'#e3f2fd', weight:'58pcs', store:'AEON', discount:'10%', halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:56.90, lotus:54.90, mydin:52.90}, pricePerUnit:'RM 0.91/pc', savings:'7%', contentScore:81, collabScore:79, popularity:80, imageUrl:'', desc:'Breathable diapers with up to 12-hour dryness for active babies.' },
  { productId:'PRD-392', id:392, name:'Drypers Wee Wee Dry M 50pcs', brand:'Drypers', category:'Baby & Kids', icon:'🍼', color:'#e3f2fd', weight:'50pcs', store:'Mydin', discount:null, halal:false, halalStatus:'Not Certified', jakimNo:null, prices:{aeon:39.90, lotus:38.90, mydin:36.90}, pricePerUnit:'RM 0.74/pc', savings:'8%', contentScore:78, collabScore:76, popularity:78, imageUrl:'', desc:'Value Malaysian diapers brand with soft cotton feel and leak protection.' },
  { productId:'PRD-393', id:393, name:'Johnson\'s Baby Shampoo 200ml', brand:"Johnson's", category:'Baby & Kids', icon:'🧴', color:'#fff9c4', weight:'200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95005', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 49.50/L', savings:'9%', contentScore:82, collabScore:80, popularity:82, imageUrl:'', desc:'Gentle no more tears baby shampoo, clinically proven mild formula.' },
  { productId:'PRD-394', id:394, name:'Johnson\'s Baby Body Wash 200ml', brand:"Johnson's", category:'Baby & Kids', icon:'🧴', color:'#e3f2fd', weight:'200ml', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95005', prices:{aeon:10.90, lotus:10.50, mydin:9.90}, pricePerUnit:'RM 49.50/L', savings:'9%', contentScore:81, collabScore:79, popularity:81, imageUrl:'', desc:'Gentle and mild body wash for baby\'s delicate skin, dermatologist tested.' },
  { productId:'PRD-395', id:395, name:'Farley\'s Rusks Biscuit 150g', brand:"Farley's", category:'Baby & Kids', icon:'🍪', color:'#fff8e1', weight:'150g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95006', prices:{aeon:14.90, lotus:14.50, mydin:13.90}, pricePerUnit:'RM 92.67/kg', savings:'7%', contentScore:76, collabScore:74, popularity:71, imageUrl:'', desc:'Classic Farley\'s rusk biscuits for babies transitioning to solid food.' },
  { productId:'PRD-396', id:396, name:'Nestlé Nan Optipro Step 2 800g', brand:'Nestlé', category:'Baby & Kids', icon:'👶', color:'#fff9c4', weight:'800g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95007', prices:{aeon:89.90, lotus:87.90, mydin:84.90}, pricePerUnit:'RM 106.13/kg', savings:'6%', contentScore:83, collabScore:81, popularity:73, imageUrl:'', desc:'Step 2 follow-on formula for 6-12 month infants, with Optipro proteins.' },
  { productId:'PRD-397', id:397, name:'Wyeth S-26 Gold Step 3 900g', brand:'Wyeth', category:'Baby & Kids', icon:'👶', color:'#e3f2fd', weight:'900g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95008', prices:{aeon:98.90, lotus:96.90, mydin:null}, pricePerUnit:'RM 107.67/kg', savings:'2%', contentScore:82, collabScore:80, popularity:72, imageUrl:'', desc:'Growing up milk with DHA and ARA for toddlers 1-3 years.' },
  { productId:'PRD-398', id:398, name:'Pigeon Baby Wipes 80pcs', brand:'Pigeon', category:'Baby & Kids', icon:'🧻', color:'#fafafa', weight:'80pcs', store:'AEON', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:9.90, lotus:9.50, mydin:8.90}, pricePerUnit:'RM 0.11/pc', savings:'10%', contentScore:74, collabScore:72, popularity:78, imageUrl:'', desc:'Fragrance-free baby wipes for sensitive skin, 99% pure water.' },
  { productId:'PRD-399', id:399, name:'Kodomo Baby Lotion 200ml', brand:'Kodomo', category:'Baby & Kids', icon:'🧴', color:'#e3f2fd', weight:'200ml', store:'Mydin', discount:null, halal:null, halalStatus:'Unknown', jakimNo:null, prices:{aeon:8.90, lotus:8.50, mydin:7.90}, pricePerUnit:'RM 39.50/L', savings:'11%', contentScore:72, collabScore:70, popularity:76, imageUrl:'', desc:'Gentle baby lotion that moisturises and softens delicate baby skin.' },
  { productId:'PRD-400', id:400, name:'Nestlé NAN HA Step 1 400g', brand:'Nestlé', category:'Baby & Kids', icon:'👶', color:'#f1f8e9', weight:'400g', store:'AEON', discount:null, halal:true, halalStatus:'Certified', jakimNo:'MY-WJ-2022-95009', prices:{aeon:74.90, lotus:72.90, mydin:null}, pricePerUnit:'RM 182.25/kg', savings:'3%', contentScore:82, collabScore:80, popularity:71, imageUrl:'', desc:'Hypoallergenic Step 1 formula for 0-6 month babies with reduced allergy risk.' },
];

/* ── Hybrid Score Computation (per report: 0.9 × max(CBF, CF) + 0.1 × popularity) ── */
function computeHybridScore(item) {
  const baseScore = Math.max(item.contentScore, item.collabScore);
  return Math.round(0.9 * baseScore + 0.1 * item.popularity);
}

/* Enrich GROCERY_DATA with computed hybrid score and computed savings % */
/* ── Enrich helper: compute score + savings on any array of products ── */
function enrichProducts(arr) {
  arr.forEach(g => {
    g.score = computeHybridScore(g);
    const vals = [g.prices.aeon, g.prices.lotus, g.prices.mydin].filter(v => v !== null && v !== undefined);
    if (vals.length > 1) {
      const maxP = Math.max(...vals);
      const minP = Math.min(...vals);
      g.savings = Math.round(((maxP - minP) / maxP) * 100) + '%';
    } else {
      g.savings = g.savings || '0%';
    }
  });
}

/* Enrich the static data immediately on load */
enrichProducts(GROCERY_DATA);

/* Keep a snapshot of the static data — used as offline fallback and by seed.html */
const STATIC_GROCERY_DATA = GROCERY_DATA.map(g => Object.assign({}, g));

/* ============================================================
   FIRESTORE DATA LOADER
   Fetches the latest product data from Firebase Firestore.
   Falls back to STATIC_GROCERY_DATA if offline or not configured.
   ============================================================ */
async function loadGroceryData() {
  if (!_db) {
    /* Firebase not configured — use static fallback silently */
    GROCERY_DATA = STATIC_GROCERY_DATA.slice();
    _resolveDataReady(GROCERY_DATA);
    return;
  }

  try {
    const snap = await _db.collection('products').orderBy('id').get();

    if (snap.empty) {
      /* Firestore collection is empty — use static fallback */
      console.info('HalalSaver: Firestore "products" collection is empty. Using static data. Run seed.html to upload products.');
      GROCERY_DATA = STATIC_GROCERY_DATA.slice();
    } else {
      /* Populate from Firestore and re-enrich scores */
      GROCERY_DATA = snap.docs.map(d => d.data());
      enrichProducts(GROCERY_DATA);
      console.info(`HalalSaver: Loaded ${GROCERY_DATA.length} products from Firestore.`);
    }
  } catch (err) {
    /* Network / permission error — fall back to static data */
    console.warn('HalalSaver: Firestore load failed, using static data.', err.message);
    GROCERY_DATA = STATIC_GROCERY_DATA.slice();
  }

  _resolveDataReady(GROCERY_DATA);
}

/* ============================================================
   JAKIM HALAL CERTIFICATION DATA
   ⚠ Simulated JAKIM verification data — for academic/FYP use only.
   In a production system this would query the official JAKIM portal:
   https://www.halal.gov.my/v4/index.php/ms/semak-sijil-halal
   Cert period: JAKIM typically issues 2-year certificates.
   ============================================================ */
const JAKIM_CERT_DATA = {
  'MY-WJ-2021-01234': { certStart:'2024-03-10', certExpiry:'2026-03-09', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2021-01235': { certStart:'2024-03-10', certExpiry:'2026-03-09', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2020-11111': { certStart:'2024-07-01', certExpiry:'2026-06-30', body:'JAKIM – Selangor' },
  'MY-KV-2019-05678': { certStart:'2025-06-15', certExpiry:'2027-06-14', body:'JAKIM – Selangor' },
  'MY-KV-2021-05999': { certStart:'2025-02-20', certExpiry:'2027-02-19', body:'JAKIM – Selangor' },
  'MY-KV-2020-06100': { certStart:'2024-08-01', certExpiry:'2026-07-31', body:'JAKIM – Selangor' },
  'MY-KV-2020-09876': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-KV-2019-33333': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Selangor' },
  'MY-SL-2020-45678': { certStart:'2024-09-12', certExpiry:'2026-09-11', body:'JAKIM – Selangor' },
  'MY-KV-2021-44444': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-KV-2019-55555': { certStart:'2024-11-01', certExpiry:'2026-10-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-34567': { certStart:'2025-01-10', certExpiry:'2027-01-09', body:'JAKIM – Selangor' },
  'MY-SL-2019-77777': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2018-88888': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-WJ-2020-99999': { certStart:'2024-11-15', certExpiry:'2026-11-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-JH-2021-78901': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Johor' },
  'MY-KV-2020-12345': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-22222': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-KV-2018-23456': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-24680': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-SL-2019-13579': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-66666': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2019-56789': { certStart:'2025-08-15', certExpiry:'2027-08-14', body:'JAKIM – Selangor' },
  'MY-KV-2020-34321': { certStart:'2024-10-01', certExpiry:'2026-09-30', body:'JAKIM – Selangor' },
  'MY-KV-2021-43210': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-KV-2018-67890': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-KV-2020-11223': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2019-33445': { certStart:'2024-12-01', certExpiry:'2026-11-30', body:'JAKIM – Selangor' },
  'MY-KV-2021-55667': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-KV-2020-66778': { certStart:'2024-12-01', certExpiry:'2026-11-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-77889': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2021-99001': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-00123': { certStart:'2025-03-15', certExpiry:'2027-03-14', body:'JAKIM – Selangor' },
  'MY-SL-2022-11223': { certStart:'2025-01-05', certExpiry:'2027-01-04', body:'JAKIM – Selangor' },
  'MY-SL-2022-11224': { certStart:'2025-01-05', certExpiry:'2027-01-04', body:'JAKIM – Selangor' },
  'MY-SL-2022-11225': { certStart:'2025-01-05', certExpiry:'2027-01-04', body:'JAKIM – Selangor' },
  'MY-SL-2022-11226': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-55001': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KDH-2022-33001': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Kedah' },
  'MY-KV-2021-55002': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-JH-2021-66001': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Johor' },
  'MY-KV-2022-77001': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2021-88001': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  /* Extended dataset — PRD-056 to PRD-080 */
  'MY-KV-2021-56001': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-KV-2020-56002': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-PRK-2021-56003': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Perak' },
  'MY-PNG-2020-56004': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Pulau Pinang' },
  'MY-SL-2022-56005': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-SL-2020-56006': { certStart:'2024-10-01', certExpiry:'2026-09-30', body:'JAKIM – Selangor' },
  'MY-KV-2021-56007': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-56008': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-KV-2020-56009': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-KV-2019-56010': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-KV-2021-56011': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-SL-2021-56012': { certStart:'2025-08-15', certExpiry:'2027-08-14', body:'JAKIM – Selangor' },
  'MY-KV-2021-56013': { certStart:'2025-12-01', certExpiry:'2027-11-30', body:'JAKIM – Selangor' },
  'MY-WJ-2021-56014': { certStart:'2025-03-15', certExpiry:'2027-03-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2021-56015': { certStart:'2025-03-15', certExpiry:'2027-03-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-PNG-2020-56016': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Pulau Pinang' },
  'MY-KDH-2020-56017': { certStart:'2024-08-01', certExpiry:'2026-07-31', body:'JAKIM – Kedah' },
  'MY-KV-2022-56018': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-KV-2021-56019': { certStart:'2025-07-15', certExpiry:'2027-07-14', body:'JAKIM – Selangor' },

  /* ── 400-product expansion cert data ── */
  /* Beverages PRD-081–101 */
  'MY-KV-2022-81001': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-81002': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-81003': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-81004': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-PRK-2022-81005': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Perak' },
  'MY-SL-2022-81006': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-81007': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-81008': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-81009': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-81010': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-81011': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-81012': { certStart:'2025-06-15', certExpiry:'2027-06-14', body:'JAKIM – Selangor' },
  'MY-PRK-2022-81013': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Perak' },
  'MY-WJ-2022-81014': { certStart:'2025-03-15', certExpiry:'2027-03-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-81015': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-81016': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  /* Snacks PRD-102–160 */
  'MY-PRK-2022-82001': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Perak' },
  'MY-PRK-2022-82002': { certStart:'2025-01-10', certExpiry:'2027-01-09', body:'JAKIM – Perak' },
  'MY-KV-2022-82003': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-82004': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-82005': { certStart:'2025-09-15', certExpiry:'2027-09-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-82006': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-MLK-2022-82007': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Melaka' },
  'MY-KV-2022-82008': { certStart:'2025-07-15', certExpiry:'2027-07-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-82009': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-82010': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-82011': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-82012': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-82013': { certStart:'2025-01-20', certExpiry:'2027-01-19', body:'JAKIM – Selangor' },
  'MY-KV-2022-82014': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-82015': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-82016': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-82017': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-82018': { certStart:'2025-04-15', certExpiry:'2027-04-14', body:'JAKIM – Selangor' },
  'MY-PNG-2022-82019': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Pulau Pinang' },
  /* Staples PRD-124–146 */
  'MY-KDH-2022-83001': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Kedah' },
  'MY-KV-2022-83002': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-83003': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-83004': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2022-83005': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-83006': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-83007': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-83008': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-83009': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-83010': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-83011': { certStart:'2025-05-15', certExpiry:'2027-05-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-83012': { certStart:'2025-03-15', certExpiry:'2027-03-14', body:'JAKIM – Selangor' },
  'MY-WJ-2022-83013': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-83014': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-83015': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-83016': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-83017': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-83018': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  /* Dairy PRD-161–178 */
  'MY-SWK-2022-84001': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Sarawak' },
  'MY-SL-2022-84002': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2022-84003': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-84004': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-84005': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-84006': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-84007': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-84008': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-84009': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-84010': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-84011': { certStart:'2025-05-15', certExpiry:'2027-05-14', body:'JAKIM – Selangor' },
  'MY-WJ-2022-84012': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-84013': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  /* Canned PRD-179–196 */
  'MY-KV-2022-85001': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-85002': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-85003': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-85004': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-85005': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-85006': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-85007': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-85008': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-85009': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-85010': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-85011': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-85012': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-85013': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  /* Cooking PRD-197–216 */
  'MY-KV-2022-86001': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-86002': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-86003': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-86004': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-SL-2022-86005': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-86006': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KDH-2022-86007': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Kedah' },
  'MY-WJ-2022-86008': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-86009': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-86010': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-86011': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-86012': { certStart:'2025-07-15', certExpiry:'2027-07-14', body:'JAKIM – Selangor' },
  'MY-WJ-2022-86013': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-86014': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-86015': { certStart:'2025-08-15', certExpiry:'2027-08-14', body:'JAKIM – Selangor' },
  'MY-WJ-2022-86016': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-86017': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  /* Instant Food PRD-217–240 */
  'MY-KV-2022-87001': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-MLK-2022-87002': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Melaka' },
  'MY-KV-2022-87003': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-PNG-2022-87004': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Pulau Pinang' },
  'MY-WJ-2022-87005': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-87006': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-87007': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-WJ-2022-87008': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-87009': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-87010': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-87011': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-87012': { certStart:'2025-06-15', certExpiry:'2027-06-14', body:'JAKIM – Selangor' },
  /* Seasoning PRD-241–262 */
  'MY-SL-2022-88001': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-KDH-2022-88002': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Kedah' },
  'MY-SL-2022-88003': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-88004': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-88005': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-88006': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-88007': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-88008': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2022-88009': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-88010': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-88011': { certStart:'2025-04-15', certExpiry:'2027-04-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-88012': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Selangor' },
  /* Frozen PRD-263–282 */
  'MY-KV-2022-89001': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-89002': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-89003': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-KV-2022-89004': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  'MY-WJ-2022-89005': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-89006': { certStart:'2025-09-15', certExpiry:'2027-09-14', body:'JAKIM – Selangor' },
  'MY-SL-2022-89007': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-89008': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-KV-2022-89009': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-89010': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  /* Breakfast PRD-301–320 */
  'MY-WJ-2022-90001': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90002': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90003': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90004': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90005': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90006': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-90007': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  /* Bakery PRD-321–340 */
  'MY-KV-2022-91001': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Selangor' },
  'MY-KV-2022-91002': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Selangor' },
  'MY-SL-2022-91003': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Selangor' },
  'MY-WJ-2022-91004': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-PRK-2022-91005': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Perak' },
  'MY-SWK-2022-91006': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Sarawak' },
  'MY-SL-2022-91007': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-SL-2022-91008': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  /* Personal Care PRD-341–356 */
  'MY-WJ-2022-92001': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-92002': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-92003': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-92004': { certStart:'2025-11-01', certExpiry:'2027-10-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-92005': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-92006': { certStart:'2025-09-15', certExpiry:'2027-09-14', body:'JAKIM – Selangor' },
  'MY-KV-2022-92007': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Selangor' },
  /* Household PRD-357–372 */
  'MY-KV-2022-93001': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-93002': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-93003': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-93004': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-SL-2022-93005': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-93006': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  /* Health PRD-373–386 */
  'MY-WJ-2022-94001': { certStart:'2025-05-01', certExpiry:'2027-04-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94002': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94003': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94004': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-KV-2022-94005': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Selangor' },
  'MY-WJ-2022-94006': { certStart:'2025-01-15', certExpiry:'2027-01-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94007': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94008': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94009': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-94010': { certStart:'2025-02-01', certExpiry:'2027-01-31', body:'JAKIM – Wilayah Persekutuan' },
  /* Baby & Kids PRD-387–400 */
  'MY-WJ-2022-95001': { certStart:'2025-06-01', certExpiry:'2027-05-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95002': { certStart:'2025-03-01', certExpiry:'2027-02-28', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95003': { certStart:'2025-08-01', certExpiry:'2027-07-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95004': { certStart:'2025-05-15', certExpiry:'2027-05-14', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95005': { certStart:'2025-10-01', certExpiry:'2027-09-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95006': { certStart:'2025-01-01', certExpiry:'2026-12-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95007': { certStart:'2025-07-01', certExpiry:'2027-06-30', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95008': { certStart:'2025-04-01', certExpiry:'2027-03-31', body:'JAKIM – Wilayah Persekutuan' },
  'MY-WJ-2022-95009': { certStart:'2025-09-01', certExpiry:'2027-08-31', body:'JAKIM – Wilayah Persekutuan' },
};

/* Helper: get JAKIM cert details for an item */
function getJakimDetails(item) {
  if (!item.jakimNo || !JAKIM_CERT_DATA[item.jakimNo]) return null;
  return JAKIM_CERT_DATA[item.jakimNo];
}

/* Helper: check if cert is currently active */
function isCertActive(certData) {
  if (!certData) return false;
  const today = new Date();
  const expiry = new Date(certData.certExpiry);
  return expiry >= today;
}

/* Helper: format date to "dd MMM yyyy" for display */
function fmtDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
}

/* ============================================================
   PRODUCT IMAGES
   Real product images sourced from Open Food Facts (open database)
   and Wikimedia Commons (CC-licensed).
   ⚠ Note: Where brand-specific images were unavailable from open
   databases, category-representative images are used.
   Fallback: emoji icon displayed if image fails to load.
   ============================================================ */
const PRODUCT_IMAGE_MAP = {
  /* Canned Goods */
  'PRD-001': 'frontend/assets/images/PRD-001.jpg',
  'PRD-002': 'frontend/assets/images/PRD-002.jpg',
  'PRD-003': 'frontend/assets/images/PRD-003.jpg',
  'PRD-004': 'frontend/assets/images/PRD-004.jpg',
  /* Bakery */
  'PRD-005': 'frontend/assets/images/PRD-005.jpg',
  'PRD-006': 'frontend/assets/images/PRD-006.jpg',
  'PRD-007': 'frontend/assets/images/PRD-007.jpg',
  /* Beverages */
  'PRD-008': 'frontend/assets/images/PRD-008.jpg',
  'PRD-009': 'frontend/assets/images/PRD-009.jpg',
  'PRD-010': 'frontend/assets/images/PRD-010.jpg',
  'PRD-011': 'frontend/assets/images/PRD-011.jpg',
  'PRD-012': 'frontend/assets/images/PRD-012.jpg',
  /* Staples */
  'PRD-013': 'frontend/assets/images/PRD-013.jpg',
  'PRD-014': 'frontend/assets/images/PRD-014.jpg',
  'PRD-015': 'frontend/assets/images/PRD-015.jpg',
  'PRD-016': 'frontend/assets/images/PRD-016.jpg',
  /* Dairy */
  'PRD-017': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-018': 'https://images.openfoodfacts.org/images/products/870/318/100/1219/front_en.3.400.jpg',
  'PRD-019': 'https://images.openfoodfacts.org/images/products/009/921/101/2004/front_en.20.400.jpg',
  'PRD-020': 'frontend/assets/images/PRD-020.jpg',
  /* Instant Food */
  'PRD-021': 'frontend/assets/images/PRD-021.jpg',
  'PRD-022': 'frontend/assets/images/PRD-022.jpg',
  'PRD-023': 'frontend/assets/images/PRD-023.jpg',
  'PRD-024': 'frontend/assets/images/PRD-024.jpg',
  /* Breakfast */
  'PRD-025': 'frontend/assets/images/PRD-025.jpg',
  'PRD-026': 'frontend/assets/images/PRD-026.jpg',
  'PRD-027': 'frontend/assets/images/PRD-027.jpg',
  /* Cooking */
  'PRD-028': 'frontend/assets/images/PRD-028.jpg',
  'PRD-029': 'frontend/assets/images/PRD-029.jpg',
  'PRD-030': 'frontend/assets/images/PRD-030.jpg',
  'PRD-031': 'frontend/assets/images/PRD-031.jpg',
  /* Seasoning */
  'PRD-032': 'frontend/assets/images/PRD-032.jpg',
  'PRD-033': 'frontend/assets/images/PRD-033.jpg',
  'PRD-034': 'frontend/assets/images/PRD-034.jpg',
  /* Snacks */
  'PRD-035': 'frontend/assets/images/PRD-035.jpg',
  'PRD-036': 'frontend/assets/images/PRD-036.jpg',
  'PRD-037': 'https://images.openfoodfacts.org/images/products/955/500/200/0031/front_en.3.400.jpg',
  'PRD-038': 'frontend/assets/images/PRD-038.jpg',
  /* Personal Care */
  'PRD-039': 'frontend/assets/images/PRD-039.jpg',
  'PRD-040': 'frontend/assets/images/PRD-040.jpg',
  'PRD-041': 'frontend/assets/images/PRD-041.jpg',
  /* Household */
  'PRD-042': 'frontend/assets/images/PRD-042.jpg',
  'PRD-043': 'frontend/assets/images/PRD-043.jpg',
  'PRD-044': 'frontend/assets/images/PRD-044.jpg',
  /* Fresh Produce */
  'PRD-045': 'frontend/assets/images/PRD-045.jpg',
  'PRD-046': 'frontend/assets/images/PRD-046.jpg',
  'PRD-047': 'frontend/assets/images/PRD-047.jpg',
  'PRD-048': 'frontend/assets/images/PRD-048.jpg',
  /* Frozen */
  'PRD-049': 'frontend/assets/images/PRD-049.jpg',
  'PRD-050': 'frontend/assets/images/PRD-050.jpg',
  'PRD-051': 'frontend/assets/images/PRD-051.jpg',
  /* Health */
  'PRD-052': 'frontend/assets/images/PRD-052.jpg',
  'PRD-053': 'frontend/assets/images/PRD-053.jpg',
  /* Baby & Kids */
  'PRD-054': 'frontend/assets/images/PRD-054.jpg',
  'PRD-055': 'frontend/assets/images/PRD-055.jpg',
  /* Extended dataset — PRD-056 to PRD-080 */
  'PRD-056': 'frontend/assets/images/PRD-056.jpg',
  'PRD-057': 'frontend/assets/images/PRD-057.jpg',
  'PRD-058': 'frontend/assets/images/PRD-058.jpg',
  'PRD-059': 'frontend/assets/images/PRD-059.jpg',
  'PRD-060': 'frontend/assets/images/PRD-060.jpg',
  'PRD-061': 'frontend/assets/images/PRD-061.jpg',
  'PRD-062': 'frontend/assets/images/PRD-062.jpg',
  'PRD-063': 'frontend/assets/images/PRD-063.jpg',
  'PRD-064': 'frontend/assets/images/PRD-064.jpg',
  'PRD-065': 'frontend/assets/images/PRD-065.jpg',
  'PRD-066': 'frontend/assets/images/PRD-066.jpg',
  'PRD-067': 'frontend/assets/images/PRD-067.jpg',
  'PRD-068': 'https://images.openfoodfacts.org/images/products/955/720/300/0004/front_en.3.400.jpg',
  'PRD-069': 'frontend/assets/images/PRD-069.jpg',
  'PRD-070': 'frontend/assets/images/PRD-070.jpg',
  'PRD-071': 'frontend/assets/images/PRD-071.jpg',
  'PRD-072': 'frontend/assets/images/PRD-072.jpg',
  'PRD-073': 'frontend/assets/images/PRD-073.jpg',
  'PRD-074': 'frontend/assets/images/PRD-074.jpg',
  'PRD-075': 'frontend/assets/images/PRD-075.jpg',
  'PRD-076': 'frontend/assets/images/PRD-076.jpg',
  'PRD-077': 'frontend/assets/images/PRD-077.jpg',
  'PRD-078': 'frontend/assets/images/PRD-078.jpg',
  'PRD-079': 'frontend/assets/images/PRD-079.jpg',
  'PRD-080': 'frontend/assets/images/PRD-080.jpg',
  /* ── Extended image map: PRD-081 to PRD-400 ── */
  /* Beverages */
  'PRD-081': 'frontend/assets/images/PRD-081.jpg',
  'PRD-082': 'frontend/assets/images/PRD-082.jpg',
  'PRD-083': 'frontend/assets/images/PRD-083.jpg',
  'PRD-084': 'frontend/assets/images/PRD-084.jpg',
  'PRD-085': 'frontend/assets/images/PRD-085.jpg',
  'PRD-086': 'frontend/assets/images/PRD-086.jpg',
  'PRD-087': 'frontend/assets/images/PRD-087.jpg',
  'PRD-088': 'frontend/assets/images/PRD-088.jpg',
  'PRD-089': 'frontend/assets/images/PRD-089.jpg',
  'PRD-090': 'frontend/assets/images/PRD-090.jpg',
  'PRD-091': 'frontend/assets/images/PRD-091.jpg',
  'PRD-092': 'frontend/assets/images/PRD-092.jpg',
  'PRD-093': 'frontend/assets/images/PRD-093.jpg',
  'PRD-094': 'frontend/assets/images/PRD-094.jpg',
  'PRD-095': 'frontend/assets/images/PRD-095.jpg',
  'PRD-096': 'frontend/assets/images/PRD-096.jpg',
  'PRD-097': 'frontend/assets/images/PRD-097.jpg',
  'PRD-098': 'frontend/assets/images/PRD-098.jpg',
  'PRD-099': 'frontend/assets/images/PRD-099.jpg',
  'PRD-100': 'frontend/assets/images/PRD-100.jpg',
  'PRD-101': 'frontend/assets/images/PRD-101.jpg',
  /* Snacks */
  'PRD-102': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cookies_and_milk.jpg/200px-Cookies_and_milk.jpg',
  'PRD-103': 'frontend/assets/images/PRD-103.jpg',
  'PRD-104': 'frontend/assets/images/PRD-104.jpg',
  'PRD-105': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cookies_and_milk.jpg/200px-Cookies_and_milk.jpg',
  'PRD-106': 'frontend/assets/images/PRD-106.jpg',
  'PRD-107': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cookies_and_milk.jpg/200px-Cookies_and_milk.jpg',
  'PRD-108': 'frontend/assets/images/PRD-108.jpg',
  'PRD-109': 'frontend/assets/images/PRD-109.jpg',
  'PRD-110': 'frontend/assets/images/PRD-110.jpg',
  'PRD-111': 'frontend/assets/images/PRD-111.jpg',
  'PRD-112': 'frontend/assets/images/PRD-112.jpg',
  'PRD-113': 'frontend/assets/images/PRD-113.jpg',
  'PRD-114': 'frontend/assets/images/PRD-114.jpg',
  'PRD-115': 'frontend/assets/images/PRD-115.jpg',
  'PRD-116': 'frontend/assets/images/PRD-116.jpg',
  'PRD-117': 'https://images.openfoodfacts.org/images/products/955/500/200/0031/front_en.3.400.jpg',
  'PRD-118': 'frontend/assets/images/PRD-118.jpg',
  'PRD-119': 'frontend/assets/images/PRD-119.jpg',
  'PRD-120': 'frontend/assets/images/PRD-120.jpg',
  'PRD-121': 'frontend/assets/images/PRD-121.jpg',
  'PRD-122': 'frontend/assets/images/PRD-122.jpg',
  'PRD-123': 'frontend/assets/images/PRD-123.jpg',
  /* Staples */
  'PRD-124': 'frontend/assets/images/PRD-124.jpg',
  'PRD-125': 'frontend/assets/images/PRD-125.jpg',
  'PRD-126': 'frontend/assets/images/PRD-126.jpg',
  'PRD-127': 'frontend/assets/images/PRD-127.jpg',
  'PRD-128': 'frontend/assets/images/PRD-128.jpg',
  'PRD-129': 'frontend/assets/images/PRD-129.jpg',
  'PRD-130': 'frontend/assets/images/PRD-130.jpg',
  'PRD-131': 'frontend/assets/images/PRD-131.jpg',
  'PRD-132': 'frontend/assets/images/PRD-132.jpg',
  'PRD-133': 'frontend/assets/images/PRD-133.jpg',
  'PRD-134': 'frontend/assets/images/PRD-134.jpg',
  'PRD-135': 'frontend/assets/images/PRD-135.jpg',
  'PRD-136': 'frontend/assets/images/PRD-136.jpg',
  'PRD-137': 'frontend/assets/images/PRD-137.jpg',
  'PRD-138': 'frontend/assets/images/PRD-138.jpg',
  'PRD-139': 'frontend/assets/images/PRD-139.jpg',
  'PRD-140': 'frontend/assets/images/PRD-140.jpg',
  'PRD-141': 'frontend/assets/images/PRD-141.jpg',
  'PRD-142': 'frontend/assets/images/PRD-142.jpg',
  'PRD-143': 'frontend/assets/images/PRD-143.jpg',
  'PRD-144': 'frontend/assets/images/PRD-144.jpg',
  'PRD-145': 'frontend/assets/images/PRD-145.jpg',
  'PRD-146': 'frontend/assets/images/PRD-146.jpg',
  /* Beverages cont. */
  'PRD-147': 'frontend/assets/images/PRD-147.jpg',
  'PRD-148': 'frontend/assets/images/PRD-148.jpg',
  'PRD-149': 'frontend/assets/images/PRD-149.jpg',
  'PRD-150': 'frontend/assets/images/PRD-150.jpg',
  /* Snacks cont. */
  'PRD-151': 'frontend/assets/images/PRD-151.jpg',
  'PRD-152': 'frontend/assets/images/PRD-152.jpg',
  'PRD-153': 'https://images.openfoodfacts.org/images/products/070/221/200/2005/front_en.68.400.jpg',
  'PRD-154': 'https://images.openfoodfacts.org/images/products/028/400/099/9207/front_en.35.400.jpg',
  'PRD-155': 'https://images.openfoodfacts.org/images/products/800/100/014/9025/front_en.23.400.jpg',
  'PRD-156': 'https://images.openfoodfacts.org/images/products/402/360/048/6012/front_en.35.400.jpg',
  'PRD-157': 'https://images.openfoodfacts.org/images/products/456/900/301/5012/front_en.8.400.jpg',
  'PRD-158': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Cookies_and_milk.jpg/200px-Cookies_and_milk.jpg',
  'PRD-159': 'https://images.openfoodfacts.org/images/products/955/500/200/0031/front_en.3.400.jpg',
  'PRD-160': 'https://images.openfoodfacts.org/images/products/955/500/600/2005/front_en.5.400.jpg',
  /* Dairy */
  'PRD-161': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-162': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-163': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-164': 'https://images.openfoodfacts.org/images/products/870/318/100/1219/front_en.3.400.jpg',
  'PRD-165': 'https://images.openfoodfacts.org/images/products/870/318/100/1219/front_en.3.400.jpg',
  'PRD-166': 'https://images.openfoodfacts.org/images/products/955/324/200/0004/front_en.3.400.jpg',
  'PRD-167': 'https://images.openfoodfacts.org/images/products/009/921/101/2004/front_en.20.400.jpg',
  'PRD-168': 'https://images.openfoodfacts.org/images/products/009/921/101/2004/front_en.20.400.jpg',
  'PRD-169': 'https://images.openfoodfacts.org/images/products/955/324/200/0004/front_en.3.400.jpg',
  'PRD-170': 'https://images.openfoodfacts.org/images/products/955/324/200/0004/front_en.3.400.jpg',
  'PRD-171': 'https://images.openfoodfacts.org/images/products/009/921/101/2004/front_en.20.400.jpg',
  'PRD-172': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-173': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-174': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-175': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Stick-o-butter.jpg/200px-Stick-o-butter.jpg',
  'PRD-176': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  'PRD-177': 'https://images.openfoodfacts.org/images/products/009/921/101/2004/front_en.20.400.jpg',
  'PRD-178': 'https://images.openfoodfacts.org/images/products/955/720/601/0016/front_en.10.400.jpg',
  /* Canned */
  'PRD-179': 'frontend/assets/images/PRD-179.jpg',
  'PRD-180': 'frontend/assets/images/PRD-180.jpg',
  'PRD-181': 'frontend/assets/images/PRD-181.jpg',
  'PRD-182': 'frontend/assets/images/PRD-182.jpg',
  'PRD-183': 'frontend/assets/images/PRD-183.jpg',
  'PRD-184': 'frontend/assets/images/PRD-184.jpg',
  'PRD-185': 'frontend/assets/images/PRD-185.jpg',
  'PRD-186': 'frontend/assets/images/PRD-186.jpg',
  'PRD-187': 'frontend/assets/images/PRD-187.jpg',
  'PRD-188': 'frontend/assets/images/PRD-188.jpg',
  'PRD-189': 'frontend/assets/images/PRD-189.jpg',
  'PRD-190': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/CornKernels.jpg/200px-CornKernels.jpg',
  'PRD-191': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Coconut_milk.jpg/200px-Coconut_milk.jpg',
  'PRD-192': 'frontend/assets/images/PRD-192.jpg',
  'PRD-193': 'frontend/assets/images/PRD-193.jpg',
  'PRD-194': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Chicken_nuggets.jpg/200px-Chicken_nuggets.jpg',
  'PRD-195': 'frontend/assets/images/PRD-195.jpg',
  'PRD-196': 'https://images.openfoodfacts.org/images/products/955/316/600/0002/front_en.3.400.jpg',
  /* Cooking */
  'PRD-197': 'frontend/assets/images/PRD-197.jpg',
  'PRD-198': 'frontend/assets/images/PRD-198.jpg',
  'PRD-199': 'frontend/assets/images/PRD-199.jpg',
  'PRD-200': 'frontend/assets/images/PRD-200.jpg',
  'PRD-201': 'frontend/assets/images/PRD-201.jpg',
  'PRD-202': 'frontend/assets/images/PRD-202.jpg',
  'PRD-203': 'frontend/assets/images/PRD-203.jpg',
  'PRD-204': 'frontend/assets/images/PRD-204.jpg',
  'PRD-205': 'frontend/assets/images/PRD-205.jpg',
  'PRD-206': 'frontend/assets/images/PRD-206.jpg',
  'PRD-207': 'frontend/assets/images/PRD-207.jpg',
  'PRD-208': 'frontend/assets/images/PRD-208.jpg',
  'PRD-209': 'frontend/assets/images/PRD-209.jpg',
  'PRD-210': 'frontend/assets/images/PRD-210.jpg',
  'PRD-211': 'frontend/assets/images/PRD-211.jpg',
  'PRD-212': 'frontend/assets/images/PRD-212.jpg',
  'PRD-213': 'frontend/assets/images/PRD-213.jpg',
  'PRD-214': 'frontend/assets/images/PRD-214.jpg',
  'PRD-215': 'frontend/assets/images/PRD-215.jpg',
  'PRD-216': 'frontend/assets/images/PRD-216.jpg',
  /* Instant Food */
  'PRD-217': 'frontend/assets/images/PRD-217.jpg',
  'PRD-218': 'frontend/assets/images/PRD-218.jpg',
  'PRD-219': 'frontend/assets/images/PRD-219.jpg',
  'PRD-220': 'frontend/assets/images/PRD-220.jpg',
  'PRD-221': 'frontend/assets/images/PRD-221.jpg',
  'PRD-222': 'frontend/assets/images/PRD-222.jpg',
  'PRD-223': 'frontend/assets/images/PRD-223.jpg',
  'PRD-224': 'frontend/assets/images/PRD-224.jpg',
  'PRD-225': 'frontend/assets/images/PRD-225.jpg',
  'PRD-226': 'frontend/assets/images/PRD-226.jpg',
  'PRD-227': 'frontend/assets/images/PRD-227.jpg',
  'PRD-228': 'frontend/assets/images/PRD-228.jpg',
  'PRD-229': 'frontend/assets/images/PRD-229.jpg',
  'PRD-230': 'frontend/assets/images/PRD-230.jpg',
  'PRD-231': 'frontend/assets/images/PRD-231.jpg',
  'PRD-232': 'frontend/assets/images/PRD-232.jpg',
  'PRD-233': 'frontend/assets/images/PRD-233.jpg',
  'PRD-234': 'frontend/assets/images/PRD-234.jpg',
  'PRD-235': 'frontend/assets/images/PRD-235.jpg',
  'PRD-236': 'frontend/assets/images/PRD-236.jpg',
  'PRD-237': 'frontend/assets/images/PRD-237.jpg',
  'PRD-238': 'frontend/assets/images/PRD-238.jpg',
  'PRD-239': 'frontend/assets/images/PRD-239.jpg',
  'PRD-240': 'frontend/assets/images/PRD-240.jpg',
  /* Seasoning */
  'PRD-241': 'frontend/assets/images/PRD-241.jpg',
  'PRD-242': 'frontend/assets/images/PRD-242.jpg',
  'PRD-243': 'frontend/assets/images/PRD-243.jpg',
  'PRD-244': 'frontend/assets/images/PRD-244.jpg',
  'PRD-245': 'frontend/assets/images/PRD-245.jpg',
  'PRD-246': 'frontend/assets/images/PRD-246.jpg',
  'PRD-247': 'frontend/assets/images/PRD-247.jpg',
  'PRD-248': 'frontend/assets/images/PRD-248.jpg',
  'PRD-249': 'frontend/assets/images/PRD-249.jpg',
  'PRD-250': 'frontend/assets/images/PRD-250.jpg',
  'PRD-251': 'frontend/assets/images/PRD-251.jpg',
  'PRD-252': 'frontend/assets/images/PRD-252.jpg',
  'PRD-253': 'frontend/assets/images/PRD-253.jpg',
  'PRD-254': 'frontend/assets/images/PRD-254.jpg',
  'PRD-255': 'frontend/assets/images/PRD-255.jpg',
  'PRD-256': 'frontend/assets/images/PRD-256.jpg',
  'PRD-257': 'frontend/assets/images/PRD-257.jpg',
  'PRD-258': 'frontend/assets/images/PRD-258.jpg',
  'PRD-259': 'frontend/assets/images/PRD-259.jpg',
  'PRD-260': 'frontend/assets/images/PRD-260.jpg',
  'PRD-261': 'frontend/assets/images/PRD-261.jpg',
  'PRD-262': 'frontend/assets/images/PRD-262.jpg',
  /* Frozen */
  'PRD-263': 'frontend/assets/images/PRD-263.jpg',
  'PRD-264': 'frontend/assets/images/PRD-264.jpg',
  'PRD-265': 'frontend/assets/images/PRD-265.jpg',
  'PRD-266': 'frontend/assets/images/PRD-266.jpg',
  'PRD-267': 'frontend/assets/images/PRD-267.jpg',
  'PRD-268': 'frontend/assets/images/PRD-268.jpg',
  'PRD-269': 'frontend/assets/images/PRD-269.jpg',
  'PRD-270': 'frontend/assets/images/PRD-270.jpg',
  'PRD-271': 'frontend/assets/images/PRD-271.jpg',
  'PRD-272': 'frontend/assets/images/PRD-272.jpg',
  'PRD-273': 'frontend/assets/images/PRD-273.jpg',
  'PRD-274': 'frontend/assets/images/PRD-274.jpg',
  'PRD-275': 'frontend/assets/images/PRD-275.jpg',
  'PRD-276': 'frontend/assets/images/PRD-276.jpg',
  'PRD-277': 'frontend/assets/images/PRD-277.jpg',
  'PRD-278': 'frontend/assets/images/PRD-278.jpg',
  'PRD-279': 'frontend/assets/images/PRD-279.jpg',
  'PRD-280': 'frontend/assets/images/PRD-280.jpg',
  'PRD-281': 'frontend/assets/images/PRD-281.jpg',
  'PRD-282': 'frontend/assets/images/PRD-282.jpg',
  /* Fresh Produce */
  'PRD-283': 'frontend/assets/images/PRD-283.jpg',
  'PRD-284': 'frontend/assets/images/PRD-284.jpg',
  'PRD-285': 'frontend/assets/images/PRD-285.jpg',
  'PRD-286': 'frontend/assets/images/PRD-286.jpg',
  'PRD-287': 'frontend/assets/images/PRD-287.jpg',
  'PRD-288': 'frontend/assets/images/PRD-288.jpg',
  'PRD-289': 'frontend/assets/images/PRD-289.jpg',
  'PRD-290': 'frontend/assets/images/PRD-290.jpg',
  'PRD-291': 'frontend/assets/images/PRD-291.jpg',
  'PRD-292': 'frontend/assets/images/PRD-292.jpg',
  'PRD-293': 'frontend/assets/images/PRD-293.jpg',
  'PRD-294': 'frontend/assets/images/PRD-294.jpg',
  'PRD-295': 'frontend/assets/images/PRD-295.jpg',
  'PRD-296': 'frontend/assets/images/PRD-296.jpg',
  'PRD-297': 'frontend/assets/images/PRD-297.jpg',
  'PRD-298': 'frontend/assets/images/PRD-298.jpg',
  'PRD-299': 'frontend/assets/images/PRD-299.jpg',
  'PRD-300': 'frontend/assets/images/PRD-300.jpg',
  /* Breakfast */
  'PRD-301': 'frontend/assets/images/PRD-301.jpg',
  'PRD-302': 'frontend/assets/images/PRD-302.jpg',
  'PRD-303': 'frontend/assets/images/PRD-303.jpg',
  'PRD-304': 'frontend/assets/images/PRD-304.jpg',
  'PRD-305': 'frontend/assets/images/PRD-305.jpg',
  'PRD-306': 'frontend/assets/images/PRD-306.jpg',
  'PRD-307': 'frontend/assets/images/PRD-307.jpg',
  'PRD-308': 'frontend/assets/images/PRD-308.jpg',
  'PRD-309': 'frontend/assets/images/PRD-309.jpg',
  'PRD-310': 'frontend/assets/images/PRD-310.jpg',
  'PRD-311': 'frontend/assets/images/PRD-311.jpg',
  'PRD-312': 'frontend/assets/images/PRD-312.jpg',
  'PRD-313': 'frontend/assets/images/PRD-313.jpg',
  'PRD-314': 'frontend/assets/images/PRD-314.jpg',
  'PRD-315': 'frontend/assets/images/PRD-315.jpg',
  'PRD-316': 'frontend/assets/images/PRD-316.jpg',
  'PRD-317': 'frontend/assets/images/PRD-317.jpg',
  'PRD-318': 'frontend/assets/images/PRD-318.jpg',
  'PRD-319': 'frontend/assets/images/PRD-319.jpg',
  'PRD-320': 'frontend/assets/images/PRD-320.jpg',
  /* Bakery */
  'PRD-321': 'frontend/assets/images/PRD-321.jpg',
  'PRD-322': 'frontend/assets/images/PRD-322.jpg',
  'PRD-323': 'frontend/assets/images/PRD-323.jpg',
  'PRD-324': 'frontend/assets/images/PRD-324.jpg',
  'PRD-325': 'frontend/assets/images/PRD-325.jpg',
  'PRD-326': 'frontend/assets/images/PRD-326.jpg',
  'PRD-327': 'frontend/assets/images/PRD-327.jpg',
  'PRD-328': 'frontend/assets/images/PRD-328.jpg',
  'PRD-329': 'frontend/assets/images/PRD-329.jpg',
  'PRD-330': 'frontend/assets/images/PRD-330.jpg',
  'PRD-331': 'frontend/assets/images/PRD-331.jpg',
  'PRD-332': 'frontend/assets/images/PRD-332.jpg',
  'PRD-333': 'frontend/assets/images/PRD-333.jpg',
  'PRD-334': 'frontend/assets/images/PRD-334.jpg',
  'PRD-335': 'frontend/assets/images/PRD-335.jpg',
  'PRD-336': 'frontend/assets/images/PRD-336.jpg',
  'PRD-337': 'frontend/assets/images/PRD-337.jpg',
  'PRD-338': 'frontend/assets/images/PRD-338.jpg',
  'PRD-339': 'frontend/assets/images/PRD-339.jpg',
  'PRD-340': 'frontend/assets/images/PRD-340.jpg',
  /* Personal Care */
  'PRD-341': 'https://images.openfoodfacts.org/images/products/003/700/092/1024/front_en.7.400.jpg',
  'PRD-342': 'https://images.openfoodfacts.org/images/products/003/700/092/1024/front_en.7.400.jpg',
  'PRD-343': 'https://images.openfoodfacts.org/images/products/003/700/092/1024/front_en.7.400.jpg',
  'PRD-344': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-345': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-346': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-347': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-348': 'https://images.openfoodfacts.org/images/products/003/700/092/1024/front_en.7.400.jpg',
  'PRD-349': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-350': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-351': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-352': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-353': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-354': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-355': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  'PRD-356': 'https://images.openfoodfacts.org/images/products/803/005/602/4906/front_en.3.400.jpg',
  /* Household */
  'PRD-357': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-358': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-359': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-360': 'https://images.openfoodfacts.org/images/products/803/001/100/0000/front_en.3.400.jpg',
  'PRD-361': 'https://images.openfoodfacts.org/images/products/803/001/100/0000/front_en.3.400.jpg',
  'PRD-362': 'https://images.openfoodfacts.org/images/products/002/900/000/0000/front_en.3.400.jpg',
  'PRD-363': 'https://images.openfoodfacts.org/images/products/002/900/000/0000/front_en.3.400.jpg',
  'PRD-364': 'https://images.openfoodfacts.org/images/products/002/900/000/0000/front_en.3.400.jpg',
  'PRD-365': 'https://images.openfoodfacts.org/images/products/803/001/100/0000/front_en.3.400.jpg',
  'PRD-366': 'https://images.openfoodfacts.org/images/products/803/001/100/0000/front_en.3.400.jpg',
  'PRD-367': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-368': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-369': 'https://images.openfoodfacts.org/images/products/002/900/000/0000/front_en.3.400.jpg',
  'PRD-370': 'https://images.openfoodfacts.org/images/products/803/001/100/0000/front_en.3.400.jpg',
  'PRD-371': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  'PRD-372': 'https://images.openfoodfacts.org/images/products/803/001/200/0000/front_en.3.400.jpg',
  /* Health */
  'PRD-373': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-374': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-375': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-376': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-377': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-378': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-379': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-380': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-381': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-382': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-383': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-384': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-385': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  'PRD-386': 'https://images.openfoodfacts.org/images/products/072/390/010/0015/front_en.27.400.jpg',
  /* Baby & Kids */
  'PRD-387': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-388': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-389': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-390': 'frontend/assets/images/PRD-390.jpg',
  'PRD-391': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-392': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-393': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-394': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-395': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-396': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-397': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
  'PRD-398': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-399': 'https://images.openfoodfacts.org/images/products/003/777/021/4067/front_en.19.400.jpg',
  'PRD-400': 'https://images.openfoodfacts.org/images/products/871/532/601/4000/front_en.3.400.jpg',
};

/* Helper: get product image URL (falls back to null → emoji shown) */
function getProductImage(item) {
  return PRODUCT_IMAGE_MAP[item.productId] || null;
}

/* ── Best price across stores (ignores null = store doesn't carry item) ── */
function getBestPrice(item) {
  const vals = [item.prices.aeon, item.prices.lotus, item.prices.mydin].filter(v => v !== null && v !== undefined);
  return vals.length ? Math.min(...vals) : 0;
}

function getBestStore(item) {
  const p = item.prices;
  const best = getBestPrice(item);
  if (p.mydin === best) return 'Mydin';
  if (p.lotus === best) return "Lotus's";
  return 'AEON';
}

/* ── Value score: hybrid score per RM spent (budget optimisation) ── */
function getValueScore(item) {
  const price = getBestPrice(item);
  return price > 0 ? Math.round((item.score / price) * 10) / 10 : 0;
}

/* ============================================================
   ENHANCED CONTENT-BASED FILTERING (CBF)
   Computes live cosine-similarity-inspired match score between:
     User preference vector: [category_pref, halal_pref, budget_pref]
     Product feature vector: [category_match, halal_score, price_fit]

   Weights (from FYP report):
     Category match : 40%
     Halal match    : 30%
     Budget fit     : 30%

   This is combined with stored collabScore (SVD++) as:
     hybridLive = 0.9 × max(liveCBF, collabScore) + 0.1 × popularity
   ============================================================ */
function computeLiveCBF(item, userBudget, userHalal, userCategories = []) {
  let score = 0;

  /* Category match (40 pts) — full credit if preferred, partial if no pref set */
  const catMatch = userCategories.length === 0 || userCategories.includes(item.category);
  score += catMatch ? 40 : 12;

  /* Halal preference match (30 pts) */
  if (userHalal) {
    score += item.halal ? 30 : 0;         // strict: only certified items score
  } else {
    score += item.halal ? 25 : 18;        // relaxed: slight preference for halal
  }

  /* Budget fit (30 pts): reward items well within budget */
  const price = getBestPrice(item);
  if (price > 0 && price <= userBudget) {
    const budgetUsage = price / userBudget; // 0..1 — lower is better
    score += Math.round(30 * (1 - budgetUsage * 0.55));  // 16–30 pts
  }
  /* Items above budget get 0 budget-fit points but may still show if filter allows */

  return Math.min(Math.round(score), 100);
}

/* Compute live hybrid score using dynamic CBF (for 'personalised' sort) */
function computeLiveHybrid(item, userBudget, userHalal, userCategories) {
  const liveCBF = computeLiveCBF(item, userBudget, userHalal, userCategories);
  return Math.round(0.9 * Math.max(liveCBF, item.collabScore) + 0.1 * item.popularity);
}

/* Budget optimisation: return top N items within budget, sorted by value score */
function getBudgetRecommendations(budget, halalOnly, topN = 10) {
  return GROCERY_DATA
    .filter(g => {
      const p = getBestPrice(g);
      return p > 0 && p <= budget && (!halalOnly || g.halal);
    })
    .sort((a, b) => getValueScore(b) - getValueScore(a))
    .slice(0, topN);
}

/* ============================================================
   GROCERY CARD BUILDER (Dashboard & Products)
   ============================================================ */
function buildCard(g, delay = 0) {
  const best = getBestPrice(g);
  return `
  <div class="grocery-card" data-id="${g.id}" data-price="${best}"
       data-halal="${g.halal}" data-category="${g.category}"
       style="animation-delay:${delay}ms"
       onclick="openProductModal(${g.id})">
    <div class="card-image" style="background:${g.color};">
      ${(function() {
          const imgUrl = getProductImage(g);
          if (imgUrl) {
            return `<img src="${imgUrl}" alt="${g.name}"
                        style="width:72px;height:72px;object-fit:contain;border-radius:8px;"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                    <span style="display:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))">${g.icon}</span>`;
          }
          return `<span style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))">${g.icon}</span>`;
        })()}
      <div class="card-score-badge">
        <i class="fas fa-star" style="font-size:.55rem;"></i> ${g.score}% match
      </div>
      <div class="card-wishlist ${isFav(g.productId) ? 'active' : ''}" onclick="toggleWishlist(this, event, '${g.productId}')">
        <i class="${isFav(g.productId) ? 'fas' : 'far'} fa-heart"></i>
      </div>
    </div>
    <div class="card-body">
      <div class="card-category">${g.category}</div>
      <div class="card-name">${g.name}</div>
      <div class="card-brand">${g.brand}${g.weight ? ' · ' + g.weight : ''}</div>
      <div class="card-bottom">
        <div class="card-price">
          <span class="rm">RM</span>${best.toFixed(2)}
          ${g.savings && g.savings !== '0%'
            ? `<span class="savings"><i class="fas fa-tag" style="font-size:.55rem"></i> Save ${g.savings}</span>`
            : ''}
          ${g.discount
            ? `<span class="savings" style="background:#fff3e0; color:#e65100;"><i class="fas fa-percent" style="font-size:.55rem"></i> ${g.discount}</span>`
            : ''}
        </div>
        <span class="halal-badge ${g.halal ? 'certified' : g.halalStatus === 'Unknown' ? 'unknown' : 'not-certified'}">
          ${g.halal
            ? '<i class="fas fa-check-circle" style="font-size:.6rem"></i> HALAL'
            : g.halalStatus === 'Unknown'
              ? '<i class="fas fa-question-circle" style="font-size:.6rem"></i> Unknown'
              : '<i class="fas fa-minus-circle" style="font-size:.6rem"></i> Uncert.'}
        </span>
      </div>
    </div>
    <div class="card-footer-btn">
      <button class="btn-add-cart" onclick="addToCart(${g.id}, '${g.name.replace(/'/g,"\\'")}', event)">
        <i class="fas fa-shopping-cart"></i> Add to Cart
      </button>
    </div>
  </div>`;
}

/* ── Unique categories with counts ── */
function getCategoryList(data) {
  const map = {};
  data.forEach(g => { map[g.category] = (map[g.category] || 0) + 1; });
  return map;
}

/* ── Filter & render cards ── */
let activeCategory = 'All';
let wishlistSet    = new Set();
let cartCount      = 0;

const ITEMS_PER_PAGE = 35;
let currentPage      = 1;

function renderCards(keepPage = false) {
  const grid     = document.getElementById('groceryGrid');
  const resultCt = document.getElementById('resultCount');
  if (!grid) return;

  if (!keepPage) currentPage = 1;

  const budget    = parseFloat(document.getElementById('budgetSlider')?.value || 500);
  const halalOnly = document.getElementById('halalToggle')?.checked || false;
  const sortVal   = document.getElementById('sortSelect')?.value   || 'score';

  let filtered = GROCERY_DATA.filter(g => {
    const price = getBestPrice(g);
    if (price === 0) return false;                              // skip unavailable products
    if (price > budget) return false;
    if (halalOnly && !g.halal) return false;
    if (activeCategory !== 'All' && g.category !== activeCategory) return false;
    if (searchTerm && !g.name.toLowerCase().includes(searchTerm)
                   && !g.brand.toLowerCase().includes(searchTerm)
                   && !g.category.toLowerCase().includes(searchTerm)) return false;
    return true;
  });

  sortData(filtered, sortVal);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  if (resultCt) resultCt.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

  if (totalItems === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>No items match your current filters.<br>
           <small>Try adjusting your budget or halal filter.</small></p>
      </div>`;
    renderPagination(0, 0);
    return;
  }

  const start     = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageSlice = filtered.slice(start, start + ITEMS_PER_PAGE);
  grid.innerHTML  = pageSlice.map((g, i) => buildCard(g, i * 40)).join('');
  updateStats(filtered);
  renderPagination(currentPage, totalPages);
}

function renderPagination(page, totalPages) {
  /* Find or create the bar directly after the grid */
  let bar = document.getElementById('paginationBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'paginationBar';
    const grid = document.getElementById('groceryGrid');
    if (grid) grid.parentNode.insertBefore(bar, grid.nextSibling);
  }
  if (totalPages <= 1) { bar.innerHTML = ''; return; }

  /* Build page number buttons with ellipsis for large sets */
  let buttons = '';
  const addBtn = (p) => {
    buttons += `<button class="pg-btn${p === page ? ' active' : ''}"
                        onclick="goToPage(${p})">${p}</button>`;
  };
  const addDots = () => { buttons += `<span class="pg-dots">…</span>`; };

  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) addBtn(p);
  } else {
    addBtn(1);
    if (page > 3)                  addDots();
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) addBtn(p);
    if (page < totalPages - 2)     addDots();
    addBtn(totalPages);
  }

  bar.innerHTML = `
    <div class="pagination-wrap">
      <button class="pg-btn pg-arrow" onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
      ${buttons}
      <button class="pg-btn pg-arrow" onclick="goToPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
      <span class="pg-info">Page ${page} of ${totalPages}</span>
    </div>`;
}

function goToPage(n) {
  const grid = document.getElementById('groceryGrid');
  if (!grid) return;
  currentPage = n;
  renderCards(true);   /* keepPage = true — don't reset to page 1 */
  grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sortData(arr, val) {
  if (val === 'score') {
    arr.sort((a, b) => b.score - a.score);
  } else if (val === 'personalised') {
    /* Live CBF: re-rank using current user filter state */
    const budget  = parseFloat(document.getElementById('budgetSlider')?.value || 500);
    const halal   = document.getElementById('halalToggle')?.checked || false;
    const catEls  = document.querySelectorAll('#categoryList .cat-item.active');
    const cats    = [...catEls].map(el => el.dataset.cat).filter(c => c && c !== 'All');
    arr.sort((a, b) => computeLiveHybrid(b, budget, halal, cats) - computeLiveHybrid(a, budget, halal, cats));
  } else if (val === 'value') {
    /* Budget optimisation: best hybrid score per RM spent */
    arr.sort((a, b) => getValueScore(b) - getValueScore(a));
  } else if (val === 'price-asc') {
    arr.sort((a, b) => getBestPrice(a) - getBestPrice(b));
  } else if (val === 'price-desc') {
    arr.sort((a, b) => getBestPrice(b) - getBestPrice(a));
  } else if (val === 'name') {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function updateStats(filtered) {
  const budget     = parseFloat(document.getElementById('budgetSlider')?.value || 500);
  const totalHalal = filtered.filter(g => g.halal).length;
  const avgScore   = filtered.length
    ? Math.round(filtered.reduce((s,g) => s + g.score, 0) / filtered.length) : 0;

  setStatEl('statBudget', `RM ${parseFloat(budget).toFixed(0)}`);
  setStatEl('statItems',  `${filtered.length}`);
  setStatEl('statScore',  `${avgScore}%`);
  setStatEl('statHalal',  `${totalHalal}/${filtered.length}`);
}

function setStatEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Favourites (localStorage, per user) ── */
function getFavKey() {
  const s = getSession();
  return s ? `hs_favs_${s.email}` : 'hs_favs_guest';
}
function getFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(getFavKey()) || '[]')); } catch { return new Set(); }
}
function saveFavs(set) {
  localStorage.setItem(getFavKey(), JSON.stringify([...set]));
}
function isFav(productId) { return getFavs().has(productId); }

/* ── Wishlist toggle ── */
function toggleWishlist(el, e, productId) {
  e.stopPropagation();
  if (isGuest()) {
    showToast('Login to save favourites to your list.', 'info');
    return;
  }
  const favs = getFavs();
  const icon = el.querySelector('i');
  if (favs.has(productId)) {
    favs.delete(productId);
    el.classList.remove('active');
    icon.className = 'far fa-heart';
    showToast('Removed from saved items', 'info', 1800);
  } else {
    favs.add(productId);
    el.classList.add('active');
    icon.className = 'fas fa-heart';
    showToast('Saved to your list!', 'success', 1800);
  }
  saveFavs(favs);
}

/* ── Add to cart ── */
function addToCart(id, name, e) {
  if (e) e.stopPropagation();
  cartCount++;
  const badge = document.getElementById('cartBadge');
  if (badge) { badge.textContent = cartCount; badge.style.display = 'block'; }
  showToast(`${name} added to cart`, 'success', 2000);
}

/* ── Category sidebar ── */
function initCategoryFilter() {
  const sidebar = document.getElementById('categoryList');
  if (!sidebar) return;

  const cats     = getCategoryList(GROCERY_DATA);
  const allCount = GROCERY_DATA.length;
  const catIcons = {
    'Canned Goods':'🐟', 'Bakery':'🍞', 'Beverages':'🥤', 'Staples':'🌾',
    'Dairy':'🥛', 'Instant Food':'🍜', 'Breakfast':'🥣',
    'Cooking':'🫙', 'Seasoning':'🧂', 'Snacks':'🍪',
    'Personal Care':'🪥', 'Household':'🧺', 'Fresh Produce':'🥬',
    'Frozen':'❄️', 'Health':'💪', 'Baby & Kids':'👶'
  };

  let html = `<div class="cat-item active" data-cat="All" onclick="selectCategory('All', this)">
    <div class="cat-left"><span>🛒</span> All Items</div>
    <span class="cat-count">${allCount}</span>
  </div>`;

  Object.entries(cats).forEach(([cat, count]) => {
    html += `<div class="cat-item" data-cat="${cat}" onclick="selectCategory('${cat}', this)">
      <div class="cat-left"><span>${catIcons[cat]||'📦'}</span> ${cat}</div>
      <span class="cat-count">${count}</span>
    </div>`;
  });

  sidebar.innerHTML = html;
}

function selectCategory(cat, el) {
  activeCategory = cat;
  document.querySelectorAll('#categoryList .cat-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  renderCards();
}

/* ── Budget slider live display ── */
function initBudgetSlider() {
  const slider  = document.getElementById('budgetSlider');
  const display = document.getElementById('budgetDisplay');
  if (!slider) return;

  function update() {
    const val = parseFloat(slider.value);
    const max = parseFloat(slider.max);
    const min = parseFloat(slider.min);
    if (display) display.textContent = `RM ${val.toFixed(0)}`;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background =
      `linear-gradient(to right, var(--primary) ${pct}%, var(--gray-200) ${pct}%)`;
    renderCards();
  }

  slider.addEventListener('input', update);
  update();
}

/* ── Halal toggle ── */
function initHalalToggle() {
  const toggle = document.getElementById('halalToggle');
  if (!toggle) return;
  toggle.addEventListener('change', renderCards);
}

/* ── Sort select ── */
function initSortSelect() {
  const sel = document.getElementById('sortSelect');
  if (!sel) return;
  sel.addEventListener('change', renderCards);
}

/* ── Dashboard init ── */
function initDashboard() {
  initCategoryFilter();
  initBudgetSlider();
  initHalalToggle();
  initSortSelect();
  renderCards();
}

/* ── Reset all filters ── */
function resetFilters() {
  const slider = document.getElementById('budgetSlider');
  const toggle = document.getElementById('halalToggle');
  const sort   = document.getElementById('sortSelect');
  if (slider) slider.value = parseFloat(slider.max);
  if (toggle) toggle.checked = false;
  if (sort)   sort.value = 'score';
  activeCategory = 'All';
  document.querySelectorAll('#categoryList .cat-item').forEach((el, i) => {
    el.classList.toggle('active', i === 0);
  });
  if (slider) initBudgetSlider();
  renderCards();
  showToast('Filters reset!', 'info', 1800);
}

/* ============================================================
   PRODUCT DETAIL MODAL
   ============================================================ */
function openProductModal(id) {
  const item = GROCERY_DATA.find(g => g.id === id);
  if (!item) return;

  const overlay = document.getElementById('productModal');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  const dominant  = item.collabScore >= item.contentScore ? 'Collaborative' : 'Content-Based';
  const jakimInfo = getJakimDetails(item);
  const certActive = isCertActive(jakimInfo);
  const imgUrl    = getProductImage(item);

  /* Build per-store price cells (handle null = not available at that store) */
  const priceCell = (store, key) => {
    const p = item.prices[key];
    const isBest = (getBestStore(item) === store);
    return `
    <div class="modal-price-cell ${isBest ? 'best-price' : ''}">
      <div class="modal-store">${store}</div>
      <div class="modal-price">${p !== null && p !== undefined ? 'RM ' + p.toFixed(2) : '—'}</div>
      ${isBest && p !== null ? '<div class="best-tag">Best</div>' : ''}
    </div>`;
  };

  content.innerHTML = `
    <div class="modal-product-header" style="background:${item.color}; padding:1.5rem 2rem; text-align:center;
         display:flex; flex-direction:column; align-items:center; gap:.6rem;">
      ${imgUrl
        ? `<img src="${imgUrl}" alt="${item.name}"
               style="width:90px;height:90px;object-fit:contain;border-radius:12px;background:white;padding:6px;box-shadow:0 2px 8px rgba(0,0,0,.1);"
               onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
           <span style="display:none;font-size:4rem;filter:drop-shadow(0 2px 6px rgba(0,0,0,.15))">${item.icon}</span>`
        : `<span style="font-size:4rem;filter:drop-shadow(0 2px 6px rgba(0,0,0,.15))">${item.icon}</span>`}
      <span class="halal-badge ${item.halal ? 'certified' : item.halalStatus === 'Unknown' ? 'unknown' : 'not-certified'}" style="display:inline-flex;">
        ${item.halal
          ? '<i class="fas fa-check-circle"></i>&nbsp;JAKIM Halal Certified'
          : item.halalStatus === 'Unknown'
            ? '<i class="fas fa-question-circle"></i>&nbsp;Halal Unknown'
            : '<i class="fas fa-minus-circle"></i>&nbsp;Not Halal Certified'}
      </span>
    </div>
    <div style="padding:1.5rem;">
      <div class="card-category">${item.category}</div>
      <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-dark); margin:.3rem 0 .2rem">${item.name}</h3>
      <div class="card-brand" style="margin-bottom:.4rem;">${item.brand}</div>

      <!-- Product metadata row -->
      <div style="display:flex; flex-wrap:wrap; gap:.4rem; margin-bottom:.9rem;">
        ${item.weight ? `<span style="font-size:.72rem; background:var(--gray-100); padding:.2rem .55rem; border-radius:20px; color:var(--text-mid);"><i class="fas fa-weight-hanging" style="color:var(--primary); font-size:.6rem;"></i> ${item.weight}</span>` : ''}
        ${item.pricePerUnit ? `<span style="font-size:.72rem; background:var(--gray-100); padding:.2rem .55rem; border-radius:20px; color:var(--text-mid);"><i class="fas fa-tag" style="color:var(--primary); font-size:.6rem;"></i> ${item.pricePerUnit}</span>` : ''}
        <span style="font-size:.72rem; background:var(--gray-100); padding:.2rem .55rem; border-radius:20px; color:var(--text-mid);">
          <i class="fas fa-id-badge" style="color:var(--primary); font-size:.6rem;"></i> ${item.productId}
        </span>
      </div>

      ${item.discount ? `
      <div style="background:#fff3e0; border:1px solid #ffe0b2; border-radius:var(--radius-xs);
                  padding:.5rem .9rem; margin-bottom:.9rem; font-size:.78rem; color:#e65100; font-weight:600;">
        <i class="fas fa-percent"></i> Promotion: ${item.discount}
      </div>` : ''}

      <p style="font-size:.83rem; color:var(--text-mid); margin-bottom:1rem;">${item.desc}</p>

      ${item.halal && item.jakimNo ? `
      <!-- ⚠ Simulated JAKIM verification data — for academic/FYP use only -->
      <div style="background:var(--primary-50); border:1px solid var(--primary-100); border-radius:var(--radius-xs);
                  padding:.75rem 1rem; margin-bottom:1rem; font-size:.78rem; color:var(--primary);">
        <div style="font-weight:700; margin-bottom:.4rem;">
          <i class="fas fa-certificate"></i> JAKIM Halal Certification
          <span style="font-size:.65rem; font-weight:400; color:var(--text-muted); margin-left:.4rem;">
            (Simulated Data)
          </span>
        </div>
        <div style="display:grid; grid-template-columns:auto 1fr; gap:.2rem .6rem; color:var(--text-mid);">
          <span style="font-weight:600; color:var(--primary);">Ref No.</span>
          <span>${item.jakimNo}</span>
          ${jakimInfo ? `
          <span style="font-weight:600; color:var(--primary);">Issued By</span>
          <span>${jakimInfo.body}</span>
          <span style="font-weight:600; color:var(--primary);">Valid From</span>
          <span>${fmtDate(jakimInfo.certStart)}</span>
          <span style="font-weight:600; color:var(--primary);">Expiry</span>
          <span>${fmtDate(jakimInfo.certExpiry)}
            <span style="margin-left:.35rem; padding:.1rem .4rem; border-radius:10px; font-size:.65rem; font-weight:700;
                         background:${certActive ? '#d1fae5' : '#ffebee'}; color:${certActive ? '#065f46' : '#c62828'};">
              ${certActive ? '✓ Active' : '✗ Expired'}
            </span>
          </span>
          ` : ''}
        </div>
      </div>` : ''}

      <!-- Store price comparison -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:.6rem; margin-bottom:1.2rem;">
        ${priceCell('AEON', 'aeon')}
        ${priceCell("Lotus's", 'lotus')}
        ${priceCell('Mydin', 'mydin')}
      </div>

      <div style="background:var(--gray-100); border-radius:var(--radius-sm); padding:1rem; margin-bottom:1.2rem;">
        <div style="font-size:.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;
                    letter-spacing:.8px; margin-bottom:.7rem;">
          <i class="fas fa-robot" style="color:var(--primary)"></i> Hybrid Score Breakdown
        </div>
        <div style="display:flex; flex-direction:column; gap:.5rem; font-size:.8rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fas fa-sliders" style="color:var(--primary); width:14px"></i> Content-Based (CBF)</span>
            <span style="font-weight:600;">${item.contentScore}%</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fas fa-users" style="color:var(--primary); width:14px"></i> Collaborative (CF)</span>
            <span style="font-weight:600;">${item.collabScore}%</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fas fa-fire" style="color:var(--primary); width:14px"></i> Popularity</span>
            <span style="font-weight:600;">${item.popularity}%</span>
          </div>
          <hr style="border-color:var(--border); margin:.3rem 0;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:var(--text-dark);">
              <i class="fas fa-star" style="color:var(--primary); width:14px"></i>
              Final Score <small style="font-weight:400; color:var(--text-muted)">(${dominant} dominant)</small>
            </span>
            <span style="font-weight:700; color:var(--primary); font-size:.95rem;">${item.score}%</span>
          </div>
          <div style="font-size:.7rem; color:var(--text-muted); margin-top:.2rem;">
            Formula: 0.9 × max(${item.contentScore}, ${item.collabScore}) + 0.1 × ${item.popularity} = <strong>${item.score}%</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:.4rem;
                      border-top:1px solid var(--border); padding-top:.4rem;">
            <span style="color:var(--text-mid); font-size:.75rem;">
              <i class="fas fa-coins" style="color:#f59e0b; width:14px"></i> Value Score (score ÷ price)
            </span>
            <span style="font-weight:600; color:#f59e0b; font-size:.8rem;">${getValueScore(item)}</span>
          </div>
        </div>
      </div>

      <div style="display:flex; gap:.6rem;">
        <button class="btn-primary-custom" style="flex:1;"
                onclick="addToCart(${item.id}, '${item.name.replace(/'/g,"\\'")}', event); closeModalBtn();">
          <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
        <a href="comparison.html" class="btn-outline-custom" style="flex:1; justify-content:center; text-decoration:none;">
          <i class="fas fa-balance-scale"></i> Compare Prices
        </a>
      </div>
    </div>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target.id === 'productModal') closeModalBtn();
}

function closeModalBtn() {
  const overlay = document.getElementById('productModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalBtn();
});

/* ============================================================
   COMPARISON PAGE
   ============================================================ */
let comparisonFilterTerm = '';

function renderComparisonTable(data) {
  const tbody = document.getElementById('comparisonBody');
  const cards = document.getElementById('comparisonCards');
  if (!tbody) return;

  /* Render price cell — show '—' if store doesn't carry the product */
  const savingsBadge = (price, best) => {
    if (price === null || price === undefined)
      return `<span style="color:var(--text-muted); font-size:.78rem;">—</span>`;
    return price === best
      ? `<span class="price-best">RM ${price.toFixed(2)}</span>`
      : `<span class="price-other">RM ${price.toFixed(2)}</span>`;
  };

  tbody.innerHTML = data.map(item => {
    const best  = getBestPrice(item);
    const store = getBestStore(item);
    return `<tr style="cursor:pointer;" onclick="openProductModal(${item.id})" title="Click for full details">
      <td>
        <div style="display:flex; align-items:center; gap:.7rem;">
          <span style="font-size:1.4rem">${item.icon}</span>
          <div>
            <div style="font-weight:600; font-size:.88rem; color:var(--text-dark);">${item.name}</div>
            <div style="font-size:.72rem; color:var(--text-muted);">${item.brand} · ${item.category} · ${item.weight || ''}</div>
          </div>
        </div>
      </td>
      <td class="price-cell">${savingsBadge(item.prices.aeon, best)}</td>
      <td class="price-cell">${savingsBadge(item.prices.lotus, best)}</td>
      <td class="price-cell">${savingsBadge(item.prices.mydin, best)}</td>
      <td>
        <span class="best-store-badge">${store}</span>
        <div style="font-size:.72rem; color:var(--text-muted); margin-top:2px;">RM ${best.toFixed(2)}</div>
        ${item.discount ? `<div style="font-size:.65rem; color:#e65100; margin-top:2px;"><i class="fas fa-percent"></i> ${item.discount}</div>` : ''}
      </td>
      <td>
        <span class="halal-badge ${item.halal ? 'certified' : 'not-certified'}" style="font-size:.62rem;">
          ${item.halal ? '✅ JAKIM' : item.halalStatus === 'Unknown' ? '❓ Unknown' : '❌ No'}
        </span>
      </td>
    </tr>`;
  }).join('');

  if (cards) {
    cards.innerHTML = data.map(item => {
      const best  = getBestPrice(item);
      const store = getBestStore(item);
      return `
      <div class="comp-card" style="cursor:pointer;" onclick="openProductModal(${item.id})">
        <div class="comp-card-top">
          <span style="font-size:2rem">${item.icon}</span>
          <div>
            <div style="font-weight:600; font-size:.88rem;">${item.name}</div>
            <div style="font-size:.72rem; color:var(--text-muted);">${item.brand} · ${item.weight || ''}</div>
          </div>
          <span class="halal-badge ${item.halal ? 'certified' : 'not-certified'}" style="font-size:.6rem; margin-left:auto;">
            ${item.halal ? 'HALAL' : item.halalStatus === 'Unknown' ? '? Unknown' : 'Uncert.'}
          </span>
        </div>
        <div class="comp-prices">
          <div class="comp-price-row ${store==='AEON'?'best':''}">
            <span>AEON</span>
            <span>${item.prices.aeon !== null && item.prices.aeon !== undefined ? 'RM ' + item.prices.aeon.toFixed(2) : '—'}</span>
          </div>
          <div class="comp-price-row ${store==="Lotus's"?'best':''}">
            <span>Lotus's</span>
            <span>${item.prices.lotus !== null && item.prices.lotus !== undefined ? 'RM ' + item.prices.lotus.toFixed(2) : '—'}</span>
          </div>
          <div class="comp-price-row ${store==='Mydin'?'best':''}">
            <span>Mydin</span>
            <span>${item.prices.mydin !== null && item.prices.mydin !== undefined ? 'RM ' + item.prices.mydin.toFixed(2) : '—'}</span>
          </div>
        </div>
        <div style="font-size:.75rem; color:var(--primary); font-weight:600; margin-top:.5rem;">
          Best deal: ${store} at RM ${best.toFixed(2)}
        </div>
      </div>`;
    }).join('');
  }
}

function filterComparison(term) {
  comparisonFilterTerm = term.toLowerCase();
  const filtered = GROCERY_DATA.filter(g =>
    g.name.toLowerCase().includes(comparisonFilterTerm) ||
    g.brand.toLowerCase().includes(comparisonFilterTerm) ||
    g.category.toLowerCase().includes(comparisonFilterTerm)
  );
  renderComparisonTable(filtered);

  const countEl = document.getElementById('compCount');
  if (countEl) countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
}

function initComparisonPage() {
  renderComparisonTable(GROCERY_DATA);
  const countEl = document.getElementById('compCount');
  if (countEl) countEl.textContent = `${GROCERY_DATA.length} items`;

  const searchEl = document.getElementById('compSearch');
  if (searchEl) searchEl.addEventListener('input', e => filterComparison(e.target.value));
}

/* ============================================================
   PREFERENCES PAGE
   ============================================================ */
function initPreferencesPage() {
  const form = document.getElementById('preferencesForm');
  if (!form) return;

  /* Budget slider */
  const slider  = document.getElementById('prefBudget');
  const display = document.getElementById('prefBudgetDisplay');
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = `RM ${parseFloat(slider.value).toFixed(0)}`;
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.background =
        `linear-gradient(to right, var(--primary) ${pct}%, var(--gray-200) ${pct}%)`;
    });
    /* init fill */
    const pct0 = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
      `linear-gradient(to right, var(--primary) ${pct0}%, var(--gray-200) ${pct0}%)`;
  }

  /* Halal label */
  const halalToggle = document.getElementById('prefHalalToggle');
  const halalLabel  = document.getElementById('prefHalalLabel');
  if (halalToggle && halalLabel) {
    halalToggle.addEventListener('change', () => {
      halalLabel.textContent = halalToggle.checked ? 'On' : 'Off';
    });
  }

  /* Category checkboxes */
  document.querySelectorAll('.cat-checkbox input').forEach(cb => {
    cb.addEventListener('change', function () {
      this.closest('.cat-checkbox').classList.toggle('active', this.checked);
    });
  });

  /* Store checkboxes */
  document.querySelectorAll('.store-select input').forEach(cb => {
    cb.addEventListener('change', function () {
      this.closest('.store-select').classList.toggle('active', this.checked);
    });
  });

  /* Form submit */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    btn.disabled = true;
    setTimeout(() => {
      showToast('Preferences saved!', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    }, 1200);
  });
}

/* Preset modes */
function setPreset(btn, mode) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const slider  = document.getElementById('prefBudget');
  const display = document.getElementById('prefBudgetDisplay');
  const presets = {
    budget:  { budget: 150,  cats: ['Staples','Canned Goods','Seasoning'] },
    family:  { budget: 500,  cats: ['Staples','Dairy','Bakery','Snacks'] },
    healthy: { budget: 350,  cats: ['Dairy','Beverages','Snacks'] },
    quick:   { budget: 200,  cats: ['Instant Food','Canned Goods','Bakery'] },
  };
  const cfg = presets[mode];
  if (cfg && slider) {
    slider.value = cfg.budget;
    if (display) display.textContent = `RM ${cfg.budget}`;
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
      `linear-gradient(to right, var(--primary) ${pct}%, var(--gray-200) ${pct}%)`;
  }
  showToast(`Preset "${btn.querySelector('span').textContent}" applied`, 'info', 2000);
}

/* ============================================================
   PRODUCTS PAGE (standalone filter functions for inline use)
   ============================================================ */
function filterCat(btn, cat) {
  document.querySelectorAll('.category-pills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
  renderCards();
}

function updateBudget(slider) {
  const display = document.getElementById('budgetDisplay');
  const val = parseFloat(slider.value);
  if (display) display.textContent = val >= parseFloat(slider.max) ? 'Any' : `RM ${val.toFixed(0)}`;
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background =
    `linear-gradient(to right, var(--primary) ${pct}%, var(--gray-200) ${pct}%)`;
  renderCards();
}

function filterItems() {
  const label = document.getElementById('halalLabel');
  if (label) {
    label.textContent = document.getElementById('halalToggle').checked ? 'On' : 'Off';
  }
  renderCards();
}

function sortItems() { renderCards(); }

function liveSearch(input) {
  const term = input.value.toLowerCase();
  const grid = document.getElementById('groceryGrid');
  if (!grid) return;

  const budget    = parseFloat(document.getElementById('budgetSlider')?.value || 500);
  const halalOnly = document.getElementById('halalToggle')?.checked || false;
  const sortVal   = document.getElementById('sortSelect')?.value   || 'relevance';

  let filtered = GROCERY_DATA.filter(g => {
    if (getBestPrice(g) > budget) return false;
    if (halalOnly && !g.halal) return false;
    if (activeCategory !== 'All' && g.category !== activeCategory) return false;
    if (term && !g.name.toLowerCase().includes(term)
             && !g.brand.toLowerCase().includes(term)
             && !g.category.toLowerCase().includes(term)) return false;
    return true;
  });

  sortData(filtered, sortVal === 'relevance' ? 'score' : sortVal);

  grid.innerHTML = filtered.length
    ? filtered.map((g, i) => buildCard(g, i * 40)).join('')
    : `<div class="no-results">
         <i class="fas fa-search"></i>
         <p>No results for "${input.value}".<br><small>Try a different search term.</small></p>
       </div>`;
}

/* ============================================================
   SHARED — USER MENU TOGGLE (Products & Comparison pages)
   ============================================================ */
function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('open');
}

document.addEventListener('click', e => {
  const avatar = document.querySelector('.nav-avatar');
  const menu   = document.getElementById('userMenu');
  if (menu && avatar && !avatar.contains(e.target)) {
    menu.classList.remove('open');
  }
  /* dashboard dropdown */
  const uMenu = document.querySelector('.user-menu');
  const dd    = document.getElementById('userDropdown');
  if (dd && uMenu && !uMenu.contains(e.target)) {
    dd.classList.remove('open');
  }
});

/* ── Mobile nav toggle ── */
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
}

/* ── Search handler (dashboard) ── */
let searchTerm = '';
function handleSearch(val) {
  searchTerm = val.toLowerCase();
  renderCards();
}

/* ============================================================
   TOP RANKING PAGE
   Ranks products across AEON, Lotus's, and Mydin by:
   1. Lowest Price — cheapest item at best store
   2. Best Value   — highest hybrid score per RM spent
   3. Most Popular — highest popularity score
   ============================================================ */
let activeRankTab = 'price';

function initRankingPage() {
  const container = document.getElementById('rankingContainer');
  if (!container) return;
  renderRanking('price');
}

function switchRankTab(type) {
  activeRankTab = type;
  document.querySelectorAll('.rank-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === type));
  renderRanking(type);
}

function renderRanking(type) {
  const container = document.getElementById('rankingContainer');
  if (!container) return;

  /* Filter products that are actually available (have at least one store price) */
  const available = GROCERY_DATA.filter(g => getBestPrice(g) > 0);

  let sorted;
  if (type === 'price') {
    sorted = [...available].sort((a, b) => getBestPrice(a) - getBestPrice(b));
  } else if (type === 'value') {
    sorted = [...available].sort((a, b) => getValueScore(b) - getValueScore(a));
  } else {
    sorted = [...available].sort((a, b) => b.popularity - a.popularity);
  }

  const top = sorted.slice(0, 10);

  const medals = ['🥇','🥈','🥉'];
  const rankColors = ['#ffd700','#c0c0c0','#cd7f32'];

  container.innerHTML = top.map((g, i) => {
    const best      = getBestPrice(g);
    const bestStore = getBestStore(g);
    const imgUrl    = getProductImage(g);
    const rank      = i + 1;
    const medal     = medals[i] || `#${rank}`;
    const medalColor = rankColors[i] || 'var(--primary)';
    const jakimInfo = getJakimDetails(g);
    const certActive = isCertActive(jakimInfo);

    const metricHtml = type === 'price'
      ? `<div class="rank-metric"><span>Best Price</span><strong style="color:var(--primary)">RM ${best.toFixed(2)}</strong></div>`
      : type === 'value'
        ? `<div class="rank-metric"><span>Value Score</span><strong style="color:var(--primary)">${getValueScore(g)}</strong></div>`
        : `<div class="rank-metric"><span>Popularity</span><strong style="color:var(--primary)">${g.popularity}%</strong></div>`;

    return `
    <div class="rank-card" onclick="openProductModal(${g.id})" style="cursor:pointer;">
      <!-- Rank badge -->
      <div class="rank-badge" style="background:${i < 3 ? medalColor + '22' : 'var(--gray-100)'}; color:${i < 3 ? medalColor : 'var(--text-muted)'}; border:2px solid ${i < 3 ? medalColor : 'var(--border)'};">
        ${i < 3 ? medals[i] : `#${rank}`}
      </div>

      <!-- Product image / icon -->
      <div class="rank-img-wrap" style="background:${g.color};">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${g.name}"
                 style="width:52px;height:52px;object-fit:contain;"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
             <span style="display:none;font-size:2rem;">${g.icon}</span>`
          : `<span style="font-size:2rem;">${g.icon}</span>`}
      </div>

      <!-- Product info -->
      <div class="rank-info">
        <div class="rank-name">${g.name}</div>
        <div class="rank-meta">${g.brand} &middot; ${g.category} ${g.weight ? '&middot; ' + g.weight : ''}</div>
        <div style="display:flex; gap:.5rem; margin-top:.3rem; flex-wrap:wrap;">
          <span class="halal-badge ${g.halal ? 'certified' : g.halalStatus === 'Unknown' ? 'unknown' : 'not-certified'}" style="font-size:.6rem;">
            ${g.halal
              ? (certActive ? '✓ JAKIM' : '↺ JAKIM')
              : g.halalStatus === 'Unknown' ? '? Unknown' : '✗ Uncert.'}
          </span>
          <span style="font-size:.68rem; background:var(--gray-100); padding:.15rem .5rem; border-radius:10px; color:var(--text-muted);">
            <i class="fas fa-star" style="color:#f59e0b; font-size:.55rem;"></i> ${g.score}% match
          </span>
          ${g.discount ? `<span style="font-size:.68rem; background:#fff3e0; padding:.15rem .5rem; border-radius:10px; color:#e65100;"><i class="fas fa-percent" style="font-size:.55rem;"></i> ${g.discount}</span>` : ''}
        </div>
      </div>

      <!-- Metric & store -->
      <div class="rank-right">
        ${metricHtml}
        <div class="rank-store-badges">
          ${[['AEON', g.prices.aeon], ["Lotus's", g.prices.lotus], ['Mydin', g.prices.mydin]].map(([s, p]) =>
            p !== null && p !== undefined
              ? `<span class="store-price-tag ${getBestStore(g) === s ? 'best' : ''}">${s}: RM ${p.toFixed(2)}</span>`
              : ''
          ).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  /* Update count label */
  const lbl = document.getElementById('rankCount');
  if (lbl) lbl.textContent = `Top ${top.length} of ${available.length} products`;
}

/* ============================================================
   DOM READY — Auto-detect page and initialise
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  /* ── Detect auth pages first — affects what gets injected below ── */
  const _curPage  = location.pathname.split('/').pop() || 'index.html';
  const isAuthPage = _curPage === 'login.html' || _curPage === 'register.html';

  /* ── Non-data UI injected immediately ── */
  /* Auth pages have no footer — footer would push total height past 100vh causing scroll */
  injectComponents({
    logoTarget:   'logo-placeholder',
    footerTarget: isAuthPage ? null : 'footer-placeholder',
    logoLink:     'index.html',
  });

  initPasswordToggle();
  initPasswordStrength();

  /* ── Page detection ── */
  const isDashboard    = !!document.getElementById('statBudget');
  const isProductsPage = !!document.getElementById('groceryGrid') && !isDashboard;
  const isPrefsPage    = !!document.getElementById('preferencesForm');
  const isCompPage     = !!document.getElementById('comparisonBody');
  const isRankPage     = !!document.getElementById('rankingContainer');
  const isHomePage     = !!document.getElementById('homeGroceryGrid');
  const needsData      = isDashboard || isProductsPage || isCompPage || isRankPage || isHomePage;
  const fullyProtected = isDashboard || isPrefsPage || isCompPage;
  const guestAllowed   = isProductsPage || isRankPage;

  /* ── Show loading spinner while waiting for data + auth ── */
  if (needsData) {
    const loadTarget = document.getElementById('groceryGrid')
                    || document.getElementById('comparisonBody')
                    || document.getElementById('rankingContainer')
                    || document.getElementById('homeGroceryGrid');
    if (loadTarget) {
      loadTarget.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);
                    grid-column:1/-1; width:100%;">
          <i class="fas fa-spinner fa-spin" style="font-size:2rem; color:var(--primary);"></i>
          <p style="margin-top:.8rem; font-size:.88rem;">Loading products from database…</p>
        </div>`;
    }
  }

  /* ── Wait for Firebase Auth state AND product data in parallel ── */
  if (needsData) {
    await Promise.all([window.hsAuthReady, loadGroceryData()]);
  } else {
    await window.hsAuthReady;   /* always wait for auth — login/register/prefs need it */
  }

  /* ── Now _currentUser is known — initialise auth-dependent forms ── */
  initLoginForm();
  initRegisterForm();

  /* ── Auth guard for protected pages ── */
  if (fullyProtected || guestAllowed) {
    const auth = requireAuth();
    if (!auth) return;  /* false = not authenticated → redirected to login.html */

    if (auth === 'guest') {
      if (fullyProtected) {
        const label = isDashboard ? 'Dashboard' : isPrefsPage ? 'Preferences' : 'Price Comparison';
        showGuestLockedPage(label);
        return;
      }
      injectGuestBanner();
    }
  }

  /* Inject session user name into navbar / hero on all protected pages */
  injectSessionUser();

  /* ── Personalise dashboard hero greeting ── */
  const heroEl = document.querySelector('.hero-name');
  if (heroEl) {
    const user      = getSession();
    const firstName = user ? user.name.split(' ')[0] : 'there';
    const hour      = new Date().getHours();
    const greet     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl   = document.querySelector('.hero-greeting');
    if (greetEl) greetEl.innerHTML = `<i class="fas fa-sun" style="color:#f9ca24"></i> ${greet}`;
    heroEl.textContent = `Hello, ${firstName}! 👋`;
    /* Sync budget stat */
    const budgetEl = document.getElementById('statBudget');
    if (budgetEl && user) budgetEl.textContent = `RM ${user.budget || 200}`;
  }

  /* Dashboard / Products */
  if (document.getElementById('groceryGrid')) {
    initDashboard();
  }

  /* Preferences page */
  if (document.getElementById('preferencesForm')) {
    initPreferencesPage();
  }

  /* Comparison page */
  if (document.getElementById('comparisonBody')) {
    initComparisonPage();
  }

  /* Ranking page */
  if (document.getElementById('rankingContainer')) {
    initRankingPage();
  }

  /* Home page sample grid — wait for data, then render top 6 */
  if (isHomePage) {
    const grid = document.getElementById('homeGroceryGrid');
    if (grid) {
      const topItems = [...GROCERY_DATA].sort((a, b) => b.score - a.score).slice(0, 6);
      grid.innerHTML = topItems.map((g, i) => buildCard(g, i * 60)).join('');
    }
  }
});
