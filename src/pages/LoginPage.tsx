import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Lock, Trash2, ArrowRightLeft } from 'lucide-react';
import { authenticate } from '../services/xtreamApi';
import { useAuthStore, type SavedAccount } from '../store/authStore';
import { Logo } from '../components/Sidebar';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';

const DEFAULT_SERVER = 'http://smarter8k.ru';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, savedAccounts, switchAccount, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isTV = useIsTV();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const creds = { server: DEFAULT_SERVER, username: username.trim(), password: password.trim() };
    try {
      const res = await authenticate(creds);
      login(creds, res.user_info, res.server_info);
      navigate('/live');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Network Error')) {
        setError(t('login.error.network'));
      } else {
        setError(t('login.error.auth'));
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className={`w-full relative z-10 ${isTV ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5">
            <Logo size="lg" />
          </div>
          <h1 className={`font-bold text-text-primary tracking-tight ${isTV ? 'text-4xl' : 'text-3xl'}`}>
            {t('login.title')}
          </h1>
          <p className={`text-text-secondary mt-2 ${isTV ? 'text-base' : 'text-sm'}`}>
            {t('login.subtitle')}
          </p>
        </div>

        {/* Saved accounts */}
        {savedAccounts.length > 0 && (
          <div className={`bg-surface rounded-2xl mb-4 border border-surface-lighter/50 ${isTV ? 'p-6' : 'p-5'}`}>
            <h2 className={`font-semibold text-text-primary mb-3 ${isTV ? 'text-base' : 'text-sm'}`}>
              {t('login.accounts')}
            </h2>
            <div className={isTV ? 'space-y-3' : 'space-y-2'}>
              {savedAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center gap-3 bg-surface-light rounded-xl ${isTV ? 'px-4 py-4' : 'px-3 py-2.5'}`}
                >
                  <span className={`flex-1 text-text-primary truncate ${isTV ? 'text-base' : 'text-sm'}`}>
                    {getAccountDisplayName(account)}
                  </span>
                  <button
                    onClick={() => handleSwitchAccount(account)}
                    className={`text-accent hover:bg-accent/10 focus-visible:bg-accent/10 rounded-lg transition ${
                      isTV ? 'p-3' : 'p-1.5'
                    }`}
                    title={t('settings.switchAccount')}
                  >
                    <ArrowRightLeft className={isTV ? 'w-6 h-6' : 'w-4 h-4'} />
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className={`text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10 rounded-lg transition ${
                      isTV ? 'p-3' : 'p-1.5'
                    }`}
                    title={t('login.deleteAccount')}
                  >
                    <Trash2 className={isTV ? 'w-6 h-6' : 'w-4 h-4'} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`bg-surface rounded-2xl space-y-5 shadow-2xl border border-surface-lighter/50 ${
            isTV ? 'p-10' : 'p-8'
          }`}
        >
          <div>
            <label className={`block text-text-secondary mb-1.5 ${isTV ? 'text-base' : 'text-sm'}`}>
              {t('login.username')}
            </label>
            <div className="relative">
              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50 ${
                isTV ? 'w-5 h-5' : 'w-4 h-4'
              }`} />
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full bg-surface-light border border-surface-lighter rounded-xl pr-4 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition ${
                  isTV ? 'pl-11 py-4 text-lg' : 'pl-10 py-3 text-base'
                }`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-text-secondary mb-1.5 ${isTV ? 'text-base' : 'text-sm'}`}>
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/50 ${
                isTV ? 'w-5 h-5' : 'w-4 h-4'
              }`} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full bg-surface-light border border-surface-lighter rounded-xl pr-4 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition ${
                  isTV ? 'pl-11 py-4 text-lg' : 'pl-10 py-3 text-base'
                }`}
              />
            </div>
          </div>

          {error && (
            <div className={`bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 ${
              isTV ? 'text-base' : 'text-sm'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-yellow-500 to-amber-700 hover:from-yellow-400 hover:to-amber-600 focus-visible:from-yellow-400 focus-visible:to-amber-600 text-black font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-yellow-500/20 ${
              isTV ? 'py-4 text-lg' : 'py-3.5 text-base'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className={`animate-spin ${isTV ? 'w-6 h-6' : 'w-5 h-5'}`} />
                {t('login.loading')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        <p className={`text-center text-text-secondary/40 mt-6 ${isTV ? 'text-sm' : 'text-xs'}`}>
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
