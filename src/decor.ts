// Casas de vecinos decorables (v4.12). Cada vecino tiene un estilo de decoración; los muebles que le regalas
// aparecen en su casa, en unos huecos fijos, y te dice si le gustan. Con la amistad su casa crece por niveles
// (más huecos, jardín y tejado a elegir) y, con los mejores amigos, te propone abrir un negocio.

import { furnitureDef } from './furniture';
import { type Cell, type PathWorld, standable } from './pathfind';
import type { Personality, Profile } from './villagers';

export type DecorStyle = 'rustico' | 'moderno' | 'playero' | 'elegante' | 'mono';

export const STYLE_NAMES: Record<DecorStyle, string> = {
  rustico: 'rústico',
  moderno: 'moderno',
  playero: 'playero',
  elegante: 'elegante',
  mono: 'mono',
};

/** A qué estilos pertenece cada mueble (alguno encaja en dos). */
export const FURNITURE_STYLE: Record<string, DecorStyle[]> = {
  cama: ['rustico', 'mono'],
  mesa: ['rustico'],
  silla: ['rustico'],
  lampara: ['moderno', 'elegante'],
  estanteria: ['elegante', 'rustico'],
  sofa: ['moderno', 'elegante'],
  planta: ['playero', 'mono'],
  alfombra: ['mono', 'elegante'],
  barril: ['rustico', 'playero'],
  farol: ['playero', 'rustico'],
  banco: ['playero'],
  mostrador: ['rustico'],
  caja_registradora: ['moderno'],
  bascula: ['moderno'],
  panel_salidas: ['moderno'],
  espantapajaros: ['rustico', 'mono'],
  vagoneta: ['rustico'],
  railes: ['rustico'],
  calabaza: ['mono'],
  arbol_navidad: ['mono', 'elegante'],
  trofeo: ['elegante'],
  fuente: ['elegante', 'playero'],
  farola: ['moderno'],
  papelera: ['moderno'],
  cartel: ['rustico'],
  macetero: ['playero', 'mono'],
  fuente_plaza: ['elegante'],
  buzon: ['moderno', 'mono'],
  // v4.18
  armario: ['rustico', 'elegante'],
  espejo: ['elegante'],
  tumbona: ['playero'],
  sombrilla: ['playero'],
  sillon_moderno: ['moderno'],
  mesa_cristal: ['moderno'],
  cama_dosel: ['elegante', 'mono'],
  piano: ['elegante'],
  peluche_oso: ['mono'],
  puf: ['mono', 'moderno'],
  mecedora: ['rustico'],
  chimenea: ['rustico', 'elegante'],
  maniqui: ['elegante', 'moderno'],
  perchero: ['moderno'],
  farola_hierro: ['elegante'],
  banco_parque: ['elegante', 'playero'],
  jardinera: ['playero', 'mono'],
  pergola: ['rustico', 'playero'],
  senal_calle: ['moderno'],
};

/** Estilo de cada vecino conocido; los demás (los que vienen de islas misteriosas) lo sacan de su personalidad. */
const TASTES: Record<string, DecorStyle> = {
  Nube: 'mono',
  Trufa: 'rustico',
  Mora: 'elegante',
  'Bombón': 'rustico',
  'Saltarín': 'playero',
  'Castaña': 'elegante',
  Lenta: 'playero',
  'Algodón': 'mono',
  Rizos: 'elegante',
  Chispa: 'moderno',
  'Rubí': 'moderno',
  Rosita: 'mono',
};

const BY_PERSONALITY: Record<Personality, DecorStyle> = {
  alegre: 'mono',
  'gruñón': 'rustico',
  'dormilón': 'playero',
  presumido: 'elegante',
  deportista: 'moderno',
  dulce: 'mono',
};

export function decorTaste(profile: Pick<Profile, 'name' | 'personality'>): DecorStyle {
  return TASTES[profile.name] ?? BY_PERSONALITY[profile.personality];
}

/** Si un mueble es de su estilo. */
export function likesFurniture(profile: Pick<Profile, 'name' | 'personality'>, id: string): boolean {
  return (FURNITURE_STYLE[id] ?? []).includes(decorTaste(profile));
}

// --- Niveles de amistad ---

export interface FriendLevel {
  name: string;
  /** Puntos de amistad que hacen falta. */
  min: number;
  /** Lo que trae este nivel. */
  unlock: string;
}

export const FRIEND_LEVELS: FriendLevel[] = [
  { name: 'Conocido', min: 0, unlock: 'Te saluda y charla contigo.' },
  { name: 'Colega', min: 5, unlock: 'Te cuenta cosas de sí mismo y a veces te devuelve los regalos.' },
  { name: 'Amigo', min: 12, unlock: 'Te deja decorar su casa: girar y cambiar de sitio sus muebles.' },
  { name: 'Gran amigo', min: 25, unlock: 'Amplía su casita a casa: más huecos para muebles y un jardín.' },
  { name: 'Mejor amigo', min: 45, unlock: 'Casa grande con tejado a elegir y te propone abrir un negocio.' },
];

/** Nivel de amistad (índice en FRIEND_LEVELS). */
export function friendLevel(friendship: number): number {
  let level = 0;
  for (let i = 0; i < FRIEND_LEVELS.length; i++) if (friendship >= FRIEND_LEVELS[i].min) level = i;
  return level;
}

/** Nivel desde el que te deja decorar su casa. */
export const DECORATE_LEVEL = 2;

// --- Ampliaciones de la casa ---

export const HOUSE_LEVELS = [
  { name: 'casita', slots: 3, garden: false },
  { name: 'casa', slots: 5, garden: true },
  { name: 'casa grande', slots: 6, garden: true },
] as const;

/** El nivel de la casa según la amistad: casita, casa (gran amigo) y casa grande (mejor amigo). */
export function houseLevel(friendship: number): number {
  return Math.max(0, friendLevel(friendship) - 2);
}

/** Huecos para muebles dentro de la casa, contados desde la casilla delante de la puerta: [dx, dz, giro]. */
const SLOTS: [number, number, number][] = [
  [1, -4, 0],
  [0, -4, 0],
  [1, -3, 3],
  [-1, -3, 1],
  [1, -2, 3],
  [-1, -2, 1],
];

/** Sitios del jardín, delante de la casa a los lados de la puerta. */
const GARDEN: [number, number, string][] = [
  [-1, 0, 'macetero'],
  [1, 0, 'macetero'],
  [-2, 1, 'planta'],
  [2, 1, 'farol'],
];

export interface DecorSlot {
  cell: Cell;
  rot: number;
}

/** Huecos de la casa que se pueden usar según su nivel (los que no tienen suelo no cuentan). */
export function homeSlots(world: PathWorld, door: Cell, level: number): DecorSlot[] {
  const [x, y, z] = door;
  const out: DecorSlot[] = [];
  for (const [dx, dz, rot] of SLOTS.slice(0, HOUSE_LEVELS[level].slots)) {
    const cell: Cell = [x + dx, y, z + dz];
    if (standable(world, ...cell)) out.push({ cell, rot });
  }
  return out;
}

/** Plantas y faroles del jardín (desde el nivel casa). */
export function gardenPieces(world: PathWorld, door: Cell, level: number): { id: string; cell: Cell }[] {
  if (!HOUSE_LEVELS[level].garden) return [];
  const [x, y, z] = door;
  const pieces = level >= 2 ? GARDEN : GARDEN.slice(0, 2);
  return pieces.map(([dx, dz, id]) => ({ id, cell: [x + dx, y, z + dz] as Cell })).filter((p) => standable(world, ...p.cell));
}

/** Un mueble en casa de un vecino: el hueco (índice) y cómo está girado. */
export interface DecorPiece {
  id: string;
  slot: number;
  rot: number;
}

/**
 * Pone un mueble regalado en la casa: en el primer hueco libre o, si no queda ninguno, en el del mueble más antiguo
 * que no sea de su estilo (o el más antiguo de todos). Devuelve el mueble que ha tenido que quitar.
 */
export function addDecor(pieces: DecorPiece[], id: string, slots: number, likes: (id: string) => boolean): { placed: DecorPiece | null; removed: DecorPiece | null } {
  if (!slots || !furnitureDef(id)) return { placed: null, removed: null };
  const used = new Set(pieces.map((p) => p.slot));
  let slot = -1;
  for (let i = 0; i < slots; i++) {
    if (!used.has(i)) {
      slot = i;
      break;
    }
  }
  let removed: DecorPiece | null = null;
  if (slot < 0) {
    const old = pieces.find((p) => !likes(p.id)) ?? pieces[0];
    removed = old;
    slot = old.slot;
    pieces.splice(pieces.indexOf(old), 1);
  }
  const placed: DecorPiece = { id, slot, rot: SLOTS[slot][2] };
  pieces.push(placed);
  return { placed, removed };
}

/** Lleva un mueble al siguiente hueco libre (o lo cambia con el que haya en el siguiente). */
export function moveDecor(pieces: DecorPiece[], piece: DecorPiece, slots: number) {
  if (slots < 2) return;
  const next = (piece.slot + 1) % slots;
  const other = pieces.find((p) => p !== piece && p.slot === next);
  if (other) {
    other.slot = piece.slot;
    other.rot = SLOTS[other.slot][2];
  }
  piece.slot = next;
  piece.rot = SLOTS[next][2];
}

/** Muebles que son femeninos, para decir "una mesa" o "la mesa". */
const FEMININE = new Set(['cama', 'mesa', 'silla', 'lampara', 'estanteria', 'planta', 'alfombra', 'calabaza', 'fuente', 'farola', 'papelera', 'fuente_plaza']);

/** El nombre del mueble con su artículo: "una mesa", "el sofá". */
export function furnitureName(id: string, definite = false): string {
  const name = furnitureDef(id)?.name.toLowerCase() ?? id;
  const fem = FEMININE.has(id);
  return `${definite ? (fem ? 'la' : 'el') : fem ? 'una' : 'un'} ${name}`;
}

/** Frases al recibir un mueble. {m} es el mueble con su artículo ({M} empezando en mayúscula) y {e} su estilo. */
export const DECOR_LIKED: Record<Personality, string> = {
  alegre: '¡¿{M}?! ¡Me encanta, es justo mi estilo {e}! Lo pongo ahora mismo en casa, ¡ven a verlo, {c}!',
  'gruñón': 'Hmm, {m}. Es de estilo {e}, como a mí me gusta. Le haré un hueco en casa. Gracias, {c}.',
  'dormilón': 'Uaaah… ¿{m}? Qué gusto, es de estilo {e}. Ya está en mi casa, {c}.',
  presumido: '¡{M}! Por fin alguien con gusto: estilo {e}, como yo. Mi casa va a quedar divina, {c}.',
  deportista: '¡{M}! ¡Estilo {e} total, me encanta! Lo coloco en casa en un periquete, {c}.',
  dulce: 'Ay, {m}… es justo de mi estilo {e}. Ya lo he puesto en casa, me acordaré de ti al verlo, {c}.',
};

export const DECOR_POLITE: Record<Personality, string> = {
  alegre: '¡{M}! No es muy de mi estilo, que a mí me va lo {e}, pero le buscaré un sitio en casa, {c}.',
  'gruñón': '{M}… A mí me gusta lo {e}. Bueno, lo pondré en algún rincón, {c}.',
  'dormilón': 'Mmm, {m}. Yo soy más de lo {e}, pero ya lo he puesto en casa, {c}.',
  presumido: '{M}… No pega mucho con lo {e}, pero lo pondré en casa. Por ser tú, {c}.',
  deportista: '¡Gracias! Yo soy más de lo {e}, pero {m} ya tiene sitio en casa, {c}.',
  dulce: 'Qué detalle, {m}. Me gusta más lo {e}, pero lo pondré en casa con cariño, {c}.',
};

/** La frase del vecino al recibir un mueble. */
export function decorLine(personality: Personality, id: string, style: DecorStyle, liked: boolean): string {
  const m = furnitureName(id);
  return (liked ? DECOR_LIKED : DECOR_POLITE)[personality]
    .replace('{M}', m[0].toUpperCase() + m.slice(1))
    .replace('{m}', m)
    .replace('{e}', STYLE_NAMES[style]);
}

/** Negocio que sueña con abrir cada personalidad (los comercios llegan en la v4.17 y la v4.18). */
export const BUSINESS: Record<Personality, string> = {
  alegre: 'una tienda agrícola',
  'gruñón': 'una caseta de minería',
  'dormilón': 'una granja',
  presumido: 'una tienda de ropa',
  deportista: 'una tienda de mobiliario urbano',
  dulce: 'una tienda de muebles',
};
