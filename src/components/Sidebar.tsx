import { NavLink } from 'react-router-dom';
import { Radio, Film, Clapperboard, Settings } from 'lucide-react';
import { useIptvStore } from '../store/iptvStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';

const linkDefs = [
  { to: '/live', labelKey: 'nav.live', icon: Radio },
  { to: '/vod', labelKey: 'nav.movies', icon: Film },
  { to: '/series', labelKey: 'nav.series', icon: Clapperboard },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-[10px]';
  return (
    <div className={`${s} bg-gradient-to-br from-yellow-500 to-amber-700 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-yellow-500/20 font-black text-black tracking-tighter`}>
      8K
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

  // TV mode: full left sidebar always visible with large items
  if (isTV) {
    return (
      <aside className="flex flex-col w-64 bg-surface min-h-screen shrink-0 border-r border-surface-lighter/50">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-lighter">
          <Logo size="md" />
          <span className="font-bold text-xl text-text-primary tracking-tight">8K Pro</span>
        </div>
        <nav className="flex-1 py-4 space-y-2 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-xl transition text-lg font-medium ${
                  isActive
                    ? 'bg-accent/15 text-accent'
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
          <div className="px-4 py-4 border-t border-surface-lighter">
            <div className="bg-surface-light rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex gap-0.5 items-end shrink-0">
                <span className="w-1 h-3 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-4 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary uppercase tracking-wider">{t('player.nowPlaying')}</p>
                <p className="text-sm text-text-primary font-medium truncate">{playerTitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Phone/Desktop mode (original)
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 bg-surface min-h-screen shrink-0 border-r border-surface-lighter/50">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-lighter">
          <Logo />
          <span className="hidden lg:block font-bold text-lg text-text-primary tracking-tight">8K Pro</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-accent/15 text-accent'
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
          <div className="px-3 py-3 border-t border-surface-lighter">
            <div className="bg-surface-light rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="flex gap-0.5 items-end shrink-0">
                <span className="w-0.5 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-0.5 h-3 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-0.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">{t('player.nowPlaying')}</p>
                <p className="text-xs text-text-primary font-medium truncate">{playerTitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-surface-lighter flex z-50">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs transition ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <l.icon className="w-5 h-5 mb-1" />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
