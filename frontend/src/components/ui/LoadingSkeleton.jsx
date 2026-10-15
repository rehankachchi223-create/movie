export function LoadingSkeleton({ className = 'h-4 w-full rounded' }) {
  return (
    <div
      role="presentation"
      className={`skeleton rounded ${className}`}
      aria-hidden="true"
    />
  );
}
