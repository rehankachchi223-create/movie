import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { interactionService } from '../services/interactionService';
import { movieService } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import MovieCard from '../components/movie/MovieCard';
import ErrorState from '../components/ui/ErrorState';
import { formatDate, formatRuntime, getBackdropUrl, getPosterUrl } from '../utils/format';
import { getIndustryBadge } from '../utils/industry';
import { Link } from 'react-router-dom';
import HeroVideoBackground from '../components/movie/HeroVideoBackground';

export default function MovieDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [movie, setMovie] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [favorite, setFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      setError('');

      try {
        const [movieResponse, similarResponse] = await Promise.all([
          movieService.getMovieById(id),
          movieService.getSimilarMovies(id, 8),
        ]);

        setMovie(movieResponse.data);
        setSimilarMovies(similarResponse.data?.items?.map((item) => item.movie) || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Movie not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  useEffect(() => {
    const fetchUserSignals = async () => {
      if (!isAuthenticated || !id) return;

      try {
        const [favoriteResponse, watchlistResponse, ratingResponse] = await Promise.all([
          interactionService.getFavoriteStatus(id),
          interactionService.getWatchlistStatus(id),
          interactionService.getMyRatings({ limit: 200 }),
        ]);

        setFavorite(Boolean(favoriteResponse.data?.is_favorite));
        setInWatchlist(Boolean(watchlistResponse.data?.in_watchlist));

        const current = (ratingResponse.data || []).find((item) => Number(item.movie_id) === Number(id));
        setUserRating(current?.rating ?? null);
      } catch (err) {
        console.error('Could not load user signals', err);
      }
    };

    fetchUserSignals();
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to save this movie to favorites.', 'error');
      return;
    }

    try {
      if (favorite) {
        await interactionService.removeFavorite(id);
        setFavorite(false);
        addToast('Removed from favorites.', 'success');
      } else {
        await interactionService.addFavorite(id);
        setFavorite(true);
        addToast('Added to favorites.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not update favorite.', 'error');
    }
  };

  const toggleWatchlist = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to add this movie to your watchlist.', 'error');
      return;
    }

    try {
      if (inWatchlist) {
        await interactionService.removeWatchlist(id);
        setInWatchlist(false);
        addToast('Removed from watchlist.', 'success');
      } else {
        await interactionService.addWatchlist(id);
        setInWatchlist(true);
        addToast('Added to watchlist.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not update watchlist.', 'error');
    }
  };

  const submitRating = async (ratingValue) => {
    if (!isAuthenticated) {
      addToast('Please log in to rate movies.', 'error');
      return;
    }

    try {
      if (userRating) {
        await interactionService.updateRating(id, { rating: ratingValue });
        addToast('Rating updated.', 'success');
      } else {
        await interactionService.createRating({ movie_id: Number(id), rating: ratingValue });
        addToast('Rating saved.', 'success');
      }
      setUserRating(ratingValue);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Unable to save rating.', 'error');
    }
  };

  const recordViewHistory = async () => {
    if (!isAuthenticated) return;
    try {
      await interactionService.addHistory(Number(id));
    } catch (err) {
      console.warn('Could not record view history', err);
    }
  };

  useEffect(() => {
    if (movie && isAuthenticated) {
      recordViewHistory();
    }
  }, [movie, isAuthenticated]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-[440px] animate-pulse rounded-[32px] bg-slate-700/60" />
        <div className="grid gap-5 md:grid-cols-[1.5fr_0.5fr]">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-700/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-700/60" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Movie unavailable" message={error} />;
  }

  if (!movie) return null;

  return (
    <div className="space-y-10 pb-10">
      <section className="relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-slate-900">
        <HeroVideoBackground movie={movie} backdropUrl={movie.backdrop_url} />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/60 pointer-events-none" />

        <div className="relative z-[2] grid gap-8 px-6 py-8 md:grid-cols-[0.9fr_1.4fr] md:px-8 lg:px-10">
          <div className="mx-auto md:mx-0">
            <img
              src={getPosterUrl(movie.poster_url)}
              alt={movie.title}
              className="h-[420px] w-[290px] rounded-[28px] border border-white/10 object-cover shadow-2xl shadow-slate-950/70"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </div>

          <div className="flex flex-col justify-center">
            {(() => {
              const badge = getIndustryBadge(movie.industry);
              return (
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                  {badge && (
                    <Link
                      to={`/discover?industry=${badge.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition hover:opacity-90 ${badge.badgeColor}`}
                    >
                      {badge.label}
                    </Link>
                  )}
                  <span className="rounded-full bg-white/10 px-3 py-1">★ {Number(movie.rating || 0).toFixed(1)}</span>
                  <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                  <span>{formatRuntime(movie.runtime)}</span>
                </div>
              );
            })()}

            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-3 text-lg text-amber-200">{movie.tagline}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {(movie.genres || []).map((genre) => (
                <span key={genre.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {genre.name}
                </span>
              ))}
            </div>

            <p className="mt-5 max-w-2xl text-base text-slate-200/90">{movie.overview || 'A compelling story with memorable performances and a cinematic atmosphere.'}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => window.open(movie.trailer_url || '#', '_blank')}>Watch Trailer</Button>
              <Button variant="secondary" onClick={toggleWatchlist}>{inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}</Button>
              <Button variant="secondary" onClick={toggleFavorite}>{favorite ? 'Remove Favorite' : 'Add Favorite'}</Button>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Your rating</p>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => submitRating(value)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      (userRating || 0) >= value ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-300 hover:border-amber-300'
                    }`}
                    aria-label={`Rate ${value}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Movie Details</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div><span className="text-slate-400">Industry / Origin</span><p className="mt-1 font-semibold text-amber-300">{getIndustryBadge(movie.industry)?.label || 'Cinema'}</p></div>
            <div><span className="text-slate-400">Director</span><p className="mt-1 text-white">{movie.director || 'N/A'}</p></div>
            <div><span className="text-slate-400">Release</span><p className="mt-1 text-white">{formatDate(movie.release_date)}</p></div>
            <div><span className="text-slate-400">Runtime</span><p className="mt-1 text-white">{formatRuntime(movie.runtime)}</p></div>
            <div className="col-span-2"><span className="text-slate-400">Cast</span><p className="mt-1 text-white">{movie.cast_list || 'N/A'}</p></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Keywords & Tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(() => {
              const kwList = Array.isArray(movie.keywords)
                ? movie.keywords.map((k) => (typeof k === 'object' ? k.name : String(k)))
                : typeof movie.keywords === 'string' && movie.keywords.trim()
                  ? movie.keywords.split(',').map((k) => k.trim())
                  : (movie.genres || []).map((g) => g.name);

              const items = kwList.filter(Boolean).slice(0, 12);
              if (items.length === 0) {
                return <span className="text-sm text-slate-400">General, Cinema</span>;
              }

              return items.map((keyword, index) => (
                <span key={`${keyword}-${index}`} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {keyword}
                </span>
              ));
            })()}
          </div>
        </div>
      </section>

      {similarMovies.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">More Like This</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similarMovies.map((similarMovie) => (
              <MovieCard key={similarMovie.id} movie={similarMovie} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
