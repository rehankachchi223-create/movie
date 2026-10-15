import MovieCard from './MovieCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

export default function MovieRow({ title, movies = [], loading, onFavoriteToggle, onWatchlistToggle, favoriteMap = {}, watchlistMap = {} }) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-6 w-40 rounded bg-slate-700/60 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-[220px] shrink-0">
              <LoadingSkeleton className="aspect-[2/3] w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!movies.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            compact
            onFavoriteToggle={onFavoriteToggle}
            onWatchlistToggle={onWatchlistToggle}
            favorite={Boolean(favoriteMap[movie.id])}
            inWatchlist={Boolean(watchlistMap[movie.id])}
          />
        ))}
      </div>
    </section>
  );
}
