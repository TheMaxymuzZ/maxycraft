import { Block } from './blocks';

interface BlockSource {
  getBlock(x: number, y: number, z: number): number;
}

/** Tronco de árbol frutal más cercano, para saber qué árbol se ha sacudido. */
export function findTrunk(world: BlockSource, x: number, y: number, z: number) {
  for (let r = 0; r <= 3; r++) {
    for (let dy = -6; dy <= 2; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (world.getBlock(x + dx, y + dy, z + dz) !== Block.Log) continue;
          // Bajar hasta la base del tronco para que todo el árbol cuente como uno.
          let by = y + dy;
          while (world.getBlock(x + dx, by - 1, z + dz) === Block.Log) by--;
          return { x: x + dx, y: by, z: z + dz, key: `${x + dx},${z + dz}` };
        }
      }
    }
  }
  return null;
}

/** Un bloque de un árbol, relativo a la base del tronco: [dx, dy, dz, bloque, sustituye lo que haya]. */
export type TreeBlock = [number, number, number, Block, boolean];

/** Sitios bajo la copa donde cuelga la fruta. */
const FRUIT_SPOTS = [[-1, -2], [2, 0], [0, 2], [-2, 1], [1, -1]];

/** Árbol frutal: tronco de 4, copa redonda y tres frutas colgando. `start` elige dónde van las frutas (0 a 1). */
export function fruitTreeShape(fruit: Block, start: number): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = 4;
  for (let y = top - 2; y <= top + 1; y++) {
    const r = y >= top ? 1 : 2;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        out.push([dx, y, dz, Block.Leaves, false]);
      }
    }
  }
  const first = Math.floor(start * FRUIT_SPOTS.length);
  for (let i = 0; i < 3; i++) {
    const [dx, dz] = FRUIT_SPOTS[(first + i) % FRUIT_SPOTS.length];
    out.push([dx, top - 3, dz, fruit, false]);
  }
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

/** Palmera: tronco de 5, hojas en cruz y dos cocos. */
export function palmShape(): TreeBlock[] {
  const top = 5;
  const out: TreeBlock[] = [];
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.PalmLog, true]);
  out.push([0, top, 0, Block.PalmLeaves, true]);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    out.push([dx, top, dz, Block.PalmLeaves, false]);
    out.push([dx * 2, top - 1, dz * 2, Block.PalmLeaves, false]);
  }
  out.push([1, top - 1, 1, Block.Coconut, false]);
  out.push([-1, top - 1, 0, Block.Coconut, false]);
  return out;
}

/** Pino: tronco de 6 y copa en cono, más estrecha arriba. No da fruta. */
export function pineShape(): TreeBlock[] {
  const out: TreeBlock[] = [];
  const top = 6;
  // Por capas: [altura, alcance de las hojas medido en pasos].
  for (const [y, reach] of [[2, 3], [3, 2], [4, 2], [5, 1], [6, 1], [7, 0]]) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > reach || (y < top && !dx && !dz)) continue;
        out.push([dx, y, dz, Block.PineLeaves, false]);
      }
    }
  }
  for (let y = 0; y < top; y++) out.push([0, y, 0, Block.Log, true]);
  return out;
}

const LOGS: ReadonlySet<number> = new Set([Block.Log, Block.PalmLog]);
const CROWN: ReadonlySet<number> = new Set([Block.Leaves, Block.PalmLeaves, Block.PineLeaves, Block.Coconut, Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry]);
const FRUIT_BLOCKS: ReadonlySet<number> = new Set([Block.Coconut, Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry]);

export interface Felled {
  /** Troncos por encima del que se ha roto (incluido). */
  logs: [number, number, number, number][];
  leaves: [number, number, number, number][];
  fruits: [number, number, number, number][];
}

/**
 * Lo que cae al talar un árbol desde el tronco (x, y, z): los troncos de ese bloque hacia arriba
 * y la copa que cuelga de ellos. Lo de debajo (el tocón) se queda. Las hojas de un árbol vecino
 * que estén más cerca de otro tronco no se tocan.
 */
export function fellTree(world: BlockSource, x: number, y: number, z: number): Felled {
  const out: Felled = { logs: [], leaves: [], fruits: [] };
  const start = world.getBlock(x, y, z);
  if (!LOGS.has(start)) return out;
  const seen = new Set<string>();
  const k = (a: number, b: number, c: number) => `${a},${b},${c}`;

  // Troncos conectados, sin bajar del bloque roto.
  const stack: [number, number, number][] = [[x, y, z]];
  seen.add(k(x, y, z));
  while (stack.length && out.logs.length < 64) {
    const [cx, cy, cz] = stack.pop()!;
    out.logs.push([cx, cy, cz, world.getBlock(cx, cy, cz)]);
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
      const [nx, ny, nz] = [cx + dx, cy + dy, cz + dz];
      if (ny < y || seen.has(k(nx, ny, nz)) || !LOGS.has(world.getBlock(nx, ny, nz))) continue;
      seen.add(k(nx, ny, nz));
      stack.push([nx, ny, nz]);
    }
  }
  const ours = new Set(out.logs.map(([a, b, c]) => k(a, b, c)));

  // ¿Hay otro tronco (que no cae) más cerca de este bloque de copa que los nuestros?
  const closerToOther = (lx: number, ly: number, lz: number, mine: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -mine + 1; dz < mine; dz++) {
        for (let dx = -mine + 1; dx < mine; dx++) {
          if (Math.abs(dx) + Math.abs(dz) >= mine) continue;
          const [ox, oy, oz] = [lx + dx, ly + dy, lz + dz];
          if (!ours.has(k(ox, oy, oz)) && LOGS.has(world.getBlock(ox, oy, oz))) return true;
        }
      }
    }
    return false;
  };

  // La copa: bloques de hoja o fruta a poca distancia de nuestros troncos.
  for (const [lx, ly, lz] of out.logs) {
    for (let dy = -2; dy <= 3; dy++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          const [cx, cy, cz] = [lx + dx, ly + dy, lz + dz];
          if (cy < y - 1 || seen.has(k(cx, cy, cz))) continue;
          const b = world.getBlock(cx, cy, cz);
          if (!CROWN.has(b)) continue;
          const mine = Math.abs(dx) + Math.abs(dz);
          if (closerToOther(cx, cy, cz, mine)) continue;
          seen.add(k(cx, cy, cz));
          (FRUIT_BLOCKS.has(b) ? out.fruits : out.leaves).push([cx, cy, cz, b]);
        }
      }
    }
  }
  return out;
}
