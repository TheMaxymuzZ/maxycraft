// La tienda nueva (v4.16). Sustituye a la casita de la tienda, en el mismo sitio y también en las partidas de
// antes (se genera con la isla). Abajo, la tienda con su escaparate, el mostrador, la caja y las estanterías con
// lo que hay hoy; arriba, la casa de Avellana y la sala de muebles, que se abre al llegar al último nivel. Aquí
// está el edificio, los niveles y dónde va cada mueble; lo que se ve está en game/shopFront.ts.

import { Block } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { Cell } from './pathfind';
import type { Season } from './seasons';

/** Lado del solar (cabe justo en la parcela de la tienda), planta de arriba y altura del techo. */
export const SHOP_SIZE = 11;
export const UPPER_FLOOR = 5;
const ROOF = 9;

export interface ShopLevel {
  name: string;
  /** Bayas gastadas en la tienda (en total) para llegar a este nivel. */
  spent: number;
  /** Lo que trae (los muebles y cosas de más salen de perLevel en la ficha de la tienda, economy.ts). */
  text: string;
}

export const SHOP_LEVELS: ShopLevel[] = [
  { name: 'Tienda de Avellana', spent: 0, text: 'Herramientas, lo de siempre, 3 muebles y 5 cosas sueltas al día.' },
  { name: 'Tienda grande', spent: 20_000, text: '5 muebles y 7 cosas sueltas al día.' },
  { name: 'Gran almacén', spent: 80_000, text: 'Abre la sala de muebles de arriba: 7 muebles y 9 cosas sueltas al día.' },
];

/** Nivel de la tienda (índice de SHOP_LEVELS) con tanto gastado. */
export function shopLevel(spent: number): number {
  let n = 0;
  SHOP_LEVELS.forEach((l, i) => {
    if (spent >= l.spent) n = i;
  });
  return n;
}

/** El cordón de la sala de muebles (la puerta del tabique de arriba) y las dos casillas de la puerta. */
export const SHOWROOM_DOOR: Cell = [5, UPPER_FLOOR + 1, 4];

const LEGEND: Record<string, Block> = {
  P: Block.Planks,
  H: Block.ShopWall,
  L: Block.Log,
  W: Block.Glass,
  w: Block.Window,
  D: Block.Door,
  T: Block.DoorTop,
  S: Block.PlanksStairs,
  F: Block.Fence,
  C: Block.Cobble,
  A: Block.Awning,
  R: Block.RoofGreen,
  I: Block.LightBlock,
};

/**
 * Se dibuja casilla a casilla: grid[capa][z][x]. La fachada mira a +z (z = 8) con el escaparate a los lados de
 * la puerta; delante hay acera con toldo (z = 9 y 10). La escalera sube pegada a la pared oeste (x = 1) de z = 6
 * a z = 2 y llega a la casa de Avellana, detrás del tabique de arriba (z = 4).
 */
function build(): string[][] {
  const N = SHOP_SIZE;
  const H = ROOF + 5;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: N }, () => Array(N).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < N && z >= 0 && z < N) grid[y][z][x] = c;
  };
  const FRONT = 8;
  const corner = (x: number, z: number) => (x === 0 || x === N - 1) && (z === 0 || z === FRONT);
  const wall = (x: number, z: number) => x === 0 || x === N - 1 || z === 0 || z === FRONT;
  // Suelo de madera y acera de adoquín.
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) set(x, 0, z, z > FRONT ? 'C' : 'P');
  for (const [y0, top] of [[0, 4], [UPPER_FLOOR, 8]]) {
    if (y0 > 0) for (let z = 0; z <= FRONT; z++) for (let x = 0; x < N; x++) set(x, y0, z, 'P');
    for (let y = y0 + 1; y <= top; y++) {
      for (let z = 0; z <= FRONT; z++) {
        for (let x = 0; x < N; x++) {
          if (!wall(x, z)) set(x, y, z, '.');
          else if (corner(x, z)) set(x, y, z, 'L');
          else if (z !== FRONT && y === y0 + 2 && (x + z) % 3 === 1) set(x, y, z, 'w');
          else set(x, y, z, 'H');
        }
      }
    }
  }
  // Fachada: escaparates a los dos lados de la puerta y ventanas arriba.
  for (const x of [1, 2, 3, 7, 8, 9]) for (let y = 1; y <= 3; y++) set(x, y, FRONT, 'W');
  set(5, 1, FRONT, 'D');
  set(5, 2, FRONT, 'T');
  for (const x of [2, 3, 7, 8]) for (let y = UPPER_FLOOR + 1; y <= UPPER_FLOOR + 2; y++) set(x, y, FRONT, 'W');
  // Toldo de rayas sobre la acera.
  for (let x = 1; x < N - 1; x++) {
    set(x, 4, FRONT + 1, 'A');
    set(x, 3, FRONT + 2, 'A');
  }
  // Luces del techo de la tienda y de arriba.
  for (const [x, z] of [[4, 6], [8, 6], [6, 2]]) set(x, 4, z, 'I');
  for (const [x, z] of [[5, 2], [6, 6]]) set(x, 8, z, 'I');
  // Arriba: tabique entre la casa (detrás) y la sala de muebles (delante), con la puerta cerrada por un cordón.
  for (let x = 2; x < N - 1; x++) for (let y = UPPER_FLOOR + 1; y <= 8; y++) set(x, y, 4, 'P');
  const [dx, dy, dz] = SHOWROOM_DOOR;
  set(dx, dy, dz, 'F');
  set(dx, dy + 1, dz, '.');
  // Tejado a cuatro aguas, hueco por dentro.
  for (let k = 0; k <= 4; k++) {
    for (let z = k - 1; z <= FRONT + 1 - k; z++) {
      for (let x = k - 1; x <= N - k; x++) {
        const edge = x === k - 1 || x === N - k || z === k - 1 || z === FRONT + 1 - k;
        if (k === 0 || edge || k === 4) set(x, ROOF + k, z, 'R');
      }
    }
  }
  // La escalera y su barandilla, al final para que no la tape ningún suelo.
  for (let z = 2; z <= 6; z++) {
    set(2, 1, z, 'F');
    set(2, UPPER_FLOOR + 1, z, z === 2 ? '.' : 'F');
  }
  for (let z = 3; z <= 6; z++) set(1, UPPER_FLOOR, z, '.');
  for (let i = 0; i < 5; i++) set(1, 1 + i, 6 - i, 'S');
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export const SHOP_BUILDING: BuildingTemplate = {
  id: 'tienda',
  name: 'Tienda',
  legend: LEGEND,
  layers: build(),
  door: [5, 1, 9],
  rooms: [
    { name: 'Tienda', floor: 1, area: [3, 5, 9, 7] },
    { name: 'Casa de Avellana', floor: UPPER_FLOOR + 1, area: [1, 1, 9, 3] },
    { name: 'Sala de muebles', floor: UPPER_FLOOR + 1, area: [3, 5, 9, 7] },
  ],
  slots: [],
};

/** Un mueble fijo del edificio: id, casilla (en coordenadas de la tienda) y giro (0: mira a +z). */
export type Fixture = [string, number, number, number, number];

/** Lo que hay siempre: mostrador con la caja, y la casa de Avellana. */
export const SHOP_FIXTURES: Fixture[] = [
  ['mostrador', 4, 1, 4, 0], ['mostrador', 5, 1, 4, 0], ['caja_registradora', 6, 1, 4, 0], ['mostrador', 7, 1, 4, 0], ['mostrador', 8, 1, 4, 0],
  ['estanteria', 9, 1, 5, 3], ['estanteria', 9, 1, 6, 3],
  ['estanteria', 3, 1, 1, 0], ['estanteria', 4, 1, 1, 0], ['estanteria', 8, 1, 1, 0], ['estanteria', 9, 1, 1, 0],
  ['planta', 3, 1, 7, 0],
  // Arriba, la casa.
  ['cama', 8, 6, 1, 0], ['mesa', 4, 6, 2, 0], ['silla', 4, 6, 3, 2], ['lampara', 9, 6, 3, 0], ['alfombra', 6, 6, 2, 0], ['planta', 3, 6, 1, 0],
];

/** Sitio de Avellana detrás del mostrador y su cama. */
export const SHOPKEEPER_SPOT: Cell = [6, 1, 3];
export const SHOPKEEPER_BED: Cell = [8, 6, 1];

/** Estanterías donde se ve lo que hay hoy: [x, y, z] del centro de cada balda y hacia dónde mira (dx, dz). */
export const SHELF_SPOTS: [number, number, number, number, number][] = [
  [9.35, 1.4, 5.5, -1, 0], [9.35, 1.72, 5.5, -1, 0], [9.35, 1.4, 6.5, -1, 0], [9.35, 1.72, 6.5, -1, 0],
  [3.5, 1.4, 1.35, 0, 1], [3.5, 1.72, 1.35, 0, 1], [4.5, 1.4, 1.35, 0, 1], [4.5, 1.72, 1.35, 0, 1],
  [8.5, 1.4, 1.35, 0, 1], [8.5, 1.72, 1.35, 0, 1], [9.5, 1.4, 1.35, 0, 1], [9.5, 1.72, 1.35, 0, 1],
];

/** El escaparate: tres huecos detrás del cristal de la derecha. */
export const WINDOW_SPOTS: [number, number, number][] = [[7, 1, 7], [8, 1, 7], [9, 1, 7]];

/** Lo que pone Avellana en el escaparate en cada estación (y en las fiestas, lo de la fiesta). */
export const WINDOW_DISPLAY: Record<Season, string[]> = {
  primavera: ['macetero', 'silla', 'planta'],
  verano: ['banco', 'planta', 'farol'],
  otoño: ['barril', 'alfombra', 'farol'],
  invierno: ['lampara', 'sofa', 'cama'],
};

export function windowDisplay(season: Season | null, holiday: string | null): string[] {
  const base = [...WINDOW_DISPLAY[season ?? 'primavera']];
  if (holiday === 'halloween') base[1] = 'calabaza';
  if (holiday === 'navidad') base[1] = 'arbol_navidad';
  return base;
}

/** La sala de muebles de arriba, para el último nivel. */
export const SHOWROOM_FIXTURES: Fixture[] = [
  ['sofa', 4, 6, 6, 2], ['lampara', 3, 6, 5, 0], ['alfombra', 5, 6, 6, 0], ['mesa', 7, 6, 6, 0], ['silla', 8, 6, 6, 3],
  ['estanteria', 9, 6, 5, 3], ['planta', 9, 6, 7, 0],
];

/** Esquina de la tienda en el mundo a partir del centro del solar. */
export function shopOrigin(plot: { x: number; y: number; z: number }): [number, number, number] {
  return [plot.x - 5, plot.y, plot.z - 5];
}
