import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, User, Server, Keyboard, Globe, ArrowRightLeft, Trash2, Sparkles, Crown, Zap, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore, type SavedAccount } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { toggleSounds, getSoundsEnabled, playLogout, playClick } from '../services/sounds';

export default function SettingsPage() {
  const { userInfo, credentials, logout, savedAccounts, switchAccount, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, setLang, languages } = useTranslation();
  const isTV = useIsTV();
  const [soundsOn, setSoundsOn] = useState(getSoundsEnabled());

  const handleLogout = () => {
    playLogout();
    setTimeout(() => { logout(); navigate('/login'); }, 400);
  };

  const handleSwitchAccount = (account: SavedAccount) => {
    switchAccount(account.id);
    navigate('/live');
  };

  const getAccountDisplayName = (account: SavedAccount) => {
    try {
      const hostname = new URL(account.credentials.server).hostname;
      return `${account.credentials.username} @ ${hostname}`;
    } catch {
      return `${account.credentials.username} @ ${account.credentials.server}`;
    }
  };

  const isCurrentAccount = (account: SavedAccount) =>
    credentials?.username === account.credentials.username &&
    credentials?.server === account.credentials.server;

  const expDate = userInfo?.exp_date
    ? new Date(Number(userInfo.exp_date) * 1000).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'N/A';

  const daysLeft = userInfo?.exp_date
    ? Math.max(0, Math.ceil((Number(userInfo.exp_date) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const expPercent = daysLeft !== null ? Math.min(100, (daysLeft / 365) * 100) : 0;

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto page-enter">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className={`font-bold text-text-primary ${isTV ? 'text-3xl' : 'text-2xl'}`}>{t('settings.title')}</h1>
          <p className="text-text-secondary text-sm">8K Player</p>
        </div>
      </div>

      {/* Subscription card */}
      <div className="relative overflow-hidden rounded-2xl mb-4 bg-gradient-to-br from-amber-900/30 via-surface to-surface border border-accent/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
        <div className="p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-accent">Premium</h2>
            {userInfo?.status === 'Active' && (
              <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {t('settings.status')}: Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="glass rounded-xl p-3">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-1">{t('settings.user')}</p>
              <p className="text-text-primary font-medium text-sm truncate">{userInfo?.username || 'N/A'}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider mb-1">{t('settings.maxConnections')}</p>
              <p className="text-text-primary font-medium text-sm">{userInfo?.max_connections || 'N/A'}</p>
            </div>
          </div>

          {/* Expiration bar */}
          {daysLeft !== null && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-xs">{t('settings.expiration')}</span>
                <span className={`text-xs font-medium ${daysLeft < 30 ? 'text-yellow-400' : 'text-text-primary'}`}>
                  {daysLeft}j restants
                </span>
              </div>
              <div className="w-full h-2 bg-surface-lighter rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    daysLeft < 30 ? 'bg-gradient-to-r from-red-500 to-yellow-500' : 'bg-gradient-to-r from-accent to-yellow-400'
                  }`}
                  style={{ width: `${expPercent}%` }}
                />
              </div>
              <p className="text-text-secondary text-[11px] mt-1.5">{expDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Server info */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">{t('settings.server')}</h3>
        </div>
        <div className="flex items-center gap-3 bg-surface-light/50 rounded-xl px-4 py-3">
          <Zap className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-text-primary text-sm truncate font-mono">{credentials?.server || 'N/A'}</span>
          <span className="ml-auto text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Online</span>
        </div>
      </div>

      {/* Language */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">{t('settings.language')}</h3>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(languages).map(([code, name]) => (
            <button
              key={code}
              onClick={() => { playClick(); setLang(code as typeof lang); }}
              className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                lang === code
                  ? 'bg-accent text-black shadow-lg shadow-accent/20'
                  : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-lighter'
              }`}
            >
              {(name as string).slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-account */}
      {savedAccounts.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">{t('settings.accounts')}</h3>
            <span className="ml-auto text-[10px] text-text-secondary bg-surface-lighter px-2 py-0.5 rounded-full">
              {savedAccounts.length}
            </span>
          </div>
          <div className="space-y-2">
            {savedAccounts.map((account) => {
              const isCurrent = isCurrentAccount(account);
              return (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                    isCurrent
                      ? 'bg-accent/10 border border-accent/30 shadow-sm shadow-accent/10'
                      : 'bg-surface-light/50 hover:bg-surface-light'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCurrent ? 'bg-accent text-black' : 'bg-surface-lighter text-text-secondary'
                  }`}>
                    {account.credentials.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-text-primary truncate">
                    {getAccountDisplayName(account)}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full shrink-0 font-medium">
                      Actif
                    </span>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() => handleSwitchAccount(account)}
                      className="p-2 text-accent hover:bg-accent/10 rounded-lg transition shrink-0"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sound effects toggle */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundsOn ? <Volume2 className="w-5 h-5 text-accent" /> : <VolumeX className="w-5 h-5 text-text-secondary" />}
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Effets sonores</h3>
              <p className="text-[11px] text-text-secondary">Sons lors des interactions</p>
            </div>
          </div>
          <button
            onClick={() => { const v = toggleSounds(); setSoundsOn(v); }}
            className={`w-12 h-7 rounded-full transition-all relative ${soundsOn ? 'bg-accent' : 'bg-surface-lighter'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${soundsOn ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">{t('settings.shortcuts')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ShortcutRow keys={t('settings.key.space')} desc={t('settings.key.playPause')} />
          <ShortcutRow keys="F" desc={t('settings.key.fullscreen')} />
          <ShortcutRow keys="M" desc={t('settings.key.mute')} />
          <ShortcutRow keys="C" desc={t('settings.key.channelList')} />
          <ShortcutRow keys="↑ / ↓" desc={t('settings.key.prevNext')} />
          <ShortcutRow keys={t('settings.key.escape')} desc={t('settings.key.close')} />
          <ShortcutRow keys="← / →" desc="Volume" />
        </div>
      </div>

      {/* About */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">À propos</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary text-xs">Application</span>
            <span className="text-text-primary text-xs font-medium">8K Player</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-text-secondary text-xs">Version</span>
            <span className="text-accent text-xs font-mono">v2.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-text-secondary text-xs">Build</span>
            <span className="text-text-primary text-xs font-mono">{new Date().toISOString().slice(0, 10)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-text-secondary text-xs">Moteur</span>
            <span className="text-text-primary text-xs">HLS.js + mpegts.js</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-text-secondary text-xs">Langues</span>
            <span className="text-text-primary text-xs">10 langues</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-text-secondary text-xs">Support</span>
            <span className="text-accent text-xs">24/7</span>
          </div>
        </div>
      </div>

      {/* Cache clear */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Stockage</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-xs">Cache local</span>
          <span className="text-text-primary text-xs font-mono">{(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB</span>
        </div>
        <button
          onClick={() => {
            playClick();
            localStorage.removeItem('iptv_history');
            localStorage.removeItem('iptv_search_history');
            alert('Cache vidé !');
          }}
          className="w-full py-2.5 bg-surface-light/50 hover:bg-surface-light text-text-secondary hover:text-text-primary rounded-xl text-xs transition"
        >
          Vider le cache (historique + recherche)
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-4 rounded-2xl transition-all mb-6"
      >
        <LogOut className="w-5 h-5" />
        {t('settings.logout')}
      </button>

      <p className="text-text-secondary/20 text-[10px] text-center mb-8 font-mono">
        8K Player v2.0 — {new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-light/30">
      <span className="text-text-secondary text-xs">{desc}</span>
      <kbd className="bg-surface-lighter/80 text-accent text-[10px] font-mono px-2.5 py-1 rounded-md border border-surface-lighter">
        {keys}
      </kbd>
    </div>
  );
}
