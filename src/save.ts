import type { Parcel } from './parcels';
import type { TerminalSite } from './terminal';
import type { TownSave } from './townhall';
import type { EconomySave } from './economy';
import type { ClockSave } from './clock';
import type { PlantedTree } from './orchard';
import type { StorageSave } from './storage';
import type { AnimalSave } from './animals';
import type { FarmSave } from './farm';
import type { Lot } from './lots';
import type { MissionsSave } from './missions';
import type { PlacedFurniture } from './furniture';
import type { ItemStack } from './items';
import type { StepId } from './tutorial';
import type { Guest, VillagerMemory } from './villagers';
import type { Edits } from './world';
import type { VitalsSave } from './vitals';
import type { PlayerHome } from './homes';
import * as store from './store';

/** La primera isla usa la clave de siempre, para que las partidas de antes sigan ahí. */
const KEY = 'maxycraft.isla.v1';
const ACTIVE_KEY = 'maxycraft.isla.activa';
/** Cuántas islas se pueden tener guardadas a la vez. */
export const SLOTS = 3;

/**
 * Versión del formato de la partida guardada. Al subirla hay que añadir su paso en MIGRATIONS
 * y una prueba que cargue una partida de antes (tests/v45.test.ts).
 */
export const SAVE_VERSION = 2;

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Desde la v4.5: versión del juego que guardó la partida (solo informativo). */
  game?: string;
  seed: number;
  /** Desde la v2.6: versión del terreno (sin ella, el de siempre). */
  terrain?: number;
  edits: Edits;
  player: { x: number; y: number; z: number; yaw: number; pitch: number } | null;
  /** Desde la v0.3. */
  inventory?: (ItemStack | null)[];
  /** Lo que llevas en la otra mano. */
  offhand?: ItemStack | null;
  /** Cuándo se cogió cada fruta ("x,y,z" → milisegundos), para que vuelva a crecer. */
  harvested?: Record<string, number>;
  /** Día (AAAA-MM-DD) y conchas de ese día ya recogidas. */
  shells?: { day: string; taken: number[] };
  /** Día y árboles que ya han soltado su rama ese día. */
  branches?: { day: string; trees: string[] };
  /** Desde la v0.4: amistad y último día de charla y regalo de cada vecino. */
  villagers?: Record<string, VillagerMemory>;
  /** Desde la v0.5: bayas ahorradas. */
  wallet?: number;
  /** Existencias del día, precios y cuentas (v4.9). */
  economy?: EconomySave;
  /** Desde la v0.6: peces e insectos vistos y donados al museo. */
  caught?: string[];
  donated?: string[];
  /** Desde la v2.7: vecinos con los que has hablado (álbum de vecinos). */
  met?: string[];
  /** Desde la v4.0: lo que te ha contado cada vecino de sí mismo (álbum de vecinos). */
  learned?: Record<string, number>;
  /** Desde la v4.3: casas de los amigos que han jugado en tu isla. */
  homes?: PlayerHome[];
  /** Desde la v4.1: vida y hambre. */
  vitals?: VitalsSave;
  /** Desde la v0.8: la casa del jugador (nivel, deuda y tejado) y sus muebles. */
  home?: { level: number; debt: number; roof: number };
  /** Desde la v4.13: el ayuntamiento, sus obras y el nombre de la isla. */
  town?: TownSave;
  /** Desde la v4.14: las parcelas (la tuya y las de tus amigos). La casa de antes pasa a ser tu parcela. */
  parcels?: Parcel[];
  /** Último día en que se leyó la carta del buzón de la parcela. */
  mail?: string;
  /** Desde la v4.16: dónde está la terminal de la avioneta (se construye una vez). */
  terminal?: TerminalSite;
  furniture?: PlacedFurniture[];
  /** Desde la v0.9: recetas aprendidas para la mesa de trabajo y la botella del día. */
  recipes?: string[];
  bottle?: { day: string; taken: boolean };
  /** Desde la v1.0: pasos del tutorial hechos y si ya se terminó. */
  tutorial?: StepId[];
  tutorialDone?: boolean;
  /** Desde la v1.3: cuándo se guardó por última vez (milisegundos). */
  savedAt?: number;
  /** Desde la v1.8: el huerto (cultivos y días regados) y los animales de la granja. */
  farm?: FarmSave;
  /** Desde la v2.2: árboles plantados con brotes. */
  orchard?: PlantedTree[];
  /** Desde la v2.4: el reloj de la isla (día de juego y minuto). */
  clock?: ClockSave;
  /** Desde la v2.4: lo guardado en cofres, baúles y cajas. */
  storage?: StorageSave;
  animals?: AnimalSave[];
  /** Desde la v1.9: vecinos invitados desde las islas misteriosas. */
  guests?: Guest[];
  /** Desde la v2.10: casas que construye el jugador para vecinos nuevos. */
  lots?: Lot[];
  /** Desde la v1.10: tareas del día, puntos y logros. */
  missions?: MissionsSave;
}

export function slotKey(slot: number): string {
  return slot === 0 ? KEY : `${KEY}.${slot + 1}`;
}

// El navegador puede negar el almacenamiento (modo privado, cookies bloqueadas):
// en ese caso se juega igual, solo que sin guardar.

/** La isla que se está jugando (0, 1 o 2). */
export function activeSlot(): number {
  try {
    const n = Number(localStorage.getItem(ACTIVE_KEY));
    return Number.isInteger(n) && n >= 0 && n < SLOTS ? n : 0;
  } catch {
    return 0;
  }
}

export function setActiveSlot(slot: number) {
  try {
    localStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {
    // sin almacenamiento solo hay una isla
  }
}

export function loadGame(slot = activeSlot()): SaveData | null {
  // Desde la v4.6, en IndexedDB (si el navegador la tiene); si no, en localStorage como siempre.
  if (store.usingDatabase()) return checkSave(store.get(slotKey(slot)));
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    return checkSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(data: SaveData, slot = activeSlot()): boolean {
  if (store.usingDatabase()) {
    if (store.storeFailed()) return false;
    store.put(slotKey(slot), data);
    return true;
  }
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Al cerrar la pestaña: además de lo normal, una copia rápida por si IndexedDB no llega a terminar. */
export function saveGameNow(data: SaveData, slot = activeSlot()): boolean {
  const ok = saveGame(data, slot);
  if (store.usingDatabase()) store.rescue(slotKey(slot), data);
  return ok;
}

export function deleteGame(slot = activeSlot()) {
  if (store.usingDatabase()) {
    store.remove(slotKey(slot));
    for (const k of store.keys(visitedPrefix(slot))) store.remove(k);
    return;
  }
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    // nada que borrar
  }
}

/** Abre el almacén grande (IndexedDB) y pasa allí las partidas de antes. Sin él se sigue con localStorage. */
export function openSaves(): Promise<boolean> {
  const keys = Array.from({ length: SLOTS }, (_, i) => slotKey(i));
  return store.openStore(keys).then(async (ok) => {
    if (ok) void store.askPersistence();
    return ok;
  });
}

/** Espera a que lo guardado llegue al disco (antes de recargar la página). */
export async function flushSaves(): Promise<boolean> {
  try {
    await store.flushStore();
    return true;
  } catch {
    return false;
  }
}

// --- Islas del archipiélago (v4.6) ---
// Cada isla que visitas se guarda aparte, colgando de su partida, y solo se carga cuando vas.

export interface VisitedIsland {
  /** Nombre fijo de la isla dentro de la partida (por ejemplo "islote-1" o "recursos-48213"). */
  id: string;
  name: string;
  /** Qué tipo de isla es: islote, misteriosa, recursos, aldea... */
  kind: string;
  seed: number;
  /** Lo que el jugador ha cambiado en ella. */
  edits: Edits;
  /** Última visita (milisegundos). */
  visitedAt: number;
  /** Lo demás que necesite cada tipo de isla. */
  extra?: Record<string, unknown>;
}

const visitedPrefix = (slot: number) => `${slotKey(slot)}/isla/`;

export function saveVisited(island: VisitedIsland, slot = activeSlot()): boolean {
  if (!store.usingDatabase()) return false;
  store.put(visitedPrefix(slot) + island.id, island);
  return true;
}

export function loadVisited(id: string, slot = activeSlot()): VisitedIsland | null {
  return store.usingDatabase() ? store.get<VisitedIsland>(visitedPrefix(slot) + id) : null;
}

/** Ids de las islas visitadas de una partida. */
export function listVisited(slot = activeSlot()): string[] {
  if (!store.usingDatabase()) return [];
  const prefix = visitedPrefix(slot);
  return store.keys(prefix).map((k) => k.slice(prefix.length));
}

export function deleteVisited(id: string, slot = activeSlot()) {
  if (store.usingDatabase()) store.remove(visitedPrefix(slot) + id);
}

type RawSave = Record<string, unknown>;

/**
 * Pasos para poner al día una partida vieja: MIGRATIONS[n] la pasa del formato n al n + 1.
 * Cada paso cambia la partida en el sitio. Nunca se borra un paso: hay partidas de todas las épocas.
 */
const MIGRATIONS: Record<number, (d: RawSave) => void> = {
  // v4.5: los bloques del mundo pasan a 16 bits. Los números de bloque no cambian, así que no hay que convertir
  // nada; solo se apunta que la partida ya es del formato nuevo.
  1: () => {},
};

/** Pone al día una partida de cualquier formato anterior. Devuelve false si es de un formato que no se conoce. */
export function migrateSave(d: RawSave): boolean {
  let v = d.version;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > SAVE_VERSION) return false;
  while (v < SAVE_VERSION) {
    MIGRATIONS[v](d);
    v++;
  }
  d.version = SAVE_VERSION;
  return true;
}

/** Devuelve la partida (puesta al día) si tiene buena pinta, o null. */
export function checkSave(data: unknown): SaveData | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as RawSave;
  if (typeof d.seed !== 'number' || !Number.isFinite(d.seed)) return null;
  if (!d.edits || typeof d.edits !== 'object') return null;
  if (!migrateSave(d)) return null;
  return d as unknown as SaveData;
}

// --- Copias de seguridad en un archivo ---

interface BackupFile {
  juego: 'maxycraft';
  formato: 1;
  exportada: string;
  isla: SaveData;
  /** Desde la v4.6: las islas visitadas de esa partida. */
  visitas?: VisitedIsland[];
}

/** Copia de todo el archipiélago (v4.6): todas las partidas con sus islas visitadas. */
interface FullBackupFile {
  juego: 'maxycraft';
  formato: 2;
  exportada: string;
  partidas: ({ isla: SaveData; visitas: VisitedIsland[] } | null)[];
}

export function exportAll(now = new Date()): string {
  const partidas = Array.from({ length: SLOTS }, (_, slot) => {
    const isla = loadGame(slot);
    return isla ? { isla, visitas: listVisited(slot).flatMap((id) => loadVisited(id, slot) ?? []) } : null;
  });
  const file: FullBackupFile = { juego: 'maxycraft', formato: 2, exportada: now.toISOString(), partidas };
  return JSON.stringify(file);
}

/** Nombre del archivo de la copia de todo: maxycraft-todo-2026-10-26.json */
export function fullBackupName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `maxycraft-todo-${d}.json`;
}

/** Lee una copia de todo y sustituye todas las partidas. Lanza un error con un mensaje para el jugador. */
export function importAll(text: string): number {
  let parsed: Partial<FullBackupFile>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ese archivo no es una copia de Maxycraft.');
  }
  if (!parsed || parsed.juego !== 'maxycraft' || parsed.formato !== 2 || !Array.isArray(parsed.partidas)) {
    throw new Error('Esa no es una copia de todo. Para una sola isla usa "Cargar copia" en su hueco.');
  }
  const checked = parsed.partidas.slice(0, SLOTS).map((p) => {
    if (!p) return null;
    const isla = checkSave(p.isla);
    if (!isla) throw new Error('La copia está incompleta o es de una versión que no se puede leer.');
    return { isla, visitas: Array.isArray(p.visitas) ? p.visitas.filter(isVisited) : [] };
  });
  let count = 0;
  for (let slot = 0; slot < SLOTS; slot++) {
    deleteGame(slot);
    const p = checked[slot];
    if (!p) continue;
    saveGame(p.isla, slot);
    for (const v of p.visitas) saveVisited(v, slot);
    count++;
  }
  return count;
}

function isVisited(v: unknown): v is VisitedIsland {
  const o = v as Partial<VisitedIsland>;
  return !!o && typeof o.id === 'string' && typeof o.seed === 'number' && !!o.edits && typeof o.edits === 'object';
}

export function exportSave(data: SaveData, now = new Date()): string {
  const file: BackupFile = { juego: 'maxycraft', formato: 1, exportada: now.toISOString(), isla: data };
  return JSON.stringify(file);
}

/** Copia de una partida con sus islas visitadas. */
export function exportSlot(slot: number, now = new Date()): string | null {
  const data = loadGame(slot);
  if (!data) return null;
  const file: BackupFile = { juego: 'maxycraft', formato: 1, exportada: now.toISOString(), isla: data, visitas: listVisited(slot).flatMap((id) => loadVisited(id, slot) ?? []) };
  return JSON.stringify(file);
}

/** Nombre del archivo de la copia, con la fecha: maxycraft-isla-1-2026-10-25.json */
export function backupName(slot: number, now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `maxycraft-isla-${slot + 1}-${d}.json`;
}

/** Lee una copia de seguridad. Si algo va mal, lanza un error con un mensaje para el jugador. */
export function importSave(text: string): SaveData {
  return importSaveFile(text).isla;
}

/** Como importSave, pero también con las islas visitadas que traiga la copia (v4.6). */
export function importSaveFile(text: string): { isla: SaveData; visitas: VisitedIsland[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ese archivo no es una copia de Maxycraft.');
  }
  const file = parsed as Partial<BackupFile>;
  if ((parsed as Partial<FullBackupFile>)?.formato === 2) throw new Error('Esa es una copia de todas tus islas: cárgala con "Cargar copia de todo".');
  // También se aceptan partidas sueltas, sin el sobre de la copia.
  const isla = file && typeof file === 'object' && file.juego === 'maxycraft' ? file.isla : parsed;
  const save = checkSave(isla);
  if (!save) throw new Error('La copia está incompleta o es de una versión que no se puede leer.');
  const visitas = file && Array.isArray(file.visitas) ? file.visitas.filter(isVisited) : [];
  return { isla: save, visitas };
}
