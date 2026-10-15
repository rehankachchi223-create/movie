export default function ErrorState({ title = 'Something went wrong', message, retry }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-left">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {message && <p className="mt-2 text-sm text-red-100/80">{message}</p>}
      {retry && (
        <button onClick={retry} className="mt-4 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white">
          Try again
        </button>
      )}
    </div>
  );
}
