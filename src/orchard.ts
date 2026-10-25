import { Block, isSolid } from './blocks';
import { type TreeBlock, fruitTreeShape, palmShape } from './trees';

/** Días de juego que tarda un brote en hacerse árbol. */
export const GROW_DAYS = 2;

export interface TreeKind {
  /** Id del brote en los bolsillos. */
  sapling: string;
  name: string;
  /** Fruta que da; la palmera da cocos. */
  fruit: Block;
  block: Block.Sapling | Block.PalmSapling;
}

/** Cada tipo de árbol, con su brote para replantarlo. */
export const TREE_KINDS: TreeKind[] = [
  { sapling: 'brote_manzano', name: 'Brote de manzano', fruit: Block.Apple, block: Block.Sapling },
  { sapling: 'brote_naranjo', name: 'Brote de naranjo', fruit: Block.Orange, block: Block.Sapling },
  { sapling: 'brote_peral', name: 'Brote de peral', fruit: Block.Pear, block: Block.Sapling },
  { sapling: 'brote_melocotonero', name: 'Brote de melocotonero', fruit: Block.Peach, block: Block.Sapling },
  { sapling: 'brote_cerezo', name: 'Brote de cerezo', fruit: Block.Cherry, block: Block.Sapling },
  { sapling: 'brote_palmera', name: 'Brote de palmera', fruit: Block.Coconut, block: Block.PalmSapling },
];

export function treeKindOfSapling(id: string): TreeKind | undefined {
  return TREE_KINDS.find((k) => k.sapling === id);
}

export function treeKindOfFruit(fruit: number): TreeKind | undefined {
  return TREE_KINDS.find((k) => k.fruit === fruit);
}

export function isSapling(b: number): boolean {
  return b === Block.Sapling || b === Block.PalmSapling;
}

/** Suelo donde se puede plantar un brote. */
export function canPlantOn(b: number): boolean {
  return b === Block.Grass || b === Block.Dirt || b === Block.Sand;
}

export interface PlantedTree {
  x: number;
  y: number;
  z: number;
  sapling: string;
  /** Días de juego que lleva plantado. */
  age: number;
  /** Último día que se contó. */
  seen: string;
  grown: boolean;
}

export interface OrchardWorld {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, b: Block): void;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Árboles plantados por el jugador: brotes que crecen y árboles cuya fruta vuelve a salir. */
export class Orchard {
  private trees = new Map<string, PlantedTree>();

  constructor(saved: PlantedTree[] = []) {
    for (const t of saved) if (treeKindOfSapling(t.sapling) && [t.x, t.y, t.z, t.age].every(Number.isFinite)) this.trees.set(key(t.x, t.y, t.z), { ...t });
  }

  get list(): PlantedTree[] {
    return [...this.trees.values()];
  }

  plant(x: number, y: number, z: number, sapling: string, day: string) {
    this.trees.set(key(x, y, z), { x, y, z, sapling, age: 0, seen: day, grown: false });
  }

  at(x: number, y: number, z: number): PlantedTree | undefined {
    return this.trees.get(key(x, y, z));
  }

  remove(x: number, y: number, z: number): PlantedTree | undefined {
    const t = this.trees.get(key(x, y, z));
    this.trees.delete(key(x, y, z));
    return t;
  }

  /** Bloques del árbol en que se convierte un brote. */
  shape(t: PlantedTree): TreeBlock[] {
    const kind = treeKindOfSapling(t.sapling)!;
    return kind.block === Block.PalmSapling ? palmShape() : fruitTreeShape(kind.fruit, ((t.x * 7 + t.z * 13) % 5 + 5) % 5 / 5);
  }

  /** Si (x, y, z) es el sitio de una fruta de un árbol plantado, qué fruta es. */
  fruitAt(x: number, y: number, z: number): Block | null {
    for (const t of this.trees.values()) {
      if (!t.grown || Math.abs(t.x - x) > 2 || Math.abs(t.z - z) > 2) continue;
      for (const [dx, dy, dz, b] of this.shape(t)) {
        if (t.x + dx === x && t.y + dy === y && t.z + dz === z && b === treeKindOfSapling(t.sapling)!.fruit) return b;
      }
    }
    return null;
  }

  /** Árbol plantado (ya crecido) cuyo tronco empieza en (x, y, z). */
  grownAt(x: number, y: number, z: number): PlantedTree | undefined {
    const t = this.at(x, y, z);
    return t?.grown ? t : undefined;
  }

  /**
   * Cuenta un día nuevo y hace crecer los brotes que ya tienen edad. Si el brote ha desaparecido
   * (lo han roto o tapado), se olvida. Devuelve cuántos árboles han crecido.
   */
  sync(world: OrchardWorld, day: string): number {
    let grew = 0;
    for (const [k, t] of this.trees) {
      if (t.grown) continue;
      const here = world.getBlock(t.x, t.y, t.z);
      if (!isSapling(here)) {
        this.trees.delete(k);
        continue;
      }
      if (t.seen !== day) {
        t.seen = day;
        t.age++;
      }
      if (t.age < GROW_DAYS) continue;
      const shape = this.shape(t);
      // Hace falta sitio: nada sólido donde irían el tronco y la copa.
      const blocked = shape.some(([dx, dy, dz]) => (dx || dy || dz) && isSolid(world.getBlock(t.x + dx, t.y + dy, t.z + dz)));
      if (blocked) continue;
      for (const [dx, dy, dz, b, replace] of shape) {
        const [x, y, z] = [t.x + dx, t.y + dy, t.z + dz];
        const cur = world.getBlock(x, y, z);
        if (replace || cur === Block.Air || (!isSolid(cur) && !isSapling(cur))) world.setBlock(x, y, z, b);
      }
      t.grown = true;
      grew++;
    }
    return grew;
  }

  serialize(): PlantedTree[] {
    return this.list.map((t) => ({ ...t }));
  }
}
