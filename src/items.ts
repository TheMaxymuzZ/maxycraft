import { BLOCKS, Block, CREATURE_TILE_START, STAIRS, Tile, XTile, blockIconTile } from './blocks';
import { CREATURES } from './creatures';
import { FURNITURE, FURNITURE_TILE } from './furniture';
import { TREE_KINDS } from './orchard';
import { FOOD } from './vitals';

export type ToolKind = 'axe' | 'shovel' | 'pickaxe' | 'rod' | 'net' | 'can' | 'bucket';

/** Para qué sirve cada herramienta, en pocas palabras (v3.5): sale debajo del nombre al cogerla. */
export const TOOL_USE: Record<ToolKind, string> = {
  axe: 'Tala árboles y rompe madera',
  shovel: 'Cava tierra, arena y hierba',
  pickaxe: 'Rompe piedra y minerales',
  rod: 'Pesca en el agua',
  net: 'Atrapa bichos',
  can: 'Riega los cultivos',
  bucket: 'Coge agua quieta y échala donde quieras',
};

/** Qué es un objeto (v4.5): sale como etiqueta en su ficha. */
export type ItemKind = 'bloque' | 'recurso' | 'consumible' | 'mueble' | 'herramienta' | 'arma' | 'ropa' | 'criatura' | 'tesoro' | 'especial';
export const ITEM_KINDS: Record<ItemKind, string> = {
  bloque: 'Bloque',
  recurso: 'Recurso',
  consumible: 'Consumible',
  mueble: 'Mueble',
  herramienta: 'Herramienta',
  arma: 'Arma',
  ropa: 'Ropa',
  criatura: 'Criatura',
  tesoro: 'Tesoro',
  especial: 'Especial',
};

/** Lo difícil que es de conseguir (v4.5). */
export type Rarity = 'comun' | 'raro' | 'epico' | 'legendario';
export const RARITIES: Record<Rarity, string> = { comun: 'Común', raro: 'Raro', epico: 'Épico', legendario: 'Legendario' };
export const RARITY_ORDER: Rarity[] = ['comun', 'raro', 'epico', 'legendario'];

export interface ItemDef {
  id: string;
  name: string;
  /** Qué es (v4.5). Si no se dice, se deduce: herramienta, mueble, bloque, criatura, comida o recurso. */
  kind: ItemKind;
  /** Lo raro que es (v4.5). Si no se dice, se deduce de lo que paga la tienda. */
  rarity: Rarity;
  /** Una frase de curiosidad para su ficha. */
  lore?: string;
  /** Daño por golpe (armas). */
  damage?: number;
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
  /** La tienda lo tiene siempre (lo del huerto, la granja y los billetes). */
  always?: boolean;
  /** Solo lo vende ese comercio (v4.17): 'agricola', 'granja' o 'mina'. */
  seller?: string;
  /** Regaderas: casillas de alrededor que riega de una vez (1: 3×3). */
  reach?: number;
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

type NewItem = Omit<ItemDef, 'kind' | 'rarity'> & Partial<Pick<ItemDef, 'kind' | 'rarity'>>;

const CREATURE_IDS = new Set(CREATURES.map((c) => c.id));
/** Objetos que no son ni bloque ni herramienta ni comida: billetes, mapas, planos, animales... */
const SPECIAL = new Set(['billete', 'mapa', 'plano_casa', 'permiso_mudanza', 'botella', 'gallina', 'vaca']);
/** Lo que se encuentra por la playa o dentro de la tierra y se colecciona. */
const TREASURE = new Set(['concha', 'caracola', 'estrella', 'amatista', 'pepita_oro']);
/** Bloques que solo salen en las islas misteriosas. */
const RARE_BLOCKS = new Set<Block>([Block.Magma, Block.SmallMushroom]);
/** Minerales de las islas misteriosas (v4.10): épicos. */
const EPIC_BLOCKS = new Set<Block>([Block.CrystalCluster, Block.Amethyst]);

function kindOf(d: NewItem): ItemKind {
  if (d.tool) return 'herramienta';
  if (d.furniture) return 'mueble';
  if (SPECIAL.has(d.id)) return 'especial';
  if (TREASURE.has(d.id)) return 'tesoro';
  if (CREATURE_IDS.has(d.id)) return 'criatura';
  if (d.id in FOOD) return 'consumible';
  if (d.block !== undefined) return 'bloque';
  return 'recurso';
}

/** Rareza por precio: lo que la tienda paga caro es lo difícil de conseguir. Lo que se vende siempre es común. */
function rarityOf(d: NewItem): Rarity {
  if (d.always) return 'comun';
  if (d.sell >= 3000) return 'legendario';
  if (d.sell >= 1000) return 'epico';
  if (d.sell >= 300) return 'raro';
  return 'comun';
}

function add(item: NewItem) {
  const def: ItemDef = { ...item, kind: item.kind ?? kindOf(item), rarity: item.rarity ?? rarityOf(item) };
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
  // Construcción (v2.3).
  [Block.Brick, 'ladrillo', 20],
  [Block.Cobble, 'adoquin', 15],
  [Block.PolishedStone, 'piedra_pulida', 20],
  [Block.Glass, 'cristal', 20],
  [Block.PalmPlanks, 'tablones_palmera', 10],
  [Block.LightBlock, 'bloque_luz', 80],
  [Block.PlanksSlab, 'losa_madera', 5],
  [Block.CobbleSlab, 'losa_adoquin', 8],
  [Block.BrickSlab, 'losa_ladrillo', 10],
  [Block.PolishedSlab, 'losa_piedra_pulida', 10],
  [Block.PlanksStairs, 'escalera_madera', 10],
  [Block.CobbleStairs, 'escalera_adoquin', 15],
  [Block.BrickStairs, 'escalera_ladrillo', 20],
  // Caminos y calles (v2.8).
  [Block.DirtPath, 'camino_tierra', 4],
  [Block.StonePath, 'camino_losas', 6],
  [Block.Street, 'calle', 6],
  [Block.Tiles, 'baldosas', 8],
  // Obras públicas (v4.13).
  [Block.BridgeDeck, 'tablones_puente', 10],
  [Block.BridgeRail, 'barandilla', 15],
  [Block.BridgePillar, 'pilar', 20],
  [Block.ClockFace, 'reloj', 200],
  // Tienda y terminal (v4.16).
  [Block.Awning, 'toldo', 30],
  // Islas misteriosas (v2.9): lo que solo se encuentra allí.
  [Block.Basalt, 'basalto', 15],
  [Block.Magma, 'roca_magma', 120],
  [Block.CrystalCluster, 'cristal_brillante', 500],
  [Block.Ice, 'hielo', 20],
  [Block.MushroomStem, 'tallo_seta', 15],
  [Block.MushroomCap, 'sombrero_seta', 25],
  [Block.SmallMushroom, 'seta', 150],
  [Block.Amethyst, 'bloque_amatista', 200],
  // Almacenamiento (v2.4).
  [Block.Chest, 'cofre', 60],
  [Block.Trunk, 'baul', 400],
  [Block.Crate, 'caja', 30],
];
for (const [block, id, sell, buy] of PLACEABLE) {
  add({ id, name: BLOCKS[block].name, tile: blockIconTile(block), maxStack: 99, block, sell, buy, rarity: EPIC_BLOCKS.has(block) ? 'epico' : RARE_BLOCKS.has(block) ? 'raro' : undefined });
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
add({ id: 'hacha_hierro', rarity: 'raro', name: 'Hacha de hierro', tile: Tile.IronAxe, maxStack: 1, tool: 'axe', durability: 120, power: 8, sell: 200 });
add({ id: 'pico_hierro', rarity: 'raro', name: 'Pico de hierro', tile: Tile.IronPickaxe, maxStack: 1, tool: 'pickaxe', durability: 120, power: 8, sell: 200 });
add({ id: 'pala_hierro', rarity: 'raro', name: 'Pala de hierro', tile: Tile.IronShovel, maxStack: 1, tool: 'shovel', durability: 120, power: 8, sell: 200 });
// Herramientas de cristal (v4.17): las mejores; solo las vende Grava en la mina.
add({ id: 'hacha_cristal', rarity: 'epico', name: 'Hacha de cristal', tile: XTile.CrystalAxe, maxStack: 1, tool: 'axe', durability: 260, power: 12, sell: 900, buy: 6000, seller: 'mina' });
add({ id: 'pico_cristal', rarity: 'epico', name: 'Pico de cristal', tile: XTile.CrystalPickaxe, maxStack: 1, tool: 'pickaxe', durability: 260, power: 12, sell: 900, buy: 6500, seller: 'mina' });
add({ id: 'pala_cristal', rarity: 'epico', name: 'Pala de cristal', tile: XTile.CrystalShovel, maxStack: 1, tool: 'shovel', durability: 260, power: 12, sell: 900, buy: 6000, seller: 'mina' });
add({ id: 'antorcha', name: 'Antorcha', tile: blockIconTile(Block.Torch), maxStack: 99, block: Block.Torch, sell: 20, buy: 60 });
add({ id: 'carbon', name: 'Carbón', tile: Tile.Coal, maxStack: 30, sell: 50 });
// Cubos (v3.8): el vacío coge un bloque de agua quieta y el lleno lo echa en otro sitio. No se gastan.
add({ id: 'cubo', name: 'Cubo', tile: Tile.Bucket, maxStack: 1, tool: 'bucket', sell: 150, buy: 600 });
add({ id: 'cubo_agua', kind: 'herramienta', name: 'Cubo de agua', tile: Tile.WaterBucket, maxStack: 1, tool: 'bucket', sell: 150 });
add({ id: 'pepita_hierro', name: 'Pepita de hierro', tile: Tile.IronNugget, maxStack: 30, sell: 375 });
add({ id: 'pepita_oro', name: 'Pepita de oro', tile: Tile.GoldNugget, maxStack: 30, sell: 1500 });
add({ id: 'amatista', rarity: 'epico', name: 'Amatista', tile: Tile.Gem, maxStack: 30, sell: 800 });
add({ id: 'muro_piedra', name: 'Muro de piedra', tile: blockIconTile(Block.MuseumWall), maxStack: 99, block: Block.MuseumWall, sell: 30, buy: 100 });

// Huerto y granja (v1.8).
add({ id: 'regadera', name: 'Regadera', tile: Tile.WateringCan, maxStack: 1, tool: 'can', durability: 60, sell: 50, buy: 500 });
add({ id: 'regadera_cobre', rarity: 'raro', name: 'Regadera de cobre', tile: XTile.CopperCan, maxStack: 1, tool: 'can', durability: 150, reach: 1, sell: 400, buy: 3000, seller: 'agricola' });
add({ id: 'abono', name: 'Abono', tile: XTile.Fertilizer, maxStack: 30, sell: 30, buy: 150, seller: 'agricola' });
add({ id: 'semillas_trigo', name: 'Semillas de trigo', tile: Tile.Seeds, maxStack: 30, sell: 10, buy: 40, always: true });
add({ id: 'semillas_zanahoria', name: 'Semillas de zanahoria', tile: Tile.SeedsCarrot, maxStack: 30, sell: 10, buy: 50, always: true });
add({ id: 'semillas_tomate', name: 'Semillas de tomate', tile: Tile.SeedsTomato, maxStack: 30, sell: 10, buy: 60, always: true });
add({ id: 'trigo', name: 'Trigo', tile: Tile.WheatItem, maxStack: 30, sell: 60 });
add({ id: 'zanahoria', name: 'Zanahoria', tile: Tile.CarrotItem, maxStack: 30, sell: 80 });
add({ id: 'tomate', name: 'Tomate', tile: Tile.TomatoItem, maxStack: 30, sell: 90 });
add({ id: 'huevo', name: 'Huevo', tile: Tile.Egg, maxStack: 30, sell: 50 });
add({ id: 'leche', name: 'Leche', tile: Tile.Milk, maxStack: 10, sell: 70 });
add({ id: 'gallina', name: 'Gallina', tile: Tile.ChickenIcon, maxStack: 1, sell: 500, buy: 2000, always: true });
add({ id: 'vaca', name: 'Vaca', tile: Tile.CowIcon, maxStack: 1, sell: 1000, buy: 4000, always: true });
add({ id: 'oveja', name: 'Oveja', tile: XTile.SheepIcon, maxStack: 1, sell: 800, buy: 3200, seller: 'granja' });
add({ id: 'pienso', name: 'Pienso', tile: XTile.Feed, maxStack: 30, sell: 20, buy: 120, seller: 'granja' });
add({ id: 'lana', name: 'Lana', tile: XTile.Wool, maxStack: 30, sell: 220 });
add({ id: 'pan', name: 'Pan', tile: Tile.Bread, maxStack: 10, sell: 300 });
add({ id: 'tortilla', name: 'Tortilla', tile: Tile.Omelette, maxStack: 10, sell: 400 });
add({ id: 'sopa', name: 'Sopa de zanahoria', tile: Tile.Soup, maxStack: 10, sell: 450 });
add({ id: 'pastel', name: 'Pastel', tile: Tile.Cake, maxStack: 10, sell: 900 });

// Puertas y brotes de árbol (v2.2).
add({ id: 'puerta', name: 'Puerta', tile: Tile.DoorIcon, maxStack: 10, block: Block.Door, sell: 60 });
add({ id: 'puerta_valla', name: 'Puerta de valla', tile: Tile.GateIcon, maxStack: 30, block: Block.Gate, sell: 30 });
for (const k of TREE_KINDS) {
  const tile = k.block === Block.PalmSapling ? Tile.PalmSapling : k.block === Block.PineSapling ? Tile.PineSapling : Tile.Sapling;
  add({ id: k.sapling, name: k.name, tile, maxStack: 30, block: k.block, sell: 40 });
}

// Billete para volar a una isla misteriosa (v1.9).
add({ id: 'billete', name: 'Billete de avioneta', tile: Tile.Ticket, maxStack: 10, sell: 150, buy: 1500, always: true });
// Mapa de la isla (v4.4): llevándolo en los bolsillos se ve el minimapa y el mapa grande con la tecla M.
add({ id: 'mapa', name: 'Mapa de la isla', tile: Tile.Map, maxStack: 1, sell: 250, buy: 2500, always: true });
// Con un plano se marca un solar y se construye la casa de un vecino nuevo (v2.10).
add({ id: 'plano_casa', name: 'Plano de casa', tile: Tile.Blueprint, maxStack: 5, sell: 100, buy: 1000, always: true });
// Lo vende Ladrillo, el urbanista (v4.14): sirve para mudar tu parcela entera a otro sitio.
add({ id: 'permiso_mudanza', name: 'Permiso de mudanza', tile: Tile.Blueprint, maxStack: 1, sell: 1000, rarity: 'raro' });

// Peces e insectos: se pueden vender o donar al museo.
// Los fósiles (v4.15) son tesoros, no criaturas.
CREATURES.forEach((c, i) => add({ id: c.id, name: c.name, tile: CREATURE_TILE_START + i, maxStack: 10, sell: c.sell, ...(c.kind === 'fosil' ? { kind: 'tesoro' as const } : {}) }));

// Muebles para decorar la casa.
for (const f of FURNITURE) add({ id: f.id, name: f.name, tile: FURNITURE_TILE(f.id), maxStack: f.stack ?? 1, sell: f.sell, buy: f.buy, furniture: true, holiday: f.holiday, seller: f.seller });

/** Todos los objetos del juego, en el orden en que se definen (para la wiki de la página del proyecto). */
export const ITEMS: readonly ItemDef[] = defs;

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

/** Probabilidad de que unas hojas suelten una rama al romperlas (v4.0). */
export const LEAF_BRANCH_CHANCE = 0.2;

/** Lo que suelta un bloque al romperlo. */
export function dropFor(b: Block): string | null {
  switch (b) {
    case Block.Grass:
    case Block.SnowGrass:
      return 'tierra';
    case Block.TallGrass:
      return null;
    case Block.Leaves:
    case Block.PalmLeaves:
    case Block.PineLeaves:
      return null; // las hojas se deshacen (a veces sueltan una rama: LEAF_BRANCH_CHANCE)
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
    case Block.Farmland:
    case Block.FarmlandWet:
      return 'tierra';
    case Block.Gate:
    case Block.GateOpen:
      return 'puerta_valla';
    case Block.Door:
    case Block.DoorOpen:
      return 'puerta';
    case Block.DoorTop:
    case Block.DoorTopOpen:
    case Block.Sapling:
    case Block.PalmSapling:
    case Block.PineSapling:
      return null; // la puerta sale una sola vez; el brote lo devuelve el huerto de árboles
    case Block.CoalOre:
      return 'carbon';
    case Block.IronOre:
      return 'pepita_hierro';
    case Block.GoldOre:
      return 'pepita_oro';
    case Block.GemOre:
      return 'amatista';
    default: {
      // Las escaleras giradas dan la misma escalera.
      const stairs = STAIRS.find(([first]) => b > first && b < first + 4);
      return byBlock.get(stairs ? stairs[0] : b)?.id ?? null;
    }
  }
}

/** Fruta de árbol (no el coco), que vale más si es de otra isla. */
export function isTreeFruit(id: string): boolean {
  return FRUIT_ITEMS.some(([b, f]) => f === id && b !== Block.Coconut);
}

/** Objeto de fruta que corresponde a un bloque de fruta, o null. */
export function fruitItemFor(b: Block): string | null {
  const found = FRUIT_ITEMS.find(([block]) => block === b);
  return found ? found[1] : null;
}

// --- Romper bloques: dureza y herramienta adecuada ---

interface Hardness {
  /** Segundos con la herramienta normal (la de ramas). A mano, si el bloque pide herramienta, tarda HAND_SLOWNESS veces más. */
  time: number;
  tool?: ToolKind;
  /** Sin la herramienta no se puede romper. */
  needsTool?: boolean;
}

const HARDNESS: Partial<Record<Block, Hardness>> = {
  [Block.Grass]: { time: 0.6, tool: 'shovel' },
  [Block.SnowGrass]: { time: 0.6, tool: 'shovel' },
  [Block.DirtPath]: { time: 0.5, tool: 'shovel' },
  [Block.StonePath]: { time: 0.8, tool: 'pickaxe' },
  [Block.Street]: { time: 0.9, tool: 'pickaxe' },
  [Block.Tiles]: { time: 0.8, tool: 'pickaxe' },
  [Block.Basalt]: { time: 1.6, tool: 'pickaxe', needsTool: true },
  [Block.Magma]: { time: 1.8, tool: 'pickaxe', needsTool: true },
  [Block.Ice]: { time: 0.6, tool: 'pickaxe' },
  [Block.MushroomStem]: { time: 0.8, tool: 'axe' },
  [Block.MushroomCap]: { time: 0.4, tool: 'axe' },
  [Block.Amethyst]: { time: 1.5, tool: 'pickaxe', needsTool: true },
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
  [Block.BridgeDeck]: { time: 1.6, tool: 'axe' },
  [Block.BridgeRail]: { time: 0.8, tool: 'axe' },
  [Block.BridgePillar]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.ClockFace]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.Awning]: { time: 0.6 },
  [Block.Gate]: { time: 0.8, tool: 'axe' },
  [Block.Brick]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.Chest]: { time: 1.2, tool: 'axe' },
  [Block.Trunk]: { time: 1.2, tool: 'axe' },
  [Block.Crate]: { time: 0.8, tool: 'axe' },
  [Block.Cobble]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.PolishedStone]: { time: 1.5, tool: 'pickaxe', needsTool: true },
  [Block.Glass]: { time: 0.4 },
  [Block.PalmPlanks]: { time: 1.6, tool: 'axe' },
  [Block.LightBlock]: { time: 0.5 },
  [Block.PlanksSlab]: { time: 1, tool: 'axe' },
  [Block.CobbleSlab]: { time: 1, tool: 'pickaxe', needsTool: true },
  [Block.BrickSlab]: { time: 1, tool: 'pickaxe', needsTool: true },
  [Block.PolishedSlab]: { time: 1, tool: 'pickaxe', needsTool: true },
  [Block.GateOpen]: { time: 0.8, tool: 'axe' },
  [Block.Door]: { time: 1.2, tool: 'axe' },
  [Block.DoorTop]: { time: 1.2, tool: 'axe' },
  [Block.DoorOpen]: { time: 1.2, tool: 'axe' },
  [Block.DoorTopOpen]: { time: 1.2, tool: 'axe' },
  [Block.Farmland]: { time: 0.5, tool: 'shovel' },
  [Block.FarmlandWet]: { time: 0.5, tool: 'shovel' },
  [Block.Leaves]: { time: 0.25 },
  [Block.PalmLeaves]: { time: 0.25 },
  [Block.PineLeaves]: { time: 0.25 },
};

// Las escaleras se rompen como su material.
for (const [first, , tile] of STAIRS) {
  const like = tile === Tile.Planks ? HARDNESS[Block.PlanksSlab] : HARDNESS[Block.CobbleSlab];
  for (let f = 0; f < 4; f++) HARDNESS[(first + f) as Block] = like;
}

/** Fuerza de las herramientas normales; las de hierro tienen más y rompen antes. */
const BASIC_POWER = 5;
/** Cuántas veces más se tarda a mano en romper un bloque que pide herramienta (tierra, troncos, piedra...). */
export const HAND_SLOWNESS = 5;

export function breakInfo(b: Block, toolItem: ItemDef | null): { seconds: number; allowed: boolean; usesTool: boolean } {
  const h = HARDNESS[b] ?? { time: 0 };
  const usesTool = !!h.tool && h.tool === toolItem?.tool;
  if (h.needsTool && !usesTool) return { seconds: Infinity, allowed: false, usesTool: false };
  // Como en Minecraft: a mano se tarda mucho; con la herramienta de ramas, lo normal; con la de hierro, menos.
  const seconds = usesTool ? (h.time * BASIC_POWER) / (toolItem?.power ?? BASIC_POWER) : h.tool ? h.time * HAND_SLOWNESS : h.time;
  return { seconds, allowed: true, usesTool };
}

export function toolNameFor(b: Block): string | null {
  const h = HARDNESS[b];
  if (!h?.needsTool || !h.tool) return null;
  const names: Record<ToolKind, string> = { axe: 'un hacha', shovel: 'una pala', pickaxe: 'un pico', rod: 'una caña', net: 'una red', can: 'una regadera', bucket: 'un cubo' };
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
  // Como en Minecraft: con dos tablones salen cuatro ramas (v4.0), para no depender solo de sacudir árboles.
  { result: 'rama', count: 4, needs: [['tablones', 2]] },
  { result: 'mesa_trabajo', count: 1, needs: [['tablones', 4]] },
  { result: 'hacha', count: 1, needs: [['rama', 5]] },
  { result: 'pala', count: 1, needs: [['rama', 5]] },
  { result: 'pico', count: 1, needs: [['rama', 6]] },
  { result: 'cana', count: 1, needs: [['rama', 5]] },
  { result: 'red', count: 1, needs: [['rama', 5]] },
  { result: 'antorcha', count: 4, needs: [['rama', 1], ['carbon', 1]] },
  { result: 'cubo', count: 1, needs: [['pepita_hierro', 3]] },
  // Cocina: lo que sale del huerto y la granja vale mucho más cocinado.
  { result: 'pan', count: 1, needs: [['trigo', 3]] },
  { result: 'tortilla', count: 1, needs: [['huevo', 2], ['tomate', 1]] },
  { result: 'sopa', count: 1, needs: [['zanahoria', 2], ['leche', 1]] },
  { result: 'pastel', count: 1, needs: [['trigo', 2], ['huevo', 2], ['leche', 1]] },
  // Brotes para replantar cada tipo de árbol: con su fruta y un poco de tierra (la palmera, en arena).
  { result: 'brote_manzano', count: 1, needs: [['manzana', 2], ['tierra', 1]] },
  { result: 'brote_naranjo', count: 1, needs: [['naranja', 2], ['tierra', 1]] },
  { result: 'brote_peral', count: 1, needs: [['pera', 2], ['tierra', 1]] },
  { result: 'brote_melocotonero', count: 1, needs: [['melocoton', 2], ['tierra', 1]] },
  { result: 'brote_cerezo', count: 1, needs: [['cereza', 2], ['tierra', 1]] },
  { result: 'brote_palmera', count: 1, needs: [['coco', 1], ['arena', 1]] },
  { result: 'brote_pino', count: 1, needs: [['rama', 2], ['tierra', 1]] },
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
  { result: 'puerta', count: 1, needs: [['tablones', 6]] },
  { result: 'puerta_valla', count: 1, needs: [['tablones', 2], ['rama', 2]] },
  // Construcción (v2.3): se saben desde el principio.
  { result: 'ladrillo', count: 4, needs: [['tierra', 3], ['piedra', 1]] },
  { result: 'adoquin', count: 4, needs: [['piedra', 3]] },
  { result: 'piedra_pulida', count: 4, needs: [['piedra', 4]] },
  { result: 'cristal', count: 2, needs: [['arena', 3], ['carbon', 1]] },
  { result: 'tablones_palmera', count: 4, needs: [['tronco_palmera', 1]] },
  { result: 'bloque_luz', count: 1, needs: [['cristal', 1], ['antorcha', 2]] },
  { result: 'losa_madera', count: 6, needs: [['tablones', 3]] },
  { result: 'losa_adoquin', count: 6, needs: [['adoquin', 3]] },
  { result: 'losa_ladrillo', count: 6, needs: [['ladrillo', 3]] },
  { result: 'losa_piedra_pulida', count: 6, needs: [['piedra_pulida', 3]] },
  { result: 'escalera_madera', count: 4, needs: [['tablones', 6]] },
  { result: 'escalera_adoquin', count: 4, needs: [['adoquin', 6]] },
  { result: 'escalera_ladrillo', count: 4, needs: [['ladrillo', 6]] },
  // Almacenamiento (v2.4).
  { result: 'caja', count: 1, needs: [['tablones', 4]] },
  { result: 'cofre', count: 1, needs: [['tablones', 8]] },
  { result: 'baul', count: 1, needs: [['tablones', 8], ['pepita_hierro', 1]] },
  // Calles y decoración (v2.8).
  { result: 'camino_tierra', count: 8, needs: [['tierra', 4]] },
  { result: 'camino_losas', count: 8, needs: [['piedra', 3], ['tierra', 1]] },
  { result: 'calle', count: 8, needs: [['adoquin', 4]] },
  { result: 'baldosas', count: 8, needs: [['ladrillo', 4]] },
  { result: 'farola', count: 1, needs: [['pepita_hierro', 3], ['antorcha', 1]] },
  { result: 'papelera', count: 1, needs: [['pepita_hierro', 1], ['tablones', 1]] },
  { result: 'cartel', count: 1, needs: [['tablones', 2], ['rama', 1]] },
  { result: 'macetero', count: 1, needs: [['ladrillo', 2], ['tierra', 1], ['tulipan', 1]] },
  { result: 'fuente_plaza', count: 1, needs: [['piedra_pulida', 8], ['pepita_hierro', 2]] },
  { result: 'buzon', count: 1, needs: [['pepita_hierro', 2], ['rama', 1]] },
  // Puentes (v4.13), para hacerlos a mano hasta los islotes.
  { result: 'tablones_puente', count: 6, needs: [['tablones', 4], ['rama', 1]] },
  { result: 'barandilla', count: 4, needs: [['tablones', 2], ['rama', 2]] },
  { result: 'pilar', count: 4, needs: [['adoquin', 4]] },
  { result: 'reloj', count: 1, needs: [['pepita_oro', 2], ['cristal', 1], ['ladrillo', 2]] },
];

/** Recetas de construcción que se saben sin aprenderlas. */
const BUILDING_DIY = ['camino_tierra', 'camino_losas', 'calle', 'baldosas', 'farola', 'papelera', 'cartel', 'macetero', 'fuente_plaza', 'buzon', 'caja', 'cofre', 'baul', 'ladrillo', 'adoquin', 'piedra_pulida', 'cristal', 'tablones_palmera', 'bloque_luz', 'losa_madera', 'losa_adoquin', 'losa_ladrillo', 'losa_piedra_pulida', 'escalera_madera', 'escalera_adoquin', 'escalera_ladrillo', 'tablones_puente', 'barandilla', 'pilar', 'reloj'];

/** Las que ya se saben al empezar. */
export const STARTER_DIY = ['valla', 'silla', 'banco', 'pico_hierro', 'hacha_hierro', 'pala_hierro', 'puerta', 'puerta_valla', ...BUILDING_DIY];
