// El museo nuevo (v5.2), para las islas nuevas (terreno 3). Más ancho y solo dos plantas, con el espacio bien
// repartido: abajo, la recepción con la escalinata en el centro y una sala a cada lado (fósiles a la izquierda,
// acuario a la derecha); arriba, el insectario y, sobre el pórtico, la terraza mirador. Las piezas no van en
// estructuras de bloques: cada pez tiene su pecera, cada bicho su terrario y cada fósil su vitrina, todos de un
// bloque y a la altura de los ojos. Las salas se abren con las donaciones, como antes (WINGS de museum.ts).
// Aquí está el edificio y dónde va cada cosa; lo que se ve está en game/museum.ts.

import { Block } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { ExhibitSpot } from './museum';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';

/** Ancho (x) y fondo (z) del solar: el edificio, el pórtico y un margen para los aleros. */
export const HALL_W = 21;
export const HALL_D = 21;
/** Capa del suelo de cada planta. */
export const HALL_FLOORS = [0, 6];
/** Capa donde empieza el tejado. */
const ROOF = 11;
/** Fachada (pared de delante) y fondo del edificio, y su pared oeste y este. */
const BACK = 1;
const FRONT = 15;
const WEST = 1;
const EAST = 19;
/** Tabiques entre la recepción y las salas. */
const LEFT_WALL = 6;
const RIGHT_WALL = 14;
/** La escalinata: tres de ancho, sube hacia el fondo desde z = 9 hasta la planta de arriba. */
const STAIR_X = [9, 10, 11];
const STAIR_FOOT = 9;
/** Columnas del pórtico y terraza encima (z = 16 y 17). */
const PORCH = [16, 17];

/** Casilla delante de la puerta (en coordenadas del museo) y respecto al centro de la parcela. */
const DOOR_CELL: Cell = [10, 1, 18];
const CENTER: [number, number] = [10, 10];
export const MUSEUM_HALL_DOOR: Cell = [DOOR_CELL[0] - CENTER[0], DOOR_CELL[1], DOOR_CELL[2] - CENTER[1]];

/** Esquina del museo en el mundo a partir del centro del solar. */
export function museumHallOrigin(plot: { x: number; y: number; z: number }): [number, number, number] {
  return [plot.x - CENTER[0], plot.y, plot.z - CENTER[1]];
}

/** Los cordones de cada sala cerrada (índice de WINGS): las casillas que se vacían al abrirla. */
export function hallBarrierCells(wing: number): Cell[] {
  if (wing === 1) return [10, 11, 12].map((z): Cell => [RIGHT_WALL, 1, z]);
  if (wing === 2) return STAIR_X.map((x): Cell => [x, 1, STAIR_FOOT + 1]);
  if (wing === 3) return [[10, HALL_FLOORS[1] + 1, FRONT]];
  return [];
}

/** Columnas de peceras del acuario (dos peceras por columna, una encima de otra, sobre un zócalo). */
const TANKS: [number, number][] = [
  ...Array.from({ length: 13 }, (_, i): [number, number] => [18, 2 + i]),
  ...Array.from({ length: 7 }, (_, i): [number, number] => [16, 5 + i]),
];
/** Terrarios del insectario, sobre su zócalo, a lo largo de la pared del fondo de arriba. */
const TERRARIUMS: [number, number][] = [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [2, 4], [2, 5]];
/** Vitrinas de los fósiles sueltos. */
const CASES: [number, number][] = [[2, 3], [2, 13], [5, 3], [5, 13]];
/** Tarima del dinosaurio (losas), en el centro de la sala de fósiles. */
const DINO_X = [3, 4];
const DINO_Z = [5, 6, 7, 8, 9, 10];

const LEGEND: Record<string, Block> = {
  Q: Block.PolishedStone,
  q: Block.PolishedSlab,
  M: Block.MuseumWall,
  W: Block.Glass,
  D: Block.Door,
  T: Block.DoorTop,
  S: Block.PolishedStairs,
  F: Block.Fence,
  L: Block.LightBlock,
  B: Block.RoofBlue,
  b: Block.RoofBlueSlab,
  K: Block.PolishedSlate,
  t: Block.Tiles,
  C: Block.Cobble,
  p: Block.StonePath,
};

/**
 * Se dibuja casilla a casilla: grid[capa][z][x]. La puerta mira a +z. Paredes de MuseumWall con pilastras de piedra
 * pulida, zócalo y cornisa; ventanales altos abajo y ventanas arriba; tejado a dos aguas suave, de media en media
 * teja, con la cumbrera de este a oeste.
 */
function build(): string[][] {
  const H = ROOF + 6;
  const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: HALL_D }, () => Array(HALL_W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < HALL_W && z >= 0 && z < HALL_D) grid[y][z][x] = c;
  };
  const inside = (x: number, z: number) => x > WEST && x < EAST && z > BACK && z < FRONT;
  const onWall = (x: number, z: number) => (x === WEST || x === EAST) && z >= BACK && z <= FRONT || (z === BACK || z === FRONT) && x >= WEST && x <= EAST;
  const corner = (x: number, z: number) => (x === WEST || x === EAST) && (z === BACK || z === FRONT);
  // Pilastras cada cuatro bloques (y en las esquinas y junto a la puerta).
  const pilaster = (x: number, z: number) => corner(x, z) || ((z === BACK || z === FRONT) ? (x - WEST) % 3 === 0 : (z - BACK) % 4 === 0);
  // Suelo: baldosas en la recepción, piedra pulida en las salas, y el pórtico y la acera delante.
  for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) set(x, 0, z, x > LEFT_WALL && x < RIGHT_WALL && inside(x, z) ? 't' : 'Q');
  for (const z of PORCH) for (let x = 5; x <= 15; x++) set(x, 0, z, 'Q');
  for (let x = 5; x <= 15; x++) set(x, 0, 18, 'p');
  for (const [i, y0] of HALL_FLOORS.entries()) {
    const top = i === 0 ? HALL_FLOORS[1] - 1 : ROOF - 1;
    if (i > 0) for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) set(x, y0, z, onWall(x, z) ? 'Q' : 'Q');
    for (let y = y0 + 1; y <= top; y++) {
      for (let z = BACK; z <= FRONT; z++) {
        for (let x = WEST; x <= EAST; x++) {
          if (!onWall(x, z)) {
            set(x, y, z, '.');
            continue;
          }
          let c = pilaster(x, z) ? 'Q' : 'M';
          // Zócalo de piedra abajo; ventanales de tres de alto abajo y de dos arriba.
          if (i === 0 && y === 1 && c === 'M') c = 'Q';
          const tall = i === 0 ? y >= 2 && y <= 4 : y >= y0 + 2 && y <= y0 + 3;
          if (c === 'M' && tall) c = 'W';
          set(x, y, z, c);
        }
      }
    }
  }
  // Tabiques de la recepción: columnas y dinteles hacia la sala de fósiles (abierta del todo) y una pared con
  // ventanal hacia el acuario, que se abre por una arcada de tres con su cordón.
  for (let z = BACK + 1; z < FRONT; z++) {
    for (let y = 1; y < HALL_FLOORS[1]; y++) {
      const column = z % 4 === 2;
      set(LEFT_WALL, y, z, column || y === 5 ? 'Q' : '.');
      const arch = z >= 10 && z <= 12 && y <= 3;
      set(RIGHT_WALL, y, z, arch ? '.' : y === 1 || y === 5 || column ? 'Q' : 'W');
    }
  }
  // Puerta de entrada con su marco, y la de la terraza arriba.
  set(10, 1, FRONT, 'D');
  set(10, 2, FRONT, 'T');
  for (const x of [9, 11]) for (let y = 1; y <= 3; y++) set(x, y, FRONT, 'Q');
  const up = HALL_FLOORS[1];
  set(10, up + 1, FRONT, 'F');
  set(10, up + 2, FRONT, '.');
  // Pórtico: cuatro columnas que sujetan la terraza; la terraza con su barandilla.
  for (const x of [5, 8, 12, 15]) for (let y = 1; y < up; y++) set(x, y, 17, 'Q');
  for (const z of PORCH) for (let x = 5; x <= 15; x++) set(x, up, z, 'Q');
  for (let x = 5; x <= 15; x++) set(x, up + 1, 17, 'F');
  for (const z of PORCH) for (const x of [5, 15]) set(x, up + 1, z, 'F');
  // Cornisa: una franja de piedra pulida a la altura del suelo de arriba, por fuera.
  for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) if (onWall(x, z)) set(x, up, z, 'Q');
  // Acuario: zócalo oscuro bajo cada columna de peceras (las peceras son muebles, en game/museum.ts).
  for (const [x, z] of TANKS) set(x, 1, z, 'K');
  // Sala de fósiles: tarima de losas para el dinosaurio.
  for (const x of DINO_X) for (const z of DINO_Z) set(x, 1, z, 'q');
  // Insectario: zócalo bajo cada terrario.
  for (const [x, z] of TERRARIUMS) set(x, up + 1, z, 'K');
  // Tejado a dos aguas de media en media teja: del alero (z = 0 y z = 16) a la cumbrera (z = 8).
  for (let z = 0; z <= FRONT + 1; z++) {
    const d = Math.min(z, FRONT + 1 - z);
    const layer = ROOF + Math.floor(d / 2);
    const half = d % 2 === 0;
    for (let x = WEST; x <= EAST; x++) {
      set(x, layer, z, half ? 'b' : 'B');
      // Hastiales al este y al oeste: pared hasta el tejado.
      if (x === WEST || x === EAST) for (let y = ROOF; y < layer; y++) if (z > BACK && z < FRONT) set(x, y, z, y === ROOF + 2 && Math.abs(z - 8) <= 1 ? 'W' : 'M');
    }
  }
  // La escalinata y su hueco, al final para que no la tape ningún suelo; maciza por debajo.
  for (const x of STAIR_X) {
    for (let i = 0; i < up; i++) {
      const z = STAIR_FOOT - i;
      set(x, 1 + i, z, 'S');
      for (let y = 1; y <= i; y++) set(x, y, z, 'Q');
    }
    for (let z = STAIR_FOOT - up + 2; z <= STAIR_FOOT; z++) set(x, up, z, '.');
  }
  // Barandillas a los lados de la escalinata (abajo) y alrededor de su hueco (arriba).
  for (let z = STAIR_FOOT - up + 2; z <= STAIR_FOOT; z++) for (const x of [8, 12]) set(x, 1, z, 'F');
  for (let z = STAIR_FOOT - up + 2; z <= STAIR_FOOT + 1; z++) for (const x of [8, 12]) set(x, up + 1, z, 'F');
  for (const x of STAIR_X) set(x, up + 1, STAIR_FOOT + 1, 'F');
  // Cordones de las salas cerradas.
  for (let w = 1; w <= 3; w++) for (const [x, y, z] of hallBarrierCells(w)) set(x, y, z, 'F');
  return grid.map((layer) => layer.map((row) => row.join('')));
}

export const MUSEUM_HALL: BuildingTemplate = {
  id: 'museo-2',
  name: 'Museo',
  legend: LEGEND,
  layers: build(),
  door: DOOR_CELL,
  rooms: [
    { name: 'Sala de fósiles', floor: 1, area: [WEST + 1, BACK + 1, LEFT_WALL - 1, FRONT - 1] },
    { name: 'Acuario', floor: 1, area: [RIGHT_WALL + 1, BACK + 1, EAST - 1, FRONT - 1] },
    { name: 'Insectario', floor: HALL_FLOORS[1] + 1, area: [WEST + 1, BACK + 1, EAST - 1, FRONT - 1] },
    { name: 'Terraza mirador', floor: HALL_FLOORS[1] + 1, area: [6, 16, 14, 17] },
  ],
  slots: [],
};

/** Dónde espera la conservadora: detrás del mostrador de la entrada, mirando a la puerta. */
export const CURATOR_SPOT: Cell = [13, 1, 11];

/** Muebles fijos del museo: mostrador, peceras, terrarios, vitrinas, bancos, paneles, cordones y la terraza. */
export const HALL_FIXTURES: Fixture[] = [
  // Lámparas colgadas del techo de abajo y del tejado de arriba.
  ...[[3, 3], [3, 12], [10, 12], [16, 3], [16, 13], [15, 8], [7, 6], [13, 6], [10, 2]].map(([x, z]): Fixture => ['lampara_techo', x, HALL_FLOORS[1] - 1, z, 0]),
  ...[[4, 4], [16, 4], [4, 12], [16, 12], [10, 12]].map(([x, z]): Fixture => ['lampara_techo', x, ROOF + 1, z, 0]),
  ['mostrador_museo', 13, 1, 12, 0],
  ...TANKS.flatMap(([x, z]): Fixture[] => [['pecera', x, 2, z, 3], ['pecera', x, 3, z, 3]]),
  ...TERRARIUMS.map(([x, z]): Fixture => ['terrario', x, HALL_FLOORS[1] + 2, z, 0]),
  ...CASES.map(([x, z]): Fixture => ['vitrina', x, 1, z, 0]),
  // Recepción.
  ['banco', 7, 1, 12, 1], ['banco', 13, 1, 8, 3], ['planta', 7, 1, 14, 0], ['planta', 13, 1, 14, 0],
  ['panel_info', 7, 1, 9, 1], ['panel_info', 13, 1, 4, 3], ['cordon', 7, 1, 2, 0], ['cordon', 13, 1, 2, 0],
  // Sala de fósiles: cordón alrededor del dinosaurio y su panel.
  ['cordon', 3, 1, 4, 0], ['cordon', 4, 1, 4, 0], ['cordon', 3, 1, 11, 0], ['cordon', 4, 1, 11, 0], ['panel_info', 5, 1, 7, 3],
  // Acuario: un banco para mirar los peces.
  ['banco', 15, 1, 13, 0], ['panel_info', 15, 1, 3, 1],
  // Insectario: plantas, bancos y cuadros.
  ['planta', 2, 7, 13, 0], ['planta', 18, 7, 13, 0], ['planta', 18, 7, 3, 0], ['planta', 2, 7, 7, 0],
  ['banco', 5, 7, 8, 1], ['banco', 15, 7, 8, 3], ['banco', 5, 7, 11, 1], ['banco', 15, 7, 11, 3],
  ['cuadro', 18, 7, 6, 3], ['cuadro', 18, 7, 10, 3], ['cuadro', 2, 7, 10, 1],
  ['panel_info', 10, 7, 13, 2],
  // Terraza mirador: bancos y el catalejo mirando al pueblo.
  ['banco', 7, 7, 16, 0], ['banco', 13, 7, 16, 0], ['catalejo_pie', 10, 7, 17, 0], ['planta', 6, 7, 16, 0], ['planta', 14, 7, 16, 0],
];

/** El hueco de cada pez, insecto o fósil (centro con decimales y caja por la que se mueve). */
export function hallExhibitSpot(kind: 'pez' | 'bicho' | 'fosil', index: number, dino: number): ExhibitSpot & { size?: number } {
  if (kind === 'fosil') {
    if (dino >= 0) return { at: [4, 2.2, 5.9 + dino * 1.6] };
    const [x, z] = CASES[index % CASES.length];
    return { at: [x + 0.5, 1.94, z + 0.5], size: 0.42 };
  }
  if (kind === 'pez') {
    const [x, z] = TANKS[Math.floor(index / 2) % TANKS.length];
    const y = 2 + (index % 2);
    return { at: [x + 0.5, y + 0.5, z + 0.5], box: [x + 0.18, y + 0.28, z + 0.18, x + 0.82, y + 0.82, z + 0.82], size: 0.42 };
  }
  const [x, z] = TERRARIUMS[index % TERRARIUMS.length];
  const y = HALL_FLOORS[1] + 2;
  return { at: [x + 0.5, y + 0.55, z + 0.5], box: [x + 0.2, y + 0.3, z + 0.2, x + 0.8, y + 0.85, z + 0.8], size: 0.34 };
}
