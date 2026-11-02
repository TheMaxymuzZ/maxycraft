// La tienda nueva (v5.2), para las islas nuevas (terreno 3). Una sola planta alta y diáfana con un altillo bajo el
// tejado a dos aguas: delante, la tienda a doble altura con el escaparate, las mesas con lo del día y las
// estanterías; al fondo, bajo el altillo, el mostrador bajo con la caja (ahora se ve bien a Avellana). Arriba, en el
// altillo, la habitación de Avellana y, tras un tabique, la sala de muebles, que se abre con el último nivel.
// Aquí está el edificio y dónde va cada mueble; lo que se ve está en game/shopFront.ts.
//
// v5.11: dos tamaños. El de siempre, para las islas de antes, y uno más ancho y más hondo (con más estanterías, mesas
// y un altillo más grande) para las islas nuevas (terreno 5), igual de alto.

import { Block, stairsFacing } from './blocks';
import type { BuildingTemplate } from './buildings';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';

/** Medio lado de la parcela de la tienda de siempre (v5.2) y de la grande (v5.11). */
export const SHOP_HALF = 7;
export const SHOP_HALF_BIG = 10;

/** Altura de las paredes, suelo del altillo y capa donde empieza el tejado (igual en los dos tamaños). */
const WALL_TOP = 5;
export const LOFT = 5;
const ROOF = 5;
const WEST = 1;
const BACK = 1;
/** La escalera al altillo: pegada a la pared oeste (en x = 3, donde ya cabe uno de pie bajo el tejado). */
const STAIR_X = 3;

/** Lo que cambia entre la tienda de siempre y la grande. */
interface Size {
  /** Ancho (x) y fondo (z) del solar. */
  w: number;
  d: number;
  /** Fachada; la pared este es w - 2 y la cumbrera (de delante atrás) va en el centro. */
  front: number;
  /** Hasta dónde llega el altillo (desde el fondo); delante queda la tienda a doble altura. */
  loftFront: number;
  /** Fila del último escalón; si cae dentro del altillo, se abre un hueco en su suelo para la cabeza. */
  stairTop: number;
  /** Filas de las ventanas de los lados. */
  sideWindows: number[];
}

const NORMAL: Size = { w: 15, d: 13, front: 9, loftFront: 5, stairTop: 4, sideWindows: [3, 7] };
const BIG: Size = { w: 21, d: 17, front: 13, loftFront: 6, stairTop: 7, sideWindows: [3, 7, 11] };

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

/** Dónde va todo en una tienda de un tamaño, en coordenadas de la tienda (esquina del solar). */
export interface ShopLayoutHall {
  big: boolean;
  template: BuildingTemplate;
  /** Casilla delante de la puerta, respecto al centro de la parcela. */
  door: Cell;
  center: [number, number];
  /** La puerta de la sala de muebles, en el tabique del altillo (cerrada con un cordón hasta el último nivel). */
  showroomDoor: Cell;
  fixtures: Fixture[];
  showroom: Fixture[];
  /** Baldas con lo del día: [x, y, z, dx, dz]. */
  shelves: [number, number, number, number, number][];
  /** Escaparate: huecos detrás del cristal. */
  window: [number, number, number][];
  keeperSpot: Cell;
  keeperBed: Cell;
}

function makeLayout(s: Size, big: boolean): ShopLayoutHall {
  const { w: SHOP_W, d: SHOP_D, front: FRONT, loftFront: LOFT_FRONT } = s;
  const EAST = SHOP_W - 2;
  const RIDGE = (SHOP_W - 1) / 2;
  const showroomDoor: Cell = [RIDGE + 1, LOFT + 1, big ? 4 : 3];

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
    for (const z of [FRONT + 1, FRONT + 2]) for (let x = 0; x < SHOP_W; x++) set(x, 0, z, 'C');
    for (let x = 0; x < SHOP_W; x++) set(x, 0, FRONT + 3, 'p');
    // Paredes: vigas en las esquinas, madera, ventanas a los lados.
    for (let y = 1; y <= WALL_TOP; y++) {
      for (let z = BACK; z <= FRONT; z++) {
        for (let x = WEST; x <= EAST; x++) {
          if (!onWall(x, z)) {
            set(x, y, z, '.');
            continue;
          }
          let c = corner(x, z) ? 'L' : 'H';
          if (!corner(x, z) && (x === WEST || x === EAST) && (y === 2 || y === 3) && s.sideWindows.includes(z)) c = 'w';
          if (!corner(x, z) && y === WALL_TOP - 1) c = 'L'; // viga a la altura del altillo
          set(x, y, z, c);
        }
      }
    }
    // Fachada: escaparates grandes a los lados de la puerta.
    for (let x = WEST + 1; x < EAST; x++) if (Math.abs(x - RIDGE) >= 2) for (let y = 1; y <= 3; y++) set(x, y, FRONT, 'W');
    set(RIDGE, 1, FRONT, 'D');
    set(RIDGE, 2, FRONT, 'T');
    for (const x of [RIDGE - 1, RIDGE + 1]) set(x, 2, FRONT, 'w');
    // Toldo de rayas sobre el escaparate y la acera.
    for (let x = WEST; x <= EAST; x++) set(x, 4, FRONT + 1, 'A');
    // El altillo: suelo de tablones al fondo y barandilla mirando a la tienda.
    for (let z = BACK + 1; z <= LOFT_FRONT; z++) for (let x = WEST + 1; x < EAST; x++) set(x, LOFT, z, 'P');
    for (let x = STAIR_X + 1; x < EAST; x++) set(x, LOFT + 1, LOFT_FRONT, 'F');
    // Tabique del altillo entre la habitación (oeste) y la sala de muebles (este), con su puerta.
    for (let z = BACK + 1; z <= LOFT_FRONT; z++) for (let y = LOFT + 1; y <= LOFT + 4; y++) set(RIDGE + 1, y, z, 'P');
    const [dx, dy, dz] = showroomDoor;
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
    // La escalera al altillo, maciza por debajo; al lado, cajas bajo los escalones.
    for (let i = 0; i < LOFT; i++) {
      const z = s.stairTop + LOFT - 1 - i;
      set(STAIR_X, 1 + i, z, 'S');
      for (let y = 1; y <= i; y++) set(STAIR_X, y, z, 'P');
      for (let y = 1; y <= Math.min(i + 1, 3); y++) set(WEST + 1, y, z, 'K');
    }
    if (s.stairTop <= LOFT_FRONT) set(STAIR_X, LOFT, LOFT_FRONT, '.');
    return grid.map((layer) => layer.map((row) => row.join('')));
  }

  const doorCell: Cell = [RIDGE, 1, FRONT + 1];
  const center: [number, number] = [RIDGE, (SHOP_D - 1) / 2];
  const template: BuildingTemplate = {
    id: big ? 'tienda-3' : 'tienda-2',
    name: 'Tienda',
    legend: LEGEND,
    layers: build(),
    door: doorCell,
    rooms: [
      { name: 'Tienda', floor: 1, area: [WEST + 1, BACK + 1, EAST - 1, FRONT - 1] },
      { name: 'Casa de Avellana', floor: LOFT + 1, area: [STAIR_X, BACK + 1, RIDGE, LOFT_FRONT] },
      { name: 'Sala de muebles', floor: LOFT + 1, area: [RIDGE + 2, BACK + 1, EAST - 1, LOFT_FRONT] },
    ],
    slots: [],
  };
  const door: Cell = [doorCell[0] - center[0], doorCell[1], doorCell[2] - center[1]];
  if (!big) {
    return {
      big, template, door, center, showroomDoor,
      fixtures: [
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
      ],
      showroom: [
        ['sofa', 10, LOFT + 1, 2, 0], ['lampara', 9, LOFT + 1, 2, 0], ['alfombra', 10, LOFT + 1, 3, 0], ['mesa', 11, LOFT + 1, 3, 0], ['silla', 11, LOFT + 1, 4, 2],
        ['planta', 9, LOFT + 1, 4, 0],
      ],
      shelves: [
        [5.5, 1.4, 2.35, 0, 1], [5.5, 1.72, 2.35, 0, 1], [6.5, 1.4, 2.35, 0, 1], [6.5, 1.72, 2.35, 0, 1],
        [8.5, 1.4, 2.35, 0, 1], [8.5, 1.72, 2.35, 0, 1], [9.5, 1.4, 2.35, 0, 1], [9.5, 1.72, 2.35, 0, 1],
        [12.35, 1.4, 4.5, -1, 0], [12.35, 1.72, 4.5, -1, 0], [12.35, 1.4, 5.5, -1, 0], [12.35, 1.72, 5.5, -1, 0],
        [12.35, 1.4, 6.5, -1, 0], [12.35, 1.72, 6.5, -1, 0],
        [6.5, 1.74, 7.5, 0, 1], [9.5, 1.74, 6.5, 0, 1],
      ],
      window: [[10, 1, 8], [11, 1, 8], [12, 1, 7]],
      keeperSpot: [7, 1, 3],
      keeperBed: [4, LOFT + 1, 2],
    };
  }
  // La tienda grande: mostrador más largo bajo el altillo, estanterías en el fondo y en la pared este, tres mesas
  // con lo del día, cestas y plantas; arriba, la casa de Avellana más amplia y una sala de muebles más grande.
  const underRoof = (x: number) => ROOF + RIDGE - Math.abs(x - RIDGE) - 1;
  const backShelves = [5, 6, 7, 13, 14, 15];
  const sideShelves = [6, 7, 8, 9, 10, 11];
  const tables: [number, number][] = [[7, 9], [13, 9], [10, 11]];
  return {
    big, template, door, center, showroomDoor,
    fixtures: [
      ['lampara_techo', 5, 4, 3, 0], ['lampara_techo', 10, 4, 3, 0], ['lampara_techo', 15, 4, 3, 0],
      ...[[6, 9], [14, 9], [6, 12], [14, 12], [10, 10]].map(([x, z]): Fixture => ['lampara_techo', x, underRoof(x), z, 0]),
      ['lampara_techo', 6, underRoof(6), 3, 0], ['lampara_techo', 14, underRoof(14), 3, 0],
      ['mostrador_bajo', 8, 1, 5, 0], ['mostrador_bajo', 9, 1, 5, 0], ['caja_mostrador', 10, 1, 5, 0], ['mostrador_bajo', 11, 1, 5, 0], ['mostrador_bajo', 12, 1, 5, 0],
      ...backShelves.map((x): Fixture => ['estanteria', x, 1, 2, 0]),
      ...sideShelves.map((z): Fixture => ['estanteria', EAST - 1, 1, z, 3]),
      ...tables.map(([x, z]): Fixture => ['mesa_expositor', x, 1, z, 0]),
      ['cesta', 4, 1, 3, 0], ['cesta', 16, 1, 3, 0], ['cesta', 4, 1, 12, 0], ['planta', EAST - 1, 1, 12, 0], ['planta', 17, 1, 2, 0], ['planta', 4, 1, 5, 0],
      ['planta', 2, 1, 12, 0],
      // El altillo de Avellana.
      ['cama', 4, LOFT + 1, 2, 0], ['mesita', 5, LOFT + 1, 2, 0], ['alfombra', 6, LOFT + 1, 4, 0], ['armario', 7, LOFT + 1, 2, 0],
      ['mesa', 9, LOFT + 1, 3, 0], ['silla', 9, LOFT + 1, 4, 2], ['planta', 4, LOFT + 1, 5, 0], ['lampara', 10, LOFT + 1, 2, 0], ['cuadro', 8, LOFT + 1, 2, 0],
    ],
    showroom: [
      ['sofa', 13, LOFT + 1, 2, 0], ['sofa', 14, LOFT + 1, 2, 0], ['lampara', 12, LOFT + 1, 2, 0], ['alfombra', 14, LOFT + 1, 4, 0],
      ['mesa', 15, LOFT + 1, 4, 0], ['silla', 15, LOFT + 1, 5, 2], ['armario', 16, LOFT + 1, 2, 0], ['planta', 12, LOFT + 1, 6, 0], ['planta', 17, LOFT + 1, 6, 0],
    ],
    shelves: [
      ...backShelves.flatMap((x): [number, number, number, number, number][] => [[x + 0.5, 1.4, 2.35, 0, 1], [x + 0.5, 1.72, 2.35, 0, 1]]),
      ...sideShelves.flatMap((z): [number, number, number, number, number][] => [[EAST - 1 + 0.35, 1.4, z + 0.5, -1, 0], [EAST - 1 + 0.35, 1.72, z + 0.5, -1, 0]]),
      ...tables.map(([x, z]): [number, number, number, number, number] => [x + 0.5, 1.74, z + 0.5, 0, 1]),
    ],
    window: [[14, 1, 12], [15, 1, 12], [16, 1, 12]],
    keeperSpot: [10, 1, 4],
    keeperBed: [4, LOFT + 1, 2],
  };
}

/** La tienda de siempre (islas del terreno 3 y 4) y la grande (v5.11, terreno 5). */
export const SHOP_NORMAL = makeLayout(NORMAL, false);
export const SHOP_BIG = makeLayout(BIG, true);

/** La tienda que va en esa parcela (la grande si la parcela es grande). */
export function shopLayout(plot: { half?: number }): ShopLayoutHall {
  return (plot.half ?? 0) >= SHOP_HALF_BIG ? SHOP_BIG : SHOP_NORMAL;
}

export function shopHallOrigin(plot: { x: number; y: number; z: number; half?: number }): [number, number, number] {
  const { center } = shopLayout(plot);
  return [plot.x - center[0], plot.y, plot.z - center[1]];
}

/** La tienda de siempre (para las pruebas). */
export const SHOP_HALL = SHOP_NORMAL.template;
export const SHOP_HALL_DOOR = SHOP_NORMAL.door;
export const HALL_KEEPER_SPOT = SHOP_NORMAL.keeperSpot;
export const HALL_KEEPER_BED = SHOP_NORMAL.keeperBed;
