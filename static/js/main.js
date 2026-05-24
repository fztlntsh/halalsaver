/*
 * main.js — HalalSaver MY
 * Core client-side utilities: favourites, compare list, viewed tracking
 */

/* ── Storage keys ─────────────────────────────────────────────────────────── */
const LS_FAVS    = 'halalsaver_favs';
const LS_COMPARE = 'halalsaver_compare';
const LS_VIEWED  = 'halalsaver_viewed';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function _getList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function _setList(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}
function _showToast(msg, type) {
  // Reuse Bootstrap alert as a toast
  const div = document.createElement('div');
  div.className = 'alert alert-' + (type || 'success') + ' alert-dismissible fade show halalsaver-toast';
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;min-width:260px;text-align:center;font-size:.85rem;box-shadow:0 4px 16px rgba(0,0,0,.15);';
  div.innerHTML = msg + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
  document.body.appendChild(div);
  setTimeout(function() { div.remove(); }, 2800);
}

/* ── Favourites ───────────────────────────────────────────────────────────── */
function toggleFav(productId) {
  if (!productId) return;
  const favs = _getList(LS_FAVS);
  const idx  = favs.indexOf(String(productId));

  if (idx === -1) {
    favs.push(String(productId));
    _setList(LS_FAVS, favs);
    _showToast('<i class="fas fa-heart" style="color:#e74c3c"></i> Added to favourites', 'success');
    // Also POST to server (best-effort, non-blocking)
    fetch('/favourites/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: String(productId) })
    }).catch(function() {});
    // Update all matching fav buttons on page
    _updateFavButtons(productId, true);
  } else {
    favs.splice(idx, 1);
    _setList(LS_FAVS, favs);
    _showToast('<i class="fas fa-heart-crack"></i> Removed from favourites', 'secondary');
    fetch('/favourites/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: String(productId) })
    }).catch(function() {});
    _updateFavButtons(productId, false);
  }

  // Update stats counter
  var favCount = document.getElementById('favCount');
  if (favCount) favCount.textContent = _getList(LS_FAVS).length;
}

function _updateFavButtons(productId, active) {
  document.querySelectorAll('.fav-btn[onclick*="' + productId + '"]').forEach(function(btn) {
    btn.classList.toggle('active', active);
    var icon = btn.querySelector('i');
    if (icon) icon.style.color = active ? '#e74c3c' : '';
  });
}

/* ── Compare List ─────────────────────────────────────────────────────────── */
function addToCompare(productId) {
  if (!productId) return;
  const compare = _getList(LS_COMPARE);
  const pid = String(productId);

  if (compare.includes(pid)) {
    _showToast('<i class="fas fa-info-circle"></i> Already in comparison list', 'info');
    return;
  }
  if (compare.length >= 4) {
    _showToast('<i class="fas fa-exclamation-triangle"></i> Max 4 products can be compared', 'warning');
    return;
  }
  compare.push(pid);
  _setList(LS_COMPARE, compare);
  _showToast('<i class="fas fa-balance-scale"></i> Added to compare list (' + compare.length + '/4)', 'success');

  // Update stats counter
  var compareCount = document.getElementById('compareCount');
  if (compareCount) compareCount.textContent = _getList(LS_COMPARE).length;

  // Show compare bar if it exists
  _updateCompareBar();
}

function removeFromCompare(productId) {
  var compare = _getList(LS_COMPARE).filter(function(id) { return id !== String(productId); });
  _setList(LS_COMPARE, compare);
  _updateCompareBar();
  var compareCount = document.getElementById('compareCount');
  if (compareCount) compareCount.textContent = compare.length;
}

function goToComparison() {
  var ids = _getList(LS_COMPARE);
  if (ids.length === 0) {
    _showToast('<i class="fas fa-info-circle"></i> Add products to compare first', 'info');
    return;
  }
  window.location.href = '/comparison?ids=' + ids.join(',');
}

/* ── Floating compare bar ─────────────────────────────────────────────────── */
function _updateCompareBar() {
  var compare = _getList(LS_COMPARE);
  var bar = document.getElementById('compareFloatBar');
  if (!bar) return;
  if (compare.length === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  var countEl = bar.querySelector('.compare-bar-count');
  if (countEl) countEl.textContent = compare.length + ' product' + (compare.length > 1 ? 's' : '') + ' selected';
}

/* ── Product view tracking ────────────────────────────────────────────────── */
function trackView(productId) {
  if (!productId) return;
  var viewed = _getList(LS_VIEWED);
  var pid = String(productId);
  if (!viewed.includes(pid)) {
    viewed.unshift(pid);
    if (viewed.length > 50) viewed = viewed.slice(0, 50);
    _setList(LS_VIEWED, viewed);
  }
  var viewedCount = document.getElementById('viewedCount');
  if (viewedCount) viewedCount.textContent = _getList(LS_VIEWED).length;
}

/* ── Init on DOM ready ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // Restore fav button states
  var favs = _getList(LS_FAVS);
  favs.forEach(function(pid) { _updateFavButtons(pid, true); });

  // Inject compare float bar (outside mobile bottom nav zone)
  if (!document.getElementById('compareFloatBar')) {
    var bar = document.createElement('div');
    bar.id = 'compareFloatBar';
    bar.style.cssText = [
      'display:none',
      'position:fixed',
      'bottom:72px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#2d7a4f',
      'color:#fff',
      'border-radius:30px',
      'padding:.55rem 1.25rem',
      'font-size:.82rem',
      'font-weight:700',
      'gap:.75rem',
      'align-items:center',
      'z-index:998',
      'box-shadow:0 4px 16px rgba(45,122,79,.4)',
      'white-space:nowrap',
      'cursor:pointer'
    ].join(';');
    bar.innerHTML = '<i class="fas fa-balance-scale"></i> <span class="compare-bar-count"></span> &nbsp;|&nbsp; <span onclick="goToComparison()" style="text-decoration:underline;cursor:pointer">Compare Now</span> &nbsp;<span onclick="_clearCompare()" style="opacity:.7;cursor:pointer">✕</span>';
    bar.addEventListener('click', function(e) {
      if (e.target === bar || e.target.classList.contains('compare-bar-count')) goToComparison();
    });
    document.body.appendChild(bar);
  }
  _updateCompareBar();
});

function _clearCompare() {
  _setList(LS_COMPARE, []);
  _updateCompareBar();
  var compareCount = document.getElementById('compareCount');
  if (compareCount) compareCount.textContent = '0';
}