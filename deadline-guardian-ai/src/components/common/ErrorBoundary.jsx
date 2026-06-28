import { Component } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - catches render/runtime errors in its subtree and shows a
 * graceful fallback instead of letting one crash blank the whole app.
 *
 * Wrap individual widgets so a single failure stays contained:
 *   <ErrorBoundary label="Habit Tracker"><HabitTrackerWidget /></ErrorBoundary>
 *
 * Props:
 *   - children:  the protected subtree.
 *   - label:     human-friendly name shown in the fallback + warning.
 *   - fallback:  optional custom fallback node to render instead of the default.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log once for debugging - concise, not spammy.
    console.warn(
      `[ErrorBoundary] ${this.props.label || 'A component'} crashed and was contained.`,
      error,
      info?.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // App-level (global) fallback: a friendly, full-screen recovery screen so
      // a crash ANYWHERE in the tree never leaves a blank white page. No stack
      // traces are shown to the user (SECURITY_NOTE: avoid leaking internals).
      if (this.props.level === 'app') {
        return (
          <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-slate-50 px-6 text-center">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl" />
              <div className="absolute bottom-[-8rem] right-1/4 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />
            </div>
            <span className="grid h-16 w-16 place-items-center rounded-3xl bg-red-50 text-red-500 ring-1 ring-red-100">
              <AlertTriangle className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Something went wrong</h1>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                The app hit an unexpected error. Your data is safe — try again, or
                reload to start fresh.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform active:scale-95"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" /> Reload app
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-red-200 bg-red-50/60 p-6 text-center backdrop-blur-xl">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-slate-700">
            {this.props.label || 'This section'} hit a snag
          </p>
          <p className="text-xs text-slate-500">
            It was isolated so the rest of your dashboard keeps working.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
