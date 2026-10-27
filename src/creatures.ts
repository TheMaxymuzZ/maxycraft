// Peces, insectos y fósiles de la isla: dónde y cuándo salen, cuánto valen y cómo se dibujan.

/** Desde la v4.15 también fósiles: se encuentran cavando y se donan al museo como los peces y los insectos. */
export type CreatureKind = 'pez' | 'bicho' | 'fosil';
export type Habitat = 'mar' | 'río' | 'flores' | 'árboles' | 'suelo' | 'agua' | 'tierra';

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
  'río': 'en el río',
  flores: 'cerca de las flores',
  'árboles': 'en los troncos de los árboles',
  suelo: 'en la hierba',
  agua: 'junto al agua',
  tierra: 'cavando',
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
