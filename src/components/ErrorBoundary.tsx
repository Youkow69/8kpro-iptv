import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
          <div className="max-w-md w-full text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Oups !</h1>
            <p className="text-text-secondary mb-6">
              Une erreur inattendue s'est produite. Pas de panique, essayez de recharger.
            </p>
            {this.state.error && (
              <div className="glass rounded-xl p-4 mb-6 text-left">
                <p className="text-red-400 text-xs font-mono truncate">{this.state.error.message}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-gradient-to-r from-accent to-amber-600 text-black font-semibold px-6 py-3 rounded-xl shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40"
              >
                <RefreshCw className="w-4 h-4" /> Recharger
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex items-center gap-2 glass text-text-primary px-6 py-3 rounded-xl transition-all hover:bg-surface-light"
              >
                <Home className="w-4 h-4" /> Accueil
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
