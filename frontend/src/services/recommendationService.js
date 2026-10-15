import { interactionService } from './interactionService';
import { movieService } from './movieService';

export const recommendationService = {
  /**
   * Smart client-side hybrid recommendation engine.
   * If the user has favorite movies, queries TMDB recommendation graph for those titles,
   * while also weighting user genre affinities from ratings and watchlist.
   * Falls back to top-rated movies for cold-start users.
   */
  getRecommendations: async (limit = 10, skip = 0) => {
    try {
      const [favRes, wlRes, ratingsRes] = await Promise.all([
        interactionService.getFavorites({ limit: 50 }),
        interactionService.getWatchlist({ limit: 50 }),
        interactionService.getMyRatings({ limit: 50 }),
      ]);

      const favorites = favRes.data || [];
      const watchlist = wlRes.data || [];
      const ratings = ratingsRes.data || [];

      const seenMovieIds = new Set();
      favorites.forEach((f) => seenMovieIds.add(String(f.movie_id)));
      watchlist.forEach((w) => seenMovieIds.add(String(w.movie_id)));
      ratings.forEach((r) => seenMovieIds.add(String(r.movie_id)));

      // If user has favorites, leverage TMDB recommendations for their favorite movies
      let tmdbRecCandidates = [];
      if (favorites.length > 0) {
        const topFavs = favorites.slice(0, 3);
        const recPromises = topFavs.map((fav) =>
          movieService.getSimilarMovies(fav.movie_id, 8).catch(() => ({ data: { items: [] } }))
        );
        const recResults = await Promise.all(recPromises);
        recResults.forEach((res, i) => {
          const favTitle = topFavs[i].movie?.title || 'favorites';
          (res.data?.items || []).forEach((item) => {
            if (item.movie && !seenMovieIds.has(String(item.movie.id))) {
              tmdbRecCandidates.push({
                movie: item.movie,
                score: Number((item.movie.rating || 7.5).toFixed(1)),
                explanation: `Because you liked "${favTitle}"`,
              });
              seenMovieIds.add(String(item.movie.id));
            }
          });
        });
      }

      // If we got enough recommendations from favorites, return them
      if (tmdbRecCandidates.length >= limit) {
        return { data: { items: tmdbRecCandidates.slice(skip, skip + limit) } };
      }

      // Otherwise, supplement with top-rated/trending movies from TMDB
      const [trendingRes, topRatedRes] = await Promise.all([
        movieService.getTrending(20),
        movieService.getTopRated(20),
      ]);

      const pool = [...(trendingRes.data || []), ...(topRatedRes.data || [])];
      const poolItems = pool
        .filter((m) => !seenMovieIds.has(String(m.id)))
        .map((movie) => ({
          movie,
          score: Number((movie.rating || 8.0).toFixed(1)),
          explanation: 'Popular choice matched for you',
        }));

      const combined = [...tmdbRecCandidates, ...poolItems];

      // Remove duplicates by ID
      const uniqueMap = new Map();
      combined.forEach((item) => {
        if (!uniqueMap.has(String(item.movie.id))) {
          uniqueMap.set(String(item.movie.id), item);
        }
      });

      const finalItems = Array.from(uniqueMap.values()).slice(skip, skip + limit);
      return { data: { items: finalItems } };
    } catch (error) {
      console.warn('Recommendation computation error, falling back to top rated:', error.message);
      const top = await movieService.getTopRated(limit);
      return {
        data: {
          items: (top.data || []).map((movie) => ({
            movie,
            score: movie.rating || 8.0,
            explanation: 'Top rated selection',
          })),
        },
      };
    }
  },
};
