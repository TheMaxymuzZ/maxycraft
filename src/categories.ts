import { Block } from './blocks';
import { cropForSeed } from './farm';
import { type ItemDef, itemDef } from './items';
import { creature } from './creatures';

/** Grupos para ordenar bolsillos y recetas, de modo que con muchos bloques no cueste encontrar nada. */
export type CategoryId = 'construir' | 'naturaleza' | 'herramientas' | 'comida' | 'muebles' | 'criaturas' | 'otros';

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'construir', name: 'Construir' },
  { id: 'naturaleza', name: 'Naturaleza' },
  { id: 'herramientas', name: 'Herramientas' },
  { id: 'comida', name: 'Comida' },
  { id: 'muebles', name: 'Muebles' },
  { id: 'criaturas', name: 'Criaturas' },
  { id: 'otros', name: 'Otros' },
];

const NATURE_BLOCKS: ReadonlySet<number> = new Set([
  Block.Dirt, Block.Sand, Block.Log, Block.Leaves, Block.PalmLog, Block.Bamboo, Block.Sapling, Block.PalmSapling, Block.PineSapling, Block.PineLeaves, Block.SnowGrass,
  Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite, Block.FlowerBlue, Block.FlowerPink,
]);
const NATURE = new Set(['rama', 'concha', 'caracola', 'estrella', 'carbon', 'pepita_hierro', 'pepita_oro', 'amatista', 'huevo', 'leche', 'gallina', 'vaca']);
const FOOD = new Set(['manzana', 'naranja', 'pera', 'melocoton', 'cereza', 'coco', 'trigo', 'zanahoria', 'tomate', 'pan', 'tortilla', 'sopa', 'pastel']);

export function categoryOf(id: string): CategoryId {
  const def: ItemDef = itemDef(id);
  if (def.furniture) return 'muebles';
  if (def.tool) return 'herramientas';
  if (creature(id)) return 'criaturas';
  if (FOOD.has(id)) return 'comida';
  if (cropForSeed(id) || NATURE.has(id)) return 'naturaleza';
  if (def.block !== undefined) return NATURE_BLOCKS.has(def.block) ? 'naturaleza' : 'construir';
  return 'otros';
}

/** Orden para "Ordenar": por grupo y, dentro del grupo, por nombre. */
export function compareItems(a: string, b: string): number {
  const ca = CATEGORIES.findIndex((c) => c.id === categoryOf(a));
  const cb = CATEGORIES.findIndex((c) => c.id === categoryOf(b));
  return ca - cb || itemDef(a).name.localeCompare(itemDef(b).name, 'es');
}

/** Quita acentos y mayúsculas para que "losa" encuentre "Losa" y "adoquin" encuentre "Adoquín". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
