import * as THREE from 'three';
import { waterFlow } from './fluids';
import { ATLAS_TILES, BLOCKS, Block, FRUITS, HOUSE_BLOCKS, LIGHT_COLOR, LIGHT_COLORS, LIGHT_RADIUS, MAX_LIGHT, ROOFS, SWAYING, WALL_TORCH_DIRS, isCross, isTorch, isDoor, isDoorTop, isFence, isFullBlock, isGate, isLava, isOpaque, isOpen, isSolid, isWater, lavaHeight, waterHeight, waterLevel as fluidLevel } from './blocks';
import { blockRandom, columnRandom, fbm, valueNoise3 } from './noise';
import { acaciaShape, blossomShape, ceibaShape, firShape, glowShape, fruitTreeShape, palmShape, pineShape, willowShape } from './trees';
import { type BuildingTemplate, templateCells } from './buildings';
import { SHOP_BUILDING, shopOrigin } from './shopBuilding';
import { MUSEUM, museumOrigin } from './museum';

export const CHUNK = 16;
export const HEIGHT = 64;

/** Bloques con y <= SEA_LEVEL quedan bajo el agua. */
export const SEA_LEVEL = 16;
/** Altura de la superficie del agua. */
export const WATER_SURFACE = SEA_LEVEL + 0.85;
/** Radio aproximado de la isla, en bloques (las islas de antes de la v2.6). */
export const ISLAND_RADIUS = 72;
/** Radio de las islas nuevas, con biomas (terreno 2). */
export const BIG_ISLAND_RADIUS = 112;
/** Radio de los islotes (v5.0.1: de 12 a 17) y hasta dónde pueden llegar, en radios de la isla. */
export const ISLET_MIN_R = 12;
export const ISLET_REACH = 1.7;
/** Versión del terreno de las islas nuevas. Las guardadas siguen con el suyo para que no se mueva nada. */
export const TERRAIN_VERSION = 2;

/** Zonas de la isla con su propio paisaje (solo en el terreno 2). */
export type Biome =
  | 'playa' | 'bosque' | 'pradera' | 'bambu' | 'montaña'
  | 'pantano' | 'cerezos' | 'desierto' | 'sabana' | 'selva' | 'cañon' | 'taiga' | 'tundra' | 'glaciar' | 'picos'
  | 'luminoso' | 'volcanico' | 'setas';
export const BIOME_NAMES: Record<Biome, string> = {
  playa: 'Playa', bosque: 'Bosque', pradera: 'Pradera', bambu: 'Bambú', montaña: 'Montaña',
  pantano: 'Pantano', cerezos: 'Bosque de cerezos', desierto: 'Desierto', sabana: 'Sabana', selva: 'Selva', cañon: 'Cañón',
  taiga: 'Taiga', tundra: 'Tundra', glaciar: 'Glaciar', picos: 'Picos nevados',
  luminoso: 'Bosque bioluminiscente', volcanico: 'Tierras volcánicas', setas: 'Bosque de setas gigantes',
};
const INLAND_BIOMES: Biome[] = ['bosque', 'pradera', 'montaña', 'bambu'];

/** Clima de la isla (v4.19). Las islas de antes no tienen y siguen con sus cuatro biomas de siempre. */
export type Climate = 'templado' | 'calido' | 'frio' | 'extrano';
export const CLIMATES: Climate[] = ['templado', 'calido', 'frio', 'extrano'];
export const CLIMATE_NAMES: Record<Climate, string> = { templado: 'Templada', calido: 'Cálida', frio: 'Fría', extrano: 'Extraña' };
/** Biomas de cada clima, alrededor del pueblo del centro. */
export const CLIMATE_BIOMES: Record<Climate, Biome[]> = {
  templado: ['bosque', 'pradera', 'montaña', 'bambu', 'pantano', 'cerezos'],
  calido: ['desierto', 'sabana', 'selva', 'cañon'],
  frio: ['taiga', 'tundra', 'glaciar', 'picos'],
  // Islas extrañas (v4.20): solo los tres biomas raros.
  extrano: ['luminoso', 'volcanico', 'setas'],
};
/** Biomas altos, con más terrazas (el de cada clima). */
const TALL_BIOMES: Biome[] = ['montaña', 'cañon', 'picos', 'volcanico'];
/** Rayas de los acantilados del cañón, de abajo arriba. */
const STRATA: Block[] = [Block.TerracottaOrange, Block.TerracottaYellow, Block.RedSand, Block.TerracottaWhite, Block.TerracottaOrange, Block.Sandstone];
/** Capas de los acantilados volcánicos (v4.20). */
const VOLCANIC_STRATA: Block[] = [Block.Basalt, Block.Slate, Block.Blackstone, Block.Basalt, Block.Ash, Block.Blackstone];
/** Luces que salen solas en el terreno y alumbran desde el principio (v4.20): lava y setas luminosas. */
const GENERATED_LIGHTS: ReadonlySet<number> = new Set([Block.Lava, Block.GlowMushroom, Block.Magma]);
/** Clima elegido para la próxima isla nueva (se guarda un momento mientras se recarga el juego). */
export const CLIMATE_KEY = 'maxycraft-clima';
export function isClimate(v: unknown): v is Climate {
  return v === 'templado' || v === 'calido' || v === 'frio' || v === 'extrano';
}

/**
 * Los bloques de cada chunk van en 16 bits desde la v4.5: caben 65.536 tipos de bloque.
 * Con 8 bits el tope era 255 y ya se usaban más de 120.
 */
export type BlockData = Uint16Array;

class Chunk {
  readonly data: BlockData = new Uint16Array(CHUNK * CHUNK * HEIGHT);
  mesh: THREE.Mesh | null = null;
  dirty = true;
  /** Sube cada vez que el chunk cambia: una malla pedida a otro hilo solo vale si no ha cambiado desde entonces (v4.7). */
  stamp = 0;
  /** Último momento (milisegundos) en que el jugador estuvo cerca, para soltar de memoria los que quedan lejos. */
  seen = 0;
  /** Lo hay que redibujar. */
  touch() {
    this.dirty = true;
    this.stamp++;
  }
  /** Altura del bloque opaco más alto de cada columna, para saber qué está bajo tierra. */
  sky: Int16Array | null = null;
  /** Luz de cada bloque al dibujar el chunk: cielo en los 4 bits altos, antorchas en los bajos (v3.1). */
  light: Uint8Array | null = null;
  constructor(readonly cx: number, readonly cz: number) {}
}

/** Malla de un chunk calculada como listas de números (v4.7), lista para pasar entre hilos. */
export interface MeshData {
  cx: number;
  cz: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  lights: Float32Array;
  tints: Float32Array;
  sway: Float32Array;
  indices: Uint32Array;
  water: Float32Array;
  flow: Float32Array;
  /** Luz de cada bloque del chunk (para lightAt). */
  light: Uint8Array;
}

/** Mensajes al hilo que dibuja las mallas: lo necesario para que su copia del mundo sea igual a esta. */
export type MesherMessage =
  | { t: 'init'; seed: number; edits: Edits; options: WorldOptions; lamps: [number, number, number, number][] }
  | { t: 'set'; x: number; y: number; z: number; b: number }
  | { t: 'clear'; x: number; y: number; z: number }
  | { t: 'lamp'; x: number; y: number; z: number; level: number }
  | { t: 'guest'; x: number; z: number }
  /** Dibuja ese chunk; con `blocks`, manda también sus bloques (si aquí aún no se han generado). */
  | { t: 'mesh'; cx: number; cz: number; stamp: number; blocks: boolean }
  | { t: 'drop'; cx: number; cz: number };

/** Respuesta del hilo de dibujo. */
export type MesherResult = MeshData & { stamp: number; blocks?: BlockData };

/** Por dónde se habla con el hilo de dibujo. */
export interface MesherLink {
  post(msg: MesherMessage): void;
}

/** Los buffers de una malla, para pasarlos a otro hilo sin copiarlos. */
export function meshBuffers(m: MeshData): ArrayBuffer[] {
  return [m.positions, m.normals, m.uvs, m.colors, m.lights, m.tints, m.sway, m.indices, m.water, m.flow, m.light].map((a) => a.buffer as ArrayBuffer);
}

/** Luz de antorchas en un bloque, de 0 a 1, y `color`: de qué color es (índice de LIGHT_COLORS). */
type BlockLight = ((x: number, y: number, z: number) => number) & { color: (x: number, y: number, z: number) => number };

function index(x: number, y: number, z: number): number {
  return (y * CHUNK + z) * CHUNK + x;
}

function key(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

// Las 6 caras de un cubo: normal, lado de textura y esquinas [x, y, z, u, v].
const FACES = [
  { dir: [-1, 0, 0], side: 0, corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], side: 0, corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], side: 2, corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], side: 1, corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], side: 0, corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], side: 0, corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
] as const;

// Plantas: dos planos cruzados en diagonal, con las mismas esquinas [x, y, z, u, v].
const MEADOW_FLOWERS = [Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite, Block.FlowerBlue, Block.FlowerPink, Block.TallGrass];

const CROSS_QUADS = [
  [[0.15, 0, 0.15, 0, 0], [0.85, 0, 0.85, 1, 0], [0.15, 1, 0.15, 0, 1], [0.85, 1, 0.85, 1, 1]],
  [[0.15, 0, 0.85, 0, 0], [0.85, 0, 0.15, 1, 0], [0.15, 1, 0.85, 0, 1], [0.85, 1, 0.15, 1, 1]],
] as const;

// Las caras laterales se oscurecen un poco para dar volumen, como en Minecraft.
const FACE_SHADE = [0.8, 0.8, 0.55, 1, 0.9, 0.9];
const AO_CURVE = [0.45, 0.65, 0.82, 1];
/** Luz del cielo mínima bajo un tejado cerca de la superficie, para que las casas no queden negras. */
const INDOOR_SKY = 0.55;

/** Islote pequeño en el mar, cerca de la isla (v4.13). */
export interface Islet {
  x: number;
  z: number;
  r: number;
}

/** Parcela con la casa de un vecino o la tienda. La puerta mira hacia +z. */
export interface Plot {
  kind: 'house' | 'shop' | 'museum' | 'player' | 'townhall';
  x: number;
  z: number;
  /** Altura del suelo (bloque de arriba del terreno). */
  y: number;
  roof: Block;
  /** Casilla de aire justo delante de la puerta, donde el vecino entra y sale. */
  door: [number, number, number];
  /** Casa de un vecino que vino de una isla misteriosa. */
  guest?: boolean;
}

/** Tienda de campaña de lona en forma de A, cerrada por detrás y con la entrada hacia +z. */
export function buildTent(x: number, y: number, z: number, put: (x: number, y: number, z: number, b: Block) => void) {
  for (let dz = -1; dz <= 2; dz++) {
    put(x - 2, y + 1, z + dz, Block.Canvas);
    put(x + 2, y + 1, z + dz, Block.Canvas);
    put(x - 1, y + 2, z + dz, Block.Canvas);
    put(x + 1, y + 2, z + dz, Block.Canvas);
    put(x, y + 3, z + dz, Block.Canvas);
  }
  for (let dx = -1; dx <= 1; dx++) put(x + dx, y + 1, z - 2, Block.Canvas);
  put(x, y + 2, z - 2, Block.Canvas);
}

/** El museo y la tienda son edificios de plantilla que llenan su parcela: cuál y dónde va su esquina. */
function bigBuilding(p: Plot): { template: BuildingTemplate; origin: [number, number, number] } | null {
  if (p.kind === 'museum') return { template: MUSEUM, origin: museumOrigin(p) };
  if (p.kind === 'shop') return { template: SHOP_BUILDING, origin: shopOrigin(p) };
  return null;
}

/** Medio lado de la parcela que se allana y se deja sin árboles. */
export const PLOT_RADIUS = 5;

/** Milisegundos por fotograma para dibujar chunks nuevos mientras se juega (siempre al menos uno). */
const MESH_MS = 6;
/** Mallas pedidas a la vez al hilo de dibujo (v4.7). */
const MAX_IN_FLIGHT = 4;
/** Chunks más allá de la distancia de visión más este margen, y sin visitar desde hace un rato, se sueltan de memoria. */
const UNLOAD_MARGIN = 4;
const UNLOAD_AFTER_MS = 20_000;

/** Cambios del jugador sobre el mundo generado, por chunk: índice local → bloque. */
export type Edits = Record<string, Record<number, number>>;

/** La fruta típica de la isla de esa semilla. */
export function islandFruit(seed: number): Block {
  return FRUITS[Math.floor(columnRandom(1, 1, seed) * FRUITS.length)];
}

/** Tipos de isla misteriosa: cada una tiene algo de más. */
export type MysteryKind = 'frutas' | 'flores' | 'minerales' | 'bambu' | 'volcan' | 'cristal' | 'nieve' | 'setas';
export const MYSTERY_KINDS: MysteryKind[] = ['frutas', 'flores', 'minerales', 'bambu', 'volcan', 'cristal', 'nieve', 'setas'];

export interface WorldOptions {
  /** Isla misteriosa, pequeña y sin casas, a la que se llega en avioneta. */
  mystery?: { kind: MysteryKind; fruit: Block };
  /** Parcelas (x, z) de los vecinos invitados desde las islas misteriosas. */
  guests?: [number, number][];
  /** Versión del terreno: 1 (o nada) las islas de antes, 2 las grandes con biomas. */
  terrain?: number;
  /** Clima (v4.19), solo en el terreno 2. Sin él, los cuatro biomas de antes. */
  climate?: Climate;
}

/** Sitio de la avioneta: la playa donde espera el piloto y el agua donde flota el avión, mirando al mar (dx, dz). */
export interface Airport {
  x: number;
  z: number;
  y: number;
  dx: number;
  dz: number;
}

const SIDES: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export interface WaterfallSpot {
  x: number;
  z: number;
  top: number;
  bottom: number;
  dx: number;
  dz: number;
}

export class World {
  private chunks = new Map<string, Chunk>();
  private edits = new Map<string, Map<number, number>>();
  readonly group = new THREE.Group();
  /** La fruta típica de esta isla, como en Animal Crossing. */
  readonly fruit: Block;
  /** Sube cada vez que el jugador cambia un bloque, para saber si hay que guardar. */
  revision = 0;
  readonly plots: Plot[];
  readonly mystery: WorldOptions['mystery'];
  /** Radio de la isla: las misteriosas son mucho más pequeñas. */
  private readonly radius: number;
  /** Versión del terreno (ver TERRAIN_VERSION). */
  readonly terrain: number;
  /** Terreno 2: orden de los biomas alrededor de la isla y giro, distintos en cada isla. */
  private biomeOrder: Biome[] = INLAND_BIOMES;
  private biomeTurn = 0;
  /** Clima de la isla (v4.19); undefined en las de antes y en las misteriosas. */
  readonly climate: Climate | undefined;
  /** Cuánto se alejan del centro las casas y las cuevas: más en las islas grandes. */
  private readonly spread: number;
  /** Entradas de cueva: escaleras que bajan desde la superficie. */
  readonly caveEntrances: { x: number; z: number; y: number }[];
  /** Posiciones "x,y,z" de las antorchas, que iluminan las cuevas. */
  private torches = new Map<string, [number, number, number]>();
  /** Luces que no son bloques (farolas, lámparas…): "x,y,z" → [x, y, z, nivel]. */
  private lamps = new Map<string, [number, number, number, number]>();

  /**
   * Se llama cada vez que cambia un bloque (v3.8), para que el agua de alrededor se mueva.
   * También al cargar un trozo de isla, por cada hueco que hizo el jugador, por si toca el agua.
   */
  onBlockChange: ((x: number, y: number, z: number) => void) | null = null;

  /**
   * Bordes de agua que se asoman a un hueco, de los trozos de isla recién generados (v3.9).
   * El agua de ahí tiene que moverse para que las cascadas caigan de verdad: ver `takeSpills`.
   */
  private spills: [number, number, number][] = [];
  /** Manantiales de los acantilados de las islas de antes (se buscan una vez, al hacer falta). */
  private springs: WaterfallSpot[] | null = null;

  /** Casas de invitados añadidas (en el constructor o después), para copiar el mundo en otro hilo. */
  private guestSpots: [number, number][] = [];
  private readonly options: WorldOptions;
  /** El hilo que dibuja las mallas (v4.7), si lo hay. */
  private mesher: MesherLink | null = null;
  /** Chunks pedidos al hilo de dibujo y el `stamp` con que se pidieron. */
  private inFlight = new Map<string, number>();

  /** Material del agua; se pone desde fuera para que coincida con el resto de la escena. */
  waterMaterial: THREE.Material = new THREE.MeshLambertMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });

  constructor(readonly seed: number, private material: THREE.Material, edits: Edits = {}, options: WorldOptions = {}) {
    this.options = options;
    this.mystery = options.mystery;
    this.terrain = this.mystery ? 1 : options.terrain ?? 1;
    // Las islas misteriosas miden entre 40 y 54 bloques de radio; la del volcán, algo más.
    const mysteryRadius = 40 + Math.floor(columnRandom(5, 5, seed) * 14) + (this.mystery?.kind === 'volcan' ? 6 : 0);
    this.radius = this.mystery ? mysteryRadius : this.terrain >= 2 ? BIG_ISLAND_RADIUS : ISLAND_RADIUS;
    this.spread = this.terrain >= 2 ? 1.5 : 1;
    this.climate = this.terrain >= 2 && !this.mystery && isClimate(options.climate) ? options.climate : undefined;
    if (this.terrain >= 2) {
      this.biomeOrder = [...(this.climate ? CLIMATE_BIOMES[this.climate] : INLAND_BIOMES)].sort((a, b) => columnRandom(a.length, 41, seed + a.charCodeAt(1)) - columnRandom(b.length, 41, seed + b.charCodeAt(1)));
      this.biomeTurn = columnRandom(4, 42, seed) * Math.PI * 2;
    }
    this.fruit = this.mystery?.fruit ?? islandFruit(seed);
    for (const [k, list] of Object.entries(edits)) {
      this.edits.set(k, new Map(Object.entries(list).map(([i, b]) => [Number(i), b])));
    }
    this.plots = this.mystery ? [] : this.findPlots(6);
    this.caveEntrances = this.mystery ? [] : this.findCaveEntrances(2);
    // Las casas de los invitados van al final para no mover nada de lo que ya había.
    for (const [x, z] of options.guests ?? []) this.addGuestPlot(x, z);
    // Las luces del techo del museo (v4.15) y de la tienda (v4.16) salen con la isla.
    for (const p of this.plots) {
      const big = bigBuilding(p);
      if (!big) continue;
      const [mx, my, mz] = big.origin;
      for (const [dx, dy, dz, b] of templateCells(big.template, 0)) {
        if (b !== null && LIGHT_RADIUS[b]) this.torches.set(`${mx + dx},${my + dy},${mz + dz}`, [mx + dx, my + dy, mz + dz]);
      }
    }
    // Antorchas que el jugador ya había puesto.
    for (const [k, m] of this.edits) {
      const [cx, cz] = k.split(',').map(Number);
      for (const [i, b] of m) {
        if (!LIGHT_RADIUS[b as Block]) continue;
        const x = i % CHUNK;
        const z = Math.floor(i / CHUNK) % CHUNK;
        const y = Math.floor(i / (CHUNK * CHUNK));
        const wx = cx * CHUNK + x;
        const wz = cz * CHUNK + z;
        this.torches.set(`${wx},${y},${wz}`, [wx, y, wz]);
      }
    }
  }

  /** Sitios en tierra firme, lejos de casas y del río, para bajar a las cuevas. */
  private findCaveEntrances(count: number) {
    const found: { x: number; z: number; y: number }[] = [];
    for (let tries = 0; tries < 400 && found.length < count; tries++) {
      const a = columnRandom(tries, 55, this.seed) * Math.PI * 2;
      const d = (15 + columnRandom(tries, 56, this.seed) * 30) * this.spread;
      const x = Math.round(Math.cos(a) * d);
      const z = Math.round(Math.sin(a) * d);
      const y = this.naturalHeight(x, z);
      if (y < SEA_LEVEL + 2 || this.river(x, z) < 8) continue;
      if (this.plotAt(x, z, 8) || this.plotAt(x + 16, z, 8)) continue;
      if (found.some((e) => Math.hypot(e.x - x, e.z - z) < 30)) continue;
      found.push({ x, z, y });
    }
    return found;
  }

  /** Escalera de 2 de ancho que baja hacia +x y termina en una sala con un túnel. */
  private carveEntrance(e: { x: number; z: number; y: number }, put: (x: number, y: number, z: number) => void) {
    const bottom = 5;
    const steps = e.y - bottom;
    for (let i = 0; i <= steps; i++) {
      const floor = e.y - i;
      for (let dz = 0; dz < 2; dz++) for (let h = 0; h < 4; h++) put(e.x + i, floor + h, e.z + dz);
    }
    const hx = e.x + steps;
    // Sala al final de la escalera.
    for (let dx = 1; dx <= 6; dx++) for (let dz = -2; dz <= 3; dz++) for (let h = 0; h < 4; h++) put(hx + dx, bottom + h, e.z + dz);
    // Túnel que sigue serpenteando.
    let tz = e.z;
    for (let dx = 7; dx < 40; dx++) {
      tz += Math.round(Math.sin((dx + e.x) * 0.3));
      for (let dz = 0; dz < 3; dz++) for (let h = 0; h < 3; h++) put(hx + dx, bottom + h, tz + dz);
    }
  }

  /** Busca sitios llanos para las casas, lejos del río, de la playa y entre sí. */
  private findPlots(count: number): Plot[] {
    const plots: Plot[] = [];
    for (let tries = 0; tries < 600 && plots.length < count; tries++) {
      const a = columnRandom(tries, 77, this.seed) * Math.PI * 2;
      const d = (12 + columnRandom(tries, 78, this.seed) * 34) * this.spread;
      const x = Math.round(Math.cos(a) * d);
      const z = Math.round(Math.sin(a) * d);
      const h = this.naturalHeight(x, z);
      if (h <= SEA_LEVEL + 1 || this.river(x, z) < 9 || this.biomeAt(x, z) === 'montaña') continue;
      if (plots.some((p) => Math.hypot(p.x - x, p.z - z) < 16)) continue;
      // Con el tiempo se relaja: al principio se busca un sitio totalmente llano.
      const tolerance = tries < 300 ? 0 : 1;
      let flat = true;
      for (let dz = -PLOT_RADIUS; dz <= PLOT_RADIUS && flat; dz++) {
        for (let dx = -PLOT_RADIUS; dx <= PLOT_RADIUS && flat; dx++) {
          const hh = this.naturalHeight(x + dx, z + dz);
          if (Math.abs(hh - h) > tolerance || hh <= SEA_LEVEL + 1) flat = false;
        }
      }
      if (!flat) continue;
      // Las dos primeras parcelas son para la tienda y el museo.
      const kind = plots.length === 0 ? 'shop' : plots.length === 1 ? 'museum' : 'house';
      const roof = kind === 'shop' ? Block.RoofGreen : kind === 'museum' ? Block.RoofBlue : ROOFS[(plots.length - 2) % ROOFS.length];
      // El museo (v4.15) y la tienda (v4.16) ocupan toda la parcela, con la puerta al fondo del porche o la acera.
      plots.push({ kind, x, z, y: h, roof, door: [x, h + 1, z + (kind === 'museum' ? 5 : kind === 'shop' ? 4 : 3)] });
    }
    // La última es la del jugador; así las islas de antes conservan sus casas.
    if (plots.length > 2) plots[plots.length - 1].kind = 'player';
    return plots;
  }

  /** Añade la casa de un vecino invitado. Hay que hacerlo antes de que se genere esa zona. */
  addGuestPlot(x: number, z: number) {
    this.guestSpots.push([x, z]);
    this.mesher?.post({ t: 'guest', x, z });
    const y = this.naturalHeight(x, z);
    this.plots.push({ kind: 'house', x, z, y, roof: ROOFS[this.plots.filter((p) => p.guest).length % ROOFS.length], door: [x, y + 1, z + 3], guest: true });
  }

  /**
   * Sitios (x, z) para casas de vecinos nuevos: llanos, lejos de las demás casas y de las entradas de cueva,
   * y donde el jugador no ha tocado nada, para no aplanar algo que haya construido.
   * Una vez elegido, el sitio se guarda en la partida para que la casa no se mueva nunca.
   */
  findGuestSpots(count: number): [number, number][] {
    const found: { x: number; z: number }[] = [];
    const touched = (x: number, z: number) => {
      const r = PLOT_RADIUS + 3;
      for (let cz = Math.floor((z - r) / CHUNK); cz <= Math.floor((z + r) / CHUNK); cz++) {
        for (let cx = Math.floor((x - r) / CHUNK); cx <= Math.floor((x + r) / CHUNK); cx++) {
          if (this.edits.get(key(cx, cz))?.size) return true;
        }
      }
      return false;
    };
    for (let tries = 0; tries < 1500 && found.length < count; tries++) {
      const a = columnRandom(tries, 177, this.seed) * Math.PI * 2;
      const d = (10 + columnRandom(tries, 178, this.seed) * 45) * this.spread;
      const x = Math.round(Math.cos(a) * d);
      const z = Math.round(Math.sin(a) * d);
      const h = this.naturalHeight(x, z);
      if (h <= SEA_LEVEL + 1 || this.river(x, z) < 9 || this.biomeAt(x, z) === 'montaña') continue;
      if ([...this.plots, ...found].some((p) => Math.hypot(p.x - x, p.z - z) < 15)) continue;
      if (this.caveEntrances.some((e) => Math.abs(x - e.x - 10) < 22 && Math.abs(z - e.z) < 14)) continue;
      let flat = true;
      for (let dz = -PLOT_RADIUS; dz <= PLOT_RADIUS && flat; dz++) {
        for (let dx = -PLOT_RADIUS; dx <= PLOT_RADIUS && flat; dx++) {
          const hh = this.naturalHeight(x + dx, z + dz);
          if (Math.abs(hh - h) > (tries < 300 ? 0 : 1) || hh <= SEA_LEVEL + 1) flat = false;
        }
      }
      if (!flat || touched(x, z)) continue;
      found.push({ x, z });
    }
    return found.map((p) => [p.x, p.z]);
  }

  /** Busca una playa con mar delante para la avioneta, empezando por la dirección `angle`. */
  findAirport(angle = 0): Airport | null {
    for (let i = 0; i < 64; i++) {
      // Se prueba alternando a un lado y al otro del ángulo pedido.
      const a = angle + Math.ceil(i / 2) * (i % 2 ? 1 : -1) * (Math.PI / 32);
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      let beach: [number, number] | null = null;
      for (let d = this.radius * 0.3; d < this.radius * 1.6; d += 1) {
        const x = Math.round(dx * d);
        const z = Math.round(dz * d);
        const h = this.naturalHeight(x, z);
        if (h === SEA_LEVEL + 1 && !this.plotAt(x, z, 2)) beach = [x, z];
        if (h < SEA_LEVEL && beach) {
          // Hace falta mar abierto delante, para que quepa el avión.
          let open = true;
          for (let k = 1; k <= 6 && open; k++) open = this.naturalHeight(Math.round(x + dx * k), Math.round(z + dz * k)) < SEA_LEVEL;
          if (!open) break;
          return { x: beach[0], z: beach[1], y: SEA_LEVEL + 2, dx, dz };
        }
      }
    }
    return null;
  }

  /** Parcela que contiene (x, z), o undefined. */
  plotAt(x: number, z: number, margin = 0): Plot | undefined {
    const r = PLOT_RADIUS + margin;
    return this.plots?.find((p) => Math.abs(p.x - x) <= r && Math.abs(p.z - z) <= r);
  }

  /** Si el jugador (o un edificio colocado después) ha cambiado ese bloque. */
  isEdited(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= HEIGHT) return false;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    return this.edits.get(key(cx, cz))?.has(index(x - cx * CHUNK, y, z - cz * CHUNK)) ?? false;
  }

  exportEdits(): Edits {
    const out: Edits = {};
    for (const [k, m] of this.edits) out[k] = Object.fromEntries(m);
    return out;
  }

  // --- Generación de la isla ---

  /** 0 en mar abierto, 1 en el interior de la isla. La costa se deforma con ruido. */
  private landMask(x: number, z: number): number {
    const angle = Math.atan2(z, x);
    const wobble = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, this.seed + 3, 3) - 0.5;
    const coast = fbm(x / 22, z / 22, this.seed + 4, 2) - 0.5;
    const d = Math.hypot(x, z) / (this.radius * (1 + wobble * 0.5));
    const v = 1 - (d + coast * 0.25 - 0.55) / 0.45;
    return Math.max(0, Math.min(1, v));
  }

  /** Como landMask, pero sin cortar en 0: mar adentro sigue bajando, para saber lo lejos que está la costa. */
  private landMaskRaw(x: number, z: number): number {
    const angle = Math.atan2(z, x);
    const wobble = fbm(Math.cos(angle) * 2 + 10, Math.sin(angle) * 2 + 10, this.seed + 3, 3) - 0.5;
    const coast = fbm(x / 22, z / 22, this.seed + 4, 2) - 0.5;
    const d = Math.hypot(x, z) / (this.radius * (1 + wobble * 0.5));
    return 1 - (d + coast * 0.25 - 0.55) / 0.45;
  }

  /**
   * Qué agua hay arriba del todo en (x, z): río dentro de la isla, mar fuera, o null si es tierra.
   * Desde la v3.8 el agua son bloques: cuenta la que haya (también la que eche el jugador con un cubo).
   */
  waterKind(x: number, z: number): 'mar' | 'río' | null {
    const top = this.waterTop(x, z);
    if (top === null) return null;
    return top > SEA_LEVEL || this.landMask(x, z) >= 0.26 ? 'río' : 'mar';
  }

  /** Bloque de agua más alto de la columna (x, z) con cielo encima, o null si arriba del todo no hay agua. */
  waterTop(x: number, z: number): number | null {
    const c = this.chunks.get(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    // Lejos, donde aún no hay isla cargada, se calcula como antes, sin crear el trozo.
    if (!c) {
      const level = this.waterLevel(x, z);
      return this.naturalHeight(x, z) < level ? level : null;
    }
    const lx = x - c.cx * CHUNK;
    const lz = z - c.cz * CHUNK;
    for (let y = HEIGHT - 1; y > 0; y--) {
      const b = c.data[index(lx, y, lz)];
      if (b === Block.Air || isCross(b)) continue;
      return isWater(b) ? y : null;
    }
    return null;
  }

  /**
   * Altura (y del bloque) hasta la que llega el agua en esta columna. Es el nivel del mar,
   * salvo en el río de las islas grandes, que baja de terraza en terraza (y forma cascadas).
   */
  waterLevel(x: number, z: number): number {
    if (this.terrain < 2 || this.mystery) return SEA_LEVEL;
    const { dist, u } = this.riverAt(x, z);
    return dist < 3.6 && this.landMask(x, z) >= 0.26 ? this.riverLevel(u) : SEA_LEVEL;
  }

  /** Altura de la superficie del agua en (x, z) (si no hay agua, la que tendría el mar o el río). */
  waterSurface(x: number, z: number): number {
    const top = this.waterTop(x, z);
    if (top === null) return this.waterLevel(x, z) + (WATER_SURFACE - SEA_LEVEL);
    return top + waterHeight(this.getBlock(x, top, z));
  }

  /** Altura de la superficie del agua que hay encima del punto (x, y, z), subiendo por los bloques de agua. */
  waterSurfaceAbove(x: number, y: number, z: number): number {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    let by = Math.floor(y);
    if (!isWater(this.getBlock(bx, by, bz))) return y;
    while (by + 1 < HEIGHT && isWater(this.getBlock(bx, by + 1, bz))) by++;
    return by + waterHeight(this.getBlock(bx, by, bz));
  }

  // --- Islotes (v4.13) ---

  private isletList: Islet[] | null = null;

  /**
   * De 2 a 4 islotes pequeños en el mar, alrededor de la isla (también en las partidas de antes: solo cambia
   * mar abierto). Se llega a ellos con un puente hecho a mano (v5.0.1: el alcalde ya no los encarga) o en barco.
   */
  get islets(): Islet[] {
    if (this.mystery) return [];
    this.isletList ??= this.findIslets();
    return this.isletList;
  }

  private findIslets(): Islet[] {
    const rnd = (i: number) => columnRandom(i, 4013, this.seed + 71);
    const count = 2 + Math.floor(rnd(0) * 3);
    const turn = rnd(1) * Math.PI * 2;
    const out: Islet[] = [];
    for (let k = 0; k < count; k++) {
      // v5.0.1: bastante más grandes (antes de 5 a 8 de radio), para poder construir en ellos.
      const r = ISLET_MIN_R + Math.floor(rnd(10 + k) * 6);
      // Si en ese lado la costa sale mucho, se prueba un poco más a un lado.
      for (const shift of [0, 0.35, -0.35, 0.7, -0.7]) {
        const a = turn + (k * Math.PI * 2) / count + (rnd(20 + k) - 0.5) * 0.5 + shift;
        let found: Islet | null = null;
        for (let d = this.radius * 0.95; d + r < this.radius * ISLET_REACH && !found; d += 2) {
          const x = Math.round(Math.cos(a) * d);
          const z = Math.round(Math.sin(a) * d);
          let clear = this.landMaskRaw(x, z) < 0;
          for (let i = 0; i < 24 && clear; i++) {
            const t = (i / 24) * Math.PI * 2;
            clear = this.landMaskRaw(x + Math.cos(t) * (r + 5), z + Math.sin(t) * (r + 5)) < 0;
          }
          if (clear && out.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r + 10)) found = { x, z, r };
        }
        if (found) {
          out.push(found);
          break;
        }
      }
    }
    return out;
  }

  /** Altura del suelo de un islote en (x, z), o null si ahí no hay islote. */
  private isletHeight(x: number, z: number): number | null {
    for (const i of this.islets) {
      const dx = x - i.x;
      const dz = z - i.z;
      if (Math.abs(dx) > i.r * 1.5 || Math.abs(dz) > i.r * 1.5) continue;
      const wobble = fbm(x / 9, z / 9, this.seed + 72, 2) - 0.5;
      const d = Math.hypot(dx, dz) / (i.r * (1 + wobble * 0.3));
      // Una meseta llana y ancha para construir, con su playa alrededor.
      if (d < 0.8) return SEA_LEVEL + 2;
      if (d < 1) return SEA_LEVEL + 1;
      if (d < 1.3) return SEA_LEVEL - 1;
    }
    return null;
  }

  /** El islote que hay en (x, z), contando su playa. */
  isletAt(x: number, z: number): Islet | undefined {
    return this.islets.find((i) => Math.hypot(x - i.x, z - i.z) < i.r * 1.25);
  }

  /** Lo lejos que llega lo que hay que dibujar en el horizonte y en el mapa: la isla y sus islotes. */
  get outerRadius(): number {
    return this.mystery ? this.radius : Math.ceil(this.radius * ISLET_REACH);
  }

  /** Medio lado de la isla en bloques, para saber cuánto ocupa el mapa (v4.4). */
  get islandRadius(): number {
    return this.radius;
  }

  /**
   * Lo que se ve desde el cielo en la columna (x, z), para el mapa (v4.4): el bloque de arriba (sin contar
   * flores ni hierba), su altura y, si es agua, lo honda que es. Donde aún no hay isla cargada se calcula
   * con el terreno de siempre, sin crear el trozo.
   */
  mapColumn(x: number, z: number): { block: number; y: number; depth: number } {
    const c = this.chunks.get(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    if (!c) {
      const h = this.naturalHeight(x, z);
      const level = this.waterLevel(x, z);
      if (h < level) return { block: Block.Water, y: level, depth: level - h };
      return { block: this.surfaceAt(x, z, h).top, y: h, depth: 0 };
    }
    const lx = x - c.cx * CHUNK;
    const lz = z - c.cz * CHUNK;
    for (let y = HEIGHT - 1; y > 0; y--) {
      const b = c.data[index(lx, y, lz)];
      if (b === Block.Air || isCross(b)) continue;
      if (!isWater(b)) return { block: b, y, depth: 0 };
      let floor = y;
      while (floor > 0 && isWater(c.data[index(lx, floor, lz)])) floor--;
      return { block: b, y, depth: y - floor };
    }
    return { block: Block.Air, y: 0, depth: 0 };
  }

  /** Si ya existe el trozo de isla de la columna (x, z): el agua no corre hacia los que aún no se han creado. */
  hasColumn(x: number, z: number): boolean {
    return this.chunks.has(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
  }

  /** Si el punto (x, y, z) está dentro del agua (por debajo de su superficie). */
  inWater(x: number, y: number, z: number): boolean {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);
    const b = this.getBlock(bx, by, bz);
    if (!isWater(b)) return false;
    return isWater(this.getBlock(bx, by + 1, bz)) || y - by < waterHeight(b);
  }

  /** Distancia en bloques al centro del río, que cruza la isla serpenteando. */
  private river(x: number, z: number): number {
    return this.riverAt(x, z).dist;
  }

  /** El río en coordenadas propias: `u` a lo largo y `dist` a su centro. */
  private riverAt(x: number, z: number): { dist: number; u: number } {
    if (this.mystery) return { dist: Infinity, u: 0 }; // las islas misteriosas no tienen río
    const a = columnRandom(2, 2, this.seed) * Math.PI;
    const u = x * Math.cos(a) + z * Math.sin(a);
    const v = -x * Math.sin(a) + z * Math.cos(a);
    return { dist: Math.abs(v - this.riverCenter(u)), u };
  }

  private riverCenter(u: number): number {
    const phase = columnRandom(3, 3, this.seed) * Math.PI * 2;
    return 14 * Math.sin(u / 23 + phase) + (fbm(u / 30, 0, this.seed + 5, 2) - 0.5) * 16;
  }

  /** Punto (x, z) del centro del río a la altura `u`. */
  private riverPoint(u: number): [number, number] {
    const a = columnRandom(2, 2, this.seed) * Math.PI;
    const v = this.riverCenter(u);
    return [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
  }

  /** Niveles del río a lo largo de `u` (terreno 2), calculados una vez. */
  private riverLevels: Int16Array | null = null;

  /**
   * Nivel del agua del río (terreno 2): el de la terraza por la que pasa, igual en todo su ancho.
   * Desde su punto más alto solo baja, así el agua cae en cascadas y nunca sube.
   */
  private riverLevel(u: number): number {
    const reach = Math.ceil(this.radius * 1.6);
    if (!this.riverLevels) {
      const levels = new Int16Array(reach * 2 + 1);
      for (let i = 0; i < levels.length; i++) {
        const [x, z] = this.riverPoint(i - reach);
        const mask = this.landMask(x, z);
        levels[i] = mask < 0.26 ? SEA_LEVEL : Math.max(SEA_LEVEL, this.landHeight(x, z, mask) - 2);
      }
      // El nacimiento: la mitad del tramo más alto. Hacia los dos lados el río solo puede bajar.
      // Si ese tramo es muy corto (un charquito entre dos cascadas), se baja un piso.
      let first = 0;
      let last = 0;
      for (;;) {
        const top = Math.max(...levels);
        first = levels.indexOf(top);
        last = first;
        while (last + 1 < levels.length && levels[last + 1] === top) last++;
        if (last - first >= 8 || top <= SEA_LEVEL) break;
        for (let i = first; i <= last; i++) levels[i] = top - 4;
      }
      const source = Math.floor((first + last) / 2);
      for (let i = source + 1; i < levels.length; i++) levels[i] = Math.min(levels[i], levels[i - 1]);
      for (let i = source - 1; i >= 0; i--) levels[i] = Math.min(levels[i], levels[i + 1]);
      this.riverLevels = levels;
    }
    const i = Math.round(u) + reach;
    return i < 0 || i >= this.riverLevels.length ? SEA_LEVEL : this.riverLevels[i];
  }

  heightAt(x: number, z: number): number {
    const plot = this.plotAt(x, z);
    return plot ? plot.y : this.naturalHeight(x, z);
  }

  private naturalHeight(x: number, z: number): number {
    const mask = this.landMask(x, z);
    if (mask < 0.14) {
      const islet = this.isletHeight(x, z);
      if (islet !== null) return islet;
      // El fondo del mar baja poco a poco desde la orilla (v4.0): un bloque más hondo cada dos o tres bloques.
      const out = (0.14 - this.landMaskRaw(x, z)) * this.radius * 0.45;
      if (out < 1.5) return SEA_LEVEL; // orilla, justo a ras del agua
      return SEA_LEVEL - Math.min(10, 1 + Math.floor((out - 1.5) / 3));
    }
    if (mask < 0.26) return SEA_LEVEL + 1; // playa

    if (this.terrain >= 2) {
      const { dist, u } = this.riverAt(x, z);
      if (dist < 6) {
        const level = this.riverLevel(u);
        // Hondo solo por el medio; hacia las orillas cubre cada vez menos (v4.0).
        if (dist < 1.2) return level - 2;
        if (dist < 2.6) return level - 1;
        if (dist < 3.6) return level + 1;
        // La orilla nunca queda por debajo del agua, para que el río no se derrame.
        return Math.max(level + 2, this.landHeight(x, z, mask));
      }
      return this.landHeight(x, z, mask);
    }

    const r = this.river(x, z);
    if (r < 1.2) return SEA_LEVEL - 2;
    if (r < 2.4) return SEA_LEVEL - 1;
    if (r < 3.6) return SEA_LEVEL + 1;
    if (this.mystery?.kind === 'volcan') return this.volcanoHeight(x, z, mask);
    return this.landHeight(x, z, mask);
  }

  /** El volcán: un cono en el centro de la isla con el cráter lleno de magma. */
  private volcanoHeight(x: number, z: number, mask: number): number {
    const base = this.landHeight(x, z, mask);
    const d = Math.hypot(x, z) + (fbm(x / 9, z / 9, this.seed + 61, 2) - 0.5) * 6;
    const cone = Math.round(26 - d * 1.1);
    if (d < 5) return SEA_LEVEL + 2 + 26 - 8; // cráter, más bajo que el borde
    return Math.max(base, SEA_LEVEL + 2 + cone);
  }

  /** Columna de roca volcánica (la ladera del volcán). */
  private isVolcanic(x: number, z: number): boolean {
    return this.mystery?.kind === 'volcan' && Math.hypot(x, z) < 24;
  }

  /** Terrazas con acantilados, como los niveles de Animal Crossing. En la montaña hay más pisos. */
  private landHeight(x: number, z: number, mask: number): number {
    const hills = fbm(x / 70, z / 70, this.seed, 3);
    let t = (mask - 0.26) / 0.74 * (0.5 + hills);
    if (this.terrain < 2) return SEA_LEVEL + 2 + (t > 0.85 ? 2 : t > 0.45 ? 1 : 0) * 4;
    t *= 1 + 1.6 * this.mountainWeight(x, z);
    const tier = t > 1.9 ? 4 : t > 1.3 ? 3 : t > 0.85 ? 2 : t > 0.45 ? 1 : 0;
    return SEA_LEVEL + 2 + tier * 4;
  }

  /** Ángulo alrededor del centro, deformado con ruido para que los biomas no tengan bordes rectos. */
  private biomeAngle(x: number, z: number): number {
    const a = Math.atan2(z, x) - this.biomeTurn + (fbm(x / 50, z / 50, this.seed + 40, 2) - 0.5) * 1.4;
    return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }

  /** 1 en el corazón de la montaña, 0 fuera; el pueblo del centro siempre queda llano. */
  private mountainWeight(x: number, z: number): number {
    const i = this.biomeOrder.findIndex((b) => TALL_BIOMES.includes(b));
    if (i < 0) return 0;
    const sector = (Math.PI * 2) / this.biomeOrder.length;
    const center = (i + 0.5) * sector;
    let d = Math.abs(this.biomeAngle(x, z) - center);
    d = Math.min(d, Math.PI * 2 - d);
    const around = Math.max(0, Math.min(1, (sector / 2 - d) / (sector / 4)));
    const out = Math.max(0, Math.min(1, (Math.hypot(x, z) / this.radius - 0.25) / 0.25));
    return around * out;
  }

  /** Bioma de (x, z) en las islas grandes; null en las de antes y en las misteriosas. */
  biomeAt(x: number, z: number): Biome | null {
    if (this.terrain < 2) return null;
    if (this.landMask(x, z) < 0.26) return 'playa';
    const n = this.biomeOrder.length;
    return this.biomeOrder[Math.floor(this.biomeAngle(x, z) / ((Math.PI * 2) / n)) % n];
  }

  private isBeach(h: number): boolean {
    return h <= SEA_LEVEL + 1;
  }

  /** Bloque de arriba y de debajo de una columna de altura `h`, y si es arena de playa o de río. */
  private surfaceAt(x: number, z: number, h: number): { top: Block; under: Block; beach: boolean; strata?: Block[] } {
    // Arena en la playa y en el fondo y las orillas del río (también el de las terrazas altas).
    const beach = this.isBeach(h) || (this.terrain >= 2 && h <= this.waterLevel(x, z) + 1 && this.river(x, z) < 3.6);
    if (beach) return { top: Block.Sand, under: Block.Sand, beach };
    if (this.climate) {
      const s = this.climateSurface(x, z, h);
      if (s) return { ...s, beach };
    }
    const kind = this.mystery?.kind;
    if (this.isVolcanic(x, z)) {
      const crater = Math.hypot(x, z) < 5 + (fbm(x / 9, z / 9, this.seed + 61, 2) - 0.5) * 6;
      // Ríos de lava que bajan por la ladera.
      const a = Math.atan2(z, x);
      const lava = fbm(Math.cos(a) * 3 + 7, Math.sin(a) * 3 + 7, this.seed + 66, 2) > 0.68 && Math.hypot(x, z) < 18;
      return { top: crater || lava ? Block.Magma : Block.Basalt, under: Block.Basalt, beach };
    }
    if (kind === 'nieve') {
      // Charcas heladas en las zonas bajas.
      const ice = h === SEA_LEVEL + 2 && fbm(x / 10, z / 10, this.seed + 62, 2) > 0.62;
      return { top: ice ? Block.Ice : Block.SnowGrass, under: Block.Dirt, beach };
    }
    // En la montaña los acantilados son de roca y las cumbres tienen nieve.
    if (this.terrain >= 2 && !this.plotAt(x, z) && this.biomeAt(x, z) === 'montaña') {
      const low = Math.min(this.heightAt(x + 1, z), this.heightAt(x - 1, z), this.heightAt(x, z + 1), this.heightAt(x, z - 1));
      if (h - low >= 4) return { top: Block.Stone, under: Block.Stone, beach };
      if (h >= SEA_LEVEL + 2 + 4 * 4) return { top: Block.SnowGrass, under: Block.Dirt, beach };
    }
    return { top: Block.Grass, under: Block.Dirt, beach };
  }

  /** Suelo de los biomas nuevos (v4.19); null para los de siempre (bosque, pradera, bambú, montaña). */
  private climateSurface(x: number, z: number, h: number): { top: Block; under: Block; strata?: Block[] } | null {
    const biome = this.biomeAt(x, z);
    if (this.plotAt(x, z)) return biome === 'desierto' || biome === 'cañon' ? { top: Block.Sand, under: Block.Sandstone } : null;
    const patch = fbm(x / 9, z / 9, this.seed + 71, 2);
    const cliff = () => h - Math.min(this.heightAt(x + 1, z), this.heightAt(x - 1, z), this.heightAt(x, z + 1), this.heightAt(x, z - 1)) >= 4;
    switch (biome) {
      case 'desierto':
        return { top: Block.Sand, under: Block.Sandstone };
      case 'sabana':
        return { top: patch > 0.62 ? Block.Grass : Block.DryGrass, under: Block.Dirt };
      case 'cañon':
        return { top: h >= SEA_LEVEL + 2 + 8 && patch > 0.5 ? Block.TerracottaOrange : Block.RedSand, under: Block.RedSand, strata: STRATA };
      case 'pantano':
        return { top: patch > 0.58 ? Block.Mud : Block.Grass, under: Block.Mud };
      case 'taiga':
        return { top: patch > 0.64 ? Block.Moss : Block.Grass, under: Block.Dirt };
      case 'tundra':
        return { top: patch > 0.6 ? Block.PowderSnow : Block.SnowGrass, under: Block.Dirt };
      case 'glaciar':
        return { top: patch > 0.66 ? Block.BlueIce : Block.PackedIce, under: Block.PackedIce };
      case 'picos':
        if (cliff()) return { top: Block.Stone, under: Block.Stone };
        return { top: h >= SEA_LEVEL + 2 + 8 ? Block.PowderSnow : Block.SnowGrass, under: Block.Dirt };
      case 'luminoso':
        return { top: Block.GlowGrass, under: Block.Dirt };
      case 'volcanico':
        return { top: patch > 0.6 ? Block.Ash : patch < 0.32 ? Block.Blackstone : Block.Basalt, under: Block.Blackstone, strata: VOLCANIC_STRATA };
      case 'setas':
        return { top: Block.Mycelium, under: Block.Dirt };
      default:
        return null;
    }
  }

  /** Plantas de los biomas nuevos (v4.19), encima del suelo. Devuelve si ha puesto algo. */
  private climatePlant(biome: Biome | null, top: Block, wx: number, wz: number, x: number, h: number, z: number, d: Uint8Array | Uint16Array): boolean {
    const r = columnRandom(wx, wz, this.seed + 11);
    const pick = blockRandom(wx, 14, wz, this.seed);
    const put = (b: Block, k = 1) => {
      if (h + k < HEIGHT) d[index(x, h + k, z)] = b;
    };
    switch (biome) {
      case 'desierto':
        if (top !== Block.Sand) return false;
        if (r < 0.012) {
          const tall = 1 + Math.floor(pick * 3);
          for (let k = 1; k <= tall; k++) put(Block.Cactus, k);
          if (pick > 0.6) put(Block.CactusFlower, tall + 1);
        } else if (r < 0.03) put(Block.DryShrub);
        return true;
      case 'cañon':
        if (r < 0.02) put(Block.DryShrub);
        else if (r < 0.026) put(Block.Cactus);
        return true;
      case 'sabana':
        if (r < 0.05) put(Block.DryShrub);
        else if (r < 0.16) put(Block.TallGrass);
        return true;
      case 'selva':
        if (top !== Block.Grass) return false;
        if (r < 0.3) put(pick < 0.08 ? Block.FlowerRed : pick < 0.14 ? Block.FlowerYellow : Block.TallGrass);
        return true;
      case 'pantano':
        if (r < 0.01) put(Block.SmallMushroom);
        else if (r < 0.14 && top === Block.Grass) put(Block.TallGrass);
        return true;
      case 'cerezos':
        if (top !== Block.Grass) return false;
        if (r < 0.12) put(pick < 0.5 ? Block.FlowerPink : pick < 0.75 ? Block.FlowerWhite : Block.TallGrass);
        return true;
      case 'taiga':
        if (r < 0.07) put(Block.TallGrass);
        else if (r < 0.08) put(Block.SmallMushroom);
        return true;
      case 'tundra':
        if (r < 0.03) put(Block.SnowFlower);
        else if (r < 0.06 && top === Block.SnowGrass) put(Block.DryShrub);
        return true;
      case 'glaciar':
      case 'picos':
        if (r < 0.01 && top === Block.SnowGrass) put(Block.SnowFlower);
        return true;
      case 'luminoso':
        if (r < 0.07) put(Block.GlowFlower);
        else if (r < 0.095) put(Block.GlowMushroom);
        return true;
      case 'volcanico':
        if (r < 0.012 && top !== Block.Ash) put(Block.DryShrub);
        return true;
      case 'setas':
        if (r < 0.05) put(Block.SmallMushroom);
        else if (r < 0.062) put(Block.GlowMushroom);
        return true;
      default:
        return false;
    }
  }

  private generate(chunk: Chunk) {
    const ox = chunk.cx * CHUNK;
    const oz = chunk.cz * CHUNK;
    const d = chunk.data;
    const heights = new Int16Array(CHUNK * CHUNK);

    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x;
        const wz = oz + z;
        const h = this.heightAt(wx, wz);
        heights[z * CHUNK + x] = h;
        const biome = this.biomeAt(wx, wz);
        const { top, under, beach, strata } = this.surfaceAt(wx, wz, h);
        // Bajo la isla hay cuevas, solo donde hay tierra firme encima.
        const caves = !beach && !this.plotAt(wx, wz, 2);
        for (let y = 0; y <= h; y++) {
          let b: Block;
          if (y === h) b = top;
          else if (y > h - 4) b = strata ? strata[y % strata.length] : under;
          else if (y > 0 && caves && y < h - 5 && this.isCave(wx, y, wz)) b = Block.Air;
          else if (y > 0) b = this.oreAt(wx, y, wz);
          else b = Block.Stone;
          d[index(x, y, z)] = b;
        }
        // Lagos y ríos de lava de las tierras volcánicas (v4.20), en el suelo llano.
        if (biome === 'volcanico' && !beach && !this.plotAt(wx, wz, 3) && this.river(wx, wz) > 5 &&
          (fbm(wx / 8, wz / 8, this.seed + 76, 2) > 0.64 || Math.abs(fbm(wx / 34, wz / 34, this.seed + 77, 2) - 0.5) < 0.018) &&
          SIDES.every(([dx, dz]) => this.heightAt(wx + dx, wz + dz) >= h)) {
          d[index(x, h, z)] = Block.Lava;
          d[index(x, h - 1, z)] = Block.Basalt;
          continue;
        }
        // Charcas del pantano (v4.19): agua de un bloque en el suelo llano, con nenúfares.
        if (biome === 'pantano' && !beach && h === SEA_LEVEL + 2 && !this.plotAt(wx, wz, 2) && fbm(wx / 7, wz / 7, this.seed + 72, 2) > 0.6 &&
          SIDES.every(([dx, dz]) => this.heightAt(wx + dx, wz + dz) >= h)) {
          d[index(x, h, z)] = Block.Water;
          d[index(x, h - 1, z)] = Block.Mud;
          if (columnRandom(wx, wz, this.seed + 73) < 0.12) d[index(x, h + 1, z)] = Block.LilyPad;
          continue;
        }
        // Plantas de los biomas nuevos (v4.19).
        if (this.climate && !beach && h + 1 < HEIGHT && !this.plotAt(wx, wz) && this.climatePlant(biome, top, wx, wz, x, h, z, d)) continue;
        // Flores y hierba alta sobre el césped. Hay zonas especiales: bosquecillos de bambú y praderas de flores.
        if (!beach && top === Block.Grass && h + 1 < HEIGHT && !this.plotAt(wx, wz) && this.mystery?.kind !== 'nieve') {
          const r = columnRandom(wx, wz, this.seed + 11);
          const patch = fbm(wx / 12, wz / 12, this.seed + 12, 2);
          const zone = this.zoneAt(wx, wz);
          let plant: Block = Block.Air;
          const kind = this.mystery?.kind;
          if (kind === 'cristal' && r < 0.035) {
            plant = Block.CrystalCluster;
          } else if (kind === 'setas' && r < 0.06) {
            plant = Block.SmallMushroom;
          } else if (zone === 'bambu' && r < 0.2) {
            // Cañas de 3 a 5 bloques.
            const tall = Math.min(3 + Math.floor(blockRandom(wx, 13, wz, this.seed) * 3), HEIGHT - h - 1);
            for (let k = 1; k <= tall; k++) d[index(x, h + k, z)] = Block.Bamboo;
          } else if (zone === 'pradera' && r < 0.32) {
            // Otro azar distinto de `r`, que con semillas parecidas sale parecido y saldrían siempre las mismas flores.
            plant = MEADOW_FLOWERS[Math.floor(blockRandom(wx, 14, wz, this.seed) * MEADOW_FLOWERS.length)];
          } else if (r < 0.025 && patch > 0.5) {
            plant = [Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite][Math.floor(patch * 30) % 3];
          } else if (r < (biome === 'bosque' ? 0.18 : 0.09)) {
            plant = Block.TallGrass;
          }
          if (plant) d[index(x, h + 1, z)] = plant;
        }
      }
    }

    // Árboles: se revisan también columnas vecinas para que las copas crucen el borde.
    const set = (lx: number, y: number, lz: number, b: Block, replace: boolean) => {
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 0 || y >= HEIGHT) return;
      const i = index(lx, y, lz);
      if (replace || d[i] === Block.Air || isCross(d[i])) d[i] = b;
    };
    for (let tz = -2; tz < CHUNK + 2; tz++) {
      for (let tx = -2; tx < CHUNK + 2; tx++) {
        const wx = ox + tx;
        const wz = oz + tz;
        const kind = this.treeAt(wx, wz);
        if (kind === 'fruit') this.placeFruitTree(wx, wz, tx, tz, set);
        else if (kind === 'palm') this.placePalm(this.heightAt(wx, wz) + 1, tx, tz, set);
        else if (kind === 'pine') for (const [dx, dy, dz, b, replace] of pineShape()) set(tx + dx, this.heightAt(wx, wz) + 1 + dy, tz + dz, b, replace);
        else if (kind === 'boulder') this.placeBoulder(wx, wz, tx, tz, set);
        else if (kind === 'mushroom') this.placeMushroom(wx, wz, tx, tz, set);
        else if (kind === 'spire') this.placeSpire(wx, wz, tx, tz, set);
        else if (kind === 'rock') this.placeRock(wx, wz, tx, tz, set);
        else if (kind) {
          const shape = kind === 'acacia' ? acaciaShape(Math.floor(columnRandom(wx, wz, this.seed + 74) * 4)) : kind === 'ceiba' ? ceibaShape() : kind === 'blossom' ? blossomShape()
            : kind === 'willow' ? willowShape() : kind === 'glow' ? glowShape() : kind === 'giant' ? this.giantMushroom(wx, wz) : kind === 'column' ? this.basaltColumn(wx, wz) : firShape();
          for (const [dx, dy, dz, b, replace] of shape) set(tx + dx, this.heightAt(wx, wz) + 1 + dy, tz + dz, b, replace);
        }
      }
    }

    // Entradas de cueva.
    for (const e of this.caveEntrances) {
      if (e.x + 90 < ox || e.x - 4 >= ox + CHUNK || e.z + 40 < oz || e.z - 40 >= oz + CHUNK) continue;
      this.carveEntrance(e, (x, y, z) => {
        // Solo bajo tierra firme: el túnel no se abre al fondo del mar.
        if (y > 0 && this.naturalHeight(x, z) > SEA_LEVEL + 1) set(x - ox, y, z - oz, Block.Air, true);
      });
    }

    // Casas de los vecinos.
    for (const plot of this.plots) {
      const r = plot.kind === 'museum' || plot.kind === 'shop' ? PLOT_RADIUS : 3;
      if (plot.x + r < ox || plot.x - r >= ox + CHUNK || plot.z + r < oz || plot.z - r >= oz + CHUNK) continue;
      this.buildHouse(plot, (x, y, z, b) => set(x - ox, y, z - oz, b, true));
    }

    // El mar y el río (v3.8): bloques de agua quieta donde el terreno natural queda bajo su nivel.
    /** Hasta qué altura llega el agua en cada columna (-1 si es tierra). */
    const waterUpTo = new Int16Array(CHUNK * CHUNK).fill(-1);
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x;
        const wz = oz + z;
        const level = this.waterLevel(wx, wz);
        if (this.naturalHeight(wx, wz) >= level) continue;
        waterUpTo[z * CHUNK + x] = level;
        // En las islas frías (v4.19) el río está helado por arriba.
        const frozen = this.climate === 'frio' && level > SEA_LEVEL - 1 && this.river(wx, wz) < 3.6 && this.landMask(wx, wz) >= 0.26;
        for (let y = heights[z * CHUNK + x] + 1; y <= level; y++) {
          const i = index(x, y, z);
          if (d[i] === Block.Air) d[i] = frozen && y === level ? Block.Ice : Block.Water;
        }
      }
    }

    // Manantiales (v3.9): en las islas de antes, el agua sale del borde de un acantilado alto y cae hasta el río.
    for (const s of this.springSpots()) {
      const x = s.x - ox;
      const z = s.z - oz;
      if (x >= 0 && x < CHUNK && z >= 0 && z < CHUNK) d[index(x, s.top, z)] = Block.Water;
    }
    this.findSpills(ox, oz);

    // Lo que el jugador cambió en este chunk.
    const edits = this.edits.get(key(chunk.cx, chunk.cz));
    if (edits) {
      for (const [i, b] of edits) {
        // Antes de la v3.8 el agua no eran bloques: un hueco hecho bajo el nivel del mar o del río era agua.
        // Así las islas guardadas se ven igual que antes (sin agujeros en el mar ni sótanos inundados de golpe).
        const column = i % (CHUNK * CHUNK);
        d[i] = b === Block.Air && Math.floor(i / (CHUNK * CHUNK)) <= waterUpTo[column] ? Block.Water : b;
      }
    }

    // En las islas extrañas (v4.20) la lava y las setas luminosas alumbran desde que salen.
    if (this.climate === 'extrano') {
      for (let i = 0; i < d.length; i++) {
        if (!GENERATED_LIGHTS.has(d[i])) continue;
        const x = i % CHUNK;
        const z = Math.floor(i / CHUNK) % CHUNK;
        const y = Math.floor(i / (CHUNK * CHUNK));
        this.torches.set(`${ox + x},${y},${oz + z}`, [ox + x, y, oz + z]);
      }
    }

    chunk.touch();
  }

  /**
   * Las cascadas (v3.9) son agua de verdad: donde el río baja de terraza o sale un manantial, el agua de arriba
   * queda junto a un hueco. Esos bordes se apuntan para que el agua corra y caiga como cualquier otra.
   * Se miran también las columnas de alrededor del trozo, por si el agua de un trozo ya cargado cae en este.
   */
  private findSpills(ox: number, oz: number) {
    const springs = this.springSpots();
    for (let z = -1; z <= CHUNK; z++) {
      for (let x = -1; x <= CHUNK; x++) {
        const wx = ox + x;
        const wz = oz + z;
        const inside = x >= 0 && x < CHUNK && z >= 0 && z < CHUNK;
        if (!inside && !this.hasColumn(wx, wz)) continue;
        const spring = springs.find((s) => s.x === wx && s.z === wz);
        const level = spring ? spring.top : this.waterLevel(wx, wz);
        if (!spring && this.naturalHeight(wx, wz) >= level) continue; // aquí no hay agua
        if (SIDES.some(([dx, dz]) => this.openAt(wx + dx, level, wz + dz))) this.spills.push([wx, level, wz]);
      }
    }
  }

  /** Si en (x, y, z) el terreno generado deja un hueco sin agua (por donde el agua de al lado se derramaría). */
  private openAt(x: number, y: number, z: number): boolean {
    if (this.heightAt(x, z) >= y) return false;
    return !(this.naturalHeight(x, z) < this.waterLevel(x, z) && this.waterLevel(x, z) >= y);
  }

  /** Los bordes de agua que hay que mover desde la última vez (y se olvidan). */
  takeSpills(): [number, number, number][] {
    const s = this.spills;
    this.spills = [];
    return s;
  }

  private springSpots(): WaterfallSpot[] {
    if (!this.springs) this.springs = this.terrain >= 2 || this.mystery ? [] : this.waterfallSpots(2);
    return this.springs;
  }

  /** Casita de 5x5 con tejado a cuatro aguas, ventanas y la puerta hacia +z. La parcela del jugador empieza con una tienda de campaña. */
  private buildHouse(p: Plot, put: (x: number, y: number, z: number, b: Block) => void) {
    const { x, z, y } = p;
    if (p.kind === 'player') {
      buildTent(x, y, z, put);
      return;
    }
    const big = bigBuilding(p);
    if (big) {
      const [mx, my, mz] = big.origin;
      for (const [dx, dy, dz, b] of templateCells(big.template, 0)) if (b !== null) put(mx + dx, my + dy, mz + dz, b);
      return;
    }
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        put(x + dx, y, z + dz, Block.Planks);
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        // La tienda es de madera, para distinguirla de las casas.
        const wall = p.kind === 'shop' ? Block.ShopWall : Block.Wall;
        for (let h = 1; h <= 3; h++) put(x + dx, y + h, z + dz, edge ? wall : Block.Air);
      }
    }
    // Puerta de verdad (v4.0: antes era solo un hueco) y ventanas a los lados y detrás.
    put(x, y + 1, z + 2, Block.Door);
    put(x, y + 2, z + 2, Block.DoorTop);
    put(x - 2, y + 2, z, Block.Window);
    put(x + 2, y + 2, z, Block.Window);
    put(x, y + 2, z - 2, Block.Window);
    // Tejado: tres capas que se van cerrando.
    for (let layer = 0; layer < 3; layer++) {
      const r = 3 - layer;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (layer < 2 && Math.abs(dx) < 2 && Math.abs(dz) < 2) continue; // hueco por dentro
          put(x + dx, y + 4 + layer, z + dz, p.roof);
        }
      }
    }
  }

  /** Parcela del jugador, si la isla tiene sitio para ella. */
  get playerPlot(): Plot | undefined {
    return this.plots.find((p) => p.kind === 'player');
  }

  /**
   * Rehace la casa del jugador con el tamaño de su nivel (1: 5x5, 2: 7x7, 3: 9x9).
   * Se guarda como cambios del jugador, igual que si la hubiera construido a mano.
   * `put` permite que los bloques pasen por WorldSync y lleguen también a los demás jugadores.
   */
  buildPlayerHouse(level: number, roof: Block, put: (x: number, y: number, z: number, b: Block) => void = (x, y, z, b) => this.setBlock(x, y, z, b)) {
    const p = this.playerPlot;
    if (!p) return;
    const { x, y, z } = p;
    const half = level + 1;
    const set = (bx: number, by: number, bz: number, b: Block) => {
      if (this.getBlock(bx, by, bz) !== b) put(bx, by, bz, b);
    };
    // Quitar lo que hubiera (la tienda de campaña o la casa anterior, que siempre es más pequeña).
    for (let dy = 1; dy <= half + 6; dy++) {
      for (let dz = -half - 1; dz <= half + 1; dz++) {
        for (let dx = -half - 1; dx <= half + 1; dx++) {
          const old = this.getBlock(x + dx, y + dy, z + dz);
          if (HOUSE_BLOCKS.includes(old) || (isDoor(old) && dx === 0 && dz === half - 1)) set(x + dx, y + dy, z + dz, Block.Air);
        }
      }
    }
    for (let dz = -half; dz <= half; dz++) {
      for (let dx = -half; dx <= half; dx++) {
        set(x + dx, y, z + dz, Block.Planks);
        const edge = Math.abs(dx) === half || Math.abs(dz) === half;
        for (let h = 1; h <= 3; h++) set(x + dx, y + h, z + dz, edge ? Block.Wall : Block.Air);
      }
    }
    // Puerta delante y ventanas repartidas por las paredes.
    set(x, y + 1, z + half, Block.Door);
    set(x, y + 2, z + half, Block.DoorTop);
    for (let o = -half + 1; o < half; o++) {
      if (o % 2 !== 0) continue;
      set(x - half, y + 2, z + o, Block.Window);
      set(x + half, y + 2, z + o, Block.Window);
      set(x + o, y + 2, z - half, Block.Window);
      if (o !== 0) set(x + o, y + 2, z + half, Block.Window);
    }
    // Tejado a cuatro aguas: capas que se van cerrando, huecas por dentro.
    for (let layer = 0; layer <= half; layer++) {
      const r = half + 1 - layer;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (layer < half && Math.max(Math.abs(dx), Math.abs(dz)) < r - 1) continue;
          set(x + dx, y + 4 + layer, z + dz, roof);
        }
      }
    }
    p.roof = roof;
  }

  /** Túneles (dos ruidos que se cruzan) y alguna sala grande. */
  private isCave(x: number, y: number, z: number): boolean {
    const a = valueNoise3(x / 14, y / 7, z / 14, this.seed + 20);
    const b = valueNoise3(x / 10, y / 6, z / 10, this.seed + 21);
    if (Math.abs(a - 0.5) < 0.06 && Math.abs(b - 0.5) < 0.12) return true;
    return y < 12 && valueNoise3(x / 18, y / 9, z / 18, this.seed + 22) > 0.8;
  }

  /** Piedra o mineral: cuanto más hondo, más raro y valioso. */
  private oreAt(x: number, y: number, z: number): Block {
    const r = blockRandom(x, y, z, this.seed);
    if (y <= 6 && r < 0.004) return Block.GemOre;
    if (y <= 9 && r < 0.008) return Block.GoldOre;
    if (y <= 14 && r < 0.02) return Block.IronOre;
    if (r < 0.035) return Block.CoalOre;
    return Block.Stone;
  }

  /**
   * Zonas especiales de la isla, lejos de la playa y del río: bosquecillo de bambú o pradera de flores.
   * Solo cambian las plantas, no el terreno, así las islas guardadas siguen encajando.
   */
  zoneAt(x: number, z: number): 'bambu' | 'pradera' | null {
    if (this.landMask(x, z) < 0.35 || this.river(x, z) < 6) return null;
    if (this.terrain >= 2) {
      const biome = this.biomeAt(x, z);
      if (biome === 'pradera') return 'pradera';
      if (biome === 'bambu') return fbm(x / 20, z / 20, this.seed + 21, 2) > 0.42 ? 'bambu' : null;
      return null;
    }
    if (this.mystery?.kind === 'flores') return 'pradera';
    if (this.mystery?.kind === 'bambu') return fbm(x / 20, z / 20, this.seed + 21, 2) > 0.45 ? 'bambu' : 'pradera';
    if (fbm(x / 34, z / 34, this.seed + 21, 2) > 0.66) return 'bambu';
    if (fbm(x / 40, z / 40, this.seed + 22, 2) > 0.65) return 'pradera';
    return null;
  }

  private treeAt(x: number, z: number): 'fruit' | 'palm' | 'rock' | 'pine' | 'boulder' | 'mushroom' | 'spire' | 'acacia' | 'ceiba' | 'blossom' | 'willow' | 'fir' | 'glow' | 'giant' | 'column' | null {
    if (this.plotAt(x, z, 3) || this.zoneAt(x, z) === 'bambu') return null;
    const r = columnRandom(x, z, this.seed);
    const h = this.heightAt(x, z);
    if (this.terrain >= 2) {
      // Cada bioma con sus árboles: bosque espeso, pinos en la montaña, pocos árboles en la pradera.
      const biome = this.biomeAt(x, z);
      if (biome === 'playa' || h === SEA_LEVEL + 1) return h === SEA_LEVEL + 1 && r < 0.012 && this.climate !== 'frio' ? 'palm' : null;
      if (this.climate && this.river(x, z) > 6) {
        const top = this.surfaceAt(x, z, h).top;
        if (biome === 'desierto') return top === Block.Sand && r < 0.003 ? 'palm' : null;
        if (biome === 'sabana') return top !== Block.Stone && r < 0.008 ? 'acacia' : null;
        if (biome === 'selva') return top !== Block.Grass ? null : r < 0.011 ? 'ceiba' : r < 0.017 ? 'fruit' : null;
        if (biome === 'cerezos') return top !== Block.Grass ? null : r < 0.022 ? 'blossom' : r < 0.026 ? 'fruit' : null;
        if (biome === 'pantano') return top === Block.Grass && r < 0.014 ? 'willow' : null;
        if (biome === 'taiga') return top !== Block.Stone && r < 0.016 ? 'fir' : null;
        if (biome === 'tundra') return r < 0.003 ? 'fir' : null;
        if (biome === 'picos') return top === Block.SnowGrass && r < 0.012 ? 'fir' : r > 0.993 ? 'boulder' : null;
        if (biome === 'glaciar' || biome === 'cañon') return null;
        if (biome === 'luminoso') return top === Block.GlowGrass && r < 0.02 ? 'glow' : null;
        if (biome === 'setas') return top === Block.Mycelium && r < 0.02 ? 'giant' : null;
        if (biome === 'volcanico') return r < 0.012 ? 'column' : null;
      }
      if (this.river(x, z) <= 6 || this.surfaceAt(x, z, h).top !== Block.Grass) return null;
      if (biome === 'bosque') return r < 0.022 ? 'fruit' : r < 0.04 ? 'pine' : null;
      if (biome === 'montaña') return r < 0.025 ? 'pine' : r > 0.993 ? 'boulder' : null;
      if (biome === 'pradera') return r < 0.004 ? 'fruit' : null;
      return r < 0.006 ? 'fruit' : null;
    }
    if (h === SEA_LEVEL + 1 && r < 0.008) return 'palm';
    const kind = this.mystery?.kind;
    if (kind === 'volcan' || kind === 'nieve' || kind === 'setas' || kind === 'cristal') {
      if (h === SEA_LEVEL + 1) return r < 0.01 && kind !== 'nieve' ? 'palm' : null;
      if (this.isVolcanic(x, z) || this.surfaceAt(x, z, h).top === Block.Ice) return null;
      if (kind === 'nieve') return r < 0.012 ? 'pine' : null;
      if (kind === 'setas') return r < 0.016 ? 'mushroom' : r < 0.02 ? 'fruit' : null;
      if (kind === 'cristal') return r < 0.006 ? 'fruit' : r > 0.99 ? 'rock' : r > 0.978 ? 'spire' : null;
      return r < 0.008 ? 'fruit' : r > 0.99 ? 'rock' : null;
    }
    // Las islas misteriosas de fruta están llenas de árboles; las de minerales, de rocas con vetas.
    const fruit = kind === 'frutas' ? 0.03 : 0.006;
    if (h > SEA_LEVEL + 1 && this.river(x, z) > 6 && r < fruit) return 'fruit';
    if (kind === 'minerales' && h > SEA_LEVEL + 1 && r > 0.985) return 'rock';
    return null;
  }

  /** Seta gigante del bosque de setas (v4.20): tallo alto y sombrero ancho, rojo, azul o morado, como una plataforma. */
  private giantMushroom(wx: number, wz: number): [number, number, number, Block, boolean][] {
    const out: [number, number, number, Block, boolean][] = [];
    const tall = 5 + Math.floor(columnRandom(wx, wz, this.seed + 78) * 5);
    const cap = [Block.MushroomCap, Block.MushroomCapBlue, Block.MushroomCapPurple][Math.floor(columnRandom(wx, wz, this.seed + 79) * 3)];
    const radius = tall > 7 ? 3 : 2;
    for (let y = 0; y < tall; y++) out.push([0, y, 0, Block.MushroomStem, true]);
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dz * dz > radius * radius + 1) continue;
        out.push([dx, tall, dz, cap, false]);
        // Borde que cuelga un poco.
        if (dx * dx + dz * dz > (radius - 1) * (radius - 1) + 1) out.push([dx, tall - 1, dz, cap, false]);
      }
    }
    return out;
  }

  /** Columna de basalto de las tierras volcánicas (v4.20), a veces con magma en lo alto. */
  private basaltColumn(wx: number, wz: number): [number, number, number, Block, boolean][] {
    const tall = 2 + Math.floor(columnRandom(wx, wz, this.seed + 80) * 6);
    const out: [number, number, number, Block, boolean][] = [];
    for (let y = 0; y < tall; y++) out.push([0, y, 0, Block.Basalt, true]);
    if (tall > 5) out.push([0, tall, 0, Block.Magma, true]);
    return out;
  }

  /** Roca de 2x2 con vetas de minerales, que asoma del suelo en las islas misteriosas. */
  private placeRock(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    const ores = [Block.Stone, Block.Stone, Block.CoalOre, Block.IronOre, Block.IronOre, Block.GoldOre, Block.GemOre];
    for (let dy = 0; dy < 2; dy++) {
      for (let dz = 0; dz < 2; dz++) {
        for (let dx = 0; dx < 2; dx++) {
          if (dy === 1 && dx + dz === 2) continue;
          const b = ores[Math.floor(blockRandom(wx + dx, base + dy, wz + dz, this.seed + 31) * ores.length)];
          set(tx + dx, base + dy, tz + dz, b, true);
        }
      }
    }
  }

  /** Seta gigante: tallo de 3 a 5 y un sombrero rojo con lunares. */
  private placeMushroom(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    const tall = 3 + Math.floor(columnRandom(wx, wz, this.seed + 63) * 3);
    for (let y = 0; y < tall; y++) set(tx, base + y, tz, Block.MushroomStem, true);
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        set(tx + dx, base + tall, tz + dz, Block.MushroomCap, false);
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) set(tx + dx, base + tall + 1, tz + dz, Block.MushroomCap, false);
      }
    }
  }

  /** Aguja de amatista que brilla, con cristales más pequeños alrededor. */
  private placeSpire(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    const tall = 3 + Math.floor(columnRandom(wx, wz, this.seed + 64) * 5);
    for (let y = 0; y < tall; y++) set(tx, base + y, tz, Block.Amethyst, true);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const h = Math.floor(blockRandom(wx + dx, base, wz + dz, this.seed + 65) * 3);
      for (let y = 0; y < h; y++) set(tx + dx, base + y, tz + dz, Block.Amethyst, true);
      set(tx + dx, base + h, tz + dz, Block.CrystalCluster, false);
    }
  }

  /** Pedrusco de adoquín y piedra en la montaña. */
  private placeBoulder(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1], [0, 1, 0]]) {
      set(tx + dx, base + dy, tz + dz, blockRandom(wx + dx, base + dy, wz + dz, this.seed + 33) < 0.5 ? Block.Cobble : Block.Stone, true);
    }
  }

  private placeFruitTree(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    for (const [dx, dy, dz, b, replace] of fruitTreeShape(this.fruit, columnRandom(wx, wz, this.seed + 9))) set(tx + dx, base + dy, tz + dz, b, replace);
  }

  private placePalm(base: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    for (const [dx, dy, dz, b, replace] of palmShape()) set(tx + dx, base + dy, tz + dz, b, replace);
  }

  private getChunk(cx: number, cz: number): Chunk {
    const k = key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Chunk(cx, cz);
      this.generate(c);
      this.chunks.set(k, c);
      this.findGeneratedLights(c);
    }
    return c;
  }

  /** La roca de magma y los cristales que salen al generar la isla también alumbran. */
  private findGeneratedLights(c: Chunk) {
    const kind = this.mystery?.kind;
    if (kind !== 'volcan' && kind !== 'cristal') return;
    let found = false;
    for (let i = 0; i < c.data.length; i++) {
      if (!LIGHT_RADIUS[c.data[i] as Block]) continue;
      const x = c.cx * CHUNK + (i % CHUNK);
      const z = c.cz * CHUNK + (Math.floor(i / CHUNK) % CHUNK);
      const y = Math.floor(i / (CHUNK * CHUNK));
      this.torches.set(`${x},${y},${z}`, [x, y, z]);
      found = true;
    }
    if (found) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) this.markDirty(c.cx + dx, c.cz + dz);
  }

  // --- Acceso a bloques ---

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= HEIGHT) return Block.Air;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    return c.data[index(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  setBlock(x: number, y: number, z: number, b: Block) {
    if (y < 0 || y >= HEIGHT) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    const i = index(lx, y, lz);
    const before = c.data[i];
    c.data[i] = b;
    c.touch();
    c.sky = null;
    this.mesher?.post({ t: 'set', x, y, z, b });

    // Una luz nueva (o quitada), o un bloque que tapa o destapa una luz cercana, cambia la luz de alrededor.
    if (LIGHT_RADIUS[b] || LIGHT_RADIUS[before as Block]) {
      const k = `${x},${y},${z}`;
      if (LIGHT_RADIUS[b]) this.torches.set(k, [x, y, z]);
      else this.torches.delete(k);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
    } else if (isOpaque(b) !== isOpaque(before)) {
      // Tapar o destapar el paso de la luz cambia la luz del cielo y de las antorchas hasta 15 bloques más allá.
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
    } else {
      for (const [tx, ty, tz] of [...this.torches.values(), ...this.lamps.values()]) {
        if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tz - z) > MAX_LIGHT) continue;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
        break;
      }
    }

    const k = key(cx, cz);
    let m = this.edits.get(k);
    if (!m) this.edits.set(k, (m = new Map()));
    m.set(i, b);
    this.revision++;

    // Si el bloque toca un borde, el chunk vecino también tiene que redibujarse.
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK - 1) this.markDirty(cx, cz + 1);

    this.onBlockChange?.(x, y, z);

    // Una planta sin suelo debajo desaparece.
    if (b === Block.Air && y + 1 < HEIGHT && isCross(this.getBlock(x, y + 1, z))) {
      const above = this.getBlock(x, y + 1, z);
      if (!FRUITS.includes(above as (typeof FRUITS)[number]) && above !== Block.Coconut) this.setBlock(x, y + 1, z, Block.Air);
    }
  }

  /** Cambios del jugador dentro de un rectángulo (todas las alturas): [x, y, z, bloque]. Para mudar parcelas (v4.14). */
  editsIn(x0: number, z0: number, x1: number, z1: number): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    for (let cz = Math.floor(z0 / CHUNK); cz <= Math.floor(z1 / CHUNK); cz++) {
      for (let cx = Math.floor(x0 / CHUNK); cx <= Math.floor(x1 / CHUNK); cx++) {
        const m = this.edits.get(key(cx, cz));
        if (!m) continue;
        for (const [i, b] of m) {
          const x = cx * CHUNK + (i % CHUNK);
          const z = cz * CHUNK + (Math.floor(i / CHUNK) % CHUNK);
          const y = Math.floor(i / (CHUNK * CHUNK));
          if (x >= x0 && x <= x1 && z >= z0 && z <= z1) out.push([x, y, z, b]);
        }
      }
    }
    return out;
  }

  /** Como clearEdit con muchas casillas a la vez: cada chunk se vuelve a generar una sola vez. */
  clearEdits(cells: [number, number, number][]) {
    const touched = new Set<string>();
    for (const [x, y, z] of cells) {
      const cx = Math.floor(x / CHUNK);
      const cz = Math.floor(z / CHUNK);
      const k = key(cx, cz);
      if (!this.edits.get(k)?.delete(index(x - cx * CHUNK, y, z - cz * CHUNK))) continue;
      this.mesher?.post({ t: 'clear', x, y, z });
      touched.add(k);
    }
    for (const k of touched) {
      const c = this.chunks.get(k);
      if (!c) continue;
      c.data.fill(0);
      this.generate(c);
    }
  }

  /** Deshace el cambio del jugador en (x, y, z), por ejemplo para que vuelva a crecer una fruta. */
  clearEdit(x: number, y: number, z: number) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const m = this.edits.get(key(cx, cz));
    if (!m) return;
    m.delete(index(x - cx * CHUNK, y, z - cz * CHUNK));
    this.mesher?.post({ t: 'clear', x, y, z });
    // Si el chunk ya existe, se vuelve a generar para recuperar el bloque original.
    const k = key(cx, cz);
    const c = this.chunks.get(k);
    if (c) {
      c.data.fill(0);
      this.generate(c);
    }
  }

  /** Busca un árbol a partir de un bloque de tronco u hojas y devuelve dónde está su fruta. */
  treeFruitsNear(x: number, y: number, z: number): [number, number, number][] {
    const found: [number, number, number][] = [];
    for (let dy = -4; dy <= 6; dy++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          const b = this.getBlock(x + dx, y + dy, z + dz);
          if ((FRUITS as readonly number[]).includes(b) || b === Block.Coconut) found.push([x + dx, y + dy, z + dz]);
        }
      }
    }
    return found;
  }

  /**
   * Sitios para cascadas en las islas de antes: donde el río pasa pegado a un acantilado alto.
   * Ahí sale un manantial (v3.9). En las islas grandes las cascadas las hace el río al bajar de terraza.
   * Devuelve la columna del acantilado (x, z), su altura (`top`), la del suelo al pie (`bottom`)
   * y hacia dónde cae el agua (`dx`, `dz`: del acantilado al río).
   */
  waterfallSpots(count: number): WaterfallSpot[] {
    const found: WaterfallSpot[] = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let tries = 0; tries < 3000 && found.length < count; tries++) {
      const a = columnRandom(tries, 91, this.seed) * Math.PI * 2;
      const dist = columnRandom(tries, 92, this.seed) * this.radius * 0.8;
      const x = Math.round(Math.cos(a) * dist);
      const z = Math.round(Math.sin(a) * dist);
      if (this.river(x, z) >= 2.2 || this.landMask(x, z) < 0.3) continue;
      for (const [dx, dz] of dirs) {
        // Mirar hacia fuera del río: orilla y, justo detrás, el acantilado.
        const cx = x - dx * 3;
        const cz = z - dz * 3;
        const top = this.naturalHeight(cx, cz);
        const bottom = this.naturalHeight(cx + dx, cz + dz);
        if (top < SEA_LEVEL + 6 || top - bottom < 4 || this.plotAt(cx, cz, 2)) continue;
        if (found.some((f) => Math.hypot(f.x - x, f.z - z) < 40)) continue;
        found.push({ x: cx, z: cz, top, bottom, dx, dz });
        break;
      }
    }
    return found;
  }

  /** Columnas de playa al aire libre, elegidas con `random`, para dejar conchas. */
  beachSpots(count: number, random: () => number): [number, number, number][] {
    const spots: [number, number, number][] = [];
    for (let tries = 0; tries < count * 200 && spots.length < count; tries++) {
      const a = random() * Math.PI * 2;
      const d = this.radius * (0.5 + random() * 0.6);
      const x = Math.floor(Math.cos(a) * d);
      const z = Math.floor(Math.sin(a) * d);
      const h = this.heightAt(x, z);
      if (h !== SEA_LEVEL + 1) continue;
      if (this.getBlock(x, h, z) !== Block.Sand || this.getBlock(x, h + 1, z) !== Block.Air) continue;
      spots.push([x, h + 1, z]);
    }
    return spots;
  }

  private markDirty(cx: number, cz: number) {
    const c = this.chunks.get(key(cx, cz));
    if (c) c.touch();
  }

  // --- Carga alrededor del jugador ---

  /**
   * Usa otro hilo para dibujar las mallas (v4.7). El hilo tiene su propia copia del mundo, que se mantiene igual
   * mandándole cada cambio; aquí solo se ponen en la escena las mallas que devuelve.
   */
  attachMesher(link: MesherLink) {
    this.mesher = link;
    this.inFlight.clear();
    link.post({ t: 'init', seed: this.seed, edits: this.exportEdits(), options: { ...this.options, guests: [...this.guestSpots] }, lamps: [...this.lamps.values()] });
  }

  /** Deja de usar el hilo de dibujo (si falla): se vuelve a dibujar aquí. */
  detachMesher() {
    this.mesher = null;
    this.inFlight.clear();
  }

  get usesMesher(): boolean {
    return this.mesher !== null;
  }

  /** Llega una malla del hilo de dibujo. Si el chunk ha cambiado desde que se pidió, se descarta y se pide otra. */
  receiveMesh(r: MesherResult) {
    const k = key(r.cx, r.cz);
    if (this.inFlight.get(k) === r.stamp) this.inFlight.delete(k);
    let c = this.chunks.get(k);
    if (!c) {
      // Aquí aún no se había generado: se usan los bloques que ha generado el otro hilo (son los mismos).
      if (!r.blocks) return;
      c = new Chunk(r.cx, r.cz);
      c.data.set(r.blocks);
      this.chunks.set(k, c);
      c.stamp = r.stamp;
      this.findSpills(r.cx * CHUNK, r.cz * CHUNK);
      this.findGeneratedLights(c);
    }
    if (c.stamp !== r.stamp) return;
    this.applyMesh(c, r);
  }

  /** Olvida un chunk (sus cambios siguen guardados aparte y se vuelven a aplicar al generarlo otra vez). */
  dropChunk(cx: number, cz: number) {
    const k = key(cx, cz);
    const c = this.chunks.get(k);
    if (!c) return;
    this.disposeMesh(c);
    this.chunks.delete(k);
    this.inFlight.delete(k);
  }

  /** Copia de los bloques de un chunk (generándolo si hace falta), para mandarla a otro hilo. */
  chunkBlocks(cx: number, cz: number): BlockData {
    return this.getChunk(cx, cz).data.slice();
  }

  /** Chunks con bloques en memoria (para el panel de rendimiento). */
  get loadedChunks(): number {
    return this.chunks.size;
  }

  get meshedChunks(): number {
    let n = 0;
    for (const c of this.chunks.values()) if (c.mesh) n++;
    return n;
  }

  /** Genera y dibuja chunks cerca de (x, z). Reconstruye como mucho `budget` mallas ya visibles por llamada. */
  update(x: number, z: number, radius: number, budget = 2) {
    const pcx = Math.floor(x / CHUNK);
    const pcz = Math.floor(z / CHUNK);
    const now = performance.now();

    const wanted: [number, number, number][] = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = dx * dx + dz * dz;
        if (dist > radius * radius) continue;
        wanted.push([pcx + dx, pcz + dz, dist]);
      }
    }
    wanted.sort((a, b) => a[2] - b[2]);

    if (this.mesher) {
      // Con hilo de dibujo: se piden las mallas más cercanas primero, unas pocas a la vez.
      for (const [cx, cz] of wanted) {
        const k = key(cx, cz);
        const c = this.chunks.get(k);
        if (c) c.seen = now;
        if (c && !c.dirty) continue;
        if (this.inFlight.has(k)) continue;
        if (this.inFlight.size >= MAX_IN_FLIGHT) break;
        const stamp = c?.stamp ?? -1;
        this.inFlight.set(k, stamp);
        this.mesher.post({ t: 'mesh', cx, cz, stamp, blocks: !c });
      }
      // Si el chunk cambió mientras se dibujaba, la malla que llegue no vale: se puede pedir otra.
      for (const [k, stamp] of this.inFlight) {
        const c = this.chunks.get(k);
        if (c && c.stamp !== stamp && stamp !== -1) this.inFlight.delete(k);
      }
    } else {
      // Cada chunk tarda unos milisegundos en dibujarse: mientras se juega se hacen pocos por fotograma
      // para que no haya tirones al caminar por islas grandes; al cargar (sin suelo aún) se hacen más.
      const loading = !this.isReady(x, z);
      const until = now + (loading ? 60 : MESH_MS);
      let built = 0;
      for (const [cx, cz] of wanted) {
        const c = this.getChunk(cx, cz);
        c.seen = now;
        if (!c.dirty) continue;
        if (built >= budget && c.mesh) continue; // los ya visibles pueden esperar un fotograma
        this.buildMesh(c);
        built++;
        if (built >= budget * 4 || performance.now() > until) break;
      }
    }

    // Quitar de la escena los chunks lejanos (los cambios se guardan aparte).
    const far = (radius + 2) * (radius + 2);
    // Y soltar de la memoria los que llevan un rato muy lejos: al volver se generan otra vez con los cambios (v4.7).
    const gone = (radius + UNLOAD_MARGIN) * (radius + UNLOAD_MARGIN);
    const drop: [number, number][] = [];
    for (const c of this.chunks.values()) {
      const dx = c.cx - pcx;
      const dz = c.cz - pcz;
      const d = dx * dx + dz * dz;
      if (c.mesh && d > far) {
        this.disposeMesh(c);
        c.touch();
      }
      if (d > gone && now - c.seen > UNLOAD_AFTER_MS) drop.push([c.cx, c.cz]);
    }
    for (const [cx, cz] of drop) {
      this.dropChunk(cx, cz);
      this.mesher?.post({ t: 'drop', cx, cz });
    }
  }

  /** True cuando el chunk bajo (x, z) ya tiene malla, para colocar al jugador. */
  isReady(x: number, z: number): boolean {
    const c = this.chunks.get(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    return !!c && !!c.mesh;
  }

  /** Parte de los chunks cercanos (dentro de `radius`) que ya se ven, de 0 a 1. Para la barra de carga. */
  loadedFraction(x: number, z: number, radius: number): number {
    const pcx = Math.floor(x / CHUNK);
    const pcz = Math.floor(z / CHUNK);
    let total = 0;
    let ready = 0;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dz * dz > radius * radius) continue;
        total++;
        if (this.chunks.get(key(pcx + dx, pcz + dz))?.mesh) ready++;
      }
    }
    return ready / total;
  }

  /** Busca, en espiral desde (x, z), una columna con hierba arriba y aire encima. */
  findSpawn(x: number, z: number): [number, number] {
    for (let r = 0; r < 60; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const wx = x + dx;
          const wz = z + dz;
          const h = this.heightAt(wx, wz);
          const above = this.getBlock(wx, h + 1, wz);
          if (this.getBlock(wx, h, wz) !== Block.Grass || isSolid(above)) continue;
          // Cielo despejado encima, para no aparecer sobre la copa de un árbol.
          let clear = true;
          for (let y = h + 2; y < HEIGHT && clear; y++) clear = this.getBlock(wx, y, wz) === Block.Air;
          if (clear) return [wx, wz];
        }
      }
    }
    return [x, z];
  }

  // --- Luz ---

  /** Altura del bloque opaco más alto de la columna (x, z). */
  skyHeight(x: number, z: number): number {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    if (!c.sky) {
      c.sky = new Int16Array(CHUNK * CHUNK).fill(-1);
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          for (let y = HEIGHT - 1; y >= 0; y--) {
            if (isOpaque(c.data[index(lx, y, lz)])) {
              c.sky[lz * CHUNK + lx] = y;
              break;
            }
          }
        }
      }
    }
    return c.sky[(z - cz * CHUNK) * CHUNK + (x - cx * CHUNK)];
  }

  /** Pone (nivel > 0) o quita (0) una luz que no es un bloque, como la bombilla de una farola. */
  setLamp(x: number, y: number, z: number, level: number) {
    const k = `${x},${y},${z}`;
    if (level > 0) this.lamps.set(k, [x, y, z, Math.min(MAX_LIGHT, level)]);
    else if (!this.lamps.delete(k)) return;
    this.mesher?.post({ t: 'lamp', x, y, z, level });
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
  }

  /**
   * Luz del cielo alrededor de un chunk, de 0 a 1 (v3.1). Al aire libre es 1; bajo un techo o en una cueva
   * entra por los huecos y baja un nivel por cada bloque, así que la boca de una cueva se va oscureciendo
   * poco a poco en vez de cortarse de golpe.
   */
  private skyLightRegion(ox: number, oz: number): (x: number, y: number, z: number) => number {
    const R = MAX_LIGHT;
    const W = CHUNK + 2 * R;
    const x0 = ox - R;
    const z0 = oz - R;
    const get = this.regionBlocks(ox, oz);
    const tops = new Int16Array(W * W);
    for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) tops[z * W + x] = this.skyHeight(x0 + x, z0 + z);
    const grid = new Uint8Array(W * W * HEIGHT);
    const at = (x: number, y: number, z: number) => (y * W + (z - z0)) * W + (x - x0);
    const queue: number[] = [];
    for (let z = 0; z < W; z++) {
      for (let x = 0; x < W; x++) {
        const top = tops[z * W + x];
        for (let y = top + 1; y < HEIGHT; y++) grid[(y * W + z) * W + x] = MAX_LIGHT;
        // Los huecos bajo el techo de esta columna que dan a una columna vecina al aire libre reciben luz de lado.
        let low = top;
        if (x > 0) low = Math.min(low, tops[z * W + x - 1]);
        if (x < W - 1) low = Math.min(low, tops[z * W + x + 1]);
        if (z > 0) low = Math.min(low, tops[(z - 1) * W + x]);
        if (z < W - 1) low = Math.min(low, tops[(z + 1) * W + x]);
        for (let y = Math.max(0, low + 1); y <= top; y++) {
          if (isOpaque(get(x0 + x, y, z0 + z))) continue;
          grid[(y * W + z) * W + x] = MAX_LIGHT - 1;
          queue.push(x0 + x, y, z0 + z);
        }
      }
    }
    this.spreadLight(grid, queue, x0, z0, W, get);
    return (x, y, z) => (y >= HEIGHT ? 1 : y < 0 ? 0 : grid[at(x, y, z)] / MAX_LIGHT);
  }

  /** Bloques alrededor de un chunk (hasta 16 bloques fuera), leídos directamente de los 9 chunks. */
  private regionBlocks(ox: number, oz: number): (x: number, y: number, z: number) => number {
    const cx = ox / CHUNK;
    const cz = oz / CHUNK;
    const near: BlockData[] = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) near.push(this.getChunk(cx + dx, cz + dz).data);
    return (x, y, z) => {
      if (y < 0 || y >= HEIGHT) return Block.Air;
      const lx = x - ox;
      const lz = z - oz;
      const ix = lx < 0 ? 0 : lx >= CHUNK ? 2 : 1;
      const iz = lz < 0 ? 0 : lz >= CHUNK ? 2 : 1;
      return near[iz * 3 + ix][index(lx - (ix - 1) * CHUNK, y, lz - (iz - 1) * CHUNK)];
    };
  }

  /** Extiende la luz de `queue` bloque a bloque, bajando un nivel cada vez; no atraviesa bloques opacos. */
  private spreadLight(grid: Uint8Array, queue: number[], x0: number, z0: number, W: number, get: (x: number, y: number, z: number) => number, color?: Uint8Array) {
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let head = 0; head < queue.length; head += 3) {
      const x = queue[head];
      const y = queue[head + 1];
      const z = queue[head + 2];
      const from = (y * W + (z - z0)) * W + (x - x0);
      const next = grid[from] - 1;
      if (next <= 0) continue;
      for (const [dx, dy, dz] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (nx < x0 || nx >= x0 + W || nz < z0 || nz >= z0 + W || ny < 0 || ny >= HEIGHT) continue;
        const i = (ny * W + (nz - z0)) * W + (nx - x0);
        if (grid[i] >= next || isOpaque(get(nx, ny, nz))) continue;
        grid[i] = next;
        if (color) color[i] = color[from];
        queue.push(nx, ny, nz);
      }
    }
  }

  /**
   * Luz de antorchas y bloques de luz alrededor de un chunk, de 0 a 1. Se extiende bloque a bloque
   * (bajando un nivel cada vez) y no atraviesa bloques opacos: una pared deja el otro lado a oscuras.
   */
  private blockLightRegion(ox: number, oz: number): BlockLight {
    const R = MAX_LIGHT;
    const W = CHUNK + 2 * R;
    const x0 = ox - R;
    const z0 = oz - R;
    const inside = ([tx, ty, tz]: number[]) => tx >= x0 && tx < x0 + W && tz >= z0 && tz < z0 + W && ty >= 0 && ty < HEIGHT;
    /** [x, y, z, nivel, color] */
    const emitters: number[][] = [];
    for (const [tx, ty, tz] of this.torches.values()) {
      const b = this.getBlock(tx, ty, tz) as Block;
      if (inside([tx, ty, tz])) emitters.push([tx, ty, tz, LIGHT_RADIUS[b] ?? 0, LIGHT_COLOR[b] ?? 0]);
    }
    for (const lamp of this.lamps.values()) if (inside(lamp)) emitters.push([...lamp, 0]);
    if (!emitters.length) return Object.assign(() => 0, { color: () => 0 });
    const grid = new Uint8Array(W * W * HEIGHT);
    const color = new Uint8Array(W * W * HEIGHT);
    const at = (x: number, y: number, z: number) => (y * W + (z - z0)) * W + (x - x0);
    const queue: number[] = [];
    for (const [tx, ty, tz, level, tint] of emitters) {
      if (level <= grid[at(tx, ty, tz)]) continue;
      grid[at(tx, ty, tz)] = level;
      color[at(tx, ty, tz)] = tint;
      queue.push(tx, ty, tz);
    }
    this.spreadLight(grid, queue, x0, z0, W, this.regionBlocks(ox, oz), color);
    const out = (x: number, y: number, z: number) => (y < 0 || y >= HEIGHT ? 0 : grid[at(x, y, z)] / MAX_LIGHT);
    return Object.assign(out, { color: (x: number, y: number, z: number) => (y < 0 || y >= HEIGHT ? 0 : color[at(x, y, z)]) });
  }

  /**
   * Luz en el bloque (x, y, z), de 0 a 1: [cielo, antorchas]. Sale de lo que se calculó al dibujar el chunk;
   * sirve para que los objetos sueltos y la mano se vean oscuros dentro de una cueva.
   */
  lightAt(x: number, y: number, z: number): [number, number] {
    if (y >= HEIGHT) return [1, 0];
    if (y < 0) return [0, 0];
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(key(cx, cz));
    if (!c?.light) return [y > this.skyHeight(x, z) ? 1 : 0, 0];
    const v = c.light[index(x - cx * CHUNK, y, z - cz * CHUNK)];
    return [(v >> 4) / MAX_LIGHT, (v & 15) / MAX_LIGHT];
  }
  /** La puerta de valla va a lo largo de x si tiene vallas (o paredes) a los lados en x. */
  private gateAlongX(x: number, y: number, z: number): boolean {
    const joins = (b: number) => isFence(b) || isGate(b) || isFullBlock(b);
    if (joins(this.getBlock(x + 1, y, z)) || joins(this.getBlock(x - 1, y, z))) return true;
    return !(joins(this.getBlock(x, y, z + 1)) || joins(this.getBlock(x, y, z - 1)));
  }

  /** La puerta de casa va a lo largo de x si tiene paredes a los lados en x. */
  private doorAlongX(x: number, y: number, z: number): boolean {
    if (isFullBlock(this.getBlock(x + 1, y, z)) || isFullBlock(this.getBlock(x - 1, y, z))) return true;
    return !(isFullBlock(this.getBlock(x, y, z + 1)) || isFullBlock(this.getBlock(x, y, z - 1)));
  }

  // --- Malla ---

  /** Dibuja un chunk aquí mismo (sin hilo aparte). */
  private buildMesh(c: Chunk) {
    this.applyMesh(c, this.meshData(c.cx, c.cz));
  }

  /**
   * Calcula la malla de un chunk como listas de números, sin crear nada de three.js (v4.7): así se puede hacer
   * en otro hilo (meshWorker.ts) y mandar el resultado de vuelta.
   */
  meshData(cx: number, cz: number): MeshData {
    const c = this.getChunk(cx, cz);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    /** Vértices de arriba de las plantas, que el viento mueve. */
    const swaying: number[] = [];

    const ox = c.cx * CHUNK;
    const oz = c.cz * CHUNK;
    /** Luz de cada vértice: [cielo, antorchas]. El shader las mezcla con la hora del día (lighting.ts). */
    const lights: number[] = [];
    /** Color de la luz de antorchas de cada vértice (v3.2). */
    const tints: number[] = [];
    const blockLight = this.blockLightRegion(ox, oz);
    const tintAt = (b: number, wx: number, y: number, wz: number) => LIGHT_COLORS[LIGHT_RADIUS[b as Block] ? (LIGHT_COLOR[b as Block] ?? 0) : blockLight.color(wx, y, wz)];
    // Los bloques del chunk y de sus 8 vecinos, a mano: preguntar al mundo por cada bloque era lo más lento (v3.0).
    const near: BlockData[] = [];
    const skyTop = new Int16Array((CHUNK + 2) * (CHUNK + 2));
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) near.push(this.getChunk(c.cx + dx, c.cz + dz).data);
    for (let z = -1; z <= CHUNK; z++) for (let x = -1; x <= CHUNK; x++) skyTop[(z + 1) * (CHUNK + 2) + x + 1] = this.skyHeight(ox + x, oz + z);
    /** Bloque en coordenadas locales del chunk (de -1 a CHUNK). */
    const get = (lx: number, y: number, lz: number): number => {
      if (y < 0 || y >= HEIGHT) return Block.Air;
      const ix = lx < 0 ? 0 : lx >= CHUNK ? 2 : 1;
      const iz = lz < 0 ? 0 : lz >= CHUNK ? 2 : 1;
      return near[iz * 3 + ix][index(lx - (ix - 1) * CHUNK, y, lz - (iz - 1) * CHUNK)];
    };
    const skyRegion = this.skyLightRegion(ox, oz);
    /**
     * Luz del cielo de 0 a 1 en coordenadas locales. Cerca de la superficie (bajo un tejado, en un porche)
     * nunca baja de un mínimo, para que las casas no queden negras; más hondo manda la luz que entra por los huecos.
     */
    const skyLight = (lx: number, y: number, lz: number): number => {
      const top = skyTop[(lz + 1) * (CHUNK + 2) + lx + 1];
      const flood = skyRegion(ox + lx, y, oz + lz);
      if (y > top) return flood;
      return Math.max(flood, INDOOR_SKY * Math.max(0, 1 - (top - y - 1) / 6));
    };
    const full = (lx: number, y: number, lz: number) => (isFullBlock(get(lx, y, lz)) ? 1 : 0);
    /** Oclusión ambiental de una esquina: cuántos bloques la tapan (0 muy tapada, 3 al aire). */
    const vertexAO = (lx: number, y: number, lz: number, dir: readonly number[], cx: number, cy: number, cz: number): number => {
      const px = lx + dir[0];
      const py = y + dir[1];
      const pz = lz + dir[2];
      const ux = dir[0] === 0 ? (cx ? 1 : -1) : 0;
      // El primer eje libre es x si la cara no mira en x; si no, y.
      const uy = dir[0] !== 0 ? (cy ? 1 : -1) : 0;
      const vy = dir[0] === 0 && dir[1] === 0 ? (cy ? 1 : -1) : 0;
      const vz = dir[2] === 0 ? (cz ? 1 : -1) : 0;
      const s1 = full(px + ux, py + uy, pz);
      const s2 = full(px, py + vy, pz + vz);
      if (s1 && s2) return 0;
      return 3 - (s1 + s2 + full(px + ux, py + uy + vy, pz + vz));
    };
    /**
     * Luz suave de una esquina (v3.1): la media de los hasta 4 huecos que tocan la esquina por delante de la cara,
     * como el "smooth lighting" de Minecraft. Así la luz cambia poco a poco a lo largo de las paredes.
     */
    const cornerLight = (lx: number, y: number, lz: number, dir: readonly number[], cx: number, cy: number, cz: number): number[] => {
      const px = lx + dir[0];
      const py = y + dir[1];
      const pz = lz + dir[2];
      const ux = dir[0] === 0 ? (cx ? 1 : -1) : 0;
      const uy = dir[0] !== 0 ? (cy ? 1 : -1) : 0;
      const vy = dir[0] === 0 && dir[1] === 0 ? (cy ? 1 : -1) : 0;
      const vz = dir[2] === 0 ? (cz ? 1 : -1) : 0;
      let sky = 0;
      let glow = 0;
      let n = 0;
      // El color es la media de los colores, pesando más la luz más fuerte.
      let r = 0;
      let g = 0;
      let bl = 0;
      const add = (qx: number, qy: number, qz: number) => {
        sky += skyLight(qx, qy, qz);
        const level = blockLight(ox + qx, qy, oz + qz);
        glow += level;
        n++;
        if (level > 0) {
          const [tr, tg, tb] = LIGHT_COLORS[blockLight.color(ox + qx, qy, oz + qz)];
          r += tr * level;
          g += tg * level;
          bl += tb * level;
        }
      };
      add(px, py, pz);
      const s1 = isOpaque(get(px + ux, py + uy, pz));
      const s2 = isOpaque(get(px, py + vy, pz + vz));
      if (!s1) add(px + ux, py + uy, pz);
      if (!s2) add(px, py + vy, pz + vz);
      if ((!s1 || !s2) && !isOpaque(get(px + ux, py + uy + vy, pz + vz))) add(px + ux, py + uy + vy, pz + vz);
      if (glow === 0) return [sky / n, 0, ...LIGHT_COLORS[0]];
      return [sky / n, glow / n, r / glow, g / glow, bl / glow];
    };
    const tileSize = 1 / ATLAS_TILES;
    const inset = 0.0005;
    const tileUV = (tile: number): [number, number] => [
      (tile % ATLAS_TILES) * tileSize,
      1 - (Math.floor(tile / ATLAS_TILES) + 1) * tileSize,
    ];

    // Agua (v3.8): cada bloque de agua con su altura según el nivel, inclinada hacia donde corre, como en Minecraft.
    const water: number[] = [];
    /** Por vértice: hacia dónde corre (x, z), si cae (1) y si lleva olas (1, solo la superficie del agua quieta). */
    const waterFlowAttr: number[] = [];
    const waterAbove = (lx: number, y: number, lz: number) => isWater(get(lx, y + 1, lz));
    /** Altura del agua de un bloque para las esquinas: 1 si tiene agua encima, -1 si es sólido (no cuenta). */
    const liquidH = (lx: number, y: number, lz: number): number => {
      const b = get(lx, y, lz);
      if (isWater(b)) return waterAbove(lx, y, lz) ? 1 : waterHeight(b);
      return isSolid(b) ? -1 : 0;
    };
    /** Altura de la esquina (cx, cz ∈ {0, 1}) del bloque: la media de los 4 bloques que la tocan; el agua quieta pesa más. */
    const cornerH = (lx: number, y: number, lz: number, cx: number, cz: number): number => {
      let sum = 0;
      let weight = 0;
      for (const [dx, dz] of [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]]) {
        const h = liquidH(lx + dx, y, lz + dz);
        if (h >= 1) return 1;
        if (h < 0) continue;
        const w = fluidLevel(get(lx + dx, y, lz + dz)) === 0 ? 10 : 1;
        sum += h * w;
        weight += w;
      }
      return weight ? sum / weight : 0;
    };
    const addWater = (lx: number, y: number, lz: number, b: number) => {
      const above = waterAbove(lx, y, lz);
      const h = [cornerH(lx, y, lz, 0, 0), cornerH(lx, y, lz, 1, 0), cornerH(lx, y, lz, 0, 1), cornerH(lx, y, lz, 1, 1)];
      if (above) h.fill(1);
      const f = waterFlow(get, lx, y, lz);
      const still = !above && b === Block.Water && !f.x && !f.z;
      const push = (px: number, py: number, pz: number, wave: number) => {
        water.push(px, py, pz);
        waterFlowAttr.push(f.x, f.z, f.down ? 1 : 0, wave);
      };
      const quad = (a: number[], b2: number[], c2: number[], d2: number[], wave: number) => {
        for (const p of [a, b2, c2, c2, b2, d2]) push(p[0], p[1], p[2], wave);
      };
      const [h00, h10, h01, h11] = h;
      if (!above) quad([lx, y + h00, lz], [lx + 1, y + h10, lz], [lx, y + h01, lz + 1], [lx + 1, y + h11, lz + 1], still ? 1 : 0);
      // Lados: solo donde no hay pared, y del agua de al lado para arriba.
      const sides: [number, number, number, number, number, number][] = [
        [1, 0, 1, 0, 1, 1], [-1, 0, 0, 1, 0, 0], [0, 1, 1, 1, 0, 1], [0, -1, 0, 0, 1, 0],
      ];
      for (const [dx, dz, ax, az, bx, bz] of sides) {
        const n = get(lx + dx, y, lz + dz);
        if (isOpaque(n) || isSolid(n)) continue;
        const floor = isWater(n) ? liquidH(lx + dx, y, lz + dz) : 0;
        const ha = h[az * 2 + ax];
        const hb = h[bz * 2 + bx];
        if (Math.max(ha, hb) <= floor + 0.001) continue;
        quad([lx + ax, y + floor, lz + az], [lx + bx, y + floor, lz + bz], [lx + ax, y + Math.max(floor, ha), lz + az], [lx + bx, y + Math.max(floor, hb), lz + bz], 0);
      }
      // Debajo, si cuelga en el aire.
      const below = get(lx, y - 1, lz);
      if (!isWater(below) && !isSolid(below)) quad([lx, y, lz], [lx, y, lz + 1], [lx + 1, y, lz], [lx + 1, y, lz + 1], 0);
    };

    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const b = c.data[index(x, y, z)];
          if (b === Block.Air) continue;
          const def = BLOCKS[b];
          const wx = ox + x;
          const wz = oz + z;

          if (def.shape === 'liquid') {
            addWater(x, y, z, b);
            continue;
          }

          if (def.shape === 'cross') {
            const [u0, v0] = tileUV(def.tiles[0]);
            const sky = skyLight(x, y, z);
            const glow = LIGHT_RADIUS[b as Block] ? 1 : blockLight(wx, y, wz);
            const tint = tintAt(b, wx, y, wz);
            // Antorcha de pared (v5.0.1): la misma figura, más baja y con el pie metido hacia la pared, en diagonal.
            const wall = def.facing !== undefined && isTorch(b) ? WALL_TORCH_DIRS[def.facing] : null;
            for (const quad of CROSS_QUADS) {
              const start = positions.length / 3;
              for (const [qx, qy, qz, cu, cv] of quad) {
                let [cx, cy, cz] = [qx, qy, qz];
                if (wall) {
                  const lean = qy === 0 ? 0.42 : 0.02;
                  cx += wall[0] * lean;
                  cz += wall[1] * lean;
                  cy = 0.22 + qy * 0.78;
                }
                positions.push(x + cx, y + cy, z + cz);
                normals.push(0, 1, 0);
                uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
                const shade = qy === 0 ? 0.8 : 1;
                colors.push(shade, shade, shade);
                lights.push(sky, glow);
                tints.push(...tint);
                if (qy === 1 && SWAYING.has(b)) swaying.push(positions.length / 3 - 1);
              }
              indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
            }
            continue;
          }

          if (def.shape !== 'cube') {
            const [u0, v0] = tileUV(def.tiles[0]);
            const sky = skyLight(x, y, z);
            const glow = def.shape === 'lava' ? 1 : blockLight(wx, y, wz);
            const tint = tintAt(b, wx, y, wz);
            // Caja pequeña dentro del bloque; la textura se recorta según su tamaño. `hide` quita caras tapadas.
            const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, hide?: (f: number) => boolean) => {
              for (let f = 0; f < 6; f++) {
                if (hide?.(f)) continue;
                const face = FACES[f];
                const [nx, ny, nz] = face.dir;
                const start = positions.length / 3;
                for (const [cx, cy, cz] of face.corners) {
                  const px = cx ? x1 : x0;
                  const py = cy ? y1 : y0;
                  const pz = cz ? z1 : z0;
                  positions.push(x + px, y + py, z + pz);
                  normals.push(nx, ny, nz);
                  const [a, b2] = nx ? [pz, py] : ny ? [px, pz] : [px, py];
                  uvs.push(u0 + inset + a * (tileSize - 2 * inset), v0 + inset + b2 * (tileSize - 2 * inset));
                  const shade = FACE_SHADE[f];
                  colors.push(shade, shade, shade);
                  lights.push(sky, glow);
                  tints.push(...tint);
                }
                indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
              }
            };
            // Box con los ejes cambiados: así cada puerta se dibuja igual a lo largo de x o de z.
            const along = (alongX: boolean, a0: number, y0: number, b0: number, a1: number, y1: number, b1: number) =>
              alongX ? box(a0, y0, b0, a1, y1, b1) : box(b0, y0, a0, b1, y1, a1);
            if (def.shape === 'gate') {
              const alongX = this.gateAlongX(wx, y, wz);
              if (isOpen(b)) {
                // Abierta: las dos hojas giradas hacia dentro, pegadas a los postes.
                for (const [a0, a1] of [[0, 0.125], [0.875, 1]]) {
                  along(alongX, a0, 0.375, 0.5, a1, 0.5625, 1);
                  along(alongX, a0, 0.75, 0.5, a1, 0.9375, 1);
                  along(alongX, a0, 0.3, 0.875, a1, 1, 1);
                }
              } else {
                along(alongX, 0, 0.375, 0.4375, 1, 0.5625, 0.5625);
                along(alongX, 0, 0.75, 0.4375, 1, 0.9375, 0.5625);
                for (const a of [0, 0.4375, 0.875]) along(alongX, a, 0.3, 0.4375, a + 0.125, 1, 0.5625);
              }
              continue;
            }
            if (def.shape === 'door') {
              const alongX = this.doorAlongX(wx, isDoorTop(b) ? y - 1 : y, wz);
              if (isOpen(b)) along(!alongX, 0, 0, 0, 1, 1, 0.1875);
              else along(alongX, 0, 0, 0.40625, 1, 1, 0.59375);
              continue;
            }
            if (def.shape === 'lava') {
              // La lava (v4.20): un bloque más bajo según lo lejos que está de su fuente. Sin las caras que tapa otra lava
              // igual de alta o un bloque entero.
              const top = isLava(get(x, y + 1, z)) ? 1 : lavaHeight(b);
              box(0, 0, 0, 1, top, 1, (f) => {
                const [nx, ny, nz] = FACES[f].dir;
                const n = get(x + nx, y + ny, z + nz);
                if (isOpaque(n)) return true;
                if (!isLava(n)) return false;
                if (ny > 0) return true;
                if (ny < 0) return true;
                return (isLava(get(x + nx, y + 1, z + nz)) ? 1 : lavaHeight(n)) >= top;
              });
              continue;
            }
            if (def.shape === 'pad') {
              box(0, 0, 0, 1, 0.0625, 1);
              continue;
            }
            if (def.shape === 'slab' || def.shape === 'stairs') {
              box(0, 0, 0, 1, 0.5, 1);
              if (def.shape === 'stairs') {
                const f = def.facing ?? 0;
                along(f % 2 === 0, 0, 0.5, f === 0 || f === 3 ? 0 : 0.5, 1, 1, f === 0 || f === 3 ? 0.5 : 1);
              }
              continue;
            }
            box(0.375, 0, 0.375, 0.625, 1, 0.625);
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = this.getBlock(wx + dx, y, wz + dz);
              if (!isFence(n) && !isGate(n) && !isFullBlock(n)) continue;
              const x0 = dx > 0 ? 0.625 : dx < 0 ? 0 : 0.4375;
              const x1 = dx > 0 ? 1 : dx < 0 ? 0.375 : 0.5625;
              const z0 = dz > 0 ? 0.625 : dz < 0 ? 0 : 0.4375;
              const z1 = dz > 0 ? 1 : dz < 0 ? 0.375 : 0.5625;
              box(x0, 0.375, z0, x1, 0.5625, z1);
              box(x0, 0.75, z0, x1, 0.9375, z1);
            }
            continue;
          }

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const [nx, ny, nz] = face.dir;
            const nb = get(x + nx, y + ny, z + nz);
            if (isOpaque(nb)) continue;
            if (nb === b && def.transparent) continue; // hojas contra hojas: una sola capa

            const [u0, v0] = tileUV(def.tiles[face.side]);
            const emits = !!LIGHT_RADIUS[b as Block];
            const start = positions.length / 3;
            const ao: number[] = [];
            for (const [cx, cy, cz, cu, cv] of face.corners) {
              positions.push(x + cx, y + cy, z + cz);
              normals.push(nx, ny, nz);
              uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
              const a = vertexAO(x, y, z, face.dir, cx, cy, cz);
              ao.push(a);
              const shade = FACE_SHADE[f] * AO_CURVE[a];
              colors.push(shade, shade, shade);
              const [sky, glow, r, g, bl] = cornerLight(x, y, z, face.dir, cx, cy, cz);
              lights.push(sky, emits ? 1 : glow);
              if (emits) tints.push(...LIGHT_COLORS[LIGHT_COLOR[b as Block] ?? 0]);
              else tints.push(r, g, bl);
            }
            // Girar la diagonal del quad evita manchas raras en la oclusión ambiental.
            if (ao[1] + ao[2] > ao[0] + ao[3]) {
              indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
            } else {
              indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
            }
          }
        }
      }
    }

    // La luz de cada bloque del chunk, para lightAt().
    const cache = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const i = index(x, y, z);
          cache[i] = isOpaque(c.data[i]) ? 0 : (Math.round(skyLight(x, y, z) * MAX_LIGHT) << 4) | Math.round(blockLight(ox + x, y, oz + z) * MAX_LIGHT);
        }
      }
    }
    const sway = new Float32Array(positions.length / 3);
    for (const i of swaying) sway[i] = 1;
    return {
      cx, cz,
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      colors: new Float32Array(colors),
      lights: new Float32Array(lights),
      tints: new Float32Array(tints),
      sway,
      indices: new Uint32Array(indices),
      water: new Float32Array(water),
      flow: new Float32Array(waterFlowAttr),
      light: cache,
    };
  }

  /** Pone en la escena la malla calculada de un chunk. */
  private applyMesh(c: Chunk, m: MeshData) {
    c.light = m.light;
    this.disposeMesh(c);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
    geo.setAttribute('light', new THREE.BufferAttribute(m.lights, 2));
    geo.setAttribute('lightColor', new THREE.BufferAttribute(m.tints, 3));
    geo.setAttribute('sway', new THREE.BufferAttribute(m.sway, 1));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(c.cx * CHUNK, 0, c.cz * CHUNK);
    mesh.castShadow = mesh.receiveShadow = true;

    if (m.water.length) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.BufferAttribute(m.water, 3));
      wg.setAttribute('flow', new THREE.BufferAttribute(m.flow, 4));
      wg.computeVertexNormals();
      const wm = new THREE.Mesh(wg, this.waterMaterial);
      wm.renderOrder = 1;
      mesh.add(wm);
    }

    c.mesh = mesh;
    c.dirty = false;
    this.group.add(mesh);
  }

  private disposeMesh(c: Chunk) {
    if (!c.mesh) return;
    this.group.remove(c.mesh);
    c.mesh.geometry.dispose();
    for (const child of c.mesh.children) (child as THREE.Mesh).geometry.dispose();
    c.mesh = null;
  }
}
