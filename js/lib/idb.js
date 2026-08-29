/* Tiny IndexedDB wrapper — used for progress-photo blobs, which are too large
   for localStorage. Falls back to a no-op store when IDB is unavailable. */
const DB = 'forge', STORE = 'blobs', VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no-idb'));
    const req = indexedDB.open(DB, VER);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }).catch((e) => { dbp = null; throw e; });
  return dbp;
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const putBlob = (key, blob) => tx('readwrite', (s) => s.put(blob, key)).catch(() => null);
export const getBlob = (key) => tx('readonly', (s) => s.get(key)).catch(() => null);
export const delBlob = (key) => tx('readwrite', (s) => s.delete(key)).catch(() => null);
export const allKeys = () => tx('readonly', (s) => s.getAllKeys()).catch(() => []);

/** Object URLs are revoked on the next call for the same key to avoid leaks. */
const urls = new Map();
export async function blobURL(key) {
  const b = await getBlob(key);
  if (!b) return null;
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  const u = URL.createObjectURL(b);
  urls.set(key, u);
  return u;
}
export function releaseURLs() {
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
}
