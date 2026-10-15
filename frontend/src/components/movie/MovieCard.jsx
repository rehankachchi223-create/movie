import { Link } from 'react-router-dom';
import { getPosterUrl } from '../../utils/format';
import { getIndustryBadge } from '../../utils/industry';

export default function MovieCard({
  movie,
  compact = false,
  onFavoriteToggle,
  onWatchlistToggle,
  favorite = false,
  inWatchlist = false,
  highlight = false,
  showActions = true,
}) {
  const imageUrl = getPosterUrl(movie?.poster_url);
  const industryBadge = getIndustryBadge(movie?.industry);

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg transition-transform duration-300 will-change-transform hover:-translate-y-1 hover:scale-[1.01] focus-within:ring-2 focus-within:ring-amber-400/40 ${
        compact ? 'min-w-[180px]' : 'min-w-[220px]'
      } ${highlight ? 'ring-1 ring-amber-400/50' : ''}`}
    >
      <Link to={`/movies/${movie.id}`} className="block overflow-hidden">
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={imageUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80';
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient opacity-25 pointer-events-none" />

          {/* Top-left Badges: Rating & Industry */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-amber-300">
              ★ {Number(movie.rating || 0).toFixed(1)}
            </span>
            {movie.industry && movie.industry !== 'all' && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${industryBadge.badgeClass}`}
              >
                {industryBadge.shortLabel}
              </span>
            )}
          </div>

          {/* Action buttons (Favorite / Watchlist) */}
          {showActions && (
            <div className="absolute right-3 top-3 flex gap-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFavoriteToggle?.(movie.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onFavoriteToggle?.(movie.id);
                  }
                }}
                className={`rounded-full border p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                  favorite ? 'border-rose-500 bg-rose-500 text-white' : 'border-white/20 bg-slate-900/80 text-white hover:bg-slate-800'
                }`}
                aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={favorite}
              >
                ♥
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onWatchlistToggle?.(movie.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onWatchlistToggle?.(movie.id);
                  }
                }}
                className={`rounded-full border p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                  inWatchlist ? 'border-sky-500 bg-sky-500 text-white' : 'border-white/20 bg-slate-900/80 text-white hover:bg-slate-800'
                }`}
                aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                aria-pressed={inWatchlist}
              >
                +
              </button>
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/movies/${movie.id}`} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold text-white hover:text-amber-300">{movie.title}</h3>
          </Link>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
          <span className="truncate max-w-[120px]">
            {movie.genres?.slice(0, 2).map((genre) => genre.name).join(' • ') || 'Drama'}
          </span>
        </div>
      </div>
    </article>
  );
}
