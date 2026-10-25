import * as THREE from 'three';

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
}

export const TILE = 16;
export const ATLAS_TILES = 8; // 8x8 casillas de 16x16 píxeles

// Índices de casilla dentro del atlas.
enum Tile {
  GrassTop, GrassSide, Dirt, Stone, Sand, LogSide, LogTop, Planks, Leaves,
  FlowerRed, FlowerYellow, FlowerWhite, TallGrass,
  Apple, Orange, Pear, Peach, Cherry,
  PalmSide, PalmTop, PalmLeaves, Coconut,
}

/** cube: bloque normal. cross: planta dibujada con dos planos en X, sin colisión. */
export type Shape = 'cube' | 'cross';

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
};

export const FRUITS = [Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry] as const;

export const HOTBAR: Block[] = [
  Block.Grass, Block.Dirt, Block.Stone, Block.Sand, Block.Log, Block.Planks, Block.Leaves,
  Block.FlowerRed, Block.FlowerYellow,
];

/** Bloquea el paso del jugador. */
export function isSolid(b: number): boolean {
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

/** Recorta el icono de un bloque, para la barra rápida. */
export function blockIcon(atlas: HTMLCanvasElement, b: Block): string {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const def = BLOCKS[b];
  const tile = def.tiles[b === Block.Grass || def.shape === 'cross' ? 0 : 1];
  const ctx = c.getContext('2d')!;
  ctx.drawImage(atlas, (tile % ATLAS_TILES) * TILE, Math.floor(tile / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, TILE, TILE);
  return c.toDataURL();
}
