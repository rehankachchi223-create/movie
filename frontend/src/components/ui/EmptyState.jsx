export default function EmptyState({ title, description, action, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-300">{description}</p>}
      {children}
      {action}
    </div>
  );
}
