import { Block } from './blocks';

export type CropId = 'trigo' | 'zanahoria' | 'tomate';

export interface CropDef {
  id: CropId;
  seed: string;
  produce: string;
  /** Bloque de cada fase: brote, joven, alto y maduro. */
  stages: [Block, Block, Block, Block];
  /** Cuánto se cosecha cuando está maduro. */
  yield: number;
}

export const CROPS: Record<CropId, CropDef> = {
  trigo: { id: 'trigo', seed: 'semillas_trigo', produce: 'trigo', stages: [Block.Wheat0, Block.Wheat1, Block.Wheat2, Block.Wheat3], yield: 3 },
  zanahoria: { id: 'zanahoria', seed: 'semillas_zanahoria', produce: 'zanahoria', stages: [Block.Carrot0, Block.Carrot1, Block.Carrot2, Block.Carrot3], yield: 2 },
  tomate: { id: 'tomate', seed: 'semillas_tomate', produce: 'tomate', stages: [Block.Tomato0, Block.Tomato1, Block.Tomato2, Block.Tomato3], yield: 2 },
};

/** Días regados que necesita una planta para madurar. */
export const RIPE_STAGE = 3;

export function cropForSeed(seed: string): CropDef | null {
  return Object.values(CROPS).find((c) => c.seed === seed) ?? null;
}

/** Qué cultivo es un bloque y en qué fase está, o null si no es un cultivo. */
export function cropOfBlock(b: number): { crop: CropDef; stage: number } | null {
  for (const crop of Object.values(CROPS)) {
    const stage = crop.stages.indexOf(b as Block);
    if (stage >= 0) return { crop, stage };
  }
  return null;
}

export function isFarmland(b: number): boolean {
  return b === Block.Farmland || b === Block.FarmlandWet;
}

export interface CropState {
  crop: CropId;
  /** Días (AAAA-MM-DD) en que se regó. */
  watered: string[];
}

/** Cultivos guardados: "x,y,z" del bloque de la planta → su estado. */
export type FarmSave = Record<string, CropState>;

/** Lo mínimo del mundo que necesita el huerto, para poder probarlo sin dibujar nada. */
export interface FarmWorld {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, b: Block): void;
}

export interface Harvest {
  produce: string | null;
  count: number;
  /** Semillas que se devuelven. */
  seeds: number;
  seed: string;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/**
 * El huerto: cada planta crece una fase por cada día que se riega (cuenta al día siguiente),
 * como en Stardew Valley. La lluvia riega sola.
 */
export class Farm {
  readonly crops = new Map<string, CropState>();

  constructor(save: FarmSave = {}) {
    for (const [k, s] of Object.entries(save)) {
      if (s && s.crop in CROPS && Array.isArray(s.watered)) this.crops.set(k, { crop: s.crop, watered: [...s.watered] });
    }
  }

  has(x: number, y: number, z: number): boolean {
    return this.crops.has(key(x, y, z));
  }

  plant(x: number, y: number, z: number, crop: CropId) {
    this.crops.set(key(x, y, z), { crop, watered: [] });
  }

  /** Riega una planta. Devuelve false si no hay planta o ya estaba regada hoy. */
  water(x: number, y: number, z: number, today: string): boolean {
    const s = this.crops.get(key(x, y, z));
    if (!s || s.watered.includes(today)) return false;
    s.watered.push(today);
    return true;
  }

  /** Riega las plantas que cumplan `where` (el huerto que se riega solo, v4.14). Devuelve si ha cambiado algo. */
  waterWhere(today: string, where: (x: number, y: number, z: number) => boolean): boolean {
    let changed = false;
    for (const [k, s] of this.crops) {
      if (s.watered.includes(today) || !where(...(k.split(',').map(Number) as [number, number, number]))) continue;
      s.watered.push(today);
      changed = true;
    }
    return changed;
  }

  /** Lleva las plantas a otro sitio (al mudar una parcela, v4.14). */
  relocate(to: (x: number, y: number, z: number) => [number, number, number] | null) {
    const moved: [string, CropState][] = [];
    for (const [k, s] of this.crops) {
      const dest = to(...(k.split(',').map(Number) as [number, number, number]));
      if (!dest) continue;
      this.crops.delete(k);
      moved.push([key(...dest), s]);
    }
    for (const [k, s] of moved) this.crops.set(k, s);
  }

  /** La lluvia riega todo el huerto. Devuelve si ha cambiado algo. */
  waterAll(today: string): boolean {
    let changed = false;
    for (const s of this.crops.values()) {
      if (s.watered.includes(today)) continue;
      s.watered.push(today);
      changed = true;
    }
    return changed;
  }

  /** Fase de 0 (brote) a 3 (maduro): un paso por cada día regado antes de hoy. */
  stageOf(s: CropState, today: string): number {
    return Math.min(RIPE_STAGE, s.watered.filter((d) => d < today).length);
  }

  /** Quita la planta y dice qué se recoge: la cosecha si estaba madura o la semilla si no. */
  harvest(x: number, y: number, z: number, today: string): Harvest | null {
    const k = key(x, y, z);
    const s = this.crops.get(k);
    if (!s) return null;
    this.crops.delete(k);
    const crop = CROPS[s.crop];
    if (this.stageOf(s, today) >= RIPE_STAGE) return { produce: crop.produce, count: crop.yield, seeds: 1, seed: crop.seed };
    return { produce: null, count: 0, seeds: 1, seed: crop.seed };
  }

  /** Pone en el mundo la fase de cada planta y la tierra mojada o seca. Olvida las plantas que ya no están. */
  sync(world: FarmWorld, today: string) {
    for (const [k, s] of this.crops) {
      const [x, y, z] = k.split(',').map(Number);
      const here = world.getBlock(x, y, z);
      const crop = CROPS[s.crop];
      if (!crop.stages.includes(here as Block) || !isFarmland(world.getBlock(x, y - 1, z))) {
        this.crops.delete(k);
        continue;
      }
      const want = crop.stages[this.stageOf(s, today)];
      if (here !== want) world.setBlock(x, y, z, want);
      const soil = s.watered.includes(today) ? Block.FarmlandWet : Block.Farmland;
      if (world.getBlock(x, y - 1, z) !== soil) world.setBlock(x, y - 1, z, soil);
    }
  }

  serialize(): FarmSave {
    const out: FarmSave = {};
    // Basta con recordar los últimos días regados.
    for (const [k, s] of this.crops) out[k] = { crop: s.crop, watered: [...s.watered].sort().slice(-RIPE_STAGE - 1) };
    return out;
  }
}
