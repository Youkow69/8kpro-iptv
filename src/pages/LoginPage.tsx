import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Lock, Trash2, ArrowRightLeft, Monitor, Copy, Check, Fingerprint, Sparkles } from 'lucide-react';
import { authenticate } from '../services/xtreamApi';
import { useAuthStore, type SavedAccount } from '../store/authStore';
import { Logo } from '../components/Sidebar';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { playClick, playWelcome, playError, playSuccess } from '../services/sounds';

const DEFAULT_SERVER = 'http://smarter8k.ru';

// API base: use Vercel URL on native (APK has no local API server)
function getApiBase(): string {
  const cap = (window as any)?.Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return 'https://8kproultimate.vercel.app';
    if (cap.platform && cap.platform !== 'web') return 'https://8kproultimate.vercel.app';
  }
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return 'https://8kproultimate.vercel.app';
  if (!window.location.hostname.includes('vercel') && !window.location.hostname.includes('localhost')) return 'https://8kproultimate.vercel.app';
  return '';
}

// Generate a persistent device MAC and key
function getDeviceId(): { mac: string; key: string } {
  const DEVICE_KEY = '8k_device_id';
  const saved = localStorage.getItem(DEVICE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  // Generate random MAC
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  const mac = `00:1A:${hex()}:${hex()}:${hex()}:${hex()}`;
  // Generate device key
  const key = Array.from({ length: 12 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  const device = { mac, key };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  return device;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deviceId] = useState(getDeviceId);
  const { login, savedAccounts, switchAccount, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isTV = useIsTV();
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const onLogoDown = () => { longPressTimer.current = setTimeout(() => navigate('/admin'), 3000); };
  const onLogoUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      playSuccess();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      playSuccess();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const [activating, setActivating] = useState(false);
  // Check if device MAC is activated by admin
  const handleActivate = async () => {
    setError('');
    setActivating(true);
    const macAddr = deviceId.mac.toUpperCase();
    try {
      const res = await fetch(`${getApiBase()}/api/activate?mac=${encodeURIComponent(macAddr)}`);
      const data = await res.json();
      if (data.activated) {
        const creds = { server: data.server, username: data.username, password: data.password };
        const authRes = await authenticate(creds);
        if (!authRes?.user_info?.auth) throw new Error('Auth failed');
        login(creds, authRes.user_info, authRes.server_info);
        playWelcome();
        navigate('/live');
      } else {
        playError();
        setError('Appareil non activ\u00e9. Envoyez votre adresse MAC \u00e0 votre fournisseur.');
      }
    } catch {
      playError();
      setError('Erreur de connexion. R\u00e9essayez.');
    } finally {
      setActivating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const user = username.trim();
    const pass = password.trim();
    const creds = { server: DEFAULT_SERVER, username: user, password: pass };
    try {
      const res = await authenticate(creds);
      login(creds, res.user_info, res.server_info);
      playWelcome();
      navigate('/live');
    } catch (err: unknown) {
      playError();
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
    playClick();
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg relative overflow-hidden page-enter">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      <div className={`w-full relative z-10 ${isTV ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 select-none"
            onMouseDown={onLogoDown} onMouseUp={onLogoUp} onMouseLeave={onLogoUp}
            onTouchStart={onLogoDown} onTouchEnd={onLogoUp} onTouchCancel={onLogoUp}
          >
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
          <div className={`glass rounded-2xl mb-4 ${isTV ? 'p-6' : 'p-5'}`}>
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

        {/* Device ID Card */}
        <div className={`glass rounded-2xl shadow-xl mb-4 ${isTV ? 'p-6' : 'p-5'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className={`font-semibold text-text-primary ${isTV ? 'text-base' : 'text-sm'}`}>
                Identifiant de votre appareil
              </h2>
              <p className="text-text-secondary text-[11px]">
                Communiquez ces infos au support pour activer votre compte
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-surface-light rounded-xl px-4 py-3">
              <Monitor className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-text-secondary uppercase tracking-wider">Adresse MAC</div>
                <div className="font-mono text-text-primary text-sm tracking-wider">{deviceId.mac}</div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(deviceId.mac, 'mac')}
                className="p-2 hover:bg-accent/10 rounded-lg transition flex-shrink-0"
              >
                {copiedField === 'mac' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-surface-light rounded-xl px-4 py-3">
              <Lock className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-text-secondary uppercase tracking-wider">Cl&eacute; appareil</div>
                <div className="font-mono text-text-primary text-sm tracking-wider">{deviceId.key}</div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(deviceId.key, 'key')}
                className="p-2 hover:bg-accent/10 rounded-lg transition flex-shrink-0"
              >
                {copiedField === 'key' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className={`w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-green-500/20 ${
              isTV ? 'py-4 text-lg' : 'py-3.5 text-base'
            }`}
          >
            {activating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> V&eacute;rification...</>
            ) : (
              <><Monitor className="w-5 h-5" /> Activer mon appareil</>
            )}
          </button>
          <p className="text-center text-text-secondary/50 text-[11px] mt-2">
            Appuyez apr&egrave;s que votre fournisseur a activ&eacute; votre MAC
          </p>
          <a
            href="https://8kiptv.ovh/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 ${
              isTV ? 'py-4 text-lg' : 'py-3 text-sm'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            Demander un test gratuit
          </a>
        </div>

        {error && (
          <div className={`bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-center ${
            isTV ? 'text-base' : 'text-sm'
          }`}>
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`glass rounded-2xl space-y-5 shadow-2xl ${
            isTV ? 'p-10' : 'p-8'
          }`}
        >
          <div className="text-center mb-2">
            <h2 className={`font-semibold text-text-primary ${isTV ? 'text-lg' : 'text-base'}`}>Connexion</h2>
            <p className="text-text-secondary text-xs mt-1">Entrez les identifiants re&ccedil;us par email ou WhatsApp</p>
          </div>

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

        <p className={`text-center text-text-secondary/30 mt-6 font-mono ${isTV ? 'text-sm' : 'text-[10px]'}`}>
          8K Player v3.0.0
        </p>
      </div>
    </div>
  );
}
