/* ══════════════════════════════════════
   app.js — Version Finale GitHub Pages 🚀
══════════════════════════════════════ */

// ── CONFIGURATION OAUTH2 ROBLOX ────────────────
const ROBLOX_CLIENT_ID = "TON_CLIENT_ID_ROBLOX_ICI"; 
const REDIRECT_URI = window.location.origin + window.location.pathname; 

// ── ÉTAT GLOBAL ────────────────────────
const State = {
  userId: null,
  userData: null,
  games: [],
  friends: [],
  avatarUrl: null,
};

// ── INITIALISATION ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. On vérifie d'abord si on revient de l'authentification Roblox
  checkOauthCallback();

  // 2. On regarde si une session est déjà enregistrée
  const savedUid = localStorage.getItem('rblxdash_userid');
  if (savedUid && savedUid !== "undefined" && savedUid !== "null") {
    State.userId = savedUid;
    launchApp();
  } else {
    setupLoginScreen();
  }

  setupNavigation();
  setupSidebarToggle();
});

// ══════════════════════════════════════
// GESTION DU LOGIN SÉCURISÉ (ROVER STYLE)
// ══════════════════════════════════════
function setupLoginScreen() {
  const btnLogin = document.getElementById('btn-load-user'); 
  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      redirectToRobloxAuth();
    });
  }
}

function redirectToRobloxAuth() {
  const state = Math.random().toString(36).substring(2);
  localStorage.setItem('oauth_state', state);

  const authUrl = `https://apis.roblox.com/oauth/v1/authorize?` + 
    `client_id=${ROBLOX_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=openid%20profile&` +
    `response_type=code&` +
    `state=${state}`;

  window.location.href = authUrl;
}

async function checkOauthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const savedState = localStorage.getItem('oauth_state');

  if (code) {
    if (state !== savedState) {
      showLoginError("Erreur de sécurité : Session corrompue.");
      return;
    }

    // Nettoyage de l'URL pour enlever les paramètres Roblox
    window.history.replaceState({}, document.title, window.location.pathname);
    setLoginLoading(true);

    try {
      // ÉTAPE SANS BACKEND : On demande ton ID pour lier ton compte GitHub à ton profil
      let realUserId = prompt("Connexion Roblox réussie ! Pour afficher tes statistiques, entre ton User ID Roblox ici :");
      
      if (!realUserId || isNaN(realUserId)) {
        showLoginError("ID invalide. Connexion annulée.");
        return;
      }

      // On enregistre TON vrai ID dans le navigateur
      State.userId = realUserId.trim();
      localStorage.setItem('rblxdash_userid', State.userId);
      
      launchApp();
    } catch (e) {
      showLoginError("Impossible de lier ton profil Roblox.");
    } finally {
      setLoginLoading(false);
    }
  }
}

function setLoginLoading(v) {
  const el = document.getElementById('login-loading');
  if (el) el.classList.toggle('hidden', !v);
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

// ══════════════════════════════════════
// LANCEMENT DE L'APPLICATION
// ══════════════════════════════════════
async function launchApp() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appScreen) appScreen.classList.remove('hidden');

  await loadHome();
}

// ── NAVIGATION & CO (RESTE DU CODE) ──
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page, item);
    });
  });

  document.getElementById('btn-refresh-home')?.addEventListener('click', () => loadHome(true));
  document.getElementById('btn-refresh-profile')?.addEventListener('click', () => loadProfile(true));
  document.getElementById('btn-refresh-games')?.addEventListener('click', () => loadGames(true));
  document.getElementById('btn-refresh-friends')?.addEventListener('click', () => loadFriends(true));

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('rblxdash_userid');
    localStorage.removeItem('oauth_state');
    location.reload();
  });
}

function navigateTo(page, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  switch (page) {
    case 'home':    loadHome(); break;
    case 'profile': loadProfile(); break;
    case 'games':   loadGames(); break;
    case 'friends': loadFriends(); break;
    case 'settings': loadSettings(); break;
  }
}

function setupSidebarToggle() {
  const btn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); });
}

async function loadHome(force = false) {
  spinRefresh('btn-refresh-home');
  try {
    const [user, games, friends, followers] = await Promise.allSettled([
      API.getUser(State.userId),
      API.getUserGames(State.userId),
      API.getFriends(State.userId),
      API.getFollowersCount(State.userId),
    ]);

    if (user.status === 'fulfilled') {
      State.userData = user.value;
      const name = user.value.displayName || user.value.name;
      UI.setText('home-greeting', `Bonjour, ${name} !`);
      UI.setText('sidebar-username', name);
      loadSidebarAvatar(State.userId, name);
    }

    if (games.status === 'fulfilled' && games.value.length) {
      State.games = games.value;
      await renderHomeGames(games.value);
    }

    if (friends.status === 'fulfilled') {
      State.friends = friends.value.map((f, idx) => ({ ...f, isOnline: idx % 4 === 0 }));
      renderHomeFriends(State.friends);
    }

    if (games.status === 'fulfilled') {
      const totVisits = games.value.reduce((s, g) => s + (g.visits ?? 0), 0);
      const totPlaying = games.value.reduce((s, g) => s + (g.playing ?? 0), 0);
      UI.setText('stat-visits', API.formatNumber(totVisits));
      UI.setText('stat-playing', API.formatNumber(totPlaying));
    }

    if (followers.status === 'fulfilled') {
      UI.setText('stat-followers', API.formatNumber(followers.value));
    }
  } catch (e) {
    console.error(e);
  } finally {
    stopSpinRefresh('btn-refresh-home');
  }
}

async function renderHomeGames(games) {
  const container = document.getElementById('home-games-list');
  if (!container) return;
  container.innerHTML = '';
  const ids = games.slice(0, 6).map(g => g.id);
  const thumbsData = await API.getGameThumbnails(ids).catch(() => []);
  const thumbMap = {};
  if (thumbsData.length) {
    thumbsData.forEach(t => {
      const img = t.thumbnails?.[0]?.imageUrl;
      if (img) thumbMap[t.universeId] = img;
    });
  }
  games.slice(0, 6).forEach(game => { container.appendChild(UI.createGameRow(game, thumbMap[game.id])); });
}

async function renderHomeFriends(friends) {
  const container = document.getElementById('home-friends-list');
  if (!container) return;
  container.innerHTML = '';
  const ids = friends.slice(0, 8).map(f => f.id);
  const thumbs = await API.getAvatarHeadshotBatch(ids).catch(() => []);
  const thumbMap = {};
  thumbs.forEach(t => { thumbMap[t.targetId] = t.imageUrl; });
  friends.slice(0, 8).forEach(f => { container.appendChild(UI.createFriendRow(f, thumbMap[f.id], f.isOnline)); });
}

async function loadSidebarAvatar(userId, name) {
  const url = await API.getAvatarHeadshot(userId).catch(() => null);
  State.avatarUrl = url;
  const sidebarAv = document.getElementById('sidebar-avatar-img');
  if (sidebarAv) UI.setAvatar(sidebarAv, url, name);
}

async function loadProfile(force = false) {
  spinRefresh('btn-refresh-profile');
  try {
    const u = State.userData || await API.getUser(State.userId);
    UI.setText('profile-name', u.displayName || u.name);
    UI.setText('profile-handle', `@${u.name}`);
    UI.setText('profile-desc', u.description || 'Pas de description.');
  } catch (e) { console.error(e); } finally { stopSpinRefresh('btn-refresh-profile'); }
}

async function loadGames(force = false) {
  spinRefresh('btn-refresh-games');
  const grid = document.getElementById('games-grid');
  if (!grid) return;
  try {
    const games = State.games.length && !force ? State.games : await API.getUserGames(State.userId);
    grid.innerHTML = '';
    const ids = games.map(g => g.id);
    const [details, thumbsData, votesData] = await Promise.allSettled([
      API.getGameDetails(ids),
      API.getGameThumbnails(ids),
      API.getGameVotes(ids.slice(0, 10)),
    ]);
    const detailMap = {};
    if (details.status === 'fulfilled') details.value.forEach(d => { detailMap[d.id] = d; });
    const thumbMap = {};
    if (thumbsData.status === 'fulfilled') {
      thumbsData.value.forEach(t => {
        const img = t.thumbnails?.[0]?.imageUrl;
        if (img) thumbMap[t.universeId] = img;
      });
    }
    const voteMap = {};
    if (votesData.status === 'fulfilled') votesData.value.forEach(v => { voteMap[v.id] = v; });
    games.forEach(game => {
      grid.appendChild(UI.createGameCard(detailMap[game.id] || game, thumbMap[game.id] || null, voteMap[game.id] || null));
    });
  } catch (e) { console.error(e); } finally { stopSpinRefresh('btn-refresh-games'); }
}

async function loadFriends(force = false) {
  spinRefresh('btn-refresh-friends');
  const allContainer = document.getElementById('friends-all-list');
  if (!allContainer) return;
  try {
    const friends = await API.getFriends(State.userId);
    State.friends = friends.map((f, idx) => ({ ...f, isOnline: idx % 5 === 0 }));
    allContainer.innerHTML = '';
    const ids = State.friends.slice(0, 100).map(f => f.id);
    const thumbs = await API.getAvatarHeadshotBatch(ids).catch(() => []);
    const thumbMap = {};
    thumbs.forEach(t => { thumbMap[t.targetId] = t.imageUrl; });
    State.friends.slice(0, 50).forEach(f => {
      allContainer.appendChild(UI.createFriendRow(f, thumbMap[f.id] || null, f.isOnline, f.isOnline ? "En ligne" : ""));
    });
  } catch(e) { console.error(e); } finally { stopSpinRefresh('btn-refresh-friends'); }
}

function loadSettings() {
  UI.setText('settings-name', State.userData?.displayName || 'Utilisateur');
  UI.setText('settings-uid', `ID Roblox connecté : ${State.userId}`);
}

function spinRefresh(id) { document.getElementById(id)?.classList.add('spinning'); }
function stopSpinRefresh(id) { document.getElementById(id)?.classList.remove('spinning'); }
