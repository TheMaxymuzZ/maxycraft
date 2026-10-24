import * as THREE from 'three';
import { ATLAS_TILES, BLOCKS, Block, FRUITS, HOUSE_BLOCKS, LIGHT_RADIUS, ROOFS, isCross, isFence, isFullBlock, isOpaque, isSolid } from './blocks';
import { blockRandom, columnRandom, fbm, valueNoise3 } from './noise';

export const CHUNK = 16;
export const HEIGHT = 64;

/** Bloques con y <= SEA_LEVEL quedan bajo el agua. */
export const SEA_LEVEL = 16;
/** Altura de la superficie del agua. */
export const WATER_SURFACE = SEA_LEVEL + 0.85;
/** Radio aproximado de la isla, en bloques. */
export const ISLAND_RADIUS = 72;

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

export class World {
  private chunks = new Map<string, Chunk>();
  private edits = new Map<string, Map<number, number>>();
  readonly group = new THREE.Group();
  /** La fruta típica de esta isla, como en Animal Crossing. */
  readonly fruit: Block;
  /** Sube cada vez que el jugador cambia un bloque, para saber si hay que guardar. */
  revision = 0;
  readonly plots: Plot[];
  /** Entradas de cueva: escaleras que bajan desde la superficie. */
  readonly caveEntrances: { x: number; z: number; y: number }[];
  /** Posiciones "x,y,z" de las antorchas, que iluminan las cuevas. */
  private torches = new Map<string, [number, number, number]>();

  /** Material del agua; se pone desde fuera para que coincida con el resto de la escena. */
  waterMaterial: THREE.Material = new THREE.MeshLambertMaterial({ color: 0x3fa9d6, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });

  constructor(readonly seed: number, private material: THREE.Material, edits: Edits = {}) {
    this.fruit = FRUITS[Math.floor(columnRandom(1, 1, seed) * FRUITS.length)];
    for (const [k, list] of Object.entries(edits)) {
      this.edits.set(k, new Map(Object.entries(list).map(([i, b]) => [Number(i), b])));
    }
    this.plots = this.findPlots(6);
    this.caveEntrances = this.findCaveEntrances(2);
    // Antorchas que el jugador ya había puesto.
    for (const [k, m] of this.edits) {
      const [cx, cz] = k.split(',').map(Number);
      for (const [i, b] of m) {
        if (b !== Block.Torch) continue;
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
      const d = 15 + columnRandom(tries, 56, this.seed) * 30;
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
      const d = 12 + columnRandom(tries, 78, this.seed) * 34;
      const x = Math.round(Math.cos(a) * d);
      const z = Math.round(Math.sin(a) * d);
      const h = this.naturalHeight(x, z);
      if (h <= SEA_LEVEL + 1 || this.river(x, z) < 9) continue;
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
    const d = Math.hypot(x, z) / (ISLAND_RADIUS * (1 + wobble * 0.5));
    const v = 1 - (d + coast * 0.25 - 0.55) / 0.45;
    return Math.max(0, Math.min(1, v));
  }

  /** Qué agua hay en (x, z): río dentro de la isla, mar fuera, o null si es tierra. */
  waterKind(x: number, z: number): 'mar' | 'río' | null {
    // Hay agua donde el terreno natural queda bajo el nivel del mar y nadie ha tapado el hueco.
    if (this.naturalHeight(x, z) > SEA_LEVEL || this.getBlock(x, SEA_LEVEL, z) !== Block.Air) return null;
    return this.landMask(x, z) >= 0.26 ? 'río' : 'mar';
  }

  /** Distancia en bloques al centro del río, que cruza la isla serpenteando. */
  private river(x: number, z: number): number {
    const a = columnRandom(2, 2, this.seed) * Math.PI;
    const phase = columnRandom(3, 3, this.seed) * Math.PI * 2;
    const u = x * Math.cos(a) + z * Math.sin(a);
    const v = -x * Math.sin(a) + z * Math.cos(a);
    const center = 14 * Math.sin(u / 23 + phase) + (fbm(u / 30, 0, this.seed + 5, 2) - 0.5) * 16;
    return Math.abs(v - center);
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

    const r = this.river(x, z);
    if (r < 2.2) return SEA_LEVEL - 2;
    if (r < 3.6) return SEA_LEVEL + 1;

    // Terrazas con acantilados, como los niveles de Animal Crossing.
    const hills = fbm(x / 70, z / 70, this.seed, 3);
    const t = (mask - 0.26) / 0.74 * (0.5 + hills);
    const tier = t > 0.85 ? 2 : t > 0.45 ? 1 : 0;
    return SEA_LEVEL + 2 + tier * 4;
  }

  private isBeach(h: number): boolean {
    return h <= SEA_LEVEL + 1;
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
        const beach = this.isBeach(h);
        // Bajo la isla hay cuevas, solo donde hay tierra firme encima.
        const caves = !beach && !this.plotAt(wx, wz, 2);
        for (let y = 0; y <= h; y++) {
          let b: Block;
          if (y === h) b = beach ? Block.Sand : Block.Grass;
          else if (y > h - 4) b = beach ? Block.Sand : Block.Dirt;
          else if (y > 0 && caves && y < h - 5 && this.isCave(wx, y, wz)) b = Block.Air;
          else if (y > 0) b = this.oreAt(wx, y, wz);
          else b = Block.Stone;
          d[index(x, y, z)] = b;
        }
        // Flores y hierba alta sobre el césped.
        if (!beach && h + 1 < HEIGHT && !this.plotAt(wx, wz)) {
          const r = columnRandom(wx, wz, this.seed + 11);
          const patch = fbm(wx / 12, wz / 12, this.seed + 12, 2);
          let plant: Block = Block.Air;
          if (r < 0.025 && patch > 0.5) {
            plant = [Block.FlowerRed, Block.FlowerYellow, Block.FlowerWhite][Math.floor(patch * 30) % 3];
          } else if (r < 0.09) {
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
   */
  buildPlayerHouse(level: number, roof: Block) {
    const p = this.playerPlot;
    if (!p) return;
    const { x, y, z } = p;
    const half = level + 1;
    const set = (bx: number, by: number, bz: number, b: Block) => {
      if (this.getBlock(bx, by, bz) !== b) this.setBlock(bx, by, bz, b);
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

  private treeAt(x: number, z: number): 'fruit' | 'palm' | null {
    if (this.plotAt(x, z, 3)) return null;
    const r = columnRandom(x, z, this.seed);
    const h = this.heightAt(x, z);
    if (h === SEA_LEVEL + 1 && r < 0.008) return 'palm';
    if (h > SEA_LEVEL + 1 && this.river(x, z) > 6 && r < 0.006) return 'fruit';
    return null;
  }

  private placeFruitTree(wx: number, wz: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const base = this.heightAt(wx, wz) + 1;
    const top = base + 4;
    for (let y = top - 2; y <= top + 1; y++) {
      const r = y >= top ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          set(tx + dx, y, tz + dz, Block.Leaves, false);
        }
      }
    }
    // Tres frutas colgando bajo la copa.
    const spots = [[-1, -2], [2, 0], [0, 2], [-2, 1], [1, -1]];
    const start = Math.floor(columnRandom(wx, wz, this.seed + 9) * spots.length);
    for (let i = 0; i < 3; i++) {
      const [dx, dz] = spots[(start + i) % spots.length];
      set(tx + dx, top - 3, tz + dz, this.fruit, false);
    }
    for (let y = base; y < top; y++) set(tx, y, tz, Block.Log, true);
  }

  private placePalm(base: number, tx: number, tz: number, set: (x: number, y: number, z: number, b: Block, r: boolean) => void) {
    const top = base + 5;
    for (let y = base; y < top; y++) set(tx, y, tz, Block.PalmLog, true);
    set(tx, top, tz, Block.PalmLeaves, true);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      set(tx + dx, top, tz + dz, Block.PalmLeaves, false);
      set(tx + dx * 2, top - 1, tz + dz * 2, Block.PalmLeaves, false);
    }
    set(tx + 1, top - 1, tz + 1, Block.Coconut, false);
    set(tx - 1, top - 1, tz, Block.Coconut, false);
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

    // Una antorcha nueva (o quitada) cambia la luz de los chunks de alrededor.
    if (b === Block.Torch || before === Block.Torch) {
      const k = `${x},${y},${z}`;
      if (b === Block.Torch) this.torches.set(k, [x, y, z]);
      else this.torches.delete(k);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.markDirty(cx + dx, cz + dz);
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

  /** Columnas de playa al aire libre, elegidas con `random`, para dejar conchas. */
  beachSpots(count: number, random: () => number): [number, number, number][] {
    const spots: [number, number, number][] = [];
    for (let tries = 0; tries < count * 200 && spots.length < count; tries++) {
      const a = random() * Math.PI * 2;
      const d = ISLAND_RADIUS * (0.5 + random() * 0.6);
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
  private skyHeight(x: number, z: number): number {
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
   * Luz de una casilla de aire, de 0 a 1. Solo oscurece lo que está hondo bajo tierra (las cuevas),
   * para que el interior de las casas no quede negro. Las antorchas iluminan alrededor.
   */
  private lightAt(x: number, y: number, z: number, torches: [number, number, number][]): number {
    let light = 1;
    const top = this.skyHeight(x, z);
    if (y < top && y <= SEA_LEVEL + 1) {
      light = Math.max(0, Math.min(1, 1 - (top - y - 1) / 5));
    }
    if (light < 1) {
      for (const [tx, ty, tz] of torches) {
        const r = LIGHT_RADIUS[Block.Torch]!;
        const dist = Math.hypot(tx + 0.5 - (x + 0.5), ty + 0.5 - (y + 0.5), tz + 0.5 - (z + 0.5));
        light = Math.max(light, 1 - dist / r);
      }
    }
    return Math.max(0.05, light);
  }

  // --- Malla ---

  private buildMesh(c: Chunk) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const ox = c.cx * CHUNK;
    const oz = c.cz * CHUNK;
    const torchRange = LIGHT_RADIUS[Block.Torch]!;
    const torches = [...this.torches.values()].filter(
      ([tx, , tz]) => tx >= ox - torchRange && tx < ox + CHUNK + torchRange && tz >= oz - torchRange && tz < oz + CHUNK + torchRange,
    );
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
            const light = b === Block.Torch ? 1 : this.lightAt(wx, y, wz, torches);
            for (const quad of CROSS_QUADS) {
              const start = positions.length / 3;
              for (const [cx, cy, cz, cu, cv] of quad) {
                positions.push(x + cx, y + cy, z + cz);
                normals.push(0, 1, 0);
                uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
                const shade = (cy === 0 ? 0.8 : 1) * light;
                colors.push(shade, shade, shade);
              }
              indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
            }
            continue;
          }

          if (def.shape === 'fence') {
            const [u0, v0] = tileUV(def.tiles[0]);
            const light = this.lightAt(wx, y, wz, torches);
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
                  const shade = FACE_SHADE[f] * light;
                  colors.push(shade, shade, shade);
                }
                indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
              }
            };
            box(0.375, 0, 0.375, 0.625, 1, 0.625);
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const n = this.getBlock(wx + dx, y, wz + dz);
              if (!isFence(n) && !isFullBlock(n)) continue;
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
            const light = this.lightAt(wx + nx, y + ny, wz + nz, torches);
            const start = positions.length / 3;
            const ao: number[] = [];
            for (const [cx, cy, cz, cu, cv] of face.corners) {
              positions.push(x + cx, y + cy, z + cz);
              normals.push(nx, ny, nz);
              uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
              const a = this.vertexAO(wx, y, wz, face.dir, cx, cy, cz);
              ao.push(a);
              const shade = FACE_SHADE[f] * AO_CURVE[a] * light;
              colors.push(shade, shade, shade);
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
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(ox, 0, oz);

    // Agua: un cuadrado por columna inundada, solo donde de verdad hay mar o río.
    const water: number[] = [];
    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        if (!this.waterKind(ox + x, oz + z)) continue;
        const y = WATER_SURFACE;
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
