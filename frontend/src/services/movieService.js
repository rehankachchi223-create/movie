import { INITIAL_MOVIES, INITIAL_GENRES } from '../firebase/seedMovies.js';
import { detectIndustry, normalizeIndustryId, filterGenresForIndustry } from '../utils/industry.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Read TMDB API key from Vite environment or fallback safely
const TMDB_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_TMDB_API_KEY) ||
  '8273c4b4af21ec6b800732ae3c5d589e';

// Pre-defined TMDB standard genre dictionary
const TMDB_GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// In-memory cache for TMDB responses to minimize API calls and boost performance
const memoryCache = new Map();

/**
 * Generic TMDB fetch helper with caching and error handling using native browser fetch
 */
async function tmdbFetch(endpoint, params = {}) {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
  if (memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB HTTP error ${response.status} for ${endpoint}`);
  }

  const data = await response.json();
  memoryCache.set(url, data);
  return data;
}

/**
 * Normalize TMDB raw movie item into application movie schema with Industry classification
 */
function normalizeMovie(tmdbMovie) {
  if (!tmdbMovie) return null;

  // Resolve genres
  let genres = [];
  if (Array.isArray(tmdbMovie.genres) && tmdbMovie.genres.length > 0) {
    genres = tmdbMovie.genres.map((g) => ({
      id: g.id,
      name: g.name,
    }));
  } else if (Array.isArray(tmdbMovie.genre_ids)) {
    genres = tmdbMovie.genre_ids.map((id) => ({
      id,
      name: TMDB_GENRE_MAP[id] || 'General',
    }));
  }

  // Resolve poster and backdrop URLs
  const poster_url = tmdbMovie.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${tmdbMovie.poster_path}`
    : tmdbMovie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80';

  const backdrop_url = tmdbMovie.backdrop_path
    ? `${TMDB_IMAGE_BASE}/original${tmdbMovie.backdrop_path}`
    : tmdbMovie.backdrop_url || poster_url;

  // Resolve director and cast if available
  let director = tmdbMovie.director || null;
  let cast_list = tmdbMovie.cast_list || null;
  let keywords = '';
  let trailer_url = tmdbMovie.trailer_url || null;

  if (tmdbMovie.credits) {
    const crew = tmdbMovie.credits.crew || [];
    const dir = crew.find((c) => c.job === 'Director');
    if (dir) director = dir.name;

    const cast = tmdbMovie.credits.cast || [];
    if (cast.length > 0) {
      cast_list = cast.slice(0, 8).map((c) => c.name).join(', ');
    }
  }

  if (typeof tmdbMovie.keywords === 'string') {
    keywords = tmdbMovie.keywords;
  } else if (tmdbMovie.keywords && typeof tmdbMovie.keywords === 'object') {
    const kList = tmdbMovie.keywords.keywords || tmdbMovie.keywords.results || [];
    if (Array.isArray(kList)) {
      keywords = kList.slice(0, 15).map((k) => k.name || k).join(', ');
    }
  }

  let video_key = tmdbMovie.video_key || tmdbMovie.trailer_key || null;
  if (tmdbMovie.videos && Array.isArray(tmdbMovie.videos.results)) {
    const ytVideos = tmdbMovie.videos.results.filter((v) => v.site === 'YouTube' && v.key);
    const chosen =
      ytVideos.find((v) => v.type === 'Trailer' && v.official) ||
      ytVideos.find((v) => v.type === 'Trailer') ||
      ytVideos.find((v) => v.type === 'Teaser' && v.official) ||
      ytVideos.find((v) => v.type === 'Teaser') ||
      ytVideos.find((v) => v.type === 'Clip') ||
      ytVideos[0];
    if (chosen) {
      video_key = chosen.key;
      trailer_url = `https://www.youtube.com/watch?v=${chosen.key}`;
    }
  } else if (!trailer_url && video_key) {
    trailer_url = `https://www.youtube.com/watch?v=${video_key}`;
  }

  // Detect industry based on metadata
  const original_language = tmdbMovie.original_language || tmdbMovie.language || 'en';
  const origin_country = tmdbMovie.origin_country || [];
  const industry = detectIndustry({
    ...tmdbMovie,
    original_language,
    origin_country,
    genres,
    keywords,
  });

  return {
    id: String(tmdbMovie.id),
    external_id: `tmdb-${tmdbMovie.id}`,
    title: tmdbMovie.title || tmdbMovie.name || 'Untitled',
    overview: tmdbMovie.overview || 'No overview available for this title.',
    tagline: tmdbMovie.tagline || '',
    release_date: tmdbMovie.release_date || tmdbMovie.first_air_date || '',
    runtime: tmdbMovie.runtime || null,
    rating: Number((tmdbMovie.vote_average || tmdbMovie.rating || 0).toFixed(1)),
    poster_url,
    backdrop_url,
    director,
    cast_list,
    keywords,
    genres,
    original_language,
    origin_country,
    industry,
    trailer_url,
    video_key,
  };
}

export const movieService = {
  /**
   * Filter, sort, and paginate live movies via Industry -> Genre -> Movies hierarchy
   */
  getMovies: async (params = {}) => {
    const {
      page = 1,
      limit = 12,
      industry = 'all',
      search = '',
      genre_id = '',
      year = '',
      min_rating = '',
      sort_by = 'popular',
    } = params;

    const normIndustry = normalizeIndustryId(industry);

    try {
      if (search && search.trim()) {
        // Use live TMDB Search
        const data = await tmdbFetch('/search/movie', {
          query: search.trim(),
          page: String(Number(page) || 1),
          include_adult: 'false',
        });

        let items = (data.results || []).map(normalizeMovie);

        // Strictly respect selected industry during search
        if (normIndustry !== 'all') {
          items = items.filter((m) => m.industry === normIndustry);
        }

        // Apply genre filter if active
        if (genre_id) {
          items = items.filter((m) =>
            (m.genres || []).some(
              (g) => String(g.id) === String(genre_id) || String(g.name).toLowerCase() === String(genre_id).toLowerCase()
            )
          );
        }

        return {
          data: {
            items: items.slice(0, limit),
            meta: {
              page: Number(data.page || 1),
              total_pages: Math.min(data.total_pages || 1, 50),
              total_items: data.total_results || items.length,
            },
          },
        };
      }

      // Live TMDB Discover with custom Industry and Genre filters
      let tmdbSort = 'popularity.desc';
      if (sort_by === 'rating') tmdbSort = 'vote_average.desc';
      if (sort_by === 'release_date') tmdbSort = 'primary_release_date.desc';
      if (sort_by === 'title') tmdbSort = 'original_title.asc';

      const discoverParams = {
        page: String(Number(page) || 1),
        sort_by: tmdbSort,
        include_adult: 'false',
      };

      // ── Apply Industry classification filter ──────────────────────────────
      if (normIndustry === 'bollywood') {
        discoverParams.with_original_language = 'hi';
      } else if (normIndustry === 'hollywood') {
        discoverParams.with_original_language = 'en';
        discoverParams.with_origin_country = 'US';
      } else if (normIndustry === 'anime') {
        discoverParams.with_original_language = 'ja';
        // Anime is Japanese Animation (ID 16 in TMDB)
        discoverParams.with_genres = genre_id ? `${genre_id},16` : '16';
      } else if (normIndustry === 'korean') {
        discoverParams.with_original_language = 'ko';
      } else if (normIndustry === 'other') {
        discoverParams.without_original_language = 'en,hi,ja,ko';
      }

      // ── Apply Genre secondary filter (if not already handled by anime) ────
      if (genre_id && normIndustry !== 'anime') {
        discoverParams.with_genres = String(genre_id);
      }

      if (year) discoverParams.primary_release_year = String(year);
      if (min_rating) {
        discoverParams['vote_average.gte'] = String(min_rating);
        discoverParams['vote_count.gte'] = '30';
      }

      const data = await tmdbFetch('/discover/movie', discoverParams);
      let items = (data.results || []).map(normalizeMovie);

      // Verify that every returned item belongs to the requested industry
      if (normIndustry !== 'all') {
        items = items.filter((m) => m.industry === normIndustry);
      }

      return {
        data: {
          items: items.slice(0, limit),
          meta: {
            page: Number(data.page || 1),
            total_pages: Math.min(data.total_pages || 1, 50),
            total_items: data.total_results || items.length,
          },
        },
      };
    } catch (error) {
      console.warn('Falling back to local catalog due to TMDB error:', error.message);
      let movies = INITIAL_MOVIES.map(normalizeMovie);

      // Industry filter
      if (normIndustry !== 'all') {
        movies = movies.filter((m) => m.industry === normIndustry);
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        movies = movies.filter((m) => m.title?.toLowerCase().includes(q));
      }

      // Genre filter
      if (genre_id) {
        movies = movies.filter((m) =>
          (m.genres || []).some(
            (g) => String(g.id) === String(genre_id) || String(g.name).toLowerCase() === String(genre_id).toLowerCase()
          )
        );
      }

      return {
        data: {
          items: movies.slice(0, limit),
          meta: { page: 1, total_pages: 1, total_items: movies.length },
        },
      };
    }
  },

  /**
   * Fetch genre categories dynamically for the selected industry
   */
  getGenres: async (industry = 'all') => {
    let allGenres = INITIAL_GENRES;
    try {
      const data = await tmdbFetch('/genre/movie/list');
      if (Array.isArray(data.genres) && data.genres.length > 0) {
        allGenres = data.genres;
      }
    } catch (e) {
      console.warn('Using local fallback genres:', e.message);
    }
    const filtered = filterGenresForIndustry(industry, allGenres);
    return { data: filtered };
  },

  /**
   * Get detailed movie information including credits, keywords, and videos/trailers.
   */
  getMovieById: async (id) => {
    if (!id) throw new Error('Movie ID is required');

    try {
      const cleanId = String(id).replace('tmdb-', '');
      const data = await tmdbFetch(`/movie/${cleanId}`, {
        append_to_response: 'credits,keywords,videos,similar',
      });
      return { data: normalizeMovie(data) };
    } catch (error) {
      console.warn('Failed to fetch movie by ID from TMDB, checking fallback:', error.message);
      const found = INITIAL_MOVIES.map(normalizeMovie).find(
        (m) => String(m.id) === String(id) || m.external_id === String(id)
      );
      if (found) {
        return { data: found };
      }
      throw error;
    }
  },

  /**
   * Search movies by query respecting industry.
   */
  searchMovies: async (query, params = {}) => {
    return movieService.getMovies({ ...params, search: query });
  },

  /**
   * Fetch matching video preview for ANY movie (by ID or movie object).
   * Universally maps movie -> matching official YouTube preview key.
   * Caches in memory to ensure optimal performance.
   */
  getMoviePreview: async (movieOrId) => {
    if (!movieOrId) return null;
    const movieId = typeof movieOrId === 'object' ? movieOrId.id : movieOrId;
    const cleanId = String(movieId).replace('tmdb-', '');

    const cacheKey = `preview-${cleanId}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    // 1. Check if movie object already has a known video_key
    if (typeof movieOrId === 'object') {
      if (movieOrId.video_key) {
        const res = {
          videoKey: movieOrId.video_key,
          trailerUrl: movieOrId.trailer_url || `https://www.youtube.com/watch?v=${movieOrId.video_key}`,
        };
        memoryCache.set(cacheKey, res);
        return res;
      }
      if (movieOrId.trailer_key) {
        const res = {
          videoKey: movieOrId.trailer_key,
          trailerUrl: movieOrId.trailer_url || `https://www.youtube.com/watch?v=${movieOrId.trailer_key}`,
        };
        memoryCache.set(cacheKey, res);
        return res;
      }
      if (movieOrId.trailer_url) {
        const match = movieOrId.trailer_url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) {
          const res = { videoKey: match[1], trailerUrl: movieOrId.trailer_url };
          memoryCache.set(cacheKey, res);
          return res;
        }
      }
    }

    // 2. Query TMDB /movie/{id}/videos
    try {
      const data = await tmdbFetch(`/movie/${cleanId}/videos`);
      if (Array.isArray(data.results) && data.results.length > 0) {
        const ytVideos = data.results.filter((v) => v.site === 'YouTube' && v.key);
        if (ytVideos.length > 0) {
          // Priority: Official Trailer > Any Trailer > Official Teaser > Any Teaser > Clip > Any
          const chosen =
            ytVideos.find((v) => v.type === 'Trailer' && v.official) ||
            ytVideos.find((v) => v.type === 'Trailer') ||
            ytVideos.find((v) => v.type === 'Teaser' && v.official) ||
            ytVideos.find((v) => v.type === 'Teaser') ||
            ytVideos.find((v) => v.type === 'Clip') ||
            ytVideos[0];

          if (chosen) {
            const res = {
              videoKey: chosen.key,
              trailerUrl: `https://www.youtube.com/watch?v=${chosen.key}`,
              name: chosen.name,
              type: chosen.type,
            };
            memoryCache.set(cacheKey, res);
            return res;
          }
        }
      }
    } catch (err) {
      console.warn(`Could not fetch preview video for movie ${cleanId}:`, err.message);
    }

    // 3. Fallback: check seedMovies
    const seed = INITIAL_MOVIES.find(
      (m) => String(m.id) === String(cleanId) || m.external_id === `tmdb-${cleanId}`
    );
    if (seed?.trailer_key) {
      const res = {
        videoKey: seed.trailer_key,
        trailerUrl: seed.trailer_url || `https://www.youtube.com/watch?v=${seed.trailer_key}`,
      };
      memoryCache.set(cacheKey, res);
      return res;
    }

    memoryCache.set(cacheKey, null);
    return null;
  },

  /**
   * Get live trending movies (optionally filtered by industry)
   */
  getTrending: async (limit = 12, industry = 'all') => {
    if (industry && industry !== 'all') {
      return movieService.getMovies({ industry, sort_by: 'popular', limit });
    }
    try {
      const data = await tmdbFetch('/trending/movie/week');
      const items = (data.results || []).slice(0, limit).map(normalizeMovie);
      return { data: items };
    } catch {
      return { data: INITIAL_MOVIES.map(normalizeMovie).slice(0, limit) };
    }
  },

  /**
   * Get live popular movies (optionally filtered by industry)
   */
  getPopular: async (limit = 12, industry = 'all') => {
    if (industry && industry !== 'all') {
      return movieService.getMovies({ industry, sort_by: 'popular', limit });
    }
    try {
      const data = await tmdbFetch('/movie/popular');
      const items = (data.results || []).slice(0, limit).map(normalizeMovie);
      return { data: items };
    } catch {
      return { data: INITIAL_MOVIES.map(normalizeMovie).slice(0, limit) };
    }
  },

  /**
   * Get live top-rated movies (optionally filtered by industry)
   */
  getTopRated: async (limit = 12, industry = 'all') => {
    if (industry && industry !== 'all') {
      return movieService.getMovies({ industry, sort_by: 'rating', limit });
    }
    try {
      const data = await tmdbFetch('/movie/top_rated');
      const items = (data.results || []).slice(0, limit).map(normalizeMovie);
      return { data: items };
    } catch {
      return { data: INITIAL_MOVIES.map(normalizeMovie).slice(0, limit) };
    }
  },

  /**
   * Get similar or recommended movies from TMDB.
   */
  getSimilarMovies: async (movieId, limit = 8) => {
    try {
      const cleanId = String(movieId).replace('tmdb-', '');
      const data = await tmdbFetch(`/movie/${cleanId}/recommendations`);
      let results = data.results || [];

      if (results.length === 0) {
        const simData = await tmdbFetch(`/movie/${cleanId}/similar`);
        results = simData.results || [];
      }

      const items = results.slice(0, limit).map((m) => ({ movie: normalizeMovie(m) }));
      return { data: { items } };
    } catch {
      return { data: { items: [] } };
    }
  },
};
