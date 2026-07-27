/*
 * functions.js — HalalSaver MY
 * Product interactions: favourites, compare tray, toast notifications
 * Loaded after main.js in base.html
 */

/* ── Storage keys ─────────────────────────────────────────────────────────── */
var HS_FAVS    = 'halalsaver_favs';
var HS_COMPARE = 'halalsaver_compare';
var HS_VIEWED  = 'halalsaver_viewed';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function _hsList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
}
function _hsSet(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch(e) {}
}

function _hsToast(msg, type) {
  var div = document.createElement('div');
  div.style.cssText = [
    'position:fixed', 'bottom:88px', 'left:50%', 'transform:translateX(-50%)',
    'background:' + (type === 'warn' ? '#f39c12' : type === 'info' ? '#3498db' : '#2d7a4f'),
    'color:#fff', 'padding:.6rem 1.2rem', 'border-radius:24px',
    'font-size:.82rem', 'font-weight:600', 'z-index:99999',
    'box-shadow:0 4px 16px rgba(0,0,0,.25)', 'white-space:nowrap',
    'max-width:90vw', 'text-align:center', 'pointer-events:none'
  ].join(';');
  div.innerHTML = msg;
  document.body.appendChild(div);
  setTimeout(function() {
    div.style.transition = 'opacity .4s';
    div.style.opacity = '0';
    setTimeout(function() { if (div.parentNode) div.parentNode.removeChild(div); }, 400);
  }, 2500);
}

function _hsLoginPrompt(action) {
  _hsToast(
    '<i class="fas fa-lock"></i> Please <a href="/login" style="color:#fff;text-decoration:underline;pointer-events:auto">sign in</a> to ' + (action || 'do this'),
    'info'
  );
}

/* ── Favourites ───────────────────────────────────────────────────────────── */
function toggleFav(productId) {
  if (!productId) return;
  var pid = String(productId);

  // If not logged in, prompt sign-in
  if (typeof window.__IS_LOGGED_IN__ !== 'undefined' && !window.__IS_LOGGED_IN__) {
    _hsLoginPrompt('save favourites');
    return;
  }

  var favs = _hsList(HS_FAVS);
  var idx  = favs.indexOf(pid);

  if (idx === -1) {
    favs.push(pid);
    _hsSet(HS_FAVS, favs);
    _hsToast('<i class="fas fa-heart"></i> Added to favourites', 'ok');
    _updateFavBtns(pid, true);

    // Best-effort POST to server
    fetch('/favourites/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: pid })
    }).then(function(r) {
      if (r.status === 401) {
        // Was actually a guest — undo and prompt
        var f2 = _hsList(HS_FAVS);
        f2.splice(f2.indexOf(pid), 1);
        _hsSet(HS_FAVS, f2);
        _updateFavBtns(pid, false);
        _hsLoginPrompt('save favourites');
      }
    }).catch(function() {});
  } else {
    favs.splice(idx, 1);
    _hsSet(HS_FAVS, favs);
    _hsToast('<i class="fas fa-heart-crack"></i> Removed from favourites', 'warn');
    _updateFavBtns(pid, false);

    fetch('/favourites/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: pid })
    }).catch(function() {});
  }

  // Refresh stats counter
  var el = document.getElementById('favCount');
  if (el) el.textContent = _hsList(HS_FAVS).length;
}

function _updateFavBtns(pid, active) {
  document.querySelectorAll('.fav-btn').forEach(function(btn) {
    var oc = btn.getAttribute('onclick') || '';
    if (oc.indexOf("'" + pid + "'") !== -1 || oc.indexOf('"' + pid + '"') !== -1) {
      btn.classList.toggle('fav-active', active);
      var icon = btn.querySelector('i');
      if (icon) icon.style.color = active ? '#e74c3c' : '';
    }
  });
}

/* ── Compare tray ─────────────────────────────────────────────────────────── */
function addToCompare(productId) {
  if (!productId) return;
  var pid     = String(productId);
  var compare = _hsList(HS_COMPARE);

  if (compare.indexOf(pid) !== -1) {
    _hsToast('<i class="fas fa-info-circle"></i> Already in compare list', 'info');
    _showCompareTray();
    return;
  }
  if (compare.length >= 4) {
    _hsToast('<i class="fas fa-exclamation-triangle"></i> Max 4 products. <a href="/comparison?ids=' + compare.join(',') + '" style="color:#fff;text-decoration:underline;pointer-events:auto">Compare now</a>', 'warn');
    return;
  }

  compare.push(pid);
  _hsSet(HS_COMPARE, compare);
  _hsToast('<i class="fas fa-balance-scale"></i> Added (' + compare.length + '/4). <a href="/comparison?ids=' + compare.join(',') + '" style="color:#fff;text-decoration:underline;pointer-events:auto">Compare now</a>', 'ok');
  _showCompareTray();

  var el = document.getElementById('compareCount');
  if (el) el.textContent = compare.length;
}

function goToComparison() {
  var ids = _hsList(HS_COMPARE);
  if (ids.length === 0) {
    _hsToast('<i class="fas fa-info-circle"></i> Add products first using the compare button', 'info');
    return;
  }
  window.location.href = '/comparison?ids=' + ids.join(',');
}

function _clearCompareList() {
  _hsSet(HS_COMPARE, []);
  _hideCompareTray();
  var el = document.getElementById('compareCount');
  if (el) el.textContent = '0';
}

/* ── Compare Tray (sticky bar at bottom) ─────────────────────────────────── */
function _getOrCreateTray() {
  var tray = document.getElementById('hs-compare-tray');
  if (tray) return tray;

  tray = document.createElement('div');
  tray.id = 'hs-compare-tray';
  tray.innerHTML = [
    '<span class="ctr-label"><i class="fas fa-balance-scale"></i> <span id="ctr-count"></span> selected</span>',
    '<button class="ctr-btn ctr-go" onclick="goToComparison()">Compare Now <i class="fas fa-arrow-right"></i></button>',
    '<button class="ctr-btn ctr-clear" onclick="_clearCompareList()" title="Clear"><i class="fas fa-times"></i></button>'
  ].join('');

  // Inject styles once
  if (!document.getElementById('hs-ctr-style')) {
    var s = document.createElement('style');
    s.id = 'hs-ctr-style';
    s.textContent = [
      '#hs-compare-tray{',
        'position:fixed;bottom:72px;left:50%;transform:translateX(-50%);',
        'background:#1a4a2e;color:#fff;',
        'border-radius:30px;padding:.55rem .75rem .55rem 1.2rem;',
        'display:none;align-items:center;gap:.6rem;',
        'z-index:9990;box-shadow:0 4px 20px rgba(0,0,0,.35);',
        'font-size:.82rem;font-weight:600;white-space:nowrap;',
        'border:2px solid rgba(255,255,255,.15);',
      '}',
      '.body.web-layout #hs-compare-tray{bottom:24px;}',
      '.ctr-label{opacity:.9;}',
      '.ctr-btn{border:none;border-radius:20px;padding:.3rem .85rem;font-size:.8rem;font-weight:700;cursor:pointer;}',
      '.ctr-go{background:#2d7a4f;color:#fff;}',
      '.ctr-go:hover{background:#3a9e66;}',
      '.ctr-clear{background:rgba(255,255,255,.15);color:#fff;padding:.3rem .6rem;}',
      '.ctr-clear:hover{background:rgba(255,255,255,.25);}',
    ].join('');
    document.head.appendChild(s);
  }

  document.body.appendChild(tray);
  return tray;
}

function _showCompareTray() {
  var compare = _hsList(HS_COMPARE);
  if (compare.length === 0) { _hideCompareTray(); return; }
  var tray = _getOrCreateTray();
  var countEl = document.getElementById('ctr-count');
  if (countEl) countEl.textContent = compare.length;
  tray.style.display = 'flex';
}

function _hideCompareTray() {
  var tray = document.getElementById('hs-compare-tray');
  if (tray) tray.style.display = 'none';
}

/* ── View tracking ────────────────────────────────────────────────────────── */
function trackView(productId) {
  if (!productId) return;
  var pid = String(productId);
  var viewed = _hsList(HS_VIEWED);
  if (viewed.indexOf(pid) === -1) {
    viewed.unshift(pid);
    if (viewed.length > 50) viewed = viewed.slice(0, 50);
    _hsSet(HS_VIEWED, viewed);
  }
  var el = document.getElementById('viewedCount');
  if (el) el.textContent = _hsList(HS_VIEWED).length;
}

/* ── Shopping list ("My Grocery List") ───────────────────────────────────── */
function addToList(productId) {
  if (!productId) return;
  var pid = String(productId);

  if (typeof window.__IS_LOGGED_IN__ !== 'undefined' && !window.__IS_LOGGED_IN__) {
    _hsLoginPrompt('add items to your shopping list');
    return;
  }

  fetch('/api/list/' + encodeURIComponent(pid), { method: 'POST' })
    .then(function(r) {
      if (r.status === 401) { _hsLoginPrompt('add items to your shopping list'); return null; }
      return r.json();
    })
    .then(function(data) {
      if (!data) return;
      _hsToast('<i class="fas fa-list-check"></i> Added to your list', 'ok');
      if (typeof window.refreshListBadge === 'function') window.refreshListBadge(data.count);
    })
    .catch(function() {});
}

function updateListQty(productId, quantity) {
  if (!productId) return;
  var pid = String(productId);
  if (quantity <= 0) { removeFromList(pid); return; }

  fetch('/api/list/' + encodeURIComponent(pid), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: quantity })
  })
    .then(function() { window.location.reload(); })
    .catch(function() {});
}

function removeFromList(productId) {
  if (!productId) return;
  fetch('/api/list/' + encodeURIComponent(productId), { method: 'DELETE' })
    .then(function() { window.location.reload(); })
    .catch(function() {});
}

/* ── Product rating widget (quick-view modal + product detail page) ─────── */
function submitRating(productId, value, containerEl) {
  if (!productId) return;

  if (typeof window.__IS_LOGGED_IN__ !== 'undefined' && !window.__IS_LOGGED_IN__) {
    _hsLoginPrompt('rate products');
    return;
  }

  fetch('/api/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: String(productId), rating: value, interaction_type: 'rating' })
  })
    .then(function(r) { return r.json(); })
    .then(function() {
      _hsToast('<i class="fas fa-star"></i> Thanks for rating!', 'ok');
      if (containerEl) {
        containerEl.querySelectorAll('.rate-star').forEach(function(star) {
          var v = parseInt(star.getAttribute('data-val'), 10);
          star.classList.toggle('rated', v <= value);
          star.classList.toggle('fas', v <= value);
          star.classList.toggle('far', v > value);
        });
      }
    })
    .catch(function() {});
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // Restore fav button states
  _hsList(HS_FAVS).forEach(function(pid) { _updateFavBtns(pid, true); });

  // Show compare tray if items queued
  _showCompareTray();

  // Update stat counters in dashboard
  var favEl     = document.getElementById('favCount');
  var cmpEl     = document.getElementById('compareCount');
  var viewEl    = document.getElementById('viewedCount');
  if (favEl)  favEl.textContent  = _hsList(HS_FAVS).length;
  if (cmpEl)  cmpEl.textContent  = _hsList(HS_COMPARE).length;
  if (viewEl) viewEl.textContent = _hsList(HS_VIEWED).length;

  _hsInitScrollReveal();
});

/* ── Scroll reveal — fade + slide cards in as they enter the viewport ───────
   Applies to every card-like element site-wide so motion feels consistent
   across products / comparison / ranking / dashboard. Re-run after any
   dynamic re-render (e.g. AJAX'd recommendations) by calling this again. ── */
function _hsInitScrollReveal(root) {
  if (!('IntersectionObserver' in window)) return;
  var selector = '.product-card, .dash-card, .deal-card, .ranking-item, ' +
    '.podium-item, .comparison-table-wrap, .compare-mobile-card, ' +
    '.cat-icon-item, .store-badge-card, .how-step';
  var scope = root || document;
  var els = scope.querySelectorAll(selector);
  if (!els.length) return;

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry, i) {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = ((i % 6) * 60) + 'ms';
        entry.target.classList.add('reveal-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function(el) {
    if (el.classList.contains('reveal-in')) return;
    el.classList.add('reveal-init');
    io.observe(el);
  });
}
