// El archipiélago (v4.22): alrededor de tu isla hay otras islas a las que se llega navegando. Cada isla de casa
// tiene siempre las mismas, en la misma dirección. Las hay de tres tipos: misteriosas (raras y con cosas
// extrañas), de recursos (minerales, maderas y plantas que no hay en casa, y se renuevan cada pocos días) y
// aldeas (con vecinos sin nombre y alguien a quien invitar). Las más lejanas piden un barco mejor.
// Aquí está lo que no depende de la partida.

import type { BoatKind } from './shipyard';
import type { Personality, Profile, Species } from './villagers';
import type { MysteryKind } from './world';

export type SeaIslandType = 'misteriosa' | 'recursos' | 'aldea';

export interface SeaIsland {
  id: string;
  name: string;
  type: SeaIslandType;
  /** Hacia dónde queda desde tu isla (ángulo en el plano x, z: 0 es +x, hacia el este). */
  angle: number;
  /** Lo lejos que está: 1 cerca, 2 lejos, 3 muy lejos. */
  ring: 1 | 2 | 3;
  /** Semilla de su terreno. */
  seed: number;
  kind: MysteryKind;
}

export const SEA_TYPES: Record<SeaIslandType, { name: string; icon: string; text: string }> = {
  misteriosa: {
    name: 'Isla misteriosa', icon: '🔮',
    text: 'Muy rara: solo hay una en todo el mar. Cristales, volcanes o setas, y peces, bichos y minerales que no salen en casa.',
  },
  recursos: {
    name: 'Isla de recursos', icon: '⛏️',
    text: 'Minerales, maderas y plantas que no hay en tu isla, y a veces alguien de acampada. Se renueva cada tres días.',
  },
  aldea: {
    name: 'Isla aldea', icon: '🏘️',
    text: 'Un pueblecito con vecinos que charlan contigo y alguien con nombre al que puedes invitar a vivir en tu isla.',
  },
};

/** Lo que pide cada distancia: la balsa llega a las cercanas, el velero a las lejanas y el de expedición a todas. */
export const RING_BOAT: Record<1 | 2 | 3, BoatKind> = { 1: 'balsa', 2: 'velero', 3: 'expedicion' };
export const RING_NAMES: Record<1 | 2 | 3, string> = { 1: 'Cerca', 2: 'Lejos', 3: 'Muy lejos' };
const BOAT_RANK: Record<BoatKind, number> = { balsa: 1, velero: 2, expedicion: 3 };

export function canReach(boat: BoatKind, island: SeaIsland): boolean {
  return BOAT_RANK[boat] >= island.ring;
}

const NAMES = [
  'Isla Gaviota', 'Isla Coral', 'Isla Bruma', 'Isla Caracola', 'Isla Lucero', 'Isla Ballena',
  'Isla Ancla', 'Isla Faro', 'Isla Sirena', 'Isla Marea', 'Isla Albatros', 'Isla Perla',
];

const KINDS: Record<SeaIslandType, MysteryKind[]> = {
  misteriosa: ['cristal', 'volcan', 'setas'],
  recursos: ['minerales', 'bambu', 'nieve', 'flores'],
  aldea: ['frutas', 'flores'],
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cuántas islas hay alrededor de cada isla de casa. */
export const SEA_ISLANDS = 9;

/**
 * Las islas del mar de una isla de casa: siempre las mismas para la misma semilla. Una sola misteriosa (lejos o
 * muy lejos), y de las demás, aldeas y de recursos a partes iguales, repartidas en todas las direcciones.
 */
export function archipelago(homeSeed: number): SeaIsland[] {
  const r = rng(homeSeed ^ 0x51ab1e);
  const rings: (1 | 2 | 3)[] = [1, 1, 1, 2, 2, 2, 3, 3, 3];
  const types: SeaIslandType[] = ['aldea', 'recursos', 'aldea', 'recursos', 'aldea', 'recursos', 'aldea', 'recursos', 'misteriosa'];
  // Se barajan los anillos; la misteriosa nunca está cerca.
  for (let i = rings.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [rings[i], rings[j]] = [rings[j], rings[i]];
  }
  const far = rings.findIndex((g) => g >= 2);
  [rings[far], rings[8]] = [rings[8], rings[far]];
  const names = [...NAMES];
  const order = Array.from({ length: SEA_ISLANDS }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const start = r() * Math.PI * 2;
  return order.map((slot, i) => {
    const type = types[i];
    const kinds = KINDS[type];
    const name = names.splice(Math.floor(r() * names.length), 1)[0];
    return {
      id: `isla-${i}`,
      name,
      type,
      angle: start + (slot / SEA_ISLANDS) * Math.PI * 2 + (r() - 0.5) * 0.3,
      ring: rings[i],
      seed: Math.floor(r() * 1e9),
      kind: kinds[Math.floor(r() * kinds.length)],
    };
  });
}

/** Diferencia entre dos ángulos, de 0 a π. */
function angleGap(a: number, b: number): number {
  const d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  return d;
}

/** La isla hacia la que vas si sales del mar de casa por (x, z): la que queda en esa dirección (±25°). */
export function islandAhead(islands: SeaIsland[], x: number, z: number): SeaIsland | null {
  const a = Math.atan2(z, x);
  let best: SeaIsland | null = null;
  let gap = (25 * Math.PI) / 180;
  for (const i of islands) {
    const g = angleGap(a, i.angle);
    if (g < gap) {
      gap = g;
      best = i;
    }
  }
  return best;
}

/** La semilla del terreno de una isla para hoy: las de recursos cambian cada tres días. */
export function islandSeed(island: SeaIsland, dayNumber: number): number {
  return island.type === 'recursos' ? island.seed + Math.floor(dayNumber / 3) * 7919 : island.seed;
}

/** Número de día desde una fecha "2026-10-28" (para que las islas de recursos se renueven). */
export function dayNumber(today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

const GENERIC_SPECIES: Species[] = ['gato', 'conejo', 'oso', 'pato', 'perro', 'rana', 'ardilla', 'oveja', 'cerdo', 'koala', 'zorro', 'elefante', 'cabra', 'nutria'];
const GENERIC_PERSONALITIES: Personality[] = ['alegre', 'gruñón', 'dormilón', 'presumido', 'deportista', 'dulce'];
const GENERIC_LIKES: Profile['likes'][] = ['fruta', 'conchas', 'flores', 'madera'];
const GENERIC_HOBBIES = ['pescar en el muelle', 'cuidar su huerto', 'mirar los barcos', 'coleccionar piedras', 'cantar en la plaza', 'hacer pan'];
/** Cómo se presentan: sin nombre propio, por lo que son en el pueblo. */
const GENERIC_TITLES = ['del puerto', 'de la plaza', 'del huerto', 'de la colina', 'del faro', 'de la playa'];

/** Nombre de cada especie para los vecinos sin nombre ("Gata del puerto"). */
const SPECIES_WORD: Partial<Record<Species, string>> = {
  gato: 'Gato', conejo: 'Conejo', oso: 'Oso', pato: 'Pato', perro: 'Perro', rana: 'Rana', ardilla: 'Ardilla', oveja: 'Oveja',
  cerdo: 'Cerdo', koala: 'Koala', zorro: 'Zorro', elefante: 'Elefante', cabra: 'Cabra', nutria: 'Nutria',
};

/** Los vecinos sin nombre de una isla aldea: especie, color y personalidad al azar, siempre los mismos. */
export function genericVillagers(seed: number, count: number): Profile[] {
  const r = rng(seed ^ 0xa1de);
  const species = [...GENERIC_SPECIES];
  const titles = [...GENERIC_TITLES];
  return Array.from({ length: count }, () => {
    const sp = species.splice(Math.floor(r() * species.length), 1)[0];
    const title = titles.splice(Math.floor(r() * titles.length), 1)[0];
    return {
      name: `${SPECIES_WORD[sp]} ${title}`,
      species: sp,
      personality: GENERIC_PERSONALITIES[Math.floor(r() * GENERIC_PERSONALITIES.length)],
      catchphrase: ['ya', 'eh', 'oye', 'mira', 'pues'][Math.floor(r() * 5)],
      shirt: Math.floor(r() * 0xffffff),
      likes: GENERIC_LIKES[Math.floor(r() * GENERIC_LIKES.length)],
      birthday: [1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28)],
      hobby: GENERIC_HOBBIES[Math.floor(r() * GENERIC_HOBBIES.length)],
    } satisfies Profile;
  });
}

/** Lo que se recuerda del mar: las islas a las que ya se ha llegado. */
export interface SeaSave {
  discovered: string[];
}

export function isSeaSave(v: unknown): v is SeaSave {
  return typeof v === 'object' && v !== null && Array.isArray((v as SeaSave).discovered) && (v as SeaSave).discovered.every((s) => typeof s === 'string');
}
