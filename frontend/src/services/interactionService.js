import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  setDoc,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { movieService } from './movieService';

// In-memory fallback stores for when Firebase is not yet configured with valid credentials
const localMemoryStore = {
  favorites: {},
  watchlist: {},
  ratings: {},
  history: {},
};

function getCurrentUserId() {
  return auth?.currentUser?.uid || 'guest-user';
}

async function getMovieData(movieId) {
  try {
    const res = await movieService.getMovieById(movieId);
    return res.data;
  } catch {
    return { id: String(movieId), title: `Movie #${movieId}` };
  }
}

export const interactionService = {
  // ── Ratings ─────────────────────────────────────────────────────────────
  getMyRatings: async (params = {}) => {
    const limit = params.limit || 50;
    const uid = getCurrentUserId();

    if (!isFirebaseConfigured || uid === 'guest-user') {
      const userRatings = Object.values(localMemoryStore.ratings[uid] || {});
      return { data: userRatings.slice(0, limit) };
    }

    try {
      const q = query(collection(db, 'users', uid, 'ratings'), firestoreLimit(limit));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { data: items };
    } catch (e) {
      console.warn('Firestore ratings get error:', e);
      return { data: [] };
    }
  },

  createRating: async ({ movie_id, rating }) => {
    const uid = getCurrentUserId();
    const movie = await getMovieData(movie_id);
    const ratingItem = {
      id: String(movie_id),
      movie_id: Number(movie_id),
      rating: Number(rating),
      movie,
      created_at: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (!localMemoryStore.ratings[uid]) localMemoryStore.ratings[uid] = {};
      localMemoryStore.ratings[uid][movie_id] = ratingItem;
      return { data: ratingItem };
    }

    await setDoc(doc(db, 'users', uid, 'ratings', String(movie_id)), ratingItem);
    return { data: ratingItem };
  },

  updateRating: async (movieId, { rating }) => {
    return interactionService.createRating({ movie_id: movieId, rating });
  },

  deleteRating: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (localMemoryStore.ratings[uid]) {
        delete localMemoryStore.ratings[uid][movieId];
      }
      return { data: { success: true } };
    }

    await deleteDoc(doc(db, 'users', uid, 'ratings', String(movieId)));
    return { data: { success: true } };
  },

  getMovieRatings: async (movieId) => {
    return { data: [] };
  },

  // ── Favorites ───────────────────────────────────────────────────────────
  getFavorites: async (params = {}) => {
    const limit = params.limit || 50;
    const uid = getCurrentUserId();

    if (!isFirebaseConfigured || uid === 'guest-user') {
      const items = Object.values(localMemoryStore.favorites[uid] || {});
      return { data: items.slice(0, limit) };
    }

    try {
      const q = query(collection(db, 'users', uid, 'favorites'), firestoreLimit(limit));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { data: items };
    } catch (e) {
      console.warn('Firestore favorites get error:', e);
      return { data: [] };
    }
  },

  addFavorite: async (movieId) => {
    const uid = getCurrentUserId();
    const movie = await getMovieData(movieId);
    const item = {
      id: String(movieId),
      movie_id: Number(movieId),
      movie,
      created_at: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (!localMemoryStore.favorites[uid]) localMemoryStore.favorites[uid] = {};
      localMemoryStore.favorites[uid][movieId] = item;
      return { data: item };
    }

    await setDoc(doc(db, 'users', uid, 'favorites', String(movieId)), item);
    return { data: item };
  },

  removeFavorite: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (localMemoryStore.favorites[uid]) {
        delete localMemoryStore.favorites[uid][movieId];
      }
      return { data: { success: true } };
    }

    await deleteDoc(doc(db, 'users', uid, 'favorites', String(movieId)));
    return { data: { success: true } };
  },

  getFavoriteStatus: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      const isFav = Boolean(localMemoryStore.favorites[uid]?.[movieId]);
      return { data: { is_favorite: isFav } };
    }

    try {
      const snap = await getDoc(doc(db, 'users', uid, 'favorites', String(movieId)));
      return { data: { is_favorite: snap.exists() } };
    } catch {
      return { data: { is_favorite: false } };
    }
  },

  // ── Watchlist ───────────────────────────────────────────────────────────
  getWatchlist: async (params = {}) => {
    const limit = params.limit || 50;
    const uid = getCurrentUserId();

    if (!isFirebaseConfigured || uid === 'guest-user') {
      const items = Object.values(localMemoryStore.watchlist[uid] || {});
      return { data: items.slice(0, limit) };
    }

    try {
      const q = query(collection(db, 'users', uid, 'watchlist'), firestoreLimit(limit));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { data: items };
    } catch (e) {
      console.warn('Firestore watchlist get error:', e);
      return { data: [] };
    }
  },

  addWatchlist: async (movieId) => {
    const uid = getCurrentUserId();
    const movie = await getMovieData(movieId);
    const item = {
      id: String(movieId),
      movie_id: Number(movieId),
      movie,
      created_at: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (!localMemoryStore.watchlist[uid]) localMemoryStore.watchlist[uid] = {};
      localMemoryStore.watchlist[uid][movieId] = item;
      return { data: item };
    }

    await setDoc(doc(db, 'users', uid, 'watchlist', String(movieId)), item);
    return { data: item };
  },

  removeWatchlist: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (localMemoryStore.watchlist[uid]) {
        delete localMemoryStore.watchlist[uid][movieId];
      }
      return { data: { success: true } };
    }

    await deleteDoc(doc(db, 'users', uid, 'watchlist', String(movieId)));
    return { data: { success: true } };
  },

  getWatchlistStatus: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      const inWl = Boolean(localMemoryStore.watchlist[uid]?.[movieId]);
      return { data: { in_watchlist: inWl } };
    }

    try {
      const snap = await getDoc(doc(db, 'users', uid, 'watchlist', String(movieId)));
      return { data: { in_watchlist: snap.exists() } };
    } catch {
      return { data: { in_watchlist: false } };
    }
  },

  // ── History ─────────────────────────────────────────────────────────────
  getHistory: async (params = {}) => {
    const limit = params.limit || 20;
    const uid = getCurrentUserId();

    if (!isFirebaseConfigured || uid === 'guest-user') {
      const items = Object.values(localMemoryStore.history[uid] || {});
      return { data: items.slice(0, limit) };
    }

    try {
      const q = query(collection(db, 'users', uid, 'history'), firestoreLimit(limit));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { data: items };
    } catch (e) {
      console.warn('Firestore history get error:', e);
      return { data: [] };
    }
  },

  addHistory: async (movieId) => {
    const uid = getCurrentUserId();
    const movie = await getMovieData(movieId);
    const item = {
      id: String(movieId),
      movie_id: Number(movieId),
      movie,
      viewed_at: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (!localMemoryStore.history[uid]) localMemoryStore.history[uid] = {};
      localMemoryStore.history[uid][movieId] = item;
      return { data: item };
    }

    await setDoc(doc(db, 'users', uid, 'history', String(movieId)), item);
    return { data: item };
  },

  deleteHistory: async (movieId) => {
    const uid = getCurrentUserId();
    if (!isFirebaseConfigured || uid === 'guest-user') {
      if (localMemoryStore.history[uid]) {
        delete localMemoryStore.history[uid][movieId];
      }
      return { data: { success: true } };
    }

    await deleteDoc(doc(db, 'users', uid, 'history', String(movieId)));
    return { data: { success: true } };
  },
};
