import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { interactionService } from '../services/interactionService';
import { recommendationService } from '../services/recommendationService';
import { authService } from '../services/authService';
import MovieCard from '../components/movie/MovieCard';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, recRes, historyRes, favoritesRes, watchlistRes, ratingsRes] = await Promise.all([
          authService.getCurrentUser(),
          recommendationService.getRecommendations(6),
          interactionService.getHistory({ limit: 6 }),
          interactionService.getFavorites({ limit: 6 }),
          interactionService.getWatchlist({ limit: 6 }),
          interactionService.getMyRatings({ limit: 6 }),
        ]);

        setProfile(profileRes.data);
        setRecommendations(recRes.data?.items || []);
        setHistory(historyRes.data || []);
        setFavorites(favoritesRes.data || []);
        setWatchlist(watchlistRes.data || []);
        setRatings(ratingsRes.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-3xl bg-slate-700/60" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-2xl bg-slate-700/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Profile unavailable" message={error} />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Profile</p>
            <h1 className="mt-2 text-3xl font-black text-white">{profile?.name || 'Movie Lover'}</h1>
            <p className="mt-2 text-slate-300">{profile?.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recommended for you</h2>
            <Link to="/recommendations" className="text-sm text-amber-300">View all</Link>
          </div>
          {recommendations.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {recommendations.map((item) => (
                <MovieCard key={item.movie.id} movie={item.movie} compact />
              ))}
            </div>
          ) : (
            <EmptyState title="No recommendations yet" description="Rate and save movies to build your homepage recommendations." />
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recently viewed</h2>
          </div>
          {history.length ? (
            <div className="space-y-3">
              {history.map((item) => (
                <Link key={item.id} to={`/movies/${item.movie.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <img src={item.movie.poster_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80'} alt={item.movie.title} className="h-16 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{item.movie.title}</p>
                    <p className="text-xs text-slate-400">Viewed {new Date(item.viewed_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No watch history" description="Your recent movie views will appear here." />
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Favorites</h2>
          {favorites.length ? (
            <div className="mt-4 space-y-3">
              {favorites.map((item) => (
                <Link key={item.id} to={`/movies/${item.movie.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="truncate text-sm text-white">{item.movie.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No favorites" description="Save movies you want to revisit." />
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Watchlist</h2>
          {watchlist.length ? (
            <div className="mt-4 space-y-3">
              {watchlist.map((item) => (
                <Link key={item.id} to={`/movies/${item.movie.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="truncate text-sm text-white">{item.movie.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No watchlist" description="Build your next movie night queue." />
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-bold text-white">Your ratings</h2>
          {ratings.length ? (
            <div className="mt-4 space-y-3">
              {ratings.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="font-semibold text-white">{item.movie?.title || 'Movie'}</div>
                  <div className="mt-1 text-sm text-amber-300">★ {item.rating}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No ratings yet" description="Rate movies to build confidence in your recommendations." />
          )}
        </section>
      </div>
    </div>
  );
}
