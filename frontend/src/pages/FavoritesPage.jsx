import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from '../components/movie/MovieCard';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { interactionService } from '../services/interactionService';

export default function FavoritesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await interactionService.getFavorites({ limit: 50 });
      setMovies(response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load your favorites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeMovie = async (movieId) => {
    try {
      await interactionService.removeFavorite(movieId);
      setMovies((prev) => prev.filter((item) => item.movie_id !== movieId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove movie from favorites.');
    }
  };

  if (error) return <ErrorState title="Favorites unavailable" message={error} />;

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-[340px] animate-pulse rounded-2xl bg-slate-700/60" />
        ))}
      </div>
    );
  }

  if (!movies.length) {
    return (
      <EmptyState
        title="Your favorites list is empty"
        description="Mark the movies you love and revisit them anytime."
        action={<Link to="/discover" className="mt-4 inline-block rounded-full bg-amber-500 px-4 py-2 font-semibold text-slate-950">Explore movies</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">Favorites</h1>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {movies.map((item) => (
          <MovieCard
            key={item.id}
            movie={item.movie}
            onFavoriteToggle={() => removeMovie(item.movie_id)}
            favorite
            inWatchlist={false}
          />
        ))}
      </div>
    </div>
  );
}
