/**
 * EPG Service: Async XMLTV loading with IndexedDB caching
 * Downloads EPG data in background without freezing the UI
 */

export interface EpgProgram {
  channelId: string;
  title: string;
  description: string;
  start: Date;
  stop: Date;
  icon?: string;
  category?: string;
}

interface EpgChannel {
  id: string;
  name: string;
  icon?: string;
}

// IndexedDB wrapper for EPG storage
class EpgDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'iptv_epg';
  private readonly VERSION = 1;

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('programs')) {
          const store = db.createObjectStore('programs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('channelId', 'channelId', { unique: false });
          store.createIndex('start', 'start', { unique: false });
          store.createIndex('channel_start', ['channelId', 'start'], { unique: false });
        }
        if (!db.objectStoreNames.contains('channels')) {
          db.createObjectStore('channels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async getLastUpdate(): Promise<number> {
    if (!this.db) await this.open();
    return new Promise((resolve) => {
      const tx = this.db!.transaction('meta', 'readonly');
      const req = tx.objectStore('meta').get('lastUpdate');
      req.onsuccess = () => resolve(req.result?.value ?? 0);
      req.onerror = () => resolve(0);
    });
  }

  async setLastUpdate(timestamp: number): Promise<void> {
    if (!this.db) await this.open();
    const tx = this.db!.transaction('meta', 'readwrite');
    tx.objectStore('meta').put({ key: 'lastUpdate', value: timestamp });
  }

  async clearPrograms(): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('programs', 'readwrite');
      const req = tx.objectStore('programs').clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async addPrograms(programs: EpgProgram[]): Promise<void> {
    if (!this.db) await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('programs', 'readwrite');
      const store = tx.objectStore('programs');
      for (const p of programs) {
        store.add({ ...p, start: p.start.getTime(), stop: p.stop.getTime() });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async addChannels(channels: EpgChannel[]): Promise<void> {
    if (!this.db) await this.open();
    const tx = this.db!.transaction('channels', 'readwrite');
    const store = tx.objectStore('channels');
    for (const c of channels) {
      store.put(c);
    }
  }

  async getCurrentProgram(channelId: string): Promise<EpgProgram | null> {
    if (!this.db) await this.open();
    const now = Date.now();
    return new Promise((resolve) => {
      const tx = this.db!.transaction('programs', 'readonly');
      const idx = tx.objectStore('programs').index('channel_start');
      const range = IDBKeyRange.bound([channelId, 0], [channelId, now]);
      const req = idx.openCursor(range, 'prev');
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && cursor.value.stop > now) {
          const v = cursor.value;
          resolve({ ...v, start: new Date(v.start), stop: new Date(v.stop) });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  async getUpcoming(channelId: string, limit = 5): Promise<EpgProgram[]> {
    if (!this.db) await this.open();
    const now = Date.now();
    return new Promise((resolve) => {
      const results: EpgProgram[] = [];
      const tx = this.db!.transaction('programs', 'readonly');
      const idx = tx.objectStore('programs').index('channel_start');
      const range = IDBKeyRange.lowerBound([channelId, now]);
      const req = idx.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit && cursor.value.channelId === channelId) {
          const v = cursor.value;
          results.push({ ...v, start: new Date(v.start), stop: new Date(v.stop) });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    });
  }
}

// Parse XMLTV in chunks to avoid blocking main thread
function parseXMLTV(xmlText: string): { channels: EpgChannel[]; programs: EpgProgram[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const channels: EpgChannel[] = [];
  const programs: EpgProgram[] = [];

  // Parse channels
  for (const ch of doc.querySelectorAll('channel')) {
    channels.push({
      id: ch.getAttribute('id') || '',
      name: ch.querySelector('display-name')?.textContent || '',
      icon: ch.querySelector('icon')?.getAttribute('src') || undefined,
    });
  }

  // Parse programs
  for (const pg of doc.querySelectorAll('programme')) {
    const startStr = pg.getAttribute('start') || '';
    const stopStr = pg.getAttribute('stop') || '';
    programs.push({
      channelId: pg.getAttribute('channel') || '',
      title: pg.querySelector('title')?.textContent || '',
      description: pg.querySelector('desc')?.textContent || '',
      start: parseXmltvDate(startStr),
      stop: parseXmltvDate(stopStr),
      icon: pg.querySelector('icon')?.getAttribute('src') || undefined,
      category: pg.querySelector('category')?.textContent || undefined,
    });
  }

  return { channels, programs };
}

function parseXmltvDate(str: string): Date {
  // XMLTV format: 20260315120000 +0100
  const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return new Date();
  const [, y, mo, d, h, mi, s, tz] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${tz ? tz.slice(0, 3) + ':' + tz.slice(3) : 'Z'}`;
  return new Date(iso);
}

class EpgService {
  private db = new EpgDatabase();
  private loading = false;
  private listeners = new Set<() => void>();

  async init(): Promise<void> {
    await this.db.open();
  }

  onUpdate(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Load EPG from Xtream Codes XMLTV endpoint
   * Runs in background, never blocks UI
   */
  async loadFromXtream(server: string, username: string, password: string): Promise<void> {
    if (this.loading) return;

    // Check if cache is fresh (< 6 hours old)
    const lastUpdate = await this.db.getLastUpdate();
    const sixHours = 6 * 60 * 60 * 1000;
    if (Date.now() - lastUpdate < sixHours) return;

    this.loading = true;
    this.notify();

    try {
      const baseUrl = server.replace(/\/+$/, '');
      const epgUrl = `${baseUrl}/xmltv.php?username=${username}&password=${password}`;

      // Fetch with streaming to handle large files
      const response = await fetch(epgUrl);
      if (!response.ok) throw new Error(`EPG fetch failed: ${response.status}`);

      const xmlText = await response.text();

      // Parse in background-friendly way
      const { channels, programs } = parseXMLTV(xmlText);

      // Store in IndexedDB
      await this.db.clearPrograms();

      // Insert in batches of 500 to avoid long transactions
      const batchSize = 500;
      for (let i = 0; i < programs.length; i += batchSize) {
        await this.db.addPrograms(programs.slice(i, i + batchSize));
        // Yield to main thread between batches
        await new Promise((r) => setTimeout(r, 0));
      }

      await this.db.addChannels(channels);
      await this.db.setLastUpdate(Date.now());
    } catch (err) {
      console.warn('EPG load failed (non-blocking):', err);
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async getCurrentProgram(channelId: string): Promise<EpgProgram | null> {
    return this.db.getCurrentProgram(channelId);
  }

  async getUpcoming(channelId: string, limit = 5): Promise<EpgProgram[]> {
    return this.db.getUpcoming(channelId, limit);
  }
}

export const epgService = new EpgService();
