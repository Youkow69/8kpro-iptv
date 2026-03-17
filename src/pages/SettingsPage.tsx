import { useNavigate } from 'react-router-dom';
import { LogOut, User, Server, Clock, Wifi, Shield, Keyboard, Globe, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useAuthStore, type SavedAccount } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export default function SettingsPage() {
  const { userInfo, credentials, logout, savedAccounts, switchAccount, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, setLang, languages } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const daysLeft = userInfo?.exp_date
    ? Math.max(0, Math.ceil((Number(userInfo.exp_date) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{t('settings.title')}</h1>

      {/* Account info */}
      <div className="bg-surface rounded-2xl p-6 mb-4 border border-surface-lighter/50">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-accent" />
          {t('settings.account')}
        </h2>
        <div className="space-y-0">
          <InfoRow icon={<User className="w-4 h-4" />} label={t('settings.user')} value={userInfo?.username || 'N/A'} />
          <InfoRow icon={<Server className="w-4 h-4" />} label={t('settings.server')} value={credentials?.server || 'N/A'} />
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label={t('settings.expiration')}
            value={daysLeft !== null ? `${expDate} (${daysLeft}${t('settings.daysLeft')})` : expDate}
            valueClass={daysLeft !== null && daysLeft < 30 ? 'text-yellow-400' : undefined}
          />
          <InfoRow icon={<Wifi className="w-4 h-4" />} label={t('settings.maxConnections')} value={userInfo?.max_connections || 'N/A'} />
          <InfoRow
            icon={<Wifi className="w-4 h-4" />}
            label={t('settings.activeConnections')}
            value={userInfo?.active_cons || 'N/A'}
          />
          <InfoRow
            icon={<Shield className="w-4 h-4" />}
            label={t('settings.status')}
            value={userInfo?.status || 'N/A'}
            valueClass={userInfo?.status === 'Active' ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* Language selector */}
      <div className="bg-surface rounded-2xl p-6 mb-4 border border-surface-lighter/50">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-accent" />
          {t('settings.language')}
        </h2>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
          className="w-full bg-surface-light border border-surface-lighter rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
        >
          {Object.entries(languages).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Multi-account management */}
      {savedAccounts.length > 0 && (
        <div className="bg-surface rounded-2xl p-6 mb-4 border border-surface-lighter/50">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            {t('settings.accounts')}
          </h2>
          <div className="space-y-2">
            {savedAccounts.map((account) => {
              const isCurrent = isCurrentAccount(account);
              return (
                <div
                  key={account.id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                    isCurrent ? 'bg-accent/10 border border-accent/30' : 'bg-surface-light'
                  }`}
                >
                  <span className="flex-1 text-sm text-text-primary truncate">
                    {getAccountDisplayName(account)}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full shrink-0">
                      {t('settings.currentAccount')}
                    </span>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() => handleSwitchAccount(account)}
                      className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition shrink-0"
                      title={t('settings.switchAccount')}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                    title={t('login.deleteAccount')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts */}
      <div className="bg-surface rounded-2xl p-6 mb-4 border border-surface-lighter/50">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-accent" />
          {t('settings.shortcuts')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ShortcutRow keys={t('settings.key.space')} desc={t('settings.key.playPause')} />
          <ShortcutRow keys="F" desc={t('settings.key.fullscreen')} />
          <ShortcutRow keys="M" desc={t('settings.key.mute')} />
          <ShortcutRow keys="C" desc={t('settings.key.channelList')} />
          <ShortcutRow keys="↑ / ↓" desc={t('settings.key.prevNext')} />
          <ShortcutRow keys={t('settings.key.escape')} desc={t('settings.key.close')} />
        </div>
      </div>

      {/* Logout */}
      <div className="bg-surface rounded-2xl p-6 border border-surface-lighter/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-3 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          {t('settings.logout')}
        </button>
        <p className="text-text-secondary text-xs text-center mt-3">
          {t('settings.logoutHint')}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-lighter/50 last:border-0">
      <div className="flex items-center gap-2.5 text-text-secondary text-sm">
        {icon}
        {label}
      </div>
      <span className={`text-sm font-medium ${valueClass || 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-light/50">
      <span className="text-text-secondary text-xs">{desc}</span>
      <kbd className="bg-surface-lighter text-text-primary text-[10px] font-mono px-2 py-0.5 rounded-md">
        {keys}
      </kbd>
    </div>
  );
}
