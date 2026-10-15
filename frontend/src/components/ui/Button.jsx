export default function Button({ children, variant = 'primary', className = '', loading = false, ...props }) {
  const variants = {
    primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-slate-200 hover:bg-white/5',
    danger: 'bg-red-500/90 text-white hover:bg-red-400',
  };

  const base = `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${variants[variant]} ${className}`;

  return (
    <button
      {...props}
      aria-busy={loading}
      disabled={loading || props.disabled}
      className={base}
    >
      {loading && (
        <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}

      {children}
    </button>
  );
}
