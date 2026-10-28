// Oficios del campo y la mina (v4.17): tres comercios nuevos que abren cuando la isla crece. Cada uno con su
// dueño, su edificio, su horario (en economy.ts) y su condición para abrir. Aquí está lo que no depende de la
// partida; game/commerce.ts los construye y pone a sus dueños.

import { Block } from './blocks';
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
