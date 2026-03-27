import { create } from 'zustand';

export interface TrialRequest {
  id: string;
  name: string;
  email: string;
  device: string;
  app: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  credentials?: { username: string; password: string };
}

export interface MacDevice {
  id: string;
  mac: string;
  label: string;
  username: string;
  m3uUrl?: string;
  status: 'active' | 'blocked' | 'expired';
  addedDate: string;
  lastSeen?: string;
  notes?: string;
}

export interface AdminConfig {
  serverUrl: string;
  adminUser: string;
  adminPass: string;
  stripeLinks: {
    basic_monthly: string;
    basic_annual: string;
    standard_monthly: string;
    standard_annual: string;
    premium_monthly: string;
    premium_annual: string;
  };
  social: {
    whatsapp: string;
    telegram: string;
    snapchat: string;
    instagram: string;
  };
  parentalControl: {
    enabled: boolean;
    pin: string;
    blockedCategories: string[];
  };
}

interface AdminState {
  isAdminAuth: boolean;
  trials: TrialRequest[];
  macDevices: MacDevice[];
  config: AdminConfig;
  logs: { time: string; type: string; message: string }[];

  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;

  addTrial: (trial: Omit<TrialRequest, 'id' | 'status'>) => void;
  updateTrialStatus: (id: string, status: TrialRequest['status'], credentials?: { username: string; password: string }) => void;
  deleteTrial: (id: string) => void;

  addMacDevice: (device: Omit<MacDevice, 'id' | 'addedDate'>) => void;
  updateMacDevice: (id: string, updates: Partial<MacDevice>) => void;
  deleteMacDevice: (id: string) => void;

  updateConfig: (config: Partial<AdminConfig>) => void;
  addLog: (type: string, message: string) => void;

  exportData: () => string;
  importData: (json: string) => boolean;
}

const ADMIN_KEY = 'iptv_admin';
const TRIALS_KEY = 'iptv_trials';
const MAC_KEY = 'iptv_mac_devices';
const CONFIG_KEY = 'iptv_admin_config';
const LOGS_KEY = 'iptv_admin_logs';
const ADMIN_PASS_KEY = 'iptv_admin_pass';

const DEFAULT_PASS = '8kpro2026';

function loadTrials(): TrialRequest[] {
  try { return JSON.parse(localStorage.getItem(TRIALS_KEY) || '[]'); } catch { return []; }
}

function loadMacDevices(): MacDevice[] {
  try { return JSON.parse(localStorage.getItem(MAC_KEY) || '[]'); } catch { return []; }
}

function loadConfig(): AdminConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    return {
      serverUrl: saved.serverUrl || 'http://smarter8k.ru',
      adminUser: saved.adminUser || '',
      adminPass: saved.adminPass || '',
      stripeLinks: saved.stripeLinks || {
        basic_monthly: '', basic_annual: '',
        standard_monthly: '', standard_annual: '',
        premium_monthly: '', premium_annual: '',
      },
      social: saved.social || { whatsapp: '', telegram: '', snapchat: '', instagram: '' },
      parentalControl: saved.parentalControl || { enabled: false, pin: '0000', blockedCategories: [] },
    };
  } catch {
    return {
      serverUrl: 'http://smarter8k.ru', adminUser: '', adminPass: '',
      stripeLinks: { basic_monthly: '', basic_annual: '', standard_monthly: '', standard_annual: '', premium_monthly: '', premium_annual: '' },
      social: { whatsapp: '', telegram: '', snapchat: '', instagram: '' },
      parentalControl: { enabled: false, pin: '0000', blockedCategories: [] },
    };
  }
}

function loadLogs(): { time: string; type: string; message: string }[] {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]'); } catch { return []; }
}

function getAdminPass(): string {
  return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASS;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  isAdminAuth: localStorage.getItem(ADMIN_KEY) === 'true',
  trials: loadTrials(),
  macDevices: loadMacDevices(),
  config: loadConfig(),
  logs: loadLogs(),

  loginAdmin: (password: string) => {
    if (password === getAdminPass()) {
      localStorage.setItem(ADMIN_KEY, 'true');
      set({ isAdminAuth: true });
      get().addLog('auth', 'Admin login successful');
      return true;
    }
    get().addLog('auth', 'Admin login failed');
    return false;
  },

  logoutAdmin: () => {
    localStorage.removeItem(ADMIN_KEY);
    set({ isAdminAuth: false });
  },

  addTrial: (trial) => {
    const newTrial: TrialRequest = {
      ...trial,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      status: 'pending',
    };
    const trials = [newTrial, ...get().trials];
    localStorage.setItem(TRIALS_KEY, JSON.stringify(trials));
    set({ trials });
    get().addLog('trial', `New trial request from ${trial.name} (${trial.email})`);
  },

  updateTrialStatus: (id, status, credentials) => {
    const trials = get().trials.map((t) =>
      t.id === id ? { ...t, status, credentials: credentials || t.credentials } : t
    );
    localStorage.setItem(TRIALS_KEY, JSON.stringify(trials));
    set({ trials });
    get().addLog('trial', `Trial ${id} marked as ${status}`);
  },

  deleteTrial: (id) => {
    const trials = get().trials.filter((t) => t.id !== id);
    localStorage.setItem(TRIALS_KEY, JSON.stringify(trials));
    set({ trials });
  },

  addMacDevice: (device) => {
    const newDevice: MacDevice = {
      ...device,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      addedDate: new Date().toISOString(),
    };
    const macDevices = [newDevice, ...get().macDevices];
    localStorage.setItem(MAC_KEY, JSON.stringify(macDevices));
    set({ macDevices });
    get().addLog('mac', `MAC device added: ${device.mac} (${device.label})`);
  },

  updateMacDevice: (id, updates) => {
    const macDevices = get().macDevices.map((d) => d.id === id ? { ...d, ...updates } : d);
    localStorage.setItem(MAC_KEY, JSON.stringify(macDevices));
    set({ macDevices });
    get().addLog('mac', `MAC device ${id} updated`);
  },

  deleteMacDevice: (id) => {
    const device = get().macDevices.find((d) => d.id === id);
    const macDevices = get().macDevices.filter((d) => d.id !== id);
    localStorage.setItem(MAC_KEY, JSON.stringify(macDevices));
    set({ macDevices });
    get().addLog('mac', `MAC device removed: ${device?.mac || id}`);
  },

  updateConfig: (partial) => {
    const config = { ...get().config, ...partial };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    set({ config });
  },

  addLog: (type, message) => {
    const logs = [{ time: new Date().toISOString(), type, message }, ...get().logs].slice(0, 200);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    set({ logs });
  },

  exportData: () => {
    return JSON.stringify({
      trials: get().trials,
      config: get().config,
      logs: get().logs,
    }, null, 2);
  },

  importData: (json) => {
    try {
      const data = JSON.parse(json);
      if (data.trials) { localStorage.setItem(TRIALS_KEY, JSON.stringify(data.trials)); }
      if (data.config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config)); }
      if (data.logs) { localStorage.setItem(LOGS_KEY, JSON.stringify(data.logs)); }
      set({
        trials: data.trials || get().trials,
        config: data.config ? { ...get().config, ...data.config } : get().config,
        logs: data.logs || get().logs,
      });
      return true;
    } catch { return false; }
  },
}));

// Helper to change admin password
export function setAdminPassword(newPass: string): void {
  localStorage.setItem(ADMIN_PASS_KEY, newPass);
}
