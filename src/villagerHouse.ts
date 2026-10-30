// Las casas nuevas de los vecinos (v5.2). Más grandes que la casita de 5×5 de antes: 7×7 por fuera y un salón de
// 5×5 por dentro con el techo abierto hasta el tejado a dos aguas. Cada casa trae su cocina, su mesa con sillas
// (te puedes sentar), su cama con mesita, una estantería y un cuadro; y siguen quedando huecos para los muebles
// que les regales. Solo las tienen las islas nuevas (terreno 3) y las aldeas del archipiélago de esas islas; las
// islas de antes conservan sus casitas.
//
// Todo se mide desde la casilla de delante de la puerta (plot.door), como las casitas de antes, para que los
// vecinos sigan entrando, durmiendo y saliendo igual.

import { Block, ROOFS, ROOF_SLABS, ROOF_STAIRS, roofColorOf, stairsFacing } from './blocks';
import type { Cell } from './pathfind';

/** Estilo de casa de una parcela: sin él, la casita de antes. */
export const BIG_HOUSE = 2;

/** Medio lado de las paredes (7×7) y lo que sale el tejado por los lados. */
export const HOUSE_HALF = 3;
/** Medio lado que ocupa con el alero: lo que hay que dejar libre alrededor del centro. */
export const HOUSE_REACH = HOUSE_HALF + 1;
/** Altura de las paredes (de la capa 1 a la 3) antes de que empiece el tejado. */
const WALL_TOP = 3;
/** Casilla de delante de la puerta respecto al centro de la parcela. */
export const DOOR_DZ = HOUSE_HALF + 1;

export interface HousePlot {
  x: number;
  y: number;
  z: number;
  door: Cell;
  style?: number;
}

export function isBigHouse(p: { style?: number } | undefined): boolean {
  return p?.style === BIG_HOUSE;
}

/** Desde la puerta (dx, dz) hasta una casilla del interior dada desde el centro de la parcela. */
const fromDoor = (x: number, z: number): [number, number] => [x, z - DOOR_DZ];

/** Muebles fijos de la casa grande: [mueble, x, z desde el centro, giro]. La cama va aparte (bedCell). */
export const HOUSE_FIXTURES: [string, number, number, number][] = [
  ['mesita', -1, -2, 0],
  ['cocina', 2, -2, 0],
  ['fregadero', 2, -1, 3],
  ['nevera', 2, 0, 3],
  ['mesa', 1, 1, 0],
  ['silla', 2, 1, 3],
  ['silla', 1, 2, 2],
  ['estanteria', -2, 0, 1],
  ['cuadro', -2, 1, 1],
  ['alfombra', 0, -1, 0],
];

/**
 * Huecos para los regalos en la casa grande, desde la puerta: [dx, dz, giro]. Son 6, como en las casitas, y cada uno
 * mira hacia el mismo lado que el hueco del mismo número de antes (los muebles regalados guardan su giro).
 */
export const BIG_SLOTS: [number, number, number][] = [
  [...fromDoor(0, -2), 0],
  [...fromDoor(1, -2), 0],
  [...fromDoor(2, 2), 3],
  [...fromDoor(-2, -1), 1],
  [...fromDoor(1, -1), 3],
  [...fromDoor(-2, 2), 1],
];

/** La cama de la casa grande (en la esquina del fondo a la izquierda), desde la puerta. */
export const BIG_BED: [number, number] = fromDoor(-2, -2);

/** Si el punto (x, y, z) está dentro de la casa grande cuya puerta es `door`. */
export function insideBigHouse(door: Cell, x: number, y: number, z: number): boolean {
  const [dx, dy, dz] = door;
  return Math.abs(x - (dx + 0.5)) < HOUSE_HALF && z < dz - 0.5 && z > dz - 1 - 2 * HOUSE_HALF && y >= dy - 0.5 && y < dy + 6;
}

/**
 * Construye la casa grande con el centro en (x, z) y el suelo en y. `roof` es uno de ROOFS (su escalera y su losa
 * salen solas). Tejado a dos aguas con la cumbrera de delante atrás, aleros que sobresalen y el hastial con ventana.
 */
export function buildBigHouse(x: number, y: number, z: number, roof: Block, put: (x: number, y: number, z: number, b: Block) => void, wall: Block = Block.Wall) {
  const H = HOUSE_HALF;
  const color = Math.max(0, roofColorOf(roof));
  const stairs = ROOF_STAIRS[color];
  const slab = ROOF_SLABS[color];
  // Suelo de tablones, con un escalón de piedra delante de la puerta.
  for (let dz = -H; dz <= H; dz++) for (let dx = -H; dx <= H; dx++) put(x + dx, y, z + dz, Block.Planks);
  put(x, y, z + H + 1, Block.StonePath);
  // Paredes: troncos en las esquinas, pared lisa y ventanas grandes de dos alturas a los lados.
  for (let h = 1; h <= WALL_TOP; h++) {
    for (let dz = -H; dz <= H; dz++) {
      for (let dx = -H; dx <= H; dx++) {
        const edge = Math.abs(dx) === H || Math.abs(dz) === H;
        const corner = Math.abs(dx) === H && Math.abs(dz) === H;
        let b: Block = !edge ? Block.Air : corner ? Block.Log : wall;
        const side = Math.abs(dx) === H && Math.abs(dz) === 1 && h <= 2;
        const back = dz === -H && Math.abs(dx) === 1 && h === 2;
        const front = dz === H && Math.abs(dx) === 2 && h === 2;
        if (edge && !corner && (side || back || front)) b = Block.Window;
        if (edge && !corner && h === WALL_TOP) b = Block.Log; // viga que corona las paredes
        put(x + dx, y + h, z + dz, b);
      }
    }
  }
  // La puerta, en el centro de la fachada.
  put(x, y + 1, z + H, Block.Door);
  put(x, y + 2, z + H, Block.DoorTop);
  // Tejado a dos aguas: cada capa sube uno y se mete uno, con escaleras de teja; por dentro queda abierto hasta arriba.
  const top = y + WALL_TOP + 1;
  for (let k = 0; k <= H + 1; k++) {
    const off = H + 1 - k;
    for (let dz = -H - 1; dz <= H + 1; dz++) {
      if (off === 0) {
        put(x, top + k, z + dz, slab); // cumbrera
        put(x, top + k - 1, z + dz, ROOFS[color]);
        continue;
      }
      put(x - off, top + k, z + dz, stairsFacing(stairs, 1));
      put(x + off, top + k, z + dz, stairsFacing(stairs, 3));
    }
    if (k === 0) continue;
    // Las paredes de los lados suben hasta el tejado.
    if (k === 1) for (let dz = -H; dz <= H; dz++) for (const dx of [-H, H]) put(x + dx, top, z + dz, Math.abs(dz) === H ? Block.Log : wall);
    // Hastiales: el triángulo de pared de delante y de detrás, con un ventanuco arriba; por dentro, aire.
    for (let dx = -off; dx <= off; dx++) {
      for (const dz of [-H, H]) if (k > 1 || Math.abs(dx) < H) put(x + dx, top + k - 1, z + dz, k === 2 && dx === 0 ? Block.Window : wall);
      if (Math.abs(dx) < off) for (let dz = -H + 1; dz <= H - 1; dz++) put(x + dx, top + k - 1, z + dz, Block.Air);
    }
  }
}

/** El bloque de tejado de la casa grande que hay que cambiar al pintar el tejado de `color` (o null si no es tejado). */
export function recoloredRoof(b: number, color: number): Block | null {
  const c = roofColorOf(b);
  if (c < 0 || c === color) return null;
  const s = ROOF_STAIRS[c];
  if (b >= s && b < s + 4) return (ROOF_STAIRS[color] + (b - s)) as Block;
  if (b === ROOF_SLABS[c]) return ROOF_SLABS[color];
  return ROOFS[color];
}
