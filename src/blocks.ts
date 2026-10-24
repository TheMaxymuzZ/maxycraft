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
}

export const TILE = 16;
export const ATLAS_TILES = 4; // 4x4 casillas de 16x16 píxeles

// Índices de casilla dentro del atlas.
enum Tile {
  GrassTop, GrassSide, Dirt, Stone, Sand, LogSide, LogTop, Planks, Leaves,
}

export interface BlockDef {
  name: string;
  /** Casillas para [lados, arriba, abajo]. */
  tiles: [number, number, number];
  transparent: boolean;
}

export const BLOCKS: Record<number, BlockDef> = {
  [Block.Grass]: { name: 'Hierba', tiles: [Tile.GrassSide, Tile.GrassTop, Tile.Dirt], transparent: false },
  [Block.Dirt]: { name: 'Tierra', tiles: [Tile.Dirt, Tile.Dirt, Tile.Dirt], transparent: false },
  [Block.Stone]: { name: 'Piedra', tiles: [Tile.Stone, Tile.Stone, Tile.Stone], transparent: false },
  [Block.Sand]: { name: 'Arena', tiles: [Tile.Sand, Tile.Sand, Tile.Sand], transparent: false },
  [Block.Log]: { name: 'Tronco', tiles: [Tile.LogSide, Tile.LogTop, Tile.LogTop], transparent: false },
  [Block.Planks]: { name: 'Tablones', tiles: [Tile.Planks, Tile.Planks, Tile.Planks], transparent: false },
  [Block.Leaves]: { name: 'Hojas', tiles: [Tile.Leaves, Tile.Leaves, Tile.Leaves], transparent: true },
};

export const HOTBAR: Block[] = [
  Block.Grass, Block.Dirt, Block.Stone, Block.Sand, Block.Log, Block.Planks, Block.Leaves,
];

export function isSolid(b: number): boolean {
  return b !== Block.Air;
}

export function isOpaque(b: number): boolean {
  return b !== Block.Air && !BLOCKS[b].transparent;
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

// Paleta algo más suave y cálida que Minecraft, para el aire de Animal Crossing.
const GRASS: RGB[] = [[112, 186, 74], [100, 172, 64], [124, 196, 86], [92, 160, 60]];
const DIRT: RGB[] = [[146, 102, 70], [134, 92, 62], [158, 112, 78], [122, 84, 58]];
const STONE: RGB[] = [[140, 142, 146], [128, 130, 136], [152, 154, 158], [116, 118, 124]];
const SAND: RGB[] = [[238, 220, 164], [230, 210, 152], [244, 228, 176], [224, 202, 144]];
const BARK: RGB[] = [[116, 82, 50], [102, 72, 44], [128, 92, 58]];
const WOOD: RGB[] = [[196, 156, 98], [184, 144, 88], [206, 166, 108]];
const LEAF: RGB[] = [[84, 160, 70], [72, 146, 60], [98, 176, 82], [64, 134, 54]];

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

/** Recorta el icono de la cara lateral de un bloque, para la barra rápida. */
export function blockIcon(atlas: HTMLCanvasElement, b: Block): string {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const tile = BLOCKS[b].tiles[b === Block.Grass ? 0 : 1];
  const ctx = c.getContext('2d')!;
  ctx.drawImage(atlas, (tile % ATLAS_TILES) * TILE, Math.floor(tile / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, TILE, TILE);
  return c.toDataURL();
}
