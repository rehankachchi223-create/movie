export const formatDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const ratingToStars = (rating = 0) => Math.round(rating || 0);

export const formatRuntime = (runtime) => {
  if (!runtime) return 'N/A';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

export const getPosterUrl = (url) => {
  if (!url) {
    return 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80';
  }

  return url;
};

export const getBackdropUrl = (url) => {
  if (!url) {
    return 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=80';
  }

  return url;
};
