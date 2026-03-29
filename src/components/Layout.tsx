import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Player from './Player';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useIsTV } from '../hooks/useIsTV';
import { useIptvStore } from '../store/iptvStore';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';

export default function Layout() {
  useDpadNavigation();
  const isTV = useIsTV();
  const location = useLocation();
  const navigate = useNavigate();
  const playerTitle = useIptvStore((s) => s.playerTitle);
  const { t } = useTranslation();

  const pageTitles: Record<string, string> = {
    '/dashboard': t('nav.dashboard'),
    '/live': t('nav.live'),
    '/vod': t('nav.movies'),
    '/series': t('nav.series'),
    '/settings': t('nav.settings'),
  };

  const currentTitle = pageTitles[location.pathname] || '';

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-hidden">
        {/* Mobile top bar */}
        {!isTV && (
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.04] sticky top-0 z-40" style={{background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(20px) saturate(1.2)'}}>
            <h2 className="text-text-primary font-bold text-lg tracking-tight">{currentTitle}</h2>
            <div className="flex items-center gap-2">
              {playerTitle && (
                <div className="flex items-center gap-1.5 bg-accent/[0.08] rounded-lg px-2.5 py-1 border border-accent/[0.08]">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  <span className="text-accent/80 text-[10px] font-medium truncate max-w-[100px]">{playerTitle}</span>
                </div>
              )}
              <button
                onClick={() => navigate('/admin')}
                className="p-2 text-text-secondary/20 hover:text-red-400 rounded-lg transition"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <Player />
    </div>
  );
}
