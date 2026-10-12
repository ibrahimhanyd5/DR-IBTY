// Durable key-value storage on IndexedDB (large quota) with localStorage fallback.
// Also migrates legacy localStorage values the first time a key is read.

const DB_NAME = 'print_studio_db';
const STORE = 'kv';
let dbp: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

async function idbGet(key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(key: string, val: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
  });
}

export async function kvGet<T = any>(key: string): Promise<T | undefined> {
  try {
    const v = await idbGet(key);
    if (v !== undefined) return v as T;
  } catch (_) {
    // IndexedDB unavailable: fall back to localStorage below
    try {
      const raw = localStorage.getItem('kv:' + key);
      if (raw) return JSON.parse(raw) as T;
    } catch (_) {}
  }
  // one-time migration of legacy localStorage data
  try {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      try {
        await kvSet(key, parsed);
        localStorage.removeItem(key);
      } catch (_) {}
      return parsed as T;
    }
  } catch (_) {}
  return undefined;
}

export async function kvSet(key: string, val: any): Promise<void> {
  try {
    await idbSet(key, val);
  } catch (e: any) {
    if (e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message)))) throw e;
    // IndexedDB not available (e.g. private mode): try localStorage, may throw if full
    localStorage.setItem('kv:' + key, JSON.stringify(val));
  }
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (_) {}
}
