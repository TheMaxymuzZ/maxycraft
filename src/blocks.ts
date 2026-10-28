import { CLOTHES, darker } from './clothes';
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
  Bamboo = 37,
  FlowerBlue = 38,
  FlowerPink = 39,
  Farmland = 40,
  FarmlandWet = 41,
  // Cultivos: cuatro fases cada uno, de brote a listo para cosechar.
  Wheat0 = 42, Wheat1 = 43, Wheat2 = 44, Wheat3 = 45,
  Carrot0 = 46, Carrot1 = 47, Carrot2 = 48, Carrot3 = 49,
  Tomato0 = 50, Tomato1 = 51, Tomato2 = 52, Tomato3 = 53,
  // Puertas de valla y de casa (v2.2): cerradas y abiertas. La puerta de casa ocupa dos bloques.
  Gate = 54, GateOpen = 55,
  Door = 56, DoorTop = 57, DoorOpen = 58, DoorTopOpen = 59,
  // Brotes de árbol para replantar (v2.2).
  Sapling = 60, PalmSapling = 61,
  // Bloques de construcción (v2.3).
  Brick = 62, Cobble = 63, PolishedStone = 64, Glass = 65, PalmPlanks = 66, LightBlock = 67,
  // Losas: medio bloque de alto.
  PlanksSlab = 68, CobbleSlab = 69, BrickSlab = 70, PolishedSlab = 71,
  // Escaleras, una por orientación (hacia dónde queda la parte alta: -z, +x, +z, -x).
  PlanksStairs = 72, PlanksStairs1 = 73, PlanksStairs2 = 74, PlanksStairs3 = 75,
  CobbleStairs = 76, CobbleStairs1 = 77, CobbleStairs2 = 78, CobbleStairs3 = 79,
  BrickStairs = 80, BrickStairs1 = 81, BrickStairs2 = 82, BrickStairs3 = 83,
  // Almacenamiento (v2.4).
  Chest = 84, Trunk = 85, Crate = 86,
  // Biomas (v2.6): pinos de la montaña y nieve en las cumbres.
  PineLeaves = 87, PineSapling = 88, SnowGrass = 89,
  // Caminos y calles (v2.8): sustituyen al suelo, no se ponen encima.
  DirtPath = 90, StonePath = 91, Street = 92, Tiles = 93,
  // Islas misteriosas nuevas (v2.9): volcán, cristales, nieve y setas.
  Basalt = 94, Magma = 95, CrystalCluster = 96, Ice = 97, MushroomStem = 98, MushroomCap = 99, SmallMushroom = 100,
  Amethyst = 101,
  // Agua de verdad (v3.8), como en Minecraft: el bloque de agua quieta (fuente), el agua que corre (niveles 1 a 7,
  // cada vez más baja según se aleja) y el agua que cae.
  Water = 102,
  WaterFlow1 = 103, WaterFlow2 = 104, WaterFlow3 = 105, WaterFlow4 = 106, WaterFlow5 = 107, WaterFlow6 = 108, WaterFlow7 = 109,
  WaterFall = 110,
  // Ayuntamiento y obras públicas (v4.13): tablones de puente, barandilla, pilares y la esfera del reloj.
  BridgeDeck = 111, BridgeRail = 112, BridgePillar = 113, ClockFace = 114,
  // Tienda y terminal (v4.16): toldo de rayas.
  Awning = 115,
  // Climas (v4.19): desierto, sabana, selva, cañón, pantano, cerezos, taiga, tundra y glaciar.
  RedSand = 116, Sandstone = 117, CarvedSandstone = 118, TerracottaOrange = 119, TerracottaYellow = 120, TerracottaWhite = 121,
  Cactus = 122, DryGrass = 123, DryShrub = 124, Mud = 125, PowderSnow = 126, PackedIce = 127, BlueIce = 128, Moss = 129,
  AcaciaLeaves = 130, JungleLeaves = 131, CherryLeaves = 132, WillowLeaves = 133, SnowLeaves = 134,
  Vine = 135, LilyPad = 136, CactusFlower = 137, SnowFlower = 138,
  AcaciaSapling = 139, JungleSapling = 140, CherrySapling = 141, WillowSapling = 142, FirSapling = 143,
  // Lava de verdad (v4.20): fuente, lava que corre (3 niveles) y lava que cae.
  Lava = 144, LavaFlow1 = 145, LavaFlow2 = 146, LavaFlow3 = 147, LavaFall = 148,
  // Biomas extraños (v4.20): volcánico, bioluminiscente y setas gigantes.
  Obsidian = 149, PetrifiedLava = 150, Ash = 151, Blackstone = 152, Slate = 153,
  GlowGrass = 154, GlowFlower = 155, GlowMushroom = 156, GlowLeaves = 157, GlowSapling = 158,
  Mycelium = 159, MushroomCapBlue = 160, MushroomCapPurple = 161,
  BasaltBricks = 162, PolishedSlate = 163, CarvedObsidian = 164, MushroomLamp = 165,
}

export const TILE = 16;
/**
 * El atlas tiene 32x32 casillas de 16x16 píxeles desde la v4.5 (antes 16x16, y ya estaba lleno).
 * Las casillas de antes conservan su número; las nuevas van a partir de EXTRA_TILE_START.
 */
export const ATLAS_TILES = 32;
/** Primera casilla libre para bloques y objetos nuevos (las de antes de 256 no se mueven). */
export const EXTRA_TILE_START = 256;
/** Las casillas de peces e insectos empiezan aquí, una por criatura. */
export const CREATURE_TILE_START = 128;
/** Casillas de los peces, insectos y fósiles: las 48 primeras desde CREATURE_TILE_START y las demás (v4.23) más allá de los extra. */
export const CREATURE_TILE_MORE = EXTRA_TILE_START + 128;
export function creatureTile(index: number): number {
  return index < 48 ? CREATURE_TILE_START + index : CREATURE_TILE_MORE + (index - 48);
}
/** Casillas nuevas desde la v4.13, a partir de EXTRA_TILE_START. */
export const XTile = {
  BridgeDeck: EXTRA_TILE_START,
  BridgeRailIcon: EXTRA_TILE_START + 1,
  BridgePillar: EXTRA_TILE_START + 2,
  BridgePillarTop: EXTRA_TILE_START + 3,
  ClockFace: EXTRA_TILE_START + 4,
  DarkWood: EXTRA_TILE_START + 5,
  Awning: EXTRA_TILE_START + 6,
  AwningTop: EXTRA_TILE_START + 7,
  // Oficios del campo y la mina (v4.17).
  Wool: EXTRA_TILE_START + 8,
  Fertilizer: EXTRA_TILE_START + 9,
  Feed: EXTRA_TILE_START + 10,
  CopperCan: EXTRA_TILE_START + 11,
  CrystalAxe: EXTRA_TILE_START + 12,
  CrystalPickaxe: EXTRA_TILE_START + 13,
  CrystalShovel: EXTRA_TILE_START + 14,
  SheepIcon: EXTRA_TILE_START + 15,
  // Climas (v4.19).
  RedSand: EXTRA_TILE_START + 16,
  Sandstone: EXTRA_TILE_START + 17,
  SandstoneTop: EXTRA_TILE_START + 18,
  CarvedSandstone: EXTRA_TILE_START + 19,
  TerracottaOrange: EXTRA_TILE_START + 20,
  TerracottaYellow: EXTRA_TILE_START + 21,
  TerracottaWhite: EXTRA_TILE_START + 22,
  CactusSide: EXTRA_TILE_START + 23,
  CactusTop: EXTRA_TILE_START + 24,
  DryGrassTop: EXTRA_TILE_START + 25,
  DryGrassSide: EXTRA_TILE_START + 26,
  DryShrub: EXTRA_TILE_START + 27,
  Mud: EXTRA_TILE_START + 28,
  PowderSnow: EXTRA_TILE_START + 29,
  PackedIce: EXTRA_TILE_START + 30,
  BlueIce: EXTRA_TILE_START + 31,
  Moss: EXTRA_TILE_START + 32,
  AcaciaLeaves: EXTRA_TILE_START + 33,
  JungleLeaves: EXTRA_TILE_START + 34,
  CherryLeaves: EXTRA_TILE_START + 35,
  WillowLeaves: EXTRA_TILE_START + 36,
  SnowLeaves: EXTRA_TILE_START + 37,
  Vine: EXTRA_TILE_START + 38,
  LilyPad: EXTRA_TILE_START + 39,
  CactusFlower: EXTRA_TILE_START + 40,
  SnowFlower: EXTRA_TILE_START + 41,
  AcaciaSapling: EXTRA_TILE_START + 42,
  JungleSapling: EXTRA_TILE_START + 43,
  CherrySapling: EXTRA_TILE_START + 44,
  WillowSapling: EXTRA_TILE_START + 45,
  FirSapling: EXTRA_TILE_START + 46,
  // Biomas extraños y lava (v4.20). De la 47 a la 63, y desde la 112 (entre medias está la ropa).
  Lava: EXTRA_TILE_START + 47,
  Obsidian: EXTRA_TILE_START + 48,
  PetrifiedLava: EXTRA_TILE_START + 49,
  Ash: EXTRA_TILE_START + 50,
  Blackstone: EXTRA_TILE_START + 51,
  Slate: EXTRA_TILE_START + 52,
  GlowGrassTop: EXTRA_TILE_START + 53,
  GlowGrassSide: EXTRA_TILE_START + 54,
  GlowFlower: EXTRA_TILE_START + 55,
  GlowMushroom: EXTRA_TILE_START + 56,
  GlowLeaves: EXTRA_TILE_START + 57,
  MyceliumTop: EXTRA_TILE_START + 58,
  MyceliumSide: EXTRA_TILE_START + 59,
  MushroomCapBlue: EXTRA_TILE_START + 60,
  MushroomCapPurple: EXTRA_TILE_START + 61,
  BasaltBricks: EXTRA_TILE_START + 62,
  PolishedSlate: EXTRA_TILE_START + 63,
  CarvedObsidian: EXTRA_TILE_START + 112,
  MushroomLamp: EXTRA_TILE_START + 113,
  LavaBucket: EXTRA_TILE_START + 114,
  GlowSapling: EXTRA_TILE_START + 115,
  // Astillero y muelle (v4.21).
  Bait: EXTRA_TILE_START + 116,
  Compass: EXTRA_TILE_START + 117,
  Spyglass: EXTRA_TILE_START + 118,
  SeaChart: EXTRA_TILE_START + 119,
  // Pesca (v4.23).
  IronRod: EXTRA_TILE_START + 120,
  CrystalRod: EXTRA_TILE_START + 121,
  LegendRod: EXTRA_TILE_START + 122,
  Lure: EXTRA_TILE_START + 123,
  // Armas y botín (v4.24), después de las casillas de las criaturas.
  WoodSword: EXTRA_TILE_START + 160,
  StoneSword: EXTRA_TILE_START + 161,
  IronSword: EXTRA_TILE_START + 162,
  CrystalSword: EXTRA_TILE_START + 163,
  ObsidianSword: EXTRA_TILE_START + 164,
  Bow: EXTRA_TILE_START + 165,
  Arrow: EXTRA_TILE_START + 166,
  Shield: EXTRA_TILE_START + 167,
  IronShield: EXTRA_TILE_START + 168,
  SlimeBall: EXTRA_TILE_START + 169,
  BatWing: EXTRA_TILE_START + 170,
  Bone: EXTRA_TILE_START + 171,
  LavaCore: EXTRA_TILE_START + 172,
  SpiritDust: EXTRA_TILE_START + 173,
  BlackPearl: EXTRA_TILE_START + 174,
  SlimeCrown: EXTRA_TILE_START + 175,
  VolcanoHeart: EXTRA_TILE_START + 176,
  StarTear: EXTRA_TILE_START + 177,
} as const;

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
  Bamboo, FlowerBlue, FlowerPink,
  FarmlandTop, FarmlandWetTop, Sprout, WheatYoung, WheatTall, WheatRipe, CarrotYoung, CarrotTall, CarrotRipe, TomatoYoung, TomatoTall, TomatoRipe,
  Seeds, SeedsCarrot, SeedsTomato, WheatItem, CarrotItem, TomatoItem, WateringCan, Egg, Milk, Bread, Omelette, Soup, Cake, ChickenIcon, CowIcon,
  Ticket,
  DoorLower, DoorUpper, DoorIcon, GateIcon, Sapling, PalmSapling,
  Brick, Cobble, PolishedStone, Glass, PalmPlanks, LightBlock,
  ChestFront, ChestTop, TrunkFront, TrunkTop, CrateSide,
  PineLeaves, PineSapling, SnowTop, SnowSide,
  DirtPathTop, StonePathTop, StreetTop, TilesTop,
  Basalt, Magma, CrystalCluster, Ice, MushroomStem, MushroomCap, SmallMushroom, Amethyst,
  Blueprint,
  // Cubos para coger y echar agua (v3.8).
  Bucket, WaterBucket,
  // Mapa de la isla (v4.4). Es la última casilla libre antes de los peces (CREATURE_TILE_START).
  Map,
}

/**
 * cube: bloque normal. cross: planta dibujada con dos planos en X, sin colisión. fence: poste con travesaños que se unen a sus vecinos.
 * gate: puerta de valla. door: puerta de casa (una tabla fina que se orienta según las paredes de los lados).
 */
export type Shape = 'cube' | 'cross' | 'fence' | 'gate' | 'door' | 'slab' | 'stairs' | 'liquid' | 'pad' | 'lava';

export interface BlockDef {
  name: string;
  /** Casillas para [lados, arriba, abajo]. */
  tiles: [number, number, number];
  transparent: boolean;
  shape: Shape;
  /** Escaleras: lado de la parte alta (0: -z, 1: +x, 2: +z, 3: -x). */
  facing?: number;
}

const cube = (name: string, side: number, top = side, bottom = top, transparent = false): BlockDef => ({
  name, tiles: [side, top, bottom], transparent, shape: 'cube',
});
const fence = (name: string, tile: number): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'fence',
});
const gate = (name: string): BlockDef => ({
  name, tiles: [Tile.Planks, Tile.Planks, Tile.Planks], transparent: true, shape: 'gate',
});
const door = (name: string, tile: Tile): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'door',
});
const slab = (name: string, tile: Tile): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'slab',
});
const stairs = (name: string, tile: Tile, facing: number): BlockDef => ({
  name, tiles: [tile, tile, tile], transparent: true, shape: 'stairs', facing,
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
  [Block.BridgeDeck]: cube('Tablones de puente', XTile.BridgeDeck),
  [Block.BridgeRail]: fence('Barandilla', XTile.DarkWood),
  [Block.BridgePillar]: cube('Pilar de puente', XTile.BridgePillar, XTile.BridgePillarTop),
  [Block.ClockFace]: cube('Reloj', XTile.ClockFace, Tile.Brick, Tile.Brick),
  [Block.Awning]: cube('Toldo de rayas', XTile.Awning, XTile.AwningTop, XTile.AwningTop),
  [Block.Bamboo]: cross('Bambú', Tile.Bamboo),
  [Block.FlowerBlue]: cross('Nomeolvides azul', Tile.FlowerBlue),
  [Block.FlowerPink]: cross('Clavel rosa', Tile.FlowerPink),
  [Block.Farmland]: cube('Tierra de cultivo', Tile.Dirt, Tile.FarmlandTop, Tile.Dirt),
  [Block.FarmlandWet]: cube('Tierra de cultivo regada', Tile.Dirt, Tile.FarmlandWetTop, Tile.Dirt),
  [Block.Wheat0]: cross('Brote de trigo', Tile.Sprout),
  [Block.Wheat1]: cross('Trigo', Tile.WheatYoung),
  [Block.Wheat2]: cross('Trigo', Tile.WheatTall),
  [Block.Wheat3]: cross('Trigo maduro', Tile.WheatRipe),
  [Block.Carrot0]: cross('Brote de zanahoria', Tile.Sprout),
  [Block.Carrot1]: cross('Zanahoria', Tile.CarrotYoung),
  [Block.Carrot2]: cross('Zanahoria', Tile.CarrotTall),
  [Block.Carrot3]: cross('Zanahoria lista', Tile.CarrotRipe),
  [Block.Tomato0]: cross('Brote de tomate', Tile.Sprout),
  [Block.Tomato1]: cross('Tomatera', Tile.TomatoYoung),
  [Block.Tomato2]: cross('Tomatera', Tile.TomatoTall),
  [Block.Tomato3]: cross('Tomatera con tomates', Tile.TomatoRipe),
  [Block.Gate]: gate('Puerta de valla'),
  [Block.GateOpen]: gate('Puerta de valla'),
  [Block.Door]: door('Puerta', Tile.DoorLower),
  [Block.DoorTop]: door('Puerta', Tile.DoorUpper),
  [Block.DoorOpen]: door('Puerta', Tile.DoorLower),
  [Block.DoorTopOpen]: door('Puerta', Tile.DoorUpper),
  [Block.Sapling]: cross('Brote de árbol frutal', Tile.Sapling),
  [Block.PalmSapling]: cross('Brote de palmera', Tile.PalmSapling),
  [Block.Brick]: cube('Ladrillo', Tile.Brick),
  [Block.Cobble]: cube('Adoquín', Tile.Cobble),
  [Block.PolishedStone]: cube('Piedra pulida', Tile.PolishedStone),
  [Block.Glass]: cube('Cristal', Tile.Glass, Tile.Glass, Tile.Glass, true),
  [Block.PalmPlanks]: cube('Tablones de palmera', Tile.PalmPlanks),
  [Block.LightBlock]: cube('Bloque de luz', Tile.LightBlock),
  [Block.PlanksSlab]: slab('Losa de madera', Tile.Planks),
  [Block.CobbleSlab]: slab('Losa de adoquín', Tile.Cobble),
  [Block.BrickSlab]: slab('Losa de ladrillo', Tile.Brick),
  [Block.PolishedSlab]: slab('Losa de piedra pulida', Tile.PolishedStone),
  [Block.Chest]: cube('Cofre', Tile.ChestFront, Tile.ChestTop),
  [Block.Trunk]: cube('Baúl', Tile.TrunkFront, Tile.TrunkTop),
  [Block.Crate]: cube('Caja', Tile.CrateSide),
  [Block.PineLeaves]: cube('Hojas de pino', Tile.PineLeaves, Tile.PineLeaves, Tile.PineLeaves, true),
  [Block.PineSapling]: cross('Brote de pino', Tile.PineSapling),
  [Block.SnowGrass]: cube('Hierba nevada', Tile.SnowSide, Tile.SnowTop, Tile.Dirt),
  [Block.DirtPath]: cube('Camino de tierra', Tile.Dirt, Tile.DirtPathTop, Tile.Dirt),
  [Block.StonePath]: cube('Camino de losas', Tile.Dirt, Tile.StonePathTop, Tile.Dirt),
  [Block.Street]: cube('Calle empedrada', Tile.Cobble, Tile.StreetTop, Tile.Cobble),
  [Block.Tiles]: cube('Baldosas', Tile.Brick, Tile.TilesTop, Tile.Brick),
  [Block.Basalt]: cube('Basalto', Tile.Basalt),
  [Block.Magma]: cube('Roca de magma', Tile.Magma),
  [Block.CrystalCluster]: cross('Cristal brillante', Tile.CrystalCluster),
  [Block.Ice]: cube('Hielo', Tile.Ice),
  [Block.MushroomStem]: cube('Tallo de seta', Tile.MushroomStem),
  [Block.MushroomCap]: cube('Sombrero de seta', Tile.MushroomCap),
  [Block.SmallMushroom]: cross('Seta', Tile.SmallMushroom),
  [Block.Amethyst]: cube('Bloque de amatista', Tile.Amethyst),
  [Block.Water]: { name: 'Agua', tiles: [Tile.WaterBucket, Tile.WaterBucket, Tile.WaterBucket], transparent: true, shape: 'liquid' },
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [Block.WaterFlow1 + i, { name: 'Agua que corre', tiles: [Tile.WaterBucket, Tile.WaterBucket, Tile.WaterBucket], transparent: true, shape: 'liquid' }])),
  [Block.WaterFall]: { name: 'Agua que cae', tiles: [Tile.WaterBucket, Tile.WaterBucket, Tile.WaterBucket], transparent: true, shape: 'liquid' },
  // Climas (v4.19).
  [Block.RedSand]: cube('Arena roja', XTile.RedSand),
  [Block.Sandstone]: cube('Arenisca', XTile.Sandstone, XTile.SandstoneTop),
  [Block.CarvedSandstone]: cube('Arenisca tallada', XTile.CarvedSandstone, XTile.SandstoneTop),
  [Block.TerracottaOrange]: cube('Terracota naranja', XTile.TerracottaOrange),
  [Block.TerracottaYellow]: cube('Terracota amarilla', XTile.TerracottaYellow),
  [Block.TerracottaWhite]: cube('Terracota blanca', XTile.TerracottaWhite),
  [Block.Cactus]: cube('Cactus', XTile.CactusSide, XTile.CactusTop, XTile.CactusTop, true),
  [Block.DryGrass]: cube('Hierba seca', XTile.DryGrassSide, XTile.DryGrassTop, Tile.Dirt),
  [Block.DryShrub]: cross('Arbusto seco', XTile.DryShrub as unknown as Tile),
  [Block.Mud]: cube('Barro', XTile.Mud),
  [Block.PowderSnow]: cube('Nieve en polvo', XTile.PowderSnow),
  [Block.PackedIce]: cube('Hielo compacto', XTile.PackedIce),
  [Block.BlueIce]: cube('Hielo azul', XTile.BlueIce),
  [Block.Moss]: cube('Musgo', XTile.Moss),
  [Block.AcaciaLeaves]: cube('Hojas de acacia', XTile.AcaciaLeaves, XTile.AcaciaLeaves, XTile.AcaciaLeaves, true),
  [Block.JungleLeaves]: cube('Hojas de ceiba', XTile.JungleLeaves, XTile.JungleLeaves, XTile.JungleLeaves, true),
  [Block.CherryLeaves]: cube('Flores de cerezo', XTile.CherryLeaves, XTile.CherryLeaves, XTile.CherryLeaves, true),
  [Block.WillowLeaves]: cube('Hojas de sauce', XTile.WillowLeaves, XTile.WillowLeaves, XTile.WillowLeaves, true),
  [Block.SnowLeaves]: cube('Hojas de abeto nevado', XTile.SnowLeaves, XTile.SnowLeaves, XTile.SnowLeaves, true),
  [Block.Vine]: cross('Liana', XTile.Vine as unknown as Tile),
  [Block.LilyPad]: { name: 'Nenúfar', tiles: [XTile.LilyPad, XTile.LilyPad, XTile.LilyPad], transparent: true, shape: 'pad' },
  [Block.CactusFlower]: cross('Cactus con flor', XTile.CactusFlower as unknown as Tile),
  [Block.SnowFlower]: cross('Flor de nieve', XTile.SnowFlower as unknown as Tile),
  [Block.AcaciaSapling]: cross('Brote de acacia', XTile.AcaciaSapling as unknown as Tile),
  [Block.JungleSapling]: cross('Brote de ceiba', XTile.JungleSapling as unknown as Tile),
  [Block.CherrySapling]: cross('Brote de cerezo en flor', XTile.CherrySapling as unknown as Tile),
  [Block.WillowSapling]: cross('Brote de sauce', XTile.WillowSapling as unknown as Tile),
  [Block.FirSapling]: cross('Brote de abeto', XTile.FirSapling as unknown as Tile),
  // Lava y biomas extraños (v4.20).
  [Block.Lava]: { name: 'Lava', tiles: [XTile.Lava, XTile.Lava, XTile.Lava], transparent: true, shape: 'lava' },
  ...Object.fromEntries(Array.from({ length: 3 }, (_, i) => [Block.LavaFlow1 + i, { name: 'Lava que corre', tiles: [XTile.Lava, XTile.Lava, XTile.Lava], transparent: true, shape: 'lava' }])),
  [Block.LavaFall]: { name: 'Lava que cae', tiles: [XTile.Lava, XTile.Lava, XTile.Lava], transparent: true, shape: 'lava' },
  [Block.Obsidian]: cube('Obsidiana', XTile.Obsidian),
  [Block.PetrifiedLava]: cube('Lava petrificada', XTile.PetrifiedLava),
  [Block.Ash]: cube('Ceniza', XTile.Ash),
  [Block.Blackstone]: cube('Roca negra', XTile.Blackstone),
  [Block.Slate]: cube('Pizarra', XTile.Slate),
  [Block.GlowGrass]: cube('Hierba azul', XTile.GlowGrassSide, XTile.GlowGrassTop, Tile.Dirt),
  [Block.GlowFlower]: cross('Flor luminosa', XTile.GlowFlower as unknown as Tile),
  [Block.GlowMushroom]: cross('Seta luminosa', XTile.GlowMushroom as unknown as Tile),
  [Block.GlowLeaves]: cube('Hojas luminosas', XTile.GlowLeaves, XTile.GlowLeaves, XTile.GlowLeaves, true),
  [Block.GlowSapling]: cross('Brote luminoso', XTile.GlowSapling as unknown as Tile),
  [Block.Mycelium]: cube('Micelio', XTile.MyceliumSide, XTile.MyceliumTop, Tile.Dirt),
  [Block.MushroomCapBlue]: cube('Sombrero de seta azul', XTile.MushroomCapBlue),
  [Block.MushroomCapPurple]: cube('Sombrero de seta morado', XTile.MushroomCapPurple),
  [Block.BasaltBricks]: cube('Ladrillo de basalto', XTile.BasaltBricks),
  [Block.PolishedSlate]: cube('Pizarra pulida', XTile.PolishedSlate),
  [Block.CarvedObsidian]: cube('Obsidiana tallada', XTile.CarvedObsidian),
  [Block.MushroomLamp]: cube('Lámpara de seta', XTile.MushroomLamp),
};
/** Material de cada juego de escaleras: su primer bloque (mirando a -z), nombre y textura. */
export const STAIRS: [Block, string, Tile][] = [
  [Block.PlanksStairs, 'Escalera de madera', Tile.Planks],
  [Block.CobbleStairs, 'Escalera de adoquín', Tile.Cobble],
  [Block.BrickStairs, 'Escalera de ladrillo', Tile.Brick],
];
for (const [first, name, tile] of STAIRS) for (let f = 0; f < 4; f++) BLOCKS[first + f] = stairs(name, tile, f);

/** Escalera girada hacia `facing` (0..3) del mismo material que `b`. */
export function stairsFacing(b: number, facing: number): Block {
  const first = STAIRS.find(([s]) => b >= s && b < s + 4)![0];
  return (first + (((facing % 4) + 4) % 4)) as Block;
}

export function isStairs(b: number): boolean {
  return b !== Block.Air && BLOCKS[b]?.shape === 'stairs';
}

/** Caja de choque dentro del bloque: [x0, y0, z0, x1, y1, z1]. */
export type Box = [number, number, number, number, number, number];
const FULL: Box[] = [[0, 0, 0, 1, 1, 1]];
// Vallas y puertas de valla cerradas: bloque y medio, para que no se puedan saltar.
const TALL: Box[] = [[0, 0, 0, 1, 1.5, 1]];
const HALF: Box[] = [[0, 0, 0, 1, 0.5, 1]];
// Nenúfares (v4.19): una lámina sobre el agua.
const PAD: Box[] = [[0, 0, 0, 1, 0.0625, 1]];
const STAIR_BACK: Box[] = [[0, 0.5, 0, 1, 1, 0.5], [0.5, 0.5, 0, 1, 1, 1], [0, 0.5, 0.5, 1, 1, 1], [0, 0.5, 0, 0.5, 1, 1]];

/** Con qué choca quien anda por el bloque. */
export function collisionBoxes(b: number): Box[] {
  if (!isSolid(b)) return [];
  const def = BLOCKS[b];
  if (isFence(b)) return TALL;
  if (def.shape === 'slab') return HALF;
  if (def.shape === 'pad') return PAD;
  if (def.shape === 'stairs') return [HALF[0], STAIR_BACK[def.facing ?? 0]];
  return FULL;
}

/** Puertas abiertas: se ven, pero se pasa a través. */
const OPEN: ReadonlySet<number> = new Set([Block.GateOpen, Block.DoorOpen, Block.DoorTopOpen]);
/** Cada puerta y su versión abierta o cerrada. */
const TOGGLE: Partial<Record<number, Block>> = {
  [Block.Gate]: Block.GateOpen, [Block.GateOpen]: Block.Gate,
  [Block.Door]: Block.DoorOpen, [Block.DoorOpen]: Block.Door,
  [Block.DoorTop]: Block.DoorTopOpen, [Block.DoorTopOpen]: Block.DoorTop,
};

/** Bloque al abrir o cerrar una puerta, o undefined si no es una puerta. */
export function toggled(b: number): Block | undefined {
  return TOGGLE[b];
}

export function isOpen(b: number): boolean {
  return OPEN.has(b);
}

export function isDoor(b: number): boolean {
  return b === Block.Door || b === Block.DoorTop || b === Block.DoorOpen || b === Block.DoorTopOpen;
}

export function isDoorTop(b: number): boolean {
  return b === Block.DoorTop || b === Block.DoorTopOpen;
}

export function isGate(b: number): boolean {
  return b === Block.Gate || b === Block.GateOpen;
}

/** Plantas que se mueven con el viento. */
export const SWAYING: ReadonlySet<number> = new Set([
  Block.TallGrass, Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite, Block.FlowerBlue, Block.FlowerPink, Block.Bamboo,
  Block.Wheat1, Block.Wheat2, Block.Wheat3, Block.Carrot1, Block.Carrot2, Block.Carrot3, Block.Tomato1, Block.Tomato2, Block.Tomato3,
  Block.DryShrub, Block.Vine, Block.SnowFlower, Block.GlowFlower,
]);

/** Bloques que dan luz y cuánta (nivel de 1 a 15: la luz baja uno por cada bloque que avanza). */
export const LIGHT_RADIUS: Partial<Record<Block, number>> = {
  [Block.Torch]: 13, [Block.LightBlock]: 15, [Block.Magma]: 11, [Block.CrystalCluster]: 8, [Block.Amethyst]: 10,
  // v4.20: la lava alumbra mucho; lo del bosque bioluminiscente, poco y de color.
  [Block.Lava]: 15, [Block.LavaFlow1]: 14, [Block.LavaFlow2]: 13, [Block.LavaFlow3]: 12, [Block.LavaFall]: 14,
  [Block.GlowFlower]: 7, [Block.GlowMushroom]: 8, [Block.GlowLeaves]: 6, [Block.MushroomLamp]: 13,
};
/**
 * Color de la luz de cada bloque (v3.2), en la paleta LIGHT_COLORS: la lava da luz roja, los cristales azul…
 * Lo que no sale aquí (antorchas, farolas, lámparas) da la luz cálida de una llama, la 0.
 */
export const LIGHT_COLORS: readonly [number, number, number][] = [
  [1.15, 0.92, 0.62], // llama
  [1.05, 1.0, 0.9], // bloque de luz: blanca
  [1.35, 0.55, 0.25], // magma: roja
  [0.6, 0.95, 1.25], // cristal: azul
  [0.95, 0.6, 1.3], // amatista: morada
];
export const LIGHT_COLOR: Partial<Record<Block, number>> = {
  [Block.LightBlock]: 1, [Block.Magma]: 2, [Block.CrystalCluster]: 3, [Block.Amethyst]: 4,
  [Block.Lava]: 2, [Block.LavaFlow1]: 2, [Block.LavaFlow2]: 2, [Block.LavaFlow3]: 2, [Block.LavaFall]: 2,
  [Block.GlowFlower]: 3, [Block.GlowMushroom]: 4, [Block.GlowLeaves]: 3, [Block.MushroomLamp]: 4,
};
/** Nivel máximo de luz. */
export const MAX_LIGHT = 15;

/** Caminos y calles: se ponen en lugar del suelo. */
export function isPath(b: number): boolean {
  return b === Block.DirtPath || b === Block.StonePath || b === Block.Street || b === Block.Tiles;
}

/** Suelo que un camino puede sustituir. */
export function isGround(b: number): boolean {
  return b === Block.Grass || b === Block.Dirt || b === Block.Sand || b === Block.SnowGrass || isPath(b);
}

/** Bloques de construcción: dentro de las parcelas de vecinos y tienda no se pueden romper. */
export const HOUSE_BLOCKS: readonly Block[] = [
  Block.Wall, Block.RoofRed, Block.RoofBlue, Block.RoofGreen, Block.RoofYellow, Block.Window, Block.ShopWall, Block.MuseumWall, Block.Planks, Block.Canvas,
];
export const ROOFS = [Block.RoofRed, Block.RoofBlue, Block.RoofGreen, Block.RoofYellow] as const;

export const FRUITS = [Block.Apple, Block.Orange, Block.Pear, Block.Peach, Block.Cherry] as const;

/** Bloquea el paso del jugador. */
/** Si choca con el jugador. */
export function isSolid(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape !== 'cross' && BLOCKS[b].shape !== 'liquid' && BLOCKS[b].shape !== 'lava' && !OPEN.has(b);
}

// --- Agua (v3.8) ---

/** Si es agua, de cualquier tipo. */
export function isWater(b: number): boolean {
  return b >= Block.Water && b <= Block.WaterFall;
}

/** Agua quieta que no se acaba nunca (la del mar, la del río o la que vacías con un cubo). */
export function isWaterSource(b: number): boolean {
  return b === Block.Water;
}

/**
 * Nivel del agua, como en Minecraft: 0 la fuente (y el agua que cae, que empuja como una fuente),
 * de 1 a 7 el agua que corre, cada vez más baja. -1 si no es agua.
 */
export function waterLevel(b: number): number {
  if (b === Block.Water || b === Block.WaterFall) return 0;
  if (b >= Block.WaterFlow1 && b <= Block.WaterFlow7) return b - Block.Water;
  return -1;
}

/** Bloque de agua que corre con ese nivel (1 a 7). */
export function flowingWater(level: number): Block {
  return (Block.Water + level) as Block;
}

/** Altura de la superficie dentro del bloque (0 a 1) si no tiene más agua encima. */
export const WATER_TOP = 0.85;
export function waterHeight(b: number): number {
  if (b === Block.WaterFall || b === Block.Water) return WATER_TOP;
  const level = waterLevel(b);
  return level < 0 ? 0 : (WATER_TOP * (8 - level)) / 8;
}

/** Barrera de bloque y medio que no se puede saltar: vallas y puertas de valla cerradas. */
export function isFence(b: number): boolean {
  return b !== Block.Air && (BLOCKS[b].shape === 'fence' || b === Block.Gate);
}

/** Corta el paso a vecinos y animales: no se suben encima ni la cruzan. */
export function isBarrier(b: number): boolean {
  return isFence(b) || b === Block.Door || b === Block.DoorTop;
}

/** Bloque entero (no planta ni valla): da sombra en las esquinas y sostiene lo que se pone encima. */
export function isFullBlock(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cube';
}

/** Se puede apuntar y romper. */
export function isTargetable(b: number): boolean {
  return b !== Block.Air && !isWater(b) && !isLava(b);
}

// --- Lava (v4.20) ---
// Como el agua, pero más lenta y llega menos lejos: la que corre baja de 1 a 3 y se para.

/** Si es lava, de cualquier tipo. */
export function isLava(b: number): boolean {
  return b >= Block.Lava && b <= Block.LavaFall;
}

export function isLavaSource(b: number): boolean {
  return b === Block.Lava;
}

/** Nivel de la lava: 0 la fuente y la que cae, de 1 a 3 la que corre; -1 si no es lava. */
export function lavaLevel(b: number): number {
  if (b === Block.Lava || b === Block.LavaFall) return 0;
  if (b >= Block.LavaFlow1 && b <= Block.LavaFlow3) return b - Block.Lava;
  return -1;
}

export function flowingLava(level: number): Block {
  return (Block.Lava + level) as Block;
}

/** Altura de la lava dentro del bloque (0 a 1). */
export function lavaHeight(b: number): number {
  const level = lavaLevel(b);
  if (level < 0) return 0;
  return b === Block.LavaFall ? 1 : (0.9 * (4 - level)) / 4;
}

/** Lo que arde si la lava lo toca: plantas, hojas y madera. La hierba se queda en tierra. */
export function burnt(b: number): Block | null {
  if (b === Block.Grass || b === Block.DryGrass || b === Block.GlowGrass || b === Block.Mycelium || b === Block.Moss) return Block.Dirt;
  if (b === Block.Air || isWater(b) || isLava(b)) return null;
  const def = BLOCKS[b];
  if (!def) return null;
  if (def.shape === 'cross' || isLeaves(b) || b === Block.Log || b === Block.PalmLog || b === Block.Planks || b === Block.Vine || b === Block.Bamboo) return Block.Air;
  return null;
}

// --- Registro de bloques (v4.5) ---
// Cada bloque tiene un número (lo que se guarda en el mundo) y un nombre fijo (el del código, como "Basalt").
// Para añadir uno nuevo: una entrada en el enum Block y otra en BLOCKS; si necesita dibujo propio, una casilla
// a partir de EXTRA_TILE_START.

/** Si existe un bloque con ese número (lo que llega de la red o de una copia puede no existir). */
export function isKnownBlock(b: number): b is Block {
  return b === Block.Air || (Number.isInteger(b) && BLOCKS[b] !== undefined);
}

/** Nombre fijo de un bloque, que no cambia aunque se reordenen los números. */
export function blockKey(b: Block): string {
  return Block[b];
}

/** El bloque con ese nombre fijo, o undefined. */
export function blockByKey(key: string): Block | undefined {
  const b = (Block as unknown as Record<string, number>)[key];
  return typeof b === 'number' && isKnownBlock(b) ? b : undefined;
}

/** Todos los bloques registrados (sin el aire), por número. */
export function allBlocks(): Block[] {
  return Object.keys(BLOCKS).map(Number).filter((b) => b !== Block.Air && isKnownBlock(b));
}

export function isOpaque(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cube' && !BLOCKS[b].transparent;
}

/** Hojas de todos los árboles (las de antes y las de los climas de la v4.19). */
export const LEAF_BLOCKS: ReadonlySet<number> = new Set([
  Block.Leaves, Block.PalmLeaves, Block.PineLeaves, Block.AcaciaLeaves, Block.JungleLeaves, Block.CherryLeaves, Block.WillowLeaves, Block.SnowLeaves,
  Block.GlowLeaves,
]);

export function isLeaves(b: number): boolean {
  return LEAF_BLOCKS.has(b);
}

export function isCross(b: number): boolean {
  return b !== Block.Air && BLOCKS[b].shape === 'cross';
}

// --- Texturas pixel art generadas en un canvas (sin archivos externos) ---

/** Texturas de los climas (v4.19): arenas, arenisca, terracota, cactus, hielo, hojas nuevas y plantas. */
function paintClimateTiles(ctx: CanvasRenderingContext2D) {
  const RED_SAND: RGB[] = [[204, 112, 60], [192, 100, 52], [214, 124, 70], [184, 96, 50]];
  const SANDSTONE: RGB[] = [[226, 206, 150], [216, 196, 140], [234, 214, 160]];
  paintTile(ctx, XTile.RedSand, (_x, _y, r) => pick(r, RED_SAND));
  paintTile(ctx, XTile.Sandstone, (_x, y, r) => (y % 5 === 4 ? [196, 176, 120] : pick(r, SANDSTONE)));
  paintTile(ctx, XTile.SandstoneTop, (x, y, r) => (x === 0 || y === 0 ? [206, 186, 130] : pick(r, SANDSTONE)));
  paintTile(ctx, XTile.CarvedSandstone, (x, y, r) => {
    if (y < 2 || y > 13) return [204, 184, 128];
    const motif = (Math.abs(x - 7.5) + Math.abs(y - 7.5)) | 0;
    return motif === 4 || motif === 1 ? [176, 150, 96] : pick(r, SANDSTONE);
  });
  const terra = (tile: number, base: RGB) => paintTile(ctx, tile, (_x, y, r) => {
    const k = y % 6 === 0 ? 0.88 : 1 + (r() - 0.5) * 0.06;
    return [Math.round(base[0] * k), Math.round(base[1] * k), Math.round(base[2] * k)];
  });
  terra(XTile.TerracottaOrange, [192, 104, 56]);
  terra(XTile.TerracottaYellow, [210, 160, 70]);
  terra(XTile.TerracottaWhite, [224, 200, 180]);
  const CACTUS: RGB[] = [[76, 150, 64], [66, 136, 56], [86, 160, 72]];
  paintTile(ctx, XTile.CactusSide, (x, y, r) => (x % 4 === 0 ? [50, 112, 44] : (x + y * 3) % 9 === 0 ? [236, 230, 190] : pick(r, CACTUS)));
  paintTile(ctx, XTile.CactusTop, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15 ? [50, 112, 44] : pick(r, CACTUS)));
  const DRY: RGB[] = [[196, 176, 92], [184, 164, 84], [206, 186, 100], [176, 156, 78]];
  paintTile(ctx, XTile.DryGrassTop, (_x, _y, r) => pick(r, DRY));
  paintTile(ctx, XTile.DryGrassSide, (_x, y, r) => (y < 3 + Math.floor(r() * 2) ? pick(r, DRY) : pick(r, DIRT)));
  paintSprite(ctx, XTile.DryShrub, [
    '................', '................', '.......d........', '..d....d...d....', '...d...d..d.....', '....d..d.d...d..', '.d...d.dd...d...',
    '..d...ddd.dd....', '...dd..d.d......', '.....d.dd.......', '......ddd.......', '.......d........', '.......d........', '.......d........', '................', '................',
  ], { d: [150, 112, 60] });
  paintTile(ctx, XTile.Mud, (x, y, r) => ((x * 5 + y * 3) % 13 === 0 ? [92, 70, 52] : pick(r, [[112, 86, 64], [104, 80, 60], [120, 92, 68]])));
  paintTile(ctx, XTile.PowderSnow, (_x, _y, r) => pick(r, [[250, 252, 255], [244, 248, 255], [238, 244, 252]]));
  paintTile(ctx, XTile.PackedIce, (x, y, r) => ((x + y * 2) % 9 === 0 ? [200, 220, 246] : pick(r, [[150, 186, 232], [160, 194, 236], [142, 178, 226]])));
  paintTile(ctx, XTile.BlueIce, (x, y, r) => ((x * 2 + y) % 7 === 0 ? [180, 210, 250] : pick(r, [[100, 150, 224], [110, 160, 230], [92, 140, 216]])));
  paintTile(ctx, XTile.Moss, (_x, _y, r) => pick(r, [[90, 130, 60], [80, 120, 54], [100, 142, 66], [72, 110, 48]]));
  const leaves = (tile: number, palette: RGB[], holes = 6) => paintTile(ctx, tile, (x, y, r) => ((x * 3 + y * 5) % holes === 0 && r() < 0.5 ? null : pick(r, palette)));
  leaves(XTile.AcaciaLeaves, [[120, 156, 48], [108, 144, 40], [132, 168, 58]]);
  leaves(XTile.JungleLeaves, [[44, 140, 52], [36, 124, 44], [56, 154, 62], [30, 110, 40]], 9);
  leaves(XTile.CherryLeaves, [[246, 178, 206], [238, 160, 194], [252, 204, 224], [230, 146, 184]]);
  leaves(XTile.WillowLeaves, [[100, 150, 70], [90, 138, 62], [112, 162, 80]], 4);
  paintTile(ctx, XTile.SnowLeaves, (x, y, r) => ((x + y * 3) % 7 === 0 && r() < 0.5 ? null : y % 3 === 0 ? pick(r, SNOW) : pick(r, PINE_LEAF)));
  paintSprite(ctx, XTile.Vine, Array.from({ length: 16 }, (_, y) => ['...v......v.....', '...vl.....v.....', '..lv......vl....', '...v.....lv.....'][y % 4]), { v: [52, 120, 50], l: [84, 160, 70] });
  paintSprite(ctx, XTile.LilyPad, [
    '................', '....gggggg......', '..gggggggggg....', '.gggggggggggg...', '.ggggggGgggggg..', 'gggggggGggg.....', 'ggggggggGg......', 'gggggggg........',
    'ggggggggggggg...', 'gggggggpgggggg..', '.gggggpPpggggg..', '.ggggggpgggggg..', '..gggggggggggg..', '....gggggggg....', '................', '................',
  ], { g: [70, 140, 56], G: [52, 112, 44], p: [244, 170, 200], P: [252, 220, 120] });
  paintSprite(ctx, XTile.CactusFlower, [
    '......pPp.......', '.......p........', '.....ccccc......', '.....cccccc.....', '..cc.ccccc.cc...', '..cc.cccccc.cc..', '..cccccccc.cc...', '...cccccccccc...',
    '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '.....cccccc.....', '................',
  ], { c: [76, 150, 64], p: [236, 90, 140], P: [252, 220, 120] });
  paintSprite(ctx, XTile.SnowFlower, [
    '................', '................', '......w.w.......', '.......w........', '.....wwBww......', '.......w........', '......w.w.......', '.......s........',
    '.......s..ww....', '...ww..s.wBw....', '..wBw..s..ww....', '...ww..s.s......', '.....s.ss.......', '......ss........', '.......s........', '................',
  ], { w: [244, 248, 255], B: [140, 190, 240], s: [70, 120, 90] });
  const sapling = (tile: number, leaf: RGB, trunk: RGB) => paintSprite(ctx, tile, [
    '................', '................', '................', '......ll........', '.....llll.......', '....llllll......', '...llllllll.....', '....llttll......',
    '......tt........', '......tt..ll....', '...ll.tt.lll....', '..lll.tt.ll.....', '...ll.tt........', '......tt........', '.....tttt.......', '................',
  ], { l: leaf, t: trunk });
  sapling(XTile.AcaciaSapling, [120, 156, 48], [150, 110, 70]);
  sapling(XTile.JungleSapling, [44, 140, 52], [120, 90, 56]);
  sapling(XTile.CherrySapling, [246, 178, 206], [110, 72, 60]);
  sapling(XTile.WillowSapling, [100, 150, 70], [116, 90, 60]);
  sapling(XTile.FirSapling, [46, 112, 74], [102, 72, 44]);
  sapling(XTile.GlowSapling, [90, 200, 240], [70, 60, 110]);
  paintStrangeTiles(ctx);
  paintSeaTiles(ctx);
  paintCombatTiles(ctx);
}

const SWORD = [
  '................', '.............hH.', '............hHh.', '...........hHh..', '..........hHh...', '.........hHh....', '........hHh.....', '...gg..hHh......',
  '....gghHh.......', '.....ggh........', '.....sgg........', '....s..gg.......', '...s............', '..ss............', '................', '................',
];
const GEM: (c: RGB, d: RGB, h: RGB) => [string[], Record<string, RGB>] = (c, d, h) => [[
  '................', '................', '................', '.....dddddd.....', '....dcchcccd....', '...dcchhccccd...', '...dccccccccd...', '...dccccccccd...',
  '...dccccccccd...', '....dccccccd....', '.....dccccd.....', '......dccd......', '.......dd.......', '................', '................', '................',
], { c, d, h }];

/** Espadas, arco, flechas, escudos y lo que sueltan las criaturas (v4.24). */
function paintCombatTiles(ctx: CanvasRenderingContext2D) {
  const sword = (tile: number, h: RGB, H: RGB) => toolSprite(ctx, tile, SWORD, { h, H, g: [120, 90, 50], s: [150, 108, 62] });
  sword(XTile.WoodSword, [170, 124, 72], [210, 168, 110]);
  sword(XTile.StoneSword, [140, 140, 136], [196, 196, 190]);
  sword(XTile.IronSword, [200, 206, 218], [252, 252, 255]);
  sword(XTile.CrystalSword, [150, 120, 230], [226, 210, 255]);
  sword(XTile.ObsidianSword, [50, 34, 80], [140, 100, 200]);
  toolSprite(ctx, XTile.Bow, [
    '................', '.........ss.....', '........s..l....', '.......s...l....', '......s....l....', '.....s.....l....', '.....s.....l....', '....s......l....',
    '....s......l....', '.....s.....l....', '.....s.....l....', '......s....l....', '.......s...l....', '........s..l....', '.........ss.....', '................',
  ], { s: [150, 100, 56], l: [236, 236, 236] });
  toolSprite(ctx, XTile.Arrow, [
    '................', '............kk..', '...........kkk..', '..........ks....', '.........s......', '........s.......', '.......s........', '......s.........',
    '.....s..........', '....s...........', '..fs............', '.ff.............', '.f..............', '................', '................', '................',
  ], { k: [150, 150, 150], s: [150, 108, 62], f: [240, 240, 240] });
  const shield = (tile: number, a: RGB, b: RGB, m: RGB) => toolSprite(ctx, tile, [
    '................', '...mmmmmmmmmm...', '...maaaabbbbm...', '...maaaabbbbm...', '...maaaabbbbm...', '...maaaabbbbm...', '...mmmmmmmmmm...', '...mbbbbaaaam...',
    '...mbbbbaaaam...', '....mbbbaaam....', '....mbbbaaam....', '.....mbbaam.....', '......mmmm......', '................', '................', '................',
  ], { a, b, m });
  shield(XTile.Shield, [170, 124, 72], [140, 98, 56], [120, 120, 126]);
  shield(XTile.IronShield, [210, 214, 224], [170, 176, 190], [100, 104, 114]);
  paintSprite(ctx, XTile.SlimeBall, ...GEM([110, 200, 90], [60, 130, 50], [200, 255, 180]));
  paintSprite(ctx, XTile.BatWing, [
    '................', '................', '.k..............', '.kk.......k.....', '.kkk.....kk.....', '.kkkk...kkk.....', '.kkkkkkkkkk.....', '.kkkkkkkkkkk....',
    '..kkkkkkkkkkk...', '...kk.kk.kkkk...', '..........kkk...', '...........kk...', '................', '................', '................', '................',
  ], { k: [70, 56, 70] });
  toolSprite(ctx, XTile.Bone, [
    '................', '.............ww.', '............wwww', '...........wwww.', '..........ww....', '.........ww.....', '........ww......', '.......ww.......',
    '......ww........', '.....ww.........', '....ww..........', '.wwww...........', 'wwww............', '.ww.............', '................', '................',
  ], { w: [236, 230, 210] });
  paintSprite(ctx, XTile.LavaCore, ...GEM([250, 120, 30], [140, 40, 20], [255, 230, 120]));
  paintSprite(ctx, XTile.SpiritDust, ...GEM([150, 240, 255], [70, 140, 200], [255, 255, 255]));
  paintSprite(ctx, XTile.BlackPearl, ...GEM([50, 44, 60], [20, 16, 26], [180, 170, 200]));
  paintSprite(ctx, XTile.SlimeCrown, [
    '................', '................', '................', '...g...g...g....', '...gg.ggg.gg....', '...ggggggggg....', '...gyggrggyg....', '...ggggggggg....',
    '...ggggggggg....', '................', '................', '................', '................', '................', '................', '................',
  ], { g: [110, 210, 90], y: [250, 220, 60], r: [230, 60, 80] });
  paintSprite(ctx, XTile.VolcanoHeart, ...GEM([220, 40, 40], [120, 20, 20], [255, 170, 80]));
  paintSprite(ctx, XTile.StarTear, ...GEM([255, 240, 150], [200, 160, 40], [255, 255, 255]));
}

/** Lo que vende Brújula en el muelle (v4.21). */
function paintSeaTiles(ctx: CanvasRenderingContext2D) {
  paintSprite(ctx, XTile.Bait, [
    '................', '................', '................', '.....bbbbbb.....', '....bwwwwwwb....', '...bwppwwppwb...', '...bwwppppwwb...', '...bwwwppwwwb...',
    '...bbbbbbbbbb...', '....bBBBBBBb....', '....bBBBBBBb....', '.....bBBBBb.....', '.....bbbbbb.....', '................', '................', '................',
  ], { b: [110, 80, 52], B: [160, 120, 80], w: [120, 86, 60], p: [232, 130, 150] });
  toolSprite(ctx, XTile.Compass, [
    '................', '.....gggggg.....', '....gwwwwwwg....', '...gwwwrwwwwg...', '..gwwwwrrwwwwg..', '..gwwwwrrwwwwg..', '..gwwwwrrwwwwg..', '..gwwwwkkwwwwg..',
    '..gwwwwbbwwwwg..', '..gwwwwbbwwwwg..', '..gwwwwbbwwwwg..', '...gwwwwbwwwg...', '....gwwwwwwg....', '.....gggggg.....', '................', '................',
  ], { g: [200, 160, 60], w: [240, 236, 220], r: [220, 50, 50], b: [60, 80, 140], k: [40, 40, 40] });
  toolSprite(ctx, XTile.Spyglass, [
    '................', '................', '.............gg.', '............gGGg', '...........gGGGg', '..........bbGGg.', '.........bBBbg..', '........bBBb....',
    '.......bBBb.....', '......kKKk......', '.....kKKk.......', '....kKKk........', '...kKKk.........', '...kkk..........', '................', '................',
  ], { g: [200, 160, 60], G: [236, 200, 100], b: [120, 80, 50], B: [160, 110, 70], k: [60, 50, 50], K: [100, 90, 90] });
  paintSprite(ctx, XTile.SeaChart, [
    '................', '..pppppppppppp..', '..pbbbbbbbbbbp..', '..pbbbbsssbbbp..', '..pbbbsgggsbbp..', '..pbbsggggsbbp..', '..pbbsgggsbbbp..', '..pbbbsssbbrbp..',
    '..pbbbbbbbrrbp..', '..pbsbbbbbbbbp..', '..psgsbbbbbbbp..', '..pbsbbbbbbbbp..', '..pbbbbbbbbbbp..', '..pppppppppppp..', '................', '................',
  ], { p: [220, 196, 150], b: [120, 176, 220], s: [236, 214, 160], g: [96, 160, 80], r: [210, 60, 60] });
  // Cañas mejores y señuelo (v4.23).
  toolSprite(ctx, XTile.IronRod, ROD, { s: [208, 214, 224], S: [140, 148, 166], g: [86, 58, 38], l: [236, 236, 240], r: [222, 52, 52], w: [250, 250, 250] });
  toolSprite(ctx, XTile.CrystalRod, ROD, { s: [190, 170, 250], S: [110, 84, 190], g: [70, 60, 110], l: [236, 236, 240], r: [120, 220, 255], w: [250, 250, 250] });
  toolSprite(ctx, XTile.LegendRod, ROD, { s: [250, 210, 90], S: [190, 140, 40], g: [120, 40, 40], l: [255, 250, 220], r: [255, 90, 200], w: [255, 255, 255] });
  toolSprite(ctx, XTile.Lure, [
    '................', '.......kk.......', '.......k........', '......yyyy......', '.....yyyyyy.....', '....yyrryyyy....', '....yyrryyyyg...', '....yyyyyyyygg..',
    '.....oooooo.gg..', '......oooo......', '.......kk.......', '......k..k......', '.......kk.......', '................', '................', '................',
  ], { k: [150, 150, 160], y: [250, 210, 60], r: [30, 30, 30], o: [240, 120, 40], g: [90, 200, 90] });
}

/** Dibujos de la lava y de los biomas extraños (v4.20). */
function paintStrangeTiles(ctx: CanvasRenderingContext2D) {
  paintTile(ctx, XTile.Lava, (x, y, r) => {
    const swirl = Math.sin(x * 0.9 + y * 0.4) + Math.cos(y * 0.8 - x * 0.3);
    return swirl > 1.2 ? pick(r, [[255, 236, 120], [255, 220, 96]]) : swirl > 0 ? pick(r, [[255, 150, 30], [250, 130, 24]]) : pick(r, [[226, 88, 20], [214, 76, 18]]);
  });
  paintTile(ctx, XTile.Obsidian, (x, y, r) => ((x * 3 + y * 5) % 17 === 0 ? [96, 60, 140] : pick(r, [[26, 18, 40], [34, 24, 52], [20, 14, 32]])));
  paintTile(ctx, XTile.PetrifiedLava, (x, y, r) => ((x + y * 2) % 11 === 0 ? [120, 70, 50] : pick(r, [[78, 70, 70], [88, 78, 76], [68, 62, 62]])));
  paintTile(ctx, XTile.Ash, (_x, _y, r) => pick(r, [[120, 118, 116], [132, 130, 128], [110, 108, 106], [140, 136, 132]]));
  paintTile(ctx, XTile.Blackstone, (x, y, r) => ((x * 7 + y * 3) % 13 === 0 ? [60, 56, 64] : pick(r, [[36, 34, 40], [44, 42, 48], [30, 28, 34]])));
  paintTile(ctx, XTile.Slate, (_x, y, r) => (y % 4 === 3 ? [70, 76, 86] : pick(r, [[96, 102, 112], [104, 110, 120], [88, 94, 104]])));
  const GLOW: RGB[] = [[60, 120, 210], [52, 108, 196], [72, 136, 224], [46, 98, 184]];
  paintTile(ctx, XTile.GlowGrassTop, (x, y, r) => ((x * 5 + y * 7) % 23 === 0 ? [150, 240, 255] : pick(r, GLOW)));
  paintTile(ctx, XTile.GlowGrassSide, (_x, y, r) => (y < 3 + Math.floor(r() * 2) ? pick(r, GLOW) : pick(r, DIRT)));
  paintSprite(ctx, XTile.GlowFlower, [
    '................', '......c.c.......', '.....cCcCc......', '......cWc.......', '.....cCcCc......', '......c.c.......', '.......s........', '...c...s........',
    '..cWc..s..c.....', '...c...s.cWc....', '....s..s..c.....', '.....s.s.s......', '......sss.......', '.......s........', '.......s........', '................',
  ], { c: [120, 220, 255], C: [190, 250, 255], W: [255, 255, 255], s: [60, 140, 150] });
  paintSprite(ctx, XTile.GlowMushroom, [
    ...Array(5).fill('................'),
    '.....pppppp.....', '....ppWppppp....', '...ppppppWppp...', '...pWpppppppp...', '......ssss......', '......ssss......',
    '......ssss......', '.....ssssss.....', '................', '................', '................',
  ], { p: [186, 110, 250], W: [240, 220, 255], s: [200, 230, 240] });
  paintTile(ctx, XTile.GlowLeaves, (x, y, r) => ((x * 3 + y * 5) % 6 === 0 && r() < 0.5 ? null : (x + y * 3) % 11 === 0 ? [200, 250, 255] : pick(r, [[70, 150, 220], [60, 130, 200], [90, 170, 230], [110, 90, 210]])));
  const MYC: RGB[] = [[134, 110, 140], [124, 100, 132], [146, 120, 150], [116, 94, 124]];
  paintTile(ctx, XTile.MyceliumTop, (x, y, r) => ((x * 3 + y * 7) % 19 === 0 ? [210, 200, 214] : pick(r, MYC)));
  paintTile(ctx, XTile.MyceliumSide, (_x, y, r) => (y < 3 + Math.floor(r() * 2) ? pick(r, MYC) : pick(r, DIRT)));
  const cap = (tile: number, palette: RGB[], dot: RGB) => paintTile(ctx, tile, (x, y, r) =>
    [[3, 3], [11, 4], [7, 9], [2, 12], [12, 12]].some(([dx, dy]) => Math.abs(x - dx) + Math.abs(y - dy) <= 1) ? dot : pick(r, palette));
  cap(XTile.MushroomCapBlue, [[60, 110, 214], [52, 100, 200], [70, 124, 226]], [200, 230, 255]);
  cap(XTile.MushroomCapPurple, [[146, 70, 196], [134, 60, 184], [160, 84, 208]], [240, 210, 255]);
  paintTile(ctx, XTile.BasaltBricks, (x, y, r) => (y % 8 === 7 || (x + (y < 8 ? 0 : 8)) % 16 === 15 ? [50, 50, 58] : pick(r, [[96, 96, 106], [104, 104, 114], [90, 90, 100]])));
  paintTile(ctx, XTile.PolishedSlate, (x, y, r) => (x === 0 || y === 0 ? [130, 136, 146] : x === 15 || y === 15 ? [70, 76, 86] : pick(r, [[104, 110, 120], [108, 114, 124]])));
  paintTile(ctx, XTile.CarvedObsidian, (x, y, r) => {
    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) | 0;
    return ring === 6 || ring === 3 ? [130, 80, 190] : pick(r, [[26, 18, 40], [34, 24, 52]]);
  });
  paintTile(ctx, XTile.MushroomLamp, (x, y, r) => {
    const frame = x < 2 || x > 13 || y < 2 || y > 13;
    return frame ? pick(r, [[236, 230, 214], [226, 220, 204]]) : (x + y) % 5 === 0 ? [255, 250, 210] : pick(r, [[250, 200, 120], [255, 214, 140], [244, 190, 110]]);
  });
  paintSprite(ctx, XTile.LavaBucket, [
    '................', '................', '................', '...gggggggggg...', '..gllllllllllg..', '..gLLlLLlLLLlg..', '..gllllllllllg..', '...gGGGGGGGGg...',
    '...gGGGGGGGGg...', '....gGGGGGGg....', '....gGGGGGGg....', '.....gGGGGg.....', '.....gggggg.....', '................', '................', '................',
  ], { g: [120, 120, 130], G: [176, 176, 186], l: [250, 120, 24], L: [255, 220, 90] });
}

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

const OUTLINE: RGB = [40, 32, 30];

/** Como paintSprite, pero con un contorno oscuro de 1 píxel alrededor: así las herramientas se leen sobre cualquier fondo. */
function toolSprite(ctx: CanvasRenderingContext2D, tile: number, rows: string[], colors: Record<string, RGB>) {
  const filled = (x: number, y: number) => (rows[y]?.[x] ?? '.') !== '.';
  paintTile(ctx, tile, (x, y) => {
    if (filled(x, y)) return colors[rows[y][x]];
    return filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1) ? OUTLINE : null;
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
const PINE_LEAF: RGB[] = [[46, 112, 74], [38, 98, 64], [56, 126, 84], [32, 86, 58]];
const SNOW: RGB[] = [[244, 248, 255], [234, 240, 250], [250, 252, 255], [222, 232, 246]];
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
// Herramientas (v3.5): mango gordo de madera con empuñadura y cabeza grande con brillo y sombra,
// como en Minecraft, para que se reconozcan de un vistazo. El contorno oscuro lo pone toolSprite.
// s/S madera clara y oscura, g empuñadura, h metal, H brillo, d sombra del metal.
const PICKAXE = [
  '................',
  '....HHHHH.......',
  '...Hhhhhhhh.....',
  '..Hhhhhhhhhhd...',
  '...ddd...dhhhd..',
  '.........Shhhd..',
  '........sS.hhhd.',
  '.......sS...hhH.',
  '......sS....dhH.',
  '.....sS.....dhH.',
  '....sS.......hH.',
  '...sS........dH.',
  '..sS..........d.',
  '.gg.............',
  '................',
  '................',
];
const AXE = [
  '................',
  '......HHh.......',
  '.....HhhhhhdsS..',
  '.....HhhhhdsS...',
  '.....HhhhdsS....',
  '.....HhhdsS.....',
  '......hdsS......',
  '.......sS.......',
  '......sS........',
  '.....sS.........',
  '....sS..........',
  '...sS...........',
  '..sS............',
  '.gg.............',
  '................',
  '................',
];
const SHOVEL = [
  '................',
  '...........HH...',
  '..........HhhH..',
  '.........Hhhhhh.',
  '.........hhhhhd.',
  '.........hhhhd..',
  '........Shhdd...',
  '.......sS.......',
  '......sS........',
  '.....sS.........',
  '....sS..........',
  '...sS...........',
  '..sS............',
  '.gg.............',
  '................',
  '................',
];
const WOOD_HANDLE: Record<string, RGB> = { s: [164, 116, 66], S: [116, 80, 46], g: [86, 58, 38] };
const STONE_HEAD: Record<string, RGB> = { h: [150, 150, 144], H: [200, 200, 192], d: [102, 102, 98] };
const IRON_HEAD: Record<string, RGB> = { h: [208, 214, 224], H: [252, 252, 255], d: [140, 148, 166] };
const CRYSTAL_HEAD: Record<string, RGB> = { h: [150, 120, 230], H: [226, 210, 255], d: [96, 70, 170] };
const ROD = [
  '................',
  '............sSl.',
  '...........sS.l.',
  '..........sS..l.',
  '.........sS...l.',
  '........sS....l.',
  '.......sS.....l.',
  '......sS......l.',
  '.....sS.......l.',
  '....sS.......rr.',
  '...sS........ww.',
  '..gg............',
  '.gg.............',
  '................',
  '................',
  '................',
];
const NET = [
  '................',
  '.........nnnn...',
  '........nmkmkn..',
  '.......nmkmkmkn.',
  '.......nkmkmkmn.',
  '.......nmkmkmkn.',
  '........nkmkmn..',
  '.......sSnnnn...',
  '......sS........',
  '.....sS.........',
  '....sS..........',
  '...sS...........',
  '..sS............',
  '.gg.............',
  '................',
  '................',
];

/** Huerto y granja: tierra de cultivo, cultivos en sus fases y los objetos de la granja y la cocina. */
function paintFarm(ctx: CanvasRenderingContext2D, leaf: RGB) {
  const furrows = (wet: boolean) => (_x: number, y: number, r: () => number): RGB => {
    const k = wet ? 0.62 : 1;
    const c = y % 4 === 0 ? [104, 70, 46] : pick(r, DIRT);
    return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * (wet ? 0.75 : 1))];
  };
  paintTile(ctx, Tile.FarmlandTop, furrows(false));
  paintTile(ctx, Tile.FarmlandWetTop, furrows(true));

  const g: RGB = [96, 170, 60];
  const dg: RGB = [64, 130, 44];
  paintSprite(ctx, Tile.Sprout, [
    ...Array(10).fill('................'),
    '......a..a......',
    '.......aa.......',
    '....a..b..a.....',
    '.....a.b.a......',
    '......bbb.......',
    '.......b........',
  ], { a: g, b: dg });
  const wheat = (tile: Tile, ear: RGB, stem: RGB, rows: string[]) => paintSprite(ctx, tile, rows, { a: stem, e: ear, b: dg });
  const WHEAT_YOUNG = [
    ...Array(6).fill('................'),
    '...a......a.....', '...a..a...a..a..', '....a.a..a...a..', '....a.a..a..a...', '.a..aa.a.a..a...',
    '..a..a.a.aa.a...', '..a..a..a.a.a...', '...a.a..a.aa....', '...aaa..aaa.....', '....bb...bb.....',
  ];
  wheat(Tile.WheatYoung, g, g, WHEAT_YOUNG);
  const WHEAT_TALL = [
    '................', '..e.....e....e..', '..e..e..e....e..', '..a..e..a..e.a..', '..a..a..a..e.a..', '.a..a..a...a.a..',
    '.a..a..a..a..a..', '..a.a..a..a..a..', '..a.a.a...a.a...', '...aa.a..a..a...', '...a.a.a.a.a....',
    '...a.a.a.aa.....', '....aa.a.a......', '....a.aaa.......', '.....aaa........', '.....bbb........',
  ];
  wheat(Tile.WheatTall, [150, 190, 80], g, WHEAT_TALL);
  wheat(Tile.WheatRipe, [236, 196, 80], [204, 170, 70], WHEAT_TALL);

  const carrot = (tile: Tile, tall: boolean, ripe: boolean) =>
    paintSprite(ctx, tile, [
      ...Array(tall ? 3 : 7).fill('................'),
      ...(tall ? ['....a.....a.....', '.....a...a..a...', '..a..a..a..a....', '...a.a.a..a.....'] : []),
      '....a..a..a.....', '.....a.a.a......', '..a...aaa...a...', '...a..aaa..a....', '....a.aaa.a.....',
      ripe ? '......ooo.......' : '......aaa.......', ripe ? '......ooo.......' : '................', ...Array(tall ? 2 : 2).fill('................'),
    ].slice(0, 16), { a: g, o: [240, 130, 40] });
  carrot(Tile.CarrotYoung, false, false);
  carrot(Tile.CarrotTall, true, false);
  carrot(Tile.CarrotRipe, true, true);

  const tomato = (tile: Tile, fruit: RGB | null) =>
    paintSprite(ctx, tile, [
      '................', '......a.........', '.....aaa..a.....', '..a..a.a.aa.....', '...a.a.aaa..r...', '..raaa..a..rr...',
      '..rr.a..a.a.....', '.....a.aaa..a...', '..a..aaa.a.aa...', '...aa.a..a.r....', '....a.a.a.rr....',
      '..rr..aaa.......', '..rr...a...a....', '.......a..a.....', '.......aaa......', '.......b........',
    ], { a: dg, b: [110, 80, 50], r: fruit ?? dg });
  paintSprite(ctx, Tile.TomatoYoung, [
    ...Array(8).fill('................'),
    '.......a........', '.....a.a.a......', '......aaa.......', '...a..a..a......', '....a.a.a.......', '.....aaa........', '......a.........', '......b.........',
  ], { a: dg, b: [110, 80, 50] });
  tomato(Tile.TomatoTall, null);
  tomato(Tile.TomatoRipe, [222, 50, 40]);

  // Objetos.
  // Sobres de semillas: el dibujo del sobre es del color de lo que crece.
  const packet = (tile: Tile, crop: RGB) => paintSprite(ctx, tile, [
    '................', '................', '....pppppppp....', '...pppppppppp...', '...pkkkkkkkkp...', '...pkkggkkkkp...',
    '...pkggggkkkp...', '...pkkggkkkkp...', '...pkkkkkkkkp...', '...pppppppppp...', '...pppppppppp...', '...p.s.s.s.sp...',
    '...pppppppppp...', '....pppppppp....', '................', '................',
  ], { p: [214, 186, 132], k: [240, 226, 196], g: crop, s: [150, 120, 70] });
  packet(Tile.Seeds, [226, 186, 70]);
  packet(Tile.SeedsCarrot, [240, 130, 40]);
  packet(Tile.SeedsTomato, [222, 50, 40]);
  paintSprite(ctx, Tile.WheatItem, [
    '....e..e..e.....', '...e.e.e.e.e....', '...e.ee.ee.e....', '....eeeeeee.....', '.....eeeee......', '......aaa.......',
    '......aaa.......', '.....rrrrr......', '......aaa.......', '......aaa.......', '.....a.a.a......', '.....a.a.a......',
    '....a..a..a.....', '....a..a..a.....', '................', '................',
  ], { e: [236, 196, 80], a: [204, 170, 70], r: [180, 60, 50] });
  paintSprite(ctx, Tile.CarrotItem, [
    '........a.a.....', '.......a.a......', '......aaa.......', '.....oooo.......', '.....ooooo......', '......oooo......',
    '......oodo......', '.......ooo......', '.......oo.......', '........o.......', '........o.......', ...Array(5).fill('................'),
  ], { a: [96, 170, 60], o: [240, 130, 40], d: [200, 100, 30] });
  paintSprite(ctx, Tile.TomatoItem, [
    '................', '................', '.......aa.......', '.....aaaaa......', '....rrrrrrrr....', '...rrhrrrrrrr...',
    '...rhrrrrrrrr...', '...rrrrrrrrrr...', '...rrrrrrrrrr...', '...rrrrrrrrdr...', '....rrrrrrdd....', '.....rrrrrr.....',
    '................', '................', '................', '................',
  ], { a: [80, 150, 50], r: [222, 50, 40], h: [255, 200, 190], d: [170, 30, 30] });
  // Cubos (v3.8): de hierro, vacío o lleno de agua.
  const bucket = (tile: Tile, full: boolean) => toolSprite(ctx, tile, [
    '................', '................', '................', '...hhhhhhhhhh...', '..h..........h..', '..h..........h..',
    full ? '..iwwwwwwwwwwi..' : '..iddddddddddi..', full ? '..iWwwwwwwwwwi..' : '..iddddddddddi..', '..iHiiiiiiiiii..', '...iHiiiiiiii...', '...iHiiiiiiii...',
    '....iiiiiiii....', '....iiiiiiii....', '.....dddddd.....', '................', '................',
  ], { h: [120, 124, 136], i: [196, 202, 214], H: [244, 246, 252], d: [104, 110, 124], w: [64, 150, 220], W: [150, 210, 250] });
  bucket(Tile.Bucket, false);
  bucket(Tile.WaterBucket, true);
  toolSprite(ctx, Tile.WateringCan, [
    '................', '................', '.....hhhh.......', '....h....h......', '....h....h......', '...ccccccc...s..',
    '..cccccccccss...', '..ccccccccss....', '..ccccccccc.....', '..ccccccccc.....', '..ccccccccc.....', '..ddddddddd.....',
    '................', '................', '................', '................',
  ], { c: [110, 170, 120], d: [80, 130, 90], h: [90, 140, 100], s: [150, 200, 160] });
  paintSprite(ctx, Tile.Egg, [
    ...Array(4).fill('................'),
    '.......ww.......', '......wwww......', '.....wwwwww.....', '.....whwwww.....', '....wwwwwwww....', '....wwwwwwws....',
    '....wwwwwwws....', '.....wwwwss.....', '......ssss......', '................', '................', '................',
  ], { w: [250, 240, 220], h: [255, 255, 255], s: [222, 206, 180] });
  paintSprite(ctx, Tile.Milk, [
    '................', '.......bb.......', '......bbbb......', '......wwww......', '......wwww......', '.....wwwwww.....',
    '....wwwwwwww....', '....wbbbbbbw....', '....wbwwwwbw....', '....wbbbbbbw....', '....wwwwwwww....', '....wwwwwwww....',
    '....wwwwwwww....', '.....wwwwww.....', '................', '................',
  ], { w: [244, 244, 240], b: [100, 150, 220] });
  paintSprite(ctx, Tile.Bread, [
    ...Array(5).fill('................'),
    '.....bbbbbb.....', '...bbcbbbcbbb...', '..bbbbcbbbcbbb..', '..bbbbbbbbbbbb..', '..dddddddddddd..', '...dddddddddd...',
    ...Array(5).fill('................'),
  ], { b: [214, 160, 80], c: [240, 200, 120], d: [170, 116, 56] });
  paintSprite(ctx, Tile.Omelette, [
    ...Array(5).fill('................'),
    '....pppppppp....', '...pyyyyyyyyp...', '..pyyyryyyryyp..', '..pyyyyyryyyyp..', '..pyyyyyyyyyyp..', '...pppppppppp...',
    ...Array(5).fill('................'),
  ], { p: [230, 230, 236], y: [246, 206, 80], r: [222, 60, 40] });
  paintSprite(ctx, Tile.Soup, [
    ...Array(5).fill('................'),
    '...oooooooooo...', '...ooOoooOooo...', '..bbbbbbbbbbbb..', '..bbbbbbbbbbbb..', '...bbbbbbbbbb...', '....bbbbbbbb....',
    '......dddd......', ...Array(4).fill('................'),
  ], { o: [240, 150, 60], O: [255, 210, 150], b: [210, 120, 90], d: [170, 90, 70] });
  paintSprite(ctx, Tile.Cake, [
    '................', '................', '.......r........', '.......c........', '....wwwwwwww....', '...wwwwwwwwww...',
    '...pwpwpwpwpw...', '...ssssssssss...', '...cccccccccc...', '...ssssssssss...', '...cccccccccc...', '...ssssssssss...',
    '..dddddddddddd..', '................', '................', '................',
  ], { r: [222, 50, 60], w: [252, 250, 244], p: [246, 170, 200], s: [210, 160, 100], c: [250, 236, 210], d: [200, 200, 210] });
  paintSprite(ctx, Tile.ChickenIcon, [
    '................', '......rr........', '.....wwww.......', '.....wkww.......', '...oowwww.......', '.....wwww.......',
    '.....wwwwwwww...', '....wwwwwwwwww..', '....wwwwwwwwww..', '....wwwwwwwww...', '.....wwwwwww....', '......o...o.....',
    '......o...o.....', '.....oo..oo.....', '................', '................',
  ], { w: [248, 246, 240], k: [30, 30, 30], o: [240, 160, 40], r: [222, 50, 50] });
  paintSprite(ctx, Tile.CowIcon, [
    '................', '................', '..h..........h..', '..wwww....wwww..', '..wkwbbbbbwwkw..', '..wwwbbbbbbwww..',
    '...wwwwwwwwww...', '...wwwbbwwwbw...', '...pppppppppp...', '...pkppppppkp...', '...pppppppppp...', '....pppppppp....',
    ...Array(4).fill('................'),
  ], { w: [248, 248, 244], b: [40, 40, 44], k: [20, 20, 20], h: [220, 210, 180], p: [244, 180, 180] });
  // Billete de avioneta (v1.9).
  // Puerta de casa: tablones verticales con marco; arriba, una ventanita.
  const DOOR_WOOD: RGB[] = [[176, 124, 74], [166, 116, 68], [186, 134, 82]];
  const doorPixel = (x: number, y: number, r: () => number, top: boolean): RGB => {
    if (x <= 1 || x >= 14) return [118, 80, 46];
    if (top && y >= 4 && y <= 10 && x >= 4 && x <= 11) return x === 7 || x === 8 || y === 7 ? [118, 80, 46] : [168, 214, 236];
    if (!top && y === 2) return [118, 80, 46];
    if (!top && x === 12 && (y === 1 || y === 0)) return [232, 196, 80]; // pomo
    return x % 4 === 1 ? [140, 98, 58] : pick(r, DOOR_WOOD);
  };
  paintTile(ctx, Tile.DoorLower, (x, y, r) => doorPixel(x, y, r, false));
  paintTile(ctx, Tile.DoorUpper, (x, y, r) => doorPixel(x, y, r, true));
  paintSprite(ctx, Tile.DoorIcon, [
    '....bbbbbbbb....', '....baaaaaab....', '....bwwbwwwb....', '....bwwbwwwb....', '....bbbbbbbb....',
    '....baabaaab....', '....baabaaab....', '....baabaaab....', '....baabaayb....', '....baabaaab....',
    '....baabaaab....', '....baabaaab....', '....baabaaab....', '....baabaaab....', '....bbbbbbbb....', '................',
  ], { a: [186, 134, 82], b: [118, 80, 46], w: [168, 214, 236], y: [232, 196, 80] });
  paintSprite(ctx, Tile.GateIcon, [
    '................', '................', '.aa..........aa.', '.ab..........ab.', '.abbbbbbbbbbbab.', '.abbbbbbbbbbbab.',
    '.ab...bb.....ab.', '.ab....bb....ab.', '.ab.....bb...ab.', '.abbbbbbbbbbbab.', '.abbbbbbbbbbbab.', '.ab..........ab.',
    '.ab..........ab.', '.ab..........ab.', '................', '................',
  ], { a: [206, 166, 108], b: [150, 112, 66] });
  // Materiales de construcción (v2.3).
  paintTile(ctx, Tile.Brick, (x, y, r) => {
    const row = Math.floor(y / 4);
    const off = row % 2 ? 4 : 0;
    if (y % 4 === 3 || (x + off) % 8 === 7) return [214, 204, 190];
    return pick(r, [[176, 86, 62], [164, 78, 56], [188, 96, 70]]);
  });
  paintTile(ctx, Tile.Cobble, (x, y, r) => {
    // Piedras redondeadas: bordes oscuros en una cuadrícula irregular.
    const cx = (x + (Math.floor(y / 5) % 2) * 3) % 6;
    if (cx === 5 || y % 5 === 4) return [104, 106, 112];
    return pick(r, [[150, 152, 156], [138, 140, 146], [162, 164, 168]]);
  });
  paintTile(ctx, Tile.PolishedStone, (x, y, r) => {
    if (x === 0 || y === 0) return [196, 198, 202];
    if (x === 15 || y === 15) return [132, 134, 140];
    return pick(r, [[172, 174, 178], [168, 170, 174], [176, 178, 182]]);
  });
  paintTile(ctx, Tile.Glass, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [196, 230, 240];
    if ((x === y + 3 && x > 4 && x < 9) || (x === y + 4 && x > 5 && x < 10)) return [236, 250, 255];
    return null;
  });
  paintTile(ctx, Tile.PalmPlanks, (_x, y, r) => (y % 4 === 3 ? [178, 142, 92] : pick(r, [[226, 196, 140], [218, 186, 130], [232, 204, 150]])));
  paintTile(ctx, Tile.LightBlock, (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [196, 150, 70];
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    return d < 4 ? [255, 250, 220] : d < 8 ? [255, 228, 150] : pick(r, [[246, 200, 110], [240, 190, 96]]);
  });
  // Cofre, baúl y caja (v2.4).
  const box = (tile: Tile, wood: RGB[], band: RGB, latch: RGB | null, top: boolean) => paintTile(ctx, tile, (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return band;
    if (!top && y === 6) return band;
    if (latch && !top && x >= 7 && x <= 8 && y >= 5 && y <= 8) return latch;
    return y % 5 === 4 && !top ? [wood[0][0] - 30, wood[0][1] - 26, wood[0][2] - 20] : pick(r, wood);
  });
  const OAK: RGB[] = [[176, 124, 74], [166, 116, 68], [186, 134, 82]];
  box(Tile.ChestFront, OAK, [110, 74, 42], [230, 194, 84], false);
  box(Tile.ChestTop, OAK, [110, 74, 42], null, true);
  const PAINTED: RGB[] = [[70, 120, 170], [64, 112, 160], [78, 130, 180]];
  box(Tile.TrunkFront, PAINTED, [176, 140, 70], [236, 206, 110], false);
  box(Tile.TrunkTop, PAINTED, [176, 140, 70], null, true);
  paintTile(ctx, Tile.CrateSide, (x, y, r) => {
    if (x <= 1 || y <= 1 || x >= 14 || y >= 14 || x === y || x === 15 - y) return [140, 100, 60];
    return pick(r, [[214, 178, 120], [204, 168, 112], [222, 188, 130]]);
  });
  // Brotes: un tallito con hojas; el de palmera, con hojas largas.
  paintSprite(ctx, Tile.Sapling, [
    '................', '................', '.....ll..ll.....', '....lLLllLLl....', '....lLLLLLLl....', '.....lLLLLl.....',
    '......lLLl......', '.......t........', '.......t..ll....', '...ll..t.lLLl...', '..lLLl.ttLLl....', '...lLLtt.ll.....',
    '.......t........', '.......t........', '.......t........', '................',
  ], { l: [72, 146, 60], L: [112, 190, 84], t: [116, 82, 50] });
  paintSprite(ctx, Tile.PalmSapling, [
    '................', '................', '..ll........ll..', '...LLl....lLL...', '.....LLllLL.....', '..lLLLLLLLLLLl..',
    '.l.....tt.....l.', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......', '.......tt.......',
    '.......tt.......', '.......tt.......', '.......tt.......', '................',
  ], { l: [84, 164, 56], L: [120, 196, 80], t: [168, 132, 86] });
  paintSprite(ctx, Tile.PineSapling, [
    '................', '.......l........', '......lLl.......', '.....lLLLl......', '.......t........', '....lLLLLLl.....',
    '...lLLLLLLLl....', '.......t........', '..lLLLLLLLLLl...', '.......t........', '.......t........', '.......t........',
    '.......t........', '.......t........', '................', '................',
  ], { l: [38, 98, 64], L: [56, 132, 86], t: [116, 82, 50] });
  paintSprite(ctx, Tile.Ticket, [
    ...Array(4).fill('................'),
    '.bbbbbbbbbbbbbb.', '.bwwwwwwwwbwwwb.', '.bwbbbwwwwbwkwb.', '.bwwbwwwwwwwkwb.', '.bwbbbbbwwbwwwb.', '.bwwbwwwwwbwkwb.',
    '.bwwwwwwwwbwwwb.', '.bbbbbbbbbbbbbb.', ...Array(4).fill('................'),
  ], { b: [70, 130, 210], w: [250, 248, 236], k: [60, 60, 70] });
  // Plano de casa: papel azul enrollado con una casita dibujada en blanco.
  paintSprite(ctx, Tile.Blueprint, [
    '................', '..bbbbbbbbbbbb..', '.dbbbbbbbbbbbbd.', '.dbbbbbwbbbbbbd.', '.dbbbbwbwbbbbbd.', '.dbbbwbbbwbbbbd.',
    '.dbbwbbbbbwbbbd.', '.dbbwwwwwwwbbbd.', '.dbbwbbbbbwbbbd.', '.dbbwbwwbbwbbbd.', '.dbbwbwwbbwbbbd.', '.dbbwwwwwwwbbbd.',
    '.dbbbbbbbbbbbbd.', '.dbbbbbbbbbbbbd.', '..dddddddddddd..', '................',
  ], { b: [64, 120, 196], d: [40, 84, 150], w: [236, 244, 255] });
  // Mapa: papel doblado con la isla verde, el mar azul y una cruz roja.
  toolSprite(ctx, Tile.Map, [
    '................', '................', '..pppppppppppp..', '..pbbbbbbbbbbp..', '..pbbgggbbbbbp..', '..pbgggggbbbbp..',
    '..pbggyggggbbp..', '..pbbgggrgggbp..', '..pbbbggrrggbp..', '..pbbbgggggbbp..', '..pbbbbgggbbbp..', '..pbbbbbbbbbbp..',
    '..pppppppppppp..', '................', '................', '................',
  ], { p: [232, 214, 170], b: [92, 160, 220], g: [104, 176, 72], y: [236, 216, 140], r: [214, 50, 50] });
  void leaf;
}

export function createAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE * ATLAS_TILES;
  const ctx = canvas.getContext('2d')!;

  paintTile(ctx, Tile.GrassTop, (_x, _y, r) => pick(r, GRASS));
  paintTile(ctx, Tile.GrassSide, (_x, y, r) => {
    const edge = 3 + Math.floor(r() * 2);
    return y < edge ? pick(r, GRASS) : pick(r, DIRT);
  });
  // Tierra con alguna piedrecita clara.
  paintTile(ctx, Tile.Dirt, (x, y, r) => ((x * 7 + y * 13) % 29 === 0 ? [176, 150, 120] : pick(r, DIRT)));
  // Piedra con manchas más oscuras y grietas, para que no parezca ruido.
  paintTile(ctx, Tile.Stone, (x, y, r) => {
    const crack = (x * 3 + y * 5) % 11 === 0;
    if (crack) return [104, 106, 112];
    const blotch = Math.sin(x * 0.9 + y * 0.4) + Math.cos(y * 1.1 - x * 0.3) > 1.2;
    const c = pick(r, STONE);
    return blotch ? [c[0] - 12, c[1] - 12, c[2] - 10] : c;
  });
  // Arena con algún granito brillante.
  paintTile(ctx, Tile.Sand, (_x, _y, r) => (r() < 0.04 ? [252, 244, 214] : pick(r, SAND)));
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
  paintSprite(ctx, Tile.FlowerBlue, DAISY, { a: [110, 150, 236], b: [250, 230, 120], s: STEM, l: leaf });
  paintSprite(ctx, Tile.FlowerPink, FLOWER, { a: [240, 130, 180], b: [252, 190, 214], s: STEM, l: leaf });
  paintFarm(ctx, leaf);
  // Bambú: dos cañas con nudos y alguna hoja, para que al apilarlo se vea un bosquecillo.
  paintTile(ctx, Tile.Bamboo, (x, y, r) => {
    const cane = x === 4 || x === 5 || x === 10 || x === 11;
    if (cane) {
      const knot = (x < 8 ? y === 3 : y === 10);
      return knot ? [96, 142, 52] : x === 5 || x === 11 ? [128, 176, 70] : pick(r, [[150, 198, 86], [140, 190, 80]]);
    }
    const leafy = (x === 6 || x === 7) && (y === 2 || y === 3) || (x === 12 || x === 13) && (y === 9 || y === 10) || (x === 2 || x === 3) && y === 12;
    return leafy ? pick(r, [[110, 180, 70], [96, 166, 60]]) : null;
  });

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
  // Caminos: tierra pisada, losas sobre la hierba, calle de adoquines y baldosas de barro.
  paintTile(ctx, Tile.DirtPathTop, (x, y, r) => ((x * 5 + y * 3) % 17 === 0 ? [178, 146, 104] : pick(r, [[172, 132, 92], [162, 124, 86], [180, 140, 98]])));
  paintTile(ctx, Tile.StonePathTop, (x, y, r) => {
    // Cuatro losas con hierba entre ellas.
    const gap = x % 8 === 0 || x % 8 === 7 || y % 8 === 0 || y % 8 === 7;
    return gap ? pick(r, GRASS) : pick(r, [[176, 176, 170], [166, 166, 160], [186, 186, 180]]);
  });
  paintTile(ctx, Tile.StreetTop, (x, y, r) => {
    const cx = (x + (Math.floor(y / 4) % 2) * 2) % 4;
    if (cx === 3 || y % 4 === 3) return [96, 98, 104];
    return pick(r, [[136, 132, 128], [128, 124, 120], [146, 142, 136]]);
  });
  paintTile(ctx, Tile.TilesTop, (x, y, r) => {
    if (x % 8 === 7 || y % 8 === 7) return [214, 200, 180];
    const dark = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
    return pick(r, dark ? [[192, 108, 72], [184, 100, 66]] : [[212, 132, 88], [204, 124, 82]]);
  });
  // Islas misteriosas (v2.9).
  paintTile(ctx, Tile.Basalt, (x, _y, r) => (x % 5 === 0 ? [70, 70, 80] : pick(r, [[96, 96, 106], [106, 106, 116], [88, 88, 98]])));
  paintTile(ctx, Tile.Amethyst, (x, y, r) => {
    // Facetas: diagonales claras sobre morado.
    if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) return [226, 196, 255];
    return pick(r, [[150, 92, 214], [164, 108, 226], [138, 82, 200]]);
  });
  paintTile(ctx, Tile.Magma, (x, y, r) => {
    // Grietas de lava brillante entre piedra oscura.
    const crack = Math.sin(x * 1.3 + y * 0.7) + Math.cos(y * 1.1 - x * 0.5) > 1.1;
    return crack ? pick(r, [[255, 150, 40], [255, 196, 70], [240, 110, 30]]) : pick(r, [[74, 40, 34], [86, 46, 38], [64, 34, 30]]);
  });
  paintSprite(ctx, Tile.CrystalCluster, [
    '................', '................', '.......c........', '......cCc.......', '......cCc...c...', '..c...cCc..cCc..',
    '.cCc..cCc..cCc..', '.cCc.cCCCc.cCc..', '.cCc.cCwCc.cCc..', '.cCcccCwCcccCc..', '..cCCCCwCCCCc...', '..cCCCCCCCCCc...',
    '...ssssssssss...', '................', '................', '................',
  ], { c: [150, 90, 220], C: [196, 140, 250], w: [246, 232, 255], s: [110, 110, 120] });
  paintTile(ctx, Tile.Ice, (x, y, r) => ((x + y) % 7 === 0 ? [236, 248, 255] : (x * 3 + y) % 11 === 0 ? [150, 196, 236] : pick(r, [[176, 214, 244], [186, 222, 248], [168, 206, 238]])));
  paintTile(ctx, Tile.MushroomStem, (x, y, r) => ((x + y * 2) % 9 === 0 ? [214, 206, 186] : pick(r, [[236, 230, 214], [228, 222, 204], [242, 238, 224]])));
  paintTile(ctx, Tile.MushroomCap, (x, y, r) => {
    // Rojo con lunares blancos, como las setas de los cuentos.
    const dot = [[3, 3], [11, 4], [7, 9], [2, 12], [12, 12]].some(([dx, dy]) => Math.abs(x - dx) + Math.abs(y - dy) <= 1);
    return dot ? [250, 246, 240] : pick(r, [[214, 52, 52], [200, 44, 46], [226, 64, 60]]);
  });
  paintSprite(ctx, Tile.SmallMushroom, [
    ...Array(6).fill('................'),
    '.....rrrrrr.....', '....rrwrrrwr....', '...rrrrrrwrrr...', '...rwrrrrrrrr...', '......ssss......', '......ssss......',
    '......ssss......', '.....ssssss.....', '................', '................',
  ], { r: [214, 52, 52], w: [250, 246, 240], s: [236, 230, 214] });
  // Agujas de pino: verde oscuro, en franjas, con pocos huecos.
  paintTile(ctx, Tile.PineLeaves, (x, y, r) => ((x + y * 3) % 7 === 0 && r() < 0.5 ? null : y % 4 === 0 ? pick(r, PINE_LEAF.slice(2)) : pick(r, PINE_LEAF)));
  paintTile(ctx, Tile.SnowTop, (_x, _y, r) => pick(r, SNOW));
  paintTile(ctx, Tile.SnowSide, (_x, y, r) => {
    const edge = 3 + Math.floor(r() * 3);
    return y < edge ? pick(r, SNOW) : pick(r, DIRT);
  });
  paintTile(ctx, Tile.PalmLeaves, (x, y, r) => ((x + y) % 5 === 0 && r() < 0.6 ? null : pick(r, PALM_LEAF)));

  // Objetos que no son bloques.
  paintSprite(ctx, Tile.Branch, BRANCH, { s: [126, 88, 52], l: leaf });
  paintSprite(ctx, Tile.Shell, SHELL, { a: [246, 196, 176], b: [232, 160, 140], c: [214, 140, 120] });
  paintSprite(ctx, Tile.Conch, CONCH, { a: [244, 226, 196], b: [222, 180, 140], c: [240, 150, 150] });
  paintSprite(ctx, Tile.Starfish, STARFISH, { a: [220, 110, 60], b: [246, 150, 86] });
  // Las herramientas sencillas son de piedra gris; las de hierro, plateadas y brillantes.
  toolSprite(ctx, Tile.Axe, AXE, { ...WOOD_HANDLE, ...STONE_HEAD });
  toolSprite(ctx, Tile.Shovel, SHOVEL, { ...WOOD_HANDLE, ...STONE_HEAD });
  toolSprite(ctx, Tile.Pickaxe, PICKAXE, { ...WOOD_HANDLE, ...STONE_HEAD });

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
  toolSprite(ctx, Tile.Rod, ROD, { ...WOOD_HANDLE, l: [236, 236, 240], r: [222, 52, 52], w: [250, 250, 250] });
  toolSprite(ctx, Tile.Net, NET, { ...WOOD_HANDLE, n: [214, 178, 96], m: [248, 248, 250], k: [196, 212, 226] });

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
  toolSprite(ctx, Tile.IronAxe, AXE, { ...WOOD_HANDLE, ...IRON_HEAD });
  toolSprite(ctx, Tile.IronPickaxe, PICKAXE, { ...WOOD_HANDLE, ...IRON_HEAD });
  toolSprite(ctx, Tile.IronShovel, SHOVEL, { ...WOOD_HANDLE, ...IRON_HEAD });

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
  // Obras públicas (v4.13): puentes de madera oscura sobre pilares de piedra, y la esfera del reloj.
  const DARK_WOOD: RGB[] = [[122, 84, 52], [112, 76, 46], [132, 92, 58]];
  paintTile(ctx, XTile.DarkWood, (_x, y, r) => (y % 4 === 3 ? [86, 58, 36] : pick(r, DARK_WOOD)));
  paintTile(ctx, XTile.BridgeDeck, (x, y, r) => {
    if (x % 8 === 7) return [80, 54, 34]; // juntas entre tablas
    if ((x % 8 === 1 || x % 8 === 5) && (y === 2 || y === 13)) return [60, 60, 64]; // clavos
    return pick(r, DARK_WOOD);
  });
  paintSprite(ctx, XTile.BridgeRailIcon, FENCE, { a: [132, 92, 58], b: [86, 58, 36] });
  paintTile(ctx, XTile.BridgePillar, (x, y, r) => {
    const row = Math.floor(y / 4);
    const joint = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 0;
    return joint ? [98, 100, 106] : pick(r, STONE);
  });
  paintTile(ctx, XTile.BridgePillarTop, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15 ? [98, 100, 106] : pick(r, STONE)));
  // Toldo de rayas (v4.16): franjas rojas y blancas, con un ribete más oscuro abajo.
  paintTile(ctx, XTile.Awning, (x, y, r) => {
    if (y === 15) return Math.floor(x / 4) % 2 === 0 ? [150, 40, 36] : [200, 196, 186];
    const red = Math.floor(x / 4) % 2 === 0;
    return red ? pick(r, [[214, 64, 58], [204, 58, 52], [222, 72, 64]]) : pick(r, [[246, 242, 232], [238, 234, 224], [250, 248, 240]]);
  });
  paintTile(ctx, XTile.AwningTop, (x, _y, r) => (Math.floor(x / 4) % 2 === 0 ? pick(r, [[214, 64, 58], [204, 58, 52]]) : pick(r, [[246, 242, 232], [238, 234, 224]])));
  // Oficios del campo y la mina (v4.17): lana, sacos de abono y pienso, regadera de cobre, herramientas de cristal y la oveja.
  paintSprite(ctx, XTile.Wool, [
    '................', '................', '.....ww..ww.....', '...wwwwwwwwww...', '..wwhwwwwwhwww..', '..wwwwwwwwwwww..',
    '.wwwwwwhwwwwwww.', '.wwhwwwwwwwwhww.', '.wwwwwwwwwwwwww.', '..wwwwwhwwwwww..', '..wwwwwwwwwwsw..', '...wwsswwwssw...',
    '.....ss..ss.....', '................', '................', '................',
  ], { w: [244, 240, 232], h: [255, 255, 255], s: [212, 206, 194] });
  const sack = (tile: number, body: RGB, mark: RGB, grain: RGB) => paintSprite(ctx, tile, [
    '................', '......tttt......', '.......tt.......', '.....bbbbbb.....', '....bbbbbbbb....', '...bbbbbbbbbb...',
    '...bbbmmmmbbb...', '..bbbmmggmmbbb..', '..bbbmggggmbbb..', '..bbbmmggmmbbb..', '..bbbbmmmmbbbb..', '..bbbbbbbbbbbb..',
    '...bbbbbbbbbb...', '....dddddddd....', '................', '................',
  ], { t: [150, 120, 70], b: body, d: [Math.round(body[0] * 0.7), Math.round(body[1] * 0.7), Math.round(body[2] * 0.7)], m: mark, g: grain });
  sack(XTile.Fertilizer, [176, 140, 96], [96, 150, 60], [140, 200, 90]);
  sack(XTile.Feed, [210, 190, 140], [200, 80, 60], [236, 196, 80]);
  toolSprite(ctx, XTile.CopperCan, [
    '................', '................', '.....hhhh.......', '....h....h......', '....h....h......', '...ccccccc...s..',
    '..cccccccccss...', '..ccccccccss....', '..ccccccccc.....', '..ccccccccc.....', '..ccccccccc.....', '..ddddddddd.....',
    '................', '................', '................', '................',
  ], { c: [214, 130, 70], d: [160, 90, 50], h: [180, 104, 56], s: [244, 180, 120] });
  toolSprite(ctx, XTile.CrystalAxe, AXE, { ...WOOD_HANDLE, ...CRYSTAL_HEAD });
  toolSprite(ctx, XTile.CrystalPickaxe, PICKAXE, { ...WOOD_HANDLE, ...CRYSTAL_HEAD });
  toolSprite(ctx, XTile.CrystalShovel, SHOVEL, { ...WOOD_HANDLE, ...CRYSTAL_HEAD });
  paintClimateTiles(ctx);
  // La ropa (v4.18): un icono por prenda y color.
  const rgb = (c: number): RGB => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  for (const cloth of CLOTHES) {
    toolSprite(ctx, cloth.tile, cloth.garment.icon, { c: rgb(cloth.color.c), d: rgb(darker(cloth.color.c)), a: rgb(cloth.color.a) });
  }
  paintSprite(ctx, XTile.SheepIcon, [
    '................', '................', '....wwwwwwww....', '...wwwwwwwwww...', '..kkwwwwwwwwww..', '.kkkkwwwwwwwww..',
    '.kekkwwwwwwwww..', '.kkkkwwwwwwwww..', '..kk.wwwwwwwww..', '.....wwwwwwww...', '......k..k......', '......k..k......',
    '.....kk.kk......', '................', '................', '................',
  ], { w: [244, 240, 232], k: [58, 50, 56], e: [250, 250, 250] });
  paintTile(ctx, XTile.ClockFace, (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.6) return [150, 78, 60];
    if (d > 6.4) return [212, 176, 72]; // aro dorado
    if ((x === 7 || x === 8) && y >= 3 && y <= 8) return [40, 40, 44]; // aguja larga
    if (y >= 7 && y <= 8 && x >= 8 && x <= 11) return [40, 40, 44]; // aguja corta
    const tick = [[7, 2], [8, 2], [13, 7], [13, 8], [7, 13], [8, 13], [2, 7], [2, 8]].some(([tx, ty]) => tx === x && ty === y);
    return tick ? [90, 90, 96] : [248, 244, 228];
  });
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
    paintSprite(ctx, creatureTile(i), CREATURE_SPRITES[c.sprite], { e: [20, 20, 20], c: [255, 255, 200], ...c.colors });
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
  if (b === Block.BridgeRail) return XTile.BridgeRailIcon;
  if (b === Block.ClockFace) return XTile.ClockFace;
  if (isDoor(b)) return Tile.DoorIcon;
  if (isGate(b)) return Tile.GateIcon;
  if (def.shape === 'slab' || def.shape === 'stairs' || b === Block.Chest || b === Block.Trunk) return def.tiles[0];
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
    recolor(Tile.PineLeaves, (c, _x, _y, r) => (r < 0.3 ? snow(c, 0, 0, r) : c));
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
