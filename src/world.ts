import * as THREE from 'three';
import { ATLAS_TILES, BLOCKS, Block, FRUITS, HOUSE_BLOCKS, LIGHT_RADIUS, MAX_LIGHT, ROOFS, SWAYING, isCross, isDoorTop, isFence, isFullBlock, isGate, isOpaque, isOpen, isSolid } from './blocks';
import { blockRandom, columnRandom, fbm, valueNoise3 } from './noise';
import { fruitTreeShape, palmShape, pineShape } from './trees';

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
/** Versión del terreno de las islas nuevas. Las guardadas siguen con el suyo para que no se mueva nada. */
export const TERRAIN_VERSION = 2;

/** Zonas de la isla con su propio paisaje (solo en el terreno 2). */
export type Biome = 'playa' | 'bosque' | 'pradera' | 'bambu' | 'montaña';
export const BIOME_NAMES: Record<Biome, string> = { playa: 'Playa', bosque: 'Bosque', pradera: 'Pradera', bambu: 'Bambú', montaña: 'Montaña' };
const INLAND_BIOMES: Biome[] = ['bosque', 'pradera', 'montaña', 'bambu'];

class Chunk {
  readonly data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
  mesh: THREE.Mesh | null = null;
  dirty = true;
  /** Altura del bloque opaco más alto de cada columna, para saber qué está bajo tierra. */
  sky: Int16Array | null = null;
  constructor(readonly cx: number, readonly cz: number) {}
}

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

/** Parcela con la casa de un vecino o la tienda. La puerta mira hacia +z. */
export interface Plot {
  kind: 'house' | 'shop' | 'museum' | 'player';
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

/** Medio lado de la parcela que se allana y se deja sin árboles. */
export const PLOT_RADIUS = 5;

/** Cambios del jugador sobre el mundo generado, por chunk: índice local → bloque. */
export type Edits = Record<string, Record<number, number>>;

/** La fruta típica de la isla de esa semilla. */
export function islandFruit(seed: number): Block {
  return FRUITS[Math.floor(columnRandom(1, 1, seed) * FRUITS.length)];
}

/** Tipos de isla misteriosa: cada una tiene algo de más. */
export type MysteryKind = 'frutas' | 'flores' | 'minerales' | 'bambu';
export const MYSTERY_KINDS: MysteryKind[] = ['frutas', 'flores', 'minerales', 'bambu'];

export interface WorldOptions {
  /** Isla misteriosa, pequeña y sin casas, a la que se llega en avioneta. */
  mystery?: { kind: MysteryKind; fruit: Block };
  /** Parcelas (x, z) de los vecinos invitados desde las islas misteriosas. */
  guests?: [number, number][];
  /** Versión del terreno: 1 (o nada) las islas de antes, 2 las grandes con biomas. */
  terrain?: number;
}

/** Sitio de la avioneta: la playa donde espera el piloto y el agua donde flota el avión, mirando al mar (dx, dz). */
export interface Airport {
  x: number;
  z: number;
  y: number;
  dx: number;
  dz: number;
}

export interface WaterfallSpot {
  x: number;
  z: number;
  top: number;
  bottom: number;
  dx: number;
  dz: number;
  /** Ancho de la lámina de agua (2 si no se dice). */
  width?: number;
  /** Cascada del río entre dos terrazas: `top` y `bottom` son los niveles del agua, no del suelo. */
  river?: boolean;
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
  /** Cuánto se alejan del centro las casas y las cuevas: más en las islas grandes. */
  private readonly spread: number;
  /** Entradas de cueva: escaleras que bajan desde la superficie. */
  readonly caveEntrances: { x: number; z: number; y: number }[];
  /** Posiciones "x,y,z" de las antorchas, que iluminan las cuevas. */
  private torches = new Map<string, [number, number, number]>();
  /** Luces que no son bloques (farolas, lámparas…): "x,y,z" → [x, y, z, nivel]. */
  private lamps = new Map<string, [number, number, number, number]>();

  /** Material del agua; se pone desde fuera para que coincida con el resto de la escena. */
  waterMaterial: THREE.Material = new THREE.MeshLambertMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });

  constructor(readonly seed: number, private material: THREE.Material, edits: Edits = {}, options: WorldOptions = {}) {
    this.mystery = options.mystery;
    this.terrain = this.mystery ? 1 : options.terrain ?? 1;
    this.radius = this.mystery ? 30 : this.terrain >= 2 ? BIG_ISLAND_RADIUS : ISLAND_RADIUS;
    this.spread = this.terrain >= 2 ? 1.5 : 1;
    if (this.terrain >= 2) {
      this.biomeOrder = [...INLAND_BIOMES].sort((a, b) => columnRandom(a.length, 41, seed + a.charCodeAt(1)) - columnRandom(b.length, 41, seed + b.charCodeAt(1)));
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
      plots.push({ kind, x, z, y: h, roof, door: [x, h + 1, z + 3] });
    }
    // La última es la del jugador; así las islas de antes conservan sus casas.
    if (plots.length > 2) plots[plots.length - 1].kind = 'player';
    return plots;
  }

  /** Añade la casa de un vecino invitado. Hay que hacerlo antes de que se genere esa zona. */
  addGuestPlot(x: number, z: number) {
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

  /** Qué agua hay en (x, z): río dentro de la isla, mar fuera, o null si es tierra. */
  waterKind(x: number, z: number): 'mar' | 'río' | null {
    // Hay agua donde el terreno natural queda bajo el nivel del agua y nadie ha tapado el hueco.
    const level = this.waterLevel(x, z);
    if (this.naturalHeight(x, z) >= level || this.getBlock(x, level, z) !== Block.Air) return null;
    return level > SEA_LEVEL || this.landMask(x, z) >= 0.26 ? 'río' : 'mar';
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

  /** Altura de la superficie del agua en (x, z). */
  waterSurface(x: number, z: number): number {
    return this.waterLevel(x, z) + (WATER_SURFACE - SEA_LEVEL);
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
    if (mask < 0.08) {
      const depth = Math.min(6, Math.floor((0.08 - mask) * 120 + Math.hypot(x, z) / 40));
      return SEA_LEVEL - 3 - depth;
    }
    if (mask < 0.14) return SEA_LEVEL; // orilla poco profunda
    if (mask < 0.26) return SEA_LEVEL + 1; // playa

    if (this.terrain >= 2) {
      const { dist, u } = this.riverAt(x, z);
      if (dist < 6) {
        const level = this.riverLevel(u);
        if (dist < 2.2) return level - 2;
        if (dist < 3.6) return level + 1;
        // La orilla nunca queda por debajo del agua, para que el río no se derrame.
        return Math.max(level + 2, this.landHeight(x, z, mask));
      }
      return this.landHeight(x, z, mask);
    }

    const r = this.river(x, z);
    if (r < 2.2) return SEA_LEVEL - 2;
    if (r < 3.6) return SEA_LEVEL + 1;
    return this.landHeight(x, z, mask);
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
    const i = this.biomeOrder.indexOf('montaña');
    const center = (i + 0.5) * (Math.PI / 2);
    let d = Math.abs(this.biomeAngle(x, z) - center);
    d = Math.min(d, Math.PI * 2 - d);
    const around = Math.max(0, Math.min(1, (Math.PI / 4 - d) / (Math.PI / 8)));
    const out = Math.max(0, Math.min(1, (Math.hypot(x, z) / this.radius - 0.25) / 0.25));
    return around * out;
  }

  /** Bioma de (x, z) en las islas grandes; null en las de antes y en las misteriosas. */
  biomeAt(x: number, z: number): Biome | null {
    if (this.terrain < 2) return null;
    if (this.landMask(x, z) < 0.26) return 'playa';
    return this.biomeOrder[Math.floor(this.biomeAngle(x, z) / (Math.PI / 2)) % 4];
  }

  private isBeach(h: number): boolean {
    return h <= SEA_LEVEL + 1;
  }

  /** Bloque de arriba y de debajo de una columna de altura `h`, y si es arena de playa o de río. */
  private surfaceAt(x: number, z: number, h: number): { top: Block; under: Block; beach: boolean } {
    // Arena en la playa y en el fondo y las orillas del río (también el de las terrazas altas).
    const beach = this.isBeach(h) || (this.terrain >= 2 && h <= this.waterLevel(x, z) + 1 && this.river(x, z) < 3.6);
    if (beach) return { top: Block.Sand, under: Block.Sand, beach };
    // En la montaña los acantilados son de roca y las cumbres tienen nieve.
    if (this.terrain >= 2 && !this.plotAt(x, z) && this.biomeAt(x, z) === 'montaña') {
      const low = Math.min(this.heightAt(x + 1, z), this.heightAt(x - 1, z), this.heightAt(x, z + 1), this.heightAt(x, z - 1));
      if (h - low >= 4) return { top: Block.Stone, under: Block.Stone, beach };
      if (h >= SEA_LEVEL + 2 + 4 * 4) return { top: Block.SnowGrass, under: Block.Dirt, beach };
    }
    return { top: Block.Grass, under: Block.Dirt, beach };
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
        const { top, under, beach } = this.surfaceAt(wx, wz, h);
        // Bajo la isla hay cuevas, solo donde hay tierra firme encima.
        const caves = !beach && !this.plotAt(wx, wz, 2);
        for (let y = 0; y <= h; y++) {
          let b: Block;
          if (y === h) b = top;
          else if (y > h - 4) b = under;
          else if (y > 0 && caves && y < h - 5 && this.isCave(wx, y, wz)) b = Block.Air;
          else if (y > 0) b = this.oreAt(wx, y, wz);
          else b = Block.Stone;
          d[index(x, y, z)] = b;
        }
        // Flores y hierba alta sobre el césped. Hay zonas especiales: bosquecillos de bambú y praderas de flores.
        if (!beach && top === Block.Grass && h + 1 < HEIGHT && !this.plotAt(wx, wz)) {
          const r = columnRandom(wx, wz, this.seed + 11);
          const patch = fbm(wx / 12, wz / 12, this.seed + 12, 2);
          const zone = this.zoneAt(wx, wz);
          let plant: Block = Block.Air;
          if (zone === 'bambu' && r < 0.2) {
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
        else if (kind === 'rock') this.placeRock(wx, wz, tx, tz, set);
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
      if (plot.x + 3 < ox || plot.x - 3 >= ox + CHUNK || plot.z + 3 < oz || plot.z - 3 >= oz + CHUNK) continue;
      this.buildHouse(plot, (x, y, z, b) => set(x - ox, y, z - oz, b, true));
    }

    // Lo que el jugador cambió en este chunk.
    const edits = this.edits.get(key(chunk.cx, chunk.cz));
    if (edits) for (const [i, b] of edits) d[i] = b;

    chunk.dirty = true;
  }

  /** Casita de 5x5 con tejado a cuatro aguas, ventanas y la puerta hacia +z. La parcela del jugador empieza con una tienda de campaña. */
  private buildHouse(p: Plot, put: (x: number, y: number, z: number, b: Block) => void) {
    const { x, z, y } = p;
    if (p.kind === 'player') {
      buildTent(x, y, z, put);
      return;
    }
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        put(x + dx, y, z + dz, Block.Planks);
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        // La tienda es de madera, para distinguirla de las casas.
        const wall = p.kind === 'shop' ? Block.ShopWall : p.kind === 'museum' ? Block.MuseumWall : Block.Wall;
        for (let h = 1; h <= 3; h++) put(x + dx, y + h, z + dz, edge ? wall : Block.Air);
      }
    }
    // Puerta (hueco de 2 de alto) y ventanas a los lados y detrás.
    put(x, y + 1, z + 2, Block.Air);
    put(x, y + 2, z + 2, Block.Air);
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
          if (HOUSE_BLOCKS.includes(this.getBlock(x + dx, y + dy, z + dz))) set(x + dx, y + dy, z + dz, Block.Air);
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
    set(x, y + 1, z + half, Block.Air);
    set(x, y + 2, z + half, Block.Air);
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

  private treeAt(x: number, z: number): 'fruit' | 'palm' | 'rock' | 'pine' | 'boulder' | null {
    if (this.plotAt(x, z, 3) || this.zoneAt(x, z) === 'bambu') return null;
    const r = columnRandom(x, z, this.seed);
    const h = this.heightAt(x, z);
    if (this.terrain >= 2) {
      // Cada bioma con sus árboles: bosque espeso, pinos en la montaña, pocos árboles en la pradera.
      const biome = this.biomeAt(x, z);
      if (biome === 'playa' || h === SEA_LEVEL + 1) return h === SEA_LEVEL + 1 && r < 0.012 ? 'palm' : null;
      if (this.river(x, z) <= 6 || this.surfaceAt(x, z, h).top !== Block.Grass) return null;
      if (biome === 'bosque') return r < 0.022 ? 'fruit' : r < 0.04 ? 'pine' : null;
      if (biome === 'montaña') return r < 0.025 ? 'pine' : r > 0.993 ? 'boulder' : null;
      if (biome === 'pradera') return r < 0.004 ? 'fruit' : null;
      return r < 0.006 ? 'fruit' : null;
    }
    if (h === SEA_LEVEL + 1 && r < 0.008) return 'palm';
    const kind = this.mystery?.kind;
    // Las islas misteriosas de fruta están llenas de árboles; las de minerales, de rocas con vetas.
    const fruit = kind === 'frutas' ? 0.03 : 0.006;
    if (h > SEA_LEVEL + 1 && this.river(x, z) > 6 && r < fruit) return 'fruit';
    if (kind === 'minerales' && h > SEA_LEVEL + 1 && r > 0.985) return 'rock';
    return null;
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
    }
    return c;
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
    c.dirty = true;
    c.sky = null;

    // Una luz nueva (o quitada), o un bloque que tapa o destapa una luz cercana, cambia la luz de alrededor.
    if (LIGHT_RADIUS[b] || LIGHT_RADIUS[before as Block]) {
      const k = `${x},${y},${z}`;
      if (LIGHT_RADIUS[b]) this.torches.set(k, [x, y, z]);
      else this.torches.delete(k);
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

    // Una planta sin suelo debajo desaparece.
    if (b === Block.Air && y + 1 < HEIGHT && isCross(this.getBlock(x, y + 1, z))) {
      const above = this.getBlock(x, y + 1, z);
      if (!FRUITS.includes(above as (typeof FRUITS)[number]) && above !== Block.Coconut) this.setBlock(x, y + 1, z, Block.Air);
    }
  }

  /** Deshace el cambio del jugador en (x, y, z), por ejemplo para que vuelva a crecer una fruta. */
  clearEdit(x: number, y: number, z: number) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const m = this.edits.get(key(cx, cz));
    if (!m) return;
    m.delete(index(x - cx * CHUNK, y, z - cz * CHUNK));
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
   * Sitios para cascadas: donde el río pasa pegado a un acantilado alto.
   * Devuelve la columna del acantilado (x, z), su altura (`top`), la del suelo al pie (`bottom`)
   * y hacia dónde cae el agua (`dx`, `dz`: del acantilado al río).
   */
  waterfallSpots(count: number): WaterfallSpot[] {
    if (this.terrain >= 2 && !this.mystery) return this.riverFalls();
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

  /**
   * Cascadas del río de las islas grandes: donde el río baja de una terraza a otra,
   * el agua de arriba cae sobre la de abajo.
   */
  private riverFalls(): WaterfallSpot[] {
    const found: WaterfallSpot[] = [];
    const a = columnRandom(2, 2, this.seed) * Math.PI;
    const reach = Math.ceil(this.radius * 1.6);
    for (let u = -reach; u < reach && found.length < 8; u++) {
      const here = this.riverLevel(u);
      const next = this.riverLevel(u + 1);
      if (here === next) continue;
      let [bx, bz] = this.riverPoint(u + 0.5);
      if (this.landMask(bx, bz) < 0.26) continue;
      // El agua cae hacia donde el río está más bajo.
      const sign = next < here ? 1 : -1;
      const dx = Math.cos(a) * sign;
      const dz = Math.sin(a) * sign;
      // Ajustar la lámina al escalón de verdad, que va por bloques enteros.
      const low = Math.min(here, next);
      for (let t = -2.5; t <= 2.5; t += 0.1) {
        const px = bx + dx * t;
        const pz = bz + dz * t;
        if (this.waterLevel(Math.floor(px), Math.floor(pz)) !== low) continue;
        bx = px;
        bz = pz;
        break;
      }
      // La lámina se dibuja en (x + 0.5 + dx * 0.52, z + 0.5 + dz * 0.52): que quede justo en el escalón.
      found.push({ x: bx - 0.5 - dx * 0.52, z: bz - 0.5 - dz * 0.52, top: Math.max(here, next), bottom: Math.min(here, next), dx, dz, width: 5, river: true });
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
    if (c) c.dirty = true;
  }

  // --- Carga alrededor del jugador ---

  /** Genera y dibuja chunks cerca de (x, z). Reconstruye como mucho `budget` mallas ya visibles por llamada. */
  update(x: number, z: number, radius: number, budget = 2) {
    const pcx = Math.floor(x / CHUNK);
    const pcz = Math.floor(z / CHUNK);

    const wanted: [number, number, number][] = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = dx * dx + dz * dz;
        if (dist > radius * radius) continue;
        wanted.push([pcx + dx, pcz + dz, dist]);
      }
    }
    wanted.sort((a, b) => a[2] - b[2]);

    let built = 0;
    for (const [cx, cz] of wanted) {
      const c = this.getChunk(cx, cz);
      if (!c.dirty) continue;
      if (built >= budget && c.mesh) continue; // los ya visibles pueden esperar un fotograma
      this.buildMesh(c);
      built++;
      if (built >= budget * 4) break;
    }

    // Quitar de la escena los chunks lejanos (los cambios se guardan aparte).
    const far = (radius + 2) * (radius + 2);
    for (const c of this.chunks.values()) {
      if (!c.mesh) continue;
      const dx = c.cx - pcx;
      const dz = c.cz - pcz;
      if (dx * dx + dz * dz > far) {
        this.disposeMesh(c);
        c.dirty = true;
      }
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

  /**
   * Luz del cielo en una casilla de aire, de 0 a 1. Solo oscurece lo que está hondo bajo tierra (las cuevas),
   * para que el interior de las casas no quede negro.
   */
  private skyLightAt(x: number, y: number, z: number): number {
    const top = this.skyHeight(x, z);
    if (y < top && y <= SEA_LEVEL + 1) return Math.max(0, Math.min(1, 1 - (top - y - 1) / 5));
    return 1;
  }

  /** Pone (nivel > 0) o quita (0) una luz que no es un bloque, como la bombilla de una farola. */
  setLamp(x: number, y: number, z: number, level: number) {
    const k = `${x},${y},${z}`;
    if (level > 0) this.lamps.set(k, [x, y, z, Math.min(MAX_LIGHT, level)]);
    else if (!this.lamps.delete(k)) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
  }

  /**
   * Luz de antorchas y bloques de luz alrededor de un chunk, de 0 a 1. Se extiende bloque a bloque
   * (bajando un nivel cada vez) y no atraviesa bloques opacos: una pared deja el otro lado a oscuras.
   */
  private blockLightRegion(ox: number, oz: number): (x: number, y: number, z: number) => number {
    const R = MAX_LIGHT;
    const W = CHUNK + 2 * R;
    const x0 = ox - R;
    const z0 = oz - R;
    const inside = ([tx, ty, tz]: number[]) => tx >= x0 && tx < x0 + W && tz >= z0 && tz < z0 + W && ty >= 0 && ty < HEIGHT;
    const emitters: [number, number, number, number][] = [];
    for (const [tx, ty, tz] of this.torches.values()) {
      if (inside([tx, ty, tz])) emitters.push([tx, ty, tz, LIGHT_RADIUS[this.getBlock(tx, ty, tz) as Block] ?? 0]);
    }
    for (const lamp of this.lamps.values()) if (inside(lamp)) emitters.push(lamp);
    if (!emitters.length) return () => 0;
    const grid = new Uint8Array(W * W * HEIGHT);
    const at = (x: number, y: number, z: number) => (y * W + (z - z0)) * W + (x - x0);
    const queue: number[] = [];
    for (const [tx, ty, tz, level] of emitters) {
      if (level <= grid[at(tx, ty, tz)]) continue;
      grid[at(tx, ty, tz)] = level;
      queue.push(tx, ty, tz);
    }
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let head = 0; head < queue.length; head += 3) {
      const x = queue[head];
      const y = queue[head + 1];
      const z = queue[head + 2];
      const next = grid[at(x, y, z)] - 1;
      if (next <= 0) continue;
      for (const [dx, dy, dz] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (nx < x0 || nx >= x0 + W || nz < z0 || nz >= z0 + W || ny < 0 || ny >= HEIGHT) continue;
        const i = at(nx, ny, nz);
        if (grid[i] >= next || isOpaque(this.getBlock(nx, ny, nz))) continue;
        grid[i] = next;
        queue.push(nx, ny, nz);
      }
    }
    return (x, y, z) => (y < 0 || y >= HEIGHT ? 0 : grid[at(x, y, z)] / MAX_LIGHT);
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

  private buildMesh(c: Chunk) {
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
    const blockLight = this.blockLightRegion(ox, oz);
    const tileSize = 1 / ATLAS_TILES;
    const inset = 0.0005;
    const tileUV = (tile: number): [number, number] => [
      (tile % ATLAS_TILES) * tileSize,
      1 - (Math.floor(tile / ATLAS_TILES) + 1) * tileSize,
    ];

    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const b = c.data[index(x, y, z)];
          if (b === Block.Air) continue;
          const def = BLOCKS[b];
          const wx = ox + x;
          const wz = oz + z;

          if (def.shape === 'cross') {
            const [u0, v0] = tileUV(def.tiles[0]);
            const sky = this.skyLightAt(wx, y, wz);
            const glow = LIGHT_RADIUS[b as Block] ? 1 : blockLight(wx, y, wz);
            for (const quad of CROSS_QUADS) {
              const start = positions.length / 3;
              for (const [cx, cy, cz, cu, cv] of quad) {
                positions.push(x + cx, y + cy, z + cz);
                normals.push(0, 1, 0);
                uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
                const shade = cy === 0 ? 0.8 : 1;
                colors.push(shade, shade, shade);
                lights.push(sky, glow);
                if (cy === 1 && SWAYING.has(b)) swaying.push(positions.length / 3 - 1);
              }
              indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
            }
            continue;
          }

          if (def.shape !== 'cube') {
            const [u0, v0] = tileUV(def.tiles[0]);
            const sky = this.skyLightAt(wx, y, wz);
            const glow = blockLight(wx, y, wz);
            // Caja pequeña dentro del bloque; la textura se recorta según su tamaño.
            const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
              for (let f = 0; f < 6; f++) {
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
            const nb = this.getBlock(wx + nx, y + ny, wz + nz);
            if (isOpaque(nb)) continue;
            if (nb === b && def.transparent) continue; // hojas contra hojas: una sola capa

            const [u0, v0] = tileUV(def.tiles[face.side]);
            const sky = this.skyLightAt(wx + nx, y + ny, wz + nz);
            const glow = LIGHT_RADIUS[b as Block] ? 1 : blockLight(wx + nx, y + ny, wz + nz);
            const start = positions.length / 3;
            const ao: number[] = [];
            for (const [cx, cy, cz, cu, cv] of face.corners) {
              positions.push(x + cx, y + cy, z + cz);
              normals.push(nx, ny, nz);
              uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
              const a = this.vertexAO(wx, y, wz, face.dir, cx, cy, cz);
              ao.push(a);
              const shade = FACE_SHADE[f] * AO_CURVE[a];
              colors.push(shade, shade, shade);
              lights.push(sky, glow);
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

    this.disposeMesh(c);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('light', new THREE.Float32BufferAttribute(lights, 2));
    const sway = new Float32Array(positions.length / 3);
    for (const i of swaying) sway[i] = 1;
    geo.setAttribute('sway', new THREE.BufferAttribute(sway, 1));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(ox, 0, oz);

    // Agua: un cuadrado por columna inundada, solo donde de verdad hay mar o río.
    const water: number[] = [];
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        if (!this.waterKind(ox + x, oz + z)) continue;
        const y = this.waterSurface(ox + x, oz + z);
        water.push(x, y, z, x + 1, y, z, x, y, z + 1, x, y, z + 1, x + 1, y, z, x + 1, y, z + 1);
      }
    }
    if (water.length) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(water, 3));
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

  /** Oclusión ambiental por vértice: 0 (muy tapado) a 3 (libre). */
  private vertexAO(x: number, y: number, z: number, dir: readonly number[], cx: number, cy: number, cz: number): number {
    const px = x + dir[0];
    const py = y + dir[1];
    const pz = z + dir[2];
    const corner = [cx, cy, cz];
    const axes = [0, 1, 2].filter((a) => dir[a] === 0);
    const off = (a: number) => {
      const o = [0, 0, 0];
      o[a] = corner[a] === 1 ? 1 : -1;
      return o;
    };
    const u = off(axes[0]);
    const v = off(axes[1]);
    const s1 = isFullBlock(this.getBlock(px + u[0], py + u[1], pz + u[2])) ? 1 : 0;
    const s2 = isFullBlock(this.getBlock(px + v[0], py + v[1], pz + v[2])) ? 1 : 0;
    const cr = isFullBlock(this.getBlock(px + u[0] + v[0], py + u[1] + v[1], pz + u[2] + v[2])) ? 1 : 0;
    if (s1 && s2) return 0;
    return 3 - (s1 + s2 + cr);
  }
}
