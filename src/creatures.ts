// Peces, insectos y fósiles de la isla: dónde y cuándo salen, cuánto valen y cómo se dibujan.
// Desde la v4.23, cuarenta peces: algunos solo en ciertos biomas, otros solo en alta mar (pescando desde el barco),
// y cada uno con su tamaño (para los récords) y lo que pelea al recoger el sedal.

import type { Biome } from './world';

/** Desde la v4.15 también fósiles: se encuentran cavando y se donan al museo como los peces y los insectos. */
export type CreatureKind = 'pez' | 'bicho' | 'fosil';
export type Habitat = 'mar' | 'río' | 'alta_mar' | 'flores' | 'árboles' | 'suelo' | 'agua' | 'tierra';

type RGB = [number, number, number];

export interface Creature {
  id: string;
  name: string;
  kind: CreatureKind;
  habitat: Habitat;
  /** Horas en las que sale [desde, hasta). Si desde > hasta, cruza la medianoche. */
  hours: [number, number];
  /** Meses en los que sale (1 a 12). Si no tiene, sale todo el año. */
  months?: [number, number];
  sell: number;
  /** Cuanto más alto, más fácil de encontrar. */
  weight: number;
  /** Solo sale en estos biomas (v4.23). */
  biomes?: Biome[];
  /** Tamaño en centímetros, de menos a más (v4.23). */
  size?: [number, number];
  /** Lo que pelea al recogerlo, de 0 (nada) a 1 (muchísimo) (v4.23). */
  fight?: number;
  sprite: 'pez' | 'pulpo' | 'mariposa' | 'escarabajo' | 'luciernaga' | 'libelula' | 'amonites' | 'trilobites' | 'diente' | 'hueso';
  colors: Record<string, RGB>;
}

const ALL_DAY: [number, number] = [0, 24];

export const CREATURES: Creature[] = [
  // Peces de mar
  { id: 'sardina', name: 'Sardina', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 120, weight: 10, sprite: 'pez', colors: { a: [120, 150, 190], b: [220, 230, 240] } },
  { id: 'caballa', name: 'Caballa', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 150, weight: 8, sprite: 'pez', colors: { a: [60, 110, 140], b: [200, 220, 220] } },
  { id: 'lubina', name: 'Lubina', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 400, weight: 5, sprite: 'pez', colors: { a: [110, 120, 130], b: [190, 196, 200] } },
  { id: 'pez_payaso', name: 'Pez payaso', kind: 'pez', habitat: 'mar', hours: [4, 21], sell: 650, weight: 3, sprite: 'pez', colors: { a: [240, 120, 40], b: [250, 250, 250] } },
  { id: 'pulpo', name: 'Pulpo', kind: 'pez', habitat: 'mar', hours: [18, 6], sell: 1200, weight: 2, sprite: 'pulpo', colors: { a: [210, 90, 110], b: [240, 150, 160] } },
  { id: 'atun', name: 'Atún', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 2500, weight: 1, sprite: 'pez', colors: { a: [40, 60, 110], b: [180, 190, 210] } },
  { id: 'pez_luna', name: 'Pez luna', kind: 'pez', habitat: 'mar', hours: [4, 21], months: [7, 9], sell: 4000, weight: 1, sprite: 'pez', colors: { a: [150, 160, 170], b: [210, 214, 220] } },
  // Peces de río
  { id: 'gobio', name: 'Gobio', kind: 'pez', habitat: 'río', hours: ALL_DAY, sell: 200, weight: 10, sprite: 'pez', colors: { a: [150, 130, 90], b: [220, 210, 180] } },
  { id: 'carpa', name: 'Carpa', kind: 'pez', habitat: 'río', hours: ALL_DAY, sell: 300, weight: 7, sprite: 'pez', colors: { a: [170, 140, 70], b: [230, 210, 150] } },
  { id: 'trucha', name: 'Trucha', kind: 'pez', habitat: 'río', hours: [4, 21], sell: 1000, weight: 3, sprite: 'pez', colors: { a: [120, 150, 110], b: [240, 170, 170] } },
  { id: 'salmon', name: 'Salmón', kind: 'pez', habitat: 'río', hours: ALL_DAY, months: [9, 11], sell: 700, weight: 4, sprite: 'pez', colors: { a: [200, 90, 80], b: [240, 180, 160] } },
  { id: 'siluro', name: 'Siluro', kind: 'pez', habitat: 'río', hours: [16, 9], sell: 800, weight: 3, sprite: 'pez', colors: { a: [70, 70, 60], b: [150, 140, 120] } },
  // Insectos
  { id: 'mariposa_blanca', name: 'Mariposa blanca', kind: 'bicho', habitat: 'flores', hours: [4, 19], sell: 160, weight: 10, sprite: 'mariposa', colors: { a: [246, 246, 238], b: [60, 50, 40] } },
  { id: 'mariposa_azul', name: 'Mariposa azul', kind: 'bicho', habitat: 'flores', hours: [8, 16], months: [3, 9], sell: 300, weight: 4, sprite: 'mariposa', colors: { a: [70, 130, 230], b: [40, 40, 50] } },
  { id: 'mariquita', name: 'Mariquita', kind: 'bicho', habitat: 'flores', hours: [8, 17], sell: 200, weight: 6, sprite: 'escarabajo', colors: { a: [220, 40, 40], b: [30, 30, 30] } },
  { id: 'escarabajo', name: 'Escarabajo rinoceronte', kind: 'bicho', habitat: 'árboles', hours: [17, 8], months: [6, 9], sell: 3000, weight: 1, sprite: 'escarabajo', colors: { a: [90, 50, 30], b: [50, 30, 20] } },
  { id: 'cigarra', name: 'Cigarra', kind: 'bicho', habitat: 'árboles', hours: [8, 17], months: [6, 8], sell: 250, weight: 6, sprite: 'escarabajo', colors: { a: [110, 140, 90], b: [60, 70, 50] } },
  { id: 'pulga_nieves', name: 'Pulga de las nieves', kind: 'bicho', habitat: 'suelo', hours: [8, 17], months: [12, 2], sell: 320, weight: 5, sprite: 'escarabajo', colors: { a: [60, 70, 100], b: [30, 30, 40] } },
  { id: 'grillo', name: 'Grillo', kind: 'bicho', habitat: 'suelo', hours: [17, 8], sell: 130, weight: 8, sprite: 'escarabajo', colors: { a: [70, 60, 40], b: [40, 30, 20] } },
  { id: 'luciernaga', name: 'Luciérnaga', kind: 'bicho', habitat: 'agua', hours: [19, 4], months: [5, 8], sell: 300, weight: 6, sprite: 'luciernaga', colors: { a: [250, 250, 140], b: [50, 50, 40] } },
  { id: 'libelula', name: 'Libélula', kind: 'bicho', habitat: 'agua', hours: [8, 17], sell: 180, weight: 7, sprite: 'libelula', colors: { a: [200, 60, 60], b: [180, 220, 240] } },
  // Fósiles (v4.15): salen cavando tierra, arena o piedra, más a menudo en las islas misteriosas.
  { id: 'amonites', name: 'Amonites', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 600, weight: 10, sprite: 'amonites', colors: { a: [190, 160, 120], b: [120, 95, 70] } },
  { id: 'trilobites', name: 'Trilobites', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 700, weight: 8, sprite: 'trilobites', colors: { a: [140, 130, 120], b: [80, 75, 70] } },
  { id: 'diente_tiburon', name: 'Diente de megalodón', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 1200, weight: 5, sprite: 'diente', colors: { a: [235, 225, 200], b: [150, 130, 100] } },
  { id: 'craneo_dino', name: 'Cráneo de dinosaurio', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 2500, weight: 2, sprite: 'hueso', colors: { a: [225, 215, 190], b: [160, 145, 120] } },
  { id: 'costillas_dino', name: 'Costillas de dinosaurio', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 2000, weight: 3, sprite: 'hueso', colors: { a: [215, 205, 180], b: [150, 135, 110] } },
  { id: 'cola_dino', name: 'Cola de dinosaurio', kind: 'fosil', habitat: 'tierra', hours: ALL_DAY, sell: 2000, weight: 3, sprite: 'hueso', colors: { a: [205, 195, 170], b: [140, 125, 100] } },
];

const COLD: Biome[] = ['taiga', 'tundra', 'glaciar', 'picos'];

// Peces nuevos (v4.23). Van al final para que los de antes conserven su casilla en el atlas.
CREATURES.push(
  // Mar
  { id: 'boqueron', name: 'Boquerón', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 90, weight: 10, size: [8, 16], fight: 0.1, sprite: 'pez', colors: { a: [140, 170, 200], b: [230, 236, 244] } },
  { id: 'dorada', name: 'Dorada', kind: 'pez', habitat: 'mar', hours: ALL_DAY, sell: 350, weight: 6, size: [20, 50], fight: 0.35, sprite: 'pez', colors: { a: [170, 170, 150], b: [240, 210, 110] } },
  { id: 'calamar', name: 'Calamar', kind: 'pez', habitat: 'mar', hours: [17, 6], sell: 500, weight: 4, size: [20, 60], fight: 0.3, sprite: 'pulpo', colors: { a: [236, 200, 200], b: [250, 230, 230] } },
  { id: 'pez_globo', name: 'Pez globo', kind: 'pez', habitat: 'mar', hours: [21, 4], months: [7, 9], sell: 900, weight: 3, size: [15, 40], fight: 0.25, sprite: 'pez', colors: { a: [210, 190, 120], b: [250, 240, 200] } },
  { id: 'caballito_mar', name: 'Caballito de mar', kind: 'pez', habitat: 'mar', hours: [4, 21], sell: 1100, weight: 3, size: [5, 20], fight: 0.1, sprite: 'pez', colors: { a: [240, 170, 60], b: [250, 220, 140] } },
  { id: 'rape', name: 'Rape', kind: 'pez', habitat: 'mar', hours: [16, 9], sell: 2000, weight: 2, size: [40, 120], fight: 0.6, sprite: 'pez', colors: { a: [110, 90, 70], b: [170, 150, 120] } },
  // Alta mar: solo pescando desde el barco.
  { id: 'lampuga', name: 'Lampuga', kind: 'pez', habitat: 'alta_mar', hours: ALL_DAY, sell: 900, weight: 6, size: [60, 140], fight: 0.55, sprite: 'pez', colors: { a: [60, 170, 120], b: [240, 220, 80] } },
  { id: 'pez_espada', name: 'Pez espada', kind: 'pez', habitat: 'alta_mar', hours: ALL_DAY, sell: 3500, weight: 3, size: [120, 300], fight: 0.85, sprite: 'pez', colors: { a: [70, 90, 130], b: [200, 210, 220] } },
  { id: 'pez_vela', name: 'Pez vela', kind: 'pez', habitat: 'alta_mar', hours: [4, 21], sell: 4500, weight: 2, size: [150, 330], fight: 0.85, sprite: 'pez', colors: { a: [40, 80, 160], b: [180, 200, 230] } },
  { id: 'tiburon_martillo', name: 'Tiburón martillo', kind: 'pez', habitat: 'alta_mar', hours: [16, 9], months: [6, 9], sell: 8000, weight: 1, size: [200, 450], fight: 0.95, sprite: 'pez', colors: { a: [120, 130, 140], b: [210, 214, 220] } },
  { id: 'marlin_azul', name: 'Marlín azul', kind: 'pez', habitat: 'alta_mar', hours: ALL_DAY, sell: 10000, weight: 1, size: [250, 450], fight: 1, sprite: 'pez', colors: { a: [30, 60, 150], b: [170, 200, 240] } },
  { id: 'calamar_gigante', name: 'Calamar gigante', kind: 'pez', habitat: 'alta_mar', hours: [21, 4], sell: 12000, weight: 1, size: [500, 1200], fight: 1, sprite: 'pulpo', colors: { a: [190, 70, 70], b: [240, 160, 150] } },
  { id: 'pez_linterna', name: 'Pez linterna', kind: 'pez', habitat: 'alta_mar', hours: [19, 4], sell: 1500, weight: 3, size: [5, 15], fight: 0.15, sprite: 'pez', colors: { a: [40, 50, 80], b: [140, 240, 255] } },
  // Río
  { id: 'pez_dorado', name: 'Pez dorado', kind: 'pez', habitat: 'río', hours: [9, 16], sell: 1300, weight: 3, size: [5, 20], fight: 0.1, sprite: 'pez', colors: { a: [250, 150, 40], b: [255, 210, 120] } },
  { id: 'anguila', name: 'Anguila', kind: 'pez', habitat: 'río', hours: [16, 9], sell: 600, weight: 4, size: [40, 120], fight: 0.5, sprite: 'pez', colors: { a: [70, 80, 50], b: [150, 150, 100] } },
  { id: 'perca', name: 'Perca', kind: 'pez', habitat: 'río', hours: ALL_DAY, sell: 250, weight: 8, size: [15, 45], fight: 0.25, sprite: 'pez', colors: { a: [110, 140, 60], b: [230, 200, 120] } },
  { id: 'lucio', name: 'Lucio', kind: 'pez', habitat: 'río', hours: [4, 21], sell: 700, weight: 4, size: [40, 130], fight: 0.6, sprite: 'pez', colors: { a: [90, 120, 80], b: [200, 210, 160] } },
  { id: 'esturion', name: 'Esturión', kind: 'pez', habitat: 'río', hours: ALL_DAY, months: [9, 3], sell: 6000, weight: 1, size: [100, 300], fight: 0.9, sprite: 'pez', colors: { a: [90, 90, 100], b: [190, 190, 200] } },
  // Solo en ciertos biomas (islas con clima).
  { id: 'pirana', name: 'Piraña', kind: 'pez', habitat: 'río', biomes: ['selva'], hours: [9, 16], sell: 900, weight: 6, size: [15, 35], fight: 0.45, sprite: 'pez', colors: { a: [120, 130, 140], b: [220, 70, 60] } },
  { id: 'arapaima', name: 'Arapaima', kind: 'pez', habitat: 'río', biomes: ['selva'], hours: [16, 9], sell: 9000, weight: 1, size: [150, 300], fight: 0.95, sprite: 'pez', colors: { a: [70, 80, 60], b: [200, 80, 60] } },
  { id: 'pez_hielo', name: 'Pez de hielo', kind: 'pez', habitat: 'mar', biomes: COLD, hours: ALL_DAY, sell: 600, weight: 6, size: [20, 50], fight: 0.3, sprite: 'pez', colors: { a: [200, 220, 240], b: [240, 248, 255] } },
  { id: 'trucha_artica', name: 'Trucha ártica', kind: 'pez', habitat: 'río', biomes: COLD, hours: ALL_DAY, sell: 900, weight: 5, size: [30, 70], fight: 0.45, sprite: 'pez', colors: { a: [90, 110, 140], b: [240, 150, 130] } },
  { id: 'pez_del_fango', name: 'Pez del fango', kind: 'pez', habitat: 'río', biomes: ['pantano'], hours: ALL_DAY, sell: 400, weight: 7, size: [10, 25], fight: 0.2, sprite: 'pez', colors: { a: [110, 100, 70], b: [170, 160, 120] } },
  { id: 'koi', name: 'Carpa koi', kind: 'pez', habitat: 'río', biomes: ['cerezos'], hours: [4, 21], sell: 2000, weight: 3, size: [30, 80], fight: 0.35, sprite: 'pez', colors: { a: [250, 250, 250], b: [230, 90, 50] } },
  { id: 'pez_luminoso', name: 'Pez luminoso', kind: 'pez', habitat: 'río', biomes: ['luminoso'], hours: [18, 6], sell: 1800, weight: 4, size: [10, 30], fight: 0.25, sprite: 'pez', colors: { a: [60, 120, 220], b: [150, 250, 255] } },
  { id: 'pez_brasa', name: 'Pez brasa', kind: 'pez', habitat: 'mar', biomes: ['volcanico'], hours: ALL_DAY, sell: 2200, weight: 3, size: [20, 60], fight: 0.55, sprite: 'pez', colors: { a: [60, 40, 40], b: [250, 120, 40] } },
  { id: 'pez_seta', name: 'Pez seta', kind: 'pez', habitat: 'río', biomes: ['setas'], hours: ALL_DAY, sell: 800, weight: 5, size: [10, 30], fight: 0.2, sprite: 'pez', colors: { a: [190, 60, 60], b: [250, 240, 230] } },
  { id: 'cachorrito', name: 'Cachorrito del desierto', kind: 'pez', habitat: 'río', biomes: ['desierto', 'cañon', 'sabana'], hours: [9, 16], sell: 1500, weight: 3, size: [3, 8], fight: 0.1, sprite: 'pez', colors: { a: [80, 120, 200], b: [230, 210, 120] } },
);

/** Tamaño de cada pez, si no tiene uno propio: según lo que pesa en el mar (los raros, más grandes). */
export function sizeRange(c: Creature): [number, number] {
  if (c.size) return c.size;
  return c.weight >= 8 ? [10, 30] : c.weight >= 4 ? [25, 60] : c.weight >= 2 ? [40, 100] : [80, 250];
}

/** Lo que pelea un pez al recogerlo (de 0 a 1). */
export function fightOf(c: Creature): number {
  return c.fight ?? Math.min(1, 0.15 + (1 / Math.max(1, c.weight)) * 0.7);
}

/** Tamaño al azar de un pez recién pescado, en centímetros (los muy grandes son raros). */
export function rollSize(c: Creature, random = Math.random): number {
  const [lo, hi] = sizeRange(c);
  return Math.round(lo + (hi - lo) * random() ** 1.8);
}

/** Las tres piezas que forman el esqueleto de dinosaurio del museo. */
export const DINO_PIECES = ['craneo_dino', 'costillas_dino', 'cola_dino'];

export const CREATURE_IDS = new Set(CREATURES.map((c) => c.id));

export function creature(id: string): Creature | undefined {
  return CREATURES.find((c) => c.id === id);
}

/** Mes actual del juego (1 a 12). Lo pone main.ts, que sabe si la fecha está cambiada para probar. */
export const calendar = { month: new Date().getMonth() + 1 };

function inRange(v: number, [from, to]: [number, number], inclusive: boolean): boolean {
  if (from > to) return v >= from || (inclusive ? v <= to : v < to);
  return v >= from && (inclusive ? v <= to : v < to);
}

export function isActive(c: Creature, hour: number, month = calendar.month): boolean {
  return inRange(hour, c.hours, false) && (!c.months || inRange(month, c.months, true));
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function monthsText(c: Creature): string {
  if (!c.months) return 'todo el año';
  return `de ${MONTHS[c.months[0] - 1]} a ${MONTHS[c.months[1] - 1]}`;
}

export function hoursText(c: Creature): string {
  const [from, to] = c.hours;
  if (from === 0 && to === 24) return 'todo el día';
  return `de ${from}:00 a ${to}:00`;
}

export const HABITAT_TEXT: Record<Habitat, string> = {
  mar: 'en el mar',
  alta_mar: 'en alta mar, desde el barco',
  'río': 'en el río',
  flores: 'cerca de las flores',
  'árboles': 'en los troncos de los árboles',
  suelo: 'en la hierba',
  agua: 'junto al agua',
  tierra: 'cavando',
};

/** Elige al azar, según su frecuencia, una criatura de los hábitats dados que esté activa a esa hora. */
export function pickCreature(
  habitats: Habitat[], hour: number, random = Math.random, biome: Biome | null = null, lure = false, skip?: (c: Creature) => boolean,
): Creature | null {
  // Los de bioma solo salen en su bioma; con señuelo (v4.23) los raros salen más.
  const options = CREATURES.filter((c) => habitats.includes(c.habitat) && isActive(c, hour) && (!c.biomes || (biome !== null && c.biomes.includes(biome))) && !skip?.(c));
  const weight = (c: Creature) => (lure && c.weight <= 3 ? c.weight * 3 : c.weight);
  const total = options.reduce((n, c) => n + weight(c), 0);
  let r = random() * total;
  for (const c of options) {
    r -= weight(c);
    if (r <= 0) return c;
  }
  return options[options.length - 1] ?? null;
}

// Dibujos de 16x16 ('.' es transparente; 'e' es el ojo).
export const CREATURE_SPRITES: Record<Creature['sprite'], string[]> = {
  pez: [
    '................',
    '................',
    '................',
    '.......aa.......',
    '.....aaaaaa.....',
    '...aaaaaaaaa..a.',
    '..aeaaaaaaaaaaa.',
    '.aaaaaaaaaaaaa..',
    '..abbbbbbbbbaaa.',
    '...bbbbbbbbb..a.',
    '.....bbbbbb.....',
    '.......bb.......',
    '................',
    '................',
    '................',
    '................',
  ],
  pulpo: [
    '................',
    '.....aaaaaa.....',
    '....aaaaaaaa....',
    '...aaaaaaaaaa...',
    '...aaaaaaaaaa...',
    '...aeeaaaaeea...',
    '...aaaaaaaaaa...',
    '....aaaaaaaa....',
    '...a.a.aa.a.a...',
    '..a..a.aa.a..a..',
    '..b..a.a..a..b..',
    '.b..b..a...b..b.',
    '.b..b..b...b..b.',
    '....b..b...b....',
    '................',
    '................',
  ],
  mariposa: [
    '................',
    '................',
    '...aaa....aaa...',
    '..aaaaa..aaaaa..',
    '..aaaaabbaaaaa..',
    '..aaaaabbaaaaa..',
    '...aaaabbaaaa...',
    '.....aabbaa.....',
    '....aaabbaaa....',
    '...aaaabbaaaa...',
    '...aaa.bb.aaa...',
    '....a..bb..a....',
    '.......bb.......',
    '................',
    '................',
    '................',
  ],
  escarabajo: [
    '................',
    '................',
    '.......bb.......',
    '......bbbb......',
    '...b..bbbb..b...',
    '....baaaaaab....',
    '....aaaaaaaa....',
    '..b.aaaabaaa.b..',
    '...baaaabaaab...',
    '....aaaabaaaa...',
    '..b.aaaabaaa.b..',
    '...baaaabaaab...',
    '.....aaaaaa.....',
    '................',
    '................',
    '................',
  ],
  luciernaga: [
    '................',
    '................',
    '................',
    '......b..b......',
    '.......bb.......',
    '......bbbb......',
    '.....cbbbbc.....',
    '....cc.bb.cc....',
    '.....cbbbbc.....',
    '......aaaa......',
    '.....aaaaaa.....',
    '.....aaaaaa.....',
    '......aaaa......',
    '................',
    '................',
    '................',
  ],
  libelula: [
    '................',
    '.......aa.......',
    '.......aa.......',
    '.bbbbb.aa.bbbbb.',
    'bbbbbbbaabbbbbbb',
    '.bbbbb.aa.bbbbb.',
    '.bbbbb.aa.bbbbb.',
    'bbbbbbbaabbbbbbb',
    '.bbbb..aa..bbbb.',
    '.......aa.......',
    '.......aa.......',
    '.......aa.......',
    '.......aa.......',
    '.......aa.......',
    '................',
    '................',
  ],
  amonites: [
    '................',
    '................',
    '.....aaaaaa.....',
    '....abbbbbba....',
    '...abaaaaaaba...',
    '..abaabbbbaaba..',
    '..abababbabaab..',
    '..ababaabababa..',
    '..ababbbbababa..',
    '..abaaaaaabaab..',
    '...abbbbbbaab...',
    '....aaaaaaab....',
    '......bbbbb.....',
    '................',
    '................',
    '................',
  ],
  trilobites: [
    '................',
    '.......aa.......',
    '.....aaaaaa.....',
    '....aeaaaaea....',
    '...aaaaaaaaaa...',
    '...bbbbbbbbbb...',
    '...aaaaaaaaaa...',
    '...bbbbbbbbbb...',
    '....aaaaaaaa....',
    '....bbbbbbbb....',
    '.....aaaaaa.....',
    '.....bbbbbb.....',
    '......aaaa......',
    '.......aa.......',
    '................',
    '................',
  ],
  diente: [
    '................',
    '................',
    '...bbbbbbbbbb...',
    '...baaaaaaaab...',
    '...baaaaaaaab...',
    '....baaaaaab....',
    '....baaaaaab....',
    '.....baaaab.....',
    '.....baaaab.....',
    '......baab......',
    '......baab......',
    '.......bb.......',
    '................',
    '................',
    '................',
    '................',
  ],
  hueso: [
    '................',
    '................',
    '.aa..........aa.',
    'aaab........baaa',
    'aaaabbbbbbbbaaaa',
    '.baaaaaaaaaaaab.',
    '..baaaaaaaaaab..',
    '.baaaaaaaaaaaab.',
    'aaaabbbbbbbbaaaa',
    'aaab........baaa',
    '.aa..........aa.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};
