import { BLOCKS, Block, CREATURE_TILE_START, Tile, blockIconTile } from './blocks';
import { CREATURES } from './creatures';
import { FURNITURE, FURNITURE_TILE } from './furniture';

export type ToolKind = 'axe' | 'shovel' | 'pickaxe' | 'rod' | 'net';

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
  /** Cuántas veces más rápido rompe con la herramienta adecuada (5 por defecto). */
  power?: number;
  /** Bayas que paga la tienda (antes del precio del día). */
  sell: number;
  /** Bayas que cuesta en la tienda, si se vende allí. */
  buy?: number;
  /** Si es un mueble que se coloca en el mundo. */
  furniture?: boolean;
  /** Solo se vende en esa fiesta. */
  holiday?: string;
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

// Bloques que se pueden llevar en el bolsillo y colocar: [bloque, id, venta, compra].
const PLACEABLE: [Block, string, number, number?][] = [
  [Block.Dirt, 'tierra', 2],
  [Block.Stone, 'piedra', 15, 40],
  [Block.Sand, 'arena', 2, 10],
  [Block.Log, 'tronco', 30],
  [Block.Planks, 'tablones', 10, 30],
  [Block.Leaves, 'hojas', 1],
  [Block.PalmLog, 'tronco_palmera', 30],
  [Block.FlowerRed, 'tulipan', 40, 120],
  [Block.FlowerYellow, 'pensamiento', 40, 120],
  [Block.FlowerWhite, 'cosmos', 40, 120],
  [Block.FlowerBlue, 'nomeolvides', 40, 120],
  [Block.FlowerPink, 'clavel', 40, 120],
  [Block.Bamboo, 'bambu', 20],
  [Block.Wall, 'pared', 30, 100],
  [Block.ShopWall, 'pared_madera', 30, 100],
  [Block.RoofRed, 'tejado_rojo', 25, 80],
  [Block.RoofBlue, 'tejado_azul', 25, 80],
  [Block.RoofGreen, 'tejado_verde', 25, 80],
  [Block.RoofYellow, 'tejado_amarillo', 25, 80],
  [Block.Window, 'ventana', 40, 150],
  [Block.Workbench, 'mesa_trabajo', 60],
  [Block.Fence, 'valla', 15],
  [Block.WhiteFence, 'valla_blanca', 25],
];
for (const [block, id, sell, buy] of PLACEABLE) {
  add({ id, name: BLOCKS[block].name, tile: blockIconTile(block), maxStack: 99, block, sell, buy });
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
for (const [block, id] of FRUIT_ITEMS) {
  add({ id, name: BLOCKS[block].name, tile: blockIconTile(block), maxStack: 10, sell: block === Block.Coconut ? 250 : 100 });
}

add({ id: 'botella', name: 'Mensaje en una botella', tile: Tile.Bottle, maxStack: 10, sell: 10 });
add({ id: 'rama', name: 'Rama', tile: Tile.Branch, maxStack: 30, sell: 5 });
add({ id: 'concha', name: 'Concha', tile: Tile.Shell, maxStack: 10, sell: 60 });
add({ id: 'caracola', name: 'Caracola', tile: Tile.Conch, maxStack: 10, sell: 100 });
add({ id: 'estrella', name: 'Estrella de mar', tile: Tile.Starfish, maxStack: 10, sell: 150 });
add({ id: 'hacha', name: 'Hacha', tile: Tile.Axe, maxStack: 1, tool: 'axe', durability: 40, sell: 50, buy: 400 });
add({ id: 'pala', name: 'Pala', tile: Tile.Shovel, maxStack: 1, tool: 'shovel', durability: 40, sell: 50, buy: 400 });
add({ id: 'pico', name: 'Pico', tile: Tile.Pickaxe, maxStack: 1, tool: 'pickaxe', durability: 40, sell: 50, buy: 500 });
add({ id: 'cana', name: 'Caña de pescar', tile: Tile.Rod, maxStack: 1, tool: 'rod', durability: 30, sell: 50, buy: 400 });
add({ id: 'red', name: 'Red', tile: Tile.Net, maxStack: 1, tool: 'net', durability: 30, sell: 50, buy: 400 });
add({ id: 'hacha_hierro', name: 'Hacha de hierro', tile: Tile.IronAxe, maxStack: 1, tool: 'axe', durability: 120, power: 8, sell: 200 });
add({ id: 'pico_hierro', name: 'Pico de hierro', tile: Tile.IronPickaxe, maxStack: 1, tool: 'pickaxe', durability: 120, power: 8, sell: 200 });
add({ id: 'pala_hierro', name: 'Pala de hierro', tile: Tile.IronShovel, maxStack: 1, tool: 'shovel', durability: 120, power: 8, sell: 200 });
add({ id: 'antorcha', name: 'Antorcha', tile: blockIconTile(Block.Torch), maxStack: 99, block: Block.Torch, sell: 20, buy: 60 });
add({ id: 'carbon', name: 'Carbón', tile: Tile.Coal, maxStack: 30, sell: 50 });
add({ id: 'pepita_hierro', name: 'Pepita de hierro', tile: Tile.IronNugget, maxStack: 30, sell: 375 });
add({ id: 'pepita_oro', name: 'Pepita de oro', tile: Tile.GoldNugget, maxStack: 30, sell: 1500 });
add({ id: 'amatista', name: 'Amatista', tile: Tile.Gem, maxStack: 30, sell: 800 });
add({ id: 'muro_piedra', name: 'Muro de piedra', tile: blockIconTile(Block.MuseumWall), maxStack: 99, block: Block.MuseumWall, sell: 30, buy: 100 });

// Peces e insectos: se pueden vender o donar al museo.
CREATURES.forEach((c, i) => add({ id: c.id, name: c.name, tile: CREATURE_TILE_START + i, maxStack: 10, sell: c.sell }));

// Muebles para decorar la casa.
for (const f of FURNITURE) add({ id: f.id, name: f.name, tile: FURNITURE_TILE(f.id), maxStack: 1, sell: f.sell, buy: f.buy, furniture: true, holiday: f.holiday });

/** Todo lo que la tienda puede tener a la venta. */
export const CATALOG = defs.filter((d) => d.buy !== undefined).map((d) => d.id);

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
    case Block.CoalOre:
      return 'carbon';
    case Block.IronOre:
      return 'pepita_hierro';
    case Block.GoldOre:
      return 'pepita_oro';
    case Block.GemOre:
      return 'amatista';
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
  [Block.CoalOre]: { time: 2.5, tool: 'pickaxe', needsTool: true },
  [Block.IronOre]: { time: 3.5, tool: 'pickaxe', needsTool: true },
  [Block.GoldOre]: { time: 4.5, tool: 'pickaxe', needsTool: true },
  [Block.GemOre]: { time: 4.5, tool: 'pickaxe', needsTool: true },
  [Block.MuseumWall]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.Log]: { time: 2.5, tool: 'axe' },
  [Block.PalmLog]: { time: 2.5, tool: 'axe' },
  [Block.Planks]: { time: 1.6, tool: 'axe' },
  [Block.Workbench]: { time: 1.6, tool: 'axe' },
  [Block.Fence]: { time: 0.8, tool: 'axe' },
  [Block.WhiteFence]: { time: 0.8, tool: 'axe' },
  [Block.Leaves]: { time: 0.25 },
  [Block.PalmLeaves]: { time: 0.25 },
};

export function breakInfo(b: Block, toolItem: ItemDef | null): { seconds: number; allowed: boolean; usesTool: boolean } {
  const h = HARDNESS[b] ?? { time: 0 };
  const usesTool = !!h.tool && h.tool === toolItem?.tool;
  if (h.needsTool && !usesTool) return { seconds: Infinity, allowed: false, usesTool: false };
  return { seconds: usesTool ? h.time / (toolItem?.power ?? 5) : h.time, allowed: true, usesTool };
}

export function toolNameFor(b: Block): string | null {
  const h = HARDNESS[b];
  if (!h?.needsTool || !h.tool) return null;
  const names: Record<ToolKind, string> = { axe: 'un hacha', shovel: 'una pala', pickaxe: 'un pico', rod: 'una caña', net: 'una red' };
  return names[h.tool];
}

// --- Recetas ---

export interface Recipe {
  result: string;
  count: number;
  needs: [string, number][];
}

/** Lo que se fabrica en cualquier sitio, con los bolsillos. */
export const RECIPES: Recipe[] = [
  { result: 'tablones', count: 4, needs: [['tronco', 1]] },
  { result: 'mesa_trabajo', count: 1, needs: [['tablones', 4]] },
  { result: 'hacha', count: 1, needs: [['rama', 5]] },
  { result: 'pala', count: 1, needs: [['rama', 5]] },
  { result: 'pico', count: 1, needs: [['rama', 6]] },
  { result: 'cana', count: 1, needs: [['rama', 5]] },
  { result: 'red', count: 1, needs: [['rama', 5]] },
  { result: 'antorcha', count: 4, needs: [['rama', 1], ['carbon', 1]] },
];

/** Recetas de la mesa de trabajo. Hay que aprenderlas: de los vecinos o de las botellas de la playa. */
export const DIY_RECIPES: Recipe[] = [
  { result: 'valla', count: 4, needs: [['tablones', 2], ['rama', 2]] },
  { result: 'silla', count: 1, needs: [['tablones', 4]] },
  { result: 'banco', count: 1, needs: [['tablones', 3], ['rama', 2]] },
  { result: 'pico_hierro', count: 1, needs: [['rama', 2], ['pepita_hierro', 3]] },
  { result: 'hacha_hierro', count: 1, needs: [['rama', 2], ['pepita_hierro', 3]] },
  { result: 'pala_hierro', count: 1, needs: [['rama', 2], ['pepita_hierro', 2]] },
  { result: 'valla_blanca', count: 4, needs: [['tablones', 2], ['concha', 1]] },
  { result: 'mesa', count: 1, needs: [['tablones', 6]] },
  { result: 'cama', count: 1, needs: [['tablones', 6], ['cosmos', 3]] },
  { result: 'estanteria', count: 1, needs: [['tablones', 8]] },
  { result: 'sofa', count: 1, needs: [['tablones', 6], ['tulipan', 3]] },
  { result: 'lampara', count: 1, needs: [['pepita_hierro', 2], ['antorcha', 1]] },
  { result: 'planta', count: 1, needs: [['tierra', 2], ['pensamiento', 1]] },
  { result: 'alfombra', count: 1, needs: [['pensamiento', 3], ['cosmos', 3]] },
  { result: 'barril', count: 1, needs: [['tronco', 3]] },
  { result: 'farol', count: 1, needs: [['pepita_hierro', 1], ['antorcha', 2]] },
  { result: 'ventana', count: 2, needs: [['tablones', 2], ['arena', 2]] },
  { result: 'pared', count: 4, needs: [['piedra', 2], ['arena', 2]] },
];

/** Las que ya se saben al empezar. */
export const STARTER_DIY = ['valla', 'silla', 'banco', 'pico_hierro', 'hacha_hierro', 'pala_hierro'];
