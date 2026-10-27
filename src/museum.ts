// El museo de varias plantas (v4.15). Sustituye a la casita del museo, en el mismo sitio y también en las
// partidas de antes (se genera con la isla). Planta baja con los fósiles, primera planta con el acuario,
// segunda con el insectario y una terraza mirador con cúpula de cristal. Las plantas de arriba se abren al
// llegar a cierto número de donaciones. Aquí está el edificio y dónde va cada pieza; lo que se ve está en
// game/museum.ts.

import { Block } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { Cell } from './pathfind';

/** Lado del solar (cabe justo en una parcela de la isla) y altura de cada planta. */
export const MUSEUM_SIZE = 11;
export const FLOOR_HEIGHT = 5;
/** Capa del suelo de cada planta: baja, primera, segunda y terraza. */
export const FLOORS = [0, 5, 10, 15];

export interface MuseumWing {
  name: string;
  /** Donaciones que hacen falta para que se abra. */
  opens: number;
  text: string;
}

export const WINGS: MuseumWing[] = [
  { name: 'Sala de fósiles', opens: 0, text: 'La recepción y los fósiles, con el esqueleto de dinosaurio en el centro.' },
  { name: 'Acuario', opens: 3, text: 'Un tanque de agua de pared a pared donde nadan los peces donados.' },
  { name: 'Insectario', opens: 8, text: 'Un terrario con hierba y flores donde revolotean los insectos donados.' },
  { name: 'Terraza mirador', opens: 15, text: 'Lo más alto de la isla, con una cúpula de cristal. Se ve todo el pueblo.' },
];

/** Planta (índice en WINGS) que se ha abierto ya con tantas donaciones. */
export function openWings(donated: number): number {
  let n = 0;
  WINGS.forEach((w, i) => {
    if (donated >= w.opens) n = i;
  });
  return n;
}

/** El cordón que cierra la escalera de cada planta aún cerrada: casilla del pie de la escalera de la planta de abajo. */
export function barrierCell(wing: number): Cell {
  return [1, FLOORS[wing - 1] + 1, 8];
}

const LEGEND: Record<string, Block> = {
  Q: Block.PolishedStone,
  M: Block.MuseumWall,
  C: Block.Cobble,
  W: Block.Glass,
  D: Block.Door,
  T: Block.DoorTop,
  S: Block.CobbleStairs,
  F: Block.Fence,
  A: Block.Water,
  G: Block.Grass,
  r: Block.FlowerRed,
  y: Block.FlowerYellow,
  h: Block.TallGrass,
  L: Block.LightBlock,
  B: Block.RoofBlue,
  P: Block.Planks,
};

/**
 * Se dibuja casilla a casilla: grid[capa][z][x]. La puerta mira a +z (z = 9) y delante hay un porche con
 * escalinata y dos columnas (z = 10). La escalera sube pegada a la pared oeste (x = 1) de z = 7 a z = 3, y las
 * de cada planta van una encima de otra.
 */
function build(): string[][] {
  const N = MUSEUM_SIZE;
  const H = FLOORS[3] + 4;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: N }, () => Array(N).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < N && z >= 0 && z < N) grid[y][z][x] = c;
  };
  const wall = (x: number, z: number) => x === 0 || x === N - 1 || z === 0 || z === N - 2;
  const corner = (x: number, z: number) => (x === 0 || x === N - 1) && (z === 0 || z === N - 2);
  for (let f = 0; f < 3; f++) {
    const y0 = FLOORS[f];
    // Suelo (el de la planta baja también por el porche) y paredes con ventanas.
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (z < N - 1 || f === 0) set(x, y0, z, z === N - 1 ? 'C' : 'Q');
    for (let y = y0 + 1; y < y0 + FLOOR_HEIGHT; y++) {
      for (let z = 0; z < N - 1; z++) {
        for (let x = 0; x < N; x++) {
          if (!wall(x, z)) {
            set(x, y, z, '.');
            continue;
          }
          const window = (y === y0 + 2 || y === y0 + 3) && !corner(x, z) && ((x + z) % 2 === 1);
          set(x, y, z, corner(x, z) ? 'Q' : window ? 'W' : 'M');
        }
      }
    }
    // Barandilla de la escalera (la escalera y su hueco se ponen al final, cuando ya están todos los suelos).
    for (let z = 3; z <= 7; z++) set(2, y0 + 1, z, 'F');
    // Luces en el techo.
    for (const [x, z] of [[5, 2], [5, 6], [8, 4]]) set(x, y0 + 4, z, 'L');
  }
  // Cordones al pie de las escaleras de las plantas que aún están cerradas (se quitan al abrirlas).
  for (let w = 1; w < WINGS.length; w++) {
    const [x, y, z] = barrierCell(w);
    set(x, y, z, 'F');
  }
  // Puerta y porche con dos columnas y cornisa.
  set(5, 1, 9, 'D');
  set(5, 2, 9, 'T');
  for (const x of [1, 9]) for (let y = 1; y <= 4; y++) set(x, y, 10, 'Q');
  for (let x = 0; x < N; x++) set(x, 5, 10, 'B');
  // Planta baja: pedestales para los fósiles junto a las paredes y uno largo en el centro para el dinosaurio.
  for (const [x, z] of PEDESTALS) set(x, 1, z, 'Q');
  for (let x = 4; x <= 6; x++) set(x, 1, 4, 'Q');
  // Primera planta: el tanque del acuario, de cristal, pegado a la pared este.
  for (let y = 6; y <= 9; y++) for (let z = 1; z <= 8; z++) set(7, y, z, 'W');
  for (let z = 1; z <= 8; z++) {
    for (let x = 8; x <= 9; x++) {
      for (let y = 6; y <= 8; y++) set(x, y, z, 'A');
      set(x, 9, z, 'W');
    }
  }
  // Segunda planta: el terrario con hierba y flores.
  for (let y = 11; y <= 14; y++) for (let z = 1; z <= 8; z++) set(7, y, z, 'W');
  for (let z = 1; z <= 8; z++) {
    for (let x = 8; x <= 9; x++) {
      set(x, 11, z, 'G');
      set(x, 12, z, (x + z) % 3 === 0 ? 'r' : (x + z) % 3 === 1 ? 'y' : 'h');
      set(x, 13, z, '.');
      set(x, 14, z, 'W');
    }
  }
  // Terraza: suelo, barandilla alrededor y cúpula de cristal en el centro.
  const t = FLOORS[3];
  for (let z = 0; z < N - 1; z++) for (let x = 0; x < N; x++) set(x, t, z, 'Q');
  for (let z = 0; z < N - 1; z++) {
    for (let x = 0; x < N; x++) {
      if (wall(x, z)) set(x, t + 1, z, 'F');
    }
  }
  for (let z = 3; z <= 7; z++) set(2, t + 1, z, 'F');
  for (let z = 3; z <= 7; z++) {
    for (let x = 4; x <= 8; x++) {
      const edge = x === 4 || x === 8 || z === 3 || z === 7;
      if (edge) {
        set(x, t + 1, z, 'W');
        set(x, t + 2, z, 'W');
      }
      if (x > 4 && x < 8 && z > 3 && z < 7) set(x, t + 3, z, 'W');
    }
  }
  set(6, t + 1, 5, 'L');
  // Las escaleras, de z = 7 a z = 3: el último peldaño queda a la altura del suelo de arriba.
  for (let f = 0; f < 3; f++) {
    for (let z = 4; z <= 7; z++) set(1, FLOORS[f + 1], z, '.');
    for (let i = 0; i < 5; i++) set(1, FLOORS[f] + 1 + i, 7 - i, 'S');
  }
  return grid.map((layer) => layer.map((row) => row.join('')));
}

/** Pedestales de los fósiles sueltos: [x, z] en la planta baja. */
const PEDESTALS: [number, number][] = [[3, 1], [5, 1], [7, 1], [9, 2], [9, 4], [9, 6]];

export const MUSEUM: BuildingTemplate = {
  id: 'museo',
  name: 'Museo',
  legend: LEGEND,
  layers: build(),
  door: [5, 1, 10],
  rooms: WINGS.map((w, i) => ({ name: w.name, floor: FLOORS[i] + 1, area: [1, 1, 9, 8] as [number, number, number, number] })),
  slots: [],
};

/** Dónde se ve cada cosa donada, en coordenadas del museo (con decimales: el centro de la pieza). */
export interface ExhibitSpot {
  /** Centro. */
  at: [number, number, number];
  /** Caja por la que puede moverse (peces e insectos): [x0, y0, z0, x1, y1, z1]. */
  box?: [number, number, number, number, number, number];
}

/** El hueco de cada fósil, pez o insecto. Los fósiles sueltos van en pedestales; el dinosaurio, en el centro. */
export function exhibitSpot(kind: 'pez' | 'bicho' | 'fosil', index: number, dino: number): ExhibitSpot {
  if (kind === 'fosil') {
    if (dino >= 0) return { at: [4.5 + dino, 2.6, 4.5] };
    const [x, z] = PEDESTALS[index % PEDESTALS.length];
    return { at: [x + 0.5, 2.5, z + 0.5] };
  }
  // Los peces y los insectos se reparten a lo largo de su tanque o su terrario.
  const z = 1.4 + ((index * 2.3) % 7.2);
  if (kind === 'pez') return { at: [9, 7.4, z], box: [8.2, 6.2, 1.2, 9.8, 8.8, 8.8] };
  return { at: [9, 12.6, z], box: [8.2, 12.1, 1.2, 9.8, 13.8, 8.8] };
}

/** Esquina del museo en el mundo a partir del centro del solar. */
export function museumOrigin(plot: { x: number; y: number; z: number }): [number, number, number] {
  return [plot.x - 5, plot.y, plot.z - 5];
}
