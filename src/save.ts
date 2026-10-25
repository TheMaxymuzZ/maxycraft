import type { AnimalSave } from './animals';
import type { FarmSave } from './farm';
import type { PlacedFurniture } from './furniture';
import type { ItemStack } from './items';
import type { StepId } from './tutorial';
import type { Guest, VillagerMemory } from './villagers';
import type { Edits } from './world';

/** La primera isla usa la clave de siempre, para que las partidas de antes sigan ahí. */
const KEY = 'maxycraft.isla.v1';
const ACTIVE_KEY = 'maxycraft.isla.activa';
/** Cuántas islas se pueden tener guardadas a la vez. */
export const SLOTS = 3;

export interface SaveData {
  version: 1;
  seed: number;
  edits: Edits;
  player: { x: number; y: number; z: number; yaw: number; pitch: number } | null;
  /** Desde la v0.3. */
  inventory?: (ItemStack | null)[];
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
  /** Desde la v0.6: peces e insectos vistos y donados al museo. */
  caught?: string[];
  donated?: string[];
  /** Desde la v0.8: la casa del jugador (nivel, deuda y tejado) y sus muebles. */
  home?: { level: number; debt: number; roof: number };
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
  animals?: AnimalSave[];
  /** Desde la v1.9: vecinos invitados desde las islas misteriosas. */
  guests?: Guest[];
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
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    return checkSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(data: SaveData, slot = activeSlot()): boolean {
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function deleteGame(slot = activeSlot()) {
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    // nada que borrar
  }
}

/** Devuelve la partida si tiene buena pinta, o null. */
export function checkSave(data: unknown): SaveData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<SaveData>;
  if (d.version !== 1 || typeof d.seed !== 'number' || !Number.isFinite(d.seed)) return null;
  if (!d.edits || typeof d.edits !== 'object') return null;
  return d as SaveData;
}

// --- Copias de seguridad en un archivo ---

interface BackupFile {
  juego: 'maxycraft';
  formato: 1;
  exportada: string;
  isla: SaveData;
}

export function exportSave(data: SaveData, now = new Date()): string {
  const file: BackupFile = { juego: 'maxycraft', formato: 1, exportada: now.toISOString(), isla: data };
  return JSON.stringify(file);
}

/** Nombre del archivo de la copia, con la fecha: maxycraft-isla-1-2026-10-25.json */
export function backupName(slot: number, now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `maxycraft-isla-${slot + 1}-${d}.json`;
}

/** Lee una copia de seguridad. Si algo va mal, lanza un error con un mensaje para el jugador. */
export function importSave(text: string): SaveData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Ese archivo no es una copia de Maxycraft.');
  }
  const file = parsed as Partial<BackupFile>;
  // También se aceptan partidas sueltas, sin el sobre de la copia.
  const isla = file && typeof file === 'object' && file.juego === 'maxycraft' ? file.isla : parsed;
  const save = checkSave(isla);
  if (!save) throw new Error('La copia está incompleta o es de una versión que no se puede leer.');
  return save;
}
