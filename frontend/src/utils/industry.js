/**
 * Industry & Content Classification System
 * Maps movies to their respective industry / origin:
 * - Bollywood (Hindi / Indian Cinema)
 * - Hollywood (American / English Cinema)
 * - Anime (Japanese Animation)
 * - Korean (Korean Cinema)
 * - Other (World / International Cinema)
 */

export const INDUSTRIES = [
  { id: 'all', label: 'All Industries', shortLabel: 'All', badgeClass: 'bg-slate-800 text-slate-200 border-white/10' },
  { id: 'bollywood', label: 'Bollywood', shortLabel: 'Bollywood', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'hollywood', label: 'Hollywood', shortLabel: 'Hollywood', badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'anime', label: 'Anime', shortLabel: 'Anime', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  { id: 'korean', label: 'Korean', shortLabel: 'Korean', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: 'other', label: 'World Cinema', shortLabel: 'Other', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
];

/**
 * Standard industry genres mapping to filter genre options dynamically per industry.
 */
export const INDUSTRY_GENRES = {
  all: null, // all genres allowed
  bollywood: ['Action', 'Romance', 'Comedy', 'Drama', 'Thriller', 'Crime', 'Family', 'Musical', 'Mystery'],
  hollywood: ['Action', 'Adventure', 'Sci-Fi', 'Drama', 'Thriller', 'Crime', 'Comedy', 'Horror', 'Fantasy', 'Mystery', 'Romance', 'Western'],
  anime: ['Action', 'Adventure', 'Animation', 'Fantasy', 'Sci-Fi', 'Comedy', 'Drama', 'Romance', 'Mystery', 'Supernatural'],
  korean: ['Drama', 'Thriller', 'Action', 'Mystery', 'Crime', 'Romance', 'Horror', 'Comedy'],
  other: ['Drama', 'Comedy', 'Thriller', 'Crime', 'Romance', 'Documentary', 'History', 'Horror'],
};

/**
 * Normalizes input string to prevent casing/whitespace mismatches
 * (e.g., ' BOLLYWOOD ' -> 'bollywood')
 */
export function normalizeIndustryId(value) {
  if (!value) return 'all';
  const clean = String(value).trim().toLowerCase();
  if (['bollywood', 'hindi', 'indian cinema', 'india'].includes(clean)) return 'bollywood';
  if (['hollywood', 'english', 'american', 'us', 'usa'].includes(clean)) return 'hollywood';
  if (['anime', 'japanese animation', 'japan animation'].includes(clean)) return 'anime';
  if (['korean', 'korea', 'k-drama', 'korean cinema'].includes(clean)) return 'korean';
  if (['other', 'world', 'international'].includes(clean)) return 'other';
  return 'all';
}

/**
 * Detect industry from movie metadata fields using the most reliable metadata:
 * original_language, origin_country, genres, production_countries, keywords, or explicit industry tag.
 */
export function detectIndustry(movie) {
  if (!movie) return 'other';

  // 1. Explicit industry field if already set
  if (movie.industry) {
    const normalized = normalizeIndustryId(movie.industry);
    if (normalized !== 'all') return normalized;
  }

  const lang = (movie.original_language || movie.language || '').toLowerCase().trim();
  const originCountries = Array.isArray(movie.origin_country)
    ? movie.origin_country.map((c) => String(c).toUpperCase())
    : [String(movie.origin_country || movie.country || '').toUpperCase()];

  const genreNames = Array.isArray(movie.genres)
    ? movie.genres.map((g) => (typeof g === 'string' ? g : g.name || '')).filter(Boolean)
    : [];

  const genreIds = Array.isArray(movie.genre_ids) ? movie.genre_ids : [];
  const isAnimation = genreNames.some((g) => g.toLowerCase() === 'animation') || genreIds.includes(16);
  const keywordsStr = String(movie.keywords || '').toLowerCase();

  // 2. Anime check: Japanese animation or anime keyword
  if ((lang === 'ja' || originCountries.includes('JP')) && (isAnimation || keywordsStr.includes('anime'))) {
    return 'anime';
  }

  // 3. Bollywood check: Hindi language or Indian origin
  if (lang === 'hi' || originCountries.includes('IN') || ['te', 'ta', 'ml', 'kn'].includes(lang)) {
    return 'bollywood';
  }

  // 4. Korean check: Korean language or Korean origin
  if (lang === 'ko' || originCountries.includes('KR')) {
    return 'korean';
  }

  // 5. Hollywood check: English language or US/UK origin
  if (lang === 'en' || originCountries.includes('US') || originCountries.includes('GB')) {
    return 'hollywood';
  }

  // 6. Default to Other / World Cinema
  return 'other';
}

/**
 * Returns UI badge info for an industry
 */
export function getIndustryBadge(industryId) {
  const norm = normalizeIndustryId(industryId);
  const found = INDUSTRIES.find((i) => i.id === norm);
  return found || INDUSTRIES[0];
}

/**
 * Filter a list of genre objects dynamically based on the selected industry
 */
export function filterGenresForIndustry(industryId, genreList = []) {
  const norm = normalizeIndustryId(industryId);
  if (norm === 'all' || !INDUSTRY_GENRES[norm]) {
    return genreList;
  }

  const allowedNames = new Set(INDUSTRY_GENRES[norm].map((n) => n.toLowerCase()));
  return genreList.filter((g) => {
    const name = (typeof g === 'string' ? g : g.name || '').toLowerCase();
    return allowedNames.has(name);
  });
}
