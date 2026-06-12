/* ══════════════════════════════════════
   ui.js — Helpers de rendu et d'affichage
══════════════════════════════════════ */

const UI = (() => {

  /* ── TOAST ─────────────────────────────── */
  let toastTimer = null;
  function toast(msg, type = 'info', duration = 3500) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast toast-${type}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  /* ── AVATAR IMG ─────────────────────────── */
  function setAvatar(container, url, fallback = '?') {
    if (!container) return;
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Avatar';
      img.onerror = () => setAvatarFallback(container, fallback);
      container.innerHTML = '';
      container.appendChild(img);
    } else {
      setAvatarFallback(container, fallback);
    }
  }

  function setAvatarFallback(container, letter) {
    if (!container) return;
    container.innerHTML = `<div style="width:100%;height:100%;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#00c6ff;">${letter[0]?.toUpperCase() ?? '?'}</div>`;
  }

  /* ── GAME ROW ───────────────────────────── */
  function createGameRow(game, thumbUrl) {
    const row = document.createElement('div');
    row.className = 'game-item-row';
    row.innerHTML = `
      <div class=\"game-row-thumb\">
        ${thumbUrl ? `<img src="${thumbUrl}" alt="${escHtml(game.name)}" />` : `<div class="no-thumb">🎮</div>`}
      </div>
      <div class=\"game-row-info\">
        <div class=\"game-row-name\">${escHtml(game.name)}</div>
        <div class=\"game-row-stats\">
          <span><i class=\"ti ti-eye\"></i> ${API.formatNumber(game.visits)}</span>
          <span><i class=\"ti ti-users\"></i> ${API.formatNumber(game.playing)}</span>
        </div>
      </div>
    `;
    return row;
  }

  /* ── FRIEND ROW ─────────────────────────── */
  function createFriendRow(friend, avatarUrl, isOnline, customStatus = '') {
    const row = document.createElement('div');
    row.className = 'friend-item-row';
    
    let statusClass = 'offline';
    let label = 'Hors ligne';
    
    if (isOnline) {
      statusClass = customStatus && customStatus !== 'Website' ? 'ingame' : 'online';
      label = customStatus || 'En ligne';
    }

    row.innerHTML = `
      <div class=\"friend-avatar-wrapper\">
        <div class=\"friend-row-avatar\">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="${escHtml(friend.displayName)}" />` : `?`}
        </div>
        <span class=\"status-dot ${statusClass}\"></span>
      </div>
      <div class=\"friend-row-info\">
        <div class=\"friend-row-name\">${escHtml(friend.displayName || friend.name)}</div>
        <div class=\"friend-row-status\">${escHtml(label)}</div>
      </div>
    `;
    return row;
  }

  /* ── GAME CARD ──────────────────────────── */
  function createGameCard(game, thumbUrl, votes) {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    let rating = '—';
    if (votes && (votes.upVotes + votes.downVotes) > 0) {
      rating = Math.round((votes.upVotes / (votes.upVotes + votes.downVotes)) * 100) + '%';
    }

    card.innerHTML = `
      <div class=\"game-card-thumb\">
        ${thumbUrl ? `<img src="${thumbUrl}" alt="${escHtml(game.name)}" />` : `<div class="no-thumb">🎮</div>`}
        <div class=\"game-card-playing\"><span class=\"pulse-dot\"></span>${API.formatNumber(game.playing)} en jeu</div>
      </div>
      <div class=\"game-card-body\">
        <h3 class=\"game-card-title\">${escHtml(game.name)}</h3>
        <p class=\"game-card-desc\">${escHtml(game.description || 'Aucune description disponible.')}</p>
        <div class=\"game-card-meta\">
          <div class=\"meta-i\"><i class=\"ti ti-eye\"></i><span>${API.formatNumber(game.visits)}</span></div>
          <div class=\"meta-i\"><i class=\"ti ti-thumb-up\"></i><span>${rating}</span></div>
        </div>
      </div>
    `;
    return card;
  }

  /* ── GROUP ITEM ─────────────────────────── */
  function createGroupItem(group, iconUrl) {
    const item = document.createElement('div');
    item.className = 'group-item-card';
    item.innerHTML = `
      <div class=\"group-icon\">
        ${iconUrl ? `<img src="${iconUrl}" alt="${escHtml(group.group.name)}" />` : `👥`}
      </div>
      <div class=\"group-info\">
        <div class=\"group-name\">${escHtml(group.group.name)}</div>
        <div class=\"group-role\">${escHtml(group.role.name)} (Rang ${group.role.rank})</div>
      </div>
    `;
    return item;
  }

  /* ── BADGE ITEM ─────────────────────────── */
  function createBadgeItem(badge, thumbUrl) {
    const item = document.createElement('div');
    item.className = 'badge-item';
    item.title = badge.name;
    item.innerHTML = `
      ${thumbUrl
        ? `<img src="${thumbUrl}" alt="${escHtml(badge.name)}" loading="lazy" />`
        : `<div style="width:48px;height:48px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:22px;">🏅</div>`
      }
      <span>${escHtml(badge.name.length > 12 ? badge.name.slice(0, 12) + '…' : badge.name)}</span>
    `;
    return item;
  }

  /* ── EMPTY STATE ────────────────────────── */
  function emptyState(container, icon, msg) {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-${icon}" aria-hidden="true"></i>
        <p>${msg}</p>
      </div>
    `;
  }

  /* ── HELPERS ────────────────────────────── */
  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { toast, setAvatar, createGameRow, createFriendRow, createGameCard, createGroupItem, createBadgeItem, emptyState, escHtml, setText };

})();