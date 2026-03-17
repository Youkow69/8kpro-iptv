import { create } from 'zustand';
import type { XtreamCredentials, UserInfo, ServerInfo } from '../types/xtream';

export interface SavedAccount {
  id: string;
  name: string;
  credentials: XtreamCredentials;
  userInfo: UserInfo;
  serverInfo: ServerInfo;
}

interface AuthState {
  credentials: XtreamCredentials | null;
  userInfo: UserInfo | null;
  serverInfo: ServerInfo | null;
  isAuthenticated: boolean;
  savedAccounts: SavedAccount[];
  login: (creds: XtreamCredentials, userInfo: UserInfo, serverInfo: ServerInfo) => void;
  logout: () => void;
  saveAccount: () => void;
  switchAccount: (id: string) => void;
  deleteAccount: (id: string) => void;
  getSavedAccounts: () => SavedAccount[];
}

const STORAGE_KEY = 'iptv_auth';
const ACCOUNTS_KEY = 'iptv_accounts';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.credentials && state.userInfo) {
        return { ...state, isAuthenticated: true };
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { credentials: null, userInfo: null, serverInfo: null, isAuthenticated: false };
}

function loadAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        return accounts;
      }
    }
  } catch {
    localStorage.removeItem(ACCOUNTS_KEY);
  }
  return [];
}

function saveAccountsToStorage(accounts: SavedAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function upsertAccount(
  accounts: SavedAccount[],
  credentials: XtreamCredentials,
  userInfo: UserInfo,
  serverInfo: ServerInfo,
): SavedAccount[] {
  const name = `${credentials.username}@${credentials.server}`;
  const existingIndex = accounts.findIndex(
    (a) => a.credentials.username === credentials.username && a.credentials.server === credentials.server,
  );

  const account: SavedAccount = {
    id: existingIndex >= 0 ? accounts[existingIndex].id : Date.now().toString(),
    name,
    credentials,
    userInfo,
    serverInfo,
  };

  const updated = [...accounts];
  if (existingIndex >= 0) {
    updated[existingIndex] = account;
  } else {
    updated.push(account);
  }
  return updated;
}

const initial = loadFromStorage();
const initialAccounts = loadAccounts();

export const useAuthStore = create<AuthState>((set, get) => ({
  credentials: initial.credentials,
  userInfo: initial.userInfo,
  serverInfo: initial.serverInfo,
  isAuthenticated: initial.isAuthenticated,
  savedAccounts: initialAccounts,

  login: (credentials, userInfo, serverInfo) => {
    const state = { credentials, userInfo, serverInfo };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const updatedAccounts = upsertAccount(get().savedAccounts, credentials, userInfo, serverInfo);
    saveAccountsToStorage(updatedAccounts);

    set({ ...state, isAuthenticated: true, savedAccounts: updatedAccounts });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('iptv_last_channel');
    set({ credentials: null, userInfo: null, serverInfo: null, isAuthenticated: false });
  },

  saveAccount: () => {
    const { credentials, userInfo, serverInfo, savedAccounts } = get();
    if (!credentials || !userInfo || !serverInfo) return;

    const updatedAccounts = upsertAccount(savedAccounts, credentials, userInfo, serverInfo);
    saveAccountsToStorage(updatedAccounts);
    set({ savedAccounts: updatedAccounts });
  },

  switchAccount: (id: string) => {
    const account = get().savedAccounts.find((a) => a.id === id);
    if (!account) return;

    const state = {
      credentials: account.credentials,
      userInfo: account.userInfo,
      serverInfo: account.serverInfo,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem('iptv_last_channel');
    set({ ...state, isAuthenticated: true });
  },

  deleteAccount: (id: string) => {
    const updatedAccounts = get().savedAccounts.filter((a) => a.id !== id);
    saveAccountsToStorage(updatedAccounts);
    set({ savedAccounts: updatedAccounts });
  },

  getSavedAccounts: () => {
    return get().savedAccounts;
  },
}));
