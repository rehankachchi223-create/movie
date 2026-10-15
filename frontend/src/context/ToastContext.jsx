import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  };

  const value = useMemo(
    () => ({
      addToast,
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : toast.type === 'error'
                  ? 'border-red-500/40 bg-red-500/10 text-red-100'
                  : 'border-sky-500/40 bg-slate-800/80 text-slate-50'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
