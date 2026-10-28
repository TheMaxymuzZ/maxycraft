// Mazmorras y ruinas (v4.25): bajo las islas de recursos (y las misteriosas) hay una mazmorra distinta en cada
// visita. Se baja por una escalera de caracol desde un templo en ruinas y se recorre sala a sala: entrada,
// pasillo, sala de trampas (pinchos, placas que disparan flechas y suelo que se hunde), sala del puzle (tres
// palancas de colores en el orden que dice el cartel), sala del jefe y, tras su reja, el tesoro.
// Aquí está el plano: qué bloques van dónde y dónde están las trampas, las palancas y los cofres. Lo que pasa al
// jugar está en game/dungeon.ts.
import { Block } from './blocks';
import type { HostileKind } from './hostiles';
import { CREATURES } from './creatures';
import { SEA_LEVEL, type MysteryKind } from './world';

export type DungeonTheme = 'catacumbas' | 'templo' | 'helada' | 'fragua';

export interface ThemeDef {
  name: string;
  wall: Block;
  accent: Block;
  floor: Block;
  /** El suelo que se hunde. */
  crumble: Block;
  /** Las ruinas de la superficie. */
  ruin: Block;
  boss: HostileKind;
  text: string;
}

export const THEMES: Record<DungeonTheme, ThemeDef> = {
  catacumbas: {
    name: 'Catacumbas de piedra', wall: Block.Cobble, accent: Block.PolishedStone, floor: Block.Stone, crumble: Block.Ash, ruin: Block.Cobble,
    boss: 'rey_esqueleto', text: 'Pasillos de piedra vieja donde manda el rey esqueleto.',
  },
  templo: {
    name: 'Templo de arenisca', wall: Block.Sandstone, accent: Block.CarvedSandstone, floor: Block.TerracottaYellow, crumble: Block.RedSand, ruin: Block.Sandstone,
    boss: 'limo_dorado', text: 'Un templo enterrado bajo la arena, con un gran limo dorado guardando el tesoro.',
  },
  helada: {
    name: 'Cueva helada', wall: Block.PackedIce, accent: Block.BlueIce, floor: Block.Slate, crumble: Block.PowderSnow, ruin: Block.PackedIce,
    boss: 'golem_hielo', text: 'Salas de hielo azul donde vive un gólem de escarcha.',
  },
  fragua: {
    name: 'Fragua volcánica', wall: Block.BasaltBricks, accent: Block.CarvedObsidian, floor: Block.Blackstone, crumble: Block.Ash, ruin: Block.Basalt,
    boss: 'golem_magma', text: 'Una forja antigua dentro del volcán, con un gólem de magma que no se apaga nunca.',
  },
};

/** El tema de la mazmorra según la isla. */
export const KIND_THEME: Record<MysteryKind, DungeonTheme> = {
  minerales: 'catacumbas', flores: 'templo', bambu: 'templo', frutas: 'templo', nieve: 'helada', cristal: 'helada', volcan: 'fragua', setas: 'catacumbas',
};

export type RoomKind = 'entrada' | 'pasillo' | 'trampas' | 'puzle' | 'jefe' | 'tesoro';
export const ROOM_ORDER: RoomKind[] = ['entrada', 'pasillo', 'trampas', 'puzle', 'jefe', 'tesoro'];
export const ROOM_NAMES: Record<RoomKind, string> = {
  entrada: 'Entrada', pasillo: 'Pasillo', trampas: 'Sala de trampas', puzle: 'Sala del puzle', jefe: 'Sala del jefe', tesoro: 'Tesoro',
};

export type LeverColor = 'rojo' | 'azul' | 'verde';
export const LEVER_COLORS: Record<LeverColor, number> = { rojo: 0xe04040, azul: 0x3a7ae0, verde: 0x40b040 };
const COLOR_CLUES: Record<LeverColor, string> = { rojo: 'el del fuego', azul: 'el del mar', verde: 'el de la hierba' };

export interface Room {
  kind: RoomKind;
  /** Interior, incluidos los bordes. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type Cell3 = [number, number, number];

export interface DungeonPlan {
  theme: DungeonTheme;
  /** Altura del suelo de las salas (donde se pisa). */
  floorY: number;
  rooms: Room[];
  /** Bloques a poner, en orden. */
  blocks: [number, number, number, Block][];
  spikes: [number, number][];
  plates: [number, number][];
  /** Lanzaflechas en la pared: desde dónde y hacia dónde disparan; cada uno salta con su placa. */
  dispensers: { x: number; y: number; z: number; dx: number; dz: number; plate: number }[];
  crumble: [number, number][];
  levers: { x: number; y: number; z: number; color: LeverColor; nx: number; nz: number }[];
  /** El orden correcto de las palancas. */
  order: LeverColor[];
  gates: { to: 'jefe' | 'tesoro'; cells: Cell3[] }[];
  chest: Cell3;
  boss: Cell3;
  /** Arriba de la escalera, en el templo en ruinas. */
  entrance: Cell3;
  signs: { x: number; y: number; z: number; text: string }[];
  /** El cofre pequeño de la torre caída. */
  ruinChest: Cell3;
}

/** Lo que el plano necesita saber del terreno. */
export interface DungeonWorld {
  heightAt(x: number, z: number): number;
}

const CELL = 15;
const HALF: Record<RoomKind, number> = { entrada: 3, pasillo: 3, trampas: 5, puzle: 4, jefe: 5, tesoro: 3 };
const ROOM_H = 5;
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR_NAMES = (dx: number, dz: number) => (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'el este' : 'el oeste') : dz > 0 ? 'el sur' : 'el norte');

/** Un camino de seis casillas por una cuadrícula de 4×4, sin repetir ninguna. */
function walk(random: () => number): [number, number][] | null {
  const path: [number, number][] = [[Math.floor(random() * 4), Math.floor(random() * 4)]];
  while (path.length < ROOM_ORDER.length) {
    const [i, j] = path[path.length - 1];
    const options = DIRS.map(([a, b]) => [i + a, j + b] as [number, number])
      .filter(([a, b]) => a >= 0 && a < 4 && b >= 0 && b < 4 && !path.some(([c, d]) => c === a && d === b));
    if (!options.length) return null;
    path.push(options[Math.floor(random() * options.length)]);
  }
  return path;
}

/**
 * El plano de una mazmorra con centro en (cx, cz). Cambia con `random`: cada visita sale distinta (el camino, las
 * trampas, el orden de las palancas). Solo usa casillas con tierra encima, para no quedar bajo el mar.
 */
export function planDungeon(theme: DungeonTheme, world: DungeonWorld, random: () => number, cx = 0, cz = 0): DungeonPlan {
  const t = THEMES[theme];
  const floorY = 6;
  const center = (i: number, j: number): [number, number] => [Math.round(cx + (i - 1.5) * CELL), Math.round(cz + (j - 1.5) * CELL)];
  let path: [number, number][] | null = null;
  for (let tries = 0; tries < 80 && !path; tries++) {
    const p = walk(random);
    if (p && p.every(([i, j]) => world.heightAt(...center(i, j)) > SEA_LEVEL + 1)) path = p;
  }
  // Si la isla es muy pequeña, se acepta cualquier camino (la mazmorra va muy por debajo del mar igualmente).
  for (let tries = 0; !path && tries < 50; tries++) path = walk(random);
  path ??= [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]];

  const blocks: DungeonPlan['blocks'] = [];
  const put = (x: number, y: number, z: number, b: Block) => blocks.push([x, y, z, b]);
  const fill = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: Block) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = y0; y <= y1; y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) put(x, y, z, b);
  };

  const rooms: Room[] = path.map(([i, j], k) => {
    const [x, z] = center(i, j);
    const h = HALF[ROOM_ORDER[k]];
    return { kind: ROOM_ORDER[k], x0: x - h, z0: z - h, x1: x + h, z1: z + h };
  });
  const mid = (r: Room): [number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
  /** Hacia dónde está la sala vecina (paso de la cuadrícula). */
  const step = (a: number, b: number): [number, number] => [path![b][0] - path![a][0], path![b][1] - path![a][1]];

  // 1. Muros macizos alrededor de todo (salas y pasillos), luego se vacía el interior.
  for (const r of rooms) fill(r.x0 - 1, floorY - 1, r.z0 - 1, r.x1 + 1, floorY + ROOM_H, r.z1 + 1, t.wall);
  const corridors: { cells: [number, number][]; dx: number; dz: number }[] = [];
  for (let k = 0; k + 1 < rooms.length; k++) {
    const [dx, dz] = step(k, k + 1);
    const [ax, az] = mid(rooms[k]);
    const [bx, bz] = mid(rooms[k + 1]);
    const cells: [number, number][] = [];
    // Recto de centro a centro (las salas vecinas están alineadas en la cuadrícula).
    const n = Math.round(Math.abs(bx - ax) + Math.abs(bz - az));
    for (let s = 0; s <= n; s++) cells.push([Math.round(ax + dx * s), Math.round(az + dz * s)]);
    corridors.push({ cells, dx, dz });
    for (const [x, z] of cells) fill(x - Math.abs(dz) * 2, floorY - 1, z - Math.abs(dx) * 2, x + Math.abs(dz) * 2, floorY + 3, z + Math.abs(dx) * 2, t.wall);
  }
  for (const r of rooms) {
    fill(r.x0, floorY, r.z0, r.x1, floorY + ROOM_H - 1, r.z1, Block.Air);
    fill(r.x0, floorY - 1, r.z0, r.x1, floorY - 1, r.z1, t.floor);
  }
  const inRoom = (x: number, z: number) => rooms.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  const gates: DungeonPlan['gates'] = [];
  corridors.forEach((c, k) => {
    const outside = c.cells.filter(([x, z]) => !inRoom(x, z));
    for (const [x, z] of c.cells) fill(x - Math.abs(c.dz), floorY, z - Math.abs(c.dx), x + Math.abs(c.dz), floorY + 2, z + Math.abs(c.dx), Block.Air);
    for (const [x, z] of outside) fill(x - Math.abs(c.dz), floorY - 1, z - Math.abs(c.dx), x + Math.abs(c.dz), floorY - 1, z + Math.abs(c.dx), t.accent);
    // Rejas: a la sala del jefe (se abre con el puzle) y al tesoro (al vencer al jefe).
    const to = ROOM_ORDER[k + 1];
    if ((to === 'jefe' || to === 'tesoro') && outside.length) {
      const [gx, gz] = outside[Math.floor(outside.length / 2)];
      const cells: Cell3[] = [];
      for (let w = -1; w <= 1; w++) for (let y = floorY; y <= floorY + 2; y++) cells.push([gx + w * Math.abs(c.dz), y, gz + w * Math.abs(c.dx)]);
      for (const [x, y, z] of cells) put(x, y, z, Block.Fence);
      gates.push({ to, cells });
    }
  });

  // Antorchas en las esquinas.
  for (const r of rooms) for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) put(x, floorY, z, Block.Torch);

  /** Las casillas junto a las puertas, que no llevan trampas. */
  const doorway = (x: number, z: number) => corridors.some((c) => c.cells.some(([a, b]) => !inRoom(a, b) && Math.abs(a - x) + Math.abs(b - z) <= 2));

  // 2. Sala de trampas.
  const trap = rooms[2];
  const spikes: [number, number][] = [];
  const plates: [number, number][] = [];
  const dispensers: DungeonPlan['dispensers'] = [];
  const crumble: [number, number][] = [];
  const [tx, tz] = mid(trap).map(Math.round);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) crumble.push([tx + dx, tz + dz]);
  for (const [x, z] of crumble) {
    put(x, floorY - 1, z, t.crumble);
    // Debajo, un hoyo de dos de hondo con un escalón para salir.
    put(x, floorY - 2, z, Block.Air);
    put(x, floorY - 3, z, Block.Air);
    put(x, floorY - 4, z, t.floor);
  }
  put(tx + 1, floorY - 3, tz + 1, t.accent);
  const taken = (x: number, z: number) => crumble.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - z) <= 1) || doorway(x, z);
  for (let x = trap.x0; x <= trap.x1; x++) {
    for (let z = trap.z0; z <= trap.z1; z++) {
      if (taken(x, z) || (x + z) % 2 || random() > 0.45) continue;
      spikes.push([x, z]);
    }
  }
  for (let tries = 0; plates.length < 4 && tries < 60; tries++) {
    const x = trap.x0 + 1 + Math.floor(random() * (trap.x1 - trap.x0 - 1));
    const z = trap.z0 + 1 + Math.floor(random() * (trap.z1 - trap.z0 - 1));
    if (taken(x, z) || spikes.some(([a, b]) => a === x && b === z) || plates.some(([a, b]) => a === x && b === z)) continue;
    plates.push([x, z]);
    // El lanzaflechas en la pared, en línea con la placa (por el lado que no tenga puerta).
    const alongX = random() < 0.5;
    const side = random() < 0.5 ? -1 : 1;
    const wx = alongX ? (side < 0 ? trap.x0 - 1 : trap.x1 + 1) : x;
    const wz = alongX ? z : side < 0 ? trap.z0 - 1 : trap.z1 + 1;
    const ddx = alongX ? -side : 0;
    const ddz = alongX ? 0 : -side;
    put(wx, floorY + 1, wz, t.accent);
    dispensers.push({ x: wx, y: floorY + 1, z: wz, dx: ddx, dz: ddz, plate: plates.length - 1 });
  }

  // 3. Sala del puzle: tres palancas en una pared sin puerta, y un cartel con la pista.
  const puzzle = rooms[3];
  const used = [step(3, 2), step(3, 4)];
  const wall = DIRS.find(([a, b]) => !used.some(([c, d]) => c === a && d === b))!;
  const colors: LeverColor[] = ['rojo', 'azul', 'verde'];
  const order = [...colors].sort(() => random() - 0.5);
  const placed = [...colors].sort(() => random() - 0.5);
  const [px, pz] = mid(puzzle).map(Math.round);
  const levers = placed.map((color, i) => {
    const off = (i - 1) * 2;
    const x = wall[0] ? (wall[0] > 0 ? puzzle.x1 : puzzle.x0) : px + off;
    const z = wall[1] ? (wall[1] > 0 ? puzzle.z1 : puzzle.z0) : pz + off;
    return { x, y: floorY + 1, z, color, nx: -wall[0], nz: -wall[1] };
  });
  const clue = `Primero ${COLOR_CLUES[order[0]]}, luego ${COLOR_CLUES[order[1]]} y al final ${COLOR_CLUES[order[2]]}.`;
  const signs: DungeonPlan['signs'] = [{ x: px, y: floorY, z: pz, text: clue }];

  // 4. El jefe en el centro de su sala; el cofre en el centro del tesoro.
  const [bx, bz] = mid(rooms[4]).map(Math.round);
  const [kx, kz] = mid(rooms[5]).map(Math.round);
  put(kx, floorY - 1, kz, t.accent);

  // 5. Escalera de caracol desde la superficie hasta la entrada, alrededor de una columna.
  const [ex, ez] = mid(rooms[0]).map(Math.round);
  const top = Math.max(floorY + ROOM_H + 2, world.heightAt(ex, ez) + 1);
  const ring: [number, number][] = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  fill(ex - 2, floorY + ROOM_H, ez - 2, ex + 2, top - 1, ez + 2, t.wall);
  for (const [dx, dz] of ring) fill(ex + dx, floorY, ez + dz, ex + dx, top + 3, ez + dz, Block.Air);
  fill(ex, floorY, ez, ex, top - 1, ez, t.accent);
  for (let i = 0, y = top - 1; y > floorY; i++, y--) {
    const [dx, dz] = ring[i % ring.length];
    put(ex + dx, y - 1, ez + dz, t.accent);
  }

  // 6. El templo en ruinas alrededor de la escalera: suelo, columnas rotas y un cartel.
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) <= 1) continue;
      put(ex + dx, top - 1, ez + dz, t.ruin);
      for (let y = top; y < top + 4; y++) put(ex + dx, y, ez + dz, Block.Air);
    }
  }
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) fill(ex + dx, top, ez + dz, ex + dx, top + 1 + Math.floor(random() * 3), ez + dz, t.accent);
  for (let d = -2; d <= 0; d++) put(ex + d, top, ez - 3, t.ruin);
  signs.push({ x: ex + 2, y: top, z: ez + 2, text: `${t.name}. Baja por la escalera… si te atreves.` });

  // 7. La torre caída, algo más lejos, con un cofre pequeño y una pista hacia el templo.
  const a = random() * Math.PI * 2;
  let rx = Math.round(ex + Math.cos(a) * 18);
  let rz = Math.round(ez + Math.sin(a) * 18);
  for (let tries = 0; tries < 12 && world.heightAt(rx, rz) <= SEA_LEVEL + 1; tries++) {
    const b = a + (tries + 1) * 0.5;
    rx = Math.round(ex + Math.cos(b) * 16);
    rz = Math.round(ez + Math.sin(b) * 16);
  }
  const ry = world.heightAt(rx, rz) + 1;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) fill(rx + dx, ry, rz + dz, rx + dx, ry + 1 + ((dx + dz + 3) % 3), rz + dz, t.ruin);
  // Los bloques que se cayeron, en fila por el suelo.
  for (let s = 2; s <= 5; s++) put(rx + Math.round(Math.cos(a + 1) * s), ry, rz + Math.round(Math.sin(a + 1) * s), t.ruin);
  fill(rx, ry, rz, rx, ry + 2, rz, Block.Air);
  signs.push({ x: rx + 2, y: ry, z: rz, text: `El templo de la mazmorra queda hacia ${DIR_NAMES(ex - rx, ez - rz)}.` });

  return {
    theme, floorY, rooms, blocks, spikes, plates, dispensers, crumble, levers, order, gates,
    chest: [kx, floorY, kz], boss: [bx, floorY, bz], entrance: [ex, top, ez], signs, ruinChest: [rx, ry, rz],
  };
}

// --- Tesoros ---

/** Lo legendario que puede salir en el tesoro (además de la ropa legendaria). */
export const DUNGEON_LEGENDS = ['espada_estelar', 'arco_lunar', 'corona_limo', 'corazon_volcan', 'lagrima_estrella'];

/**
 * El tesoro de la sala final: materiales valiosos, a veces un fósil, y siempre algo legendario que aún no tengas
 * (cuando ya los tienes todos, vuelven a salir).
 */
export function treasure(pool: string[], owned: string[], random: () => number = Math.random): { items: { id: string; count: number }[]; legend: string } {
  const items = [
    { id: 'pepita_oro', count: 2 + Math.floor(random() * 3) },
    { id: 'amatista', count: 1 + Math.floor(random() * 2) },
  ];
  if (random() < 0.5) items.push({ id: 'perla_negra', count: 1 });
  const fossils = CREATURES.filter((c) => c.kind === 'fosil');
  if (random() < 0.4) items.push({ id: fossils[Math.floor(random() * fossils.length)].id, count: 1 });
  const left = pool.filter((id) => !owned.includes(id));
  const from = left.length ? left : pool;
  return { items, legend: from[Math.floor(random() * from.length)] };
}

/** El cofre pequeño de la torre caída: algo útil para la mazmorra. */
export function ruinLoot(random: () => number = Math.random): { id: string; count: number }[] {
  const out = [{ id: 'flecha', count: 8 + Math.floor(random() * 8) }, { id: 'pan', count: 2 }];
  if (random() < 0.5) out.push({ id: 'pepita_hierro', count: 3 });
  return out;
}
