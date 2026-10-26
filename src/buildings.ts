// Plantillas de edificios (v4.8). El museo, la tienda, el ayuntamiento, el astillero y los comercios de las
// próximas versiones se describen como una plantilla: capas de bloques de abajo arriba (cada letra un bloque),
// la puerta, las habitaciones con nombre y los huecos para muebles, expositores, el mostrador y la cama del dueño.
// Una plantilla se puede girar y colocar en una isla nueva o, en una isla que ya existe, en un sitio libre
// sin romper nada de lo que ha construido el jugador.

import { BLOCKS, Block, isSolid, isStairs, isWater, stairsFacing } from './blocks';
import type { Cell } from './pathfind';
import { HEIGHT, SEA_LEVEL } from './world';

export type SlotKind = 'mueble' | 'expositor' | 'mostrador' | 'cama';

export interface TemplateSlot {
  kind: SlotKind;
  /** En coordenadas de la plantilla: x, capa, z. */
  at: Cell;
  /** Hacia dónde mira lo que se ponga (0..3, como las escaleras: 0 = hacia -z). */
  facing?: number;
}

export interface TemplateRoom {
  name: string;
  /** Capa del suelo de la habitación (la planta). */
  floor: number;
  /** Rectángulo [x0, z0, x1, z1], ambos bordes incluidos. */
  area: [number, number, number, number];
}

export interface BuildingTemplate {
  id: string;
  name: string;
  /**
   * Capas de abajo arriba. La capa 0 es el suelo (va a la altura del terreno). Cada capa es una lista de filas
   * (de -z a +z) y cada letra un bloque de `legend`. '.' es aire (se vacía) y ' ' deja lo que hubiera.
   */
  layers: string[][];
  legend: Record<string, Block>;
  /** Casilla de aire delante de la puerta, por fuera: por donde entran y salen los vecinos. */
  door: Cell;
  rooms: TemplateRoom[];
  slots: TemplateSlot[];
}

/** Un edificio ya colocado, todo en coordenadas del mundo. */
export interface PlacedBuilding {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  door: Cell;
  rooms: { name: string; y: number; area: [number, number, number, number] }[];
  slots: { kind: SlotKind; at: Cell; facing: number }[];
}

/** Lo que hace falta del mundo para colocar una plantilla. */
export interface BuildWorld {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, b: Block): void;
  heightAt(x: number, z: number): number;
  isEdited?(x: number, y: number, z: number): boolean;
  plotAt?(x: number, z: number, margin?: number): unknown;
}

/** Ancho (x) y fondo (z) de la plantilla sin girar. */
export function templateSize(t: BuildingTemplate): [number, number, number] {
  const d = t.layers[0].length;
  const w = Math.max(...t.layers.flatMap((l) => l.map((r) => r.length)));
  return [w, t.layers.length, d];
}

/** Gira (x, z) de la plantilla `rotation` cuartos de vuelta: -z pasa a +x, +x a +z… (como las escaleras). */
export function rotateCell(x: number, z: number, w: number, d: number, rotation: number): [number, number] {
  let [rx, rz, rw, rd] = [x, z, w, d];
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) {
    [rx, rz] = [rd - 1 - rz, rx];
    [rw, rd] = [rd, rw];
  }
  return [rx, rz];
}

/** Tamaño en el mundo una vez girada: [ancho x, fondo z]. */
export function footprint(t: BuildingTemplate, rotation: number): [number, number] {
  const [w, , d] = templateSize(t);
  return rotation % 2 ? [d, w] : [w, d];
}

/** Todas las casillas de la plantilla ya giradas: [x, capa, z, bloque o null para "dejar lo que haya"]. */
export function templateCells(t: BuildingTemplate, rotation: number): [number, number, number, Block | null][] {
  const [w, , d] = templateSize(t);
  const out: [number, number, number, Block | null][] = [];
  t.layers.forEach((layer, y) => {
    layer.forEach((row, z) => {
      for (let x = 0; x < w; x++) {
        const ch = row[x] ?? ' ';
        if (ch === ' ') continue;
        let b: Block = ch === '.' ? Block.Air : t.legend[ch];
        if (b === undefined) throw new Error(`Plantilla ${t.id}: la letra "${ch}" no está en la leyenda`);
        if (isStairs(b)) b = stairsFacing(b, (BLOCKS[b].facing ?? 0) + rotation);
        const [rx, rz] = rotateCell(x, z, w, d, rotation);
        out.push([rx, y, rz, b]);
      }
    });
  });
  return out;
}

/** Plantas y flores que se pueden quitar para construir. */
const soft = (b: number) => b === Block.Air || (BLOCKS[b]?.shape === 'cross');

/**
 * Si cabe con la esquina en (x, z) y el suelo a la altura y: terreno casi llano, nada de agua,
 * nada construido por el jugador y ningún edificio de la isla en medio. `avoid` deja fuera otras zonas (solares).
 */
export function canPlace(world: BuildWorld, t: BuildingTemplate, x: number, y: number, z: number, rotation = 0, avoid?: (x: number, z: number) => boolean): boolean {
  if (y <= SEA_LEVEL + 1) return false;
  const [fw, fd] = footprint(t, rotation);
  const h = t.layers.length;
  if (y + h >= HEIGHT) return false;
  for (let dz = 0; dz < fd; dz++) {
    for (let dx = 0; dx < fw; dx++) {
      const cx = x + dx;
      const cz = z + dz;
      if (avoid?.(cx, cz) || world.plotAt?.(cx, cz)) return false;
      const ground = world.heightAt(cx, cz);
      if (Math.abs(ground - y) > 1) return false;
      if (isWater(world.getBlock(cx, ground + 1, cz))) return false;
      for (let cy = y - 1; cy < y + h + 1; cy++) {
        if (world.isEdited?.(cx, cy, cz)) return false;
        if (cy > ground && cy >= y && !soft(world.getBlock(cx, cy, cz))) return false; // un árbol o una roca
      }
    }
  }
  return true;
}

/** Coloca la plantilla con la esquina en (x, z) y el suelo a la altura y. Rellena por debajo si el suelo baja. */
export function placeTemplate(world: BuildWorld, t: BuildingTemplate, x: number, y: number, z: number, rotation = 0): PlacedBuilding {
  const [w, , d] = templateSize(t);
  const [fw, fd] = footprint(t, rotation);
  const base = t.legend[t.layers[0][0][0]] ?? Block.Dirt;
  // Cimientos: sin huecos entre el suelo del edificio y el terreno.
  for (let dz = 0; dz < fd; dz++) {
    for (let dx = 0; dx < fw; dx++) {
      for (let cy = y - 1; cy > y - 4 && !isSolid(world.getBlock(x + dx, cy, z + dz)); cy--) world.setBlock(x + dx, cy, z + dz, base);
    }
  }
  for (const [cx, cy, cz, b] of templateCells(t, rotation)) if (b !== null) world.setBlock(x + cx, y + cy, z + cz, b);
  const at = (c: Cell): Cell => {
    const [rx, rz] = rotateCell(c[0], c[2], w, d, rotation);
    return [x + rx, y + c[1], z + rz];
  };
  return {
    id: t.id,
    x, y, z, rotation,
    door: at(t.door),
    rooms: t.rooms.map((r) => {
      const [ax, , az] = at([r.area[0], 0, r.area[1]]);
      const [bx, , bz] = at([r.area[2], 0, r.area[3]]);
      return { name: r.name, y: y + r.floor, area: [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)] };
    }),
    slots: t.slots.map((s) => ({ kind: s.kind, at: at(s.at), facing: (((s.facing ?? 0) + rotation) % 4 + 4) % 4 })),
  };
}

/**
 * Busca un sitio libre cerca de (x, z), dando vueltas cada vez más lejos, y devuelve la esquina y la altura.
 * En islas ya empezadas así no se pisa nada de lo construido.
 */
export function findSpot(world: BuildWorld, t: BuildingTemplate, x: number, z: number, maxRadius = 48, rotation = 0, avoid?: (x: number, z: number) => boolean): Cell | null {
  const [fw, fd] = footprint(t, rotation);
  for (let r = 0; r <= maxRadius; r += 2) {
    for (let dz = -r; dz <= r; dz += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const cx = x + dx - (fw >> 1);
        const cz = z + dz - (fd >> 1);
        const y = world.heightAt(cx + (fw >> 1), cz + (fd >> 1));
        if (canPlace(world, t, cx, y, cz, rotation, avoid)) return [cx, y, cz];
      }
    }
  }
  return null;
}

/**
 * Casa de dos plantas: abajo salón y cocina, escalera de madera, arriba dormitorio con la cama del dueño.
 * Es la primera plantilla y la que usan las pruebas; las de la tienda y el museo llegan en sus versiones.
 */
export const TWO_FLOOR_HOUSE: BuildingTemplate = {
  id: 'casa-dos-plantas',
  name: 'Casa de dos plantas',
  legend: { P: Block.Planks, L: Block.Log, W: Block.Glass, D: Block.Door, T: Block.DoorTop, S: Block.PlanksStairs, R: Block.RoofRed, B: Block.Brick },
  //  x: 0..6, z: 0..6 (la puerta da a +z)
  layers: [
    // 0: suelo
    ['PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP', 'PPPPPPP'],
    // 1-3: paredes de la planta baja y la escalera, que sube hacia -z junto a la pared de x = 5
    ['LBBBBBL', 'B.....B', 'B....PB', 'B....PB', 'B....SB', 'B.....B', 'LBBDBBL'],
    ['LBWBWBL', 'B.....B', 'B....PB', 'B....SB', 'B.....B', 'W.....W', 'LBBTBBL'],
    ['LBBBBBL', 'B.....B', 'B....SB', 'B.....B', 'B.....B', 'B.....B', 'LBBBBBL'],
    // 4: suelo de arriba, con el hueco de la escalera
    ['PPPPPPP', 'PPPPPPP', 'PPPPP.P', 'PPPPP.P', 'PPPPP.P', 'PPPPPPP', 'PPPPPPP'],
    // 5-6: paredes de arriba
    ['LBBBBBL', 'B.....B', 'B.....B', 'B.....B', 'B.....B', 'B.....B', 'LBBBBBL'],
    ['LBWBWBL', 'B.....B', 'W.....W', 'B.....B', 'B.....B', 'W.....W', 'LBWBWBL'],
    // 7: tejado
    ['RRRRRRR', 'RRRRRRR', 'RRRRRRR', 'RRRRRRR', 'RRRRRRR', 'RRRRRRR', 'RRRRRRR'],
  ],
  door: [3, 1, 7],
  rooms: [
    { name: 'Salón', floor: 1, area: [1, 3, 4, 5] },
    { name: 'Cocina', floor: 1, area: [1, 1, 4, 2] },
    { name: 'Dormitorio', floor: 5, area: [1, 1, 5, 5] },
  ],
  slots: [
    { kind: 'cama', at: [2, 5, 2], facing: 2 },
    { kind: 'mueble', at: [1, 1, 1] },
    { kind: 'mueble', at: [1, 1, 5] },
    { kind: 'mueble', at: [4, 5, 5] },
  ],
};
