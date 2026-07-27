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

function _hsToastContainer() {
  var el = document.getElementById('hsToastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'hsToastContainer';
    el.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:99999',
      'display:flex', 'flex-direction:column', 'gap:.5rem', 'align-items:flex-end'
    ].join(';');
    document.body.appendChild(el);
  }
  return el;
}

function _hsToast(msg, type) {
  var colors = {
    warn: '#e07b39',
    info: '#3498db',
    danger: '#c0392b',
    ok: '#0d5c40'
  };
  var icons = {
    warn: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
    danger: 'fa-circle-exclamation',
    ok: 'fa-circle-check'
  };
  var key = colors[type] ? type : 'ok';
  var div = document.createElement('div');
  div.style.cssText = [
    'background:' + colors[key], 'color:#fff', 'padding:.65rem 1rem',
    'border-radius:10px', 'font-size:.82rem', 'font-weight:600',
    'box-shadow:0 8px 24px rgba(0,0,0,.2)', 'max-width:320px',
    'display:flex', 'align-items:center', 'gap:.5rem',
    'opacity:0', 'transform:translateY(8px)', 'transition:opacity .25s, transform .25s'
  ].join(';');
  div.innerHTML = '<i class="fas ' + icons[key] + '"></i><span>' + msg + '</span>';
  _hsToastContainer().appendChild(div);
  requestAnimationFrame(function() {
    div.style.opacity = '1';
    div.style.transform = 'translateY(0)';
  });
  setTimeout(function() {
    div.style.opacity = '0';
    div.style.transform = 'translateY(8px)';
    setTimeout(function() { if (div.parentNode) div.parentNode.removeChild(div); }, 250);
  }, 2800);
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

/* ── Shopping List (logged-in users only, real server state, no guest fallback).
   Note: this is a personal "save for later / plan my budget" list, not a
   checkout cart — HalalSaver MY is a recommender, not a shopping site. ──── */
function addToList(productId, quantity) {
  if (!productId) return;
  quantity = quantity || 1;

  if (typeof window.__IS_LOGGED_IN__ !== 'undefined' && !window.__IS_LOGGED_IN__) {
    if (typeof showGuestPrompt === 'function') showGuestPrompt();
    return;
  }

  fetch('/list/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: String(productId), quantity: quantity })
  })
    .then(function(r) { return r.json().then(function(data) { return { status: r.status, data: data }; }); })
    .then(function(res) {
      if (res.status === 401) {
        if (typeof showGuestPrompt === 'function') showGuestPrompt();
        return;
      }
      _hsToast('<i class="fas fa-list-check"></i> Added to your list', 'ok');
      if (typeof refreshListBadge === 'function') refreshListBadge(res.data.list_count || 0);
    })
    .catch(function() {});
}

function updateListQty(productId, quantity) {
  if (!productId) return;
  fetch('/list/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: String(productId), quantity: quantity })
  })
    .then(function(r) { return r.json(); })
    .then(function() { window.location.reload(); })
    .catch(function() {});
}

function removeFromList(productId) {
  if (!productId) return;
  fetch('/list/remove', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: String(productId) })
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _hsToast('<i class="fas fa-trash"></i> Removed from your list', 'warn');
      if (typeof refreshListBadge === 'function') refreshListBadge(data.list_count || 0);
      var row = document.querySelector('[data-list-row="' + productId + '"]');
      if (row) row.remove(); else window.location.reload();
    })
    .catch(function() {});
}

/* ── User feedback (star rating) ─────────────────────────────────────────── */
function submitRating(productId, stars, containerEl) {
  if (!productId || !stars) return;

  if (typeof window.__IS_LOGGED_IN__ !== 'undefined' && !window.__IS_LOGGED_IN__) {
    _hsLoginPrompt('rate products');
    return;
  }

  fetch('/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: String(productId), rating: stars, interaction_type: 'rating' })
  })
    .then(function(r) {
      if (r.status === 401) { _hsLoginPrompt('rate products'); return; }
      _hsToast('<i class="fas fa-star"></i> Thanks for your rating!', 'ok');
      _fillRatingStars(containerEl, stars);
    })
    .catch(function() {});
}

function _fillRatingStars(containerEl, stars) {
  if (!containerEl) return;
  containerEl.querySelectorAll('[data-val]').forEach(function(icon) {
    var val = parseInt(icon.getAttribute('data-val'), 10);
    icon.classList.toggle('fas', val <= stars);
    icon.classList.toggle('far', val > stars);
  });
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
});
