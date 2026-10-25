import * as THREE from 'three';
import { CREATURES, CREATURE_SPRITES } from './creatures';

export enum Block {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Log = 5,
  Planks = 6,
  Leaves = 7,
  FlowerRed = 8,
  FlowerYellow = 9,
  FlowerWhite = 10,
  TallGrass = 11,
  Apple = 12,
  Orange = 13,
  Pear = 14,
  Peach = 15,
  Cherry = 16,
  PalmLog = 17,
  PalmLeaves = 18,
  Coconut = 19,
  Wall = 20,
  RoofRed = 21,
  RoofBlue = 22,
  RoofGreen = 23,
  RoofYellow = 24,
  Window = 25,
  ShopWall = 26,
  MuseumWall = 27,
  CoalOre = 28,
  IronOre = 29,
  GoldOre = 30,
  GemOre = 31,
  Torch = 32,
  Canvas = 33,
  Workbench = 34,
  Fence = 35,
  WhiteFence = 36,
}

export const TILE = 16;
export const ATLAS_TILES = 16; // 16x16 casillas de 16x16 píxeles
/** Las casillas de peces e insectos empiezan aquí, una por criatura. */
export const CREATURE_TILE_START = 128;
/** Los iconos de los muebles se dibujan aquí al arrancar, una casilla por mueble. */
export const FURNITURE_TILE_START = 176;

// Índices de casilla dentro del atlas.
export enum Tile {
  GrassTop, GrassSide, Dirt, Stone, Sand, LogSide, LogTop, Planks, Leaves,
  FlowerRed, FlowerYellow, FlowerWhite, TallGrass,
  Apple, Orange, Pear, Peach, Cherry,
  PalmSide, PalmTop, PalmLeaves, Coconut,
  Branch, Shell, Conch, Starfish, Axe, Shovel, Pickaxe,
  Wall, RoofRed, RoofBlue, RoofGreen, RoofYellow, Window, ShopWall, Berry,
  Rod, Net, MuseumWall,
  CoalOre, IronOre, GoldOre, GemOre, Torch, Coal, IronNugget, GoldNugget, Gem, IronAxe, IronPickaxe, IronShovel,
  Canvas, WorkbenchTop, WorkbenchSide, Bottle, WhiteWood, FenceIcon, WhiteFenceIcon,
}

/** cube: bloque normal. cross: planta dibujada con dos planos en X, sin colisión. fence: poste con travesaños que se unen a sus vecinos. */
export type Shape = 'cube' | 'cross' | 'fence';

export interface BlockDef {
  name: string;
  /** Casillas para [lados, arriba, abajo]. */
  tiles: [number, number, number];
  transparent: boolean;
  shape: Shape;
}

const cube = (name: string, side: Tile, top = side, bottom = top, transparent = false): BlockDef => ({
  name, tiles: [side, top, bottom], transparent, shape: 'cube',
});
const fence = (name: string, tile: Tile): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'fence',
});
const cross = (name: string, tile: Tile): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'cross',
});

export const BLOCKS: Record<number, BlockDef> = {
  [Block.Grass]: cube('Hierba', Tile.GrassSide, Tile.GrassTop, Tile.Dirt),
  [Block.Dirt]: cube('Tierra', Tile.Dirt),
  [Block.Stone]: cube('Piedra', Tile.Stone),
  [Block.Sand]: cube('Arena', Tile.Sand),
  [Block.Log]: cube('Tronco', Tile.LogSide, Tile.LogTop),
  [Block.Planks]: cube('Tablones', Tile.Planks),
  [Block.Leaves]: cube('Hojas', Tile.Leaves, Tile.Leaves, Tile.Leaves, true),
  [Block.FlowerRed]: cross('Tulipán rojo', Tile.FlowerRed),
  [Block.FlowerYellow]: cross('Pensamiento amarillo', Tile.FlowerYellow),
  [Block.FlowerWhite]: cross('Cosmos blanco', Tile.FlowerWhite),
  [Block.TallGrass]: cross('Hierba alta', Tile.TallGrass),
  [Block.Apple]: cross('Manzana', Tile.Apple),
  [Block.Orange]: cross('Naranja', Tile.Orange),
  [Block.Pear]: cross('Pera', Tile.Pear),
  [Block.Peach]: cross('Melocotón', Tile.Peach),
  [Block.Cherry]: cross('Cereza', Tile.Cherry),
  [Block.PalmLog]: cube('Tronco de palmera', Tile.PalmSide, Tile.PalmTop),
  [Block.PalmLeaves]: cube('Hojas de palmera', Tile.PalmLeaves, Tile.PalmLeaves, Tile.PalmLeaves, true),
  [Block.Coconut]: cross('Coco', Tile.Coconut),
  [Block.Wall]: cube('Pared', Tile.Wall),
  [Block.RoofRed]: cube('Tejado rojo', Tile.RoofRed),
  [Block.RoofBlue]: cube('Tejado azul', Tile.RoofBlue),
  [Block.RoofGreen]: cube('Tejado verde', Tile.RoofGreen),
  [Block.RoofYellow]: cube('Tejado amarillo', Tile.RoofYellow),
  [Block.Window]: cube('Ventana', Tile.Window, Tile.Window, Tile.Window, true),
  [Block.ShopWall]: cube('Pared de madera', Tile.ShopWall),
  [Block.MuseumWall]: cube('Muro de piedra', Tile.MuseumWall),
  [Block.CoalOre]: cube('Carbón', Tile.CoalOre),
  [Block.IronOre]: cube('Mineral de hierro', Tile.IronOre),
  [Block.GoldOre]: cube('Mineral de oro', Tile.GoldOre),
  [Block.GemOre]: cube('Amatista', Tile.GemOre),
  [Block.Torch]: cross('Antorcha', Tile.Torch),
  [Block.Canvas]: cube('Lona', Tile.Canvas),
  [Block.Workbench]: cube('Mesa de trabajo', Tile.WorkbenchSide, Tile.WorkbenchTop, Tile.Planks),
  [Block.Fence]: fence('Valla de madera', Tile.Planks),
  [Block.WhiteFence]: fence('Valla blanca', Tile.WhiteWood),
};

/** Bloques que dan luz y cuánta (alcance en bloques). */
export const LIGHT_RADIUS: Partial<Record<Block, number>> = { [Block.Torch]: 8 };

/** Bloques de construcción: dentro de las parcelas de vecinos y tienda no se pueden romper. */
export const HOUSE_BLOCKS: readonly Block[] = [
  Block.Wall, Block.RoofRed, Block.RoofBlue, Block.RoofGreen, Block.RoofYellow, Block.Window, Block.ShopWall, Block.MuseumWall, Block.Planks, Block.Canvas,
];
export const ROOFS = [Block.RoofRed, Block.RoofBlue, Block.RoofGreen, Block.RoofYellow] as const;

export const FRUITS = [Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry] as const;

/** Bloquea el paso del jugador. */
/** Si choca con el jugador. */
export function isSolid(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape !== 'cross';
}

export function isFence(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'fence';
}

/** Bloque entero (no planta ni valla): da sombra en las esquinas y sostiene lo que se pone encima. */
export function isFullBlock(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cube';
}

/** Se puede apuntar y romper. */
export function isTargetable(b: number): boolean {
  return b !== Block.Air;
}

export function isOpaque(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cube' && !BLOCKS[b].transparent;
}

export function isCross(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cross';
}

// --- Texturas pixel art generadas en un canvas (sin archivos externos) ---

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

type RGB = [number, number, number];

function pick(r: () => number, palette: RGB[]): RGB {
  return palette[Math.floor(r() * palette.length)];
}

function paintTile(ctx: CanvasRenderingContext2D, tile: number, draw: (x: number, y: number, r: () => number) => RGB | null) {
  const ox = (tile % ATLAS_TILES) * TILE;
  const oy = Math.floor(tile / ATLAS_TILES) * TILE;
  const r = rng(tile * 7919 + 13);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const c = draw(x, y, r);
      if (!c) continue;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Dibuja un sprite a partir de un mapa de caracteres de 16x16 ('.' es transparente). */
function paintSprite(ctx: CanvasRenderingContext2D, tile: number, rows: string[], colors: Record<string, RGB>) {
  paintTile(ctx, tile, (x, y) => {
    const ch = rows[y]?.[x] ?? '.';
    return ch === '.' ? null : colors[ch];
  });
}

// Paleta algo más suave y cálida que Minecraft, para el aire de Animal Crossing.
const GRASS: RGB[] = [[112, 186, 74], [100, 172, 64], [124, 196, 86], [92, 160, 60]];
const DIRT: RGB[] = [[146, 102, 70], [134, 92, 62], [158, 112, 78], [122, 84, 58]];
const STONE: RGB[] = [[140, 142, 146], [128, 130, 136], [152, 154, 158], [116, 118, 124]];
const SAND: RGB[] = [[238, 220, 164], [230, 210, 152], [244, 228, 176], [224, 202, 144]];
const BARK: RGB[] = [[116, 82, 50], [102, 72, 44], [128, 92, 58]];
const WOOD: RGB[] = [[196, 156, 98], [184, 144, 88], [206, 166, 108]];
const LEAF: RGB[] = [[84, 160, 70], [72, 146, 60], [98, 176, 82], [64, 134, 54]];
const PALM_BARK: RGB[] = [[168, 132, 86], [154, 120, 78], [180, 144, 96]];
const PALM_LEAF: RGB[] = [[96, 178, 64], [84, 164, 56], [110, 190, 74]];

const STEM: RGB = [74, 140, 52];
const FLOWER = [
  '................',
  '................',
  '................',
  '.....a.a.a......',
  '.....aaaaa......',
  '.....abbba......',
  '......bbb.......',
  '.......s........',
  '.......s..ll....',
  '...ll..s.ll.....',
  '....ll.sll......',
  '.....llsl.......',
  '.......s........',
  '.......s........',
  '.......s........',
  '.......s........',
];
const DAISY = [
  '................',
  '................',
  '.......a........',
  '.....a.a.a......',
  '......aaa.......',
  '....aaabaaa.....',
  '......aaa.......',
  '.....a.a.a......',
  '.......s........',
  '.......s..ll....',
  '...ll..s.ll.....',
  '....ll.sll......',
  '.....llsl.......',
  '.......s........',
  '.......s........',
  '.......s........',
];
const TALL_GRASS = [
  '................',
  '................',
  '................',
  '................',
  '..........a.....',
  '...a......a.....',
  '...a..a..a......',
  '....a.a..a..a...',
  '....a.a.ab..a...',
  '....ab.aab.a....',
  '..a.ab.ab.ba....',
  '...aab.ab.ba.a..',
  '...a.bab.bab.a..',
  '....abab.bab.a..',
  '....abab.babb...',
  '....abab.babb...',
];
// Fruta colgando de un rabito, vista de frente.
const FRUIT = [
  '.......s........',
  '.......sll......',
  '.......s........',
  '......aaa.......',
  '....aaaaaaa.....',
  '...aahaaaaaa....',
  '...ahaaaaaaa....',
  '...aaaaaaaab....',
  '...aaaaaaaab....',
  '....aaaaaab.....',
  '.....abbbb......',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const CHERRY = [
  '........s.......',
  '.......s.s......',
  '......s...s.....',
  '.....s.....s....',
  '....s.......s...',
  '..aaa......aaa..',
  '.aahaa....aahaa.',
  '.ahaaa....ahaaa.',
  '.aaaab....aaaab.',
  '..abb......abb..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const BRANCH = [
  '................',
  '................',
  '.............s..',
  '............s...',
  '...........s....',
  '..........s.....',
  '.........s......',
  '....l...s.......',
  '.....l.s........',
  '......s.........',
  '.....s..........',
  '....s...........',
  '...s............',
  '..s.............',
  '................',
  '................',
];
const SHELL = [
  '................',
  '................',
  '................',
  '................',
  '......aaaa......',
  '....aabababa....',
  '...abababababa..',
  '..aabababababaa.',
  '..ababababababa.',
  '..aabababababaa.',
  '...aaaaaaaaaaa..',
  '.....cccccc.....',
  '......cccc......',
  '................',
  '................',
  '................',
];
const CONCH = [
  '................',
  '................',
  '................',
  '.........aa.....',
  '.......aabba....',
  '......abbaaba...',
  '.....abaaaaba...',
  '....abaaccaba...',
  '...abaacccaba...',
  '..abaaccaaba....',
  '..aaaaaaaba.....',
  '...aaaaaaa......',
  '....aaaa........',
  '................',
  '................',
  '................',
];
const STARFISH = [
  '................',
  '................',
  '.......aa.......',
  '.......aa.......',
  '......abba......',
  '......abba......',
  'aaaaaaabbaaaaaaa',
  '.aabbbbbbbbbbaa.',
  '...aaabbbbaaa...',
  '....aabbbbaa....',
  '....abbaabba....',
  '...abba..abba...',
  '...aba....aba...',
  '..aba......aba..',
  '..aa........aa..',
  '................',
];
const AXE = [
  '................',
  '.........hhh....',
  '........hhhhh...',
  '........hhhhhh..',
  '.......shhhhh...',
  '......s..hhh....',
  '.....s..........',
  '....s...........',
  '...s............',
  '..s.............',
  '.s..............',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const SHOVEL = [
  '................',
  '...........hhh..',
  '..........hhhhh.',
  '..........hhhhh.',
  '.........hhhhh..',
  '........s.hhh...',
  '.......s........',
  '......s.........',
  '.....s..........',
  '....s...........',
  '...s............',
  '..ss............',
  '..s.............',
  '................',
  '................',
  '................',
];
const PICKAXE = [
  '................',
  '....hhhhhh......',
  '...h......hh....',
  '..........shh...',
  '.........s..h...',
  '........s...h...',
  '.......s.....h..',
  '......s.........',
  '.....s..........',
  '....s...........',
  '...s............',
  '..s.............',
  '................',
  '................',
  '................',
  '................',
];

export function createAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE * ATLAS_TILES;
  const ctx = canvas.getContext('2d')!;

  paintTile(ctx, Tile.GrassTop, (_x, _y, r) => pick(r, GRASS));
  paintTile(ctx, Tile.GrassSide, (_x, y, r) => {
    const edge = 3 + Math.floor(r() * 2);
    return y < edge ? pick(r, GRASS) : pick(r, DIRT);
  });
  paintTile(ctx, Tile.Dirt, (_x, _y, r) => pick(r, DIRT));
  paintTile(ctx, Tile.Stone, (x, y, r) => {
    const crack = (x * 3 + y * 5) % 11 === 0;
    return crack ? [104, 106, 112] : pick(r, STONE);
  });
  paintTile(ctx, Tile.Sand, (_x, _y, r) => pick(r, SAND));
  paintTile(ctx, Tile.LogSide, (x, _y, r) => {
    const groove = x % 4 === 1;
    const c = pick(r, BARK);
    return groove ? [c[0] - 22, c[1] - 16, c[2] - 10] : c;
  });
  paintTile(ctx, Tile.LogTop, (x, y, r) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return pick(r, BARK);
    return Math.floor(d) % 2 === 0 ? WOOD[0] : WOOD[1];
  });
  paintTile(ctx, Tile.Planks, (x, y, r) => {
    if (y % 4 === 3) return [150, 112, 66];
    const seam = (y >> 2) % 2 === 0 ? x === 4 : x === 11;
    if (seam) return [160, 122, 74];
    return pick(r, WOOD);
  });
  paintTile(ctx, Tile.Leaves, (_x, _y, r) => (r() < 0.18 ? null : pick(r, LEAF)));

  const leaf: RGB = [86, 156, 60];
  paintSprite(ctx, Tile.FlowerRed, FLOWER, { a: [222, 68, 72], b: [246, 120, 110], s: STEM, l: leaf });
  paintSprite(ctx, Tile.FlowerYellow, FLOWER, { a: [240, 196, 52], b: [252, 226, 110], s: STEM, l: leaf });
  paintSprite(ctx, Tile.FlowerWhite, DAISY, { a: [248, 248, 240], b: [240, 196, 52], s: STEM, l: leaf });
  paintSprite(ctx, Tile.TallGrass, TALL_GRASS, { a: [116, 190, 76], b: [90, 160, 58] });

  const fruit = (tile: Tile, main: RGB, shade: RGB) =>
    paintSprite(ctx, tile, FRUIT, { a: main, b: shade, h: [255, 255, 240], s: [110, 76, 44], l: leaf });
  fruit(Tile.Apple, [214, 52, 52], [160, 30, 36]);
  fruit(Tile.Orange, [244, 146, 36], [204, 110, 24]);
  fruit(Tile.Pear, [196, 210, 80], [150, 168, 54]);
  fruit(Tile.Peach, [248, 170, 150], [222, 120, 110]);
  paintSprite(ctx, Tile.Cherry, CHERRY, { a: [200, 30, 60], b: [140, 16, 40], h: [255, 220, 220], s: [96, 120, 44] });
  fruit(Tile.Coconut, [120, 84, 52], [90, 60, 36]);

  paintTile(ctx, Tile.PalmSide, (_x, y, r) => (y % 4 === 0 ? [138, 104, 66] : pick(r, PALM_BARK)));
  paintTile(ctx, Tile.PalmTop, (x, y, r) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    return d > 6.5 ? pick(r, PALM_BARK) : [214, 190, 140];
  });
  paintTile(ctx, Tile.PalmLeaves, (x, y, r) => ((x + y) % 5 === 0 && r() < 0.6 ? null : pick(r, PALM_LEAF)));

  // Objetos que no son bloques.
  const stick: RGB = [150, 104, 60];
  const metal: RGB = [176, 184, 196];
  paintSprite(ctx, Tile.Branch, BRANCH, { s: [126, 88, 52], l: leaf });
  paintSprite(ctx, Tile.Shell, SHELL, { a: [246, 196, 176], b: [232, 160, 140], c: [214, 140, 120] });
  paintSprite(ctx, Tile.Conch, CONCH, { a: [244, 226, 196], b: [222, 180, 140], c: [240, 150, 150] });
  paintSprite(ctx, Tile.Starfish, STARFISH, { a: [220, 110, 60], b: [246, 150, 86] });
  paintSprite(ctx, Tile.Axe, AXE, { s: stick, h: metal });
  paintSprite(ctx, Tile.Shovel, SHOVEL, { s: stick, h: metal });
  paintSprite(ctx, Tile.Pickaxe, PICKAXE, { s: stick, h: metal });

  // Casas de los vecinos.
  paintTile(ctx, Tile.Wall, (x, y, r) => {
    if (y === 15 || x === 0) return [214, 204, 186];
    return r() < 0.15 ? [236, 228, 212] : [246, 240, 228];
  });
  const roof = (tile: Tile, base: RGB) =>
    paintTile(ctx, tile, (x, y, r) => {
      const row = y % 4 === 3;
      const k = row ? 0.75 : r() < 0.2 ? 0.9 : 1;
      const offset = ((y >> 2) % 2) * 4;
      const seam = (x + offset) % 8 === 0;
      const f = seam ? 0.8 : k;
      return [base[0] * f, base[1] * f, base[2] * f].map(Math.round) as RGB;
    });
  roof(Tile.RoofRed, [206, 80, 70]);
  roof(Tile.RoofBlue, [76, 128, 206]);
  roof(Tile.RoofGreen, [86, 168, 98]);
  roof(Tile.RoofYellow, [232, 186, 64]);
  paintTile(ctx, Tile.ShopWall, (x, y, r) => {
    if (x % 4 === 0) return [120, 86, 52];
    return y % 8 === 0 ? [150, 110, 68] : pick(r, [[176, 128, 80], [168, 122, 76], [184, 136, 86]]);
  });
  // Bolsa de bayas, la moneda de la isla.
  paintSprite(ctx, Tile.Berry, [
    '................',
    '.......ss.......',
    '......s..s......',
    '.....bbbbbb.....',
    '....bbbbbbbb....',
    '...bbbbbbbbbb...',
    '...bbbppbbbbb...',
    '..bbbpppppbbbb..',
    '..bbbppppppbbb..',
    '..bbbbppppbbbb..',
    '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...',
    '....bbbbbbbb....',
    '................',
    '................',
    '................',
  ], { s: [96, 140, 60], b: [222, 196, 140], p: [120, 60, 150] });
  paintTile(ctx, Tile.MuseumWall, (x, y, r) => {
    const mortar = y % 5 === 4 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0;
    return mortar ? [150, 146, 136] : pick(r, [[204, 200, 188], [196, 192, 180], [212, 208, 196]]);
  });
  paintSprite(ctx, Tile.Rod, [
    '..............s.',
    '.............s.l',
    '............s..l',
    '...........s...l',
    '..........s....l',
    '.........s.....l',
    '........s......l',
    '.......s.......l',
    '......s........l',
    '.....s.........l',
    '....s..........r',
    '...hs..........w',
    '..hh............',
    '.hh.............',
    '................',
    '................',
  ], { s: [150, 104, 60], h: [90, 60, 40], l: [230, 230, 230], r: [220, 50, 50], w: [250, 250, 250] });
  paintSprite(ctx, Tile.Net, [
    '.........nnnn...',
    '........n.n.nn..',
    '.......nnnnnnnn.',
    '.......n.n.n.nn.',
    '.......nnnnnnnn.',
    '........nnnnnn..',
    '.......s.nnnn...',
    '......s.........',
    '.....s..........',
    '....s...........',
    '...s............',
    '..s.............',
    '.s..............',
    '................',
    '................',
    '................',
  ], { s: [150, 104, 60], n: [240, 240, 240] });

  // Minerales: piedra con motas de color.
  const ore = (tile: Tile, spot: RGB, shade: RGB) =>
    paintTile(ctx, tile, (x, y, r) => {
      const blob = ((x * 7 + y * 13) % 17 < 3 && r() < 0.9) || ((x * 11 + y * 5) % 19 < 2);
      if (blob) return r() < 0.5 ? spot : shade;
      return pick(r, STONE);
    });
  ore(Tile.CoalOre, [44, 44, 48], [70, 70, 76]);
  ore(Tile.IronOre, [214, 172, 140], [190, 146, 116]);
  ore(Tile.GoldOre, [250, 214, 70], [226, 180, 40]);
  ore(Tile.GemOre, [184, 110, 230], [146, 80, 200]);
  paintSprite(ctx, Tile.Torch, [
    '................',
    '................',
    '................',
    '.......f........',
    '......fff.......',
    '......fyf.......',
    '.......c........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
    '.......s........',
  ], { f: [255, 170, 40], y: [255, 240, 140], c: [60, 50, 40], s: [140, 100, 60] });
  const nugget = (tile: Tile, a: RGB, b: RGB) =>
    paintSprite(ctx, tile, [
      '................',
      '................',
      '................',
      '................',
      '.......aa.......',
      '.....aaaaaa.....',
      '....aahaaaaa....',
      '...aahaaaaaab...',
      '...aaaaaaaabb...',
      '....aaaaaabb....',
      '.....bbbbbb.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], { a, b, h: [255, 255, 255] });
  nugget(Tile.Coal, [52, 52, 56], [30, 30, 34]);
  nugget(Tile.IronNugget, [200, 200, 210], [150, 150, 160]);
  nugget(Tile.GoldNugget, [250, 210, 60], [210, 160, 30]);
  paintSprite(ctx, Tile.Gem, [
    '................',
    '................',
    '.....aaaaaa.....',
    '....ahaaaaab....',
    '...ahaaaaaabb...',
    '...aaaaaaaabb...',
    '....aaaaaabb....',
    '.....aaaabb.....',
    '......aabb......',
    '.......bb.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ], { a: [184, 110, 230], b: [130, 70, 180], h: [240, 220, 255] });
  const iron: RGB = [120, 130, 150];
  paintSprite(ctx, Tile.IronAxe, AXE, { s: stick, h: iron });
  paintSprite(ctx, Tile.IronPickaxe, PICKAXE, { s: stick, h: iron });
  paintSprite(ctx, Tile.IronShovel, SHOVEL, { s: stick, h: iron });

  paintTile(ctx, Tile.Canvas, (x, y, r) => {
    if (y % 8 === 0) return [70, 130, 90];
    return (x + y) % 6 === 0 ? [96, 160, 112] : r() < 0.2 ? [104, 170, 120] : [110, 176, 126];
  });

  paintTile(ctx, Tile.WorkbenchTop, (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [120, 84, 50];
    if (x === 7 || x === 8) return [150, 112, 66];
    return pick(r, WOOD);
  });
  paintTile(ctx, Tile.WorkbenchSide, (x, y, r) => {
    if (y < 3) return y === 2 ? [120, 84, 50] : pick(r, WOOD);
    // Herramientas colgadas: una sierra y un martillo.
    if (y >= 5 && y <= 9 && x >= 2 && x <= 6) return y === 5 || x === 2 ? [190, 194, 200] : null;
    if (x === 11 && y >= 5 && y <= 12) return [116, 82, 50];
    if (y === 5 && x >= 9 && x <= 13) return [110, 112, 120];
    if (x === 0 || x === 15 || y === 15) return [120, 84, 50];
    return (x === 1 || x === 14) ? [150, 112, 66] : y % 4 === 3 ? [150, 112, 66] : pick(r, WOOD);
  });
  paintTile(ctx, Tile.WhiteWood, (_x, y, r) => (y % 4 === 3 ? [214, 214, 206] : pick(r, [[246, 246, 240], [238, 238, 230], [250, 250, 246]])));
  const FENCE = [
    '................',
    '................',
    '..aa...aa...aa..',
    '..ab...ab...ab..',
    '..abbbbabbbbab..',
    '..abbbbabbbbab..',
    '..ab...ab...ab..',
    '..ab...ab...ab..',
    '..ab...ab...ab..',
    '..abbbbabbbbab..',
    '..abbbbabbbbab..',
    '..ab...ab...ab..',
    '..ab...ab...ab..',
    '..ab...ab...ab..',
    '................',
    '................',
  ];
  paintSprite(ctx, Tile.FenceIcon, FENCE, { a: [206, 166, 108], b: [150, 112, 66] });
  paintSprite(ctx, Tile.WhiteFenceIcon, FENCE, { a: [250, 250, 246], b: [204, 204, 196] });
  paintSprite(ctx, Tile.Bottle, [
    '................',
    '................',
    '.........cc.....',
    '........cggc....',
    '.......cgggc....',
    '......cggggc....',
    '.....cggpgc.....',
    '....cggppgc.....',
    '...cgpppgc......',
    '..cgpppgc.......',
    '..cgppgc........',
    '..cgggc.........',
    '...ccc..........',
    '................',
    '................',
    '................',
  ], { c: [60, 120, 110], g: [150, 210, 196], p: [240, 228, 190] });

  // Peces e insectos, una casilla para cada uno.
  CREATURES.forEach((c, i) => {
    paintSprite(ctx, CREATURE_TILE_START + i, CREATURE_SPRITES[c.sprite], { e: [20, 20, 20], c: [255, 255, 200], ...c.colors });
  });

  paintTile(ctx, Tile.Window, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8) return [140, 104, 66];
    return null;
  });

  return canvas;
}

export function createAtlasTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Casilla del atlas que sirve de icono para un bloque. */
export function blockIconTile(b: Block): number {
  const def = BLOCKS[b];
  if (b === Block.Fence) return Tile.FenceIcon;
  if (b === Block.WhiteFence) return Tile.WhiteFenceIcon;
  return def.tiles[b === Block.Grass || def.shape === 'cross' ? 0 : 1];
}

/** Recolorea la hierba y las hojas del atlas según la estación. El verano se queda como está. */
export function applySeason(atlas: HTMLCanvasElement, season: 'primavera' | 'verano' | 'otoño' | 'invierno') {
  if (season === 'verano') return;
  const ctx = atlas.getContext('2d')!;
  const recolor = (tile: number, fn: (c: RGB, x: number, y: number, r: number) => RGB) => {
    const ox = (tile % ATLAS_TILES) * TILE;
    const oy = Math.floor(tile / ATLAS_TILES) * TILE;
    const img = ctx.getImageData(ox, oy, TILE, TILE);
    const d = img.data;
    const r = rng(tile * 131 + season.length);
    for (let i = 0; i < d.length; i += 4) {
      const roll = r();
      if (d[i + 3] === 0) continue;
      // Solo los píxeles verdes: el borde de tierra del lateral de la hierba no cambia.
      if (!(d[i + 1] > d[i] && d[i + 1] > d[i + 2])) continue;
      const [nr, ng, nb] = fn([d[i], d[i + 1], d[i + 2]], (i / 4) % TILE, Math.floor(i / 4 / TILE), roll);
      d[i] = nr;
      d[i + 1] = ng;
      d[i + 2] = nb;
    }
    ctx.putImageData(img, ox, oy);
  };
  const mix = (c: RGB, t: RGB, k: number): RGB => [
    Math.round(c[0] + (t[0] - c[0]) * k), Math.round(c[1] + (t[1] - c[1]) * k), Math.round(c[2] + (t[2] - c[2]) * k),
  ];
  if (season === 'invierno') {
    const snow = (_c: RGB, _x: number, _y: number, r: number): RGB => (r < 0.15 ? [222, 232, 244] : r < 0.25 ? [236, 242, 250] : [248, 250, 255]);
    recolor(Tile.GrassTop, snow);
    recolor(Tile.GrassSide, snow);
    recolor(Tile.Leaves, (c, _x, _y, r) => (r < 0.45 ? snow(c, 0, 0, r) : mix(c, [40, 90, 70], 0.4)));
    recolor(Tile.TallGrass, (c) => mix(c, [170, 160, 120], 0.6));
  } else if (season === 'otoño') {
    recolor(Tile.GrassTop, (c) => mix(c, [180, 170, 70], 0.35));
    recolor(Tile.GrassSide, (c) => mix(c, [180, 170, 70], 0.35));
    recolor(Tile.TallGrass, (c) => mix(c, [196, 160, 70], 0.5));
    const AUTUMN: RGB[] = [[214, 102, 44], [232, 150, 52], [196, 64, 40], [236, 190, 70]];
    recolor(Tile.Leaves, (c, _x, _y, r) => mix(c, AUTUMN[Math.floor(r * AUTUMN.length)], 0.8));
  } else {
    // Primavera: hierba más clara y flores rosas en los árboles.
    recolor(Tile.GrassTop, (c) => mix(c, [150, 214, 100], 0.3));
    recolor(Tile.GrassSide, (c) => mix(c, [150, 214, 100], 0.3));
    recolor(Tile.Leaves, (c, _x, _y, r) => (r < 0.22 ? [246, 178, 206] : r < 0.28 ? [252, 214, 228] : c));
  }
}

/** Recorta una casilla del atlas en su propio canvas de 16x16. */
export function tileCanvas(atlas: HTMLCanvasElement, tile: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(atlas, (tile % ATLAS_TILES) * TILE, Math.floor(tile / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, TILE, TILE);
  return c;
}
