import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React app error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-300">
              !
            </div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-300">The app encountered an unexpected error.</p>
            <p className="mt-2 text-xs text-red-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
