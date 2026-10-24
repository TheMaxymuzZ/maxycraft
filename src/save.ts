import type { PlacedFurniture } from './furniture';
import type { ItemStack } from './items';
import type { VillagerMemory } from './villagers';
import type { Edits } from './world';

const KEY = 'maxycraft.isla.v1';

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
}

// El navegador puede negar el almacenamiento (modo privado, cookies bloqueadas):
// en ese caso se juega igual, solo que sin guardar.

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === 1 ? data : null;
  } catch {
    return null;
  }
}

export function saveGame(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function deleteGame() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que borrar
  }
}
