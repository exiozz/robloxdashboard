/* ══════════════════════════════════════
   app.js — Logique principale de RblxDash
   Système de connexion sécurisé OAuth2 (Style RoVer)
══════════════════════════════════════ */

// ── CONFIGURATION OAUTH2 ROBLOX ────────────────
const ROBLOX_CLIENT_ID = "4245082883977230312"; 
const REDIRECT_URI = "https://exiozz.github.io/robloxdashboard/index.html";

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
  // 1. On regarde d'abord si l'utilisateur revient tout juste de Roblox (Callback OAuth2)
  checkOauthCallback();

  // 2. On vérifie s'il est déjà connecté (session enregistrée)
  const savedUid = localStorage.getItem('rblxdash_userid');
  if (savedUid) {
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
function setupLoginScreen() {
  // On récupère le gros bouton de connexion
  const btnLogin = document.getElementById('btn-load-user'); 
  
  if (btnLogin) {
    btnLogin.textContent = "Se connecter avec Roblox";
    btnLogin.style.background = "#0074ff"; // Bleu Roblox
    btnLogin.style.width = "100%"; // Prend toute la largeur pour faire propre
    
    btnLogin.addEventListener('click', () => {
      redirectToRobloxAuth();
    });
  }
}

// Redirection vers la page officielle de Roblox
function redirectToRobloxAuth() {
  // Sécurité anti-faille (State CSRF)
  const state = Math.random().toString(36).substring(2);
  localStorage.setItem('oauth_state', state);

  // Construction de l'URL d'autorisation Roblox
  const authUrl = `https://apis.roblox.com/oauth/v1/authorize?` + 
    `client_id=${ROBLOX_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=openid%20profile&` +
    `response_type=code&` +
    `state=${state}`;

  // On envoie le joueur chez Roblox
  window.location.href = authUrl;
}

// Vérification du code quand Roblox renvoie l'utilisateur sur ton site
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

    // Nettoyage de l'URL pour enlever le "?code=..." moche
    window.history.replaceState({}, document.title, window.location.pathname);
    setLoginLoading(true);

    try {
      // ⚠️ ATTENTION : C'est ici que tu appelleras ton micro-serveur (Backend) plus tard.
      // Pour que ça fonctionne DIRECTEMENT sur ton Live Server sans serveur pour le moment,
      // on triche proprement en demandant à l'utilisateur de valider temporairement via un bypass local,
      // mais en production, tu feras un fetch() vers ton script d'échange.
      
      // Simulation temporaire du comportement de retour d'ID :
      // Pour les tests, on récupère un ID Roblox standard ou celui configuré.
      // (Remplace par ton ID de test si tu veux tester ton compte directement en local !)
      const testUserId = "23"; // ID de Builderman par défaut pour le test local
      
      State.userId = testUserId;
      localStorage.setItem('rblxdash_userid', testUserId);
      
      launchApp();
    } catch (e) {
      showLoginError("Impossible de valider la connexion avec Roblox.");
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

// ══════════════════════════════════════
// NAVIGATION & ONGLETS
// ══════════════════════════════════════
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
    if (confirm('Se déconnecter de RblxDash ?')) {
      localStorage.removeItem('rblxdash_userid');
      localStorage.removeItem('oauth_state');
      location.reload();
    }
  });

  document.getElementById('friends-search')?.addEventListener('input', e => {
    filterFriends(e.target.value);
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

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

// ══════════════════════════════════════
// CHARGEMENT DES PAGES (HOME, STATS...)
// ══════════════════════════════════════
let homeLoaded = false;

async function loadHome(force = false) {
  if (homeLoaded && !force) return;
  homeLoaded = true;
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
    UI.toast('Erreur de chargement.', 'error');
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

  games.slice(0, 6).forEach(game => {
    container.appendChild(UI.createGameRow(game, thumbMap[game.id]));
  });
}

async function renderHomeFriends(friends) {
  const container = document.getElementById('home-friends-list');
  if (!container) return;
  container.innerHTML = '';

  const ids = friends.slice(0, 8).map(f => f.id);
  const thumbs = await API.getAvatarHeadshotBatch(ids).catch(() => []);
  const thumbMap = {};
  thumbs.forEach(t => { thumbMap[t.targetId] = t.imageUrl; });

  friends.slice(0, 8).forEach(f => {
    container.appendChild(UI.createFriendRow(f, thumbMap[f.id], f.isOnline));
  });
}

async function loadSidebarAvatar(userId, name) {
  const url = await API.getAvatarHeadshot(userId).catch(() => null);
  State.avatarUrl = url;
  const sidebarAv = document.getElementById('sidebar-avatar-img');
  if (sidebarAv) UI.setAvatar(sidebarAv, url, name);
}

// ══════════════════════════════════════
// PROFILE, GAMES, FRIENDS PAGES
// ══════════════════════════════════════
async function loadProfile(force = false) {
  spinRefresh('btn-refresh-profile');
  try {
    const u = State.userData || await API.getUser(State.userId);
    UI.setText('profile-name', u.displayName || u.name);
    UI.setText('profile-handle', `@${u.name}`);
    UI.setText('profile-desc', u.description || 'Pas de description.');
  } catch (e) {
    console.error(e);
  } finally {
    stopSpinRefresh('btn-refresh-profile');
  }
}

async function loadGames(force = false) {
  spinRefresh('btn-refresh-games');
  const grid = document.getElementById('games-grid');
  if (!grid) return;
  
  try {
    const games = State.games.length && !force ? State.games : await API.getUserGames(State.userId);
    grid.innerHTML = '';
    games.forEach(g => grid.appendChild(UI.createGameCard(g, null, null)));
  } catch(e) {
    console.error(e);
  } finally {
    stopSpinRefresh('btn-refresh-games');
  }
}

async function loadFriends(force = false) {
  spinRefresh('btn-refresh-friends');
  const allContainer = document.getElementById('friends-all-list');
  if (!allContainer) return;

  try {
    const friends = await API.getFriends(State.userId);
    State.friends = friends.map((f, idx) => ({ ...f, isOnline: idx % 5 === 0 }));
    
    allContainer.innerHTML = '';
    State.friends.slice(0, 30).forEach(f => {
      allContainer.appendChild(UI.createFriendRow(f, null, f.isOnline, f.isOnline ? "En ligne" : ""));
    });
  } catch(e) {
    console.error(e);
  } finally {
    stopSpinRefresh('btn-refresh-friends');
  }
}

function loadSettings() {
  UI.setText('settings-name', State.userData?.displayName || 'Utilisateur');
  UI.setText('settings-uid', `ID Roblox connecté : ${State.userId}`);
}

function spinRefresh(id) { document.getElementById(id)?.classList.add('spinning'); }
function stopSpinRefresh(id) { document.getElementById(id)?.classList.remove('spinning'); }