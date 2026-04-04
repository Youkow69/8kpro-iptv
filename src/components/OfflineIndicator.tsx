import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center justify-center gap-2 py-1.5 animate-fade-in">
      <WifiOff className="w-3.5 h-3.5" />
      Hors ligne — vérifiez votre connexion
    </div>
  );
}
