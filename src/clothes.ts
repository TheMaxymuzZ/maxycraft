// Moda (v4.18): la ropa que se pone el jugador. Cada prenda va en un hueco (cabeza, cuerpo, piernas, pies,
// espalda o cara), tiene su color y su icono, y se ve sobre el muñeco del jugador: en el espejo y en los amigos.
// Aquí solo hay datos; el muñeco está en playerModel.ts y el armario en wardrobe.ts.

export type Slot = 'cabeza' | 'cuerpo' | 'piernas' | 'pies' | 'espalda' | 'cara';
export const SLOTS: Slot[] = ['cabeza', 'cara', 'cuerpo', 'espalda', 'piernas', 'pies'];
export const SLOT_NAMES: Record<Slot, string> = {
  cabeza: 'Cabeza', cara: 'Cara', cuerpo: 'Cuerpo', espalda: 'Espalda', piernas: 'Piernas', pies: 'Pies',
};

/** Lo que lleva puesto: id de la prenda en cada hueco. */
export type Outfit = Partial<Record<Slot, string>>;

/** A qué parte del muñeco va pegada una caja (cada parte con su origen, ver playerModel.ts). */
export type Bone = 'head' | 'body' | 'legL' | 'legR' | 'armL' | 'armR';
/** Una caja: [ancho, alto, fondo, x, y, z] y su color: 'c' el de la prenda, 'd' más oscuro, 'a' el de adorno o un número. */
export type GarmentPart = [Bone, [number, number, number, number, number, number], 'c' | 'd' | 'a' | number];

export interface Garment {
  /** Modelo de prenda (gorra, camiseta…). */
  base: string;
  slot: Slot;
  name: string;
  parts: GarmentPart[];
  /** Pinta del color de la prenda el cuerpo, los brazos o las piernas del muñeco ('piel' los deja al aire). */
  tint?: { body?: true; arms?: 'c' | 'piel'; legs?: 'c' | 'piel' };
  /** Icono de 16×16 con las mismas letras de color. */
  icon: string[];
  sell: number;
  /** Las legendarias no se venden: salen en las islas misteriosas. */
  legendary?: boolean;
}

const BOTH_LEGS = (box: [number, number, number, number, number, number], color: GarmentPart[2]): GarmentPart[] => [['legL', box, color], ['legR', box, color]];

export const GARMENTS: Garment[] = [
  {
    base: 'gorra', slot: 'cabeza', name: 'Gorra', sell: 150,
    parts: [['head', [0.54, 0.14, 0.54, 0, 0.27, 0], 'c'], ['head', [0.48, 0.04, 0.24, 0, 0.22, 0.36], 'd']],
    icon: ['................', '................', '................', '.....cccccc.....', '....cccacccc....', '...cccccccccc...', '...cccccccccc...', '...cccccccccc...', '...ddddddddddddd', '.........ddddddd', '................', '................', '................', '................', '................', '................'],
  },
  {
    base: 'sombrero', slot: 'cabeza', name: 'Sombrero', sell: 260,
    parts: [['head', [0.84, 0.04, 0.84, 0, 0.26, 0], 'c'], ['head', [0.52, 0.24, 0.52, 0, 0.38, 0], 'c'], ['head', [0.53, 0.06, 0.53, 0, 0.3, 0], 'a']],
    icon: ['................', '................', '................', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....aaaaaa.....', '.cccccccccccccc.', 'dddddddddddddddd', '................', '................', '................', '................', '................', '................', '................'],
  },
  {
    base: 'gorro', slot: 'cabeza', name: 'Gorro de lana', sell: 180,
    parts: [['head', [0.56, 0.24, 0.56, 0, 0.3, 0], 'c'], ['head', [0.58, 0.06, 0.58, 0, 0.2, 0], 'd'], ['head', [0.16, 0.14, 0.16, 0, 0.48, 0], 'a']],
    icon: ['................', '.......aa.......', '......aaaa......', '.......aa.......', '.....cccccc.....', '....cccccccc....', '...cccccccccc...', '...cccccccccc...', '...cccccccccc...', '..dddddddddddd..', '..dddddddddddd..', '................', '................', '................', '................', '................'],
  },
  {
    base: 'camiseta', slot: 'cuerpo', name: 'Camiseta', sell: 160, tint: { body: true, arms: 'c' },
    parts: [['body', [0.2, 0.06, 0.02, 0, 0.32, 0.15], 'd']],
    icon: ['................', '................', '...ccc....ccc...', '..ccccc..ccccc..', '.cccccccddccccc.', '.cccccccccccccc.', '..ccccccccccccc.', '....cccccccc....', '....cccccccc....', '....cccccccc....', '....cccccccc....', '....cccccccc....', '....dddddddd....', '................', '................', '................'],
  },
  {
    base: 'sudadera', slot: 'cuerpo', name: 'Sudadera', sell: 280, tint: { body: true, arms: 'c' },
    parts: [['body', [0.32, 0.14, 0.02, 0, -0.18, 0.15], 'd'], ['body', [0.42, 0.22, 0.1, 0, 0.3, -0.18], 'd'], ['body', [0.04, 0.2, 0.02, -0.06, 0.2, 0.15], 'a'], ['body', [0.04, 0.2, 0.02, 0.06, 0.2, 0.15], 'a']],
    icon: ['................', '.....dddddd.....', '...ccdd..ddcc...', '..cccc.aa.cccc..', '.ccccc.aa.ccccc.', '.cccccccccccccc.', '.cccccccccccccc.', '.cc.cccccccc.cc.', '.cc.cccccccc.cc.', '.cc.cddddddc.cc.', '.dd.cddddddc.dd.', '....cccccccc....', '....dddddddd....', '................', '................', '................'],
  },
  {
    base: 'vestido', slot: 'cuerpo', name: 'Vestido', sell: 320, tint: { body: true, arms: 'piel' },
    parts: [['body', [0.62, 0.42, 0.4, 0, -0.5, 0], 'c'], ['body', [0.64, 0.06, 0.42, 0, -0.69, 0], 'a'], ['body', [0.52, 0.06, 0.3, 0, -0.3, 0], 'd']],
    icon: ['................', '.....c....c.....', '.....c....c.....', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....dddddd.....', '....cccccccc....', '...cccccccccc...', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccc..', '.aaaaaaaaaaaaaa.', '................', '................', '................'],
  },
  {
    base: 'pantalon', slot: 'piernas', name: 'Pantalón', sell: 200, tint: { legs: 'c' },
    parts: [['body', [0.52, 0.06, 0.3, 0, -0.33, 0], 'd']],
    icon: ['................', '...dddddddddd...', '...cccccccccc...', '...cccccccccc...', '...ccccc.cccc...', '...cccc..cccc...', '...cccc..cccc...', '...cccc..cccc...', '...cccc..cccc...', '...cccc..cccc...', '...cccc..cccc...', '...cccc..cccc...', '...dddd..dddd...', '................', '................', '................'],
  },
  {
    base: 'pantalon_corto', slot: 'piernas', name: 'Pantalón corto', sell: 140, tint: { legs: 'piel' },
    parts: BOTH_LEGS([0.26, 0.34, 0.29, 0, -0.17, 0], 'c'),
    icon: ['................', '................', '................', '...dddddddddd...', '...cccccccccc...', '...cccccccccc...', '...ccccc.cccc...', '...cccc..cccc...', '...cccc..cccc...', '...dddd..dddd...', '................', '................', '................', '................', '................', '................'],
  },
  {
    base: 'zapatillas', slot: 'pies', name: 'Zapatillas', sell: 180,
    parts: [...BOTH_LEGS([0.25, 0.12, 0.34, 0, -0.68, 0.04], 'c'), ...BOTH_LEGS([0.26, 0.04, 0.35, 0, -0.74, 0.04], 0xf4f4f0)],
    icon: ['................', '................', '................', '................', '................', '................', '.ccc.......ccc..', '.cccc......cccc.', '.ccacccc...caccc', '.cccccccc..ccccc', '.wwwwwwww..wwwww', '................', '................', '................', '................', '................'].map((r) => r.replace(/w/g, 'a')),
  },
  {
    base: 'botas', slot: 'pies', name: 'Botas', sell: 240,
    parts: [...BOTH_LEGS([0.26, 0.32, 0.3, 0, -0.6, 0.02], 'c'), ...BOTH_LEGS([0.27, 0.05, 0.33, 0, -0.74, 0.04], 'd')],
    icon: ['................', '................', '...cccc...cccc..', '...cccc...cccc..', '...cccc...cccc..', '...cccc...cccc..', '...cccc...cccc..', '...cccc...cccc..', '...cccccc.cccccc', '...cccccc.cccccc', '...dddddd.dddddd', '................', '................', '................', '................', '................'],
  },
  {
    base: 'mochila', slot: 'espalda', name: 'Mochila', sell: 260,
    parts: [['body', [0.42, 0.46, 0.18, 0, 0.0, -0.23], 'c'], ['body', [0.42, 0.14, 0.2, 0, 0.18, -0.24], 'd'], ['body', [0.08, 0.08, 0.02, 0, 0.08, -0.34], 'a']],
    icon: ['................', '......dddd......', '.....d....d.....', '...cccccccccc...', '...dddddddddd...', '...dddddddddd...', '...ccccaaccccc..', '...cccccccccc...', '...cccccccccc...', '...cccccccccc...', '...cccccccccc...', '...cccccccccc...', '...dddddddddd...', '................', '................', '................'],
  },
  {
    base: 'capa', slot: 'espalda', name: 'Capa', sell: 300,
    parts: [['body', [0.6, 1.0, 0.04, 0, -0.22, -0.17], 'c'], ['body', [0.6, 0.08, 0.06, 0, 0.3, -0.15], 'a']],
    icon: ['................', '...aaaaaaaaaa...', '...cccccccccc...', '...cccccccccc...', '..cccccccccccc..', '..cccccccccccc..', '..cccccccccccc..', '.cccccccccccccc.', '.cccccccccccccc.', '.cccccccccccccc.', '.cccccccccccccc.', '.dddddddddddddd.', '................', '................', '................', '................'],
  },
  {
    base: 'gafas', slot: 'cara', name: 'Gafas', sell: 220,
    parts: [['head', [0.16, 0.12, 0.02, -0.11, 0.02, 0.27], 'c'], ['head', [0.16, 0.12, 0.02, 0.11, 0.02, 0.27], 'c'], ['head', [0.08, 0.03, 0.02, 0, 0.05, 0.27], 'c'], ['head', [0.1, 0.07, 0.02, -0.11, 0.02, 0.28], 'a'], ['head', [0.1, 0.07, 0.02, 0.11, 0.02, 0.28], 'a']],
    icon: ['................', '................', '................', '................', '................', '.cccccc..cccccc.', '.caaaacccaaaaac.', '.caaaac..caaaac.', '.caaaac..caaaac.', '.cccccc..cccccc.', '................', '................', '................', '................', '................', '................'],
  },
  {
    base: 'gafas_sol', slot: 'cara', name: 'Gafas de sol', sell: 260,
    parts: [['head', [0.18, 0.12, 0.02, -0.11, 0.02, 0.27], 'c'], ['head', [0.18, 0.12, 0.02, 0.11, 0.02, 0.27], 'c'], ['head', [0.1, 0.03, 0.02, 0, 0.06, 0.27], 'a']],
    icon: ['................', '................', '................', '................', '................', '.aaaaaaaaaaaaaa.', '.ccccccaaccccccc', '.cccccc..cccccc.', '..cccc....cccc..', '................', '................', '................', '................', '................', '................', '................'],
  },
  // Legendarias: no las vende nadie.
  {
    base: 'corona', slot: 'cabeza', name: 'Corona', sell: 5000, legendary: true,
    parts: [['head', [0.54, 0.12, 0.54, 0, 0.3, 0], 'c'], ...[-0.2, 0, 0.2].map((x): GarmentPart => ['head', [0.1, 0.14, 0.54, x, 0.42, 0], 'c']), ['head', [0.08, 0.08, 0.02, 0, 0.3, 0.28], 'a']],
    icon: ['................', '................', '................', '..c....c....c...', '..cc..ccc..cc...', '..ccc.ccc.ccc...', '..ccccccccccc...', '..cccccaccccc...', '..ccccaaaccccc..', '..ddddddddddd...', '................', '................', '................', '................', '................', '................'],
  },
  {
    base: 'capa_estelar', slot: 'espalda', name: 'Capa estelar', sell: 5000, legendary: true,
    parts: [['body', [0.62, 1.04, 0.04, 0, -0.24, -0.17], 'c'], ['body', [0.08, 0.08, 0.02, -0.14, 0.0, -0.2], 'a'], ['body', [0.08, 0.08, 0.02, 0.16, -0.3, -0.2], 'a'], ['body', [0.06, 0.06, 0.02, -0.06, -0.55, -0.2], 'a'], ['body', [0.62, 0.08, 0.06, 0, 0.3, -0.15], 'a']],
    icon: ['................', '...aaaaaaaaaa...', '...cccccccccc...', '...ccacccccc....', '..cccccccccacc..', '..cccccccccccc..', '..ccccaccccccc..', '.cccccccccccccc.', '.cccccccccaccc..', '.ccaccccccccccc.', '.cccccccccccccc.', '.dddddddddddddd.', '................', '................', '................', '................'],
  },
];

export interface ClothColor {
  id: string;
  name: string;
  /** Femenino y masculino del nombre del color ("roja"/"rojo"). */
  f: string;
  c: number;
  a: number;
}

export const COLORS: ClothColor[] = [
  { id: 'rojo', name: 'rojo', f: 'roja', c: 0xd64541, a: 0xf4f0e6 },
  { id: 'azul', name: 'azul', f: 'azul', c: 0x3f6fc4, a: 0xf4f0e6 },
  { id: 'verde', name: 'verde', f: 'verde', c: 0x4f9a50, a: 0xf2d060 },
  { id: 'amarillo', name: 'amarillo', f: 'amarilla', c: 0xf0c03c, a: 0x8a5a30 },
  { id: 'rosa', name: 'rosa', f: 'rosa', c: 0xee8fb2, a: 0xffffff },
  { id: 'negro', name: 'negro', f: 'negra', c: 0x34343c, a: 0xd8d8d8 },
  { id: 'blanco', name: 'blanco', f: 'blanca', c: 0xf2efe6, a: 0x6a8ad0 },
  { id: 'morado', name: 'morado', f: 'morada', c: 0x8a5ac0, a: 0xf2d060 },
  { id: 'marron', name: 'marrón', f: 'marrón', c: 0x8b5a35, a: 0xe8c890 },
];

/** Qué colores tiene cada prenda (las de la lista con 4 colores, las otras con 3; las gafas y las legendarias, uno). */
const RANGE: Record<string, string[]> = {
  gorra: ['rojo', 'azul', 'verde', 'negro'],
  camiseta: ['blanco', 'rojo', 'azul', 'amarillo'],
  sudadera: ['verde', 'rosa', 'negro', 'morado'],
  pantalon: ['azul', 'negro', 'marron', 'verde'],
  zapatillas: ['blanco', 'rojo', 'azul', 'negro'],
  sombrero: ['marron', 'blanco', 'negro'],
  gorro: ['rojo', 'amarillo', 'azul'],
  vestido: ['rosa', 'amarillo', 'azul'],
  pantalon_corto: ['azul', 'verde', 'rojo'],
  botas: ['marron', 'negro', 'amarillo'],
  mochila: ['rojo', 'verde', 'amarillo'],
  capa: ['rojo', 'morado', 'negro'],
  gafas: ['negro'],
  gafas_sol: ['negro'],
  corona: ['amarillo'],
  capa_estelar: ['morado'],
};
/** Palabras en femenino: el color concuerda con la prenda. */
const FEMININE = new Set(['gorra', 'camiseta', 'sudadera', 'zapatillas', 'botas', 'mochila', 'capa', 'gafas', 'gafas_sol', 'corona', 'capa_estelar']);
const PLURAL = new Set(['zapatillas', 'botas', 'gafas', 'gafas_sol']);

export interface Cloth {
  id: string;
  name: string;
  garment: Garment;
  color: ClothColor;
  /** Casilla de su icono en el atlas. */
  tile: number;
}

/** Los iconos de la ropa van después de los dibujos extra (EXTRA_TILE_START + 32 en blocks.ts). */
export const CLOTHES_TILE_START = 256 + 32;

function plural(word: string): string {
  if (word === 'marrón') return 'marrones';
  return /[aeiou]$/.test(word) ? `${word}s` : `${word}es`;
}

function clothName(g: Garment, color: ClothColor): string {
  if (g.legendary || g.base === 'gafas' || g.base === 'gafas_sol') return g.name;
  const word = FEMININE.has(g.base) ? color.f : color.name;
  return `${g.name} ${PLURAL.has(g.base) ? plural(word) : word}`;
}

export const CLOTHES: Cloth[] = GARMENTS.flatMap((g) => RANGE[g.base].map((cid) => {
  const color = COLORS.find((c) => c.id === cid)!;
  const unique = RANGE[g.base].length === 1;
  return { id: unique ? g.base : `${g.base}_${cid}`, name: clothName(g, color), garment: g, color, tile: 0 };
})).map((c, i) => ({ ...c, tile: CLOTHES_TILE_START + i }));

const byId = new Map(CLOTHES.map((c) => [c.id, c]));
export function clothOf(id: string | undefined): Cloth | undefined {
  return id ? byId.get(id) : undefined;
}

/** Un color un poco más oscuro, para las sombras de la prenda. */
export function darker(color: number, k = 0.72): number {
  const r = Math.round(((color >> 16) & 255) * k);
  const g = Math.round(((color >> 8) & 255) * k);
  const b = Math.round((color & 255) * k);
  return (r << 16) | (g << 8) | b;
}

/** Color de una caja de la prenda. */
export function partColor(cloth: Cloth, c: GarmentPart[2]): number {
  return c === 'c' ? cloth.color.c : c === 'd' ? darker(cloth.color.c) : c === 'a' ? cloth.color.a : c;
}

/** Si lo que llega (de la partida o de la red) tiene forma de conjunto: cada prenda que existe, en su hueco. */
export function isOutfit(v: unknown): v is Outfit {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.entries(v).every(([slot, id]) => SLOTS.includes(slot as Slot) && typeof id === 'string' && clothOf(id)?.garment.slot === slot);
}

/** Conjuntos que se pueden guardar en el armario. */
export const MAX_SETS = 3;
