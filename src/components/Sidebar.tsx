import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Radio, Film, Clapperboard, Settings } from 'lucide-react';
import { useIptvStore } from '../store/iptvStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import DragonBallAura from './DragonBallAura';

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
    <div className={`${s} rounded-xl overflow-hidden shrink-0 relative`}
      style={{
        background: 'linear-gradient(145deg, #0f0f0d, #0a0a08)',
        boxShadow: '0 4px 20px rgba(229,160,13,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        border: '1px solid rgba(229,160,13,0.2)',
      }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center">
        <span className={`font-black tracking-tighter leading-none ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-sm' : 'text-[10px]'}`} style={{background: 'linear-gradient(135deg, #fbbf24, #e5a00d, #b45309)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>8K</span>
        {size !== 'sm' && (
          <span className={`font-bold text-white/70 uppercase tracking-[0.2em] ${size === 'lg' ? 'text-[8px]' : 'text-[5px]'}`}>Pro</span>
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
  const navigate = useNavigate();
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const onLogoDown = () => {
    longPressTimer.current = setTimeout(() => navigate('/admin'), 3000);
  };
  const onLogoUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const links = linkDefs.map((l) => ({ ...l, label: t(l.labelKey) }));

  // TV mode: full left sidebar
  if (isTV) {
    return (
      <aside className="flex flex-col w-64 min-h-screen shrink-0 border-r border-white/[0.04]" style={{background: 'linear-gradient(180deg, rgba(20,20,20,0.95), rgba(14,14,14,0.98))'}}>
        <div
          className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.04] cursor-pointer select-none"
          onMouseDown={onLogoDown} onMouseUp={onLogoUp} onMouseLeave={onLogoUp}
          onTouchStart={onLogoDown} onTouchEnd={onLogoUp} onTouchCancel={onLogoUp}
        >
          <Logo size="md" />
          <div>
            <span className="font-bold text-xl tracking-tight text-gold">8K Player</span>
            <p className="text-[10px] text-text-secondary/40 uppercase tracking-[0.2em]">Ultimate</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {links.map((l, i) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-lg font-medium group ${
                  isActive
                    ? 'bg-accent/10 text-accent border-l-[3px] border-accent shadow-sm'
                    : 'text-text-secondary/70 hover:bg-white/[0.03] hover:text-text-primary'
                }`
              }
            >
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                <DragonBallAura streamId={i * 7 + 3} size="xs" />
                <l.icon className="w-6 h-6 relative z-[1]" />
              </div>
              <span className="relative z-[1]">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {isPlaying && (
          <div className="px-4 py-4 border-t border-white/[0.04]">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-accent/[0.06] border border-accent/10">
              <div className="flex gap-[3px] items-end shrink-0">
                <span className="w-[3px] h-3 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-[3px] h-4 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-[3px] h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-accent/50 uppercase tracking-[0.15em] font-medium">{t('player.nowPlaying')}</p>
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
      <aside className="hidden md:flex flex-col w-20 lg:w-56 min-h-screen shrink-0 border-r border-white/[0.04]" style={{background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(24px)'}}>
        <div
          className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.04] cursor-pointer select-none"
          onMouseDown={onLogoDown} onMouseUp={onLogoUp} onMouseLeave={onLogoUp}
          onTouchStart={onLogoDown} onTouchEnd={onLogoUp} onTouchCancel={onLogoUp}
        >
          <Logo />
          <div className="hidden lg:block">
            <span className="font-bold text-lg tracking-tight text-gold">8K Player</span>
            <p className="text-[9px] text-text-secondary/40 uppercase tracking-[0.2em]">Ultimate</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {links.map((l, i) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary/60 hover:bg-white/[0.03] hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative w-7 h-7 shrink-0 mx-auto lg:mx-0 flex items-center justify-center">
                    <DragonBallAura streamId={i * 7 + 3} size="xs" />
                    <l.icon className={`w-5 h-5 relative z-[1] ${isActive ? 'drop-shadow-[0_0_8px_rgba(229,160,13,0.3)]' : ''}`} />
                  </div>
                  <span className="hidden lg:block text-sm font-medium relative z-[1]">{l.label}</span>
                  {isActive && <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {isPlaying && (
          <div className="px-3 py-3 border-t border-white/[0.04]">
            <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 bg-accent/[0.05] border border-accent/[0.08]">
              <div className="flex gap-[2px] items-end shrink-0">
                <span className="w-[2px] h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-[2px] h-3 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-[2px] h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className="text-[10px] text-accent/50 uppercase tracking-[0.15em]">{t('player.nowPlaying')}</p>
                <p className="text-xs text-text-primary font-medium truncate">{playerTitle}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/[0.06] px-1 py-1.5 safe-area-bottom nav-enter" style={{background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(24px) saturate(1.2)'}}>
        {links.map((l, i) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all group ${
                isActive ? 'text-accent' : 'text-text-secondary/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <DragonBallAura streamId={i * 7 + 3} size="xs" />
                  <l.icon className={`w-4 h-4 relative z-[1] ${isActive ? 'drop-shadow-[0_0_8px_rgba(229,160,13,0.4)]' : ''}`} />
                </div>
                <span className={`text-[9px] relative z-[1] ${isActive ? 'font-semibold' : 'font-medium'}`}>{l.label}</span>
                {isActive && <div className="w-4 h-[2px] rounded-full bg-accent mt-0.5" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
