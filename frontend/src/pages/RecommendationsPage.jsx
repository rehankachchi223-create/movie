import { useEffect, useState } from 'react';
import { recommendationService } from '../services/recommendationService';
import { interactionService } from '../services/interactionService';
import MovieCard from '../components/movie/MovieCard';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function RecommendationsPage() {
  const { isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError('');

      try {
        const [recommendResponse, favoritesResponse, watchlistResponse] = await Promise.all([
          recommendationService.getRecommendations(10),
          isAuthenticated ? interactionService.getFavorites({ limit: 200 }) : Promise.resolve({ data: [] }),
          isAuthenticated ? interactionService.getWatchlist({ limit: 200 }) : Promise.resolve({ data: [] }),
        ]);

        setRecommendations(recommendResponse.data?.items || []);

        const favoriteMap = {};
        (favoritesResponse.data || []).forEach((item) => {
          favoriteMap[item.movie_id] = true;
        });

        const watchlistMap = {};
        (watchlistResponse.data || []).forEach((item) => {
          watchlistMap[item.movie_id] = true;
        });

        setFavorites(favoriteMap);
        setWatchlist(watchlistMap);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load recommendations.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isAuthenticated]);

  const toggleFavorite = async (movieId) => {
    try {
      if (favorites[movieId]) {
        await interactionService.removeFavorite(movieId);
        setFavorites((prev) => ({ ...prev, [movieId]: false }));
      } else {
        await interactionService.addFavorite(movieId);
        setFavorites((prev) => ({ ...prev, [movieId]: true }));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update favorites.');
    }
  };

  const toggleWatchlist = async (movieId) => {
    try {
      if (watchlist[movieId]) {
        await interactionService.removeWatchlist(movieId);
        setWatchlist((prev) => ({ ...prev, [movieId]: false }));
      } else {
        await interactionService.addWatchlist(movieId);
        setWatchlist((prev) => ({ ...prev, [movieId]: true }));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update watchlist.');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="h-[320px] animate-pulse rounded-2xl bg-slate-700/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Recommendations unavailable" message={error} />;
  }

  if (!recommendations.length) {
    return (
      <EmptyState
        title="No recommendations yet"
        description={isAuthenticated ? 'Rate, favorite, and watch more movies to unlock personalized suggestions.' : 'Login to unlock personalized recommendations based on your movie activity.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Recommended for you</h1>
        <p className="mt-2 text-slate-300">{isAuthenticated ? 'Based on your activity and taste' : 'Popular picks to help you get started'}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {recommendations.map((item) => (
          <MovieCard
            key={item.movie.id}
            movie={item.movie}
            onFavoriteToggle={toggleFavorite}
            onWatchlistToggle={toggleWatchlist}
            favorite={Boolean(favorites[item.movie.id])}
            inWatchlist={Boolean(watchlist[item.movie.id])}
          />
        ))}
      </div>
    </div>
  );
}
