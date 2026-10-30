// La tienda nueva (v5.2), para las islas nuevas (terreno 3). Una sola planta alta y diáfana con un altillo bajo el
// tejado a dos aguas: delante, la tienda a doble altura con el escaparate, las mesas con lo del día y las
// estanterías; al fondo, bajo el altillo, el mostrador bajo con la caja (ahora se ve bien a Avellana). Arriba, en el
// altillo, la habitación de Avellana y, tras un tabique, la sala de muebles, que se abre con el último nivel.
// Aquí está el edificio y dónde va cada mueble; lo que se ve está en game/shopFront.ts.

import { Block, stairsFacing } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';

/** Ancho (x) y fondo (z) del solar. */
export const SHOP_W = 15;
export const SHOP_D = 13;
/** Paredes: de x = 1 a 13 y de z = 1 (fondo) a 9 (fachada). */
const WEST = 1;
const EAST = 13;
const BACK = 1;
const FRONT = 9;
/** Altura de las paredes y suelo del altillo. */
const WALL_TOP = 5;
export const LOFT = 5;
/** El altillo cubre el fondo, de z = 2 a 5; delante queda la tienda a doble altura. */
const LOFT_FRONT = 5;
/** Cumbrera (x) y capa donde empieza el tejado. */
const RIDGE = 7;
const ROOF = 5;
/** La escalera al altillo: pegada a la pared oeste (en x = 3, donde ya cabe uno de pie bajo el tejado). */
const STAIR_X = 3;

const DOOR_CELL: Cell = [7, 1, 10];
const CENTER: [number, number] = [7, 6];
export const SHOP_HALL_DOOR: Cell = [DOOR_CELL[0] - CENTER[0], DOOR_CELL[1], DOOR_CELL[2] - CENTER[1]];

export function shopHallOrigin(plot: { x: number; y: number; z: number }): [number, number, number] {
  return [plot.x - CENTER[0], plot.y, plot.z - CENTER[1]];
}

/** La puerta de la sala de muebles, en el tabique del altillo (cerrada con un cordón hasta el último nivel). */
export const HALL_SHOWROOM_DOOR: Cell = [8, LOFT + 1, 3];

const LEGEND: Record<string, Block> = {
  P: Block.Planks,
  H: Block.ShopWall,
  L: Block.Log,
  W: Block.Glass,
  w: Block.Window,
  D: Block.Door,
  T: Block.DoorTop,
  F: Block.Fence,
  C: Block.Cobble,
  p: Block.StonePath,
  A: Block.Awning,
  K: Block.Crate,
  t: Block.Tiles,
  E: Block.Wall,
  R: Block.RoofGreen,
  r: Block.RoofGreenSlab,
  '1': stairsFacing(Block.RoofGreenStairs, 1),
  '3': stairsFacing(Block.RoofGreenStairs, 3),
  S: Block.PlanksStairs,
};

function build(): string[][] {
  const H = ROOF + RIDGE + 3;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: SHOP_D }, () => Array(SHOP_W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < SHOP_W && z >= 0 && z < SHOP_D) grid[y][z][x] = c;
  };
  const onWall = (x: number, z: number) => ((x === WEST || x === EAST) && z >= BACK && z <= FRONT) || ((z === BACK || z === FRONT) && x >= WEST && x <= EAST);
  const corner = (x: number, z: number) => (x === WEST || x === EAST) && (z === BACK || z === FRONT);
  // Suelo de tablones, acera de adoquín y bordillo.
  for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) set(x, 0, z, onWall(x, z) ? 'P' : 't');
  for (const z of [10, 11]) for (let x = 0; x < SHOP_W; x++) set(x, 0, z, 'C');
  for (let x = 0; x < SHOP_W; x++) set(x, 0, 12, 'p');
  // Paredes: vigas en las esquinas, madera, ventanas a los lados.
  for (let y = 1; y <= WALL_TOP; y++) {
    for (let z = BACK; z <= FRONT; z++) {
      for (let x = WEST; x <= EAST; x++) {
        if (!onWall(x, z)) {
          set(x, y, z, '.');
          continue;
        }
        let c = corner(x, z) ? 'L' : 'H';
        if (!corner(x, z) && (x === WEST || x === EAST) && (y === 2 || y === 3) && (z === 3 || z === 7)) c = 'w';
        if (!corner(x, z) && y === WALL_TOP - 1) c = 'L'; // viga a la altura del altillo
        set(x, y, z, c);
      }
    }
  }
  // Fachada: escaparates grandes a los lados de la puerta.
  for (const x of [2, 3, 4, 5, 9, 10, 11, 12]) for (let y = 1; y <= 3; y++) set(x, y, FRONT, 'W');
  set(7, 1, FRONT, 'D');
  set(7, 2, FRONT, 'T');
  for (const x of [6, 8]) set(x, 2, FRONT, 'w');
  // Toldo de rayas sobre el escaparate y la acera.
  for (let x = WEST; x <= EAST; x++) set(x, 4, FRONT + 1, 'A');
  // El altillo: suelo de tablones al fondo y barandilla mirando a la tienda.
  for (let z = BACK + 1; z <= LOFT_FRONT; z++) for (let x = WEST + 1; x < EAST; x++) set(x, LOFT, z, 'P');
  for (let x = STAIR_X + 1; x < EAST; x++) set(x, LOFT + 1, LOFT_FRONT, 'F');
  // Tabique del altillo entre la habitación (oeste) y la sala de muebles (este), con su puerta.
  for (let z = BACK + 1; z <= LOFT_FRONT; z++) for (let y = LOFT + 1; y <= LOFT + 4; y++) set(8, y, z, 'P');
  const [dx, dy, dz] = HALL_SHOWROOM_DOOR;
  set(dx, dy, dz, 'F');
  set(dx, dy + 1, dz, '.');
  // Tejado a dos aguas con la cumbrera de delante atrás: el hastial de la fachada da a la calle con su ventana.
  for (let k = 0; k <= RIDGE; k++) {
    const off = RIDGE - k;
    const y = ROOF + k;
    for (let z = BACK - 1; z <= FRONT + 1; z++) {
      if (off === 0) {
        set(RIDGE, y, z, 'r');
        set(RIDGE, y - 1, z, 'R');
        continue;
      }
      set(RIDGE - off, y, z, '1');
      set(RIDGE + off, y, z, '3');
    }
    // Hastiales de delante y de detrás, y aire por dentro.
    for (let x = RIDGE - off + 1; x <= RIDGE + off - 1; x++) {
      if (y <= WALL_TOP) continue;
      // Entramado: yeso blanco con vigas de madera, como las casas de pueblo.
      for (const z of [BACK, FRONT]) set(x, y, z, z === FRONT && (y === 7 || y === 8) && Math.abs(x - RIDGE) <= 1 ? 'W' : (x - RIDGE) % 3 === 0 || y === 9 ? 'L' : 'E');
      for (let z = BACK + 1; z < FRONT; z++) if (!(y === LOFT && z <= LOFT_FRONT)) set(x, y, z, grid[y][z][x] === ' ' ? '.' : grid[y][z][x]);
    }
  }
  // La escalera al altillo, de z = 8 a z = 4, maciza por debajo; al lado, cajas bajo los escalones.
  for (let i = 0; i < LOFT; i++) {
    const z = FRONT - 1 - i;
    set(STAIR_X, 1 + i, z, 'S');
    for (let y = 1; y <= i; y++) set(STAIR_X, y, z, 'P');
    for (let y = 1; y <= Math.min(i + 1, 3); y++) set(WEST + 1, y, z, 'K');
  }
  set(STAIR_X, LOFT, LOFT_FRONT, '.');
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export const SHOP_HALL: BuildingTemplate = {
  id: 'tienda-2',
  name: 'Tienda',
  legend: LEGEND,
  layers: build(),
  door: DOOR_CELL,
  rooms: [
    { name: 'Tienda', floor: 1, area: [WEST + 1, BACK + 1, EAST - 1, FRONT - 1] },
    { name: 'Casa de Avellana', floor: LOFT + 1, area: [STAIR_X, BACK + 1, 7, LOFT_FRONT] },
    { name: 'Sala de muebles', floor: LOFT + 1, area: [9, BACK + 1, EAST - 1, LOFT_FRONT] },
  ],
  slots: [],
};

/** Mostrador bajo con la caja, estanterías, mesas con lo del día y la habitación del altillo. */
export const HALL_FIXTURES: Fixture[] = [
  // Lámparas colgadas del altillo y del tejado.
  ['lampara_techo', 5, 4, 3, 0], ['lampara_techo', 10, 4, 3, 0], ['lampara_techo', 5, 9, 7, 0], ['lampara_techo', 9, 9, 7, 0],
  ['lampara_techo', 5, 9, 3, 0], ['lampara_techo', 10, 8, 3, 0],
  ['mostrador_bajo', 6, 1, 4, 0], ['caja_mostrador', 7, 1, 4, 0], ['mostrador_bajo', 8, 1, 4, 0],
  ['estanteria', 5, 1, 2, 0], ['estanteria', 6, 1, 2, 0], ['estanteria', 8, 1, 2, 0], ['estanteria', 9, 1, 2, 0],
  ['estanteria', 12, 1, 4, 3], ['estanteria', 12, 1, 5, 3], ['estanteria', 12, 1, 6, 3],
  ['mesa_expositor', 6, 1, 7, 0], ['mesa_expositor', 9, 1, 6, 0],
  ['cesta', 4, 1, 3, 0], ['cesta', 10, 1, 3, 0], ['planta', 12, 1, 8, 0], ['planta', 11, 1, 2, 0],
  // El altillo de Avellana.
  ['cama', 4, LOFT + 1, 2, 0], ['mesita', 5, LOFT + 1, 2, 0], ['alfombra', 5, LOFT + 1, 3, 0], ['armario', 6, LOFT + 1, 2, 0],
  ['silla', 7, LOFT + 1, 4, 3], ['planta', 4, LOFT + 1, 4, 0],
];

export const HALL_KEEPER_SPOT: Cell = [7, 1, 3];
export const HALL_KEEPER_BED: Cell = [4, LOFT + 1, 2];

/** Baldas con lo del día: [x, y, z, dx, dz]. Las estanterías del fondo y de la derecha, y las dos mesas. */
export const HALL_SHELF_SPOTS: [number, number, number, number, number][] = [
  [5.5, 1.4, 2.35, 0, 1], [5.5, 1.72, 2.35, 0, 1], [6.5, 1.4, 2.35, 0, 1], [6.5, 1.72, 2.35, 0, 1],
  [8.5, 1.4, 2.35, 0, 1], [8.5, 1.72, 2.35, 0, 1], [9.5, 1.4, 2.35, 0, 1], [9.5, 1.72, 2.35, 0, 1],
  [12.35, 1.4, 4.5, -1, 0], [12.35, 1.72, 4.5, -1, 0], [12.35, 1.4, 5.5, -1, 0], [12.35, 1.72, 5.5, -1, 0],
  [12.35, 1.4, 6.5, -1, 0], [12.35, 1.72, 6.5, -1, 0],
  [6.5, 1.74, 7.5, 0, 1], [9.5, 1.74, 6.5, 0, 1],
];

/** Escaparate: tres huecos detrás del cristal de la derecha. */
export const HALL_WINDOW_SPOTS: [number, number, number][] = [[10, 1, 8], [11, 1, 8], [12, 1, 7]];

/** La sala de muebles del altillo, para el último nivel. */
export const HALL_SHOWROOM_FIXTURES: Fixture[] = [
  ['sofa', 10, LOFT + 1, 2, 0], ['lampara', 9, LOFT + 1, 2, 0], ['alfombra', 10, LOFT + 1, 3, 0], ['mesa', 11, LOFT + 1, 3, 0], ['silla', 11, LOFT + 1, 4, 2],
  ['planta', 9, LOFT + 1, 4, 0],
];
