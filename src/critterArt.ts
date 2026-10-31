// Dibujos de los peces y los insectos (v5.4): cada especie con su propia forma, no un mismo dibujo pintado de otro color.
// Los peces se dibujan de perfil con unas medidas (largo, alto, aletas, cola, morro, dibujo de la piel…) y los insectos,
// el pulpo, los calamares y el caballito de mar, a mano píxel a píxel. De aquí salen el icono del inventario y la figura
// en 3D de cubitos que se ve en el mundo, en el museo y en la mano.

import { type Creature } from './creatures';

type RGB = [number, number, number];

/** Qué es cada píxel: para darle grosor en 3D y saber qué brilla y qué aletea. */
export const Part = {
  Empty: 0,
  /** Cuerpo: cuanto más adentro, más grueso. */
  Body: 1,
  /** Aletas, patas y antenas: finas. */
  Thin: 2,
  /** Brilla en la oscuridad (luciérnaga, pez linterna...). */
  Glow: 3,
  /** Alas que aletean (finas). */
  Wing: 4,
} as const;
export type Part = (typeof Part)[keyof typeof Part];

export interface CritterArt {
  /** 16x16 colores (null = transparente). */
  color: (RGB | null)[];
  part: Uint8Array;
  /** Grosor máximo del cuerpo en 3D (1 a 3: 3, 5 o 7 cubitos). */
  depth: number;
}

const N = 16;

function blank(depth = 3): CritterArt {
  return { color: new Array(N * N).fill(null), part: new Uint8Array(N * N), depth };
}

function set(art: CritterArt, x: number, y: number, c: RGB, part: Part = Part.Body) {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  art.color[y * N + x] = c;
  art.part[y * N + x] = part;
}

function get(art: CritterArt, x: number, y: number): Part {
  if (x < 0 || y < 0 || x >= N || y >= N) return Part.Empty;
  return art.part[y * N + x] as Part;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function shade(c: RGB, k: number): RGB {
  return [Math.min(255, Math.round(c[0] * k)), Math.min(255, Math.round(c[1] * k)), Math.min(255, Math.round(c[2] * k))];
}

const BLACK: RGB = [24, 22, 26];
const WHITE: RGB = [250, 250, 246];

// ---------------------------------------------------------------------------------------------------------------
// Dibujos a mano: cada letra es un color de la paleta, con lo que es ese píxel.

type Palette = Record<string, [RGB, Part?]>;

function fromRows(rows: string[], pal: Palette, depth = 3): CritterArt {
  const art = blank(depth);
  rows.forEach((row, y) => {
    for (let x = 0; x < N; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.') continue;
      const p = pal[ch];
      if (!p) throw new Error(`Falta el color '${ch}'`);
      set(art, x, y, p[0], p[1] ?? Part.Body);
    }
  });
  return art;
}

const T = Part.Thin;
const W = Part.Wing;
const G = Part.Glow;

const HAND: Record<string, () => CritterArt> = {
  mariposa_blanca: () => fromRows([
    '................',
    '.....a....a.....',
    '......a..a......',
    '.kkwww.hh.wwwkk.',
    'kkwwwwwbbwwwwwkk',
    'kwwwkwwbbwwkwwwk',
    '.wwwwwwbbwwwwww.',
    '..wwwwwbbwwwww..',
    '...sswwbbwwss...',
    '..swwwwbbwwwws..',
    '.swwwwwbbwwwwws.',
    '.swwwwwbbwwwwws.',
    '..swwkwbbwkwws..',
    '...sww.bb.wws...',
    '.......bb.......',
    '................',
  ], {
    a: [[50, 46, 44], T], h: [[40, 36, 34]], b: [[74, 68, 62]],
    w: [[246, 246, 236], W], s: [[226, 228, 206], W], k: [[46, 42, 40], W],
  }, 1),

  mariposa_azul: () => fromRows([
    '.....a....a.....',
    '......a..a......',
    'kk.....hh.....kk',
    'kuuk...bb...kuuk',
    'kluuk..bb..kuulk',
    'kluuuk.bb.kuuulk',
    'kdluuukbbkuuuldk',
    '.kdluuubbuuuldk.',
    '..kkkuubbuukkk..',
    '...kluubbuulk...',
    '...kluubbuulk...',
    '....kdubbudk....',
    '....kkkbbkkk....',
    '.....k.bb.k.....',
    '.....k....k.....',
    '................',
  ], {
    a: [[30, 30, 40], T], h: [[26, 26, 34]], b: [[44, 44, 58]],
    k: [[22, 24, 40], W], u: [[60, 120, 230], W], l: [[120, 190, 255], W], d: [[236, 244, 255], W],
  }, 1),

  mariquita: () => fromRows([
    '................',
    '................',
    '.......a.a......',
    '......kkkkk.....',
    '.....kwkkkwk....',
    '....rrrkkkrrr...',
    '...rhrrrkrrrsr..',
    '..lrhsrrkrrssrl.',
    '...rrrrrkrrssr..',
    '..lrssrrkrrrrrl.',
    '...rssrrkrsssr..',
    '..lrrrrrkrrsrrl.',
    '....rrrrkrrrr...',
    '.....rrrkrrr....',
    '................',
    '................',
  ], {
    a: [[30, 26, 26], T], k: [[30, 26, 26]], w: [[240, 240, 230]], r: [[220, 44, 40]], h: [[255, 140, 120]],
    s: [[34, 28, 28]], l: [[30, 26, 26], T],
  }),

  escarabajo: () => fromRows([
    '.......hh.......',
    '.......hh.......',
    '......hhhh......',
    '......hqqh......',
    '..l..pppppp..l..',
    '...lpqpppppl....',
    '....pppppppp....',
    '..leqeecceqeel..',
    '...eqeecceqee...',
    '..leqeecceqeel..',
    '...eqeecceqee...',
    '..leeeecceeeel..',
    '...eeeecceeee...',
    '....eeecceee....',
    '.....eeccee.....',
    '................',
  ], {
    h: [[58, 38, 26]], q: [[176, 122, 82]], p: [[86, 52, 30]], e: [[112, 66, 36]], c: [[48, 30, 20]], l: [[42, 28, 20], T],
  }),

  cigarra: () => fromRows([
    '................',
    '................',
    '.....egggge.....',
    '....egGGGGge....',
    '....gGggggGg....',
    '...wwggggggww...',
    '..wvwwggggwwvw..',
    '..wvwwwggwwwvw..',
    '..wvwwwggwwwvw..',
    '..wwvwwggwwvww..',
    '..wwvwwggwwvww..',
    '...wwvwggwvww...',
    '...wwvwwwwvww...',
    '....wwvwwvww....',
    '.....wwwwww.....',
    '................',
  ], {
    e: [[150, 40, 40]], g: [[104, 138, 82]], G: [[60, 82, 50]],
    w: [[206, 228, 214], W], v: [[64, 96, 66], W],
  }),

  pulga_nieves: () => fromRows([
    '................',
    '................',
    '................',
    '................',
    '.....a....a.....',
    '......a..a......',
    '......hhhh......',
    '......bbbb......',
    '....lbqbbbbl....',
    '.....bqbbbb.....',
    '....lbbbbbbl....',
    '......bqbb......',
    '......bbbb......',
    '.......bb.......',
    '......f..f......',
    '................',
  ], {
    a: [[50, 56, 84], T], h: [[40, 44, 70]], b: [[62, 74, 118]], q: [[140, 160, 214]], l: [[50, 56, 84], T], f: [[90, 100, 140], T],
  }),

  grillo: () => fromRows([
    '..a..........a..',
    '...a........a...',
    '....a......a....',
    '.....a....a.....',
    '......hhhh......',
    '......hqqh......',
    '.....pppppp.....',
    '....lppppppl....',
    '.....bwwwwb.....',
    '...LLbwwwwbLL...',
    '..LL.bwwwwb.LL..',
    '..L..bwwwwb..L..',
    '..L...bwwb...L..',
    '...L..bwwb..L...',
    '....L..cc..L....',
    '................',
  ], {
    a: [[60, 46, 30], T], h: [[46, 36, 24]], q: [[110, 90, 60]], p: [[78, 60, 36]], l: [[60, 46, 30], T],
    b: [[70, 54, 32]], w: [[118, 94, 58]], L: [[86, 66, 40], T], c: [[60, 46, 30], T],
  }),

  luciernaga: () => fromRows([
    '................',
    '.....a....a.....',
    '......a..a......',
    '......kkkk......',
    '.....ookkoo.....',
    '....oookkooo....',
    '..ww.kkkkkk.ww..',
    '.wwwwkqkkqkwwww.',
    '.wwwwkqkkqkwwww.',
    '..wwwkkkkkkwww..',
    '...ww.kkkk.ww...',
    '......GGGG......',
    '......gGGg......',
    '.......gg.......',
    '................',
    '................',
  ], {
    a: [[40, 36, 30], T], k: [[42, 38, 34]], o: [[236, 130, 60]], q: [[96, 90, 80]],
    w: [[214, 222, 232], W], G: [[255, 250, 150], G], g: [[214, 236, 90], G],
  }),

  libelula: () => fromRows([
    '................',
    '......eeee......',
    '......eqte......',
    'wwwwwwwttwwwwwww',
    'wvwwwwwttwwwwwvw',
    '.wwwwwwttwwwwww.',
    'wwwwwwwttwwwwwww',
    'wvwwwwwttwwwwwvw',
    '.wwwwwwttwwwwww.',
    '.......rr.......',
    '.......rr.......',
    '.......kr.......',
    '.......rr.......',
    '.......rk.......',
    '.......rr.......',
    '.......kk.......',
  ], {
    e: [[120, 40, 36]], q: [[230, 120, 110]], t: [[180, 50, 44]], r: [[220, 66, 52]], k: [[120, 30, 30]],
    w: [[206, 234, 248], W], v: [[60, 50, 52], W],
  }),

  pulpo: () => fromRows([
    '................',
    '.....aaaaaa.....',
    '....aqqaaaaa....',
    '...aqaaaaaaaa...',
    '...aqaaaaaaaa...',
    '...aaaaaaaaaa...',
    '...aWkaaaaWka...',
    '....aaaaaaaa....',
    '...aaaaaaaaaa...',
    '..aaa.aaaa.aaa..',
    '.aa.a.a..a.a.aa.',
    '.a..s.a..a.s..a.',
    '.bb.b..bb..b.bb.',
    '....bb....bb....',
    '................',
    '................',
  ], {
    a: [[210, 90, 110]], q: [[244, 160, 172]], W: [[250, 246, 230]], k: [[30, 24, 28]], s: [[244, 170, 178]], b: [[186, 70, 92], T],
  }, 2),

  calamar: () => fromRows([
    '.......aa.......',
    '......aaaa......',
    '.....faqaaf.....',
    '....ffaqaaff....',
    '...fffaqaafff...',
    '....ffaqaaff....',
    '......aqaa......',
    '......aaaa......',
    '......aaaa......',
    '.....akaaka.....',
    '......aaaa......',
    '.....b.bb.b.....',
    '....b.b..b.b....',
    '....b.b..b.b....',
    '...b..b..b..b...',
    '...c...cc...c...',
  ], {
    a: [[236, 200, 196]], q: [[252, 236, 232]], f: [[226, 180, 178], T], k: [[30, 26, 30]],
    b: [[222, 176, 172], T], c: [[206, 150, 148], T],
  }, 2),

  calamar_gigante: () => fromRows([
    '................',
    '..........ff....',
    '.........ffff...',
    '.....aaaaaaaaff.',
    '....aaqqqqqaaaff',
    '...kWaaaaaaaaaaa',
    '...aaaaaaaaaaaff',
    '....aaaaaaaaaff.',
    'b.bbaaaaaaaff...',
    '.b..b.b..f......',
    'cc.b..b.........',
    'c..b...b........',
    '..b....b........',
    '.cc.....b.......',
    '.c.......bb.....',
    '................',
  ], {
    a: [[190, 66, 66]], q: [[236, 130, 120]], f: [[166, 54, 56], T], k: [[24, 20, 24]], W: [[250, 230, 150]],
    b: [[176, 60, 62], T], c: [[140, 40, 44], T],
  }, 2),

  caballito_mar: () => fromRows([
    '......k.k.......',
    '.....aaaa.......',
    '..aaaaaWka......',
    '.....aaaa.......',
    '......aaaf......',
    '.....baaaff.....',
    '.....bbaaaf.....',
    '.....bbbaaff....',
    '.....bbbaa......',
    '......bbaa......',
    '.......baa......',
    '........aa......',
    '.....a...a......',
    '.....a..aa......',
    '......aaa.......',
    '................',
  ], {
    k: [[200, 120, 40], T], a: [[240, 170, 60]], b: [[252, 222, 142]], W: [[250, 250, 240]], f: [[250, 210, 120], T],
  }, 2),
};

// ---------------------------------------------------------------------------------------------------------------
// Peces de perfil, con la cabeza a la izquierda.

type Tail = 'horquilla' | 'redonda' | 'luna' | 'recta' | 'abanico' | 'punta' | 'tiburon' | 'ninguna';
type Fin = 'tri' | 'baja' | 'vela' | 'espinas' | 'alta';
type Pattern =
  | 'liso' | 'payaso' | 'barras' | 'manchas' | 'linea' | 'ondas' | 'koi' | 'puntos_luz' | 'grietas' | 'linea_luz'
  | 'setas' | 'placas' | 'cola_roja' | 'motas' | 'banda_cara' | 'vientre_rojo' | 'brillo';
type Extra =
  | 'espada' | 'pico' | 'martillo' | 'linterna' | 'bigotes' | 'pinchos' | 'dientes' | 'bocaza' | 'gancho' | 'hocico'
  | 'ojos_arriba' | 'pinulas' | 'patas' | 'labios' | 'escarcha';

interface FishSpec {
  /** Morro y final del cuerpo (donde empieza la cola), en píxeles. */
  x0: number;
  x1: number;
  /** Línea del centro del cuerpo. */
  cy: number;
  /** Media altura del cuerpo en lo más alto. */
  h: number;
  /** Dónde es más alto (0 morro, 1 cola). */
  peak?: number;
  /** Forma del morro: <1 chato, >1 afilado. */
  nose?: number;
  /** Cómo se estrecha hacia la cola. */
  rear?: number;
  /** Media altura justo antes de la cola. */
  stem?: number;
  /** Cuánto del alto va arriba (lomo) y abajo (vientre). */
  up?: number;
  down?: number;
  tail: Tail;
  tailL?: number;
  tailS?: number;
  dorsal?: [number, number, number, Fin];
  anal?: [number, number, number];
  eye?: 'peque' | 'grande' | 'arriba';
  eyeT?: number;
  a: RGB;
  b: RGB;
  fin?: RGB;
  p?: RGB;
  glow?: RGB;
  pattern?: Pattern;
  extras?: Extra[];
  depth?: number;
}

const FISH: Record<string, FishSpec> = {
  // Mar
  sardina: { x0: 2, x1: 12, cy: 8, h: 2.2, peak: 0.35, nose: 1.2, tail: 'horquilla', tailL: 3, tailS: 2.5, dorsal: [0.4, 0.55, 1.5, 'tri'], a: [70, 110, 160], b: [226, 234, 242], p: [40, 60, 90], pattern: 'motas' },
  boqueron: { x0: 2, x1: 13, cy: 8, h: 1.7, peak: 0.4, nose: 1.4, tail: 'horquilla', tailL: 2.5, tailS: 2.2, dorsal: [0.45, 0.55, 1.2, 'tri'], a: [110, 150, 190], b: [236, 240, 246], p: [196, 220, 236], pattern: 'linea' },
  caballa: { x0: 1, x1: 12, cy: 8, h: 2.4, peak: 0.4, nose: 1.3, tail: 'horquilla', tailL: 3.5, tailS: 3, dorsal: [0.25, 0.4, 1.6, 'tri'], a: [50, 110, 130], b: [210, 226, 222], p: [24, 50, 64], pattern: 'ondas', extras: ['pinulas'] },
  lubina: { x0: 1, x1: 12, cy: 8, h: 3, peak: 0.4, nose: 1, tail: 'recta', tailL: 3, tailS: 3, dorsal: [0.25, 0.75, 2, 'espinas'], anal: [0.6, 0.8, 1.5], a: [100, 112, 124], b: [204, 210, 214], p: [60, 66, 74], pattern: 'linea' },
  pez_payaso: { x0: 3, x1: 11, cy: 8, h: 3.3, peak: 0.45, nose: 0.6, tail: 'redonda', tailL: 3, tailS: 3, dorsal: [0.2, 0.85, 1.6, 'baja'], anal: [0.55, 0.85, 1.5], a: [244, 120, 36], b: [250, 150, 60], fin: [236, 110, 30], p: [252, 252, 252], pattern: 'payaso', eye: 'grande' },
  atun: { x0: 1, x1: 12, cy: 8, h: 3.4, peak: 0.38, nose: 1, rear: 1.4, stem: 0.6, tail: 'luna', tailL: 3, tailS: 5, dorsal: [0.3, 0.42, 2.5, 'alta'], anal: [0.55, 0.65, 2], a: [30, 46, 96], b: [196, 204, 220], fin: [240, 210, 60], p: [120, 140, 190], pattern: 'brillo', extras: ['pinulas'], depth: 3 },
  pez_luna: { x0: 3, x1: 12, cy: 8, h: 4.6, peak: 0.42, nose: 0.5, rear: 0.4, stem: 3.6, tail: 'recta', tailL: 1.5, tailS: 3.6, dorsal: [0.68, 0.9, 4, 'tri'], anal: [0.68, 0.9, 4], a: [130, 142, 156], b: [214, 220, 226], fin: [110, 120, 134], p: [180, 188, 200], pattern: 'motas', eye: 'peque', eyeT: 0.15, depth: 2 },
  dorada: { x0: 2, x1: 12, cy: 8, h: 3.6, peak: 0.42, nose: 0.75, tail: 'horquilla', tailL: 3, tailS: 3.2, dorsal: [0.25, 0.8, 1.5, 'espinas'], anal: [0.6, 0.82, 1.3], a: [150, 154, 150], b: [232, 228, 214], p: [246, 204, 70], pattern: 'banda_cara' },
  pez_globo: { x0: 3, x1: 12, cy: 8, h: 4.2, peak: 0.45, nose: 0.4, rear: 0.7, stem: 1.6, tail: 'redonda', tailL: 2.5, tailS: 2, a: [200, 176, 104], b: [250, 242, 206], fin: [220, 196, 120], p: [120, 96, 50], pattern: 'manchas', extras: ['pinchos', 'labios'], eye: 'grande', depth: 3 },
  rape: { x0: 1, x1: 11, cy: 9, h: 3.8, peak: 0.25, nose: 0.4, rear: 1.4, stem: 0.8, up: 0.8, down: 1, tail: 'redonda', tailL: 3.5, tailS: 2.6, dorsal: [0.6, 0.8, 1.2, 'baja'], a: [100, 80, 62], b: [158, 136, 108], p: [70, 54, 42], glow: [250, 240, 140], pattern: 'motas', extras: ['bocaza', 'linterna'], eye: 'peque', eyeT: 0.3, depth: 3 },
  // Alta mar
  lampuga: { x0: 1, x1: 12, cy: 8, h: 3.2, peak: 0.12, nose: 0.25, rear: 0.9, stem: 0.6, up: 1.1, down: 0.9, tail: 'horquilla', tailL: 3.5, tailS: 4, dorsal: [0.05, 0.95, 1.5, 'baja'], anal: [0.5, 0.95, 1.2], a: [40, 160, 110], b: [240, 220, 70], fin: [40, 120, 160], p: [60, 120, 200], pattern: 'motas' },
  pez_espada: { x0: 5, x1: 13, cy: 8, h: 3, peak: 0.3, nose: 0.9, stem: 0.6, tail: 'luna', tailL: 2.5, tailS: 4, dorsal: [0.12, 0.28, 3, 'alta'], a: [70, 84, 120], b: [196, 204, 216], fin: [60, 70, 100], pattern: 'brillo', p: [140, 150, 180], extras: ['espada'] },
  pez_vela: { x0: 4, x1: 13, cy: 10, h: 2.4, peak: 0.35, nose: 1.2, stem: 0.6, tail: 'luna', tailL: 2.5, tailS: 3.5, dorsal: [0.05, 0.85, 6, 'vela'], a: [36, 72, 150], b: [184, 200, 228], fin: [50, 90, 190], p: [120, 160, 230], pattern: 'barras', extras: ['pico'] },
  tiburon_martillo: { x0: 2, x1: 12, cy: 8, h: 3.1, peak: 0.35, nose: 0.9, rear: 1.2, stem: 0.8, tail: 'tiburon', tailL: 4, tailS: 4, dorsal: [0.3, 0.45, 3.5, 'alta'], anal: [0.7, 0.8, 1.2], a: [116, 126, 138], b: [222, 226, 230], fin: [100, 110, 122], extras: ['martillo'], eye: 'peque', depth: 3 },
  marlin_azul: { x0: 4, x1: 13, cy: 8, h: 2.6, peak: 0.3, nose: 1, stem: 0.6, tail: 'luna', tailL: 2.5, tailS: 4.2, dorsal: [0.05, 0.5, 3.5, 'alta'], anal: [0.6, 0.75, 1.5], a: [26, 56, 150], b: [176, 206, 244], fin: [20, 40, 110], p: [110, 170, 240], pattern: 'barras', extras: ['pico'] },
  pez_linterna: { x0: 3, x1: 11, cy: 8, h: 2.6, peak: 0.25, nose: 0.6, tail: 'horquilla', tailL: 3, tailS: 2.6, dorsal: [0.4, 0.55, 1.5, 'tri'], a: [36, 44, 72], b: [70, 80, 110], glow: [140, 240, 255], pattern: 'puntos_luz', eye: 'grande' },
  // Río
  gobio: { x0: 2, x1: 12, cy: 9, h: 2, peak: 0.3, nose: 0.6, up: 1, down: 0.8, tail: 'horquilla', tailL: 2.5, tailS: 2.2, dorsal: [0.35, 0.5, 1.6, 'tri'], a: [140, 120, 80], b: [222, 210, 178], p: [80, 66, 44], pattern: 'manchas', extras: ['bigotes'] },
  carpa: { x0: 1, x1: 12, cy: 8, h: 3.4, peak: 0.4, nose: 0.7, tail: 'horquilla', tailL: 3, tailS: 3.4, dorsal: [0.35, 0.85, 1.6, 'baja'], anal: [0.7, 0.85, 1.4], a: [160, 128, 60], b: [230, 206, 140], p: [110, 86, 40], pattern: 'brillo', extras: ['bigotes', 'labios'] },
  trucha: { x0: 1, x1: 12, cy: 8, h: 2.6, peak: 0.4, nose: 1, tail: 'recta', tailL: 3, tailS: 2.8, dorsal: [0.35, 0.5, 1.6, 'tri'], anal: [0.7, 0.82, 1.2], a: [110, 140, 100], b: [238, 226, 210], p: [40, 50, 36], pattern: 'manchas', extras: [] },
  salmon: { x0: 1, x1: 12, cy: 8, h: 3, peak: 0.4, nose: 1.1, tail: 'recta', tailL: 3, tailS: 3, dorsal: [0.35, 0.5, 2, 'tri'], anal: [0.7, 0.82, 1.4], a: [190, 76, 66], b: [236, 170, 150], fin: [120, 70, 60], p: [70, 110, 80], pattern: 'cola_roja', extras: ['gancho'] },
  siluro: { x0: 1, x1: 13, cy: 9, h: 2.4, peak: 0.15, nose: 0.4, rear: 0.9, up: 0.9, down: 1, stem: 0.8, tail: 'redonda', tailL: 2.5, tailS: 2, dorsal: [0.3, 0.4, 1.2, 'tri'], anal: [0.45, 0.98, 1.2], a: [64, 64, 56], b: [150, 140, 118], p: [40, 40, 34], pattern: 'motas', extras: ['bigotes', 'bocaza'], eye: 'peque', eyeT: 0.12 },
  pez_dorado: { x0: 3, x1: 10, cy: 7, h: 3, peak: 0.45, nose: 0.6, tail: 'abanico', tailL: 5, tailS: 4.5, dorsal: [0.3, 0.75, 2, 'baja'], a: [248, 140, 36], b: [255, 196, 100], fin: [255, 170, 90], pattern: 'brillo', p: [255, 230, 160], eye: 'grande' },
  anguila: { x0: 1, x1: 14, cy: 8, h: 1.4, peak: 0.2, nose: 0.6, rear: 0.4, stem: 0.8, tail: 'punta', tailL: 1.5, tailS: 1, dorsal: [0.35, 1, 1, 'baja'], anal: [0.5, 1, 1], a: [70, 80, 48], b: [168, 160, 100], depth: 2 },
  perca: { x0: 2, x1: 12, cy: 8, h: 3.1, peak: 0.4, nose: 0.9, tail: 'horquilla', tailL: 3, tailS: 3, dorsal: [0.2, 0.75, 2.4, 'espinas'], anal: [0.65, 0.8, 1.6], a: [110, 140, 56], b: [234, 214, 130], fin: [230, 110, 50], p: [44, 60, 30], pattern: 'barras' },
  lucio: { x0: 0, x1: 13, cy: 8, h: 2, peak: 0.55, nose: 1.8, tail: 'horquilla', tailL: 2.5, tailS: 2.6, dorsal: [0.72, 0.88, 1.8, 'tri'], anal: [0.74, 0.88, 1.4], a: [80, 112, 70], b: [214, 216, 164], p: [176, 196, 120], pattern: 'manchas', extras: ['hocico'], eyeT: 0.22 },
  esturion: { x0: 0, x1: 12, cy: 8, h: 2.3, peak: 0.35, nose: 1.6, stem: 0.6, tail: 'tiburon', tailL: 3.5, tailS: 3, dorsal: [0.7, 0.8, 1.5, 'tri'], a: [86, 88, 100], b: [190, 190, 200], p: [226, 226, 232], pattern: 'placas', extras: ['bigotes', 'hocico'], eyeT: 0.25 },
  pirana: { x0: 2, x1: 11, cy: 8, h: 3.6, peak: 0.4, nose: 0.55, up: 0.95, down: 1.05, tail: 'horquilla', tailL: 3, tailS: 3, dorsal: [0.45, 0.6, 1.6, 'tri'], anal: [0.55, 0.85, 1.4], a: [116, 126, 138], b: [220, 70, 56], fin: [60, 64, 70], p: [170, 180, 190], pattern: 'vientre_rojo', extras: ['dientes'], eye: 'grande' },
  arapaima: { x0: 1, x1: 12, cy: 8, h: 2.5, peak: 0.35, nose: 0.9, rear: 0.5, stem: 1.4, tail: 'redonda', tailL: 3, tailS: 2.6, dorsal: [0.75, 0.98, 1.4, 'baja'], anal: [0.75, 0.98, 1.4], a: [70, 80, 60], b: [200, 196, 170], fin: [180, 60, 50], p: [210, 80, 56], pattern: 'cola_roja', extras: ['labios'] },
  pez_hielo: { x0: 2, x1: 12, cy: 8, h: 2.4, peak: 0.35, nose: 1.3, tail: 'recta', tailL: 3, tailS: 2.8, dorsal: [0.15, 0.85, 2.6, 'baja'], anal: [0.45, 0.88, 2], a: [190, 214, 236], b: [240, 248, 255], fin: [214, 236, 252], p: [255, 255, 255], pattern: 'brillo', extras: ['escarcha'], eye: 'grande' },
  trucha_artica: { x0: 1, x1: 12, cy: 8, h: 2.7, peak: 0.4, nose: 1, tail: 'horquilla', tailL: 3, tailS: 2.8, dorsal: [0.35, 0.5, 1.6, 'tri'], anal: [0.68, 0.8, 1.3], a: [80, 100, 136], b: [240, 130, 110], fin: [230, 120, 100], p: [236, 236, 244], pattern: 'manchas' },
  pez_del_fango: { x0: 2, x1: 12, cy: 10, h: 2, peak: 0.25, nose: 0.4, rear: 0.9, stem: 0.6, up: 1, down: 0.8, tail: 'redonda', tailL: 2.5, tailS: 1.8, dorsal: [0.4, 0.65, 2.4, 'vela'], a: [110, 100, 70], b: [180, 170, 130], fin: [90, 110, 160], p: [70, 60, 40], pattern: 'motas', extras: ['ojos_arriba', 'patas'], eye: 'arriba' },
  koi: { x0: 1, x1: 12, cy: 8, h: 3, peak: 0.4, nose: 0.8, tail: 'abanico', tailL: 3.5, tailS: 3.4, dorsal: [0.35, 0.8, 1.6, 'baja'], a: [250, 250, 248], b: [246, 246, 244], fin: [240, 236, 230], p: [230, 84, 44], pattern: 'koi', extras: ['bigotes'] },
  pez_luminoso: { x0: 2, x1: 11, cy: 8, h: 2.5, peak: 0.4, nose: 0.9, tail: 'abanico', tailL: 4, tailS: 3.5, dorsal: [0.3, 0.6, 2, 'tri'], anal: [0.55, 0.8, 1.5], a: [50, 100, 210], b: [110, 160, 240], fin: [120, 200, 255], glow: [150, 250, 255], pattern: 'linea_luz', eye: 'grande' },
  pez_brasa: { x0: 1, x1: 12, cy: 8, h: 3, peak: 0.35, nose: 0.8, tail: 'horquilla', tailL: 3, tailS: 3.4, dorsal: [0.25, 0.75, 2.4, 'espinas'], anal: [0.6, 0.82, 1.6], a: [56, 38, 38], b: [90, 50, 40], fin: [200, 70, 30], glow: [255, 140, 40], pattern: 'grietas' },
  pez_seta: { x0: 3, x1: 11, cy: 9, h: 3, peak: 0.4, nose: 0.6, up: 1.2, down: 0.8, tail: 'redonda', tailL: 3, tailS: 2.4, a: [196, 56, 56], b: [246, 236, 222], fin: [230, 220, 204], p: [252, 248, 240], pattern: 'setas', eye: 'grande' },
  cachorrito: { x0: 4, x1: 11, cy: 8, h: 2, peak: 0.4, nose: 0.8, tail: 'redonda', tailL: 2.5, tailS: 2.4, dorsal: [0.45, 0.8, 1.6, 'baja'], anal: [0.5, 0.8, 1.4], a: [70, 110, 210], b: [150, 180, 236], fin: [240, 200, 80], p: [40, 60, 140], pattern: 'barras', eye: 'grande' },
};

function drawFish(s: FishSpec): CritterArt {
  const art = blank(s.depth ?? 3);
  const fin = s.fin ?? shade(s.a, 0.78);
  const p = s.p ?? shade(s.a, 0.6);
  const glow = s.glow ?? [255, 250, 160];
  const peak = s.peak ?? 0.35;
  const nose = s.nose ?? 1;
  const rear = s.rear ?? 1;
  const stem = s.stem ?? 0.7;
  const up = s.up ?? 1;
  const down = s.down ?? 1;
  const extras = new Set(s.extras ?? []);
  const len = s.x1 - s.x0;
  // Media altura del cuerpo en cada punto (0 morro, 1 cola).
  const half = (t: number) => {
    if (t < 0 || t > 1) return 0;
    if (t < peak) return s.h * Math.pow(Math.sin((t / peak) * Math.PI / 2), nose);
    const k = (t - peak) / (1 - peak);
    return stem + (s.h - stem) * Math.pow(Math.cos(k * Math.PI / 2), rear);
  };
  const topAt = (t: number) => s.cy - half(t) * up;
  const botAt = (t: number) => s.cy + half(t) * down;
  const tOf = (x: number) => (x + 0.5 - s.x0) / len;

  // Cola (primero, para que el cuerpo la tape donde se juntan).
  const tl = s.tailL ?? 3;
  const ts = s.tailS ?? 3;
  for (let y = 0; y < N; y++) {
    for (let x = s.x1; x < N; x++) {
      const tx = x + 0.5 - s.x1;
      const dy = y + 0.5 - s.cy;
      const ady = Math.abs(dy);
      const k = tx / tl;
      if (k > 1.05) continue;
      let inside = false;
      switch (s.tail) {
        case 'horquilla': {
          const spread = stem + (ts - stem) * Math.min(1, k * 1.1);
          const notch = k > 0.55 ? ((k - 0.55) / 0.45) * ts * 0.55 : -1;
          inside = ady <= spread && ady >= notch;
          break;
        }
        case 'luna': {
          if (k < 0.45) inside = ady <= stem + 0.3;
          else {
            const arc = 0.45 + Math.pow(ady / ts, 1.6) * 0.6;
            inside = ady <= ts && Math.abs(k - arc) <= 0.32;
          }
          break;
        }
        case 'redonda': {
          const spread = stem + (ts - stem) * Math.sin(Math.min(1, k / 0.6) * Math.PI / 2);
          inside = ady <= spread && k * k + (dy / (ts + 0.4)) ** 2 <= 1.25;
          break;
        }
        case 'recta': inside = ady <= stem + (ts - stem) * k; break;
        case 'abanico': {
          // Cola de velo, que cae un poco.
          const d = dy - k * 0.8;
          const spread = stem + (ts - stem) * Math.sqrt(k);
          const notch = k > 0.6 ? ((k - 0.6) / 0.4) * ts * 0.5 : -1;
          inside = Math.abs(d) <= spread && Math.abs(d) >= notch && k <= 1.05;
          break;
        }
        case 'punta': inside = ady <= stem * (1 - k) + 0.4; break;
        case 'tiburon': {
          // El lóbulo de arriba, largo; el de abajo, corto.
          if (dy < 0) inside = -dy <= stem + (ts - stem) * k && -dy >= (k - 0.15) * ts * 0.9 - 0.2;
          else inside = dy <= stem + ts * 0.5 * k && k < 0.65;
          break;
        }
        case 'ninguna': break;
      }
      if (inside) set(art, x, y, (x + y) % 3 === 0 ? shade(fin, 0.88) : fin, Part.Thin);
    }
  }

  // Aletas de arriba y de abajo.
  const fins = (range: [number, number, number, Fin?] | undefined, top: boolean) => {
    if (!range) return;
    const [t0, t1, height, kind = 'tri'] = range;
    for (let x = 0; x < N; x++) {
      const t = tOf(x);
      if (t < t0 || t > t1) continue;
      const k = (t - t0) / Math.max(0.01, t1 - t0);
      let hgt = height;
      if (kind === 'tri') hgt = height * (1 - Math.abs(k - 0.35) / 0.65);
      else if (kind === 'alta') hgt = height * Math.max(0.15, 1 - k * 1.1);
      else if (kind === 'vela') hgt = height * Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.9 + 0.2);
      else if (kind === 'espinas') hgt = height * (x % 2 === 0 ? 1 : 0.6) * (k < 0.55 ? 1 : 0.75);
      else hgt = height * (k < 0.1 || k > 0.9 ? 0.6 : 1);
      if (hgt < 0.5) continue;
      const edge = top ? topAt(t) : botAt(t);
      // Primer píxel fuera del cuerpo y, desde ahí, hacia fuera.
      const start = top ? Math.ceil(edge - 0.5) - 1 : Math.floor(edge - 0.5) + 1;
      const n = Math.round(hgt);
      for (let i = 0; i < n; i++) {
        const y = top ? start - i : start + i;
        const ink = kind === 'espinas' && i === n - 1 ? shade(fin, 0.7) : kind === 'vela' && (x * 2 + i) % 5 === 0 ? p : fin;
        set(art, x, y, ink, Part.Thin);
      }
    }
  };
  fins(s.dorsal, true);
  fins(s.anal ? [s.anal[0], s.anal[1], s.anal[2], 'tri'] : undefined, false);

  // Cuerpo: el lomo oscuro, la tripa clara y una raya de luz por arriba.
  for (let x = Math.max(0, s.x0); x <= Math.min(N - 1, s.x1); x++) {
    const t = tOf(x);
    if (t < 0) continue;
    const top = topAt(Math.min(1, t));
    const bot = botAt(Math.min(1, t));
    for (let y = 0; y < N; y++) {
      const yc = y + 0.5;
      if (yc < top || yc > bot || bot - top < 0.6) continue;
      const v = (yc - top) / Math.max(0.01, bot - top);
      let c = v < 0.45 ? s.a : v > 0.62 ? s.b : mix(s.a, s.b, 0.5);
      if (yc - top < 1) c = shade(c, 0.86);
      if (bot - yc < 1) c = shade(c, 0.82);
      set(art, x, y, c);
    }
  }

  // Dibujo de la piel.
  const isBody = (x: number, y: number) => get(art, x, y) === Part.Body;
  const rnd = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + s.x0 * 13.3 + s.h * 7.1) * 43758.5453;
    return n - Math.floor(n);
  };
  const bodyTop = (x: number) => { for (let y = 0; y < N; y++) if (isBody(x, y)) return y; return -1; };
  const bodyBot = (x: number) => { for (let y = N - 1; y >= 0; y--) if (isBody(x, y)) return y; return -1; };
  const midY = Math.round(s.cy - 0.5);
  for (let x = 0; x < N; x++) {
    const t = tOf(x);
    const y0 = bodyTop(x);
    const y1 = bodyBot(x);
    if (y0 < 0) continue;
    for (let y = y0; y <= y1; y++) {
      if (!isBody(x, y)) continue;
      const v = (y - y0) / Math.max(1, y1 - y0);
      switch (s.pattern) {
        case 'payaso': {
          const bands = [0.18, 0.5, 0.86];
          for (const b of bands) {
            const d = Math.abs(t - b) * len;
            if (d < 0.9) set(art, x, y, s.p ?? WHITE);
            else if (d < 1.5) set(art, x, y, BLACK);
          }
          break;
        }
        case 'barras': if (t > 0.18 && Math.round(t * len) % 3 === 0 && v < 0.7) set(art, x, y, p); break;
        case 'manchas': if (v < 0.6 && t > 0.15 && rnd(x, y) < 0.3) set(art, x, y, p); break;
        case 'motas': if (rnd(x, y) < 0.22 && t > 0.1) set(art, x, y, mix(art.color[y * N + x]!, p, 0.7)); break;
        case 'linea': if (y === midY && t > 0.15) set(art, x, y, p); break;
        case 'ondas': if (v < 0.45 && (x + Math.round(Math.sin(y * 1.7) * 1.2)) % 3 === 0 && t > 0.15) set(art, x, y, p); break;
        case 'koi': {
          const n = Math.sin(x * 0.9 + 1.3) + Math.cos(y * 1.3 + x * 0.4);
          if (v < 0.75 && n > 0.55) set(art, x, y, p);
          if (v < 0.4 && n < -1.4) set(art, x, y, BLACK);
          break;
        }
        case 'puntos_luz': if (v > 0.6 && x % 2 === 0 && t > 0.15 && t < 0.95 && y === y1 - 1) set(art, x, y, glow, Part.Glow); break;
        case 'grietas': if (Math.abs(Math.sin(x * 1.1 + y * 0.9) * 2 - Math.cos(y * 1.7)) < 0.35 && t > 0.1) set(art, x, y, glow, Part.Glow); break;
        case 'linea_luz': if ((y === midY || (y === midY - 2 && t > 0.3 && t < 0.8)) && t > 0.15) set(art, x, y, glow, Part.Glow); break;
        case 'setas': if (v < 0.55 && rnd(x, y) < 0.22) { set(art, x, y, s.p ?? WHITE); } break;
        case 'placas': if (y === y0 + 1 && x % 2 === 0 && t > 0.2) set(art, x, y, p); if (y === midY && x % 3 === 0 && t > 0.2) set(art, x, y, p); break;
        case 'cola_roja': if (t > 0.6 && v > 0.3) set(art, x, y, p); break;
        case 'banda_cara': if (Math.abs(t - 0.12) * len < 0.8 && v < 0.45) set(art, x, y, p); break;
        case 'vientre_rojo': if (v > 0.55 && t < 0.7) set(art, x, y, s.b); else if (v <= 0.55) set(art, x, y, rnd(x, y) < 0.25 ? p : s.a); break;
        case 'brillo': if (y === y0 + 1 && t > 0.15 && t < 0.8) set(art, x, y, mix(art.color[y * N + x]!, WHITE, 0.35)); break;
      }
    }
  }

  // Aleta del pecho, detrás de la cabeza.
  const pecX = Math.round(s.x0 + len * (peak * 0.9 + 0.08));
  const pecY = Math.round(s.cy + half(tOf(pecX)) * 0.25);
  if (s.pattern !== 'payaso' && !extras.has('patas')) {
    set(art, pecX, pecY, shade(fin, 0.9), Part.Body);
    set(art, pecX + 1, pecY, fin, Part.Body);
    set(art, pecX + 1, pecY + 1, shade(fin, 0.9), Part.Body);
  }

  // Extras de cada especie.
  const mouthY = Math.round(s.cy + half(0.06) * 0.2 - 0.5);
  if (extras.has('espada')) for (let x = 0; x < s.x0 + 1; x++) set(art, x, mouthY, x === 0 ? [150, 156, 170] : [110, 116, 134], Part.Thin);
  if (extras.has('pico')) for (let x = Math.max(0, s.x0 - 3); x < s.x0 + 1; x++) set(art, x, mouthY, [60, 70, 100], Part.Thin);
  if (extras.has('hocico')) set(art, Math.max(0, s.x0), mouthY, shade(s.a, 0.9));
  if (extras.has('martillo')) {
    // La cabeza en forma de martillo, de arriba abajo, con un ojo en cada punta.
    const hx = s.x0;
    for (let y = Math.round(s.cy - 4); y <= Math.round(s.cy + 3); y++) {
      set(art, hx, y, shade(s.a, 0.95));
      set(art, hx + 1, y, s.a);
    }
    set(art, hx, Math.round(s.cy - 4), BLACK);
    set(art, hx, Math.round(s.cy + 3), BLACK);
  }
  if (extras.has('bigotes')) {
    set(art, s.x0, mouthY + 1, shade(s.a, 0.6), Part.Thin);
    set(art, s.x0 - 1, mouthY + 2, shade(s.a, 0.6), Part.Thin);
    if (s.x0 + 1 < N) set(art, s.x0 + 1, mouthY + 2, shade(s.a, 0.6), Part.Thin);
  }
  if (extras.has('labios')) set(art, s.x0, mouthY, mix(s.b, [240, 160, 150], 0.4));
  if (extras.has('dientes')) { set(art, s.x0 + 1, mouthY + 1, WHITE); set(art, s.x0 + 2, mouthY + 1, [60, 30, 30]); }
  if (extras.has('gancho')) { set(art, s.x0, mouthY + 1, shade(s.a, 0.8)); set(art, s.x0, mouthY - 1, shade(s.a, 0.8)); }
  if (extras.has('bocaza')) {
    for (let x = s.x0; x < s.x0 + 3; x++) set(art, x, mouthY + 1, [50, 30, 30]);
    set(art, s.x0 + 1, mouthY + 2, WHITE);
    set(art, s.x0 + 2, mouthY, WHITE);
  }
  if (extras.has('linterna')) {
    const ty = Math.floor(topAt(0.2));
    const lx = s.x0 + 2;
    set(art, lx, ty - 1, shade(s.a, 0.8), Part.Thin);
    set(art, lx - 1, ty - 2, shade(s.a, 0.8), Part.Thin);
    set(art, lx - 2, ty - 2, glow, Part.Glow);
    set(art, lx - 2, ty - 1, glow, Part.Glow);
  }
  if (extras.has('pinchos')) {
    for (let x = 0; x < N; x++) {
      const y0 = bodyTop(x);
      const y1 = bodyBot(x);
      if (y0 < 0 || x > s.x1 - 1 || x % 2) continue;
      set(art, x, y0 - 1, shade(s.a, 0.65), Part.Thin);
      set(art, x, y1 + 1, shade(s.b, 0.7), Part.Thin);
    }
  }
  if (extras.has('pinulas')) {
    for (let x = s.x1 - 3; x <= s.x1 - 1; x++) {
      if (x % 2) continue;
      set(art, x, bodyTop(x) - 1, s.fin ?? shade(s.a, 0.9), Part.Thin);
      set(art, x, bodyBot(x) + 1, s.fin ?? shade(s.a, 0.9), Part.Thin);
    }
  }
  if (extras.has('patas')) {
    const py = bodyBot(s.x0 + 4) + 1;
    set(art, s.x0 + 3, py, fin, Part.Thin);
    set(art, s.x0 + 4, py, fin, Part.Thin);
    set(art, s.x0 + 2, py + 1, fin, Part.Thin);
    set(art, s.x0 + 5, py + 1, fin, Part.Thin);
  }
  if (extras.has('escarcha')) {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (get(art, x, y) === Part.Thin && rnd(x, y) < 0.3) set(art, x, y, WHITE, Part.Thin);
  }

  // El ojo.
  const ex = Math.round(s.x0 + len * (s.eyeT ?? 0.15));
  const ey = Math.round(s.cy - half(s.eyeT ?? 0.15) * up * 0.4 - 0.5);
  if (s.eye === 'grande') {
    set(art, ex, ey, WHITE);
    set(art, ex + 1, ey, WHITE);
    set(art, ex, ey + 1, BLACK);
    set(art, ex + 1, ey + 1, WHITE);
  } else if (s.eye === 'arriba') {
    const ty = bodyTop(ex);
    set(art, ex, ty - 1, WHITE);
    set(art, ex + 1, ty - 1, WHITE);
    set(art, ex, ty - 2, WHITE);
    set(art, ex + 1, ty - 2, BLACK);
  } else {
    set(art, ex, ey, BLACK);
    if (s.eye !== 'peque' && s.h > 2.6) set(art, ex + 1, ey, mix(BLACK, WHITE, 0.4));
  }
  return art;
}

// ---------------------------------------------------------------------------------------------------------------

const cache = new Map<string, CritterArt>();

/** El dibujo de un pez o un insecto (null si no tiene uno propio: los fósiles). */
export function critterArt(c: Creature): CritterArt | null {
  if (c.kind === 'fosil') return null;
  let art = cache.get(c.id);
  if (!art) {
    const hand = HAND[c.id];
    const spec = FISH[c.id];
    if (hand) art = hand();
    else if (spec) art = drawFish(spec);
    else return null;
    cache.set(c.id, art);
  }
  return art;
}

/** Especies con dibujo propio (para las pruebas). */
export function critterIds(): string[] {
  return [...Object.keys(HAND), ...Object.keys(FISH)];
}
