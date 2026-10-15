import { useEffect, useRef, useState } from 'react';
import { movieService } from '../../services/movieService';
import { getBackdropUrl } from '../../utils/format';

/**
 * HeroVideoBackground
 * 
 * Replaces static hero backdrop with a short cinematic 5-6 second looped video preview
 * in the background, while guaranteeing:
 * - Matching preview for every individual movie (Bollywood, Hollywood, Anime, Korean, etc.)
 * - Zero race conditions (movie switching cleanly halts and detaches previous video)
 * - Rock-solid static backdrop fallback if video is unavailable or blocked
 * - Smooth fade-in transition (no black/blank flashes)
 * - Zero player UI / controls (pure cinematic ambient background)
 */
export default function HeroVideoBackground({
  movie,
  backdropUrl,
  startSeconds = 15,
  previewDurationMs = 5500,
  className = '',
}) {
  const [videoKey, setVideoKey] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeMovieIdRef = useRef(null);
  const loopIntervalRef = useRef(null);
  const readyTimeoutRef = useRef(null);
  const iframeRef = useRef(null);

  const movieId = movie?.id;
  const currentBackdrop = backdropUrl || movie?.backdrop_url || movie?.poster_url;

  useEffect(() => {
    // 1. Immediately reset video state when active movie changes
    setIsReady(false);
    setHasError(false);
    setVideoKey(null);

    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }

    if (!movieId) {
      activeMovieIdRef.current = null;
      return;
    }

    // 2. Track current active movie ID to strictly prevent asynchronous race conditions
    activeMovieIdRef.current = movieId;
    let isCancelled = false;

    // 3. Asynchronously load matching preview for this specific movie
    const fetchPreview = async () => {
      try {
        const preview = await movieService.getMoviePreview(movie);

        // Discard if user already changed to another movie or component unmounted
        if (isCancelled || activeMovieIdRef.current !== movieId) {
          return;
        }

        if (preview?.videoKey) {
          setVideoKey(preview.videoKey);
        } else {
          setHasError(true);
        }
      } catch (err) {
        if (!isCancelled && activeMovieIdRef.current === movieId) {
          setHasError(true);
        }
      }
    };

    fetchPreview();

    return () => {
      isCancelled = true;
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
    };
  }, [movieId]);

  // 4. Controlled 5-6 second looping playback
  useEffect(() => {
    if (!videoKey || hasError) return;

    // Buffer delay: give the iframe ~800ms to buffer the video segment before fading it in
    readyTimeoutRef.current = setTimeout(() => {
      setIsReady(true);
    }, 850);

    // Loop interval: every ~5.5 seconds, send seekTo back to startSeconds to maintain the short preview snippet
    loopIntervalRef.current = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [startSeconds, true] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch {
          // Cross-origin safe ignore
        }
      }
    }, previewDurationMs);

    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [videoKey, hasError, startSeconds, previewDurationMs]);

  // Construct YouTube privacy-enhanced embed URL with strict ambient background parameters
  // NOTE: `end` parameter intentionally omitted — it caused YouTube to pause at the clip
  // boundary and display its end-of-video overlay (prev/pause/next controls visible to user).
  // The JS seekTo interval below already loops playback back to startSeconds every 5.5 s,
  // so `end` was both redundant and the root cause of the unwanted controls flash.
  const iframeSrc = videoKey && !hasError
    ? `https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&start=${startSeconds}&modestbranding=1&rel=0&showinfo=0&disablekb=1&iv_load_policy=3&playsinline=1&enablejsapi=1&fs=0`
    : null;

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* ── BASE LAYER: STATIC BACKDROP IMAGE (ALWAYS present as reliable fallback) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ backgroundImage: `url(${getBackdropUrl(currentBackdrop)})` }}
        aria-hidden="true"
      />

      {/* ── CINEMATIC VIDEO PREVIEW LAYER (Fades in over backdrop without black flash) ── */}
      {iframeSrc && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] min-w-[100vw] min-h-[56.25vw] -translate-x-1/2 -translate-y-1/2 scale-[1.35] sm:scale-[1.25] pointer-events-none">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title={`${movie?.title || 'Movie'} Preview Background`}
              allow="autoplay; encrypted-media; picture-in-picture"
              className={`w-full h-full border-0 pointer-events-none transition-opacity duration-1000 ease-in-out ${
                isReady ? 'opacity-75' : 'opacity-0'
              }`}
              onError={() => setHasError(true)}
              tabIndex="-1"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}
