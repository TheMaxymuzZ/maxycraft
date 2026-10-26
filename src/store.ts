// Almacén de partidas (v4.6). Hasta la 4.5 todo iba en localStorage, que solo deja unos 5 MB: cabe una isla grande,
// pero no un archipiélago. Ahora las partidas van en IndexedDB (cientos de MB) y localStorage queda de respaldo
// para navegadores que no la permitan.
//
// El juego lee y escribe en una copia en memoria (rápido y sin esperas); cada escritura se manda después a IndexedDB.
// Al abrir el juego por primera vez con la 4.6, las partidas de localStorage se copian a IndexedDB y solo se borran
// de localStorage cuando la copia está confirmada.

import type { Edits } from './world';

const DB_NAME = 'maxycraft';
const DB_VERSION = 1;
const STORE = 'partidas';
/** Si se cierra la pestaña en mitad de una escritura, la última partida queda aquí y se recupera al volver. */
export const RESCUE_KEY = 'maxycraft.rescate';

/** Cambios del mundo empaquetados: cada cambio en 4 bytes (posición dentro del chunk << 16 | bloque). */
export type PackedEdits = Record<string, Uint32Array>;

/** Empaqueta los cambios del jugador: unas 3 veces menos que en texto. */
export function packEdits(edits: Edits): PackedEdits {
  const out: PackedEdits = {};
  for (const [k, list] of Object.entries(edits)) {
    const entries = Object.entries(list);
    const arr = new Uint32Array(entries.length);
    entries.forEach(([i, b], n) => (arr[n] = ((Number(i) << 16) | (b & 0xffff)) >>> 0));
    out[k] = arr;
  }
  return out;
}

export function unpackEdits(packed: PackedEdits): Edits {
  const out: Edits = {};
  for (const [k, arr] of Object.entries(packed)) {
    const list: Record<number, number> = {};
    for (const v of arr) list[v >>> 16] = v & 0xffff;
    out[k] = list;
  }
  return out;
}

/** Algo guardable que puede llevar cambios del mundo (una partida o una isla visitada). */
type WithEdits = { edits?: Edits | PackedEdits };

function isPacked(e: unknown): e is PackedEdits {
  if (!e || typeof e !== 'object') return false;
  const first = Object.values(e as object)[0];
  return first instanceof Uint32Array;
}

/** Lo que se manda a IndexedDB: igual, pero con los cambios del mundo empaquetados. */
function toStored<T extends WithEdits>(value: T): T {
  if (!value || typeof value !== 'object' || !value.edits || isPacked(value.edits)) return value;
  return { ...value, edits: packEdits(value.edits as Edits) };
}

function fromStored<T extends WithEdits>(value: T): T {
  if (!value || typeof value !== 'object' || !isPacked(value.edits)) return value;
  return { ...value, edits: unpackEdits(value.edits) };
}

// --- IndexedDB, con promesas ---

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Escritura cancelada'));
  });
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = factory.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Base de datos bloqueada'));
  });
}

// --- El almacén ---

let db: IDBDatabase | null = null;
const cache = new Map<string, unknown>();
/** Escrituras en curso, en orden: se esperan antes de recargar la página. */
let queue: Promise<void> = Promise.resolve();
let writeFailed = false;
/** Sube al cerrar el almacén: los errores de escrituras de antes ya no cuentan. */
let generation = 0;
/** Se llama si IndexedDB deja de aceptar escrituras (sin espacio, por ejemplo). */
let onWriteError: ((e: unknown) => void) | null = null;

/** Si las partidas van ya en IndexedDB. Sin abrir (o sin IndexedDB) se usa localStorage, como antes de la 4.6. */
export function usingDatabase(): boolean {
  return db !== null;
}

/** Último error al escribir, para avisar al jugador. */
export function storeFailed(): boolean {
  return writeFailed;
}

export function onStoreError(fn: (e: unknown) => void) {
  onWriteError = fn;
}

/**
 * Abre IndexedDB, carga todo en memoria y pasa allí las partidas que hubiera en localStorage.
 * `legacyKeys` son las claves de localStorage que hay que pasar (las de las ranuras de partida).
 * Si algo falla, el juego sigue con localStorage.
 */
export async function openStore(legacyKeys: string[], factory: IDBFactory | undefined = globalThis.indexedDB): Promise<boolean> {
  if (db) return true;
  if (!factory) return false;
  try {
    const opened = await openDb(factory);
    const tx = opened.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const [keys, values] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
    cache.clear();
    keys.forEach((k, i) => cache.set(String(k), fromStored(values[i] as WithEdits)));
    db = opened;
  } catch {
    db = null;
    return false;
  }
  await moveLegacy(legacyKeys);
  await recoverRescue();
  return true;
}

/** Cierra el almacén (para las pruebas). */
export function closeStore() {
  generation++;
  db?.close();
  db = null;
  cache.clear();
  queue = Promise.resolve();
  writeFailed = false;
}

function local(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Copia a IndexedDB lo que hubiera en localStorage y, cuando está confirmado, lo borra de allí. */
async function moveLegacy(keys: string[]) {
  const ls = local();
  if (!ls) return;
  for (const key of keys) {
    let raw: string | null = null;
    try {
      raw = ls.getItem(key);
    } catch {
      continue;
    }
    if (!raw) continue;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      continue;
    }
    // Si ya hay una partida más nueva en IndexedDB no se pisa.
    const have = cache.get(key) as { savedAt?: number } | undefined;
    const old = value as { savedAt?: number };
    if (have && (have.savedAt ?? 0) >= (old.savedAt ?? 0)) {
      ls.removeItem(key);
      continue;
    }
    try {
      put(key, value);
      await flushStore();
      ls.removeItem(key);
    } catch {
      // Se queda en localStorage; se intentará la próxima vez.
    }
  }
}

/** Partida guardada a toda prisa al cerrar la pestaña: si es más nueva que la de IndexedDB, se usa. */
async function recoverRescue() {
  const ls = local();
  if (!ls) return;
  let rescue: { key: string; data: { savedAt?: number } } | null = null;
  try {
    rescue = JSON.parse(ls.getItem(RESCUE_KEY) ?? 'null');
  } catch {
    rescue = null;
  }
  if (!rescue || typeof rescue.key !== 'string' || !rescue.data) {
    ls.removeItem(RESCUE_KEY);
    return;
  }
  const have = cache.get(rescue.key) as { savedAt?: number } | undefined;
  if (!have || (rescue.data.savedAt ?? 0) > (have.savedAt ?? 0)) {
    put(rescue.key, rescue.data);
    try {
      await flushStore();
    } catch {
      return; // se vuelve a intentar al abrir otra vez
    }
  }
  ls.removeItem(RESCUE_KEY);
}

/** Lo guardado con esa clave (una copia: se puede cambiar sin tocar lo guardado). */
export function get<T>(key: string): T | null {
  const v = cache.get(key);
  return v === undefined ? null : (structuredClone(v) as T);
}

/** Claves guardadas que empiezan por `prefix`. */
export function keys(prefix = ''): string[] {
  return [...cache.keys()].filter((k) => k.startsWith(prefix));
}

/** Guarda en memoria al momento y en IndexedDB en segundo plano. */
export function put(key: string, value: unknown) {
  cache.set(key, structuredClone(value));
  const stored = toStored(value as WithEdits);
  write((store) => store.put(stored, key));
}

export function remove(key: string) {
  cache.delete(key);
  write((store) => store.delete(key));
}

function write(op: (store: IDBObjectStore) => void) {
  const target = db;
  if (!target) return;
  const gen = generation;
  queue = queue.then(async () => {
    if (gen !== generation) return;
    const tx = target.transaction(STORE, 'readwrite');
    op(tx.objectStore(STORE));
    await done(tx);
    writeFailed = false;
  }).catch((e) => {
    if (gen !== generation) return;
    writeFailed = true;
    onWriteError?.(e);
  });
}

/** Espera a que terminen las escrituras pendientes (antes de recargar la página). Falla si alguna ha fallado. */
export async function flushStore(): Promise<void> {
  await queue;
  if (writeFailed) throw new Error('No se ha podido guardar');
}

/**
 * Al cerrar la pestaña no da tiempo a esperar a IndexedDB: la partida se deja también en localStorage
 * (si cabe) y se recupera al volver si resulta ser más nueva.
 */
export function rescue(key: string, data: unknown) {
  try {
    local()?.setItem(RESCUE_KEY, JSON.stringify({ key, data }));
  } catch {
    // No cabe: queda la última escritura en IndexedDB, de hace unos segundos.
  }
}

/** Espacio usado y disponible en el navegador, en bytes (si el navegador lo dice). */
export async function storageUsage(): Promise<{ used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || e.usage === undefined || e.quota === undefined) return null;
    return { used: e.usage, quota: e.quota };
  } catch {
    return null;
  }
}

/** Pide al navegador que no borre las partidas cuando le falte espacio. */
export async function askPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Tamaño legible: "3,2 MB". */
export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toLocaleString('es', { maximumFractionDigits: 1 })} MB`;
  return `${(n / (1024 * 1024 * 1024)).toLocaleString('es', { maximumFractionDigits: 1 })} GB`;
}
