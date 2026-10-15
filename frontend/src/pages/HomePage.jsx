import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MovieRow from '../components/movie/MovieRow';
import { useAuth } from '../context/AuthContext';
import { interactionService } from '../services/interactionService';
import { movieService } from '../services/movieService';
import { recommendationService } from '../services/recommendationService';
import { getBackdropUrl, getPosterUrl } from '../utils/format';
import Button from '../components/ui/Button';
import ErrorState from '../components/ui/ErrorState';
import { useToast } from '../context/ToastContext';
import { INDUSTRIES, getIndustryBadge } from '../utils/industry';
import HeroVideoBackground from '../components/movie/HeroVideoBackground';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const heroMovie = useMemo(
    () => trending[0] || popular[0] || topRated[0],
    [trending, popular, topRated]
  );

  const currentIndustryObj = useMemo(
    () => INDUSTRIES.find((i) => i.id === selectedIndustry) || INDUSTRIES[0],
    [selectedIndustry]
  );

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      setError('');

      try {
        const results = await Promise.allSettled([
          movieService.getTrending(10, selectedIndustry),
          movieService.getPopular(10, selectedIndustry),
          movieService.getTopRated(10, selectedIndustry),
          isAuthenticated
            ? recommendationService.getRecommendations(8)
            : Promise.resolve({ data: { items: [] } }),
        ]);

        const [trendingResult, popularResult, topRatedResult, recommendationsResult] = results;
        const getData = (result, fallback = []) =>
          result.status === 'fulfilled' ? result.value.data : fallback;

        const nextTrending = getData(trendingResult);
        const nextPopular = getData(popularResult);
        const nextTopRated = getData(topRatedResult);
        const nextRecommendations =
          recommendationsResult.status === 'fulfilled'
            ? (recommendationsResult.value.data?.items || []).map((item) => item.movie)
            : [];

        setTrending(nextTrending);
        setPopular(nextPopular);
        setTopRated(nextTopRated);
        setRecommendations(nextRecommendations);

        if (!nextTrending.length && !nextPopular.length && !nextTopRated.length) {
          throw (
            results.find((result) => result.status === 'rejected')?.reason ||
            new Error('Unable to load homepage content.')
          );
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Unable to load homepage content.');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [isAuthenticated, selectedIndustry]);

  useEffect(() => {
    const fetchUserLists = async () => {
      if (!isAuthenticated) return;

      try {
        const [favoritesRes, watchlistRes] = await Promise.all([
          interactionService.getFavorites({ limit: 100 }),
          interactionService.getWatchlist({ limit: 100 }),
        ]);

        const favoriteMap = {};
        (favoritesRes.data || []).forEach((item) => {
          favoriteMap[item.movie_id] = true;
        });

        const watchlistMap = {};
        (watchlistRes.data || []).forEach((item) => {
          watchlistMap[item.movie_id] = true;
        });

        setFavorites(favoriteMap);
        setWatchlist(watchlistMap);
      } catch (error) {
        console.error('Failed to load user lists.', error);
      }
    };

    fetchUserLists();
  }, [isAuthenticated]);

  const toggleFavorite = async (movieId) => {
    if (!isAuthenticated) {
      addToast('Please login to save favorites.', 'error');
      return;
    }

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
    } catch (error) {
      addToast(error.response?.data?.detail || 'Unable to update favorites.', 'error');
    }
  };

  const toggleWatchlist = async (movieId) => {
    if (!isAuthenticated) {
      addToast('Please login to save watchlist items.', 'error');
      return;
    }

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
    } catch (error) {
      addToast(error.response?.data?.detail || 'Unable to update watchlist.', 'error');
    }
  };

  if (error) {
    return <ErrorState title="Homepage unavailable" message={error} />;
  }

  const industryBadge = heroMovie ? getIndustryBadge(heroMovie.industry) : null;

  return (
    <div className="space-y-10 pb-10">
      {/* ── HERO BANNER ────────────────────────────────────────────────────── */}
      {heroMovie && (
        <section className="relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl">
          <HeroVideoBackground movie={heroMovie} backdropUrl={heroMovie.backdrop_url} />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/30 pointer-events-none" />

          {/* Two-column hero: text on left, movie poster thumbnail on right */}
          <div className="relative z-[2] grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10 lg:px-10">
            {/* ── LEFT: Movie info ── */}
            <div className="flex flex-col justify-center">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Featured Pick
                </span>
                {industryBadge && industryBadge.id !== 'all' && (
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur ${industryBadge.badgeClass}`}
                  >
                    {industryBadge.label}
                  </span>
                )}
              </div>

              <h1 className="max-w-xl text-4xl font-black tracking-tight text-white md:text-5xl">
                {heroMovie.title}
              </h1>
              <p className="mt-3 text-lg text-amber-200">
                {heroMovie.tagline || 'A cinematic experience worth watching.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="rounded-full bg-white/10 px-2 py-1">
                  ★ {Number(heroMovie.rating || 0).toFixed(1)}
                </span>
                <span>
                  {heroMovie.release_date ? new Date(heroMovie.release_date).getFullYear() : 'N/A'}
                </span>
                <span>
                  {heroMovie.genres?.map((genre) => genre.name).slice(0, 2).join(' • ') || 'Drama'}
                </span>
              </div>

              <p className="mt-5 max-w-xl text-base text-slate-200/90">
                {heroMovie.overview ||
                  'A gripping story with heart, suspense, and unforgettable performances.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/movies/${heroMovie.id}`}>
                  <Button>View Details</Button>
                </Link>
                {heroMovie.trailer_url ? (
                  <a href={heroMovie.trailer_url} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Watch Trailer</Button>
                  </a>
                ) : null}
                <Button variant="secondary" onClick={() => toggleWatchlist(heroMovie.id)}>
                  {watchlist[heroMovie.id] ? 'In Watchlist' : 'Add to Watchlist'}
                </Button>
              </div>
            </div>

            {/* ── RIGHT: Movie poster thumbnail ── */}
            <div className="flex items-end justify-center">
              <img
                src={getPosterUrl(heroMovie.poster_url)}
                alt={heroMovie.title}
                className="h-[420px] w-[280px] rounded-[28px] border border-white/10 object-cover shadow-2xl shadow-slate-950/80"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── INDUSTRY EXPLORATION TABS (Hollywood, Bollywood, Anime, etc.) ──── */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Explore by Industry</h2>
            <p className="text-sm text-slate-400">
              Filter movies strictly by their cinema origin
            </p>
          </div>
          <Link
            to={
              selectedIndustry !== 'all'
                ? `/discover?industry=${selectedIndustry}`
                : '/discover'
            }
            className="text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            Explore all {currentIndustryObj.shortLabel} movies →
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
          {INDUSTRIES.map((ind) => {
            const isSelected = selectedIndustry === ind.id;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setSelectedIndustry(ind.id)}
                className={`rounded-2xl border px-4 py-2 text-sm font-bold transition duration-200 ${
                  isSelected
                    ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/20 hover:text-white'
                }`}
              >
                {ind.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── MOVIE ROWS ─────────────────────────────────────────────────────── */}
      {!loading && (
        <>
          <MovieRow
            title={
              selectedIndustry === 'all'
                ? 'Trending Now'
                : `Trending in ${currentIndustryObj.shortLabel}`
            }
            movies={trending}
            onFavoriteToggle={toggleFavorite}
            onWatchlistToggle={toggleWatchlist}
            favoriteMap={favorites}
            watchlistMap={watchlist}
          />

          <MovieRow
            title={
              selectedIndustry === 'all'
                ? 'Popular Movies'
                : `Popular ${currentIndustryObj.shortLabel} Movies`
            }
            movies={popular}
            onFavoriteToggle={toggleFavorite}
            onWatchlistToggle={toggleWatchlist}
            favoriteMap={favorites}
            watchlistMap={watchlist}
          />

          <MovieRow
            title={
              selectedIndustry === 'all'
                ? 'Top Rated'
                : `Top Rated in ${currentIndustryObj.shortLabel}`
            }
            movies={topRated}
            onFavoriteToggle={toggleFavorite}
            onWatchlistToggle={toggleWatchlist}
            favoriteMap={favorites}
            watchlistMap={watchlist}
          />

          {recommendations.length > 0 && (
            <MovieRow
              title="Recommended For You"
              movies={recommendations}
              onFavoriteToggle={toggleFavorite}
              onWatchlistToggle={toggleWatchlist}
              favoriteMap={favorites}
              watchlistMap={watchlist}
            />
          )}
        </>
      )}

      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((row) => (
            <div key={row} className="space-y-4">
              <div className="h-7 w-48 animate-pulse rounded bg-slate-700/60" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="h-[280px] w-[200px] animate-pulse rounded-2xl bg-slate-700/60"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
