import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/movie/MovieCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { useDebounce } from '../hooks/useDebounce';
import { interactionService } from '../services/interactionService';
import { movieService } from '../services/movieService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { INDUSTRIES, normalizeIndustryId } from '../utils/industry';

const defaultFilters = {
  industry: 'all',
  search: '',
  genre_id: '',
  year: '',
  min_rating: '',
  sort_by: 'popular',
};

export default function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [filters, setFilters] = useState({
    ...defaultFilters,
    industry: searchParams.get('industry') || 'all',
    search: searchParams.get('q') || '',
    genre_id: searchParams.get('genre_id') || '',
    year: searchParams.get('year') || '',
    min_rating: searchParams.get('min_rating') || '',
    sort_by: searchParams.get('sort_by') || 'popular',
  });

  const [genres, setGenres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 0, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState({});
  const [watchlist, setWatchlist] = useState({});

  const debouncedSearch = useDebounce(filters.search, 400);

  // Sync state when URL parameters change (e.g. back/forward navigation)
  useEffect(() => {
    const urlIndustry = searchParams.get('industry') || 'all';
    const urlGenre = searchParams.get('genre_id') || '';
    const urlSearch = searchParams.get('q') || '';
    const urlYear = searchParams.get('year') || '';
    const urlRating = searchParams.get('min_rating') || '';
    const urlSort = searchParams.get('sort_by') || 'popular';

    setFilters((prev) => ({
      ...prev,
      industry: urlIndustry,
      genre_id: urlGenre,
      search: urlSearch,
      year: urlYear,
      min_rating: urlRating,
      sort_by: urlSort,
    }));
  }, [searchParams]);

  // Fetch dynamic genre options tailored specifically to the selected Industry
  useEffect(() => {
    const fetchIndustryGenres = async () => {
      try {
        const response = await movieService.getGenres(filters.industry);
        const dynamicGenres = response.data || [];
        setGenres(dynamicGenres);

        // If the previously selected genre does not exist in the new industry's genres, reset genre_id
        if (filters.genre_id) {
          const exists = dynamicGenres.some(
            (g) => String(g.id) === String(filters.genre_id) || g.name.toLowerCase() === String(filters.genre_id).toLowerCase()
          );
          if (!exists) {
            handleFilterChange('genre_id', '');
          }
        }
      } catch (err) {
        console.error('Failed to load genres for industry', err);
      }
    };

    fetchIndustryGenres();
  }, [filters.industry]);

  // Fetch live movies respecting Industry -> Genre -> Movies hierarchy
  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      setLoading(true);
      setError('');

      const params = {
        page: Number(searchParams.get('page')) || 1,
        limit: 12,
        industry: filters.industry,
        search: debouncedSearch || undefined,
        genre_id: filters.genre_id || undefined,
        year: filters.year || undefined,
        min_rating: filters.min_rating || undefined,
        sort_by: filters.sort_by || 'popular',
      };

      try {
        const response = await movieService.getMovies(params);
        if (!cancelled) {
          setMovies(response.data?.items || []);
          setMeta(response.data?.meta || { page: 1, total_pages: 0, total_items: 0 });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'Unable to load movies.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMovies();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    filters.industry,
    filters.genre_id,
    filters.min_rating,
    filters.sort_by,
    filters.year,
    searchParams,
  ]);

  // Load user favorites and watchlist states
  useEffect(() => {
    const fetchUserStates = async () => {
      if (!isAuthenticated) {
        setFavorites({});
        setWatchlist({});
        return;
      }

      try {
        const [favoriteResponse, watchlistResponse] = await Promise.all([
          interactionService.getFavorites({ limit: 200 }),
          interactionService.getWatchlist({ limit: 200 }),
        ]);

        const favoriteMap = {};
        (favoriteResponse.data || []).forEach((item) => {
          favoriteMap[item.movie_id] = true;
        });

        const watchlistMap = {};
        (watchlistResponse.data || []).forEach((item) => {
          watchlistMap[item.movie_id] = true;
        });

        setFavorites(favoriteMap);
        setWatchlist(watchlistMap);
      } catch (err) {
        console.error('Could not load user lists', err);
      }
    };

    fetchUserStates();
  }, [isAuthenticated]);

  const applyUrlParams = (nextFilters) => {
    const params = new URLSearchParams();

    if (nextFilters.industry && nextFilters.industry !== 'all') params.set('industry', nextFilters.industry);
    if (nextFilters.search) params.set('q', nextFilters.search);
    if (nextFilters.genre_id) params.set('genre_id', nextFilters.genre_id);
    if (nextFilters.year) params.set('year', nextFilters.year);
    if (nextFilters.min_rating) params.set('min_rating', nextFilters.min_rating);
    if (nextFilters.sort_by && nextFilters.sort_by !== 'popular') params.set('sort_by', nextFilters.sort_by);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    applyUrlParams(nextFilters);
  };

  const handleIndustrySelect = (industryId) => {
    const nextFilters = {
      ...filters,
      industry: industryId,
      genre_id: '', // Reset genre when switching industry to prevent incompatible filter
    };
    setFilters(nextFilters);
    applyUrlParams(nextFilters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSearchParams({ page: '1' });
  };

  const selectedIndustryObj = INDUSTRIES.find((i) => i.id === normalizeIndustryId(filters.industry)) || INDUSTRIES[0];
  const selectedGenre = genres.find((genre) => String(genre.id) === String(filters.genre_id));

  const activeFilterLabels = [
    selectedIndustryObj.id !== 'all' && `Industry: ${selectedIndustryObj.label}`,
    filters.search && `Search: "${filters.search}"`,
    selectedGenre && `Genre: ${selectedGenre.name}`,
    filters.year && `Year: ${filters.year}`,
    filters.min_rating && `Rating: ${filters.min_rating}+`,
  ].filter(Boolean);

  const toggleFavorite = async (movieId) => {
    try {
      if (favorites[movieId]) {
        await interactionService.removeFavorite(movieId);
        setFavorites((prev) => ({ ...prev, [movieId]: false }));
        addToast('Removed from favorites.', 'success');
      } else {
        await interactionService.addFavorite(movieId);
        setFavorites((prev) => ({ ...prev, [movieId]: true }));
        addToast('Added to favorites.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not update favorite.', 'error');
    }
  };

  const toggleWatchlist = async (movieId) => {
    try {
      if (watchlist[movieId]) {
        await interactionService.removeWatchlist(movieId);
        setWatchlist((prev) => ({ ...prev, [movieId]: false }));
        addToast('Removed from watchlist.', 'success');
      } else {
        await interactionService.addWatchlist(movieId);
        setWatchlist((prev) => ({ ...prev, [movieId]: true }));
        addToast('Added to watchlist.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not update watchlist.', 'error');
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const paginationButtons = useMemo(() => {
    return Array.from({ length: Math.max(1, meta.total_pages) }, (_, index) => index + 1);
  }, [meta.total_pages]);

  if (error) {
    return <ErrorState title="Discover failed" message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* ── TOP-LEVEL INDUSTRY SELECTOR (Industry -> Genre -> Movies) ────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Browse by Industry</h1>
          {selectedIndustryObj.id !== 'all' && (
            <button
              type="button"
              onClick={() => handleIndustrySelect('all')}
              className="text-xs text-amber-300 hover:text-amber-200 transition"
            >
              Reset to All
            </button>
          )}
        </div>

        {/* Industry Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
          {INDUSTRIES.map((ind) => {
            const isSelected = normalizeIndustryId(filters.industry) === ind.id;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => handleIndustrySelect(ind.id)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition duration-200 ${
                  isSelected
                    ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/20 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {ind.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECONDARY FILTER CONTROLS (Search, Dynamic Genre, Year, Sort) ── */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 md:p-6 shadow-xl shadow-slate-950/40">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Search in {selectedIndustryObj.shortLabel}
            </label>
            <input
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={`Search ${selectedIndustryObj.shortLabel} titles, cast...`}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Genre ({selectedIndustryObj.shortLabel})
            </label>
            <select
              value={filters.genre_id}
              onChange={(e) => handleFilterChange('genre_id', e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400 transition"
            >
              <option value="">All {selectedIndustryObj.shortLabel} Genres</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Year</label>
            <input
              type="number"
              min="1900"
              max="2100"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              placeholder="e.g. 2024"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Sort By</label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400 transition"
            >
              <option value="popular">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="release_date">Newest</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Min Rating</label>
            <select
              value={filters.min_rating}
              onChange={(e) => handleFilterChange('min_rating', e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
            >
              <option value="">Any</option>
              <option value="7">7.0+ ★</option>
              <option value="8">8.0+ ★</option>
              <option value="9">9.0+ ★</option>
            </select>
          </div>

          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </section>

      {/* ── ACTIVE FILTER SUMMARY ────────────────────────────────────────── */}
      {activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Active filters:</span>
          {activeFilterLabels.map((lbl, idx) => (
            <span key={idx} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-200">
              {lbl}
            </span>
          ))}
        </div>
      )}

      {/* ── MOVIES GRID ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="h-[340px] animate-pulse rounded-2xl bg-slate-800/60" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title={`No ${selectedIndustryObj.shortLabel} movies match your filters`}
          action={
            <Button className="mt-5" variant="secondary" onClick={clearFilters}>
              Browse All {selectedIndustryObj.shortLabel} Movies
            </Button>
          }
        >
          <p className="mt-2 text-slate-300">
            {activeFilterLabels.length > 0
              ? `No results found for ${activeFilterLabels.join(' | ')}.`
              : 'The catalog is currently empty.'}
          </p>
          <p className="mt-2 text-sm text-slate-400">Try adjusting your genre or search keywords.</p>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onFavoriteToggle={toggleFavorite}
                onWatchlistToggle={toggleWatchlist}
                favorite={Boolean(favorites[movie.id])}
                inWatchlist={Boolean(watchlist[movie.id])}
              />
            ))}
          </div>

          {meta.total_pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
              {paginationButtons.slice(0, 10).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', String(page));
                    setSearchParams(params);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${
                    currentPage === page
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'border border-white/10 bg-slate-900 text-white hover:border-amber-400/40'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
