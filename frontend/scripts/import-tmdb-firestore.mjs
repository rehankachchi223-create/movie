import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.TMDB_API_KEY;
const requestedPages = Number.parseInt(process.env.TMDB_MAX_PAGES || '10', 10);

if (!projectId) {
  throw new Error('VITE_FIREBASE_PROJECT_ID is missing from frontend/.env.');
}
if (!apiKey) {
  throw new Error('TMDB_API_KEY is missing from frontend/.env.');
}
if (!Number.isInteger(requestedPages) || requestedPages < 1 || requestedPages > 500) {
  throw new Error('TMDB_MAX_PAGES must be an integer from 1 to 500.');
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const firestore = getFirestore();
const tmdbBaseUrl = 'https://api.themoviedb.org/3';

async function tmdbGet(path, params = {}) {
  const url = new URL(`${tmdbBaseUrl}${path}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'en-US');
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();

    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const details = await response.json().catch(() => ({}));
    throw new Error(`TMDB request failed (${response.status}): ${details.status_message || 'unknown error'}`);
  }

  throw new Error(`TMDB request failed after retries: ${path}`);
}

const genreResponse = await tmdbGet('/genre/movie/list');
const genres = (genreResponse.genres || []).map((genre) => ({
  id: String(genre.id),
  name: genre.name,
}));

for (let start = 0; start < genres.length; start += 450) {
  const batch = firestore.batch();
  for (const genre of genres.slice(start, start + 450)) {
    batch.set(firestore.collection('genres').doc(genre.id), genre, { merge: true });
  }
  await batch.commit();
}

const firstPage = await tmdbGet('/discover/movie', {
  include_adult: false,
  sort_by: 'popularity.desc',
  with_origin_country: 'US',
  with_original_language: 'en',
  page: 1,
});
const pagesToImport = Math.min(requestedPages, firstPage.total_pages || 1, 500);
const genreNames = new Map(genres.map((genre) => [genre.id, genre.name]));
let importedCount = 0;

for (let page = 1; page <= pagesToImport; page += 1) {
  const results = page === 1
    ? firstPage.results || []
    : (await tmdbGet('/discover/movie', {
      include_adult: false,
      sort_by: 'popularity.desc',
      with_origin_country: 'US',
      with_original_language: 'en',
      page,
    })).results || [];

  const batch = firestore.batch();
  for (const result of results) {
    if (!result.id || !result.title) continue;

    const movie = {
      id: String(result.id),
      external_id: `tmdb-${result.id}`,
      title: result.title,
      overview: result.overview || '',
      release_date: result.release_date || null,
      rating: Number(result.vote_average) || 0,
      popularity: Number(result.popularity) || 0,
      poster_url: result.poster_path
        ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
        : null,
      backdrop_url: result.backdrop_path
        ? `https://image.tmdb.org/t/p/original${result.backdrop_path}`
        : null,
      genres: (result.genre_ids || []).map((id) => ({
        id: String(id),
        name: genreNames.get(String(id)) || 'Unknown',
      })),
    };

    batch.set(firestore.collection('movies').doc(movie.id), movie, { merge: true });
    importedCount += 1;
  }

  await batch.commit();
  console.info(`Imported TMDB page ${page}/${pagesToImport}.`);
}

console.info(`Imported ${importedCount} US-origin English-language movies to Firestore.`);