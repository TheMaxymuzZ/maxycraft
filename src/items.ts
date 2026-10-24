import { BLOCKS, Block, Tile, blockIconTile } from './blocks';

export type ToolKind = 'axe' | 'shovel' | 'pickaxe';

export interface ItemDef {
  id: string;
  name: string;
  /** Casilla del atlas para el icono. */
  tile: number;
  maxStack: number;
  /** Si se puede colocar en el mundo, qué bloque pone. */
  block?: Block;
  tool?: ToolKind;
  /** Usos antes de romperse (solo herramientas). */
  durability?: number;
}

export interface ItemStack {
  id: string;
  count: number;
  /** Usos gastados, para herramientas. */
  wear?: number;
}

const defs: ItemDef[] = [];
const byId = new Map<string, ItemDef>();
const byBlock = new Map<Block, ItemDef>();

function add(def: ItemDef) {
  defs.push(def);
  byId.set(def.id, def);
  if (def.block !== undefined) byBlock.set(def.block, def);
}

// Bloques que se pueden llevar en el bolsillo y colocar.
const PLACEABLE: [Block, string][] = [
  [Block.Dirt, 'tierra'],
  [Block.Stone, 'piedra'],
  [Block.Sand, 'arena'],
  [Block.Log, 'tronco'],
  [Block.Planks, 'tablones'],
  [Block.Leaves, 'hojas'],
  [Block.PalmLog, 'tronco_palmera'],
  [Block.FlowerRed, 'tulipan'],
  [Block.FlowerYellow, 'pensamiento'],
  [Block.FlowerWhite, 'cosmos'],
];
for (const [block, id] of PLACEABLE) {
  add({ id, name: BLOCKS[block].name, tile: blockIconTile(block), maxStack: 99, block });
}

// Frutas: en Animal Crossing se apilan de 10 en 10.
const FRUIT_ITEMS: [Block, string][] = [
  [Block.Apple, 'manzana'],
  [Block.Orange, 'naranja'],
  [Block.Pear, 'pera'],
  [Block.Peach, 'melocoton'],
  [Block.Cherry, 'cereza'],
  [Block.Coconut, 'coco'],
];
for (const [block, id] of FRUIT_ITEMS) add({ id, name: BLOCKS[block].name, tile: blockIconTile(block), maxStack: 10 });

add({ id: 'rama', name: 'Rama', tile: Tile.Branch, maxStack: 30 });
add({ id: 'concha', name: 'Concha', tile: Tile.Shell, maxStack: 10 });
add({ id: 'caracola', name: 'Caracola', tile: Tile.Conch, maxStack: 10 });
add({ id: 'estrella', name: 'Estrella de mar', tile: Tile.Starfish, maxStack: 10 });
add({ id: 'hacha', name: 'Hacha', tile: Tile.Axe, maxStack: 1, tool: 'axe', durability: 40 });
add({ id: 'pala', name: 'Pala', tile: Tile.Shovel, maxStack: 1, tool: 'shovel', durability: 40 });
add({ id: 'pico', name: 'Pico', tile: Tile.Pickaxe, maxStack: 1, tool: 'pickaxe', durability: 40 });

export const SHELLS = ['concha', 'caracola', 'estrella'] as const;

export function itemDef(id: string): ItemDef {
  const d = byId.get(id);
  if (!d) throw new Error(`Objeto desconocido: ${id}`);
  return d;
}

export function hasItem(id: string): boolean {
  return byId.has(id);
}

/** Lo que suelta un bloque al romperlo. */
export function dropFor(b: Block): string | null {
  switch (b) {
    case Block.Grass:
      return 'tierra';
    case Block.TallGrass:
      return null;
    case Block.Leaves:
    case Block.PalmLeaves:
      return null; // las hojas se deshacen; las ramas salen al sacudir árboles
    case Block.Apple:
      return 'manzana';
    case Block.Orange:
      return 'naranja';
    case Block.Pear:
      return 'pera';
    case Block.Peach:
      return 'melocoton';
    case Block.Cherry:
      return 'cereza';
    case Block.Coconut:
      return 'coco';
    default:
      return byBlock.get(b)?.id ?? null;
  }
}

/** Objeto de fruta que corresponde a un bloque de fruta, o null. */
export function fruitItemFor(b: Block): string | null {
  const found = FRUIT_ITEMS.find(([block]) => block === b);
  return found ? found[1] : null;
}

// --- Romper bloques: dureza y herramienta adecuada ---

interface Hardness {
  /** Segundos a mano. */
  time: number;
  tool?: ToolKind;
  /** Sin la herramienta no se puede romper. */
  needsTool?: boolean;
}

const HARDNESS: Partial<Record<Block, Hardness>> = {
  [Block.Grass]: { time: 0.6, tool: 'shovel' },
  [Block.Dirt]: { time: 0.5, tool: 'shovel' },
  [Block.Sand]: { time: 0.5, tool: 'shovel' },
  [Block.Stone]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.Log]: { time: 2.5, tool: 'axe' },
  [Block.PalmLog]: { time: 2.5, tool: 'axe' },
  [Block.Planks]: { time: 1.6, tool: 'axe' },
  [Block.Leaves]: { time: 0.25 },
  [Block.PalmLeaves]: { time: 0.25 },
};

export function breakInfo(b: Block, tool: ToolKind | undefined): { seconds: number; allowed: boolean; usesTool: boolean } {
  const h = HARDNESS[b] ?? { time: 0 };
  const usesTool = !!h.tool && h.tool === tool;
  if (h.needsTool && !usesTool) return { seconds: Infinity, allowed: false, usesTool: false };
  return { seconds: usesTool ? h.time / 5 : h.time, allowed: true, usesTool };
}

export function toolNameFor(b: Block): string | null {
  const h = HARDNESS[b];
  if (!h?.needsTool || !h.tool) return null;
  return { axe: 'un hacha', shovel: 'una pala', pickaxe: 'un pico' }[h.tool];
}

// --- Recetas sencillas (la mesa de trabajo llegará en la v0.9) ---

export interface Recipe {
  result: string;
  count: number;
  needs: [string, number][];
}

export const RECIPES: Recipe[] = [
  { result: 'tablones', count: 4, needs: [['tronco', 1]] },
  { result: 'hacha', count: 1, needs: [['rama', 5]] },
  { result: 'pala', count: 1, needs: [['rama', 5]] },
  { result: 'pico', count: 1, needs: [['rama', 6]] },
];
