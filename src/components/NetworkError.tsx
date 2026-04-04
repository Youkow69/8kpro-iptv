import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

export default function NetworkError({ message, onRetry, retrying }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <WifiOff className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <p className="text-text-primary font-medium text-sm">{message}</p>
        <p className="text-text-secondary/50 text-xs mt-1">Vérifiez votre connexion et réessayez</p>
      </div>
      <button
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-all disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Chargement...' : 'Réessayer'}
      </button>
    </div>
  );
}
