// El museo nuevo (v5.2), para las islas nuevas (terreno 3). Solo dos plantas, con el espacio bien repartido: abajo,
// la recepción con la escalinata en el centro y una sala a cada lado (fósiles a la izquierda, acuario a la derecha);
// arriba, el insectario en una galería alrededor de un patio de doble altura con lucernario y, sobre el pórtico, la
// terraza mirador. Las piezas no van en estructuras de bloques: cada pez tiene su pecera, cada bicho su terrario y
// cada fósil su vitrina, todos de un bloque y a la altura de los ojos. Las salas se abren con las donaciones, como
// antes (WINGS de museum.ts). Aquí está el edificio y dónde va cada cosa; lo que se ve está en game/museum.ts.
//
// v5.11: vuelve a la altura de la v5.2 (la de la v5.9 era demasiado alta) y hay dos tamaños: el de siempre, para las
// islas de antes, y uno grande que ocupa mucho más suelo, para las islas nuevas (terreno 5, parcela más grande).

import { Block } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { ExhibitSpot } from './museum';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';

/** Medio lado de la parcela del museo de siempre (v5.2) y del grande (v5.11). */
export const MUSEUM_HALF = 9;
export const MUSEUM_HALF_BIG = 13;

/** Capa del suelo de cada planta (v5.11: como en la v5.2, la de abajo de 5 de alto). */
export const HALL_FLOORS = [0, 6];
/** Capa donde empieza el tejado. */
const ROOF = 11;
const BACK = 1;
const WEST = 1;

/** Lo que cambia entre el museo de siempre y el grande. */
interface Size {
  /** Ancho (x) y fondo (z) del solar: el edificio, el pórtico y un margen para los aleros. */
  w: number;
  d: number;
  /** Fachada (pared de delante). La de atrás y la oeste están en 1, la este en w - 2. */
  front: number;
  /** Columnas entre la recepción y las salas (las salas quedan abiertas al patio). */
  left: number;
  right: number;
  /** Pie de la escalinata (sube hacia el fondo). */
  stairFoot: number;
  /** Medio ancho del pórtico y de dónde a dónde va la tarima del dinosaurio. */
  porch: number;
  dinoX: number[];
  dinoZ: number[];
  /** Cada cuántos bloques el tejado sube media teja (2: como la v5.2; 3: más tendido, para que no suba tanto). */
  slope: number;
  tanks: [number, number][];
  terrariums: [number, number][];
  cases: [number, number][];
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const NORMAL: Size = {
  w: 21, d: 21, front: 15, left: 6, right: 14, stairFoot: 12, porch: 5,
  dinoX: [3, 4], dinoZ: range(5, 10), slope: 2,
  // Columnas de peceras (dos por columna): a lo largo de la pared este y una fila más dentro.
  tanks: [...range(2, 14).map((z): [number, number] => [18, z]), ...range(5, 11).map((z): [number, number] => [16, z])],
  terrariums: [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [2, 4], [2, 5]],
  cases: [[2, 3], [2, 13], [5, 3], [5, 13]],
};

const BIG: Size = {
  w: 29, d: 27, front: 21, left: 9, right: 19, stairFoot: 13, porch: 7,
  dinoX: [4, 5, 6], dinoZ: range(8, 13), slope: 3,
  // Una pared entera de peceras y una isla de peceras en medio del acuario, con pasillo a los dos lados.
  tanks: [...range(4, 16).map((z): [number, number] => [26, z]), ...range(7, 13).map((z): [number, number] => [23, z])],
  terrariums: [...range(3, 9).map((x): [number, number] => [x, 2]), ...range(19, 25).map((x): [number, number] => [x, 2])],
  cases: [[2, 3], [2, 19], [8, 3], [8, 19]],
};

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

/** Dónde va todo en un museo de un tamaño. Las casillas, en coordenadas del museo (esquina del solar). */
export interface MuseumLayout {
  big: boolean;
  half: number;
  template: BuildingTemplate;
  /** Casilla delante de la puerta, respecto al centro de la parcela. */
  door: Cell;
  center: [number, number];
  fixtures: Fixture[];
  /** Dónde espera la conservadora: detrás del mostrador de la entrada, mirando a la puerta. */
  curator: Cell;
  /** Los cordones de cada sala cerrada (índice de WINGS): las casillas que se vacían al abrirla. */
  barrierCells(wing: number): Cell[];
  /** El hueco de cada pez, insecto o fósil (centro con decimales y caja por la que se mueve). */
  exhibitSpot(kind: 'pez' | 'bicho' | 'fosil', index: number, dino: number): ExhibitSpot & { size?: number };
}

function makeLayout(s: Size, big: boolean): MuseumLayout {
  const { w: W, d: D, front: FRONT, left: LEFT_WALL, right: RIGHT_WALL, stairFoot: STAIR_FOOT } = s;
  const EAST = W - 2;
  const MID = (W - 1) / 2;
  const up = HALL_FLOORS[1];
  const UP = up + 1;
  const STAIR_X = [MID - 1, MID, MID + 1];
  /** El patio central, abierto hasta el lucernario: [x0, z0, x1, z1]. La escalinata llega a la galería del fondo. */
  const ATRIUM = [LEFT_WALL + 1, STAIR_FOOT - up + 1, RIGHT_WALL - 1, FRONT - 3];
  /** Columnas del pórtico y terraza encima. */
  const PORCH = [FRONT + 1, FRONT + 2];
  const ARCH = [FRONT - 5, FRONT - 3];
  /** Fila del tejado: capa y si es media teja, a una distancia d del alero. */
  const roofAt = (z: number) => {
    const d = Math.min(z, FRONT + 1 - z);
    const n = Math.floor((d * 2) / s.slope);
    return { layer: ROOF + Math.floor(n / 2), half: n % 2 === 0 };
  };
  const inAtrium = (x: number, z: number) => x >= ATRIUM[0] && x <= ATRIUM[2] && z >= ATRIUM[1] && z <= ATRIUM[3];
  const barrierCells = (wing: number): Cell[] => {
    if (wing === 1) return range(ARCH[0], ARCH[1]).map((z): Cell => [RIGHT_WALL, 1, z]);
    if (wing === 2) return STAIR_X.map((x): Cell => [x, 1, STAIR_FOOT + 1]);
    if (wing === 3) return [[MID, UP, FRONT]];
    return [];
  };

  /**
   * Se dibuja casilla a casilla: grid[capa][z][x]. La puerta mira a +z. Paredes de MuseumWall con pilastras de
   * piedra pulida y zócalo; ventanales de tres de alto abajo y de dos arriba; dentro, un patio central de doble
   * altura con la escalinata, una galería alrededor (el insectario) y un lucernario de cristal en la cumbrera.
   */
  function build(): string[][] {
    const H = ROOF + 8;
    const grid: string[][][] = Array.from({ length: H }, () => Array.from({ length: D }, () => Array(W).fill(' ')));
    const set = (x: number, y: number, z: number, c: string) => {
      if (y >= 0 && y < H && x >= 0 && x < W && z >= 0 && z < D) grid[y][z][x] = c;
    };
    const inside = (x: number, z: number) => x > WEST && x < EAST && z > BACK && z < FRONT;
    const onWall = (x: number, z: number) => (x === WEST || x === EAST) && z >= BACK && z <= FRONT || (z === BACK || z === FRONT) && x >= WEST && x <= EAST;
    const corner = (x: number, z: number) => (x === WEST || x === EAST) && (z === BACK || z === FRONT);
    // Pilastras cada tres bloques en la fachada y el fondo, y cada cuatro en los lados.
    const pilaster = (x: number, z: number) => corner(x, z) || ((z === BACK || z === FRONT) ? (x - WEST) % 3 === 0 : (z - BACK) % 4 === 0);
    // Suelo: baldosas en la recepción, piedra pulida en las salas, y el pórtico y la acera delante.
    for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) set(x, 0, z, x > LEFT_WALL && x < RIGHT_WALL && inside(x, z) ? 't' : 'Q');
    for (const z of PORCH) for (let x = MID - s.porch; x <= MID + s.porch; x++) set(x, 0, z, 'Q');
    for (let x = MID - s.porch; x <= MID + s.porch; x++) set(x, 0, FRONT + 3, 'p');
    for (const [i, y0] of HALL_FLOORS.entries()) {
      const top = i === 0 ? up - 1 : ROOF - 1;
      // La galería de arriba: todo menos el patio.
      if (i > 0) for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) if (onWall(x, z) || !inAtrium(x, z)) set(x, y0, z, 'Q');
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
    // Las salas de abajo se abren a la recepción: columnas y una viga bajo la galería. Hacia el acuario, un ventanal
    // (los peces se ven desde la entrada) con una arcada de tres que se abre con su cordón.
    for (let z = BACK + 1; z < FRONT; z++) {
      for (let y = 1; y < up; y++) {
        const column = z % 4 === 2;
        set(LEFT_WALL, y, z, column || y === up - 1 ? 'Q' : '.');
        const arch = z >= ARCH[0] && z <= ARCH[1] && y <= 4;
        set(RIGHT_WALL, y, z, arch ? '.' : y === 1 || y === up - 1 || column ? 'Q' : 'W');
      }
    }
    // Puerta de entrada con su marco y una vidriera encima, y la de la terraza arriba.
    set(MID, 1, FRONT, 'D');
    set(MID, 2, FRONT, 'T');
    for (const x of [MID - 1, MID + 1]) for (let y = 1; y <= 3; y++) set(x, y, FRONT, 'Q');
    for (let y = 3; y <= 4; y++) set(MID, y, FRONT, 'W');
    set(MID, UP, FRONT, 'F');
    set(MID, UP + 1, FRONT, '.');
    // Pórtico: columnas que sujetan la terraza; la terraza con su barandilla.
    const inner = big ? 3 : 2;
    for (const x of [MID - s.porch, MID - inner, MID + inner, MID + s.porch]) for (let y = 1; y < up; y++) set(x, y, PORCH[1], 'Q');
    for (const z of PORCH) for (let x = MID - s.porch; x <= MID + s.porch; x++) set(x, up, z, 'Q');
    for (let x = MID - s.porch; x <= MID + s.porch; x++) set(x, UP, PORCH[1], 'F');
    for (const z of PORCH) for (const x of [MID - s.porch, MID + s.porch]) set(x, UP, z, 'F');
    // Cornisa: una franja de piedra pulida a la altura del suelo de arriba, por fuera.
    for (let z = BACK; z <= FRONT; z++) for (let x = WEST; x <= EAST; x++) if (onWall(x, z)) set(x, up, z, 'Q');
    // Barandilla de la galería alrededor del patio (menos donde llega la escalinata).
    for (let x = ATRIUM[0]; x <= ATRIUM[2]; x++) {
      if (!STAIR_X.includes(x)) set(x, UP, ATRIUM[1] - 1, 'F');
      set(x, UP, ATRIUM[3] + 1, 'F');
    }
    for (let z = ATRIUM[1] - 1; z <= ATRIUM[3] + 1; z++) for (const x of [ATRIUM[0] - 1, ATRIUM[2] + 1]) set(x, UP, z, 'F');
    // Acuario: zócalo oscuro bajo cada columna de peceras (las peceras son muebles, en game/museum.ts).
    for (const [x, z] of s.tanks) set(x, 1, z, 'K');
    // Sala de fósiles: tarima de losas para el dinosaurio.
    for (const x of s.dinoX) for (const z of s.dinoZ) set(x, 1, z, 'q');
    // Insectario: zócalo bajo cada terrario.
    for (const [x, z] of s.terrariums) set(x, UP, z, 'K');
    // Tejado a dos aguas de media en media teja, del alero de delante y de detrás a la cumbrera. Encima del patio, un
    // lucernario de cristal a lo largo de la cumbrera.
    const midZ = (FRONT + 1) / 2;
    for (let z = 0; z <= FRONT + 1; z++) {
      const { layer, half } = roofAt(z);
      for (let x = WEST; x <= EAST; x++) {
        const skylight = x >= ATRIUM[0] + 1 && x <= ATRIUM[2] - 1 && z >= ATRIUM[1] - 2 && z <= ATRIUM[3] + 1;
        set(x, layer, z, skylight ? 'W' : half ? 'b' : 'B');
        // Hastiales al este y al oeste: pared hasta el tejado, con un ventanal redondo arriba.
        if (x === WEST || x === EAST) for (let y = ROOF; y < layer; y++) if (z > BACK && z < FRONT) set(x, y, z, y >= ROOF + 1 && y <= ROOF + 2 && Math.abs(z - midZ) <= 2 ? 'W' : 'M');
      }
    }
    // La escalinata y su hueco, al final para que no la tape ningún suelo; maciza por debajo.
    for (const x of STAIR_X) {
      for (let i = 0; i < up; i++) {
        const z = STAIR_FOOT - i;
        set(x, 1 + i, z, 'S');
        for (let y = 1; y <= i; y++) set(x, y, z, 'Q');
      }
    }
    // Barandillas a los lados de la escalinata.
    for (let i = 1; i < up; i++) for (const x of [MID - 2, MID + 2]) set(x, 1 + i, STAIR_FOOT - i, 'F');
    for (const x of [MID - 2, MID + 2]) set(x, 1, STAIR_FOOT, 'F');
    // Cordones de las salas cerradas.
    for (let w = 1; w <= 3; w++) for (const [x, y, z] of barrierCells(w)) set(x, y, z, 'F');
    return grid.map((layer) => layer.map((row) => row.join('')));
  }

  const doorCell: Cell = [MID, 1, FRONT + 3];
  const center: [number, number] = [MID, Math.floor(D / 2)];
  const template: BuildingTemplate = {
    id: big ? 'museo-3' : 'museo-2',
    name: 'Museo',
    legend: LEGEND,
    layers: build(),
    door: doorCell,
    rooms: [
      { name: 'Sala de fósiles', floor: 1, area: [WEST + 1, BACK + 1, LEFT_WALL - 1, FRONT - 1] },
      { name: 'Acuario', floor: 1, area: [RIGHT_WALL + 1, BACK + 1, EAST - 1, FRONT - 1] },
      { name: 'Insectario', floor: UP, area: [WEST + 1, BACK + 1, EAST - 1, FRONT - 1] },
      { name: 'Terraza mirador', floor: UP, area: [MID - s.porch + 1, FRONT + 1, MID + s.porch - 1, FRONT + 2] },
    ],
    slots: [],
  };

  /** Capa justo debajo del tejado en la fila z (de donde cuelgan las lámparas de arriba). */
  const underRoof = (z: number) => roofAt(z).layer - 1;
  const L = LEFT_WALL;
  const R = RIGHT_WALL;
  const F = FRONT;
  const E = EAST;
  const hang = up - 1;
  // Lámparas: abajo, colgadas bajo la galería (en las salas y al fondo de la recepción); arriba, del tejado.
  const lowLamps: [number, number][] = big
    ? [[3, 4], [3, 11], [3, 18], [7, 4], [7, 18], [21, 3], [21, 10], [21, 18], [24, 5], [24, 16], [MID, 3], [L + 2, 4], [R - 2, 4]]
    : [[3, 3], [3, 12], [16, 3], [16, 13], [15, 8], [MID, 2], [MID, 14], [7, 3], [13, 3]];
  const highLamps: [number, number][] = big
    ? [[4, 5], [4, 16], [24, 5], [24, 16], [12, 12], [MID + 2, 12], [MID, 16], [MID - 6, 10], [MID + 6, 10]]
    : [[4, 4], [16, 4], [4, 12], [16, 12], [8, 8], [12, 8], [10, 11]];
  const fixtures: Fixture[] = [
    ...lowLamps.map(([x, z]): Fixture => ['lampara_techo', x, hang, z, 0]),
    ...highLamps.map(([x, z]): Fixture => ['lampara_techo', x, underRoof(z), z, 0]),
    ['mostrador_museo', R - 1, 1, STAIR_FOOT, 0],
    ...s.tanks.flatMap(([x, z]): Fixture[] => [['pecera', x, 2, z, 3], ['pecera', x, 3, z, 3]]),
    ...s.terrariums.map(([x, z]): Fixture => ['terrario', x, UP + 1, z, 0]),
    ...s.cases.map(([x, z]): Fixture => ['vitrina', x, 1, z, 0]),
    // Recepción.
    ['banco', L + 1, 1, STAIR_FOOT, 1], ['banco', R - 1, 1, STAIR_FOOT - 4, 3], ['planta', L + 1, 1, F - 1, 0], ['planta', R - 1, 1, F - 1, 0],
    ['panel_info', L + 1, 1, STAIR_FOOT - 3, 1], ['panel_info', R - 1, 1, 4, 3], ['cordon', L + 1, 1, 2, 0], ['cordon', R - 1, 1, 2, 0],
    // Sala de fósiles: cordón alrededor del dinosaurio y su panel.
    ...s.dinoX.flatMap((x): Fixture[] => [['cordon', x, 1, s.dinoZ[0] - 1, 0], ['cordon', x, 1, s.dinoZ[s.dinoZ.length - 1] + 1, 0]]),
    ['panel_info', L - 1, 1, s.dinoZ[2], 3],
    // Acuario: un banco para mirar los peces y su panel.
    ['banco', R + 1, 1, F - 2, 0], ['panel_info', R + 1, 1, 3, 1],
    // Insectario: plantas, bancos y cuadros.
    ['planta', 2, UP, F - 2, 0], ['planta', E - 1, UP, F - 2, 0], ['planta', E - 1, UP, 3, 0], ['planta', 2, UP, 7, 0],
    ['banco', L - 1, UP, STAIR_FOOT - 4, 1], ['banco', R + 1, UP, STAIR_FOOT - 4, 3], ['banco', L - 1, UP, STAIR_FOOT - 1, 1], ['banco', R + 1, UP, STAIR_FOOT - 1, 3],
    ['cuadro', E - 1, UP, 6, 3], ['cuadro', E - 1, UP, 10, 3], ['cuadro', 2, UP, 10, 1],
    ['panel_info', MID + 2, UP, F - 1, 2],
    // Terraza mirador: bancos y el catalejo mirando al pueblo.
    ['banco', MID - 3, UP, F + 1, 0], ['banco', MID + 3, UP, F + 1, 0], ['catalejo_pie', MID, UP, F + 2, 0], ['planta', MID - 4, UP, F + 1, 0], ['planta', MID + 4, UP, F + 1, 0],
  ];
  if (big) {
    fixtures.push(
      // Más sitio: un rincón de lectura en la sala de fósiles, bancos en medio del acuario y en la galería, cuadros.
      ['banco', 2, 1, 11, 1], ['planta', 2, 1, 8, 0], ['planta', 2, 1, 14, 0], ['panel_info', 8, 1, 11, 3],
      ['banco', 21, 1, 10, 1], ['planta', 21, 1, 5, 0], ['planta', 25, 1, 19, 0],
      ['banco', MID, 1, F - 3, 0], ['planta', L + 1, 1, STAIR_FOOT + 2, 0], ['planta', R - 1, 1, STAIR_FOOT + 2, 0],
      ['cuadro', 2, UP, 14, 1], ['cuadro', 2, UP, 18, 1], ['cuadro', E - 1, UP, 14, 3], ['cuadro', E - 1, UP, 18, 3],
      ['planta', 2, UP, 3, 0], ['planta', E - 1, UP, 7, 0], ['banco', 5, UP, F - 1, 0], ['banco', 23, UP, F - 1, 0],
      ['panel_info', 5, UP, 5, 0], ['panel_info', 23, UP, 5, 0],
    );
  }

  const exhibitSpot = (kind: 'pez' | 'bicho' | 'fosil', index: number, dino: number): ExhibitSpot & { size?: number } => {
    if (kind === 'fosil') {
      const dx = (s.dinoX[0] + s.dinoX[s.dinoX.length - 1] + 1) / 2;
      if (dino >= 0) return { at: [dx, 2.2, s.dinoZ[0] + 0.9 + dino * 1.6] };
      const [x, z] = s.cases[index % s.cases.length];
      return { at: [x + 0.5, 1.94, z + 0.5], size: 0.42 };
    }
    if (kind === 'pez') {
      const [x, z] = s.tanks[Math.floor(index / 2) % s.tanks.length];
      const y = 2 + (index % 2);
      return { at: [x + 0.5, y + 0.5, z + 0.5], box: [x + 0.18, y + 0.28, z + 0.18, x + 0.82, y + 0.82, z + 0.82], size: 0.42 };
    }
    const [x, z] = s.terrariums[index % s.terrariums.length];
    const y = UP + 1;
    return { at: [x + 0.5, y + 0.55, z + 0.5], box: [x + 0.2, y + 0.3, z + 0.2, x + 0.8, y + 0.85, z + 0.8], size: 0.34 };
  };

  return {
    big,
    half: big ? MUSEUM_HALF_BIG : MUSEUM_HALF,
    template,
    door: [doorCell[0] - center[0], doorCell[1], doorCell[2] - center[1]],
    center,
    fixtures,
    curator: [R - 1, 1, STAIR_FOOT - 1],
    barrierCells,
    exhibitSpot,
  };
}

/** El museo de siempre (islas del terreno 3 y 4) y el grande (v5.11, terreno 5). */
export const HALL_NORMAL = makeLayout(NORMAL, false);
export const HALL_BIG = makeLayout(BIG, true);

/** El museo que va en esa parcela (el grande si la parcela es grande). */
export function museumLayout(plot: { half?: number }): MuseumLayout {
  return (plot.half ?? 0) >= MUSEUM_HALF_BIG ? HALL_BIG : HALL_NORMAL;
}

/** Esquina del museo en el mundo a partir del centro del solar. */
export function museumHallOrigin(plot: { x: number; y: number; z: number; half?: number }): [number, number, number] {
  const { center } = museumLayout(plot);
  return [plot.x - center[0], plot.y, plot.z - center[1]];
}

/** El museo de siempre (para las pruebas y lo que no depende del tamaño). */
export const MUSEUM_HALL = HALL_NORMAL.template;

/**
 * Cordones de museos de antes que ya no están en el mismo sitio. En las partidas de entonces el jugador los quitó
 * (quedaron guardados como aire) y harían agujeros en el museo de ahora: se devuelven a como salen. Los de la v5.2
 * y el de la terraza de la v5.9 (que estaba más arriba). Solo en el museo de siempre: el grande es nuevo.
 */
export const OLD_HALL_BARRIERS: Cell[] = [[9, 1, 10], [10, 1, 10], [11, 1, 10], [10, 9, 15]];
