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
