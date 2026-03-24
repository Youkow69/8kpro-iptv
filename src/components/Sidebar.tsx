import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radio, Film, Clapperboard, Settings } from 'lucide-react';
import { useIptvStore } from '../store/iptvStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';

const linkDefs = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/live', labelKey: 'nav.live', icon: Radio },
  { to: '/vod', labelKey: 'nav.movies', icon: Film },
  { to: '/series', labelKey: 'nav.series', icon: Clapperboard },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'w-20 h-20' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <div className={`${s} rounded-xl overflow-hidden shrink-0 shadow-lg shadow-yellow-500/25 animate-pulse-glow bg-[#0a0a08] relative`}>
      <div className="absolute inset-0 rounded-xl border border-amber-500/30" />
      <div className="w-full h-full flex flex-col items-center justify-center">
        <span className={`font-black tracking-tighter leading-none ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-sm' : 'text-[10px]'}`} style={{background: 'linear-gradient(135deg, #f5c842, #d4a017, #b45309)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>8K</span>
        {size !== 'sm' && (
          <span className={`font-bold text-white/80 uppercase tracking-widest ${size === 'lg' ? 'text-[8px]' : 'text-[5px]'}`}>Pro</span>
        )}
      </div>
    </div>
  );
}

export { Logo };

export default function Sidebar() {
  const playerTitle = useIptvStore((s) => s.playerTitle);
  const isPlaying = !!playerTitle;
  const { t } = useTranslation();
  const isTV = useIsTV();

  const links = linkDefs.map((l) => ({ ...l, label: t(l.labelKey) }));

  // TV mode: full left sidebar
  if (isTV) {
    return (
      <aside className="flex flex-col w-64 bg-surface/90 backdrop-blur-xl min-h-screen shrink-0 border-r border-surface-lighter/30">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-lighter/30">
          <Logo size="md" />
          <div>
            <span className="font-bold text-xl text-accent tracking-tight">8K Player</span>
            <p className="text-[10px] text-text-secondary/50 uppercase tracking-widest">Ultimate</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-lg font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/20 to-accent/5 text-accent shadow-md shadow-accent/10 border-l-3 border-accent'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary focus-visible:bg-surface-light focus-visible:text-text-primary'
                }`
              }
            >
              <l.icon className="w-7 h-7 shrink-0" />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {isPlaying && (
          <div className="px-4 py-4 border-t border-surface-lighter/30">
            <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex gap-0.5 items-end shrink-0">
                <span className="w-1 h-3 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-4 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-accent/70 uppercase tracking-widest font-medium">{t('player.nowPlaying')}</p>
                <p className="text-sm text-text-primary font-medium truncate">{playerTitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Phone/Desktop mode
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 glass min-h-screen shrink-0 border-r border-white/5">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <Logo />
          <div className="hidden lg:block">
            <span className="font-bold text-lg text-accent tracking-tight">8K Player</span>
            <p className="text-[9px] text-text-secondary/50 uppercase tracking-widest">Ultimate</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/20 to-transparent text-accent shadow-sm shadow-accent/10'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`
              }
            >
              <l.icon className="w-5 h-5 shrink-0 mx-auto lg:mx-0" />
              <span className="hidden lg:block text-sm font-medium">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {isPlaying && (
          <div className="px-3 py-3 border-t border-white/5">
            <div className="glass-light rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="flex gap-0.5 items-end shrink-0">
                <span className="w-0.5 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-3 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className="text-[10px] text-accent/70 uppercase tracking-widest">{t('player.nowPlaying')}</p>
                <p className="text-xs text-text-primary font-medium truncate">{playerTitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom bar - glassmorphism */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass z-50 border-t border-white/5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs transition-all ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <l.icon className="w-5 h-5 mb-1" />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-accent rounded-full" />
                  )}
                </div>
                <span className={isActive ? 'font-medium' : ''}>{l.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
