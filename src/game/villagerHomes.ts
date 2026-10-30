// Muebles dentro y fuera de las casas de los vecinos (v4.11 la cama, v4.12 los regalos y el jardín).
import type * as THREE from 'three';
import { Block, ROOFS } from '../blocks';
import { type DecorPiece, gardenPieces, homeSlots, houseLevel } from '../decor';
import { Furniture, type LightHook, type PlacedFurniture } from '../furniture';
import type { Villager } from '../villagers';
import { HOUSE_FIXTURES, HOUSE_HALF, isBigHouse, recoloredRoof } from '../villagerHouse';
import type { World } from '../world';

/** Si el vecino tiene casa propia que se pueda decorar (no la dependienta, la conservadora ni quien está de visita). */
export function hasDecorableHome(v: Villager): boolean {
  return v.home.kind === 'house' && !v.profile.role && !v.visitor;
}

export class VillagerHomes {
  readonly furniture: Furniture;
  /** De quién es cada mueble colocado. */
  private owners = new Map<PlacedFurniture, { v: Villager; piece: DecorPiece | null }>();

  constructor(private world: World, private villagers: Villager[], lampHook: LightHook) {
    this.furniture = new Furniture([], lampHook);
    this.refresh();
  }

  /** Huecos de la casa del vecino según su nivel. */
  slots(v: Villager) {
    return homeSlots(this.world, v.home.door, houseLevel(v.memory.friendship), isBigHouse(v.home));
  }

  /** Vuelve a colocar todos los muebles (hay pocos vecinos y cambia muy de vez en cuando). */
  refresh() {
    this.furniture.clear();
    this.owners.clear();
    for (const v of this.villagers) {
      if (!hasDecorableHome(v)) continue;
      const add = (id: string, [x, y, z]: [number, number, number], rot: number, piece: DecorPiece | null) => {
        this.furniture.place(id, x, y, z, rot);
        const placed = this.furniture.at(x, y, z);
        if (placed) this.owners.set(placed, { v, piece });
      };
      const [bx, by, bz] = v.bedCell;
      const big = isBigHouse(v.home);
      if (bx !== v.insideCell[0] || bz !== v.insideCell[2]) add('cama', [bx, by, bz], big ? 0 : 2, null);
      // v5.2: la casa grande viene amueblada (cocina, mesa, sillas, estantería…); los regalos van en los huecos libres.
      if (big) for (const [id, x, z, rot] of HOUSE_FIXTURES) add(id, [v.home.x + x, v.home.y + 1, v.home.z + z], rot, null);
      const slots = this.slots(v);
      for (const piece of v.memory.decor ?? []) {
        const slot = slots[piece.slot];
        if (slot) add(piece.id, slot.cell, piece.rot, piece);
      }
      for (const g of gardenPieces(this.world, v.home.door, houseLevel(v.memory.friendship))) add(g.id, g.cell, 0, null);
    }
  }

  /** El mueble de un vecino al que apunta la mira. */
  pick(ray: THREE.Ray, maxDist: number) {
    const hit = this.furniture.pick(ray, maxDist);
    if (!hit) return null;
    const owner = this.owners.get(hit.furniture);
    return owner ? { ...hit, ...owner } : null;
  }

  /** Cambia el color del tejado de su casa (casa grande). `put` hace que llegue a los demás jugadores. */
  recolorRoof(v: Villager, roof: number, put: (x: number, y: number, z: number, b: Block) => void) {
    const p = v.home;
    if (p.guest) return;
    const target = ROOFS[roof];
    if (isBigHouse(p)) {
      // El tejado a dos aguas: escaleras, losas y bloques de teja, cada uno en su sitio.
      const r = HOUSE_HALF + 1;
      for (let dy = 3; dy <= 9; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            const [x, y, z] = [p.x + dx, p.y + dy, p.z + dz];
            const b = recoloredRoof(this.world.getBlock(x, y, z), roof);
            if (b !== null) put(x, y, z, b);
          }
        }
      }
      p.roof = target;
      return;
    }
    for (let layer = 0; layer < 3; layer++) {
      const r = 3 - layer;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const [x, y, z] = [p.x + dx, p.y + 4 + layer, p.z + dz];
          const b = this.world.getBlock(x, y, z);
          if ((ROOFS as readonly Block[]).includes(b) && b !== target) put(x, y, z, target);
        }
      }
    }
    p.roof = target;
  }
}
