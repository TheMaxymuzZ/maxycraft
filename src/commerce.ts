// Oficios del campo y la mina (v4.17): tres comercios nuevos que abren cuando la isla crece. Cada uno con su
// dueño, su edificio, su horario (en economy.ts) y su condición para abrir. Aquí está lo que no depende de la
// partida; game/commerce.ts los construye y pone a sus dueños.

import { Block, ROOFS, ROOF_SLABS, ROOF_STAIRS, stairsFacing } from './blocks';
import type { BuildingTemplate } from './buildings';
import { BALDOSA, ESPIGA, GRAVA, HENO, SEDA, SERRIN, type ShopDef } from './economy';
import type { Cell } from './pathfind';
import type { Fixture } from './shopBuilding';
import type { Profile } from './villagers';

export interface UnlockContext {
  /** Nivel del ayuntamiento (0 si aún no hay). */
  townLevel: number;
  /** Mejor nivel de amistad con un vecino (índice de FRIEND_LEVELS). */
  bestFriend: number;
  /** Nivel de la tienda de Avellana (v4.18). */
  shopLevel?: number;
  /** Obras públicas hechas (v4.18). */
  works?: number;
}

export interface Merchant {
  shop: ShopDef;
  profile: Profile;
  building: BuildingTemplate;
  /** Muebles fijos del edificio. */
  fixtures: Fixture[];
  /** Dónde atiende el dueño (en coordenadas del edificio). */
  counter: Cell;
  /** Su cama, en la trastienda (v5.0.1): al cerrar se va andando a dormir en vez de desaparecer. */
  bed: Cell;
  /** Si ya puede abrir. */
  unlocked: (c: UnlockContext) => boolean;
  /** Cómo se desbloquea, para la wiki y el tablón. */
  unlockText: string;
  greetings: string[];
  icon: string;
  /** El comercio nuevo (v5.2), más amplio y con sus muebles de oficio, para las islas nuevas (terreno 3). */
  hall: MerchantHall;
}

/** Edificio, muebles, mostrador y cama de un comercio: los de antes o los nuevos. */
export interface MerchantHall {
  building: BuildingTemplate;
  fixtures: Fixture[];
  counter: Cell;
  bed: Cell;
}

/** El edificio que le toca a un comercio según la isla. */
export function hallOf(m: Merchant, newBuildings: boolean): MerchantHall {
  return newBuildings ? m.hall : m;
}

/** Plantilla de 7×8: la caseta en z = 0..6 y una franja delante (z = 7) con la casilla de la puerta. */
function building(id: string, name: string, legend: Record<string, Block>, layers: string[][]): BuildingTemplate {
  return { id, name, legend, layers, door: [3, 1, 7], rooms: [{ name, floor: 1, area: [1, 1, 5, 5] }], slots: [] };
}

const FLOOR = (c: string) => Array.from({ length: 8 }, () => c.repeat(7));
/** Paredes de 7×7 con esquinas, la puerta en el centro delante y la fila de delante libre. */
const WALLS = (corner: string, wall: string, door: string) => [
  `${corner}${wall.repeat(5)}${corner}`,
  `${wall}.....${wall}`, `${wall}.....${wall}`, `${wall}.....${wall}`, `${wall}.....${wall}`, `${wall}.....${wall}`,
  `${corner}${wall.repeat(2)}${door}${wall.repeat(2)}${corner}`,
  '       ',
];
/** Tejado a dos aguas a lo largo de z (cae hacia los lados x = 0 y x = 6). */
const GABLE = (c: string, inset: number) => [...Array.from({ length: 7 }, () => `${' '.repeat(inset)}${c.repeat(7 - inset * 2)}${' '.repeat(inset)}`), '       '];

/** El invernadero de Espiga: armazón de madera y cristal, con un bancal de flores dentro. */
const GREENHOUSE = building('invernadero', 'Invernadero', {
  P: Block.Planks, L: Block.Log, W: Block.Glass, D: Block.Door, T: Block.DoorTop, G: Block.Grass,
  r: Block.FlowerRed, y: Block.FlowerYellow, b: Block.FlowerBlue, I: Block.LightBlock,
}, [
  FLOOR('P'),
  ['LWWWWWL', 'WGGGGGW', 'W.....W', 'W.....W', 'W.....W', 'W.....W', 'LWWDWWL', '       '],
  ['LWWWWWL', 'WrybryW', 'W.....W', 'W.....W', 'W.....W', 'W.....W', 'LWWTWWL', '       '],
  ['LWWWWWL', 'W.....W', 'W.....W', 'W..I..W', 'W.....W', 'W.....W', 'LWWWWWL', '       '],
  GABLE('W', 0),
  GABLE('W', 1),
  GABLE('W', 2),
]);

/** El granero rojo de Heno, con su veleta en lo alto. */
const BARN = building('granero', 'Granero', {
  P: Block.Planks, L: Block.Log, B: Block.Brick, D: Block.Door, T: Block.DoorTop, R: Block.RoofRed, F: Block.Fence, w: Block.Window, I: Block.LightBlock,
}, [
  FLOOR('P'),
  WALLS('L', 'B', 'D'),
  ['LBwBwBL', 'B.....B', 'w.....w', 'B.....B', 'w.....w', 'B.....B', 'LBBTBBL', '       '],
  ['LBBBBBL', 'B.....B', 'B.....B', 'B..I..B', 'B.....B', 'B.....B', 'LPPPPPL', '       '],
  GABLE('R', 0),
  GABLE('R', 1),
  GABLE('R', 2),
  ['   R   ', '   R   ', '   R   ', '   R   ', '   R   ', '   R   ', '   R   ', '       '],
  ['       ', '       ', '       ', '   F   ', '       ', '       ', '       ', '       '],
  ['       ', '       ', '       ', '   F   ', '       ', '       ', '       ', '       '],
]);

/** La caseta de la mina de Grava: piedra y vigas, con raíles y una vagoneta delante. */
const MINE_HUT = building('caseta-mina', 'Caseta de la mina', {
  P: Block.Planks, L: Block.Log, C: Block.Cobble, D: Block.Door, T: Block.DoorTop, S: Block.PlanksSlab, I: Block.LightBlock, w: Block.Window,
}, [
  FLOOR('C'),
  WALLS('L', 'C', 'D'),
  ['LCwCwCL', 'C.....C', 'w.....w', 'C.....C', 'w.....w', 'C.....C', 'LCCTCCL', '       '],
  ['LLLLLLL', 'L.....L', 'L.....L', 'L..I..L', 'L.....L', 'L.....L', 'LLLLLLL', '       '],
  [...Array.from({ length: 7 }, () => 'PPPPPPP'), '       '],
  [...Array.from({ length: 7 }, () => ' SSSSS '), '       '],
]);

/** La boutique de Seda (v4.18): paredes blancas, escaparates a los dos lados de la puerta con maniquíes y toldo. */
const BOUTIQUE = building('boutique', 'Boutique', {
  P: Block.Planks, H: Block.Wall, L: Block.Log, W: Block.Glass, D: Block.Door, T: Block.DoorTop, A: Block.Awning, R: Block.RoofRed, I: Block.LightBlock,
}, [
  FLOOR('P'),
  ['HHHHHHH', 'H.....H', 'H.....H', 'H.....H', 'H.....H', 'H.....H', 'HWWDWWH', '       '],
  ['HHWHWHH', 'H.....H', 'W.....W', 'H.....H', 'W.....W', 'H.....H', 'HWWTWWH', '       '],
  ['HHHHHHH', 'H.....H', 'H.....H', 'H..I..H', 'H.....H', 'H.....H', 'HHHHHHH', 'AAAAAAA'],
  [...Array.from({ length: 7 }, () => 'RRRRRRR'), '       '],
  [...Array.from({ length: 7 }, (_, z) => (z === 0 || z === 6 ? '       ' : ' RRRRR ')), '       '],
]);

/** La nave de muebles de Serrín: madera y cristal con tejado de dientes de sierra. */
const WAREHOUSE = building('nave-muebles', 'Nave de muebles', {
  P: Block.Planks, L: Block.Log, S: Block.ShopWall, W: Block.Window, G: Block.Glass, D: Block.Door, T: Block.DoorTop, R: Block.RoofGreen, I: Block.LightBlock,
}, [
  FLOOR('P'),
  WALLS('L', 'S', 'D'),
  ['LSWSWSL', 'S.....S', 'W.....W', 'S.....S', 'W.....W', 'S.....S', 'LSSTSSL', '       '],
  ['LSSSSSL', 'S.....S', 'S.....S', 'S..I..S', 'S.....S', 'S.....S', 'LSSSSSL', '       '],
  [...Array.from({ length: 7 }, () => 'RRRRRRR'), '       '],
  // Dientes de sierra: una fila de tejado alta y otra de cristal por donde entra la luz.
  [...Array.from({ length: 7 }, (_, z) => (z % 2 === 0 ? 'RRRRRRR' : 'GGGGGGG')), '       '],
  [...Array.from({ length: 7 }, (_, z) => (z % 2 === 0 ? 'RRRRRRR' : '       ')), '       '],
]);

/** El taller de Baldosa: ladrillo y piedra pulida, con las muestras en la acera. */
const WORKSHOP = building('taller', 'Taller', {
  P: Block.PolishedStone, B: Block.Brick, L: Block.Log, W: Block.Window, D: Block.Door, T: Block.DoorTop, R: Block.RoofYellow, I: Block.LightBlock, t: Block.Tiles,
}, [
  [...Array.from({ length: 7 }, () => 'ttttttt'), 'PPPPPPP'],
  WALLS('L', 'B', 'D'),
  ['LBWBWBL', 'B.....B', 'W.....W', 'B.....B', 'W.....W', 'B.....B', 'LBBTBBL', '       '],
  ['LBBBBBL', 'B.....B', 'B.....B', 'B..I..B', 'B.....B', 'B.....B', 'LBBBBBL', '       '],
  GABLE('R', 0),
  GABLE('R', 1),
  GABLE('R', 2),
]);

const COUNTER: Fixture[] = [['mostrador', 2, 1, 3, 0], ['caja_registradora', 3, 1, 3, 0], ['mostrador', 4, 1, 3, 0]];

// --- Comercios nuevos (v5.2) ---

/** Cómo es cada comercio nuevo: materiales y lo que tiene de especial. */
interface HallStyle {
  floor: Block;
  wall: Block;
  corner: Block;
  /** Índice de ROOFS. */
  roof: number;
  /** Paredes de cristal (invernadero). */
  glass?: boolean;
  /** Escaparate grande delante (boutique, nave de muebles). */
  shopWindow?: boolean;
  /** Toldo sobre la puerta. */
  awning?: boolean;
  /** Bancales de flores a los lados (invernadero). */
  beds?: boolean;
}

/**
 * Comercio de 9×9 por fuera (antes 7×7) con tejado a dos aguas de teja en pendiente que da a la calle, ventanales
 * y el techo abierto hasta la cumbrera. Plantilla de 11×12: aleros alrededor y la casilla de la puerta en z = 11.
 * Dentro: el mostrador bajo con la caja en z = 4, el dueño detrás, la cama al fondo a la derecha y sitio para los
 * muebles de su oficio.
 */
function tradeHall(id: string, name: string, st: HallStyle): BuildingTemplate {
  const W = 11;
  const D = 12;
  const [x0, x1, z0, z1] = [1, 9, 1, 9];
  const top = 4;
  const H = top + 7;
  const grid = Array.from({ length: H }, () => Array.from({ length: D }, () => Array<string>(W).fill(' ')));
  const set = (x: number, y: number, z: number, c: string) => {
    if (y >= 0 && y < H && x >= 0 && x < W && z >= 0 && z < D) grid[y][z][x] = c;
  };
  const onWall = (x: number, z: number) => ((x === x0 || x === x1) && z >= z0 && z <= z1) || ((z === z0 || z === z1) && x >= x0 && x <= x1);
  const corner = (x: number, z: number) => (x === x0 || x === x1) && (z === z0 || z === z1);
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, 0, z, 'F');
  for (let x = 0; x < W; x++) set(x, 0, 10, 'p');
  for (let y = 1; y <= top; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (!onWall(x, z)) set(x, y, z, '.');
        else if (corner(x, z) || (z === z1 && Math.abs(x - 5) === 1) || y === top) set(x, y, z, 'L');
        else if (st.glass && y < top) set(x, y, z, 'G');
        else if ((y === 2 || y === 3) && (x === x0 || x === x1 ? z % 2 === 0 : x % 2 === 1)) set(x, y, z, 'G');
        else set(x, y, z, 'W');
      }
    }
  }
  if (st.shopWindow) for (const x of [2, 3, 7, 8]) for (let y = 1; y <= 3; y++) set(x, y, z1, 'G');
  set(5, 1, z1, 'D');
  set(5, 2, z1, 'T');
  set(5, 3, z1, 'L');
  if (st.awning) for (let x = 2; x <= 8; x++) set(x, 3, z1 + 1, 'A');
  if (st.beds) {
    for (const x of [x0 + 1, x1 - 1]) {
      for (let z = 5; z <= 8; z++) {
        set(x, 0, z, 'g');
        set(x, 1, z, ['r', 'y', 'b', 'h'][(x + z) % 4]);
      }
    }
  }
  // Tejado a dos aguas: la cumbrera de delante atrás, aleros de uno por cada lado.
  for (let k = 0; k <= 5; k++) {
    const off = 5 - k;
    const y = top + 1 + k;
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      if (off === 0) {
        set(5, y, z, 's');
        continue;
      }
      set(5 - off, y, z, 'a');
      set(5 + off, y, z, 'c');
      for (let x = 5 - off + 1; x <= 5 + off - 1; x++) {
        if (z === z0 || z === z1) set(x, y, z, st.glass ? 'G' : z === z1 && k === 2 && x === 5 ? 'G' : 'W');
        else if (z > z0 && z < z1) set(x, y, z, '.');
      }
    }
  }
  // Las paredes de los lados suben hasta el alero.
  for (let z = z0 + 1; z < z1; z++) for (const x of [x0, x1]) set(x, top + 1, z, st.glass ? 'G' : 'W');
  const legend: Record<string, Block> = {
    F: st.floor, W: st.wall, L: st.corner, G: Block.Glass, D: Block.Door, T: Block.DoorTop, I: Block.LightBlock, A: Block.Awning,
    p: Block.StonePath, g: Block.Grass, r: Block.FlowerRed, y: Block.FlowerYellow, b: Block.FlowerBlue, h: Block.TallGrass,
    a: stairsFacing(ROOF_STAIRS[st.roof], 1), c: stairsFacing(ROOF_STAIRS[st.roof], 3), s: ROOF_SLABS[st.roof], R: ROOFS[st.roof],
  };
  return { id: `${id}-2`, name, legend, layers: grid.map((l) => l.map((r) => r.join(''))), door: [5, 1, 11], rooms: [{ name, floor: 1, area: [2, 2, 8, 8] }], slots: [] };
}

/** Mostrador bajo con la caja: así se ve bien al dueño. */
const HALL_COUNTER: Fixture[] = [['mostrador_bajo', 4, 1, 4, 0], ['caja_mostrador', 5, 1, 4, 0], ['mostrador_bajo', 6, 1, 4, 0]];
const hall = (building: BuildingTemplate, fixtures: Fixture[]): MerchantHall => ({
  building, fixtures: [...HALL_COUNTER, ['mesita', 7, 1, 2, 0], ['lampara_techo', 3, 7, 4, 0], ['lampara_techo', 7, 7, 4, 0], ['lampara_techo', 3, 7, 7, 0], ['lampara_techo', 7, 7, 7, 0], ...fixtures],
  counter: [5, 1, 3], bed: [8, 1, 2],
});

export const MERCHANTS: Merchant[] = [
  {
    shop: ESPIGA,
    profile: {
      name: 'Espiga', species: 'cabra', personality: 'deportista', catchphrase: 'meee', shirt: 0x6aa84f,
      likes: 'flores', sleep: [20, 5], stationary: true, role: 'shop', shop: 'agricola', birthday: [3, 21], hobby: 'madrugar para ver salir los brotes',
    },
    building: GREENHOUSE,
    fixtures: [...COUNTER, ['macetero', 1, 1, 5, 0], ['macetero', 5, 1, 5, 0], ['espantapajaros', 6, 1, 7, 0]],
    counter: [3, 1, 2],
    bed: [1, 1, 2],
    unlocked: (c) => c.townLevel >= 2,
    unlockText: 'Cuando el ayuntamiento llega a oficina (nivel 2).',
    greetings: [
      '¡{saludo}! Aquí se madruga, {c}. Tengo semillas, abono y la mejor regadera de la isla.',
      'El abono hace crecer las plantas un día de golpe. ¡Pruébalo, {c}!',
      '¡Hola! Si traes trigo, zanahorias o tomates te los pago mejor que nadie, {c}.',
    ],
    icon: '🌱',
    hall: hall(tradeHall('invernadero', 'Invernadero', { floor: Block.Planks, wall: Block.Glass, corner: Block.Log, roof: 2, glass: true, beds: true }), [
      ['sacos', 2, 1, 2, 0], ['macetero', 3, 1, 2, 0], ['planta', 8, 1, 4, 0], ['espantapajaros', 8, 1, 11, 0], ['banco', 5, 1, 8, 2],
    ]),
  },
  {
    shop: HENO,
    profile: {
      name: 'Heno', species: 'caballo', personality: 'gruñón', catchphrase: 'hiii', shirt: 0xb04a3a,
      likes: 'madera', sleep: [21, 7], stationary: true, role: 'shop', shop: 'granja', birthday: [8, 9], hobby: 'cepillar a sus ovejas',
    },
    building: BARN,
    fixtures: [...COUNTER, ['barril', 1, 1, 1, 0], ['barril', 5, 1, 1, 0], ['banco', 1, 1, 5, 1]],
    counter: [3, 1, 2],
    bed: [5, 1, 2],
    unlocked: (c) => c.bestFriend >= 2,
    unlockText: 'Cuando eres amigo (nivel 3 de amistad) de algún vecino.',
    greetings: [
      'Hmpf. {saludo}. Los domingos cierro, que los animales también descansan, {c}.',
      'Con un poco de pienso, tus animales te dan otra vez su huevo o su leche. Hmpf, {c}.',
      'Las ovejas dan lana cada día. Yo te la compro bien pagada, {c}.',
    ],
    icon: '🐄',
    hall: hall(tradeHall('granero', 'Granero', { floor: Block.Planks, wall: Block.Brick, corner: Block.Log, roof: 0 }), [
      ['bala_paja', 2, 1, 2, 0], ['bala_paja', 2, 1, 3, 0], ['bala_paja', 2, 2, 2, 0], ['barril', 8, 1, 6, 0], ['sacos', 2, 1, 7, 1], ['banco', 8, 1, 8, 3],
    ]),
  },
  {
    shop: GRAVA,
    profile: {
      name: 'Grava', species: 'topo', personality: 'dormilón', catchphrase: 'tric', shirt: 0x6a5a4a,
      likes: 'madera', sleep: [3, 13], stationary: true, role: 'shop', shop: 'mina', birthday: [12, 1], hobby: 'contar las vetas de carbón',
    },
    building: MINE_HUT,
    fixtures: [...COUNTER, ['barril', 1, 1, 1, 0], ['farol', 5, 1, 1, 0], ['railes', 4, 1, 7, 0], ['vagoneta', 5, 1, 7, 0], ['railes', 6, 1, 7, 0]],
    counter: [3, 1, 2],
    bed: [1, 1, 2],
    unlocked: (c) => c.townLevel >= 3,
    unlockText: 'Cuando el ayuntamiento llega a ayuntamiento (nivel 3).',
    greetings: [
      'Mmm… ¿ya es por la tarde? {saludo}, {c}. Abro de 14:00 a 23:00.',
      'Te compro minerales mejor que Avellana. Y te arreglo las herramientas, {c}.',
      'Las herramientas de cristal son las mejores. Casi no se rompen, {c}.',
    ],
    icon: '⛏️',
    hall: hall(tradeHall('caseta-mina', 'Caseta de la mina', { floor: Block.Cobble, wall: Block.Cobble, corner: Block.Log, roof: 3 }), [
      ['yunque', 2, 1, 6, 1], ['barril', 2, 1, 2, 0], ['farol', 3, 1, 2, 0], ['estanteria', 8, 1, 6, 3],
      ['railes', 3, 1, 11, 0], ['vagoneta', 2, 1, 11, 0], ['railes', 1, 1, 11, 0],
    ]),
  },
  {
    shop: SEDA,
    profile: {
      name: 'Seda', species: 'alpaca', personality: 'presumido', catchphrase: 'chic', shirt: 0xee8fb2,
      likes: 'flores', sleep: [23, 8], stationary: true, role: 'shop', shop: 'ropa', birthday: [5, 14], hobby: 'combinar colores',
    },
    building: BOUTIQUE,
    fixtures: [...COUNTER, ['maniqui', 1, 1, 5, 0], ['maniqui', 5, 1, 5, 0], ['perchero', 1, 1, 2, 1], ['espejo', 1, 1, 4, 1], ['perchero', 5, 1, 2, 3]],
    counter: [3, 1, 2],
    bed: [5, 1, 1],
    unlocked: (c) => c.townLevel >= 2 && c.bestFriend >= 1,
    unlockText: 'Con el ayuntamiento en oficina (nivel 2) y un vecino que sea ya conocido (nivel 2 de amistad).',
    greetings: [
      '¡{saludo}, cielo! ¿Buscas algo que te favorezca? Tengo justo lo que necesitas, {c}.',
      'Pruébatelo en el probador sin compromiso. ¡El espejo no miente, {c}!',
      'Cada día cuelgo prendas nuevas. Si ves algo que te gusta, no lo pienses, {c}.',
    ],
    icon: '👗',
    hall: hall(tradeHall('boutique', 'Boutique', { floor: Block.Planks, wall: Block.Wall, corner: Block.Wall, roof: 0, shopWindow: true, awning: true }), [
      ['maniqui', 2, 1, 8, 0], ['maniqui', 8, 1, 8, 0], ['perchero', 2, 1, 5, 1], ['perchero', 8, 1, 5, 3], ['espejo', 2, 1, 3, 1], ['maquina_coser', 3, 1, 2, 0], ['alfombra', 5, 1, 6, 0],
    ]),
  },
  {
    shop: SERRIN,
    profile: {
      name: 'Serrín', species: 'mapache', personality: 'alegre', catchphrase: 'ñic', shirt: 0x3f7a4a,
      likes: 'madera', sleep: [22, 7], stationary: true, role: 'shop', shop: 'muebles', birthday: [2, 9], hobby: 'lijar madera',
    },
    building: WAREHOUSE,
    fixtures: [...COUNTER, ['sofa', 1, 1, 5, 1], ['mesa', 5, 1, 5, 0], ['lampara', 1, 1, 1, 0], ['estanteria', 5, 1, 1, 0]],
    counter: [3, 1, 2],
    bed: [1, 1, 2],
    unlocked: (c) => (c.shopLevel ?? 0) >= 1,
    unlockText: 'Cuando la tienda de Avellana llega a Tienda grande (20.000 bayas gastadas).',
    greetings: [
      '¡{saludo}! Muebles para todos los gustos: rústicos, modernos, playeros, elegantes y monos, {c}.',
      'Mi catálogo cambia cada día. ¡Hoy tengo cosas que mañana ya no, {c}!',
      'Si regalas a un vecino un mueble de su estilo, le harás muy feliz, {c}.',
    ],
    icon: '🛋️',
    hall: hall(tradeHall('nave-muebles', 'Nave de muebles', { floor: Block.Planks, wall: Block.ShopWall, corner: Block.Log, roof: 2, shopWindow: true }), [
      ['banco_carpintero', 2, 1, 2, 0], ['sofa', 2, 1, 7, 1], ['mesa', 8, 1, 7, 0], ['silla', 8, 1, 8, 2], ['lampara', 2, 1, 8, 0], ['estanteria', 8, 1, 5, 3], ['alfombra', 5, 1, 7, 0],
    ]),
  },
  {
    shop: BALDOSA,
    profile: {
      name: 'Baldosa', species: 'jirafa', personality: 'deportista', catchphrase: 'zas', shirt: 0xf0a030,
      likes: 'madera', sleep: [21, 6], stationary: true, role: 'shop', shop: 'urbano', birthday: [10, 4], hobby: 'medir calles',
    },
    building: WORKSHOP,
    fixtures: [...COUNTER, ['farola_hierro', 0, 1, 7, 0], ['banco_parque', 1, 1, 7, 0], ['jardinera', 5, 1, 7, 0], ['senal_calle', 6, 1, 7, 0], ['barril', 1, 1, 1, 0]],
    counter: [3, 1, 2],
    bed: [5, 1, 1],
    unlocked: (c) => c.townLevel >= 3 && (c.works ?? 0) >= 1,
    unlockText: 'Con el ayuntamiento de nivel 3 y una obra pública ya hecha.',
    greetings: [
      '¡{saludo}! Una isla con buenas calles es una isla feliz. ¿Qué te pongo, {c}?',
      'Farolas, bancos, jardineras… todo de calidad y a buen precio, {c}.',
      'Los domingos descanso. Hay que estirar el cuello de vez en cuando, {c}.',
    ],
    icon: '🏮',
    hall: hall(tradeHall('taller', 'Taller', { floor: Block.Tiles, wall: Block.Brick, corner: Block.PolishedStone, roof: 3, awning: true }), [
      ['muestrario', 2, 1, 5, 1], ['muestrario', 8, 1, 5, 3], ['jardinera', 2, 1, 8, 0], ['barril', 2, 1, 2, 0],
      ['farola_hierro', 0, 1, 11, 0], ['banco_parque', 2, 1, 11, 0], ['senal_calle', 9, 1, 11, 0],
    ]),
  },
];

export function merchantOf(shopId: string): Merchant | undefined {
  return MERCHANTS.find((m) => m.shop.id === shopId);
}

/** Bayas por cada uso gastado al arreglar una herramienta: más caro cuanto mejor es. */
export function repairCost(durability: number, wear: number): number {
  const perUse = durability >= 200 ? 15 : durability >= 100 ? 8 : 4;
  return wear * perUse;
}
