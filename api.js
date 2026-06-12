/* ══════════════════════════════════════
   api.js — Couche d'accès à l'API Roblox
   Utilise un proxy stable sans authentification
══════════════════════════════════════ */

const API = (() => {

  // Proxy CORS super stable et libre d'accès (ZÉRO reconnexion requise)
  const PROXY = 'https://corsproxy.io/?url=';

  // Cache simple pour éviter les appels répétitifs
  const cache = {};
  const CACHE_TTL = 60 * 1000; // 1 minute

  async function fetchProxy(url) {
    const now = Date.now();
    if (cache[url] && now - cache[url].ts < CACHE_TTL) {
      return cache[url].data;
    }

    // Avec corsproxy.io, on encode l'URL cible
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Ce proxy renvoie DIRECTEMENT le JSON de Roblox pur (pas d'enveloppe .contents)
    const data = await res.json();
    cache[url] = { data, ts: now };
    return data;
  }

  // ── UTILISATEURS ──────────────────────────

  /** Récupère les infos d'un utilisateur par ID */
  async function getUser(userId) {
    return fetchProxy(`https://users.roblox.com/v1/users/${userId}`);
  }

  /** Recherche un utilisateur par nom */
  async function searchUser(username) {
    return fetchProxy(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`);
  }

  /** Récupère l'URL de l'avatar (headshot) */
  async function getAvatarHeadshot(userId, size = '150x150') {
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`
    );
    return data?.data?.[0]?.imageUrl ?? null;
  }

  /** Récupère l'avatar complet */
  async function getAvatarFull(userId) {
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`
    );
    return data?.data?.[0]?.imageUrl ?? null;
  }

  /** Nombre d'abonnés */
  async function getFollowersCount(userId) {
    const data = await fetchProxy(
      `https://friends.roblox.com/v1/users/${userId}/followers/count`
    );
    return data?.count ?? 0;
  }

  /** Nombre de suivis */
  async function getFollowingCount(userId) {
    const data = await fetchProxy(
      `https://friends.roblox.com/v1/users/${userId}/followings/count`
    );
    return data?.count ?? 0;
  }

  /** Nombre d'amis */
  async function getFriendsCount(userId) {
    const data = await fetchProxy(
      `https://friends.roblox.com/v1/users/${userId}/friends/count`
    );
    return data?.count ?? 0;
  }

  /** Liste des amis */
  async function getFriends(userId) {
    const data = await fetchProxy(
      `https://friends.roblox.com/v1/users/${userId}/friends`
    );
    return data?.data ?? [];
  }

  /** Avatars de plusieurs utilisateurs en batch */
  async function getAvatarHeadshotBatch(userIds) {
    if (!userIds.length) return [];
    const ids = userIds.slice(0, 100).join(',');
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=100x100&format=Png&isCircular=false`
    );
    return data?.data ?? [];
  }

  // ── JEUX ──────────────────────────────────

  /** Jeux d'un utilisateur */
  async function getUserGames(userId) {
    const data = await fetchProxy(
      `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&limit=50&sortOrder=Asc`
    );
    return data?.data ?? [];
  }

  /** Détails complets d'un jeu (par universeId) */
  async function getGameDetails(universeIds) {
    if (!universeIds.length) return [];
    const ids = universeIds.join(',');
    const data = await fetchProxy(
      `https://games.roblox.com/v1/games?universeIds=${ids}`
    );
    return data?.data ?? [];
  }

  /** Thumbnails des jeux */
  async function getGameThumbnails(universeIds) {
    if (!universeIds.length) return [];
    const ids = universeIds.join(',');
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${ids}&size=768x432&format=Png&countPerUniverse=1`
    );
    return data?.data ?? [];
  }

  /** Votes d'un jeu */
  async function getGameVotes(universeIds) {
    if (!universeIds.length) return [];
    const ids = universeIds.join(',');
    const data = await fetchProxy(
      `https://games.roblox.com/v1/games/votes?universeIds=${ids}`
    );
    return data?.data ?? [];
  }

  // ── GROUPES ───────────────────────────────

  /** Groupes d'un utilisateur */
  async function getUserGroups(userId) {
    const data = await fetchProxy(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`
    );
    return data?.data ?? [];
  }

  /** Icône d'un groupe */
  async function getGroupIcon(groupId) {
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=150x150&format=Png`
    );
    return data?.data?.[0]?.imageUrl ?? null;
  }

  // ── BADGES ────────────────────────────────

  /** Badges récents d'un utilisateur */
  async function getUserBadges(userId, limit = 24) {
    const data = await fetchProxy(
      `https://badges.roblox.com/v1/users/${userId}/badges?limit=${limit}&sortOrder=Desc`
    );
    return data?.data ?? [];
  }

  /** Thumbnails des badges */
  async function getBadgeThumbnails(badgeIds) {
    if (!badgeIds.length) return [];
    const ids = badgeIds.join(',');
    const data = await fetchProxy(
      `https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${ids}&size=150x150&format=Png`
    );
    return data?.data ?? [];
  }

  // ── HELPERS ───────────────────────────────

  function formatNumber(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('fr-FR');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const y = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const m = Math.floor(diff / (30 * 24 * 3600 * 1000));
    const d = Math.floor(diff / (24 * 3600 * 1000));
    if (y > 0) return `il y a ${y} an${y > 1 ? 's' : ''}`;
    if (m > 0) return `il y a ${m} mois`;
    return `il y a ${d} jour${d > 1 ? 's' : ''}`;
  }

  function clearCache() { Object.keys(cache).forEach(k => delete cache[k]); }

  return {
    getUser, getAvatarHeadshot, getAvatarFull, getAvatarHeadshotBatch,
    getFollowersCount, getFollowingCount, getFriendsCount, getFriends,
    getUserGames, getGameDetails, getGameThumbnails, getGameVotes,
    getUserGroups, getGroupIcon, getUserBadges, getBadgeThumbnails,
    formatNumber, formatDate, timeAgo, clearCache,
  };

})();