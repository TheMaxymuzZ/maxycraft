// Peces e insectos de la isla: dónde y cuándo salen, cuánto valen y cómo se dibujan.

export type CreatureKind = 'pez' | 'bicho';
export type Habitat = 'mar' | 'río' | 'flores' | 'árboles' | 'suelo' | 'agua';

type RGB = [number, number, number];

export interface Creature {
  id: string;
  name: string;
  kind: CreatureKind;
  habitat: Habitat;
  /** Horas en las que sale [desde, hasta). Si desde > hasta, cruza la medianoche. */
  hours: [number, number];
  sell: number;
  /** Cuanto más alto, más fácil de encontrar. */
  weight: number;
  sprite: 'pez' | 'pulpo' | 'mariposa' | 'escarabajo' | 'luciernaga' | 'libelula';
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
  // Peces de río
  { id: 'gobio', name: 'Gobio', kind: 'pez', habitat: 'río', hours: ALL_DAY, sell: 200, weight: 10, sprite: 'pez', colors: { a: [150, 130, 90], b: [220, 210, 180] } },
  { id: 'carpa', name: 'Carpa', kind: 'pez', habitat: 'río', hours: ALL_DAY, sell: 300, weight: 7, sprite: 'pez', colors: { a: [170, 140, 70], b: [230, 210, 150] } },
  { id: 'trucha', name: 'Trucha', kind: 'pez', habitat: 'río', hours: [4, 21], sell: 1000, weight: 3, sprite: 'pez', colors: { a: [120, 150, 110], b: [240, 170, 170] } },
  { id: 'siluro', name: 'Siluro', kind: 'pez', habitat: 'río', hours: [16, 9], sell: 800, weight: 3, sprite: 'pez', colors: { a: [70, 70, 60], b: [150, 140, 120] } },
  // Insectos
  { id: 'mariposa_blanca', name: 'Mariposa blanca', kind: 'bicho', habitat: 'flores', hours: [4, 19], sell: 160, weight: 10, sprite: 'mariposa', colors: { a: [246, 246, 238], b: [60, 50, 40] } },
  { id: 'mariposa_azul', name: 'Mariposa azul', kind: 'bicho', habitat: 'flores', hours: [8, 16], sell: 300, weight: 4, sprite: 'mariposa', colors: { a: [70, 130, 230], b: [40, 40, 50] } },
  { id: 'mariquita', name: 'Mariquita', kind: 'bicho', habitat: 'flores', hours: [8, 17], sell: 200, weight: 6, sprite: 'escarabajo', colors: { a: [220, 40, 40], b: [30, 30, 30] } },
  { id: 'escarabajo', name: 'Escarabajo rinoceronte', kind: 'bicho', habitat: 'árboles', hours: [17, 8], sell: 3000, weight: 1, sprite: 'escarabajo', colors: { a: [90, 50, 30], b: [50, 30, 20] } },
  { id: 'grillo', name: 'Grillo', kind: 'bicho', habitat: 'suelo', hours: [17, 8], sell: 130, weight: 8, sprite: 'escarabajo', colors: { a: [70, 60, 40], b: [40, 30, 20] } },
  { id: 'luciernaga', name: 'Luciérnaga', kind: 'bicho', habitat: 'agua', hours: [19, 4], sell: 300, weight: 6, sprite: 'luciernaga', colors: { a: [250, 250, 140], b: [50, 50, 40] } },
  { id: 'libelula', name: 'Libélula', kind: 'bicho', habitat: 'agua', hours: [8, 17], sell: 180, weight: 7, sprite: 'libelula', colors: { a: [200, 60, 60], b: [180, 220, 240] } },
];

export const CREATURE_IDS = new Set(CREATURES.map((c) => c.id));

export function creature(id: string): Creature | undefined {
  return CREATURES.find((c) => c.id === id);
}

export function isActive(c: Creature, hour: number): boolean {
  const [from, to] = c.hours;
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

export function hoursText(c: Creature): string {
  const [from, to] = c.hours;
  if (from === 0 && to === 24) return 'todo el día';
  return `de ${from}:00 a ${to}:00`;
}

export const HABITAT_TEXT: Record<Habitat, string> = {
  mar: 'en el mar',
  'río': 'en el río',
  flores: 'cerca de las flores',
  'árboles': 'en los troncos de los árboles',
  suelo: 'en la hierba',
  agua: 'junto al agua',
};

/** Elige al azar, según su frecuencia, una criatura de los hábitats dados que esté activa a esa hora. */
export function pickCreature(habitats: Habitat[], hour: number, random = Math.random): Creature | null {
  const options = CREATURES.filter((c) => habitats.includes(c.habitat) && isActive(c, hour));
  const total = options.reduce((n, c) => n + c.weight, 0);
  let r = random() * total;
  for (const c of options) {
    r -= c.weight;
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
};
