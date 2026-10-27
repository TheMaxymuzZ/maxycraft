// Caminos para los vecinos (v4.8). Búsqueda A* sobre los bloques de la isla: rodean árboles, vallas y casas,
// cruzan puertas (las abren al pasar) y suben escaleras y escalones de un bloque. Las búsquedas largas se reparten
// entre varios fotogramas (PathFinder.update con un tope de casillas), así el juego no se para cuando un vecino
// decide cruzar la isla entera.

import { LEAF_BLOCKS, isDoor, isFence, isOpen, isSolid, isWater } from './blocks';
import { SEA_LEVEL } from './world';

/** Lo que el buscador necesita saber de la isla (World lo cumple; las pruebas pueden usar algo más simple). */
export interface PathWorld {
  getBlock(x: number, y: number, z: number): number;
  /** Si en esa columna hay río (se puede vadear) o mar (no). */
  waterKind?(x: number, z: number): 'mar' | 'río' | null;
}

export type Cell = [number, number, number];

/** Casillas que se miran como mucho en una búsqueda: si no hay camino en ese radio, no lo hay. */
export const MAX_NODES = 20000;

const LEAVES: ReadonlySet<number> = LEAF_BLOCKS;

/** Se puede tener el cuerpo en este bloque: aire, plantas, puertas (se abren) y puertas de valla abiertas. */
function passable(b: number, wade = false): boolean {
  if (isWater(b)) return wade;
  return !isSolid(b) || isDoor(b) || isOpen(b);
}

/** Se puede estar de pie en (x, y, z): pies en y, cabeza en y + 1, suelo firme debajo. Los ríos se vadean. */
export function standable(w: PathWorld, x: number, y: number, z: number): boolean {
  if (y < SEA_LEVEL + 2) return false; // no se meten en el mar
  const below = w.getBlock(x, y - 1, z);
  if (!isSolid(below) || isFence(below) || isDoor(below) || LEAVES.has(below)) return false;
  const feet = w.getBlock(x, y, z);
  const wade = isWater(feet) && w.waterKind?.(x, z) === 'río';
  return passable(feet, wade) && passable(w.getBlock(x, y + 1, z), wade);
}

/** Alturas a las que se puede pasar a la casilla de al lado: andando, un escalón, o un saltito de 2 arriba o 3 abajo. */
const STEPS = [0, 1, -1, 2, -2, -3];

/** Hay hueco para subir o bajar `dy` desde la casilla (x, y, z) a la de al lado (nx, nz). */
function clearance(w: PathWorld, x: number, y: number, z: number, nx: number, nz: number, dy: number): boolean {
  // Para subir hace falta hueco encima de la cabeza; para bajar, que no haya nada encima de la casilla de destino.
  if (dy > 0) for (let k = 2; k <= dy + 1; k++) if (!passable(w.getBlock(x, y + k, z), true)) return false;
  if (dy < 0) for (let k = y + dy + 2; k <= y + 1; k++) if (!passable(w.getBlock(nx, k, nz), true)) return false;
  return true;
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

interface Node {
  x: number;
  y: number;
  z: number;
  g: number;
  f: number;
  parent: Node | null;
}

/** Montón de nodos ordenado por f (el más prometedor arriba). */
class Heap {
  private items: Node[] = [];
  get size() {
    return this.items.length;
  }
  push(n: Node) {
    const a = this.items;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Una búsqueda que se puede hacer a trozos. */
export class PathSearch {
  private open = new Heap();
  private best = new Map<string, number>();
  private closed = new Set<string>();
  private visited = 0;
  /** El camino cuando ha terminado (null si no lo hay). */
  result: Cell[] | null = null;
  done = false;

  constructor(private w: PathWorld, from: Cell, private to: Cell, private maxNodes = MAX_NODES) {
    const start = this.ground(from[0], from[1], from[2]);
    if (start === null) {
      this.done = true;
      return;
    }
    this.open.push({ x: from[0], y: start, z: from[2], g: 0, f: this.h(from[0], start, from[2]), parent: null });
  }

  /** La casilla de pie más cercana en esa columna (por si el punto de salida está un poco hundido o en el aire). */
  private ground(x: number, y: number, z: number): number | null {
    for (const dy of [0, 1, -1, 2, -2]) if (standable(this.w, x, y + dy, z)) return y + dy;
    return null;
  }

  private h(x: number, y: number, z: number) {
    return Math.abs(x - this.to[0]) + Math.abs(z - this.to[2]) + Math.abs(y - this.to[1]);
  }

  /** Mira hasta `budget` casillas. Devuelve true cuando la búsqueda ha terminado. */
  step(budget: number): boolean {
    if (this.done) return true;
    const [tx, ty, tz] = this.to;
    while (budget-- > 0) {
      if (!this.open.size || this.visited >= this.maxNodes) return this.finish(null);
      const n = this.open.pop();
      const k = key(n.x, n.y, n.z);
      if (this.closed.has(k)) continue;
      this.closed.add(k);
      this.visited++;
      if (n.x === tx && n.z === tz && Math.abs(n.y - ty) <= 1) return this.finish(n);
      for (const [dx, dz] of DIRS) {
        const x = n.x + dx;
        const z = n.z + dz;
        // En cada dirección solo hay una altura a la que se puede pisar.
        const dy = STEPS.find((d) => standable(this.w, x, n.y + d, z));
        if (dy === undefined || !clearance(this.w, n.x, n.y, n.z, x, z, dy)) continue;
        const y = n.y + dy;
        const here = this.w.getBlock(x, y, z);
        // Prefieren el camino llano: las puertas, los saltos y el agua cuestan un poco más.
        const g = n.g + 1 + (dy ? (Math.abs(dy) > 1 ? 1.5 : 0.4) : 0) + (isDoor(here) ? 0.5 : 0) + (isWater(here) ? 3 : 0);
        const nk = key(x, y, z);
        if (this.closed.has(nk) || (this.best.get(nk) ?? Infinity) <= g) continue;
        this.best.set(nk, g);
        this.open.push({ x, y, z, g, f: g + this.h(x, y, z), parent: n });
      }
    }
    return false;
  }

  private finish(end: Node | null): boolean {
    this.done = true;
    if (!end) return true;
    const out: Cell[] = [];
    for (let n: Node | null = end; n; n = n.parent) out.push([n.x, n.y, n.z]);
    this.result = out.reverse();
    return true;
  }
}

/** Busca un camino de una vez (para pruebas y caminos cortos). */
export function findPath(w: PathWorld, from: Cell, to: Cell, maxNodes = MAX_NODES): Cell[] | null {
  const s = new PathSearch(w, from, to, maxNodes);
  while (!s.step(1000));
  return s.result;
}

interface Job {
  search: PathSearch;
  done: (path: Cell[] | null) => void;
}

/** Cola de búsquedas de todos los vecinos de una isla, repartida entre fotogramas. */
export class PathFinder {
  private jobs: Job[] = [];

  constructor(private w: PathWorld) {}

  /** Pide un camino; `done` llega en algún fotograma siguiente. Devuelve cómo cancelarlo. */
  request(from: Cell, to: Cell, done: (path: Cell[] | null) => void): () => void {
    const job: Job = { search: new PathSearch(this.w, from, to), done };
    this.jobs.push(job);
    return () => {
      const i = this.jobs.indexOf(job);
      if (i >= 0) this.jobs.splice(i, 1);
    };
  }

  get pending() {
    return this.jobs.length;
  }

  /** Avanza las búsquedas pendientes mirando como mucho `budget` casillas en total. */
  update(budget = 1500) {
    while (budget > 0 && this.jobs.length) {
      const job = this.jobs[0];
      const slice = Math.min(budget, 500);
      budget -= slice;
      if (job.search.step(slice)) {
        this.jobs.shift();
        job.done(job.search.result);
      } else {
        // Que una búsqueda larga no deje sin turno a las demás.
        this.jobs.push(this.jobs.shift()!);
      }
    }
  }
}

const finders = new WeakMap<PathWorld, PathFinder>();

/** El buscador de caminos de una isla (uno por mundo, compartido por todos sus vecinos). */
export function pathsFor(w: PathWorld): PathFinder {
  let f = finders.get(w);
  if (!f) finders.set(w, (f = new PathFinder(w)));
  return f;
}
