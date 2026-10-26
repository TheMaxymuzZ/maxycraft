// Ayuntamiento, alcalde y urbanista (v4.13). El ayuntamiento empieza siendo una caseta de obras y se mejora en
// cuatro niveles. El alcalde da la valoración de la isla, lleva el tablón de avisos y encarga obras públicas: la
// primera, un puente hasta uno de los islotes que hay alrededor de la isla. Aquí también están las rampas que
// se hacen solas para que los vecinos lleguen a la tienda y al museo en las islas de antes.

import { Block, isSolid, isWater } from './blocks';
import { type BuildWorld, type BuildingTemplate, canPlace, findSpot, placeTemplate } from './buildings';
import { type Cell, type PathWorld, findPath } from './pathfind';
import type { Islet } from './world';
import { SEA_LEVEL } from './world';

/** Lo que se guarda del ayuntamiento y las obras. */
export interface TownSave {
  /** Nivel del edificio (1 a 4). */
  level: number;
  /** Esquina del solar de 11x11 y altura del suelo. */
  x: number;
  y: number;
  z: number;
  /** Obras públicas hechas (ids de PUBLIC_WORKS o "puente-N"). */
  works: string[];
  /** Ya se miró si hacían falta rampas. */
  ramps?: boolean;
  /** Nombre de la isla, desde el ayuntamiento (nivel 3). */
  name?: string;
  /** Color de la bandera (índice de FLAG_COLORS). */
  flag?: number;
}

/** Si lo que llega (de la red o de una copia) tiene forma de ayuntamiento. */
export function isTownSave(v: unknown): v is TownSave {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  const int = (x: unknown) => Number.isInteger(x);
  return int(t.level) && (t.level as number) >= 1 && (t.level as number) <= HALL_LEVELS_COUNT && int(t.x) && int(t.y) && int(t.z)
    && Array.isArray(t.works) && t.works.every((w) => typeof w === 'string' && w.length < 40)
    && (t.name === undefined || (typeof t.name === 'string' && t.name.length <= 40))
    && (t.flag === undefined || (int(t.flag) && (t.flag as number) >= 0 && (t.flag as number) < 4));
}

const HALL_LEVELS_COUNT = 4;

export interface HallLevel {
  name: string;
  /** Lo que cuesta llegar a este nivel: bayas y materiales. */
  cost: number;
  materials: [string, number][];
  /** Lo que se abre con este nivel. */
  opens: string;
}

export const HALL_LEVELS: HallLevel[] = [
  { name: 'Caseta de obras', cost: 0, materials: [], opens: 'El alcalde: valoración de la isla, tablón de avisos y obras públicas.' },
  { name: 'Oficina', cost: 15000, materials: [['tablones', 40], ['piedra', 20]], opens: 'Llega Ladrillo, el urbanista: planos de casa para vecinos nuevos.' },
  { name: 'Ayuntamiento', cost: 50000, materials: [['ladrillo', 60], ['cristal', 10], ['piedra_pulida', 30]], opens: 'Nombre y bandera de la isla, y las fiestas de cada estación en el tablón.' },
  { name: 'Ayuntamiento con plaza y reloj', cost: 120000, materials: [['baldosas', 60], ['pepita_oro', 5], ['reloj', 1]], opens: 'Plaza con farolas y reloj en la fachada. ¡La isla luce muchísimo más!' },
];

/** Colores de la bandera (los mismos bloques que los tejados, que ya existen en el atlas). */
export const FLAG_COLORS: [string, Block][] = [['Roja', Block.RoofRed], ['Azul', Block.RoofBlue], ['Verde', Block.RoofGreen], ['Amarilla', Block.RoofYellow]];

/** El solar: 11x11, con la puerta en el centro del lado +z. */
export const SITE = 11;
const C = 5;

/** Medio lado del edificio de cada nivel (sin contar el tejado): 5x5, 7x7, 9x9 y 9x9. */
export function hallHalf(level: number): number {
  return Math.min(4, level + 1);
}

const wallHeight = (level: number) => (level >= 3 ? 4 : 3);

/** La plantilla del ayuntamiento de un nivel. Fuera del edificio deja lo que haya (salvo la plaza del nivel 4). */
export function hallTemplate(level: number): BuildingTemplate {
  const half = hallHalf(level);
  const wallH = wallHeight(level);
  const legend: Record<string, Block> = {
    F: level >= 3 ? Block.PolishedStone : Block.Planks,
    W: level === 1 ? Block.ShopWall : level === 2 ? Block.Brick : Block.MuseumWall,
    L: level >= 3 ? Block.PolishedStone : Block.Log,
    G: Block.Glass,
    D: Block.Door,
    T: Block.DoorTop,
    R: level === 1 ? Block.RoofYellow : level === 2 ? Block.RoofRed : Block.RoofBlue,
    P: Block.Tiles,
    K: Block.ClockFace,
    V: Block.Fence,
    X: Block.Torch,
  };
  const grid = () => Array.from({ length: SITE }, () => Array<string>(SITE).fill(' '));
  const layers: string[][][] = [];
  const ring = (x: number, z: number) => Math.max(Math.abs(x - C), Math.abs(z - C));
  // Suelo: el del edificio y, en el nivel 4, la plaza de baldosas en todo el solar.
  const floor = grid();
  for (let z = 0; z < SITE; z++) for (let x = 0; x < SITE; x++) if (ring(x, z) <= half || level >= 4) floor[z][x] = ring(x, z) <= half ? 'F' : 'P';
  layers.push(floor);
  for (let h = 1; h <= wallH; h++) {
    const g = grid();
    for (let z = 0; z < SITE; z++) {
      for (let x = 0; x < SITE; x++) {
        const r = ring(x, z);
        if (r > half) continue;
        if (r < half) {
          g[z][x] = '.';
          continue;
        }
        const corner = Math.abs(x - C) === half && Math.abs(z - C) === half;
        let ch = corner ? 'L' : 'W';
        const front = z === C + half;
        if (front && x === C && h <= 2) ch = h === 1 ? 'D' : 'T';
        else if (h === 2 && !corner && (x - C) % 2 === 0 && !front) ch = 'G';
        else if (h === 2 && front && Math.abs(x - C) === 2) ch = 'G';
        else if (level >= 4 && front && x === C && h === wallH) ch = 'K';
        g[z][x] = ch;
      }
    }
    // Farolas de la plaza (nivel 4): un poste en cada esquina con una antorcha encima.
    if (level >= 4 && h <= 2) for (const [x, z] of [[0, 0], [10, 0], [0, 10], [10, 10]]) g[z][x] = h === 1 ? 'V' : 'X';
    layers.push(g);
  }
  // Tejado a cuatro aguas, como las casas: capas que se van cerrando, huecas por dentro.
  for (let i = 0; half + 1 - i >= 0; i++) {
    const r = half + 1 - i;
    const g = grid();
    for (let z = 0; z < SITE; z++) {
      for (let x = 0; x < SITE; x++) {
        const d = ring(x, z);
        if (d > r) continue;
        g[z][x] = d >= r - 1 || r <= 1 ? 'R' : '.';
      }
    }
    layers.push(g);
  }
  return {
    id: `ayuntamiento-${level}`,
    name: HALL_LEVELS[level - 1].name,
    legend,
    layers: layers.map((l) => l.map((row) => row.join(''))),
    door: [C, 1, C + half + 1],
    rooms: [{ name: 'Recepción', floor: 1, area: [C - half + 1, C - half + 1, C + half - 1, C + half - 1] }],
    slots: [{ kind: 'mostrador', at: [C, 1, C - half + 1] }],
  };
}

/** Busca solar para el ayuntamiento cerca de la plaza (cabe ya el del nivel 4, para poder ampliarlo sin mover nada). */
export function findHallSite(world: BuildWorld, x: number, z: number, avoid?: (x: number, z: number) => boolean): Cell | null {
  return findSpot(world, hallTemplate(4), x, z, 120, 0, avoid);
}

/** Si el solar sigue libre (para colocar el ayuntamiento en una isla en la que no estaba). */
export function hallSiteFree(world: BuildWorld, site: Cell): boolean {
  return canPlace(world, hallTemplate(4), site[0], site[1], site[2], 0);
}

/** Construye el nivel `level`; si ya había uno más pequeño, primero lo quita. */
export function buildHall(world: BuildWorld, town: Pick<TownSave, 'x' | 'y' | 'z'>, level: number, previous = 0) {
  if (previous > 0) {
    const half = hallHalf(previous) + 1;
    const top = wallHeight(previous) + half + 2;
    for (let dy = 1; dy <= top; dy++) {
      for (let dz = -half; dz <= half; dz++) {
        for (let dx = -half; dx <= half; dx++) {
          const [bx, by, bz] = [town.x + C + dx, town.y + dy, town.z + C + dz];
          if (world.getBlock(bx, by, bz) !== Block.Air) world.setBlock(bx, by, bz, Block.Air);
        }
      }
    }
  }
  return placeTemplate(world, hallTemplate(level), town.x, town.y, town.z, 0);
}

/** Casilla delante de la puerta del ayuntamiento de un nivel, donde se ponen el alcalde y el urbanista. */
export function hallDoor(town: Pick<TownSave, 'x' | 'y' | 'z'>, level: number): Cell {
  return [town.x + C, town.y + 1, town.z + C + hallHalf(level) + 1];
}

/** Mástil con la bandera, a un lado de la puerta (nivel 3). */
export function flagCells(town: Pick<TownSave, 'x' | 'y' | 'z'>, level: number): Cell[] {
  const [x, y, z] = hallDoor(town, level);
  return [0, 1, 2, 3].map((h) => [x + 3, y + h, z + 1] as Cell);
}

export function placeFlag(world: BuildWorld, town: Pick<TownSave, 'x' | 'y' | 'z'>, level: number, color: number) {
  const cells = flagCells(town, level);
  cells.slice(0, 3).forEach(([x, y, z]) => world.setBlock(x, y, z, Block.Fence));
  const [fx, fy, fz] = cells[3];
  world.setBlock(fx, fy, fz, Block.Fence);
  world.setBlock(fx + 1, fy, fz, FLAG_COLORS[color][1]);
}

// --- Obras públicas ---

export interface PublicWork {
  id: string;
  name: string;
  cost: number;
  /** Nivel de ayuntamiento que hace falta. */
  level: number;
  text: string;
}

export const PUBLIC_WORKS: PublicWork[] = [
  { id: 'fuente', name: 'Fuente de la plaza', cost: 12000, level: 1, text: 'Una fuente delante del ayuntamiento, para que la plaza tenga vida.' },
  { id: 'farolas', name: 'Farolas del pueblo', cost: 8000, level: 2, text: 'Cuatro farolas alrededor del ayuntamiento para que de noche se vea todo.' },
  { id: 'bancos', name: 'Bancos de la plaza', cost: 5000, level: 2, text: 'Dos bancos para que los vecinos se sienten a charlar.' },
];

/** Precio de un puente según lo largo que es. */
export function bridgeCost(length: number): number {
  return 8000 + Math.ceil(length / 5) * 1000;
}

export interface BridgePlan {
  /** Islote al que llega. */
  islet: number;
  /** Bloques a poner: [x, y, z, bloque]. */
  blocks: [number, number, number, Block][];
  length: number;
}

/** Lo que hace falta del mundo para planear un puente. */
export interface BridgeWorld extends BuildWorld {
  islets: Islet[];
}

const BRIDGE_MAX = 48;

/**
 * Puente de madera de 5 de ancho (3 para andar y una barandilla a cada lado) desde el islote hasta la orilla de la
 * isla, en línea recta hacia el centro. Lleva pilares de piedra hasta el fondo cada 4 bloques. null si no se puede.
 */
export function planBridge(world: BridgeWorld, index: number): BridgePlan | null {
  const islet = world.islets[index];
  if (!islet) return null;
  const len = Math.hypot(islet.x, islet.z);
  const [ux, uz] = [-islet.x / len, -islet.z / len];
  const [nx, nz] = [-uz, ux];
  const deckY = SEA_LEVEL + 1;
  const land = (x: number, z: number) => world.heightAt(x, z) >= deckY && !isWater(world.getBlock(x, world.heightAt(x, z), z));
  // Desde el centro del islote hacia la isla: primero hasta salir del islote, luego hasta llegar a tierra.
  let t = 0;
  while (t < islet.r * 2 && land(Math.round(islet.x + ux * t), Math.round(islet.z + uz * t))) t += 0.5;
  const start = t - 1;
  while (t < start + BRIDGE_MAX && !land(Math.round(islet.x + ux * t), Math.round(islet.z + uz * t))) t += 0.5;
  if (t >= start + BRIDGE_MAX) return null;
  const end = t + 1;
  const deck = new Map<string, Cell>();
  const rails = new Map<string, Cell>();
  const pillars = new Map<string, Cell>();
  for (let s = start; s <= end; s += 0.5) {
    for (let o = -2; o <= 2; o += 0.5) {
      const x = Math.round(islet.x + ux * s + nx * o);
      const z = Math.round(islet.z + uz * s + nz * o);
      const k = `${x},${z}`;
      deck.set(k, [x, deckY, z]);
      if (Math.abs(o) === 2) rails.set(k, [x, deckY + 1, z]);
      if (Math.abs(o) === 2 && Math.round(s - start) % 4 === 0) pillars.set(k, [x, deckY - 1, z]);
    }
  }
  // La barandilla, solo en el borde (no donde el borde de un tramo cae en medio de otro) y no sobre tierra.
  for (let s = start; s <= end; s += 0.5) {
    for (let o = -1.5; o <= 1.5; o += 0.5) {
      rails.delete(`${Math.round(islet.x + ux * s + nx * o)},${Math.round(islet.z + uz * s + nz * o)}`);
    }
  }
  const blocks: [number, number, number, Block][] = [];
  for (const [x, y, z] of deck.values()) {
    if (land(x, z)) continue;
    blocks.push([x, y, z, Block.BridgeDeck]);
  }
  for (const [x, y, z] of rails.values()) if (!land(x, z)) blocks.push([x, y, z, Block.BridgeRail]);
  for (const [x, , z] of pillars.values()) {
    if (land(x, z)) continue;
    for (let y = deckY - 1; y > 0 && (!isSolid(world.getBlock(x, y, z)) || isWater(world.getBlock(x, y, z))); y--) blocks.push([x, y, z, Block.BridgePillar]);
  }
  return { islet: index, blocks, length: Math.round(end - start) };
}

/** Obras de puente que se pueden encargar (una por islote al que se llega). */
export function bridgeWorks(world: BridgeWorld): PublicWork[] {
  const out: PublicWork[] = [];
  world.islets.forEach((_, i) => {
    const plan = planBridge(world, i);
    if (plan) out.push({ id: `puente-${i}`, name: `Puente al islote ${i + 1}`, cost: bridgeCost(plan.length), level: 1, text: `Un puente de ${plan.length} bloques hasta el islote ${i + 1}.` });
  });
  return out;
}

// --- Rampas (islas de antes) ---

interface Change {
  x: number;
  y: number;
  z: number;
  was: Block;
}

/** Lo que hace falta del mundo para hacer rampas. */
export type RampWorld = BuildWorld & PathWorld;

/**
 * En las islas de terreno antiguo la tienda o el museo pueden quedar en otro piso sin bajada, o al otro lado del
 * río. Si desde la plaza no hay camino, se hace uno: rampa de escalones de uno en uno (rellenando o cavando) y
 * pasarela de tablones sobre el agua. Se prueba en línea recta y en L, y se queda el primero con el que ya hay
 * camino. Devuelve las casillas cambiadas (vacío si no hacía falta o no se pudo).
 */
export function buildRamp(world: RampWorld, door: Cell, plaza: Cell): Cell[] {
  if (findPath(world, plaza, door)) return [];
  const best = gridRoute(world, plaza, door);
  for (const route of best ? [best, ...routes(plaza, door)] : routes(plaza, door)) {
    const changes = paveRoute(world, route);
    if (!changes) continue;
    if (findPath(world, plaza, door)) return changes.map((c) => [c.x, c.y, c.z]);
    // No ha servido: se deja como estaba.
    for (const c of changes.reverse()) world.setBlock(c.x, c.y, c.z, c.was);
  }
  return [];
}

/** Caminos de casillas (sin diagonales) de a a b: recto, y en L por un lado y por el otro. */
function routes(a: Cell, b: Cell): [number, number][][] {
  const line = (x0: number, z0: number, x1: number, z1: number) => {
    const out: [number, number][] = [[x0, z0]];
    let [x, z] = [x0, z0];
    while (x !== x1 || z !== z1) {
      // Avanza por el eje que se ha quedado más atrás respecto a la recta.
      const tx = x1 === x0 ? 1 : (x - x0) / (x1 - x0);
      const tz = z1 === z0 ? 1 : (z - z0) / (z1 - z0);
      if (x !== x1 && (tx <= tz || z === z1)) x += Math.sign(x1 - x);
      else z += Math.sign(z1 - z);
      out.push([x, z]);
    }
    return out;
  };
  const [ax, , az] = a;
  const [bx, , bz] = b;
  return [
    line(ax, az, bx, bz),
    [...line(ax, az, bx, az), ...line(bx, az, bx, bz).slice(1)],
    [...line(ax, az, ax, bz), ...line(ax, bz, bx, bz).slice(1)],
  ];
}

/**
 * Mejor ruta por columnas de la plaza a la puerta (Dijkstra sin diagonales): rodea parcelas y lo construido,
 * y prefiere el terreno llano y poco agua, para que la rampa sea corta.
 */
function gridRoute(world: RampWorld, a: Cell, b: Cell): [number, number][] | null {
  const M = 24;
  const x0 = Math.min(a[0], b[0]) - M;
  const z0 = Math.min(a[2], b[2]) - M;
  const w = Math.abs(a[0] - b[0]) + 2 * M + 1;
  const d = Math.abs(a[2] - b[2]) + 2 * M + 1;
  const idx = (x: number, z: number) => (z - z0) * w + (x - x0);
  const cost = new Float64Array(w * d).fill(Infinity);
  const prev = new Int32Array(w * d).fill(-1);
  const top = (x: number, z: number) => waterTopAt(world, x, z) ?? world.heightAt(x, z);
  const blocked = (x: number, z: number) => {
    if ((x === a[0] && z === a[2]) || (x === b[0] && z === b[2])) return false;
    if (inBuilding(world, x, z)) return true;
    const h = world.heightAt(x, z);
    return !!world.isEdited?.(x, h, z) || !!world.isEdited?.(x, h + 1, z);
  };
  // Cola sencilla por coste (las islas son pequeñas: basta con buscar el mínimo de una lista ordenada).
  const open: [number, number][] = [[0, idx(a[0], a[2])]];
  cost[idx(a[0], a[2])] = 0;
  const goal = idx(b[0], b[2]);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, i] = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (c > cost[i]) continue;
    if (i === goal) break;
    const x = (i % w) + x0;
    const z = Math.floor(i / w) + z0;
    const h = top(x, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < x0 || nz < z0 || nx >= x0 + w || nz >= z0 + d || blocked(nx, nz)) continue;
      const wet = waterTopAt(world, nx, nz) !== null;
      const step = 1 + Math.abs(top(nx, nz) - h) * 1.5 + (wet ? 2 : 0);
      const j = idx(nx, nz);
      if (c + step < cost[j]) {
        cost[j] = c + step;
        prev[j] = i;
        open.push([c + step, j]);
      }
    }
  }
  if (cost[goal] === Infinity) return null;
  const out: [number, number][] = [];
  for (let i = goal; i >= 0; i = prev[i]) out.push([(i % w) + x0, Math.floor(i / w) + z0]);
  return out.reverse();
}

/** Si (x, z) cae dentro de una casa, la tienda o el museo (con el alero del tejado), no en su jardín. */
function inBuilding(world: RampWorld, x: number, z: number): boolean {
  const p = world.plotAt?.(x, z) as { x: number; z: number } | undefined;
  return !!p && Math.abs(p.x - x) <= 3 && Math.abs(p.z - z) <= 3;
}

/** Arriba del agua de esa columna, o null si no hay agua. */
function waterTopAt(world: RampWorld, x: number, z: number): number | null {
  let y = world.heightAt(x, z) + 1;
  if (!isWater(world.getBlock(x, y, z))) return null;
  while (isWater(world.getBlock(x, y + 1, z))) y++;
  return y;
}

/**
 * Hace transitable una ruta: el suelo de cada casilla (f) cambia como mucho uno respecto a la anterior, empieza y
 * acaba a la altura de siempre, y sobre el agua es una pasarela. null si toca algo construido o una parcela.
 */
function paveRoute(world: RampWorld, route: [number, number][]): Change[] | null {
  const n = route.length - 1;
  const water = route.map(([x, z]) => waterTopAt(world, x, z));
  // t: el bloque de arriba que hace falta en cada casilla (en el agua, la pasarela justo encima).
  const t = route.map(([x, z], i) => water[i] ?? world.heightAt(x, z));
  if (water[0] !== null || water[n] !== null) return null;
  // Envolvente de pendiente 1 por encima del terreno, recortada para empezar y acabar donde están las puertas.
  const f = t.map((_, i) => Math.min(Math.max(...t.map((tj, j) => tj - Math.abs(i - j))), t[0] + i, t[n] + (n - i)));
  const changes: Change[] = [];
  const set = (x: number, y: number, z: number, b: Block): boolean => {
    const was = world.getBlock(x, y, z) as Block;
    if (was === b) return true;
    if (world.isEdited?.(x, y, z)) return false;
    changes.push({ x, y, z, was });
    world.setBlock(x, y, z, b);
    return true;
  };
  const undo = () => {
    for (const c of changes.reverse()) world.setBlock(c.x, c.y, c.z, c.was);
    return null;
  };
  for (let i = 0; i <= n; i++) {
    const [x, z] = route[i];
    if (i > 0 && i < n && inBuilding(world, x, z)) return undo();
    const ground = world.heightAt(x, z);
    if (water[i] !== null) {
      if (f[i] <= water[i]!) return undo();
      if (!set(x, f[i], z, Block.BridgeDeck)) return undo();
      for (let y = water[i]! + 1; y < f[i]; y++) if (!set(x, y, z, Block.BridgePillar)) return undo();
    } else if (f[i] > ground) {
      for (let y = ground + 1; y <= f[i]; y++) if (!set(x, y, z, Block.Cobble)) return undo();
    } else if (f[i] < ground) {
      for (let y = f[i] + 1; y <= ground; y++) if (!set(x, y, z, Block.Air)) return undo();
    }
    // Sitio para pasar: nada sólido a la altura del cuerpo (ramas de árboles, una roca).
    for (const y of [f[i] + 1, f[i] + 2, f[i] + 3]) {
      const b = world.getBlock(x, y, z);
      if (b !== Block.Air && (isSolid(b) || isWater(b)) && !set(x, y, z, Block.Air)) return undo();
    }
  }
  return changes;
}
