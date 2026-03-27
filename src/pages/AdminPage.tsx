import { useState, useEffect } from 'react';
import {
  Shield, BarChart3, Settings, LogOut, Clock,
  CheckCircle, XCircle, AlertCircle, Trash2, Download,
  Upload, Server, Link, MessageSquare, Lock,
  Activity, Zap, TrendingUp, UserPlus, Search, Filter,
  Monitor, Plus, Wifi,
} from 'lucide-react';
import { useAdminStore, setAdminPassword, type TrialRequest, type MacDevice } from '../store/adminStore';
import { Logo } from '../components/Sidebar';
import { playClick, playSuccess, playError } from '../services/sounds';

type AdminTab = 'dashboard' | 'trials' | 'mac' | 'config' | 'logs' | 'settings';

export default function AdminPage() {
  const { isAdminAuth, loginAdmin, logoutAdmin } = useAdminStore();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  if (!isAdminAuth) {
    return <AdminLogin password={password} setPassword={setPassword} error={loginError} onLogin={() => {
      if (loginAdmin(password)) {
        playSuccess();
        setLoginError('');
      } else {
        playError();
        setLoginError('Mot de passe incorrect');
      }
    }} />;
  }

  return <AdminDashboard onLogout={logoutAdmin} />;
}

// --- Login Screen ---
function AdminLogin({ password, setPassword, error, onLogin }: {
  password: string; setPassword: (v: string) => void; error: string; onLogin: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg page-enter">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-4 shadow-lg shadow-red-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">8K Pro Admin</h1>
          <p className="text-text-secondary text-sm mt-1">Panel d'administration</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-text-secondary text-sm mb-1.5 block">Mot de passe admin</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-light border border-surface-lighter rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent transition"
                autoFocus
              />
            </div>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20">
            Accéder au panel
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Main Admin Dashboard ---
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('dashboard');

  const tabs: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'trials', label: 'Essais', icon: UserPlus },
    { id: 'mac', label: 'MAC', icon: Monitor },
    { id: 'config', label: 'Config', icon: Server },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="md:w-56 glass border-b md:border-b-0 md:border-r border-white/5 md:min-h-screen shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <Logo size="sm" />
          <div>
            <span className="font-bold text-sm text-text-primary">Admin</span>
            <p className="text-[9px] text-red-400 uppercase tracking-widest font-medium">Panel</p>
          </div>
        </div>

        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible p-2 gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { playClick(); setTab(t.id); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap text-sm font-medium ${
                tab === t.id
                  ? 'bg-red-500/15 text-red-400'
                  : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="hidden md:block mt-auto p-3 border-t border-white/5">
          <button
            onClick={() => { playClick(); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition text-sm"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto page-enter">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'trials' && <TrialsTab />}
        {tab === 'mac' && <MacTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

// --- Dashboard Tab ---
function DashboardTab() {
  const { trials, logs, macDevices } = useAdminStore();
  const today = new Date().toISOString().slice(0, 10);
  const todayTrials = trials.filter((t) => t.date.startsWith(today)).length;
  const pendingTrials = trials.filter((t) => t.status === 'pending').length;
  const approvedTrials = trials.filter((t) => t.status === 'approved').length;

  const stats = [
    { label: "Essais aujourd'hui", value: todayTrials, icon: Zap, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-500/5' },
    { label: 'En attente', value: pendingTrials, icon: Clock, color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-500/5' },
    { label: 'Approuvés', value: approvedTrials, icon: CheckCircle, color: 'text-green-400', bg: 'from-green-500/20 to-green-500/5' },
    { label: 'Total essais', value: trials.length, icon: TrendingUp, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-500/5' },
  ];

  return (
    <div className="stagger-children">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard Admin</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 bg-gradient-to-br ${s.bg} border border-white/5 card-hover`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-text-secondary text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Activity chart (last 7 days) */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-400" /> Activité (7 derniers jours)
        </h2>
        <div className="flex items-end gap-2 h-24">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().slice(0, 10);
            const count = trials.filter((t) => t.date.startsWith(dateStr)).length;
            const maxCount = Math.max(1, ...Array.from({ length: 7 }, (_, j) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - j));
              return trials.filter((t) => t.date.startsWith(d.toISOString().slice(0, 10))).length;
            }));
            const height = Math.max(8, (count / maxCount) * 100);
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);
            const isToday = i === 6;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-text-secondary">{count}</span>
                <div
                  className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-red-500' : 'bg-accent/40'}`}
                  style={{ height: `${height}%` }}
                />
                <span className={`text-[9px] ${isToday ? 'text-red-400 font-medium' : 'text-text-secondary/60'}`}>{dayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAC devices count */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-text-primary text-lg font-bold">{macDevices.length}</p>
            <p className="text-text-secondary text-[10px]">Appareils MAC</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-text-primary text-lg font-bold">{logs.length}</p>
            <p className="text-text-secondary text-[10px]">Actions enregistrées</p>
          </div>
        </div>
      </div>

      {/* Recent trials */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-red-400" /> Dernières demandes d'essai
        </h2>
        {trials.slice(0, 5).map((trial) => (
          <div key={trial.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-surface-lighter flex items-center justify-center text-xs font-bold text-text-secondary">
              {trial.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{trial.name}</p>
              <p className="text-text-secondary text-[11px] truncate">{trial.email}</p>
            </div>
            <StatusBadge status={trial.status} />
          </div>
        ))}
        {trials.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-6">Aucune demande d'essai</p>
        )}
      </div>

      {/* Recent logs */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-400" /> Activité récente
        </h2>
        {logs.slice(0, 8).map((log, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] text-text-secondary font-mono w-16 shrink-0">
              {new Date(log.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              log.type === 'auth' ? 'bg-red-500/15 text-red-400' :
              log.type === 'trial' ? 'bg-blue-500/15 text-blue-400' :
              'bg-surface-lighter text-text-secondary'
            }`}>{log.type}</span>
            <span className="text-text-primary text-xs truncate">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-4">Aucun log</p>
        )}
      </div>
    </div>
  );
}

// --- Trials Tab ---
function TrialsTab() {
  const { trials, updateTrialStatus, deleteTrial } = useAdminStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const filtered = trials
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));

  const exportCSV = () => {
    const header = 'Nom,Email,Appareil,App,Date,Statut\n';
    const rows = trials.map((t) => `${t.name},${t.email},${t.device},${t.app},${t.date},${t.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'essais_8kpro.csv';
    a.click();
  };

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Gestion des essais</h1>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover px-3 py-2 glass rounded-xl transition">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/50 transition"
          />
        </div>
        <div className="flex gap-1 bg-surface-light/50 rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f ? 'bg-accent text-black' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Rejetés'}
            </button>
          ))}
        </div>
      </div>

      {/* Trials list */}
      <div className="space-y-2">
        {filtered.map((trial) => (
          <TrialCard key={trial.id} trial={trial} onStatusChange={updateTrialStatus} onDelete={deleteTrial} />
        ))}
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <Filter className="w-10 h-10 text-text-secondary/30 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">Aucun essai trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrialCard({ trial, onStatusChange, onDelete }: {
  trial: TrialRequest;
  onStatusChange: (id: string, status: TrialRequest['status']) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-light/30 transition"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-lighter flex items-center justify-center text-sm font-bold text-accent">
          {trial.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium truncate">{trial.name}</p>
          <p className="text-text-secondary text-[11px]">{trial.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-secondary hidden sm:inline">
            {new Date(trial.date).toLocaleDateString('fr-FR')}
          </span>
          <StatusBadge status={trial.status} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-light/30 rounded-lg p-3">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Appareil</p>
              <p className="text-text-primary text-sm">{trial.device}</p>
            </div>
            <div className="bg-surface-light/30 rounded-lg p-3">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Application</p>
              <p className="text-text-primary text-sm">{trial.app}</p>
            </div>
          </div>

          {trial.credentials && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-xs font-medium mb-1">Identifiants envoyés</p>
              <p className="text-text-primary text-xs font-mono">{trial.credentials.username} / {trial.credentials.password}</p>
            </div>
          )}

          <div className="flex gap-2">
            {trial.status !== 'approved' && (
              <button
                onClick={() => { playSuccess(); onStatusChange(trial.id, 'approved'); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/25 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approuver
              </button>
            )}
            {trial.status !== 'rejected' && (
              <button
                onClick={() => { playError(); onStatusChange(trial.id, 'rejected'); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/25 transition"
              >
                <XCircle className="w-3.5 h-3.5" /> Rejeter
              </button>
            )}
            <button
              onClick={() => onDelete(trial.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-lighter text-text-secondary rounded-lg text-xs hover:text-red-400 hover:bg-red-500/10 transition ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAC Tab ---
function MacTab() {
  const { macDevices, addMacDevice, updateMacDevice, deleteMacDevice } = useAdminStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMac, setNewMac] = useState({ mac: '', label: '', username: '', m3uUrl: '', notes: '', status: 'active' as MacDevice['status'] });
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [, setLoadingRemote] = useState(true);

  // Load devices from Supabase on mount (sync across devices)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/activate?list=all&adminKey=8kpro2026');
        if (!res.ok) throw new Error('Failed to load');
        const remoteDevices = await res.json();
        if (Array.isArray(remoteDevices)) {
          // Merge remote devices into local store (remote is source of truth)
          const localMacs = new Set(macDevices.map((d) => d.mac));
          for (const rd of remoteDevices) {
            if (!localMacs.has(rd.mac)) {
              addMacDevice({
                mac: rd.mac,
                label: rd.name || rd.mac,
                username: rd.iptv_username || '',
                m3uUrl: rd.m3u_url || '',
                status: rd.status || 'active',
                notes: rd.notes || '',
              });
            } else {
              // Update local device with remote status
              const localDevice = macDevices.find((d) => d.mac === rd.mac);
              if (localDevice && localDevice.status !== rd.status) {
                updateMacDevice(localDevice.id, { status: rd.status });
              }
            }
          }
        }
      } catch {
        // Silently fail - local data still available
      } finally {
        setLoadingRemote(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = macDevices.filter((d) =>
    d.mac.toLowerCase().includes(search.toLowerCase()) ||
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.username.toLowerCase().includes(search.toLowerCase())
  );

  // Sync device to Supabase via API
  const syncToApi = async (mac: string, m3uUrl: string, label: string, username: string, notes: string, deviceKey?: string) => {
    const res = await fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mac,
        m3u_url: m3uUrl,
        adminKey: '8kpro2026',
        device_key: deviceKey || undefined,
        name: label,
        username,
        notes,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(data.error || 'Sync failed');
    }
    return res.json();
  };

  const deleteFromApi = async (mac: string) => {
    await fetch(`/api/activate?mac=${encodeURIComponent(mac)}`, { method: 'DELETE' });
  };

  const handleAdd = async () => {
    if (!newMac.mac || !newMac.label || !newMac.m3uUrl) return;
    const formattedMac = newMac.mac.replace(/[^a-fA-F0-9]/g, '').replace(/(.{2})/g, '$1:').slice(0, 17).toUpperCase();

    setSyncing(true);
    setSyncError('');
    try {
      // Sync to Supabase first
      await syncToApi(formattedMac, newMac.m3uUrl, newMac.label, newMac.username, newMac.notes || '');
      // Then save locally
      addMacDevice({ ...newMac, mac: formattedMac });
      setNewMac({ mac: '', label: '', username: '', m3uUrl: '', notes: '', status: 'active' });
      setShowAddForm(false);
      playSuccess();
    } catch (err: any) {
      setSyncError(err.message || 'Erreur de synchronisation');
      playError();
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (device: MacDevice) => {
    try {
      await deleteFromApi(device.mac);
    } catch {}
    deleteMacDevice(device.id);
    playClick();
  };

  const handleBlock = async (device: MacDevice) => {
    try {
      await deleteFromApi(device.mac);
    } catch {}
    updateMacDevice(device.id, { status: 'blocked' });
    playError();
  };

  const handleActivate = async (device: MacDevice) => {
    if (device.m3uUrl) {
      try {
        await syncToApi(device.mac, device.m3uUrl, device.label, device.username, device.notes || '');
      } catch {}
    }
    updateMacDevice(device.id, { status: 'active' });
    playSuccess();
  };

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestion MAC</h1>
          <p className="text-text-secondary text-sm mt-1">{macDevices.length} appareil{macDevices.length > 1 ? 's' : ''} enregistré{macDevices.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { playClick(); setShowAddForm(!showAddForm); }}
          className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/20"
        >
          <Plus className="w-4 h-4" /> Ajouter MAC
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="glass rounded-2xl p-5 mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-400" /> Nouvel appareil
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Adresse MAC *</label>
              <input
                type="text"
                value={newMac.mac}
                onChange={(e) => setNewMac({ ...newMac, mac: e.target.value })}
                placeholder="00:1A:2B:3C:4D:5E"
                className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition font-mono"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Nom / Label *</label>
              <input
                type="text"
                value={newMac.label}
                onChange={(e) => setNewMac({ ...newMac, label: e.target.value })}
                placeholder="TV Salon, MAG Box..."
                className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Lien M3U *</label>
              <input
                type="text"
                value={newMac.m3uUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setNewMac((prev) => {
                    const next = { ...prev, m3uUrl: url };
                    // Auto-extract username from M3U URL
                    try {
                      const parsed = new URL(url);
                      const u = parsed.searchParams.get('username');
                      if (u) next.username = u;
                    } catch {}
                    return next;
                  });
                }}
                placeholder="http://server/get.php?username=xxx&password=yyy&type=m3u_plus"
                className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Username IPTV</label>
              <input
                type="text"
                value={newMac.username}
                onChange={(e) => setNewMac({ ...newMac, username: e.target.value })}
                placeholder="Auto-extrait du M3U"
                className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Statut</label>
              <select
                value={newMac.status}
                onChange={(e) => setNewMac({ ...newMac, status: e.target.value as MacDevice['status'] })}
                className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition"
              >
                <option value="active">Actif</option>
                <option value="blocked">Bloqué</option>
                <option value="expired">Expiré</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">Notes</label>
            <input
              type="text"
              value={newMac.notes}
              onChange={(e) => setNewMac({ ...newMac, notes: e.target.value })}
              placeholder="Notes optionnelles..."
              className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition"
            />
          </div>
          {syncError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {syncError}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={syncing} className="flex items-center gap-1.5 bg-green-500/15 text-green-400 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-500/25 transition disabled:opacity-50">
              <CheckCircle className="w-4 h-4" /> {syncing ? 'Sync...' : 'Ajouter'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 bg-surface-lighter text-text-secondary rounded-xl text-sm hover:text-text-primary transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
        <input
          type="text"
          placeholder="Rechercher par MAC, nom ou username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/50 transition"
        />
      </div>

      {/* MAC list */}
      <div className="space-y-2">
        {filtered.map((device) => (
          <div key={device.id} className="glass rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                device.status === 'active' ? 'bg-green-500/15' :
                device.status === 'blocked' ? 'bg-red-500/15' : 'bg-orange-500/15'
              }`}>
                <Monitor className={`w-5 h-5 ${
                  device.status === 'active' ? 'text-green-400' :
                  device.status === 'blocked' ? 'text-red-400' : 'text-orange-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-text-primary text-sm font-medium truncate">{device.label}</p>
                  <MacStatusBadge status={device.status} />
                </div>
                <p className="text-accent text-xs font-mono mt-0.5">{device.mac}</p>
                {device.username && (
                  <p className="text-text-secondary text-[11px] mt-0.5">User: {device.username}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Status toggles */}
                {device.status !== 'active' && (
                  <button
                    onClick={() => handleActivate(device)}
                    className="p-2 text-green-400/60 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition"
                    title="Activer"
                  >
                    <Wifi className="w-4 h-4" />
                  </button>
                )}
                {device.status !== 'blocked' && (
                  <button
                    onClick={() => handleBlock(device)}
                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Bloquer"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(device)}
                  className="p-2 text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {device.notes && (
              <div className="px-4 pb-3 -mt-1">
                <p className="text-text-secondary text-[11px] italic">{device.notes}</p>
              </div>
            )}
            <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-text-secondary/60">
              <span>Ajouté: {new Date(device.addedDate).toLocaleDateString('fr-FR')}</span>
              {device.lastSeen && <span>Vu: {new Date(device.lastSeen).toLocaleDateString('fr-FR')}</span>}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <Monitor className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">
              {macDevices.length === 0 ? 'Aucun appareil MAC enregistré' : 'Aucun résultat'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MacStatusBadge({ status }: { status: MacDevice['status'] }) {
  const styles = {
    active: 'bg-green-500/15 text-green-400',
    blocked: 'bg-red-500/15 text-red-400',
    expired: 'bg-orange-500/15 text-orange-400',
  };
  const labels = { active: 'Actif', blocked: 'Bloqué', expired: 'Expiré' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// --- Config Tab ---
function ConfigTab() {
  const { config, updateConfig } = useAdminStore();
  const [saved, setSaved] = useState(false);

  const save = () => {
    playSuccess();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-enter max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Configuration</h1>

      {/* Server */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-red-400" /> Serveur IPTV
        </h2>
        <InputField label="URL serveur" value={config.serverUrl} onChange={(v) => updateConfig({ serverUrl: v })} />
        <InputField label="Username admin" value={config.adminUser} onChange={(v) => updateConfig({ adminUser: v })} />
        <InputField label="Password admin" value={config.adminPass} onChange={(v) => updateConfig({ adminPass: v })} type="password" />
      </div>

      {/* Stripe */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Link className="w-4 h-4 text-red-400" /> Liens Stripe
        </h2>
        <InputField label="Basic mensuel" value={config.stripeLinks.basic_monthly} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, basic_monthly: v } })} placeholder="https://buy.stripe.com/..." />
        <InputField label="Basic annuel" value={config.stripeLinks.basic_annual} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, basic_annual: v } })} />
        <InputField label="Standard mensuel" value={config.stripeLinks.standard_monthly} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, standard_monthly: v } })} />
        <InputField label="Standard annuel" value={config.stripeLinks.standard_annual} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, standard_annual: v } })} />
        <InputField label="Premium mensuel" value={config.stripeLinks.premium_monthly} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, premium_monthly: v } })} />
        <InputField label="Premium annuel" value={config.stripeLinks.premium_annual} onChange={(v) => updateConfig({ stripeLinks: { ...config.stripeLinks, premium_annual: v } })} />
      </div>

      {/* Social */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-400" /> Réseaux sociaux
        </h2>
        <InputField label="WhatsApp" value={config.social.whatsapp} onChange={(v) => updateConfig({ social: { ...config.social, whatsapp: v } })} placeholder="+33..." />
        <InputField label="Telegram" value={config.social.telegram} onChange={(v) => updateConfig({ social: { ...config.social, telegram: v } })} placeholder="@..." />
        <InputField label="Snapchat" value={config.social.snapchat} onChange={(v) => updateConfig({ social: { ...config.social, snapchat: v } })} />
        <InputField label="Instagram" value={config.social.instagram} onChange={(v) => updateConfig({ social: { ...config.social, instagram: v } })} placeholder="@..." />
      </div>

      {/* Parental Control */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" /> Contrôle parental
        </h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-text-primary text-sm font-medium">Activer le contrôle parental</p>
            <p className="text-text-secondary text-[11px]">Bloque l'accès aux catégories adultes avec un code PIN</p>
          </div>
          <button
            onClick={() => updateConfig({ parentalControl: { ...config.parentalControl, enabled: !config.parentalControl.enabled } })}
            className={`w-12 h-7 rounded-full transition-all relative ${config.parentalControl.enabled ? 'bg-red-500' : 'bg-surface-lighter'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${config.parentalControl.enabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {config.parentalControl.enabled && (
          <div className="space-y-3 animate-fade-in">
            <InputField
              label="Code PIN (4 chiffres)"
              value={config.parentalControl.pin}
              onChange={(v) => {
                const pin = v.replace(/\D/g, '').slice(0, 4);
                updateConfig({ parentalControl: { ...config.parentalControl, pin } });
              }}
              placeholder="0000"
            />
            <div>
              <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-2 block">Catégories bloquées</label>
              <div className="flex flex-wrap gap-2">
                {['Adulte', 'XXX', '+18', 'Adult', 'For Adults'].map((cat) => {
                  const blocked = config.parentalControl.blockedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const cats = blocked
                          ? config.parentalControl.blockedCategories.filter((c) => c !== cat)
                          : [...config.parentalControl.blockedCategories, cat];
                        updateConfig({ parentalControl: { ...config.parentalControl, blockedCategories: cats } });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        blocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {blocked ? '🚫 ' : ''}{cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={save}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${
          saved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/20'
        }`}
      >
        {saved ? '✓ Sauvegardé' : 'Sauvegarder'}
      </button>
    </div>
  );
}

// --- Logs Tab ---
function LogsTab() {
  const { logs } = useAdminStore();

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Logs & Activité</h1>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-surface-light/20 transition">
              <span className="text-[10px] text-text-secondary font-mono shrink-0 w-32">
                {new Date(log.time).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${
                log.type === 'auth' ? 'bg-red-500/15 text-red-400' :
                log.type === 'trial' ? 'bg-blue-500/15 text-blue-400' :
                log.type === 'config' ? 'bg-purple-500/15 text-purple-400' :
                'bg-surface-lighter text-text-secondary'
              }`}>{log.type}</span>
              <span className="text-text-primary text-xs truncate">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="p-10 text-center">
              <Activity className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Aucun log enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Settings Tab ---
function SettingsTab() {
  const { exportData, importData, logoutAdmin } = useAdminStore();
  const [newPass, setNewPass] = useState('');
  const [passChanged, setPassChanged] = useState(false);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'admin_backup_8kpro.json';
    a.click();
    playSuccess();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (importData(reader.result as string)) {
          playSuccess();
          alert('Import réussi !');
        } else {
          playError();
          alert('Erreur d\'import');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleChangePass = () => {
    if (newPass.length < 4) return;
    setAdminPassword(newPass);
    setNewPass('');
    setPassChanged(true);
    playSuccess();
    setTimeout(() => setPassChanged(false), 3000);
  };

  return (
    <div className="page-enter max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Paramètres</h1>

      {/* Change password */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400" /> Changer le mot de passe
        </h2>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="flex-1 bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/50 transition"
          />
          <button
            onClick={handleChangePass}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              passChanged
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {passChanged ? '✓ Changé' : 'Changer'}
          </button>
        </div>
      </div>

      {/* Export/Import */}
      <div className="glass rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-red-400" /> Sauvegarde
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 bg-surface-light/50 rounded-xl text-sm text-text-primary hover:bg-surface-light transition"
          >
            <Download className="w-4 h-4 text-accent" /> Exporter
          </button>
          <button
            onClick={handleImport}
            className="flex items-center justify-center gap-2 py-3 bg-surface-light/50 rounded-xl text-sm text-text-primary hover:bg-surface-light transition"
          >
            <Upload className="w-4 h-4 text-accent" /> Importer
          </button>
        </div>
      </div>

      {/* Version */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Version</span>
          <span className="text-text-primary text-sm font-mono">8K Pro Admin v2.0</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-text-secondary text-sm">Build</span>
          <span className="text-text-primary text-sm font-mono">{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { playClick(); logoutAdmin(); }}
        className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-4 rounded-2xl transition-all"
      >
        <LogOut className="w-5 h-5" /> Déconnexion admin
      </button>
    </div>
  );
}

// --- Helpers ---
function StatusBadge({ status }: { status: TrialRequest['status'] }) {
  const styles = {
    pending: 'bg-orange-500/15 text-orange-400',
    approved: 'bg-green-500/15 text-green-400',
    rejected: 'bg-red-500/15 text-red-400',
  };
  const labels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="text-text-secondary text-[11px] uppercase tracking-wider mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent/50 transition"
      />
    </div>
  );
}
