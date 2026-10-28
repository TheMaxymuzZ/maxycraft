import { ATLAS_TILES, TILE, Tile, applySeason } from './blocks';

/**
 * Dibujos nuevos de prueba (v5.2): unas pocas texturas hechas con una IA de imágenes, en un solo archivo.
 * El archivo es una cuadrícula de PACK_COLS columnas con una casilla cuadrada por textura, en el orden de PACK_TILES.
 * Si no está, o se abre el juego con ?graficos=clasicos, todo se ve como siempre con los dibujos del canvas.
 */
export const PACK_URL = './sprites/piloto.png';
export const PACK_COLS = 3;
/** Casillas del atlas que cambia el archivo, de izquierda a derecha y de arriba abajo. */
export const PACK_TILES: readonly number[] = [
  Tile.GrassTop, Tile.GrassSide, Tile.Dirt,
  Tile.Stone, Tile.Cobble, Tile.Sand,
  Tile.Planks, Tile.LogSide, Tile.LogTop,
];
/** Lado de cada casilla en el atlas grande que usa el mundo en 3D (el normal es de 16). */
export const HI_TILE = 64;

export type SpritePack = Map<number, HTMLCanvasElement>;

/** Corta la imagen en casillas de HI_TILE de lado. Si sobra o falta algo, se queda con lo que encaje. */
export function slicePack(img: CanvasImageSource & { width: number; height: number }): SpritePack {
  const rows = Math.ceil(PACK_TILES.length / PACK_COLS);
  const cw = img.width / PACK_COLS;
  const ch = img.height / rows;
  const pack: SpritePack = new Map();
  PACK_TILES.forEach((tile, i) => {
    const c = document.createElement('canvas');
    c.width = c.height = HI_TILE;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (i % PACK_COLS) * cw, Math.floor(i / PACK_COLS) * ch, cw, ch, 0, 0, HI_TILE, HI_TILE);
    pack.set(tile, c);
  });
  return pack;
}

/** Carga el archivo de dibujos. Devuelve null si no hay (y el juego sigue con los de siempre). */
export async function loadSpritePack(url = PACK_URL): Promise<SpritePack | null> {
  if (new URLSearchParams(location.search).get('graficos') === 'clasicos') return null;
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img.width > 0 ? slicePack(img) : null;
  } catch {
    return null;
  }
}

/** Copia los dibujos nuevos, en pequeño, al atlas de 16: así los iconos, el mapa y los menús llevan los mismos colores. */
export function paintPackSmall(atlas: HTMLCanvasElement, pack: SpritePack) {
  const ctx = atlas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const [tile, c] of pack) {
    const x = (tile % ATLAS_TILES) * TILE;
    const y = Math.floor(tile / ATLAS_TILES) * TILE;
    ctx.clearRect(x, y, TILE, TILE);
    ctx.drawImage(c, x, y, TILE, TILE);
  }
}

/**
 * Atlas grande para el mundo en 3D: el de 16 ampliado sin difuminar (las texturas de siempre se ven igual)
 * y encima los dibujos nuevos con todo su detalle, recoloreados según la estación.
 */
export function buildHiAtlas(atlas: HTMLCanvasElement, pack: SpritePack, season: Parameters<typeof applySeason>[1], into?: HTMLCanvasElement): HTMLCanvasElement {
  const hi = into ?? document.createElement('canvas');
  hi.width = hi.height = HI_TILE * ATLAS_TILES;
  const ctx = hi.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, hi.width, hi.height);
  ctx.drawImage(atlas, 0, 0, hi.width, hi.height);
  for (const [tile, c] of pack) {
    const x = (tile % ATLAS_TILES) * HI_TILE;
    const y = Math.floor(tile / ATLAS_TILES) * HI_TILE;
    ctx.clearRect(x, y, HI_TILE, HI_TILE);
    ctx.drawImage(c, x, y);
  }
  applySeason(hi, season, HI_TILE, (t) => pack.has(t));
  return hi;
}
