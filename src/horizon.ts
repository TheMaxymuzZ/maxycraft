// Siluetas lejanas (v4.7): más allá de los chunks cargados la isla se ve con menos detalle y el mar llega hasta el
// horizonte. Así, al alejarte en barco o mirar desde una montaña, la isla no se corta de golpe en la niebla. Se calcula
// sin generar chunks (World.mapColumn) y se rehace al moverse.
//
// v5.10: el detalle baja poco a poco en vez de pasar de golpe a bloques de 4×4. Justo detrás de lo cargado, una
// columna por bloque (casi igual que el terreno de verdad); un poco más allá, de 2×2; luego de 4×4 y, muy lejos,
// de 8×8. Cada celda solo pone las paredes que se ven (donde la vecina es más baja), así que aun con más detalle cerca
// hay bastantes menos triángulos que antes.

import * as THREE from 'three';
import { CHUNK, SEA_LEVEL, WATER_SURFACE, type World } from './world';
import { isWater } from './blocks';

/** Hasta dónde llega el mar de lejos. */
const SEA_RADIUS = 900;
/** Tamaños de celda, de más fino a más grueso. */
export const HORIZON_CELLS = [1, 2, 4, 8] as const;
/**
 * Hasta cuántos bloques más allá del borde de lo cargado se usa cada tamaño (el último, hasta el final).
 * Las distancias van creciendo: cada anillo es más ancho que el anterior, como el detalle que se pierde a lo lejos.
 */
export const HORIZON_RINGS = [24, 72, 200] as const;
/**
 * La tierra lejana va en trozos de este lado (v5.10): así no se dibuja lo que queda detrás o a los lados de la cámara,
 * que antes era una sola malla enorme que se dibujaba entera siempre.
 */
const TILE = 96;
/** Más bajo que esto, una celda es mar (y no se dibuja). */
const NONE = -1;
/** Aún no se ha mirado esa columna (solo el nivel de 1×1 se mira a medida que hace falta). */
const UNSEEN = -2;
/** Las paredes que dan al mar (o a otro tamaño de celda) bajan hasta aquí. */
const BASE = SEA_LEVEL - 3;

type ColorOf = (block: number) => [number, number, number];

/** Una zona con tierra (tu isla o una del archipiélago), con sus alturas a cada tamaño de celda. */
interface Area {
  /** Esquina (múltiplo de 8) y lado, en bloques. */
  x0: number;
  z0: number;
  size: number;
  /** Por nivel (1, 2, 4, 8): altura de la cara de arriba (o NONE) y bloque de arriba. El de 1×1 se llena poco a poco. */
  h: Int16Array[];
  b: Uint16Array[];
}

/** Para ir guardando vértices sin crear arrays de JavaScript enormes. */
class Buf {
  pos = new Float32Array(1 << 12);
  col = new Float32Array(1 << 12);
  nor = new Float32Array(1 << 12);
  n = 0;

  reset() {
    this.n = 0;
  }

  private grow() {
    const more = (a: Float32Array) => {
      const b = new Float32Array(a.length * 2);
      b.set(a);
      return b;
    };
    this.pos = more(this.pos);
    this.col = more(this.col);
    this.nor = more(this.nor);
  }

  /** Un rectángulo (dos triángulos) con los cuatro vértices en orden y una normal. */
  quad(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, dx: number, dy: number, dz: number,
    nx: number, ny: number, nz: number, r: number, g: number, bl: number) {
    if (this.n + 18 > this.pos.length) this.grow();
    const p = this.pos;
    let i = this.n;
    p[i] = ax; p[i + 1] = ay; p[i + 2] = az;
    p[i + 3] = bx; p[i + 4] = by; p[i + 5] = bz;
    p[i + 6] = cx; p[i + 7] = cy; p[i + 8] = cz;
    p[i + 9] = ax; p[i + 10] = ay; p[i + 11] = az;
    p[i + 12] = cx; p[i + 13] = cy; p[i + 14] = cz;
    p[i + 15] = dx; p[i + 16] = dy; p[i + 17] = dz;
    for (let k = 0; k < 18; k += 3) {
      this.col[i + k] = r; this.col[i + k + 1] = g; this.col[i + k + 2] = bl;
      this.nor[i + k] = nx; this.nor[i + k + 1] = ny; this.nor[i + k + 2] = nz;
    }
    i += 18;
    this.n = i;
  }
}

export class Horizon {
  readonly group = new THREE.Group();
  /** Los trozos de tierra lejana. */
  private readonly land = new THREE.Group();
  private readonly sea: THREE.Mesh;
  private readonly landMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  /** Chunk y radio con los que se hizo la silueta: se rehace al cambiar. */
  private builtAt = '';
  /** Las zonas con tierra, con sus alturas (no cambian mientras no cambie la isla). */
  private areas: Area[] | null = null;
  /** Los vértices de cada trozo, que se reutilizan de una vez a otra. */
  private readonly bufs = new Map<number, Buf>();
  /**
   * La silueta se rehace poco a poco (v5.10): unos milisegundos en cada fotograma, para que cruzar de un chunk a otro
   * no dé un tirón. Mientras tanto se sigue viendo la de antes.
   */
  private job: Generator<void, void> | null = null;
  /** Milisegundos por fotograma para rehacer la silueta. */
  budgetMs = 3;
  /** Color de cada bloque, para no pedirlo miles de veces. */
  private readonly colors = new Map<number, [number, number, number]>();
  /** Cuántas celdas de cada tamaño tiene la silueta de ahora (para las pruebas y el panel de rendimiento). */
  readonly cellCount = [0, 0, 0, 0];

  constructor(private world: World, private colorOf: ColorOf, seaMaterial: THREE.Material) {
    this.sea = new THREE.Mesh(new THREE.BufferGeometry(), seaMaterial);
    this.sea.renderOrder = 0;
    // Ni el mar ni la tierra lejana dan sombra (v5.10): antes entraban en el mapa de sombras de cada fotograma
    // (decenas de miles de triángulos) aunque estuvieran a cientos de bloques.
    this.sea.userData.noShadow = true;
    this.group.add(this.sea);
    // Un poco más baja que el terreno de verdad, para que en el borde gane siempre el detallado.
    this.land.position.y = -0.15;
    this.group.add(this.land);
  }

  /** Cuando cambia la estación (o el dibujo de los bloques) los colores son otros. */
  recolor() {
    this.areas = null;
    this.job = null;
    this.colors.clear();
    this.builtAt = '';
  }

  /** Triángulos de la tierra lejana (para las pruebas y el panel de rendimiento). */
  get triangles(): number {
    let n = 0;
    for (const m of this.land.children) n += (m as THREE.Mesh).geometry.getAttribute('position').count / 3;
    return n;
  }

  /** Dónde van los vértices de una celda con esquina en (x, z). */
  private bufAt(x: number, z: number): Buf {
    const k = (Math.floor(x / TILE) + 4096) * 8192 + Math.floor(z / TILE) + 4096;
    let b = this.bufs.get(k);
    if (!b) this.bufs.set(k, (b = new Buf()));
    return b;
  }

  private color(block: number): [number, number, number] {
    let c = this.colors.get(block);
    if (!c) {
      const [r, g, b] = this.colorOf(block);
      this.colors.set(block, (c = [r / 255, g / 255, b / 255]));
    }
    return c;
  }

  /** Altura de la cara de arriba (o NONE si es mar) y bloque de una columna. */
  private column(x: number, z: number): [number, number] {
    const col = this.world.mapColumn(x, z);
    if (isWater(col.block) || col.y <= SEA_LEVEL - 1) return [NONE, 0];
    return [col.y + 1, col.block];
  }

  private *sample(): Generator<void, void> {
    // Tu isla y, desde la v5.1, las islas del archipiélago, que están en el mismo mar y se ven venir de lejos.
    const list: [number, number, number][] = [[0, 0, this.world.outerRadius + 24]];
    for (const { spot, radius } of this.world.seaSpots) list.push([spot.x, spot.z, radius * 1.4]);
    const areas: Area[] = [];
    for (const [cx, cz, R] of list) areas.push(yield* this.sampleArea(cx, cz, R));
    this.areas = areas;
  }

  private *sampleArea(cx: number, cz: number, R: number): Generator<void, Area> {
    const x0 = Math.floor((cx - R) / 8) * 8;
    const z0 = Math.floor((cz - R) / 8) * 8;
    const size = Math.ceil(Math.max(cx + R - x0, cz + R - z0) / 8) * 8;
    const area: Area = { x0, z0, size, h: [], b: [] };
    // 1×1: se mira cuando hace falta (solo el anillo de justo detrás de lo cargado).
    area.h.push(new Int16Array(size * size).fill(UNSEEN));
    area.b.push(new Uint16Array(size * size));
    // 2×2: una columna de cada cuatro, como antes.
    const n2 = size / 2;
    const h2 = new Int16Array(n2 * n2);
    const b2 = new Uint16Array(n2 * n2);
    for (let j = 0; j < n2; j++) {
      for (let i = 0; i < n2; i++) {
        const [h, b] = this.column(x0 + i * 2 + 1, z0 + j * 2 + 1);
        h2[j * n2 + i] = h;
        b2[j * n2 + i] = b;
      }
      yield;
    }
    area.h.push(h2);
    area.b.push(b2);
    // 4×4 y 8×8: el punto más alto de las cuatro celdas de dentro, para que las montañas y los árboles se vean.
    for (let level = 2; level < HORIZON_CELLS.length; level++) {
      const fine = size / HORIZON_CELLS[level - 1];
      const n = fine / 2;
      const hf = area.h[level - 1];
      const bf = area.b[level - 1];
      const h = new Int16Array(n * n);
      const b = new Uint16Array(n * n);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          let best = NONE;
          let block = 0;
          for (let k = 0; k < 4; k++) {
            const f = (j * 2 + (k >> 1)) * fine + i * 2 + (k & 1);
            if (hf[f] > best) {
              best = hf[f];
              block = bf[f];
            }
          }
          h[j * n + i] = best;
          b[j * n + i] = block;
        }
      }
      area.h.push(h);
      area.b.push(b);
    }
    return area;
  }

  /** Altura y bloque de la celda (i, j) del nivel `level` de una zona (fuera de la zona, mar). */
  private cell(a: Area, level: number, i: number, j: number): number {
    const n = a.size / HORIZON_CELLS[level];
    if (i < 0 || j < 0 || i >= n || j >= n) return NONE;
    const k = j * n + i;
    if (level === 0 && a.h[0][k] === UNSEEN) {
      const [h, b] = this.column(a.x0 + i, a.z0 + j);
      a.h[0][k] = h;
      a.b[0][k] = b;
    }
    return a.h[level][k];
  }

  /** Rehace la silueta fuera de los `radius` chunks alrededor del jugador (poco a poco: ver `budgetMs`). */
  update(px: number, pz: number, radius: number, visible: boolean) {
    this.group.visible = visible;
    if (!visible) return;
    const pcx = Math.floor(px / CHUNK);
    const pcz = Math.floor(pz / CHUNK);
    const at = `${pcx},${pcz},${radius}`;
    if (at !== this.builtAt) {
      this.builtAt = at;
      this.buildSea(pcx, pcz, radius);
      this.job = this.buildLand(pcx, pcz, radius);
    }
    if (!this.job) return;
    const until = performance.now() + this.budgetMs;
    while (performance.now() < until) {
      if (this.job.next().done) {
        this.job = null;
        break;
      }
    }
  }

  /** Termina ya lo que quede por rehacer (para las pruebas). */
  finish() {
    while (this.job && !this.job.next().done);
    this.job = null;
  }

  private *buildLand(pcx: number, pcz: number, radius: number): Generator<void, void> {
    if (!this.areas) yield* this.sample();
    for (const b of this.bufs.values()) b.reset();
    const counts = [0, 0, 0, 0];
    // Desde el centro del chunk del jugador: lo cargado llega a `radius` chunks.
    const ox = (pcx + 0.5) * CHUNK;
    const oz = (pcz + 0.5) * CHUNK;
    const edge = radius * CHUNK;
    // Solo las celdas fuera de lo que ya se dibuja con todo detalle (con un chunk de solape para no ver huecos).
    const inner = (radius - 1) * (radius - 1);
    const covered = (x: number, z: number) => {
      const dcx = Math.floor(x / CHUNK) - pcx;
      const dcz = Math.floor(z / CHUNK) - pcz;
      return dcx * dcx + dcz * dcz <= inner;
    };
    /** El tamaño de celda que toca a un punto: más fino cerca del borde de lo cargado (sin raíces cuadradas). */
    const limits = HORIZON_RINGS.map((r) => (edge + r) * (edge + r));
    const levelAt = (x: number, z: number) => {
      const d = (x - ox) * (x - ox) + (z - oz) * (z - oz);
      let level = 0;
      while (level < limits.length && d > limits[level]) level++;
      return level;
    };

    for (const a of this.areas!) {
      // La zona de 8 en 8; cada celda se parte en cuatro donde haga falta más detalle.
      const n8 = a.size / 8;
      for (let j = 0; j < n8; j++) {
        for (let i = 0; i < n8; i++) {
          this.emit(a, 3, i, j, levelAt, covered, counts);
          yield;
        }
      }
    }
    for (let k = 0; k < counts.length; k++) this.cellCount[k] = counts[k];

    for (const m of [...this.land.children] as THREE.Mesh[]) {
      this.land.remove(m);
      m.geometry.dispose();
    }
    for (const buf of this.bufs.values()) {
      if (!buf.n) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(buf.pos.slice(0, buf.n), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(buf.nor.slice(0, buf.n), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(buf.col.slice(0, buf.n), 3));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this.landMaterial);
      mesh.userData.noShadow = true;
      this.land.add(mesh);
    }
  }

  /** Dibuja la celda (i, j) del nivel `level`, o sus cuatro de dentro si cerca hace falta más detalle. */
  private emit(a: Area, level: number, i: number, j: number, levelAt: (x: number, z: number) => number, covered: (x: number, z: number) => boolean, counts: number[]) {
    const s = HORIZON_CELLS[level];
    const x = a.x0 + i * s;
    const z = a.z0 + j * s;
    const h = this.cell(a, Math.max(level, 1), Math.floor(i * s / HORIZON_CELLS[Math.max(level, 1)]), Math.floor(j * s / HORIZON_CELLS[Math.max(level, 1)]));
    // Mar en todo el trozo (ni una columna de tierra en los 2×2 de dentro): nada que dibujar, ni de cerca.
    if (h === NONE && level >= 1) return;
    if (level > 0 && levelAt(x + s / 2, z + s / 2) < level) {
      for (let k = 0; k < 4; k++) this.emit(a, level - 1, i * 2 + (k & 1), j * 2 + (k >> 1), levelAt, covered, counts);
      return;
    }
    const top = level === 0 ? this.cell(a, 0, i, j) : h;
    if (top === NONE || covered(x + s / 2, z + s / 2)) return;
    counts[level]++;
    const n = a.size / s;
    const k = j * n + i;
    const [r, g, b] = this.color(a.b[level][k]);
    const X = x + s;
    const Z = z + s;
    const buf = this.bufAt(x, z);
    buf.quad(x, top, z, x, top, Z, X, top, Z, X, top, z, 0, 1, 0, r, g, b);
    // Paredes: solo hasta donde empieza la vecina si es del mismo tamaño y más baja; si no (mar, otro tamaño o lo
    // cargado), hasta abajo del todo para que no se vean huecos.
    const side = (di: number, dj: number) => {
      const cx = x + s / 2 + di * s;
      const cz = z + s / 2 + dj * s;
      let bottom = BASE;
      if (!covered(cx, cz) && levelAt(cx, cz) === level) {
        const hn = this.cell(a, level, i + di, j + dj);
        if (hn !== NONE) bottom = hn;
      }
      return bottom < top ? bottom : null;
    };
    let y0 = side(0, -1);
    if (y0 !== null) buf.quad(x, y0, z, x, top, z, X, top, z, X, y0, z, 0, 0, -1, r * 0.8, g * 0.8, b * 0.8);
    y0 = side(0, 1);
    if (y0 !== null) buf.quad(X, y0, Z, X, top, Z, x, top, Z, x, y0, Z, 0, 0, 1, r * 0.8, g * 0.8, b * 0.8);
    y0 = side(-1, 0);
    if (y0 !== null) buf.quad(x, y0, Z, x, top, Z, x, top, z, x, y0, z, -1, 0, 0, r * 0.65, g * 0.65, b * 0.65);
    y0 = side(1, 0);
    if (y0 !== null) buf.quad(X, y0, z, X, top, z, X, top, Z, X, y0, Z, 1, 0, 0, r * 0.65, g * 0.65, b * 0.65);
  }

  /** Un anillo de mar desde el borde de lo cargado hasta el horizonte. */
  private buildSea(pcx: number, pcz: number, radius: number) {
    this.sea.geometry.dispose();
    const ring = new THREE.RingGeometry(Math.max(8, (radius - 0.5) * CHUNK), SEA_RADIUS, 64, 1);
    ring.rotateX(-Math.PI / 2);
    this.sea.geometry = ring;
    this.sea.position.set((pcx + 0.5) * CHUNK, WATER_SURFACE - 0.05, (pcz + 0.5) * CHUNK);
  }
}
